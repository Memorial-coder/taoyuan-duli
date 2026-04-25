import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  ActivityQuestWindowState,
  CompendiumEntry,
  MainQuestObjective,
  MainQuestState,
  QuestDeliveryMode,
  OrderGenerationTrace,
  OrderGenerationTraceAttempt,
  QuestInstance,
  QuestStageState,
  QuestType,
  RewardTicketType,
  Season,
  SpecialOrderComboRequirement,
  SpecialOrderProgressState,
  SpecialOrderScoreRank,
  SpecialOrderScoreRule,
  SpecialOrderSettlementSummary,
  SpecialOrderStageHistoryEntry,
  SpecialOrderStageDef,
  WeeklySpecialOrderState,
  VillagerQuestCategory
} from '@/types'
import {
  createDefaultActivityQuestWindowState,
  generateQuest,
  generateSpecialOrder as _generateSpecialOrder,
  generateVillagerQuest,
  getSpecialOrderRewardProfile,
  BREEDING_SPECIAL_ORDER_BASELINE,
  BREEDING_SPECIAL_ORDER_TUNING_CONFIG,
  WS10_LIMITED_TIME_QUEST_CAMPAIGN_DEFS,
  WS13_LIMITED_TIME_QUEST_CAMPAIGN_DEFS,
  type QuestMarketCategory
} from '@/data/quests'
import { getStoryQuestById, getNextStoryQuest, getFirstStoryQuest, STORY_QUESTS } from '@/data/storyQuests'
import { getNpcById, WS09_RELATIONSHIP_TUNING_CONFIG } from '@/data/npcs'
import { WS10_EVENT_OPERATION_TUNING_CONFIG } from '@/data/goals'
import { getTodayEvent } from '@/data/events'
import { getItemById, getRecipeById } from '@/data'
import { MARKET_CATEGORY_NAMES } from '@/data/market'
import { isRelationshipStageAtLeast } from '@/data/npcWorld'
import { useInventoryStore } from './useInventoryStore'
import { usePlayerStore } from './usePlayerStore'
import { useNpcStore } from './useNpcStore'
import { useAchievementStore } from './useAchievementStore'
import { useSkillStore } from './useSkillStore'
import { useShopStore } from './useShopStore'
import { useAnimalStore } from './useAnimalStore'
import { useBreedingStore } from './useBreedingStore'
import { useCookingStore } from './useCookingStore'
import { useFishPondStore } from './useFishPondStore'
import { useGoalStore } from './useGoalStore'
import { useGameStore } from './useGameStore'
import { useGuildStore } from './useGuildStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useMuseumStore } from './useMuseumStore'
import { useSettingsStore } from './useSettingsStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { useWalletStore } from './useWalletStore'
import { addLog } from '@/composables/useGameLog'
import { getAbsoluteDay } from '@/utils/weekCycle'

export const useQuestStore = defineStore('quest', () => {
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const npcStore = useNpcStore()
  const achievementStore = useAchievementStore()
  const villageProjectStore = useVillageProjectStore()

  /** 告示栏上的可接取任务 */
  const boardQuests = ref<QuestInstance[]>([])

  /** 已接取的进行中任务 */
  const activeQuests = ref<QuestInstance[]>([])

  const meetsRelationshipRequirement = (quest: QuestInstance): boolean => {
    if (!quest.relationshipStageRequired || !quest.npcId) return true
    return isRelationshipStageAtLeast(npcStore.getRelationshipStage(quest.npcId), quest.relationshipStageRequired)
  }

  /** 累计完成任务数 */
  const completedQuestCount = ref<number>(0)

  /** 当前可接取的特殊订单 */
  const specialOrder = ref<QuestInstance | null>(null)

  /** 运行时提交锁，避免重复点击导致重复结算 */
  const questSubmissionLocks = ref<string[]>([])

  /** 已完成特殊订单结算回执，防止重复领奖 */
  const specialOrderSettlementReceipts = ref<string[]>([])

  /** 最近特殊订单轮换标签历史，避免连续刷到同一类订单 */
  const recentSpecialOrderTagHistory = ref<string[]>([])

  /** 周循环高阶订单刷新状态，避免周切换与旧梯度双重触发 */
  const weeklySpecialOrderState = ref<WeeklySpecialOrderState>({
    lastRefreshWeekId: '',
    refreshMode: 'legacy'
  })
  const activityQuestWindowState = ref<ActivityQuestWindowState>(createDefaultActivityQuestWindowState())
  const limitedTimeQuestCampaignDefs = [...WS10_LIMITED_TIME_QUEST_CAMPAIGN_DEFS, ...WS13_LIMITED_TIME_QUEST_CAMPAIGN_DEFS]
  const eventOperationTuning = WS10_EVENT_OPERATION_TUNING_CONFIG
  const activityQuestWindowLocks = ref<string[]>([])

  /** 最近一次高阶订单生成追踪（调试态 / 解释层使用） */
  const lastSpecialOrderGenerationTrace = ref<OrderGenerationTrace | null>(null)

  /** 最大同时接取任务数 */
  const MAX_ACTIVE_QUESTS = computed(() => 3 + villageProjectStore.getQuestCapacityBonus())

  const beginActivityQuestWindowAction = (lockId: string): boolean => {
    if (activityQuestWindowLocks.value.includes(lockId)) return false
    activityQuestWindowLocks.value = [...activityQuestWindowLocks.value, lockId]
    return true
  }

  const finishActivityQuestWindowAction = (lockId: string) => {
    activityQuestWindowLocks.value = activityQuestWindowLocks.value.filter(entry => entry !== lockId)
  }

  const createActivityQuestWindowSnapshot = () => ({
    activityQuestWindowState: { ...activityQuestWindowState.value }
  })

  const rollbackActivityQuestWindow = (snapshot: ReturnType<typeof createActivityQuestWindowSnapshot>) => {
    activityQuestWindowState.value = { ...snapshot.activityQuestWindowState }
  }

  const buildActivityQuestWindowCompletionKey = (campaignId: string, scopeKey: string) => `${campaignId}@${scopeKey || 'legacy'}`

  /** 每日生成新任务到告示栏 */
  const dedupeList = <T,>(items: T[]): T[] => Array.from(new Set(items))

  const mapMarketCategoryToQuestTypes = (category: QuestMarketCategory): QuestType[] => {
    switch (category) {
      case 'crop':
      case 'fruit':
        return ['delivery']
      case 'fish':
        return ['fishing']
      case 'ore':
      case 'gem':
        return ['mining']
      case 'processed':
      case 'animal_product':
        return ['gathering']
      default:
        return []
    }
  }

  const resolveVillagerQuestCategoryFromMarket = (categories: QuestMarketCategory[]): VillagerQuestCategory | null => {
    if (categories.includes('fish')) return 'fishing'
    if (categories.includes('processed') || categories.includes('animal_product')) return 'cooking'
    if (categories.some(category => category === 'crop' || category === 'fruit' || category === 'ore' || category === 'gem')) {
      return 'gathering'
    }
    return null
  }

  const stringifyMetaList = (items: string[]): string => items.join(' | ')

  const buildMarketQuestBiasProfile = () => {
    const shopStore = useShopStore()
    const goalStore = useGoalStore()
    const guildStore = useGuildStore()
    const hanhaiStore = useHanhaiStore()
    const hiddenNpcStore = useHiddenNpcStore()
    const museumStore = useMuseumStore()
    const guildQuestBias = guildStore.questBoardBiasProfile
    const hanhaiQuestBias = hanhaiStore.questBoardBiasProfile
    const museumQuestBias = museumStore.questBoardBiasProfile
    const familyWishOverview = npcStore.getFamilyWishOverview()
    const relationshipSnapshot = npcStore.getRelationshipDebugSnapshot()
    const activeFamilyWish = familyWishOverview.defs.find(def => def.id === familyWishOverview.state.activeWishId) ?? null
    const householdRoleToCategories: Record<string, QuestMarketCategory[]> = {
      field_support: ['crop', 'animal_product'],
      home_care: ['processed', 'animal_product'],
      craft_assist: ['processed', 'ore', 'crop'],
      social_coordination: ['fish', 'processed']
    }
    const familyWishToCategories: Record<string, QuestMarketCategory[]> = {
      wish_shared_breakfast: ['crop', 'processed', 'animal_product'],
      wish_lakeside_outing: ['fish'],
      wish_legacy_archive: ['processed', 'crop', 'ore']
    }
    const spiritBlessingToCategories: Record<string, QuestMarketCategory[]> = {
      spirit_blessing_dew: ['crop', 'processed'],
      spirit_blessing_tide: ['fish'],
      spirit_blessing_legacy: ['processed', 'ore']
    }
    const bondedSpiritId = hiddenNpcStore.getBondedNpc?.id ?? null
    const activeSpiritBlessing = bondedSpiritId ? hiddenNpcStore.getSpiritBlessingSummary(bondedSpiritId)?.activeBlessing ?? null : null
    const relationshipPreferredCategories = WS09_RELATIONSHIP_TUNING_CONFIG.featureFlags.companionQuestBiasEnabled
      ? dedupeList<QuestMarketCategory>([
          ...(activeFamilyWish ? familyWishToCategories[activeFamilyWish.id] ?? [] : []),
          ...relationshipSnapshot.householdAssignments.flatMap(entry => householdRoleToCategories[entry.roleId] ?? []),
          ...(activeSpiritBlessing ? spiritBlessingToCategories[activeSpiritBlessing.id] ?? [] : [])
        ]).slice(0, WS09_RELATIONSHIP_TUNING_CONFIG.operations.maxQuestBiasStrength)
      : []

    const marketPreferredCategories = dedupeList<QuestMarketCategory>([
      ...shopStore.activeMarketHotspots.map(entry => entry.category as QuestMarketCategory),
      ...shopStore.activeMarketRegionalProcurements.flatMap(entry => entry.targetCategories as QuestMarketCategory[]),
      ...((shopStore.activeMarketThemeEncouragement?.encouragedCategories ?? []) as QuestMarketCategory[]),
      ...shopStore.currentMarketPriceInfos
        .filter(entry => entry.trend === 'boom' || entry.trend === 'rising')
        .map(entry => entry.category as QuestMarketCategory),
      ...shopStore.activeMarketSubstituteRewards.map(entry => entry.toCategory as QuestMarketCategory)
    ])

    const discouragedMarketCategories = dedupeList<QuestMarketCategory>([
      ...(Object.keys(shopStore.marketDynamics.overflowPenalties ?? {}) as QuestMarketCategory[]),
      ...shopStore.currentMarketPriceInfos
        .filter(entry => entry.trend === 'falling' || entry.trend === 'crash')
        .map(entry => entry.category as QuestMarketCategory),
      ...shopStore.activeMarketSubstituteRewards.map(entry => entry.fromCategory as QuestMarketCategory)
    ]).filter(
      category =>
        !marketPreferredCategories.includes(category) &&
        !museumQuestBias.preferredMarketCategories.includes(category) &&
        !guildQuestBias.preferredMarketCategories.includes(category as typeof guildQuestBias.preferredMarketCategories[number]) &&
        !hanhaiQuestBias.preferredMarketCategories.includes(category as typeof hanhaiQuestBias.preferredMarketCategories[number])
    )

    const preferredMarketCategories = dedupeList<QuestMarketCategory>([
      ...marketPreferredCategories,
      ...relationshipPreferredCategories,
      ...(museumQuestBias.preferredMarketCategories as QuestMarketCategory[]),
      ...(guildQuestBias.preferredMarketCategories as QuestMarketCategory[]),
      ...(hanhaiQuestBias.preferredMarketCategories as QuestMarketCategory[])
    ])

    const preferredQuestTypes = dedupeList([
      ...preferredMarketCategories.flatMap(mapMarketCategoryToQuestTypes),
      ...museumQuestBias.preferredQuestTypes,
      ...guildQuestBias.preferredQuestTypes,
      ...hanhaiQuestBias.preferredQuestTypes
    ])
    const preferredVillagerCategory: VillagerQuestCategory | null =
      resolveVillagerQuestCategoryFromMarket(preferredMarketCategories) ??
      (museumQuestBias.preferredVillagerCategory as VillagerQuestCategory | null) ??
      (guildQuestBias.preferredVillagerCategory as VillagerQuestCategory | null) ??
      (hanhaiQuestBias.preferredVillagerCategory as VillagerQuestCategory | null)

    const breedingScore =
      preferredMarketCategories.filter(category => category === 'crop' || category === 'fruit' || category === 'processed').length +
      (goalStore.currentThemeWeek?.preferredQuestThemeTag === 'breeding' ? 2 : 0) +
      (activeFamilyWish?.linkedSystem === 'breeding' ? 2 : 0)
    const fishpondScore =
      preferredMarketCategories.filter(category => category === 'fish').length +
      (goalStore.currentThemeWeek?.id === 'summer_fishing' ? 2 : 0) +
      (activeFamilyWish?.linkedSystem === 'fishing' ? 2 : 0)

    const preferredSpecialOrderThemeTag: 'breeding' | 'fishpond' | undefined =
      breedingScore === 0 && fishpondScore === 0
        ? goalStore.currentThemeWeek?.preferredQuestThemeTag
        : fishpondScore > breedingScore
          ? 'fishpond'
          : 'breeding'

    const highlightedLabels = preferredMarketCategories.slice(0, 3).map(category => MARKET_CATEGORY_NAMES[category])
    const relationshipFocusLabels = dedupeList([
      activeFamilyWish?.title ?? '',
      ...relationshipSnapshot.householdAssignments.map(entry => {
        switch (entry.roleId) {
          case 'field_support':
            return '田务分工'
          case 'home_care':
            return '宅院照料'
          case 'craft_assist':
            return '家业协作'
          case 'social_coordination':
            return '人情往来'
          default:
            return entry.roleId
        }
      }),
      activeSpiritBlessing?.label ?? ''
    ].filter(Boolean))
    const boardHint = [
      highlightedLabels.length > 0 ? `【市场联动】今日告示板更偏向 ${highlightedLabels.join('、')} 相关委托。` : '',
      relationshipFocusLabels.length > 0 ? `【陪伴联动】本周可围绕 ${relationshipFocusLabels.slice(0, 3).join('、')} 筹备家务、外出与家业委托。` : '',
      guildQuestBias.boardHint,
      hanhaiQuestBias.boardHint,
      museumQuestBias.boardHint
    ]
      .filter(Boolean)
      .join(' ')
    const specialOrderHint = [
      highlightedLabels.length > 0 ? `市场联动：本周订单更关注${highlightedLabels.join('、')}供货。` : '',
      activeFamilyWish ? `陪伴联动：家庭心愿「${activeFamilyWish.title}」会放大 ${relationshipPreferredCategories.map(category => MARKET_CATEGORY_NAMES[category]).join('、') || '陪伴类'} 筹备需求。` : '',
      activeSpiritBlessing ? `仙缘联动：当前祝福「${activeSpiritBlessing.label}」会提高相关外出 / 供货委托的出现感。` : '',
      guildQuestBias.specialOrderHint,
      hanhaiQuestBias.specialOrderHint,
      museumQuestBias.specialOrderHint
    ]
      .filter(Boolean)
      .join(' ')

    return {
      preferredQuestTypes,
      preferredMarketCategories,
      discouragedMarketCategories,
      preferredVillagerCategory,
      preferredSpecialOrderThemeTag,
      relationshipFocusLabels,
      boardHint,
      specialOrderHint
    }
  }

  const marketQuestBiasProfile = computed(() => buildMarketQuestBiasProfile())

  const generateDailyQuests = (season: Season, day: number) => {
    const marketQuestBias = marketQuestBiasProfile.value
    const allowedActivitySourceIds = currentLimitedTimeQuestCampaign.value ? [...activityQuestWindowState.value.activeQuestTemplateIds] : undefined
    boardQuests.value = [] // 清空旧的告示栏
    const shopStore = useShopStore()
    const serviceContractEffect = shopStore.getServiceContractEffectSummary('quest')
    const count = 2 + Math.floor(Math.random() * 2) + villageProjectStore.getDailyQuestBoardBonus() + serviceContractEffect.dailyQuestBoardBonus // 2-3个，扩建后+1
    for (let i = 0; i < count; i++) {
      const quest = generateQuest(season, day, false, {
        preferredQuestTypes: marketQuestBias.preferredQuestTypes,
        preferredMarketCategories: marketQuestBias.preferredMarketCategories,
        discouragedMarketCategories: marketQuestBias.discouragedMarketCategories,
        allowedActivitySourceIds
      })
      if (quest) {
        boardQuests.value.push(quest)
      }
    }
    // 25% 概率生成一个紧急委托（1天时限，奖励翻倍）
    if (Math.random() < 0.25) {
      const urgent = generateQuest(season, day, true, {
        preferredQuestTypes: marketQuestBias.preferredQuestTypes,
        preferredMarketCategories: marketQuestBias.preferredMarketCategories,
        discouragedMarketCategories: marketQuestBias.discouragedMarketCategories,
        allowedActivitySourceIds
      })
      if (urgent) boardQuests.value.push(urgent)
    }

    const relationshipStages = Object.fromEntries(npcStore.npcStates.map(state => [state.npcId, npcStore.getRelationshipStage(state.npcId)]))
    const preferredCategory: VillagerQuestCategory | null = (() => {
      if (getTodayEvent(season, day)) return 'festival_prep' as VillagerQuestCategory
      if (marketQuestBias.preferredVillagerCategory) return marketQuestBias.preferredVillagerCategory

      const rotation: VillagerQuestCategory[] = ['gathering', 'cooking', 'fishing', 'errand']
      return rotation[(day - 1) % rotation.length] ?? null
    })()

    const villagerQuest = generateVillagerQuest(season, relationshipStages, preferredCategory)
    if (villagerQuest) {
      const duplicateNpc = boardQuests.value.some(q => q.npcId === villagerQuest.npcId && q.sourceCategory)
      if (!duplicateNpc) boardQuests.value.push(villagerQuest)
    }

    if (marketQuestBias.boardHint) {
      addLog(marketQuestBias.boardHint, {
        category: 'market',
        tags: ['late_game_cycle'],
        meta: {
          preferredQuestTypes: stringifyMetaList(marketQuestBias.preferredQuestTypes),
          preferredMarketCategories: stringifyMetaList(marketQuestBias.preferredMarketCategories),
          discouragedMarketCategories: stringifyMetaList(marketQuestBias.discouragedMarketCategories),
          generatedQuestCount: boardQuests.value.length
        }
      })
    }
  }

  /** 按梯度生成特殊订单 (tier: 1-4 对应 第7/14/21/28天) */
  const specialOrderBaseline = BREEDING_SPECIAL_ORDER_BASELINE
  const specialOrderTuning = BREEDING_SPECIAL_ORDER_TUNING_CONFIG
  const specialOrderFeatureFlags = specialOrderTuning.featureFlags
  const specialOrderGenerationConfig = specialOrderTuning.generation
  const specialOrderSettlementConfig = specialOrderTuning.settlement
  const specialOrderOperationsConfig = specialOrderTuning.operations

  const serializeSpecialOrderHistoryEntry = (absoluteWeek: number, tag: string): string => `${Math.max(0, absoluteWeek)}|${tag}`

  const parseSpecialOrderHistoryEntry = (entry: string): { absoluteWeek: number | null; tag: string } | null => {
    if (typeof entry !== 'string' || entry.length === 0) return null
    const separatorIndex = entry.indexOf('|')
    if (separatorIndex === -1) {
      return {
        absoluteWeek: null,
        tag: entry
      }
    }

    const absoluteWeek = Number(entry.slice(0, separatorIndex))
    const tag = entry.slice(separatorIndex + 1)
    if (!Number.isFinite(absoluteWeek) || tag.length === 0) return null
    return {
      absoluteWeek: Math.max(0, Math.floor(absoluteWeek)),
      tag
    }
  }

  const isWeeklySpecialOrderRefreshActive = (absoluteWeek: number): boolean => {
    return Math.max(0, absoluteWeek) >= Math.max(0, Number(specialOrderOperationsConfig.weeklyRefreshStartAbsoluteWeek) || 0)
  }

  const mergeTicketRewards = (
    left: Partial<Record<RewardTicketType, number>> | undefined,
    right: Partial<Record<RewardTicketType, number>> | undefined
  ): Partial<Record<RewardTicketType, number>> | undefined => {
    const merged = Object.fromEntries(
      [...Object.entries(left ?? {}), ...Object.entries(right ?? {})].reduce<Map<string, number>>((map, [ticketType, amount]) => {
        map.set(ticketType, (map.get(ticketType) ?? 0) + Math.max(0, Math.floor(Number(amount) || 0)))
        return map
      }, new Map())
    ) as Partial<Record<RewardTicketType, number>>

    return Object.keys(merged).length > 0 ? merged : undefined
  }

  const scaleTicketRewards = (
    rewards: Partial<Record<RewardTicketType, number>> | undefined,
    multiplier: number
  ): Partial<Record<RewardTicketType, number>> | undefined => {
    if (!rewards) return undefined
    const clampedMultiplier = Math.max(0, Number(multiplier) || 0)
    const scaled = Object.fromEntries(
      Object.entries(rewards)
        .map(([ticketType, amount]) => {
          const numericAmount = Math.max(0, Math.floor(Number(amount) || 0))
          if (numericAmount <= 0 || clampedMultiplier <= 0) return [ticketType, 0]
          return [ticketType, Math.max(1, Math.round(numericAmount * clampedMultiplier))]
        })
        .filter(([, amount]) => Number(amount) > 0)
    ) as Partial<Record<RewardTicketType, number>>

    return Object.keys(scaled).length > 0 ? scaled : undefined
  }

  const finalizeSpecialOrderRewards = (order: QuestInstance | null): QuestInstance | null => {
    if (!order) return null
    const profile = getSpecialOrderRewardProfile(order.rewardProfileId)
    if (!profile) return order

    const balanceConfig = useSettingsStore().getLateGameBalanceConfig()
    const effectiveCashRatio = Math.max(0, Math.min(1, Math.min(profile.cashRatio, balanceConfig.highValueOrderCashRatio || 1)))
    const effectiveTicketRate = Math.max(0, balanceConfig.ticketRewardRate || 1)
    const mergedTicketReward = mergeTicketRewards(order.ticketReward, profile.ticketReward)
    const scaledTicketReward = mergedTicketReward
      ? Object.fromEntries(
          Object.entries(mergedTicketReward)
            .map(([ticketType, amount]) => [ticketType, Math.max(1, Math.round((Number(amount) || 0) * effectiveTicketRate))])
        ) as Partial<Record<RewardTicketType, number>>
      : undefined

    const nextBonusSummary = [
      ...(order.bonusSummary ?? []),
      profile.summary
    ].filter((summary, index, array) => summary && array.indexOf(summary) === index)

    return {
      ...order,
      moneyReward: Math.max(0, Math.round(order.moneyReward * effectiveCashRatio)),
      ticketReward: scaledTicketReward,
      bonusSummary: nextBonusSummary.length > 0 ? nextBonusSummary : undefined
    }
  }

  const beginQuestSubmission = (questId: string): boolean => {
    if (questSubmissionLocks.value.includes(questId)) return false
    questSubmissionLocks.value = [...questSubmissionLocks.value, questId]
    return true
  }

  const finishQuestSubmission = (questId: string) => {
    questSubmissionLocks.value = questSubmissionLocks.value.filter(id => id !== questId)
  }

  const resolveSpecialOrderCooldownWeeks = (order: QuestInstance | null): number => {
    if (!order) return Math.max(1, Number(specialOrderOperationsConfig.antiRepeatCooldownWeeks) || 1)
    const goalStore = useGoalStore()
    const baseCooldownWeeks = Math.max(
      1,
      Number(order.antiRepeatCooldownWeeks ?? specialOrderOperationsConfig.antiRepeatCooldownWeeks) || 1
    )
    if (
      specialOrderFeatureFlags.themeWeekBiasEnabled &&
      goalStore.currentThemeWeek?.preferredQuestThemeTag &&
      order.themeTag &&
      goalStore.currentThemeWeek.preferredQuestThemeTag === order.themeTag
    ) {
      return Math.max(1, baseCooldownWeeks - Math.max(0, Number(specialOrderOperationsConfig.themeWeekCooldownReduction) || 0))
    }
    return baseCooldownWeeks
  }

  const getSpecialOrderBlockedTags = (order: QuestInstance | null, absoluteWeek?: number): string[] => {
    if (!specialOrderFeatureFlags.antiRepeatRotationEnabled) return []
    if (!order?.antiRepeatTags?.length) return []

    if (!Number.isFinite(Number(absoluteWeek))) {
      return order.antiRepeatTags.filter(tag =>
        recentSpecialOrderTagHistory.value.some(entry => parseSpecialOrderHistoryEntry(entry)?.tag === tag)
      )
    }

    const currentAbsoluteWeek = Math.max(0, Math.floor(Number(absoluteWeek) || 0))
    const cooldownWeeks = resolveSpecialOrderCooldownWeeks(order)
    return order.antiRepeatTags.filter(tag =>
      recentSpecialOrderTagHistory.value.some(entry => {
        const parsedEntry = parseSpecialOrderHistoryEntry(entry)
        if (!parsedEntry || parsedEntry.tag !== tag || parsedEntry.absoluteWeek == null) return false
        return currentAbsoluteWeek - parsedEntry.absoluteWeek < cooldownWeeks
      })
    )
  }

  const rememberSpecialOrderRotation = (quest: QuestInstance, payload: { weekId: string; absoluteWeek: number }) => {
    if (!specialOrderFeatureFlags.antiRepeatRotationEnabled) return

    const historyEntries = [
      ...(quest.antiRepeatTags ?? []),
      quest.themeTag ? `theme:${quest.themeTag}` : '',
      quest.activitySourceId ? `activity:${quest.activitySourceId}` : ''
    ].filter(Boolean)

    if (historyEntries.length === 0) return
    const serializedEntries = historyEntries.map(tag => serializeSpecialOrderHistoryEntry(payload.absoluteWeek, tag))
    recentSpecialOrderTagHistory.value = [
      ...recentSpecialOrderTagHistory.value.filter(entry => !serializedEntries.includes(entry)),
      ...serializedEntries
    ].slice(-Math.max(1, specialOrderOperationsConfig.antiRepeatHistoryLimit))
  }

  const rememberSpecialOrderReceipt = (questId: string) => {
    if (!specialOrderFeatureFlags.duplicateSettlementGuardEnabled) return
    if (specialOrderSettlementReceipts.value.includes(questId)) return
    specialOrderSettlementReceipts.value = [...specialOrderSettlementReceipts.value, questId].slice(
      -Math.max(1, specialOrderOperationsConfig.settlementReceiptLimit)
    )
  }

  const generateSpecialOrder = (season: Season, tier: number, refreshContext?: { weekId?: string; absoluteWeek?: number }) => {
    const breedingStore = useBreedingStore()
    const fishPondStore = useFishPondStore()
    const goalStore = useGoalStore()
    const marketQuestBias = marketQuestBiasProfile.value
    const generationOptions: {
      discoveredHybridIds: string[]
      breedingCompendiumEntries: CompendiumEntry[]
      discoveredPondBreedIds: string[]
      preferredThemeTag: 'breeding' | 'fishpond' | undefined
      allowedActivitySourceIds?: string[]
      preferredHybridIds: string[]
      preferredMarketCategories: QuestMarketCategory[]
      discouragedMarketCategories: QuestMarketCategory[]
    } = {
      discoveredHybridIds: breedingStore.compendium.map(entry => entry.hybridId),
      breedingCompendiumEntries: breedingStore.compendium,
      discoveredPondBreedIds: [...fishPondStore.discoveredBreeds],
      preferredThemeTag: specialOrderFeatureFlags.themeWeekBiasEnabled
        ? (marketQuestBias.preferredSpecialOrderThemeTag ?? goalStore.currentThemeWeek?.preferredQuestThemeTag)
        : undefined,
      allowedActivitySourceIds: currentLimitedTimeQuestCampaign.value ? [...activityQuestWindowState.value.activeQuestTemplateIds] : undefined,
      preferredHybridIds: goalStore.currentThemeWeek?.breedingFocusHybridIds ?? [],
      preferredMarketCategories: marketQuestBias.preferredMarketCategories,
      discouragedMarketCategories: marketQuestBias.discouragedMarketCategories
    }

    let selectedOrder: QuestInstance | null = null
    let fallbackOrder: QuestInstance | null = null
    const attemptTraces: OrderGenerationTraceAttempt[] = []
    const generationAttempts = Math.max(
      1,
      specialOrderFeatureFlags.antiRepeatRotationEnabled ? specialOrderGenerationConfig.antiRepeatGenerationAttempts : 1
    )
    for (let attempt = 0; attempt < generationAttempts; attempt++) {
      const generatedOrder = finalizeSpecialOrderRewards(
        _generateSpecialOrder(season, tier, generationOptions, {
          onTrace: trace => {
            attemptTraces.push({
              ...trace,
              attempt: attempt + 1,
              candidates: trace.candidates.map(candidate => ({ ...candidate }))
            })
          }
        })
      )
      if (!generatedOrder) continue
      if (!fallbackOrder) fallbackOrder = generatedOrder
      const blockedTags = getSpecialOrderBlockedTags(generatedOrder, refreshContext?.absoluteWeek)
      if (blockedTags.length === 0) {
        selectedOrder = generatedOrder
        break
      }

      const latestAttemptTrace = attemptTraces[attemptTraces.length - 1]
      if (latestAttemptTrace) {
        latestAttemptTrace.blockedByAntiRepeat = true
        latestAttemptTrace.blockReason = `命中反重复标签：${blockedTags.join('、')}`
        const selectedCandidate = latestAttemptTrace.candidates.find(
          candidate => candidate.templateName === latestAttemptTrace.selectedTemplateName && candidate.targetItemId === latestAttemptTrace.selectedTargetItemId
        )
        if (selectedCandidate) {
          selectedCandidate.blockedByAntiRepeat = true
          selectedCandidate.blockedTags = [...blockedTags]
          selectedCandidate.cooldownWeeks = resolveSpecialOrderCooldownWeeks(generatedOrder)
        }
      }
    }

    const order = selectedOrder ?? fallbackOrder
    if (order && marketQuestBias.specialOrderHint) {
      order.bonusSummary = dedupeList([...(order.bonusSummary ?? []), marketQuestBias.specialOrderHint])
      order.demandHint = order.demandHint ?? marketQuestBias.specialOrderHint
    }
    specialOrder.value = order

    if (order && refreshContext?.weekId && Number.isFinite(Number(refreshContext.absoluteWeek))) {
      rememberSpecialOrderRotation(order, {
        weekId: refreshContext.weekId,
        absoluteWeek: Math.max(0, Math.floor(Number(refreshContext.absoluteWeek) || 0))
      })
    }

    const selectedTraceAttempt =
      attemptTraces.find(trace => trace.selectedTargetItemId === order?.targetItemId && !trace.blockedByAntiRepeat) ??
      attemptTraces[attemptTraces.length - 1]
    lastSpecialOrderGenerationTrace.value = {
      season,
      tier,
      mode: refreshContext?.weekId ? 'weekly' : 'legacy',
      weekId: refreshContext?.weekId,
      absoluteWeek: refreshContext?.absoluteWeek,
      attempts: attemptTraces.length,
      selectedOrderId: order?.id,
      selectedTemplateName: selectedTraceAttempt?.selectedTemplateName,
      selectedTargetItemId: order?.targetItemId ?? selectedTraceAttempt?.selectedTargetItemId,
      selectedReason:
        selectedOrder != null
          ? '命中候选并通过当前轮换校验。'
          : fallbackOrder != null
            ? '候选多次命中反重复限制，已回退到首个可用订单。'
            : '当前条件下无可生成的高阶订单。',
      preferredThemeTag: generationOptions.preferredThemeTag,
      preferredHybridIds: [...generationOptions.preferredHybridIds],
      preferredMarketCategories: [...generationOptions.preferredMarketCategories],
      discouragedMarketCategories: [...generationOptions.discouragedMarketCategories],
      attemptsDetail: attemptTraces
    }

    if (order && marketQuestBias.specialOrderHint) {
      addLog(`【市场联动】特殊订单已按当前市场重排：${marketQuestBias.specialOrderHint.replace('市场联动：', '')}`, {
        category: 'market',
        tags: ['late_game_cycle'],
        meta: {
          orderId: order.id,
          themeTag: order.themeTag ?? '',
          preferredMarketCategories: stringifyMetaList(marketQuestBias.preferredMarketCategories),
          discouragedMarketCategories: stringifyMetaList(marketQuestBias.discouragedMarketCategories)
        }
      })
    }
  }

  const processSpecialOrderWeeklyRefresh = (payload: {
    season: Season
    weekOfSeason: number
    weekId: string
    absoluteWeek: number
  }): {
    mode: 'legacy' | 'weekly'
    generated: boolean
    preservedLegacyOrder: boolean
    refreshSkipped: boolean
  } => {
    if (!isWeeklySpecialOrderRefreshActive(payload.absoluteWeek)) {
      weeklySpecialOrderState.value = {
        ...weeklySpecialOrderState.value,
        refreshMode: 'legacy'
      }
      return {
        mode: 'legacy',
        generated: false,
        preservedLegacyOrder: false,
        refreshSkipped: true
      }
    }

    if (weeklySpecialOrderState.value.lastRefreshWeekId === payload.weekId) {
      return {
        mode: 'weekly',
        generated: false,
        preservedLegacyOrder: false,
        refreshSkipped: true
      }
    }

    const carriedOrder = specialOrder.value
    const transitioningFromLegacy = weeklySpecialOrderState.value.refreshMode !== 'weekly'
    if (transitioningFromLegacy && carriedOrder) {
      rememberSpecialOrderRotation(carriedOrder, {
        weekId: payload.weekId,
        absoluteWeek: payload.absoluteWeek
      })
      weeklySpecialOrderState.value = {
        lastRefreshWeekId: payload.weekId,
        lastRefreshAbsoluteWeek: payload.absoluteWeek,
        lastGeneratedOrderId: carriedOrder.id,
        refreshMode: 'weekly'
      }
      return {
        mode: 'weekly',
        generated: false,
        preservedLegacyOrder: true,
        refreshSkipped: false
      }
    }

    generateSpecialOrder(payload.season, payload.weekOfSeason, {
      weekId: payload.weekId,
      absoluteWeek: payload.absoluteWeek
    })
    weeklySpecialOrderState.value = {
      lastRefreshWeekId: payload.weekId,
      lastRefreshAbsoluteWeek: payload.absoluteWeek,
      lastGeneratedOrderId: specialOrder.value?.id,
      refreshMode: 'weekly'
    }

    return {
      mode: 'weekly',
      generated: !!specialOrder.value,
      preservedLegacyOrder: false,
      refreshSkipped: false
    }
  }

  /** 接取任务 */
  const acceptQuest = (questId: string): { success: boolean; message: string } => {
    if (activeQuests.value.length >= MAX_ACTIVE_QUESTS.value) {
      return { success: false, message: `最多同时接取${MAX_ACTIVE_QUESTS.value}个任务。` }
    }
    const idx = boardQuests.value.findIndex(q => q.id === questId)
    if (idx === -1) return { success: false, message: '任务不存在。' }

    const quest = boardQuests.value[idx]!
    if (!meetsRelationshipRequirement(quest)) {
      return { success: false, message: `${quest.npcName} 当前关系未达到该委托要求。` }
    }
    quest.accepted = true

    // 非送货类委托：检查背包中已有的物品数量
    if (quest.type !== 'delivery') {
      quest.collectedQuantity = Math.min(inventoryStore.getTotalItemCount(quest.targetItemId), quest.targetQuantity)
    }

    activeQuests.value.push(quest)
    boardQuests.value.splice(idx, 1)
    return { success: true, message: `接取了任务：${quest.description}` }
  }

  /** 接取特殊订单 */
  const acceptSpecialOrder = (): { success: boolean; message: string } => {
    if (!specialOrder.value) return { success: false, message: '没有可接取的特殊订单。' }
    if (activeQuests.value.length >= MAX_ACTIVE_QUESTS.value) {
      return { success: false, message: `最多同时接取${MAX_ACTIVE_QUESTS.value}个任务。` }
    }

    const fishPondStore = useFishPondStore()
    const order = specialOrder.value
    order.accepted = true
    if (order.deliveryMode === 'pond') {
      order.collectedQuantity = Math.min(
        fishPondStore.countEligibleFishForOrder({
          fishId: order.targetItemId,
          generationMin: order.requiredPondGenerationMin,
          requireMature: order.requiredFishMature,
          requireHealthy: order.requiredFishHealthy
        }),
        order.targetQuantity
      )
    } else {
      order.collectedQuantity = Math.min(inventoryStore.getTotalItemCount(order.targetItemId), order.targetQuantity)
    }

    activeQuests.value.push(order)
    specialOrder.value = null
    return { success: true, message: `接取了特殊订单：${order.description}` }
  }

  const getSpecialOrderBaseline = () => specialOrderBaseline

  const resolveSpecialOrderRank = (
    rule: SpecialOrderScoreRule,
    score: number
  ): {
    rank: SpecialOrderScoreRank
    threshold: SpecialOrderScoreRule['thresholds'][number] | null
  } => {
    const sortedThresholds = [...rule.thresholds].sort((left, right) => left.minScore - right.minScore)
    let matchedThreshold: SpecialOrderScoreRule['thresholds'][number] | null = null
    for (const threshold of sortedThresholds) {
      if (score >= threshold.minScore) {
        matchedThreshold = threshold
      }
    }
    return {
      rank: matchedThreshold?.rank ?? 'C',
      threshold: matchedThreshold
    }
  }

  const evaluateSpecialOrderSettlement = (
    quest: QuestInstance,
    submittedPondFishSnapshots: Array<{ generation: number; totalScore: number; mature: boolean; sick: boolean }> = []
  ): {
    score: number
    rank: SpecialOrderScoreRank
    threshold: SpecialOrderScoreRule['thresholds'][number] | null
    moneyMultiplier: number
    ticketMultiplier: number
    remainingDays: number
    initialDaysRemaining: number
    timelinessRatio: number
    scoreBreakdown: string[]
  } | null => {
    if (quest.type !== 'special_order' || !quest.orderScoreRule) return null
    if (!specialOrderFeatureFlags.scoreSettlementEnabled) return null

    const breedingStore = useBreedingStore()
    const goalStore = useGoalStore()
    const gameStore = useGameStore()
    const currentSeason = gameStore.season
    const scoreBreakdown: string[] = []
    const initialDaysRemaining = Math.max(1, quest.orderProgressState?.initialDaysRemaining ?? quest.daysRemaining ?? 1)
    const remainingDays = Math.max(0, quest.daysRemaining)
    const timelinessRatio = Math.max(0, Math.min(1, remainingDays / initialDaysRemaining))

    let score = specialOrderSettlementConfig.baseScore
    scoreBreakdown.push(`基础分 ${specialOrderSettlementConfig.baseScore}`)

    if (timelinessRatio >= specialOrderSettlementConfig.timelinessHighRemainingRatio) {
      score += specialOrderSettlementConfig.timelinessHighBonus
      scoreBreakdown.push(`时效优秀 +${specialOrderSettlementConfig.timelinessHighBonus}`)
    } else if (timelinessRatio >= specialOrderSettlementConfig.timelinessMediumRemainingRatio) {
      score += specialOrderSettlementConfig.timelinessMediumBonus
      scoreBreakdown.push(`时效稳定 +${specialOrderSettlementConfig.timelinessMediumBonus}`)
    } else {
      scoreBreakdown.push('时效普通 +0')
    }

    if (quest.themeTag === 'breeding') {
      const entry = breedingStore.compendium.find(
        compendiumEntry => compendiumEntry.hybridId === (quest.requiredHybridId ?? quest.targetItemId)
      )

      if (entry) {
        score += specialOrderSettlementConfig.breedingEntryBaseBonus
        scoreBreakdown.push(`育种图鉴基线 +${specialOrderSettlementConfig.breedingEntryBaseBonus}`)

        if (quest.requiredSweetnessMin && (entry.bestSweetness ?? 0) >= quest.requiredSweetnessMin) {
          const sweetnessBonus =
            specialOrderSettlementConfig.breedingRequirementMetBonus +
            Math.min(
              specialOrderSettlementConfig.breedingRequirementOverflowCap,
              Math.floor(
                ((entry.bestSweetness ?? 0) - quest.requiredSweetnessMin) /
                  specialOrderSettlementConfig.breedingRequirementOverflowDivisor
              )
            )
          score += sweetnessBonus
          scoreBreakdown.push(`甜度达标 +${sweetnessBonus}`)
        }
        if (quest.requiredYieldMin && (entry.bestYield ?? 0) >= quest.requiredYieldMin) {
          const yieldBonus =
            specialOrderSettlementConfig.breedingRequirementMetBonus +
            Math.min(
              specialOrderSettlementConfig.breedingRequirementOverflowCap,
              Math.floor(
                ((entry.bestYield ?? 0) - quest.requiredYieldMin) /
                  specialOrderSettlementConfig.breedingRequirementOverflowDivisor
              )
            )
          score += yieldBonus
          scoreBreakdown.push(`产量达标 +${yieldBonus}`)
        }
        if (quest.requiredResistanceMin && (entry.bestResistance ?? 0) >= quest.requiredResistanceMin) {
          const resistanceBonus =
            specialOrderSettlementConfig.breedingRequirementMetBonus +
            Math.min(
              specialOrderSettlementConfig.breedingRequirementOverflowCap,
              Math.floor(
                ((entry.bestResistance ?? 0) - quest.requiredResistanceMin) /
                  specialOrderSettlementConfig.breedingRequirementOverflowDivisor
              )
            )
          score += resistanceBonus
          scoreBreakdown.push(`抗性达标 +${resistanceBonus}`)
        }
        if (quest.requiredGenerationMin && (entry.bestGeneration ?? 0) >= quest.requiredGenerationMin) {
          const generationBonus =
            specialOrderSettlementConfig.breedingRequirementMetBonus +
            Math.min(
              specialOrderSettlementConfig.breedingGenerationOverflowCap,
              ((entry.bestGeneration ?? 0) - quest.requiredGenerationMin) * specialOrderSettlementConfig.breedingGenerationOverflowStepBonus
            )
          score += generationBonus
          scoreBreakdown.push(`世代达标 +${generationBonus}`)
        }
        if (!quest.requiredSweetnessMin && !quest.requiredYieldMin && !quest.requiredResistanceMin && !quest.requiredGenerationMin) {
          const totalStatsBonus = Math.min(
            specialOrderSettlementConfig.breedingTotalStatsCap,
            Math.floor((entry.bestTotalStats ?? 0) / specialOrderSettlementConfig.breedingTotalStatsDivisor)
          )
          score += totalStatsBonus
          scoreBreakdown.push(`综合属性 +${totalStatsBonus}`)
        }
        if (quest.requiredParentCropIds?.length) {
          const lineageCropIds = new Set(entry.lineageCropIds ?? [])
          const matchedParentCount = quest.requiredParentCropIds.filter(cropId => lineageCropIds.has(cropId)).length
          const parentBonus =
            matchedParentCount >= quest.requiredParentCropIds.length
              ? specialOrderSettlementConfig.breedingParentFullBonus
              : matchedParentCount * specialOrderSettlementConfig.breedingParentMatchedBonus
          score += parentBonus
          scoreBreakdown.push(`谱系契合 +${parentBonus}`)
        }
      }
    } else if (quest.themeTag === 'fishpond') {
      const pondSamples = submittedPondFishSnapshots
      const fishGenerationBonus = Math.min(
        specialOrderSettlementConfig.fishpondGenerationBonusCap,
        Math.max(
          quest.requiredPondGenerationMin ?? 1,
          pondSamples.length > 0 ? Math.max(...pondSamples.map(sample => sample.generation)) : 1
        ) * specialOrderSettlementConfig.fishpondGenerationBonusPerTier
      )
      score += fishGenerationBonus
      scoreBreakdown.push(`鱼塘代数 +${fishGenerationBonus}`)
      if (quest.requiredFishMature && (pondSamples.length === 0 || pondSamples.every(sample => sample.mature))) {
        score += specialOrderSettlementConfig.fishpondTraitBonus
        scoreBreakdown.push(`成熟度达标 +${specialOrderSettlementConfig.fishpondTraitBonus}`)
      }
      if (quest.requiredFishHealthy && (pondSamples.length === 0 || pondSamples.every(sample => !sample.sick))) {
        score += specialOrderSettlementConfig.fishpondTraitBonus
        scoreBreakdown.push(`健康度达标 +${specialOrderSettlementConfig.fishpondTraitBonus}`)
      }
      if (pondSamples.length > 0) {
        const averageTotalScore = pondSamples.reduce((sum, sample) => sum + sample.totalScore, 0) / pondSamples.length
        const sampleScoreBonus = Math.min(
          specialOrderSettlementConfig.requirementSummaryBonusCap,
          Math.floor(averageTotalScore / specialOrderSettlementConfig.genericQuantityDivisor)
        )
        score += sampleScoreBonus
        scoreBreakdown.push(`提交样本评分 +${sampleScoreBonus}`)
      }
      const summaryBonus = Math.min(
        specialOrderSettlementConfig.requirementSummaryBonusCap,
        (quest.requirementSummary?.length ?? 0) * specialOrderSettlementConfig.requirementSummaryBonusPerEntry
      )
      score += summaryBonus
      scoreBreakdown.push(`条件摘要 +${summaryBonus}`)
    } else {
      const quantityBonus = Math.min(
        specialOrderSettlementConfig.genericQuantityBonusCap,
        Math.floor(quest.targetQuantity / specialOrderSettlementConfig.genericQuantityDivisor)
      )
      score += quantityBonus
      scoreBreakdown.push(`基础数量 +${quantityBonus}`)
      const summaryBonus = Math.min(
        specialOrderSettlementConfig.requirementSummaryBonusCap,
        (quest.requirementSummary?.length ?? 0) * specialOrderSettlementConfig.requirementSummaryBonusPerEntry
      )
      score += summaryBonus
      scoreBreakdown.push(`条件摘要 +${summaryBonus}`)
    }

    if (quest.preferredSeasons?.includes(currentSeason)) {
      score += specialOrderSettlementConfig.seasonMatchBonus
      scoreBreakdown.push(`时令匹配 +${specialOrderSettlementConfig.seasonMatchBonus}`)
    }
    if (quest.activitySourceId) {
      score += specialOrderSettlementConfig.activitySourceBonus
      scoreBreakdown.push(`活动来源 +${specialOrderSettlementConfig.activitySourceBonus}`)
    }
    if (
      specialOrderFeatureFlags.themeWeekBiasEnabled &&
      goalStore.currentThemeWeek?.preferredQuestThemeTag &&
      goalStore.currentThemeWeek.preferredQuestThemeTag === quest.themeTag
    ) {
      score += specialOrderSettlementConfig.themeWeekMatchBonus
      scoreBreakdown.push(`主题周匹配 +${specialOrderSettlementConfig.themeWeekMatchBonus}`)
    }
    if (quest.recommendedHybridIds?.length) {
      const recommendedBonus = Math.min(
        specialOrderSettlementConfig.recommendedHybridBonusCap,
        quest.recommendedHybridIds.length * specialOrderSettlementConfig.recommendedHybridBonusPerEntry
      )
      score += recommendedBonus
      scoreBreakdown.push(`推荐目标覆盖 +${recommendedBonus}`)
    }

    const normalizedScore = Math.max(
      specialOrderSettlementConfig.minimumScore,
      Math.min(specialOrderSettlementConfig.maximumScore, Math.round(score))
    )
    const { rank, threshold } = resolveSpecialOrderRank(quest.orderScoreRule, normalizedScore)

    return {
      score: normalizedScore,
      rank,
      threshold,
      moneyMultiplier: threshold?.rewardMoneyMultiplier ?? 1,
      ticketMultiplier: threshold?.rewardTicketMultiplier ?? 1,
      remainingDays,
      initialDaysRemaining,
      timelinessRatio,
      scoreBreakdown
    }
  }

  const buildCompletedSpecialOrderProgressState = (
    quest: QuestInstance,
    settlement: ReturnType<typeof evaluateSpecialOrderSettlement>
  ): SpecialOrderProgressState | undefined => {
    const stageDefinitions =
      quest.stageDefinitions && quest.stageDefinitions.length > 0
        ? quest.stageDefinitions
        : quest.orderVersion === '3.0'
          ? [
              {
                id: 'delivery',
                title: '完成交付',
                description: '按订单要求完成当前批次交付。',
                phaseType: 'deliver' as const,
                targetItemId: quest.targetItemId,
                targetItemName: quest.targetItemName,
                targetQuantity: quest.targetQuantity,
                deliveryMode: quest.deliveryMode
              }
            ]
          : []

    if (stageDefinitions.length === 0 && !settlement) return quest.orderProgressState

    const existingStageProgressMap = new Map((quest.orderProgressState?.stageProgress ?? []).map(stage => [stage.stageId, stage]))
    const stageProgress = stageDefinitions.map(stage => {
      const existingStage = existingStageProgressMap.get(stage.id)
      return {
        stageId: stage.id,
        completed: true,
        deliveredQuantity: Math.max(existingStage?.deliveredQuantity ?? 0, stage.targetQuantity ?? quest.targetQuantity),
        rewardClaimed: existingStage?.rewardClaimed ?? true,
        phaseType: existingStage?.phaseType ?? stage.phaseType,
        nextStageTemplateId: existingStage?.nextStageTemplateId ?? stage.nextStageTemplateId
      }
    })

    return {
      currentStageIndex: Math.max(0, stageDefinitions.length - 1),
      completedStageIds: stageDefinitions.map(stage => stage.id),
      initialDaysRemaining: quest.orderProgressState?.initialDaysRemaining,
      currentScore: settlement?.score,
      currentRank: settlement?.rank ?? 'pending',
      stageProgress,
      stageHistory: quest.orderProgressState?.stageHistory ? [...quest.orderProgressState.stageHistory] : undefined,
      settlementSummary: settlement
        ? {
            score: settlement.score,
            rank: settlement.rank,
            remainingDays: settlement.remainingDays,
            initialDaysRemaining: settlement.initialDaysRemaining,
            timelinessRatio: settlement.timelinessRatio,
            scoreBreakdown: [...settlement.scoreBreakdown],
            thresholdLabel: settlement.threshold?.label,
            thresholdSummary: settlement.threshold?.summary
          }
        : quest.orderProgressState?.settlementSummary
    }
  }

  const isMultiStageOrder = (quest: QuestInstance): boolean => {
    return quest.type === 'special_order' && quest.orderStageType === 'multi' && Array.isArray(quest.stageDefinitions) && quest.stageDefinitions.length > 0
  }

  const getCurrentSpecialOrderStage = (quest: QuestInstance): SpecialOrderStageDef | null => {
    if (!isMultiStageOrder(quest)) return null
    const currentStageIndex = Math.max(
      0,
      Math.min((quest.stageDefinitions?.length ?? 1) - 1, quest.orderProgressState?.currentStageIndex ?? 0)
    )
    return quest.stageDefinitions?.[currentStageIndex] ?? null
  }

  const buildQuestStageProgressState = (quest: QuestInstance): QuestStageState[] => {
    const stageDefinitions = quest.stageDefinitions ?? []
    return stageDefinitions.map(stage => ({
      stageId: stage.id,
      completed: false,
      deliveredQuantity: 0,
      rewardClaimed: false,
      phaseType: stage.phaseType,
      nextStageTemplateId: stage.nextStageTemplateId
    }))
  }

  const getSpecialOrderProgressStateSnapshot = (quest: QuestInstance): SpecialOrderProgressState => {
    const stageDefinitions = quest.stageDefinitions ?? []
    const existingStageProgress = quest.orderProgressState?.stageProgress ?? []
    const existingStageProgressMap = new Map(existingStageProgress.map(stage => [stage.stageId, stage]))

    const stageProgress: QuestStageState[] =
      stageDefinitions.length > 0
        ? stageDefinitions.map(stage => {
            const currentStageState = existingStageProgressMap.get(stage.id)
            return {
              stageId: stage.id,
              completed: currentStageState?.completed ?? false,
              deliveredQuantity: currentStageState?.deliveredQuantity ?? 0,
              rewardClaimed: currentStageState?.rewardClaimed ?? false,
              phaseType: currentStageState?.phaseType ?? stage.phaseType,
              nextStageTemplateId: currentStageState?.nextStageTemplateId ?? stage.nextStageTemplateId
            }
          })
        : existingStageProgress.map(stage => ({ ...stage }))

    return {
      currentStageIndex: Math.max(0, Math.min(Math.max(0, stageDefinitions.length - 1), quest.orderProgressState?.currentStageIndex ?? 0)),
      completedStageIds: dedupeList([...(quest.orderProgressState?.completedStageIds ?? [])]),
      initialDaysRemaining: Math.max(1, quest.orderProgressState?.initialDaysRemaining ?? quest.daysRemaining ?? 1),
      currentScore: quest.orderProgressState?.currentScore,
      currentRank: quest.orderProgressState?.currentRank ?? (quest.type === 'special_order' ? 'pending' : undefined),
      stageProgress: stageProgress.length > 0 ? stageProgress : buildQuestStageProgressState(quest),
      stageHistory: [...(quest.orderProgressState?.stageHistory ?? [])],
      settlementSummary: quest.orderProgressState?.settlementSummary
        ? {
            ...quest.orderProgressState.settlementSummary,
            scoreBreakdown: [...quest.orderProgressState.settlementSummary.scoreBreakdown]
          }
        : undefined
    }
  }

  const appendSpecialOrderStageHistory = (
    quest: QuestInstance,
    currentStage: SpecialOrderStageDef,
    resolution: SpecialOrderStageHistoryEntry['resolution'],
    deliveredQuantity: number,
    summary?: string
  ): SpecialOrderProgressState => {
    const progressState = getSpecialOrderProgressStateSnapshot(quest)
    return {
      ...progressState,
      stageHistory: [
        ...(progressState.stageHistory ?? []),
        {
          stageId: currentStage.id,
          phaseType: currentStage.phaseType,
          deliveredQuantity: Math.max(0, deliveredQuantity),
          resolution,
          summary: summary ?? currentStage.stageRewards?.summary ?? currentStage.description
        }
      ]
    }
  }

  const advanceSpecialOrderStageState = (
    quest: QuestInstance,
    currentStage: SpecialOrderStageDef,
    deliveredQuantity: number
  ): {
    progressState: SpecialOrderProgressState
    nextStage: SpecialOrderStageDef | null
    isFinalStage: boolean
  } => {
    const stageDefinitions = quest.stageDefinitions ?? []
    const progressState = getSpecialOrderProgressStateSnapshot(quest)
    const currentStageIndex = Math.max(0, Math.min(Math.max(0, stageDefinitions.length - 1), progressState.currentStageIndex))
    const isFinalStage = currentStageIndex >= Math.max(0, stageDefinitions.length - 1)
    const stageProgress = (progressState.stageProgress?.length ?? 0) > 0
      ? [...(progressState.stageProgress ?? [])]
      : buildQuestStageProgressState(quest)

    stageProgress[currentStageIndex] = {
      stageId: currentStage.id,
      completed: true,
      deliveredQuantity,
      rewardClaimed: true,
      phaseType: currentStage.phaseType,
      nextStageTemplateId: currentStage.nextStageTemplateId
    }

    const nextProgressState = appendSpecialOrderStageHistory(
      quest,
      currentStage,
      isFinalStage ? 'completed' : 'advanced',
      deliveredQuantity
    )

    nextProgressState.currentStageIndex = isFinalStage ? currentStageIndex : currentStageIndex + 1
    nextProgressState.completedStageIds = dedupeList([...(nextProgressState.completedStageIds ?? []), currentStage.id])
    nextProgressState.currentRank = nextProgressState.currentRank ?? 'pending'
    nextProgressState.stageProgress = stageProgress

    return {
      progressState: nextProgressState,
      nextStage: !isFinalStage ? stageDefinitions[currentStageIndex + 1] ?? null : null,
      isFinalStage
    }
  }

  const markSpecialOrderStageFailed = (quest: QuestInstance, summary?: string) => {
    const currentStage = getCurrentSpecialOrderStage(quest)
    if (!currentStage) return

    const alreadyFailed = quest.orderProgressState?.stageHistory?.some(
      entry => entry.stageId === currentStage.id && entry.resolution === 'failed'
    )
    if (alreadyFailed) return

    const deliveredQuantity = quest.orderProgressState?.stageProgress?.find(stage => stage.stageId === currentStage.id)?.deliveredQuantity ?? 0
    quest.orderProgressState = appendSpecialOrderStageHistory(
      quest,
      currentStage,
      'failed',
      deliveredQuantity,
      summary ?? '订单超时，当前阶段已按失败结案。'
    )
  }

  const getStageEffectiveProgress = (quest: QuestInstance, stage: SpecialOrderStageDef): number => {
    if (stage.comboRequirements?.length) {
      return stage.comboRequirements.reduce((total, requirement) => total + getComboRequirementEffectiveProgress(requirement), 0)
    }

    const targetItemId = stage.targetItemId ?? quest.targetItemId
    const targetQuantity = stage.targetQuantity ?? quest.targetQuantity
    const deliveryMode = stage.deliveryMode ?? quest.deliveryMode

    if (deliveryMode === 'pond') {
      const fishPondStore = useFishPondStore()
      const eligible = fishPondStore.countEligibleFishForOrder({
        fishId: targetItemId,
        generationMin: quest.requiredPondGenerationMin,
        requireMature: quest.requiredFishMature,
        requireHealthy: quest.requiredFishHealthy
      })
      return Math.min(eligible, targetQuantity)
    }

    return Math.min(inventoryStore.getTotalItemCount(targetItemId), targetQuantity)
  }

  const hasComboRequirements = (quest: QuestInstance): boolean => Array.isArray(quest.comboRequirements) && quest.comboRequirements.length > 0

  const getComboRequirementEffectiveProgress = (requirement: SpecialOrderComboRequirement): number => {
    if (requirement.deliveryMode === 'pond') {
      const fishPondStore = useFishPondStore()
      const eligible = fishPondStore.countEligibleFishForOrder({
        fishId: requirement.itemId,
        generationMin: requirement.requiredPondGenerationMin,
        requireMature: requirement.requiredFishMature,
        requireHealthy: requirement.requiredFishHealthy
      })
      return Math.min(eligible, requirement.quantity)
    }

    return Math.min(inventoryStore.getTotalItemCount(requirement.itemId), requirement.quantity)
  }

  const getUnsatisfiedComboRequirement = (quest: QuestInstance): SpecialOrderComboRequirement | null => {
    if (!hasComboRequirements(quest)) return null
    return quest.comboRequirements!.find(requirement => getComboRequirementEffectiveProgress(requirement) < requirement.quantity) ?? null
  }

  const getComboRequirementShortfallMessage = (requirement: SpecialOrderComboRequirement): string => {
    const current = getComboRequirementEffectiveProgress(requirement)
    if (requirement.deliveryMode === 'pond') {
      return `鱼塘中符合条件的${requirement.itemName}不足（${current}/${requirement.quantity}）。`
    }
    return `${requirement.itemName}不足（${current}/${requirement.quantity}）。`
  }

  const getQuestEffectiveProgress = (quest: QuestInstance): number => {
    const currentStage = getCurrentSpecialOrderStage(quest)
    if (currentStage) {
      return getStageEffectiveProgress(quest, currentStage)
    }

    if (hasComboRequirements(quest)) {
      return quest.comboRequirements!.reduce((total, requirement) => total + getComboRequirementEffectiveProgress(requirement), 0)
    }

    if (quest.deliveryMode === 'pond') {
      const fishPondStore = useFishPondStore()
      const eligible = fishPondStore.countEligibleFishForOrder({
        fishId: quest.targetItemId,
        generationMin: quest.requiredPondGenerationMin,
        requireMature: quest.requiredFishMature,
        requireHealthy: quest.requiredFishHealthy
      })
      return Math.min(eligible, quest.targetQuantity)
    }

    const carriedCount = inventoryStore.getTotalItemCount(quest.targetItemId)
    if (quest.type === 'delivery') {
      return Math.min(carriedCount, quest.targetQuantity)
    }
    return Math.min(Math.max(quest.collectedQuantity, carriedCount), quest.targetQuantity)
  }

  const canSubmitQuest = (quest: QuestInstance): boolean => {
    if (!meetsRelationshipRequirement(quest)) return false
    const currentStage = getCurrentSpecialOrderStage(quest)
    if (currentStage) {
      if (currentStage.comboRequirements?.length) {
        return currentStage.comboRequirements.every(requirement => getComboRequirementEffectiveProgress(requirement) >= requirement.quantity)
      }

      const targetItemId = currentStage.targetItemId ?? quest.targetItemId
      const targetQuantity = currentStage.targetQuantity ?? quest.targetQuantity
      const deliveryMode = currentStage.deliveryMode ?? quest.deliveryMode

      if (deliveryMode === 'pond') {
        return getStageEffectiveProgress(quest, currentStage) >= targetQuantity
      }

      const carriedCount = inventoryStore.getTotalItemCount(targetItemId)
      if (currentStage.phaseType === 'prepare' || currentStage.phaseType === 'verify' || currentStage.phaseType === 'deliver') {
        return carriedCount >= targetQuantity && getStageEffectiveProgress(quest, currentStage) >= targetQuantity
      }

      return getStageEffectiveProgress(quest, currentStage) >= targetQuantity && carriedCount >= targetQuantity
    }

    if (hasComboRequirements(quest)) {
      return !getUnsatisfiedComboRequirement(quest)
    }

    if (quest.deliveryMode === 'pond') {
      return getQuestEffectiveProgress(quest) >= quest.targetQuantity
    }

    const carriedCount = inventoryStore.getTotalItemCount(quest.targetItemId)
    if (quest.type === 'delivery') {
      return carriedCount >= quest.targetQuantity
    }
    return getQuestEffectiveProgress(quest) >= quest.targetQuantity && carriedCount >= quest.targetQuantity
  }

  /** 提交完成的任务 */
  const submitQuest = (questId: string): { success: boolean; message: string } => {
    if (!beginQuestSubmission(questId)) {
      return { success: false, message: '该委托正在结算中，请勿重复点击。' }
    }

    try {
    const cookingStore = useCookingStore()
    const fishPondStore = useFishPondStore()
    const villageProjectStore = useVillageProjectStore()
    const walletStore = useWalletStore()
    const shopStore = useShopStore()
    const serviceContractEffect = shopStore.getServiceContractEffectSummary('quest')
    const submittedPondFishSnapshots: Array<{ generation: number; totalScore: number; mature: boolean; sick: boolean }> = []
    const idx = activeQuests.value.findIndex(q => q.id === questId)
    if (idx === -1) return { success: false, message: '任务不存在。' }

    const quest = activeQuests.value[idx]!
    if (!meetsRelationshipRequirement(quest)) {
      return { success: false, message: `${quest.npcName} 当前关系未达到该委托要求。` }
    }
    if (
      quest.type === 'special_order' &&
      specialOrderFeatureFlags.duplicateSettlementGuardEnabled &&
      specialOrderSettlementReceipts.value.includes(quest.id)
    ) {
      return { success: false, message: '该特殊订单已完成结算，请勿重复提交。' }
    }
    const inventorySnapshot = inventoryStore.serialize()
    const fishPondSnapshot = fishPondStore.serialize()
    const rewardItems = (quest.itemReward ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
    const rollbackSubmissionState = () => {
      inventoryStore.deserialize(inventorySnapshot)
      fishPondStore.deserialize(fishPondSnapshot)
    }
    let finalStageAlreadySubmitted = false

    const currentStage = getCurrentSpecialOrderStage(quest)
    if (currentStage) {
      const targetItemId = currentStage.targetItemId ?? quest.targetItemId
      const targetItemName = currentStage.targetItemName ?? quest.targetItemName
      const targetQuantity = currentStage.targetQuantity ?? quest.targetQuantity
      const deliveryMode = currentStage.deliveryMode ?? quest.deliveryMode
      const currentStageIndex = Math.max(0, quest.orderProgressState?.currentStageIndex ?? 0)
      const isFinalStage = currentStageIndex >= ((quest.stageDefinitions?.length ?? 1) - 1)
      const stageRewardItems = !isFinalStage
        ? (currentStage.stageRewards?.itemReward ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))
        : []

      if (currentStage.comboRequirements?.length) {
        const unsatisfiedRequirement = currentStage.comboRequirements.find(requirement => getComboRequirementEffectiveProgress(requirement) < requirement.quantity)
        if (unsatisfiedRequirement) {
          return { success: false, message: getComboRequirementShortfallMessage(unsatisfiedRequirement) }
        }

        for (const requirement of currentStage.comboRequirements) {
          if (requirement.deliveryMode === 'pond') {
            if (
              !fishPondStore.submitEligibleFishForOrder({
                fishId: requirement.itemId,
                quantity: requirement.quantity,
                generationMin: requirement.requiredPondGenerationMin,
                requireMature: requirement.requiredFishMature,
                requireHealthy: requirement.requiredFishHealthy
              })
            ) {
              rollbackSubmissionState()
              return { success: false, message: `${requirement.itemName}鱼塘交付失败，请稍后再试。` }
            }
            if (isFinalStage) {
              submittedPondFishSnapshots.push(...fishPondStore.lastOrderSubmissionSnapshots)
            }
          } else if (!inventoryStore.removeItemAnywhere(requirement.itemId, requirement.quantity)) {
            rollbackSubmissionState()
            return { success: false, message: `${requirement.itemName}不足，无法完成当前订单阶段。` }
          }
        }
      } else if (deliveryMode === 'pond') {
        const eligibleCount = fishPondStore.countEligibleFishForOrder({
          fishId: targetItemId,
          generationMin: quest.requiredPondGenerationMin,
          requireMature: quest.requiredFishMature,
          requireHealthy: quest.requiredFishHealthy
        })
        if (eligibleCount < targetQuantity) {
          return { success: false, message: `鱼塘中符合条件的${targetItemName}不足（${eligibleCount}/${targetQuantity}）。` }
        }
        if (
          !fishPondStore.submitEligibleFishForOrder({
            fishId: targetItemId,
            quantity: targetQuantity,
            generationMin: quest.requiredPondGenerationMin,
            requireMature: quest.requiredFishMature,
            requireHealthy: quest.requiredFishHealthy
          })
        ) {
          rollbackSubmissionState()
          return { success: false, message: `${targetItemName}鱼塘交付失败，请稍后再试。` }
        }
        if (isFinalStage) {
          submittedPondFishSnapshots.push(...fishPondStore.lastOrderSubmissionSnapshots)
        }
      } else {
        const effectiveProgress = getStageEffectiveProgress(quest, currentStage)
        if (effectiveProgress < targetQuantity) {
          return { success: false, message: `${targetItemName}当前阶段进度不足（${effectiveProgress}/${targetQuantity}）。` }
        }
        if (inventoryStore.getTotalItemCount(targetItemId) < targetQuantity) {
          return { success: false, message: `请先带上足够的${targetItemName}再来提交当前阶段。` }
        }
        if (!inventoryStore.removeItemAnywhere(targetItemId, targetQuantity)) {
          rollbackSubmissionState()
          return { success: false, message: `请先带上足够的${targetItemName}再来提交当前阶段。` }
        }
      }

      if (stageRewardItems.length > 0 && !inventoryStore.canAddItems(stageRewardItems)) {
        rollbackSubmissionState()
        return { success: false, message: '请先整理背包，当前阶段奖励空间不足。' }
      }

      if (!isFinalStage) {
        if (stageRewardItems.length > 0) {
          inventoryStore.addItemsExact(stageRewardItems)
        }

        const stageMoneyReward = Math.max(0, currentStage.stageRewards?.moneyReward ?? 0)
        const stageFriendshipReward = currentStage.stageRewards?.friendshipReward ?? 0
        if (stageMoneyReward > 0) {
          playerStore.earnMoney(stageMoneyReward)
        }
        const stageFriendshipMessages = stageFriendshipReward !== 0 ? npcStore.adjustFriendship(quest.npcId, stageFriendshipReward) : []
        const stageGrantedTickets = walletStore.addRewardTickets(currentStage.stageRewards?.ticketReward, {
          source: 'specialOrder',
          applyMultiplier: false
        })

        const stageTransition = advanceSpecialOrderStageState(quest, currentStage, targetQuantity)
        quest.orderProgressState = stageTransition.progressState

        const nextStage = stageTransition.nextStage
        let message = `完成了${quest.npcName}订单阶段「${currentStage.title}」。`
        if (stageMoneyReward > 0) {
          message += ` 获得${stageMoneyReward}文。`
        }
        if (stageFriendshipReward > 0) {
          message += ` ${quest.npcName}好感+${stageFriendshipReward}。`
        }
        if (stageRewardItems.length > 0) {
          const itemText = stageRewardItems.map(item => `${getItemById(item.itemId)?.name ?? item.itemId}×${item.quantity}`).join('、')
          message += ` 阶段奖励：${itemText}。`
        }
        if (Object.keys(stageGrantedTickets).length > 0) {
          const ticketText = Object.entries(stageGrantedTickets)
            .map(([ticketType, amount]) => `${walletStore.getTicketLabel(ticketType as RewardTicketType)}×${amount}`)
            .join('、')
          message += ` 额外获得${ticketText}。`
        }
        if (currentStage.stageRewards?.summary) {
          message += ` ${currentStage.stageRewards.summary}`
        }
        if (stageFriendshipMessages.length > 0) {
          message += ` ${stageFriendshipMessages.join(' ')}`
        }
        if (nextStage) {
          message += ` 下一阶段：${nextStage.title}。`
        }
        return { success: true, message }
      }

      const stageTransition = advanceSpecialOrderStageState(quest, currentStage, targetQuantity)
      quest.orderProgressState = stageTransition.progressState
      finalStageAlreadySubmitted = true
    }

    if (finalStageAlreadySubmitted) {
      // 最终阶段已完成本轮交付，下面只继续做整单结算，避免再次进入通用交付流程。
    } else if (hasComboRequirements(quest)) {
      const unsatisfiedRequirement = getUnsatisfiedComboRequirement(quest)
      if (unsatisfiedRequirement) {
        return { success: false, message: getComboRequirementShortfallMessage(unsatisfiedRequirement) }
      }

      for (const requirement of quest.comboRequirements!) {
        if (requirement.deliveryMode === 'pond') {
          if (
            !fishPondStore.submitEligibleFishForOrder({
              fishId: requirement.itemId,
              quantity: requirement.quantity,
              generationMin: requirement.requiredPondGenerationMin,
              requireMature: requirement.requiredFishMature,
              requireHealthy: requirement.requiredFishHealthy
            })
          ) {
            rollbackSubmissionState()
            return { success: false, message: `${requirement.itemName}鱼塘交付失败，请稍后再试。` }
          }
          submittedPondFishSnapshots.push(...fishPondStore.lastOrderSubmissionSnapshots)
        } else if (!inventoryStore.removeItemAnywhere(requirement.itemId, requirement.quantity)) {
          rollbackSubmissionState()
          return { success: false, message: `${requirement.itemName}不足，无法完成组合交付。` }
        }
      }
    } else if (quest.deliveryMode === 'pond') {
      const eligibleCount = fishPondStore.countEligibleFishForOrder({
        fishId: quest.targetItemId,
        generationMin: quest.requiredPondGenerationMin,
        requireMature: quest.requiredFishMature,
        requireHealthy: quest.requiredFishHealthy
      })
      if (eligibleCount < quest.targetQuantity) {
        return { success: false, message: `鱼塘中符合条件的${quest.targetItemName}不足（${eligibleCount}/${quest.targetQuantity}）。` }
      }
      if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
        return { success: false, message: '请先整理背包，当前空间不足以领取委托奖励。' }
      }
      if (
        !fishPondStore.submitEligibleFishForOrder({
          fishId: quest.targetItemId,
          quantity: quest.targetQuantity,
          generationMin: quest.requiredPondGenerationMin,
          requireMature: quest.requiredFishMature,
          requireHealthy: quest.requiredFishHealthy
        })
      ) {
        return { success: false, message: '鱼塘交付失败，请稍后再试。' }
      }
    }
    // 送货类委托：提交时从背包扣除物品
    else if (quest.type === 'delivery') {
      if (inventoryStore.getTotalItemCount(quest.targetItemId) < quest.targetQuantity) {
        return { success: false, message: `背包中${quest.targetItemName}不足。` }
      }
      if (!inventoryStore.removeItemAnywhere(quest.targetItemId, quest.targetQuantity)) {
        rollbackSubmissionState()
        return { success: false, message: `背包中${quest.targetItemName}不足。` }
      }
    } else {
      // 钓鱼/挖矿/采集/特殊订单类：检查收集进度或背包数量
      const effectiveProgress = getQuestEffectiveProgress(quest)
      if (effectiveProgress < quest.targetQuantity) {
        return { success: false, message: `${quest.targetItemName}收集进度不足（${effectiveProgress}/${quest.targetQuantity}）。` }
      }
      if (inventoryStore.getTotalItemCount(quest.targetItemId) < quest.targetQuantity) {
        return { success: false, message: `请先带上足够的${quest.targetItemName}再来提交。` }
      }
      if (!inventoryStore.removeItemAnywhere(quest.targetItemId, quest.targetQuantity)) {
        rollbackSubmissionState()
        return { success: false, message: `请先带上足够的${quest.targetItemName}再来提交。` }
      }
    }

    if (quest.deliveryMode === 'pond' && submittedPondFishSnapshots.length === 0) {
      submittedPondFishSnapshots.push(...fishPondStore.lastOrderSubmissionSnapshots)
    }

    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      rollbackSubmissionState()
      return { success: false, message: '请先整理背包，提交后腾出的空间仍不足以领取委托奖励。' }
    }

    const specialOrderSettlement =
      quest.type === 'special_order' ? evaluateSpecialOrderSettlement(quest, submittedPondFishSnapshots) : null
    if (specialOrderSettlement) {
      quest.orderProgressState = buildCompletedSpecialOrderProgressState(quest, specialOrderSettlement)
    }

    // 发放铜钱奖励
    const finalMoneyReward = Math.max(
      0,
      Math.round(
        (quest.moneyReward + Math.floor(quest.moneyReward * villageProjectStore.getQuestMoneyBonusRate())) *
          serviceContractEffect.moneyRewardMultiplier *
          (specialOrderSettlement?.moneyMultiplier ?? 1)
      )
    )
    const finalFriendshipReward = quest.friendshipReward + villageProjectStore.getQuestFriendshipBonus()

    playerStore.earnMoney(finalMoneyReward)
    const friendshipMessages = npcStore.adjustFriendship(quest.npcId, finalFriendshipReward)

    // 发放物品奖励
    if (quest.itemReward) {
      inventoryStore.addItemsExact(rewardItems)
    }

    const grantedTicketRewards = walletStore.addRewardTickets(
      mergeTicketRewards(scaleTicketRewards(quest.ticketReward, specialOrderSettlement?.ticketMultiplier ?? 1), serviceContractEffect.ticketRewards),
      {
      source: quest.type === 'special_order' ? 'specialOrder' : 'quest',
      applyMultiplier: false
      }
    )

    const unlockedRecipes: string[] = []
    if (quest.recipeReward) {
      for (const recipeId of quest.recipeReward) {
        if (cookingStore.unlockRecipe(recipeId)) {
          unlockedRecipes.push(getRecipeById(recipeId)?.name ?? recipeId)
        }
      }
    }

    let clueMessage = ''
    if (quest.buildingClueId && quest.buildingClueText) {
      const added = npcStore.addRelationshipClue(quest.npcId, quest.buildingClueId, quest.buildingClueText)
      if (added) clueMessage = ` 你记下了一条新的建筑线索。`
    }

    // 记录完成
    completedQuestCount.value++

    if (quest.type === 'special_order') {
      rememberSpecialOrderReceipt(quest.id)
    }

    // 从活跃列表移除
    activeQuests.value.splice(idx, 1)

    let message = `完成了${quest.npcName}的委托！获得${finalMoneyReward}文，${quest.npcName}好感+${finalFriendshipReward}。`
    if (villageProjectStore.getQuestMoneyBonusRate() > 0) {
      message += ' 商队驿站让这单报酬更高。'
    }
    if (serviceContractEffect.moneyRewardMultiplier > 1) {
      message += ' 商路外包合同放大了这单现金回报。'
    }
    if (specialOrderSettlement) {
      const rankLabelMap: Record<Exclude<SpecialOrderScoreRank, 'pending'>, string> = {
        C: '合格交付',
        B: '稳定交付',
        A: '优质交付',
        S: '样板交付'
      }
      message += ` 订单评分：${rankLabelMap[specialOrderSettlement.rank === 'pending' ? 'C' : specialOrderSettlement.rank]}（${specialOrderSettlement.score}分）。`
      if (specialOrderSettlement.threshold?.summary) {
        message += ` ${specialOrderSettlement.threshold.summary}`
      }
      addLog(
        `【特殊订单结算】${quest.targetItemName}订单获评 ${specialOrderSettlement.rank}（${specialOrderSettlement.score}分）${specialOrderSettlement.threshold?.label ? `：${specialOrderSettlement.threshold.label}` : ''}`
      )
    }
    if (villageProjectStore.getQuestFriendshipBonus() > 0) {
      message += ' 学舍整修让村民对你的帮助更认可。'
    }
    if (quest.itemReward && quest.itemReward.length > 0) {
      const itemNames = quest.itemReward.map(i => `${getItemById(i.itemId)?.name ?? i.itemId}×${i.quantity}`).join('、')
      message += ` 额外获得${itemNames}。`
    }
    if (Object.keys(grantedTicketRewards).length > 0) {
      const ticketText = Object.entries(grantedTicketRewards)
        .map(([ticketType, amount]) => `${walletStore.getTicketLabel(ticketType as RewardTicketType)}×${amount}`)
        .join('、')
      message += ` 额外获得${ticketText}。`
    }
    if (unlockedRecipes.length > 0) {
      message += ` 解锁食谱：${unlockedRecipes.join('、')}。`
    }
    if (quest.bonusSummary && quest.bonusSummary.length > 0) {
      message += ` ${quest.bonusSummary.join(' ')}`
    }
    if (friendshipMessages.length > 0) {
      message += ` ${friendshipMessages.join(' ')}`
    }
    if (clueMessage) {
      message += clueMessage
    }

    return { success: true, message }
    } finally {
      finishQuestSubmission(questId)
    }
  }

  /** 当玩家获得某物品时，更新进行中任务的进度（钓鱼/挖矿/采集类） */
  const onItemObtained = (itemId: string, quantity: number = 1) => {
    for (const quest of activeQuests.value) {
      if (quest.type === 'delivery') continue // 送货类不自动追踪
      if (quest.targetItemId === itemId && quest.collectedQuantity < quest.targetQuantity) {
        quest.collectedQuantity = Math.min(quest.collectedQuantity + quantity, quest.targetQuantity)
      }
    }

    // 同步刷新主线任务中 deliverItem 目标的进度
    if (mainQuest.value?.accepted) {
      const def = getStoryQuestById(mainQuest.value.questId)
      if (def) {
        for (let i = 0; i < def.objectives.length; i++) {
          const obj = def.objectives[i]!
          if (obj.type === 'deliverItem' && obj.itemId === itemId && !mainQuest.value.objectiveProgress[i]) {
            mainQuest.value.objectiveProgress[i] = evaluateObjective(obj)
          }
        }
      }
    }
  }

  /** 每日更新：天数递减，过期移除 */
  const dailyUpdate = () => {
    // 活跃委托剩余天数递减
    const expired: QuestInstance[] = []
    activeQuests.value = activeQuests.value.filter(q => {
      q.daysRemaining--
      if (q.daysRemaining <= 0) {
        if (q.type === 'special_order') {
          markSpecialOrderStageFailed(q)
        }
        expired.push(q)
        return false
      }
      return true
    })

    // 特殊订单过期（未接取也会过期）
    if (specialOrder.value) {
      specialOrder.value.daysRemaining--
      if (specialOrder.value.daysRemaining <= 0) {
        specialOrder.value = null
      }
    }

    return expired
  }

  /** 检查是否有任务关注某物品 */
  const hasActiveQuestFor = (itemId: string): boolean => {
    return activeQuests.value.some(q => q.targetItemId === itemId)
  }

  // ============================================================
  // 主线任务
  // ============================================================

  /** 当前主线任务状态 */
  const mainQuest = ref<MainQuestState | null>(null)

  /** 已完成的主线任务ID列表 */
  const completedMainQuests = ref<string[]>([])

  /** 好感等级层级顺序 */
  const LEVEL_ORDER = ['stranger', 'acquaintance', 'friendly', 'bestFriend'] as const
  const meetsLevel = (current: string, required: string): boolean => {
    return LEVEL_ORDER.indexOf(current as (typeof LEVEL_ORDER)[number]) >= LEVEL_ORDER.indexOf(required as (typeof LEVEL_ORDER)[number])
  }

  /** 评估单个目标是否达成 */
  const evaluateObjective = (obj: MainQuestObjective): boolean => {
    const skillStore = useSkillStore()
    const shopStore = useShopStore()
    const animalStore = useAnimalStore()

    switch (obj.type) {
      case 'earnMoney':
        return achievementStore.stats.totalMoneyEarned >= (obj.target ?? 0)
      case 'reachMineFloor':
        return achievementStore.stats.highestMineFloor >= (obj.target ?? 0)
      case 'reachSkullFloor':
        return achievementStore.stats.skullCavernBestFloor >= (obj.target ?? 0)
      case 'skillLevel':
        if (obj.skillType) {
          return skillStore.getSkill(obj.skillType as 'farming' | 'foraging' | 'fishing' | 'mining' | 'combat').level >= (obj.target ?? 0)
        }
        // 无指定技能类型 = 任意技能达标
        return skillStore.skills.some(s => s.level >= (obj.target ?? 0))
      case 'allSkillsLevel':
        return skillStore.skills.every(s => s.level >= (obj.target ?? 0))
      case 'harvestCrops':
        return achievementStore.stats.totalCropsHarvested >= (obj.target ?? 0)
      case 'catchFish':
        return achievementStore.stats.totalFishCaught >= (obj.target ?? 0)
      case 'cookRecipes':
        return achievementStore.stats.totalRecipesCooked >= (obj.target ?? 0)
      case 'killMonsters':
        return achievementStore.stats.totalMonstersKilled >= (obj.target ?? 0)
      case 'discoverItems':
        return achievementStore.discoveredItems.length >= (obj.target ?? 0)
      case 'npcFriendship': {
        if (obj.npcId === '_any') {
          // 任意NPC达到指定好感
          return npcStore.npcStates.some(n => meetsLevel(npcStore.getFriendshipLevel(n.npcId), obj.friendshipLevel ?? 'acquaintance'))
        }
        const level = npcStore.getFriendshipLevel(obj.npcId ?? '')
        return meetsLevel(level, obj.friendshipLevel ?? 'acquaintance')
      }
      case 'npcAllFriendly':
        return npcStore.npcStates.every(n => meetsLevel(npcStore.getFriendshipLevel(n.npcId), obj.friendshipLevel ?? 'friendly'))
      case 'completeBundles':
        return achievementStore.completedBundles.length >= (obj.target ?? 0)
      case 'completeQuests':
        return completedQuestCount.value >= (obj.target ?? 0)
      case 'shipItems':
        return shopStore.shippedItems.length >= (obj.target ?? 0)
      case 'ownAnimals':
        return animalStore.animals.length >= (obj.target ?? 0)
      case 'married':
        return npcStore.getSpouse() !== null
      case 'hasChild':
        return npcStore.children.length > 0
      case 'deliverItem':
        // deliverItem 允许从主背包或临时背包提交
        return inventoryStore.getTotalItemCount(obj.itemId ?? '') >= (obj.itemQuantity ?? 1)
      default:
        return false
    }
  }

  /** 初始化主线任务：如果没有当前任务，设置下一个可接取的 */
  const initMainQuest = () => {
    if (mainQuest.value) return // 已有当前任务
    if (completedMainQuests.value.length >= STORY_QUESTS.length) return // 全部完成

    // 找到下一个未完成的主线任务
    const nextQuest =
      completedMainQuests.value.length === 0
        ? getFirstStoryQuest()
        : getNextStoryQuest(completedMainQuests.value[completedMainQuests.value.length - 1]!)

    if (nextQuest) {
      mainQuest.value = {
        questId: nextQuest.id,
        accepted: false,
        objectiveProgress: nextQuest.objectives.map(() => false)
      }
    }
  }

  /** 接取主线任务 */
  const acceptMainQuest = (): { success: boolean; message: string } => {
    if (!mainQuest.value) return { success: false, message: '没有可接取的主线任务。' }
    if (mainQuest.value.accepted) return { success: false, message: '主线任务已接取。' }

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return { success: false, message: '主线任务数据异常。' }

    mainQuest.value.accepted = true

    // 接取时立即评估一次进度
    for (let i = 0; i < def.objectives.length; i++) {
      mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
    }

    const npcDef = getNpcById(def.npcId)
    const npcName = npcDef?.name ?? def.npcId
    return { success: true, message: `接取了主线任务：${def.title}（${npcName}）` }
  }

  /** 每日更新主线任务进度 */
  const updateMainQuestProgress = () => {
    if (!mainQuest.value || !mainQuest.value.accepted) return

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return

    for (let i = 0; i < def.objectives.length; i++) {
      if (!mainQuest.value.objectiveProgress[i]) {
        mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
      }
    }
  }

  /** 检查主线任务是否可提交（实时评估未完成的目标） */
  const canSubmitMainQuest = (): boolean => {
    if (!mainQuest.value || !mainQuest.value.accepted) return false

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return false

    // 实时刷新未完成目标的进度，使 UI 同步显示最新状态
    for (let i = 0; i < def.objectives.length; i++) {
      if (!mainQuest.value.objectiveProgress[i]) {
        mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
      }
    }

    return mainQuest.value.objectiveProgress.every(p => p)
  }

  /** 提交主线任务 */
  const submitMainQuest = (): { success: boolean; message: string } => {
    if (!mainQuest.value || !mainQuest.value.accepted) {
      return { success: false, message: '没有可提交的主线任务。' }
    }

    const def = getStoryQuestById(mainQuest.value.questId)
    if (!def) return { success: false, message: '主线任务数据异常。' }
    const inventorySnapshot = inventoryStore.serialize()
    const rewardItems = (def.itemReward ?? []).map(item => ({ itemId: item.itemId, quantity: item.quantity, quality: 'normal' as const }))

    // 最终验证所有目标
    for (let i = 0; i < def.objectives.length; i++) {
      mainQuest.value.objectiveProgress[i] = evaluateObjective(def.objectives[i]!)
    }
    if (!mainQuest.value.objectiveProgress.every(p => p)) {
      return { success: false, message: '主线任务目标尚未全部完成。' }
    }

    // deliverItem 类型扣除背包物品
    for (const obj of def.objectives) {
      if (obj.type === 'deliverItem' && obj.itemId && obj.itemQuantity) {
        if (!inventoryStore.removeItemAnywhere(obj.itemId, obj.itemQuantity)) {
          inventoryStore.deserialize(inventorySnapshot)
          return { success: false, message: `背包中物品不足，无法提交。` }
        }
      }
    }

    if (rewardItems.length > 0 && !inventoryStore.canAddItems(rewardItems)) {
      inventoryStore.deserialize(inventorySnapshot)
      return { success: false, message: '请先整理背包，提交后腾出的空间仍不足以领取主线奖励。' }
    }

    // 发放铜钱奖励
    playerStore.earnMoney(def.moneyReward)

    // 发放好感奖励
    if (def.friendshipReward) {
      for (const fr of def.friendshipReward) {
        npcStore.adjustFriendship(fr.npcId, fr.amount)
      }
    }

    // 发放物品奖励
    if (def.itemReward) {
      inventoryStore.addItemsExact(rewardItems)
    }

    // 记录完成
    completedMainQuests.value.push(mainQuest.value.questId)
    mainQuest.value = null

    // 自动初始化下一个主线任务
    initMainQuest()

    const npcDef = getNpcById(def.npcId)
    const npcName = npcDef?.name ?? def.npcId
    let message = `【主线完成】${def.title}！${npcName}：获得${def.moneyReward}文。`
    if (def.itemReward && def.itemReward.length > 0) {
      message += ` 额外获得物品奖励。`
    }
    if (!mainQuest.value) {
      if (completedMainQuests.value.length >= STORY_QUESTS.length) {
        message += ` 恭喜！你已完成桃源乡全部主线任务！`
      }
    }

    return { success: true, message }
  }

  // ============================================================
  // 序列化
  // ============================================================

  const serialize = () => {
    return {
      boardQuests: boardQuests.value,
      activeQuests: activeQuests.value,
      completedQuestCount: completedQuestCount.value,
      specialOrder: specialOrder.value,
      specialOrderSettlementReceipts: specialOrderSettlementReceipts.value,
      recentSpecialOrderTagHistory: recentSpecialOrderTagHistory.value,
      weeklySpecialOrderState: weeklySpecialOrderState.value,
      activityQuestWindowState: activityQuestWindowState.value,
      mainQuest: mainQuest.value,
      completedMainQuests: completedMainQuests.value
    }
  }

  const normalizeStringArray = (input: unknown): string[] | undefined => {
    if (!Array.isArray(input)) return undefined
    const items = input.filter((value): value is string => typeof value === 'string')
    return items.length > 0 ? items : undefined
  }

  const normalizeDeliveryMode = (input: unknown): QuestDeliveryMode | undefined => {
    if (input === 'pond') return 'pond'
    if (input === 'inventory') return 'inventory'
    return undefined
  }

  const normalizeStagePhaseType = (input: unknown): SpecialOrderStageDef['phaseType'] => {
    if (input === 'prepare') return 'prepare'
    if (input === 'verify') return 'verify'
    if (input === 'display') return 'display'
    return 'deliver'
  }

  const normalizeComboRequirements = (input: unknown): SpecialOrderComboRequirement[] | undefined => {
    if (!Array.isArray(input)) return undefined

    const requirements = input
      .filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object' && typeof (entry as Record<string, any>).id === 'string')
      .map(requirement => ({
        id: requirement.id,
        itemId: typeof requirement.itemId === 'string' ? requirement.itemId : '',
        itemName: typeof requirement.itemName === 'string' ? requirement.itemName : typeof requirement.itemId === 'string' ? requirement.itemId : '未命名交付项',
        quantity: Math.max(1, Number(requirement.quantity) || 1),
        deliveryMode: normalizeDeliveryMode(requirement.deliveryMode),
        requiredHybridId: typeof requirement.requiredHybridId === 'string' ? requirement.requiredHybridId : undefined,
        requiredSweetnessMin: Number.isFinite(Number(requirement.requiredSweetnessMin)) ? Number(requirement.requiredSweetnessMin) : undefined,
        requiredYieldMin: Number.isFinite(Number(requirement.requiredYieldMin)) ? Number(requirement.requiredYieldMin) : undefined,
        requiredResistanceMin: Number.isFinite(Number(requirement.requiredResistanceMin)) ? Number(requirement.requiredResistanceMin) : undefined,
        requiredGenerationMin: Number.isFinite(Number(requirement.requiredGenerationMin)) ? Number(requirement.requiredGenerationMin) : undefined,
        requiredParentCropIds: normalizeStringArray(requirement.requiredParentCropIds),
        requiredPondGenerationMin: Number.isFinite(Number(requirement.requiredPondGenerationMin)) ? Number(requirement.requiredPondGenerationMin) : undefined,
        requiredFishMature: requirement.requiredFishMature === true ? true : undefined,
        requiredFishHealthy: requirement.requiredFishHealthy === true ? true : undefined,
        note: typeof requirement.note === 'string' ? requirement.note : undefined
      }))
      .filter(requirement => requirement.itemId.length > 0)

    return requirements.length > 0 ? requirements : undefined
  }

  const normalizeStageDefinitions = (input: unknown): SpecialOrderStageDef[] | undefined => {
    if (!Array.isArray(input)) return undefined

    const stages = input
      .filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object' && typeof (entry as Record<string, any>).id === 'string')
      .map(stage => ({
        id: stage.id,
        title: typeof stage.title === 'string' ? stage.title : stage.id,
        description: typeof stage.description === 'string' ? stage.description : '未命名阶段',
        phaseType: normalizeStagePhaseType(stage.phaseType),
        targetItemId: typeof stage.targetItemId === 'string' ? stage.targetItemId : undefined,
        targetItemName: typeof stage.targetItemName === 'string' ? stage.targetItemName : undefined,
        targetQuantity: Number.isFinite(Number(stage.targetQuantity)) ? Math.max(1, Number(stage.targetQuantity)) : undefined,
        deliveryMode: normalizeDeliveryMode(stage.deliveryMode),
        requirementSummary: normalizeStringArray(stage.requirementSummary),
        comboRequirements: normalizeComboRequirements(stage.comboRequirements),
        stageRewards:
          stage.stageRewards && typeof stage.stageRewards === 'object'
            ? {
                moneyReward: Number.isFinite(Number(stage.stageRewards.moneyReward)) ? Math.max(0, Number(stage.stageRewards.moneyReward)) : undefined,
                friendshipReward: Number.isFinite(Number(stage.stageRewards.friendshipReward)) ? Number(stage.stageRewards.friendshipReward) : undefined,
                itemReward: Array.isArray(stage.stageRewards.itemReward)
                  ? stage.stageRewards.itemReward
                      .filter((item: any) => item && typeof item.itemId === 'string')
                      .map((item: any) => ({ itemId: item.itemId, quantity: Math.max(1, Number(item.quantity) || 1) }))
                  : undefined,
                ticketReward:
                  stage.stageRewards.ticketReward && typeof stage.stageRewards.ticketReward === 'object'
                    ? Object.fromEntries(
                        Object.entries(stage.stageRewards.ticketReward)
                          .filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) > 0)
                          .map(([ticketType, amount]) => [ticketType, Math.max(0, Math.floor(Number(amount) || 0))])
                      )
                    : undefined,
                summary: typeof stage.stageRewards.summary === 'string' ? stage.stageRewards.summary : undefined
              }
            : undefined,
        nextStageTemplateId: typeof stage.nextStageTemplateId === 'string' ? stage.nextStageTemplateId : undefined
      }))

    return stages.length > 0 ? stages : undefined
  }

  const normalizeOrderScoreRule = (input: unknown): SpecialOrderScoreRule | undefined => {
    if (!input || typeof input !== 'object') return undefined
    const rule = input as Record<string, any>
    if (typeof rule.id !== 'string' || typeof rule.label !== 'string' || typeof rule.description !== 'string') return undefined

    const validRanks = ['C', 'B', 'A', 'S']
    const thresholds = Array.isArray(rule.thresholds)
      ? rule.thresholds
          .filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object' && validRanks.includes((entry as Record<string, any>).rank))
          .map(threshold => ({
            rank: threshold.rank,
            minScore: Math.max(0, Number(threshold.minScore) || 0),
            label: typeof threshold.label === 'string' ? threshold.label : threshold.rank,
            rewardMoneyMultiplier: Number.isFinite(Number(threshold.rewardMoneyMultiplier)) ? Number(threshold.rewardMoneyMultiplier) : undefined,
            rewardTicketMultiplier: Number.isFinite(Number(threshold.rewardTicketMultiplier)) ? Number(threshold.rewardTicketMultiplier) : undefined,
            summary: typeof threshold.summary === 'string' ? threshold.summary : undefined
          }))
      : []

    return {
      id: rule.id,
      label: rule.label,
      description: rule.description,
      factorSummary: normalizeStringArray(rule.factorSummary) ?? [],
      thresholds,
      previewText: typeof rule.previewText === 'string' ? rule.previewText : undefined
    }
  }

  const normalizeOrderProgressState = (input: unknown): SpecialOrderProgressState | undefined => {
    if (!input || typeof input !== 'object') return undefined
    const progress = input as Record<string, any>
    const validRanks = ['pending', 'C', 'B', 'A', 'S']
    const validStageResolutions = ['advanced', 'completed', 'failed']

    return {
      currentStageIndex: Math.max(0, Number(progress.currentStageIndex) || 0),
      completedStageIds: normalizeStringArray(progress.completedStageIds) ?? [],
      initialDaysRemaining: Math.max(1, Number(progress.initialDaysRemaining) || 1),
      currentScore: Number.isFinite(Number(progress.currentScore)) ? Number(progress.currentScore) : undefined,
      currentRank: validRanks.includes(progress.currentRank) ? progress.currentRank : undefined,
      stageProgress: Array.isArray(progress.stageProgress)
        ? progress.stageProgress
            .filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object' && typeof (entry as Record<string, any>).stageId === 'string')
            .map(stage => ({
              stageId: stage.stageId,
              completed: !!stage.completed,
              deliveredQuantity: Math.max(0, Number(stage.deliveredQuantity) || 0),
              rewardClaimed: stage.rewardClaimed === true ? true : undefined,
              phaseType: normalizeStagePhaseType(stage.phaseType),
              nextStageTemplateId: typeof stage.nextStageTemplateId === 'string' ? stage.nextStageTemplateId : undefined
            }))
        : undefined,
      stageHistory: Array.isArray(progress.stageHistory)
        ? progress.stageHistory
            .filter((entry): entry is Record<string, any> => !!entry && typeof entry === 'object' && typeof (entry as Record<string, any>).stageId === 'string')
            .map(entry => ({
              stageId: entry.stageId,
              phaseType: normalizeStagePhaseType(entry.phaseType),
              deliveredQuantity: Math.max(0, Number(entry.deliveredQuantity) || 0),
              resolution: validStageResolutions.includes(entry.resolution) ? entry.resolution : 'failed',
              summary: typeof entry.summary === 'string' ? entry.summary : undefined
            }))
        : undefined,
      settlementSummary:
        progress.settlementSummary && typeof progress.settlementSummary === 'object'
          ? {
              score: Math.max(0, Number(progress.settlementSummary.score) || 0),
              rank: validRanks.includes(progress.settlementSummary.rank) ? progress.settlementSummary.rank : 'pending',
              remainingDays: Math.max(0, Number(progress.settlementSummary.remainingDays) || 0),
              initialDaysRemaining: Math.max(1, Number(progress.settlementSummary.initialDaysRemaining) || 1),
              timelinessRatio: Math.max(0, Math.min(1, Number(progress.settlementSummary.timelinessRatio) || 0)),
              scoreBreakdown: normalizeStringArray(progress.settlementSummary.scoreBreakdown) ?? [],
              thresholdLabel: typeof progress.settlementSummary.thresholdLabel === 'string' ? progress.settlementSummary.thresholdLabel : undefined,
              thresholdSummary: typeof progress.settlementSummary.thresholdSummary === 'string' ? progress.settlementSummary.thresholdSummary : undefined
            } satisfies SpecialOrderSettlementSummary
          : undefined
    }
  }

  const normalizeWeeklySpecialOrderState = (input: unknown): WeeklySpecialOrderState => {
    if (!input || typeof input !== 'object') {
      return {
        lastRefreshWeekId: '',
        refreshMode: 'legacy'
      }
    }

    const state = input as Record<string, any>
    return {
      lastRefreshWeekId: typeof state.lastRefreshWeekId === 'string' ? state.lastRefreshWeekId : '',
      lastRefreshAbsoluteWeek: Number.isFinite(Number(state.lastRefreshAbsoluteWeek)) ? Math.max(0, Number(state.lastRefreshAbsoluteWeek)) : undefined,
      lastGeneratedOrderId: typeof state.lastGeneratedOrderId === 'string' ? state.lastGeneratedOrderId : undefined,
      refreshMode: state.refreshMode === 'weekly' ? 'weekly' : 'legacy'
    }
  }

  const normalizeQuestInstance = (raw: unknown): QuestInstance | null => {
    if (!raw || typeof raw !== 'object') return null
    const quest = raw as Record<string, any>
    if (typeof quest.id !== 'string' || typeof quest.npcId !== 'string' || typeof quest.targetItemId !== 'string') return null

    const validTypes = ['delivery', 'fishing', 'mining', 'gathering', 'special_order', 'cooking', 'errand', 'festival_prep']
    const validCategories = ['gathering', 'cooking', 'fishing', 'errand', 'festival_prep']
    const validStages = ['recognize', 'familiar', 'friend', 'bestie', 'romance', 'married', 'family']
    const normalizedDaysRemaining = Math.max(1, Number(quest.daysRemaining) || 1)
    const normalizedOrderProgressState = normalizeOrderProgressState(quest.orderProgressState)
    if (normalizedOrderProgressState && !Number.isFinite(Number(quest.orderProgressState?.initialDaysRemaining))) {
      normalizedOrderProgressState.initialDaysRemaining = normalizedDaysRemaining
    }
    if (
      normalizedOrderProgressState?.settlementSummary &&
      !Number.isFinite(Number(quest.orderProgressState?.settlementSummary?.initialDaysRemaining))
    ) {
      normalizedOrderProgressState.settlementSummary = {
        ...normalizedOrderProgressState.settlementSummary,
        initialDaysRemaining: Math.max(normalizedOrderProgressState.settlementSummary.remainingDays, normalizedDaysRemaining)
      }
    }

    return {
      id: quest.id,
      type: validTypes.includes(quest.type) ? quest.type : 'delivery',
      npcId: quest.npcId,
      npcName: typeof quest.npcName === 'string' ? quest.npcName : quest.npcId,
      description: typeof quest.description === 'string' ? quest.description : '未命名委托',
      targetItemId: quest.targetItemId,
      targetItemName: typeof quest.targetItemName === 'string' ? quest.targetItemName : quest.targetItemId,
      targetQuantity: Math.max(1, Number(quest.targetQuantity) || 1),
      collectedQuantity: Math.max(0, Number(quest.collectedQuantity) || 0),
      moneyReward: Math.max(0, Number(quest.moneyReward) || 0),
      friendshipReward: Number(quest.friendshipReward) || 0,
      daysRemaining: normalizedDaysRemaining,
      accepted: !!quest.accepted,
      sourceCategory: validCategories.includes(quest.sourceCategory) ? quest.sourceCategory : undefined,
      relationshipStageRequired: validStages.includes(quest.relationshipStageRequired) ? quest.relationshipStageRequired : undefined,
      itemReward: Array.isArray(quest.itemReward)
        ? quest.itemReward
            .filter((item: any) => item && typeof item.itemId === 'string')
            .map((item: any) => ({ itemId: item.itemId, quantity: Math.max(1, Number(item.quantity) || 1) }))
        : undefined,
      recipeReward: Array.isArray(quest.recipeReward) ? quest.recipeReward.filter((id: unknown) => typeof id === 'string') : undefined,
      ticketReward: quest.ticketReward && typeof quest.ticketReward === 'object'
        ? Object.fromEntries(
            Object.entries(quest.ticketReward)
              .filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) > 0)
              .map(([ticketType, amount]) => [ticketType, Math.max(0, Math.floor(Number(amount) || 0))])
          )
        : undefined,
      rewardProfileId: typeof quest.rewardProfileId === 'string' ? quest.rewardProfileId : undefined,
      buildingClueId: typeof quest.buildingClueId === 'string' ? quest.buildingClueId : undefined,
      buildingClueText: typeof quest.buildingClueText === 'string' ? quest.buildingClueText : undefined,
      bonusSummary: Array.isArray(quest.bonusSummary) ? quest.bonusSummary.filter((text: unknown) => typeof text === 'string') : undefined,
      tierLabel: typeof quest.tierLabel === 'string' ? quest.tierLabel : undefined,
      orderVersion: quest.orderVersion === '3.0' ? '3.0' : quest.orderVersion === '2.x' ? '2.x' : undefined,
      themeTag: quest.themeTag === 'breeding' || quest.themeTag === 'fishpond' ? quest.themeTag : undefined,
      activitySourceId: typeof quest.activitySourceId === 'string' ? quest.activitySourceId : undefined,
      activitySourceLabel: typeof quest.activitySourceLabel === 'string' ? quest.activitySourceLabel : undefined,
      orderStageType: quest.orderStageType === 'single' || quest.orderStageType === 'multi' || quest.orderStageType === 'combo' ? quest.orderStageType : undefined,
      stageDefinitions: normalizeStageDefinitions(quest.stageDefinitions),
      comboRequirements: normalizeComboRequirements(quest.comboRequirements),
      orderScoreRule: normalizeOrderScoreRule(quest.orderScoreRule),
      scoreHint: Array.isArray(quest.scoreHint) ? quest.scoreHint.filter((text: unknown) => typeof text === 'string') : undefined,
      antiRepeatTags: normalizeStringArray(quest.antiRepeatTags),
      antiRepeatCooldownWeeks: Number.isFinite(Number(quest.antiRepeatCooldownWeeks)) ? Math.max(1, Number(quest.antiRepeatCooldownWeeks)) : undefined,
      orderProgressState: normalizedOrderProgressState,
      deliverySourceHint: Array.isArray(quest.deliverySourceHint) ? quest.deliverySourceHint.filter((text: unknown) => typeof text === 'string') : undefined,
      demandHint: typeof quest.demandHint === 'string' ? quest.demandHint : undefined,
      recommendedHybridIds: Array.isArray(quest.recommendedHybridIds)
        ? quest.recommendedHybridIds.filter((id: unknown) => typeof id === 'string')
        : undefined,
      preferredSeasons: Array.isArray(quest.preferredSeasons)
        ? quest.preferredSeasons.filter((season: unknown) => typeof season === 'string') as Season[]
        : undefined,
      requirementSummary: Array.isArray(quest.requirementSummary)
        ? quest.requirementSummary.filter((text: unknown) => typeof text === 'string')
        : undefined,
      requiredHybridId: typeof quest.requiredHybridId === 'string' ? quest.requiredHybridId : undefined,
      requiredSweetnessMin: Number.isFinite(Number(quest.requiredSweetnessMin)) ? Number(quest.requiredSweetnessMin) : undefined,
      requiredYieldMin: Number.isFinite(Number(quest.requiredYieldMin)) ? Number(quest.requiredYieldMin) : undefined,
      requiredResistanceMin: Number.isFinite(Number(quest.requiredResistanceMin)) ? Number(quest.requiredResistanceMin) : undefined,
      requiredGenerationMin: Number.isFinite(Number(quest.requiredGenerationMin)) ? Number(quest.requiredGenerationMin) : undefined,
      requiredParentCropIds: Array.isArray(quest.requiredParentCropIds)
        ? quest.requiredParentCropIds.filter((id: unknown) => typeof id === 'string')
        : undefined,
      requiredCommercialTags: Array.isArray((quest as any).requiredCommercialTags)
        ? (quest as any).requiredCommercialTags.filter((tag: unknown) => typeof tag === 'string')
        : undefined,
      requiredBreedScoreMin: Number.isFinite(Number((quest as any).requiredBreedScoreMin)) ? Number((quest as any).requiredBreedScoreMin) : undefined,
      requiredStabilityRank:
        (quest as any).requiredStabilityRank === 'volatile' ||
        (quest as any).requiredStabilityRank === 'emerging' ||
        (quest as any).requiredStabilityRank === 'stable' ||
        (quest as any).requiredStabilityRank === 'certified'
          ? (quest as any).requiredStabilityRank
          : undefined,
      deliveryMode: normalizeDeliveryMode(quest.deliveryMode),
      requiredPondGenerationMin: Number.isFinite(Number(quest.requiredPondGenerationMin)) ? Number(quest.requiredPondGenerationMin) : undefined,
      requiredFishMature: quest.requiredFishMature === true ? true : undefined,
      requiredFishHealthy: quest.requiredFishHealthy === true ? true : undefined,
      isUrgent: quest.isUrgent === true ? true : undefined
    }
  }

  const getLimitedTimeQuestCampaignById = (campaignId: string) =>
    limitedTimeQuestCampaignDefs.find(campaign => campaign.id === campaignId) ?? null

  const currentLimitedTimeQuestCampaign = computed(() =>
    eventOperationTuning.featureFlags.activityQuestWindowEnabled && activityQuestWindowState.value.activeCampaignId
      ? getLimitedTimeQuestCampaignById(activityQuestWindowState.value.activeCampaignId)
      : null
  )

  const parseQuestDayTag = (dayTag?: string) => {
    if (!dayTag) return null
    const [yearText, seasonText, dayText] = dayTag.split('-')
    if (!yearText || !seasonText || !dayText) return null
    if (!['spring', 'summer', 'autumn', 'winter'].includes(seasonText)) return null
    const year = Number(yearText)
    const day = Number(dayText)
    if (!Number.isFinite(year) || !Number.isFinite(day)) return null
    return { year, season: seasonText as Season, day }
  }

  const getQuestAbsoluteDayFromTag = (dayTag?: string) => {
    const parsed = parseQuestDayTag(dayTag)
    if (!parsed) return null
    return getAbsoluteDay(parsed.year, parsed.season, parsed.day)
  }

  const addDaysToQuestDayTag = (dayTag: string, durationDays: number) => {
    const parsed = parseQuestDayTag(dayTag)
    if (!parsed) return dayTag
    const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter']
    let { year, season, day } = parsed
    let remaining = Math.max(1, Math.floor(durationDays))
    while (remaining > 0) {
      day += 1
      if (day > 28) {
        day = 1
        const nextSeasonIndex = (seasonOrder.indexOf(season) + 1) % seasonOrder.length
        if (nextSeasonIndex === 0) year += 1
        season = seasonOrder[nextSeasonIndex] ?? 'spring'
      }
      remaining -= 1
    }
    return `${year}-${season}-${day}`
  }

  const isQuestDayTagReachedOrPassed = (currentDayTag?: string, targetDayTag?: string) => {
    const currentAbsoluteDay = getQuestAbsoluteDayFromTag(currentDayTag)
    const targetAbsoluteDay = getQuestAbsoluteDayFromTag(targetDayTag)
    if (currentAbsoluteDay == null || targetAbsoluteDay == null) return false
    return currentAbsoluteDay >= targetAbsoluteDay
  }

  const currentLimitedTimeQuestRemainingDays = computed(() => {
    const campaign = currentLimitedTimeQuestCampaign.value
    if (!campaign) return 0
    const gameStore = useGameStore()
    const currentDayTag = `${gameStore.year}-${gameStore.season}-${gameStore.day}`
    const currentAbsoluteDay = getQuestAbsoluteDayFromTag(currentDayTag)
    const nextRefreshAbsoluteDay = getQuestAbsoluteDayFromTag(activityQuestWindowState.value.nextRefreshDayTag)
    if (currentAbsoluteDay == null || nextRefreshAbsoluteDay == null) return campaign.durationDays
    return Math.max(0, nextRefreshAbsoluteDay - currentAbsoluteDay)
  })

  const activityQuestWindowOverview = computed(() => ({
    activeCampaign: currentLimitedTimeQuestCampaign.value,
    state: activityQuestWindowState.value,
    specialOrder: specialOrder.value,
    boardHint: marketQuestBiasProfile.value.boardHint,
    specialOrderHint: marketQuestBiasProfile.value.specialOrderHint,
    remainingDays: currentLimitedTimeQuestRemainingDays.value
  }))

  const activateActivityQuestWindow = (campaignId: string, templateIds: string[], refreshDayTag: string, nextRefreshDayTag: string) => {
    const lockId = `activity_window_activate_${campaignId}`
    if (!beginActivityQuestWindowAction(lockId)) return false
    const snapshot = createActivityQuestWindowSnapshot()
    try {
    const campaign = getLimitedTimeQuestCampaignById(campaignId)
    if (!campaign) return false
    activityQuestWindowState.value = {
      version: activityQuestWindowState.value.version,
      activeCampaignId: campaignId,
      activeQuestTemplateIds: [...templateIds],
      lastRefreshDayTag: refreshDayTag,
      nextRefreshDayTag,
      completedWindowIds: activityQuestWindowState.value.completedWindowIds,
      claimedRewardMailIds: activityQuestWindowState.value.claimedRewardMailIds
    }
    return true
    } catch {
      rollbackActivityQuestWindow(snapshot)
      return false
    } finally {
      finishActivityQuestWindowAction(lockId)
    }
  }

  const completeActivityQuestWindow = (
    campaignId = activityQuestWindowState.value.activeCampaignId ?? '',
    completionScopeKey = ''
  ) => {
    const lockId = `activity_window_complete_${campaignId}`
    if (!beginActivityQuestWindowAction(lockId)) return false
    const snapshot = createActivityQuestWindowSnapshot()
    try {
    if (!campaignId) return false
    const completionKey = buildActivityQuestWindowCompletionKey(
      campaignId,
      completionScopeKey || activityQuestWindowState.value.lastRefreshDayTag || 'legacy'
    )
    activityQuestWindowState.value = {
      ...activityQuestWindowState.value,
      activeCampaignId: activityQuestWindowState.value.activeCampaignId === campaignId ? null : activityQuestWindowState.value.activeCampaignId,
      activeQuestTemplateIds: activityQuestWindowState.value.activeCampaignId === campaignId ? [] : activityQuestWindowState.value.activeQuestTemplateIds,
      lastRefreshDayTag: activityQuestWindowState.value.activeCampaignId === campaignId ? '' : activityQuestWindowState.value.lastRefreshDayTag,
      nextRefreshDayTag: activityQuestWindowState.value.activeCampaignId === campaignId ? '' : activityQuestWindowState.value.nextRefreshDayTag,
      completedWindowIds: activityQuestWindowState.value.completedWindowIds.includes(completionKey)
        ? activityQuestWindowState.value.completedWindowIds
        : [...activityQuestWindowState.value.completedWindowIds, completionKey]
    }
    return true
    } catch {
      rollbackActivityQuestWindow(snapshot)
      return false
    } finally {
      finishActivityQuestWindowAction(lockId)
    }
  }

  const markActivityRewardMailClaimed = (mailId: string) => {
    const lockId = `activity_window_mail_${mailId}`
    if (!beginActivityQuestWindowAction(lockId)) return false
    try {
    if (!mailId || activityQuestWindowState.value.claimedRewardMailIds.includes(mailId)) return false
    activityQuestWindowState.value = {
      ...activityQuestWindowState.value,
      claimedRewardMailIds: [...activityQuestWindowState.value.claimedRewardMailIds, mailId]
    }
    return true
    } finally {
      finishActivityQuestWindowAction(lockId)
    }
  }

  const getActivityQuestWindowDebugSnapshot = () => ({
    activeCampaignId: activityQuestWindowState.value.activeCampaignId,
    activeQuestTemplateIds: activityQuestWindowState.value.activeQuestTemplateIds,
    completedWindowIds: activityQuestWindowState.value.completedWindowIds,
    claimedRewardMailIds: activityQuestWindowState.value.claimedRewardMailIds,
    specialOrderId: specialOrder.value?.id ?? null
  })

  const processActivityQuestWindowTick = (payload: {
    currentDayTag: string
    currentWeekId: string
    startedNewWeek: boolean
    activeEventCampaignId: string | null
  }) => {
    if (!eventOperationTuning.featureFlags.activityQuestWindowEnabled) {
      return {
        logs: [] as string[],
        activeCampaignId: null,
        activeQuestTemplateIds: [] as string[]
      }
    }
    const lockId = `activity_window_tick_${payload.currentWeekId}_${payload.currentDayTag}`
    if (!beginActivityQuestWindowAction(lockId)) {
      return {
        logs: [] as string[],
        activeCampaignId: activityQuestWindowState.value.activeCampaignId,
        activeQuestTemplateIds: activityQuestWindowState.value.activeQuestTemplateIds
      }
    }
    const snapshot = createActivityQuestWindowSnapshot()
    try {
    const logs: string[] = []
    const matchedCampaign =
      payload.activeEventCampaignId
        ? limitedTimeQuestCampaignDefs.find(campaign => campaign.linkedCampaignId === payload.activeEventCampaignId) ?? null
        : null

    if (
      activityQuestWindowState.value.activeCampaignId &&
      (!matchedCampaign || matchedCampaign.id !== activityQuestWindowState.value.activeCampaignId)
    ) {
      completeActivityQuestWindow(activityQuestWindowState.value.activeCampaignId, payload.currentWeekId)
      logs.push('【活动任务】当前限时任务窗口已结束。')
    }

    if (
      activityQuestWindowState.value.activeCampaignId &&
      isQuestDayTagReachedOrPassed(payload.currentDayTag, activityQuestWindowState.value.nextRefreshDayTag)
    ) {
      completeActivityQuestWindow(activityQuestWindowState.value.activeCampaignId, payload.currentWeekId)
      logs.push('【活动任务】限时任务窗口已按时收束。')
    }

    if (
      matchedCampaign &&
      activityQuestWindowState.value.activeCampaignId !== matchedCampaign.id &&
      !activityQuestWindowState.value.completedWindowIds.includes(buildActivityQuestWindowCompletionKey(matchedCampaign.id, payload.currentWeekId))
    ) {
      activateActivityQuestWindow(
        matchedCampaign.id,
        [matchedCampaign.activitySourceId],
        payload.currentDayTag,
        addDaysToQuestDayTag(payload.currentDayTag, matchedCampaign.durationDays)
      )
      logs.push(`【活动任务】限时窗口已切换为「${matchedCampaign.label}」。`)
    }

    return {
      logs,
      activeCampaignId: activityQuestWindowState.value.activeCampaignId,
      activeQuestTemplateIds: activityQuestWindowState.value.activeQuestTemplateIds
    }
    } catch {
      rollbackActivityQuestWindow(snapshot)
      return {
        logs: ['【活动任务】限时任务窗口切换异常，已回滚到上一状态。'],
        activeCampaignId: activityQuestWindowState.value.activeCampaignId,
        activeQuestTemplateIds: activityQuestWindowState.value.activeQuestTemplateIds
      }
    } finally {
      finishActivityQuestWindowAction(lockId)
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    boardQuests.value = (Array.isArray(data?.boardQuests) ? data.boardQuests : []).map(normalizeQuestInstance).filter((quest): quest is QuestInstance => quest !== null)
    activeQuests.value = (Array.isArray(data?.activeQuests) ? data.activeQuests : []).map(normalizeQuestInstance).filter((quest): quest is QuestInstance => quest !== null)
    completedQuestCount.value = data.completedQuestCount ?? 0
    specialOrder.value = normalizeQuestInstance((data as Record<string, unknown>).specialOrder ?? null)
    specialOrderSettlementReceipts.value = normalizeStringArray((data as Record<string, unknown>).specialOrderSettlementReceipts) ?? []
    recentSpecialOrderTagHistory.value = normalizeStringArray((data as Record<string, unknown>).recentSpecialOrderTagHistory) ?? []
    weeklySpecialOrderState.value = normalizeWeeklySpecialOrderState((data as Record<string, unknown>).weeklySpecialOrderState)
    activityQuestWindowState.value = (() => {
      const raw = (data as Record<string, unknown>).activityQuestWindowState as Record<string, any> | undefined
      if (!raw || typeof raw !== 'object') return createDefaultActivityQuestWindowState()
      return {
        version: Math.max(1, Number(raw.version) || 1),
        activeCampaignId: typeof raw.activeCampaignId === 'string' ? raw.activeCampaignId : null,
        activeQuestTemplateIds: normalizeStringArray(raw.activeQuestTemplateIds) ?? [],
        lastRefreshDayTag: typeof raw.lastRefreshDayTag === 'string' ? raw.lastRefreshDayTag : '',
        nextRefreshDayTag: typeof raw.nextRefreshDayTag === 'string' ? raw.nextRefreshDayTag : '',
        completedWindowIds: (normalizeStringArray(raw.completedWindowIds) ?? []).map(entry =>
          entry.includes('@') ? entry : buildActivityQuestWindowCompletionKey(entry, 'legacy')
        ),
        claimedRewardMailIds: normalizeStringArray(raw.claimedRewardMailIds) ?? []
      }
    })()
    activityQuestWindowLocks.value = []
    questSubmissionLocks.value = []
    lastSpecialOrderGenerationTrace.value = null
    mainQuest.value = (() => {
      const rawMainQuest = (data as Record<string, unknown>).mainQuest as Record<string, any> | null | undefined
      if (!rawMainQuest || typeof rawMainQuest !== 'object' || typeof rawMainQuest.questId !== 'string') return null
      const normalized = {
        questId: rawMainQuest.questId,
        accepted: !!rawMainQuest.accepted,
        objectiveProgress: Array.isArray(rawMainQuest.objectiveProgress)
          ? rawMainQuest.objectiveProgress.map((progress: unknown) => !!progress)
          : []
      } as MainQuestState
      return getStoryQuestById(normalized.questId) ? normalized : null
    })()
    completedMainQuests.value = Array.isArray((data as Record<string, unknown>).completedMainQuests)
      ? ((data as Record<string, unknown>).completedMainQuests as unknown[]).filter((id): id is string => typeof id === 'string')
      : []
    // 加载后初始化主线任务（兼容旧存档）
    initMainQuest()
    if ((data as Record<string, unknown>).completedQuestCount === undefined) {
      const completedStoryQuestIds = new Set(completedMainQuests.value)
      const inferredCompletedQuestCount = STORY_QUESTS.reduce((maxCount, quest) => {
        if (!completedStoryQuestIds.has(quest.id)) return maxCount
        const questTarget = quest.objectives
          .filter(objective => objective.type === 'completeQuests')
          .reduce((innerMax, objective) => Math.max(innerMax, objective.target ?? 0), 0)
        return Math.max(maxCount, questTarget)
      }, 0)
      completedQuestCount.value = Math.max(completedQuestCount.value, inferredCompletedQuestCount)
    }
  }

  return {
    boardQuests,
    activeQuests,
    completedQuestCount,
    specialOrder,
    lastSpecialOrderGenerationTrace,
    activityQuestWindowState,
    limitedTimeQuestCampaignDefs,
    currentLimitedTimeQuestCampaign,
    currentLimitedTimeQuestRemainingDays,
    activityQuestWindowOverview,
    mainQuest,
    completedMainQuests,
    MAX_ACTIVE_QUESTS,
    generateDailyQuests,
    generateSpecialOrder,
    processSpecialOrderWeeklyRefresh,
    getSpecialOrderBaseline,
    marketQuestBiasProfile,
    getLimitedTimeQuestCampaignById,
    activateActivityQuestWindow,
    completeActivityQuestWindow,
    markActivityRewardMailClaimed,
    getActivityQuestWindowDebugSnapshot,
    processActivityQuestWindowTick,
    isWeeklySpecialOrderRefreshActive,
    acceptQuest,
    acceptSpecialOrder,
    submitQuest,
    getQuestEffectiveProgress,
    canSubmitQuest,
    onItemObtained,
    dailyUpdate,
    hasActiveQuestFor,
    initMainQuest,
    acceptMainQuest,
    updateMainQuestProgress,
    canSubmitMainQuest,
    submitMainQuest,
    serialize,
    deserialize
  }
})
