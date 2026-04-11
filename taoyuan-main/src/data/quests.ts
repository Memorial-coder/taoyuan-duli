import type { CompendiumEntry, QuestTemplateDef, QuestInstance, QuestType, RelationshipStage, VillagerQuestCategory } from '@/types'
import type { Season } from '@/types/game'
import { getNpcById } from './npcs'
import { getCropById } from './crops'
import { getBreedById } from './pondBreeds'
import { isRelationshipStageAtLeast, NPC_VILLAGER_QUEST_PROFILES } from './npcWorld'

export const QUEST_TEMPLATES: QuestTemplateDef[] = [
  {
    type: 'delivery',
    targets: [
      // 常见作物 — 混合季节
      { itemId: 'cabbage', name: '青菜', minQty: 2, maxQty: 5, seasons: ['spring'], unitPrice: 35 },
      { itemId: 'radish', name: '萝卜', minQty: 2, maxQty: 4, seasons: ['spring'], unitPrice: 55 },
      { itemId: 'potato', name: '土豆', minQty: 2, maxQty: 4, seasons: ['spring'], unitPrice: 50 },
      { itemId: 'rice', name: '稻米', minQty: 2, maxQty: 5, seasons: ['summer'], unitPrice: 40 },
      { itemId: 'watermelon', name: '西瓜', minQty: 1, maxQty: 3, seasons: ['summer'], unitPrice: 80 },
      { itemId: 'chili', name: '辣椒', minQty: 2, maxQty: 4, seasons: ['summer'], unitPrice: 45 },
      { itemId: 'pumpkin', name: '南瓜', minQty: 1, maxQty: 3, seasons: ['autumn'], unitPrice: 100 },
      { itemId: 'sweet_potato', name: '红薯', minQty: 2, maxQty: 4, seasons: ['autumn'], unitPrice: 60 },
      { itemId: 'winter_wheat', name: '冬小麦', minQty: 2, maxQty: 5, seasons: ['winter'], unitPrice: 45 },
      { itemId: 'garlic', name: '大蒜', minQty: 2, maxQty: 4, seasons: ['winter'], unitPrice: 50 }
    ],
    npcPool: ['chen_bo', 'liu_niang', 'lin_lao', 'xiao_man'],
    rewardMultiplier: 3,
    friendshipReward: 5
  },
  {
    type: 'fishing',
    targets: [
      { itemId: 'crucian', name: '鲫鱼', minQty: 1, maxQty: 3, seasons: [], unitPrice: 15 },
      { itemId: 'carp', name: '鲤鱼', minQty: 1, maxQty: 2, seasons: ['spring', 'summer'], unitPrice: 25 },
      { itemId: 'grass_carp', name: '草鱼', minQty: 1, maxQty: 2, seasons: ['summer', 'autumn'], unitPrice: 30 },
      { itemId: 'catfish', name: '鲶鱼', minQty: 1, maxQty: 2, seasons: ['summer'], unitPrice: 40 },
      { itemId: 'bass', name: '鲈鱼', minQty: 1, maxQty: 2, seasons: ['autumn'], unitPrice: 35 },
      { itemId: 'loach', name: '泥鳅', minQty: 1, maxQty: 3, seasons: ['summer', 'autumn'], unitPrice: 20 },
      { itemId: 'creek_shrimp', name: '溪虾', minQty: 2, maxQty: 4, seasons: ['spring', 'summer', 'autumn'], unitPrice: 30 },
      { itemId: 'silver_carp', name: '白鲢', minQty: 1, maxQty: 2, seasons: ['summer'], unitPrice: 25 }
    ],
    npcPool: ['qiu_yue', 'chen_bo', 'lin_lao'],
    rewardMultiplier: 3,
    friendshipReward: 3
  },
  {
    type: 'mining',
    targets: [
      { itemId: 'copper_ore', name: '铜矿', minQty: 3, maxQty: 8, seasons: [], unitPrice: 10 },
      { itemId: 'iron_ore', name: '铁矿', minQty: 3, maxQty: 6, seasons: [], unitPrice: 20 },
      { itemId: 'gold_ore', name: '金矿', minQty: 2, maxQty: 4, seasons: [], unitPrice: 40 },
      { itemId: 'quartz', name: '石英', minQty: 1, maxQty: 3, seasons: [], unitPrice: 30 },
      { itemId: 'jade', name: '翡翠', minQty: 1, maxQty: 2, seasons: [], unitPrice: 80 }
    ],
    npcPool: ['a_shi', 'xiao_man', 'chen_bo'],
    rewardMultiplier: 2,
    friendshipReward: 3
  },
  {
    type: 'gathering',
    targets: [
      { itemId: 'wood', name: '木材', minQty: 5, maxQty: 10, seasons: [], unitPrice: 5 },
      { itemId: 'herb', name: '草药', minQty: 2, maxQty: 5, seasons: ['spring', 'summer', 'autumn'], unitPrice: 15 },
      { itemId: 'firewood', name: '柴火', minQty: 5, maxQty: 10, seasons: [], unitPrice: 3 },
      { itemId: 'bamboo', name: '竹子', minQty: 3, maxQty: 6, seasons: ['spring', 'summer'], unitPrice: 10 },
      { itemId: 'pine_cone', name: '松果', minQty: 2, maxQty: 4, seasons: ['autumn', 'winter'], unitPrice: 10 },
      { itemId: 'wild_mushroom', name: '野蘑菇', minQty: 2, maxQty: 4, seasons: ['autumn'], unitPrice: 20 },
      { itemId: 'wild_berry', name: '野果', minQty: 3, maxQty: 5, seasons: ['summer'], unitPrice: 10 },
      { itemId: 'ginseng', name: '人参', minQty: 1, maxQty: 2, seasons: ['autumn', 'winter'], unitPrice: 50 }
    ],
    npcPool: ['lin_lao', 'liu_niang', 'xiao_man'],
    rewardMultiplier: 3,
    friendshipReward: 5
  },
  {
    type: 'mining',
    targets: [
      { itemId: 'copper_ore', name: '铜矿', minQty: 5, maxQty: 10, seasons: [], unitPrice: 8 },
      { itemId: 'iron_ore', name: '铁矿', minQty: 3, maxQty: 6, seasons: [], unitPrice: 15 },
      { itemId: 'gold_ore', name: '金矿', minQty: 2, maxQty: 4, seasons: [], unitPrice: 25 },
      { itemId: 'quartz', name: '石英', minQty: 2, maxQty: 4, seasons: [], unitPrice: 12 },
      { itemId: 'stone', name: '石材', minQty: 8, maxQty: 15, seasons: [], unitPrice: 3 }
    ],
    npcPool: ['a_shi', 'sun_tiejiang', 'yun_fei'],
    rewardMultiplier: 4,
    friendshipReward: 6
  },
  {
    type: 'gathering',
    targets: [
      { itemId: 'copper_bar', name: '铜锭', minQty: 1, maxQty: 3, seasons: [], unitPrice: 50 },
      { itemId: 'iron_bar', name: '铁锭', minQty: 1, maxQty: 2, seasons: [], unitPrice: 90 },
      { itemId: 'honey', name: '蜂蜜', minQty: 1, maxQty: 3, seasons: ['spring', 'summer', 'autumn'], unitPrice: 60 },
      { itemId: 'rice_wine', name: '米酒', minQty: 1, maxQty: 2, seasons: [], unitPrice: 80 },
      { itemId: 'cooking_oil', name: '食用油', minQty: 1, maxQty: 2, seasons: [], unitPrice: 70 }
    ],
    npcPool: ['sun_tiejiang', 'chun_lan', 'xue_qin', 'lin_lao'],
    rewardMultiplier: 5,
    friendshipReward: 8
  }
]

// 委托类型描述映射（预留）
export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  delivery: '送',
  fishing: '钓',
  mining: '采',
  gathering: '收集',
  special_order: '特殊',
  cooking: '烹',
  errand: '跑腿',
  festival_prep: '节庆'
}

const QUEST_TYPE_VERBS: Record<QuestType, string> = {
  delivery: '送给',
  fishing: '钓到',
  mining: '采集',
  gathering: '收集',
  special_order: '收集',
  cooking: '备齐',
  errand: '送到',
  festival_prep: '筹备'
}

/** 特殊订单模板 */
interface SpecialOrderTemplate {
  name: string
  targetItemId: string
  targetItemName: string
  quantity: number
  days: number
  moneyReward: number
  itemReward: { itemId: string; quantity: number }[]
  seasons: Season[]
  npcId: string
  /** 难度梯度: 1=第7天(简单), 2=第14天(普通), 3=第21天(困难), 4=第28天(极难) */
  tier: number
  /** 若填写，则只有发现该杂交品种后才会进入订单池 */
  requiredHybridId?: string
  /** 玩法主题标签 */
  themeTag?: 'breeding' | 'fishpond'
  preferredSeasons?: Season[]
  bonusSummary?: string[]
  requiredSweetnessMin?: number
  requiredYieldMin?: number
  requiredResistanceMin?: number
  requiredGenerationMin?: number
  requiredParentCropIds?: string[]
  deliveryMode?: 'inventory' | 'pond'
  requiredPondGenerationMin?: number
  requiredFishMature?: boolean
  requiredFishHealthy?: boolean
}

export const BREEDING_SPECIAL_ORDER_BASELINE = {
  auditId: 'ws05_breeding_special_order_theme_week',
  demandPrinciples: ['可追踪', '可准备', '可解释'],
  metricSourceNotes: {
    orderCompletion: '以 special_order 接取到提交的完整链路为准，不统计未接取即过期的订单。',
    breedingReadiness: '以 compendium 的 bestSweetness / bestYield / bestResistance / bestGeneration 与 lineageCropIds 为统一口径。',
    themeBias: '以 preferredQuestThemeTag 与 breedingFocusHybridIds 为主题周偏置来源。'
  }
} as const

/** 按梯度分层的特殊订单模板 */
const SPECIAL_ORDER_TEMPLATES: SpecialOrderTemplate[] = [
  // === 第1梯度 (第7天): 简单, 7天时限, 数量少, 奖励适中 ===
  {
    name: '铜矿采购',
    targetItemId: 'copper_ore',
    targetItemName: '铜矿',
    quantity: 15,
    days: 7,
    moneyReward: 600,
    itemReward: [{ itemId: 'iron_ore', quantity: 3 }],
    seasons: [],
    npcId: 'a_shi',
    tier: 1
  },
  {
    name: '鲜鱼征集',
    targetItemId: 'crucian',
    targetItemName: '鲫鱼',
    quantity: 8,
    days: 7,
    moneyReward: 500,
    itemReward: [{ itemId: 'standard_bait', quantity: 10 }],
    seasons: [],
    npcId: 'qiu_yue',
    tier: 1
  },
  {
    name: '蔬菜采购',
    targetItemId: 'cabbage',
    targetItemName: '青菜',
    quantity: 10,
    days: 7,
    moneyReward: 500,
    itemReward: [{ itemId: 'basic_fertilizer', quantity: 5 }],
    seasons: ['spring'],
    npcId: 'liu_niang',
    tier: 1
  },
  {
    name: '木材备料',
    targetItemId: 'wood',
    targetItemName: '木材',
    quantity: 30,
    days: 7,
    moneyReward: 400,
    itemReward: [{ itemId: 'charcoal', quantity: 5 }],
    seasons: [],
    npcId: 'chen_bo',
    tier: 1
  },
  // === 第2梯度 (第14天): 普通, 7天时限, 数量中等, 奖励较好 ===
  {
    name: '铁矿备料',
    targetItemId: 'iron_ore',
    targetItemName: '铁矿',
    quantity: 15,
    days: 7,
    moneyReward: 1200,
    itemReward: [{ itemId: 'charcoal', quantity: 10 }],
    seasons: [],
    npcId: 'a_shi',
    tier: 2
  },
  {
    name: '珍鱼征集令',
    targetItemId: 'catfish',
    targetItemName: '鲶鱼',
    quantity: 5,
    days: 7,
    moneyReward: 1000,
    itemReward: [{ itemId: 'standard_bait', quantity: 20 }],
    seasons: ['summer'],
    npcId: 'qiu_yue',
    tier: 2
  },
  {
    name: '冬储备战',
    targetItemId: 'winter_wheat',
    targetItemName: '冬小麦',
    quantity: 15,
    days: 7,
    moneyReward: 1200,
    itemReward: [{ itemId: 'seed_garlic', quantity: 5 }],
    seasons: ['winter'],
    npcId: 'chen_bo',
    tier: 2
  },
  {
    name: '翡翠萝卜尝鲜单',
    targetItemId: 'emerald_radish',
    targetItemName: '翡翠萝卜',
    quantity: 6,
    days: 7,
    moneyReward: 1400,
    itemReward: [{ itemId: 'quality_fertilizer', quantity: 3 }],
    seasons: ['spring'],
    npcId: 'liu_niang',
    tier: 2,
    requiredHybridId: 'emerald_radish',
    themeTag: 'breeding',
    preferredSeasons: ['spring'],
    bonusSummary: ['春种主题周期间更容易刷出。']
  },
  {
    name: '金油薯备货',
    targetItemId: 'golden_tuber',
    targetItemName: '金油薯',
    quantity: 8,
    days: 7,
    moneyReward: 1700,
    itemReward: [{ itemId: 'speed_gro', quantity: 2 }],
    seasons: ['spring', 'summer'],
    npcId: 'chen_bo',
    tier: 2,
    requiredHybridId: 'golden_tuber',
    themeTag: 'breeding',
    preferredSeasons: ['spring'],
    bonusSummary: ['适合作为早期稳定供货的育种订单。']
  },
  // === 第3梯度 (第21天): 困难, 7天时限, 数量大, 奖励丰厚 ===
  {
    name: '丰收计划',
    targetItemId: 'pumpkin',
    targetItemName: '南瓜',
    quantity: 10,
    days: 7,
    moneyReward: 2000,
    itemReward: [{ itemId: 'quality_fertilizer', quantity: 5 }],
    seasons: ['autumn'],
    npcId: 'liu_niang',
    tier: 3
  },
  {
    name: '西瓜大丰收',
    targetItemId: 'watermelon',
    targetItemName: '西瓜',
    quantity: 10,
    days: 7,
    moneyReward: 2200,
    itemReward: [{ itemId: 'seed_watermelon', quantity: 5 }],
    seasons: ['summer'],
    npcId: 'xiao_man',
    tier: 3
  },
  {
    name: '深层金矿',
    targetItemId: 'gold_ore',
    targetItemName: '金矿',
    quantity: 15,
    days: 7,
    moneyReward: 2500,
    itemReward: [{ itemId: 'gold_ore', quantity: 5 }],
    seasons: [],
    npcId: 'a_shi',
    tier: 3
  },
  {
    name: '药材囤积',
    targetItemId: 'ginseng',
    targetItemName: '人参',
    quantity: 6,
    days: 7,
    moneyReward: 2000,
    itemReward: [{ itemId: 'herb', quantity: 15 }],
    seasons: ['autumn', 'winter'],
    npcId: 'lin_lao',
    tier: 3
  },
  {
    name: '茶肆特供',
    targetItemId: 'jade_tea',
    targetItemName: '翡翠茶',
    quantity: 6,
    days: 7,
    moneyReward: 2600,
    itemReward: [{ itemId: 'tea', quantity: 8 }],
    seasons: [],
    npcId: 'chun_lan',
    tier: 3,
    requiredHybridId: 'jade_tea',
    themeTag: 'breeding',
    requiredSweetnessMin: 60,
    requiredYieldMin: 52,
    requiredGenerationMin: 4,
    requiredParentCropIds: ['tea', 'chrysanthemum'],
    bonusSummary: ['茶肆开始挑选更成熟的茶系谱系，要求图鉴里已有稳定批次。']
  },
  {
    name: '莲心茶席',
    targetItemId: 'lotus_tea',
    targetItemName: '莲心茶',
    quantity: 6,
    days: 7,
    moneyReward: 2500,
    itemReward: [{ itemId: 'tea', quantity: 6 }],
    seasons: ['autumn'],
    npcId: 'chun_lan',
    tier: 3,
    requiredHybridId: 'lotus_tea',
    themeTag: 'breeding',
    preferredSeasons: ['autumn'],
    bonusSummary: ['秋收加工周更偏爱高甜度茶饮型杂交作物。']
  },
  {
    name: '桂花茶会',
    targetItemId: 'osmanthus_tea',
    targetItemName: '桂花茶',
    quantity: 8,
    days: 7,
    moneyReward: 3000,
    itemReward: [{ itemId: 'osmanthus', quantity: 6 }],
    seasons: ['autumn'],
    npcId: 'chun_lan',
    tier: 3,
    requiredHybridId: 'osmanthus_tea',
    themeTag: 'breeding',
    preferredSeasons: ['autumn'],
    bonusSummary: ['高品质花茶在节庆与宴席周需求更高。']
  },
  // === 第4梯度 (第28天): 极难, 7天时限, 数量极大, 奖励最丰厚 ===
  {
    name: '矿石大征集',
    targetItemId: 'gold_ore',
    targetItemName: '金矿',
    quantity: 25,
    days: 7,
    moneyReward: 4000,
    itemReward: [
      { itemId: 'gold_ore', quantity: 10 },
      { itemId: 'jade', quantity: 2 }
    ],
    seasons: [],
    npcId: 'a_shi',
    tier: 4
  },
  {
    name: '丰年盛宴',
    targetItemId: 'pumpkin',
    targetItemName: '南瓜',
    quantity: 20,
    days: 7,
    moneyReward: 4500,
    itemReward: [
      { itemId: 'quality_fertilizer', quantity: 10 },
      { itemId: 'speed_gro', quantity: 5 }
    ],
    seasons: ['autumn'],
    npcId: 'liu_niang',
    tier: 4
  },
  {
    name: '渔王挑战',
    targetItemId: 'catfish',
    targetItemName: '鲶鱼',
    quantity: 12,
    days: 7,
    moneyReward: 3500,
    itemReward: [{ itemId: 'wild_bait', quantity: 10 }],
    seasons: ['summer'],
    npcId: 'qiu_yue',
    tier: 4
  },
  {
    name: '冬日大囤货',
    targetItemId: 'winter_wheat',
    targetItemName: '冬小麦',
    quantity: 30,
    days: 7,
    moneyReward: 3500,
    itemReward: [
      { itemId: 'seed_garlic', quantity: 10 },
      { itemId: 'charcoal', quantity: 10 }
    ],
    seasons: ['winter'],
    npcId: 'chen_bo',
    tier: 4
  },
  {
    name: '金蜜宴筹备',
    targetItemId: 'golden_melon',
    targetItemName: '金蜜瓜',
    quantity: 10,
    days: 7,
    moneyReward: 5200,
    itemReward: [
      { itemId: 'speed_gro', quantity: 8 },
      { itemId: 'quality_fertilizer', quantity: 8 }
    ],
    seasons: [],
    npcId: 'liu_niang',
    tier: 4,
    requiredHybridId: 'golden_melon',
    themeTag: 'breeding',
    requiredSweetnessMin: 72,
    requiredYieldMin: 60,
    requiredGenerationMin: 8,
    requiredParentCropIds: ['watermelon', 'lotus_root'],
    bonusSummary: ['商会只收已经稳定量产的高代金蜜瓜，会同时检查图鉴最高属性与世代记录。']
  },
  {
    name: '雪蒜囤储令',
    targetItemId: 'frost_garlic',
    targetItemName: '霜雪蒜',
    quantity: 12,
    days: 7,
    moneyReward: 4200,
    itemReward: [
      { itemId: 'garlic', quantity: 10 },
      { itemId: 'quality_fertilizer', quantity: 5 }
    ],
    seasons: ['winter'],
    npcId: 'lin_lao',
    tier: 4,
    requiredHybridId: 'frost_garlic',
    themeTag: 'breeding',
    preferredSeasons: ['winter'],
    requiredResistanceMin: 72,
    requiredGenerationMin: 6,
    bonusSummary: ['寒季耐性作物更适合作为囤货订单核心，图鉴中需有足够抗性的稳定品系。']
  },
  {
    name: '观赏锦鲤评比',
    targetItemId: 'koi',
    targetItemName: '锦鲤',
    quantity: 2,
    days: 7,
    moneyReward: 1800,
    itemReward: [{ itemId: 'water_purifier', quantity: 2 }],
    seasons: ['spring', 'summer'],
    npcId: 'qiu_yue',
    tier: 2,
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 2,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['需直接从鱼塘提交成熟且健康的观赏鱼，不能临时从背包凑数。']
  },
  {
    name: '商会金鲤展售',
    targetItemId: 'golden_carp',
    targetItemName: '金鲤',
    quantity: 2,
    days: 7,
    moneyReward: 3200,
    itemReward: [{ itemId: 'fish_feed', quantity: 8 }],
    seasons: ['summer', 'autumn'],
    npcId: 'qiu_yue',
    tier: 3,
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 3,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['商路客商只收高代金鲤，适合作为鱼塘长期育种的中后期订单。']
  },
  {
    name: '洞窟盲鱼研究样本',
    targetItemId: 'cave_blindfish',
    targetItemName: '洞穴盲鱼',
    quantity: 2,
    days: 7,
    moneyReward: 4600,
    itemReward: [{ itemId: 'battery', quantity: 1 }],
    seasons: [],
    npcId: 'lin_lao',
    tier: 4,
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 2,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['稀有水产生物会优先走研究线，直接从鱼塘提交健康样本可换取高价值功能材料。']
  },

]

const TIER_LABELS = ['简单', '普通', '困难', '极难']
const TIER_FRIENDSHIP = [5, 8, 12, 15]

interface VillagerQuestTemplate {
  id: string
  npcId: string
  category: VillagerQuestCategory
  minStage: RelationshipStage
  targetItemId: string
  targetItemName: string
  minQty: number
  maxQty: number
  days: number
  rewardMultiplier: number
  friendshipReward: number
  seasons?: Season[]
  bonusSummary?: string[]
  itemReward?: { itemId: string; quantity: number }[]
  recipeReward?: string[]
  buildingClueId?: string
  buildingClueText?: string
}

const VILLAGER_QUEST_TEMPLATES: VillagerQuestTemplate[] = [
  {
    id: 'chen_bo_errand_stock',
    npcId: 'chen_bo',
    category: 'errand',
    minStage: 'familiar',
    targetItemId: 'wood',
    targetItemName: '木材',
    minQty: 12,
    maxQty: 20,
    days: 3,
    rewardMultiplier: 4,
    friendshipReward: 8,
    bonusSummary: ['完成后更容易接到陈伯的熟人活。']
  },
  {
    id: 'liu_niang_festival_flowers',
    npcId: 'liu_niang',
    category: 'festival_prep',
    minStage: 'friend',
    targetItemId: 'osmanthus',
    targetItemName: '桂花',
    minQty: 2,
    maxQty: 4,
    days: 3,
    rewardMultiplier: 9,
    friendshipReward: 12,
    seasons: ['summer', 'autumn'],
    bonusSummary: ['有机会听到柳娘提起村里的旧故事。'],
    buildingClueId: 'liu_niang_greenhouse_clue',
    buildingClueText: '柳娘说，节庆花材若有专门的暖房来育，会更稳定地留住香气。'
  },
  {
    id: 'a_shi_mine_support',
    npcId: 'a_shi',
    category: 'errand',
    minStage: 'bestie',
    targetItemId: 'iron_ore',
    targetItemName: '铁矿',
    minQty: 6,
    maxQty: 10,
    days: 4,
    rewardMultiplier: 7,
    friendshipReward: 10,
    bonusSummary: ['阿石会告诉你矿料储放的小窍门。'],
    buildingClueId: 'a_shi_support_clue',
    buildingClueText: '阿石提醒：若有稳固支架，农场上的矿材和器具都能收得更整齐。'
  },
  {
    id: 'qiu_yue_fishing_event',
    npcId: 'qiu_yue',
    category: 'fishing',
    minStage: 'familiar',
    targetItemId: 'crucian',
    targetItemName: '鲫鱼',
    minQty: 3,
    maxQty: 6,
    days: 2,
    rewardMultiplier: 7,
    friendshipReward: 8,
    itemReward: [{ itemId: 'standard_bait', quantity: 8 }],
    bonusSummary: ['秋月会顺手回赠一包鱼饵。']
  },
  {
    id: 'lin_lao_herb_kitchen',
    npcId: 'lin_lao',
    category: 'cooking',
    minStage: 'friend',
    targetItemId: 'herb',
    targetItemName: '草药',
    minQty: 4,
    maxQty: 6,
    days: 3,
    rewardMultiplier: 8,
    friendshipReward: 10,
    itemReward: [{ itemId: 'green_tea_drink', quantity: 1 }],
    bonusSummary: ['林老会给你一份养生茶饮。']
  },
  {
    id: 'wang_dashen_feast_prep',
    npcId: 'wang_dashen',
    category: 'festival_prep',
    minStage: 'friend',
    targetItemId: 'rice',
    targetItemName: '稻米',
    minQty: 4,
    maxQty: 8,
    days: 2,
    rewardMultiplier: 8,
    friendshipReward: 10,
    itemReward: [{ itemId: 'sesame_oil', quantity: 1 }],
    bonusSummary: ['王大婶做席时会顺手给你留一份香油。']
  },
  {
    id: 'xiao_man_festival_carpentry',
    npcId: 'xiao_man',
    category: 'festival_prep',
    minStage: 'familiar',
    targetItemId: 'bamboo',
    targetItemName: '竹子',
    minQty: 4,
    maxQty: 7,
    days: 3,
    rewardMultiplier: 6,
    friendshipReward: 8,
    itemReward: [{ itemId: 'wood', quantity: 8 }],
    bonusSummary: ['小满会把试做剩下的木料分给你一些。']
  },
  {
    id: 'zhao_mujiang_workbench',
    npcId: 'zhao_mujiang',
    category: 'gathering',
    minStage: 'friend',
    targetItemId: 'bamboo',
    targetItemName: '竹子',
    minQty: 6,
    maxQty: 10,
    days: 3,
    rewardMultiplier: 6,
    friendshipReward: 8,
    buildingClueId: 'zhao_mujiang_workbench',
    buildingClueText: '赵木匠提到，若农舍边有个像样的工台，做木工和修补都会方便很多。',
    bonusSummary: ['赵木匠愿意告诉你一些工台布置心得。']
  },
  {
    id: 'su_su_fabric_help',
    npcId: 'su_su',
    category: 'errand',
    minStage: 'friend',
    targetItemId: 'cloth',
    targetItemName: '布匹',
    minQty: 1,
    maxQty: 2,
    days: 3,
    rewardMultiplier: 10,
    friendshipReward: 10,
    itemReward: [{ itemId: 'silk_ribbon', quantity: 1 }],
    bonusSummary: ['素素会回赠一条精致的丝帕。']
  },
  {
    id: 'da_niu_barn_errand',
    npcId: 'da_niu',
    category: 'errand',
    minStage: 'friend',
    targetItemId: 'hay',
    targetItemName: '干草',
    minQty: 8,
    maxQty: 14,
    days: 2,
    rewardMultiplier: 5,
    friendshipReward: 8,
    itemReward: [{ itemId: 'hay', quantity: 5 }],
    bonusSummary: ['大牛很实在，常会再送你一点草料。']
  },
  {
    id: 'dan_qing_poetry_meet',
    npcId: 'dan_qing',
    category: 'errand',
    minStage: 'friend',
    targetItemId: 'tea',
    targetItemName: '茶叶',
    minQty: 2,
    maxQty: 4,
    days: 3,
    rewardMultiplier: 9,
    friendshipReward: 10,
    itemReward: [{ itemId: 'osmanthus', quantity: 1 }],
    bonusSummary: ['丹青会在下次文会上替你留一个靠前的位置。']
  },
  {
    id: 'mo_bai_evening_gathering',
    npcId: 'mo_bai',
    category: 'festival_prep',
    minStage: 'bestie',
    targetItemId: 'tea',
    targetItemName: '茶叶',
    minQty: 2,
    maxQty: 3,
    days: 3,
    rewardMultiplier: 8,
    friendshipReward: 12,
    bonusSummary: ['墨白会在下一次夜晚演奏时为你留个好位置。']
  },
  {
    id: 'hong_dou_cellar_errand',
    npcId: 'hong_dou',
    category: 'errand',
    minStage: 'familiar',
    targetItemId: 'osmanthus',
    targetItemName: '桂花',
    minQty: 3,
    maxQty: 5,
    days: 3,
    rewardMultiplier: 7,
    friendshipReward: 8,
    seasons: ['summer', 'autumn'],
    itemReward: [{ itemId: 'osmanthus_wine', quantity: 1 }],
    bonusSummary: ['红豆会回赠一壶新酿的桂花酿。']
  },
  {
    id: 'hong_dou_herb_gather',
    npcId: 'hong_dou',
    category: 'gathering',
    minStage: 'friend',
    targetItemId: 'herb',
    targetItemName: '草药',
    minQty: 4,
    maxQty: 7,
    days: 3,
    rewardMultiplier: 6,
    friendshipReward: 10,
    itemReward: [{ itemId: 'tavern_rice_wine', quantity: 2 }],
    bonusSummary: ['红豆感谢你，回赠两壶桃源米酒。']
  },
  {
    id: 'chun_lan_tea_gather',
    npcId: 'chun_lan',
    category: 'gathering',
    minStage: 'familiar',
    targetItemId: 'osmanthus',
    targetItemName: '桂花',
    minQty: 3,
    maxQty: 6,
    days: 3,
    rewardMultiplier: 8,
    friendshipReward: 8,
    seasons: ['summer', 'autumn'],
    itemReward: [{ itemId: 'green_tea_drink', quantity: 1 }],
    bonusSummary: ['春兰会泡一杯新茶回赠你。']
  },
  {
    id: 'chun_lan_festival_tea',
    npcId: 'chun_lan',
    category: 'festival_prep',
    minStage: 'friend',
    targetItemId: 'tea',
    targetItemName: '茶叶',
    minQty: 3,
    maxQty: 5,
    days: 3,
    rewardMultiplier: 9,
    friendshipReward: 10,
    itemReward: [{ itemId: 'osmanthus_tea', quantity: 1 }],
    bonusSummary: ['春兰会特别为你留一份节庆桂花茶。']
  },
  {
    id: 'xue_qin_pigment_errand',
    npcId: 'xue_qin',
    category: 'errand',
    minStage: 'familiar',
    targetItemId: 'osmanthus',
    targetItemName: '桂花',
    minQty: 2,
    maxQty: 4,
    days: 3,
    rewardMultiplier: 9,
    friendshipReward: 8,
    seasons: ['autumn'],
    itemReward: [{ itemId: 'pine_incense', quantity: 2 }],
    bonusSummary: ['雪琴感谢你，回赠两支松香。']
  },
  {
    id: 'xue_qin_festival_decor',
    npcId: 'xue_qin',
    category: 'festival_prep',
    minStage: 'friend',
    targetItemId: 'bamboo',
    targetItemName: '竹子',
    minQty: 4,
    maxQty: 6,
    days: 3,
    rewardMultiplier: 7,
    friendshipReward: 10,
    itemReward: [{ itemId: 'camphor_incense', quantity: 1 }],
    bonusSummary: ['雪琴回赠一支提神的樟脑香。']
  },
  {
    id: 'sun_tiejiang_ore_gather',
    npcId: 'sun_tiejiang',
    category: 'gathering',
    minStage: 'familiar',
    targetItemId: 'copper_ore',
    targetItemName: '铜矿',
    minQty: 8,
    maxQty: 12,
    days: 3,
    rewardMultiplier: 6,
    friendshipReward: 8,
    itemReward: [{ itemId: 'copper_bar', quantity: 2 }],
    bonusSummary: ['孙铁匠回赠两块铜锭。']
  },
  {
    id: 'sun_tiejiang_iron_errand',
    npcId: 'sun_tiejiang',
    category: 'errand',
    minStage: 'friend',
    targetItemId: 'iron_ore',
    targetItemName: '铁矿',
    minQty: 6,
    maxQty: 10,
    days: 3,
    rewardMultiplier: 7,
    friendshipReward: 10,
    itemReward: [{ itemId: 'iron_bar', quantity: 2 }],
    bonusSummary: ['孙铁匠多锻了两块铁锭给你。']
  },
  {
    id: 'yun_fei_patrol_errand',
    npcId: 'yun_fei',
    category: 'errand',
    minStage: 'familiar',
    targetItemId: 'wood',
    targetItemName: '木材',
    minQty: 10,
    maxQty: 15,
    days: 3,
    rewardMultiplier: 6,
    friendshipReward: 8,
    itemReward: [{ itemId: 'copper_bar', quantity: 1 }],
    bonusSummary: ['云飞回赠一块铜料作为酬谢。']
  },
  {
    id: 'yun_fei_supply_gather',
    npcId: 'yun_fei',
    category: 'gathering',
    minStage: 'friend',
    targetItemId: 'stone',
    targetItemName: '石材',
    minQty: 20,
    maxQty: 30,
    days: 3,
    rewardMultiplier: 5,
    friendshipReward: 10,
    itemReward: [{ itemId: 'iron_bar', quantity: 1 }],
    bonusSummary: ['云飞说镖局存货里还有铁锭，顺手给你一块。']
  }
]

const VILLAGER_CATEGORY_LABELS: Record<VillagerQuestCategory, string> = {
  gathering: '采集',
  cooking: '烹饪筹备',
  fishing: '钓鱼',
  errand: '跑腿',
  festival_prep: '节庆筹备'
}

export const generateVillagerQuest = (
  season: Season,
  relationshipStages: Record<string, RelationshipStage>,
  preferredCategory?: VillagerQuestCategory | null
): QuestInstance | null => {
  const valid = VILLAGER_QUEST_TEMPLATES.filter(template => {
    const stage = relationshipStages[template.npcId]
    if (!stage) return false
    const profile = NPC_VILLAGER_QUEST_PROFILES[template.npcId]
    if (profile && !profile.categories.includes(template.category)) return false
    if (!isRelationshipStageAtLeast(stage, template.minStage)) return false
    if (template.seasons && template.seasons.length > 0 && !template.seasons.includes(season)) return false
    return true
  })

  if (valid.length === 0) return null
  const preferredPool = preferredCategory ? valid.filter(template => template.category === preferredCategory) : []
  const templatePool = preferredPool.length > 0 ? preferredPool : valid
  const template = templatePool[Math.floor(Math.random() * templatePool.length)]!
  const npcDef = getNpcById(template.npcId)
  const npcName = npcDef?.name ?? template.npcId
  const quantity = template.minQty + Math.floor(Math.random() * (template.maxQty - template.minQty + 1))
  const moneyReward = Math.floor(quantity * template.rewardMultiplier * 12)
  const categoryLabel = VILLAGER_CATEGORY_LABELS[template.category]

  questCounter++
  return {
    id: `villager_${Date.now()}_${questCounter}`,
    type:
      template.category === 'cooking'
        ? 'cooking'
        : template.category === 'errand'
          ? 'errand'
          : template.category === 'festival_prep'
            ? 'festival_prep'
            : template.category,
    npcId: template.npcId,
    npcName,
    description: `${npcName}有一份${categoryLabel}委托：需要${quantity}个${template.targetItemName}。`,
    targetItemId: template.targetItemId,
    targetItemName: template.targetItemName,
    targetQuantity: quantity,
    collectedQuantity: 0,
    moneyReward,
    friendshipReward: template.friendshipReward,
    daysRemaining: template.days,
    accepted: false,
    sourceCategory: template.category,
    relationshipStageRequired: template.minStage,
    itemReward: template.itemReward,
    recipeReward: template.recipeReward,
    buildingClueId: template.buildingClueId,
    buildingClueText: template.buildingClueText,
    bonusSummary: template.bonusSummary
  }
}

/** 根据当前季节和梯度生成特殊订单 (tier: 1-4 对应 第7/14/21/28天) */
export const generateSpecialOrder = (
  season: Season,
  tier: number,
  options?: {
    discoveredHybridIds?: string[]
    breedingCompendiumEntries?: CompendiumEntry[]
    discoveredPondBreedIds?: string[]
    preferredThemeTag?: 'breeding' | 'fishpond'
    preferredHybridIds?: string[]
  }
): QuestInstance | null => {
  const clampedTier = Math.max(1, Math.min(4, tier))
  const discoveredHybridIds = new Set(options?.discoveredHybridIds ?? [])
  const compendiumMap = new Map((options?.breedingCompendiumEntries ?? []).map(entry => [entry.hybridId, entry]))
  const discoveredPondBreedIds = new Set(options?.discoveredPondBreedIds ?? [])
  const preferredHybridIds = new Set(options?.preferredHybridIds ?? [])

  const matchesBreedingRequirement = (template: SpecialOrderTemplate): boolean => {
    if (template.themeTag !== 'breeding') return true
    const entry = template.requiredHybridId ? compendiumMap.get(template.requiredHybridId) : undefined
    if (template.requiredHybridId && !entry) return false
    if (template.requiredSweetnessMin && (entry?.bestSweetness ?? 0) < template.requiredSweetnessMin) return false
    if (template.requiredYieldMin && (entry?.bestYield ?? 0) < template.requiredYieldMin) return false
    if (template.requiredResistanceMin && (entry?.bestResistance ?? 0) < template.requiredResistanceMin) return false
    if (template.requiredGenerationMin && (entry?.bestGeneration ?? 0) < template.requiredGenerationMin) return false
    if (template.requiredParentCropIds?.length) {
      const lineageCropIds = new Set(entry?.lineageCropIds ?? [])
      if (!template.requiredParentCropIds.every(cropId => lineageCropIds.has(cropId))) return false
    }
    return true
  }

  const matchesFishpondRequirement = (template: SpecialOrderTemplate): boolean => {
    if (template.themeTag !== 'fishpond') return true
    if (!template.requiredPondGenerationMin) return discoveredPondBreedIds.size > 0
    for (const breedId of discoveredPondBreedIds) {
      const breed = getBreedById(breedId)
      if (!breed) continue
      if (breed.baseFishId === template.targetItemId && breed.generation >= template.requiredPondGenerationMin) {
        return true
      }
    }
    return false
  }

  const valid = SPECIAL_ORDER_TEMPLATES.filter(
    t =>
      t.tier === clampedTier &&
      (t.seasons.length === 0 || t.seasons.includes(season)) &&
      (!t.requiredHybridId || discoveredHybridIds.has(t.requiredHybridId)) &&
      matchesBreedingRequirement(t) &&
      matchesFishpondRequirement(t)
  )
  if (valid.length === 0) return null

  const getRequirementSummary = (template: SpecialOrderTemplate): string[] => {
    const summary: string[] = []
    if (template.requiredHybridId) {
      summary.push(`已发现杂交：${getCropById(template.requiredHybridId)?.name ?? template.requiredHybridId}`)
    }
    if (template.requiredSweetnessMin) summary.push(`图鉴甜度≥${template.requiredSweetnessMin}`)
    if (template.requiredYieldMin) summary.push(`图鉴产量≥${template.requiredYieldMin}`)
    if (template.requiredResistanceMin) summary.push(`图鉴抗性≥${template.requiredResistanceMin}`)
    if (template.requiredGenerationMin) summary.push(`图鉴最高世代≥${template.requiredGenerationMin}`)
    if (template.requiredParentCropIds?.length) {
      summary.push(`谱系需含：${template.requiredParentCropIds.map(cropId => getCropById(cropId)?.name ?? cropId).join('、')}`)
    }
    if (template.requiredPondGenerationMin) summary.push(`鱼塘品系代数≥${template.requiredPondGenerationMin}`)
    if (template.requiredFishMature) summary.push('需成熟个体')
    if (template.requiredFishHealthy) summary.push('需健康个体')
    if (template.deliveryMode === 'pond') summary.push('可直接从鱼塘交付')
    return summary
  }

  const weightedPool = valid.flatMap(template => {
    let weight = 1
    if (options?.preferredThemeTag && template.themeTag === options.preferredThemeTag) {
      weight += 2
    }
    if (template.preferredSeasons?.includes(season)) {
      weight += 1
    }
    if (template.requiredHybridId && preferredHybridIds.has(template.requiredHybridId)) {
      weight += 2
    }
    return Array.from({ length: weight }, () => template)
  })

  const pool = weightedPool.length > 0 ? weightedPool : valid
  const template = pool[Math.floor(Math.random() * pool.length)]!
  const npcDef = getNpcById(template.npcId)
  const npcName = npcDef?.name ?? template.npcId
  const tierLabel = TIER_LABELS[clampedTier - 1]

  questCounter++
  return {
    id: `special_${Date.now()}_${questCounter}`,
    type: 'special_order',
    npcId: template.npcId,
    npcName,
    tierLabel,
    description: `${npcName}急需${template.quantity}个${template.targetItemName}。`,
    targetItemId: template.targetItemId,
    targetItemName: template.targetItemName,
    targetQuantity: template.quantity,
    collectedQuantity: 0,
    moneyReward: template.moneyReward,
    friendshipReward: TIER_FRIENDSHIP[clampedTier - 1]!,
    daysRemaining: template.days,
    accepted: false,
    itemReward: template.itemReward,
    themeTag: template.themeTag,
    demandHint: template.bonusSummary?.[0],
    recommendedHybridIds: template.requiredHybridId ? [template.requiredHybridId] : undefined,
    preferredSeasons: template.preferredSeasons,
    bonusSummary: template.bonusSummary,
    requirementSummary: getRequirementSummary(template),
    requiredHybridId: template.requiredHybridId,
    requiredSweetnessMin: template.requiredSweetnessMin,
    requiredYieldMin: template.requiredYieldMin,
    requiredResistanceMin: template.requiredResistanceMin,
    requiredGenerationMin: template.requiredGenerationMin,
    requiredParentCropIds: template.requiredParentCropIds,
    deliveryMode: template.deliveryMode,
    requiredPondGenerationMin: template.requiredPondGenerationMin,
    requiredFishMature: template.requiredFishMature,
    requiredFishHealthy: template.requiredFishHealthy
  }
}

let questCounter = 0

/** 根据当前季节生成随机委托 */
export const generateQuest = (season: Season, _day: number, isUrgent = false): QuestInstance | null => {
  // 随机选择委托类型
  const typeIndex = Math.floor(Math.random() * QUEST_TEMPLATES.length)
  const template = QUEST_TEMPLATES[typeIndex]!

  // 按季节过滤目标
  const validTargets = template.targets.filter(t => t.seasons.length === 0 || t.seasons.includes(season))
  if (validTargets.length === 0) return null

  // 随机选择目标
  const target = validTargets[Math.floor(Math.random() * validTargets.length)]!

  // 从候选池随机选择 NPC
  const npcId = template.npcPool[Math.floor(Math.random() * template.npcPool.length)]!
  const npcDef = getNpcById(npcId)
  const npcName = npcDef?.name ?? npcId

  // 随机数量（范围内）
  const quantity = target.minQty + Math.floor(Math.random() * (target.maxQty - target.minQty + 1))

  // 奖励计算
  const moneyReward = Math.floor(target.unitPrice * quantity * template.rewardMultiplier)

  questCounter++
  const verb = QUEST_TYPE_VERBS[template.type]
  const urgentPrefix = isUrgent ? '【紧急】' : ''
  const description =
    template.type === 'delivery'
      ? `${urgentPrefix}${npcName}需要${quantity}个${target.name}，请${verb}${npcName}。`
      : `${urgentPrefix}${npcName}委托：${verb}${quantity}个${target.name}。`

  return {
    id: `quest_${Date.now()}_${questCounter}`,
    type: template.type,
    npcId,
    npcName,
    description,
    targetItemId: target.itemId,
    targetItemName: target.name,
    targetQuantity: quantity,
    collectedQuantity: 0,
    moneyReward: isUrgent ? moneyReward * 2 : moneyReward,
    friendshipReward: isUrgent ? template.friendshipReward + 5 : template.friendshipReward,
    daysRemaining: isUrgent ? 1 : 2,
    accepted: false,
    isUrgent: isUrgent || undefined
  }
}
