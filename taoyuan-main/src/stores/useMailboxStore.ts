import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSaveStore } from '@/stores/useSaveStore'
import { useDecorationStore } from '@/stores/useDecorationStore'
import { useInventoryStore } from '@/stores/useInventoryStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { isProtectedApiError } from '@/utils/protectedApi'
import type { Quality } from '@/types'
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

export interface TaoyuanMailClaimResult {
  save_slot: number | null
  save_revision?: number
  money_added: number
  duplicate_compensation_money: number
  applied_rewards: TaoyuanMailReward[]
  skipped_rewards: Array<{ type: string; id?: string; quantity?: number; reason: string }>
  already_applied?: boolean
}

export interface TaoyuanMailSummary {
  id: string
  campaign_id: string
  title: string
  preview: string
  template_type: string | null
  sender_username?: string
  sender_display_name?: string
  recipient_username?: string
  recipient_display_name?: string
  target_save_id: number
  target_save_slot: number | null
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
  recipient_username: string
  recipient_display_name?: string
  claim_result: TaoyuanMailClaimResult | null
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
  save_revision?: number
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
  target_save_id: number
  target_save_slot: number | null
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
    | 'current_runtime_merge_failed'
    | 'current_runtime_merge_save_failed'
    | 'load_failed'
  message: string
}

interface MailClaimSyncClaim {
  id: string
  title?: string
  campaign_id?: string
  result?: TaoyuanMailClaimResult | null
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

const createEmptyInboxStatus = (): MailInboxStatus => ({
  unread_count: 0,
  pinned_count: 0,
  important_count: 0,
  newest_unread: null,
  newest_important: null
})

const createEmptyArrivalDigest = (): MailArrivalDigest => ({
  count: 0,
  titles: [],
  first_mail_id: null,
  arrived_at: null
})

const createDefaultGiftPackageRewards = (): PlayerGiftPackageRewardDraft[] => [
  { type: 'item', id: '', quantity: 1, quality: 'normal' }
]

const VALID_REWARD_QUALITIES = new Set<Quality>(['normal', 'fine', 'excellent', 'supreme'])

const normalizeRewardQuality = (value: unknown): Quality => {
  const normalized = String(value || 'normal') as Quality
  return VALID_REWARD_QUALITIES.has(normalized) ? normalized : 'normal'
}

const normalizeRewardQuantity = (value: unknown, fallback = 0) => {
  const normalized = Math.floor(Number(value) || 0)
  return normalized > 0 ? normalized : fallback
}

const toSummary = (mail: TaoyuanMailSummary | TaoyuanMailDetail): TaoyuanMailSummary => ({
  id: mail.id,
  campaign_id: mail.campaign_id,
  title: mail.title,
  preview: mail.preview,
  template_type: mail.template_type,
  sender_username: mail.sender_username,
  sender_display_name: mail.sender_display_name,
  recipient_username: mail.recipient_username,
  recipient_display_name: mail.recipient_display_name,
  target_save_id: Number(mail.target_save_id) || 0,
  target_save_slot: mail.target_save_slot === null || mail.target_save_slot === undefined
    ? null
    : Number(mail.target_save_slot),
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
  const inboxStatus = ref<MailInboxStatus>(createEmptyInboxStatus())
  const arrivalDigest = ref<MailArrivalDigest>(createEmptyArrivalDigest())
  const loading = ref(false)
  const lastLoadedAt = ref(0)
  const sendLetterRunning = ref(false)
  const letterTemplatePresets = ref<PlayerLetterTemplatePreset[]>([])
  const letterTargetDraft = ref('')
  const letterTargetSaveIdDraft = ref('')
  const letterTitleDraft = ref('')
  const letterContentDraft = ref('')
  const letterTemplateTypeDraft = ref<PlayerLetterTemplatePreset['template_type']>('player_letter')
  const letterPhotoUrlDraft = ref('')
  const letterPhotoAltDraft = ref('')
  const giftPackageTargetDraft = ref('')
  const giftPackageTargetSaveIdDraft = ref('')
  const giftPackageTitleDraft = ref('')
  const giftPackageContentDraft = ref('')
  const giftPackageTemplateTypeDraft = ref<'material_package' | 'seed_package' | 'fish_fry_package' | 'decoration_package' | 'souvenir_package'>('material_package')
  const giftPackageRewardsDraft = ref<PlayerGiftPackageRewardDraft[]>(createDefaultGiftPackageRewards())

  let lastSeenMailIds = new Set<string>()

  const resetForAccountChange = () => {
    mails.value = []
    sentMails.value = []
    unreadCount.value = 0
    detailMap.value = {}
    receipts.value = []
    memorialEntries.value = []
    inboxStatus.value = createEmptyInboxStatus()
    arrivalDigest.value = createEmptyArrivalDigest()
    loading.value = false
    lastLoadedAt.value = 0
    sendLetterRunning.value = false
    letterTemplatePresets.value = []
    letterTargetDraft.value = ''
    letterTargetSaveIdDraft.value = ''
    letterTitleDraft.value = ''
    letterContentDraft.value = ''
    letterTemplateTypeDraft.value = 'player_letter'
    letterPhotoUrlDraft.value = ''
    letterPhotoAltDraft.value = ''
    giftPackageTargetDraft.value = ''
    giftPackageTargetSaveIdDraft.value = ''
    giftPackageTitleDraft.value = ''
    giftPackageContentDraft.value = ''
    giftPackageTemplateTypeDraft.value = 'material_package'
    giftPackageRewardsDraft.value = createDefaultGiftPackageRewards()
    lastSeenMailIds = new Set<string>()
  }

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
    arrivalDigest.value = createEmptyArrivalDigest()
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

  const applyClaimRewardsToCurrentSession = (claim: MailClaimSyncClaim): { ok: boolean; changed: boolean } => {
    const result = claim.result
    if (!result) return { ok: true, changed: false }

    const saveStore = useSaveStore()
    if (saveStore.hasOnlineMailRewardDelivery(claim.id)) {
      return { ok: true, changed: false }
    }

    const appliedRewards = Array.isArray(result.applied_rewards) ? result.applied_rewards : []
    const stackableRewards = appliedRewards
      .filter(reward => (reward.type === 'item' || reward.type === 'seed') && reward.id)
      .map(reward => ({
        itemId: String(reward.id),
        quantity: normalizeRewardQuantity(reward.quantity, 0),
        quality: normalizeRewardQuality(reward.quality)
      }))
      .filter(reward => reward.quantity > 0)

    const inventoryStore = useInventoryStore()
    if (stackableRewards.length > 0 && !inventoryStore.canAddItems(stackableRewards, true)) {
      return { ok: false, changed: false }
    }

    const playerStore = usePlayerStore()
    const decorationStore = useDecorationStore()
    let changed = false

    for (const reward of appliedRewards) {
      if (reward.type === 'money') {
        const amount = normalizeRewardQuantity(reward.amount, 0)
        if (amount > 0) {
          playerStore.earnMoney(amount)
          changed = true
        }
        continue
      }

      if (reward.type === 'decoration' && reward.id) {
        const quantity = normalizeRewardQuantity(reward.quantity, 0)
        if (quantity > 0) {
          const id = String(reward.id)
          decorationStore.owned[id] = normalizeRewardQuantity(decorationStore.owned[id], 0) + quantity
          changed = true
        }
        continue
      }

      if (reward.type === 'weapon' && reward.id) {
        const quantity = normalizeRewardQuantity(reward.quantity, 1)
        for (let index = 0; index < quantity; index += 1) inventoryStore.addWeapon(String(reward.id))
        changed = true
        continue
      }

      if (reward.type === 'ring' && reward.id) {
        const quantity = normalizeRewardQuantity(reward.quantity, 1)
        for (let index = 0; index < quantity; index += 1) inventoryStore.addRing(String(reward.id))
        changed = true
        continue
      }

      if (reward.type === 'hat' && reward.id) {
        const quantity = normalizeRewardQuantity(reward.quantity, 1)
        for (let index = 0; index < quantity; index += 1) inventoryStore.addHat(String(reward.id))
        changed = true
        continue
      }

      if (reward.type === 'shoe' && reward.id) {
        const quantity = normalizeRewardQuantity(reward.quantity, 1)
        for (let index = 0; index < quantity; index += 1) inventoryStore.addShoe(String(reward.id))
        changed = true
      }
    }

    if (stackableRewards.length > 0) {
      if (!inventoryStore.addItemsExact(stackableRewards, true)) return { ok: false, changed }
      changed = true
    }

    if (claim.id) {
      saveStore.recordOnlineMailRewardDelivery(claim.id, {
        campaign_id: claim.campaign_id || '',
        mail_title: claim.title || '',
        applied_at: Math.floor(Date.now() / 1000),
        result: {
          ...result,
          applied_rewards: appliedRewards.map(reward => ({ ...reward })),
          skipped_rewards: Array.isArray(result.skipped_rewards)
            ? result.skipped_rewards.map(reward => ({ ...reward }))
            : []
        }
      })
      changed = true
    }

    return { ok: true, changed }
  }

  const syncAfterClaim = async (claims: MailClaimSyncClaim[]): Promise<MailClaimSyncState> => {
    const saveStore = useSaveStore()
    for (const claim of claims) {
      const saveSlot = claim.result?.save_slot
      const saveRevision = claim.result?.save_revision
      if (Number.isInteger(saveSlot) && Number.isFinite(Number(saveRevision)) && Number(saveRevision) > 0) {
        saveStore.acknowledgeServerSlotRevision(Number(saveSlot), Number(saveRevision))
      }
    }
    const normalizedSaveSlots = Array.from(new Set(
      claims
        .map(claim => claim.result?.save_slot)
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

    const currentSessionClaims = claims.filter(claim => Number(claim.result?.save_slot) === currentSessionSlot)
    let changedCurrentSession = false
    for (const claim of currentSessionClaims) {
      const applied = applyClaimRewardsToCurrentSession(claim)
      if (!applied.ok) {
        return buildClaimSyncState({
          attempted: false,
          current_session_synced: false,
          current_storage_mode: currentStorageMode,
          current_session_mode: currentSessionMode,
          current_session_slot: currentSessionSlot,
          claimed_save_slots: normalizedSaveSlots,
          reason: 'load_failed',
          reason_detail: 'current_runtime_merge_failed',
          message: '奖励已经写入服务端存档，但当前运行态背包合并失败；本地进度未被覆盖，请手动重新载入对应服务端槽位核对。'
        })
      }
      changedCurrentSession = changedCurrentSession || applied.changed
    }

    if (changedCurrentSession) {
      const saved = await saveStore.saveToSlot(currentSessionSlot)
      return buildClaimSyncState({
        attempted: true,
        current_session_synced: saved,
        current_storage_mode: currentStorageMode,
        current_session_mode: currentSessionMode,
        current_session_slot: currentSessionSlot,
        claimed_save_slots: normalizedSaveSlots,
        reason: saved ? 'synced' : 'load_failed',
        reason_detail: saved ? 'synced' : 'current_runtime_merge_save_failed',
        message: saved
          ? '奖励已合并进当前服务端运行态，并连同本地进度一起保存。'
          : '奖励已合并进当前运行态，本地进度未被覆盖；服务端同步仍需处理云存档冲突或网络队列。'
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

    const synced = true
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

  const refreshList = async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true
    if (!silent) loading.value = true
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
    } catch (error) {
      if (
        (isProtectedApiError(error) && error.status === 401) ||
        (error instanceof Error && error.message.includes('请先登录'))
      ) {
        resetForAccountChange()
      }
      throw error
    } finally {
      if (!silent) loading.value = false
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
    const saveSyncState = await syncAfterClaim([{
      id: detail.id,
      title: detail.title,
      campaign_id: detail.campaign_id,
      result: data.result as TaoyuanMailClaimResult | null
    }])
    return { ...data, save_sync_state: saveSyncState }
  }

  const claimAll = async () => {
    const data = await claimAllMailboxMail()
    const claimed = Array.isArray(data.claimed)
      ? data.claimed.map((item: any) => ({
        id: String(item?.id || ''),
        title: typeof item?.title === 'string' ? item.title : '',
        campaign_id: typeof item?.campaign_id === 'string' ? item.campaign_id : '',
        result: item?.result as TaoyuanMailClaimResult | null
      }))
      : []
    const saveSyncState = await syncAfterClaim(claimed)
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
    const targetSaveIdDraft = letterTargetSaveIdDraft.value.trim()
    const target_save_id = Number(targetSaveIdDraft)
    const title = letterTitleDraft.value.trim()
    const content = letterContentDraft.value.trim()
    if (!target_username && !targetSaveIdDraft) throw new Error('请先填写收件人用户名或存档 ID')
    if (targetSaveIdDraft && !Number.isInteger(target_save_id)) throw new Error('存档 ID 格式不正确')
    if (!title) throw new Error('请先填写信件标题')
    if (!content) throw new Error('请先填写信件正文')
    sendLetterRunning.value = true
    try {
      const data = await sendPlayerLetter({
        target_username,
        target_save_id: targetSaveIdDraft ? target_save_id : undefined,
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
    const targetSaveIdDraft = giftPackageTargetSaveIdDraft.value.trim()
    const target_save_id = Number(targetSaveIdDraft)
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
    if (!target_username && !targetSaveIdDraft) throw new Error('请先填写收件人用户名或存档 ID')
    if (targetSaveIdDraft && !Number.isInteger(target_save_id)) throw new Error('存档 ID 格式不正确')
    if (!title) throw new Error('请先填写包裹标题')
    if (rewards.length === 0) throw new Error('请先放入至少一项礼物')
    sendLetterRunning.value = true
    try {
      const data = await sendPlayerGiftPackage({
        target_username,
        target_save_id: targetSaveIdDraft ? target_save_id : undefined,
        title,
        content,
        template_type: giftPackageTemplateTypeDraft.value,
        rewards,
      })
      await refreshList()
      giftPackageTitleDraft.value = ''
      giftPackageContentDraft.value = ''
      giftPackageRewardsDraft.value = createDefaultGiftPackageRewards()
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
    letterTargetSaveIdDraft,
    letterTitleDraft,
    letterContentDraft,
    letterTemplateTypeDraft,
    letterPhotoUrlDraft,
    letterPhotoAltDraft,
    giftPackageTargetDraft,
    giftPackageTargetSaveIdDraft,
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
    resetForAccountChange,
    sendPlayerLetterMail,
    sendPlayerGiftPackageMail,
    addGiftPackageRewardDraft,
    removeGiftPackageRewardDraft,
    upsertMail
  }
})
