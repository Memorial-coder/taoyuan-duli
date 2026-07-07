import type { Season } from '@/types'

export const BOOKSELLER_VISITOR_ID = 'bookseller'
export const WANDERING_ARTIST_VISITOR_ID = 'wandering_artist'
export const RARE_VISITOR_SEASON_VISIT_LEDGER_PREFIX = 'rare_visitor_season_visit'
export const WANDERING_ARTIST_ACTION_SPEED_BONUS = 0.05

export const buildRareVisitorSeasonVisitLedgerId = (visitorId: string, year: number, season: Season): string =>
  `${RARE_VISITOR_SEASON_VISIT_LEDGER_PREFIX}:${visitorId}:${year}-${season}`
