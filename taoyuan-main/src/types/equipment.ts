import type { EquipmentEffect } from './ring'
import type { EquipmentQualityTier } from './item'
import type { ForgeAffixRoll } from './forgeAffix'

/** 帽子定义 */
export interface HatDef {
  id: string
  name: string
  description: string
  qualityTier: EquipmentQualityTier
  effects: EquipmentEffect[]
  /** 商店购买价格（null = 不可购买，需合成） */
  shopPrice: number | null
  /** 合成配方（null = 不可合成） */
  recipe: { itemId: string; quantity: number }[] | null
  /** 合成所需铜钱 */
  recipeMoney: number
  /** 获取途径描述 */
  obtainSource: string
  /** 出售价格 */
  sellPrice: number
}

/** 拥有的帽子实例 */
export interface OwnedHat {
  defId: string
  enchantmentId?: string | null
  affixes?: ForgeAffixRoll[]
  /** 耐久 */
  durability?: number
  /** 锁定后禁止出售 */
  locked?: boolean
}

/** 鞋子定义 */
export interface ShoeDef {
  id: string
  name: string
  description: string
  qualityTier: EquipmentQualityTier
  effects: EquipmentEffect[]
  /** 商店购买价格（null = 不可购买，需合成） */
  shopPrice: number | null
  /** 合成配方（null = 不可合成） */
  recipe: { itemId: string; quantity: number }[] | null
  /** 合成所需铜钱 */
  recipeMoney: number
  /** 获取途径描述 */
  obtainSource: string
  /** 出售价格 */
  sellPrice: number
}

/** 拥有的鞋子实例 */
export interface OwnedShoe {
  defId: string
  enchantmentId?: string | null
  affixes?: ForgeAffixRoll[]
  /** 耐久 */
  durability?: number
  /** 锁定后禁止出售 */
  locked?: boolean
}
