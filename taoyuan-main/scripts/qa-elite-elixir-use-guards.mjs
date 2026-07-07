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

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const unique = values => Array.from(new Set(values.filter(Boolean)))

const parseSharedWorkshopAlchemyRecipes = source => {
  const recipes = []

  for (const line of source.split(/\r?\n/)) {
    if (!line.includes("station: 'alchemy_furnace'") || !line.includes("process_kind: 'alchemy_elixir'")) continue

    const idMatch = line.match(/id: '([^']+)'/)
    const outputMatch = line.match(/output_item_id: '([^']+)'/)
    const resultKindMatch = line.match(/alchemy_result_kind: '([^']+)'/)
    const inputItemIds = [...line.matchAll(/item_id: '([^']+)'/g)].map(inputMatch => inputMatch[1])

    recipes.push({
      id: idMatch?.[1] ?? '',
      inputItemIds,
      outputItemId: outputMatch?.[1] ?? '',
      resultKind: resultKindMatch?.[1] ?? ''
    })
  }

  return recipes
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
const encyclopedia = await import(pathToFileURL(path.join(srcRoot, 'data', 'itemEncyclopedia.ts')).href)

const { getItemExtraDetails } = encyclopedia

const {
  ITEMS,
  PROCESSING_RECIPES,
  SUPPLEMENTAL_ALCHEMY_USE_RECIPES,
  ITEM_LINKAGE_DEFS,
  QUARRY_MINE_ELIXIR_PREP_OPTIONS,
  REGION_EXPEDITION_ELIXIR_PREP_OPTIONS,
  getAlchemyRecipeByOutputItemId,
  getItemById,
  getItemLinkageUseLabels,
  getItemLinkageUseTags
} = data

const eliteElixirRecipes = [
  { recipeId: 'shared_ley_crystal_focus_elixir', itemId: 'ley_crystal_focus_elixir', requiredEffects: ['journeyStaminaReduction', 'actionSpeedBonus', 'dialogueAffinityBonus'], sinkLabel: '远征', sinkPanel: 'region-map' },
  { recipeId: 'shared_wind_core_guard_pill', itemId: 'wind_core_guard_pill', requiredEffects: ['miningStaminaReduction', 'journeyStaminaReduction', 'defenseReduction'], sinkLabel: '采石场', sinkPanel: 'quarry' },
  { recipeId: 'shared_marsh_luminous_cleansing_elixir', itemId: 'marsh_luminous_cleansing_elixir', requiredEffects: ['journeyStaminaReduction', 'miningStaminaReduction', 'defenseReduction'], sinkLabel: '远征', sinkPanel: 'region-map' },
  { recipeId: 'shared_moon_pearl_calm_elixir', itemId: 'moon_pearl_calm_elixir', requiredEffects: ['staminaRestore', 'journeyStaminaReduction', 'petCalmFriendshipBonus'], sinkLabel: '远征', sinkPanel: 'region-map' },
  { recipeId: 'shared_jade_orchid_focus_elixir', itemId: 'jade_orchid_focus_elixir', requiredEffects: ['actionSpeedBonus', 'festivalRewardMultiplier', 'giftBonusMultiplier'], sinkLabel: '使用', sinkPanel: 'inventory' },
  { recipeId: 'shared_rare_lotus_guard_elixir', itemId: 'rare_lotus_guard_elixir', requiredEffects: ['defenseReduction', 'miningStaminaReduction', 'petCalmFriendshipBonus'], sinkLabel: '采石场', sinkPanel: 'quarry' },
  { recipeId: 'shared_jade_peach_spirit_elixir', itemId: 'jade_peach_spirit_elixir', requiredEffects: ['giftBonusMultiplier', 'dialogueAffinityBonus', 'festivalRewardMultiplier', 'journeyStaminaReduction'], sinkLabel: '使用', sinkPanel: 'inventory' }
]

const eliteElixirIds = eliteElixirRecipes.map(entry => entry.itemId)

const cohabitationSource = read('src/views/game/online/OnlineCohabitationView.vue')
const sharedAlchemyRecipes = parseSharedWorkshopAlchemyRecipes(cohabitationSource)
const sharedAlchemySuccessOutputIds = unique(sharedAlchemyRecipes
  .filter(recipe => recipe.resultKind === 'success')
  .map(recipe => recipe.outputItemId))

for (const recipe of sharedAlchemyRecipes) {
  for (const itemId of unique([...recipe.inputItemIds, recipe.outputItemId])) {
    assert(getItemById(itemId), `shared alchemy recipe references undefined item: ${recipe.id} -> ${itemId}`)
  }
}

for (const itemId of sharedAlchemySuccessOutputIds) {
  assert(
    getAlchemyRecipeByOutputItemId(itemId),
    `shared alchemy success output is missing data alchemy metadata: ${itemId}`
  )
  const item = getItemById(itemId)
  if (item?.category === 'elixir') {
    assert(
      getItemExtraDetails(item).some(detail => detail.value.includes(getAlchemyRecipeByOutputItemId(itemId)?.alchemy?.effect.description ?? '__missing__')),
      `shared alchemy elixir encyclopedia is missing effect details: ${itemId}`
    )
  }
}

for (const recipe of SUPPLEMENTAL_ALCHEMY_USE_RECIPES) {
  const alchemyItemIds = unique([
    recipe.outputItemId,
    recipe.alchemy?.mainMaterialId,
    ...(recipe.alchemy?.supportMaterialIds ?? []),
    recipe.alchemy?.primerItemId
  ])

  for (const itemId of alchemyItemIds) {
    assert(getItemById(itemId), `supplemental alchemy metadata references undefined item: ${recipe.id} -> ${itemId}`)
  }
}
assert(cohabitationSource.includes('data-testid="online-cohabitation-shared-elixir-return-panel"'), '共同庄园页缺少高阶丹药单人回流面板')
assert(cohabitationSource.includes('data-testid="online-cohabitation-shared-elixir-return-current"'), '共同庄园页缺少当前回流丹药读回')
assert(cohabitationSource.includes('data-testid="online-cohabitation-shared-elixir-return-route"'), '共同庄园页缺少单人用途路径说明')
assert(cohabitationSource.includes('data-testid="online-cohabitation-shared-elixir-return-sinks"'), '共同庄园页缺少单人消耗口列表')
assert(cohabitationSource.includes('SHARED_ELIXIR_SINGLE_PLAYER_USE_HINTS'), '共同庄园页缺少高阶丹药单人用途提示表')
assert(cohabitationSource.includes('sharedElixirSinglePlayerUseRows'), '共同庄园页缺少高阶丹药已接数量读回')
assert(cohabitationSource.includes('selectedSharedWorkshopSinglePlayerUseHint'), '共同庄园页缺少选中丹药用途 computed')
assert(cohabitationSource.includes("id: 'single-player-return'"), '共同工坊执行回读缺少单人用途行')
assert(cohabitationSource.includes('取出到单人背包后可直接服用'), '共同庄园页必须说明产物取出后进入单人背包使用')

for (const { recipeId, itemId } of eliteElixirRecipes) {
  assert(ITEMS.some(item => item.id === itemId), `缺少高阶丹药物品定义：${itemId}`)
  assert(
    new RegExp(`id: '${escapeRegExp(recipeId)}'[\\s\\S]*?output_item_id: '${escapeRegExp(itemId)}'[\\s\\S]*?alchemy_result_kind: 'success'`).test(cohabitationSource),
    `共同丹炉成功产物未绑定 ${itemId}：${recipeId}`
  )
  assert(cohabitationSource.includes(`${itemId}: {`), `共同庄园页单人用途提示表缺少：${itemId}`)
}

for (const { itemId, requiredEffects } of eliteElixirRecipes) {
  const recipe = getAlchemyRecipeByOutputItemId(itemId)
  assert(!!recipe?.alchemy, `高阶丹药未接入 getAlchemyRecipeByOutputItemId：${itemId}`)
  assert(SUPPLEMENTAL_ALCHEMY_USE_RECIPES.some(entry => entry.outputItemId === itemId), `补充炼丹使用表缺少：${itemId}`)
  assert(!PROCESSING_RECIPES.some(entry => entry.outputItemId === itemId), `高阶共同丹炉丹药不应误塞进普通单人工坊配方：${itemId}`)
  const alchemyItemIds = [
    recipe?.alchemy?.mainMaterialId,
    ...(recipe?.alchemy?.supportMaterialIds ?? []),
    recipe?.alchemy?.primerItemId
  ].filter(Boolean)
  for (const alchemyItemId of alchemyItemIds) {
    assert(getItemById(alchemyItemId), `高阶丹药元数据引用了未定义物品：${itemId} -> ${alchemyItemId}`)
  }
  for (const effectKey of requiredEffects) {
    assert(recipe?.alchemy?.effect?.[effectKey] !== undefined, `高阶丹药缺少效果 ${effectKey}：${itemId}`)
  }
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(linkage?.currentUseSystems.includes('inventoryUse'), `联动矩阵未标记背包使用当前用途：${itemId}`)
  assert(linkage?.repeatableSinks.includes('inventoryUse'), `联动矩阵未标记背包使用重复消耗口：${itemId}`)
  assert(getItemLinkageUseLabels(itemId).includes('使用'), `物品卡用途标签缺少“使用”：${itemId}`)
  assert(
    getItemLinkageUseTags(itemId).some(tag => tag.label === '使用' && tag.panelKey === 'inventory'),
    `物品卡用途标签不能跳转背包使用：${itemId}`
  )
}

for (const { itemId, sinkLabel, sinkPanel } of eliteElixirRecipes) {
  assert(
    getItemLinkageUseTags(itemId).some(tag => tag.label === sinkLabel && tag.panelKey === sinkPanel),
    `物品卡用途标签缺少 ${sinkLabel} 入口：${itemId}`
  )
}

for (const itemId of ['wind_core_guard_pill', 'rare_lotus_guard_elixir']) {
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(QUARRY_MINE_ELIXIR_PREP_OPTIONS.some(entry => entry.itemId === itemId), `采石场准备表缺少：${itemId}`)
  assert(linkage?.repeatableSinks.includes('quarry'), `联动矩阵未标记采石场重复消耗口：${itemId}`)
}

for (const itemId of ['ley_crystal_focus_elixir', 'marsh_luminous_cleansing_elixir', 'moon_pearl_calm_elixir']) {
  const linkage = ITEM_LINKAGE_DEFS.find(entry => entry.itemId === itemId)
  assert(REGION_EXPEDITION_ELIXIR_PREP_OPTIONS.some(entry => entry.itemId === itemId), `行旅图准备表缺少：${itemId}`)
  assert(linkage?.repeatableSinks.includes('regionMap'), `联动矩阵未标记行旅图重复消耗口：${itemId}`)
}

const processingSource = read('src/data/processing.ts')
assert(processingSource.includes('SUPPLEMENTAL_ALCHEMY_USE_RECIPES.find'), '炼丹 lookup 必须查询共同丹炉补充使用表')

const inventorySource = read('src/views/game/InventoryView.vue')
assert(inventorySource.includes('!!getAlchemyRecipeByOutputItemId(itemId)'), '背包可使用判断必须读取炼丹 lookup')
assert(inventorySource.includes('isUseBlocked') && inventorySource.includes('cookingStore.activeElixir'), '背包必须在已有丹药时阻止叠加使用')
assert(inventorySource.includes('cookingStore.useElixir(itemId, quality)'), '背包使用必须调用 useElixir 统一扣物和生效')
assert(inventorySource.includes('activeItemElixirEffect'), '背包详情必须显示丹药效果')

const cookingStoreSource = read('src/stores/useCookingStore.ts')
assert(cookingStoreSource.includes('const useElixir = (itemId: string'), '料理 store 缺少 useElixir')
assert(cookingStoreSource.includes('getAlchemyRecipeByOutputItemId(itemId)'), 'useElixir 必须按产物查炼丹效果')
assert(cookingStoreSource.includes('if (activeElixir.value)'), 'useElixir 必须阻止同日丹药叠加')
assert(cookingStoreSource.includes('inventoryStore.removeUnlockedItem(itemId, 1, quality)'), 'useElixir 必须真实扣除未锁定丹药')
assert(cookingStoreSource.includes('activeElixir.value = normalizeActiveElixir(active)'), 'useElixir 必须写入当天 activeElixir')
assert(cookingStoreSource.includes('activeElixir.value = null'), 'dailyReset 必须清空当天丹药')

const effectConsumers = [
  { key: 'getActiveAlchemyMiningStaminaReduction', file: 'src/stores/useMiningStore.ts' },
  { key: 'getActiveAlchemyJourneyStaminaReduction', file: 'src/stores/useRegionMapStore.ts' },
  { key: 'getActiveAlchemyGiftBonusMultiplier', file: 'src/views/game/NpcView.vue' },
  { key: 'getActiveAlchemyActionSpeedBonus', file: 'src/stores/useGameStore.ts' },
  { key: 'getActiveAlchemyDefenseReduction', file: 'src/stores/useMiningStore.ts' },
  { key: 'getActiveAlchemyDefenseReduction', file: 'src/stores/useQuarryStore.ts' },
  { key: 'getActiveAlchemyDialogueAffinityBonus', file: 'src/stores/useNpcStore.ts' },
  { key: 'getActiveAlchemyFestivalRewardMultiplier', file: 'src/composables/useDialogs.ts' },
  { key: 'getActiveAlchemyPetCalmFriendshipBonus', file: 'src/stores/useAnimalStore.ts' }
]

for (const { key, file } of effectConsumers) {
  assert(read(file).includes(key), `丹药效果没有被消费端读取：${file} -> ${key}`)
}

const expeditionQaSource = read('scripts/qa-elite-elixir-expedition-consumption.mjs')
for (const itemId of ['wind_core_guard_pill', 'rare_lotus_guard_elixir', 'ley_crystal_focus_elixir', 'marsh_luminous_cleansing_elixir', 'moon_pearl_calm_elixir']) {
  assert(expeditionQaSource.includes(itemId), `远征/采石场消耗守卫缺少：${itemId}`)
}

if (errors.length > 0) {
  console.error('qa-elite-elixir-use-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-elite-elixir-use-guards passed (${eliteElixirIds.length} linked elixirs, ${sharedAlchemySuccessOutputIds.length} shared alchemy success outputs, ${sharedAlchemyRecipes.length} shared alchemy variants).`)
