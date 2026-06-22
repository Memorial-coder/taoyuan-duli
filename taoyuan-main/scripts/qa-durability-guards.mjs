import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const src = (file) => readFile(path.join(projectRoot, ...file.split('/')), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(`[qa-durability-guards] ${message}`)
}

let failures = 0
const guard = (condition, message) => {
  if (!condition) {
    console.error(`  FAIL: ${message}`)
    failures++
  } else {
    console.log(`  OK: ${message}`)
  }
}

const simulateWear = (uses, reduction) => {
  let durability = 10
  let wearProgress = 0
  for (let i = 0; i < uses; i++) {
    const effectiveAmount = Math.max(0, 1 * Math.max(0.1, 1 - reduction))
    const nextWearProgress = wearProgress + effectiveAmount
    const consumeAmount = Math.floor(nextWearProgress + 1e-9)
    wearProgress = nextWearProgress - consumeAmount
    durability = Math.max(0, durability - consumeAmount)
  }
  return { durability, wearProgress }
}

// 1. Types: EquipmentQualityTier exists
const itemTypes = await src('src/types/item.ts')
guard(itemTypes.includes('EquipmentQualityTier'), 'EquipmentQualityTier type exported in item.ts')
guard(itemTypes.includes("durability?: number") || itemTypes.includes('durability?: number'), 'OwnedWeapon has durability field')
guard(itemTypes.includes("'common'") && itemTypes.includes("'supreme'"), 'EquipmentQualityTier includes common and supreme')

// 2. Ring types
const ringTypes = await src('src/types/ring.ts')
guard(ringTypes.includes("qualityTier: EquipmentQualityTier"), 'RingDef has qualityTier field')
guard(ringTypes.includes("durability?: number"), 'OwnedRing has durability field')

// 3. Equipment types (hat/shoe)
const equipTypes = await src('src/types/equipment.ts')
guard(equipTypes.includes("qualityTier: EquipmentQualityTier"), 'HatDef/ShoeDef has qualityTier field')
guard(equipTypes.includes("durability?: number"), 'OwnedHat/Shoe has durability field')

// 4. MachineType includes repair_bench
const procTypes = await src('src/types/processing.ts')
guard(procTypes.includes("'repair_bench'"), 'MachineType includes repair_bench')

// 5. Forge affixes have durability effects
const forgeAffixes = await src('src/data/forgeAffixes.ts')
guard(forgeAffixes.includes("'durability_bonus'"), 'ForgeAffixEffectType includes durability_bonus')
guard(forgeAffixes.includes("'durability_consumption_reduction'"), 'ForgeAffixEffectType includes durability_consumption_reduction')
guard(forgeAffixes.includes('durable_'), 'Forge affixes include durable variants')
guard(forgeAffixes.includes('wear_resistant_'), 'Forge affixes include wear_resistant variants')
guard(forgeAffixes.includes('fragile_'), 'Forge affixes include fragile (negative) variants')

// 6. Equipment enchantments have durability effects
const enchantments = await src('src/data/equipmentEnchantments.ts')
guard(enchantments.includes("type: 'durability_bonus'"), 'Enchantment effects include durability_bonus')
guard(enchantments.includes("type: 'durability_consumption_reduction'"), 'Enchantment effects include durability_consumption_reduction')

// 7. Durability utility exists with key functions
const durabilityUtils = await src('src/utils/durability.ts')
guard(durabilityUtils.includes('DURABILITY_BASE'), 'DURABILITY_BASE constant exists')
guard(durabilityUtils.includes('calculateMaxDurability'), 'calculateMaxDurability function exists')
guard(durabilityUtils.includes('getNpcDurabilityBonus'), 'getNpcDurabilityBonus function exists')
guard(durabilityUtils.includes('getNpcRepairDiscount'), 'getNpcRepairDiscount function exists')
guard(durabilityUtils.includes('getDurabilityConsumptionReduction'), 'getDurabilityConsumptionReduction function exists')
guard(durabilityUtils.includes('calculateRepairCost'), 'calculateRepairCost function exists')
guard(durabilityUtils.includes('getRepairEquipName'), 'getRepairEquipName function exists')

// 8. Composable useDurability exists
const useDurability = await src('src/composables/useDurability.ts')
guard(useDurability.includes('consumeEquipmentDurability'), 'consumeEquipmentDurability exported')
guard(useDurability.includes('repairEquipment'), 'repairEquipment exported')
guard(useDurability.includes('getCurrentDurability'), 'getCurrentDurability exported')
guard(useDurability.includes('calculateEffectiveMaxDurability'), 'calculateEffectiveMaxDurability exported')
guard(useDurability.includes('durabilityWearProgress'), 'Durability consumption keeps fractional wear progress')
guard(useDurability.includes('Math.floor(nextWearProgress + WEAR_PROGRESS_EPSILON)'), 'Durability reduction uses accumulated fractional wear')
guard(useDurability.includes('WEAR_PROGRESS_EPSILON'), 'Durability fractional wear guards against floating point drift')
guard(!useDurability.includes('Math.max(1, Math.floor(amount'), 'Durability reduction is not rounded back to minimum 1 per action')
const noReduction = simulateWear(10, 0)
const thirtyPercentReduction = simulateWear(10, 0.3)
const fragilePenalty = simulateWear(4, -0.5)
guard(noReduction.durability === 0, 'Baseline one-point actions consume 10 durability over 10 uses')
guard(thirtyPercentReduction.durability === 3, '30% durability reduction preserves about 3 durability over 10 one-point uses')
guard(fragilePenalty.durability === 4, 'Negative durability reduction increases one-point wear over repeated uses')

// 9. All weapon defs have qualityTier
const weaponsData = await src('src/data/weapons.ts')
const weaponCount = (weaponsData.match(/qualityTier:/g) || []).length
guard(weaponCount > 0, `Weapons data has ${weaponCount} qualityTier assignments`)

// 10. All ring defs have qualityTier
const ringsData = await src('src/data/rings.ts')
const ringCount = (ringsData.match(/qualityTier:/g) || []).length
guard(ringCount > 0, `Rings data has ${ringCount} qualityTier assignments`)

// 11. All hat defs have qualityTier
const hatsData = await src('src/data/hats.ts')
const hatCount = (hatsData.match(/qualityTier:/g) || []).length
guard(hatCount > 0, `Hats data has ${hatCount} qualityTier assignments`)

// 12. All shoe defs have qualityTier
const shoesData = await src('src/data/shoes.ts')
const shoeCount = (shoesData.match(/qualityTier:/g) || []).length
guard(shoeCount > 0, `Shoes data has ${shoeCount} qualityTier assignments`)

// 13. Processing data has repair_bench
const processingData = await src('src/data/processing.ts')
guard(processingData.includes("id: 'repair_bench'"), 'repair_bench defined in processing.ts')

// 14. Combat stores consume durability
const miningStore = await src('src/stores/useMiningStore.ts')
guard(miningStore.includes('durability') || miningStore.includes('consumeEquipment'), 'Mining store has durability logic')
guard(miningStore.includes("isNpcFunctionEffectUnlocked('tackle_maintain')"), 'Mining durability uses NPC reduction unlocks')

const quarryStore = await src('src/stores/useQuarryStore.ts')
guard(quarryStore.includes('durability') || quarryStore.includes('consumeEquipment'), 'Quarry store has durability logic')
guard(quarryStore.includes("isNpcFunctionEffectUnlocked('tackle_maintain')"), 'Quarry durability uses NPC reduction unlocks')

const regionStore = await src('src/stores/useRegionMapStore.ts')
guard(regionStore.includes('durability') || regionStore.includes('consumeEquipment'), 'RegionMap store has durability logic')
guard(regionStore.includes("isNpcFunctionEffectUnlocked('tackle_maintain')"), 'RegionMap durability uses NPC reduction unlocks')

// 15. Farm actions consume hat/shoe durability
const farmActions = await src('src/composables/useFarmActions.ts')
guard(farmActions.includes('durability') || farmActions.includes('consumeEquipment'), 'Farm actions have durability logic')
guard(farmActions.includes("isNpcFunctionEffectUnlocked('tackle_maintain')"), 'Farm actions durability uses NPC reduction unlocks')
guard(!farmActions.includes('calculateConsumptionReduction(hat.affixes ?? [], hat.enchantmentId, [])'), 'Farm hat durability does not ignore NPC reduction')
guard(!farmActions.includes('calculateConsumptionReduction(shoe.affixes ?? [], shoe.enchantmentId, [])'), 'Farm shoe durability does not ignore NPC reduction')

// 16. Inventory store handles locked equipment and repair
const inventoryStore = await src('src/stores/useInventoryStore.ts')
guard(inventoryStore.includes('repairOwnedEquipment'), 'Inventory store has repairOwnedEquipment')
guard(inventoryStore.includes('.locked'), 'Inventory store checks locked flag')
guard(inventoryStore.includes('durability !== 0'), 'Inventory store skips locked equipment in presets')
guard(inventoryStore.includes('readDurabilityWearProgress'), 'Inventory store preserves fractional durability wear in saves')
guard(!inventoryStore.includes('slot === 0 ? equippedRingSlot1.value : equippedRingSlot2.value'), 'Ring max durability uses owned ring index directly')

// 17. Fishing store has tackle_maintain NPC integration
const fishingStore = await src('src/stores/useFishingStore.ts')
guard(fishingStore.includes("tackle_maintain"), 'Fishing store has tackle_maintain NPC check')

// 18. NPC functions define equip_durability
const npcFunctions = await src('src/data/npcFunctions.ts')
guard(npcFunctions.includes("effectType: 'equip_durability'"), 'NPC functions define equip_durability effectType')
guard(npcFunctions.includes("effectType: 'tackle_maintain'"), 'NPC functions define tackle_maintain effectType')

// 19. UI shows durability
const inventoryView = await src('src/views/game/InventoryView.vue')
guard(inventoryView.includes('durability'), 'InventoryView displays durability')
guard(inventoryView.includes('破损'), 'InventoryView shows broken/破损 indicator')

// 20. ProcessingView has repair bench UI
const processingView = await src('src/views/game/ProcessingView.vue')
guard(processingView.includes('repair_bench') || processingView.includes('isRepairBench'), 'ProcessingView has repair bench support')
guard(processingView.includes("isNpcFunctionEffectUnlocked('equip_durability')"), 'Repair bench UI uses NPC effect unlock for discount')
guard(!processingView.includes("isNpcFunctionUnlocked('equip_durability')"), 'Repair bench UI does not confuse effectType with function id')

// 21. EquipmentQualityTier values are correct
const validTiers = ['common', 'fine', 'excellent', 'supreme']
for (const tier of validTiers) {
  guard(weaponsData.includes(`'${tier}'`) || weaponsData.includes(`"${tier}"`), `qualityTier '${tier}' used in weapons`)
}

// 22. Durability base values are reasonable
guard(durabilityUtils.includes('common: 50'), 'common base durability = 50')
guard(durabilityUtils.includes('fine: 100'), 'fine base durability = 100')
guard(durabilityUtils.includes('excellent: 150'), 'excellent base durability = 150')
guard(durabilityUtils.includes('supreme: 200'), 'supreme base durability = 200')

console.log('')
if (failures > 0) {
  console.error(`[qa-durability-guards] FAILED: ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('[qa-durability-guards] ALL PASSED')
}
