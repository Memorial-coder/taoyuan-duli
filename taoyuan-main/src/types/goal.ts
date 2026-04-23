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

export type GoalSource = 'random' | 'season' | 'weekly' | 'archetype_bias'

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
  weekOfSeason: 1 | 2 | 3 | 4
  recommendedCatalogTags?: string[]
  focusMetrics: GoalMetricKey[]
  rewardPreview?: ThemeWeekRewardPreview
  ui?: ThemeWeekUiMeta
  relatedBiasRules?: string[]
  preferredQuestThemeTag?: 'breeding' | 'fishpond'
  breedingFocusLabel?: string
  breedingFocusDescription?: string
  breedingFocusHybridIds?: string[]
  museumFocusHallZoneIds?: Array<'entry_gallery' | 'mineral_hall' | 'fossil_hall' | 'artifact_hall' | 'spirit_hall' | 'shrine_courtyard'>
  museumFocusThemeIds?: string[]
  museumFocusScholarCommissionIds?: string[]
  guildFocusActivityIds?: string[]
  guildFocusMilestoneIds?: string[]
  guildFocusRewardPoolIds?: string[]
  hanhaiFocusRouteIds?: string[]
  hanhaiFocusRelicSiteIds?: string[]
  hanhaiFocusBossCycleIds?: string[]
  hanhaiFocusContractIds?: string[]
  hanhaiFocusRelicSetIds?: string[]
  hanhaiFocusShopRotationIds?: string[]
  familyFocusNpcIds?: string[]
  familyFocusWishIds?: string[]
  familyFocusSpiritIds?: string[]
  familyFocusZhijiProjectIds?: string[]
}

export interface ThemeWeekState {
  id: string
  weekOfSeason?: 1 | 2 | 3 | 4
  seasonWeekId?: string
  startDay: number
  endDay: number
}

export interface WeeklyGoalDef extends GoalTemplate {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  weekOfSeason: 1 | 2 | 3 | 4
  linkedThemeWeekId?: string
}

export interface WeeklyGoalState extends GoalState {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  weekOfSeason: 1 | 2 | 3 | 4
  weekId: string
  linkedThemeWeekId?: string
}

export interface ThemeWeekRewardPoolEntry {
  id: string
  label: string
  description: string
  threshold: 'any' | 'majority' | 'full'
  bonusReward: GoalReward
  recommendedOfferIds?: string[]
}

export interface WeeklyGoalSettlementItem {
  goalId: string
  title: string
  completed: boolean
  progressValue: number
  targetValue: number
  rewardGranted: boolean
  rewardSummary?: string
  compensationGranted?: boolean
  failureCompensationReason?: string
  failureCompensationReward?: GoalReward
  compensationSummary?: string
}

export interface WeeklyGoalSettlementSummary {
  weekId: string
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  weekOfSeason: 1 | 2 | 3 | 4
  linkedThemeWeekId?: string
  completedGoalCount: number
  totalGoalCount: number
  settledAtDayTag: string
  items: WeeklyGoalSettlementItem[]
  rewardHighlights: string[]
  failureHighlights: string[]
  recommendationHighlights: string[]
  appliedThemeRewardPoolIds: string[]
  compensationRewardSummaries: string[]
}

export interface WeeklyGoalStreakState {
  current: number
  best: number
  lastCompletedWeekId: string
  lastSettledWeekId: string
  lastOutcome: 'completed' | 'partial' | 'failed' | 'idle'
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

export type EventCampaignTier = 'P0' | 'P1' | 'P2'
export type EventCampaignCadence = 'weekly' | 'biweekly' | 'seasonal'
export type EventCampaignVariantGroup = 'fishpond' | 'breeding' | 'museum' | 'hanhai'
export type EventCampaignAudience = 'newcomer_friendly' | 'returnee_friendly' | 'endgame'
export type EventCampaignEngagementMode = 'local_first' | 'hall_mail_ai'
export type EventMailTemplateType =
  | 'activity_notice'
  | 'activity_midweek'
  | 'activity_reward'
  | 'maintenance_notice'
  | 'compensation'
  | 'activity_preview'
export type EventMailCadenceSlot = 'opening' | 'midweek' | 'settlement' | 'compensation' | 'preview'

export interface EventMailTemplateRef {
  id: string
  templateType: EventMailTemplateType
  cadenceSlot: EventMailCadenceSlot
  title: string
  summary: string
  linkedRouteLabels?: string[]
  previewHeadline?: string
}

export interface EventCampaignDef {
  id: string
  label: string
  description: string
  unlockTier: EventCampaignTier
  cadence: EventCampaignCadence
  variantGroup?: EventCampaignVariantGroup
  targetAudience?: EventCampaignAudience[]
  linkedThemeWeekIds: string[]
  linkedSystems: EconomySystemKey[]
  linkedRouteLabels?: string[]
  mailboxTemplateIds: string[]
  mailCadence?: EventMailCadenceSlot[]
  shopBundleId?: string
  limitedQuestCampaignId?: string
  rewardTierId?: string
  onlineEngagementMode?: EventCampaignEngagementMode
  priority?: number
  rewardSummary: string
}

export interface ThemeWeekCampaignState {
  campaignId: string
  themeWeekId: string
  weekId: string
  startedDayTag: string
  rewardMailTemplateId: string | null
  settled: boolean
}

export interface EventOperationsState {
  version: number
  activeCampaignId: string | null
  activeThemeWeekCampaignId: string | null
  cadence: EventCampaignCadence
  completedCampaignIds: string[]
  completedThemeWeekIds: string[]
  /** 历史遗留字段：当前仍用于记录“已投递”的活动邮件回执键 */
  claimedMailCampaignIds: string[]
  claimedMailReceiptKeys: string[]
  lastCampaignDayTag: string
  lastSettlementDayTag: string
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
