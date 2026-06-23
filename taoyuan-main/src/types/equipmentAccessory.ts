export type EquipmentAccessoryFamilyId = 'weaponry' | 'armor' | 'gathering'

export type EquipmentAccessorySlotId =
  | 'weaponry_blade_core'
  | 'weaponry_guard'
  | 'weaponry_inscription'
  | 'armor_lining'
  | 'armor_talisman'
  | 'armor_tread'
  | 'gathering_pick_head'
  | 'gathering_grip'
  | 'gathering_probe'

export type EquipmentAccessoryTier = 1 | 2 | 3 | 4

export type EquipmentAccessoryQuality = 'normal' | 'fine' | 'excellent' | 'supreme'

export type EquipmentAccessorySource =
  | 'workshop'
  | 'mine'
  | 'deep_mine'
  | 'blueprint'
  | 'npc'
  | 'guild'
  | 'debug'
  | 'fusion'

export type EquipmentAccessoryEffectKey =
  | 'accessory_attack_flat'
  | 'accessory_crit_rate'
  | 'accessory_combat_time_reduction'
  | 'accessory_damage_reduction'
  | 'accessory_max_hp_flat'
  | 'accessory_passout_loss_reduction'
  | 'accessory_durability_consumption_reduction'
  | 'accessory_mining_stamina_reduction'
  | 'accessory_ore_bonus_chance'
  | 'accessory_quarry_double_chance'
  | 'accessory_treasure_hint'

export interface EquipmentAccessoryEffectDef {
  key: EquipmentAccessoryEffectKey
  basePerLevel: number
  maxValue: number
  label: string
  unit: 'flat' | 'percent' | 'hint'
}
export interface EquipmentAccessoryDef {
  id: EquipmentAccessorySlotId
  familyId: EquipmentAccessoryFamilyId
  slotId: EquipmentAccessorySlotId
  name: string
  shortName: string
  description: string
  effects: EquipmentAccessoryEffectDef[]
  icon: string
  frame: string
}

export interface EquipmentAccessoryMaterialCost {
  itemId: string
  quantity: number
}

export interface EquipmentAccessoryUpgradeCostDef {
  targetLevel: number
  accessoryMaterial: number
  tuningStone: number
  money: number
  extraItems: EquipmentAccessoryMaterialCost[]
}

export interface EquipmentAccessoryUpgradeInvestment {
  accessoryMaterial: number
  tuningStone: number
}

export interface EquipmentAccessoryRecipeDef {
  id: string
  defId: EquipmentAccessorySlotId
  tier: EquipmentAccessoryTier
  unlock: 'default' | 'workshop_advanced' | 'blueprint'
  qualityRolls: Array<{ quality: EquipmentAccessoryQuality; weight: number }>
  materialCosts: EquipmentAccessoryMaterialCost[]
  moneyCost: number
}

export interface EquipmentAccessoryFusionRule {
  tier: EquipmentAccessoryTier
  fromQuality: Exclude<EquipmentAccessoryQuality, 'supreme'>
  toQuality: EquipmentAccessoryQuality
  successRate: number
  pityThreshold: number
}

export interface EquipmentAccessorySetBonusDef {
  familyId: EquipmentAccessoryFamilyId
  label: string
  description: string
  effects: EquipmentAccessoryEffectDef[]
}

export interface EquipmentAccessoryDismantleRule {
  tier: EquipmentAccessoryTier
  quality: EquipmentAccessoryQuality
  baseRefundItems: EquipmentAccessoryMaterialCost[]
}

export interface OwnedEquipmentAccessory {
  instanceId: string
  defId: EquipmentAccessorySlotId
  tier: EquipmentAccessoryTier
  quality: EquipmentAccessoryQuality
  level: number
  source: EquipmentAccessorySource
  locked?: boolean
  upgradeInvestment: EquipmentAccessoryUpgradeInvestment
  createdAtDayTag?: string
}

export type EquippedEquipmentAccessorySlots = Partial<Record<EquipmentAccessorySlotId, string | null>>

export type EquipmentAccessoryPityKey = `${EquipmentAccessorySlotId}:${EquipmentAccessoryTier}:${EquipmentAccessoryQuality}`

export type EquipmentAccessoryPityState = Partial<Record<EquipmentAccessoryPityKey, number>>

export interface EquipmentAccessoryDailyPurchaseState {
  dayTag: string
  purchased: Record<string, number>
}

export interface EquipmentAccessorySaveData {
  saveVersion: number
  ownedAccessories: OwnedEquipmentAccessory[]
  equippedSlots: EquippedEquipmentAccessorySlots
  unlockedBlueprints: EquipmentAccessoryTier[]
  fusionPityState: EquipmentAccessoryPityState
  dailyPurchaseState: EquipmentAccessoryDailyPurchaseState
  nextInstanceSeq: number
}

export interface EquipmentAccessorySetSummary {
  familyId: EquipmentAccessoryFamilyId
  label: string
  equippedCount: number
  setTier: EquipmentAccessoryTier | null
  setQuality: EquipmentAccessoryQuality | null
  averageLevel: number
  active: boolean
  effectValues: Partial<Record<EquipmentAccessoryEffectKey, number>>
}

export interface EquipmentAccessoryPreviewResult {
  success: boolean
  message: string
}
