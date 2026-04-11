export type GoalMetricKey =
  | 'totalMoneyEarned'
  | 'totalCropsHarvested'
  | 'totalFishCaught'
  | 'totalRecipesCooked'
  | 'highestMineFloor'
  | 'friendlyNpcCount'
  | 'farmhouseLevel'
  | 'completedBundles'
  | 'discoveredCount'
  | 'crabPotCount'
  | 'childCount'
  | 'caveUnlocked'
  | 'villageProjectLevel'
  | 'hanhaiContractCompletions'
  | 'museumExhibitLevel'
  | 'familyWishCompletions'

export interface GoalRewardItem {
  itemId: string
  quantity: number
}

export interface GoalReward {
  money?: number
  reputation?: number
  items?: GoalRewardItem[]
  unlockHint?: string
}

export interface GoalTemplate {
  id: string
  title: string
  description: string
  metric: GoalMetricKey
  targetValue: number
  reward: GoalReward
}

export type GoalSource = 'random' | 'season' | 'archetype_bias'

export type GoalBiasTag = 'cashflow' | 'farming' | 'fishing' | 'mining' | 'cooking' | 'social' | 'discovery'

export interface GoalBiasRule {
  id: string
  label: string
  description: string
  biasTags: GoalBiasTag[]
  metrics?: GoalMetricKey[]
  weight: number
}

export interface GapCorrectionRule {
  id: string
  label: string
  description: string
  metric: GoalMetricKey
  recommendedCatalogTags?: string[]
}

export interface GoalUiMeta {
  shortTitle?: string
  categoryTag?: string
  progressUnit?: string
  panelBadge?: string
  recommendedReason?: string
}

export interface GoalState extends GoalTemplate {
  baselineValue: number
  completed: boolean
  rewarded: boolean
  source: GoalSource
}

export interface MainQuestStageTemplate {
  id: number
  title: string
  description: string
  conditions: GoalTemplate[]
  reward: GoalReward
}

export interface MainQuestStageState {
  id: number
  title: string
  description: string
  conditions: GoalState[]
  completed: boolean
  rewarded: boolean
  reward: GoalReward
}

export interface ThemeWeekDef {
  id: string
  name: string
  description: string
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  recommendedCatalogTags?: string[]
  focusMetrics: GoalMetricKey[]
  rewardPreview?: ThemeWeekRewardPreview
  ui?: ThemeWeekUiMeta
  relatedBiasRules?: string[]
  preferredQuestThemeTag?: 'breeding'
  breedingFocusLabel?: string
  breedingFocusDescription?: string
  breedingFocusHybridIds?: string[]
  museumFocusHallZoneIds?: Array<'entry_gallery' | 'mineral_hall' | 'fossil_hall' | 'artifact_hall' | 'spirit_hall' | 'shrine_courtyard'>
  museumFocusThemeIds?: string[]
  museumFocusScholarCommissionIds?: string[]
}

export interface ThemeWeekState {
  id: string
  startDay: number
  endDay: number
}

export interface ThemeWeekRewardPreview {
  label: string
  description: string
  recommendedOfferIds?: string[]
}

export interface ThemeWeekUiMeta {
  badgeText?: string
  summaryLabel?: string
  bannerTone?: 'accent' | 'success' | 'warning'
}

export type EconomyMetricDirection = 'higher_is_worse' | 'lower_is_worse' | 'target_range'

export type EconomyRiskLevel = 'healthy' | 'watch' | 'warning' | 'critical'

export type EconomyFlowKind = 'income' | 'expense'

export type EconomySystemKey = 'breeding' | 'shop' | 'goal' | 'quest' | 'achievement' | 'villageProject' | 'wallet' | 'market' | 'system' | 'fishPond'

export type EconomySinkCategory = 'construction' | 'luxuryCatalog' | 'maintenance' | 'themeActivity' | 'specialOrder' | 'service'

export interface EconomyLinkedSystemNote {
  system: EconomySystemKey
  label: string
  touchpoints: string[]
  whyItMatters: string
}

export interface EconomyMetricThresholds {
  watch?: number
  warning?: number
  critical?: number
  targetMin?: number
  targetMax?: number
}

export interface EconomyMetricDef {
  id: string
  label: string
  description: string
  formula: string
  direction: EconomyMetricDirection
  dataSources: string[]
  thresholds: EconomyMetricThresholds
  anomalyRule: string
}

export interface EconomyPlayerSegmentDef {
  id: string
  label: string
  description: string
  disposableMoneyMin: number
  inflationPressureMin: number
  recommendedFocus: string
}

export interface EconomyRollbackRule {
  id: string
  label: string
  condition: string
  fallbackAction: string
}

export interface EconomyAuditConfig {
  coreMetrics: EconomyMetricDef[]
  guardrailMetrics: EconomyMetricDef[]
  playerSegments: EconomyPlayerSegmentDef[]
  rollbackRules: EconomyRollbackRule[]
  linkedSystems: EconomySystemKey[]
  linkedSystemNotes?: EconomyLinkedSystemNote[]
}

export interface EconomyLedgerBucket {
  total: number
  bySystem: Partial<Record<EconomySystemKey, number>>
}

export interface EconomySinkSpendBucket {
  total: number
  byCategory: Partial<Record<EconomySinkCategory, number>>
}

export interface EconomyRiskReport {
  level: EconomyRiskLevel
  triggeredMetricIds: string[]
  summary: string
}

export interface EconomyDailySnapshot {
  dayTag: string
  disposableMoney: number
  totalIncome: number
  totalExpense: number
  sinkSpend: number
  dominantIncomeSystem?: EconomySystemKey
  participatingSystems: EconomySystemKey[]
  highValueOrderTypes?: number
  incomeBySystem?: Partial<Record<EconomySystemKey, number>>
  expenseBySystem?: Partial<Record<EconomySystemKey, number>>
  activeSinkCategories?: EconomySinkCategory[]
}

export interface EconomyTelemetryState {
  saveVersion: number
  lastAuditDayTag: string
  currentSegmentId: string
  recentSnapshots: EconomyDailySnapshot[]
  lifetimeIncome: EconomyLedgerBucket
  lifetimeExpense: EconomyLedgerBucket
  lifetimeSinkSpend: EconomySinkSpendBucket
  latestRiskReport: EconomyRiskReport | null
}
