import { getWeekday } from './timeConstants'
import { CROPS } from './crops'
import { getItemById } from './items'
import type { Season } from '@/types'

// WS02 anchor: the traveling merchant is the current rare-visitor base for
// future bookseller, calendar preview, and limited rotating stock systems.

/** 旅行商人商品定义 */
export interface TravelingMerchantItem {
  itemId: string
  name: string
  basePrice: number // 商人售价（约为 sellPrice 的 2-3 倍溢价）
  seasonBias?: Season[]
  festivalBias?: string[]
  projectBias?: string[]
}

/** 旅行商人当日库存 */
export interface TravelingMerchantStock {
  itemId: string
  name: string
  price: number // 含随机浮动后的售价
  quantity: number // 剩余可购数量
}

export interface TravelingMerchantGenerationContext {
  festivalIds?: string[]
  completedVillageProjectIds?: string[]
}

/** 旅行商人商品池 */
export const TRAVELING_MERCHANT_POOL: TravelingMerchantItem[] = [
  // 稀有宝石
  { itemId: 'dragon_jade', name: '龙玉', basePrice: 800, festivalBias: ['dragon_boat'], projectBias: ['caravan_station'] },
  { itemId: 'prismatic_shard', name: '五彩碎片', basePrice: 1200, projectBias: ['support_shed', 'caravan_station_ii'] },
  { itemId: 'moonstone', name: '月光石', basePrice: 400, seasonBias: ['winter'] },
  // 稀有采集物
  { itemId: 'ginseng', name: '人参', basePrice: 500, seasonBias: ['spring', 'autumn'] },
  { itemId: 'wintersweet', name: '腊梅', basePrice: 150, seasonBias: ['winter'] },
  // 特殊材料
  { itemId: 'iridium_ore', name: '铱矿', basePrice: 700, projectBias: ['support_shed', 'caravan_station_ii'] },
  { itemId: 'cloth', name: '布匹', basePrice: 1000, festivalBias: ['harvest_fair', 'lantern_riddle'] },
  // 稀有动物产品
  { itemId: 'rabbit_foot', name: '幸运兔脚', basePrice: 1200 },
  { itemId: 'truffle', name: '松露', basePrice: 1400 },
  // 特殊物品
  { itemId: 'rain_totem', name: '雨图腾', basePrice: 500, seasonBias: ['summer'], festivalBias: ['fishing_contest'] },
  { itemId: 'silk_ribbon', name: '丝帕', basePrice: 500, festivalBias: ['lantern_riddle', 'kite_flying'] },
  // 鱼塘耗材
  { itemId: 'fish_feed', name: '鱼饲料', basePrice: 60, seasonBias: ['summer'], festivalBias: ['fishing_contest'] },
  { itemId: 'water_purifier', name: '水质改良剂', basePrice: 120, seasonBias: ['summer'] }
]

/** 判断某天是否为旅行商人出摊日（周五/周日） */
export const isTravelingMerchantDay = (day: number): boolean => {
  const weekday = getWeekday(day)
  return weekday === 'fri' || weekday === 'sun'
}

/** 简单确定性伪随机数生成器 */
const seededRandom = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

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

const getMerchantWeight = (item: TravelingMerchantItem, currentSeason: Season, context?: TravelingMerchantGenerationContext) => {
  let weight = 1
  if (item.seasonBias?.includes(currentSeason)) weight += 1.3
  if (item.festivalBias?.some(id => context?.festivalIds?.includes(id))) weight += 1.1
  if (item.projectBias?.some(id => context?.completedVillageProjectIds?.includes(id))) weight += 0.9
  return weight
}

export const getUpcomingTravelingMerchantVisits = (season: Season, day: number, daysAhead: number, year = 1) => {
  const visits: Array<{ year: number; season: Season; day: number; daysAway: number }> = []
  let cursor = { year, season, day }
  for (let offset = 1; offset <= daysAhead; offset++) {
    cursor = getNextCalendarPoint(cursor.year, cursor.season, cursor.day)
    if (isTravelingMerchantDay(cursor.day)) {
      visits.push({
        year: cursor.year,
        season: cursor.season,
        day: cursor.day,
        daysAway: offset
      })
    }
  }
  return visits
}

/** 根据游戏日期生成旅行商人当日库存 */
export const generateMerchantStock = (
  year: number,
  seasonIndex: number,
  day: number,
  currentSeason: Season,
  context?: TravelingMerchantGenerationContext
): TravelingMerchantStock[] => {
  const seed = year * 10000 + seasonIndex * 1000 + day * 37
  const rng = seededRandom(seed)

  const stock: TravelingMerchantStock[] = []

  // 从通用池随机选取 3-4 件
  const weightedPool = [...TRAVELING_MERCHANT_POOL]
    .map(item => ({
      item,
      weight: getMerchantWeight(item, currentSeason, context) + rng() * 0.35
    }))
    .sort((left, right) => right.weight - left.weight)
  const generalCount = 3 + Math.floor(rng() * 2) // 3 或 4
  for (let i = 0; i < Math.min(generalCount, weightedPool.length); i++) {
    const item = weightedPool[i]!.item
    const priceVariation = 0.85 + rng() * 0.3 // ±15% 价格浮动
    let price = Math.floor(item.basePrice * priceVariation)
    // 防套利：商人售价不低于物品出售价的 2 倍
    const def = getItemById(item.itemId)
    if (def && def.sellPrice > 0) price = Math.max(price, def.sellPrice * 2)
    stock.push({
      itemId: item.itemId,
      name: item.name,
      price,
      quantity: 1 + Math.floor(rng() * 2) // 1-2 个
    })
  }

  // 从反季作物中选 1-2 种子
  const otherSeasonCrops = CROPS.filter(c => !c.season.includes(currentSeason) && c.seedPrice > 0).sort(() => rng() - 0.5)
  if (otherSeasonCrops.length > 0) {
    const seedCount = 1 + Math.floor(rng() * 2) // 1 或 2
    for (let i = 0; i < Math.min(seedCount, otherSeasonCrops.length); i++) {
      const crop = otherSeasonCrops[i]!
      stock.push({
        itemId: crop.seedId,
        name: `${crop.name}种子`,
        price: Math.max(Math.floor(crop.seedPrice * 4), crop.sellPrice * 2), // 4 倍反季溢价，且不低于作物售价×2
        quantity: 3 + Math.floor(rng() * 3) // 3-5 个
      })
    }
  }

  return stock
}
