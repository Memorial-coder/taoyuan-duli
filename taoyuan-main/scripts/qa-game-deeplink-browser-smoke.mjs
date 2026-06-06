/* global process, console */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'
import { findAvailablePort, isPlaywrightEnvironmentError, stopWindowsViteProcessesForPort, waitForTcpServer } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_DEEPLINK_SMOKE_PORT || 4181)
const configuredBaseURL = process.env.TAOYUAN_BASE_URL?.trim() || ''
const port = configuredBaseURL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = configuredBaseURL || `http://${host}:${port}`
const shouldStartDevServer = process.env.TAOYUAN_SKIP_DEV_SERVER !== '1' && !configuredBaseURL

let devServer = null
let browser = null

const waitForTestIdOrDump = async (page, testId, label) => {
  try {
    await page.getByTestId(testId).waitFor({ timeout: 30_000 })
  } catch (error) {
    console.error(`[${label}] url: ${page.url()}`)
    console.error(`[${label}] body: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 500)}`)
    throw error
  }
}

const startDevServer = async () => {
  if (!shouldStartDevServer) return
  stopWindowsViteProcessesForPort(port)
  devServer = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'npm',
    process.platform === 'win32'
      ? ['/c', 'npm', 'run', 'dev', '--', '--host', host, '--port', String(port)]
      : ['run', 'dev', '--', '--host', host, '--port', String(port)],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VITE_TAOYUAN_QA: '1'
      }
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

const createLocalSave = async page => {
  await page.goto(`${baseURL}/#/`, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('main-menu').waitFor({ timeout: 30_000 })
  const saved = await page.evaluate(async () => {
    const [
      { useSaveStore },
      { useGameStore },
      { usePlayerStore },
      { useFarmStore },
      { useInventoryStore },
      { useQuestStore }
    ] = await Promise.all([
      import('/src/stores/useSaveStore.ts'),
      import('/src/stores/useGameStore.ts'),
      import('/src/stores/usePlayerStore.ts'),
      import('/src/stores/useFarmStore.ts'),
      import('/src/stores/useInventoryStore.ts'),
      import('/src/stores/useQuestStore.ts')
    ])
    const saveStore = useSaveStore()
    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const farmStore = useFarmStore()
    const inventoryStore = useInventoryStore()
    const questStore = useQuestStore()
    saveStore.setStorageMode('local')
    gameStore.startNewGame('standard')
    playerStore.setIdentity('深链', 'male')
    farmStore.resetFarm(6)
    inventoryStore.addItem('seed_cabbage', 10)
    questStore.initMainQuest()
    return await saveStore.saveToSlot(0)
  })
  expect(saved).toBe(true)
}

try {
  await startDevServer()
  browser = await chromium.launch({ headless: true })

  const emptyContext = await browser.newContext()
  const emptyPage = await emptyContext.newPage()
  await emptyPage.goto(`${baseURL}/#/game/farm`, { waitUntil: 'domcontentloaded' })
  await waitForTestIdOrDump(emptyPage, 'main-menu', 'empty-deeplink')
  expect(emptyPage.url()).toContain('redirect=')
  await emptyContext.close()

  const restoreContext = await browser.newContext()
  const restorePage = await restoreContext.newPage()
  await createLocalSave(restorePage)
  await restorePage.goto(`${baseURL}/#/game/farm`, { waitUntil: 'domcontentloaded' })
  await restorePage.reload({ waitUntil: 'domcontentloaded' })
  await waitForTestIdOrDump(restorePage, 'game-layout', 'restore-deeplink')
  expect(restorePage.url()).toContain('#/game/farm')
  await restoreContext.close()

  console.log('qa-game-deeplink-browser-smoke: ok')
} catch (error) {
  if (isPlaywrightEnvironmentError(error)) {
    console.error('qa-game-deeplink-browser-smoke: Playwright browser launch failed in this environment.')
  }
  throw error
} finally {
  if (browser) await browser.close()
  stopDevServer()
}
