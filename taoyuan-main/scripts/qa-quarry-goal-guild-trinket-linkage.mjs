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
const quarryStoreSource = readSource('src/stores/useQuarryStore.ts')
const trinketSource = readSource('src/data/trinkets.ts')
const inventoryStoreSource = readSource('src/stores/useInventoryStore.ts')
const guildViewSource = readSource('src/views/game/GuildView.vue')
const packageJson = JSON.parse(readSource('package.json'))

for (const metric of ['quarryLifetimeClears', 'quarryDeepClears', 'quarryWeeklyClaims']) {
  assert(goalTypeSource.includes(`| '${metric}'`), `GoalMetricKey must include ${metric}.`)
  assert(goalsSource.includes(`${metric}:`), `goals.ts must label/bias ${metric}.`)
  assert(goalStoreSource.includes(`case '${metric}'`), `useGoalStore must read ${metric}.`)
  assert(goalStoreSource.includes(`${metric}: getMetricValue('${metric}')`), `goal snapshot must include ${metric}.`)
}

for (const goalId of ['long_quarry_clear_1', 'long_quarry_deep_1', 'long_quarry_weekly_1']) {
  assert(goalsSource.includes(`id: '${goalId}'`), `Long-term quarry goal ${goalId} must be defined.`)
  assert(goalsSource.includes(`${goalId}: { shortTitle:`), `Long-term quarry goal ${goalId} must have UI metadata.`)
}

assert(
  quarryStoreSource.includes('weeklyStewardshipLifetimeClaimCount') &&
    quarryStoreSource.includes('Math.floor(lifetimeClearedCount.value / QUARRY_WEEKLY_STEWARDSHIP_TARGET)'),
  'Quarry store must expose a lifetime weekly-stewardship claim metric for long-term goals.'
)
assert(
  goalStoreSource.includes('return quarryStore.lifetimeClearedCount') &&
    goalStoreSource.includes('return quarryStore.deepClearCount') &&
    goalStoreSource.includes('return quarryStore.weeklyStewardshipLifetimeClaimCount'),
  'Goal store must source quarry metrics from the real quarry store state.'
)

assert(
  trinketSource.includes("id: 'quarry_relic_charm'") &&
    trinketSource.includes("unlockRule: 'quarry_mine'") &&
    trinketSource.includes("type: 'treasure_find'") &&
    trinketSource.includes("type: 'ore_bonus'"),
  'Trinket data must define quarry_relic_charm with quarry_mine unlock and resource-discovery effects.'
)
assert(
  inventoryStoreSource.includes("case 'quarry_mine'") &&
    inventoryStoreSource.includes("playerStore.hasLifestyleDiscovery('lifestyleUnlocks', 'trinket_quarry_mine')"),
  'Inventory trinket unlock logic must keep quarry_mine unlocks equip-ready after quarry mine final reward.'
)

assert(
  guildViewSource.includes('data-testid="guild-quarry-linkage"') &&
    guildViewSource.includes('quarryGuildHandoff') &&
    guildViewSource.includes('useQuarryStore') &&
    guildViewSource.includes('weeklyStewardshipProgress') &&
    guildViewSource.includes('quarryMineStatus.canEnter'),
  'GuildView must surface quarry handoff status from the real quarry store.'
)
assert(
  packageJson.scripts?.['qa:quarry-goal-guild-trinket-linkage'] === 'node scripts/qa-quarry-goal-guild-trinket-linkage.mjs',
  'package.json must register qa:quarry-goal-guild-trinket-linkage.'
)

if (errors.length > 0) {
  console.error(`qa-quarry-goal-guild-trinket-linkage failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-quarry-goal-guild-trinket-linkage passed')
