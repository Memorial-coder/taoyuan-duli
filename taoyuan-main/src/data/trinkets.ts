import type { EquipmentEffect } from '@/types'

export type TrinketUnlockRule = 'prize_progress' | 'mystery_box' | 'combat_mastery'

export interface TrinketDef {
  id: string
  name: string
  familyLabel: '护符' | '玉佩' | '灵器碎片'
  description: string
  sourceSummary: string
  unlockHint: string
  unlockRule: TrinketUnlockRule
  effects: EquipmentEffect[]
}

export const TRINKETS: TrinketDef[] = [
  {
    id: 'trinket_market_talisman',
    name: '护符·市声',
    familyLabel: '护符',
    description: '挂在衣襟边的薄护符，走进铺面时总能先一步嗅到更划算的买卖。',
    sourceSummary: '偏向奖券赏格、商路结算与村里赏契。',
    unlockHint: '拿到过阶段赏格后解锁。',
    unlockRule: 'prize_progress',
    effects: [
      { type: 'shop_discount', value: 0.05 },
      { type: 'sell_price_bonus', value: 0.08 }
    ]
  },
  {
    id: 'trinket_stream_jade',
    name: '玉佩·澄波',
    familyLabel: '玉佩',
    description: '温润的旧玉佩，靠近水边时会变得比平时更凉，也更安静。',
    sourceSummary: '偏向密匣、山泽遗箱与灵物封匣。',
    unlockHint: '开出过密匣后解锁。',
    unlockRule: 'mystery_box',
    effects: [
      { type: 'fishing_calm', value: 0.08 },
      { type: 'treasure_find', value: 0.08 }
    ]
  },
  {
    id: 'trinket_quarry_shard',
    name: '灵器碎片·山鸣',
    familyLabel: '灵器碎片',
    description: '边缘残缺的灵器碎片，握在手里时像能听见矿脉深处的回声。',
    sourceSummary: '偏向战斗精通、深层探索与后期冒险成长。',
    unlockHint: '战斗精通后解锁。',
    unlockRule: 'combat_mastery',
    effects: [
      { type: 'mining_stamina', value: 0.12 },
      { type: 'ore_bonus', value: 0.15 }
    ]
  }
]

export const getTrinketById = (id: string): TrinketDef | undefined => TRINKETS.find(entry => entry.id === id)
