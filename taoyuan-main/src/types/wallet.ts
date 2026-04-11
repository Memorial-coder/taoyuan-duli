export type WalletBuildType = 'legacy' | 'archetype'

export type WalletEffectModule = 'shop' | 'goal' | 'farming' | 'fishing' | 'mining' | 'cooking'

export type WalletArchetypeId = 'merchant' | 'artisan' | 'wanderer'

export type WalletGoalBiasKey = 'cashflow' | 'farming' | 'fishing' | 'mining' | 'cooking' | 'social' | 'discovery'

export type WalletShopId = 'wanwupu' | 'tiejiangpu' | 'yugupu' | 'yaopu' | 'chouduanzhuang' | 'jiuguan' | 'biaoju'

export type WalletCatalogPool = 'basic' | 'weekly' | 'seasonal' | 'premium'

export type WalletUnlockRequirementType =
  | 'none'
  | 'money_earned'
  | 'discoveries'
  | 'mine_floor'
  | 'fish_caught'
  | 'recipes_cooked'
  | 'friendly_npcs'

export interface WalletUnlockRequirement {
  type: WalletUnlockRequirementType
  value: number
  label: string
}

export interface WalletPassiveEffect {
  shopDiscount?: number
  shopDiscountByShopId?: Partial<Record<WalletShopId, number>>
  goalWeights?: Partial<Record<WalletGoalBiasKey, number>>
  catalogTagWeights?: Partial<Record<string, number>>
  catalogPoolWeights?: Partial<Record<WalletCatalogPool, number>>
}

export interface WalletItemDef {
  id: string
  name: string
  description: string
  effect: { type: string; value: number }
  unlockCondition: string
}

export interface WalletNodeDef {
  id: string
  name: string
  description: string
  modules: WalletEffectModule[]
  unlockRequirement: WalletUnlockRequirement
  effect: WalletPassiveEffect
}

export interface WalletArchetypeDef {
  id: WalletArchetypeId
  name: string
  title: string
  description: string
  unlockRequirement: WalletUnlockRequirement
  primaryModules: WalletEffectModule[]
  mainEffectText: string
  nodeUnlockText: string
  recommendedShops?: WalletShopId[]
  effect: WalletPassiveEffect
  nodes: WalletNodeDef[]
}