import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')

const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-save-cas-guard-${process.pid}`)
const storageFile = path.join(tempDir, '.storage.json')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_SAVE_CAS_GUARD_PORT || 4031)

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''
process.env.SECRET_KEY = process.env.SECRET_KEY || 'qa_save_cas_secret_key_0605'
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'qa_save_cas_admin_token_0605'

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const {
  decryptTaoyuanRaw,
  encryptTaoyuanData,
  loadUserSaveSlots,
  normalizeGameplaySaveContainer,
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

const postJson = async (session, pathname, body) => fetchSessionJson(session, pathname, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const registerSession = async username => {
  const session = { cookie: '', csrfToken: '' }
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

const readSlot = username => loadUserSaveSlots(username).slots[0]
const readStoredMoney = username => {
  const decrypted = decryptTaoyuanRaw(readSlot(username).raw)
  return normalizeGameplaySaveContainer(decrypted)?.gameplayData?.player?.money
}

let serverProcess = null
try {
  serverProcess = startServer()
  await waitForServer()

  const username = 'savecas0605'
  const session = await registerSession(username)
  const rawA = buildRaw('CAS_A', 100)
  const rawB = buildRaw('CAS_B', 200)
  const rawC = buildRaw('CAS_C', 300)
  const rawD = buildRaw('CAS_D', 400)

  const missingBase = await postJson(session, '/api/taoyuan/save/0', { raw: rawA })
  assert.equal(missingBase.response.status, 400, 'save without base_revision should be rejected')
  assert.equal(missingBase.data?.code, 'TAOYUAN_SAVE_BASE_REVISION_REQUIRED', 'missing base_revision should expose structured code')

  const first = await postJson(session, '/api/taoyuan/save/0', {
    raw: rawA,
    base_revision: 0,
  })
  assert.equal(first.response.ok, true, `first save should succeed: ${first.data?.msg || first.response.status}`)
  assert.equal(first.data?.current_revision, 1, 'first server-issued revision should be 1')
  assert.equal(readSlot(username).revision, 1, 'stored revision after first save should be 1')

  const slotsRead = await fetchSessionJson(session, '/api/taoyuan/save/slots')
  assert.equal(slotsRead.response.ok, true, 'slot list should succeed')
  assert.equal(slotsRead.data?.slots?.[0]?.revision, 1, 'slot list should expose revision')
  assert.equal(slotsRead.data?.slots?.[0]?.raw, readSlot(username).raw, 'slot list should expose authoritative raw')

  const singleRead = await fetchSessionJson(session, '/api/taoyuan/save/0')
  assert.equal(singleRead.response.ok, true, 'slot read should succeed')
  assert.equal(singleRead.data?.revision, 1, 'slot read should expose revision')

  const stale = await postJson(session, '/api/taoyuan/save/0', {
    raw: rawB,
    base_revision: 0,
  })
  assert.equal(stale.response.status, 409, 'stale save should return 409')
  assert.equal(stale.data?.stale, true, 'stale save should mark stale=true')
  assert.equal(stale.data?.code, 'TAOYUAN_SAVE_REVISION_STALE', 'stale save should expose structured code')
  assert.equal(stale.data?.current_revision, 1, 'stale save should return latest revision')
  assert.equal(stale.data?.raw, readSlot(username).raw, 'stale save should return latest raw')
  assert.equal(readStoredMoney(username), 100, 'stale save must not overwrite remote raw')

  const futureRevisionRequest = await postJson(session, '/api/taoyuan/save/0', {
    raw: rawC,
    base_revision: 1,
    revision: 9_999_999_999_999,
  })
  assert.equal(futureRevisionRequest.response.ok, true, `future revision field should be ignored: ${futureRevisionRequest.data?.msg || futureRevisionRequest.response.status}`)
  assert.equal(futureRevisionRequest.data?.current_revision, 2, 'server should issue current+1 instead of accepting future client revision')
  assert.equal(readSlot(username).revision, 2, 'stored revision should remain server-issued after future revision request')

  const afterFuture = await postJson(session, '/api/taoyuan/save/0', {
    raw: rawD,
    base_revision: 2,
  })
  assert.equal(afterFuture.response.ok, true, `normal save after future request should succeed: ${afterFuture.data?.msg || afterFuture.response.status}`)
  assert.equal(afterFuture.data?.current_revision, 3, 'normal save after future request should continue sequential revision')
  assert.equal(readStoredMoney(username), 400, 'latest valid CAS save should persist')

  console.log('[qa-save-cas-guard] passed')
} finally {
  if (serverProcess) {
    serverProcess.kill()
    await new Promise(resolve => serverProcess.once('exit', resolve))
  }
  await rm(tempDir, { recursive: true, force: true })
}
