import type { RewardTicketDefinition, RewardTicketExchangeOffer, RewardTicketType } from '@/types'

export const REWARD_TICKET_DEFS: RewardTicketDefinition[] = [
  {
    id: 'construction',
    label: '建设券',
    description: '用于调拨工料、支架与施工配给，偏向村庄建设与扩建相关用途。'
  },
  {
    id: 'exhibit',
    label: '展陈券',
    description: '用于布展、陈列与来访宣传，偏向展馆与专题展示的运营用途。'
  },
  {
    id: 'caravan',
    label: '商路票',
    description: '用于商队周转、货运凭条与流通协调，偏向商路与供货链路。'
  },
  {
    id: 'research',
    label: '研究券',
    description: '用于样本整理、讲席资助与学舍研修，偏向研究与学识累积。'
  },
  {
    id: 'guildLogistics',
    label: '后勤票',
    description: '用于公会后勤、补给调拨与协力运输，保留给后续公会循环扩展。'
  },
  {
    id: 'familyFavor',
    label: '家和券',
    description: '用于家庭与社交协助调配，保留给后续家庭愿望与社交长期线。'
  }
]

export const REWARD_TICKET_LABELS = Object.fromEntries(REWARD_TICKET_DEFS.map(def => [def.id, def.label])) as Record<RewardTicketType, string>

export const REWARD_TICKET_EXCHANGE_OFFERS: RewardTicketExchangeOffer[] = [
  {
    id: 'construction_supply_pack',
    ticketType: 'construction',
    label: '工料周转包',
    description: '以建设券调拨一批常备工料，补足扩建与维护时常用的基础材料。',
    costTickets: 3,
    rewardItems: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 20 }
    ]
  },
  {
    id: 'exhibit_promo_pack',
    ticketType: 'exhibit',
    label: '布展宣发包',
    description: '以展陈券换取一批适合展馆布置与节庆陈列的物资。',
    costTickets: 3,
    rewardItems: [
      { itemId: 'pine_incense', quantity: 2 },
      { itemId: 'osmanthus', quantity: 4 }
    ]
  },
  {
    id: 'caravan_supply_pack',
    ticketType: 'caravan',
    label: '商路补给箱',
    description: '以商路票调拨一批沿线补给，用于维持周度供货与货运周转。',
    costTickets: 3,
    rewardItems: [
      { itemId: 'charcoal', quantity: 8 },
      { itemId: 'tea', quantity: 4 }
    ]
  },
  {
    id: 'research_field_pack',
    ticketType: 'research',
    label: '研修样本箱',
    description: '以研究券换取学舍常用的样本与记录材料，便于持续研究。',
    costTickets: 3,
    rewardItems: [
      { itemId: 'herb', quantity: 10 },
      { itemId: 'quartz', quantity: 4 }
    ]
  }
]