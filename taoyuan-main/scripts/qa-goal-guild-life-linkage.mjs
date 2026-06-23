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

const goalTypeSource = readSource('src/types/goal.ts')
const goalsSource = readSource('src/data/goals.ts')
const goalStoreSource = readSource('src/stores/useGoalStore.ts')
const questStoreSource = readSource('src/stores/useQuestStore.ts')
const npcStoreSource = readSource('src/stores/useNpcStore.ts')
const museumStoreSource = readSource('src/stores/useMuseumStore.ts')
const quarryStoreSource = readSource('src/stores/useQuarryStore.ts')
const guildViewSource = readSource('src/views/game/GuildView.vue')
const packageJson = JSON.parse(readSource('package.json'))

const metrics = [
  'familyWishCompletions',
  'processedOrderSubmissions',
  'museumExhibitSetCompletions',
  'speciesNoteCompletions',
  'npcFunctionAdvancedOrderCompletions',
  'quarryWeeklyClaims'
]

for (const metric of metrics) {
  assert(goalTypeSource.includes(`| '${metric}'`), `GoalMetricKey / weekly metric type must include ${metric}.`)
  assert(goalsSource.includes(`${metric}:`), `goals.ts must label, bias, or preset ${metric}.`)
  assert(goalStoreSource.includes(`case '${metric}'`), `useGoalStore must read ${metric} from real stores.`)
}

for (const [metric, sourceToken] of [
  ['familyWishCompletions', 'getFamilyWishOverview().state.completedWishIds.length'],
  ['processedOrderSubmissions', 'questStore.processedOrderSubmissionCount'],
  ['museumExhibitSetCompletions', 'museumStore.completedExhibitSetCount'],
  ['speciesNoteCompletions', 'fishPondStore.speciesNoteOverview.completedCount'],
  ['npcFunctionAdvancedOrderCompletions', 'questStore.npcFunctionAdvancedOrderCompletionCount'],
  ['quarryWeeklyClaims', 'quarryStore.weeklyStewardshipLifetimeClaimCount']
]) {
  assert(goalStoreSource.includes(sourceToken), `${metric} must be sourced from ${sourceToken}.`)
}

const longGoalIds = [
  'long_family_wish_1',
  'long_processed_order_1',
  'long_quarry_weekly_1',
  'long_museum_exhibit_set_1',
  'long_species_note_1',
  'long_npc_advanced_order_1'
]
for (const goalId of longGoalIds) {
  assert(goalsSource.includes(`id: '${goalId}'`), `Long-term life-linkage goal ${goalId} must be defined.`)
  assert(goalsSource.includes(`${goalId}: { shortTitle:`), `Long-term life-linkage goal ${goalId} must have UI metadata.`)
}

for (const token of [
  "export type WeeklyActivityThemeId = 'fishpond' | 'breeding' | 'gathering' | 'mining' | 'planting' | 'region_map' | 'life_linkage'",
  "'life_linkage_actions'",
  "'processed_order_submitted'",
  "'npc_function_advanced_order_completed'",
  "id: 'life_linkage'",
  'const buildLifeLinkageActivityPool',
  "createWeeklyActivityTask('life_linkage', 'family_wish_1'",
  "createWeeklyActivityTask('life_linkage', 'processed_order_1'",
  "createWeeklyActivityTask('life_linkage', 'quarry_weekly_1'",
  "createWeeklyActivityTask('life_linkage', 'museum_set_1'",
  "createWeeklyActivityTask('life_linkage', 'species_note_1'",
  "createWeeklyActivityTask('life_linkage', 'npc_advanced_order_1'",
  "case 'life_linkage':"
]) {
  const source = token.startsWith('export type') || token.startsWith("'")
    ? goalTypeSource
    : token === "case 'life_linkage':"
      ? goalsSource
      : goalsSource
  assert(source.includes(token), `Life-linkage weekly activity wiring must include ${token}.`)
}

for (const token of [
  'processedOrderSubmissionCount',
  'npcFunctionAdvancedOrderCompletionCount',
  'isProcessedOrder(quest)',
  'shouldCountNpcFunctionAdvancedOrder(quest, serviceContractEffect)',
  "recordWeeklyActivityCounter('processed_order_submitted'",
  "recordWeeklyActivityCounter('npc_function_advanced_order_completed'",
  "recordWeeklyActivityCounter('life_linkage_actions'",
  'processedOrderSubmissionCountSnapshot',
  'npcFunctionAdvancedOrderCompletionCountSnapshot',
  'processedOrderSubmissionCount: processedOrderSubmissionCount.value',
  'npcFunctionAdvancedOrderCompletionCount: npcFunctionAdvancedOrderCompletionCount.value',
  'normalizeNonNegativeInteger((data as Record<string, unknown>).processedOrderSubmissionCount)',
  'normalizeNonNegativeInteger((data as Record<string, unknown>).npcFunctionAdvancedOrderCompletionCount)'
]) {
  assert(questStoreSource.includes(token), `Quest store must include ${token}.`)
}

assert(
  questStoreSource.includes("getItemById(itemId)?.category === 'processed'") &&
    questStoreSource.includes('quest.processedItemGroupId') &&
    questStoreSource.includes('quest.comboRequirements?.some') &&
    questStoreSource.includes('quest.stageDefinitions ?? []'),
  'Processed order counting must inspect real processed category, processed groups, combo requirements, and staged orders.'
)
assert(
  questStoreSource.includes("npcStore.isNpcFunctionEffectUnlocked('errand_bonus')") &&
    questStoreSource.includes("npcStore.isNpcFunctionEffectUnlocked('rare_commission')") &&
    questStoreSource.includes('serviceContractEffect.moneyRewardMultiplier > 1'),
  'NPC advanced order counting must be tied to actual NPC function or service-contract effects.'
)

assert(
  npcStoreSource.includes("useGoalStore().recordWeeklyActivityCounter('life_linkage_actions', 1)") &&
    npcStoreSource.includes('completeFamilyWish'),
  'Family wish completion must advance the life-linkage action counter.'
)
assert(
  museumStoreSource.includes("goalStore.recordWeeklyActivityCounter('life_linkage_actions', 1)") &&
    museumStoreSource.includes('if (completed)') &&
    museumStoreSource.includes('refreshOperationalTelemetry()'),
  'Museum exhibit set completion must advance the life-linkage action counter after completion.'
)
assert(
  quarryStoreSource.includes("useGoalStore().recordWeeklyActivityCounter('life_linkage_actions', 1)") &&
    quarryStoreSource.includes("claimPotentialSourceReward('quarry_stewardship'"),
  'Quarry weekly stewardship claim must advance the life-linkage action counter after a real claim.'
)

assert(
  guildViewSource.includes('data-testid="guild-life-linkage-goal-handoff"') &&
    guildViewSource.includes('lifeLinkageGoalHandoff') &&
    guildViewSource.includes('useGoalStore') &&
    guildViewSource.includes("activity?.state.themeId === 'life_linkage'") &&
    guildViewSource.includes("'long_family_wish_1'") &&
    guildViewSource.includes("'long_npc_advanced_order_1'"),
  'GuildView must expose the life-linkage goal and weekly-activity handoff.'
)

const lifeGoalBlockStart = goalsSource.indexOf("id: 'long_family_wish_1'")
const lifeGoalBlockEnd = goalsSource.indexOf("id: 'long_sink_mid_service'")
const lifeGoalBlock = goalsSource.slice(lifeGoalBlockStart, lifeGoalBlockEnd)
const moneyRewards = [...lifeGoalBlock.matchAll(/money: (\d+)/g)].map(match => Number(match[1]))
const ticketRewards = [...lifeGoalBlock.matchAll(/ticketRewards: \{ [^:]+: (\d+) \}/g)].map(match => Number(match[1]))
assert(moneyRewards.length >= 5 && moneyRewards.every(amount => amount <= 2200), 'Life-linkage long-goal money rewards must stay modest.')
assert(ticketRewards.every(amount => amount <= 1), 'Life-linkage long-goal ticket rewards must not duplicate order rewards at high volume.')

assert(
  packageJson.scripts?.['qa:goal-guild-life-linkage'] === 'node scripts/qa-goal-guild-life-linkage.mjs',
  'package.json must register qa:goal-guild-life-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-goal-guild-life-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-goal-guild-life-linkage passed')
