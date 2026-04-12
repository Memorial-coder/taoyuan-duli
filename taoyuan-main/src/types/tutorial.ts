export type GuidanceTier = 'P0' | 'P1' | 'P2'
export type GuidanceSurfaceId = 'wallet' | 'quest' | 'breeding' | 'fishpond' | 'museum' | 'guild' | 'hanhai' | 'npc' | 'shop' | 'mail' | 'top_goals'
export type GuidanceSourceType = 'economy' | 'theme_week' | 'activity' | 'growth' | 'risk'
export type GuidanceLinkedSystem = 'goal' | 'quest' | 'shop' | 'breeding' | 'museum' | 'mail' | 'system' | 'fishPond' | 'guild' | 'hanhai' | 'social'
export type GuidanceSummaryStatus = 'fresh' | 'dismissed' | 'adopted'
export type GuidanceRouteStatus = 'available' | 'adopted' | 'inactive'
export type GuidanceContentEntityType = 'digest' | 'offer' | 'order' | 'campaign' | 'hall' | 'route' | 'goal'

export interface GuidancePanelSummaryDef {
  id: string
  surfaceId: GuidanceSurfaceId
  title: string
  description: string
  unlockTier: GuidanceTier
  sourceType: GuidanceSourceType
  linkedSystems: GuidanceLinkedSystem[]
  actionLabel?: string
}

export interface GuidanceRecommendationRouteDef {
  id: string
  surfaceId: GuidanceSurfaceId
  label: string
  description: string
  unlockTier: GuidanceTier
  linkedSystems: GuidanceLinkedSystem[]
  rationale: string
}

export interface GuidanceSummaryContentVariantDef {
  id: string
  summaryId: string
  priority: number
  entityType: GuidanceContentEntityType
  headlineTemplate: string
  detailTemplates: string[]
  linkedRouteIds?: string[]
}

export interface GuidanceRouteContentVariantDef {
  id: string
  routeId: string
  priority: number
  entityType: GuidanceContentEntityType
  summaryTemplate: string
}

export interface GuidanceLoopLinkDef {
  id: string
  routeId: string
  sourceSurfaceId: GuidanceSurfaceId
  targetSurfaceId: GuidanceSurfaceId
  linkedSystems: GuidanceLinkedSystem[]
  summaryTemplate: string
}

export interface GuidanceSurfaceDigestState {
  surfaceId: GuidanceSurfaceId
  lastViewedDayTag: string
  viewedCount: number
  lastInteractedSummaryId: string | null
  lastAdoptedRouteId: string | null
}

export interface GuidanceDigestState {
  version: number
  activeSummaryIds: string[]
  activeRouteIds: string[]
  dismissedSummaryIds: string[]
  adoptedSummaryIds: string[]
  adoptedRouteIds: string[]
  lastRefreshDayTag: string
  currentThemeWeekId: string | null
  currentCampaignId: string | null
  lastViewedSurfaceId: GuidanceSurfaceId | null
  surfaceStates: GuidanceSurfaceDigestState[]
}

export interface GuidancePanelSummaryState extends GuidancePanelSummaryDef {
  active: boolean
  priority: number
  status: GuidanceSummaryStatus
  headline: string
  detailLines: string[]
  recommendedRouteIds: string[]
}

export interface GuidanceRecommendationRouteState extends GuidanceRecommendationRouteDef {
  active: boolean
  priority: number
  status: GuidanceRouteStatus
  targetSurfaceId: GuidanceSurfaceId
  summary: string
}

export interface GuidanceSurfaceSnapshot {
  surfaceId: GuidanceSurfaceId
  unlockTier: GuidanceTier
  headline: string
  primarySummaryId: string | null
  summaryStates: GuidancePanelSummaryState[]
  routeStates: GuidanceRecommendationRouteState[]
  activeSummaryCount: number
  activeRouteCount: number
  hasFreshContent: boolean
  lastViewedDayTag: string
}

export interface GuidanceDebugSnapshot {
  currentTier: GuidanceTier
  currentDayTag: string
  activeSummaryIds: string[]
  activeRouteIds: string[]
  lastRefreshDayTag: string
  currentThemeWeekId: string | null
  currentCampaignId: string | null
  lastViewedSurfaceId: GuidanceSurfaceId | null
  surfaceStates: GuidanceSurfaceDigestState[]
}

export interface GuidanceCrossSystemAction {
  id: string
  routeId: string
  sourceSurfaceId: GuidanceSurfaceId
  targetSurfaceId: GuidanceSurfaceId
  label: string
  summary: string
  targetHeadline: string
  linkedSystems: GuidanceLinkedSystem[]
  adopted: boolean
}

export interface GuidanceCrossSystemOverview {
  activeSurfaceIds: GuidanceSurfaceId[]
  linkedSystems: GuidanceLinkedSystem[]
  sourceSummaryIds: string[]
  weeklyDecisionLoop: GuidanceCrossSystemAction[]
}
