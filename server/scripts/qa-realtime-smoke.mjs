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
const smokeAdminToken = 'realtime-smoke-super-admin'

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
      ADMIN_TOKEN: 'realtime-smoke-admin',
      SUPER_ADMIN_TOKEN: smokeAdminToken,
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

const fetchAdminJson = async (pathname, init = {}) => {
  const headers = new Headers(init.headers || {})
  headers.set('X-Admin-Token', smokeAdminToken)
  const response = await fetch(`${baseURL}${pathname}`, { ...init, headers })
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
let offlineMailReplaySocket = null
let offlineMailReplayReconnectSocket = null
let offlineHallReplaySocket = null
let offlineHallReplayReconnectSocket = null
let offlineManorReplaySocket = null
let offlineManorReplayReconnectSocket = null
let societyMembershipRejectSocket = null
let offlineSocietyReplaySocket = null
let offlineSocietyReplayReconnectSocket = null
let offlineCoopOrderReplaySocket = null
let offlineCoopOrderReplayReconnectSocket = null

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

  await runCheck('admin realtime exposes persisted presence snapshot while online', async () => {
    const result = await fetchAdminJson('/api/admin/taoyuan/realtime')
    assert(result.response.ok, `admin realtime returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const realtime = result.data?.realtime
    assert(realtime?.presence_status === 'ok', 'admin realtime presence status should be ok after websocket connection')
    assert(realtime?.presence_file_exists === true, 'admin realtime presence file should exist after websocket connection')
    assert(Number(realtime?.presence_record_count) >= 2, 'admin realtime presence record count should include connected users')
    assert(Number(realtime?.presence_limits?.max_presence_records) >= 1, 'admin realtime presence limits are missing')
    assert(Array.isArray(realtime?.recent_presence), 'admin realtime recent presence should be an array')
    const ownerPresence = realtime.recent_presence.find(entry => entry?.username === owner.username && entry?.save_id === String(owner.identity.save_id))
    const friendPresence = realtime.recent_presence.find(entry => entry?.username === friend.username && entry?.save_id === String(friend.identity.save_id))
    assert(ownerPresence?.status === 'online', 'admin realtime did not persist owner online presence')
    assert(friendPresence?.status === 'online', 'admin realtime did not persist friend online presence')
    assert(ownerPresence.payload === undefined && friendPresence.payload === undefined, 'admin realtime presence snapshot should not expose notification payload')
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

  await runCheck('targeted coop order create notification event is delivered through websocket', async () => {
    const orderTitle = `RT targeted coop ${createSmokeSeed()}`
    const offset = friendSocket.messages.length
    const result = await fetchSessionJson(owner, '/api/taoyuan/online/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: orderTitle,
        description: 'Realtime smoke targeted coop order.',
        order_type: 'festival_supply',
        scope: 'public',
        target_save_id: friend.identity.save_id,
        deadline_at: Math.floor(Date.now() / 1000) + 86_400,
        reward_type: 'reputation',
        reward_value: 60,
        reward_label: 'Targeted reward',
        stage_definitions: [],
      }),
    })
    assert(result.response.ok, `targeted coop order create returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const orderId = String(result.data?.order?.id || '')
    assert(orderId, 'targeted coop order id missing')
    const notification = await expectMessageAfter(friendSocket, offset, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_created'
        && payload.refresh_required === true
        && payload.order?.id === orderId
        && payload.order?.title === orderTitle
        && payload.order?.target_save_id === friend.identity.save_id
        && payload.order?.target_username === friend.username
        && payload.order?.owner_username === owner.username
        && payload.actor_username === owner.username
    )
    assert(notification.payload?.order?.description === undefined, 'targeted coop notification should not expose full description')
    assert(notification.payload?.order?.delivered_items === undefined, 'targeted coop notification should not expose delivered items')
  })

  await runCheck('mail notification event is delivered through websocket', async () => {
    const mailTitle = `实时来信通知 ${createSmokeSeed()}`
    const offset = friendSocket.messages.length
    const result = await fetchSessionJson(owner, '/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_save_id: friend.identity.save_id,
        title: mailTitle,
        content: '这是一封实时通知烟测来信。',
        template_type: 'short_note',
      }),
    })
    assert(result.response.ok, `player letter returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    await expectMessageAfter(friendSocket, offset, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'player_letter'
        && payload.refresh_required === true
        && payload.mail?.id === result.data?.mail?.id
        && payload.mail?.title === mailTitle
        && payload.mail?.sender_username === owner.username
    )
  })

  await runCheck('system campaign mail notification event is delivered through websocket', async () => {
    const mailTitle = `实时系统邮件 ${createSmokeSeed()}`
    const offset = ownerSocket.messages.length
    const result = await fetchSessionJson(owner, '/api/taoyuan/mail/system-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: mailTitle,
        content: '这是一封实时通知烟测系统邮件。',
        template_type: 'maintenance_notice',
      }),
    })
    assert(result.response.ok, `system campaign mail returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    assert(Number(result.data?.campaign?.delivery_count) === 1, 'system campaign delivery count should be 1')
    const notification = await expectMessageAfter(ownerSocket, offset, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'system_campaign'
        && payload.refresh_required === true
        && payload.mail?.title === mailTitle
    )
    assert(String(notification.payload?.mail?.id || ''), 'system campaign notification missing mail id')
  })

  await runCheck('admin campaign mail notification event is delivered through websocket', async () => {
    const mailTitle = `实时后台邮件 ${createSmokeSeed()}`
    const offset = friendSocket.messages.length
    const result = await fetchAdminJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        title: mailTitle,
        content: '这是一封实时通知烟测后台邮件。',
        template_type: 'activity_notice',
        recipient_rule: {
          mode: 'single',
          username: friend.username,
        },
      }),
    })
    assert(result.response.ok, `admin campaign mail returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    assert(Number(result.data?.campaign?.delivery_count) === 1, 'admin campaign delivery count should be 1')
    const notification = await expectMessageAfter(friendSocket, offset, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'admin_campaign'
        && payload.refresh_required === true
        && payload.mail?.title === mailTitle
    )
    assert(String(notification.payload?.mail?.id || ''), 'admin campaign notification missing mail id')
  })

  await runCheck('world event contribution notification event is delivered through websocket', async () => {
    const overviewResult = await fetchSessionJson(owner, '/api/taoyuan/online/world-events')
    assert(overviewResult.response.ok, `world event overview returned ${overviewResult.response.status}: ${overviewResult.data?.msg || 'unknown error'}`)
    const event = overviewResult.data?.current_event || overviewResult.data?.current_world_events?.[0]
    const action = event?.contribution_actions?.find(item => item?.can_use)
    assert(event?.id, 'world event id missing')
    assert(action?.id, 'world event action id missing')

    const offset = friendSocket.messages.length
    const result = await fetchSessionJson(owner, `/api/taoyuan/online/world-events/${encodeURIComponent(event.id)}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_id: action.id }),
    })
    assert(result.response.ok, `world event contribute returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const notification = await expectMessageAfter(friendSocket, offset, 'notification.created', payload =>
      payload.category === 'world_event'
        && payload.action === 'contribution_created'
        && payload.refresh_required === true
        && payload.event?.id === result.data?.event?.id
        && payload.event?.label === result.data?.event?.label
        && Number(payload.event?.progress_value) === Number(result.data?.event?.progress_value)
        && payload.actor_username === owner.username
    )
    assert(notification.payload?.overview === undefined, 'world event notification should not expose overview')
    assert(notification.payload?.event?.contributors === undefined, 'world event notification should not expose contributors')
    assert(notification.payload?.event?.recent_logs === undefined, 'world event notification should not expose logs')
    assert(notification.queued_event_id === undefined, 'online world event notification should not be queued')
  })

  await runCheck('neighbor consignment notification event is delivered through websocket', async () => {
    const groupResult = await fetchSessionJson(owner, '/api/taoyuan/online/social/neighbors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `RT 邻里 ${createSmokeSeed()}`,
        summary: 'Realtime smoke neighbor group.',
        visibility: 'public',
      }),
    })
    assert(groupResult.response.ok, `neighbor group create returned ${groupResult.response.status}: ${groupResult.data?.msg || 'unknown error'}`)
    const groupId = String(groupResult.data?.group?.id || '')
    assert(groupId, 'neighbor group id missing')

    const applyResult = await fetchSessionJson(friend, `/api/taoyuan/online/social/neighbors/${encodeURIComponent(groupId)}/apply`, {
      method: 'POST',
    })
    assert(applyResult.response.ok, `neighbor apply returned ${applyResult.response.status}: ${applyResult.data?.msg || 'unknown error'}`)
    const requestId = String(applyResult.data?.request?.id || '')
    assert(requestId, 'neighbor apply request id missing')

    const acceptResult = await fetchSessionJson(owner, `/api/taoyuan/online/social/neighbors/requests/${encodeURIComponent(requestId)}/accept`, {
      method: 'POST',
    })
    assert(acceptResult.response.ok, `neighbor accept returned ${acceptResult.response.status}: ${acceptResult.data?.msg || 'unknown error'}`)

    const createOffset = ownerSocket.messages.length
    const createResult = await fetchSessionJson(friend, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 70,
        scope: 'neighbors',
      }),
    })
    assert(createResult.response.ok, `neighbor consignment create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    const listingId = String(createResult.data?.listing?.id || '')
    assert(listingId, 'neighbor consignment listing id missing')
    const createdNotification = await expectMessageAfter(ownerSocket, createOffset, 'notification.created', payload =>
      payload.category === 'exchange'
        && payload.action === 'neighbor_consignment_updated'
        && payload.refresh_required === true
        && payload.exchange?.source === 'neighbor_consignment'
        && payload.exchange?.listing_id === listingId
        && payload.exchange?.listing_status === 'open'
        && payload.exchange?.seller_username === friend.username
        && payload.actor_username === friend.username
    )
    assert(createdNotification.payload?.overview === undefined, 'neighbor consignment notification should not expose overview')
    assert(createdNotification.payload?.exchange?.item_id === undefined, 'neighbor consignment notification should not expose item detail')
    assert(createdNotification.queued_event_id === undefined, 'neighbor consignment online notification should not be queued')

    const soldOffset = friendSocket.messages.length
    const soldResult = await fetchSessionJson(owner, `/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(listingId)}/purchase`, {
      method: 'POST',
    })
    assert(soldResult.response.ok, `neighbor consignment purchase returned ${soldResult.response.status}: ${soldResult.data?.msg || 'unknown error'}`)
    const soldNotification = await expectMessageAfter(friendSocket, soldOffset, 'notification.created', payload =>
      payload.category === 'exchange'
        && payload.action === 'neighbor_consignment_updated'
        && payload.refresh_required === true
        && payload.exchange?.source === 'neighbor_consignment'
        && payload.exchange?.listing_id === listingId
        && payload.exchange?.listing_status === 'sold'
        && payload.exchange?.buyer_username === owner.username
        && payload.actor_username === owner.username
    )
    assert(soldNotification.payload?.exchange?.price_money === undefined, 'neighbor consignment sold notification should not expose price detail')
  })

  await runCheck('hall reply notification event is delivered through websocket', async () => {
    const postTitle = `hall realtime post ${createSmokeSeed()}`
    const createResult = await fetchSessionJson(owner, '/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: postTitle,
        content: 'This hall post waits for a realtime reply notification.',
        type: 'discussion',
      }),
    })
    assert(createResult.response.ok, `hall post create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    const postId = String(createResult.data?.post?.id || '')
    assert(postId, 'hall post id missing')

    const offset = ownerSocket.messages.length
    const replyResult = await fetchSessionJson(friend, `/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'This reply should notify the post author.' }),
    })
    assert(replyResult.response.ok, `hall reply create returned ${replyResult.response.status}: ${replyResult.data?.msg || 'unknown error'}`)
    const reply = replyResult.data?.post?.replies?.at(-1)
    assert(reply?.id, 'hall reply id missing')
    await expectMessageAfter(ownerSocket, offset, 'notification.created', payload =>
      payload.category === 'hall'
        && payload.action === 'post_reply'
        && payload.refresh_required === true
        && payload.post?.id === postId
        && payload.post?.title === postTitle
        && payload.reply?.id === reply.id
        && payload.reply?.author_username === friend.username
        && payload.actor_username === friend.username
    )
  })

  await runCheck('hall official announcement notification event is delivered through websocket', async () => {
    const postTitle = `官方公告实时 ${createSmokeSeed()}`
    const offset = friendSocket.messages.length
    const result = await fetchSessionJson(owner, '/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': smokeAdminToken,
      },
      body: JSON.stringify({
        title: postTitle,
        content: 'This official announcement should notify hall readers.',
        type: 'discussion',
        is_official: true,
        official_template_type: 'event_announcement',
      }),
    })
    assert(result.response.ok, `hall official announcement returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const postId = String(result.data?.post?.id || '')
    assert(postId, 'hall official announcement post id missing')
    await expectMessageAfter(friendSocket, offset, 'notification.created', payload =>
      payload.category === 'hall'
        && payload.action === 'official_announcement'
        && payload.refresh_required === true
        && payload.post?.id === postId
        && payload.post?.title === postTitle
        && payload.post?.is_official === true
        && payload.post?.official_template_type === 'event_announcement'
        && payload.actor_username === owner.username
    )
  })

  let societyId = ''
  await runCheck('society notice notification event is delivered through websocket', async () => {
    const createResult = await fetchSessionJson(owner, '/api/taoyuan/online/societies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `RT Society ${createSmokeSeed()}`,
        summary: 'Realtime smoke society.',
        notice: 'Initial realtime society notice.',
        emblem: 'plum_seal',
        theme: 'harvest_union',
        visibility: 'public',
        capacity: 24,
        join_requirement_id: 'open',
        join_requirement_note: '',
      }),
    })
    assert(createResult.response.ok, `society create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    societyId = String(createResult.data?.society?.id || '')
    assert(societyId, 'society id missing')

    const ownerApplyOffset = ownerSocket.messages.length
    const applyResult = await fetchSessionJson(friend, `/api/taoyuan/online/societies/${encodeURIComponent(societyId)}/apply`, {
      method: 'POST',
    })
    assert(applyResult.response.ok, `society apply returned ${applyResult.response.status}: ${applyResult.data?.msg || 'unknown error'}`)
    const requestId = String(applyResult.data?.request?.id || '')
    assert(requestId, 'society apply request id missing')
    const applyNotification = await expectMessageAfter(ownerSocket, ownerApplyOffset, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'member_applied'
        && payload.refresh_required === true
        && payload.society?.id === societyId
        && payload.request?.id === requestId
        && payload.request?.type === 'apply'
        && payload.request?.status === 'pending'
        && payload.request?.username === friend.username
        && payload.actor_username === friend.username
    )
    assert(applyNotification.payload?.overview === undefined, 'society membership notification should not expose overview')
    assert(applyNotification.payload?.members === undefined, 'society membership notification should not expose members')

    const friendAcceptOffset = friendSocket.messages.length
    const acceptResult = await fetchSessionJson(owner, `/api/taoyuan/online/societies/requests/${encodeURIComponent(requestId)}/accept`, {
      method: 'POST',
    })
    assert(acceptResult.response.ok, `society accept returned ${acceptResult.response.status}: ${acceptResult.data?.msg || 'unknown error'}`)
    const acceptNotification = await expectMessageAfter(friendSocket, friendAcceptOffset, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'membership_accepted'
        && payload.refresh_required === true
        && payload.society?.id === societyId
        && payload.request?.id === requestId
        && payload.request?.type === 'apply'
        && payload.request?.status === 'accepted'
        && payload.request?.username === friend.username
        && payload.actor_username === owner.username
    )
    assert(acceptNotification.payload?.overview === undefined, 'society membership accept notification should not expose overview')

    const noticeText = `Realtime society notice ${createSmokeSeed()}`
    const offset = friendSocket.messages.length
    const noticeResult = await fetchSessionJson(owner, '/api/taoyuan/online/societies/notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice: noticeText }),
    })
    assert(noticeResult.response.ok, `society notice returned ${noticeResult.response.status}: ${noticeResult.data?.msg || 'unknown error'}`)
    await expectMessageAfter(friendSocket, offset, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'notice_updated'
        && payload.refresh_required === true
        && payload.society?.id === societyId
        && payload.society?.notice === noticeText
        && payload.actor_username === owner.username
    )

    const overviewResult = await fetchSessionJson(owner, '/api/taoyuan/online/societies')
    assert(overviewResult.response.ok, `society overview returned ${overviewResult.response.status}: ${overviewResult.data?.msg || 'unknown error'}`)
    const project = overviewResult.data?.my_society?.public_projects?.find(item => item?.can_contribute)
    const contributionPackage = project?.contribution_packages?.find(item => item?.id === 'survey_fund') || project?.contribution_packages?.[0]
    assert(project?.id, 'society public project id missing')
    assert(contributionPackage?.id, 'society public project package id missing')

    const projectOffset = friendSocket.messages.length
    const projectResult = await fetchSessionJson(owner, `/api/taoyuan/online/societies/public-projects/${encodeURIComponent(project.id)}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: contributionPackage.id }),
    })
    assert(projectResult.response.ok, `society project contribute returned ${projectResult.response.status}: ${projectResult.data?.msg || 'unknown error'}`)
    const projectNotification = await expectMessageAfter(friendSocket, projectOffset, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'public_project_contributed'
        && payload.refresh_required === true
        && payload.society?.id === societyId
        && payload.project?.id === projectResult.data?.project?.id
        && payload.project?.progress === projectResult.data?.project?.progress
        && payload.contribution?.package_id === contributionPackage.id
        && payload.actor_username === owner.username
    )
    assert(projectNotification.payload?.overview === undefined, 'society project notification should not expose overview')
    assert(projectNotification.payload?.project?.recent_contributions === undefined, 'society project notification should not expose contribution list')
    assert(projectNotification.payload?.members === undefined, 'society project notification should not expose members')

    const depositOption = overviewResult.data?.my_society?.public_warehouse?.deposit_options?.find(item => item?.id === 'wood_crate')
      || overviewResult.data?.my_society?.public_warehouse?.deposit_options?.[0]
    assert(depositOption?.id, 'society warehouse deposit id missing')
    const warehouseOffset = friendSocket.messages.length
    const warehouseResult = await fetchSessionJson(owner, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit_id: depositOption.id }),
    })
    assert(warehouseResult.response.ok, `society warehouse deposit returned ${warehouseResult.response.status}: ${warehouseResult.data?.msg || 'unknown error'}`)
    const warehouseNotification = await expectMessageAfter(friendSocket, warehouseOffset, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'warehouse_deposited'
        && payload.refresh_required === true
        && payload.society?.id === societyId
        && payload.warehouse?.latest_log?.deposit_id === depositOption.id
        && payload.actor_username === owner.username
    )
    assert(warehouseNotification.payload?.overview === undefined, 'society warehouse notification should not expose overview')
    assert(warehouseNotification.payload?.warehouse?.logs === undefined, 'society warehouse notification should not expose warehouse logs')
    assert(warehouseNotification.payload?.members === undefined, 'society warehouse notification should not expose members')
  })

  await runCheck('society membership reject notification event is delivered through websocket', async () => {
    const rejectedTarget = await bootstrapSession('smkrt_i')
    societyMembershipRejectSocket = await openRealtimeSocket(rejectedTarget)
    await expectMessage(societyMembershipRejectSocket, 'realtime.ready', payload =>
      payload.username === rejectedTarget.username
    )

    const applyResult = await fetchSessionJson(rejectedTarget, `/api/taoyuan/online/societies/${encodeURIComponent(societyId)}/apply`, {
      method: 'POST',
    })
    assert(applyResult.response.ok, `society reject target apply returned ${applyResult.response.status}: ${applyResult.data?.msg || 'unknown error'}`)
    const requestId = String(applyResult.data?.request?.id || '')
    assert(requestId, 'society reject target request id missing')

    const rejectOffset = societyMembershipRejectSocket.messages.length
    const rejectResult = await fetchSessionJson(owner, `/api/taoyuan/online/societies/requests/${encodeURIComponent(requestId)}/reject`, {
      method: 'POST',
    })
    assert(rejectResult.response.ok, `society reject returned ${rejectResult.response.status}: ${rejectResult.data?.msg || 'unknown error'}`)
    const rejectNotification = await expectMessageAfter(societyMembershipRejectSocket, rejectOffset, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'membership_rejected'
        && payload.refresh_required === true
        && payload.society?.id === societyId
        && payload.request?.id === requestId
        && payload.request?.type === 'apply'
        && payload.request?.status === 'rejected'
        && payload.request?.username === rejectedTarget.username
        && payload.actor_username === owner.username
    )
    assert(rejectNotification.payload?.overview === undefined, 'society membership reject notification should not expose overview')
    societyMembershipRejectSocket.close()
    societyMembershipRejectSocket = null
  })

  await runCheck('manor guestbook notification event is delivered through websocket', async () => {
    const guestbookText = `Realtime manor guestbook ${createSmokeSeed()}`
    const friendOffset = friendSocket.messages.length
    const guestbookResult = await fetchSessionJson(owner, '/api/taoyuan/online/manor/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_save_id: friend.identity.save_id,
        kind: 'blessing',
        content: guestbookText,
      }),
    })
    assert(guestbookResult.response.ok, `manor guestbook returned ${guestbookResult.response.status}: ${guestbookResult.data?.msg || 'unknown error'}`)
    const entryId = String(guestbookResult.data?.entry?.id || '')
    assert(entryId, 'manor guestbook entry id missing')
    const guestbookNotification = await expectMessageAfter(friendSocket, friendOffset, 'notification.created', payload =>
      payload.category === 'manor'
        && payload.action === 'guestbook_created'
        && payload.refresh_required === true
        && payload.manor?.owner_username === friend.username
        && payload.guestbook?.id === entryId
        && payload.guestbook?.kind === 'blessing'
        && payload.guestbook?.author_username === owner.username
        && payload.actor_username === owner.username
    )
    assert(guestbookNotification.payload?.guestbook?.content === undefined, 'manor guestbook notification should not expose content')
    assert(guestbookNotification.payload?.guestbook?.reply_text === undefined, 'manor guestbook notification should not expose reply text')

    const replyText = `Realtime manor reply ${createSmokeSeed()}`
    const ownerOffset = ownerSocket.messages.length
    const replyResult = await fetchSessionJson(friend, `/api/taoyuan/online/manor/guestbook/${encodeURIComponent(entryId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply_text: replyText }),
    })
    assert(replyResult.response.ok, `manor guestbook reply returned ${replyResult.response.status}: ${replyResult.data?.msg || 'unknown error'}`)
    const replyNotification = await expectMessageAfter(ownerSocket, ownerOffset, 'notification.created', payload =>
      payload.category === 'manor'
        && payload.action === 'guestbook_replied'
        && payload.refresh_required === true
        && payload.manor?.owner_username === friend.username
        && payload.guestbook?.id === entryId
        && payload.guestbook?.has_reply === true
        && payload.guestbook?.author_username === owner.username
        && payload.actor_username === friend.username
    )
    assert(replyNotification.payload?.guestbook?.content === undefined, 'manor reply notification should not expose content')
    assert(replyNotification.payload?.guestbook?.reply_text === undefined, 'manor reply notification should not expose reply text')
  })

  await runCheck('coop order accept notification event is delivered through websocket', async () => {
    const orderTitle = `RT coop order ${createSmokeSeed()}`
    const createResult = await fetchSessionJson(owner, '/api/taoyuan/online/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: orderTitle,
        description: 'Realtime smoke coop order acceptance.',
        order_type: 'material_help',
        scope: 'public',
        deadline_at: Math.floor(Date.now() / 1000) + 86_400,
        reward_type: 'money',
        reward_value: 120,
        reward_label: 'Smoke reward',
        stage_definitions: [],
      }),
    })
    assert(createResult.response.ok, `coop order create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    const orderId = String(createResult.data?.order?.id || '')
    assert(orderId, 'coop order id missing')

    const ownerOffset = ownerSocket.messages.length
    const friendOffset = friendSocket.messages.length
    const acceptResult = await fetchSessionJson(friend, `/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/accept`, {
      method: 'POST',
    })
    assert(acceptResult.response.ok, `coop order accept returned ${acceptResult.response.status}: ${acceptResult.data?.msg || 'unknown error'}`)
    const ownerNotification = await expectMessageAfter(ownerSocket, ownerOffset, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_accepted'
        && payload.refresh_required === true
        && payload.order?.id === orderId
        && payload.order?.title === orderTitle
        && payload.order?.assignee_username === friend.username
        && payload.actor_username === friend.username
    )
    assert(ownerNotification.payload?.order?.delivered_items === undefined, 'coop order notification should not expose delivered items')
    assert(ownerNotification.payload?.receipt === undefined, 'coop order accept notification should not include receipt detail')
    await expectMessageAfter(friendSocket, friendOffset, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_accepted'
        && payload.refresh_required === true
        && payload.order?.id === orderId
        && payload.order?.assignee_username === friend.username
        && payload.actor_username === friend.username
    )
  })

  await runCheck('offline society notice notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_i')
    const applyResult = await fetchSessionJson(offlineTarget, `/api/taoyuan/online/societies/${encodeURIComponent(societyId)}/apply`, {
      method: 'POST',
    })
    assert(applyResult.response.ok, `offline society apply returned ${applyResult.response.status}: ${applyResult.data?.msg || 'unknown error'}`)
    const requestId = String(applyResult.data?.request?.id || '')
    assert(requestId, 'offline society apply request id missing')

    const acceptResult = await fetchSessionJson(owner, `/api/taoyuan/online/societies/requests/${encodeURIComponent(requestId)}/accept`, {
      method: 'POST',
    })
    assert(acceptResult.response.ok, `offline society accept returned ${acceptResult.response.status}: ${acceptResult.data?.msg || 'unknown error'}`)

    const noticeText = `Offline society notice ${createSmokeSeed()}`
    const noticeResult = await fetchSessionJson(owner, '/api/taoyuan/online/societies/notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice: noticeText }),
    })
    assert(noticeResult.response.ok, `offline society notice returned ${noticeResult.response.status}: ${noticeResult.data?.msg || 'unknown error'}`)

    offlineSocietyReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineSocietyReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline society notice replay ready did not report pending notifications')
    const membershipQueuedMessage = await expectMessage(offlineSocietyReplaySocket, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'membership_accepted'
        && payload.society?.id === societyId
        && payload.request?.id === requestId
        && payload.request?.status === 'accepted'
        && payload.request?.username === offlineTarget.username
        && payload.actor_username === owner.username
    )
    const membershipQueuedEventId = String(membershipQueuedMessage.queued_event_id || '')
    assert(membershipQueuedEventId, 'replayed society membership notification missing queued_event_id')
    assert(membershipQueuedMessage.replayed === true, 'replayed society membership notification missing replayed marker')

    const queuedMessage = await expectMessage(offlineSocietyReplaySocket, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'notice_updated'
        && payload.society?.id === societyId
        && payload.society?.notice === noticeText
        && payload.actor_username === owner.username
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed society notice notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed society notice notification missing replayed marker')

    const ackOffset = offlineSocietyReplaySocket.messages.length
    offlineSocietyReplaySocket.send('notification.ack', { ids: [membershipQueuedEventId, queuedEventId] })
    await expectMessageAfter(offlineSocietyReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(membershipQueuedEventId)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineSocietyReplaySocket.close()
    offlineSocietyReplaySocket = null
    await wait(200)

    offlineSocietyReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineSocietyReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineSocietyReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'society'
        && (payload.action === 'membership_accepted' || payload.action === 'notice_updated')
        && payload.society?.id === societyId
        && (payload.request?.id === requestId || payload.society?.notice === noticeText)
    )
    offlineSocietyReplayReconnectSocket.close()
    offlineSocietyReplayReconnectSocket = null
  })

  await runCheck('offline society invite notification event is replayed and acknowledged after reconnect', async () => {
    const offlineInviteTarget = await bootstrapSession('smkrt_j')
    const inviteResult = await fetchSessionJson(owner, '/api/taoyuan/online/societies/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_save_id: offlineInviteTarget.identity.save_id }),
    })
    assert(inviteResult.response.ok, `offline society invite returned ${inviteResult.response.status}: ${inviteResult.data?.msg || 'unknown error'}`)
    const requestId = String(inviteResult.data?.request?.id || '')
    assert(requestId, 'offline society invite request id missing')

    offlineSocietyReplaySocket = await openRealtimeSocket(offlineInviteTarget)
    const ready = await expectMessage(offlineSocietyReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineInviteTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline society invite replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineSocietyReplaySocket, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'member_invited'
        && payload.society?.id === societyId
        && payload.request?.id === requestId
        && payload.request?.type === 'invite'
        && payload.request?.status === 'pending'
        && payload.request?.username === offlineInviteTarget.username
        && payload.request?.invited_by === owner.username
        && payload.actor_username === owner.username
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed society invite notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed society invite notification missing replayed marker')

    const ackOffset = offlineSocietyReplaySocket.messages.length
    offlineSocietyReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineSocietyReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineSocietyReplaySocket.close()
    offlineSocietyReplaySocket = null
    await wait(200)

    offlineSocietyReplayReconnectSocket = await openRealtimeSocket(offlineInviteTarget)
    await expectMessage(offlineSocietyReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineInviteTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineSocietyReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'society'
        && payload.action === 'member_invited'
        && payload.society?.id === societyId
        && payload.request?.id === requestId
    )
    offlineSocietyReplayReconnectSocket.close()
    offlineSocietyReplayReconnectSocket = null
  })

  await runCheck('offline coop order notification event is replayed and acknowledged after reconnect', async () => {
    const offlineOwner = await bootstrapSession('smkrt_j')
    const orderTitle = `Offline coop order ${createSmokeSeed()}`
    const createResult = await fetchSessionJson(offlineOwner, '/api/taoyuan/online/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: orderTitle,
        description: 'Queued coop order acceptance notification.',
        order_type: 'material_help',
        scope: 'public',
        deadline_at: Math.floor(Date.now() / 1000) + 86_400,
        reward_type: 'money',
        reward_value: 160,
        reward_label: 'Queued reward',
        stage_definitions: [],
      }),
    })
    assert(createResult.response.ok, `offline owner coop order create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    const orderId = String(createResult.data?.order?.id || '')
    assert(orderId, 'offline owner coop order id missing')

    const acceptResult = await fetchSessionJson(friend, `/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/accept`, {
      method: 'POST',
    })
    assert(acceptResult.response.ok, `offline owner coop order accept returned ${acceptResult.response.status}: ${acceptResult.data?.msg || 'unknown error'}`)

    offlineCoopOrderReplaySocket = await openRealtimeSocket(offlineOwner)
    const ready = await expectMessage(offlineCoopOrderReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineOwner.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline coop order replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineCoopOrderReplaySocket, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_accepted'
        && payload.order?.id === orderId
        && payload.order?.title === orderTitle
        && payload.order?.assignee_username === friend.username
        && payload.actor_username === friend.username
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed coop order notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed coop order notification missing replayed marker')

    const ackOffset = offlineCoopOrderReplaySocket.messages.length
    offlineCoopOrderReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineCoopOrderReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineCoopOrderReplaySocket.close()
    offlineCoopOrderReplaySocket = null
    await wait(200)

    offlineCoopOrderReplayReconnectSocket = await openRealtimeSocket(offlineOwner)
    await expectMessage(offlineCoopOrderReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineOwner.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineCoopOrderReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_accepted'
        && payload.order?.id === orderId
    )
    offlineCoopOrderReplayReconnectSocket.close()
    offlineCoopOrderReplayReconnectSocket = null
  })

  await runCheck('offline targeted coop order create notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_k')
    offlineCoopOrderReplaySocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineCoopOrderReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username
    )

    const requestOffset = offlineCoopOrderReplaySocket.messages.length
    const friendResult = await fetchSessionJson(owner, '/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_save_id: offlineTarget.identity.save_id }),
    })
    assert(friendResult.response.ok, `offline target friend request returned ${friendResult.response.status}: ${friendResult.data?.msg || 'unknown error'}`)
    const offlineTargetRequestId = String(friendResult.data?.request?.id || '')
    assert(offlineTargetRequestId, 'offline target friend request id missing')
    await expectMessageAfter(offlineCoopOrderReplaySocket, requestOffset, 'friend.request.created', payload =>
      payload.request?.id === offlineTargetRequestId
        && payload.request?.to_save_id === offlineTarget.identity.save_id
    )

    const acceptResult = await fetchSessionJson(offlineTarget, `/api/taoyuan/online/social/friend-requests/${encodeURIComponent(offlineTargetRequestId)}/accept`, {
      method: 'POST',
    })
    assert(acceptResult.response.ok, `offline target friend accept returned ${acceptResult.response.status}: ${acceptResult.data?.msg || 'unknown error'}`)

    offlineCoopOrderReplaySocket.close()
    offlineCoopOrderReplaySocket = null
    await wait(200)

    const orderTitle = `Offline targeted coop ${createSmokeSeed()}`
    const createResult = await fetchSessionJson(owner, '/api/taoyuan/online/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: orderTitle,
        description: 'Queued targeted coop order creation notification.',
        order_type: 'festival_supply',
        scope: 'public',
        target_save_id: offlineTarget.identity.save_id,
        deadline_at: Math.floor(Date.now() / 1000) + 86_400,
        reward_type: 'reputation',
        reward_value: 70,
        reward_label: 'Queued targeted reward',
        stage_definitions: [],
      }),
    })
    assert(createResult.response.ok, `offline targeted coop order create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    const orderId = String(createResult.data?.order?.id || '')
    assert(orderId, 'offline targeted coop order id missing')

    offlineCoopOrderReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineCoopOrderReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline targeted coop replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineCoopOrderReplaySocket, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_created'
        && payload.order?.id === orderId
        && payload.order?.title === orderTitle
        && payload.order?.target_save_id === offlineTarget.identity.save_id
        && payload.order?.target_username === offlineTarget.username
        && payload.actor_username === owner.username
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed targeted coop order notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed targeted coop order notification missing replayed marker')
    assert(queuedMessage.payload?.order?.description === undefined, 'replayed targeted coop notification should not expose full description')

    const ackOffset = offlineCoopOrderReplaySocket.messages.length
    offlineCoopOrderReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineCoopOrderReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineCoopOrderReplaySocket.close()
    offlineCoopOrderReplaySocket = null
    await wait(200)

    offlineCoopOrderReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineCoopOrderReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineCoopOrderReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'coop_order'
        && payload.action === 'order_created'
        && payload.order?.id === orderId
    )
    offlineCoopOrderReplayReconnectSocket.close()
    offlineCoopOrderReplayReconnectSocket = null
  })

  await runCheck('offline manor guestbook notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_k')
    const guestbookText = `Offline manor guestbook ${createSmokeSeed()}`
    const guestbookResult = await fetchSessionJson(owner, '/api/taoyuan/online/manor/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_save_id: offlineTarget.identity.save_id,
        kind: 'stamp',
        content: guestbookText,
      }),
    })
    assert(guestbookResult.response.ok, `offline manor guestbook returned ${guestbookResult.response.status}: ${guestbookResult.data?.msg || 'unknown error'}`)
    const entryId = String(guestbookResult.data?.entry?.id || '')
    assert(entryId, 'offline manor guestbook entry id missing')

    offlineManorReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineManorReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline manor replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineManorReplaySocket, 'notification.created', payload =>
      payload.category === 'manor'
        && payload.action === 'guestbook_created'
        && payload.manor?.owner_username === offlineTarget.username
        && payload.guestbook?.id === entryId
        && payload.guestbook?.kind === 'stamp'
        && payload.guestbook?.author_username === owner.username
        && payload.actor_username === owner.username
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed manor notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed manor notification missing replayed marker')
    assert(queuedMessage.payload?.guestbook?.content === undefined, 'replayed manor notification should not expose content')
    assert(queuedMessage.payload?.guestbook?.reply_text === undefined, 'replayed manor notification should not expose reply text')

    const ackOffset = offlineManorReplaySocket.messages.length
    offlineManorReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineManorReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineManorReplaySocket.close()
    offlineManorReplaySocket = null
    await wait(200)

    offlineManorReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineManorReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineManorReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'manor'
        && payload.action === 'guestbook_created'
        && payload.guestbook?.id === entryId
    )
    offlineManorReplayReconnectSocket.close()
    offlineManorReplayReconnectSocket = null
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

  await runCheck('offline mail notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_d')
    const mailTitle = `离线来信通知 ${createSmokeSeed()}`
    const result = await fetchSessionJson(owner, '/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_save_id: offlineTarget.identity.save_id,
        title: mailTitle,
        content: '这是一封离线补发烟测来信。',
        template_type: 'short_note',
      }),
    })
    assert(result.response.ok, `offline player letter returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)

    offlineMailReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineMailReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline mail replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineMailReplaySocket, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'player_letter'
        && payload.mail?.id === result.data?.mail?.id
        && payload.mail?.title === mailTitle
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed mail notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed mail notification missing replayed marker')

    const ackOffset = offlineMailReplaySocket.messages.length
    offlineMailReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineMailReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineMailReplaySocket.close()
    offlineMailReplaySocket = null
    await wait(200)

    offlineMailReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineMailReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineMailReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.mail?.id === result.data?.mail?.id
    )
    offlineMailReplayReconnectSocket.close()
    offlineMailReplayReconnectSocket = null
  })

  await runCheck('offline admin campaign mail notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_f')
    const mailTitle = `离线后台邮件 ${createSmokeSeed()}`
    const result = await fetchAdminJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        title: mailTitle,
        content: '这是一封离线补发烟测后台邮件。',
        template_type: 'activity_notice',
        recipient_rule: {
          mode: 'single',
          username: offlineTarget.username,
        },
      }),
    })
    assert(result.response.ok, `offline admin campaign mail returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    assert(Number(result.data?.campaign?.delivery_count) === 1, 'offline admin campaign delivery count should be 1')

    offlineMailReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineMailReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline admin campaign mail replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineMailReplaySocket, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'admin_campaign'
        && payload.mail?.title === mailTitle
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed admin campaign mail notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed admin campaign mail notification missing replayed marker')

    const ackOffset = offlineMailReplaySocket.messages.length
    offlineMailReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineMailReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineMailReplaySocket.close()
    offlineMailReplaySocket = null
    await wait(200)

    offlineMailReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineMailReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineMailReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'admin_campaign'
        && payload.mail?.title === mailTitle
    )
    offlineMailReplayReconnectSocket.close()
    offlineMailReplayReconnectSocket = null
  })

  await runCheck('offline scheduled campaign mail notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_g')
    const mailTitle = `定时后台邮件 ${createSmokeSeed()}`
    const scheduledAt = Math.floor(Date.now() / 1000) + 3
    const scheduleResult = await fetchAdminJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'schedule',
        title: mailTitle,
        content: '这是一封定时补发烟测后台邮件。',
        template_type: 'activity_notice',
        scheduled_at: scheduledAt,
        recipient_rule: {
          mode: 'single',
          username: offlineTarget.username,
        },
      }),
    })
    assert(scheduleResult.response.ok, `scheduled campaign mail returned ${scheduleResult.response.status}: ${scheduleResult.data?.msg || 'unknown error'}`)
    const campaignId = String(scheduleResult.data?.campaign?.id || '')
    assert(campaignId, 'scheduled campaign id missing')
    assert(scheduleResult.data?.campaign?.status === 'scheduled', 'scheduled campaign should stay scheduled before due time')
    assert(Number(scheduleResult.data?.campaign?.delivery_count) === 0, 'scheduled campaign should not deliver immediately')

    await wait(3600)
    const triggerResult = await fetchAdminJson('/api/admin/taoyuan/mail/campaigns')
    assert(triggerResult.response.ok, `scheduled campaign trigger returned ${triggerResult.response.status}: ${triggerResult.data?.msg || 'unknown error'}`)
    const sentCampaign = (triggerResult.data?.campaigns || []).find(item => item.id === campaignId)
    assert(sentCampaign?.status === 'sent', 'scheduled campaign should be sent after due trigger')
    assert(Number(sentCampaign?.delivery_count) === 1, 'scheduled campaign should create one delivery after due trigger')

    offlineMailReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineMailReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline scheduled campaign mail replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineMailReplaySocket, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'scheduled_campaign'
        && payload.mail?.title === mailTitle
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed scheduled campaign mail notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed scheduled campaign mail notification missing replayed marker')

    const ackOffset = offlineMailReplaySocket.messages.length
    offlineMailReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineMailReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineMailReplaySocket.close()
    offlineMailReplaySocket = null
    await wait(200)

    offlineMailReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineMailReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineMailReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'mail'
        && payload.action === 'scheduled_campaign'
        && payload.mail?.title === mailTitle
    )
    offlineMailReplayReconnectSocket.close()
    offlineMailReplayReconnectSocket = null
  })

  await runCheck('offline hall reply notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_e')
    const postTitle = `offline hall reply ${createSmokeSeed()}`
    const createResult = await fetchSessionJson(offlineTarget, '/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: postTitle,
        content: 'This offline hall post waits for a queued reply notification.',
        type: 'discussion',
      }),
    })
    assert(createResult.response.ok, `offline hall post create returned ${createResult.response.status}: ${createResult.data?.msg || 'unknown error'}`)
    const postId = String(createResult.data?.post?.id || '')
    assert(postId, 'offline hall post id missing')

    const replyResult = await fetchSessionJson(owner, `/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'This queued reply should notify the offline post author.' }),
    })
    assert(replyResult.response.ok, `offline hall reply create returned ${replyResult.response.status}: ${replyResult.data?.msg || 'unknown error'}`)
    const reply = replyResult.data?.post?.replies?.at(-1)
    assert(reply?.id, 'offline hall reply id missing')

    offlineHallReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineHallReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline hall replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineHallReplaySocket, 'notification.created', payload =>
      payload.category === 'hall'
        && payload.action === 'post_reply'
        && payload.post?.id === postId
        && payload.post?.title === postTitle
        && payload.reply?.id === reply.id
        && payload.reply?.author_username === owner.username
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed hall notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed hall notification missing replayed marker')

    const ackOffset = offlineHallReplaySocket.messages.length
    offlineHallReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineHallReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineHallReplaySocket.close()
    offlineHallReplaySocket = null
    await wait(200)

    offlineHallReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineHallReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineHallReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'hall'
        && payload.post?.id === postId
        && payload.reply?.id === reply.id
    )
    offlineHallReplayReconnectSocket.close()
    offlineHallReplayReconnectSocket = null
  })

  await runCheck('offline hall official announcement notification event is replayed and acknowledged after reconnect', async () => {
    const offlineTarget = await bootstrapSession('smkrt_h')
    const postTitle = `离线官方公告 ${createSmokeSeed()}`
    const result = await fetchSessionJson(owner, '/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': smokeAdminToken,
      },
      body: JSON.stringify({
        title: postTitle,
        content: 'This queued official announcement should notify the offline hall reader.',
        type: 'discussion',
        is_official: true,
        official_template_type: 'event_announcement',
      }),
    })
    assert(result.response.ok, `offline hall official announcement returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const postId = String(result.data?.post?.id || '')
    assert(postId, 'offline hall official announcement post id missing')

    offlineHallReplaySocket = await openRealtimeSocket(offlineTarget)
    const ready = await expectMessage(offlineHallReplaySocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) >= 1
    )
    assert(Number(ready.payload?.pending_notification_count) >= 1, 'offline hall announcement replay ready did not report pending notifications')
    const queuedMessage = await expectMessage(offlineHallReplaySocket, 'notification.created', payload =>
      payload.category === 'hall'
        && payload.action === 'official_announcement'
        && payload.post?.id === postId
        && payload.post?.title === postTitle
        && payload.post?.is_official === true
        && payload.post?.official_template_type === 'event_announcement'
    )
    const queuedEventId = String(queuedMessage.queued_event_id || '')
    assert(queuedEventId, 'replayed hall official announcement notification missing queued_event_id')
    assert(queuedMessage.replayed === true, 'replayed hall official announcement notification missing replayed marker')

    const ackOffset = offlineHallReplaySocket.messages.length
    offlineHallReplaySocket.send('notification.ack', { id: queuedEventId })
    await expectMessageAfter(offlineHallReplaySocket, ackOffset, 'notification.ack', payload =>
      Array.isArray(payload.acked_ids)
        && payload.acked_ids.includes(queuedEventId)
        && Number(payload.pending_count) === 0
    )

    offlineHallReplaySocket.close()
    offlineHallReplaySocket = null
    await wait(200)

    offlineHallReplayReconnectSocket = await openRealtimeSocket(offlineTarget)
    await expectMessage(offlineHallReplayReconnectSocket, 'realtime.ready', payload =>
      payload.username === offlineTarget.username && Number(payload.pending_notification_count) === 0
    )
    await expectNoMessageAfter(offlineHallReplayReconnectSocket, 0, 'notification.created', payload =>
      payload.category === 'hall'
        && payload.action === 'official_announcement'
        && payload.post?.id === postId
    )
    offlineHallReplayReconnectSocket.close()
    offlineHallReplayReconnectSocket = null
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
      body: JSON.stringify({ target_save_id: friend.identity.save_id }),
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

  await runCheck('admin realtime exposes persisted activity room subscription snapshot', async () => {
    const result = await fetchAdminJson('/api/admin/taoyuan/realtime')
    assert(result.response.ok, `admin realtime room subscription returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const realtime = result.data?.realtime
    assert(realtime?.room_subscription_status === 'ok', 'admin realtime room subscription status should be ok after room events')
    assert(realtime?.room_subscription_file_exists === true, 'admin realtime room subscription file should exist after room events')
    assert(Number(realtime?.room_subscription_limits?.max_room_subscription_records) >= 1, 'admin realtime room subscription limits are missing')
    assert(Array.isArray(realtime?.recent_room_subscriptions), 'admin realtime recent room subscriptions should be an array')
    const subscription = realtime.recent_room_subscriptions.find(entry => entry?.domain === 'expedition' && entry?.room_id === expeditionRoomId)
    assert(subscription?.last_action === 'join', 'admin realtime room subscription did not persist latest room action')
    assert(subscription?.subscribers?.includes(owner.username), 'admin realtime room subscription missing owner subscriber')
    assert(subscription?.subscribers?.includes(friend.username), 'admin realtime room subscription missing friend subscriber')
    assert(Number(subscription?.member_count) >= 2, 'admin realtime room subscription member count missing')
    assert(subscription.room === undefined && subscription.payload === undefined, 'admin realtime room subscription should not expose full room payload')
  })

  await runCheck('presence offline is delivered after disconnect', async () => {
    friendSocket.close()
    await expectMessage(ownerSocket, 'presence.offline', payload =>
      payload.username === friend.username && payload.save_id === friend.identity.save_id
    )
  })

  await runCheck('admin realtime persists offline presence after disconnect', async () => {
    const result = await fetchAdminJson('/api/admin/taoyuan/realtime')
    assert(result.response.ok, `admin realtime after disconnect returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    const realtime = result.data?.realtime
    const friendPresence = realtime?.recent_presence?.find(entry => entry?.username === friend.username && entry?.save_id === String(friend.identity.save_id))
    assert(friendPresence?.status === 'offline', 'admin realtime did not persist friend offline presence')
    assert(Number(friendPresence?.last_offline_at) >= Number(friendPresence?.connected_at), 'admin realtime offline presence is missing last_offline_at')
    assert(Number(realtime?.presence_status_counts?.offline) >= 1, 'admin realtime offline status count missing')
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
  offlineMailReplaySocket?.close()
  offlineMailReplayReconnectSocket?.close()
  offlineHallReplaySocket?.close()
  offlineHallReplayReconnectSocket?.close()
  offlineManorReplaySocket?.close()
  offlineManorReplayReconnectSocket?.close()
  societyMembershipRejectSocket?.close()
  offlineSocietyReplaySocket?.close()
  offlineSocietyReplayReconnectSocket?.close()
  offlineCoopOrderReplaySocket?.close()
  offlineCoopOrderReplayReconnectSocket?.close()
  await stopChild(serverProcess)
  try {
    await rm(smokeTempDir, { recursive: true, force: true })
  } catch {}
  process.exit(process.exitCode ?? 0)
}
