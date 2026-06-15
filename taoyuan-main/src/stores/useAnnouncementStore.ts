import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { buildScopedSingleKey, ensureCurrentAccount } from '@/utils/accountStorage'
import { useSaveStore } from '@/stores/useSaveStore'
import {
  claimAnnouncementReward,
  fetchActiveAnnouncements,
  fetchAnnouncementHistory,
  recordAnnouncementEvent,
} from '@/utils/announcementApi'
import type { TaoyuanAnnouncement } from '@/types/announcement'

const SUPPRESSED_PREFIX = 'taoyuan_announcement_suppressed_'

const getAnnouncementSuppressionScope = (): string => {
  try {
    const saveStore = useSaveStore()
    const mode = saveStore.runtimeSessionMode ?? saveStore.activeSlotMode ?? saveStore.storageMode
    const slot = Number(
      saveStore.runtimeSessionSlot >= 0
        ? saveStore.runtimeSessionSlot
        : saveStore.activeSlot
    )
    if (!Number.isInteger(slot) || slot < 0) return ''

    if (mode === 'local') return `local_slot_${slot}`
    if (mode !== 'server') return ''

    const saveId = Number(saveStore.currentOnlineIdentity?.save_id)
    if (Number.isInteger(saveId) && saveId > 0) return `save_${saveId}`

    return `slot_${slot}`
  } catch {
    return ''
  }
}

const getSuppressedKey = (announcementId: string) => {
  const scope = getAnnouncementSuppressionScope()
  if (!scope) return ''
  return buildScopedSingleKey(`${SUPPRESSED_PREFIX}${announcementId}_${scope}_`)
}

const readLocalSuppressed = (announcementId: string): boolean => {
  try {
    const key = getSuppressedKey(announcementId)
    if (!key) return false
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

const writeLocalSuppressed = (announcementId: string): boolean => {
  try {
    const key = getSuppressedKey(announcementId)
    if (!key) return false
    window.localStorage.setItem(key, '1')
    return true
  } catch {
    return false
  }
}

const canClaimAnnouncementRewards = (): boolean => {
  try {
    const saveStore = useSaveStore()
    return saveStore.runtimeSessionMode === 'server'
  } catch {
    return false
  }
}

export const useAnnouncementStore = defineStore('announcement', () => {
  const activeAnnouncements = ref<TaoyuanAnnouncement[]>([])
  const popupQueue = ref<TaoyuanAnnouncement[]>([])
  const historyAnnouncements = ref<TaoyuanAnnouncement[]>([])
  const loadingActive = ref(false)
  const loadingHistory = ref(false)
  const activeError = ref('')
  const historyError = ref('')
  const impressionIds = ref<Set<string>>(new Set())

  const currentAnnouncement = computed(() => popupQueue.value[0] || null)
  const canClaimRewardsInCurrentSession = computed(() => canClaimAnnouncementRewards())

  const markImpressionSeen = (announcementId: string) => {
    impressionIds.value = new Set([...impressionIds.value, announcementId])
  }

  const recordQueueImpressions = async () => {
    const pending = popupQueue.value.filter(item => item.id && !impressionIds.value.has(item.id))
    if (!pending.length) return
    for (const item of pending) {
      markImpressionSeen(item.id)
    }
    await Promise.all(pending.map(item => recordAnnouncementEvent(item.id, 'impression').catch(() => {})))
  }

  const rebuildQueue = async (items: TaoyuanAnnouncement[]) => {
    await ensureCurrentAccount().catch(() => '')
    activeAnnouncements.value = items
    popupQueue.value = items.filter(item => !readLocalSuppressed(item.id))
    impressionIds.value = new Set()
    await recordQueueImpressions()
  }

  const fetchActive = async () => {
    loadingActive.value = true
    activeError.value = ''
    try {
      await rebuildQueue(await fetchActiveAnnouncements())
    } catch (error) {
      activeError.value = error instanceof Error ? error.message : '更新公告加载失败'
    } finally {
      loadingActive.value = false
    }
  }

  const fetchHistory = async () => {
    loadingHistory.value = true
    historyError.value = ''
    try {
      historyAnnouncements.value = await fetchAnnouncementHistory()
    } catch (error) {
      historyError.value = error instanceof Error ? error.message : '历史公告加载失败'
    } finally {
      loadingHistory.value = false
    }
  }

  const closeCurrent = async () => {
    const closing = [...popupQueue.value]
    if (!closing.length) return { claimedCount: 0, skippedRewardCount: 0 }
    const rewardAnnouncements = closing.filter(announcement => announcement.rewards.length > 0)
    const claimableRewardAnnouncements = canClaimAnnouncementRewards() ? rewardAnnouncements : []
    for (const announcement of claimableRewardAnnouncements) {
      await claimAnnouncementReward(announcement.id)
    }
    for (const announcement of closing) {
      writeLocalSuppressed(announcement.id)
    }
    popupQueue.value = []
    for (const announcement of closing) {
      void recordAnnouncementEvent(announcement.id, 'close').catch(() => {})
    }
    return {
      claimedCount: claimableRewardAnnouncements.length,
      skippedRewardCount: rewardAnnouncements.length - claimableRewardAnnouncements.length,
    }
  }

  const suppressCurrent = async () => {
    const suppressing = [...popupQueue.value]
    if (!suppressing.length) return
    await ensureCurrentAccount().catch(() => '')
    for (const announcement of suppressing) {
      writeLocalSuppressed(announcement.id)
    }
    popupQueue.value = []
    for (const announcement of suppressing) {
      void recordAnnouncementEvent(announcement.id, 'suppress').catch(() => {})
    }
  }

  const clickAnnouncementCta = (announcementId?: string) => {
    const current = announcementId
      ? popupQueue.value.find(item => item.id === announcementId) || null
      : currentAnnouncement.value
    if (!current) return null
    void recordAnnouncementEvent(current.id, 'cta_click', { cta_url: current.cta_url }).catch(() => {})
    return current
  }

  const clickCurrentCta = () => clickAnnouncementCta()

  return {
    activeAnnouncements,
    popupQueue,
    historyAnnouncements,
    loadingActive,
    loadingHistory,
    activeError,
    historyError,
    currentAnnouncement,
    canClaimRewardsInCurrentSession,
    fetchActive,
    fetchHistory,
    closeCurrent,
    suppressCurrent,
    clickAnnouncementCta,
    clickCurrentCta,
  }
})
