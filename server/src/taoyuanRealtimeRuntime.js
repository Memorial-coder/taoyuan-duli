const crypto = require('crypto');
const { URL } = require('url');
const db = require('./db');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const { getActiveSaveContext } = require('./taoyuanSaveRuntime');

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const DEFAULT_REALTIME_PATH = '/api/taoyuan/online/realtime';
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_CLIENT_FRAME_BYTES = 128 * 1024;
const activeConnections = new Map();
let heartbeatTimer = null;

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCookieHeader(headerValue = '') {
  const cookies = {};
  for (const part of String(headerValue || '').split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }
  return cookies;
}

function signCookieValue(value, secret) {
  return `${value}.${crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('base64')
    .replace(/=+$/, '')}`;
}

function unsignCookieValue(value, secret) {
  const raw = String(value || '');
  const signed = raw.startsWith('s:') ? raw.slice(2) : raw;
  const separatorIndex = signed.lastIndexOf('.');
  if (separatorIndex <= 0) return null;
  const candidate = signed.slice(0, separatorIndex);
  const expected = signCookieValue(candidate, secret);
  const expectedBuffer = Buffer.from(expected);
  const signedBuffer = Buffer.from(signed);
  if (expectedBuffer.length !== signedBuffer.length) return null;
  return crypto.timingSafeEqual(expectedBuffer, signedBuffer) ? candidate : null;
}

function getSessionFromStore(sessionStore, sid) {
  return new Promise((resolve, reject) => {
    sessionStore.get(sid, (error, sessionData) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(sessionData || null);
    });
  });
}

async function authenticateUpgradeRequest(req, options) {
  const cookieName = options.cookieName || 'taoyuan.sid';
  const cookies = parseCookieHeader(req.headers.cookie || '');
  const rawSid = cookies[cookieName];
  const sid = unsignCookieValue(rawSid, options.sessionSecret || '');
  if (!sid) throw new Error('未登录或会话签名无效');

  const sessionData = await getSessionFromStore(options.sessionStore, sid);
  const username = normalizeUsername(sessionData?.username);
  if (!username) throw new Error('请先登录账号');

  const accessState = await db.getUserAccessState(username);
  if (!accessState || accessState === 'deleted') throw new Error('账号不存在或已删除');
  if (accessState === 'banned') throw new Error('账号已被封禁，无法建立实时连接');

  let saveContext = null;
  try {
    saveContext = getActiveSaveContext(username, null, '当前账号没有可用存档');
  } catch {
    saveContext = null;
  }

  return {
    username,
    displayName: sessionData.display_name || username,
    saveId: saveContext?.identity?.save_id || null,
    saveSlot: Number.isInteger(Number(saveContext?.slot)) ? Number(saveContext.slot) : null,
  };
}

function writeUpgradeError(socket, statusCode, message) {
  socket.write([
    `HTTP/1.1 ${statusCode} ${message}`,
    'Connection: close',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Length: 0',
    '',
    '',
  ].join('\r\n'));
  socket.destroy();
}

function writeHandshake(socket, key) {
  const accept = crypto
    .createHash('sha1')
    .update(`${key}${WEBSOCKET_GUID}`)
    .digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    '',
  ].join('\r\n'));
}

function encodeFrame(payload, opcode = 1) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload || ''), 'utf8');
  const header = [];
  header.push(0x80 | opcode);
  if (body.length < 126) {
    header.push(body.length);
  } else if (body.length <= 0xffff) {
    header.push(126, (body.length >> 8) & 0xff, body.length & 0xff);
  } else {
    header.push(127, 0, 0, 0, 0);
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(body.length);
    header.push(...lengthBuffer);
  }
  return Buffer.concat([Buffer.from(header), body]);
}

function sendRawFrame(connection, payload, opcode = 1) {
  if (!connection || connection.closed || connection.socket.destroyed) return false;
  try {
    connection.socket.write(encodeFrame(payload, opcode));
    return true;
  } catch {
    connection.closed = true;
    return false;
  }
}

function sendEvent(connection, type, payload = {}) {
  return sendRawFrame(connection, JSON.stringify({
    type,
    payload,
    sent_at: Date.now(),
  }));
}

function closeConnection(connection) {
  if (!connection || connection.closed) return;
  connection.closed = true;
  try {
    connection.socket.end(encodeFrame('', 8));
  } catch {
    try {
      connection.socket.destroy();
    } catch {}
  }
}

function connectionKey(connection) {
  return `${connection.username}:${connection.saveId || 'account'}`;
}

function registerConnection(connection) {
  activeConnections.set(connection.id, connection);
  ensureHeartbeat();
}

function removeConnection(connection) {
  if (!connection || !activeConnections.has(connection.id)) return false;
  activeConnections.delete(connection.id);
  connection.closed = true;
  if (activeConnections.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  return true;
}

function hasActiveConnectionForKey(key) {
  for (const connection of activeConnections.values()) {
    if (!connection.closed && connectionKey(connection) === key) return true;
  }
  return false;
}

function buildPresencePayload(connection) {
  return {
    username: connection.username,
    display_name: connection.displayName,
    save_id: connection.saveId,
    save_slot: connection.saveSlot,
    connection_id: connection.id,
  };
}

function listUserConnections(username) {
  const target = normalizeUsername(username);
  return [...activeConnections.values()]
    .filter(connection => !connection.closed && connection.username === target);
}

async function listPresenceRecipients(username) {
  const recipients = new Set([normalizeUsername(username)]);
  try {
    const overview = await taoyuanSocialRuntime.listRelationshipOverview(username);
    for (const entry of overview.friends || []) {
      const friendUsername = normalizeUsername(entry?.profile?.username || entry?.friend_username);
      if (friendUsername) recipients.add(friendUsername);
    }
  } catch {}
  return [...recipients].filter(Boolean);
}

async function broadcastPresence(type, connection) {
  const recipients = await listPresenceRecipients(connection.username);
  const payload = buildPresencePayload(connection);
  for (const username of recipients) {
    emitUserEvent(username, type, payload);
  }
}

function emitUserEvent(username, type, payload = {}) {
  let sent = 0;
  for (const connection of listUserConnections(username)) {
    if (sendEvent(connection, type, payload)) sent += 1;
  }
  return sent;
}

function emitUsersEvent(usernames, type, payload = {}) {
  const normalized = [...new Set((usernames || []).map(normalizeUsername).filter(Boolean))];
  return normalized.reduce((sum, username) => sum + emitUserEvent(username, type, payload), 0);
}

function parseFrame(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2) return null;
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) === 0x80;
  let length = secondByte & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < offset + 2) return null;
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) return null;
    const high = buffer.readUInt32BE(offset);
    const low = buffer.readUInt32BE(offset + 4);
    if (high !== 0) return null;
    length = low;
    offset += 8;
  }
  let mask = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }
  if (buffer.length < offset + length) return null;
  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  if (mask) {
    for (let index = 0; index < payload.length; index += 1) {
      payload[index] ^= mask[index % 4];
    }
  }
  return { opcode, payload, consumed: offset + length };
}

function handleClientFrame(connection, frame) {
  if (frame.opcode === 8) {
    closeConnection(connection);
    return;
  }
  if (frame.opcode === 9) {
    sendRawFrame(connection, frame.payload, 10);
    return;
  }
  if (frame.opcode !== 1) return;
  let message = null;
  try {
    message = JSON.parse(frame.payload.toString('utf8'));
  } catch {
    return;
  }
  if (message?.type === 'ping') {
    sendEvent(connection, 'realtime.pong', { connection_id: connection.id });
  } else if (message?.type === 'presence.snapshot') {
    sendEvent(connection, 'presence.snapshot', {
      online: [...activeConnections.values()]
        .filter(entry => !entry.closed)
        .map(entry => buildPresencePayload(entry)),
    });
  }
}

function handleClientChunk(connection, chunk) {
  if (!connection || connection.closed || !Buffer.isBuffer(chunk)) return;
  connection.frameBuffer = Buffer.concat([connection.frameBuffer || Buffer.alloc(0), chunk]);
  if (connection.frameBuffer.length > MAX_CLIENT_FRAME_BYTES) {
    closeConnection(connection);
    return;
  }

  let frame = parseFrame(connection.frameBuffer);
  while (frame && !connection.closed) {
    connection.frameBuffer = connection.frameBuffer.subarray(frame.consumed);
    handleClientFrame(connection, frame);
    frame = parseFrame(connection.frameBuffer);
  }
}

function ensureHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const connection of activeConnections.values()) {
      sendEvent(connection, 'realtime.heartbeat', { connection_id: connection.id });
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();
}

function isRealtimeUpgrade(req, realtimePath) {
  try {
    const parsed = new URL(req.url || '/', 'http://127.0.0.1');
    return parsed.pathname === realtimePath;
  } catch {
    return false;
  }
}

function attachRealtimeServer(server, options = {}) {
  const realtimePath = options.path || DEFAULT_REALTIME_PATH;
  server.on('upgrade', (req, socket) => {
    void (async () => {
      if (!isRealtimeUpgrade(req, realtimePath)) {
        writeUpgradeError(socket, 404, 'Not Found');
        return;
      }

      if (String(req.headers.upgrade || '').toLowerCase() !== 'websocket') {
        writeUpgradeError(socket, 400, 'Bad Request');
        return;
      }

      const key = String(req.headers['sec-websocket-key'] || '').trim();
      if (!key) {
        writeUpgradeError(socket, 400, 'Bad Request');
        return;
      }

      let auth = null;
      try {
        auth = await authenticateUpgradeRequest(req, options);
      } catch {
        writeUpgradeError(socket, 401, 'Unauthorized');
        return;
      }

      writeHandshake(socket, key);
      const connection = {
        id: crypto.randomUUID(),
        socket,
        username: auth.username,
        displayName: auth.displayName,
        saveId: auth.saveId,
        saveSlot: auth.saveSlot,
        connectedAt: Date.now(),
        frameBuffer: Buffer.alloc(0),
        closed: false,
      };
      const wasOnline = hasActiveConnectionForKey(connectionKey(connection));
      registerConnection(connection);
      sendEvent(connection, 'realtime.ready', {
        connection_id: connection.id,
        username: connection.username,
        display_name: connection.displayName,
        save_id: connection.saveId,
        save_slot: connection.saveSlot,
      });
      if (!wasOnline) {
        await broadcastPresence('presence.online', connection);
      }

      const finalizeDisconnect = () => {
        const keyBeforeClose = connectionKey(connection);
        const removed = removeConnection(connection);
        if (removed && !hasActiveConnectionForKey(keyBeforeClose)) {
          void broadcastPresence('presence.offline', connection);
        }
      };

      socket.on('data', chunk => handleClientChunk(connection, chunk));
      socket.on('error', () => {
        socket.destroy();
      });
      socket.on('end', () => {
        finalizeDisconnect();
        socket.destroy();
      });
      socket.on('close', finalizeDisconnect);
    })().catch(() => {
      try {
        writeUpgradeError(socket, 500, 'Internal Server Error');
      } catch {
        socket.destroy();
      }
    });
  });
}

function getRealtimeState() {
  return {
    connection_count: activeConnections.size,
    connections: [...activeConnections.values()].map(connection => buildPresencePayload(connection)),
  };
}

module.exports = {
  attachRealtimeServer,
  emitUserEvent,
  emitUsersEvent,
  getRealtimeState,
};
