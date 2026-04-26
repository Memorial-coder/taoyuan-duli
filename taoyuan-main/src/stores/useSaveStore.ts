import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Capacitor } from '@capacitor/core'
import CryptoJS from 'crypto-js'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
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
import { useRegionMapStore } from './useRegionMapStore'
import { useFrontierChronicleStore } from './useFrontierChronicleStore'
import {
  BUILT_IN_SAMPLE_SAVES,
  type BuiltInSampleSaveDef,
  type BuiltInSampleRouteName,
  type BuiltInSampleSmokeCheckDef,
  type BuiltInSampleTier
} from '@/data/sampleSaves'
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
import { buildScopedSingleKey, buildScopedStorageKey, ensureCurrentAccount, getStoredSaveMode, migrateLegacyScopedSlots, setStoredSaveMode, type SaveMode } from '@/utils/accountStorage'
import { deleteServerSlotRaw, fetchServerSlotRaw, fetchServerSlots, saveServerSlotRaw, setServerActiveSlot } from '@/utils/serverSaveApi'
import { _registerGameplaySaveContextGetter } from '@/composables/useGameLog'

const LEGACY_SAVE_KEY_PREFIX = 'taoyuanxiang_save_'
const MAX_SLOTS = 3
const ENCRYPTION_KEY = 'taoyuanxiang_2024_secret'
const SAVE_FILE_EXT = '.tyx'
const SAVE_VERSION = 4
const PENDING_SERVER_SAVE_KEY_PREFIX = 'taoyuanxiang_pending_server_saves_'
const EXPORT_FILE_NAME_RESERVED_CHARS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
const sanitizeExportFileName = (value: string): string =>
  Array.from(value)
    .map(char => {
      const code = char.charCodeAt(0)
      return EXPORT_FILE_NAME_RESERVED_CHARS.has(char) || (code >= 0 && code <= 0x1f) ? '_' : char
    })
    .join('')
    .trim() || 'taoyuan_save'

export type ServerSaveSyncStatus = 'idle' | 'syncing' | 'queued' | 'synced' | 'error'
export type SaveExecutionStatus = 'saved' | 'queued' | 'failed'
export interface LoadFromSlotOptions {
  mode?: SaveMode
  allowPendingServerCopy?: boolean
}

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

const getPendingServerSaveKey = (): string => buildScopedSingleKey(PENDING_SERVER_SAVE_KEY_PREFIX)

const isValidSlot = (slot: number): boolean => Number.isInteger(slot) && slot >= 0 && slot < MAX_SLOTS

const loadPendingServerSaveMap = (): PendingServerSaveMap => {
  try {
    const raw = localStorage.getItem(getPendingServerSaveKey())
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, PendingServerSaveEntry>
    if (!parsed || typeof parsed !== 'object') return {}
    const next: PendingServerSaveMap = {}
    for (const [slotKey, entry] of Object.entries(parsed)) {
      const slot = Number(slotKey)
      if (!isValidSlot(slot)) continue
      if (!entry || typeof entry !== 'object' || typeof entry.raw !== 'string' || !entry.raw) continue
      next[slot] = {
        raw: entry.raw,
        savedAt: typeof entry.savedAt === 'string' && entry.savedAt ? entry.savedAt : new Date().toISOString(),
        updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : Date.now(),
        revision: Number.isFinite(Number(entry.revision))
          ? Number(entry.revision)
          : Number.isFinite(Number(entry.updatedAt))
            ? Number(entry.updatedAt)
            : Date.now()
      }
    }
    return next
  } catch {
    return {}
  }
}

const persistPendingServerSaveMap = (map: PendingServerSaveMap) => {
  try {
    const entries = Object.entries(map)
      .filter(([slot, entry]) => isValidSlot(Number(slot)) && !!entry?.raw)
      .map(([slot, entry]) => [slot, entry] as const)

    if (entries.length === 0) {
      localStorage.removeItem(getPendingServerSaveKey())
      return
    }

    localStorage.setItem(getPendingServerSaveKey(), JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* ignore */
  }
}

const getPendingServerSaveEntries = (): Array<{ slot: number; entry: PendingServerSaveEntry }> =>
  Object.entries(loadPendingServerSaveMap())
    .map(([slot, entry]) => ({ slot: Number(slot), entry: entry as PendingServerSaveEntry }))
    .filter(item => isValidSlot(item.slot) && !!item.entry?.raw)

const getPendingServerSlotNumbers = (): number[] =>
  getPendingServerSaveEntries()
    .map(item => item.slot)
    .sort((left, right) => left - right)

const buildPendingServerSaveEntry = (raw: string, revision: number): PendingServerSaveEntry => ({
  raw,
  savedAt: new Date().toISOString(),
  updatedAt: Date.now(),
  revision
})

/** 加密 JSON 字符串 */
const encrypt = (json: string): string => {
  return CryptoJS.AES.encrypt(json, ENCRYPTION_KEY).toString()
}

/** 解密 JSON 字符串，失败返回 null */
const decrypt = (cipher: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY)
    const result = bytes.toString(CryptoJS.enc.Utf8)
    return result || null
  } catch {
    return null
  }
}

/** 瑙ｅ瘑骞惰В鏋愬瓨妗ｆ暟鎹?*/
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
  pendingSync?: boolean
  readBlocked?: boolean
}

export interface BuiltInSampleSaveInfo {
  id: string
  label: string
  description: string
  tags: string[]
  tier: BuiltInSampleTier
  recommendedRouteName: BuiltInSampleRouteName
  focusAreas: string[]
  smokeChecks: BuiltInSampleSmokeCheckDef[]
}

interface PendingServerSaveEntry {
  raw: string
  savedAt: string
  updatedAt: number
  revision: number
}

type PendingServerSaveMap = Partial<Record<number, PendingServerSaveEntry>>

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
      unlockedNodeIdsByArchetype: {},
      rewardTickets: {}
    }
  } else {
    next.wallet = {
      unlockedItems: Array.isArray(next.wallet.unlockedItems) ? next.wallet.unlockedItems : [],
      currentArchetypeId: next.wallet.currentArchetypeId ?? null,
      unlockedNodeIds: Array.isArray(next.wallet.unlockedNodeIds) ? next.wallet.unlockedNodeIds : [],
      unlockedNodeIdsByArchetype:
        next.wallet.unlockedNodeIdsByArchetype && typeof next.wallet.unlockedNodeIdsByArchetype === 'object'
          ? next.wallet.unlockedNodeIdsByArchetype
          : {},
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
      householdDivision: next.npc.householdDivision ?? undefined,
      familyWishBoard: next.npc.familyWishBoard ?? undefined,
      zhijiCompanionProjects: next.npc.zhijiCompanionProjects ?? [],
      children: next.npc.children ?? [],
      nextChildId: next.npc.nextChildId ?? undefined,
      daysMarried: next.npc.daysMarried ?? 0,
      daysZhiji: next.npc.daysZhiji ?? 0,
      familyExpansion: next.npc.familyExpansion ?? next.npc.pregnancy ?? null,
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
      specialOrderSettlementReceipts: next.quest.specialOrderSettlementReceipts ?? [],
      recentSpecialOrderTagHistory: next.quest.recentSpecialOrderTagHistory ?? [],
      weeklySpecialOrderState: next.quest.weeklySpecialOrderState ?? {
        lastRefreshWeekId: '',
        refreshMode: 'legacy'
      },
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
        seasonBaselineContributionPoints: 0,
        seasonBaselineGuildExp: 0,
        seasonBaselineGoalClaims: 0,
        seasonBaselineBossClears: 0,
        seasonBaselineGuildLevel: 0,
        lastSnapshotContributionPoints: 0,
        lastSnapshotGuildExp: 0,
        lastSnapshotGoalClaims: 0,
        lastSnapshotBossClears: 0,
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
        seasonBaselineContributionPoints: next.guild.seasonState?.seasonBaselineContributionPoints ?? 0,
        seasonBaselineGuildExp: next.guild.seasonState?.seasonBaselineGuildExp ?? 0,
        seasonBaselineGoalClaims: next.guild.seasonState?.seasonBaselineGoalClaims ?? 0,
        seasonBaselineBossClears: next.guild.seasonState?.seasonBaselineBossClears ?? 0,
        seasonBaselineGuildLevel: next.guild.seasonState?.seasonBaselineGuildLevel ?? 0,
        lastSnapshotContributionPoints: next.guild.seasonState?.lastSnapshotContributionPoints ?? 0,
        lastSnapshotGuildExp: next.guild.seasonState?.lastSnapshotGuildExp ?? 0,
        lastSnapshotGoalClaims: next.guild.seasonState?.lastSnapshotGoalClaims ?? 0,
        lastSnapshotBossClears: next.guild.seasonState?.lastSnapshotBossClears ?? 0,
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
  /** 当前活跃存档槽位，-1 表示未分配 */
  const activeSlot = ref(-1)
  /** 当前活跃存档槽位所属模式，用于防止切换存储介质后误写入 */
  const activeSlotMode = ref<SaveMode | null>(null)
  const runtimeSessionSlot = ref(-1)
  const runtimeSessionMode = ref<SaveMode | null>(null)
  const activeSlotsByMode = ref<Record<SaveMode, number>>({
    local: -1,
    server: -1
  })
  const storageMode = ref<SaveMode>(getStoredSaveMode())
  const lastSaveErrorMessage = ref('')
  const serverSyncStatus = ref<ServerSaveSyncStatus>('idle')
  const pendingServerSlots = ref<number[]>(getPendingServerSlotNumbers())
  const lastServerSyncMessage = ref('')
  const lastSaveResultStatus = ref<SaveExecutionStatus>('saved')
  const serverSlotsFetchState = ref<'unknown' | 'available' | 'unavailable'>(
    getStoredSaveMode() === 'server' ? 'unknown' : 'available'
  )
  const lastIssuedServerRevisionBySlot = ref<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0
  })

  const refreshPendingServerState = () => {
    pendingServerSlots.value = getPendingServerSlotNumbers()
    return pendingServerSlots.value
  }

  const getSlotAllocationBlockReason = (): string => {
    if (storageMode.value === 'server' && serverSlotsFetchState.value === 'unavailable') {
      return '服务端存档暂时不可用，无法安全分配新槽位，请稍后重试。'
    }
    return ''
  }

  const reloadAccountScopedState = () => {
    storageMode.value = getStoredSaveMode()
    activeSlotsByMode.value = {
      local: -1,
      server: -1,
    }
    activeSlot.value = -1
    activeSlotMode.value = null
    runtimeSessionSlot.value = -1
    runtimeSessionMode.value = null
    lastIssuedServerRevisionBySlot.value = { 0: 0, 1: 0, 2: 0 }
    serverSlotsFetchState.value = storageMode.value === 'server' ? 'unknown' : 'available'
    refreshPendingServerState()
  }

  const setLastSaveState = (status: SaveExecutionStatus, errorMessage = '', syncMessage = lastServerSyncMessage.value) => {
    lastSaveResultStatus.value = status
    lastSaveErrorMessage.value = errorMessage
    lastServerSyncMessage.value = syncMessage
  }

  const queuePendingServerSave = (slot: number, raw: string) => {
    const map = loadPendingServerSaveMap()
    const previousRevision = Math.max(
      lastIssuedServerRevisionBySlot.value[slot] ?? 0,
      map[slot]?.revision ?? 0
    )
    const nextRevision = Math.max(Date.now(), previousRevision + 1)
    lastIssuedServerRevisionBySlot.value = {
      ...lastIssuedServerRevisionBySlot.value,
      [slot]: nextRevision
    }
    map[slot] = buildPendingServerSaveEntry(raw, nextRevision)
    persistPendingServerSaveMap(map)
    refreshPendingServerState()
  }

  const clearPendingServerSave = (slot: number) => {
    const map = loadPendingServerSaveMap()
    delete map[slot]
    persistPendingServerSaveMap(map)
    refreshPendingServerState()
  }

  const clearPendingServerSaveIfUnchanged = (slot: number, expectedEntry: PendingServerSaveEntry) => {
    const map = loadPendingServerSaveMap()
    const currentEntry = map[slot]
    if (!currentEntry) return true
    if (
      currentEntry.revision !== expectedEntry.revision ||
      currentEntry.updatedAt !== expectedEntry.updatedAt ||
      currentEntry.raw !== expectedEntry.raw
    ) {
      refreshPendingServerState()
      return false
    }
    delete map[slot]
    persistPendingServerSaveMap(map)
    refreshPendingServerState()
    return true
  }

  const getPendingServerRaw = (slot: number): string | null => {
    const map = loadPendingServerSaveMap()
    return typeof map[slot]?.raw === 'string' ? map[slot]!.raw : null
  }

  const hasPendingServerSave = (slot: number): boolean => !!getPendingServerRaw(slot)

  const setRuntimeSession = (slot: number, mode: SaveMode | null) => {
    runtimeSessionSlot.value = slot
    runtimeSessionMode.value = slot >= 0 ? mode : null
  }

  const applyActiveSlotSelection = (slot: number, mode: SaveMode = storageMode.value) => {
    activeSlot.value = slot
    activeSlotMode.value = slot >= 0 ? mode : null
    activeSlotsByMode.value[mode] = slot
  }

  _registerGameplaySaveContextGetter(() => ({
    saveSlot: activeSlot.value >= 0 ? activeSlot.value : null,
    saveMode: activeSlotMode.value ?? storageMode.value ?? null,
  }))

  const qaGovernanceBaselineAudit = WS12_QA_GOVERNANCE_BASELINE_AUDIT
  const qaGovernanceStorageActionLocks = ref<string[]>([])
  const qaGovernanceTuning = WS12_QA_GOVERNANCE_TUNING_CONFIG

  const setStorageMode = (mode: SaveMode) => {
    storageMode.value = mode
    setStoredSaveMode(mode)
    serverSlotsFetchState.value = mode === 'server' ? 'unknown' : 'available'
    activeSlot.value = activeSlotsByMode.value[mode] ?? -1
    activeSlotMode.value = activeSlot.value >= 0 ? mode : null
    refreshPendingServerState()
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

  const createEmptySlots = (options: { readBlocked?: boolean } = {}): SaveSlotInfo[] =>
    Array.from({ length: MAX_SLOTS }, (_, slot) => ({
      slot,
      exists: false,
      readBlocked: options.readBlocked === true
    }))

  const parseSlotInfo = (slot: number, raw: string | null, pendingSync = false, readBlocked = false): SaveSlotInfo => {
    if (!raw) return { slot, exists: false, readBlocked }
    const parsed = parseSaveData(raw)
    const normalized = parsed ? normalizeSaveEnvelope(parsed) : null
    if (!normalized) return { slot, exists: false, readBlocked }
    return {
      slot,
      exists: true,
      year: normalized.data.game?.year,
      season: normalized.data.game?.season,
      day: normalized.data.game?.day,
      money: normalized.data.player?.money,
      playerName: normalized.data.player?.playerName,
      savedAt: normalized.meta.savedAt,
      pendingSync,
      readBlocked
    }
  }

  const getSaveBlockReason = (): string => {
    const miningStore = useMiningStore()
    if (miningStore.isExploring) return '矿洞探索中无法保存，请先离开矿洞。'

    const fishingStore = useFishingStore()
    if (fishingStore.currentFish) return '钓鱼进行中无法保存，请先完成当前钓鱼。'

    const hanhaiStore = useHanhaiStore()
    if (hanhaiStore.hasActiveCasinoSession) return '瀚海赌局进行中无法保存，请先完成当前牌局。'

    return ''
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
            ? `特殊订单“${questStore.specialOrder.description}”可直接承接当前加工产出。`
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
            ? `当前活动“${goalStore.currentEventCampaign.label}”正在运行。`
            : questStore.currentLimitedTimeQuestCampaign
              ? `当前限时窗口“${questStore.currentLimitedTimeQuestCampaign.label}”待结算。`
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
    const regionMapStore = useRegionMapStore()
    const frontierChronicleStore = useFrontierChronicleStore()

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
      villageProject: villageProjectStore.serialize(),
      regionMap: regionMapStore.serialize(),
      frontierChronicle: frontierChronicleStore.serialize()
    }

    const savedAt = new Date().toISOString()
    return {
      meta: buildSaveMeta(savedAt, SAVE_VERSION),
      data: payload,
      savedAt
    }
  }

  const applySaveData = (data: Record<string, any>, slot: number, mode: SaveMode = storageMode.value): boolean => {
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
    const regionMapStore = useRegionMapStore()
    const frontierChronicleStore = useFrontierChronicleStore()

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
      regionMap: regionMapStore.serialize(),
      frontierChronicle: frontierChronicleStore.serialize(),
      activeSlot: activeSlot.value,
      activeSlotMode: activeSlotMode.value,
      runtimeSessionSlot: runtimeSessionSlot.value,
      runtimeSessionMode: runtimeSessionMode.value,
      activeSlotsByMode: { ...activeSlotsByMode.value }
    }

    const resetRuntimeStores = () => {
      const emptyState = {} as any
      gameStore.deserialize(emptyState)
      playerStore.deserialize(emptyState)
      inventoryStore.deserialize(emptyState)
      farmStore.deserialize({
        farmSize: 4,
        plots: Array.from({ length: 16 }, (_, id) => ({
          id,
          state: 'wasteland',
          cropId: null,
          growthDays: 0,
          watered: false,
          unwateredDays: 0,
          fertilizer: null,
          harvestCount: 0,
          giantCropGroup: null,
          seedGenetics: null,
          infested: false,
          infestedDays: 0,
          weedy: false,
          weedyDays: 0
        })),
        sprinklers: [],
        fruitTrees: [],
        greenhousePlots: [],
        greenhouseLevel: 0,
        wildTrees: [],
        nextFruitTreeId: 0,
        nextWildTreeId: 0,
        lightningRods: 0,
        scarecrows: 0,
        giantCropCounter: 0
      })
      skillStore.deserialize(emptyState)
      npcStore.deserialize(emptyState)
      miningStore.deserialize(emptyState)
      cookingStore.deserialize(emptyState)
      processingStore.deserialize(emptyState)
      achievementStore.deserialize(emptyState)
      animalStore.deserialize(emptyState)
      homeStore.deserialize(emptyState)
      fishingStore.deserialize(emptyState)
      walletStore.deserialize(emptyState)
      goalStore.deserialize(emptyState)
      questStore.deserialize(emptyState)
      shopStore.deserialize(emptyState)
      settingsStore.deserialize(emptyState, normalized.meta.saveVersion)
      warehouseStore.deserialize(emptyState)
      breedingStore.deserialize(emptyState)
      museumStore.deserialize(emptyState)
      guildStore.deserialize(emptyState)
      secretNoteStore.deserialize(emptyState)
      hanhaiStore.deserialize(emptyState)
      fishPondStore.deserialize(emptyState)
      tutorialStore.deserialize(emptyState)
      hiddenNpcStore.deserialize(emptyState)
      decorationStore.deserialize(emptyState)
      villageProjectStore.deserialize(emptyState)
      regionMapStore.deserialize(emptyState)
      frontierChronicleStore.deserialize(emptyState)
    }

    const restoreRuntimeStores = (snapshot: typeof backup) => {
      gameStore.deserialize(snapshot.game)
      playerStore.deserialize(snapshot.player)
      inventoryStore.deserialize(snapshot.inventory)
      farmStore.deserialize(snapshot.farm)
      skillStore.deserialize(snapshot.skill)
      npcStore.deserialize(snapshot.npc)
      miningStore.deserialize(snapshot.mining)
      cookingStore.deserialize(snapshot.cooking)
      processingStore.deserialize(snapshot.processing)
      achievementStore.deserialize(snapshot.achievement)
      animalStore.deserialize(snapshot.animal)
      homeStore.deserialize(snapshot.home)
      fishingStore.deserialize(snapshot.fishing)
      walletStore.deserialize(snapshot.wallet)
      questStore.deserialize(snapshot.quest)
      shopStore.deserialize(snapshot.shop)
      settingsStore.deserialize(snapshot.settings, SAVE_VERSION)
      warehouseStore.deserialize(snapshot.warehouse)
      breedingStore.deserialize(snapshot.breeding)
      museumStore.deserialize(snapshot.museum)
      guildStore.deserialize(snapshot.guild)
      secretNoteStore.deserialize(snapshot.secretNote)
      hanhaiStore.deserialize(snapshot.hanhai)
      fishPondStore.deserialize(snapshot.fishPond)
      tutorialStore.deserialize(snapshot.tutorial)
      hiddenNpcStore.deserialize(snapshot.hiddenNpc)
      decorationStore.deserialize(snapshot.decoration)
      villageProjectStore.deserialize(snapshot.villageProject)
      regionMapStore.deserialize(snapshot.regionMap)
      frontierChronicleStore.deserialize(snapshot.frontierChronicle)
      goalStore.deserialize(snapshot.goal)
      npcStore.rehydrateRelationshipPerks({ grantInventoryRewards: false, emitMessages: false })
      playerStore.normalizeDerivedState()
    }

    try {
      // 先把运行时状态还原到可反序列化的干净基线，避免旧会话残留污染样例或导入档
      resetRuntimeStores()

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
      if (payload.regionMap) regionMapStore.deserialize(payload.regionMap)
      if (payload.frontierChronicle) frontierChronicleStore.deserialize(payload.frontierChronicle)
      else frontierChronicleStore.deserialize({})
      goalStore.deserialize(payload.goal)
      if (payload.game && payload.game.tomorrowWeather == null) {
        gameStore.recalculateTomorrowWeather()
      }

      // 鍦ㄧ浉鍏?store 鍏ㄩ儴鍙嶅簭鍒楀寲瀹屾垚鍚庯紝鍐嶇粺涓€鍚屾 NPC 鍏崇郴濂栧姳锛岄伩鍏嶆棫妗ｅ鍔辫鍚炴垨椋熻氨琚悗缁?store 瑕嗙洊
      npcStore.rehydrateRelationshipPerks({ grantInventoryRewards: true, emitMessages: false })
      playerStore.normalizeDerivedState()

      activeSlot.value = slot
      activeSlotMode.value = slot >= 0 ? mode : null
      activeSlotsByMode.value[mode] = slot
      setRuntimeSession(slot, mode)
      return true
    } catch {
      restoreRuntimeStores(backup)
      activeSlot.value = backup.activeSlot
      activeSlotMode.value = backup.activeSlotMode
      runtimeSessionSlot.value = backup.runtimeSessionSlot
      runtimeSessionMode.value = backup.runtimeSessionMode
      activeSlotsByMode.value = { ...backup.activeSlotsByMode }
      return false
    }
  }

  const buildMergedServerSlotStates = async (): Promise<Array<{ raw: string | null; pendingSync: boolean; readBlocked: boolean }>> => {
    const pendingMap = loadPendingServerSaveMap()
    try {
      const raws = await fetchServerSlots()
      serverSlotsFetchState.value = 'available'
      return Array.from({ length: MAX_SLOTS }, (_, slot) => {
        const pendingRaw = pendingMap[slot]?.raw ?? null
        return {
          raw: pendingRaw ?? raws[slot] ?? null,
          pendingSync: !!pendingRaw,
          readBlocked: false
        }
      })
    } catch {
      serverSlotsFetchState.value = 'unavailable'
      return Array.from({ length: MAX_SLOTS }, (_, slot) => ({
        raw: pendingMap[slot]?.raw ?? null,
        pendingSync: !!pendingMap[slot]?.raw,
        readBlocked: !pendingMap[slot]?.raw
      }))
    }
  }

  const syncPendingServerSaves = async (options: { slots?: number[] } = {}) => {
    const account = await ensureCurrentAccount()
    if (!account || account === 'guest') {
      const currentPending = refreshPendingServerState()
      if (currentPending.length === 0 && serverSyncStatus.value === 'syncing') {
        serverSyncStatus.value = 'idle'
      }
      return {
        attempted: false,
        syncedSlots: [] as number[],
        failedSlots: [] as number[],
        pendingSlots: [...currentPending]
      }
    }

    const requestedSlots = Array.isArray(options.slots) ? options.slots.filter(isValidSlot) : []
    const pendingEntries = getPendingServerSaveEntries()
      .filter(item => requestedSlots.length === 0 || requestedSlots.includes(item.slot))
      .sort((left, right) => left.entry.updatedAt - right.entry.updatedAt)

    if (pendingEntries.length === 0) {
      const currentPending = refreshPendingServerState()
      if (currentPending.length === 0 && serverSyncStatus.value === 'syncing') {
        serverSyncStatus.value = 'idle'
      }
      return {
        attempted: false,
        syncedSlots: [] as number[],
        failedSlots: [] as number[],
        pendingSlots: [...currentPending]
      }
    }

    serverSyncStatus.value = 'syncing'
    const syncedSlots: number[] = []
    const failedSlots: number[] = []

    for (const { slot, entry } of pendingEntries) {
      try {
        const saveResult = await saveServerSlotRaw(slot, entry.raw, entry.revision)
        lastIssuedServerRevisionBySlot.value = {
          ...lastIssuedServerRevisionBySlot.value,
          [slot]: Math.max(lastIssuedServerRevisionBySlot.value[slot] ?? 0, saveResult.currentRevision)
        }
        if (saveResult.stale) {
          failedSlots.push(slot)
          continue
        }
        if (clearPendingServerSaveIfUnchanged(slot, entry)) {
          syncedSlots.push(slot)
        }
      } catch {
        failedSlots.push(slot)
      }
    }

    const remainingPending = refreshPendingServerState()
    if (failedSlots.length > 0) {
      serverSyncStatus.value = remainingPending.length > 0 ? 'queued' : 'error'
      lastServerSyncMessage.value = '服务暂时不可用，已先保存在当前浏览器，恢复后会自动同步。'
    } else if (remainingPending.length > 0) {
      serverSyncStatus.value = 'queued'
      lastServerSyncMessage.value = '部分待同步存档已同步到服务端，剩余内容会继续自动补传。'
    } else if (syncedSlots.length > 0) {
      serverSyncStatus.value = 'synced'
      lastServerSyncMessage.value = '待同步存档已同步到服务端。'
    } else {
      serverSyncStatus.value = 'idle'
      lastServerSyncMessage.value = ''
    }

    return {
      attempted: true,
      syncedSlots,
      failedSlots,
      pendingSlots: [...remainingPending]
    }
  }

  const persistServerRaw = async (slot: number, raw: string): Promise<boolean> => {
    const account = await ensureCurrentAccount()
    if (!account || account === 'guest') {
      setLastSaveState('failed', '请先登录后再使用服务端存档', '')
      return false
    }

    queuePendingServerSave(slot, raw)
    applyActiveSlotSelection(slot, 'server')

    const syncResult = await syncPendingServerSaves({ slots: [slot] })
    if (syncResult.syncedSlots.includes(slot)) {
      setLastSaveState(
        'saved',
        '',
        syncResult.pendingSlots.length > 0
          ? '当前进度已同步，其他待同步存档会继续自动补传。'
          : '已保存到服务端存档。'
      )
      return true
    }

    setLastSaveState('queued', '', '服务暂时不可用，当前进度已先保存在浏览器，恢复后会自动同步。')
    return true
  }

  const getRawByMode = async (
    slot: number,
    mode: SaveMode = storageMode.value,
    options: { allowPendingServerCopy?: boolean } = {}
  ): Promise<string | null> => {
    if (mode === 'server') {
      const allowPendingServerCopy = options.allowPendingServerCopy !== false
      const pendingRaw = getPendingServerRaw(slot)
      if (pendingRaw && !allowPendingServerCopy) return null
      try {
        const serverRaw = await fetchServerSlotRaw(slot)
        return allowPendingServerCopy ? (pendingRaw ?? serverRaw) : serverRaw
      } catch (error) {
        if (allowPendingServerCopy && pendingRaw) return pendingRaw
        throw error
      }
    }
    return localStorage.getItem(getSaveKey(slot))
  }

  const setRawByMode = async (slot: number, raw: string): Promise<boolean> => {
    if (storageMode.value === 'server') {
      return persistServerRaw(slot, raw)
    }
    localStorage.setItem(getSaveKey(slot), raw)
    return true
  }

  const removeRawByMode = async (slot: number) => {
    if (storageMode.value === 'server') {
      await deleteServerSlotRaw(slot)
      clearPendingServerSave(slot)
      return
    }
    localStorage.removeItem(getSaveKey(slot))
  }

  /** 获取所有存档槽位信息 */
  const getSlots = async (mode: SaveMode = storageMode.value): Promise<SaveSlotInfo[]> => {
    try {
      if (mode === 'server') {
        const slotStates = await buildMergedServerSlotStates()
        return slotStates.map((state, slot) => parseSlotInfo(slot, state.raw, state.pendingSync, state.readBlocked))
      }
      return Array.from({ length: MAX_SLOTS }, (_, slot) => parseSlotInfo(slot, localStorage.getItem(getSaveKey(slot))))
    } catch {
      return createEmptySlots({ readBlocked: mode === 'server' })
    }
  }

  /** 为新游戏分配一个空闲槽位，无空槽则返回 -1 */
  const assignNewSlot = async (): Promise<number> => {
    const slots = await getSlots()
    const blockReason = getSlotAllocationBlockReason()
    if (blockReason) {
      lastSaveErrorMessage.value = blockReason
      return -1
    }
    const empty = slots.find(s => !s.exists)
    const slot = empty ? empty.slot : -1
    applyActiveSlotSelection(slot, storageMode.value)
    return slot
  }

  /** 保存到指定槽位 */
  const saveToSlot = async (slot: number): Promise<boolean> => {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    lastSaveErrorMessage.value = ''
    const blockReason = getSaveBlockReason()
    if (blockReason) {
      setLastSaveState('failed', blockReason, lastServerSyncMessage.value)
      return false
    }
    try {
      const targetMode = storageMode.value
      const data = buildCurrentSaveData()
      const ok = await setRawByMode(slot, encrypt(JSON.stringify(data)))
      if (!ok) return false
      applyActiveSlotSelection(slot, targetMode)
      setRuntimeSession(slot, targetMode)
      if (targetMode !== 'server') {
        setLastSaveState('saved', '', '')
      }
      return true
    } catch (error) {
      if (!lastSaveErrorMessage.value) {
        setLastSaveState('failed', error instanceof Error ? error.message : '保存失败。', lastServerSyncMessage.value)
      }
      return false
    }
  }

  /** 鑷姩瀛樻。鍒板綋鍓嶆椿璺冩Ы浣?*/
  const autoSave = async (): Promise<boolean> => {
    if (activeSlot.value < 0) return false
    if (activeSlotMode.value !== storageMode.value) return false
    return await saveToSlot(activeSlot.value)
  }

  /** 浠庢寚瀹氭Ы浣嶅姞杞?*/
  const loadFromSlot = async (slot: number, options: LoadFromSlotOptions = {}): Promise<boolean> => {
    try {
      const loadMode = options.mode ?? storageMode.value
      const allowPendingServerCopy = options.allowPendingServerCopy !== false
      const hadPendingServerCopy = loadMode === 'server' && !!getPendingServerRaw(slot)
      if (hadPendingServerCopy && !allowPendingServerCopy) return false
      const raw = await getRawByMode(slot, loadMode, { allowPendingServerCopy })
      if (!raw) return false

      const data = parseSaveData(raw)
      if (!data || !normalizeSaveEnvelope(data)) return false
      const runtimeSnapshot = buildCurrentSaveData()
      const previousActiveSlot = activeSlot.value
      const previousActiveSlotMode = activeSlotMode.value
      const previousRuntimeSessionSlot = runtimeSessionSlot.value
      const previousRuntimeSessionMode = runtimeSessionMode.value
      const previousActiveSlotsByMode = { ...activeSlotsByMode.value }
      const applied = applySaveData(data, slot, loadMode)
      if (!applied) return false
      if (loadMode === 'server') {
        if (hadPendingServerCopy) {
          applyActiveSlotSelection(slot, 'server')
          setRuntimeSession(slot, 'server')
          void syncPendingServerSaves({ slots: [slot] })
          return true
        }
        try {
          await setServerActiveSlot(slot)
        } catch {
          const restored = applySaveData(
            runtimeSnapshot,
            previousRuntimeSessionSlot,
            previousRuntimeSessionMode ?? previousActiveSlotMode ?? loadMode
          )
          if (!restored) {
            return false
          }
          activeSlot.value = previousActiveSlot
          activeSlotMode.value = previousActiveSlotMode
          runtimeSessionSlot.value = previousRuntimeSessionSlot
          runtimeSessionMode.value = previousRuntimeSessionMode
          activeSlotsByMode.value = { ...previousActiveSlotsByMode }
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }

  /** 鍒犻櫎鎸囧畾妲戒綅 */
  const deleteSlot = async (slot: number): Promise<boolean> => {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    try {
      await removeRawByMode(slot)
    } catch {
      return false
    }
    if (activeSlot.value === slot && activeSlotMode.value === storageMode.value) {
      applyActiveSlotSelection(-1, storageMode.value)
    }
    if (runtimeSessionSlot.value === slot && runtimeSessionMode.value === storageMode.value) {
      setRuntimeSession(-1, null)
    }
    return true
  }

  /** 瀵煎嚭瀛樻。涓哄姞瀵嗘枃浠?*/
  const exportSave = async (slot: number, mode: SaveMode = storageMode.value): Promise<boolean> => {
    try {
      const raw = await getRawByMode(slot, mode)
      if (!raw) return false
      const info = (await getSlots(mode)).find(s => s.slot === slot)
      const name = info?.exists
        ? `桃源乡_存档${slot + 1}_第${info.year}年_${SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] ?? info.season}_第${info.day}天`
        : `桃源乡_存档${slot + 1}`
      const fileName = `${sanitizeExportFileName(name)}${SAVE_FILE_EXT}`

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: fileName,
          data: raw,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        })
        const uri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        })
        await Share.share({
          title: fileName,
          text: '桃源乡存档文件',
          url: uri.uri,
          dialogTitle: '导出存档',
        })
        return true
      }

      const blob = new Blob([raw], { type: 'application/octet-stream' })
      saveAs(blob, fileName)
      return true
    } catch {
      return false
    }
  }

  /** 浠庢枃浠跺鍏ュ瓨妗ｅ埌鎸囧畾妲戒綅 */
  const importSave = async (slot: number, fileContent: string): Promise<boolean> => {
    if (slot < 0 || slot >= MAX_SLOTS) return false
    try {
      // 楠岃瘉鏂囦欢鍐呭鍙В瀵?
      const data = parseSaveData(fileContent)
      if (!data || !normalizeSaveEnvelope(data)) return false
      const runtimeSnapshot = buildCurrentSaveData()
      const previousActiveSlot = activeSlot.value
      const previousActiveSlotMode = activeSlotMode.value
      const previousRuntimeSessionSlot = runtimeSessionSlot.value
      const previousRuntimeSessionMode = runtimeSessionMode.value
      const previousActiveSlotsByMode = { ...activeSlotsByMode.value }
      const restoreMode = previousRuntimeSessionMode ?? previousActiveSlotMode ?? storageMode.value
      const validationPassed = applySaveData(data, previousActiveSlot, restoreMode)
      const restorePassed = applySaveData(runtimeSnapshot, previousRuntimeSessionSlot, restoreMode)
      activeSlot.value = previousActiveSlot
      activeSlotMode.value = previousActiveSlotMode
      runtimeSessionSlot.value = previousRuntimeSessionSlot
      runtimeSessionMode.value = previousRuntimeSessionMode
      activeSlotsByMode.value = { ...previousActiveSlotsByMode }
      if (!validationPassed || !restorePassed) return false
      return await setRawByMode(slot, fileContent)
    } catch {
      return false
    }
  }

  const getBuiltInSampleSaves = (): BuiltInSampleSaveInfo[] =>
    BUILT_IN_SAMPLE_SAVES.map(sample => ({
      id: sample.id,
      label: sample.label,
      description: sample.description,
      tags: [...sample.tags],
      tier: sample.tier,
      recommendedRouteName: sample.recommendedRouteName,
      focusAreas: [...sample.focusAreas],
      smokeChecks: sample.smokeChecks.map(check => ({ ...check }))
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
    runtimeSessionSlot,
    runtimeSessionMode,
    storageMode,
    serverSyncStatus,
    pendingServerSlots,
    lastServerSyncMessage,
    lastSaveResultStatus,
    qaGovernanceBaselineAudit,
    qaGovernanceOverview,
    qaGovernanceCrossSystemOverview,
    qaGovernanceStorageActionLocks,
    qaGovernanceTuning,
    lastSaveErrorMessage,
    getSlotAllocationBlockReason,
    reloadAccountScopedState,
    getQaGovernanceStorageOverview,
    refreshPendingServerState,
    hasPendingServerSave,
    setStorageMode,
    setQaGovernanceStorageMode,
    getSlots,
    assignNewSlot,
    saveToSlot,
    autoSave,
    syncPendingServerSaves,
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

