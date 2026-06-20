/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const keyboardShortcutsModule = await import(pathToFileURL(path.join(srcRoot, 'data/keyboardShortcuts.ts')).href)

const {
  KEYBOARD_SHORTCUT_DEFINITIONS,
  KEYBOARD_SHORTCUT_SAVE_VERSION,
  createDefaultKeyboardShortcutBindings,
  formatKeyboardShortcutBinding,
  getKeyboardEventBinding,
  getKeyboardShortcutBindingKey,
  isReservedKeyboardShortcutBinding,
  normalizeKeyboardShortcutBinding,
  normalizeKeyboardShortcutBindings
} = keyboardShortcutsModule

const packageJson = JSON.parse(readSource('package.json'))
const keyboardShortcutsSource = readSource('src/data/keyboardShortcuts.ts')
const shortcutComposableSource = readSource('src/composables/useKeyboardShortcuts.ts')
const shortcutContextComposableSource = readSource('src/composables/useKeyboardShortcutContextActions.ts')
const settingsStoreSource = readSource('src/stores/useSettingsStore.ts')
const settingsDialogSource = readSource('src/components/game/SettingsDialog.vue')
const gameLayoutSource = readSource('src/views/GameLayout.vue')
const miningViewSource = readSource('src/views/game/MiningView.vue')
const regionMapViewSource = readSource('src/views/game/RegionMapView.vue')
const inventoryViewSource = readSource('src/views/game/InventoryView.vue')
const processingViewSource = readSource('src/views/game/ProcessingView.vue')
const breedingViewSource = readSource('src/views/game/BreedingView.vue')
const fishPondViewSource = readSource('src/views/game/FishPondView.vue')
const guildViewSource = readSource('src/views/game/GuildView.vue')
const hanhaiViewSource = readSource('src/views/game/HanhaiView.vue')
const achievementViewSource = readSource('src/views/game/AchievementView.vue')
const museumViewSource = readSource('src/views/game/MuseumView.vue')
const decorationViewSource = readSource('src/views/game/DecorationView.vue')
const shopViewSource = readSource('src/views/game/ShopView.vue')
const mailViewSource = readSource('src/views/game/MailView.vue')
const glossaryTabSource = readSource('src/components/game/GlossaryTab.vue')
const farmViewSource = readSource('src/views/game/FarmView.vue')
const cookingViewSource = readSource('src/views/game/CookingView.vue')
const skillViewSource = readSource('src/views/game/SkillView.vue')
const walletViewSource = readSource('src/views/game/WalletView.vue')
const quarryViewSource = readSource('src/views/game/QuarryView.vue')

const expectedDefaultBindings = {
  systemSettings: 'KeyO',
  systemRecordCenter: 'KeyL',
  systemSaveManager: 'F9',
  navFarm: 'KeyF',
  navInventory: 'KeyI',
  navQuest: 'KeyJ',
  navRegionMap: 'KeyM',
  navCharInfo: 'KeyC',
  navSkills: 'KeyK',
  navPotential: 'KeyP',
  navGoals: 'KeyG',
  navAnimal: 'KeyN',
  navHome: 'KeyH',
  navBreeding: 'KeyB',
  navShop: 'KeyR',
  navWorkshop: 'KeyT',
  navUpgrade: 'KeyU',
  navFishPond: 'KeyY',
  navQuarry: 'KeyQ',
  toolVoidChest: 'KeyV',
  uiPrevSection: 'BracketLeft',
  uiNextSection: 'BracketRight',
  uiConfirm: 'Enter',
  uiFocusSearch: 'Slash',
  uiPageUp: 'PageUp',
  uiPageDown: 'PageDown',
  miningAttack: 'Digit1',
  miningDefend: 'Digit2',
  miningFlee: 'Digit3',
  miningItems: 'Digit4',
  miningPresets: 'Digit5',
  miningDescend: 'KeyE',
  moveUp: 'ArrowUp',
  moveDown: 'ArrowDown',
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  systemSleepPrompt: 'F8',
  uiCancel: 'Escape'
}

const expectedUnboundDefaults = [
  'navCottage',
  'navDecoration',
  'navForage',
  'navFishing',
  'navMining',
  'navCooking',
  'navWallet',
  'navMail',
  'navAchievement',
  'navGlossary',
  'navMuseum',
  'navGuild',
  'navHanhai',
  'uiFocusPrimary',
  'uiQtyDecrease',
  'uiQtyIncrease'
]

assert.equal(KEYBOARD_SHORTCUT_SAVE_VERSION, 1, 'keyboard shortcut save payload should be versioned')
assert.equal(
  packageJson.scripts?.['qa:keyboard-shortcut-guards'],
  'node scripts/qa-keyboard-shortcut-guards.mjs',
  'package.json should register qa:keyboard-shortcut-guards'
)
assert.equal(
  packageJson.scripts?.['qa:keyboard-shortcut-browser-smoke'],
  'node scripts/qa-keyboard-shortcut-browser-smoke.mjs',
  'package.json should register qa:keyboard-shortcut-browser-smoke'
)

const definitionById = Object.fromEntries(KEYBOARD_SHORTCUT_DEFINITIONS.map(definition => [definition.id, definition]))
const expectedActionIds = [...Object.keys(expectedDefaultBindings), ...expectedUnboundDefaults].sort()
assert.deepEqual(
  Object.keys(definitionById).sort(),
  expectedActionIds,
  'shortcut action ids should match the approved plan'
)

for (const [actionId, code] of Object.entries(expectedDefaultBindings)) {
  assert.equal(definitionById[actionId]?.defaultBinding?.code, code, `${actionId} should keep its planned default key`)
}
for (const actionId of expectedUnboundDefaults) {
  assert.equal(definitionById[actionId]?.defaultBinding, null, `${actionId} should remain unbound by default`)
}

const defaultBindings = createDefaultKeyboardShortcutBindings()
const defaultBindingKeys = Object.values(defaultBindings).filter(Boolean).map(binding => getKeyboardShortcutBindingKey(binding))
assert.equal(new Set(defaultBindingKeys).size, defaultBindingKeys.length, 'default shortcut bindings should not conflict')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.miningAttack), '1', 'combat action-bar shortcuts should render compact number labels')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.moveUp), '↑', 'arrow shortcuts should render compact direction labels')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.moveDown), '↓', 'arrow shortcuts should render compact direction labels')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.moveLeft), '←', 'arrow shortcuts should render compact direction labels')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.moveRight), '→', 'arrow shortcuts should render compact direction labels')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.systemSaveManager), 'F9', 'function keys should render as their key names')
assert.equal(formatKeyboardShortcutBinding(null), '未绑定', 'cleared bindings should render as unbound')
assert.deepEqual(normalizeKeyboardShortcutBinding({ code: 'Digit1', key: '1' }), {
  code: 'Digit1',
  key: '1',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false
})
assert.equal(defaultBindings.navCottage, null, 'secondary navigation should be unbound by default')
assert.equal(normalizeKeyboardShortcutBindings({ navInventory: null }).navInventory, null, 'saved null bindings should remain cleared')
assert.equal(normalizeKeyboardShortcutBindings({ navInventory: { code: 'KeyU', key: 'u' } }).navInventory.key, 'U', 'saved bindings should normalize display keys')

assert.equal(isReservedKeyboardShortcutBinding({ code: 'F5', key: 'F5' }), true, 'F5 should stay reserved for browser refresh')
assert.equal(isReservedKeyboardShortcutBinding({ code: 'KeyR', key: 'R', ctrlKey: true }), true, 'Ctrl+R should stay reserved')
assert.equal(isReservedKeyboardShortcutBinding({ code: 'F4', key: 'F4', altKey: true }), true, 'Alt+F4 should stay reserved')
assert.equal(isReservedKeyboardShortcutBinding({ code: 'KeyI', key: 'I' }), false, 'plain planned navigation keys should be bindable')
assert.equal(getKeyboardEventBinding({
  isComposing: false,
  code: 'KeyI',
  key: 'i',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false
})?.key, 'I', 'keyboard events should normalize letter keys')

assert.match(keyboardShortcutsSource, /KEYBOARD_SHORTCUT_DEFINITIONS/, 'shortcut definitions should live in a shared data module')
assert.match(keyboardShortcutsSource, /KEYBOARD_SHORTCUT_CATEGORY_LABELS/, 'shortcut categories should have labels for settings UI')
assert.match(keyboardShortcutsSource, /ui: '.*?'/, 'ui shortcuts should have a settings category label')
assert.match(keyboardShortcutsSource, /movement: '.*?'/, 'movement shortcuts should have a settings category label')
assert.match(keyboardShortcutsSource, /uiInteraction: '.*?'/, 'uiInteraction shortcuts should have a settings category label')
assert.match(keyboardShortcutsSource, /RESERVED_PLAIN_CODES/, 'plain reserved keys should be blocked')
assert.match(keyboardShortcutsSource, /RESERVED_CTRL_CODES/, 'reserved Ctrl combinations should be blocked')

assert.match(shortcutComposableSource, /window\.addEventListener\('keydown', handleKeyboardShortcutKeydown, true\)/, 'shortcut dispatcher should listen in capture phase')
assert.match(shortcutComposableSource, /new Map<KeyboardShortcutActionId, Set<KeyboardShortcutAction>>/, 'shortcut dispatcher should support multiple context registrations per action id')
assert.match(shortcutComposableSource, /flatMap\(actionSet => \[\.\.\.actionSet\]\)/, 'shortcut dispatcher should evaluate all registered action instances')
assert.match(shortcutComposableSource, /shortcutCaptureActive/, 'shortcut dispatcher should suspend while rebinding')
assert.match(shortcutComposableSource, /isEditableShortcutTarget/, 'shortcut dispatcher should ignore inputs and editable targets')
assert.match(shortcutComposableSource, /event\.repeat/, 'shortcut dispatcher should ignore held-key repeats')
assert.match(shortcutComposableSource, /matchMedia\('\(min-width: 768px\) and \(pointer: fine\)'\)/, 'shortcut dispatcher should stay desktop-only')
assert.match(shortcutComposableSource, /sort\(\(left, right\) => \(right\.priority \?\? 0\) - \(left\.priority \?\? 0\)\)/, 'context shortcuts should be able to outrank global shortcuts')
assert.match(shortcutComposableSource, /shouldAllowUiCancelBinding/, 'dispatcher should allow Escape through as a special-case ui-cancel binding')
assert.match(shortcutContextComposableSource, /useKeyboardShortcutContextActions/, 'context shortcut helper should expose generic context actions')
assert.match(shortcutContextComposableSource, /useKeyboardShortcutTabActions/, 'context shortcut helper should expose tab cycling actions')
assert.match(shortcutContextComposableSource, /id: 'uiPrevSection'/, 'context helper should register previous-section action')
assert.match(shortcutContextComposableSource, /id: 'uiNextSection'/, 'context helper should register next-section action')
assert.match(shortcutContextComposableSource, /id: 'uiFocusSearch'/, 'context helper should register focus-search action')
assert.match(shortcutContextComposableSource, /id: 'uiPageUp'/, 'context helper should register page-up action')
assert.match(shortcutContextComposableSource, /id: 'uiPageDown'/, 'context helper should register page-down action')

assert.match(settingsStoreSource, /keyboardShortcutsEnabled = ref\(true\)/, 'keyboard shortcuts should default to enabled')
assert.match(settingsStoreSource, /keyboardShortcutBindings = ref<KeyboardShortcutBindingMap>\(createDefaultKeyboardShortcutBindings\(\)\)/, 'settings store should initialize default bindings')
assert.match(settingsStoreSource, /keyboardShortcutsEnabled: keyboardShortcutsEnabled\.value/, 'settings serialization should save the master switch')
assert.match(settingsStoreSource, /keyboardShortcutSaveVersion: KEYBOARD_SHORTCUT_SAVE_VERSION/, 'settings serialization should save shortcut schema version')
assert.match(settingsStoreSource, /keyboardShortcutBindings: keyboardShortcutBindings\.value/, 'settings serialization should save bindings')
assert.match(settingsStoreSource, /normalizeKeyboardShortcutBindings\(data\?\.keyboardShortcutBindings\)/, 'settings restore should normalize saved bindings')
assert.match(settingsStoreSource, /resetKeyboardShortcutBindings/, 'settings store should expose restore-all defaults')
assert.match(settingsStoreSource, /clearKeyboardShortcutBinding/, 'settings store should expose clear binding')

assert.match(settingsDialogSource, /key: 'shortcuts'/, 'settings dialog should add a shortcuts tab')
assert.match(settingsDialogSource, /data-testid="settings-shortcuts-panel"/, 'settings shortcuts panel should have a stable test id')
assert.match(settingsDialogSource, /SHORTCUT_GROUP_ORDER[\s\S]*?'ui'/, 'settings shortcuts should render the ui category in order')
assert.match(settingsDialogSource, /settings-shortcuts-enabled-on/, 'settings shortcuts on toggle should have a stable test id')
assert.match(settingsDialogSource, /settings-shortcuts-enabled-off/, 'settings shortcuts off toggle should have a stable test id')
assert.match(settingsDialogSource, /settings-shortcuts-reset-all/, 'settings shortcuts restore-all button should have a stable test id')
assert.match(settingsDialogSource, /settings-shortcuts-group-\$\{group\.category\}/, 'settings shortcut groups should have stable category test ids')
assert.match(settingsDialogSource, /settings-shortcut-row-\$\{action\.id\}/, 'settings shortcut rows should have stable action test ids')
assert.match(settingsDialogSource, /settings-shortcut-bind-\$\{action\.id\}/, 'settings shortcut bind buttons should have stable test ids')
assert.match(settingsDialogSource, /settings-shortcut-reset-\$\{action\.id\}/, 'settings shortcut reset buttons should have stable test ids')
assert.match(settingsDialogSource, /settings-shortcut-clear-\$\{action\.id\}/, 'settings shortcut clear buttons should have stable test ids')
assert.match(settingsDialogSource, /setKeyboardShortcutCaptureActive/, 'settings dialog should block global shortcuts while rebinding')
assert.match(settingsDialogSource, /findShortcutConflict/, 'settings dialog should reject conflicting bindings')
assert.match(settingsDialogSource, /isReservedKeyboardShortcutBinding/, 'settings dialog should reject reserved bindings')

assert.match(gameLayoutSource, /useKeyboardShortcutActions/, 'game layout should register global shortcut actions')
assert.match(gameLayoutSource, /id: 'systemSettings'/, 'game layout should bind settings toggle')
assert.match(gameLayoutSource, /id: 'systemRecordCenter'/, 'game layout should bind record center')
assert.match(gameLayoutSource, /id: 'systemSaveManager'/, 'game layout should bind save manager')
assert.match(gameLayoutSource, /globalShortcutNavigationTargets/, 'game layout should bind planned navigation targets')
assert.match(gameLayoutSource, /navigateToPanel\(panelKey as PanelKey\)/, 'navigation shortcuts should route through navigateToPanel')
for (const [actionId, panelKey] of Object.entries({
  navAnimal: 'animal',
  navHome: 'home',
  navBreeding: 'breeding',
  navShop: 'shop',
  navWorkshop: 'workshop',
  navUpgrade: 'upgrade',
  navFishPond: 'fishpond',
  navQuarry: 'quarry',
  navCottage: 'cottage',
  navDecoration: 'decoration',
  navForage: 'forage',
  navFishing: 'fishing',
  navMining: 'mining',
  navCooking: 'cooking',
  navWallet: 'wallet',
  navMail: 'mail',
  navAchievement: 'achievement',
  navGlossary: 'glossary',
  navMuseum: 'museum',
  navGuild: 'guild',
  navHanhai: 'hanhai'
})) {
  assert.match(gameLayoutSource, new RegExp(`${actionId}: '${panelKey}'`), `${actionId} should map to ${panelKey}`)
}
assert.match(gameLayoutSource, /id: 'toolVoidChest'/, 'game layout should bind the void chest tool shortcut')
assert.match(gameLayoutSource, /warehouseStore\.hasVoidChest/, 'void chest shortcut should respect unlock state')
assert.match(gameLayoutSource, /miningStore\.inCombat/, 'global shortcuts should defer while mining combat context is open')

for (const [label, source] of Object.entries({
  InventoryView: inventoryViewSource,
  ProcessingView: processingViewSource,
  BreedingView: breedingViewSource,
  FishPondView: fishPondViewSource,
  GuildView: guildViewSource,
  HanhaiView: hanhaiViewSource,
  AchievementView: achievementViewSource,
  MuseumView: museumViewSource,
  DecorationView: decorationViewSource,
  ShopView: shopViewSource,
  MailView: mailViewSource,
  FarmView: farmViewSource
})) {
  assert.match(source, /useKeyboardShortcutTabActions/, `${label} should register tab/category context shortcuts`)
  assert.match(source, /onPageUp: \(\) => scrollByViewport\(-1\)/, `${label} should bind PageUp to page scrolling`)
  assert.match(source, /onPageDown: \(\) => scrollByViewport\(1\)/, `${label} should bind PageDown to page scrolling`)
}
assert.match(glossaryTabSource, /data-testid="glossary-search-input"/, 'glossary search input should expose a stable test id')
assert.match(glossaryTabSource, /useKeyboardShortcutContextActions/, 'glossary should register generic context shortcuts')
assert.match(glossaryTabSource, /focusSearch: \(\) =>/, 'glossary should bind focus-search shortcut')
assert.match(glossaryTabSource, /scrollGlossaryListByViewport/, 'glossary should bind list page scrolling')

for (const [label, source] of Object.entries({
  CookingView: cookingViewSource,
  SkillView: skillViewSource,
  WalletView: walletViewSource
})) {
  assert.match(source, /useKeyboardShortcutContextActions/, `${label} should register context shortcuts`)
  assert.match(source, /onPageUp: \(\) => scrollByViewport\(-1\)/, `${label} should bind PageUp to page scrolling`)
  assert.match(source, /onPageDown: \(\) => scrollByViewport\(1\)/, `${label} should bind PageDown to page scrolling`)
}
assert.match(farmViewSource, /useKeyboardShortcutTabActions/, 'FarmView should register tab cycling shortcuts')
assert.match(farmViewSource, /onPageUp: \(\) => scrollByViewport\(-1\)/, 'FarmView should bind PageUp to page scrolling')
assert.match(farmViewSource, /onPageDown: \(\) => scrollByViewport\(1\)/, 'FarmView should bind PageDown to page scrolling')
assert.match(quarryViewSource, /useKeyboardShortcutActions/, 'QuarryView should register combat shortcut actions')
assert.match(quarryViewSource, /id: 'miningAttack'/, 'QuarryView should bind attack shortcut')
assert.match(quarryViewSource, /id: 'miningDefend'/, 'QuarryView should bind defend shortcut')
assert.match(quarryViewSource, /id: 'miningFlee'/, 'QuarryView should bind flee shortcut')
assert.match(quarryViewSource, /useKeyboardShortcutContextActions/, 'QuarryView should register scroll shortcuts')
assert.match(quarryViewSource, /onPageUp: \(\) => scrollByViewport\(-1\)/, 'QuarryView should bind PageUp to page scrolling')
assert.match(quarryViewSource, /onPageDown: \(\) => scrollByViewport\(1\)/, 'QuarryView should bind PageDown to page scrolling')

for (const action of ['attack', 'defend', 'flee', 'items', 'presets']) {
  assert.match(miningViewSource, new RegExp(`data-testid="mining-combat-action-${action}"`), `mining ${action} action should expose a test id`)
  assert.match(miningViewSource, new RegExp(`data-testid="mining-combat-shortcut-${action}"`), `mining ${action} shortcut badge should expose a test id`)
}

assert.match(miningViewSource, /id: 'miningDescend'/, 'mining view should register descend shortcut')
assert.match(miningViewSource, /miningStore\.stairsFound && miningStore\.stairsUsable/, 'mining descend shortcut should require stairs found and usable')
assert.match(miningViewSource, /handleNextFloor/, 'mining descend shortcut should call handleNextFloor')
assert.match(miningViewSource, /data-testid="mining-descend-shortcut"/, 'mining descend button should expose a test id')
assert.equal(formatKeyboardShortcutBinding(defaultBindings.miningDescend), 'E', 'mining descend shortcut should render as its letter label')

// === v3: sleep confirm shortcut wiring ===
assert.match(gameLayoutSource, /showSleepConfirm/, 'game layout should track sleep confirm state')
assert.match(gameLayoutSource, /id: 'systemSleepPrompt'/, 'game layout should register sleep prompt shortcut')
assert.match(gameLayoutSource, /showSleepConfirm\.value = true/, 'sleep prompt shortcut should open sleep confirm modal')
assert.match(gameLayoutSource, /data-testid="sleep-confirm-modal"/, 'sleep confirm modal should expose a stable test id')
assert.match(gameLayoutSource, /data-testid="sleep-confirm-cancel"/, 'sleep confirm cancel button should have a test id')
assert.match(gameLayoutSource, /data-testid="sleep-confirm-confirm"/, 'sleep confirm confirm button should have a test id')
assert.match(gameLayoutSource, /data-testid="sleep-button"/, 'sleep button should expose a stable test id')
assert.match(gameLayoutSource, /getShortcutLabel\('systemSleepPrompt'\)/, 'sleep button should display its shortcut badge')
assert.match(gameLayoutSource, /getShortcutLabel\('uiCancel'\)/, 'sleep confirm cancel should display its shortcut badge')
assert.match(gameLayoutSource, /getShortcutLabel\('uiConfirm'\)/, 'sleep confirm confirm should display its shortcut badge')

// === v3: void chest quantity shortcuts ===
assert.match(gameLayoutSource, /id: 'uiQtyDecrease'/, 'qty decrease shortcut should be registered in game layout')
assert.match(gameLayoutSource, /id: 'uiQtyIncrease'/, 'qty increase shortcut should be registered in game layout')

// === v3: Escape cancel for various modals ===
for (const modalVar of ['showSleepConfirm', 'showRecordCenter', 'showSavePrompt', 'showDailyDigestSummary', 'showVoidModal', 'showVoidDepositModal', 'voidQtyModal', 'voidItemDetail']) {
  assert.match(gameLayoutSource, new RegExp(`id: 'uiCancel'[^}]*${modalVar}`), `uiCancel should be wired for ${modalVar}`)
}

assert.match(miningViewSource, /getCombatShortcutLabel/, 'mining combat buttons should display current shortcut bindings')
assert.match(miningViewSource, /handleCombatFleeShortcut/, 'mining combat should special-case keyboard flee')
assert.match(miningViewSource, /BOSS 战无法逃跑。/, 'boss flee shortcut should show a no-flee message')
assert.match(miningViewSource, /miningStore\.combatIsBoss[\s\S]*?return[\s\S]*?handleCombat\('flee'\)/, 'boss flee shortcut should return before normal flee settlement')
assert.match(miningViewSource, /availableCombatItems\.value\.length > 0/, 'combat item shortcut should respect available item state')
assert.match(miningViewSource, /inventoryStore\.equipmentPresets\.length > 0/, 'preset shortcut should respect preset availability')
assert.match(miningViewSource, /priority: 100/, 'mining combat shortcuts should outrank global shortcuts')
assert.match(miningViewSource, /data-testid="mining-combat-items-modal"/, 'combat item modal should expose a stable test id')
assert.match(miningViewSource, /data-testid="mining-equipment-presets-modal"/, 'equipment preset modal should expose a stable test id')
assert.match(miningViewSource, /\.mining-combat-shortcut-badge/, 'mining shortcut badges should have stable CSS')
assert.match(miningViewSource, /handleMiningCursorMove/, 'mining view should support direction-key movement')
assert.match(miningViewSource, /id: 'moveUp'[\s\S]*?handleMiningCursorMove\(-MINE_MOVE_GRID\)/, 'mining move-up shortcut should move up one row')
assert.match(miningViewSource, /id: 'moveDown'[\s\S]*?handleMiningCursorMove\(MINE_MOVE_GRID\)/, 'mining move-down shortcut should move down one row')
assert.match(miningViewSource, /id: 'moveLeft'[\s\S]*?handleMiningCursorMove\(-1\)/, 'mining move-left shortcut should move left one tile')
assert.match(miningViewSource, /id: 'moveRight'[\s\S]*?handleMiningCursorMove\(1\)/, 'mining move-right shortcut should move right one tile')
assert.match(miningViewSource, /miningStore\.isExploring && !miningStore\.inCombat/, 'mining movement shortcuts should only run during exploration')
assert.match(shortcutComposableSource, /allowRepeat/, 'composable should expose allowRepeat for movement shortcuts')
assert.match(miningViewSource, /id: 'moveUp'[\s\S]*?allowRepeat: true/, 'mining movement actions should declare allowRepeat')
assert.match(miningViewSource, /\.mining-tile-transition/, 'mining tile cursor should have a scoped transition class for smooth ring animation')
assert.match(regionMapViewSource, /id: 'moveUp'[\s\S]*?allowRepeat: true/, 'region map movement actions should declare allowRepeat')

assert.match(regionMapViewSource, /handleRegionMapCursorMove/, 'region map should support direction-key movement')
assert.match(regionMapViewSource, /regionMapStore\.getOpenWorldTileView\(regionMapStore\.openWorldState\.activeRegionId, tile\.id\)/, 'region map movement should validate candidate tiles outside the visible viewport')
assert.match(regionMapViewSource, /if \(!tileView\?\.canMove\) continue/, 'region map movement should choose the nearest reachable directional tile')
assert.doesNotMatch(regionMapViewSource, /activeRegionMapTab\.value === 'map'[\s\S]*?!settlementDialog\.value[\s\S]*?!currentSession\.value/, 'region map movement should not be blocked by the lower map tab because the open-world map is always visible')
assert.match(regionMapViewSource, /activeOpenWorldRegionView\.value\.unlocked/, 'region map movement should require an unlocked open-world map')
assert.match(regionMapViewSource, /!settlementDialog\.value/, 'region map movement should ignore blocking settlement dialogs')
assert.match(regionMapViewSource, /!currentSession\.value/, 'region map movement should ignore active expedition sessions')
assert.doesNotMatch(regionMapViewSource, /handleMoveOpenWorldPlayer\(best\.id\)[\s\S]*?handleFocusCurrentOpenWorldTile\(\)/, 'region map keyboard movement should not snap camera to keep token CSS transition visible')
assert.match(regionMapViewSource, /id: 'moveUp'[\s\S]*?handleRegionMapCursorMove\(0, -1\)/, 'region map move-up shortcut should move north')
assert.match(regionMapViewSource, /id: 'moveDown'[\s\S]*?handleRegionMapCursorMove\(0, 1\)/, 'region map move-down shortcut should move south')
assert.match(regionMapViewSource, /id: 'moveLeft'[\s\S]*?handleRegionMapCursorMove\(-1, 0\)/, 'region map move-left shortcut should move west')
assert.match(regionMapViewSource, /id: 'moveRight'[\s\S]*?handleRegionMapCursorMove\(1, 0\)/, 'region map move-right shortcut should move east')

console.log('qa-keyboard-shortcut-guards passed')
