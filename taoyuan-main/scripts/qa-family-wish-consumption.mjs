/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const getObjectBlock = (source, marker) => {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const end = source.indexOf('\n  },', start)
  return end > start ? source.slice(start, end) : source.slice(start)
}

const typesSource = read('src/types/npc.ts')
assert(typesSource.includes('export interface FamilyWishItemRequirement'), '缺少 FamilyWishItemRequirement 类型')
assert(typesSource.includes('itemRequirements?: FamilyWishItemRequirement[]'), 'FamilyWishDef 未声明 itemRequirements')

const npcDataSource = read('src/data/npcs.ts')
const sharedBreakfastBlock = getObjectBlock(npcDataSource, "id: 'wish_shared_breakfast'")
assert(sharedBreakfastBlock.includes('itemRequirements'), '庭前共食未声明物品需求')
assert(/itemId:\s*'mixed_seed_oil'[\s\S]*?quantity:\s*1/.test(sharedBreakfastBlock), '庭前共食应消耗 mixed_seed_oil x1')
assert(/itemId:\s*'egg'[\s\S]*?quantity:\s*2/.test(sharedBreakfastBlock), '庭前共食应消耗 egg x2')

const marketFeastBlock = getObjectBlock(npcDataSource, "id: 'wish_market_feast'")
assert(marketFeastBlock.includes('itemRequirements'), '集市共宴未声明物品需求')
assert(/itemId:\s*'mixed_seed_oil'[\s\S]*?quantity:\s*2/.test(marketFeastBlock), '集市共宴应消耗 mixed_seed_oil x2')
assert(/itemId:\s*'rice_flour'[\s\S]*?quantity:\s*1/.test(marketFeastBlock), '集市共宴应消耗 rice_flour x1')

const npcStoreSource = read('src/stores/useNpcStore.ts')
assert(npcStoreSource.includes('normalizeFamilyWishItemRequirements'), 'useNpcStore 缺少心愿需求规范化')
assert(npcStoreSource.includes('getFamilyWishItemRequirementStatus'), 'useNpcStore 缺少心愿材料库存状态')
assert(npcStoreSource.includes('getFamilyWishCompletionBlockReason'), 'useNpcStore 缺少心愿完成阻塞原因')
assert(npcStoreSource.includes('removeItemAnywhereAtLeast'), '心愿扣料未支持最低品质消耗')
assert(npcStoreSource.includes('removeItemAnywhere(requirement.itemId'), '心愿扣料未调用真实背包扣除')

const completeBlock = npcStoreSource.slice(
  npcStoreSource.indexOf('const completeFamilyWish'),
  npcStoreSource.indexOf('const getEligibleFamilyWishDefs')
)
assert(completeBlock.includes('missingRequirements'), 'completeFamilyWish 未在完成前检查材料缺口')
assert(completeBlock.includes('const inventorySnapshot = inventoryStore.serialize()'), 'completeFamilyWish 扣料前未保存背包快照')
assert(completeBlock.includes('inventoryStore.deserialize(inventorySnapshot)'), 'completeFamilyWish 缺少失败回滚')
assert(
  completeBlock.indexOf('consumeFamilyWishItemRequirements(wishDef)') >= 0 &&
  completeBlock.indexOf('grantRelationshipReward') >= 0 &&
  completeBlock.indexOf('consumeFamilyWishItemRequirements(wishDef)') < completeBlock.indexOf('grantRelationshipReward'),
  '家庭心愿必须先扣材料，再发放奖励，并通过快照回滚失败'
)
assert(npcStoreSource.includes('材料或奖励结算受阻'), '自动周结失败日志仍只描述奖励受阻')

const cottageSource = read('src/views/game/CottageView.vue')
assert(cottageSource.includes('data-testid="cottage-family-wish-panel"'), 'CottageView 缺少家庭心愿面板')
assert(cottageSource.includes('data-testid="cottage-family-wish-requirements"'), 'CottageView 缺少心愿材料需求区')
assert(cottageSource.includes('data-testid="cottage-family-wish-requirement-row"'), 'CottageView 缺少心愿材料行')
assert(cottageSource.includes('familyWishRequirementRows'), 'CottageView 未读取心愿材料库存状态')
assert(cottageSource.includes('familyWishCompletionBlockReason'), 'CottageView 未展示完成阻塞原因')
assert(cottageSource.includes('npcStore.completeFamilyWish(wishId)'), 'CottageView 完成按钮未调用 completeFamilyWish')
assert(cottageSource.includes('activateNextFamilyWishForCurrentDay'), 'CottageView 缺少安排心愿入口')

const itemLinkageSource = read('src/data/itemLinkage.ts')
const mixedOilBlock = getObjectBlock(itemLinkageSource, "itemId: 'mixed_seed_oil'")
assert(mixedOilBlock.includes("'familyWish'"), 'mixed_seed_oil 联动矩阵未标记家庭心愿')
assert(mixedOilBlock.includes("repeatableSinks: ['cooking', 'quest', 'familyWish']"), 'mixed_seed_oil 重复消耗口缺少家庭心愿')

if (errors.length > 0) {
  console.error('qa-family-wish-consumption failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-family-wish-consumption passed (item requirements, atomic consumption, Cottage UI).')
