/* global process, console, URL, document, HTMLElement, KeyboardEvent */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'
import { findAvailablePort, isPlaywrightEnvironmentError, stopWindowsViteProcessesForPort, waitForTcpServer } from './port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_KEYBOARD_SHORTCUT_SMOKE_PORT || 4193)
const configuredBaseURL = process.env.TAOYUAN_BASE_URL?.trim() || ''
const port = configuredBaseURL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = configuredBaseURL || `http://${host}:${port}`
const shouldStartDevServer = process.env.TAOYUAN_SKIP_DEV_SERVER !== '1' && !configuredBaseURL
const navigationTimeoutMs = 90_000

let devServer = null
let browser = null

const launchChromiumBrowser = async () => {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('Executable doesn\'t exist') && !isPlaywrightEnvironmentError(error)) throw error
    console.warn('qa-keyboard-shortcut-browser-smoke: bundled Chromium unavailable, falling back to system Chrome')
    return await chromium.launch({ channel: 'chrome', headless: true })
  }
}

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

const createPage = async () => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  })
  await context.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, user: null })
    })
  })
  await context.route('**/api/public-config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    })
  })
  await context.route('**/api/taoyuan/ai/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    })
  })
  await context.route('**/api/taoyuan/item-icon-preferences', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ preferences: {} })
    })
  })
  await context.route('**/api/taoyuan/announcements/active**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ announcements: [] })
    })
  })
  await context.route('**/api/taoyuan/logs/gameplay/batch', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    })
  })
  const page = await context.newPage()
  page.setDefaultNavigationTimeout(navigationTimeoutMs)
  return { context, page }
}

const createLocalSave = async page => {
  await page.goto(`${baseURL}/#/`, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs })
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
    playerStore.setIdentity('快捷键测试', 'male')
    farmStore.resetFarm(6)
    inventoryStore.addItem('seed_cabbage', 10)
    questStore.initMainQuest()
    return await saveStore.saveToSlot(0)
  })
  expect(saved).toBe(true)
}

const openGameRoute = async (page, routePath) => {
  await page.goto(`${baseURL}/#/game/${routePath}`, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs })
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 20_000 })
}

const currentHash = page => new URL(page.url()).hash

const expectGameHash = async (page, routePath) => {
  await expect.poll(async () => currentHash(page)).toBe(`#/game/${routePath}`)
}

const pressShortcut = async (page, code, key) => {
  await page.evaluate(({ nextCode, nextKey }) => {
    const active = document.activeElement
    const target = active instanceof HTMLElement && active !== document.body
      ? active
      : document.body
    for (const type of ['keydown', 'keyup']) {
      target.dispatchEvent(new KeyboardEvent(type, {
        code: nextCode,
        key: nextKey,
        bubbles: true,
        cancelable: true
      }))
    }
  }, { nextCode: code, nextKey: key })
}

const holdPhysicalKey = async (page, key, durationMs = 360) => {
  await page.keyboard.down(key)
  await page.waitForTimeout(durationMs)
  await page.keyboard.up(key)
}

const setShortcutsEnabled = async (page, enabled) => {
  await page.evaluate(async nextEnabled => {
    const { useSettingsStore } = await import('/src/stores/useSettingsStore.ts')
    useSettingsStore().keyboardShortcutsEnabled = nextEnabled
  }, enabled)
}

const rebindInventoryShortcut = async (page, code, key) => {
  await page.evaluate(async ({ nextCode, nextKey }) => {
    const { useSettingsStore } = await import('/src/stores/useSettingsStore.ts')
    useSettingsStore().setKeyboardShortcutBinding('navInventory', {
      code: nextCode,
      key: nextKey,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false
    })
  }, { nextCode: code, nextKey: key })
}

const resetShortcutBindings = async page => {
  await page.evaluate(async () => {
    const { useSettingsStore } = await import('/src/stores/useSettingsStore.ts')
    const settingsStore = useSettingsStore()
    settingsStore.keyboardShortcutsEnabled = true
    settingsStore.resetKeyboardShortcutBindings()
  })
}

const seedMiningCombat = async (page, options = {}) => {
  await page.evaluate(async ({ boss = false, withItem = false, withPreset = false }) => {
    const [
      { useMiningStore },
      { useInventoryStore },
      { usePlayerStore },
      { MONSTERS, BOSS_MONSTERS }
    ] = await Promise.all([
      import('/src/stores/useMiningStore.ts'),
      import('/src/stores/useInventoryStore.ts'),
      import('/src/stores/usePlayerStore.ts'),
      import('/src/data/mine.ts')
    ])
    const miningStore = useMiningStore()
    const inventoryStore = useInventoryStore()
    const playerStore = usePlayerStore()
    playerStore.stamina = Math.max(playerStore.stamina ?? 0, 120)
    playerStore.restoreHealth(999)
    if (!miningStore.isExploring) miningStore.enterMine(1)
    miningStore.isExploring = true
    miningStore.currentFloor = boss ? 20 : 1
    miningStore.inCombat = false
    miningStore.combatMonster = null
    miningStore.combatMonsterHp = 0
    miningStore.combatRound = 0
    miningStore.combatLog = []
    miningStore.combatIsBoss = false

    const baseMonster = boss ? BOSS_MONSTERS[20] : MONSTERS.mud_worm
    const monster = {
      ...baseMonster,
      id: boss ? 'qa_keyboard_boss' : 'qa_keyboard_worm',
      name: boss ? '快捷键Boss' : '快捷键沙包',
      hp: 100000,
      attack: 1,
      defense: 999,
      expReward: 1,
      drops: []
    }
    const tiles = Array.from({ length: 36 }, (_, index) => ({
      index,
      type: 'empty',
      state: index === 0 ? 'revealed' : 'hidden'
    }))
    tiles[0] = {
      index: 0,
      type: boss ? 'boss' : 'monster',
      state: 'revealed',
      data: { monster, isBoss: boss }
    }
    miningStore.floorGrid.splice(0, miningStore.floorGrid.length, ...tiles)
    const result = miningStore.engageRevealedMonster(0)
    if (!result.startsCombat || !miningStore.inCombat) {
      throw new Error(`Unable to seed mining combat: ${result.message}`)
    }

    if (withItem) inventoryStore.addItem('combat_tonic', 1)
    if (withPreset && inventoryStore.equipmentPresets.length === 0) {
      inventoryStore.createEquipmentPreset('快捷方案')
    }
  }, options)
  await expect(page.getByTestId('mining-combat-dialog')).toBeVisible({ timeout: 10_000 })
}

const readCombatState = async page => {
  return await page.evaluate(async () => {
    const [{ useMiningStore }, { useGameStore }] = await Promise.all([
      import('/src/stores/useMiningStore.ts'),
      import('/src/stores/useGameStore.ts')
    ])
    const miningStore = useMiningStore()
    const gameStore = useGameStore()
    return {
      inCombat: miningStore.inCombat,
      isBoss: miningStore.combatIsBoss,
      round: miningStore.combatRound,
      logLength: miningStore.combatLog.length,
      hour: gameStore.hour
    }
  })
}

const roundHourToMinute = hour => Math.round(hour * 60)

const seedOpenWorldMovement = async page => {
  await page.evaluate(async () => {
    const [{ useRegionMapStore }, { usePlayerStore }, { useGameStore }] = await Promise.all([
      import('/src/stores/useRegionMapStore.ts'),
      import('/src/stores/usePlayerStore.ts'),
      import('/src/stores/useGameStore.ts')
    ])
    const regionMapStore = useRegionMapStore()
    const playerStore = usePlayerStore()
    const gameStore = useGameStore()
    regionMapStore.clearExpedition()
    playerStore.stamina = Math.max(playerStore.stamina ?? 0, 120)
    gameStore.hour = 9
    const dayTag = `${gameStore.year}-${gameStore.season}-${gameStore.day}`
    const regionId = 'taoyuan_outskirts'
    regionMapStore.setActiveOpenWorldRegion(regionId, dayTag)
    const def = regionMapStore.openWorldDefs.find(entry => entry.id === regionId)
    const state = regionMapStore.openWorldState.regionStates[regionId]
    if (!def || !state) throw new Error('Unable to seed open-world region')
    const start = def.tiles.find(tile => tile.id === def.startTileId)
    const rightTiles = start
      ? [
        def.tiles.find(tile => tile.x === start.x + 1 && tile.y === start.y),
        def.tiles.find(tile => tile.x === start.x + 2 && tile.y === start.y),
        def.tiles.find(tile => tile.x === start.x + 3 && tile.y === start.y)
      ].filter(Boolean)
      : []
    if (!start || rightTiles.length < 3) throw new Error('Unable to find open-world movement tiles for hold-repeat test')
    state.playerTileId = start.id
    state.selectedTileId = start.id
    state.discoveredTileIds = [...new Set([start.id, ...rightTiles.map(tile => tile.id)])]
    state.tileStates[start.id] = {
      ...(state.tileStates[start.id] ?? {}),
      tileId: start.id,
      discovered: true,
      status: 'fresh',
      landmarkStage: state.tileStates[start.id]?.landmarkStage ?? 'unknown',
      actionCount: 0,
      lastActionDayTag: '',
      lastRefreshDayTag: ''
    }
    for (const tile of rightTiles) {
      state.tileStates[tile.id] = {
        ...(state.tileStates[tile.id] ?? {}),
        tileId: tile.id,
        discovered: true,
        status: 'fresh',
        landmarkStage: state.tileStates[tile.id]?.landmarkStage ?? 'unknown',
        actionCount: 0,
        lastActionDayTag: '',
        lastRefreshDayTag: ''
      }
    }
  })
}

const readOpenWorldPlayerTileId = async page => {
  return await page.evaluate(async () => {
    const { useRegionMapStore } = await import('/src/stores/useRegionMapStore.ts')
    const regionMapStore = useRegionMapStore()
    return regionMapStore.openWorldState.regionStates[regionMapStore.openWorldState.activeRegionId]?.playerTileId ?? ''
  })
}

const verifyNavigationShortcuts = async page => {
  await openGameRoute(page, 'farm')
  await resetShortcutBindings(page)
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/stores/useGameStore.ts')
    useGameStore().hour = 9
  })
  await pressShortcut(page, 'KeyI', 'i')
  await expectGameHash(page, 'inventory')
  await pressShortcut(page, 'KeyJ', 'j')
  await expectGameHash(page, 'quest')
  await pressShortcut(page, 'KeyM', 'm')
  await expectGameHash(page, 'region-map')
  await pressShortcut(page, 'KeyK', 'k')
  await expectGameHash(page, 'skills')
  await pressShortcut(page, 'KeyN', 'n')
  await expectGameHash(page, 'animal')
  await pressShortcut(page, 'KeyH', 'h')
  await expectGameHash(page, 'home')
  await pressShortcut(page, 'KeyB', 'b')
  await expectGameHash(page, 'breeding')
  await pressShortcut(page, 'KeyR', 'r')
  await expectGameHash(page, 'shop')
  await pressShortcut(page, 'KeyT', 't')
  await expectGameHash(page, 'workshop')
  await pressShortcut(page, 'KeyU', 'u')
  await expectGameHash(page, 'upgrade')
  await pressShortcut(page, 'KeyY', 'y')
  await expectGameHash(page, 'fishpond')
}

const verifyGlobalGuardsAndRebinding = async page => {
  await openGameRoute(page, 'farm')
  await setShortcutsEnabled(page, false)
  await pressShortcut(page, 'KeyI', 'i')
  await page.waitForTimeout(250)
  await expectGameHash(page, 'farm')

  await setShortcutsEnabled(page, true)
  await page.evaluate(() => {
    const input = document.createElement('input')
    input.setAttribute('data-testid', 'keyboard-shortcut-focus-input')
    document.body.appendChild(input)
    input.focus()
  })
  await pressShortcut(page, 'KeyJ', 'j')
  await page.waitForTimeout(250)
  await expectGameHash(page, 'farm')
  await page.evaluate(() => {
    document.querySelector('[data-testid="keyboard-shortcut-focus-input"]')?.remove()
    document.body.focus()
  })

  await rebindInventoryShortcut(page, 'KeyZ', 'Z')
  await pressShortcut(page, 'KeyI', 'i')
  await page.waitForTimeout(250)
  await expectGameHash(page, 'farm')
  await pressShortcut(page, 'KeyZ', 'z')
  await expectGameHash(page, 'inventory')
  await resetShortcutBindings(page)
}

const verifyMiningCombatShortcuts = async page => {
  await openGameRoute(page, 'mining')
  await resetShortcutBindings(page)

  await seedMiningCombat(page)
  let state = await readCombatState(page)
  await pressShortcut(page, 'Digit2', '2')
  await expect.poll(async () => (await readCombatState(page)).round).toBe(state.round + 1)
  await page.waitForTimeout(460)

  await seedMiningCombat(page)
  state = await readCombatState(page)
  await pressShortcut(page, 'Digit1', '1')
  await pressShortcut(page, 'Digit1', '1')
  await expect.poll(async () => (await readCombatState(page)).round).toBe(state.round + 1)
  await page.waitForTimeout(460)

  await seedMiningCombat(page)
  await pressShortcut(page, 'Digit3', '3')
  await expect.poll(async () => (await readCombatState(page)).inCombat).toBe(false)
  await page.waitForTimeout(460)

  await seedMiningCombat(page, { boss: true })
  state = await readCombatState(page)
  await pressShortcut(page, 'Digit3', '3')
  await page.waitForTimeout(100)
  const bossState = await readCombatState(page)
  expect(bossState.inCombat).toBe(true)
  expect(bossState.isBoss).toBe(true)
  expect(bossState.round).toBe(state.round)
  expect(roundHourToMinute(bossState.hour)).toBe(roundHourToMinute(state.hour))

  await seedMiningCombat(page, { withItem: true })
  await pressShortcut(page, 'Digit4', '4')
  await expect(page.getByTestId('mining-combat-items-modal')).toBeVisible({ timeout: 5_000 })
  await page.getByTestId('mining-combat-items-modal').click({ position: { x: 8, y: 8 } })
  await expect(page.getByTestId('mining-combat-items-modal')).toBeHidden({ timeout: 5_000 })

  await seedMiningCombat(page, { withPreset: true })
  await pressShortcut(page, 'Digit5', '5')
  await expect(page.getByTestId('mining-equipment-presets-modal')).toBeVisible({ timeout: 5_000 })
}

const verifyRegionMapMovementShortcuts = async page => {
  await openGameRoute(page, 'region-map')
  await expect(page.getByTestId('region-open-world-map')).toBeVisible({ timeout: 10_000 })
  await resetShortcutBindings(page)
  await seedOpenWorldMovement(page)
  await page.waitForTimeout(50)
  await page.getByTestId('region-open-world-viewport').click({ position: { x: 24, y: 24 } })
  const before = await readOpenWorldPlayerTileId(page)
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => await readOpenWorldPlayerTileId(page)).not.toBe(before)
  await seedOpenWorldMovement(page)
  await page.waitForTimeout(50)
  await page.getByTestId('region-open-world-viewport').click({ position: { x: 24, y: 24 } })
  const beforeHold = await readOpenWorldPlayerTileId(page)
  await holdPhysicalKey(page, 'ArrowRight', 360)
  const afterHold = await readOpenWorldPlayerTileId(page)
  expect(afterHold).not.toBe(beforeHold)
  expect(afterHold).not.toBe(before)
}

const runSmokeScenario = async verifyPage => {
  const { context, page } = await createPage()
  try {
    await createLocalSave(page)
    await verifyPage(page)
  } finally {
    await context.close()
  }
}

try {
  await startDevServer()
  browser = await launchChromiumBrowser()
  await runSmokeScenario(async page => {
    await verifyNavigationShortcuts(page)
    await verifyGlobalGuardsAndRebinding(page)
  })
  await runSmokeScenario(verifyMiningCombatShortcuts)
  await runSmokeScenario(verifyRegionMapMovementShortcuts)

  console.log('qa-keyboard-shortcut-browser-smoke: ok')
} catch (error) {
  if (isPlaywrightEnvironmentError(error)) {
    console.error('qa-keyboard-shortcut-browser-smoke: Playwright browser launch failed in this environment.')
  }
  throw error
} finally {
  if (browser) await browser.close()
  stopDevServer()
}
