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
const wildTrees = await import(pathToFileURL(path.join(srcRoot, 'data', 'wildTrees.ts')).href)

const {
  ITEMS,
  CROPS,
  getItemById,
  migrateLegacyItemId,
  LEGACY_AMBIGUOUS_ITEM_ID_COMPATIBILITY,
  RECIPES,
  PROCESSING_RECIPES,
  QUEST_TEMPLATES,
  FRUIT_TREE_DEFS,
  CELLAR_AGEABLE_ITEMS,
  FORAGE_ITEMS,
  HIDDEN_NPCS,
  ANIMAL_DEFS,
  FEED_DEFS,
  HANHAI_SHOP_ITEMS,
  MUSEUM_ITEMS,
  MUSEUM_MILESTONES,
  ANCIENT_SEED_ABYSS_TREASURE_CHANCE,
  canTreasureDropFoxBead,
  getTreasureRewards
} = data
const { WILD_TREE_DEFS } = wildTrees

const duplicateIds = [...ITEMS.reduce((acc, item) => {
  const next = (acc.get(item.id) ?? 0) + 1
  acc.set(item.id, next)
  return acc
}, new Map()).entries()]
  .filter(([, count]) => count > 1)
  .map(([id, count]) => `${id}×${count}`)

assert(duplicateIds.length === 0, `ITEMS 存在重复 ID：${duplicateIds.join(', ')}`)

const expectItem = (id, expected) => {
  const item = getItemById(id)
  assert(!!item, `缺少物品定义：${id}`)
  if (!item) return
  for (const [key, value] of Object.entries(expected)) {
    assert(item[key] === value, `${id}.${key} 应为 ${String(value)}，实际为 ${String(item[key])}`)
  }
}

expectItem('osmanthus_tea', { category: 'crop', sellPrice: 420, edible: true })
expectItem('processed_osmanthus_tea', { category: 'processed', sellPrice: 900, edible: true })
expectItem('dragon_pearl', { category: 'crop', sellPrice: 900, edible: true })
expectItem('spirit_dragon_pearl', { category: 'misc', sellPrice: 0, edible: false })
expectItem('peach', { category: 'crop', sellPrice: 210, edible: true, staminaRestore: 14, healthRestore: 5 })
expectItem('lychee', { category: 'crop', sellPrice: 270, edible: true, staminaRestore: 14, healthRestore: 5 })
expectItem('tree_lychee', { category: 'fruit', sellPrice: 120, edible: true })
expectItem('persimmon', { category: 'crop', sellPrice: 225, edible: true })
expectItem('tree_persimmon', { category: 'fruit', sellPrice: 127, edible: true })
expectItem('mulberry', { category: 'crop', sellPrice: 60, edible: true })
expectItem('wild_mulberry', { category: 'misc', sellPrice: 25, edible: true })
expectItem('wild_meat', { category: 'material', sellPrice: 35, edible: false })
expectItem('skull_mushroom', { category: 'misc', sellPrice: 120, edible: true })
expectItem('food_skull_mushroom_soup', { category: 'food', edible: true })

const marketRegrowthRawCropLimits = {
  staminaPerItem: 14,
  healthPerItem: 5,
  staminaPerSeedCycle: 80,
  healthPerSeedCycle: 30
}

for (const crop of CROPS.filter(crop => (crop.seedPrice > 0 || crop.id === 'ancient_fruit') && crop.regrowth && crop.maxHarvests)) {
  const item = getItemById(crop.id)
  assert(!!item, `Missing generated crop item for market regrowth crop: ${crop.id}`)
  if (!item) continue

  assert(
    (item.staminaRestore ?? 0) <= marketRegrowthRawCropLimits.staminaPerItem,
    `Raw market regrowth crop ${crop.id} restores too much stamina per item: ${item.staminaRestore ?? 0}`
  )
  assert(
    (item.healthRestore ?? 0) <= marketRegrowthRawCropLimits.healthPerItem,
    `Raw market regrowth crop ${crop.id} restores too much HP per item: ${item.healthRestore ?? 0}`
  )
  assert(
    (item.staminaRestore ?? 0) * crop.maxHarvests <= marketRegrowthRawCropLimits.staminaPerSeedCycle,
    `Raw market regrowth crop ${crop.id} restores too much stamina per seed cycle: ${(item.staminaRestore ?? 0) * crop.maxHarvests}`
  )
  assert(
    (item.healthRestore ?? 0) * crop.maxHarvests <= marketRegrowthRawCropLimits.healthPerSeedCycle,
    `Raw market regrowth crop ${crop.id} restores too much HP per seed cycle: ${(item.healthRestore ?? 0) * crop.maxHarvests}`
  )
}
expectItem('ancient_fruit', { category: 'crop', sellPrice: 2700, edible: true, staminaRestore: 14, healthRestore: 5 })
expectItem('ancient_fruit_wine', { category: 'processed', sellPrice: 5000, edible: true, staminaRestore: 180, healthRestore: 90 })
expectItem('jujube_wine', { name: '红枣酒', category: 'processed', sellPrice: 450, edible: true })
expectItem('tavern_rice_wine', { name: '桃源米酒', category: 'processed', sellPrice: 180, edible: true })
expectItem('quail_egg', { category: 'animal_product', sellPrice: 65 })
expectItem('pigeon_egg', { category: 'animal_product', sellPrice: 140 })
expectItem('duck_egg', { category: 'animal_product', sellPrice: 180 })
expectItem('rabbit_fur', { category: 'animal_product', sellPrice: 330 })
expectItem('goat_milk', { category: 'animal_product', sellPrice: 240 })
expectItem('buffalo_milk', { category: 'animal_product', sellPrice: 230 })
expectItem('donkey_milk', { category: 'animal_product', sellPrice: 300 })
expectItem('ostrich_egg', { category: 'animal_product', sellPrice: 520 })
expectItem('antler_velvet', { category: 'animal_product', sellPrice: 900 })

for (const shopItem of HANHAI_SHOP_ITEMS.filter(item => item.itemId.endsWith('_seed'))) {
  const canonicalItem = getItemById(shopItem.itemId)
  assert(!!canonicalItem, `瀚海商店种子缺少物品定义：${shopItem.itemId}`)
  assert(
    canonicalItem?.name === shopItem.name,
    `瀚海商店种子 ${shopItem.itemId} 展示名应与物品定义一致：${shopItem.name} !== ${canonicalItem?.name ?? '未知'}`
  )
}

const hayFeedPrice = FEED_DEFS.find(feed => feed.id === 'hay')?.price ?? 50
for (const animal of ANIMAL_DEFS) {
  if (!animal.productId || animal.produceDays <= 0) continue
  const product = getItemById(animal.productId)
  assert(!!product, `${animal.type} 产物缺少物品定义：${animal.productId}`)
  if (!product) continue
  const normalCycleProfit = product.sellPrice - hayFeedPrice * animal.produceDays
  assert(
    normalCycleProfit >= 0,
    `${animal.type} 普通品质基础喂养不应亏本：${animal.productId} ${product.sellPrice} - 干草 ${hayFeedPrice}×${animal.produceDays}`
  )
}

const recipeById = id => PROCESSING_RECIPES.find(recipe => recipe.id === id)
assert(recipeById('brew_osmanthus')?.outputItemId === 'processed_osmanthus_tea', 'brew_osmanthus 应产出 processed_osmanthus_tea')
assert(recipeById('wine_rice')?.machineType === 'wine_workshop', 'wine_rice 应属于酒坊配方')
assert(recipeById('wine_rice')?.inputItemId === 'rice', 'wine_rice 应消耗稻米')
assert(recipeById('wine_rice')?.inputQuantity === 1, 'wine_rice 应消耗 1 份稻米')
assert(recipeById('wine_rice')?.outputItemId === 'tavern_rice_wine', 'wine_rice 应产出订单所需的桃源米酒')
assert(recipeById('wine_rice')?.outputQuantity === 2, 'wine_rice 应产出 2 壶桃源米酒以覆盖稻米加工价值')
assert(recipeById('vinegar_rice')?.outputItemId === 'rice_vinegar', 'vinegar_rice 应继续产出米醋')
assert(CELLAR_AGEABLE_ITEMS.includes('tavern_rice_wine'), '桃源米酒应可放入酒窖陈酿')
const tavernRiceWineQuestTargets = QUEST_TEMPLATES
  .flatMap(template => template.targets ?? [])
  .filter(target => target.itemId === 'tavern_rice_wine')
assert(tavernRiceWineQuestTargets.length > 0, '普通订单池应保留桃源米酒交付目标')
assert(
  tavernRiceWineQuestTargets.every(target => target.name === '桃源米酒'),
  '普通订单池中 tavern_rice_wine 的展示名应统一为桃源米酒'
)
assert(recipeById('spirit_forge_dragon_pearl')?.outputItemId === 'spirit_dragon_pearl', 'spirit_forge_dragon_pearl 应产出 spirit_dragon_pearl')
assert(HIDDEN_NPCS.find(npc => npc.id === 'long_ling')?.bondItemId === 'spirit_dragon_pearl', '龙灵结缘应消耗 spirit_dragon_pearl')
assert(recipeById('dry_lychee')?.inputItemId === 'lychee', '作物荔枝仍应可脱水制作荔枝干')
assert(recipeById('dry_lychee')?.outputItemId === 'dried_lychee', '作物荔枝脱水应产出 dried_lychee')
assert(recipeById('dry_tree_lychee')?.machineType === 'dehydrator', '果树荔枝脱水应接入脱水机')
assert(recipeById('dry_tree_lychee')?.inputItemId === 'tree_lychee', '果树荔枝脱水应消耗 tree_lychee')
assert(recipeById('dry_tree_lychee')?.outputItemId === 'dried_lychee', '果树荔枝脱水应产出 dried_lychee')

const expectedMuseumFurnaceItems = [
  { id: 'bronze_bar', name: '青铜锭', category: 'bar', recipeId: 'smelt_bronze' },
  { id: 'refined_quartz', name: '精制石英', category: 'gem', recipeId: 'smelt_refined_quartz' },
  { id: 'mythril_bar', name: '秘银锭', category: 'bar', recipeId: 'smelt_mythril' }
]
for (const expected of expectedMuseumFurnaceItems) {
  const recipe = recipeById(expected.recipeId)
  const museumItem = MUSEUM_ITEMS.find(item => item.id === expected.id)
  assert(recipe?.machineType === 'furnace', `${expected.recipeId} 应属于熔炉配方`)
  assert(recipe?.outputItemId === expected.id, `${expected.recipeId} 应产出 ${expected.id}`)
  assert(getItemById(expected.id)?.name === expected.name, `${expected.id} 物品名应为 ${expected.name}`)
  assert(!!museumItem, `博物馆收藏缺少熔炉产物：${expected.id}`)
  assert(museumItem?.name === expected.name, `博物馆 ${expected.id} 展示名应为 ${expected.name}`)
  assert(museumItem?.category === expected.category, `博物馆 ${expected.id} 分类应为 ${expected.category}`)
}
const duplicateMuseumItemIds = [...MUSEUM_ITEMS.reduce((acc, item) => {
  const next = (acc.get(item.id) ?? 0) + 1
  acc.set(item.id, next)
  return acc
}, new Map()).entries()]
  .filter(([, count]) => count > 1)
  .map(([id, count]) => `${id}×${count}`)
assert(duplicateMuseumItemIds.length === 0, `MUSEUM_ITEMS 存在重复 ID：${duplicateMuseumItemIds.join(', ')}`)
const finalMuseumMilestoneCount = Math.max(...MUSEUM_MILESTONES.map(milestone => milestone.count))
assert(finalMuseumMilestoneCount === MUSEUM_ITEMS.length, `博物馆最终里程碑应覆盖全部 ${MUSEUM_ITEMS.length} 件收藏，实际为 ${finalMuseumMilestoneCount}`)

assert(FRUIT_TREE_DEFS.find(tree => tree.type === 'lychee_tree')?.fruitId === 'tree_lychee', '荔枝树应产出 tree_lychee')
assert(FRUIT_TREE_DEFS.find(tree => tree.type === 'persimmon_tree')?.fruitId === 'tree_persimmon', '柿树应产出 tree_persimmon')
assert(FORAGE_ITEMS.some(item => item.itemId === 'wild_mulberry'), '觅食表应产出 wild_mulberry')
assert(WILD_TREE_DEFS.find(tree => tree.type === 'mulberry')?.seedItemId === 'wild_mulberry', '桑树种植应消耗 wild_mulberry')
assert(
  RECIPES.some(recipe => recipe.ingredients.some(ingredient => ingredient.itemId === 'skull_mushroom')),
  '幽骨菇必须至少接入一道食谱用途'
)
for (const recipeId of ['spicy_hotpot', 'bamboo_shoot_stir_fry', 'aged_radish_stew', 'hunters_roast', 'battle_stew', 'spiced_lamb']) {
  const recipe = RECIPES.find(entry => entry.id === recipeId)
  assert(!!recipe, `缺少野兽肉块接入食谱：${recipeId}`)
  assert(
    recipe?.ingredients.some(ingredient => ingredient.itemId === 'wild_meat' && ingredient.quantity === 1),
    `${recipeId} 必须消耗 1 份 wild_meat`
  )
}
const forageViewSource = fs.readFileSync(path.join(srcRoot, 'views', 'game', 'ForageView.vue'), 'utf8')
assert(forageViewSource.includes('FOREST_BEASTS'), '竹林采集页必须保留野兽遭遇表')
assert(forageViewSource.includes("attemptGather('wild_meat'"), '竹林野兽遭遇必须能产出 wild_meat')
assert(forageViewSource.includes('recordMonsterKill()'), '竹林野兽胜利必须记录怪物击败进度')
const skullMushroomSoup = RECIPES.find(recipe => recipe.id === 'skull_mushroom_soup')
assert(skullMushroomSoup?.effect.buff?.oreBonusChance === 0.25, '幽骨菌汤必须提供 25% 概率矿石产出+1')
assert(skullMushroomSoup?.effect.buff?.description.includes('矿石产出+1'), '幽骨菌汤 Buff 文案必须说明矿石产出+1')

assert(canTreasureDropFoxBead(49) === false, '狐珠不应在矿洞50层前的宝箱掉落')
assert(canTreasureDropFoxBead(50) === true, '狐珠应从矿洞50层后的深层宝箱开放掉落')
assert(ANCIENT_SEED_ABYSS_TREASURE_CHANCE === 0.025, 'ancient seed abyss treasure drop chance should stay at 2.5%')

const originalRandom = Math.random
try {
  const sequence = [0, 0.99, 0, 0]
  Math.random = () => sequence.shift() ?? 0
  const deepTreasure = getTreasureRewards(58)
  assert(
    deepTreasure.items.some(item => item.itemId === 'fox_bead' && item.quantity === 1),
    '矿洞50层后的深层宝箱概率命中时应产出狐珠'
  )
} finally {
  Math.random = originalRandom
}

try {
  const sequence = [0, 0.99, 0.99, 0.01, 0.99, 0]
  Math.random = () => sequence.shift() ?? 0
  const abyssTreasure = getTreasureRewards(101)
  assert(
    abyssTreasure.items.some(item => item.itemId === 'ancient_seed' && item.quantity === 1),
    'abyss treasure should be able to drop ancient_seed through the independent 2.5% roll'
  )
} finally {
  Math.random = originalRandom
}

assert(migrateLegacyItemId('osmanthus_tea', 'quest_reward') === 'processed_osmanthus_tea', '任务奖励旧桂花茶应迁移到加工茶')
assert(migrateLegacyItemId('osmanthus_tea', 'general') === 'osmanthus_tea', '通用旧桂花茶应保留作物身份')
assert(migrateLegacyItemId('dragon_pearl', 'hidden_npc_bond') === 'spirit_dragon_pearl', '结缘旧龙珠应迁移到信物')
assert(
  LEGACY_AMBIGUOUS_ITEM_ID_COMPATIBILITY.length >= 5,
  '旧歧义 ID 兼容策略应覆盖五个高风险 ID'
)

const manifestPath = path.join(projectRoot, 'public', 'item', 'item-icon-manifest.json')
const qaReportPath = path.join(projectRoot, 'public', 'item', 'item-icon-qa-report.json')
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  for (const itemId of ['processed_osmanthus_tea', 'spirit_dragon_pearl', 'tree_lychee', 'tree_persimmon', 'wild_mulberry']) {
    assert(!!manifest.byId?.[itemId], `item-icon-manifest 缺少 ${itemId}`)
  }
}
if (fs.existsSync(qaReportPath)) {
  const qaReport = JSON.parse(fs.readFileSync(qaReportPath, 'utf8'))
  const runtimeDuplicates = qaReport.idMapping?.runtimeDuplicateIds ?? []
  assert(runtimeDuplicates.length === 0, `item-icon QA 仍存在运行时重复 ID：${runtimeDuplicates.map(entry => entry.id).join(', ')}`)
}

if (errors.length > 0) {
  console.error('qa:item-data-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa:item-data-guards passed')
