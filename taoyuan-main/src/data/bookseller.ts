import type { Season } from '@/types'
import { BOOKS, type BooksellerBookDef } from './books'

export const BOOKSELLER_VISITOR_ID = 'bookseller'

export type RareVisitorKind = 'merchant' | 'performer' | 'wanderer'

export interface RareVisitorDef {
  id: string
  name: string
  stallName: string
  kind: RareVisitorKind
  schedule: Partial<Record<Season, number[]>>
  description: string
  teaser: string
  prepHints: string[]
}

export interface RareVisitorVisitSummary {
  visitor: RareVisitorDef
  year: number
  season: Season
  day: number
  daysAway: number
}

export interface BooksellerStockEntry extends BooksellerBookDef {
  quantity: number
}

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

const seededRandom = (seed: number): (() => number) => {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff
    return (state >>> 0) / 0xffffffff
  }
}

const getNextCalendarPoint = (year: number, season: Season, day: number) => {
  let nextYear = year
  let nextSeason = season
  let nextDay = day + 1
  if (nextDay > 28) {
    nextDay = 1
    const nextSeasonIndex = SEASON_ORDER.indexOf(season) + 1
    if (nextSeasonIndex >= SEASON_ORDER.length) {
      nextSeason = 'spring'
      nextYear += 1
    } else {
      nextSeason = SEASON_ORDER[nextSeasonIndex]!
    }
  }
  return { year: nextYear, season: nextSeason, day: nextDay }
}

export const RARE_VISITORS: RareVisitorDef[] = [
  {
    id: BOOKSELLER_VISITOR_ID,
    name: '行脚书生',
    stallName: '游学书肆',
    kind: 'merchant',
    schedule: {
      spring: [11],
      summer: [11],
      autumn: [11],
      winter: [11]
    },
    description: '每季只来一次的游学书生，会带来技艺书、见闻书和线索书。',
    teaser: '今天只能今天翻书换见闻，错过要再等一整季。',
    prepHints: ['提前备 1000 文左右铜钱', '优先挑和本周主路线相关的书', '若要补礼物线索，优先看线索书']
  },
  {
    id: 'festival_merchant',
    name: '节庆商人',
    stallName: '节令流摊',
    kind: 'merchant',
    schedule: {
      spring: [21],
      summer: [21],
      autumn: [21],
      winter: [21]
    },
    description: '靠近大节日前后出现的节庆商人，会卖当天限定的备货与小纪念。',
    teaser: '错过这一天，很多节令货要等下一次节庆。',
    prepHints: ['预留送礼物资与节庆食材预算', '看一眼近期节日需要什么', '优先补稀有但不常卖的节庆材料']
  },
  {
    id: 'wandering_artist',
    name: '巡回艺人',
    stallName: '河岸戏棚',
    kind: 'performer',
    schedule: {
      spring: [20],
      summer: [24],
      autumn: [17],
      winter: [13]
    },
    description: '会留下传闻、台词和节庆气氛的巡回艺人，重点在“当天在场”。',
    teaser: '今天能见，明天人就走了。',
    prepHints: ['带一份像样的小礼物', '白天先清体力活，晚上来听戏', '留意他提到的下一位来客与秘密地点']
  },
  {
    id: 'outsider_guest',
    name: '异乡客',
    stallName: '陌路驿座',
    kind: 'wanderer',
    schedule: {
      spring: [26],
      summer: [9],
      autumn: [26],
      winter: [24]
    },
    description: '偶尔在村口停留的异乡客，会带来关于商路、天气与远路的只言片语。',
    teaser: '更像一次偶遇，不像固定商店。',
    prepHints: ['先把村里的日常做完，再回来听传闻', '留意商路与天气窗口类提示', '如果最近在跑长线任务，这位来客更值得看']
  }
]

const getBooksellerWeight = (book: BooksellerBookDef, season: Season, year: number) => {
  let weight = 1
  if (season === 'summer' && book.tags?.some(tag => ['鱼汛周', '夜钓会', '水域'].includes(tag))) weight += 1.5
  if (season === 'autumn' && book.tags?.some(tag => ['节庆', '农展会', '备货'].includes(tag))) weight += 1.3
  if (season === 'spring' && book.tags?.some(tag => ['农事', '春耕', '花期'].includes(tag))) weight += 1.2
  if (year >= 2 && book.type === 'festival') weight += 0.8
  if (year >= 2 && book.type === 'clue') weight += 0.4
  return weight
}

export const getRareVisitorById = (id: string): RareVisitorDef | undefined => RARE_VISITORS.find(visitor => visitor.id === id)

export const getRareVisitorsForDay = (season: Season, day: number): RareVisitorDef[] => {
  return RARE_VISITORS.filter(visitor => visitor.schedule[season]?.includes(day))
}

export const isRareVisitorDay = (season: Season, day: number, visitorId: string): boolean => {
  const visitor = getRareVisitorById(visitorId)
  return !!visitor?.schedule[season]?.includes(day)
}

export const getUpcomingRareVisitors = (season: Season, day: number, daysAhead: number, year = 1): RareVisitorVisitSummary[] => {
  const visits: RareVisitorVisitSummary[] = []
  let cursor = { year, season, day }
  for (let offset = 1; offset <= daysAhead; offset++) {
    cursor = getNextCalendarPoint(cursor.year, cursor.season, cursor.day)
    for (const visitor of getRareVisitorsForDay(cursor.season, cursor.day)) {
      visits.push({
        visitor,
        year: cursor.year,
        season: cursor.season,
        day: cursor.day,
        daysAway: offset
      })
    }
  }
  return visits
}

export const generateBooksellerStock = (
  year: number,
  seasonIndex: number,
  day: number,
  season: Season,
  ownedBookIds: string[] = []
): BooksellerStockEntry[] => {
  const seed = year * 13000 + seasonIndex * 1100 + day * 43
  const rng = seededRandom(seed)
  const available = [...BOOKS].sort(() => rng() - 0.5)
  const weighted = available
    .map(book => ({
      book,
      weight: getBooksellerWeight(book, season, year) + rng() * 0.4
    }))
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 4)
    .map(entry => ({
      ...entry.book,
      quantity: ownedBookIds.includes(entry.book.id) ? 0 : 1
    }))

  return weighted
}
