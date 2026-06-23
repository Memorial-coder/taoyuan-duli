import type { LinkageDemandEntry, RewardTicketLedger, Season } from '@/types'
import { getFamilyWishDemandAntiRepeatTags, getLinkageDemandAntiRepeatTags, LINKAGE_DEMAND_POOL } from './linkageDemandPools'

export interface OnlineWeakItemOrderDef {
  id: string
  demandId: string
  itemId: string
  quantity: number
  title: string
  summary: string
  publicFeedback: string
  rotationReason: string
  ticketReward: RewardTicketLedger
  antiRepeatTags: string[]
}

type OnlineWeakItemOrderCopy = {
  title: string
  summary: string
  publicFeedback: string
  rotationReason: string
  quantity?: number
  ticketReward?: RewardTicketLedger
}

export const ONLINE_WEAK_ITEM_ORDER_ITEM_IDS = [
  'manor_edge_bundle',
  'mixed_seed_oil',
  'rice_flour',
  'dried_crop_bundle',
  'dried_fruit_mix',
  'fish_feed',
  'standard_bait'
] as const

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']
const WEEKS_PER_SEASON = 4
const DEFAULT_TICKET_REWARD: RewardTicketLedger = { caravan: 1 }

const ONLINE_WEAK_ITEM_ORDER_COPY: Record<typeof ONLINE_WEAK_ITEM_ORDER_ITEM_IDS[number], OnlineWeakItemOrderCopy> = {
  manor_edge_bundle: {
    title: '邻里边角备料单',
    summary: '把好友庄园照料留下的边角作物包送去公共仓，补足邻里日常菜篮。',
    publicFeedback: '公共仓备料进度+1',
    rotationReason: '好友庄园来源物，优先轮到公共仓消耗。',
    quantity: 3,
    ticketReward: { caravan: 1 }
  },
  mixed_seed_oil: {
    title: '公共灶间备油单',
    summary: '提交通用杂籽油，给村社灶间和邻里宴席留出基础油料。',
    publicFeedback: '公共灶间油料+1',
    rotationReason: '隐藏榨油产物已进入家庭和料理，本周转入线上备料。',
    quantity: 1,
    ticketReward: { caravan: 1 }
  },
  rice_flour: {
    title: '邻里糕点粉料单',
    summary: '把米粉送到公共仓，供节前糕点、家庭点心和互助订单周转。',
    publicFeedback: '公共仓粉料储备+1',
    rotationReason: '粉料分组产物需要周期出口，轮换到线上订单。',
    quantity: 2,
    ticketReward: { familyFavor: 1 }
  },
  dried_crop_bundle: {
    title: '冬储田园干货单',
    summary: '提交田园干货包，补充公共仓的冬储和外出补给。',
    publicFeedback: '公共仓冬储进度+1',
    rotationReason: '干货分组适合长期保存，作为周备料轮换消耗。',
    quantity: 2,
    ticketReward: { caravan: 1 }
  },
  dried_fruit_mix: {
    title: '旅途果干补给单',
    summary: '把什锦果干交给邻里公共仓，用作探访和短途协作的小补给。',
    publicFeedback: '旅途补给格+1',
    rotationReason: '甜味干货从宠物和节会用途扩展到线上补给。',
    quantity: 1,
    ticketReward: { caravan: 1 }
  },
  fish_feed: {
    title: '公共鱼塘饲料单',
    summary: '提交鱼饲料给公共仓，帮助邻里鱼塘和家庭观察课稳定运转。',
    publicFeedback: '公共鱼塘照料+1',
    rotationReason: '鱼塘材料已接家庭和训练，本周进入线上公共仓。',
    quantity: 3,
    ticketReward: { familyFavor: 1 }
  },
  standard_bait: {
    title: '邻里鱼饵补给单',
    summary: '把普通鱼饵整理给公共仓，供周末钓鱼互助和鱼塘观察使用。',
    publicFeedback: '钓鱼互助补给+1',
    rotationReason: '鱼饵属于高流量低单价物资，适合用周订单温和回收。',
    quantity: 6,
    ticketReward: { caravan: 1 }
  }
}

const normalizeQuantity = (entry: LinkageDemandEntry, fallbackQuantity?: number): number => {
  const min = Math.max(1, Math.floor(Number(entry.minQuantity) || 1))
  const max = Math.max(min, Math.floor(Number(entry.maxQuantity) || min))
  const requested = Math.floor(Number(fallbackQuantity) || min)
  return Math.min(max, Math.max(min, requested))
}

const normalizeTicketReward = (entry: LinkageDemandEntry, fallbackReward?: RewardTicketLedger): RewardTicketLedger => {
  const reward = entry.ticketReward ?? fallbackReward ?? DEFAULT_TICKET_REWARD
  return Object.fromEntries(
    Object.entries(reward)
      .map(([ticketType, amount]) => [ticketType, Math.max(0, Math.floor(Number(amount) || 0))] as const)
      .filter(([, amount]) => amount > 0)
  ) as RewardTicketLedger
}

const getOnlineWeakItemDemandEntry = (itemId: string): LinkageDemandEntry | undefined =>
  LINKAGE_DEMAND_POOL.find(entry =>
    entry.itemId === itemId &&
    entry.systems.includes('onlineOrder') &&
    entry.tags.includes('weak_item_sink')
  )

export const getOnlineWeakItemOrderPool = (): OnlineWeakItemOrderDef[] =>
  ONLINE_WEAK_ITEM_ORDER_ITEM_IDS
    .map(itemId => {
      const entry = getOnlineWeakItemDemandEntry(itemId)
      const copy = ONLINE_WEAK_ITEM_ORDER_COPY[itemId]
      if (!entry) return null
      return {
        id: `online_weak_item_order_${entry.itemId}`,
        demandId: entry.id,
        itemId: entry.itemId,
        quantity: normalizeQuantity(entry, copy.quantity),
        title: copy.title,
        summary: copy.summary,
        publicFeedback: copy.publicFeedback,
        rotationReason: copy.rotationReason,
        ticketReward: normalizeTicketReward(entry, copy.ticketReward),
        antiRepeatTags: getLinkageDemandAntiRepeatTags(entry)
      } satisfies OnlineWeakItemOrderDef
    })
    .filter((entry): entry is OnlineWeakItemOrderDef => Boolean(entry))

export const getOnlineWeakItemOrderWeekIndex = (day: number): number =>
  Math.ceil(Math.max(1, Math.floor(Number(day) || 1)) / 7)

export const getOnlineWeakItemOrderCycleIndex = (year: number, season: Season, day: number): number => {
  const normalizedYear = Math.max(1, Math.floor(Number(year) || 1))
  const seasonIndex = Math.max(0, SEASON_ORDER.indexOf(season))
  const weekIndex = Math.min(WEEKS_PER_SEASON, Math.max(1, getOnlineWeakItemOrderWeekIndex(day)))
  return (normalizedYear - 1) * SEASON_ORDER.length * WEEKS_PER_SEASON + seasonIndex * WEEKS_PER_SEASON + (weekIndex - 1)
}

export const getOnlineWeakItemOrderByCycleIndex = (cycleIndex: number): OnlineWeakItemOrderDef | null => {
  const pool = getOnlineWeakItemOrderPool()
  if (pool.length === 0) return null
  const index = ((Math.floor(Number(cycleIndex) || 0) % pool.length) + pool.length) % pool.length
  return pool[index] ?? null
}

export const getOnlineWeakItemOrderConflictTagsForFamilyWish = (wishId?: string | null): string[] =>
  wishId ? getFamilyWishDemandAntiRepeatTags(wishId) : []

export const hasOnlineWeakItemOrderAntiRepeatConflict = (
  order: OnlineWeakItemOrderDef | null | undefined,
  blockedTags: readonly string[] = []
): boolean => {
  if (!order || blockedTags.length <= 0) return false
  const blocked = new Set(blockedTags)
  return order.antiRepeatTags.some(tag => blocked.has(tag))
}

export const getOnlineWeakItemOrderByCycleIndexWithAntiRepeat = (
  cycleIndex: number,
  blockedTags: readonly string[] = []
): OnlineWeakItemOrderDef | null => {
  const pool = getOnlineWeakItemOrderPool()
  if (pool.length === 0) return null
  const normalizedStart = ((Math.floor(Number(cycleIndex) || 0) % pool.length) + pool.length) % pool.length
  if (blockedTags.length <= 0) return pool[normalizedStart] ?? null
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(normalizedStart + offset) % pool.length] ?? null
    if (!hasOnlineWeakItemOrderAntiRepeatConflict(candidate, blockedTags)) return candidate
  }
  return pool[normalizedStart] ?? null
}

export const getOnlineWeakItemOrderForCalendar = (
  year: number,
  season: Season,
  day: number,
  offset = 0,
  blockedTags: readonly string[] = []
): OnlineWeakItemOrderDef | null =>
  getOnlineWeakItemOrderByCycleIndexWithAntiRepeat(
    getOnlineWeakItemOrderCycleIndex(year, season, day) + offset,
    blockedTags
  )
