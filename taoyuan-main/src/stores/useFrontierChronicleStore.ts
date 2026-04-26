import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RegionId } from '@/types/region'
import type { Season, Weather } from '@/types'

type ChronicleEntryType = 'journey' | 'rumor' | 'variant' | 'companion' | 'photo'

export interface FrontierChronicleEntry {
  id: string
  entryKey: string
  type: ChronicleEntryType
  title: string
  summary: string
  detailLines: string[]
  regionId: RegionId | null
  season: Season | null
  weather: Weather | null
  rumorId: string | null
  companionNpcId: string | null
  companionName: string
  variantId: string | null
  firstRecordedDayTag: string
  lastRecordedDayTag: string
  discoverCount: number
  tags: string[]
}

export interface FrontierRumorReceipt {
  id: string
  rumorId: string
  regionId: RegionId
  title: string
  sourceNpcId: string
  sourceNpcName: string
  resolvedDayTag: string
  summary: string
}

export interface FrontierPhotoMoment {
  id: string
  chronicleEntryKey: string
  label: string
  frameHint: string
  regionId: RegionId | null
  season: Season | null
  weather: Weather | null
  capturedDayTag: string
}

interface FrontierChronicleSaveData {
  saveVersion: number
  chronicleEntries: FrontierChronicleEntry[]
  rumorReceipts: FrontierRumorReceipt[]
  photoMoments: FrontierPhotoMoment[]
  regionNotables: Record<RegionId, string[]>
}

const FRONTIER_CHRONICLE_SAVE_VERSION = 1
const MAX_CHRONICLE_ENTRIES = 120
const MAX_RUMOR_RECEIPTS = 80
const MAX_PHOTO_MOMENTS = 80

const createChronicleId = () => `chronicle:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createDefaultRegionNotables = (): Record<RegionId, string[]> => ({
  ancient_road: [],
  mirage_marsh: [],
  cloud_highland: []
})

const createDefaultSaveData = (): FrontierChronicleSaveData => ({
  saveVersion: FRONTIER_CHRONICLE_SAVE_VERSION,
  chronicleEntries: [],
  rumorReceipts: [],
  photoMoments: [],
  regionNotables: createDefaultRegionNotables()
})

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

export const useFrontierChronicleStore = defineStore('frontierChronicle', () => {
  const saveData = ref<FrontierChronicleSaveData>(createDefaultSaveData())

  const chronicleEntries = computed(() =>
    [...saveData.value.chronicleEntries].sort((left, right) => right.lastRecordedDayTag.localeCompare(left.lastRecordedDayTag))
  )
  const rumorReceipts = computed(() =>
    [...saveData.value.rumorReceipts].sort((left, right) => right.resolvedDayTag.localeCompare(left.resolvedDayTag))
  )
  const photoMoments = computed(() =>
    [...saveData.value.photoMoments].sort((left, right) => right.capturedDayTag.localeCompare(left.capturedDayTag))
  )
  const regionNotables = computed(() => saveData.value.regionNotables)

  const recordChronicleEntry = (entry: Omit<FrontierChronicleEntry, 'id' | 'discoverCount'> & { discoverCount?: number }) => {
    const existingIndex = saveData.value.chronicleEntries.findIndex(current => current.entryKey === entry.entryKey)
    if (existingIndex >= 0) {
      const current = saveData.value.chronicleEntries[existingIndex]!
      saveData.value.chronicleEntries[existingIndex] = {
        ...current,
        title: entry.title || current.title,
        summary: entry.summary || current.summary,
        detailLines: entry.detailLines.length > 0 ? [...entry.detailLines] : current.detailLines,
        regionId: entry.regionId ?? current.regionId,
        season: entry.season ?? current.season,
        weather: entry.weather ?? current.weather,
        rumorId: entry.rumorId ?? current.rumorId,
        companionNpcId: entry.companionNpcId ?? current.companionNpcId,
        companionName: entry.companionName || current.companionName,
        variantId: entry.variantId ?? current.variantId,
        lastRecordedDayTag: entry.lastRecordedDayTag || current.lastRecordedDayTag,
        discoverCount: Math.max(1, current.discoverCount + Math.max(1, entry.discoverCount ?? 1)),
        tags: uniqueStrings([...current.tags, ...entry.tags])
      }
      return saveData.value.chronicleEntries[existingIndex]!
    }

    const nextEntry: FrontierChronicleEntry = {
      id: createChronicleId(),
      entryKey: entry.entryKey,
      type: entry.type,
      title: entry.title,
      summary: entry.summary,
      detailLines: [...entry.detailLines],
      regionId: entry.regionId,
      season: entry.season,
      weather: entry.weather,
      rumorId: entry.rumorId,
      companionNpcId: entry.companionNpcId,
      companionName: entry.companionName,
      variantId: entry.variantId,
      firstRecordedDayTag: entry.firstRecordedDayTag,
      lastRecordedDayTag: entry.lastRecordedDayTag,
      discoverCount: Math.max(1, entry.discoverCount ?? 1),
      tags: uniqueStrings(entry.tags)
    }
    saveData.value.chronicleEntries = [nextEntry, ...saveData.value.chronicleEntries].slice(0, MAX_CHRONICLE_ENTRIES)
    return nextEntry
  }

  const recordRumorReceipt = (receipt: Omit<FrontierRumorReceipt, 'id'>) => {
    if (
      saveData.value.rumorReceipts.some(
        current => current.rumorId === receipt.rumorId && current.resolvedDayTag === receipt.resolvedDayTag
      )
    ) {
      return saveData.value.rumorReceipts.find(
        current => current.rumorId === receipt.rumorId && current.resolvedDayTag === receipt.resolvedDayTag
      )!
    }

    const nextReceipt: FrontierRumorReceipt = {
      id: createChronicleId(),
      ...receipt
    }
    saveData.value.rumorReceipts = [nextReceipt, ...saveData.value.rumorReceipts].slice(0, MAX_RUMOR_RECEIPTS)
    return nextReceipt
  }

  const recordPhotoMoment = (moment: Omit<FrontierPhotoMoment, 'id'>) => {
    const existing = saveData.value.photoMoments.find(entry => entry.chronicleEntryKey === moment.chronicleEntryKey && entry.label === moment.label)
    if (existing) return existing

    const nextMoment: FrontierPhotoMoment = {
      id: createChronicleId(),
      ...moment
    }
    saveData.value.photoMoments = [nextMoment, ...saveData.value.photoMoments].slice(0, MAX_PHOTO_MOMENTS)
    return nextMoment
  }

  const recordRegionNotable = (regionId: RegionId, notableKey: string) => {
    if (!notableKey) return saveData.value.regionNotables[regionId] ?? []
    const current = saveData.value.regionNotables[regionId] ?? []
    saveData.value.regionNotables[regionId] = uniqueStrings([notableKey, ...current]).slice(0, 24)
    return saveData.value.regionNotables[regionId]
  }

  const getChronicleOverview = (filters?: {
    regionId?: RegionId | 'all'
    season?: Season | 'all'
    weather?: Weather | 'all'
    type?: ChronicleEntryType | 'all'
    companionNpcId?: string | 'all'
    rumorOnly?: boolean
    variantOnly?: boolean
  }) => {
    const entries = chronicleEntries.value.filter(entry => {
      if (filters?.regionId && filters.regionId !== 'all' && entry.regionId !== filters.regionId) return false
      if (filters?.season && filters.season !== 'all' && entry.season !== filters.season) return false
      if (filters?.weather && filters.weather !== 'all' && entry.weather !== filters.weather) return false
      if (filters?.type && filters.type !== 'all' && entry.type !== filters.type) return false
      if (filters?.companionNpcId && filters.companionNpcId !== 'all' && entry.companionNpcId !== filters.companionNpcId) return false
      if (filters?.rumorOnly && !entry.rumorId) return false
      if (filters?.variantOnly && !entry.variantId) return false
      return true
    })

    return {
      totalEntries: chronicleEntries.value.length,
      filteredCount: entries.length,
      entries,
      regionOptions: uniqueStrings(chronicleEntries.value.map(entry => entry.regionId ?? ''))
        .filter((value): value is RegionId => value === 'ancient_road' || value === 'mirage_marsh' || value === 'cloud_highland'),
      seasonOptions: uniqueStrings(chronicleEntries.value.map(entry => entry.season ?? ''))
        .filter((value): value is Season => value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter'),
      weatherOptions: uniqueStrings(chronicleEntries.value.map(entry => entry.weather ?? ''))
        .filter(
          (value): value is Weather =>
            value === 'sunny' ||
            value === 'rainy' ||
            value === 'stormy' ||
            value === 'snowy' ||
            value === 'windy' ||
            value === 'green_rain'
        ),
      companionOptions: uniqueStrings(
        chronicleEntries.value
          .filter(entry => entry.companionNpcId)
          .map(entry => `${entry.companionNpcId}:${entry.companionName || entry.companionNpcId}`)
      ),
      recentRumorReceipts: rumorReceipts.value.slice(0, 8),
      recentPhotoMoments: photoMoments.value.slice(0, 8)
    }
  }

  const serialize = (): FrontierChronicleSaveData => ({
    saveVersion: saveData.value.saveVersion,
    chronicleEntries: saveData.value.chronicleEntries.map(entry => ({
      ...entry,
      detailLines: [...entry.detailLines],
      tags: [...entry.tags]
    })),
    rumorReceipts: saveData.value.rumorReceipts.map(entry => ({ ...entry })),
    photoMoments: saveData.value.photoMoments.map(entry => ({ ...entry })),
    regionNotables: {
      ancient_road: [...(saveData.value.regionNotables.ancient_road ?? [])],
      mirage_marsh: [...(saveData.value.regionNotables.mirage_marsh ?? [])],
      cloud_highland: [...(saveData.value.regionNotables.cloud_highland ?? [])]
    }
  })

  const deserialize = (data: Partial<FrontierChronicleSaveData> | undefined | null) => {
    const fallback = createDefaultSaveData()
    if (!data || typeof data !== 'object') {
      saveData.value = fallback
      return
    }

    saveData.value = {
      saveVersion: Math.max(1, Math.floor(Number(data.saveVersion) || fallback.saveVersion)),
      chronicleEntries: Array.isArray(data.chronicleEntries)
        ? data.chronicleEntries
            .filter(entry => entry && typeof entry === 'object' && typeof entry.entryKey === 'string')
            .map(entry => {
              const entryType: ChronicleEntryType =
                entry.type === 'rumor' || entry.type === 'variant' || entry.type === 'companion' || entry.type === 'photo'
                  ? entry.type
                  : 'journey'
              return {
                id: typeof entry.id === 'string' ? entry.id : createChronicleId(),
                entryKey: String(entry.entryKey),
                type: entryType,
                title: typeof entry.title === 'string' ? entry.title : '行旅见闻',
                summary: typeof entry.summary === 'string' ? entry.summary : '',
                detailLines: Array.isArray(entry.detailLines) ? entry.detailLines.filter((line): line is string => typeof line === 'string').slice(0, 8) : [],
                regionId:
                  entry.regionId === 'ancient_road' || entry.regionId === 'mirage_marsh' || entry.regionId === 'cloud_highland'
                    ? entry.regionId
                    : null,
                season:
                  entry.season === 'spring' || entry.season === 'summer' || entry.season === 'autumn' || entry.season === 'winter'
                    ? entry.season
                    : null,
                weather:
                  entry.weather === 'sunny' ||
                  entry.weather === 'rainy' ||
                  entry.weather === 'stormy' ||
                  entry.weather === 'snowy' ||
                  entry.weather === 'windy' ||
                  entry.weather === 'green_rain'
                    ? entry.weather
                    : null,
                rumorId: typeof entry.rumorId === 'string' ? entry.rumorId : null,
                companionNpcId: typeof entry.companionNpcId === 'string' ? entry.companionNpcId : null,
                companionName: typeof entry.companionName === 'string' ? entry.companionName : '',
                variantId: typeof entry.variantId === 'string' ? entry.variantId : null,
                firstRecordedDayTag: typeof entry.firstRecordedDayTag === 'string' ? entry.firstRecordedDayTag : '',
                lastRecordedDayTag: typeof entry.lastRecordedDayTag === 'string' ? entry.lastRecordedDayTag : '',
                discoverCount: Math.max(1, Math.floor(Number(entry.discoverCount) || 1)),
                tags: Array.isArray(entry.tags) ? uniqueStrings(entry.tags.filter((tag): tag is string => typeof tag === 'string')).slice(0, 12) : []
              } satisfies FrontierChronicleEntry
            })
            .slice(0, MAX_CHRONICLE_ENTRIES)
        : [],
      rumorReceipts: Array.isArray(data.rumorReceipts)
        ? data.rumorReceipts
            .filter(entry => entry && typeof entry === 'object' && typeof entry.rumorId === 'string')
            .map(entry => ({
              id: typeof entry.id === 'string' ? entry.id : createChronicleId(),
              rumorId: String(entry.rumorId),
              regionId:
                entry.regionId === 'ancient_road' || entry.regionId === 'mirage_marsh' || entry.regionId === 'cloud_highland'
                  ? entry.regionId
                  : 'ancient_road',
              title: typeof entry.title === 'string' ? entry.title : '传闻回执',
              sourceNpcId: typeof entry.sourceNpcId === 'string' ? entry.sourceNpcId : '',
              sourceNpcName: typeof entry.sourceNpcName === 'string' ? entry.sourceNpcName : '',
              resolvedDayTag: typeof entry.resolvedDayTag === 'string' ? entry.resolvedDayTag : '',
              summary: typeof entry.summary === 'string' ? entry.summary : ''
            }))
            .slice(0, MAX_RUMOR_RECEIPTS)
        : [],
      photoMoments: Array.isArray(data.photoMoments)
        ? data.photoMoments
            .filter(entry => entry && typeof entry === 'object' && typeof entry.chronicleEntryKey === 'string')
            .map(entry => ({
              id: typeof entry.id === 'string' ? entry.id : createChronicleId(),
              chronicleEntryKey: String(entry.chronicleEntryKey),
              label: typeof entry.label === 'string' ? entry.label : '留影卡',
              frameHint: typeof entry.frameHint === 'string' ? entry.frameHint : '',
              regionId:
                entry.regionId === 'ancient_road' || entry.regionId === 'mirage_marsh' || entry.regionId === 'cloud_highland'
                  ? entry.regionId
                  : null,
              season:
                entry.season === 'spring' || entry.season === 'summer' || entry.season === 'autumn' || entry.season === 'winter'
                  ? entry.season
                  : null,
              weather:
                entry.weather === 'sunny' ||
                entry.weather === 'rainy' ||
                entry.weather === 'stormy' ||
                entry.weather === 'snowy' ||
                entry.weather === 'windy' ||
                entry.weather === 'green_rain'
                  ? entry.weather
                  : null,
              capturedDayTag: typeof entry.capturedDayTag === 'string' ? entry.capturedDayTag : ''
            }))
            .slice(0, MAX_PHOTO_MOMENTS)
        : [],
      regionNotables: {
        ancient_road: Array.isArray(data.regionNotables?.ancient_road)
          ? uniqueStrings(data.regionNotables.ancient_road.filter((entry): entry is string => typeof entry === 'string')).slice(0, 24)
          : [],
        mirage_marsh: Array.isArray(data.regionNotables?.mirage_marsh)
          ? uniqueStrings(data.regionNotables.mirage_marsh.filter((entry): entry is string => typeof entry === 'string')).slice(0, 24)
          : [],
        cloud_highland: Array.isArray(data.regionNotables?.cloud_highland)
          ? uniqueStrings(data.regionNotables.cloud_highland.filter((entry): entry is string => typeof entry === 'string')).slice(0, 24)
          : []
      }
    }
  }

  return {
    saveData,
    chronicleEntries,
    rumorReceipts,
    photoMoments,
    regionNotables,
    recordChronicleEntry,
    recordRumorReceipt,
    recordPhotoMoment,
    recordRegionNotable,
    getChronicleOverview,
    serialize,
    deserialize
  }
})
