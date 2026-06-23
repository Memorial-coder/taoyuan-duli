/* global console, process */

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

const data = await import(pathToFileURL(path.join(srcRoot, 'data', 'index.ts')).href)

const {
  ITEMS,
  RECIPES,
  PROCESSING_RECIPES,
  PET_SPECIAL_FEEDS,
  ITEM_LINKAGE_DEFS,
  LINKAGE_DEMAND_POOL,
  ONLINE_WEAK_ITEM_ORDER_ITEM_IDS,
  getOnlineWeakItemOrderPool,
  getOnlineWeakItemOrderConflictTagsForFamilyWish,
  SUPPLEMENTAL_ALCHEMY_USE_RECIPES,
  QUARRY_MINE_ELIXIR_PREP_OPTIONS,
  REGION_EXPEDITION_ELIXIR_PREP_OPTIONS,
  getAlchemyRecipeByOutputItemId,
  getFamilyWishDemandEntries,
  getPublicStorageDemandEntries,
  getItemLinkageUsageLines,
  getItemLinkageUseLabels,
  getItemLinkageUseTags
} = data

const requiredWeakItems = [
  'mixed_seed_oil',
  'manor_edge_bundle',
  'ley_crystal_focus_elixir',
  'wind_core_guard_pill',
  'marsh_luminous_cleansing_elixir',
  'moon_pearl_calm_elixir',
  'jade_orchid_focus_elixir',
  'rare_lotus_guard_elixir',
  'jade_peach_spirit_elixir'
]

for (const itemId of requiredWeakItems) {
  assert(ITEMS.some(item => item.id === itemId), `缺少物品定义：${itemId}`)
  assert(ITEM_LINKAGE_DEFS.some(entry => entry.itemId === itemId), `物品联动矩阵缺少：${itemId}`)
  assert(LINKAGE_DEMAND_POOL.some(entry => entry.itemId === itemId), `需求池缺少：${itemId}`)
  assert(getItemLinkageUsageLines(itemId).length >= 2, `百科用途联动说明不足：${itemId}`)
}

const mixedOilRecipes = RECIPES.filter(recipe => recipe.ingredients.some(entry => entry.itemId === 'mixed_seed_oil'))
assert(mixedOilRecipes.length >= 2, 'mixed_seed_oil 至少需要 2 个真实料理配方')
assert(mixedOilRecipes.some(recipe => recipe.id === 'mixed_oil_noodle'), '缺少杂油拌面配方')
assert(mixedOilRecipes.some(recipe => recipe.id === 'festival_oil_cake'), '缺少节庆油糕配方')

const questsSource = read('src/data/quests.ts')
assert(questsSource.includes("targetItemId: 'mixed_seed_oil'"), '特殊订单模板未接入 mixed_seed_oil')
assert(questsSource.includes("activitySourceId: 'linkage_oil_supply_week'"), 'mixed_seed_oil 订单缺少联动活动来源')
assert(questsSource.includes("antiRepeatTags: ['linkage', 'oil', 'mixed_seed_oil']"), 'mixed_seed_oil 订单缺少反重复标签')

const mixedOilLinkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === 'mixed_seed_oil')
assert(mixedOilLinkage?.currentUseSystems.includes('familyWish'), 'mixed_seed_oil 当前用途未标记家庭心愿')
assert(mixedOilLinkage?.repeatableSinks.includes('familyWish'), 'mixed_seed_oil 重复消耗口未标记家庭心愿')
assert(
  ['料理', '订单', '家庭'].every(label => getItemLinkageUseLabels('mixed_seed_oil').includes(label)),
  'mixed_seed_oil 物品卡用途标签必须显示料理/订单/家庭'
)
assert(
  getItemLinkageUseTags('mixed_seed_oil').some(tag => tag.label === '料理' && tag.panelKey === 'cooking') &&
    getItemLinkageUseTags('mixed_seed_oil').some(tag => tag.label === '订单' && tag.panelKey === 'quest') &&
    getItemLinkageUseTags('mixed_seed_oil').some(tag => tag.label === '家庭' && tag.panelKey === 'cottage'),
  'mixed_seed_oil 用途标签必须能跳转到料理/订单/家庭入口'
)
const npcDataSource = read('src/data/npcs.ts')
assert(npcDataSource.includes("id: 'wish_shared_breakfast'") && npcDataSource.includes("itemId: 'mixed_seed_oil'"), '家庭心愿未接入 mixed_seed_oil 材料需求')
assert(npcDataSource.includes("id: 'wish_market_feast'") && npcDataSource.includes("itemId: 'rice_flour'"), '节前家庭心愿未接入米粉备料需求')
assert(getFamilyWishDemandEntries('wish_shared_breakfast').some(entry => entry.itemId === 'mixed_seed_oil' && entry.tags.includes('family_breakfast')), '共享需求池未把家庭早餐映射到 mixed_seed_oil')
assert(getFamilyWishDemandEntries('wish_market_feast').some(entry => entry.itemId === 'rice_flour' && entry.tags.includes('festival_prep')), '共享需求池未把节前家庭心愿映射到 rice_flour')
assert(getPublicStorageDemandEntries().some(entry => entry.itemId === 'mixed_seed_oil' && entry.systems.includes('onlineOrder')), '公共仓共享需求池未暴露 mixed_seed_oil 线上订单')
assert(getPublicStorageDemandEntries().some(entry => entry.itemId === 'standard_bait' && entry.systems.includes('onlineOrder')), '公共仓共享需求池未暴露 standard_bait 线上订单')
assert(getOnlineWeakItemOrderConflictTagsForFamilyWish('wish_shared_breakfast').includes('family_breakfast'), '线上订单无法读取家庭早餐反重复标签')

assert(PET_SPECIAL_FEEDS.some(feed => feed.id === 'manor_edge_pet_bowl' && feed.itemId === 'manor_edge_bundle'), '宠物点心未接入 manor_edge_bundle')
assert(
  ['线上订单', '宠物', '家庭'].every(label => getItemLinkageUseLabels('manor_edge_bundle').includes(label)),
  'manor_edge_bundle 物品卡用途标签必须显示线上订单/宠物/家庭'
)
assert(
  getItemLinkageUseTags('manor_edge_bundle').some(tag => tag.label === '线上订单' && tag.panelKey === 'online') &&
    getItemLinkageUseTags('manor_edge_bundle').some(tag => tag.label === '宠物' && tag.panelKey === 'cottage'),
  'manor_edge_bundle 用途标签必须能跳转到线上/宠物入口'
)
const onlineOrdersSource = read('src/views/game/online/OnlineOrdersView.vue')
assert(onlineOrdersSource.includes('data-testid="online-orders-weak-item-submit"'), '线上订单页缺少弱用途物品提交按钮')
assert(onlineOrdersSource.includes('getOnlineWeakItemOrderForCalendar'), '线上订单页必须从弱用途物品池轮换订单')
assert(onlineOrdersSource.includes('inventoryStore.getUnlockedItemCount(currentWeakItemOrder.value.itemId)'), '弱用途线上订单库存口径必须排除锁定物品')
assert(onlineOrdersSource.includes('inventoryStore.removeUnlockedItem(order.itemId, order.quantity)'), '弱用途线上订单没有真实扣除当前轮换物品')
assert(onlineOrdersSource.includes('markLifestyleUnlock(weakItemOrderLockId.value'), '弱用途线上订单缺少周锁记录')
assert(onlineOrdersSource.includes("addRewardTickets(") && onlineOrdersSource.includes('online_weak_item_order'), '弱用途线上订单缺少票券奖励')
assert(ONLINE_WEAK_ITEM_ORDER_ITEM_IDS.includes('manor_edge_bundle'), '弱用途线上订单池必须包含 manor_edge_bundle')
assert(getOnlineWeakItemOrderPool().some(order => order.itemId === 'manor_edge_bundle'), '弱用途线上订单池未生成边角菜包订单')

const eliteElixirIds = requiredWeakItems.slice(2)
for (const itemId of eliteElixirIds) {
  const recipe = getAlchemyRecipeByOutputItemId(itemId)
  assert(!!recipe?.alchemy, `高阶丹药未接入背包炼丹效果：${itemId}`)
  assert(SUPPLEMENTAL_ALCHEMY_USE_RECIPES.some(entry => entry.outputItemId === itemId), `补充炼丹使用表缺少：${itemId}`)
}
assert(SUPPLEMENTAL_ALCHEMY_USE_RECIPES.length >= eliteElixirIds.length, '补充炼丹使用表数量不足')
assert(PROCESSING_RECIPES.filter(recipe => eliteElixirIds.includes(recipe.outputItemId)).length === 0, '高阶共同丹炉丹药不应被误塞进普通单人工坊配方')

for (const itemId of ['wind_core_guard_pill', 'rare_lotus_guard_elixir']) {
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(QUARRY_MINE_ELIXIR_PREP_OPTIONS.some(entry => entry.itemId === itemId), `采石场旧支道准备表缺少：${itemId}`)
  assert(linkage?.repeatableSinks.includes('quarry'), `高阶丹药未标记采石场重复消耗口：${itemId}`)
  assert(
    ['使用', '采石场'].every(label => getItemLinkageUseLabels(itemId).includes(label)),
    `高阶采石场丹药物品卡用途标签必须显示使用/采石场：${itemId}`
  )
  assert(
    getItemLinkageUseTags(itemId).some(tag => tag.label === '采石场' && tag.panelKey === 'quarry'),
    `高阶采石场丹药用途标签必须能跳转采石场：${itemId}`
  )
}
for (const itemId of ['ley_crystal_focus_elixir', 'marsh_luminous_cleansing_elixir', 'moon_pearl_calm_elixir']) {
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(REGION_EXPEDITION_ELIXIR_PREP_OPTIONS.some(entry => entry.itemId === itemId), `行旅图远征准备表缺少：${itemId}`)
  assert(linkage?.repeatableSinks.includes('regionMap'), `高阶丹药未标记行旅图重复消耗口：${itemId}`)
  assert(
    ['使用', '远征'].every(label => getItemLinkageUseLabels(itemId).includes(label)),
    `高阶远征丹药物品卡用途标签必须显示使用/远征：${itemId}`
  )
  assert(
    getItemLinkageUseTags(itemId).some(tag => tag.label === '远征' && tag.panelKey === 'region-map'),
    `高阶远征丹药用途标签必须能跳转行旅图：${itemId}`
  )
}

const inventorySource = read('src/views/game/InventoryView.vue')
assert(inventorySource.includes('!!getAlchemyRecipeByOutputItemId(itemId)'), '背包使用入口必须继续读取炼丹 lookup')
assert(inventorySource.includes('cookingStore.useElixir(itemId, quality)'), '背包使用必须调用 useElixir 扣物并生效')
assert(inventorySource.includes('show-usage-tags'), '背包物品卡必须显示真实联动用途标签')
assert(inventorySource.includes('@usage-click="handleInventoryUsageTagClick"'), '背包物品卡用途标签必须能触发入口跳转')
assert(inventorySource.includes('navigateToPanel(tag.panelKey as PanelKey)'), '背包用途标签必须复用 navigateToPanel 跳转')

const itemCardSource = read('src/components/game/ItemCard.vue')
assert(itemCardSource.includes('getItemLinkageUseTags'), 'ItemCard 必须读取 itemLinkage 用途标签和入口')
assert(itemCardSource.includes('showUsageTags'), 'ItemCard 必须提供用途标签显示开关')
assert(itemCardSource.includes("usage-click', tag"), 'ItemCard 必须对用途标签发出 usage-click 事件')
assert(itemCardSource.includes('data-testid="item-card-linkage-uses"'), 'ItemCard 必须提供用途标签测试挂点')

const itemCollectionTabSource = read('src/components/game/ItemCollectionTab.vue')
assert(itemCollectionTabSource.includes('show-usage-tags'), '图鉴物品卡必须显示真实联动用途标签')
assert(itemCollectionTabSource.includes('@usage-click="handleCollectionUsageTagClick"'), '图鉴物品卡用途标签必须能触发入口跳转')
assert(itemCollectionTabSource.includes('navigateToPanel(tag.panelKey as PanelKey)'), '图鉴用途标签必须复用 navigateToPanel 跳转')

const encyclopediaSource = read('src/data/itemEncyclopedia.ts')
assert(encyclopediaSource.includes('getItemLinkageUsageLines'), '百科用途未读取 itemLinkage 用途行')
assert(encyclopediaSource.includes('getItemLinkageUseLabels'), '百科详情未读取 itemLinkage 用途标签')

if (errors.length > 0) {
  console.error('qa-item-linkage-matrix failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-item-linkage-matrix passed (${requiredWeakItems.length} linked items, ${mixedOilRecipes.length} mixed oil recipes, ${eliteElixirIds.length} elite elixirs).`)
