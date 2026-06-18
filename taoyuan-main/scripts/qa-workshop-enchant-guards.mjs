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
  processingStoreSource,
  processingViewSource,
  inventoryStoreSource,
  miningStoreSource,
  farmActionsSource,
  weaponsSource,
  toolEnchantmentsSource,
  equipmentEnchantmentsSource,
  itemTypesSource,
  combatRuntimeSource,
  changelogSource
] = await Promise.all([
  readSource('package.json'),
  readSource('src/stores/useProcessingStore.ts'),
  readSource('src/views/game/ProcessingView.vue'),
  readSource('src/stores/useInventoryStore.ts'),
  readSource('src/stores/useMiningStore.ts'),
  readSource('src/composables/useFarmActions.ts'),
  readSource('src/data/weapons.ts'),
  readSource('src/data/toolEnchantments.ts'),
  readSource('src/data/equipmentEnchantments.ts'),
  readSource('src/types/item.ts'),
  readSource('src/utils/combatRuntime.ts'),
  readSource('CHANGELOG.md')
])

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const packageJson = JSON.parse(packageSource)
assert(packageJson.scripts?.['qa:workshop-enchant-guards'] === 'node scripts/qa-workshop-enchant-guards.mjs', 'package script should expose qa:workshop-enchant-guards')

for (const id of ['weapon_enchant_basic', 'weapon_enchant_directed', 'weapon_enchant_protected']) {
  assert(processingStoreSource.includes(id), `workshop milestone missing ${id}`)
}
for (const phrase of ['开放随机铸魔', '开放定向附魔', '开放保留原附魔重铸']) {
  assert(processingStoreSource.includes(phrase), `workshop milestone copy missing ${phrase}`)
}
assert(processingStoreSource.includes('milestones.map'), 'workshop upgrade log should include every milestone at the upgraded level')

for (const marker of [
  'processing-weapon-enchant-panel',
  'processing-weapon-enchant-mode-${mode.id}',
  'processing-weapon-enchant-confirm',
  'processing-tool-enchant-panel',
  'processing-tool-enchant-pickaxe',
  'processing-tool-enchant-confirm',
  'processing-equipment-enchant-panel',
  'processing-equipment-enchant-confirm'
]) {
  assert(processingViewSource.includes(marker), `processing view missing ${marker}`)
}
for (const modeId of ["id: 'basic'", "id: 'directed'", "id: 'protected'"]) {
  assert(processingViewSource.includes(modeId), `processing view missing weapon enchant mode ${modeId}`)
}

for (const itemId of ['bronze_bar', 'mythril_bar', 'shadow_ore', 'void_ore', 'prismatic_shard', 'dragon_jade']) {
  assert(processingViewSource.includes(`itemId: '${itemId}'`), `enchant costs should use ${itemId}`)
}
assert(processingViewSource.includes("type WeaponEnchantMode = 'basic' | 'directed' | 'protected'"), 'weapon enchant modes should include basic/directed/protected')
assert(processingViewSource.includes('rollEnchantmentFromPool(WEAPON_ENCHANTMENT_IDS, weapon.enchantmentId)'), 'protected reroll should exclude current enchantment from the full pool')
assert(processingViewSource.includes('rollEnchantmentFromPool(BASIC_WEAPON_ENCHANTMENT_IDS, weapon.enchantmentId)'), 'basic reroll should use the basic enchantment pool')
assert(processingViewSource.includes("inventoryStore.setWeaponEnchantment(index, resultEnchantId)"), 'weapon enchant should be written through inventory store')
assert(processingViewSource.includes("inventoryStore.setToolEnchantment('pickaxe', selectedToolEnchantId.value)"), 'tool enchant should be written through inventory store')
assert(processingViewSource.includes('PICKAXE_ENCHANTMENT_IDS'), 'tool enchant UI should render the pickaxe enchantment pool')
assert(processingViewSource.includes('processing-tool-enchant-option-${option.id}'), 'tool enchant UI should expose per-enchantment test ids')
assert(processingViewSource.includes('TOOL_ENCHANT_COST = 20000'), 'stone chips should have a money cost')
assert(processingViewSource.includes("itemId: 'stone', quantity: 80"), 'stone chips should consume stone')
assert(processingViewSource.includes('EQUIPMENT_ENCHANT_MIN_LEVEL = 10'), 'equipment enchantment should unlock at workshop Lv.10')
assert(processingViewSource.includes('EQUIPMENT_ENCHANT_COST = 50000'), 'equipment enchantment should have a money cost')
assert(processingViewSource.includes('processing-equipment-enchant-option-${option.id}'), 'equipment enchant UI should expose per-enchantment test ids')
assert(processingViewSource.includes("inventoryStore.setShoeEnchantment(index, enchantmentId)"), 'equipment enchant should write shoe enchantments through inventory store')

assert(weaponsSource.includes('WEAPON_ENCHANTMENT_IDS'), 'weapon enchantment ids should be exported')
assert(weaponsSource.includes('BASIC_WEAPON_ENCHANTMENT_IDS'), 'basic weapon enchantment pool should be exported')
assert(weaponsSource.includes('rollEnchantmentFromPool'), 'workshop enchantment roller should be exported')
for (const enchantId of ['swift', 'armor_breaker', 'spirit_slayer', 'bug_slayer', 'exorcist', 'echo_strike', 'haymaker']) {
  assert(weaponsSource.includes(enchantId), `weapon enchantment pool should include ${enchantId}`)
}
assert(combatRuntimeSource.includes('defenseIgnoreRate'), 'combat runtime should support defense ignore for armor breaker')
assert(combatRuntimeSource.includes("enchantSpecial === 'armor_breaker' ? 0.3 : 0"), 'armor breaker should ignore 30% defense')
assert(miningStoreSource.includes("getEquippedWeaponEnchantSpecial() === 'swift' ? 0.85 : 1"), 'swift weapon enchant should reduce combat time by 15%')
assert(miningStoreSource.includes("weaponSpecial === 'spirit_slayer' && isSpiritSlayerTarget(monster)"), 'spirit slayer should check eligible monsters')
assert(miningStoreSource.includes('SPIRIT_SLAYER_MONSTER_KEYWORDS'), 'spirit slayer should have an explicit target keyword list')
assert(miningStoreSource.includes("weaponSpecial === 'bug_slayer' && isBugSlayerTarget(monster)"), 'bug slayer should check eligible monsters')
assert(miningStoreSource.includes('BUG_SLAYER_MONSTER_KEYWORDS'), 'bug slayer should have an explicit target keyword list')
assert(miningStoreSource.includes("weaponSpecial === 'exorcist' && isExorcistTarget(monster) ? 0.15 : 0"), 'exorcist should add 15% crit against eligible monsters')
assert(combatRuntimeSource.includes("enchantSpecial === 'echo_strike' ? 0.18 : 0"), 'echo strike should add extra strike chance')
assert(farmActionsSource.includes("enchant?.special === 'haymaker'"), 'haymaker should trigger from farm weed clearing')

for (const marker of ['setWeaponEnchantment', 'setToolEnchantment', 'getToolEnchantmentId', 'normalizeToolEntry', 'enchantmentId']) {
  assert(inventoryStoreSource.includes(marker), `inventory store missing ${marker}`)
}
assert(itemTypesSource.includes('enchantmentId?: string | null'), 'Tool save shape should persist optional enchantmentId')

assert(toolEnchantmentsSource.includes('stone_chips'), 'tool enchantment data should include stone_chips')
assert(toolEnchantmentsSource.includes("name: '石屑'"), 'stone_chips should be named 石屑')
assert(toolEnchantmentsSource.includes("toolType: 'pickaxe'"), 'stone_chips should belong to pickaxe')
assert(toolEnchantmentsSource.includes('20% 概率获得石材×1'), 'stone_chips description should expose its chance and reward')
for (const enchantId of ['efficient', 'swift_pick', 'generous_pick', 'ore_smelter', 'treasure_sense']) {
  assert(toolEnchantmentsSource.includes(enchantId), `tool enchantment data should include ${enchantId}`)
}
for (const enchantId of ['stone_chips', 'efficient', 'swift_pick', 'generous_pick', 'ore_smelter', 'treasure_sense']) {
  assert(toolEnchantmentsSource.includes(`'${enchantId}'`), `pickaxe enchantment pool should include ${enchantId}`)
}
for (const enchantId of ['ring_focus', 'ring_fortune', 'ring_treasure', 'hat_guard', 'hat_clear_mind', 'hat_herbal', 'shoe_swift', 'shoe_surefoot', 'shoe_mine_step']) {
  assert(equipmentEnchantmentsSource.includes(enchantId), `equipment enchantment data should include ${enchantId}`)
}
assert(equipmentEnchantmentsSource.includes("type: 'travel_speed'") && equipmentEnchantmentsSource.includes('value: 0.12'), 'shoe_swift should provide a bounded movement speed enchantment')

assert(miningStoreSource.includes("inventoryStore.getToolEnchantmentId('pickaxe') === 'stone_chips'"), 'mining empty tile should check pickaxe stone_chips enchantment')
assert(miningStoreSource.includes('Math.random() < 0.2'), 'stone_chips chance should be 20%')
assert(miningStoreSource.includes("itemId: 'stone', quantity: 1"), 'stone_chips should grant stone x1')
assert(miningStoreSource.includes('addMiningExpForRewardEntries(rewards)'), 'stone_chips reward should flow through mining reward xp handling')
assert(inventoryStoreSource.includes("tool.enchantmentId === 'efficient' ? 0.85 : 1"), 'efficient tool enchant should reduce stamina multiplier by 15%')
assert(inventoryStoreSource.includes("tool.enchantmentId === 'swift_pick' ? 0.85 : 1"), 'swift pick tool enchant should reduce work-time multiplier by 15%')
assert(miningStoreSource.includes("inventoryStore.getToolEnchantmentId('pickaxe') === 'generous_pick' && Math.random() < 0.15"), 'generous pick should add ore quantity with 15% chance')
assert(miningStoreSource.includes("pickaxeEnchantId === 'ore_smelter' && Math.random() < 0.1"), 'ore smelter should add next-tier ore with 10% chance')
assert(miningStoreSource.includes("pickaxeEnchantId === 'treasure_sense' && Math.random() < 0.08"), 'treasure sense should add a bonus treasure with 8% chance')

for (const phrase of ['武器铸魔', '定向附魔', '保留重铸', '石屑', '迅捷', '破甲', '镇魂', '虫猎', '斩邪', '残响', '割草', '省力', '疾手', '丰采', '炼矿', '寻宝']) {
  assert(changelogSource.includes(phrase), `changelog should mention ${phrase}`)
}

for (const phrase of ['装备附魔', '聚灵', '招财', '探宝', '护心', '清明', '草识', '轻身', '移动速度 +12%', '稳步', '踏矿']) {
  assert(changelogSource.includes(phrase), `changelog should mention ${phrase}`)
}

if (errors.length > 0) {
  console.error('qa-workshop-enchant-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-workshop-enchant-guards: ok')
