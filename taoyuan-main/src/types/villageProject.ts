import type { MaintenancePlan } from './economy'

export interface VillageProjectMaterialCost {
  itemId: string
  quantity: number
}

export type VillageProjectRequirementType =
  | 'guildContribution'
  | 'guildGoalCount'
  | 'museumDonations'
  | 'breedingCompendium'
  | 'hanhaiRelicClears'
  | 'completedBundles'
  | 'completedQuests'
  | 'villageProjectLevel'

export interface VillageProjectRequirement {
  type: VillageProjectRequirementType
  target: number
  label?: string
}

export interface VillageProjectRequirementProgress extends VillageProjectRequirement {
  current: number
  met: boolean
  displayLabel: string
}

export interface VillageProjectCheckResult {
  ok: boolean
  reason?: string
  code?: 'not_found' | 'completed' | 'missing_clue' | 'missing_project' | 'requirement' | 'money' | 'material'
  missingItemId?: string
  missingAmount?: number
  unmetRequirement?: VillageProjectRequirementProgress
}

export type VillageProjectFundingPhase = 'bootstrap' | 'expansion' | 'endgame'
export type VillageProjectPlayerSegment = 'midgame_operator' | 'capital_builder' | 'endgame_patron'
export type VillageProjectLinkedSystem = 'quest' | 'goal' | 'museum' | 'guild' | 'hanhai'
export type VillageProjectAuditMetricCategory = 'core' | 'guardrail'
export type VillageProjectContentTier = 'P0' | 'P1' | 'P2'
export type VillageProjectBuildMode = 'standard' | 'staged' | 'donation'
export type VillageProjectRegionalFunctionType =
  | 'orderBoard'
  | 'themeWeek'
  | 'displayHall'
  | 'serviceHub'
  | 'caravanRoute'
  | 'restFacility'
  | 'donationHub'
export type VillageProjectEffectType =
  | 'questMoneyBonusRate'
  | 'questFriendshipBonus'
  | 'dailyRecoveryBonusRate'
  | 'dailyQuestBoardBonus'
  | 'questCapacityBonus'
  | 'displaySpace'
  | 'themePoolBias'
  | 'orderPoolUnlock'
  | 'serviceUnlock'
  | 'regionalFunctionUnlock'
  | 'regionalFunctionUpgrade'
  | 'maintenanceDiscountRate'
  | 'donationMilestoneUnlock'

export type VillageProjectAuditMetricId =
  | 'highValueProjectCompletionRate'
  | 'lateGameBuildParticipationRate'
  | 'villageFundingStageDistribution'
  | 'projectMaterialRecoveryVolume'
  | 'fundingStressRate'
  | 'systemImpactCoverage'

export interface VillageProjectUnlockEffect {
  type: VillageProjectEffectType
  value?: number
  unit?: 'percent' | 'flat' | 'slot' | 'tag'
  summary: string
  linkedSystems?: VillageProjectLinkedSystem[]
}

export interface VillageProjectRegionalFunctionChange {
  functionId: string
  type: VillageProjectRegionalFunctionType
  mode: 'unlock' | 'upgrade' | 'reroute'
  summary: string
}

export interface VillageProjectRegionalEffect {
  areaId: string
  label: string
  summary: string
  functionChanges?: VillageProjectRegionalFunctionChange[]
  linkedSystems?: VillageProjectLinkedSystem[]
}

export interface VillageProjectDonationMilestone {
  id: string
  label: string
  targetAmount: number
  rewardSummary: string
  reward?: {
    money?: number
    items?: Array<{ itemId: string; quantity: number }>
  }
  unlockEffects?: VillageProjectUnlockEffect[]
}

export interface VillageProjectDonationPlan {
  id: string
  label: string
  targetSystem: VillageProjectLinkedSystem
  requirementSummary: string
  rewardSummary: string
  acceptedItemIds?: string[]
  targetAmount?: number
  repeatable?: boolean
  milestones?: VillageProjectDonationMilestone[]
}

export interface VillageProjectFutureHook {
  id: string
  label: string
  description: string
  targetTier: VillageProjectContentTier
}

export interface VillageProjectStageConfig {
  projectGroupId: string
  stageIndex: number
  totalStages: number
  stageLabel: string
  gateSummary: string
  previousStageProjectId?: string
  nextStageProjectId?: string
  targetTier?: VillageProjectContentTier
}

export interface VillageProjectDefaultStateConfig {
  saveVersion: number
  contentTier: VillageProjectContentTier
  buildMode: VillageProjectBuildMode
  unlockEffects: VillageProjectUnlockEffect[]
  regionalEffects: VillageProjectRegionalEffect[]
  maintenanceAutoRenew: boolean
  maintenanceCycleDays: number
  donationAcceptedItemIds: string[]
}

export interface VillageProjectOperationalConfig {
  saveVersion: number
  defaultContentTier: VillageProjectContentTier
  tierLabels: Record<VillageProjectContentTier, string>
  tierRoadmap: Record<VillageProjectContentTier, string>
  futureHooks: VillageProjectFutureHook[]
  defaultState: VillageProjectDefaultStateConfig
}

export interface VillageProjectDef {
  id: string
  name: string
  description: string
  benefitSummary: string
  moneyCost: number
  materials: VillageProjectMaterialCost[]
  requirements?: VillageProjectRequirement[]
  requiredProjectId?: string
  requiredProjectText?: string
  requiredClueId?: string
  requiredClueText?: string
  fundingPhase: VillageProjectFundingPhase
  linkedSystems: VillageProjectLinkedSystem[]
  auditTags: string[]
  buildMode?: VillageProjectBuildMode
  stageConfig?: VillageProjectStageConfig
  contentTier?: VillageProjectContentTier
  unlockEffects?: VillageProjectUnlockEffect[]
  maintenancePlan?: MaintenancePlan
  donationPlan?: VillageProjectDonationPlan
  regionalEffects?: VillageProjectRegionalEffect[]
}

export interface VillageProjectState {
  completed: boolean
  completedDayTag?: string
  completedStageIndex?: number
  stageGroupId?: string
}

export interface VillageProjectMaintenanceState {
  planId: string
  targetProjectId: string
  autoRenew: boolean
  status: 'inactive' | 'active' | 'overdue'
  lastPaidDayTag?: string
  nextDueDayTag?: string
  pendingCycles: number
}

export interface VillageProjectDonationState {
  planId: string
  projectId: string
  totalAmount: number
  donatedItems: Record<string, number>
  claimedMilestoneIds: string[]
}

export interface VillageProjectSaveData {
  saveVersion: number
  projectStates: Record<string, VillageProjectState>
  maintenanceStates: Record<string, VillageProjectMaintenanceState>
  donationStates: Record<string, VillageProjectDonationState>
}

export interface VillageProjectAuditTaggedDef extends VillageProjectDef {}

export interface VillageProjectAuditMetricDefinition {
  id: VillageProjectAuditMetricId
  name: string
  category: VillageProjectAuditMetricCategory
  objective: string
  formula: string
  sampleWindow: string
  sourceStores: string[]
  linkedSystems: VillageProjectLinkedSystem[]
  thresholds: {
    healthy: string
    warning: string
    critical: string
  }
  anomalyRule: string
}

export interface VillageProjectPhaseSegmentDefinition {
  id: VillageProjectFundingPhase
  name: string
  villageProjectLevelRange: [number, number]
  targetPlayer: string
  focus: string
  watchMetricIds: VillageProjectAuditMetricId[]
}

export interface VillageProjectPlayerSegmentDefinition {
  id: VillageProjectPlayerSegment
  name: string
  qualification: string
  focus: string
  watchMetricIds: VillageProjectAuditMetricId[]
}

export interface VillageProjectFundingRollbackRule {
  id: string
  name: string
  trigger: string
  action: string
  recovery: string
  protectedState: string
}

export interface VillageProjectBaselineAuditDefinition {
  coreMetrics: VillageProjectAuditMetricDefinition[]
  guardrailMetrics: VillageProjectAuditMetricDefinition[]
  phaseSegments: VillageProjectPhaseSegmentDefinition[]
  playerSegments: VillageProjectPlayerSegmentDefinition[]
  rollbackRule: VillageProjectFundingRollbackRule
}

export interface VillageProjectPhaseOverview {
  total: number
  completed: number
  available: number
  locked: number
}

export interface VillageProjectStageSummary {
  projectId: string
  projectGroupId?: string
  buildMode: VillageProjectBuildMode
  fundingPhase: VillageProjectFundingPhase
  contentTier: VillageProjectContentTier
  stageIndex?: number
  totalStages?: number
  stageLabel?: string
  gateSummary?: string
  previousStageProjectId?: string
  nextStageProjectId?: string
  completed: boolean
  completedStageIndex?: number
  completedStageCount: number
  available: boolean
  canBuildNow: boolean
}

export interface VillageProjectMaintenanceSummary {
  projectId: string
  plan: MaintenancePlan
  state: VillageProjectMaintenanceState
  unlocked: boolean
  active: boolean
  overdue: boolean
  statusLabel: string
}

export interface VillageProjectDonationMilestoneSummary {
  id: string
  label: string
  targetAmount: number
  rewardSummary: string
  claimed: boolean
  reached: boolean
  remainingAmount: number
}

export interface VillageProjectDonationItemSummary {
  itemId: string
  itemName: string
  donatedAmount: number
}

export interface VillageProjectDonationSummary {
  projectId: string
  plan: VillageProjectDonationPlan
  state: VillageProjectDonationState
  unlocked: boolean
  progressRate: number
  remainingAmount: number
  targetReached: boolean
  acceptedItems: VillageProjectDonationItemSummary[]
  milestones: VillageProjectDonationMilestoneSummary[]
}

export interface VillageProjectRegionalAreaSummary {
  areaId: string
  label: string
  summary: string
  unlockCount: number
  upgradeCount: number
  rerouteCount: number
  functionChanges: VillageProjectRegionalFunctionChange[]
  linkedSystems: VillageProjectLinkedSystem[]
}

export interface VillageProjectRegionalEffectSummary {
  projectId: string
  unlocked: boolean
  totalAreaCount: number
  totalFunctionChangeCount: number
  areas: VillageProjectRegionalAreaSummary[]
}

export interface VillageProjectOverviewSummary {
  totalProjects: number
  completedProjects: number
  availableProjects: number
  lockedProjects: number
  currentPhase: VillageProjectFundingPhase
  currentPlayerSegment: VillageProjectPlayerSegment
  linkedSystemCoverage: number
  countsByPhase: Record<VillageProjectFundingPhase, VillageProjectPhaseOverview>
  countsByTier: Record<VillageProjectContentTier, VillageProjectPhaseOverview>
  activeMaintenancePlans: VillageProjectMaintenanceSummary[]
  availableDonationPlans: VillageProjectDonationSummary[]
}

export interface VillageProjectOperationalSummary {
  id: string
  fundingPhase: VillageProjectFundingPhase
  buildMode: VillageProjectBuildMode
  contentTier: VillageProjectContentTier
  linkedSystems: VillageProjectLinkedSystem[]
  stageConfig?: VillageProjectStageConfig
  unlockEffects: VillageProjectUnlockEffect[]
  maintenancePlan?: MaintenancePlan
  donationPlan?: VillageProjectDonationPlan
  regionalEffects: VillageProjectRegionalEffect[]
  auditTags: string[]
}

export interface VillageProjectProjectSummary {
  id: string
  name: string
  completed: boolean
  clueUnlocked: boolean
  unlocked: boolean
  requirementsMet: boolean
  available: boolean
  canBuildNow: boolean
  blockedReason?: string
  fundingPhase: VillageProjectFundingPhase
  buildMode: VillageProjectBuildMode
  contentTier: VillageProjectContentTier
  linkedSystems: VillageProjectLinkedSystem[]
  requirementProgresses: VillageProjectRequirementProgress[]
  stage: VillageProjectStageSummary
  maintenance?: VillageProjectMaintenanceSummary
  donation?: VillageProjectDonationSummary
  regional: VillageProjectRegionalEffectSummary
  operational: VillageProjectOperationalSummary
}

export interface VillageProjectDebugSnapshot {
  saveVersion: number
  overview: VillageProjectOverviewSummary
  projects: VillageProjectProjectSummary[]
  maintenance: VillageProjectMaintenanceSummary[]
  donation: VillageProjectDonationSummary[]
  operational: VillageProjectOperationalSummary[]
  rawState: VillageProjectSaveData
}

export interface VillageProjectQueryOptions {
  fundingPhase?: VillageProjectFundingPhase
  contentTier?: VillageProjectContentTier
  buildMode?: VillageProjectBuildMode
  linkedSystem?: VillageProjectLinkedSystem
  completed?: boolean
  clueUnlocked?: boolean
  auditTag?: string
}
