/* global console, process, setTimeout, clearTimeout */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.js')
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // Candidate path does not exist.
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'qmsg') return { url: 'qa:qmsg', shortCircuit: true }
    if (specifier === '@/router') return { url: 'qa:router', shortCircuit: true }
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = tryResolveFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'qa:qmsg') {
      return {
        format: 'module',
        source: 'const noop = () => {}; const Qmsg = { config: noop, info: noop, success: noop, warning: noop, error: noop, closeAll: noop }; export default Qmsg;',
        shortCircuit: true
      }
    }
    if (url === 'qa:router') {
      return {
        format: 'module',
        source: `
          const currentRoute = { value: { name: 'inventory', path: '/game/inventory' } }
          const router = {
            currentRoute,
            push: async () => {},
            replace: async () => {},
            back: () => {},
            beforeEach: () => {},
            afterEach: () => {}
          }
          export default router
        `,
        shortCircuit: true
      }
    }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs
        .readFileSync(filePath, 'utf8')
        .replace(/import\.meta\.env/g, 'globalThis.__QA_IMPORT_META_ENV__')
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

const installBrowserShims = () => {
  globalThis.__QA_IMPORT_META_ENV__ = { DEV: true, PROD: false }
  const storage = new Map()
  const localStorage = {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  }
  const documentObj = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: { style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} } },
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const locationObj = {
    hash: '#/game/inventory',
    host: 'localhost:4013',
    pathname: '/',
    search: '',
    origin: 'http://localhost:4013',
    assign: () => {},
    replace: () => {}
  }
  const windowObj = {
    location: locationObj,
    history: { state: null, replaceState: () => {}, pushState: () => {} },
    localStorage,
    setTimeout,
    clearTimeout,
    addEventListener: () => {},
    removeEventListener: () => {},
    document: documentObj,
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {}
    })
  }
  Object.defineProperty(globalThis, 'window', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'self', { value: windowObj, configurable: true })
  Object.defineProperty(globalThis, 'location', { value: locationObj, configurable: true })
  Object.defineProperty(globalThis, 'history', { value: windowObj.history, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: documentObj, configurable: true })
  Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => true }, configurable: true })
  Object.defineProperty(globalThis, 'Element', { value: function Element() {}, configurable: true })
  Object.defineProperty(globalThis, 'HTMLElement', { value: function HTMLElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'SVGElement', { value: function SVGElement() {}, configurable: true })
  Object.defineProperty(globalThis, 'fetch', { value: async () => ({ ok: true, json: async () => ({}) }), configurable: true })
}

installBrowserShims()

const { createPinia, setActivePinia } = await import('pinia')
const inventoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useInventoryStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePlayerStore.ts')).href)
const miningStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useMiningStore.ts')).href)
const itemDataModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/items.ts')).href)
const inventoryUseRulesModule = await import(pathToFileURL(path.join(projectRoot, 'src/utils/inventoryUseRules.ts')).href)

const freshInventoryStore = () => {
  setActivePinia(createPinia())
  return inventoryStoreModule.useInventoryStore()
}

const freshInventoryAndPlayerStores = () => {
  setActivePinia(createPinia())
  return {
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    playerStore: playerStoreModule.usePlayerStore()
  }
}

const applyRecoveryItem = ({ inventoryStore, playerStore, itemId, quality = 'normal' }) => {
  const def = itemDataModule.getItemById(itemId)
  return inventoryUseRulesModule.applyInventoryRecoveryItem({
    def,
    vitals: {
      stamina: playerStore.stamina,
      maxStamina: playerStore.maxStamina,
      hp: playerStore.hp,
      maxHp: playerStore.getMaxHp()
    },
    removeItem: () => inventoryStore.removeItem(itemId, 1, quality),
    restoreStamina: amount => playerStore.restoreStamina(amount),
    restoreHealth: amount => playerStore.restoreHealth(amount)
  })
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = [{ itemId: 'wood', quantity: 999, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'stone', quantity: 3, quality: 'normal' }]

  assert(inventoryStore.getMovableTempItemCount(0) === 0, '主背包满且无同类可合并时，单格可移动数量应为 0。')
  assert(inventoryStore.getMovableTempItemCount() === 0, '主背包满且无同类可合并时，一键可移动数量应为 0。')
  assert(inventoryStore.canMoveFromTemp(0) === false, '主背包满且无同类可合并时，单格按钮应不可移动。')
  assert(inventoryStore.moveFromTemp(0) === false, '主背包满且无同类可合并时，单格取回应失败。')
  assert(inventoryStore.moveAllFromTemp() === 0, '主背包满且无同类可合并时，一键取回应返回 0 件。')
  assert(inventoryStore.tempItems[0]?.quantity === 3, '不可移动的临时背包物品数量不应变化。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = [{ itemId: 'stone', quantity: 997, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'stone', quantity: 5, quality: 'normal' }]

  assert(inventoryStore.getMovableTempItemCount(0) === 2, '主背包满但同类栈有余量时，应只预测可合并数量。')
  assert(inventoryStore.canMoveFromTemp(0) === true, '主背包满但同类栈有余量时，单格按钮应可用。')
  assert(inventoryStore.moveFromTemp(0) === false, '部分取回后仍有剩余时，单格取回应返回未完整移动。')
  assert(inventoryStore.items[0]?.quantity === 999, '部分取回应填满主背包同类栈。')
  assert(inventoryStore.tempItems[0]?.quantity === 3, '部分取回应保留临时背包剩余数量。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 2
  inventoryStore.items = [{ itemId: 'wood', quantity: 999, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'stone', quantity: 5, quality: 'normal' }]

  assert(inventoryStore.getMovableTempItemCount(0) === 5, '主背包有空槽时，应预测完整取回。')
  assert(inventoryStore.moveFromTemp(0) === true, '主背包有空槽时，单格取回应完整成功。')
  assert(inventoryStore.tempItems.length === 0, '完整取回后临时背包格应移除。')
  assert(inventoryStore.items.some(item => item.itemId === 'stone' && item.quantity === 5), '完整取回后物品应进入主背包。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = []
  inventoryStore.tempItems = [
    { itemId: 'wood', quantity: 1, quality: 'normal' },
    { itemId: 'stone', quantity: 1000, quality: 'normal' }
  ]

  assert(inventoryStore.getMovableTempItemCount() === 999, '一键可移动数量应按实际倒序取回模拟，不能把单格预测直接相加。')
  assert(inventoryStore.moveAllFromTemp() === 999, '一键取回应返回真实移动件数。')
  assert(inventoryStore.items.length === 1 && inventoryStore.items[0]?.itemId === 'stone' && inventoryStore.items[0]?.quantity === 999, '一键取回应按实际顺序占用主背包空槽。')
  assert(inventoryStore.tempItems.length === 2 && inventoryStore.tempItems[1]?.quantity === 1, '一键取回后未能进入主背包的数量应留在临时背包。')
}

{
  const { inventoryStore, playerStore } = freshInventoryAndPlayerStores()
  const def = itemDataModule.getItemById('combat_tonic')
  const maxHp = playerStore.getMaxHp()
  playerStore.hp = maxHp - 40
  playerStore.stamina = playerStore.maxStamina
  inventoryStore.items = [{ itemId: 'combat_tonic', quantity: 1, quality: 'normal' }]

  assert(inventoryUseRulesModule.hasItemRecovery(def), 'HP-only 战斗补剂应被普通背包识别为可食用恢复道具。')
  assert(inventoryUseRulesModule.getItemRecoveryDisplayParts(def).includes('+30HP'), 'HP-only 战斗补剂恢复预览应显示 +30HP。')
  const plan = inventoryUseRulesModule.getItemRecoveryPlan(def, {
    stamina: playerStore.stamina,
    maxStamina: playerStore.maxStamina,
    hp: playerStore.hp,
    maxHp
  })
  assert(plan.canUse === true && plan.actualHealthRestore === 30 && plan.actualStaminaRestore === 0, 'HP 未满、体力已满时 HP-only 道具应可用且只恢复 HP。')

  const result = applyRecoveryItem({ inventoryStore, playerStore, itemId: 'combat_tonic' })
  assert(result.success === true && result.consumed === true, 'HP-only 道具使用应成功并消耗。')
  assert(playerStore.hp === maxHp - 10, 'HP-only 道具应实际增加 HP。')
  assert(inventoryStore.getItemCount('combat_tonic') === 0, 'HP-only 道具使用后应消耗 1 个。')
}

{
  const { inventoryStore, playerStore } = freshInventoryAndPlayerStores()
  const def = itemDataModule.getItemById('combat_tonic')
  playerStore.hp = playerStore.getMaxHp()
  playerStore.stamina = playerStore.maxStamina
  inventoryStore.items = [{ itemId: 'combat_tonic', quantity: 1, quality: 'normal' }]

  const result = applyRecoveryItem({ inventoryStore, playerStore, itemId: 'combat_tonic' })
  assert(result.success === false && result.consumed === false, 'HP 已满时 HP-only 道具不应被消耗。')
  assert(result.message.includes('生命值已满'), 'HP 已满时 HP-only 道具应给出生命值已满提示。')
  assert(inventoryStore.getItemCount('combat_tonic') === 1, 'HP 已满时 HP-only 道具数量应保持不变。')
  assert(inventoryUseRulesModule.getItemRecoveryPlan(def, {
    stamina: playerStore.stamina,
    maxStamina: playerStore.maxStamina,
    hp: playerStore.hp,
    maxHp: playerStore.getMaxHp()
  }).canUse === false, 'HP 已满时 HP-only 道具按钮应处于阻塞口径。')
}

{
  const { inventoryStore, playerStore } = freshInventoryAndPlayerStores()
  playerStore.hp = playerStore.getMaxHp() - 30
  playerStore.stamina = playerStore.maxStamina
  inventoryStore.items = [{ itemId: 'stamina_elixir', quantity: 1, quality: 'normal' }]

  const blocked = applyRecoveryItem({ inventoryStore, playerStore, itemId: 'stamina_elixir' })
  assert(blocked.success === false && blocked.message.includes('体力已满'), '体力-only 道具在体力已满时应阻塞，即使 HP 未满。')
  assert(inventoryStore.getItemCount('stamina_elixir') === 1, '体力-only 道具被阻塞时不应消耗。')

  playerStore.stamina = playerStore.maxStamina - 50
  const used = applyRecoveryItem({ inventoryStore, playerStore, itemId: 'stamina_elixir' })
  assert(used.success === true && playerStore.stamina === playerStore.maxStamina, '体力-only 道具在体力未满时应恢复体力。')
  assert(inventoryStore.getItemCount('stamina_elixir') === 0, '体力-only 道具成功使用后应消耗。')
}

{
  const { inventoryStore, playerStore } = freshInventoryAndPlayerStores()
  const maxHp = playerStore.getMaxHp()
  playerStore.hp = maxHp - 20
  playerStore.stamina = playerStore.maxStamina
  inventoryStore.items = [{ itemId: 'warriors_feast', quantity: 1, quality: 'normal' }]

  const result = applyRecoveryItem({ inventoryStore, playerStore, itemId: 'warriors_feast' })
  assert(result.success === true, '双恢复道具在体力已满但 HP 未满时仍应可用。')
  assert(playerStore.hp === maxHp, '双恢复道具应恢复缺失 HP。')
  assert(playerStore.stamina === playerStore.maxStamina, '双恢复道具不应让已满体力越界。')
  assert(inventoryStore.getItemCount('warriors_feast') === 0, '双恢复道具成功使用后应消耗。')
}

{
  const { inventoryStore, playerStore } = freshInventoryAndPlayerStores()
  const miningStore = miningStoreModule.useMiningStore()
  const maxHp = playerStore.getMaxHp()
  miningStore.isExploring = true
  playerStore.hp = maxHp - 16
  playerStore.stamina = playerStore.maxStamina - 30
  inventoryStore.items = [{ itemId: 'corn', quantity: 3, quality: 'normal' }]

  const result = miningStore.useCombatItem('corn', 3)
  assert(result.success === true, '矿洞批量吃玉米应成功')
  assert(result.message.includes('×2'), '矿洞批量吃玉米应汇总实际使用数量')
  assert(playerStore.hp === maxHp, '矿洞批量吃玉米应在 HP 满时停止')
  assert(playerStore.stamina === playerStore.maxStamina, '矿洞批量吃玉米应在体力满时停止')
  assert(inventoryStore.getItemCount('corn') === 1, '请求吃 3 个玉米但满状态后应只消耗 2 个')

  const blocked = miningStore.useCombatItem('corn', 3)
  assert(blocked.success === false, 'HP/体力已满时矿洞批量吃食物应被阻止')
  assert(inventoryStore.getItemCount('corn') === 1, 'HP/体力已满时不应继续消耗玉米')
}

if (errors.length > 0) {
  console.error('Inventory guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Inventory guard passed.')
