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
const npcFunctionEffectsSource = read('src', 'data', 'npcFunctionEffects.ts')
const miningStoreSource = read('src', 'stores', 'useMiningStore.ts')
const processingStoreSource = read('src', 'stores', 'useProcessingStore.ts')
const inventoryStoreSource = read('src', 'stores', 'useInventoryStore.ts')
const processingDataSource = read('src', 'data', 'processing.ts')
const processingViewSource = read('src', 'views', 'game', 'ProcessingView.vue')

assert(
  packageJson.scripts?.['qa:npc-mining-forge-effects'] === 'node scripts/qa-npc-mining-forge-effects.mjs',
  'package.json should register qa:npc-mining-forge-effects.'
)

for (const effectType of [
  'mine_extra_node',
  'mine_floor_hint',
  'zhiji_mine_boost',
  'forge_success_boost',
  'premium_forge',
  'free_tool_repair',
  'forge_speed',
  'tool_upgrade_speed',
  'tool_bonus_slot'
]) {
  assertIncludes(npcFunctionEffectsSource, effectType, `${effectType} should be classified in the NPC function effect registry.`)
}

assertIncludes(
  miningStoreSource,
  "const npcMineExtraNodes = computed(() => npcStore.getNpcFunctionEffectValue('mine_extra_node'))",
  'mine_extra_node should be read from NPC effects in the mining store.'
)
assertIncludes(
  miningStoreSource,
  "const npcMineDropBonus = computed(() => npcStore.getNpcFunctionEffectValue('zhiji_mine_boost') / 100)",
  'zhiji_mine_boost should be read from NPC effects in the mining store.'
)
assertIncludes(
  miningStoreSource,
  "const npcFloorHintUnlocked = computed(() => npcStore.isNpcFunctionEffectUnlocked('mine_floor_hint'))",
  'mine_floor_hint should be exposed as a mining-store unlock.'
)
assertIncludes(
  miningStoreSource,
  'getNpcMineFloorHint',
  'mine_floor_hint should produce a real floor hint message.'
)
assertIncludes(
  miningStoreSource,
  '阿石层位提示',
  'NPC mine floor hints should identify their NPC function source in UI/log copy.'
)

assertIncludes(
  processingStoreSource,
  "if (mt === 'furnace') return npcStore.getNpcFunctionEffectValue('forge_success_boost') / 100",
  'forge_success_boost should affect real furnace quality upgrade chance.'
)
assertIncludes(
  processingDataSource,
  "npcFunctionEffectType: 'premium_forge'",
  'premium_forge should gate a real processing machine or recipe.'
)
assertIncludes(
  processingStoreSource,
  "const fsd = npcStore.getNpcFunctionEffectValue('forge_speed')",
  'forge_speed should reduce real furnace processing days.'
)
assertIncludes(
  processingStoreSource,
  "const tsd = npcStore.getNpcFunctionEffectValue('tool_upgrade_speed')",
  'tool_upgrade_speed should reduce repair-bench processing days.'
)
assertIncludes(
  inventoryStoreSource,
  "useNpcStore().getNpcFunctionEffectValue('tool_upgrade_speed')",
  'tool_upgrade_speed should also reduce inventory tool-upgrade waiting days.'
)
assertIncludes(
  inventoryStoreSource,
  "useNpcStore().isNpcFunctionEffectUnlocked('tool_bonus_slot')",
  'tool_bonus_slot should affect real tool upgrade affix rolls.'
)
assertIncludes(
  inventoryStoreSource,
  "rollForgeAffixes({ target: 'pickaxe', workshopLevel: 7 }).slice(0, 1)",
  'tool_bonus_slot should grant a bounded bonus affix slot instead of unlimited rolls.'
)

assertIncludes(
  processingStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('free_tool_repair')",
  'free_tool_repair should be read from NPC function effects.'
)
assertIncludes(
  processingStoreSource,
  'const getFreeToolRepairLedgerId = (weekId = getRepairBenchWeekId()) => `npc_free_tool_repair:${weekId}`',
  'free_tool_repair should use a weekly ledger key.'
)
assertIncludes(
  processingStoreSource,
  "playerStore.hasLifestyleDiscovery('lifestyleUnlocks', getFreeToolRepairLedgerId())",
  'free_tool_repair should block repeat weekly use through the lifestyle ledger.'
)
assertIncludes(
  processingStoreSource,
  'const getRepairBenchCostPreview = (',
  'repair bench should expose a shared cost preview for UI and settlement.'
)
assertIncludes(
  processingStoreSource,
  '): RepairBenchCostPreview =>',
  'repair bench cost preview should return the shared RepairBenchCostPreview type.'
)
assertIncludes(
  processingStoreSource,
  'materialQuantity: 0',
  'free_tool_repair should zero material cost in the shared repair preview.'
)
assertIncludes(
  processingStoreSource,
  'money: 0',
  'free_tool_repair should zero money cost in the shared repair preview.'
)
assertIncludes(
  processingStoreSource,
  'playerStore.markLifestyleUnlock(cost.ledgerId, getAlchemyDayTag())',
  'free_tool_repair should mark the weekly ledger only after repair start succeeds.'
)
assertIncludes(
  processingStoreSource,
  'if (materialCost.length > 0 && !removeCombinedItems(materialCost))',
  'repair start should avoid consuming materials on the free repair path while keeping rollback for paid repairs.'
)
assertIncludes(
  processingViewSource,
  'processingStore.getRepairBenchCostPreview(type, defId, durability, sturdiness, mode)',
  'ProcessingView should display the same repair cost preview that settlement uses.'
)
assertIncludes(
  processingViewSource,
  'option.freeByNpc',
  'ProcessingView should expose free_tool_repair state in the repair bench UI.'
)
assertIncludes(
  processingViewSource,
  '阿铁本周免费',
  'Repair bench UI should tell the player when free_tool_repair is paying the cost.'
)

console.log('qa:npc-mining-forge-effects passed')
