import type { RewardTicketType } from '@/types'

export interface PrizeTicketNamingLayer {
  id: string
  label: string
  summary: string
}

export interface RewardTicketPrizeStageDef {
  id: string
  label: string
  unlockLifetimeTickets: number
  summary: string
  linkedTicketTypes: RewardTicketType[]
  spotlightRewards: string[]
  notes: string[]
}

export const PRIZE_TICKET_NAMING_LAYERS: PrizeTicketNamingLayer[] = [
  {
    id: 'xiangyue',
    label: '乡约牌',
    summary: '把委托、节庆和阶段成果换来的奖券统称记作乡约牌，表示这份人情与功绩已被村里记下。'
  },
  {
    id: 'citang_shangge',
    label: '祠堂赏格',
    summary: '固定兑奖台统一设在祠堂赏格，方便玩家把长期攒下来的奖券换成更偏功能和收藏的回报。'
  },
  {
    id: 'cunya_shangqi',
    label: '村衙赏契',
    summary: '高阶段奖池会被视作村衙赏契，强调这已经不是临时小赏，而是阶段认可与长期资源调拨。'
  }
]

export const REWARD_TICKET_SOURCE_HINTS = [
  '普通委托会开始少量回流专项奖券。',
  '特殊订单会按主题与评分放大奖券收益。',
  '节庆与周赛夺冠会直接写入高价值票券。',
  '阶段性样板交付和连续表现会推动更高阶奖池露出。'
] as const

export const REWARD_TICKET_PRIZE_STAGES: RewardTicketPrizeStageDef[] = [
  {
    id: 'starter',
    label: '初阶赏格',
    unlockLifetimeTickets: 0,
    summary: '偏补给和开线，解决“今天就能继续推进”的短线需求。',
    linkedTicketTypes: ['construction', 'caravan', 'research'],
    spotlightRewards: ['功能种子', '常备工料', '沿路补给'],
    notes: ['更适合刚把委托、周赛和主题周跑顺时使用。']
  },
  {
    id: 'settlement',
    label: '安居赏格',
    unlockLifetimeTickets: 8,
    summary: '开始混入家园、节庆和关系向奖励，让票券不只等于补给。',
    linkedTicketTypes: ['construction', 'exhibit', 'familyFavor'],
    spotlightRewards: ['稀有陈设', '关系礼物', '家居扩建材料'],
    notes: ['第二层开始更像“生活越来越丰盛”的回报。']
  },
  {
    id: 'discovery',
    label: '见闻赏契',
    unlockLifetimeTickets: 18,
    summary: '会逐步露出更偏发现和收藏的奖池，用来承接纸条、书商和长线经营。',
    linkedTicketTypes: ['research', 'exhibit', 'caravan'],
    spotlightRewards: ['密匣线索', '专题样箱', '节庆收藏物'],
    notes: ['这一层开始强调“下一件会改变什么”。']
  },
  {
    id: 'masterwork',
    label: '高阶赏契',
    unlockLifetimeTickets: 32,
    summary: '面向后期长期局，开始承接更稀有的生活设施、样板供货和复合收藏方向。',
    linkedTicketTypes: ['construction', 'research', 'guildLogistics', 'familyFavor'],
    spotlightRewards: ['高阶功能物', '家园纪念位', '神秘箱 / 密匣', '长期样板奖励'],
    notes: ['更适合配合特殊订单、节庆夺冠和高阶段经营去攒。']
  }
]

export const getActiveRewardTicketPrizeStage = (lifetimeTickets: number): RewardTicketPrizeStageDef => {
  const normalized = Math.max(0, Math.floor(Number(lifetimeTickets) || 0))
  const fallbackStage = REWARD_TICKET_PRIZE_STAGES[0]
  if (!fallbackStage) {
    throw new Error('REWARD_TICKET_PRIZE_STAGES 不能为空。')
  }
  let active: RewardTicketPrizeStageDef = fallbackStage
  for (const stage of REWARD_TICKET_PRIZE_STAGES) {
    if (normalized >= stage.unlockLifetimeTickets) {
      active = stage
    }
  }
  return active
}
