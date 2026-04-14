import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import CryptoJS from 'crypto-js'
import { saveAs } from 'file-saver'
import { useGameStore, SEASON_NAMES } from './useGameStore'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useFarmStore } from './useFarmStore'
import { useSkillStore } from './useSkillStore'
import { useNpcStore } from './useNpcStore'
import { useMiningStore } from './useMiningStore'
import { useCookingStore } from './useCookingStore'
import { useProcessingStore } from './useProcessingStore'
import { useAchievementStore } from './useAchievementStore'
import { useAnimalStore } from './useAnimalStore'
import { useHomeStore } from './useHomeStore'
import { useFishingStore } from './useFishingStore'
import { useGoalStore } from './useGoalStore'
import { useWalletStore } from './useWalletStore'
import { useQuestStore } from './useQuestStore'
import { useShopStore } from './useShopStore'
import { useSettingsStore } from './useSettingsStore'
import { useWarehouseStore } from './useWarehouseStore'
import { useBreedingStore } from './useBreedingStore'
import { useMuseumStore } from './useMuseumStore'
import { useGuildStore } from './useGuildStore'
import { useSecretNoteStore } from './useSecretNoteStore'
import { useHanhaiStore } from './useHanhaiStore'
import { useFishPondStore } from './useFishPondStore'
import { useTutorialStore } from './useTutorialStore'
import { useHiddenNpcStore } from './useHiddenNpcStore'
import { useDecorationStore } from './useDecorationStore'
import { useVillageProjectStore } from './useVillageProjectStore'
import { BUILT_IN_SAMPLE_SAVES, type BuiltInSampleSaveDef } from '@/data/sampleSaves'
import { createDefaultMarketDynamicsState } from '@/data/market'
import { createDefaultShopCatalogExpansionState } from '@/data/shopCatalog'
import { createDefaultMuseumSaveData as createDefaultMuseumPayload } from '@/data/museum'
import {
  WS12_AUTOMATED_REGRESSION_SUITES,
  WS12_COMPENSATION_MAIL_PRESETS,
  WS12_QA_GOVERNANCE_BASELINE_AUDIT,
  WS12_QA_GOVERNANCE_LOOP_LINK_DEFS,
  WS12_QA_GOVERNANCE_CONTENT_TIERS,
  WS12_QA_GOVERNANCE_FEATURE_FLAGS,
  WS12_QA_GOVERNANCE_TUNING_CONFIG,
  WS12_SAVE_MIGRATION_PROFILES
} from '@/data/goals'
import { buildScopedStorageKey, getStoredSaveMode, migrateLegacyScopedSlots, setStoredSaveMode, type SaveMode } from '@/utils/accountStorage'
import { deleteServerSlotRaw, fetchServerSlotRaw, fetchServerSlots, saveServerSlotRaw, setServerActiveSlot } from '@/utils/serverSaveApi'

const LEGACY_SAVE_KEY_PREFIX = 'taoyuanxiang_save_'
const MAX_SLOTS = 3
const ENCRYPTION_KEY = 'taoyuanxiang_2024_secret'
const SAVE_FILE_EXT = '.tyx'
const SAVE_VERSION = 3

interface SaveMeta {
  saveVersion: number
  savedAt: string
}

interface SaveEnvelope {
  meta: SaveMeta
  data: Record<string, any>
}

const getSaveKeyPrefix = (): string => buildScopedStorageKey(LEGACY_SAVE_KEY_PREFIX)

const getSaveKey = (slot: number): string => {
  const scopedPrefix = getSaveKeyPrefix()
  migrateLegacyScopedSlots(LEGACY_SAVE_KEY_PREFIX, scopedPrefix, MAX_SLOTS)
  return `${scopedPrefix}${slot}`
}

/** 加密 JSON 字符串 */
const encrypt = (json: string): string => {
  return CryptoJS.AES.encrypt(json, ENCRYPTION_KEY).toString()
}

/** 解密为 JSON 字符串，失败返回 null */
const decrypt = (cipher: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY)
    const result = bytes.toString(CryptoJS.enc.Utf8)
    return result || null
  } catch {
    return null
  }
}

/** 解密并解析存档数据 */
export const parseSaveData = (raw: string): Record<string, any> | null => {
  const decrypted = decrypt(raw)
  if (!decrypted) return null
  try {
    return JSON.parse(decrypted) as Record<string, any>
  } catch {
    return null
  }
}

export interface SaveSlotInfo {
  slot: number
  exists: boolean
  year?: number
  season?: string
  day?: number
  money?: number
  playerName?: string
  savedAt?: string
}

export interface BuiltInSampleSaveInfo {
  id: string
  label: string
  description: string
  tags: string[]
}

const buildSaveMeta = (savedAt?: string, saveVersion: number = SAVE_VERSION): SaveMeta => ({
  saveVersion,
  savedAt: savedAt ?? new Date().toISOString()
})

const migrateSavePayload = (payload: Record<string, any>, _saveVersion: number): Record<string, any> => {
  const next = { ...payload }
  const saveVersion = Math.max(1, Number(_saveVersion) || 1)

  if (saveVersion < 3 && next.player && typeof next.player === 'object') {
    next.player = {
      ...next.player,
      qaGovernanceRuntimeState: next.player.qaGovernanceRuntimeState ?? undefined
    }
  }

  if (!next.wallet || typeof next.wallet !== 'object') {
    next.wallet = {
      unlockedItems: [],
      currentArchetypeId: null,
      unlockedNodeIds: [],
      rewardTickets: {}
    }
  } else {
    next.wallet = {
      unlockedItems: Array.isArray(next.wallet.unlockedItems) ? next.wallet.unlockedItems : [],
      currentArchetypeId: next.wallet.currentArchetypeId ?? null,
      unlockedNodeIds: Array.isArray(next.wallet.unlockedNodeIds) ? next.wallet.unlockedNodeIds : [],
      rewardTickets: next.wallet.rewardTickets ?? {}
    }
  }

  if (!next.goal || typeof next.goal !== 'object') {
    next.goal = {
      mainQuestStage: 1,
      mainQuestStages: [],
      dailyGoals: [],
      seasonGoals: [],
      weeklyGoals: [],
      longTermGoals: [],
      goalReputation: 0,
      lastDailyGoalRefresh: '',
      lastSeasonGoalRefresh: '',
      lastWeeklyGoalRefresh: '',
      lastThemeWeekRefresh: '',
      currentThemeWeekState: null,
      lastWeeklyGoalSettlement: null,
      lastSettledWeeklyGoalWeekId: '',
      weeklyStreakState: {
        current: 0,
        best: 0,
        lastCompletedWeekId: '',
        lastSettledWeekId: '',
        lastOutcome: 'idle'
      },
      sentWeeklySettlementMailWeekIds: [],
      eventOperationsState: {
        version: 1,
        activeCampaignId: null,
        activeThemeWeekCampaignId: null,
        cadence: 'weekly',
        completedCampaignIds: [],
        completedThemeWeekIds: [],
        claimedMailCampaignIds: [],
        claimedMailReceiptKeys: [],
        lastCampaignDayTag: '',
        lastSettlementDayTag: ''
      },
      weeklyMetricArchive: {
        version: 1,
        lastGeneratedWeekId: '',
        snapshots: []
      }
    }
  }

  if (!next.museum || typeof next.museum !== 'object') {
    next.museum = createDefaultMuseumPayload()
  } else {
    const defaults = createDefaultMuseumPayload()
    next.museum = {
      ...next.museum,
      saveVersion: next.museum.saveVersion ?? defaults.saveVersion,
      donatedItems: next.museum.donatedItems ?? defaults.donatedItems,
      claimedMilestones: next.museum.claimedMilestones ?? defaults.claimedMilestones,
      exhibitSlotStates: next.museum.exhibitSlotStates ?? defaults.exhibitSlotStates,
      hallProgress: next.museum.hallProgress ?? defaults.hallProgress,
      scholarCommissionStates: next.museum.scholarCommissionStates ?? defaults.scholarCommissionStates,
      shrineThemeState: next.museum.shrineThemeState ?? defaults.shrineThemeState,
      telemetry: next.museum.telemetry ?? defaults.telemetry,
      unlockedExhibitSlotIds: next.museum.unlockedExhibitSlotIds ?? []
    }
  }

  if (!next.villageProject || typeof next.villageProject !== 'object') {
    next.villageProject = {
      saveVersion: 2,
      projectStates: {},
      maintenanceStates: {},
      donationStates: {}
    }
  } else {
    next.villageProject = {
      saveVersion: next.villageProject.saveVersion ?? 2,
      projectStates: next.villageProject.projectStates ?? {},
      maintenanceStates: next.villageProject.maintenanceStates ?? {},
      donationStates: next.villageProject.donationStates ?? {}
    }
  }

  if (!next.tutorial || typeof next.tutorial !== 'object') {
    next.tutorial = {
      enabled: true,
      shownTipIds: [],
      visitedPanels: [],
      flags: {},
      guidanceDigestState: {
        version: 2,
        activeSummaryIds: [],
        activeRouteIds: [],
        dismissedSummaryIds: [],
        adoptedSummaryIds: [],
        adoptedRouteIds: [],
        lastRefreshDayTag: '',
        currentThemeWeekId: null,
        currentCampaignId: null,
        lastViewedSurfaceId: null,
        surfaceStates: []
      }
    }
  } else {
    next.tutorial = {
      enabled: next.tutorial.enabled ?? true,
      shownTipIds: Array.isArray(next.tutorial.shownTipIds) ? next.tutorial.shownTipIds : [],
      visitedPanels: Array.isArray(next.tutorial.visitedPanels) ? next.tutorial.visitedPanels : [],
      flags: next.tutorial.flags ?? {},
      guidanceDigestState: next.tutorial.guidanceDigestState ?? {
        version: 2,
        activeSummaryIds: [],
        activeRouteIds: [],
        dismissedSummaryIds: [],
        adoptedSummaryIds: [],
        adoptedRouteIds: [],
        lastRefreshDayTag: '',
        currentThemeWeekId: null,
        currentCampaignId: null,
        lastViewedSurfaceId: null,
        surfaceStates: []
      }
    }
  }

  if (next.npc && typeof next.npc === 'object') {
    next.npc = {
      npcStates: next.npc.npcStates ?? [],
      relationshipClues: next.npc.relationshipClues ?? [],
      children: next.npc.children ?? [],
      nextChildId: next.npc.nextChildId ?? undefined,
      daysMarried: next.npc.daysMarried ?? 0,
      daysZhiji: next.npc.daysZhiji ?? 0,
      pregnancy: next.npc.pregnancy ?? null,
      childProposalPending: next.npc.childProposalPending ?? false,
      childProposalDeclinedCount: next.npc.childProposalDeclinedCount ?? 0,
      daysSinceProposalDecline: next.npc.daysSinceProposalDecline ?? 0,
      pendingChild: next.npc.pendingChild ?? false,
      childCountdown: next.npc.childCountdown ?? 0,
      weddingCountdown: next.npc.weddingCountdown ?? 0,
      weddingNpcId: next.npc.weddingNpcId ?? null,
      hiredHelpers: next.npc.hiredHelpers ?? [],
      friendshipVersion: next.npc.friendshipVersion
    }
  }

  if (next.quest && typeof next.quest === 'object') {
    next.quest = {
      boardQuests: next.quest.boardQuests ?? [],
      activeQuests: next.quest.activeQuests ?? [],
      completedQuestCount: next.quest.completedQuestCount ?? 0,
      specialOrder: next.quest.specialOrder ?? null,
      activityQuestWindowState: next.quest.activityQuestWindowState ?? {
        version: 1,
        activeCampaignId: null,
        activeQuestTemplateIds: [],
        lastRefreshDayTag: '',
        nextRefreshDayTag: '',
        completedWindowIds: [],
        claimedRewardMailIds: []
      },
      mainQuest: next.quest.mainQuest ?? null,
      completedMainQuests: next.quest.completedMainQuests ?? []
    }
  }

  if (!next.shop || typeof next.shop !== 'object') {
    next.shop = {
      ownedCatalogOfferIds: [],
      catalogExpansionState: createDefaultShopCatalogExpansionState(),
      travelingStockKey: '',
      travelingStock: [],
      shippingBox: [],
      shippedItems: [],
      shippingHistory: {},
      marketDynamics: createDefaultMarketDynamicsState()
    }
  } else {
    next.shop = {
      ownedCatalogOfferIds: next.shop.ownedCatalogOfferIds ?? [],
      catalogExpansionState: next.shop.catalogExpansionState ?? createDefaultShopCatalogExpansionState(),
      travelingStockKey: next.shop.travelingStockKey ?? '',
      travelingStock: next.shop.travelingStock ?? [],
      shippingBox: next.shop.shippingBox ?? [],
      shippedItems: next.shop.shippedItems ?? [],
      shippingHistory: next.shop.shippingHistory ?? {},
      marketDynamics: next.shop.marketDynamics ?? createDefaultMarketDynamicsState()
    }
  }

  if (!next.guild || typeof next.guild !== 'object') {
    next.guild = {
      monsterKills: {},
      claimedGoals: [],
      encounteredMonsters: [],
      contributionPoints: 0,
      guildExp: 0,
      guildLevel: 0,
      dailyPurchases: {},
      lastResetDay: -1,
      weeklyPurchases: {},
      lastResetWeek: -1,
      totalPurchases: {},
      seasonState: {
        saveVersion: 1,
        currentSeasonId: '',
        currentPhase: 'p0_commission',
        asyncRankScore: 0,
        rankBand: 'novice',
        lastSnapshotWeekId: '',
        snapshots: []
      }
    }
  } else {
    next.guild = {
      monsterKills: next.guild.monsterKills ?? {},
      claimedGoals: next.guild.claimedGoals ?? [],
      encounteredMonsters: next.guild.encounteredMonsters ?? [],
      contributionPoints: next.guild.contributionPoints ?? 0,
      guildExp: next.guild.guildExp ?? 0,
      guildLevel: next.guild.guildLevel ?? 0,
      dailyPurchases: next.guild.dailyPurchases ?? {},
      lastResetDay: next.guild.lastResetDay ?? -1,
      weeklyPurchases: next.guild.weeklyPurchases ?? {},
      lastResetWeek: next.guild.lastResetWeek ?? -1,
      totalPurchases: next.guild.totalPurchases ?? {},
      seasonState: {
        saveVersion: next.guild.seasonState?.saveVersion ?? 1,
        currentSeasonId: next.guild.seasonState?.currentSeasonId ?? '',
        currentPhase: next.guild.seasonState?.currentPhase ?? 'p0_commission',
        asyncRankScore: next.guild.seasonState?.asyncRankScore ?? 0,
        rankBand: next.guild.seasonState?.rankBand ?? 'novice',
        lastSnapshotWeekId: next.guild.seasonState?.lastSnapshotWeekId ?? '',
        snapshots: next.guild.seasonState?.snapshots ?? []
      }
    }
  }

  if (!next.hanhai || typeof next.hanhai !== 'object') {
    next.hanhai = {
      unlocked: false,
      casinoBetsToday: 0,
      weeklyPurchases: {},
      relicRecords: {},
      cycleState: {
        saveVersion: 1,
        progressTier: 'P0',
        routeInvestments: {},
        setCollections: {},
        bossCycleId: '',
        lastWeeklyResetDayTag: ''
      }
    }
  } else {
    next.hanhai = {
      unlocked: next.hanhai.unlocked ?? false,
      casinoBetsToday: next.hanhai.casinoBetsToday ?? 0,
      weeklyPurchases: next.hanhai.weeklyPurchases ?? {},
      relicRecords: next.hanhai.relicRecords ?? {},
      cycleState: {
        saveVersion: next.hanhai.cycleState?.saveVersion ?? 1,
        progressTier: next.hanhai.cycleState?.progressTier ?? 'P0',
        routeInvestments: next.hanhai.cycleState?.routeInvestments ?? {},
        setCollections: next.hanhai.cycleState?.setCollections ?? {},
        bossCycleId: next.hanhai.cycleState?.bossCycleId ?? '',
        lastWeeklyResetDayTag: next.hanhai.cycleState?.lastWeeklyResetDayTag ?? ''
      }
    }
  }

  if (!next.settings || typeof next.settings !== 'object') {
    next.settings = {}
  }

  return next
}

const normalizeSaveEnvelope = (raw: Record<string, any>): SaveEnvelope | null => {
  if (!raw || typeof raw !== 'object') return null

  const metaLike = raw.meta && typeof raw.meta === 'object' ? raw.meta : undefined
  const hasEnvelopeData = raw.data && typeof raw.data === 'object'
  const saveVersion = Number(metaLike?.saveVersion ?? raw.saveVersion ?? (hasEnvelopeData ? SAVE_VERSION : 1))
  const savedAt = String(metaLike?.savedAt ?? raw.savedAt ?? raw.data?.savedAt ?? new Date().toISOString())

  if (hasEnvelopeData) {
    return {
      meta: buildSaveMeta(savedAt, Number.isFinite(saveVersion) ? saveVersion : SAVE_VERSION),
      data: migrateSavePayload(raw.data as Record<string, any>, saveVersion)
    }
  }

  return {
    meta: buildSaveMeta(savedAt, Number.isFinite(saveVersion) ? saveVersion : 1),
    data: migrateSavePayload(raw, saveVersion)
  }
}
export const useSaveStore = defineStore('save', () => {
  /** 当前活跃存档槽位（-1 表示未分配） */
  const activeSlot = ref(-1)
  /** 当前活跃存档槽位所属模式，用于防止切换存储介质后误写入 */
  const activeSlotMode = ref<SaveMode | null>(null)
  const activeSlotsByMode = ref<Record<SaveMode, number>>({
    local: -1,
    server: -1
  })
  const storageMode = ref<SaveMode>(getStoredSaveMode())
  const qaGovernanceBaselineAudit = WS12_QA_GOVERNANCE_BASELINE_AUDIT
  const qaGovernanceStorageActionLocks = ref<string[]>([])
  const qaGovernanceTuning = WS12_QA_GOVERNANCE_TUNING_CONFIG

  const setStorageMode = (mode: SaveMode) => {
    storageMode.value = mode
    setStoredSaveMode(mode)
    activeSlot.value = activeSlotsByMode.value[mode] ?? -1
    activeSlotMode.value = activeSlot.value >= 0 ? mode : null
  }

  const createQaGovernanceStorageSnapshot = () => ({
    storageMode: storageMode.value,
    activeSlot: activeSlot.value,
    activeSlotMode: activeSlotMode.value,
    activeSlotsByMode: { ...activeSlotsByMode.value }
  })

  const rollbackQaGovernanceStorage = (snapshot: ReturnType<typeof createQaGovernanceStorageSnapshot>) => {
    storageMode.value = snapshot.storageMode
    activeSlot.value = snapshot.activeSlot
    activeSlotMode.value = snapshot.activeSlotMode
    activeSlotsByMode.value = { ...snapshot.activeSlotsByMode }
  }

  const beginQaGovernanceStorageAction = (lockId: string) => {
    if (qaGovernanceStorageActionLocks.value.includes(lockId)) return false
    qaGovernanceStorageActionLocks.value = [...qaGovernanceStorageActionLocks.value, lockId]
    return true
  }

  const finishQaGovernanceStorageAction = (lockId: string) => {
    qaGovernanceStorageActionLocks.value = qaGovernanceStorageActionLocks.value.filter(id => id !== lockId)
  }

  const createEmptySlots = (): SaveSlotInfo[] => Array.from({ length: MAX_SLOTS }, (_, slot) => ({ slot, exists: false }))

  const parseSlotInfo = (slot: number, raw: string | null): SaveSlotInfo => {
    if (!raw) return { slot, exists: false }
    const parsed = parseSaveData(raw)
    const normalized = parsed ? normalizeSaveEnvelope(parsed) : null
    if (!normalized) return { slot, exists: false }
    return {
      slot,
      exists: true,
      year: normalized.data.game?.year,
      season: normalized.data.game?.season,
      day: normalized.data.game?.day,
      money: normalized.data.player?.money,
      playerName: normalized.data.player?.playerName,
      savedAt: normalized.meta.savedAt
    }
  }

  const qaGovernanceOverview = computed(() => {
    const playerStore = usePlayerStore()
    return {
      baselineAudit: qaGovernanceBaselineAudit,
      featureFlags: WS12_QA_GOVERNANCE_FEATURE_FLAGS,
      contentTiers: WS12_QA_GOVERNANCE_CONTENT_TIERS,
      tuning: qaGovernanceTuning,
      saveVersion: SAVE_VERSION,
      maxSlots: MAX_SLOTS,
      storageMode: storageMode.value,
      activeSlot: activeSlot.value,
      activeSlotMode: activeSlotMode.value,
      builtInSampleSaveCount: BUILT_IN_SAMPLE_SAVES.length,
      migrationProfileCount: WS12_SAVE_MIGRATION_PROFILES.length,
      regressionSuiteCount: WS12_AUTOMATED_REGRESSION_SUITES.length,
      compensationPresetCount: WS12_COMPENSATION_MAIL_PRESETS.length,
      supportsEncryptedTransfer: true,
      supportsModeSwitch: true,
      runtimeState: playerStore.qaGovernanceRuntimeState,
      telemetrySaveVersion: playerStore.economyTelemetry.saveVersion,
      lastAuditDayTag: playerStore.economyTelemetry.lastAuditDayTag
    }
  })

  const qaGovernanceCrossSystemOverview = computed(() => {
    const playerStore = usePlayerStore()
    const questStore = useQuestStore()
    const processingStore = useProcessingStore()
    const villageProjectStore = useVillageProjectStore()
    const museumStore = useMuseumStore()
    const goalStore = useGoalStore()

    const loops = WS12_QA_GOVERNANCE_LOOP_LINK_DEFS.map(def => {
      let active = false
      let evidence = ''

      switch (def.id) {
        case 'ws12_loop_income_to_consumption': {
          const overdueMaintenanceCount = villageProjectStore.maintenanceSummaries.filter(summary => summary.overdue).length
          const activeDonationCount = villageProjectStore.donationSummaries.filter(summary => summary.unlocked && !summary.targetReached).length
          active = playerStore.getRecentNetIncome(7) > 0 && (overdueMaintenanceCount > 0 || activeDonationCount > 0)
          evidence = overdueMaintenanceCount > 0
            ? `当前有 ${overdueMaintenanceCount} 项维护逾期。`
            : activeDonationCount > 0
              ? `当前有 ${activeDonationCount} 项捐献计划待推进。`
              : ''
          break
        }
        case 'ws12_loop_growth_to_order': {
          const readyMachineCount = processingStore.machines.filter(machine => machine.ready).length
          active = readyMachineCount > 0 || !!questStore.specialOrder
          evidence = questStore.specialOrder
            ? `特殊订单「${questStore.specialOrder.description}」可直接承接当前加工产出。`
            : readyMachineCount > 0
              ? `当前有 ${readyMachineCount} 台机器产物待领取。`
              : ''
          break
        }
        case 'ws12_loop_display_to_reputation': {
          active = museumStore.displayRatingOverview.state.score > 0 || goalStore.goalReputation > 0
          evidence = `展陈评分 ${museumStore.displayRatingOverview.state.score}，目标声望 ${goalStore.goalReputation}。`
          break
        }
        case 'ws12_loop_activity_to_reward': {
          active = !!goalStore.currentEventCampaign || !!questStore.currentLimitedTimeQuestCampaign
          evidence = goalStore.currentEventCampaign
            ? `当前活动「${goalStore.currentEventCampaign.label}」正在运行。`
            : questStore.currentLimitedTimeQuestCampaign
              ? `当前限时窗口「${questStore.currentLimitedTimeQuestCampaign.label}」待结算。`
              : ''
          break
        }
        default:
          break
      }

      return {
        ...def,
        active,
        evidence
      }
    }).filter(loop => loop.active)

    return {
      linkedSystems: ['system', 'quest', 'villageProject'],
      activeLoopCount: loops.length,
      loops
    }
  })

  const getQaGovernanceDebugSnapshot = () => {
    const playerStore = usePlayerStore()
    return {
      featureFlags: WS12_QA_GOVERNANCE_FEATURE_FLAGS,
      contentTierIds: WS12_QA_GOVERNANCE_CONTENT_TIERS.map(tier => tier.id),
      saveVersion: SAVE_VERSION,
      maxSlots: MAX_SLOTS,
      storageMode: storageMode.value,
      activeSlot: activeSlot.value,
      activeSlotMode: activeSlotMode.value,
      builtInSampleSaveIds: BUILT_IN_SAMPLE_SAVES.map(sample => sample.id),
      migrationProfileIds: WS12_SAVE_MIGRATION_PROFILES.map(profile => profile.id),
      regressionSuiteIds: WS12_AUTOMATED_REGRESSION_SUITES.map(suite => suite.id),
      compensationPresetIds: WS12_COMPENSATION_MAIL_PRESETS.map(preset => preset.id),
      runtimeState: { ...playerStore.qaGovernanceRuntimeState },
      crossSystemLoopIds: qaGovernanceCrossSystemOverview.value.loops.map(loop => loop.id),
      activeStorageLockIds: [...qaGovernanceStorageActionLocks.value],
      telemetrySaveVersion: playerStore.economyTelemetry.saveVersion,
      lastAuditDayTag: playerStore.economyTelemetry.lastAuditDayTag
    }
  }

  const getQaGovernanceStorageOverview = () => ({
    storageMode: storageMode.value,
    activeSlot: activeSlot.value,
    activeSlotMode: activeSlotMode.value,
    maxSlots: MAX_SLOTS,
    builtInSampleSaveCount: BUILT_IN_SAMPLE_SAVES.length,
    activeStorageLockCount: qaGovernanceStorageActionLocks.value.length
  })

  const setQaGovernanceStorageMode = (mode: SaveMode) => {
    const lockId = `qa_storage_mode_${mode}`
    if (!beginQaGovernanceStorageAction(lockId)) return getQaGovernanceStorageOverview()
    const snapshot = createQaGovernanceStorageSnapshot()
    try {
      setStorageMode(mode)
      return getQaGovernanceStorageOverview()
    } catch {
      rollbackQaGovernanceStorage(snapshot)
      return getQaGovernanceStorageOverview()
    } finally {
      finishQaGovernanceStorageAction(lockId)
    }
  }

  const resetQaGovernanceRuntimeState = () => {
    const playerStore = usePlayerStore()
    playerStore.resetQaGovernanceRuntimeState()
    return playerStore.qaGovernanceRuntimeState
  }

  const buildCurrentSaveData = () => {
    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const farmStore = useFarmStore()
    const skillStore = useSkillStore()
    const npcStore = useNpcStore()
    const miningStore = useMiningStore()
    const cookingStore = useCookingStore()
    const processingStore = useProcessingStore()
    const achievementStore = useAchievementStore()
    const animalStore = useAnimalStore()
    const homeStore = useHomeStore()
    const fishingStore = useFishingStore()
    const walletStore = useWalletStore()
    const goalStore = useGoalStore()
    const questStore = useQuestStore()
    const shopStore = useShopStore()
    const settingsStore = useSettingsStore()
    const warehouseStore = useWarehouseStore()
    const breedingStore = useBreedingStore()
    const museumStore = useMuseumStore()
    const guildStore = useGuildStore()
    const secretNoteStore = useSecretNoteStore()
    const hanhaiStore = useHanhaiStore()
    const fishPondStore = useFishPondStore()
    const tutorialStore = useTutorialStore()
    const hiddenNpcStore = useHiddenNpcStore()
    const decorationStore = useDecorationStore()
    const villageProjectStore = useVillageProjectStore()

    const payload = {
      game: gameStore.serialize(),
      player: playerStore.serialize(),
      inventory: inventoryStore.serialize(),
      farm: farmStore.serialize(),
      skill: skillStore.serialize(),
      npc: npcStore.serialize(),
      mining: miningStore.serialize(),
      cooking: cookingStore.serialize(),
      processing: processingStore.serialize(),
      achievement: achievementStore.serialize(),
      animal: animalStore.serialize(),
      home: homeStore.serialize(),
      fishing: fishingStore.serialize(),
      wallet: walletStore.serialize(),
      goal: goalStore.serialize(),
      quest: questStore.serialize(),
      shop: shopStore.serialize(),
      settings: settingsStore.serialize(),
      warehouse: warehouseStore.serialize(),
      breeding: breedingStore.serialize(),
      museum: museumStore.serialize(),
      guild: guildStore.serialize(),
      secretNote: secretNoteStore.serialize(),
      hanhai: hanhaiStore.serialize(),
      fishPond: fishPondStore.serialize(),
      tutorial: tutorialStore.serialize(),
      hiddenNpc: hiddenNpcStore.serialize(),
      decoration: decorationStore.serialize(),
      villageProject: villageProjectStore.serialize()
    }

    const savedAt = new Date().toISOString()
    return {
      meta: buildSaveMeta(savedAt, SAVE_VERSION),
      data: payload,
      savedAt
    }
  }

  const applySaveData = (data: Record<string, any>, slot: number): boolean => {
    const normalized = normalizeSaveEnvelope(data)
    if (!normalized) return false
    const payload = normalized.data

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const farmStore = useFarmStore()
    const skillStore = useSkillStore()
    const npcStore = useNpcStore()
    const miningStore = useMiningStore()
    const cookingStore = useCookingStore()
    const processingStore = useProcessingStore()
    const achievementStore = useAchievementStore()
    const animalStore = useAnimalStore()
    const homeStore = useHomeStore()
    const fishingStore = useFishingStore()
    const walletStore = useWalletStore()
    const goalStore = useGoalStore()
    const questStore = useQuestStore()
    const shopStore = useShopStore()
    const settingsStore = useSettingsStore()
    const warehouseStore = useWarehouseStore()
    const breedingStore = useBreedingStore()
    const museumStore = useMuseumStore()
    const guildStore = useGuildStore()
    const secretNoteStore = useSecretNoteStore()
    const hanhaiStore = useHanhaiStore()
    const fishPondStore = useFishPondStore()
    const tutorialStore = useTutorialStore()
    const hiddenNpcStore = useHiddenNpcStore()
    const decorationStore = useDecorationStore()
    const villageProjectStore = useVillageProjectStore()

    // 核心块缺失时直接拒绝加载，避免先重置当前会话再因反序列化失败把现场清空
    if (!payload.game || !payload.player || !payload.inventory || !payload.farm) {
      return false
    }

    const backup = {
      game: gameStore.serialize(),
      player: playerStore.serialize(),
      inventory: inventoryStore.serialize(),
      farm: farmStore.serialize(),
      skill: skillStore.serialize(),
      npc: npcStore.serialize(),
      mining: miningStore.serialize(),
      cooking: cookingStore.serialize(),
      processing: processingStore.serialize(),
      achievement: achievementStore.serialize(),
      animal: animalStore.serialize(),
      home: homeStore.serialize(),
      fishing: fishingStore.serialize(),
      wallet: walletStore.serialize(),
      goal: goalStore.serialize(),
      quest: questStore.serialize(),
      shop: shopStore.serialize(),
      settings: settingsStore.serialize(),
      warehouse: warehouseStore.serialize(),
      breeding: breedingStore.serialize(),
      museum: museumStore.serialize(),
      guild: guildStore.serialize(),
      secretNote: secretNoteStore.serialize(),
      hanhai: hanhaiStore.serialize(),
      fishPond: fishPondStore.serialize(),
      tutorial: tutorialStore.serialize(),
      hiddenNpc: hiddenNpcStore.serialize(),
      decoration: decorationStore.serialize(),
      villageProject: villageProjectStore.serialize(),
      activeSlot: activeSlot.value,
      activeSlotMode: activeSlotMode.value
    }

    try {
      // 先重置所有游戏态，避免缺块旧档继承当前会话中的残留状态
      gameStore.$reset()
      playerStore.$reset()
      inventoryStore.$reset()
      farmStore.$reset()
      skillStore.$reset()
      npcStore.$reset()
      miningStore.$reset()
      cookingStore.$reset()
      processingStore.$reset()
      achievementStore.$reset()
      animalStore.$reset()
      homeStore.$reset()
      fishingStore.$reset()
      walletStore.$reset()
      goalStore.$reset()
      questStore.$reset()
      shopStore.$reset()
      warehouseStore.$reset()
      breedingStore.$reset()
      museumStore.$reset()
      guildStore.$reset()
      secretNoteStore.$reset()
      hanhaiStore.$reset()
      fishPondStore.$reset()
      tutorialStore.$reset()
      hiddenNpcStore.$reset()
      decorationStore.$reset()
      villageProjectStore.$reset()

      gameStore.deserialize(payload.game)
      playerStore.deserialize(payload.player)
      inventoryStore.deserialize(payload.inventory)
      farmStore.deserialize(payload.farm)
      if (payload.skill) skillStore.deserialize(payload.skill)
      if (payload.npc) npcStore.deserialize(payload.npc)
      if (payload.mining) miningStore.deserialize(payload.mining)
      if (payload.cooking) cookingStore.deserialize(payload.cooking)
      if (payload.processing) processingStore.deserialize(payload.processing)
      if (payload.achievement) achievementStore.deserialize(payload.achievement)
      if (payload.animal) animalStore.deserialize(payload.animal)
      if (payload.home) homeStore.deserialize(payload.home)
      if (payload.fishing) fishingStore.deserialize(payload.fishing)
      walletStore.deserialize(payload.wallet)
      goalStore.deserialize(payload.goal)
      if (payload.quest) questStore.deserialize(payload.quest)
      shopStore.deserialize(payload.shop)
      if (payload.settings) settingsStore.deserialize(payload.settings, normalized.meta.saveVersion)
      if (payload.warehouse) warehouseStore.deserialize(payload.warehouse)
      if (payload.breeding) breedingStore.deserialize(payload.breeding)
      if (payload.museum) museumStore.deserialize(payload.museum)
      if (payload.guild) guildStore.deserialize(payload.guild)
      if (payload.secretNote) secretNoteStore.deserialize(payload.secretNote)
      if (payload.hanhai) hanhaiStore.deserialize(payload.hanhai)
      if (payload.fishPond) fishPondStore.deserialize(payload.fishPond)
      if (payload.tutorial) tutorialStore.deserialize(payload.tutorial)
      if (payload.hiddenNpc) hiddenNpcStore.deserialize(payload.hiddenNpc)
      if (payload.decoration) decorationStore.deserialize(payload.decoration)
      if (payload.villageProject) villageProjectStore.deserialize(payload.villageProject)

      // 在相关 store 全部反序列化完成后，再统一同步 NPC 关系奖励，避免旧档奖励被吞或食谱被后续 store 覆盖
      npcStore.rehydrateRelationshipPerks({ grantInventoryRewards: true, emitMessages: false })

      activeSlot.value = slot
      activeSlotMode.value = storageMode.value
      activeSlotsByMode.value[storageMode.value] = slot
      return true
    } catch {
      gameStore.$reset()
      playerStore.$reset()
      inventoryStore.$reset()
      farmStore.$reset()
      skillStore.$reset()
      npcStore.$reset()
      miningStore.$reset()
      cookingStore.$reset()
      processingStore.$reset()
      achievementStore.$reset()
      animalStore.$reset()
      homeStore.$reset()
      fishingStore.$reset()
      walletStore.$reset()
      goalStore.$reset()
      questStore.$reset()
      shopStore.$reset()
      warehouseStore.$reset()
      breedingStore.$reset()
      museumStore.$reset()
      guildStore.$reset()
      secretNoteStore.$reset()
      hanhaiStore.$reset()
      fishPondStore.$reset()
      tutorialStore.$reset()
      hiddenNpcStore.$reset()
      decorationStore.$reset()
      villageProjectStore.$reset()

      gameStore.deserialize(backup.game)
      playerStore.deserialize(backup.player)
      inventoryStore.deserialize(backup.inventory)
      farmStore.deserialize(backup.farm)
      skillStore.deserialize(backup.skill)
      npcStore.deserialize(backup.npc)
      miningStore.deserialize(backup.mining)
      cookingStore.deserialize(backup.cooking)
      processingStore.deserialize(backup.processing)
      achievementStore.deserialize(backup.achievement)
      animalStore.deserialize(backup.animal)
      homeStore.deserialize(backup.home)
      fishingStore.deserialize(backup.fishing)
      walletStore.deserialize(backup.wallet)
      goalStore.deserialize(backup.goal)
      questStore.deserialize(backup.quest)
      shopStore.deserialize(backup.shop)
      settingsStore.deserialize(backup.settings)
      warehouseStore.deserialize(backup.warehouse)
      breedingStore.deserialize(backup.breeding)
      museumStore.deserialize(backup.museum)
      guildStore.deserialize(backup.guild)
      secretNoteStore.deserialize(backup.secretNote)
      hanhaiStore.deserialize(backup.hanhai)
      fishPondStore.deserialize(backup.fishPond)
      tutorialStore.deserialize(backup.tutorial)
      hiddenNpcStore.deserialize(backup.hiddenNpc)
      decorationStore.deserialize(backup.decoration)
      villageProjectStore.deserialize(backup.villageProject)
      activeSlot.value = backup.activeSlot
      activeSlotMode.value = backup.activeSlotMode
      return false
    }
  }

  const getRawByMode = async (slot: number): Promise<string | null> => {
    if (storageMode.value === 'server') {
      return fetchServerSlotRaw(slot)
    }
    return localStorage.getItem(getSaveKey(slot))
  }

  const setRawByMode = async (slot: number, raw: string) => {
    if (storageMode.value === 'server') {
      await saveServerSlotRaw(slot, raw)
      return
    }
    localStorage.setItem(getSaveKey(slot), raw)
  }

  const removeRawByMode = async (slot: number) => {
    if (storageMode.value === 'server') {
      await deleteServerSlotRaw(slot)
      return
    }
    localStorage.removeItem(getSaveKey(slot))
  }

  /** 获取所有存档槽位信息 */
  const getSlots = async (): Promise<SaveSlotInfo[]> => {
    try {
      if (storageMode.value === 'server') {
        const raws = await fetchServerSlots()
        return raws.map((raw, slot) => parseSlotInfo(slot, raw))
      }
      return Array.from({ length: MAX_SLOTS }, (_, slot) => parseSlotInfo(slot, localStorage.getItem(getSaveKey(slot))))
    } catch {
      return createEmptySlots()
    }
  }

  /** 为新游戏分配一个空闲槽位，无空闲则返回 -1 */
  const assignNewSlot = async (): Promise<number> => {
    const slots = await getSlots()
    const empty = slots.find(s => !s.exists)
    const slot = empty ? empty.slot : -1
    activeSlot.value = slot
    activeSlotMode.value = slot >= 0 ? storageMode.value : null
    activeSlotsByMode.value[storageMode.value] = slot
    return slot
  }

  /** 保存到指定槽位 */
  const saveToSlot = async (slot: number): Promise<boolean> => {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    try {
      const data = buildCurrentSaveData()
      await setRawByMode(slot, encrypt(JSON.stringify(data)))
      activeSlot.value = slot
      activeSlotMode.value = storageMode.value
      activeSlotsByMode.value[storageMode.value] = slot
      return true
    } catch {
      return false
    }
  }

  /** 自动存档到当前活跃槽位 */
  const autoSave = async (): Promise<boolean> => {
    if (activeSlot.value < 0) return false
    if (activeSlotMode.value !== storageMode.value) return false
    return await saveToSlot(activeSlot.value)
  }

  /** 从指定槽位加载 */
  const loadFromSlot = async (slot: number): Promise<boolean> => {
    try {
      const raw = await getRawByMode(slot)
      if (!raw) return false

      const data = parseSaveData(raw)
      if (!data || !normalizeSaveEnvelope(data)) return false
      const runtimeSnapshot = buildCurrentSaveData()
      const previousActiveSlot = activeSlot.value
      const previousActiveSlotMode = activeSlotMode.value
      const applied = applySaveData(data, slot)
      if (!applied) return false
      if (storageMode.value === 'server') {
        try {
          await setServerActiveSlot(slot)
        } catch {
          const restored = applySaveData(runtimeSnapshot, previousActiveSlot)
          if (!restored) {
            return false
          }
          activeSlot.value = previousActiveSlot
          activeSlotMode.value = previousActiveSlotMode
          if (previousActiveSlotMode) {
            activeSlotsByMode.value[previousActiveSlotMode] = previousActiveSlot
          }
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }

  /** 删除指定槽位 */
  const deleteSlot = async (slot: number): Promise<boolean> => {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    try {
      await removeRawByMode(slot)
    } catch {
      return false
    }
    if (activeSlot.value === slot && activeSlotMode.value === storageMode.value) {
      activeSlot.value = -1
      activeSlotMode.value = null
      activeSlotsByMode.value[storageMode.value] = -1
    }
    return true
  }

  /** 导出存档为加密文件 */
  const exportSave = async (slot: number): Promise<boolean> => {
    try {
      const raw = await getRawByMode(slot)
      if (!raw) return false
      const blob = new Blob([raw], { type: 'application/octet-stream' })
      const info = (await getSlots()).find(s => s.slot === slot)
      const name = info?.exists
        ? `桃源乡_存档${slot + 1}_第${info.year}年${SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] ?? info.season}第${info.day}天`
        : `桃源乡_存档${slot + 1}`
      saveAs(blob, `${name}${SAVE_FILE_EXT}`)
      return true
    } catch {
      return false
    }
  }

  /** 从文件导入存档到指定槽位 */
  const importSave = async (slot: number, fileContent: string): Promise<boolean> => {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    try {
      // 验证文件内容可解密
      const data = parseSaveData(fileContent)
      if (!data || !normalizeSaveEnvelope(data)) return false
      const runtimeSnapshot = buildCurrentSaveData()
      const previousActiveSlot = activeSlot.value
      const previousActiveSlotMode = activeSlotMode.value
      const validationPassed = applySaveData(data, previousActiveSlot)
      const restorePassed = applySaveData(runtimeSnapshot, previousActiveSlot)
      activeSlot.value = previousActiveSlot
      activeSlotMode.value = previousActiveSlotMode
      if (previousActiveSlotMode) {
        activeSlotsByMode.value[previousActiveSlotMode] = previousActiveSlot
      }
      if (!validationPassed || !restorePassed) return false
      await setRawByMode(slot, fileContent)
      return true
    } catch {
      return false
    }
  }

  const getBuiltInSampleSaves = (): BuiltInSampleSaveInfo[] =>
    BUILT_IN_SAMPLE_SAVES.map(sample => ({
      id: sample.id,
      label: sample.label,
      description: sample.description,
      tags: [...sample.tags]
    }))

  const findBuiltInSampleSave = (sampleId: string): BuiltInSampleSaveDef | undefined => BUILT_IN_SAMPLE_SAVES.find(sample => sample.id === sampleId)

  const loadBuiltInSampleSave = async (sampleId: string): Promise<boolean> => {
    const sample = findBuiltInSampleSave(sampleId)
    if (!sample) return false
    return applySaveData(sample.envelope, -1)
  }

  if (import.meta.env.DEV) {
    ;(globalThis as any).__TAOYUAN_SAMPLE_SAVES__ = {
      list: getBuiltInSampleSaves,
      load: loadBuiltInSampleSave
    }
  }

  return {
    activeSlot,
    activeSlotMode,
    storageMode,
    qaGovernanceBaselineAudit,
    qaGovernanceOverview,
    qaGovernanceCrossSystemOverview,
    qaGovernanceStorageActionLocks,
    qaGovernanceTuning,
    getQaGovernanceStorageOverview,
    setStorageMode,
    setQaGovernanceStorageMode,
    getSlots,
    assignNewSlot,
    saveToSlot,
    autoSave,
    loadFromSlot,
    deleteSlot,
    exportSave,
    importSave,
    getBuiltInSampleSaves,
    loadBuiltInSampleSave,
    getQaGovernanceDebugSnapshot,
    resetQaGovernanceRuntimeState
  }
})
