/** 博物馆物品分类 */
export type MuseumCategory = 'ore' | 'gem' | 'bar' | 'fossil' | 'artifact' | 'spirit'

export type MuseumContentTier = 'P0' | 'P1' | 'P2'
export type MuseumHallZoneId = 'entry_gallery' | 'mineral_hall' | 'fossil_hall' | 'artifact_hall' | 'spirit_hall' | 'shrine_courtyard'
export type MuseumThemeMetric = 'displayRating' | 'visitorFlow' | 'scholarProgress' | 'shrineFavor'
export type MuseumVisitorBand = 'quiet' | 'steady' | 'crowded' | 'festival'
export type MuseumDisplayRatingBand = 'plain' | 'noted' | 'renowned' | 'masterwork'
export type MuseumCommissionDifficulty = 'standard' | 'advanced' | 'prestige'
export type MuseumThemeRotation = 'daily' | 'weekly' | 'seasonal'

/** 博物馆可捐赠物品定义 */
export interface MuseumItemDef {
  id: string
  name: string
  category: MuseumCategory
  /** 来源提示（未获得时显示） */
  sourceHint: string
  hallZoneId?: MuseumHallZoneId
  rarityWeight?: number
  scholarTags?: string[]
  shrineThemeTags?: string[]
}

/** 博物馆里程碑奖励 */
export interface MuseumMilestone {
  count: number
  name: string
  reward: {
    money?: number
    items?: { itemId: string; quantity: number }[]
  }
}

export interface MuseumExhibitSlotDef {
  id: string
  name: string
  hallZoneId: MuseumHallZoneId
  unlockExhibitLevel: number
  unlockHallLevel?: number
  categoryWhitelist?: MuseumCategory[]
  ratingWeight: number
  trafficWeight: number
  contentTier: MuseumContentTier
  summary: string
}

export interface MuseumExhibitSlotState {
  slotId: string
  unlocked: boolean
  assignedItemIds: string[]
  featuredThemeId: string | null
}

export interface MuseumHallLevelDef {
  hallZoneId: MuseumHallZoneId
  level: number
  unlockExhibitLevel: number
  requiredDonatedCount: number
  requiredCategoryCoverage: number
  slotCapacity: number
  visitorFlowBonusRate: number
  displayRatingBonus: number
  unlockSummary: string
  contentTier: MuseumContentTier
}

export interface MuseumHallProgress {
  hallZoneId: MuseumHallZoneId
  level: number
  lastUpgradeDayTag?: string
}

export interface MuseumScholarCommissionDef {
  id: string
  title: string
  hallZoneId: MuseumHallZoneId
  difficulty: MuseumCommissionDifficulty
  variantGroup?: 'mineral' | 'fossil' | 'artifact' | 'spirit'
  unlockExhibitLevel: number
  requiredHallLevel: number
  preferredCategories: MuseumCategory[]
  requiredDonationCount: number
  ratingTarget: number
  trafficTarget: number
  durationDays: number
  linkedRouteLabels?: string[]
  rewardTierId?: string
  reward: {
    money?: number
    reputation?: number
    items?: { itemId: string; quantity: number }[]
  }
  contentTier: MuseumContentTier
  summary: string
}

export interface MuseumScholarCommissionState {
  id: string
  acceptedDayTag?: string
  progress: number
  completed: boolean
  rewarded: boolean
  expired: boolean
}

export interface MuseumShrineThemeDef {
  id: string
  name: string
  hallZoneId: MuseumHallZoneId
  rotation: MuseumThemeRotation
  unlockExhibitLevel: number
  requiredSpiritDonations: number
  favoredCategories: MuseumCategory[]
  ratingBonus: number
  trafficBonusRate: number
  scholarBonusRate: number
  contentTier: MuseumContentTier
  summary: string
}

export interface MuseumShrineThemeState {
  unlockedThemeIds: string[]
  activeThemeId: string | null
  lastRotationDayTag: string
  activationCounts: Record<string, number>
}

export interface MuseumVisitorFlowBandDef {
  id: MuseumVisitorBand
  name: string
  minScore: number
  maxScore?: number
  trafficMultiplier: number
  displayRatingBonus: number
  summary: string
  contentTier: MuseumContentTier
}

export interface MuseumVisitorFlowState {
  score: number
  bandId: MuseumVisitorBand
  baseVisitors: number
  bonusVisitors: number
}

export interface MuseumDisplayRatingBandDef {
  id: MuseumDisplayRatingBand
  name: string
  minScore: number
  maxScore?: number
  visitorFlowBonusRate: number
  scholarAttractionRate: number
  summary: string
  contentTier: MuseumContentTier
}

export interface MuseumDisplayRatingBreakdown {
  key: string
  label: string
  value: number
}

export interface MuseumDisplayRatingState {
  score: number
  bandId: MuseumDisplayRatingBand
  breakdown: MuseumDisplayRatingBreakdown[]
}

export interface MuseumFutureHook {
  id: string
  label: string
  description: string
  targetTier: MuseumContentTier
}

export interface MuseumOperationalConfig {
  saveVersion: number
  defaultContentTier: MuseumContentTier
  tierLabels: Record<MuseumContentTier, string>
  tierRoadmap: Record<MuseumContentTier, string>
  futureHooks: MuseumFutureHook[]
  baseExhibitSlotCapacity: number
  defaultHallLevel: number
  defaultVisitorFlow: number
  defaultDisplayRating: number
  defaultScholarProgress: number
  defaultShrineFavor: number
  exhibitSlots: MuseumExhibitSlotDef[]
  hallLevels: MuseumHallLevelDef[]
  scholarCommissions: MuseumScholarCommissionDef[]
  shrineThemes: MuseumShrineThemeDef[]
  visitorFlowBands: MuseumVisitorFlowBandDef[]
  displayRatingBands: MuseumDisplayRatingBandDef[]
}

export interface MuseumTelemetryState {
  saveVersion: number
  visitorFlow: MuseumVisitorFlowState
  displayRating: MuseumDisplayRatingState
  scholarProgress: number
  shrineFavor: number
}

export interface MuseumSaveData {
  saveVersion: number
  donatedItems: string[]
  claimedMilestones: number[]
  exhibitSlotStates: Record<string, MuseumExhibitSlotState>
  hallProgress: Record<MuseumHallZoneId, MuseumHallProgress>
  scholarCommissionStates: Record<string, MuseumScholarCommissionState>
  shrineThemeState: MuseumShrineThemeState
  telemetry: MuseumTelemetryState
}

export type MuseumAuditMetricDirection = 'higher_is_better' | 'higher_is_worse' | 'lower_is_better' | 'lower_is_worse' | 'target_range'

export interface MuseumAuditMetricThresholds {
  watch?: number
  warning?: number
  critical?: number
  targetMin?: number
  targetMax?: number
}

export interface MuseumAuditMetricDef {
  id: string
  label: string
  description: string
  formula: string
  direction: MuseumAuditMetricDirection
  dataSources: string[]
  thresholds: MuseumAuditMetricThresholds
  anomalyRule: string
}

export interface MuseumAuditPlayerSegmentDef {
  id: string
  label: string
  description: string
  donatedCountMin: number
  categoryCoverageMin: number
  spiritDonationMin: number
  recommendedFocus: string
}

export interface MuseumAuditRollbackRule {
  id: string
  label: string
  condition: string
  fallbackAction: string
}

export type MuseumLinkedSystemKey = 'quest' | 'villageProject' | 'npc' | 'goal'

export interface MuseumLinkedSystemContext {
  key: MuseumLinkedSystemKey
  label: string
  relationship: string
  primarySignals: string[]
}

export interface MuseumAuditBaselineSummary {
  currentState: string[]
  targetPlayers: string[]
  painPoints: string[]
  successSignals: string[]
}

export interface MuseumSustainedOperationAuditConfig {
  baselineSummary: MuseumAuditBaselineSummary
  coreMetrics: MuseumAuditMetricDef[]
  guardrailMetrics: MuseumAuditMetricDef[]
  playerSegments: MuseumAuditPlayerSegmentDef[]
  rollbackRules: MuseumAuditRollbackRule[]
  linkedSystems: MuseumLinkedSystemContext[]
}
