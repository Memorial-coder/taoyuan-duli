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

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const getFunctionBody = (source, functionName) => {
  const index = source.indexOf(`const ${functionName}`)
  if (index === -1) return ''
  const arrowIndex = source.indexOf('=>', index)
  const bodyStart = source.indexOf('{', arrowIndex)
  if (bodyStart === -1) return ''
  let depth = 0
  for (let cursor = bodyStart; cursor < source.length; cursor++) {
    const char = source[cursor]
    if (char === '{') depth++
    if (char === '}') {
      depth--
      if (depth === 0) return source.slice(bodyStart, cursor + 1)
    }
  }
  return ''
}

const goalsSource = readSource('src/data/goals.ts')
const goalStoreSource = readSource('src/stores/useGoalStore.ts')
const goalTypesSource = readSource('src/types/goal.ts')
const weeklyBoardSource = readSource('src/components/game/WeeklyActivityBoard.vue')
const questViewSource = readSource('src/views/game/QuestView.vue')
const goalsViewSource = readSource('src/views/game/GoalsView.vue')
const fishPondStoreSource = readSource('src/stores/useFishPondStore.ts')
const breedingStoreSource = readSource('src/stores/useBreedingStore.ts')
const miningStoreSource = readSource('src/stores/useMiningStore.ts')
const regionMapStoreSource = readSource('src/stores/useRegionMapStore.ts')
const forageViewSource = readSource('src/views/game/ForageView.vue')
const farmActionsSource = readSource('src/composables/useFarmActions.ts')
const farmViewSource = readSource('src/views/game/FarmView.vue')

assert(goalTypesSource.includes('ticketRewards?: RewardTicketLedger'), 'GoalReward must support ticketRewards.')
assert(goalTypesSource.includes("export type WeeklyActivityThemeId = 'fishpond' | 'breeding' | 'gathering' | 'mining' | 'planting' | 'region_map'"), 'Weekly activity theme union must cover all six themes.')
assert(goalTypesSource.includes("export type WeeklyActivityTaskKind = 'counter' | 'metric' | 'itemSubmission' | 'fishSubmission' | 'seedSubmission'"), 'Weekly activity task kinds must include counters, metrics, and submissions.')
assert(goalTypesSource.includes('export interface WeeklyActivityState'), 'Weekly activity save state must be typed.')

assert(goalsSource.includes('export const WEEKLY_ACTIVITY_TASK_COUNT = 10'), 'Weekly activity must generate exactly 10 tasks.')
assert(goalsSource.includes('export const WEEKLY_ACTIVITY_REWARD_THRESHOLDS = [5, 7, 10] as const'), 'Weekly activity rewards must only use 5/7/10 thresholds.')
for (const themeId of ['fishpond', 'breeding', 'gathering', 'mining', 'planting', 'region_map']) {
  assert(new RegExp(`id:\\s*'${themeId}'`).test(goalsSource), `Weekly activity theme ${themeId} must be defined.`)
}
assert(goalsSource.includes('primaryTicketType') && goalsSource.includes('secondaryTicketType') && goalsSource.includes('bonusTicketType'), 'Weekly activity themes must map primary, secondary, and bonus ticket rewards.')
assert(goalsSource.includes("PONDABLE_FISH") && goalsSource.includes("POND_BREEDS"), 'Fishpond weekly tasks must use the real pond fish and breed data pools.')
assert(goalsSource.includes('POND_BREEDS.filter') && goalsSource.includes('breedSamples.map'), 'Fishpond weekly tasks must sample from the full breed pool, not only hard-coded example prefixes.')
assert(goalsSource.includes('sampleWeeklyActivityEntries(pool, WEEKLY_ACTIVITY_TASK_COUNT'), 'Weekly activity task selection must use stable sampling from the theme pool.')
assert(goalTypesSource.includes("'region_map_progress_actions'"), 'Weekly activity counters must include repeatable region-map progress actions.')
assert(goalsSource.includes("counterKey: 'region_map_progress_actions'"), 'Region-map weekly activity must use repeatable route/resource/boss progress instead of finite discovery count.')
assert(!goalsSource.includes("createWeeklyActivityTask('region_map', 'discover_3'"), 'Region-map weekly activity must not keep the legacy discovery task id for new weeks.')
assert(!goalsSource.includes("metricKey: 'discoveredCount',\n    targetValue: 3,\n    progressUnit: '项',\n    routeId: 'region-map'"), 'Region-map weekly activity must not require three new discoveries.')

assert(goalStoreSource.includes('const WEEKLY_ACTIVITY_STATE_VERSION = 1'), 'Weekly activity state version must be stored for save compatibility.')
assert(goalStoreSource.includes('weeklyActivityState = ref<WeeklyActivityState | null>(null)'), 'Goal store must own one shared weekly activity state.')
assert(goalStoreSource.includes('weeklyActivityOverview = computed'), 'Goal store must expose the shared weekly activity overview.')
assert(goalStoreSource.includes('walletStore.addRewardTickets(reward.ticketRewards'), 'Goal rewards must grant ticketRewards into the wallet.')
assert(goalStoreSource.includes('[grantedRewardTickets, weeklyBudgetEffect.ticketRewards, grantedServiceContractTickets].reduce'), 'Ticket reward ledgers must be merged by explicit accumulation.')
assert(goalStoreSource.includes('grantWeeklyActivityTierReward'), 'Weekly activity tier grants must use an internal helper.')
assert(goalStoreSource.includes('getRemainingDiscoveryGoalCapacity'), 'Daily and season discovery goals must check remaining discovery capacity.')
assert(goalStoreSource.includes('DAILY_GOAL_DEFS[season].filter(isGoalTemplateFeasible)'), 'Daily discovery goals must be filtered when no new discoveries remain.')
assert(goalStoreSource.includes('SEASON_GOAL_DEFS[season].filter(isGoalTemplateFeasible)'), 'Season discovery goals must be filtered when their target cannot be met.')
assert(goalStoreSource.includes('LEGACY_REGION_MAP_DISCOVERY_ACTIVITY_TASK_ID'), 'Goal store must migrate already-saved region-map discovery activity tasks.')
assert(goalStoreSource.includes('REGION_MAP_PROGRESS_ACTIVITY_TASK_ID'), 'Goal store must migrate old region-map discovery task id to the repeatable progress id.')

const settleWeeklyActivityBody = getFunctionBody(goalStoreSource, 'settleWeeklyActivity')
assert(settleWeeklyActivityBody.includes('grantWeeklyActivityTierReward(state, tier)'), 'Weekly activity weekly settlement must auto-grant unclaimed tiers from the old state.')
assert(!settleWeeklyActivityBody.includes('claimWeeklyActivityReward('), 'Weekly activity weekly settlement must not call the UI claim function, which refreshes current-week state.')

const submitWeeklyActivityBody = getFunctionBody(goalStoreSource, 'submitWeeklyActivityTask')
assert(submitWeeklyActivityBody.includes('removeItemAnywhere'), 'Item submission tasks must consume submitted inventory.')
assert(submitWeeklyActivityBody.includes('submitEligibleFishForOrder'), 'Fish submission tasks must consume eligible pond fish.')
assert(submitWeeklyActivityBody.includes('breedingStore.removeFromBox'), 'Seed submission tasks must consume eligible breeding-box seeds.')
assert(goalStoreSource.includes('recordWeeklyActivityCounter'), 'Goal store must expose weekly activity counters for gameplay hooks.')

assert(weeklyBoardSource.includes('data-testid="weekly-activity-board"'), 'WeeklyActivityBoard must expose a stable test id.')
assert(weeklyBoardSource.includes('submitWeeklyActivityTask') && weeklyBoardSource.includes('claimWeeklyActivityReward'), 'WeeklyActivityBoard must be able to submit tasks and claim rewards.')
assert(weeklyBoardSource.includes('getWeeklyActivityTaskSubmitStatus'), 'WeeklyActivityBoard must use store-backed submit status.')
assert(weeklyBoardSource.includes('REWARD_TICKET_LABELS'), 'WeeklyActivityBoard must display formal ticket labels.')
assert(questViewSource.includes('WeeklyActivityBoard') && questViewSource.includes('<WeeklyActivityBoard class="mb-3" />'), 'QuestView must show the shared full weekly activity board above the quest board flow.')
assert(!questViewSource.includes('<WeeklyActivityBoard class="mb-3" compact'), 'QuestView weekly activity board must not force compact single-column layout.')
assert(goalsViewSource.includes('WeeklyActivityBoard') && goalsViewSource.includes('<WeeklyActivityBoard class="map-goals-panel__weekly-activity" />'), 'GoalsView must show the same shared weekly activity board as the main focus panel.')
const goalsWeeklyActivityIndex = goalsViewSource.indexOf('map-goals-panel__weekly-activity')
const goalsListIndex = goalsViewSource.indexOf('data-testid="goals-list-panel"')
const goalsSummaryIndex = goalsViewSource.indexOf('data-testid="goals-summary"')
const goalsOperationZoneIndex = goalsViewSource.indexOf('data-testid="goals-operation-zone"')
const goalsOperationHintsIndex = goalsViewSource.indexOf('QuestBoardOperationHints')
assert(goalsWeeklyActivityIndex < goalsSummaryIndex, 'GoalsView weekly activity board must sit above the auxiliary summary cards.')
assert(
  goalsWeeklyActivityIndex !== -1 &&
    goalsListIndex !== -1 &&
    goalsOperationZoneIndex !== -1 &&
    goalsWeeklyActivityIndex < goalsListIndex &&
    goalsListIndex < goalsOperationZoneIndex,
  'GoalsView must render weekly activity, then the goal list, then operation hints.'
)
assert(
  goalsOperationZoneIndex !== -1 && goalsOperationHintsIndex !== -1 && goalsOperationZoneIndex < goalsOperationHintsIndex,
  'GoalsView operation hints must stay inside the lower operation zone.'
)
const goalsPanelStyle = goalsViewSource.match(/\.map-goals-panel\s*\{[\s\S]*?\}/)?.[0] ?? ''
assert(/width:\s*100%/.test(goalsPanelStyle), 'GoalsView root panel must fill the game viewport width.')
assert(!/max-width\s*:/.test(goalsPanelStyle), 'GoalsView root panel must not restore a desktop max-width cap.')
assert(!/margin-inline\s*:\s*auto/.test(goalsPanelStyle), 'GoalsView root panel must not be centered as a narrow column.')
assert(goalsViewSource.includes('本周活动：') && goalsViewSource.includes('weeklyActivityOverview.completedCount'), 'GoalsView weekly summary must reflect weekly activity progress.')

for (const [sourceName, source, hook] of [
  ['useFishPondStore.ts', fishPondStoreSource, 'fishpond_feed'],
  ['useFishPondStore.ts', fishPondStoreSource, 'fishpond_breeding_started'],
  ['useFishPondStore.ts', fishPondStoreSource, 'fishpond_breeding_completed'],
  ['useFishPondStore.ts', fishPondStoreSource, 'fishpond_products_collected'],
  ['useBreedingStore.ts', breedingStoreSource, 'breeding_started'],
  ['useMiningStore.ts', miningStoreSource, 'mining_stamina_spent'],
  ['useMiningStore.ts', miningStoreSource, 'mine_floors_descended'],
  ['useRegionMapStore.ts', regionMapStoreSource, 'region_map_progress_actions'],
  ['ForageView.vue', forageViewSource, 'forage_actions'],
  ['ForageView.vue', forageViewSource, 'forage_items_found'],
  ['useFarmActions.ts', farmActionsSource, 'farm_seeds_planted'],
  ['useFarmActions.ts', farmActionsSource, 'farm_watered'],
  ['useFarmActions.ts', farmActionsSource, 'farm_fertilizer_applied'],
  ['FarmView.vue', farmViewSource, 'farm_fertilizer_applied']
]) {
  assert(source.includes(`recordWeeklyActivityCounter('${hook}'`), `${sourceName} must record weekly activity counter ${hook}.`)
}

assert(fishPondStoreSource.includes('breedId?: string'), 'Fish submission helpers must support breedId filters.')
assert(fishPondStoreSource.includes('scoreMin?: number'), 'Fish submission helpers must support score filters.')
assert(fishPondStoreSource.includes('generationMin?: number'), 'Fish submission helpers must support generation filters.')

if (errors.length > 0) {
  console.error('[qa-weekly-board-activity-guards] failed')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-weekly-board-activity-guards] passed')
