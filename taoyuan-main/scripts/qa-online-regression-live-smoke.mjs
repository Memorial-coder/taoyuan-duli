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

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const createSmokeSeed = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5)

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

const buildSeedSavePayload = () => {
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
        day: 2,
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
        playerName: '烟测',
        gender: 'male',
        money: 1200,
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
    },
  }
}

const getEmbeddedSaveIdentity = decryptedSave => decryptedSave?.meta?.onlineIdentity || decryptedSave?.onlineIdentity || null

const getSaveData = decryptedSave => decryptedSave?.data && typeof decryptedSave.data === 'object'
  ? decryptedSave.data
  : decryptedSave

const readServerSave = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/save/0')
  assert(result.response.ok, `save read returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  const decrypted = decryptTaoyuanRaw(result.data?.raw || '')
  assert(decrypted, 'server save could not be decrypted')
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

const bootstrapSession = async () => {
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
  await seedSessionSave(session)
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
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })
    page.on('requestfailed', request => {
      const url = request.url()
      const failure = request.failure()?.errorText ?? 'unknown failure'
      if (url.includes('/api/taoyuan/online/realtime') && /closed|aborted|net::ERR_ABORTED/i.test(failure)) return
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

    await runCheck('server save loads into game layout with realtime socket', async () => {
      await page.getByRole('button', { name: /存档 1 .*烟测/ }).click()
      await expect(page.getByTestId('game-layout')).toBeVisible()
      await expect(page.getByTestId('status-bar')).toBeVisible()
      await expect(page.getByTestId('status-bar').getByText('烟测')).toBeVisible()
      await expect.poll(() => realtimeSocketCount > 0, { timeout: 10000 }).toBeTruthy()
      await expect.poll(() => realtimeFrames.some(frame => frame.includes('realtime.ready')), { timeout: 10000 }).toBeTruthy()
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

    await runCheck('hall post and reply work under logged in browser session', async () => {
      const replyText = `联机回归回复 ${seed}`
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
