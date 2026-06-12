import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Quality, RewardTicketLedger } from '@/types'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useSaveStore } from '@/stores/useSaveStore'
import { useWalletStore } from '@/stores/useWalletStore'
import {
  fetchFestivalStall,
  purchaseFestivalStallOffer,
  type FestivalStallActionResponse,
  type FestivalStallBundleEntry,
  type FestivalStallOffer,
  type FestivalStallRecord,
  type FestivalStallSnapshot
} from '@/utils/festivalStallApi'

export interface FestivalStallSaveSyncState {
  attempted: boolean
  current_session_synced: boolean
  current_storage_mode: 'local' | 'server'
  current_session_mode: 'local' | 'server' | null
  current_session_slot: number | null
  purchase_save_slot: number | null
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

const buildSaveSyncState = (state: FestivalStallSaveSyncState): FestivalStallSaveSyncState => state
const normalizePositiveInt = (value: unknown): number => {
  const normalized = Math.floor(Number(value) || 0)
  return normalized > 0 ? normalized : 0
}
const normalizeQuality = (value: unknown): Quality =>
  value === 'fine' || value === 'excellent' || value === 'supreme' ? value : 'normal'

const getMoneyDelta = (costs: FestivalStallBundleEntry[], rewards: FestivalStallBundleEntry[]): number => {
  const spent = costs
    .filter(entry => entry.type === 'money')
    .reduce((sum, entry) => sum + normalizePositiveInt(entry.amount), 0)
  const earned = rewards
    .filter(entry => entry.type === 'money')
    .reduce((sum, entry) => sum + normalizePositiveInt(entry.amount), 0)
  return earned - spent
}

const getItemRewards = (rewards: FestivalStallBundleEntry[]): { itemId: string; quantity: number; quality: Quality }[] =>
  rewards
    .filter(entry => entry.type === 'item')
    .map(entry => ({
      itemId: String(entry.item_id || '').trim(),
      quantity: normalizePositiveInt(entry.quantity),
      quality: normalizeQuality(entry.quality)
    }))
    .filter(entry => entry.itemId && entry.quantity > 0)

const getTicketRewards = (rewards: FestivalStallBundleEntry[]): RewardTicketLedger => {
  const ledger: RewardTicketLedger = {}
  for (const reward of rewards) {
    if (reward.type !== 'ticket') continue
    const ticketType = String(reward.ticket_type || '').trim() as keyof RewardTicketLedger
    const quantity = normalizePositiveInt(reward.quantity)
    if (!ticketType || quantity <= 0) continue
    ledger[ticketType] = (ledger[ticketType] ?? 0) + quantity
  }
  return ledger
}

const applyPurchaseDeltaToCurrentSession = (result: FestivalStallActionResponse): boolean => {
  const costs = result.record?.costs ?? []
  const rewards = result.record?.rewards ?? []
  const itemRewards = getItemRewards(rewards)
  const ticketRewards = getTicketRewards(rewards)
  const moneyDelta = getMoneyDelta(costs, rewards)
  const inventoryStore = useInventoryStore()

  if (itemRewards.length > 0 && !inventoryStore.addItemsExact(itemRewards)) return false

  if (moneyDelta !== 0) {
    const playerStore = usePlayerStore()
    playerStore.setMoney(Math.max(0, Math.floor(Number(playerStore.money) || 0) + moneyDelta))
  }

  if (Object.keys(ticketRewards).length > 0) {
    useWalletStore().addRewardTickets(ticketRewards, {
      applyMultiplier: false,
      source: 'festival_stall_local_sync'
    })
  }

  return true
}

const normalizeSaveRevision = (value: unknown): number | null => {
  const normalized = Math.floor(Number(value))
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null
}

export const useFestivalStallStore = defineStore('festivalStall', () => {
  const stall = ref<FestivalStallSnapshot | null>(null)
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const lastLoadedAt = ref(0)

  const offers = computed<FestivalStallOffer[]>(() => stall.value?.offers ?? [])
  const records = computed<FestivalStallRecord[]>(() => stall.value?.my_records ?? [])

  const syncAfterPurchase = async (result: FestivalStallActionResponse): Promise<FestivalStallSaveSyncState> => {
    const saveStore = useSaveStore()
    const saveSlot = result.save_slot
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
        purchase_save_slot: null,
        reason: 'no_save_slot',
        reason_detail: 'no_save_slot',
        message: '节庆摊位购买已完成，但本次操作没有写入有效的服务端存档槽位。'
      })
    }

    if (currentStorageMode !== 'server') {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        purchase_save_slot: normalizedSaveSlot,
        reason: 'current_session_not_server',
        reason_detail: 'current_storage_mode_not_server',
        message: '节庆摊位结果已写入服务端存档，但当前面板不在服务端模式，未自动回读运行态。'
      })
    }

    if (currentSessionMode !== 'server') {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        purchase_save_slot: normalizedSaveSlot,
        reason: 'current_session_not_server',
        reason_detail: 'current_runtime_session_not_server',
        message: '节庆摊位结果已写入服务端存档，但当前运行中的会话并非服务端载入会话，未自动回读。'
      })
    }

    if (currentSessionSlot === null) {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: null,
        purchase_save_slot: normalizedSaveSlot,
        reason: 'no_active_session_slot',
        reason_detail: 'no_active_runtime_session_slot',
        message: '节庆摊位结果已写入服务端存档，但当前没有可安全回读的服务端运行槽位。'
      })
    }

    if (currentSessionSlot !== normalizedSaveSlot) {
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        purchase_save_slot: normalizedSaveSlot,
        reason: 'current_session_slot_mismatch',
        reason_detail: 'current_runtime_session_slot_mismatch',
        message: '节庆摊位结果已写入其他服务端槽位，当前运行态仍停留在不同槽位，未自动切换回读。'
      })
    }

    const syncCurrentSessionByDelta = async (message: string): Promise<FestivalStallSaveSyncState> => {
      const playerStore = usePlayerStore()
      const inventoryStore = useInventoryStore()
      const walletStore = useWalletStore()
      const playerSnapshot = playerStore.serialize()
      const inventorySnapshot = inventoryStore.serialize()
      const walletSnapshot = walletStore.serialize()
      const saveRevision = normalizeSaveRevision(result.save_revision)

      if (saveRevision !== null) {
        saveStore.acknowledgeServerSlotRevision(currentSessionSlot, saveRevision)
      }

      if (applyPurchaseDeltaToCurrentSession(result)) {
        const saved = await saveStore.saveToSlot(currentSessionSlot).catch(() => false)
        if (saved) {
          return buildSaveSyncState({
            attempted: true,
            current_session_synced: true,
            current_storage_mode: currentStorageMode,
            current_session_mode: currentSessionMode,
            current_session_slot: currentSessionSlot,
            purchase_save_slot: normalizedSaveSlot,
            reason: 'synced',
            reason_detail: 'synced',
            message
          })
        }
      }

      playerStore.deserialize(playerSnapshot)
      inventoryStore.deserialize(inventorySnapshot)
      walletStore.deserialize(walletSnapshot)
      return buildSaveSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        purchase_save_slot: normalizedSaveSlot,
        reason: 'load_failed',
        reason_detail: saveStore.hasPendingServerSave(currentSessionSlot)
          ? 'current_runtime_session_has_pending_local_copy'
          : 'load_failed',
        message: '节庆摊位结果已写入当前服务端槽位，但当前运行态未能合并本次奖励，请重新载入服务端存档确认。'
      })
    }

    if (saveStore.hasPendingServerSave(currentSessionSlot)) {
      return syncCurrentSessionByDelta('节庆摊位结果已合并到当前运行态；本地待同步副本会按存档系统继续同步。')
    }

    return syncCurrentSessionByDelta('节庆摊位结果已合并到当前服务端运行会话。')
  }

  const refreshStall = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      loading.value = true
      errorMessage.value = ''
    }
    try {
      stall.value = await fetchFestivalStall()
      lastLoadedAt.value = Date.now()
      return stall.value
    } catch (error) {
      if (!options.silent) {
        errorMessage.value = error instanceof Error ? error.message : '获取节庆摊位失败'
      }
      throw error
    } finally {
      if (!options.silent) {
        loading.value = false
      }
    }
  }

  const buyOffer = async (offerId: string) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      const result = await purchaseFestivalStallOffer(offerId)
      const saveSyncState = await syncAfterPurchase(result)
      await refreshStall().catch(() => {})
      return {
        ...result,
        save_sync_state: saveSyncState
      } as FestivalStallActionResponse & {
        save_sync_state: FestivalStallSaveSyncState
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '购买节庆摊位商品失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  return {
    stall,
    loading,
    actionRunning,
    errorMessage,
    lastLoadedAt,
    offers,
    records,
    refreshStall,
    buyOffer
  }
})
