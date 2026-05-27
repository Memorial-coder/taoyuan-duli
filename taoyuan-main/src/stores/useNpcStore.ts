import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  GiftPreference,
  NpcState,
  FriendshipLevel,
  RelationshipStage,
  RelationshipClueEntry,
  RelationshipCluePrecision,
  RelationshipClueSource,
  HeartEventDef,
  Quality,
  ChildState,
  ChildTrainingFocus,
  ChildTrainingInfluenceEntry,
  FamilyWishBoardState,
  HouseholdRoleId,
  HouseholdDivisionState,
  PregnancyState,
  PregnancyStage,
  FamilyExpansionState,
  FamilyExpansionKind,
  ProposalResponse,
  FarmHelperTask,
  HiredHelper,
  ZhijiCompanionProjectState,
  RelationshipContentReward,
  RandomNpcAcquaintanceEntry,
  RandomNpcArchiveSummary,
  RandomNpcBoardState,
  RandomNpcDialogueSceneDef,
  RandomNpcDialogueMemoryEntry,
  RandomNpcFamilyBusinessEntry,
  RandomNpcFamilyCommissionDef,
  RandomNpcFamilyLineState,
  RandomNpcLongStayArchiveSnapshot,
  RandomNpcFamilyReviewEntry,
  RandomNpcFamilyTieDef,
  RandomNpcFamilyTieKind,
  RandomNpcCommitmentStatus,
  RandomNpcRelationLineKind,
  RandomNpcRelationLineState,
  RandomNpcRelationshipDirection,
  RandomNpcRelationshipSignals,
  RandomNpcLongStayEntry,
  RandomNpcLongStayRoute,
  RandomNpcRelationshipTag,
  RandomNpcVisitorState,
  RandomNpcShortRomanceState,
  RegionId,
  RegionRumorSupplyEntry,
  Season,
  Weather
} from '@/types'
import { NPCS, getNpcById, getHeartEventsForNpc, RECIPES, getTodayEvent, getCropById } from '@/data'
import { RANDOM_NPC_LONG_STAY_STORY_EVENTS, RANDOM_NPC_TEMPLATES, RANDOM_NPC_VISITOR_CONFIG } from '@/data/randomNpcs'
import {
  createDefaultChildTrainingState,
  createDefaultFamilyWishBoardState,
  createDefaultHouseholdDivisionState,
  WS09_FAMILY_WISH_DEFS,
  WS15_FAMILY_WISH_DEFS,
  WS09_FAMILY_WISH_BOARD_CONFIG,
  WS09_HOUSEHOLD_ROLE_DEFS,
  WS09_RELATIONSHIP_TUNING_CONFIG,
  WS09_ZHIJI_COMPANION_PROJECT_DEFS,
  WS15_ZHIJI_COMPANION_PROJECT_DEFS
} from '@/data/npcs'
import { WEATHER_TIPS, getFortuneTip, getLivingTip, getRecipeTipMessage, NO_RECIPE_TIP, TIP_NPC_IDS } from '@/data/npcTips'
import {
  getNpcBenefitSummaries,
  getNpcBirthdaySpecialLines,
  getNpcGiftClueTemplates,
  getNpcGiftReturn,
  getNpcGiftReturnSummaries,
  getNpcNextBenefitSummaries,
  getNpcNextScheduleText,
  getNpcScheduleStatus,
  getNpcScheduleTimeline,
  getNpcShopDiscount,
  getRelationshipStageRank,
  getRelationshipStageFromState,
  getRelationshipStageLabel,
  isRelationshipStageAtLeast,
  NPC_RELATIONSHIP_BENEFITS,
  RELATIONSHIP_STAGE_META
} from '@/data/npcWorld'
import { WS09_FAMILY_COMPANIONSHIP_BASELINE_AUDIT } from '@/data/goals'
import { getItemById } from '@/data/items'
import { useInventoryStore } from './useInventoryStore'
import { useGameStore } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useSecretNoteStore } from './useSecretNoteStore'
import { useCookingStore } from './useCookingStore'
import { useFarmStore } from './useFarmStore'
import { useAnimalStore } from './useAnimalStore'
import { useFishPondStore } from './useFishPondStore'
import { useDecorationStore } from './useDecorationStore'
import { harvestFarmPlotWithRewards } from '@/composables/useFarmHarvest'
import { addLog } from '@/composables/useGameLog'
import { DAYS_PER_SEASON, DAYS_PER_YEAR, getAbsoluteDay, getWeekCycleInfo } from '@/utils/weekCycle'
import { buildSeasonEventResolutionContext } from '@/utils/seasonEventContext'

const ALL_FAMILY_WISH_DEFS = [...WS09_FAMILY_WISH_DEFS, ...WS15_FAMILY_WISH_DEFS]
const ALL_ZHIJI_COMPANION_PROJECT_DEFS = [...WS09_ZHIJI_COMPANION_PROJECT_DEFS, ...WS15_ZHIJI_COMPANION_PROJECT_DEFS]
const RANDOM_NPC_COOKING_TOPIC_LABELS = ['NPC 来访话题', '送礼话题', '家宴团圆']
const FIXED_NPC_TALK_COOKING_TOPIC_LABELS = ['NPC 来访话题', '家宴团圆']
const FIXED_NPC_GIFT_COOKING_TOPIC_LABELS = ['送礼话题']
const RANDOM_NPC_COOKING_TOPIC_AFFINITY_BONUS = 3
const FIXED_NPC_COOKING_TOPIC_FRIENDSHIP_BONUS = 5
const RANDOM_NPC_SMALL_ORDER_AFFINITY_REWARD = 8
const RANDOM_NPC_DIALOGUE_MEMORY_LIMIT = 6
const RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT = 8
const RANDOM_NPC_RELATION_LINE_HISTORY_LIMIT = 6
const RANDOM_NPC_FAMILY_TIE_LIMIT = 4
const RANDOM_NPC_FAMILY_REVIEW_LIMIT = 4
const RANDOM_NPC_SHORT_ROMANCE_HISTORY_LIMIT = 4
const CHILD_TRAINING_FAMILY_INFLUENCE_LIMIT = 4
const RANDOM_NPC_SHORT_ROMANCE_AFFINITY_REQUIREMENT = 45
const RANDOM_NPC_SHORT_ROMANCE_AMBIGUITY_REQUIREMENT = 4
const RANDOM_NPC_FOLLOW_UP_EVENT_PREFIX = '后续约定：'

type RandomNpcDialogueContextTarget = {
  name: string
  smallOrder: { title: string; requestedItems: Array<{ itemId: string; quantity: number }> }
  smallOrderCompleted?: boolean
  keyEvents: string[]
  dialogueMemories: RandomNpcDialogueMemoryEntry[]
}

const RANDOM_NPC_SEASON_CONTEXT_LINES: Record<Season, string> = {
  spring: '春日草木新发，话题自然绕回播种与新客。',
  summer: '夏日气息正盛，路上的见闻也被晒得更明亮。',
  autumn: '秋意压着田畴，收成和归途都更容易被提起。',
  winter: '冬日村口清冷，炉火、储粮和去留都显得更近。'
}

const RANDOM_NPC_WEATHER_CONTEXT_LINES: Record<Weather, string> = {
  sunny: '今日晴光好，对方说话时也多了几分舒展。',
  rainy: '雨声压低了院外脚步，这段话听起来更像檐下闲谈。',
  stormy: '雷雨将近，对方先望了望天色才继续说下去。',
  snowy: '雪意落在村路上，对方把话说得慢而谨慎。',
  windy: '风从田埂上掠过，对方顺势问起村里的近况。',
  green_rain: '绿雨气息漫过山脚，对方明显被这场异象牵住了心神。'
}

type RegionRumorTemplate = {
  id: string
  regionId: RegionId
  npcId: string
  title: string
  summary: string
  detailLines: string[]
  targetRouteId: string | null
  minStage: RelationshipStage
  seasons?: Season[] | 'all'
  weathers?: Weather[] | 'all'
  festivalIds?: string[]
  tags: string[]
}

type RandomNpcRelationLineStartKind = Exclude<RandomNpcRelationLineKind, 'severed'>

const REGION_RUMOR_TEMPLATES: RegionRumorTemplate[] = [
  {
    id: 'ancient_road_station_ledger',
    regionId: 'ancient_road',
    npcId: 'chen_bo',
    title: '驿站换签传闻',
    summary: '陈伯说旧驿站最近又有人翻出没对上的押运签条，荒道沿线很可能还有能补全账册的断档。',
    detailLines: ['更适合先查补给中继与驿站旧库。', '如果这周先处理，任务板和商圈会更容易接住这批线索。'],
    targetRouteId: 'ancient_road_supply_relay',
    minStage: 'recognize',
    seasons: 'all',
    weathers: ['sunny', 'windy'],
    tags: ['荒道', '商路', '账册']
  },
  {
    id: 'ancient_road_archives',
    regionId: 'ancient_road',
    npcId: 'liu_niang',
    title: '夹层残卷传闻',
    summary: '柳娘提到旧路账册里夹着一页被风沙磨薄的残卷，若赶在本季风口前去找，可能还能辨出手记。',
    detailLines: ['需要更仔细的手动摸图，自动巡行容易错过夹层。'],
    targetRouteId: 'ancient_road_archive_recovery',
    minStage: 'familiar',
    seasons: ['spring', 'autumn', 'winter'],
    tags: ['荒道', '残卷', '考据']
  },
  {
    id: 'ancient_road_convoy',
    regionId: 'ancient_road',
    npcId: 'yun_fei',
    title: '押运改道传闻',
    summary: '云飞收到风声，说这周有一支押运队临时绕开旧哨口，沿线护送和瀚海线索可能会一起松动。',
    detailLines: ['更适合带着手动探索去确认护送改道的分叉。'],
    targetRouteId: 'ancient_road_convoy_risk',
    minStage: 'friend',
    seasons: 'all',
    weathers: ['sunny', 'windy', 'rainy'],
    tags: ['荒道', '押运', '瀚海']
  },
  {
    id: 'mirage_marsh_reed',
    regionId: 'mirage_marsh',
    npcId: 'qiu_yue',
    title: '苇荡鱼讯传闻',
    summary: '秋月说这几天泽地边缘的水色不对，苇荡间有一批会跟天气换位的鱼讯，错过就要等下周。',
    detailLines: ['先去看芦苇浅滩与夜巡点，周赛和展示池都吃这批样本。'],
    targetRouteId: 'mirage_marsh_reed_drift',
    minStage: 'friend',
    seasons: ['spring', 'summer', 'autumn'],
    weathers: ['sunny', 'windy', 'green_rain'],
    tags: ['泽地', '鱼讯', '样本']
  },
  {
    id: 'mirage_marsh_spore',
    regionId: 'mirage_marsh',
    npcId: 'lin_lao',
    title: '孢潮样本传闻',
    summary: '林老提到泽地孢潮会在特定湿热天气后翻涌，若能及时进去，博物馆的研究交付会轻松很多。',
    detailLines: ['这类样本需要当周手动确认，不宜直接自动巡回。'],
    targetRouteId: 'mirage_marsh_specimen_drive',
    minStage: 'friend',
    seasons: ['summer', 'autumn'],
    weathers: ['rainy', 'green_rain', 'stormy'],
    tags: ['泽地', '孢潮', '研究']
  },
  {
    id: 'mirage_marsh_watch',
    regionId: 'mirage_marsh',
    npcId: 'da_niu',
    title: '夜巡脚印传闻',
    summary: '大牛说夜里泽地边缘常有不该出现的脚印，若顺着夜巡路线去看，也许能带回更完整的生态记录。',
    detailLines: ['适合在夜巡线手动推进，顺带确认展示池能不能接住。'],
    targetRouteId: 'mirage_marsh_night_watch',
    minStage: 'familiar',
    seasons: 'all',
    tags: ['泽地', '夜巡', '踪迹']
  },
  {
    id: 'cloud_highland_ley',
    regionId: 'cloud_highland',
    npcId: 'a_shi',
    title: '裂脉回响传闻',
    summary: '阿石说高地灵脉最近有重新张开的迹象，若顺着裂脉口推进，能更快摸到本周的晶体回流。',
    detailLines: ['优先去灵脉裂口，适合补公会战备与建设前置。'],
    targetRouteId: 'cloud_highland_ley_crack',
    minStage: 'familiar',
    seasons: 'all',
    weathers: ['sunny', 'windy', 'snowy'],
    tags: ['高地', '灵脉', '战备']
  },
  {
    id: 'cloud_highland_skybridge',
    regionId: 'cloud_highland',
    npcId: 'zhao_mujiang',
    title: '云桥松扣传闻',
    summary: '赵木匠收到前哨返修单，说云桥观察位有一段松扣，若现在去看，能顺便接住新的建设材料线。',
    detailLines: ['适合先做观测，再把回流接去村庄和公会。'],
    targetRouteId: 'cloud_highland_skybridge_watch',
    minStage: 'friend',
    seasons: 'all',
    weathers: ['sunny', 'windy', 'snowy'],
    tags: ['高地', '云桥', '建设']
  },
  {
    id: 'cloud_highland_patrol',
    regionId: 'cloud_highland',
    npcId: 'sun_tiejiang',
    title: '前哨巡修传闻',
    summary: '孙铁匠提到本周前哨巡修会顺带清一条旧哨路线，如果跟上这趟节奏，高地回流会更容易放大。',
    detailLines: ['适合先巡逻再补给，属于这周高地最稳的手动线。'],
    targetRouteId: 'cloud_highland_patrol',
    minStage: 'friend',
    seasons: 'all',
    weathers: ['sunny', 'windy', 'snowy'],
    tags: ['高地', '前哨', '巡修']
  }
]

/** 好感度上限：未婚 2500（10心），已婚 4000；美观度≥100额外+250 */
const getFriendshipCap = (state: { married: boolean }, beautyCapBonus = 0): number =>
  (state.married ? 4000 : 2500) + beautyCapBonus

const getEffectiveFriendshipCap = (state: { married: boolean }): number => {
  const decorationStore = useDecorationStore()
  return getFriendshipCap(state, decorationStore.beautyScore >= 100 ? 250 : 0)
}

/** 好感等级阈值 (10心制, 每心250点, 上限2500) */
const FRIENDSHIP_THRESHOLDS: { level: FriendshipLevel; min: number }[] = [
  { level: 'bestFriend', min: 2000 },
  { level: 'friendly', min: 1000 },
  { level: 'acquaintance', min: 500 },
  { level: 'stranger', min: 0 }
]

const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const

const parseRelationshipDayTag = (dayTag?: string) => {
  if (!dayTag) return null
  const [yearText, seasonText, dayText] = dayTag.split('-')
  if (!yearText || !seasonText || !dayText || !SEASON_ORDER.includes(seasonText as typeof SEASON_ORDER[number])) return null
  const year = Number(yearText)
  const day = Number(dayText)
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null
  return {
    year,
    season: seasonText as typeof SEASON_ORDER[number],
    day
  }
}

const formatRelationshipDayTag = (absoluteDay: number) => {
  const safeAbsoluteDay = Math.max(1, Math.floor(absoluteDay))
  const year = Math.floor((safeAbsoluteDay - 1) / DAYS_PER_YEAR) + 1
  const dayOfYear = ((safeAbsoluteDay - 1) % DAYS_PER_YEAR) + 1
  const seasonIndex = Math.floor((dayOfYear - 1) / DAYS_PER_SEASON)
  const day = ((dayOfYear - 1) % DAYS_PER_SEASON) + 1
  return `${year}-${SEASON_ORDER[seasonIndex] ?? 'spring'}-${day}`
}

const addDaysToRelationshipDayTag = (dayTag: string, durationDays: number) => {
  const parsed = parseRelationshipDayTag(dayTag)
  if (!parsed) return dayTag
  const absoluteDay = getAbsoluteDay(parsed.year, parsed.season, parsed.day)
  return formatRelationshipDayTag(absoluteDay + Math.max(0, durationDays - 1))
}

const isRelationshipDayTagExpired = (expiresDayTag: string, currentDayTag: string) => {
  const expires = parseRelationshipDayTag(expiresDayTag)
  const current = parseRelationshipDayTag(currentDayTag)
  if (!expires || !current) return false
  return getAbsoluteDay(current.year, current.season, current.day) >= getAbsoluteDay(expires.year, expires.season, expires.day)
}

export const useNpcStore = defineStore('npc', () => {
  const validNpcIds = new Set(NPCS.map(npc => npc.id))

  const buildDefaultNpcState = (npcId: string): NpcState => ({
    npcId,
    friendship: 0,
    talkedToday: false,
    giftedToday: false,
    giftsThisWeek: 0,
    dating: false,
    married: false,
    zhiji: false,
    triggeredHeartEvents: [],
    unlockedPerks: [],
    companionshipTier: 'P0',
    activeHouseholdRoleId: null,
    completedFamilyWishIds: [],
    unlockedCompanionProjectIds: []
  })

  const npcStates = ref<NpcState[]>(
    NPCS.map(npc => buildDefaultNpcState(npc.id))
  )

  /** 每日提示NPC是否已给过提示 */
  const tipGivenToday = ref<Record<string, boolean>>({})

  /** 子女列表 */
  const children = ref<ChildState[]>([])

  /** 子女ID自增计数器（避免释放后ID冲突） */
  const nextChildId = ref<number>(0)

  /** 结婚天数计数 */
  const daysMarried = ref<number>(0)

  /** 知己天数计数 */
  const daysZhiji = ref<number>(0)

  /** 孕期状态（null = 无孕期） */
  const pregnancy = ref<PregnancyState | null>(null)
  const familyExpansion = pregnancy as unknown as { value: FamilyExpansionState | null }

  /** 配偶是否已提议要孩子（等待玩家回应） */
  const childProposalPending = ref<boolean>(false)

  /** 提议被拒绝次数（影响再次提议冷却） */
  const childProposalDeclinedCount = ref<number>(0)

  /** 距上次拒绝/等待的天数 */
  const daysSinceProposalDecline = ref<number>(0)

  /** 婚礼倒计时 (0=无婚礼待举行) */
  const weddingCountdown = ref<number>(0)

  /** 婚礼对象NPC ID */
  const weddingNpcId = ref<string | null>(null)

  /** 已获得的礼物 / 生活线索 */
  const relationshipClues = ref<RelationshipClueEntry[]>([])

  /** 婚后分工状态 */
  const householdDivision = ref<HouseholdDivisionState>(createDefaultHouseholdDivisionState())

  /** 家庭心愿板状态 */
  const familyWishBoard = ref<FamilyWishBoardState>(createDefaultFamilyWishBoardState())

  /** 知己协作项目状态 */
  const zhijiCompanionProjects = ref<ZhijiCompanionProjectState[]>([])

  /** 关系线运行时锁 */
  const relationshipActionLocks = ref<string[]>([])

  /** 随机来访 NPC：只保留本周短访和最近摘要，避免存档无限膨胀 */
  const randomNpcBoard = ref<RandomNpcBoardState>({
    version: 8,
    lastGeneratedWeekId: '',
    activeVisitors: [],
    acquaintanceIds: [],
    acquaintances: [],
    longStayResidents: [],
    recentSummaries: []
  })

  const hashText = (text: string): number => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0
    }
    return hash
  }

  const pickBySeed = <T>(pool: T[], seed: string): T => {
    return pool[hashText(seed) % pool.length]!
  }

  const getCurrentNpcDayTag = (): string => {
    const gameStore = useGameStore()
    return formatRelationshipDayTag(getAbsoluteDay(gameStore.year, gameStore.season, gameStore.day))
  }

  const getRelationshipDayTagAbsoluteDay = (dayTag: string): number | null => {
    const parsed = parseRelationshipDayTag(dayTag)
    if (!parsed) return null
    return getAbsoluteDay(parsed.year, parsed.season, parsed.day)
  }

  const getRandomNpcInactiveDays = (lastSeenDayTag: string, currentDayTag: string): number => {
    const lastSeen = getRelationshipDayTagAbsoluteDay(lastSeenDayTag)
    const current = getRelationshipDayTagAbsoluteDay(currentDayTag)
    if (!lastSeen || !current) return 0
    return Math.max(0, current - lastSeen)
  }

  const createDefaultRandomNpcRelationshipSignals = (): RandomNpcRelationshipSignals => ({
    trust: 0,
    ambiguity: 0,
    misunderstanding: 0,
    family_impression: 0
  })

  const sanitizeRandomNpcRelationshipSignals = (raw: unknown): RandomNpcRelationshipSignals => {
    const source = raw && typeof raw === 'object' ? raw as Partial<Record<RandomNpcRelationshipDirection, unknown>> : {}
    return {
      trust: Math.max(0, Math.min(99, Number(source.trust) || 0)),
      ambiguity: Math.max(0, Math.min(99, Number(source.ambiguity) || 0)),
      misunderstanding: Math.max(0, Math.min(99, Number(source.misunderstanding) || 0)),
      family_impression: Math.max(0, Math.min(99, Number(source.family_impression) || 0))
    }
  }

  const inferRandomNpcRelationshipDirection = (
    relationshipTag: RandomNpcRelationshipTag,
    choiceId: string,
    choiceText: string
  ): RandomNpcRelationshipDirection => {
    if (relationshipTag === 'ambiguous') return 'ambiguity'
    if (relationshipTag === 'rival') return 'misunderstanding'
    if (choiceId.includes('family') || choiceId.includes('letter') || choiceId.includes('home') || choiceText.includes('家')) {
      return 'family_impression'
    }
    return 'trust'
  }

  const getRandomNpcRelationshipDirectionLabel = (direction: RandomNpcRelationshipDirection): string => {
    if (direction === 'ambiguity') return '暧昧'
    if (direction === 'misunderstanding') return '误会'
    if (direction === 'family_impression') return '家族印象'
    return '信任'
  }

  const buildRandomNpcDialogueMemory = (params: {
    npcName: string
    dayTag: string
    choiceId: string
    choiceText: string
    response: string
    direction: RandomNpcRelationshipDirection
    affinityChange: number
    relationshipTag: RandomNpcRelationshipTag
  }): RandomNpcDialogueMemoryEntry => ({
    id: `${params.dayTag}:${params.choiceId}:${params.direction}`,
    dayTag: params.dayTag,
    choiceId: params.choiceId,
    choiceText: params.choiceText,
    response: params.response,
    direction: params.direction,
    affinityChange: params.affinityChange,
    relationshipTag: params.relationshipTag,
    summary: `${params.npcName}因“${params.choiceText}”留下${getRandomNpcRelationshipDirectionLabel(params.direction)}记录。`
  })

  const appendRandomNpcDialogueMemory = (
    memories: RandomNpcDialogueMemoryEntry[],
    memory: RandomNpcDialogueMemoryEntry,
    limit = RANDOM_NPC_DIALOGUE_MEMORY_LIMIT
  ): RandomNpcDialogueMemoryEntry[] => [...memories, memory].slice(-limit)

  const getRandomNpcFarmContextLine = (targetName: string): string => {
    const farmStore = useFarmStore()
    const allPlots = [...farmStore.plots, ...farmStore.greenhousePlots]
    const harvestablePlot = allPlots.find(plot => plot.cropId && plot.state === 'harvestable')
    const growingPlot = allPlots.find(plot =>
      plot.cropId && (plot.state === 'planted' || plot.state === 'growing')
    )
    const plot = harvestablePlot ?? growingPlot
    if (!plot?.cropId) return ''
    const cropName = getCropById(plot.cropId)?.name ?? plot.cropId
    if (plot.state === 'harvestable') {
      return `田里的${cropName}已经能收，${targetName}顺势问起这批收成准备怎么用。`
    }
    return `你们提到地里的${cropName}还在长，话题转向这几天的照料。`
  }

  const getRandomNpcSmallOrderContextLine = (target: RandomNpcDialogueContextTarget): string => {
    if (target.smallOrderCompleted || target.smallOrder.requestedItems.length === 0) return ''
    const inventoryStore = useInventoryStore()
    const progress = target.smallOrder.requestedItems.map(item => ({
      ...item,
      owned: inventoryStore.getTotalItemCount(item.itemId)
    }))
    if (progress.every(item => item.owned >= item.quantity)) {
      return `小订单「${target.smallOrder.title}」的材料已备齐，${target.name}明显把后续安排说得更细。`
    }
    const partialItem = progress.find(item => item.owned > 0 && item.owned < item.quantity)
    if (partialItem) {
      const itemName = getItemById(partialItem.itemId)?.name ?? partialItem.itemId
      return `你提到正在筹备${itemName}，${target.name}也记得小订单还差${partialItem.quantity - partialItem.owned}份。`
    }
    return `小订单「${target.smallOrder.title}」还没起头，${target.name}把请求留在试探里。`
  }

  const getRandomNpcFollowUpContextLine = (target: RandomNpcDialogueContextTarget): string => {
    const latestAgreement = [...target.keyEvents]
      .reverse()
      .find(eventLine => eventLine.includes(RANDOM_NPC_FOLLOW_UP_EVENT_PREFIX))
    if (!latestAgreement) return ''
    const markerIndex = latestAgreement.indexOf(RANDOM_NPC_FOLLOW_UP_EVENT_PREFIX)
    const agreement = latestAgreement
      .slice(markerIndex + RANDOM_NPC_FOLLOW_UP_EVENT_PREFIX.length)
      .replace(/（[^）]*）$/, '')
      .trim()
    return agreement ? `你们还记得上次的约定：${agreement}` : ''
  }

  const buildRandomNpcFollowUpAgreementLine = (params: {
    target: RandomNpcDialogueContextTarget
    dayTag: string
    choiceText: string
    direction: RandomNpcRelationshipDirection
    affinityChange: number
  }): string => {
    if (params.affinityChange <= 0 && params.direction !== 'misunderstanding') return ''
    const nextDayTag = addDaysToRelationshipDayTag(params.dayTag, params.direction === 'misunderstanding' ? 2 : 3)
    if (params.direction === 'family_impression') {
      return `${params.target.name}约定在${nextDayTag}前后再带一段家中旧闻，让你判断是否继续插手。`
    }
    if (params.direction === 'ambiguity') {
      return `你们约定在${nextDayTag}前后避开人多处，把“${params.choiceText}”背后的心意再说清。`
    }
    if (params.direction === 'misunderstanding') {
      return `你们约定在${nextDayTag}前后先把“${params.choiceText}”里的误会讲清，不让它拖成心结。`
    }
    if (!params.target.smallOrderCompleted) {
      return `你们约定在${nextDayTag}前后再核对小订单「${params.target.smallOrder.title}」和“${params.choiceText}”提到的线索。`
    }
    return `你们约定在${nextDayTag}前后再接着聊“${params.choiceText}”提到的去处与人情。`
  }

  const buildRandomNpcDialogueContextLine = (target: RandomNpcDialogueContextTarget): string => {
    const gameStore = useGameStore()
    const environmentLine = `${RANDOM_NPC_SEASON_CONTEXT_LINES[gameStore.season]}${RANDOM_NPC_WEATHER_CONTEXT_LINES[gameStore.weather]}`
    const lastMemory = target.dialogueMemories[target.dialogueMemories.length - 1]
    const behaviorLines = [
      getRandomNpcFollowUpContextLine(target),
      getRandomNpcFarmContextLine(target.name),
      getRandomNpcSmallOrderContextLine(target),
      lastMemory ? `上次关于“${lastMemory.choiceText}”的余波还在，这回回应多了一层旧话题的回声。` : ''
    ].filter(Boolean)
    const behaviorLine = behaviorLines.length > 0
      ? pickBySeed(
          behaviorLines,
          `${target.name}:${gameStore.year}:${gameStore.season}:${gameStore.day}:${gameStore.weather}:${target.dialogueMemories.length}`
        )
      : ''
    return [environmentLine, behaviorLine].filter(Boolean).join(' ')
  }

  const applyRandomNpcRelationshipSignal = (
    signals: RandomNpcRelationshipSignals,
    direction: RandomNpcRelationshipDirection,
    affinityChange: number
  ): RandomNpcRelationshipSignals => ({
    ...signals,
    [direction]: Math.max(0, Math.min(99, signals[direction] + Math.max(1, Math.ceil(Math.abs(affinityChange) / 4))))
  })

  const sanitizeRandomNpcDialogueMemories = (raw: unknown, limit = RANDOM_NPC_DIALOGUE_MEMORY_LIMIT): RandomNpcDialogueMemoryEntry[] =>
    (Array.isArray(raw) ? raw : [])
      .filter((entry: unknown): entry is Partial<RandomNpcDialogueMemoryEntry> => !!entry && typeof entry === 'object')
      .map((entry): RandomNpcDialogueMemoryEntry => {
        const direction: RandomNpcRelationshipDirection =
          entry.direction === 'ambiguity' || entry.direction === 'misunderstanding' || entry.direction === 'family_impression'
            ? entry.direction
            : 'trust'
        const relationshipTag = (
          entry.relationshipTag === 'acquaintance' ||
          entry.relationshipTag === 'friend' ||
          entry.relationshipTag === 'ambiguous' ||
          entry.relationshipTag === 'old_contact' ||
          entry.relationshipTag === 'rival'
            ? entry.relationshipTag
            : 'passing'
        ) as RandomNpcRelationshipTag
        return {
          id: typeof entry.id === 'string' ? entry.id : `${entry.dayTag ?? '旧日'}:${entry.choiceId ?? 'choice'}:${direction}`,
          dayTag: typeof entry.dayTag === 'string' ? entry.dayTag : '',
          choiceId: typeof entry.choiceId === 'string' ? entry.choiceId : '',
          choiceText: typeof entry.choiceText === 'string' ? entry.choiceText : '',
          response: typeof entry.response === 'string' ? entry.response : '',
          direction,
          affinityChange: Number(entry.affinityChange) || 0,
          relationshipTag,
          summary: typeof entry.summary === 'string' ? entry.summary : `${getRandomNpcRelationshipDirectionLabel(direction)}记录`
        }
      })
      .slice(-limit)

  const sanitizeRandomNpcDialogueScenes = (
    raw: unknown,
    fallback: RandomNpcDialogueSceneDef[] = []
  ): RandomNpcDialogueSceneDef[] => {
    const source = Array.isArray(raw) && raw.length > 0 ? raw : fallback
    return source
      .filter((entry: unknown): entry is Partial<RandomNpcDialogueSceneDef> => !!entry && typeof entry === 'object')
      .map((entry, index): RandomNpcDialogueSceneDef => {
        const kind: RandomNpcDialogueSceneDef['kind'] =
          entry.kind === 'daily' ||
          entry.kind === 'gift' ||
          entry.kind === 'request' ||
          entry.kind === 'misunderstanding' ||
          entry.kind === 'festival' ||
          entry.kind === 'rain' ||
          entry.kind === 'night' ||
          entry.kind === 'farewell' ||
          entry.kind === 'reunion'
            ? entry.kind
            : 'first_meeting'
        const relationshipDirection: RandomNpcRelationshipDirection | undefined =
          entry.relationshipDirection === 'ambiguity' ||
          entry.relationshipDirection === 'misunderstanding' ||
          entry.relationshipDirection === 'family_impression' ||
          entry.relationshipDirection === 'trust'
            ? entry.relationshipDirection
            : undefined
        return {
          id: typeof entry.id === 'string' && entry.id ? entry.id : `${kind}:${index}`,
          kind,
          title: typeof entry.title === 'string' && entry.title ? entry.title : '日常闲谈',
          summary: typeof entry.summary === 'string' && entry.summary ? entry.summary : '保留为随机 NPC 的轻量对话场景。',
          triggerHint: typeof entry.triggerHint === 'string' && entry.triggerHint ? entry.triggerHint : '普通互动后出现。',
          relationshipDirection
        }
      })
      .slice(0, 4)
  }

  const sanitizeRandomNpcFamilyTies = (raw: unknown, fallback: RandomNpcFamilyTieDef[] = []): RandomNpcFamilyTieDef[] => {
    const source = Array.isArray(raw) && raw.length > 0 ? raw : fallback
    return source
      .filter((entry: unknown): entry is Partial<RandomNpcFamilyTieDef> => !!entry && typeof entry === 'object')
      .map((entry, index): RandomNpcFamilyTieDef => {
        const kind: RandomNpcFamilyTieKind =
          entry.kind === 'parent' ||
          entry.kind === 'sibling' ||
          entry.kind === 'distant_relative' ||
          entry.kind === 'mentor' ||
          entry.kind === 'caravan' ||
          entry.kind === 'old_debt' ||
          entry.kind === 'family_business'
            ? entry.kind
            : 'distant_relative'
        const attitude =
          entry.attitude === 'supportive' ||
          entry.attitude === 'testing' ||
          entry.attitude === 'distant' ||
          entry.attitude === 'burdened'
            ? entry.attitude
            : 'distant'
        return {
          id: typeof entry.id === 'string' ? entry.id : `${kind}:${index}`,
          kind,
          name: typeof entry.name === 'string' ? entry.name : '未记名亲缘',
          relation: typeof entry.relation === 'string' ? entry.relation : '旧日关系',
          summary: typeof entry.summary === 'string' ? entry.summary : '只保留为长住随机 NPC 的轻量家族线索。',
          attitude
        }
      })
      .slice(0, RANDOM_NPC_FAMILY_TIE_LIMIT)
  }

  const createDefaultRandomNpcFamilyLineState = (): RandomNpcFamilyLineState => ({
    reputation: 0,
    metTieIds: [],
    completedCommissionIds: [],
    familyBusinessStage: 0,
    familyBusinessNote: '尚未开启婚后家业线。',
    familyBusinessHistory: [],
    lastReview: '尚未见过对方家人，家族评价仍待建立。',
    reviewHistory: []
  })

  const sanitizeRandomNpcFamilyReview = (
    raw: unknown,
    validTieIds: Set<string>,
    fallbackTieId: string
  ): RandomNpcFamilyReviewEntry | null => {
    if (!raw || typeof raw !== 'object') return null
    const entry = raw as Partial<RandomNpcFamilyReviewEntry>
    const tieId = typeof entry.tieId === 'string' && validTieIds.has(entry.tieId) ? entry.tieId : fallbackTieId
    return {
      id: typeof entry.id === 'string' ? entry.id : `${tieId}:${entry.type ?? 'meeting'}`,
      dayTag: typeof entry.dayTag === 'string' ? entry.dayTag : '',
      tieId,
      type: entry.type === 'commission' || entry.type === 'business' ? entry.type : 'meeting',
      summary: typeof entry.summary === 'string' ? entry.summary : '家族评价已记录。',
      reputationDelta: Math.max(-20, Math.min(20, Number(entry.reputationDelta) || 0))
    }
  }

  const sanitizeRandomNpcFamilyBusinessEntry = (raw: unknown, index: number): RandomNpcFamilyBusinessEntry | null => {
    if (!raw || typeof raw !== 'object') return null
    const entry = raw as Partial<RandomNpcFamilyBusinessEntry>
    const rawStage = Number(entry.stage)
    const stage: 1 | 2 | 3 = rawStage === 2 || rawStage === 3 ? rawStage : 1
    return {
      id: typeof entry.id === 'string' ? entry.id : `${entry.dayTag ?? '旧日'}:business:${stage}:${index}`,
      dayTag: typeof entry.dayTag === 'string' ? entry.dayTag : '',
      stage,
      summary: typeof entry.summary === 'string' ? entry.summary : '婚后家业记录已保留。',
      rewardItems: Array.isArray(entry.rewardItems)
        ? entry.rewardItems
          .filter((item: unknown): item is { itemId?: unknown; quantity?: unknown } => !!item && typeof item === 'object')
          .map(item => ({
            itemId: typeof item.itemId === 'string' ? item.itemId : '',
            quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)))
          }))
          .filter(item => !!item.itemId)
          .slice(0, 3)
        : [],
      rewardSummary: typeof entry.rewardSummary === 'string' ? entry.rewardSummary : '',
      reputationDelta: Math.max(-20, Math.min(20, Number(entry.reputationDelta) || 0))
    }
  }

  const sanitizeRandomNpcFamilyLineState = (
    raw: unknown,
    familyTies: RandomNpcFamilyTieDef[],
    commission: RandomNpcFamilyCommissionDef
  ): RandomNpcFamilyLineState => {
    const validTieIds = new Set(familyTies.map(tie => tie.id))
    const fallbackTieId = validTieIds.has(commission.tieId) ? commission.tieId : familyTies[0]?.id ?? commission.tieId
    const rawLine = raw && typeof raw === 'object' ? raw as Partial<RandomNpcFamilyLineState> : {}
    const metTieIds = Array.isArray(rawLine.metTieIds)
      ? rawLine.metTieIds.filter((tieId: unknown): tieId is string => typeof tieId === 'string' && validTieIds.has(tieId))
      : []
    const completedCommissionIds = Array.isArray(rawLine.completedCommissionIds)
      ? rawLine.completedCommissionIds.filter((id: unknown): id is string => typeof id === 'string' && id === commission.id)
      : []
    const reviewHistory = (Array.isArray(rawLine.reviewHistory) ? rawLine.reviewHistory : [])
      .map(entry => sanitizeRandomNpcFamilyReview(entry, validTieIds, fallbackTieId))
      .filter((entry): entry is RandomNpcFamilyReviewEntry => !!entry)
      .slice(-RANDOM_NPC_FAMILY_REVIEW_LIMIT)
    const businessHistory = (Array.isArray(rawLine.familyBusinessHistory) ? rawLine.familyBusinessHistory : [])
      .map((entry, index) => sanitizeRandomNpcFamilyBusinessEntry(entry, index))
      .filter((entry): entry is RandomNpcFamilyBusinessEntry => !!entry)
      .slice(-RANDOM_NPC_FAMILY_REVIEW_LIMIT)
    const rawBusinessStage = Number(rawLine.familyBusinessStage)
    const familyBusinessStage: 0 | 1 | 2 | 3 =
      rawBusinessStage === 1 || rawBusinessStage === 2 || rawBusinessStage === 3 ? rawBusinessStage : 0
    return {
      reputation: Math.max(0, Math.min(100, Number(rawLine.reputation) || 0)),
      metTieIds: [...new Set(metTieIds)].slice(0, RANDOM_NPC_FAMILY_TIE_LIMIT),
      completedCommissionIds: [...new Set(completedCommissionIds)].slice(0, RANDOM_NPC_FAMILY_REVIEW_LIMIT),
      familyBusinessStage,
      familyBusinessNote: typeof rawLine.familyBusinessNote === 'string' && rawLine.familyBusinessNote
        ? rawLine.familyBusinessNote
        : createDefaultRandomNpcFamilyLineState().familyBusinessNote,
      familyBusinessHistory: businessHistory,
      lastReview: typeof rawLine.lastReview === 'string' && rawLine.lastReview ? rawLine.lastReview : '尚未见过对方家人，家族评价仍待建立。',
      reviewHistory
    }
  }

  const getRandomNpcFamilyMeetingReputationDelta = (tie: RandomNpcFamilyTieDef): number => {
    if (tie.attitude === 'supportive') return 8
    if (tie.attitude === 'testing') return 6
    if (tie.attitude === 'burdened') return 5
    return 4
  }

  const appendRandomNpcFamilyReview = (
    familyLine: RandomNpcFamilyLineState,
    review: RandomNpcFamilyReviewEntry
  ): RandomNpcFamilyLineState => ({
    ...familyLine,
    reputation: Math.max(0, Math.min(100, familyLine.reputation + review.reputationDelta)),
    lastReview: review.summary,
    reviewHistory: [...familyLine.reviewHistory, review].slice(-RANDOM_NPC_FAMILY_REVIEW_LIMIT)
  })

  const appendRandomNpcFamilyBusinessHistory = (
    familyLine: RandomNpcFamilyLineState,
    entry: RandomNpcFamilyBusinessEntry
  ): RandomNpcFamilyBusinessEntry[] => [...familyLine.familyBusinessHistory, entry].slice(-RANDOM_NPC_FAMILY_REVIEW_LIMIT)

  const sanitizeChildTrainingInfluenceHistory = (raw: unknown): ChildTrainingInfluenceEntry[] =>
    (Array.isArray(raw) ? raw : [])
      .filter((entry: unknown): entry is Partial<ChildTrainingInfluenceEntry> => !!entry && typeof entry === 'object')
      .map((entry, index): ChildTrainingInfluenceEntry => {
        const focus: ChildTrainingFocus =
          entry.focus === 'craft' || entry.focus === 'social' || entry.focus === 'spirit' || entry.focus === 'farm'
            ? entry.focus
            : 'social'
        return {
          id: typeof entry.id === 'string' ? entry.id : `${entry.dayTag ?? '旧日'}:family-influence:${index}`,
          dayTag: typeof entry.dayTag === 'string' ? entry.dayTag : '',
          focus,
          sourceResidentId: typeof entry.sourceResidentId === 'string' ? entry.sourceResidentId : '',
          sourceName: typeof entry.sourceName === 'string' ? entry.sourceName : '家族成员',
          summary: typeof entry.summary === 'string' ? entry.summary : '家族影响记录已保留。'
        }
      })
      .slice(-CHILD_TRAINING_FAMILY_INFLUENCE_LIMIT)

  const getChildTrainingFocusLabel = (focus: ChildTrainingFocus): string => {
    if (focus === 'craft') return '手作'
    if (focus === 'social') return '人情'
    if (focus === 'spirit') return '灵性'
    return '农事'
  }

  const getRandomNpcFamilyInfluenceFocus = (resident: RandomNpcLongStayEntry): ChildTrainingFocus => {
    if (resident.route === 'business' || resident.route === 'craft') return 'craft'
    if (resident.route === 'caregiving') return 'social'
    const hasMentorTie = resident.familyTies.some(tie => tie.kind === 'mentor' && resident.familyLine.metTieIds.includes(tie.id))
    if (hasMentorTie && resident.familyLine.familyBusinessStage >= 2) return 'spirit'
    return 'farm'
  }

  const getRandomNpcFamilyBusinessYield = (
    resident: RandomNpcLongStayEntry,
    stage: 1 | 2 | 3
  ): { items: Array<{ itemId: string; quantity: number }>; summary: string } => {
    const scale = stage === 1 ? 1 : stage === 2 ? 2 : 3
    if (resident.route === 'business') {
      return { items: [{ itemId: 'paper', quantity: scale + 1 }], summary: `家业账册带来纸张×${scale + 1}` }
    }
    if (resident.route === 'craft') {
      return {
        items: [
          { itemId: 'bamboo', quantity: scale + 1 },
          { itemId: 'wood', quantity: scale * 2 }
        ],
        summary: `手艺协作带来竹子×${scale + 1}、木材×${scale * 2}`
      }
    }
    if (resident.route === 'caregiving') {
      return {
        items: [
          { itemId: 'herb', quantity: scale },
          { itemId: 'wild_berry', quantity: scale }
        ],
        summary: `邻里照料带来草药×${scale}、野果×${scale}`
      }
    }
    return {
      items: [
        { itemId: 'wood', quantity: scale },
        { itemId: 'herb', quantity: 1 }
      ],
      summary: `亲友照应带来木材×${scale}、草药×1`
    }
  }

  const getRandomNpcRelationLineLabel = (kind: RandomNpcRelationLineKind): string => {
    if (kind === 'romance') return '恋爱线'
    if (kind === 'zhiji') return '知己线'
    if (kind === 'sworn') return '结拜线'
    if (kind === 'severed') return '已断缘'
    return '只做朋友'
  }

  const getRandomNpcRelationLineRequirement = (kind: RandomNpcRelationLineStartKind) => {
    if (kind === 'romance') return { affinity: 85, signal: 'ambiguity' as const, signalValue: 8 }
    if (kind === 'zhiji') return { affinity: 85, signal: 'trust' as const, signalValue: 10 }
    if (kind === 'sworn') return { affinity: 80, signal: 'family_impression' as const, signalValue: 6 }
    return { affinity: 70, signal: 'trust' as const, signalValue: 5 }
  }

  const createDefaultRandomNpcRelationLineState = (): RandomNpcRelationLineState => ({
    kind: 'friend',
    stage: 0,
    commitmentStatus: 'none',
    commitmentDayTag: '',
    marriedDayTag: '',
    homeLifeNote: '尚未形成婚约或婚后日常。',
    startedDayTag: '',
    updatedDayTag: '',
    note: '尚未选择长期关系线。',
    history: []
  })

  const sanitizeRandomNpcRelationLineState = (raw: unknown): RandomNpcRelationLineState => {
    const source = raw && typeof raw === 'object' ? raw as Partial<RandomNpcRelationLineState> : {}
    const kind: RandomNpcRelationLineKind =
      source.kind === 'romance' || source.kind === 'zhiji' || source.kind === 'sworn' || source.kind === 'severed'
        ? source.kind
        : 'friend'
    const rawStage = Number(source.stage)
    const stage: 0 | 1 | 2 | 3 = rawStage === 1 || rawStage === 2 || rawStage === 3 ? rawStage : 0
    const commitmentStatus: RandomNpcCommitmentStatus =
      source.commitmentStatus === 'engaged' || source.commitmentStatus === 'married'
        ? source.commitmentStatus
        : 'none'
    const effectiveCommitmentStatus: RandomNpcCommitmentStatus =
      kind === 'romance' && stage > 0 ? commitmentStatus : 'none'
    return {
      kind,
      stage: kind === 'severed' ? 0 : (effectiveCommitmentStatus === 'married' ? 3 : effectiveCommitmentStatus === 'engaged' ? Math.max(stage, 2) as 2 | 3 : stage),
      commitmentStatus: kind === 'severed' ? 'none' : effectiveCommitmentStatus,
      commitmentDayTag: typeof source.commitmentDayTag === 'string' ? source.commitmentDayTag : '',
      marriedDayTag: typeof source.marriedDayTag === 'string' ? source.marriedDayTag : '',
      homeLifeNote: typeof source.homeLifeNote === 'string' ? source.homeLifeNote : createDefaultRandomNpcRelationLineState().homeLifeNote,
      startedDayTag: typeof source.startedDayTag === 'string' ? source.startedDayTag : '',
      updatedDayTag: typeof source.updatedDayTag === 'string' ? source.updatedDayTag : '',
      note: typeof source.note === 'string' ? source.note : createDefaultRandomNpcRelationLineState().note,
      history: (Array.isArray(source.history) ? source.history : [])
        .filter((entry: unknown): entry is Partial<RandomNpcRelationLineState['history'][number]> => !!entry && typeof entry === 'object')
        .map((entry, index) => {
          const eventKind: RandomNpcRelationLineKind =
            entry.kind === 'romance' || entry.kind === 'zhiji' || entry.kind === 'sworn' || entry.kind === 'severed'
              ? entry.kind
              : 'friend'
          return {
            id: typeof entry.id === 'string' ? entry.id : `${entry.dayTag ?? '旧日'}:${eventKind}:${index}`,
            dayTag: typeof entry.dayTag === 'string' ? entry.dayTag : '',
            kind: eventKind,
            action: entry.action === 'sever' || entry.action === 'engage' || entry.action === 'marry' || entry.action === 'home'
              ? entry.action
              : 'start' as const,
            summary: typeof entry.summary === 'string' ? entry.summary : getRandomNpcRelationLineLabel(eventKind)
          }
        })
        .slice(-RANDOM_NPC_RELATION_LINE_HISTORY_LIMIT)
    }
  }

  const appendRandomNpcRelationLineHistory = (
    line: RandomNpcRelationLineState,
    event: RandomNpcRelationLineState['history'][number]
  ): RandomNpcRelationLineState['history'] => [...line.history, event].slice(-RANDOM_NPC_RELATION_LINE_HISTORY_LIMIT)

  const createDefaultRandomNpcShortRomanceState = (): RandomNpcShortRomanceState => ({
    status: 'none',
    startedDayTag: '',
    updatedDayTag: '',
    note: '尚未开启短线暧昧邀约。',
    history: []
  })

  const sanitizeRandomNpcShortRomanceState = (raw: unknown): RandomNpcShortRomanceState => {
    const source = raw && typeof raw === 'object' ? raw as Partial<RandomNpcShortRomanceState> : {}
    const status: RandomNpcShortRomanceState['status'] =
      source.status === 'invited' || source.status === 'ended' ? source.status : 'none'
    return {
      status,
      startedDayTag: typeof source.startedDayTag === 'string' ? source.startedDayTag : '',
      updatedDayTag: typeof source.updatedDayTag === 'string' ? source.updatedDayTag : '',
      note: typeof source.note === 'string' ? source.note : createDefaultRandomNpcShortRomanceState().note,
      history: (Array.isArray(source.history) ? source.history : [])
        .filter((entry: unknown): entry is Partial<RandomNpcShortRomanceState['history'][number]> => !!entry && typeof entry === 'object')
        .map((entry, index) => {
          const action = entry.action === 'end' ? 'end' as const : 'invite' as const
          return {
            id: typeof entry.id === 'string' ? entry.id : `${entry.dayTag ?? 'old-day'}:${action}:${index}`,
            dayTag: typeof entry.dayTag === 'string' ? entry.dayTag : '',
            action,
            summary: typeof entry.summary === 'string' ? entry.summary : (action === 'end' ? '短线暧昧已经收束。' : '短线暧昧邀约已经记录。')
          }
        })
        .slice(-RANDOM_NPC_SHORT_ROMANCE_HISTORY_LIMIT)
    }
  }

  const appendRandomNpcShortRomanceHistory = (
    line: RandomNpcShortRomanceState,
    event: RandomNpcShortRomanceState['history'][number]
  ): RandomNpcShortRomanceState['history'] => [...line.history, event].slice(-RANDOM_NPC_SHORT_ROMANCE_HISTORY_LIMIT)

  const getRandomNpcRelationLineNote = (kind: RandomNpcRelationLineStartKind, name: string): string => {
    if (kind === 'romance') return `${name}与你确认了恋爱方向，后续只推进这一条亲密线。`
    if (kind === 'zhiji') return `${name}与你约为知己，默认不再进入婚恋线。`
    if (kind === 'sworn') return `${name}与你结拜为义亲，后续按家族 / 义亲方向记录。`
    return `${name}与你约定只做朋友，保留邻里和深交方向。`
  }

  const getRandomNpcRelationLineSignalReady = (
    resident: RandomNpcLongStayEntry,
    kind: RandomNpcRelationLineStartKind
  ): boolean => {
    const requirement = getRandomNpcRelationLineRequirement(kind)
    const signals = sanitizeRandomNpcRelationshipSignals(resident.relationshipSignals)
    if (kind === 'romance' && resident.relationshipTag === 'ambiguous') return true
    return (signals[requirement.signal] ?? 0) >= requirement.signalValue
  }

  const getActiveRandomNpcExclusiveLine = (excludeResidentId?: string) =>
    randomNpcBoard.value.longStayResidents.find(resident =>
      resident.residentId !== excludeResidentId &&
      (resident.relationshipLine?.kind === 'romance' || resident.relationshipLine?.kind === 'zhiji')
    ) ?? null

  const createRandomNpcVisitor = (templateId: string, weekId: string, index: number): RandomNpcVisitorState | null => {
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === templateId)
    if (!template) return null
    const name = pickBySeed(template.nameSeeds, `${weekId}:${template.id}:name:${index}`)
    const dayTag = getCurrentNpcDayTag()
    return {
      id: `${weekId}:${template.id}`,
      templateId: template.id,
      name,
      ageBand: template.ageBand,
      gender: template.gender,
      occupation: template.occupation,
      origin: template.origin,
      personalityTags: [...template.personalityTags],
      speechStyle: template.speechStyle,
      appearanceKeywords: [...template.appearanceKeywords],
      taboo: template.taboo,
      lifeGoal: template.lifeGoal,
      currentTrouble: template.currentTrouble,
      villagePurpose: template.villagePurpose,
      romanceView: template.romanceView,
      developmentRoutes: [...template.developmentRoutes],
      plotHook: template.plotHook,
      familySeed: template.familySeed,
      preferences: {
        loved: [...template.preferences.loved],
        liked: [...template.preferences.liked],
        disliked: [...template.preferences.disliked]
      },
      dialogueOpening: template.dialogueOpening,
      dialogueChoices: template.dialogueChoices.map(choice => ({ ...choice })),
      dialogueScenes: sanitizeRandomNpcDialogueScenes(template.dialogueScenes),
      smallOrder: {
        ...template.smallOrder,
        requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
      },
      smallOrderCompleted: false,
      locked: false,
      relationshipTag: 'passing',
      affinity: 0,
      firstVisitWeekId: weekId,
      lastVisitDayTag: dayTag,
      talkedToday: false,
      conversationCount: 0,
      keyEvents: [`${dayTag} 初次来访：${template.dialogueOpening}`],
      relationshipSignals: createDefaultRandomNpcRelationshipSignals(),
      dialogueMemories: [],
      shortRomance: createDefaultRandomNpcShortRomanceState(),
      tier: 'short_visit'
    }
  }

  const summarizeRandomVisitor = (visitor: RandomNpcVisitorState, reason: string): RandomNpcArchiveSummary => ({
    visitorId: visitor.id,
    templateId: visitor.templateId,
    name: visitor.name,
    occupation: visitor.occupation,
    relationshipTag: visitor.relationshipTag,
    affinity: visitor.affinity,
    lastSeenDayTag: visitor.lastVisitDayTag,
    summary: `${visitor.name}（${visitor.occupation}）${reason}；最后印象：${visitor.currentTrouble}`,
    keyEvents: visitor.keyEvents.slice(-3),
    smallOrderCompleted: !!visitor.smallOrderCompleted,
    locked: !!visitor.locked,
    relationshipSignals: sanitizeRandomNpcRelationshipSignals(visitor.relationshipSignals),
    dialogueMemories: visitor.dialogueMemories.slice(-3),
    shortRomance: sanitizeRandomNpcShortRomanceState(visitor.shortRomance)
  })

  const createRandomNpcVisitorFromArchive = (archive: RandomNpcArchiveSummary): RandomNpcVisitorState | null => {
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === archive.templateId)
    if (!template) return null
    const dayTag = getCurrentNpcDayTag()
    return {
      id: archive.visitorId,
      templateId: template.id,
      name: archive.name || template.nameSeeds[0]!,
      ageBand: template.ageBand,
      gender: template.gender,
      occupation: template.occupation,
      origin: template.origin,
      personalityTags: [...template.personalityTags],
      speechStyle: template.speechStyle,
      appearanceKeywords: [...template.appearanceKeywords],
      taboo: template.taboo,
      lifeGoal: template.lifeGoal,
      currentTrouble: template.currentTrouble,
      villagePurpose: template.villagePurpose,
      romanceView: template.romanceView,
      developmentRoutes: [...template.developmentRoutes],
      plotHook: template.plotHook,
      familySeed: template.familySeed,
      preferences: {
        loved: [...template.preferences.loved],
        liked: [...template.preferences.liked],
        disliked: [...template.preferences.disliked]
      },
      dialogueOpening: template.dialogueOpening,
      dialogueChoices: template.dialogueChoices.map(choice => ({ ...choice })),
      dialogueScenes: sanitizeRandomNpcDialogueScenes(template.dialogueScenes),
      smallOrder: {
        ...template.smallOrder,
        requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
      },
      smallOrderCompleted: !!archive.smallOrderCompleted,
      locked: !!archive.locked,
      relationshipTag: archive.relationshipTag,
      affinity: archive.affinity,
      firstVisitWeekId: archive.visitorId.split(':').slice(0, -1).join(':') || randomNpcBoard.value.lastGeneratedWeekId,
      lastVisitDayTag: dayTag,
      talkedToday: false,
      conversationCount: 0,
      keyEvents: [...archive.keyEvents, `${dayTag} 从旧日来客摘要召回，再次来到桃源村。`].slice(-6),
      relationshipSignals: sanitizeRandomNpcRelationshipSignals(archive.relationshipSignals),
      dialogueMemories: sanitizeRandomNpcDialogueMemories(archive.dialogueMemories),
      shortRomance: sanitizeRandomNpcShortRomanceState(archive.shortRomance),
      tier: 'short_visit'
    }
  }

  const createRandomNpcLongStayResidentFromArchive = (archive: RandomNpcArchiveSummary): RandomNpcLongStayEntry | null => {
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === archive.templateId)
    if (!template || archive.archivedTier !== 'long_stay') return null
    const dayTag = getCurrentNpcDayTag()
    const snapshot = sanitizeRandomNpcLongStayArchiveSnapshot(archive.longStaySnapshot, template, archive.visitorId)
    if (!snapshot) return null
    const familyTies = sanitizeRandomNpcFamilyTies(snapshot.familyTies, template.familyTies)
    return {
      residentId: snapshot.residentId || `resident:${archive.visitorId}`,
      sourceVisitorId: archive.visitorId,
      templateId: template.id,
      name: archive.name || template.nameSeeds[0]!,
      ageBand: template.ageBand,
      gender: template.gender,
      occupation: template.occupation,
      origin: template.origin,
      personalityTags: [...template.personalityTags],
      speechStyle: template.speechStyle,
      appearanceKeywords: [...template.appearanceKeywords],
      taboo: template.taboo,
      lifeGoal: template.lifeGoal,
      currentTrouble: template.currentTrouble,
      villagePurpose: template.villagePurpose,
      romanceView: template.romanceView,
      developmentRoutes: [...template.developmentRoutes],
      plotHook: template.plotHook,
      familySeed: template.familySeed,
      familyTies,
      familyLine: sanitizeRandomNpcFamilyLineState(snapshot.familyLine, familyTies, template.familyCommission),
      preferences: {
        loved: [...template.preferences.loved],
        liked: [...template.preferences.liked],
        disliked: [...template.preferences.disliked]
      },
      dialogueScenes: sanitizeRandomNpcDialogueScenes(template.dialogueScenes),
      smallOrder: {
        ...template.smallOrder,
        requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
      },
      smallOrderCompleted: !!archive.smallOrderCompleted,
      relationshipTag: archive.relationshipTag,
      affinity: archive.affinity,
      movedInDayTag: snapshot.movedInDayTag,
      residenceReason: snapshot.residenceReason || `${archive.name}从旧日长住摘要召回，继续在桃源村暂住。`,
      route: snapshot.route,
      relationshipEventStage: snapshot.relationshipEventStage,
      completedStoryEventIds: snapshot.completedStoryEventIds.slice(-6),
      lastStoryDayTag: dayTag,
      keyEvents: [...archive.keyEvents, `${dayTag} 从旧日长住摘要召回，恢复长住名册。`].slice(-8),
      relationshipSignals: sanitizeRandomNpcRelationshipSignals(archive.relationshipSignals),
      dialogueMemories: sanitizeRandomNpcDialogueMemories(archive.dialogueMemories, RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT),
      relationshipLine: sanitizeRandomNpcRelationLineState(snapshot.relationshipLine)
    }
  }

  const sanitizeRandomNpcLongStayArchiveSnapshot = (
    raw: unknown,
    template: typeof RANDOM_NPC_TEMPLATES[number],
    visitorId: string
  ): RandomNpcLongStayArchiveSnapshot | undefined => {
    if (!raw || typeof raw !== 'object') return undefined
    const source = raw as Partial<RandomNpcLongStayArchiveSnapshot>
    const route: RandomNpcLongStayRoute =
      source.route === 'business' || source.route === 'caregiving' || source.route === 'craft' || source.route === 'friendship'
        ? source.route
        : getRandomNpcLongStayRoute(template.id)
    const stageValue = Number(source.relationshipEventStage)
    const relationshipEventStage: 0 | 1 | 2 | 3 =
      stageValue === 1 || stageValue === 2 || stageValue === 3 ? stageValue : 0
    const familyTies = sanitizeRandomNpcFamilyTies(source.familyTies, template.familyTies)
    return {
      residentId: typeof source.residentId === 'string' ? source.residentId : `resident:${visitorId}`,
      sourceVisitorId: visitorId,
      movedInDayTag: typeof source.movedInDayTag === 'string' ? source.movedInDayTag : '',
      residenceReason: typeof source.residenceReason === 'string' ? source.residenceReason : '',
      route,
      relationshipEventStage,
      completedStoryEventIds: Array.isArray(source.completedStoryEventIds)
        ? source.completedStoryEventIds.filter((text: unknown): text is string => typeof text === 'string').slice(-6)
        : [],
      lastStoryDayTag: typeof source.lastStoryDayTag === 'string' ? source.lastStoryDayTag : '',
      familyTies,
      familyLine: sanitizeRandomNpcFamilyLineState(source.familyLine, familyTies, template.familyCommission),
      relationshipLine: sanitizeRandomNpcRelationLineState(source.relationshipLine)
    }
  }

  const trimRandomNpcArchives = (archives: RandomNpcArchiveSummary[]) => {
    const uniqueArchives = archives.filter((archive, index, entries) =>
      entries.findIndex(entry => entry.visitorId === archive.visitorId) === index
    )
    const lockedArchives = uniqueArchives
      .filter(archive => archive.locked)
      .slice(0, RANDOM_NPC_VISITOR_CONFIG.maxLockedArchives)
    const lockedIds = new Set(lockedArchives.map(archive => archive.visitorId))
    const unlockedArchives = uniqueArchives.filter(archive => !lockedIds.has(archive.visitorId) && !archive.locked)
    return [
      ...lockedArchives,
      ...unlockedArchives.slice(0, Math.max(0, RANDOM_NPC_VISITOR_CONFIG.maxRecentSummaries - lockedArchives.length))
    ]
  }

  const trimRandomNpcAcquaintances = (acquaintances: RandomNpcAcquaintanceEntry[]) =>
    acquaintances.slice(0, RANDOM_NPC_VISITOR_CONFIG.maxAcquaintances)

  const trimRandomNpcLongStayResidents = (residents: RandomNpcLongStayEntry[]) =>
    residents.slice(0, RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents)

  const summarizeRandomNpcAcquaintance = (
    acquaintance: RandomNpcAcquaintanceEntry,
    currentDayTag: string,
    inactiveDays: number
  ): RandomNpcArchiveSummary => ({
    visitorId: acquaintance.visitorId,
    templateId: acquaintance.templateId,
    name: acquaintance.name,
    occupation: acquaintance.occupation,
    relationshipTag: acquaintance.relationshipTag === 'passing' ? 'acquaintance' : acquaintance.relationshipTag,
    affinity: acquaintance.affinity,
    lastSeenDayTag: acquaintance.lastSeenDayTag,
    summary: `${acquaintance.name}久未往来，已从熟人册冷归档为旧日熟人摘要，之后可从旧日摘要召回。`,
    keyEvents: [
      ...acquaintance.keyEvents,
      `${currentDayTag} 久未互动 ${inactiveDays} 天，冷归档为旧日熟人摘要。`
    ].slice(-3),
    smallOrderCompleted: !!acquaintance.smallOrderCompleted,
    locked: false,
    relationshipSignals: sanitizeRandomNpcRelationshipSignals(acquaintance.relationshipSignals),
    dialogueMemories: acquaintance.dialogueMemories.slice(-3),
    shortRomance: sanitizeRandomNpcShortRomanceState(acquaintance.shortRomance)
  })

  const getRandomNpcLongStayLastTouchedDayTag = (resident: RandomNpcLongStayEntry): string => {
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, RANDOM_NPC_TEMPLATES.find(template => template.id === resident.templateId)?.familyCommission ?? RANDOM_NPC_TEMPLATES[0]!.familyCommission)
    const lastFamilyReview = familyLine.reviewHistory[familyLine.reviewHistory.length - 1]
    const lastFamilyBusiness = familyLine.familyBusinessHistory[familyLine.familyBusinessHistory.length - 1]
    return [
      resident.lastStoryDayTag,
      sanitizeRandomNpcRelationLineState(resident.relationshipLine).updatedDayTag,
      lastFamilyReview?.dayTag,
      lastFamilyBusiness?.dayTag,
      resident.movedInDayTag
    ].find(dayTag => typeof dayTag === 'string' && dayTag.length > 0) ?? ''
  }

  const canArchiveRandomNpcLongStayResident = (resident: RandomNpcLongStayEntry, currentDayTag: string): boolean => {
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return false
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission)
    const relationshipLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    const inactiveDays = getRandomNpcInactiveDays(getRandomNpcLongStayLastTouchedDayTag(resident), currentDayTag)
    return (
      inactiveDays >= RANDOM_NPC_VISITOR_CONFIG.longStayColdArchiveDays &&
      resident.relationshipEventStage <= 1 &&
      familyLine.familyBusinessStage === 0 &&
      familyLine.completedCommissionIds.length === 0 &&
      relationshipLine.commitmentStatus === 'none' &&
      (relationshipLine.stage === 0 || relationshipLine.kind === 'severed')
    )
  }

  const createRandomNpcLongStayArchiveSnapshot = (resident: RandomNpcLongStayEntry): RandomNpcLongStayArchiveSnapshot => {
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    return {
      residentId: resident.residentId,
      sourceVisitorId: resident.sourceVisitorId,
      movedInDayTag: resident.movedInDayTag,
      residenceReason: resident.residenceReason,
      route: resident.route,
      relationshipEventStage: resident.relationshipEventStage,
      completedStoryEventIds: resident.completedStoryEventIds.slice(-6),
      lastStoryDayTag: resident.lastStoryDayTag,
      familyTies: sanitizeRandomNpcFamilyTies(resident.familyTies, template?.familyTies ?? []),
      familyLine: sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template?.familyCommission ?? RANDOM_NPC_TEMPLATES[0]!.familyCommission),
      relationshipLine: sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    }
  }

  const summarizeRandomNpcLongStayResident = (
    resident: RandomNpcLongStayEntry,
    currentDayTag: string,
    inactiveDays: number
  ): RandomNpcArchiveSummary => ({
    visitorId: resident.sourceVisitorId,
    templateId: resident.templateId,
    name: resident.name,
    occupation: resident.occupation,
    relationshipTag: resident.relationshipTag === 'passing' ? 'acquaintance' : resident.relationshipTag,
    affinity: resident.affinity,
    lastSeenDayTag: getRandomNpcLongStayLastTouchedDayTag(resident) || resident.movedInDayTag,
    summary: `${resident.name}长期未推进长住事件，已冷归档为旧日长住摘要；之后可在长住名额空余时召回。`,
    keyEvents: [
      ...resident.keyEvents,
      `${currentDayTag} 长住低活跃 ${inactiveDays} 天，冷归档为旧日长住摘要。`
    ].slice(-3),
    smallOrderCompleted: !!resident.smallOrderCompleted,
    locked: false,
    relationshipSignals: sanitizeRandomNpcRelationshipSignals(resident.relationshipSignals),
    dialogueMemories: resident.dialogueMemories.slice(-3),
    archivedTier: 'long_stay',
    longStaySnapshot: createRandomNpcLongStayArchiveSnapshot(resident)
  })

  const archiveStaleRandomNpcLongStayResidents = (currentDayTag: string): RandomNpcArchiveSummary[] => {
    const staleArchives: RandomNpcArchiveSummary[] = []
    const keptResidents: RandomNpcLongStayEntry[] = []

    for (const resident of randomNpcBoard.value.longStayResidents) {
      const inactiveDays = getRandomNpcInactiveDays(getRandomNpcLongStayLastTouchedDayTag(resident), currentDayTag)
      if (canArchiveRandomNpcLongStayResident(resident, currentDayTag)) {
        staleArchives.push(summarizeRandomNpcLongStayResident(resident, currentDayTag, inactiveDays))
      } else {
        keptResidents.push(resident)
      }
    }

    if (staleArchives.length === 0) return []

    randomNpcBoard.value.longStayResidents = trimRandomNpcLongStayResidents(keptResidents)
    randomNpcBoard.value.recentSummaries = trimRandomNpcArchives([
      ...staleArchives,
      ...randomNpcBoard.value.recentSummaries
    ])
    return staleArchives
  }

  const archiveStaleRandomNpcAcquaintances = (currentDayTag: string): RandomNpcArchiveSummary[] => {
    const activeVisitorIds = new Set(randomNpcBoard.value.activeVisitors.map(visitor => visitor.id))
    const longStayVisitorIds = new Set(randomNpcBoard.value.longStayResidents.map(resident => resident.sourceVisitorId))
    const staleArchives: RandomNpcArchiveSummary[] = []
    const keptAcquaintances: RandomNpcAcquaintanceEntry[] = []

    for (const acquaintance of randomNpcBoard.value.acquaintances) {
      const inactiveDays = getRandomNpcInactiveDays(acquaintance.lastSeenDayTag, currentDayTag)
      const shortRomance = sanitizeRandomNpcShortRomanceState(acquaintance.shortRomance)
      const shouldArchive =
        inactiveDays >= RANDOM_NPC_VISITOR_CONFIG.acquaintanceColdArchiveDays &&
        acquaintance.affinity < RANDOM_NPC_VISITOR_CONFIG.longStayAffinityThreshold &&
        shortRomance.status !== 'invited' &&
        !activeVisitorIds.has(acquaintance.visitorId) &&
        !longStayVisitorIds.has(acquaintance.visitorId)

      if (shouldArchive) {
        staleArchives.push(summarizeRandomNpcAcquaintance(acquaintance, currentDayTag, inactiveDays))
      } else {
        keptAcquaintances.push(acquaintance)
      }
    }

    if (staleArchives.length === 0) return []

    randomNpcBoard.value.acquaintances = trimRandomNpcAcquaintances(keptAcquaintances)
    randomNpcBoard.value.acquaintanceIds = randomNpcBoard.value.acquaintanceIds.filter(id =>
      keptAcquaintances.some(acquaintance => acquaintance.visitorId === id) ||
      activeVisitorIds.has(id)
    )
    randomNpcBoard.value.recentSummaries = trimRandomNpcArchives([
      ...staleArchives,
      ...randomNpcBoard.value.recentSummaries
    ])
    return staleArchives
  }

  const getRandomNpcLongStayRoute = (templateId: string): RandomNpcLongStayRoute => {
    if (templateId.includes('tea') || templateId.includes('scholar')) return 'business'
    if (templateId.includes('pet')) return 'caregiving'
    if (templateId.includes('lantern')) return 'craft'
    return 'friendship'
  }

  const createRandomNpcAcquaintanceEntry = (visitor: RandomNpcVisitorState): RandomNpcAcquaintanceEntry => ({
    visitorId: visitor.id,
    templateId: visitor.templateId,
    name: visitor.name,
    ageBand: visitor.ageBand,
    gender: visitor.gender,
    occupation: visitor.occupation,
    origin: visitor.origin,
    personalityTags: [...visitor.personalityTags],
    appearanceKeywords: [...visitor.appearanceKeywords],
    villagePurpose: visitor.villagePurpose,
    romanceView: visitor.romanceView,
    developmentRoutes: [...visitor.developmentRoutes],
    plotHook: visitor.plotHook,
    familySeed: visitor.familySeed,
    preferences: {
      loved: [...visitor.preferences.loved],
      liked: [...visitor.preferences.liked],
      disliked: [...visitor.preferences.disliked]
    },
    dialogueScenes: sanitizeRandomNpcDialogueScenes(visitor.dialogueScenes),
    smallOrder: {
      ...visitor.smallOrder,
      requestedItems: visitor.smallOrder.requestedItems.map(item => ({ ...item }))
    },
    smallOrderCompleted: !!visitor.smallOrderCompleted,
    relationshipTag: visitor.relationshipTag,
    affinity: visitor.affinity,
    firstMetWeekId: visitor.firstVisitWeekId,
    firstMetDayTag: visitor.keyEvents[0]?.split(' ')[0] ?? visitor.lastVisitDayTag,
    lastSeenDayTag: visitor.lastVisitDayTag,
    conversationCount: visitor.conversationCount,
    keyEvents: visitor.keyEvents.slice(-6),
    relationshipSignals: sanitizeRandomNpcRelationshipSignals(visitor.relationshipSignals),
    dialogueMemories: visitor.dialogueMemories.slice(-6),
    shortRomance: sanitizeRandomNpcShortRomanceState(visitor.shortRomance)
  })

  const createRandomNpcLongStayEntry = (acquaintance: RandomNpcAcquaintanceEntry): RandomNpcLongStayEntry | null => {
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === acquaintance.templateId)
    if (!template) return null
    const dayTag = getCurrentNpcDayTag()
    return {
      residentId: `resident:${acquaintance.visitorId}`,
      sourceVisitorId: acquaintance.visitorId,
      templateId: template.id,
      name: acquaintance.name,
      ageBand: template.ageBand,
      gender: template.gender,
      occupation: template.occupation,
      origin: template.origin,
      personalityTags: [...template.personalityTags],
      speechStyle: template.speechStyle,
      appearanceKeywords: [...template.appearanceKeywords],
      taboo: template.taboo,
      lifeGoal: template.lifeGoal,
      currentTrouble: template.currentTrouble,
      villagePurpose: template.villagePurpose,
      romanceView: template.romanceView,
      developmentRoutes: [...template.developmentRoutes],
      plotHook: template.plotHook,
      familySeed: template.familySeed,
      familyTies: sanitizeRandomNpcFamilyTies(template.familyTies),
      familyLine: createDefaultRandomNpcFamilyLineState(),
      preferences: {
        loved: [...template.preferences.loved],
        liked: [...template.preferences.liked],
        disliked: [...template.preferences.disliked]
      },
      dialogueScenes: sanitizeRandomNpcDialogueScenes(acquaintance.dialogueScenes, template.dialogueScenes),
      smallOrder: {
        ...template.smallOrder,
        requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
      },
      smallOrderCompleted: !!acquaintance.smallOrderCompleted,
      relationshipTag: acquaintance.relationshipTag === 'passing' ? 'acquaintance' : acquaintance.relationshipTag,
      affinity: acquaintance.affinity,
      movedInDayTag: dayTag,
      residenceReason: `${acquaintance.name}决定在桃源村暂住，继续追索“${template.lifeGoal}”。`,
      route: getRandomNpcLongStayRoute(template.id),
      relationshipEventStage: 1,
      completedStoryEventIds: [],
      lastStoryDayTag: '',
      keyEvents: [
        ...acquaintance.keyEvents,
        ...(sanitizeRandomNpcShortRomanceState(acquaintance.shortRomance).status === 'invited'
          ? [`${dayTag} 短线暧昧转入长住观察；正式恋爱 / 知己 / 结拜仍需重新选择关系线。`]
          : []),
        `${dayTag} 成为长住 NPC，暂住桃源村。`
      ].slice(-8),
      relationshipSignals: sanitizeRandomNpcRelationshipSignals(acquaintance.relationshipSignals),
      dialogueMemories: acquaintance.dialogueMemories.slice(-8),
      relationshipLine: createDefaultRandomNpcRelationLineState()
    }
  }

  const upsertRandomNpcAcquaintance = (visitor: RandomNpcVisitorState): boolean => {
    const existingIndex = randomNpcBoard.value.acquaintances.findIndex(entry => entry.visitorId === visitor.id)
    if (existingIndex < 0 && randomNpcBoard.value.acquaintances.length >= RANDOM_NPC_VISITOR_CONFIG.maxAcquaintances) return false
    const nextEntry = createRandomNpcAcquaintanceEntry(visitor)
    const others = randomNpcBoard.value.acquaintances.filter(entry => entry.visitorId !== visitor.id)
    randomNpcBoard.value.acquaintances = trimRandomNpcAcquaintances([nextEntry, ...others])
    return true
  }

  const ensureRandomVisitorsForCurrentWeek = () => {
    const gameStore = useGameStore()
    const weekInfo = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
    const weekId = weekInfo.seasonWeekId
    if (randomNpcBoard.value.lastGeneratedWeekId === weekId && randomNpcBoard.value.activeVisitors.length > 0) return

    const outgoing = randomNpcBoard.value.activeVisitors
      .filter(visitor =>
        visitor.tier === 'short_visit' &&
        !randomNpcBoard.value.acquaintanceIds.includes(visitor.id) &&
        !randomNpcBoard.value.acquaintances.some(entry => entry.visitorId === visitor.id)
      )
      .map(visitor => summarizeRandomVisitor(visitor, '短暂停留后离开桃源村'))
    const currentDayTag = getCurrentNpcDayTag()
    archiveStaleRandomNpcAcquaintances(currentDayTag)
    archiveStaleRandomNpcLongStayResidents(currentDayTag)
    const count = 1 + (hashText(`${weekId}:visitor_count`) % RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)
    const start = hashText(`${weekId}:visitor_start`) % RANDOM_NPC_TEMPLATES.length
    const pickedTemplateIds: string[] = []
    for (let i = 0; i < RANDOM_NPC_TEMPLATES.length && pickedTemplateIds.length < count; i++) {
      pickedTemplateIds.push(RANDOM_NPC_TEMPLATES[(start + i) % RANDOM_NPC_TEMPLATES.length]!.id)
    }

    randomNpcBoard.value = {
      ...randomNpcBoard.value,
      lastGeneratedWeekId: weekId,
      activeVisitors: pickedTemplateIds
        .map((templateId, index) => createRandomNpcVisitor(templateId, weekId, index))
        .filter((visitor): visitor is RandomNpcVisitorState => Boolean(visitor)),
      recentSummaries: trimRandomNpcArchives([...outgoing, ...randomNpcBoard.value.recentSummaries])
    }
  }

  const getRandomNpcBoard = () => {
    ensureRandomVisitorsForCurrentWeek()
    return randomNpcBoard.value
  }

  const getRandomNpcLockedArchiveIds = () => {
    const lockedIds = new Set<string>()
    randomNpcBoard.value.activeVisitors.forEach(visitor => {
      if (visitor.locked) lockedIds.add(visitor.id)
    })
    randomNpcBoard.value.recentSummaries.forEach(summary => {
      if (summary.locked) lockedIds.add(summary.visitorId)
    })
    return lockedIds
  }

  const setRandomNpcLock = (visitorId: string, locked: boolean): { success: boolean; message: string } => {
    ensureRandomVisitorsForCurrentWeek()
    const visitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    const archive = randomNpcBoard.value.recentSummaries.find(entry => entry.visitorId === visitorId)
    const targetName = visitor?.name ?? archive?.name
    if (!targetName) return { success: false, message: '没有找到这位随机来客。' }

    const currentlyLocked = !!visitor?.locked || !!archive?.locked
    if (locked && !currentlyLocked) {
      const lockedIds = getRandomNpcLockedArchiveIds()
      if (lockedIds.size >= RANDOM_NPC_VISITOR_CONFIG.maxLockedArchives) {
        return { success: false, message: `锁定名额已满（${RANDOM_NPC_VISITOR_CONFIG.maxLockedArchives}人），请先取消一位旧日来客。` }
      }
    }

    const dayTag = getCurrentNpcDayTag()
    const eventLine = locked ? `${dayTag} 锁定为关注来客。` : `${dayTag} 取消关注锁定。`
    if (visitor) {
      visitor.locked = locked
      visitor.keyEvents = [...visitor.keyEvents, eventLine].slice(-6)
    }

    const updatedArchives = randomNpcBoard.value.recentSummaries.map(summary =>
      summary.visitorId === visitorId
        ? {
            ...summary,
            locked,
            keyEvents: [...summary.keyEvents, eventLine].slice(-3)
          }
        : summary
    )
    randomNpcBoard.value.recentSummaries = trimRandomNpcArchives(
      visitor && locked && !updatedArchives.some(summary => summary.visitorId === visitor.id)
        ? [summarizeRandomVisitor(visitor, '已被锁定为关注来客'), ...updatedArchives]
        : updatedArchives
    )

    return { success: true, message: locked ? `${targetName}已锁定为关注来客。` : `${targetName}已取消锁定。` }
  }

  const recallRandomNpcArchive = (visitorId: string): { success: boolean; message: string; visitor?: RandomNpcVisitorState } => {
    ensureRandomVisitorsForCurrentWeek()
    const archive = randomNpcBoard.value.recentSummaries.find(entry => entry.visitorId === visitorId)
    if (!archive) return { success: false, message: '旧日来客摘要里没有这位 NPC。' }
    const existingVisitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    if (existingVisitor) return { success: false, message: `${existingVisitor.name}已经在本周来访名单中。`, visitor: existingVisitor }
    if (randomNpcBoard.value.acquaintances.some(entry => entry.visitorId === visitorId)) {
      return { success: false, message: `${archive.name}已经在熟人册中，暂时不需要召回短访。` }
    }
    if (randomNpcBoard.value.longStayResidents.some(entry => entry.sourceVisitorId === visitorId)) {
      return { success: false, message: `${archive.name}已经在桃源村长住。` }
    }
    if (archive.archivedTier === 'long_stay') {
      if (randomNpcBoard.value.longStayResidents.length >= RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents) {
        return { success: false, message: `长住名额已满（${RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents}人），请先整理长住名册再召回。` }
      }
      const resident = createRandomNpcLongStayResidentFromArchive(archive)
      if (!resident) return { success: false, message: '这位旧日长住的归档信息已不可用，暂时不能召回。' }
      randomNpcBoard.value.longStayResidents = trimRandomNpcLongStayResidents([
        resident,
        ...randomNpcBoard.value.longStayResidents
      ])
      randomNpcBoard.value.recentSummaries = trimRandomNpcArchives(
        randomNpcBoard.value.recentSummaries.filter(entry => entry.visitorId !== visitorId)
      )
      return { success: true, message: `${resident.name}已从旧日长住摘要召回。` }
    }
    if (randomNpcBoard.value.activeVisitors.length >= RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors) {
      return { success: false, message: `本周来访位置已满（${RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors}人），请下周再召回。` }
    }

    const visitor = createRandomNpcVisitorFromArchive(archive)
    if (!visitor) return { success: false, message: '这位旧日来客的模板已经不可用，暂时不能召回。' }
    randomNpcBoard.value.activeVisitors = [visitor, ...randomNpcBoard.value.activeVisitors].slice(0, RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)
    randomNpcBoard.value.recentSummaries = trimRandomNpcArchives([
      {
        ...archive,
        affinity: visitor.affinity,
        lastSeenDayTag: visitor.lastVisitDayTag,
        summary: `${archive.name}已被召回到本周来访名单，等待重新熟悉。`,
        keyEvents: visitor.keyEvents.slice(-3),
        smallOrderCompleted: !!visitor.smallOrderCompleted,
        locked: !!visitor.locked,
        relationshipSignals: sanitizeRandomNpcRelationshipSignals(visitor.relationshipSignals),
        dialogueMemories: visitor.dialogueMemories.slice(-3),
        shortRomance: sanitizeRandomNpcShortRomanceState(visitor.shortRomance)
      },
      ...randomNpcBoard.value.recentSummaries.filter(entry => entry.visitorId !== visitorId)
    ])
    return { success: true, message: `${visitor.name}已从旧日来客摘要召回。`, visitor }
  }

  const getRandomNpcSmallOrderMissingItems = (order: { requestedItems: Array<{ itemId: string; quantity: number }> }) => {
    const inventoryStore = useInventoryStore()
    return order.requestedItems
      .map(item => ({
        ...item,
        owned: inventoryStore.getTotalItemCount(item.itemId)
      }))
      .filter(item => item.owned < item.quantity)
  }

  const getRandomNpcShortRomanceTarget = (visitorId: string) => {
    const visitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    const acquaintance = randomNpcBoard.value.acquaintances.find(entry => entry.visitorId === visitorId)
    return visitor ?? acquaintance ?? null
  }

  const canStartRandomNpcShortRomance = (visitorId: string): { success: boolean; message: string } => {
    ensureRandomVisitorsForCurrentWeek()
    const target = getRandomNpcShortRomanceTarget(visitorId)
    if (!target) return { success: false, message: '这位随机 NPC 暂时不在短访或熟人名册中。' }
    if (randomNpcBoard.value.longStayResidents.some(entry => entry.sourceVisitorId === visitorId)) {
      return { success: false, message: `${target.name}已经进入长住名册，请使用正式关系线。` }
    }
    const shortRomance = sanitizeRandomNpcShortRomanceState(target.shortRomance)
    if (shortRomance.status === 'invited') return { success: false, message: '短线暧昧邀约已经开启。' }
    if (shortRomance.status === 'ended') return { success: false, message: '这段短线暧昧已经收束，本版不重复开启。' }
    if (target.affinity < RANDOM_NPC_SHORT_ROMANCE_AFFINITY_REQUIREMENT) {
      return { success: false, message: `好感不足，需要 ${RANDOM_NPC_SHORT_ROMANCE_AFFINITY_REQUIREMENT}。` }
    }
    const signals = sanitizeRandomNpcRelationshipSignals(target.relationshipSignals)
    if (target.relationshipTag !== 'ambiguous' && signals.ambiguity < RANDOM_NPC_SHORT_ROMANCE_AMBIGUITY_REQUIREMENT) {
      return { success: false, message: `暧昧方向不足，需要 ${RANDOM_NPC_SHORT_ROMANCE_AMBIGUITY_REQUIREMENT}。` }
    }
    const fixedCompanion = npcStates.value.find(state => state.married || state.dating || state.zhiji)
    if (fixedCompanion) return { success: false, message: '已有固定 NPC 婚恋或知己关系，不能开启随机 NPC 短线恋爱。' }
    const activeLongStayLine = getActiveRandomNpcExclusiveLine()
    if (activeLongStayLine) {
      return { success: false, message: `${activeLongStayLine.name}已经在${getRandomNpcRelationLineLabel(activeLongStayLine.relationshipLine.kind)}中。` }
    }
    const activeShortRomance =
      randomNpcBoard.value.activeVisitors.find(entry =>
        entry.id !== visitorId && sanitizeRandomNpcShortRomanceState(entry.shortRomance).status === 'invited'
      ) ??
      randomNpcBoard.value.acquaintances.find(entry =>
        entry.visitorId !== visitorId && sanitizeRandomNpcShortRomanceState(entry.shortRomance).status === 'invited'
      )
    if (activeShortRomance) return { success: false, message: '已有随机 NPC 短线暧昧邀约，需先收束。' }
    return { success: true, message: '可以开启短线暧昧邀约。' }
  }

  const applyRandomNpcShortRomancePatch = (
    visitorId: string,
    patch: {
      relationshipTag: RandomNpcRelationshipTag
      affinity: number
      relationshipSignals: RandomNpcRelationshipSignals
      shortRomance: RandomNpcShortRomanceState
      keyEvent: string
      dayTag: string
    }
  ) => {
    randomNpcBoard.value.activeVisitors = randomNpcBoard.value.activeVisitors.map(visitor =>
      visitor.id === visitorId
        ? {
            ...visitor,
            relationshipTag: patch.relationshipTag,
            affinity: patch.affinity,
            lastVisitDayTag: patch.dayTag,
            relationshipSignals: sanitizeRandomNpcRelationshipSignals(patch.relationshipSignals),
            shortRomance: sanitizeRandomNpcShortRomanceState(patch.shortRomance),
            keyEvents: [...visitor.keyEvents, patch.keyEvent].slice(-6)
          }
        : visitor
    )
    randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(acquaintance =>
      acquaintance.visitorId === visitorId
        ? {
            ...acquaintance,
            relationshipTag: patch.relationshipTag,
            affinity: patch.affinity,
            lastSeenDayTag: patch.dayTag,
            relationshipSignals: sanitizeRandomNpcRelationshipSignals(patch.relationshipSignals),
            shortRomance: sanitizeRandomNpcShortRomanceState(patch.shortRomance),
            keyEvents: [...acquaintance.keyEvents, patch.keyEvent].slice(-6)
          }
        : acquaintance
    )
    randomNpcBoard.value.recentSummaries = trimRandomNpcArchives(
      randomNpcBoard.value.recentSummaries.map(summary =>
        summary.visitorId === visitorId
          ? {
              ...summary,
              relationshipTag: patch.relationshipTag,
              affinity: patch.affinity,
              lastSeenDayTag: patch.dayTag,
              relationshipSignals: sanitizeRandomNpcRelationshipSignals(patch.relationshipSignals),
              shortRomance: sanitizeRandomNpcShortRomanceState(patch.shortRomance),
              keyEvents: [...summary.keyEvents, patch.keyEvent].slice(-3)
            }
          : summary
      )
    )
  }

  const startRandomNpcShortRomance = (visitorId: string): { success: boolean; message: string } => {
    const guard = canStartRandomNpcShortRomance(visitorId)
    const target = getRandomNpcShortRomanceTarget(visitorId)
    if (!guard.success || !target) return guard
    const dayTag = getCurrentNpcDayTag()
    const currentLine = sanitizeRandomNpcShortRomanceState(target.shortRomance)
    const note = `${target.name}与你约定先把这段心意留在短线相处里，不进入婚约或长住关系线。`
    const event = {
      id: `${dayTag}:${visitorId}:short-romance-invite`,
      dayTag,
      action: 'invite' as const,
      summary: note
    }
    const shortRomance: RandomNpcShortRomanceState = {
      status: 'invited',
      startedDayTag: currentLine.startedDayTag || dayTag,
      updatedDayTag: dayTag,
      note,
      history: appendRandomNpcShortRomanceHistory(currentLine, event)
    }
    const relationshipSignals = applyRandomNpcRelationshipSignal(
      sanitizeRandomNpcRelationshipSignals(target.relationshipSignals),
      'ambiguity',
      8
    )
    const affinity = Math.min(100, target.affinity + 3)
    const keyEvent = `${dayTag} 开启短线暧昧邀约：${note}`
    applyRandomNpcShortRomancePatch(visitorId, {
      relationshipTag: 'ambiguous',
      affinity,
      relationshipSignals,
      shortRomance,
      keyEvent,
      dayTag
    })
    return { success: true, message: `${target.name}已开启短线暧昧邀约。` }
  }

  const endRandomNpcShortRomance = (visitorId: string): { success: boolean; message: string } => {
    ensureRandomVisitorsForCurrentWeek()
    const target = getRandomNpcShortRomanceTarget(visitorId)
    if (!target) return { success: false, message: '这位随机 NPC 暂时不在短访或熟人名册中。' }
    const currentLine = sanitizeRandomNpcShortRomanceState(target.shortRomance)
    if (currentLine.status !== 'invited') return { success: false, message: '当前没有可收束的短线暧昧邀约。' }
    const dayTag = getCurrentNpcDayTag()
    const note = `${target.name}与你把短线暧昧收束为旧识余温，后续若长住需重新建立正式关系线。`
    const event = {
      id: `${dayTag}:${visitorId}:short-romance-end`,
      dayTag,
      action: 'end' as const,
      summary: note
    }
    const shortRomance: RandomNpcShortRomanceState = {
      status: 'ended',
      startedDayTag: currentLine.startedDayTag,
      updatedDayTag: dayTag,
      note,
      history: appendRandomNpcShortRomanceHistory(currentLine, event)
    }
    const affinity = Math.max(0, target.affinity - 5)
    const keyEvent = `${dayTag} 收束短线暧昧：${note}`
    applyRandomNpcShortRomancePatch(visitorId, {
      relationshipTag: target.relationshipTag === 'ambiguous' ? 'old_contact' : target.relationshipTag,
      affinity,
      relationshipSignals: sanitizeRandomNpcRelationshipSignals(target.relationshipSignals),
      shortRomance,
      keyEvent,
      dayTag
    })
    return { success: true, message: `${target.name}的短线暧昧已收束。` }
  }

  const fulfillRandomNpcSmallOrder = (
    visitorId: string
  ): { success: boolean; message: string; affinityChange: number } => {
    ensureRandomVisitorsForCurrentWeek()
    const visitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    const acquaintance = randomNpcBoard.value.acquaintances.find(entry => entry.visitorId === visitorId)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.sourceVisitorId === visitorId)
    const target = visitor ?? acquaintance ?? resident
    if (!target) return { success: false, message: '这位来访者暂时不在随机 NPC 名册中。', affinityChange: 0 }
    if (visitor?.smallOrderCompleted || acquaintance?.smallOrderCompleted || resident?.smallOrderCompleted) {
      return { success: false, message: `${target.name}的小订单已经交付过了。`, affinityChange: 0 }
    }

    const missingItems = getRandomNpcSmallOrderMissingItems(target.smallOrder)
    if (missingItems.length > 0) {
      const summary = missingItems
        .map(item => `${getItemById(item.itemId)?.name ?? item.itemId} ${item.owned}/${item.quantity}`)
        .join('、')
      return { success: false, message: `材料不足：${summary}。`, affinityChange: 0 }
    }

    const inventoryStore = useInventoryStore()
    for (const item of target.smallOrder.requestedItems) {
      if (!inventoryStore.removeItemAnywhere(item.itemId, item.quantity)) {
        return { success: false, message: `交付${getItemById(item.itemId)?.name ?? item.itemId}时失败，请重新确认库存。`, affinityChange: 0 }
      }
    }

    const dayTag = getCurrentNpcDayTag()
    const eventLine = `${dayTag} 完成小订单「${target.smallOrder.title}」：${target.smallOrder.rewardSummary}`
    const rewardAffinity = RANDOM_NPC_SMALL_ORDER_AFFINITY_REWARD
    if (visitor) {
      visitor.affinity = Math.min(100, visitor.affinity + rewardAffinity)
      visitor.smallOrderCompleted = true
      visitor.lastVisitDayTag = dayTag
      visitor.keyEvents = [...visitor.keyEvents, eventLine].slice(-6)
    }
    if (acquaintance) {
      acquaintance.affinity = Math.min(100, acquaintance.affinity + rewardAffinity)
      acquaintance.smallOrderCompleted = true
      acquaintance.lastSeenDayTag = dayTag
      acquaintance.keyEvents = [...acquaintance.keyEvents, eventLine].slice(-6)
    }
    if (resident) {
      resident.affinity = Math.min(100, resident.affinity + rewardAffinity)
      resident.smallOrderCompleted = true
      resident.keyEvents = [...resident.keyEvents, eventLine].slice(-8)
    }
    if (visitor && (visitor.tier === 'acquaintance' || visitor.tier === 'long_stay')) {
      upsertRandomNpcAcquaintance(visitor)
    }

    return {
      success: true,
      message: `${target.name}收下了「${target.smallOrder.title}」，${target.smallOrder.rewardSummary} 好感+${rewardAffinity}。`,
      affinityChange: rewardAffinity
    }
  }

  const talkToRandomVisitor = (
    visitorId: string,
    choiceId: string
  ): { success: boolean; message: string; affinityChange: number; visitor?: RandomNpcVisitorState } => {
    ensureRandomVisitorsForCurrentWeek()
    const visitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    if (!visitor) return { success: false, message: '这位来访者已经离开。', affinityChange: 0 }
    if (visitor.talkedToday) return { success: false, message: `${visitor.name}今天已经聊过了。`, affinityChange: 0, visitor }
    const choice = visitor.dialogueChoices.find(entry => entry.id === choiceId) ?? visitor.dialogueChoices[0]
    if (!choice) return { success: false, message: '暂时没有合适的话题。', affinityChange: 0, visitor }

    const cookingStore = useCookingStore()
    const cookingTopic = cookingStore.consumeStoryTriggerRecord(RANDOM_NPC_COOKING_TOPIC_LABELS)
    const cookingAffinityBonus = cookingTopic ? RANDOM_NPC_COOKING_TOPIC_AFFINITY_BONUS : 0
    const affinityChange = choice.affinityChange + cookingAffinityBonus
    const cookingTopicLine = cookingTopic
      ? `你顺势提起刚做的${cookingTopic.recipeName}，话题落在${cookingTopic.triggerLabels.join('、')}上。`
      : ''

    const nextRelationshipTag = choice.relationshipTag ?? visitor.relationshipTag
    const direction = choice.relationshipDirection ?? inferRandomNpcRelationshipDirection(nextRelationshipTag, choice.id, choice.text)
    const contextLine = buildRandomNpcDialogueContextLine(visitor)
    const followUpAgreementLine = buildRandomNpcFollowUpAgreementLine({
      target: visitor,
      dayTag: getCurrentNpcDayTag(),
      choiceText: choice.text,
      direction,
      affinityChange
    })
    const response = [choice.response, contextLine, cookingTopicLine, followUpAgreementLine].filter(Boolean).join(' ')
    visitor.talkedToday = true
    visitor.conversationCount += 1
    visitor.affinity = Math.max(0, Math.min(100, visitor.affinity + affinityChange))
    visitor.relationshipTag = nextRelationshipTag
    visitor.lastVisitDayTag = getCurrentNpcDayTag()
    const dialogueMemory = buildRandomNpcDialogueMemory({
      npcName: visitor.name,
      dayTag: visitor.lastVisitDayTag,
      choiceId: choice.id,
      choiceText: choice.text,
      response,
      direction,
      affinityChange,
      relationshipTag: visitor.relationshipTag
    })
    visitor.relationshipSignals = applyRandomNpcRelationshipSignal(
      sanitizeRandomNpcRelationshipSignals(visitor.relationshipSignals),
      direction,
      affinityChange
    )
    visitor.dialogueMemories = appendRandomNpcDialogueMemory(visitor.dialogueMemories, dialogueMemory)
    visitor.keyEvents = [
      ...visitor.keyEvents,
      `${visitor.lastVisitDayTag} ${choice.text}：${response}（${getRandomNpcRelationshipDirectionLabel(direction)}）${followUpAgreementLine ? ` ${RANDOM_NPC_FOLLOW_UP_EVENT_PREFIX}${followUpAgreementLine}` : ''}`
    ].slice(-6)
    if (visitor.tier === 'acquaintance' || visitor.tier === 'long_stay') {
      upsertRandomNpcAcquaintance(visitor)
    }
    if (visitor.tier === 'long_stay') {
      randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(resident =>
        resident.sourceVisitorId === visitor.id
          ? {
              ...resident,
              relationshipTag: visitor.relationshipTag,
              affinity: visitor.affinity,
              relationshipSignals: sanitizeRandomNpcRelationshipSignals(visitor.relationshipSignals),
              dialogueMemories: visitor.dialogueMemories.slice(-8),
              keyEvents: visitor.keyEvents.slice(-8)
            }
          : resident
      )
    }

    return {
      success: true,
      message: response,
      affinityChange,
      visitor
    }
  }

  const addRandomVisitorToAcquaintanceBook = (visitorId: string): { success: boolean; message: string } => {
    ensureRandomVisitorsForCurrentWeek()
    const visitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    if (!visitor) return { success: false, message: '这位来访者已经离开。' }
    if (visitor.tier === 'long_stay') return { success: false, message: `${visitor.name}已经在桃源村暂住。` }
    if (visitor.affinity < RANDOM_NPC_VISITOR_CONFIG.acquaintanceAffinityThreshold) {
      return { success: false, message: `还需要再熟悉一些（需要好感 ${RANDOM_NPC_VISITOR_CONFIG.acquaintanceAffinityThreshold}）。` }
    }
    if (
      !randomNpcBoard.value.acquaintances.some(entry => entry.visitorId === visitor.id) &&
      randomNpcBoard.value.acquaintances.length >= RANDOM_NPC_VISITOR_CONFIG.maxAcquaintances
    ) {
      return { success: false, message: `熟人册已满（${RANDOM_NPC_VISITOR_CONFIG.maxAcquaintances}人），需要后续归档功能再整理。` }
    }
    if (!randomNpcBoard.value.acquaintanceIds.includes(visitor.id)) {
      randomNpcBoard.value.acquaintanceIds = [...randomNpcBoard.value.acquaintanceIds, visitor.id]
    }
    visitor.tier = 'acquaintance'
    visitor.relationshipTag = visitor.relationshipTag === 'passing' ? 'acquaintance' : visitor.relationshipTag
    visitor.keyEvents = [...visitor.keyEvents, `${getCurrentNpcDayTag()} 记入熟人册，后续可作为熟人线扩展。`].slice(-6)
    upsertRandomNpcAcquaintance(visitor)
    randomNpcBoard.value.recentSummaries = trimRandomNpcArchives([
      summarizeRandomVisitor(visitor, '已记入熟人册'),
      ...randomNpcBoard.value.recentSummaries.filter(entry => entry.visitorId !== visitor.id)
    ])
    return { success: true, message: `${visitor.name}已记入熟人册。` }
  }

  const promoteRandomNpcAcquaintanceToLongStay = (visitorId: string): { success: boolean; message: string } => {
    ensureRandomVisitorsForCurrentWeek()
    const acquaintance = randomNpcBoard.value.acquaintances.find(entry => entry.visitorId === visitorId)
    if (!acquaintance) return { success: false, message: '熟人册里还没有这位来客。' }
    if (randomNpcBoard.value.longStayResidents.some(entry => entry.sourceVisitorId === visitorId)) {
      return { success: false, message: `${acquaintance.name}已经在桃源村暂住。` }
    }
    if (acquaintance.affinity < RANDOM_NPC_VISITOR_CONFIG.longStayAffinityThreshold) {
      return { success: false, message: `还需要更稳定的关系（需要好感 ${RANDOM_NPC_VISITOR_CONFIG.longStayAffinityThreshold}）。` }
    }
    if (randomNpcBoard.value.longStayResidents.length >= RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents) {
      return { success: false, message: `长住名额已满（${RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents}人），需要后续搬离 / 归档功能再整理。` }
    }
    const resident = createRandomNpcLongStayEntry(acquaintance)
    if (!resident) return { success: false, message: '这位熟人的模板已经不可用，暂时不能长住。' }
    randomNpcBoard.value.longStayResidents = trimRandomNpcLongStayResidents([
      resident,
      ...randomNpcBoard.value.longStayResidents
    ])
    randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(entry =>
      entry.visitorId === visitorId
        ? {
            ...entry,
            relationshipTag: entry.relationshipTag === 'passing' ? 'acquaintance' : entry.relationshipTag,
            relationshipSignals: sanitizeRandomNpcRelationshipSignals(resident.relationshipSignals),
            dialogueMemories: resident.dialogueMemories.slice(-6),
            keyEvents: resident.keyEvents.slice(-6)
          }
        : entry
    )
    const activeVisitor = randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)
    if (activeVisitor) activeVisitor.tier = 'long_stay'
    return { success: true, message: `${acquaintance.name}已成为长住 NPC。` }
  }

  const getNextRandomNpcLongStayStoryEvent = (resident: RandomNpcLongStayEntry) => {
    if (resident.relationshipEventStage > 3) return null
    return RANDOM_NPC_LONG_STAY_STORY_EVENTS.find(event =>
      event.route === resident.route &&
      event.stage === resident.relationshipEventStage &&
      !resident.completedStoryEventIds.includes(event.id)
    ) ?? null
  }

  const progressRandomNpcLongStayStory = (
    residentId: string,
    choiceId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const dayTag = getCurrentNpcDayTag()
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    if (resident.lastStoryDayTag === dayTag) return { success: false, message: `${resident.name}今天已经聊过这段事了。`, resident }
    const event = getNextRandomNpcLongStayStoryEvent(resident)
    if (!event) return { success: false, message: `${resident.name}当前没有新的长住事件。`, resident }
    const choice = event.choices.find(entry => entry.id === choiceId) ?? event.choices[0]
    if (!choice) return { success: false, message: '暂时没有合适的回应。', resident }
    const nextStage = event.stage >= 3 ? 3 : (event.stage + 1) as 1 | 2 | 3
    const nextRelationshipTag = choice.relationshipTag ?? resident.relationshipTag
    const direction = choice.relationshipDirection ?? inferRandomNpcRelationshipDirection(nextRelationshipTag, choice.id, choice.text)
    const contextLine = buildRandomNpcDialogueContextLine(resident)
    const followUpAgreementLine = buildRandomNpcFollowUpAgreementLine({
      target: resident,
      dayTag,
      choiceText: choice.text,
      direction,
      affinityChange: choice.affinityChange
    })
    const response = [choice.response, contextLine, followUpAgreementLine].filter(Boolean).join(' ')
    const dialogueMemory = buildRandomNpcDialogueMemory({
      npcName: resident.name,
      dayTag,
      choiceId: choice.id,
      choiceText: `${event.title}：${choice.text}`,
      response,
      direction,
      affinityChange: choice.affinityChange,
      relationshipTag: nextRelationshipTag
    })
    const eventLine = `${dayTag} 【${event.title}】${choice.text}：${response}（${getRandomNpcRelationshipDirectionLabel(direction)}）${followUpAgreementLine ? ` ${RANDOM_NPC_FOLLOW_UP_EVENT_PREFIX}${followUpAgreementLine}` : ''}`
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      nextResident = {
        ...entry,
        relationshipTag: nextRelationshipTag,
        affinity: Math.max(0, Math.min(100, entry.affinity + choice.affinityChange)),
        relationshipEventStage: nextStage,
        completedStoryEventIds: [...entry.completedStoryEventIds, event.id].slice(-6),
        lastStoryDayTag: dayTag,
        relationshipSignals: applyRandomNpcRelationshipSignal(
          sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
          direction,
          choice.affinityChange
        ),
        dialogueMemories: appendRandomNpcDialogueMemory(
          entry.dialogueMemories,
          dialogueMemory,
          RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT
        ),
        keyEvents: [...entry.keyEvents, eventLine].slice(-8)
      }
      return nextResident
    })
    if (nextResident) {
      randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(entry =>
        entry.visitorId === nextResident!.sourceVisitorId
          ? {
              ...entry,
              relationshipTag: nextResident!.relationshipTag,
              affinity: nextResident!.affinity,
              relationshipSignals: sanitizeRandomNpcRelationshipSignals(nextResident!.relationshipSignals),
              dialogueMemories: nextResident!.dialogueMemories.slice(-6),
              keyEvents: nextResident!.keyEvents.slice(-6)
            }
          : entry
      )
    }
    return { success: true, message: response, resident: nextResident ?? resident }
  }

  const getRandomNpcFamilyCommission = (residentId: string): RandomNpcFamilyCommissionDef | null => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    const template = resident ? RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId) : null
    return template?.familyCommission ?? null
  }

  const canMeetRandomNpcFamilyTie = (
    residentId: string,
    tieId: string
  ): { success: boolean; message: string } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const tie = resident.familyTies.find(entry => entry.id === tieId)
    if (!tie) return { success: false, message: '这条家族节点已经不可用。' }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '这位长住 NPC 的模板已经不可用。' }
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission)
    if (familyLine.metTieIds.includes(tieId)) return { success: false, message: `已经见过${tie.name}。` }
    if (resident.relationshipLine.kind === 'severed') return { success: false, message: '断缘后本版不再推进家族线。' }
    if (resident.relationshipLine.stage <= 0) return { success: false, message: '需要先开启朋友、恋爱、知己或结拜关系线。' }
    return { success: true, message: '可以见家人。' }
  }

  const meetRandomNpcFamilyTie = (
    residentId: string,
    tieId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const guard = canMeetRandomNpcFamilyTie(residentId, tieId)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!guard.success || !resident) return { ...guard, resident }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    const tie = resident.familyTies.find(entry => entry.id === tieId)
    if (!template || !tie) return { success: false, message: '这条家族节点已经不可用。', resident }

    const dayTag = getCurrentNpcDayTag()
    const reputationDelta = getRandomNpcFamilyMeetingReputationDelta(tie)
    const summary = `${tie.name}与你正式见面，记下了你和${resident.name}的相处方式。`
    const review: RandomNpcFamilyReviewEntry = {
      id: `${dayTag}:${residentId}:${tieId}:meeting`,
      dayTag,
      tieId,
      type: 'meeting',
      summary,
      reputationDelta
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      const familyLine = sanitizeRandomNpcFamilyLineState(entry.familyLine, entry.familyTies, template.familyCommission)
      nextResident = {
        ...entry,
        affinity: Math.min(100, entry.affinity + 2),
        relationshipSignals: applyRandomNpcRelationshipSignal(
          sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
          'family_impression',
          reputationDelta
        ),
        familyLine: {
          ...appendRandomNpcFamilyReview(
            {
              ...familyLine,
              metTieIds: [...familyLine.metTieIds, tieId].slice(-RANDOM_NPC_FAMILY_TIE_LIMIT)
            },
            review
          ),
          metTieIds: [...new Set([...familyLine.metTieIds, tieId])].slice(0, RANDOM_NPC_FAMILY_TIE_LIMIT)
        },
        keyEvents: [...entry.keyEvents, `${dayTag} 见家人：${summary}（家族评价+${reputationDelta}）`].slice(-8)
      }
      return nextResident
    })

    if (nextResident) {
      randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(entry =>
        entry.visitorId === nextResident!.sourceVisitorId
          ? {
              ...entry,
              affinity: nextResident!.affinity,
              relationshipSignals: sanitizeRandomNpcRelationshipSignals(nextResident!.relationshipSignals),
              keyEvents: nextResident!.keyEvents.slice(-6)
            }
          : entry
      )
    }
    return {
      success: true,
      message: `${summary} 家族评价+${reputationDelta}。`,
      resident: nextResident ?? resident
    }
  }

  const fulfillRandomNpcFamilyCommission = (
    residentId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '这位长住 NPC 的模板已经不可用。', resident }
    const commission = template.familyCommission
    const tie = resident.familyTies.find(entry => entry.id === commission.tieId) ?? resident.familyTies[0]
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, commission)
    if (familyLine.completedCommissionIds.includes(commission.id)) {
      return { success: false, message: `${resident.name}的家族委托已经完成。`, resident }
    }
    if (!familyLine.metTieIds.includes(commission.tieId)) {
      return { success: false, message: '需要先见过对应家人，才能交付这条家族委托。', resident }
    }

    const missingItems = getRandomNpcSmallOrderMissingItems(commission)
    if (missingItems.length > 0) {
      const summary = missingItems
        .map(item => `${getItemById(item.itemId)?.name ?? item.itemId} ${item.owned}/${item.quantity}`)
        .join('、')
      return { success: false, message: `材料不足：${summary}。`, resident }
    }

    const inventoryStore = useInventoryStore()
    for (const item of commission.requestedItems) {
      if (!inventoryStore.removeItemAnywhere(item.itemId, item.quantity)) {
        return { success: false, message: `交付${getItemById(item.itemId)?.name ?? item.itemId}时失败，请重新确认库存。`, resident }
      }
    }

    const dayTag = getCurrentNpcDayTag()
    const reputationDelta = 12
    const summary = `${tie?.name ?? resident.name}收下「${commission.title}」，对你处理${resident.name}家事的方式多了信任。`
    const review: RandomNpcFamilyReviewEntry = {
      id: `${dayTag}:${residentId}:${commission.id}:commission`,
      dayTag,
      tieId: commission.tieId,
      type: 'commission',
      summary,
      reputationDelta
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      const currentLine = sanitizeRandomNpcFamilyLineState(entry.familyLine, entry.familyTies, commission)
      nextResident = {
        ...entry,
        affinity: Math.min(100, entry.affinity + 6),
        relationshipSignals: applyRandomNpcRelationshipSignal(
          sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
          'family_impression',
          reputationDelta
        ),
        familyLine: {
          ...appendRandomNpcFamilyReview(
            {
              ...currentLine,
              completedCommissionIds: [...new Set([...currentLine.completedCommissionIds, commission.id])].slice(0, RANDOM_NPC_FAMILY_REVIEW_LIMIT)
            },
            review
          ),
          completedCommissionIds: [...new Set([...currentLine.completedCommissionIds, commission.id])].slice(0, RANDOM_NPC_FAMILY_REVIEW_LIMIT)
        },
        keyEvents: [...entry.keyEvents, `${dayTag} 完成家族委托「${commission.title}」：${commission.rewardSummary}`].slice(-8)
      }
      return nextResident
    })

    if (nextResident) {
      randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(entry =>
        entry.visitorId === nextResident!.sourceVisitorId
          ? {
              ...entry,
              affinity: nextResident!.affinity,
              relationshipSignals: sanitizeRandomNpcRelationshipSignals(nextResident!.relationshipSignals),
              keyEvents: nextResident!.keyEvents.slice(-6)
            }
          : entry
      )
    }
    return {
      success: true,
      message: `${resident.name}的家族委托已完成，${commission.rewardSummary} 好感+6，家族评价+${reputationDelta}。`,
      resident: nextResident ?? resident
    }
  }

  const canStartRandomNpcRelationLine = (
    residentId: string,
    kind: RandomNpcRelationLineStartKind
  ): { success: boolean; message: string } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const currentLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (currentLine.kind === kind && currentLine.stage > 0) {
      return { success: false, message: `已经是${getRandomNpcRelationLineLabel(kind)}。` }
    }
    if (currentLine.kind === 'severed') {
      return { success: false, message: '这条关系已断缘，本版暂不支持重新开启。' }
    }
    if (currentLine.stage > 0 && currentLine.kind !== 'friend') {
      return { success: false, message: `已进入${getRandomNpcRelationLineLabel(currentLine.kind)}，需要先断缘。` }
    }
    if (currentLine.stage > 0 && currentLine.kind === 'friend' && kind !== 'friend') {
      return { success: false, message: '已约定只做朋友，若要改线需先断缘。' }
    }

    const requirement = getRandomNpcRelationLineRequirement(kind)
    if (resident.affinity < requirement.affinity) {
      return { success: false, message: `好感不足，需要 ${requirement.affinity}。` }
    }
    if (!getRandomNpcRelationLineSignalReady(resident, kind)) {
      return {
        success: false,
        message: `${getRandomNpcRelationshipDirectionLabel(requirement.signal)}方向不足，需要 ${requirement.signalValue}。`
      }
    }

    if (kind === 'romance' || kind === 'zhiji') {
      const fixedCompanion = npcStates.value.find(state => state.married || state.dating || state.zhiji)
      if (fixedCompanion) return { success: false, message: '已有固定 NPC 婚恋或知己关系，不能再开启随机 NPC 亲密线。' }
      const activeLine = getActiveRandomNpcExclusiveLine(residentId)
      if (activeLine) return { success: false, message: `${activeLine.name}已在${getRandomNpcRelationLineLabel(activeLine.relationshipLine.kind)}中。` }
    }

    if (kind === 'sworn') {
      const activeLine = randomNpcBoard.value.longStayResidents.find(entry =>
        entry.residentId !== residentId &&
        entry.relationshipLine?.kind === 'sworn'
      )
      if (activeLine) return { success: false, message: `${activeLine.name}已在结拜线中，本版先保留单条随机 NPC 结拜线。` }
    }

    return { success: true, message: '可以开启关系线。' }
  }

  const startRandomNpcRelationLine = (
    residentId: string,
    kind: RandomNpcRelationLineStartKind
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const guard = canStartRandomNpcRelationLine(residentId, kind)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!guard.success || !resident) return { ...guard, resident }

    const dayTag = getCurrentNpcDayTag()
    const currentLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    const note = getRandomNpcRelationLineNote(kind, resident.name)
    const event = {
      id: `${dayTag}:${residentId}:${kind}`,
      dayTag,
      kind,
      action: 'start' as const,
      summary: note
    }
    const nextRelationshipTag: RandomNpcRelationshipTag =
      kind === 'romance'
        ? 'ambiguous'
        : kind === 'friend' || kind === 'zhiji' || kind === 'sworn'
          ? 'friend'
          : resident.relationshipTag
    const eventLine = `${dayTag} 开启${getRandomNpcRelationLineLabel(kind)}：${note}`
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      nextResident = {
        ...entry,
        relationshipTag: nextRelationshipTag,
        affinity: Math.min(100, entry.affinity + (kind === 'friend' ? 2 : 5)),
        relationshipLine: {
          kind,
          stage: 1,
          commitmentStatus: 'none',
          commitmentDayTag: '',
          marriedDayTag: '',
          homeLifeNote: '尚未形成婚约或婚后日常。',
          startedDayTag: currentLine.startedDayTag || dayTag,
          updatedDayTag: dayTag,
          note,
          history: appendRandomNpcRelationLineHistory(currentLine, event)
        },
        keyEvents: [...entry.keyEvents, eventLine].slice(-8)
      }
      return nextResident
    })

    if (nextResident) {
      randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(entry =>
        entry.visitorId === nextResident!.sourceVisitorId
          ? {
              ...entry,
              relationshipTag: nextResident!.relationshipTag,
              affinity: nextResident!.affinity,
              keyEvents: nextResident!.keyEvents.slice(-6)
            }
          : entry
      )
    }

    return {
      success: true,
      message: `${resident.name}已进入${getRandomNpcRelationLineLabel(kind)}。`,
      resident: nextResident ?? resident
    }
  }

  const severRandomNpcRelationLine = (
    residentId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const currentLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (currentLine.kind === 'severed') return { success: false, message: '这条关系已经断缘。', resident }
    if (currentLine.stage <= 0) return { success: false, message: '尚未开启可断缘的关系线。', resident }

    const dayTag = getCurrentNpcDayTag()
    const previousLabel = getRandomNpcRelationLineLabel(currentLine.kind)
    const note = `${resident.name}与你结束了${previousLabel}，后续只保留旧识摘要。`
    const event = {
      id: `${dayTag}:${residentId}:sever`,
      dayTag,
      kind: 'severed' as const,
      action: 'sever' as const,
      summary: note
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      nextResident = {
        ...entry,
        relationshipTag: 'old_contact',
        affinity: Math.max(0, entry.affinity - 15),
        relationshipLine: {
          kind: 'severed',
          stage: 0,
          commitmentStatus: 'none',
          commitmentDayTag: currentLine.commitmentDayTag,
          marriedDayTag: currentLine.marriedDayTag,
          homeLifeNote: currentLine.homeLifeNote,
          startedDayTag: currentLine.startedDayTag,
          updatedDayTag: dayTag,
          note,
          history: appendRandomNpcRelationLineHistory(currentLine, event)
        },
        keyEvents: [...entry.keyEvents, `${dayTag} 断缘：${note}`].slice(-8)
      }
      return nextResident
    })

    if (nextResident) {
      randomNpcBoard.value.acquaintances = randomNpcBoard.value.acquaintances.map(entry =>
        entry.visitorId === nextResident!.sourceVisitorId
          ? {
              ...entry,
              relationshipTag: nextResident!.relationshipTag,
              affinity: nextResident!.affinity,
              keyEvents: nextResident!.keyEvents.slice(-6)
            }
          : entry
      )
    }

    return { success: true, message: `${resident.name}已断缘，关系线不会继续推进。`, resident: nextResident ?? resident }
  }

  const canEngageRandomNpcRelationLine = (
    residentId: string
  ): { success: boolean; message: string } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const line = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (line.kind !== 'romance' || line.stage <= 0) return { success: false, message: '需要先进入恋爱线。' }
    if (line.commitmentStatus === 'married') return { success: false, message: '已经成婚。' }
    if (line.commitmentStatus === 'engaged') return { success: false, message: '已经订婚。' }
    if (resident.affinity < 90) return { success: false, message: '订婚需要好感 90。' }
    const signals = sanitizeRandomNpcRelationshipSignals(resident.relationshipSignals)
    if ((signals.family_impression ?? 0) < 8) return { success: false, message: '订婚需要家族印象 8。' }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '随机 NPC 模板缺失。' }
    if (sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission).reputation < 55) {
      return { success: false, message: '订婚需要家族评价 55。' }
    }
    const fixedCompanion = npcStates.value.find(state => state.married || state.dating || state.zhiji)
    if (fixedCompanion) return { success: false, message: '已有固定 NPC 婚恋或知己关系，不能订婚。' }
    const activeLine = getActiveRandomNpcExclusiveLine(residentId)
    if (activeLine) return { success: false, message: `${activeLine.name}已在${getRandomNpcRelationLineLabel(activeLine.relationshipLine.kind)}中。` }
    return { success: true, message: '可以订婚。' }
  }

  const engageRandomNpcRelationLine = (
    residentId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const guard = canEngageRandomNpcRelationLine(residentId)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!guard.success || !resident) return { ...guard, resident }
    const dayTag = getCurrentNpcDayTag()
    const currentLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    const note = `${resident.name}与你定下婚约，关系线进入婚约阶段。`
    const event = {
      id: `${dayTag}:${residentId}:engage`,
      dayTag,
      kind: 'romance' as const,
      action: 'engage' as const,
      summary: note
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      nextResident = {
        ...entry,
        affinity: Math.min(100, entry.affinity + 4),
        relationshipLine: {
          ...currentLine,
          kind: 'romance',
          stage: 2,
          commitmentStatus: 'engaged',
          commitmentDayTag: currentLine.commitmentDayTag || dayTag,
          updatedDayTag: dayTag,
          note,
          history: appendRandomNpcRelationLineHistory(currentLine, event)
        },
        keyEvents: [...entry.keyEvents, `${dayTag} 订婚：${note}`].slice(-8)
      }
      return nextResident
    })
    return { success: true, message: `${resident.name}已与你订婚。`, resident: nextResident ?? resident }
  }

  const canMarryRandomNpcRelationLine = (
    residentId: string
  ): { success: boolean; message: string } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const line = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (line.kind !== 'romance' || line.commitmentStatus !== 'engaged') return { success: false, message: '需要先完成订婚。' }
    if (resident.affinity < 95) return { success: false, message: '成婚需要好感 95。' }
    if (weddingCountdown.value > 0 || weddingNpcId.value) return { success: false, message: '已有固定 NPC 婚礼安排，不能同时成婚。' }
    const fixedCompanion = npcStates.value.find(state => state.married || state.dating || state.zhiji)
    if (fixedCompanion) return { success: false, message: '已有固定 NPC 婚恋或知己关系，不能再与随机 NPC 成婚。' }
    const activeLine = getActiveRandomNpcExclusiveLine(residentId)
    if (activeLine) return { success: false, message: `${activeLine.name}已在${getRandomNpcRelationLineLabel(activeLine.relationshipLine.kind)}中。` }
    return { success: true, message: '可以成婚。' }
  }

  const marryRandomNpcRelationLine = (
    residentId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const guard = canMarryRandomNpcRelationLine(residentId)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!guard.success || !resident) return { ...guard, resident }
    const dayTag = getCurrentNpcDayTag()
    const currentLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    const note = `${resident.name}与你在桃源村成婚，婚后内容仅写入本地随机 NPC 存档。`
    const event = {
      id: `${dayTag}:${residentId}:marry`,
      dayTag,
      kind: 'romance' as const,
      action: 'marry' as const,
      summary: note
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      nextResident = {
        ...entry,
        relationshipTag: 'friend',
        affinity: Math.min(100, entry.affinity + 5),
        relationshipLine: {
          ...currentLine,
          kind: 'romance',
          stage: 3,
          commitmentStatus: 'married',
          marriedDayTag: currentLine.marriedDayTag || dayTag,
          updatedDayTag: dayTag,
          homeLifeNote: `${dayTag} 成婚后开始记录婚后日常。`,
          note,
          history: appendRandomNpcRelationLineHistory(currentLine, event)
        },
        keyEvents: [...entry.keyEvents, `${dayTag} 成婚：${note}`].slice(-8)
      }
      return nextResident
    })
    return { success: true, message: `${resident.name}已与你成婚。`, resident: nextResident ?? resident }
  }

  const recordRandomNpcMarriedLife = (
    residentId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const currentLine = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (currentLine.kind !== 'romance' || currentLine.commitmentStatus !== 'married') {
      return { success: false, message: '需要先与这位随机 NPC 成婚。', resident }
    }
    const dayTag = getCurrentNpcDayTag()
    const homeEvents = [
      `${resident.name}帮你整理了今日的村务清单，提醒你别忘了照看熟人册。`,
      `${resident.name}带来家里人的近况，婚后关系继续保留在单机存档。`,
      `${resident.name}与你商量晚饭和明日采买，家族评价小幅稳定。`,
      `${resident.name}在院中留下一封短笺，记录今日相处。`
    ]
    const summary = homeEvents[(resident.keyEvents.length + currentLine.history.length) % homeEvents.length]!
    const event = {
      id: `${dayTag}:${residentId}:home:${currentLine.history.length}`,
      dayTag,
      kind: 'romance' as const,
      action: 'home' as const,
      summary
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      const template = RANDOM_NPC_TEMPLATES.find(item => item.id === entry.templateId)
      if (!template) return entry
      const nextFamilyLine = sanitizeRandomNpcFamilyLineState(entry.familyLine, entry.familyTies, template.familyCommission)
      nextResident = {
        ...entry,
        affinity: Math.min(100, entry.affinity + 1),
        familyLine: {
          ...nextFamilyLine,
          reputation: Math.min(100, nextFamilyLine.reputation + 1)
        },
        relationshipLine: {
          ...currentLine,
          stage: 3,
          commitmentStatus: 'married',
          updatedDayTag: dayTag,
          homeLifeNote: summary,
          history: appendRandomNpcRelationLineHistory(currentLine, event)
        },
        keyEvents: [...entry.keyEvents, `${dayTag} 婚后日常：${summary}`].slice(-8)
      }
      return nextResident
    })
    return { success: true, message: summary, resident: nextResident ?? resident }
  }

  const canDevelopRandomNpcFamilyBusiness = (
    residentId: string
  ): { success: boolean; message: string } => {
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const line = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (line.kind !== 'romance' || line.commitmentStatus !== 'married') {
      return { success: false, message: '需要先与这位随机 NPC 成婚。' }
    }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '随机 NPC 模板缺失。' }
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission)
    if (familyLine.familyBusinessStage >= 3) return { success: false, message: '婚后家业线已完成。' }
    if (familyLine.reputation < 60) return { success: false, message: '婚后家业需要家族评价 60。' }
    return { success: true, message: '可以推进婚后家业。' }
  }

  const developRandomNpcFamilyBusiness = (
    residentId: string
  ): { success: boolean; message: string; resident?: RandomNpcLongStayEntry } => {
    const guard = canDevelopRandomNpcFamilyBusiness(residentId)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!guard.success || !resident) return { ...guard, resident }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '随机 NPC 模板缺失。', resident }
    const dayTag = getCurrentNpcDayTag()
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission)
    const nextStage = Math.min(3, familyLine.familyBusinessStage + 1) as 1 | 2 | 3
    const businessTie = resident.familyTies.find(tie => tie.kind === 'family_business') ?? resident.familyTies[0]
    const routeText = resident.route === 'business'
      ? '把商学账册整理成可执行的进货清单'
      : resident.route === 'craft'
        ? '把家中手艺和村中工坊排成固定协作'
        : resident.route === 'caregiving'
          ? '把照料人脉转成稳定的邻里互助'
          : '把亲友往来整理成桃源村的长期照应'
    const stageText = nextStage === 1 ? '立约' : nextStage === 2 ? '共营' : '稳业'
    const reputationDelta = nextStage === 1 ? 6 : nextStage === 2 ? 5 : 4
    const yieldReward = getRandomNpcFamilyBusinessYield(resident, nextStage)
    const inventoryStore = useInventoryStore()
    if (!inventoryStore.addItemsExact(yieldReward.items)) {
      return { success: false, message: '背包空间不足，无法接收婚后家业收益。', resident }
    }
    const summary = `${resident.name}与你完成婚后家业${stageText}：${businessTie ? `${businessTie.name}见证，` : ''}${routeText}。`
    const businessEntry: RandomNpcFamilyBusinessEntry = {
      id: `${dayTag}:${residentId}:family-business:${nextStage}`,
      dayTag,
      stage: nextStage,
      summary,
      rewardItems: yieldReward.items,
      rewardSummary: yieldReward.summary,
      reputationDelta
    }
    const review: RandomNpcFamilyReviewEntry = {
      id: `${dayTag}:${residentId}:family-business-review:${nextStage}`,
      dayTag,
      tieId: businessTie?.id ?? template.familyCommission.tieId,
      type: 'business',
      summary,
      reputationDelta
    }
    let nextResident: RandomNpcLongStayEntry | null = null
    randomNpcBoard.value.longStayResidents = randomNpcBoard.value.longStayResidents.map(entry => {
      if (entry.residentId !== residentId) return entry
      const currentLine = sanitizeRandomNpcFamilyLineState(entry.familyLine, entry.familyTies, template.familyCommission)
      const nextFamilyLine = appendRandomNpcFamilyReview(
        {
          ...currentLine,
          familyBusinessStage: nextStage,
          familyBusinessNote: summary,
          familyBusinessHistory: appendRandomNpcFamilyBusinessHistory(currentLine, businessEntry)
        },
        review
      )
      nextResident = {
        ...entry,
        affinity: Math.min(100, entry.affinity + 2),
        relationshipSignals: applyRandomNpcRelationshipSignal(
          sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
          'family_impression',
          reputationDelta
        ),
        familyLine: nextFamilyLine,
        keyEvents: [...entry.keyEvents, `${dayTag} 婚后家业${stageText}：${summary}${yieldReward.summary}。`].slice(-8)
      }
      return nextResident
    })
    return { success: true, message: `${summary}${yieldReward.summary}。`, resident: nextResident ?? resident }
  }

  const canApplyRandomNpcFamilyInfluenceToChild = (
    childId: number,
    residentId: string
  ): { success: boolean; message: string } => {
    const child = children.value.find(entry => entry.id === childId)
    if (!child) return { success: false, message: '找不到这个孩子。' }
    if (child.stage === 'baby') return { success: false, message: '婴儿阶段还不能形成稳定兴趣。' }
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!resident) return { success: false, message: '这位长住 NPC 暂时不在名册中。' }
    const line = sanitizeRandomNpcRelationLineState(resident.relationshipLine)
    if (line.kind !== 'romance' || line.commitmentStatus !== 'married') {
      return { success: false, message: '需要先与这位随机 NPC 成婚。' }
    }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '随机 NPC 模板缺失。' }
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission)
    if (familyLine.familyBusinessStage <= 0 && familyLine.reputation < 70) {
      return { success: false, message: '需要先推进婚后家业，或把家族评价提升到 70。' }
    }
    const focus = getRandomNpcFamilyInfluenceFocus({ ...resident, familyLine })
    const history = sanitizeChildTrainingInfluenceHistory(child.trainingState.familyInfluenceHistory)
    if (history.some(entry => entry.sourceResidentId === residentId && entry.focus === focus)) {
      return { success: false, message: `${resident.name}已经影响过${child.name}的${getChildTrainingFocusLabel(focus)}兴趣。` }
    }
    return { success: true, message: `可以让${resident.name}影响${child.name}的${getChildTrainingFocusLabel(focus)}兴趣。` }
  }

  const applyRandomNpcFamilyInfluenceToChild = (
    childId: number,
    residentId: string
  ): { success: boolean; message: string; child?: ChildState } => {
    const guard = canApplyRandomNpcFamilyInfluenceToChild(childId, residentId)
    const child = children.value.find(entry => entry.id === childId)
    const resident = randomNpcBoard.value.longStayResidents.find(entry => entry.residentId === residentId)
    if (!guard.success || !child || !resident) return { ...guard, child }
    const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === resident.templateId)
    if (!template) return { success: false, message: '随机 NPC 模板缺失。', child }
    const dayTag = getCurrentNpcDayTag()
    const familyLine = sanitizeRandomNpcFamilyLineState(resident.familyLine, resident.familyTies, template.familyCommission)
    const focus = getRandomNpcFamilyInfluenceFocus({ ...resident, familyLine })
    const focusLabel = getChildTrainingFocusLabel(focus)
    const summary = `${resident.name}把婚后家业与${resident.familySeed}讲给${child.name}听，${child.name}开始偏向${focusLabel}兴趣。`
    const influenceEntry: ChildTrainingInfluenceEntry = {
      id: `${dayTag}:child:${childId}:family-influence:${residentId}:${focus}`,
      dayTag,
      focus,
      sourceResidentId: residentId,
      sourceName: resident.name,
      summary
    }
    const milestoneId = `family-influence:${residentId}:${focus}`
    child.trainingState = {
      ...child.trainingState,
      focus,
      familyInfluenceFocus: focus,
      familyInfluenceSource: resident.name,
      familyInfluenceHistory: [...sanitizeChildTrainingInfluenceHistory(child.trainingState.familyInfluenceHistory), influenceEntry]
        .slice(-CHILD_TRAINING_FAMILY_INFLUENCE_LIMIT),
      milestoneIds: [...new Set([...child.trainingState.milestoneIds, milestoneId])].slice(-8)
    }
    child.friendship = Math.min(300, child.friendship + 1)
    return { success: true, message: summary, child }
  }

  // ============================================================
  // 雇工系统
  // ============================================================

  const hiredHelpers = ref<HiredHelper[]>([])
  const MAX_HELPERS = 2

  /** 雇工日薪 */
  const HELPER_WAGES: Record<FarmHelperTask, number> = {
    water: 100,
    feed: 150,
    harvest: 200,
    weed: 100
  }

  /** 雇工任务名称 */
  const HELPER_TASK_NAMES: Record<FarmHelperTask, string> = {
    water: '浇水',
    feed: '喂食',
    harvest: '收获',
    weed: '除草除虫'
  }

  const relationshipCompanionshipBaselineAudit = WS09_FAMILY_COMPANIONSHIP_BASELINE_AUDIT
  const relationshipTuning = WS09_RELATIONSHIP_TUNING_CONFIG
  const relationshipFeatureFlags = relationshipTuning.featureFlags
  const relationshipTierRank: Record<'P0' | 'P1' | 'P2', number> = { P0: 0, P1: 1, P2: 2 }
  const isSameSexMarriageEnabled = () => Boolean(relationshipFeatureFlags.sameSexMarriageEnabled)
  const isSameSexFamilyExpansionEnabled = () => Boolean(relationshipFeatureFlags.sameSexFamilyExpansionEnabled)
  const isSameSexPairWithNpc = (npcId: string | null | undefined): boolean => {
    if (!npcId) return false
    const npcDef = getNpcById(npcId)
    if (!npcDef) return false
    return npcDef.gender === usePlayerStore().gender
  }
  const canPursueMarriageWithNpc = (npcId: string | null | undefined): boolean => {
    if (!npcId) return false
    if (!isSameSexPairWithNpc(npcId)) return true
    return isSameSexMarriageEnabled()
  }
  const getFamilyExpansionKindForNpc = (npcId: string | null | undefined): FamilyExpansionKind =>
    isSameSexPairWithNpc(npcId) ? 'adoption' : 'pregnancy'

  const maxRelationshipTier = (left: 'P0' | 'P1' | 'P2', right: 'P0' | 'P1' | 'P2') =>
    relationshipTierRank[left] >= relationshipTierRank[right] ? left : right

  const beginRelationshipAction = (lockId: string): boolean => {
    if (relationshipActionLocks.value.includes(lockId)) return false
    relationshipActionLocks.value = [...relationshipActionLocks.value, lockId]
    return true
  }

  const finishRelationshipAction = (lockId: string) => {
    relationshipActionLocks.value = relationshipActionLocks.value.filter(entry => entry !== lockId)
  }

  const createRelationshipActionSnapshots = () => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    return {
      player: playerStore.serialize(),
      inventory: inventoryStore.serialize(),
      npc: serialize()
    }
  }

  const rollbackRelationshipAction = (snapshots: ReturnType<typeof createRelationshipActionSnapshots>) => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    playerStore.deserialize(snapshots.player)
    inventoryStore.deserialize(snapshots.inventory)
    deserialize(snapshots.npc)
  }

  /** 可雇佣的NPC列表（好感>=1000 且 未被雇佣 且 非配偶/知己） */
  const getHireableNpcs = (): { npcId: string; name: string; friendship: number }[] => {
    return npcStates.value
      .filter(s => {
        if (s.friendship < 1000) return false
        if (s.married || s.zhiji) return false
        if (hiredHelpers.value.some(h => h.npcId === s.npcId)) return false
        return true
      })
      .map(s => {
        const def = getNpcById(s.npcId)
        return { npcId: s.npcId, name: def?.name ?? s.npcId, friendship: s.friendship }
      })
  }

  /** 雇佣NPC */
  const hireHelper = (npcId: string, task: FarmHelperTask): { success: boolean; message: string } => {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }
    if (state.friendship < 1000) return { success: false, message: '好感度不足（需要4心/1000）。' }
    if (state.married || state.zhiji) return { success: false, message: '伴侣和知己不可雇佣。' }
    if (hiredHelpers.value.length >= MAX_HELPERS) return { success: false, message: `最多雇佣${MAX_HELPERS}名帮手。` }
    if (hiredHelpers.value.some(h => h.npcId === npcId)) return { success: false, message: '此人已被雇佣。' }

    const npcDef = getNpcById(npcId)
    const name = npcDef?.name ?? npcId
    hiredHelpers.value.push({ npcId, task, dailyWage: HELPER_WAGES[task] })
    return { success: true, message: `${name}开始帮你${HELPER_TASK_NAMES[task]}了！(日薪${HELPER_WAGES[task]}文)` }
  }

  /** 解雇 */
  const dismissHelper = (npcId: string): { success: boolean; message: string } => {
    const idx = hiredHelpers.value.findIndex(h => h.npcId === npcId)
    if (idx < 0) return { success: false, message: '此人未被雇佣。' }

    const npcDef = getNpcById(npcId)
    const name = npcDef?.name ?? npcId
    hiredHelpers.value.splice(idx, 1)
    return { success: true, message: `${name}已离开。` }
  }

  /** 每日雇工结算（useEndDay调用） */
  const processDailyHelpers = (taskFilter?: FarmHelperTask[]): { messages: string[]; dismissedNpcs: string[]; allFed: boolean } => {
    const playerStore = usePlayerStore()
    const farmStore = useFarmStore()
    const animalStore = useAnimalStore()
    const messages: string[] = []
    const dismissed: string[] = []
    let allFed = false

    for (const helper of [...hiredHelpers.value]) {
      // 按任务类型过滤
      if (taskFilter && !taskFilter.includes(helper.task)) continue

      const npcDef = getNpcById(helper.npcId)
      const name = npcDef?.name ?? '雇工'
      const state = getNpcState(helper.npcId)

      // 已变为配偶/知己 → 自动解雇（不收工资）
      if (state && (state.married || state.zhiji)) {
        hiredHelpers.value = hiredHelpers.value.filter(h => h.npcId !== helper.npcId)
        messages.push(`${name}已成为你的${state.married ? '伴侣' : '知己'}，不再担任雇工。`)
        dismissed.push(helper.npcId)
        continue
      }

      const efficiency = state && state.friendship >= 2000 ? 1.5 : 1.0

      // 扣工资
      if (!playerStore.spendMoney(helper.dailyWage)) {
        hiredHelpers.value = hiredHelpers.value.filter(h => h.npcId !== helper.npcId)
        messages.push(`付不起${name}的工资，${name}不干了。`)
        dismissed.push(helper.npcId)
        continue
      }

      switch (helper.task) {
        case 'water': {
          const unwatered = farmStore.plots.filter(p => (p.state === 'planted' || p.state === 'growing') && !p.watered)
          const count = Math.min(unwatered.length, Math.floor(4 * efficiency) + Math.floor(Math.random() * 3))
          for (let i = 0; i < count; i++) farmStore.waterPlot(unwatered[i]!.id)
          if (count > 0) messages.push(`${name}帮你浇了${count}块地。(-${helper.dailyWage}文)`)
          else messages.push(`${name}今天没什么可浇的。(-${helper.dailyWage}文)`)
          break
        }
        case 'feed': {
          const result = animalStore.feedAll()
          const fishPondStore = useFishPondStore()
          const fedFish = fishPondStore.pond.built && !fishPondStore.pond.fedToday ? fishPondStore.feedFish() : false
          allFed = result.noFeedCount === 0 && result.fedCount > 0
          if (result.fedCount > 0 && fedFish) {
            messages.push(`${name}帮你喂了${result.fedCount}只牲畜和鱼塘的鱼。(-${helper.dailyWage}文)`)
          } else if (result.fedCount > 0) {
            messages.push(`${name}帮你喂了${result.fedCount}只牲畜。(-${helper.dailyWage}文)`)
          } else if (fedFish) {
            messages.push(`${name}帮你喂了鱼塘的鱼。(-${helper.dailyWage}文)`)
          } else if (result.noFeedCount > 0) {
            messages.push(`${name}发现草料不足，${result.noFeedCount}只牲畜未能喂食。(-${helper.dailyWage}文)`)
          } else {
            messages.push(`${name}今天没什么需要喂的。(-${helper.dailyWage}文)`)
          }
          break
        }
        case 'harvest': {
          const harvestable = farmStore.plots.filter(p => p.state === 'harvestable')
          const count = Math.min(harvestable.length, Math.floor(5 * efficiency))
          let harvested = 0
          for (let i = 0; i < count; i++) {
            const targetPlot = harvestable[i]!
            const result = harvestFarmPlotWithRewards(targetPlot.id, { qualityOverride: 'normal' })
            if (result.success) harvested += result.harvestedPlots
          }
          if (harvested > 0) messages.push(`${name}帮你收了${harvested}块地的庄稼。(-${helper.dailyWage}文)`)
          else messages.push(`${name}今天没什么可收的。(-${helper.dailyWage}文)`)
          break
        }
        case 'weed': {
          let cleared = 0
          for (const plot of farmStore.plots) {
            if (plot.weedy) {
              farmStore.clearWeed(plot.id)
              cleared++
            }
            if (plot.infested) {
              farmStore.curePest(plot.id)
              cleared++
            }
          }
          if (cleared > 0) messages.push(`${name}清理了${cleared}处杂草和虫害。(-${helper.dailyWage}文)`)
          else messages.push(`${name}今天田里挺干净的。(-${helper.dailyWage}文)`)
          break
        }
      }
    }
    return { messages, dismissedNpcs: dismissed, allFed }
  }

  /** 子女名字池（按性别） */
  const CHILD_NAMES_MALE = ['小龙', '小宝', '团子', '年年']
  const CHILD_NAMES_FEMALE = ['小凤', '阿花', '豆豆', '圆圆']

  /** 获取NPC状态 */
  const getNpcState = (npcId: string): NpcState | undefined => {
    return npcStates.value.find(s => s.npcId === npcId)
  }

  /** 获取好感等级 */
  const getFriendshipLevel = (npcId: string): FriendshipLevel => {
    const state = getNpcState(npcId)
    if (!state) return 'stranger'
    for (const t of FRIENDSHIP_THRESHOLDS) {
      if (state.friendship >= t.min) return t.level
    }
    return 'stranger'
  }

  /** 获取更完整的关系阶段 */
  const getRelationshipStage = (npcId: string): RelationshipStage => {
    const state = getNpcState(npcId)
    if (!state) return 'recognize'
    const hasChild = state.married && children.value.length > 0 && getSpouse()?.npcId === npcId
    return getRelationshipStageFromState(state.friendship, {
      dating: state.dating,
      married: state.married,
      zhiji: state.zhiji,
      hasChild
    })
  }

  const getRelationshipStageText = (npcId: string): string => getRelationshipStageLabel(getRelationshipStage(npcId))

  const getRelationshipStageDescription = (npcId: string): string => RELATIONSHIP_STAGE_META[getRelationshipStage(npcId)].description

  const getRelationshipBenefits = (npcId: string): string[] => {
    return getNpcBenefitSummaries(npcId, getRelationshipStage(npcId))
  }

  const getRelationshipGiftReturnSummaries = (npcId: string): string[] => {
    return getNpcGiftReturnSummaries(npcId, getRelationshipStage(npcId))
  }

  const getNextRelationshipBenefits = (npcId: string): string[] => {
    return getNpcNextBenefitSummaries(npcId, getRelationshipStage(npcId))
  }

  const getRelationshipCluesForNpc = (npcId: string) => {
    return relationshipClues.value
      .filter(clue => clue.npcId === npcId)
      .sort((left, right) => {
        const precisionRank: Record<RelationshipCluePrecision, number> = { confirmed: 0, exact: 1, hint: 2 }
        return precisionRank[left.precision] - precisionRank[right.precision]
      })
  }

  const getShopDiscountBonus = (npcId: string): number => {
    return getNpcShopDiscount(npcId, getRelationshipStage(npcId))
  }

  const buildCurrentDayTag = () => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
  }

  const addRelationshipClue = (
    npcId: string,
    clueId: string,
    text: string,
    options: Partial<Omit<RelationshipClueEntry, 'npcId' | 'clueId' | 'text'>> = {}
  ): boolean => {
    if (relationshipClues.value.some(clue => clue.clueId === clueId)) return false
    relationshipClues.value.push({
      npcId,
      clueId,
      text,
      kind: options.kind ?? 'gift',
      source: options.source ?? 'rumor',
      precision: options.precision ?? 'exact',
      discoveredDayTag: options.discoveredDayTag ?? buildCurrentDayTag(),
      itemId: options.itemId,
      preference: options.preference
    })
    return true
  }

  const getKnownGiftPreference = (npcId: string, itemId: string): GiftPreference | 'unknown' => {
    const relevantClues = getRelationshipCluesForNpc(npcId).filter(clue => clue.kind === 'gift' && clue.itemId === itemId)
    const confirmed = relevantClues.find(clue => clue.precision === 'confirmed')
    if (confirmed?.preference) return confirmed.preference
    const exact = relevantClues.find(clue => clue.precision === 'exact')
    if (exact?.preference) return exact.preference
    return 'unknown'
  }

  const getGiftKnowledgeSummary = (npcId: string) => {
    const giftClues = getRelationshipCluesForNpc(npcId).filter(clue => clue.kind === 'gift')
    return {
      hintCount: giftClues.filter(clue => clue.precision === 'hint').length,
      exactCount: giftClues.filter(clue => clue.precision === 'exact').length,
      confirmedCount: giftClues.filter(clue => clue.precision === 'confirmed').length
    }
  }

  const unlockGiftClueTemplate = (template: ReturnType<typeof getNpcGiftClueTemplates>[number]) => {
    const playerStore = usePlayerStore()
    const added = addRelationshipClue(template.npcId, template.clueId, template.text, {
      kind: 'gift',
      source: template.source,
      precision: template.precision,
      itemId: template.itemId,
      preference: template.preference
    })
    if (added) playerStore.markGiftClueDiscovered(template.clueId, buildCurrentDayTag())
    return added
  }

  const unlockScriptedGiftClue = (npcId: string, itemId: string, preference: Exclude<GiftPreference, 'neutral'>) => {
    const playerStore = usePlayerStore()
    const clueId = `gift_check:${npcId}:${itemId}:${preference}`
    const npcName = getNpcById(npcId)?.name ?? npcId
    const itemName = getItemById(itemId)?.name ?? itemId
    const prefText: Record<Exclude<GiftPreference, 'neutral'>, string> = {
      loved: '非常喜欢',
      liked: '喜欢',
      hated: '讨厌'
    }
    const added = addRelationshipClue(npcId, clueId, `你亲手验证过：${npcName}对「${itemName}」${prefText[preference]}。`, {
      kind: 'gift',
      source: 'gift_test',
      precision: 'confirmed',
      itemId,
      preference
    })
    if (added) playerStore.markGiftClueDiscovered(clueId, buildCurrentDayTag())
    return added
  }

  const syncSecretNoteGiftClues = (npcId: string) => {
    const secretNoteStore = useSecretNoteStore()
    const noteGiftClueMap: Array<{ noteId: number; npcId: string; clueId: string }> = [
      { noteId: 3, npcId: 'li_yu', clueId: 'li_yu_note_koi' },
      { noteId: 7, npcId: 'sun_tiejiang', clueId: 'sun_tiejiang_note_copper' },
      { noteId: 11, npcId: 'liu_niang', clueId: 'liu_niang_note_osmanthus' },
      { noteId: 15, npcId: 'wang_dashen', clueId: 'wang_dashen_note_rice' },
      { noteId: 19, npcId: 'zhou_xiucai', clueId: 'zhou_xiucai_note_tea' },
      { noteId: 23, npcId: 'chen_bo', clueId: 'chen_bo_shop_ginseng' }
    ]
    const mapping = noteGiftClueMap.filter(entry => entry.npcId === npcId)
    mapping.forEach(entry => {
      if (!secretNoteStore.isCollected(entry.noteId)) return
      const template = getNpcGiftClueTemplates(npcId).find(candidate => candidate.clueId === entry.clueId)
      if (template) unlockGiftClueTemplate(template)
    })
  }

  const unlockAmbientGiftClue = (npcId: string, preferredSources: RelationshipClueSource[]) => {
    syncSecretNoteGiftClues(npcId)
    const knownClueIds = new Set(getRelationshipCluesForNpc(npcId).map(clue => clue.clueId))
    const templates = getNpcGiftClueTemplates(npcId)
    for (const source of preferredSources) {
      const template = templates.find(candidate => candidate.source === source && !knownClueIds.has(candidate.clueId))
      if (template && unlockGiftClueTemplate(template)) return template
    }
    return null
  }

  const getScheduleStatus = (npcId: string) => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext())

    return getNpcScheduleStatus(npcId, {
      season: gameStore.season,
      day: gameStore.day,
      hour: gameStore.hour,
      weather: gameStore.weather,
      festivalId: todayEvent?.id ?? null
    })
  }

  const getScheduleTimeline = (npcId: string) => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext())

    return getNpcScheduleTimeline(npcId, {
      season: gameStore.season,
      day: gameStore.day,
      hour: gameStore.hour,
      weather: gameStore.weather,
      festivalId: todayEvent?.id ?? null
    })
  }

  const getNextScheduleText = (npcId: string): string | null => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext())

    return getNpcNextScheduleText(npcId, {
      season: gameStore.season,
      day: gameStore.day,
      hour: gameStore.hour,
      weather: gameStore.weather,
      festivalId: todayEvent?.id ?? null
    })
  }

  const getRegionRumorSupplyOverview = (regionId: RegionId): RegionRumorSupplyEntry[] => {
    const gameStore = useGameStore()
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext())
    const festivalId = todayEvent?.id ?? null

    return REGION_RUMOR_TEMPLATES.filter(template => {
      if (template.regionId !== regionId) return false
      if (template.seasons && template.seasons !== 'all' && !template.seasons.includes(gameStore.season)) return false
      if (template.weathers && template.weathers !== 'all' && !template.weathers.includes(gameStore.weather)) return false
      if (template.festivalIds && !template.festivalIds.includes(festivalId ?? '')) return false

      const relationshipStage = getRelationshipStage(template.npcId)
      if (!isRelationshipStageAtLeast(relationshipStage, template.minStage)) return false

      const scheduleStatus = getNpcScheduleStatus(template.npcId, {
        season: gameStore.season,
        day: gameStore.day,
        hour: gameStore.hour,
        weather: gameStore.weather,
        festivalId
      })
      return scheduleStatus.available
    })
      .map(template => {
        const relationshipStage = getRelationshipStage(template.npcId)
        const scheduleStatus = getNpcScheduleStatus(template.npcId, {
          season: gameStore.season,
          day: gameStore.day,
          hour: gameStore.hour,
          weather: gameStore.weather,
          festivalId
        })
        return {
          id: template.id,
          regionId: template.regionId,
          title: template.title,
          summary: template.summary,
          detailLines: [...template.detailLines],
          sourceNpcId: template.npcId,
          sourceNpcName: getNpcById(template.npcId)?.name ?? template.npcId,
          sourceLocation: scheduleStatus.location,
          relationshipStage,
          relationshipStageLabel: getRelationshipStageLabel(relationshipStage),
          targetRouteId: template.targetRouteId,
          tags: [...template.tags],
          requiresManualExploration: true
        } satisfies RegionRumorSupplyEntry
      })
      .sort((left, right) => {
        const stageDelta = getRelationshipStageRank(right.relationshipStage) - getRelationshipStageRank(left.relationshipStage)
        return stageDelta !== 0 ? stageDelta : left.sourceNpcName.localeCompare(right.sourceNpcName, 'zh-CN')
      })
  }

  /** 同步关系奖励（兼容旧存档缺字段；返回提示日志） */
  const syncRelationshipPerks = (
    targetNpcId?: string,
    options: { grantInventoryRewards?: boolean; emitMessages?: boolean } = {}
  ): string[] => {
    const inventoryStore = useInventoryStore()
    const cookingStore = useCookingStore()
    const grantInventoryRewards = options.grantInventoryRewards ?? true
    const emitMessages = options.emitMessages ?? true
    const messages: string[] = []
    const targets = targetNpcId ? npcStates.value.filter(state => state.npcId === targetNpcId) : npcStates.value

    for (const state of targets) {
      state.unlockedPerks = state.unlockedPerks ?? []
      const stage = getRelationshipStage(state.npcId)
      const npcName = getNpcById(state.npcId)?.name ?? state.npcId
      const benefits = NPC_RELATIONSHIP_BENEFITS.filter(benefit => benefit.npcId === state.npcId)
      for (const benefit of benefits) {
        const stageReached = getRelationshipStageFromState(state.friendship, {
          dating: state.dating,
          married: state.married,
          zhiji: state.zhiji,
          hasChild: state.married && children.value.length > 0 && getSpouse()?.npcId === state.npcId
        })
        if (state.unlockedPerks.includes(benefit.id)) continue
        const reached = ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family'].indexOf(stageReached) >=
          ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family'].indexOf(benefit.minStage)
        if (!reached) continue

        let shouldMarkUnlocked = false

        if (benefit.type === 'recipe' && benefit.recipeId) {
          shouldMarkUnlocked = true
          const recipeUnlocked = cookingStore.unlockRecipe(benefit.recipeId)
          if (emitMessages) {
            messages.push(recipeUnlocked ? `${npcName}愿意把新的食谱教给你了。` : `${npcName}正式认可了你们的交情。`)
          }
        }

        else if (benefit.type === 'item' && benefit.itemReward) {
          if (!grantInventoryRewards) continue
          if (!inventoryStore.canAddItem(benefit.itemReward.itemId, benefit.itemReward.quantity)) {
            if (emitMessages) {
              const itemName = getItemById(benefit.itemReward.itemId)?.name ?? benefit.itemReward.itemId
              messages.push(`${npcName}想送你${itemName}×${benefit.itemReward.quantity}，但背包空间不足。`)
            }
            continue
          }
          if (!inventoryStore.addItemExact(benefit.itemReward.itemId, benefit.itemReward.quantity)) continue
          shouldMarkUnlocked = true
          if (emitMessages) {
            const itemName = getItemById(benefit.itemReward.itemId)?.name ?? benefit.itemReward.itemId
            messages.push(`${npcName}送来了${itemName}×${benefit.itemReward.quantity}。`)
          }
        }

        else if (benefit.type === 'clue' && benefit.clueText) {
          shouldMarkUnlocked = true
          if (addRelationshipClue(state.npcId, benefit.id, benefit.clueText) && emitMessages) {
            messages.push(`${npcName}向你透露了一条新的生活线索。`)
          }
        }

        else if (benefit.type === 'shop_discount') {
          shouldMarkUnlocked = true
          if (emitMessages) messages.push(`${npcName}把你当自己人了：${benefit.summary}。`)
        }

        else if (benefit.type === 'quest_unlock') {
          shouldMarkUnlocked = true
          if (emitMessages) messages.push(`${npcName}开始愿意把更私人的委托交给你。`)
        }

        if (shouldMarkUnlocked) state.unlockedPerks.push(benefit.id)
      }

      const stageLabel = RELATIONSHIP_STAGE_META[stage].label
      const stageMarker = `stage:${state.npcId}:${stage}`
      if (!state.unlockedPerks.includes(stageMarker)) {
        state.unlockedPerks.push(stageMarker)
        if (emitMessages && stage !== 'recognize') {
          messages.push(`${npcName}和你的关系进入了「${stageLabel}」阶段。`)
        }
      }
    }

    return messages
  }

  /** 检查NPC今天是否生日 */
  const isBirthday = (npcId: string): boolean => {
    const npcDef = getNpcById(npcId)
    if (!npcDef?.birthday) return false
    const gameStore = useGameStore()
    return npcDef.birthday.season === gameStore.season && npcDef.birthday.day === gameStore.day
  }

  /** 获取今天过生日的NPC (null if none) */
  const getTodayBirthdayNpc = (): string | null => {
    const gameStore = useGameStore()
    for (const npc of NPCS) {
      if (npc.birthday && npc.birthday.season === gameStore.season && npc.birthday.day === gameStore.day) {
        return npc.id
      }
    }
    return null
  }

  /** 检查是否有可触发的心事件（对话后调用） */
  const checkHeartEvent = (npcId: string): HeartEventDef | null => {
    const state = getNpcState(npcId)
    if (!state) return null
    const events = getHeartEventsForNpc(npcId)
    for (const event of events) {
      // 知己事件仅知己触发
      if (event.requiresZhiji && !state.zhiji) continue
      // 已婚后不再触发普通婚前心事件
      if (state.married && !event.requiresZhiji) continue
      // 知己不触发恋爱告白（heart_8）
      if (!event.requiresZhiji && state.zhiji && event.id.endsWith('_heart_8')) continue
      if (state.friendship >= event.requiredFriendship && !state.triggeredHeartEvents.includes(event.id)) {
        return event
      }
    }
    return null
  }

  /** 标记心事件为已触发 */
  const markHeartEventTriggered = (npcId: string, eventId: string) => {
    const state = getNpcState(npcId)
    if (state && !state.triggeredHeartEvents.includes(eventId)) {
      state.triggeredHeartEvents.push(eventId)
    }
  }

  /** 调整好感度（心事件选择结果） */
  const adjustFriendship = (npcId: string, amount: number): string[] => {
    const state = getNpcState(npcId)
    if (state) {
      state.friendship = Math.min(Math.max(0, state.friendship + amount), getEffectiveFriendshipCap(state))
      return syncRelationshipPerks(npcId)
    }
    return []
  }

  /** 替换对话中的占位符 */
  const replaceDialoguePlaceholders = (text: string): string => {
    const playerStore = usePlayerStore()
    return text.replace(/\{player\}/g, playerStore.playerName).replace(/\{title\}/g, playerStore.honorific)
  }

  /** 与NPC对话 (+20好感) */
  const talkTo = (npcId: string): { message: string; friendshipGain: number; unlockedMessages?: string[] } | null => {
    const state = getNpcState(npcId)
    if (!state) return null
    if (state.talkedToday) return null
    const gameStore = useGameStore()
    const cookingStore = useCookingStore()

    state.talkedToday = true
    const cookingTopic = cookingStore.consumeStoryTriggerRecord(FIXED_NPC_TALK_COOKING_TOPIC_LABELS)
    const friendshipGain = 20 + (cookingTopic ? FIXED_NPC_COOKING_TOPIC_FRIENDSHIP_BONUS : 0)
    state.friendship = Math.min(state.friendship + friendshipGain, getEffectiveFriendshipCap(state))
    const unlockedMessages = syncRelationshipPerks(npcId)

    const npcDef = getNpcById(npcId)
    if (!npcDef) return null
    if (cookingTopic) {
      unlockedMessages.push(
        `${npcDef.name}顺着${cookingTopic.recipeName}聊起${cookingTopic.triggerLabels.join('、')}，这条料理话题被记进了今天的闲谈。`
      )
    }

    const scheduleStatus = getScheduleStatus(npcId)
    const todayEvent = getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext())
    const unlockedClueTemplate = unlockAmbientGiftClue(
      npcId,
      todayEvent
        ? ['festival', 'talk', 'home', 'shop', 'rumor', 'secret_note']
        : getRelationshipStageRank(getRelationshipStage(npcId)) >= getRelationshipStageRank('friend')
          ? ['talk', 'home', 'rumor', 'shop', 'secret_note']
          : ['talk', 'home', 'secret_note']
    )
    if (unlockedClueTemplate) {
      unlockedMessages.push(
        unlockedClueTemplate.source === 'festival'
          ? `${npcDef.name}在节庆里的举动让你记住了一点礼物偏好。`
          : `${npcDef.name}的话里藏着一条新的礼物线索。`
      )
    }
    if (scheduleStatus.specialDialogue) {
      return { message: replaceDialoguePlaceholders(scheduleStatus.specialDialogue), friendshipGain, unlockedMessages }
    }

    // 已婚NPC有特殊对话
    if (state.married) {
      const playerStore = usePlayerStore()
      const gameStore = useGameStore()
      const name = playerStore.playerName

      const marriedDialogues = [
        `${name}，今天辛苦了，早点回来吃饭。`,
        `我给${name}留了饭菜，还热着呢。`,
        '田里的活干完了吗？别太累了。',
        `有${name}在身边，每天都很开心。`,
        '今天想吃什么？我去准备。',
        '家里收拾好了，你歇会儿吧。',
        `和${name}在一起的日子，真好。`,
        `${name}，今天精神不错嘛。`
      ]

      const seasonDialogues: Record<string, string[]> = {
        spring: [`春天到了，院子里的花都开了呢。`, `${name}，春播忙完了吗？`],
        summer: [`好热啊……${name}多喝水。`, '夏天的西瓜最解暑了。'],
        autumn: [`秋天的风真舒服。${name}，要不要一起散步？`, '丰收的季节，辛苦种的东西都有了回报。'],
        winter: [`外面好冷，${name}快进屋暖和暖和。`, '冬天就该窝在家里喝热茶。']
      }

      const weatherDialogues: Record<string, string | null> = {
        rainy: '下雨了，田里不用浇水，在家歇歇吧。',
        stormy: '外面风雨好大，今天别出远门了。',
        snowy: '下雪了呢，外面白茫茫的，真好看。',
        windy: '风好大，出门小心别着凉了。',
        sunny: null,
        cloudy: null,
        green_rain: null
      }

      const pool = [...marriedDialogues, ...(seasonDialogues[gameStore.season] ?? [])]
      const weatherLine = weatherDialogues[gameStore.weather]
      if (weatherLine) pool.push(weatherLine)

      const message = pool[Math.floor(Math.random() * pool.length)]!
      return { message, friendshipGain, unlockedMessages }
    }

    // 知己NPC使用知己专属对话
    if (state.zhiji && npcDef.zhijiDialogues?.length) {
      const raw = npcDef.zhijiDialogues[Math.floor(Math.random() * npcDef.zhijiDialogues.length)]!
      const message = replaceDialoguePlaceholders(raw)
      return { message, friendshipGain, unlockedMessages }
    }

    // 约会中NPC使用约会对话
    if (state.dating && npcDef.datingDialogues && npcDef.datingDialogues.length > 0) {
      const raw = npcDef.datingDialogues[Math.floor(Math.random() * npcDef.datingDialogues.length)]!
      const message = replaceDialoguePlaceholders(raw)
      return { message, friendshipGain, unlockedMessages }
    }

    const level = getFriendshipLevel(npcId)
    const dialogues = npcDef.dialogues[level]
    const raw = dialogues[Math.floor(Math.random() * dialogues.length)]!
    const message = replaceDialoguePlaceholders(raw)

    return { message, friendshipGain, unlockedMessages }
  }

  /** 送礼给NPC (每天1次, 每周2次) */
  const giveGift = (
    npcId: string,
    itemId: string,
    giftBonusMultiplier: number = 1,
    quality: Quality = 'normal'
  ): {
    gain: number
    reaction: string
    birthdayMessage?: string
    returnedGift?: { itemId: string; quantity: number; summary: string }
    unlockedMessages?: string[]
  } | null => {
    const state = getNpcState(npcId)
    if (!state) return null
    if (state.giftedToday) return null
    if (state.giftsThisWeek >= 2) return null

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem(itemId, 1, quality)) return null
    const cookingStore = useCookingStore()

    state.giftedToday = true
    state.giftsThisWeek++
    const npcDef = getNpcById(npcId)
    if (!npcDef) return null

    let gain: number
    let reaction: string

    if (npcDef.lovedItems.includes(itemId)) {
      gain = 80
      reaction = '非常喜欢'
    } else if (npcDef.likedItems.includes(itemId)) {
      gain = 45
      reaction = '还不错'
    } else if (npcDef.hatedItems.includes(itemId)) {
      gain = -40
      reaction = '讨厌'
    } else {
      gain = 20
      reaction = '一般'
    }

    // 品质加成
    const qualityMultiplier: Record<Quality, number> = { normal: 1.0, fine: 1.25, excellent: 1.5, supreme: 2.0 }
    // 生日加成 (4倍)
    const birthdayMultiplier = isBirthday(npcId) ? 4 : 1

    gain = Math.floor(gain * qualityMultiplier[quality] * birthdayMultiplier * giftBonusMultiplier)
    state.friendship = Math.min(Math.max(0, state.friendship + gain), getEffectiveFriendshipCap(state))
    const unlockedMessages = syncRelationshipPerks(npcId)
    const cookingTopic = gain > 0 ? cookingStore.consumeStoryTriggerRecord(FIXED_NPC_GIFT_COOKING_TOPIC_LABELS) : null
    if (npcDef.lovedItems.includes(itemId)) unlockScriptedGiftClue(npcId, itemId, 'loved')
    else if (npcDef.likedItems.includes(itemId)) unlockScriptedGiftClue(npcId, itemId, 'liked')
    else if (npcDef.hatedItems.includes(itemId)) unlockScriptedGiftClue(npcId, itemId, 'hated')

    let birthdayMessage: string | undefined
    if (isBirthday(npcId) && gain > 0) {
      const birthdayBonus = Math.max(12, Math.floor(gain * 0.12))
      state.friendship = Math.min(state.friendship + birthdayBonus, getEffectiveFriendshipCap(state))
      unlockedMessages.push(`${npcDef.name}在生日当天收下了这份心意，关系又推进了一步。`)
      const birthdayLines = getNpcBirthdaySpecialLines(npcId)
      birthdayMessage = birthdayLines.length > 0 ? birthdayLines[Math.floor(Math.random() * birthdayLines.length)] : `${npcDef.name}在生日这天显得格外开心。`
      addRelationshipClue(npcId, `birthday:${npcId}`, `你记住了：${npcDef.name}在生日收到合心礼物时，会明显更愿意敞开心扉。`, {
        kind: 'birthday',
        source: 'birthday',
        precision: 'confirmed'
      })
    }
    if (cookingTopic && gain > 0) {
      const topicBonus = Math.max(1, Math.floor(gain * 0.08))
      state.friendship = Math.min(state.friendship + topicBonus, getEffectiveFriendshipCap(state))
      gain += topicBonus
      unlockedMessages.push(...syncRelationshipPerks(npcId))
      unlockedMessages.push(`${npcDef.name}认出了${cookingTopic.recipeName}里的送礼心意，额外增加了 ${topicBonus} 点好感。`)
    }
    const giftReturn = getNpcGiftReturn(npcId, getRelationshipStage(npcId))
    const returnedGift =
      giftReturn && inventoryStore.canAddItem(giftReturn.itemId, giftReturn.quantity)
        ? (inventoryStore.addItemExact(giftReturn.itemId, giftReturn.quantity)
            ? { itemId: giftReturn.itemId, quantity: giftReturn.quantity, summary: giftReturn.summary }
            : undefined)
        : undefined
    if (giftReturn && !returnedGift) {
      unlockedMessages.push('背包空间不足，未能收下对方回礼。')
    }

    return {
      gain,
      reaction,
      birthdayMessage,
      returnedGift,
      unlockedMessages
    }
  }

  /** 赠帕开启约会 (需2000好感/8心) */
  const startDating = (npcId: string): { success: boolean; message: string; unlockedMessages?: string[] } => {
    const lockId = `relationship_start_dating_${npcId}`
    if (!beginRelationshipAction(lockId)) return { success: false, message: '关系结算中，请勿重复点击。' }
    const snapshots = createRelationshipActionSnapshots()
    try {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }

    const npcDef = getNpcById(npcId)
    if (!npcDef?.marriageable) return { success: false, message: '无法与此人约会。' }

    if (!canPursueMarriageWithNpc(npcId)) return { success: false, message: '当前关系规则下，暂时无法与此人发展婚缘。' }

    if (state.dating) return { success: false, message: '你们已经在约会了。' }
    if (state.married) return { success: false, message: '你们已经结婚了。' }
    if (state.zhiji) return { success: false, message: '你们已是知己，需先断缘再发展婚缘。' }
    if (npcStates.value.some(s => s.married)) return { success: false, message: '你已经结婚了。' }
    if (state.friendship < 2000) return { success: false, message: '好感度不足（需要8心/2000）。' }

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('silk_ribbon')) {
      return { success: false, message: '需要一条丝帕。' }
    }

    state.dating = true
    state.friendship = Math.min(state.friendship + 160, getEffectiveFriendshipCap(state))
    return {
      success: true,
      message: `${npcDef.name}羞红了脸，接过了你的丝帕……你们开始约会了！`,
      unlockedMessages: syncRelationshipPerks(npcId)
    }
    } catch {
      rollbackRelationshipAction(snapshots)
      return { success: false, message: '约会结算失败，已回滚。' }
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  /** 求婚 (需2500好感/10心) */
  const propose = (npcId: string): { success: boolean; message: string; unlockedMessages?: string[] } => {
    const lockId = `relationship_propose_${npcId}`
    if (!beginRelationshipAction(lockId)) return { success: false, message: '关系结算中，请勿重复点击。' }
    const snapshots = createRelationshipActionSnapshots()
    try {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }

    const npcDef = getNpcById(npcId)
    if (!npcDef?.marriageable) return { success: false, message: '这个人无法求婚。' }

    if (!canPursueMarriageWithNpc(npcId)) return { success: false, message: '当前关系规则下，暂时无法与此人结婚。' }
    if (state.zhiji) return { success: false, message: '你们已是知己，需先断缘再求婚。' }

    // 检查是否已有配偶
    const alreadyMarried = npcStates.value.some(s => s.married)
    if (alreadyMarried) return { success: false, message: '你已经结婚了。' }

    // 检查是否正在筹备婚礼
    if (weddingCountdown.value > 0) return { success: false, message: '婚礼正在筹备中。' }

    // 需要先约会
    if (!state.dating) return { success: false, message: '需要先赠帕约会。' }
    if (state.zhiji) return { success: false, message: '你们已是知己，需先断缘再求婚。' }

    if (state.friendship < 2500) return { success: false, message: '好感度不足（需要10心/2500）。' }

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('jade_ring')) {
      return { success: false, message: '需要一枚翡翠戒指。' }
    }

    // 设置婚礼倒计时而非立即结婚
    weddingCountdown.value = 3
    weddingNpcId.value = npcId
    state.friendship = Math.min(state.friendship + 400, getEffectiveFriendshipCap(state))
    return {
      success: true,
      message: `${npcDef.name}含泪接受了你的翡翠戒指……婚礼将在3天后举行！`,
      unlockedMessages: syncRelationshipPerks(npcId)
    }
    } catch {
      rollbackRelationshipAction(snapshots)
      return { success: false, message: '求婚结算失败，已回滚。' }
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  /** 获取已婚配偶状态 */
  const getSpouse = (): NpcState | null => {
    return npcStates.value.find(s => s.married) ?? null
  }

  /** 获取知己状态 */
  const getZhiji = (): NpcState | null => {
    return npcStates.value.find(s => s.zhiji) ?? null
  }

  const getPendingFamilyExpansionKind = (): FamilyExpansionKind => getFamilyExpansionKindForNpc(getSpouse()?.npcId)

  const getChildProposalPrompt = (): string =>
    getPendingFamilyExpansionKind() === 'adoption' ? '最近我在想，我们是不是该迎一个孩子回家了？' : '最近我在想，我们是不是该要个孩子了？'

  const relationshipContentTier = computed<'P0' | 'P1' | 'P2'>(() => {
    if (
      children.value.length >= relationshipTuning.progression.tierUnlockChildCountP2 ||
      familyWishBoard.value.completedWishIds.length >= relationshipTuning.progression.tierUnlockCompletedWishCountP2 ||
      householdDivision.value.assignments.length > 1 ||
      zhijiCompanionProjects.value.some(project => project.completed)
    ) {
      return 'P2'
    }
    if (
      (getSpouse() && daysMarried.value >= relationshipTuning.progression.tierUnlockDaysMarriedP1) ||
      (getZhiji() && daysZhiji.value >= relationshipTuning.progression.tierUnlockDaysZhijiP1) ||
      familyWishBoard.value.activeWishId ||
      householdDivision.value.assignments.length > 0
    ) {
      return 'P1'
    }
    return 'P0'
  })

  const getAvailableHouseholdRoles = (npcId?: string) => {
    if (!relationshipFeatureFlags.householdDivisionEnabled) return []
    const state = npcId ? getNpcState(npcId) : null
    const npcDef = npcId ? getNpcById(npcId) : null
    return WS09_HOUSEHOLD_ROLE_DEFS.filter(role => {
      if (state && !state.married && !state.zhiji) return false
      if (npcDef?.householdRoleIds?.length && !npcDef.householdRoleIds.includes(role.id)) return false
      return relationshipTierRank[role.unlockTier] <= relationshipTierRank[relationshipContentTier.value]
    }).slice(0, relationshipTuning.display.householdRolePreviewLimit)
  }

  const getHouseholdRoleAssignment = (npcId: string) => householdDivision.value.assignments.find(entry => entry.npcId === npcId) ?? null

  const setNpcCompanionshipTier = (npcId: string, tier: 'P0' | 'P1' | 'P2') => {
    const state = getNpcState(npcId)
    if (!state) return null
    state.companionshipTier = maxRelationshipTier(state.companionshipTier, tier)
    return state
  }

  const assignHouseholdRole = (npcId: string, roleId: HouseholdRoleId, assignedWeekId = '') => {
    const lockId = `relationship_assign_role_${npcId}`
    if (!beginRelationshipAction(lockId)) return false
    try {
    const state = getNpcState(npcId)
    const roleDef = WS09_HOUSEHOLD_ROLE_DEFS.find(role => role.id === roleId)
    if (!state || !roleDef) return false
    state.activeHouseholdRoleId = roleId
    setNpcCompanionshipTier(npcId, roleDef.unlockTier)
    householdDivision.value.unlockTier = maxRelationshipTier(householdDivision.value.unlockTier, roleDef.unlockTier)
    householdDivision.value.assignments = [
      ...householdDivision.value.assignments.filter(entry => entry.npcId !== npcId),
      { npcId, roleId, assignedWeekId, progressDays: 0, completedCycles: 0 }
    ]
    return true
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  const clearHouseholdRole = (npcId: string) => {
    const state = getNpcState(npcId)
    if (state) state.activeHouseholdRoleId = null
    householdDivision.value.assignments = householdDivision.value.assignments.filter(entry => entry.npcId !== npcId)
  }

  const syncNpcRelationshipCooperationState = (npcId: string) => {
    const state = getNpcState(npcId)
    if (!state) return

    const canKeepHouseholdRole = state.married || state.zhiji
    householdDivision.value.assignments = householdDivision.value.assignments.filter(
      entry => entry.npcId !== npcId || canKeepHouseholdRole
    )
    state.activeHouseholdRoleId = canKeepHouseholdRole
      ? (householdDivision.value.assignments.find(entry => entry.npcId === npcId)?.roleId ?? null)
      : null

    if (!state.zhiji) {
      zhijiCompanionProjects.value = zhijiCompanionProjects.value.filter(project => project.npcId !== npcId)
    }
  }

  const syncRelationshipCooperationState = () => {
    const householdEligibleNpcIds = new Set(
      npcStates.value
        .filter(state => state.married || state.zhiji)
        .map(state => state.npcId)
    )
    householdDivision.value.assignments = householdDivision.value.assignments.filter(entry => householdEligibleNpcIds.has(entry.npcId))

    const zhijiNpcIds = new Set(
      npcStates.value
        .filter(state => state.zhiji)
        .map(state => state.npcId)
    )
    zhijiCompanionProjects.value = zhijiCompanionProjects.value.filter(project => zhijiNpcIds.has(project.npcId))

    for (const state of npcStates.value) {
      state.activeHouseholdRoleId = householdEligibleNpcIds.has(state.npcId)
        ? (householdDivision.value.assignments.find(entry => entry.npcId === state.npcId)?.roleId ?? null)
        : null
    }
  }

  const progressHouseholdRole = (npcId: string, deltaDays = 1) => {
    const entry = getHouseholdRoleAssignment(npcId)
    if (!entry) return null
    entry.progressDays = Math.max(0, entry.progressDays + deltaDays)
    if (entry.progressDays >= 7) {
      entry.completedCycles += 1
      entry.progressDays = 0
    }
    return entry
  }

  const getFamilyWishOverview = () => ({
    defs: relationshipFeatureFlags.familyWishEnabled
      ? ALL_FAMILY_WISH_DEFS
          .filter(def => relationshipTierRank[def.unlockTier] <= relationshipTierRank[relationshipContentTier.value])
          .slice(0, relationshipTuning.display.familyWishPreviewLimit)
      : [],
    config: WS09_FAMILY_WISH_BOARD_CONFIG,
    contentTier: relationshipContentTier.value,
    state: familyWishBoard.value
  })

  const getFamilyWishChainPreview = (wishId = familyWishBoard.value.activeWishId ?? '') => {
    const def = ALL_FAMILY_WISH_DEFS.find(wish => wish.id === wishId) ?? null
    if (!def) return null
    const isCompleted = familyWishBoard.value.completedWishIds.includes(wishId)
    const isActive = familyWishBoard.value.activeWishId === wishId
    const activeStepIndex = isCompleted ? (def.steps?.length ?? 0) : isActive ? 1 : 0
    return {
      def,
      progressLabel: isActive ? `${familyWishBoard.value.progress}/${Math.max(1, familyWishBoard.value.targetValue)}` : isCompleted ? '已完成' : '未开始',
      steps: (def.steps ?? []).map((step, index) => ({
        ...step,
        status: isCompleted
          ? 'completed'
          : index < activeStepIndex
            ? 'completed'
            : index === activeStepIndex
              ? 'active'
              : 'pending'
      }))
    }
  }

  const activateFamilyWish = (wishId: string, startedDayTag: string, expiresDayTag: string, targetValue: number, unlockTier: 'P0' | 'P1' | 'P2' = 'P0') => {
    const lockId = `relationship_family_wish_${wishId}`
    if (!beginRelationshipAction(lockId)) return
    try {
    if (!relationshipFeatureFlags.familyWishEnabled) return
    if (!ALL_FAMILY_WISH_DEFS.some(wish => wish.id === wishId)) return
    familyWishBoard.value = {
      ...familyWishBoard.value,
      unlockTier: maxRelationshipTier(familyWishBoard.value.unlockTier, unlockTier),
      activeWishId: wishId,
      progress: 0,
      targetValue,
      startedDayTag,
      expiresDayTag,
      rewardClaimed: false
    }
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  const updateFamilyWishProgress = (delta: number, targetValue = familyWishBoard.value.targetValue) => {
    familyWishBoard.value.progress = Math.max(0, familyWishBoard.value.progress + delta)
    familyWishBoard.value.targetValue = Math.max(0, targetValue)
    return familyWishBoard.value
  }

  const formatRelationshipRewardText = (reward?: RelationshipContentReward) => {
    if (!reward) return ''
    const parts: string[] = []
    const rewardMoney = Math.max(0, Math.floor(reward.money ?? 0))
    if (rewardMoney > 0) {
      parts.push(`铜钱+${rewardMoney}`)
    }
    for (const entry of reward.items ?? []) {
      if (!entry?.itemId || entry.quantity <= 0) continue
      parts.push(`${getItemById(entry.itemId)?.name ?? entry.itemId} x${entry.quantity}`)
    }
    return parts.join('、')
  }

  const grantRelationshipReward = (reward: RelationshipContentReward | undefined, sourceLabel: string) => {
    if (!reward) {
      return { success: true, rewardText: '' }
    }

    const inventoryStore = useInventoryStore()
    const playerStore = usePlayerStore()
    const rewardItems = (reward.items ?? [])
      .filter(entry => entry?.itemId && Number.isFinite(entry.quantity) && entry.quantity > 0)
      .map(entry => ({
        itemId: entry.itemId,
        quantity: Math.max(1, Math.floor(entry.quantity))
      }))

    if (rewardItems.length > 0 && !inventoryStore.addItemsExact(rewardItems)) {
      return {
        success: false,
        rewardText: '',
        message: `${sourceLabel}奖励发放失败：背包空间不足，请先整理背包后再试。`
      }
    }

    const rewardMoney = Math.max(0, Math.floor(reward.money ?? 0))
    if (rewardMoney > 0) {
      playerStore.earnMoney(rewardMoney, { system: 'system' })
    }

    return {
      success: true,
      rewardText: formatRelationshipRewardText({
        money: rewardMoney,
        items: rewardItems
      })
    }
  }

  const completeFamilyWish = (wishId = familyWishBoard.value.activeWishId ?? '') => {
    const lockId = `relationship_complete_wish_${wishId}`
    if (!beginRelationshipAction(lockId)) return false
    try {
      if (!wishId) return false
      const wishDef = ALL_FAMILY_WISH_DEFS.find(wish => wish.id === wishId)
      if (!wishDef) return false
      if (familyWishBoard.value.activeWishId !== wishId) return false
      if (familyWishBoard.value.rewardClaimed) return false
      if (familyWishBoard.value.completedWishIds.includes(wishId)) return false
      if (familyWishBoard.value.progress < Math.max(1, familyWishBoard.value.targetValue)) return false
      const rewardResult = grantRelationshipReward(wishDef.reward, `家庭心愿「${wishDef.title}」`)
      if (!rewardResult.success) {
        addLog(rewardResult.message ?? `家庭心愿「${wishDef.title}」奖励发放失败。`, {
          category: 'social',
          meta: { wishId }
        })
        return false
      }
      familyWishBoard.value = {
        ...familyWishBoard.value,
        activeWishId: null,
        progress: 0,
        targetValue: 0,
        startedDayTag: '',
        expiresDayTag: '',
        completedWishIds: familyWishBoard.value.completedWishIds.includes(wishId)
          ? familyWishBoard.value.completedWishIds
          : [...familyWishBoard.value.completedWishIds, wishId],
        streakCount: familyWishBoard.value.streakCount + 1,
        rewardClaimed: true
      }
      for (const state of npcStates.value.filter(entry => entry.married || entry.zhiji)) {
        if (!state.completedFamilyWishIds.includes(wishId)) {
          state.completedFamilyWishIds = [...state.completedFamilyWishIds, wishId]
        }
      }
      if (rewardResult.rewardText) {
        addLog(`【家庭心愿】已完成「${wishDef.title}」，奖励：${rewardResult.rewardText}。`, {
          category: 'social',
          meta: { wishId }
        })
      }
      return true
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  const getEligibleFamilyWishDefs = () => {
    const companionNpcIds = npcStates.value.filter(state => state.married || state.zhiji).map(state => state.npcId)
    const allowedWishIds = new Set(
      companionNpcIds.flatMap(npcId => getNpcById(npcId)?.familyWishIds ?? [])
    )
    return ALL_FAMILY_WISH_DEFS
      .filter(wish => allowedWishIds.has(wish.id))
      .filter(wish => relationshipTierRank[relationshipContentTier.value] >= relationshipTierRank[wish.unlockTier])
  }

  const getAutoFamilyWishProgressDelta = (wishId: string) => {
    const wishDef = ALL_FAMILY_WISH_DEFS.find(wish => wish.id === wishId)
    if (!wishDef) return 0
    const companionCount = npcStates.value.filter(state => state.married || state.zhiji).length
    const activeAssignmentCount = householdDivision.value.assignments.length
    const fishPondStore = useFishPondStore()
    switch (wishDef.linkedSystem) {
      case 'home':
        return Math.max(0, Math.max(activeAssignmentCount, companionCount) * 3)
      case 'fishing':
        return Math.max(0, fishPondStore.matureFish.length)
      case 'breeding':
        return Math.max(0, children.value.length + Math.max(1, companionCount))
      case 'quest':
        return Math.max(0, zhijiCompanionProjects.value.filter(project => !project.rewarded).length)
      case 'goal':
        return Math.max(0, familyWishBoard.value.completedWishIds.length)
      default:
        return 0
    }
  }

  const autoActivateFamilyWishForWeek = (currentDayTag: string) => {
    if (familyWishBoard.value.activeWishId) return null
    const candidates = getEligibleFamilyWishDefs().filter(wish => !familyWishBoard.value.completedWishIds.includes(wish.id))
    const nextWish = candidates[0] ?? null
    if (!nextWish) return null
    activateFamilyWish(
      nextWish.id,
      currentDayTag,
      addDaysToRelationshipDayTag(currentDayTag, nextWish.durationDays),
      nextWish.targetValue,
      nextWish.unlockTier
    )
    return nextWish
  }

  const autoRegisterZhijiProjectsForWeek = (currentWeekId: string) => {
    const registered: string[] = []
    for (const state of npcStates.value.filter(entry => entry.zhiji)) {
      const npcDef = getNpcById(state.npcId)
      const nextProjectId = (npcDef?.zhijiProjectIds ?? []).find(projectId => !getZhijiProjectState(projectId, state.npcId))
      if (!nextProjectId) continue
      if (registerZhijiProject(nextProjectId, state.npcId, currentWeekId)) {
        registered.push(`${state.npcId}:${nextProjectId}`)
      }
    }
    return registered
  }

  const autoProgressZhijiProjectsForWeek = () => {
    const rewarded: string[] = []
    for (const project of zhijiCompanionProjects.value) {
      if (project.rewarded) continue
      const projectDef = ALL_ZHIJI_COMPANION_PROJECT_DEFS.find(def => def.id === project.projectId)
      if (!projectDef) continue
      const fishPondStore = useFishPondStore()
      const delta =
        projectDef.linkedSystem === 'fishing'
          ? Math.max(1, fishPondStore.matureFish.length)
          : projectDef.linkedSystem === 'home'
            ? Math.max(1, householdDivision.value.assignments.length)
            : projectDef.linkedSystem === 'breeding'
              ? Math.max(1, children.value.length || familyWishBoard.value.completedWishIds.length)
              : 1
      progressZhijiProject(project.projectId, project.npcId, delta)
      if (project.completed && !project.rewarded && rewardZhijiProject(project.projectId, project.npcId)) {
        rewarded.push(`${project.npcId}:${project.projectId}`)
      }
    }
    return rewarded
  }

  const getZhijiProjectState = (projectId: string, npcId?: string) =>
    zhijiCompanionProjects.value.find(project => project.projectId === projectId && (npcId ? project.npcId === npcId : true)) ?? null

  const getZhijiProjectChainPreview = (projectId: string, npcId?: string) => {
    const def = ALL_ZHIJI_COMPANION_PROJECT_DEFS.find(project => project.id === projectId) ?? null
    if (!def) return null
    const state = getZhijiProjectState(projectId, npcId)
    const activeStepIndex = !state ? 0 : state.rewarded ? (def.steps?.length ?? 0) : state.completed ? 2 : 1
    return {
      def,
      state,
      progressLabel: state ? `${state.progress}/${Math.max(1, state.targetValue)}` : '未登记',
      steps: (def.steps ?? []).map((step, index) => ({
        ...step,
        status: state?.rewarded
          ? 'completed'
          : index < activeStepIndex
            ? 'completed'
            : index === activeStepIndex
              ? 'active'
              : 'pending'
      }))
    }
  }

  const activateNextFamilyWishForCurrentDay = () => {
    if (familyWishBoard.value.activeWishId) {
      const currentWish = ALL_FAMILY_WISH_DEFS.find(wish => wish.id === familyWishBoard.value.activeWishId)
      return {
        success: false,
        message: `当前已有进行中的家庭心愿：${currentWish?.title ?? familyWishBoard.value.activeWishId}。`
      }
    }
    const nextWish = getEligibleFamilyWishDefs().find(wish => !familyWishBoard.value.completedWishIds.includes(wish.id))
    if (!nextWish) {
      return { success: false, message: '当前没有可安排的新家庭心愿。' }
    }
    const gameStore = useGameStore()
    const currentDayTag = `${gameStore.year}-${gameStore.season}-${gameStore.day}`
    activateFamilyWish(
      nextWish.id,
      currentDayTag,
      addDaysToRelationshipDayTag(currentDayTag, nextWish.durationDays),
      nextWish.targetValue,
      nextWish.unlockTier
    )
    return {
      success: true,
      message: `已安排新的家庭心愿：${nextWish.title}。`,
      wishId: nextWish.id
    }
  }

  const registerZhijiProject = (projectId: string, npcId: string, activatedWeekId: string) => {
    const lockId = `relationship_register_zhiji_project_${projectId}_${npcId}`
    if (!beginRelationshipAction(lockId)) return false
    try {
    if (!relationshipFeatureFlags.zhijiProjectEnabled) return false
    const projectDef = ALL_ZHIJI_COMPANION_PROJECT_DEFS.find(project => project.id === projectId)
    const state = getNpcState(npcId)
    if (!projectDef || !state) return false
    state.unlockedCompanionProjectIds = state.unlockedCompanionProjectIds.includes(projectId)
      ? state.unlockedCompanionProjectIds
      : [...state.unlockedCompanionProjectIds, projectId]
    setNpcCompanionshipTier(npcId, projectDef.unlockTier)
    if (getZhijiProjectState(projectId, npcId)) return true
    zhijiCompanionProjects.value = [
      ...zhijiCompanionProjects.value,
      {
        projectId,
        npcId,
        unlockTier: projectDef.unlockTier,
        progress: 0,
        targetValue: projectDef.milestoneTarget,
        activatedWeekId,
        completed: false,
        rewarded: false
      }
    ]
    return true
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  const progressZhijiProject = (projectId: string, npcId: string, delta = 1) => {
    const project = getZhijiProjectState(projectId, npcId)
    if (!project) return null
    project.progress = Math.max(0, project.progress + delta)
    project.completed = project.progress >= project.targetValue
    return project
  }

  const rewardZhijiProject = (projectId: string, npcId: string) => {
    const lockId = `relationship_reward_zhiji_project_${projectId}_${npcId}`
    if (!beginRelationshipAction(lockId)) return false
    try {
      const project = getZhijiProjectState(projectId, npcId)
      if (!project || !project.completed) return false
      if (project.rewarded) return false
      const projectDef = ALL_ZHIJI_COMPANION_PROJECT_DEFS.find(def => def.id === projectId)
      if (!projectDef) return false
      const rewardResult = grantRelationshipReward(projectDef.reward, `知己协作「${projectDef.label}」`)
      if (!rewardResult.success) {
        addLog(rewardResult.message ?? `知己协作「${projectDef.label}」奖励发放失败。`, {
          category: 'social',
          meta: { projectId, npcId }
        })
        return false
      }
      project.rewarded = true
      if (rewardResult.rewardText) {
        addLog(`【知己协作】${getNpcById(npcId)?.name ?? npcId} 完成「${projectDef.label}」，奖励：${rewardResult.rewardText}。`, {
          category: 'social',
          meta: { projectId, npcId }
        })
      }
      return true
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  const registerNextZhijiProjectForCurrentWeek = () => {
    const zhijiState = getZhiji()
    if (!zhijiState) {
      return { success: false, message: '当前没有可协作的知己。' }
    }
    const npcDef = getNpcById(zhijiState.npcId)
    const nextProjectId = (npcDef?.zhijiProjectIds ?? []).find(projectId => !getZhijiProjectState(projectId, zhijiState.npcId))
    if (!nextProjectId) {
      return { success: false, message: '当前没有新的知己协作项目可登记。' }
    }
    const gameStore = useGameStore()
    const currentWeekId = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId
    const registered = registerZhijiProject(nextProjectId, zhijiState.npcId, currentWeekId)
    if (!registered) {
      return { success: false, message: '知己协作项目登记失败，请稍后再试。' }
    }
    const projectDef = ALL_ZHIJI_COMPANION_PROJECT_DEFS.find(def => def.id === nextProjectId)
    return {
      success: true,
      message: `已为${npcDef?.name ?? zhijiState.npcId}登记知己协作：${projectDef?.label ?? nextProjectId}。`,
      projectId: nextProjectId
    }
  }

  const processRelationshipCycleTick = (payload: {
    currentDayTag: string
    currentWeekId: string
    startedNewWeek: boolean
  }) => {
    const logs: string[] = []
    householdDivision.value.unlockTier = relationshipContentTier.value
    familyWishBoard.value.unlockTier = maxRelationshipTier(familyWishBoard.value.unlockTier, relationshipContentTier.value)

    for (const entry of householdDivision.value.assignments) {
      entry.progressDays += 1
      if (entry.progressDays >= 7) {
        entry.completedCycles += relationshipTuning.operations.householdWeeklyProgressCap
        entry.progressDays = 0
        const npcName = getNpcById(entry.npcId)?.name ?? entry.npcId
        logs.push(`【家庭分工】${npcName}的协作分工已完成 1 个周期。`)
      }
    }
    householdDivision.value.lastSettlementDayTag = payload.currentDayTag

    if (payload.startedNewWeek) {
      for (const child of children.value) {
        child.trainingState.lessonsThisWeek = 0
      }
      familyWishBoard.value.rerollCount = 0
      const zhijiRegistrations = autoRegisterZhijiProjectsForWeek(payload.currentWeekId)
      const rewardedProjects = autoProgressZhijiProjectsForWeek()
      if (familyWishBoard.value.activeWishId) {
        const weeklyWishProgress = getAutoFamilyWishProgressDelta(familyWishBoard.value.activeWishId)
        if (weeklyWishProgress > 0) {
          updateFamilyWishProgress(weeklyWishProgress)
        }
        if (familyWishBoard.value.progress >= Math.max(1, familyWishBoard.value.targetValue)) {
          const completedWishId = familyWishBoard.value.activeWishId
          if (completeFamilyWish(completedWishId)) {
            logs.push(`【家庭心愿】本周家庭心愿「${completedWishId}」已完成。`)
          } else {
            logs.push(`【家庭心愿】${completedWishId} 已达到完成条件，但奖励发放受阻，已保留至下次重试。`)
          }
        } else if (
          familyWishBoard.value.expiresDayTag &&
          isRelationshipDayTagExpired(familyWishBoard.value.expiresDayTag, payload.currentDayTag)
        ) {
          logs.push(`【家庭心愿】本周家庭心愿「${familyWishBoard.value.activeWishId}」已过期，将在下周重新编排。`)
          familyWishBoard.value = {
            ...familyWishBoard.value,
            activeWishId: null,
            progress: 0,
            targetValue: 0,
            startedDayTag: '',
            expiresDayTag: '',
            rewardClaimed: false
          }
        }
      }
      const autoWish = autoActivateFamilyWishForWeek(payload.currentDayTag)
      if (autoWish) {
        logs.push(`【家庭心愿】已为本周自动编排心愿「${autoWish.title}」。`)
      }
      for (const registration of zhijiRegistrations) {
        const [npcId = '', projectId = ''] = registration.split(':')
        logs.push(`【知己协作】${getNpcById(npcId)?.name ?? npcId} 已接入协作项目「${projectId}」。`)
      }
      for (const reward of rewardedProjects) {
        const [npcId = '', projectId = ''] = reward.split(':')
        logs.push(`【知己协作】${getNpcById(npcId)?.name ?? npcId} 的协作项目「${projectId}」已完成并结算。`)
      }
      zhijiCompanionProjects.value = zhijiCompanionProjects.value.map(project =>
        project.completed
          ? project
          : {
              ...project,
              activatedWeekId: payload.currentWeekId
            }
      )
    }

    return {
      logs,
      householdAssignmentCount: householdDivision.value.assignments.length,
      activeFamilyWishId: familyWishBoard.value.activeWishId,
      zhijiProjectCount: zhijiCompanionProjects.value.length,
      tuning: relationshipTuning
    }
  }

  /** 赠玉结为知己 (需同性+2000好感) */
  const becomeZhiji = (npcId: string): { success: boolean; message: string; unlockedMessages?: string[] } => {
    const lockId = `relationship_become_zhiji_${npcId}`
    if (!beginRelationshipAction(lockId)) return { success: false, message: '关系结算中，请勿重复点击。' }
    const snapshots = createRelationshipActionSnapshots()
    try {
    const state = getNpcState(npcId)
    if (!state) return { success: false, message: 'NPC不存在。' }

    const npcDef = getNpcById(npcId)
    if (!npcDef?.marriageable) return { success: false, message: '无法与此人结为知己。' }

    const playerStore = usePlayerStore()
    if (npcDef.gender !== playerStore.gender) {
      return { success: false, message: '只能与同性结为知己。' }
    }

    if (state.zhiji) return { success: false, message: '你们已经是知己了。' }
    if (state.dating || state.married) return { success: false, message: '无法与恋人或伴侣结为知己。' }
    if (npcStates.value.some(s => s.zhiji)) return { success: false, message: '你已经有知己了。' }
    if (state.friendship < 2000) return { success: false, message: '好感度不足（需要8心/2000）。' }

    const inventoryStore = useInventoryStore()
    if (!inventoryStore.removeItem('zhiji_jade')) {
      return { success: false, message: '需要一块知己玉佩。' }
    }

    state.zhiji = true
    state.friendship = Math.min(state.friendship + 160, getEffectiveFriendshipCap(state))
    const label = playerStore.gender === 'male' ? '蓝颜知己' : '红颜知己'
    return {
      success: true,
      message: `${npcDef.name}郑重地接过了玉佩……你们结为了${label}！`,
      unlockedMessages: syncRelationshipPerks(npcId)
    }
    } catch {
      rollbackRelationshipAction(snapshots)
      return { success: false, message: '知己结缘失败，已回滚。' }
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  /** 断绝知己之缘 */
  const dissolveZhiji = (): { success: boolean; message: string } => {
    const lockId = 'relationship_dissolve_zhiji'
    if (!beginRelationshipAction(lockId)) return { success: false, message: '关系结算中，请勿重复点击。' }
    const snapshots = createRelationshipActionSnapshots()
    try {
    const zhijiState = getZhiji()
    if (!zhijiState) return { success: false, message: '你还没有知己。' }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(10000)) {
      return { success: false, message: '金钱不足（需要10000文）。' }
    }

    const npcDef = getNpcById(zhijiState.npcId)
    zhijiState.zhiji = false
    zhijiState.friendship = 1000
    daysZhiji.value = 0
    syncNpcRelationshipCooperationState(zhijiState.npcId)

    return { success: true, message: `你和${npcDef?.name ?? '知己'}的知己之缘已断。` }
    } catch {
      rollbackRelationshipAction(snapshots)
      return { success: false, message: '断缘失败，已回滚。' }
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  /** 每日婚礼倒计时更新 */
  const dailyWeddingUpdate = (): { weddingToday: boolean; npcId: string | null; unlockedMessages?: string[] } => {
    if (weddingCountdown.value <= 0 || !weddingNpcId.value) {
      return { weddingToday: false, npcId: null }
    }
    weddingCountdown.value--
    if (weddingCountdown.value <= 0) {
      const npcId = weddingNpcId.value
      if (!canPursueMarriageWithNpc(npcId)) {
        cancelWedding()
        return { weddingToday: false, npcId: null, unlockedMessages: [] }
      }
      const state = getNpcState(npcId)
      if (state) {
        state.married = true
        state.dating = false
        state.friendship = Math.max(state.friendship, 3500)
      }
      weddingNpcId.value = null
      return { weddingToday: true, npcId, unlockedMessages: syncRelationshipPerks(npcId) }
    }
    return { weddingToday: false, npcId: null, unlockedMessages: [] }
  }

  /** 取消婚礼 */
  const cancelWedding = () => {
    weddingCountdown.value = 0
    weddingNpcId.value = null
  }

  /** 离婚 */
  const divorce = (): { success: boolean; message: string } => {
    const lockId = 'relationship_divorce'
    if (!beginRelationshipAction(lockId)) return { success: false, message: '关系结算中，请勿重复点击。' }
    const snapshots = createRelationshipActionSnapshots()
    try {
    const spouse = getSpouse()
    if (!spouse) return { success: false, message: '你还没有结婚。' }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(30000)) {
      return { success: false, message: '金钱不足（需要30000文）。' }
    }

    const npcDef = getNpcById(spouse.npcId)
    spouse.married = false
    spouse.dating = false
    spouse.friendship = 1000
    pregnancy.value = null
    childProposalPending.value = false
    daysMarried.value = 0
    cancelWedding()
    syncNpcRelationshipCooperationState(spouse.npcId)

    return { success: true, message: `你和${npcDef?.name ?? '配偶'}的婚姻结束了。` }
    } catch {
      rollbackRelationshipAction(snapshots)
      return { success: false, message: '和离失败，已回滚。' }
    } finally {
      finishRelationshipAction(lockId)
    }
  }

  /** 放生子女 */
  const releaseChild = (childId: number): { success: boolean; message: string } => {
    const child = children.value.find(c => c.id === childId)
    if (!child) return { success: false, message: '找不到这个孩子。' }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(10000)) {
      return { success: false, message: '金钱不足（需要10000文）。' }
    }

    const name = child.name
    children.value = children.value.filter(c => c.id !== childId)
    return { success: true, message: `${name}被送往了远方亲戚家。` }
  }

  // ============================================================
  // 孕期养成系统
  // ============================================================

  const PREGNANCY_STAGE_CONFIG: Record<PregnancyStage, { days: number; label: string }> = {
    early: { days: 5, label: '初期' },
    mid: { days: 5, label: '中期' },
    late: { days: 5, label: '后期' },
    ready: { days: 3, label: '待产期' }
  }

  const STAGE_ORDER: PregnancyStage[] = ['early', 'mid', 'late', 'ready']

  const MEDICAL_PLANS = {
    normal: { cost: 1000, successRate: 0.8, label: '普通接生' },
    advanced: { cost: 5000, successRate: 0.95, label: '高级接生' },
    luxury: { cost: 15000, successRate: 1.0, label: '豪华接生' }
  } as const

  /** 检查配偶是否应提议要孩子（每日调用） */
  const checkChildProposal = (): boolean => {
    const spouse = getSpouse()
    if (!spouse) return false
    if (children.value.length >= 2) return false
    if (pregnancy.value !== null) return false
    if (childProposalPending.value) return false
    if (daysMarried.value < 7) return false
    if (spouse.friendship < 3000) return false
    if (getFamilyExpansionKindForNpc(spouse.npcId) === 'adoption' && !isSameSexFamilyExpansionEnabled()) return false
    // 拒绝冷却：7天基础 + 每次拒绝额外7天
    if (childProposalDeclinedCount.value > 0) {
      const cooldownDays = 7 + childProposalDeclinedCount.value * 7
      if (daysSinceProposalDecline.value < cooldownDays) return false
    }
    return Math.random() < 0.05
  }

  /** 触发提议（设置等待标记） */
  const triggerChildProposal = () => {
    childProposalPending.value = true
  }

  /** 玩家回应提议 */
  const respondToChildProposal = (response: ProposalResponse): { message: string; friendshipChange: number } => {
    if (!childProposalPending.value) return { message: '当前没有待回应的家庭提议。', friendshipChange: 0 }
    if (pregnancy.value) return { message: '当前已有进行中的家庭扩展。', friendshipChange: 0 }
    childProposalPending.value = false
    const spouse = getSpouse()
    if (!spouse) return { message: '当前没有可回应的家庭提议。', friendshipChange: 0 }
    const expansionKind = getPendingFamilyExpansionKind()
    if (expansionKind === 'adoption' && !isSameSexFamilyExpansionEnabled()) {
      return { message: '当前关系规则下，暂时无法继续该家庭扩展。', friendshipChange: 0 }
    }

    switch (response) {
      case 'accept':
        pregnancy.value = {
          kind: expansionKind,
          stage: 'early',
          daysInStage: 0,
          stageDays: PREGNANCY_STAGE_CONFIG.early.days,
          careScore: 50,
          caredToday: false,
          giftedToday: false,
          giftedForPregnancy: false,
          companionToday: false,
          supportPlan: null,
          medicalPlan: null,
          careMilestoneIds: []
        }
        if (spouse) spouse.friendship = Math.min(spouse.friendship + 100, getEffectiveFriendshipCap(spouse))
        childProposalDeclinedCount.value = 0
        daysSinceProposalDecline.value = 0
        return { message: expansionKind === 'adoption' ? '你们决定一起迎一个孩子回家。' : '你们决定迎接新的家庭成员。', friendshipChange: 100 }

      case 'decline':
        if (spouse) spouse.friendship = Math.max(0, spouse.friendship - 50)
        childProposalDeclinedCount.value++
        daysSinceProposalDecline.value = 0
        return { message: '你委婉地拒绝了。', friendshipChange: -50 }

      case 'wait':
        daysSinceProposalDecline.value = 0
        childProposalDeclinedCount.value++ // 也计入冷却
        return { message: '你说了再等等看。', friendshipChange: 0 }
    }
  }

  /** 孕期照料操作 */
  const performPregnancyCare = (
    action: 'gift' | 'companion' | 'supplement' | 'rest'
  ): { success: boolean; message: string; careGain: number } => {
    if (!pregnancy.value) return { success: false, message: '当前没有进行中的家庭扩展。', careGain: 0 }
    if (pregnancy.value.caredToday) return { success: false, message: '今天已经照料过了。', careGain: 0 }

    const expansionKind = pregnancy.value.kind ?? 'pregnancy'
    let careGain = 0
    let message = ''

    switch (action) {
      case 'gift': {
        if (pregnancy.value.giftedForPregnancy) {
          return { success: false, message: expansionKind === 'adoption' ? '今天已经准备过心意了。' : '今天已经送过礼物了。', careGain: 0 }
        }
        pregnancy.value.giftedToday = true
        pregnancy.value.giftedForPregnancy = true
        careGain = pregnancy.value.stage === 'early' ? 5 : 3
        message = expansionKind === 'adoption' ? '你们认真准备了一份迎接新成员的心意。' : '你送了一份贴心的礼物。'
        break
      }
      case 'companion': {
        if (pregnancy.value.companionToday) {
          return { success: false, message: '今天已经陪伴过了。', careGain: 0 }
        }
        pregnancy.value.companionToday = true
        careGain = pregnancy.value.stage === 'mid' ? 5 : 3
        message = expansionKind === 'adoption' ? '你们一起外出走访，聊了很多关于未来的事。' : '你陪伴了一会儿，聊了很多。'
        break
      }
      case 'supplement': {
        const inventoryStore = useInventoryStore()
        const supplementItems: { id: string; gain: number }[] =
          expansionKind === 'adoption'
            ? [
                { id: 'cloth', gain: 6 },
                { id: 'silk_cloth', gain: 5 },
                { id: 'felt', gain: 4 }
              ]
            : [
                { id: 'ginseng', gain: 6 },
                { id: 'ginseng_tea', gain: 5 },
                { id: 'herb', gain: 3 },
                { id: 'green_tea_drink', gain: 3 },
                { id: 'chrysanthemum_tea', gain: 3 },
                { id: 'osmanthus_tea', gain: 3 }
              ]
        let found = false
        for (const si of supplementItems) {
          if (inventoryStore.removeItem(si.id, 1)) {
            found = true
            careGain = si.gain
            const itemDef = getItemById(si.id)
            message = expansionKind === 'adoption' ? `你们置办了${itemDef?.name ?? '安置用品'}。` : `服用了${itemDef?.name ?? '补品'}。`
            break
          }
        }
        if (!found) {
          return {
            success: false,
            message: expansionKind === 'adoption' ? '缺少适合的安置用品。' : '没有合适的补品（人参/草药/茶饮）。',
            careGain: 0
          }
        }
        break
      }
      case 'rest': {
        careGain = pregnancy.value.stage === 'late' ? 5 : 2
        message = expansionKind === 'adoption' ? '你们把宅院又整理了一遍，准备迎接新成员。' : '你让配偶好好休息了一天。'
        break
      }
    }

    pregnancy.value.careScore = Math.min(100, pregnancy.value.careScore + careGain)
    pregnancy.value.caredToday = true
    return { success: true, message, careGain }
  }

  /** 选择接生方式（仅待产期） */
  const chooseMedicalPlan = (plan: 'normal' | 'advanced' | 'luxury'): { success: boolean; message: string } => {
    if (!pregnancy.value) return { success: false, message: '当前没有待确认的家庭扩展。' }
    if (pregnancy.value.stage !== 'ready') return { success: false, message: '还没到最终准备阶段。' }

    const planInfo = MEDICAL_PLANS[plan]
    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(planInfo.cost)) {
      return { success: false, message: `金钱不足（需要${planInfo.cost}文）。` }
    }

    pregnancy.value.supportPlan = plan
    pregnancy.value.medicalPlan = plan
    const planLabel =
      (pregnancy.value.kind ?? 'pregnancy') === 'adoption'
        ? ({ normal: '普通安置', advanced: '体面安置', luxury: '圆满安置' } as const)[plan]
        : planInfo.label
    return { success: true, message: `选择了${planLabel}（${planInfo.cost}文）。` }
  }

  /** 分娩处理（内部方法） */
  const handleDelivery = (): {
    born?: { name: string; quality: 'normal' | 'premature' | 'healthy'; origin: 'birth' | 'adoption' }
    miscarriage?: boolean
    placementFailed?: boolean
    unlockedMessages?: string[]
  } => {
    if (!pregnancy.value) return {}

    const spouse = getSpouse()
    const expansionKind = pregnancy.value.kind ?? 'pregnancy'

    const plan = pregnancy.value.medicalPlan ?? 'normal'
    const planInfo = MEDICAL_PLANS[plan]

    // 成功率 = 医疗方案基础率 + 安产分加成（最高+15%）
    const careBonus = (pregnancy.value.careScore / 100) * 0.15
    const totalSuccessRate = Math.min(1.0, planInfo.successRate + careBonus)

    const success = Math.random() < totalSuccessRate

    if (!success) {
      pregnancy.value = null
      const spouse = getSpouse()
      if (spouse) {
        spouse.friendship = Math.max(0, spouse.friendship - 200)
      }
      return expansionKind === 'adoption' ? { placementFailed: true } : { miscarriage: true }
    }

    // 根据安产分决定出生品质
    const birthQuality: 'normal' | 'premature' | 'healthy' =
      expansionKind === 'adoption'
        ? (pregnancy.value.careScore >= 80 ? 'healthy' : 'normal')
        : (pregnancy.value.careScore >= 80 ? 'healthy' : pregnancy.value.careScore < 40 ? 'premature' : 'normal')

    const isBoy = Math.random() < 0.5
    const namePool = isBoy ? CHILD_NAMES_MALE : CHILD_NAMES_FEMALE
    const usedNames = children.value.map(c => c.name)
    const availableNames = namePool.filter(n => !usedNames.includes(n))
    const name = availableNames[Math.floor(Math.random() * availableNames.length)] ?? '小宝'

    const origin: 'birth' | 'adoption' = expansionKind === 'adoption' ? 'adoption' : 'birth'

    children.value.push({
      id: nextChildId.value++,
      name,
      daysOld: 0,
      stage: 'baby',
      friendship: birthQuality === 'healthy' ? 30 : 0,
      interactedToday: false,
      birthQuality,
      origin,
      trainingState: createDefaultChildTrainingState()
    })

    pregnancy.value = null
    return {
      born: { name, quality: birthQuality, origin },
      unlockedMessages: spouse ? syncRelationshipPerks(spouse.npcId) : []
    }
  }

  /** 每日孕期更新 */
  const dailyPregnancyUpdate = (): {
    stageChanged?: { from: PregnancyStage; to: PregnancyStage; kind: FamilyExpansionKind }
    born?: { name: string; quality: 'normal' | 'premature' | 'healthy'; origin: 'birth' | 'adoption' }
    miscarriage?: boolean
    placementFailed?: boolean
    unlockedMessages?: string[]
  } => {
    // 结婚天数递增
    if (getSpouse()) daysMarried.value++

    // 拒绝冷却计时递增
    if (childProposalDeclinedCount.value > 0) {
      daysSinceProposalDecline.value++
    }

    if (!pregnancy.value) return { unlockedMessages: [] }

    // 重置每日照料标记
    pregnancy.value.caredToday = false
    pregnancy.value.giftedForPregnancy = false
    pregnancy.value.companionToday = false

    pregnancy.value.daysInStage++

    // 检查阶段完成
    if (pregnancy.value.daysInStage >= pregnancy.value.stageDays) {
      const currentStageIndex = STAGE_ORDER.indexOf(pregnancy.value.stage)

      if (pregnancy.value.stage === 'ready') {
        // 分娩
        return handleDelivery()
      }

      // 进入下一阶段
      const from = pregnancy.value.stage
      const nextStage = STAGE_ORDER[currentStageIndex + 1]!
      const kind = pregnancy.value.kind ?? 'pregnancy'
      pregnancy.value.stage = nextStage
      pregnancy.value.daysInStage = 0
      pregnancy.value.stageDays = PREGNANCY_STAGE_CONFIG[nextStage].days

      return { stageChanged: { from, to: nextStage, kind }, unlockedMessages: [] }
    }

    return { unlockedMessages: [] }
  }

  /** 每日子女成长更新（仅已出生子女） */
  const dailyChildUpdate = () => {
    for (const child of children.value) {
      child.daysOld++
      child.interactedToday = false
      if (child.stage === 'baby' && child.daysOld >= 14) {
        child.stage = 'toddler'
      } else if (child.stage === 'toddler' && child.daysOld >= 28) {
        child.stage = 'child'
      } else if (child.stage === 'child' && child.daysOld >= 56) {
        child.stage = 'teen'
      }
    }
  }

  /** 与子女互动 */
  const interactWithChild = (childId: number): { message: string; item?: string } | null => {
    const child = children.value.find(c => c.id === childId)
    if (!child) return null
    if (child.interactedToday) return null
    if (child.stage === 'baby') return null

    child.interactedToday = true
    child.friendship = Math.min(300, child.friendship + 2)

    if (child.stage === 'child' && Math.random() < 0.1) {
      const finds = ['wood', 'herb', 'pine_cone', 'wild_berry']
      const item = finds[Math.floor(Math.random() * finds.length)]!
      return { message: `${child.name}递给你一个东西。`, item }
    }

    return { message: `你和${child.name}玩了一会儿。(+2好感)` }
  }

  /** 检查NPC是否有每日提示功能 */
  const hasDailyTip = (npcId: string): boolean => {
    return (TIP_NPC_IDS as readonly string[]).includes(npcId)
  }

  /** 检查NPC今天是否已给过提示 */
  const isTipGivenToday = (npcId: string): boolean => {
    return tipGivenToday.value[npcId] ?? false
  }

  /** 获取NPC的每日提示 */
  const getDailyTip = (npcId: string): string | null => {
    if (!hasDailyTip(npcId)) return null
    if (tipGivenToday.value[npcId]) return null

    tipGivenToday.value[npcId] = true
    const gameStore = useGameStore()

    switch (npcId) {
      case 'li_yu':
        return WEATHER_TIPS[gameStore.tomorrowWeather]
      case 'zhou_xiucai':
        return getFortuneTip(gameStore.dailyLuck)
      case 'wang_dashen': {
        const cookingStore = useCookingStore()
        const unlockedRecipes = RECIPES.filter(r => cookingStore.unlockedRecipes.includes(r.id))
        if (unlockedRecipes.length === 0) return NO_RECIPE_TIP
        // 每周推荐一个固定食谱（基于年+周数的种子）
        const weekIndex = Math.floor((gameStore.day - 1) / 7)
        const seed = (gameStore.year - 1) * 16 + ['spring', 'summer', 'autumn', 'winter'].indexOf(gameStore.season) * 4 + weekIndex
        const recipe = unlockedRecipes[seed % unlockedRecipes.length]!
        const ingredientNames = recipe.ingredients.map(ing => {
          const item = getItemById(ing.itemId)
          return item ? `${item.name}×${ing.quantity}` : ing.itemId
        })
        return getRecipeTipMessage(recipe.name, ingredientNames)
      }
      case 'liu_cunzhang':
        return getLivingTip(gameStore.day, gameStore.year)
      default:
        return null
    }
  }

  /** 每日重置对话和送礼状态 + 伴侣好感衰减 */
  const dailyReset = () => {
    const gameStore = useGameStore()

    // 重置每日提示
    tipGivenToday.value = {}
    ensureRandomVisitorsForCurrentWeek()
    randomNpcBoard.value.activeVisitors.forEach(visitor => {
      visitor.talkedToday = false
    })

    for (const state of npcStates.value) {
      // 只有已婚伴侣不聊天才会掉好感，普通NPC不衰减
      if (!state.talkedToday && state.married) {
        state.friendship = Math.max(0, state.friendship - 10)
      }
      // 知己不聊天也会掉好感（衰减较少）
      if (!state.talkedToday && state.zhiji) {
        state.friendship = Math.max(0, state.friendship - 5)
      }
      state.talkedToday = false
      state.giftedToday = false
      // 每周日重置周送礼计数 (day 7,14,21,28)
      if (gameStore.day % 7 === 0) {
        state.giftsThisWeek = 0
      }
    }

    // 美观度好感加成
    const decorationStore = useDecorationStore()
    const beautyBonus = decorationStore.dailyFriendshipBonus
    if (beautyBonus > 0) {
      for (const state of npcStates.value) {
        const cap = getEffectiveFriendshipCap(state)
        state.friendship = Math.min(cap, state.friendship + beautyBonus)
      }
    }

    // 知己天数递增
    if (getZhiji()) daysZhiji.value++
  }

  const getRelationshipCompanionshipAuditOverview = () => {
    const spouse = getSpouse()
    const zhiji = getZhiji()
    const partneredNpcCount = npcStates.value.filter(state => state.dating || state.married || state.zhiji).length
    const totalTriggeredHeartEventCount = npcStates.value.reduce((total, state) => total + state.triggeredHeartEvents.length, 0)
    return {
      baselineSummary: relationshipCompanionshipBaselineAudit.baselineSummary,
      coreMetrics: relationshipCompanionshipBaselineAudit.coreMetrics,
      guardrailMetrics: relationshipCompanionshipBaselineAudit.guardrailMetrics,
      rollbackRules: relationshipCompanionshipBaselineAudit.rollbackRules,
      linkedSystems: relationshipCompanionshipBaselineAudit.linkedSystems,
      linkedSystemRefs: relationshipCompanionshipBaselineAudit.linkedSystemRefs,
      auditSubjectPools: relationshipCompanionshipBaselineAudit.auditSubjectPools,
      spouseNpcId: spouse?.npcId ?? null,
      zhijiNpcId: zhiji?.npcId ?? null,
      partneredNpcCount,
      childCount: children.value.length,
      pregnancyStage: pregnancy.value?.stage ?? null,
      weddingCountdown: weddingCountdown.value,
      activeHelperCount: hiredHelpers.value.length,
      activeHelperTaskLabels: hiredHelpers.value.map(helper => HELPER_TASK_NAMES[helper.task]),
      householdDivision: householdDivision.value,
      familyWishBoard: familyWishBoard.value,
      zhijiCompanionProjectCount: zhijiCompanionProjects.value.length,
      relationshipClueCount: relationshipClues.value.length,
      totalTriggeredHeartEventCount
    }
  }

  const getRelationshipDebugSnapshot = () => ({
    contentTier: relationshipContentTier.value,
    spouseNpcId: getSpouse()?.npcId ?? null,
    zhijiNpcId: getZhiji()?.npcId ?? null,
    householdAssignments: householdDivision.value.assignments,
    familyWishBoard: familyWishBoard.value,
    zhijiCompanionProjects: zhijiCompanionProjects.value,
    childCount: children.value.length,
    pregnancy: pregnancy.value,
    hiredHelpers: hiredHelpers.value
  })

  const serialize = () => {
    return {
      npcStates: npcStates.value,
      relationshipClues: relationshipClues.value,
      householdDivision: householdDivision.value,
      familyWishBoard: familyWishBoard.value,
      zhijiCompanionProjects: zhijiCompanionProjects.value,
      children: children.value,
      nextChildId: nextChildId.value,
      daysMarried: daysMarried.value,
      daysZhiji: daysZhiji.value,
      pregnancy: pregnancy.value,
      childProposalPending: childProposalPending.value,
      childProposalDeclinedCount: childProposalDeclinedCount.value,
      daysSinceProposalDecline: daysSinceProposalDecline.value,
      // 旧字段保留以兼容
      pendingChild: false,
      childCountdown: 0,
      weddingCountdown: weddingCountdown.value,
      weddingNpcId: weddingNpcId.value,
      hiredHelpers: hiredHelpers.value,
      randomNpcBoard: randomNpcBoard.value,
      friendshipVersion: 3
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    const isOldScale = !(data as any).friendshipVersion || (data as any).friendshipVersion < 2
    const rawStates = Array.isArray((data as any)?.npcStates) ? (data as any).npcStates : []
    const savedStates: NpcState[] = rawStates
      .filter((s: any) => s && typeof s === 'object' && typeof s.npcId === 'string' && validNpcIds.has(s.npcId))
      .map((s: any): NpcState => ({
        ...buildDefaultNpcState(s.npcId),
        ...s,
        // 旧存档好感度迁移: ×8 (300制→2500制)
        friendship: Math.max(0, isOldScale ? Math.round((Number(s.friendship) || 0) * 8) : Number(s.friendship) || 0),
        talkedToday: !!s.talkedToday,
        giftedToday: !!s.giftedToday,
        married: !!s.married,
        dating: !!s.dating,
        zhiji: !!s.zhiji,
        giftsThisWeek: Math.max(0, Number(s.giftsThisWeek) || 0),
        triggeredHeartEvents: Array.isArray(s.triggeredHeartEvents) ? s.triggeredHeartEvents.filter((id: unknown) => typeof id === 'string') : [],
        unlockedPerks: Array.isArray(s.unlockedPerks) ? s.unlockedPerks.filter((id: unknown) => typeof id === 'string') : []
      }))
    // 合并：保留已保存的状态，为新增NPC补充默认状态
    const savedIds = new Set(savedStates.map(s => s.npcId))
    const newNpcStates: NpcState[] = NPCS.filter(npc => !savedIds.has(npc.id)).map(npc => buildDefaultNpcState(npc.id))
    npcStates.value = [...savedStates, ...newNpcStates]
    relationshipClues.value = (Array.isArray((data as any).relationshipClues) ? (data as any).relationshipClues : [])
      .filter((clue: any) => clue && typeof clue === 'object' && clue?.clueId && clue?.text)
      .map((clue: any): RelationshipClueEntry | null => {
        const npcId = typeof clue.npcId === 'string' && validNpcIds.has(clue.npcId) ? clue.npcId : null
        if (!npcId) return null
        const rawClueId = String(clue.clueId)
        const rawKind = clue.kind
        const rawSource = clue.source
        const rawPrecision = clue.precision
        let itemId = typeof clue.itemId === 'string' ? clue.itemId : undefined
        let preference: Exclude<GiftPreference, 'neutral'> | undefined =
          clue.preference === 'loved' || clue.preference === 'liked' || clue.preference === 'hated' ? clue.preference : undefined
        if (!itemId || !preference) {
          const scriptedMatch = rawClueId.match(/^gift_check:([^:]+):([^:]+):(loved|liked|hated)$/)
          if (scriptedMatch) {
            itemId = itemId ?? scriptedMatch[2]
            preference = preference ?? (scriptedMatch[3] as Exclude<GiftPreference, 'neutral'>)
          }
        }
        const kind =
          rawKind === 'gift' || rawKind === 'birthday' || rawKind === 'habit' || rawKind === 'festival'
            ? rawKind
            : rawClueId.startsWith('birthday:')
              ? 'birthday'
              : 'gift'
        const source =
          rawSource === 'talk' ||
          rawSource === 'festival' ||
          rawSource === 'home' ||
          rawSource === 'secret_note' ||
          rawSource === 'shop' ||
          rawSource === 'rumor' ||
          rawSource === 'gift_test' ||
          rawSource === 'birthday'
            ? rawSource
            : rawClueId.startsWith('birthday:')
              ? 'birthday'
              : rawClueId.startsWith('gift_check:')
                ? 'gift_test'
                : 'rumor'
        const precision =
          rawPrecision === 'hint' || rawPrecision === 'exact' || rawPrecision === 'confirmed'
            ? rawPrecision
            : rawClueId.startsWith('birthday:') || rawClueId.startsWith('gift_check:')
              ? 'confirmed'
              : 'exact'
        return {
          npcId,
          clueId: rawClueId,
          text: String(clue.text),
          kind,
          source,
          precision,
          discoveredDayTag: typeof clue.discoveredDayTag === 'string' ? clue.discoveredDayTag : undefined,
          itemId,
          preference
        }
      })
      .filter((clue: RelationshipClueEntry | null): clue is RelationshipClueEntry => Boolean(clue))
    householdDivision.value = (() => {
      const raw = (data as any).householdDivision
      if (!raw || typeof raw !== 'object') return createDefaultHouseholdDivisionState()
      return {
        version: Math.max(1, Number(raw.version) || 1),
        unlockTier: ['P0', 'P1', 'P2'].includes(raw.unlockTier) ? raw.unlockTier : 'P0',
        assignments: Array.isArray(raw.assignments)
          ? raw.assignments
              .filter((entry: any) => entry && typeof entry === 'object' && typeof entry.npcId === 'string')
              .map((entry: any) => ({
                npcId: entry.npcId,
                roleId: ['field_support', 'home_care', 'craft_assist', 'social_coordination'].includes(entry.roleId) ? entry.roleId : 'field_support',
                assignedWeekId: typeof entry.assignedWeekId === 'string' ? entry.assignedWeekId : '',
                progressDays: Math.max(0, Number(entry.progressDays) || 0),
                completedCycles: Math.max(0, Number(entry.completedCycles) || 0)
              }))
          : [],
        lastSettlementDayTag: typeof raw.lastSettlementDayTag === 'string' ? raw.lastSettlementDayTag : '',
        pendingRewardIds: Array.isArray(raw.pendingRewardIds) ? raw.pendingRewardIds.filter((id: unknown) => typeof id === 'string') : []
      }
    })()
    familyWishBoard.value = (() => {
      const raw = (data as any).familyWishBoard
      if (!raw || typeof raw !== 'object') return createDefaultFamilyWishBoardState()
      return {
        version: Math.max(1, Number(raw.version) || 1),
        unlockTier: ['P0', 'P1', 'P2'].includes(raw.unlockTier) ? raw.unlockTier : 'P0',
        activeWishId: typeof raw.activeWishId === 'string' ? raw.activeWishId : null,
        completedWishIds: Array.isArray(raw.completedWishIds) ? raw.completedWishIds.filter((id: unknown) => typeof id === 'string') : [],
        rerollCount: Math.max(0, Number(raw.rerollCount) || 0),
        streakCount: Math.max(0, Number(raw.streakCount) || 0),
        progress: Math.max(0, Number(raw.progress) || 0),
        targetValue: Math.max(0, Number(raw.targetValue) || 0),
        startedDayTag: typeof raw.startedDayTag === 'string' ? raw.startedDayTag : '',
        expiresDayTag: typeof raw.expiresDayTag === 'string' ? raw.expiresDayTag : '',
        rewardClaimed: !!raw.rewardClaimed
      }
    })()
    zhijiCompanionProjects.value = (Array.isArray((data as any).zhijiCompanionProjects) ? (data as any).zhijiCompanionProjects : [])
      .filter((project: any) => project && typeof project === 'object' && typeof project.projectId === 'string' && typeof project.npcId === 'string')
      .map((project: any) => ({
        projectId: project.projectId,
        npcId: project.npcId,
        unlockTier: ['P0', 'P1', 'P2'].includes(project.unlockTier) ? project.unlockTier : 'P0',
        progress: Math.max(0, Number(project.progress) || 0),
        targetValue: Math.max(0, Number(project.targetValue) || 0),
        activatedWeekId: typeof project.activatedWeekId === 'string' ? project.activatedWeekId : '',
        completed: !!project.completed,
        rewarded: !!project.rewarded
      }))
    syncRelationshipCooperationState()
    children.value = (Array.isArray((data as any).children) ? (data as any).children : [])
      .filter((c: any) => c && typeof c === 'object')
      .map((c: any) => ({
        id: Number(c.id) || 0,
        name: typeof c.name === 'string' ? c.name : '小宝',
        daysOld: Math.max(0, Number(c.daysOld) || 0),
        stage: ['baby', 'toddler', 'child', 'teen'].includes(c.stage) ? c.stage : 'baby',
        friendship: Math.max(0, Number(c.friendship) || 0),
        interactedToday: !!c.interactedToday,
        birthQuality: ['normal', 'premature', 'healthy'].includes(c.birthQuality) ? c.birthQuality : 'normal',
        origin: c.origin === 'adoption' ? 'adoption' : 'birth',
        trainingState: c.trainingState && typeof c.trainingState === 'object'
          ? {
              focus: ['farm', 'craft', 'social', 'spirit'].includes(c.trainingState.focus) ? c.trainingState.focus : null,
              lessonsThisWeek: Math.max(0, Number(c.trainingState.lessonsThisWeek) || 0),
              milestoneIds: Array.isArray(c.trainingState.milestoneIds)
                ? c.trainingState.milestoneIds.filter((id: unknown) => typeof id === 'string').slice(-8)
                : [],
              familyInfluenceFocus: ['farm', 'craft', 'social', 'spirit'].includes(c.trainingState.familyInfluenceFocus)
                ? c.trainingState.familyInfluenceFocus
                : null,
              familyInfluenceSource: typeof c.trainingState.familyInfluenceSource === 'string'
                ? c.trainingState.familyInfluenceSource
                : '',
              familyInfluenceHistory: sanitizeChildTrainingInfluenceHistory(c.trainingState.familyInfluenceHistory)
            }
          : createDefaultChildTrainingState()
      }))
    // 旧存档无 nextChildId → 从已有子女推算
    nextChildId.value = Math.max(
      0,
      Number((data as any).nextChildId) || (children.value.length > 0 ? Math.max(...children.value.map((c: ChildState) => c.id)) + 1 : 0)
    )
    daysMarried.value = (data as any).daysMarried ?? 0
    daysZhiji.value = (data as any).daysZhiji ?? 0

    // 新孕期系统
    pregnancy.value = (() => {
      const rawPregnancy = (data as any).familyExpansion ?? (data as any).pregnancy
      if (!rawPregnancy || typeof rawPregnancy !== 'object') return null
      const pregnancyStages: PregnancyStage[] = ['early', 'mid', 'late', 'ready']
      const stage: PregnancyStage = pregnancyStages.includes(rawPregnancy.stage as PregnancyStage) ? (rawPregnancy.stage as PregnancyStage) : 'early'
      return {
        kind: rawPregnancy.kind === 'adoption' ? 'adoption' : 'pregnancy',
        stage,
        daysInStage: Math.max(0, Number(rawPregnancy.daysInStage) || 0),
        stageDays: Math.max(1, Number(rawPregnancy.stageDays) || PREGNANCY_STAGE_CONFIG[stage].days),
        careScore: Math.max(0, Math.min(100, Number(rawPregnancy.careScore) || 0)),
        caredToday: !!rawPregnancy.caredToday,
        giftedToday: !!(rawPregnancy.giftedToday ?? rawPregnancy.giftedForPregnancy),
        giftedForPregnancy: !!rawPregnancy.giftedForPregnancy,
        companionToday: !!rawPregnancy.companionToday,
        supportPlan: ['normal', 'advanced', 'luxury'].includes(rawPregnancy.supportPlan) ? rawPregnancy.supportPlan : ['normal', 'advanced', 'luxury'].includes(rawPregnancy.medicalPlan) ? rawPregnancy.medicalPlan : null,
        medicalPlan: ['normal', 'advanced', 'luxury'].includes(rawPregnancy.medicalPlan) ? rawPregnancy.medicalPlan : null,
        careMilestoneIds: Array.isArray(rawPregnancy.careMilestoneIds)
          ? rawPregnancy.careMilestoneIds.filter((id: unknown) => typeof id === 'string')
          : []
      }
    })()
    childProposalPending.value = (data as any).childProposalPending ?? false
    childProposalDeclinedCount.value = (data as any).childProposalDeclinedCount ?? 0
    daysSinceProposalDecline.value = (data as any).daysSinceProposalDecline ?? 0

    // 旧存档迁移：pendingChild → pregnancy
    if ((data as any).pendingChild && !pregnancy.value) {
      const oldCountdown: number = (data as any).childCountdown ?? 0
      let stage: PregnancyStage = 'early'
      if (oldCountdown <= 3) stage = 'ready'
      else if (oldCountdown <= 8) stage = 'late'
      else if (oldCountdown <= 13) stage = 'mid'
      pregnancy.value = {
        kind: 'pregnancy',
        stage,
        daysInStage: 0,
        stageDays: PREGNANCY_STAGE_CONFIG[stage].days,
        careScore: 50,
        caredToday: false,
        giftedToday: false,
        giftedForPregnancy: false,
        companionToday: false,
        supportPlan: null,
        medicalPlan: null,
        careMilestoneIds: []
      }
    }

    weddingCountdown.value = (data as any).weddingCountdown ?? 0
    weddingNpcId.value = (data as any).weddingNpcId ?? null
    hiredHelpers.value = (Array.isArray((data as any).hiredHelpers) ? (data as any).hiredHelpers : [])
      .filter((helper: any) => helper && typeof helper === 'object' && typeof helper.npcId === 'string' && validNpcIds.has(helper.npcId))
      .map((helper: any) => {
        const task: FarmHelperTask = ['water', 'feed', 'harvest', 'weed'].includes(helper.task) ? helper.task : 'water'
        return {
          npcId: helper.npcId,
          task,
          dailyWage: Math.max(0, Number(helper.dailyWage) || HELPER_WAGES[task])
        }
      })
    randomNpcBoard.value = (() => {
      const raw = (data as any).randomNpcBoard
      if (!raw || typeof raw !== 'object') {
        return {
          version: 8,
          lastGeneratedWeekId: '',
          activeVisitors: [],
          acquaintanceIds: [],
          acquaintances: [],
          longStayResidents: [],
          recentSummaries: []
        }
      }
      const validTemplateIds = new Set(RANDOM_NPC_TEMPLATES.map(template => template.id))
      const sanitizeRelationshipTag = (tag: unknown): RandomNpcRelationshipTag =>
        tag === 'acquaintance' || tag === 'friend' || tag === 'ambiguous' || tag === 'old_contact' || tag === 'rival' ? tag : 'passing'
      const activeVisitors: RandomNpcVisitorState[] = (Array.isArray(raw.activeVisitors) ? raw.activeVisitors : [])
        .filter((visitor: any) => visitor && typeof visitor === 'object' && typeof visitor.id === 'string' && validTemplateIds.has(visitor.templateId))
        .slice(0, RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)
        .map((visitor: any): RandomNpcVisitorState => {
          const template = RANDOM_NPC_TEMPLATES.find(entry => entry.id === visitor.templateId)!
          return {
            id: visitor.id,
            templateId: template.id,
            name: typeof visitor.name === 'string' ? visitor.name : template.nameSeeds[0]!,
            ageBand: template.ageBand,
            gender: template.gender,
            occupation: template.occupation,
            origin: template.origin,
            personalityTags: [...template.personalityTags],
            speechStyle: template.speechStyle,
            appearanceKeywords: Array.isArray(visitor.appearanceKeywords)
              ? visitor.appearanceKeywords.filter((text: unknown) => typeof text === 'string').slice(0, 4)
              : [...template.appearanceKeywords],
            taboo: template.taboo,
            lifeGoal: template.lifeGoal,
            currentTrouble: template.currentTrouble,
            villagePurpose: typeof visitor.villagePurpose === 'string' ? visitor.villagePurpose : template.villagePurpose,
            romanceView: typeof visitor.romanceView === 'string' ? visitor.romanceView : template.romanceView,
            developmentRoutes: Array.isArray(visitor.developmentRoutes)
              ? visitor.developmentRoutes.filter((route: unknown): route is RandomNpcLongStayRoute =>
                route === 'business' || route === 'caregiving' || route === 'craft' || route === 'friendship'
              ).slice(0, 3)
              : [...template.developmentRoutes],
            plotHook: template.plotHook,
            familySeed: template.familySeed,
            preferences: {
              loved: [...template.preferences.loved],
              liked: [...template.preferences.liked],
              disliked: [...template.preferences.disliked]
            },
            dialogueOpening: template.dialogueOpening,
            dialogueChoices: template.dialogueChoices.map(choice => ({ ...choice })),
            dialogueScenes: sanitizeRandomNpcDialogueScenes(visitor.dialogueScenes, template.dialogueScenes),
            smallOrder: {
              ...template.smallOrder,
              requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
            },
            smallOrderCompleted: !!visitor.smallOrderCompleted,
            locked: !!visitor.locked,
            relationshipTag: sanitizeRelationshipTag(visitor.relationshipTag),
            affinity: Math.max(0, Math.min(100, Number(visitor.affinity) || 0)),
            firstVisitWeekId: typeof visitor.firstVisitWeekId === 'string' ? visitor.firstVisitWeekId : '',
            lastVisitDayTag: typeof visitor.lastVisitDayTag === 'string' ? visitor.lastVisitDayTag : '',
            talkedToday: !!visitor.talkedToday,
            conversationCount: Math.max(0, Number(visitor.conversationCount) || 0),
            keyEvents: Array.isArray(visitor.keyEvents) ? visitor.keyEvents.filter((entry: unknown) => typeof entry === 'string').slice(-6) : [],
            relationshipSignals: sanitizeRandomNpcRelationshipSignals(visitor.relationshipSignals),
            dialogueMemories: sanitizeRandomNpcDialogueMemories(visitor.dialogueMemories),
            shortRomance: sanitizeRandomNpcShortRomanceState(visitor.shortRomance),
            tier: visitor.tier === 'acquaintance' || visitor.tier === 'long_stay' ? visitor.tier : 'short_visit'
          }
        })
      const activeIds = new Set(activeVisitors.map(visitor => visitor.id))
      return {
        version: Math.max(8, Number(raw.version) || 1),
        lastGeneratedWeekId: typeof raw.lastGeneratedWeekId === 'string' ? raw.lastGeneratedWeekId : '',
        activeVisitors,
        acquaintanceIds: Array.isArray(raw.acquaintanceIds)
          ? raw.acquaintanceIds.filter((id: unknown) => typeof id === 'string' && activeIds.has(id)).slice(0, RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)
          : [],
        acquaintances: trimRandomNpcAcquaintances([
          ...(Array.isArray(raw.acquaintances) ? raw.acquaintances : [])
            .filter((entry: any) => entry && typeof entry === 'object' && typeof entry.visitorId === 'string' && validTemplateIds.has(entry.templateId))
            .map((entry: any): RandomNpcAcquaintanceEntry => {
              const template = RANDOM_NPC_TEMPLATES.find(item => item.id === entry.templateId)!
              return {
                visitorId: entry.visitorId,
                templateId: template.id,
                name: typeof entry.name === 'string' ? entry.name : template.nameSeeds[0]!,
                ageBand: template.ageBand,
                gender: template.gender,
                occupation: template.occupation,
                origin: template.origin,
                personalityTags: [...template.personalityTags],
                appearanceKeywords: Array.isArray(entry.appearanceKeywords)
                  ? entry.appearanceKeywords.filter((text: unknown) => typeof text === 'string').slice(0, 4)
                  : [...template.appearanceKeywords],
                villagePurpose: typeof entry.villagePurpose === 'string' ? entry.villagePurpose : template.villagePurpose,
                romanceView: typeof entry.romanceView === 'string' ? entry.romanceView : template.romanceView,
                developmentRoutes: Array.isArray(entry.developmentRoutes)
                  ? entry.developmentRoutes.filter((route: unknown): route is RandomNpcLongStayRoute =>
                    route === 'business' || route === 'caregiving' || route === 'craft' || route === 'friendship'
                  ).slice(0, 3)
                  : [...template.developmentRoutes],
                plotHook: template.plotHook,
                familySeed: template.familySeed,
                preferences: {
                  loved: [...template.preferences.loved],
                  liked: [...template.preferences.liked],
                  disliked: [...template.preferences.disliked]
                },
                dialogueScenes: sanitizeRandomNpcDialogueScenes(entry.dialogueScenes, template.dialogueScenes),
                smallOrder: {
                  ...template.smallOrder,
                  requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
                },
                smallOrderCompleted: !!entry.smallOrderCompleted,
                relationshipTag: sanitizeRelationshipTag(entry.relationshipTag),
                affinity: Math.max(0, Math.min(100, Number(entry.affinity) || 0)),
                firstMetWeekId: typeof entry.firstMetWeekId === 'string' ? entry.firstMetWeekId : '',
                firstMetDayTag: typeof entry.firstMetDayTag === 'string' ? entry.firstMetDayTag : '',
                lastSeenDayTag: typeof entry.lastSeenDayTag === 'string' ? entry.lastSeenDayTag : '',
                conversationCount: Math.max(0, Number(entry.conversationCount) || 0),
                keyEvents: Array.isArray(entry.keyEvents) ? entry.keyEvents.filter((text: unknown) => typeof text === 'string').slice(-6) : [],
                relationshipSignals: sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
                dialogueMemories: sanitizeRandomNpcDialogueMemories(entry.dialogueMemories),
                shortRomance: sanitizeRandomNpcShortRomanceState(entry.shortRomance)
              }
            }),
          ...activeVisitors
            .filter(visitor => Array.isArray(raw.acquaintanceIds) && raw.acquaintanceIds.includes(visitor.id))
            .map(visitor => createRandomNpcAcquaintanceEntry(visitor))
        ].filter((entry, index, entries) => entries.findIndex(item => item.visitorId === entry.visitorId) === index)),
        longStayResidents: trimRandomNpcLongStayResidents(
          (Array.isArray(raw.longStayResidents) ? raw.longStayResidents : [])
            .filter((entry: any) => entry && typeof entry === 'object' && typeof entry.sourceVisitorId === 'string' && validTemplateIds.has(entry.templateId))
            .map((entry: any): RandomNpcLongStayEntry => {
              const template = RANDOM_NPC_TEMPLATES.find(item => item.id === entry.templateId)!
              const route: RandomNpcLongStayRoute =
                entry.route === 'business' || entry.route === 'caregiving' || entry.route === 'craft' || entry.route === 'friendship'
                  ? entry.route
                  : getRandomNpcLongStayRoute(template.id)
              const stage = Number(entry.relationshipEventStage)
              return {
                residentId: typeof entry.residentId === 'string' ? entry.residentId : `resident:${entry.sourceVisitorId}`,
                sourceVisitorId: entry.sourceVisitorId,
                templateId: template.id,
                name: typeof entry.name === 'string' ? entry.name : template.nameSeeds[0]!,
                ageBand: template.ageBand,
                gender: template.gender,
                occupation: template.occupation,
                origin: template.origin,
                personalityTags: [...template.personalityTags],
                speechStyle: template.speechStyle,
                appearanceKeywords: Array.isArray(entry.appearanceKeywords)
                  ? entry.appearanceKeywords.filter((text: unknown) => typeof text === 'string').slice(0, 4)
                  : [...template.appearanceKeywords],
                taboo: template.taboo,
                lifeGoal: template.lifeGoal,
                currentTrouble: template.currentTrouble,
                villagePurpose: typeof entry.villagePurpose === 'string' ? entry.villagePurpose : template.villagePurpose,
                romanceView: typeof entry.romanceView === 'string' ? entry.romanceView : template.romanceView,
                developmentRoutes: Array.isArray(entry.developmentRoutes)
                  ? entry.developmentRoutes.filter((route: unknown): route is RandomNpcLongStayRoute =>
                    route === 'business' || route === 'caregiving' || route === 'craft' || route === 'friendship'
                  ).slice(0, 3)
                  : [...template.developmentRoutes],
                plotHook: template.plotHook,
                familySeed: template.familySeed,
                familyTies: sanitizeRandomNpcFamilyTies(entry.familyTies, template.familyTies),
                familyLine: sanitizeRandomNpcFamilyLineState(
                  entry.familyLine,
                  sanitizeRandomNpcFamilyTies(entry.familyTies, template.familyTies),
                  template.familyCommission
                ),
                preferences: {
                  loved: [...template.preferences.loved],
                  liked: [...template.preferences.liked],
                  disliked: [...template.preferences.disliked]
                },
                dialogueScenes: sanitizeRandomNpcDialogueScenes(entry.dialogueScenes, template.dialogueScenes),
                smallOrder: {
                  ...template.smallOrder,
                  requestedItems: template.smallOrder.requestedItems.map(item => ({ ...item }))
                },
                smallOrderCompleted: !!entry.smallOrderCompleted,
                relationshipTag: sanitizeRelationshipTag(entry.relationshipTag),
                affinity: Math.max(0, Math.min(100, Number(entry.affinity) || 0)),
                movedInDayTag: typeof entry.movedInDayTag === 'string' ? entry.movedInDayTag : '',
                residenceReason: typeof entry.residenceReason === 'string' ? entry.residenceReason : `${entry.name ?? template.nameSeeds[0]}决定在桃源村暂住。`,
                route,
                relationshipEventStage: stage === 2 || stage === 3 ? stage : stage === 0 ? 0 : 1,
                completedStoryEventIds: Array.isArray(entry.completedStoryEventIds)
                  ? entry.completedStoryEventIds.filter((text: unknown) => typeof text === 'string').slice(-6)
                  : [],
                lastStoryDayTag: typeof entry.lastStoryDayTag === 'string' ? entry.lastStoryDayTag : '',
                keyEvents: Array.isArray(entry.keyEvents) ? entry.keyEvents.filter((text: unknown) => typeof text === 'string').slice(-8) : [],
                relationshipSignals: sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
                dialogueMemories: sanitizeRandomNpcDialogueMemories(entry.dialogueMemories, RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT),
                relationshipLine: sanitizeRandomNpcRelationLineState(entry.relationshipLine)
              }
            })
            .filter((entry: RandomNpcLongStayEntry, index: number, entries: RandomNpcLongStayEntry[]) =>
              entries.findIndex(item => item.sourceVisitorId === entry.sourceVisitorId) === index
            )
        ),
        recentSummaries: trimRandomNpcArchives(
          (Array.isArray(raw.recentSummaries) ? raw.recentSummaries : [])
            .filter((entry: any) =>
              entry &&
              typeof entry === 'object' &&
              typeof entry.visitorId === 'string' &&
              typeof entry.templateId === 'string' &&
              validTemplateIds.has(entry.templateId)
            )
            .map((entry: any): RandomNpcArchiveSummary => {
              const template = RANDOM_NPC_TEMPLATES.find(item => item.id === entry.templateId)!
              const archivedTier = entry.archivedTier === 'long_stay' ? 'long_stay' : undefined
              return {
              visitorId: entry.visitorId,
              templateId: template.id,
              name: typeof entry.name === 'string' ? entry.name : '旧日来客',
              occupation: typeof entry.occupation === 'string' ? entry.occupation : '来访者',
              relationshipTag: sanitizeRelationshipTag(entry.relationshipTag),
              affinity: Math.max(0, Math.min(100, Number(entry.affinity) || 0)),
              lastSeenDayTag: typeof entry.lastSeenDayTag === 'string' ? entry.lastSeenDayTag : '',
              summary: typeof entry.summary === 'string' ? entry.summary : '',
              keyEvents: Array.isArray(entry.keyEvents) ? entry.keyEvents.filter((text: unknown) => typeof text === 'string').slice(-3) : [],
              smallOrderCompleted: !!entry.smallOrderCompleted,
              locked: !!entry.locked,
              relationshipSignals: sanitizeRandomNpcRelationshipSignals(entry.relationshipSignals),
              dialogueMemories: sanitizeRandomNpcDialogueMemories(entry.dialogueMemories, 3),
              shortRomance: sanitizeRandomNpcShortRomanceState(entry.shortRomance),
              archivedTier,
              longStaySnapshot: archivedTier === 'long_stay'
                ? sanitizeRandomNpcLongStayArchiveSnapshot(entry.longStaySnapshot, template, entry.visitorId)
                : undefined
              }
            })
        )
      }
    })()
    ensureRandomVisitorsForCurrentWeek()
    relationshipActionLocks.value = []
  }

  const rehydrateRelationshipPerks = (options: { grantInventoryRewards?: boolean; emitMessages?: boolean } = {}) => {
    return syncRelationshipPerks(undefined, {
      grantInventoryRewards: options.grantInventoryRewards ?? true,
      emitMessages: options.emitMessages ?? false
    })
  }

  return {
    npcStates,
    children,
    nextChildId,
    daysMarried,
    daysZhiji,
    familyExpansion,
    pregnancy,
    householdDivision,
    familyWishBoard,
    zhijiCompanionProjects,
    childProposalPending,
    childProposalDeclinedCount,
    daysSinceProposalDecline,
    weddingCountdown,
    weddingNpcId,
    hiredHelpers,
    randomNpcBoard,
    HELPER_WAGES,
    HELPER_TASK_NAMES,
    getNpcState,
    getFriendshipLevel,
    getRelationshipStage,
    getRelationshipStageText,
    getRelationshipStageDescription,
    getRelationshipBenefits,
    getRelationshipGiftReturnSummaries,
    getNextRelationshipBenefits,
    getRelationshipCluesForNpc,
    getKnownGiftPreference,
    getGiftKnowledgeSummary,
    getShopDiscountBonus,
    addRelationshipClue,
    getScheduleStatus,
    getScheduleTimeline,
    getNextScheduleText,
    getRegionRumorSupplyOverview,
    syncRelationshipPerks,
    relationshipClues,
    isBirthday,
    getTodayBirthdayNpc,
    checkHeartEvent,
    markHeartEventTriggered,
    adjustFriendship,
    talkTo,
    giveGift,
    startDating,
    propose,
    getSpouse,
    getZhiji,
    relationshipFeatureFlags,
    canPursueMarriageWithNpc,
    getFamilyExpansionKindForNpc,
    getPendingFamilyExpansionKind,
    getChildProposalPrompt,
    relationshipContentTier,
    getAvailableHouseholdRoles,
    getHouseholdRoleAssignment,
    assignHouseholdRole,
    clearHouseholdRole,
    progressHouseholdRole,
    getFamilyWishOverview,
    getFamilyWishChainPreview,
    activateFamilyWish,
    activateNextFamilyWishForCurrentDay,
    updateFamilyWishProgress,
    completeFamilyWish,
    getZhijiProjectState,
    getZhijiProjectChainPreview,
    registerZhijiProject,
    registerNextZhijiProjectForCurrentWeek,
    progressZhijiProject,
    rewardZhijiProject,
    processRelationshipCycleTick,
    becomeZhiji,
    dissolveZhiji,
    dailyWeddingUpdate,
    cancelWedding,
    divorce,
    releaseChild,
    getHireableNpcs,
    hireHelper,
    dismissHelper,
    processDailyHelpers,
    checkChildProposal,
    triggerChildProposal,
    respondToChildProposal,
    performFamilyExpansionCare: performPregnancyCare,
    performPregnancyCare,
    chooseFamilyExpansionPlan: chooseMedicalPlan,
    chooseMedicalPlan,
    dailyFamilyExpansionUpdate: dailyPregnancyUpdate,
    dailyPregnancyUpdate,
    interactWithChild,
    dailyChildUpdate,
    dailyReset,
    hasDailyTip,
    isTipGivenToday,
    getDailyTip,
    tipGivenToday,
    FAMILY_EXPANSION_STAGE_CONFIG: PREGNANCY_STAGE_CONFIG,
    PREGNANCY_STAGE_CONFIG,
    FAMILY_EXPANSION_PLANS: MEDICAL_PLANS,
    MEDICAL_PLANS,
    relationshipCompanionshipBaselineAudit,
    getRelationshipCompanionshipAuditOverview,
    getRelationshipDebugSnapshot,
    getRandomNpcBoard,
    talkToRandomVisitor,
    setRandomNpcLock,
    recallRandomNpcArchive,
    fulfillRandomNpcSmallOrder,
    canStartRandomNpcShortRomance,
    startRandomNpcShortRomance,
    endRandomNpcShortRomance,
    addRandomVisitorToAcquaintanceBook,
    promoteRandomNpcAcquaintanceToLongStay,
    getNextRandomNpcLongStayStoryEvent,
    progressRandomNpcLongStayStory,
    getRandomNpcFamilyCommission,
    canMeetRandomNpcFamilyTie,
    meetRandomNpcFamilyTie,
    fulfillRandomNpcFamilyCommission,
    canStartRandomNpcRelationLine,
    startRandomNpcRelationLine,
    severRandomNpcRelationLine,
    canEngageRandomNpcRelationLine,
    engageRandomNpcRelationLine,
    canMarryRandomNpcRelationLine,
    marryRandomNpcRelationLine,
    recordRandomNpcMarriedLife,
    canDevelopRandomNpcFamilyBusiness,
    developRandomNpcFamilyBusiness,
    canApplyRandomNpcFamilyInfluenceToChild,
    applyRandomNpcFamilyInfluenceToChild,
    rehydrateRelationshipPerks,
    serialize,
    deserialize
  }
})
