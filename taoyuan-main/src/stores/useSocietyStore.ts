import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createSociety,
  fetchSocietyOverview,
  type SocietyOverviewResponse,
  type SocietySnapshot,
  type SocietyVisibility,
} from '@/utils/societyApi'

export const useSocietyStore = defineStore('onlineSociety', () => {
  const overview = ref<SocietyOverviewResponse | null>(null)
  const loading = ref(false)
  const actionRunning = ref(false)
  const errorMessage = ref('')

  const draftName = ref('')
  const draftSummary = ref('')
  const draftEmblem = ref('')
  const draftTheme = ref('')
  const draftVisibility = ref<SocietyVisibility>('public')
  const draftCapacity = ref(24)
  const draftJoinRequirementId = ref('')
  const draftJoinRequirementNote = ref('')

  const mySociety = computed<SocietySnapshot | null>(() => overview.value?.my_society ?? null)
  const visibleSocieties = computed(() => overview.value?.visible_societies ?? [])
  const visibilityOptions = computed(() => overview.value?.visibility_options ?? [])
  const themeOptions = computed(() => overview.value?.theme_options ?? [])
  const emblemOptions = computed(() => overview.value?.emblem_options ?? [])
  const capacityOptions = computed(() => overview.value?.capacity_options ?? [])
  const joinRequirementOptions = computed(() => overview.value?.join_requirement_options ?? [])

  const ensureDraftDefaults = () => {
    if (!draftEmblem.value) draftEmblem.value = emblemOptions.value[0]?.id ?? 'plum_seal'
    if (!draftTheme.value) draftTheme.value = themeOptions.value[0]?.id ?? 'harvest_union'
    if (!draftJoinRequirementId.value) draftJoinRequirementId.value = joinRequirementOptions.value[0]?.id ?? 'open'
    if (!capacityOptions.value.some(entry => entry.value === draftCapacity.value)) {
      draftCapacity.value = capacityOptions.value[0]?.value ?? 24
    }
  }

  const hydrateOverview = (data: SocietyOverviewResponse | null) => {
    overview.value = data
    ensureDraftDefaults()
  }

  const refreshOverview = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchSocietyOverview()
      hydrateOverview(data)
      return overview.value
    } catch (error) {
      overview.value = null
      errorMessage.value = error instanceof Error ? error.message : '获取村社信息失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const submitSociety = async () => {
    actionRunning.value = true
    errorMessage.value = ''
    try {
      const result = await createSociety({
        name: draftName.value,
        summary: draftSummary.value,
        emblem: draftEmblem.value,
        theme: draftTheme.value,
        visibility: draftVisibility.value,
        capacity: draftCapacity.value,
        join_requirement_id: draftJoinRequirementId.value,
        join_requirement_note: draftJoinRequirementNote.value,
      })
      const nextOverview = result?.overview
        ? { ok: true, ...result.overview }
        : await fetchSocietyOverview()
      hydrateOverview(nextOverview)
      draftName.value = ''
      draftSummary.value = ''
      draftJoinRequirementNote.value = ''
      ensureDraftDefaults()
      return mySociety.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '创建村社失败'
      throw error
    } finally {
      actionRunning.value = false
    }
  }

  return {
    overview,
    loading,
    actionRunning,
    errorMessage,
    draftName,
    draftSummary,
    draftEmblem,
    draftTheme,
    draftVisibility,
    draftCapacity,
    draftJoinRequirementId,
    draftJoinRequirementNote,
    mySociety,
    visibleSocieties,
    visibilityOptions,
    themeOptions,
    emblemOptions,
    capacityOptions,
    joinRequirementOptions,
    refreshOverview,
    submitSociety,
  }
})
