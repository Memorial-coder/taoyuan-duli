export type BudgetChannelId = 'trade' | 'museum' | 'academy' | 'guild' | 'family' | 'research'

export type MaintenanceTargetType = 'villageProject' | 'serviceContract' | 'museumZone' | 'fishPondFacility' | 'hanhaiRoute'

export interface MaintenancePlan {
  id: string
  targetType: MaintenanceTargetType
  targetId: string
  label: string
  costMoney: number
  cycleDays: number
  effectSummary: string
  autoRenew?: boolean
}

export type RewardTicketType = 'construction' | 'exhibit' | 'caravan' | 'research' | 'guildLogistics' | 'familyFavor'

export interface WeeklySettlementSummary {
  weekId: string
  netMoney: number
  totalIncome: number
  totalExpense: number
  ticketChanges: Partial<Record<RewardTicketType, number>>
  completedGoals: string[]
  failedGoals: string[]
  highlights: string[]
  recommendations: string[]
}

export interface ProsperityScoreBreakdownEntry {
  sourceId: string
  sourceLabel: string
  score: number
  description: string
}

export interface ProsperityScoreBreakdown {
  total: number
  tier: string
  entries: ProsperityScoreBreakdownEntry[]
}

export interface LateGameBudgetReturnCurve {
  channelId: BudgetChannelId
  baseReturnRate: number
  bonusReturnRate: number
  maxReturnRate: number
}

export interface LateGameBalanceConfig {
  maintenanceMultiplier: number
  ticketRewardRate: number
  budgetReturnCurves: LateGameBudgetReturnCurve[]
  wealthTiers: WealthTierConfig[]
  serviceContractRenewMultiplier: number
  highValueOrderCashRatio: number
  casinoCashExpectationMultiplier: number
}

export type LateGameBalanceOverride = Partial<LateGameBalanceConfig>

export interface QaCaseDef {
  id: string
  title?: string
  label?: string
  category: 'positive' | 'negative' | 'boundary' | 'compatibility' | 'recovery' | 'ops'
  steps?: string[]
  description?: string
  expectedResult?: string
  expected?: string
}

export interface ReleaseChecklistItem {
  id: string
  label: string
  owner: 'dev' | 'design' | 'qa' | 'ops'
  done: boolean
}

export interface CompensationPlan {
  id?: string
  scenario?: string
  trigger: string
  action?: string
  compensation?: string[]
  notes?: string
}

export type EconomyMetricDirection = 'higher_is_worse' | 'lower_is_worse' | 'target_range'

export type EconomyRiskLevel = 'healthy' | 'watch' | 'warning' | 'critical'

export type EconomySystemKey = 'breeding' | 'shop' | 'goal' | 'quest' | 'achievement' | 'villageProject' | 'wallet' | 'market' | 'system' | 'fishPond'

export type EconomySinkCategory = 'construction' | 'luxuryCatalog' | 'maintenance' | 'themeActivity' | 'specialOrder' | 'service'

export interface WealthTierConfig {
  id: string
  label: string
  description: string
  minCashOnHand: number
  minRecent7DayNetIncome: number
  minTotalAssetValue: number
  goalCashRewardMultiplier: number
  recommendationWeight: number
  preferredSinkCategories: EconomySinkCategory[]
  recommendedFocus: string
}

export interface WealthTierAssessment {
  id: string
  label: string
  description: string
  cashOnHand: number
  recent7DayNetIncome: number
  totalAssetValue: number
  goalCashRewardMultiplier: number
  recommendationWeight: number
  preferredSinkCategories: EconomySinkCategory[]
  recommendedFocus: string
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
}

export interface EconomyAuditLinkedSystemRef {
  system: EconomySystemKey
  storeId: string
  touchpoints: string[]
  rationale: string
}

export interface EconomyBaselineAuditConfig extends EconomyAuditConfig {
  id: string
  workstreamId: string
  label: string
  summary: string
  focusAreas: string[]
  linkedSystemRefs: EconomyAuditLinkedSystemRef[]
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
