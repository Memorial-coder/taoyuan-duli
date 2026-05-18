import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchOnlineProfile,
  saveOnlineProfile,
  type OnlineProfileResponse,
  type OnlineProfileVisibility
} from '@/utils/onlineProfileApi'

export interface PublicProfile {
  username: string
  display_name: string
  player_name: string
  honorific: string
  manor_name: string
  season_progress: string
  primary_route_label: string
  recent_activity: string
  public_title: string
  neighborhood_role: string
  showcase_theme: string
  public_intro: string
  visibility: OnlineProfileVisibility
  active_quest_count: number
  updated_at: number
  last_active_at: number
}

export const useSocialStore = defineStore('onlineSocial', () => {
  const loading = ref(false)
  const saving = ref(false)
  const lastLoadedAt = ref(0)
  const profile = ref<PublicProfile | null>(null)
  const errorMessage = ref('')
  const draftIntro = ref('')
  const draftVisibility = ref<OnlineProfileVisibility>('public')
  const draftManorName = ref('')
  const draftPublicTitle = ref('')
  const draftNeighborhoodRole = ref('')
  const draftShowcaseTheme = ref('')

  const hasProfile = computed(() => !!profile.value)
  const displayTitle = computed(() => profile.value?.public_title || profile.value?.display_name || profile.value?.player_name || '未命名玩家')
  const hasDirtyDraft = computed(() => {
    if (!profile.value) return false
    return (
      draftIntro.value !== profile.value.public_intro ||
      draftVisibility.value !== profile.value.visibility ||
      draftManorName.value !== profile.value.manor_name ||
      draftPublicTitle.value !== profile.value.public_title ||
      draftNeighborhoodRole.value !== profile.value.neighborhood_role ||
      draftShowcaseTheme.value !== profile.value.showcase_theme
    )
  })

  const hydrateFromProfile = (raw: OnlineProfileResponse['profile']) => {
    if (!raw) {
      profile.value = null
      return
    }
    profile.value = {
      username: raw.username,
      display_name: raw.display_name,
      player_name: raw.player_name,
      honorific: raw.honorific,
      manor_name: raw.manor_name,
      season_progress: raw.season_progress,
      primary_route_label: raw.primary_route_label,
      recent_activity: raw.recent_activity,
      public_title: raw.public_title,
      neighborhood_role: raw.neighborhood_role,
      showcase_theme: raw.showcase_theme,
      public_intro: raw.public_intro,
      visibility: raw.visibility,
      active_quest_count: raw.active_quest_count,
      updated_at: raw.updated_at,
      last_active_at: raw.last_active_at
    }
    draftIntro.value = raw.public_intro
    draftVisibility.value = raw.visibility
    draftManorName.value = raw.manor_name
    draftPublicTitle.value = raw.public_title
    draftNeighborhoodRole.value = raw.neighborhood_role
    draftShowcaseTheme.value = raw.showcase_theme
  }

  const refreshProfile = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const raw = await fetchOnlineProfile()
      hydrateFromProfile(raw ?? undefined)
      lastLoadedAt.value = Date.now()
      return profile.value
    } catch (error) {
      profile.value = null
      errorMessage.value = error instanceof Error ? error.message : '获取公开档案失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  const saveProfile = async () => {
    if (!profile.value) return null
    saving.value = true
    errorMessage.value = ''
    try {
      const raw = await saveOnlineProfile({
        visibility: draftVisibility.value,
        public_intro: draftIntro.value,
        manor_name: draftManorName.value,
        public_title: draftPublicTitle.value,
        neighborhood_role: draftNeighborhoodRole.value,
        showcase_theme: draftShowcaseTheme.value
      })
      hydrateFromProfile(raw ?? undefined)
      lastLoadedAt.value = Date.now()
      return profile.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存公开档案失败'
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    loading,
    saving,
    lastLoadedAt,
    profile,
    errorMessage,
    draftIntro,
    draftVisibility,
    draftManorName,
    draftPublicTitle,
    draftNeighborhoodRole,
    draftShowcaseTheme,
    hasProfile,
    displayTitle,
    hasDirtyDraft,
    refreshProfile,
    hydrateFromProfile,
    saveProfile
  }
})
