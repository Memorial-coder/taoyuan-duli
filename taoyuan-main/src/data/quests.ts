import type {
  ActivityQuestWindowState,
  BreedingCommercialTag,
  BreedingStabilityRank,
  CompensationPlan,
  CompendiumEntry,
  ItemCategory,
  LimitedTimeQuestCampaignDef,
  QaCaseDef,
  QuestDeliveryMode,
  QuestInstance,
  QuestTemplateDef,
  QuestThemeTag,
  QuestType,
  OrderGenerationTraceAttempt,
  ReleaseChecklistItem,
  RelationshipStage,
  RewardTicketType,
  SpecialOrderComboRequirement,
  SpecialOrderScoreRule,
  SpecialOrderStageDef,
  SpecialOrderStageReward,
  SpecialOrderStageType,
  VillagerQuestCategory
} from '@/types'
import type { Season } from '@/types/game'
import { getNpcById } from './npcs'
import { getCropById } from './crops'
import { getBreedById } from './pondBreeds'
import { getItemById } from './items'
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
  ticketReward?: Partial<Record<RewardTicketType, number>>
  rewardProfileId?: string
  seasons: Season[]
  npcId: string
  /** 难度梯度: 1=第7天(简单), 2=第14天(普通), 3=第21天(困难), 4=第28天(极难) */
  tier: number
  /** 若填写，则只有发现该杂交品种后才会进入订单池 */
  requiredHybridId?: string
  /** 玩法主题标签 */
  themeTag?: QuestThemeTag
  /** 特殊订单结构版本 */
  orderVersion?: '2.x' | '3.0'
  /** 活动来源 */
  activitySourceId?: string
  activitySourceLabel?: string
  /** 单阶段 / 阶段链 / 组合交付 */
  orderStageType?: SpecialOrderStageType
  /** 阶段定义 */
  stageDefinitions?: SpecialOrderStageDef[]
  /** 组合交付要求 */
  comboRequirements?: SpecialOrderComboRequirement[]
  /** 评分规则 */
  orderScoreRule?: SpecialOrderScoreRule
  /** 反重复轮换标签 */
  antiRepeatTags?: string[]
  antiRepeatCooldownWeeks?: number
  preferredSeasons?: Season[]
  bonusSummary?: string[]
  requiredSweetnessMin?: number
  requiredYieldMin?: number
  requiredResistanceMin?: number
  requiredGenerationMin?: number
  requiredParentCropIds?: string[]
  requiredCommercialTags?: BreedingCommercialTag[]
  requiredBreedScoreMin?: number
  requiredStabilityRank?: BreedingStabilityRank
  deliveryMode?: QuestDeliveryMode
  requiredPondGenerationMin?: number
  requiredFishMature?: boolean
  requiredFishHealthy?: boolean
}

const SPECIAL_ORDER_SCORE_RULES = {
  procurement_stability: {
    id: 'procurement_stability',
    label: '稳定供货评分',
    description: '根据供货规模、交付稳定性与附加要求满足情况评估订单表现。',
    factorSummary: ['基础数量达标', '偏好季节 / 主题匹配', '附加要求满足度'],
    previewText: '订单完成后会按供货稳定度结算 B / A / S 档附加收益。',
    thresholds: [
      { rank: 'B', minScore: 60, label: '稳定交付', rewardMoneyMultiplier: 1.02, summary: '达到基础稳定供货线。' },
      { rank: 'A', minScore: 80, label: '优质交付', rewardMoneyMultiplier: 1.06, rewardTicketMultiplier: 1.1, summary: '完成度与附加要求表现优秀。' },
      { rank: 'S', minScore: 95, label: '样板供货', rewardMoneyMultiplier: 1.1, rewardTicketMultiplier: 1.25, summary: '可作为主题周样板订单。' }
    ]
  },
  breeding_quality: {
    id: 'breeding_quality',
    label: '育种品质评分',
    description: '根据图鉴品质、世代稳定度与谱系契合度评估育种类特殊订单。',
    factorSummary: ['图鉴属性门槛', '世代稳定度', '谱系亲本契合'],
    previewText: '高代且稳定的杂交品种更容易拿到 A / S 评分。',
    thresholds: [
      { rank: 'B', minScore: 65, label: '可用批次', rewardMoneyMultiplier: 1.03, summary: '已达到可交付标准。' },
      { rank: 'A', minScore: 82, label: '精品批次', rewardMoneyMultiplier: 1.08, rewardTicketMultiplier: 1.15, summary: '具备稳定而优秀的图鉴表现。' },
      { rank: 'S', minScore: 96, label: '认证样板', rewardMoneyMultiplier: 1.12, rewardTicketMultiplier: 1.3, summary: '适合作为后续商业认证与展示样板。' }
    ]
  },
  fish_specimen: {
    id: 'fish_specimen',
    label: '鱼塘样本评分',
    description: '根据鱼体成熟度、健康度与品系代数评估鱼塘高规订单。',
    factorSummary: ['成熟个体', '健康状态', '品系代数'],
    previewText: '成熟、健康且代数更高的鱼体更容易获得高分。',
    thresholds: [
      { rank: 'B', minScore: 60, label: '合格样本', rewardMoneyMultiplier: 1.03, summary: '满足基础样本要求。' },
      { rank: 'A', minScore: 84, label: '优质样本', rewardMoneyMultiplier: 1.08, rewardTicketMultiplier: 1.15, summary: '样本状态与代数表现优秀。' },
      { rank: 'S', minScore: 96, label: '研究级样本', rewardMoneyMultiplier: 1.12, rewardTicketMultiplier: 1.3, summary: '可用于专题展或研究线高规样本。' }
    ]
  }
} as const satisfies Record<string, SpecialOrderScoreRule>

const cloneComboRequirements = (requirements?: SpecialOrderComboRequirement[]): SpecialOrderComboRequirement[] | undefined => {
  if (!requirements || requirements.length === 0) return undefined
  return requirements.map(requirement => ({
    ...requirement,
    requiredParentCropIds: requirement.requiredParentCropIds ? [...requirement.requiredParentCropIds] : undefined
  }))
}

const cloneStageRewards = (stageRewards?: SpecialOrderStageReward): SpecialOrderStageReward | undefined => {
  if (!stageRewards) return undefined
  return {
    ...stageRewards,
    itemReward: stageRewards.itemReward ? stageRewards.itemReward.map(item => ({ ...item })) : undefined,
    ticketReward: stageRewards.ticketReward ? { ...stageRewards.ticketReward } : undefined
  }
}

const cloneStageDefinitions = (stageDefinitions?: SpecialOrderStageDef[]): SpecialOrderStageDef[] | undefined => {
  if (!stageDefinitions || stageDefinitions.length === 0) return undefined
  return stageDefinitions.map(stage => ({
    ...stage,
    requirementSummary: stage.requirementSummary ? [...stage.requirementSummary] : undefined,
    comboRequirements: cloneComboRequirements(stage.comboRequirements),
    stageRewards: cloneStageRewards(stage.stageRewards)
  }))
}

const createSingleStageDefinitions = (input: {
  title: string
  description: string
  targetItemId: string
  targetItemName: string
  quantity: number
  deliveryMode?: QuestDeliveryMode
}): SpecialOrderStageDef[] => [
  {
    id: 'delivery',
    title: input.title,
    description: input.description,
    phaseType: 'deliver',
    targetItemId: input.targetItemId,
    targetItemName: input.targetItemName,
    targetQuantity: input.quantity,
    deliveryMode: input.deliveryMode
  }
]

const createComboStageDefinitions = (input: {
  title: string
  description: string
  requirements: SpecialOrderComboRequirement[]
  requirementSummary?: string[]
}): SpecialOrderStageDef[] => [
  {
    id: 'combo_delivery',
    title: input.title,
    description: input.description,
    phaseType: 'deliver',
    requirementSummary: input.requirementSummary,
    comboRequirements: cloneComboRequirements(input.requirements)
  }
]

const createMultiStageDefinitions = (input: {
  stages: Array<{
    id: string
    title: string
    description: string
    phaseType: SpecialOrderStageDef['phaseType']
    targetItemId?: string
    targetItemName?: string
    targetQuantity?: number
    deliveryMode?: QuestDeliveryMode
    requirementSummary?: string[]
    comboRequirements?: SpecialOrderComboRequirement[]
    stageRewards?: SpecialOrderStageReward
    nextStageTemplateId?: string
  }>
}): SpecialOrderStageDef[] =>
  input.stages.map(stage => ({
    id: stage.id,
    title: stage.title,
    description: stage.description,
    phaseType: stage.phaseType,
    targetItemId: stage.targetItemId,
    targetItemName: stage.targetItemName,
    targetQuantity: stage.targetQuantity,
    deliveryMode: stage.deliveryMode,
    requirementSummary: stage.requirementSummary ? [...stage.requirementSummary] : undefined,
    comboRequirements: cloneComboRequirements(stage.comboRequirements),
    stageRewards: cloneStageRewards(stage.stageRewards),
    nextStageTemplateId: stage.nextStageTemplateId
  }))

export const BREEDING_SPECIAL_ORDER_BASELINE = {
  auditId: 'ws05_breeding_special_order_theme_week',
  demandPrinciples: ['可追踪', '可准备', '可解释'],
  metricSourceNotes: {
    orderCompletion: '以 special_order 接取到提交的完整链路为准，不统计未接取即过期的订单。',
    breedingReadiness: '以 compendium 的 bestSweetness / bestYield / bestResistance / bestGeneration 与 lineageCropIds 为统一口径。',
    themeBias: '以 preferredQuestThemeTag 与 breedingFocusHybridIds 为主题周偏置来源。'
  }
} as const

export const BREEDING_SPECIAL_ORDER_TUNING_CONFIG = {
  featureFlags: {
    scoreSettlementEnabled: true,
    antiRepeatRotationEnabled: true,
    duplicateSettlementGuardEnabled: true,
    themeWeekBiasEnabled: true
  },
  generation: {
    preferredThemeWeightBonus: 2,
    preferredSeasonWeightBonus: 1,
    preferredHybridWeightBonus: 2,
    preferredMarketCategoryWeightBonus: 2,
    discouragedMarketCategoryWeightPenalty: 1,
    breedingMarketWeightBonus: 1,
    fishpondMarketWeightBonus: 1,
    antiRepeatGenerationAttempts: 4
  },
  settlement: {
    baseScore: 58,
    seasonMatchBonus: 4,
    activitySourceBonus: 3,
    themeWeekMatchBonus: 5,
    timelinessHighRemainingRatio: 0.6,
    timelinessMediumRemainingRatio: 0.3,
    timelinessHighBonus: 6,
    timelinessMediumBonus: 3,
    recommendedHybridBonusPerEntry: 2,
    recommendedHybridBonusCap: 6,
    breedingEntryBaseBonus: 8,
    breedingRequirementMetBonus: 6,
    breedingRequirementOverflowDivisor: 4,
    breedingRequirementOverflowCap: 8,
    breedingGenerationOverflowStepBonus: 2,
    breedingGenerationOverflowCap: 10,
    breedingTotalStatsDivisor: 25,
    breedingTotalStatsCap: 12,
    breedingParentMatchedBonus: 3,
    breedingParentFullBonus: 8,
    fishpondGenerationBonusPerTier: 4,
    fishpondGenerationBonusCap: 12,
    fishpondTraitBonus: 6,
    requirementSummaryBonusPerEntry: 2,
    requirementSummaryBonusCap: 8,
    genericQuantityDivisor: 3,
    genericQuantityBonusCap: 12,
    minimumScore: 35,
    maximumScore: 100
  },
  operations: {
    antiRepeatHistoryLimit: 24,
    settlementReceiptLimit: 40,
    weeklyRefreshStartAbsoluteWeek: 4,
    antiRepeatCooldownWeeks: 2,
    themeWeekCooldownReduction: 1
  }
} as const

export const WS10_LIMITED_TIME_QUEST_CAMPAIGN_DEFS: LimitedTimeQuestCampaignDef[] = [
  {
    id: 'ws10_limited_theme_rotation',
    label: '主题周限时委托',
    description: '围绕主题周当前焦点，把高阶订单与每日告示板包装成低频但可解释的活动委托窗口。',
    unlockTier: 'P0',
    linkedCampaignId: 'ws10_campaign_theme_rotation',
    preferredThemeTag: 'breeding',
    activitySourceId: 'ws10_theme_rotation',
    activitySourceLabel: '主题周轮转活动',
    durationDays: 7,
    recommendedOfferIds: ['weekly_inventory_bag', 'func_field_irrigation_pack'],
    rewardSummary: '用于承接主题周活动单、周目标和结算邮件之间的配置挂点。'
  },
  {
    id: 'ws10_supply_chain_sprint',
    label: '限时供货冲刺',
    description: '围绕供货活动与高阶订单评分，预留中期活动窗口的数据形状。',
    unlockTier: 'P1',
    linkedCampaignId: 'ws10_campaign_limited_supply',
    preferredThemeTag: 'breeding',
    activitySourceId: 'ws10_supply_chain',
    activitySourceLabel: '限时供货活动',
    durationDays: 5,
    recommendedOfferIds: ['func_builder_pack', 'autumn_harvest_pack'],
    rewardSummary: '用于承接限时供货、活动评分和中期奖励模板。'
  },
  {
    id: 'ws10_world_milestone_notice',
    label: '全服共建收尾委托',
    description: '为世界里程碑收尾、全服共建和补偿型活动任务预留 P2 数据骨架。',
    unlockTier: 'P2',
    linkedCampaignId: 'ws10_campaign_world_milestone',
    preferredThemeTag: 'fishpond',
    activitySourceId: 'ws10_world_milestone',
    activitySourceLabel: '全服共建活动',
    durationDays: 14,
    recommendedOfferIds: ['premium_warehouse_charter', 'weekly_pond_care_pack'],
    rewardSummary: '用于承接终局共建、活动收尾和邮件回流说明。'
  }
]

export const WS13_LIMITED_TIME_QUEST_CAMPAIGN_DEFS: LimitedTimeQuestCampaignDef[] = [
  {
    id: 'ws13_fishpond_rotation_window',
    label: '鱼塘活动任务窗',
    description: '围绕样鱼报名、产物承接和展示池筹备建立的鱼塘活动任务窗口。',
    unlockTier: 'P0',
    linkedCampaignId: 'ws13_campaign_fishpond_rotation',
    variantGroup: 'fishpond',
    preferredThemeTag: 'fishpond',
    activitySourceId: 'ws13_fishpond_rotation',
    activitySourceLabel: '鱼塘周赛升级周',
    durationDays: 7,
    recommendedOfferIds: ['weekly_pond_care_pack', 'func_angler_pack'],
    linkedRouteLabels: ['鱼塘', '任务', '邮箱'],
    rewardTierId: 'steady',
    onlineEngagementMode: 'hall_mail_ai',
    rewardSummary: '用于承接鱼塘报名、产物领取与活动奖励邮件的第一组活动任务。'
  },
  {
    id: 'ws13_breeding_rotation_window',
    label: '育种活动任务窗',
    description: '围绕周赛报名、谱系目标和研究补给建立的育种活动任务窗口。',
    unlockTier: 'P0',
    linkedCampaignId: 'ws13_campaign_breeding_rotation',
    variantGroup: 'breeding',
    preferredThemeTag: 'breeding',
    activitySourceId: 'ws13_breeding_rotation',
    activitySourceLabel: '育种周赛扩展周',
    durationDays: 7,
    recommendedOfferIds: ['func_builder_pack', 'weekly_inventory_bag'],
    linkedRouteLabels: ['育种', '任务', '商店'],
    rewardTierId: 'steady',
    onlineEngagementMode: 'hall_mail_ai',
    rewardSummary: '用于承接育种周赛、图鉴推进和特种订单的活动任务窗口。'
  },
  {
    id: 'ws13_museum_supply_window',
    label: '博物馆活动任务窗',
    description: '围绕馆区焦点、学者委托和展陈筹备建立的博物馆活动任务窗口。',
    unlockTier: 'P1',
    linkedCampaignId: 'ws13_campaign_museum_supply',
    variantGroup: 'museum',
    activitySourceId: 'ws13_museum_supply',
    activitySourceLabel: '博物馆策展供给周',
    durationDays: 7,
    recommendedOfferIds: ['premium_museum_promotion_contract', 'premium_research_assistant_contract'],
    linkedRouteLabels: ['博物馆', '任务', '邮箱'],
    rewardTierId: 'activity',
    onlineEngagementMode: 'hall_mail_ai',
    rewardSummary: '用于承接馆务委托、展陈筹备和活动收尾的第二批博物馆任务。'
  },
  {
    id: 'ws13_hanhai_supply_window',
    label: '瀚海活动任务窗',
    description: '围绕商路投资、遗迹词条和轮换货架建立的瀚海活动任务窗口。',
    unlockTier: 'P1',
    linkedCampaignId: 'ws13_campaign_hanhai_supply',
    variantGroup: 'hanhai',
    activitySourceId: 'ws13_hanhai_supply',
    activitySourceLabel: '瀚海远征承接周',
    durationDays: 7,
    recommendedOfferIds: ['weekly_caravan_supply_crate', 'premium_caravan_service_contract'],
    linkedRouteLabels: ['瀚海', '任务', '商店'],
    rewardTierId: 'activity',
    onlineEngagementMode: 'hall_mail_ai',
    rewardSummary: '用于承接商路投资、遗迹勘探和目录补给的第二批瀚海任务。'
  },
  {
    id: 'ws13_fishpond_showcase_window',
    label: '鱼塘展示收尾窗',
    description: '围绕展示池高光、博物馆加成和活动收尾邮件建立的鱼塘展示收尾窗口。',
    unlockTier: 'P2',
    linkedCampaignId: 'ws13_campaign_fishpond_showcase_wrapup',
    variantGroup: 'fishpond',
    preferredThemeTag: 'fishpond',
    activitySourceId: 'ws13_fishpond_showcase',
    activitySourceLabel: '鱼塘展示收尾周',
    durationDays: 5,
    recommendedOfferIds: ['weekly_pond_care_pack', 'premium_museum_promotion_contract'],
    linkedRouteLabels: ['鱼塘', '大厅', '邮箱'],
    rewardTierId: 'showcase',
    onlineEngagementMode: 'hall_mail_ai',
    rewardSummary: '用于承接展示池成果、收尾奖励和活动展示贴的鱼塘收尾窗口。'
  },
  {
    id: 'ws13_hanhai_patron_window',
    label: '瀚海赞助收尾窗',
    description: '围绕瀚海赞助、共建收尾和终局展示回流建立的瀚海收尾任务窗口。',
    unlockTier: 'P2',
    linkedCampaignId: 'ws13_campaign_hanhai_patron_wrapup',
    variantGroup: 'hanhai',
    activitySourceId: 'ws13_hanhai_patron',
    activitySourceLabel: '瀚海赞助收尾周',
    durationDays: 5,
    recommendedOfferIds: ['premium_caravan_service_contract', 'premium_museum_promotion_contract'],
    linkedRouteLabels: ['瀚海', '博物馆', '大厅'],
    rewardTierId: 'showcase',
    onlineEngagementMode: 'hall_mail_ai',
    rewardSummary: '用于承接赞助收尾、终局展示和下一轮活动预告的瀚海收尾窗口。'
  }
]

export const createDefaultActivityQuestWindowState = (): ActivityQuestWindowState => ({
  version: 1,
  activeCampaignId: null,
  activeQuestTemplateIds: [],
  lastRefreshDayTag: '',
  nextRefreshDayTag: '',
  completedWindowIds: [],
  claimedRewardMailIds: []
})

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
    ticketReward: { construction: 1 },
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
    ticketReward: { exhibit: 1 },
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
    ticketReward: { caravan: 1 },
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
    rewardProfileId: 'operations_mix',
    orderVersion: '3.0',
    activitySourceId: 'spring_breeding_tasting',
    activitySourceLabel: '春种品鉴周',
    orderStageType: 'single',
    stageDefinitions: createSingleStageDefinitions({
      title: '准备春种样菜',
      description: '商会想确认你已具备稳定交付翡翠萝卜的能力。',
      targetItemId: 'emerald_radish',
      targetItemName: '翡翠萝卜',
      quantity: 6
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.breeding_quality,
    antiRepeatTags: ['breeding', 'spring', 'radish_showcase'],
    requiredHybridId: 'emerald_radish',
    requiredCommercialTags: ['bulk_supply'],
    requiredBreedScoreMin: 52,
    requiredStabilityRank: 'emerging',
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
    rewardProfileId: 'trade_mix',
    orderVersion: '3.0',
    activitySourceId: 'caravan_procurement_week',
    activitySourceLabel: '商路备货周',
    orderStageType: 'single',
    stageDefinitions: createSingleStageDefinitions({
      title: '完成首批备货',
      description: '商路承运人正在筛选适合稳定供货的高价值薯类。',
      targetItemId: 'golden_tuber',
      targetItemName: '金油薯',
      quantity: 8
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.procurement_stability,
    antiRepeatTags: ['breeding', 'trade', 'tuber_supply'],
    requiredHybridId: 'golden_tuber',
    requiredCommercialTags: ['bulk_supply', 'storage'],
    requiredBreedScoreMin: 58,
    requiredStabilityRank: 'emerging',
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
    tier: 3,
    rewardProfileId: 'operations_mix'
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
    tier: 3,
    rewardProfileId: 'trade_mix'
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
    tier: 3,
    rewardProfileId: 'operations_mix'
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
    tier: 3,
    rewardProfileId: 'research_mix'
  },
  {
    name: '茶肆特供',
    targetItemId: 'jade_tea',
    targetItemName: '翡翠茶',
    quantity: 6,
    days: 7,
    moneyReward: 2600,
    itemReward: [{ itemId: 'tea', quantity: 8 }],
    ticketReward: { research: 1 },
    seasons: [],
    npcId: 'chun_lan',
    tier: 3,
    rewardProfileId: 'research_mix',
    orderVersion: '3.0',
    activitySourceId: 'tea_house_selection',
    activitySourceLabel: '茶肆评鉴周',
    orderStageType: 'multi',
    stageDefinitions: createMultiStageDefinitions({
      stages: [
        {
          id: 'tea_house_prepare',
          title: '准备茶肆样茶',
          description: '先提交一批基础茶样，供茶肆确认本周的选品方向。',
          phaseType: 'prepare',
          targetItemId: 'tea',
          targetItemName: '茶叶',
          targetQuantity: 4,
          requirementSummary: ['用于茶肆预筛选，不计入最终成单数量。'],
          stageRewards: {
            friendshipReward: 2,
            summary: '茶肆会先记录你是否具备稳定备样能力。'
          },
          nextStageTemplateId: 'tea_house_quality_gate'
        },
        {
          id: 'tea_house_quality_gate',
          title: '通过品质复核',
          description: '茶肆会根据图鉴世代、甜度与谱系记录复核翡翠茶的商品力。',
          phaseType: 'verify',
          targetItemId: 'jade_tea',
          targetItemName: '翡翠茶',
          targetQuantity: 2,
          requirementSummary: ['验证阶段更关注图鉴属性与谱系稳定度。'],
          stageRewards: {
            ticketReward: { research: 1 },
            summary: '通过复核后会追加记录为研究级样茶来源。'
          },
          nextStageTemplateId: 'tea_house_final_delivery'
        },
        {
          id: 'tea_house_final_delivery',
          title: '提交特供茶样',
          description: '完成最后一批翡翠茶交付，作为茶肆本周特供货源。',
          phaseType: 'deliver',
          targetItemId: 'jade_tea',
          targetItemName: '翡翠茶',
          targetQuantity: 6,
          stageRewards: {
            summary: '最终阶段将按完整订单评分结算。'
          }
        }
      ]
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.breeding_quality,
    antiRepeatTags: ['breeding', 'tea', 'quality_selection'],
    requiredHybridId: 'jade_tea',
    requiredCommercialTags: ['banquet', 'research'],
    requiredBreedScoreMin: 72,
    requiredStabilityRank: 'stable',
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
    rewardProfileId: 'exhibit_mix',
    requiredHybridId: 'lotus_tea',
    requiredCommercialTags: ['showcase', 'research'],
    requiredBreedScoreMin: 68,
    requiredStabilityRank: 'emerging',
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
    rewardProfileId: 'exhibit_mix',
    requiredHybridId: 'osmanthus_tea',
    requiredCommercialTags: ['banquet', 'showcase'],
    requiredBreedScoreMin: 74,
    requiredStabilityRank: 'stable',
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
    tier: 4,
    rewardProfileId: 'operations_mix'
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
    tier: 4,
    rewardProfileId: 'exhibit_mix'
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
    tier: 4,
    rewardProfileId: 'pond_premium_mix'
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
    tier: 4,
    rewardProfileId: 'trade_mix'
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
    rewardProfileId: 'exhibit_mix',
    orderVersion: '3.0',
    activitySourceId: 'banquet_showcase_week',
    activitySourceLabel: '宴席陈列周',
    orderStageType: 'multi',
    comboRequirements: [
      {
        id: 'combo_golden_melon_batch',
        itemId: 'golden_melon',
        itemName: '金蜜瓜',
        quantity: 10,
        note: '最终交付仍以高代金蜜瓜批次为核心。'
      },
      {
        id: 'combo_golden_melon_seal',
        itemId: 'preservation_seal',
        itemName: '保鲜封签',
        quantity: 2,
        note: '高甜度样板瓜需要单独封签，避免宴席前走味。'
      },
      {
        id: 'combo_golden_melon_tag',
        itemId: 'lineage_certificate_tag',
        itemName: '谱系认证签',
        quantity: 1,
        note: '商会会同步核验精品批次的谱系认证补材。'
      }
    ],
    stageDefinitions: createMultiStageDefinitions({
      stages: [
        {
          id: 'banquet_material_prep',
          title: '准备宴席底材',
          description: '商会先确认你能稳定备齐宴席前置食材与储运底材。',
          phaseType: 'prepare',
          targetItemId: 'watermelon',
          targetItemName: '西瓜',
          targetQuantity: 4,
          requirementSummary: ['用于确认你具备筹备金蜜宴的上游供货能力。'],
          stageRewards: {
            friendshipReward: 3,
            summary: '通过备料后才会进入样板复核。'
          },
          nextStageTemplateId: 'banquet_showcase_verify'
        },
        {
          id: 'banquet_showcase_verify',
          title: '复核样板金蜜瓜',
          description: '先交少量样板瓜用于宴席陈列与图鉴品质核验。',
          phaseType: 'verify',
          targetItemId: 'golden_melon',
          targetItemName: '金蜜瓜',
          targetQuantity: 3,
          requirementSummary: ['验证阶段会结合甜度、产量、世代与谱系要求。'],
          stageRewards: {
            ticketReward: { exhibit: 1 },
            summary: '通过样板复核后会提升展陈与宴席双线评价。'
          },
          nextStageTemplateId: 'banquet_showcase_delivery'
        },
        {
          id: 'banquet_showcase_delivery',
          title: '提交宴席金蜜瓜',
          description: '完成整批金蜜瓜与封签/认证补材交付，作为节庆宴席主陈列货源。',
          phaseType: 'deliver',
          requirementSummary: ['最终交付需同时备齐金蜜瓜批次、保鲜封签与谱系认证签。'],
          comboRequirements: [
            {
              id: 'combo_golden_melon_batch',
              itemId: 'golden_melon',
              itemName: '金蜜瓜',
              quantity: 10,
              note: '最终交付仍以高代金蜜瓜批次为核心。'
            },
            {
              id: 'combo_golden_melon_seal',
              itemId: 'preservation_seal',
              itemName: '保鲜封签',
              quantity: 2,
              note: '高甜度样板瓜需要单独封签，避免宴席前走味。'
            },
            {
              id: 'combo_golden_melon_tag',
              itemId: 'lineage_certificate_tag',
              itemName: '谱系认证签',
              quantity: 1,
              note: '商会会同步核验精品批次的谱系认证补材。'
            }
          ],
          stageRewards: {
            summary: '最终阶段将按完整宴席样板订单结算。'
          }
        }
      ]
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.breeding_quality,
    antiRepeatTags: ['breeding', 'banquet', 'melon_showcase'],
    requiredHybridId: 'golden_melon',
    requiredCommercialTags: ['banquet', 'luxury'],
    requiredBreedScoreMin: 84,
    requiredStabilityRank: 'certified',
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
    rewardProfileId: 'research_mix',
    orderVersion: '3.0',
    orderStageType: 'combo',
    comboRequirements: [
      {
        id: 'combo_frost_garlic_batch',
        itemId: 'frost_garlic',
        itemName: '霜雪蒜',
        quantity: 12
      },
      {
        id: 'combo_frost_garlic_seal',
        itemId: 'preservation_seal',
        itemName: '保鲜封签',
        quantity: 2,
        note: '寒季囤储批次需要额外封签。'
      },
      {
        id: 'combo_frost_garlic_residue',
        itemId: 'breeding_residue',
        itemName: '育种残留',
        quantity: 2,
        note: '研究站会把失败批次残留用于抗性复核与储运垫材。'
      }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '提交霜雪蒜囤储批次',
      description: '寒季囤储单会同时检查主批次、保鲜封签与研究残留补材。',
      requirements: [
        {
          id: 'combo_frost_garlic_batch',
          itemId: 'frost_garlic',
          itemName: '霜雪蒜',
          quantity: 12
        },
        {
          id: 'combo_frost_garlic_seal',
          itemId: 'preservation_seal',
          itemName: '保鲜封签',
          quantity: 2,
          note: '寒季囤储批次需要额外封签。'
        },
        {
          id: 'combo_frost_garlic_residue',
          itemId: 'breeding_residue',
          itemName: '育种残留',
          quantity: 2,
          note: '研究站会把失败批次残留用于抗性复核与储运垫材。'
        }
      ],
      requirementSummary: ['高抗性囤货单不再只看主作物，还会扣除储运封签与研究残留。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.breeding_quality,
    requiredHybridId: 'frost_garlic',
    requiredCommercialTags: ['storage', 'research'],
    requiredBreedScoreMin: 70,
    requiredStabilityRank: 'stable',
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
    rewardProfileId: 'pond_premium_mix',
    orderVersion: '3.0',
    activitySourceId: 'pond_showcase_week',
    activitySourceLabel: '鱼塘观赏周',
    orderStageType: 'single',
    stageDefinitions: createSingleStageDefinitions({
      title: '提交观赏样鱼',
      description: '评比方只接受成熟、健康且可直接核验的观赏鱼样本。',
      targetItemId: 'koi',
      targetItemName: '锦鲤',
      quantity: 2,
      deliveryMode: 'pond'
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.fish_specimen,
    antiRepeatTags: ['fishpond', 'showcase', 'koi'],
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
    rewardProfileId: 'pond_premium_mix',
    orderVersion: '3.0',
    activitySourceId: 'caravan_fish_selection',
    activitySourceLabel: '商路活体选品周',
    orderStageType: 'single',
    stageDefinitions: createSingleStageDefinitions({
      title: '交付展售金鲤',
      description: '商路客商会根据金鲤的健康度与代数筛选展售样鱼。',
      targetItemId: 'golden_carp',
      targetItemName: '金鲤',
      quantity: 2,
      deliveryMode: 'pond'
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.fish_specimen,
    antiRepeatTags: ['fishpond', 'trade', 'golden_carp'],
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
    rewardProfileId: 'pond_premium_mix',
    orderVersion: '3.0',
    activitySourceId: 'cave_research_week',
    activitySourceLabel: '洞窟研究周',
    orderStageType: 'multi',
    stageDefinitions: createMultiStageDefinitions({
      stages: [
        {
          id: 'cave_lab_prepare',
          title: '准备研究供电模块',
          description: '研究站先确认样本箱供电模块是否齐备。',
          phaseType: 'prepare',
          targetItemId: 'battery',
          targetItemName: '电池',
          targetQuantity: 1,
          requirementSummary: ['样本运输前需先完成供电模块备齐。'],
          stageRewards: {
            ticketReward: { research: 1 },
            summary: '供电模块齐备后才会进入活体样本核验。'
          },
          nextStageTemplateId: 'cave_sample_verify'
        },
        {
          id: 'cave_sample_verify',
          title: '复核活体样本',
          description: '研究员会先核验一尾洞穴盲鱼的健康度与代数是否达标。',
          phaseType: 'verify',
          targetItemId: 'cave_blindfish',
          targetItemName: '洞穴盲鱼',
          targetQuantity: 1,
          deliveryMode: 'pond',
          requirementSummary: ['需成熟、健康且可追溯来源的样本个体。'],
          stageRewards: {
            summary: '通过后会升级为正式研究样本单。'
          },
          nextStageTemplateId: 'cave_sample_delivery'
        },
        {
          id: 'cave_sample_delivery',
          title: '提交研究样本',
          description: '完成最终样本交付，供洞窟研究站进行长期记录。',
          phaseType: 'deliver',
          targetItemId: 'cave_blindfish',
          targetItemName: '洞穴盲鱼',
          targetQuantity: 2,
          deliveryMode: 'pond',
          stageRewards: {
            summary: '最终阶段将按研究级样本订单结算。'
          }
        }
      ]
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.fish_specimen,
    antiRepeatTags: ['fishpond', 'research', 'cave_blindfish'],
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 2,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['稀有水产生物会优先走研究线，直接从鱼塘提交健康样本可换取高价值功能材料。']
  },
  {
    name: '春宴双拼供货',
    targetItemId: 'emerald_radish',
    targetItemName: '翡翠萝卜拼单',
    quantity: 6,
    days: 7,
    moneyReward: 2100,
    itemReward: [{ itemId: 'quality_fertilizer', quantity: 4 }],
    ticketReward: { exhibit: 1 },
    seasons: ['spring'],
    npcId: 'liu_niang',
    tier: 2,
    rewardProfileId: 'exhibit_mix',
    orderVersion: '3.0',
    activitySourceId: 'spring_banquet_combo_week',
    activitySourceLabel: '春宴拼单周',
    orderStageType: 'combo',
    comboRequirements: [
      {
        id: 'combo_emerald_radish',
        itemId: 'emerald_radish',
        itemName: '翡翠萝卜',
        quantity: 4,
        requiredHybridId: 'emerald_radish',
        note: '需由你自己的育种图鉴提供稳定货源。'
      },
      {
        id: 'combo_green_tea_drink',
        itemId: 'green_tea_drink',
        itemName: '清茶饮',
        quantity: 2,
        note: '用于宴席前台试饮。'
      }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '备齐春宴拼单',
      description: '柳娘希望你同时提供春宴样菜与可直接上桌的配饮。',
      requirements: [
        {
          id: 'combo_emerald_radish',
          itemId: 'emerald_radish',
          itemName: '翡翠萝卜',
          quantity: 4,
          requiredHybridId: 'emerald_radish',
          note: '需由你自己的育种图鉴提供稳定货源。'
        },
        {
          id: 'combo_green_tea_drink',
          itemId: 'green_tea_drink',
          itemName: '清茶饮',
          quantity: 2,
          note: '用于宴席前台试饮。'
        }
      ],
      requirementSummary: ['需同时提交育种作物与加工饮品。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.breeding_quality,
    antiRepeatTags: ['combo', 'breeding', 'spring_banquet'],
    requiredHybridId: 'emerald_radish',
    themeTag: 'breeding',
    preferredSeasons: ['spring'],
    bonusSummary: ['春宴周会优先挑选“育种作物 + 即食配套”的组合供货。']
  },
  {
    name: '茶席陈列套组',
    targetItemId: 'lotus_tea',
    targetItemName: '茶席陈列套组',
    quantity: 8,
    days: 7,
    moneyReward: 2800,
    itemReward: [{ itemId: 'tea', quantity: 6 }],
    ticketReward: { exhibit: 1, research: 1 },
    seasons: ['autumn'],
    npcId: 'chun_lan',
    tier: 3,
    rewardProfileId: 'exhibit_mix',
    orderVersion: '3.0',
    activitySourceId: 'autumn_tea_showcase_combo',
    activitySourceLabel: '秋茶陈列周',
    orderStageType: 'combo',
    comboRequirements: [
      {
        id: 'combo_lotus_tea',
        itemId: 'lotus_tea',
        itemName: '莲心茶',
        quantity: 4,
        requiredHybridId: 'lotus_tea'
      },
      {
        id: 'combo_osmanthus',
        itemId: 'osmanthus',
        itemName: '桂花',
        quantity: 4,
        note: '用于茶席香材点缀。'
      },
      {
        id: 'combo_tea_certificate_tag',
        itemId: 'lineage_certificate_tag',
        itemName: '谱系认证签',
        quantity: 1,
        note: '专题茶席会额外核验展示样品的谱系认证补材。'
      }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '提交茶席陈列套组',
      description: '春兰需要一套能直接用于陈列和品鉴的秋茶组合。',
      requirements: [
        {
          id: 'combo_lotus_tea',
          itemId: 'lotus_tea',
          itemName: '莲心茶',
          quantity: 4,
          requiredHybridId: 'lotus_tea'
        },
        {
          id: 'combo_osmanthus',
          itemId: 'osmanthus',
          itemName: '桂花',
          quantity: 4,
          note: '用于茶席香材点缀。'
        },
        {
          id: 'combo_tea_certificate_tag',
          itemId: 'lineage_certificate_tag',
          itemName: '谱系认证签',
          quantity: 1,
          note: '专题茶席会额外核验展示样品的谱系认证补材。'
        }
      ],
      requirementSummary: ['组合单会同时检查主茶、点缀材料与谱系认证补材是否齐备。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.breeding_quality,
    antiRepeatTags: ['combo', 'tea', 'showcase'],
    requiredHybridId: 'lotus_tea',
    themeTag: 'breeding',
    preferredSeasons: ['autumn'],
    bonusSummary: ['专题茶席更偏好兼顾主品与装饰香材的组合供货。']
  },
  {
    name: '矿馆展陈备料',
    targetItemId: 'gold_ore',
    targetItemName: '矿馆展陈备料',
    quantity: 12,
    days: 7,
    moneyReward: 2600,
    itemReward: [{ itemId: 'charcoal', quantity: 8 }],
    ticketReward: { construction: 1, exhibit: 1 },
    seasons: [],
    npcId: 'a_shi',
    tier: 3,
    rewardProfileId: 'operations_mix',
    orderVersion: '3.0',
    activitySourceId: 'ore_gallery_combo_week',
    activitySourceLabel: '矿馆筹展周',
    orderStageType: 'combo',
    comboRequirements: [
      { id: 'combo_gold_ore', itemId: 'gold_ore', itemName: '金矿', quantity: 10 },
      { id: 'combo_jade', itemId: 'jade', itemName: '翡翠', quantity: 2, note: '用于重点展柜压轴陈列。' }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '备齐矿馆展陈物资',
      description: '矿馆筹展需要同时准备基础矿材与高价值点题展品。',
      requirements: [
        { id: 'combo_gold_ore', itemId: 'gold_ore', itemName: '金矿', quantity: 10 },
        { id: 'combo_jade', itemId: 'jade', itemName: '翡翠', quantity: 2, note: '用于重点展柜压轴陈列。' }
      ],
      requirementSummary: ['需同时提交主材与压轴陈列物。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.procurement_stability,
    antiRepeatTags: ['combo', 'ore', 'museum_supply'],
    bonusSummary: ['矿馆筹展单强调“基础供货 + 展示亮点”的双向准备。']
  },
  {
    name: '观赏鲤茶会联供',
    targetItemId: 'koi',
    targetItemName: '观赏鲤茶会联供',
    quantity: 5,
    days: 7,
    moneyReward: 3400,
    itemReward: [{ itemId: 'water_purifier', quantity: 1 }],
    ticketReward: { exhibit: 1, caravan: 1 },
    seasons: ['spring', 'summer'],
    npcId: 'qiu_yue',
    tier: 3,
    rewardProfileId: 'pond_premium_mix',
    orderVersion: '3.0',
    activitySourceId: 'pond_tea_combo_week',
    activitySourceLabel: '鱼茶联供周',
    orderStageType: 'combo',
    comboRequirements: [
      {
        id: 'combo_koi',
        itemId: 'koi',
        itemName: '锦鲤',
        quantity: 1,
        deliveryMode: 'pond',
        requiredPondGenerationMin: 2,
        requiredFishMature: true,
        requiredFishHealthy: true
      },
      {
        id: 'combo_osmanthus_tea',
        itemId: 'osmanthus_tea',
        itemName: '桂花茶',
        quantity: 4,
        note: '茶会前台需同步备齐茶饮。'
      }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '完成观赏鲤茶会联供',
      description: '茶会同时需要活体观赏样鱼与前台供应茶饮。',
      requirements: [
        {
          id: 'combo_koi',
          itemId: 'koi',
          itemName: '锦鲤',
          quantity: 1,
          deliveryMode: 'pond',
          requiredPondGenerationMin: 2,
          requiredFishMature: true,
          requiredFishHealthy: true
        },
        {
          id: 'combo_osmanthus_tea',
          itemId: 'osmanthus_tea',
          itemName: '桂花茶',
          quantity: 4,
          note: '茶会前台需同步备齐茶饮。'
        }
      ],
      requirementSummary: ['需同时完成鱼塘交付与背包材料交付。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.fish_specimen,
    antiRepeatTags: ['combo', 'fishpond', 'tea_event'],
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 2,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['鱼茶联供周会优先安排观赏鱼与茶饮一体化组合订单。']
  },
  {
    name: '金鲤宴席联运',
    targetItemId: 'golden_carp',
    targetItemName: '金鲤宴席联运',
    quantity: 7,
    days: 7,
    moneyReward: 4200,
    itemReward: [{ itemId: 'fish_feed', quantity: 6 }],
    ticketReward: { caravan: 2 },
    seasons: ['summer', 'autumn'],
    npcId: 'qiu_yue',
    tier: 4,
    rewardProfileId: 'trade_mix',
    orderVersion: '3.0',
    activitySourceId: 'golden_carp_banquet_combo',
    activitySourceLabel: '宴席联运周',
    orderStageType: 'combo',
    comboRequirements: [
      {
        id: 'combo_golden_carp',
        itemId: 'golden_carp',
        itemName: '金鲤',
        quantity: 1,
        deliveryMode: 'pond',
        requiredPondGenerationMin: 3,
        requiredFishMature: true,
        requiredFishHealthy: true
      },
      {
        id: 'combo_rice_wine',
        itemId: 'rice_wine',
        itemName: '米酒',
        quantity: 6,
        note: '宴席物流需一并备齐酒饮。'
      }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '备齐宴席联运货单',
      description: '高端宴席要求活体样鱼与酒饮同步走商路交付。',
      requirements: [
        {
          id: 'combo_golden_carp',
          itemId: 'golden_carp',
          itemName: '金鲤',
          quantity: 1,
          deliveryMode: 'pond',
          requiredPondGenerationMin: 3,
          requiredFishMature: true,
          requiredFishHealthy: true
        },
        {
          id: 'combo_rice_wine',
          itemId: 'rice_wine',
          itemName: '米酒',
          quantity: 6,
          note: '宴席物流需一并备齐酒饮。'
        }
      ],
      requirementSummary: ['组合单会同时检查活体样鱼与宴席酒饮。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.fish_specimen,
    antiRepeatTags: ['combo', 'fishpond', 'banquet_logistics'],
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 3,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['宴席联运单更强调“活体展示 + 消耗品备货”的组合能力。']
  },
  {
    name: '洞窟联合样本箱',
    targetItemId: 'cave_blindfish',
    targetItemName: '洞窟联合样本箱',
    quantity: 3,
    days: 7,
    moneyReward: 5000,
    itemReward: [{ itemId: 'battery', quantity: 1 }],
    ticketReward: { research: 2, exhibit: 1 },
    seasons: [],
    npcId: 'lin_lao',
    tier: 4,
    rewardProfileId: 'research_mix',
    orderVersion: '3.0',
    activitySourceId: 'cave_joint_sample_week',
    activitySourceLabel: '洞窟联合研究周',
    orderStageType: 'combo',
    comboRequirements: [
      {
        id: 'combo_cave_blindfish',
        itemId: 'cave_blindfish',
        itemName: '洞穴盲鱼',
        quantity: 1,
        deliveryMode: 'pond',
        requiredPondGenerationMin: 2,
        requiredFishMature: true,
        requiredFishHealthy: true
      },
      {
        id: 'combo_battery',
        itemId: 'battery',
        itemName: '电池',
        quantity: 2,
        note: '研究站需要稳定供电样本箱。'
      }
    ],
    stageDefinitions: createComboStageDefinitions({
      title: '提交联合样本箱',
      description: '研究站要求稀有活体样本与供电模块一起打包送检。',
      requirements: [
        {
          id: 'combo_cave_blindfish',
          itemId: 'cave_blindfish',
          itemName: '洞穴盲鱼',
          quantity: 1,
          deliveryMode: 'pond',
          requiredPondGenerationMin: 2,
          requiredFishMature: true,
          requiredFishHealthy: true
        },
        {
          id: 'combo_battery',
          itemId: 'battery',
          itemName: '电池',
          quantity: 2,
          note: '研究站需要稳定供电样本箱。'
        }
      ],
      requirementSummary: ['需同时提交活体样本与研究供电模块。']
    }),
    orderScoreRule: SPECIAL_ORDER_SCORE_RULES.fish_specimen,
    antiRepeatTags: ['combo', 'research', 'cave_sample'],
    themeTag: 'fishpond',
    deliveryMode: 'pond',
    requiredPondGenerationMin: 2,
    requiredFishMature: true,
    requiredFishHealthy: true,
    bonusSummary: ['洞窟联合研究周会优先挑选“样本 + 研究器材”的组合交付。']
  },

]

export type QuestMarketCategory = 'crop' | 'fish' | 'animal_product' | 'processed' | 'fruit' | 'ore' | 'gem'

const mapItemCategoryToQuestMarketCategory = (category: ItemCategory | undefined): QuestMarketCategory | null => {
  switch (category) {
    case 'crop':
    case 'fish':
    case 'animal_product':
    case 'processed':
    case 'fruit':
    case 'ore':
    case 'gem':
      return category
    default:
      return null
  }
}

const getQuestMarketCategoryByItemId = (itemId: string): QuestMarketCategory | null => {
  return mapItemCategoryToQuestMarketCategory(getItemById(itemId)?.category)
}

const TIER_LABELS = ['简单', '普通', '困难', '极难']
const TIER_FRIENDSHIP = [5, 8, 12, 15]

interface SpecialOrderRewardProfile {
  id: string
  label: string
  cashRatio: number
  ticketReward: Partial<Record<RewardTicketType, number>>
  summary: string
}

const SPECIAL_ORDER_REWARD_PROFILES: Record<string, SpecialOrderRewardProfile> = {
  standard_cash: {
    id: 'standard_cash',
    label: '现金主体',
    cashRatio: 1,
    ticketReward: {},
    summary: '以现金奖励为主，保留基础经营型回报。'
  },
  operations_mix: {
    id: 'operations_mix',
    label: '建设运营混合',
    cashRatio: 0.72,
    ticketReward: { construction: 1 },
    summary: '部分现金转为建设券，鼓励继续投入维护与扩建。'
  },
  trade_mix: {
    id: 'trade_mix',
    label: '商路混合',
    cashRatio: 0.68,
    ticketReward: { caravan: 2 },
    summary: '部分现金转为商路票，强化后续供货与商路循环。'
  },
  research_mix: {
    id: 'research_mix',
    label: '学舍研修混合',
    cashRatio: 0.6,
    ticketReward: { research: 2 },
    summary: '部分现金转为研究券，鼓励继续投入学舍与研究方向。'
  },
  exhibit_mix: {
    id: 'exhibit_mix',
    label: '展陈经营混合',
    cashRatio: 0.58,
    ticketReward: { exhibit: 2 },
    summary: '部分现金转为展陈券，使高阶订单更多回流展示经营线。'
  },
  pond_premium_mix: {
    id: 'pond_premium_mix',
    label: '鱼塘高规混合',
    cashRatio: 0.55,
    ticketReward: { exhibit: 1, caravan: 1 },
    summary: '部分现金转为展陈券与商路票，强化鱼塘向展示 / 商路的双向出口。'
  }
}

export const getSpecialOrderRewardProfile = (profileId?: string | null): SpecialOrderRewardProfile | null => {
  if (!profileId) return null
  return SPECIAL_ORDER_REWARD_PROFILES[profileId] ?? null
}

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
    allowedActivitySourceIds?: string[]
    preferredHybridIds?: string[]
    preferredMarketCategories?: QuestMarketCategory[]
    discouragedMarketCategories?: QuestMarketCategory[]
  },
  traceOptions?: {
    onTrace?: (trace: OrderGenerationTraceAttempt) => void
  }
): QuestInstance | null => {
  const clampedTier = Math.max(1, Math.min(4, tier))
  const discoveredHybridIds = new Set(options?.discoveredHybridIds ?? [])
  const compendiumMap = new Map((options?.breedingCompendiumEntries ?? []).map(entry => [entry.hybridId, entry]))
  const discoveredPondBreedIds = new Set(options?.discoveredPondBreedIds ?? [])
  const allowedActivitySourceIds = new Set(options?.allowedActivitySourceIds ?? [])
  const preferredHybridIds = new Set(options?.preferredHybridIds ?? [])
  const preferredMarketCategories = new Set(options?.preferredMarketCategories ?? [])
  const discouragedMarketCategories = new Set(options?.discouragedMarketCategories ?? [])
  const stabilityRankWeight: Record<BreedingStabilityRank, number> = {
    volatile: 0,
    emerging: 1,
    stable: 2,
    certified: 3
  }

  const getCompendiumCommercialTags = (entry?: CompendiumEntry): BreedingCommercialTag[] => {
    if (!entry) return []
    const tags = new Set<BreedingCommercialTag>()
    if ((entry.bestSweetness ?? 0) >= 72) tags.add('banquet')
    if ((entry.bestYield ?? 0) >= 72) tags.add('bulk_supply')
    if ((entry.bestResistance ?? 0) >= 70) tags.add('storage')
    if ((entry.bestGeneration ?? 0) >= 4) tags.add('showcase')
    if ((entry.bestGeneration ?? 0) >= 3 || (entry.lineageCropIds?.length ?? 0) >= 2) tags.add('research')
    if ((entry.bestGeneration ?? 0) >= 6 && entry.bestTotalStats >= 225) tags.add('luxury')
    return [...tags]
  }

  const getCompendiumStabilityRank = (entry?: CompendiumEntry): BreedingStabilityRank => {
    if (!entry) return 'volatile'
    if ((entry.bestGeneration ?? 0) >= 8) return 'certified'
    if ((entry.bestGeneration ?? 0) >= 6) return 'stable'
    if ((entry.bestGeneration ?? 0) >= 4) return 'emerging'
    return 'volatile'
  }

  const getCompendiumBreedingScore = (entry?: CompendiumEntry): number => {
    if (!entry) return 0
    const generationScore = Math.min(100, 20 + (entry.bestGeneration ?? 0) * 8)
    return Math.min(
      100,
      Math.round((entry.bestSweetness ?? 0) * 0.28) +
        Math.round((entry.bestYield ?? 0) * 0.22) +
        Math.round((entry.bestResistance ?? 0) * 0.18) +
        Math.round(generationScore * 0.12) +
        Math.round(Math.min(100, entry.bestTotalStats / 3) * 0.2)
    )
  }

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
    if (template.requiredCommercialTags?.length) {
      const tags = new Set(getCompendiumCommercialTags(entry))
      if (!template.requiredCommercialTags.every(tag => tags.has(tag))) return false
    }
    if (template.requiredBreedScoreMin && getCompendiumBreedingScore(entry) < template.requiredBreedScoreMin) return false
    if (
      template.requiredStabilityRank &&
      stabilityRankWeight[getCompendiumStabilityRank(entry)] < stabilityRankWeight[template.requiredStabilityRank]
    ) {
      return false
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
      (allowedActivitySourceIds.size <= 0 || allowedActivitySourceIds.has(t.activitySourceId ?? '')) &&
      (!t.requiredHybridId || discoveredHybridIds.has(t.requiredHybridId)) &&
      matchesBreedingRequirement(t) &&
      matchesFishpondRequirement(t)
  )
  if (valid.length === 0) {
    traceOptions?.onTrace?.({
      attempt: 1,
      candidateCount: 0,
      blockReason: '当前季节、梯度或玩法前置条件下无可用模板。',
      candidates: []
    })
    return null
  }

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
    if (template.requiredCommercialTags?.length) {
      summary.push(`经营标签需含：${template.requiredCommercialTags.join('、')}`)
    }
    if (template.requiredBreedScoreMin) summary.push(`育种综合评分≥${template.requiredBreedScoreMin}`)
    if (template.requiredStabilityRank) summary.push(`稳定度档位≥${template.requiredStabilityRank}`)
    if (template.requiredPondGenerationMin) summary.push(`鱼塘品系代数≥${template.requiredPondGenerationMin}`)
    if (template.requiredFishMature) summary.push('需成熟个体')
    if (template.requiredFishHealthy) summary.push('需健康个体')
    if (template.deliveryMode === 'pond') summary.push('可直接从鱼塘交付')
    if (template.comboRequirements?.length) {
      summary.push(`组合交付：${template.comboRequirements.map(requirement => `${requirement.itemName}×${requirement.quantity}`).join('、')}`)
    }
    return summary
  }

  const buildSpecialOrderScoreHint = (template: SpecialOrderTemplate): string[] | undefined => {
    const hints: string[] = []

    if (template.orderScoreRule?.label) {
      hints.push(`按「${template.orderScoreRule.label}」结算。`)
    }

    if (template.orderScoreRule?.id === 'breeding_quality') {
      if (template.requiredSweetnessMin || template.requiredYieldMin || template.requiredResistanceMin) {
        const statParts = [
          template.requiredSweetnessMin ? `甜度≥${template.requiredSweetnessMin}` : '',
          template.requiredYieldMin ? `产量≥${template.requiredYieldMin}` : '',
          template.requiredResistanceMin ? `抗性≥${template.requiredResistanceMin}` : ''
        ].filter(Boolean)
        if (statParts.length > 0) {
          hints.push(`评分重点：${statParts.join('、')}。`)
        }
      } else {
        hints.push('评分重点：图鉴综合属性越高越容易拿到高档评价。')
      }
      if (template.requiredGenerationMin) {
        hints.push(`评分会额外参考世代（建议至少 ${template.requiredGenerationMin} 代）。`)
      }
      if (template.requiredParentCropIds?.length) {
        hints.push(`谱系越贴合 ${template.requiredParentCropIds.map(cropId => getCropById(cropId)?.name ?? cropId).join('、')}，评分越高。`)
      }
      if (template.requiredCommercialTags?.length) {
        hints.push(`经营标签需覆盖 ${template.requiredCommercialTags.join('、')}，否则不会进入候选池。`)
      }
      if (template.requiredBreedScoreMin) {
        hints.push(`建议把育种综合评分至少推到 ${template.requiredBreedScoreMin}。`)
      }
      if (template.requiredStabilityRank) {
        hints.push(`稳定度档位至少达到 ${template.requiredStabilityRank}。`)
      }
    } else if (template.orderScoreRule?.id === 'fish_specimen') {
      const fishParts = [
        template.requiredPondGenerationMin ? `品系代数≥${template.requiredPondGenerationMin}` : '',
        template.requiredFishMature ? '成熟个体' : '',
        template.requiredFishHealthy ? '健康状态' : ''
      ].filter(Boolean)
      hints.push(`评分重点：${fishParts.length > 0 ? fishParts.join('、') : '样本状态与品系代数'}。`)
    } else if (template.orderScoreRule?.id === 'procurement_stability') {
      hints.push('评分重点：供货规模、时令匹配与附加条件完整度。')
    }

    hints.push('保留更多剩余天数可获得更高时效评价。')
    return hints.length > 0 ? hints : undefined
  }

  const buildSpecialOrderDeliverySourceHint = (
    template: SpecialOrderTemplate,
    stageDefinitions?: SpecialOrderStageDef[],
    comboRequirements?: SpecialOrderComboRequirement[]
  ): string[] | undefined => {
    const hints: string[] = []
    const stages = stageDefinitions ?? []
    const requirements = comboRequirements ?? []
    const hasPondStage = stages.some(stage => stage.deliveryMode === 'pond') || template.deliveryMode === 'pond'
    const hasInventoryStage = stages.some(stage => !stage.deliveryMode || stage.deliveryMode === 'inventory') || (!template.deliveryMode || template.deliveryMode === 'inventory')
    const hasPondRequirement = requirements.some(requirement => requirement.deliveryMode === 'pond')
    const hasInventoryRequirement = requirements.some(requirement => !requirement.deliveryMode || requirement.deliveryMode === 'inventory')

    if (requirements.length > 0) {
      const mixedDelivery = (hasPondRequirement && hasInventoryRequirement) || (hasPondStage && hasInventoryStage)
      if (mixedDelivery) {
        hints.push('该订单会同时检查背包物资与鱼塘样本来源。')
      } else if (hasPondRequirement || hasPondStage) {
        hints.push('该订单可直接从鱼塘提交符合条件的样本。')
      } else {
        hints.push('该订单需从背包携带全部材料后统一交付。')
      }
      const requirementLines = requirements.map(requirement =>
        `${requirement.itemName}：${requirement.deliveryMode === 'pond' ? '鱼塘直交' : '背包提交'}${requirement.note ? ` · ${requirement.note}` : ''}`
      )
      hints.push(...requirementLines)
    } else if (hasPondStage && hasInventoryStage) {
      hints.push('该阶段链同时包含背包提交与鱼塘直交环节。')
    } else if (hasPondStage) {
      hints.push('该订单会直接从鱼塘核验并提交样本。')
    } else {
      hints.push('该订单需从背包携带目标物后提交。')
    }

    if (stages.length > 1) {
      hints.push(`共有 ${stages.length} 个阶段，提交来源会随阶段目标变化。`)
    }

    return hints.length > 0 ? hints : undefined
  }

  const buildInitialOrderProgressState = (template: SpecialOrderTemplate, stageDefinitions?: SpecialOrderStageDef[]) => {
    if (template.orderVersion !== '3.0') return undefined
    const stages = stageDefinitions && stageDefinitions.length > 0
      ? stageDefinitions
      : createSingleStageDefinitions({
          title: '完成交付',
          description: '按订单要求完成当前批次交付。',
          targetItemId: template.targetItemId,
          targetItemName: template.targetItemName,
          quantity: template.quantity,
          deliveryMode: template.deliveryMode
        })

    return {
      currentStageIndex: 0,
      completedStageIds: [],
      initialDaysRemaining: template.days,
      currentRank: 'pending' as const,
      stageProgress: stages.map(stage => ({
        stageId: stage.id,
        completed: false,
        deliveredQuantity: 0,
        rewardClaimed: false,
        phaseType: stage.phaseType,
        nextStageTemplateId: stage.nextStageTemplateId
      }))
    }
  }

  const candidateTraces = valid.map(template => {
    let weight = 1
    const weightReasons = ['基础权重 1']
    const marketCategory = getQuestMarketCategoryByItemId(template.targetItemId)
    if (BREEDING_SPECIAL_ORDER_TUNING_CONFIG.featureFlags.themeWeekBiasEnabled && options?.preferredThemeTag && template.themeTag === options.preferredThemeTag) {
      weight += BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredThemeWeightBonus
      weightReasons.push(`主题周偏好 +${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredThemeWeightBonus}`)
    }
    if (template.preferredSeasons?.includes(season)) {
      weight += BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredSeasonWeightBonus
      weightReasons.push(`偏好季节 +${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredSeasonWeightBonus}`)
    }
    if (template.requiredHybridId && preferredHybridIds.has(template.requiredHybridId)) {
      weight += BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredHybridWeightBonus
      weightReasons.push(`推荐杂交目标 +${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredHybridWeightBonus}`)
    }
    if (marketCategory && preferredMarketCategories.has(marketCategory)) {
      weight += BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredMarketCategoryWeightBonus
      weightReasons.push(`市场偏好品类 +${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.preferredMarketCategoryWeightBonus}`)
    }
    if (marketCategory && discouragedMarketCategories.has(marketCategory)) {
      weight = Math.max(1, weight - BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.discouragedMarketCategoryWeightPenalty)
      weightReasons.push(`市场低迷品类 -${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.discouragedMarketCategoryWeightPenalty}`)
    }
    if (template.themeTag === 'breeding' && ['crop', 'fruit', 'processed'].some(category => preferredMarketCategories.has(category as QuestMarketCategory))) {
      weight += BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.breedingMarketWeightBonus
      weightReasons.push(`育种市场加成 +${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.breedingMarketWeightBonus}`)
    }
    if (template.themeTag === 'fishpond' && preferredMarketCategories.has('fish')) {
      weight += BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.fishpondMarketWeightBonus
      weightReasons.push(`鱼塘市场加成 +${BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation.fishpondMarketWeightBonus}`)
    }
    return {
      template,
      finalWeight: Math.max(1, weight),
      weightReasons,
      marketCategory
    }
  })

  const weightedPool = candidateTraces.flatMap(({ template, finalWeight }) => Array.from({ length: finalWeight }, () => template))

  const pool = weightedPool.length > 0 ? weightedPool : valid
  const template = pool[Math.floor(Math.random() * pool.length)]!
  traceOptions?.onTrace?.({
    attempt: 1,
    candidateCount: candidateTraces.length,
    selectedTemplateName: template.name,
    selectedTargetItemId: template.targetItemId,
    candidates: candidateTraces.map(candidate => ({
      templateName: candidate.template.name,
      targetItemId: candidate.template.targetItemId,
      tier: candidate.template.tier,
      themeTag: candidate.template.themeTag,
      activitySourceId: candidate.template.activitySourceId,
      requiredHybridId: candidate.template.requiredHybridId,
      preferredSeasons: candidate.template.preferredSeasons,
      finalWeight: candidate.finalWeight,
      weightReasons: candidate.weightReasons
    }))
  })
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
    ticketReward: template.ticketReward,
    rewardProfileId: template.rewardProfileId,
    orderVersion: template.orderVersion,
    daysRemaining: template.days,
    accepted: false,
    itemReward: template.itemReward,
    themeTag: template.themeTag,
    activitySourceId: template.activitySourceId,
    activitySourceLabel: template.activitySourceLabel,
    orderStageType: template.orderStageType,
    demandHint: template.bonusSummary?.[0],
    stageDefinitions: cloneStageDefinitions(template.stageDefinitions),
    comboRequirements: cloneComboRequirements(template.comboRequirements),
    orderScoreRule: template.orderScoreRule
      ? {
          ...template.orderScoreRule,
          factorSummary: [...template.orderScoreRule.factorSummary],
          thresholds: template.orderScoreRule.thresholds.map(threshold => ({ ...threshold }))
        }
      : undefined,
    scoreHint: buildSpecialOrderScoreHint(template),
    antiRepeatTags: template.antiRepeatTags ? [...template.antiRepeatTags] : undefined,
    antiRepeatCooldownWeeks: template.antiRepeatCooldownWeeks,
    recommendedHybridIds: template.requiredHybridId ? [template.requiredHybridId] : undefined,
    preferredSeasons: template.preferredSeasons,
    bonusSummary: template.bonusSummary,
    deliverySourceHint: buildSpecialOrderDeliverySourceHint(template, cloneStageDefinitions(template.stageDefinitions), cloneComboRequirements(template.comboRequirements)),
    requirementSummary: getRequirementSummary(template),
    requiredHybridId: template.requiredHybridId,
    requiredSweetnessMin: template.requiredSweetnessMin,
    requiredYieldMin: template.requiredYieldMin,
    requiredResistanceMin: template.requiredResistanceMin,
    requiredGenerationMin: template.requiredGenerationMin,
    requiredParentCropIds: template.requiredParentCropIds,
    requiredCommercialTags: template.requiredCommercialTags,
    requiredBreedScoreMin: template.requiredBreedScoreMin,
    requiredStabilityRank: template.requiredStabilityRank,
    deliveryMode: template.deliveryMode,
    requiredPondGenerationMin: template.requiredPondGenerationMin,
    requiredFishMature: template.requiredFishMature,
    requiredFishHealthy: template.requiredFishHealthy,
    orderProgressState: buildInitialOrderProgressState(template, cloneStageDefinitions(template.stageDefinitions))
  }
}

let questCounter = 0

/** 根据当前季节生成随机委托 */
export const generateQuest = (
  season: Season,
  _day: number,
  isUrgent = false,
  options?: {
    preferredQuestTypes?: QuestType[]
    preferredMarketCategories?: QuestMarketCategory[]
    discouragedMarketCategories?: QuestMarketCategory[]
    allowedActivitySourceIds?: string[]
  }
): QuestInstance | null => {
  const preferredQuestTypes = new Set(options?.preferredQuestTypes ?? [])
  const preferredMarketCategories = new Set(options?.preferredMarketCategories ?? [])
  const discouragedMarketCategories = new Set(options?.discouragedMarketCategories ?? [])
  const allowedActivitySourceIds = new Set(options?.allowedActivitySourceIds ?? [])

  const eligibleTemplates = QUEST_TEMPLATES.filter(
    template =>
      template.targets.some(target => target.seasons.length === 0 || target.seasons.includes(season)) &&
      (allowedActivitySourceIds.size <= 0 || allowedActivitySourceIds.has((template as any).activitySourceId ?? ''))
  )
  if (eligibleTemplates.length === 0) return null

  const weightedTemplates = eligibleTemplates.flatMap(template => {
    let weight = 1
    if (preferredQuestTypes.has(template.type)) {
      weight += 2
    }
    const hasPreferredTarget = template.targets.some(target => {
      const marketCategory = getQuestMarketCategoryByItemId(target.itemId)
      return !!marketCategory && preferredMarketCategories.has(marketCategory)
    })
    const allDiscouragedTargets = template.targets.every(target => {
      const marketCategory = getQuestMarketCategoryByItemId(target.itemId)
      return !!marketCategory && discouragedMarketCategories.has(marketCategory)
    })
    if (hasPreferredTarget) {
      weight += 1
    }
    if (allDiscouragedTargets) {
      weight = Math.max(1, weight - 1)
    }
    return Array.from({ length: weight }, () => template)
  })

  const templatePool = weightedTemplates.length > 0 ? weightedTemplates : eligibleTemplates
  const template = templatePool[Math.floor(Math.random() * templatePool.length)]!

  // 按季节过滤目标
  const validTargets = template.targets.filter(t => t.seasons.length === 0 || t.seasons.includes(season))
  if (validTargets.length === 0) return null

  const weightedTargets = validTargets.flatMap(target => {
    let weight = 1
    const marketCategory = getQuestMarketCategoryByItemId(target.itemId)
    if (marketCategory && preferredMarketCategories.has(marketCategory)) {
      weight += 2
    }
    if (marketCategory && discouragedMarketCategories.has(marketCategory)) {
      weight = Math.max(1, weight - 1)
    }
    return Array.from({ length: weight }, () => target)
  })

  // 随机选择目标
  const targetPool = weightedTargets.length > 0 ? weightedTargets : validTargets
  const target = targetPool[Math.floor(Math.random() * targetPool.length)]!

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
    activitySourceId: (template as any).activitySourceId,
    activitySourceLabel: (template as any).activitySourceLabel,
    isUrgent: isUrgent || undefined
  }
}

export const WS05_ACCEPTANCE_SUMMARY = {
  minQaCaseCount: 8,
  guardrails: [
    '育种主题订单的评分、票券倍率、阶段完成态与回执记录必须保持同一事务口径。',
    '特殊订单重复点击或重复提交时不可重复发钱、重复发券或重复写入阶段完成态。',
    '主题周偏置、市场偏置与反重复轮换可通过 data 配置直接调整，无需改动 QuestStore 主链路。',
    '旧档缺少特殊订单运营字段时必须自动补默认值，且不影响旧订单继续读取。'
  ],
  releaseAnnouncement: [
    '【育种订单】新增订单评分结算、阶段完成态与回执保护，高规格订单结算反馈更明确。',
    '【主题周经营】育种 / 鱼塘特殊订单支持按主题周、市场偏置与反重复标签进行轮换调参。',
    '【稳定性】特殊订单现已补齐重复提交防护、回执去重与基础补偿预案。'
  ]
} as const

export const WS05_QA_CASES: QaCaseDef[] = [
  {
    id: 'ws05-boundary-double-submit-guard',
    title: '特殊订单重复点击提交只结算一次',
    category: 'boundary',
    steps: ['接取一个可提交的 special_order', '连续触发 submitQuest 两次'],
    expectedResult: '仅第一次成功结算；第二次收到已在结算中或已完成结算提示，不重复发奖励。'
  },
  {
    id: 'ws05-positive-score-settlement',
    title: '育种订单按评分档位放大奖励',
    category: 'positive',
    steps: ['准备满足高世代 / 高属性 / 谱系要求的育种订单', '提交订单'],
    expectedResult: '返回评分档位、分数、奖励说明，现金与票券按评分规则放大。'
  },
  {
    id: 'ws05-positive-fishpond-score-settlement',
    title: '鱼塘高规订单按鱼体条件正确评分',
    category: 'positive',
    steps: ['准备成熟、健康且满足代数要求的 pond 订单', '提交订单'],
    expectedResult: '订单评分会参考鱼塘代数与健康/成熟条件，奖励结算口径正确。'
  },
  {
    id: 'ws05-negative-receipt-guard',
    title: '已结算特殊订单不可重复领奖',
    category: 'negative',
    steps: ['完成一个 special_order', '在未刷新存档前再次调用 submitQuest 同一 questId'],
    expectedResult: '系统拦截重复领奖，提示该订单已完成结算。'
  },
  {
    id: 'ws05-compatibility-old-save',
    title: '旧档缺少运营回执与历史字段时可安全读档',
    category: 'compatibility',
    steps: ['读取不含 specialOrderSettlementReceipts / recentSpecialOrderTagHistory 的旧 quest 存档'],
    expectedResult: '读档成功，新字段自动补空数组，不影响旧订单继续游玩。'
  },
  {
    id: 'ws05-ops-tuning-weight',
    title: '调整主题周与市场权重无需改 store 主逻辑',
    category: 'ops',
    steps: ['修改 BREEDING_SPECIAL_ORDER_TUNING_CONFIG.generation 中的权重', '刷新特殊订单生成'],
    expectedResult: '订单偏好发生变化，但无需修改 QuestStore / View 代码。'
  },
  {
    id: 'ws05-ops-disable-rotation',
    title: '关闭反重复轮换后允许同标签连续出现',
    category: 'ops',
    steps: ['将 antiRepeatRotationEnabled 设为 false', '连续多次刷新特殊订单'],
    expectedResult: '系统不再基于 recentSpecialOrderTagHistory 阻止同标签连续出现。'
  },
  {
    id: 'ws05-recovery-history-cap',
    title: '反重复历史与回执记录有上限且持续可用',
    category: 'recovery',
    steps: ['连续完成多笔特殊订单并推动 history / receipt 超过上限'],
    expectedResult: '旧记录按配置裁剪，新记录持续写入，功能不中断。'
  }
]

export const WS05_RELEASE_CHECKLIST: ReleaseChecklistItem[] = [
  { id: 'ws05-check-double-submit', label: '确认特殊订单重复点击不会重复结算', owner: 'qa', done: false },
  { id: 'ws05-check-score-reward', label: '确认评分档位、现金倍率与票券倍率口径一致', owner: 'dev', done: false },
  { id: 'ws05-check-old-save', label: '确认旧档缺少订单回执与历史字段时可安全读档', owner: 'qa', done: false },
  { id: 'ws05-check-tuning', label: '确认主题周权重、市场权重与反重复开关可直接热调', owner: 'ops', done: false },
  { id: 'ws05-check-ui-copy', label: '确认育种页与任务页文案和实际评分 / 需求一致', owner: 'design', done: false }
]

export const WS05_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'ws05-compensate-duplicate-settlement',
    trigger: '特殊订单出现重复结算，导致现金或票券重复发放。',
    compensation: ['按重复发放差额进行回收或等值说明补偿', '保留首次合法完成记录'],
    notes: '优先通过 questId、结算回执与日志记录定位重复发放区间。'
  },
  {
    id: 'ws05-compensate-score-mismatch',
    trigger: '评分档位与实际奖励倍率不一致，导致玩家收益异常。',
    compensation: ['补发缺失的票券 / 铜钱差额', '通过公告说明评分口径修复'],
    notes: '以 orderProgressState.currentScore / currentRank 与奖励日志为准进行核算。'
  },
  {
    id: 'ws05-compensate-overbiased-rotation',
    trigger: '主题周或反重复配置异常，导致订单池过度集中或长期不刷新目标。',
    action: '回调 BREEDING_SPECIAL_ORDER_TUNING_CONFIG 中权重或直接关闭 antiRepeatRotationEnabled，并通过更新日志说明修正。'
  }
]

export const WS05_RELEASE_ANNOUNCEMENT = [
  '【育种经营线】高规格特殊订单现支持评分档位、阶段完成态与奖励档案说明。',
  '【主题周订单】可通过配置直接调整主题偏置、市场偏置与反重复轮换强度。',
  '【稳定性】新增特殊订单防重复结算与补偿预案，减少重复领奖与坏档风险。'
] as const

export const WS12_QUEST_SETTLEMENT_GOVERNANCE_PRESET = {
  version: 1,
  settlementReceiptRetention: 40,
  criticalQuestTypes: ['special_order', 'delivery'] as const,
  compatibilityTouchpoints: ['specialOrderSettlementReceipts', 'activityQuestWindowState', 'bonusSummary'] as const,
  rollbackPriority: ['quest_reward', 'ticket_reward', 'item_reward'] as const
} as const

export const WS12_QUEST_SETTLEMENT_GOVERNANCE_CONTENT_DEFS = [
  {
    id: 'ws12_daily_delivery_probe',
    tier: 'mid_transition',
    label: '日结交付探针',
    linkedSuiteId: 'ws12_regression_daily_settlement',
    linkedQuestTypes: ['delivery'],
    priceBand: {
      timeMinutes: [5, 10],
      sampleQuestCount: [1, 2]
    },
    outputBand: {
      coveredRewards: ['money', 'item'],
      receiptChecks: [1, 2],
      compatibilityScope: ['bonusSummary']
    },
    consumptionBand: {
      manualReviews: [1, 2],
      retryBudget: [1, 1],
      blockedRewardTolerance: [0, 1]
    }
  },
  {
    id: 'ws12_special_order_guardrail',
    tier: 'late_growth',
    label: '特殊订单结算护栏',
    linkedSuiteId: 'ws12_regression_weekly_cycles',
    linkedQuestTypes: ['special_order', 'delivery'],
    priceBand: {
      timeMinutes: [10, 25],
      sampleQuestCount: [2, 4]
    },
    outputBand: {
      coveredRewards: ['money', 'item', 'ticket'],
      receiptChecks: [2, 4],
      compatibilityScope: ['specialOrderSettlementReceipts', 'activityQuestWindowState']
    },
    consumptionBand: {
      manualReviews: [2, 4],
      retryBudget: [1, 2],
      blockedRewardTolerance: [0, 1]
    }
  },
  {
    id: 'ws12_release_settlement_gate',
    tier: 'endgame_showcase',
    label: '上线结算闸门',
    linkedSuiteId: 'ws12_regression_release_gate',
    linkedQuestTypes: ['special_order', 'delivery'],
    priceBand: {
      timeMinutes: [25, 45],
      sampleQuestCount: [4, 8]
    },
    outputBand: {
      coveredRewards: ['money', 'item', 'ticket', 'mail'],
      receiptChecks: [4, 8],
      compatibilityScope: ['specialOrderSettlementReceipts', 'activityQuestWindowState', 'bonusSummary']
    },
    consumptionBand: {
      manualReviews: [4, 8],
      retryBudget: [2, 3],
      blockedRewardTolerance: [0, 0]
    }
  }
] as const
