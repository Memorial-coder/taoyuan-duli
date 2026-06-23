import type { EquipmentQualityTier } from '@/types'
import type { ForgeAffixRoll } from '@/types'
import { getEquipmentEnchantmentById } from '@/data/equipmentEnchantments'
import { getForgeAffixById, normalizeForgeAffixValue } from '@/data/forgeAffixes'

/** quality tier -> base durability */
export const DURABILITY_BASE: Record<EquipmentQualityTier, number> = {
  common: 50,
  fine: 100,
  excellent: 150,
  supreme: 200
}

/** quality tier -> base sturdiness */
export const STURDINESS_BASE: Record<EquipmentQualityTier, number> = {
  common: 80,
  fine: 100,
  excellent: 120,
  supreme: 150
}

/** recipe cost weight: material kinds x 10 + money/1000, clamped 0~50 */
export function recipeCostWeight(
  recipe: { itemId: string; quantity: number }[] | null,
  recipeMoney: number
): number {
  const materialWeight = (recipe?.length ?? 0) * 10
  const moneyWeight = Math.floor(recipeMoney / 1000)
  return Math.min(50, Math.max(0, materialWeight + moneyWeight))
}

/** calculate equipment max durability */
export function calculateMaxDurability(
  qualityTier: EquipmentQualityTier,
  recipe: { itemId: string; quantity: number }[] | null,
  recipeMoney: number,
  npcDurabilityBonus: number = 0
): number {
  const base = DURABILITY_BASE[qualityTier]
  const weight = recipeCostWeight(recipe, recipeMoney)
  const raw = base + weight
  const withNpc = Math.floor(raw * (1 + npcDurabilityBonus))
  return Math.max(1, withNpc)
}

/** calculate equipment max sturdiness */
export function calculateMaxSturdiness(
  qualityTier: EquipmentQualityTier,
  recipe: { itemId: string; quantity: number }[] | null,
  recipeMoney: number,
  bonusRatio: number = 0
): number {
  const base = STURDINESS_BASE[qualityTier]
  const weight = Math.min(30, recipeCostWeight(recipe, recipeMoney))
  return Math.max(1, Math.floor((base + weight) * (1 + bonusRatio)))
}

/** get NPC durability bonus ratio (0.2 if unlocked, else 0) */
export function getNpcDurabilityBonus(unlockedFunctions: string[]): number {
  return unlockedFunctions.includes('equip_durability') ? 0.2 : 0
}

export function getNpcRepairDiscount(unlockedFunctions: string[], equipType?: RepairBenchEquipType): number {
  if (unlockedFunctions.includes('equip_durability')) return 0.3
  if ((equipType === 'ring' || equipType === 'hat' || equipType === 'weapon') && unlockedFunctions.includes('free_cloth_repair')) return 1.0
  return 0
}

export function getNpcSturdinessRepairReduction(unlockedFunctions: string[]): number {
  return unlockedFunctions.includes('equip_durability') ? 0.2 : 0
}

/** sum durability_consumption_reduction from forge affixes */
function getAffixDurabilityReduction(affixes: ForgeAffixRoll[] | undefined | null): number {
  if (!affixes) return 0
  return affixes.reduce((sum, roll) => {
    const def = getForgeAffixById(roll.id)
    if (!def || def.effectType !== 'durability_consumption_reduction') return sum
    return sum + normalizeForgeAffixValue(def, roll.value)
  }, 0)
}

/** sum durability_bonus from forge affixes */
export function getAffixDurabilityBonus(affixes: ForgeAffixRoll[] | undefined | null): number {
  if (!affixes) return 0
  return affixes.reduce((sum, roll) => {
    const def = getForgeAffixById(roll.id)
    if (!def || def.effectType !== 'durability_bonus') return sum
    return sum + normalizeForgeAffixValue(def, roll.value)
  }, 0)
}

/** get enchantment durability reduction bonus */
function getEnchantmentDurabilityReduction(enchantmentId: string | undefined | null): number {
  if (!enchantmentId) return 0
  const enchant = getEquipmentEnchantmentById(enchantmentId)
  if (!enchant) return 0
  return enchant.effects
    .filter(e => e.type === 'durability_consumption_reduction')
    .reduce((sum, e) => sum + e.value, 0)
}

/** get enchantment durability bonus */
export function getEnchantmentDurabilityBonus(enchantmentId: string | undefined | null): number {
  if (!enchantmentId) return 0
  const enchant = getEquipmentEnchantmentById(enchantmentId)
  if (!enchant) return 0
  return enchant.effects
    .filter(e => e.type === 'durability_bonus')
    .reduce((sum, e) => sum + e.value, 0)
}

/** get total durability consumption reduction from all sources */
export function getDurabilityConsumptionReduction(
  affixes: ForgeAffixRoll[] | undefined | null,
  enchantmentId: string | undefined | null,
  npcUnlocked: string[]
): number {
  const affixReduction = getAffixDurabilityReduction(affixes)
  const enchantReduction = getEnchantmentDurabilityReduction(enchantmentId)
  const npcReduction = npcUnlocked.includes('tackle_maintain') ? 0.3 : 0
  return Math.min(0.9, affixReduction + enchantReduction + npcReduction)
}

// === Repair Bench Cost Helpers ===

import { getWeaponById } from '@/data/weapons'
import { getRingById } from '@/data/rings'
import { getHatById } from '@/data/hats'
import { getShoeById } from '@/data/shoes'

export type RepairBenchEquipType = 'weapon' | 'ring' | 'hat' | 'shoe'

export interface RepairDurabilityState {
  current: number
  max: number
}

export interface RepairSturdinessState {
  current: number
  max: number
}

export type RepairBenchMode = 'fine' | 'simple' | 'refurbish' | 'dismantle'

const REPAIR_BASE_COSTS: Record<RepairBenchEquipType, { itemId: string; quantity: number; money: number }> = {
  weapon: { itemId: 'iron_bar', quantity: 2, money: 1000 },
  ring:   { itemId: 'iron_bar', quantity: 1, money: 500 },
  hat:    { itemId: 'cloth',    quantity: 2, money: 800 },
  shoe:   { itemId: 'leather',  quantity: 2, money: 800 }
}

const REPAIR_TIER_MULTIPLIER: Record<EquipmentQualityTier, number> = {
  common: 1,
  fine: 1.5,
  excellent: 2,
  supreme: 3
}

export function getRepairQualityTier(
  equipType: RepairBenchEquipType,
  defId: string
): EquipmentQualityTier | null {
  if (equipType === 'weapon') return getWeaponById(defId)?.qualityTier ?? null
  if (equipType === 'ring') return getRingById(defId)?.qualityTier ?? null
  if (equipType === 'hat') return getHatById(defId)?.qualityTier ?? null
  return getShoeById(defId)?.qualityTier ?? null
}

export function getRepairBaseMaterial(equipType: RepairBenchEquipType): { itemId: string; quantity: number } {
  const base = REPAIR_BASE_COSTS[equipType]
  return { itemId: base.itemId, quantity: base.quantity }
}

export function calculateRepairCost(
  equipType: RepairBenchEquipType,
  defId: string,
  npcUnlocked: string[],
  durability: RepairDurabilityState
): {
  materialItemId: string
  materialQuantity: number
  money: number
  missingDurability: number
  damageRatio: number
} {
  const base = REPAIR_BASE_COSTS[equipType]
  const tier = getRepairQualityTier(equipType, defId) ?? 'common'
  const multiplier = REPAIR_TIER_MULTIPLIER[tier]
  const discount = 1 - getNpcRepairDiscount(npcUnlocked, equipType)
  const fullMaterialQuantity = Math.ceil(base.quantity * multiplier)
  const fullMoney = Math.ceil(base.money * multiplier * discount)
  const maxDurability = Math.max(0, Math.floor(Number(durability.max)))
  const currentDurability = Math.max(0, Math.floor(Number(durability.current)))
  const missingDurability = maxDurability > 0
    ? Math.min(maxDurability, Math.max(0, maxDurability - currentDurability))
    : 0
  const damageRatio = maxDurability > 0 ? missingDurability / maxDurability : 1
  return {
    materialItemId: base.itemId,
    materialQuantity: missingDurability > 0 ? Math.ceil(fullMaterialQuantity * damageRatio) : 0,
    money: missingDurability > 0 ? Math.ceil(fullMoney * damageRatio) : 0,
    missingDurability,
    damageRatio
  }
}

export function calculateRepairBenchModeCost(
  equipType: RepairBenchEquipType,
  defId: string,
  npcUnlocked: string[],
  durability: RepairDurabilityState,
  sturdiness: RepairSturdinessState,
  mode: RepairBenchMode
): {
  mode: RepairBenchMode
  materialItemId: string
  materialQuantity: number
  money: number
  missingDurability: number
  damageRatio: number
  sturdinessLoss: number
  restoredSturdiness: number
  canRepair: boolean
  disabledReason: string
  processingDays: number
} {
  const fineCost = calculateRepairCost(equipType, defId, npcUnlocked, durability)
  const currentSturdiness = Math.max(0, Math.floor(Number(sturdiness.current)))
  const maxSturdiness = Math.max(1, Math.floor(Number(sturdiness.max)))
  const hasDurabilityDamage = fineCost.missingDurability > 0
  const sturdinessReduction = 1 - getNpcSturdinessRepairReduction(npcUnlocked)
  const calcSturdinessLoss = (ratio: number) => hasDurabilityDamage
    ? Math.max(1, Math.ceil(maxSturdiness * ratio * fineCost.damageRatio * sturdinessReduction))
    : 0
  const fullRepairCost = calculateRepairCost(
    equipType,
    defId,
    npcUnlocked,
    { current: 0, max: Math.max(1, Math.floor(Number(durability.max))) }
  )

  if (mode === 'simple') {
    const sturdinessLoss = calcSturdinessLoss(0.25)
    const hasEnoughSturdiness = currentSturdiness >= sturdinessLoss
    return {
      ...fineCost,
      mode,
      materialQuantity: 0,
      money: hasDurabilityDamage ? Math.ceil(fineCost.money * 0.45) : 0,
      sturdinessLoss,
      restoredSturdiness: 0,
      canRepair: hasDurabilityDamage && hasEnoughSturdiness,
      disabledReason: !hasDurabilityDamage ? 'durability_full' : !hasEnoughSturdiness ? 'sturdiness_insufficient' : '',
      processingDays: 1
    }
  }

  if (mode === 'refurbish') {
    const restoredSturdiness = Math.max(1, Math.ceil(maxSturdiness * 0.3))
    return {
      ...fineCost,
      mode,
      materialQuantity: Math.ceil(fullRepairCost.materialQuantity * 3),
      money: Math.ceil(fullRepairCost.money * 3),
      sturdinessLoss: 0,
      restoredSturdiness,
      canRepair: hasDurabilityDamage || currentSturdiness < maxSturdiness,
      disabledReason: hasDurabilityDamage || currentSturdiness < maxSturdiness ? '' : 'fully_restored',
      processingDays: 2
    }
  }

  if (mode === 'dismantle') {
    return {
      ...fineCost,
      mode,
      materialQuantity: 0,
      money: 0,
      sturdinessLoss: 0,
      restoredSturdiness: 0,
      canRepair: currentSturdiness <= 0,
      disabledReason: currentSturdiness <= 0 ? '' : 'sturdiness_remaining',
      processingDays: 0
    }
  }

  const sturdinessLoss = calcSturdinessLoss(0.08)
  const hasEnoughSturdiness = currentSturdiness >= sturdinessLoss
  return {
    ...fineCost,
    mode,
    sturdinessLoss,
    restoredSturdiness: 0,
    canRepair: hasDurabilityDamage && hasEnoughSturdiness,
    disabledReason: !hasDurabilityDamage ? 'durability_full' : !hasEnoughSturdiness ? 'sturdiness_insufficient' : '',
    processingDays: 1
  }
}

export function getRepairEquipName(
  equipType: RepairBenchEquipType,
  defId: string
): string {
  if (equipType === 'weapon') return getWeaponById(defId)?.name ?? defId
  if (equipType === 'ring') return getRingById(defId)?.name ?? defId
  if (equipType === 'hat') return getHatById(defId)?.name ?? defId
  return getShoeById(defId)?.name ?? defId
}
