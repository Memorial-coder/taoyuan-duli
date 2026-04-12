import type { Season } from './game'
import type { RewardTicketType } from './economy'
import type { ChestTier } from './item'

export type ShopCatalogPool = 'basic' | 'weekly' | 'seasonal' | 'premium'
export type ShopCatalogContentTier = 'P0' | 'P1' | 'P2'
export type ShopCatalogLuxuryCategory =
  | 'luxury_permit'
  | 'warehouse_service'
  | 'service_contract'
  | 'travel_supply'
  | 'festival_gift'
  | 'showcase_furniture'
  | 'functional_voucher'

export type ShopCatalogRefreshCycle = 'persistent' | 'weekly' | 'seasonal' | 'event'
export type ShopCatalogLinkedSystem = 'shop' | 'wallet' | 'inventory' | 'warehouse' | 'home' | 'decoration' | 'goal' | 'quest' | 'achievement' | 'market' | 'museum' | 'fishPond'
export type ShopCatalogPriceBand = 'entry' | 'mid' | 'high' | 'luxury' | 'prestige'
export type ShopCatalogServiceBillingCycle = 'one_off' | 'daily' | 'weekly' | 'seasonal'
export type ShopCatalogEntitlementStatus = 'inactive' | 'active' | 'expired' | 'consumed'

export type ShopCatalogWarehouseServiceType = 'chest_slot' | 'vault_charter' | 'sorting_service'
export type ShopCatalogTravelRouteTag = 'universal' | 'farming' | 'fishing' | 'mining' | 'festival'
export type ShopCatalogFestivalGiftLevel = 'standard' | 'deluxe' | 'collector'
export type ShopCatalogFurnitureDisplayZone = 'indoor' | 'courtyard' | 'festival' | 'museum'
export type ShopCatalogFunctionalVoucherType = 'inventory' | 'warehouse' | 'materials' | 'automation' | 'travel'
export type ShopCatalogServiceContractType = 'caravan_outsourcing' | 'museum_promotion' | 'research_assistant' | 'maintenance_support'

export type ShopCatalogEffect =
  | { type: 'unlock_decoration' }
  | { type: 'expand_inventory_extra'; amount: number }
  | { type: 'expand_warehouse'; amount: number }
  | { type: 'unlock_greenhouse' }
  | { type: 'grant_chest'; tier: ChestTier; label?: string }
  | { type: 'add_items'; items: { itemId: string; quantity: number }[] }
  | { type: 'activate_service_contract' }

export interface ShopCatalogPermitConfig {
  permitType: 'greenhouse' | 'luxury_access' | 'operation'
  targetSystem: 'home' | 'warehouse' | 'inventory' | 'decoration' | 'shop'
  billingCycle: ShopCatalogServiceBillingCycle
  durationDays?: number
  legacyOwnershipKey?: string
}

export interface ShopCatalogWarehouseServiceConfig {
  serviceType: ShopCatalogWarehouseServiceType
  capacityDelta?: number
  billingCycle: ShopCatalogServiceBillingCycle
  maxServiceLevel?: number
}

export interface ShopCatalogTravelSupplyConfig {
  routeTag: ShopCatalogTravelRouteTag
  recommendedSystems: ShopCatalogLinkedSystem[]
  tripDays?: number
  consumableCharges?: number
}

export interface ShopCatalogFestivalGiftConfig {
  season?: Season
  festivalTag: string
  giftLevel: ShopCatalogFestivalGiftLevel
  canRepeat?: boolean
}

export interface ShopCatalogFurnitureDisplayConfig {
  displayZone: ShopCatalogFurnitureDisplayZone
  displayScore?: number
  collectionTheme?: string
}

export interface ShopCatalogFunctionalVoucherConfig {
  voucherType: ShopCatalogFunctionalVoucherType
  charges?: number
  reusable?: boolean
  targetSystems: ShopCatalogLinkedSystem[]
}

export interface ShopCatalogServiceContractConfig {
  contractType: ShopCatalogServiceContractType
  billingCycle: ShopCatalogServiceBillingCycle
  effectSummary: string
  weeklyFee: number
  durationDays?: number
  autoRenew?: boolean
  targetSystems: ShopCatalogLinkedSystem[]
  ticketRewards?: Partial<Record<RewardTicketType, number>>
  moneyRewardMultiplier?: number
  reputationRewardMultiplier?: number
  flatReputationBonus?: number
  dailyQuestBoardBonus?: number
  museumVisitorBonusRate?: number
  museumDisplayRatingBonus?: number
  goalReputationFlatBonus?: number
  maintenanceCostRateReduction?: number
  fishPondDailyOutputBonus?: number
}

export interface ShopCatalogActivityOfferBundleDef {
  id: string
  campaignId: string
  label: string
  description: string
  unlockTier: ShopCatalogContentTier
  linkedThemeWeekIds?: string[]
  recommendedOfferIds: string[]
  linkedSystems: ShopCatalogLinkedSystem[]
}

export interface ShopCatalogOfferDef {
  id: string
  shopId: 'wanwupu'
  pool: ShopCatalogPool
  name: string
  description: string
  price: number
  onceOnly?: boolean
  unlockDiscoveryCount?: number
  seasonLimits?: Season[]
  tags?: string[]
  recommendationKey?: string
  recommendationPriority?: number
  recommendationReasonTemplate?: string
  weeklySpotlightWeight?: number
  uiBadge?: string
  contentTier: ShopCatalogContentTier
  luxuryCategory: ShopCatalogLuxuryCategory
  refreshCycle: ShopCatalogRefreshCycle
  linkedSystems: ShopCatalogLinkedSystem[]
  priceBand: ShopCatalogPriceBand
  serviceBillingCycle: ShopCatalogServiceBillingCycle
  decorationUnlockId?: string
  permitConfig?: ShopCatalogPermitConfig
  warehouseServiceConfig?: ShopCatalogWarehouseServiceConfig
  serviceContractConfig?: ShopCatalogServiceContractConfig
  travelSupplyConfig?: ShopCatalogTravelSupplyConfig
  festivalGiftConfig?: ShopCatalogFestivalGiftConfig
  furnitureDisplayConfig?: ShopCatalogFurnitureDisplayConfig
  functionalVoucherConfig?: ShopCatalogFunctionalVoucherConfig
  effect: ShopCatalogEffect
}

export interface ShopCatalogOfferInput extends Omit<ShopCatalogOfferDef, 'contentTier' | 'luxuryCategory' | 'refreshCycle' | 'linkedSystems' | 'priceBand' | 'serviceBillingCycle'> {
  contentTier?: ShopCatalogContentTier
  luxuryCategory?: ShopCatalogLuxuryCategory
  refreshCycle?: ShopCatalogRefreshCycle
  linkedSystems?: ShopCatalogLinkedSystem[]
  priceBand?: ShopCatalogPriceBand
  serviceBillingCycle?: ShopCatalogServiceBillingCycle
}

export interface ShopCatalogEntitlementState {
  offerId: string
  purchasedCount: number
  status: ShopCatalogEntitlementStatus
  activatedDayKey: string
  expiresDayKey: string
  lastPurchasedDayKey: string
  autoRenew?: boolean
  renewCount?: number
  totalFeesPaid?: number
}

export interface ShopCatalogCounterState {
  offerId: string
  purchasedCount: number
  lastPurchasedDayKey: string
  lastConsumedDayKey: string
}

export interface ShopCatalogOperationalMeta {
  lastProcessedDayKey: string
  lastWeeklyRefreshWeekId: string
  lastSeasonRefreshDayKey: string
}

export interface ShopCatalogExpansionState {
  saveVersion: number
  operationalMeta: ShopCatalogOperationalMeta
  luxuryPermitStates: Record<string, ShopCatalogEntitlementState>
  warehouseServiceStates: Record<string, ShopCatalogEntitlementState>
  serviceContractStates: Record<string, ShopCatalogEntitlementState>
  travelSupplyStates: Record<string, ShopCatalogCounterState>
  festivalGiftStates: Record<string, ShopCatalogCounterState>
  showcaseFurnitureStates: Record<string, ShopCatalogCounterState>
  functionalVoucherStates: Record<string, ShopCatalogCounterState>
}

export type ShopCatalogExpansionBucketKey = Exclude<keyof ShopCatalogExpansionState, 'saveVersion' | 'operationalMeta'>

export interface ShopCatalogOfferOperationalSummary {
  id: string
  name: string
  pool: ShopCatalogPool
  contentTier: ShopCatalogContentTier
  luxuryCategory: ShopCatalogLuxuryCategory
  price: number
  priceBand: ShopCatalogPriceBand
  serviceBillingCycle: ShopCatalogServiceBillingCycle
  linkedSystems: ShopCatalogLinkedSystem[]
  tags: string[]
  owned: boolean
  unlocked: boolean
  purchasedCount: number
  status: ShopCatalogEntitlementStatus
  activatedDayKey: string
  expiresDayKey: string
  lastPurchasedDayKey: string
  autoRenew: boolean
  renewCount: number
  totalFeesPaid: number
  canPurchase: boolean
  unlockHint: string
  limitHint: string
}

export interface ShopCatalogOverviewSummary {
  totalOffers: number
  unlockedOffers: number
  ownedOffers: number
  premiumOfferCount: number
  weeklyOfferCount: number
  repeatableOfferCount: number
  activeEntitlementCount: number
  activeServiceContractCount: number
  poolCounts: Record<ShopCatalogPool, number>
  tierCounts: Record<ShopCatalogContentTier, number>
  categoryCounts: Record<ShopCatalogLuxuryCategory, number>
}

export interface ShopCatalogDebugSnapshot {
  dayKey: string
  weekId: number
  ownedCatalogOfferIds: string[]
  recommendedOfferIds: string[]
  weeklyOfferIds: string[]
  premiumOfferIds: string[]
  overview: ShopCatalogOverviewSummary
  expansionState: ShopCatalogExpansionState
}

export interface ShopServiceContractSummary {
  offerId: string
  name: string
  contractType: ShopCatalogServiceContractType
  status: ShopCatalogEntitlementStatus
  weeklyFee: number
  effectSummary: string
  linkedSystems: ShopCatalogLinkedSystem[]
  activatedDayKey: string
  expiresDayKey: string
  autoRenew: boolean
  renewCount: number
  totalFeesPaid: number
  canPurchase: boolean
  canRenew: boolean
}
