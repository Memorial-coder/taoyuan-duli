import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getItemById, getThemeWeekBySeason, getThemeWeekRewardPool, getWeeklyGoalsBySeasonWeek } from '@/data'
import {
  DAILY_GOAL_DEFS,
  GOAL_BIAS_MAP,
  GOAL_SOURCE_LABELS,
  LONG_TERM_GOAL_DEFS,
  MAIN_QUEST_STAGE_DEFS,
  SEASON_GOAL_DEFS,
  createDefaultEventOperationsState,
  WS10_EVENT_CAMPAIGN_DEFS,
  WS10_EVENT_MAIL_TEMPLATE_REFS,
  WS10_EVENT_OPERATION_TUNING_CONFIG,
  WS10_EVENT_OPERATIONS_BASELINE_AUDIT,
  WEEKLY_GOAL_FAILURE_COMPENSATION_RULE
} from '@/data/goals'
import { REWARD_TICKET_LABELS } from '@/data/rewardTickets'
import { WEEKLY_BUDGET_CHANNEL_MAP, WEEKLY_BUDGET_CHANNELS } from '@/data/weeklyBudgets'
import { ECONOMY_SINK_CONTENT_DEFS, ECONOMY_TUNING_CONFIG } from '@/data/market'
import type {
  EventOperationsState,
  LateGameMetricSnapshot,
  RewardTicketType,
  ThemeWeekState,
  ThemeWeekRewardPoolEntry,
  WeeklyBudgetArchive,
  WeeklyBudgetChannelId,
  WeeklyBudgetPlan,
  WeeklyBudgetSelection,
  WeeklyBudgetTierDef,
  WeeklyGoalDef,
  WeeklyGoalSettlementItem,
  WeeklyGoalSettlementSummary,
  WeeklyGoalState,
  WeeklyGoalStreakState,
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
import { useShopStore } from './useShopStore'
import { useSettingsStore } from './useSettingsStore'
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

type GoalSource = 'random' | 'season' | 'weekly' | 'archetype_bias'

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
const GOAL_SAVE_VERSION = 5
const WEEKLY_METRIC_ARCHIVE_VERSION = 1
const WEEKLY_METRIC_ARCHIVE_LIMIT = 4
const WEEKLY_BUDGET_ARCHIVE_LIMIT = 8

const createEmptyWeeklyGoalStreakState = (): WeeklyGoalStreakState => ({
  current: 0,
  best: 0,
  lastCompletedWeekId: '',
  lastSettledWeekId: '',
  lastOutcome: 'idle'
})

const normalizeWeeklyGoalStreakState = (value: unknown): WeeklyGoalStreakState => {
  if (!value || typeof value !== 'object') return createEmptyWeeklyGoalStreakState()
  const raw = value as Partial<WeeklyGoalStreakState>
  const outcome = raw.lastOutcome === 'completed' || raw.lastOutcome === 'partial' || raw.lastOutcome === 'failed' ? raw.lastOutcome : 'idle'
  return {
    current: Math.max(0, Number(raw.current) || 0),
    best: Math.max(0, Number(raw.best) || 0),
    lastCompletedWeekId: typeof raw.lastCompletedWeekId === 'string' ? raw.lastCompletedWeekId : '',
    lastSettledWeekId: typeof raw.lastSettledWeekId === 'string' ? raw.lastSettledWeekId : '',
    lastOutcome: outcome
  }
}

const normalizeWeeklyGoalSettlementItem = (value: unknown): WeeklyGoalSettlementItem | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<WeeklyGoalSettlementItem>
  return {
    goalId: typeof raw.goalId === 'string' ? raw.goalId : '',
    title: typeof raw.title === 'string' ? raw.title : '',
    completed: !!raw.completed,
    progressValue: Math.max(0, Number(raw.progressValue) || 0),
    targetValue: Math.max(0, Number(raw.targetValue) || 0),
    rewardGranted: !!raw.rewardGranted,
    rewardSummary: typeof raw.rewardSummary === 'string' ? raw.rewardSummary : undefined,
    compensationGranted: typeof raw.compensationGranted === 'boolean' ? raw.compensationGranted : undefined,
    failureCompensationReason: typeof raw.failureCompensationReason === 'string' ? raw.failureCompensationReason : undefined,
    failureCompensationReward:
      raw.failureCompensationReward && typeof raw.failureCompensationReward === 'object'
        ? {
            money: Math.max(0, Number((raw.failureCompensationReward as GoalReward).money) || 0) || undefined,
            reputation: Math.max(0, Number((raw.failureCompensationReward as GoalReward).reputation) || 0) || undefined,
            items: Array.isArray((raw.failureCompensationReward as GoalReward).items)
              ? (raw.failureCompensationReward as GoalReward).items
                  ?.filter(item => item && typeof item.itemId === 'string')
                  .map(item => ({ itemId: item.itemId, quantity: Math.max(1, Number(item.quantity) || 1) }))
              : undefined,
            unlockHint:
              typeof (raw.failureCompensationReward as GoalReward).unlockHint === 'string'
                ? (raw.failureCompensationReward as GoalReward).unlockHint
                : undefined
          }
        : undefined,
    compensationSummary: typeof raw.compensationSummary === 'string' ? raw.compensationSummary : undefined
  }
}

const normalizeWeeklyGoalSettlementSummary = (value: unknown): WeeklyGoalSettlementSummary | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<WeeklyGoalSettlementSummary>
  const season = raw.season
  const weekOfSeason = Number(raw.weekOfSeason)
  if (season !== 'spring' && season !== 'summer' && season !== 'autumn' && season !== 'winter') return null
  if (weekOfSeason !== 1 && weekOfSeason !== 2 && weekOfSeason !== 3 && weekOfSeason !== 4) return null
  return {
    weekId: typeof raw.weekId === 'string' ? raw.weekId : '',
    season,
    weekOfSeason,
    linkedThemeWeekId: typeof raw.linkedThemeWeekId === 'string' ? raw.linkedThemeWeekId : undefined,
    completedGoalCount: Math.max(0, Number(raw.completedGoalCount) || 0),
    totalGoalCount: Math.max(0, Number(raw.totalGoalCount) || 0),
    settledAtDayTag: typeof raw.settledAtDayTag === 'string' ? raw.settledAtDayTag : '',
    items: Array.isArray(raw.items) ? raw.items.map(normalizeWeeklyGoalSettlementItem).filter((item): item is WeeklyGoalSettlementItem => item !== null) : [],
    rewardHighlights: Array.isArray(raw.rewardHighlights) ? raw.rewardHighlights.filter((item): item is string => typeof item === 'string') : [],
    failureHighlights: Array.isArray(raw.failureHighlights) ? raw.failureHighlights.filter((item): item is string => typeof item === 'string') : [],
    recommendationHighlights: Array.isArray(raw.recommendationHighlights) ? raw.recommendationHighlights.filter((item): item is string => typeof item === 'string') : [],
    appliedThemeRewardPoolIds: Array.isArray(raw.appliedThemeRewardPoolIds) ? raw.appliedThemeRewardPoolIds.filter((item): item is string => typeof item === 'string') : [],
    compensationRewardSummaries: Array.isArray(raw.compensationRewardSummaries) ? raw.compensationRewardSummaries.filter((item): item is string => typeof item === 'string') : []
  }
}

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

const createGoalState = (template: GoalTemplate, baselineValue = 0, source: GoalSource = 'random'): GoalState => ({
  ...template,
  baselineValue,
  completed: false,
  rewarded: false,
  source
})

const EVENT_CAMPAIGN_TIER_WEIGHT: Record<'P0' | 'P1' | 'P2', number> = {
  P0: 0,
  P1: 1,
  P2: 2
}

const createWeeklyGoalState = (template: WeeklyGoalDef, weekId: string, baselineValue = 0): WeeklyGoalState => ({
  ...createGoalState(template, baselineValue, 'weekly'),
  season: template.season,
  weekOfSeason: template.weekOfSeason,
  weekId,
  linkedThemeWeekId: template.linkedThemeWeekId
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

export const useGoalStore = defineStore('goal', () => {
  const settingsStore = useSettingsStore()
  const mainQuestStage = ref(1)
  const mainQuestStages = ref<MainQuestStageState[]>([])
  const dailyGoals = ref<GoalState[]>([])
  const seasonGoals = ref<GoalState[]>([])
  const weeklyGoals = ref<WeeklyGoalState[]>([])
  const longTermGoals = ref<GoalState[]>([])
  const goalReputation = ref(0)
  const lastDailyGoalRefresh = ref('')
  const lastSeasonGoalRefresh = ref('')
  const lastWeeklyGoalRefresh = ref('')
  const lastThemeWeekRefresh = ref('')
  const currentThemeWeekState = ref<ThemeWeekState | null>(null)
  const lastWeeklyGoalSettlement = ref<WeeklyGoalSettlementSummary | null>(null)
  const lastSettledWeeklyGoalWeekId = ref('')
  const weeklyStreakState = ref<WeeklyGoalStreakState>(createEmptyWeeklyGoalStreakState())
  const sentWeeklySettlementMailWeekIds = ref<string[]>([])
  const weeklyMetricArchive = ref<WeeklyMetricArchive>(createEmptyWeeklyMetricArchive())
  const weeklyBudgetPlan = ref<WeeklyBudgetPlan>(createEmptyWeeklyBudgetPlan())
  const weeklyBudgetHistory = ref<WeeklyBudgetArchive[]>([])
  const eventOperationsBaselineAudit = WS10_EVENT_OPERATIONS_BASELINE_AUDIT
  const eventOperationsState = ref<EventOperationsState>(createDefaultEventOperationsState())
  const eventCampaignDefs = WS10_EVENT_CAMPAIGN_DEFS
  const eventMailTemplateRefs = WS10_EVENT_MAIL_TEMPLATE_REFS
  const eventOperationTuning = WS10_EVENT_OPERATION_TUNING_CONFIG
  const eventOperationFeatureFlags = eventOperationTuning.featureFlags
  const eventOperationLocks = ref<string[]>([])

  const beginEventOperation = (lockId: string): boolean => {
    if (eventOperationLocks.value.includes(lockId)) return false
    eventOperationLocks.value = [...eventOperationLocks.value, lockId]
    return true
  }

  const finishEventOperation = (lockId: string) => {
    eventOperationLocks.value = eventOperationLocks.value.filter(entry => entry !== lockId)
  }

  const createEventOperationSnapshot = () => ({
    eventOperationsState: { ...eventOperationsState.value }
  })

  const rollbackEventOperation = (snapshot: ReturnType<typeof createEventOperationSnapshot>) => {
    eventOperationsState.value = { ...snapshot.eventOperationsState }
  }

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

  const getCurrentWeekInfo = () => {
    const gameStore = useGameStore()
    return getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
  }

  const isWeeklyGoalFeatureEnabled = () => settingsStore.isFeatureEnabled('lateGameWeeklyGoals')

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
      showFloat('该预算槽本周已投入。', 'danger')
      return false
    }

    const channelDef = WEEKLY_BUDGET_CHANNEL_MAP[channelId]
    const tierDef = channelDef?.tiers.find((tier: WeeklyBudgetTierDef) => tier.id === tierId)
    if (!channelDef || !tierDef) {
      showFloat('预算档位不存在。', 'danger')
      return false
    }

    const playerStore = usePlayerStore()
    if (!playerStore.spendMoney(tierDef.costMoney, 'goal')) {
      showFloat('閾滈挶涓嶈冻锛屾棤娉曟姇鍏ュ懆棰勭畻', 'danger')
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
        return npcStore.getFamilyWishOverview().state.completedWishIds.length
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

  const buildLateGameMetricSnapshot = (
    weekInfo: WeekCycleInfo,
    generatedAtDayTag: string,
    overrides?: Partial<Pick<LateGameMetricSnapshot, 'hanhaiContractCompletions'>>
  ): LateGameMetricSnapshot => {
    const playerStore = usePlayerStore()
    const hanhaiStore = useHanhaiStore()
    const fishPondStore = useFishPondStore()
    const museumStore = useMuseumStore()
    const npcStore = useNpcStore()
    const shopStore = useShopStore()
    const villageProjectStore = useVillageProjectStore()
    const themeWeek = getThemeWeekBySeason(weekInfo.season, weekInfo.weekOfSeason)
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
      serviceContractCount: shopStore.activeServiceContractSummaries.length,
      hanhaiContractCompletions: Math.max(0, Number(overrides?.hanhaiContractCompletions ?? hanhaiStore.totalRelicClears) || 0),
      fishPondContestScore: matureHealthyPondFish,
      museumExhibitLevel: museumStore.exhibitLevel,
      socialParticipationScore,
      villageProsperityScore,
      sourceSnapshotCount: weeklyEconomySnapshots.length,
      activeThemeWeekId: themeWeek?.id
    }
  }

  const archiveWeeklyMetricSnapshot = (
    weekInfo: WeekCycleInfo,
    generatedAtDayTag: string,
    overrides?: Partial<Pick<LateGameMetricSnapshot, 'hanhaiContractCompletions'>>
  ) => {
    const snapshot = buildLateGameMetricSnapshot(weekInfo, generatedAtDayTag, overrides)
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

  const getGoalSourceText = (goal: GoalState) =>
    goal.source === 'weekly' ? '閸涖劎娲伴弽?' : GOAL_SOURCE_LABELS[goal.source] ?? GOAL_SOURCE_LABELS.random

  const mergeSavedGoalState = (fresh: GoalState, saved?: Partial<GoalState>): GoalState => ({
    ...fresh,
    baselineValue: saved?.baselineValue ?? fresh.baselineValue,
    completed: saved?.completed ?? fresh.completed,
    rewarded: saved?.rewarded ?? saved?.completed ?? fresh.rewarded,
    source: saved?.source ?? fresh.source
  })

  const mergeSavedWeeklyGoalState = (fresh: WeeklyGoalState, saved?: Partial<WeeklyGoalState>): WeeklyGoalState => ({
    ...fresh,
    baselineValue: saved?.baselineValue ?? fresh.baselineValue,
    completed: saved?.completed ?? fresh.completed,
    rewarded: saved?.rewarded ?? saved?.completed ?? fresh.rewarded,
    source: 'weekly'
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

  const mergeSavedWeeklyGoalArray = (
    defs: WeeklyGoalDef[],
    savedGoals: WeeklyGoalState[] | undefined,
    baselineSnapshot: Record<GoalMetricKey, number>,
    weekId: string
  ) => {
    return defs.map(def => {
      const fresh = createWeeklyGoalState(def, weekId, baselineSnapshot[def.metric] ?? 0)
      const saved = savedGoals?.find(goal => goal.id === def.id)
      return mergeSavedWeeklyGoalState(fresh, saved)
    })
  }

  const formatGoalRewardSummary = (reward: GoalReward | undefined) => {
    if (!reward) return ''
    const summaryParts: string[] = []
    if (reward.money) summaryParts.push(`${reward.money}文`)
    if (reward.reputation) summaryParts.push(`目标声望+${reward.reputation}`)
    if (reward.items?.length) {
      summaryParts.push(
        reward.items
          .map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`)
          .join('、')
      )
    }
    return summaryParts.join('、')
  }

  const getWeeklyGoalRewardPool = (themeWeekId = currentThemeWeek.value?.id ?? ''): ThemeWeekRewardPoolEntry[] => {
    if (!themeWeekId) return []
    return getThemeWeekRewardPool(themeWeekId)
  }

  const resolveAppliedThemeRewardEntries = (
    completedGoalCount: number,
    totalGoalCount: number,
    themeWeekId?: string
  ): ThemeWeekRewardPoolEntry[] => {
    if (!themeWeekId || totalGoalCount <= 0) return []
    const rewardPool = getWeeklyGoalRewardPool(themeWeekId)
    if (rewardPool.length === 0) return []
    return rewardPool.filter(entry => {
      if (entry.threshold === 'any') return completedGoalCount > 0
      if (entry.threshold === 'majority') return completedGoalCount >= Math.max(1, Math.ceil(totalGoalCount / 2))
      return completedGoalCount === totalGoalCount && totalGoalCount > 0
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

  const refreshWeeklyGoals = (announce = false) => {
    if (!isWeeklyGoalFeatureEnabled()) {
      weeklyGoals.value = []
      lastWeeklyGoalRefresh.value = ''
      return
    }

    const weekInfo = getCurrentWeekInfo()
    const snapshot = getMetricSnapshot()
    const defs = getWeeklyGoalsBySeasonWeek(weekInfo.season, weekInfo.weekOfSeason) as WeeklyGoalDef[]
    weeklyGoals.value = defs.map(goal => createWeeklyGoalState(goal, weekInfo.seasonWeekId, snapshot[goal.metric] ?? 0))
    lastWeeklyGoalRefresh.value = weekInfo.seasonWeekId

    if (announce && weeklyGoals.value.length > 0) {
      addLog(`[Weekly Goals] refreshed ${weeklyGoals.value.length} goals.`, {
        category: 'goal',
        tags: ['weekly_goals_refreshed', 'late_game_cycle'],
        meta: { weekId: weekInfo.seasonWeekId, weekOfSeason: weekInfo.weekOfSeason }
      })
      showFloat('Weekly goals refreshed', 'accent')
    }
  }

  const refreshThemeWeek = (announce = false) => {
    const gameStore = useGameStore()
    const weekInfo = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
    const themeWeek = getThemeWeekBySeason(gameStore.season as 'spring' | 'summer' | 'autumn' | 'winter', weekInfo.weekOfSeason)

    currentThemeWeekState.value = themeWeek
      ? {
          id: themeWeek.id,
          weekOfSeason: weekInfo.weekOfSeason,
          seasonWeekId: weekInfo.seasonWeekId,
          startDay: weekInfo.weekStartDay,
          endDay: weekInfo.weekEndDay
        }
      : null
    lastThemeWeekRefresh.value = weekInfo.seasonWeekId

    if (announce && themeWeek) {
      addLog(`[Theme Week] ${themeWeek.name}: ${themeWeek.description}`, {
        category: 'goal',
        tags: ['theme_week_started', 'late_game_cycle'],
        meta: { themeWeekId: themeWeek.id, seasonWeekId: weekInfo.seasonWeekId }
      })
      showFloat(themeWeek.name + ' 已开始', 'accent')
    }
  }

  const ensureInitialized = () => {
    initializeMainQuestStages()
    initializeLongTermGoals()
    const weekInfo = getCurrentWeekInfo()
    if (!dailyGoals.value.length || lastDailyGoalRefresh.value !== getCurrentDayTag()) {
      refreshDailyGoals(false)
    }
    if (!seasonGoals.value.length || lastSeasonGoalRefresh.value !== getCurrentSeasonTag()) {
      refreshSeasonGoals(false)
    }
    if (isWeeklyGoalFeatureEnabled()) {
      if (!weeklyGoals.value.length || lastWeeklyGoalRefresh.value !== weekInfo.seasonWeekId) {
        refreshWeeklyGoals(false)
      }
    } else if (weeklyGoals.value.length || lastWeeklyGoalRefresh.value) {
      weeklyGoals.value = []
      lastWeeklyGoalRefresh.value = ''
    }
    if (
      !currentThemeWeekState.value ||
      lastThemeWeekRefresh.value !== weekInfo.seasonWeekId ||
      currentThemeWeekState.value.weekOfSeason !== weekInfo.weekOfSeason ||
      currentThemeWeekState.value.seasonWeekId !== weekInfo.seasonWeekId
    ) {
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
    const walletStore = useWalletStore()
    const shopStore = useShopStore()
    const wealthTier = playerStore.getEconomyOverview().wealthTier
    const weeklyBudgetEffect = recordWeeklyBudgetGoalSettlement()
    const serviceContractEffect = shopStore.getServiceContractEffectSummary('goal')
    const combinedMoneyRewardMultiplier = weeklyBudgetEffect.moneyRewardMultiplier * serviceContractEffect.moneyRewardMultiplier
    const combinedReputationRewardMultiplier = weeklyBudgetEffect.reputationRewardMultiplier * serviceContractEffect.reputationRewardMultiplier
    const combinedFlatReputationBonus =
      weeklyBudgetEffect.flatReputationBonus + serviceContractEffect.flatReputationBonus + serviceContractEffect.goalReputationFlatBonus
    const adjustedMoneyReward = reward.money
      ? Math.max(0, Math.round(reward.money * (wealthTier?.goalCashRewardMultiplier ?? 1) * combinedMoneyRewardMultiplier))
      : 0
    const adjustedReputationReward = reward.reputation
      ? Math.max(0, Math.round(reward.reputation * combinedReputationRewardMultiplier) + combinedFlatReputationBonus)
      : combinedFlatReputationBonus
    const grantedServiceContractTickets = walletStore.addRewardTickets(serviceContractEffect.ticketRewards, { source: 'goal' })

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
      addLog(`Backpack full, converted part of the goal rewards into ${fallbackMoney} money.`)
    }

    const rewardTexts: string[] = []
    if (adjustedMoneyReward > 0) {
      rewardTexts.push(
        wealthTier && reward.money && adjustedMoneyReward !== reward.money
          ? adjustedMoneyReward + '文（财富层：' + wealthTier.label + '）'
          : adjustedMoneyReward + '文'
      )
    }
    if (adjustedReputationReward > 0) rewardTexts.push('目标声望+' + adjustedReputationReward)
    const combinedTicketRewards = Object.entries({ ...weeklyBudgetEffect.ticketRewards, ...grantedServiceContractTickets }).reduce(
      (result, [ticketType, amount]) => {
        result[ticketType as RewardTicketType] =
          (result[ticketType as RewardTicketType] ?? 0) + Math.max(0, Number(amount) || 0)
        return result
      },
      {} as Partial<Record<RewardTicketType, number>>
    )
    const budgetTicketTexts = Object.entries(combinedTicketRewards)
      .filter(([, amount]) => (Number(amount) || 0) > 0)
      .map(([ticketType, amount]) => (REWARD_TICKET_LABELS[ticketType as RewardTicketType] ?? ticketType) + '+' + amount)
    if (budgetTicketTexts.length > 0) rewardTexts.push(...budgetTicketTexts)
    if (reward.items?.length) {
      rewardTexts.push(
        reward.items
          .map(item => (getItemById(item.itemId)?.name ?? item.itemId) + '×' + item.quantity)
          .join('、')
      )
    }

    const completedRewardText = rewardTexts.length > 0 ? '，获得：' + rewardTexts.join(', ') : ''
    addLog('[Goal Completed] ' + title + completedRewardText, {
      category: 'goal',
      tags: ['goal_completed'],
      meta: { title }
    })
    showFloat('达成：' + title, 'success')
    if (reward.unlockHint) {
      addLog('[New Stage] ' + reward.unlockHint, {
        category: 'goal',
        tags: ['goal_unlock_hint'],
        meta: { title }
      })
      showFloat(reward.unlockHint, 'accent')
    }
  }

  const grantManualReward = (title: string, reward: GoalReward) => {
    grantReward(title, reward)
  }

  const buildWeeklyGoalSettlementSummary = (
    weekInfo: WeekCycleInfo,
    settledAtDayTag = getCurrentDayTag(),
    options?: { enableCompensation?: boolean }
  ): WeeklyGoalSettlementSummary | null => {
    if (!weeklyGoals.value.length) return null
    const snapshot = getMetricSnapshot()
    const enableCompensation = options?.enableCompensation ?? false
    const completedGoalCount = weeklyGoals.value.filter(goal => goal.completed).length
    const totalGoalCount = weeklyGoals.value.length
    const linkedThemeWeekId = weeklyGoals.value[0]?.linkedThemeWeekId ?? currentThemeWeek.value?.id
    const appliedThemeRewardEntries = resolveAppliedThemeRewardEntries(
      completedGoalCount,
      totalGoalCount,
      linkedThemeWeekId
    )
    let remainingCompensationSlots = enableCompensation && WEEKLY_GOAL_FAILURE_COMPENSATION_RULE.enabled
      ? Math.max(0, WEEKLY_GOAL_FAILURE_COMPENSATION_RULE.maxCompensatedGoals)
      : 0

    const items = weeklyGoals.value.map(goal => {
      const progressValue = getGoalProgressValue(goal, snapshot)
      const rewardSummary = goal.completed ? formatGoalRewardSummary(goal.reward) : ''
      const progressRatio = goal.targetValue > 0 ? progressValue / goal.targetValue : 0
      const shouldCompensate =
        !goal.completed &&
        remainingCompensationSlots > 0 &&
        progressRatio >= WEEKLY_GOAL_FAILURE_COMPENSATION_RULE.minProgressRatio
      const compensationReward = shouldCompensate
        ? {
            money: WEEKLY_GOAL_FAILURE_COMPENSATION_RULE.reward.money,
            items: WEEKLY_GOAL_FAILURE_COMPENSATION_RULE.reward.items.map(item => ({ ...item }))
          }
        : undefined
      if (shouldCompensate) remainingCompensationSlots -= 1
      return {
        goalId: goal.id,
        title: goal.title,
        completed: goal.completed,
        progressValue,
        targetValue: goal.targetValue,
        rewardGranted: goal.completed && goal.rewarded,
        rewardSummary: rewardSummary || undefined,
        compensationGranted: shouldCompensate || undefined,
        failureCompensationReason: shouldCompensate ? WEEKLY_GOAL_FAILURE_COMPENSATION_RULE.reasonTemplate : undefined,
        failureCompensationReward: compensationReward,
        compensationSummary: shouldCompensate ? formatGoalRewardSummary(compensationReward) : undefined
      } satisfies WeeklyGoalSettlementItem
    })

    return {
      weekId: weekInfo.seasonWeekId,
      season: weekInfo.season,
      weekOfSeason: weekInfo.weekOfSeason,
      linkedThemeWeekId,
      completedGoalCount,
      totalGoalCount,
      settledAtDayTag,
      items,
      rewardHighlights: [
        ...items.filter(item => item.rewardSummary).map(item => `${item.title}：${item.rewardSummary}`),
        ...appliedThemeRewardEntries.map(entry => `${entry.label}：${formatGoalRewardSummary(entry.bonusReward)}`)
      ],
      failureHighlights: items.filter(item => !item.completed).map(item => `${item.title}：${Math.max(0, item.targetValue - item.progressValue)} 未达成`),
      recommendationHighlights:
        appliedThemeRewardEntries.length > 0
          ? appliedThemeRewardEntries.map(entry => `${entry.label}：${entry.description}`)
          : [
              completedGoalCount === totalGoalCount
                ? '本周周目标全部完成，下周可继续冲刺更高阶主题承接。'
                : completedGoalCount > 0
                  ? '本周已有部分周目标达成，下周优先补齐未完成项对应的经营链路。'
                  : '本周未形成有效周目标闭环，建议优先跟进主题周重点目标。'
            ],
      appliedThemeRewardPoolIds: appliedThemeRewardEntries.map(entry => entry.id),
      compensationRewardSummaries: items.filter(item => item.compensationSummary).map(item => `${item.title}：${item.compensationSummary}`)
    }
  }

  const settleWeeklyGoals = (payload: {
    weekInfo: WeekCycleInfo
    settledAtDayTag?: string
    enableCompensation?: boolean
  }) => {
    ensureInitialized()
    if (!weeklyGoals.value.length) return null
    if (lastSettledWeeklyGoalWeekId.value === payload.weekInfo.seasonWeekId) {
      return lastWeeklyGoalSettlement.value?.weekId === payload.weekInfo.seasonWeekId ? lastWeeklyGoalSettlement.value : null
    }

    const settledAtDayTag = payload.settledAtDayTag ?? getCurrentDayTag()
    const summaryThemeRewardEntries = resolveAppliedThemeRewardEntries(
      weeklyGoals.value.filter(goal => goal.completed).length,
      weeklyGoals.value.length,
      weeklyGoals.value[0]?.linkedThemeWeekId ?? currentThemeWeek.value?.id
    )

    for (const goal of weeklyGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward('本周目标「' + goal.title + '」', goal.reward)
      }
    }

    for (const entry of summaryThemeRewardEntries) {
      grantReward(`主题周奖励「${entry.label}」`, entry.bonusReward)
    }

    const summary = buildWeeklyGoalSettlementSummary(payload.weekInfo, settledAtDayTag, {
      enableCompensation: payload.enableCompensation
    })
    if (!summary) return null

    weeklyStreakState.value = (() => {
      const nextState = { ...weeklyStreakState.value }
      const allCompleted = summary.completedGoalCount === summary.totalGoalCount && summary.totalGoalCount > 0
      if (allCompleted) {
        nextState.current += 1
        nextState.best = Math.max(nextState.best, nextState.current)
        nextState.lastCompletedWeekId = summary.weekId
        nextState.lastOutcome = 'completed'
      } else if (summary.completedGoalCount > 0) {
        nextState.current = 0
        nextState.lastOutcome = 'partial'
      } else {
        nextState.current = 0
        nextState.lastOutcome = 'failed'
      }
      nextState.lastSettledWeekId = summary.weekId
      return nextState
    })()

    lastWeeklyGoalSettlement.value = summary
    lastSettledWeeklyGoalWeekId.value = summary.weekId

    addLog(`[Weekly Goals] 已结算 ${summary.weekId}：完成 ${summary.completedGoalCount}/${summary.totalGoalCount}。`, {
      category: 'goal',
      tags: ['weekly_goals_settled', 'late_game_cycle'],
      meta: {
        weekId: summary.weekId,
        completedGoalCount: summary.completedGoalCount,
        totalGoalCount: summary.totalGoalCount,
        streak: weeklyStreakState.value.current
      }
    })
    if (summary.failureHighlights.length > 0) {
      addLog(`[Weekly Goals] 未完成项：${summary.failureHighlights.join('；')}`, {
        category: 'goal',
        tags: ['weekly_goals_failed', 'late_game_cycle'],
        meta: { weekId: summary.weekId }
      })
    }
    return summary
  }

  const markWeeklySettlementMailSent = (weekId: string) => {
    if (!weekId || sentWeeklySettlementMailWeekIds.value.includes(weekId)) return false
    sentWeeklySettlementMailWeekIds.value = [...sentWeeklySettlementMailWeekIds.value, weekId]
    return true
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

    for (const goal of weeklyGoals.value) {
      goal.completed = getGoalProgressValue(goal, snapshot) >= goal.targetValue
    }

    for (const goal of longTermGoals.value) {
      goal.completed = getGoalProgressValue(goal, snapshot) >= goal.targetValue
    }

    for (const stage of mainQuestStages.value) {
      if (stage.completed && !stage.rewarded) {
        stage.rewarded = true
        grantReward('主线里程碑「' + stage.title + '」', stage.reward)
      }
    }

    for (const goal of dailyGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward('今日目标「' + goal.title + '」', goal.reward)
      }
    }

    for (const goal of seasonGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward('本季目标「' + goal.title + '」', goal.reward)
      }
    }

    for (const goal of longTermGoals.value) {
      if (goal.completed && !goal.rewarded) {
        goal.rewarded = true
        grantReward('长期目标「' + goal.title + '」', goal.reward)
        if (goal.id.startsWith('long_sink_')) {
          addLog('[经营引导] 推荐关注高价 sink：「' + goal.title + '」，可前往钱包与商圈查看当前推荐资金去向。', {
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
    if (isWeeklyGoalFeatureEnabled() && lastWeeklyGoalRefresh.value !== getCurrentThemeWeekTag()) {
      refreshWeeklyGoals(true)
    }
    if (lastThemeWeekRefresh.value !== getCurrentThemeWeekTag()) {
      refreshThemeWeek(true)
    }
  }

  const onDayChanged = () => {
    refreshDailyGoals(true)
    if (isWeeklyGoalFeatureEnabled() && lastWeeklyGoalRefresh.value !== getCurrentThemeWeekTag()) {
      refreshWeeklyGoals(true)
    }
    if (lastThemeWeekRefresh.value !== getCurrentThemeWeekTag()) {
      refreshThemeWeek(true)
    }
  }

  const onCalendarAdvanced = (seasonChanged = false) => {
    refreshDailyGoals(true)
    if (seasonChanged) {
      refreshSeasonGoals(true)
    }
    if (isWeeklyGoalFeatureEnabled() && lastWeeklyGoalRefresh.value !== getCurrentThemeWeekTag()) {
      refreshWeeklyGoals(true)
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
    weeklyGoals: weeklyGoals.value,
    longTermGoals: longTermGoals.value,
    goalReputation: goalReputation.value,
    lastDailyGoalRefresh: lastDailyGoalRefresh.value,
    lastSeasonGoalRefresh: lastSeasonGoalRefresh.value,
    lastWeeklyGoalRefresh: lastWeeklyGoalRefresh.value,
    lastThemeWeekRefresh: lastThemeWeekRefresh.value,
    currentThemeWeekState: currentThemeWeekState.value,
    lastWeeklyGoalSettlement: lastWeeklyGoalSettlement.value,
    lastSettledWeeklyGoalWeekId: lastSettledWeeklyGoalWeekId.value,
    weeklyStreakState: weeklyStreakState.value,
    sentWeeklySettlementMailWeekIds: sentWeeklySettlementMailWeekIds.value,
    weeklyMetricArchive: weeklyMetricArchive.value,
    weeklyBudgetPlan: weeklyBudgetPlan.value,
    weeklyBudgetHistory: weeklyBudgetHistory.value,
    eventOperationsState: eventOperationsState.value
  })

  const deserialize = (data: ReturnType<typeof serialize> | undefined) => {
    const snapshot = getMetricSnapshot()
    const currentWeekInfo = getCurrentWeekInfo()
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

    if (isWeeklyGoalFeatureEnabled() && data?.lastWeeklyGoalRefresh === currentWeekInfo.seasonWeekId) {
      const defs = getWeeklyGoalsBySeasonWeek(currentWeekInfo.season, currentWeekInfo.weekOfSeason) as WeeklyGoalDef[]
      weeklyGoals.value = mergeSavedWeeklyGoalArray(defs, data?.weeklyGoals, snapshot, currentWeekInfo.seasonWeekId)
      lastWeeklyGoalRefresh.value = data.lastWeeklyGoalRefresh
    } else {
      weeklyGoals.value = []
      lastWeeklyGoalRefresh.value = ''
    }

    goalReputation.value = data?.goalReputation ?? 0
    currentThemeWeekState.value = data?.currentThemeWeekState ?? null
    lastThemeWeekRefresh.value = data?.lastThemeWeekRefresh ?? ''
    lastWeeklyGoalSettlement.value = normalizeWeeklyGoalSettlementSummary((data as any)?.lastWeeklyGoalSettlement)
    lastSettledWeeklyGoalWeekId.value = typeof (data as any)?.lastSettledWeeklyGoalWeekId === 'string' ? (data as any).lastSettledWeeklyGoalWeekId : ''
    weeklyStreakState.value = normalizeWeeklyGoalStreakState((data as any)?.weeklyStreakState)
    sentWeeklySettlementMailWeekIds.value = Array.isArray((data as any)?.sentWeeklySettlementMailWeekIds)
      ? (data as any).sentWeeklySettlementMailWeekIds.filter((item: unknown) => typeof item === 'string')
      : []
    weeklyMetricArchive.value = normalizeWeeklyMetricArchive(data?.weeklyMetricArchive)
    weeklyBudgetPlan.value = normalizeWeeklyBudgetPlan(data?.weeklyBudgetPlan)
    weeklyBudgetHistory.value = normalizeWeeklyBudgetArchive(data?.weeklyBudgetHistory)
    eventOperationsState.value = (() => {
      const raw = (data as any)?.eventOperationsState
      if (!raw || typeof raw !== 'object') return createDefaultEventOperationsState()
      return {
        version: Math.max(1, Number(raw.version) || 1),
        activeCampaignId: typeof raw.activeCampaignId === 'string' ? raw.activeCampaignId : null,
        activeThemeWeekCampaignId: typeof raw.activeThemeWeekCampaignId === 'string' ? raw.activeThemeWeekCampaignId : null,
        cadence: raw.cadence === 'biweekly' || raw.cadence === 'seasonal' ? raw.cadence : 'weekly',
        completedCampaignIds: Array.isArray(raw.completedCampaignIds) ? raw.completedCampaignIds.filter((id: unknown) => typeof id === 'string') : [],
        completedThemeWeekIds: Array.isArray(raw.completedThemeWeekIds) ? raw.completedThemeWeekIds.filter((id: unknown) => typeof id === 'string') : [],
        claimedMailCampaignIds: Array.isArray(raw.claimedMailCampaignIds) ? raw.claimedMailCampaignIds.filter((id: unknown) => typeof id === 'string') : [],
        claimedMailReceiptKeys: Array.isArray(raw.claimedMailReceiptKeys) ? raw.claimedMailReceiptKeys.filter((id: unknown) => typeof id === 'string') : [],
        lastCampaignDayTag: typeof raw.lastCampaignDayTag === 'string' ? raw.lastCampaignDayTag : '',
        lastSettlementDayTag: typeof raw.lastSettlementDayTag === 'string' ? raw.lastSettlementDayTag : ''
      }
    })()
    eventOperationLocks.value = []
    ensureInitialized()
    syncMainQuestStage()
  }

  const currentMainQuest = computed(() => mainQuestStages.value.find(stage => !stage.completed) ?? null)
  const currentDailyGoals = computed(() => dailyGoals.value)
  const completedMainQuestCount = computed(() => mainQuestStages.value.filter(stage => stage.completed).length)
  const nextThemeWeekPreview = computed(() => {
    const weekInfo = getCurrentWeekInfo()
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const
    const seasonIndex = seasons.indexOf(weekInfo.season)
    const nextWeekOfSeason = weekInfo.weekOfSeason === 4 ? 1 : ((weekInfo.weekOfSeason + 1) as 1 | 2 | 3 | 4)
    const nextSeason =
      weekInfo.weekOfSeason === 4
        ? seasons[(seasonIndex + 1) % seasons.length]!
        : weekInfo.season
    const themeDef = getThemeWeekBySeason(nextSeason, nextWeekOfSeason)
    if (!themeDef) return null
    return {
      ...themeDef,
      seasonWeekId: `${nextSeason}-${nextWeekOfSeason}`,
      startDay: (nextWeekOfSeason - 1) * 7 + 1,
      endDay: nextWeekOfSeason * 7
    }
  })
  const currentThemeWeek = computed(() => {
    if (!currentThemeWeekState.value) return null
    const weekInfo = getCurrentWeekInfo()
    const themeDef = getThemeWeekBySeason(
      weekInfo.season,
      currentThemeWeekState.value.weekOfSeason ?? weekInfo.weekOfSeason
    )
    if (!themeDef) return null
    return {
      ...themeDef,
      startDay: currentThemeWeekState.value.startDay,
      endDay: currentThemeWeekState.value.endDay
    }
  })
  const currentThemeWeekGoals = computed(() => {
    if (!currentThemeWeek.value) return []

    const focusMetrics = new Set(currentThemeWeek.value.focusMetrics)
    return [...weeklyGoals.value, ...dailyGoals.value, ...seasonGoals.value, ...longTermGoals.value]
      .filter(goal => focusMetrics.has(goal.metric) || goal.id.startsWith('long_sink_'))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        if (a.source !== b.source) {
          if (a.source === 'weekly') return -1
          if (b.source === 'weekly') return 1
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
  const getEventCampaignById = (campaignId: string) => eventCampaignDefs.find(campaign => campaign.id === campaignId) ?? null
  const getEventMailTemplateRefById = (templateId: string) => eventMailTemplateRefs.find(template => template.id === templateId) ?? null
  const resolveUnlockedEventCampaignTier = () => {
    const playerStore = usePlayerStore()
    const currentSegmentId = playerStore.getEconomyOverview().currentSegment?.id ?? ''
    if (currentSegmentId === 'endgame_tycoon') return 'P2' as const
    if (currentSegmentId === 'late_builder') return 'P1' as const
    return 'P0' as const
  }
  const getPreferredEventCampaignForThemeWeek = (themeWeekId: string | null) => {
    if (!themeWeekId) return null
    const unlockedTier = resolveUnlockedEventCampaignTier()
    const unlockedWeight = EVENT_CAMPAIGN_TIER_WEIGHT[unlockedTier]
    return eventCampaignDefs
      .filter(campaign => campaign.linkedThemeWeekIds.includes(themeWeekId))
      .filter(campaign => EVENT_CAMPAIGN_TIER_WEIGHT[campaign.unlockTier] <= unlockedWeight)
      .sort((a, b) => EVENT_CAMPAIGN_TIER_WEIGHT[b.unlockTier] - EVENT_CAMPAIGN_TIER_WEIGHT[a.unlockTier])[0] ?? null
  }
  const buildEventMailReceiptKey = (weekId: string, templateId: string) => `event_${weekId}_${templateId}`
  const currentEventCampaign = computed(() => {
    if (!eventOperationFeatureFlags.eventCampaignEnabled) return null
    if (eventOperationsState.value.activeCampaignId) {
      return getEventCampaignById(eventOperationsState.value.activeCampaignId)
    }
    const themeWeekId = currentThemeWeek.value?.id ?? null
    return getPreferredEventCampaignForThemeWeek(themeWeekId)
  })
  const eventOperationsOverview = computed(() => ({
    baselineAudit: eventOperationsBaselineAudit,
    activeCampaign: currentEventCampaign.value,
    activeThemeWeek: currentThemeWeek.value,
    state: eventOperationsState.value,
    mailTemplates: eventMailTemplateRefs.slice(0, eventOperationTuning.display.mailDigestPreviewLimit),
    tuning: eventOperationTuning
  }))
  const uiGuidanceSourceOverview = computed(() => {
    const playerStore = usePlayerStore()
    const economyOverview = playerStore.getEconomyOverview()
    const currentThemeWeekSummary = currentThemeWeek.value
      ? {
          id: currentThemeWeek.value.id,
          name: currentThemeWeek.value.name,
          summaryLabel: currentThemeWeek.value.ui?.summaryLabel ?? currentThemeWeek.value.name,
          description: currentThemeWeek.value.description,
          startDay: currentThemeWeek.value.startDay,
          endDay: currentThemeWeek.value.endDay,
          breedingFocusLabel: currentThemeWeek.value.breedingFocusLabel ?? ''
        }
      : null
    const currentEventCampaignSummary = currentEventCampaign.value
      ? {
          id: currentEventCampaign.value.id,
          label: currentEventCampaign.value.label,
          description: currentEventCampaign.value.description,
          cadence: currentEventCampaign.value.cadence,
          mailboxTemplateIds: [...currentEventCampaign.value.mailboxTemplateIds]
        }
      : null
    const mailTemplateTitles = currentEventCampaignSummary
      ? eventMailTemplateRefs
          .filter(template => currentEventCampaignSummary.mailboxTemplateIds.includes(template.id))
          .map(template => template.title)
      : []

    return {
      currentDayTag: getCurrentDayTag(),
      currentSegment: economyOverview.currentSegment
        ? {
            id: economyOverview.currentSegment.id,
            label: economyOverview.currentSegment.label,
            recommendedFocus: economyOverview.currentSegment.recommendedFocus
          }
        : null,
      inflationPressure: economyOverview.inflationPressure,
      sinkCoverage: economyOverview.sinkCoverage,
      latestRiskReportSummary: economyOverview.latestRiskReport?.summary ?? '',
      currentThemeWeek: currentThemeWeekSummary,
      currentEventCampaign: currentEventCampaignSummary,
      themeWeekGoalIds: currentThemeWeekGoals.value.map(goal => goal.id),
      themeWeekGoalTitles: currentThemeWeekGoals.value.map(goal => goal.title),
      recommendedEconomySinks: recommendedEconomySinks.value.map(sink => ({
        id: sink.id,
        name: sink.name,
        category: sink.category,
        priceBand: [...sink.priceBand] as [number, number],
        showcaseHook: sink.showcaseHook,
        linkedSystems: [...sink.linkedSystems]
      })),
      mailTemplateTitles
    }
  })

  const getUiGuidanceDebugSnapshot = () => ({
    currentDayTag: uiGuidanceSourceOverview.value.currentDayTag,
    currentThemeWeekId: uiGuidanceSourceOverview.value.currentThemeWeek?.id ?? null,
    currentEventCampaignId: uiGuidanceSourceOverview.value.currentEventCampaign?.id ?? null,
    currentSegmentId: uiGuidanceSourceOverview.value.currentSegment?.id ?? null,
    themeWeekGoalIds: [...uiGuidanceSourceOverview.value.themeWeekGoalIds],
    recommendedSinkIds: uiGuidanceSourceOverview.value.recommendedEconomySinks.map(sink => sink.id),
    mailTemplateTitles: [...uiGuidanceSourceOverview.value.mailTemplateTitles]
  })

  const activateEventCampaign = (campaignId: string, dayTag = getCurrentDayTag()) => {
    const lockId = `event_activate_${campaignId}`
    if (!beginEventOperation(lockId)) return false
    const snapshot = createEventOperationSnapshot()
    try {
    const campaign = getEventCampaignById(campaignId)
    if (!campaign) return false
    eventOperationsState.value = {
      ...eventOperationsState.value,
      activeCampaignId: campaignId,
      activeThemeWeekCampaignId: currentThemeWeek.value && campaign.linkedThemeWeekIds.includes(currentThemeWeek.value.id) ? currentThemeWeek.value.id : null,
      cadence: campaign.cadence,
      lastCampaignDayTag: dayTag
    }
    return true
    } catch {
      rollbackEventOperation(snapshot)
      return false
    } finally {
      finishEventOperation(lockId)
    }
  }

  const completeEventCampaign = (campaignId = eventOperationsState.value.activeCampaignId ?? '') => {
    const lockId = `event_complete_${campaignId}`
    if (!beginEventOperation(lockId)) return false
    const snapshot = createEventOperationSnapshot()
    try {
    if (!campaignId) return false
    eventOperationsState.value = {
      ...eventOperationsState.value,
      activeCampaignId: eventOperationsState.value.activeCampaignId === campaignId ? null : eventOperationsState.value.activeCampaignId,
      completedCampaignIds: eventOperationsState.value.completedCampaignIds.includes(campaignId)
        ? eventOperationsState.value.completedCampaignIds
        : [...eventOperationsState.value.completedCampaignIds, campaignId],
      lastSettlementDayTag: getCurrentDayTag()
    }
    return true
    } catch {
      rollbackEventOperation(snapshot)
      return false
    } finally {
      finishEventOperation(lockId)
    }
  }

  const markEventCampaignMailClaimed = (mailReceiptKey: string) => {
    const lockId = `event_mail_claim_${mailReceiptKey}`
    if (!beginEventOperation(lockId)) return false
    try {
    if (!mailReceiptKey || eventOperationsState.value.claimedMailReceiptKeys.includes(mailReceiptKey)) return false
    eventOperationsState.value = {
      ...eventOperationsState.value,
      claimedMailReceiptKeys: [...eventOperationsState.value.claimedMailReceiptKeys, mailReceiptKey]
    }
    return true
    } finally {
      finishEventOperation(lockId)
    }
  }

  const recordEventCampaignMailDispatched = (mailReceiptKey: string) => {
    const lockId = `event_mail_dispatch_${mailReceiptKey}`
    if (!beginEventOperation(lockId)) return false
    try {
    if (!mailReceiptKey || eventOperationsState.value.claimedMailCampaignIds.includes(mailReceiptKey)) return false
    eventOperationsState.value = {
      ...eventOperationsState.value,
      claimedMailCampaignIds: [...eventOperationsState.value.claimedMailCampaignIds, mailReceiptKey]
    }
    return true
    } finally {
      finishEventOperation(lockId)
    }
  }

  const getEventOperationsDebugSnapshot = () => ({
    activeCampaignId: eventOperationsState.value.activeCampaignId,
    activeThemeWeekCampaignId: eventOperationsState.value.activeThemeWeekCampaignId,
    cadence: eventOperationsState.value.cadence,
    completedCampaignIds: eventOperationsState.value.completedCampaignIds,
    dispatchedMailReceiptKeys: eventOperationsState.value.claimedMailCampaignIds,
    claimedMailReceiptKeys: eventOperationsState.value.claimedMailReceiptKeys,
    currentThemeWeekId: currentThemeWeek.value?.id ?? null
  })

  const processEventOperationsTick = (payload: {
    currentDayTag: string
    currentWeekId: string
    startedNewWeek: boolean
    seasonChanged: boolean
  }) => {
    const lockId = `event_tick_${payload.currentWeekId}_${payload.currentDayTag}`
    if (!beginEventOperation(lockId)) {
      return {
        logs: [] as string[],
        activeCampaignId: eventOperationsState.value.activeCampaignId,
        pendingMailTemplateIds: [] as string[]
      }
    }
    const snapshot = createEventOperationSnapshot()
    try {
    const logs: string[] = []
    const themeWeekId = currentThemeWeek.value?.id ?? null
    const matchedCampaign = getPreferredEventCampaignForThemeWeek(themeWeekId)

    if ((payload.startedNewWeek || payload.seasonChanged) && matchedCampaign) {
      if (eventOperationsState.value.activeCampaignId && eventOperationsState.value.activeCampaignId !== matchedCampaign.id) {
        completeEventCampaign(eventOperationsState.value.activeCampaignId)
      }
      activateEventCampaign(matchedCampaign.id, payload.currentDayTag)
      eventOperationsState.value.activeThemeWeekCampaignId = payload.currentWeekId
      if (themeWeekId && !eventOperationsState.value.completedThemeWeekIds.includes(themeWeekId)) {
        eventOperationsState.value.completedThemeWeekIds = [...eventOperationsState.value.completedThemeWeekIds, themeWeekId]
      }
      logs.push(`【活动编排】本周活动已切换为「${matchedCampaign.label}」，对应主题周：${themeWeekId ?? '未命名主题周'}。`)
    }

    if (eventOperationsState.value.activeCampaignId) {
      eventOperationsState.value.lastCampaignDayTag = payload.currentDayTag
    }

    const pendingMailTemplateIds = (matchedCampaign?.mailboxTemplateIds ?? []).filter(
      templateId => !eventOperationsState.value.claimedMailCampaignIds.includes(buildEventMailReceiptKey(payload.currentWeekId, templateId))
    ).slice(0, eventOperationTuning.operations.maxPendingMailTemplateRefs)

    return {
      logs,
      activeCampaignId: matchedCampaign?.id ?? eventOperationsState.value.activeCampaignId,
      pendingMailTemplateIds
    }
    } catch {
      rollbackEventOperation(snapshot)
      return {
        logs: ['【活动编排】活动周切换异常，已回滚到上一状态。'],
        activeCampaignId: eventOperationsState.value.activeCampaignId,
        pendingMailTemplateIds: [] as string[]
      }
    } finally {
      finishEventOperation(lockId)
    }
  }

  return {
    mainQuestStage,
    mainQuestStages,
    dailyGoals,
    seasonGoals,
    weeklyGoals,
    longTermGoals,
    goalReputation,
    lastDailyGoalRefresh,
    lastSeasonGoalRefresh,
    lastWeeklyGoalRefresh,
    currentMainQuest,
    currentDailyGoals,
    nextThemeWeekPreview,
    currentThemeWeek,
    currentThemeWeekGoals,
    lastWeeklyGoalSettlement,
    lastSettledWeeklyGoalWeekId,
    weeklyStreakState,
    eventOperationsBaselineAudit,
    eventOperationsState,
    eventCampaignDefs,
    eventMailTemplateRefs,
    currentEventCampaign,
    eventOperationsOverview,
    uiGuidanceSourceOverview,
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
    refreshWeeklyGoals,
    refreshThemeWeek,
    getWeeklyGoalRewardPool,
    getEventCampaignById,
    getEventMailTemplateRefById,
    activateEventCampaign,
    completeEventCampaign,
    recordEventCampaignMailDispatched,
    markEventCampaignMailClaimed,
    getEventOperationsDebugSnapshot,
    getUiGuidanceDebugSnapshot,
    processEventOperationsTick,
    activateWeeklyBudget,
    getWeeklyBudgetSelection,
    resetWeeklyBudgetsForNewWeek,
    onDayChanged,
    onSeasonChanged,
    onCalendarAdvanced,
    buildWeeklyGoalSettlementSummary,
    settleWeeklyGoals,
    markWeeklySettlementMailSent,
    grantManualReward,
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

