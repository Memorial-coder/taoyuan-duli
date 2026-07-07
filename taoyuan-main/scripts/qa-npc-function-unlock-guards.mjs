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
const npcFunctionEffectsSource = read('src', 'data', 'npcFunctionEffects.ts')
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

const uniqueEffectTypes = [...new Set(effectTypeMatches.map(m => m[1]))]

// Check unique function IDs
const fnIdMatches = [...npcFunctionsSource.matchAll(/id:\s*'([^']+)'/g)]
const fnIdList = fnIdMatches.map(m => m[1]).filter(id => id.includes('_T'))
const uniqueFnIds = new Set(fnIdList)
assert(uniqueFnIds.size === fnIdList.length, `Duplicate function IDs found: ${fnIdList.length} total, ${uniqueFnIds.size} unique.`)

// ===== npcFunctionEffects.ts checks =====
assertIncludes(npcFunctionEffectsSource, 'export type NpcFunctionEffectAggregation', 'NPC function effect aggregation type should exist.')
assertIncludes(npcFunctionEffectsSource, 'export interface NpcFunctionEffectDef', 'NPC function effect registry def should exist.')
assertIncludes(npcFunctionEffectsSource, 'export interface NpcFunctionEffectContext', 'NPC function effect context should exist.')
assertIncludes(npcFunctionEffectsSource, 'export interface NpcFunctionEffectSummary', 'NPC function effect summary should exist.')
assertIncludes(npcFunctionEffectsSource, 'export const NPC_FUNCTION_EFFECTS', 'NPC function effect registry should be exported.')
assertIncludes(npcFunctionEffectsSource, 'NPC_FUNCTION_UNLOCKS.map(def => def.effectType)', 'Effect registry should derive coverage from NPC_FUNCTION_UNLOCKS.')
assertIncludes(npcFunctionEffectsSource, 'export const getRegisteredNpcFunctionEffectTypes', 'Effect registry should expose registered effect types.')
assertIncludes(npcFunctionEffectsSource, 'export const getNpcFunctionEffectDef', 'Effect registry should expose single effect lookup.')
assertIncludes(npcFunctionEffectsSource, 'export const getNpcFunctionEffectSources', 'Effect registry should expose source lookup.')
assertIncludes(npcFunctionEffectsSource, 'export const isNpcFunctionEffectActive', 'Effect registry should expose active checks.')
assertIncludes(npcFunctionEffectsSource, 'export const getNpcFunctionEffectValue', 'Effect registry should expose value aggregation.')
assertIncludes(npcFunctionEffectsSource, 'export const getNpcFunctionEffectSummaries', 'Effect registry should expose summaries.')
assertIncludes(npcFunctionEffectsSource, 'export const getUnlockedNpcFunctionEffectSummary', 'Effect registry should expose unlocked ID summaries.')

for (const effectType of uniqueEffectTypes) {
  assert(
    npcFunctionEffectsSource.includes(effectType),
    `npcFunctionEffects.ts should classify or label effectType "${effectType}".`
  )
}

for (const effectType of [
  'shop_discount_bonus',
  'rare_commission',
  'bulk_buy',
  'rare_shop_stock',
  'breeding_boost',
  'spouse_animal_boost',
  'mine_extra_node',
  'forge_success_boost',
  'fish_odds_display',
  'daily_stamina_regen',
  'cook_success_boost',
  'wine_cellar',
  'festival_music',
  'weekly_surprise'
]) {
  assert(
    npcFunctionEffectsSource.includes(effectType),
    `NPC function effect registry should keep explicit metadata for ${effectType}.`
  )
}

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
assertIncludes(npcStoreSource, "from '@/composables/useCombinedInventory'", 'NPC function unlocks should use combined inventory helpers.')
assertIncludes(npcStoreSource, 'getCombinedItemCount(material.itemId)', 'NPC function material status should count backpack, temp inventory, and warehouse/void chests.')
assertIncludes(npcStoreSource, 'removeCombinedItems(def.materialCost)', 'unlockNpcFunction should remove materials from combined inventory.')
assertIncludes(npcStoreSource, "state.unlockedFunctionIds = [...", 'unlockNpcFunction should push to unlockedFunctionIds.')
assertIncludes(npcStoreSource, "from '@/data/npcFunctionEffects'", 'Store should read NPC effect helpers from the centralized registry.')
assertIncludes(npcStoreSource, 'const getUnlockedNpcFunctionDefs = (): NpcFunctionUnlockDef[]', 'Store should collect unlocked function defs before resolving effects.')
assertIncludes(npcStoreSource, 'resolveNpcFunctionEffectValue(effectType, { unlockedFunctionDefs: getUnlockedNpcFunctionDefs() })', 'Store effect values should use centralized value aggregation.')
assertIncludes(npcStoreSource, 'resolveNpcFunctionEffectActive(effectType, { unlockedFunctionDefs: getUnlockedNpcFunctionDefs() })', 'Store effect active checks should use centralized active checks.')
assertIncludes(npcStoreSource, 'const getUnlockedNpcFunctionEffectSummaries = (): NpcFunctionEffectSummary[]', 'Store should expose unlocked effect summaries.')
assertIncludes(npcStoreSource, 'resolveNpcFunctionEffectSummaries({ unlockedFunctionDefs: getUnlockedNpcFunctionDefs() })', 'Store effect summaries should use centralized summaries.')
assert(
  !/npcStates\.value\.reduce\(\(sum,\s*state\)[\s\S]*?effectPayload\?\.value/.test(npcStoreSource),
  'Store should not hand-roll NPC function effect value aggregation.'
)
assert(
  !/npcStates\.value\.some\([\s\S]*?def\.effectType === effectType[\s\S]*?isNpcFunctionUnlocked\(def\.id\)/.test(npcStoreSource),
  'Store should not hand-roll NPC function effect active checks.'
)

// ===== NpcView.vue checks =====
assertIncludes(npcViewSource, 'data-testid="npc-function-unlocks-panel"', 'NpcView should render function unlocks panel.')
assertIncludes(npcViewSource, ':data-testid="`npc-function-unlock-card-${', 'Function unlock cards should have stable test ids.')
assertIncludes(npcViewSource, ':data-testid="`npc-function-unlock-${', 'Function unlock buttons should have stable test ids.')
assertIncludes(npcViewSource, 'selectedNpcFunctionUnlockStatuses', 'NpcView should compute function unlock statuses.')
assertIncludes(npcViewSource, 'handleUnlockNpcFunction', 'NpcView should have unlock handler.')
assertIncludes(npcViewSource, 'getCombinedItemCount(mat.itemId)', 'NpcView material rows should show combined inventory counts.')
assertIncludes(npcViewSource, 'isNpcActiveServiceVisible', 'NpcView should gate active services with visibility helper.')
assertIncludes(npcViewSource, 'random-npc-growth-unlock-hint', 'NpcView should show random NPC growth unlock hint.')

console.log('qa-npc-function-unlock-guards passed')
