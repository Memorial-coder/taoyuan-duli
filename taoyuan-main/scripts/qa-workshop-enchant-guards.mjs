/* global console, process */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [
  packageSource,
  processingDataSource,
  processingTypesSource,
  processingStoreSource,
  processingViewSource,
  toolUpgradeViewSource,
  forgeAffixesSource,
  inventoryStoreSource,
  miningStoreSource,
  farmActionsSource,
  combatRuntimeSource,
  changelogSource
] = await Promise.all([
  readSource('package.json'),
  readSource('src/data/processing.ts'),
  readSource('src/types/processing.ts'),
  readSource('src/stores/useProcessingStore.ts'),
  readSource('src/views/game/ProcessingView.vue'),
  readSource('src/views/game/ToolUpgradeView.vue'),
  readSource('src/data/forgeAffixes.ts'),
  readSource('src/stores/useInventoryStore.ts'),
  readSource('src/stores/useMiningStore.ts'),
  readSource('src/composables/useFarmActions.ts'),
  readSource('src/utils/combatRuntime.ts'),
  readSource('CHANGELOG.md')
])

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const packageJson = JSON.parse(packageSource)
assert(packageJson.scripts?.['qa:workshop-enchant-guards'] === 'node scripts/qa-workshop-enchant-guards.mjs', 'package script should expose qa:workshop-enchant-guards')

for (const marker of [
  "| 'enchanting_forge'",
  'workshopLevelRequired?: number'
]) {
  assert(processingTypesSource.includes(marker), `processing types should expose ${marker}.`)
}

for (const marker of [
  "id: 'enchanting_forge'",
  "name: '铸魔炉'",
  'workshopLevelRequired: 7',
  'craftMoney: 180000',
  "{ itemId: 'bronze_bar', quantity: 8 }",
  "{ itemId: 'mythril_bar', quantity: 4 }",
  "{ itemId: 'shadow_ore', quantity: 8 }",
  "{ itemId: 'void_ore', quantity: 4 }",
  "{ itemId: 'prismatic_shard', quantity: 1 }",
  "{ itemId: 'dragon_jade', quantity: 1 }"
]) {
  assert(processingDataSource.includes(marker), `processing data should define enchanting forge marker ${marker}.`)
}
assert(processingDataSource.includes("id: 'spirit_forge'"), 'spirit_forge should remain a separate 仙灵炉 machine.')

for (const marker of [
  'workshopLevelRequired',
  'isMachineCraftUnlocked',
  'getMachineCraftLockedReason',
  '需要工坊 Lv.'
]) {
  assert(processingStoreSource.includes(marker), `processing store should enforce workshop machine level marker ${marker}.`)
}

for (const marker of [
  "id: 'random'",
  "label: '随机铸魔'",
  'cost: 30000',
  "{ itemId: 'bronze_bar', quantity: 1 }",
  "{ itemId: 'shadow_ore', quantity: 3 }",
  "id: 'directed'",
  "label: '定向附魔'",
  'cost: 80000',
  "{ itemId: 'mythril_bar', quantity: 1 }",
  "{ itemId: 'shadow_ore', quantity: 6 }",
  "id: 'protected'",
  "label: '保留重铸'",
  'cost: 150000',
  "{ itemId: 'mythril_bar', quantity: 2 }",
  "{ itemId: 'void_ore', quantity: 6 }",
  "{ itemId: 'dragon_jade', quantity: 1 }"
]) {
  assert(forgeAffixesSource.includes(marker), `forge affix data should define mode/cost marker ${marker}.`)
}

for (const marker of [
  'lv7: [{ count: 1, weight: 1 }]',
  '{ count: 1, weight: 0.7 }',
  '{ count: 2, weight: 0.3 }',
  '{ count: 1, weight: 0.5 }',
  '{ count: 2, weight: 0.38 }',
  '{ count: 3, weight: 0.12 }'
]) {
  assert(forgeAffixesSource.includes(marker), `forge affix count probabilities should include ${marker}.`)
}

for (const directionId of [
  'weapon_output',
  'weapon_survival',
  'weapon_efficiency',
  'weapon_slayer',
  'pickaxe_efficiency',
  'pickaxe_yield',
  'ring_profit',
  'ring_combat',
  'ring_treasure',
  'hat_defense',
  'hat_farming',
  'hat_experience',
  'shoe_movement',
  'shoe_stamina',
  'shoe_mining'
]) {
  assert(forgeAffixesSource.includes(directionId), `forge direction pool should include ${directionId}.`)
}

for (const affixId of [
  'sharp',
  'fierce',
  'precise',
  'vampiric',
  'sturdy',
  'lucky',
  'swift',
  'armor_breaker',
  'spirit_slayer',
  'bug_slayer',
  'exorcist',
  'echo_strike',
  'haymaker',
  'stone_chips',
  'efficient',
  'swift_pick',
  'generous_pick',
  'ore_smelter',
  'treasure_sense',
  'ring_battle',
  'ring_vampiric',
  'ring_luck',
  'hat_resolve',
  'hat_growth',
  'hat_scholar',
  'shoe_fleet',
  'shoe_breath',
  'shoe_cavern_grip'
]) {
  assert(forgeAffixesSource.includes(affixId), `forge affix pool should include ${affixId}.`)
}

for (const marker of [
  'rollForgeAffixes',
  'preserveId',
  'rollSingleForgeAffix(preserveId',
  'picked.add(preserveId)',
  'const picked = new Set<string>()',
  'preferredCandidates.length > 0',
  'allTargetAffixIds.filter(id => !picked.has(id))',
  'getForgeAffixQuality',
  "if (percentile >= 0.95) return 'supreme'",
  "if (percentile >= 0.8) return 'excellent'",
  "if (percentile >= 0.5) return 'fine'"
]) {
  assert(forgeAffixesSource.includes(marker), `forge roller should enforce ${marker}.`)
}

for (const marker of [
  'smithy-forge-section',
  'smithy-forge-confirm',
  'smithy-forge-target-${option.id}',
  'smithy-forge-mode-${mode.id}',
  'smithy-forge-direction-${direction.id}',
  'smithy-forge-preserve-${option.id}',
  'smithy-forge-unlock-${option.key}',
  'selectedForgeTarget',
  'selectedForgeMode',
  'selectedForgeDirectionId',
  'selectedForgePreserveId',
  'handleUnlockForgeTarget',
  'inventoryStore.toggleEquipmentLock',
  'setForgeAffixes',
  'inventoryStore.setWeaponAffixes',
  "inventoryStore.setToolAffixes('pickaxe'",
  'inventoryStore.setRingAffixes',
  'inventoryStore.setHatAffixes',
  'inventoryStore.setShoeAffixes',
  'inventoryStore.deserialize(inventorySnapshot)',
  'warehouseStore.deserialize(warehouseSnapshot)'
]) {
  assert(toolUpgradeViewSource.includes(marker), `tool upgrade view should expose smithy forge marker ${marker}.`)
}

for (const marker of [
  'getEnchantingForgeServiceLockedReason',
  'canUseEnchantingForgeService',
  'filter(m => !isSmithyServiceMachine(m.id))',
  "SMITHY_SERVICE_MACHINE_TYPES: MachineType[] = ['enchanting_forge', 'repair_bench']",
  '不占工坊机器格',
  '镐子正在升级',
  '这件装备已锁定',
  '这件武器已锁定'
]) {
  const source = marker.includes('filter(') || marker.includes('SMITHY_SERVICE')
    ? processingViewSource
    : marker === 'getEnchantingForgeServiceLockedReason' || marker === 'canUseEnchantingForgeService'
      ? processingStoreSource
      : toolUpgradeViewSource
  assert(source.includes(marker), `smithy forge migration should include marker ${marker}.`)
}

for (const oldMarker of [
  'processing-weapon-enchant-panel',
  'processing-tool-enchant-panel',
  'processing-equipment-enchant-panel',
  'selectedDirectedEnchantId',
  'processing-equipment-enchant-option-${option.id}',
  'rollEnchantmentFromPool',
  'PICKAXE_ENCHANTMENT_IDS',
  'EQUIPMENT_ENCHANTMENT_IDS_BY_SLOT'
]) {
  assert(!processingViewSource.includes(oldMarker), `processing view should remove old direct enchant marker ${oldMarker}.`)
}

for (const marker of [
  'setWeaponAffixes',
  'setToolAffixes',
  'setRingAffixes',
  'setHatAffixes',
  'setShoeAffixes',
  'migrateLegacyEnchantmentToAffixes',
  'sanitizeForgeAffixes',
  'getForgeAffixSignature'
]) {
  assert(inventoryStoreSource.includes(marker), `inventory store should support forge affixes marker ${marker}.`)
}

for (const marker of [
  "getWeaponAffixEffectValue('weapon_haymaker_chance')",
  'getToolAffixEffectValue',
  'weaponDefenseIgnore',
  'weaponExtraStrikeChance',
  'weaponLifesteal',
  'weaponDamageReduction'
]) {
  const source = marker.includes('haymaker')
    ? farmActionsSource
    : marker === 'getToolAffixEffectValue'
      ? miningStoreSource
      : combatRuntimeSource + miningStoreSource
  assert(source.includes(marker), `runtime should read rolled affix value marker ${marker}.`)
}

for (const phrase of [
  '铸魔炉',
  '随机 affix',
  '随机词条',
  '定向附魔',
  '保留重铸',
  '锋利',
  '鞋子',
  '轻身'
]) {
  assert(changelogSource.includes(phrase), `changelog should mention ${phrase}.`)
}

if (errors.length > 0) {
  console.error('qa-workshop-enchant-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-workshop-enchant-guards: ok')
