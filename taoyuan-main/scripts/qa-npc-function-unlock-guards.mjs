/* global console */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const assertIncludes = (source, needle, message) => {
  assert(source.includes(needle), message)
}

const packageJson = JSON.parse(read('package.json'))
const npcFunctionsSource = read('src', 'data', 'npcFunctions.ts')
const npcTypeSource = read('src', 'types', 'npc.ts')
const npcStoreSource = read('src', 'stores', 'useNpcStore.ts')
const npcViewSource = read('src', 'views', 'game', 'NpcView.vue')
const npcSource = read('src', 'data', 'npcs.ts')
const itemsSource = read('src', 'data', 'items.ts')
const cropsSource = read('src', 'data', 'crops.ts')
const processingSource = read('src', 'data', 'processing.ts')

assert(
  packageJson.scripts?.['qa:npc-function-unlock-guards'] === 'node scripts/qa-npc-function-unlock-guards.mjs',
  'package.json should register qa:npc-function-unlock-guards.'
)

// ===== npcFunctions.ts checks =====
assertIncludes(npcFunctionsSource, 'export interface NpcFunctionUnlockDef', 'NpcFunctionUnlockDef type should exist.')
assertIncludes(npcFunctionsSource, 'export type NpcFunctionUnlockTier', 'NpcFunctionUnlockTier type should exist.')
assertIncludes(npcFunctionsSource, 'export interface NpcFunctionUnlockStatus', 'NpcFunctionUnlockStatus type should exist.')
assertIncludes(npcFunctionsSource, 'export const NPC_FUNCTION_UNLOCKS', 'NPC_FUNCTION_UNLOCKS data should exist.')
assertIncludes(npcFunctionsSource, 'export const NPC_FUNCTION_TIER_ORDER', 'NPC_FUNCTION_TIER_ORDER should exist.')
assertIncludes(npcFunctionsSource, 'export const getNpcFunctionUnlockDefs', 'getNpcFunctionUnlockDefs should be exported.')
assertIncludes(npcFunctionsSource, 'export const getNpcFunctionById', 'getNpcFunctionById should be exported.')
assertIncludes(npcFunctionsSource, 'legacyUnlocked?: boolean', 'NpcFunctionUnlockDef should have legacyUnlocked field.')

// Extract npcIds and validate against NPCS
const npcIdMatches = [...npcFunctionsSource.matchAll(/npcId:\s*'([^']+)'/g)]
const npcIds = npcIdMatches.map(m => m[1])
const uniqueNpcIds = [...new Set(npcIds)]
for (const id of uniqueNpcIds) {
  assert(npcSource.includes(`id: '${id}'`), `npcId "${id}" should exist in NPCS.`)
}

// Extract itemIds and validate against runtime item sources
const itemIdMatches = [...npcFunctionsSource.matchAll(/itemId:\s*'([^']+)'/g)]
const itemIds = itemIdMatches.map(m => m[1])
const uniqueItemIds = [...new Set(itemIds)]
for (const id of uniqueItemIds) {
  assert(
    itemsSource.includes(`id: '${id}'`) || cropsSource.includes(`id: '${id}'`) || processingSource.includes(`id: '${id}'`),
    `itemId "${id}" should exist in items.ts, crops.ts, or processing.ts.`
  )
}

// Validate tier ordering per NPC: no T3 without T2, no T4 without T3
const tierByNpc = new Map()
for (const m of npcFunctionsSource.matchAll(/npcId:\s*'([^']+)'[\s\S]*?tier:\s*'([^']+)'/g)) {
  const npc = m[1]
  const tier = m[2]
  if (!tierByNpc.has(npc)) tierByNpc.set(npc, [])
  tierByNpc.get(npc).push(tier)
}
for (const [npc, tiers] of tierByNpc) {
  if (tiers.includes('T3')) {
    assert(tiers.includes('T2'), `${npc} has T3 but missing T2.`)
  }
  if (tiers.includes('T4')) {
    assert(tiers.includes('T3'), `${npc} has T4 but missing T3.`)
  }
}

// Check effectType is non-empty
const effectTypeMatches = [...npcFunctionsSource.matchAll(/effectType:\s*'([^']*)'/g)]
for (const m of effectTypeMatches) {
  assert(m[1] && m[1].length > 0, 'Found empty effectType.')
}

// Check unique function IDs
const fnIdMatches = [...npcFunctionsSource.matchAll(/id:\s*'([^']+)'/g)]
const fnIdList = fnIdMatches.map(m => m[1]).filter(id => id.includes('_T'))
const uniqueFnIds = new Set(fnIdList)
assert(uniqueFnIds.size === fnIdList.length, `Duplicate function IDs found: ${fnIdList.length} total, ${uniqueFnIds.size} unique.`)

// ===== NpcState type checks =====
assertIncludes(npcTypeSource, 'unlockedFunctionIds?: string[]', 'NpcState should have unlockedFunctionIds field.')

// ===== useNpcStore checks =====
assertIncludes(npcStoreSource, "unlockedFunctionIds: [],", 'buildDefaultNpcState should initialize unlockedFunctionIds.')
assertIncludes(npcStoreSource, 'unlockedFunctionIds: Array.isArray(s.unlockedFunctionIds)', 'deserialize should normalize unlockedFunctionIds.')
assertIncludes(npcStoreSource, 'const getNpcFunctionUnlocks =', 'Store should export getNpcFunctionUnlocks.')
assertIncludes(npcStoreSource, 'const isNpcFunctionUnlocked =', 'Store should export isNpcFunctionUnlocked.')
assertIncludes(npcStoreSource, 'const getNpcFunctionUnlockStatus =', 'Store should export getNpcFunctionUnlockStatus.')
assertIncludes(npcStoreSource, 'const canUnlockNpcFunction =', 'Store should export canUnlockNpcFunction.')
assertIncludes(npcStoreSource, 'const unlockNpcFunction =', 'Store should export unlockNpcFunction.')
assertIncludes(npcStoreSource, "spendMoney(def.costMoney, 'npc_function_unlock')", 'unlockNpcFunction should charge money.')
assertIncludes(npcStoreSource, 'removeItemsWithRollback(def.materialCost)', 'unlockNpcFunction should remove materials.')
assertIncludes(npcStoreSource, "state.unlockedFunctionIds = [...", 'unlockNpcFunction should push to unlockedFunctionIds.')

// ===== NpcView.vue checks =====
assertIncludes(npcViewSource, 'data-testid="npc-function-unlocks-panel"', 'NpcView should render function unlocks panel.')
assertIncludes(npcViewSource, ':data-testid="`npc-function-unlock-card-${', 'Function unlock cards should have stable test ids.')
assertIncludes(npcViewSource, ':data-testid="`npc-function-unlock-${', 'Function unlock buttons should have stable test ids.')
assertIncludes(npcViewSource, 'selectedNpcFunctionUnlockStatuses', 'NpcView should compute function unlock statuses.')
assertIncludes(npcViewSource, 'handleUnlockNpcFunction', 'NpcView should have unlock handler.')
assertIncludes(npcViewSource, 'isNpcActiveServiceVisible', 'NpcView should gate active services with visibility helper.')
assertIncludes(npcViewSource, 'random-npc-growth-unlock-hint', 'NpcView should show random NPC growth unlock hint.')

console.log('qa-npc-function-unlock-guards passed')
