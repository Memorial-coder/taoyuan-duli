import type { Season } from './game'
import type { RelationshipStage } from './npc'

/** 任务类型 */
export type QuestType = 'delivery' | 'fishing' | 'mining' | 'gathering' | 'special_order' | 'cooking' | 'errand' | 'festival_prep'

/** 村民委托侧重类别 */
export type VillagerQuestCategory = 'gathering' | 'cooking' | 'fishing' | 'errand' | 'festival_prep'

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
  /** 建筑/生活线索奖励 */
  buildingClueId?: string
  buildingClueText?: string
  /** 奖励摘要 */
  bonusSummary?: string[]
  /** 难度标签（特殊订单） */
  tierLabel?: string
  /** 玩法主题标签 */
  themeTag?: 'breeding' | 'fishpond'
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
  /** 提交方式：默认背包交付，也可直接从鱼塘交付 */
  deliveryMode?: 'inventory' | 'pond'
  /** 鱼塘品系代数门槛 */
  requiredPondGenerationMin?: number
  /** 是否要求成熟鱼 */
  requiredFishMature?: boolean
  /** 是否要求健康鱼 */
  requiredFishHealthy?: boolean
  /** 是否为紧急委托（1天时限，奖励翻倍） */
  isUrgent?: boolean
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
