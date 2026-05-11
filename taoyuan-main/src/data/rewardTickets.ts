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
    poolStageId: 'starter',
    counterLabel: '祠堂赏格',
    poolTags: ['工料补给', '基础建设'],
    rewardItems: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 20 }
    ]
  },
  {
    id: 'construction_seed_crate',
    ticketType: 'construction',
    label: '种植备线包',
    description: '把建设线顺手换成下轮种植准备，适合节前备货或扩建后的第一批播种。',
    costTickets: 4,
    poolStageId: 'starter',
    counterLabel: '祠堂赏格',
    poolTags: ['功能种子', '种植准备'],
    rewardItems: [
      { itemId: 'seed_garlic', quantity: 4 },
      { itemId: 'quality_fertilizer', quantity: 4 },
      { itemId: 'speed_gro', quantity: 2 }
    ]
  },
  {
    id: 'exhibit_promo_pack',
    ticketType: 'exhibit',
    label: '布展宣发包',
    description: '以展陈券换取一批适合展馆布置与节庆陈列的物资。',
    costTickets: 3,
    poolStageId: 'settlement',
    counterLabel: '祠堂赏格',
    poolTags: ['节庆陈设', '展示补给'],
    rewardItems: [
      { itemId: 'pine_incense', quantity: 2 },
      { itemId: 'osmanthus', quantity: 4 }
    ]
  },
  {
    id: 'exhibit_gift_bundle',
    ticketType: 'exhibit',
    label: '茶会人情包',
    description: '偏向关系和陈列两用的轻礼物组合，适合节前走动或补关系线。',
    costTickets: 4,
    poolStageId: 'settlement',
    counterLabel: '祠堂赏格',
    poolTags: ['关系礼物', '茶会陈设'],
    rewardItems: [
      { itemId: 'osmanthus_tea', quantity: 2 },
      { itemId: 'pine_incense', quantity: 1 },
      { itemId: 'camphor_incense', quantity: 1 }
    ]
  },
  {
    id: 'caravan_supply_pack',
    ticketType: 'caravan',
    label: '商路补给箱',
    description: '以商路票调拨一批沿线补给，用于维持周度供货与货运周转。',
    costTickets: 3,
    poolStageId: 'starter',
    counterLabel: '村衙赏契',
    poolTags: ['商路补给', '供货周转'],
    rewardItems: [
      { itemId: 'charcoal', quantity: 8 },
      { itemId: 'tea', quantity: 4 }
    ]
  },
  {
    id: 'caravan_home_material_case',
    ticketType: 'caravan',
    label: '行旅家装箱',
    description: '从商路周转里挪出一批适合家居和展示角落的耐用品，偏向生活层慢建设。',
    costTickets: 5,
    poolStageId: 'settlement',
    counterLabel: '村衙赏契',
    poolTags: ['家居扩建材料', '耐用品'],
    rewardItems: [
      { itemId: 'cloth', quantity: 2 },
      { itemId: 'charcoal', quantity: 10 },
      { itemId: 'wood', quantity: 16 }
    ]
  },
  {
    id: 'research_field_pack',
    ticketType: 'research',
    label: '研修样本箱',
    description: '以研究券换取学舍常用的样本与记录材料，便于持续研究。',
    costTickets: 3,
    poolStageId: 'discovery',
    counterLabel: '村衙赏契',
    poolTags: ['研究样箱', '基础线索'],
    rewardItems: [
      { itemId: 'herb', quantity: 10 },
      { itemId: 'quartz', quantity: 4 }
    ]
  },
  {
    id: 'research_archive_case',
    ticketType: 'research',
    label: '档案探查箱',
    description: '偏向中后期见闻和深层准备，会混入更适合研究、矿洞与秘密线的物资。',
    costTickets: 5,
    poolStageId: 'discovery',
    counterLabel: '村衙赏契',
    poolTags: ['见闻扩展', '深层准备'],
    rewardItems: [
      { itemId: 'battery', quantity: 1 },
      { itemId: 'quartz', quantity: 6 },
      { itemId: 'herb', quantity: 8 }
    ]
  }
]
