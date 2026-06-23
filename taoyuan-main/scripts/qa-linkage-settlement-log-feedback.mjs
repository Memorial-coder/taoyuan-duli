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

const questStore = read('src/stores/useQuestStore.ts')
const npcStore = read('src/stores/useNpcStore.ts')
const museumStore = read('src/stores/useMuseumStore.ts')
const regionMapStore = read('src/stores/useRegionMapStore.ts')
const regionMapView = read('src/views/game/RegionMapView.vue')
const hanhaiStore = read('src/stores/useHanhaiStore.ts')
const hanhaiView = read('src/views/game/HanhaiView.vue')
const quarryStore = read('src/stores/useQuarryStore.ts')
const quarryView = read('src/views/game/QuarryView.vue')
const quarryTypes = read('src/types/quarry.ts')
const cottageView = read('src/views/game/CottageView.vue')
const onlineOrdersView = read('src/views/game/online/OnlineOrdersView.vue')
const logTypes = read('src/types/log.ts')
const packageJson = JSON.parse(read('package.json'))

const assertIncludes = (source, token, message) => assert(source.includes(token), message)
const assertMatches = (source, pattern, message) => assert(pattern.test(source), message)

assertIncludes(
  npcStore,
  '【家庭心愿】${consumedText}已完成',
  'Family wish completion must keep a structured success log with consumed items.'
)
assertIncludes(
  npcStore,
  '【家庭心愿】「${wishDef.title}」材料扣除失败',
  'Family wish material rollback must log the failure reason.'
)
assertIncludes(
  cottageView,
  '【家庭心愿】暂不能完成',
  'Cottage family-wish fallback failures must keep the system tag.'
)

assertIncludes(
  questStore,
  'submittedItemsForLog',
  'Quest submissions must accumulate actual submitted inventory items for the settlement log.'
)
assertIncludes(
  questStore,
  'formatQuestSubmissionItems(submittedItemsForLog)',
  'Quest settlement log must format submitted item names and quantities.'
)
assertIncludes(
  questStore,
  '【订单】提交 ${submittedText}',
  'Quest settlement success must log submitted items with the order system tag.'
)
assertIncludes(
  questStore,
  'processedOrderCompleted ?',
  'Processed-order success log must state when the processed-order metric advances.'
)
assertIncludes(
  questStore,
  'npcFunctionAdvancedOrderCompleted ?',
  'NPC advanced-order success log must state when the NPC advanced-order metric advances.'
)
assertMatches(
  questStore,
  /specialOrderSettlementReceipts\.value\.includes\(quest\.id\)[\s\S]*请勿重复提交/,
  'Special orders must keep the duplicate-settlement guard before success logs can be written.'
)
assertMatches(
  questStore,
  /rollbackSubmissionState = \(\) => \{[\s\S]*processedOrderSubmissionCount\.value = processedOrderSubmissionCountSnapshot[\s\S]*npcFunctionAdvancedOrderCompletionCount\.value = npcFunctionAdvancedOrderCompletionCountSnapshot/,
  'Quest rollback must restore the new life-linkage counters if settlement fails.'
)

assertIncludes(
  museumStore,
  'failExhibitSetSubmission',
  'Museum exhibit-set submissions must use a central failure logger.'
)
assertIncludes(
  museumStore,
  '【博物馆】专题展组提交失败',
  'Museum exhibit-set submission failures must write a tagged reason log.'
)
assertIncludes(
  museumStore,
  '专题展组「${set.name}」提交了',
  'Museum exhibit-set submissions must keep a success log.'
)
assertMatches(
  museumStore,
  /beginMuseumAction\(lockId\)[\s\S]*请勿重复点击/,
  'Museum exhibit-set submission must keep duplicate-click protection.'
)

assertIncludes(
  regionMapStore,
  'failResourceTurnIn',
  'Region map resource turn-ins must use a central failure logger.'
)
assertIncludes(
  regionMapStore,
  '【行旅图】公共资源交付失败',
  'Region map turn-in failures must write a tagged reason log.'
)
assertIncludes(
  regionMapStore,
  '【行旅图】公共资源交付：消耗',
  'Region map turn-in success must keep a structured consume-and-submit log.'
)
assertMatches(
  regionMapStore,
  /inventoryStore\.serialize\(\)[\s\S]*consumeFamilyResources\(familyId, normalized\)[\s\S]*removeItemAnywhere\(requirement\.itemId, requirement\.required\)[\s\S]*inventoryStore\.deserialize\(inventorySnapshot\)/,
  'Region map turn-ins must keep inventory/ledger rollback around real item consumption.'
)
assert(
  !/addLog\(`【行旅图】\$\{result\.success/.test(regionMapView),
  'RegionMapView must not duplicate the store-level turn-in success log.'
)

assertIncludes(
  hanhaiStore,
  'failRelicExplore',
  'Hanhai relic exploration must use a central failure logger.'
)
assertIncludes(
  hanhaiStore,
  '【瀚海】遗迹勘探失败',
  'Hanhai relic exploration failures must write a tagged reason log.'
)
assertIncludes(
  hanhaiStore,
  'prepConsumptionSummary',
  'Hanhai travel-prep success logs must list the actual consumed prep items.'
)
assertIncludes(
  hanhaiStore,
  '【瀚海】${explorationSummary}',
  'Hanhai relic exploration success must include the Hanhai system tag.'
)
assert(
  !/const result = hanhaiStore\.exploreRelicSite/.test(hanhaiView),
  'HanhaiView must not duplicate store-level relic exploration failure logs.'
)

assertIncludes(
  quarryStore,
  'addQuarryMineSettlementFailureLog',
  'Quarry mine settlement must use a central failure logger for prep failures.'
)
assertIncludes(
  quarryStore,
  '【旧采石场】结算失败',
  'Quarry mine settlement failures must write a tagged reason log.'
)
assertIncludes(
  quarryStore,
  '消耗 ${elixirName} x1',
  'Quarry elixir consumption logs must include item quantity.'
)
assertIncludes(
  quarryStore,
  'globalLogged: Boolean(elixirPrep)',
  'Quarry elixir consumption must mark store-level success logs so the view does not duplicate them.'
)
assertIncludes(
  quarryTypes,
  'globalLogged?: boolean',
  'Quarry collect result type must expose the globalLogged handoff flag.'
)
assertIncludes(
  quarryView,
  'pushExploreLog(result.message, !result.globalLogged)',
  'QuarryView must suppress duplicate global logs when the store already wrote a settlement log.'
)

assertIncludes(
  onlineOrdersView,
  '【线上订单】提交 ${getOrderItemLabel(order.itemId)}×${order.quantity}',
  'Online weak-item order success must keep a structured submit log.'
)
assertIncludes(
  onlineOrdersView,
  'weakItemOrderCompleted.value',
  'Online weak-item order must keep its weekly duplicate-submission guard.'
)
assertIncludes(
  onlineOrdersView,
  '扣除${getOrderItemLabel(order.itemId)}失败',
  'Online weak-item order failures must explain failed item consumption.'
)

for (const tag of ['hanhai_travel_prep_sink', 'museum_exhibit_set', 'region_resource_turn_in_sink', 'resource_sink']) {
  assertIncludes(logTypes, `| '${tag}'`, `GameLogTag must register ${tag}.`)
}

assert(
  packageJson.scripts?.['qa:linkage-settlement-log-feedback'] === 'node scripts/qa-linkage-settlement-log-feedback.mjs',
  'package.json must register qa:linkage-settlement-log-feedback.'
)

if (errors.length > 0) {
  console.error(`qa-linkage-settlement-log-feedback failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-linkage-settlement-log-feedback passed')
