import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(repoRoot, '..')
const outputDir = path.resolve(workspaceRoot, 'docs', 'ui-smoke-2026-04-26')
const host = '127.0.0.1'
const port = 4175
const baseURL = process.env.TAOYUAN_BASE_URL?.trim() || `http://${host}:${port}`
const shouldStartDevServer = process.env.TAOYUAN_SKIP_DEV_SERVER !== '1'
const sampleId = 'region_map_showcase'

const consoleErrors = []
const pageErrors = []
const requestFailures = []
const screenshots = []
const pageChecks = []

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function isServerReachable(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(url)) return
    await wait(1000)
  }
  throw new Error(`Timed out waiting for dev server at ${url}`)
}

function startDevServer() {
  const child = process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run dev -- --host ${host} --port ${port} --strictPort`], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      })
    : spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      })

  child.stdout.on('data', chunk => {
    process.stdout.write(chunk)
  })
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk)
  })

  return child
}

async function createPage(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    locale: 'zh-CN',
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()

  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, user: null })
    })
  })

  await page.route('**/api/public-config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    })
  })

  await page.route('**/api/taoyuan/ai/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    })
  })

  await page.route('**/api/taoyuan/logs/gameplay/batch', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    })
  })

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })
  page.on('requestfailed', request => {
    requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown failure'}`)
  })

  return { context, page }
}

async function openHome(page) {
  await page.goto(baseURL)
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible()
  await expect(page.getByRole('button', { name: '新的旅程' })).toBeVisible()
}

async function loadBuiltInSample(page, id) {
  await page.waitForFunction(() => typeof window.__TAOYUAN_SAMPLE_SAVES__?.load === 'function')
  const loaded = await page.evaluate(async targetId => {
    const api = window.__TAOYUAN_SAMPLE_SAVES__
    return api ? await api.load(targetId) : false
  }, id)
  if (!loaded) throw new Error(`Unable to load sample save ${id}`)
}

async function openSamplePage(page, hash) {
  await openHome(page)
  await loadBuiltInSample(page, sampleId)
  await page.goto(`${baseURL}${hash}`)
  await expect(page.getByTestId('game-layout')).toBeVisible()
}

async function clearTransientOverlays(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('.qmsg, .qmsg-item-wrapper, .qmsg-content, [class*="qmsg-"]')
      .forEach(node => node.remove())
  })
}

async function captureScenario({
  browser,
  label,
  hash,
  viewport,
  primarySelector,
  prepare
}) {
  const { context, page } = await createPage(browser, viewport)
  try {
    await openSamplePage(page, hash)
    if (prepare) {
      await prepare(page)
    }
    await clearTransientOverlays(page)

    const primary = page.locator(primarySelector)
    await expect(primary.first()).toBeVisible()
    const primaryBox = await primary.first().boundingBox()
    const screenshotPath = path.resolve(outputDir, `${label}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    screenshots.push(screenshotPath)

    const pageMetrics = await page.evaluate(() => {
      const preview = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 280)
      return {
        title: document.title,
        hash: window.location.hash,
        bodyScrollWidth: document.body.scrollWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4,
        textPreview: preview
      }
    })

    pageChecks.push({
      label,
      hash: pageMetrics.hash,
      title: pageMetrics.title,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      bodyScrollWidth: pageMetrics.bodyScrollWidth,
      docScrollWidth: pageMetrics.docScrollWidth,
      horizontalOverflow: pageMetrics.horizontalOverflow,
      primaryActionVisibleInViewport: Boolean(primaryBox && primaryBox.y < viewport.height),
      primaryActionTop: primaryBox ? Number(primaryBox.y.toFixed(1)) : null,
      textPreview: pageMetrics.textPreview
    })
  } finally {
    await context.close()
  }
}

async function ensureManualExpedition(page) {
  const stage = page.getByTestId('region-expedition-stage')
  if (await stage.isVisible().catch(() => false)) return
  const started = await page.evaluate(async () => {
    const api = window.__TAOYUAN_REGION_MAP_DEBUG__
    if (!api || typeof api.startFirstManualSession !== 'function') return false
    const result = await api.startFirstManualSession()
    return Boolean(result?.success)
  })
  if (!started) throw new Error('Unable to start manual expedition session')
  await expect(stage).toBeVisible()
}

async function waitForExpeditionAction(page) {
  const retreatButton = page.getByTestId('region-expedition-retreat')
  const settleButton = page.getByTestId('region-expedition-settle')
  const choiceButton = page.locator('[data-testid^="region-expedition-choice-"]').first()
  const encounterButton = page.locator('[data-testid^="region-expedition-encounter-"]').first()
  const campButton = page.locator('[data-testid^="region-expedition-camp-"]').first()

  for (let i = 0; i < 12; i += 1) {
    if (await settleButton.isVisible().catch(() => false)) return 'settle'
    if (await retreatButton.isVisible().catch(() => false)) return 'retreat'
    if (await encounterButton.isVisible().catch(() => false)) {
      await encounterButton.click()
      await page.waitForTimeout(250)
      continue
    }
    if (await campButton.isVisible().catch(() => false)) {
      await campButton.click()
      await page.waitForTimeout(250)
      continue
    }
    if (await choiceButton.isVisible().catch(() => false)) return 'choice'
    await page.waitForTimeout(250)
  }

  throw new Error('No expedition action became available in time')
}

async function driveSettlementToAftermath(page) {
  await ensureManualExpedition(page)

  const firstChoice = page.locator('[data-testid^="region-expedition-choice-"]').first()
  if (await firstChoice.isVisible().catch(() => false)) {
    await firstChoice.click()
  }

  const nextAction = await waitForExpeditionAction(page)
  if (nextAction === 'choice' || nextAction === 'retreat') {
    await page.getByTestId('region-expedition-retreat').click()
  }

  await expect(page.getByTestId('region-expedition-settle')).toBeVisible()
  await page.getByTestId('region-expedition-settle').click()
  await expect(page.getByTestId('journey-settlement-reveal')).toBeVisible()

  for (let i = 0; i < 2; i += 1) {
    const nextButton = page.getByTestId('journey-settlement-next')
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click()
    }
  }

  await expect(page.getByTestId('journey-settlement-stage-aftermath')).toBeVisible()
}

async function main() {
  await mkdir(outputDir, { recursive: true })
  const shouldLaunchServer = shouldStartDevServer && !(await isServerReachable(baseURL))
  const server = shouldLaunchServer ? startDevServer() : null
  const stopServer = () => {
    if (server && !server.killed) {
      server.kill('SIGTERM')
    }
  }

  try {
    await waitForServer(baseURL)
    const browser = await chromium.launch()
    try {
      await captureScenario({
        browser,
        label: '01-shop-mobile-390x844',
        hash: '/#/game/shop',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="shop-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '02-quest-mobile-390x844',
        hash: '/#/game/quest',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="quest-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '03-region-map-mobile-390x844',
        hash: '/#/game/region-map',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="region-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '04-shop-mobile-360x780',
        hash: '/#/game/shop',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="shop-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '05-quest-mobile-360x780',
        hash: '/#/game/quest',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="quest-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '06-region-map-mobile-360x780',
        hash: '/#/game/region-map',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="region-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '07-shop-mobile-430x932',
        hash: '/#/game/shop',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="shop-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '08-quest-mobile-430x932',
        hash: '/#/game/quest',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="quest-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '09-region-map-mobile-430x932',
        hash: '/#/game/region-map',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="region-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '10-region-map-expedition-mobile-390x844',
        hash: '/#/game/region-map',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="region-expedition-stage"]',
        prepare: ensureManualExpedition
      })
      await captureScenario({
        browser,
        label: '11-region-map-aftermath-mobile-390x844',
        hash: '/#/game/region-map',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="journey-settlement-stage-aftermath"]',
        prepare: driveSettlementToAftermath
      })
      await captureScenario({
        browser,
        label: '12-mobile-map-menu-390x844',
        hash: '/#/game/shop',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="mobile-map-menu"]',
        prepare: async page => {
          await page.getByTestId('mobile-hub-button').click()
          await expect(page.getByTestId('mobile-map-menu')).toBeVisible()
          await expect(page.getByTestId('mobile-map-menu-primary-entry')).toBeVisible()
        }
      })
      await captureScenario({
        browser,
        label: '13-wallet-mobile-390x844',
        hash: '/#/game/wallet',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="wallet-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '14-guild-mobile-390x844',
        hash: '/#/game/guild',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="guild-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '15-fishpond-mobile-390x844',
        hash: '/#/game/fishpond',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="fishpond-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '16-wallet-mobile-360x780',
        hash: '/#/game/wallet',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="wallet-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '17-guild-mobile-360x780',
        hash: '/#/game/guild',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="guild-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '18-fishpond-mobile-360x780',
        hash: '/#/game/fishpond',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="fishpond-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '19-wallet-mobile-430x932',
        hash: '/#/game/wallet',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="wallet-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '20-guild-mobile-430x932',
        hash: '/#/game/guild',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="guild-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '21-fishpond-mobile-430x932',
        hash: '/#/game/fishpond',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="fishpond-primary-action-card"]'
      })
    } finally {
      await browser.close()
    }

    const summaryPath = path.resolve(outputDir, 'summary.json')
    const summary = {
      generatedAt: new Date().toISOString(),
      screenshots,
      pageChecks,
      consoleErrors: [...new Set(consoleErrors)],
      pageErrors: [...new Set(pageErrors)],
      requestFailures: [...new Set(requestFailures)],
      notes: [
        '使用 region_map_showcase 样例档生成 390x844 / 360x780 / 430x932 三档移动端截图。',
        '首屏判定以当前页主操作卡或当前场景主面板进入视口为准。'
      ]
    }
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8')
    console.log(`Saved mobile UI smoke summary to ${summaryPath}`)
  } finally {
    stopServer()
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
