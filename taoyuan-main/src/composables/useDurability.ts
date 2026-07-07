import type { ForgeAffixRoll } from '@/types'
import { getDurabilityConsumptionReduction, calculateMaxDurability, calculateMaxSturdiness, getNpcDurabilityBonus, getAffixDurabilityBonus, getEnchantmentDurabilityBonus } from '@/utils/durability'
import type { EquipmentQualityTier } from '@/types'

/** equipment instance shape for durability operations */
interface DurableInstance {
  durability?: number
  sturdiness?: number
  durabilityWearProgress?: number
  locked?: boolean
  [key: string]: unknown
}

export type EquipmentDurabilityWearType = 'weapon' | 'ring' | 'hat' | 'shoe'

export const EQUIPMENT_DURABILITY_WEAR_MULTIPLIER: Record<EquipmentDurabilityWearType, number> = {
  weapon: 0.5,
  ring: 0.5,
  hat: 0.75,
  shoe: 0.75
}

const normalizeWearProgress = (value: unknown): number => {
  const progress = Number(value)
  if (!Number.isFinite(progress) || progress <= 0) return 0
  return progress % 1
}

const WEAR_PROGRESS_EPSILON = 1e-9

/** consume equipment durability (real-time). returns { broken } if durability hits 0 */
export function consumeEquipmentDurability(
  instance: DurableInstance,
  maxDurability: number,
  amount: number = 1,
  consumptionReduction: number = 0,
  wearType?: EquipmentDurabilityWearType
): { broken: boolean } {
  if (instance.locked) return { broken: false }
  const current = instance.durability ?? maxDurability
  const typeMultiplier = wearType ? EQUIPMENT_DURABILITY_WEAR_MULTIPLIER[wearType] : 1
  const effectiveAmount = Math.max(0, amount * typeMultiplier * Math.max(0.1, 1 - consumptionReduction))
  const nextWearProgress = normalizeWearProgress(instance.durabilityWearProgress) + effectiveAmount
  const consumeAmount = Math.floor(nextWearProgress + WEAR_PROGRESS_EPSILON)
  instance.durabilityWearProgress = nextWearProgress - consumeAmount
  if (consumeAmount <= 0) return { broken: false }
  const next = current - consumeAmount
  instance.durability = Math.max(0, next)
  if (instance.durability <= 0) {
    instance.durability = 0
    instance.durabilityWearProgress = 0
    instance.locked = true
    return { broken: true }
  }
  return { broken: false }
}

/** repair equipment (restore full durability) */
export function repairEquipment(
  instance: DurableInstance,
  maxDurability: number,
  sturdinessLoss: number = 0,
  maxSturdiness?: number
): void {
  instance.durability = maxDurability
  instance.durabilityWearProgress = 0
  if (maxSturdiness != null) {
    const currentSturdiness = getCurrentSturdiness(instance, maxSturdiness)
    instance.sturdiness = Math.max(0, Math.min(maxSturdiness, currentSturdiness - Math.max(0, Math.floor(sturdinessLoss))))
  }
  instance.locked = false
}

/** refurbish equipment (restore full durability and part of repair lifespan) */
export function refurbishEquipment(
  instance: DurableInstance,
  maxDurability: number,
  maxSturdiness: number,
  restoredSturdiness: number
): void {
  instance.durability = maxDurability
  instance.sturdiness = Math.max(0, Math.min(maxSturdiness, Math.floor(restoredSturdiness)))
  instance.durabilityWearProgress = 0
  instance.locked = false
}

/** get current durability (handles undefined for migration compat) */
export function getCurrentDurability(
  instance: DurableInstance,
  maxDurability: number
): number {
  if (instance.durability == null) return maxDurability
  return Math.min(instance.durability, maxDurability)
}

/** get current sturdiness (handles undefined for migration compat) */
export function getCurrentSturdiness(
  instance: DurableInstance,
  maxSturdiness: number
): number {
  if (instance.sturdiness == null) return maxSturdiness
  return Math.max(0, Math.min(Math.floor(instance.sturdiness), maxSturdiness))
}

/** calculate max durability with all bonuses applied */
export function calculateEffectiveMaxDurability(
  qualityTier: EquipmentQualityTier,
  recipe: { itemId: string; quantity: number }[] | null,
  recipeMoney: number,
  affixes: ForgeAffixRoll[] | undefined | null,
  enchantmentId: string | undefined | null,
  npcUnlocked: string[]
): number {
  const npcBonus = getNpcDurabilityBonus(npcUnlocked)
  const base = calculateMaxDurability(qualityTier, recipe, recipeMoney, npcBonus)
  const affixBonus = getAffixDurabilityBonus(affixes)
  const enchantBonus = getEnchantmentDurabilityBonus(enchantmentId)
  return Math.max(1, Math.floor(base * (1 + affixBonus + enchantBonus)))
}

/** calculate max sturdiness with durability-direction bonuses applied */
export function calculateEffectiveMaxSturdiness(
  qualityTier: EquipmentQualityTier,
  recipe: { itemId: string; quantity: number }[] | null,
  recipeMoney: number,
  affixes: ForgeAffixRoll[] | undefined | null,
  enchantmentId: string | undefined | null
): number {
  const affixBonus = getAffixDurabilityBonus(affixes)
  const enchantBonus = getEnchantmentDurabilityBonus(enchantmentId)
  return calculateMaxSturdiness(qualityTier, recipe, recipeMoney, affixBonus + enchantBonus)
}

/** calculate total consumption reduction from all sources */
export function calculateConsumptionReduction(
  affixes: ForgeAffixRoll[] | undefined | null,
  enchantmentId: string | undefined | null,
  npcUnlocked: string[]
): number {
  return getDurabilityConsumptionReduction(affixes, enchantmentId, npcUnlocked)
}
