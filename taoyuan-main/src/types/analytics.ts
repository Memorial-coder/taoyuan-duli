import type { BudgetChannelId, RewardTicketType } from './economy'
import type { Season } from './game'

export interface LateGameMetricSnapshot {
  weekId: string
  absoluteWeek: number
  year: number
  season: Season
  weekOfSeason: 1 | 2 | 3 | 4
  generatedAtDayTag: string
  periodStartDayTag: string
  periodEndDayTag: string
  totalIncome: number
  totalExpense: number
  netIncome: number
  sinkSpend: number
  ticketBalances: Partial<Record<RewardTicketType, number>>
  budgetInvestments: Partial<Record<BudgetChannelId, number>>
  maintenanceCost: number
  serviceContractCount: number
  hanhaiContractCompletions: number
  fishPondContestScore: number
  museumExhibitLevel: number
  socialParticipationScore: number
  villageProsperityScore: number
  sourceSnapshotCount: number
  activeThemeWeekId?: string
}

export interface WeeklyMetricArchive {
  version: number
  lastGeneratedWeekId: string
  snapshots: LateGameMetricSnapshot[]
}