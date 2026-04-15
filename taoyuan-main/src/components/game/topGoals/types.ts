import type { PanelKey } from '@/composables/useNavigation'
import type { GoalState } from '@/stores/useGoalStore'
import type { GuidanceSurfaceId } from '@/types'

export type TopGoalsDetailTab = 'longTerm' | 'season'

export interface TopGoalsCta {
  id: string
  label: string
  panelKey: PanelKey
  routeId?: string
  sourceSurfaceId?: GuidanceSurfaceId
}

export interface TopGoalsLongTermGroup {
  label: string
  goals: GoalState[]
}

export interface TopGoalsEventCampaignSummary {
  label: string
  cadence: string
  description: string
}

export interface TopGoalsThemeWeekSummary {
  name: string
  description: string
  startDay: number
  endDay: number
}

export interface TopGoalsMarketOverview {
  phaseLabel: string
  phaseDescription: string
  hotspotCategoryLabels: string[]
  overflowPenaltyCount: number
}

export interface TopGoalsWeeklyStreakSummary {
  current: number
  best: number
}
