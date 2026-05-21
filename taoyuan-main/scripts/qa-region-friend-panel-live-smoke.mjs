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
const tempDir = path.resolve(workspaceRoot, '.codex-temp', 'region-friend-panel-live-smoke')
const storageFile = path.resolve(tempDir, '.storage.json')
const host = '127.0.0.1'
const backendPort = await findAvailablePort(host, Number(process.env.TAOYUAN_REGION_FRIEND_BACKEND_PORT || 4013))
const frontendPort = await findAvailablePort(host, Number(process.env.TAOYUAN_REGION_FRIEND_FRONTEND_PORT || 4185))
const backendBaseURL = `http://${host}:${backendPort}`
const frontendBaseURL = `http://${host}:${frontendPort}`
const sampleId = 'region_map_showcase'

const checks = []
const consoleErrors = []
const pageErrors = []
const requestFailures = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
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
      SECRET_KEY: process.env.SECRET_KEY || 'qa-region-friend-panel-secret-key',
      ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'qa-region-friend-panel-admin-token',
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

const buildSeedSavePayload = (username, startingMoney) => encryptTaoyuanData({
  player: {
    money: startingMoney,
    name: username,
  },
  inventory: {
    items: [
      { itemId: 'wood', quantity: 6, quality: 'normal', locked: false },
      { itemId: 'parsnip_seed', quantity: 4, quality: 'normal', locked: false },
      { itemId: 'wintersweet', quantity: 2, quality: 'normal', locked: false },
    ],
    tempItems: [],
    ownedWeapons: [],
    ownedRings: [],
    ownedHats: [],
    ownedShoes: [],
    capacity: 24,
  },
})

const getEmbeddedSaveIdentity = decryptedSave => decryptedSave?.meta?.onlineIdentity || decryptedSave?.onlineIdentity || null

const createSmokeSeed = () => Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4)

const seedSessionSave = async (session, startingMoney) => {
  const rawSavePayload = buildSeedSavePayload(session.username, startingMoney)
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

  const readback = await fetchSessionJson(session, '/api/taoyuan/save/0')
  assert(readback.response.ok, `save readback for ${session.username} returned ${readback.response.status}`)
  const identity = getEmbeddedSaveIdentity(decryptTaoyuanRaw(readback.data?.raw || ''))
  assert(identity?.save_id, `save identity missing for ${session.username}`)
  session.identity = identity
}

const bootstrapSession = async (labelPrefix, displayNamePrefix, startingMoney) => {
  const session = createSessionState()
  const seed = createSmokeSeed()
  session.username = `${labelPrefix}_${seed}`.toLowerCase()
  session.displayName = `${displayNamePrefix}${seed.slice(-4)}`
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
  await seedSessionSave(session, startingMoney)
  return session
}

const requestFriend = async (session, targetSaveId) => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/social/friend-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_save_id: targetSaveId }),
  })
  assert(result.response.ok, `friend request from ${session.username} returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.request?.id, `friend request from ${session.username} did not return id`)
  return result.data.request
}

const acceptFriend = async (session, requestId) => {
  const result = await fetchSessionJson(session, `/api/taoyuan/online/social/friend-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
  })
  assert(result.response.ok, `accept request ${requestId} returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  return result.data.request
}

const blockSave = async (session, targetSaveId) => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/social/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_save_id: targetSaveId }),
  })
  assert(result.response.ok, `block save ${targetSaveId} returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  assert(result.data?.relation?.block_id, `block save ${targetSaveId} did not return block id`)
  return result.data.relation
}

const readRelationships = async session => {
  const result = await fetchSessionJson(session, '/api/taoyuan/online/social/relationships')
  assert(result.response.ok, `relationship overview for ${session.username} returned ${result.response.status}: ${result.data?.msg || 'unknown error'}`)
  return result.data
}

const waitForOverviewCondition = async (session, predicate, label, timeoutMs = 10_000) => {
  const startedAt = Date.now()
  let lastOverview = null
  while (Date.now() - startedAt < timeoutMs) {
    lastOverview = await readRelationships(session)
    if (predicate(lastOverview)) return lastOverview
    await wait(250)
  }
  throw new Error(`${label} did not appear in relationship overview in time`)
}

const createFriendship = async (owner, friend) => {
  const request = await requestFriend(owner, friend.identity.save_id)
  await acceptFriend(friend, request.id)
  const overview = await readRelationships(owner)
  const friendCard = overview.friends.find(entry => entry?.profile?.username === friend.username)
  assert(friendCard?.friendship_id, `friendship with ${friend.username} missing from owner overview`)
  return String(friendCard.friendship_id)
}

const forwardApiRequests = async (context) => {
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

const openSamplePage = async page => {
  await page.goto(frontendBaseURL)
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible()
  await page.waitForFunction(() => typeof window.__TAOYUAN_SAMPLE_SAVES__?.load === 'function')
  const loaded = await page.evaluate(async targetId => {
    const api = window.__TAOYUAN_SAMPLE_SAVES__
    return api ? await api.load(targetId) : false
  }, sampleId)
  assert(loaded, `Unable to load sample save ${sampleId}`)
  await page.goto(`${frontendBaseURL}/#/game/region-map`)
  await expect(page.getByTestId('game-layout')).toBeVisible()
}

const waitForRelationshipIdle = async page => {
  await expect(page.getByTestId('region-social-friend-panel')).toBeVisible()
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-testid="region-social-friend-panel"]')
    return Boolean(panel && !panel.textContent?.includes('刷新中'))
  })
}

const runCheck = async (label, runner) => {
  await runner()
  checks.push(label)
  console.log(`[region-friend-panel-live-smoke] ok: ${label}`)
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

    const owner = await bootstrapSession('mfo', '烟测主人', 1200)
    const searchRequestTarget = await bootstrapSession('mfr', '申请目标', 240)
    const searchBlockTarget = await bootstrapSession('mfb', '拉黑目标', 240)
    const incomingAcceptTarget = await bootstrapSession('mfa', '待接受旅人', 240)
    const incomingRejectTarget = await bootstrapSession('mfj', '待拒绝旅人', 240)
    const navigateFriend = await bootstrapSession('mfn', '跳转好友', 240)
    const deleteFriend = await bootstrapSession('mfd', '删除好友', 240)
    const blockFriend = await bootstrapSession('mfx', '好友拉黑', 240)
    const unblockTarget = await bootstrapSession('mfu', '已拉黑旅人', 240)

    const acceptRequest = await requestFriend(incomingAcceptTarget, owner.identity.save_id)
    const rejectRequest = await requestFriend(incomingRejectTarget, owner.identity.save_id)
    const navigateFriendshipId = await createFriendship(owner, navigateFriend)
    const deleteFriendshipId = await createFriendship(owner, deleteFriend)
    const blockFriendshipId = await createFriendship(owner, blockFriend)
    const unblockRelation = await blockSave(owner, unblockTarget.identity.save_id)

    try {
      browser = await chromium.launch()
    } catch (error) {
      if (isPlaywrightEnvironmentError(error)) {
        console.log('[region-friend-panel-live-smoke] Skipped: current environment cannot launch Playwright Chromium (spawn EPERM).')
        return
      }
      throw error
    }

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'zh-CN',
      reducedMotion: 'reduce',
    })
    await forwardApiRequests(context)
    await setSessionCookie(context, owner)

    const page = await context.newPage()
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })
    page.on('requestfailed', request => {
      requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown failure'}`)
    })
    page.on('dialog', dialog => dialog.accept())

    await openSamplePage(page)
    await waitForRelationshipIdle(page)
    const panel = page.getByTestId('region-social-friend-panel')
    await expect(panel.getByText(String(owner.identity.save_id))).toBeVisible()

    await runCheck('friend interaction buttons navigate with target context', async () => {
      await page.getByTestId(`region-social-friend-manor-${navigateFriendshipId}`).click()
      await expect(page).toHaveURL(new RegExp(`target_username=${encodeURIComponent(navigateFriend.username)}`))
      await page.goto(`${frontendBaseURL}/#/game/region-map`)
      await waitForRelationshipIdle(page)

      await page.getByTestId(`region-social-friend-mail-${navigateFriendshipId}`).click()
      await expect(page).toHaveURL(/compose=letter/)
      await expect(page).toHaveURL(new RegExp(`target_save_id=${navigateFriend.identity.save_id}`))
      await page.goto(`${frontendBaseURL}/#/game/region-map`)
      await waitForRelationshipIdle(page)

      await page.getByTestId(`region-social-friend-gift-${navigateFriendshipId}`).click()
      await expect(page).toHaveURL(/compose=gift/)
      await page.goto(`${frontendBaseURL}/#/game/region-map`)
      await waitForRelationshipIdle(page)

      await page.getByTestId(`region-social-friend-invite-${navigateFriendshipId}`).click()
      await expect(page).toHaveURL(/invite=1/)
      await page.goto(`${frontendBaseURL}/#/game/region-map`)
      await waitForRelationshipIdle(page)

      await page.getByTestId(`region-social-friend-coop-${navigateFriendshipId}`).click()
      await expect(page).toHaveURL(/scope=friends/)
      await page.goto(`${frontendBaseURL}/#/game/region-map`)
      await waitForRelationshipIdle(page)
    })

    await runCheck('search save id and submit friend request from browser', async () => {
      await panel.getByPlaceholder('9 位数字 ID').fill(String(searchRequestTarget.identity.save_id))
      await page.getByTestId('region-social-search-submit').click()
      await expect(panel.getByText(searchRequestTarget.displayName)).toBeVisible()
      await page.getByTestId('region-social-search-request').click()
      await expect(panel.getByText(searchRequestTarget.displayName)).toBeVisible()
      await waitForOverviewCondition(
        owner,
        overview => overview.outgoing_requests.some(entry => entry?.to_save_id === searchRequestTarget.identity.save_id),
        'browser friend request',
      )
    })

    await runCheck('accept incoming friend request from browser', async () => {
      await page.getByTestId(`region-social-incoming-accept-${acceptRequest.id}`).click()
      await expect(panel.getByTestId(`region-social-incoming-${acceptRequest.id}`)).toHaveCount(0)
      await waitForOverviewCondition(
        owner,
        overview => overview.friends.some(entry => entry?.friend_save_id === incomingAcceptTarget.identity.save_id),
        'accepted friend',
      )
    })

    await runCheck('reject incoming friend request from browser', async () => {
      await page.getByTestId(`region-social-incoming-reject-${rejectRequest.id}`).click()
      await expect(panel.getByTestId(`region-social-incoming-${rejectRequest.id}`)).toHaveCount(0)
      await waitForOverviewCondition(
        owner,
        overview => !overview.incoming_requests.some(entry => entry?.request_id === rejectRequest.id),
        'rejected request removal',
      )
    })

    await runCheck('delete friend from browser', async () => {
      await page.getByTestId(`region-social-friend-remove-${deleteFriendshipId}`).click()
      await expect(panel.getByTestId(`region-social-friend-${deleteFriendshipId}`)).toHaveCount(0)
      await waitForOverviewCondition(
        owner,
        overview => !overview.friends.some(entry => entry?.friendship_id === deleteFriendshipId),
        'deleted friendship removal',
      )
    })

    await runCheck('block existing friend from browser', async () => {
      await page.getByTestId(`region-social-friend-block-${blockFriendshipId}`).click()
      await waitForOverviewCondition(
        owner,
        overview => overview.blocked_users.some(entry => entry?.blocked_save_id === blockFriend.identity.save_id),
        'blocked friend',
      )
    })

    await runCheck('search save id and block player from browser', async () => {
      await panel.getByPlaceholder('9 位数字 ID').fill(String(searchBlockTarget.identity.save_id))
      await page.getByTestId('region-social-search-submit').click()
      await expect(panel.getByText(searchBlockTarget.displayName)).toBeVisible()
      await page.getByTestId('region-social-search-block').click()
      await waitForOverviewCondition(
        owner,
        overview => overview.blocked_users.some(entry => entry?.blocked_save_id === searchBlockTarget.identity.save_id),
        'searched player block',
      )
    })

    await runCheck('unblock player from browser', async () => {
      await page.getByTestId(`region-social-blocked-unblock-${unblockRelation.block_id}`).click()
      await expect(panel.getByTestId(`region-social-blocked-${unblockRelation.block_id}`)).toHaveCount(0)
      await waitForOverviewCondition(
        owner,
        overview => !overview.blocked_users.some(entry => entry?.block_id === unblockRelation.block_id),
        'unblocked relation removal',
      )
    })

    const screenshotPath = path.resolve(outputDir, '24-region-social-friend-panel-live-390x844.png')
    await page.screenshot({ path: screenshotPath, fullPage: false })
    const summaryPath = path.resolve(outputDir, 'region-social-friend-panel-live-summary.json')
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
    }, null, 2), 'utf8')

    assert(consoleErrors.length === 0, `console errors detected: ${consoleErrors.join('\n')}`)
    assert(pageErrors.length === 0, `page errors detected: ${pageErrors.join('\n')}`)
    assert(requestFailures.length === 0, `request failures detected: ${requestFailures.join('\n')}`)
    await context.close()
    console.log(`Saved live friend panel smoke summary to ${summaryPath}`)
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
