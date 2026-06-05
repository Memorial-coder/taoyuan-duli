import { spawn } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
const serverRoot = path.resolve(__dirname, '..')
const smokeTempDir = path.resolve(serverRoot, '.tmp-online-smoke-run')
const smokeStorageFile = path.resolve(smokeTempDir, '.storage.json')
const smokeSocietyStoreFile = path.resolve(smokeTempDir, 'taoyuan_societies.json')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_ONLINE_SMOKE_PORT || 4013)
const configuredBaseURL = process.env.TAOYUAN_ONLINE_SMOKE_BASE_URL?.trim() || ''

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true })
if (!configuredBaseURL) {
  process.env.DB_STORAGE = smokeStorageFile
  process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
  process.env.MYSQL_HOST = ''
  process.env.MYSQL_USER = ''
  process.env.MYSQL_DATABASE = ''
  await rm(smokeTempDir, { recursive: true, force: true })
}
const { decryptTaoyuanRaw, encryptTaoyuanData, loadUserSaveSlots, saveUserSaveSlots } = require('../src/taoyuanSaveRuntime')
const db = require('../src/db')

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

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const isServerReachable = async url => {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

const waitForServer = async (url, timeoutMs = 120_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(url)) return
    await wait(1000)
  }
  throw new Error(`Timed out waiting for server at ${url}`)
}

const port = configuredBaseURL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = configuredBaseURL || `http://${host}:${port}`

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

const checks = []
const cloneJson = value => JSON.parse(JSON.stringify(value))
const tinyPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0WQAAAAASUVORK5CYII='
const createSessionState = () => ({
  cookie: '',
  csrfToken: '',
  username: '',
  displayName: '',
})

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const assertRejectedResponse = (response, data, label, expectedStatus = 400) => {
  assert(response.status === expectedStatus, `${label} should return ${expectedStatus}, received ${response.status}`)
  assert(data?.ok === false, `${label} should return ok=false`)
  assert(typeof data?.msg === 'string' && data.msg, `${label} should expose a rejection message`)
}

const fetchJson = async (pathname, init) => {
  const response = await fetch(`${baseURL}${pathname}`, init)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { response, data }
}

const sessionState = createSessionState()
const secondarySessionState = createSessionState()
const tertiarySessionState = createSessionState()
const quaternarySessionState = createSessionState()
const blockRelationSessionState = createSessionState()
const governanceSessionState = createSessionState()
const imageBlacklistSessionState = createSessionState()
const l81MemberAState = createSessionState()
const l81MemberBState = createSessionState()
const l81MemberCState = createSessionState()
const adminToken = String(process.env.ADMIN_TOKEN || '').trim()
let originalOnlineReleaseConfig = null

const parseCookieHeader = cookie => String(cookie || '')
  .split(';')
  .map(part => part.trim())
  .filter(Boolean)
  .reduce((cookies, part) => {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0) return cookies
    const name = part.slice(0, separatorIndex).trim()
    if (!name) return cookies
    cookies.set(name, part.slice(separatorIndex + 1).trim())
    return cookies
  }, new Map())

const serializeCookieHeader = cookies => Array.from(cookies.entries())
  .map(([name, value]) => `${name}=${value}`)
  .join('; ')

const updateCookie = (session, response) => {
  const rawSetCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []
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
  if (session.cookie) {
    headers.set('Cookie', session.cookie)
  }
  if (session.csrfToken) {
    headers.set('X-CSRF-Token', session.csrfToken)
  }
  const response = await fetch(`${baseURL}${pathname}`, {
    ...init,
    headers,
  })
  updateCookie(session, response)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { response, data }
}

const fetchAuthedJson = async (pathname, init = {}) => fetchSessionJson(sessionState, pathname, init)
const fetchAdminJson = async (pathname, init = {}) => {
  assert(adminToken, `ADMIN_TOKEN is required for ${pathname}`)
  const headers = new Headers(init.headers || {})
  headers.set('X-Admin-Token', adminToken)
  return fetchAuthedJson(pathname, {
    ...init,
    headers,
  })
}
const getInventoryItemQuantity = (decryptedSave, itemId) => (decryptedSave?.inventory?.items || [])
  .filter(entry => entry?.itemId === itemId)
  .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
const getRewardTicketQuantity = (decryptedSave, ticketType) => Math.max(0, Math.floor(Number(decryptedSave?.wallet?.rewardTickets?.[ticketType]) || 0))
const getRewardItemQuantity = (decryptedSave, itemId) => ([...(Array.isArray(decryptedSave?.items) ? decryptedSave.items : []), ...(Array.isArray(decryptedSave?.tempItems) ? decryptedSave.tempItems : [])])
  .filter(entry => entry?.itemId === itemId)
  .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
const getEmbeddedSaveIdentity = decryptedSave => decryptedSave?.meta?.onlineIdentity || decryptedSave?.onlineIdentity || null

const buildSeedSavePayload = (username, startingMoney) => encryptTaoyuanData({
  player: {
    money: startingMoney,
    name: username,
  },
  inventory: {
    items: [
      { itemId: 'wood', quantity: 6, quality: 'normal', locked: false },
      { itemId: 'parsnip_seed', quantity: 4, quality: 'normal', locked: false },
      { itemId: 'wintersweet', quantity: 3, quality: 'normal', locked: false },
      { itemId: 'rice', quantity: 9, quality: 'normal', locked: false },
      { itemId: 'cabbage', quantity: 2, quality: 'normal', locked: false },
      { itemId: 'herb', quantity: 2, quality: 'normal', locked: false },
      { itemId: 'cloth', quantity: 2, quality: 'normal', locked: false },
      { itemId: 'crucian', quantity: 2, quality: 'normal', locked: false },
    ],
    tempItems: [],
    ownedWeapons: [],
    ownedRings: [],
    ownedHats: [],
    ownedShoes: [],
    capacity: 24,
  },
})

const runCheck = async (label, runner) => {
  await runner()
  checks.push(label)
}

const unsafeSmokeUsernameFragments = ['vx']
const createSmokeSeed = () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const seed = Math.random().toString(36).slice(2, 8)
    if (!unsafeSmokeUsernameFragments.some(fragment => seed.includes(fragment))) return seed
  }
  return Date.now().toString(36).slice(-6).replace(/vx/g, 'vw')
}

const seedSessionSave = async (session, startingMoney) => {
  assert(session.username, 'session username is required before provisioning a save')
  const rawSavePayload = buildSeedSavePayload(session.username, startingMoney)
  const { response: saveResponse, data: saveData } = await fetchSessionJson(session, '/api/taoyuan/save/0', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawSavePayload,
      revision: 1,
    }),
  })
  assert(saveResponse.ok, `save write returned ${saveResponse.status}`)
  assert(saveData?.ok === true && saveData?.slot === 0, 'save write payload is incomplete')
  assert(typeof saveData?.raw === 'string' && saveData.raw, 'save write payload did not return authoritative raw save')
  const writebackSave = decryptTaoyuanRaw(saveData.raw)
  const writebackIdentity = getEmbeddedSaveIdentity(writebackSave)
  assert(writebackIdentity?.save_id, 'save write response did not include embedded save identity')
  assert(writebackIdentity.account_username === session.username, 'save write response identity account mismatch')
  assert(writebackIdentity.save_slot === 0, 'save write response identity slot mismatch')

  const { response: activeSlotResponse, data: activeSlotData } = await fetchSessionJson(session, '/api/taoyuan/save/active-slot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slot: 0 }),
  })
  assert(activeSlotResponse.ok, `active-slot write returned ${activeSlotResponse.status}`)
  assert(activeSlotData?.ok === true && activeSlotData?.slot === 0, 'active-slot payload is incomplete')
}

const bootstrapSession = async (session, labelPrefix, startingMoney) => {
  const uniqueSeed = createSmokeSeed()
  session.username = `${labelPrefix}_${uniqueSeed}`
  session.displayName = `${labelPrefix}${uniqueSeed}`
  const password = `SmokePass_${uniqueSeed}`
  const { response: registerResponse, data: registerData } = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: session.username,
      password,
      display_name: session.displayName,
    }),
  })
  assert(registerResponse.ok, `register returned ${registerResponse.status}: ${registerData?.msg || 'unknown error'}`)
  assert(registerData?.ok === true, 'register did not return ok=true')
  assert(typeof registerData?.csrf_token === 'string' && registerData.csrf_token, 'register did not return csrf_token')
  session.csrfToken = registerData.csrf_token

  const { response: meResponse, data: meData } = await fetchSessionJson(session, '/api/me')
  assert(meResponse.ok, `/api/me after register returned ${meResponse.status}`)
  assert(meData?.ok === true, '/api/me after register did not return ok=true')
  assert(meData?.user?.username === session.username, 'session username does not match registered user')
  assert(typeof meData?.csrf_token === 'string' && meData.csrf_token, '/api/me did not return csrf_token')
  session.csrfToken = meData.csrf_token
  await seedSessionSave(session, startingMoney)
}

const bootstrapAuthOnlySession = async (session, labelPrefix) => {
  const uniqueSeed = createSmokeSeed()
  session.username = `${labelPrefix}_${uniqueSeed}`
  session.displayName = `${labelPrefix}${uniqueSeed}`
  const password = `SmokePass_${uniqueSeed}`
  const { response: registerResponse, data: registerData } = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: session.username,
      password,
      display_name: session.displayName,
    }),
  })
  assert(registerResponse.ok, `register returned ${registerResponse.status}: ${registerData?.msg || 'unknown error'}`)
  assert(registerData?.ok === true, 'register did not return ok=true')
  assert(typeof registerData?.csrf_token === 'string' && registerData.csrf_token, 'register did not return csrf_token')
  session.csrfToken = registerData.csrf_token

  const { response: meResponse, data: meData } = await fetchSessionJson(session, '/api/me')
  assert(meResponse.ok, `/api/me after register returned ${meResponse.status}`)
  assert(meData?.ok === true, '/api/me after register did not return ok=true')
  assert(meData?.user?.username === session.username, 'session username does not match registered user')
  assert(typeof meData?.csrf_token === 'string' && meData.csrf_token, '/api/me did not return csrf_token')
  session.csrfToken = meData.csrf_token
}

let serverProcess = null
const stopServer = async () => {
  if (!serverProcess || serverProcess.killed) return
  const child = serverProcess
  await new Promise(resolve => {
    child.once('exit', () => resolve())
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
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

const cleanupSmokeArtifacts = async () => {
  if (configuredBaseURL) return
  try {
    await rm(smokeTempDir, { recursive: true, force: true })
  } catch {}
}

const cleanupSmokeUsers = async () => {
  const usernames = [
    sessionState.username,
    secondarySessionState.username,
    tertiarySessionState.username,
    quaternarySessionState.username,
    blockRelationSessionState.username,
    governanceSessionState.username,
    imageBlacklistSessionState.username,
    l81MemberAState.username,
    l81MemberBState.username,
    l81MemberCState.username,
  ].filter(username => /^smk/i.test(String(username || '').trim()))

  const deletedUsernames = []
  if (!usernames.length) return

  if (configuredBaseURL) {
    const adminToken = String(process.env.ADMIN_TOKEN || '').trim()
    if (!adminToken) return
    for (const username of usernames) {
      try {
        await fetch(`${baseURL}/api/admin/users/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: {
            'X-Admin-Token': adminToken,
          },
        })
        deletedUsernames.push(username)
      } catch {}
    }
    return deletedUsernames
  }

  for (const username of usernames) {
    try {
      await db.setUserStatus(username, 'deleted')
      deletedUsernames.push(username)
    } catch {}
  }
  return deletedUsernames
}

try {
  if (!configuredBaseURL) {
    serverProcess = startServer()
  }
  await waitForServer(`${baseURL}/api/health`)

  await runCheck('GET /api/health', async () => {
    const { response, data } = await fetchJson('/api/health')
    assert(response.ok, 'health endpoint did not return 200')
    assert(data?.ok === true, 'health payload did not return ok=true')
  })

  await runCheck('GET /api/public-config', async () => {
    const { response, data } = await fetchJson('/api/public-config')
    assert(response.ok, 'public-config endpoint did not return 200')
    assert(data?.ok === true, 'public-config payload did not return ok=true')
    assert(data?.officialManagedStatus && typeof data.officialManagedStatus === 'object', 'public-config missing officialManagedStatus')
    assert(Array.isArray(data?.readonlyManagedFields), 'public-config missing readonlyManagedFields array')
    assert(data?.taoyuan_online_release && typeof data.taoyuan_online_release === 'object', 'public-config missing taoyuan_online_release payload')
    assert(typeof data.taoyuan_online_release.enabled === 'boolean', 'public-config missing online release enabled flag')
    assert(typeof data.taoyuan_online_release.gray_channel === 'string', 'public-config missing online release gray channel')
  })

  await runCheck('GET /api/admin/taoyuan/online-release-config read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/online-release-config')
    assert(response.ok, `online release config read returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.config, 'online release config payload is incomplete')
    originalOnlineReleaseConfig = cloneJson(data.config)
  })

  await runCheck('POST /api/admin/taoyuan/online-release-config write path', async () => {
    assert(originalOnlineReleaseConfig, 'online release config snapshot missing before write test')
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/online-release-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(originalOnlineReleaseConfig),
    })
    assert(response.ok, `online release config write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.config, 'online release config write payload is incomplete')
    assert(String(data.config.grayChannel || '') === String(originalOnlineReleaseConfig.grayChannel || ''), 'online release config write did not preserve gray channel')
  })

  await runCheck('GET /api/taoyuan/ai/config', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/ai/config')
    assert(response.ok, 'AI public config endpoint did not return 200')
    assert(data?.ok === true && data?.config, 'AI public config payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/hall/posts', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/hall/posts?page=1&page_size=1')
    assert(response.ok, 'hall posts endpoint did not return 200')
    assert(data?.ok === true && Array.isArray(data?.posts), 'hall posts payload is incomplete')
  })

  await runCheck('GET /api/me unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/me')
    assert(response.status === 401, `expected 401 from /api/me, received ${response.status}`)
    assert(data?.ok === false, 'unauth /api/me should return ok=false')
  })

  await runCheck('GET /api/taoyuan/save/list unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/save/list')
    assert(response.status === 401, `expected 401 from /api/taoyuan/save/list, received ${response.status}`)
    assert(data?.ok === false, 'unauth save/list should return ok=false')
  })

  await runCheck('GET /api/taoyuan/mail/list unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/mail/list')
    assert(response.status === 401, `expected 401 from /api/taoyuan/mail/list, received ${response.status}`)
    assert(data?.ok === false, 'unauth mail/list should return ok=false')
  })

  await runCheck('POST /api/taoyuan/hall/posts unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'smoke',
        content: 'smoke',
      }),
    })
    assert(response.status === 401, `expected 401 from unauth hall post create, received ${response.status}`)
    assert(data?.ok === false, 'unauth hall post create should return ok=false')
  })

  await runCheck('POST /api/register moderation reject path', async () => {
    const bannedUsername = `台独${Math.random().toString(36).slice(2, 4)}`
    const bannedDisplayUsername = `smkban${createSmokeSeed()}`
    const rejectedUsername = await fetchJson('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: bannedUsername,
        password: 'SmokePass_register',
        display_name: '正常昵称',
      }),
    })
    assertRejectedResponse(rejectedUsername.response, rejectedUsername.data, 'register moderation username')

    const rejectedDisplayName = await fetchJson('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: bannedDisplayUsername,
        password: 'SmokePass_display',
        display_name: '傻逼昵称',
      }),
    })
    assertRejectedResponse(rejectedDisplayName.response, rejectedDisplayName.data, 'register moderation display_name')
  })

  await runCheck('register + session bootstrap', async () => {
    await bootstrapSession(sessionState, 'smk', 1200)
  })

  await runCheck('GET /api/me login state', async () => {
    const { response, data } = await fetchAuthedJson('/api/me')
    assert(response.ok, `/api/me after register returned ${response.status}`)
    assert(data?.ok === true, '/api/me after register did not return ok=true')
    assert(data?.user?.username === sessionState.username, 'session username does not match registered user')
    assert(typeof data?.csrf_token === 'string' && data.csrf_token, '/api/me did not return csrf_token')
    sessionState.csrfToken = data.csrf_token
  })

  await runCheck('POST /api/taoyuan/save/:slot write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save readback returned ${response.status}`)
    assert(data?.ok === true && data?.slot === 0, 'save write payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/save/active-slot write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/slots')
    assert(response.ok, `save slots returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.slots), 'active-slot verification payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/save/slots read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/slots')
    assert(response.ok, `save slots returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.slots), 'save slots payload is incomplete')
    assert(data.slots.some(item => item?.slot === 0 && typeof item?.raw === 'string' && item.raw), 'slot 0 was not persisted')
  })

  let primarySaveIdentity = null
  await runCheck('GET /api/taoyuan/save/:slot save identity backfill', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save identity readback returned ${response.status}`)
    const decrypted = decryptTaoyuanRaw(data?.raw || '')
    const identity = getEmbeddedSaveIdentity(decrypted)
    assert(identity && Number.isInteger(Number(identity.save_id)), 'save identity was not embedded into save payload')
    assert(Number(identity.save_id) >= 100000000 && Number(identity.save_id) < 1000000000, 'save identity is not a fixed public numeric id')
    assert(identity.account_username === sessionState.username, 'save identity account username mismatch')
    assert(identity.save_slot === 0, 'save identity slot mismatch')
    primarySaveIdentity = identity
  })

  await runCheck('POST /api/taoyuan/save/:slot save identity immutable on overwrite', async () => {
    assert(primarySaveIdentity?.save_id, 'save identity backfill did not complete before immutability check')
    const beforeRead = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(beforeRead.response.ok, `save identity pre-overwrite readback returned ${beforeRead.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeRead.data?.raw || '')
    assert(beforeDecrypted && typeof beforeDecrypted === 'object', 'save identity pre-overwrite payload could not be decrypted')
    const tamperedSaveId = primarySaveIdentity.save_id === 999999999 ? 999999998 : 999999999
    if (beforeDecrypted.meta && typeof beforeDecrypted.meta === 'object') {
      beforeDecrypted.meta.onlineIdentity = {
        ...primarySaveIdentity,
        save_id: tamperedSaveId,
        account_username: `${sessionState.username}_tampered`,
        save_slot: 2,
      }
    } else {
      beforeDecrypted.onlineIdentity = {
        ...primarySaveIdentity,
        save_id: tamperedSaveId,
        account_username: `${sessionState.username}_tampered`,
        save_slot: 2,
      }
    }
    const tamperedRaw = encryptTaoyuanData(beforeDecrypted)
    const { response: saveResponse, data: saveData } = await fetchAuthedJson('/api/taoyuan/save/0', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: tamperedRaw,
        revision: 2,
      }),
    })
    assert(saveResponse.ok, `save identity overwrite returned ${saveResponse.status}: ${saveData?.msg || 'unknown error'}`)
    assert(saveData?.ok === true && saveData?.stale === false, 'save identity overwrite payload is incomplete')

    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save identity overwrite readback returned ${response.status}`)
    const decrypted = decryptTaoyuanRaw(data?.raw || '')
    const identity = getEmbeddedSaveIdentity(decrypted)
    assert(identity?.save_id === primarySaveIdentity.save_id, 'save identity changed after client overwrite')
    assert(identity?.account_username === sessionState.username, 'save identity account changed after client overwrite')
    assert(identity?.save_slot === 0, 'save identity slot changed after client overwrite')
  })

  await runCheck('GET /api/taoyuan/save/:slot opens legacy wrapped save without data loss', async () => {
    const legacyWrappedSave = {
      meta: {
        saveVersion: 1,
        savedAt: '2026-05-20T00:00:00.000Z',
      },
      savedAt: '2026-05-20T00:00:00.000Z',
      data: {
        player: {
          name: `${sessionState.username}旧档`,
          money: 3456,
        },
        inventory: {
          items: [
            { itemId: 'wood', quantity: 3, quality: 'normal', locked: false },
            { itemId: 'stone', quantity: 5, quality: 'normal', locked: true },
          ],
          tempItems: [],
          capacity: 18,
        },
        legacy_marker: {
          source: 'qa_legacy_open',
          nested: {
            keep: true,
          },
        },
      },
    }
    const legacyRaw = encryptTaoyuanData(legacyWrappedSave)
    const existingSaves = loadUserSaveSlots(sessionState.username)
    existingSaves.slots[1] = {
      raw: legacyRaw,
      revision: 7,
    }
    saveUserSaveSlots(sessionState.username, existingSaves)

    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/1')
    assert(response.ok, `legacy save read returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.slot === 1 && typeof data?.raw === 'string', 'legacy save read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const identity = getEmbeddedSaveIdentity(decrypted)
    assert(identity?.save_id, 'legacy save read did not backfill save identity')
    assert(identity.account_username === sessionState.username, 'legacy save identity account mismatch')
    assert(identity.save_slot === 1, 'legacy save identity slot mismatch')
    assert(decrypted?.data?.player?.money === 3456, 'legacy save player money was not preserved')
    assert(decrypted?.data?.inventory?.items?.some(item => item?.itemId === 'stone' && item?.quantity === 5 && item?.locked === true), 'legacy save inventory item was not preserved')
    assert(decrypted?.data?.legacy_marker?.nested?.keep === true, 'legacy save custom payload was not preserved')
    assert(decrypted?.meta?.saveVersion === 1, 'legacy save meta saveVersion was not preserved')
    assert(data.raw !== legacyRaw, 'legacy save read should persist backfilled identity')

    const slotsRead = await fetchAuthedJson('/api/taoyuan/save/slots')
    assert(slotsRead.response.ok, `legacy save slots read returned ${slotsRead.response.status}: ${slotsRead.data?.msg || 'unknown error'}`)
    const slotOne = slotsRead.data?.slots?.find(item => item?.slot === 1)
    assert(typeof slotOne?.raw === 'string' && slotOne.raw, 'legacy save slot did not remain visible in slots list')
    const slotOneDecrypted = decryptTaoyuanRaw(slotOne.raw)
    assert(slotOneDecrypted?.data?.legacy_marker?.source === 'qa_legacy_open', 'legacy save slots list lost original payload')
    assert(getEmbeddedSaveIdentity(slotOneDecrypted)?.save_id === identity.save_id, 'legacy save slots list identity mismatch')

    const activeSlot = await fetchAuthedJson('/api/taoyuan/save/active-slot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slot: 1 }),
    })
    assert(activeSlot.response.ok, `legacy save active-slot returned ${activeSlot.response.status}: ${activeSlot.data?.msg || 'unknown error'}`)
    assert(activeSlot.data?.ok === true && activeSlot.data?.slot === 1, 'legacy save active-slot payload is incomplete')

    const restoreActiveSlot = await fetchAuthedJson('/api/taoyuan/save/active-slot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slot: 0 }),
    })
    assert(restoreActiveSlot.response.ok, `legacy save active-slot restore returned ${restoreActiveSlot.response.status}: ${restoreActiveSlot.data?.msg || 'unknown error'}`)
    assert(restoreActiveSlot.data?.ok === true && restoreActiveSlot.data?.slot === 0, 'legacy save active-slot restore payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/social/player-search save id path', async () => {
    assert(primarySaveIdentity?.save_id, 'save identity backfill did not complete before search check')
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/social/player-search?save_id=${encodeURIComponent(primarySaveIdentity.save_id)}`)
    assert(response.ok, `save id player search returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.save_identity?.save_id === primarySaveIdentity.save_id, 'save id player search identity payload is incomplete')
    assert(data?.save_identity?.save_slot === 0, 'save id player search returned wrong slot')
    assert(data?.profile?.username === sessionState.username, 'save id player search returned wrong profile')
    assert(!data?.profile?.inventory && !data?.profile?.wallet, 'save id player search leaked gameplay payload')
  })

  await runCheck('GET /api/taoyuan/online/manor own snapshot', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor')
    assert(response.ok, `own manor snapshot returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.username === sessionState.username, 'own manor snapshot payload is incomplete')
    assert(Array.isArray(data?.snapshot?.theme_week?.template_options) && data.snapshot.theme_week.template_options.length >= 5, 'manor template options are incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor/:username public snapshot', async () => {
    const { response, data } = await fetchJson(`/api/taoyuan/online/manor/${encodeURIComponent(sessionState.username)}`)
    assert(response.ok, `public manor snapshot returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.username === sessionState.username, 'public manor snapshot payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor target save id snapshot', async () => {
    assert(primarySaveIdentity?.save_id, 'save identity backfill did not complete before manor save id target check')
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/manor?target_save_id=${encodeURIComponent(primarySaveIdentity.save_id)}`)
    assert(response.ok, `target save id manor snapshot returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.snapshot?.username === sessionState.username, 'target save id manor snapshot payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/manor/theme-week write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor/theme-week', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'smoke manor festival',
        season: 'spring',
        week_tag: 'smoke-spring-w1',
        template_id: 'festival',
      }),
    })
    assert(response.ok, `manor theme-week write returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.theme_week?.template_id === 'festival', 'manor theme-week write payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor theme-week readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor')
    assert(response.ok, `theme-week manor readback returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.theme_week?.template_id === 'festival', 'theme-week readback did not persist template id')
  })

  const adminToken = String(process.env.ADMIN_TOKEN || '').trim()
  let createdPostId = ''
  let hallImagePostId = ''
  await runCheck('POST /api/taoyuan/hall/posts write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `smoke hall post ${Date.now()}`,
        content: 'smoke content',
        blocks: [
          { id: 'smoke_block_1', type: 'text', text: 'smoke content' },
        ],
        type: 'discussion',
      }),
    })
    assert(response.ok, `hall post create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.id, 'hall post create payload is incomplete')
    createdPostId = String(data.post.id)
  })

  await runCheck('GET /api/taoyuan/hall/posts/:id read path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}`)
    assert(response.ok, `hall post detail returned ${response.status}`)
    assert(data?.ok === true && data?.post?.id === createdPostId, 'hall post detail payload is incomplete')
  })

  let hallImageUrl = ''
  let hallImageBlockId = ''
  await runCheck('POST /api/taoyuan/hall/upload-image image path', async () => {
    const { response, data } = await fetchSessionJson(sessionState, '/api/taoyuan/hall/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data_url: tinyPngDataUrl,
        filename: 'smoke-hall.png',
        usage: 'hall_post',
      }),
    })
    assert(response.ok, `hall upload image returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && typeof data?.url === 'string' && data.url, 'hall upload image payload is incomplete')
    hallImageUrl = String(data.url)
  })

  await runCheck('POST /api/taoyuan/hall/posts image report path', async () => {
    const imagePost = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `smoke hall image post ${Date.now()}`,
        blocks: [
          { id: 'smoke_image_text', type: 'text', text: 'smoke image content' },
          { id: 'smoke_image_block', type: 'image', url: hallImageUrl, alt: 'smoke image' },
        ],
        type: 'discussion',
      }),
    })
    assert(imagePost.response.ok, `hall image post create returned ${imagePost.response.status}: ${imagePost.data?.msg || 'unknown error'}`)
    assert(imagePost.data?.ok === true && imagePost.data?.post?.id, 'hall image post payload is incomplete')
    hallImagePostId = String(imagePost.data.post.id)
    const imageDetail = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(hallImagePostId)}`)
    assert(imageDetail.response.ok, `hall image post detail returned ${imageDetail.response.status}`)
    const imageBlock = Array.isArray(imageDetail.data?.post?.blocks)
      ? imageDetail.data.post.blocks.find(entry => entry?.type === 'image')
      : null
    assert(imageBlock && imageBlock.url === hallImageUrl, 'hall image post did not preserve image block')
    hallImageBlockId = String(imageBlock?.id || '')
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/blocks/:blockId/report-image path', async () => {
    const { response, data } = await fetchSessionJson(sessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(hallImagePostId)}/blocks/${encodeURIComponent(hallImageBlockId || 'smoke_image_block')}/report-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'smoke image report reason',
      }),
    })
    assert(response.ok, `hall image report returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.report?.id, 'hall image report payload is incomplete')
  })

  let hallImageReportId = ''
  await runCheck('GET /api/admin/taoyuan/hall/image-reports admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for hall image admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/hall/image-reports', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `hall image admin reports returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.reports) && Array.isArray(data?.assets) && Array.isArray(data?.blacklist), 'hall image admin payload is incomplete')
    assert(data.assets.some(entry => entry?.url === hallImageUrl), 'hall image upload was not captured in admin assets')
    const reportedImage = data.reports.find(entry => entry?.image_url === hallImageUrl)
    assert(reportedImage?.id, 'hall image report did not reach admin reports')
    hallImageReportId = String(reportedImage.id)
  })

  await runCheck('POST /api/admin/taoyuan/hall/image-reports/:id/hide admin write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/admin/taoyuan/hall/image-reports/${encodeURIComponent(hallImageReportId)}/hide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        reason: 'smoke hide image report',
      }),
    })
    assert(response.ok, `hall image hide returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.asset?.status === 'hidden', 'hall image hide payload is incomplete')
  })

  await runCheck('POST /api/admin/taoyuan/image-blacklist/:username admin write path', async () => {
    await bootstrapAuthOnlySession(imageBlacklistSessionState, 'smk3img')
    const { response, data } = await fetchAuthedJson(`/api/admin/taoyuan/image-blacklist/${encodeURIComponent(imageBlacklistSessionState.username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        blocked: true,
        reason: 'smoke image blacklist',
      }),
    })
    assert(response.ok, `hall image blacklist returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.blacklist), 'hall image blacklist payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/hall/upload-image blacklisted path', async () => {
    const { response, data } = await fetchSessionJson(imageBlacklistSessionState, '/api/taoyuan/hall/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data_url: tinyPngDataUrl,
        filename: 'smoke-hall-blacklisted.png',
        usage: 'hall_post',
      }),
    })
    assert(response.status === 403, `blacklisted hall upload should return 403, received ${response.status}`)
    assert(data?.ok === false, 'blacklisted hall upload should be rejected')
  })

  let createdReplyId = ''
  await runCheck('POST /api/taoyuan/hall/posts/:id/replies write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'smoke reply content',
      }),
    })
    assert(response.ok, `hall reply create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.replies?.length, 'hall reply payload is incomplete')
    createdReplyId = String(data.post.replies[data.post.replies.length - 1]?.id || '')
    assert(createdReplyId, 'hall reply id was not created')
  })

  await runCheck('POST /api/taoyuan/mail/system-campaign write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/system-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `smoke mail ${Date.now()}`,
        content: 'smoke mail content',
        template_type: 'activity_notice',
      }),
    })
    assert(response.ok, `system campaign returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.campaign?.id, 'system campaign payload is incomplete')
  })

  let rewardPostId = ''
  let rewardReplyId = ''
  let manorGuestbookEntryContent = ''
  let societyNoticeText = ''
  const playerLetterTitle = `smoke player letter ${Date.now()}`
  const playerLetterContent = '这是一封来自联机 smoke 的玩家书信，用来验证互寄来信链路。'
  const playerGiftPackageTitle = `smoke gift package ${Date.now()}`
  let playerGiftPackageMailId = ''
  const coopOrderDeadlineAt = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60
  const coopProfileSetupPayload = {
    visibility: 'public',
    public_intro: 'smoke coop helper',
    manor_name: '协作试验庄',
    public_title: '互助试验员',
    neighborhood_role: '互助成员',
    showcase_theme: '节庆备货',
    selected_tag_ids: ['festival', 'mutual_aid'],
  }
  const publicCoopOrderTitle = `public coop order ${Date.now()}`
  const friendCoopOrderTitle = `friend coop order ${Date.now()}`
  const targetedFriendCoopOrderTitle = `targeted friend coop order ${Date.now()}`
  const neighborCoopOrderTitle = `neighbor coop order ${Date.now()}`
  const relayCoopOrderTitle = `relay coop order ${Date.now()}`
  const cropRelayCoopOrderTitle = `crop relay coop order ${Date.now()}`
  const expiringCoopOrderTitle = `expiring coop order ${Date.now()}`
  let publicCoopOrderId = ''
  let friendCoopOrderId = ''
  let targetedFriendCoopOrderId = ''
  let neighborCoopOrderId = ''
  let relayCoopOrderId = ''
  let relayStageOneId = ''
  let relayStageTwoId = ''
  let relayStageOneReceiptId = ''
  let relayStageTwoReceiptId = ''
  let expiringCoopOrderId = ''
  let neighborConsignmentListingId = ''
  let neighborConsignmentExpiredListingId = ''
  let festivalStallFoodOfferId = ''
  let festivalStallTicketOfferId = ''
  let exchangeLedgerReportableEntryId = ''
  let festivalPrimaryRewardMoney = 0
  let festivalSecondaryRewardMoney = 0
  let originalMarketGovernanceConfig = null
  let weeklyExchangeExpectedWoodCount = null
  let weeklyExchangeExpectedStoneCount = null
  let primaryExpectedMoney = 1200
  let secondaryExpectedMoney = 260
  let secondarySaveIdentity = null
  await runCheck('second session bootstrap', async () => {
    await bootstrapSession(secondarySessionState, 'smk2', 260)
  })

  await runCheck('GET /api/taoyuan/save/:slot secondary save identity for mail target', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `secondary save identity for mail returned ${response.status}`)
    secondarySaveIdentity = getEmbeddedSaveIdentity(decryptTaoyuanRaw(data?.raw || ''))
    assert(secondarySaveIdentity?.save_id, 'secondary save identity missing before mail save id target check')
  })

  manorGuestbookEntryContent = `smoke guestbook ${Date.now()}`
  await runCheck('POST /api/taoyuan/online/manor/guestbook target save id write path', async () => {
    assert(primarySaveIdentity?.save_id, 'primary save identity missing before manor guestbook save id target check')
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/guestbook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: primarySaveIdentity.save_id,
        kind: 'blessing',
        content: manorGuestbookEntryContent,
      }),
    })
    assert(response.ok, `manor guestbook write returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.id, 'manor guestbook write payload is incomplete')
    assert(data.entry.target_username === sessionState.username, 'manor guestbook save id target did not resolve to account username')
    assert(data.entry.target_save_id === primarySaveIdentity.save_id, 'manor guestbook did not persist target save id')
    assert(data.entry.target_save_slot === primarySaveIdentity.save_slot, 'manor guestbook did not persist target save slot')
  })

  await runCheck('POST /api/taoyuan/online/manor/guestbook moderation reject path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/guestbook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: sessionState.username,
        kind: 'suggestion',
        content: '这里写着台独口号',
      }),
    })
    assertRejectedResponse(response, data, 'manor guestbook moderation')
  })

  await runCheck('POST /api/taoyuan/online/manor/visit target save id write path', async () => {
    assert(primarySaveIdentity?.save_id, 'primary save identity missing before manor visit save id target check')
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: primarySaveIdentity.save_id,
        purpose: 'friend_visit',
        summary: 'smoke manor visit',
        feedback: 'smoke manor feedback',
      }),
    })
    assert(response.ok, `manor visit write returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.id, 'manor visit write payload is incomplete')
    assert(data.entry.target_username === sessionState.username, 'manor visit save id target did not resolve to account username')
    assert(data.entry.target_save_id === primarySaveIdentity.save_id, 'manor visit did not persist target save id')
    assert(data.entry.target_save_slot === primarySaveIdentity.save_slot, 'manor visit did not persist target save slot')
  })

  await runCheck('GET /api/taoyuan/online/manor guestbook/visit readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor')
    assert(response.ok, `guestbook / visit manor readback returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot, 'guestbook / visit manor readback payload is incomplete')
    assert(data.snapshot.guestbook_entries.some(entry => entry.content === manorGuestbookEntryContent), 'guestbook entry was not persisted to manor snapshot')
    assert(data.snapshot.visit_entries.some(entry => entry.summary === 'smoke manor visit'), 'visit entry was not persisted to manor snapshot')
  })

  await runCheck('POST /api/taoyuan/online/manor/:username/favorite write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/manor/${encodeURIComponent(sessionState.username)}/favorite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: 'smoke manor theme',
      }),
    })
    assert(response.ok, `manor favorite write returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.id, 'manor favorite write payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor/favorites/overview read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/favorites/overview')
    assert(response.ok, `manor favorite overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.hot_manors), 'manor favorite overview payload is incomplete')
    assert(data.hot_manors.some(entry => entry?.manor_username === sessionState.username), 'manor hot board did not include the favorited manor')
  })

  await runCheck('POST /api/taoyuan/mail/player-letter write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
        title: playerLetterTitle,
        content: playerLetterContent,
        template_type: 'season_greeting',
      }),
    })
    assert(response.ok, `player-letter write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.title === playerLetterTitle, 'player-letter payload is incomplete')
    assert(data.mail.recipient_username === secondarySessionState.username, 'player-letter save id target resolved wrong recipient')
    assert(data.mail.target_save_id === secondarySaveIdentity.save_id, 'player-letter did not persist target save id')
    assert(data.mail.target_save_slot === secondarySaveIdentity.save_slot, 'player-letter did not persist target save slot')
  })

  await runCheck('GET /api/taoyuan/mail/list player-letter read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `player-letter list returned ${response.status}`)
    const playerLetter = data?.mails?.find(entry => entry?.title === playerLetterTitle)
    assert(playerLetter, 'player-letter was not delivered to recipient mailbox list')
    assert(playerLetter?.template_type === 'season_greeting', 'player-letter template type was not preserved')
    assert(playerLetter?.sender_username === sessionState.username, 'player-letter sender username is missing')
    assert(playerLetter?.target_save_id === secondarySaveIdentity.save_id, 'player-letter list did not expose target save id')
    assert(playerLetter?.target_save_slot === secondarySaveIdentity.save_slot, 'player-letter list did not expose target save slot')
  })

  await runCheck('GET /api/taoyuan/mail/sent player-letter outbox path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/sent')
    assert(response.ok, `mail sent returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.mails), 'mail sent payload is incomplete')
    const sentLetter = data.mails.find(entry => entry?.title === playerLetterTitle)
    assert(sentLetter, 'player-letter was not visible in sender outbox')
    assert(sentLetter?.recipient_username === secondarySessionState.username, 'player-letter outbox recipient did not match')
    assert(sentLetter?.target_save_id === secondarySaveIdentity.save_id, 'player-letter outbox did not expose target save id')
    assert(sentLetter?.target_save_slot === secondarySaveIdentity.save_slot, 'player-letter outbox did not expose target save slot')
  })

  await runCheck('POST /api/taoyuan/mail/player-letter moderation reject path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
        title: '台独信件',
        content: '这封信里带有台独内容，应当被审核拦截。',
        template_type: 'season_greeting',
      }),
    })
    assertRejectedResponse(response, data, 'player-letter moderation')
  })

  await runCheck('POST /api/taoyuan/mail/player-gift-package write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-gift-package', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
        title: playerGiftPackageTitle,
        content: '这是一份来自联机 smoke 的礼物包裹。',
        template_type: 'material_package',
        rewards: [
          {
            type: 'item',
            id: 'wood',
            quantity: 2,
            quality: 'normal',
          },
        ],
      }),
    })
    assert(response.ok, `player-gift-package write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.title === playerGiftPackageTitle, 'player-gift-package payload is incomplete')
    assert(data.mail.recipient_username === secondarySessionState.username, 'player-gift-package save id target resolved wrong recipient')
    assert(data.mail.target_save_id === secondarySaveIdentity.save_id, 'player-gift-package did not persist target save id')
    assert(data.mail.target_save_slot === secondarySaveIdentity.save_slot, 'player-gift-package did not persist target save slot')
    playerGiftPackageMailId = String(data?.mail?.id || '')
    assert(playerGiftPackageMailId, 'player-gift-package mail id was not created')
  })

  await runCheck('GET /api/taoyuan/save/:slot player-gift-package sender deduction', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `player-gift-package sender save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'player-gift-package sender save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const woodCount = (decrypted?.inventory?.items || [])
      .filter(entry => entry?.itemId === 'wood')
      .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
    assert(woodCount === 4, `player-gift-package did not deduct sender wood correctly, current wood=${woodCount}`)
  })

  await runCheck('GET /api/taoyuan/mail/list player-gift-package read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `player-gift-package list returned ${response.status}`)
    const playerGiftPackage = data?.mails?.find(entry => entry?.title === playerGiftPackageTitle)
    assert(playerGiftPackage, 'player-gift-package was not delivered to recipient mailbox list')
    assert(playerGiftPackage?.template_type === 'material_package', 'player-gift-package template type was not preserved')
    assert(playerGiftPackage?.sender_username === sessionState.username, 'player-gift-package sender username is missing')
    assert(playerGiftPackage?.has_rewards === true, 'player-gift-package should expose rewards to recipient')
    assert(playerGiftPackage?.target_save_id === secondarySaveIdentity.save_id, 'player-gift-package list did not expose target save id')
    assert(playerGiftPackage?.target_save_slot === secondarySaveIdentity.save_slot, 'player-gift-package list did not expose target save slot')
  })

  await runCheck('GET /api/taoyuan/mail/inbox-status player arrival summary', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/inbox-status')
    assert(response.ok, `mail inbox-status returned ${response.status}`)
    assert(data?.ok === true, 'mail inbox-status did not return ok=true')
    assert(Number(data?.unread_count) >= 1, 'mail inbox-status should report unread mails')
    assert(data?.newest_unread?.title === playerGiftPackageTitle, 'mail inbox-status did not point to the newest unread mail')
  })

  await runCheck('POST /api/taoyuan/mail/:id/pin player important mail path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(playerGiftPackageMailId)}/pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinned: true,
      }),
    })
    assert(response.ok, `mail pin returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.is_pinned === true, 'mail pin payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list pinned order path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `pinned mail list returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.mails), 'pinned mail list payload is incomplete')
    assert(data.mails[0]?.id === playerGiftPackageMailId, 'pinned mail was not floated to the top of the mailbox list')
    assert(data.mails[0]?.is_pinned === true, 'pinned mail flag was not preserved in mailbox list')
  })

  await runCheck('POST /api/taoyuan/mail/:id player-gift-package claim path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(playerGiftPackageMailId)}/claim`, {
      method: 'POST',
    })
    assert(response.ok, `player-gift-package claim returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.claimed_at, 'player-gift-package claim payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/receipts player-gift-package receipt path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/receipts?limit=10')
    assert(response.ok, `mail receipts returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.receipts), 'mail receipts payload is incomplete')
    const receipt = data.receipts.find(entry => entry?.delivery_id === playerGiftPackageMailId)
    assert(receipt, 'claimed player-gift-package did not appear in receipt history')
    assert(receipt?.applied_rewards?.some(entry => entry?.id === 'wood'), 'claimed receipt did not preserve applied reward details')
  })

  await runCheck('POST /api/taoyuan/mail/:id/memorial inbox path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(playerGiftPackageMailId)}/memorial`, {
      method: 'POST',
    })
    assert(response.ok, `mail memorial save returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.delivery_id === playerGiftPackageMailId, 'mail memorial save payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/memorial inbox readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial')
    assert(response.ok, `mail memorial list returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'mail memorial list payload is incomplete')
    const memorialEntry = data.entries.find(entry => entry?.delivery_id === playerGiftPackageMailId)
    assert(memorialEntry, 'saved gift-package did not appear in memorial list')
    assert(Array.isArray(memorialEntry?.tags) && memorialEntry.tags.length > 0, 'memorial entry should preserve generated tags')
  })

  await runCheck('GET /api/taoyuan/mail/memorial seasonal filter readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial?tag=%E8%8A%82%E6%B0%94')
    assert(response.ok, `mail memorial seasonal filter returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'mail memorial seasonal filter payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/save/:slot player-gift-package recipient persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `player-gift-package recipient save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'player-gift-package recipient save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const woodCount = (decrypted?.inventory?.items || [])
      .filter(entry => entry?.itemId === 'wood')
      .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
    assert(woodCount === 8, `player-gift-package did not grant recipient wood correctly, current wood=${woodCount}`)
  })

  await runCheck('POST /api/taoyuan/online/orders public write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: publicCoopOrderTitle,
        description: 'smoke public coop order',
        order_type: 'material_help',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'money',
        reward_value: 120,
        reward_label: '铜钱回报',
      }),
    })
    assert(response.ok, `public coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.title === publicCoopOrderTitle, 'public coop order payload is incomplete')
    publicCoopOrderId = String(data?.order?.id || '')
    assert(publicCoopOrderId, 'public coop order id was not created')
  })

  await runCheck('POST /api/taoyuan/online/orders moderation reject path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '台独求助单',
        description: '这是一条应该被文本审核拦住的求助内容。',
        order_type: 'material_help',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'money',
        reward_value: 120,
        reward_label: '铜钱回报',
      }),
    })
    assertRejectedResponse(response, data, 'coop order moderation')
  })

  await runCheck('GET /api/taoyuan/online/orders public read path', async () => {
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `primary coop order overview returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.orders?.some(entry => entry?.title === publicCoopOrderTitle && entry?.scope === 'public'), 'public coop order missing from primary overview')
    assert(Number(primaryOverview.data?.board_summary?.total_orders) >= 1, 'coop order board summary did not count total orders')
    assert(Number(primaryOverview.data?.board_summary?.open_orders) >= 1, 'coop order board summary did not count open orders')
    assert(Number(primaryOverview.data?.society_order_board?.public_orders) >= 1, 'society order board did not count public orders')
    assert(Array.isArray(primaryOverview.data?.society_order_board?.recent_receipts), 'society order board did not expose recent receipt list')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `secondary coop order overview returned ${secondaryOverview.response.status}`)
    assert(secondaryOverview.data?.orders?.some(entry => entry?.title === publicCoopOrderTitle && entry?.scope === 'public'), 'public coop order missing from secondary overview')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/accept public path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `public coop order accept returned ${response.status}`)
    assert(data?.ok === true && data?.order?.assignee_username === secondarySessionState.username, 'public coop order accept payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/orders accepted readback', async () => {
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `accepted coop order owner readback returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.orders?.some(entry => entry?.id === publicCoopOrderId && entry?.assignee_username === secondarySessionState.username), 'accepted coop order assignee missing from owner overview')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/cancel-accept public path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/cancel-accept`, {
      method: 'POST',
    })
    assert(response.ok, `public coop order cancel accept returned ${response.status}`)
    assert(data?.ok === true && !data?.order?.assignee_username, 'public coop order cancel accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/accept public second path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `public coop order second accept returned ${response.status}`)
    assert(data?.ok === true && data?.order?.assignee_username === secondarySessionState.username, 'public coop order second accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/deliver path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          {
            item_id: 'wheat',
            quantity: 2,
          },
        ],
        result_note: 'smoke delivery note',
      }),
    })
    assert(response.ok, `coop order deliver returned ${response.status}`)
    assert(data?.ok === true && data?.order?.delivery_status === 'submitted', 'coop order deliver payload is incomplete')
    assert(data?.receipt?.status === 'pending_owner_confirm', 'coop order deliver receipt status is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/deliver duplicate guard path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          {
            item_id: 'wheat',
            quantity: 2,
          },
        ],
        result_note: 'smoke delivery note',
      }),
    })
    assert(response.ok, `coop order duplicate deliver returned ${response.status}`)
    assert(data?.ok === true && data?.duplicate_protected === true, 'coop order duplicate guard did not trigger')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/confirm-delivery path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `coop order confirm delivery returned ${response.status}`)
    assert(data?.ok === true && data?.order?.delivery_status === 'confirmed', 'coop order confirm delivery payload is incomplete')
    assert(data?.receipt?.status === 'confirmed', 'coop order confirm receipt payload is incomplete')
    secondaryExpectedMoney += 120
  })

  await runCheck('GET /api/taoyuan/save/:slot coop reward persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `coop reward save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'coop reward save read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === secondaryExpectedMoney, `coop order reward did not persist to second user save, expected money=${secondaryExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  await runCheck('GET /api/taoyuan/online/orders reputation summary readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(response.ok, `coop reputation readback returned ${response.status}`)
    assert(data?.ok === true && data?.reputation_summary?.total > 0, 'coop reputation total did not increase')
    assert(data?.reputation_summary?.completed_count >= 1, 'coop reputation completed count did not increase')
    assert(typeof data?.reputation_summary?.trust_level?.label === 'string' && data.reputation_summary.trust_level.label, 'coop trust level label is missing')
    assert(data?.reputation_summary?.top_helped_targets?.some(entry => entry?.username === sessionState.username), 'coop trust graph did not include the helped owner')
  })

  await runCheck('POST /api/taoyuan/online/orders expiring write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: expiringCoopOrderTitle,
        description: 'smoke expiring coop order',
        order_type: 'npc_request',
        scope: 'public',
        deadline_at: Math.floor(Date.now() / 1000) + 5,
        reward_type: 'money',
        reward_value: 30,
        reward_label: '短时赏金',
      }),
    })
    assert(response.ok, `expiring coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.title === expiringCoopOrderTitle, 'expiring coop order payload is incomplete')
    expiringCoopOrderId = String(data?.order?.id || '')
    assert(expiringCoopOrderId, 'expiring coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders expired readback', async () => {
    await wait(6000)
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `expired coop order readback returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.orders?.some(entry => entry?.id === expiringCoopOrderId && entry?.status === 'expired'), 'expiring coop order did not flip to expired')
  })

  let friendRequestId = ''
  let friendshipId = ''
  let blockRelationSaveIdentity = null
  await runCheck('POST /api/taoyuan/online/social/friend-requests order scope setup', async () => {
    const secondarySave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(secondarySave.response.ok, `secondary save identity read returned ${secondarySave.response.status}`)
    secondarySaveIdentity = getEmbeddedSaveIdentity(decryptTaoyuanRaw(secondarySave.data?.raw || ''))
    assert(secondarySaveIdentity?.save_id, 'secondary save identity missing before friend request setup')

    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
      }),
    })
    assert(response.ok, `friend request for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.id, 'friend request for coop order scope payload is incomplete')
    assert(data.request.to_username === secondarySessionState.username, 'friend request by save id targeted the wrong user')
    assert(data.request.to_save_id === secondarySaveIdentity.save_id, 'friend request did not persist target save id')
    assert(data.request.from_save_id === primarySaveIdentity.save_id, 'friend request did not persist requester save id')
    friendRequestId = String(data.request.id)
  })

  await runCheck('GET /api/taoyuan/online/social/relationships friend request save id overview', async () => {
    assert(primarySaveIdentity?.save_id && secondarySaveIdentity?.save_id, 'save identities are required before relationship request overview check')

    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/social/relationships')
    assert(primaryOverview.response.ok, `primary relationship overview returned ${primaryOverview.response.status}`)
    const outgoingRequest = primaryOverview.data?.outgoing_requests?.find(entry => entry?.request_id === friendRequestId)
    assert(outgoingRequest?.from_save_id === primarySaveIdentity.save_id, 'outgoing request overview missing requester save id')
    assert(outgoingRequest?.to_save_id === secondarySaveIdentity.save_id, 'outgoing request overview missing target save id')
    assert(outgoingRequest?.to_save_slot === secondarySaveIdentity.save_slot, 'outgoing request overview missing target save slot')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/social/relationships')
    assert(secondaryOverview.response.ok, `secondary relationship overview returned ${secondaryOverview.response.status}`)
    const incomingRequest = secondaryOverview.data?.incoming_requests?.find(entry => entry?.request_id === friendRequestId)
    assert(incomingRequest?.from_save_id === primarySaveIdentity.save_id, 'incoming request overview missing requester save id')
    assert(incomingRequest?.to_save_id === secondarySaveIdentity.save_id, 'incoming request overview missing target save id')
    assert(incomingRequest?.from_save_slot === primarySaveIdentity.save_slot, 'incoming request overview missing requester save slot')
  })

  await runCheck('POST /api/taoyuan/online/social/friend-requests/:id/accept order scope setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/social/friend-requests/${encodeURIComponent(friendRequestId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `friend request accept for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.status === 'accepted', 'friend request accept for coop order scope payload is incomplete')
    assert(data.request.from_save_id === primarySaveIdentity.save_id, 'accepted request lost requester save id')
    assert(data.request.to_save_id === secondarySaveIdentity.save_id, 'accepted request lost target save id')
  })

  await runCheck('GET /api/taoyuan/online/social/relationships friend list save id readback', async () => {
    assert(primarySaveIdentity?.save_id && secondarySaveIdentity?.save_id, 'save identities are required before friend list overview check')

    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/social/relationships')
    assert(primaryOverview.response.ok, `primary friend relationship overview returned ${primaryOverview.response.status}`)
    const primaryFriend = primaryOverview.data?.friends?.find(entry => entry?.profile?.username === secondarySessionState.username)
    assert(primaryFriend?.own_save_id === primarySaveIdentity.save_id, 'primary friend list missing own save id')
    assert(primaryFriend?.friend_save_id === secondarySaveIdentity.save_id, 'primary friend list missing friend save id')
    assert(primaryFriend?.friend_save_slot === secondarySaveIdentity.save_slot, 'primary friend list missing friend save slot')
    friendshipId = String(primaryFriend.friendship_id || '')
    assert(friendshipId, 'primary friend list missing friendship id')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/social/relationships')
    assert(secondaryOverview.response.ok, `secondary friend relationship overview returned ${secondaryOverview.response.status}`)
    const secondaryFriend = secondaryOverview.data?.friends?.find(entry => entry?.profile?.username === sessionState.username)
    assert(secondaryFriend?.own_save_id === secondarySaveIdentity.save_id, 'secondary friend list missing own save id')
    assert(secondaryFriend?.friend_save_id === primarySaveIdentity.save_id, 'secondary friend list missing friend save id')
    assert(secondaryFriend?.friend_save_slot === primarySaveIdentity.save_slot, 'secondary friend list missing friend save slot')
  })

  let cohabitationContractId = ''
  await runCheck('POST /api/taoyuan/online/cohabitation/contracts create path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/cohabitation/contracts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bosom_partner',
        target_username: secondarySessionState.username,
        title: 'smoke cohabitation fund',
        idempotency_key: `smoke-cohabitation-create-${Date.now()}`,
      }),
    })
    assert(response.ok, `cohabitation contract create returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.contract?.id, 'cohabitation contract create payload is incomplete')
    assert(data.contract.status === 'pending_acceptance', 'cohabitation contract should wait for invited member acceptance')
    cohabitationContractId = String(data.contract.id)
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/accept path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `cohabitation contract accept returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.contract?.status === 'active', 'cohabitation contract accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/fund/contribute path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/fund/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 40,
        purpose: 'seed_budget',
        memo: 'smoke fund seed budget',
        idempotency_key: `smoke-fund-contribute-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation fund contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.fund?.balance === 40, 'cohabitation fund contribute payload is incomplete')
    assert(data?.ledger_entry?.action === 'contribution', 'cohabitation fund contribution did not write contribution ledger')
    assert(data?.personal_money?.remaining_money === primaryExpectedMoney - 40, 'cohabitation fund contribution did not deduct primary money once')
    primaryExpectedMoney -= 40
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/fund/spend path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/fund/spend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 15,
        purpose: 'seed_budget',
        target_ref: 'shop:smoke_seed_pack',
        idempotency_key: `smoke-fund-spend-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation fund spend returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.fund?.balance === 25, 'cohabitation fund spend payload is incomplete')
    assert(data?.ledger_entry?.action === 'spend', 'cohabitation fund spend did not write spend ledger')
    assert(data?.ledger_entry?.target_ref === 'shop:smoke_seed_pack', 'cohabitation fund spend did not preserve target ref')
    assert(data?.shared_fund?.balance_before === 40 && data?.shared_fund?.balance_after === 25, 'cohabitation fund spend did not expose balance transition')
    assert(data?.shared_fund?.personal_money_merged === false, 'cohabitation fund spend should not merge personal money')
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/fund/spend idempotent path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/fund/spend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 15,
        purpose: 'seed_budget',
        target_ref: 'shop:smoke_seed_pack',
        idempotency_key: `smoke-fund-spend-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation fund spend idempotent returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.idempotent === true, 'cohabitation fund spend duplicate should be idempotent')
    assert(data?.fund?.balance === 25, 'cohabitation fund spend duplicate should not deduct balance twice')
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/permissions enable warehouse sale path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: sessionState.username,
        permissions: {
          storage: {
            sell_items: true,
          },
        },
        idempotency_key: `smoke-cohabitation-sell-permission-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation permission enable sell returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.permissions_panel?.members?.find(entry => entry?.username === sessionState.username)?.permissions?.storage?.sell_items === true, 'cohabitation permissions did not enable warehouse sale')
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/warehouse/deposit path', async () => {
    const beforeSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `cohabitation warehouse deposit before save read returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preWood = getInventoryItemQuantity(beforeDecrypted, 'wood')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/warehouse/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        quality: 'normal',
        idempotency_key: `smoke-warehouse-deposit-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation warehouse deposit returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.warehouse?.summary?.total_quantity === 1, 'cohabitation warehouse deposit payload is incomplete')
    assert(data?.ledger_entry?.action === 'deposit', 'cohabitation warehouse deposit did not write deposit ledger')

    const afterSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(afterSave.response.ok, `cohabitation warehouse deposit after save read returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterWood = getInventoryItemQuantity(afterDecrypted, 'wood')
    assert(afterMoney === preMoney, 'cohabitation warehouse deposit should not touch personal money')
    assert(afterWood === preWood - 1, `cohabitation warehouse deposit did not deduct wood correctly, expected wood=${preWood - 1}, current wood=${afterWood}`)
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/warehouse/sell path', async () => {
    const beforeSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `cohabitation warehouse sell before save read returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preWood = getInventoryItemQuantity(beforeDecrypted, 'wood')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/warehouse/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        quality: 'normal',
        idempotency_key: `smoke-warehouse-sell-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation warehouse sell returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.fund?.balance === 40, 'cohabitation warehouse sell did not credit shared fund')
    assert(data?.ledger_entry?.action === 'sell', 'cohabitation warehouse sell did not write warehouse sell ledger')
    assert(data?.fund_ledger_entry?.action === 'warehouse_sale_income', 'cohabitation warehouse sell did not write fund income ledger')
    assert(data?.sale?.total_amount === 15, 'cohabitation warehouse sell did not use server-side wood price')
    assert(data?.sale?.balance_before === 25 && data?.sale?.balance_after === 40, 'cohabitation warehouse sell did not expose balance transition')
    assert(data?.sale?.personal_money_merged === false, 'cohabitation warehouse sell should not merge personal money')

    const afterSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(afterSave.response.ok, `cohabitation warehouse sell after save read returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterWood = getInventoryItemQuantity(afterDecrypted, 'wood')
    assert(afterMoney === preMoney, 'cohabitation warehouse sell should not touch personal money')
    assert(afterWood === preWood, 'cohabitation warehouse sell should not touch personal inventory')
  })

  await runCheck('POST /api/taoyuan/online/cohabitation/contracts/:contractId/warehouse/sell idempotent path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/warehouse/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        quality: 'normal',
        idempotency_key: `smoke-warehouse-sell-${cohabitationContractId}`,
      }),
    })
    assert(response.ok, `cohabitation warehouse sell idempotent returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.idempotent === true, 'cohabitation warehouse sell duplicate should be idempotent')
    assert(data?.fund?.balance === 40, 'cohabitation warehouse sell duplicate should not credit balance twice')
  })

  await runCheck('GET /api/taoyuan/online/cohabitation/contracts/:contractId/fund readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/cohabitation/contracts/${encodeURIComponent(cohabitationContractId)}/fund`)
    assert(response.ok, `cohabitation fund readback returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.fund?.balance === 40, 'cohabitation fund readback payload is incomplete')
    assert(data.fund.ledger?.some(entry => entry?.action === 'spend' && entry?.purpose === 'seed_budget'), 'cohabitation fund readback did not include spend ledger')
    assert(data.fund.ledger?.some(entry => entry?.action === 'warehouse_sale_income' && entry?.amount === 15), 'cohabitation fund readback did not include warehouse sale income ledger')
    assert(data.fund.summary?.spend_enabled === true, 'cohabitation fund readback should expose actor spend capability')
  })

  let friendMemorialMailId = ''
  await runCheck('POST /api/taoyuan/mail/player-letter friend memorial setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
        title: `friend memorial ${Date.now()}`,
        content: '这是一封用于好友纪念册筛选验证的来信。',
        template_type: 'player_letter',
      }),
    })
    assert(response.ok, `friend memorial mail write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.id, 'friend memorial mail payload is incomplete')
    friendMemorialMailId = String(data.mail.id)
  })

  await runCheck('POST /api/taoyuan/mail/:id/memorial friend filter setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(friendMemorialMailId)}/memorial`, {
      method: 'POST',
    })
    assert(response.ok, `friend memorial save returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.relation_scope === 'friend', 'friend memorial relation scope did not resolve to friend')
  })

  await runCheck('GET /api/taoyuan/mail/memorial friend filter readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial?relation_scope=friend')
    assert(response.ok, `friend memorial filter returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'friend memorial filter payload is incomplete')
    assert(data.entries.some(entry => entry?.delivery_id === friendMemorialMailId), 'friend memorial filter did not return the friend memorial mail')
  })

  await runCheck('POST /api/taoyuan/online/profile coop recommendation tag setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(coopProfileSetupPayload),
    })
    assert(response.ok, `coop recommendation profile setup returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.profile?.public_tags), 'coop recommendation profile setup payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/profile moderation reject path', async () => {
    const rejectedUpdate = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...coopProfileSetupPayload,
        manor_name: '台独庄园',
      }),
    })
    assertRejectedResponse(rejectedUpdate.response, rejectedUpdate.data, 'online profile moderation')

    const readback = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/profile')
    assert(readback.response.ok, `profile moderation readback returned ${readback.response.status}`)
    assert(String(readback.data?.profile?.manor_name || '') === coopProfileSetupPayload.manor_name, 'profile moderation reject should keep the previous manor name')
  })

  await runCheck('POST /api/taoyuan/online/orders friends write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: friendCoopOrderTitle,
        description: 'smoke friend coop order',
        order_type: 'festival_supply',
        scope: 'friends',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'reputation',
        reward_value: 50,
        reward_label: '互助声望',
      }),
    })
    assert(response.ok, `friend coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.scope === 'friends', 'friend coop order payload is incomplete')
    friendCoopOrderId = String(data?.order?.id || '')
    assert(friendCoopOrderId, 'friend coop order id was not created')
  })

  await runCheck('POST /api/taoyuan/online/orders target save id friends write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: targetedFriendCoopOrderTitle,
        description: 'smoke targeted friend coop order',
        order_type: 'festival_supply',
        scope: 'public',
        target_save_id: secondarySaveIdentity.save_id,
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'reputation',
        reward_value: 55,
        reward_label: '定向互助声望',
      }),
    })
    assert(response.ok, `targeted friend coop order write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.scope === 'friends', 'targeted friend coop order should be forced to friends scope')
    assert(data?.order?.target_save_id === secondarySaveIdentity.save_id, 'targeted friend coop order did not persist target save id')
    assert(data?.order?.target_save_slot === secondarySaveIdentity.save_slot, 'targeted friend coop order did not persist target save slot')
    assert(data?.order?.target_username === secondarySessionState.username, 'targeted friend coop order did not resolve target username')
    targetedFriendCoopOrderId = String(data?.order?.id || '')
    assert(targetedFriendCoopOrderId, 'targeted friend coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders friends visibility', async () => {
    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `friend-scope coop order overview returned ${secondaryOverview.response.status}`)
    const friendOrder = secondaryOverview.data?.orders?.find(entry => entry?.title === friendCoopOrderTitle && entry?.scope === 'friends')
    assert(friendOrder, 'friend-scope coop order missing from viewer overview')
    assert(Number(friendOrder?.priority_score) > 0, 'friend-scope coop order did not receive recommendation priority')
    assert(Array.isArray(friendOrder?.priority_reasons) && friendOrder.priority_reasons.some(reason => String(reason).includes('好友')), 'friend-scope coop order missing friend recommendation reason')
    assert(Array.isArray(friendOrder?.priority_reasons) && friendOrder.priority_reasons.some(reason => String(reason).includes('节庆') || String(reason).includes('互助')), 'friend-scope coop order missing tag recommendation reason')
    const targetedFriendOrder = secondaryOverview.data?.orders?.find(entry => entry?.id === targetedFriendCoopOrderId)
    assert(targetedFriendOrder?.target_save_id === secondarySaveIdentity.save_id, 'targeted friend coop order missing from target save overview')
    assert(targetedFriendOrder?.target_username === secondarySessionState.username, 'targeted friend coop order target username missing from overview')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/accept target save id friends path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(targetedFriendCoopOrderId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `targeted friend coop order accept returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.assignee_username === secondarySessionState.username, 'targeted friend coop order accept payload is incomplete')
    assert(data.order.target_save_id === secondarySaveIdentity.save_id, 'targeted friend coop order accept payload lost target save id')
  })

  let neighborInviteId = ''
  await runCheck('POST /api/taoyuan/online/social/neighbors create order scope setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/neighbors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `smoke-neighbor-${Date.now()}`,
        summary: 'smoke neighbor group',
        notice: 'smoke notice',
        capacity: 12,
      }),
    })
    assert(response.ok, `neighbor create for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.group?.id, 'neighbor create for coop order scope payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/social/neighbors/invite order scope setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/neighbors/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
      }),
    })
    assert(response.ok, `neighbor invite for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.id, 'neighbor invite for coop order scope payload is incomplete')
    neighborInviteId = String(data.request.id)
  })

  await runCheck('POST /api/taoyuan/online/social/neighbors/requests/:id/accept order scope setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/social/neighbors/requests/${encodeURIComponent(neighborInviteId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `neighbor invite accept for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.status === 'accepted', 'neighbor invite accept for coop order scope payload is incomplete')
  })

  let neighborMemorialMailId = ''
  await runCheck('POST /api/taoyuan/mail/player-letter neighbor memorial setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
        title: `neighbor memorial ${Date.now()}`,
        content: '这是一封用于村社纪念册筛选验证的来信。',
        template_type: 'festival_greeting',
      }),
    })
    assert(response.ok, `neighbor memorial mail write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.id, 'neighbor memorial mail payload is incomplete')
    neighborMemorialMailId = String(data.mail.id)
  })

  await runCheck('POST /api/taoyuan/mail/:id/memorial neighbor filter setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(neighborMemorialMailId)}/memorial`, {
      method: 'POST',
    })
    assert(response.ok, `neighbor memorial save returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.relation_scope === 'neighbor', 'neighbor memorial relation scope did not resolve to neighbor')
  })

  await runCheck('GET /api/taoyuan/mail/memorial neighbor filter readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial?relation_scope=neighbor')
    assert(response.ok, `neighbor memorial filter returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'neighbor memorial filter payload is incomplete')
    assert(data.entries.some(entry => entry?.delivery_id === neighborMemorialMailId), 'neighbor memorial filter did not return the neighbor memorial mail')
  })

  await runCheck('POST /api/taoyuan/online/orders neighbors write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: neighborCoopOrderTitle,
        description: 'smoke neighbor coop order',
        order_type: 'village_build',
        scope: 'neighbors',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'gift',
        reward_value: 1,
        reward_label: '邻里回礼包',
      }),
    })
    assert(response.ok, `neighbor coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.scope === 'neighbors', 'neighbor coop order payload is incomplete')
    neighborCoopOrderId = String(data?.order?.id || '')
    assert(neighborCoopOrderId, 'neighbor coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders neighbors visibility', async () => {
    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `neighbor-scope coop order overview returned ${secondaryOverview.response.status}`)
    const neighborOrder = secondaryOverview.data?.orders?.find(entry => entry?.title === neighborCoopOrderTitle && entry?.scope === 'neighbors')
    assert(neighborOrder, 'neighbor-scope coop order missing from viewer overview')
    assert(Array.isArray(neighborOrder?.priority_reasons) && neighborOrder.priority_reasons.some(reason => String(reason).includes('邻里')), 'neighbor-scope coop order missing neighbor recommendation reason')
  })

  await runCheck('GET /api/taoyuan/exchange-station/neighbors/consignments read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments')
    assert(response.ok, `neighbor consignment read returned ${response.status}`)
    assert(data?.ok === true && data?.neighbor_group?.name, 'neighbor consignment overview payload is incomplete')
    assert(Array.isArray(data?.scope_options) && data.scope_options.some(entry => entry?.id === 'friends'), 'neighbor consignment scope options are incomplete')
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wintersweet',
        quantity: 1,
        price_money: 70,
        scope: 'neighbors',
        duration_hours: 72,
      }),
    })
    assert(response.ok, `neighbor consignment write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.listing?.id, 'neighbor consignment write payload is incomplete')
    assert(data?.listing?.scope === 'neighbors', 'neighbor consignment write did not preserve scope')
    neighborConsignmentListingId = String(data.listing.id)
    assert(neighborConsignmentListingId, 'neighbor consignment listing id was not created')
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments/:listingId/purchase write path', async () => {
    const preSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(preSave.response.ok, `neighbor consignment buyer save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'neighbor consignment buyer save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preMoney = Math.floor(Number(preDecrypted?.player?.money) || 0)
    const preWintersweetCount = getInventoryItemQuantity(preDecrypted, 'wintersweet')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(neighborConsignmentListingId)}/purchase`, {
      method: 'POST',
    })
    assert(response.ok, `neighbor consignment purchase returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.listing?.status === 'sold', 'neighbor consignment purchase payload is incomplete')

    const buyerSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(buyerSave.response.ok, `neighbor consignment buyer persistence read returned ${buyerSave.response.status}`)
    assert(buyerSave.data?.ok === true && typeof buyerSave.data?.raw === 'string', 'neighbor consignment buyer persistence payload is incomplete')
    const buyerDecrypted = decryptTaoyuanRaw(buyerSave.data.raw)
    const buyerMoney = Math.floor(Number(buyerDecrypted?.player?.money) || 0)
    const buyerWintersweetCount = getInventoryItemQuantity(buyerDecrypted, 'wintersweet')
    primaryExpectedMoney -= 70
    assert(buyerMoney === preMoney - 70, `neighbor consignment did not deduct buyer money correctly, current money=${buyerMoney}`)
    assert(buyerMoney === primaryExpectedMoney, `neighbor consignment did not persist buyer money correctly, expected money=${primaryExpectedMoney}, current money=${buyerMoney}`)
    assert(buyerWintersweetCount === preWintersweetCount + 1, `neighbor consignment did not grant buyer wintersweet correctly, current wintersweet=${buyerWintersweetCount}`)

    const sellerSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(sellerSave.response.ok, `neighbor consignment seller persistence read returned ${sellerSave.response.status}`)
    assert(sellerSave.data?.ok === true && typeof sellerSave.data?.raw === 'string', 'neighbor consignment seller persistence payload is incomplete')
    const sellerDecrypted = decryptTaoyuanRaw(sellerSave.data.raw)
    const sellerMoney = Math.floor(Number(sellerDecrypted?.player?.money) || 0)
    secondaryExpectedMoney += 70
    assert(sellerMoney === secondaryExpectedMoney, `neighbor consignment did not credit seller money correctly, expected money=${secondaryExpectedMoney}, current money=${sellerMoney}`)
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments cancel path', async () => {
    await wait(2100)
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 40,
        scope: 'friends',
        duration_hours: 72,
      }),
    })
    assert(response.ok, `neighbor consignment cancel setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const cancelListingId = String(data?.listing?.id || '')
    assert(cancelListingId, 'neighbor consignment cancel setup did not create listing id')

    const cancelResponse = await fetchSessionJson(secondarySessionState, `/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(cancelListingId)}/cancel`, {
      method: 'POST',
    })
    assert(cancelResponse.response.ok, `neighbor consignment cancel returned ${cancelResponse.response.status}`)
    assert(cancelResponse.data?.ok === true && cancelResponse.data?.listing?.status === 'cancelled', 'neighbor consignment cancel payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments reclaim expired path', async () => {
    await wait(2100)
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 35,
        scope: 'neighbors',
        duration_hours: 1,
      }),
    })
    assert(response.ok, `neighbor consignment reclaim setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    neighborConsignmentExpiredListingId = String(data?.listing?.id || '')
    assert(neighborConsignmentExpiredListingId, 'neighbor consignment reclaim setup did not create listing id')

    const consignmentFile = path.join(smokeTempDir, 'taoyuan_neighbor_consignments.json')
    const consignmentData = JSON.parse(await readFile(consignmentFile, 'utf8'))
    consignmentData.listings = consignmentData.listings.map(entry =>
      entry.id === neighborConsignmentExpiredListingId
        ? { ...entry, expires_at: Math.floor(Date.now() / 1000) - 10 }
        : entry
    )
    await writeFile(consignmentFile, JSON.stringify(consignmentData, null, 2), 'utf8')

    const reclaimResponse = await fetchSessionJson(secondarySessionState, `/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(neighborConsignmentExpiredListingId)}/reclaim`, {
      method: 'POST',
    })
    assert(reclaimResponse.response.ok, `neighbor consignment reclaim returned ${reclaimResponse.response.status}`)
    assert(reclaimResponse.data?.ok === true && reclaimResponse.data?.listing?.status === 'reclaimed', 'neighbor consignment reclaim payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/exchange-station/weekly read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/weekly')
    assert(response.ok, `weekly exchange station read returned ${response.status}`)
    assert(data?.ok === true && data?.station?.week_key, 'weekly exchange station payload is incomplete')
    assert(Array.isArray(data?.station?.categories) && data.station.categories.some(entry => entry?.id === 'festival' && Number(entry.offer_count) >= 1), 'weekly exchange station did not expose festival category offers')
    assert(Array.isArray(data?.station?.categories) && data.station.categories.some(entry => entry?.id === 'neighbor' && Number(entry.offer_count) >= 1), 'weekly exchange station did not expose neighbor category offers')
    assert(data?.station?.festival_theme?.label, 'weekly exchange station did not expose festival theme rotation')
    assert(data?.station?.neighbor_context?.group_name, 'weekly exchange station did not expose neighbor context for neighbor member')
    const targetOffer = data.station.offers?.find(entry => entry?.id === 'wood_for_stone')
    assert(targetOffer, 'weekly exchange station did not expose the wood_for_stone offer')
    assert(targetOffer?.can_exchange === true, 'weekly exchange station offer should be exchangeable for secondary session')
    const neighborOffer = data.station.offers?.find(entry => entry?.category === 'neighbor')
    assert(neighborOffer, 'weekly exchange station did not expose any neighbor-only offer')
  })

  await runCheck('GET /api/taoyuan/exchange-station/festival-stall read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/festival-stall')
    assert(response.ok, `festival stall read returned ${response.status}`)
    assert(data?.ok === true && data?.stall?.festival_theme?.label, 'festival stall overview payload is incomplete')
    assert(Array.isArray(data?.stall?.offers) && data.stall.offers.some(entry => entry?.booth_category === 'materials'), 'festival stall did not expose any material bundle')
    assert(Array.isArray(data?.stall?.offers) && data.stall.offers.some(entry => entry?.booth_category === 'souvenir'), 'festival stall did not expose any souvenir bundle')
    const foodOffer = data.stall.offers.find(entry => entry?.booth_category === 'food')
    const ticketOffer = data.stall.offers.find(entry => entry?.booth_category === 'tickets')
    assert(foodOffer, 'festival stall did not expose any festival food')
    assert(ticketOffer, 'festival stall did not expose any ticket bundle')
    festivalStallFoodOfferId = String(foodOffer?.id || '')
    festivalStallTicketOfferId = String(ticketOffer?.id || '')
    assert(festivalStallFoodOfferId, 'festival stall food offer id was not created')
    assert(festivalStallTicketOfferId, 'festival stall ticket offer id was not created')
  })

  await runCheck('POST /api/taoyuan/exchange-station/festival-stall/:offerId/purchase food path', async () => {
    const preSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(preSave.response.ok, `festival stall buyer save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'festival stall buyer save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preMoney = Math.floor(Number(preDecrypted?.player?.money) || 0)
    const targetFoodId = 'food_qing_tuan'
    const preFoodCount = getInventoryItemQuantity(preDecrypted, targetFoodId)

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalStallFoodOfferId)}/purchase`, {
      method: 'POST',
    })
    assert(response.ok, `festival stall purchase returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.offer?.id === festivalStallFoodOfferId, 'festival stall food purchase payload is incomplete')

    const buyerSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(buyerSave.response.ok, `festival stall buyer persistence read returned ${buyerSave.response.status}`)
    assert(buyerSave.data?.ok === true && typeof buyerSave.data?.raw === 'string', 'festival stall buyer persistence payload is incomplete')
    const buyerDecrypted = decryptTaoyuanRaw(buyerSave.data.raw)
    const buyerMoney = Math.floor(Number(buyerDecrypted?.player?.money) || 0)
    const buyerFoodCount = getInventoryItemQuantity(buyerDecrypted, targetFoodId)
    primaryExpectedMoney -= data.offer.price_money
    assert(buyerMoney === preMoney - data.offer.price_money, `festival stall did not deduct buyer money correctly, current money=${buyerMoney}`)
    assert(buyerMoney === primaryExpectedMoney, `festival stall did not persist buyer money correctly, expected money=${primaryExpectedMoney}, current money=${buyerMoney}`)
    assert(buyerFoodCount === preFoodCount + 2, `festival stall did not grant festival food correctly, current food=${buyerFoodCount}`)
  })

  await runCheck('POST /api/taoyuan/exchange-station/festival-stall/:offerId/purchase ticket path', async () => {
    const preSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(preSave.response.ok, `festival stall ticket pre-save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'festival stall ticket pre-save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preMoney = Math.floor(Number(preDecrypted?.player?.money) || 0)
    const preCaravanTicketCount = getRewardTicketQuantity(preDecrypted, 'caravan')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalStallTicketOfferId)}/purchase`, {
      method: 'POST',
    })
    assert(response.ok, `festival stall ticket purchase returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.offer?.id === festivalStallTicketOfferId, 'festival stall ticket purchase payload is incomplete')

    const buyerSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(buyerSave.response.ok, `festival stall ticket persistence read returned ${buyerSave.response.status}`)
    assert(buyerSave.data?.ok === true && typeof buyerSave.data?.raw === 'string', 'festival stall ticket persistence payload is incomplete')
    const buyerDecrypted = decryptTaoyuanRaw(buyerSave.data.raw)
    const buyerMoney = Math.floor(Number(buyerDecrypted?.player?.money) || 0)
    const buyerCaravanTicketCount = getRewardTicketQuantity(buyerDecrypted, 'caravan')
    primaryExpectedMoney -= data.offer.price_money
    assert(buyerMoney === preMoney - data.offer.price_money, `festival stall ticket bundle did not deduct buyer money correctly, current money=${buyerMoney}`)
    assert(buyerMoney === primaryExpectedMoney, `festival stall ticket bundle did not persist buyer money correctly, expected money=${primaryExpectedMoney}, current money=${buyerMoney}`)
    assert(buyerCaravanTicketCount === preCaravanTicketCount + 1, `festival stall did not grant wallet ticket correctly, current caravan券=${buyerCaravanTicketCount}`)
  })

  await runCheck('POST /api/taoyuan/exchange-station/weekly/:offerId/exchange write path', async () => {
    const preSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(preSave.response.ok, `weekly exchange pre-save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'weekly exchange pre-save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preWoodCount = getInventoryItemQuantity(preDecrypted, 'wood')
    const preStoneCount = getInventoryItemQuantity(preDecrypted, 'stone')
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/weekly/wood_for_stone/exchange', {
      method: 'POST',
    })
    assert(response.ok, `weekly exchange execution returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.offer?.id === 'wood_for_stone', 'weekly exchange execution payload is incomplete')
    assert(Number(data?.offer?.claimed_by_user) === 1, 'weekly exchange execution did not advance personal claim count')
    assert(Array.isArray(data?.record?.rewards) && data.record.rewards.some(entry => entry?.item_id === 'stone'), 'weekly exchange execution record did not preserve reward detail')
    weeklyExchangeExpectedWoodCount = preWoodCount - 4
    weeklyExchangeExpectedStoneCount = preStoneCount + 10
  })

  await runCheck('GET /api/taoyuan/save/:slot weekly exchange persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `weekly exchange save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'weekly exchange save payload is incomplete')
    assert(weeklyExchangeExpectedWoodCount !== null, 'weekly exchange expected wood count was not captured')
    assert(weeklyExchangeExpectedStoneCount !== null, 'weekly exchange expected stone count was not captured')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const woodCount = getInventoryItemQuantity(decrypted, 'wood')
    const stoneCount = getInventoryItemQuantity(decrypted, 'stone')
    assert(woodCount === weeklyExchangeExpectedWoodCount, `weekly exchange did not deduct secondary user wood correctly, expected wood=${weeklyExchangeExpectedWoodCount}, current wood=${woodCount}`)
    assert(stoneCount === weeklyExchangeExpectedStoneCount, `weekly exchange did not grant secondary user stone correctly, expected stone=${weeklyExchangeExpectedStoneCount}, current stone=${stoneCount}`)
  })

  await runCheck('GET /api/taoyuan/exchange-station/ledger read path', async () => {
    const primaryLedger = await fetchAuthedJson('/api/taoyuan/exchange-station/ledger')
    assert(primaryLedger.response.ok, `primary exchange ledger read returned ${primaryLedger.response.status}`)
    assert(primaryLedger.data?.ok === true && primaryLedger.data?.ledger?.summary?.trust_level?.label, 'primary exchange ledger payload is incomplete')
    assert(Array.isArray(primaryLedger.data?.ledger?.entries) && primaryLedger.data.ledger.entries.length >= 2, 'primary exchange ledger did not expose expected entry list')
    assert(primaryLedger.data.ledger.entries.some(entry => entry?.source === 'festival_stall'), 'primary exchange ledger did not include festival stall records')
    assert(primaryLedger.data.ledger.entries.some(entry => entry?.source === 'neighbor_consignment'), 'primary exchange ledger did not include neighbor consignment records')
    const neighborBuyEntry = primaryLedger.data.ledger.entries.find(entry => entry?.source === 'neighbor_consignment' && entry?.event_type === 'consignment_sold' && entry?.viewer_role === 'buyer')
    assert(neighborBuyEntry?.counterparty_username === secondarySessionState.username, 'exchange ledger did not preserve trade counterparty')
    assert(String(neighborBuyEntry?.price_label || '').includes('70'), 'exchange ledger did not preserve consignment price label')
    const reportableEntry = primaryLedger.data.ledger.entries.find(entry => entry?.reportable === true)
    exchangeLedgerReportableEntryId = String(reportableEntry?.id || '')
    assert(exchangeLedgerReportableEntryId, 'exchange ledger did not expose any reportable entry')

    const secondaryLedger = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/ledger')
    assert(secondaryLedger.response.ok, `secondary exchange ledger read returned ${secondaryLedger.response.status}`)
    assert(secondaryLedger.data?.ok === true && secondaryLedger.data?.ledger?.summary?.trust_level?.label, 'secondary exchange ledger payload is incomplete')
    assert(Array.isArray(secondaryLedger.data?.ledger?.entries) && secondaryLedger.data.ledger.entries.length >= 2, 'secondary exchange ledger did not expose expected entry list')
    assert(secondaryLedger.data.ledger.entries.some(entry => entry?.source === 'weekly_exchange_station'), 'secondary exchange ledger did not include weekly exchange records')
    assert(secondaryLedger.data.ledger.entries.some(entry => entry?.source === 'neighbor_consignment'), 'secondary exchange ledger did not include neighbor consignment seller records')
  })

  await runCheck('POST /api/taoyuan/exchange-station/ledger/:entryId/disputes write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/ledger/${encodeURIComponent(exchangeLedgerReportableEntryId)}/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason_code: 'delivery_mismatch',
        note: 'smoke ledger dispute',
      }),
    })
    assert(response.ok, `exchange ledger dispute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.dispute?.id, 'exchange ledger dispute payload is incomplete')
    assert(data?.dispute?.reason_code === 'delivery_mismatch', 'exchange ledger dispute did not preserve reason code')
    assert(Array.isArray(data?.ledger?.my_disputes) && data.ledger.my_disputes.some(entry => entry?.id === data.dispute.id), 'exchange ledger dispute did not refresh my disputes')
  })

  await runCheck('GET /api/taoyuan/exchange-station/governance read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/exchange-station/governance')
    assert(response.ok, `market governance read returned ${response.status}`)
    assert(data?.ok === true && data?.governance?.price_bands?.consignment?.min_money >= 0, 'market governance payload is incomplete')
    assert(Array.isArray(data?.governance?.sources) && data.governance.sources.some(entry => entry?.id === 'neighbor_consignment'), 'market governance did not expose source toggles')
    assert(data?.governance?.anti_abuse?.daily_trade_action_limit >= 1, 'market governance did not expose anti-abuse config')
  })

  let createdFestivalRoomId = ''
  let createdWorldEventId = ''
  let worldEventPrimaryRewardMoney = 0
  let worldEventSecondaryRewardMoney = 0
  await runCheck('GET /api/taoyuan/online/festival/rooms read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(response.ok, `festival room overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.templates) && data.templates.length > 0, 'festival room overview payload is incomplete')
    const templateIds = new Set((data?.templates || []).map(item => String(item?.id || '')))
    for (const requiredId of ['yuanri_vigil', 'lantern_fair', 'dragon_boat', 'qixi_stroll', 'mid_autumn_moonwatch', 'laba_cookpot']) {
      assert(templateIds.has(requiredId), `festival room overview missing template ${requiredId}`)
    }
    const gameplayTemplateIds = new Set((data?.gameplay_templates || []).map(item => String(item?.id || '')))
    for (const requiredId of ['public_progress', 'squad_coop', 'quiz_buzz', 'assembly', 'gathering', 'performance', 'group_photo']) {
      assert(gameplayTemplateIds.has(requiredId), `festival room overview missing gameplay template ${requiredId}`)
    }
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: 'dragon_boat',
        gameplay_template_id: 'squad_coop',
        title: `smoke 节会房间 ${Date.now()}`,
      }),
    })
    assert(response.ok, `festival room create returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.id, 'festival room create payload is incomplete')
    assert(data?.room?.gameplay?.template_id === 'squad_coop', 'festival room create did not persist gameplay template id')
    createdFestivalRoomId = String(data.room.id)
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/invite write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
      }),
    })
    assert(response.ok, `festival room invite returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const invitation = data?.room?.invitations?.find(item => item?.target_username === secondarySessionState.username)
    assert(data?.ok === true && invitation?.target_save_id === secondarySaveIdentity.save_id, 'festival room invite did not persist target save id')
    assert(invitation?.target_save_slot === secondarySaveIdentity.save_slot, 'festival room invite did not persist target save slot')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/join write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/join`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room join returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === secondarySessionState.username && item?.status === 'joined'), 'festival room join payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/ready-check write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room ready-check returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'ready_check', 'festival room ready-check payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/ready primary path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room primary ready returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === sessionState.username && item?.status === 'ready'), 'festival room primary ready payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/ready secondary path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room secondary ready returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === secondarySessionState.username && item?.status === 'ready'), 'festival room secondary ready payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/start countdown path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room countdown returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'countdown', 'festival room countdown payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/disconnect path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/disconnect`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room disconnect returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'paused', 'festival room disconnect payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/reconnect path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/reconnect`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room reconnect returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && ['countdown', 'running'].includes(String(data?.room?.state || '')), 'festival room reconnect payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/festival/rooms running readback', async () => {
    await wait(6500)
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(response.ok, `festival room readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_room?.id === createdFestivalRoomId, 'festival room readback payload is incomplete')
    assert(String(data?.my_room?.state || '') === 'running', `festival room did not reach running state, current=${data?.my_room?.state}`)
    assert(String(data?.my_room?.gameplay?.phase || '') === 'active', `festival room gameplay did not enter active phase, current=${data?.my_room?.gameplay?.phase}`)
    const festivalState = data?.my_room?.gameplay?.festival_state
    assert(Number(festivalState?.round_number || 0) === 1, 'festival room round state did not start at round 1')
    assert(String(festivalState?.current_event?.id || '') !== '', 'festival room round state missing current event')
    assert(Array.isArray(festivalState?.team_resources) && festivalState.team_resources.length > 0, 'festival room round state missing team resources')
    assert(Array.isArray(festivalState?.role_assignments) && festivalState.role_assignments.length >= 2, 'festival room round state missing role assignments')
    const syncOarAction = (data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'sync_oar')
    assert(syncOarAction?.required_role === 'rhythm', 'festival room action did not expose required_role')
    assert(syncOarAction?.once_per_round === true, 'festival room action did not expose once_per_round')
    assert(String(syncOarAction?.pressure_delta_text || '').includes('场面压力'), 'festival room action did not expose pressure delta text')
    assert(String(syncOarAction?.round_effect || '').length > 0, 'festival room action did not expose round effect')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/action primary path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'sync_oar',
        idempotency_key: 'qa-online-festival-primary-sync-oar',
      }),
    })
    assert(response.ok, `festival room gameplay action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.gameplay?.progress_value >= 1, 'festival room gameplay action did not advance progress')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/action secondary path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'sync_oar',
        idempotency_key: 'qa-online-festival-secondary-sync-oar',
      }),
    })
    assert(response.ok, `festival room secondary gameplay action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.room?.gameplay?.contributions), 'festival room secondary gameplay action payload is incomplete')
    assert(data.room.gameplay.contributions.some(item => item?.username === secondarySessionState.username && Number(item?.action_count) >= 1), 'festival room secondary gameplay contribution was not recorded')
    const festivalState = data?.room?.gameplay?.festival_state
    assert(Number(festivalState?.round_number || 0) >= 2, 'festival room round state did not advance after two member actions')
    assert(String(festivalState?.current_event?.label || '') !== '', 'festival room round state lost current event')
    assert(Array.isArray(festivalState?.round_log) && festivalState.round_log.length >= 2, 'festival room round state missing round log')
    assert(String(festivalState?.recent_feedback || '').includes('回合'), 'festival room round state missing recent feedback')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/action primary bonus path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'steady_rudder',
        idempotency_key: 'qa-online-festival-primary-steady-rudder',
      }),
    })
    assert(response.ok, `festival room primary bonus action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const primaryContribution = data?.room?.gameplay?.contributions?.find(item => item?.username === sessionState.username)
    assert(Number(primaryContribution?.action_count || 0) >= 2, 'festival room primary bonus action did not keep host contribution ahead')
    const festivalState = data?.room?.gameplay?.festival_state
    assert(Array.isArray(festivalState?.team_resources) && festivalState.team_resources.some(item => String(item?.id || '') === 'order'), 'festival room round state lost team resources after bonus action')
    assert(Array.isArray(festivalState?.role_assignments) && festivalState.role_assignments.some(item => String(item?.role_id || '') === 'caller'), 'festival room round state lost caller role after bonus action')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/action primary round-two closeout path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'sync_oar',
        idempotency_key: 'qa-online-festival-primary-round-two-sync-oar',
      }),
    })
    assert(response.ok, `festival room primary round-two closeout action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const primaryContribution = data?.room?.gameplay?.contributions?.find(item => item?.username === sessionState.username)
    assert(Number(primaryContribution?.action_count || 0) >= 3, 'festival room primary round-two closeout action did not update contribution')
    const festivalState = data?.room?.gameplay?.festival_state
    assert(Number(festivalState?.round_number || 0) >= 3, 'festival room round state did not reach the third round after cross-player choices')
    assert(Array.isArray(festivalState?.round_log) && festivalState.round_log.some(item => String(item?.action_id || '') === 'round_advance'), 'festival room round log did not record round advance')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/settle path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room settle returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'settling', 'festival room settle payload is incomplete')
    assert(Array.isArray(data?.room?.settlement_receipts) && data.room.settlement_receipts.length >= 2, 'festival room settle did not generate per-member receipts')
    assert(data.room.settlement_receipts.every(item => Number(item?.reward_payload?.money) >= 40), 'festival room settle did not generate participation rewards')
    const primaryReceipt = data.room.settlement_receipts.find(item => item?.target_username === sessionState.username)
    const secondaryReceipt = data.room.settlement_receipts.find(item => item?.target_username === secondarySessionState.username)
    festivalPrimaryRewardMoney = Math.max(0, Math.floor(Number(primaryReceipt?.reward_payload?.money) || 0))
    festivalSecondaryRewardMoney = Math.max(0, Math.floor(Number(secondaryReceipt?.reward_payload?.money) || 0))
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/close path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room close returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'closed', 'festival room close payload is incomplete')
    assert(Array.isArray(data?.room?.settlement_receipts) && data.room.settlement_receipts.every(item => item?.status === 'persisted'), 'festival room close did not persist all settlement receipts')
    primaryExpectedMoney += festivalPrimaryRewardMoney
    secondaryExpectedMoney += festivalSecondaryRewardMoney
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/close duplicate guard path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(!response.ok, 'festival room duplicate close should be rejected after room is already closed')
    assert(typeof data?.msg === 'string' && data.msg.includes('已经关闭'), 'festival room duplicate close did not return the expected guard message')
  })

  await runCheck('GET /api/taoyuan/save/:slot festival reward persistence', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `festival reward save readback returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'festival reward save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Math.max(0, Math.floor(Number(decrypted?.player?.money) || 0)) === primaryExpectedMoney, `festival reward did not persist player money correctly, expected money=${primaryExpectedMoney}, current money=${Math.max(0, Math.floor(Number(decrypted?.player?.money) || 0))}`)
    assert(Math.max(0, Math.floor(Number(decrypted?.wallet?.rewardTickets?.festival) || 0)) >= 1, 'festival reward did not grant festival memorial tickets')
    assert(Math.max(0, Math.floor(Number(decrypted?.decoration?.owned?.catalog_lotus_lamp) || 0)) >= 1, 'festival reward did not grant the expected decoration')
  })

  await runCheck('GET /api/taoyuan/online/profile festival title persistence', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/profile')
    assert(response.ok, `festival title profile returned ${response.status}`)
    assert(data?.ok === true && data?.profile?.public_title === '赛舟领桨手', 'festival reward did not update public title')
  })

  await runCheck('GET /api/taoyuan/online/festival/rooms memorial readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(response.ok, `festival memorial readback returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.recent_memorials) && data.recent_memorials.length >= 1, 'festival memorial readback payload is incomplete')
    const latestMemorial = data.recent_memorials[0]
    assert(String(latestMemorial?.template_id || '') === 'dragon_boat', 'festival memorial did not preserve template id')
    assert(String(latestMemorial?.gameplay_template_id || '') === 'squad_coop', 'festival memorial did not preserve gameplay template id')
    const secondaryDisplayName = secondarySessionState.displayName
    assert(Array.isArray(latestMemorial?.squadmate_display_names) && latestMemorial.squadmate_display_names.includes(secondaryDisplayName), 'festival memorial did not preserve squadmate display names')
    assert(Array.isArray(latestMemorial?.squadmate_friend_display_names) && latestMemorial.squadmate_friend_display_names.includes(secondaryDisplayName), 'festival memorial did not preserve friend squadmate list')
    assert(latestMemorial?.photo_taken === true && typeof latestMemorial?.photo_line === 'string' && latestMemorial.photo_line.length >= 4, 'festival memorial did not preserve photo snapshot text')
  })

  await runCheck('DELETE /api/taoyuan/online/social/friends/:friendshipId save id path', async () => {
    assert(friendshipId, 'friendship id is required before delete friend check')
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/social/friends/${encodeURIComponent(friendshipId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `delete friend returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.relation?.friendship_id === friendshipId, 'delete friend payload is incomplete')
    assert(data.relation.own_save_id === primarySaveIdentity.save_id, 'delete friend payload missing own save id')
    assert(data.relation.friend_save_id === secondarySaveIdentity.save_id, 'delete friend payload missing friend save id')

    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/social/relationships')
    assert(primaryOverview.response.ok, `primary relationship overview after delete returned ${primaryOverview.response.status}`)
    assert(!primaryOverview.data?.friends?.some(entry => entry?.friendship_id === friendshipId), 'deleted friendship still appears in primary friend list')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/social/relationships')
    assert(secondaryOverview.response.ok, `secondary relationship overview after delete returned ${secondaryOverview.response.status}`)
    assert(!secondaryOverview.data?.friends?.some(entry => entry?.friendship_id === friendshipId), 'deleted friendship still appears in secondary friend list')

    const secondaryOrders = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOrders.response.ok, `secondary orders after delete returned ${secondaryOrders.response.status}`)
    assert(!secondaryOrders.data?.orders?.some(entry => entry?.title === friendCoopOrderTitle && entry?.scope === 'friends'), 'friend-scope order stayed visible after deleting friendship')
  })

  await runCheck('block relation session bootstrap', async () => {
    await bootstrapSession(blockRelationSessionState, 'smkblock', 180)
    const blockRelationSave = await fetchSessionJson(blockRelationSessionState, '/api/taoyuan/save/0')
    assert(blockRelationSave.response.ok, `block relation save identity read returned ${blockRelationSave.response.status}`)
    blockRelationSaveIdentity = getEmbeddedSaveIdentity(decryptTaoyuanRaw(blockRelationSave.data?.raw || ''))
    assert(blockRelationSaveIdentity?.save_id, 'block relation save identity missing before block setup')
  })

  await runCheck('POST /api/taoyuan/online/orders target save id non-friend reject path', async () => {
    assert(blockRelationSaveIdentity?.save_id, 'block relation save identity missing before targeted coop non-friend check')
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `targeted reject ${Date.now()}`,
        description: 'smoke non friend targeted coop order',
        order_type: 'festival_supply',
        scope: 'friends',
        target_save_id: blockRelationSaveIdentity.save_id,
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'reputation',
        reward_value: 20,
        reward_label: '定向互助声望',
      }),
    })
    assert(response.status === 403, `targeted coop non-friend should return 403, received ${response.status}`)
    assert(data?.ok === false && typeof data?.msg === 'string' && data.msg.includes('好友'), 'targeted coop non-friend reject did not expose friend failure')
  })

  let blockId = ''
  await runCheck('POST /api/taoyuan/online/social/blocks save id path', async () => {
    assert(primarySaveIdentity?.save_id && blockRelationSaveIdentity?.save_id, 'save identities are required before block check')
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/blocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: blockRelationSaveIdentity.save_id,
      }),
    })
    assert(response.ok, `block by save id returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.relation?.block_id, 'block by save id payload is incomplete')
    assert(data.relation.blocker_save_id === primarySaveIdentity.save_id, 'block relation missing blocker save id')
    assert(data.relation.blocked_save_id === blockRelationSaveIdentity.save_id, 'block relation missing blocked save id')
    blockId = String(data.relation.block_id || '')

    const overview = await fetchAuthedJson('/api/taoyuan/online/social/relationships')
    assert(overview.response.ok, `relationship overview after block returned ${overview.response.status}`)
    const blockedUser = overview.data?.blocked_users?.find(entry => entry?.block_id === blockId)
    assert(blockedUser?.own_save_id === primarySaveIdentity.save_id, 'blocked overview missing own save id')
    assert(blockedUser?.blocked_save_id === blockRelationSaveIdentity.save_id, 'blocked overview missing target save id')
    assert(blockedUser?.blocked_save_slot === blockRelationSaveIdentity.save_slot, 'blocked overview missing target save slot')
  })

  await runCheck('POST /api/taoyuan/online/social/friend-requests blocked save id reject path', async () => {
    assert(blockRelationSaveIdentity?.save_id, 'block relation save identity missing before blocked friend request check')
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: blockRelationSaveIdentity.save_id,
      }),
    })
    assert(!response.ok, 'friend request should fail while save-level block exists')
    assert(data?.ok === false && typeof data?.msg === 'string' && data.msg.includes('拉黑'), 'blocked friend request did not expose block failure')
  })

  await runCheck('POST /api/taoyuan/online/social/blocks/unblock save id path', async () => {
    assert(blockRelationSaveIdentity?.save_id && blockId, 'block relation is required before unblock check')
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/blocks/unblock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: blockRelationSaveIdentity.save_id,
      }),
    })
    assert(response.ok, `unblock by save id returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.relation?.block_id === blockId, 'unblock by save id payload is incomplete')
    assert(data.relation.blocker_save_id === primarySaveIdentity.save_id, 'unblock relation missing blocker save id')
    assert(data.relation.blocked_save_id === blockRelationSaveIdentity.save_id, 'unblock relation missing blocked save id')

    const overview = await fetchAuthedJson('/api/taoyuan/online/social/relationships')
    assert(overview.response.ok, `relationship overview after unblock returned ${overview.response.status}`)
    assert(!overview.data?.blocked_users?.some(entry => entry?.block_id === blockId), 'unblocked relation still appears in blocked list')
  })

  await runCheck('POST /api/taoyuan/online/social/friend-requests after unblock path', async () => {
    assert(blockRelationSaveIdentity?.save_id, 'block relation save identity missing before post-unblock friend request check')
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: blockRelationSaveIdentity.save_id,
      }),
    })
    assert(response.ok, `friend request after unblock returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.to_save_id === blockRelationSaveIdentity.save_id, 'friend request after unblock did not preserve target save id')
  })

  await runCheck('GET /api/taoyuan/online/world-events read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/world-events')
    assert(response.ok, `world events overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.events) && data.events.length === 4, 'world events overview payload is incomplete')
    const eventIds = new Set((data?.events || []).map(item => String(item?.id || '')))
    for (const requiredId of ['spring_plowing', 'summer_flood', 'autumn_harvest', 'winter_store']) {
      assert(eventIds.has(requiredId), `world events overview missing event ${requiredId}`)
    }
    assert(data?.current_event && data.current_event.is_current_season === true, 'world events overview did not expose the current season event')
    assert(Array.isArray(data?.current_event?.contribution_actions) && data.current_event.contribution_actions.some(item => item?.can_use === true), 'world events current event did not expose usable actions')
    assert(Array.isArray(data?.world_events) && data.world_events.length >= 6, 'world events overview did not expose L91 scoped events')
    assert(data?.public_goal && typeof data.public_goal.progress_text === 'string', 'world events overview did not expose L92 public goal')
    assert(Array.isArray(data?.public_goal?.milestones) && data.public_goal.milestones.length >= 3, 'world events overview did not expose L92 milestone list')
    assert(Array.isArray(data?.recent_chronicles) && data.recent_chronicles.length >= 1, 'world events overview did not expose L93 chronicles')
    const worldEventDefinitions = new Set((data?.world_events || []).map(item => String(item?.definition_id || '')))
    for (const requiredId of ['global_confluence', 'division_drive', 'neighbor_unity', 'society_convention', 'limited_window', 'random_anomaly']) {
      assert(worldEventDefinitions.has(requiredId), `world events overview missing scoped event ${requiredId}`)
    }
    createdWorldEventId = String(data.current_event.id)
  })

  await runCheck('POST /api/taoyuan/online/world-events/:eventId/contribute primary path', async () => {
    const overview = await fetchAuthedJson('/api/taoyuan/online/world-events')
    assert(overview.response.ok, `world event action overview returned ${overview.response.status}`)
    const action = (overview.data?.current_event?.contribution_actions || []).find(item => Number(item?.progress_delta || 0) >= 3)
      || overview.data?.current_event?.contribution_actions?.[0]
    assert(action?.id, 'world event primary contribute did not expose a usable action')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/world-events/${encodeURIComponent(createdWorldEventId)}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: action.id,
      }),
    })
    assert(response.ok, `world event primary contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.event?.id === createdWorldEventId, 'world event primary contribute payload is incomplete')
    assert(String(data?.event?.state || '') === 'active', `world event should still be active after first contribution, current=${data?.event?.state}`)
    assert(Number(data?.event?.my_contribution?.progress_value || 0) >= Number(action?.progress_delta || 0), 'world event primary contribute did not preserve personal progress')
    primaryExpectedMoney -= Number(action?.cost_money || 0)
  })

  await runCheck('POST /api/taoyuan/online/world-events/:eventId/contribute completion path', async () => {
    const overview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/world-events')
    assert(overview.response.ok, `secondary world events overview returned ${overview.response.status}`)
    const action = (overview.data?.current_event?.contribution_actions || []).find(item => Number(item?.progress_delta || 0) >= 3)
      || overview.data?.current_event?.contribution_actions?.[0]
    assert(action?.id, 'world event completion path did not expose a usable action')

    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/world-events/${encodeURIComponent(createdWorldEventId)}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: action.id,
      }),
    })
    assert(response.ok, `world event completion contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.event?.id === createdWorldEventId, 'world event completion payload is incomplete')
    assert(String(data?.event?.state || '') === 'completed', 'world event did not reach completed state')
    assert(Array.isArray(data?.event?.settlement_receipts) && data.event.settlement_receipts.length >= 2, 'world event completion did not generate per-member receipts')
    assert(data.event.settlement_receipts.every(item => String(item?.status || '') === 'persisted'), 'world event completion did not persist all receipts')
    const primaryReceipt = data.event.settlement_receipts.find(item => item?.target_username === sessionState.username)
    const secondaryReceipt = data.event.settlement_receipts.find(item => item?.target_username === secondarySessionState.username)
    worldEventPrimaryRewardMoney = Math.max(0, Math.floor(Number(primaryReceipt?.reward_payload?.money) || 0))
    worldEventSecondaryRewardMoney = Math.max(0, Math.floor(Number(secondaryReceipt?.reward_payload?.money) || 0))
    secondaryExpectedMoney -= Number(action?.cost_money || 0)
    primaryExpectedMoney += worldEventPrimaryRewardMoney
    secondaryExpectedMoney += worldEventSecondaryRewardMoney
  })

  await runCheck('GET /api/taoyuan/online/world-events completed readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/world-events')
    assert(response.ok, `world event readback returned ${response.status}`)
    assert(data?.ok === true && data?.current_event?.id === createdWorldEventId, 'world event readback payload is incomplete')
    assert(String(data?.current_event?.state || '') === 'completed', `world event did not stay completed, current=${data?.current_event?.state}`)
    assert(Array.isArray(data?.recent_annals) && data.recent_annals.some(item => item?.event_id === createdWorldEventId), 'world event readback did not preserve annal entry')
    assert(Array.isArray(data?.my_records) && data.my_records.some(item => item?.event_id === createdWorldEventId), 'world event readback did not preserve player record')
    assert(Array.isArray(data?.seasonal_badges) && data.seasonal_badges.some(item => item?.event_id === createdWorldEventId), 'world event readback did not preserve player badge')
    assert(Array.isArray(data?.public_goal?.division_awards), 'world event readback did not preserve L92 division awards')
    assert(Array.isArray(data?.recent_chronicles) && data.recent_chronicles.some(item => Array.isArray(item?.annal_summaries) && item.annal_summaries.length >= 1), 'world event readback did not preserve L93 annal summary')

    const secondaryReadback = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/world-events')
    assert(secondaryReadback.response.ok, `secondary world event readback returned ${secondaryReadback.response.status}`)
    assert(Array.isArray(secondaryReadback.data?.my_records) && secondaryReadback.data.my_records.some(item => item?.event_id === createdWorldEventId), 'secondary world event readback did not preserve player record')
    const scopedDefinitions = new Set((data?.world_events || []).map(item => String(item?.definition_id || '')))
    assert(scopedDefinitions.has('global_confluence'), 'world event readback lost global scoped event')
    assert(scopedDefinitions.has('division_drive'), 'world event readback lost division scoped event')
  })

  await runCheck('GET /api/taoyuan/save/:slot world event reward persistence', async () => {
    const primarySave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(primarySave.response.ok, `world event primary save readback returned ${primarySave.response.status}`)
    assert(primarySave.data?.ok === true && typeof primarySave.data?.raw === 'string', 'world event primary save payload is incomplete')
    const primaryDecrypted = decryptTaoyuanRaw(primarySave.data.raw)
    assert(Math.max(0, Math.floor(Number(primaryDecrypted?.player?.money) || 0)) === primaryExpectedMoney, `world event reward did not persist primary money correctly, expected money=${primaryExpectedMoney}, current money=${Math.max(0, Math.floor(Number(primaryDecrypted?.player?.money) || 0))}`)
    assert(Array.isArray(primaryDecrypted?.onlineWorldEvents?.contributionRecords) && primaryDecrypted.onlineWorldEvents.contributionRecords.some(item => item?.event_id === createdWorldEventId), 'world event reward did not persist primary contribution record')

    const secondarySave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(secondarySave.response.ok, `world event secondary save readback returned ${secondarySave.response.status}`)
    assert(secondarySave.data?.ok === true && typeof secondarySave.data?.raw === 'string', 'world event secondary save payload is incomplete')
    const secondaryDecrypted = decryptTaoyuanRaw(secondarySave.data.raw)
    assert(Math.max(0, Math.floor(Number(secondaryDecrypted?.player?.money) || 0)) === secondaryExpectedMoney, `world event reward did not persist secondary money correctly, expected money=${secondaryExpectedMoney}, current money=${Math.max(0, Math.floor(Number(secondaryDecrypted?.player?.money) || 0))}`)
    assert(Array.isArray(secondaryDecrypted?.onlineWorldEvents?.contributionRecords) && secondaryDecrypted.onlineWorldEvents.contributionRecords.some(item => item?.event_id === createdWorldEventId), 'world event reward did not persist secondary contribution record')
  })

  await runCheck('POST /api/taoyuan/online/world-events scoped global path', async () => {
    const overview = await fetchAuthedJson('/api/taoyuan/online/world-events')
    assert(overview.response.ok, `scoped global overview returned ${overview.response.status}`)
    const globalEvent = (overview.data?.world_events || []).find(item => item?.definition_id === 'global_confluence')
    assert(globalEvent?.id, 'scoped global event missing id')
    const action = globalEvent?.contribution_actions?.find(item => Number(item?.progress_delta || 0) === 1) || globalEvent?.contribution_actions?.[0]
    assert(action?.id, 'scoped global event missing action')
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/world-events/${encodeURIComponent(globalEvent.id)}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: action.id,
      }),
    })
    assert(response.ok, `scoped global contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && String(data?.event?.definition_id || '') === 'global_confluence', 'scoped global contribute payload is incomplete')
    primaryExpectedMoney -= Number(action?.cost_money || 0)
  })

  await runCheck('GET /api/taoyuan/online/world-events locked society readback', async () => {
    const overview = await fetchAuthedJson('/api/taoyuan/online/world-events')
    assert(overview.response.ok, `locked society overview returned ${overview.response.status}`)
    const lockedSocietyEvent = (overview.data?.world_events || []).find(item => item?.definition_id === 'society_convention')
    assert(String(lockedSocietyEvent?.state || '') === 'locked', 'society scoped event should be locked before the player joins a society')
  })

  let createdExpeditionRoomId = ''
  let expeditionPrimaryRewardMoney = 0
  let expeditionSecondaryRewardMoney = 0
  await runCheck('GET /api/taoyuan/online/expedition/rooms read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms')
    assert(response.ok, `expedition room overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.templates) && data.templates.length > 0, 'expedition room overview payload is incomplete')
    const templateIds = new Set((data?.templates || []).map(item => String(item?.id || '')))
    for (const requiredId of ['expedition_outpost', 'cavern_duo', 'cavern_trio', 'cavern_quartet', 'gathering_line', 'escort_convoy', 'sea_probe']) {
      assert(templateIds.has(requiredId), `expedition room overview missing template ${requiredId}`)
    }
    const gameplayTemplateIds = new Set((data?.gameplay_templates || []).map(item => String(item?.id || '')))
    for (const requiredId of ['expedition_roles', 'expedition_supply', 'expedition_cavern', 'expedition_gathering', 'expedition_escort', 'expedition_sea']) {
      assert(gameplayTemplateIds.has(requiredId), `expedition room overview missing gameplay template ${requiredId}`)
    }
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: 'expedition_outpost',
        gameplay_template_id: 'expedition_roles',
        title: `smoke 远征房间 ${Date.now()}`,
      }),
    })
    assert(response.ok, `expedition room create returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.id, 'expedition room create payload is incomplete')
    assert(data?.room?.activity_domain === 'expedition', 'expedition room create did not persist activity domain')
    assert(data?.room?.gameplay?.template_id === 'expedition_roles', 'expedition room create did not persist gameplay template id')
    createdExpeditionRoomId = String(data.room.id)
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/invite write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
      }),
    })
    assert(response.ok, `expedition room invite returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const invitation = data?.room?.invitations?.find(item => item?.target_username === secondarySessionState.username)
    assert(data?.ok === true && invitation?.target_save_id === secondarySaveIdentity.save_id, 'expedition room invite did not persist target save id')
    assert(invitation?.target_save_slot === secondarySaveIdentity.save_slot, 'expedition room invite did not persist target save slot')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/join write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/join`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room join returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === secondarySessionState.username && item?.status === 'joined'), 'expedition room join payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/ready-check write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room ready-check returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'ready_check', 'expedition room ready-check payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/ready primary path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room primary ready returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === sessionState.username && item?.status === 'ready'), 'expedition room primary ready payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/ready secondary path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room secondary ready returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === secondarySessionState.username && item?.status === 'ready'), 'expedition room secondary ready payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/start countdown path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room countdown returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'countdown', 'expedition room countdown payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/disconnect path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/disconnect`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room disconnect returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'paused', 'expedition room disconnect payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/reconnect path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/reconnect`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room reconnect returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && ['countdown', 'running'].includes(String(data?.room?.state || '')), 'expedition room reconnect payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/expedition/rooms running readback', async () => {
    await wait(6500)
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms')
    assert(response.ok, `expedition room readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_room?.id === createdExpeditionRoomId, 'expedition room readback payload is incomplete')
    assert(String(data?.my_room?.state || '') === 'running', `expedition room did not reach running state, current=${data?.my_room?.state}`)
    assert(String(data?.my_room?.gameplay?.phase || '') === 'active', `expedition room gameplay did not enter active phase, current=${data?.my_room?.gameplay?.phase}`)
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/action primary path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'assign_scout',
        idempotency_key: 'qa-online-expedition-primary-assign-scout',
      }),
    })
    assert(response.ok, `expedition room gameplay action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.gameplay?.progress_value >= 1, 'expedition room gameplay action did not advance progress')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/action secondary path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'mark_route',
        idempotency_key: 'qa-online-expedition-secondary-mark-route',
      }),
    })
    assert(response.ok, `expedition room secondary gameplay action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.room?.gameplay?.contributions), 'expedition room secondary gameplay action payload is incomplete')
    assert(data.room.gameplay.contributions.some(item => item?.username === secondarySessionState.username && Number(item?.action_count) >= 1), 'expedition room secondary gameplay contribution was not recorded')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/action primary bonus path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'confirm_withdrawal',
        idempotency_key: 'qa-online-expedition-primary-confirm-withdrawal',
      }),
    })
    assert(response.ok, `expedition room primary bonus action returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const primaryContribution = data?.room?.gameplay?.contributions?.find(item => item?.username === sessionState.username)
    assert(Number(primaryContribution?.action_count || 0) >= 2, 'expedition room primary bonus action did not keep host contribution ahead')
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/settle path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room settle returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'settling', 'expedition room settle payload is incomplete')
    assert(Array.isArray(data?.room?.settlement_receipts) && data.room.settlement_receipts.length >= 2, 'expedition room settle did not generate per-member receipts')
    assert(data.room.settlement_receipts.every(item => Number(item?.reward_payload?.money) >= 52), 'expedition room settle did not generate expedition money rewards')
    assert(data.room.settlement_receipts.every(item => Array.isArray(item?.reward_payload?.items) && item.reward_payload.items.length >= 1), 'expedition room settle did not generate expedition item rewards')
    const primaryReceipt = data.room.settlement_receipts.find(item => item?.target_username === sessionState.username)
    const secondaryReceipt = data.room.settlement_receipts.find(item => item?.target_username === secondarySessionState.username)
    expeditionPrimaryRewardMoney = Math.max(0, Math.floor(Number(primaryReceipt?.reward_payload?.money) || 0))
    expeditionSecondaryRewardMoney = Math.max(0, Math.floor(Number(secondaryReceipt?.reward_payload?.money) || 0))
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/close path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `expedition room close returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'closed', 'expedition room close payload is incomplete')
    assert(Array.isArray(data?.room?.settlement_receipts) && data.room.settlement_receipts.every(item => item?.status === 'persisted'), 'expedition room close did not persist all settlement receipts')
    primaryExpectedMoney += expeditionPrimaryRewardMoney
    secondaryExpectedMoney += expeditionSecondaryRewardMoney
  })

  await runCheck('POST /api/taoyuan/online/expedition/rooms/:roomId/close duplicate guard path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(createdExpeditionRoomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(!response.ok, 'expedition room duplicate close should be rejected after room is already closed')
    assert(typeof data?.msg === 'string' && data.msg.includes('已经关闭'), 'expedition room duplicate close did not return the expected guard message')
  })

  await runCheck('GET /api/taoyuan/save/:slot expedition reward persistence', async () => {
    const primarySave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(primarySave.response.ok, `expedition reward primary save readback returned ${primarySave.response.status}`)
    assert(primarySave.data?.ok === true && typeof primarySave.data?.raw === 'string', 'expedition reward primary save payload is incomplete')
    const primaryDecrypted = decryptTaoyuanRaw(primarySave.data.raw)
    assert(Math.max(0, Math.floor(Number(primaryDecrypted?.player?.money) || 0)) === primaryExpectedMoney, `expedition reward did not persist primary player money correctly, expected money=${primaryExpectedMoney}, current money=${Math.max(0, Math.floor(Number(primaryDecrypted?.player?.money) || 0))}`)
    const primaryItems = Array.isArray(primaryDecrypted?.items) ? primaryDecrypted.items : []
    assert(primaryItems.some(item => String(item?.itemId || '') === 'wood' && Number(item?.quantity || 0) >= 2), 'expedition reward did not persist primary expedition wood reward')
    assert(primaryItems.some(item => String(item?.itemId || '') === 'paper' && Number(item?.quantity || 0) >= 1), 'expedition reward did not persist primary expedition paper reward')

    const secondarySave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(secondarySave.response.ok, `expedition reward secondary save readback returned ${secondarySave.response.status}`)
    assert(secondarySave.data?.ok === true && typeof secondarySave.data?.raw === 'string', 'expedition reward secondary save payload is incomplete')
    const secondaryDecrypted = decryptTaoyuanRaw(secondarySave.data.raw)
    assert(Math.max(0, Math.floor(Number(secondaryDecrypted?.player?.money) || 0)) === secondaryExpectedMoney, `expedition reward did not persist secondary player money correctly, expected money=${secondaryExpectedMoney}, current money=${Math.max(0, Math.floor(Number(secondaryDecrypted?.player?.money) || 0))}`)
    const secondaryItems = Array.isArray(secondaryDecrypted?.items) ? secondaryDecrypted.items : []
    assert(secondaryItems.some(item => String(item?.itemId || '') === 'wood' && Number(item?.quantity || 0) >= 2), 'expedition reward did not persist secondary expedition wood reward')
    assert(secondaryItems.some(item => String(item?.itemId || '') === 'paper' && Number(item?.quantity || 0) >= 1), 'expedition reward did not persist secondary expedition paper reward')
  })

  let l81MemberAExpectedMoney = 320
  let l81MemberBExpectedMoney = 340
  let l81MemberCExpectedMoney = 360
  await runCheck('L81 helper session bootstrap', async () => {
    await bootstrapSession(l81MemberAState, 'smk81a', l81MemberAExpectedMoney)
    await bootstrapSession(l81MemberBState, 'smk81b', l81MemberBExpectedMoney)
    await bootstrapSession(l81MemberCState, 'smk81c', l81MemberCExpectedMoney)
  })

  const l81ReadSave = async (session, label) => {
    const result = session === sessionState
      ? await fetchAuthedJson('/api/taoyuan/save/0')
      : await fetchSessionJson(session, '/api/taoyuan/save/0')
    assert(result.response.ok, `${label} save read returned ${result.response.status}`)
    assert(result.data?.ok === true && typeof result.data?.raw === 'string', `${label} save payload is incomplete`)
    return decryptTaoyuanRaw(result.data.raw)
  }

  const l81GetExpectedMoney = session => {
    if (session === sessionState) return primaryExpectedMoney
    if (session === l81MemberAState) return l81MemberAExpectedMoney
    if (session === l81MemberBState) return l81MemberBExpectedMoney
    if (session === l81MemberCState) return l81MemberCExpectedMoney
    throw new Error(`unexpected L81 session ${session?.username || 'unknown'}`)
  }

  const l81AddExpectedMoney = (session, delta) => {
    if (session === sessionState) {
      primaryExpectedMoney += delta
      return
    }
    if (session === l81MemberAState) {
      l81MemberAExpectedMoney += delta
      return
    }
    if (session === l81MemberBState) {
      l81MemberBExpectedMoney += delta
      return
    }
    if (session === l81MemberCState) {
      l81MemberCExpectedMoney += delta
      return
    }
    throw new Error(`unexpected L81 session ${session?.username || 'unknown'}`)
  }

  const l81GetReceiptItemQuantity = (receipt, itemId) => (Array.isArray(receipt?.reward_payload?.items) ? receipt.reward_payload.items : [])
    .filter(entry => entry?.item_id === itemId)
    .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)

  const l81CaptureRewardCounts = (decryptedSave, items) => Object.fromEntries(
    items.map(item => [item.itemId, getRewardItemQuantity(decryptedSave, item.itemId)])
  )

  const l81AssertRewardGrowth = (afterSave, beforeCounts, items, label) => {
    for (const item of items) {
      const currentQuantity = getRewardItemQuantity(afterSave, item.itemId)
      const previousQuantity = Number(beforeCounts[item.itemId] || 0)
      assert(
        currentQuantity >= previousQuantity + item.quantity,
        `${label} did not persist ${item.itemId} correctly, expected at least ${previousQuantity + item.quantity}, current=${currentQuantity}`
      )
    }
  }

  const l81SubmitAction = async (session, roomId, actionId, label) => {
    const { response, data } = await fetchSessionJson(session, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_id: actionId,
        idempotency_key: `qa-online-l81-action-${roomId}-${session.username}-${actionId}-${Date.now()}`,
      }),
    })
    assert(response.ok, `${label} returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.id === roomId, `${label} payload is incomplete`)
    return data.room
  }

  const runL81CavernScenario = async ({
    label,
    templateId,
    expectedMemberLimit,
    participants,
    baseRewardItems,
    hostExpectedItems,
    leadParticipantExpectedItems,
    bonusRewardItemId,
  }) => {
    const beforeHostSave = await l81ReadSave(sessionState, `${label} host before`)
    const beforeLeadSave = participants[0] ? await l81ReadSave(participants[0], `${label} lead before`) : null
    const beforeHostCounts = l81CaptureRewardCounts(beforeHostSave, hostExpectedItems)
    const beforeLeadCounts = beforeLeadSave ? l81CaptureRewardCounts(beforeLeadSave, leadParticipantExpectedItems) : {}

    const { response: createResponse, data: createData } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        template_id: templateId,
        gameplay_template_id: 'expedition_cavern',
        countdown_seconds: 1,
        title: `${label} ${Date.now()}`,
      }),
    })
    assert(createResponse.ok, `${label} create returned ${createResponse.status}: ${createData?.msg || 'unknown error'}`)
    assert(createData?.ok === true && createData?.room?.id, `${label} create payload is incomplete`)
    assert(String(createData?.room?.template_id || '') === templateId, `${label} create did not preserve template id`)
    assert(Number(createData?.room?.member_limit || 0) === expectedMemberLimit, `${label} create did not preserve member limit ${expectedMemberLimit}`)
    assert(String(createData?.room?.gameplay?.template_id || '') === 'expedition_cavern', `${label} create did not preserve expedition_cavern gameplay template`)
    const roomId = String(createData.room.id)

    for (const participant of participants) {
      const inviteResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionState.csrfToken,
        },
        body: JSON.stringify({
          target_username: participant.username,
        }),
      })
      assert(inviteResponse.response.ok, `${label} invite ${participant.username} returned ${inviteResponse.response.status}: ${inviteResponse.data?.msg || 'unknown error'}`)
      assert(inviteResponse.data?.ok === true, `${label} invite ${participant.username} payload is incomplete`)
    }

    for (const participant of participants) {
      const joinResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
      })
      assert(joinResponse.response.ok, `${label} join ${participant.username} returned ${joinResponse.response.status}: ${joinResponse.data?.msg || 'unknown error'}`)
      assert(joinResponse.data?.ok === true && joinResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'joined'), `${label} join ${participant.username} payload is incomplete`)
    }

    const readyCheckResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(readyCheckResponse.response.ok, `${label} ready-check returned ${readyCheckResponse.response.status}: ${readyCheckResponse.data?.msg || 'unknown error'}`)
    assert(String(readyCheckResponse.data?.room?.state || '') === 'ready_check', `${label} room did not enter ready_check`)

    const hostReadyResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(hostReadyResponse.response.ok, `${label} host ready returned ${hostReadyResponse.response.status}: ${hostReadyResponse.data?.msg || 'unknown error'}`)

    for (const participant of participants) {
      const readyResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
        method: 'POST',
      })
      assert(readyResponse.response.ok, `${label} ready ${participant.username} returned ${readyResponse.response.status}: ${readyResponse.data?.msg || 'unknown error'}`)
      assert(readyResponse.data?.ok === true && readyResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'ready'), `${label} ready ${participant.username} payload is incomplete`)
    }

    const startResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(startResponse.response.ok, `${label} countdown returned ${startResponse.response.status}: ${startResponse.data?.msg || 'unknown error'}`)
    assert(['countdown', 'running'].includes(String(startResponse.data?.room?.state || '')), `${label} room did not enter countdown or running, current=${startResponse.data?.room?.state}`)

    await wait(2200)
    const runningReadback = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms')
    assert(runningReadback.response.ok, `${label} running readback returned ${runningReadback.response.status}`)
    assert(runningReadback.data?.ok === true && runningReadback.data?.my_room?.id === roomId, `${label} running readback payload is incomplete`)
    assert(String(runningReadback.data?.my_room?.state || '') === 'running', `${label} room did not reach running state, current=${runningReadback.data?.my_room?.state}`)
    assert(String(runningReadback.data?.my_room?.template_id || '') === templateId, `${label} running readback lost template id`)
    assert(Number(runningReadback.data?.my_room?.member_limit || 0) === expectedMemberLimit, `${label} running readback lost member limit`)
    assert(Number(runningReadback.data?.my_room?.joined_member_count || 0) === expectedMemberLimit, `${label} running readback did not preserve joined member count`)
    assert(String(runningReadback.data?.my_room?.gameplay?.template_id || '') === 'expedition_cavern', `${label} running readback lost expedition_cavern gameplay template`)
    const availableActionIds = new Set((runningReadback.data?.my_room?.gameplay?.available_actions || []).map(entry => String(entry?.id || '')))
    for (const actionId of ['split_mine', 'chalk_route', 'stabilize_collapse']) {
      assert(availableActionIds.has(actionId), `${label} available actions missing ${actionId}`)
    }
    const cavernState = runningReadback.data?.my_room?.gameplay?.cavern_state
    assert(Number(cavernState?.round_number || 0) === 1, `${label} cavern state did not start at round 1`)
    assert(String(cavernState?.current_event?.id || '') !== '', `${label} cavern state missing current event`)
    assert(Array.isArray(cavernState?.team_resources) && cavernState.team_resources.length > 0, `${label} cavern state missing team resources`)
    assert(Array.isArray(cavernState?.role_assignments) && cavernState.role_assignments.length === expectedMemberLimit, `${label} cavern state missing role assignments`)
    assert(String(cavernState?.recent_feedback || '').includes('回合'), `${label} cavern state missing round feedback`)
    const splitMineAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'split_mine')
    assert(String(splitMineAction?.required_role_label || '') !== '', `${label} split_mine action missing required role label`)
    assert(String(splitMineAction?.resource_delta_text || '') !== '', `${label} split_mine action missing resource delta text`)
    assert(String(splitMineAction?.round_effect || '') !== '', `${label} split_mine action missing round effect`)

    let actionRoom = await l81SubmitAction(sessionState, roomId, 'split_mine', `${label} host split_mine`)
    actionRoom = await l81SubmitAction(participants[0], roomId, 'chalk_route', `${label} lead chalk_route`)
    if (participants[1]) {
      actionRoom = await l81SubmitAction(participants[1], roomId, 'stabilize_collapse', `${label} support stabilize_collapse`)
    } else {
      actionRoom = await l81SubmitAction(sessionState, roomId, 'stabilize_collapse', `${label} host stabilize_collapse`)
    }
    if (participants[2]) {
      actionRoom = await l81SubmitAction(participants[2], roomId, 'split_mine', `${label} fourth split_mine`)
    }
    actionRoom = await l81SubmitAction(sessionState, roomId, 'chalk_route', `${label} host chalk_route`)
    actionRoom = await l81SubmitAction(sessionState, roomId, 'split_mine', `${label} host final split_mine`)

    const hostContribution = actionRoom?.gameplay?.contributions?.find(entry => entry?.username === sessionState.username)
    assert(Number(hostContribution?.action_count || 0) >= 3, `${label} host contribution did not stay ahead`)
    const cavernRoundState = actionRoom?.gameplay?.cavern_state
    assert(Number(cavernRoundState?.round_number || 0) >= 3, `${label} cavern state did not advance across rounds`)
    assert(String(cavernRoundState?.current_event?.label || '') !== '', `${label} cavern state lost current event after actions`)
    assert(Array.isArray(cavernRoundState?.round_log) && cavernRoundState.round_log.length > 0, `${label} cavern state missing round log`)
    assert(Array.isArray(cavernRoundState?.role_assignments) && cavernRoundState.role_assignments.length === expectedMemberLimit, `${label} cavern state lost role assignments after actions`)
    assert(String(cavernRoundState?.recent_feedback || '').includes('回合'), `${label} cavern state missing latest feedback`)
    const recentEventSummaries = Array.isArray(actionRoom?.recent_events) ? actionRoom.recent_events.map(entry => String(entry?.summary || '')) : []
    assert(recentEventSummaries.some(summary => summary.includes('分工采集')), `${label} room events did not preserve split_mine summary`)
    assert(recentEventSummaries.some(summary => summary.includes('白路标记')), `${label} room events did not preserve chalk_route summary`)
    assert(recentEventSummaries.some(summary => summary.includes('处理危机')), `${label} room events did not preserve stabilize_collapse summary`)

    const settleResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(settleResponse.response.ok, `${label} settle returned ${settleResponse.response.status}: ${settleResponse.data?.msg || 'unknown error'}`)
    assert(String(settleResponse.data?.room?.state || '') === 'settling', `${label} room did not enter settling`)
    assert(Array.isArray(settleResponse.data?.room?.settlement_receipts) && settleResponse.data.room.settlement_receipts.length === expectedMemberLimit, `${label} settle did not create ${expectedMemberLimit} receipts`)
    for (const rewardItem of baseRewardItems) {
      assert(
        settleResponse.data.room.settlement_receipts.every(receipt => l81GetReceiptItemQuantity(receipt, rewardItem.itemId) >= rewardItem.quantity),
        `${label} settle did not preserve template base reward ${rewardItem.itemId}`
      )
    }
    assert(
      settleResponse.data.room.settlement_receipts.some(receipt => l81GetReceiptItemQuantity(receipt, bonusRewardItemId) >= 1),
      `${label} settle did not preserve template bonus reward ${bonusRewardItemId}`
    )

    const receiptByUsername = new Map(settleResponse.data.room.settlement_receipts.map(receipt => [String(receipt?.target_username || ''), receipt]))
    for (const participant of [sessionState, ...participants]) {
      const receipt = receiptByUsername.get(participant.username)
      assert(receipt, `${label} settle did not keep receipt for ${participant.username}`)
      l81AddExpectedMoney(participant, Math.max(0, Math.floor(Number(receipt?.reward_payload?.money) || 0)))
    }

    const closeResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(closeResponse.response.ok, `${label} close returned ${closeResponse.response.status}: ${closeResponse.data?.msg || 'unknown error'}`)
    assert(String(closeResponse.data?.room?.state || '') === 'closed', `${label} room did not close cleanly`)
    assert(Array.isArray(closeResponse.data?.room?.settlement_receipts) && closeResponse.data.room.settlement_receipts.every(receipt => receipt?.status === 'persisted'), `${label} close did not persist all receipts`)

    const afterHostSave = await l81ReadSave(sessionState, `${label} host after`)
    assert(Math.floor(Number(afterHostSave?.player?.money) || 0) === l81GetExpectedMoney(sessionState), `${label} host money did not persist correctly, expected money=${l81GetExpectedMoney(sessionState)}, current money=${Math.floor(Number(afterHostSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterHostSave, beforeHostCounts, hostExpectedItems, `${label} host reward`)

    if (participants[0]) {
      const afterLeadSave = await l81ReadSave(participants[0], `${label} lead after`)
      assert(Math.floor(Number(afterLeadSave?.player?.money) || 0) === l81GetExpectedMoney(participants[0]), `${label} lead member money did not persist correctly, expected money=${l81GetExpectedMoney(participants[0])}, current money=${Math.floor(Number(afterLeadSave?.player?.money) || 0)}`)
      l81AssertRewardGrowth(afterLeadSave, beforeLeadCounts, leadParticipantExpectedItems, `${label} lead member reward`)
    }

    for (const participant of participants.slice(1)) {
      const afterSave = await l81ReadSave(participant, `${label} member after`)
      assert(Math.floor(Number(afterSave?.player?.money) || 0) === l81GetExpectedMoney(participant), `${label} member ${participant.username} money did not persist correctly, expected money=${l81GetExpectedMoney(participant)}, current money=${Math.floor(Number(afterSave?.player?.money) || 0)}`)
    }
  }

  await runCheck('L81 cavern_duo专项回归', async () => {
    await runL81CavernScenario({
      label: 'L81 双人矿洞',
      templateId: 'cavern_duo',
      expectedMemberLimit: 2,
      participants: [l81MemberAState],
      baseRewardItems: [
        { itemId: 'stone', quantity: 2 },
      ],
      hostExpectedItems: [
        { itemId: 'stone', quantity: 2 },
        { itemId: 'ancient_waybill', quantity: 1 },
      ],
      leadParticipantExpectedItems: [
        { itemId: 'stone', quantity: 2 },
      ],
      bonusRewardItemId: 'ancient_waybill',
    })
  })

  await runCheck('L81 cavern_trio专项回归', async () => {
    await runL81CavernScenario({
      label: 'L81 三人矿洞',
      templateId: 'cavern_trio',
      expectedMemberLimit: 3,
      participants: [l81MemberAState, l81MemberBState],
      baseRewardItems: [
        { itemId: 'stone', quantity: 2 },
        { itemId: 'paper', quantity: 1 },
      ],
      hostExpectedItems: [
        { itemId: 'stone', quantity: 2 },
        { itemId: 'paper', quantity: 1 },
        { itemId: 'archive_rubbing', quantity: 1 },
      ],
      leadParticipantExpectedItems: [
        { itemId: 'stone', quantity: 2 },
        { itemId: 'paper', quantity: 1 },
      ],
      bonusRewardItemId: 'archive_rubbing',
    })
  })

  await runCheck('L81 cavern_quartet专项回归', async () => {
    await runL81CavernScenario({
      label: 'L81 四人矿洞',
      templateId: 'cavern_quartet',
      expectedMemberLimit: 4,
      participants: [l81MemberAState, l81MemberBState, l81MemberCState],
      baseRewardItems: [
        { itemId: 'stone', quantity: 3 },
      ],
      hostExpectedItems: [
        { itemId: 'stone', quantity: 3 },
        { itemId: 'ley_crystal_shard', quantity: 1 },
      ],
      leadParticipantExpectedItems: [
        { itemId: 'stone', quantity: 3 },
      ],
      bonusRewardItemId: 'ley_crystal_shard',
    })
  })

  const runL82GatheringScenario = async () => {
    const templateId = 'gathering_line'
    const expectedMemberLimit = 4
    const participants = [l81MemberAState, l81MemberBState, l81MemberCState]
    const beforeHostSave = await l81ReadSave(sessionState, 'L82 host before')
    const beforeLeadSave = await l81ReadSave(participants[0], 'L82 lead before')
    const hostExpectedItems = [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'herb', quantity: 2 },
      { itemId: 'marsh_spore_sample', quantity: 1 },
    ]
    const memberExpectedItems = [
      { itemId: 'wood', quantity: 2 },
      { itemId: 'herb', quantity: 2 },
    ]
    const beforeHostCounts = l81CaptureRewardCounts(beforeHostSave, hostExpectedItems)
    const beforeLeadCounts = l81CaptureRewardCounts(beforeLeadSave, memberExpectedItems)

    const { response: createResponse, data: createData } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        template_id: templateId,
        gameplay_template_id: 'expedition_gathering',
        countdown_seconds: 1,
        title: `L82 协作采集 ${Date.now()}`,
      }),
    })
    assert(createResponse.ok, `L82 create returned ${createResponse.status}: ${createData?.msg || 'unknown error'}`)
    assert(createData?.ok === true && createData?.room?.id, 'L82 create payload is incomplete')
    assert(String(createData?.room?.template_id || '') === templateId, 'L82 create did not preserve template id')
    assert(Number(createData?.room?.member_limit || 0) === expectedMemberLimit, `L82 create did not preserve member limit ${expectedMemberLimit}`)
    assert(String(createData?.room?.gameplay?.template_id || '') === 'expedition_gathering', 'L82 create did not preserve expedition_gathering gameplay template')
    const roomId = String(createData.room.id)

    for (const participant of participants) {
      const inviteResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionState.csrfToken,
        },
        body: JSON.stringify({
          target_username: participant.username,
        }),
      })
      assert(inviteResponse.response.ok, `L82 invite ${participant.username} returned ${inviteResponse.response.status}: ${inviteResponse.data?.msg || 'unknown error'}`)
      assert(inviteResponse.data?.ok === true, `L82 invite ${participant.username} payload is incomplete`)
    }

    for (const participant of participants) {
      const joinResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
      })
      assert(joinResponse.response.ok, `L82 join ${participant.username} returned ${joinResponse.response.status}: ${joinResponse.data?.msg || 'unknown error'}`)
      assert(joinResponse.data?.ok === true && joinResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'joined'), `L82 join ${participant.username} payload is incomplete`)
    }

    const readyCheckResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(readyCheckResponse.response.ok, `L82 ready-check returned ${readyCheckResponse.response.status}: ${readyCheckResponse.data?.msg || 'unknown error'}`)
    assert(String(readyCheckResponse.data?.room?.state || '') === 'ready_check', 'L82 room did not enter ready_check')

    const hostReadyResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(hostReadyResponse.response.ok, `L82 host ready returned ${hostReadyResponse.response.status}: ${hostReadyResponse.data?.msg || 'unknown error'}`)

    for (const participant of participants) {
      const readyResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
        method: 'POST',
      })
      assert(readyResponse.response.ok, `L82 ready ${participant.username} returned ${readyResponse.response.status}: ${readyResponse.data?.msg || 'unknown error'}`)
      assert(readyResponse.data?.ok === true && readyResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'ready'), `L82 ready ${participant.username} payload is incomplete`)
    }

    const startResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(startResponse.response.ok, `L82 countdown returned ${startResponse.response.status}: ${startResponse.data?.msg || 'unknown error'}`)
    assert(['countdown', 'running'].includes(String(startResponse.data?.room?.state || '')), `L82 room did not enter countdown or running, current=${startResponse.data?.room?.state}`)

    await wait(2200)
    const runningReadback = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms')
    assert(runningReadback.response.ok, `L82 running readback returned ${runningReadback.response.status}`)
    assert(runningReadback.data?.ok === true && runningReadback.data?.my_room?.id === roomId, 'L82 running readback payload is incomplete')
    assert(String(runningReadback.data?.my_room?.state || '') === 'running', `L82 room did not reach running state, current=${runningReadback.data?.my_room?.state}`)
    assert(String(runningReadback.data?.my_room?.template_id || '') === templateId, 'L82 running readback lost template id')
    assert(Number(runningReadback.data?.my_room?.member_limit || 0) === expectedMemberLimit, 'L82 running readback lost member limit')
    assert(Number(runningReadback.data?.my_room?.joined_member_count || 0) === expectedMemberLimit, 'L82 running readback did not preserve joined member count')
    assert(String(runningReadback.data?.my_room?.gameplay?.template_id || '') === 'expedition_gathering', 'L82 running readback lost expedition_gathering gameplay template')
    const availableActionIds = new Set((runningReadback.data?.my_room?.gameplay?.available_actions || []).map(entry => String(entry?.id || '')))
    for (const actionId of ['line_gather', 'sync_bundle', 'rare_find']) {
      assert(availableActionIds.has(actionId), `L82 available actions missing ${actionId}`)
    }
    const lineGatherAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'line_gather')
    const syncBundleAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'sync_bundle')
    const rareFindAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'rare_find')
    assert(lineGatherAction?.required_role === 'miner' && String(lineGatherAction?.round_effect || ''), 'L82 line_gather did not expose common action protocol fields')
    assert(syncBundleAction?.required_role === 'scout' && String(syncBundleAction?.round_effect || ''), 'L82 sync_bundle did not expose common action protocol fields')
    assert(rareFindAction?.required_role === 'support' && String(rareFindAction?.round_effect || ''), 'L82 rare_find did not expose common action protocol fields')

    let actionRoom = await l81SubmitAction(sessionState, roomId, 'line_gather', 'L82 host line_gather')
    actionRoom = await l81SubmitAction(participants[0], roomId, 'sync_bundle', 'L82 lead sync_bundle')
    actionRoom = await l81SubmitAction(participants[1], roomId, 'rare_find', 'L82 support rare_find')
    actionRoom = await l81SubmitAction(participants[2], roomId, 'line_gather', 'L82 fourth line_gather')
    actionRoom = await l81SubmitAction(sessionState, roomId, 'sync_bundle', 'L82 host sync_bundle')
    actionRoom = await l81SubmitAction(sessionState, roomId, 'rare_find', 'L82 host rare_find')

    const hostContribution = actionRoom?.gameplay?.contributions?.find(entry => entry?.username === sessionState.username)
    assert(Number(hostContribution?.action_count || 0) >= 3, 'L82 host contribution did not stay ahead')
    const recentEventSummaries = Array.isArray(actionRoom?.recent_events) ? actionRoom.recent_events.map(entry => String(entry?.summary || '')) : []
    assert(recentEventSummaries.some(summary => summary.includes('组队采集')), 'L82 room events did not preserve line_gather summary')
    assert(recentEventSummaries.some(summary => summary.includes('共享进度')), 'L82 room events did not preserve sync_bundle summary')
    assert(recentEventSummaries.some(summary => summary.includes('稀有材料')), 'L82 room events did not preserve rare_find summary')

    const settleResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(settleResponse.response.ok, `L82 settle returned ${settleResponse.response.status}: ${settleResponse.data?.msg || 'unknown error'}`)
    assert(String(settleResponse.data?.room?.state || '') === 'settling', 'L82 room did not enter settling')
    assert(Array.isArray(settleResponse.data?.room?.settlement_receipts) && settleResponse.data.room.settlement_receipts.length === expectedMemberLimit, 'L82 settle did not create 4 receipts')
    assert(settleResponse.data.room.settlement_receipts.every(receipt => l81GetReceiptItemQuantity(receipt, 'wood') >= 2), 'L82 settle did not preserve wood reward')
    assert(settleResponse.data.room.settlement_receipts.every(receipt => l81GetReceiptItemQuantity(receipt, 'herb') >= 2), 'L82 settle did not preserve herb reward')
    assert(settleResponse.data.room.settlement_receipts.some(receipt => l81GetReceiptItemQuantity(receipt, 'marsh_spore_sample') >= 1), 'L82 settle did not preserve marsh_spore_sample reward')

    const receiptByUsername = new Map(settleResponse.data.room.settlement_receipts.map(receipt => [String(receipt?.target_username || ''), receipt]))
    for (const participant of [sessionState, ...participants]) {
      const receipt = receiptByUsername.get(participant.username)
      assert(receipt, `L82 settle did not keep receipt for ${participant.username}`)
      l81AddExpectedMoney(participant, Math.max(0, Math.floor(Number(receipt?.reward_payload?.money) || 0)))
    }

    const closeResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(closeResponse.response.ok, `L82 close returned ${closeResponse.response.status}: ${closeResponse.data?.msg || 'unknown error'}`)
    assert(String(closeResponse.data?.room?.state || '') === 'closed', 'L82 room did not close cleanly')
    assert(Array.isArray(closeResponse.data?.room?.settlement_receipts) && closeResponse.data.room.settlement_receipts.every(receipt => receipt?.status === 'persisted'), 'L82 close did not persist all receipts')

    const afterHostSave = await l81ReadSave(sessionState, 'L82 host after')
    assert(Math.floor(Number(afterHostSave?.player?.money) || 0) === l81GetExpectedMoney(sessionState), `L82 host money did not persist correctly, expected money=${l81GetExpectedMoney(sessionState)}, current money=${Math.floor(Number(afterHostSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterHostSave, beforeHostCounts, hostExpectedItems, 'L82 host reward')

    const afterLeadSave = await l81ReadSave(participants[0], 'L82 lead after')
    assert(Math.floor(Number(afterLeadSave?.player?.money) || 0) === l81GetExpectedMoney(participants[0]), `L82 lead member money did not persist correctly, expected money=${l81GetExpectedMoney(participants[0])}, current money=${Math.floor(Number(afterLeadSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterLeadSave, beforeLeadCounts, memberExpectedItems, 'L82 lead member reward')

    for (const participant of participants.slice(1)) {
      const afterSave = await l81ReadSave(participant, 'L82 member after')
      assert(Math.floor(Number(afterSave?.player?.money) || 0) === l81GetExpectedMoney(participant), `L82 member ${participant.username} money did not persist correctly, expected money=${l81GetExpectedMoney(participant)}, current money=${Math.floor(Number(afterSave?.player?.money) || 0)}`)
    }
  }

  await runCheck('L82 gathering_line专项回归', async () => {
    await runL82GatheringScenario()
  })

  const runL83EscortScenario = async () => {
    const templateId = 'escort_convoy'
    const expectedMemberLimit = 4
    const participants = [l81MemberAState, l81MemberBState, l81MemberCState]
    const beforeHostSave = await l81ReadSave(sessionState, 'L83 host before')
    const beforeLeadSave = await l81ReadSave(participants[0], 'L83 lead before')
    const hostExpectedItems = [
      { itemId: 'paper', quantity: 2 },
      { itemId: 'wood', quantity: 1 },
      { itemId: 'ancient_waybill', quantity: 1 },
    ]
    const memberExpectedItems = [
      { itemId: 'paper', quantity: 2 },
      { itemId: 'wood', quantity: 1 },
    ]
    const beforeHostCounts = l81CaptureRewardCounts(beforeHostSave, hostExpectedItems)
    const beforeLeadCounts = l81CaptureRewardCounts(beforeLeadSave, memberExpectedItems)

    const { response: createResponse, data: createData } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        template_id: templateId,
        gameplay_template_id: 'expedition_escort',
        countdown_seconds: 1,
        title: `L83 护送押运 ${Date.now()}`,
      }),
    })
    assert(createResponse.ok, `L83 create returned ${createResponse.status}: ${createData?.msg || 'unknown error'}`)
    assert(createData?.ok === true && createData?.room?.id, 'L83 create payload is incomplete')
    assert(String(createData?.room?.template_id || '') === templateId, 'L83 create did not preserve template id')
    assert(Number(createData?.room?.member_limit || 0) === expectedMemberLimit, `L83 create did not preserve member limit ${expectedMemberLimit}`)
    assert(String(createData?.room?.gameplay?.template_id || '') === 'expedition_escort', 'L83 create did not preserve expedition_escort gameplay template')
    const roomId = String(createData.room.id)

    for (const participant of participants) {
      const inviteResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionState.csrfToken,
        },
        body: JSON.stringify({
          target_username: participant.username,
        }),
      })
      assert(inviteResponse.response.ok, `L83 invite ${participant.username} returned ${inviteResponse.response.status}: ${inviteResponse.data?.msg || 'unknown error'}`)
      assert(inviteResponse.data?.ok === true, `L83 invite ${participant.username} payload is incomplete`)
    }

    for (const participant of participants) {
      const joinResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
      })
      assert(joinResponse.response.ok, `L83 join ${participant.username} returned ${joinResponse.response.status}: ${joinResponse.data?.msg || 'unknown error'}`)
      assert(joinResponse.data?.ok === true && joinResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'joined'), `L83 join ${participant.username} payload is incomplete`)
    }

    const readyCheckResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(readyCheckResponse.response.ok, `L83 ready-check returned ${readyCheckResponse.response.status}: ${readyCheckResponse.data?.msg || 'unknown error'}`)
    assert(String(readyCheckResponse.data?.room?.state || '') === 'ready_check', 'L83 room did not enter ready_check')

    const hostReadyResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(hostReadyResponse.response.ok, `L83 host ready returned ${hostReadyResponse.response.status}: ${hostReadyResponse.data?.msg || 'unknown error'}`)

    for (const participant of participants) {
      const readyResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
        method: 'POST',
      })
      assert(readyResponse.response.ok, `L83 ready ${participant.username} returned ${readyResponse.response.status}: ${readyResponse.data?.msg || 'unknown error'}`)
      assert(readyResponse.data?.ok === true && readyResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'ready'), `L83 ready ${participant.username} payload is incomplete`)
    }

    const startResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(startResponse.response.ok, `L83 countdown returned ${startResponse.response.status}: ${startResponse.data?.msg || 'unknown error'}`)
    assert(['countdown', 'running'].includes(String(startResponse.data?.room?.state || '')), `L83 room did not enter countdown or running, current=${startResponse.data?.room?.state}`)

    await wait(2200)
    const runningReadback = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms')
    assert(runningReadback.response.ok, `L83 running readback returned ${runningReadback.response.status}`)
    assert(runningReadback.data?.ok === true && runningReadback.data?.my_room?.id === roomId, 'L83 running readback payload is incomplete')
    assert(String(runningReadback.data?.my_room?.state || '') === 'running', `L83 room did not reach running state, current=${runningReadback.data?.my_room?.state}`)
    assert(String(runningReadback.data?.my_room?.template_id || '') === templateId, 'L83 running readback lost template id')
    assert(Number(runningReadback.data?.my_room?.member_limit || 0) === expectedMemberLimit, 'L83 running readback lost member limit')
    assert(Number(runningReadback.data?.my_room?.joined_member_count || 0) === expectedMemberLimit, 'L83 running readback did not preserve joined member count')
    assert(String(runningReadback.data?.my_room?.gameplay?.template_id || '') === 'expedition_escort', 'L83 running readback lost expedition_escort gameplay template')
    const availableActionIds = new Set((runningReadback.data?.my_room?.gameplay?.available_actions || []).map(entry => String(entry?.id || '')))
    for (const actionId of ['escort_step', 'stabilize_cargo', 'answer_incident']) {
      assert(availableActionIds.has(actionId), `L83 available actions missing ${actionId}`)
    }

    const escortStepAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'escort_step')
    const stabilizeCargoAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'stabilize_cargo')
    const answerIncidentAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'answer_incident')
    assert(escortStepAction?.required_role === 'miner' && String(escortStepAction?.round_effect || ''), 'L83 escort_step did not expose common action protocol fields')
    assert(stabilizeCargoAction?.required_role === 'support' && String(stabilizeCargoAction?.round_effect || ''), 'L83 stabilize_cargo did not expose common action protocol fields')
    assert(answerIncidentAction?.required_role === 'scout' && String(answerIncidentAction?.round_effect || ''), 'L83 answer_incident did not expose common action protocol fields')

    let actionRoom = await l81SubmitAction(sessionState, roomId, 'escort_step', 'L83 host escort_step')
    actionRoom = await l81SubmitAction(participants[0], roomId, 'answer_incident', 'L83 lead answer_incident')
    actionRoom = await l81SubmitAction(participants[1], roomId, 'stabilize_cargo', 'L83 support stabilize_cargo')
    actionRoom = await l81SubmitAction(participants[2], roomId, 'escort_step', 'L83 fourth escort_step')
    actionRoom = await l81SubmitAction(sessionState, roomId, 'stabilize_cargo', 'L83 host stabilize_cargo')

    const hostContribution = actionRoom?.gameplay?.contributions?.find(entry => entry?.username === sessionState.username)
    assert(Number(hostContribution?.action_count || 0) >= 2, 'L83 host contribution did not stay ahead')
    const recentEventSummaries = Array.isArray(actionRoom?.recent_events) ? actionRoom.recent_events.map(entry => String(entry?.summary || '')) : []
    assert(recentEventSummaries.some(summary => summary.includes('护送推进')), 'L83 room events did not preserve escort_step summary')
    assert(recentEventSummaries.some(summary => summary.includes('稳固货物')), 'L83 room events did not preserve stabilize_cargo summary')
    assert(recentEventSummaries.some(summary => summary.includes('途中事件')), 'L83 room events did not preserve answer_incident summary')

    const settleResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(settleResponse.response.ok, `L83 settle returned ${settleResponse.response.status}: ${settleResponse.data?.msg || 'unknown error'}`)
    assert(String(settleResponse.data?.room?.state || '') === 'settling', 'L83 room did not enter settling')
    assert(Array.isArray(settleResponse.data?.room?.settlement_receipts) && settleResponse.data.room.settlement_receipts.length === expectedMemberLimit, 'L83 settle did not create 4 receipts')
    assert(settleResponse.data.room.settlement_receipts.every(receipt => l81GetReceiptItemQuantity(receipt, 'paper') >= 2), 'L83 settle did not preserve paper reward')
    assert(settleResponse.data.room.settlement_receipts.every(receipt => l81GetReceiptItemQuantity(receipt, 'wood') >= 1), 'L83 settle did not preserve wood reward')
    assert(settleResponse.data.room.settlement_receipts.some(receipt => l81GetReceiptItemQuantity(receipt, 'ancient_waybill') >= 1), 'L83 settle did not preserve ancient_waybill reward')

    const receiptByUsername = new Map(settleResponse.data.room.settlement_receipts.map(receipt => [String(receipt?.target_username || ''), receipt]))
    for (const participant of [sessionState, ...participants]) {
      const receipt = receiptByUsername.get(participant.username)
      assert(receipt, `L83 settle did not keep receipt for ${participant.username}`)
      l81AddExpectedMoney(participant, Math.max(0, Math.floor(Number(receipt?.reward_payload?.money) || 0)))
    }

    const closeResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(closeResponse.response.ok, `L83 close returned ${closeResponse.response.status}: ${closeResponse.data?.msg || 'unknown error'}`)
    assert(String(closeResponse.data?.room?.state || '') === 'closed', 'L83 room did not close cleanly')
    assert(Array.isArray(closeResponse.data?.room?.settlement_receipts) && closeResponse.data.room.settlement_receipts.every(receipt => receipt?.status === 'persisted'), 'L83 close did not persist all receipts')

    const afterHostSave = await l81ReadSave(sessionState, 'L83 host after')
    assert(Math.floor(Number(afterHostSave?.player?.money) || 0) === l81GetExpectedMoney(sessionState), `L83 host money did not persist correctly, expected money=${l81GetExpectedMoney(sessionState)}, current money=${Math.floor(Number(afterHostSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterHostSave, beforeHostCounts, hostExpectedItems, 'L83 host reward')

    const afterLeadSave = await l81ReadSave(participants[0], 'L83 lead after')
    assert(Math.floor(Number(afterLeadSave?.player?.money) || 0) === l81GetExpectedMoney(participants[0]), `L83 lead member money did not persist correctly, expected money=${l81GetExpectedMoney(participants[0])}, current money=${Math.floor(Number(afterLeadSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterLeadSave, beforeLeadCounts, memberExpectedItems, 'L83 lead member reward')

    for (const participant of participants.slice(1)) {
      const afterSave = await l81ReadSave(participant, 'L83 member after')
      assert(Math.floor(Number(afterSave?.player?.money) || 0) === l81GetExpectedMoney(participant), `L83 member ${participant.username} money did not persist correctly, expected money=${l81GetExpectedMoney(participant)}, current money=${Math.floor(Number(afterSave?.player?.money) || 0)}`)
    }
  }

  await runCheck('L83 escort_convoy专项回归', async () => {
    await runL83EscortScenario()
  })

  const runL84SeaScenario = async () => {
    const templateId = 'sea_probe'
    const expectedMemberLimit = 4
    const participants = [l81MemberAState, l81MemberBState, l81MemberCState]
    const beforeHostSave = await l81ReadSave(sessionState, 'L84 host before')
    const beforeLeadSave = await l81ReadSave(participants[0], 'L84 lead before')
    const hostExpectedItems = [
      { itemId: 'luminous_algae', quantity: 1 },
      { itemId: 'wind_etched_core', quantity: 1 },
    ]
    const memberExpectedItems = [
      { itemId: 'luminous_algae', quantity: 1 },
    ]
    const beforeHostCounts = l81CaptureRewardCounts(beforeHostSave, hostExpectedItems)
    const beforeLeadCounts = l81CaptureRewardCounts(beforeLeadSave, memberExpectedItems)

    const { response: createResponse, data: createData } = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        template_id: templateId,
        gameplay_template_id: 'expedition_sea',
        countdown_seconds: 1,
        title: `L84 海域共探 ${Date.now()}`,
      }),
    })
    assert(createResponse.ok, `L84 create returned ${createResponse.status}: ${createData?.msg || 'unknown error'}`)
    assert(createData?.ok === true && createData?.room?.id, 'L84 create payload is incomplete')
    assert(String(createData?.room?.template_id || '') === templateId, 'L84 create did not preserve template id')
    assert(Number(createData?.room?.member_limit || 0) === expectedMemberLimit, `L84 create did not preserve member limit ${expectedMemberLimit}`)
    assert(String(createData?.room?.gameplay?.template_id || '') === 'expedition_sea', 'L84 create did not preserve expedition_sea gameplay template')
    const roomId = String(createData.room.id)

    for (const participant of participants) {
      const inviteResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionState.csrfToken,
        },
        body: JSON.stringify({
          target_username: participant.username,
        }),
      })
      assert(inviteResponse.response.ok, `L84 invite ${participant.username} returned ${inviteResponse.response.status}: ${inviteResponse.data?.msg || 'unknown error'}`)
      assert(inviteResponse.data?.ok === true, `L84 invite ${participant.username} payload is incomplete`)
    }

    for (const participant of participants) {
      const joinResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
      })
      assert(joinResponse.response.ok, `L84 join ${participant.username} returned ${joinResponse.response.status}: ${joinResponse.data?.msg || 'unknown error'}`)
      assert(joinResponse.data?.ok === true && joinResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'joined'), `L84 join ${participant.username} payload is incomplete`)
    }

    const readyCheckResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(readyCheckResponse.response.ok, `L84 ready-check returned ${readyCheckResponse.response.status}: ${readyCheckResponse.data?.msg || 'unknown error'}`)
    assert(String(readyCheckResponse.data?.room?.state || '') === 'ready_check', 'L84 room did not enter ready_check')

    const hostReadyResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(hostReadyResponse.response.ok, `L84 host ready returned ${hostReadyResponse.response.status}: ${hostReadyResponse.data?.msg || 'unknown error'}`)

    for (const participant of participants) {
      const readyResponse = await fetchSessionJson(participant, `/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, {
        method: 'POST',
      })
      assert(readyResponse.response.ok, `L84 ready ${participant.username} returned ${readyResponse.response.status}: ${readyResponse.data?.msg || 'unknown error'}`)
      assert(readyResponse.data?.ok === true && readyResponse.data?.room?.members?.some(entry => entry?.username === participant.username && entry?.status === 'ready'), `L84 ready ${participant.username} payload is incomplete`)
    }

    const startResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(startResponse.response.ok, `L84 countdown returned ${startResponse.response.status}: ${startResponse.data?.msg || 'unknown error'}`)
    assert(['countdown', 'running'].includes(String(startResponse.data?.room?.state || '')), `L84 room did not enter countdown or running, current=${startResponse.data?.room?.state}`)

    await wait(2200)
    const runningReadback = await fetchAuthedJson('/api/taoyuan/online/expedition/rooms')
    assert(runningReadback.response.ok, `L84 running readback returned ${runningReadback.response.status}`)
    assert(runningReadback.data?.ok === true && runningReadback.data?.my_room?.id === roomId, 'L84 running readback payload is incomplete')
    assert(String(runningReadback.data?.my_room?.state || '') === 'running', `L84 room did not reach running state, current=${runningReadback.data?.my_room?.state}`)
    assert(String(runningReadback.data?.my_room?.template_id || '') === templateId, 'L84 running readback lost template id')
    assert(Number(runningReadback.data?.my_room?.member_limit || 0) === expectedMemberLimit, 'L84 running readback lost member limit')
    assert(Number(runningReadback.data?.my_room?.joined_member_count || 0) === expectedMemberLimit, 'L84 running readback did not preserve joined member count')
    assert(String(runningReadback.data?.my_room?.gameplay?.template_id || '') === 'expedition_sea', 'L84 running readback lost expedition_sea gameplay template')
    const availableActionIds = new Set((runningReadback.data?.my_room?.gameplay?.available_actions || []).map(entry => String(entry?.id || '')))
    for (const actionId of ['chart_course', 'watch_weather', 'haul_sea_goods']) {
      assert(availableActionIds.has(actionId), `L84 available actions missing ${actionId}`)
    }
    const chartCourseAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'chart_course')
    const watchWeatherAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'watch_weather')
    const haulSeaGoodsAction = (runningReadback.data?.my_room?.gameplay?.available_actions || []).find(entry => String(entry?.id || '') === 'haul_sea_goods')
    assert(chartCourseAction?.required_role === 'scout' && String(chartCourseAction?.round_effect || ''), 'L84 chart_course did not expose common action protocol fields')
    assert(watchWeatherAction?.required_role === 'support' && String(watchWeatherAction?.round_effect || ''), 'L84 watch_weather did not expose common action protocol fields')
    assert(haulSeaGoodsAction?.required_role === 'miner' && String(haulSeaGoodsAction?.round_effect || ''), 'L84 haul_sea_goods did not expose common action protocol fields')

    let actionRoom = await l81SubmitAction(sessionState, roomId, 'chart_course', 'L84 host chart_course')
    actionRoom = await l81SubmitAction(participants[0], roomId, 'chart_course', 'L84 lead chart_course')
    actionRoom = await l81SubmitAction(participants[1], roomId, 'watch_weather', 'L84 support watch_weather')
    actionRoom = await l81SubmitAction(participants[2], roomId, 'haul_sea_goods', 'L84 fourth haul_sea_goods')
    actionRoom = await l81SubmitAction(sessionState, roomId, 'watch_weather', 'L84 host watch_weather')
    actionRoom = await l81SubmitAction(sessionState, roomId, 'haul_sea_goods', 'L84 host haul_sea_goods')

    const hostContribution = actionRoom?.gameplay?.contributions?.find(entry => entry?.username === sessionState.username)
    assert(Number(hostContribution?.action_count || 0) >= 3, 'L84 host contribution did not stay ahead')
    const recentEventSummaries = Array.isArray(actionRoom?.recent_events) ? actionRoom.recent_events.map(entry => String(entry?.summary || '')) : []
    assert(recentEventSummaries.some(summary => summary.includes('航线分工')), 'L84 room events did not preserve chart_course summary')
    assert(recentEventSummaries.some(summary => summary.includes('应对海况')), 'L84 room events did not preserve watch_weather summary')
    assert(recentEventSummaries.some(summary => summary.includes('海货结算')), 'L84 room events did not preserve haul_sea_goods summary')

    const settleResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(settleResponse.response.ok, `L84 settle returned ${settleResponse.response.status}: ${settleResponse.data?.msg || 'unknown error'}`)
    assert(String(settleResponse.data?.room?.state || '') === 'settling', 'L84 room did not enter settling')
    assert(Array.isArray(settleResponse.data?.room?.settlement_receipts) && settleResponse.data.room.settlement_receipts.length === expectedMemberLimit, 'L84 settle did not create 4 receipts')
    assert(settleResponse.data.room.settlement_receipts.every(receipt => l81GetReceiptItemQuantity(receipt, 'luminous_algae') >= 1), 'L84 settle did not preserve luminous_algae reward')
    assert(settleResponse.data.room.settlement_receipts.some(receipt => l81GetReceiptItemQuantity(receipt, 'wind_etched_core') >= 1), 'L84 settle did not preserve wind_etched_core reward')

    const receiptByUsername = new Map(settleResponse.data.room.settlement_receipts.map(receipt => [String(receipt?.target_username || ''), receipt]))
    for (const participant of [sessionState, ...participants]) {
      const receipt = receiptByUsername.get(participant.username)
      assert(receipt, `L84 settle did not keep receipt for ${participant.username}`)
      l81AddExpectedMoney(participant, Math.max(0, Math.floor(Number(receipt?.reward_payload?.money) || 0)))
    }

    const closeResponse = await fetchAuthedJson(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(closeResponse.response.ok, `L84 close returned ${closeResponse.response.status}: ${closeResponse.data?.msg || 'unknown error'}`)
    assert(String(closeResponse.data?.room?.state || '') === 'closed', 'L84 room did not close cleanly')
    assert(Array.isArray(closeResponse.data?.room?.settlement_receipts) && closeResponse.data.room.settlement_receipts.every(receipt => receipt?.status === 'persisted'), 'L84 close did not persist all receipts')

    const afterHostSave = await l81ReadSave(sessionState, 'L84 host after')
    assert(Math.floor(Number(afterHostSave?.player?.money) || 0) === l81GetExpectedMoney(sessionState), `L84 host money did not persist correctly, expected money=${l81GetExpectedMoney(sessionState)}, current money=${Math.floor(Number(afterHostSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterHostSave, beforeHostCounts, hostExpectedItems, 'L84 host reward')

    const afterLeadSave = await l81ReadSave(participants[0], 'L84 lead after')
    assert(Math.floor(Number(afterLeadSave?.player?.money) || 0) === l81GetExpectedMoney(participants[0]), `L84 lead member money did not persist correctly, expected money=${l81GetExpectedMoney(participants[0])}, current money=${Math.floor(Number(afterLeadSave?.player?.money) || 0)}`)
    l81AssertRewardGrowth(afterLeadSave, beforeLeadCounts, memberExpectedItems, 'L84 lead member reward')

    for (const participant of participants.slice(1)) {
      const afterSave = await l81ReadSave(participant, 'L84 member after')
      assert(Math.floor(Number(afterSave?.player?.money) || 0) === l81GetExpectedMoney(participant), `L84 member ${participant.username} money did not persist correctly, expected money=${l81GetExpectedMoney(participant)}, current money=${Math.floor(Number(afterSave?.player?.money) || 0)}`)
    }
  }

  await runCheck('L84 sea_probe专项回归', async () => {
    await runL84SeaScenario()
  })

  let createdSocietyId = ''
  let createdSocietyName = ''
  await runCheck('GET /api/taoyuan/online/societies read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `society overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.visible_societies) && Array.isArray(data?.theme_options), 'society overview payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/societies write path', async () => {
    createdSocietyName = `烟火社${String(Date.now()).slice(-4)}`
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: createdSocietyName,
        summary: 'smoke society summary',
        emblem: 'lantern_medallion',
        theme: 'festival_hosts',
        visibility: 'semi_public',
        capacity: 24,
        join_requirement_id: 'friends_recommended',
        join_requirement_note: '先看重协作节奏，再谈后续提案。',
      }),
    })
    assert(response.ok, `society create returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.society?.id, 'society create payload is incomplete')
    assert(String(data?.society?.name || '') === createdSocietyName, 'society create did not preserve society name')
    assert(String(data?.society?.visibility || '') === 'semi_public', 'society create did not preserve visibility')
    assert(String(data?.society?.join_requirement_id || '') === 'friends_recommended', 'society create did not preserve join requirement')
    createdSocietyId = String(data.society.id)
  })

  await runCheck('GET /api/taoyuan/online/societies own readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `own society readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'own society readback payload is incomplete')
    assert(Array.isArray(data?.my_society?.members) && data.my_society.members.some(entry => entry?.username === sessionState.username && entry?.role === 'president'), 'own society readback did not preserve founder role')
  })

  await runCheck('GET /api/taoyuan/online/societies public visibility', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(response.ok, `public society readback returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.visible_societies), 'public society readback payload is incomplete')
    const createdSociety = data.visible_societies.find(entry => entry?.id === createdSocietyId)
    assert(createdSociety && String(createdSociety?.name || '') === createdSocietyName, 'created society missing from public list')
    assert(String(createdSociety?.leader_username || '') === sessionState.username, 'created society did not preserve founder username')
  })

  let createdSocietyRequestId = ''
  let createdSocietyInviteRequestId = ''
  let createdSocietyProposalId = ''
  let rejoinedSocietyRequestId = ''
  await runCheck('POST /api/taoyuan/online/societies/:societyId/apply write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/societies/${encodeURIComponent(createdSocietyId)}/apply`, {
      method: 'POST',
    })
    assert(response.ok, `society apply returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.status === 'pending', 'society apply payload is incomplete')
    assert(data?.request?.target_save_id === secondarySaveIdentity.save_id, 'society apply did not persist target save id')
    assert(data?.request?.target_save_slot === secondarySaveIdentity.save_slot, 'society apply did not persist target save slot')
    createdSocietyRequestId = String(data?.request?.id || '')
    assert(createdSocietyRequestId, 'society apply did not create request id')
  })

  await runCheck('POST /api/taoyuan/online/societies/requests/:requestId/accept write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/societies/requests/${encodeURIComponent(createdSocietyRequestId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `society request accept returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.status === 'accepted', 'society request accept payload is incomplete')
    assert(data?.request?.target_save_id === secondarySaveIdentity.save_id, 'society request accept did not preserve target save id')
    assert(data?.request?.target_save_slot === secondarySaveIdentity.save_slot, 'society request accept did not preserve target save slot')
    assert(Array.isArray(data?.overview?.my_society?.members) && data.overview.my_society.members.some(entry => entry?.username === secondarySessionState.username && entry?.save_id === secondarySaveIdentity.save_id), 'society request accept did not preserve member save id')
    assert(Array.isArray(data?.overview?.my_society?.members) && data.overview.my_society.members.some(entry => entry?.username === secondarySessionState.username), 'society request accept did not add the new member')
  })

  await runCheck('GET /api/taoyuan/online/societies active save isolation', async () => {
    const alternateRawSavePayload = buildSeedSavePayload(secondarySessionState.username, 260)
    const alternateSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: alternateRawSavePayload,
        revision: 1,
      }),
    })
    assert(alternateSave.response.ok, `secondary alternate save write returned ${alternateSave.response.status}`)
    assert(alternateSave.data?.ok === true && alternateSave.data?.slot === 1, 'secondary alternate save write payload is incomplete')
    const alternateIdentity = getEmbeddedSaveIdentity(decryptTaoyuanRaw(alternateSave.data?.raw || ''))
    assert(alternateIdentity?.save_id, 'secondary alternate save identity missing')
    assert(alternateIdentity.save_id !== secondarySaveIdentity.save_id, 'secondary alternate save should receive an independent save id')

    const switchToAlternate = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/active-slot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slot: 1 }),
    })
    assert(switchToAlternate.response.ok, `switch secondary to alternate save returned ${switchToAlternate.response.status}`)

    const legacySocietyStore = JSON.parse(await readFile(smokeSocietyStoreFile, 'utf8'))
    legacySocietyStore.societies = [
      ...(Array.isArray(legacySocietyStore.societies) ? legacySocietyStore.societies : []),
      {
        id: `legacy_society_${Date.now()}`,
        name: '旧档兼容社',
        summary: 'legacy username-only society member smoke fixture',
        notice: '',
        emblem: 'plum_seal',
        theme: 'harvest_union',
        visibility: 'semi_public',
        capacity: 12,
        join_requirement_id: 'open',
        join_requirement_note: '',
        created_by: secondarySessionState.username,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        level: 1,
        welfare_xp: 0,
        members: [
          {
            username: secondarySessionState.username,
            display_name: secondarySessionState.displayName,
            role: 'member',
            joined_at: Math.floor(Date.now() / 1000),
          },
        ],
        activity_log: [],
        proposals: [],
        public_projects: [],
        role_history: [],
      },
    ]
    await writeFile(smokeSocietyStoreFile, JSON.stringify(legacySocietyStore, null, 2), 'utf8')

    const alternateOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(alternateOverview.response.ok, `alternate save society overview returned ${alternateOverview.response.status}`)
    assert(alternateOverview.data?.ok === true && !alternateOverview.data?.my_society, 'alternate save should not inherit society membership from another save')

    const switchBack = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/active-slot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slot: 0 }),
    })
    assert(switchBack.response.ok, `switch secondary back to primary save returned ${switchBack.response.status}`)

    const primaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(primaryOverview.response.ok, `primary save society overview returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.ok === true && primaryOverview.data?.my_society?.id === createdSocietyId, 'primary save should keep its society membership after active slot restore')
    assert(Array.isArray(primaryOverview.data?.my_society?.members) && primaryOverview.data.my_society.members.some(entry => entry?.username === secondarySessionState.username && entry?.save_id === secondarySaveIdentity.save_id), 'primary save society overview lost member save identity after active slot restore')
  })

  await runCheck('POST /api/taoyuan/online/societies/members/role cycle path', async () => {
    for (const role of ['steward', 'buyer', 'treasurer', 'scribe', 'member']) {
      const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies/members/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_username: secondarySessionState.username,
          role,
        }),
      })
      assert(response.ok, `society role update ${role} returned ${response.status}: ${data?.msg || 'unknown error'}`)
      const targetMember = data?.overview?.my_society?.members?.find(entry => entry?.username === secondarySessionState.username)
      assert(String(targetMember?.role || '') === role, `society role update did not preserve ${role}`)
    }
  })

  await runCheck('POST /api/taoyuan/online/societies/notice write path', async () => {
    societyNoticeText = `smoke society notice ${Date.now()}`
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies/notice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notice: societyNoticeText,
      }),
    })
    assert(response.ok, `society notice update returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(String(data?.overview?.my_society?.notice || '') === societyNoticeText, 'society notice update did not preserve the new notice')
  })

  await runCheck('POST /api/taoyuan/online/societies/notice moderation reject path', async () => {
    const rejectedNotice = await fetchAuthedJson('/api/taoyuan/online/societies/notice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notice: '台独村社公告',
      }),
    })
    assertRejectedResponse(rejectedNotice.response, rejectedNotice.data, 'society notice moderation')

    const readback = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(readback.response.ok, `society notice moderation readback returned ${readback.response.status}`)
    assert(String(readback.data?.my_society?.notice || '') === societyNoticeText, 'society notice moderation reject should keep the previous notice')
  })

  await runCheck('POST /api/taoyuan/online/societies/proposals write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies/proposals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `smoke society proposal ${Date.now()}`,
        summary: '先验证村社提案、投票与归档链路。',
        kind: 'festival',
      }),
    })
    assert(response.ok, `society proposal create returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.proposal?.status === 'open', 'society proposal create payload is incomplete')
    createdSocietyProposalId = String(data?.proposal?.id || '')
    assert(createdSocietyProposalId, 'society proposal create did not return proposal id')
  })

  await runCheck('POST /api/taoyuan/online/societies/proposals/:proposalId/vote write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/societies/proposals/${encodeURIComponent(createdSocietyProposalId)}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        choice: 'support',
      }),
    })
    assert(response.ok, `society proposal vote returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.proposal?.my_vote_choice === 'support', 'society proposal vote payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/societies/proposals/:proposalId/close write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/societies/proposals/${encodeURIComponent(createdSocietyProposalId)}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resolution_note: '按多数票先执行本周节会排班。',
      }),
    })
    assert(response.ok, `society proposal close returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.proposal?.status === 'closed', 'society proposal close payload is incomplete')
    assert(String(data?.proposal?.result_choice || '') === 'support', 'society proposal close did not preserve final result')
  })

  await runCheck('GET /api/taoyuan/online/societies proposal history readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(response.ok, `society proposal history returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'society proposal history payload is incomplete')
    assert(Array.isArray(data?.my_society?.proposal_history) && data.my_society.proposal_history.some(entry => entry?.id === createdSocietyProposalId && entry?.result_choice === 'support'), 'society proposal history did not preserve closed proposal result')
    assert(Array.isArray(data?.my_society?.members) && data.my_society.members.some(entry => entry?.username === secondarySessionState.username && entry?.role === 'member'), 'society role cycle did not return secondary member to member state')
  })

  await runCheck('POST /api/taoyuan/online/societies/public-projects/:projectId/contribute write path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before public project returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preWood = getInventoryItemQuantity(beforeDecrypted, 'wood')

    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/bridge/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'wood_bundle',
      }),
    })
    assert(response.ok, `society public project contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.project?.id === 'bridge', 'society public project contribute payload is incomplete')
    assert(Number(data?.project?.progress || 0) === 30, `society public project progress did not advance to 30, current=${Number(data?.project?.progress || 0)}`)
    assert(Array.isArray(data?.project?.recent_contributions) && data.project.recent_contributions.some(entry => entry?.username === secondarySessionState.username && entry?.package_id === 'wood_bundle'), 'society public project contribution record is missing')
    const laborPackage = data?.project?.contribution_packages?.find(entry => entry?.id === 'labor_shift')
    assert(
      laborPackage?.kind === 'labor' &&
      Number(laborPackage?.daily_limit || 0) === 1 &&
      Number(laborPackage?.weekly_limit || 0) === 3 &&
      Array.isArray(laborPackage?.costs) &&
      laborPackage.costs.length === 0,
      'society bridge did not expose limited labor contribution package',
    )
    const bridgeVisualProject = data?.overview?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'bridge')
    assert(data?.overview?.my_society?.visual_state?.board_type === 'async', 'society public project did not expose async visual board')
    assert(bridgeVisualProject, 'society public project did not expose bridge async project')
    assert(bridgeVisualProject.stages?.some(entry => entry?.id === 'bridge_scaffold' && entry?.state === 'complete'), 'bridge async project did not complete scaffold stage after first contribution')
    assert(bridgeVisualProject.stages?.some(entry => entry?.id === 'bridge_deck' && entry?.state === 'active' && Array.isArray(entry?.contribution_options) && entry.contribution_options.length > 0), 'bridge async project did not expose active contribution options')
    const bridgeContributionOptions = (bridgeVisualProject.stages || []).flatMap(entry => Array.isArray(entry?.contribution_options) ? entry.contribution_options : [])
    assert(
      bridgeContributionOptions.some(entry => entry?.id === 'labor_shift' && entry?.kind === 'labor' && Number(entry?.daily_limit || 0) === 1),
      'bridge async project did not expose labor contribution option',
    )
    assert(bridgeVisualProject.contributors?.some(entry => entry?.username === secondarySessionState.username && Number(entry?.contribution_value || 0) >= 30), 'bridge async project did not expose contribution ranking')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after public project returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterWood = getInventoryItemQuantity(afterDecrypted, 'wood')
    assert(afterMoney === preMoney - 20, `society public project did not deduct money correctly, expected money=${preMoney - 20}, current money=${afterMoney}`)
    assert(afterWood === preWood - 1, `society public project did not deduct wood correctly, expected wood=${preWood - 1}, current wood=${afterWood}`)
    secondaryExpectedMoney -= 20
  })

  await runCheck('GET /api/taoyuan/online/societies public project readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `society public project readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'society public project readback payload is incomplete')
    const bridgeProject = data?.my_society?.public_projects?.find(entry => entry?.id === 'bridge')
    assert(bridgeProject && Number(bridgeProject?.progress || 0) === 30, 'society public project readback did not preserve bridge progress')
    assert(Array.isArray(bridgeProject?.recent_contributions) && bridgeProject.recent_contributions.some(entry => entry?.username === secondarySessionState.username), 'society public project readback did not preserve contribution history')
    const bridgeVisualProject = data?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'bridge')
    assert(data?.my_society?.visual_state?.board_type === 'async', 'society public project readback did not expose async visual board')
    assert(bridgeVisualProject?.current_stage_id === 'bridge_deck', 'society public project readback did not preserve bridge async current stage')
    assert(Array.isArray(bridgeVisualProject?.history) && bridgeVisualProject.history.some(entry => entry?.actor_username === secondarySessionState.username), 'society public project readback did not preserve async project history')
  })

  await runCheck('POST /api/taoyuan/online/societies/public-projects/:projectId/contribute completion path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before project completion returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preWood = getInventoryItemQuantity(beforeDecrypted, 'wood')

    const secondBundle = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/bridge/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'labor_shift',
      }),
    })
    assert(secondBundle.response.ok, `society public project second contribute returned ${secondBundle.response.status}: ${secondBundle.data?.msg || 'unknown error'}`)
    assert(Number(secondBundle.data?.project?.progress || 0) === 45, `society public project labor contribute did not advance to 45, current=${Number(secondBundle.data?.project?.progress || 0)}`)
    assert(
      Array.isArray(secondBundle.data?.project?.recent_contributions) &&
      secondBundle.data.project.recent_contributions.some(entry => entry?.username === secondarySessionState.username && entry?.package_id === 'labor_shift'),
      'society public project labor contribution record is missing',
    )

    const duplicateLaborBundle = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/bridge/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'labor_shift',
      }),
    })
    assert(
      !duplicateLaborBundle.response.ok && String(duplicateLaborBundle.data?.msg || '').includes('24 小时'),
      'society public project labor contribution limit did not reject duplicate daily action',
    )

    const thirdBundle = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/bridge/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'wood_bundle',
      }),
    })
    assert(thirdBundle.response.ok, `society public project third contribute returned ${thirdBundle.response.status}: ${thirdBundle.data?.msg || 'unknown error'}`)
    assert(Number(thirdBundle.data?.project?.progress || 0) === 75, `society public project third contribute did not advance to 75, current=${Number(thirdBundle.data?.project?.progress || 0)}`)

    const completionBundle = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/bridge/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'wood_bundle',
      }),
    })
    assert(completionBundle.response.ok, `society public project completion contribute returned ${completionBundle.response.status}: ${completionBundle.data?.msg || 'unknown error'}`)
    assert(completionBundle.data?.ok === true && completionBundle.data?.project?.id === 'bridge', 'society public project completion payload is incomplete')
    assert(String(completionBundle.data?.project?.status || '') === 'completed', 'society public project completion did not mark bridge as completed')
    assert(Number(completionBundle.data?.project?.progress || 0) === 100, `society public project completion did not reach 100, current=${Number(completionBundle.data?.project?.progress || 0)}`)
    const completionRewards = Array.isArray(completionBundle.data?.project?.completion_rewards)
      ? completionBundle.data.project.completion_rewards
      : []
    assert(
      completionRewards.some(entry => entry?.id === 'bridge_crossing_bonus' && entry?.active === true && String(entry?.summary || '').includes('通行')),
      'society bridge completion did not expose active crossing bonus',
    )
    assert(
      completionRewards.some(entry => entry?.id === 'bridge_memorial' && entry?.active === true && String(entry?.label || '').includes('纪念碑')),
      'society bridge completion did not expose active bridge memorial',
    )
    assert(
      typeof completionBundle.data?.project?.world_feedback === 'string' &&
      completionBundle.data.project.world_feedback.includes('桥头会面'),
      'society public project completion did not preserve world feedback',
    )

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after project completion returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterWood = getInventoryItemQuantity(afterDecrypted, 'wood')
    assert(afterMoney === preMoney - 40, `society public project completion did not deduct money correctly, expected money=${preMoney - 40}, current money=${afterMoney}`)
    assert(afterWood === preWood - 2, `society public project completion did not deduct wood correctly, expected wood=${preWood - 2}, current wood=${afterWood}`)
    secondaryExpectedMoney -= 40
  })

  await runCheck('GET /api/taoyuan/online/societies completed public project world readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `society completed public project readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'society completed public project readback payload is incomplete')
    const bridgeProject = data?.my_society?.public_projects?.find(entry => entry?.id === 'bridge')
    assert(bridgeProject && String(bridgeProject?.status || '') === 'completed', 'society completed public project readback did not preserve completed status')
    assert(Number(bridgeProject?.progress || 0) === 100, 'society completed public project readback did not preserve final progress')
    assert(
      typeof bridgeProject?.world_feedback === 'string' &&
      bridgeProject.world_feedback.includes('桥头会面'),
      'society completed public project readback did not preserve world feedback',
    )
    const bridgeRewards = Array.isArray(bridgeProject?.completion_rewards) ? bridgeProject.completion_rewards : []
    assert(
      bridgeRewards.some(entry => entry?.id === 'bridge_crossing_bonus' && entry?.active === true),
      'society completed public project readback did not preserve bridge crossing bonus',
    )
    assert(
      bridgeRewards.some(entry => entry?.id === 'bridge_memorial' && entry?.active === true),
      'society completed public project readback did not preserve bridge memorial',
    )
    const bridgeVisualProject = data?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'bridge')
    assert(bridgeVisualProject?.completion_event_id === 'society_project_complete:bridge', 'society completed public project readback did not expose bridge completion visual event')
    assert(Array.isArray(bridgeVisualProject?.stages) && bridgeVisualProject.stages.every(entry => entry?.state === 'complete'), 'society completed public project readback did not mark all bridge visual stages complete')
    assert(Array.isArray(bridgeVisualProject?.history) && bridgeVisualProject.history.some(entry => entry?.type === 'stage_complete'), 'society completed public project readback did not preserve visual completion history')
    assert(
      Array.isArray(bridgeVisualProject?.history) &&
      bridgeVisualProject.history.some(entry => entry?.type === 'stage_complete' && String(entry?.summary || '').includes('溪桥通行增益')),
      'society completed public project visual history did not include bridge completion effects',
    )
    const bridgeChronicleProject = data?.my_society?.chronicle?.public_projects?.find(entry => entry?.id === 'bridge')
    const bridgeChronicleRewards = Array.isArray(bridgeChronicleProject?.completion_rewards) ? bridgeChronicleProject.completion_rewards : []
    assert(
      bridgeChronicleRewards.some(entry => entry?.id === 'bridge_memorial' && entry?.active === true),
      'society chronicle did not preserve bridge memorial reward',
    )
    assert(
      Array.isArray(data?.my_society?.activity_log) &&
      data.my_society.activity_log.some(entry => entry?.type === 'public_project_complete' && String(entry?.message || '').includes('修桥')),
      'society completed public project readback did not preserve completion activity log',
    )
  })

  await runCheck('POST /api/taoyuan/online/societies/public-projects/:projectId/contribute festival square visual path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before festival square returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preWintersweet = getInventoryItemQuantity(beforeDecrypted, 'wintersweet')

    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/festival_square/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'festival_food',
      }),
    })
    assert(response.ok, `festival square contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.project?.id === 'festival_square', 'festival square contribute payload is incomplete')
    assert(Number(data?.project?.progress || 0) === 25, `festival square progress did not advance to 25, current=${Number(data?.project?.progress || 0)}`)
    assert(data.project.contribution_packages.some(entry => entry?.id === 'festival_lanterns'), 'festival square did not expose lantern contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'festival_food'), 'festival square did not expose food contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'festival_scenery'), 'festival square did not expose scenery contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'festival_riddles'), 'festival square did not expose riddle contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'festival_program'), 'festival square did not expose program contribution option')

    const festivalVisualProject = data?.overview?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'festival_square')
    assert(festivalVisualProject?.kind === 'festival_square', 'festival square visual project did not expose festival kind')
    assert(festivalVisualProject?.current_stage_id === 'festival_square_build', 'festival square did not move from prepare to build stage after food contribution')
    const prepareStage = festivalVisualProject?.stages?.find(entry => entry?.id === 'festival_square_prepare')
    const buildStage = festivalVisualProject?.stages?.find(entry => entry?.id === 'festival_square_build')
    assert(prepareStage?.state === 'complete', 'festival square prepare stage should be complete after first contribution')
    assert(Array.isArray(prepareStage?.object_ids) && prepareStage.object_ids.includes('festival_food_table'), 'festival square food contribution did not affect visual objects')
    assert(buildStage?.state === 'active' && Array.isArray(buildStage?.contribution_options) && buildStage.contribution_options.some(entry => entry?.id === 'festival_scenery'), 'festival square active stage did not expose festival contribution options')
    assert(Array.isArray(festivalVisualProject?.history) && festivalVisualProject.history.some(entry => entry?.actor_username === secondarySessionState.username && String(entry?.summary || '').includes('食材备办')), 'festival square visual history did not preserve contribution actor and package')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after festival square returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterWintersweet = getInventoryItemQuantity(afterDecrypted, 'wintersweet')
    assert(afterMoney === preMoney - 10, `festival square did not deduct money correctly, expected money=${preMoney - 10}, current money=${afterMoney}`)
    assert(afterWintersweet === preWintersweet - 1, `festival square did not deduct wintersweet correctly, expected wintersweet=${preWintersweet - 1}, current wintersweet=${afterWintersweet}`)
    secondaryExpectedMoney -= 10
  })

  await runCheck('POST /api/taoyuan/online/societies/public-projects/:projectId/contribute festival square completion unlock path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before festival square completion returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))

    const completionPackages = ['festival_program', 'festival_program', 'festival_program', 'festival_program']
    let completionBundle = null
    for (let index = 0; index < completionPackages.length; index += 1) {
      const packageId = completionPackages[index]
      completionBundle = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/festival_square/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId,
        }),
      })
      assert(completionBundle.response.ok, `festival square completion contribute ${index + 1} returned ${completionBundle.response.status}: ${completionBundle.data?.msg || 'unknown error'}`)
      const expectedProgress = index < completionPackages.length - 1 ? 45 + index * 20 : 100
      assert(Number(completionBundle.data?.project?.progress || 0) === expectedProgress, `festival square completion progress mismatch, expected=${expectedProgress}, current=${Number(completionBundle.data?.project?.progress || 0)}`)
    }

    assert(completionBundle?.data?.ok === true && completionBundle.data?.project?.id === 'festival_square', 'festival square completion payload is incomplete')
    assert(String(completionBundle.data?.project?.status || '') === 'completed', 'festival square completion did not mark project completed')
    const completionRewards = Array.isArray(completionBundle.data?.project?.completion_rewards)
      ? completionBundle.data.project.completion_rewards
      : []
    assert(
      completionRewards.some(entry => entry?.id === 'festival_room_unlock' && entry?.active === true && String(entry?.summary || '').includes('lantern_fair')),
      'festival square completion did not expose active room unlock',
    )
    assert(
      completionRewards.some(entry => entry?.id === 'festival_public_reward' && entry?.active === true && String(entry?.summary || '').includes('不直接发个人资产')),
      'festival square completion did not expose public reward guardrail',
    )
    assert(
      completionRewards.some(entry => entry?.id === 'festival_square_memorial' && entry?.active === true),
      'festival square completion did not expose memorial reward',
    )
    const festivalVisualProject = completionBundle.data?.overview?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'festival_square')
    assert(festivalVisualProject?.completion_room_template_id === 'lantern_fair', 'festival square visual project did not expose lantern fair room unlock')
    assert(
      festivalVisualProject?.completion_room_launch?.template_id === 'lantern_fair' &&
      festivalVisualProject?.completion_room_launch?.gameplay_template_id === 'assembly' &&
      String(festivalVisualProject?.completion_room_launch?.summary || '').includes('不直接发个人资产'),
      'festival square visual project did not expose authoritative completion room launch',
    )
    const autoFestivalRoomId = String(festivalVisualProject?.completion_room_launch?.room_id || '')
    assert(
      festivalVisualProject?.completion_room_launch?.status === 'created' && autoFestivalRoomId.startsWith('festival_room_'),
      'festival square completion did not auto-create a lantern fair room',
    )
    assert(festivalVisualProject?.completion_event_id === 'society_project_complete:festival_square', 'festival square visual project did not expose completion event')
    assert(Array.isArray(festivalVisualProject?.stages) && festivalVisualProject.stages.every(entry => entry?.state === 'complete'), 'festival square visual project did not mark all stages complete')
    assert(
      Array.isArray(festivalVisualProject?.history) &&
      festivalVisualProject.history.some(entry => entry?.type === 'stage_complete' && String(entry?.summary || '').includes('上元灯会房间解锁')),
      'festival square visual history did not include room unlock reward',
    )
    assert(
      typeof completionBundle.data?.project?.world_feedback === 'string' &&
      completionBundle.data.project.world_feedback.includes('节目彩排'),
      'festival square completion did not preserve world feedback',
    )

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after festival square completion returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    assert(afterMoney === preMoney - 100, `festival square completion did not deduct money correctly, expected money=${preMoney - 100}, current money=${afterMoney}`)
    secondaryExpectedMoney -= 100
  })

  await runCheck('GET /api/taoyuan/online/societies festival square unlock readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `festival square unlock readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'festival square unlock readback payload is incomplete')
    const festivalProject = data?.my_society?.public_projects?.find(entry => entry?.id === 'festival_square')
    const autoFestivalRoomId = String(festivalProject?.completion_room_launch?.room_id || '')
    assert(festivalProject && String(festivalProject?.status || '') === 'completed', 'festival square unlock readback did not preserve completed status')
    assert(
      festivalProject?.completion_room_launch?.source_event_id === 'society_project_complete:festival_square' &&
      festivalProject?.completion_room_launch?.template_id === 'lantern_fair' &&
      festivalProject?.completion_room_launch?.status === 'created' &&
      autoFestivalRoomId.startsWith('festival_room_'),
      'festival square unlock readback did not preserve completion room launch descriptor',
    )
    const festivalRewards = Array.isArray(festivalProject?.completion_rewards) ? festivalProject.completion_rewards : []
    assert(
      festivalRewards.some(entry => entry?.id === 'festival_room_unlock' && entry?.active === true),
      'festival square unlock readback did not preserve room unlock reward',
    )
    assert(
      festivalRewards.some(entry => entry?.id === 'festival_square_memorial' && entry?.active === true),
      'festival square unlock readback did not preserve memorial reward',
    )
    const festivalVisualProject = data?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'festival_square')
    assert(festivalVisualProject?.completion_room_template_id === 'lantern_fair', 'festival square unlock readback did not preserve completion room template')
    assert(
      festivalVisualProject?.completion_room_launch?.source_project_id === 'festival_square' &&
      festivalVisualProject?.completion_room_launch?.title === '节庆广场开幕灯会' &&
      festivalVisualProject?.completion_room_launch?.status === 'created' &&
      festivalVisualProject?.completion_room_launch?.room_id === autoFestivalRoomId,
      'festival square unlock readback did not preserve visual completion room launch',
    )
    assert(
      Array.isArray(festivalVisualProject?.history) &&
      festivalVisualProject.history.some(entry => entry?.type === 'stage_complete' && String(entry?.summary || '').includes('开幕留影位')),
      'festival square unlock readback did not preserve memorial visual history',
    )
    const festivalChronicleProject = data?.my_society?.chronicle?.public_projects?.find(entry => entry?.id === 'festival_square')
    const festivalChronicleRewards = Array.isArray(festivalChronicleProject?.completion_rewards) ? festivalChronicleProject.completion_rewards : []
    assert(
      festivalChronicleRewards.some(entry => entry?.id === 'festival_square_memorial' && entry?.active === true),
      'society chronicle did not preserve festival square memorial reward',
    )

    const roomOverview = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(roomOverview.response.ok, `festival room overview after square unlock returned ${roomOverview.response.status}`)
    assert(
      Array.isArray(roomOverview.data?.templates) && roomOverview.data.templates.some(entry => entry?.id === 'lantern_fair'),
      'festival square unlock did not point to an available lantern fair room template',
    )
    assert(
      Array.isArray(roomOverview.data?.invited_rooms) && roomOverview.data.invited_rooms.some(room =>
        room?.id === autoFestivalRoomId &&
        room?.template_id === 'lantern_fair' &&
        room?.gameplay_template_id === 'assembly'
      ),
      'festival square auto-created room did not invite the society member',
    )
    const hostRoomOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/festival/rooms')
    assert(hostRoomOverview.response.ok, `festival room host overview after square unlock returned ${hostRoomOverview.response.status}`)
    assert(
      Array.isArray(hostRoomOverview.data?.visible_rooms) && hostRoomOverview.data.visible_rooms.some(room =>
        room?.id === autoFestivalRoomId &&
        room?.template_id === 'lantern_fair' &&
        room?.gameplay_template_id === 'assembly' &&
        room?.title === '节庆广场开幕灯会'
      ),
      'festival square auto-created room was not visible to the completion actor',
    )
  })

  await runCheck('POST /api/taoyuan/online/societies/public-projects/:projectId/contribute lantern wall path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before lantern wall returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))

    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/lantern_wall/contribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: 'lantern_wall_wish',
      }),
    })
    assert(response.ok, `lantern wall wish contribute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.project?.id === 'lantern_wall', 'lantern wall contribute payload is incomplete')
    assert(Number(data?.project?.progress || 0) === 20, `lantern wall progress did not advance to 20, current=${Number(data?.project?.progress || 0)}`)
    assert(data.project.contribution_packages.some(entry => entry?.id === 'lantern_wall_wish' && entry?.kind === 'message'), 'lantern wall did not expose wish contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'lantern_wall_hang'), 'lantern wall did not expose hang contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'lantern_wall_repair' && entry?.kind === 'labor'), 'lantern wall did not expose repair contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'lantern_wall_gift'), 'lantern wall did not expose gift contribution option')
    assert(data.project.contribution_packages.some(entry => entry?.id === 'lantern_wall_message' && entry?.kind === 'message'), 'lantern wall did not expose friend message contribution option')

    const lanternVisualProject = data?.overview?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'lantern_wall')
    assert(lanternVisualProject?.kind === 'lantern_wall', 'lantern wall visual project did not expose lantern wall kind')
    assert(lanternVisualProject?.current_stage_id === 'lantern_wall_hang', 'lantern wall did not move from wish to hang stage after first contribution')
    const wishStage = lanternVisualProject?.stages?.find(entry => entry?.id === 'lantern_wall_wish')
    const hangStage = lanternVisualProject?.stages?.find(entry => entry?.id === 'lantern_wall_hang')
    assert(wishStage?.state === 'complete', 'lantern wall wish stage should be complete after first contribution')
    assert(Array.isArray(wishStage?.object_ids) && wishStage.object_ids.includes('lantern_wall_wish_tags'), 'lantern wall wish contribution did not affect visual objects')
    assert(hangStage?.state === 'active' && Array.isArray(hangStage?.contribution_options) && hangStage.contribution_options.some(entry => entry?.id === 'lantern_wall_hang'), 'lantern wall active stage did not expose hang contribution options')
    assert(Array.isArray(lanternVisualProject?.history) && lanternVisualProject.history.some(entry => entry?.actor_username === secondarySessionState.username && String(entry?.summary || '').includes('写愿望')), 'lantern wall visual history did not preserve wish contribution')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after lantern wall returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    assert(afterMoney === preMoney - 3, `lantern wall did not deduct money correctly, expected money=${preMoney - 3}, current money=${afterMoney}`)
    secondaryExpectedMoney -= 3
  })

  await runCheck('POST /api/taoyuan/online/societies/public-projects/:projectId/contribute lantern wall completion path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before lantern wall completion returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))

    const completionPackages = [
      ['lantern_wall_hang', 45],
      ['lantern_wall_repair', 65],
      ['lantern_wall_gift', 85],
      ['lantern_wall_message', 100],
    ]
    let completionBundle = null
    for (const [packageId, expectedProgress] of completionPackages) {
      completionBundle = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-projects/lantern_wall/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId,
        }),
      })
      assert(completionBundle.response.ok, `lantern wall completion contribute ${packageId} returned ${completionBundle.response.status}: ${completionBundle.data?.msg || 'unknown error'}`)
      assert(Number(completionBundle.data?.project?.progress || 0) === expectedProgress, `lantern wall completion progress mismatch, expected=${expectedProgress}, current=${Number(completionBundle.data?.project?.progress || 0)}`)
    }

    assert(completionBundle?.data?.ok === true && completionBundle.data?.project?.id === 'lantern_wall', 'lantern wall completion payload is incomplete')
    assert(String(completionBundle.data?.project?.status || '') === 'completed', 'lantern wall completion did not mark project completed')
    const completionRewards = Array.isArray(completionBundle.data?.project?.completion_rewards)
      ? completionBundle.data.project.completion_rewards
      : []
    assert(
      completionRewards.some(entry => entry?.id === 'lantern_wall_memorial' && entry?.active === true && String(entry?.label || '').includes('花灯墙')),
      'lantern wall completion did not expose active memorial reward',
    )
    assert(
      completionRewards.some(entry => entry?.id === 'lantern_wall_blessing_book' && entry?.active === true && String(entry?.summary || '').includes('不发放个人资产')),
      'lantern wall completion did not expose blessing book guardrail',
    )
    const lanternVisualProject = completionBundle.data?.overview?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'lantern_wall')
    assert(lanternVisualProject?.completion_event_id === 'society_project_complete:lantern_wall', 'lantern wall visual project did not expose completion event')
    assert(Array.isArray(lanternVisualProject?.stages) && lanternVisualProject.stages.every(entry => entry?.state === 'complete'), 'lantern wall visual project did not mark all stages complete')
    assert(
      Array.isArray(lanternVisualProject?.history) &&
      lanternVisualProject.history.some(entry => entry?.type === 'stage_complete' && String(entry?.summary || '').includes('好友祝福册')),
      'lantern wall visual history did not include blessing book reward',
    )
    assert(
      typeof completionBundle.data?.project?.world_feedback === 'string' &&
      completionBundle.data.project.world_feedback.includes('好友祝福'),
      'lantern wall completion did not preserve world feedback',
    )

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after lantern wall completion returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    assert(afterMoney === preMoney - 18, `lantern wall completion did not deduct money correctly, expected money=${preMoney - 18}, current money=${afterMoney}`)
    secondaryExpectedMoney -= 18
  })

  await runCheck('GET /api/taoyuan/online/societies lantern wall memorial readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `lantern wall memorial readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'lantern wall memorial readback payload is incomplete')
    const lanternProject = data?.my_society?.public_projects?.find(entry => entry?.id === 'lantern_wall')
    assert(lanternProject && String(lanternProject?.status || '') === 'completed', 'lantern wall readback did not preserve completed status')
    const lanternRewards = Array.isArray(lanternProject?.completion_rewards) ? lanternProject.completion_rewards : []
    assert(
      lanternRewards.some(entry => entry?.id === 'lantern_wall_memorial' && entry?.active === true),
      'lantern wall readback did not preserve memorial reward',
    )
    const lanternVisualProject = data?.my_society?.visual_state?.async_projects?.find(entry => entry?.id === 'lantern_wall')
    assert(
      Array.isArray(lanternVisualProject?.history) &&
      lanternVisualProject.history.some(entry => String(entry?.summary || '').includes('好友留言')),
      'lantern wall readback did not preserve friend message history',
    )
    const lanternChronicleProject = data?.my_society?.chronicle?.public_projects?.find(entry => entry?.id === 'lantern_wall')
    const lanternChronicleRewards = Array.isArray(lanternChronicleProject?.completion_rewards) ? lanternChronicleProject.completion_rewards : []
    assert(
      lanternChronicleRewards.some(entry => entry?.id === 'lantern_wall_blessing_book' && entry?.active === true),
      'society chronicle did not preserve lantern wall blessing book reward',
    )
  })

  await runCheck('POST /api/taoyuan/online/societies/public-warehouse/deposit write path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before warehouse deposit returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preWood = getInventoryItemQuantity(beforeDecrypted, 'wood')

    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'wood_crate',
      }),
    })
    assert(response.ok, `society warehouse deposit returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.warehouse, 'society warehouse deposit payload is incomplete')
    assert(Array.isArray(data?.warehouse?.items) && data.warehouse.items.some(entry => entry?.item_id === 'wood'), 'society warehouse deposit did not preserve warehouse wood stock')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after warehouse deposit returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterWood = getInventoryItemQuantity(afterDecrypted, 'wood')
    assert(afterMoney === preMoney - 5, `society warehouse deposit did not deduct money correctly, expected money=${preMoney - 5}, current money=${afterMoney}`)
    assert(afterWood === preWood - 1, `society warehouse deposit did not deduct wood correctly, expected wood=${preWood - 1}, current wood=${afterWood}`)
    secondaryExpectedMoney -= 5
  })

  await runCheck('POST /api/taoyuan/online/societies/public-warehouse/consume laba cookpot path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before laba cookpot warehouse setup returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preRice = getInventoryItemQuantity(beforeDecrypted, 'rice')
    const preHerb = getInventoryItemQuantity(beforeDecrypted, 'herb')

    const riceDeposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'rice_crate',
      }),
    })
    assert(riceDeposit.response.ok, `rice warehouse deposit returned ${riceDeposit.response.status}: ${riceDeposit.data?.msg || 'unknown error'}`)
    const herbDeposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'herb_crate',
      }),
    })
    assert(herbDeposit.response.ok, `herb warehouse deposit returned ${herbDeposit.response.status}: ${herbDeposit.data?.msg || 'unknown error'}`)
    assert(herbDeposit.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice' && Number(entry?.quantity || 0) >= 2), 'warehouse setup did not preserve rice stock')
    assert(herbDeposit.data?.warehouse?.items?.some(entry => entry?.item_id === 'herb' && Number(entry?.quantity || 0) >= 1), 'warehouse setup did not preserve herb stock')

    const idempotencyKey = `smoke-laba-cookpot-${Date.now()}`
    await wait(1100)
    const consume = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consume_id: 'laba_cookpot_base',
        idempotency_key: idempotencyKey,
      }),
    })
    assert(consume.response.ok, `laba cookpot consume returned ${consume.response.status}: ${consume.data?.msg || 'unknown error'}`)
    assert(consume.data?.ok === true && consume.data?.consume?.context_id === 'laba_cookpot', 'laba cookpot consume payload is incomplete')
    assert(consume.data?.log_entry?.action === 'consume' && consume.data.log_entry?.idempotency_key === idempotencyKey, 'laba cookpot consume did not preserve audit/idempotency log')
    assert(consume.data?.log_entry?.settlement_scope === 'public_warehouse_only', 'laba cookpot consume did not preserve public warehouse settlement scope')
    assert(consume.data?.log_entry?.personal_asset_effect === 'none_after_deposit', 'laba cookpot consume should mark no personal asset effect after deposit')
    assert(String(consume.data?.log_entry?.authority_summary || '').includes('只扣公共仓'), 'laba cookpot consume should preserve authority summary')
    assert(Array.isArray(consume.data?.log_entry?.warehouse_stock_after), 'laba cookpot consume should preserve warehouse stock after snapshot')
    assert(!consume.data.log_entry.warehouse_stock_after.some(entry => entry?.item_id === 'rice' || entry?.item_id === 'herb'), 'laba cookpot consume stock snapshot should show deducted public materials')
    assert(!consume.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice'), 'laba cookpot consume did not deduct public rice')
    assert(!consume.data?.warehouse?.items?.some(entry => entry?.item_id === 'herb'), 'laba cookpot consume did not deduct public herb')
    assert(Array.isArray(consume.data?.overview?.my_society?.public_warehouse?.consume_options) && consume.data.overview.my_society.public_warehouse.consume_options.some(entry => entry?.id === 'laba_cookpot_base'), 'society overview did not expose laba consume option')

    await wait(1100)
    const duplicateConsume = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consume_id: 'laba_cookpot_base',
        idempotency_key: idempotencyKey,
      }),
    })
    assert(duplicateConsume.response.ok, `duplicate laba cookpot consume returned ${duplicateConsume.response.status}: ${duplicateConsume.data?.msg || 'unknown error'}`)
    assert(duplicateConsume.data?.idempotent_replay === true, 'duplicate laba cookpot consume did not replay idempotently')
    assert(duplicateConsume.data?.log_entry?.settlement_scope === 'public_warehouse_only', 'duplicate laba cookpot consume did not replay settlement scope')
    assert(duplicateConsume.data?.log_entry?.personal_asset_effect === 'none_after_deposit', 'duplicate laba cookpot consume did not replay personal asset effect')
    assert(!duplicateConsume.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice'), 'duplicate laba cookpot consume deducted rice twice')
    assert(!duplicateConsume.data?.warehouse?.items?.some(entry => entry?.item_id === 'herb'), 'duplicate laba cookpot consume deducted herb twice')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after laba cookpot warehouse consume returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterRice = getInventoryItemQuantity(afterDecrypted, 'rice')
    const afterHerb = getInventoryItemQuantity(afterDecrypted, 'herb')
    assert(afterMoney === preMoney - 9, `laba cookpot setup should only deduct deposit money, expected money=${preMoney - 9}, current money=${afterMoney}`)
    assert(afterRice === preRice - 2, `laba cookpot setup did not deduct personal rice deposit correctly, expected rice=${preRice - 2}, current rice=${afterRice}`)
    assert(afterHerb === preHerb - 1, `laba cookpot setup did not deduct personal herb deposit correctly, expected herb=${preHerb - 1}, current herb=${afterHerb}`)
    secondaryExpectedMoney -= 9
  })

  await runCheck('POST /api/taoyuan/online/societies/public-warehouse/consume festival feast path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before festival feast warehouse setup returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preRice = getInventoryItemQuantity(beforeDecrypted, 'rice')
    const preWintersweet = getInventoryItemQuantity(beforeDecrypted, 'wintersweet')

    const riceDeposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'rice_crate',
      }),
    })
    assert(riceDeposit.response.ok, `festival feast rice warehouse deposit returned ${riceDeposit.response.status}: ${riceDeposit.data?.msg || 'unknown error'}`)
    const wintersweetDeposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'wintersweet_crate',
      }),
    })
    assert(wintersweetDeposit.response.ok, `festival feast wintersweet warehouse deposit returned ${wintersweetDeposit.response.status}: ${wintersweetDeposit.data?.msg || 'unknown error'}`)
    assert(wintersweetDeposit.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice' && Number(entry?.quantity || 0) >= 2), 'festival feast warehouse setup did not preserve rice stock')
    assert(wintersweetDeposit.data?.warehouse?.items?.some(entry => entry?.item_id === 'wintersweet' && Number(entry?.quantity || 0) >= 1), 'festival feast warehouse setup did not preserve wintersweet stock')

    const idempotencyKey = `smoke-festival-feast-${Date.now()}`
    await wait(1100)
    const consume = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consume_id: 'festival_feast_prep',
        idempotency_key: idempotencyKey,
      }),
    })
    assert(consume.response.ok, `festival feast consume returned ${consume.response.status}: ${consume.data?.msg || 'unknown error'}`)
    assert(consume.data?.ok === true && consume.data?.consume?.context_id === 'festival_feast', 'festival feast consume payload is incomplete')
    assert(consume.data?.log_entry?.action === 'consume' && consume.data.log_entry?.idempotency_key === idempotencyKey, 'festival feast consume did not preserve audit/idempotency log')
    assert(consume.data?.log_entry?.settlement_scope === 'public_warehouse_only', 'festival feast consume did not preserve public warehouse settlement scope')
    assert(consume.data?.log_entry?.personal_asset_effect === 'none_after_deposit', 'festival feast consume should mark no personal asset effect after deposit')
    assert(String(consume.data?.log_entry?.authority_summary || '').includes('只扣公共仓'), 'festival feast consume should preserve authority summary')
    assert(Array.isArray(consume.data?.log_entry?.warehouse_stock_after), 'festival feast consume should preserve warehouse stock after snapshot')
    assert(!consume.data.log_entry.warehouse_stock_after.some(entry => entry?.item_id === 'rice' || entry?.item_id === 'wintersweet'), 'festival feast consume stock snapshot should show deducted public materials')
    assert(!consume.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice'), 'festival feast consume did not deduct public rice')
    assert(!consume.data?.warehouse?.items?.some(entry => entry?.item_id === 'wintersweet'), 'festival feast consume did not deduct public wintersweet')
    assert(Array.isArray(consume.data?.overview?.my_society?.public_warehouse?.consume_options) && consume.data.overview.my_society.public_warehouse.consume_options.some(entry => entry?.id === 'festival_feast_prep'), 'society overview did not expose festival feast consume option')

    await wait(1100)
    const duplicateConsume = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consume_id: 'festival_feast_prep',
        idempotency_key: idempotencyKey,
      }),
    })
    assert(duplicateConsume.response.ok, `duplicate festival feast consume returned ${duplicateConsume.response.status}: ${duplicateConsume.data?.msg || 'unknown error'}`)
    assert(duplicateConsume.data?.idempotent_replay === true, 'duplicate festival feast consume did not replay idempotently')
    assert(!duplicateConsume.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice'), 'duplicate festival feast consume deducted rice twice')
    assert(!duplicateConsume.data?.warehouse?.items?.some(entry => entry?.item_id === 'wintersweet'), 'duplicate festival feast consume deducted wintersweet twice')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after festival feast warehouse consume returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterRice = getInventoryItemQuantity(afterDecrypted, 'rice')
    const afterWintersweet = getInventoryItemQuantity(afterDecrypted, 'wintersweet')
    assert(afterMoney === preMoney - 10, `festival feast setup should only deduct deposit money, expected money=${preMoney - 10}, current money=${afterMoney}`)
    assert(afterRice === preRice - 2, `festival feast setup did not deduct personal rice deposit correctly, expected rice=${preRice - 2}, current rice=${afterRice}`)
    assert(afterWintersweet === preWintersweet - 1, `festival feast setup did not deduct personal wintersweet deposit correctly, expected wintersweet=${preWintersweet - 1}, current wintersweet=${afterWintersweet}`)
    secondaryExpectedMoney -= 10
  })

  await runCheck('POST /api/taoyuan/online/societies/public-warehouse/consume bridge worker meal path', async () => {
    const beforeSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(beforeSave.response.ok, `secondary save readback before bridge worker meal warehouse setup returned ${beforeSave.response.status}`)
    const beforeDecrypted = decryptTaoyuanRaw(beforeSave.data?.raw || beforeSave.data?.slot?.raw || beforeSave.data?.save?.raw || '')
    const preMoney = Math.max(0, Math.floor(Number(beforeDecrypted?.player?.money) || 0))
    const preRice = getInventoryItemQuantity(beforeDecrypted, 'rice')
    const preCabbage = getInventoryItemQuantity(beforeDecrypted, 'cabbage')

    const riceDeposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'rice_crate',
      }),
    })
    assert(riceDeposit.response.ok, `bridge worker meal rice warehouse deposit returned ${riceDeposit.response.status}: ${riceDeposit.data?.msg || 'unknown error'}`)
    const cabbageDeposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_id: 'cabbage_crate',
      }),
    })
    assert(cabbageDeposit.response.ok, `bridge worker meal cabbage warehouse deposit returned ${cabbageDeposit.response.status}: ${cabbageDeposit.data?.msg || 'unknown error'}`)
    assert(cabbageDeposit.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice' && Number(entry?.quantity || 0) >= 2), 'bridge worker meal warehouse setup did not preserve rice stock')
    assert(cabbageDeposit.data?.warehouse?.items?.some(entry => entry?.item_id === 'cabbage' && Number(entry?.quantity || 0) >= 2), 'bridge worker meal warehouse setup did not preserve cabbage stock')

    const idempotencyKey = `smoke-bridge-worker-meal-${Date.now()}`
    await wait(1100)
    const consume = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consume_id: 'bridge_worker_meal',
        idempotency_key: idempotencyKey,
      }),
    })
    assert(consume.response.ok, `bridge worker meal consume returned ${consume.response.status}: ${consume.data?.msg || 'unknown error'}`)
    assert(consume.data?.ok === true && consume.data?.consume?.context_id === 'bridge_worker_meal', 'bridge worker meal consume payload is incomplete')
    assert(consume.data?.log_entry?.action === 'consume' && consume.data.log_entry?.idempotency_key === idempotencyKey, 'bridge worker meal consume did not preserve audit/idempotency log')
    assert(consume.data?.log_entry?.settlement_scope === 'public_warehouse_only', 'bridge worker meal consume did not preserve public warehouse settlement scope')
    assert(consume.data?.log_entry?.personal_asset_effect === 'none_after_deposit', 'bridge worker meal consume should mark no personal asset effect after deposit')
    assert(String(consume.data?.log_entry?.authority_summary || '').includes('只扣公共仓'), 'bridge worker meal consume should preserve authority summary')
    assert(Array.isArray(consume.data?.log_entry?.warehouse_stock_after), 'bridge worker meal consume should preserve warehouse stock after snapshot')
    assert(!consume.data.log_entry.warehouse_stock_after.some(entry => entry?.item_id === 'rice' || entry?.item_id === 'cabbage'), 'bridge worker meal consume stock snapshot should show deducted public materials')
    assert(!consume.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice'), 'bridge worker meal consume did not deduct public rice')
    assert(!consume.data?.warehouse?.items?.some(entry => entry?.item_id === 'cabbage'), 'bridge worker meal consume did not deduct public cabbage')
    assert(Array.isArray(consume.data?.overview?.my_society?.public_warehouse?.consume_options) && consume.data.overview.my_society.public_warehouse.consume_options.some(entry => entry?.id === 'bridge_worker_meal'), 'society overview did not expose bridge worker meal consume option')

    await wait(1100)
    const duplicateConsume = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consume_id: 'bridge_worker_meal',
        idempotency_key: idempotencyKey,
      }),
    })
    assert(duplicateConsume.response.ok, `duplicate bridge worker meal consume returned ${duplicateConsume.response.status}: ${duplicateConsume.data?.msg || 'unknown error'}`)
    assert(duplicateConsume.data?.idempotent_replay === true, 'duplicate bridge worker meal consume did not replay idempotently')
    assert(!duplicateConsume.data?.warehouse?.items?.some(entry => entry?.item_id === 'rice'), 'duplicate bridge worker meal consume deducted rice twice')
    assert(!duplicateConsume.data?.warehouse?.items?.some(entry => entry?.item_id === 'cabbage'), 'duplicate bridge worker meal consume deducted cabbage twice')

    const afterSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(afterSave.response.ok, `secondary save readback after bridge worker meal warehouse consume returned ${afterSave.response.status}`)
    const afterDecrypted = decryptTaoyuanRaw(afterSave.data?.raw || afterSave.data?.slot?.raw || afterSave.data?.save?.raw || '')
    const afterMoney = Math.max(0, Math.floor(Number(afterDecrypted?.player?.money) || 0))
    const afterRice = getInventoryItemQuantity(afterDecrypted, 'rice')
    const afterCabbage = getInventoryItemQuantity(afterDecrypted, 'cabbage')
    assert(afterMoney === preMoney - 7, `bridge worker meal setup should only deduct deposit money, expected money=${preMoney - 7}, current money=${afterMoney}`)
    assert(afterRice === preRice - 2, `bridge worker meal setup did not deduct personal rice deposit correctly, expected rice=${preRice - 2}, current rice=${afterRice}`)
    assert(afterCabbage === preCabbage - 2, `bridge worker meal setup did not deduct personal cabbage deposit correctly, expected cabbage=${preCabbage - 2}, current cabbage=${afterCabbage}`)
    secondaryExpectedMoney -= 7
  })

  await runCheck('POST /api/taoyuan/online/societies/public-warehouse five-category weekly settlement path', async () => {
    for (const depositId of ['rice_crate', 'herb_crate', 'cloth_bundle', 'fish_basket']) {
      const deposit = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/public-warehouse/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deposit_id: depositId,
        }),
      })
      assert(deposit.response.ok, `${depositId} warehouse deposit returned ${deposit.response.status}: ${deposit.data?.msg || 'unknown error'}`)
    }
    secondaryExpectedMoney -= 19

    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `society warehouse weekly settlement readback returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const warehouse = data?.my_society?.public_warehouse
    const settlement = warehouse?.weekly_settlement
    assert(Array.isArray(warehouse?.deposit_options) && warehouse.deposit_options.some(entry => entry?.id === 'cloth_bundle' && entry?.category_id === 'cloth'), 'society warehouse did not expose cloth contribution option')
    assert(Array.isArray(warehouse?.deposit_options) && warehouse.deposit_options.some(entry => entry?.id === 'fish_basket' && entry?.category_id === 'fish'), 'society warehouse did not expose fish contribution option')
    assert(settlement?.status === 'ready' && Number(settlement?.covered_category_count || 0) >= 5, 'society warehouse weekly settlement did not mark five categories ready')
    assert(settlement?.effects?.disaster_response?.active === true, 'society warehouse weekly settlement did not activate disaster response')
    assert(Number(settlement?.effects?.festival_cost_discount?.percent || 0) > 0, 'society warehouse weekly settlement did not expose festival cost discount')
    assert(Number(settlement?.effects?.public_task_bonus?.percent || 0) > 0, 'society warehouse weekly settlement did not expose public task bonus')
  })

  await runCheck('GET /api/taoyuan/online/societies welfare readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `society welfare readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_society?.id === createdSocietyId, 'society welfare readback payload is incomplete')
    assert(Number(data?.my_society?.level || 0) >= 1, 'society welfare readback did not expose level')
    assert(Array.isArray(data?.my_society?.welfare_unlocks) && data.my_society.welfare_unlocks.length >= 1, 'society welfare readback did not expose welfare unlocks')
    assert(data?.my_society?.public_warehouse && Array.isArray(data.my_society.public_warehouse.logs) && data.my_society.public_warehouse.logs.some(entry => entry?.username === secondarySessionState.username), 'society welfare readback did not preserve warehouse logs')
  })

  await runCheck('GET /api/taoyuan/online/societies chronicle readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(response.ok, `society chronicle readback returned ${response.status}`)
    const chronicle = data?.my_society?.chronicle
    assert(chronicle && Number(chronicle.founded_at || 0) > 0, 'society chronicle did not expose founded_at')
    assert(Array.isArray(chronicle?.role_history) && chronicle.role_history.length >= 2, 'society chronicle did not expose role history')
    assert(
      chronicle.role_history.some(entry =>
        entry?.username === secondarySessionState.username &&
        entry?.source === 'role_assignment' &&
        entry?.save_id === secondarySaveIdentity.save_id &&
        entry?.save_slot === secondarySaveIdentity.save_slot
      ),
      'society role assignment history did not preserve member save identity',
    )
    assert(Array.isArray(chronicle?.public_projects) && chronicle.public_projects.some(entry => entry?.id === 'bridge' && Number(entry?.contribution_count || 0) >= 1), 'society chronicle did not expose public project history')
    assert(Array.isArray(chronicle?.festival_participations) && chronicle.festival_participations.length >= 1, 'society chronicle did not expose festival participation history')
    assert(Array.isArray(chronicle?.top_contributors) && chronicle.top_contributors.some(entry => entry?.username === secondarySessionState.username), 'society chronicle did not expose contribution ranking')
    assert(Array.isArray(chronicle?.timeline) && chronicle.timeline.length >= 3, 'society chronicle did not expose event timeline')
    assert(String(chronicle?.annual_summary || '').length > 0, 'society chronicle did not expose annual summary')
  })

  await runCheck('GET /api/taoyuan/online/profile player chronicle primary readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/profile')
    assert(response.ok, `primary online profile chronicle readback returned ${response.status}`)
    const milestones = data?.profile?.player_chronicle?.milestones
    assert(Array.isArray(milestones) && milestones.length >= 8, 'primary online profile did not expose player chronicle milestones')
    const milestoneMap = Object.fromEntries((milestones || []).map(entry => [String(entry?.id || ''), entry]))
    for (const requiredId of [
      'first_public_manor',
      'first_visit_received',
      'first_guestbook_received',
      'first_festival_participation',
      'first_society_join',
    ]) {
      assert(milestoneMap[requiredId]?.unlocked === true, `primary player chronicle did not unlock ${requiredId}`)
      assert(Number(milestoneMap[requiredId]?.recorded_at || 0) > 0, `primary player chronicle did not persist timestamp for ${requiredId}`)
      assert(String(milestoneMap[requiredId]?.detail || '').length > 0, `primary player chronicle did not persist detail for ${requiredId}`)
    }
    if (milestoneMap.first_hot_manor?.unlocked === true) {
      assert(Number(milestoneMap.first_hot_manor.recorded_at || 0) > 0, 'primary player chronicle hot manor milestone is missing timestamp')
    }
    const awardShowcase = data?.profile?.award_showcase
    assert(awardShowcase && Array.isArray(awardShowcase.honors) && awardShowcase.honors.length >= 8, 'primary online profile did not expose award showcase honors')
    assert(Array.isArray(awardShowcase.commemoratives) && awardShowcase.commemoratives.length >= 3, 'primary online profile did not expose commemoratives')
    assert(Array.isArray(awardShowcase.titles) && awardShowcase.titles.length >= 2, 'primary online profile did not expose title showcase')
    assert(Array.isArray(awardShowcase.achievement_cards) && awardShowcase.achievement_cards.length >= 8, 'primary online profile did not expose achievement cards')
    const honorMap = Object.fromEntries((awardShowcase.honors || []).map(entry => [String(entry?.id || ''), entry]))
    for (const requiredHonorId of ['festival_active', 'construction_contributor', 'market_coordinator', 'world_witness']) {
      assert(honorMap[requiredHonorId]?.unlocked === true, `primary award showcase did not unlock ${requiredHonorId}`)
      assert(String(honorMap[requiredHonorId]?.detail || '').length > 0, `primary award showcase did not persist detail for ${requiredHonorId}`)
    }
    const commemorativeMap = Object.fromEntries((awardShowcase.commemoratives || []).map(entry => [String(entry?.id || ''), entry]))
    assert(commemorativeMap.festival_memento?.unlocked === true, 'primary award showcase did not unlock festival commemorative')
    assert(commemorativeMap.society_badge?.unlocked === true, 'primary award showcase did not unlock society badge')
    assert(commemorativeMap.world_chronicle?.unlocked === true, 'primary award showcase did not unlock world chronicle')
    const titleMap = Object.fromEntries((awardShowcase.titles || []).map(entry => [String(entry?.id || ''), entry]))
    assert(titleMap.current_public_title?.unlocked === true && titleMap.current_public_title?.active === true, 'primary award showcase did not expose current public title')
    assert(titleMap.world_title?.unlocked === true, 'primary award showcase did not unlock world title')
    assert((awardShowcase.summary?.honor_count || 0) >= 4, 'primary award showcase summary did not count unlocked honors')
    assert((awardShowcase.summary?.achievement_count || 0) >= 5, 'primary award showcase summary did not count unlocked achievement cards')
  })

  await runCheck('GET /api/taoyuan/online/profile player chronicle secondary readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/profile')
    assert(response.ok, `secondary online profile chronicle readback returned ${response.status}`)
    const milestones = data?.profile?.player_chronicle?.milestones
    assert(Array.isArray(milestones) && milestones.length >= 8, 'secondary online profile did not expose player chronicle milestones')
    const milestoneMap = Object.fromEntries((milestones || []).map(entry => [String(entry?.id || ''), entry]))
    for (const requiredId of [
      'first_coop_order_completed',
      'first_festival_participation',
      'first_society_join',
      'first_public_project_contribution',
    ]) {
      assert(milestoneMap[requiredId]?.unlocked === true, `secondary player chronicle did not unlock ${requiredId}`)
      assert(Number(milestoneMap[requiredId]?.recorded_at || 0) > 0, `secondary player chronicle did not persist timestamp for ${requiredId}`)
      assert(String(milestoneMap[requiredId]?.detail || '').length > 0, `secondary player chronicle did not persist detail for ${requiredId}`)
    }
    const awardShowcase = data?.profile?.award_showcase
    assert(awardShowcase && Array.isArray(awardShowcase.honors) && awardShowcase.honors.length >= 8, 'secondary online profile did not expose award showcase honors')
    const honorMap = Object.fromEntries((awardShowcase.honors || []).map(entry => [String(entry?.id || ''), entry]))
    for (const requiredHonorId of ['mutual_aid', 'festival_active', 'construction_contributor']) {
      assert(honorMap[requiredHonorId]?.unlocked === true, `secondary award showcase did not unlock ${requiredHonorId}`)
    }
    const commemorativeMap = Object.fromEntries((awardShowcase.commemoratives || []).map(entry => [String(entry?.id || ''), entry]))
    assert(commemorativeMap.festival_memento?.unlocked === true, 'secondary award showcase did not unlock festival commemorative')
    assert(commemorativeMap.society_badge?.unlocked === true, 'secondary award showcase did not unlock society badge')
    const titleMap = Object.fromEntries((awardShowcase.titles || []).map(entry => [String(entry?.id || ''), entry]))
    assert(titleMap.current_public_title?.unlocked === true, 'secondary award showcase did not expose current public title')
    assert(Array.isArray(awardShowcase.achievement_cards) && awardShowcase.achievement_cards.some(entry => entry?.id === 'first_coop_order_completed' && entry?.unlocked === true), 'secondary award showcase did not expose unlocked achievement card')
  })

  await runCheck('POST /api/taoyuan/online/societies/leave write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies/leave', {
      method: 'POST',
    })
    assert(response.ok, `society leave returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.left_society_id === createdSocietyId, 'society leave payload is incomplete')

    const leaveReadback = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(leaveReadback.response.ok, `society leave readback returned ${leaveReadback.response.status}`)
    assert(leaveReadback.data?.ok === true && !leaveReadback.data?.my_society, 'society leave did not remove member society from leaver overview')

    const ownerReadback = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(ownerReadback.response.ok, `society owner readback after leave returned ${ownerReadback.response.status}`)
    assert(ownerReadback.data?.ok === true && ownerReadback.data?.my_society?.id === createdSocietyId, 'society leave should not dissolve society while owner remains')
    assert(Array.isArray(ownerReadback.data?.my_society?.members) && !ownerReadback.data.my_society.members.some(entry => entry?.username === secondarySessionState.username), 'society leave did not remove secondary member from owner readback')
  })

  await runCheck('POST /api/taoyuan/online/societies/invite save id write path', async () => {
    assert(secondarySaveIdentity?.save_id, 'secondary save identity missing before society invite save id check')
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_save_id: secondarySaveIdentity.save_id,
      }),
    })
    assert(response.ok, `society invite returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.status === 'pending', 'society invite payload is incomplete')
    assert(data?.request?.target_save_id === secondarySaveIdentity.save_id, 'society invite did not persist target save id')
    assert(data?.request?.target_save_slot === secondarySaveIdentity.save_slot, 'society invite did not persist target save slot')
    createdSocietyInviteRequestId = String(data?.request?.id || '')
    assert(createdSocietyInviteRequestId, 'society invite did not create request id')
  })

  await runCheck('GET /api/taoyuan/online/societies invite readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(response.ok, `society invite readback returned ${response.status}`)
    assert(data?.ok === true, 'society invite readback payload is incomplete')
    const invite = data?.incoming_invites?.find(entry => entry?.id === createdSocietyInviteRequestId)
    assert(invite?.target_save_id === secondarySaveIdentity.save_id, 'society invite readback missing target save id')
    assert(invite?.target_save_slot === secondarySaveIdentity.save_slot, 'society invite readback missing target save slot')
  })

  await runCheck('POST /api/taoyuan/online/societies/requests/:requestId/reject invite path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/societies/requests/${encodeURIComponent(createdSocietyInviteRequestId)}/reject`, {
      method: 'POST',
    })
    assert(response.ok, `society invite reject returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.status === 'rejected', 'society invite reject payload is incomplete')
    assert(data?.request?.target_save_id === secondarySaveIdentity.save_id, 'society invite reject did not preserve target save id')
    assert(data?.request?.target_save_slot === secondarySaveIdentity.save_slot, 'society invite reject did not preserve target save slot')
  })

  await runCheck('POST /api/taoyuan/online/societies/:societyId/apply rejoin path', async () => {
    let { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/societies/${encodeURIComponent(createdSocietyId)}/apply`, {
      method: 'POST',
    })
    if (response.status === 429 && data?.code === 'ONLINE_RATE_LIMITED') {
      const retryAfterMs = Math.max(1000, Math.min(65_000, Math.floor(Number(data?.retry_after_ms) || 1000)))
      await wait(retryAfterMs + 100)
      const retryResult = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/societies/${encodeURIComponent(createdSocietyId)}/apply`, {
        method: 'POST',
      })
      response = retryResult.response
      data = retryResult.data
    }
    assert(response.ok, `society rejoin apply returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.status === 'pending', 'society rejoin apply payload is incomplete')
    assert(data?.request?.target_save_id === secondarySaveIdentity.save_id, 'society rejoin apply did not persist target save id')
    assert(data?.request?.target_save_slot === secondarySaveIdentity.save_slot, 'society rejoin apply did not persist target save slot')
    rejoinedSocietyRequestId = String(data?.request?.id || '')
    assert(rejoinedSocietyRequestId, 'society rejoin apply did not create request id')
  })

  await runCheck('POST /api/taoyuan/online/societies/requests/:requestId/accept rejoin path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/societies/requests/${encodeURIComponent(rejoinedSocietyRequestId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `society rejoin accept returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.request?.status === 'accepted', 'society rejoin accept payload is incomplete')
    assert(data?.request?.target_save_id === secondarySaveIdentity.save_id, 'society rejoin accept did not preserve target save id')
    assert(data?.request?.target_save_slot === secondarySaveIdentity.save_slot, 'society rejoin accept did not preserve target save slot')
    assert(Array.isArray(data?.overview?.my_society?.members) && data.overview.my_society.members.some(entry => entry?.username === secondarySessionState.username && entry?.save_id === secondarySaveIdentity.save_id), 'society rejoin accept did not restore the member')
  })

  await runCheck('POST /api/taoyuan/online/societies/leave president transfer path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/societies/leave', {
      method: 'POST',
    })
    assert(response.ok, `society president leave returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.left_society_id === createdSocietyId, 'society president leave payload is incomplete')

    const founderReadback = await fetchAuthedJson('/api/taoyuan/online/societies')
    assert(founderReadback.response.ok, `founder society readback after leave returned ${founderReadback.response.status}`)
    assert(founderReadback.data?.ok === true && !founderReadback.data?.my_society, 'society president leave did not clear founder society ownership')

    const inheritedReadback = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/societies')
    assert(inheritedReadback.response.ok, `inherited society readback returned ${inheritedReadback.response.status}`)
    assert(inheritedReadback.data?.ok === true && inheritedReadback.data?.my_society?.id === createdSocietyId, 'society president leave did not preserve the society for the remaining member')
    assert(String(inheritedReadback.data?.my_society?.my_role || '') === 'president', 'society president leave did not transfer the president role')
    assert(inheritedReadback.data?.my_society?.can_manage_roles === true, 'society president leave did not preserve management rights')
    assert(
      Array.isArray(inheritedReadback.data?.my_society?.chronicle?.role_history) &&
      inheritedReadback.data.my_society.chronicle.role_history.some(entry =>
        entry?.username === secondarySessionState.username &&
        entry?.source === 'president_transfer' &&
        entry?.save_id === secondarySaveIdentity.save_id &&
        entry?.save_slot === secondarySaveIdentity.save_slot
      ),
      'society president transfer history did not preserve successor save identity',
    )
    const inheritedBridgeProject = inheritedReadback.data?.my_society?.public_projects?.find(entry => entry?.id === 'bridge')
    assert(inheritedBridgeProject && String(inheritedBridgeProject?.status || '') === 'completed', 'society inherited readback did not preserve completed public project status')
    assert(
      typeof inheritedBridgeProject?.world_feedback === 'string' &&
      inheritedBridgeProject.world_feedback.includes('桥头会面'),
      'society inherited readback did not preserve completed project world feedback',
    )
    assert(Number(inheritedReadback.data?.my_society?.level || 0) >= 1, 'society inherited readback did not preserve society level')
    assert(Array.isArray(inheritedReadback.data?.my_society?.welfare_unlocks) && inheritedReadback.data.my_society.welfare_unlocks.length >= 1, 'society inherited readback did not preserve welfare unlocks')
    assert(
      inheritedReadback.data?.my_society?.public_warehouse &&
      Array.isArray(inheritedReadback.data.my_society.public_warehouse.logs) &&
      inheritedReadback.data.my_society.public_warehouse.logs.some(entry => entry?.username === secondarySessionState.username),
      'society inherited readback did not preserve warehouse logs',
    )
  })

  await runCheck('fourth session bootstrap', async () => {
    await bootstrapSession(quaternarySessionState, 'smk4', 180)
  })

  await runCheck('POST /api/taoyuan/online/orders multi-stage write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: relayCoopOrderTitle,
        description: 'smoke relay coop order',
        order_type: 'village_build',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'gift',
        reward_value: 2,
        reward_label: '接力礼包',
        stage_definitions: [
          {
            title: '先补齐木材',
            description: '第一段先去补木材',
            preferred_order_type: 'material_help',
            target_item_id: 'wood',
            target_quantity: 2,
          },
          {
            title: '再补石料',
            description: '第二段再去补石料',
            preferred_order_type: 'village_build',
            target_item_id: 'stone',
            target_quantity: 3,
          },
        ],
      }),
    })
    assert(response.ok, `multi-stage coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.collaboration_mode === 'multi_stage', 'multi-stage coop order payload is incomplete')
    assert(Array.isArray(data?.order?.stages) && data.order.stages.length === 2, 'multi-stage coop order did not create 2 stages')
    relayCoopOrderId = String(data?.order?.id || '')
    relayStageOneId = String(data?.order?.stages?.[0]?.id || '')
    relayStageTwoId = String(data?.order?.stages?.[1]?.id || '')
    assert(relayCoopOrderId && relayStageOneId && relayStageTwoId, 'multi-stage coop order ids are incomplete')

    const overview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(overview.response.ok, `multi-stage coop order overview returned ${overview.response.status}`)
    assert(Number(overview.data?.board_summary?.relay_orders) >= 1, 'coop order board summary did not count relay orders')
    assert(Number(overview.data?.board_summary?.open_relay_orders) >= 1, 'coop order board summary did not count open relay orders')
  })

  await runCheck('POST /api/taoyuan/online/orders crop processing relay template', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: cropRelayCoopOrderTitle,
        description: 'smoke crop to processing to delivery relay',
        order_type: 'festival_supply',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'gift',
        reward_value: 3,
        reward_label: '作物接力礼包',
        relay_template_id: 'crop_processing_delivery',
        crop_item_id: 'rice',
        crop_label: '稻米',
        crop_quantity: 2,
        processed_item_id: 'rice_flour',
        processed_label: '米粉',
        processed_quantity: 1,
        delivery_item_id: 'rice_flour',
        delivery_label: '米粉交付',
        delivery_quantity: 1,
      }),
    })
    assert(response.ok, `crop processing relay write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.relay_template_id === 'crop_processing_delivery', 'crop processing relay template id missing')
    assert(data?.order?.collaboration_mode === 'multi_stage', 'crop processing relay did not become multi-stage')
    assert(Array.isArray(data?.order?.stages) && data.order.stages.length === 3, 'crop processing relay did not create 3 stages')
    assert(data.order.stages[0]?.target_item_id === 'rice', 'crop relay first stage should target raw crop')
    assert(data.order.stages[1]?.target_item_id === 'rice_flour', 'crop relay second stage should target processed item')
    assert(data.order.stages[2]?.target_item_id === 'rice_flour', 'crop relay third stage should target delivery item')
    const overview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(overview.response.ok, `crop processing relay overview returned ${overview.response.status}`)
    const cropRelayOrder = overview.data?.orders?.find(entry => entry?.id === data.order.id)
    assert(cropRelayOrder?.visual_state?.board_type === 'async', 'crop processing relay did not expose async visual state')
    assert(cropRelayOrder.visual_state.async_projects?.[0]?.stages?.length === 3, 'crop relay visual state did not mirror generated stages')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/accept stage one path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageOneId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage one accept returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.id === relayStageOneId && data?.stage?.assignee_username === secondarySessionState.username, 'multi-stage stage one accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/accept stage two path', async () => {
    const { response, data } = await fetchSessionJson(quaternarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageTwoId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage two accept returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.id === relayStageTwoId && data?.stage?.assignee_username === quaternarySessionState.username, 'multi-stage stage two accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/deliver stage one path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageOneId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          { item_id: 'wood', quantity: 2 },
        ],
        result_note: 'stage one delivered',
      }),
    })
    assert(response.ok, `multi-stage stage one deliver returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'submitted', 'multi-stage stage one deliver payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/confirm-delivery stage one path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageOneId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage one confirm returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'confirmed', 'multi-stage stage one confirm payload is incomplete')
    relayStageOneReceiptId = String(data?.receipt?.id || '')
    assert(relayStageOneReceiptId, 'multi-stage stage one confirm did not return receipt id')
    assert(data?.receipt?.relay_split_mode === 'stage_pool_weighted', 'stage one receipt should keep relay split mode')
    assert(Number(data?.receipt?.relay_pool_reward_value) === 2, 'stage one receipt should keep relay pool reward value')
    assert(Number(data?.receipt?.relay_stage_count) === 2, 'stage one receipt should keep relay stage count')
    assert(Number(data?.receipt?.relay_stage_sequence) === 1, 'stage one receipt should keep relay stage sequence')
    assert(Number(data?.receipt?.relay_participant_count) === 2, 'stage one receipt should keep relay participant count')
    assert(Number(data?.receipt?.relay_share_percent) === 50, 'stage one receipt should keep relay share percent')
    assert(Number(data?.receipt?.relay_allocated_reward_value) === 2, 'stage one receipt should keep allocated reward value')
    assert(String(data?.receipt?.relay_share_summary || '').includes('1/2'), 'stage one receipt should keep relay share summary')
    assert(data?.order?.status === 'open', 'multi-stage order should stay open until all stages are confirmed')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/deliver stage two path', async () => {
    const { response, data } = await fetchSessionJson(quaternarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageTwoId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          { item_id: 'stone', quantity: 3 },
        ],
        result_note: 'stage two delivered',
      }),
    })
    assert(response.ok, `multi-stage stage two deliver returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'submitted', 'multi-stage stage two deliver payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/confirm-delivery stage two path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageTwoId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage two confirm returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'confirmed', 'multi-stage stage two confirm payload is incomplete')
    relayStageTwoReceiptId = String(data?.receipt?.id || '')
    assert(relayStageTwoReceiptId, 'multi-stage stage two confirm did not return receipt id')
    assert(data?.receipt?.relay_split_mode === 'stage_pool_weighted', 'stage two receipt should keep relay split mode')
    assert(Number(data?.receipt?.relay_pool_reward_value) === 2, 'stage two receipt should keep relay pool reward value')
    assert(Number(data?.receipt?.relay_stage_count) === 2, 'stage two receipt should keep relay stage count')
    assert(Number(data?.receipt?.relay_stage_sequence) === 2, 'stage two receipt should keep relay stage sequence')
    assert(Number(data?.receipt?.relay_share_percent) === 50, 'stage two receipt should keep relay share percent')
    assert(Number(data?.receipt?.relay_pending_reward_value) === 1, 'stage two receipt should preserve pending pool value before final close')
    assert(String(data?.receipt?.relay_share_summary || '').includes('2/2'), 'stage two receipt should keep relay share summary')
    assert(data?.order?.status === 'closed', 'multi-stage order should close after all stages are confirmed')
  })

  await runCheck('GET /api/taoyuan/online/orders multi-stage readback', async () => {
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `multi-stage owner overview returned ${primaryOverview.response.status}`)
    const relayOrder = primaryOverview.data?.orders?.find(entry => entry?.id === relayCoopOrderId)
    assert(relayOrder && Array.isArray(relayOrder.stages) && relayOrder.stages.length === 2, 'multi-stage order readback is incomplete')
    assert(relayOrder.stages.every(stage => stage.delivery_status === 'confirmed'), 'multi-stage order did not persist confirmed stage states')
    assert(relayOrder.relay_settlement_summary?.split_mode === 'stage_pool_weighted', 'multi-stage order did not expose relay settlement split plan')
    assert(relayOrder.relay_settlement_summary?.status === 'settled', 'multi-stage order relay settlement summary did not settle after all stages')
    assert(Number(relayOrder.relay_settlement_summary?.pool_reward_value) === 2, 'multi-stage order relay settlement pool did not preserve total reward')
    assert(Number(relayOrder.relay_settlement_summary?.confirmed_reward_value) === 2, 'multi-stage order relay settlement did not sum confirmed payouts')
    assert(Array.isArray(relayOrder.relay_settlement_summary?.shares) && relayOrder.relay_settlement_summary.shares.length === 2, 'multi-stage order relay settlement shares missing')
    assert(relayOrder.relay_settlement_summary.shares.every(share => Number(share.reward_value) === 1 && Number(share.share_percent) === 50), 'multi-stage order relay settlement shares should split the reward pool evenly')
    assert(relayOrder.relay_settlement_summary.shares.every(share => share.settlement_receipt_id && share.settlement_status === 'confirmed'), 'multi-stage order relay settlement shares did not retain confirmed receipts')
    const relayReceipts = primaryOverview.data?.receipts?.filter(entry => entry?.order_id === relayCoopOrderId) || []
    assert(relayReceipts.length >= 2, 'multi-stage order receipts did not persist both relay stage receipts')
    const stageOneReceipt = relayReceipts.find(entry => entry?.id === relayStageOneReceiptId)
    const stageTwoReceipt = relayReceipts.find(entry => entry?.id === relayStageTwoReceiptId)
    assert(stageOneReceipt?.relay_split_mode === 'stage_pool_weighted' && stageTwoReceipt?.relay_split_mode === 'stage_pool_weighted', 'relay receipts did not persist split mode')
    assert(Number(stageOneReceipt?.relay_pool_reward_value) === 2 && Number(stageTwoReceipt?.relay_pool_reward_value) === 2, 'relay receipts did not persist pool value')
    assert(Number(stageOneReceipt?.relay_stage_sequence) === 1 && Number(stageTwoReceipt?.relay_stage_sequence) === 2, 'relay receipts did not persist stage sequence')
    assert(Number(stageOneReceipt?.relay_share_percent) === 50 && Number(stageTwoReceipt?.relay_share_percent) === 50, 'relay receipts did not persist share percent')
    assert(String(stageOneReceipt?.relay_share_summary || '').includes('1/2') && String(stageTwoReceipt?.relay_share_summary || '').includes('2/2'), 'relay receipts did not persist share summaries')
    assert(relayOrder?.visual_state?.board_type === 'async', 'multi-stage order did not expose async relay visual state')
    const relayVisualProject = relayOrder.visual_state.async_projects?.[0]
    assert(relayVisualProject?.kind === 'order_relay', 'multi-stage order visual project kind mismatch')
    assert(Array.isArray(relayVisualProject?.stages) && relayVisualProject.stages.length === 2, 'multi-stage order visual project did not mirror stages')
    assert(relayVisualProject.stages.every(stage => stage.state === 'complete'), 'multi-stage order visual stages should be complete after confirmation')
    assert(Array.isArray(relayVisualProject.contributors) && relayVisualProject.contributors.length === 2, 'multi-stage order visual contributors missing helpers')
    assert(Array.isArray(relayVisualProject.history) && relayVisualProject.history.some(entry => entry?.type === 'stage_complete'), 'multi-stage order visual history missing completion entries')
    assert(relayOrder.visual_state.recent_feedback.includes('已完成'), 'multi-stage order visual feedback did not summarize completion')
    assert(Array.isArray(relayOrder.visual_state.story_flow?.chapters) && relayOrder.visual_state.story_flow.chapters.length === 2, 'multi-stage order story flow did not mirror stage chapters')
    assert(relayOrder.visual_state.story_flow.chapters.every(chapter => chapter?.state === 'confirmed' && chapter?.settlement_summary?.includes('凭证')), 'multi-stage order story flow did not retain confirmed receipt story')
    assert(Array.isArray(relayOrder.visual_state.story_flow?.timeline) && relayOrder.visual_state.story_flow.timeline.some(entry => entry?.type === 'stage_complete'), 'multi-stage order story flow timeline missing completion story')
    assert(Number(primaryOverview.data?.board_summary?.relay_orders) >= 1, 'multi-stage owner overview lost relay order board summary')
    assert(Number(primaryOverview.data?.society_order_board?.public_relay_orders) >= 1, 'society order board did not count public relay orders')
    assert(Number(primaryOverview.data?.society_order_board?.settlement_status_counts?.settled) >= 1, 'society order board did not count settled public relays')
    assert(primaryOverview.data?.society_order_board?.recent_receipts?.some(entry => entry?.order_id === relayCoopOrderId && entry?.receipt_id), 'society order board did not expose relay receipts')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `multi-stage secondary overview returned ${secondaryOverview.response.status}`)
    assert(secondaryOverview.data?.reputation_summary?.top_helped_targets?.some(entry => entry?.username === sessionState.username), 'multi-stage trust graph missing stage one helper relation')

    const quaternaryOverview = await fetchSessionJson(quaternarySessionState, '/api/taoyuan/online/orders')
    assert(quaternaryOverview.response.ok, `multi-stage quaternary overview returned ${quaternaryOverview.response.status}`)
    assert(quaternaryOverview.data?.reputation_summary?.top_helped_targets?.some(entry => entry?.username === sessionState.username), 'multi-stage trust graph missing stage two helper relation')
  })

  await runCheck('POST /api/taoyuan/hall/posts reward help path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `reward help post ${Date.now()}`,
        content: 'need help',
        blocks: [
          { id: 'reward_help_block', type: 'text', text: 'need help' },
        ],
        type: 'help',
        reward_amount: 100,
      }),
    })
    assert(response.ok, `reward help post returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.id, 'reward help post payload is incomplete')
    primaryExpectedMoney -= 100
    rewardPostId = String(data.post.id)
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/replies reward path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(rewardPostId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'reward reply content',
      }),
    })
    assert(response.ok, `reward reply create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.replies?.length, 'reward reply payload is incomplete')
    rewardReplyId = String(data.post.replies[data.post.replies.length - 1]?.id || '')
    assert(rewardReplyId, 'reward reply id was not created')
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/best-reply payout path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(rewardPostId)}/best-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply_id: rewardReplyId,
      }),
    })
    assert(response.ok, `best reply returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.reward_paid_to === secondarySessionState.username, 'best reply payout payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/save/:slot second user payout persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `second user save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'second user save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    secondaryExpectedMoney += 100
    assert(Number(decrypted?.player?.money) === secondaryExpectedMoney, `best reply payout did not persist to second user save, expected money=${secondaryExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  let refundablePostId = ''
  await runCheck('POST /api/taoyuan/hall/posts refundable help path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `refund help post ${Date.now()}`,
        content: 'refund me later',
        blocks: [
          { id: 'refund_help_block', type: 'text', text: 'refund me later' },
        ],
        type: 'help',
        reward_amount: 80,
      }),
    })
    assert(response.ok, `refundable help post returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.id, 'refundable help post payload is incomplete')
    primaryExpectedMoney -= 80
    refundablePostId = String(data.post.id)
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id refund path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(refundablePostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `hall refund delete returned ${response.status}`)
    assert(data?.ok === true && data?.refunded === true, 'hall refund delete payload is incomplete')
    primaryExpectedMoney += 80
  })

  let rewardMailId = ''
  await runCheck('POST /api/admin/taoyuan/mail/campaigns reward path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for reward mail smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        action: 'send',
        template_type: 'activity_reward',
        title: `smoke reward ${Date.now()}`,
        content: 'smoke reward content',
        recipient_rule: {
          mode: 'single',
          username: sessionState.username,
          target_slot: 0,
        },
        rewards: [
          {
            type: 'money',
            amount: 321,
          },
        ],
        duplicate_compensation_money: 0,
      }),
    })
    assert(response.ok, `admin reward campaign returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.campaign?.id, 'admin reward campaign payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list login state', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/list')
    assert(response.ok, `mail list returned ${response.status}`)
    assert(data?.ok === true, 'mail list did not return ok=true')
    assert(Array.isArray(data?.mails), 'mail list payload is incomplete')
    rewardMailId = String(data.mails.find(item => item?.can_claim === true)?.id || '')
    assert(rewardMailId, 'reward mail was not delivered to mailbox list')
  })

  await runCheck('GET /api/taoyuan/mail/:id detail path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/mail/${encodeURIComponent(rewardMailId)}`)
    assert(response.ok, `mail detail returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.id === rewardMailId, 'mail detail payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/mail/:id/read write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/mail/${encodeURIComponent(rewardMailId)}/read`, {
      method: 'POST',
    })
    assert(response.ok, `mail read returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.read_at, 'mail read payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/mail/:id/claim reward path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/mail/${encodeURIComponent(rewardMailId)}/claim`, {
      method: 'POST',
    })
    assert(response.ok, `mail claim returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.result?.money_added === 321, 'mail claim payload is incomplete')
    primaryExpectedMoney += 321
  })

  await runCheck('GET /api/taoyuan/save/:slot reward persistence', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save slot read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'save slot read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === primaryExpectedMoney, `reward payout / refund chain did not persist to primary save slot, expected money=${primaryExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  await runCheck('POST /api/taoyuan/online/manor/visit rate limit path', async () => {
    let limited = null
    for (let index = 0; index < 21; index += 1) {
      const result = await fetchAuthedJson('/api/taoyuan/online/manor/visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_username: secondarySessionState.username,
          purpose: 'smoke_rate_limit',
          behavior: 'loop_visit',
          feedback: `rate-limit-${index}`,
        }),
      })
      if (result.response.status === 429) {
        limited = result
        break
      }
      assert(result.response.ok, `manor visit rate limit warmup returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
    }
    assert(limited, 'online manor visit rate limit did not trigger within the expected request window')
    assert(limited.data?.ok === false && limited.data?.code === 'ONLINE_RATE_LIMITED', 'online manor visit rate limit payload is incomplete')
    assert(Number(limited.data?.retry_after_ms) > 0, 'online manor visit rate limit should expose retry_after_ms')
  })

  await runCheck('GET /api/admin/taoyuan/online-audit admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for online audit admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/online-audit?page=1&page_size=100', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `online audit admin read returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.logs), 'online audit admin payload is incomplete')
    const requiredActions = ['order_publish', 'player_gift_package_send', 'neighbor_consignment_create', 'hall_post_create', 'cohabitation_fund_spend', 'cohabitation_warehouse_sell']
    for (const action of requiredActions) {
      const actionReadback = await fetchAuthedJson(`/api/admin/taoyuan/online-audit?page=1&page_size=20&action=${encodeURIComponent(action)}`, {
        headers: {
          'X-Admin-Token': adminToken,
        },
      })
      assert(actionReadback.response.ok, `online audit filtered read for ${action} returned ${actionReadback.response.status}: ${actionReadback.data?.msg || 'unknown error'}`)
      assert(actionReadback.data?.ok === true && Array.isArray(actionReadback.data?.logs), `online audit filtered payload for ${action} is incomplete`)
      assert(actionReadback.data.logs.some(entry => entry?.action === action), `online audit logs did not capture ${action}`)
    }
    const rateLimitReadback = await fetchAuthedJson('/api/admin/taoyuan/online-audit?page=1&page_size=20&outcome=rate_limited&route_key=manor_social_write', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(rateLimitReadback.response.ok, `online audit rate limit read returned ${rateLimitReadback.response.status}: ${rateLimitReadback.data?.msg || 'unknown error'}`)
    assert(rateLimitReadback.data?.ok === true && Array.isArray(rateLimitReadback.data?.logs), 'online audit rate limit payload is incomplete')
    assert(rateLimitReadback.data.logs.some(entry => entry?.outcome === 'rate_limited' && entry?.route_key === 'manor_social_write'), 'online audit logs did not capture the online rate limit hit')
  })

  let reportId = ''
  await runCheck('POST /api/taoyuan/hall/posts/:id/report admin path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'smoke report reason',
      }),
    })
    assert(response.ok, `hall report returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.report?.id, 'hall report payload is incomplete')
    reportId = String(data.report.id)
  })

  await runCheck('GET /api/admin/taoyuan/hall/reports admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for hall admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/hall/reports', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `hall admin reports returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.reports), 'hall admin reports payload is incomplete')
    assert(data.reports.some(item => item?.id === reportId), 'reported hall item did not reach admin reports')
  })

  await runCheck('POST /api/admin/taoyuan/hall/reports/:id/status admin write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/admin/taoyuan/hall/reports/${encodeURIComponent(reportId)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        status: 'resolved',
      }),
    })
    assert(response.ok, `hall admin report status returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.report?.status === 'resolved', 'hall admin report status payload is incomplete')
  })

  await runCheck('GET /api/admin/me admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/me', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `admin me returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.isAdmin === true, 'admin me payload is incomplete')
  })

  await runCheck('GET /api/admin/official-control/runtime-status optional path', async () => {
    if (!adminToken) return
    const { response, data } = await fetchAuthedJson('/api/admin/official-control/runtime-status', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    if (response.status === 404) return
    assert(response.ok, `official control runtime status returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.status && Array.isArray(data?.readonlyManagedFields), 'official control runtime status payload is incomplete')
  })

  await runCheck('GET /api/admin/taoyuan/market-governance admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for market governance admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/market-governance', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `market governance admin read returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview?.config?.consignment_price_min_money >= 0, 'market governance admin overview payload is incomplete')
    originalMarketGovernanceConfig = data?.overview?.config || null
  })

  await runCheck('POST /api/admin/taoyuan/market-governance admin write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/market-governance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        neighbor_friends_scope_enabled: false,
        consignment_price_max_money: 90,
        daily_trade_action_limit: 12,
      }),
    })
    assert(response.ok, `market governance admin write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview?.config?.neighbor_friends_scope_enabled === false, 'market governance admin write did not persist scope toggle')
    assert(Number(data?.overview?.config?.consignment_price_max_money) === 90, 'market governance admin write did not persist price band update')

    const publicReadback = await fetchAuthedJson('/api/taoyuan/exchange-station/governance')
    assert(publicReadback.response.ok, `market governance public readback returned ${publicReadback.response.status}`)
    assert(publicReadback.data?.governance?.sources?.some(entry => entry?.id === 'neighbor_friends_scope' && entry?.enabled === false), 'market governance public readback did not reflect scope toggle')
    assert(Number(publicReadback.data?.governance?.price_bands?.consignment?.max_money) === 90, 'market governance public readback did not reflect price band update')
  })

  await runCheck('POST /api/admin/taoyuan/market-governance/sanctions/:username admin write path', async () => {
    const sanctionWrite = await fetchAuthedJson(`/api/admin/taoyuan/market-governance/sanctions/${encodeURIComponent(secondarySessionState.username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        blocked: true,
        reason: 'smoke market sanction',
      }),
    })
    assert(sanctionWrite.response.ok, `market governance sanction write returned ${sanctionWrite.response.status}: ${sanctionWrite.data?.msg || 'unknown error'}`)
    assert(sanctionWrite.data?.ok === true && sanctionWrite.data?.sanction?.blocked === true, 'market governance sanction payload is incomplete')

    const blockedTrade = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 70,
        scope: 'neighbors',
      }),
    })
    assert(blockedTrade.response.status === 403, `market governance sanction did not block market action, status=${blockedTrade.response.status}`)
    assert(String(blockedTrade.data?.msg || '').includes('smoke market sanction'), 'market governance sanction did not return sanction reason')

    const sanctionReset = await fetchAuthedJson(`/api/admin/taoyuan/market-governance/sanctions/${encodeURIComponent(secondarySessionState.username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        blocked: false,
        reason: '',
      }),
    })
    assert(sanctionReset.response.ok, `market governance sanction reset returned ${sanctionReset.response.status}: ${sanctionReset.data?.msg || 'unknown error'}`)
    assert(sanctionReset.data?.sanction?.blocked === false, 'market governance sanction reset did not clear block')

    if (originalMarketGovernanceConfig) {
      const configReset = await fetchAuthedJson('/api/admin/taoyuan/market-governance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          ...originalMarketGovernanceConfig,
          rare_item_blocklist: Array.isArray(originalMarketGovernanceConfig.rare_item_blocklist)
            ? originalMarketGovernanceConfig.rare_item_blocklist.join(',')
            : originalMarketGovernanceConfig.rare_item_blocklist,
        }),
      })
      assert(configReset.response.ok, `market governance config reset returned ${configReset.response.status}: ${configReset.data?.msg || 'unknown error'}`)
    }
  })

  await runCheck('third session auth-only bootstrap', async () => {
    await bootstrapAuthOnlySession(tertiarySessionState, 'smk3')
  })

  await runCheck('governance session auth-only bootstrap', async () => {
    await bootstrapAuthOnlySession(governanceSessionState, 'smk5')
  })

  let adminRollbackOrderId = ''
  let adminPendingCompensationOrderId = ''
  let adminPendingCompensationId = ''
  let adminPendingActivityRoomId = ''
  let governanceSeedMoney = 180
  let governanceExpectedMoney = governanceSeedMoney
  let governanceActivityRewardMoney = 0
  await runCheck('POST /api/taoyuan/online/orders admin rollback setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `admin rollback order ${Date.now()}`,
        description: 'smoke admin rollback order',
        order_type: 'material_help',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'money',
        reward_value: 45,
        reward_label: '回滚赏金',
      }),
    })
    assert(response.ok, `admin rollback setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.id, 'admin rollback setup payload is incomplete')
    adminRollbackOrderId = String(data.order.id)
  })

  await runCheck('POST /api/taoyuan/online/orders no-save compensation setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `admin compensation order ${Date.now()}`,
        description: 'smoke admin compensation order',
        order_type: 'festival_supply',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'money',
        reward_value: 88,
        reward_label: '补偿赏金',
      }),
    })
    assert(response.ok, `admin compensation setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.id, 'admin compensation setup payload is incomplete')
    adminPendingCompensationOrderId = String(data.order.id)
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/accept no-save compensation setup', async () => {
    const { response, data } = await fetchSessionJson(governanceSessionState, `/api/taoyuan/online/orders/${encodeURIComponent(adminPendingCompensationOrderId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `no-save compensation accept returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.assignee_username === governanceSessionState.username, 'no-save compensation accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/deliver no-save compensation setup', async () => {
    const { response, data } = await fetchSessionJson(governanceSessionState, `/api/taoyuan/online/orders/${encodeURIComponent(adminPendingCompensationOrderId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivery_note: 'smoke compensation delivery',
        delivered_items: [
          {
            item_id: 'wintersweet',
            quantity: 1,
          },
        ],
      }),
    })
    assert(response.ok, `no-save compensation deliver returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.delivery_status === 'submitted', 'no-save compensation deliver payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/confirm-delivery compensation pending path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(adminPendingCompensationOrderId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `compensation pending confirm returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.receipt?.status === 'compensation_pending', 'compensation pending confirm did not keep receipt pending')
    assert(data?.order?.delivery_status === 'compensation_pending', 'compensation pending confirm did not keep order pending')
    adminPendingCompensationId = String(data?.compensation?.id || '')
    assert(adminPendingCompensationId, 'compensation pending confirm did not create compensation id')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms no-save retry-close setup', async () => {
    const createResponse = await fetchAuthedJson('/api/taoyuan/online/festival/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: 'lantern_fair',
        gameplay_template_id: 'gathering',
        countdown_seconds: 1,
        title: `admin retry close room ${Date.now()}`,
      }),
    })
    assert(createResponse.response.ok, `admin retry-close room create returned ${createResponse.response.status}: ${createResponse.data?.msg || 'unknown error'}`)
    assert(createResponse.data?.ok === true && createResponse.data?.room?.id, 'admin retry-close room create payload is incomplete')
    adminPendingActivityRoomId = String(createResponse.data.room.id)

    const inviteResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: governanceSessionState.username,
      }),
    })
    assert(inviteResponse.response.ok, `admin retry-close room invite returned ${inviteResponse.response.status}: ${inviteResponse.data?.msg || 'unknown error'}`)

    const joinResponse = await fetchSessionJson(governanceSessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/join`, {
      method: 'POST',
    })
    assert(joinResponse.response.ok, `admin retry-close room join returned ${joinResponse.response.status}: ${joinResponse.data?.msg || 'unknown error'}`)

    const readyCheckResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(readyCheckResponse.response.ok, `admin retry-close room ready-check returned ${readyCheckResponse.response.status}: ${readyCheckResponse.data?.msg || 'unknown error'}`)

    const hostReadyResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(hostReadyResponse.response.ok, `admin retry-close room host ready returned ${hostReadyResponse.response.status}: ${hostReadyResponse.data?.msg || 'unknown error'}`)

    const memberReadyResponse = await fetchSessionJson(governanceSessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/ready`, {
      method: 'POST',
    })
    assert(memberReadyResponse.response.ok, `admin retry-close room member ready returned ${memberReadyResponse.response.status}: ${memberReadyResponse.data?.msg || 'unknown error'}`)

    const startResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(startResponse.response.ok, `admin retry-close room start returned ${startResponse.response.status}: ${startResponse.data?.msg || 'unknown error'}`)

    await wait(2200)
    const runningReadback = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(runningReadback.response.ok, `admin retry-close running readback returned ${runningReadback.response.status}`)
    assert(String(runningReadback.data?.my_room?.state || '') === 'running', 'admin retry-close room did not reach running')

    const hostActionResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionState.csrfToken,
      },
      body: JSON.stringify({
        action_id: 'deliver_bundle',
        idempotency_key: 'qa-online-admin-retry-close-deliver-bundle',
      }),
    })
    assert(hostActionResponse.response.ok, `admin retry-close host action returned ${hostActionResponse.response.status}: ${hostActionResponse.data?.msg || 'unknown error'}`)

    const memberActionResponse = await fetchSessionJson(governanceSessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_id: 'sort_bundle',
        idempotency_key: 'qa-online-admin-retry-close-sort-bundle',
      }),
    })
    assert(memberActionResponse.response.ok, `admin retry-close member action returned ${memberActionResponse.response.status}: ${memberActionResponse.data?.msg || 'unknown error'}`)

    const settleResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(settleResponse.response.ok, `admin retry-close room settle returned ${settleResponse.response.status}: ${settleResponse.data?.msg || 'unknown error'}`)
    assert(String(settleResponse.data?.room?.state || '') === 'settling', 'admin retry-close room did not enter settling')

    const closeResponse = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(closeResponse.response.ok, `admin retry-close room initial close returned ${closeResponse.response.status}: ${closeResponse.data?.msg || 'unknown error'}`)
    assert(String(closeResponse.data?.room?.state || '') === 'settling', 'admin retry-close room should stay settling before remediation')
    const governanceReceipt = closeResponse.data?.room?.settlement_receipts?.find(entry => entry?.target_username === governanceSessionState.username)
    assert(governanceReceipt?.status === 'compensation_pending', 'admin retry-close room did not leave the no-save member pending')
    governanceActivityRewardMoney = Math.max(0, Math.floor(Number(governanceReceipt?.reward_payload?.money) || 0))
  })

  await runCheck('POST /api/admin/users/:username/status ban setup', async () => {
    const { response, data } = await fetchAdminJson(`/api/admin/users/${encodeURIComponent(quaternarySessionState.username)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'banned',
      }),
    })
    assert(response.ok, `ban setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.user?.status === 'banned', 'ban setup payload is incomplete')
  })

  await runCheck('GET /api/admin/taoyuan/overview governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/overview')
    assert(response.ok, `admin overview returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview?.summary, 'admin overview payload is incomplete')
    assert(Number(data.overview.summary.pending_coop_compensation_count) >= 1, 'admin overview did not expose pending coop compensations')
    assert(Number(data.overview.summary.pending_activity_receipt_count) >= 1, 'admin overview did not expose pending activity receipts')
    assert(data.overview.coop.compensations.some(entry => entry?.id === adminPendingCompensationId), 'admin overview did not expose the pending compensation record')
    assert(data.overview.activities.rooms.some(entry => entry?.id === adminPendingActivityRoomId && entry?.state === 'settling'), 'admin overview did not expose the settling activity room')
    assert(data.overview.recent_players.some(entry => entry?.username === quaternarySessionState.username && entry?.status === 'banned'), 'admin overview did not surface the banned player state')
    assert(data.overview.societies.some(entry => entry?.id === createdSocietyId), 'admin overview did not surface the created society')
  })

  await runCheck('GET /api/admin/taoyuan/realtime governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/realtime')
    assert(response.ok, `admin realtime returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const realtime = data?.realtime
    assert(data?.ok === true && realtime, 'admin realtime payload is incomplete')
    assert(Number.isFinite(Number(realtime.connection_count)), 'admin realtime did not expose connection count')
    assert(Number.isFinite(Number(realtime.online_user_count)), 'admin realtime did not expose online user count')
    assert(Number.isFinite(Number(realtime.online_save_count)), 'admin realtime did not expose online save count')
    assert(Array.isArray(realtime.connections), 'admin realtime did not expose connections')
    assert(Number.isFinite(Number(realtime.queued_notification_count)), 'admin realtime did not expose queued notification count')
    assert(Array.isArray(realtime.queued_by_user), 'admin realtime did not expose queued notification summary')
    assert(realtime.queued_type_counts && typeof realtime.queued_type_counts === 'object' && !Array.isArray(realtime.queued_type_counts), 'admin realtime did not expose queued type counts')
    assert(['ok', 'missing', 'error'].includes(realtime.queue_status), 'admin realtime queue status is invalid')
    assert(Number(realtime.queue_limits?.max_queued_events_per_user) >= 1, 'admin realtime did not expose queue limits')
    for (const entry of realtime.queued_by_user) {
      assert(typeof entry?.username === 'string' && entry.username, 'admin realtime queued user summary is missing username')
      assert(Number(entry?.pending_count) >= 1, 'admin realtime queued user summary is missing pending count')
      assert(Number(entry?.latest_created_at) >= 0, 'admin realtime queued user summary is missing latest time')
      assert(entry?.type_counts && typeof entry.type_counts === 'object' && !Array.isArray(entry.type_counts), 'admin realtime queued user summary is missing type counts')
      assert(entry.payload === undefined, 'admin realtime queued user summary leaked notification payload')
    }
  })

  await runCheck('GET /api/admin/taoyuan/players governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/players?page=1&page_size=20&status=banned')
    assert(response.ok, `admin players returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.users), 'admin players payload is incomplete')
    assert(data.users.some(entry => entry?.username === quaternarySessionState.username && entry?.status === 'banned'), 'admin players did not expose the banned user')
  })

  await runCheck('GET /api/admin/taoyuan/societies governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/societies')
    assert(response.ok, `admin societies returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.societies), 'admin societies payload is incomplete')
    assert(data.societies.some(entry => entry?.id === createdSocietyId), 'admin societies did not expose the created society')
  })

  await runCheck('GET /api/admin/taoyuan/manors governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/manors?limit=10')
    assert(response.ok, `admin manors returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.hot_manors), 'admin manors payload is incomplete')
    assert(Array.isArray(data?.favorites?.favorites), 'admin manors favorites payload is incomplete')
    assert(data.hot_manors.some(entry => entry?.manor_username === sessionState.username), 'admin manors did not surface the favorited hot manor')
  })

  await runCheck('GET /api/admin/taoyuan/orders governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/orders')
    assert(response.ok, `admin orders returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview && Array.isArray(data.overview.orders) && Array.isArray(data.overview.compensations), 'admin orders payload is incomplete')
    assert(data.overview.orders.some(entry => entry?.id === adminRollbackOrderId), 'admin orders did not expose the rollback candidate')
    assert(data.overview.compensations.some(entry => entry?.id === adminPendingCompensationId && entry?.status === 'pending'), 'admin orders did not expose the pending compensation')
  })

  await runCheck('GET /api/admin/taoyuan/festival governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/festival?domain=festival')
    assert(response.ok, `admin festival returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.rooms && Array.isArray(data.rooms.rooms) && Array.isArray(data.rooms.receipts), 'admin festival payload is incomplete')
    assert(data.rooms.rooms.some(entry => entry?.id === adminPendingActivityRoomId && entry?.state === 'settling'), 'admin festival did not expose the settling room')
    assert(data.rooms.receipts.some(entry => entry?.target_username === governanceSessionState.username && entry?.status === 'compensation_pending'), 'admin festival did not expose the pending receipt')
  })

  await runCheck('GET /api/admin/taoyuan/hall/overview governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/hall/overview')
    assert(response.ok, `admin hall overview returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.posts) && Array.isArray(data?.reports) && Array.isArray(data?.image_reports) && Array.isArray(data?.blacklist), 'admin hall overview payload is incomplete')
    assert(data.reports.some(entry => entry?.id === reportId), 'admin hall overview did not expose the hall report')
  })

  await runCheck('GET /api/admin/taoyuan/audit-logs governance read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/audit-logs?page=1&page_size=40&action=order_publish')
    assert(response.ok, `admin taoyuan audit logs returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.logs), 'admin taoyuan audit logs payload is incomplete')
    assert(data.logs.some(entry => entry?.action === 'order_publish'), 'admin taoyuan audit logs did not expose online order publish audits')
  })

  await runCheck('POST /api/admin/taoyuan/orders/:orderId/rollback admin path', async () => {
    const { response, data } = await fetchAdminJson(`/api/admin/taoyuan/orders/${encodeURIComponent(adminRollbackOrderId)}/rollback`, {
      method: 'POST',
    })
    assert(response.ok, `admin rollback returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.order?.id === adminRollbackOrderId, 'admin rollback payload is incomplete')
    assert(String(data?.order?.status || '') === 'closed', 'admin rollback did not close the order')
  })

  await runCheck('POST /api/taoyuan/save/0 governance save provision path', async () => {
    await seedSessionSave(governanceSessionState, governanceSeedMoney)
  })

  await runCheck('POST /api/admin/taoyuan/orders/compensations/:id/retry admin path', async () => {
    const { response, data } = await fetchAdminJson(`/api/admin/taoyuan/orders/compensations/${encodeURIComponent(adminPendingCompensationId)}/retry`, {
      method: 'POST',
    })
    assert(response.ok, `admin compensation retry returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.compensation?.status === 'resolved', 'admin compensation retry did not resolve the compensation')
    assert(String(data?.receipt?.status || '') === 'confirmed', 'admin compensation retry did not confirm the receipt')
    assert(String(data?.order?.delivery_status || '') === 'confirmed', 'admin compensation retry did not confirm the order')
    governanceExpectedMoney += 88
  })

  await runCheck('POST /api/admin/taoyuan/festival/rooms/:roomId/retry-close admin path', async () => {
    const { response, data } = await fetchAdminJson(`/api/admin/taoyuan/festival/rooms/${encodeURIComponent(adminPendingActivityRoomId)}/retry-close`, {
      method: 'POST',
    })
    assert(response.ok, `admin retry-close returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.id === adminPendingActivityRoomId, 'admin retry-close payload is incomplete')
    assert(String(data?.room?.state || '') === 'closed', 'admin retry-close did not close the room')
    assert(Array.isArray(data?.room?.settlement_receipts) && data.room.settlement_receipts.every(entry => entry?.status === 'persisted'), 'admin retry-close did not persist all receipts')
    governanceExpectedMoney += governanceActivityRewardMoney
  })

  await runCheck('GET /api/taoyuan/save/0 governance remediation persistence', async () => {
    const { response, data } = await fetchSessionJson(governanceSessionState, '/api/taoyuan/save/0')
    assert(response.ok, `governance save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'governance save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === governanceExpectedMoney, `governance remediation did not persist rewards correctly, expected money=${governanceExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  await runCheck('POST /api/admin/taoyuan/users/:username/unban admin path', async () => {
    const { response, data } = await fetchAdminJson(`/api/admin/taoyuan/users/${encodeURIComponent(quaternarySessionState.username)}/unban`, {
      method: 'POST',
    })
    assert(response.ok, `admin unban returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.user?.username === quaternarySessionState.username, 'admin unban payload is incomplete')
    assert(String(data?.user?.status || '') === 'active', 'admin unban did not restore the account to active')
  })

  await runCheck('GET /api/admin/audit-logs governance admin log read path', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/audit-logs?page=1&page_size=80')
    assert(response.ok, `admin audit logs returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.logs), 'admin audit logs payload is incomplete')
    assert(data.logs.some(entry => entry?.action === 'rollback_coop_order' && entry?.detail?.order_id === adminRollbackOrderId), 'admin audit logs did not capture rollback_coop_order')
    assert(data.logs.some(entry => entry?.action === 'retry_coop_compensation' && entry?.detail?.compensation_id === adminPendingCompensationId), 'admin audit logs did not capture retry_coop_compensation')
    assert(data.logs.some(entry => entry?.action === 'retry_activity_room_close' && entry?.detail?.room_id === adminPendingActivityRoomId), 'admin audit logs did not capture retry_activity_room_close')
    assert(data.logs.some(entry => entry?.action === 'unban_user' && entry?.target_username === quaternarySessionState.username), 'admin audit logs did not capture unban_user')
  })

  await runCheck('GET /api/admin/taoyuan/overview governance remediation readback', async () => {
    const { response, data } = await fetchAdminJson('/api/admin/taoyuan/overview')
    assert(response.ok, `admin overview remediation readback returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview?.summary, 'admin overview remediation payload is incomplete')
    assert(!data.overview.coop.compensations.some(entry => entry?.id === adminPendingCompensationId && entry?.status === 'pending'), 'admin overview remediation still shows the resolved compensation as pending')
    assert(!data.overview.activities.rooms.some(entry => entry?.id === adminPendingActivityRoomId && entry?.state === 'settling'), 'admin overview remediation still shows the repaired room as settling')
    assert(data.overview.recent_players.some(entry => entry?.username === quaternarySessionState.username && entry?.status === 'active'), 'admin overview remediation did not refresh the unbanned account state')
  })

  await runCheck('POST /api/admin/taoyuan/online-release-config module gate path', async () => {
    assert(originalOnlineReleaseConfig, 'online release config snapshot missing before module gate test')
    const disabledFestivalConfig = cloneJson(originalOnlineReleaseConfig)
    disabledFestivalConfig.moduleSwitches.festival = false
    disabledFestivalConfig.featureFlags.festivalRoomEnabled = false

    const disableResponse = await fetchAdminJson('/api/admin/taoyuan/online-release-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disabledFestivalConfig),
    })
    assert(disableResponse.response.ok, `online release disable write returned ${disableResponse.response.status}: ${disableResponse.data?.msg || 'unknown error'}`)
    assert(disableResponse.data?.ok === true && disableResponse.data?.config?.moduleSwitches?.festival === false, 'festival module switch did not persist as disabled')

    const blockedResponse = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(blockedResponse.response.status === 503, `festival module gate should return 503, received ${blockedResponse.response.status}`)
    assert(blockedResponse.data?.ok === false && typeof blockedResponse.data?.code === 'string', 'festival module gate payload is incomplete')

    const restoreResponse = await fetchAdminJson('/api/admin/taoyuan/online-release-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(originalOnlineReleaseConfig),
    })
    assert(restoreResponse.response.ok, `online release restore returned ${restoreResponse.response.status}: ${restoreResponse.data?.msg || 'unknown error'}`)
    assert(restoreResponse.data?.ok === true && restoreResponse.data?.config?.moduleSwitches?.festival === originalOnlineReleaseConfig.moduleSwitches.festival, 'online release restore did not recover original festival switch')
  })

  let noSaveRewardPostId = ''
  let noSaveRewardReplyId = ''
  await runCheck('POST /api/taoyuan/hall/posts no-save reward help path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `no save reward post ${Date.now()}`,
        content: 'no save reward post',
        blocks: [
          { id: 'no_save_reward_block', type: 'text', text: 'no save reward post' },
        ],
        type: 'help',
        reward_amount: 70,
      }),
    })
    assert(response.ok, `no-save reward help post returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.id, 'no-save reward help post payload is incomplete')
    noSaveRewardPostId = String(data.post.id)
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/replies no-save path', async () => {
    const { response, data } = await fetchSessionJson(tertiarySessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'no save reward reply',
      }),
    })
    assert(response.ok, `no-save reward reply create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.replies?.length, 'no-save reward reply payload is incomplete')
    noSaveRewardReplyId = String(data.post.replies[data.post.replies.length - 1]?.id || '')
    assert(noSaveRewardReplyId, 'no-save reward reply id was not created')
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/best-reply no-save failure rollback', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}/best-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply_id: noSaveRewardReplyId,
      }),
    })
    assert(!response.ok, 'best reply should fail when reply author has no server save')
    assert(data?.ok === false, 'best reply failure should return ok=false')

    const detail = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}`)
    assert(detail.response.ok, 'failed payout post detail could not be reloaded')
    assert(detail.data?.post?.reward_status === 'open', `failed payout should keep reward_status=open, current=${detail.data?.post?.reward_status}`)
    assert(!detail.data?.post?.reward_paid_to, 'failed payout should not set reward_paid_to')
    assert(!detail.data?.post?.best_reply_id, 'failed payout should not persist best_reply_id')
  })

  let noSaveRewardMailId = ''
  await runCheck('POST /api/admin/taoyuan/mail/campaigns no-save reward mail path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for no-save reward mail smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        action: 'send',
        template_type: 'activity_reward',
        title: `no save reward mail ${Date.now()}`,
        content: 'no save reward mail content',
        recipient_rule: {
          mode: 'single',
          username: tertiarySessionState.username,
          target_slot: 0,
        },
        rewards: [
          {
            type: 'money',
            amount: 111,
          },
        ],
        duplicate_compensation_money: 0,
      }),
    })
    assert(response.ok, `no-save reward mail campaign returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.campaign?.id, 'no-save reward mail campaign payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list no-save login state', async () => {
    const { response, data } = await fetchSessionJson(tertiarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `no-save mail list returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.mails), 'no-save mail list payload is incomplete')
    noSaveRewardMailId = String(data.mails.find(item => item?.can_claim === true)?.id || '')
    assert(noSaveRewardMailId, 'no-save reward mail was not delivered to mailbox list')
  })

  await runCheck('POST /api/taoyuan/mail/:id/claim no-save failure rollback', async () => {
    const { response, data } = await fetchSessionJson(tertiarySessionState, `/api/taoyuan/mail/${encodeURIComponent(noSaveRewardMailId)}/claim`, {
      method: 'POST',
    })
    assert(!response.ok, 'reward mail claim should fail without server save')
    assert(data?.ok === false, 'reward mail failure should return ok=false')

    const detail = await fetchSessionJson(tertiarySessionState, `/api/taoyuan/mail/${encodeURIComponent(noSaveRewardMailId)}`)
    assert(detail.response.ok, 'failed claim mail detail could not be reloaded')
    assert(!detail.data?.mail?.claimed_at, 'failed claim should not set claimed_at')
    assert(!detail.data?.mail?.claim_result, 'failed claim should not persist claim_result')
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id owner cleanup', async () => {
    assert(createdReplyId, 'reply creation did not complete before cleanup')
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `hall post delete returned ${response.status}`)
    assert(data?.ok === true, 'hall post delete payload is incomplete')
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id failed payout cleanup', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `failed payout post delete returned ${response.status}`)
    assert(data?.ok === true && data?.refunded === true, 'failed payout cleanup should refund outstanding reward')
  })

  console.log('[qa-online-smoke] OK')
  for (const check of checks) {
    console.log(`- ${check}`)
  }
  process.exitCode = 0
} catch (error) {
  console.error('[qa-online-smoke] FAILED')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await stopServer()
  const deletedUsernames = await cleanupSmokeUsers()
  if (Array.isArray(deletedUsernames) && deletedUsernames.length > 0) {
    console.log(`[qa-online-smoke] cleaned test users: ${deletedUsernames.join(', ')}`)
  }
  await cleanupSmokeArtifacts()
  process.exit(process.exitCode ?? 0)
}
