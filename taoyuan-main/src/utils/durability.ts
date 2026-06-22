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

/** get NPC durability bonus ratio (0.2 if unlocked, else 0) */
export function getNpcDurabilityBonus(unlockedFunctions: string[]): number {
  return unlockedFunctions.includes('equip_durability') ? 0.2 : 0
}

export function getNpcRepairDiscount(unlockedFunctions: string[], equipType?: RepairBenchEquipType): number {
  if (unlockedFunctions.includes('equip_durability')) return 0.3
  if ((equipType === 'ring' || equipType === 'hat' || equipType === 'weapon') && unlockedFunctions.includes('free_cloth_repair')) return 1.0
  return 0
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

export function calculateRepairCost(
  equipType: RepairBenchEquipType,
  defId: string,
  npcUnlocked: string[]
): { materialItemId: string; materialQuantity: number; money: number } {
  const base = REPAIR_BASE_COSTS[equipType]
  const tier = getRepairQualityTier(equipType, defId) ?? 'common'
  const multiplier = REPAIR_TIER_MULTIPLIER[tier]
  const discount = 1 - getNpcRepairDiscount(npcUnlocked, equipType)
  return {
    materialItemId: base.itemId,
    materialQuantity: Math.ceil(base.quantity * multiplier),
    money: Math.ceil(base.money * multiplier * discount)
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
