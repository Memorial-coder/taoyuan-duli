import type { Season, Gender } from './game'

/** 好感度等级 */
export type FriendshipLevel = 'stranger' | 'acquaintance' | 'friendly' | 'bestFriend'

/** 更生活化的关系阶段（用于UI/收益/委托） */
export type RelationshipStage = 'recognize' | 'familiar' | 'friend' | 'bestie' | 'romance' | 'married' | 'family'

/** WS09 关系线内容梯度 */
export type RelationshipContentTier = 'P0' | 'P1' | 'P2'

export type NpcPerkType = 'shop_discount' | 'quest_unlock' | 'item_reward' | 'recipe_hint' | 'daily_bonus' | 'family_event'

export interface NpcPerkEffect {
  type: NpcPerkType
  value?: number
  itemId?: string
  quantity?: number
  description: string
}

export interface RelationshipRewardDef {
  id: string
  npcId: string
  minStage: RelationshipStage
  summary: string
  effect: NpcPerkEffect
  onceOnly?: boolean
}

export interface FamilyEventDef {
  id: string
  npcId: string
  title: string
  description: string
  minStage?: RelationshipStage
  requiredDaysMarried?: number
}

export interface RelationshipContentReward {
  money?: number
  items?: Array<{ itemId: string; quantity: number }>
}

export type HouseholdRoleId = 'field_support' | 'home_care' | 'craft_assist' | 'social_coordination'

export interface HouseholdRoleDef {
  id: HouseholdRoleId
  label: string
  description: string
  unlockTier: RelationshipContentTier
  linkedSystems: Array<'home' | 'quest' | 'breeding' | 'fishing'>
  rewardSummary: string
}

export interface HouseholdRoleAssignmentState {
  npcId: string
  roleId: HouseholdRoleId
  assignedWeekId: string
  progressDays: number
  completedCycles: number
}

export interface HouseholdDivisionState {
  version: number
  unlockTier: RelationshipContentTier
  assignments: HouseholdRoleAssignmentState[]
  lastSettlementDayTag: string
  pendingRewardIds: string[]
}

export type FamilyWishCategory = 'household' | 'childcare' | 'social' | 'spirit'
export type RelationshipEventChainStepType = 'trigger' | 'weekly' | 'settlement'

export interface RelationshipEventChainStep {
  id: string
  title: string
  summary: string
  stepType: RelationshipEventChainStepType
  linkedSystem?: 'home' | 'quest' | 'breeding' | 'fishing' | 'goal'
  routeName?: 'home' | 'quest' | 'breeding' | 'fishing' | 'museum' | 'hanhai' | 'fishpond' | 'shop' | 'hall' | 'mail' | 'village'
}

export interface FamilyWishDef {
  id: string
  title: string
  description: string
  unlockTier: RelationshipContentTier
  category: FamilyWishCategory
  linkedSystem: 'home' | 'quest' | 'breeding' | 'fishing' | 'goal'
  targetValue: number
  durationDays: number
  rewardSummary: string
  reward?: RelationshipContentReward
  linkedNpcIds?: string[]
  recommendedRoleId?: HouseholdRoleId
  steps?: RelationshipEventChainStep[]
}

export interface FamilyWishBoardState {
  version: number
  unlockTier: RelationshipContentTier
  activeWishId: string | null
  completedWishIds: string[]
  rerollCount: number
  streakCount: number
  progress: number
  targetValue: number
  startedDayTag: string
  expiresDayTag: string
  rewardClaimed: boolean
}

export interface ZhijiCompanionProjectDef {
  id: string
  label: string
  description: string
  unlockTier: RelationshipContentTier
  linkedSystem: 'quest' | 'home' | 'breeding' | 'fishing'
  milestoneTarget: number
  rewardSummary: string
  reward?: RelationshipContentReward
  steps?: RelationshipEventChainStep[]
}

export interface ZhijiCompanionProjectState {
  projectId: string
  npcId: string
  unlockTier: RelationshipContentTier
  progress: number
  targetValue: number
  activatedWeekId: string
  completed: boolean
  rewarded: boolean
}

/** NPC 定义 */
export interface NpcDef {
  id: string
  name: string
  /** 性别 */
  gender: Gender
  role: string
  personality: string
  lovedItems: string[]
  likedItems: string[]
  hatedItems: string[]
  dialogues: Record<FriendshipLevel, string[]>
  /** 是否可以结婚 */
  marriageable?: boolean
  /** 关联的心事件ID列表 */
  heartEventIds?: string[]
  /** 约会阶段专属对话 */
  datingDialogues?: string[]
  /** 知己专属对话 */
  zhijiDialogues?: string[]
  /** 知己心事件ID列表 */
  zhijiHeartEventIds?: string[]
  /** 生日 (季节+日期) */
  birthday?: { season: Season; day: number }
  relationshipRewards?: RelationshipRewardDef[]
  familyEvents?: FamilyEventDef[]
  companionshipTier?: RelationshipContentTier
  householdRoleIds?: HouseholdRoleId[]
  familyWishIds?: string[]
  zhijiProjectIds?: string[]
}

/** NPC 状态（运行时） */
export interface NpcState {
  npcId: string
  friendship: number
  talkedToday: boolean
  giftedToday: boolean
  /** 本周送礼次数 (上限2) */
  giftsThisWeek: number
  /** 是否正在约会 */
  dating: boolean
  /** 是否已结婚 */
  married: boolean
  /** 是否已结为知己 */
  zhiji: boolean
  /** 已触发的心事件ID */
  triggeredHeartEvents: string[]
  /** 已领取/解锁的关系奖励ID */
  unlockedPerks?: string[]
  companionshipTier: RelationshipContentTier
  activeHouseholdRoleId: HouseholdRoleId | null
  completedFamilyWishIds: string[]
  unlockedCompanionProjectIds: string[]
}

/** 心事件场景 */
export interface HeartEventScene {
  text: string
  /** 该场景提供的选择（无则自动跳到下一场景） */
  choices?: {
    text: string
    friendshipChange: number
    response: string
  }[]
}

/** 心事件定义 */
export interface HeartEventDef {
  id: string
  npcId: string
  /** 触发所需的最低好感度 */
  requiredFriendship: number
  /** 是否需要知己关系才能触发 */
  requiresZhiji?: boolean
  title: string
  scenes: HeartEventScene[]
}

/** 子女成长阶段 */
export type ChildStage = 'baby' | 'toddler' | 'child' | 'teen'

export type ChildTrainingFocus = 'farm' | 'craft' | 'social' | 'spirit'

export interface ChildTrainingState {
  focus: ChildTrainingFocus | null
  lessonsThisWeek: number
  milestoneIds: string[]
}

/** 子女状态 */
export interface ChildState {
  id: number
  name: string
  daysOld: number
  stage: ChildStage
  friendship: number
  interactedToday: boolean
  /** 出生品质 */
  birthQuality: 'normal' | 'premature' | 'healthy'
  origin: 'birth' | 'adoption'
  trainingState: ChildTrainingState
}

/** 孕期阶段 */
export type FamilyExpansionKind = 'pregnancy' | 'adoption'
export type FamilyExpansionStage = 'early' | 'mid' | 'late' | 'ready'
export type FamilyExpansionPlan = 'normal' | 'advanced' | 'luxury'
export type PregnancyStage = FamilyExpansionStage
export type PregnancyState = FamilyExpansionState

/** 提议回应 */
export type ProposalResponse = 'accept' | 'decline' | 'wait'

/** 雇工任务类型 */
export type FarmHelperTask = 'water' | 'feed' | 'harvest' | 'weed'

/** 雇工状态 */
export interface HiredHelper {
  npcId: string
  task: FarmHelperTask
  dailyWage: number
}

/** 孕期状态 */
export interface FamilyExpansionState {
  kind: FamilyExpansionKind
  stage: FamilyExpansionStage
  daysInStage: number
  stageDays: number
  /** 安产分数 0-100 */
  careScore: number
  caredToday: boolean
  giftedToday: boolean
  companionToday: boolean
  supportPlan: FamilyExpansionPlan | null
  giftedForPregnancy?: boolean
  medicalPlan?: FamilyExpansionPlan | null
  careMilestoneIds: string[]
}
