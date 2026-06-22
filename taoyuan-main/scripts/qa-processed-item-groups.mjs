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
  PROCESSING_RECIPES,
  LINKAGE_DEMAND_POOL,
  PROCESSED_ITEM_GROUPS,
  PROCESSED_ITEM_GROUP_REQUIRED_MACHINE_TYPES,
  getProcessedItemGroupDef,
  getProcessedItemGroupIdsForItem,
  getProcessedItemGroupLabelsForItem,
  getProcessedItemIdsByGroup,
  getProcessedItemDemandCandidates,
  getLinkageDemandEntriesByProcessedGroup,
  generateSpecialOrder
} = data

const itemIds = new Set(ITEMS.map(item => item.id))
const groupIds = new Set(PROCESSED_ITEM_GROUPS.map(group => group.id))
const groupedItemIds = new Set(PROCESSED_ITEM_GROUPS.flatMap(group => group.itemIds))
const requiredMachineTypes = new Set(PROCESSED_ITEM_GROUP_REQUIRED_MACHINE_TYPES)

const requiredGroupIds = [
  'oil',
  'flour',
  'pickled',
  'dried',
  'sweet',
  'animal_processed',
  'fish_processed',
  'medicine_processed',
  'fermented',
  'tea',
  'tofu',
  'feed',
  'textile',
  'incense',
  'refined_material',
  'spirit_craft'
]

for (const groupId of requiredGroupIds) {
  const group = getProcessedItemGroupDef(groupId)
  assert(!!group, `缺少加工品分组：${groupId}`)
  assert((group?.itemIds.length ?? 0) > 0, `加工品分组为空：${groupId}`)
}

assert(PROCESSED_ITEM_GROUPS.length === groupIds.size, '加工品分组 id 存在重复')

for (const group of PROCESSED_ITEM_GROUPS) {
  assert(group.label.length > 0, `加工品分组缺少 label：${group.id}`)
  assert(group.summary.length > 0, `加工品分组缺少 summary：${group.id}`)
  assert(group.demandSystems.length > 0, `加工品分组缺少需求系统：${group.id}`)
  for (const itemId of group.itemIds) {
    assert(itemIds.has(itemId), `加工品分组 ${group.id} 引用了不存在物品：${itemId}`)
  }
  for (const candidateId of [
    ...(group.orderCandidateItemIds ?? []),
    ...(group.familyWishCandidateItemIds ?? []),
    ...(group.festivalCandidateItemIds ?? [])
  ]) {
    assert(group.itemIds.includes(candidateId), `加工品分组 ${group.id} 候选 ${candidateId} 未包含在 itemIds 内`)
  }
}

const requiredMemberships = {
  mixed_seed_oil: ['oil'],
  rice_flour: ['flour'],
  fine_flour: ['flour'],
  premium_flour: ['flour'],
  pickled_cabbage: ['pickled'],
  pickled_ginger: ['pickled'],
  dried_crop_bundle: ['dried'],
  dried_fruit_mix: ['dried'],
  honey: ['sweet'],
  candied_peach: ['sweet'],
  mayonnaise: ['animal_processed'],
  cheese: ['animal_processed'],
  smoked_fish: ['fish_processed'],
  fish_feed: ['fish_processed', 'feed'],
  rare_elixir_crystal: ['medicine_processed'],
  ley_crystal_focus_elixir: ['medicine_processed'],
  tavern_rice_wine: ['fermented'],
  processed_osmanthus_tea: ['tea'],
  tofu: ['tofu'],
  premium_feed: ['feed'],
  cloth: ['textile'],
  rustic_incense: ['incense'],
  bronze_bar: ['refined_material'],
  dragon_scale_charm: ['spirit_craft'],
  starlight_loom: ['spirit_craft']
}

for (const [itemId, expectedGroupIds] of Object.entries(requiredMemberships)) {
  const actualGroupIds = getProcessedItemGroupIdsForItem(itemId)
  for (const expectedGroupId of expectedGroupIds) {
    assert(actualGroupIds.includes(expectedGroupId), `${itemId} 未进入加工品分组：${expectedGroupId}`)
  }
}

for (const recipe of PROCESSING_RECIPES) {
  if (!recipe.outputItemId || !requiredMachineTypes.has(recipe.machineType)) continue
  assert(groupedItemIds.has(recipe.outputItemId), `加工产物未进入任一分组：${recipe.machineType} -> ${recipe.outputItemId}`)
}

const questCandidates = getProcessedItemDemandCandidates('quest')
const familyWishCandidates = getProcessedItemDemandCandidates('familyWish')
const festivalCandidates = getProcessedItemDemandCandidates('festival')

assert(questCandidates.length >= 30, '订单加工品候选池数量不足')
assert(familyWishCandidates.length >= 20, '家庭心愿加工品候选池数量不足')
assert(festivalCandidates.length >= 20, '节会加工品候选池数量不足')

for (const groupId of ['oil', 'flour', 'pickled', 'dried', 'sweet', 'animal_processed', 'fish_processed', 'medicine_processed', 'fermented', 'tea', 'tofu', 'feed', 'textile', 'incense']) {
  assert(questCandidates.some(candidate => candidate.groupId === groupId), `订单候选池缺少加工分组：${groupId}`)
}
for (const groupId of ['oil', 'flour', 'pickled', 'dried', 'sweet', 'animal_processed', 'fish_processed', 'medicine_processed', 'tea', 'tofu', 'feed', 'textile', 'incense']) {
  assert(familyWishCandidates.some(candidate => candidate.groupId === groupId), `家庭心愿候选池缺少加工分组：${groupId}`)
}
for (const groupId of ['oil', 'flour', 'pickled', 'dried', 'sweet', 'animal_processed', 'fish_processed', 'medicine_processed', 'fermented', 'tea', 'tofu', 'textile', 'incense']) {
  assert(festivalCandidates.some(candidate => candidate.groupId === groupId), `节会候选池缺少加工分组：${groupId}`)
}

for (const group of PROCESSED_ITEM_GROUPS.filter(group => group.demandSystems.includes('quest'))) {
  const entries = getLinkageDemandEntriesByProcessedGroup(group.id)
  assert(entries.some(entry => entry.systems.includes('quest')), `联动需求池缺少订单分组入口：${group.id}`)
}

assert(LINKAGE_DEMAND_POOL.some(entry => entry.processedGroupId), '联动需求池没有任何 processedGroupId 条目')
assert(
  getLinkageDemandEntriesByProcessedGroup('oil').some(entry => entry.itemId === 'mixed_seed_oil'),
  '联动需求池无法按油料分组反查 mixed_seed_oil'
)
assert(getProcessedItemGroupLabelsForItem('mixed_seed_oil').includes('油料'), '杂籽油百科/物品卡分组标签缺少油料')
assert(getProcessedItemIdsByGroup('spirit_craft').includes('starlight_loom'), '灵锻分组缺少星光织机')

let trace
const flourOrder = generateSpecialOrder(
  'spring',
  2,
  { allowedActivitySourceIds: ['processed_group_flour_rice_flour'] },
  { onTrace: nextTrace => { trace = nextTrace } }
)
const flourCandidate = trace?.candidates.find(candidate => candidate.activitySourceId === 'processed_group_flour_rice_flour')

assert(!!flourOrder, '无法按加工分组来源生成米粉特殊订单')
assert(flourOrder?.processedItemGroupId === 'flour', '米粉特殊订单实例缺少粉料分组 id')
assert(flourOrder?.processedItemGroupLabel === '粉料', '米粉特殊订单实例缺少粉料分组 label')
assert(flourOrder?.demandHint?.includes('粉料池'), '米粉特殊订单需求提示未写入粉料池')
assert(flourOrder?.requirementSummary?.some(line => line.includes('加工分组：粉料')), '米粉特殊订单需求摘要未写入加工分组')
assert(flourOrder?.bonusSummary?.some(line => line.includes('加工分组：粉料')), '米粉特殊订单奖励摘要未写入加工分组')
assert(flourCandidate?.processedItemGroupId === 'flour', '米粉特殊订单 trace 候选缺少粉料分组 id')
assert(flourCandidate?.processedItemGroupLabel === '粉料', '米粉特殊订单 trace 候选缺少粉料分组 label')

let tier3Trace
const refinedOrder = generateSpecialOrder(
  'winter',
  3,
  { allowedActivitySourceIds: ['processed_group_refined_material_bronze_bar'] },
  { onTrace: nextTrace => { tier3Trace = nextTrace } }
)
const refinedCandidate = tier3Trace?.candidates.find(candidate => candidate.activitySourceId === 'processed_group_refined_material_bronze_bar')

assert(!!refinedOrder, '无法按加工分组来源生成高阶精炼材料特殊订单')
assert(refinedOrder?.processedItemGroupId === 'refined_material', '精炼材料特殊订单实例缺少精炼材料分组 id')
assert(refinedOrder?.processedItemGroupLabel === '精炼材料', '精炼材料特殊订单实例缺少精炼材料分组 label')
assert(refinedOrder?.orderScoreRule?.id === 'procurement_stability', '加工品特殊订单必须使用稳定供货评分')
assert(refinedOrder?.antiRepeatTags?.includes('processed_group'), '加工品特殊订单缺少分组反重复标签')
assert(refinedCandidate?.processedItemGroupId === 'refined_material', '精炼材料特殊订单 trace 候选缺少分组 id')

const questSource = read('src/data/quests.ts')
const npcSource = read('src/data/npcs.ts')
const encyclopediaSource = read('src/data/itemEncyclopedia.ts')
const linkageDemandSource = read('src/data/linkageDemandPools.ts')
const questViewSource = read('src/views/game/QuestView.vue')

assert(questSource.includes('createProcessedGroupSpecialOrderTemplates'), '特殊订单未保留加工分组模板生成器')
assert(questSource.includes("processedItemGroupId: 'oil'"), '杂籽油特殊订单未标记油料分组')
assert(questSource.includes('processed_group_'), '特殊订单来源没有加工分组 activitySourceId')
assert(questSource.includes("antiRepeatTags: ['processed_group', seed.groupId, seed.itemId]"), '加工品特殊订单缺少分组反重复模板')
assert(npcSource.includes("sourceGroupId: 'oil'"), '家庭心愿未标记油料来源分组')
assert(npcSource.includes("sourceGroupId: 'flour'"), '家庭心愿未标记粉料来源分组')
assert(encyclopediaSource.includes('getProcessedItemGroupLabelsForItem'), '百科详情未读取加工品分组标签')
assert(encyclopediaSource.includes('加工分组'), '百科详情未展示加工分组')
assert(encyclopediaSource.includes('加工品消耗池'), '百科搜索关键词未加入加工品消耗池')
assert(linkageDemandSource.includes('getProcessedItemDemandCandidates'), '联动需求池未从加工品分组展开订单候选')
assert(linkageDemandSource.includes('getLinkageDemandEntriesByProcessedGroup'), '联动需求池缺少加工分组反查接口')
assert(questViewSource.includes('questStore.specialOrder.demandHint'), '任务页未展示特殊订单加工品需求提示')
assert(questViewSource.includes('questStore.specialOrder.activitySourceLabel'), '任务页未展示特殊订单加工品来源标签')

if (errors.length > 0) {
  console.error('qa-processed-item-groups failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-processed-item-groups passed (${PROCESSED_ITEM_GROUPS.length} groups, ${groupedItemIds.size} grouped items, ${questCandidates.length} quest candidates).`)
