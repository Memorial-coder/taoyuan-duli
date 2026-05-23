import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { findAvailablePort, isPlaywrightEnvironmentError, wait } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const { decryptTaoyuanRaw, encryptTaoyuanData } = require('../../server/src/taoyuanSaveRuntime')

const repoRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(repoRoot, '..')
const serverRoot = path.resolve(workspaceRoot, 'server')
const outputDir = path.resolve(workspaceRoot, 'docs', 'ui-smoke-2026-04-26')
const tempDir = path.resolve(workspaceRoot, '.codex-temp', 'online-regression-live-smoke')
const storageFile = path.resolve(tempDir, '.storage.json')
const host = '127.0.0.1'
const preferredBackendPort = Number(process.env.TAOYUAN_ONLINE_REGRESSION_BACKEND_PORT || 4013)
const backendPort = await findAvailablePort(host, preferredBackendPort)
const frontendPort = await findAvailablePort(host, Number(process.env.TAOYUAN_ONLINE_REGRESSION_FRONTEND_PORT || 4193))
const backendBaseURL = `http://${host}:${backendPort}`
const frontendBaseURL = `http://${host}:${frontendPort}`
const adminToken = process.env.ADMIN_TOKEN || 'qa-online-regression-admin-token'
const superAdminToken = process.env.SUPER_ADMIN_TOKEN || 'qa-online-regression-super-admin-token'

const checks = []
const consoleErrors = []
const pageErrors = []
const requestFailures = []
const realtimeFrames = []
let realtimeSocketCount = 0
let mailTitle = ''
let hallTitle = ''
let hallRealtimeReplyText = ''
let importedSavePlayerName = ''
let importedSaveIdentity = null

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const createSmokeSeed = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5)

const buildFutureDatetimeLocal = (daysFromNow = 3) => {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

const waitForReachable = async (url, timeoutMs = 120_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      /* keep waiting */
    }
    await wait(1000)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const startBackendServer = () => {
  assert(
    backendPort === preferredBackendPort,
    `Backend port ${preferredBackendPort} is required because Vite proxies realtime WebSocket traffic there; got ${backendPort}.`,
  )
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(backendPort),
      DB_STORAGE: storageFile,
      QA_ONLINE_SMOKE_FORCE_LOCAL: 'true',
      MYSQL_HOST: '',
      MYSQL_PORT: '',
      MYSQL_USER: '',
      MYSQL_PASSWORD: '',
      MYSQL_DATABASE: '',
      SECRET_KEY: process.env.SECRET_KEY || 'qa-online-regression-secret-key',
      ADMIN_TOKEN: adminToken,
      SUPER_ADMIN_TOKEN: superAdminToken,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => process.stdout.write(chunk))
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  return child
}

const startFrontendServer = () => {
  const child = process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run dev -- --host ${host} --port ${frontendPort} --strictPort`], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(frontendPort), '--strictPort'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
  child.stdout.on('data', chunk => process.stdout.write(chunk))
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  return child
}

const stopChild = child => {
  if (child && !child.killed) {
    child.kill('SIGTERM')
  }
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
    : [response.headers.get('set-cookie')].filter(Boolean)
  if (!rawSetCookie.length) return
  const cookieParts = rawSetCookie.map(item => String(item).split(';', 1)[0]).filter(Boolean)
  if (!cookieParts.length) return
  session.cookie = cookieParts.join('; ')
}

const fetchSessionJson = async (session, pathname, init = {}) => {
  const headers = new Headers(init.headers || {})
  if (session.cookie) headers.set('Cookie', session.cookie)
  if (session.csrfToken) headers.set('X-CSRF-Token', session.csrfToken)
  const response = await fetch(`${backendBaseURL}${pathname}`, {
    ...init,
    headers,
  })
  updateCookie(session, response)
  const data = await response.json().catch(() => null)
  return { response, data }
}

const buildSeedSavePayload = ({ playerName = '烟测', money = 1200, day = 2, regionMapUnlocked = false } = {}) => {
  const plots = Array.from({ length: 16 }, (_, id) => ({
    id,
    state: 'wasteland',
    cropId: null,
    growthDays: 0,
    watered: false,
    unwateredDays: 0,
    fertilizer: null,
    harvestCount: 0,
    giantCropGroup: null,
    seedGenetics: null,
    infested: false,
    infestedDays: 0,
    weedy: false,
    weedyDays: 0,
  }))

  return {
    meta: {
      saveVersion: 5,
      savedAt: new Date().toISOString(),
    },
    data: {
      game: {
        year: 1,
        season: 'spring',
        day,
        hour: 6,
        weather: 'sunny',
        tomorrowWeather: 'sunny',
        currentLocation: 'farm',
        currentLocationGroup: 'farm',
        farmMapType: 'standard',
        dailyLuck: 0,
        surfaceOrePatch: null,
        creekCatch: [],
      },
      player: {
        playerName,
        gender: 'male',
        money,
        stamina: 120,
        maxStamina: 120,
      },
      inventory: {
        items: [
          { itemId: 'wood', quantity: 6, quality: 'normal' },
          { itemId: 'seed_cabbage', quantity: 4, quality: 'normal' },
        ],
        tempItems: [],
        ownedWeapons: [{ defId: 'wooden_stick', enchantmentId: null }],
        ownedRings: [],
        ownedHats: [],
        ownedShoes: [],
        capacity: 24,
        tools: [
          { type: 'wateringCan', tier: 'basic' },
          { type: 'hoe', tier: 'basic' },
          { type: 'pickaxe', tier: 'basic' },
          { type: 'fishingRod', tier: 'basic' },
          { type: 'scythe', tier: 'basic' },
          { type: 'axe', tier: 'basic' },
          { type: 'pan', tier: 'basic' },
        ],
        equippedWeaponIndex: 0,
        pendingUpgrade: null,
        equippedRingSlot1: -1,
        equippedRingSlot2: -1,
        equippedHatIndex: -1,
        equippedShoeIndex: -1,
        equippedTrinketId: null,
        equipmentPresets: [],
        activePresetId: null,
      },
      farm: {
        farmSize: 4,
        plots,
        sprinklers: [],
        fruitTrees: [],
        greenhousePlots: [],
        greenhouseLevel: 0,
        wildTrees: [],
        nextFruitTreeId: 0,
        nextWildTreeId: 0,
        lightningRods: 0,
        scarecrows: 0,
        giantCropCounter: 0,
      },
      regionMap: regionMapUnlocked
        ? {
            unlockStates: {
              ancient_road: {
                unlocked: true,
                unlockedDayTag: '1-spring-1',
              },
            },
          }
        : undefined,
    },
  }
}

const getEmbeddedSaveIdentity = decryptedSave => decryptedSave?.meta?.onlineIdentity || decryptedSave?.onlineIdentity || null

const getSaveData = decryptedSave => decryptedSave?.data && typeof decryptedSave.data === 'object'
  ? decryptedSave.data
  : decryptedSave

const readServerSave = async (session, slot = 0) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/save/${slot}`)
  assert(result.response.ok, `save ${slot} read returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  const decrypted = decryptTaoyuanRaw(result.data?.raw || '')
  assert(decrypted, `server save ${slot} could not be decrypted`)
  return {
    raw: result.data.raw,
    decrypted,
    data: getSaveData(decrypted),
  }
}

const getSaveMoney = save => Number(save?.data?.player?.money ?? -1)

const seedSessionSave = async session => {
  const rawSavePayload = encryptTaoyuanData(buildSeedSavePayload())
  const saveResult = await fetchSessionJson(session, '/api/taoyuan/save/0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw: rawSavePayload,
      revision: Date.now(),
    }),
  })
  assert(saveResult.response.ok, `save write for ${session.username} returned ${saveResult.response.status}: ${saveResult.data?.msg || 'unknown error'}`)

  const activeSlotResult = await fetchSessionJson(session, '/api/taoyuan/save/active-slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: 0 }),
  })
  assert(activeSlotResult.response.ok, `active slot write for ${session.username} returned ${activeSlotResult.response.status}: ${activeSlotResult.data?.msg || 'unknown error'}`)

  const readback = await readServerSave(session)
  const identity = getEmbeddedSaveIdentity(readback.decrypted)
  assert(identity?.save_id, `save identity missing for ${session.username}`)
  session.identity = identity
}

const bootstrapSession = async ({ seedSave = true } = {}) => {
  const session = createSessionState()
  const seed = createSmokeSeed()
  session.username = `orm_${seed}`.toLowerCase()
  session.displayName = `在线回归${seed.slice(-4)}`
  const password = `SmokePass_${seed}`

  const registerResult = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: session.username,
      password,
      display_name: session.displayName,
    }),
  })
  assert(registerResult.response.ok, `register ${session.username} returned ${registerResult.response.status}: ${registerResult.data?.msg || 'unknown error'}`)
  assert(registerResult.data?.csrf_token, `register ${session.username} did not return csrf_token`)
  session.csrfToken = registerResult.data.csrf_token

  const meResult = await fetchSessionJson(session, '/api/me')
  assert(meResult.response.ok, `/api/me for ${session.username} returned ${meResult.response.status}`)
  session.csrfToken = meResult.data?.csrf_token || session.csrfToken
  if (seedSave) await seedSessionSave(session)
  return session
}

const sendRewardMail = async (session, seed) => {
  const title = `联机回归奖励邮件 ${seed}`
  const response = await fetch(`${backendBaseURL}/api/admin/taoyuan/mail/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': superAdminToken,
    },
    body: JSON.stringify({
      action: 'send',
      template_type: 'activity_reward',
      title,
      content: 'realtime 旧入口回归邮件',
      recipient_rule: {
        mode: 'single',
        username: session.username,
        target_slot: 0,
      },
      rewards: [{ type: 'money', amount: 77 }],
      duplicate_compensation_money: 0,
    }),
  })
  const data = await response.json().catch(() => null)
  assert(response.ok, `admin reward mail send returned ${response.status}: ${data?.msg || 'unknown error'}`)
  return title
}

const readMailList = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/mail/list')
  assert(result.response.ok, `mail list returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  return result.data
}

const readHallPosts = async keyword => {
  const response = await fetch(`${backendBaseURL}/api/taoyuan/hall/posts?keyword=${encodeURIComponent(keyword)}&page_size=5`)
  const data = await response.json().catch(() => null)
  assert(response.ok, `hall posts search returned ${response.status}: ${data?.msg || 'unknown error'}`)
  return data
}

const readHallPostDetail = async postId => {
  const response = await fetch(`${backendBaseURL}/api/taoyuan/hall/posts/${encodeURIComponent(postId)}`)
  const data = await response.json().catch(() => null)
  assert(response.ok, `hall post detail returned ${response.status}: ${data?.msg || 'unknown error'}`)
  return data
}

const searchPlayerBySaveId = async (session, saveId) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/social/player-search?save_id=${encodeURIComponent(saveId)}`)
  assert(result.response.ok, `save id player search returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.ok === true, 'save id player search payload is incomplete')
  return result.data
}

const readOnlineProfile = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/profile')
  assert(result.response.ok, `online profile returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.profile, 'online profile payload is missing profile')
  return result.data.profile
}

const readRelationshipOverview = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/social/relationships')
  assert(result.response.ok, `relationship overview returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.ok === true, 'relationship overview payload is incomplete')
  return result.data
}

const readNeighborOverview = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/social/neighbors/overview')
  assert(result.response.ok, `neighbor overview returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.ok === true, 'neighbor overview payload is incomplete')
  return result.data
}

const applyToNeighborGroup = async (session, groupId) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/social/neighbors/${encodeURIComponent(groupId)}/apply`, {
    method: 'POST',
  })
  assert(result.response.ok, `neighbor apply returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.request?.id, 'neighbor apply payload is missing request id')
  return result.data.request
}

const readCoopOrderOverview = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/orders')
  assert(result.response.ok, `coop order overview returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.ok === true, 'coop order overview payload is incomplete')
  return result.data
}

const acceptCoopOrder = async (session, orderId) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/accept`, {
    method: 'POST',
  })
  assert(result.response.ok, `coop order accept returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.order?.id === orderId, 'coop order accept payload target mismatch')
  return result.data.order
}

const submitCoopOrderDelivery = async (session, orderId, payload) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  assert(result.response.ok, `coop order delivery returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.receipt?.order_id === orderId, 'coop order delivery payload receipt target mismatch')
  return result.data
}

const readManorSnapshot = async (session, targetUsername = '') => {
  const pathSuffix = targetUsername
    ? `/${encodeURIComponent(targetUsername)}`
    : ''
  const result = await fetchSessionJson(session, `/api/taoyuan/online/manor${pathSuffix}`)
  assert(result.response.ok, `manor snapshot returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.snapshot, 'manor snapshot payload is missing snapshot')
  return result.data.snapshot
}

const readFavoriteOverview = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/manor/favorites/overview')
  assert(result.response.ok, `manor favorite overview returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.ok === true, 'manor favorite overview payload is incomplete')
  return result.data
}

const createManorGuestbookEntry = async (session, payload) => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/manor/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  assert(result.response.ok, `manor guestbook create returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.entry?.id, 'manor guestbook create payload is missing entry id')
  return result.data.entry
}

const recordManorVisit = async (session, payload) => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/manor/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  assert(result.response.ok, `manor visit create returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.entry?.id, 'manor visit create payload is missing entry id')
  return result.data.entry
}

const favoriteManor = async (session, username, theme) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/manor/${encodeURIComponent(username)}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  })
  assert(result.response.ok, `manor favorite returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.entry?.manor_username === username, 'manor favorite payload target mismatch')
  return result.data.entry
}

const followManor = async (session, username) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/manor/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
  })
  assert(result.response.ok, `manor follow returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.entry?.manor_username === username, 'manor follow payload target mismatch')
  return result.data.entry
}

const createHallReply = async (session, postId, content) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/hall/posts/${encodeURIComponent(postId)}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  assert(result.response.ok, `hall realtime reply returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  return result.data
}

const getMailListItem = page => page.locator('.mail-item').filter({ hasText: mailTitle }).first()

const forwardApiRequests = async context => {
  await context.route('**/api/**', async route => {
    const request = route.request()
    const requestUrl = new URL(request.url())
    const targetUrl = `${backendBaseURL}${requestUrl.pathname}${requestUrl.search}`
    const headers = { ...request.headers() }
    delete headers.host
    delete headers.origin
    delete headers.referer
    const postData = request.postData()
    const response = await fetch(targetUrl, {
      method: request.method(),
      headers,
      body: ['GET', 'HEAD'].includes(request.method()) || postData === null ? undefined : postData,
    })
    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      if (['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) return
      responseHeaders[key] = value
    })
    const body = Buffer.from(await response.arrayBuffer())
    await route.fulfill({
      status: response.status,
      headers: responseHeaders,
      body,
    })
  })
}

const setSessionCookie = async (context, session) => {
  const pair = session.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('taoyuan.sid='))
  assert(pair, 'owner session cookie is missing taoyuan.sid')
  const value = pair.slice('taoyuan.sid='.length)
  await context.addCookies([{
    name: 'taoyuan.sid',
    value,
    domain: host,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }])
}

const installRealtimeSocketTracker = async context => {
  await context.addInitScript(() => {
    const NativeWebSocket = window.WebSocket
    const realtimeSockets = []

    function TrackedWebSocket(url, protocols) {
      const socket = protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols)
      if (String(url).includes('/api/taoyuan/online/realtime')) {
        realtimeSockets.push(socket)
      }
      return socket
    }

    TrackedWebSocket.prototype = NativeWebSocket.prototype
    Object.setPrototypeOf(TrackedWebSocket, NativeWebSocket)
    window.WebSocket = TrackedWebSocket
    window.__TAOYUAN_REALTIME_TEST__ = {
      count() {
        return realtimeSockets.length
      },
    }
  })
}

const seedBrowserAccountContext = async (page, session) => {
  await page.addInitScript(({ username, csrfToken }) => {
    window.localStorage.setItem('taoyuanxiang_current_account', username)
    window.localStorage.setItem(`taoyuanxiang_save_mode_${username}`, 'server')
    window.localStorage.setItem(`taoyuan_privacy_agreed_${username}`, '1')
    window.__TAOYUAN_ONLINE_REGRESSION_ACCOUNT__ = { username, csrfToken }
  }, {
    username: session.username,
    csrfToken: session.csrfToken,
  })
}

const runCheck = async (label, runner) => {
  await runner()
  checks.push(label)
  console.log(`[online-regression-live-smoke] ok: ${label}`)
}

async function main() {
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })
  await mkdir(outputDir, { recursive: true })

  let backend = null
  let frontend = null
  let browser = null

  try {
    backend = startBackendServer()
    frontend = startFrontendServer()
    await waitForReachable(`${backendBaseURL}/api/public-config`)
    await waitForReachable(frontendBaseURL)

    const owner = await bootstrapSession()
    const seed = owner.username.slice(-5)
    mailTitle = await sendRewardMail(owner, seed)
    hallTitle = `联机回归大厅帖 ${seed}`

    try {
      browser = await chromium.launch()
    } catch (error) {
      if (isPlaywrightEnvironmentError(error)) {
        console.log('[online-regression-live-smoke] Skipped: current environment cannot launch Playwright Chromium (spawn EPERM).')
        return
      }
      throw error
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'zh-CN',
      reducedMotion: 'reduce',
    })
    await installRealtimeSocketTracker(context)
    await forwardApiRequests(context)
    await setSessionCookie(context, owner)

    const page = await context.newPage()
    await seedBrowserAccountContext(page, owner)

    page.on('console', message => {
      if (message.type() === 'error') {
        const location = message.location()
        const locationLabel = location?.url
          ? ` @ ${location.url}:${location.lineNumber}:${location.columnNumber}`
          : ''
        consoleErrors.push(`${message.text()}${locationLabel}`)
      }
    })
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })
    page.on('requestfailed', request => {
      const url = request.url()
      const failure = request.failure()?.errorText ?? 'unknown failure'
      if (url.includes('/api/taoyuan/online/realtime') && /closed|aborted|net::ERR_ABORTED/i.test(failure)) return
      if (url.includes('/api/taoyuan/logs/gameplay/batch') && /closed|aborted|net::ERR_ABORTED/i.test(failure)) return
      requestFailures.push(`${request.method()} ${url} :: ${failure}`)
    })
    page.on('websocket', websocket => {
      if (!websocket.url().includes('/api/taoyuan/online/realtime')) return
      realtimeSocketCount += 1
      websocket.on('framereceived', frame => {
        if (typeof frame === 'string') {
          realtimeFrames.push(frame)
          return
        }
        if (Buffer.isBuffer(frame)) {
          realtimeFrames.push(frame.toString('utf8'))
          return
        }
        const payload = frame && typeof frame === 'object' && 'payload' in frame ? frame.payload : frame
        realtimeFrames.push(Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload))
      })
    })
    page.on('dialog', dialog => dialog.accept())

    await runCheck('main menu loads seeded server save', async () => {
      await page.goto(frontendBaseURL)
      await expect(page.getByTestId('main-menu')).toBeVisible()
      await expect(page.getByText(owner.displayName)).toBeVisible()
      await page.getByRole('button', { name: '服务端持久化' }).click()
      await expect(page.getByRole('button', { name: /存档 1 .*烟测/ })).toBeVisible({ timeout: 10000 })
    })

    await runCheck('imported cloud save receives searchable server save identity', async () => {
      importedSavePlayerName = `导入烟测${seed}`
      const importPayload = buildSeedSavePayload({
        playerName: importedSavePlayerName,
        money: 1600,
        day: 5,
        regionMapUnlocked: true,
      })
      assert(!getEmbeddedSaveIdentity(importPayload), 'import fixture unexpectedly contains online identity')

      const importPath = path.resolve(tempDir, 'imported-cloud-save.tyx')
      await writeFile(importPath, encryptTaoyuanData(importPayload), 'utf8')

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: '导入存档' }).click()
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles(importPath)

      const importedSlotButton = page.getByRole('button', { name: new RegExp(`存档 2 .*${importedSavePlayerName}`) })
      await expect(importedSlotButton).toBeVisible({ timeout: 10000 })

      const importedReadback = await readServerSave(owner, 1)
      const identity = getEmbeddedSaveIdentity(importedReadback.decrypted)
      assert(identity?.save_id, 'imported server save identity was not written back')
      assert(identity.account_username === owner.username, 'imported server save identity account mismatch')
      assert(identity.save_slot === 1, 'imported server save identity slot mismatch')
      importedSaveIdentity = identity

      const searchResult = await searchPlayerBySaveId(owner, identity.save_id)
      assert(searchResult.save_identity?.save_id === identity.save_id, 'imported save id search returned wrong identity')
      assert(searchResult.save_identity?.save_slot === 1, 'imported save id search returned wrong slot')
      assert(searchResult.profile?.username === owner.username, 'imported save id search returned wrong profile')
      assert(!searchResult.profile?.inventory && !searchResult.profile?.wallet, 'imported save id search leaked gameplay payload')

      await importedSlotButton.click()
      await expect(page.getByTestId('game-layout')).toBeVisible()
      await page.getByTestId('mobile-hub-button').click()
      await expect(page.getByTestId('mobile-map-menu')).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId('mobile-map-online-loc-online')).toBeVisible()
      await page.getByTestId('mobile-map-online-shortcut-friend-station').click()
      await expect(page.getByTestId('game-layout')).toBeVisible()
      await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 10000 }).toContain('/game/friend-station')
      await expect(page.getByTestId('region-social-friend-panel')).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId('region-social-friend-panel').getByText(String(identity.save_id))).toBeVisible()

      await page.goto(frontendBaseURL)
      await expect(page.getByTestId('main-menu')).toBeVisible()
      await page.getByRole('button', { name: '服务端持久化' }).click()
    })

    await runCheck('server save loads into game layout with realtime socket', async () => {
      await page.getByRole('button', { name: /存档 1 .*烟测/ }).click()
      await expect(page.getByTestId('game-layout')).toBeVisible()
      await expect(page.getByTestId('status-bar')).toBeVisible()
      await expect(page.getByTestId('status-bar').getByText('烟测')).toBeVisible()
      await expect.poll(() => realtimeSocketCount > 0, { timeout: 10000 }).toBeTruthy()
      await expect.poll(() => realtimeFrames.some(frame => frame.includes('realtime.ready')), { timeout: 10000 }).toBeTruthy()
    })

    await runCheck('online center opens every split module and returns back', async () => {
      const splitModules = [
        { key: 'manor', pageTestId: 'online-manor-page', hash: '/game/online/manor' },
        { key: 'neighbor', pageTestId: 'online-neighbor-page', hash: '/game/online/neighbor' },
        { key: 'orders', pageTestId: 'online-orders-page', hash: '/game/online/orders' },
        { key: 'festival', pageTestId: 'online-festival-page', hash: '/game/online/festival' },
        { key: 'society', pageTestId: 'online-society-page', hash: '/game/online/society' },
      ]

      await page.goto(`${frontendBaseURL}/#/game/online`)
      await expect(page.getByTestId('online-center')).toBeVisible({ timeout: 10000 })

      await page.getByTestId('mobile-hub-button').click()
      await expect(page.getByTestId('mobile-map-menu')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('mobile-map-online-loc-online').click()
      await expect(page.getByTestId('online-center')).toBeVisible({ timeout: 10000 })

      for (const module of splitModules) {
        await page.getByTestId(`online-module-${module.key}-link`).click()
        await expect(page.getByTestId(module.pageTestId)).toBeVisible({ timeout: 10000 })
        await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 10000 }).toContain(module.hash)
        await page.getByRole('link', { name: '在线中心' }).click()
        await expect(page.getByTestId('online-center')).toBeVisible({ timeout: 10000 })
      }
    })

    await runCheck('direct split module routes load after refresh-style navigation', async () => {
      const splitModules = [
        { path: 'manor', pageTestId: 'online-manor-page' },
        { path: 'neighbor', pageTestId: 'online-neighbor-page' },
        { path: 'orders', pageTestId: 'online-orders-page' },
        { path: 'festival', pageTestId: 'online-festival-page' },
        { path: 'society', pageTestId: 'online-society-page' },
      ]

      for (const module of splitModules) {
        await page.goto(`${frontendBaseURL}/#/game/online/${module.path}`)
        await expect(page.getByTestId(module.pageTestId)).toBeVisible({ timeout: 10000 })
        await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 10000 }).toContain(`/game/online/${module.path}`)
      }
    })

    await runCheck('legacy online routes redirect to split module pages with context', async () => {
      const legacyRoutes = [
        { legacy: 'social', pageTestId: 'online-neighbor-page', hash: '/game/online/neighbor' },
        { legacy: 'manor', pageTestId: 'online-manor-page', hash: '/game/online/manor' },
        { legacy: 'festival', pageTestId: 'online-festival-page', hash: '/game/online/festival' },
        { legacy: 'society', pageTestId: 'online-society-page', hash: '/game/online/society' },
        { legacy: 'expedition', pageTestId: 'online-festival-page', hash: '/game/online/festival', extraQuery: 'tab=expedition' },
      ]

      for (const route of legacyRoutes) {
        await page.goto(`${frontendBaseURL}/#/game/${route.legacy}?source=legacy-smoke`)
        await expect(page.getByTestId(route.pageTestId)).toBeVisible({ timeout: 10000 })
        const hash = await page.evaluate(() => window.location.hash)
        assert(hash.includes(route.hash), `${route.legacy} did not redirect to ${route.hash}: ${hash}`)
        assert(hash.includes('source=legacy-smoke'), `${route.legacy} did not preserve query context: ${hash}`)
        if (route.extraQuery) {
          assert(hash.includes(route.extraQuery), `${route.legacy} did not preserve extra query ${route.extraQuery}: ${hash}`)
        }
      }
    })

    await runCheck('online manor core actions persist through split tabs', async () => {
      const visitor = await bootstrapSession()
      const manorSeed = createSmokeSeed()
      const themeLabel = `庄园烟测主题${manorSeed}`
      const guestbookText = `庄园拆页留言 ${manorSeed}`
      const replyText = `庄园拆页回复 ${manorSeed}`
      const visitSummary = `拆页烟测参观 ${manorSeed}`
      const visitFeedback = `拆页烟测反馈 ${manorSeed}`
      const guideTitle = `烟测导览点${manorSeed}`
      const guideSummary = `拆页后导览说明 ${manorSeed}`

      await page.goto(`${frontendBaseURL}/#/game/online/manor`)
      await expect(page.getByTestId('online-manor-page')).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId('online-module-refresh-button')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-module-refresh-button').click()
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(owner)
        return snapshot.viewer_is_owner === true && snapshot.username === owner.username
      }, { timeout: 10000 }).toBeTruthy()

      await page.getByTestId('online-module-tab-theme').click()
      await expect(page.getByTestId('online-manor-theme-label-input')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-manor-theme-label-input').fill(themeLabel)
      await page.getByTestId('online-manor-template-select').selectOption('story')
      await page.getByTestId('online-manor-theme-save-button').click()
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(owner)
        return snapshot.theme_week?.active_theme === themeLabel && snapshot.theme_week?.template_id === 'story'
      }, { timeout: 10000 }).toBeTruthy()
      await expect(page.getByText(themeLabel).first()).toBeVisible({ timeout: 10000 })

      await createManorGuestbookEntry(visitor, {
        target_username: owner.username,
        kind: 'text',
        content: guestbookText,
      })
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(owner)
        return snapshot.guestbook_entries?.some(entry =>
          entry.content === guestbookText && entry.author_username === visitor.username
        )
      }, { timeout: 10000 }).toBeTruthy()

      await recordManorVisit(visitor, {
        target_username: owner.username,
        purpose: 'friend_visit',
        summary: visitSummary,
        feedback: visitFeedback,
      })
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(owner)
        return snapshot.visit_entries?.some(entry =>
          entry.summary === visitSummary
            && entry.feedback === visitFeedback
            && entry.visitor_username === visitor.username
        )
      }, { timeout: 10000 }).toBeTruthy()

      await favoriteManor(visitor, owner.username, themeLabel)
      await followManor(visitor, owner.username)
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(visitor, owner.username)
        const overview = await readFavoriteOverview(visitor)
        return snapshot.is_favorited_by_viewer === true
          && snapshot.is_followed_by_viewer === true
          && overview.favorites?.some(entry => entry.manor_username === owner.username)
      }, { timeout: 10000 }).toBeTruthy()

      await page.goto(`${frontendBaseURL}/#/game/online/manor`)
      await expect(page.getByTestId('online-manor-page')).toBeVisible({ timeout: 10000 })

      await page.getByTestId('online-module-tab-guestbook').click()
      await expect(page.getByTestId('online-manor-guestbook-list').getByText(guestbookText)).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-manor-guestbook-reply-input').first().fill(replyText)
      await page.getByTestId('online-manor-guestbook-reply-submit').first().click()
      await expect(page.getByTestId('online-manor-guestbook-list').getByText(replyText)).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-manor-guestbook-pin').first().click()
      await expect(page.getByText('取消')).toBeVisible({ timeout: 10000 })
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(owner)
        return snapshot.guestbook_entries?.some(entry =>
          entry.content === guestbookText && entry.reply_text === replyText && entry.pinned === true
        )
      }, { timeout: 10000 }).toBeTruthy()

      await page.getByTestId('online-module-tab-visits').click()
      await expect(page.getByTestId('online-manor-visit-list').getByText(visitSummary)).toBeVisible({ timeout: 10000 })

      await page.getByTestId('online-module-tab-guide').click()
      await expect(page.getByTestId('online-manor-guide-title-input')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-manor-guide-title-input').fill(guideTitle)
      await page.getByTestId('online-manor-guide-summary-input').fill(guideSummary)
      await page.getByTestId('online-manor-guide-submit').click()
      await expect(page.getByTestId('online-manor-guide-list').getByText(guideTitle)).toBeVisible({ timeout: 10000 })
      await expect.poll(async () => {
        const snapshot = await readManorSnapshot(owner)
        return snapshot.guide_points?.some(point => point.title === guideTitle && point.summary === guideSummary)
      }, { timeout: 10000 }).toBeTruthy()
    })

    await runCheck('online neighbor core actions persist through split tabs', async () => {
      const applicant = await bootstrapSession()
      const invitee = await bootstrapSession()
      const neighborSeed = createSmokeSeed()
      const manorName = `邻里烟测庄园${neighborSeed}`
      const publicTitle = `邻里烟测称号${neighborSeed}`
      const roleLabel = `邻里烟测身份${neighborSeed}`
      const showcaseTheme = `邻里主题${neighborSeed}`
      const intro = `邻里拆页名片介绍 ${neighborSeed}`
      const groupName = `烟测邻里${neighborSeed}`
      const groupSummary = `邻里拆页创建摘要 ${neighborSeed}`
      const groupNotice = `邻里拆页初始公告 ${neighborSeed}`

      await page.goto(`${frontendBaseURL}/#/game/online/neighbor`)
      await expect(page.getByTestId('online-neighbor-page')).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId('online-module-refresh-button')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-module-refresh-button').click()
      await expect.poll(async () => {
        const profile = await readOnlineProfile(owner)
        return profile.username === owner.username
      }, { timeout: 10000 }).toBeTruthy()

      await page.getByTestId('online-neighbor-profile-manor-input').fill(manorName)
      await page.getByTestId('online-neighbor-profile-title-input').fill(publicTitle)
      await page.getByTestId('online-neighbor-profile-role-input').fill(roleLabel)
      await page.getByTestId('online-neighbor-profile-theme-input').fill(showcaseTheme)
      await page.getByTestId('online-neighbor-profile-visibility-select').selectOption('public')
      await page.getByTestId('online-neighbor-profile-intro-input').fill(intro)
      await page.getByTestId('online-neighbor-profile-save').click()
      await expect.poll(async () => {
        const profile = await readOnlineProfile(owner)
        return profile.manor_name === manorName
          && profile.public_title === publicTitle
          && profile.neighborhood_role === roleLabel
          && profile.showcase_theme === showcaseTheme
          && profile.public_intro === intro
      }, { timeout: 10000 }).toBeTruthy()

      await page.getByTestId('online-module-tab-friends').click()
      await expect(page.getByTestId('online-neighbor-friend-station-link')).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId('online-neighbor-friend-station-link')).toHaveAttribute('href', /friend-station/)
      await page.getByTestId('online-neighbor-friend-station-link').click()
      await expect(page.getByTestId('region-social-friend-panel')).toBeVisible({ timeout: 10000 })
      await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 10000 }).toContain('/game/friend-station')

      await page.goto(`${frontendBaseURL}/#/game/online/neighbor`)
      await expect(page.getByTestId('online-neighbor-page')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-module-tab-neighbor').click()
      await expect(page.getByTestId('online-neighbor-create-name-input')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-neighbor-create-name-input').fill(groupName)
      await page.getByTestId('online-neighbor-create-summary-input').fill(groupSummary)
      await page.getByTestId('online-neighbor-create-notice-input').fill(groupNotice)
      await page.getByTestId('online-neighbor-create-capacity-select').selectOption('12')
      await page.getByTestId('online-neighbor-create-submit').click()
      await expect(page.getByText(groupName).first()).toBeVisible({ timeout: 10000 })
      await expect.poll(async () => {
        const overview = await readNeighborOverview(owner)
        const leaderRole = overview.my_group?.members?.find(member => member.username === owner.username)?.role
        return overview.my_group?.name === groupName
          && overview.my_group?.summary === groupSummary
          && overview.my_group?.notice === groupNotice
          && leaderRole === 'leader'
      }, { timeout: 10000 }).toBeTruthy()

      const ownerNeighborOverview = await readNeighborOverview(owner)
      const groupId = ownerNeighborOverview.my_group?.id
      assert(groupId, 'created neighbor group id missing')

      const applyRequest = await applyToNeighborGroup(applicant, groupId)
      assert(applyRequest.group_id === groupId && applyRequest.username === applicant.username, 'neighbor apply request target mismatch')
      await expect.poll(async () => {
        const overview = await readNeighborOverview(owner)
        return overview.managed_requests?.some(request =>
          request.id === applyRequest.id
            && request.type === 'apply'
            && request.username === applicant.username
            && request.status === 'pending'
        )
      }, { timeout: 10000 }).toBeTruthy()

      await page.goto(`${frontendBaseURL}/#/game/online/neighbor`)
      await expect(page.getByTestId('online-neighbor-page')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-module-tab-neighbor').click()
      await expect(page.getByTestId('online-neighbor-invite-username-input')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-neighbor-invite-username-input').fill(invitee.username)
      await page.getByTestId('online-neighbor-invite-submit').click()
      await expect.poll(async () => {
        const overview = await readNeighborOverview(owner)
        return overview.managed_requests?.some(request =>
          request.type === 'invite'
            && request.username === invitee.username
            && request.invited_by === owner.username
            && request.status === 'pending'
        )
      }, { timeout: 10000 }).toBeTruthy()

      const inviteeOverview = await readNeighborOverview(invitee)
      assert(
        inviteeOverview.incoming_invites?.some(request => request.group_id === groupId && request.group_name === groupName),
        'neighbor invite was not visible to invitee',
      )
      const relationships = await readRelationshipOverview(owner)
      assert(Array.isArray(relationships.friends), 'relationship overview did not return friends array')
    })

    await runCheck('online orders core actions persist through split tabs', async () => {
      const helper = await bootstrapSession({ seedSave: false })
      const orderSeed = createSmokeSeed()
      const orderTitle = `委托拆页烟测${orderSeed}`
      const orderDescription = `在线委托拆页发布与结算闭环 ${orderSeed}`
      const rewardValue = 23
      const rewardLabel = `烟测铜钱${orderSeed}`
      const deliveryNote = `委托拆页交付说明 ${orderSeed}`
      const deliveredItemId = `wood_${orderSeed}`

      await page.goto(`${frontendBaseURL}/#/game/online/orders?tab=publish`)
      await expect(page.getByTestId('online-orders-page')).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId('online-orders-publish-title-input')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('online-orders-publish-title-input').fill(orderTitle)
      await page.getByTestId('online-orders-publish-type-select').selectOption('material_help')
      await page.getByTestId('online-orders-publish-scope-select').selectOption('public')
      await page.getByTestId('online-orders-publish-mode-select').selectOption('single')
      await page.getByTestId('online-orders-publish-deadline-input').fill(buildFutureDatetimeLocal(4))
      await page.getByTestId('online-orders-publish-reward-type-select').selectOption('money')
      await page.getByTestId('online-orders-publish-reward-value-input').fill(String(rewardValue))
      await page.getByTestId('online-orders-publish-reward-label-input').fill(rewardLabel)
      await page.getByTestId('online-orders-publish-description-input').fill(orderDescription)
      await page.getByTestId('online-orders-publish-submit').click()

      let orderId = ''
      await expect.poll(async () => {
        const overview = await readCoopOrderOverview(owner)
        const order = overview.orders?.find(entry =>
          entry.owner_username === owner.username && entry.title === orderTitle
        )
        orderId = order?.id || ''
        return Boolean(orderId && order.status === 'open' && order.delivery_status === 'none')
      }, { timeout: 10000 }).toBeTruthy()

      await page.getByTestId('online-module-tab-mine').click()
      await expect(page.getByTestId('online-orders-mine-entry').filter({ hasText: orderTitle })).toBeVisible({ timeout: 10000 })

      const acceptedOrder = await acceptCoopOrder(helper, orderId)
      assert(acceptedOrder.assignee_username === helper.username, 'coop order accept did not assign helper')
      await expect.poll(async () => {
        const overview = await readCoopOrderOverview(owner)
        const order = overview.orders?.find(entry => entry.id === orderId)
        return order?.assignee_username === helper.username && order.delivery_status === 'none'
      }, { timeout: 10000 }).toBeTruthy()

      const delivered = await submitCoopOrderDelivery(helper, orderId, {
        delivered_items: [{ item_id: deliveredItemId, quantity: 3 }],
        result_note: deliveryNote,
      })
      const receiptId = delivered.receipt?.id || ''
      assert(receiptId, 'coop order delivery did not create receipt')
      await expect.poll(async () => {
        const overview = await readCoopOrderOverview(owner)
        const order = overview.orders?.find(entry => entry.id === orderId)
        const receipt = overview.receipts?.find(entry => entry.id === receiptId)
        return order?.delivery_status === 'submitted'
          && order.active_receipt_id === receiptId
          && receipt?.status === 'pending_owner_confirm'
          && receipt.result_note === deliveryNote
      }, { timeout: 10000 }).toBeTruthy()

      await page.goto(`${frontendBaseURL}/#/game/online/orders?tab=mine`)
      await expect(page.getByTestId('online-orders-page')).toBeVisible({ timeout: 10000 })
      const mineEntry = page.getByTestId('online-orders-mine-entry').filter({ hasText: orderTitle }).first()
      await expect(mineEntry.getByTestId('online-orders-confirm-submit')).toBeVisible({ timeout: 10000 })
      await mineEntry.getByTestId('online-orders-confirm-submit').click()

      let compensationId = ''
      await expect.poll(async () => {
        const overview = await readCoopOrderOverview(owner)
        const order = overview.orders?.find(entry => entry.id === orderId)
        const receipt = overview.receipts?.find(entry => entry.id === receiptId)
        const compensation = overview.compensations?.find(entry =>
          entry.order_id === orderId && entry.receipt_id === receiptId
        )
        compensationId = compensation?.id || ''
        return order?.delivery_status === 'compensation_pending'
          && receipt?.status === 'compensation_pending'
          && receipt.compensation_id === compensationId
          && compensation?.status === 'pending'
          && compensation.attempt_count === 1
      }, { timeout: 10000 }).toBeTruthy()

      await seedSessionSave(helper)
      const beforeRetrySave = await readServerSave(helper)
      const beforeRetryMoney = getSaveMoney(beforeRetrySave)

      await page.getByTestId('online-module-tab-receipts').click()
      const compensationEntry = page.getByTestId('online-orders-compensation-entry').filter({ hasText: compensationId }).first()
      await expect(compensationEntry.getByTestId('online-orders-compensation-retry-submit')).toBeVisible({ timeout: 10000 })
      await compensationEntry.getByTestId('online-orders-compensation-retry-submit').click()

      await expect.poll(async () => {
        const overview = await readCoopOrderOverview(owner)
        const order = overview.orders?.find(entry => entry.id === orderId)
        const receipt = overview.receipts?.find(entry => entry.id === receiptId)
        const compensation = overview.compensations?.find(entry => entry.id === compensationId)
        const helperSave = await readServerSave(helper)
        return order?.delivery_status === 'confirmed'
          && receipt?.status === 'confirmed'
          && compensation?.status === 'resolved'
          && compensation.attempt_count === 2
          && getSaveMoney(helperSave) === beforeRetryMoney + rewardValue
      }, { timeout: 10000 }).toBeTruthy()
      await expect(page.getByTestId('online-orders-compensation-entry').filter({ hasText: compensationId }).getByText('已解决')).toBeVisible({ timeout: 10000 })
    })

    await runCheck('cloud save quick save preserves decryptable server slot', async () => {
      const before = await readServerSave(owner)
      await page.getByTestId('status-bar').locator('button').first().click()
      await page.getByRole('button', { name: '仅保存' }).click()
      await expect(page.getByText('保存当前进度到存档 1')).toBeVisible()
      await page.getByRole('button', { name: '服务端持久化' }).click()
      await page.getByRole('button', { name: /保存当前进度到存档 1/ }).click()
      await expect(page.getByText('保存当前进度到存档 1')).toHaveCount(0, { timeout: 10000 })

      await expect.poll(async () => {
        const after = await readServerSave(owner)
        return after.raw !== before.raw && after.data?.player?.playerName === '烟测'
      }, { timeout: 10000 }).toBeTruthy()
    })

    await runCheck('mail reward claim updates current server save', async () => {
      const before = await readServerSave(owner)
      const beforeMoney = getSaveMoney(before)
      await page.goto(`${frontendBaseURL}/#/game/mail`)
      await expect(page.getByTestId('game-layout')).toBeVisible()
      await expect(page.getByText('邮箱')).toBeVisible()
      await page.getByRole('button', { name: '刷新邮件' }).click()
      await expect(getMailListItem(page)).toBeVisible({ timeout: 10000 })
      await getMailListItem(page).click()
      await expect(page.getByRole('button', { name: '领取奖励' })).toBeVisible()
      await page.getByRole('button', { name: '领取奖励' }).click()
      await expect(page.getByText('已领取')).toBeVisible({ timeout: 10000 })

      await expect.poll(async () => {
        const after = await readServerSave(owner)
        return getSaveMoney(after)
      }, { timeout: 10000 }).toBe(beforeMoney + 77)

      const mailList = await readMailList(owner)
      const claimed = mailList.mails?.find(mail => mail.title === mailTitle)
      assert(claimed?.claim_status === 'claimed', 'reward mail was not marked claimed in backend list')
    })

    await runCheck('mail notification refreshes inbox without manual reload', async () => {
      const sender = await bootstrapSession()
      const realtimeMailTitle = `实时通知来信 ${createSmokeSeed()}`
      const realtimeMailItem = page.locator('.mail-item').filter({ hasText: realtimeMailTitle }).first()
      await expect(page.getByTestId('game-layout')).toBeVisible()
      await expect(page.getByText('邮箱')).toBeVisible()
      await expect(page.getByText(realtimeMailTitle)).toHaveCount(0)
      const realtimeFrameOffset = realtimeFrames.length

      const result = await fetchSessionJson(sender, '/api/taoyuan/mail/player-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_username: owner.username,
          title: realtimeMailTitle,
          content: '这是一封用于验证实时通知刷新邮箱列表的来信。',
          template_type: 'short_note',
        }),
      })
      assert(result.response.ok, `player letter send returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
      assert(result.data?.mail?.title === realtimeMailTitle, 'player letter response title mismatch')

      await expect.poll(() => realtimeFrames.slice(realtimeFrameOffset).some(frame =>
        frame.includes('"type":"notification.created"')
          && frame.includes('"category":"mail"')
          && frame.includes(realtimeMailTitle)
      ), { timeout: 10000 }).toBeTruthy()
      await expect(realtimeMailItem).toBeVisible({ timeout: 10000 })
    })

    await runCheck('hall post and reply work under logged in browser session', async () => {
      const replyText = `联机回归回复 ${seed}`
      hallRealtimeReplyText = `大厅实时刷新回复 ${createSmokeSeed()}`
      await page.goto(`${frontendBaseURL}/#/hall`)
      await expect(page.getByRole('heading', { name: '交流大厅' })).toBeVisible()
      await expect(page.getByText(owner.displayName)).toBeVisible()
      await page.getByRole('button', { name: '发帖' }).click()
      await expect(page.getByText('发布新帖子')).toBeVisible()
      await page.getByPlaceholder('请输入标题，建议概括主题或问题').fill(hallTitle)
      await page.getByPlaceholder('输入这一段文字内容...').fill('realtime 旧入口回归大厅正文')
      await page.getByRole('button', { name: '确认发布' }).click()
      await expect(page.getByRole('button', { name: new RegExp(`^${hallTitle}`) })).toBeVisible({ timeout: 10000 })
      await page.getByPlaceholder('写下你的想法、经验或建议...').fill(replyText)
      await page.getByRole('button', { name: '发送回复' }).click()
      await expect(page.getByText(replyText)).toBeVisible({ timeout: 10000 })

      const search = await readHallPosts(hallTitle)
      const post = search.posts?.find(item => item.title === hallTitle)
      assert(post?.id, 'hall post was not found from backend search')
      const detail = await readHallPostDetail(post.id)
      assert(detail.post?.replies?.some(reply => reply.content === replyText), 'hall reply was not found from backend detail')

      const realtimeFrameOffset = realtimeFrames.length
      const replier = await bootstrapSession()
      const realtimeReply = await createHallReply(replier, post.id, hallRealtimeReplyText)
      const createdReply = realtimeReply.post?.replies?.at(-1)
      assert(createdReply?.content === hallRealtimeReplyText, 'hall realtime reply response mismatch')
      await expect.poll(() => realtimeFrames.slice(realtimeFrameOffset).some(frame =>
        frame.includes('"type":"notification.created"')
          && frame.includes('"category":"hall"')
          && frame.includes('"action":"post_reply"')
          && frame.includes(post.id)
      ), { timeout: 10000 }).toBeTruthy()
      await expect(page.getByText(hallRealtimeReplyText)).toBeVisible({ timeout: 10000 })
    })

    const screenshotPath = path.resolve(outputDir, '25-online-regression-live-1280x900.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    const summaryPath = path.resolve(outputDir, 'online-regression-live-summary.json')
    await writeFile(summaryPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      frontendBaseURL,
      backendBaseURL,
      owner: {
        username: owner.username,
        save_id: owner.identity.save_id,
        imported_save_id: importedSaveIdentity?.save_id ?? null,
        imported_save_slot: importedSaveIdentity?.save_slot ?? null,
        imported_save_player_name: importedSavePlayerName,
      },
      checks,
      screenshot: screenshotPath,
      consoleErrors: [...new Set(consoleErrors)],
      pageErrors: [...new Set(pageErrors)],
      requestFailures: [...new Set(requestFailures)],
      realtimeSocketCount,
      realtimeFrames: realtimeFrames.length,
      mailTitle,
      hallTitle,
      hallRealtimeReplyText,
    }, null, 2), 'utf8')

    assert(consoleErrors.length === 0, `console errors detected: ${consoleErrors.join('\n')}`)
    assert(pageErrors.length === 0, `page errors detected: ${pageErrors.join('\n')}`)
    assert(requestFailures.length === 0, `request failures detected: ${requestFailures.join('\n')}`)
    await context.close()
    console.log(`Saved online regression smoke summary to ${summaryPath}`)
  } finally {
    if (browser) await browser.close().catch(() => {})
    stopChild(frontend)
    stopChild(backend)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
