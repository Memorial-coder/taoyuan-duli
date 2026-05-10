import type { Season, Weather } from './game'
import type { RelationshipStage } from './npc'
import type { SkillType } from './skill'
import type { WeaponType } from './item'
import type { EquipmentEffectType } from './ring'

export type RegionId = 'ancient_road' | 'mirage_marsh' | 'cloud_highland'

export type RegionNodeType = 'route' | 'event' | 'elite' | 'boss' | 'camp' | 'handoff'

export type RegionExpeditionMode = 'route' | 'boss'

export type RegionExpeditionApproach = 'steady' | 'scout' | 'greedy'

export type RegionExpeditionRetreatRule = 'balanced' | 'low_hp' | 'pack_full' | 'after_camp'

export type RegionExpeditionStatus = 'ongoing' | 'ready_to_settle' | 'victory' | 'retreated' | 'failure'

export type RegionExpeditionEncounterKind = 'weekly_event' | 'hazard' | 'cache' | 'traveler' | 'support' | 'anomaly' | 'boss_prep'

export type RegionExpeditionEncounterRisk = 'low' | 'medium' | 'high'

export type RegionalResourceFamilyId = 'ancient_archive' | 'ecology_specimen' | 'ley_crystal'

export type RegionLinkedSystem =
  | 'quest'
  | 'shop'
  | 'museum'
  | 'guild'
  | 'hanhai'
  | 'fishPond'
  | 'villageProject'
  | 'wallet'
  | 'inventory'
  | 'skills'

export interface JourneyRequiredStats {
  minHpPercent: number
  minStamina: number
  minBuildScore: number
  focusLines: string[]
}

export type JourneyXpRewardBucket = Partial<Record<SkillType, number>>

export interface JourneyXpRewardDef {
  victory?: JourneyXpRewardBucket
  retreated?: JourneyXpRewardBucket
  failure?: JourneyXpRewardBucket
}

export interface JourneyOutcomeModifiers {
  staminaCostReduction: number
  scoutBonus: number
  carryBonus: number
  hazardResist: number
  eventBonus: number
  campRecoveryBonus: number
  bossPressureResist: number
  resourceFindBonus: number
  rewardMultiplier: number
  knowledgeBonus: number
  experienceMultiplier: number
  supplyBonus: {
    rations: number
    medicine: number
    utility: number
  }
}

export interface JourneyBuildSnapshot {
  weaponType: WeaponType
  weaponLabel: string
  matchedWeaponBias: boolean
  skillLevels: Record<SkillType, number>
  equipmentBonuses: Partial<Record<EquipmentEffectType, number>>
  affinityScore: number
  buildScore: number
  outcome: JourneyOutcomeModifiers
  missingStats: string[]
  summaryLines: string[]
}

export interface JourneyCraftingRewardDef {
  kind: 'weapon' | 'ring' | 'hat' | 'shoe'
  defId: string
  enchantmentId?: string | null
}

export interface JourneyCraftingRecipeDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  requiredItems: Array<{ itemId: string; quantity: number }>
  requiredMoney: number
  reward: JourneyCraftingRewardDef
  unlockRouteIds?: string[]
  unlockBossIds?: string[]
  tags: string[]
}

export interface JourneyAwakeningDef {
  id: string
  regionId: RegionId
  skillType: SkillType
  name: string
  description: string
  requiredFamilyId: RegionalResourceFamilyId
  requiredFamilyAmount: number
  requiredRouteCompletions: number
  modifiers: Partial<JourneyOutcomeModifiers>
  summaryLines: string[]
}

export interface JourneyCampModuleDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  requiredFamilyId: RegionalResourceFamilyId
  requiredFamilyAmount: number
  modifiers: Partial<JourneyOutcomeModifiers>
  supplyBonus?: Partial<JourneyOutcomeModifiers['supplyBonus']>
}

export interface JourneyRoutePermitDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  requiredFamilyId: RegionalResourceFamilyId
  requiredFamilyAmount: number
  requiredRouteIds: string[]
  modifiers: Partial<JourneyOutcomeModifiers>
}

export interface RegionalResourceFamilyDef {
  id: RegionalResourceFamilyId
  label: string
  description: string
  linkedSystems: RegionLinkedSystem[]
}

export interface RegionDef {
  id: RegionId
  name: string
  description: string
  themeHint: string
  linkedSystems: RegionLinkedSystem[]
}

export interface RegionRouteDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  nodeType: Extract<RegionNodeType, 'route' | 'event' | 'elite' | 'handoff'>
  unlockRouteIds?: string[]
  unlockCompletionCount?: number
  staminaCost: number
  timeCostHours: number
  primaryResourceFamilyId: RegionalResourceFamilyId
  linkedSystems: RegionLinkedSystem[]
  journeyAffinities: SkillType[]
  weaponBias: WeaponType[]
  xpRewards: JourneyXpRewardDef
  requiredStats: JourneyRequiredStats
  craftingUnlocks: string[]
  awakeningUnlocks: string[]
  encounterHint?: string
  handoffHint?: string
}

export interface RegionBossPhaseDef {
  id: string
  label: string
  summary: string
  enemyHp: number
  enemyAttack: number
  enemyDefense: number
}

export interface RegionBossDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  rewardFamilyId: RegionalResourceFamilyId
  staminaCost: number
  timeCostHours: number
  journeyAffinities: SkillType[]
  weaponBias: WeaponType[]
  xpRewards: JourneyXpRewardDef
  requiredStats: JourneyRequiredStats
  craftingUnlocks: string[]
  awakeningUnlocks: string[]
  phases: RegionBossPhaseDef[]
}

export interface RegionEventDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  unlockRouteIds?: string[]
  unlockCompletionCount?: number
  staminaCost: number
  timeCostHours: number
  rewardFamilyId: RegionalResourceFamilyId
  rewardAmount: number
  linkedSystems: RegionLinkedSystem[]
  journeyAffinities: SkillType[]
  weaponBias: WeaponType[]
  xpRewards: JourneyXpRewardDef
  requiredStats: JourneyRequiredStats
  craftingUnlocks: string[]
  awakeningUnlocks: string[]
  encounterHint?: string
  handoffHint?: string
  maxWeeklyCompletions?: number
}

export interface RegionUnlockState {
  unlocked: boolean
  unlockedDayTag: string
}

export interface RegionRouteState {
  routeId: string
  unlocked: boolean
  completions: number
  lastCompletedDayTag: string
}

export interface RegionWeeklyFocusState {
  weekId: string
  focusedRegionId: RegionId | null
  highlightedRouteIds: string[]
}

export interface RegionEventState {
  eventId: string
  totalCompletions: number
  weeklyCompletions: number
  lastCompletedDayTag: string
  lastActivatedWeekId: string
}

export interface RegionKnowledgeState {
  regionId: RegionId
  intel: number
  survey: number
  familiarity: number
  lastUpdatedDayTag: string
}

export interface RegionRouteKnowledgeState {
  routeId: string
  intel: number
  surveyProgress: number
  familiarity: number
  lastUpdatedDayTag: string
}

export type RegionMapNodeVisibilityStage = 'unknown' | 'heard' | 'surveyed' | 'mastered'

export interface RegionMapNodeState {
  nodeKey: string
  regionId: RegionId
  routeId: string | null
  bossId: string | null
  nodeType: Extract<RegionNodeType, 'route' | 'event' | 'elite' | 'handoff' | 'boss'>
  visibilityStage: RegionMapNodeVisibilityStage
  visitCount: number
  surveyCount: number
  lastVisitedDayTag: string
}

export interface RegionCampSiteState {
  campKey: string
  regionId: RegionId
  routeId: string | null
  bossId: string | null
  visitCount: number
  restCount: number
  sortCount: number
  markCount: number
  scoutCount: number
  safetyProgress: number
  stashTier: number
  lastUsedDayTag: string
}

export type RegionShortcutStateLevel = 'none' | 'marked' | 'shortcut' | 'mastered'

export interface RegionShortcutState {
  routeId: string
  level: RegionShortcutStateLevel
  masteryRuns: number
  markedEntrances: number
  lastUpdatedDayTag: string
}

export interface RegionWeeklyEventState {
  weekId: string
  activeEventIdsByRegion: Record<RegionId, string[]>
  lastRefreshedDayTag: string
}

export interface ExpeditionRuntimeState {
  activeRegionId: RegionId | null
  activeRouteId: string | null
  activeBossId: string | null
  startedAtDayTag: string
}

export interface RegionExpeditionSupplyState {
  rations: number
  medicine: number
  utility: number
}

export interface RegionExpeditionLogEntry {
  id: string
  step: number
  title: string
  summary: string
  effects: string[]
  tone: 'accent' | 'success' | 'danger'
}

export type RegionExpeditionCarryItemCategory = 'resource' | 'clue' | 'refined' | 'supply'

export interface RegionExpeditionCarryItem {
  id: string
  label: string
  category: RegionExpeditionCarryItemCategory
  quantity: number
  burden: number
  note: string
}

export type RegionExpeditionWeather = 'clear' | 'wind' | 'fog' | 'storm'

export interface RegionExpeditionRiskState {
  weather: RegionExpeditionWeather
  pollution: number
  alertness: number
  anomaly: number
}

export type RegionExpeditionNodeLane = 'main' | 'branch' | 'deep' | 'boss' | 'camp'

export interface RegionExpeditionNodeRecord {
  id: string
  step: number
  lane: RegionExpeditionNodeLane
  label: string
  summary: string
}

export interface RegionExpeditionNodeChoice {
  id: string
  lane: Exclude<RegionExpeditionNodeLane, 'camp'>
  label: string
  summary: string
  risk: RegionExpeditionEncounterRisk
}

export type RegionCampActionId = 'rest' | 'sort' | 'mark' | 'scout'

export interface RegionExpeditionCampState {
  enteredAtStep: number
  nightEventHint: string
  availableActionIds: RegionCampActionId[]
}

export interface RegionExpeditionEncounterMemory {
  id: string
  kind: RegionExpeditionEncounterKind
  optionId: 'cautious' | 'balanced' | 'bold'
  summary: string
  nextKind: RegionExpeditionEncounterKind | null
}

export interface RegionExpeditionEncounterOption {
  id: 'cautious' | 'balanced' | 'bold'
  label: string
  summary: string
  tone: 'accent' | 'success' | 'danger'
}

export interface RegionExpeditionEncounter {
  id: string
  step: number
  kind: RegionExpeditionEncounterKind
  title: string
  summary: string
  detailLines: string[]
  risk: RegionExpeditionEncounterRisk
  sourceEventId: string | null
  rewardFamilyId: RegionalResourceFamilyId | null
  rewardAmount: number
  rewardItems: Array<{ itemId: string; quantity: number }>
  options: RegionExpeditionEncounterOption[]
}

export interface RegionExpeditionSession {
  sessionId: string
  mode: RegionExpeditionMode
  regionId: RegionId
  routeId: string | null
  bossId: string | null
  targetName: string
  startedAtDayTag: string
  approach: RegionExpeditionApproach
  retreatRule: RegionExpeditionRetreatRule
  status: RegionExpeditionStatus
  progressStep: number
  totalSteps: number
  carryLoad: number
  maxCarryLoad: number
  carryItems: RegionExpeditionCarryItem[]
  visibility: number
  morale: number
  danger: number
  findings: number
  frontlinePrep: number
  riskState: RegionExpeditionRiskState
  campUsed: boolean
  supplies: RegionExpeditionSupplyState
  pendingRewardFamilyId: RegionalResourceFamilyId | null
  pendingRewardAmount: number
  pendingRewardItems: Array<{ itemId: string; quantity: number }>
  pendingEncounter: RegionExpeditionEncounter | null
  queuedEncounterKind: RegionExpeditionEncounterKind | null
  campState: RegionExpeditionCampState | null
  encounteredEventIds: string[]
  encounterMemory: RegionExpeditionEncounterMemory[]
  nodeHistory: RegionExpeditionNodeRecord[]
  journal: RegionExpeditionLogEntry[]
  recommendedRouteId: string | null
}

export interface RegionExpeditionArchiveEntry {
  id: string
  regionId: RegionId
  mode: RegionExpeditionMode
  targetName: string
  startedAtDayTag: string
  endedAtDayTag: string
  outcome: Exclude<RegionExpeditionStatus, 'ongoing'>
  summaryLines: string[]
  carryItems: RegionExpeditionCarryItem[]
  journal: RegionExpeditionLogEntry[]
}

export interface RegionTelemetrySnapshot {
  totalRouteCompletions: number
  bossClears: number
  resourceTurnIns: number
}

export interface RegionBossOutcomeState {
  regionId: RegionId | null
  bossId: string | null
  outcome: 'none' | 'victory' | 'failure'
  rewardFamilyId: RegionalResourceFamilyId | null
  rewardAmount: number
  resolvedDayTag: string
  summary: string
  recommendedRouteId: string | null
  failureStreak: number
}

export interface RegionSeasonalState {
  regionId: RegionId
  weekId: string
  season: Season
  weather: Weather
  activeVariantId: string | null
  activeVariantLabel: string
  summary: string
  detailLines: string[]
  affectedRouteIds: string[]
  manualExplorationRequired: boolean
  seenVariantIds: string[]
  lastUpdatedDayTag: string
}

export interface RegionRumorSupplyEntry {
  id: string
  regionId: RegionId
  title: string
  summary: string
  detailLines: string[]
  sourceNpcId: string
  sourceNpcName: string
  sourceLocation: string
  relationshipStage: RelationshipStage
  relationshipStageLabel: string
  targetRouteId: string | null
  tags: string[]
  requiresManualExploration: boolean
}

export interface RegionRumorBoardEntry extends RegionRumorSupplyEntry {
  weekId: string
  fulfilled: boolean
  fulfilledDayTag: string
}

export interface RegionRumorBoardState {
  weekId: string
  lastRefreshedDayTag: string
  entriesByRegion: Record<RegionId, RegionRumorBoardEntry[]>
}

export type RegionCompanionSourceType = 'spouse' | 'zhiji' | 'helper'

export type RegionCompanionContractStatus = 'active' | 'completed' | 'failed'

export interface RegionCompanionContract {
  id: string
  npcId: string
  npcName: string
  sourceType: RegionCompanionSourceType
  relationshipStage: RelationshipStage
  relationshipStageLabel: string
  regionId: RegionId
  routeId: string
  assignedDayTag: string
  expiresDayTag: string
  durationDays: number
  riskModifier: number
  moraleBonus: number
  summary: string
  chronicleTitle: string
  settlementLines: string[]
  status: RegionCompanionContractStatus
  resolvedDayTag: string
}

export type RegionAutoPatrolMode = 'manual' | 'ready' | 'blocked'

export interface RegionAutoPatrolState {
  routeId: string
  enabled: boolean
  mode: RegionAutoPatrolMode
  lastAutoSettledDayTag: string
  lastEvaluatedDayTag: string
  blockedReason: string
  blockedTags: string[]
}

export type RegionJourneyActionState = Record<string, string[]>

export interface RegionMapSaveData {
  saveVersion: number
  unlockStates: Record<RegionId, RegionUnlockState>
  routeStates: Record<string, RegionRouteState>
  eventStates: Record<string, RegionEventState>
  weeklyFocusState: RegionWeeklyFocusState
  weeklyEventState: RegionWeeklyEventState
  resourceLedger: Record<RegionalResourceFamilyId, number>
  expedition: ExpeditionRuntimeState
  activeSession: RegionExpeditionSession | null
  journeyHistory: RegionExpeditionArchiveEntry[]
  knowledgeState: Record<RegionId, RegionKnowledgeState>
  routeKnowledgeState: Record<string, RegionRouteKnowledgeState>
  mapNodeStates: Record<string, RegionMapNodeState>
  campStates: Record<string, RegionCampSiteState>
  shortcutStates: Record<string, RegionShortcutState>
  seasonalRegionStates: Record<RegionId, RegionSeasonalState>
  companionContracts: RegionCompanionContract[]
  rumorBoard: RegionRumorBoardState
  autoPatrolStates: Record<string, RegionAutoPatrolState>
  journeyActionState: RegionJourneyActionState
  telemetry: RegionTelemetrySnapshot
  bossClearCounts: Record<RegionId, number>
  bossFailureStreaks: Record<RegionId, number>
  lastBossOutcome: RegionBossOutcomeState
  journeyCraftingUnlocks: Record<string, boolean>
  journeyAwakenings: Record<string, boolean>
  journeyCampModules: Record<string, number>
  journeyRouteLicenses: Record<string, number>
}

export interface RegionMapMetaState {
  unlockStates: Record<RegionId, RegionUnlockState>
  routeStates: Record<string, RegionRouteState>
  eventStates: Record<string, RegionEventState>
  weeklyFocusState: RegionWeeklyFocusState
  weeklyEventState: RegionWeeklyEventState
  knowledgeState: Record<RegionId, RegionKnowledgeState>
  routeKnowledgeState: Record<string, RegionRouteKnowledgeState>
  mapNodeStates: Record<string, RegionMapNodeState>
  shortcutStates: Record<string, RegionShortcutState>
  seasonalRegionStates: Record<RegionId, RegionSeasonalState>
  companionContracts: RegionCompanionContract[]
  rumorBoard: RegionRumorBoardState
  autoPatrolStates: Record<string, RegionAutoPatrolState>
  telemetry: RegionTelemetrySnapshot
  bossClearCounts: Record<RegionId, number>
  bossFailureStreaks: Record<RegionId, number>
  journeyCraftingUnlocks: Record<string, boolean>
  journeyAwakenings: Record<string, boolean>
  journeyCampModules: Record<string, number>
  journeyRouteLicenses: Record<string, number>
}

export interface RegionMapSessionState {
  expedition: ExpeditionRuntimeState
  activeSession: RegionExpeditionSession | null
  currentExpeditionNodeChoices: RegionExpeditionNodeChoice[]
  campStates: Record<string, RegionCampSiteState>
}

export interface RegionMapSettlementState {
  resourceLedger: Record<RegionalResourceFamilyId, number>
  journeyHistory: RegionExpeditionArchiveEntry[]
  journeyActionState: RegionJourneyActionState
  lastBossOutcome: RegionBossOutcomeState
}
