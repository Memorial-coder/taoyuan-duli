import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { rm } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const { decryptTaoyuanRaw, encryptTaoyuanData } = require('../src/taoyuanSaveRuntime')
const dotenv = require('dotenv')

const serverRoot = path.resolve(__dirname, '..')
const smokeTempDir = path.resolve(serverRoot, '.tmp-realtime-smoke-run')
const smokeStorageFile = path.resolve(smokeTempDir, '.storage.json')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_REALTIME_SMOKE_PORT || 4013)

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true })

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const checks = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const canListenOnPort = (targetHost, port) =>
  new Promise(resolve => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ host: targetHost, port }, () => {
      server.close(() => resolve(true))
    })
  })

const findAvailablePort = async (targetHost, startPort, attempts = 20) => {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    if (await canListenOnPort(targetHost, port)) return port
  }
  return startPort
}

const port = await findAvailablePort(host, preferredPort)
const baseURL = `http://${host}:${port}`

const waitForReachable = async (url, timeoutMs = 120_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await wait(1000)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const startServer = () => {
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_STORAGE: smokeStorageFile,
      QA_ONLINE_SMOKE_FORCE_LOCAL: 'true',
      MYSQL_HOST: '',
      MYSQL_USER: '',
      MYSQL_DATABASE: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => process.stdout.write(chunk))
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  return child
}

const stopChild = async child => {
  if (!child || child.killed) return
  await new Promise(resolve => {
    child.once('exit', () => resolve())
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      killer.once('exit', () => resolve())
      killer.once('error', () => {
        try {
          child.kill()
        } catch {}
        resolve()
      })
      return
    }
    try {
      child.kill('SIGTERM')
    } catch {
      resolve()
    }
  })
}

const createSessionState = () => ({
  cookie: '',
  csrfToken: '',
  username: '',
  displayName: '',
  identity: null,
})

const updateCookie = (session, response) => {
  const rawSetCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []
  const cookieParts = rawSetCookie.map(item => String(item).split(';', 1)[0]).filter(Boolean)
  if (cookieParts.length) session.cookie = cookieParts.join('; ')
}

const fetchSessionJson = async (session, pathname, init = {}) => {
  const headers = new Headers(init.headers || {})
  if (session.cookie) headers.set('Cookie', session.cookie)
  if (session.csrfToken) headers.set('X-CSRF-Token', session.csrfToken)
  const response = await fetch(`${baseURL}${pathname}`, { ...init, headers })
  updateCookie(session, response)
  let data = null
  try {
    data = await response.json()
  } catch {}
  return { response, data }
}

const buildSeedSavePayload = username => encryptTaoyuanData({
  player: {
    money: 300,
    name: username,
  },
  inventory: {
    items: [{ itemId: 'wood', quantity: 5, quality: 'normal', locked: false }],
    tempItems: [],
    ownedWeapons: [],
    ownedRings: [],
    ownedHats: [],
    ownedShoes: [],
    capacity: 24,
  },
})

const createSmokeSeed = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 4)

const seedSessionSave = async session => {
  const saveResult = await fetchSessionJson(session, '/api/taoyuan/save/0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw: buildSeedSavePayload(session.username),
      revision: Date.now(),
    }),
  })
  assert(saveResult.response.ok, `save write returned ${saveResult.response.status}: ${saveResult.data?.msg || 'unknown error'}`)

  const activeSlotResult = await fetchSessionJson(session, '/api/taoyuan/save/active-slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: 0 }),
  })
  assert(activeSlotResult.response.ok, `active slot write returned ${activeSlotResult.response.status}: ${activeSlotResult.data?.msg || 'unknown error'}`)

  const readback = await fetchSessionJson(session, '/api/taoyuan/save/0')
  assert(readback.response.ok, `save readback returned ${readback.response.status}: ${readback.data?.msg || 'unknown error'}`)
  const decrypted = decryptTaoyuanRaw(readback.data?.raw || '')
  const identity = decrypted?.meta?.onlineIdentity || decrypted?.onlineIdentity
  assert(identity?.save_id, `save identity missing for ${session.username}`)
  session.identity = identity
}

const bootstrapSession = async label => {
  const session = createSessionState()
  const seed = createSmokeSeed()
  session.username = `${label}_${seed}`.toLowerCase()
  session.displayName = `实时${seed.slice(-4)}`
  const registerResult = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: session.username,
      password: `SmokePass_${seed}`,
      display_name: session.displayName,
    }),
  })
  assert(registerResult.response.ok, `register returned ${registerResult.response.status}: ${registerResult.data?.msg || 'unknown error'}`)
  session.csrfToken = registerResult.data?.csrf_token || ''
  const meResult = await fetchSessionJson(session, '/api/me')
  assert(meResult.response.ok, `/api/me returned ${meResult.response.status}`)
  session.csrfToken = meResult.data?.csrf_token || session.csrfToken
  await seedSessionSave(session)
  return session
}

const encodeClientFrame = payload => {
  const body = Buffer.from(String(payload), 'utf8')
  const mask = crypto.randomBytes(4)
  const header = []
  header.push(0x81)
  if (body.length < 126) {
    header.push(0x80 | body.length)
  } else {
    header.push(0x80 | 126, (body.length >> 8) & 0xff, body.length & 0xff)
  }
  const masked = Buffer.from(body)
  for (let index = 0; index < masked.length; index += 1) {
    masked[index] ^= mask[index % 4]
  }
  return Buffer.concat([Buffer.from(header), mask, masked])
}

const decodeServerFrame = buffer => {
  if (buffer.length < 2) return null
  const opcode = buffer[0] & 0x0f
  let length = buffer[1] & 0x7f
  let offset = 2
  if (length === 126) {
    if (buffer.length < 4) return null
    length = buffer.readUInt16BE(offset)
    offset += 2
  } else if (length === 127) {
    if (buffer.length < 10) return null
    const high = buffer.readUInt32BE(offset)
    const low = buffer.readUInt32BE(offset + 4)
    if (high !== 0) throw new Error('large websocket frames are not expected in this smoke')
    length = low
    offset += 8
  }
  if (buffer.length < offset + length) return null
  const payload = buffer.subarray(offset, offset + length)
  const consumed = offset + length
  if (opcode === 8) return { consumed, message: { type: 'close' } }
  if (opcode !== 1) return { consumed, message: { type: 'non-text', opcode } }
  return { consumed, message: JSON.parse(payload.toString('utf8')) }
}

const openRealtimeSocket = async session => {
  const socket = net.createConnection({ host, port })
  socket.setNoDelay(true)
  const key = crypto.randomBytes(16).toString('base64')
  const messages = []
  let handshakeDone = false
  let pendingBuffer = Buffer.alloc(0)

  const ready = new Promise((resolve, reject) => {
    socket.once('error', reject)
    socket.once('connect', () => {
      socket.write([
        'GET /api/taoyuan/online/realtime HTTP/1.1',
        `Host: ${host}:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        `Cookie: ${session.cookie}`,
        '',
        '',
      ].join('\r\n'))
    })
    socket.on('data', chunk => {
      if (!handshakeDone) {
        const headerEnd = chunk.indexOf('\r\n\r\n')
        if (headerEnd < 0) return
        const headerText = chunk.subarray(0, headerEnd).toString('utf8')
        if (!headerText.includes('101 Switching Protocols')) {
          reject(new Error(`websocket handshake failed: ${headerText.split('\r\n')[0]}`))
          return
        }
        handshakeDone = true
        resolve()
        pendingBuffer = Buffer.concat([pendingBuffer, chunk.subarray(headerEnd + 4)])
      } else {
        pendingBuffer = Buffer.concat([pendingBuffer, chunk])
      }
      let parsed = decodeServerFrame(pendingBuffer)
      while (parsed) {
        messages.push(parsed.message)
        pendingBuffer = pendingBuffer.subarray(parsed.consumed)
        parsed = decodeServerFrame(pendingBuffer)
      }
    })
  })

  await ready
  return {
    socket,
    messages,
    send(type, payload = {}) {
      socket.write(encodeClientFrame(JSON.stringify({ type, payload })))
    },
    sendSplit(type, payload = {}) {
      const frame = encodeClientFrame(JSON.stringify({ type, payload }))
      const splitAt = Math.max(1, Math.min(3, frame.length - 1))
      socket.write(frame.subarray(0, splitAt))
      setTimeout(() => socket.write(frame.subarray(splitAt)), 20)
    },
    sendCoalesced(items = []) {
      socket.write(Buffer.concat(items.map(item => encodeClientFrame(JSON.stringify(item)))))
    },
    close() {
      socket.end()
    },
  }
}

const expectMessage = async (client, type, predicate = () => true, timeoutMs = 10_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const found = client.messages.find(message => message?.type === type && predicate(message.payload || {}))
    if (found) return found
    await wait(100)
  }
  throw new Error(`Timed out waiting for realtime message ${type}`)
}

const expectMessageAfter = async (client, offset, type, predicate = () => true, timeoutMs = 10_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const found = client.messages
      .slice(offset)
      .find(message => message?.type === type && predicate(message.payload || {}))
    if (found) return found
    await wait(100)
  }
  throw new Error(`Timed out waiting for realtime message ${type} after offset ${offset}`)
}

const expectNoMessageAfter = async (client, offset, type, predicate = () => true, timeoutMs = 800) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const found = client.messages
      .slice(offset)
      .find(message => message?.type === type && predicate(message.payload || {}))
    if (found) throw new Error(`Unexpected realtime message ${type} after offset ${offset}`)
    await wait(100)
  }
}

const expectUnauthedRealtimeRejected = async () => {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const key = crypto.randomBytes(16).toString('base64')
    socket.once('error', reject)
    socket.once('connect', () => {
      socket.write([
        'GET /api/taoyuan/online/realtime HTTP/1.1',
        `Host: ${host}:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n'))
    })
    socket.once('data', chunk => {
      const header = chunk.toString('utf8')
      socket.destroy()
      if (header.startsWith('HTTP/1.1 401')) {
        resolve()
      } else {
        reject(new Error(`unauth realtime should return 401, received ${header.split('\r\n')[0]}`))
      }
    })
  })
}

const runCheck = async (label, runner) => {
  await runner()
  checks.push(label)
}

let serverProcess = null
let ownerSocket = null
let friendSocket = null
let offlineReplaySocket = null
let offlineReplayReconnectSocket = null

try {
  serverProcess = startServer()
  await waitForReachable(`${baseURL}/api/health`)

  await runCheck('realtime websocket rejects unauthenticated upgrade', async () => {
    await expectUnauthedRealtimeRejected()
  })

  const owner = await bootstrapSession('smkrt_a')
  const friend = await bootstrapSession('smkrt_b')

  ownerSocket = await openRealtimeSocket(owner)
  await runCheck('realtime websocket sends ready after authenticated upgrade', async () => {
    await expectMessage(ownerSocket, 'realtime.ready', payload =>
      payload.username === owner.username && payload.save_id === owner.identity.save_id
    )
  })

  await runCheck('realtime websocket handles split and coalesced client frames', async () => {
    let offset = ownerSocket.messages.length
    ownerSocket.sendSplit('ping')
    await expectMessageAfter(ownerSocket, offset, 'realtime.pong', payload =>
      payload.connection_id === ownerSocket.messages.find(message => message?.type === 'realtime.ready')?.payload?.connection_id
    )

    offset = ownerSocket.messages.length
    ownerSocket.sendCoalesced([
      { type: 'presence.snapshot', payload: {} },
      { type: 'ping', payload: {} },
    ])
    await expectMessageAfter(ownerSocket, offset, 'presence.snapshot', payload =>
      Array.isArray(payload.online) && payload.online.some(entry => entry.username === owner.username)
    )
    await expectMessageAfter(ownerSocket, offset, 'realtime.pong')
  })

  friendSocket = await openRealtimeSocket(friend)
  await runCheck('presence online is delivered to connected user', async () => {
    await expectMessage(friendSocket, 'presence.online', payload =>
      payload.username === friend.username && payload.save_id === friend.identity.save_id
    )
  })

  let requestId = ''
  await runCheck('friend request event is delivered through websocket', async () => {
    const result = await fetchSessionJson(owner, '/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_save_id: friend.identity.save_id }),
    })
    assert(result.response.ok, `friend request returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    requestId = String(result.data?.request?.id || '')
    assert(requestId, 'friend request id missing')
    await expectMessage(friendSocket, 'friend.request.created', payload =>
      payload.request?.id === result.data?.request?.id
        && payload.request?.from_username === owner.username
        && payload.request?.to_save_id === friend.identity.save_id
    )
  })

  await runCheck('friend accept event is delivered through websocket', async () => {
    const result = await fetchSessionJson(friend, `/api/taoyuan/online/social/friend-requests/${encodeURIComponent(requestId)}/accept`, {
      method: 'POST',
    })
    assert(result.response.ok, `friend accept returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    await expectMessage(ownerSocket, 'friend.request.accepted', payload =>
      payload.request?.id === requestId
        && payload.request?.from_username === owner.username
        && payload.request?.to_username === friend.username
    )
  })

  await runCheck('offline friend request event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_c')
    const result = await fetchSessionJson(owner, '/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_save_id: offlineTarget.identity.save_id }),
    })
    assert(result.response.ok, `offline friend request returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const offlineRequestId = String(result.data?.request?.id || '')
    assert(offlineRequestId, 'offline friend request id missing')

    offlineReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineReplaySocket, 'friend.request.created', payload =>
      payload.request?.id === offlineRequestId
        && payload.request?.from_username === owner.username
        && payload.request?.to_save_id === offlineTarget.identity.save_id
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed friend request missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed friend request missing replayed marker')

    const ackOffset = offlineReplaySocket.messages.length
    offlineReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineReplaySocket.close()
    offlineReplaySocket = null
    await wait(200)

    offlineReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineReplayReconnectSocket, 0, 'friend.request.created', payload =>
      payload.request?.id === offlineRequestId
    )
    offlineReplayReconnectSocket.close()
    offlineReplayReconnectSocket = null
  })

  let expeditionRoomId = ''
  await runCheck('activity room create event is delivered through websocket', async () => {
    const offset = ownerSocket.messages.length
    const result = await fetchSessionJson(owner, '/api/taoyuan/online/expedition/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '实时远征烟测',
        template_id: 'expedition_outpost',
        gameplay_template_id: 'expedition_roles',
      }),
    })
    assert(result.response.ok, `expedition room create returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    expeditionRoomId = String(result.data?.room?.id || '')
    assert(expeditionRoomId, 'expedition room id missing')
    await expectMessageAfter(ownerSocket, offset, 'activity.room.updated', payload =>
      payload.domain === 'expedition'
        && payload.action === 'create'
        && payload.room?.id === expeditionRoomId
        && payload.room?.host_username === owner.username
    )
  })

  await runCheck('activity room invitation event is delivered through websocket', async () => {
    const offset = friendSocket.messages.length
    const result = await fetchSessionJson(owner, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(expeditionRoomId)}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_username: friend.username }),
    })
    assert(result.response.ok, `expedition room invite returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    await expectMessageAfter(friendSocket, offset, 'activity.room.invited', payload =>
      payload.domain === 'expedition'
        && payload.action === 'invite'
        && payload.target_username === friend.username
        && payload.invitation?.target_username === friend.username
        && payload.room?.id === expeditionRoomId
    )
  })

  await runCheck('activity room update event is delivered after member join', async () => {
    const offset = ownerSocket.messages.length
    const result = await fetchSessionJson(friend, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(expeditionRoomId)}/join`, {
      method: 'POST',
    })
    assert(result.response.ok, `expedition room join returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    await expectMessageAfter(ownerSocket, offset, 'activity.room.updated', payload =>
      payload.domain === 'expedition'
        && payload.action === 'join'
        && payload.actor_username === friend.username
        && payload.room?.id === expeditionRoomId
        && Array.isArray(payload.room?.members)
        && payload.room.members.some(member => member.username === friend.username && member.status === 'joined')
    )
  })

  await runCheck('presence offline is delivered after disconnect', async () => {
    friendSocket.close()
    await expectMessage(ownerSocket, 'presence.offline', payload =>
      payload.username === friend.username && payload.save_id === friend.identity.save_id
    )
  })

  console.log('[qa-realtime-smoke] OK')
  for (const check of checks) {
    console.log(`- ${check}`)
  }
  process.exitCode = 0
} catch (error) {
  console.error('[qa-realtime-smoke] FAILED')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  ownerSocket?.close()
  friendSocket?.close()
  offlineReplaySocket?.close()
  offlineReplayReconnectSocket?.close()
  await stopChild(serverProcess)
  try {
    await rm(smokeTempDir, { recursive: true, force: true })
  } catch {}
  process.exit(process.exitCode ?? 0)
}
