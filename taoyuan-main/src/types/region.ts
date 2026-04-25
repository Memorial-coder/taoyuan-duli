export type RegionId = 'ancient_road' | 'mirage_marsh' | 'cloud_highland'

export type RegionNodeType = 'route' | 'event' | 'elite' | 'boss' | 'camp' | 'handoff'

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
  telemetry: RegionTelemetrySnapshot
  bossClearCounts: Record<RegionId, number>
  bossFailureStreaks: Record<RegionId, number>
  lastBossOutcome: RegionBossOutcomeState
}
