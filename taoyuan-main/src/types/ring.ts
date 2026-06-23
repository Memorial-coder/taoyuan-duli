import type { ForgeAffixRoll } from './forgeAffix'
import type { EquipmentQualityTier } from './item'

/** 装备效果类型（戒指、帽子、鞋子通用） */
export type EquipmentEffectType =
  | 'attack_bonus'
  | 'crit_rate_bonus'
  | 'defense_bonus'
  | 'vampiric'
  | 'max_hp_bonus'
  | 'stamina_reduction'
  | 'mining_stamina'
  | 'farming_stamina'
  | 'fishing_stamina'
  | 'crop_quality_bonus'
  | 'crop_growth_bonus'
  | 'fish_quality_bonus'
  | 'fishing_calm'
  | 'sell_price_bonus'
  | 'shop_discount'
  | 'gift_friendship'
  | 'monster_drop_bonus'
  | 'exp_bonus'
  | 'treasure_find'
  | 'ore_bonus'
  | 'luck'
  | 'travel_speed'
  | 'journey_stamina_reduction'
  | 'journey_scout_bonus'
  | 'journey_carry_bonus'
  | 'journey_hazard_resist'
  | 'journey_event_bonus'
  | 'camp_recovery_bonus'
  | 'boss_pressure_resist'
  | 'resource_find_bonus'
  | 'durability_bonus'
  | 'durability_consumption_reduction'

/** 兼容别名 */
export type RingEffectType = EquipmentEffectType

/** 单个装备效果 */
export interface EquipmentEffect {
  type: EquipmentEffectType
  value: number
}

/** 兼容别名 */
export type RingEffect = EquipmentEffect

/** 戒指定义（数据常量） */
export interface RingDef {
  id: string
  name: string
  description: string
  effects: RingEffect[]
  qualityTier: EquipmentQualityTier
  /** 合成配方（null = 不可合成） */
  recipe: { itemId: string; quantity: number }[] | null
  /** 合成所需铜钱 */
  recipeMoney: number
  /** 获取途径描述 */
  obtainSource: string
  /** 出售价格 */
  sellPrice: number
}

/** 拥有的戒指实例（存储用） */
export interface OwnedRing {
  defId: string
  enchantmentId?: string | null
  affixes?: ForgeAffixRoll[]
  /** 耐久 */
  durability?: number
  /** 坚固值：剩余可修理寿命 */
  sturdiness?: number
  durabilityWearProgress?: number
  /** 锁定后禁止出售 */
  locked?: boolean
}
