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
import { usePotentialStore } from './usePotentialStore'
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
import { useQuarryStore } from './useQuarryStore'
import { useRegionMapStore } from './useRegionMapStore'
import { useFrontierChronicleStore } from './useFrontierChronicleStore'
import { usePlayerRecordCenterStore } from './usePlayerRecordCenterStore'
import { useEquipmentAccessoryStore } from './useEquipmentAccessoryStore'
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
import { createDefaultQuarrySaveData } from '@/data/quarry'
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
import { deleteServerSlotRaw, fetchServerSlotEntries, fetchServerSlotRaw, saveServerSlotRaw, setServerActiveSlot } from '@/utils/serverSaveApi'
import type { ServerSaveFieldAnomaly, ServerSaveFieldRepairSummary } from '@/utils/serverSaveApi'
import { isProtectedApiError } from '@/utils/protectedApi'
import { _registerGameplaySaveContextGetter } from '@/composables/useGameLog'

const LEGACY_SAVE_KEY_PREFIX = 'taoyuanxiang_save_'
const MAX_SLOTS = 3
const ENCRYPTION_KEY = 'taoyuanxiang_2024_secret'
const SAVE_FILE_EXT = '.tyx'
const SAVE_VERSION = 6
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
export type SaveExecutionStatus = 'saved' | 'queued' | 'failed' | 'conflict'
export type ServerSaveConflictResolution = 'local' | 'remote'
export interface LoadFromSlotOptions {
  mode?: SaveMode
  allowPendingServerCopy?: boolean
}

interface SaveMeta {
  saveVersion: number
  savedAt: string
  onlineIdentity?: OnlineSaveIdentity | null
}

interface SaveEnvelope {
  meta: SaveMeta
  data: Record<string, any>
}

export interface OnlineSaveIdentity {
  save_id: number
  account_username: string
  save_slot: number | null
  nickname_snapshot?: string
  created_at?: number
  updated_at?: number
}

interface OnlineMailRewardsState {
  appliedDeliveries: Record<string, Record<string, any>>
}

const getSaveKeyPrefix = (): string => buildScopedStorageKey(LEGACY_SAVE_KEY_PREFIX)

const getSaveKey = (slot: number): string => {
  const scopedPrefix = getSaveKeyPrefix()
  migrateLegacyScopedSlots(LEGACY_SAVE_KEY_PREFIX, scopedPrefix, MAX_SLOTS)
  return `${scopedPrefix}${slot}`
}

const getPendingServerSaveKey = (): string => buildScopedSingleKey(PENDING_SERVER_SAVE_KEY_PREFIX)

const isValidSlot = (slot: number): boolean => Number.isInteger(slot) && slot >= 0 && slot < MAX_SLOTS

type PendingServerSaveSource = 'runtime' | 'import' | 'external'

const normalizePendingServerSaveSource = (source: unknown): PendingServerSaveSource => (
  source === 'runtime' || source === 'import' || source === 'external' ? source : 'external'
)

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
      const rawBaseRevision = (entry as any).baseRevision ?? (entry as any).base_revision ?? (entry as any).revision
      const baseRevision = Number.isFinite(Number(rawBaseRevision)) ? Math.max(0, Math.floor(Number(rawBaseRevision))) : 0
      next[slot] = {
        raw: entry.raw,
        savedAt: typeof entry.savedAt === 'string' && entry.savedAt ? entry.savedAt : new Date().toISOString(),
        updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : Date.now(),
        baseRevision,
        source: normalizePendingServerSaveSource((entry as any).source)
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

const buildPendingServerSaveEntry = (
  raw: string,
  baseRevision: number,
  source: PendingServerSaveSource = 'external'
): PendingServerSaveEntry => ({
  raw,
  savedAt: new Date().toISOString(),
  updatedAt: Date.now(),
  baseRevision: Math.max(0, Math.floor(Number(baseRevision) || 0)),
  source
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

export interface ServerSaveConflictState {
  slot: number
  localRaw: string
  remoteRaw: string | null
  localSummary: SaveSlotInfo
  remoteSummary: SaveSlotInfo
  localBaseRevision: number
  localSource?: PendingServerSaveSource
  remoteRevision: number
  occurredAt: string
}

export interface ServerSaveFieldAnomalyDetails {
  phase?: string
  anomaly_count: number
  repaired_count?: number
  repair_attempted?: boolean
  required_operation?: string
  anomalies: ServerSaveFieldAnomaly[]
}

export interface ServerSaveFieldAnomalyState {
  slot: number
  localRaw: string
  baseRevision: number
  summary: SaveSlotInfo
  details: ServerSaveFieldAnomalyDetails
  occurredAt: string
}

export type SaveLoadFailureCode =
  | 'invalid_slot'
  | 'pending_copy_blocked'
  | 'empty_slot'
  | 'decrypt_failed'
  | 'json_parse_failed'
  | 'migration_failed'
  | 'incompatible_schema'
  | 'apply_failed'
  | 'server_read_failed'
  | 'server_active_slot_failed'
  | 'runtime_restore_failed'
  | 'unexpected'

export interface SaveLoadErrorState {
  code: SaveLoadFailureCode
  message: string
  slot: number
  mode: SaveMode
  detail?: string
  occurredAt: string
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

interface ApplySaveDataOptions {
  builtInSample?: BuiltInSampleSaveInfo | null
}

interface PendingServerSaveEntry {
  raw: string
  savedAt: string
  updatedAt: number
  baseRevision: number
  source: PendingServerSaveSource
}

type PendingServerSaveMap = Partial<Record<number, PendingServerSaveEntry>>

const normalizeOnlineSaveIdentity = (entry: any): OnlineSaveIdentity | null => {
  const saveId = Number(entry?.save_id ?? entry?.saveId)
  const saveSlot = Number(entry?.save_slot ?? entry?.saveSlot)
  const accountUsername = String(entry?.account_username ?? entry?.accountUsername ?? '').trim()
  if (!Number.isInteger(saveId) || !accountUsername) return null
  return {
    save_id: saveId,
    account_username: accountUsername,
    save_slot: Number.isInteger(saveSlot) ? saveSlot : null,
    nickname_snapshot: typeof entry?.nickname_snapshot === 'string' ? entry.nickname_snapshot : entry?.nicknameSnapshot,
    created_at: Number.isFinite(Number(entry?.created_at ?? entry?.createdAt)) ? Number(entry?.created_at ?? entry?.createdAt) : undefined,
    updated_at: Number.isFinite(Number(entry?.updated_at ?? entry?.updatedAt)) ? Number(entry?.updated_at ?? entry?.updatedAt) : undefined
  }
}

const createEmptyOnlineMailRewards = (): OnlineMailRewardsState => ({
  appliedDeliveries: {}
})

const normalizeOnlineMailRewards = (value: unknown): OnlineMailRewardsState => {
  if (!value || typeof value !== 'object') return createEmptyOnlineMailRewards()
  const source = value as { appliedDeliveries?: unknown }
  const appliedDeliveries = source.appliedDeliveries && typeof source.appliedDeliveries === 'object'
    ? source.appliedDeliveries as Record<string, unknown>
    : {}
  return {
    appliedDeliveries: Object.fromEntries(
      Object.entries(appliedDeliveries)
        .filter(([deliveryId, entry]) => !!deliveryId && !!entry && typeof entry === 'object')
        .map(([deliveryId, entry]) => [deliveryId, { ...(entry as Record<string, any>) }])
    )
  }
}

const cloneOnlineMailRewards = (value: OnlineMailRewardsState): OnlineMailRewardsState => ({
  appliedDeliveries: Object.fromEntries(
    Object.entries(value.appliedDeliveries ?? {}).map(([deliveryId, entry]) => [deliveryId, { ...entry }])
  )
})

const buildSaveMeta = (savedAt?: string, saveVersion: number = SAVE_VERSION, onlineIdentity?: OnlineSaveIdentity | null): SaveMeta => ({
  saveVersion,
  savedAt: savedAt ?? new Date().toISOString(),
  ...(onlineIdentity ? { onlineIdentity } : {})
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

  if (!next.quarry || typeof next.quarry !== 'object') {
    next.quarry = createDefaultQuarrySaveData()
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
      ...next.npc,
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
      randomNpcBoard: next.npc.randomNpcBoard ?? undefined,
      friendshipVersion: next.npc.friendshipVersion
    }
  }

  if (next.quest && typeof next.quest === 'object') {
    next.quest = {
      ...next.quest,
      boardQuests: next.quest.boardQuests ?? [],
      activeQuests: next.quest.activeQuests ?? [],
      completedQuestCount: next.quest.completedQuestCount ?? 0,
      completedQuestHistory: next.quest.completedQuestHistory ?? [],
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
      booksellerStockKey: '',
      booksellerStock: [],
      ownedBooksellerBookIds: [],
      shippingBox: [],
      shippedItems: [],
      shippingHistory: {},
      blacksmithWeeklyPurchases: {},
      shippingItemHistory: {},
      shippingLifetimeCategoryTotals: {},
      shippingLifetimeItemTotals: {},
      marketDynamics: createDefaultMarketDynamicsState()
    }
  } else {
    next.shop = {
      ...next.shop,
      ownedCatalogOfferIds: next.shop.ownedCatalogOfferIds ?? [],
      catalogExpansionState: next.shop.catalogExpansionState ?? createDefaultShopCatalogExpansionState(),
      travelingStockKey: next.shop.travelingStockKey ?? '',
      travelingStock: next.shop.travelingStock ?? [],
      booksellerStockKey: next.shop.booksellerStockKey ?? '',
      booksellerStock: next.shop.booksellerStock ?? [],
      ownedBooksellerBookIds: next.shop.ownedBooksellerBookIds ?? [],
      shippingBox: next.shop.shippingBox ?? [],
      shippedItems: next.shop.shippedItems ?? [],
      shippingHistory: next.shop.shippingHistory ?? {},
      blacksmithWeeklyPurchases: next.shop.blacksmithWeeklyPurchases ?? {},
      shippingItemHistory: next.shop.shippingItemHistory ?? {},
      shippingLifetimeCategoryTotals: next.shop.shippingLifetimeCategoryTotals ?? {},
      shippingLifetimeItemTotals: next.shop.shippingLifetimeItemTotals ?? {},
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

  next.onlineMailRewards = normalizeOnlineMailRewards(next.onlineMailRewards)

  return next
}

const normalizeSaveEnvelope = (raw: Record<string, any>): SaveEnvelope | null => {
  if (!raw || typeof raw !== 'object') return null

  const metaLike = raw.meta && typeof raw.meta === 'object' ? raw.meta : undefined
  const hasEnvelopeData = raw.data && typeof raw.data === 'object'
  const saveVersion = Number(metaLike?.saveVersion ?? raw.saveVersion ?? (hasEnvelopeData ? SAVE_VERSION : 1))
  const savedAt = String(metaLike?.savedAt ?? raw.savedAt ?? raw.data?.savedAt ?? new Date().toISOString())
  const onlineIdentity = normalizeOnlineSaveIdentity(metaLike?.onlineIdentity ?? metaLike?.saveIdentity ?? raw.onlineIdentity ?? raw.saveIdentity ?? raw.data?.onlineIdentity ?? raw.data?.saveIdentity)

  if (hasEnvelopeData) {
    return {
      meta: buildSaveMeta(savedAt, Number.isFinite(saveVersion) ? saveVersion : SAVE_VERSION, onlineIdentity),
      data: migrateSavePayload(raw.data as Record<string, any>, saveVersion)
    }
  }

  return {
    meta: buildSaveMeta(savedAt, Number.isFinite(saveVersion) ? saveVersion : 1, onlineIdentity),
    data: migrateSavePayload(raw, saveVersion)
  }
}

const LOAD_FAILURE_MESSAGES: Record<SaveLoadFailureCode, string> = {
  invalid_slot: '存档槽位无效，请刷新存档列表后重试。',
  pending_copy_blocked: '该服务端存档还有未同步的本地副本，请先完成同步或刷新远端存档。',
  empty_slot: '该存档槽位为空或暂时无法读取。',
  decrypt_failed: '存档无法解密，可能已损坏或不是当前版本的桃源乡存档。',
  json_parse_failed: '存档内容不是有效数据，可能已损坏或被手动修改。',
  migration_failed: '存档迁移失败，当前版本暂时无法读取该存档。',
  incompatible_schema: '存档缺少必要数据，可能来自不兼容版本或已损坏。',
  apply_failed: '存档数据恢复失败，当前运行状态已保留。',
  server_read_failed: '读取服务端存档失败，请检查网络或稍后重试。',
  server_active_slot_failed: '服务端当前存档槽位切换失败，已保留原运行状态。',
  runtime_restore_failed: '加载失败后恢复原运行状态失败，请刷新页面后再试。',
  unexpected: '加载存档失败，请刷新存档列表后重试。'
}

const getErrorDetail = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return ''
}

const extractServerSaveFieldAnomalyDetails = (error: unknown): ServerSaveFieldAnomalyDetails | null => {
  if (!isProtectedApiError(error) || error.status !== 422) return null
  const payload = error.data as any
  if (payload?.code !== 'TAOYUAN_SAVE_FIELD_ANOMALY') return null
  const details = payload?.details && typeof payload.details === 'object' ? payload.details : {}
  const anomalies = Array.isArray(details.anomalies)
    ? details.anomalies.filter((entry: unknown): entry is ServerSaveFieldAnomaly => !!entry && typeof entry === 'object')
    : []
  return {
    phase: typeof details.phase === 'string' ? details.phase : undefined,
    anomaly_count: Number.isFinite(Number(details.anomaly_count)) ? Math.max(0, Math.floor(Number(details.anomaly_count))) : anomalies.length,
    repaired_count: Number.isFinite(Number(details.repaired_count)) ? Math.max(0, Math.floor(Number(details.repaired_count))) : undefined,
    repair_attempted: details.repair_attempted === true,
    required_operation: typeof details.required_operation === 'string' ? details.required_operation : undefined,
    anomalies
  }
}

const parseSaveDataForLoad = (raw: string): {
  ok: true
  rawData: Record<string, any>
  envelope: SaveEnvelope
} | {
  ok: false
  code: SaveLoadFailureCode
  detail?: string
} => {
  const decrypted = decrypt(raw)
  if (!decrypted) return { ok: false, code: 'decrypt_failed' }

  let rawData: Record<string, any>
  try {
    rawData = JSON.parse(decrypted) as Record<string, any>
  } catch (error) {
    return { ok: false, code: 'json_parse_failed', detail: getErrorDetail(error) }
  }

  try {
    const envelope = normalizeSaveEnvelope(rawData)
    if (!envelope) return { ok: false, code: 'incompatible_schema' }
    return { ok: true, rawData, envelope }
  } catch (error) {
    return { ok: false, code: 'migration_failed', detail: getErrorDetail(error) }
  }
}

export const useSaveStore = defineStore('save', () => {
  /** 当前活跃存档槽位，-1 表示未分配 */
  const activeSlot = ref(-1)
  /** 当前活跃存档槽位所属模式，用于防止切换存储介质后误写入 */
  const activeSlotMode = ref<SaveMode | null>(null)
  const runtimeSessionSlot = ref(-1)
  const runtimeSessionMode = ref<SaveMode | null>(null)
  const currentOnlineIdentity = ref<OnlineSaveIdentity | null>(null)
  const onlineMailRewards = ref<OnlineMailRewardsState>(createEmptyOnlineMailRewards())
  const activeBuiltInSampleSave = ref<BuiltInSampleSaveInfo | null>(null)
  const isBuiltInSampleRuntime = computed(() => activeBuiltInSampleSave.value !== null)
  const activeSlotsByMode = ref<Record<SaveMode, number>>({
    local: -1,
    server: -1
  })
  const storageMode = ref<SaveMode>(getStoredSaveMode())
  const lastSaveErrorMessage = ref('')
  const lastLoadError = ref<SaveLoadErrorState | null>(null)
  const lastLoadErrorMessage = computed(() => lastLoadError.value?.message || '')
  const serverSyncStatus = ref<ServerSaveSyncStatus>('idle')
  const pendingServerSlots = ref<number[]>(getPendingServerSlotNumbers())
  let syncPendingServerSavesInFlight = false
  const lastServerSyncMessage = ref('')
  const lastSaveResultStatus = ref<SaveExecutionStatus>('saved')
  const serverSaveConflict = ref<ServerSaveConflictState | null>(null)
  const serverSaveFieldAnomaly = ref<ServerSaveFieldAnomalyState | null>(null)
  const serverSlotsFetchState = ref<'unknown' | 'available' | 'unavailable'>(
    getStoredSaveMode() === 'server' ? 'unknown' : 'available'
  )
  const lastIssuedServerRevisionBySlot = ref<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0
  })
  const lastAuthoritativeServerRawBySlot = ref<Partial<Record<number, string>>>({})

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
    currentOnlineIdentity.value = null
    onlineMailRewards.value = createEmptyOnlineMailRewards()
    activeBuiltInSampleSave.value = null
    serverSaveConflict.value = null
    serverSaveFieldAnomaly.value = null
    lastLoadError.value = null
    lastIssuedServerRevisionBySlot.value = { 0: 0, 1: 0, 2: 0 }
    lastAuthoritativeServerRawBySlot.value = {}
    serverSlotsFetchState.value = storageMode.value === 'server' ? 'unknown' : 'available'
    refreshPendingServerState()
  }

  const setLastSaveState = (status: SaveExecutionStatus, errorMessage = '', syncMessage = lastServerSyncMessage.value) => {
    lastSaveResultStatus.value = status
    lastSaveErrorMessage.value = errorMessage
    lastServerSyncMessage.value = syncMessage
  }

  const setLoadError = (
    code: SaveLoadFailureCode,
    slot: number,
    mode: SaveMode,
    detail = ''
  ) => {
    lastLoadError.value = {
      code,
      message: LOAD_FAILURE_MESSAGES[code] || LOAD_FAILURE_MESSAGES.unexpected,
      slot,
      mode,
      detail,
      occurredAt: new Date().toISOString()
    }
  }

  const clearLoadError = () => {
    lastLoadError.value = null
  }

  const rememberServerSlotState = (slot: number, raw: string | null | undefined, revision: number | null | undefined) => {
    if (!isValidSlot(slot)) return
    const normalizedRevision = Number.isFinite(Number(revision)) ? Math.max(0, Math.floor(Number(revision))) : 0
    lastIssuedServerRevisionBySlot.value = {
      ...lastIssuedServerRevisionBySlot.value,
      [slot]: Math.max(lastIssuedServerRevisionBySlot.value[slot] ?? 0, normalizedRevision)
    }
    if (typeof raw === 'string' && raw) {
      lastAuthoritativeServerRawBySlot.value = {
        ...lastAuthoritativeServerRawBySlot.value,
        [slot]: raw
      }
    }
  }

  const acknowledgeServerSlotRevision = (slot: number | null | undefined, revision: number | null | undefined) => {
    const normalizedSlot = Number(slot)
    if (!Number.isInteger(normalizedSlot) || !isValidSlot(normalizedSlot)) return
    rememberServerSlotState(normalizedSlot, null, revision)
  }

  const hasOnlineMailRewardDelivery = (deliveryId: string | null | undefined): boolean => {
    const normalizedId = String(deliveryId || '').trim()
    return !!normalizedId && !!onlineMailRewards.value.appliedDeliveries[normalizedId]
  }

  const recordOnlineMailRewardDelivery = (deliveryId: string | null | undefined, entry: Record<string, any>) => {
    const normalizedId = String(deliveryId || '').trim()
    if (!normalizedId) return
    onlineMailRewards.value = {
      appliedDeliveries: {
        ...onlineMailRewards.value.appliedDeliveries,
        [normalizedId]: {
          ...entry,
          delivery_id: normalizedId
        }
      }
    }
  }

  const queuePendingServerSave = (
    slot: number,
    raw: string,
    source: PendingServerSaveSource = 'runtime'
  ) => {
    const map = loadPendingServerSaveMap()
    const baseRevision = map[slot]?.baseRevision ?? Math.max(0, Math.floor(Number(lastIssuedServerRevisionBySlot.value[slot]) || 0))
    map[slot] = buildPendingServerSaveEntry(raw, baseRevision, source)
    persistPendingServerSaveMap(map)
    refreshPendingServerState()
  }

  const persistPendingServerSaveEntry = (slot: number, entry: PendingServerSaveEntry) => {
    if (!isValidSlot(slot) || !entry.raw) return
    const map = loadPendingServerSaveMap()
    map[slot] = entry
    persistPendingServerSaveMap(map)
    refreshPendingServerState()
  }

  const clearPendingServerSave = (slot: number) => {
    const map = loadPendingServerSaveMap()
    delete map[slot]
    persistPendingServerSaveMap(map)
    if (serverSaveConflict.value?.slot === slot) {
      serverSaveConflict.value = null
    }
    refreshPendingServerState()
  }

  const clearPendingServerSaveIfUnchanged = (slot: number, expectedEntry: PendingServerSaveEntry) => {
    const map = loadPendingServerSaveMap()
    const currentEntry = map[slot]
    if (!currentEntry) return true
    if (
      currentEntry.baseRevision !== expectedEntry.baseRevision ||
      currentEntry.updatedAt !== expectedEntry.updatedAt ||
      currentEntry.raw !== expectedEntry.raw ||
      currentEntry.source !== expectedEntry.source
    ) {
      refreshPendingServerState()
      return false
    }
    delete map[slot]
    persistPendingServerSaveMap(map)
    if (serverSaveConflict.value?.slot === slot) {
      serverSaveConflict.value = null
    }
    refreshPendingServerState()
    return true
  }

  const getPendingServerRaw = (slot: number): string | null => {
    const map = loadPendingServerSaveMap()
    return typeof map[slot]?.raw === 'string' ? map[slot]!.raw : null
  }

  const hasPendingServerSave = (slot: number): boolean => !!getPendingServerRaw(slot)

  const extractOnlineIdentityFromRaw = (raw: string | null | undefined): OnlineSaveIdentity | null => {
    if (!raw) return null
    const parsed = parseSaveData(raw)
    const normalized = parsed ? normalizeSaveEnvelope(parsed) : null
    return normalizeOnlineSaveIdentity(normalized?.meta.onlineIdentity ?? normalized?.data?.onlineIdentity)
  }

  const refreshRuntimeOnlineIdentityFromRaw = (slot: number, mode: SaveMode, raw: string | null | undefined) => {
    if (runtimeSessionSlot.value !== slot || runtimeSessionMode.value !== mode) return false
    const identity = extractOnlineIdentityFromRaw(raw)
    if (!identity) return false
    currentOnlineIdentity.value = identity
    return true
  }

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
    if (mode !== 'server') clearServerSaveConflict()
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
    const potentialStore = usePotentialStore()
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
    const quarryStore = useQuarryStore()
    const regionMapStore = useRegionMapStore()
    const frontierChronicleStore = useFrontierChronicleStore()
    const playerRecordCenterStore = usePlayerRecordCenterStore()
    const equipmentAccessoryStore = useEquipmentAccessoryStore()

    const payload = {
      game: gameStore.serialize(),
      player: playerStore.serialize(),
      inventory: inventoryStore.serialize(),
      farm: farmStore.serialize(),
      skill: skillStore.serialize(),
      potential: potentialStore.serialize(),
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
      quarry: quarryStore.serialize(),
      regionMap: regionMapStore.serialize(),
      frontierChronicle: frontierChronicleStore.serialize(),
      playerRecordCenter: playerRecordCenterStore.serialize(),
      equipmentAccessory: equipmentAccessoryStore.serialize(),
      onlineMailRewards: cloneOnlineMailRewards(onlineMailRewards.value)
    }

    const savedAt = new Date().toISOString()
    return {
      meta: buildSaveMeta(savedAt, SAVE_VERSION, currentOnlineIdentity.value),
      data: payload,
      savedAt
    }
  }

  const setServerSaveConflict = (
    slot: number,
    localEntry: PendingServerSaveEntry,
    remoteRaw: string | null,
    remoteRevision: number
  ) => {
    if (!isValidSlot(slot) || !localEntry.raw) return
    serverSaveConflict.value = {
      slot,
      localRaw: localEntry.raw,
      remoteRaw,
      localSummary: parseSlotInfo(slot, localEntry.raw, true, false),
      remoteSummary: parseSlotInfo(slot, remoteRaw, false, false),
      localBaseRevision: localEntry.baseRevision,
      localSource: localEntry.source,
      remoteRevision: Math.max(0, Math.floor(Number(remoteRevision) || 0)),
      occurredAt: new Date().toISOString()
    }
  }

  const clearServerSaveConflict = (slot?: number) => {
    if (slot === undefined || serverSaveConflict.value?.slot === slot) {
      serverSaveConflict.value = null
    }
  }

  const setServerSaveFieldAnomaly = (
    slot: number,
    localEntry: PendingServerSaveEntry,
    details: ServerSaveFieldAnomalyDetails,
    baseRevision = localEntry.baseRevision
  ) => {
    if (!isValidSlot(slot) || !localEntry.raw) return
    serverSaveFieldAnomaly.value = {
      slot,
      localRaw: localEntry.raw,
      baseRevision: Math.max(0, Math.floor(Number(baseRevision) || 0)),
      summary: parseSlotInfo(slot, localEntry.raw, true, false),
      details,
      occurredAt: new Date().toISOString()
    }
  }

  const clearServerSaveFieldAnomaly = (slot?: number) => {
    if (slot === undefined || serverSaveFieldAnomaly.value?.slot === slot) {
      serverSaveFieldAnomaly.value = null
    }
  }

  const dismissServerSaveFieldAnomaly = () => {
    clearServerSaveFieldAnomaly()
    if (lastSaveResultStatus.value === 'failed') {
      lastServerSyncMessage.value = ''
    }
  }

  const applySaveData = (
    data: Record<string, any>,
    slot: number,
    mode: SaveMode = storageMode.value,
    options: ApplySaveDataOptions = {},
  ): boolean => {
    const normalized = normalizeSaveEnvelope(data)
    if (!normalized) return false
    const payload = normalized.data

    const gameStore = useGameStore()
    const playerStore = usePlayerStore()
    const inventoryStore = useInventoryStore()
    const farmStore = useFarmStore()
    const skillStore = useSkillStore()
    const potentialStore = usePotentialStore()
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
    const quarryStore = useQuarryStore()
    const regionMapStore = useRegionMapStore()
    const frontierChronicleStore = useFrontierChronicleStore()
    const playerRecordCenterStore = usePlayerRecordCenterStore()
    const equipmentAccessoryStore = useEquipmentAccessoryStore()

      // 核心块缺失时直接拒绝加载，避免先重置当前会话再因反序列化失败把现场清空
    if (!payload.game || !payload.player || !payload.inventory || !payload.farm) {
      return false
    }
    const nextOnlineIdentity = normalizeOnlineSaveIdentity(normalized.meta.onlineIdentity ?? payload.onlineIdentity)

    const backup = {
      game: gameStore.serialize(),
      player: playerStore.serialize(),
      inventory: inventoryStore.serialize(),
      farm: farmStore.serialize(),
      skill: skillStore.serialize(),
      potential: potentialStore.serialize(),
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
      quarry: quarryStore.serialize(),
      regionMap: regionMapStore.serialize(),
      frontierChronicle: frontierChronicleStore.serialize(),
      playerRecordCenter: playerRecordCenterStore.serialize(),
      equipmentAccessory: equipmentAccessoryStore.serialize(),
      onlineMailRewards: cloneOnlineMailRewards(onlineMailRewards.value),
      currentOnlineIdentity: currentOnlineIdentity.value,
      activeBuiltInSampleSave: activeBuiltInSampleSave.value,
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
          seedQuality: null,
          infested: false,
          infestedDays: 0,
          weedy: false,
          weedyDays: 0
        })),
        sprinklers: [],
        fruitTrees: [],
        greenhouseFruitTrees: [],
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
      quarryStore.deserialize(emptyState)
      regionMapStore.deserialize(emptyState)
      frontierChronicleStore.deserialize(emptyState)
      playerRecordCenterStore.deserialize(emptyState)
      equipmentAccessoryStore.deserialize(emptyState)
      potentialStore.deserialize(emptyState)
      onlineMailRewards.value = createEmptyOnlineMailRewards()
    }

    const restoreRuntimeStores = (snapshot: typeof backup) => {
      gameStore.deserialize(snapshot.game)
      playerStore.deserialize(snapshot.player)
      inventoryStore.deserialize(snapshot.inventory)
      farmStore.deserialize(snapshot.farm)
      skillStore.deserialize(snapshot.skill)
      potentialStore.deserialize(snapshot.potential)
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
      quarryStore.deserialize(snapshot.quarry)
      regionMapStore.deserialize(snapshot.regionMap)
      frontierChronicleStore.deserialize(snapshot.frontierChronicle)
      playerRecordCenterStore.deserialize(snapshot.playerRecordCenter)
      equipmentAccessoryStore.deserialize(snapshot.equipmentAccessory)
      onlineMailRewards.value = cloneOnlineMailRewards(snapshot.onlineMailRewards)
      currentOnlineIdentity.value = snapshot.currentOnlineIdentity ?? null
      activeBuiltInSampleSave.value = snapshot.activeBuiltInSampleSave ?? null
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
      potentialStore.deserialize(payload.potential ?? {})
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
      quarryStore.deserialize(payload.quarry ?? {})
      if (payload.regionMap) regionMapStore.deserialize(payload.regionMap)
      if (payload.frontierChronicle) frontierChronicleStore.deserialize(payload.frontierChronicle)
      else frontierChronicleStore.deserialize({})
      if (payload.playerRecordCenter) playerRecordCenterStore.deserialize(payload.playerRecordCenter)
      else playerRecordCenterStore.deserialize({})
      equipmentAccessoryStore.deserialize(payload.equipmentAccessory ?? {})
      onlineMailRewards.value = normalizeOnlineMailRewards(payload.onlineMailRewards)
      goalStore.deserialize(payload.goal)
      if (payload.game && payload.game.tomorrowWeather == null) {
        gameStore.recalculateTomorrowWeather()
      }

      // 鍦ㄧ浉鍏?store 鍏ㄩ儴鍙嶅簭鍒楀寲瀹屾垚鍚庯紝鍐嶇粺涓€鍚屾 NPC 鍏崇郴濂栧姳锛岄伩鍏嶆棫妗ｅ鍔辫鍚炴垨椋熻氨琚悗缁?store 瑕嗙洊
      npcStore.rehydrateRelationshipPerks({ grantInventoryRewards: true, emitMessages: false })
      playerStore.normalizeDerivedState()

      currentOnlineIdentity.value = nextOnlineIdentity
      activeBuiltInSampleSave.value = options.builtInSample ?? null
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
      activeBuiltInSampleSave.value = backup.activeBuiltInSampleSave
      activeSlotsByMode.value = { ...backup.activeSlotsByMode }
      return false
    }
  }

  const buildMergedServerSlotStates = async (): Promise<Array<{ raw: string | null; pendingSync: boolean; readBlocked: boolean }>> => {
    const pendingMap = loadPendingServerSaveMap()
    try {
      const serverEntries = await fetchServerSlotEntries()
      serverSlotsFetchState.value = 'available'
      let hasRevisionConflict = false
      const states = Array.from({ length: MAX_SLOTS }, (_, slot) => {
        const serverEntry = serverEntries[slot] ?? { raw: null, revision: 0 }
        rememberServerSlotState(slot, serverEntry.raw, serverEntry.revision)
        const pendingEntry = pendingMap[slot]
        const pendingRaw = pendingEntry?.raw ?? null
        const pendingConflictsWithRemote = !!pendingEntry && serverEntry.revision > pendingEntry.baseRevision && pendingEntry.raw !== serverEntry.raw
        if (pendingConflictsWithRemote && pendingEntry) {
          hasRevisionConflict = true
          setServerSaveConflict(slot, pendingEntry, serverEntry.raw, serverEntry.revision)
        }
        return {
          raw: pendingConflictsWithRemote ? serverEntry.raw : (pendingRaw ?? serverEntry.raw ?? null),
          pendingSync: !!pendingRaw,
          readBlocked: false
        }
      })
      if (hasRevisionConflict) {
        serverSyncStatus.value = serverSyncStatus.value === 'syncing' ? serverSyncStatus.value : 'error'
        lastServerSyncMessage.value = '服务端存档已在其他设备更新，本地待同步副本已暂停上传。请比较后选择要保存哪一个。'
      }
      return states
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
    if (syncPendingServerSavesInFlight) {
      return {
        attempted: false,
        syncedSlots: [] as number[],
        failedSlots: [] as number[],
        invalidSlots: [] as number[],
        staleSlots: [] as number[],
        pendingSlots: [...refreshPendingServerState()]
      }
    }
    syncPendingServerSavesInFlight = true
    try {
    if (!account || account === 'guest') {
      const currentPending = refreshPendingServerState()
      if (currentPending.length === 0 && serverSyncStatus.value === 'syncing') {
        serverSyncStatus.value = 'idle'
      }
      return {
        attempted: false,
        syncedSlots: [] as number[],
        failedSlots: [] as number[],
        invalidSlots: [] as number[],
        staleSlots: [] as number[],
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
        invalidSlots: [] as number[],
        staleSlots: [] as number[],
        pendingSlots: [...currentPending]
      }
    }

    serverSyncStatus.value = 'syncing'
    const syncedSlots: number[] = []
    const failedSlots: number[] = []
    const invalidSlots: number[] = []
    const staleSlots: number[] = []

    for (const { slot, entry } of pendingEntries) {
      try {
        const saveResult = await saveServerSlotRaw(slot, entry.raw, entry.baseRevision)
        rememberServerSlotState(slot, saveResult.raw, saveResult.currentRevision)
        if (saveResult.stale) {
          setServerSaveConflict(slot, entry, saveResult.raw, saveResult.currentRevision)
          failedSlots.push(slot)
          staleSlots.push(slot)
          continue
        }
        if (saveResult.raw) {
          refreshRuntimeOnlineIdentityFromRaw(slot, 'server', saveResult.raw)
        }
        if (clearPendingServerSaveIfUnchanged(slot, entry)) {
          clearServerSaveConflict(slot)
          clearServerSaveFieldAnomaly(slot)
          syncedSlots.push(slot)
        }
      } catch (error) {
        const fieldAnomalyDetails = extractServerSaveFieldAnomalyDetails(error)
        if (fieldAnomalyDetails) {
          setServerSaveFieldAnomaly(slot, entry, fieldAnomalyDetails)
          clearPendingServerSaveIfUnchanged(slot, entry)
          failedSlots.push(slot)
          invalidSlots.push(slot)
          continue
        }
        if (isProtectedApiError(error) && error.status === 422) {
          clearPendingServerSaveIfUnchanged(slot, entry)
          failedSlots.push(slot)
          invalidSlots.push(slot)
          continue
        }
        failedSlots.push(slot)
      }
    }

    const remainingPending = refreshPendingServerState()
    if (staleSlots.length > 0) {
      serverSyncStatus.value = 'error'
      lastServerSyncMessage.value = '云存档已在其他设备更新，本地待同步副本已暂停上传。请比较后选择要保存哪一个。'
    } else if (invalidSlots.length > 0) {
      serverSyncStatus.value = 'error'
      lastServerSyncMessage.value = serverSaveFieldAnomaly.value
        ? '云存档字段异常，已保留远端旧档。可确认修复异常字段后强制保存当前进度。'
        : '云存档数据无效，已保留远端旧档。请重新读取远端存档或导出本地备份后处理。'
    } else if (failedSlots.length > 0) {
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
      invalidSlots,
      staleSlots,
      pendingSlots: [...remainingPending]
    }
    } finally {
      syncPendingServerSavesInFlight = false
    }
  }

  const persistServerRaw = async (
    slot: number,
    raw: string,
    source: PendingServerSaveSource = 'runtime'
  ): Promise<boolean> => {
    const account = await ensureCurrentAccount()
    if (!account || account === 'guest') {
      setLastSaveState('failed', '请先登录后再使用服务端存档', '')
      return false
    }

    queuePendingServerSave(slot, raw, source)
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
    if (syncResult.invalidSlots.includes(slot)) {
      setLastSaveState(
        'failed',
        serverSaveFieldAnomaly.value?.slot === slot
          ? '云存档字段异常，已保留远端旧档。请在弹窗确认是否修复后强制保存。'
          : '云存档数据无效，已保留远端旧档。请重新读取远端存档或导出本地备份后处理。',
        lastServerSyncMessage.value
      )
      return false
    }
    if (syncResult.staleSlots.includes(slot)) {
      setLastSaveState(
        'conflict',
        '云存档已在其他设备更新，请选择保存当前页面或改用服务端存档。',
        lastServerSyncMessage.value
      )
      return false
    }

    setLastSaveState('queued', '', '服务暂时不可用，当前进度已先保存在浏览器，恢复后会自动同步。')
    return true
  }

  const buildFieldRepairMessage = (fieldRepair: ServerSaveFieldRepairSummary | null): string => {
    const repairedCount = Number(fieldRepair?.repaired_count ?? fieldRepair?.anomaly_count)
    return Number.isFinite(repairedCount) && repairedCount > 0
      ? `已修复 ${Math.floor(repairedCount)} 项异常字段并保存到服务端存档。`
      : '已修复异常字段并保存到服务端存档。'
  }

  const forceRepairServerSaveFieldAnomaly = async (): Promise<boolean> => {
    const anomaly = serverSaveFieldAnomaly.value
    if (!anomaly) return false
    const slot = anomaly.slot
    const localEntry: PendingServerSaveEntry = {
      raw: anomaly.localRaw,
      savedAt: anomaly.summary.savedAt ?? anomaly.occurredAt,
      updatedAt: Date.now(),
      baseRevision: anomaly.baseRevision,
      source: 'runtime'
    }
    try {
      serverSyncStatus.value = 'syncing'
      const saveResult = await saveServerSlotRaw(slot, anomaly.localRaw, anomaly.baseRevision, {
        repairFieldAnomalies: true
      })
      rememberServerSlotState(slot, saveResult.raw, saveResult.currentRevision)
      if (saveResult.stale) {
        setServerSaveConflict(slot, localEntry, saveResult.raw, saveResult.currentRevision)
        clearServerSaveFieldAnomaly(slot)
        serverSyncStatus.value = 'error'
        setLastSaveState(
          'conflict',
          '云存档又有新版本，请重新比较后再选择要保存哪一个。',
          '服务端存档已更新，本地修复副本仍已保留。'
        )
        return false
      }

      clearPendingServerSave(slot)
      clearServerSaveConflict(slot)
      clearServerSaveFieldAnomaly(slot)
      applyActiveSlotSelection(slot, 'server')
      setRuntimeSession(slot, 'server')

      const repairedRaw = saveResult.raw ?? anomaly.localRaw
      const parsed = repairedRaw ? parseSaveData(repairedRaw) : null
      const applied = parsed ? applySaveData(parsed, slot, 'server') : false
      if (!applied) {
        refreshRuntimeOnlineIdentityFromRaw(slot, 'server', repairedRaw)
      }

      serverSyncStatus.value = 'synced'
      setLastSaveState(
        'saved',
        '',
        applied
          ? buildFieldRepairMessage(saveResult.fieldRepair)
          : '异常字段已修复并写入服务端，但当前页面回读失败，请手动重新载入该服务端存档。'
      )
      return true
    } catch (error) {
      const fieldAnomalyDetails = extractServerSaveFieldAnomalyDetails(error)
      if (fieldAnomalyDetails) {
        setServerSaveFieldAnomaly(slot, localEntry, fieldAnomalyDetails, anomaly.baseRevision)
      }
      serverSyncStatus.value = 'error'
      setLastSaveState(
        'failed',
        fieldAnomalyDetails
          ? '自动修复后仍有字段异常，服务端旧档已保留。请导出本地备份后手动处理。'
          : getErrorDetail(error) || '修复并强制保存失败，服务端旧档已保留。',
        '服务端存档尚未覆盖。'
      )
      return false
    }
  }

  const getRawByMode = async (
    slot: number,
    mode: SaveMode = storageMode.value,
    options: { allowPendingServerCopy?: boolean } = {}
  ): Promise<string | null> => {
    if (mode === 'server') {
      const allowPendingServerCopy = options.allowPendingServerCopy !== false
      const pendingEntry = loadPendingServerSaveMap()[slot]
      const pendingRaw = pendingEntry?.raw ?? null
      try {
        const serverEntry = await fetchServerSlotRaw(slot)
        if (serverEntry) {
          rememberServerSlotState(slot, serverEntry.raw, serverEntry.revision)
        }
        const pendingConflictsWithRemote = !!pendingEntry && !!serverEntry && serverEntry.revision > pendingEntry.baseRevision && pendingEntry.raw !== serverEntry.raw
        if (pendingConflictsWithRemote) {
          setServerSaveConflict(slot, pendingEntry, serverEntry.raw, serverEntry.revision)
          serverSyncStatus.value = 'error'
          lastServerSyncMessage.value = '服务端存档已在其他设备更新，本地待同步副本已暂停上传。请比较后选择要保存哪一个。'
          return serverEntry.raw
        }
        if (pendingRaw && !allowPendingServerCopy) return null
        return allowPendingServerCopy ? (pendingRaw ?? serverEntry?.raw ?? null) : (serverEntry?.raw ?? null)
      } catch (error) {
        if (allowPendingServerCopy && pendingRaw) return pendingRaw
        throw error
      }
    }
    return localStorage.getItem(getSaveKey(slot))
  }

  const setRawByMode = async (
    slot: number,
    raw: string,
    source: PendingServerSaveSource = 'runtime'
  ): Promise<boolean> => {
    if (storageMode.value === 'server') {
      return persistServerRaw(slot, raw, source)
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
      if (targetMode === 'server') {
        refreshRuntimeOnlineIdentityFromRaw(slot, 'server', lastAuthoritativeServerRawBySlot.value[slot])
      }
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
    const loadMode = options.mode ?? storageMode.value
    clearLoadError()
    if (!isValidSlot(slot)) {
      setLoadError('invalid_slot', slot, loadMode)
      return false
    }
    try {
      const allowPendingServerCopy = options.allowPendingServerCopy !== false
      const hadPendingServerCopy = loadMode === 'server' && !!getPendingServerRaw(slot)
      if (hadPendingServerCopy && !allowPendingServerCopy) {
        setLoadError('pending_copy_blocked', slot, loadMode)
        return false
      }
      const raw = await getRawByMode(slot, loadMode, { allowPendingServerCopy })
      if (!raw) {
        setLoadError('empty_slot', slot, loadMode)
        return false
      }

      const parsed = parseSaveDataForLoad(raw)
      if (!parsed.ok) {
        setLoadError(parsed.code, slot, loadMode, parsed.detail)
        return false
      }
      if (!parsed.envelope.data.game || !parsed.envelope.data.player || !parsed.envelope.data.inventory || !parsed.envelope.data.farm) {
        setLoadError('incompatible_schema', slot, loadMode)
        return false
      }
      const runtimeSnapshot = buildCurrentSaveData()
      const previousActiveSlot = activeSlot.value
      const previousActiveSlotMode = activeSlotMode.value
      const previousRuntimeSessionSlot = runtimeSessionSlot.value
      const previousRuntimeSessionMode = runtimeSessionMode.value
      const previousActiveBuiltInSampleSave = activeBuiltInSampleSave.value
      const previousActiveSlotsByMode = { ...activeSlotsByMode.value }
      const applied = applySaveData(parsed.rawData, slot, loadMode)
      if (!applied) {
        setLoadError('apply_failed', slot, loadMode)
        return false
      }
      if (loadMode === 'server') {
        if (hadPendingServerCopy) {
          applyActiveSlotSelection(slot, 'server')
          setRuntimeSession(slot, 'server')
          void syncPendingServerSaves({ slots: [slot] })
          return true
        }
        try {
          await setServerActiveSlot(slot)
        } catch (error) {
          const restored = applySaveData(
            runtimeSnapshot,
            previousRuntimeSessionSlot,
            previousRuntimeSessionMode ?? previousActiveSlotMode ?? loadMode
          )
          if (!restored) {
            setLoadError('runtime_restore_failed', slot, loadMode, getErrorDetail(error))
            return false
          }
          activeSlot.value = previousActiveSlot
          activeSlotMode.value = previousActiveSlotMode
          runtimeSessionSlot.value = previousRuntimeSessionSlot
          runtimeSessionMode.value = previousRuntimeSessionMode
          activeBuiltInSampleSave.value = previousActiveBuiltInSampleSave
          activeSlotsByMode.value = { ...previousActiveSlotsByMode }
          setLoadError('server_active_slot_failed', slot, loadMode, getErrorDetail(error))
          return false
        }
      }
      return true
    } catch (error) {
      setLoadError(loadMode === 'server' ? 'server_read_failed' : 'unexpected', slot, loadMode, getErrorDetail(error))
      return false
    }
  }

  const resolveServerSaveConflict = async (choice: ServerSaveConflictResolution): Promise<boolean> => {
    const conflict = serverSaveConflict.value
    if (!conflict) return true
    const slot = conflict.slot
    const pendingEntry = loadPendingServerSaveMap()[slot]
    const localEntry = pendingEntry?.raw
      ? pendingEntry
      : {
          raw: conflict.localRaw,
          savedAt: conflict.localSummary.savedAt ?? conflict.occurredAt,
          updatedAt: Date.now(),
          baseRevision: conflict.localBaseRevision,
          source: conflict.localSource ?? 'external'
        }

    if (choice === 'local') {
      const shouldRefreshRuntimeCopy = localEntry.source === 'runtime' && (
        (activeSlot.value === slot && activeSlotMode.value === 'server') ||
        (runtimeSessionSlot.value === slot && runtimeSessionMode.value === 'server')
      )
      const blockReason = shouldRefreshRuntimeCopy ? getSaveBlockReason() : ''
      if (blockReason) {
        setLastSaveState('failed', blockReason, lastServerSyncMessage.value)
        return false
      }
      const uploadEntry = shouldRefreshRuntimeCopy
        ? buildPendingServerSaveEntry(
            encrypt(JSON.stringify(buildCurrentSaveData())),
            conflict.remoteRevision,
            'runtime'
          )
        : localEntry
      if (uploadEntry !== localEntry) {
        persistPendingServerSaveEntry(slot, uploadEntry)
      }

      try {
        serverSyncStatus.value = 'syncing'
        const saveResult = await saveServerSlotRaw(slot, uploadEntry.raw, conflict.remoteRevision)
        rememberServerSlotState(slot, saveResult.raw, saveResult.currentRevision)
        if (saveResult.stale) {
          setServerSaveConflict(slot, uploadEntry, saveResult.raw, saveResult.currentRevision)
          serverSyncStatus.value = 'error'
          setLastSaveState(
            'conflict',
            '云存档又有新版本，请重新比较后再选择要保存哪一个。',
            '服务端存档已更新，本地副本仍已保留。'
          )
          return false
        }
        clearPendingServerSave(slot)
        clearServerSaveConflict(slot)
        applyActiveSlotSelection(slot, 'server')
        setRuntimeSession(slot, 'server')
        refreshRuntimeOnlineIdentityFromRaw(slot, 'server', saveResult.raw ?? uploadEntry.raw)
        serverSyncStatus.value = 'synced'
        setLastSaveState('saved', '', '已保存当前进度并覆盖服务端存档。')
        return true
      } catch (error) {
        const fieldAnomalyDetails = extractServerSaveFieldAnomalyDetails(error)
        if (fieldAnomalyDetails) {
          setServerSaveFieldAnomaly(slot, uploadEntry, fieldAnomalyDetails, conflict.remoteRevision)
          serverSyncStatus.value = 'error'
          setLastSaveState(
            'failed',
            '云存档字段异常，已保留远端旧档。请在弹窗确认是否修复后强制保存。',
            '服务端存档冲突尚未解决。'
          )
          return false
        }
        serverSyncStatus.value = 'error'
        setLastSaveState(
          'failed',
          getErrorDetail(error) || '保存当前进度失败，本地副本仍已保留。',
          '服务端存档冲突尚未解决。'
        )
        return false
      }
    }

    const pendingMap = loadPendingServerSaveMap()
    const previousPending = pendingMap[slot]
    if (previousPending) {
      delete pendingMap[slot]
      persistPendingServerSaveMap(pendingMap)
      refreshPendingServerState()
    }

    const loaded = await loadFromSlot(slot, { mode: 'server', allowPendingServerCopy: false })
    if (!loaded) {
      if (previousPending) {
        const restoreMap = loadPendingServerSaveMap()
        restoreMap[slot] = previousPending
        persistPendingServerSaveMap(restoreMap)
        refreshPendingServerState()
        setServerSaveConflict(slot, previousPending, conflict.remoteRaw, conflict.remoteRevision)
      }
      setLastSaveState(
        'failed',
        lastLoadErrorMessage.value || '载入服务端存档失败，本地副本仍已保留。',
        lastServerSyncMessage.value
      )
      return false
    }

    clearServerSaveConflict(slot)
    clearServerSaveFieldAnomaly(slot)
    setLastSaveState('saved', '', '已载入服务端存档，当前页面副本已放弃。')
    return true
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
    if (slot < 0 || slot >= MAX_SLOTS) {
      setLastSaveState('failed', '存档槽位无效，请刷新存档列表后重试。', lastServerSyncMessage.value)
      return false
    }
    try {
      lastSaveErrorMessage.value = ''
      const normalizedFileContent = String(fileContent || '').trim()
      // 楠岃瘉鏂囦欢鍐呭鍙В瀵?
      const data = parseSaveData(normalizedFileContent)
      if (!data || !normalizeSaveEnvelope(data)) {
        setLastSaveState('failed', '存档文件无法解密，或不是当前版本可识别的桃源乡存档。', '')
        return false
      }
      const runtimeSnapshot = buildCurrentSaveData()
      const previousActiveSlot = activeSlot.value
      const previousActiveSlotMode = activeSlotMode.value
      const previousRuntimeSessionSlot = runtimeSessionSlot.value
      const previousRuntimeSessionMode = runtimeSessionMode.value
      const previousActiveBuiltInSampleSave = activeBuiltInSampleSave.value
      const previousActiveSlotsByMode = { ...activeSlotsByMode.value }
      const restoreMode = previousRuntimeSessionMode ?? previousActiveSlotMode ?? storageMode.value
      const validationPassed = applySaveData(data, previousActiveSlot, restoreMode)
      const restorePassed = applySaveData(runtimeSnapshot, previousRuntimeSessionSlot, restoreMode)
      activeSlot.value = previousActiveSlot
      activeSlotMode.value = previousActiveSlotMode
      runtimeSessionSlot.value = previousRuntimeSessionSlot
      runtimeSessionMode.value = previousRuntimeSessionMode
      activeBuiltInSampleSave.value = previousActiveBuiltInSampleSave
      activeSlotsByMode.value = { ...previousActiveSlotsByMode }
      if (!validationPassed) {
        setLastSaveState('failed', '存档可以解密，但当前版本还不能完整恢复这份旧档。', '')
        return false
      }
      if (!restorePassed) {
        setLastSaveState('failed', '导入校验后恢复当前页面失败，请刷新页面后再导入。', '')
        return false
      }
      const persisted = await setRawByMode(slot, normalizedFileContent, 'import')
      if (!persisted && !lastSaveErrorMessage.value && lastSaveResultStatus.value !== 'conflict') {
        setLastSaveState('failed', '存档文件有效，但写入当前存储位置失败。', lastServerSyncMessage.value)
      }
      return persisted
    } catch (error) {
      setLastSaveState('failed', getErrorDetail(error) || '导入存档失败。', lastServerSyncMessage.value)
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
    const sampleInfo: BuiltInSampleSaveInfo = {
      id: sample.id,
      label: sample.label,
      description: sample.description,
      tags: [...sample.tags],
      tier: sample.tier,
      recommendedRouteName: sample.recommendedRouteName,
      focusAreas: [...sample.focusAreas],
      smokeChecks: sample.smokeChecks.map(check => ({ ...check })),
    }
    return applySaveData(sample.envelope, -1, storageMode.value, { builtInSample: sampleInfo })
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
    activeBuiltInSampleSave,
    isBuiltInSampleRuntime,
    onlineMailRewards,
    storageMode,
    serverSyncStatus,
    pendingServerSlots,
    lastServerSyncMessage,
    lastSaveResultStatus,
    serverSaveConflict,
    serverSaveFieldAnomaly,
    currentOnlineIdentity,
    qaGovernanceBaselineAudit,
    qaGovernanceOverview,
    qaGovernanceCrossSystemOverview,
    qaGovernanceStorageActionLocks,
    qaGovernanceTuning,
    lastSaveErrorMessage,
    lastLoadError,
    lastLoadErrorMessage,
    getSaveBlockReason,
    getSlotAllocationBlockReason,
    reloadAccountScopedState,
    getQaGovernanceStorageOverview,
    refreshPendingServerState,
    hasPendingServerSave,
    acknowledgeServerSlotRevision,
    hasOnlineMailRewardDelivery,
    recordOnlineMailRewardDelivery,
    setStorageMode,
    setQaGovernanceStorageMode,
    getSlots,
    assignNewSlot,
    saveToSlot,
    autoSave,
    syncPendingServerSaves,
    loadFromSlot,
    resolveServerSaveConflict,
    forceRepairServerSaveFieldAnomaly,
    dismissServerSaveFieldAnomaly,
    deleteSlot,
    exportSave,
    importSave,
    getBuiltInSampleSaves,
    loadBuiltInSampleSave,
    getQaGovernanceDebugSnapshot,
    resetQaGovernanceRuntimeState
  }
})

