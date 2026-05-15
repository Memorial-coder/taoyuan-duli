import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  DailyDigestAlert,
  DailyDigestEntry,
  DailyDigestSection,
  DailyDigestTone,
  PlayerRecordCenterSaveData,
  RecordCenterTabId
} from '@/types'

const PLAYER_RECORD_CENTER_SAVE_VERSION = 1
const MAX_DAILY_DIGESTS = 21

const seasonOrderMap = {
  spring: 0,
  summer: 1,
  autumn: 2,
  winter: 3
} as const

const createDefaultSaveData = (): PlayerRecordCenterSaveData => ({
  saveVersion: PLAYER_RECORD_CENTER_SAVE_VERSION,
  dailyDigests: [],
  lastViewedDigestDayTag: '',
  lastOpenTab: 'daily'
})

const normalizeRecordCenterTab = (value: unknown): RecordCenterTabId =>
  value === 'chronicle' || value === 'clues' || value === 'system' ? value : 'daily'

const normalizeDayTagSortValue = (dayTag: string) => {
  const match = /^(\d+)-(spring|summer|autumn|winter)-(\d+)$/.exec(dayTag.trim())
  if (!match) return Number.MIN_SAFE_INTEGER

  const year = Number(match[1] ?? 0)
  const seasonKey = (match[2] ?? 'spring') as keyof typeof seasonOrderMap
  const day = Number(match[3] ?? 0)
  const season = seasonOrderMap[seasonKey] ?? 0
  return year * 1000 + season * 100 + day
}

const normalizeDigestTone = (tone: unknown): DailyDigestTone =>
  tone === 'success' || tone === 'warning' || tone === 'danger' ? tone : 'normal'

const normalizeDailyDigestEntry = (entry: Partial<DailyDigestEntry> | null | undefined): DailyDigestEntry | null => {
  if (!entry || typeof entry !== 'object' || typeof entry.dayTag !== 'string' || typeof entry.title !== 'string') {
    return null
  }

  const sections = Array.isArray(entry.sections)
    ? entry.sections
        .filter(section => section && typeof section === 'object' && typeof section.sectionId === 'string')
        .map(section => {
          const raw = section as Partial<DailyDigestSection> & { sectionId: string }
          return {
            sectionId: raw.sectionId as DailyDigestSection['sectionId'],
            title: typeof raw.title === 'string' ? raw.title : '',
            tone: normalizeDigestTone(raw.tone),
            headline: typeof raw.headline === 'string' ? raw.headline : '',
            detailLines: Array.isArray(raw.detailLines)
              ? raw.detailLines.filter((line): line is string => typeof line === 'string').slice(0, 3)
              : [],
            priority: Math.max(0, Math.floor(Number(raw.priority) || 0))
          }
        })
        .filter(section => section.title || section.headline || section.detailLines.length > 0)
    : []

  const alerts = Array.isArray(entry.alerts)
    ? entry.alerts
        .filter(alert => alert && typeof alert === 'object' && typeof alert.message === 'string')
        .map(alert => ({
          message: (alert as DailyDigestAlert).message,
          tone: normalizeDigestTone((alert as DailyDigestAlert).tone)
        }))
        .slice(0, 6)
    : []

  return {
    dayTag: entry.dayTag,
    title: entry.title,
    sections,
    alerts,
    createdAt: Math.max(0, Math.floor(Number(entry.createdAt) || Date.now()))
  }
}

const normalizeSaveData = (data: Partial<PlayerRecordCenterSaveData> | undefined | null): PlayerRecordCenterSaveData => {
  const fallback = createDefaultSaveData()
  const dailyDigests = Array.isArray(data?.dailyDigests)
    ? data.dailyDigests
        .map(entry => normalizeDailyDigestEntry(entry))
        .filter((entry): entry is DailyDigestEntry => Boolean(entry))
        .sort((left, right) => normalizeDayTagSortValue(right.dayTag) - normalizeDayTagSortValue(left.dayTag) || right.createdAt - left.createdAt)
        .slice(0, MAX_DAILY_DIGESTS)
    : fallback.dailyDigests

  return {
    saveVersion: Math.max(PLAYER_RECORD_CENTER_SAVE_VERSION, Math.floor(Number(data?.saveVersion) || PLAYER_RECORD_CENTER_SAVE_VERSION)),
    dailyDigests,
    lastViewedDigestDayTag: typeof data?.lastViewedDigestDayTag === 'string' ? data.lastViewedDigestDayTag : fallback.lastViewedDigestDayTag,
    lastOpenTab: normalizeRecordCenterTab(data?.lastOpenTab)
  }
}

export const formatRecordDayTag = (dayTag: string) => {
  const match = /^(\d+)-(spring|summer|autumn|winter)-(\d+)$/.exec(dayTag.trim())
  if (!match) return dayTag || '未标记日期'

  const seasonLabelMap = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬'
  } as const

  const year = match[1] ?? ''
  const seasonKey = (match[2] ?? 'spring') as keyof typeof seasonLabelMap
  const day = match[3] ?? ''
  return `${year}年${seasonLabelMap[seasonKey] ?? seasonKey}${day}日`
}

export const getRecordDayTagSortValue = (dayTag: string) => normalizeDayTagSortValue(dayTag)

export const usePlayerRecordCenterStore = defineStore('playerRecordCenter', () => {
  const saveData = ref<PlayerRecordCenterSaveData>(createDefaultSaveData())

  const dailyDigests = computed(() => saveData.value.dailyDigests)
  const latestDailyDigest = computed(() => saveData.value.dailyDigests[0] ?? null)
  const hasUnreadDailyDigest = computed(() => {
    const latest = latestDailyDigest.value
    return !!latest && latest.dayTag !== saveData.value.lastViewedDigestDayTag
  })
  const unreadDailyDigestCount = computed(() => (hasUnreadDailyDigest.value ? 1 : 0))
  const lastViewedDigestDayTag = computed(() => saveData.value.lastViewedDigestDayTag)
  const lastOpenTab = computed(() => saveData.value.lastOpenTab)

  const recordDailyDigest = (entry: DailyDigestEntry) => {
    const normalizedEntry = normalizeDailyDigestEntry(entry)
    if (!normalizedEntry) return null

    saveData.value.dailyDigests = [normalizedEntry, ...saveData.value.dailyDigests.filter(current => current.dayTag !== normalizedEntry.dayTag)]
      .sort((left, right) => normalizeDayTagSortValue(right.dayTag) - normalizeDayTagSortValue(left.dayTag) || right.createdAt - left.createdAt)
      .slice(0, MAX_DAILY_DIGESTS)

    return normalizedEntry
  }

  const markDailyDigestRead = (dayTag?: string) => {
    const targetDayTag = typeof dayTag === 'string' && dayTag.trim().length > 0 ? dayTag.trim() : latestDailyDigest.value?.dayTag ?? ''
    if (!targetDayTag) return
    saveData.value.lastViewedDigestDayTag = targetDayTag
  }

  const setLastOpenTab = (tab: RecordCenterTabId) => {
    saveData.value.lastOpenTab = tab
  }

  const getPreferredOpenTab = (): RecordCenterTabId => (hasUnreadDailyDigest.value ? 'daily' : saveData.value.lastOpenTab)

  const serialize = (): PlayerRecordCenterSaveData => ({
    saveVersion: saveData.value.saveVersion,
    dailyDigests: saveData.value.dailyDigests.map(entry => ({
      ...entry,
      sections: entry.sections.map(section => ({
        ...section,
        detailLines: [...section.detailLines]
      })),
      alerts: entry.alerts.map(alert => ({ ...alert }))
    })),
    lastViewedDigestDayTag: saveData.value.lastViewedDigestDayTag,
    lastOpenTab: saveData.value.lastOpenTab
  })

  const deserialize = (data: Partial<PlayerRecordCenterSaveData> | undefined | null) => {
    saveData.value = normalizeSaveData(data)
  }

  return {
    saveData,
    dailyDigests,
    latestDailyDigest,
    hasUnreadDailyDigest,
    unreadDailyDigestCount,
    lastViewedDigestDayTag,
    lastOpenTab,
    recordDailyDigest,
    markDailyDigestRead,
    setLastOpenTab,
    getPreferredOpenTab,
    serialize,
    deserialize
  }
})
