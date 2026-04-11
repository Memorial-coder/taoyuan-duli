import type { CompensationPlan, EconomyAuditConfig, EconomyBaselineAuditConfig, EconomySinkCategory, EconomySystemKey, GoalMetricKey, QaCaseDef, ReleaseChecklistItem } from '@/types'

/** 每日行情系统 — 季节系数 × 供需系数 × 随机波动(±5%)，clamp [0.5, 2.0] */

// === 类型 ===

export type MarketCategory = 'crop' | 'fish' | 'animal_product' | 'processed' | 'fruit' | 'ore' | 'gem'
export type MarketTrend = 'boom' | 'rising' | 'stable' | 'falling' | 'crash'
export type SellRecordSource = 'direct_shop' | 'shipping_box'

export interface CategoryMarketInfo {
  category: MarketCategory
  multiplier: number
  trend: MarketTrend
}

export type EconomyContentTier = 'mid_transition' | 'late_growth' | 'endgame_showcase'

export interface EconomySinkContentDef {
  id: string
  tier: EconomyContentTier
  name: string
  category: EconomySinkCategory
  priceBand: [number, number]
  linkedSystems: EconomySystemKey[]
  unlockMetrics: GoalMetricKey[]
  valueFlow: string[]
  sinkFlow: string[]
  showcaseHook: string
}

export interface EconomyTuningConfig {
  riskReportEnabled: boolean
  recommendedSinkCount: number
  weeklyRiskReportIntervalDays: number
  sinkScoreBonuses: {
    lowSinkSatisfaction: number
    lowLoopDiversity: number
    highDominantIncome: number
    themeWeekMatch: number
  }
  catalogRecommendationScoreBonuses: {
    shopSinkTagMatch: number
    marketSinkTagMatch: number
    questSinkTagMatch: number
  }
  marketRouteScoreBonuses: {
    catalogTagMatch: number
    sinkCategoryMatch: number
    systemLinkMatch: number
    segmentFit: number
    themeWeekReady: number
    pressureMatch: number
  }
}

export interface MarketDynamicsRoutingDef {
  id: string
  label: string
  description: string
  targetSegmentIds: string[]
  focusMetricIds: string[]
  linkedSystems: EconomySystemKey[]
  preferredMarketCategories: MarketCategory[]
  preferredSinkCategories: EconomySinkCategory[]
  recommendedCatalogTags: string[]
  themeWeekPreference: 'optional' | 'recommended' | 'required'
  goalFocus: string
  rollbackRuleId: string
}

export interface MarketDynamicsSystemMappingDef {
  storeId: 'useFarmStore' | 'useFishingStore' | 'useProcessingStore' | 'useQuestStore'
  relationship: string
  mappedMarketCategories: MarketCategory[]
  configMappings: string[]
  kpiHooks: string[]
}

export type MarketDynamicsPhaseId = 'p0_hotspot_seed' | 'p1_regional_rotation' | 'p2_theme_conversion'

export interface MarketPhaseFeatureFlags {
  hotspots: boolean
  cooldowns: boolean
  regionalProcurement: boolean
  overflowPenalty: boolean
  themeEncouragement: boolean
  substituteRewards: boolean
}

export interface MarketDynamicsPhaseConfig {
  id: MarketDynamicsPhaseId
  label: string
  description: string
  order: number
  featureFlags: MarketPhaseFeatureFlags
  hotspotSlots: number
  cooldownDays: number
  regionalProcurementSlots: number
  overflowPenaltyBands: string[]
  themeRewardPoolSize: number
  substituteRewardPoolSize: number
}

export interface MarketHotspotConfig {
  baseSlotCount: number
  maxSlotCount: number
  cooldownDays: number
  fallbackCategories: MarketCategory[]
  trendWeights: Record<MarketTrend, number>
  stageOverrides: Partial<Record<MarketDynamicsPhaseId, {
    slotCount?: number
    cooldownDays?: number
    fallbackCategories?: MarketCategory[]
  }>>
}

export interface MarketRegionalProcurementConfig {
  enabledFromPhase: MarketDynamicsPhaseId
  baseContractCount: number
  maxContractCount: number
  durationDays: number
  districtPool: string[]
  rewardMultiplierRange: [number, number]
  stageOverrides: Partial<Record<MarketDynamicsPhaseId, {
    contractCount?: number
    durationDays?: number
    rewardMultiplierRange?: [number, number]
  }>>
}

export interface MarketOverflowPenaltyBandDef {
  id: string
  label: string
  shippedQuantityMin: number
  multiplier: number
  cooldownDays: number
  substituteRewardSlots: number
}

export interface MarketOverflowPenaltyConfig {
  enabledFromPhase: MarketDynamicsPhaseId
  gentleFloorMultiplier: number
  graceUnitsPerDay: number
  resetAfterIdleDays: number
  bands: MarketOverflowPenaltyBandDef[]
}

export interface MarketThemeEncouragementConfig {
  enabledFromPhase: MarketDynamicsPhaseId
  baseRewardMultiplier: number
  maxRewardMultiplier: number
  preferredThemeIds: string[]
  encouragedTags: string[]
  stageOverrides: Partial<Record<MarketDynamicsPhaseId, {
    rewardMultiplier?: number
    encouragedTags?: string[]
  }>>
}

export type MarketSubstituteRewardType = 'price_support' | 'catalog_boost' | 'quest_bonus' | 'reputation_bonus'

export interface MarketSubstituteRewardConfig {
  enabledFromPhase: MarketDynamicsPhaseId
  rewardTypes: MarketSubstituteRewardType[]
  baseRewardValue: number
  maxRewardValue: number
  durationDays: number
  stageOverrides: Partial<Record<MarketDynamicsPhaseId, {
    rewardValue?: number
    durationDays?: number
    rewardTypes?: MarketSubstituteRewardType[]
  }>>
}

export interface MarketDynamicsConfig {
  saveVersion: number
  defaultPhaseId: MarketDynamicsPhaseId
  phases: MarketDynamicsPhaseConfig[]
  hotspot: MarketHotspotConfig
  regionalProcurement: MarketRegionalProcurementConfig
  overflowPenalty: MarketOverflowPenaltyConfig
  themeEncouragement: MarketThemeEncouragementConfig
  substituteReward: MarketSubstituteRewardConfig
}

export interface MarketHotspotState {
  category: MarketCategory
  activatedDayKey: string
  expiresDayKey: string
  sourcePhaseId: MarketDynamicsPhaseId
  trend: MarketTrend
}

export interface MarketCategoryCooldownState {
  category: MarketCategory
  remainingDays: number
  source: 'hotspot' | 'overflow_penalty' | 'regional_procurement' | 'theme_encouragement'
  lastTriggeredDayKey: string
}

export interface MarketRegionalProcurementState {
  id: string
  districtId: string
  targetCategories: MarketCategory[]
  rewardMultiplier: number
  startsDayKey: string
  expiresDayKey: string
  sourcePhaseId: MarketDynamicsPhaseId
  substituteRewardId?: string
}

export interface MarketOverflowPenaltyState {
  category: MarketCategory
  currentBandId: string
  streakDays: number
  appliedMultiplier: number
  graceUnitsRemaining: number
  lastTriggeredDayKey: string
}

export interface MarketThemeEncouragementState {
  themeWeekId: string
  encouragedCategories: MarketCategory[]
  encouragedTags: string[]
  rewardMultiplier: number
  sourcePhaseId: MarketDynamicsPhaseId
  substituteRewardIds: string[]
}

export interface MarketSubstituteRewardState {
  id: string
  fromCategory: MarketCategory
  toCategory: MarketCategory
  rewardType: MarketSubstituteRewardType
  rewardValue: number
  expiresDayKey: string
  sourcePhaseId: MarketDynamicsPhaseId
}

export interface MarketDynamicsState {
  saveVersion: number
  activePhaseId: MarketDynamicsPhaseId
  lastRefreshDayKey: string
  hotspots: MarketHotspotState[]
  categoryCooldowns: Partial<Record<MarketCategory, MarketCategoryCooldownState>>
  regionalProcurements: MarketRegionalProcurementState[]
  overflowPenalties: Partial<Record<MarketCategory, MarketOverflowPenaltyState>>
  themeEncouragement: MarketThemeEncouragementState | null
  substituteRewards: MarketSubstituteRewardState[]
}

// === 常量 ===

export const MARKET_DYNAMICS_CONFIG: MarketDynamicsConfig = {
  saveVersion: 1,
  defaultPhaseId: 'p0_hotspot_seed',
  phases: [
    {
      id: 'p0_hotspot_seed',
      label: 'P0 热点试水',
      description: '只启用热点品类、轻度冷却和基础替代奖励，用于先建立市场轮换感知。',
      order: 0,
      featureFlags: {
        hotspots: true,
        cooldowns: true,
        regionalProcurement: false,
        overflowPenalty: false,
        themeEncouragement: true,
        substituteRewards: true
      },
      hotspotSlots: 2,
      cooldownDays: 3,
      regionalProcurementSlots: 0,
      overflowPenaltyBands: ['overflow_warning'],
      themeRewardPoolSize: 1,
      substituteRewardPoolSize: 2
    },
    {
      id: 'p1_regional_rotation',
      label: 'P1 地区轮换',
      description: '在热点和冷却基础上开放地区收购与温和超量惩罚，推动跨系统轮换。',
      order: 1,
      featureFlags: {
        hotspots: true,
        cooldowns: true,
        regionalProcurement: true,
        overflowPenalty: true,
        themeEncouragement: true,
        substituteRewards: true
      },
      hotspotSlots: 3,
      cooldownDays: 4,
      regionalProcurementSlots: 2,
      overflowPenaltyBands: ['overflow_warning', 'overflow_strong'],
      themeRewardPoolSize: 2,
      substituteRewardPoolSize: 3
    },
    {
      id: 'p2_theme_conversion',
      label: 'P2 主题转化',
      description: '开放完整主题鼓励与替代奖励池，把市场热点转成主题周和高价消耗闭环。',
      order: 2,
      featureFlags: {
        hotspots: true,
        cooldowns: true,
        regionalProcurement: true,
        overflowPenalty: true,
        themeEncouragement: true,
        substituteRewards: true
      },
      hotspotSlots: 4,
      cooldownDays: 5,
      regionalProcurementSlots: 3,
      overflowPenaltyBands: ['overflow_warning', 'overflow_strong', 'overflow_crisis'],
      themeRewardPoolSize: 3,
      substituteRewardPoolSize: 4
    }
  ],
  hotspot: {
    baseSlotCount: 2,
    maxSlotCount: 4,
    cooldownDays: 3,
    fallbackCategories: ['processed', 'fish', 'fruit'],
    trendWeights: {
      boom: 5,
      rising: 4,
      stable: 2,
      falling: 1,
      crash: 0
    },
    stageOverrides: {
      p0_hotspot_seed: { slotCount: 2, cooldownDays: 3, fallbackCategories: ['crop', 'fish'] },
      p1_regional_rotation: { slotCount: 3, cooldownDays: 4, fallbackCategories: ['processed', 'fish', 'fruit'] },
      p2_theme_conversion: { slotCount: 4, cooldownDays: 5, fallbackCategories: ['processed', 'gem', 'fruit'] }
    }
  },
  regionalProcurement: {
    enabledFromPhase: 'p1_regional_rotation',
    baseContractCount: 1,
    maxContractCount: 3,
    durationDays: 7,
    districtPool: ['jiangnan_wharf', 'mountain_route', 'capital_exchange', 'hanhai_trade_post'],
    rewardMultiplierRange: [1.1, 1.45],
    stageOverrides: {
      p1_regional_rotation: { contractCount: 2, durationDays: 7, rewardMultiplierRange: [1.15, 1.45] },
      p2_theme_conversion: { contractCount: 3, durationDays: 10, rewardMultiplierRange: [1.2, 1.6] }
    }
  },
  overflowPenalty: {
    enabledFromPhase: 'p1_regional_rotation',
    gentleFloorMultiplier: 0.82,
    graceUnitsPerDay: 12,
    resetAfterIdleDays: 3,
    bands: [
      {
        id: 'overflow_warning',
        label: '轻度过剩',
        shippedQuantityMin: 40,
        multiplier: 0.92,
        cooldownDays: 2,
        substituteRewardSlots: 1
      },
      {
        id: 'overflow_strong',
        label: '明显过剩',
        shippedQuantityMin: 80,
        multiplier: 0.86,
        cooldownDays: 3,
        substituteRewardSlots: 2
      },
      {
        id: 'overflow_crisis',
        label: '严重过剩',
        shippedQuantityMin: 140,
        multiplier: 0.82,
        cooldownDays: 4,
        substituteRewardSlots: 3
      }
    ]
  },
  themeEncouragement: {
    enabledFromPhase: 'p0_hotspot_seed',
    baseRewardMultiplier: 1.08,
    maxRewardMultiplier: 1.32,
    preferredThemeIds: ['spring_farming', 'summer_fishing', 'autumn_cooking', 'winter_mining', 'late_sink_rotation'],
    encouragedTags: ['每周精选', '功能商品'],
    stageOverrides: {
      p0_hotspot_seed: { rewardMultiplier: 1.08, encouragedTags: ['每周精选'] },
      p1_regional_rotation: { rewardMultiplier: 1.16, encouragedTags: ['每周精选', '材料包'] },
      p2_theme_conversion: { rewardMultiplier: 1.24, encouragedTags: ['每周精选', '功能商品', '高价长期商品'] }
    }
  },
  substituteReward: {
    enabledFromPhase: 'p0_hotspot_seed',
    rewardTypes: ['price_support', 'catalog_boost', 'quest_bonus'],
    baseRewardValue: 1,
    maxRewardValue: 3,
    durationDays: 4,
    stageOverrides: {
      p0_hotspot_seed: { rewardValue: 1, durationDays: 3, rewardTypes: ['price_support', 'catalog_boost'] },
      p1_regional_rotation: { rewardValue: 2, durationDays: 4, rewardTypes: ['price_support', 'catalog_boost', 'quest_bonus'] },
      p2_theme_conversion: { rewardValue: 3, durationDays: 5, rewardTypes: ['price_support', 'catalog_boost', 'quest_bonus', 'reputation_bonus'] }
    }
  }
}

export const createDefaultMarketDynamicsState = (): MarketDynamicsState => ({
  saveVersion: MARKET_DYNAMICS_CONFIG.saveVersion,
  activePhaseId: MARKET_DYNAMICS_CONFIG.defaultPhaseId,
  lastRefreshDayKey: '',
  hotspots: [],
  categoryCooldowns: {},
  regionalProcurements: [],
  overflowPenalties: {},
  themeEncouragement: null,
  substituteRewards: []
})

export const MARKET_DYNAMICS_PHASE_BY_ID = Object.fromEntries(
  MARKET_DYNAMICS_CONFIG.phases.map(phase => [phase.id, phase])
) as Record<MarketDynamicsPhaseId, MarketDynamicsPhaseConfig>

export const getMarketDynamicsPhaseConfig = (phaseId: MarketDynamicsPhaseId): MarketDynamicsPhaseConfig => {
  return MARKET_DYNAMICS_PHASE_BY_ID[phaseId] ?? MARKET_DYNAMICS_PHASE_BY_ID[MARKET_DYNAMICS_CONFIG.defaultPhaseId]
}

export const ECONOMY_AUDIT_CONFIG: EconomyAuditConfig = {
  coreMetrics: [
    {
      id: 'market_dominant_sale_share',
      label: '单一卖货占比',
      description: '衡量最近 7 天是否仍由单一品类主导市场收入。',
      formula: 'max(recent7DayShippedQuantityByCategory) / max(1, recent7DayTotalShippedQuantity)',
      direction: 'higher_is_worse',
      dataSources: ['useShopStore.shippingHistory', 'useShopStore.getRecentShipping'],
      thresholds: { watch: 0.4, warning: 0.55, critical: 0.7 },
      anomalyRule: '若最近7天总出货量低于 20，则仅展示趋势不进入强预警。'
    },
    {
      id: 'market_hotspot_participation_rate',
      label: '热点参与率',
      description: '衡量推荐的热点/替代品类是否真的进入玩家近 7 天出货决策。',
      formula: 'recent7DayHotspotCategoryShipmentDays / max(1, recent7DayShippingDays)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.shippingHistory', 'useGoalStore.currentThemeWeek', 'marketDailyInfo'],
      thresholds: { watch: 0.5, warning: 0.35, critical: 0.2 },
      anomalyRule: '若当前周没有主题周或热点候选不足 2 类，则回退为“主题命中或上涨品类命中”口径。'
    },
    {
      id: 'market_price_volatility_acceptance',
      label: '价格波动接受度',
      description: '衡量玩家是否在价格波动中仍保留足够的出货活跃。',
      formula: 'recent7DayShipmentOnNonStableTrendDays / max(1, recent7DayShippingDays)',
      direction: 'lower_is_worse',
      dataSources: ['useShopStore.shippingHistory', 'getDailyMarketInfo', 'useShopStore.calculateSellPrice'],
      thresholds: { watch: 0.45, warning: 0.32, critical: 0.18 },
      anomalyRule: '若连续 3 天行情都为 stable，则记录为低波动样本，不判定接受度恶化。'
    },
    {
      id: 'market_multi_system_income_balance',
      label: '多系统收入平衡度',
      description: '衡量市场、订单、主题周与消费出口是否形成联动，而非只剩裸卖货。',
      formula: '1 - dominantIncomeShare + min(1, loopDiversityScore / 6)',
      direction: 'lower_is_worse',
      dataSources: ['economyTelemetry.recentSnapshots', 'usePlayerStore.getEconomyOverview', 'useGoalStore.recommendedEconomySinks'],
      thresholds: { watch: 0.95, warning: 0.75, critical: 0.55 },
      anomalyRule: '若玩家尚未进入 mid_transition，则只用于埋点观察，不触发调参建议。'
    }
  ],
  guardrailMetrics: [
    {
      id: 'market_overflow_penalty_tolerance',
      label: '过剩惩罚容忍度',
      description: '衡量价格下探后，玩家是否仍愿意继续出货而不是直接停摆。',
      formula: 'recent7DayCrashOrFallingShipmentDays / max(1, recent7DayShippingDays)',
      direction: 'target_range',
      dataSources: ['useShopStore.shippingHistory', 'getDailyMarketInfo'],
      thresholds: { targetMin: 0.2, targetMax: 0.65 },
      anomalyRule: '低于区间说明惩罚过陡，高于区间说明惩罚几乎没有感知，均需回看价格梯度。'
    },
    {
      id: 'market_sink_follow_through_rate',
      label: '市场转消耗承接率',
      description: '衡量市场推荐是否真的把收入导向商店、目标或主题消费。',
      formula: 'recent14DaySinkSpend / max(1, recent14DayMarketIncome)',
      direction: 'target_range',
      dataSources: ['economyTelemetry.recentSnapshots', 'economyTelemetry.lifetimeSinkSpend', 'useGoalStore.recommendedEconomySinks'],
      thresholds: { targetMin: 0.18, targetMax: 0.75 },
      anomalyRule: '若近期市场收入很低，则延长观察窗口到 21 天，避免把样本稀薄误判为转化失败。'
    }
  ],
  playerSegments: [
    {
      id: 'market_mid_explorer',
      label: '市场试水型玩家',
      description: '开始接触行情波动，但仍主要依赖 1~2 类基础卖货。',
      disposableMoneyMin: 6000,
      inflationPressureMin: 5,
      recommendedFocus: '优先推上涨品类、基础主题周标签和第一批目录型消费。'
    },
    {
      id: 'market_late_rotator',
      label: '市场轮换型玩家',
      description: '具备切换品类与配合订单的能力，适合引入热点轮换与过剩惩罚。',
      disposableMoneyMin: 22000,
      inflationPressureMin: 10,
      recommendedFocus: '优先推热点轮换、地区收购与跨系统订单联动。'
    },
    {
      id: 'market_endgame_operator',
      label: '终局操盘型玩家',
      description: '资产冗余明显，需要靠主题鼓励和大额 sink 打散单一路径。',
      disposableMoneyMin: 70000,
      inflationPressureMin: 18,
      recommendedFocus: '优先推高价主题活动、瀚海商路与多路线并行运营。'
    }
  ],
  rollbackRules: [
    {
      id: 'ws04_market_penalty_backoff',
      label: '市场惩罚过强立即回退',
      condition: 'market_overflow_penalty_tolerance < 0.2 且 market_hotspot_participation_rate 未提升',
      fallbackAction: '暂停继续加重过剩惩罚，只保留热点推荐、主题奖励与路线提示，并回退最近一档价格压制系数。'
    }
  ],
  linkedSystems: ['shop', 'goal', 'quest', 'wallet', 'market']
}

export const ECONOMY_SINK_CONTENT_DEFS: EconomySinkContentDef[] = [
  {
    id: 'market_supply_rotation_permit',
    tier: 'mid_transition',
    name: '集市轮换经营证',
    category: 'service',
    priceBand: [1800, 4200],
    linkedSystems: ['shop', 'goal', 'market'],
    unlockMetrics: ['totalMoneyEarned', 'totalCropsHarvested'],
    valueFlow: ['让中期玩家开始根据行情切换出货品类', '承接目标面板的主题周与市场热点提示'],
    sinkFlow: ['摊位调度费', '轮换经营许可费'],
    showcaseHook: '把“看行情卖货”变成有明确入口的经营动作，而不是纯随机波动'
  },
  {
    id: 'late_regional_procurement_bid',
    tier: 'late_growth',
    name: '区域收购竞价单',
    category: 'specialOrder',
    priceBand: [9000, 24000],
    linkedSystems: ['shop', 'quest', 'market', 'goal'],
    unlockMetrics: ['totalMoneyEarned', 'friendlyNpcCount'],
    valueFlow: ['把热点品类、地区需求和高价值订单绑定成轮换路线', '引导玩家从裸卖货切到订单+主题周的多系统循环'],
    sinkFlow: ['竞价保证金', '跨区运力费用'],
    showcaseHook: '为后期玩家提供“换热点有理由、换路线有收益”的强引导'
  },
  {
    id: 'late_market_stabilization_fund',
    tier: 'late_growth',
    name: '行情稳价准备金',
    category: 'maintenance',
    priceBand: [7000, 18000],
    linkedSystems: ['market', 'wallet', 'goal'],
    unlockMetrics: ['museumExhibitLevel', 'discoveredCount'],
    valueFlow: ['把过剩惩罚改成可预期的经营成本', '为后续周度冷却和价格缓冲机制预留承接口'],
    sinkFlow: ['稳价储备金', '行情公告维护费'],
    showcaseHook: '让市场抑制更像经营管理，而不是突然削收益'
  },
  {
    id: 'endgame_theme_trade_expo',
    tier: 'endgame_showcase',
    name: '主题商贸博览会',
    category: 'themeActivity',
    linkedSystems: ['market', 'quest', 'goal', 'shop', 'villageProject'],
    priceBand: [32000, 92000],
    unlockMetrics: ['hanhaiContractCompletions', 'totalMoneyEarned', 'highestMineFloor'],
    valueFlow: ['把终局资产转成主题周热点、跨系统订单和展示型奖励', '让终局玩家必须在多品类与多出口之间做取舍'],
    sinkFlow: ['展会筹备金', '主题采购预算', '高规格布展费用'],
    showcaseHook: '作为 WS04 的终局大额 sink，承担反通胀与路线打散双重职责'
  }
]

export const MARKET_DYNAMICS_ROUTING_DEFS: MarketDynamicsRoutingDef[] = [
  {
    id: 'route_hotspot_rotation',
    label: '热点轮换出货',
    description: '优先把上涨/热点品类与基础目录消费绑成第一条市场轮换路线。',
    targetSegmentIds: ['market_mid_explorer', 'market_late_rotator'],
    focusMetricIds: ['market_dominant_sale_share', 'market_hotspot_participation_rate'],
    linkedSystems: ['shop', 'market', 'goal'],
    preferredMarketCategories: ['crop', 'fish', 'processed', 'fruit'],
    preferredSinkCategories: ['service', 'luxuryCatalog'],
    recommendedCatalogTags: ['每周精选', '功能商品', '高价长期商品'],
    themeWeekPreference: 'recommended',
    goalFocus: '引导玩家从单一基础卖货转向按热点轮换的周节奏。',
    rollbackRuleId: 'ws04_market_penalty_backoff'
  },
  {
    id: 'route_regional_demand_bridge',
    label: '地区需求承接',
    description: '把区域收购与特殊订单衔接，形成市场到任务的转化桥。',
    targetSegmentIds: ['market_late_rotator', 'market_endgame_operator'],
    focusMetricIds: ['market_hotspot_participation_rate', 'market_multi_system_income_balance'],
    linkedSystems: ['market', 'quest', 'goal'],
    preferredMarketCategories: ['processed', 'ore', 'gem', 'animal_product'],
    preferredSinkCategories: ['specialOrder', 'maintenance'],
    recommendedCatalogTags: ['每周精选', '材料包'],
    themeWeekPreference: 'optional',
    goalFocus: '让市场热点不只影响卖价，也影响高价值订单和后续投入。',
    rollbackRuleId: 'ws04_market_penalty_backoff'
  },
  {
    id: 'route_theme_sink_conversion',
    label: '主题周转消耗',
    description: '把主题周偏好、市场热点和大额 sink 绑定成终局去库存路线。',
    targetSegmentIds: ['market_endgame_operator'],
    focusMetricIds: ['market_price_volatility_acceptance', 'market_sink_follow_through_rate'],
    linkedSystems: ['market', 'goal', 'shop', 'wallet'],
    preferredMarketCategories: ['processed', 'gem', 'fruit', 'fish'],
    preferredSinkCategories: ['themeActivity', 'luxuryCatalog', 'maintenance'],
    recommendedCatalogTags: ['高价长期商品', '每周精选', '功能商品'],
    themeWeekPreference: 'required',
    goalFocus: '把终局市场收入转成主题活动和大额消费，压低单一路径堆钱。',
    rollbackRuleId: 'ws04_market_penalty_backoff'
  }
]

export const MARKET_DYNAMICS_BASELINE_SYSTEM_MAPPINGS: MarketDynamicsSystemMappingDef[] = [
  {
    storeId: 'useFarmStore',
    relationship: '农作物与果树是 WS04 热点轮换最直接的供给源，决定 crop / fruit 两类行情样本是否足够多样。',
    mappedMarketCategories: ['crop', 'fruit'],
    configMappings: ['热点品类轮换', '冷却期替代推荐', '主题周农产标签偏置'],
    kpiHooks: ['market_dominant_sale_share', 'market_hotspot_participation_rate']
  },
  {
    storeId: 'useFishingStore',
    relationship: '钓鱼与蟹笼提供 fish 类供给，并用于验证价格波动下玩家是否愿意切换地点、鱼种和出货窗口。',
    mappedMarketCategories: ['fish'],
    configMappings: ['热点鱼类权重', '下跌期替代品类推荐', '地区收购的水域偏好'],
    kpiHooks: ['market_hotspot_participation_rate', 'market_price_volatility_acceptance']
  },
  {
    storeId: 'useProcessingStore',
    relationship: '加工链把原料转成 processed 类高价值货物，是多系统收入平衡度和市场转消耗承接率的关键桥接层。',
    mappedMarketCategories: ['processed'],
    configMappings: ['加工品热点加成', '过剩惩罚缓冲', '高价主题 sink 的原料前置'],
    kpiHooks: ['market_multi_system_income_balance', 'market_sink_follow_through_rate']
  },
  {
    storeId: 'useQuestStore',
    relationship: '地区收购、特殊订单与主题承接落在任务系统，用来把市场热点从“卖价变化”转成“订单与奖励变化”。',
    mappedMarketCategories: ['processed', 'fish', 'ore', 'gem', 'animal_product'],
    configMappings: ['地区收购需求池', '特殊订单偏好标签', '主题周替代奖励'],
    kpiHooks: ['market_multi_system_income_balance', 'market_sink_follow_through_rate']
  }
]

export const MARKET_DYNAMICS_BASELINE_AUDIT: EconomyBaselineAuditConfig & {
  systemMappings: MarketDynamicsSystemMappingDef[]
} = {
  id: 'market_dynamics_anti_inflation',
  workstreamId: 'WS04_T031',
  label: '市场行情与动态通胀抑制基线审计',
  summary: '围绕热点品类、过剩惩罚、地区收购、主题鼓励与替代奖励建立统一 KPI 口径，先识别单一路径依赖，再把农耕、钓鱼、加工与订单链路的市场收益温和导向主题周与大额 sink。',
  focusAreas: ['热点品类与周度轮换', '过剩惩罚与价格缓冲', '地区收购与特殊订单承接', '主题周与高价 sink 转化'],
  coreMetrics: ECONOMY_AUDIT_CONFIG.coreMetrics,
  guardrailMetrics: ECONOMY_AUDIT_CONFIG.guardrailMetrics,
  playerSegments: ECONOMY_AUDIT_CONFIG.playerSegments,
  rollbackRules: ECONOMY_AUDIT_CONFIG.rollbackRules,
  linkedSystems: ECONOMY_AUDIT_CONFIG.linkedSystems,
  systemMappings: MARKET_DYNAMICS_BASELINE_SYSTEM_MAPPINGS,
  linkedSystemRefs: [
    {
      system: 'shop',
      storeId: 'useShopStore',
      touchpoints: ['shippingHistory', 'getRecentShipping', 'calculateSellPrice', 'recommendedCatalogOffers'],
      rationale: '提供出货量、行情售价与目录承接入口，是 WS04 单一路径识别和转消耗建议的主数据面。'
    },
    {
      system: 'goal',
      storeId: 'useGoalStore',
      touchpoints: ['currentThemeWeek', 'currentThemeWeekGoals', 'recommendedEconomySinks'],
      rationale: '负责主题周标签、目标焦点与市场路线推荐，把热点行情转成可执行的周目标。'
    },
    {
      system: 'quest',
      storeId: 'useQuestStore',
      touchpoints: ['特殊订单池', '地区收购需求', '高价值订单完成率'],
      rationale: '承接地区收购和替代奖励，让市场热点不仅影响售价，也影响订单选择。'
    },
    {
      system: 'wallet',
      storeId: 'usePlayerStore',
      touchpoints: ['getEconomyOverview', 'economyTelemetry.recentSnapshots', 'lifetimeSinkSpend'],
      rationale: '提供通胀压力、消耗承接率和多系统收入平衡度，是反通胀路由的总量口径。'
    },
    {
      system: 'market',
      storeId: 'market.ts:getDailyMarketInfo',
      touchpoints: ['getDailyMarketInfo', 'MARKET_DYNAMICS_ROUTING_DEFS', 'MARKET_CATEGORY_NAMES'],
      rationale: '提供热点/下跌趋势、品类分层与路线定义，作为 WS04 调参与回滚的配置中枢。'
    }
  ]
}

export const ECONOMY_TUNING_CONFIG: EconomyTuningConfig = {
  riskReportEnabled: true,
  recommendedSinkCount: 4,
  weeklyRiskReportIntervalDays: 7,
  sinkScoreBonuses: {
    lowSinkSatisfaction: 2,
    lowLoopDiversity: 2,
    highDominantIncome: 2,
    themeWeekMatch: 1
  },
  catalogRecommendationScoreBonuses: {
    shopSinkTagMatch: 1,
    marketSinkTagMatch: 1,
    questSinkTagMatch: 1
  },
  marketRouteScoreBonuses: {
    catalogTagMatch: 2,
    sinkCategoryMatch: 2,
    systemLinkMatch: 2,
    segmentFit: 3,
    themeWeekReady: 1,
    pressureMatch: 2
  }
}

const MARKET_CATEGORIES: MarketCategory[] = ['crop', 'fish', 'animal_product', 'processed', 'fruit', 'ore', 'gem']

/** 季节系数：[spring, summer, autumn, winter] */
const SEASON_COEFFICIENTS: Record<MarketCategory, [number, number, number, number]> = {
  crop: [1.0, 0.9, 0.85, 1.2], // 秋收最便宜，冬季最贵
  fish: [1.0, 0.9, 1.0, 1.15], // 夏季鱼多便宜，冬季贵
  animal_product: [1.0, 0.95, 1.0, 1.1], // 冬季畜产品需求高
  processed: [0.95, 1.0, 1.1, 1.05], // 秋季加工品需求旺
  fruit: [1.1, 0.85, 0.9, 1.2], // 夏季水果多便宜，冬季贵
  ore: [1.0, 1.05, 1.0, 0.9], // 冬季矿多便宜
  gem: [1.0, 1.05, 1.0, 0.9] // 同矿石
}

/** 供需阈值：7天累计出货量 */
const SUPPLY_THRESHOLDS: Record<MarketCategory, { low: number; mid: number; high: number }> = {
  crop: { low: 20, mid: 50, high: 100 },
  fish: { low: 10, mid: 25, high: 50 },
  animal_product: { low: 10, mid: 25, high: 50 },
  processed: { low: 5, mid: 15, high: 30 },
  fruit: { low: 10, mid: 25, high: 50 },
  ore: { low: 15, mid: 40, high: 80 },
  gem: { low: 3, mid: 8, high: 15 }
}

export const TREND_NAMES: Record<MarketTrend, string> = {
  boom: '大涨',
  rising: '上涨',
  stable: '平稳',
  falling: '下跌',
  crash: '暴跌'
}

export const TREND_COLORS: Record<MarketTrend, string> = {
  boom: 'text-danger border-danger/30',
  rising: 'text-success border-success/30',
  stable: 'text-muted border-muted/20',
  falling: 'text-warning border-warning/30',
  crash: 'text-danger border-danger/30'
}

export const MARKET_CATEGORY_NAMES: Record<MarketCategory, string> = {
  crop: '农产品',
  fish: '鱼类',
  animal_product: '畜产品',
  processed: '加工品',
  fruit: '水果',
  ore: '矿石',
  gem: '宝石'
}

// === 伪随机 ===

const seededRandom = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// === 内部计算 ===

const _isMarketCategory = (category: string): category is MarketCategory => {
  return MARKET_CATEGORIES.includes(category as MarketCategory)
}

const _clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

/** 线性插值 */
const _lerp = (v: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number => {
  const t = (v - fromMin) / (fromMax - fromMin)
  return toMin + t * (toMax - toMin)
}

/** 供需系数：出货越多价格越低 */
const _computeSupplyDemand = (category: MarketCategory, recentVolume: number): number => {
  const th = SUPPLY_THRESHOLDS[category]
  if (recentVolume <= 0) return 1.1
  if (recentVolume < th.low) return _lerp(recentVolume, 0, th.low, 1.1, 1.0)
  if (recentVolume < th.mid) return _lerp(recentVolume, th.low, th.mid, 1.0, 0.9)
  if (recentVolume < th.high) return _lerp(recentVolume, th.mid, th.high, 0.9, 0.8)
  return 0.8
}

/** 三因子计算：季节 × 供需 × 随机(±5%) */
const _computeMultiplier = (category: MarketCategory, seasonIndex: number, rng: () => number, recentVolume: number): number => {
  const season = SEASON_COEFFICIENTS[category][seasonIndex] ?? 1.0
  const supply = _computeSupplyDemand(category, recentVolume)
  const random = 0.95 + rng() * 0.1 // 0.95 ~ 1.05
  return _clamp(Math.round(season * supply * random * 100) / 100, 0.5, 2.0)
}

const _toTrend = (multiplier: number): MarketTrend => {
  if (multiplier >= 1.4) return 'boom'
  if (multiplier > 1.05) return 'rising'
  if (multiplier <= 0.6) return 'crash'
  if (multiplier < 0.95) return 'falling'
  return 'stable'
}

// === 公开 API ===

/** 获取某品类当日价格系数（非波动品类返回 1.0） */
export const getMarketMultiplier = (
  category: string,
  year: number,
  seasonIndex: number,
  day: number,
  recentCategoryVolume?: number
): number => {
  if (!_isMarketCategory(category)) return 1.0
  const info = getDailyMarketInfo(
    year,
    seasonIndex,
    day,
    recentCategoryVolume !== undefined ? { [category]: recentCategoryVolume } : undefined
  )
  return info.find(i => i.category === category)?.multiplier ?? 1.0
}

export const WS01_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '后期7日净流入 / 总资产比维持在 0.08 ~ 0.30 区间',
    '高价 sink 覆盖率至少达到 2 类常用出口',
    '周风险报告、日快照、钱包页与商圈看板口径一致',
    '旧存档缺少 economyTelemetry 时可安全回填'
  ],
  releaseAnnouncement: [
    '新增后期经济观测底座：可查看通胀压力、消耗满足度与循环多样度。',
    '钱包页与商圈看板将根据当前经营状态推荐资金去向。',
    '高价目录购买失败时会自动回滚并退款，降低坏档与吞资源风险。'
  ]
} as const

export const WS01_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws01-positive-daily-snapshot',
    title: '跨天后写入经济日快照',
    category: 'positive',
    steps: ['准备一笔出货收入', '触发跨天结算'],
    expectedResult: 'economyTelemetry.recentSnapshots 新增记录，收入/支出字段与当日实际一致。'
  },
  {
    id: 'ws01-positive-risk-report',
    title: '周切换生成经济风险报告',
    category: 'positive',
    steps: ['连续推进到新周首日', '保持高通胀或低消耗样本'],
    expectedResult: 'latestRiskReport 被更新，且日志中出现经济观测提示。'
  },
  {
    id: 'ws01-negative-catalog-refund',
    title: '高价目录购买失败自动退款',
    category: 'negative',
    steps: ['制造目录商品发放失败条件', '执行 purchaseCatalogOffer'],
    expectedResult: '目录拥有状态、背包、仓库、农舍回滚，铜钱自动退回。'
  },
  {
    id: 'ws01-boundary-old-save',
    title: '旧存档缺少经济块时安全回填',
    category: 'compatibility',
    steps: ['读取不含 economyTelemetry 的旧档'],
    expectedResult: '读档成功，economyTelemetry 使用默认结构，不报错。'
  },
  {
    id: 'ws01-boundary-passout',
    title: '昏倒罚款纳入经济支出',
    category: 'boundary',
    steps: ['令角色在日结时进入 passout', '推进到次日'],
    expectedResult: 'dailyReset 扣钱后，支出遥测和日快照同步记录该罚款。'
  },
  {
    id: 'ws01-recovery-risk-toggle',
    title: '关闭风险提示后总览仍可计算',
    category: 'recovery',
    steps: ['将 riskReportEnabled 改为 false', '读取经济总览'],
    expectedResult: '总览指标继续计算，但 latestRiskReport 对外返回 null。'
  },
  {
    id: 'ws01-ops-recommendation-tuning',
    title: '调整推荐数量与加成无需改业务逻辑',
    category: 'ops',
    steps: ['修改 ECONOMY_TUNING_CONFIG 中推荐数量和加成', '刷新商店与钱包推荐'],
    expectedResult: '推荐结果变化，但无需修改 store 主逻辑。'
  },
  {
    id: 'ws01-compatibility-theme-goals',
    title: '主题周目标池兼容长期高价 sink 目标',
    category: 'compatibility',
    steps: ['进入豪华经营周', '检查 currentThemeWeekGoals'],
    expectedResult: '长期高价 sink 目标可被纳入主题周视野，不影响旧目标加载。'
  }
]

export const WS01_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws01-check-risk-report', label: '确认经济风险周报在周切换时正常生成', owner: 'dev', done: false },
  { id: 'ws01-check-old-save', label: '确认旧存档缺少 economyTelemetry 时可安全读档', owner: 'qa', done: false },
  { id: 'ws01-check-refund', label: '确认高价目录失败路径会回滚并退款', owner: 'qa', done: false },
  { id: 'ws01-check-ui', label: '确认钱包页与商圈看板文案、指标和推荐显示正常', owner: 'qa', done: false },
  { id: 'ws01-check-tuning', label: '确认调参项可直接影响推荐数量、周报和评分', owner: 'ops', done: false },
  { id: 'ws01-check-telemetry', label: '确认日快照、周报和风险提示口径一致', owner: 'dev', done: false }
]

export const WS01_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    trigger: '目录购买异常导致玩家资产或推荐状态不一致',
    action: '回滚异常配置，补发等值铜钱或目录道具，并通过更新日志公告说明。'
  },
  {
    trigger: '风险提示误报或周报异常刷屏',
    action: '关闭 riskReportEnabled，保留底层观测，待修复后再重新开启。'
  },
  {
    trigger: '旧档读入后经济面板异常或数据为空',
    action: '发布热修默认值迁移，并提示玩家重新读档后自动修复。'
  }
]

/** 缓存 */
let _cache: { key: string; data: CategoryMarketInfo[] } | null = null

/** 获取当日所有品类行情 */
export const getDailyMarketInfo = (
  year: number,
  seasonIndex: number,
  day: number,
  recentShipping?: Partial<Record<MarketCategory, number>>
): CategoryMarketInfo[] => {
  const shipping = recentShipping ?? {}
  const key = `${year}-${seasonIndex}-${day}-${JSON.stringify(shipping)}`
  if (_cache?.key === key) return _cache.data

  const seed = year * 10000 + seasonIndex * 1000 + day * 37 + 7777
  const rng = seededRandom(seed)

  const data: CategoryMarketInfo[] = MARKET_CATEGORIES.map(category => {
    const volume = shipping[category] ?? 0
    const multiplier = _computeMultiplier(category, seasonIndex, rng, volume)
    return { category, multiplier, trend: _toTrend(multiplier) }
  })

  _cache = { key, data }
  return data
}
