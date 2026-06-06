import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')

const serverRoot = path.resolve(__dirname, '..')
const tempDir = path.resolve(serverRoot, `.tmp-transaction-idempotency-${process.pid}`)
const storageFile = path.join(tempDir, '.storage.json')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_TRANSACTION_IDEMPOTENCY_PORT || 4027)

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true })

process.env.DB_STORAGE = storageFile
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.MYSQL_HOST = ''
process.env.MYSQL_USER = ''
process.env.MYSQL_DATABASE = ''
process.env.SECRET_KEY = process.env.SECRET_KEY || 'qa_transaction_secret_key_0605'
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'qa_transaction_admin_token_0605'

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

const db = require('../src/db')
const saveRuntime = require('../src/taoyuanSaveRuntime')

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

const createSessionState = username => ({
  cookie: '',
  csrfToken: '',
  username,
})

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

const registerSession = async username => {
  const session = createSessionState(username)
  const result = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: 'qa_password_0605',
      display_name: username,
    }),
  })
  assert.equal(result.response.ok, true, `${username} should register: ${result.data?.msg || result.response.status}`)
  session.csrfToken = result.data?.csrf_token || ''
  assert.ok(session.csrfToken, 'register should return csrf token')
  return session
}

const seedSave = (username, { money = 1000, wood = 20 } = {}) => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  slots.slots[0] = {
    raw: saveRuntime.encryptTaoyuanData({
      player: {
        playerName: username,
        money,
      },
      inventory: {
        items: [
          { itemId: 'wood', quantity: wood, quality: 'normal', locked: false },
        ],
        tempItems: [],
        capacity: 24,
      },
      wallet: {
        rewardTickets: {},
        rewardTicketLifetimeEarned: {},
      },
    }),
    revision: 1,
  }
  saveRuntime.saveUserSaveSlots(username, slots)
  saveRuntime.setActiveSaveSlot(username, 0)
}

const readGameplay = username => {
  const slots = saveRuntime.loadUserSaveSlots(username)
  const raw = slots.slots[0]?.raw || ''
  const decrypted = saveRuntime.decryptTaoyuanRaw(raw)
  return saveRuntime.normalizeGameplaySaveContainer(decrypted)?.gameplayData || {}
}

const getMoney = username => Math.floor(Number(readGameplay(username)?.player?.money) || 0)

const getItemQuantity = (username, itemId) => {
  const data = readGameplay(username)
  const items = [
    ...(Array.isArray(data?.inventory?.items) ? data.inventory.items : []),
    ...(Array.isArray(data?.inventory?.tempItems) ? data.inventory.tempItems : []),
  ]
  return items
    .filter(item => String(item?.itemId || item?.id || '') === itemId)
    .reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item?.quantity) || 0)), 0)
}

const getTicketQuantity = (username, ticketType) => {
  const tickets = readGameplay(username)?.wallet?.rewardTickets || {}
  return Math.max(0, Math.floor(Number(tickets[ticketType]) || 0))
}

const postJson = async (session, pathname, body) => fetchSessionJson(session, pathname, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const assertRejected = (result, status, code, label) => {
  assert.equal(result.response.status, status, `${label} should return ${status}, received ${result.response.status}`)
  assert.equal(result.data?.ok, false, `${label} should return ok=false`)
  if (code) assert.equal(result.data?.code, code, `${label} should return code=${code}`)
}

const readJsonFile = async fileName => JSON.parse(await readFile(path.join(tempDir, fileName), 'utf8'))

let serverProcess = null
try {
  serverProcess = startServer()
  await waitForServer()

  const username = 'txn_idem_0605'
  const session = await registerSession(username)
  seedSave(username, { money: 1000, wood: 20 })

  const missingImportKey = await postJson(session, '/api/taoyuan/quota/import', {
    money: 10,
    direction: 'import',
    active_save_slot: 0,
  })
  assertRejected(missingImportKey, 400, 'TAOYUAN_EXCHANGE_IDEMPOTENCY_REQUIRED', 'quota import without idempotency key')

  const initialQuota = await db.getQuota(username)
  const importKey = 'qa-import-once'
  const importFirst = await postJson(session, '/api/taoyuan/quota/import', {
    money: 10,
    direction: 'import',
    active_save_slot: 0,
    idempotency_key: importKey,
  })
  assert.equal(importFirst.response.ok, true, `first import should succeed: ${importFirst.data?.msg || importFirst.response.status}`)
  assert.equal(getMoney(username), 1010, 'first import should add money once')

  const importReplay = await postJson(session, '/api/taoyuan/quota/import', {
    money: 10,
    direction: 'import',
    active_save_slot: 0,
    idempotency_key: importKey,
  })
  assert.equal(importReplay.response.ok, true, `import replay should succeed: ${importReplay.data?.msg || importReplay.response.status}`)
  assert.equal(importReplay.data?.idempotency_replayed, true, 'import replay should be marked as replay')
  assert.equal(getMoney(username), 1010, 'import replay must not add money twice')
  assert.equal(importReplay.data?.today_imported_money, importFirst.data?.today_imported_money, 'import replay must not advance daily usage twice')
  assert.equal(await db.getQuota(username), initialQuota - importFirst.data.quota_spent, 'import replay must not consume quota twice')

  const importSecondKey = 'qa-import-new-key'
  const importSecond = await postJson(session, '/api/taoyuan/quota/import', {
    money: 10,
    direction: 'import',
    active_save_slot: 0,
    idempotency_key: importSecondKey,
  })
  assert.equal(importSecond.response.ok, true, `second import key should succeed: ${importSecond.data?.msg || importSecond.response.status}`)
  assert.equal(getMoney(username), 1020, 'new import key should perform a second transaction')

  const missingExportKey = await postJson(session, '/api/taoyuan/quota/export', {
    money: 5,
    direction: 'export',
    active_save_slot: 0,
  })
  assertRejected(missingExportKey, 400, 'TAOYUAN_EXCHANGE_IDEMPOTENCY_REQUIRED', 'quota export without idempotency key')

  const quotaBeforeExport = await db.getQuota(username)
  const exportKey = 'qa-export-once'
  const exportFirst = await postJson(session, '/api/taoyuan/quota/export', {
    money: 5,
    direction: 'export',
    active_save_slot: 0,
    idempotency_key: exportKey,
  })
  assert.equal(exportFirst.response.ok, true, `first export should succeed: ${exportFirst.data?.msg || exportFirst.response.status}`)
  assert.equal(getMoney(username), 1015, 'first export should deduct money once')

  const exportReplay = await postJson(session, '/api/taoyuan/quota/export', {
    money: 5,
    direction: 'export',
    active_save_slot: 0,
    idempotency_key: exportKey,
  })
  assert.equal(exportReplay.response.ok, true, `export replay should succeed: ${exportReplay.data?.msg || exportReplay.response.status}`)
  assert.equal(exportReplay.data?.idempotency_replayed, true, 'export replay should be marked as replay')
  assert.equal(getMoney(username), 1015, 'export replay must not deduct money twice')
  assert.equal(exportReplay.data?.today_exported_money, exportFirst.data?.today_exported_money, 'export replay must not advance daily usage twice')
  assert.equal(await db.getQuota(username), quotaBeforeExport + exportFirst.data.quota_gained, 'export replay must not grant quota twice')

  const exchangeReceipts = (await readJsonFile('taoyuan_exchange_limits.json')).__transaction_receipts || {}
  assert.equal(exchangeReceipts[`${username}:import:${importKey}`]?.status, 'succeeded', 'import receipt should persist as succeeded')
  assert.equal(exchangeReceipts[`${username}:export:${exportKey}`]?.status, 'succeeded', 'export receipt should persist as succeeded')

  const missingWeeklyKey = await postJson(session, '/api/taoyuan/exchange-station/weekly/wood_for_stone/exchange', {})
  assertRejected(missingWeeklyKey, 400, 'WEEKLY_EXCHANGE_IDEMPOTENCY_REQUIRED', 'weekly exchange without idempotency key')

  const weeklyKey = 'qa-weekly-once'
  const weeklyWoodBefore = getItemQuantity(username, 'wood')
  const weeklyStoneBefore = getItemQuantity(username, 'stone')
  const weeklyFirst = await postJson(session, '/api/taoyuan/exchange-station/weekly/wood_for_stone/exchange', {
    idempotency_key: weeklyKey,
  })
  assert.equal(weeklyFirst.response.ok, true, `first weekly exchange should succeed: ${weeklyFirst.data?.msg || weeklyFirst.response.status}`)
  const weeklyReplay = await postJson(session, '/api/taoyuan/exchange-station/weekly/wood_for_stone/exchange', {
    idempotency_key: weeklyKey,
  })
  assert.equal(weeklyReplay.response.ok, true, `weekly replay should succeed: ${weeklyReplay.data?.msg || weeklyReplay.response.status}`)
  assert.equal(weeklyReplay.data?.idempotency_replayed, true, 'weekly replay should be marked as replay')
  assert.equal(getItemQuantity(username, 'wood'), weeklyWoodBefore - 4, 'weekly replay must not deduct wood twice')
  assert.equal(getItemQuantity(username, 'stone'), weeklyStoneBefore + 10, 'weekly replay must not grant stone twice')
  assert.equal(weeklyReplay.data?.offer?.claimed_by_user, weeklyFirst.data?.offer?.claimed_by_user, 'weekly replay must not advance personal usage twice')
  assert.equal(weeklyReplay.data?.offer?.claimed_global, weeklyFirst.data?.offer?.claimed_global, 'weekly replay must not advance global claims twice')

  const weeklyStore = await readJsonFile('taoyuan_weekly_exchange_station.json')
  const weeklyState = weeklyStore.weeks?.[weeklyFirst.data.week_key] || {}
  assert.equal(weeklyState.user_usage?.[username]?.wood_for_stone, 1, 'weekly user usage should increase once')
  assert.equal(weeklyState.offer_claims?.wood_for_stone, 1, 'weekly global claims should increase once')
  assert.equal(weeklyState.transaction_receipts?.[`${username}:weekly_exchange_station:wood_for_stone:${weeklyKey}`]?.status, 'succeeded', 'weekly receipt should persist as succeeded')

  const stallOverview = await fetchSessionJson(session, '/api/taoyuan/exchange-station/festival-stall')
  assert.equal(stallOverview.response.ok, true, `festival stall overview should succeed: ${stallOverview.data?.msg || stallOverview.response.status}`)
  const festivalOffer = stallOverview.data?.stall?.offers?.find(item => item?.can_exchange)
  assert.ok(festivalOffer?.id, 'festival stall should expose an exchangeable offer')
  const festivalOfferId = String(festivalOffer.id)
  const festivalReward = Array.isArray(festivalOffer.rewards) ? festivalOffer.rewards[0] : null

  const missingFestivalKey = await postJson(session, `/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalOfferId)}/purchase`, {})
  assertRejected(missingFestivalKey, 400, 'FESTIVAL_STALL_IDEMPOTENCY_REQUIRED', 'festival purchase without idempotency key')

  const festivalMoneyBefore = getMoney(username)
  const festivalItemBefore = festivalReward?.type === 'item' ? getItemQuantity(username, festivalReward.item_id) : null
  const festivalTicketBefore = festivalReward?.type === 'ticket' ? getTicketQuantity(username, festivalReward.ticket_type) : null
  const festivalKey = 'qa-festival-once'
  const festivalFirst = await postJson(session, `/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalOfferId)}/purchase`, {
    idempotency_key: festivalKey,
  })
  assert.equal(festivalFirst.response.ok, true, `first festival purchase should succeed: ${festivalFirst.data?.msg || festivalFirst.response.status}`)
  const festivalReplay = await postJson(session, `/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalOfferId)}/purchase`, {
    idempotency_key: festivalKey,
  })
  assert.equal(festivalReplay.response.ok, true, `festival replay should succeed: ${festivalReplay.data?.msg || festivalReplay.response.status}`)
  assert.equal(festivalReplay.data?.idempotency_replayed, true, 'festival replay should be marked as replay')
  assert.equal(getMoney(username), festivalMoneyBefore - festivalFirst.data.offer.price_money, 'festival replay must not deduct money twice')
  if (festivalReward?.type === 'item') {
    assert.equal(
      getItemQuantity(username, festivalReward.item_id),
      festivalItemBefore + Number(festivalReward.quantity || 0),
      'festival replay must not grant item reward twice',
    )
  }
  if (festivalReward?.type === 'ticket') {
    assert.equal(
      getTicketQuantity(username, festivalReward.ticket_type),
      festivalTicketBefore + Number(festivalReward.quantity || 0),
      'festival replay must not grant ticket reward twice',
    )
  }
  assert.equal(festivalReplay.data?.offer?.claimed_by_user, festivalFirst.data?.offer?.claimed_by_user, 'festival replay must not advance personal usage twice')
  assert.equal(festivalReplay.data?.offer?.claimed_global, festivalFirst.data?.offer?.claimed_global, 'festival replay must not advance global claims twice')

  const festivalStore = await readJsonFile('taoyuan_festival_stall.json')
  const festivalState = festivalStore.weeks?.[festivalFirst.data.week_key] || {}
  assert.equal(festivalState.user_usage?.[username]?.[festivalOfferId], 1, 'festival user usage should increase once')
  assert.equal(festivalState.offer_claims?.[festivalOfferId], 1, 'festival global claims should increase once')
  assert.equal(festivalState.transaction_receipts?.[`${username}:festival_stall:${festivalOfferId}:${festivalKey}`]?.status, 'succeeded', 'festival receipt should persist as succeeded')

  console.log('[qa-transaction-idempotency] passed')
} finally {
  if (serverProcess) {
    serverProcess.kill()
    await new Promise(resolve => serverProcess.once('exit', resolve))
  }
  await rm(tempDir, { recursive: true, force: true })
}
