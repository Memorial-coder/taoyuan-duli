import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')

const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-activity-room-idempotency-${process.pid}`)
const storageFile = path.join(tempDir, '.storage.json')
const activityRoomFile = path.join(tempDir, 'taoyuan_activity_rooms.json')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_ACTIVITY_ROOM_IDEMPOTENCY_PORT || 4032)

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''
process.env.SECRET_KEY = process.env.SECRET_KEY || 'qa_activity_room_secret_key_0605'
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'qa_activity_room_admin_token_0605'

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const {
  encryptTaoyuanData,
} = require('../src/taoyuanSaveRuntime')

const canListenOnPort = targetPort =>
  new Promise(resolve => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ host, port: targetPort }, () => {
      server.close(() => resolve(true))
    })
  })

const findAvailablePort = async (startPort, attempts = 20) => {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    if (await canListenOnPort(port)) return port
  }
  return startPort
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const port = await findAvailablePort(preferredPort)
const baseURL = `http://${host}:${port}`

const startServer = () => {
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_STORAGE: storageFile,
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

const waitForServer = async () => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 120_000) {
    try {
      const response = await fetch(`${baseURL}/api/public-config`)
      if (response.ok) return
    } catch {}
    await wait(500)
  }
  throw new Error(`Timed out waiting for server at ${baseURL}`)
}

const parseCookieHeader = header => {
  const cookies = new Map()
  if (!header) return cookies
  for (const part of String(header).split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name && rest.length) cookies.set(name, rest.join('='))
  }
  return cookies
}

const serializeCookieHeader = cookies => Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ')

const updateCookie = (session, response) => {
  const rawSetCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean)
  if (!rawSetCookie.length) return
  const cookies = parseCookieHeader(session.cookie)
  for (const item of rawSetCookie) {
    const cookiePair = String(item).split(';', 1)[0]
    const separatorIndex = cookiePair.indexOf('=')
    if (separatorIndex < 0) continue
    const name = cookiePair.slice(0, separatorIndex).trim()
    const value = cookiePair.slice(separatorIndex + 1).trim()
    if (!name) continue
    if (value) cookies.set(name, value)
    else cookies.delete(name)
  }
  session.cookie = serializeCookieHeader(cookies)
}

const fetchSessionJson = async (session, pathname, init = {}) => {
  const headers = new Headers(init.headers || {})
  if (session.cookie) headers.set('Cookie', session.cookie)
  if (session.csrfToken) headers.set('X-CSRF-Token', session.csrfToken)
  const response = await fetch(`${baseURL}${pathname}`, {
    ...init,
    headers,
  })
  updateCookie(session, response)
  let data = null
  try {
    data = await response.json()
  } catch {}
  return { response, data }
}

const postJson = async (session, pathname, body = {}) => fetchSessionJson(session, pathname, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const postSigned = async (session, pathname) => fetchSessionJson(session, pathname, { method: 'POST' })

const registerSession = async username => {
  const session = { username, cookie: '', csrfToken: '' }
  const result = await postJson(session, '/api/register', {
    username,
    password: 'qa_password_0605',
    display_name: username,
  })
  assert.equal(result.response.ok, true, `${username} should register: ${result.data?.msg || result.response.status}`)
  session.csrfToken = result.data?.csrf_token || ''
  assert.ok(session.csrfToken, 'register should return csrf token')
  return session
}

const buildRaw = (playerName, money) => encryptTaoyuanData({
  player: {
    playerName,
    money,
  },
  game: {
    year: 1,
    season: 'spring',
    day: 1,
  },
  inventory: {
    items: [],
    tempItems: [],
    capacity: 24,
  },
})

const seedSave = async (session, money) => {
  const result = await postJson(session, '/api/taoyuan/save/0', {
    raw: buildRaw(session.username, money),
    base_revision: 0,
  })
  assert.equal(result.response.ok, true, `${session.username} save should write: ${result.data?.msg || result.response.status}`)
  assert.equal(result.data?.ok, true, 'save write payload should be ok')
}

const bootstrapSession = async (username, money = 500) => {
  const session = await registerSession(username)
  await seedSave(session, money)
  return session
}

const roomBasePath = domain => `/api/taoyuan/online/${domain}/rooms`

const roomCreatePayload = (domain, title) => domain === 'expedition'
  ? {
      template_id: 'expedition_outpost',
      gameplay_template_id: 'expedition_roles',
      title,
    }
  : {
      template_id: 'dragon_boat',
      gameplay_template_id: 'squad_coop',
      title,
    }

const runRoomToRunning = async ({ domain, hostSession, memberSession, title }) => {
  const basePath = roomBasePath(domain)
  const create = await postJson(hostSession, basePath, roomCreatePayload(domain, title))
  assert.equal(create.response.ok, true, `${domain} room create should succeed: ${create.data?.msg || create.response.status}`)
  const roomId = String(create.data?.room?.id || '')
  assert.ok(roomId, `${domain} room id should be returned`)

  const invite = await postJson(hostSession, `${basePath}/${encodeURIComponent(roomId)}/invite`, {
    target_username: memberSession.username,
  })
  assert.equal(invite.response.ok, true, `${domain} room invite should succeed: ${invite.data?.msg || invite.response.status}`)

  const join = await postSigned(memberSession, `${basePath}/${encodeURIComponent(roomId)}/join`)
  assert.equal(join.response.ok, true, `${domain} room join should succeed: ${join.data?.msg || join.response.status}`)

  const readyCheck = await postSigned(hostSession, `${basePath}/${encodeURIComponent(roomId)}/ready-check`)
  assert.equal(readyCheck.response.ok, true, `${domain} room ready-check should succeed: ${readyCheck.data?.msg || readyCheck.response.status}`)

  const hostReady = await postSigned(hostSession, `${basePath}/${encodeURIComponent(roomId)}/ready`)
  assert.equal(hostReady.response.ok, true, `${domain} room host ready should succeed: ${hostReady.data?.msg || hostReady.response.status}`)

  const memberReady = await postSigned(memberSession, `${basePath}/${encodeURIComponent(roomId)}/ready`)
  assert.equal(memberReady.response.ok, true, `${domain} room member ready should succeed: ${memberReady.data?.msg || memberReady.response.status}`)

  const start = await postSigned(hostSession, `${basePath}/${encodeURIComponent(roomId)}/start`)
  assert.equal(start.response.ok, true, `${domain} room countdown should start: ${start.data?.msg || start.response.status}`)

  await wait(6500)
  const overview = await fetchSessionJson(hostSession, basePath)
  assert.equal(overview.response.ok, true, `${domain} room running overview should succeed`)
  assert.equal(String(overview.data?.my_room?.id || ''), roomId, `${domain} host should still have room`)
  assert.equal(String(overview.data?.my_room?.state || ''), 'running', `${domain} room should materialize running`)
  return roomId
}

const expireDisconnectedMember = async (roomId, username) => {
  const raw = await readFile(activityRoomFile, 'utf8')
  const store = JSON.parse(raw)
  const room = (store.rooms || []).find(entry => String(entry?.id || '') === roomId)
  assert.ok(room, `room ${roomId} should exist in activity room file`)
  const member = (room.members || []).find(entry => String(entry?.username || '') === username)
  assert.ok(member, `room ${roomId} should contain member ${username}`)
  assert.equal(member.status, 'disconnected', 'member should be disconnected before expiring reconnect window')
  const windowSeconds = Math.max(10, Math.floor(Number(room.reconnect_window_seconds) || 90))
  member.disconnected_at = Math.floor(Date.now() / 1000) - windowSeconds - 5
  await writeFile(activityRoomFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
}

const assertReconnectTimeoutMaterializes = async domain => {
  const seed = String(process.pid).slice(-5)
  const prefix = domain === 'expedition' ? 'are' : 'arf'
  const hostSession = await bootstrapSession(`${prefix}h${seed}`)
  const memberSession = await bootstrapSession(`${prefix}m${seed}`)
  const basePath = roomBasePath(domain)
  const roomId = await runRoomToRunning({
    domain,
    hostSession,
    memberSession,
    title: `qa ${domain} reconnect ${Date.now()}`,
  })

  const disconnect = await postSigned(memberSession, `${basePath}/${encodeURIComponent(roomId)}/disconnect`)
  assert.equal(disconnect.response.ok, true, `${domain} room disconnect should succeed: ${disconnect.data?.msg || disconnect.response.status}`)
  assert.equal(String(disconnect.data?.room?.state || ''), 'paused', `${domain} room should pause on disconnect`)

  await expireDisconnectedMember(roomId, memberSession.username)

  const overview = await fetchSessionJson(memberSession, basePath)
  assert.equal(overview.response.ok, true, `${domain} timeout overview should succeed`)
  const visibleRoom = (overview.data?.visible_rooms || []).find(entry => String(entry?.id || '') === roomId)
  assert.ok(visibleRoom, `${domain} timed-out room should remain visible for refresh context`)
  const memberSnapshot = (visibleRoom.members || []).find(entry => entry?.username === memberSession.username)
  assert.equal(memberSnapshot?.status, 'timeout', `${domain} disconnected member should materialize as timeout`)
  assert.equal(visibleRoom.can_reconnect, false, `${domain} timed-out member should not be able to reconnect`)
  assert.notEqual(String(overview.data?.my_room?.id || ''), roomId, `${domain} timed-out room should release my_room occupancy`)

  const reconnect = await postSigned(memberSession, `${basePath}/${encodeURIComponent(roomId)}/reconnect`)
  assert.equal(reconnect.response.status, 409, `${domain} timed-out reconnect should return 409`)
  assert.equal(reconnect.data?.code, 'TAOYUAN_ACTIVITY_ROOM_RECONNECT_EXPIRED', `${domain} reconnect timeout should expose structured code`)

  const newRoom = await postJson(memberSession, basePath, roomCreatePayload(domain, `qa ${domain} after timeout ${Date.now()}`))
  assert.equal(newRoom.response.ok, true, `${domain} member should be able to create a new room after timeout: ${newRoom.data?.msg || newRoom.response.status}`)
  assert.ok(newRoom.data?.room?.id, `${domain} replacement room id should be returned`)
}

const findContribution = (room, username) => (room?.gameplay?.contributions || []).find(entry => entry?.username === username) || null

const assertExpeditionActionIdempotency = async () => {
  const seed = String(process.pid).slice(-5)
  const hostSession = await bootstrapSession(`arah${seed}`)
  const memberSession = await bootstrapSession(`aram${seed}`)
  const basePath = roomBasePath('expedition')
  const roomId = await runRoomToRunning({
    domain: 'expedition',
    hostSession,
    memberSession,
    title: `qa expedition action ${Date.now()}`,
  })

  const missingKey = await postJson(hostSession, `${basePath}/${encodeURIComponent(roomId)}/action`, {
    action_id: 'assign_scout',
  })
  assert.equal(missingKey.response.status, 400, 'room action without idempotency key should be rejected')
  assert.equal(missingKey.data?.code, 'TAOYUAN_ACTIVITY_ROOM_ACTION_IDEMPOTENCY_REQUIRED', 'missing idempotency key should expose structured code')

  const key = `qa-room-action-${roomId}-${hostSession.username}-assign-scout`
  const first = await postJson(hostSession, `${basePath}/${encodeURIComponent(roomId)}/action`, {
    action_id: 'assign_scout',
    idempotency_key: key,
  })
  assert.equal(first.response.ok, true, `first room action should succeed: ${first.data?.msg || first.response.status}`)
  assert.equal(first.data?.idempotency_replayed, false, 'first room action should not be replay')
  assert.equal(first.data?.action_receipt?.idempotency_key, key, 'first room action should return action receipt')
  const firstContribution = findContribution(first.data?.room, hostSession.username)
  assert.equal(Number(firstContribution?.action_count || 0), 1, 'first room action should count once')
  assert.equal(Number(firstContribution?.progress_value || 0), 1, 'first room action should advance host progress once')
  assert.equal(Number(first.data?.room?.gameplay?.progress_value || 0), 1, 'first room action should advance room progress once')

  const replay = await postJson(hostSession, `${basePath}/${encodeURIComponent(roomId)}/action`, {
    action_id: 'assign_scout',
    idempotency_key: key,
  })
  assert.equal(replay.response.ok, true, `replayed room action should succeed: ${replay.data?.msg || replay.response.status}`)
  assert.equal(replay.data?.idempotency_replayed, true, 'same key should be replayed')
  const replayContribution = findContribution(replay.data?.room, hostSession.username)
  assert.equal(Number(replayContribution?.action_count || 0), 1, 'replayed room action should not increment action_count')
  assert.equal(Number(replayContribution?.progress_value || 0), 1, 'replayed room action should not increment progress')
  assert.equal(Number(replay.data?.room?.gameplay?.progress_value || 0), 1, 'replayed room action should not increment room progress')

  const conflict = await postJson(hostSession, `${basePath}/${encodeURIComponent(roomId)}/action`, {
    action_id: 'mark_route',
    idempotency_key: key,
  })
  assert.equal(conflict.response.status, 409, 'same idempotency key with different action should conflict')
  assert.equal(conflict.data?.code, 'TAOYUAN_ACTIVITY_ROOM_ACTION_IDEMPOTENCY_CONFLICT', 'idempotency conflict should expose structured code')

  const settle = await postSigned(hostSession, `${basePath}/${encodeURIComponent(roomId)}/settle`)
  assert.equal(settle.response.ok, true, `expedition room settle should succeed: ${settle.data?.msg || settle.response.status}`)
  const hostReceipt = (settle.data?.room?.settlement_receipts || []).find(entry => entry?.target_username === hostSession.username)
  assert.ok(hostReceipt, 'host settlement receipt should exist')
  assert.equal(Number(hostReceipt?.reward_payload?.money || 0), 89, 'host cooperation bonus should be based on one action, not replayed duplicates')
}

let serverProcess = null
try {
  serverProcess = startServer()
  await waitForServer()

  await assertReconnectTimeoutMaterializes('festival')
  await assertReconnectTimeoutMaterializes('expedition')
  await assertExpeditionActionIdempotency()

  console.log('qa:activity-room-reconnect-idempotency passed')
} finally {
  if (serverProcess) {
    serverProcess.kill()
    await Promise.race([
      new Promise(resolve => serverProcess.once('exit', resolve)),
      wait(3000),
    ])
  }
  await rm(tempDir, { recursive: true, force: true })
}
