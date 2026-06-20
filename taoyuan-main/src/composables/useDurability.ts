import type { ForgeAffixRoll } from '@/types'
import { getDurabilityConsumptionReduction, calculateMaxDurability, getNpcDurabilityBonus, getAffixDurabilityBonus, getEnchantmentDurabilityBonus } from '@/utils/durability'
import type { EquipmentQualityTier } from '@/types'

/** equipment instance shape for durability operations */
interface DurableInstance {
  durability?: number
  locked?: boolean
  [key: string]: unknown
}

/** consume equipment durability (real-time). returns { broken } if durability hits 0 */
export function consumeEquipmentDurability(
  instance: DurableInstance,
  maxDurability: number,
  amount: number = 1,
  consumptionReduction: number = 0
): { broken: boolean } {
  if (instance.locked) return { broken: false }
  const current = instance.durability ?? maxDurability
  const effectiveAmount = Math.max(1, Math.floor(amount * (1 - consumptionReduction)))
  const next = current - effectiveAmount
  instance.durability = Math.max(0, next)
  if (instance.durability <= 0) {
    instance.durability = 0
    instance.locked = true
    return { broken: true }
  }
  return { broken: false }
}

/** repair equipment (restore full durability) */
export function repairEquipment(
  instance: DurableInstance,
  maxDurability: number
): void {
  instance.durability = maxDurability
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

/** calculate total consumption reduction from all sources */
export function calculateConsumptionReduction(
  affixes: ForgeAffixRoll[] | undefined | null,
  enchantmentId: string | undefined | null,
  npcUnlocked: string[]
): number {
  return getDurabilityConsumptionReduction(affixes, enchantmentId, npcUnlocked)
}