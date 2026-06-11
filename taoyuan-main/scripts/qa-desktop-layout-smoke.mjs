/* global process, document, window */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'
import { findAvailablePort, isPlaywrightEnvironmentError, stopWindowsViteProcessesForPort, waitForTcpServer } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_DESKTOP_LAYOUT_PORT || 4187)
const configuredBaseURL = process.env.TAOYUAN_BASE_URL?.trim() || ''
const port = configuredBaseURL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = configuredBaseURL || `http://${host}:${port}`
const shouldStartDevServer = process.env.TAOYUAN_SKIP_DEV_SERVER !== '1' && !configuredBaseURL
const sampleId = 'endgame_showcase'
const navigationTimeoutMs = 90_000

const viewports = [
  { label: '360', width: 360, height: 780 },
  { label: '768', width: 768, height: 900 },
  { label: '1280', width: 1280, height: 900 },
  { label: '1920', width: 1920, height: 1080 },
  { label: '2560', width: 2560, height: 1440 },
]

const scenarios = [
  { label: 'char-info', hash: '/#/game/charinfo', selector: '[data-testid="char-info-layout"]' },
  { label: 'achievement', hash: '/#/game/achievement', selector: '[data-testid="achievement-layout"]' },
  { label: 'animal', hash: '/#/game/animal', selector: '[data-testid="animal-layout"]' },
  { label: 'breeding', hash: '/#/game/breeding', selector: '[data-testid="breeding-layout"]' },
  { label: 'cooking', hash: '/#/game/cooking', selector: '[data-testid="cooking-layout"]' },
  { label: 'skills', hash: '/#/game/skills', selector: '[data-testid="skill-layout-grid"]' },
  { label: 'tool-upgrade', hash: '/#/game/upgrade', selector: '[data-testid="tool-upgrade-list"]' },
  {
    label: 'inventory-equipment',
    hash: '/#/game/inventory',
    selector: '[data-testid="inventory-equipment-layout"]',
    prepare: async page => {
      await page.getByRole('button', { name: /装备/ }).click()
    },
  },
]

let devServer = null
let browser = null

const startDevServer = async () => {
  if (!shouldStartDevServer) return
  stopWindowsViteProcessesForPort(port)
  devServer = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'npm',
    process.platform === 'win32'
      ? ['/c', 'npm', 'run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort']
      : ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VITE_TAOYUAN_QA: '1',
      },
    }
  )
  await waitForTcpServer(baseURL, 120_000)
}

const stopDevServer = () => {
  if (devServer) {
    devServer.kill()
    devServer = null
  }
  if (shouldStartDevServer) {
    stopWindowsViteProcessesForPort(port)
  }
}

const createPage = async viewport => {
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
  return { context, page }
}

const loadBuiltInSample = async page => {
  await page.goto(`${baseURL}/#/`, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs })
  await page.waitForFunction(() => typeof window.__TAOYUAN_SAMPLE_SAVES__?.load === 'function', null, { timeout: 15_000 })
  const loaded = await page.evaluate(async id => {
    return await window.__TAOYUAN_SAMPLE_SAVES__.load(id)
  }, sampleId)
  if (!loaded) throw new Error(`Unable to load sample save ${sampleId}`)
}

const openScenario = async (page, scenario) => {
  await page.goto(`${baseURL}${scenario.hash}`, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs })
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 20_000 })
  if (scenario.prepare) await scenario.prepare(page)
  await expect(page.locator(scenario.selector)).toBeVisible({ timeout: 30_000 })
}

const setDesktopLayoutMode = async (page, mode) => {
  await page.evaluate(async nextMode => {
    const { useSettingsStore } = await import('/src/stores/useSettingsStore.ts')
    useSettingsStore().setDesktopLayoutMode(nextMode)
  }, mode)
  await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-desktop-layout-mode'))).toBe(mode)
}

const expectedAdaptiveColumns = width => {
  if (width < 1280) return 1
  if (width < 1920) return 2
  return 3
}

const readLayoutMetrics = async (page, selector) => {
  return await page.evaluate(targetSelector => {
    const target = document.querySelector(targetSelector)
    const style = target ? window.getComputedStyle(target) : null
    const rect = target?.getBoundingClientRect()
    const columns = style?.gridTemplateColumns && style.gridTemplateColumns !== 'none'
      ? style.gridTemplateColumns.split(/\s+/).filter(Boolean).length
      : 0
    return {
      attr: document.documentElement.getAttribute('data-desktop-layout-mode'),
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4,
      columns,
      visible: !!target && !!rect && rect.width > 0 && rect.height > 0 && style?.display !== 'none' && style?.visibility !== 'hidden',
      width: rect ? Math.round(rect.width) : 0,
    }
  }, selector)
}

const assertLayout = async ({ page, viewport, scenario, mode }) => {
  const metrics = await readLayoutMetrics(page, scenario.selector)
  if (!metrics.visible) throw new Error(`${scenario.label}-${viewport.label}-${mode}: layout target is not visible`)
  if (metrics.horizontalOverflow) {
    throw new Error(`${scenario.label}-${viewport.label}-${mode}: horizontal overflow, doc=${metrics.docScrollWidth}, body=${metrics.bodyScrollWidth}`)
  }
  const expectedColumns = mode === 'classic' ? 1 : expectedAdaptiveColumns(viewport.width)
  if (metrics.columns !== expectedColumns) {
    throw new Error(`${scenario.label}-${viewport.label}-${mode}: expected ${expectedColumns} columns, got ${metrics.columns}`)
  }
  if (metrics.attr !== mode) {
    throw new Error(`${scenario.label}-${viewport.label}-${mode}: html attr is ${metrics.attr}`)
  }
}

const verifyFullscreenAdaptiveLayout = async (page, viewport, scenario) => {
  if (viewport.width < 1280) return
  await openScenario(page, scenario)
  await setDesktopLayoutMode(page, 'adaptive')
  const canFullscreen = await page.evaluate(() => document.fullscreenEnabled)
  if (!canFullscreen) {
    console.warn('qa-desktop-layout-smoke: fullscreen API unavailable, skipping fullscreen adaptive check')
    return
  }
  await page.getByTestId('fullscreen-button').click()
  await expect.poll(async () => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
  await assertLayout({ page, viewport, scenario, mode: 'adaptive' })
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
  })
  await expect.poll(async () => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
}

const verifySettingsUiToggle = async page => {
  await page.getByTestId('mobile-hub-button').click()
  await page.getByTestId('mobile-map-menu-open-settings').click()
  await expect(page.getByTestId('settings-dialog')).toBeVisible({ timeout: 10_000 })
  await page.getByTestId('settings-tab-display').click()
  await expect(page.getByTestId('settings-desktop-layout-adaptive')).toBeVisible()
  await page.getByTestId('settings-desktop-layout-classic').click()
  await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-desktop-layout-mode'))).toBe('classic')
  await page.getByTestId('settings-desktop-layout-adaptive').click()
  await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-desktop-layout-mode'))).toBe('adaptive')
  await page.getByTestId('settings-dialog-close').click()
  await expect(page.getByTestId('settings-dialog')).toBeHidden({ timeout: 10_000 })
}

try {
  await startDevServer()
  browser = await chromium.launch({ headless: true })

  for (const viewport of viewports) {
    const { context, page } = await createPage(viewport)
    try {
      await loadBuiltInSample(page)
      await openScenario(page, scenarios[0])
      await verifySettingsUiToggle(page)

      for (const scenario of scenarios) {
        await openScenario(page, scenario)
        await setDesktopLayoutMode(page, 'adaptive')
        await assertLayout({ page, viewport, scenario, mode: 'adaptive' })
        await setDesktopLayoutMode(page, 'classic')
        await assertLayout({ page, viewport, scenario, mode: 'classic' })
        await setDesktopLayoutMode(page, 'adaptive')
      }

      if (viewport.width === 1920) {
        await verifyFullscreenAdaptiveLayout(page, viewport, scenarios[0])
      }
    } finally {
      await context.close()
    }
  }

  console.log('qa-desktop-layout-smoke: ok')
} catch (error) {
  if (isPlaywrightEnvironmentError(error)) {
    console.error('qa-desktop-layout-smoke: Playwright browser launch failed in this environment.')
  }
  throw error
} finally {
  if (browser) await browser.close()
  stopDevServer()
}
