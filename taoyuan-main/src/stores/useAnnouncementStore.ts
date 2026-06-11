import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { buildScopedSingleKey, ensureCurrentAccount } from '@/utils/accountStorage'
import {
  fetchActiveAnnouncements,
  fetchAnnouncementHistory,
  recordAnnouncementEvent,
} from '@/utils/announcementApi'
import type { TaoyuanAnnouncement } from '@/types/announcement'

const SUPPRESSED_PREFIX = 'taoyuan_announcement_suppressed_'

const getSuppressedKey = (announcementId: string) => buildScopedSingleKey(`${SUPPRESSED_PREFIX}${announcementId}_`)

const readLocalSuppressed = (announcementId: string): boolean => {
  try {
    return window.localStorage.getItem(getSuppressedKey(announcementId)) === '1'
  } catch {
    return false
  }
}

const writeLocalSuppressed = (announcementId: string) => {
  try {
    window.localStorage.setItem(getSuppressedKey(announcementId), '1')
  } catch {
    /* ignore */
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

  const closeCurrent = () => {
    const closing = [...popupQueue.value]
    if (!closing.length) return
    for (const announcement of closing) {
      writeLocalSuppressed(announcement.id)
    }
    popupQueue.value = []
    for (const announcement of closing) {
      void recordAnnouncementEvent(announcement.id, 'close').catch(() => {})
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
    fetchActive,
    fetchHistory,
    closeCurrent,
    suppressCurrent,
    clickAnnouncementCta,
    clickCurrentCta,
  }
})
