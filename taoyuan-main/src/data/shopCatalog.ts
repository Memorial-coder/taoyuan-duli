import type {
  CompensationPlan,
  EconomyBaselineAuditConfig,
  QaCaseDef,
  ReleaseChecklistItem,
  ShopCatalogActivityOfferBundleDef,
  ShopCatalogContentTier,
  ShopCatalogCounterState,
  ShopCatalogEntitlementState,
  ShopCatalogExpansionState,
  ShopCatalogLinkedSystem,
  ShopCatalogLuxuryCategory,
  ShopCatalogOfferDef,
  ShopCatalogOfferInput,
  ShopCatalogPool,
  ShopCatalogPriceBand,
  ShopCatalogRefreshCycle
} from '@/types'

const inferCatalogTier = (price: number): ShopCatalogContentTier => {
  if (price >= 24000) return 'P2'
  if (price >= 8000) return 'P1'
  return 'P0'
}

const inferCatalogPriceBand = (price: number): ShopCatalogPriceBand => {
  if (price >= 38000) return 'prestige'
  if (price >= 18000) return 'luxury'
  if (price >= 8000) return 'high'
  if (price >= 2500) return 'mid'
  return 'entry'
}

const inferCatalogRefreshCycle = (pool: ShopCatalogOfferDef['pool']): ShopCatalogRefreshCycle => {
  if (pool === 'weekly') return 'weekly'
  if (pool === 'seasonal') return 'seasonal'
  return 'persistent'
}

const inferCatalogCategory = (input: ShopCatalogOfferInput): ShopCatalogLuxuryCategory => {
  const tags = input.tags ?? []
  if (input.effect.type === 'activate_service_contract' || input.serviceContractConfig) return 'service_contract'
  if (input.effect.type === 'unlock_greenhouse') return 'luxury_permit'
  if (input.effect.type === 'expand_warehouse' || input.effect.type === 'grant_chest') return 'warehouse_service'
  if (tags.some(tag => ['春季限定', '夏季限定', '秋季限定', '冬季限定', '每周精选'].includes(tag)) && tags.some(tag => ['装饰', '外观'].includes(tag))) {
    return 'festival_gift'
  }
  if (input.effect.type === 'unlock_decoration') return 'showcase_furniture'
  if (tags.some(tag => ['渔具', '鱼塘', '矿洞', '灌溉', '牧场', '补给'].includes(tag))) return 'travel_supply'
  return 'functional_voucher'
}

const inferCatalogLinkedSystems = (input: ShopCatalogOfferInput, category: ShopCatalogLuxuryCategory): ShopCatalogLinkedSystem[] => {
  const linkedSystems = new Set<ShopCatalogLinkedSystem>(['shop', 'wallet'])

  if (input.unlockDiscoveryCount != null && input.unlockDiscoveryCount > 0) linkedSystems.add('achievement')
  if (input.pool === 'weekly' || input.pool === 'seasonal') linkedSystems.add('goal')
  if (input.pool === 'premium') linkedSystems.add('market')

  switch (input.effect.type) {
    case 'expand_inventory_extra':
    case 'add_items':
      linkedSystems.add('inventory')
      break
    case 'expand_warehouse':
    case 'grant_chest':
      linkedSystems.add('warehouse')
      break
    case 'unlock_greenhouse':
      linkedSystems.add('home')
      break
    case 'unlock_decoration':
      linkedSystems.add('decoration')
      break
    case 'activate_service_contract':
      for (const system of input.serviceContractConfig?.targetSystems ?? []) {
        linkedSystems.add(system)
      }
      break
  }

  if (category === 'warehouse_service') linkedSystems.add('warehouse')
  if (category === 'service_contract') {
    for (const system of input.serviceContractConfig?.targetSystems ?? []) {
      linkedSystems.add(system)
    }
  }
  if (category === 'travel_supply' || category === 'functional_voucher') linkedSystems.add('inventory')
  if (category === 'showcase_furniture') linkedSystems.add('decoration')

  return [...linkedSystems]
}

export const WS10_ACTIVITY_OFFER_BUNDLES: ShopCatalogActivityOfferBundleDef[] = [
  {
    id: 'ws10_theme_rotation_bundle',
    campaignId: 'ws10_campaign_theme_rotation',
    label: '主题周承接包',
    description: '为主题周轮转活动预留推荐采购包，承接周目标、限时订单与活动邮件说明。',
    unlockTier: 'P0',
    linkedThemeWeekIds: ['spring_sowing', 'summer_fishing', 'autumn_processing', 'winter_mining'],
    recommendedOfferIds: ['weekly_inventory_bag', 'func_field_irrigation_pack', 'weekly_mining_supply'],
    linkedSystems: ['shop', 'goal', 'quest']
  },
  {
    id: 'ws10_supply_chain_bundle',
    campaignId: 'ws10_campaign_limited_supply',
    label: '限时供货补给包',
    description: '为限时供货活动预留目录推荐集合，承接中期活动单与运营说明。',
    unlockTier: 'P1',
    linkedThemeWeekIds: ['autumn_processing', 'late_sink_rotation'],
    recommendedOfferIds: ['func_builder_pack', 'autumn_harvest_pack', 'premium_warehouse_charter'],
    linkedSystems: ['shop', 'quest', 'market']
  },
  {
    id: 'ws10_world_milestone_bundle',
    campaignId: 'ws10_campaign_world_milestone',
    label: '终局活动编排包',
    description: '为全服共建、收尾邮件和终局展示活动预留高规格目录承接包。',
    unlockTier: 'P2',
    linkedThemeWeekIds: ['late_sink_rotation'],
    recommendedOfferIds: ['premium_warehouse_charter', 'weekly_pond_care_pack', 'func_angler_pack'],
    linkedSystems: ['shop', 'goal', 'quest', 'fishPond']
  }
] as const

const createShopCatalogOffer = (input: ShopCatalogOfferInput): ShopCatalogOfferDef => {
  const luxuryCategory = input.luxuryCategory ?? inferCatalogCategory(input)
  return {
    ...input,
    contentTier: input.contentTier ?? inferCatalogTier(input.price),
    luxuryCategory,
    refreshCycle: input.refreshCycle ?? inferCatalogRefreshCycle(input.pool),
    linkedSystems: input.linkedSystems ?? inferCatalogLinkedSystems(input, luxuryCategory),
    priceBand: input.priceBand ?? inferCatalogPriceBand(input.price),
    serviceBillingCycle:
      input.serviceBillingCycle ??
      input.permitConfig?.billingCycle ??
      input.warehouseServiceConfig?.billingCycle ??
      input.serviceContractConfig?.billingCycle ??
      'one_off'
  }
}

const normalizeEntitlementRecord = (record: unknown): Record<string, ShopCatalogEntitlementState> => {
  if (!record || typeof record !== 'object') return {}
  return Object.fromEntries(
    Object.entries(record as Record<string, unknown>).flatMap(([key, value]) => {
      if (!value || typeof value !== 'object') return []
      const entry = value as Record<string, unknown>
      return [[key, {
        offerId: typeof entry.offerId === 'string' ? entry.offerId : key,
        purchasedCount: Math.max(0, Number(entry.purchasedCount) || 0),
        status: ['inactive', 'active', 'expired', 'consumed'].includes(String(entry.status)) ? (entry.status as ShopCatalogEntitlementState['status']) : 'inactive',
        activatedDayKey: typeof entry.activatedDayKey === 'string' ? entry.activatedDayKey : '',
        expiresDayKey: typeof entry.expiresDayKey === 'string' ? entry.expiresDayKey : '',
        lastPurchasedDayKey: typeof entry.lastPurchasedDayKey === 'string' ? entry.lastPurchasedDayKey : '',
        autoRenew: typeof entry.autoRenew === 'boolean' ? entry.autoRenew : undefined,
        renewCount: Math.max(0, Number(entry.renewCount) || 0),
        totalFeesPaid: Math.max(0, Number(entry.totalFeesPaid) || 0)
      }]]
    })
  )
}

const normalizeCounterRecord = (record: unknown): Record<string, ShopCatalogCounterState> => {
  if (!record || typeof record !== 'object') return {}
  return Object.fromEntries(
    Object.entries(record as Record<string, unknown>).flatMap(([key, value]) => {
      if (!value || typeof value !== 'object') return []
      const entry = value as Record<string, unknown>
      return [[key, {
        offerId: typeof entry.offerId === 'string' ? entry.offerId : key,
        purchasedCount: Math.max(0, Number(entry.purchasedCount) || 0),
        lastPurchasedDayKey: typeof entry.lastPurchasedDayKey === 'string' ? entry.lastPurchasedDayKey : '',
        lastConsumedDayKey: typeof entry.lastConsumedDayKey === 'string' ? entry.lastConsumedDayKey : ''
      }]]
    })
  )
}

export const createDefaultShopCatalogExpansionState = (): ShopCatalogExpansionState => ({
  saveVersion: 1,
  operationalMeta: {
    lastProcessedDayKey: '',
    lastWeeklyRefreshWeekId: '',
    lastSeasonRefreshDayKey: ''
  },
  luxuryPermitStates: {},
  warehouseServiceStates: {},
  serviceContractStates: {},
  travelSupplyStates: {},
  festivalGiftStates: {},
  showcaseFurnitureStates: {},
  functionalVoucherStates: {}
})

export const normalizeShopCatalogExpansionState = (data: unknown): ShopCatalogExpansionState => {
  const fallback = createDefaultShopCatalogExpansionState()
  if (!data || typeof data !== 'object') return fallback
  const raw = data as Record<string, unknown>
  return {
    saveVersion: Math.max(1, Number(raw.saveVersion) || fallback.saveVersion),
    operationalMeta: {
      lastProcessedDayKey:
        raw.operationalMeta && typeof raw.operationalMeta === 'object' && typeof (raw.operationalMeta as Record<string, unknown>).lastProcessedDayKey === 'string'
          ? ((raw.operationalMeta as Record<string, unknown>).lastProcessedDayKey as string)
          : fallback.operationalMeta.lastProcessedDayKey,
      lastWeeklyRefreshWeekId:
        raw.operationalMeta && typeof raw.operationalMeta === 'object' && typeof (raw.operationalMeta as Record<string, unknown>).lastWeeklyRefreshWeekId === 'string'
          ? ((raw.operationalMeta as Record<string, unknown>).lastWeeklyRefreshWeekId as string)
          : fallback.operationalMeta.lastWeeklyRefreshWeekId,
      lastSeasonRefreshDayKey:
        raw.operationalMeta && typeof raw.operationalMeta === 'object' && typeof (raw.operationalMeta as Record<string, unknown>).lastSeasonRefreshDayKey === 'string'
          ? ((raw.operationalMeta as Record<string, unknown>).lastSeasonRefreshDayKey as string)
          : fallback.operationalMeta.lastSeasonRefreshDayKey
    },
    luxuryPermitStates: normalizeEntitlementRecord(raw.luxuryPermitStates),
    warehouseServiceStates: normalizeEntitlementRecord(raw.warehouseServiceStates),
    serviceContractStates: normalizeEntitlementRecord(raw.serviceContractStates),
    travelSupplyStates: normalizeCounterRecord(raw.travelSupplyStates),
    festivalGiftStates: normalizeCounterRecord(raw.festivalGiftStates),
    showcaseFurnitureStates: normalizeCounterRecord(raw.showcaseFurnitureStates),
    functionalVoucherStates: normalizeCounterRecord(raw.functionalVoucherStates)
  }
}

export const SHOP_CATALOG_TUNING_CONFIG = {
  poolEnabled: {
    basic: true,
    weekly: true,
    seasonal: true,
    premium: true
  } satisfies Record<ShopCatalogPool, boolean>,
  hiddenOfferIds: [] as string[],
  disabledLuxuryCategories: [] as ShopCatalogLuxuryCategory[],
  disabledPriceBands: [] as ShopCatalogPriceBand[],
  weeklySelectionCount: 4,
  seasonalDisplayLimit: 12,
  recommendationBoosts: {
    weeklySpotlightWeightFactor: 1,
    premiumPool: 1,
    serviceContract: 2,
    showcaseFurniture: 1,
    forcedOffer: 100
  },
  forcedRecommendedOfferIds: [] as string[],
  fallbackOfferIdsByPool: {
    basic: [],
    weekly: ['weekly_inventory_bag', 'weekly_pond_care_pack', 'weekly_chest_deed', 'weekly_mining_supply'],
    seasonal: ['spring_seed_bundle', 'summer_fishing_pack', 'autumn_harvest_pack', 'winter_warming_pack'],
    premium: ['premium_greenhouse_permit', 'premium_warehouse_charter', 'premium_courtyard_stage']
  } satisfies Record<ShopCatalogPool, string[]>
}

const BASIC_OFFERS: ShopCatalogOfferInput[] = [
  {
    id: 'decor_bamboo_screen',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '竹影屏风',
    description: '典雅的竹制屏风，适合收藏陈设。',
    price: 880,
    onceOnly: true,
    decorationUnlockId: 'catalog_bamboo_screen',
    tags: ['家具', '装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 10, collectionTheme: '雅居陈设' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'decor_tea_table',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '清茶小案',
    description: '一张适合摆茶具的小案几。',
    price: 760,
    onceOnly: true,
    decorationUnlockId: 'catalog_tea_table',
    tags: ['家具', '装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 8, collectionTheme: '茶室雅集' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'decor_clay_vase',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '素陶花瓶',
    description: '朴素沉静的陶瓶，适合摆在屋内。',
    price: 520,
    onceOnly: true,
    decorationUnlockId: 'catalog_clay_vase',
    tags: ['装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 6, collectionTheme: '素器珍玩' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'decor_stone_lantern',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '庭院石灯',
    description: '适合院子收藏的石灯摆件。',
    price: 1280,
    onceOnly: true,
    decorationUnlockId: 'catalog_stone_lantern',
    tags: ['院子摆件', '装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'courtyard', displayScore: 14, collectionTheme: '庭院夜景' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'decor_guest_wine_rack',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '迎宾酒架',
    description: '适合陈列果酒与宴席纪念品的小型酒架。',
    price: 1580,
    onceOnly: true,
    decorationUnlockId: 'catalog_guest_wine_rack',
    tags: ['家具', '装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 16, collectionTheme: '宴饮珍藏' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'func_silk_satchel',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '丝绸行囊',
    description: '扩充背包额外容量 +2。',
    price: 4200,
    onceOnly: true,
    tags: ['功能商品', '补给包'],
    recommendationKey: 'inventory',
    recommendationPriority: 2,
    recommendationReasonTemplate: '适合需要整理背包与稳定经营的阶段：{context}',
    uiBadge: '容量',
    functionalVoucherConfig: { voucherType: 'inventory', charges: 2, reusable: false, targetSystems: ['shop', 'inventory'] },
    effect: { type: 'expand_inventory_extra', amount: 2 }
  },
  {
    id: 'func_builder_pack',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '匠作材料包',
    description: '一套常用的建造材料。',
    price: 2400,
    tags: ['功能商品', '材料包', '补给包'],
    recommendationKey: 'builder_pack',
    recommendationPriority: 2,
    recommendationReasonTemplate: '适合补齐建造与加工材料：{context}',
    uiBadge: '材料包',
    functionalVoucherConfig: { voucherType: 'materials', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'wood', quantity: 80 }, { itemId: 'charcoal', quantity: 20 }] }
  },
  {
    id: 'func_angler_pack',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '渔具补给包',
    description: '适合中期钓鱼准备的补给。',
    price: 3200,
    tags: ['功能商品', '渔具', '补给包'],
    recommendationKey: 'angler_pack',
    recommendationPriority: 2,
    recommendationReasonTemplate: '适合外出钓鱼与鱼塘筹备：{context}',
    uiBadge: '补给',
    travelSupplyConfig: { routeTag: 'fishing', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 5, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'crab_pot', quantity: 1 }, { itemId: 'wild_bait', quantity: 15 }] }
  },
  {
    id: 'func_ranch_pack',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '牧场照料包',
    description: '给牲畜与鱼塘准备的照料物资。',
    price: 2600,
    tags: ['功能商品', '牧场', '补给包'],
    travelSupplyConfig: { routeTag: 'farming', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 5, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'animal_medicine', quantity: 2 }, { itemId: 'premium_feed', quantity: 4 }, { itemId: 'hay', quantity: 30 }] }
  },
  {
    id: 'func_field_irrigation_pack',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '田作灌溉包',
    description: '包含可直接摆放的喷灌器与基础肥料，适合快速扩田。',
    price: 4800,
    tags: ['功能商品', '灌溉', '补给包', '自动化'],
    functionalVoucherConfig: { voucherType: 'automation', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'home'] },
    travelSupplyConfig: { routeTag: 'farming', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'bamboo_sprinkler', quantity: 1 }, { itemId: 'basic_fertilizer', quantity: 8 }] }
  },
  {
    id: 'func_resin_tool_pack',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '林场采脂包',
    description: '适合建立树脂与林产线的工具包。',
    price: 3600,
    tags: ['功能商品', '采集', '材料包', '自动化'],
    functionalVoucherConfig: { voucherType: 'materials', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'tapper', quantity: 2 }, { itemId: 'wood', quantity: 30 }] }
  },
  {
    id: 'func_storehouse_manifest',
    shopId: 'wanwupu',
    pool: 'basic',
    name: '小库房整备册',
    description: '仓库箱位上限 +1，作为中期过渡的仓储扩容。',
    price: 5600,
    tags: ['功能商品', '仓储', '服务契约'],
    recommendationKey: 'storehouse_manifest',
    recommendationPriority: 3,
    recommendationReasonTemplate: '适合开始囤货、做订单与出货箱备货：{context}',
    uiBadge: '仓储',
    warehouseServiceConfig: { serviceType: 'chest_slot', capacityDelta: 1, billingCycle: 'one_off', maxServiceLevel: 1 },
    effect: { type: 'expand_warehouse', amount: 1 }
  }
]

const WEEKLY_OFFERS: ShopCatalogOfferInput[] = [
  {
    id: 'weekly_scholar_shelf',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '书香高架',
    description: '带有书卷气的高架家具。',
    price: 1680,
    onceOnly: true,
    decorationUnlockId: 'catalog_scholar_shelf',
    tags: ['每周精选', '装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 18, collectionTheme: '书香雅集' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'weekly_festival_lantern',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '彩绸灯笼',
    description: '节庆氛围十足的彩绸灯笼。',
    price: 1180,
    onceOnly: true,
    decorationUnlockId: 'catalog_festival_lantern',
    tags: ['每周精选', '装饰', '节庆', '收藏'],
    festivalGiftConfig: { festivalTag: 'weekly_fair', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'festival', displayScore: 14, collectionTheme: '市集灯会' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'weekly_travel_trunk',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '旅行大木箱',
    description: '赠送一个额外金箱，方便中期整理仓储。',
    price: 6800,
    tags: ['每周精选', '功能商品', '仓储', '补给包'],
    recommendationKey: 'travel_trunk',
    recommendationPriority: 3,
    recommendationReasonTemplate: '适合整理仓储与中期备货：{context}',
    weeklySpotlightWeight: 6,
    uiBadge: '周更惊喜',
    serviceBillingCycle: 'weekly',
    travelSupplyConfig: { routeTag: 'universal', recommendedSystems: ['shop', 'inventory', 'warehouse'], tripDays: 7, consumableCharges: 1 },
    warehouseServiceConfig: { serviceType: 'vault_charter', capacityDelta: 1, billingCycle: 'weekly', maxServiceLevel: 1 },
    effect: { type: 'grant_chest', tier: 'gold', label: '旅行木箱' }
  },
  {
    id: 'weekly_rain_kit',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '祈雨仪式包',
    description: '内含两枚雨图腾，适合集中经营。',
    price: 5400,
    tags: ['每周精选', '功能商品', '补给包'],
    recommendationKey: 'rain_kit',
    recommendationPriority: 2,
    recommendationReasonTemplate: '适合集中经营与天气规划：{context}',
    weeklySpotlightWeight: 4,
    uiBadge: '精选',
    travelSupplyConfig: { routeTag: 'farming', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 2 },
    effect: { type: 'add_items', items: [{ itemId: 'rain_totem', quantity: 2 }] }
  },
  {
    id: 'weekly_warehouse_deed',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '仓契扩建文书',
    description: '仓库箱位上限 +1。',
    price: 8800,
    tags: ['每周精选', '功能商品', '仓储', '服务契约'],
    recommendationKey: 'warehouse_expand',
    recommendationPriority: 3,
    recommendationReasonTemplate: '适合扩充仓储与长期囤货：{context}',
    weeklySpotlightWeight: 7,
    uiBadge: '扩建',
    serviceBillingCycle: 'weekly',
    warehouseServiceConfig: { serviceType: 'chest_slot', capacityDelta: 1, billingCycle: 'weekly', maxServiceLevel: 3 },
    effect: { type: 'expand_warehouse', amount: 1 }
  },
  {
    id: 'weekly_apothecary_box',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '百草收纳盒',
    description: '适合日常经营的药材补给。',
    price: 1800,
    unlockDiscoveryCount: 20,
    tags: ['每周精选', '功能商品', '材料包', '补给包'],
    recommendationKey: 'apothecary_box',
    recommendationPriority: 1,
    recommendationReasonTemplate: '适合日常药材补给与稳健经营：{context}',
    weeklySpotlightWeight: 3,
    uiBadge: '补给',
    functionalVoucherConfig: { voucherType: 'materials', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'herb', quantity: 6 }, { itemId: 'ginseng', quantity: 1 }] }
  },
  {
    id: 'weekly_irrigation_case',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '匠心灌溉箱',
    description: '包含铜制喷灌器与高级速生肥，适合中后期冲收益。',
    price: 9600,
    unlockDiscoveryCount: 40,
    tags: ['每周精选', '功能商品', '灌溉', '补给包', '自动化'],
    recommendationKey: 'irrigation_case',
    recommendationPriority: 4,
    recommendationReasonTemplate: '适合冲刺耕作收益与扩田效率：{context}',
    weeklySpotlightWeight: 8,
    uiBadge: '灌溉',
    functionalVoucherConfig: { voucherType: 'automation', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    travelSupplyConfig: { routeTag: 'farming', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'copper_sprinkler', quantity: 1 }, { itemId: 'deluxe_speed_gro', quantity: 6 }] }
  },
  {
    id: 'weekly_pond_care_pack',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '鱼塘养护包',
    description: '鱼塘与蟹笼经营常用补给。',
    price: 3200,
    tags: ['每周精选', '功能商品', '鱼塘', '补给包'],
    recommendationKey: 'pond_care',
    recommendationPriority: 3,
    recommendationReasonTemplate: '适合鱼塘养护与水产筹备：{context}',
    weeklySpotlightWeight: 7,
    uiBadge: '鱼塘',
    travelSupplyConfig: { routeTag: 'fishing', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'fish_feed', quantity: 20 }, { itemId: 'water_purifier', quantity: 4 }] }
  },
  {
    id: 'weekly_mining_supply',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '矿工补给箱',
    description: '深入矿洞前备好的物资包。',
    price: 4800,
    tags: ['每周精选', '功能商品', '矿洞', '材料包', '补给包'],
    recommendationKey: 'mining_supply',
    recommendationPriority: 3,
    recommendationReasonTemplate: '适合矿洞推进与补给准备：{context}',
    weeklySpotlightWeight: 8,
    uiBadge: '矿洞',
    travelSupplyConfig: { routeTag: 'mining', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'stone', quantity: 60 }, { itemId: 'copper_bar', quantity: 5 }, { itemId: 'iron_bar', quantity: 3 }] }
  },
  {
    id: 'weekly_tavern_gift',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '酒馆礼品篮',
    description: '来自醉桃源酒馆的精选礼品组合。',
    price: 2200,
    luxuryCategory: 'festival_gift',
    tags: ['每周精选', '功能商品', '节庆', '补给包'],
    recommendationKey: 'tavern_gift',
    recommendationPriority: 1,
    recommendationReasonTemplate: '适合外出前补给与轻度经营准备：{context}',
    weeklySpotlightWeight: 2,
    uiBadge: '轻补给',
    festivalGiftConfig: { festivalTag: 'tavern_feast', giftLevel: 'standard', canRepeat: true },
    effect: { type: 'add_items', items: [{ itemId: 'tavern_plum_wine', quantity: 2 }, { itemId: 'tavern_braised_pork', quantity: 1 }] }
  },
  {
    id: 'weekly_inventory_bag',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '竹编行囊',
    description: '扩充背包额外容量 +1。',
    price: 2400,
    onceOnly: false,
    unlockDiscoveryCount: 10,
    tags: ['每周精选', '功能商品', '补给包'],
    recommendationKey: 'inventory_bag',
    recommendationPriority: 4,
    recommendationReasonTemplate: '适合中前期扩容与频繁外出：{context}',
    weeklySpotlightWeight: 9,
    uiBadge: '容量',
    functionalVoucherConfig: { voucherType: 'inventory', charges: 1, reusable: false, targetSystems: ['shop', 'inventory'] },
    effect: { type: 'expand_inventory_extra', amount: 1 }
  },
  {
    id: 'weekly_chest_deed',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '仓契小文书',
    description: '仓库箱位上限 +1，随时入手。',
    price: 7200,
    tags: ['每周精选', '功能商品', '仓储', '服务契约'],
    recommendationKey: 'chest_deed',
    recommendationPriority: 2,
    recommendationReasonTemplate: '适合扩仓与整理物资：{context}',
    weeklySpotlightWeight: 5,
    uiBadge: '仓储',
    serviceBillingCycle: 'weekly',
    warehouseServiceConfig: { serviceType: 'chest_slot', capacityDelta: 1, billingCycle: 'weekly', maxServiceLevel: 2 },
    effect: { type: 'expand_warehouse', amount: 1 }
  },
  {
    id: 'weekly_showcase_flower_cart',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '花市巡游车',
    description: '节庆周常见的花车摆件，适合丰富家园陈列。',
    price: 4200,
    onceOnly: true,
    decorationUnlockId: 'catalog_flower_cart',
    tags: ['每周精选', '装饰', '节庆', '收藏'],
    weeklySpotlightWeight: 6,
    uiBadge: '节庆',
    festivalGiftConfig: { festivalTag: 'market_blossom', giftLevel: 'deluxe', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'festival', displayScore: 24, collectionTheme: '集市繁花' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'weekly_caravan_supply_crate',
    shopId: 'wanwupu',
    pool: 'weekly',
    name: '商队行装箱',
    description: '适合订单周与远行周的高价值周补给。',
    price: 7600,
    tags: ['每周精选', '功能商品', '材料包', '补给包', '仓储'],
    recommendationKey: 'caravan_supply_crate',
    recommendationPriority: 4,
    recommendationReasonTemplate: '适合为高价值订单与长线备货做准备：{context}',
    weeklySpotlightWeight: 8,
    uiBadge: '商队',
    travelSupplyConfig: { routeTag: 'universal', recommendedSystems: ['shop', 'inventory', 'warehouse', 'goal'], tripDays: 7, consumableCharges: 1 },
    functionalVoucherConfig: { voucherType: 'travel', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'warehouse', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'wood', quantity: 40 }, { itemId: 'charcoal', quantity: 15 }, { itemId: 'tavern_plum_wine', quantity: 2 }] }
  }
]

const SEASONAL_OFFERS: ShopCatalogOfferInput[] = [
  {
    id: 'spring_blossom_arch',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '花朝拱门',
    description: '春季限定花饰拱门。',
    price: 1880,
    onceOnly: true,
    seasonLimits: ['spring'],
    decorationUnlockId: 'catalog_blossom_arch',
    tags: ['春季限定', '装饰', '节庆', '收藏'],
    festivalGiftConfig: { season: 'spring', festivalTag: 'spring_blossom', giftLevel: 'collector', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'courtyard', displayScore: 26, collectionTheme: '春宴花朝' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'spring_willow_mat',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '柳纹地席',
    description: '带着春天气息的柳纹地席。',
    price: 920,
    onceOnly: true,
    seasonLimits: ['spring'],
    tags: ['春季限定', '外观', '节庆'],
    festivalGiftConfig: { season: 'spring', festivalTag: 'spring_picnic', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 9, collectionTheme: '春溪席地' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'spring_peach_scroll',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '桃花挂轴',
    description: '轻柔雅致的桃花挂轴。',
    price: 960,
    onceOnly: true,
    seasonLimits: ['spring'],
    tags: ['春季限定', '外观', '收藏'],
    festivalGiftConfig: { season: 'spring', festivalTag: 'spring_blossom', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 11, collectionTheme: '春宴花朝' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'summer_lotus_lamp',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '荷灯摆台',
    description: '夏夜荷灯造型摆台。',
    price: 1180,
    onceOnly: true,
    seasonLimits: ['summer'],
    tags: ['夏季限定', '装饰', '节庆', '收藏'],
    festivalGiftConfig: { season: 'summer', festivalTag: 'summer_lotus', giftLevel: 'deluxe', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'festival', displayScore: 15, collectionTheme: '荷风夜宴' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'summer_cool_bench',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '纳凉石凳',
    description: '适合院子纳凉的石凳组合。',
    price: 1440,
    onceOnly: true,
    seasonLimits: ['summer'],
    tags: ['夏季限定', '院子摆件', '装饰'],
    festivalGiftConfig: { season: 'summer', festivalTag: 'summer_garden', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'courtyard', displayScore: 16, collectionTheme: '荷风庭院' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'summer_bamboo_blind',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '青竹帘影',
    description: '夏日风格的竹帘收藏品。',
    price: 980,
    onceOnly: true,
    seasonLimits: ['summer'],
    tags: ['夏季限定', '外观', '收藏'],
    festivalGiftConfig: { season: 'summer', festivalTag: 'summer_cool', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 10, collectionTheme: '纳凉竹影' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'autumn_maple_screen',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '枫纹屏风',
    description: '秋意浓郁的枫纹屏风。',
    price: 1680,
    onceOnly: true,
    seasonLimits: ['autumn'],
    tags: ['秋季限定', '装饰', '收藏'],
    festivalGiftConfig: { season: 'autumn', festivalTag: 'autumn_maple', giftLevel: 'deluxe', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 20, collectionTheme: '秋山晚照' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'autumn_harvest_banner',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '丰收旗幡',
    description: '庆贺秋收的旗幡摆件。',
    price: 1260,
    onceOnly: true,
    seasonLimits: ['autumn'],
    tags: ['秋季限定', '装饰', '节庆'],
    festivalGiftConfig: { season: 'autumn', festivalTag: 'harvest_fair', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'festival', displayScore: 14, collectionTheme: '秋收庆典' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'autumn_moon_set',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '望月案设',
    description: '适合中秋风格收藏的案设。',
    price: 1760,
    onceOnly: true,
    seasonLimits: ['autumn'],
    tags: ['秋季限定', '外观', '节庆', '收藏'],
    festivalGiftConfig: { season: 'autumn', festivalTag: 'mid_autumn', giftLevel: 'collector', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'festival', displayScore: 22, collectionTheme: '月下清赏' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'winter_brazier',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '暖炭火盆',
    description: '冬日限定火盆摆件。',
    price: 1580,
    onceOnly: true,
    seasonLimits: ['winter'],
    tags: ['冬季限定', '装饰', '节庆'],
    festivalGiftConfig: { season: 'winter', festivalTag: 'winter_hearth', giftLevel: 'deluxe', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'festival', displayScore: 18, collectionTheme: '围炉雅集' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'winter_plum_frame',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '寒梅窗框',
    description: '点缀冬景的寒梅窗框。',
    price: 980,
    onceOnly: true,
    seasonLimits: ['winter'],
    tags: ['冬季限定', '外观', '收藏'],
    festivalGiftConfig: { season: 'winter', festivalTag: 'winter_plum', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 12, collectionTheme: '雪窗寒梅' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'winter_incense_stand',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '梅雪香座',
    description: '带有冬日氛围的香座摆件。',
    price: 1120,
    onceOnly: true,
    seasonLimits: ['winter'],
    tags: ['冬季限定', '外观', '收藏'],
    festivalGiftConfig: { season: 'winter', festivalTag: 'winter_plum', giftLevel: 'standard', canRepeat: false },
    furnitureDisplayConfig: { displayZone: 'indoor', displayScore: 13, collectionTheme: '雪窗寒梅' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'spring_seed_bundle',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '春耕种子礼包',
    description: '春季限定：含茶苗、水蜜桃、蚕豆种子各5份。',
    price: 720,
    seasonLimits: ['spring'],
    tags: ['春季限定', '功能商品', '材料包', '补给包'],
    functionalVoucherConfig: { voucherType: 'materials', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: {
      type: 'add_items',
      items: [
        { itemId: 'seed_tea', quantity: 5 },
        { itemId: 'seed_peach', quantity: 5 },
        { itemId: 'seed_broad_bean', quantity: 5 }
      ]
    }
  },
  {
    id: 'summer_fishing_pack',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '夏钓补给包',
    description: '夏季限定：含高级鱼饵与魔法鱼饵各一批。',
    price: 2800,
    seasonLimits: ['summer'],
    tags: ['夏季限定', '功能商品', '渔具', '补给包'],
    travelSupplyConfig: { routeTag: 'fishing', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    functionalVoucherConfig: { voucherType: 'travel', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'wild_bait', quantity: 10 }, { itemId: 'magic_bait', quantity: 3 }] }
  },
  {
    id: 'autumn_harvest_pack',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '秋收丰收包',
    description: '秋季限定：含速生肥与保质土壤，助力最后一波收成。',
    price: 3200,
    seasonLimits: ['autumn'],
    tags: ['秋季限定', '功能商品', '灌溉', '补给包'],
    travelSupplyConfig: { routeTag: 'farming', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    functionalVoucherConfig: { voucherType: 'automation', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'deluxe_speed_gro', quantity: 8 }, { itemId: 'quality_retaining_soil', quantity: 8 }] }
  },
  {
    id: 'winter_warming_pack',
    shopId: 'wanwupu',
    pool: 'seasonal',
    name: '冬藏备用包',
    description: '冬季限定：含木炭与精饲料，安稳度过冬天。',
    price: 2400,
    seasonLimits: ['winter'],
    tags: ['冬季限定', '功能商品', '牧场', '补给包'],
    travelSupplyConfig: { routeTag: 'universal', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 7, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'charcoal', quantity: 30 }, { itemId: 'premium_feed', quantity: 10 }] }
  }
]

const PREMIUM_OFFERS: ShopCatalogOfferInput[] = [
  {
    id: 'premium_grand_satchel',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '锦纹大行囊',
    description: '背包额外容量 +4，适合作为长期投资。',
    price: 18000,
    onceOnly: true,
    tags: ['高价长期商品', '补给包'],
    functionalVoucherConfig: { voucherType: 'inventory', charges: 4, reusable: false, targetSystems: ['shop', 'inventory'] },
    effect: { type: 'expand_inventory_extra', amount: 4 }
  },
  {
    id: 'premium_greenhouse_permit',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '温室特许状',
    description: '直接解锁温室，无需再提交材料。',
    price: 48000,
    onceOnly: true,
    unlockDiscoveryCount: 80,
    tags: ['高价长期商品', '稀有建筑', '服务契约'],
    permitConfig: { permitType: 'greenhouse', targetSystem: 'home', billingCycle: 'one_off', legacyOwnershipKey: 'greenhouseUnlocked' },
    effect: { type: 'unlock_greenhouse' }
  },
  {
    id: 'premium_void_contract',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '虚空箱契约',
    description: '额外获得一个虚空箱，用于高级仓储管理。',
    price: 26000,
    tags: ['高价长期商品', '特殊箱子', '仓储', '服务契约'],
    warehouseServiceConfig: { serviceType: 'vault_charter', capacityDelta: 1, billingCycle: 'one_off', maxServiceLevel: 4 },
    effect: { type: 'grant_chest', tier: 'void', label: '虚空箱' }
  },
  {
    id: 'premium_warehouse_charter',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '府库扩建札记',
    description: '仓库箱位上限 +2，适合大规模经营。',
    price: 22000,
    tags: ['高价长期商品', '仓储', '服务契约'],
    warehouseServiceConfig: { serviceType: 'vault_charter', capacityDelta: 2, billingCycle: 'one_off', maxServiceLevel: 5 },
    effect: { type: 'expand_warehouse', amount: 2 }
  },
  {
    id: 'premium_master_irrigation_set',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '金衡灌溉套组',
    description: '一组金制喷灌器，适合作为高价长期经营投资。',
    price: 36000,
    tags: ['高价长期商品', '自动化', '灌溉', '补给包'],
    functionalVoucherConfig: { voucherType: 'automation', charges: 2, reusable: false, targetSystems: ['shop', 'inventory', 'home'] },
    effect: { type: 'add_items', items: [{ itemId: 'gold_sprinkler', quantity: 2 }, { itemId: 'quality_retaining_soil', quantity: 8 }] }
  },
  {
    id: 'premium_resin_workshop',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '林业采脂工坊',
    description: '直接建立一套树脂采集线。',
    price: 24000,
    tags: ['高价长期商品', '自动化', '材料包'],
    functionalVoucherConfig: { voucherType: 'automation', charges: 1, reusable: false, targetSystems: ['shop', 'inventory', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'tapper', quantity: 4 }, { itemId: 'camphor_seed', quantity: 4 }] }
  },
  {
    id: 'premium_golden_frame',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '金鲤头像框',
    description: '象征财富与收获的高价收藏外观。',
    price: 12800,
    onceOnly: true,
    tags: ['高价长期商品', '头像框', '收藏'],
    furnitureDisplayConfig: { displayZone: 'museum', displayScore: 30, collectionTheme: '鎏金珍玩' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'premium_ranch_starter',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '牧场启动套组',
    description: '一次性配齐牧场中期所需物资。',
    price: 28000,
    tags: ['高价长期商品', '牧场', '补给包'],
    travelSupplyConfig: { routeTag: 'farming', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 14, consumableCharges: 1 },
    effect: { type: 'add_items', items: [{ itemId: 'premium_feed', quantity: 20 }, { itemId: 'nourishing_feed', quantity: 10 }, { itemId: 'animal_medicine', quantity: 5 }, { itemId: 'hay', quantity: 60 }] }
  },
  {
    id: 'premium_angler_elite',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '垂钓大师礼盒',
    description: '高端钓鱼装备一次配齐，含魔法鱼饵与豪华鱼饵。',
    price: 32000,
    unlockDiscoveryCount: 60,
    tags: ['高价长期商品', '渔具', '补给包'],
    travelSupplyConfig: { routeTag: 'fishing', recommendedSystems: ['shop', 'inventory', 'goal'], tripDays: 14, consumableCharges: 2 },
    effect: { type: 'add_items', items: [{ itemId: 'magic_bait', quantity: 10 }, { itemId: 'deluxe_bait', quantity: 5 }, { itemId: 'targeted_bait', quantity: 3 }] }
  },
  {
    id: 'premium_warehouse_expansion_xl',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '大府库扩建契约',
    description: '仓库箱位上限 +3，适合后期大仓储布局。',
    price: 38000,
    tags: ['高价长期商品', '仓储', '服务契约'],
    warehouseServiceConfig: { serviceType: 'chest_slot', capacityDelta: 3, billingCycle: 'one_off', maxServiceLevel: 6 },
    effect: { type: 'expand_warehouse', amount: 3 }
  },
  {
    id: 'premium_inventory_xl',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '御制宝囊',
    description: '背包额外容量 +6，极限扩充携带上限。',
    price: 42000,
    onceOnly: true,
    tags: ['高价长期商品', '补给包'],
    functionalVoucherConfig: { voucherType: 'inventory', charges: 6, reusable: false, targetSystems: ['shop', 'inventory'] },
    effect: { type: 'expand_inventory_extra', amount: 6 }
  },
  {
    id: 'premium_midautumn_banquet',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '金阙月宴礼盒',
    description: '面向高资金玩家的节庆礼盒，兼顾展示感与即时回报。',
    price: 18000,
    luxuryCategory: 'festival_gift',
    tags: ['高价长期商品', '节庆', '收藏'],
    festivalGiftConfig: { festivalTag: 'imperial_banquet', giftLevel: 'collector', canRepeat: true },
    effect: { type: 'add_items', items: [{ itemId: 'tavern_premium_brew', quantity: 1 }, { itemId: 'tavern_plum_wine', quantity: 2 }, { itemId: 'tavern_braised_pork', quantity: 2 }] }
  },
  {
    id: 'premium_courtyard_stage',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '绮彩堂台',
    description: '用于终局家园展示的高价舞台摆设。',
    price: 26000,
    onceOnly: true,
    decorationUnlockId: 'catalog_courtyard_stage',
    tags: ['高价长期商品', '装饰', '收藏'],
    furnitureDisplayConfig: { displayZone: 'courtyard', displayScore: 36, collectionTheme: '终局陈演' },
    effect: { type: 'unlock_decoration' }
  },
  {
    id: 'premium_expedition_cache',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '远征储备库',
    description: '专供矿洞与长线订单使用的高价远行储备。',
    price: 34000,
    tags: ['高价长期商品', '矿洞', '补给包', '仓储'],
    travelSupplyConfig: { routeTag: 'mining', recommendedSystems: ['shop', 'inventory', 'warehouse', 'goal'], tripDays: 14, consumableCharges: 2 },
    functionalVoucherConfig: { voucherType: 'travel', charges: 2, reusable: false, targetSystems: ['shop', 'inventory', 'warehouse', 'goal'] },
    effect: { type: 'add_items', items: [{ itemId: 'copper_bar', quantity: 10 }, { itemId: 'iron_bar', quantity: 8 }, { itemId: 'charcoal', quantity: 50 }] }
  },
  {
    id: 'premium_caravan_service_contract',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '商路外包总契',
    description: '签下长期商路外包合同，持续为后期经营提供额外委托量与商路票回流。',
    price: 18000,
    tags: ['高价长期商品', '服务契约', '商路委托'],
    recommendationKey: 'caravan_service_contract',
    recommendationPriority: 5,
    recommendationReasonTemplate: '适合把富余现金继续压入委托循环：{context}',
    uiBadge: '服务合同',
    serviceContractConfig: {
      contractType: 'caravan_outsourcing',
      billingCycle: 'weekly',
      effectSummary: '委托板额外 +1，并在目标/订单结算中追加少量商路票与现金收益。',
      weeklyFee: 3200,
      autoRenew: true,
      targetSystems: ['shop', 'quest', 'goal', 'wallet'],
      dailyQuestBoardBonus: 1,
      moneyRewardMultiplier: 1.08,
      ticketRewards: { caravan: 1 }
    },
    effect: { type: 'activate_service_contract' }
  },
  {
    id: 'premium_museum_promotion_contract',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '博物馆巡展代办契',
    description: '雇佣巡展推广团队，为展陈持续引流并补强馆藏评分。',
    price: 22000,
    tags: ['高价长期商品', '服务契约', '博物馆', '展示'],
    recommendationKey: 'museum_service_contract',
    recommendationPriority: 5,
    recommendationReasonTemplate: '适合把展示消费转成持续热度与展陈收益：{context}',
    uiBadge: '巡展',
    serviceContractConfig: {
      contractType: 'museum_promotion',
      billingCycle: 'weekly',
      effectSummary: '博物馆陈列评分提升，访客热度额外增长，并为目标结算补充展陈券。',
      weeklyFee: 3600,
      autoRenew: true,
      targetSystems: ['shop', 'museum', 'goal', 'wallet'],
      museumVisitorBonusRate: 0.18,
      museumDisplayRatingBonus: 12,
      ticketRewards: { exhibit: 1 }
    },
    effect: { type: 'activate_service_contract' }
  },
  {
    id: 'premium_research_assistant_contract',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '书院研修助理契',
    description: '聘请常驻助理整理资料与课题，让后期目标奖励持续向声望与研究票倾斜。',
    price: 26000,
    tags: ['高价长期商品', '服务契约', '研究', '声望'],
    recommendationKey: 'research_service_contract',
    recommendationPriority: 5,
    recommendationReasonTemplate: '适合围绕目标与预算系统放大长期声望回报：{context}',
    uiBadge: '研修',
    serviceContractConfig: {
      contractType: 'research_assistant',
      billingCycle: 'weekly',
      effectSummary: '目标奖励声望提高，并在结算时追加研究券与固定目标声望。',
      weeklyFee: 4200,
      autoRenew: true,
      targetSystems: ['shop', 'goal', 'wallet'],
      reputationRewardMultiplier: 1.15,
      goalReputationFlatBonus: 4,
      flatReputationBonus: 2,
      ticketRewards: { research: 1 }
    },
    effect: { type: 'activate_service_contract' }
  },
  {
    id: 'premium_maintenance_support_contract',
    shopId: 'wanwupu',
    pool: 'premium',
    name: '后勤维保统筹契',
    description: '将村庄建设维护外包给后勤团队，降低自动维护与补缴维护的现金压力。',
    price: 24000,
    tags: ['高价长期商品', '服务契约', '维护', '后勤'],
    recommendationKey: 'maintenance_service_contract',
    recommendationPriority: 4,
    recommendationReasonTemplate: '适合多条建设线并行后的维保控费：{context}',
    uiBadge: '维保',
    serviceContractConfig: {
      contractType: 'maintenance_support',
      billingCycle: 'weekly',
      effectSummary: '村庄建设维护费降低，并将一部分维护压力转化为更平滑的长期运营成本。',
      weeklyFee: 3800,
      autoRenew: true,
      targetSystems: ['shop', 'goal', 'wallet'],
      maintenanceCostRateReduction: 0.2,
      flatReputationBonus: 1
    },
    effect: { type: 'activate_service_contract' }
  }
]

export const SHOP_CATALOG_LUXURY_BASELINE_AUDIT: EconomyBaselineAuditConfig = {
  id: 'shop_catalog_luxury_expansion',
  workstreamId: 'WS03_T021',
  label: '商店目录与豪华消费池扩容基线审计',
  summary: '围绕豪华许可证、仓储服务、远行补给、节庆礼盒、展示型家具与功能型券包建立统一口径，确保后续扩容先观测购买转化、重复消费与沉没效率，再逐步放量。',
  focusAreas: ['豪华许可与仓储服务', '周精选与节庆礼盒', '展示型家具与收藏消费', '功能型券包与远行补给'],
  coreMetrics: [
    {
      id: 'luxury_offer_purchase_rate',
      label: '豪华商品购买率',
      description: '衡量进入豪华目录后，玩家是否愿意为高价长期商品付费。',
      formula: 'luxuryOfferBuyersLast14Days / max(1, luxuryOfferViewersLast14Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.premiumCatalogOffers', 'useShopStore.ownedCatalogOfferIds', 'usePlayerStore.money'],
      thresholds: { watch: 0.18, warning: 0.12, critical: 0.08 },
      anomalyRule: '若样本玩家少于 20，则与近 4 周均值合并观察，并备注为低样本。'
    },
    {
      id: 'weekly_spotlight_conversion_rate',
      label: '周精选转化率',
      description: '衡量每周精选是否成功把浏览兴趣转成实际消费。',
      formula: 'weeklySpotlightPurchasesLast28Days / max(1, weeklySpotlightRefreshesLast28Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.weeklyCatalogOffers', 'useShopStore.weeklySurpriseOffer', 'useGameStore.day'],
      thresholds: { watch: 0.3, warning: 0.22, critical: 0.15 },
      anomalyRule: '若节庆周导致精选数量异常提升，则按单次刷新归一化，不直接与普通周横比。'
    },
    {
      id: 'luxury_repeat_purchase_rate',
      label: '重复购买率',
      description: '衡量功能型券包、仓储扩建和远行补给是否形成可持续复购。',
      formula: 'repeatLuxuryPurchasesLast28Days / max(1, luxuryPurchasersLast28Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.weeklyCatalogOffers', 'useShopStore.premiumCatalogOffers', 'useWarehouseStore.maxChests'],
      thresholds: { watch: 0.24, warning: 0.18, critical: 0.12 },
      anomalyRule: '一次性商品占比超过 70% 的周次，需剔除 onceOnly 商品后再计算复购。'
    },
    {
      id: 'functional_sink_absorption_rate',
      label: '功能道具沉没率',
      description: '衡量功能型消费是否真实吸收后期铜钱，而不是被一次性买断后失去价值。',
      formula: 'functionalLuxurySpendLast14Days / max(1, lateSegmentDisposableMoneyLast14Days)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.recommendedCatalogOffers', 'usePlayerStore.getEconomyOverview', 'useInventoryStore.items'],
      thresholds: { watch: 0.12, warning: 0.08, critical: 0.05 },
      anomalyRule: '若玩家刚进入后期分层 7 天内，则允许短期偏低，但需同步观察仓储与温室等长期投资是否被解锁。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'shop_sink_share_guardrail',
      label: '商店 sink 占总支出比',
      description: '避免豪华消费池过度吞噬其他系统支出，制造“只能去商店花钱”的错觉。',
      formula: 'shopLuxurySpendLast14Days / max(1, totalSinkSpendLast14Days)',
      direction: 'target_range',
      dataSources: ['useShopStore.purchaseCatalogOffer', 'usePlayerStore.getEconomyOverview', 'economyTelemetry.lifetimeSinkSpend'],
      thresholds: { targetMin: 0.18, targetMax: 0.42 },
      anomalyRule: '高于上限时优先补充非商店 sink 内容，低于下限时优先检查推荐与入口曝光，而不是立即提价。'
    },
    {
      id: 'luxury_affordability_guardrail',
      label: '豪华商品可负担周数',
      description: '避免高价目录脱离当前市场和商店节奏，造成纯氪金错觉。',
      formula: 'medianLuxuryOfferPrice / max(1, lateSegmentRecent7DayNetIncome)',
      direction: 'higher_is_worse',
      dataSources: ['useShopStore.premiumCatalogOffers', 'useShopStore.weeklyCatalogOffers', 'useShopStore.shippingHistory'],
      thresholds: { watch: 2.8, warning: 3.6, critical: 4.5 },
      anomalyRule: '若主题周提供额外现金流奖励，则单独记录活动周口径，避免掩盖平时的真实负担。'
    }
  ],
  playerSegments: [
    {
      id: 'weekly_value_seeker',
      label: '周精选捡漏型玩家',
      description: '现金流稳定但更关注每周精选和折扣，优先测试补给包与节庆礼盒。',
      disposableMoneyMin: 12000,
      inflationPressureMin: 6,
      recommendedFocus: '先投放每周精选、轻豪华礼包和可复购补给，验证价格敏感度。'
    },
    {
      id: 'luxury_builder',
      label: '豪华建设型玩家',
      description: '开始追求温室、仓储与长期经营许可，适合承接仓储服务和功能型券包。',
      disposableMoneyMin: 32000,
      inflationPressureMin: 11,
      recommendedFocus: '优先投放仓储扩建、温室许可和远行补给等长期建设消费。'
    },
    {
      id: 'showcase_collector',
      label: '展示收藏型玩家',
      description: '资金富余且图鉴/展示倾向明显，适合展示型家具与收藏向高价商品。',
      disposableMoneyMin: 70000,
      inflationPressureMin: 18,
      recommendedFocus: '强化展示型家具、节庆礼盒和终局收藏消费，观察是否带动复购与跨系统炫耀性目标。'
    }
  ],
  rollbackRules: [
    {
      id: 'luxury_pool_roll_back_on_conversion_drop',
      label: '转化下滑且负担失衡时回滚',
      condition: 'weekly_spotlight_conversion_rate < 0.15 且 luxury_affordability_guardrail > 4.5，连续 2 个结算周期成立',
      fallbackAction: '回退新增豪华价格带到上个稳定版本，只保留已验证的周精选与功能型券包，并暂停继续扩容豪华许可证/展示型家具池。'
    }
  ],
  linkedSystems: ['shop', 'wallet', 'goal', 'achievement', 'market'],
  linkedSystemRefs: [
    {
      system: 'shop',
      storeId: 'useShopStore',
      touchpoints: ['premiumCatalogOffers', 'weeklyCatalogOffers', 'purchaseCatalogOffer', 'recommendedCatalogOffers'],
      rationale: '负责目录曝光、推荐逻辑、价格带分层与实际购买入口，是主口径来源。'
    },
    {
      system: 'wallet',
      storeId: 'walletCatalogBias',
      touchpoints: ['商贾流 weekly/premium 权重', '商店折扣', 'catalogTagWeights'],
      rationale: '决定不同钱包流派对周精选、豪华目录和功能型商品的偏好差异。'
    },
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['currentThemeWeek', 'recommendedCatalogTags'],
      rationale: '负责主题周与推荐标签，影响周精选和节庆礼盒的转化解释。'
    },
    {
      system: 'achievement',
      storeId: 'useAchievementStore',
      touchpoints: ['discoveredCount', 'unlockDiscoveryCount'],
      rationale: '提供高价目录与收藏型商品的解锁门槛，支持展示型玩家分层。'
    },
    {
      system: 'market',
      storeId: 'useShopStore.shippingHistory',
      touchpoints: ['recent7DayNetIncome', '品类行情收益'],
      rationale: '校验高价商品负担是否仍与当前市场收益匹配，避免价格带脱离经济现实。'
    }
  ]
}

export const WS03_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '目录购买失败时必须完整回滚铜钱、背包、仓库、家园、温室与装饰状态。',
    '同一日结 / 周结 / 换季 tick 重复触发时，不可重复过期、重复刷新或重复打日志。',
    '高价服务合同在生效期内不可重复购买，避免通过重复点击叠加收益。',
    '调参配置可在不修改 store 主逻辑的前提下关闭池子、隐藏商品、切换推荐倾向与补位方案。'
  ],
  releaseAnnouncement: [
    '商店豪华目录新增事务锁、自动回滚与服务防重购保护，减少吞货、坏档与重复领奖风险。',
    '豪华消费池已支持运营调参：可按池子、价格带、品类和推荐权重灵活开关。',
    '目录周精选、季节限定与高价长期商品现已具备 QA、上线检查与补偿预案。'
  ]
} as const

export const WS03_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws03-negative-catalog-refund-full-rollback',
    title: '目录发放失败后完整回滚',
    category: 'negative',
    steps: ['构造目录商品发放中途失败场景', '执行 purchaseCatalogOffer'],
    expectedResult: '铜钱、目录拥有状态、扩容、仓储、家园、温室与装饰全部恢复到购买前快照。'
  },
  {
    id: 'ws03-boundary-double-click-lock',
    title: '重复点击购买时只允许一笔事务结算',
    category: 'boundary',
    steps: ['连续快速点击同一目录商品购买按钮两次'],
    expectedResult: '第二次点击收到“正在结算”提示，不重复扣钱、不重复发货。'
  },
  {
    id: 'ws03-boundary-service-lock',
    title: '高价服务生效期内不可重复购买',
    category: 'boundary',
    steps: ['购买 weekly/dealy/seasonal 服务型目录商品', '在到期前再次尝试购买'],
    expectedResult: '购买被阻止，并明确提示当前服务仍在生效中与到期日。'
  },
  {
    id: 'ws03-compatibility-operational-meta',
    title: '旧存档缺少 operationalMeta 时安全补齐',
    category: 'compatibility',
    steps: ['读取不含 catalogExpansionState.operationalMeta 的旧档'],
    expectedResult: '读档成功，目录运营元数据自动回填默认值，不影响原有商品状态。'
  },
  {
    id: 'ws03-recovery-cycle-idempotent',
    title: '重复触发目录 tick 不重复刷新或过期',
    category: 'recovery',
    steps: ['在同一 dayTag 重复调用 processCatalogCycleTick', '再模拟同一周重复 startedNewWeek'],
    expectedResult: '相同 dayTag 只处理一次到期；相同 weekId / season dayTag 不重复输出刷新日志。'
  },
  {
    id: 'ws03-ops-pool-disable',
    title: '关闭目录池后前台列表自动收口',
    category: 'ops',
    steps: ['将 SHOP_CATALOG_TUNING_CONFIG.poolEnabled.weekly 改为 false', '刷新万物铺与钱包页'],
    expectedResult: '周精选入口与推荐自动切换到剩余开放池，不需要修改 store 主逻辑。'
  },
  {
    id: 'ws03-ops-fallback-offers',
    title: '可见商品不足时自动使用补位商品',
    category: 'ops',
    steps: ['隐藏部分 weekly/premium 商品', '检查当前货架与推荐列表'],
    expectedResult: '系统会从 fallbackOfferIdsByPool 中补足最小可玩集合，避免出现空货架。'
  },
  {
    id: 'ws03-positive-seasonal-limit',
    title: '季节限定货架遵守当前季节与显示上限',
    category: 'positive',
    steps: ['切换到不同季节', '检查 seasonalCatalogOffers 数量'],
    expectedResult: '仅展示当季开放商品，且数量不超过 seasonalDisplayLimit。'
  }
]

export const WS03_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws03-check-refund', label: '确认目录购买失败时快照回滚链路完整可用', owner: 'qa', done: false },
  { id: 'ws03-check-service-lock', label: '确认高价服务在生效期内不可重复购买', owner: 'qa', done: false },
  { id: 'ws03-check-cycle-idempotent', label: '确认同一日/周/季 tick 不会重复刷新和重复日志', owner: 'dev', done: false },
  { id: 'ws03-check-ops-config', label: '确认池子开关、隐藏商品、推荐权重与补位配置生效', owner: 'ops', done: false },
  { id: 'ws03-check-ui-copy', label: '确认商店页与钱包页能正确提示锁定、停售与推荐变化', owner: 'design', done: false }
]

export const WS03_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'ws03-compensate-refund-missed',
    trigger: '目录购买成功扣钱但回滚链路异常，导致玩家未收到商品或服务。',
    compensation: ['补发等额铜钱', '补发对应目录商品或同档位补偿包'],
    notes: '优先以回档前快照日志和 economy_sink_guidance 结构化日志核对玩家实际损失。'
  },
  {
    id: 'ws03-compensate-repeat-service',
    trigger: '服务合同误允许重复购买，导致玩家重复扣钱。',
    compensation: ['返还多扣的铜钱', '保留单次合法服务状态'],
    notes: '重复订单按 offerId + lastPurchasedDayKey 聚合去重。'
  },
  {
    id: 'ws03-compensate-hidden-offer',
    trigger: '运营开关误关导致玩家短期看不到已公告货架。',
    compensation: ['通过公告说明恢复时间', '必要时通过下一周精选或邮件补发等价优惠包'],
    notes: '优先使用 fallbackOfferIdsByPool 保证基础可玩集合不断档。'
  }
]

export const WS03_RELEASE_ANNOUNCEMENT = [
  '【商店豪华目录】新增事务锁与自动回滚保护，购买失败会自动退款并恢复状态。',
  '【目录运营】周精选、季节限定与高价长期商品支持按池子、价格带和推荐权重灵活调参。',
  '【体验优化】服务型目录商品在生效期内会提示到期日，避免误触重复购买。'
] as const

const BASIC_OFFER_DEFS: ShopCatalogOfferDef[] = BASIC_OFFERS.map(createShopCatalogOffer)
const WEEKLY_OFFER_DEFS: ShopCatalogOfferDef[] = WEEKLY_OFFERS.map(createShopCatalogOffer)
const SEASONAL_OFFER_DEFS: ShopCatalogOfferDef[] = SEASONAL_OFFERS.map(createShopCatalogOffer)
const PREMIUM_OFFER_DEFS: ShopCatalogOfferDef[] = PREMIUM_OFFERS.map(createShopCatalogOffer)

export const SHOP_CATALOG_OFFERS: ShopCatalogOfferDef[] = [...BASIC_OFFER_DEFS, ...WEEKLY_OFFER_DEFS, ...SEASONAL_OFFER_DEFS, ...PREMIUM_OFFER_DEFS]

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

export const getWeeklyShopCatalogOffers = (weekId: number, count = 4): ShopCatalogOfferDef[] => {
  const rng = seededRandom(weekId + 17)
  const pool = [...WEEKLY_OFFER_DEFS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, Math.min(count, pool.length))
}
