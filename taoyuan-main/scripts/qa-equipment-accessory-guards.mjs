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

const assertApprox = (actual, expected, message, epsilon = 0.00001) => {
  if (Math.abs(actual - expected) > epsilon) {
    errors.push(`${message}（实际 ${actual}，期望 ${expected}）`)
  }
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
      // noop
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
          const currentRoute = { value: { name: 'processing', path: '/game/processing' } }
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
      dataset: {},
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
    hash: '#/game/processing',
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
const dataModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/equipmentAccessories.ts')).href)
const glossaryModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/glossary.ts')).href)
const itemModule = await import(pathToFileURL(path.join(projectRoot, 'src/data/items.ts')).href)
const accessoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useEquipmentAccessoryStore.ts')).href)
const gameStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useGameStore.ts')).href)
const inventoryStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/useInventoryStore.ts')).href)
const playerStoreModule = await import(pathToFileURL(path.join(projectRoot, 'src/stores/usePlayerStore.ts')).href)
await import(pathToFileURL(path.join(projectRoot, 'src/stores/useSaveStore.ts')).href)

const freshStores = () => {
  setActivePinia(createPinia())
  return {
    accessoryStore: accessoryStoreModule.useEquipmentAccessoryStore(),
    gameStore: gameStoreModule.useGameStore(),
    inventoryStore: inventoryStoreModule.useInventoryStore(),
    playerStore: playerStoreModule.usePlayerStore(),
    saveStore: null
  }
}

const itemIds = new Set(itemModule.ITEMS.map(item => item.id))
const accessoryIds = new Set(dataModule.EQUIPMENT_ACCESSORY_DEFS.map(def => def.id))
const glossaryById = new Map(glossaryModule.GLOSSARY.map(entry => [entry.id, entry]))

assert(dataModule.EQUIPMENT_ACCESSORY_FAMILIES.length === 3, '应有 3 条配件线。')
assert(dataModule.EQUIPMENT_ACCESSORY_DEFS.length === 9, '应有 9 种配件定义。')
assert(new Set(dataModule.EQUIPMENT_ACCESSORY_DEFS.map(def => def.id)).size === 9, '配件 ID 不应重复。')
assert(dataModule.EQUIPMENT_ACCESSORY_SLOT_IDS.length === 9, '应有 9 个配件槽。')
assert(dataModule.EQUIPMENT_ACCESSORY_TIERS.join(',') === '1,2,3,4', '应支持 1-4 阶。')
assert(dataModule.EQUIPMENT_ACCESSORY_QUALITIES.join(',') === 'normal,fine,excellent,supreme', '应支持 4 个品质。')
assert(dataModule.EQUIPMENT_ACCESSORY_DEFS.every(def => dataModule.EQUIPMENT_ACCESSORY_SLOT_IDS.includes(def.slotId)), '每个配件定义都应指向合法槽位。')
assert(dataModule.EQUIPMENT_ACCESSORY_FAMILIES.every(family => family.slotIds.length === 3), '每条配件线都应有 3 个槽位。')
assert(dataModule.EQUIPMENT_ACCESSORY_UPGRADE_COSTS.length === 19, '1-20 级升级成本应有 19 档。')

for (const def of dataModule.EQUIPMENT_ACCESSORY_DEFS) {
  const entry = glossaryById.get(`equipment_accessory_${def.id}`)
  assert(entry, `配件百科词条缺失：${def.id}`)
  if (!entry) continue
  assert(entry.category === 'system' && entry.categoryLabel === '配件', `配件百科分类异常：${def.id}`)
  assert(!entry.itemId, `配件本体不应伪装成普通背包物品：${def.id}`)
  assert(entry.relatedPanels.some(panel => panel.panel === 'upgrade'), `配件百科必须能跳到铁匠铺：${def.id}`)
  for (const relatedId of [
    `item_${dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID}`,
    `item_${dataModule.EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID}`,
    `item_${dataModule.EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID}`
  ]) {
    assert(entry.relatedEntryIds.includes(relatedId), `配件百科缺少材料关联：${def.id} -> ${relatedId}`)
  }
  for (const keyword of [def.name, def.id, '配件', '合成', '稳固石', '一阶', '极品', '套装效果']) {
    assert(entry.searchText.includes(keyword.toLowerCase()), `配件百科搜索缺少关键词：${def.id} -> ${keyword}`)
  }
}

const totalInvestment = dataModule.getEquipmentAccessoryTotalUpgradeInvestment(20)
const totalMoney = dataModule.getEquipmentAccessoryTotalUpgradeMoney(20)
assert(totalInvestment.accessoryMaterial === 2678, '1->20 配件材料总成本应为 2678。')
assert(totalInvestment.tuningStone === 58, '1->20 调校石总成本应为 58。')
assert(totalMoney === 306000, '1->20 铜钱总成本应为 306000。')
assert(dataModule.EQUIPMENT_ACCESSORY_UPGRADE_COSTS[0].accessoryMaterial < dataModule.EQUIPMENT_ACCESSORY_UPGRADE_COSTS.at(-1).accessoryMaterial, '升级成本应明显递增。')
assert(dataModule.getEquipmentAccessoryAnnualPace().dailyAccessoryMaterialEquivalent > 23, '年度节奏应接近每天 24 份配件材料。')

assert(dataModule.getEquipmentAccessoryEffectValue({ defId: 'weaponry_blade_core', tier: 4, quality: 'supreme', level: 20 }, 'accessory_attack_flat') === 64, '四阶极品 Lv20 刃芯攻击应锁定为 64。')
assert(dataModule.getEquipmentAccessoryEffectValue({ defId: 'armor_lining', tier: 4, quality: 'supreme', level: 20 }, 'accessory_max_hp_flat') === 200, '四阶极品 Lv20 内衬生命应锁定为 200。')
assert(dataModule.getEquipmentAccessoryEffectValue({ defId: 'weaponry_guard', tier: 4, quality: 'supreme', level: 20 }, 'accessory_crit_rate') === 0.2, '四阶极品 Lv20 护手暴击率应锁定为 20%。')
assert(dataModule.getEquipmentAccessoryEffectValue({ defId: 'gathering_pick_head', tier: 4, quality: 'supreme', level: 20 }, 'accessory_mining_stamina_reduction') === 0.3, '四阶极品 Lv20 镐头挖矿体力降低应锁定为 30%。')
assert(dataModule.getEquipmentAccessoryEffectValue({ defId: 'gathering_probe', tier: 4, quality: 'supreme', level: 20 }, 'accessory_treasure_hint') === 1, '四阶极品 Lv20 探针宝物提示仍应保持 1 的上限。')
{
  const weaponrySet = dataModule.getEquipmentAccessorySetSummary('weaponry', [
    { defId: 'weaponry_blade_core', tier: 4, quality: 'supreme', level: 20 },
    { defId: 'weaponry_guard', tier: 4, quality: 'supreme', level: 20 },
    { defId: 'weaponry_inscription', tier: 4, quality: 'supreme', level: 20 }
  ])
  assertApprox(weaponrySet.effectValues.accessory_attack_flat, 15.96672, '四阶极品 Lv20 兵刃三件套攻击应约为 15.96672。')
  assert((weaponrySet.effectValues.accessory_attack_flat ?? 0) <= 18, '四阶极品 Lv20 兵刃三件套攻击不能超过 18 上限。')
}

for (const cost of dataModule.EQUIPMENT_ACCESSORY_UPGRADE_COSTS) {
  assert(cost.targetLevel >= 2 && cost.targetLevel <= 20, `升级目标等级异常：${cost.targetLevel}`)
  for (const item of [
    { itemId: dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, quantity: cost.accessoryMaterial },
    { itemId: dataModule.EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, quantity: cost.tuningStone },
    ...cost.extraItems
  ]) {
    assert(item.quantity >= 0, `升级材料数量不能为负：${cost.targetLevel}`)
    assert(itemIds.has(item.itemId), `升级材料不存在：${item.itemId}`)
  }
}

for (const itemId of [
  dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID,
  dataModule.EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID,
  dataModule.EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID
]) {
  assert(itemIds.has(itemId), `配件材料物品缺失：${itemId}`)
}

for (const recipe of dataModule.EQUIPMENT_ACCESSORY_RECIPES) {
  assert(accessoryIds.has(recipe.defId), `配件打造配方指向无效配件：${recipe.defId}`)
  assert(recipe.tier !== 3, '三阶配件不应进入工坊定向制作配方。')
  for (const item of recipe.materialCosts) {
    assert(itemIds.has(item.itemId), `打造材料不存在：${item.itemId}`)
  }
}
assert(dataModule.EQUIPMENT_ACCESSORY_RECIPES.some(recipe => recipe.tier === 1 && recipe.unlock === 'default'), '工坊应默认定向制作一阶配件。')
assert(dataModule.EQUIPMENT_ACCESSORY_RECIPES.some(recipe => recipe.tier === 2 && recipe.unlock === 'workshop_advanced'), '工坊应有后期二阶配件制作。')
assert(dataModule.EQUIPMENT_ACCESSORY_RECIPES.every(recipe => recipe.tier !== 4 || recipe.unlock === 'blueprint'), '四阶制作必须走高级蓝图。')

assert(dataModule.EQUIPMENT_ACCESSORY_FUSION_RULES.length === 12, '4 阶 x 3 个升品方向应有 12 条合成规则。')
for (const tier of dataModule.EQUIPMENT_ACCESSORY_TIERS) {
  const rates = ['normal', 'fine', 'excellent'].map(quality => dataModule.getEquipmentAccessoryFusionRule(tier, quality)?.successRate ?? 0)
  assert(rates[0] > rates[1] && rates[1] > rates[2], `${tier} 阶合成成功率应随目标品质降低。`)
}
for (const quality of ['normal', 'fine', 'excellent']) {
  const rates = dataModule.EQUIPMENT_ACCESSORY_TIERS.map(tier => dataModule.getEquipmentAccessoryFusionRule(tier, quality)?.successRate ?? 0)
  assert(rates[0] > rates[1] && rates[1] > rates[2] && rates[2] > rates[3], `${quality} 合成成功率应随阶级降低。`)
}

{
  const { accessoryStore, inventoryStore, playerStore } = freshStores()
  const accessory = accessoryStore.addAccessory('weaponry_blade_core', 1, 'normal', 'debug')
  assert(accessory?.level === 1, '新配件默认应为 1 级。')
  inventoryStore.addItemExact(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, 3000)
  inventoryStore.addItemExact(dataModule.EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, 80)
  inventoryStore.addItemExact('copper_bar', 20)
  inventoryStore.addItemExact('iron_bar', 20)
  inventoryStore.addItemExact('gold_bar', 20)
  inventoryStore.addItemExact('mythril_bar', 20)
  inventoryStore.addItemExact('iridium_bar', 20)
  inventoryStore.addItemExact('moonstone', 5)
  inventoryStore.addItemExact('prismatic_shard', 2)
  playerStore.earnMoney(400000)
  for (let level = 2; level <= 20; level++) {
    const result = accessoryStore.upgradeAccessory(accessory.instanceId)
    assert(result.success, `配件应可升级到 ${level} 级：${result.message}`)
  }
  assert(accessory.level === 20, '配件最高应升到 20 级。')
  assert(accessoryStore.upgradeAccessory(accessory.instanceId).success === false, '20 级配件不能继续升级。')
  assert(accessory.upgradeInvestment.accessoryMaterial === 2678, '升级投入应记录配件材料 2678。')
  assert(accessory.upgradeInvestment.tuningStone === 58, '升级投入应记录调校石 58。')
  assert(accessoryStore.getAccessoryEffectValue('accessory_attack_flat') === 0, '未装备配件时不应生效。')
  accessoryStore.equipAccessory(accessory.instanceId)
  assert(accessoryStore.getAccessoryEffectValue('accessory_attack_flat') > 0, '装备配件后应提供效果。')
  assert(accessoryStore.previewAccessoryDismantle(accessory.instanceId).success === false, '已装配配件不能拆解。')
  accessoryStore.unequipAccessory('weaponry_blade_core')
  const refundBefore = inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID)
  const dismantle = accessoryStore.dismantleAccessory(accessory.instanceId)
  assert(dismantle.success, `未装备未锁定配件应可拆解：${dismantle.message}`)
  assert(inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID) > refundBefore, '拆解应返还升级投入材料和基础返材。')
}

{
  const { accessoryStore, playerStore } = freshStores()
  const baselineMaxHp = playerStore.getMaxHp()
  const lining = accessoryStore.addAccessory('armor_lining', 4, 'supreme', 'debug', { level: 20 })
  assert(lining, 'QA 应能创建生命上限配件。')
  if (lining) {
    accessoryStore.equipAccessory(lining.instanceId)
    assert(playerStore.getMaxHp() > baselineMaxHp, '生命上限配件应真实接入玩家最大生命。')
    playerStore.restoreHealth(9999)
    accessoryStore.unequipAccessory('armor_lining')
    assert(playerStore.hp <= playerStore.getMaxHp(), '卸下生命上限配件后当前生命不应超过新的最大生命。')
  }
}

{
  const { accessoryStore, inventoryStore } = freshStores()
  const a = accessoryStore.addAccessory('weaponry_guard', 1, 'normal', 'debug')
  const b = accessoryStore.addAccessory('weaponry_guard', 1, 'normal', 'debug')
  const c = accessoryStore.addAccessory('weaponry_guard', 1, 'normal', 'debug')
  assert(a && b && c, 'QA 应能创建三件同名配件。')
  if (a && b && c) {
    a.level = 10
    a.upgradeInvestment = { accessoryMaterial: 188, tuningStone: 3 }
    b.level = 5
    b.upgradeInvestment = { accessoryMaterial: 28, tuningStone: 0 }
    c.level = 2
    c.upgradeInvestment = { accessoryMaterial: 4, tuningStone: 0 }
    const beforeMaterials = inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID)
    const result = accessoryStore.fuseAccessories([a.instanceId, b.instanceId, c.instanceId], { forceOutcome: 'success' })
    assert(result.success && !!result.accessory, `合成成功路径应产出新配件：${result.message}`)
    assert(result.accessory?.level === 1, '合成成功产物必须固定为 1 级。')
    assert(result.accessory?.quality === 'fine', '普通三合一成功应变为精良。')
    assert(inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID) - beforeMaterials === 220, '合成成功应返还 3 件被消耗配件的升级材料。')
    assert(!accessoryStore.getAccessoryByInstanceId(a.instanceId), '合成成功应消耗材料配件。')
  }
}

{
  const { accessoryStore, inventoryStore } = freshStores()
  const list = ['armor_lining', 'armor_lining', 'armor_lining'].map(id => accessoryStore.addAccessory(id, 2, 'fine', 'debug'))
  list.forEach((accessory, index) => {
    if (accessory) {
      accessory.level = index + 2
      accessory.upgradeInvestment = { accessoryMaterial: 10 * (index + 1), tuningStone: index }
    }
  })
  const ids = list.map(accessory => accessory?.instanceId ?? '')
  const before = inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID)
  const result = accessoryStore.fuseAccessories(ids, { forceOutcome: 'failure' })
  assert(result.success && !result.accessory, '未保护失败应不产出新配件。')
  assert(result.consumed.length === 3, '未保护失败应消耗 3 件配件本体。')
  assert(inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID) - before === 60, '未保护失败应返还 3 件被消耗配件的升级材料。')
}

{
  const { accessoryStore, inventoryStore } = freshStores()
  inventoryStore.addItemExact(dataModule.EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID, 1)
  const list = ['gathering_grip', 'gathering_grip', 'gathering_grip'].map(id => accessoryStore.addAccessory(id, 3, 'excellent', 'debug'))
  list.forEach((accessory, index) => {
    if (accessory) {
      accessory.level = 8 + index
      accessory.upgradeInvestment = { accessoryMaterial: 20 * (index + 1), tuningStone: index + 1 }
    }
  })
  const ids = list.map(accessory => accessory?.instanceId ?? '')
  const protectedOne = list[2]
  const result = accessoryStore.fuseAccessories(ids, { useProtection: true, forceOutcome: 'failure' })
  assert(result.success && !result.accessory, '保护失败应不产出新配件。')
  assert(result.consumed.length === 2, '保护失败只消耗 2 件配件本体。')
  assert(protectedOne && accessoryStore.getAccessoryByInstanceId(protectedOne.instanceId)?.level === protectedOne.level, '保护返还配件应保留原等级。')
  assert(protectedOne && accessoryStore.getAccessoryByInstanceId(protectedOne.instanceId)?.upgradeInvestment.accessoryMaterial === protectedOne.upgradeInvestment.accessoryMaterial, '保护返还配件应保留升级投入记录。')
  assert(inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_PROTECT_ITEM_ID) === 0, '使用保护时应消耗稳固石。')
}

{
  const { accessoryStore } = freshStores()
  const a = accessoryStore.addAccessory('weaponry_blade_core', 1, 'normal', 'debug')
  const b = accessoryStore.addAccessory('weaponry_guard', 1, 'normal', 'debug')
  const c = accessoryStore.addAccessory('weaponry_guard', 1, 'normal', 'debug')
  assert(a && b && c, 'QA 应能创建不同配件。')
  if (a && b && c) {
    assert(accessoryStore.canFuseAccessories([a.instanceId, b.instanceId, c.instanceId]).success === false, '不同名配件不能合成。')
    b.locked = true
    assert(accessoryStore.canFuseAccessories([b.instanceId, c.instanceId, a.instanceId]).success === false, '锁定配件不能合成。')
  }
}

{
  const { accessoryStore } = freshStores()
  accessoryStore.deserialize({
    ownedAccessories: [
      { instanceId: 'bad', defId: 'missing', tier: 99, quality: 'bad', level: 100, source: 'debug', upgradeInvestment: { accessoryMaterial: 99999, tuningStone: 99999 } },
      { instanceId: 'ok', defId: 'armor_tread', tier: 4, quality: 'supreme', level: 99, source: 'debug', upgradeInvestment: { accessoryMaterial: 99999, tuningStone: 99999 } }
    ],
    equippedSlots: { armor_tread: 'ok', weaponry_blade_core: 'missing-instance' },
    unlockedBlueprints: [9, 4],
    fusionPityState: { 'armor_tread:4:supreme': 99, 'missing:1:fine': 3 },
    dailyPurchaseState: { dayTag: '1-spring-1', purchased: { accessory_material: 100, ghost: 5 } },
    nextInstanceSeq: -5
  })
  assert(accessoryStore.ownedAccessories.length === 1, '读档应移除无效配件定义。')
  assert(accessoryStore.ownedAccessories[0].level === 20, '读档应把非法等级夹到 1-20。')
  assert(accessoryStore.ownedAccessories[0].upgradeInvestment.accessoryMaterial === 2678, '读档升级投入不能超过当前等级理论最大投入。')
  assert(accessoryStore.equippedSlots.armor_tread === 'ok', '读档应保留合法装备槽。')
  assert(accessoryStore.equippedSlots.weaponry_blade_core === null, '读档应清空不存在的配件槽。')
  assert(accessoryStore.unlockedBlueprints.includes(1) && accessoryStore.unlockedBlueprints.includes(4), '读档应保留合法蓝图并始终包含一阶。')
  assert(Object.keys(accessoryStore.fusionPityState).length === 1, '读档应清理非法保底记录。')
}

{
  const { accessoryStore, inventoryStore, playerStore } = freshStores()
  inventoryStore.addItemExact('copper_ore', 999)
  inventoryStore.addItemExact('stone', 999)
  inventoryStore.addItemExact(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, 999)
  inventoryStore.addItemExact(dataModule.EQUIPMENT_ACCESSORY_TUNING_STONE_ITEM_ID, 20)
  playerStore.earnMoney(100000)
  const crafted = accessoryStore.craftAccessory('weaponry_blade_core', 1)
  assert(crafted.success && crafted.accessory?.tier === 1, '工坊应可定向打造一阶配件。')
  assert(accessoryStore.craftAccessory('weaponry_blade_core', 2).success === false, '未解锁时不能定向打造二阶配件。')
  accessoryStore.unlockBlueprintTier(2)
  inventoryStore.addItemExact('iron_bar', 999)
  inventoryStore.addItemExact('crystal_ore', 999)
  inventoryStore.addItemExact('iridium_bar', 999)
  inventoryStore.addItemExact('prismatic_shard', 20)
  const tier2 = accessoryStore.craftAccessory('weaponry_blade_core', 2)
  assert(tier2.success && tier2.accessory?.tier === 2, '解锁后应可定向打造二阶配件。')
  assert(accessoryStore.craftAccessory('weaponry_blade_core', 4).success === false, '四阶无蓝图时不能打造。')
  accessoryStore.unlockBlueprintTier(4)
  const tier4 = accessoryStore.craftAccessory('weaponry_blade_core', 4)
  assert(tier4.success && tier4.accessory?.tier === 4, '高级蓝图解锁后应可打造四阶配件。')
  assert(tier4.accessory?.source === 'blueprint', '四阶配件打造来源应记录为蓝图制作。')
}

{
  const { accessoryStore, gameStore, inventoryStore, playerStore } = freshStores()
  playerStore.earnMoney(100000)
  const buy = accessoryStore.buyDailyAccessoryMaterial(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, 8)
  assert(buy.success, '每日限购应允许购买配件材料。')
  assert(inventoryStore.getTotalItemCount(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID) === 8, '每日限购应发放材料。')
  assert(accessoryStore.buyDailyAccessoryMaterial(dataModule.EQUIPMENT_ACCESSORY_MATERIAL_ITEM_ID, 1).success === false, '每日限购不能超过上限。')
  gameStore.nextDay()
  assert(typeof accessoryStore.refreshDailyPurchaseState === 'function', 'Accessory store should expose a day-refresh method for daily purchases.')
  accessoryStore.refreshDailyPurchaseState()
  assert(
    accessoryStore.dailyPurchaseState.dayTag === `${gameStore.year}-${gameStore.season}-${gameStore.day}`,
    'Accessory daily purchases should bind to the new game day after refresh.'
  )
  assert(
    Object.keys(accessoryStore.dailyPurchaseState.purchased).length === 0,
    'Accessory daily purchases should clear bought counts on the next game day.'
  )
}

const processingViewSource = fs.readFileSync(path.join(projectRoot, 'src/views/game/ProcessingView.vue'), 'utf8')
assert(processingViewSource.includes('配件') || processingViewSource.includes('EquipmentAccessory'), '铁匠铺界面应出现配件入口或配件组件。')
assert(processingViewSource.includes('data-testid="processing-tab-accessory"'), '铁匠铺应有可测试的配件入口标签。')
assert(processingViewSource.includes('<EquipmentAccessoryPanel />'), '铁匠铺配件标签应渲染配件调校面板。')

const accessoryPanelSource = fs.readFileSync(path.join(projectRoot, 'src/components/game/EquipmentAccessoryPanel.vue'), 'utf8')
assert(accessoryPanelSource.includes('data-testid="equipment-accessory-panel"'), '配件面板应保留测试入口。')
assert(accessoryPanelSource.includes('canUpgradeSelected') && accessoryPanelSource.includes(':disabled="!canUpgradeSelected.success"'), '升级按钮必须按实际材料与铜钱状态禁用，不能只看升级预览。')
assert(accessoryPanelSource.includes('equipment-accessory-tab-craft') && accessoryPanelSource.includes('equipment-accessory-tab-fusion'), '配件面板应包含打造与合成视图标签。')
assert(accessoryPanelSource.includes('accessory-fusion-stage--success') && accessoryPanelSource.includes('accessory-fusion-stage--failure'), '合成面板应保留成功与失败动画状态。')
assert(accessoryPanelSource.includes('craftTierStatus') && accessoryPanelSource.includes('accessory-tier-button--locked'), '打造阶级按钮应显示已开/未开状态。')
for (const forbiddenPlayerCopy of ['store', 'migration', 'guard', 'effectKey']) {
  assert(!accessoryPanelSource.includes(`>${forbiddenPlayerCopy}<`), `配件玩家界面不应直接展示开发词：${forbiddenPlayerCopy}`)
}

const saveStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useSaveStore.ts'), 'utf8')
assert(saveStoreSource.includes("import { useEquipmentAccessoryStore }"), '总存档应接入配件 store。')
assert(saveStoreSource.includes('equipmentAccessory: equipmentAccessoryStore.serialize()'), '总存档应写入配件数据。')
assert(saveStoreSource.includes('equipmentAccessoryStore.deserialize(payload.equipmentAccessory ?? {})'), '总读档应恢复配件数据并兼容旧档。')

const miningStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useMiningStore.ts'), 'utf8')
const quarryStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/useQuarryStore.ts'), 'utf8')
const endDaySource = fs.readFileSync(path.join(projectRoot, 'src/composables/useEndDay.ts'), 'utf8')
const playerStoreSource = fs.readFileSync(path.join(projectRoot, 'src/stores/usePlayerStore.ts'), 'utf8')
assert(endDaySource.includes('const equipmentAccessoryStore = useEquipmentAccessoryStore()'), 'End-day flow should keep one accessory store instance for daily accessory settlement.')
assert(endDaySource.includes('equipmentAccessoryStore.refreshDailyPurchaseState()'), 'End-day flow should refresh accessory daily purchases after the date advances.')
for (const effectKey of [
  'accessory_attack_flat',
  'accessory_crit_rate',
  'accessory_combat_time_reduction',
  'accessory_damage_reduction',
  'accessory_durability_consumption_reduction',
  'accessory_mining_stamina_reduction',
  'accessory_ore_bonus_chance'
]) {
  assert(miningStoreSource.includes(effectKey) || quarryStoreSource.includes(effectKey) || endDaySource.includes(effectKey), `玩法接线缺少配件效果：${effectKey}`)
}
assert(playerStoreSource.includes('accessory_max_hp_flat'), '玩家最大生命应接入护具生命配件效果。')
assert(quarryStoreSource.includes('accessory_quarry_double_chance'), '采石场应接入采具额外产物。')
assert(endDaySource.includes('accessory_passout_loss_reduction'), '昏倒损失应接入护具配件效果。')
assert(miningStoreSource.includes('rollMineAccessoryDrop') && miningStoreSource.includes('grantMineAccessoryMaterials'), '矿洞应真实掉落配件和配件材料。')

if (errors.length > 0) {
  console.error('Equipment accessory guard failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Equipment accessory guard passed.')
