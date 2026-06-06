/* global process, setTimeout, window, document, HTMLElement */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import {
  findAvailablePort,
  isPlaywrightEnvironmentError,
  stopWindowsViteProcessesForPort,
  waitForTcpServer
} from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(repoRoot, '..')
const outputDir = path.resolve(workspaceRoot, 'docs', 'ui-v13-2026-06-06')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_V13_PORT || 4185)
const port = process.env.TAOYUAN_BASE_URL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = process.env.TAOYUAN_BASE_URL?.trim() || `http://${host}:${port}`
const shouldStartDevServer = process.env.TAOYUAN_SKIP_DEV_SERVER !== '1' && !process.env.TAOYUAN_BASE_URL
const sampleId = 'endgame_showcase'

const viewports = [
  { label: '360', width: 360, height: 780 },
  { label: '768', width: 768, height: 900 },
  { label: '1280', width: 1280, height: 900 },
]

const screenshots = []
const results = []
const consoleErrors = []
const pageErrors = []
const requestFailures = []

let devServer = null

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const startDevServer = async () => {
  if (!shouldStartDevServer) return
  const npmCommand = process.platform === 'win32'
    ? process.execPath
    : 'npm'
  const npmArgs = process.platform === 'win32'
    ? [path.resolve(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
    : []
  devServer = spawn(npmCommand, [...npmArgs, 'run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })
  await waitForTcpServer(baseURL, 120_000)
  await wait(1000)
}

const stopDevServer = () => {
  if (!devServer) return
  devServer.kill('SIGTERM')
  devServer = null
  stopWindowsViteProcessesForPort(port)
}

const createPage = async (browser, viewport) => {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
  })
  await context.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, user: null }),
    })
  })
  await context.route('**/api/public-config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false }),
    })
  })
  await context.route('**/api/taoyuan/ai/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false }),
    })
  })
  await context.route('**/api/taoyuan/item-icon-preferences', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ preferences: {} }),
    })
  })
  await context.route('**/api/taoyuan/logs/gameplay/batch', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })
  const page = await context.newPage()
  page.on('console', message => {
    const text = message.text()
    if (message.type() === 'error' && !/Failed to load resource: the server responded with a status of 401/i.test(text)) {
      const location = message.location()
      const source = location.url ? ` @ ${location.url}` : ''
      consoleErrors.push(`${viewport.label}: ${text}${source}`)
    }
  })
  page.on('pageerror', error => {
    pageErrors.push(`${viewport.label}: ${error.message}`)
  })
  page.on('requestfailed', request => {
    const url = request.url()
    if (url.includes('/api/') && !url.includes('/api/public-config') && !url.includes('/api/me')) {
      requestFailures.push(`${viewport.label}: ${request.method()} ${url} :: ${request.failure()?.errorText ?? 'unknown failure'}`)
    }
  })
  return { context, page }
}

const openHome = async page => {
  await page.goto(baseURL, { waitUntil: 'commit', timeout: 30_000 })
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible({ timeout: 30_000 })
}

const loadSample = async page => {
  await page.waitForFunction(() => typeof window.__TAOYUAN_SAMPLE_SAVES__?.load === 'function', null, { timeout: 10_000 })
  const loaded = await page.evaluate(async id => {
    return await window.__TAOYUAN_SAMPLE_SAVES__.load(id)
  }, sampleId)
  if (!loaded) throw new Error(`Unable to load sample ${sampleId}`)
}

const openSampleRoute = async (page, hash) => {
  await openHome(page)
  await loadSample(page)
  await page.goto(`${baseURL}${hash}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 15_000 })
}

const seedInventoryTempItems = async page => {
  await page.evaluate(async () => {
    const { useInventoryStore } = await import('/src/stores/useInventoryStore.ts')
    const inventory = useInventoryStore()
    inventory.tempItems = [
      { itemId: 'stone', quantity: 37, quality: 'normal' },
      { itemId: 'coal', quantity: 9, quality: 'normal' },
    ]
  })
}

const seedMiningCombat = async page => {
  await page.evaluate(async () => {
    const { useMiningStore } = await import('/src/stores/useMiningStore.ts')
    const { MONSTERS } = await import('/src/data/mine.ts')
    const mining = useMiningStore()
    const monster = MONSTERS.slime || Object.values(MONSTERS)[0]
    if (!monster) throw new Error('No mining monster definition available')
    mining.enterMine()
    mining.floorGrid[0] = {
      index: 0,
      type: 'monster',
      state: 'revealed',
      data: { monster: { ...monster } },
    }
    const result = mining.engageRevealedMonster(0)
    if (!result.startsCombat) throw new Error(`Unable to seed mining combat: ${result.message}`)
  })
}

const openWanwuShop = async page => {
  await page.evaluate(async () => {
    const { useShopStore } = await import('/src/stores/useShopStore.ts')
    const shop = useShopStore()
    shop.currentShopId = 'wanwupu'
  })
  await page.waitForTimeout(250)
}

const clearTransientOverlays = async page => {
  await page.evaluate(() => {
    document
      .querySelectorAll('.qmsg, .qmsg-item-wrapper, .qmsg-content, [class*="qmsg-"]')
      .forEach(node => node.remove())
  })
}

const captureAndAssert = async ({ page, label, viewport, targetSelector, targetTextNeedles = [] }) => {
  await clearTransientOverlays(page)
  const target = targetTextNeedles.length > 0
    ? page.locator(targetSelector).filter({ hasText: new RegExp(targetTextNeedles.join('|')) }).first()
    : page.locator(targetSelector).first()
  await expect(target).toBeVisible({ timeout: 10_000 })
  if (targetTextNeedles.length > 0) {
    for (const text of targetTextNeedles) {
      await expect(target).toContainText(text, { timeout: 10_000 })
    }
  }
  await page.waitForTimeout(250)
  const screenshotPath = path.resolve(outputDir, `${label}-${viewport.label}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: false })
  screenshots.push(screenshotPath)

  const metrics = await page.evaluate(({ selector, needles }) => {
    const candidates = Array.from(document.querySelectorAll(selector))
    const target = needles.length > 0
      ? candidates.find(element => needles.every(needle => (element.textContent || '').includes(needle)))
      : candidates[0]
    const rect = target?.getBoundingClientRect()
    const style = target ? window.getComputedStyle(target) : null
    return {
      hash: window.location.hash,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4,
      targetVisible: !!target && rect !== undefined && rect.width > 0 && rect.height > 0 && style?.display !== 'none' && style?.visibility !== 'hidden',
      targetBox: rect
        ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        }
        : null,
      targetOutOfViewport: rect
        ? rect.left < -2 || rect.top < -2 || rect.right > window.innerWidth + 2 || rect.bottom > window.innerHeight + 2
        : true,
      textPreview: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 240),
    }
  }, { selector: targetSelector, needles: targetTextNeedles })

  results.push({ label, viewport: viewport.label, screenshotPath, ...metrics })
  if (metrics.horizontalOverflow) throw new Error(`${label}-${viewport.label} has horizontal overflow`)
  if (!metrics.targetVisible) throw new Error(`${label}-${viewport.label} target is not visible`)
  if (metrics.targetOutOfViewport) throw new Error(`${label}-${viewport.label} target is outside viewport`)
}

const scenarios = [
  {
    label: 'inventory-temp-detail',
    hash: '/#/game/inventory',
    targetSelector: '.game-modal-overlay .game-panel',
    targetTextNeedles: ['石材', '放入背包', '丢弃'],
    prepare: async page => {
      await seedInventoryTempItems(page)
      await page.getByRole('button', { name: /临时/ }).click()
      await page.locator('.item-card').first().click()
    },
  },
  {
    label: 'quest-detail',
    hash: '/#/game/quest',
    targetSelector: '.game-modal-overlay .game-panel',
    targetTextNeedles: ['奖励', '任务'],
    prepare: async page => {
      const questEntry = page.locator('.cursor-pointer').filter({ hasText: /第\d+章|委托|交付|需要/ }).first()
      await expect(questEntry).toBeVisible({ timeout: 10_000 })
      await questEntry.click()
    },
  },
  {
    label: 'shop-buy-modal',
    hash: '/#/game/shop',
    targetSelector: '.game-modal-overlay .game-panel',
    targetTextNeedles: ['价格', '购买'],
    prepare: async page => {
      await openWanwuShop(page)
      const clicked = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('.cursor-pointer'))
        const target = candidates.find(element => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return rect.width > 0
            && rect.height > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && /文/.test(element.textContent || '')
        })
        if (!target) return false
        if (!(target instanceof HTMLElement)) return false
        target.click()
        return true
      })
      if (!clicked) throw new Error('No visible shop buy entry found')
    },
  },
  {
    label: 'mining-combat-dialog',
    hash: '/#/game/mining',
    targetSelector: '.game-modal-overlay .game-panel',
    targetTextNeedles: ['遭遇怪物', '攻击', '防御', '逃跑'],
    prepare: async page => {
      await seedMiningCombat(page)
      await expect(page.locator('.game-modal-overlay.z-60 .game-panel')).toContainText(/遭遇怪物|攻击|防御|逃跑/, { timeout: 10_000 })
    },
  },
]

await mkdir(outputDir, { recursive: true })
await startDevServer()

let browser = null
try {
  browser = await chromium.launch({ headless: true })
  for (const viewport of viewports) {
    for (const scenario of scenarios) {
      const { context, page } = await createPage(browser, viewport)
      try {
        await openSampleRoute(page, scenario.hash)
        await scenario.prepare(page)
        await captureAndAssert({
          page,
          label: scenario.label,
          viewport,
          targetSelector: scenario.targetSelector,
          targetTextNeedles: scenario.targetTextNeedles,
        })
      } finally {
        await context.close()
      }
    }
  }
} catch (error) {
  if (isPlaywrightEnvironmentError(error)) {
    throw new Error(`Playwright environment error: ${error.message}`)
  }
  throw error
} finally {
  if (browser) await browser.close()
  stopDevServer()
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseURL,
  sampleId,
  viewports,
  screenshots,
  results,
  consoleErrors,
  pageErrors,
  requestFailures,
}

await writeFile(path.resolve(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join(' | ')}`)
