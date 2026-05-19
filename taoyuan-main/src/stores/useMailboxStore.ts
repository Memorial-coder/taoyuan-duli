import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSaveStore } from '@/stores/useSaveStore'
import {
  clearClaimedMailboxMail,
  claimAllMailboxMail,
  claimMailboxMail,
  fetchMailboxDetail,
  fetchMailboxInboxStatus,
  fetchMailboxList,
  fetchMailboxMemorial,
  fetchMailboxReceipts,
  fetchPlayerLetterPresets,
  fetchSentMailboxList,
  pinMailboxMail,
  saveMailboxMemorial,
  sendPlayerGiftPackage,
  sendPlayerLetter,
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
  sender_username?: string
  sender_display_name?: string
  has_rewards: boolean
  reward_count: number
  sent_at: number
  pinned_at: number | null
  expires_at: number | null
  read_at: number | null
  claimed_at: number | null
  is_pinned: boolean
  unread: boolean
  can_claim: boolean
  is_claimed: boolean
  is_expired: boolean
  read_status: MailReadStatus
  claim_status: MailClaimStatus
}

export interface TaoyuanMailDetail extends TaoyuanMailSummary {
  content: string
  photo_url?: string
  photo_alt?: string
  rewards: TaoyuanMailReward[]
  duplicate_compensation_money: number
  sender_username?: string
  sender_display_name?: string
  claim_result: {
    save_slot: number | null
    money_added: number
    duplicate_compensation_money: number
    applied_rewards: TaoyuanMailReward[]
    skipped_rewards: Array<{ type: string; id?: string; quantity?: number; reason: string }>
  } | null
}

export interface TaoyuanMailReceipt {
  id: string
  delivery_id: string
  campaign_id: string
  claimed_at: number
  mail_title: string
  template_type: string | null
  sender_display_name?: string
  sent_at: number | null
  has_mail_detail: boolean
  save_slot: number | null
  money_added: number
  duplicate_compensation_money: number
  applied_rewards: TaoyuanMailReward[]
  skipped_rewards: Array<{ type: string; id?: string; quantity?: number; reason: string }>
}

export interface TaoyuanSentMailSummary {
  id: string
  title: string
  template_type: string | null
  recipient_username: string
  recipient_display_name?: string
  preview: string
  sent_at: number
  is_pinned: boolean
  has_rewards: boolean
  reward_count: number
  has_memorial_entry: boolean
}

export interface TaoyuanMemorialEntry {
  id: string
  delivery_id: string
  direction: 'inbox' | 'outbox'
  counterpart_username: string
  counterpart_display_name?: string
  title: string
  preview: string
  content: string
  template_type: string | null
  tags: string[]
  relation_scope: 'friend' | 'neighbor' | 'other'
  saved_at: number
}

export interface MailArrivalDigest {
  count: number
  titles: string[]
  first_mail_id: string | null
  arrived_at: number | null
}

export interface MailInboxStatus {
  unread_count: number
  pinned_count: number
  important_count: number
  newest_unread: TaoyuanMailSummary | null
  newest_important: TaoyuanMailSummary | null
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

export interface PlayerLetterTemplatePreset {
  id: string
  template_type: 'player_letter' | 'season_greeting' | 'festival_greeting' | 'blessing_card' | 'short_note' | 'photo_letter'
  label: string
  title: string
  content: string
}

export interface PlayerGiftPackageRewardDraft {
  type: 'item' | 'seed' | 'decoration'
  id: string
  quantity: number
  quality?: string
}

const toSummary = (mail: TaoyuanMailSummary | TaoyuanMailDetail): TaoyuanMailSummary => ({
  id: mail.id,
  campaign_id: mail.campaign_id,
  title: mail.title,
  preview: mail.preview,
  template_type: mail.template_type,
  sender_username: mail.sender_username,
  sender_display_name: mail.sender_display_name,
  has_rewards: mail.has_rewards,
  reward_count: mail.reward_count,
  sent_at: mail.sent_at,
  pinned_at: mail.pinned_at,
  expires_at: mail.expires_at,
  read_at: mail.read_at,
  claimed_at: mail.claimed_at,
  is_pinned: mail.is_pinned,
  unread: mail.unread,
  can_claim: mail.can_claim,
  is_claimed: mail.is_claimed,
  is_expired: mail.is_expired,
  read_status: mail.read_status,
  claim_status: mail.claim_status
})

export const useMailboxStore = defineStore('taoyuanMailbox', () => {
  const mails = ref<TaoyuanMailSummary[]>([])
  const sentMails = ref<TaoyuanSentMailSummary[]>([])
  const unreadCount = ref(0)
  const detailMap = ref<Record<string, TaoyuanMailDetail>>({})
  const receipts = ref<TaoyuanMailReceipt[]>([])
  const memorialEntries = ref<TaoyuanMemorialEntry[]>([])
  const inboxStatus = ref<MailInboxStatus>({
    unread_count: 0,
    pinned_count: 0,
    important_count: 0,
    newest_unread: null,
    newest_important: null
  })
  const arrivalDigest = ref<MailArrivalDigest>({
    count: 0,
    titles: [],
    first_mail_id: null,
    arrived_at: null
  })
  const loading = ref(false)
  const lastLoadedAt = ref(0)
  const sendLetterRunning = ref(false)
  const letterTemplatePresets = ref<PlayerLetterTemplatePreset[]>([])
  const letterTargetDraft = ref('')
  const letterTitleDraft = ref('')
  const letterContentDraft = ref('')
  const letterTemplateTypeDraft = ref<PlayerLetterTemplatePreset['template_type']>('player_letter')
  const letterPhotoUrlDraft = ref('')
  const letterPhotoAltDraft = ref('')
  const giftPackageTargetDraft = ref('')
  const giftPackageTitleDraft = ref('')
  const giftPackageContentDraft = ref('')
  const giftPackageTemplateTypeDraft = ref<'material_package' | 'seed_package' | 'fish_fry_package' | 'decoration_package' | 'souvenir_package'>('material_package')
  const giftPackageRewardsDraft = ref<PlayerGiftPackageRewardDraft[]>([
    { type: 'item', id: '', quantity: 1, quality: 'normal' }
  ])

  let lastSeenMailIds = new Set<string>()

  const upsertMail = (mail: TaoyuanMailSummary | TaoyuanMailDetail) => {
    const summary = toSummary(mail)
    const index = mails.value.findIndex(item => item.id === summary.id)
    if (index >= 0) mails.value[index] = summary
    else mails.value.unshift(summary)
    mails.value = [...mails.value].sort((left, right) => {
      const pinDiff = (Number(right.pinned_at) || 0) - (Number(left.pinned_at) || 0)
      if (pinDiff !== 0) return pinDiff
      return (Number(right.sent_at) || 0) - (Number(left.sent_at) || 0)
    })
    unreadCount.value = mails.value.filter(item => item.unread).length
    inboxStatus.value = {
      unread_count: unreadCount.value,
      pinned_count: mails.value.filter(item => item.is_pinned).length,
      important_count: mails.value.filter(item => item.is_pinned || item.can_claim || !!item.sender_display_name).length,
      newest_unread: mails.value.find(item => item.unread) ?? null,
      newest_important: mails.value.find(item => item.is_pinned || item.can_claim || !!item.sender_display_name) ?? null
    }
  }

  const clearArrivalDigest = () => {
    arrivalDigest.value = {
      count: 0,
      titles: [],
      first_mail_id: null,
      arrived_at: null
    }
  }

  const refreshReceipts = async (limit = 20) => {
    const data = await fetchMailboxReceipts(limit)
    receipts.value = (data.receipts || []) as TaoyuanMailReceipt[]
    return receipts.value
  }

  const refreshSentMails = async () => {
    const data = await fetchSentMailboxList()
    sentMails.value = (data.mails || []) as TaoyuanSentMailSummary[]
    return sentMails.value
  }

  const refreshMemorialEntries = async () => {
    const data = await fetchMailboxMemorial()
    memorialEntries.value = (data.entries || []) as TaoyuanMemorialEntry[]
    return memorialEntries.value
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
      const previousIds = lastSeenMailIds
      const data = await fetchMailboxList()
      const nextMails = ((data.mails || []) as TaoyuanMailSummary[]).sort((left, right) => {
        const pinDiff = (Number(right.pinned_at) || 0) - (Number(left.pinned_at) || 0)
        if (pinDiff !== 0) return pinDiff
        return (Number(right.sent_at) || 0) - (Number(left.sent_at) || 0)
      })
      mails.value = nextMails
      unreadCount.value = Number(data.unread_count) || 0
      detailMap.value = {}
      lastSeenMailIds = new Set(nextMails.map(item => item.id))
      const newMails = nextMails.filter(item => !previousIds.has(item.id))
      if (newMails.length > 0) {
        arrivalDigest.value = {
          count: newMails.length,
          titles: newMails.slice(0, 3).map(item => item.title),
          first_mail_id: newMails[0]?.id ?? null,
          arrived_at: Date.now()
        }
      }
      const inbox = await fetchMailboxInboxStatus()
      inboxStatus.value = {
        unread_count: Number(inbox.unread_count) || unreadCount.value,
        pinned_count: Number(inbox.pinned_count) || 0,
        important_count: Number(inbox.important_count) || 0,
        newest_unread: (inbox.newest_unread || null) as TaoyuanMailSummary | null,
        newest_important: (inbox.newest_important || null) as TaoyuanMailSummary | null
      }
      lastLoadedAt.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  const refreshLetterPresets = async () => {
    const data = await fetchPlayerLetterPresets()
    letterTemplatePresets.value = (data.presets || []) as PlayerLetterTemplatePreset[]
    return letterTemplatePresets.value
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
    if (arrivalDigest.value.first_mail_id === id) {
      clearArrivalDigest()
    }
    return detail
  }

  const claimMail = async (id: string) => {
    const data = await claimMailboxMail(id)
    const detail = data.mail as TaoyuanMailDetail
    detailMap.value[id] = detail
    upsertMail(detail)
    await refreshReceipts().catch(() => {})
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
    await refreshReceipts().catch(() => {})
    return { ...data, save_sync_state: saveSyncState }
  }

  const clearClaimed = async () => {
    const data = await clearClaimedMailboxMail()
    await refreshList()
    return data
  }

  const setPinned = async (id: string, pinned: boolean) => {
    const data = await pinMailboxMail(id, pinned)
    const detail = data.mail as TaoyuanMailDetail
    detailMap.value[id] = detail
    upsertMail(detail)
    return detail
  }

  const saveToMemorial = async (id: string) => {
    const data = await saveMailboxMemorial(id)
    await refreshMemorialEntries().catch(() => {})
    await refreshSentMails().catch(() => {})
    return data?.entry as TaoyuanMemorialEntry | undefined
  }

  const sendPlayerLetterMail = async () => {
    const target_username = letterTargetDraft.value.trim()
    const title = letterTitleDraft.value.trim()
    const content = letterContentDraft.value.trim()
    if (!target_username) throw new Error('请先填写收件人用户名')
    if (!title) throw new Error('请先填写信件标题')
    if (!content) throw new Error('请先填写信件正文')
    sendLetterRunning.value = true
    try {
      const data = await sendPlayerLetter({
        target_username,
        title,
        content,
        template_type: letterTemplateTypeDraft.value,
        photo_url: letterPhotoUrlDraft.value.trim() || undefined,
        photo_alt: letterPhotoAltDraft.value.trim() || undefined,
      })
      await refreshList()
      await refreshLetterPresets()
      letterTitleDraft.value = ''
      letterContentDraft.value = ''
      letterPhotoUrlDraft.value = ''
      letterPhotoAltDraft.value = ''
      return data
    } finally {
      sendLetterRunning.value = false
    }
  }

  const addGiftPackageRewardDraft = () => {
    giftPackageRewardsDraft.value = [
      ...giftPackageRewardsDraft.value,
      { type: 'item', id: '', quantity: 1, quality: 'normal' }
    ]
  }

  const removeGiftPackageRewardDraft = (index: number) => {
    giftPackageRewardsDraft.value = giftPackageRewardsDraft.value.filter((_, currentIndex) => currentIndex !== index)
  }

  const sendPlayerGiftPackageMail = async () => {
    const target_username = giftPackageTargetDraft.value.trim()
    const title = giftPackageTitleDraft.value.trim()
    const content = giftPackageContentDraft.value.trim()
    const rewards = giftPackageRewardsDraft.value
      .map(reward => ({
        type: reward.type,
        id: reward.id.trim(),
        quantity: Math.max(1, Math.floor(Number(reward.quantity) || 1)),
        quality: reward.quality?.trim() || undefined,
      }))
      .filter(reward => reward.id)
    if (!target_username) throw new Error('请先填写收件人用户名')
    if (!title) throw new Error('请先填写包裹标题')
    if (rewards.length === 0) throw new Error('请先放入至少一项礼物')
    sendLetterRunning.value = true
    try {
      const data = await sendPlayerGiftPackage({
        target_username,
        title,
        content,
        template_type: giftPackageTemplateTypeDraft.value,
        rewards,
      })
      await refreshList()
      giftPackageTitleDraft.value = ''
      giftPackageContentDraft.value = ''
      giftPackageRewardsDraft.value = [{ type: 'item', id: '', quantity: 1, quality: 'normal' }]
      return data
    } finally {
      sendLetterRunning.value = false
    }
  }

  return {
    mails,
    sentMails,
    unreadCount,
    detailMap,
    receipts,
    memorialEntries,
    inboxStatus,
    arrivalDigest,
    loading,
    lastLoadedAt,
    sendLetterRunning,
    letterTemplatePresets,
    letterTargetDraft,
    letterTitleDraft,
    letterContentDraft,
    letterTemplateTypeDraft,
    letterPhotoUrlDraft,
    letterPhotoAltDraft,
    giftPackageTargetDraft,
    giftPackageTitleDraft,
    giftPackageContentDraft,
    giftPackageTemplateTypeDraft,
    giftPackageRewardsDraft,
    refreshList,
    refreshLetterPresets,
    refreshReceipts,
    refreshSentMails,
    refreshMemorialEntries,
    openMail,
    claimMail,
    claimAll,
    clearClaimed,
    setPinned,
    saveToMemorial,
    clearArrivalDigest,
    sendPlayerLetterMail,
    sendPlayerGiftPackageMail,
    addGiftPackageRewardDraft,
    removeGiftPackageRewardDraft,
    upsertMail
  }
})
