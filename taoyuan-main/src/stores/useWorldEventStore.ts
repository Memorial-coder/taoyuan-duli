import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  contributeWorldEvent,
  fetchWorldEventOverview,
  type WorldEventOverview,
  type WorldEventSnapshot,
} from '@/utils/worldEventApi'

export const useWorldEventStore = defineStore('worldEvent', () => {
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')
  const overview = ref<WorldEventOverview | null>(null)
  const lastLoadedAt = ref(0)

  const currentEvent = computed<WorldEventSnapshot | null>(() => overview.value?.current_event ?? null)
  const events = computed(() => overview.value?.events ?? [])
  const worldEvents = computed(() => overview.value?.world_events ?? [])
  const currentWorldEvents = computed(() => overview.value?.current_world_events ?? [])
  const recentAnnals = computed(() => overview.value?.recent_annals ?? [])
  const myRecords = computed(() => overview.value?.my_records ?? [])
  const seasonalBadges = computed(() => overview.value?.seasonal_badges ?? [])

  const refreshOverview = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const nextOverview = await fetchWorldEventOverview()
      overview.value = nextOverview
      lastLoadedAt.value = Date.now()
      return nextOverview
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取四季大事件失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const runAction = async <T>(runner: () => Promise<T>) => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      return await runner()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '四季大事件操作失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  const contribute = async (eventId: string, actionId: string) =>
    runAction(async () => {
      const result = await contributeWorldEvent(eventId, actionId)
      overview.value = result.overview
      lastLoadedAt.value = Date.now()
      return result.event
    })

  return {
    loading,
    actionRunning,
    errorMessage,
    overview,
    currentEvent,
    events,
    worldEvents,
    currentWorldEvents,
    recentAnnals,
    myRecords,
    seasonalBadges,
    lastLoadedAt,
    refreshOverview,
    contribute,
  }
})
