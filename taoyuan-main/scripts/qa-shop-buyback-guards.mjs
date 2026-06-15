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

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

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
      // keep trying
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
      if (!resolved) throw new Error(`Cannot resolve ${specifier}`)
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
        source: 'const currentRoute = { value: { name: "shop", path: "/game/shop" } }; export default { currentRoute, push: async () => {}, replace: async () => {}, back: () => {}, beforeEach: () => {}, afterEach: () => {} };',
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
    documentElement: {
      style: { fontSize: '', setProperty: () => {}, removeProperty: () => {} },
      setAttribute: () => {},
      removeAttribute: () => {}
    },
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
  const locationObj = {
    hash: '#/game/shop',
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
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} })
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

const packageJson = JSON.parse(read('package.json'))
const itemTypesSource = read('src/types/item.ts')
const shopStoreSource = read('src/stores/useShopStore.ts')
const shopViewSource = read('src/views/game/ShopView.vue')
const farmViewSource = read('src/views/game/FarmView.vue')
const farmActionsSource = read('src/composables/useFarmActions.ts')

assert(packageJson.scripts?.['qa:shop-buyback-guards'] === 'node scripts/qa-shop-buyback-guards.mjs', 'package.json must register qa:shop-buyback-guards.')
assert(itemTypesSource.includes("export type InventoryItemOrigin = 'shop'"), 'InventoryItem must define shop origin.')
assert(itemTypesSource.includes('purchaseUnitPrice?: number'), 'InventoryItem must persist purchaseUnitPrice.')
assert(shopStoreSource.includes('sellInventorySlot,'), 'useShopStore must export slot-based selling.')
assert(shopStoreSource.includes('getInventorySlotSellPriceBreakdown,'), 'useShopStore must export slot-based price breakdown.')
assert(shopStoreSource.includes("playerStore.earnMoney(totalPrice, { countAsEarned: false, system: 'shop' })"), 'Shop buyback must not count as earned income.')
assert(shopStoreSource.includes('!isShopOriginInventoryItem(item) && item.itemId === itemId'), 'Shipping box and legacy selling must avoid shop-origin slots.')
assert(shopViewSource.includes('商圈回购') && shopViewSource.includes('getInventorySlotSellPriceBreakdown'), 'Shop sell modal must expose buyback breakdown from inventory slots.')
assert(farmViewSource.includes("item.origin !== 'shop'"), 'Shipping box inventory list must hide shop-origin slots.')
assert(farmViewSource.includes('商圈购入品只能商店回购'), 'Shipping box failure must explain that shop-origin items only support shop buyback.')
assert(farmActionsSource.includes('shopStore.sellInventorySlot(item.originalIndex, item.quantity)'), 'Sell-all must use slot-based selling.')

const { createPinia, setActivePinia } = await import('pinia')
const inventoryStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useInventoryStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/usePlayerStore.ts')).href)
const shopStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useShopStore.ts')).href)
const achievementStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useAchievementStore.ts')).href)
const gameStoreModule = await import(pathToFileURL(path.join(srcRoot, 'stores/useGameStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  const gameStore = gameStoreModule.useGameStore()
  gameStore.year = 2
  gameStore.day = 9
  return {
    gameStore,
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    playerStore: playerStoreModule.usePlayerStore(),
    shopStore: shopStoreModule.useShopStore(),
    achievementStore: achievementStoreModule.useAchievementStore()
  }
}

{
  const { inventoryStore, playerStore, shopStore, achievementStore } = freshStores()
  const expectedDayKey = '2_0_9'
  playerStore.money = 100000
  assert(shopStore.buyItem('silk_ribbon', 500, 2) === true, 'Buying silk_ribbon from shop should succeed.')
  const slotIndex = inventoryStore.items.findIndex(item => item.itemId === 'silk_ribbon' && item.origin === 'shop')
  const slot = inventoryStore.items[slotIndex]
  assert(slot?.purchaseDay === expectedDayKey, 'Shop purchase must record purchaseDay.')
  assert(slot?.purchaseUnitPrice === 500, 'Shop purchase must record actual discounted unit price.')
  assert(slot?.quantity === 2, 'Shop purchase quantity should stay in one matching shop stack.')
  assert(shopStore.getShopBuybackUnitPrice(slot) === 400, 'Silk ribbon buyback unit should be floor(500 * 80%).')
  const moneyAfterPurchase = playerStore.money
  const statsBefore = achievementStore.stats.totalMoneyEarned
  const serializedBefore = shopStore.serialize()
  const earned = shopStore.sellInventorySlot(slotIndex, 1)
  assert(earned === 400, 'Shop-origin silk_ribbon must sell only for 80% buyback.')
  assert(playerStore.money === moneyAfterPurchase + 400, 'Buyback should add the buyback money.')
  assert(achievementStore.stats.totalMoneyEarned === statsBefore, 'Buyback must not increase lifetime earned money.')
  const serializedAfter = shopStore.serialize()
  assert(JSON.stringify(serializedAfter.shippingHistory) === JSON.stringify(serializedBefore.shippingHistory), 'Buyback must not write market shipping history.')
  assert(JSON.stringify(serializedAfter.shippingItemHistory) === JSON.stringify(serializedBefore.shippingItemHistory), 'Buyback must not write item shipping history.')
  assert(JSON.stringify(serializedAfter.shippingLifetimeItemTotals) === JSON.stringify(serializedBefore.shippingLifetimeItemTotals), 'Buyback must not write lifetime item shipping totals.')
}

{
  const { inventoryStore, playerStore, shopStore } = freshStores()
  playerStore.money = 100000
  assert(shopStore.buyItem('osmanthus_incense', 800, 1) === true, 'Buying osmanthus_incense from shop should succeed.')
  const slotIndex = inventoryStore.items.findIndex(item => item.itemId === 'osmanthus_incense' && item.origin === 'shop')
  const slot = inventoryStore.items[slotIndex]
  assert(slot?.purchaseUnitPrice === 800, 'Osmanthus incense should store shop unit price.')
  assert(shopStore.calculateInventorySlotSellPrice(slotIndex, 1) === 640, 'Osmanthus incense buyback must be 640, not its 780 base sell price.')
  assert(shopStore.sellInventorySlot(slotIndex, 1) === 640, 'Osmanthus incense should be bought back at 80%.')
}

{
  const { inventoryStore, shopStore } = freshStores()
  inventoryStore.addItemExact('osmanthus_incense', 1, 'supreme', true, { origin: 'shop', purchaseDay: 'qa', purchaseUnitPrice: 800 })
  const slotIndex = inventoryStore.items.findIndex(item => item.itemId === 'osmanthus_incense')
  const normalSupremeSell = shopStore.calculateSellPrice('osmanthus_incense', 1, 'supreme')
  assert(normalSupremeSell > 640, 'Supreme osmanthus normal sell price should exceed buyback guard value.')
  assert(shopStore.calculateInventorySlotSellPrice(slotIndex, 1) === 640, 'Shop-origin buyback must ignore quality and sell bonuses.')
}

{
  const { inventoryStore, playerStore, shopStore, achievementStore } = freshStores()
  const expectedShippingDayKey = '2-0-9'
  playerStore.money = 100000
  inventoryStore.addItemExact('osmanthus_incense', 1)
  const normalIndex = inventoryStore.items.findIndex(item => item.itemId === 'osmanthus_incense')
  const expectedNormalPrice = shopStore.calculateSellPrice('osmanthus_incense', 1, 'normal')
  const statsBefore = achievementStore.stats.totalMoneyEarned
  const earned = shopStore.sellInventorySlot(normalIndex, 1)
  assert(earned === expectedNormalPrice, 'Self-produced same item should keep normal sell pricing.')
  assert(achievementStore.stats.totalMoneyEarned === statsBefore + earned, 'Normal selling should still count as earned money.')
  assert(shopStore.serialize().shippingItemHistory[expectedShippingDayKey]?.osmanthus_incense === 1, 'Normal selling should still write item shipping history.')
}

{
  const { inventoryStore, playerStore, shopStore } = freshStores()
  playerStore.money = 100000
  assert(shopStore.buyItem('osmanthus_incense', 800, 1) === true, 'Shop-origin shipping-box setup should buy item.')
  assert(shopStore.addToShippingBox('osmanthus_incense', 1, 'normal') === false, 'Shipping box must reject shop-origin inventory when no normal stack exists.')
  assert(inventoryStore.items.some(item => item.itemId === 'osmanthus_incense' && item.origin === 'shop'), 'Rejected shipping-box attempt must leave shop-origin stack in inventory.')
  inventoryStore.addItemExact('osmanthus_incense', 1)
  assert(shopStore.addToShippingBox('osmanthus_incense', 1, 'normal') === true, 'Shipping box should still accept a normal same-item stack.')
  assert(shopStore.shippingBox.some(entry => entry.itemId === 'osmanthus_incense' && entry.quantity === 1), 'Shipping box should record accepted normal stack.')
  assert(inventoryStore.items.some(item => item.itemId === 'osmanthus_incense' && item.origin === 'shop'), 'Shipping box must not consume the shop-origin stack when a normal stack is available.')
}

if (errors.length > 0) {
  console.error(`qa-shop-buyback-guards failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-shop-buyback-guards: ok')
