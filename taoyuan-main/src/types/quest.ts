import type { Season } from './game'
import type { RelationshipStage } from './npc'
import type { RewardTicketType } from './economy'
import type { BreedingCommercialTag, BreedingStabilityRank } from './breeding'

/** 任务类型 */
export type QuestType = 'delivery' | 'fishing' | 'mining' | 'gathering' | 'special_order' | 'cooking' | 'errand' | 'festival_prep'

/** 村民委托侧重类别 */
export type VillagerQuestCategory = 'gathering' | 'cooking' | 'fishing' | 'errand' | 'festival_prep'

/** 特殊订单主题标签 */
export type QuestThemeTag = 'breeding' | 'fishpond'

/** 任务交付模式 */
export type QuestDeliveryMode = 'inventory' | 'pond'

/** 特殊订单结构类型 */
export type SpecialOrderStageType = 'single' | 'multi' | 'combo'

/** 特殊订单阶段类型 */
export type SpecialOrderStagePhaseType = 'prepare' | 'verify' | 'deliver' | 'display'

/** 特殊订单评分档位 */
export type SpecialOrderScoreRank = 'pending' | 'C' | 'B' | 'A' | 'S'

/** 特殊订单组合交付要求 */
export interface SpecialOrderComboRequirement {
  id: string
  itemId: string
  itemName: string
  quantity: number
  deliveryMode?: QuestDeliveryMode
  requiredHybridId?: string
  requiredSweetnessMin?: number
  requiredYieldMin?: number
  requiredResistanceMin?: number
  requiredGenerationMin?: number
  requiredParentCropIds?: string[]
  requiredCommercialTags?: BreedingCommercialTag[]
  requiredBreedScoreMin?: number
  requiredStabilityRank?: BreedingStabilityRank
  requiredPondGenerationMin?: number
  requiredFishMature?: boolean
  requiredFishHealthy?: boolean
  note?: string
}

/** 特殊订单阶段奖励 */
export interface SpecialOrderStageReward {
  moneyReward?: number
  friendshipReward?: number
  itemReward?: { itemId: string; quantity: number }[]
  ticketReward?: Partial<Record<RewardTicketType, number>>
  summary?: string
}

/** 特殊订单阶段定义 */
export interface SpecialOrderStageDef {
  id: string
  title: string
  description: string
  phaseType: SpecialOrderStagePhaseType
  targetItemId?: string
  targetItemName?: string
  targetQuantity?: number
  deliveryMode?: QuestDeliveryMode
  requirementSummary?: string[]
  comboRequirements?: SpecialOrderComboRequirement[]
  stageRewards?: SpecialOrderStageReward
  nextStageTemplateId?: string
}

/** 特殊订单评分阈值 */
export interface SpecialOrderScoreThreshold {
  rank: Exclude<SpecialOrderScoreRank, 'pending'>
  minScore: number
  label: string
  rewardMoneyMultiplier?: number
  rewardTicketMultiplier?: number
  summary?: string
}

/** 特殊订单评分规则 */
export interface SpecialOrderScoreRule {
  id: string
  label: string
  description: string
  factorSummary: string[]
  thresholds: SpecialOrderScoreThreshold[]
  previewText?: string
}

/** 特殊订单阶段进度 */
export interface SpecialOrderStageProgress {
  stageId: string
  completed: boolean
  deliveredQuantity: number
  rewardClaimed?: boolean
}

/** 阶段化订单运行态 */
export interface QuestStageState extends SpecialOrderStageProgress {
  phaseType?: SpecialOrderStagePhaseType
  nextStageTemplateId?: string
}

/** 阶段化订单历史记录 */
export interface SpecialOrderStageHistoryEntry {
  stageId: string
  phaseType?: SpecialOrderStagePhaseType
  deliveredQuantity: number
  resolution: 'advanced' | 'completed' | 'failed'
  summary?: string
}

/** 特殊订单结算摘要 */
export interface SpecialOrderSettlementSummary {
  score: number
  rank: SpecialOrderScoreRank
  remainingDays: number
  initialDaysRemaining: number
  timelinessRatio: number
  scoreBreakdown: string[]
  thresholdLabel?: string
  thresholdSummary?: string
}

/** 周循环高阶订单刷新状态 */
export interface WeeklySpecialOrderState {
  lastRefreshWeekId: string
  lastRefreshAbsoluteWeek?: number
  lastGeneratedOrderId?: string
  refreshMode: 'legacy' | 'weekly'
}

/** 订单生成候选追踪 */
export interface OrderGenerationTraceCandidate {
  templateName: string
  targetItemId: string
  tier: number
  themeTag?: QuestThemeTag
  activitySourceId?: string
  requiredHybridId?: string
  preferredSeasons?: Season[]
  finalWeight: number
  weightReasons: string[]
  blockedByAntiRepeat?: boolean
  blockedTags?: string[]
  cooldownWeeks?: number
}

/** 订单生成单次尝试追踪 */
export interface OrderGenerationTraceAttempt {
  attempt: number
  candidateCount: number
  selectedTemplateName?: string
  selectedTargetItemId?: string
  blockedByAntiRepeat?: boolean
  blockReason?: string
  candidates: OrderGenerationTraceCandidate[]
}

/** 订单生成调试追踪 */
export interface OrderGenerationTrace {
  season: Season
  tier: number
  mode: 'legacy' | 'weekly'
  weekId?: string
  absoluteWeek?: number
  attempts: number
  selectedOrderId?: string
  selectedTemplateName?: string
  selectedTargetItemId?: string
  selectedReason: string
  preferredThemeTag?: QuestThemeTag
  preferredHybridIds?: string[]
  preferredMarketCategories?: string[]
  discouragedMarketCategories?: string[]
  attemptsDetail: OrderGenerationTraceAttempt[]
}

/** 特殊订单运行态进度 */
export interface SpecialOrderProgressState {
  currentStageIndex: number
  completedStageIds: string[]
  initialDaysRemaining?: number
  currentScore?: number
  currentRank?: SpecialOrderScoreRank
  stageProgress?: QuestStageState[]
  stageHistory?: SpecialOrderStageHistoryEntry[]
  settlementSummary?: SpecialOrderSettlementSummary
}

/** 任务目标模板 */
export interface QuestTargetDef {
  itemId: string
  name: string
  minQty: number
  maxQty: number
  /** 该目标在哪些季节可用 (空数组=全季节) */
  seasons: Season[]
  /** 物品单价(用于计算奖励) */
  unitPrice: number
}

/** 任务模板(按类型) */
export interface QuestTemplateDef {
  type: QuestType
  targets: QuestTargetDef[]
  npcPool: string[]
  rewardMultiplier: number
  friendshipReward: number
  /** 最低关系阶段要求（用于村民专属委托） */
  minRelationshipStage?: RelationshipStage
}

/** 任务实例(运行时) */
export interface QuestInstance {
  id: string
  type: QuestType
  npcId: string
  npcName: string
  description: string
  targetItemId: string
  targetItemName: string
  targetQuantity: number
  collectedQuantity: number
  moneyReward: number
  friendshipReward: number
  daysRemaining: number
  accepted: boolean
  /** 村民委托类别 */
  sourceCategory?: VillagerQuestCategory
  /** 接取所需关系阶段 */
  relationshipStageRequired?: RelationshipStage
  /** 物品奖励（特殊订单） */
  itemReward?: { itemId: string; quantity: number }[]
  /** 食谱奖励 */
  recipeReward?: string[]
  /** 票券奖励 */
  ticketReward?: Partial<Record<RewardTicketType, number>>
  /** 奖励结构档案 */
  rewardProfileId?: string
  /** 建筑/生活线索奖励 */
  buildingClueId?: string
  buildingClueText?: string
  /** 奖励摘要 */
  bonusSummary?: string[]
  /** 难度标签（特殊订单） */
  tierLabel?: string
  /** 特殊订单结构版本 */
  orderVersion?: '2.x' | '3.0'
  /** 玩法主题标签 */
  themeTag?: QuestThemeTag
  /** 活动 / 周主题来源 */
  activitySourceId?: string
  activitySourceLabel?: string
  /** 单阶段 / 阶段链 / 组合交付 */
  orderStageType?: SpecialOrderStageType
  /** 阶段化定义 */
  stageDefinitions?: SpecialOrderStageDef[]
  /** 组合交付定义 */
  comboRequirements?: SpecialOrderComboRequirement[]
  /** 评分结算规则 */
  orderScoreRule?: SpecialOrderScoreRule
  /** 评分提示（面向 UI 的可读说明） */
  scoreHint?: string[]
  /** 反重复轮换标签 */
  antiRepeatTags?: string[]
  /** 反重复轮换冷却周数 */
  antiRepeatCooldownWeeks?: number
  /** 订单运行态进度 */
  orderProgressState?: SpecialOrderProgressState
  /** 交付来源提示（面向 UI 的可读说明） */
  deliverySourceHint?: string[]
  /** 主题需求描述 */
  demandHint?: string
  /** 建议关注的杂交品种 */
  recommendedHybridIds?: string[]
  /** 偏好季节（用于主题周筛选） */
  preferredSeasons?: Season[]
  /** 特殊订单附加条件摘要 */
  requirementSummary?: string[]
  /** 需要先培育出的杂交品种 */
  requiredHybridId?: string
  /** 育种属性门槛 */
  requiredSweetnessMin?: number
  requiredYieldMin?: number
  requiredResistanceMin?: number
  /** 育种世代门槛 */
  requiredGenerationMin?: number
  /** 育种谱系亲本要求 */
  requiredParentCropIds?: string[]
  /** 育种经营标签要求 */
  requiredCommercialTags?: BreedingCommercialTag[]
  /** 育种统一评分门槛 */
  requiredBreedScoreMin?: number
  /** 育种稳定度档位门槛 */
  requiredStabilityRank?: BreedingStabilityRank
  /** 提交方式：默认背包交付，也可直接从鱼塘交付 */
  deliveryMode?: QuestDeliveryMode
  /** 鱼塘品系代数门槛 */
  requiredPondGenerationMin?: number
  /** 是否要求成熟鱼 */
  requiredFishMature?: boolean
  /** 是否要求健康鱼 */
  requiredFishHealthy?: boolean
  /** 是否为紧急委托（1天时限，奖励翻倍） */
  isUrgent?: boolean
}

export interface LimitedTimeQuestCampaignDef {
  id: string
  label: string
  description: string
  unlockTier: 'P0' | 'P1' | 'P2'
  linkedCampaignId: string
  preferredThemeTag?: QuestThemeTag
  activitySourceId: string
  activitySourceLabel: string
  durationDays: number
  recommendedOfferIds?: string[]
  rewardSummary: string
}

export interface ActivityQuestWindowState {
  version: number
  activeCampaignId: string | null
  activeQuestTemplateIds: string[]
  lastRefreshDayTag: string
  nextRefreshDayTag: string
  completedWindowIds: string[]
  claimedRewardMailIds: string[]
}

// ============================================================
// 主线任务类型
// ============================================================

/** 主线任务目标类型 */
export type MainQuestObjectiveType =
  | 'earnMoney'
  | 'reachMineFloor'
  | 'reachSkullFloor'
  | 'skillLevel'
  | 'allSkillsLevel'
  | 'harvestCrops'
  | 'catchFish'
  | 'cookRecipes'
  | 'killMonsters'
  | 'discoverItems'
  | 'npcFriendship'
  | 'npcAllFriendly'
  | 'completeBundles'
  | 'completeQuests'
  | 'shipItems'
  | 'ownAnimals'
  | 'married'
  | 'hasChild'
  | 'deliverItem'

/** 主线任务单个目标 */
export interface MainQuestObjective {
  type: MainQuestObjectiveType
  /** 目标描述文本 */
  label: string
  /** 数值目标(金钱/层数/等级/数量) */
  target?: number
  /** 技能类型(skillLevel时) */
  skillType?: string
  /** NPC ID(npcFriendship时) */
  npcId?: string
  /** 好感等级(npcFriendship/npcAllFriendly时) */
  friendshipLevel?: string
  /** 物品ID(deliverItem时) */
  itemId?: string
  /** 物品数量(deliverItem时) */
  itemQuantity?: number
}

/** 主线任务定义(数据层) */
export interface MainQuestDef {
  id: string
  chapter: number
  order: number
  title: string
  description: string
  npcId: string
  objectives: MainQuestObjective[]
  moneyReward: number
  friendshipReward?: { npcId: string; amount: number }[]
  itemReward?: { itemId: string; quantity: number }[]
}

/** 主线任务运行时状态 */
export interface MainQuestState {
  questId: string
  accepted: boolean
  objectiveProgress: boolean[]
}
