export type RegionId = 'ancient_road' | 'mirage_marsh' | 'cloud_highland'

export type RegionNodeType = 'route' | 'event' | 'elite' | 'boss' | 'camp' | 'handoff'

export type RegionExpeditionMode = 'route' | 'boss'

export type RegionExpeditionApproach = 'steady' | 'scout' | 'greedy'

export type RegionExpeditionRetreatRule = 'balanced' | 'low_hp' | 'pack_full' | 'after_camp'

export type RegionExpeditionStatus = 'ongoing' | 'ready_to_settle' | 'victory' | 'retreated' | 'failure'

export type RegionExpeditionEncounterKind = 'weekly_event' | 'hazard' | 'cache' | 'traveler' | 'boss_prep'

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
  visibility: number
  morale: number
  danger: number
  findings: number
  campUsed: boolean
  supplies: RegionExpeditionSupplyState
  pendingRewardFamilyId: RegionalResourceFamilyId | null
  pendingRewardAmount: number
  pendingRewardItems: Array<{ itemId: string; quantity: number }>
  pendingEncounter: RegionExpeditionEncounter | null
  campState: RegionExpeditionCampState | null
  encounteredEventIds: string[]
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
  telemetry: RegionTelemetrySnapshot
  bossClearCounts: Record<RegionId, number>
  bossFailureStreaks: Record<RegionId, number>
  lastBossOutcome: RegionBossOutcomeState
}
