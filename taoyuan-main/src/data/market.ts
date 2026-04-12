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

export interface MarketDynamicsTuningConfig {
  phaseEnabled: Record<MarketDynamicsPhaseId, boolean>
  hiddenHotspotCategories: MarketCategory[]
  disabledRegionalDistrictIds: string[]
  disabledRouteIds: string[]
  forcedRecommendedRouteIds: string[]
  featureOverrides: Partial<Record<MarketDynamicsPhaseId, Partial<MarketPhaseFeatureFlags>>>
  hotspotCategoryScoreBonuses: Partial<Record<MarketCategory, number>>
  regionalProcurementRewardMultiplierOffset: number
  overflowPenaltyMultiplierOffset: number
  themeRewardMultiplierOffset: number
  substituteRewardValueOffset: number
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

export interface MarketHotspotContentDef {
  id: string
  category: MarketCategory
  contentTier: EconomyContentTier
  label: string
  description: string
  recommendedCatalogTags: string[]
  linkedSystems: EconomySystemKey[]
  suggestedOfferIds: string[]
  suggestedQuestTags: string[]
  operatorNotes: string[]
}

export interface MarketRegionalDistrictContentDef {
  id: string
  label: string
  contentTier: EconomyContentTier
  description: string
  targetCategories: MarketCategory[]
  recommendedCatalogTags: string[]
  suggestedOfferIds: string[]
  suggestedQuestTags: string[]
  logisticsCostBand: [number, number]
  operatorNotes: string[]
}

export interface MarketThemeActivityContentDef {
  themeWeekId: string
  contentTier: EconomyContentTier
  label: string
  description: string
  encouragedCategories: MarketCategory[]
  encouragedTags: string[]
  suggestedOfferIds: string[]
  linkedSystems: EconomySystemKey[]
  rewardHooks: string[]
}

export interface MarketSubstituteRewardContentDef {
  id: string
  rewardType: MarketSubstituteRewardType
  contentTier: EconomyContentTier
  label: string
  description: string
  fromCategories: MarketCategory[]
  toCategories: MarketCategory[]
  suggestedOfferIds: string[]
  linkedSystems: EconomySystemKey[]
  rewardValueBand: [number, number]
}

export interface MarketOverflowResponseDef {
  bandId: string
  contentTier: EconomyContentTier
  label: string
  description: string
  mitigationSteps: string[]
  suggestedOfferIds: string[]
  suggestedRouteIds: string[]
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

export interface MarketDynamicsOperationalMeta {
  lastShippingSettlementDayKey: string
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
  operationalMeta: MarketDynamicsOperationalMeta
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

export const MARKET_DYNAMICS_TUNING_CONFIG: MarketDynamicsTuningConfig = {
  phaseEnabled: {
    p0_hotspot_seed: true,
    p1_regional_rotation: true,
    p2_theme_conversion: true
  },
  hiddenHotspotCategories: [],
  disabledRegionalDistrictIds: [],
  disabledRouteIds: [],
  forcedRecommendedRouteIds: [],
  featureOverrides: {},
  hotspotCategoryScoreBonuses: {},
  regionalProcurementRewardMultiplierOffset: 0,
  overflowPenaltyMultiplierOffset: 0,
  themeRewardMultiplierOffset: 0,
  substituteRewardValueOffset: 0
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
  substituteRewards: [],
  operationalMeta: {
    lastShippingSettlementDayKey: ''
  }
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
  },
  {
    id: 'mid_market_notice_board',
    tier: 'mid_transition',
    name: '行情告示牌承包',
    category: 'service',
    priceBand: [2200, 5200],
    linkedSystems: ['market', 'goal', 'shop'],
    unlockMetrics: ['totalMoneyEarned', 'discoveredCount'],
    valueFlow: ['把上涨 / 下跌品类提示从随机感受变成可解释的经营板报', '为热点轮换与主题周提示提供清晰入口'],
    sinkFlow: ['行情抄录费', '市集告示维护费'],
    showcaseHook: '帮助玩家先学会“为什么这周要换品类”，再推进更高阶的地区收购和主题转化'
  },
  {
    id: 'late_processing_futures_board',
    tier: 'late_growth',
    name: '加工远期订货牌',
    category: 'specialOrder',
    priceBand: [12000, 26000],
    linkedSystems: ['market', 'quest', 'goal', 'shop'],
    unlockMetrics: ['totalMoneyEarned', 'totalRecipesCooked'],
    valueFlow: ['把 processed 热点、矿石/鱼类补货与特殊订单绑定成多段经营链', '引导玩家从现货卖货切换到“先加工再择机出货”'],
    sinkFlow: ['订货押金', '加工排产权'],
    showcaseHook: '为后期玩家提供更稳定的“热点 → 加工 → 订单”承接层'
  },
  {
    id: 'late_overflow_conversion_warehouse',
    tier: 'late_growth',
    name: '过剩转运缓冲仓',
    category: 'maintenance',
    priceBand: [9800, 22000],
    linkedSystems: ['market', 'wallet', 'goal', 'shop'],
    unlockMetrics: ['totalMoneyEarned', 'friendlyNpcCount'],
    valueFlow: ['把过剩压制改写为可管理的转运成本，而不是纯削售价', '为地区收购与替代奖励提供稳定缓冲'],
    sinkFlow: ['冷藏转运费', '缓冲仓维护费'],
    showcaseHook: '让“库存太多怎么办”变成经营题，而不是惩罚题'
  },
  {
    id: 'endgame_cross_region_expo_license',
    tier: 'endgame_showcase',
    name: '跨域行情博览执照',
    category: 'themeActivity',
    priceBand: [42000, 110000],
    linkedSystems: ['market', 'quest', 'goal', 'shop', 'villageProject'],
    unlockMetrics: ['totalMoneyEarned', 'friendlyNpcCount', 'highestMineFloor'],
    valueFlow: ['把地区收购、热点轮换与主题周转成终局级展示活动', '强迫玩家在多品类库存与多系统订单间做年度级取舍'],
    sinkFlow: ['跨域参展费', '行会摊位租赁', '高规格物流预算'],
    showcaseHook: '作为 WS04 终局可持续活动池，承接高通胀玩家的长期预算与展示诉求'
  }
]

export const MARKET_HOTSPOT_CONTENT_DEFS: MarketHotspotContentDef[] = [
  {
    id: 'hotspot_crop_rotation',
    category: 'crop',
    contentTier: 'mid_transition',
    label: '田作轮换热点',
    description: '围绕春种、夏收、秋储建立作物热点，让玩家学会按季节切换主力卖货作物。',
    recommendedCatalogTags: ['功能商品', '灌溉', '每周精选'],
    linkedSystems: ['market', 'shop', 'goal'],
    suggestedOfferIds: ['func_field_irrigation_pack', 'weekly_irrigation_case', 'spring_seed_bundle'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合在 P0 强化上涨品类感知', '推荐与春种主题周、豪华经营周一起出现']
  },
  {
    id: 'hotspot_fish_rotation',
    category: 'fish',
    contentTier: 'mid_transition',
    label: '渔获轮换热点',
    description: '聚焦钓鱼、蟹笼与鱼塘供货，把上涨鱼类转成夏渔主题周和地区收购入口。',
    recommendedCatalogTags: ['渔具', '鱼塘', '每周精选'],
    linkedSystems: ['market', 'shop', 'goal'],
    suggestedOfferIds: ['func_angler_pack', 'weekly_pond_care_pack', 'summer_fishing_pack'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合与夏渔主题周绑定', '避免 fish 长期成为单一路线时可触发过剩压制']
  },
  {
    id: 'hotspot_processed_rotation',
    category: 'processed',
    contentTier: 'late_growth',
    label: '加工品溢价热点',
    description: '让加工品在特定周成为高溢价货物，推动玩家先加工、再择时出货。',
    recommendedCatalogTags: ['材料包', '功能商品', '高价长期商品'],
    linkedSystems: ['market', 'quest', 'goal', 'shop'],
    suggestedOfferIds: ['func_builder_pack', 'weekly_caravan_supply_crate', 'premium_expedition_cache'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合承接秋收加工周', '可与地区收购和高价值订单同步抬升']
  },
  {
    id: 'hotspot_fruit_rotation',
    category: 'fruit',
    contentTier: 'late_growth',
    label: '果品节庆热点',
    description: '把水果热点与节庆礼盒、宴席订单相连，让果树线不再只是被动出货。',
    recommendedCatalogTags: ['节庆', '收藏', '功能商品'],
    linkedSystems: ['market', 'goal', 'shop'],
    suggestedOfferIds: ['weekly_tavern_gift', 'premium_midautumn_banquet', 'autumn_harvest_pack'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合与秋宴和豪华经营周共振', '可作为替代奖励的优先转化方向']
  },
  {
    id: 'hotspot_ore_rotation',
    category: 'ore',
    contentTier: 'late_growth',
    label: '矿料军需热点',
    description: '围绕矿石、金属锭与矿洞补给建立轮换热点，让冬矿周具备明确备货目标。',
    recommendedCatalogTags: ['矿洞', '材料包', '每周精选'],
    linkedSystems: ['market', 'quest', 'goal', 'shop'],
    suggestedOfferIds: ['weekly_mining_supply', 'premium_expedition_cache', 'premium_warehouse_charter'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合与冬矿挑战周配合', '在 ore 过剩时优先推地区收购承接']
  },
  {
    id: 'hotspot_gem_rotation',
    category: 'gem',
    contentTier: 'endgame_showcase',
    label: '珍宝展示热点',
    description: '把宝石与展示、节庆、终局博览绑定，使其成为终局展示与主题消费原料。',
    recommendedCatalogTags: ['高价长期商品', '收藏', '每周精选'],
    linkedSystems: ['market', 'goal', 'shop', 'quest'],
    suggestedOfferIds: ['premium_golden_frame', 'premium_courtyard_stage', 'premium_midautumn_banquet'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合 P2 主题转化阶段作为 showcase 热点', '可与主题博览会与跨域博览执照共用奖励解释']
  },
  {
    id: 'hotspot_animal_product_rotation',
    category: 'animal_product',
    contentTier: 'late_growth',
    label: '牧养供货热点',
    description: '让畜产品在部分周次转为地区收购与料理订单的核心供给，补足非种植路线。',
    recommendedCatalogTags: ['牧场', '材料包', '功能商品'],
    linkedSystems: ['market', 'quest', 'shop'],
    suggestedOfferIds: ['func_ranch_pack', 'premium_ranch_starter', 'weekly_caravan_supply_crate'],
    suggestedQuestTags: ['breeding'],
    operatorNotes: ['适合和加工品热点形成双路线运营', '防止动物线在后期彻底失去存在感']
  }
]

export const MARKET_REGIONAL_DISTRICT_DEFS: MarketRegionalDistrictContentDef[] = [
  {
    id: 'jiangnan_wharf',
    label: '江南埠头',
    contentTier: 'mid_transition',
    description: '偏好鲜货与水产，适合承接鱼类、水果与轻加工货。',
    targetCategories: ['fish', 'fruit', 'processed'],
    recommendedCatalogTags: ['渔具', '鱼塘', '每周精选'],
    suggestedOfferIds: ['func_angler_pack', 'weekly_pond_care_pack', 'summer_fishing_pack'],
    suggestedQuestTags: ['breeding'],
    logisticsCostBand: [1800, 5200],
    operatorNotes: ['适合 P0/P1 引导玩家理解地区收购', '与夏渔、秋收加工周兼容度高']
  },
  {
    id: 'mountain_route',
    label: '山路驿站',
    contentTier: 'late_growth',
    description: '偏好矿料、木材与高耐储物资，适合矿洞和采集线转运。',
    targetCategories: ['ore', 'processed', 'crop'],
    recommendedCatalogTags: ['矿洞', '材料包', '仓储'],
    suggestedOfferIds: ['weekly_mining_supply', 'premium_expedition_cache', 'premium_warehouse_charter'],
    suggestedQuestTags: ['breeding'],
    logisticsCostBand: [4200, 9800],
    operatorNotes: ['适合与冬矿挑战周配合', '可作为过剩矿料的优先转运出口']
  },
  {
    id: 'capital_exchange',
    label: '京市行会',
    contentTier: 'endgame_showcase',
    description: '偏好加工品、宝石与高规格宴席材料，是终局高价单的核心去向。',
    targetCategories: ['processed', 'gem', 'animal_product'],
    recommendedCatalogTags: ['高价长期商品', '收藏', '功能商品'],
    suggestedOfferIds: ['premium_midautumn_banquet', 'premium_golden_frame', 'premium_courtyard_stage'],
    suggestedQuestTags: ['breeding'],
    logisticsCostBand: [8800, 22000],
    operatorNotes: ['适合作为 P2 主题转化阶段的主舞台', '可承接豪华经营周和终局博览会']
  },
  {
    id: 'hanhai_trade_post',
    label: '瀚海互市',
    contentTier: 'endgame_showcase',
    description: '偏好耐储、高价值与异域感品类，适合跨系统库存消化与终局收购。',
    targetCategories: ['gem', 'ore', 'fruit', 'processed'],
    recommendedCatalogTags: ['高价长期商品', '材料包', '仓储'],
    suggestedOfferIds: ['premium_expedition_cache', 'premium_warehouse_expansion_xl', 'weekly_caravan_supply_crate'],
    suggestedQuestTags: ['breeding'],
    logisticsCostBand: [12000, 28000],
    operatorNotes: ['适合与瀚海终局循环联动', '优先承接高通胀阶段的跨域库存压力']
  }
]

export const MARKET_DISTRICT_LABELS = Object.fromEntries(
  MARKET_REGIONAL_DISTRICT_DEFS.map(def => [def.id, def.label])
) as Record<string, string>

export const MARKET_THEME_ACTIVITY_CONTENT_DEFS: MarketThemeActivityContentDef[] = [
  {
    themeWeekId: 'spring_sowing',
    contentTier: 'mid_transition',
    label: '春种热点经营包',
    description: '用耕作热点 + 灌溉补给带出第一条市场轮换路线。',
    encouragedCategories: ['crop', 'fruit'],
    encouragedTags: ['功能商品', '灌溉', '每周精选'],
    suggestedOfferIds: ['func_field_irrigation_pack', 'spring_seed_bundle', 'weekly_inventory_bag'],
    linkedSystems: ['market', 'goal', 'shop'],
    rewardHooks: ['上涨作物更易进入热点', '鼓励把春耕预算转成基础经营投入']
  },
  {
    themeWeekId: 'summer_fishing',
    contentTier: 'mid_transition',
    label: '夏渔轮换经营包',
    description: '把鱼类热点、水产补给与鱼塘经营串成同一周节奏。',
    encouragedCategories: ['fish', 'processed'],
    encouragedTags: ['渔具', '鱼塘', '每周精选'],
    suggestedOfferIds: ['func_angler_pack', 'weekly_pond_care_pack', 'summer_fishing_pack'],
    linkedSystems: ['market', 'goal', 'shop'],
    rewardHooks: ['热点鱼类更容易获得主题周承接', '替代奖励优先指向鱼塘与补给']
  },
  {
    themeWeekId: 'autumn_processing',
    contentTier: 'late_growth',
    label: '秋收加工变现包',
    description: '强调加工品热点、材料补货与宴席料理的高价窗口。',
    encouragedCategories: ['processed', 'fruit', 'animal_product'],
    encouragedTags: ['材料包', '功能商品', '高价长期商品'],
    suggestedOfferIds: ['func_builder_pack', 'autumn_harvest_pack', 'weekly_caravan_supply_crate'],
    linkedSystems: ['market', 'goal', 'quest', 'shop'],
    rewardHooks: ['加工品上涨时优先投放高价值订单', '主题奖励更适合转成变现型投入']
  },
  {
    themeWeekId: 'winter_mining',
    contentTier: 'late_growth',
    label: '冬矿备货经营包',
    description: '通过矿石热点、库存缓冲与矿洞补给打散单刷矿洞的路径。',
    encouragedCategories: ['ore', 'gem', 'processed'],
    encouragedTags: ['矿洞', '每周精选', '材料包'],
    suggestedOfferIds: ['weekly_mining_supply', 'premium_expedition_cache', 'premium_warehouse_charter'],
    linkedSystems: ['market', 'goal', 'quest', 'shop'],
    rewardHooks: ['过剩矿料优先承接到地区收购', '冬矿周更强调库存管理和择机出货']
  },
  {
    themeWeekId: 'late_sink_rotation',
    contentTier: 'endgame_showcase',
    label: '豪华经营转化包',
    description: '把高价目录、市场热点与终局博览会绑定成真正的资产消化周。',
    encouragedCategories: ['processed', 'gem', 'fruit', 'fish'],
    encouragedTags: ['高价长期商品', '每周精选', '功能商品'],
    suggestedOfferIds: ['premium_warehouse_charter', 'premium_courtyard_stage', 'premium_midautumn_banquet'],
    linkedSystems: ['market', 'goal', 'quest', 'shop', 'villageProject'],
    rewardHooks: ['终局上涨品类更易转为主题活动承接', '替代奖励与地区收购会更偏向高价展示路线']
  }
]

export const MARKET_SUBSTITUTE_REWARD_CONTENT_DEFS: MarketSubstituteRewardContentDef[] = [
  {
    id: 'substitute_price_support_bundle',
    rewardType: 'price_support',
    contentTier: 'mid_transition',
    label: '稳价回购券',
    description: '在过剩品类下跌时，为替代路线提供短期稳价扶持。',
    fromCategories: ['crop', 'fish'],
    toCategories: ['processed', 'fruit'],
    suggestedOfferIds: ['func_builder_pack', 'weekly_inventory_bag'],
    linkedSystems: ['market', 'goal', 'shop'],
    rewardValueBand: [1, 1.5]
  },
  {
    id: 'substitute_catalog_boost_bundle',
    rewardType: 'catalog_boost',
    contentTier: 'late_growth',
    label: '目录承接加成',
    description: '把市场替代路线引导到每周精选、补给包与仓储扩建消费上。',
    fromCategories: ['crop', 'ore', 'fish'],
    toCategories: ['processed', 'animal_product', 'fruit'],
    suggestedOfferIds: ['weekly_caravan_supply_crate', 'weekly_chest_deed', 'weekly_pond_care_pack'],
    linkedSystems: ['market', 'shop', 'goal'],
    rewardValueBand: [1.5, 2.5]
  },
  {
    id: 'substitute_quest_bonus_bundle',
    rewardType: 'quest_bonus',
    contentTier: 'late_growth',
    label: '订单改道红利',
    description: '把下跌品类转换为地区收购或高价值订单的加成入口。',
    fromCategories: ['ore', 'animal_product', 'fruit'],
    toCategories: ['processed', 'gem', 'fish'],
    suggestedOfferIds: ['weekly_mining_supply', 'premium_ranch_starter', 'premium_expedition_cache'],
    linkedSystems: ['market', 'quest', 'goal'],
    rewardValueBand: [2, 3]
  },
  {
    id: 'substitute_reputation_bonus_bundle',
    rewardType: 'reputation_bonus',
    contentTier: 'endgame_showcase',
    label: '行会声望转化',
    description: '在终局阶段把替代路线转成声望与展示型收益，支撑高价经营周。',
    fromCategories: ['processed', 'gem'],
    toCategories: ['fruit', 'fish', 'animal_product'],
    suggestedOfferIds: ['premium_courtyard_stage', 'premium_midautumn_banquet', 'premium_golden_frame'],
    linkedSystems: ['market', 'goal', 'shop', 'quest'],
    rewardValueBand: [2.5, 4]
  }
]

export const MARKET_OVERFLOW_RESPONSE_DEFS: MarketOverflowResponseDef[] = [
  {
    bandId: 'overflow_warning',
    contentTier: 'mid_transition',
    label: '轻度过剩应对',
    description: '通过改卖上涨品类与补充基础补给，温和打散单一路线。',
    mitigationSteps: ['优先切向本周热点品类', '用每周精选和基础补给包减少裸卖货', '避免继续向同一品类集中出货'],
    suggestedOfferIds: ['weekly_inventory_bag', 'func_builder_pack', 'func_angler_pack'],
    suggestedRouteIds: ['route_hotspot_rotation']
  },
  {
    bandId: 'overflow_strong',
    contentTier: 'late_growth',
    label: '明显过剩应对',
    description: '通过地区收购、缓冲仓与订单承接把库存转出当前下跌路线。',
    mitigationSteps: ['优先承接地区收购合同', '把库存转成加工品或高价值订单', '必要时投入稳价准备金或缓冲仓维护'],
    suggestedOfferIds: ['weekly_chest_deed', 'weekly_caravan_supply_crate', 'premium_warehouse_charter'],
    suggestedRouteIds: ['route_regional_demand_bridge']
  },
  {
    bandId: 'overflow_crisis',
    contentTier: 'endgame_showcase',
    label: '严重过剩应对',
    description: '在终局阶段把库存压力转成主题周展示、博览会和高价 sink 预算。',
    mitigationSteps: ['停止继续向危机品类追加供给', '优先把存量改投主题周和终局展示路线', '把预算转进高价目录与跨域博览会承接'],
    suggestedOfferIds: ['premium_midautumn_banquet', 'premium_courtyard_stage', 'premium_expedition_cache'],
    suggestedRouteIds: ['route_theme_sink_conversion']
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

export const WS04_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '同一日重复触发市场 tick 或出货结算时，不会重复刷新热点、重复结算收入或重复写日志',
    '可通过配置快速停用某个市场阶段、地区收购区块或指定路线推荐',
    '过剩压制、主题鼓励、替代奖励与地区收购均可通过 data 层参数热调，无需改业务逻辑',
    '市场异常时可通过回退阶段 / 关闭路线 / 关闭区块实现软回滚，不破坏既有存档'
  ],
  releaseAnnouncement: [
    '新增市场轮换运营开关，可快速调整热点、地区收购、过剩压制与主题鼓励强度。',
    '新增市场结算幂等保护，避免重复结算导致收入与行情样本异常。',
    '新增市场 QA / 补偿预案，便于上线后快速回滚异常行情活动。'
  ]
} as const

export const WS04_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws04-idempotent-market-tick',
    title: '同日重复触发市场 tick 不会重复刷新',
    category: 'boundary',
    steps: ['记录当日热点与地区收购状态', '重复调用 processMarketDynamicsTick 两次'],
    expectedResult: '热点、地区收购、替代奖励与日志数量保持不变。'
  },
  {
    id: 'ws04-idempotent-shipping-settlement',
    title: '同日重复触发出货箱结算不会重复发钱',
    category: 'boundary',
    steps: ['向出货箱放入货物', '调用 settleShippingBoxWithMarketGuard 两次'],
    expectedResult: '仅第一次发放收入并写入市场样本，第二次返回 skipped。'
  },
  {
    id: 'ws04-rollback-shipping-settlement',
    title: '出货箱结算异常时自动回滚',
    category: 'negative',
    steps: ['制造结算过程中异常', '执行 settleShippingBoxWithMarketGuard'],
    expectedResult: '玩家铜钱、出货箱、出货历史与市场状态恢复到结算前快照。'
  },
  {
    id: 'ws04-ops-disable-phase',
    title: '运营可关闭指定市场阶段',
    category: 'ops',
    steps: ['将 phaseEnabled.p2_theme_conversion 设为 false', '尝试切换至高通胀阶段'],
    expectedResult: '系统回退到最近可用阶段，不进入被关闭的阶段。'
  },
  {
    id: 'ws04-ops-disable-route',
    title: '运营可下掉指定路线推荐',
    category: 'ops',
    steps: ['将某 routeId 写入 disabledRouteIds', '刷新推荐路线'],
    expectedResult: '对应路线不再出现在 recommendedMarketDynamicsRoutes 中。'
  },
  {
    id: 'ws04-ops-hide-district',
    title: '运营可关闭指定地区收购池',
    category: 'ops',
    steps: ['将某 districtId 写入 disabledRegionalDistrictIds', '推进到新周'],
    expectedResult: '新周地区收购不再使用被关闭的地区。'
  },
  {
    id: 'ws04-compat-old-save',
    title: '旧档缺少 market operationalMeta 时可安全读取',
    category: 'compatibility',
    steps: ['读取缺少 operationalMeta 的旧 marketDynamics 存档'],
    expectedResult: '读档成功，lastShippingSettlementDayKey 自动回填为空字符串。'
  },
  {
    id: 'ws04-theme-route-fallback',
    title: '主题周缺失时路线推荐仍可正常工作',
    category: 'recovery',
    steps: ['清空 currentThemeWeek', '刷新 marketDynamicsOverview 与推荐路线'],
    expectedResult: 'optional / recommended 路线仍按市场热点与经营分层正常输出。'
  }
]

export const WS04_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws04-check-phase-switch', label: '确认高通胀周会自动切换到正确市场阶段', owner: 'dev', done: false },
  { id: 'ws04-check-idempotent-settlement', label: '确认出货箱同日不会重复结算', owner: 'qa', done: false },
  { id: 'ws04-check-route-toggle', label: '确认禁用路线 / 强制路线配置会实时影响推荐结果', owner: 'ops', done: false },
  { id: 'ws04-check-district-toggle', label: '确认地区收购池可按 districtId 快速关闭', owner: 'ops', done: false },
  { id: 'ws04-check-old-save', label: '确认旧档缺少 market operationalMeta 仍可安全读档', owner: 'qa', done: false },
  { id: 'ws04-check-ui-summary', label: '确认商圈看板与顶部目标摘要文案与实际市场状态一致', owner: 'qa', done: false }
]

export const WS04_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    trigger: '市场阶段或地区收购异常导致重复结算 / 重复收益',
    action: '关闭对应 phase 或 district 配置，回滚异常参数，并按异常期间重复收益折算补偿 / 扣回公告。'
  },
  {
    trigger: '过剩压制系数过强导致玩家大面积停摆',
    action: '回退 overflowPenaltyMultiplierOffset 与对应 band 配置，仅保留热点提示与主题鼓励，并发放稳价补贴公告。'
  },
  {
    trigger: '路线推荐错误导致玩家误判经营方向',
    action: '临时下线对应 routeId，改用 forcedRecommendedRouteIds 推送安全路线，并通过更新日志说明修正。'
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
