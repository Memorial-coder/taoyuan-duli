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
  staminaCost: number
  timeCostHours: number
  primaryResourceFamilyId: RegionalResourceFamilyId
  linkedSystems: RegionLinkedSystem[]
}

export interface RegionBossPhaseDef {
  id: string
  label: string
  summary: string
}

export interface RegionBossDef {
  id: string
  regionId: RegionId
  name: string
  description: string
  phases: RegionBossPhaseDef[]
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

export interface RegionMapSaveData {
  saveVersion: number
  unlockStates: Record<RegionId, RegionUnlockState>
  routeStates: Record<string, RegionRouteState>
  weeklyFocusState: RegionWeeklyFocusState
  resourceLedger: Record<RegionalResourceFamilyId, number>
  expedition: ExpeditionRuntimeState
  telemetry: RegionTelemetrySnapshot
}
