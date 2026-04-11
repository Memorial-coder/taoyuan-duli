import type { Weather, Season, Weekday } from '@/types'
import { getWeekday } from './timeConstants'

/** 商铺定义 */
export interface ShopDef {
  id: string
  name: string
  description: string
  npcName: string
  closedDays: Weekday[]
  openHour: number
  closeHour: number
  closedWeathers: Weather[]
  closedSeasons: Season[]
}

/** 七大商铺 */
export const SHOPS: ShopDef[] = [
  {
    id: 'wanwupu',
    name: '万物铺',
    description: '陈伯经营的杂货铺，出售种子和日用品。',
    npcName: '陈伯',
    closedDays: ['wed'],
    openHour: 8,
    closeHour: 20,
    closedWeathers: [],
    closedSeasons: []
  },
  {
    id: 'tiejiangpu',
    name: '铁匠铺',
    description: '孙铁匠的铁匠铺，出售矿石和金属制品。',
    npcName: '孙铁匠',
    closedDays: ['sun'],
    openHour: 7,
    closeHour: 18,
    closedWeathers: [],
    closedSeasons: []
  },
  {
    id: 'biaoju',
    name: '镖局',
    description: '云飞开设的镖局，出售武器和战斗用品。',
    npcName: '云飞',
    closedDays: [],
    openHour: 10,
    closeHour: 22,
    closedWeathers: ['stormy'],
    closedSeasons: []
  },
  {
    id: 'yugupu',
    name: '渔具铺',
    description: '秋月的渔具小店，出售鱼饵和浮漂。',
    npcName: '秋月',
    closedDays: ['mon', 'tue'],
    openHour: 6,
    closeHour: 17,
    closedWeathers: ['stormy'],
    closedSeasons: []
  },
  {
    id: 'yaopu',
    name: '药铺',
    description: '林老的药铺，出售肥料和草药。',
    npcName: '林老',
    closedDays: [],
    openHour: 8,
    closeHour: 20,
    closedWeathers: ['stormy'],
    closedSeasons: ['winter']
  },
  {
    id: 'chouduanzhuang',
    name: '绸缎庄',
    description: '素素的绸缎庄，出售布匹和精美礼品。',
    npcName: '素素',
    closedDays: ['sat', 'sun'],
    openHour: 9,
    closeHour: 18,
    closedWeathers: [],
    closedSeasons: []
  },
  {
    id: 'jiuguan',
    name: '醉桃源酒馆',
    description: '老掌柜开设的小酒馆，供应自酿米酒、小食和特酿佳品，也是村里消遣的好去处。',
    npcName: '老掌柜',
    closedDays: ['mon'],
    openHour: 11,
    closeHour: 23,
    closedWeathers: [],
    closedSeasons: []
  }
]

/** 根据 ID 查找商铺 */
export const getShopById = (id: string): ShopDef | undefined => {
  return SHOPS.find(s => s.id === id)
}

/** 判断商铺是否营业中 */
export const isShopAvailable = (shop: ShopDef, day: number, hour: number, weather: Weather, season: Season): boolean => {
  const weekday = getWeekday(day)
  if (shop.closedDays.includes(weekday)) return false
  if (hour < shop.openHour || hour >= shop.closeHour) return false
  if (shop.closedWeathers.length > 0 && shop.closedWeathers.includes(weather)) return false
  if (shop.closedSeasons.length > 0 && shop.closedSeasons.includes(season)) return false
  return true
}

/** 获取商铺关闭原因 */
export const getShopClosedReason = (shop: ShopDef, day: number, hour: number, weather: Weather, season: Season): string => {
  const weekday = getWeekday(day)
  if (shop.closedSeasons.length > 0 && shop.closedSeasons.includes(season)) {
    return '本季休业'
  }
  if (shop.closedWeathers.length > 0 && shop.closedWeathers.includes(weather)) {
    return '天气原因休息'
  }
  if (shop.closedDays.includes(weekday)) {
    return '今日休息'
  }
  if (hour < shop.openHour) {
    return `${shop.openHour}点开门`
  }
  if (hour >= shop.closeHour) {
    return '已打烊'
  }
  return ''
}
