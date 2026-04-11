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

  const syncAfterClaim = async (saveSlot: number | null | undefined) => {
    const saveStore = useSaveStore()
    if (saveSlot === null || saveSlot === undefined) return true
    if (saveStore.storageMode !== 'server') return true
    return await saveStore.loadFromSlot(saveSlot)
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
    const saveSyncOk = await syncAfterClaim(data.result?.save_slot)
    return { ...data, save_sync_ok: saveSyncOk }
  }

  const claimAll = async () => {
    const data = await claimAllMailboxMail()
    const firstSaveSlot = data.claimed?.find((item: any) => item?.result?.save_slot !== null && item?.result?.save_slot !== undefined)?.result?.save_slot
    const saveSyncOk = await syncAfterClaim(firstSaveSlot)
    await refreshList()
    return { ...data, save_sync_ok: saveSyncOk }
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
