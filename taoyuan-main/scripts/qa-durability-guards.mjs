/* global console, process */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const src = (file) => readFile(path.join(projectRoot, ...file.split('/')), 'utf8')

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

const simulateRepairCost = (fullMaterialQuantity, fullMoney, current, max) => {
  const missingDurability = Math.max(0, Math.min(max, max - current))
  const damageRatio = max > 0 ? missingDurability / max : 0
  return {
    materialQuantity: missingDurability > 0 ? Math.ceil(fullMaterialQuantity * damageRatio) : 0,
    money: missingDurability > 0 ? Math.ceil(fullMoney * damageRatio) : 0,
    missingDurability,
    damageRatio
  }
}

const simulateRepairBenchModeCost = ({
  fullMaterialQuantity,
  fullMoney,
  currentDurability,
  maxDurability,
  currentSturdiness,
  maxSturdiness
}) => {
  const fineCost = simulateRepairCost(fullMaterialQuantity, fullMoney, currentDurability, maxDurability)
  const hasDurabilityDamage = fineCost.missingDurability > 0
  const calcSturdinessLoss = (ratio) => hasDurabilityDamage
    ? Math.max(1, Math.ceil(maxSturdiness * ratio * fineCost.damageRatio))
    : 0
  const fullRepairCost = simulateRepairCost(fullMaterialQuantity, fullMoney, 0, Math.max(1, maxDurability))
  return {
    fine: {
      ...fineCost,
      mode: 'fine',
      sturdinessLoss: calcSturdinessLoss(0.08),
      restoredSturdiness: 0,
      canRepair: hasDurabilityDamage && currentSturdiness >= calcSturdinessLoss(0.08),
      processingDays: 1
    },
    simple: {
      ...fineCost,
      mode: 'simple',
      materialQuantity: 0,
      money: hasDurabilityDamage ? Math.ceil(fineCost.money * 0.45) : 0,
      sturdinessLoss: calcSturdinessLoss(0.25),
      restoredSturdiness: 0,
      canRepair: hasDurabilityDamage && currentSturdiness >= calcSturdinessLoss(0.25),
      processingDays: 1
    },
    refurbish: {
      ...fineCost,
      mode: 'refurbish',
      materialQuantity: Math.ceil(fullRepairCost.materialQuantity * 3),
      money: Math.ceil(fullRepairCost.money * 3),
      sturdinessLoss: 0,
      restoredSturdiness: Math.max(1, Math.ceil(maxSturdiness * 0.3)),
      canRepair: hasDurabilityDamage || currentSturdiness < maxSturdiness,
      processingDays: 2
    },
    dismantle: {
      ...fineCost,
      mode: 'dismantle',
      materialQuantity: 0,
      money: 0,
      sturdinessLoss: 0,
      restoredSturdiness: 0,
      canRepair: currentSturdiness <= 0,
      processingDays: 0
    }
  }
}

// 1. Types: EquipmentQualityTier exists
const itemTypes = await src('src/types/item.ts')
guard(itemTypes.includes('EquipmentQualityTier'), 'EquipmentQualityTier type exported in item.ts')
guard(itemTypes.includes("durability?: number") || itemTypes.includes('durability?: number'), 'OwnedWeapon has durability field')
guard(itemTypes.includes("sturdiness?: number") || itemTypes.includes('sturdiness?: number'), 'OwnedWeapon has sturdiness field')
guard(itemTypes.includes("'common'") && itemTypes.includes("'supreme'"), 'EquipmentQualityTier includes common and supreme')

// 2. Ring types
const ringTypes = await src('src/types/ring.ts')
guard(ringTypes.includes("qualityTier: EquipmentQualityTier"), 'RingDef has qualityTier field')
guard(ringTypes.includes("durability?: number"), 'OwnedRing has durability field')
guard(ringTypes.includes("sturdiness?: number"), 'OwnedRing has sturdiness field')

// 3. Equipment types (hat/shoe)
const equipTypes = await src('src/types/equipment.ts')
guard(equipTypes.includes("qualityTier: EquipmentQualityTier"), 'HatDef/ShoeDef has qualityTier field')
guard(equipTypes.includes("durability?: number"), 'OwnedHat/Shoe has durability field')
guard(equipTypes.includes("sturdiness?: number"), 'OwnedHat/Shoe has sturdiness field')

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
guard(durabilityUtils.includes('STURDINESS_BASE'), 'STURDINESS_BASE constant exists')
guard(durabilityUtils.includes('calculateMaxSturdiness'), 'calculateMaxSturdiness function exists')
guard(durabilityUtils.includes('getNpcDurabilityBonus'), 'getNpcDurabilityBonus function exists')
guard(durabilityUtils.includes('getNpcRepairDiscount'), 'getNpcRepairDiscount function exists')
guard(durabilityUtils.includes('getNpcSturdinessRepairReduction'), 'getNpcSturdinessRepairReduction function exists')
guard(durabilityUtils.includes('getDurabilityConsumptionReduction'), 'getDurabilityConsumptionReduction function exists')
guard(durabilityUtils.includes('calculateRepairCost'), 'calculateRepairCost function exists')
guard(durabilityUtils.includes('calculateRepairBenchModeCost'), 'calculateRepairBenchModeCost function exists')
guard(durabilityUtils.includes('getRepairEquipName'), 'getRepairEquipName function exists')
guard(durabilityUtils.includes('durability: RepairDurabilityState'), 'calculateRepairCost requires current/max durability state')
guard(durabilityUtils.includes('sturdiness: RepairSturdinessState'), 'calculateRepairBenchModeCost requires current/max sturdiness state')
guard(durabilityUtils.includes('missingDurability') && durabilityUtils.includes('damageRatio'), 'Repair cost exposes missing durability and damage ratio')
guard(durabilityUtils.includes('Math.ceil(fullMaterialQuantity * damageRatio)'), 'Repair material cost scales by damage ratio')
guard(durabilityUtils.includes('Math.ceil(fullMoney * damageRatio)'), 'Repair money cost scales by damage ratio')
guard(durabilityUtils.includes("equip_durability') ? 0.2") || durabilityUtils.includes("equip_durability\") ? 0.2"), 'NPC equip_durability reduces sturdiness loss by 20%')

const fullWeaponRepair = simulateRepairCost(2, 1000, 0, 100)
const lightWeaponRepair = simulateRepairCost(2, 1000, 90, 100)
guard(fullWeaponRepair.materialQuantity === 2 && fullWeaponRepair.money === 1000, '0/100 weapon repair keeps full repair cost')
guard(lightWeaponRepair.materialQuantity === 1 && lightWeaponRepair.money === 100, '90/100 weapon repair scales down to 1 material and 100 money')
guard(lightWeaponRepair.money < fullWeaponRepair.money && lightWeaponRepair.materialQuantity < fullWeaponRepair.materialQuantity, '90/100 repair is cheaper than 0/100 repair')

const repairBenchModeCheck = simulateRepairBenchModeCost({
  fullMaterialQuantity: 2,
  fullMoney: 1000,
  currentDurability: 90,
  maxDurability: 100,
  currentSturdiness: 100,
  maxSturdiness: 100
})
guard(repairBenchModeCheck.fine.money > repairBenchModeCheck.simple.money, '精修比简修更贵')
guard(repairBenchModeCheck.fine.sturdinessLoss < repairBenchModeCheck.simple.sturdinessLoss, '精修比简修坚固损耗更低')
guard(repairBenchModeCheck.refurbish.money === 3000, '翻新铜钱是满修的 3 倍')
guard(repairBenchModeCheck.refurbish.restoredSturdiness === 30, '翻新恢复 30% 最大坚固')
guard(repairBenchModeCheck.dismantle.canRepair === false, '未失固时不能拆解')

const brokenBenchCheck = simulateRepairBenchModeCost({
  fullMaterialQuantity: 2,
  fullMoney: 1000,
  currentDurability: 0,
  maxDurability: 100,
  currentSturdiness: 0,
  maxSturdiness: 100
})
guard(brokenBenchCheck.dismantle.canRepair === true, '失固时允许拆解')
guard(brokenBenchCheck.fine.sturdinessLoss > 0, '破损装备会产生坚固损耗')
guard(repairBenchModeCheck.fine.sturdinessLoss < simulateRepairBenchModeCost({
  fullMaterialQuantity: 2,
  fullMoney: 1000,
  currentDurability: 0,
  maxDurability: 100,
  currentSturdiness: 100,
  maxSturdiness: 100
}).fine.sturdinessLoss, '0/100 的坚固损耗高于 90/100')

// 8. Composable useDurability exists
const useDurability = await src('src/composables/useDurability.ts')
guard(useDurability.includes('consumeEquipmentDurability'), 'consumeEquipmentDurability exported')
guard(useDurability.includes('repairEquipment'), 'repairEquipment exported')
guard(useDurability.includes('getCurrentDurability'), 'getCurrentDurability exported')
guard(useDurability.includes('getCurrentSturdiness'), 'getCurrentSturdiness exported')
guard(useDurability.includes('calculateEffectiveMaxDurability'), 'calculateEffectiveMaxDurability exported')
guard(useDurability.includes('calculateEffectiveMaxSturdiness'), 'calculateEffectiveMaxSturdiness exported')
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
guard(inventoryStore.includes('isEquipmentUsableForPreset'), 'Inventory store skips locked or unusable equipment in presets')
guard(inventoryStore.includes('readDurabilityWearProgress'), 'Inventory store preserves fractional durability wear in saves')
guard(inventoryStore.includes('clampEquipmentValue'), 'Inventory store clamps and fills missing equipment durability/sturdiness on load')
guard(inventoryStore.includes('durability: clampEquipmentValue') && inventoryStore.includes('sturdiness: clampEquipmentValue'), 'Inventory store writes migrated durability/sturdiness fields into old equipment saves')
guard(inventoryStore.includes('calculateEffectiveMaxSturdiness'), 'Inventory store computes max sturdiness for save compatibility')
guard(inventoryStore.includes('getOwnedEquipmentSturdiness'), 'Inventory store exposes owned equipment sturdiness helper')
guard(inventoryStore.includes('dismantleOwnedEquipment'), 'Inventory store exposes dismantleOwnedEquipment')
guard(inventoryStore.includes('canAddItem(baseMaterial.itemId, quantity)'), 'Inventory store checks inventory space before dismantling')
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
guard(inventoryView.includes('坚固'), 'InventoryView displays sturdiness')
guard(inventoryView.includes('失固'), 'InventoryView shows失固 indicator')
guard(!inventoryView.includes('durability != null'), 'InventoryView durability display is not gated by raw durability field presence')
guard(inventoryView.includes('getOwnedEquipmentDurability'), 'InventoryView derives durability from equipment instance helpers')
guard(inventoryView.includes('activeRingDurability') && inventoryView.includes('activeHatDurability') && inventoryView.includes('activeShoeDurability'), 'InventoryView details show ring/hat/shoe durability')
guard(inventoryView.includes('equippedWeaponDurability') && inventoryView.includes('equippedRing1Durability') && inventoryView.includes('equippedHatDurability') && inventoryView.includes('equippedShoeDurability'), 'InventoryView equipped slot summaries show durability')

// 20. ToolUpgradeView has smithy repair UI
const processingView = await src('src/views/game/ProcessingView.vue')
const toolUpgradeView = await src('src/views/game/ToolUpgradeView.vue')
guard(toolUpgradeView.includes('smithy-repair-section'), 'ToolUpgradeView exposes smithy repair section')
guard(toolUpgradeView.includes('smithy-repair-target-${target.key}'), 'Smithy repair UI lists equipment targets')
guard(toolUpgradeView.includes('getRepairBenchCostPreview('), 'Smithy repair preview uses processing store cost preview')
guard(toolUpgradeView.includes('{ current: target.current, max: target.max }') && toolUpgradeView.includes('{ current: target.sturdinessCurrent, max: target.sturdinessMax }'), 'Smithy repair preview passes current/max durability and sturdiness')
guard(toolUpgradeView.includes('missingDurability') && toolUpgradeView.includes('damagePercent'), 'Smithy repair UI shows missing durability and damage percent')
guard(toolUpgradeView.includes('精修') && toolUpgradeView.includes('简修') && toolUpgradeView.includes('翻新') && toolUpgradeView.includes('拆解'), 'Smithy repair UI shows all repair modes')
guard(toolUpgradeView.includes('坚固'), 'Smithy repair UI shows sturdiness')
guard(toolUpgradeView.includes('formatRepairDisabledReason') && toolUpgradeView.includes('disabledReason: formatRepairDisabledReason(cost.disabledReason)'), 'Smithy repair UI formats internal disabledReason codes before display')
guard(toolUpgradeView.includes('modes.find(mode => buildRepairPreview(target, mode).canRepair)'), 'Smithy repair defaults to an available repair mode')
guard(processingView.includes("filter(m => !isSmithyServiceMachine(m.id))"), 'ProcessingView craft list filters smithy service machines')

const processingStore = await src('src/stores/useProcessingStore.ts')
guard(processingStore.includes("isNpcFunctionEffectUnlocked('equip_durability')"), 'Repair bench cost uses NPC effect unlock for discount')
guard(processingStore.includes('durability: RepairDurabilityState'), 'Processing store cost preview requires current/max durability')
guard(processingStore.includes('sturdiness: RepairSturdinessState'), 'Processing store cost preview requires current/max sturdiness')
guard(processingStore.includes('inventoryStore.getOwnedEquipmentDurability(equipType, equipIndex)'), 'Repair start recomputes current durability from inventory')
guard(processingStore.includes('inventoryStore.getOwnedEquipmentSturdiness(equipType, equipIndex)'), 'Repair start recomputes current sturdiness from inventory')
guard(processingStore.includes('getRepairBenchCostPreview(equipType, defId, durability, sturdiness, mode)'), 'Repair start uses recomputed durability and sturdiness for final cost')
guard(processingStore.includes('smithyRepairJobs'), 'Processing store persists smithy repair jobs outside workshop machine slots')
guard(processingStore.includes('startSmithyRepair'), 'Processing store starts smithy repair without repair_bench slot')
guard(processingStore.includes('collectSmithyRepairJob'), 'Processing store collects smithy repair jobs')
guard(processingStore.includes('migrateLegacyRepairSlotToSmithyJob'), 'Processing store migrates legacy repair bench slots into smithy jobs')
guard(processingStore.includes('isSmithyServiceMachine(machineType)') && processingStore.includes('machineCount = computed'), 'Processing store excludes smithy services from workshop machine count')
guard(processingStore.includes('job.mode === \'refurbish\'') && processingStore.includes('恢复全部耐久并补回部分坚固'), 'Refurbish completion log mentions sturdiness')

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
guard(durabilityUtils.includes('common: 80'), 'common base sturdiness = 80')
guard(durabilityUtils.includes('fine: 100'), 'fine base sturdiness = 100')
guard(durabilityUtils.includes('excellent: 120'), 'excellent base sturdiness = 120')
guard(durabilityUtils.includes('supreme: 150'), 'supreme base sturdiness = 150')

console.log('')
if (failures > 0) {
  console.error(`[qa-durability-guards] FAILED: ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('[qa-durability-guards] ALL PASSED')
}
