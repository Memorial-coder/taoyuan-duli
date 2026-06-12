const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const db = require('./db');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const { getActiveSaveContext, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const DEFAULT_REALTIME_PATH = '/api/taoyuan/online/realtime';
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_CLIENT_FRAME_BYTES = 128 * 1024;
const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const REALTIME_NOTIFICATION_FILE = path.join(DATA_DIR, 'taoyuan_realtime_notifications.json');
const REALTIME_PRESENCE_FILE = path.join(DATA_DIR, 'taoyuan_realtime_presence.json');
const REALTIME_ROOM_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'taoyuan_realtime_room_subscriptions.json');
const MAX_QUEUED_EVENTS_PER_USER = 100;
const MAX_QUEUED_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PRESENCE_RECORDS = 500;
const MAX_ROOM_SUBSCRIPTION_RECORDS = 500;
const OFFLINE_NOTIFICATION_EVENT_TYPES = new Set([
  'friend.request.created',
  'friend.request.accepted',
  'friend.request.rejected',
  'friend.removed',
  'activity.room.invited',
  'activity.room.updated',
  'notification.created',
]);
const activeConnections = new Map();
let heartbeatTimer = null;

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createStoreCorruptionError(filePath) {
  const error = new Error(`${path.basename(filePath)} 已损坏，拒绝继续写入实时状态`);
  error.status = 500;
  error.code = 'STORE_CORRUPTED';
  return error;
}

function readNotificationStore() {
  ensureDataDir();
  if (!fs.existsSync(REALTIME_NOTIFICATION_FILE)) return { notifications: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(REALTIME_NOTIFICATION_FILE, 'utf8'));
    if (!Array.isArray(raw?.notifications)) throw createStoreCorruptionError(REALTIME_NOTIFICATION_FILE);
    return { notifications: raw.notifications };
  } catch (error) {
    if (error?.code === 'STORE_CORRUPTED') throw error;
    throw createStoreCorruptionError(REALTIME_NOTIFICATION_FILE);
  }
}

function clonePayload(payload = {}) {
  try {
    return JSON.parse(JSON.stringify(payload && typeof payload === 'object' ? payload : {}));
  } catch {
    return {};
  }
}

function normalizeQueuedNotification(entry = {}) {
  const username = normalizeUsername(entry.username);
  const type = String(entry.type || '').trim();
  if (!username || !type) return null;
  const createdAt = Number(entry.created_at) || Date.now();
  return {
    id: String(entry.id || `rtq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    username,
    type,
    payload: clonePayload(entry.payload),
    created_at: createdAt,
    last_delivered_at: Number(entry.last_delivered_at) || 0,
    delivery_attempts: Math.max(0, Number(entry.delivery_attempts) || 0),
  };
}

function pruneNotificationStore(store = {}) {
  const cutoff = Date.now() - MAX_QUEUED_EVENT_AGE_MS;
  const normalized = (Array.isArray(store.notifications) ? store.notifications : [])
    .map(normalizeQueuedNotification)
    .filter(entry => entry && entry.created_at >= cutoff)
    .sort((a, b) => b.created_at - a.created_at);
  const perUserCounts = new Map();
  const limited = [];
  for (const entry of normalized) {
    const count = perUserCounts.get(entry.username) || 0;
    if (count >= MAX_QUEUED_EVENTS_PER_USER) continue;
    perUserCounts.set(entry.username, count + 1);
    limited.push(entry);
  }
  return { notifications: limited.sort((a, b) => a.created_at - b.created_at) };
}

function saveNotificationStore(store) {
  writeJsonFileAtomic(REALTIME_NOTIFICATION_FILE, pruneNotificationStore(store));
}

function presenceRecordKey(username, saveId) {
  return `${normalizeUsername(username)}:${saveId || 'account'}`;
}

function normalizePresenceRecord(entry = {}) {
  const username = normalizeUsername(entry.username);
  if (!username) return null;
  const saveId = entry.save_id === null || entry.save_id === undefined || entry.save_id === ''
    ? null
    : String(entry.save_id);
  const status = entry.status === 'online' ? 'online' : 'offline';
  return {
    key: String(entry.key || presenceRecordKey(username, saveId)),
    username,
    display_name: String(entry.display_name || entry.displayName || username).slice(0, 80),
    save_id: saveId,
    save_slot: Number.isInteger(Number(entry.save_slot)) ? Number(entry.save_slot) : null,
    status,
    connection_id: String(entry.connection_id || ''),
    connected_at: Number(entry.connected_at) || 0,
    last_seen_at: Number(entry.last_seen_at) || Number(entry.connected_at) || 0,
    last_offline_at: Number(entry.last_offline_at) || 0,
  };
}

function readPresenceStore() {
  ensureDataDir();
  if (!fs.existsSync(REALTIME_PRESENCE_FILE)) return { records: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(REALTIME_PRESENCE_FILE, 'utf8'));
    if (!Array.isArray(raw?.records)) throw createStoreCorruptionError(REALTIME_PRESENCE_FILE);
    return { records: raw.records };
  } catch (error) {
    if (error?.code === 'STORE_CORRUPTED') throw error;
    throw createStoreCorruptionError(REALTIME_PRESENCE_FILE);
  }
}

function prunePresenceStore(store = {}) {
  const byKey = new Map();
  for (const entry of Array.isArray(store.records) ? store.records : []) {
    const record = normalizePresenceRecord(entry);
    if (!record) continue;
    const previous = byKey.get(record.key);
    if (!previous || record.last_seen_at >= previous.last_seen_at) byKey.set(record.key, record);
  }
  const records = [...byKey.values()]
    .sort((left, right) => right.last_seen_at - left.last_seen_at)
    .slice(0, MAX_PRESENCE_RECORDS);
  return { records };
}

function savePresenceStore(store) {
  writeJsonFileAtomic(REALTIME_PRESENCE_FILE, prunePresenceStore(store));
}

function updatePresenceRecord(connection, status) {
  if (!connection?.username) return;
  try {
    const now = Date.now();
    const store = prunePresenceStore(readPresenceStore());
    const key = presenceRecordKey(connection.username, connection.saveId);
    const records = store.records.filter(entry => entry.key !== key);
    const previous = store.records.find(entry => entry.key === key) || {};
    records.push(normalizePresenceRecord({
      ...previous,
      key,
      username: connection.username,
      display_name: connection.displayName,
      save_id: connection.saveId,
      save_slot: connection.saveSlot,
      status,
      connection_id: connection.id,
      connected_at: Number(connection.connectedAt) || now,
      last_seen_at: Number(connection.lastSeenAt) || now,
      last_offline_at: status === 'offline' ? now : Number(previous.last_offline_at) || 0,
    }));
    savePresenceStore({ records });
  } catch {}
}

function normalizeRoomSubscriptionRecord(entry = {}) {
  const domain = String(entry.domain || '').trim();
  const roomId = String(entry.room_id || '').trim();
  if (!domain || !roomId) return null;
  const subscribers = [...new Set((Array.isArray(entry.subscribers) ? entry.subscribers : [])
    .map(normalizeUsername)
    .filter(Boolean))];
  return {
    key: String(entry.key || `${domain}:${roomId}`),
    domain,
    room_id: roomId,
    room_state: String(entry.room_state || ''),
    host_username: normalizeUsername(entry.host_username),
    subscribers,
    subscriber_count: subscribers.length,
    member_count: Math.max(0, Number(entry.member_count) || 0),
    pending_invitation_count: Math.max(0, Number(entry.pending_invitation_count) || 0),
    last_action: String(entry.last_action || ''),
    updated_at: Number(entry.updated_at) || Date.now(),
  };
}

function readRoomSubscriptionStore() {
  ensureDataDir();
  if (!fs.existsSync(REALTIME_ROOM_SUBSCRIPTIONS_FILE)) return { subscriptions: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(REALTIME_ROOM_SUBSCRIPTIONS_FILE, 'utf8'));
    if (!Array.isArray(raw?.subscriptions)) throw createStoreCorruptionError(REALTIME_ROOM_SUBSCRIPTIONS_FILE);
    return { subscriptions: raw.subscriptions };
  } catch (error) {
    if (error?.code === 'STORE_CORRUPTED') throw error;
    throw createStoreCorruptionError(REALTIME_ROOM_SUBSCRIPTIONS_FILE);
  }
}

function pruneRoomSubscriptionStore(store = {}) {
  const byKey = new Map();
  for (const entry of Array.isArray(store.subscriptions) ? store.subscriptions : []) {
    const record = normalizeRoomSubscriptionRecord(entry);
    if (!record) continue;
    const previous = byKey.get(record.key);
    if (!previous || record.updated_at >= previous.updated_at) byKey.set(record.key, record);
  }
  const subscriptions = [...byKey.values()]
    .sort((left, right) => right.updated_at - left.updated_at)
    .slice(0, MAX_ROOM_SUBSCRIPTION_RECORDS);
  return { subscriptions };
}

function saveRoomSubscriptionStore(store) {
  writeJsonFileAtomic(REALTIME_ROOM_SUBSCRIPTIONS_FILE, pruneRoomSubscriptionStore(store));
}

function recordActivityRoomSubscription(domain, action, room = {}, recipients = []) {
  const normalizedDomain = String(domain || '').trim();
  const roomId = String(room?.id || '').trim();
  if (!normalizedDomain || !roomId) return null;
  try {
    const store = pruneRoomSubscriptionStore(readRoomSubscriptionStore());
    const key = `${normalizedDomain}:${roomId}`;
    const subscriptions = store.subscriptions.filter(entry => entry.key !== key);
    const subscribers = [...new Set((recipients || []).map(normalizeUsername).filter(Boolean))];
    const record = normalizeRoomSubscriptionRecord({
      key,
      domain: normalizedDomain,
      room_id: roomId,
      room_state: room?.state || '',
      host_username: room?.host_username,
      subscribers,
      member_count: Array.isArray(room?.members) ? room.members.length : 0,
      pending_invitation_count: Array.isArray(room?.invitations)
        ? room.invitations.filter(invitation => invitation?.status === 'pending').length
        : 0,
      last_action: action,
      updated_at: Date.now(),
    });
    if (!record) return null;
    subscriptions.push(record);
    saveRoomSubscriptionStore({ subscriptions });
    return record;
  } catch {
    return null;
  }
}

function queueOfflineNotification(username, type, payload = {}) {
  const target = normalizeUsername(username);
  if (!target || !OFFLINE_NOTIFICATION_EVENT_TYPES.has(type)) return null;
  try {
    const store = pruneNotificationStore(readNotificationStore());
    const notification = normalizeQueuedNotification({
      id: `rtq_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      username: target,
      type,
      payload,
      created_at: Date.now(),
    });
    if (!notification) return null;
    store.notifications.push(notification);
    saveNotificationStore(store);
    return notification;
  } catch {
    return null;
  }
}

function listQueuedNotifications(username) {
  const target = normalizeUsername(username);
  if (!target) return [];
  try {
    const store = pruneNotificationStore(readNotificationStore());
    saveNotificationStore(store);
    return store.notifications.filter(entry => entry.username === target);
  } catch {
    return [];
  }
}

function markQueuedNotificationsDelivered(username, ids = []) {
  const target = normalizeUsername(username);
  const idSet = new Set((ids || []).map(id => String(id || '')).filter(Boolean));
  if (!target || idSet.size === 0) return;
  try {
    const store = pruneNotificationStore(readNotificationStore());
    let changed = false;
    for (const entry of store.notifications) {
      if (entry.username !== target || !idSet.has(entry.id)) continue;
      entry.last_delivered_at = Date.now();
      entry.delivery_attempts += 1;
      changed = true;
    }
    if (changed) saveNotificationStore(store);
  } catch {}
}

function ackQueuedNotifications(username, ids = []) {
  const target = normalizeUsername(username);
  const idSet = new Set((ids || []).map(id => String(id || '')).filter(Boolean));
  if (!target || idSet.size === 0) return { acked_ids: [], pending_count: listQueuedNotifications(target).length };
  try {
    const store = pruneNotificationStore(readNotificationStore());
    const ackedIds = [];
    store.notifications = store.notifications.filter(entry => {
      if (entry.username === target && idSet.has(entry.id)) {
        ackedIds.push(entry.id);
        return false;
      }
      return true;
    });
    saveNotificationStore(store);
    const pendingCount = store.notifications.filter(entry => entry.username === target).length;
    return { acked_ids: ackedIds, pending_count: pendingCount };
  } catch {
    return { acked_ids: [], pending_count: 0 };
  }
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

function sendEvent(connection, type, payload = {}, meta = {}) {
  return sendRawFrame(connection, JSON.stringify({
    type,
    payload,
    sent_at: Date.now(),
    ...meta,
  }));
}

function sendQueuedNotification(connection, notification) {
  return sendEvent(connection, notification.type, notification.payload, {
    queued_event_id: notification.id,
    queued_at: notification.created_at,
    replayed: true,
    delivery_attempts: notification.delivery_attempts + 1,
  });
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
  updatePresenceRecord(connection, 'online');
  ensureHeartbeat();
}

function removeConnection(connection) {
  if (!connection || !activeConnections.has(connection.id)) return false;
  activeConnections.delete(connection.id);
  connection.lastSeenAt = Date.now();
  connection.closed = true;
  updatePresenceRecord(connection, 'offline');
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

function buildAdminConnectionPayload(connection, now = Date.now()) {
  const connectedAt = Number(connection.connectedAt) || now;
  const lastSeenAt = Number(connection.lastSeenAt) || connectedAt;
  return {
    ...buildPresencePayload(connection),
    connected_at: connectedAt,
    last_seen_at: lastSeenAt,
    online_for_ms: Math.max(0, now - connectedAt),
  };
}

function incrementRecordCount(record, key) {
  const normalized = String(key || '').trim() || 'unknown';
  record[normalized] = (Number(record[normalized]) || 0) + 1;
}

function buildQueuedNotificationAdminSnapshot() {
  const queueFileExists = fs.existsSync(REALTIME_NOTIFICATION_FILE);
  try {
    const rawStore = readNotificationStore();
    const rawCount = Array.isArray(rawStore.notifications) ? rawStore.notifications.length : 0;
    const store = pruneNotificationStore(rawStore);
    const queuedByUser = new Map();
    const queuedTypeCounts = {};
    for (const notification of store.notifications) {
      incrementRecordCount(queuedTypeCounts, notification.type);
      const current = queuedByUser.get(notification.username) || {
        username: notification.username,
        pending_count: 0,
        latest_created_at: 0,
        latest_type: '',
        type_counts: {},
      };
      current.pending_count += 1;
      incrementRecordCount(current.type_counts, notification.type);
      if (notification.created_at >= current.latest_created_at) {
        current.latest_created_at = notification.created_at;
        current.latest_type = notification.type;
      }
      queuedByUser.set(notification.username, current);
    }
    return {
      queue_status: queueFileExists ? 'ok' : 'missing',
      queue_file_exists: queueFileExists,
      queued_notification_count: store.notifications.length,
      queued_by_user: [...queuedByUser.values()]
        .sort((left, right) => right.pending_count - left.pending_count || right.latest_created_at - left.latest_created_at),
      queued_type_counts: queuedTypeCounts,
      pruned_notification_count: Math.max(0, rawCount - store.notifications.length),
    };
  } catch (error) {
    return {
      queue_status: 'error',
      queue_file_exists: queueFileExists,
      queue_error_code: error?.code || 'UNKNOWN',
      queued_notification_count: 0,
      queued_by_user: [],
      queued_type_counts: {},
      pruned_notification_count: 0,
    };
  }
}

function buildPresenceAdminSnapshot() {
  const presenceFileExists = fs.existsSync(REALTIME_PRESENCE_FILE);
  try {
    const rawStore = readPresenceStore();
    const rawCount = Array.isArray(rawStore.records) ? rawStore.records.length : 0;
    const store = prunePresenceStore(rawStore);
    const statusCounts = {};
    for (const record of store.records) {
      incrementRecordCount(statusCounts, record.status);
    }
    return {
      presence_status: presenceFileExists ? 'ok' : 'missing',
      presence_file_exists: presenceFileExists,
      presence_record_count: store.records.length,
      recent_presence: store.records,
      presence_status_counts: statusCounts,
      pruned_presence_record_count: Math.max(0, rawCount - store.records.length),
      presence_limits: {
        max_presence_records: MAX_PRESENCE_RECORDS,
      },
    };
  } catch (error) {
    return {
      presence_status: 'error',
      presence_file_exists: presenceFileExists,
      presence_error_code: error?.code || 'UNKNOWN',
      presence_record_count: 0,
      recent_presence: [],
      presence_status_counts: {},
      pruned_presence_record_count: 0,
      presence_limits: {
        max_presence_records: MAX_PRESENCE_RECORDS,
      },
    };
  }
}

function buildRoomSubscriptionAdminSnapshot() {
  const subscriptionFileExists = fs.existsSync(REALTIME_ROOM_SUBSCRIPTIONS_FILE);
  try {
    const rawStore = readRoomSubscriptionStore();
    const rawCount = Array.isArray(rawStore.subscriptions) ? rawStore.subscriptions.length : 0;
    const store = pruneRoomSubscriptionStore(rawStore);
    const domainCounts = {};
    const stateCounts = {};
    for (const subscription of store.subscriptions) {
      incrementRecordCount(domainCounts, subscription.domain);
      incrementRecordCount(stateCounts, subscription.room_state || 'unknown');
    }
    return {
      room_subscription_status: subscriptionFileExists ? 'ok' : 'missing',
      room_subscription_file_exists: subscriptionFileExists,
      room_subscription_count: store.subscriptions.length,
      recent_room_subscriptions: store.subscriptions,
      room_subscription_domain_counts: domainCounts,
      room_subscription_state_counts: stateCounts,
      pruned_room_subscription_count: Math.max(0, rawCount - store.subscriptions.length),
      room_subscription_limits: {
        max_room_subscription_records: MAX_ROOM_SUBSCRIPTION_RECORDS,
      },
    };
  } catch (error) {
    return {
      room_subscription_status: 'error',
      room_subscription_file_exists: subscriptionFileExists,
      room_subscription_error_code: error?.code || 'UNKNOWN',
      room_subscription_count: 0,
      recent_room_subscriptions: [],
      room_subscription_domain_counts: {},
      room_subscription_state_counts: {},
      pruned_room_subscription_count: 0,
      room_subscription_limits: {
        max_room_subscription_records: MAX_ROOM_SUBSCRIPTION_RECORDS,
      },
    };
  }
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
  const target = normalizeUsername(username);
  if (!target) return 0;
  let sent = 0;
  for (const connection of listUserConnections(target)) {
    if (sendEvent(connection, type, payload)) sent += 1;
  }
  if (sent === 0) queueOfflineNotification(target, type, payload);
  return sent;
}

function emitUsersEvent(usernames, type, payload = {}) {
  const normalized = [...new Set((usernames || []).map(normalizeUsername).filter(Boolean))];
  return normalized.reduce((sum, username) => sum + emitUserEvent(username, type, payload), 0);
}

function emitOnlineUsersEvent(usernames, type, payload = {}) {
  const normalized = [...new Set((usernames || []).map(normalizeUsername).filter(Boolean))];
  let sent = 0;
  for (const username of normalized) {
    for (const connection of listUserConnections(username)) {
      if (sendEvent(connection, type, payload)) sent += 1;
    }
  }
  return sent;
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
  connection.lastSeenAt = Date.now();
  updatePresenceRecord(connection, 'online');
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
  } else if (message?.type === 'notification.ack') {
    const payload = message.payload && typeof message.payload === 'object' ? message.payload : {};
    const ids = Array.isArray(payload.ids)
      ? payload.ids
      : [payload.id || payload.notification_id || payload.queued_event_id];
    sendEvent(connection, 'notification.ack', ackQueuedNotifications(connection.username, ids));
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
        lastSeenAt: Date.now(),
        frameBuffer: Buffer.alloc(0),
        closed: false,
      };
      const wasOnline = hasActiveConnectionForKey(connectionKey(connection));
      registerConnection(connection);
      const queuedNotifications = listQueuedNotifications(connection.username);
      sendEvent(connection, 'realtime.ready', {
        connection_id: connection.id,
        username: connection.username,
        display_name: connection.displayName,
        save_id: connection.saveId,
        save_slot: connection.saveSlot,
        pending_notification_count: queuedNotifications.length,
      });
      const deliveredQueuedIds = [];
      for (const notification of queuedNotifications) {
        if (sendQueuedNotification(connection, notification)) deliveredQueuedIds.push(notification.id);
      }
      markQueuedNotificationsDelivered(connection.username, deliveredQueuedIds);
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

function getPresenceRecords() {
  try {
    return prunePresenceStore(readPresenceStore()).records;
  } catch {
    return [];
  }
}

function getRealtimeAdminState() {
  const now = Date.now();
  const connections = [...activeConnections.values()]
    .filter(connection => !connection.closed)
    .map(connection => buildAdminConnectionPayload(connection, now))
    .sort((left, right) => right.connected_at - left.connected_at);
  const onlineUsers = new Set(connections.map(connection => connection.username).filter(Boolean));
  const onlineSaves = new Set(connections.map(connection => `${connection.username}:${connection.save_id || 'account'}`));
  const queue = buildQueuedNotificationAdminSnapshot();
  const presence = buildPresenceAdminSnapshot();
  const roomSubscriptions = buildRoomSubscriptionAdminSnapshot();
  return {
    generated_at: now,
    connection_count: connections.length,
    online_user_count: onlineUsers.size,
    online_save_count: onlineSaves.size,
    connections,
    queued_notification_count: queue.queued_notification_count,
    queued_by_user: queue.queued_by_user,
    queued_type_counts: queue.queued_type_counts,
    queue_status: queue.queue_status,
    queue_file_exists: queue.queue_file_exists,
    queue_error_code: queue.queue_error_code,
    pruned_notification_count: queue.pruned_notification_count,
    queue_limits: {
      max_queued_events_per_user: MAX_QUEUED_EVENTS_PER_USER,
      max_queued_event_age_ms: MAX_QUEUED_EVENT_AGE_MS,
    },
    presence_status: presence.presence_status,
    presence_file_exists: presence.presence_file_exists,
    presence_error_code: presence.presence_error_code,
    presence_record_count: presence.presence_record_count,
    recent_presence: presence.recent_presence,
    presence_status_counts: presence.presence_status_counts,
    pruned_presence_record_count: presence.pruned_presence_record_count,
    presence_limits: presence.presence_limits,
    room_subscription_status: roomSubscriptions.room_subscription_status,
    room_subscription_file_exists: roomSubscriptions.room_subscription_file_exists,
    room_subscription_error_code: roomSubscriptions.room_subscription_error_code,
    room_subscription_count: roomSubscriptions.room_subscription_count,
    recent_room_subscriptions: roomSubscriptions.recent_room_subscriptions,
    room_subscription_domain_counts: roomSubscriptions.room_subscription_domain_counts,
    room_subscription_state_counts: roomSubscriptions.room_subscription_state_counts,
    pruned_room_subscription_count: roomSubscriptions.pruned_room_subscription_count,
    room_subscription_limits: roomSubscriptions.room_subscription_limits,
  };
}

module.exports = {
  attachRealtimeServer,
  emitOnlineUsersEvent,
  emitUserEvent,
  emitUsersEvent,
  getPresenceRecords,
  getRealtimeAdminState,
  getRealtimeState,
  recordActivityRoomSubscription,
};
