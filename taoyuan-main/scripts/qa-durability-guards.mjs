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

const LIGHT_DAMAGE_FREE_MATERIAL_RATIO = 0.2
const SIMPLE_REPAIR_MONEY_RATIO = 0.3
const REFURBISH_FULL_REPAIR_MULTIPLIER = 2
const WEAR_MULTIPLIERS = {
  weapon: 0.5,
  ring: 0.5,
  hat: 0.75,
  shoe: 0.75
}

const simulateWear = (uses, reduction, wearType = null) => {
  let durability = 10
  let wearProgress = 0
  for (let i = 0; i < uses; i++) {
    const typeMultiplier = wearType ? WEAR_MULTIPLIERS[wearType] : 1
    const effectiveAmount = Math.max(0, 1 * typeMultiplier * Math.max(0.1, 1 - reduction))
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
    materialQuantity: missingDurability > 0 && damageRatio > LIGHT_DAMAGE_FREE_MATERIAL_RATIO
      ? Math.ceil(fullMaterialQuantity * damageRatio)
      : 0,
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
      money: hasDurabilityDamage ? Math.ceil(fineCost.money * SIMPLE_REPAIR_MONEY_RATIO) : 0,
      sturdinessLoss: calcSturdinessLoss(0.25),
      restoredSturdiness: 0,
      canRepair: hasDurabilityDamage && currentSturdiness >= calcSturdinessLoss(0.25),
      processingDays: 1
    },
    refurbish: {
      ...fineCost,
      mode: 'refurbish',
      materialQuantity: Math.ceil(fullRepairCost.materialQuantity * REFURBISH_FULL_REPAIR_MULTIPLIER),
      money: Math.ceil(fullRepairCost.money * REFURBISH_FULL_REPAIR_MULTIPLIER),
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
guard(durabilityUtils.includes('common: 100') && durabilityUtils.includes('fine: 200') && durabilityUtils.includes('excellent: 320') && durabilityUtils.includes('supreme: 480'), 'Durability bases are raised across all quality tiers')
guard(durabilityUtils.includes('calculateMaxDurability'), 'calculateMaxDurability function exists')
guard(durabilityUtils.includes('STURDINESS_BASE'), 'STURDINESS_BASE constant exists')
guard(durabilityUtils.includes('common: 100') && durabilityUtils.includes('fine: 140') && durabilityUtils.includes('excellent: 190') && durabilityUtils.includes('supreme: 260'), 'Sturdiness bases are raised across all quality tiers')
guard(durabilityUtils.includes('calculateMaxSturdiness'), 'calculateMaxSturdiness function exists')
guard(durabilityUtils.includes('EQUIPMENT_DURABILITY_BALANCE_VERSION = 2'), 'Durability balance version is persisted for migration')
guard(durabilityUtils.includes('DURABILITY_RECIPE_WEIGHT_CAP = 100'), 'Durability recipe weight cap is raised to 100')
guard(durabilityUtils.includes('STURDINESS_RECIPE_WEIGHT_CAP = 50'), 'Sturdiness recipe weight cap is raised to 50')
guard(durabilityUtils.includes('calculateLegacyMaxDurability'), 'Legacy max durability calculator exists for old save migration')
guard(durabilityUtils.includes('calculateLegacyMaxSturdiness'), 'Legacy max sturdiness calculator exists for old save migration')
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
guard(durabilityUtils.includes('REPAIR_LIGHT_DAMAGE_FREE_MATERIAL_RATIO = 0.2'), 'Light repair damage under 20% does not consume materials')
guard(durabilityUtils.includes('SIMPLE_REPAIR_MONEY_RATIO = 0.3'), 'Simple repair costs 30% of fine-repair money')
guard(durabilityUtils.includes('REFURBISH_FULL_REPAIR_MULTIPLIER = 2'), 'Refurbish costs 2x full fine repair')
guard(durabilityUtils.includes("equip_durability') ? 0.2") || durabilityUtils.includes("equip_durability\") ? 0.2"), 'NPC equip_durability reduces sturdiness loss by 20%')

const itemsData = await src('src/data/items.ts')
const extractRepairBaseItemId = (equipType) => {
  const match = durabilityUtils.match(new RegExp(`${equipType}:\\s*\\{\\s*itemId:\\s*'([^']+)'`))
  return match?.[1] ?? ''
}
for (const equipType of ['weapon', 'ring', 'hat', 'shoe']) {
  const itemId = extractRepairBaseItemId(equipType)
  guard(!!itemId, `${equipType} repair base item is configured`)
  guard(itemsData.includes(`id: '${itemId}'`), `${equipType} repair base item ${itemId} exists in item data`)
}
guard(extractRepairBaseItemId('shoe') === 'felt', 'Shoe repair uses existing felt material instead of missing leather')

const fullWeaponRepair = simulateRepairCost(1, 600, 0, 100)
const lightWeaponRepair = simulateRepairCost(1, 600, 90, 100)
const mediumWeaponRepair = simulateRepairCost(1, 600, 70, 100)
guard(fullWeaponRepair.materialQuantity === 1 && fullWeaponRepair.money === 600, '0/100 common weapon repair uses reduced full repair cost')
guard(lightWeaponRepair.materialQuantity === 0 && lightWeaponRepair.money === 60, '90/100 weapon repair only costs money after light-damage material relief')
guard(mediumWeaponRepair.materialQuantity === 1 && mediumWeaponRepair.money === 180, '70/100 weapon repair resumes material cost after the light-damage threshold')
guard(lightWeaponRepair.money < fullWeaponRepair.money && lightWeaponRepair.materialQuantity < fullWeaponRepair.materialQuantity, '90/100 repair is cheaper than 0/100 repair')

const supremeWeaponRepair = simulateRepairCost(Math.ceil(1 * 2.2), Math.ceil(600 * 2.2), 0, 100)
guard(supremeWeaponRepair.materialQuantity === 3 && supremeWeaponRepair.money === 1320, '0/100 supreme weapon repair is reduced from the old 6 materials + 3000 money')

const lightHatRepair = simulateRepairCost(1, 500, 90, 100)
guard(lightHatRepair.materialQuantity === 0 && lightHatRepair.money === 50, '90/100 hat repair only costs money after light-damage material relief')

const repairBenchModeCheck = simulateRepairBenchModeCost({
  fullMaterialQuantity: 1,
  fullMoney: 600,
  currentDurability: 90,
  maxDurability: 100,
  currentSturdiness: 100,
  maxSturdiness: 100
})
guard(repairBenchModeCheck.fine.money > repairBenchModeCheck.simple.money, 'fine repair costs more money than simple repair')
guard(repairBenchModeCheck.fine.sturdinessLoss < repairBenchModeCheck.simple.sturdinessLoss, 'fine repair consumes less sturdiness than simple repair')
guard(repairBenchModeCheck.simple.money === 18, 'simple repair costs 30% of fine-repair money')
guard(repairBenchModeCheck.refurbish.money === 1200, 'refurbish money is 2x full fine repair')
guard(repairBenchModeCheck.refurbish.materialQuantity === 2, 'refurbish material is 2x full fine repair')
guard(repairBenchModeCheck.refurbish.restoredSturdiness === 30, 'refurbish restores 30% max sturdiness')
guard(repairBenchModeCheck.dismantle.canRepair === false, 'cannot dismantle before sturdiness is depleted')

const brokenBenchCheck = simulateRepairBenchModeCost({
  fullMaterialQuantity: 1,
  fullMoney: 600,
  currentDurability: 0,
  maxDurability: 100,
  currentSturdiness: 0,
  maxSturdiness: 100
})
guard(brokenBenchCheck.dismantle.canRepair === true, 'can dismantle after sturdiness is depleted')
guard(brokenBenchCheck.fine.sturdinessLoss > 0, 'broken equipment still produces sturdiness loss')
guard(repairBenchModeCheck.fine.sturdinessLoss < simulateRepairBenchModeCost({
  fullMaterialQuantity: 1,
  fullMoney: 600,
  currentDurability: 0,
  maxDurability: 100,
  currentSturdiness: 100,
  maxSturdiness: 100
}).fine.sturdinessLoss, '0/100 sturdiness loss is higher than 90/100')

// 8. Composable useDurability exists
const useDurability = await src('src/composables/useDurability.ts')
guard(useDurability.includes('consumeEquipmentDurability'), 'consumeEquipmentDurability exported')
guard(useDurability.includes('EquipmentDurabilityWearType'), 'Durability consumption accepts equipment wear type')
guard(useDurability.includes('EQUIPMENT_DURABILITY_WEAR_MULTIPLIER'), 'Durability wear type multipliers are centralized')
guard(useDurability.includes('weapon: 0.5') && useDurability.includes('ring: 0.5'), 'Combat equipment wear is halved')
guard(useDurability.includes('hat: 0.75') && useDurability.includes('shoe: 0.75'), 'Daily equipment wear is reduced')
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
const weaponWear = simulateWear(10, 0, 'weapon')
const hatWear = simulateWear(8, 0, 'hat')
guard(noReduction.durability === 0, 'Baseline one-point actions consume 10 durability over 10 uses')
guard(thirtyPercentReduction.durability === 3, '30% durability reduction preserves about 3 durability over 10 one-point uses')
guard(fragilePenalty.durability === 4, 'Negative durability reduction increases one-point wear over repeated uses')
guard(weaponWear.durability === 5, 'Weapon wear multiplier consumes 5 durability over 10 attacks')
guard(hatWear.durability === 4, 'Hat/shoe wear multiplier consumes 6 durability over 8 daily batches')

const inventoryStoreSource = await src('src/stores/useInventoryStore.ts')
guard(inventoryStoreSource.includes('equipmentDurabilityBalanceVersion: EQUIPMENT_DURABILITY_BALANCE_VERSION'), 'Inventory save writes durability balance version')
guard(inventoryStoreSource.includes('shouldMigrateDurabilityBalance'), 'Inventory load checks durability balance version')
guard(inventoryStoreSource.includes('migrateEquipmentValueToNewMax'), 'Inventory load migrates old durability values by ratio')
guard(inventoryStoreSource.includes('calculateLegacyMaxDurability'), 'Inventory migration reads legacy max durability')
guard(inventoryStoreSource.includes('calculateLegacyMaxSturdiness'), 'Inventory migration reads legacy max sturdiness')
guard(inventoryStoreSource.includes('Math.ceil(safeNewMax * ratio)'), 'Durability migration scales current values to new max')

const miningStoreWear = await src('src/stores/useMiningStore.ts')
const quarryStoreWear = await src('src/stores/useQuarryStore.ts')
const regionMapStoreWear = await src('src/stores/useRegionMapStore.ts')
const farmActionsWear = await src('src/composables/useFarmActions.ts')
guard(miningStoreWear.includes("'weapon'") && miningStoreWear.includes("'ring'"), 'Mining durability calls pass combat wear types')
guard(quarryStoreWear.includes("'weapon'") && quarryStoreWear.includes("'ring'"), 'Quarry durability calls pass combat wear types')
guard(regionMapStoreWear.includes("'weapon'") && regionMapStoreWear.includes("'ring'"), 'Region combat durability calls pass combat wear types')
guard(farmActionsWear.includes("'hat'") && farmActionsWear.includes("'shoe'"), 'Farm durability calls pass daily wear types')

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
guard(inventoryStoreSource.includes('repairOwnedEquipment'), 'Inventory store has repairOwnedEquipment')
guard(inventoryStoreSource.includes('.locked'), 'Inventory store checks locked flag')
guard(inventoryStoreSource.includes('isEquipmentUsableForPreset'), 'Inventory store skips locked or unusable equipment in presets')
guard(inventoryStoreSource.includes('readDurabilityWearProgress'), 'Inventory store preserves fractional durability wear in saves')
guard(inventoryStoreSource.includes('clampEquipmentValue'), 'Inventory store clamps current-version equipment durability/sturdiness on load')
guard(inventoryStoreSource.includes('durability: migrateEquipmentValueToNewMax') && inventoryStoreSource.includes('sturdiness: migrateEquipmentValueToNewMax'), 'Inventory store writes migrated durability/sturdiness fields into old equipment saves')
guard(inventoryStoreSource.includes('calculateEffectiveMaxSturdiness'), 'Inventory store computes max sturdiness for save compatibility')
guard(inventoryStoreSource.includes('getOwnedEquipmentSturdiness'), 'Inventory store exposes owned equipment sturdiness helper')
guard(inventoryStoreSource.includes('dismantleOwnedEquipment'), 'Inventory store exposes dismantleOwnedEquipment')
guard(inventoryStoreSource.includes('canAddItem(baseMaterial.itemId, quantity)'), 'Inventory store checks inventory space before dismantling')
guard(!inventoryStoreSource.includes('slot === 0 ? equippedRingSlot1.value : equippedRingSlot2.value'), 'Ring max durability uses owned ring index directly')

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
guard(processingStore.includes('resolveSmithyRepairJobEquipIndex'), 'Smithy repair collection can recover from equipment index drift')
guard(processingStore.includes('isSmithyRepairJobAlreadyRestored'), 'Smithy repair collection clears jobs already restored by compatibility paths')
guard(processingStore.includes('领取记录已整理'), 'Already-restored smithy jobs should give a clear completion log instead of staying stuck')
guard(processingStore.includes('migrateLegacyRepairSlotToSmithyJob'), 'Processing store migrates legacy repair bench slots into smithy jobs')
guard(processingStore.includes('isSmithyServiceMachine(machineType)') && processingStore.includes('machineCount = computed'), 'Processing store excludes smithy services from workshop machine count')
guard(processingStore.includes('job.mode === \'refurbish\'') && processingStore.includes('恢复全部耐久并补回部分坚固'), 'Refurbish completion log mentions sturdiness')
const endDay = await src('src/composables/useEndDay.ts')
guard(endDay.includes('repairLowestDurabilityEquipment(undefined, processingStore.isSmithyRepairTargetBusy)'), 'Weekly free tool repair skips smithy repair jobs')
guard(endDay.includes("repairLowestDurabilityEquipment(['hat', 'shoe', 'ring'], processingStore.isSmithyRepairTargetBusy)"), 'Weekly free cloth repair skips smithy repair jobs')

// 21. EquipmentQualityTier values are correct
const validTiers = ['common', 'fine', 'excellent', 'supreme']
for (const tier of validTiers) {
  guard(weaponsData.includes(`'${tier}'`) || weaponsData.includes(`"${tier}"`), `qualityTier '${tier}' used in weapons`)
}

// 22. Durability base values are tuned upward while legacy values remain migration-only
guard(durabilityUtils.includes('export const DURABILITY_BASE') && durabilityUtils.includes('common: 100'), 'common base durability = 100')
guard(durabilityUtils.includes('export const DURABILITY_BASE') && durabilityUtils.includes('fine: 200'), 'fine base durability = 200')
guard(durabilityUtils.includes('export const DURABILITY_BASE') && durabilityUtils.includes('excellent: 320'), 'excellent base durability = 320')
guard(durabilityUtils.includes('export const DURABILITY_BASE') && durabilityUtils.includes('supreme: 480'), 'supreme base durability = 480')
guard(durabilityUtils.includes('export const STURDINESS_BASE') && durabilityUtils.includes('common: 100'), 'common base sturdiness = 100')
guard(durabilityUtils.includes('export const STURDINESS_BASE') && durabilityUtils.includes('fine: 140'), 'fine base sturdiness = 140')
guard(durabilityUtils.includes('export const STURDINESS_BASE') && durabilityUtils.includes('excellent: 190'), 'excellent base sturdiness = 190')
guard(durabilityUtils.includes('export const STURDINESS_BASE') && durabilityUtils.includes('supreme: 260'), 'supreme base sturdiness = 260')
guard(durabilityUtils.includes('LEGACY_DURABILITY_BASE') && durabilityUtils.includes('LEGACY_STURDINESS_BASE'), 'Old durability bases are retained only for migration')

console.log('')
if (failures > 0) {
  console.error(`[qa-durability-guards] FAILED: ${failures} check(s) failed`)
  process.exit(1)
} else {
  console.log('[qa-durability-guards] ALL PASSED')
}
