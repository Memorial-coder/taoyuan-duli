import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getItemById, getThemeWeekBySeason } from '@/data'
import { REWARD_TICKET_LABELS } from '@/data/rewardTickets'
import { WEEKLY_BUDGET_CHANNEL_MAP, WEEKLY_BUDGET_CHANNELS } from '@/data/weeklyBudgets'
import { ECONOMY_SINK_CONTENT_DEFS, ECONOMY_TUNING_CONFIG } from '@/data/market'
import type {
  LateGameMetricSnapshot,
  RewardTicketType,
  ThemeWeekState,
  WeeklyBudgetArchive,
  WeeklyBudgetChannelId,
  WeeklyBudgetPlan,
  WeeklyBudgetSelection,
  WeeklyBudgetTierDef,
  WeeklyMetricArchive
} from '@/types'
import { addLog, showFloat } from '@/composables/useGameLog'
import { useAchievementStore } from './useAchievementStore'
import { useFishingStore } from './useFishingStore'
import { useFishPondStore } from './useFishPondStore'
import { useGameStore, SEASON_NAMES } from './useGameStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useHomeStore } from './useHomeStore'
import { useInventoryStore } from './useInventoryStore'
import { useMuseumStore } from './useMuseumStore'
import { useNpcStore } from './useNpcStore'
import { usePlayerStore } from './usePlayerStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { useWalletStore } from './useWalletStore'
import { getWeekCycleInfo, type WeekCycleInfo } from '@/utils/weekCycle'

type GoalMetricKey =
  | 'totalMoneyEarned'
  | 'totalCropsHarvested'
  | 'totalFishCaught'
  | 'totalRecipesCooked'
  | 'highestMineFloor'
  | 'friendlyNpcCount'
  | 'farmhouseLevel'
  | 'completedBundles'
  | 'discoveredCount'
  | 'crabPotCount'
  | 'childCount'
  | 'caveUnlocked'
  | 'villageProjectLevel'
  | 'hanhaiContractCompletions'
  | 'museumExhibitLevel'
  | 'familyWishCompletions'

interface GoalRewardItem {
  itemId: string
  quantity: number
}

interface GoalReward {
  money?: number
  reputation?: number
  items?: GoalRewardItem[]
  unlockHint?: string
}

interface GoalTemplate {
  id: string
  title: string
  description: string
  metric: GoalMetricKey
  targetValue: number
  reward: GoalReward
}

type GoalSource = 'random' | 'season' | 'archetype_bias'

export interface GoalState extends GoalTemplate {
  baselineValue: number
  completed: boolean
  rewarded: boolean
  source: GoalSource
}

interface MainQuestStageTemplate {
  id: number
  title: string
  description: string
  conditions: GoalTemplate[]
  reward: GoalReward
}

export interface MainQuestStageState {
  id: number
  title: string
  description: string
  conditions: GoalState[]
  completed: boolean
  rewarded: boolean
  reward: GoalReward
}

const FRIENDSHIP_GOAL_LEVELS = new Set(['friendly', 'bestFriend'])
const GOAL_SAVE_VERSION = 3
const WEEKLY_METRIC_ARCHIVE_VERSION = 1
const WEEKLY_METRIC_ARCHIVE_LIMIT = 4
const WEEKLY_BUDGET_ARCHIVE_LIMIT = 8

const createEmptyWeeklyMetricArchive = (): WeeklyMetricArchive => ({
  version: WEEKLY_METRIC_ARCHIVE_VERSION,
  lastGeneratedWeekId: '',
  snapshots: []
})

const createEmptyWeeklyBudgetPlan = (weekId = '', activatedAtDayTag = ''): WeeklyBudgetPlan => ({
  weekId,
  activatedAtDayTag,
  completedGoalCount: 0,
  selections: {},
  ticketBalances: {}
})

const normalizeNumericRecord = <T extends string>(value: unknown): Partial<Record<T, number>> => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, amount]) => typeof key === 'string' && Number.isFinite(Number(amount)))
      .map(([key, amount]) => [key, Math.max(0, Number(amount) || 0)])
  ) as Partial<Record<T, number>>
}

const normalizeLateGameMetricSnapshot = (value: unknown): LateGameMetricSnapshot | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<LateGameMetricSnapshot>
  const season = raw.season
  const weekOfSeason = Number(raw.weekOfSeason)
  if (season !== 'spring' && season !== 'summer' && season !== 'autumn' && season !== 'winter') return null
  if (weekOfSeason !== 1 && weekOfSeason !== 2 && weekOfSeason !== 3 && weekOfSeason !== 4) return null

  return {
    weekId: typeof raw.weekId === 'string' ? raw.weekId : '',
    absoluteWeek: Math.max(0, Number(raw.absoluteWeek) || 0),
    year: Math.max(1, Number(raw.year) || 1),
    season,
    weekOfSeason,
    generatedAtDayTag: typeof raw.generatedAtDayTag === 'string' ? raw.generatedAtDayTag : '',
    periodStartDayTag: typeof raw.periodStartDayTag === 'string' ? raw.periodStartDayTag : '',
    periodEndDayTag: typeof raw.periodEndDayTag === 'string' ? raw.periodEndDayTag : '',
    totalIncome: Math.max(0, Number(raw.totalIncome) || 0),
    totalExpense: Math.max(0, Number(raw.totalExpense) || 0),
    netIncome: Number(raw.netIncome) || 0,
    sinkSpend: Math.max(0, Number(raw.sinkSpend) || 0),
    ticketBalances: normalizeNumericRecord(raw.ticketBalances),
    budgetInvestments: normalizeNumericRecord(raw.budgetInvestments),
    maintenanceCost: Math.max(0, Number(raw.maintenanceCost) || 0),
    serviceContractCount: Math.max(0, Number(raw.serviceContractCount) || 0),
    hanhaiContractCompletions: Math.max(0, Number(raw.hanhaiContractCompletions) || 0),
    fishPondContestScore: Math.max(0, Number(raw.fishPondContestScore) || 0),
    museumExhibitLevel: Math.max(0, Number(raw.museumExhibitLevel) || 0),
    socialParticipationScore: Math.max(0, Number(raw.socialParticipationScore) || 0),
    villageProsperityScore: Math.max(0, Number(raw.villageProsperityScore) || 0),
    sourceSnapshotCount: Math.max(0, Number(raw.sourceSnapshotCount) || 0),
    activeThemeWeekId: typeof raw.activeThemeWeekId === 'string' ? raw.activeThemeWeekId : undefined
  }
}

const normalizeWeeklyBudgetSelection = (value: unknown): WeeklyBudgetSelection | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<WeeklyBudgetSelection>
  const channelId = raw.channelId
  if (channelId !== 'trade' && channelId !== 'museum' && channelId !== 'academy') return null
  const channelDef = WEEKLY_BUDGET_CHANNEL_MAP[channelId]
  const tierDef =
    channelDef.tiers.find((tier: WeeklyBudgetTierDef) => tier.id === raw.tierId) ??
    channelDef.tiers.find((tier: WeeklyBudgetTierDef) => tier.tier === Number(raw.tier))
  if (!tierDef) return null

  return {
    channelId,
    tierId: tierDef.id,
    tier: tierDef.tier,
    tierLabel: tierDef.label,
    costMoney: tierDef.costMoney,
    projectedValue: tierDef.projectedValue,
    effect: tierDef.effect,
    activatedWeekId: typeof raw.activatedWeekId === 'string' ? raw.activatedWeekId : '',
    activatedDayTag: typeof raw.activatedDayTag === 'string' ? raw.activatedDayTag : ''
  }
}

const normalizeWeeklyBudgetPlan = (value: unknown): WeeklyBudgetPlan => {
  if (!value || typeof value !== 'object') return createEmptyWeeklyBudgetPlan()
  const raw = value as Partial<WeeklyBudgetPlan>
  const selectionEntries = Object.values(raw.selections ?? {})
    .map(normalizeWeeklyBudgetSelection)
    .filter((selection): selection is WeeklyBudgetSelection => selection !== null)

  return {
    weekId: typeof raw.weekId === 'string' ? raw.weekId : '',
    activatedAtDayTag: typeof raw.activatedAtDayTag === 'string' ? raw.activatedAtDayTag : '',
    completedGoalCount: Math.max(0, Number(raw.completedGoalCount) || 0),
    selections: Object.fromEntries(selectionEntries.map(selection => [selection.channelId, selection])) as WeeklyBudgetPlan['selections'],
    ticketBalances: normalizeNumericRecord<RewardTicketType>(raw.ticketBalances)
  }
}

const normalizeWeeklyBudgetArchive = (value: unknown): WeeklyBudgetArchive[] => {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => {
      const normalized = normalizeWeeklyBudgetPlan(entry)
      const expiredAtDayTag = entry && typeof entry === 'object' && typeof (entry as Partial<WeeklyBudgetArchive>).expiredAtDayTag === 'string'
        ? (entry as Partial<WeeklyBudgetArchive>).expiredAtDayTag!
        : ''
      if (!normalized.weekId) return null
      return {
        ...normalized,
        expiredAtDayTag
      }
    })
    .filter((entry): entry is WeeklyBudgetArchive => entry !== null)
    .slice(-WEEKLY_BUDGET_ARCHIVE_LIMIT)
}

const normalizeWeeklyMetricArchive = (value: unknown): WeeklyMetricArchive => {
  if (!value || typeof value !== 'object') return createEmptyWeeklyMetricArchive()
  const raw = value as Partial<WeeklyMetricArchive>
  return {
    version: WEEKLY_METRIC_ARCHIVE_VERSION,
    lastGeneratedWeekId: typeof raw.lastGeneratedWeekId === 'string' ? raw.lastGeneratedWeekId : '',
    snapshots: Array.isArray(raw.snapshots)
      ? raw.snapshots
          .map(normalizeLateGameMetricSnapshot)
          .filter((snapshot): snapshot is LateGameMetricSnapshot => snapshot !== null)
          .sort((a, b) => a.absoluteWeek - b.absoluteWeek)
          .slice(-WEEKLY_METRIC_ARCHIVE_LIMIT)
      : []
  }
}

const getAbsoluteDay = (year: number, season: 'spring' | 'summer' | 'autumn' | 'winter', day: number) => {
  const seasonIndex = (['spring', 'summer', 'autumn', 'winter'] as const).indexOf(season)
  return (year - 1) * 112 + seasonIndex * 28 + day
}

const MAIN_QUEST_STAGE_DEFS: MainQuestStageTemplate[] = [
  {
    id: 1,
    title: '田园新生',
    description: '先学会最基础的生活方式：播种、钓鱼、做饭。',
    conditions: [
      {
        id: 'main_stage_1_harvest',
        title: '初次丰收',
        description: '累计收获 15 株作物。',
        metric: 'totalCropsHarvested',
        targetValue: 15,
        reward: {}
      },
      {
        id: 'main_stage_1_fish',
        title: '会钓鱼了',
        description: '累计钓到 5 条鱼。',
        metric: 'totalFishCaught',
        targetValue: 5,
        reward: {}
      },
      {
        id: 'main_stage_1_cook',
        title: '开灶生火',
        description: '累计完成 1 次烹饪。',
        metric: 'totalRecipesCooked',
        targetValue: 1,
        reward: {}
      }
    ],
    reward: {
      money: 500,
      reputation: 20,
      items: [{ itemId: 'herb', quantity: 3 }],
      unlockHint: '你已经掌握了桃源生活的基本节奏。'
    }
  },
  {
    id: 2,
    title: '经营起步',
    description: '开始走向真正的经营：赚钱、下矿、结识村民。',
    conditions: [
      {
        id: 'main_stage_2_money',
        title: '站稳脚跟',
        description: '累计赚到 2000 文。',
        metric: 'totalMoneyEarned',
        targetValue: 2000,
        reward: {}
      },
      {
        id: 'main_stage_2_mine',
        title: '第一次深入矿洞',
        description: '矿洞最高到达 10 层。',
        metric: 'highestMineFloor',
        targetValue: 10,
        reward: {}
      },
      {
        id: 'main_stage_2_friend',
        title: '在村里站住脚',
        description: '让 1 位村民达到友好。',
        metric: 'friendlyNpcCount',
        targetValue: 1,
        reward: {}
      }
    ],
    reward: {
      money: 1200,
      reputation: 35,
      items: [{ itemId: 'bamboo', quantity: 5 }],
      unlockHint: '你已经不只是生存，而是真正开始经营自己的桃源。'
    }
  },
  {
    id: 3,
    title: '家业渐丰',
    description: '扩建家园，解锁新区域，开始拥有稳定的发展节奏。',
    conditions: [
      {
        id: 'main_stage_3_home',
        title: '翻修农舍',
        description: '将农舍提升到 1 级。',
        metric: 'farmhouseLevel',
        targetValue: 1,
        reward: {}
      },
      {
        id: 'main_stage_3_cave',
        title: '新的去处',
        description: '解锁山洞。',
        metric: 'caveUnlocked',
        targetValue: 1,
        reward: {}
      },
      {
        id: 'main_stage_3_bundle',
        title: '回应村庄需要',
        description: '完成 1 个社区目标。（图鉴→祠堂页签可提交物品完成）',
        metric: 'completedBundles',
        targetValue: 1,
        reward: {}
      }
    ],
    reward: {
      money: 2500,
      reputation: 50,
      items: [{ itemId: 'wild_mushroom', quantity: 4 }],
      unlockHint: '你的家业已经有了模样，新的发展方向正在展开。'
    }
  },
  {
    id: 4,
    title: '世外桃源',
    description: '迈入真正的中后期：积累财富、扩大影响、打造理想生活。',
    conditions: [
      {
        id: 'main_stage_4_money',
        title: '家底殷实',
        description: '累计赚到 30000 文。',
        metric: 'totalMoneyEarned',
        targetValue: 30000,
        reward: {}
      },
      {
        id: 'main_stage_4_social',
        title: '四方和乐',
        description: '让 4 位村民达到友好。',
        metric: 'friendlyNpcCount',
        targetValue: 4,
        reward: {}
      },
      {
        id: 'main_stage_4_collect',
        title: '见多识广',
        description: '累计发现 25 种物品。',
        metric: 'discoveredCount',
        targetValue: 25,
        reward: {}
      }
    ],
    reward: {
      money: 5000,
      reputation: 100,
      items: [{ itemId: 'food_rice_ball', quantity: 3 }],
      unlockHint: '你已经把桃源经营成了真正令人向往的地方。'
    }
  },
  {
    id: 5,
    title: '桃源盛世',
    description: '达成真正的传奇成就：功成名就、广交挚友、探遍矿洞、著书立说。',
    conditions: [
      {
        id: 'main_stage_5_wealth',
        title: '富甲一方',
        description: '累计赚到 80000 文。',
        metric: 'totalMoneyEarned',
        targetValue: 80000,
        reward: {}
      },
      {
        id: 'main_stage_5_social',
        title: '挚友遍桃源',
        description: '让 6 位村民达到友好。',
        metric: 'friendlyNpcCount',
        targetValue: 6,
        reward: {}
      },
      {
        id: 'main_stage_5_mine',
        title: '矿洞探秘',
        description: '矿洞最高到达 80 层。',
        metric: 'highestMineFloor',
        targetValue: 80,
        reward: {}
      },
      {
        id: 'main_stage_5_collect',
        title: '博物志成',
        description: '累计发现 50 种物品。',
        metric: 'discoveredCount',
        targetValue: 50,
        reward: {}
      }
    ],
    reward: {
      money: 12000,
      reputation: 200,
      items: [{ itemId: 'food_rice_ball', quantity: 8 }, { itemId: 'wild_mushroom', quantity: 6 }],
      unlockHint: '你的桃源已成为世人口耳相传的传奇之地。恭喜你完成了所有主线里程碑！'
    }
  }
]

const SEASON_GOAL_DEFS: Record<'spring' | 'summer' | 'autumn' | 'winter', GoalTemplate[]> = {
  spring: [
    {
      id: 'season_spring_harvest',
      title: '春耕有成',
      description: '本季收获 20 株作物。',
      metric: 'totalCropsHarvested',
      targetValue: 20,
      reward: { money: 600, reputation: 10, items: [{ itemId: 'herb', quantity: 2 }] }
    },
    {
      id: 'season_spring_fish',
      title: '春水试钓',
      description: '本季钓到 6 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 6,
      reward: { money: 500, reputation: 8, items: [{ itemId: 'food_rice_ball', quantity: 1 }] }
    },
    {
      id: 'season_spring_income',
      title: '春日积蓄',
      description: '本季赚到 3000 文。',
      metric: 'totalMoneyEarned',
      targetValue: 3000,
      reward: { money: 800, reputation: 12, items: [{ itemId: 'bamboo', quantity: 3 }] }
    },
    {
      id: 'season_spring_cook',
      title: '春灶开火',
      description: '本季完成 2 次烹饪。',
      metric: 'totalRecipesCooked',
      targetValue: 2,
      reward: { money: 550, reputation: 8, items: [{ itemId: 'herb', quantity: 3 }] }
    },
    {
      id: 'season_spring_social',
      title: '春日结识',
      description: '本季新增 1 位友好村民。',
      metric: 'friendlyNpcCount',
      targetValue: 1,
      reward: { money: 600, reputation: 12, items: [{ itemId: 'food_rice_ball', quantity: 2 }] }
    }
  ],
  summer: [
    {
      id: 'season_summer_harvest',
      title: '盛夏丰收',
      description: '本季收获 35 株作物。',
      metric: 'totalCropsHarvested',
      targetValue: 35,
      reward: { money: 900, reputation: 12, items: [{ itemId: 'herb', quantity: 2 }] }
    },
    {
      id: 'season_summer_income',
      title: '暑月进账',
      description: '本季赚到 6000 文。',
      metric: 'totalMoneyEarned',
      targetValue: 6000,
      reward: { money: 1200, reputation: 15, items: [{ itemId: 'bamboo', quantity: 4 }] }
    },
    {
      id: 'season_summer_recipe',
      title: '夏日灶火',
      description: '本季完成 3 次烹饪。',
      metric: 'totalRecipesCooked',
      targetValue: 3,
      reward: { money: 700, reputation: 10, items: [{ itemId: 'food_rice_ball', quantity: 2 }] }
    },
    {
      id: 'season_summer_fish',
      title: '夏日垂钓',
      description: '本季钓到 10 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 10,
      reward: { money: 750, reputation: 10, items: [{ itemId: 'herb', quantity: 5 }] }
    },
    {
      id: 'season_summer_mine',
      title: '夏日探矿',
      description: '本季将矿洞最高层再推进 8 层。',
      metric: 'highestMineFloor',
      targetValue: 8,
      reward: { money: 850, reputation: 12, items: [{ itemId: 'gold_ore', quantity: 3 }] }
    }
  ],
  autumn: [
    {
      id: 'season_autumn_harvest',
      title: '秋收满仓',
      description: '本季收获 45 株作物。',
      metric: 'totalCropsHarvested',
      targetValue: 45,
      reward: { money: 1100, reputation: 15, items: [{ itemId: 'wild_mushroom', quantity: 2 }] }
    },
    {
      id: 'season_autumn_income',
      title: '秋账丰盈',
      description: '本季赚到 9000 文。',
      metric: 'totalMoneyEarned',
      targetValue: 9000,
      reward: { money: 1500, reputation: 18, items: [{ itemId: 'bamboo', quantity: 5 }] }
    },
    {
      id: 'season_autumn_collect',
      title: '山野采存',
      description: '本季累计发现 6 种新物品。',
      metric: 'discoveredCount',
      targetValue: 6,
      reward: { money: 900, reputation: 12, items: [{ itemId: 'herb', quantity: 4 }] }
    },
    {
      id: 'season_autumn_fish',
      title: '秋水钓获',
      description: '本季钓到 12 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 12,
      reward: { money: 950, reputation: 12, items: [{ itemId: 'herb', quantity: 6 }] }
    },
    {
      id: 'season_autumn_social',
      title: '秋日互访',
      description: '本季新增 1 位友好村民。',
      metric: 'friendlyNpcCount',
      targetValue: 1,
      reward: { money: 850, reputation: 14, items: [{ itemId: 'wild_mushroom', quantity: 3 }] }
    }
  ],
  winter: [
    {
      id: 'season_winter_mine',
      title: '冬季探矿',
      description: '本季将矿洞最高层再推进 10 层。',
      metric: 'highestMineFloor',
      targetValue: 10,
      reward: { money: 1300, reputation: 15, items: [{ itemId: 'wild_mushroom', quantity: 3 }] }
    },
    {
      id: 'season_winter_cook',
      title: '围炉做饭',
      description: '本季完成 4 次烹饪。',
      metric: 'totalRecipesCooked',
      targetValue: 4,
      reward: { money: 1000, reputation: 12, items: [{ itemId: 'food_rice_ball', quantity: 2 }] }
    },
    {
      id: 'season_winter_social',
      title: '冬日走亲',
      description: '本季新增 1 位友好村民。',
      metric: 'friendlyNpcCount',
      targetValue: 1,
      reward: { money: 900, reputation: 15, items: [{ itemId: 'herb', quantity: 3 }] }
    },
    {
      id: 'season_winter_income',
      title: '冬日营生',
      description: '本季赚到 5000 文。',
      metric: 'totalMoneyEarned',
      targetValue: 5000,
      reward: { money: 1100, reputation: 14, items: [{ itemId: 'bamboo', quantity: 4 }] }
    },
    {
      id: 'season_winter_fish',
      title: '冬日冰钓',
      description: '本季钓到 8 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 8,
      reward: { money: 850, reputation: 12, items: [{ itemId: 'herb', quantity: 4 }] }
    }
  ]
}

const DAILY_GOAL_DEFS: Record<'spring' | 'summer' | 'autumn' | 'winter', GoalTemplate[]> = {
  spring: [
    {
      id: 'daily_spring_harvest',
      title: '今日春耕',
      description: '今日收获 5 株作物。',
      metric: 'totalCropsHarvested',
      targetValue: 5,
      reward: { money: 180, reputation: 3 }
    },
    {
      id: 'daily_spring_fish',
      title: '今日试钓',
      description: '今日钓到 2 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 2,
      reward: { money: 160, reputation: 2 }
    },
    {
      id: 'daily_spring_income',
      title: '今日进账',
      description: '今日赚到 800 文。',
      metric: 'totalMoneyEarned',
      targetValue: 800,
      reward: { money: 220, reputation: 3 }
    },
    {
      id: 'daily_spring_discovery',
      title: '今日见闻',
      description: '今日发现 1 种新物品。',
      metric: 'discoveredCount',
      targetValue: 1,
      reward: { money: 180, reputation: 3 }
    }
  ],
  summer: [
    {
      id: 'daily_summer_harvest',
      title: '今日抢收',
      description: '今日收获 8 株作物。',
      metric: 'totalCropsHarvested',
      targetValue: 8,
      reward: { money: 220, reputation: 3 }
    },
    {
      id: 'daily_summer_income',
      title: '今日大卖',
      description: '今日赚到 1200 文。',
      metric: 'totalMoneyEarned',
      targetValue: 1200,
      reward: { money: 260, reputation: 3 }
    },
    {
      id: 'daily_summer_cook',
      title: '今日开灶',
      description: '今日完成 1 次烹饪。',
      metric: 'totalRecipesCooked',
      targetValue: 1,
      reward: { money: 180, reputation: 2 }
    },
    {
      id: 'daily_summer_fish',
      title: '今日鱼获',
      description: '今日钓到 3 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 3,
      reward: { money: 180, reputation: 2 }
    }
  ],
  autumn: [
    {
      id: 'daily_autumn_harvest',
      title: '今日丰收',
      description: '今日收获 10 株作物。',
      metric: 'totalCropsHarvested',
      targetValue: 10,
      reward: { money: 260, reputation: 4 }
    },
    {
      id: 'daily_autumn_income',
      title: '今日结账',
      description: '今日赚到 1500 文。',
      metric: 'totalMoneyEarned',
      targetValue: 1500,
      reward: { money: 300, reputation: 4 }
    },
    {
      id: 'daily_autumn_discovery',
      title: '今日采奇',
      description: '今日发现 1 种新物品。',
      metric: 'discoveredCount',
      targetValue: 1,
      reward: { money: 200, reputation: 3 }
    },
    {
      id: 'daily_autumn_cook',
      title: '今日备冬',
      description: '今日完成 1 次烹饪。',
      metric: 'totalRecipesCooked',
      targetValue: 1,
      reward: { money: 180, reputation: 2 }
    }
  ],
  winter: [
    {
      id: 'daily_winter_mine',
      title: '今日探矿',
      description: '今日将矿洞最高层推进 5 层。',
      metric: 'highestMineFloor',
      targetValue: 5,
      reward: { money: 260, reputation: 4 }
    },
    {
      id: 'daily_winter_cook',
      title: '今日暖胃',
      description: '今日完成 1 次烹饪。',
      metric: 'totalRecipesCooked',
      targetValue: 1,
      reward: { money: 180, reputation: 2 }
    },
    {
      id: 'daily_winter_fish',
      title: '今日冰钓',
      description: '今日钓到 2 条鱼。',
      metric: 'totalFishCaught',
      targetValue: 2,
      reward: { money: 180, reputation: 2 }
    },
    {
      id: 'daily_winter_income',
      title: '今日补贴',
      description: '今日赚到 1000 文。',
      metric: 'totalMoneyEarned',
      targetValue: 1000,
      reward: { money: 240, reputation: 3 }
    }
  ]
}

const LONG_TERM_GOAL_DEFS: GoalTemplate[] = [
  // ── 财富积累 ──
  {
    id: 'long_money_1',
    title: '积蓄小成',
    description: '累计赚到 20000 文。',
    metric: 'totalMoneyEarned',
    targetValue: 20000,
    reward: { money: 2000, reputation: 30, unlockHint: '你已经开始拥有稳定的家底。' }
  },
  {
    id: 'long_money_2',
    title: '家财万贯',
    description: '累计赚到 50000 文。',
    metric: 'totalMoneyEarned',
    targetValue: 50000,
    reward: { money: 5000, reputation: 60, items: [{ itemId: 'bamboo', quantity: 10 }], unlockHint: '你的名声已传遍周边村落。' }
  },
  {
    id: 'long_money_3',
    title: '富甲一方',
    description: '累计赚到 100000 文。',
    metric: 'totalMoneyEarned',
    targetValue: 100000,
    reward: { money: 12000, reputation: 120, items: [{ itemId: 'gold_ore', quantity: 5 }], unlockHint: '桃源之名，远近皆知。' }
  },

  // ── 家园建设 ──
  {
    id: 'long_home_1',
    title: '家园升级',
    description: '将农舍提升到 2 级（宅院）。',
    metric: 'farmhouseLevel',
    targetValue: 2,
    reward: { money: 2500, reputation: 40, items: [{ itemId: 'bamboo', quantity: 8 }] }
  },
  {
    id: 'long_home_2',
    title: '豪华宅邸',
    description: '将农舍提升到 3 级（酒窖宅院）。',
    metric: 'farmhouseLevel',
    targetValue: 3,
    reward: { money: 8000, reputation: 80, items: [{ itemId: 'wild_mushroom', quantity: 6 }], unlockHint: '你的宅院已是桃源最气派的居所。' }
  },

  // ── 矿洞探索 ──
  {
    id: 'long_mine_1',
    title: '深层探路',
    description: '矿洞最高到达 60 层。',
    metric: 'highestMineFloor',
    targetValue: 60,
    reward: { money: 2600, reputation: 45, items: [{ itemId: 'gold_ore', quantity: 8 }] }
  },
  {
    id: 'long_mine_2',
    title: '矿洞征服者',
    description: '矿洞最高到达 100 层。',
    metric: 'highestMineFloor',
    targetValue: 100,
    reward: { money: 6000, reputation: 80, items: [{ itemId: 'gold_ore', quantity: 15 }], unlockHint: '矿洞深处的秘密，只有你知晓。' }
  },

  // ── 钓鱼成就 ──
  {
    id: 'long_fish_1',
    title: '垂钓有成',
    description: '累计钓到 30 条鱼。',
    metric: 'totalFishCaught',
    targetValue: 30,
    reward: { money: 2000, reputation: 35, items: [{ itemId: 'herb', quantity: 10 }] }
  },
  {
    id: 'long_fish_2',
    title: '桃源渔翁',
    description: '累计钓到 80 条鱼。',
    metric: 'totalFishCaught',
    targetValue: 80,
    reward: { money: 4500, reputation: 60, items: [{ itemId: 'crab_pot', quantity: 2 }], unlockHint: '村民们都称你为桃源第一渔翁。' }
  },

  // ── 烹饪成就 ──
  {
    id: 'long_cook_1',
    title: '家常好厨',
    description: '累计完成 20 次烹饪。',
    metric: 'totalRecipesCooked',
    targetValue: 20,
    reward: { money: 2200, reputation: 35, items: [{ itemId: 'herb', quantity: 8 }] }
  },
  {
    id: 'long_cook_2',
    title: '桃源名厨',
    description: '累计完成 60 次烹饪。',
    metric: 'totalRecipesCooked',
    targetValue: 60,
    reward: { money: 5500, reputation: 70, items: [{ itemId: 'ginseng', quantity: 3 }], unlockHint: '你的厨艺已令村中所有人叹服。' }
  },

  // ── 农耕成就 ──
  {
    id: 'long_crop_1',
    title: '丰收大户',
    description: '累计收获 200 株作物。',
    metric: 'totalCropsHarvested',
    targetValue: 200,
    reward: { money: 3000, reputation: 45, items: [{ itemId: 'bamboo', quantity: 6 }] }
  },
  {
    id: 'long_crop_2',
    title: '耕耘不辍',
    description: '累计收获 500 株作物。',
    metric: 'totalCropsHarvested',
    targetValue: 500,
    reward: { money: 7000, reputation: 90, items: [{ itemId: 'bamboo', quantity: 12 }], unlockHint: '这片土地已被你的汗水浸润得格外肥沃。' }
  },

  // ── 社交成就 ──
  {
    id: 'long_social_1',
    title: '村中熟面孔',
    description: '让 4 位村民达到友好。',
    metric: 'friendlyNpcCount',
    targetValue: 4,
    reward: { money: 1800, reputation: 35, items: [{ itemId: 'food_rice_ball', quantity: 3 }] }
  },
  {
    id: 'long_social_2',
    title: '八方挚友',
    description: '让 8 位村民达到友好或以上。',
    metric: 'friendlyNpcCount',
    targetValue: 8,
    reward: { money: 5000, reputation: 80, items: [{ itemId: 'food_rice_ball', quantity: 8 }], unlockHint: '整个桃源都是你的朋友。' }
  },

  // ── 收藏图鉴 ──
  {
    id: 'long_collect_1',
    title: '见闻渐丰',
    description: '累计发现 30 种物品。',
    metric: 'discoveredCount',
    targetValue: 30,
    reward: { money: 1800, reputation: 35, items: [{ itemId: 'wild_mushroom', quantity: 4 }] }
  },
  {
    id: 'long_collect_2',
    title: '博物达人',
    description: '累计发现 60 种物品。',
    metric: 'discoveredCount',
    targetValue: 60,
    reward: { money: 4000, reputation: 65, items: [{ itemId: 'wild_mushroom', quantity: 8 }], unlockHint: '桃源的物产几乎被你摸了个遍。' }
  },

  // ── 社区建设 ──
  {
    id: 'long_bundle_1',
    title: '村庄栋梁',
    description: '累计完成 3 个社区目标。（图鉴→祠堂页签可提交物品完成）',
    metric: 'completedBundles',
    targetValue: 3,
    reward: { money: 3200, reputation: 50, items: [{ itemId: 'bamboo', quantity: 4 }] }
  },
  {
    id: 'long_bundle_2',
    title: '社区中坚',
    description: '累计完成 6 个社区目标。（图鉴→祠堂页签可提交物品完成）',
    metric: 'completedBundles',
    targetValue: 6,
    reward: { money: 7500, reputation: 100, items: [{ itemId: 'bamboo', quantity: 8 }], unlockHint: '你为桃源的繁荣做出了卓越贡献。' }
  },

  // ── 蟹笼达人 ──
  {
    id: 'long_crabpot_1',
    title: '蟹笼渔家',
    description: '同时拥有 3 个蟹笼。（钓鱼页签可购买或制作蟹笼，放置后计入数量）',
    metric: 'crabPotCount',
    targetValue: 3,
    reward: { money: 2400, reputation: 40, items: [{ itemId: 'herb', quantity: 15 }] }
  },

  // ── 家庭成就 ──
  {
    id: 'long_family_1',
    title: '家业有人',
    description: '迎来 1 个孩子。（结婚7天后且配偶好感≥3000，配偶会随机提议要孩子）',
    metric: 'childCount',
    targetValue: 1,
    reward: { money: 2800, reputation: 45, items: [{ itemId: 'food_rice_ball', quantity: 5 }] }
  },
  {
    id: 'long_family_2',
    title: '儿女双全',
    description: '迎来 2 个孩子。（结婚7天后且配偶好感≥3000，配偶会随机提议要孩子）',
    metric: 'childCount',
    targetValue: 2,
    reward: { money: 5000, reputation: 70, items: [{ itemId: 'food_rice_ball', quantity: 10 }], unlockHint: '家中笑声不断，此乃人生之大幸。' }
  }
]

const createGoalState = (template: GoalTemplate, baselineValue = 0, source: GoalSource = 'random'): GoalState => ({
  ...template,
  baselineValue,
  completed: false,
  rewarded: false,
  source
})

const createMainQuestStageState = (stage: MainQuestStageTemplate): MainQuestStageState => ({
  id: stage.id,
  title: stage.title,
  description: stage.description,
  conditions: stage.conditions.map(condition => createGoalState(condition, 0)),
  completed: false,
  rewarded: false,
  reward: stage.reward
})

const seededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const GOAL_BIAS_MAP: Partial<Record<GoalMetricKey, Array<'cashflow' | 'farming' | 'fishing' | 'mining' | 'cooking' | 'social' | 'discovery'>>> = {
  totalMoneyEarned: ['cashflow'],
  totalCropsHarvested: ['farming'],
  totalFishCaught: ['fishing'],
  totalRecipesCooked: ['cooking'],
  highestMineFloor: ['mining'],
  friendlyNpcCount: ['social'],
  discoveredCount: ['discovery']
}

const GOAL_SOURCE_LABELS: Record<GoalSource, string> = {
  random: '随机目标',
  season: '季节目标',
  archetype_bias: '流派推荐'
}

export const useGoalStore = defineStore('goal', () => {
  const mainQuestStage = ref(1)
  const mainQuestStages = ref<MainQuestStageState[]>([])
  const dailyGoals = ref<GoalState[]>([])
  const seasonGoals = ref<GoalState[]>([])
  const longTermGoals = ref<GoalState[]>([])
  const goalReputation = ref(0)
  const lastDailyGoalRefresh = ref('')
  const lastSeasonGoalRefresh = ref('')
  const lastThemeWeekRefresh = ref('')
  const currentThemeWeekState = ref<ThemeWeekState | null>(null)
  const weeklyMetricArchive = ref<WeeklyMetricArchive>(createEmptyWeeklyMetricArchive())
  const weeklyBudgetPlan = ref<WeeklyBudgetPlan>(createEmptyWeeklyBudgetPlan())
  const weeklyBudgetHistory = ref<WeeklyBudgetArchive[]>([])

  const getCurrentSeasonTag = () => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}`
  }

  const getCurrentDayTag = () => {
    const gameStore = useGameStore()
    return `${gameStore.year}-${gameStore.season}-${gameStore.day}`
  }

  const getDayTag = (year: number, season: 'spring' | 'summer' | 'autumn' | 'winter', day: number) => `${year}-${season}-${day}`

  const getCurrentThemeWeekTag = () => {
    const gameStore = useGameStore()
    return getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId
  }

  const ensureWeeklyBudgetPlan = () => {
    const currentWeekId = getCurrentThemeWeekTag()
    if (weeklyBudgetPlan.value.weekId === currentWeekId) return
    weeklyBudgetPlan.value = createEmptyWeeklyBudgetPlan(currentWeekId, getCurrentDayTag())
  }

  const getWeeklyBudgetSelection = (channelId: WeeklyBudgetChannelId) => weeklyBudgetPlan.value.selections[channelId] ?? null

  const getActiveWeeklyBudgetEffect = () => {
    const selections = Object.values(weeklyBudgetPlan.value.selections).filter((selection): selection is WeeklyBudgetSelection => Boolean(selection))
    return selections.reduce(
      (summary, selection) => {
        summary.moneyRewardMultiplier *= selection.effect.moneyRewardMultiplier ?? 1
        summary.reputationRewardMultiplier *= selection.effect.reputationRewardMultiplier ?? 1
        summary.flatReputationBonus += selection.effect.flatReputationBonus ?? 0
        for (const [ticketType, amount] of Object.entries(selection.effect.ticketRewards ?? {})) {
          summary.ticketRewards[ticketType as RewardTicketType] = (summary.ticketRewards[ticketType as RewardTicketType] ?? 0) + Math.max(0, Number(amount) || 0)
        }
        return summary
      },
      {
        moneyRewardMultiplier: 1,
        reputationRewardMultiplier: 1,
        flatReputationBonus: 0,
        ticketRewards: {} as Partial<Record<RewardTicketType, number>>
      }
    )
  }

  const activateWeeklyBudget = (channelId: WeeklyBudgetChannelId, tierId: string) => {
    ensureWeeklyBudgetPlan()
    if (weeklyBudgetPlan.value.selections[channelId]) {
      showFloat('该预算槽本周已投入', 'danger')
      return false
    }

    const channelDef = WEEKLY_BUDGET_CHANNEL_MAP[channelId]
    const tierDef = channelDef?.tiers.find((tier: WeeklyBudgetTierDef) => tier.id === tierId)
    if (!channelDef || !tierDef) {
      showFloat('预算档位不存在', 'danger')
      return false
    }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(tierDef.costMoney, 'goal')) {
      showFloat('铜钱不足，无法投入周预算', 'danger')
      return false
    }

    playerStore.recordSinkSpend(tierDef.costMoney, channelId === 'museum' ? 'themeActivity' : channelId === 'trade' ? 'service' : 'construction')

    weeklyBudgetPlan.value = {
      ...weeklyBudgetPlan.value,
      weekId: weeklyBudgetPlan.value.weekId || getCurrentThemeWeekTag(),
      activatedAtDayTag: weeklyBudgetPlan.value.activatedAtDayTag || getCurrentDayTag(),
      selections: {
        ...weeklyBudgetPlan.value.selections,
        [channelId]: {
          channelId,
          tierId: tierDef.id,
          tier: tierDef.tier,
          tierLabel: tierDef.label,
          costMoney: tierDef.costMoney,
          projectedValue: tierDef.projectedValue,
          effect: tierDef.effect,
          activatedWeekId: getCurrentThemeWeekTag(),
          activatedDayTag: getCurrentDayTag()
        }
      }
    }

    addLog(`【周预算】已投入${channelDef.label}·${tierDef.label}，花费${tierDef.costMoney}文。`, {
      category: 'economy',
      tags: ['weekly_budget_activated'],
      meta: { channelId, tierId: tierDef.id, costMoney: tierDef.costMoney }
    })
    showFloat(`${channelDef.shortLabel}${tierDef.label}已生效`, 'accent')
    return true
  }

  const resetWeeklyBudgetsForNewWeek = (nextWeekId: string, dayTag: string) => {
    const hadSelections = Object.keys(weeklyBudgetPlan.value.selections).length > 0
    const expiredPlan = hadSelections && weeklyBudgetPlan.value.weekId
      ? {
          ...weeklyBudgetPlan.value,
          expiredAtDayTag: dayTag
        }
      : null

    if (expiredPlan) {
      weeklyBudgetHistory.value = [...weeklyBudgetHistory.value.filter(item => item.weekId !== expiredPlan.weekId), expiredPlan].slice(-WEEKLY_BUDGET_ARCHIVE_LIMIT)
    }

    weeklyBudgetPlan.value = createEmptyWeeklyBudgetPlan(nextWeekId, dayTag)
    return expiredPlan
  }

  const recordWeeklyBudgetGoalSettlement = () => {
    const walletStore = useWalletStore()
    const activeEffect = getActiveWeeklyBudgetEffect()
    if (
      activeEffect.flatReputationBonus <= 0 &&
      activeEffect.moneyRewardMultiplier === 1 &&
      activeEffect.reputationRewardMultiplier === 1 &&
      Object.keys(activeEffect.ticketRewards).length === 0
    ) {
      return activeEffect
    }

    const grantedTicketRewards = walletStore.addRewardTickets(activeEffect.ticketRewards, { source: 'goal' })
    weeklyBudgetPlan.value.completedGoalCount += 1
    weeklyBudgetPlan.value.ticketBalances = {
      ...weeklyBudgetPlan.value.ticketBalances,
      ...Object.fromEntries(
        Object.entries(grantedTicketRewards).map(([ticketType, amount]) => [
          ticketType,
          (weeklyBudgetPlan.value.ticketBalances[ticketType as RewardTicketType] ?? 0) + Math.max(0, Number(amount) || 0)
        ])
      )
    }
    return {
      ...activeEffect,
      ticketRewards: grantedTicketRewards
    }
  }

  const getFriendlyNpcCount = () => {
    const npcStore = useNpcStore()
    return npcStore.npcStates.filter(state => FRIENDSHIP_GOAL_LEVELS.has(npcStore.getFriendshipLevel(state.npcId))).length
  }

  const getMetricValue = (metric: GoalMetricKey) => {
    const achievementStore = useAchievementStore()
    const homeStore = useHomeStore()
    const fishingStore = useFishingStore()
    const hanhaiStore = useHanhaiStore()
    const museumStore = useMuseumStore()
    const npcStore = useNpcStore()
    const villageProjectStore = useVillageProjectStore()

    switch (metric) {
      case 'totalMoneyEarned':
        return achievementStore.stats.totalMoneyEarned
      case 'totalCropsHarvested':
        return achievementStore.stats.totalCropsHarvested
      case 'totalFishCaught':
        return achievementStore.stats.totalFishCaught
      case 'totalRecipesCooked':
        return achievementStore.stats.totalRecipesCooked
      case 'highestMineFloor':
        return achievementStore.stats.highestMineFloor
      case 'friendlyNpcCount':
        return getFriendlyNpcCount()
      case 'farmhouseLevel':
        return homeStore.farmhouseLevel
      case 'completedBundles':
        return achievementStore.completedBundles.length
      case 'discoveredCount':
        return achievementStore.discoveredCount
      case 'crabPotCount':
        return fishingStore.crabPots.length
      case 'childCount':
        return npcStore.children.length
      case 'caveUnlocked':
        return homeStore.caveUnlocked ? 1 : 0
      case 'villageProjectLevel':
        return villageProjectStore.villageProjectLevel
      case 'hanhaiContractCompletions':
        return hanhaiStore.totalRelicClears
      case 'museumExhibitLevel':
        return museumStore.donatedCount
      case 'familyWishCompletions':
        return 0
      default:
        return 0
    }
  }

  const getMetricSnapshot = (): Record<GoalMetricKey, number> => ({
    totalMoneyEarned: getMetricValue('totalMoneyEarned'),
    totalCropsHarvested: getMetricValue('totalCropsHarvested'),
    totalFishCaught: getMetricValue('totalFishCaught'),
    totalRecipesCooked: getMetricValue('totalRecipesCooked'),
    highestMineFloor: getMetricValue('highestMineFloor'),
    friendlyNpcCount: getMetricValue('friendlyNpcCount'),
    farmhouseLevel: getMetricValue('farmhouseLevel'),
    completedBundles: getMetricValue('completedBundles'),
    discoveredCount: getMetricValue('discoveredCount'),
    crabPotCount: getMetricValue('crabPotCount'),
    childCount: getMetricValue('childCount'),
    caveUnlocked: getMetricValue('caveUnlocked'),
    villageProjectLevel: getMetricValue('villageProjectLevel'),
    hanhaiContractCompletions: getMetricValue('hanhaiContractCompletions'),
    museumExhibitLevel: getMetricValue('museumExhibitLevel'),
    familyWishCompletions: getMetricValue('familyWishCompletions')
  })

  const buildLateGameMetricSnapshot = (weekInfo: WeekCycleInfo, generatedAtDayTag: string): LateGameMetricSnapshot => {
    const playerStore = usePlayerStore()
    const hanhaiStore = useHanhaiStore()
    const fishPondStore = useFishPondStore()
    const museumStore = useMuseumStore()
    const npcStore = useNpcStore()
    const villageProjectStore = useVillageProjectStore()
    const themeWeek = getThemeWeekBySeason(weekInfo.season)
    const weeklyEconomySnapshots = playerStore
      .getRecentEconomySnapshots(8)
      .filter(snapshot => snapshot.dayTag !== generatedAtDayTag)
      .slice(-7)

    const totalIncome = weeklyEconomySnapshots.reduce((sum, snapshot) => sum + snapshot.totalIncome, 0)
    const totalExpense = weeklyEconomySnapshots.reduce((sum, snapshot) => sum + snapshot.totalExpense, 0)
    const sinkSpend = weeklyEconomySnapshots.reduce((sum, snapshot) => sum + snapshot.sinkSpend, 0)
    const matureHealthyPondFish = fishPondStore.pond.built
      ? fishPondStore.pond.fish.filter(fish => fish.mature && !fish.sick).length
      : 0
    const socialParticipationScore =
      getFriendlyNpcCount() +
      npcStore.children.length +
      (npcStore.getSpouse() ? 2 : 0) +
      Math.min(10, Math.floor(goalReputation.value / 100))
    const villageProsperityScore =
      villageProjectStore.villageProjectLevel * 10 + museumStore.donatedCategoryCoverage * 3 + Math.min(20, hanhaiStore.totalRelicClears)

    return {
      weekId: weekInfo.seasonWeekId,
      absoluteWeek: weekInfo.absoluteWeek,
      year: weekInfo.year,
      season: weekInfo.season,
      weekOfSeason: weekInfo.weekOfSeason,
      generatedAtDayTag,
      periodStartDayTag: getDayTag(weekInfo.year, weekInfo.season, weekInfo.weekStartDay),
      periodEndDayTag: getDayTag(weekInfo.year, weekInfo.season, weekInfo.weekEndDay),
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      sinkSpend,
      ticketBalances: { ...weeklyBudgetPlan.value.ticketBalances },
      budgetInvestments: Object.fromEntries(
        Object.values(weeklyBudgetPlan.value.selections)
          .filter((selection): selection is WeeklyBudgetSelection => Boolean(selection))
          .map(selection => [selection.channelId, selection.costMoney])
      ),
      maintenanceCost: 0,
      serviceContractCount: 0,
      hanhaiContractCompletions: hanhaiStore.totalRelicClears,
      fishPondContestScore: matureHealthyPondFish,
      museumExhibitLevel: museumStore.exhibitLevel,
      socialParticipationScore,
      villageProsperityScore,
      sourceSnapshotCount: weeklyEconomySnapshots.length,
      activeThemeWeekId: themeWeek?.id
    }
  }

  const archiveWeeklyMetricSnapshot = (weekInfo: WeekCycleInfo, generatedAtDayTag: string) => {
    const snapshot = buildLateGameMetricSnapshot(weekInfo, generatedAtDayTag)
    const mergedSnapshots = [...weeklyMetricArchive.value.snapshots.filter(item => item.weekId !== snapshot.weekId), snapshot]
      .sort((a, b) => a.absoluteWeek - b.absoluteWeek)
      .slice(-WEEKLY_METRIC_ARCHIVE_LIMIT)

    weeklyMetricArchive.value = {
      version: WEEKLY_METRIC_ARCHIVE_VERSION,
      lastGeneratedWeekId: snapshot.weekId,
      snapshots: mergedSnapshots
    }

    return snapshot
  }

  const getGoalProgressValue = (goal: GoalState, snapshot = getMetricSnapshot()) => {
    const current = snapshot[goal.metric] ?? 0
    return Math.max(0, current - (goal.baselineValue ?? 0))
  }

  const getGoalProgressText = (goal: GoalState) => {
    const progress = getGoalProgressValue(goal)
    return `${Math.min(progress, goal.targetValue)} / ${goal.targetValue}`
  }

  const getGoalSourceText = (goal: GoalState) => GOAL_SOURCE_LABELS[goal.source] ?? GOAL_SOURCE_LABELS.random

  const mergeSavedGoalState = (fresh: GoalState, saved?: Partial<GoalState>): GoalState => ({
    ...fresh,
    baselineValue: saved?.baselineValue ?? fresh.baselineValue,
    completed: saved?.completed ?? fresh.completed,
    rewarded: saved?.rewarded ?? saved?.completed ?? fresh.rewarded,
    source: saved?.source ?? fresh.source
  })

  const mergeSavedGoalArray = (
    defs: GoalTemplate[],
    savedGoals: GoalState[] | undefined,
    baselineSnapshot: Record<GoalMetricKey, number>,
    source: GoalSource = 'random'
  ) => {
    return defs.map(def => {
      const fresh = createGoalState(def, baselineSnapshot[def.metric] ?? 0, source)
      const saved = savedGoals?.find(goal => goal.id === def.id)
      return mergeSavedGoalState(fresh, saved)
    })
  }

  const mergeSavedMainQuestStages = (savedStages: MainQuestStageState[] | undefined) => {
    return MAIN_QUEST_STAGE_DEFS.map(stageDef => {
      const freshStage = createMainQuestStageState(stageDef)
      const savedStage = savedStages?.find(stage => stage.id === stageDef.id)
      const conditions = freshStage.conditions.map(condition => {
        const savedCondition = savedStage?.conditions.find(saved => saved.id === condition.id)
        return mergeSavedGoalState(condition, savedCondition)
      })
      return {
        ...freshStage,
        conditions,
        completed: savedStage?.completed ?? conditions.every(condition => condition.completed),
        rewarded: savedStage?.rewarded ?? savedStage?.completed ?? false
      }
    })
  }

  const initializeMainQuestStages = () => {
    if (mainQuestStages.value.length > 0) return
    mainQuestStages.value = MAIN_QUEST_STAGE_DEFS.map(stage => createMainQuestStageState(stage))
  }

  const initializeLongTermGoals = () => {
    if (longTermGoals.value.length > 0) return
    longTermGoals.value = LONG_TERM_GOAL_DEFS.map(goal => createGoalState(goal, 0))
  }

  const selectDailyGoalTemplates = () => {
    const gameStore = useGameStore()
    const walletStore = useWalletStore()
    const season = gameStore.season as 'spring' | 'summer' | 'autumn' | 'winter'
    const pool = [...DAILY_GOAL_DEFS[season]]
    const rng = seededRandom(getAbsoluteDay(gameStore.year, season, gameStore.day) + 97)
    const goalWeights = walletStore.getGoalPreferenceWeights()

    const weightedPool = pool.map(goal => {
      const biasKeys = GOAL_BIAS_MAP[goal.metric] ?? []
      const biasWeight = biasKeys.reduce((sum, key) => sum + (goalWeights[key] ?? 0), 0)
      return {
        goal,
        biasWeight,
        weight: Math.max(1, 1 + biasWeight)
      }
    })

    const picked: Array<{ goal: GoalTemplate; source: GoalSource }> = []
    const workingPool = [...weightedPool]
    while (picked.length < Math.min(3, pool.length) && workingPool.length > 0) {
      const totalWeight = workingPool.reduce((sum, entry) => sum + entry.weight, 0)
      let roll = rng() * totalWeight
      let pickedIndex = 0
      for (let i = 0; i < workingPool.length; i++) {
        roll -= workingPool[i]!.weight
        if (roll <= 0) {
          pickedIndex = i
          break
        }
      }
      const selected = workingPool[pickedIndex]!
      picked.push({
        goal: selected.goal,
        source: selected.biasWeight > 0 ? 'archetype_bias' : 'random'
      })
      workingPool.splice(pickedIndex, 1)
    }

    return picked
  }

  const refreshDailyGoals = (announce = false) => {
    const snapshot = getMetricSnapshot()
    dailyGoals.value = selectDailyGoalTemplates().map(({ goal, source }) => createGoalState(goal, snapshot[goal.metric] ?? 0, source))
    lastDailyGoalRefresh.value = getCurrentDayTag()

    if (announce) {
      addLog('【今日目标】新的一天开始了，今日目标已经刷新。')
      showFloat('今日目标已刷新', 'accent')
    }
  }

  const refreshSeasonGoals = (announce = false) => {
    const gameStore = useGameStore()
    const season = gameStore.season as 'spring' | 'summer' | 'autumn' | 'winter'
    const snapshot = getMetricSnapshot()
    seasonGoals.value = SEASON_GOAL_DEFS[season].map(goal => createGoalState(goal, snapshot[goal.metric] ?? 0, 'season'))
    lastSeasonGoalRefresh.value = getCurrentSeasonTag()
    if (announce) {
      addLog(`【季节目标】进入${SEASON_NAMES[season]}季，新的本季目标已经刷新。`)
      showFloat(`${SEASON_NAMES[season]}季目标已刷新`, 'accent')
    }
  }

  const refreshThemeWeek = (announce = false) => {
    const gameStore = useGameStore()
    const themeWeek = getThemeWeekBySeason(gameStore.season as 'spring' | 'summer' | 'autumn' | 'winter')
    const weekInfo = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)

    currentThemeWeekState.value = themeWeek
      ? {
          id: themeWeek.id,
          startDay: weekInfo.weekStartDay,
          endDay: weekInfo.weekEndDay
        }
      : null
    lastThemeWeekRefresh.value = weekInfo.seasonWeekId

    if (announce && themeWeek) {
      addLog(`【主题周】本周主题为「${themeWeek.name}」：${themeWeek.description}`, {
        category: 'goal',
        tags: ['theme_week_started', 'late_game_cycle'],
        meta: { themeWeekId: themeWeek.id, seasonWeekId: weekInfo.seasonWeekId }
      })
      showFloat(`${themeWeek.name} 已开始`, 'accent')
    }
  }

  const ensureInitialized = () => {
    initializeMainQuestStages()
    initializeLongTermGoals()
    if (!dailyGoals.value.length || lastDailyGoalRefresh.value !== getCurrentDayTag()) {
      refreshDailyGoals(false)
    }
    if (!seasonGoals.value.length || lastSeasonGoalRefresh.value !== getCurrentSeasonTag()) {
      refreshSeasonGoals(false)
    }
    if (!currentThemeWeekState.value || lastThemeWeekRefresh.value !== getCurrentThemeWeekTag()) {
      refreshThemeWeek(false)
    }
    ensureWeeklyBudgetPlan()
    syncMainQuestStage()
  }

  const syncMainQuestStage = () => {
    const nextIndex = mainQuestStages.value.findIndex(stage => !stage.completed)
    mainQuestStage.value = nextIndex === -1 ? MAIN_QUEST_STAGE_DEFS.length + 1 : nextIndex + 1
  }

  const grantReward = (title: string, reward: GoalReward) => {
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const wealthTier = playerStore.getEconomyOverview().wealthTier
    const weeklyBudgetEffect = recordWeeklyBudgetGoalSettlement()
    const adjustedMoneyReward = reward.money
      ? Math.max(0, Math.round(reward.money * (wealthTier?.goalCashRewardMultiplier ?? 1) * weeklyBudgetEffect.moneyRewardMultiplier))
      : 0
    const adjustedReputationReward = reward.reputation
      ? Math.max(0, Math.round(reward.reputation * weeklyBudgetEffect.reputationRewardMultiplier) + weeklyBudgetEffect.flatReputationBonus)
      : weeklyBudgetEffect.flatReputationBonus

    let fallbackMoney = 0
    if (adjustedMoneyReward > 0) {
      playerStore.earnMoney(adjustedMoneyReward, { countAsEarned: false })
    }
    if (adjustedReputationReward > 0) {
      goalReputation.value += adjustedReputationReward
    }
    if (reward.items?.length) {
      const canReceiveAll = inventoryStore.canAddItems(
        reward.items.map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' }))
      )
      if (canReceiveAll) {
        for (const item of reward.items) {
          inventoryStore.addItemExact(item.itemId, item.quantity)
        }
      } else {
        for (const item of reward.items) {
          const itemDef = getItemById(item.itemId)
          fallbackMoney += (itemDef?.sellPrice ?? 0) * item.quantity
        }
      }
    }
    if (fallbackMoney > 0) {
      playerStore.earnMoney(fallbackMoney, { countAsEarned: false })
      addLog(`背包已满，部分目标奖励自动折算为${fallbackMoney}文。`)
    }

    const rewardTexts: string[] = []
    if (adjustedMoneyReward > 0) {
      rewardTexts.push(
        wealthTier && reward.money && adjustedMoneyReward !== reward.money
          ? `${adjustedMoneyReward}文（财富层：${wealthTier.label}）`
          : `${adjustedMoneyReward}文`
      )
    }
    if (adjustedReputationReward > 0) rewardTexts.push(`目标声望+${adjustedReputationReward}`)
    const budgetTicketTexts = Object.entries(weeklyBudgetEffect.ticketRewards)
      .filter(([, amount]) => (Number(amount) || 0) > 0)
      .map(([ticketType, amount]) => `${REWARD_TICKET_LABELS[ticketType as RewardTicketType] ?? ticketType}+${amount}`)
    if (budgetTicketTexts.length > 0) rewardTexts.push(...budgetTicketTexts)
    if (reward.items?.length) {
      rewardTexts.push(
        reward.items
          .map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`)
          .join('、')
      )
    }

    addLog(`【目标达成】${title}${rewardTexts.length > 0 ? `，获得：${rewardTexts.join('、')}` : ''}`, {
      category: 'goal',
      tags: ['goal_completed'],
      meta: { title }
    })
    showFloat(`达成：${title}`, 'success')
    if (reward.unlockHint) {
      addLog(`【新阶段】${reward.unlockHint}`, {
        category: 'goal',
        tags: ['goal_unlock_hint'],
        meta: { title }
      })
      showFloat(reward.unlockHint, 'accent')
    }
  }

  const evaluateProgressAndRewards = () => {
    ensureInitialized()
    const snapshot = getMetricSnapshot()

    for (const stage of mainQuestStages.value) {
      for (const condition of stage.conditions) {
        condition.completed = getGoalProgressValue(condition, snapshot) >= condition.targetValue
      }
      stage.completed = stage.conditions.every(condition => condition.completed)
    }

    for (const goal of dailyGoals.value) {
      goal.completed = getGoalProgressValue(goal, snapshot) >= goal.targetValue
    }

    for (const goal of seasonGoals.value) {
      goal.completed = getGoalProgressValue(goal, snapshot) >= goal.targetValue
    }

    for (const goal of longTermGoals.value) {
      goal.completed = getGoalProgressValue(goal, snapshot) >= goal.targetValue
    }

    for (const stage of mainQuestStages.value) {
      if (stage.completed && !stage.rewarded) {
        stage.rewarded = true
        grantReward(`主线里程碑「${stage.title}」`, stage.reward)
      }
    }

    for (const goal of dailyGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward(`今日目标「${goal.title}」`, goal.reward)
      }
    }

    for (const goal of seasonGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward(`本季目标「${goal.title}」`, goal.reward)
      }
    }

    for (const goal of longTermGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward(`长期目标「${goal.title}」`, goal.reward)
        if (goal.id.startsWith('long_sink_')) {
          addLog(`【经营引导】推荐关注高价 sink：「${goal.title}」，可前往钱袋与商圈查看当前推荐资金去向。`, {
            category: 'economy',
            tags: ['economy_sink_guidance'],
            meta: { goalId: goal.id }
          })
        }
      }
    }

    syncMainQuestStage()
  }

  const onSeasonChanged = () => {
    refreshSeasonGoals(true)
    if (lastThemeWeekRefresh.value !== getCurrentThemeWeekTag()) {
      refreshThemeWeek(true)
    }
  }

  const onDayChanged = () => {
    refreshDailyGoals(true)
    if (lastThemeWeekRefresh.value !== getCurrentThemeWeekTag()) {
      refreshThemeWeek(true)
    }
  }

  const onCalendarAdvanced = (seasonChanged = false) => {
    refreshDailyGoals(true)
    if (seasonChanged) {
      refreshSeasonGoals(true)
    }
    if (lastThemeWeekRefresh.value !== getCurrentThemeWeekTag()) {
      refreshThemeWeek(true)
    }
  }

  const serialize = () => ({
    version: GOAL_SAVE_VERSION,
    mainQuestStage: mainQuestStage.value,
    mainQuestStages: mainQuestStages.value,
    dailyGoals: dailyGoals.value,
    seasonGoals: seasonGoals.value,
    longTermGoals: longTermGoals.value,
    goalReputation: goalReputation.value,
    lastDailyGoalRefresh: lastDailyGoalRefresh.value,
    lastSeasonGoalRefresh: lastSeasonGoalRefresh.value,
    lastThemeWeekRefresh: lastThemeWeekRefresh.value,
    currentThemeWeekState: currentThemeWeekState.value,
    weeklyMetricArchive: weeklyMetricArchive.value,
    weeklyBudgetPlan: weeklyBudgetPlan.value,
    weeklyBudgetHistory: weeklyBudgetHistory.value
  })

  const deserialize = (data: ReturnType<typeof serialize> | undefined) => {
    const snapshot = getMetricSnapshot()
    mainQuestStages.value = mergeSavedMainQuestStages(data?.mainQuestStages)
    longTermGoals.value = mergeSavedGoalArray(LONG_TERM_GOAL_DEFS, data?.longTermGoals, {
      ...snapshot,
      totalMoneyEarned: 0,
      totalCropsHarvested: 0,
      totalFishCaught: 0,
      totalRecipesCooked: 0,
      highestMineFloor: 0,
      friendlyNpcCount: 0,
      farmhouseLevel: 0,
      completedBundles: 0,
      discoveredCount: 0,
      crabPotCount: 0,
      childCount: 0,
      caveUnlocked: 0,
      villageProjectLevel: 0,
      hanhaiContractCompletions: 0,
      museumExhibitLevel: 0,
      familyWishCompletions: 0
    })

    if (data?.lastDailyGoalRefresh === getCurrentDayTag()) {
      const selectedDailyDefs = selectDailyGoalTemplates().map(entry => createGoalState(entry.goal, snapshot[entry.goal.metric] ?? 0, entry.source))
      dailyGoals.value = selectedDailyDefs.map(fresh => mergeSavedGoalState(fresh, data?.dailyGoals?.find(goal => goal.id === fresh.id)))
      lastDailyGoalRefresh.value = data.lastDailyGoalRefresh
    } else {
      dailyGoals.value = []
      lastDailyGoalRefresh.value = ''
    }

    if (data?.lastSeasonGoalRefresh === getCurrentSeasonTag()) {
      const gameStore = useGameStore()
      const season = gameStore.season as 'spring' | 'summer' | 'autumn' | 'winter'
      seasonGoals.value = mergeSavedGoalArray(SEASON_GOAL_DEFS[season], data?.seasonGoals, snapshot, 'season')
      lastSeasonGoalRefresh.value = data.lastSeasonGoalRefresh
    } else {
      seasonGoals.value = []
      lastSeasonGoalRefresh.value = ''
    }

    goalReputation.value = data?.goalReputation ?? 0
    currentThemeWeekState.value = data?.currentThemeWeekState ?? null
    lastThemeWeekRefresh.value = data?.lastThemeWeekRefresh ?? ''
    weeklyMetricArchive.value = normalizeWeeklyMetricArchive(data?.weeklyMetricArchive)
    weeklyBudgetPlan.value = normalizeWeeklyBudgetPlan(data?.weeklyBudgetPlan)
    weeklyBudgetHistory.value = normalizeWeeklyBudgetArchive(data?.weeklyBudgetHistory)
    ensureInitialized()
    syncMainQuestStage()
  }

  const currentMainQuest = computed(() => mainQuestStages.value.find(stage => !stage.completed) ?? null)
  const currentDailyGoals = computed(() => dailyGoals.value)
  const completedMainQuestCount = computed(() => mainQuestStages.value.filter(stage => stage.completed).length)
  const currentThemeWeek = computed(() => {
    if (!currentThemeWeekState.value) return null
    const gameStore = useGameStore()
    const themeDef = getThemeWeekBySeason(gameStore.season as 'spring' | 'summer' | 'autumn' | 'winter')
    if (!themeDef || themeDef.id !== currentThemeWeekState.value.id) return null
    return {
      ...themeDef,
      startDay: currentThemeWeekState.value.startDay,
      endDay: currentThemeWeekState.value.endDay
    }
  })
  const currentThemeWeekGoals = computed(() => {
    if (!currentThemeWeek.value) return []

    const focusMetrics = new Set(currentThemeWeek.value.focusMetrics)
    return [...dailyGoals.value, ...seasonGoals.value, ...longTermGoals.value]
      .filter(goal => focusMetrics.has(goal.metric) || goal.id.startsWith('long_sink_'))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        if (a.source !== b.source) {
          if (a.source === 'archetype_bias') return -1
          if (b.source === 'archetype_bias') return 1
          if (a.source === 'season') return 1
          if (b.source === 'season') return -1
        }
        return a.targetValue - b.targetValue
      })
      .slice(0, 4)
  })

  const recommendedEconomySinks = computed(() => {
    const playerStore = usePlayerStore()
    const overview = playerStore.getEconomyOverview()
    const segmentId = overview.currentSegment?.id ?? 'mid_transition'
    const tierRank = segmentId === 'endgame_tycoon' ? 3 : segmentId === 'late_builder' ? 2 : 1
    const wealthTier = overview.wealthTier
    return ECONOMY_SINK_CONTENT_DEFS
      .filter(item => (item.tier === 'mid_transition' ? 1 : item.tier === 'late_growth' ? 2 : 3) <= tierRank)
      .map(item => {
        let score = item.linkedSystems.length
        if (overview.sinkSatisfaction < 0.35 && ['service', 'maintenance', 'luxuryCatalog'].includes(item.category)) score += ECONOMY_TUNING_CONFIG.sinkScoreBonuses.lowSinkSatisfaction
        if (overview.loopDiversity < 4 && item.linkedSystems.length >= 3) score += ECONOMY_TUNING_CONFIG.sinkScoreBonuses.lowLoopDiversity
        if (overview.dominantIncomeShare > 0.6 && item.linkedSystems.includes('market')) score += ECONOMY_TUNING_CONFIG.sinkScoreBonuses.highDominantIncome
        if (currentThemeWeek.value && item.linkedSystems.includes('goal')) score += ECONOMY_TUNING_CONFIG.sinkScoreBonuses.themeWeekMatch
        if (wealthTier?.preferredSinkCategories.includes(item.category)) score += wealthTier.recommendationWeight
        return { ...item, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, ECONOMY_TUNING_CONFIG.recommendedSinkCount)
  })
  const latestWeeklyMetricSnapshot = computed(() => weeklyMetricArchive.value.snapshots[weeklyMetricArchive.value.snapshots.length - 1] ?? null)
  const weeklyBudgetChannels = computed(() => WEEKLY_BUDGET_CHANNELS)
  const weeklyBudgetSelections = computed(() => weeklyBudgetPlan.value.selections)

  return {
    mainQuestStage,
    mainQuestStages,
    dailyGoals,
    seasonGoals,
    longTermGoals,
    goalReputation,
    lastDailyGoalRefresh,
    lastSeasonGoalRefresh,
    currentMainQuest,
    currentDailyGoals,
    currentThemeWeek,
    currentThemeWeekGoals,
    recommendedEconomySinks,
    weeklyBudgetChannels,
    weeklyBudgetPlan,
    weeklyBudgetSelections,
    weeklyBudgetHistory,
    weeklyMetricArchive,
    latestWeeklyMetricSnapshot,
    completedMainQuestCount,
    ensureInitialized,
    refreshDailyGoals,
    refreshSeasonGoals,
    refreshThemeWeek,
    activateWeeklyBudget,
    getWeeklyBudgetSelection,
    resetWeeklyBudgetsForNewWeek,
    onDayChanged,
    onSeasonChanged,
    onCalendarAdvanced,
    evaluateProgressAndRewards,
    getGoalProgressValue,
    getGoalProgressText,
    getGoalSourceText,
    buildLateGameMetricSnapshot,
    archiveWeeklyMetricSnapshot,
    serialize,
    deserialize
  }
})