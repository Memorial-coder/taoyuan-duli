import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useSaveStore } from '@/stores/useSaveStore'
import {
  buyNeighborConsignment,
  cancelNeighborConsignment,
  createNeighborConsignment,
  fetchNeighborConsignmentOverview,
  reclaimExpiredNeighborConsignment,
  type NeighborConsignmentActionResponse,
  type NeighborConsignmentListing,
  type NeighborConsignmentOverview
} from '@/utils/neighborConsignmentApi'

export interface NeighborConsignmentSaveSyncState {
  attempted: boolean
  current_session_synced: boolean
  current_storage_mode: 'local' | 'server'
  current_session_mode: 'local' | 'server' | null
  current_session_slot: number | null
  acted_save_slot: number | null
  reason:
    | 'synced'
    | 'no_save_slot'
    | 'current_session_not_server'
    | 'no_active_session_slot'
    | 'current_session_slot_mismatch'
    | 'load_failed'
  reason_detail:
    | 'synced'
    | 'no_save_slot'
    | 'current_storage_mode_not_server'
    | 'current_runtime_session_not_server'
    | 'no_active_runtime_session_slot'
    | 'current_runtime_session_slot_mismatch'
    | 'current_runtime_session_has_pending_local_copy'
    | 'load_failed'
  message: string
}

const buildSaveSyncState = (state: NeighborConsignmentSaveSyncState): NeighborConsignmentSaveSyncState => state

export const useNeighborConsignmentStore = defineStore('neighborConsignment', () => {
  const overview = ref<NeighborConsignmentOverview | null>(null)
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const lastLoadedAt = ref(0)

  const openListings = computed<NeighborConsignmentListing[]>(() => overview.value?.open_listings ?? [])
  const myListings = computed<NeighborConsignmentListing[]>(() => overview.value?.my_listings ?? [])
  const scopeOptions = computed(() => overview.value?.scope_options ?? [])

  const syncAfterAction = async (saveSlot: number | null | undefined): Promise<NeighborConsignmentSaveSyncState> => {
    const saveStore = useSaveStore()
    const normalizedSaveSlot = saveSlot !== null && saveSlot !== undefined && Number.isInteger(saveSlot) ? Number(saveSlot) : null
    const currentStorageMode = saveStore.storageMode
    const currentSessionMode = saveStore.runtimeSessionMode ?? null
    const currentSessionSlot = saveStore.runtimeSessionSlot >= 0 ? saveStore.runtimeSessionSlot : null

    if (normalizedSaveSlot === null) {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        acted_save_slot: null,
        reason: 'no_save_slot',
        reason_detail: 'no_save_slot',
        message: '寄售已完成，但本次操作没有写入有效的服务端存档槽位。'
      })
    }

    if (currentStorageMode !== 'server') {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        acted_save_slot: normalizedSaveSlot,
        reason: 'current_session_not_server',
        reason_detail: 'current_storage_mode_not_server',
        message: '寄售结果已写入服务端存档，但当前面板不在服务端模式，未自动回读运行态。'
      })
    }

    if (currentSessionMode !== 'server') {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        acted_save_slot: normalizedSaveSlot,
        reason: 'current_session_not_server',
        reason_detail: 'current_runtime_session_not_server',
        message: '寄售结果已写入服务端存档，但当前运行中的会话并非服务端载入会话，未自动回读。'
      })
    }

    if (currentSessionSlot === null) {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: null,
        acted_save_slot: normalizedSaveSlot,
        reason: 'no_active_session_slot',
        reason_detail: 'no_active_runtime_session_slot',
        message: '寄售结果已写入服务端存档，但当前没有可安全回读的服务端运行槽位。'
      })
    }

    if (currentSessionSlot !== normalizedSaveSlot) {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        acted_save_slot: normalizedSaveSlot,
        reason: 'current_session_slot_mismatch',
        reason_detail: 'current_runtime_session_slot_mismatch',
        message: '寄售结果已写入其他服务端槽位，当前运行态仍停留在不同槽位，未自动切换回读。'
      })
    }

    if (saveStore.hasPendingServerSave(currentSessionSlot)) {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        acted_save_slot: normalizedSaveSlot,
        reason: 'load_failed',
        reason_detail: 'current_runtime_session_has_pending_local_copy',
        message: '寄售结果已写入当前服务端槽位，但本地仍有待同步副本，已跳过自动回读以避免旧副本覆盖运行态。'
      })
    }

    const synced = await saveStore.loadFromSlot(currentSessionSlot, {
      mode: 'server',
      allowPendingServerCopy: false
    })

    return buildSaveSyncState({
      attempted: true,
      current_session_synced: synced,
      current_storage_mode: currentStorageMode,
      current_session_mode: currentSessionMode,
      current_session_slot: currentSessionSlot,
      acted_save_slot: normalizedSaveSlot,
      reason: synced ? 'synced' : 'load_failed',
      reason_detail: synced ? 'synced' : 'load_failed',
      message: synced
        ? '寄售结果已同步到当前服务端运行会话。'
        : '寄售结果已写入当前服务端槽位，但自动回读失败，请手动重新载入查看。'
    })
  }

  const refreshOverview = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      overview.value = await fetchNeighborConsignmentOverview()
      lastLoadedAt.value = Date.now()
      return overview.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取邻里寄售失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const performAction = async (
    actionRunner: () => Promise<NeighborConsignmentActionResponse>
  ) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      const result = await actionRunner()
      const saveSyncState = await syncAfterAction(result.actor_save_slot)
      await refreshOverview().catch(() => {})
      return {
        ...result,
        save_sync_state: saveSyncState
      } as NeighborConsignmentActionResponse & {
        save_sync_state: NeighborConsignmentSaveSyncState
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '邻里寄售操作失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const createListing = async (payload: Parameters<typeof createNeighborConsignment>[0]) => performAction(() => createNeighborConsignment(payload))
  const buyListing = async (listingId: string) => performAction(() => buyNeighborConsignment(listingId))
  const cancelListing = async (listingId: string) => performAction(() => cancelNeighborConsignment(listingId))
  const reclaimListing = async (listingId: string) => performAction(() => reclaimExpiredNeighborConsignment(listingId))

  return {
    overview,
    loading,
    actionRunning,
    errorMessage,
    lastLoadedAt,
    openListings,
    myListings,
    scopeOptions,
    refreshOverview,
    createListing,
    buyListing,
    cancelListing,
    reclaimListing,
  }
})
