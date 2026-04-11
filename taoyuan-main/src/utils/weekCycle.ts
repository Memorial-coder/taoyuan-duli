import type { Season } from '@/types'

export interface WeekCycleInfo {
  year: number
  season: Season
  day: number
  absoluteDay: number
  absoluteWeek: number
  weekOfSeason: 1 | 2 | 3 | 4
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
  weekStartDay: number
  weekEndDay: number
  seasonWeekId: string
  isWeekStart: boolean
  isWeekEnd: boolean
}

export interface WeekBoundaryEvent {
  previousWeekId: string
  currentWeekId: string
  startedNewWeek: boolean
  changedSeason: boolean
  changedYear: boolean
}

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

export const DAYS_PER_WEEK = 7
export const WEEKS_PER_SEASON = 4
export const DAYS_PER_SEASON = 28
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASON_ORDER.length

export const getSeasonIndex = (season: Season): number => {
  const index = SEASON_ORDER.indexOf(season)
  return index >= 0 ? index : 0
}

export const getAbsoluteDay = (year: number, season: Season, day: number): number => {
  return (year - 1) * DAYS_PER_YEAR + getSeasonIndex(season) * DAYS_PER_SEASON + day
}

export const getWeekCycleInfo = (year: number, season: Season, day: number): WeekCycleInfo => {
  const safeDay = Math.min(DAYS_PER_SEASON, Math.max(1, Math.floor(day)))
  const weekOfSeason = (Math.floor((safeDay - 1) / DAYS_PER_WEEK) + 1) as WeekCycleInfo['weekOfSeason']
  const dayOfWeek = (((safeDay - 1) % DAYS_PER_WEEK) + 1) as WeekCycleInfo['dayOfWeek']
  const weekStartDay = (weekOfSeason - 1) * DAYS_PER_WEEK + 1
  const weekEndDay = Math.min(DAYS_PER_SEASON, weekStartDay + DAYS_PER_WEEK - 1)
  const absoluteDay = getAbsoluteDay(year, season, safeDay)

  return {
    year,
    season,
    day: safeDay,
    absoluteDay,
    absoluteWeek: Math.floor((absoluteDay - 1) / DAYS_PER_WEEK),
    weekOfSeason,
    dayOfWeek,
    weekStartDay,
    weekEndDay,
    seasonWeekId: `${year}-${season}-week-${weekOfSeason}`,
    isWeekStart: dayOfWeek === 1,
    isWeekEnd: dayOfWeek === DAYS_PER_WEEK
  }
}

export const getWeekBoundaryEvent = (previous: WeekCycleInfo, current: WeekCycleInfo): WeekBoundaryEvent => {
  return {
    previousWeekId: previous.seasonWeekId,
    currentWeekId: current.seasonWeekId,
    startedNewWeek: previous.seasonWeekId !== current.seasonWeekId,
    changedSeason: previous.season !== current.season,
    changedYear: previous.year !== current.year
  }
}