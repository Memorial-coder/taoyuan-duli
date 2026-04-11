import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useSkillStore } from './useSkillStore'
import { useWalletStore } from './useWalletStore'
import { useHomeStore } from './useHomeStore'
import { useWarehouseStore } from './useWarehouseStore'
import { useNpcStore } from './useNpcStore'
import { useAchievementStore } from './useAchievementStore'
import { useGoalStore } from './useGoalStore'
import { getCropsBySeason, getItemById, getNpcById } from '@/data'
import { BAITS, TACKLES, FERTILIZERS } from '@/data/processing'
import { isTravelingMerchantDay, generateMerchantStock, TRAVELING_MERCHANT_POOL } from '@/data/travelingMerchant'
import { SHOP_CATALOG_OFFERS, SHOP_CATALOG_LUXURY_BASELINE_AUDIT, getWeeklyShopCatalogOffers, type ShopCatalogOfferDef } from '@/data/shopCatalog'
import { SHOP_NPC_RELATION_MAP } from '@/data/npcWorld'
import {
  createDefaultMarketDynamicsState,
  ECONOMY_SINK_CONTENT_DEFS,
  ECONOMY_TUNING_CONFIG,
  getMarketDynamicsPhaseConfig,
  getMarketMultiplier,
  MARKET_CATEGORY_NAMES,
  MARKET_DYNAMICS_CONFIG,
  type MarketCategory,
  type MarketDynamicsState,
  type MarketHotspotState,
  type MarketRegionalProcurementState,
  type SellRecordSource,
  type MarketSubstituteRewardState,
  type MarketThemeEncouragementState
} from '@/data/market'
import type { TravelingMerchantStock } from '@/data/travelingMerchant'
import type { PriceBreakdownEntry, PriceModifierStep, Quality, SellPriceBreakdown } from '@/types'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useDecorationStore } from './useDecorationStore'
/** 商铺商品项 */
export interface ShopItemEntry {
  itemId: string
  name: string
  price: number
  description: string
}

const getAbsoluteDay = (year: number, seasonIndex: number, day: number) => (year - 1) * 112 + seasonIndex * 28 + day
const QUALITY_PRICE_MULTIPLIERS: Record<Quality, number> = {
  normal: 1.0,
  fine: 1.25,
  excellent: 1.5,
  supreme: 2.0
}
const QUALITY_PRICE_LABELS: Record<Quality, string> = {
  normal: '普通',
  fine: '优质',
  excellent: '精品',
  supreme: '极品'
}

export const useShopStore = defineStore('shop', () => {
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const homeStore = useHomeStore()
  const warehouseStore = useWarehouseStore()
  const npcStore = useNpcStore()
  const achievementStore = useAchievementStore()

  const ownedCatalogOfferIds = ref<string[]>([])
  const marketDynamics = ref<MarketDynamicsState>(createDefaultMarketDynamicsState())

  const currentWeekId = computed(() => Math.floor((getAbsoluteDay(gameStore.year, gameStore.seasonIndex, gameStore.day) - 1) / 7))
  const basicCatalogOffers = computed(() => SHOP_CATALOG_OFFERS.filter(offer => offer.pool === 'basic'))
  const weeklyCatalogOffers = computed(() => getWeeklyShopCatalogOffers(currentWeekId.value))
  const seasonalCatalogOffers = computed(() =>
    SHOP_CATALOG_OFFERS.filter(offer => offer.pool === 'seasonal' && (!!offer.seasonLimits?.includes(gameStore.season) || false))
  )
  const premiumCatalogOffers = computed(() => SHOP_CATALOG_OFFERS.filter(offer => offer.pool === 'premium'))
  const weeklyCatalogRefreshText = computed(() => `第${currentWeekId.value + 1}周精选 · 每周一刷新`)
  const availableCatalogOffers = computed(() =>
    SHOP_CATALOG_OFFERS.filter(offer => offer.pool !== 'seasonal' || (!!offer.seasonLimits?.includes(gameStore.season) || false))
  )
  const recommendedCatalogOffers = computed(() => {
    const walletStore = useWalletStore()
    const goalStore = useGoalStore()
    const themeWeek = goalStore.currentThemeWeek
    const economyOverview = usePlayerStore().getEconomyOverview()
    const recommendedSinkSystems = new Set(
      ECONOMY_SINK_CONTENT_DEFS.filter(item => {
        if (economyOverview.currentSegment?.id === 'endgame_tycoon') return true
        if (economyOverview.currentSegment?.id === 'late_builder') return item.tier !== 'endgame_showcase'
        return item.tier === 'mid_transition'
      }).flatMap(item => item.linkedSystems)
    )
    return [...availableCatalogOffers.value]
      .map(offer => {
        const walletScore = walletStore.getCatalogOfferPreferenceScore(offer)
        const themeScore = (themeWeek?.recommendedCatalogTags ?? []).reduce((sum, tag) => {
          return sum + ((offer.tags ?? []).includes(tag) ? 2 : 0)
        }, 0)
        const sinkScore = [...recommendedSinkSystems].reduce((sum, system) => {
          if (system === 'shop' && (offer.tags ?? []).some(tag => ['功能商品', '材料包', '每周精选'].includes(tag))) return sum + ECONOMY_TUNING_CONFIG.catalogRecommendationScoreBonuses.shopSinkTagMatch
          if (system === 'market' && (offer.tags ?? []).some(tag => ['高价长期商品', '每周精选'].includes(tag))) return sum + ECONOMY_TUNING_CONFIG.catalogRecommendationScoreBonuses.marketSinkTagMatch
          if (system === 'quest' && (offer.tags ?? []).some(tag => ['功能商品', '渔具', '鱼塘'].includes(tag))) return sum + ECONOMY_TUNING_CONFIG.catalogRecommendationScoreBonuses.questSinkTagMatch
          return sum
        }, 0)
        return {
          offer,
          score: walletScore + themeScore + sinkScore
        }
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if ((b.offer.recommendationPriority ?? 0) !== (a.offer.recommendationPriority ?? 0)) {
          return (b.offer.recommendationPriority ?? 0) - (a.offer.recommendationPriority ?? 0)
        }
        if (a.offer.onceOnly !== b.offer.onceOnly) return a.offer.onceOnly ? -1 : 1
        return a.offer.price - b.offer.price
      })
      .slice(0, ECONOMY_TUNING_CONFIG.recommendedSinkCount)
      .map(entry => entry.offer)
  })

  const currentLuxuryAuditSegment = computed(() => {
    const economyOverview = playerStore.getEconomyOverview()
    return (
      [...SHOP_CATALOG_LUXURY_BASELINE_AUDIT.playerSegments]
        .reverse()
        .find(segment => playerStore.money >= segment.disposableMoneyMin && economyOverview.inflationPressure >= segment.inflationPressureMin) ??
      SHOP_CATALOG_LUXURY_BASELINE_AUDIT.playerSegments[0] ??
      null
    )
  })
  const luxuryCatalogBaselineAudit = SHOP_CATALOG_LUXURY_BASELINE_AUDIT

  const currentMarketDynamicsPhase = computed(() => getMarketDynamicsPhaseConfig(marketDynamics.value.activePhaseId))
  const activeMarketHotspots = computed(() => marketDynamics.value.hotspots)
  const activeMarketRegionalProcurements = computed(() => marketDynamics.value.regionalProcurements)
  const activeMarketSubstituteRewards = computed(() => marketDynamics.value.substituteRewards)
  const activeMarketThemeEncouragement = computed(() => marketDynamics.value.themeEncouragement)

  const normalizeMarketHotspotState = (entry: any): MarketHotspotState | null => {
    if (!entry || typeof entry !== 'object' || typeof entry.category !== 'string' || typeof entry.trend !== 'string') return null
    return {
      category: entry.category as MarketCategory,
      activatedDayKey: typeof entry.activatedDayKey === 'string' ? entry.activatedDayKey : '',
      expiresDayKey: typeof entry.expiresDayKey === 'string' ? entry.expiresDayKey : '',
      sourcePhaseId: typeof entry.sourcePhaseId === 'string' ? entry.sourcePhaseId : MARKET_DYNAMICS_CONFIG.defaultPhaseId,
      trend: entry.trend
    }
  }

  const normalizeMarketRegionalProcurementState = (entry: any): MarketRegionalProcurementState | null => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.districtId !== 'string') return null
    return {
      id: entry.id,
      districtId: entry.districtId,
      targetCategories: Array.isArray(entry.targetCategories) ? entry.targetCategories.filter((category: unknown) => typeof category === 'string') as MarketCategory[] : [],
      rewardMultiplier: Math.max(1, Number(entry.rewardMultiplier) || 1),
      startsDayKey: typeof entry.startsDayKey === 'string' ? entry.startsDayKey : '',
      expiresDayKey: typeof entry.expiresDayKey === 'string' ? entry.expiresDayKey : '',
      sourcePhaseId: typeof entry.sourcePhaseId === 'string' ? entry.sourcePhaseId : MARKET_DYNAMICS_CONFIG.defaultPhaseId,
      substituteRewardId: typeof entry.substituteRewardId === 'string' ? entry.substituteRewardId : undefined
    }
  }

  const normalizeMarketSubstituteRewardState = (entry: any): MarketSubstituteRewardState | null => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.fromCategory !== 'string' || typeof entry.toCategory !== 'string') return null
    return {
      id: entry.id,
      fromCategory: entry.fromCategory as MarketCategory,
      toCategory: entry.toCategory as MarketCategory,
      rewardType: typeof entry.rewardType === 'string' ? entry.rewardType : 'price_support',
      rewardValue: Math.max(0, Number(entry.rewardValue) || 0),
      expiresDayKey: typeof entry.expiresDayKey === 'string' ? entry.expiresDayKey : '',
      sourcePhaseId: typeof entry.sourcePhaseId === 'string' ? entry.sourcePhaseId : MARKET_DYNAMICS_CONFIG.defaultPhaseId
    }
  }

  const normalizeMarketThemeEncouragementState = (entry: any): MarketThemeEncouragementState | null => {
    if (!entry || typeof entry !== 'object' || typeof entry.themeWeekId !== 'string') return null
    return {
      themeWeekId: entry.themeWeekId,
      encouragedCategories: Array.isArray(entry.encouragedCategories) ? entry.encouragedCategories.filter((category: unknown) => typeof category === 'string') as MarketCategory[] : [],
      encouragedTags: Array.isArray(entry.encouragedTags) ? entry.encouragedTags.filter((tag: unknown) => typeof tag === 'string') : [],
      rewardMultiplier: Math.max(1, Number(entry.rewardMultiplier) || 1),
      sourcePhaseId: typeof entry.sourcePhaseId === 'string' ? entry.sourcePhaseId : MARKET_DYNAMICS_CONFIG.defaultPhaseId,
      substituteRewardIds: Array.isArray(entry.substituteRewardIds) ? entry.substituteRewardIds.filter((id: unknown) => typeof id === 'string') : []
    }
  }

  const deserializeMarketDynamics = (data: any): MarketDynamicsState => {
    const fallback = createDefaultMarketDynamicsState()
    return {
      saveVersion: Math.max(1, Number(data?.saveVersion) || fallback.saveVersion),
      activePhaseId: typeof data?.activePhaseId === 'string' ? data.activePhaseId : fallback.activePhaseId,
      lastRefreshDayKey: typeof data?.lastRefreshDayKey === 'string' ? data.lastRefreshDayKey : fallback.lastRefreshDayKey,
      hotspots: Array.isArray(data?.hotspots) ? data.hotspots.map(normalizeMarketHotspotState).filter((entry: MarketHotspotState | null): entry is MarketHotspotState => !!entry) : fallback.hotspots,
      categoryCooldowns: Object.fromEntries(
        Object.entries(data?.categoryCooldowns && typeof data.categoryCooldowns === 'object' ? data.categoryCooldowns : {}).flatMap(([category, entry]) => {
          if (!entry || typeof entry !== 'object' || typeof category !== 'string') return []
          return [[category, {
            category: category as MarketCategory,
            remainingDays: Math.max(0, Number((entry as any).remainingDays) || 0),
            source: typeof (entry as any).source === 'string' ? (entry as any).source : 'hotspot',
            lastTriggeredDayKey: typeof (entry as any).lastTriggeredDayKey === 'string' ? (entry as any).lastTriggeredDayKey : ''
          }]]
        })
      ) as MarketDynamicsState['categoryCooldowns'],
      regionalProcurements: Array.isArray(data?.regionalProcurements)
        ? data.regionalProcurements.map(normalizeMarketRegionalProcurementState).filter((entry: MarketRegionalProcurementState | null): entry is MarketRegionalProcurementState => !!entry)
        : fallback.regionalProcurements,
      overflowPenalties: Object.fromEntries(
        Object.entries(data?.overflowPenalties && typeof data.overflowPenalties === 'object' ? data.overflowPenalties : {}).flatMap(([category, entry]) => {
          if (!entry || typeof entry !== 'object' || typeof category !== 'string') return []
          return [[category, {
            category: category as MarketCategory,
            currentBandId: typeof (entry as any).currentBandId === 'string' ? (entry as any).currentBandId : '',
            streakDays: Math.max(0, Number((entry as any).streakDays) || 0),
            appliedMultiplier: Math.max(MARKET_DYNAMICS_CONFIG.overflowPenalty.gentleFloorMultiplier, Number((entry as any).appliedMultiplier) || 1),
            graceUnitsRemaining: Math.max(0, Number((entry as any).graceUnitsRemaining) || 0),
            lastTriggeredDayKey: typeof (entry as any).lastTriggeredDayKey === 'string' ? (entry as any).lastTriggeredDayKey : ''
          }]]
        })
      ) as MarketDynamicsState['overflowPenalties'],
      themeEncouragement: normalizeMarketThemeEncouragementState(data?.themeEncouragement),
      substituteRewards: Array.isArray(data?.substituteRewards)
        ? data.substituteRewards.map(normalizeMarketSubstituteRewardState).filter((entry: MarketSubstituteRewardState | null): entry is MarketSubstituteRewardState => !!entry)
        : fallback.substituteRewards
    }
  }

  const getCatalogOfferById = (offerId: string): ShopCatalogOfferDef | undefined => SHOP_CATALOG_OFFERS.find(offer => offer.id === offerId)
  const isCatalogOwned = (offerId: string): boolean => ownedCatalogOfferIds.value.includes(offerId)
  const isCatalogOfferUnlocked = (offerId: string): boolean => {
    const offer = getCatalogOfferById(offerId)
    if (!offer) return false
    return achievementStore.discoveredCount >= (offer.unlockDiscoveryCount ?? 0)
  }
  const weeklySurpriseOffer = computed(() => {
    const spotlightSorted = [...weeklyCatalogOffers.value].sort((a, b) => {
      if ((b.weeklySpotlightWeight ?? 0) !== (a.weeklySpotlightWeight ?? 0)) {
        return (b.weeklySpotlightWeight ?? 0) - (a.weeklySpotlightWeight ?? 0)
      }
      if ((b.recommendationPriority ?? 0) !== (a.recommendationPriority ?? 0)) {
        return (b.recommendationPriority ?? 0) - (a.recommendationPriority ?? 0)
      }
      return a.price - b.price
    })
    const preferred = spotlightSorted.find(offer => isCatalogOfferUnlocked(offer.id) && (!offer.onceOnly || !isCatalogOwned(offer.id)))
    return preferred ?? spotlightSorted[0] ?? null
  })
  const getCatalogOfferUnlockHint = (offerId: string): string => {
    const offer = getCatalogOfferById(offerId)
    if (!offer) return '商品不存在。'
    const required = offer.unlockDiscoveryCount ?? 0
    if (required <= 0) return ''
    const missing = Math.max(0, required - achievementStore.discoveredCount)
    return missing > 0 ? `需图鉴发现达到 ${required} 种（当前 ${achievementStore.discoveredCount}，还差 ${missing} 种）` : ''
  }
  const getCatalogOfferPreferenceReason = (offerId: string): string => {
    const offer = getCatalogOfferById(offerId)
    if (!offer) return ''
    const reasonParts: string[] = []
    const walletReason = useWalletStore().getCatalogOfferPreferenceReason(offer)
    if (walletReason) reasonParts.push(walletReason)

    const goalStore = useGoalStore()
    const currentThemeWeek = goalStore.currentThemeWeek
    const matchedThemeTags = (currentThemeWeek?.recommendedCatalogTags ?? []).filter(tag => (offer.tags ?? []).includes(tag))
    if (currentThemeWeek && matchedThemeTags.length > 0) {
      reasonParts.push(`契合本周主题「${currentThemeWeek.name}」`)
    }

    const matchedSink = goalStore.recommendedEconomySinks.find(item =>
      item.linkedSystems.includes('shop') && (offer.tags ?? []).some(tag => ['功能商品', '材料包', '每周精选', '高价长期商品'].includes(tag))
    )
    if (matchedSink) {
      reasonParts.push(`契合当前资金去向「${matchedSink.name}」`)
    }

    const context = reasonParts.join(' · ')
    if (offer.recommendationReasonTemplate) {
      return offer.recommendationReasonTemplate.replace('{context}', context || '当前经营节奏')
    }

    return context
  }

  const getCatalogOfferBadge = (offerId: string): string => {
    const offer = getCatalogOfferById(offerId)
    if (!offer) return ''
    return offer.uiBadge ?? ''
  }

  const getRelationshipDiscountRate = (shopId?: string | null): number => {
    const effectiveShopId = shopId ?? currentShopId.value
    if (!effectiveShopId) return 0
    const relationNpcId = SHOP_NPC_RELATION_MAP[effectiveShopId]
    if (!relationNpcId) return 0
    return npcStore.getShopDiscountBonus(relationNpcId)
  }

  const getDiscountRate = (shopId?: string | null): number => {
    const walletStore = useWalletStore()
    const walletDiscount = walletStore.getShopDiscount(shopId)
    const ringDiscount = inventoryStore.getRingEffectValue('shop_discount')
    const spiritDiscount = useHiddenNpcStore().getAbilityValue('hu_xian_1') / 100
    const relationshipDiscount = getRelationshipDiscountRate(shopId)
    const decorationDiscount = useDecorationStore().shopDiscountBonus / 100
    return 1 - (1 - walletDiscount) * (1 - ringDiscount) * (1 - spiritDiscount) * (1 - relationshipDiscount) * (1 - decorationDiscount)
  }

  const getDiscountBreakdown = (shopId?: string | null) => {
    const walletStore = useWalletStore()
    const effectiveShopId = shopId ?? currentShopId.value
    const relationNpcId = effectiveShopId ? SHOP_NPC_RELATION_MAP[effectiveShopId] : undefined
    return {
      walletDiscount: walletStore.getShopDiscount(effectiveShopId),
      ringDiscount: inventoryStore.getRingEffectValue('shop_discount'),
      spiritDiscount: useHiddenNpcStore().getAbilityValue('hu_xian_1') / 100,
      relationshipDiscount: getRelationshipDiscountRate(effectiveShopId),
      decorationDiscount: useDecorationStore().shopDiscountBonus / 100,
      relationshipNpcId: relationNpcId,
      relationshipNpcName: relationNpcId ? (getNpcById(relationNpcId)?.name ?? relationNpcId) : undefined,
      relationshipStageText: relationNpcId ? npcStore.getRelationshipStageText(relationNpcId) : undefined
    }
  }

  const canReceiveItemBundle = (items: { itemId: string; quantity: number }[]): boolean => {
    return inventoryStore.canAddItems(items.map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' })))
  }

  const canPurchaseCatalogOffer = (offerId: string): boolean => {
    const offer = getCatalogOfferById(offerId)
    if (!offer) return false
    if (!isCatalogOfferUnlocked(offerId)) return false
    if (offer.onceOnly && isCatalogOwned(offerId)) return false
    if (playerStore.money < applyDiscount(offer.price)) return false

    switch (offer.effect.type) {
      case 'unlock_decoration':
        return !isCatalogOwned(offerId)
      case 'expand_inventory_extra':
        return !offer.onceOnly || !isCatalogOwned(offerId)
      case 'expand_warehouse':
        return warehouseStore.maxChests + offer.effect.amount <= warehouseStore.MAX_CHESTS_CAP
      case 'unlock_greenhouse':
        return !homeStore.greenhouseUnlocked
      case 'grant_chest':
        return warehouseStore.chests.length < warehouseStore.maxChests
      case 'add_items':
        return canReceiveItemBundle(offer.effect.items)
      default:
        return false
    }
  }

  const purchaseCatalogOffer = (offerId: string): { success: boolean; message: string; spent?: number } => {
    const offer = getCatalogOfferById(offerId)
    if (!offer) return { success: false, message: '商品不存在。' }
    if (!canPurchaseCatalogOffer(offerId)) return { success: false, message: '当前条件下无法购买该商品。' }

    const totalCost = applyDiscount(offer.price)
    if (!playerStore.spendMoney(totalCost, 'shop')) return { success: false, message: '铜钱不足。' }

    const ownedSnapshot = [...ownedCatalogOfferIds.value]
    const inventorySnapshot = inventoryStore.serialize()
    const warehouseSnapshot = warehouseStore.serialize()
    const homeSnapshot = homeStore.serialize()

    let success = false
    switch (offer.effect.type) {
      case 'unlock_decoration':
        ownedCatalogOfferIds.value.push(offerId)
        success = true
        break
      case 'expand_inventory_extra': {
        for (let i = 0; i < offer.effect.amount; i++) {
          inventoryStore.expandCapacityExtra()
        }
        if (offer.onceOnly) ownedCatalogOfferIds.value.push(offerId)
        success = true
        break
      }
      case 'expand_warehouse': {
        if (warehouseStore.maxChests + offer.effect.amount > warehouseStore.MAX_CHESTS_CAP) {
          break
        }
        for (let i = 0; i < offer.effect.amount; i++) {
          if (!warehouseStore.expandMaxChests()) break
        }
        success = true
        if (success && offer.onceOnly) ownedCatalogOfferIds.value.push(offerId)
        break
      }
      case 'unlock_greenhouse':
        success = homeStore.unlockGreenhouseByPermit()
        if (success && offer.onceOnly) ownedCatalogOfferIds.value.push(offerId)
        break
      case 'grant_chest':
        success = warehouseStore.addChest(offer.effect.tier, offer.effect.label ?? offer.name)
        if (success && offer.onceOnly) ownedCatalogOfferIds.value.push(offerId)
        break
      case 'add_items':
        success = canReceiveItemBundle(offer.effect.items)
        if (success) {
          for (const reward of offer.effect.items) {
            if (!inventoryStore.addItemExact(reward.itemId, reward.quantity)) {
              success = false
              break
            }
          }
          if (offer.onceOnly) ownedCatalogOfferIds.value.push(offerId)
        }
        break
    }

    if (!success) {
      ownedCatalogOfferIds.value = ownedSnapshot
      inventoryStore.deserialize(inventorySnapshot)
      warehouseStore.deserialize(warehouseSnapshot)
      homeStore.deserialize(homeSnapshot)
      playerStore.earnMoney(totalCost, { countAsEarned: false, system: 'shop' })
      return { success: false, message: '购买失败，已自动退款。' }
    }

    return { success: true, message: `购入了${offer.name}。(-${totalCost}文)`, spent: totalCost }
  }

  // === 多商铺导航 ===

  /** 当前选中的商铺（null=商圈总览） */
  const currentShopId = ref<string | null>(null)

  // === 折扣系统 ===

  /** 计算折扣后的价格 */
  const applyDiscount = (price: number, shopId?: string | null): number => {
    return Math.floor(price * (1 - getDiscountRate(shopId)))
  }

  // === 万物铺 (陈伯) ===

  /** 当前季节可购买的种子 */
  const availableSeeds = computed(() => {
    return getCropsBySeason(gameStore.season)
      .filter(crop => crop.seedPrice > 0)
      .map(crop => ({
        seedId: crop.seedId,
        cropName: crop.name,
        price: crop.seedPrice,
        growthDays: crop.growthDays,
        sellPrice: crop.sellPrice,
        regrowth: crop.regrowth ?? false,
        regrowthDays: crop.regrowthDays,
        season: crop.season
      }))
  })

  /** 购买种子 */
  const buySeed = (seedId: string, quantity: number = 1): boolean => {
    const seed = availableSeeds.value.find(s => s.seedId === seedId)
    if (!seed) return false
    if (!inventoryStore.canAddItem(seedId, quantity)) return false
    const totalCost = applyDiscount(seed.price) * quantity
    if (!playerStore.spendMoney(totalCost)) return false
    if (!inventoryStore.addItemExact(seedId, quantity)) {
      playerStore.earnMoney(totalCost, { countAsEarned: false })
      return false
    }
    return true
  }

  // === 铁匠铺 (孙铁匠) ===

  const blacksmithItems = computed<ShopItemEntry[]>(() => [
    { itemId: 'copper_ore', name: '铜矿', price: 100, description: '矿洞中常见的铜矿' },
    { itemId: 'iron_ore', name: '铁矿', price: 200, description: '中层矿洞出产的铁矿' },
    { itemId: 'gold_ore', name: '金矿', price: 400, description: '深层矿洞出产的金矿' },
    { itemId: 'copper_bar', name: '铜锭', price: 300, description: '冶炼好的铜锭' },
    { itemId: 'iron_bar', name: '铁锭', price: 600, description: '冶炼好的铁锭' },
    { itemId: 'gold_bar', name: '金锭', price: 1200, description: '冶炼好的金锭' },
    { itemId: 'charcoal', name: '木炭', price: 100, description: '烧制的木炭' }
  ])

  // === 药铺 (林老) ===

  /** 可购买的肥料（shopPrice != null） */
  const shopFertilizers = computed(() =>
    FERTILIZERS.filter(f => f.shopPrice !== null).map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      price: f.shopPrice!
    }))
  )

  const apothecaryItems = computed<ShopItemEntry[]>(() => [
    { itemId: 'herb', name: '草药', price: 50, description: '山间野生的草药' },
    { itemId: 'ginseng', name: '人参', price: 600, description: '极其珍贵的野生人参' },
    { itemId: 'animal_medicine', name: '兽药', price: 150, description: '治疗生病的牲畜' },
    { itemId: 'premium_feed', name: '精饲料', price: 200, description: '提升动物心情和好感' },
    { itemId: 'nourishing_feed', name: '滋补饲料', price: 250, description: '加速动物产出' },
    { itemId: 'vitality_feed', name: '活力饲料', price: 300, description: '喂食必定治愈疾病' },
    { itemId: 'fish_feed', name: '鱼饲料', price: 30, description: '鱼塘专用饲料' },
    { itemId: 'water_purifier', name: '水质改良剂', price: 100, description: '改善鱼塘水质' }
  ])

  // === 渔具铺 (秋月) ===

  /** 可购买的鱼饵（shopPrice != null） */
  const shopBaits = computed(() =>
    BAITS.filter(b => b.shopPrice !== null).map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      price: b.shopPrice!
    }))
  )

  /** 可购买的浮漂（shopPrice != null） */
  const shopTackles = computed(() =>
    TACKLES.filter(t => t.shopPrice !== null).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.shopPrice!
    }))
  )

  /** 渔具铺其他商品 */
  const fishingShopItems = computed<ShopItemEntry[]>(() => [
    { itemId: 'crab_pot', name: '蟹笼', price: 1500, description: '放置在钓鱼地点，每日自动捕获水产（需鱼饵）' }
  ])

  // === 绸缎庄 (素素) ===

  const textileItems = computed<ShopItemEntry[]>(() => [
    { itemId: 'cloth', name: '布匹', price: 1200, description: '用羊毛纺织的布匹' },
    { itemId: 'silk_cloth', name: '丝绸', price: 500, description: '华美的丝绸' },
    { itemId: 'alpaca_cloth', name: '羊驼绒', price: 900, description: '极其柔软的羊驼绒布' },
    { itemId: 'felt', name: '毛毡', price: 600, description: '用兔毛压制的毛毡' },
    { itemId: 'silk_ribbon', name: '丝帕', price: 500, description: '精心绣制的丝帕' },
    { itemId: 'jade_ring', name: '翡翠戒指', price: 1500, description: '可以用来求婚' },
    { itemId: 'zhiji_jade', name: '知己玉佩', price: 1500, description: '赠予同性挚友可结为知己' },
    { itemId: 'pine_incense', name: '松香', price: 250, description: '清新的松香' },
    { itemId: 'camphor_incense', name: '樟脑香', price: 400, description: '提神醒脑' },
    { itemId: 'osmanthus_incense', name: '桂花香', price: 800, description: '馥郁的桂花香' }
  ])

  // === 酒馆 ===
  const tavernItems = computed<ShopItemEntry[]>(() => [
    { itemId: 'tavern_rice_wine', name: '桃源米酒', price: 180, description: '老掌柜自酿的清甜米酒，恢复体力 +20' },
    { itemId: 'tavern_plum_wine', name: '青梅酒', price: 320, description: '青梅酿制的酸甜果酒，恢复体力 +30' },
    { itemId: 'tavern_herbal_brew', name: '药草老酒', price: 580, description: '草药陈酿，恢复体力 +50、HP +25' },
    { itemId: 'tavern_snack_plate', name: '小食拼盘', price: 120, description: '花生豆干咸肉拼盘，恢复体力 +15' },
    { itemId: 'tavern_braised_pork', name: '酱猪蹄', price: 380, description: '慢火炖制香浓猪蹄，恢复体力 +40' },
    { itemId: 'tavern_premium_brew', name: '桃源特酿', price: 1200, description: '镇店之宝，恢复体力 +80、HP +40' }
  ])

  // === 通用购买/出售 ===

  /** 购买通用物品 */
  const buyItem = (itemId: string, price: number, quantity: number = 1): boolean => {
    if (!inventoryStore.canAddItem(itemId, quantity)) return false
    const totalCost = applyDiscount(price) * quantity
    if (!playerStore.spendMoney(totalCost)) return false
    if (!inventoryStore.addItemExact(itemId, quantity)) {
      playerStore.earnMoney(totalCost, { countAsEarned: false })
      return false
    }
    return true
  }

  /** 计算不含行情系数的基础售价 */
  const _basePrice = (itemId: string, quantity: number, quality: Quality): number => {
    const itemDef = getItemById(itemId)
    if (!itemDef) return 0
    let bonus = 1.0
    const farmSkill = skillStore.getSkill('farming')
    const fishSkill = skillStore.getSkill('fishing')
    const mineSkill = skillStore.getSkill('mining')
    if (itemDef.category === 'processed' && farmSkill.perk10 === 'artisan') bonus *= 1.25
    if (itemDef.category === 'crop' && farmSkill.perk5 === 'harvester') bonus *= 1.1
    if (itemDef.category === 'animal_product' && farmSkill.perk5 === 'rancher') bonus *= 1.2
    if (itemDef.category === 'fish' && fishSkill.perk5 === 'fisher') bonus *= 1.25
    if (itemDef.category === 'fish' && fishSkill.perk10 === 'aquaculture') bonus *= 1.5
    if (itemDef.category === 'fish' && gameStore.farmMapType === 'riverland') bonus *= 1.1
    if (itemDef.category === 'ore' && mineSkill.perk10 === 'blacksmith') bonus *= 1.5
    // perk15 售价加成
    if (itemDef.category === 'crop' && (farmSkill.perk15 === 'grandmaster_farmer' || farmSkill.perk15 === 'estate_owner')) bonus *= 1.2
    if (itemDef.category === 'processed' && (farmSkill.perk15 === 'grandmaster_farmer' || farmSkill.perk15 === 'estate_owner')) bonus *= 1.4
    if (itemDef.category === 'animal_product' && (farmSkill.perk15 === 'livestock_baron' || farmSkill.perk15 === 'animal_whisperer')) bonus *= 1.3
    if (itemDef.category === 'fish' && (fishSkill.perk15 === 'legendary_angler' || fishSkill.perk15 === 'aquatic_merchant')) bonus *= 1.3
    if (itemDef.category === 'ore' && (mineSkill.perk15 === 'vein_seeker' || mineSkill.perk15 === 'master_smith')) bonus *= 1.3
    // perk20 售价加成
    if (itemDef.category === 'crop' && (farmSkill.perk20 === 'deity_of_harvest' || farmSkill.perk20 === 'land_god')) bonus *= 1.5
    if (itemDef.category === 'processed' && (farmSkill.perk20 === 'deity_of_harvest' || farmSkill.perk20 === 'land_god')) bonus *= 1.5
    if (itemDef.category === 'animal_product' && (farmSkill.perk20 === 'beast_sovereign' || farmSkill.perk20 === 'nature_bond')) bonus *= 1.5
    if (itemDef.category === 'fish' && fishSkill.perk20 === 'ocean_trader') bonus *= 2.0
    else if (itemDef.category === 'fish' && fishSkill.perk20 === 'fish_god') bonus *= 1.5
    if (itemDef.category === 'ore' && mineSkill.perk20 === 'forge_god') bonus *= 3.0
    else if (itemDef.category === 'ore' && mineSkill.perk20 === 'earth_pulse') bonus *= 1.5
    const ringSelBonus = inventoryStore.getRingEffectValue('sell_price_bonus')
    // 仙缘结缘：狐仙出售加成
    const hiddenNpcStore = useHiddenNpcStore()
    const sellBonusData = hiddenNpcStore.getBondBonusByType('sell_bonus')
    const spiritSellBonus = sellBonusData?.type === 'sell_bonus' ? sellBonusData.percent / 100 : 0
    return Math.floor(itemDef.sellPrice * quantity * QUALITY_PRICE_MULTIPLIERS[quality] * bonus * (1 + ringSelBonus) * (1 + spiritSellBonus))
  }

  const buildSellPriceModifierSteps = (itemId: string, quality: Quality): PriceModifierStep[] => {
    const itemDef = getItemById(itemId)
    if (!itemDef) return []

    const farmSkill = skillStore.getSkill('farming')
    const fishSkill = skillStore.getSkill('fishing')
    const mineSkill = skillStore.getSkill('mining')
    const hiddenNpcStore = useHiddenNpcStore()
    const steps: PriceModifierStep[] = []
    const pushStep = (step: PriceModifierStep) => {
      if (Math.abs(step.multiplier - 1) < 0.0001) return
      steps.push(step)
    }

    pushStep({
      id: 'quality',
      label: `品质：${QUALITY_PRICE_LABELS[quality]}`,
      category: 'quality',
      multiplier: QUALITY_PRICE_MULTIPLIERS[quality],
      description: `品质倍率 ×${QUALITY_PRICE_MULTIPLIERS[quality].toFixed(2)}`
    })

    if (itemDef.category === 'processed' && farmSkill.perk10 === 'artisan') {
      pushStep({ id: 'farming_artisan', label: '技能：匠人', category: 'skill', multiplier: 1.25, description: '加工品售价 +25%' })
    }
    if (itemDef.category === 'crop' && farmSkill.perk5 === 'harvester') {
      pushStep({ id: 'farming_harvester', label: '技能：丰收者', category: 'skill', multiplier: 1.1, description: '作物售价 +10%' })
    }
    if (itemDef.category === 'animal_product' && farmSkill.perk5 === 'rancher') {
      pushStep({ id: 'farming_rancher', label: '技能：牧人', category: 'skill', multiplier: 1.2, description: '畜产品售价 +20%' })
    }
    if (itemDef.category === 'fish' && fishSkill.perk5 === 'fisher') {
      pushStep({ id: 'fishing_fisher', label: '技能：渔夫', category: 'skill', multiplier: 1.25, description: '鱼类售价 +25%' })
    }
    if (itemDef.category === 'fish' && fishSkill.perk10 === 'aquaculture') {
      pushStep({ id: 'fishing_aquaculture', label: '技能：水产商', category: 'skill', multiplier: 1.5, description: '鱼类售价 +50%' })
    }
    if (itemDef.category === 'fish' && gameStore.farmMapType === 'riverland') {
      pushStep({ id: 'riverland_bonus', label: '地形：溪流田庄', category: 'environment', multiplier: 1.1, description: '鱼类售价 +10%' })
    }
    if (itemDef.category === 'ore' && mineSkill.perk10 === 'blacksmith') {
      pushStep({ id: 'mining_blacksmith', label: '技能：铁匠', category: 'skill', multiplier: 1.5, description: '金属矿石售价 +50%' })
    }
    if (itemDef.category === 'crop' && (farmSkill.perk15 === 'grandmaster_farmer' || farmSkill.perk15 === 'estate_owner')) {
      pushStep({ id: 'farming_perk15_crop', label: '技能：高阶农耕', category: 'skill', multiplier: 1.2, description: '作物售价额外 +20%' })
    }
    if (itemDef.category === 'processed' && (farmSkill.perk15 === 'grandmaster_farmer' || farmSkill.perk15 === 'estate_owner')) {
      pushStep({ id: 'farming_perk15_processed', label: '技能：高阶加工', category: 'skill', multiplier: 1.4, description: '加工品售价额外 +40%' })
    }
    if (itemDef.category === 'animal_product' && (farmSkill.perk15 === 'livestock_baron' || farmSkill.perk15 === 'animal_whisperer')) {
      pushStep({ id: 'farming_perk15_animal', label: '技能：高阶牧养', category: 'skill', multiplier: 1.3, description: '畜产品售价额外 +30%' })
    }
    if (itemDef.category === 'fish' && (fishSkill.perk15 === 'legendary_angler' || fishSkill.perk15 === 'aquatic_merchant')) {
      pushStep({ id: 'fishing_perk15', label: '技能：高阶渔业', category: 'skill', multiplier: 1.3, description: '鱼类售价额外 +30%' })
    }
    if (itemDef.category === 'ore' && (mineSkill.perk15 === 'vein_seeker' || mineSkill.perk15 === 'master_smith')) {
      pushStep({ id: 'mining_perk15', label: '技能：高阶矿业', category: 'skill', multiplier: 1.3, description: '矿石售价额外 +30%' })
    }
    if (itemDef.category === 'crop' && (farmSkill.perk20 === 'deity_of_harvest' || farmSkill.perk20 === 'land_god')) {
      pushStep({ id: 'farming_perk20_crop', label: '技能：终阶农耕', category: 'skill', multiplier: 1.5, description: '作物售价额外 +50%' })
    }
    if (itemDef.category === 'processed' && (farmSkill.perk20 === 'deity_of_harvest' || farmSkill.perk20 === 'land_god')) {
      pushStep({ id: 'farming_perk20_processed', label: '技能：终阶加工', category: 'skill', multiplier: 1.5, description: '加工品售价额外 +50%' })
    }
    if (itemDef.category === 'animal_product' && (farmSkill.perk20 === 'beast_sovereign' || farmSkill.perk20 === 'nature_bond')) {
      pushStep({ id: 'farming_perk20_animal', label: '技能：终阶牧养', category: 'skill', multiplier: 1.5, description: '畜产品售价额外 +50%' })
    }
    if (itemDef.category === 'fish' && fishSkill.perk20 === 'ocean_trader') {
      pushStep({ id: 'fishing_perk20_ocean_trader', label: '技能：海洋贸易商', category: 'skill', multiplier: 2.0, description: '所有鱼售价 +100%' })
    } else if (itemDef.category === 'fish' && fishSkill.perk20 === 'fish_god') {
      pushStep({ id: 'fishing_perk20_fish_god', label: '技能：鱼神', category: 'skill', multiplier: 1.5, description: '鱼类售价额外 +50%' })
    }
    if (itemDef.category === 'ore' && mineSkill.perk20 === 'forge_god') {
      pushStep({ id: 'mining_perk20_forge_god', label: '技能：锻造之神', category: 'skill', multiplier: 3.0, description: '金属矿石售价 ×3' })
    } else if (itemDef.category === 'ore' && mineSkill.perk20 === 'earth_pulse') {
      pushStep({ id: 'mining_perk20_earth_pulse', label: '技能：大地脉动', category: 'skill', multiplier: 1.5, description: '矿石售价额外 +50%' })
    }

    const ringSellBonus = inventoryStore.getRingEffectValue('sell_price_bonus')
    pushStep({
      id: 'ring_sell_bonus',
      label: '装备：戒指售价加成',
      category: 'equipment',
      multiplier: 1 + ringSellBonus,
      description: `装备效果 +${Math.round(ringSellBonus * 100)}%`
    })

    const sellBonusData = hiddenNpcStore.getBondBonusByType('sell_bonus')
    const spiritSellBonus = sellBonusData?.type === 'sell_bonus' ? sellBonusData.percent / 100 : 0
    pushStep({
      id: 'bond_sell_bonus',
      label: '仙缘：售价加成',
      category: 'bond',
      multiplier: 1 + spiritSellBonus,
      description: `仙缘效果 +${Math.round(spiritSellBonus * 100)}%`
    })

    const recentVolume = getRecentShipping()[itemDef.category as MarketCategory] ?? 0
    const marketMultiplier = getMarketMultiplier(itemDef.category, gameStore.year, gameStore.seasonIndex, gameStore.day, recentVolume)
    pushStep({
      id: 'market_multiplier',
      label: `市场：${MARKET_CATEGORY_NAMES[itemDef.category as MarketCategory]}`,
      category: 'market',
      multiplier: marketMultiplier,
      description: `近7天同品类出货 ${recentVolume}，当前行情倍率 ×${marketMultiplier.toFixed(2)}`
    })

    return steps
  }

  const getSellPriceBreakdown = (itemId: string, quantity: number, quality: Quality): SellPriceBreakdown => {
    const itemDef = getItemById(itemId)
    if (!itemDef || quantity <= 0) {
      return {
        itemId,
        quantity,
        quality,
        baseUnitPrice: 0,
        baseTotal: 0,
        preMarketTotal: 0,
        finalTotal: 0,
        marketMultiplier: 1,
        steps: [],
        entries: []
      }
    }

    const steps = buildSellPriceModifierSteps(itemId, quality)
    const baseTotal = itemDef.sellPrice * quantity
    const entries: PriceBreakdownEntry[] = [
      {
        stepId: 'base_price',
        label: '基础售价',
        category: 'base',
        subtotal: baseTotal,
        description: `${itemDef.sellPrice}文 × ${quantity}`
      }
    ]

    let runningRaw = baseTotal
    const preMarketSteps = steps.filter(step => step.category !== 'market')
    const marketStep = steps.find(step => step.category === 'market') ?? null

    for (const step of preMarketSteps) {
      runningRaw *= step.multiplier
      entries.push({
        stepId: step.id,
        label: step.label,
        category: step.category,
        multiplier: step.multiplier,
        subtotal: Number(runningRaw.toFixed(2)),
        description: step.description
      })
    }

    const preMarketTotal = _basePrice(itemId, quantity, quality)
    entries.push({
      stepId: 'pre_market_total',
      label: '行情前小计',
      category: 'summary',
      subtotal: preMarketTotal,
      description: '基础价 × 品质 × 技能/装备/仙缘等倍率'
    })

    const finalTotal = marketStep ? Math.floor(preMarketTotal * marketStep.multiplier) : preMarketTotal
    if (marketStep) {
      entries.push({
        stepId: marketStep.id,
        label: marketStep.label,
        category: marketStep.category,
        multiplier: marketStep.multiplier,
        subtotal: finalTotal,
        description: marketStep.description
      })
    }

    return {
      itemId,
      quantity,
      quality,
      baseUnitPrice: itemDef.sellPrice,
      baseTotal,
      preMarketTotal,
      finalTotal,
      marketMultiplier: marketStep?.multiplier ?? 1,
      steps,
      entries
    }
  }

  /** 计算物品售价（不执行出售，用于估价） */
  const calculateSellPrice = (itemId: string, quantity: number, quality: Quality): number => {
    return getSellPriceBreakdown(itemId, quantity, quality).finalTotal
  }

  /** 计算不含行情的基础售价（用于显示原价） */
  const calculateBaseSellPrice = (itemId: string, quantity: number, quality: Quality): number => {
    return getSellPriceBreakdown(itemId, quantity, quality).preMarketTotal
  }

  const getCurrentShippingDayKey = (): string => `${gameStore.year}-${gameStore.seasonIndex}-${gameStore.day}`

  /** 统一记录出售后对市场历史的影响，避免卖店与出货箱分叉。 */
  const recordCompletedSale = (
    itemId: string,
    quantity: number,
    source: SellRecordSource,
    dayRecordOverride?: Record<string, number>
  ) => {
    const itemDef = getItemById(itemId)
    if (!itemDef || quantity <= 0) return

    const targetRecord = dayRecordOverride ?? { ...(shippingHistory.value[getCurrentShippingDayKey()] ?? {}) }
    targetRecord[itemDef.category] = (targetRecord[itemDef.category] ?? 0) + quantity

    if (source === 'shipping_box' && !shippedItems.value.includes(itemId)) {
      shippedItems.value.push(itemId)
    }

    if (!dayRecordOverride) {
      shippingHistory.value[getCurrentShippingDayKey()] = targetRecord
      _pruneShippingHistory()
    }
  }

  /** 出售物品，返回实际售价（0表示失败） */
  const sellItem = (itemId: string, quantity: number = 1, quality: Quality = 'normal'): number => {
    if (!inventoryStore.removeItem(itemId, quantity, quality)) return 0
    const totalPrice = calculateSellPrice(itemId, quantity, quality)
    playerStore.earnMoney(totalPrice)
    recordCompletedSale(itemId, quantity, 'direct_shop')
    return totalPrice
  }

  // === 旅行商人 ===

  const travelingStock = ref<TravelingMerchantStock[]>([])
  const travelingStockKey = ref('')

  const isMerchantHere = computed(() => isTravelingMerchantDay(gameStore.day))

  const refreshMerchantStock = () => {
    const key = `${gameStore.year}_${gameStore.seasonIndex}_${gameStore.day}`
    if (travelingStockKey.value === key) return
    travelingStock.value = generateMerchantStock(gameStore.year, gameStore.seasonIndex, gameStore.day, gameStore.season)
    // 仙缘能力：狐运（hu_xian_3）旅行商人多1件稀有品
    if (useHiddenNpcStore().isAbilityActive('hu_xian_3')) {
      const existingIds = new Set(travelingStock.value.map(s => s.itemId))
      const available = TRAVELING_MERCHANT_POOL.filter(p => !existingIds.has(p.itemId))
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)]!
        const def = getItemById(pick.itemId)
        let price = pick.basePrice
        if (def && def.sellPrice > 0) price = Math.max(price, def.sellPrice * 2)
        travelingStock.value.push({
          itemId: pick.itemId,
          name: pick.name,
          price,
          quantity: 1
        })
      }
    }
    travelingStockKey.value = key
  }

  const buyFromTraveler = (itemId: string): boolean => {
    const item = travelingStock.value.find(s => s.itemId === itemId)
    if (!item || item.quantity <= 0) return false
    if (!inventoryStore.canAddItem(itemId, 1)) return false
    const finalPrice = applyDiscount(item.price)
    if (!playerStore.spendMoney(finalPrice)) return false
    if (!inventoryStore.addItemExact(itemId)) {
      playerStore.earnMoney(finalPrice, { countAsEarned: false })
      return false
    }
    item.quantity--
    return true
  }

  // === 出货箱 ===

  /** 出货箱中的物品 */
  const shippingBox = ref<{ itemId: string; quantity: number; quality: Quality }[]>([])

  /** 添加物品到出货箱 */
  const addToShippingBox = (itemId: string, quantity: number, quality: Quality): boolean => {
    if (!inventoryStore.removeItem(itemId, quantity, quality)) return false
    const existing = shippingBox.value.find(s => s.itemId === itemId && s.quality === quality)
    if (existing) {
      existing.quantity += quantity
    } else {
      shippingBox.value.push({ itemId, quantity, quality })
    }
    return true
  }

  /** 从出货箱取回物品 */
  const removeFromShippingBox = (itemId: string, quantity: number, quality: Quality): boolean => {
    const idx = shippingBox.value.findIndex(s => s.itemId === itemId && s.quality === quality)
    if (idx === -1) return false
    const entry = shippingBox.value[idx]!
    if (entry.quantity < quantity) return false
    // 先计算背包可用空间，避免 addItem 部分添加的副作用
    const MAX_STACK = 999
    let space = 0
    for (const s of inventoryStore.items) {
      if (s.itemId === itemId && s.quality === quality && s.quantity < MAX_STACK) {
        space += MAX_STACK - s.quantity
      }
    }
    space += (inventoryStore.capacity - inventoryStore.items.length) * MAX_STACK
    const toTransfer = Math.min(quantity, space)
    if (toTransfer <= 0) return false
    if (!inventoryStore.canAddItem(itemId, toTransfer, quality)) return false
    // 先从出货箱移除，再精确添加到背包
    entry.quantity -= toTransfer
    if (entry.quantity <= 0) {
      shippingBox.value.splice(idx, 1)
    }
    return inventoryStore.addItemExact(itemId, toTransfer, quality)
  }

  /** 处理出货箱结算（日结时调用），返回总收入 */
  const processShippingBox = (): number => {
    let total = 0
    const dayKey = getCurrentShippingDayKey()
    const dayRecord: Record<string, number> = { ...(shippingHistory.value[dayKey] ?? {}) }
    for (const entry of shippingBox.value) {
      total += calculateSellPrice(entry.itemId, entry.quantity, entry.quality)
      recordCompletedSale(entry.itemId, entry.quantity, 'shipping_box', dayRecord)
    }
    shippingHistory.value[dayKey] = dayRecord
    _pruneShippingHistory()
    shippingBox.value = []
    return total
  }

  // === 出货收集 ===

  /** 已出货过的物品 ID 集合 */
  const shippedItems = ref<string[]>([])

  // === 出货历史（供需系数用） ===

  /** 近期出货记录：dayKey → { category → quantity } */
  const shippingHistory = ref<Record<string, Record<string, number>>>({})

  /** 将日期转为绝对天数（用于比较距离） */
  const _toAbsoluteDay = (year: number, seasonIndex: number, day: number): number => {
    return (year - 1) * 112 + seasonIndex * 28 + day
  }

  /** 清理超过7天的出货记录 */
  const _pruneShippingHistory = () => {
    const now = _toAbsoluteDay(gameStore.year, gameStore.seasonIndex, gameStore.day)
    const keys = Object.keys(shippingHistory.value)
    for (const key of keys) {
      const parts = key.split('-').map(Number)
      const abs = _toAbsoluteDay(parts[0]!, parts[1]!, parts[2]!)
      if (now - abs > 7) {
        delete shippingHistory.value[key]
      }
    }
  }

  /** 获取近7天各品类总出货量 */
  const getRecentShipping = (): Partial<Record<MarketCategory, number>> => {
    _pruneShippingHistory()
    const result: Partial<Record<MarketCategory, number>> = {}
    for (const record of Object.values(shippingHistory.value)) {
      for (const [cat, qty] of Object.entries(record)) {
        result[cat as MarketCategory] = (result[cat as MarketCategory] ?? 0) + qty
      }
    }
    return result
  }

  // === 序列化 ===

  const serialize = () => ({
    ownedCatalogOfferIds: ownedCatalogOfferIds.value,
    travelingStockKey: travelingStockKey.value,
    travelingStock: travelingStock.value,
    shippingBox: shippingBox.value,
    shippedItems: shippedItems.value,
    shippingHistory: shippingHistory.value,
    marketDynamics: marketDynamics.value
  })

  const deserialize = (data: any) => {
    const migrateRecipeId = (id: unknown) => {
      if (typeof id !== 'string') return id
      if (id === 'mill_fish_feed' || id === 'recycle_fish_feed') return 'fish_feed'
      return id
    }

    ownedCatalogOfferIds.value = Array.isArray(data?.ownedCatalogOfferIds) ? data.ownedCatalogOfferIds.filter((id: unknown) => typeof id === 'string') : []
    travelingStockKey.value = typeof data?.travelingStockKey === 'string' ? data.travelingStockKey : ''
    travelingStock.value = Array.isArray(data?.travelingStock)
      ? data.travelingStock
          .filter((entry: any) => entry && typeof entry.itemId === 'string')
          .map((entry: any) => ({
            itemId: migrateRecipeId(entry.itemId),
            name: typeof entry.name === 'string' ? entry.name : migrateRecipeId(entry.itemId),
            price: Math.max(0, Number(entry.price) || 0),
            quantity: Math.max(0, Number(entry.quantity) || 0)
          }))
      : []
    shippingBox.value = Array.isArray(data?.shippingBox)
      ? data.shippingBox
          .map((entry: any) => ({ ...entry, itemId: typeof entry?.itemId === 'string' ? migrateRecipeId(entry.itemId) : entry?.itemId }))
          .filter((entry: any) => entry && typeof entry.itemId === 'string' && !!getItemById(entry.itemId))
          .map((entry: any) => ({
            itemId: entry.itemId,
            quantity: Math.max(1, Number(entry.quantity) || 1),
            quality: ['normal', 'fine', 'excellent', 'supreme'].includes(entry.quality) ? entry.quality : 'normal'
          }))
      : []
    shippedItems.value = Array.isArray(data?.shippedItems) ? data.shippedItems.map(migrateRecipeId).filter((id: unknown) => typeof id === 'string') : []
    shippingHistory.value = Object.fromEntries(
      Object.entries(data?.shippingHistory && typeof data.shippingHistory === 'object' ? data.shippingHistory : {}).map(([dayKey, record]) => [
        dayKey,
        Object.fromEntries(
          Object.entries(record && typeof record === 'object' ? record : {})
            .filter(([category, quantity]) => typeof category === 'string' && Number(quantity) > 0)
            .map(([category, quantity]) => [category, Math.max(0, Number(quantity) || 0)])
        )
      ])
    )
    marketDynamics.value = deserializeMarketDynamics(data?.marketDynamics)
    currentShopId.value = null
  }

  return {
    // 导航
    currentShopId,
    // 折扣
    getRelationshipDiscountRate,
    getDiscountRate,
    getDiscountBreakdown,
    applyDiscount,
    // 万物铺
    availableSeeds,
    buySeed,
    currentWeekId,
    basicCatalogOffers,
    weeklyCatalogOffers,
    seasonalCatalogOffers,
    premiumCatalogOffers,
    luxuryCatalogBaselineAudit,
    currentLuxuryAuditSegment,
    weeklyCatalogRefreshText,
    recommendedCatalogOffers,
    weeklySurpriseOffer,
    isCatalogOwned,
    isCatalogOfferUnlocked,
    getCatalogOfferUnlockHint,
    getCatalogOfferBadge,
    getCatalogOfferPreferenceReason,
    canPurchaseCatalogOffer,
    purchaseCatalogOffer,
    marketDynamics,
    currentMarketDynamicsPhase,
    activeMarketHotspots,
    activeMarketRegionalProcurements,
    activeMarketSubstituteRewards,
    activeMarketThemeEncouragement,
    // 铁匠铺
    blacksmithItems,
    // 渔具铺
    shopBaits,
    shopTackles,
    fishingShopItems,
    // 药铺
    shopFertilizers,
    apothecaryItems,
    // 绸缎庄
    textileItems,
    // 酒馆
    tavernItems,
    // 通用
    buyItem,
    sellItem,
    calculateSellPrice,
    calculateBaseSellPrice,
    getSellPriceBreakdown,
    // 旅行商人
    travelingStock,
    isMerchantHere,
    refreshMerchantStock,
    buyFromTraveler,
    // 出货箱
    shippingBox,
    addToShippingBox,
    removeFromShippingBox,
    processShippingBox,
    // 出货收集
    shippedItems,
    // 行情供需
    getRecentShipping,
    // 序列化
    serialize,
    deserialize
  }
})
