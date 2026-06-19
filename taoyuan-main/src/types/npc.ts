import type { Season, Gender } from './game'

/** 好感度等级 */
export type FriendshipLevel = 'stranger' | 'acquaintance' | 'friendly' | 'bestFriend'

/** 更生活化的关系阶段（用于UI/收益/委托） */
export type RelationshipStage = 'recognize' | 'familiar' | 'friend' | 'bestie' | 'romance' | 'married' | 'family'

/** WS09 关系线内容梯度 */
export type RelationshipContentTier = 'P0' | 'P1' | 'P2'

export type GiftPreference = 'loved' | 'liked' | 'hated' | 'neutral'
export type RelationshipClueKind = 'gift' | 'birthday' | 'habit' | 'festival'
export type RelationshipClueSource = 'talk' | 'festival' | 'home' | 'secret_note' | 'shop' | 'rumor' | 'gift_test' | 'birthday'
export type RelationshipCluePrecision = 'hint' | 'exact' | 'confirmed'

export interface RelationshipClueEntry {
  npcId: string
  clueId: string
  text: string
  kind: RelationshipClueKind
  source: RelationshipClueSource
  precision: RelationshipCluePrecision
  discoveredDayTag?: string
  itemId?: string
  preference?: Exclude<GiftPreference, 'neutral'>
}

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

export type RandomNpcAgeBand = 'young' | 'adult' | 'middle' | 'elder'
export type RandomNpcVisitTier = 'short_visit' | 'acquaintance' | 'long_stay'
export type RandomNpcRelationshipTag = 'passing' | 'acquaintance' | 'friend' | 'ambiguous' | 'old_contact' | 'rival'
export type RandomNpcRelationshipDirection = 'trust' | 'ambiguity' | 'misunderstanding' | 'family_impression'

export type RandomNpcRelationshipSignals = Record<RandomNpcRelationshipDirection, number>
export type RandomNpcFamilyTieKind =
  | 'parent'
  | 'sibling'
  | 'distant_relative'
  | 'mentor'
  | 'caravan'
  | 'old_debt'
  | 'family_business'
  | 'sworn_kin'
  | 'old_flame'
  | 'child'

export type RandomNpcShortRomanceStatus = 'none' | 'invited' | 'ended'
export type RandomNpcShortRomanceAction = 'invite' | 'end'

export interface RandomNpcShortRomanceEvent {
  id: string
  dayTag: string
  action: RandomNpcShortRomanceAction
  summary: string
}

export interface RandomNpcShortRomanceState {
  status: RandomNpcShortRomanceStatus
  startedDayTag: string
  updatedDayTag: string
  note: string
  history: RandomNpcShortRomanceEvent[]
}

export interface RandomNpcFamilyTieDef {
  id: string
  kind: RandomNpcFamilyTieKind
  name: string
  relation: string
  summary: string
  attitude: 'supportive' | 'testing' | 'distant' | 'burdened'
}

export interface RandomNpcFamilyCommissionDef {
  id: string
  tieId: string
  title: string
  summary: string
  requestedItems: Array<{ itemId: string; quantity: number }>
  rewardSummary: string
}

export type RandomNpcBindingPreferenceKind = 'crop' | 'pet' | 'shop' | 'manor'

export interface RandomNpcBindingPreferenceDef {
  id: string
  kind: RandomNpcBindingPreferenceKind
  title: string
  targetIds: string[]
  summary: string
  triggerHint: string
}

export type RandomNpcFamilyReviewType =
  | 'meeting'
  | 'commission'
  | 'business'
  | 'relationship'
  | 'commitment'
  | 'home'
  | 'festival'
  | 'reunion'

export interface RandomNpcFamilyReviewEntry {
  id: string
  dayTag: string
  tieId: string
  type: RandomNpcFamilyReviewType
  summary: string
  reputationDelta: number
}

export interface RandomNpcFamilyBusinessEntry {
  id: string
  dayTag: string
  stage: 1 | 2 | 3
  summary: string
  rewardItems: Array<{ itemId: string; quantity: number }>
  rewardSummary: string
  reputationDelta: number
}

export interface RandomNpcFamilySpecialEventEntry {
  id: string
  dayTag: string
  tieId: string
  tieKind: Extract<RandomNpcFamilyTieKind, 'parent' | 'sibling' | 'distant_relative' | 'mentor' | 'caravan' | 'old_debt' | 'family_business' | 'sworn_kin' | 'old_flame'>
  stage: 1 | 2 | 3
  title: string
  summary: string
  relationshipDelta: number
  rewardItems?: Array<{ itemId: string; quantity: number }>
  rewardSummary?: string
}

export interface RandomNpcFamilyLineState {
  reputation: number
  metTieIds: string[]
  familyMeetingStages: Record<string, 0 | 1 | 2 | 3>
  familyMeetingLastDayTags: Record<string, string>
  specialTieEventStages: Record<string, 0 | 1 | 2 | 3>
  specialTieEventLastDayTags: Record<string, string>
  specialTieEventHistory: RandomNpcFamilySpecialEventEntry[]
  completedCommissionIds: string[]
  familyBusinessStage: 0 | 1 | 2 | 3
  familyBusinessNote: string
  familyBusinessHistory: RandomNpcFamilyBusinessEntry[]
  lastReview: string
  reviewHistory: RandomNpcFamilyReviewEntry[]
}

export type RandomNpcRelationLineKind = 'friend' | 'family' | 'romance' | 'zhiji' | 'sworn' | 'rivalry' | 'severed'
export type RandomNpcRelationLineAction = 'start' | 'sever' | 'engage' | 'marry' | 'home'
export type RandomNpcCommitmentStatus = 'none' | 'engaged' | 'married'
export type RandomNpcRelationshipGrowthBeatKind = 'acquaintance' | 'long_stay' | 'short_romance' | 'romance' | 'family'

export interface RandomNpcRelationshipGrowthBeatDef {
  id: string
  kind: RandomNpcRelationshipGrowthBeatKind
  title: string
  requiredAffinity: number
  requiredDirection: RandomNpcRelationshipDirection
  requiredSignal: number
  sourceSummary: string
  unlockedHint: string
  relationLineKind?: Extract<RandomNpcRelationLineKind, 'romance' | 'family'>
  requiresMetFamilyTie?: boolean
}

export interface RandomNpcRelationshipGrowthPreviewEntry extends RandomNpcRelationshipGrowthBeatDef {
  currentAffinity: number
  currentSignal: number
  metFamilyTieCount: number
  ready: boolean
  progressLabel: string
  statusLabel: string
}

export interface RandomNpcRelationLineEvent {
  id: string
  dayTag: string
  kind: RandomNpcRelationLineKind
  action: RandomNpcRelationLineAction
  summary: string
}

export interface RandomNpcRelationLineState {
  kind: RandomNpcRelationLineKind
  stage: 0 | 1 | 2 | 3
  commitmentStatus: RandomNpcCommitmentStatus
  commitmentDayTag: string
  marriedDayTag: string
  homeLifeNote: string
  startedDayTag: string
  updatedDayTag: string
  note: string
  history: RandomNpcRelationLineEvent[]
}

export type RandomNpcRelationshipMilestoneAuditAction =
  | 'acquaintance_added'
  | 'long_stay_promoted'
  | 'long_stay_story_progressed'
  | 'family_tie_met'
  | 'family_special_event_progressed'
  | 'family_commission_fulfilled'
  | 'relation_line_started'
  | 'relation_line_severed'
  | 'relation_line_engaged'
  | 'relation_line_married'
  | 'married_life_recorded'
  | 'family_business_progressed'
  | 'child_family_influence_applied'
  | 'child_family_event_progressed'

export interface RandomNpcRelationshipMilestoneAuditEntry {
  id: string
  action: RandomNpcRelationshipMilestoneAuditAction
  dayTag: string
  createdAt: string
  actorName: string
  source: 'local_npc_save'
  targetRef: string
  templateId: string
  visitorId: string
  residentId?: string
  npcName: string
  relationshipTag: RandomNpcRelationshipTag
  relationLineKind?: RandomNpcRelationLineKind
  relationLineStage?: 0 | 1 | 2 | 3
  familyTieId?: string
  familyTieKind?: RandomNpcFamilyTieKind
  stage?: number
  childId?: number
  idempotencyKey: string
  summary: string
  compensationHint: string
  privacyScope: 'local_save_only'
}

export interface RandomNpcDialogueMemoryEntry {
  id: string
  dayTag: string
  choiceId: string
  choiceText: string
  response: string
  sceneId?: string
  sceneKind?: RandomNpcDialogueSceneKind
  sceneTitle?: string
  sceneSummary?: string
  direction: RandomNpcRelationshipDirection
  affinityChange: number
  relationshipTag: RandomNpcRelationshipTag
  summary: string
}

export interface RandomNpcDialogueChoiceDef {
  id: string
  text: string
  response: string
  affinityChange: number
  relationshipTag?: RandomNpcRelationshipTag
  relationshipDirection?: RandomNpcRelationshipDirection
}

export type RandomNpcDialogueSceneKind =
  | 'first_meeting'
  | 'daily'
  | 'gift'
  | 'request'
  | 'misunderstanding'
  | 'festival'
  | 'rain'
  | 'night'
  | 'farewell'
  | 'reunion'

export interface RandomNpcDialogueSceneDef {
  id: string
  kind: RandomNpcDialogueSceneKind
  title: string
  summary: string
  triggerHint: string
  relationshipDirection?: RandomNpcRelationshipDirection
}

export interface RandomNpcSmallOrderDef {
  id: string
  title: string
  summary: string
  requestedItems: Array<{ itemId: string; quantity: number }>
  rewardSummary: string
}

export type RandomNpcLongStayRoute = 'friendship' | 'business' | 'caregiving' | 'craft'

export interface GeneratedNpcProfile {
  name: string
  ageBand: RandomNpcAgeBand
  gender: Gender
  origin: string
  occupation: string
  personalityTags: string[]
  speechStyle: string
  appearanceKeywords: string[]
  familyBackground: string
  preferences: RandomNpcTemplate['preferences']
  currentTrouble: string
  villagePurpose: string
  romanceView: string
  developmentRoutes: RandomNpcLongStayRoute[]
}

export interface RandomNpcTemplate {
  id: string
  nameSeeds: string[]
  ageBand: RandomNpcAgeBand
  gender: Gender
  occupation: string
  origin: string
  personalityTags: string[]
  speechStyle: string
  appearanceKeywords: string[]
  taboo: string
  lifeGoal: string
  currentTrouble: string
  villagePurpose: string
  romanceView: string
  developmentRoutes: RandomNpcLongStayRoute[]
  plotHook: string
  familySeed: string
  familyTies: RandomNpcFamilyTieDef[]
  familyCommission: RandomNpcFamilyCommissionDef
  preferences: {
    loved: string[]
    liked: string[]
    disliked: string[]
    bindings: RandomNpcBindingPreferenceDef[]
  }
  dialogueOpening: string
  dialogueChoices: RandomNpcDialogueChoiceDef[]
  dialogueScenes: RandomNpcDialogueSceneDef[]
  smallOrder: RandomNpcSmallOrderDef
}

export interface RandomNpcVisitorState {
  id: string
  templateId: string
  name: string
  ageBand: RandomNpcAgeBand
  gender: Gender
  occupation: string
  origin: string
  personalityTags: string[]
  speechStyle: string
  appearanceKeywords: string[]
  taboo: string
  lifeGoal: string
  currentTrouble: string
  villagePurpose: string
  romanceView: string
  developmentRoutes: RandomNpcLongStayRoute[]
  plotHook: string
  familySeed: string
  preferences: RandomNpcTemplate['preferences']
  dialogueOpening: string
  dialogueChoices: RandomNpcDialogueChoiceDef[]
  dialogueScenes: RandomNpcDialogueSceneDef[]
  smallOrder: RandomNpcSmallOrderDef
  smallOrderCompleted?: boolean
  locked?: boolean
  relationshipTag: RandomNpcRelationshipTag
  affinity: number
  firstVisitWeekId: string
  lastVisitDayTag: string
  talkedToday: boolean
  conversationCount: number
  keyEvents: string[]
  relationshipSignals: RandomNpcRelationshipSignals
  dialogueMemories: RandomNpcDialogueMemoryEntry[]
  shortRomance: RandomNpcShortRomanceState
  tier: RandomNpcVisitTier
}

export interface RandomNpcArchiveSummary {
  visitorId: string
  templateId: string
  name: string
  occupation: string
  relationshipTag: RandomNpcRelationshipTag
  affinity: number
  lastSeenDayTag: string
  summary: string
  keyEvents: string[]
  smallOrderCompleted?: boolean
  locked?: boolean
  relationshipSignals?: RandomNpcRelationshipSignals
  dialogueMemories?: RandomNpcDialogueMemoryEntry[]
  shortRomance?: RandomNpcShortRomanceState
  archivedTier?: RandomNpcVisitTier
  longStaySnapshot?: RandomNpcLongStayArchiveSnapshot
}

export interface RandomNpcAcquaintanceEntry {
  visitorId: string
  templateId: string
  name: string
  ageBand: RandomNpcAgeBand
  gender: Gender
  occupation: string
  origin: string
  personalityTags: string[]
  appearanceKeywords: string[]
  villagePurpose: string
  romanceView: string
  developmentRoutes: RandomNpcLongStayRoute[]
  plotHook: string
  familySeed: string
  preferences: RandomNpcTemplate['preferences']
  dialogueScenes: RandomNpcDialogueSceneDef[]
  smallOrder: RandomNpcSmallOrderDef
  smallOrderCompleted?: boolean
  relationshipTag: RandomNpcRelationshipTag
  affinity: number
  firstMetWeekId: string
  firstMetDayTag: string
  lastSeenDayTag: string
  conversationCount: number
  keyEvents: string[]
  relationshipSignals: RandomNpcRelationshipSignals
  dialogueMemories: RandomNpcDialogueMemoryEntry[]
  shortRomance: RandomNpcShortRomanceState
}

export interface RandomNpcStoryChoiceDef {
  id: string
  text: string
  response: string
  affinityChange: number
  relationshipTag?: RandomNpcRelationshipTag
  relationshipDirection?: RandomNpcRelationshipDirection
}

export interface RandomNpcLongStayStoryEventDef {
  id: string
  route: RandomNpcLongStayRoute
  stage: 1 | 2 | 3
  title: string
  opening: string
  choices: RandomNpcStoryChoiceDef[]
}

export interface RandomNpcLongStayEntry {
  residentId: string
  sourceVisitorId: string
  templateId: string
  name: string
  ageBand: RandomNpcAgeBand
  gender: Gender
  occupation: string
  origin: string
  personalityTags: string[]
  speechStyle: string
  appearanceKeywords: string[]
  taboo: string
  lifeGoal: string
  currentTrouble: string
  villagePurpose: string
  romanceView: string
  developmentRoutes: RandomNpcLongStayRoute[]
  plotHook: string
  familySeed: string
  familyTies: RandomNpcFamilyTieDef[]
  familyLine: RandomNpcFamilyLineState
  preferences: RandomNpcTemplate['preferences']
  dialogueScenes: RandomNpcDialogueSceneDef[]
  smallOrder: RandomNpcSmallOrderDef
  smallOrderCompleted?: boolean
  relationshipTag: RandomNpcRelationshipTag
  affinity: number
  movedInDayTag: string
  residenceReason: string
  route: RandomNpcLongStayRoute
  relationshipEventStage: 0 | 1 | 2 | 3
  completedStoryEventIds: string[]
  lastStoryDayTag: string
  keyEvents: string[]
  relationshipSignals: RandomNpcRelationshipSignals
  dialogueMemories: RandomNpcDialogueMemoryEntry[]
  relationshipLine: RandomNpcRelationLineState
}

export interface RandomNpcLongStayArchiveSnapshot {
  residentId: string
  sourceVisitorId: string
  movedInDayTag: string
  residenceReason: string
  route: RandomNpcLongStayRoute
  relationshipEventStage: 0 | 1 | 2 | 3
  completedStoryEventIds: string[]
  lastStoryDayTag: string
  familyTies: RandomNpcFamilyTieDef[]
  familyLine: RandomNpcFamilyLineState
  relationshipLine: RandomNpcRelationLineState
}

export type RandomNpcGenerationAnomalyAction =
  | 'active_visitor_overflow'
  | 'duplicate_visitor_id'
  | 'invalid_template_reference'
  | 'weekly_generation_overflow'

export interface RandomNpcGenerationAnomalyEntry {
  id: string
  action: RandomNpcGenerationAnomalyAction
  weekId: string
  dayTag: string
  createdAt: string
  source: 'local_npc_save'
  visitorIds: string[]
  templateIds: string[]
  observedCount: number
  limit: number
  idempotencyKey: string
  summary: string
  compensationHint: string
  privacyScope: 'local_save_only'
}

export interface RandomNpcBoardState {
  version: number
  lastGeneratedWeekId: string
  activeVisitors: RandomNpcVisitorState[]
  acquaintanceIds: string[]
  acquaintances: RandomNpcAcquaintanceEntry[]
  longStayResidents: RandomNpcLongStayEntry[]
  recentSummaries: RandomNpcArchiveSummary[]
  relationshipMilestoneAudit: RandomNpcRelationshipMilestoneAuditEntry[]
  generationAnomalyAudit: RandomNpcGenerationAnomalyEntry[]
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
  /** 本周用于村民帮办门槛的交谈次数 */
  activeServiceTalksThisWeek: number
  /** 已委托、等待次日日结发放的村民帮办 */
  pendingActiveServices: NpcPendingActiveService[]
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
  /** 永久解锁的 NPC 专属功能 ID */
  unlockedFunctionIds?: string[]
  companionshipTier: RelationshipContentTier
  activeHouseholdRoleId: HouseholdRoleId | null
  completedFamilyWishIds: string[]
  unlockedCompanionProjectIds: string[]
}

export interface NpcPendingActiveService {
  serviceId: string
  weekId: string
  requestedDayTag: string
  costMoney: number
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

export interface ChildTrainingInfluenceEntry {
  id: string
  dayTag: string
  focus: ChildTrainingFocus
  sourceResidentId: string
  sourceName: string
  summary: string
}

export interface ChildTrainingFamilyEventEntry {
  id: string
  dayTag: string
  focus: ChildTrainingFocus
  stage: 1 | 2 | 3
  sourceResidentId: string
  sourceName: string
  title: string
  summary: string
}

export interface ChildTrainingState {
  focus: ChildTrainingFocus | null
  lessonsThisWeek: number
  milestoneIds: string[]
  familyInfluenceFocus: ChildTrainingFocus | null
  familyInfluenceSource: string
  familyInfluenceHistory: ChildTrainingInfluenceEntry[]
  familyEventStages: Record<string, 0 | 1 | 2 | 3>
  familyEventLastDayTags: Record<string, string>
  familyEventHistory: ChildTrainingFamilyEventEntry[]
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
  /** 自动喂食任务使用的饲料；旧存档缺省为干草。 */
  feedItemId?: string
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
