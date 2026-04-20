import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSaveStore } from '@/stores/useSaveStore'
import {
  clearClaimedMailboxMail,
  claimAllMailboxMail,
  claimMailboxMail,
  fetchMailboxDetail,
  fetchMailboxList,
  markMailboxRead
} from '@/utils/mailboxApi'

type MailClaimStatus = 'claimable' | 'claimed' | 'expired' | 'notice'
type MailReadStatus = 'read' | 'unread'

export interface TaoyuanMailReward {
  type: string
  id?: string
  amount?: number
  quantity?: number
  quality?: string
  source?: string
  target_reward_type?: string
  target_reward_id?: string
}

export interface TaoyuanMailSummary {
  id: string
  campaign_id: string
  title: string
  preview: string
  template_type: string | null
  has_rewards: boolean
  reward_count: number
  sent_at: number
  expires_at: number | null
  read_at: number | null
  claimed_at: number | null
  unread: boolean
  can_claim: boolean
  is_claimed: boolean
  is_expired: boolean
  read_status: MailReadStatus
  claim_status: MailClaimStatus
}

export interface TaoyuanMailDetail extends TaoyuanMailSummary {
  content: string
  rewards: TaoyuanMailReward[]
  duplicate_compensation_money: number
  claim_result: {
    save_slot: number | null
    money_added: number
    duplicate_compensation_money: number
    applied_rewards: TaoyuanMailReward[]
    skipped_rewards: Array<{ type: string; id?: string; quantity?: number; reason: string }>
  } | null
}

export interface MailClaimSyncState {
  attempted: boolean
  current_session_synced: boolean
  current_storage_mode: 'local' | 'server'
  current_session_mode: 'local' | 'server' | null
  current_session_slot: number | null
  claimed_save_slots: number[]
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

const toSummary = (mail: TaoyuanMailSummary | TaoyuanMailDetail): TaoyuanMailSummary => ({
  id: mail.id,
  campaign_id: mail.campaign_id,
  title: mail.title,
  preview: mail.preview,
  template_type: mail.template_type,
  has_rewards: mail.has_rewards,
  reward_count: mail.reward_count,
  sent_at: mail.sent_at,
  expires_at: mail.expires_at,
  read_at: mail.read_at,
  claimed_at: mail.claimed_at,
  unread: mail.unread,
  can_claim: mail.can_claim,
  is_claimed: mail.is_claimed,
  is_expired: mail.is_expired,
  read_status: mail.read_status,
  claim_status: mail.claim_status
})

export const useMailboxStore = defineStore('taoyuanMailbox', () => {
  const mails = ref<TaoyuanMailSummary[]>([])
  const unreadCount = ref(0)
  const detailMap = ref<Record<string, TaoyuanMailDetail>>({})
  const loading = ref(false)
  const lastLoadedAt = ref(0)

  const upsertMail = (mail: TaoyuanMailSummary | TaoyuanMailDetail) => {
    const summary = toSummary(mail)
    const index = mails.value.findIndex(item => item.id === summary.id)
    if (index >= 0) mails.value[index] = summary
    else mails.value.unshift(summary)
    unreadCount.value = mails.value.filter(item => item.unread).length
  }

  const buildClaimSyncState = (state: MailClaimSyncState): MailClaimSyncState => state

  const syncAfterClaim = async (saveSlots: Array<number | null | undefined>): Promise<MailClaimSyncState> => {
    const saveStore = useSaveStore()
    const normalizedSaveSlots = Array.from(new Set(
      saveSlots
        .filter((slot): slot is number => slot !== null && slot !== undefined && Number.isInteger(slot))
        .map(slot => Number(slot))
    ))
    const currentStorageMode = saveStore.storageMode
    const currentSessionMode = saveStore.runtimeSessionMode ?? null
    const currentSessionSlot = saveStore.runtimeSessionSlot >= 0 ? saveStore.runtimeSessionSlot : null

    if (normalizedSaveSlots.length === 0) {
      return buildClaimSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        claimed_save_slots: [],
        reason: 'no_save_slot',
        reason_detail: 'no_save_slot',
        message: '奖励领取完成，但这批邮件没有写入存档槽位。'
      })
    }

    if (currentStorageMode !== 'server') {
      return buildClaimSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        claimed_save_slots: normalizedSaveSlots,
        reason: 'current_session_not_server',
        reason_detail: 'current_storage_mode_not_server',
        message: '奖励已写入服务端存档，但当前面板未停留在服务端模式，未自动回读运行态。'
      })
    }

    if (currentSessionMode !== 'server') {
      return buildClaimSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        claimed_save_slots: normalizedSaveSlots,
        reason: 'current_session_not_server',
        reason_detail: 'current_runtime_session_not_server',
        message: '奖励已写入服务端存档，但当前运行中的会话并非服务端载入会话，未自动回读。'
      })
    }

    if (currentSessionSlot === null) {
      return buildClaimSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: null,
        claimed_save_slots: normalizedSaveSlots,
        reason: 'no_active_session_slot',
        reason_detail: 'no_active_runtime_session_slot',
        message: '奖励已写入服务端存档，但当前没有可安全回读的服务端运行槽位。'
      })
    }

    if (!normalizedSaveSlots.includes(currentSessionSlot)) {
      return buildClaimSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        claimed_save_slots: normalizedSaveSlots,
        reason: 'current_session_slot_mismatch',
        reason_detail: 'current_runtime_session_slot_mismatch',
        message: '奖励已写入其他服务端槽位，当前运行态仍停留在不同槽位，未自动切换回读。'
      })
    }

    if (saveStore.hasPendingServerSave(currentSessionSlot)) {
      return buildClaimSyncState({
        attempted: false,
        current_session_synced: false,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        claimed_save_slots: normalizedSaveSlots,
        reason: 'load_failed',
        reason_detail: 'current_runtime_session_has_pending_local_copy',
        message: '奖励已写入当前服务端槽位，但本地仍有待同步副本，已跳过自动回读以避免旧副本覆盖运行态。'
      })
    }

    const synced = await saveStore.loadFromSlot(currentSessionSlot, {
      mode: 'server',
      allowPendingServerCopy: false
    })
    return buildClaimSyncState({
      attempted: true,
      current_session_synced: synced,
      current_storage_mode: currentStorageMode,
      current_session_mode: currentSessionMode,
      current_session_slot: currentSessionSlot,
      claimed_save_slots: normalizedSaveSlots,
      reason: synced ? 'synced' : 'load_failed',
      reason_detail: synced ? 'synced' : 'load_failed',
      message: synced
        ? '奖励已同步到当前服务端运行会话。'
        : '奖励已写入当前服务端槽位，但自动回读失败，请手动重新载入查看。'
    })
  }

  const refreshList = async () => {
    loading.value = true
    try {
      const data = await fetchMailboxList()
      mails.value = (data.mails || []) as TaoyuanMailSummary[]
      unreadCount.value = Number(data.unread_count) || 0
      detailMap.value = {}
      lastLoadedAt.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  const openMail = async (id: string) => {
    let detail = detailMap.value[id]
    if (!detail) {
      const data = await fetchMailboxDetail(id)
      detail = data.mail as TaoyuanMailDetail
      detailMap.value[id] = detail
    }
    if (detail.unread) {
      const readData = await markMailboxRead(id)
      detail = readData.mail as TaoyuanMailDetail
      detailMap.value[id] = detail
      upsertMail(detail)
    }
    return detail
  }

  const claimMail = async (id: string) => {
    const data = await claimMailboxMail(id)
    const detail = data.mail as TaoyuanMailDetail
    detailMap.value[id] = detail
    upsertMail(detail)
    const saveSyncState = await syncAfterClaim([data.result?.save_slot])
    return { ...data, save_sync_state: saveSyncState }
  }

  const claimAll = async () => {
    const data = await claimAllMailboxMail()
    const claimedSaveSlots = Array.isArray(data.claimed)
      ? data.claimed.map((item: any) => item?.result?.save_slot)
      : []
    const saveSyncState = await syncAfterClaim(claimedSaveSlots)
    await refreshList()
    return { ...data, save_sync_state: saveSyncState }
  }

  const clearClaimed = async () => {
    const data = await clearClaimedMailboxMail()
    await refreshList()
    return data
  }

  return {
    mails,
    unreadCount,
    detailMap,
    loading,
    lastLoadedAt,
    refreshList,
    openMail,
    claimMail,
    claimAll,
    clearClaimed,
    upsertMail
  }
})
