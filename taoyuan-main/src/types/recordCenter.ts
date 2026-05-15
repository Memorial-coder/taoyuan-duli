export type DailyDigestSectionId =
  | 'recovery_weather'
  | 'farm_production'
  | 'animal_fishpond'
  | 'social_events'
  | 'economy_orders'
  | 'weekly_progress'

export type DailyDigestTone = 'normal' | 'success' | 'warning' | 'danger'

export interface DailyDigestAlert {
  message: string
  tone: DailyDigestTone
}

export interface DailyDigestSection {
  sectionId: DailyDigestSectionId
  title: string
  tone: DailyDigestTone
  headline: string
  detailLines: string[]
  priority: number
}

export interface DailyDigestEntry {
  dayTag: string
  title: string
  sections: DailyDigestSection[]
  alerts: DailyDigestAlert[]
  createdAt: number
}

export type RecordCenterTabId = 'daily' | 'chronicle' | 'clues' | 'system'

export interface PlayerRecordCenterSaveData {
  saveVersion: number
  dailyDigests: DailyDigestEntry[]
  lastViewedDigestDayTag: string
  lastOpenTab: RecordCenterTabId
}
