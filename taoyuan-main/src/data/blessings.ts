import type { EquipmentEffect } from '@/types'

export type BlessingMarketCategory = 'crop' | 'fish' | 'animal_product' | 'processed' | 'fruit' | 'ore' | 'gem'

export interface BlessingDef {
  id: string
  label: string
  sourceLabel: string
  sourceSummary: string
  summary: string
  effects: EquipmentEffect[]
  preferredMarketCategories: BlessingMarketCategory[]
}

export const BLESSINGS: BlessingDef[] = [
  {
    id: 'blessing_shrine_tide',
    label: '鱼汛顺风',
    sourceLabel: '祠堂签',
    sourceSummary: '来自祠堂签与神像回响的水路吉兆。',
    summary: '今天更适合先去钓鱼、鱼塘和看水路相关委托。',
    effects: [
      { type: 'fishing_stamina', value: 0.12 },
      { type: 'fishing_calm', value: 0.08 },
      { type: 'fish_quality_bonus', value: 0.12 }
    ],
    preferredMarketCategories: ['fish']
  },
  {
    id: 'blessing_mountain_trade',
    label: '商路活络',
    sourceLabel: '山神兆',
    sourceSummary: '来自山门占签与行旅神像的商路吉兆。',
    summary: '今天更适合接委托、出货、看赏格和顺手推进关系。',
    effects: [
      { type: 'shop_discount', value: 0.05 },
      { type: 'sell_price_bonus', value: 0.08 },
      { type: 'gift_friendship', value: 1 }
    ],
    preferredMarketCategories: ['processed', 'crop', 'animal_product']
  },
  {
    id: 'blessing_season_echo',
    label: '山野回响',
    sourceLabel: '节气气运',
    sourceSummary: '来自节气气运、占签与外出见闻的山野吉兆。',
    summary: '今天更适合先去采集、挖矿和摸一轮宝箱 / 见闻机会。',
    effects: [
      { type: 'mining_stamina', value: 0.1 },
      { type: 'treasure_find', value: 0.08 },
      { type: 'luck', value: 0.06 }
    ],
    preferredMarketCategories: ['ore', 'gem', 'fruit']
  }
]

export const getBlessingById = (id: string): BlessingDef | undefined => BLESSINGS.find(entry => entry.id === id)
