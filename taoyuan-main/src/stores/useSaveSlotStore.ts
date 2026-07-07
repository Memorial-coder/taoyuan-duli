import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import CryptoJS from 'crypto-js'
import {
  buildScopedSingleKey,
  buildScopedStorageKey,
  getStoredSaveMode,
  migrateLegacyScopedSlots,
  setStoredSaveMode,
  type SaveMode
} from '@/utils/accountStorage'
import { fetchServerSlotEntries } from '@/utils/serverSaveApi'
import type {
  SaveExecutionStatus,
  SaveSlotInfo,
  ServerSaveConflictState,
  ServerSaveFieldAnomalyState
} from '@/stores/useSaveStore'

const LEGACY_SAVE_KEY_PREFIX = 'taoyuanxiang_save_'
const PENDING_SERVER_SAVE_KEY_PREFIX = 'taoyuanxiang_pending_server_saves_'
const MAX_SLOTS = 3
const ENCRYPTION_KEY = 'taoyuanxiang_2024_secret'

type PendingServerSaveSource = 'runtime' | 'import' | 'external'

interface PendingServerSaveEntry {
  raw: string
  savedAt: string
  updatedAt: number
  baseRevision: number
  source: PendingServerSaveSource
}

type PendingServerSaveMap = Partial<Record<number, PendingServerSaveEntry>>
type RuntimeSaveStore = ReturnType<(typeof import('@/stores/useSaveStore'))['useSaveStore']>

const getSaveKeyPrefix = (): string => buildScopedStorageKey(LEGACY_SAVE_KEY_PREFIX)

const getSaveKey = (slot: number): string => {
  const scopedPrefix = getSaveKeyPrefix()
  migrateLegacyScopedSlots(LEGACY_SAVE_KEY_PREFIX, scopedPrefix, MAX_SLOTS)
  return `${scopedPrefix}${slot}`
}

const getPendingServerSaveKey = (): string => buildScopedSingleKey(PENDING_SERVER_SAVE_KEY_PREFIX)

const isValidSlot = (slot: number): boolean => Number.isInteger(slot) && slot >= 0 && slot < MAX_SLOTS

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

const getPendingServerSaveEntries = (): Array<{ slot: number; entry: PendingServerSaveEntry }> =>
  Object.entries(loadPendingServerSaveMap())
    .map(([slot, entry]) => ({ slot: Number(slot), entry: entry as PendingServerSaveEntry }))
    .filter(item => isValidSlot(item.slot) && !!item.entry?.raw)

const getPendingServerSlotNumbers = (): number[] =>
  getPendingServerSaveEntries()
    .map(item => item.slot)
    .sort((left, right) => left - right)

const decrypt = (cipher: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY)
    const result = bytes.toString(CryptoJS.enc.Utf8)
    return result || null
  } catch {
    return null
  }
}

const parseSaveData = (raw: string): Record<string, any> | null => {
  const decrypted = decrypt(raw)
  if (!decrypted) return null
  try {
    return JSON.parse(decrypted) as Record<string, any>
  } catch {
    return null
  }
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
  if (!parsed || typeof parsed !== 'object') return { slot, exists: false, readBlocked }
  const meta = parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {}
  const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
  const game = data.game && typeof data.game === 'object' ? data.game : {}
  const player = data.player && typeof data.player === 'object' ? data.player : {}
  return {
    slot,
    exists: true,
    year: game.year,
    season: game.season,
    day: game.day,
    money: player.money,
    playerName: player.playerName,
    savedAt: String(meta.savedAt ?? parsed.savedAt ?? data.savedAt ?? ''),
    pendingSync,
    readBlocked
  }
}

export const useSaveSlotStore = defineStore('saveSlots', () => {
  const lightStorageMode = ref<SaveMode>(getStoredSaveMode())
  const lightPendingServerSlots = ref<number[]>(getPendingServerSlotNumbers())
  const lightServerSlotsFetchState = ref<'unknown' | 'available' | 'unavailable'>(
    lightStorageMode.value === 'server' ? 'unknown' : 'available'
  )
  const runtimeSaveStore = shallowRef<RuntimeSaveStore | null>(null)
  let runtimeSaveStorePromise: Promise<RuntimeSaveStore> | null = null

  const syncLightStateFromRuntime = (store: RuntimeSaveStore) => {
    lightStorageMode.value = store.storageMode
    lightPendingServerSlots.value = [...store.pendingServerSlots]
  }

  const getRuntimeSaveStore = async () => {
    if (runtimeSaveStore.value) return runtimeSaveStore.value
    runtimeSaveStorePromise ??= import('@/stores/useSaveStore').then(module => module.useSaveStore())
    const store = await runtimeSaveStorePromise
    runtimeSaveStore.value = store
    syncLightStateFromRuntime(store)
    return store
  }

  const runRuntimeAction = async <T>(action: (store: RuntimeSaveStore) => T | Promise<T>): Promise<T> => {
    const store = await getRuntimeSaveStore()
    const result = await action(store)
    syncLightStateFromRuntime(store)
    return result
  }

  const refreshPendingServerState = () => {
    if (runtimeSaveStore.value) {
      const pending = runtimeSaveStore.value.refreshPendingServerState()
      syncLightStateFromRuntime(runtimeSaveStore.value)
      return pending
    }
    lightPendingServerSlots.value = getPendingServerSlotNumbers()
    return lightPendingServerSlots.value
  }

  const reloadAccountScopedState = () => {
    if (runtimeSaveStore.value) {
      runtimeSaveStore.value.reloadAccountScopedState()
      syncLightStateFromRuntime(runtimeSaveStore.value)
      return
    }
    lightStorageMode.value = getStoredSaveMode()
    lightServerSlotsFetchState.value = lightStorageMode.value === 'server' ? 'unknown' : 'available'
    refreshPendingServerState()
  }

  const buildLightServerSlotStates = async (): Promise<Array<{ raw: string | null; pendingSync: boolean; readBlocked: boolean }>> => {
    const pendingMap = loadPendingServerSaveMap()
    try {
      const serverEntries = await fetchServerSlotEntries()
      lightServerSlotsFetchState.value = 'available'
      return Array.from({ length: MAX_SLOTS }, (_, slot) => {
        const serverEntry = serverEntries[slot] ?? { raw: null, revision: 0 }
        const pendingEntry = pendingMap[slot]
        const pendingRaw = pendingEntry?.raw ?? null
        const pendingConflictsWithRemote = !!pendingEntry && serverEntry.revision > pendingEntry.baseRevision && pendingEntry.raw !== serverEntry.raw
        return {
          raw: pendingConflictsWithRemote ? serverEntry.raw : (pendingRaw ?? serverEntry.raw ?? null),
          pendingSync: !!pendingRaw,
          readBlocked: false
        }
      })
    } catch {
      lightServerSlotsFetchState.value = 'unavailable'
      return Array.from({ length: MAX_SLOTS }, (_, slot) => ({
        raw: pendingMap[slot]?.raw ?? null,
        pendingSync: !!pendingMap[slot]?.raw,
        readBlocked: !pendingMap[slot]?.raw
      }))
    } finally {
      refreshPendingServerState()
    }
  }

  const getSlots = async (mode: SaveMode = storageMode.value): Promise<SaveSlotInfo[]> => {
    if (runtimeSaveStore.value) {
      const slots = await runtimeSaveStore.value.getSlots(mode)
      syncLightStateFromRuntime(runtimeSaveStore.value)
      return slots
    }
    try {
      if (mode === 'server') {
        const slotStates = await buildLightServerSlotStates()
        return slotStates.map((state, slot) => parseSlotInfo(slot, state.raw, state.pendingSync, state.readBlocked))
      }
      lightServerSlotsFetchState.value = 'available'
      refreshPendingServerState()
      return Array.from({ length: MAX_SLOTS }, (_, slot) => parseSlotInfo(slot, localStorage.getItem(getSaveKey(slot))))
    } catch {
      return createEmptySlots({ readBlocked: mode === 'server' })
    }
  }

  const setStorageMode = (mode: SaveMode) => {
    if (runtimeSaveStore.value) {
      runtimeSaveStore.value.setStorageMode(mode)
      syncLightStateFromRuntime(runtimeSaveStore.value)
      return
    }
    lightStorageMode.value = mode
    setStoredSaveMode(mode)
    lightServerSlotsFetchState.value = mode === 'server' ? 'unknown' : 'available'
    refreshPendingServerState()
  }

  const getSlotAllocationBlockReason = (): string => {
    if (runtimeSaveStore.value) return runtimeSaveStore.value.getSlotAllocationBlockReason()
    if (lightStorageMode.value === 'server' && lightServerSlotsFetchState.value === 'unavailable') {
      return '服务端存档暂时不可用，无法安全分配新槽位，请稍后重试。'
    }
    return ''
  }

  const storageMode = computed(() => runtimeSaveStore.value?.storageMode ?? lightStorageMode.value)
  const pendingServerSlots = computed(() => runtimeSaveStore.value?.pendingServerSlots ?? lightPendingServerSlots.value)
  const currentOnlineIdentity = computed(() => runtimeSaveStore.value?.currentOnlineIdentity ?? null)
  const serverSaveConflict = computed<ServerSaveConflictState | null>(() => runtimeSaveStore.value?.serverSaveConflict ?? null)
  const serverSaveFieldAnomaly = computed<ServerSaveFieldAnomalyState | null>(() => runtimeSaveStore.value?.serverSaveFieldAnomaly ?? null)
  const lastSaveResultStatus = computed<SaveExecutionStatus>(() => runtimeSaveStore.value?.lastSaveResultStatus ?? 'saved')
  const lastServerSyncMessage = computed(() => runtimeSaveStore.value?.lastServerSyncMessage ?? '')
  const lastSaveErrorMessage = computed(() => runtimeSaveStore.value?.lastSaveErrorMessage ?? '')
  const lastLoadErrorMessage = computed(() => runtimeSaveStore.value?.lastLoadErrorMessage ?? '')

  return {
    storageMode,
    pendingServerSlots,
    currentOnlineIdentity,
    serverSaveConflict,
    serverSaveFieldAnomaly,
    lastSaveResultStatus,
    lastServerSyncMessage,
    lastSaveErrorMessage,
    lastLoadErrorMessage,
    reloadAccountScopedState,
    refreshPendingServerState,
    setStorageMode,
    getSlotAllocationBlockReason,
    getSlots,
    syncPendingServerSaves: (options: { slots?: number[] } = {}) => runRuntimeAction(store => store.syncPendingServerSaves(options)),
    assignNewSlot: () => runRuntimeAction(store => store.assignNewSlot()),
    saveToSlot: (slot: number) => runRuntimeAction(store => store.saveToSlot(slot)),
    autoSave: () => runRuntimeAction(store => store.autoSave()),
    loadFromSlot: (slot: number, options: Parameters<RuntimeSaveStore['loadFromSlot']>[1] = {}) =>
      runRuntimeAction(store => store.loadFromSlot(slot, options)),
    deleteSlot: (slot: number) => runRuntimeAction(store => store.deleteSlot(slot)),
    exportSave: (slot: number) => runRuntimeAction(store => store.exportSave(slot)),
    importSave: (slot: number, raw: string) => runRuntimeAction(store => store.importSave(slot, raw)),
    resolveServerSaveConflict: (choice: Parameters<RuntimeSaveStore['resolveServerSaveConflict']>[0]) =>
      runRuntimeAction(store => store.resolveServerSaveConflict(choice)),
    dismissServerSaveFieldAnomaly: () => {
      if (runtimeSaveStore.value) {
        runtimeSaveStore.value.dismissServerSaveFieldAnomaly()
        syncLightStateFromRuntime(runtimeSaveStore.value)
      }
    },
    forceRepairServerSaveFieldAnomaly: () =>
      runRuntimeAction(store => store.forceRepairServerSaveFieldAnomaly())
  }
})
