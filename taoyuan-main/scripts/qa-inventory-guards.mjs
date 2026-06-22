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
    if (specifier === 'file-saver') return { url: 'qa:file-saver', shortCircuit: true }
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
    if (url === 'qa:file-saver') {
      return {
        format: 'module',
        source: 'export const saveAs = () => {}; export default { saveAs };',
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
const shopStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useShopStore.ts')).href)
const warehouseStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useWarehouseStore.ts')).href)
const itemDataModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/items.ts')).href)
const inventoryUseRulesModule = await import(pathToFileURL(path.join(projectRoot, 'src/utils/inventoryUseRules.ts')).href)
const inventoryCapacityModule = await import(pathToFileURL(path.join(projectRoot, 'src/utils/inventoryCapacity.ts')).href)
const inventoryStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useInventoryStore.ts'), 'utf8')
const cookingStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useCookingStore.ts'), 'utf8')
const homeStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useHomeStore.ts'), 'utf8')
const miningStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useMiningStore.ts'), 'utf8')
const npcStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useNpcStore.ts'), 'utf8')
const hiddenNpcStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useHiddenNpcStore.ts'), 'utf8')
const shopStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useShopStore.ts'), 'utf8')
const warehouseStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useWarehouseStore.ts'), 'utf8')
const shopViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/ShopView.vue'), 'utf8')
const farmViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/FarmView.vue'), 'utf8')
const inventoryViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/InventoryView.vue'), 'utf8')
const gameLayoutSource = fs.readFileSync(path.join(projectRoot, 'src/views/GameLayout.vue'), 'utf8')
const homeViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/HomeView.vue'), 'utf8')
const cottageViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/CottageView.vue'), 'utf8')
const npcViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/NpcView.vue'), 'utf8')
const hiddenNpcModalSource = fs.readFileSync(path.join(projectRoot, 'src/components/game/HiddenNpcModal.vue'), 'utf8')

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

const freshInventoryPlayerAndShopStores = () => {
  setActivePinia(createPinia())
  return {
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    playerStore: playerStoreModule.usePlayerStore(),
    shopStore: shopStoreModule.useShopStore()
  }
}

const freshInventoryAndWarehouseStores = () => {
  setActivePinia(createPinia())
  return {
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    warehouseStore: warehouseStoreModule.useWarehouseStore()
  }
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.items = [
    { itemId: 'bamboo', quantity: 3, quality: 'normal' },
    { itemId: 'bamboo', quantity: 2, quality: 'fine' },
    { itemId: 'bamboo', quantity: 1, quality: 'excellent' }
  ]
  inventoryStore.tempItems = [
    { itemId: 'bamboo', quantity: 1, quality: 'supreme' }
  ]

  assert(inventoryStore.getTotalItemCountAtLeast('bamboo', 'fine') === 4, 'Minimum-quality totals should include fine, excellent and supreme stacks only.')
  assert(inventoryStore.getTotalItemCountAtLeast('bamboo', 'excellent') === 2, 'Minimum-quality totals should exclude normal and fine stacks below the threshold.')
  assert(inventoryStore.removeItemAnywhereAtLeast('bamboo', 3, 'fine') === true, 'Minimum-quality removal should consume eligible quality stacks.')
  assert(inventoryStore.getItemCount('bamboo', 'normal') === 3, 'Minimum-quality removal must not consume lower-quality normal stacks.')
  assert(inventoryStore.getItemCount('bamboo', 'fine') === 0, 'Minimum-quality removal should consume fine stacks before higher-quality stacks.')
  assert(inventoryStore.getItemCount('bamboo', 'excellent') === 0, 'Minimum-quality removal should continue into excellent stacks after fine stacks.')
  assert(inventoryStore.getTempItemCount('bamboo', 'supreme') === 1, 'Minimum-quality removal should leave higher quality stacks when lower eligible stacks satisfy the quantity.')
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
    removeItem: () => inventoryStore.removeItemForEating(itemId, 1, quality),
    restoreStamina: amount => playerStore.restoreStamina(amount),
    restoreHealth: amount => playerStore.restoreHealth(amount)
  })
}

assert(
  inventoryViewSource.includes('const canEatForFoodBuff = (itemId: string): boolean => !!getFoodBuff(itemId)'),
  'Inventory food buff helper must keep buff dishes edible even when recovery is full.'
)
assert(
  inventoryViewSource.includes('return plan.hasRecovery && !plan.canUse && !canEatForFoodBuff(itemId)'),
  'Inventory eat button should not be disabled for buff food at full stamina/HP.'
)
assert(
  inventoryViewSource.includes('if (!plan.canUse && !canEatForFoodBuff(itemId))'),
  'Inventory eat handler should not block buff food before cookingStore.eat applies the buff.'
)
assert(
  inventoryStoreSource.includes('export const mergeVisibleInventoryItems = (sourceItems: InventoryItem[]): VisibleInventoryItemStack[]') &&
    inventoryStoreSource.includes('const visibleItems = computed(() => mergeVisibleInventoryItems(items.value))') &&
    inventoryStoreSource.includes('existing.quantity += item.quantity') &&
    inventoryStoreSource.includes('existing.locked = existing.locked || !!item.locked') &&
    inventoryViewSource.includes('const visibleInventoryItems = computed(() => inventoryStore.visibleItems)') &&
    inventoryViewSource.includes(':key="`${item.itemId}-${item.quality}`"') &&
    inventoryViewSource.includes('@click="openVisibleInventoryItem(item)"'),
  'Inventory player-visible stacks must be merged by item id and quality from the store, hiding shop-origin batch splits.'
)
assert(
  inventoryViewSource.includes('const activeItemKey = ref<ActiveInventoryItemKey | null>(null)') &&
    inventoryViewSource.includes('visibleInventoryItems.value.find(item => getVisibleInventoryKey(item) === getVisibleInventoryKey(activeItemKey.value!))') &&
    inventoryViewSource.includes('watch(activeItem, item =>') &&
    inventoryViewSource.includes('if (activeItemKey.value && !item)') &&
    inventoryViewSource.includes('closeActiveItem()'),
  'Inventory item detail modal should track visible item id + quality instead of underlying batch index.'
)
assert(
  inventoryViewSource.includes(':disabled="isEatBlocked(activeItem.itemId)"') &&
    inventoryViewSource.includes(':disabled="activeItem.locked || isUseBlocked(activeItem.itemId)"') &&
    inventoryViewSource.includes('const isVisibleInventoryItemLocked = (itemId: string, quality: Quality): boolean =>') &&
    !inventoryViewSource.includes(':disabled="activeItem.locked || isEatBlocked(activeItem.itemId)"') &&
    inventoryViewSource.includes("addLog('物品已锁定，先解锁才能使用。')"),
  'Inventory item detail modal must allow locked food eating while locked generic use stays blocked.'
)
assert(
  inventoryViewSource.includes(':key="`${entry.itemId}-${entry.quality}`"') &&
    inventoryViewSource.includes('@click="openInventoryItem(entry.itemId, entry.quality)"') &&
    inventoryViewSource.includes('quality: item.quality'),
  'Inventory crop-use recommendation entries must keep quality in their key and detail target.'
)
assert(
  inventoryViewSource.includes("import { getCropBySeedId, getItemById, getItemSource } from '@/data'") &&
    inventoryViewSource.includes("import { SEASON_NAMES, useGameStore } from '@/stores/useGameStore'") &&
    inventoryViewSource.includes("if (activeItemDef.value?.category !== 'seed' || !activeItem.value) return null") &&
    inventoryViewSource.includes('return getCropBySeedId(activeItem.value.itemId) ?? null') &&
    inventoryViewSource.includes('{{ activeSeedSeasonLabel }}') &&
    inventoryViewSource.includes('{{ activeSeedGrowthLabel }}') &&
    inventoryViewSource.includes('{{ activeSeedRegrowthLabel }}'),
  'Inventory seed detail modal must derive planting season and growth days from crop definitions.'
)
assert(
  inventoryStoreSource.includes("const FIXED_NORMAL_QUALITY_ITEM_CATEGORIES = new Set(['ore', 'gem'])") &&
    inventoryStoreSource.includes('export const normalizeInventoryItemQuality = (itemId: string, quality: Quality = \'normal\'): Quality =>') &&
    inventoryStoreSource.includes('quality: normalizeInventoryItemQuality(itemId, quality)') &&
    inventoryStoreSource.includes('quality: normalizeInventoryItemQuality(entry.itemId, entry.quality ?? \'normal\')'),
  'Inventory ore and gem stacks should normalize to normal quality before add/preflight so hidden quality variants cannot split chests.'
)
assert(
  warehouseStoreSource.includes('const compactChestItems = (sourceItems: InventoryItem[]): InventoryItem[]') &&
    warehouseStoreSource.includes('chest.items = compactChestItems(chest.items)') &&
    warehouseStoreSource.includes('const getVisibleChestSlotCountFromItems = (sourceItems: InventoryItem[]): number =>') &&
    warehouseStoreSource.includes('const getChestUsedSlots = (chestId: string): number =>') &&
    warehouseStoreSource.includes('return getVisibleChestSlotCountFromItems(simulatedItems) <= cap') &&
    warehouseStoreSource.includes('const actual = getAddableQuantityToChest(chestId, slot.itemId, requested, slot.quality, slot)') &&
    warehouseStoreSource.includes('items: compactChestItems((Array.isArray(chest.items) ? chest.items : [])'),
  'Warehouse chests must compact legacy same-stack slots and count capacity by visible item-quality stacks while preserving hidden source batches.'
)
assert(
  homeViewSource.includes("import { getVisibleInventoryItemKey, mergeVisibleInventoryItems, useInventoryStore } from '@/stores/useInventoryStore'") &&
    homeViewSource.includes('const currentOpenChestItems = computed(() => currentOpenChest.value ? mergeVisibleInventoryItems(currentOpenChest.value.items) : [])') &&
    homeViewSource.includes('{{ warehouseStore.getChestUsedSlots(chest.id) }}/{{ warehouseStore.getChestCapacity(chest.id) }}') &&
    homeViewSource.includes('{{ warehouseStore.getChestUsedSlots(currentOpenChest.id) }}/{{ warehouseStore.getChestCapacity(currentOpenChest.id) }}') &&
    homeViewSource.includes('v-if="currentOpenChestItems.length > 0"') &&
    homeViewSource.includes('v-for="item in currentOpenChestItems"') &&
    homeViewSource.includes(':key="getVisibleInventoryItemKey(item)"') &&
    homeViewSource.includes('const chestItemKeys = new Set(currentOpenChestItems.value.map(getVisibleInventoryItemKey))') &&
    homeViewSource.includes('return chestItemKeys.has(getVisibleInventoryItemKey(i))'),
  'Home chest and void chest views should merge visible item-quality rows while preserving batch-level calculations in the store.'
)
assert(
  gameLayoutSource.includes("import { getVisibleInventoryItemKey, mergeVisibleInventoryItems, useInventoryStore } from '@/stores/useInventoryStore'") &&
    gameLayoutSource.includes('const getVisibleVoidChestItems = (chestId: string) =>') &&
    gameLayoutSource.includes('return chest ? mergeVisibleInventoryItems(chest.items) : []') &&
    gameLayoutSource.includes('{{ warehouseStore.getChestUsedSlots(vc.id) }}/{{ warehouseStore.getChestCapacity(vc.id) }}') &&
    gameLayoutSource.includes('v-if="getVisibleVoidChestItems(vc.id).length > 0"') &&
    gameLayoutSource.includes('v-for="item in getVisibleVoidChestItems(vc.id)"') &&
    gameLayoutSource.includes(':key="getVisibleInventoryItemKey(item)"') &&
    gameLayoutSource.includes('const chestItemKeys = new Set(getVisibleVoidChestItems(chest.id).map(getVisibleInventoryItemKey))') &&
    gameLayoutSource.includes('return chestItemKeys.has(getVisibleInventoryItemKey(i))'),
  'Global void chest modal must merge visible item-quality rows and duplicate-deposit keys while keeping raw slot metadata for withdrawal and pricing.'
)
assert(
  inventoryViewSource.includes('Math.max(0, inventoryStore.capacity - filteredItems.length)'),
  'Inventory empty placeholders should be based on visible merged items, not hidden batch count.'
)
for (const [label, source] of [
  ['NPC gift list', npcViewSource],
  ['spouse gift list', cottageViewSource],
  ['hidden NPC offering list', hiddenNpcModalSource],
  ['home chest deposit list', homeViewSource],
  ['void chest deposit list', gameLayoutSource],
  ['cellar aging list', cottageViewSource]
]) {
  assert(source.includes('inventoryStore.visibleItems.filter'), `${label} must use merged visible inventory stacks instead of raw batch slots.`)
}
assert(
  npcViewSource.includes('inventoryStore.visibleItems.find(i => !i.locked') &&
    npcViewSource.includes('inventoryStore.visibleItems.filter(i =>') &&
    cottageViewSource.includes('inventoryStore.visibleItems.filter(i =>') &&
    hiddenNpcModalSource.includes('inventoryStore.visibleItems.filter(i =>'),
  'Gift and offering detail/list views must hide locked visible stacks and avoid raw batch lookups.'
)
assert(
  inventoryViewSource.includes('removeItem: () => inventoryStore.removeItemForEating(itemId, 1, quality)') &&
    inventoryViewSource.includes('if (!inventoryStore.removeUnlockedItem(itemId, 1, quality)) return') &&
    inventoryViewSource.includes('if (!inventoryStore.removeUnlockedItem(itemId, qty, quality)) return') &&
    cookingStoreSource.includes('inventoryStore.removeItemForEating(foodItemId, 1, quality)') &&
    cookingStoreSource.includes('inventoryStore.removeUnlockedItem(itemId, 1, quality)') &&
    miningStoreSource.includes("inventoryStore.removeUnlockedItem('guild_badge', 1, quality)") &&
    miningStoreSource.includes("inventoryStore.removeUnlockedItem('slayer_charm')") &&
    miningStoreSource.includes("inventoryStore.removeUnlockedItem('monster_lure')") &&
    miningStoreSource.includes('inventoryStore.getItemCount(itemId, q)') &&
    miningStoreSource.includes('inventoryStore.removeItemForEating(itemId, 1, quality)') &&
    npcStoreSource.includes('inventoryStore.removeUnlockedItem(itemId, 1, quality)') &&
    hiddenNpcStoreSource.includes('inventoryStore.removeUnlockedItem(itemId, 1, quality)') &&
    homeStoreSource.includes('inventoryStore.removeUnlockedItem(itemId, 1, quality)'),
  'Inventory eating should allow locked food while use/gift/offering/cellar consumption keeps locked item protection.'
)

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 496

  assert(inventoryStore.MAX_CAPACITY === inventoryCapacityModule.INVENTORY_REGULAR_MAX_CAPACITY, '普通背包扩容上限应由统一容量常量提供。')
  assert(inventoryStore.expandCapacity() === true, '普通扩容应允许 496 格扩至 500 格。')
  assert(inventoryStore.capacity === 500, '普通扩容 496 格后应正好钳制到 500 格。')
  assert(inventoryStore.expandCapacity() === false, '普通扩容达到 500 格后应失败。')
  assert(inventoryStore.capacity === 500, '普通扩容失败后容量不应继续增长。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 498

  assert(inventoryStore.expandCapacity() === true, '普通扩容应允许异常 498 格存档补到上限。')
  assert(inventoryStore.capacity === 500, '普通扩容应把 498 格钳制到 500 格，不能扩到 502 格。')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 500

  assert(inventoryStore.expandCapacityExtra() === true, '超限扩容商品应允许突破普通 500 格上限。')
  assert(inventoryStore.capacity === 501, '超限扩容应能从 500 格增加到 501 格。')
}

{
  const priceCases = [
    [196, 22000],
    [200, 23000],
    [296, 47000],
    [300, 48500],
    [396, 84500],
    [400, 87000],
    [496, 147000]
  ]
  for (const [capacity, expectedPrice] of priceCases) {
    assert(
      inventoryCapacityModule.getInventoryExpansionPrice(capacity) === expectedPrice,
      `背包 ${capacity} 格扩容价格应为 ${expectedPrice} 文。`
    )
  }
  assert(inventoryCapacityModule.getNextInventoryCapacity(496) === 500, '496 格下一次普通扩容目标应为 500 格。')
  assert(inventoryCapacityModule.getNextInventoryCapacity(498) === 500, '498 格下一次普通扩容目标应钳制为 500 格。')
  assert(inventoryCapacityModule.getNextInventoryCapacity(500) === 500, '500 格之后普通扩容目标应保持 500 格。')
}

{
  assert(shopViewSource.includes('@click="openBagExpansionModal"'), '背包扩容入口应使用专用打开函数，避免内联静态价格快照。')
  assert(
    shopViewSource.includes('() => `当前${inventoryStore.capacity}格 → ${nextBagCapacity.value}格`'),
    '背包扩容弹窗描述应随当前背包容量刷新。'
  )
  assert(
    shopViewSource.includes('() => discounted(bagPrice.value)'),
    '背包扩容弹窗价格应随当前背包容量刷新。'
  )
  assert(
    shopViewSource.includes('{{ buyModalPrice }}文') && shopViewSource.includes('return buyModalPrice.value * buyQuantity.value'),
    '购买弹窗展示和总价应读取实时价格。'
  )
}

{
  assert(
    farmViewSource.includes('!!item.def') &&
      farmViewSource.includes('!item.locked') &&
      farmViewSource.includes("item.origin !== 'shop'") &&
      farmViewSource.includes("item.def.category !== 'seed'"),
    'Farm shipping-box candidates must exclude locked and shop-origin inventory slots.'
  )
  assert(
    shopViewSource.includes('const sellableItems = computed<SellableInventoryItem[]>(() =>') &&
      shopViewSource.includes('const merged = new Map<string, SellableInventoryItem>()') &&
      shopViewSource.includes('const key = `${item.itemId}:${item.quality}`') &&
      shopViewSource.includes('existing.quantity += item.quantity') &&
      shopViewSource.includes(':key="`${item.itemId}-${item.quality}`"') &&
      shopViewSource.includes('@click="openSellModal(item.itemId, item.quality)"'),
    'Shop sell list must merge same-item same-quality inventory batches instead of exposing raw source slots.'
  )
  assert(
    shopViewSource.includes('shopStore.getInventoryItemSellPriceBreakdowns(data.itemId, 1, data.quality)') &&
      shopViewSource.includes('shopStore.getInventoryItemSellPriceBreakdowns(data.itemId, sellQuantity.value, data.quality)') &&
      shopViewSource.includes('shopStore.sellInventoryItem(modal.itemId, count, modal.quality)') &&
      shopStoreSource.includes('const buildInventoryItemSellPlan = (itemId: string, quantity: number, quality: Quality)') &&
      shopStoreSource.includes('const earned = sellInventorySlot(entry.inventoryIndex, entry.quantity)'),
    'Shop merged sell modal must keep source-aware pricing by delegating settlement to raw inventory slots.'
  )
  assert(
    shopViewSource.includes('if (item.locked || item.itemId.startsWith(\'seed_\')) continue'),
    'Shop sell list must keep locked inventory slots hidden.'
  )
}

{
  const { inventoryStore, playerStore, shopStore } = freshInventoryPlayerAndShopStores()
  const itemId = 'corn'
  const quality = 'normal'
  inventoryStore.items = [{ itemId, quantity: 3, quality, locked: true }]
  const startingMoney = playerStore.money

  assert(inventoryStore.getUnlockedItemCount(itemId, quality) === 0, 'Locked slots should not count as unlocked sellable stock.')
  assert(shopStore.sellItem(itemId, 1, quality) === 0, 'Direct shop sale must reject locked inventory slots.')
  assert(inventoryStore.getItemCount(itemId, quality) === 3, 'Direct shop sale must leave locked inventory quantity unchanged.')
  assert(playerStore.money === startingMoney, 'Rejected locked direct sale must not grant money.')
  assert(shopStore.addToShippingBox(itemId, 1, quality) === false, 'Shipping box must reject locked inventory slots.')
  assert(inventoryStore.getItemCount(itemId, quality) === 3, 'Shipping box must leave locked inventory quantity unchanged.')
  assert(shopStore.shippingBox.length === 0, 'Shipping box must not receive locked inventory items.')

  inventoryStore.items = [{ itemId, quantity: 3, quality, locked: false }]
  const earned = shopStore.sellItem(itemId, 1, quality)
  assert(earned > 0, 'Direct shop sale should still work for unlocked inventory slots.')
  assert(inventoryStore.getItemCount(itemId, quality) === 2, 'Direct shop sale should consume unlocked inventory quantity.')

  inventoryStore.items = [{ itemId, quantity: 3, quality, locked: false }]
  assert(shopStore.addToShippingBox(itemId, 2, quality) === true, 'Shipping box should still accept unlocked inventory slots.')
  assert(inventoryStore.getItemCount(itemId, quality) === 1, 'Shipping box should consume unlocked inventory quantity.')
  assert(
    shopStore.shippingBox.some(entry => entry.itemId === itemId && entry.quality === quality && entry.quantity === 2),
    'Shipping box should record accepted unlocked items.'
  )
}

{
  const inventoryStore = freshInventoryStore()
  const shopMetaA = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 }
  const shopMetaB = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 450 }

  assert(inventoryStore.addItemExact('silk_ribbon', 1, 'normal', true, shopMetaA) === true, 'Shop-origin item should be addable with metadata.')
  assert(inventoryStore.addItemExact('silk_ribbon', 2, 'normal', true, shopMetaA) === true, 'Same shop-origin batch should merge.')
  assert(inventoryStore.addItemExact('silk_ribbon', 1, 'normal') === true, 'Normal same item should be addable beside shop-origin item.')
  assert(inventoryStore.addItemExact('silk_ribbon', 1, 'normal', true, shopMetaB) === true, 'Different shop purchase price should create a separate batch.')

  const shopStacks = inventoryStore.items.filter(item => item.itemId === 'silk_ribbon' && item.origin === 'shop')
  const normalStacks = inventoryStore.items.filter(item => item.itemId === 'silk_ribbon' && item.origin !== 'shop')
  assert(shopStacks.some(item => item.purchaseUnitPrice === 500 && item.quantity === 3), 'Same shop metadata should merge into one stack.')
  assert(shopStacks.some(item => item.purchaseUnitPrice === 450 && item.quantity === 1), 'Different shop metadata should stay separate.')
  assert(normalStacks.length === 1 && normalStacks[0]?.quantity === 1, 'Normal same item should not merge with shop-origin stack.')

  inventoryStore.sortItems()
  assert(
    inventoryStore.items.filter(item => item.itemId === 'silk_ribbon').length === 3,
    'Sorting should preserve separate normal and shop-origin batches.'
  )

  const serialized = inventoryStore.serialize()
  const reloaded = freshInventoryStore()
  reloaded.deserialize(serialized)
  assert(
    reloaded.items.some(item => item.itemId === 'silk_ribbon' && item.origin === 'shop' && item.purchaseDay === '2_1_9' && item.purchaseUnitPrice === 500 && item.quantity === 3),
    'Serialize/deserialize should preserve shop-origin metadata.'
  )
}

{
  const inventoryStore = freshInventoryStore()
  const shopMeta = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 }

  assert(inventoryStore.addItemExact('silk_ribbon', 2, 'normal', true, shopMeta) === true, 'Shop-origin stack should be addable before visible lock test.')
  assert(inventoryStore.addItemExact('silk_ribbon', 1, 'normal') === true, 'Normal stack should be addable before visible lock test.')
  assert(inventoryStore.items.filter(item => item.itemId === 'silk_ribbon' && item.quality === 'normal').length === 2, 'Underlying shop and normal batches should stay separate for pricing.')
  assert(inventoryStore.visibleItems.length === 1, 'Visible inventory should merge normal and shop-origin same-item same-quality batches into one player-facing row.')
  assert(inventoryStore.visibleItems[0]?.itemId === 'silk_ribbon' && inventoryStore.visibleItems[0]?.quantity === 3, 'Visible merged inventory row should sum quantities across hidden batches.')

  inventoryStore.toggleLock('silk_ribbon', 'normal')
  assert(inventoryStore.visibleItems[0]?.locked === true, 'Visible merged row should show locked when any underlying same-item same-quality batch is locked.')
  assert(
    inventoryStore.items
      .filter(item => item.itemId === 'silk_ribbon' && item.quality === 'normal')
      .every(item => item.locked === true),
    'Visible lock action should lock every same-item same-quality batch.'
  )

  inventoryStore.toggleLock('silk_ribbon', 'normal')
  assert(inventoryStore.visibleItems[0]?.locked === false, 'Visible merged row should clear locked after the merged unlock action.')
  assert(
    inventoryStore.items
      .filter(item => item.itemId === 'silk_ribbon' && item.quality === 'normal')
      .every(item => item.locked !== true),
    'Visible unlock action should unlock every same-item same-quality batch.'
  )

  assert(inventoryStore.removeUnlockedItem('silk_ribbon', 3, 'normal') === true, 'Visible discard/use path should be able to consume across hidden same-item same-quality batches.')
  assert(inventoryStore.visibleItems.length === 0, 'Visible detail should have no matching row after the merged quantity reaches zero.')
}

{
  const inventoryStore = freshInventoryStore()
  const shopMeta = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 }
  inventoryStore.items = [
    { itemId: 'silk_ribbon', quantity: 2, quality: 'normal', locked: true },
    { itemId: 'silk_ribbon', quantity: 1, quality: 'normal', ...shopMeta }
  ]

  assert(inventoryStore.visibleItems.length === 1 && inventoryStore.visibleItems[0]?.locked === true, 'Merged visible item should remain locked if one hidden batch is locked.')
  assert(inventoryStore.removeUnlockedItem('silk_ribbon', 1, 'normal') === true, 'Unlocked hidden batch can still be consumed when called explicitly.')
  assert(inventoryStore.getItemCount('silk_ribbon', 'normal') === 2, 'Locked hidden batch should remain after consuming the only unlocked batch.')
  assert(inventoryStore.visibleItems.length === 1 && inventoryStore.visibleItems[0]?.locked === true, 'Visible row should remain open and locked while only locked quantity remains.')
}

{
  const inventoryStore = freshInventoryStore()
  const shopMeta = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 }
  inventoryStore.capacity = 1
  inventoryStore.items = [{ itemId: 'silk_ribbon', quantity: 997, quality: 'normal' }]
  inventoryStore.tempItems = [{ itemId: 'silk_ribbon', quantity: 5, quality: 'normal', ...shopMeta }]
  assert(inventoryStore.getMovableTempItemCount(0) === 0, 'Temp shop-origin stack must not merge into a normal same-item stack.')

  inventoryStore.items = [{ itemId: 'silk_ribbon', quantity: 997, quality: 'normal', ...shopMeta }]
  assert(inventoryStore.getMovableTempItemCount(0) === 2, 'Temp shop-origin stack should merge only with matching shop metadata.')
  assert(inventoryStore.moveFromTemp(0) === false, 'Partial temp move should return false when leftovers remain.')
  assert(inventoryStore.items[0]?.quantity === 999 && inventoryStore.items[0]?.origin === 'shop', 'Temp move should preserve shop-origin metadata on merge.')
  assert(inventoryStore.tempItems[0]?.quantity === 3 && inventoryStore.tempItems[0]?.origin === 'shop', 'Temp leftovers should keep shop-origin metadata.')
}

{
  const inventoryStore = freshInventoryStore()
  inventoryStore.capacity = 1
  inventoryStore.items = [{ itemId: 'prismatic_shard', quantity: 998, quality: 'normal' }]

  assert(inventoryStore.canAddItem('prismatic_shard', 1, 'supreme') === true, 'Gem add preflight should normalize quality before checking stack capacity.')
  assert(inventoryStore.addItemExact('prismatic_shard', 1, 'supreme') === true, 'Gem add should normalize non-normal quality and merge into the normal stack.')
  assert(inventoryStore.items.length === 1, 'Normalized gem quality should not create a hidden separate stack.')
  assert(inventoryStore.items[0]?.itemId === 'prismatic_shard' && inventoryStore.items[0]?.quality === 'normal' && inventoryStore.items[0]?.quantity === 999, 'Prismatic shard should remain one normal-quality stack after normalized add.')
}

{
  const { inventoryStore, warehouseStore } = freshInventoryAndWarehouseStores()
  const shopMeta = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 }
  assert(warehouseStore.addChest('wood', 'QA') === true, 'Warehouse test chest should be created.')
  const chestId = warehouseStore.chests[0]?.id
  assert(typeof chestId === 'string', 'Warehouse test chest id should exist.')
  assert(inventoryStore.addItemExact('silk_ribbon', 2, 'normal', true, shopMeta) === true, 'Shop-origin item should be prepared for warehouse test.')
  assert(warehouseStore.depositInventorySlotToChest(chestId, 0, 2) === 2, 'Warehouse deposit should move the exact inventory slot.')
  assert(warehouseStore.chests[0]?.items[0]?.origin === 'shop', 'Warehouse deposit should preserve shop origin.')
  assert(warehouseStore.chests[0]?.items[0]?.purchaseUnitPrice === 500, 'Warehouse deposit should preserve purchase unit price.')
  assert(warehouseStore.withdrawFromChest(chestId, 'silk_ribbon', 2, 'normal') === true, 'Warehouse withdraw should return the stored batch.')
  assert(inventoryStore.items[0]?.origin === 'shop' && inventoryStore.items[0]?.purchaseUnitPrice === 500, 'Warehouse withdraw should preserve shop-origin metadata.')
}

{
  const { inventoryStore, warehouseStore } = freshInventoryAndWarehouseStores()
  const shopMeta = { origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 800 }
  assert(warehouseStore.addChest('wood', 'QA') === true, 'Warehouse visible-capacity test chest should be created.')
  const chestId = warehouseStore.chests[0]?.id
  assert(typeof chestId === 'string', 'Warehouse visible-capacity chest id should exist.')

  warehouseStore.chests[0].items = [
    { itemId: 'dragon_jade', quantity: 1, quality: 'normal' },
    { itemId: 'dragon_jade', quantity: 1, quality: 'normal', ...shopMeta },
    { itemId: 'prismatic_shard', quantity: 1, quality: 'normal' },
    { itemId: 'copper_ore', quantity: 1, quality: 'normal' },
    { itemId: 'iron_ore', quantity: 1, quality: 'normal' },
    { itemId: 'gold_ore', quantity: 1, quality: 'normal' },
    { itemId: 'iridium_ore', quantity: 1, quality: 'normal' },
    { itemId: 'quartz', quantity: 1, quality: 'normal' },
    { itemId: 'ruby', quantity: 1, quality: 'normal' },
    { itemId: 'jade', quantity: 1, quality: 'normal' }
  ]
  inventoryStore.items = [
    { itemId: 'dragon_jade', quantity: 1, quality: 'normal', ...shopMeta },
    { itemId: 'stone', quantity: 1, quality: 'normal' }
  ]

  assert(warehouseStore.getChestCapacity(chestId) === 9, 'Wood chest capacity should stay at 9 visible slots before NPC bonuses.')
  assert(warehouseStore.getChestUsedSlots(chestId) === 9, 'Shop-origin and self-acquired dragon jade should share one visible warehouse slot.')
  assert(warehouseStore.isChestFull(chestId) === false, 'A full visible chest with partial stacks should still allow merging into existing visible item-quality rows.')
  assert(warehouseStore.depositInventorySlotToChest(chestId, 0, 1) === 1, 'Warehouse should accept same item-quality stock even when hidden source batches already fill raw slot count.')
  assert(warehouseStore.getChestItemCount(chestId, 'dragon_jade', 'normal') === 3, 'Warehouse merged-capacity deposit should preserve source-aware raw batches but increase visible total.')
  assert(warehouseStore.depositInventorySlotToChest(chestId, 0, 1) === 0, 'Warehouse should reject a new visible item-quality row once visible capacity is full.')
}

{
  const { warehouseStore } = freshInventoryAndWarehouseStores()
  warehouseStore.deserialize({
    unlocked: true,
    chests: [
      {
        id: 'qa_void_chest',
        tier: 'void',
        label: 'QA',
        voidRole: 'output',
        items: [
          { itemId: 'dragon_jade', quantity: 400, quality: 'normal' },
          { itemId: 'dragon_jade', quantity: 300, quality: 'normal' },
          { itemId: 'dragon_jade', quantity: 2, quality: 'fine' },
          { itemId: 'silk_ribbon', quantity: 5, quality: 'normal' },
          { itemId: 'silk_ribbon', quantity: 998, quality: 'normal', origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 },
          { itemId: 'silk_ribbon', quantity: 2, quality: 'normal', origin: 'shop', purchaseDay: '2_1_9', purchaseUnitPrice: 500 }
        ]
      }
    ]
  })

  const chest = warehouseStore.chests[0]
  assert(chest?.items.some(item => item.itemId === 'dragon_jade' && item.quality === 'normal' && item.quantity === 702), 'Void chest migration should normalize gem quality and compact dragon jade into one normal stack.')
  assert(!chest?.items.some(item => item.itemId === 'dragon_jade' && item.quality !== 'normal'), 'Void chest migration should not preserve hidden gem quality variants.')
  assert(chest?.items.some(item => item.itemId === 'silk_ribbon' && item.origin !== 'shop' && item.quantity === 5), 'Warehouse migration should keep self-acquired stock as its own calculation batch.')
  assert(chest?.items.some(item => item.itemId === 'silk_ribbon' && item.origin === 'shop' && item.purchaseUnitPrice === 500 && item.quantity === 999), 'Warehouse migration should preserve shop-origin metadata while compacting to stack cap.')
  assert(chest?.items.some(item => item.itemId === 'silk_ribbon' && item.origin === 'shop' && item.purchaseUnitPrice === 500 && item.quantity === 1), 'Warehouse migration should split overflow above stack cap.')

  const visibleChestItems = inventoryStoreModule.mergeVisibleInventoryItems(chest?.items ?? [])
  assert(visibleChestItems.some(item => item.itemId === 'silk_ribbon' && item.quality === 'normal' && item.quantity === 1005), 'Visible chest rows should merge shop-origin and self-acquired batches for display only.')
}

{
  assert(
    inventoryViewSource.includes("import { useMiningStore } from '@/stores/useMiningStore'") &&
      inventoryViewSource.includes('miningStore.isGuildGrowthItem(itemId)') &&
      inventoryViewSource.includes('miningStore.useGuildGrowthItem(itemId, quality)'),
    '背包页应允许公会永久成长道具直接使用，并复用 miningStore 永久加成入口。'
  )
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
  const maxHp = playerStore.getMaxHp()
  playerStore.hp = maxHp - 40
  playerStore.stamina = playerStore.maxStamina
  inventoryStore.items = [{ itemId: 'combat_tonic', quantity: 1, quality: 'normal', locked: true }]

  const result = applyRecoveryItem({ inventoryStore, playerStore, itemId: 'combat_tonic' })
  assert(inventoryUseRulesModule.hasItemRecovery(def), 'Locked HP-only item fixture should still be a recovery item.')
  assert(result.success === true && result.consumed === true, 'Locked HP-only recovery item should be edible through inventory recovery.')
  assert(inventoryStore.getItemCount('combat_tonic') === 0, 'Locked HP-only recovery item quantity should be consumed.')
  assert(playerStore.hp === maxHp - 10, 'Locked HP-only recovery item should restore HP.')
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
  setActivePinia(createPinia())
  const inventoryStore = inventoryStoreModule.useInventoryStore()
  const playerStore = playerStoreModule.usePlayerStore()
  const miningStore = miningStoreModule.useMiningStore()
  const baseMaxHp = playerStore.getMaxHp()
  inventoryStore.items = [
    { itemId: 'guild_badge', quantity: 1, quality: 'normal' },
    { itemId: 'life_talisman', quantity: 1, quality: 'normal' },
    { itemId: 'defense_charm', quantity: 1, quality: 'normal' },
    { itemId: 'lucky_coin', quantity: 1, quality: 'normal' }
  ]

  assert(miningStore.isExploring === false && miningStore.inCombat === false, '公会永久成长道具背包用例应从非矿洞状态开始。')

  const badge = miningStore.useGuildGrowthItem('guild_badge', 'normal')
  assert(badge.success === true && miningStore.guildBadgeBonusAttack === 3, '背包使用公会徽章应在非矿洞状态永久增加攻击力。')
  assert(inventoryStore.getItemCount('guild_badge') === 0, '背包使用公会徽章后应消耗 1 个。')

  const talisman = miningStore.useGuildGrowthItem('life_talisman', 'normal')
  assert(talisman.success === true && miningStore.guildBonusMaxHp === 15, '背包使用生命护符应在非矿洞状态永久增加最大生命值。')
  assert(playerStore.getMaxHp() === baseMaxHp + 15, '生命护符背包使用后玩家最大生命值应立即读取到新增加成。')
  assert(inventoryStore.getItemCount('life_talisman') === 0, '背包使用生命护符后应消耗 1 个。')

  const charm = miningStore.useGuildGrowthItem('defense_charm', 'normal')
  assert(charm.success === true && Math.abs(miningStore.guildBonusDefense - 0.03) < 0.000001, '背包使用守护符应在非矿洞状态永久增加防御。')
  assert(inventoryStore.getItemCount('defense_charm') === 0, '背包使用守护符后应消耗 1 个。')

  const coin = miningStore.useGuildGrowthItem('lucky_coin', 'normal')
  assert(coin.success === true && Math.abs(miningStore.guildBonusDropRate - 0.05) < 0.000001, '背包使用幸运铜钱应在非矿洞状态永久增加怪物掉落收益。')
  assert(inventoryStore.getItemCount('lucky_coin') === 0, '背包使用幸运铜钱后应消耗 1 个。')
}

{
  setActivePinia(createPinia())
  const inventoryStore = inventoryStoreModule.useInventoryStore()
  const miningStore = miningStoreModule.useMiningStore()

  inventoryStore.items = [{ itemId: 'guild_badge', quantity: 1, quality: 'normal', locked: true }]
  const badge = miningStore.useGuildGrowthItem('guild_badge', 'normal')
  assert(badge.success === false, 'Locked guild growth item should not be consumed from inventory use.')
  assert(miningStore.guildBadgeBonusAttack === 0, 'Locked guild badge should not grant permanent attack.')
  assert(inventoryStore.getItemCount('guild_badge') === 1, 'Locked guild badge quantity should stay unchanged.')

  miningStore.isExploring = true
  inventoryStore.items = [{ itemId: 'slayer_charm', quantity: 1, quality: 'normal', locked: true }]
  const slayerCharm = miningStore.useCombatItem('slayer_charm')
  assert(slayerCharm.success === false, 'Locked slayer charm should not be consumed in mining use.')
  assert(inventoryStore.getItemCount('slayer_charm') === 1, 'Locked slayer charm quantity should stay unchanged.')
}

{
  setActivePinia(createPinia())
  const inventoryStore = inventoryStoreModule.useInventoryStore()
  const playerStore = playerStoreModule.usePlayerStore()
  const cookingStore = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useCookingStore.ts')).href).then(module => module.useCookingStore())

  playerStore.stamina = Math.max(0, playerStore.maxStamina - 30)
  inventoryStore.items = [{ itemId: 'food_stir_fried_cabbage', quantity: 1, quality: 'normal', locked: true }]
  const lockedFood = cookingStore.eat('stir_fried_cabbage', 'normal')
  assert(lockedFood.success === true, 'Locked cooked food should be consumed by cookingStore.eat.')
  assert(inventoryStore.getItemCount('food_stir_fried_cabbage') === 0, 'Locked cooked food quantity should be consumed.')
  assert(playerStore.stamina > playerStore.maxStamina - 30, 'Locked cooked food should still restore stamina.')
}

{
  setActivePinia(createPinia())
  const inventoryStore = inventoryStoreModule.useInventoryStore()
  const homeStore = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useHomeStore.ts')).href).then(module => module.useHomeStore())
  homeStore.farmhouseLevel = 3
  inventoryStore.items = [{ itemId: 'watermelon_wine', quantity: 1, quality: 'normal', locked: true }]

  assert(homeStore.startAging('watermelon_wine', 'normal') === false, 'Locked cellar-ageable item should not be consumed into the cellar.')
  assert(homeStore.cellarSlots.length === 0, 'Locked cellar-ageable item should not create a cellar slot.')
  assert(inventoryStore.getItemCount('watermelon_wine', 'normal') === 1, 'Locked cellar-ageable quantity should stay unchanged.')
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
  playerStore.hp = maxHp - 30
  playerStore.stamina = playerStore.maxStamina - 30
  inventoryStore.items = [{ itemId: 'adventurer_ration', quantity: 3, quality: 'normal', locked: true }]

  const result = miningStore.useCombatItem('adventurer_ration', 3)
  assert(result.success === true, '矿洞批量吃冒险口粮应成功')
  assert(result.message.includes('×2'), '矿洞批量吃冒险口粮应汇总实际使用数量')
  assert(playerStore.hp === maxHp, '矿洞批量吃冒险口粮应在 HP 满时停止')
  assert(playerStore.stamina === playerStore.maxStamina, '矿洞批量吃冒险口粮应在体力满时停止')
  assert(inventoryStore.getItemCount('adventurer_ration') === 1, '请求吃 3 个冒险口粮但满状态后应只消耗 2 个')

  const blocked = miningStore.useCombatItem('adventurer_ration', 3)
  assert(blocked.success === false, 'HP/体力已满时矿洞批量吃食物应被阻止')
  assert(inventoryStore.getItemCount('adventurer_ration') === 1, 'HP/体力已满时不应继续消耗冒险口粮')
}

if (errors.length > 0) {
  console.error('Inventory guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Inventory guard passed.')
