import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  acceptFriendRequest,
  acceptNeighborRequest,
  applyToNeighborGroup,
  blockPlayer,
  createSubscription,
  createNeighborGroup,
  fetchOnlineProfile,
  fetchNeighborOverview,
  fetchRelationshipOverview,
  fetchSubscriptionOverview,
  inviteToNeighborGroup,
  type OnlineNeighborGroupSummary,
  type OnlineNeighborRequest,
  type OnlineSubscriptionEntry,
  rejectFriendRequest,
  rejectNeighborRequest,
  removeSubscription,
  saveOnlineProfile,
  sendFriendRequest,
  type OnlineProfileResponse,
  type OnlineRelationCard,
  type OnlineProfileVisibility
  ,
  updateNeighborMemberRole,
  updateNeighborNotice,
  unblockPlayer
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
  public_tags: Array<{
    id: string
    label: string
    source: 'auto' | 'selected'
  }>
  selected_tag_ids: string[]
  available_tag_options: Array<{
    id: string
    label: string
  }>
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
  const draftSelectedTagIds = ref<string[]>([])
  const friendUsernameDraft = ref('')
  const relationshipLoading = ref(false)
  const relationshipActionRunning = ref(false)
  const incomingRequests = ref<OnlineRelationCard[]>([])
  const outgoingRequests = ref<OnlineRelationCard[]>([])
  const friends = ref<OnlineRelationCard[]>([])
  const blockedUsers = ref<OnlineRelationCard[]>([])
  const neighborLoading = ref(false)
  const neighborActionRunning = ref(false)
  const neighborGroup = ref<OnlineNeighborGroupSummary | null>(null)
  const neighborPublicGroups = ref<OnlineNeighborGroupSummary[]>([])
  const neighborIncomingInvites = ref<OnlineNeighborRequest[]>([])
  const neighborManagedRequests = ref<OnlineNeighborRequest[]>([])
  const neighborNameDraft = ref('')
  const neighborSummaryDraft = ref('')
  const neighborNoticeDraft = ref('')
  const neighborCapacityDraft = ref(12)
  const neighborInviteUsernameDraft = ref('')
  const subscriptionsLoading = ref(false)
  const subscriptionsActionRunning = ref(false)
  const subscriptions = ref<OnlineSubscriptionEntry[]>([])

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
      public_tags: raw.public_tags,
      selected_tag_ids: raw.selected_tag_ids,
      available_tag_options: raw.available_tag_options,
      updated_at: raw.updated_at,
      last_active_at: raw.last_active_at
    }
    draftIntro.value = raw.public_intro
    draftVisibility.value = raw.visibility
    draftManorName.value = raw.manor_name
    draftPublicTitle.value = raw.public_title
    draftNeighborhoodRole.value = raw.neighborhood_role
    draftShowcaseTheme.value = raw.showcase_theme
    draftSelectedTagIds.value = [...raw.selected_tag_ids]
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
        showcase_theme: draftShowcaseTheme.value,
        selected_tag_ids: draftSelectedTagIds.value
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

  const refreshRelationships = async () => {
    relationshipLoading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchRelationshipOverview()
      incomingRequests.value = data?.incoming_requests ?? []
      outgoingRequests.value = data?.outgoing_requests ?? []
      friends.value = data?.friends ?? []
      blockedUsers.value = data?.blocked_users ?? []
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取好友关系失败'
      throw error
    } finally {
      relationshipLoading.value = false
    }
  }

  const submitFriendRequest = async () => {
    const target = friendUsernameDraft.value.trim()
    if (!target) return
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await sendFriendRequest(target)
      friendUsernameDraft.value = ''
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发送好友申请失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const acceptRequest = async (requestId: string) => {
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await acceptFriendRequest(requestId)
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '接受好友申请失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const rejectRequest = async (requestId: string) => {
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await rejectFriendRequest(requestId)
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '拒绝好友申请失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const blockTarget = async () => {
    const target = friendUsernameDraft.value.trim()
    if (!target) return
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await blockPlayer(target)
      friendUsernameDraft.value = ''
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '拉黑玩家失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const unblockTarget = async (targetUsername: string) => {
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await unblockPlayer(targetUsername)
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '解除拉黑失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const refreshNeighborOverview = async () => {
    neighborLoading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchNeighborOverview()
      neighborGroup.value = data?.my_group ?? null
      neighborPublicGroups.value = data?.public_groups ?? []
      neighborIncomingInvites.value = data?.incoming_invites ?? []
      neighborManagedRequests.value = data?.managed_requests ?? []
      neighborNoticeDraft.value = data?.my_group?.notice ?? ''
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取邻里信息失败'
      throw error
    } finally {
      neighborLoading.value = false
    }
  }

  const submitNeighborGroup = async () => {
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await createNeighborGroup({
        name: neighborNameDraft.value,
        summary: neighborSummaryDraft.value,
        notice: neighborNoticeDraft.value,
        capacity: neighborCapacityDraft.value
      })
      neighborNameDraft.value = ''
      neighborSummaryDraft.value = ''
      await refreshNeighborOverview()
      await refreshProfile()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '创建邻里失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const applyNeighbor = async (groupId: string) => {
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await applyToNeighborGroup(groupId)
      await refreshNeighborOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '申请加入邻里失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const inviteNeighbor = async () => {
    const target = neighborInviteUsernameDraft.value.trim()
    if (!target) return
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await inviteToNeighborGroup(target)
      neighborInviteUsernameDraft.value = ''
      await refreshNeighborOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发送邻里邀请失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const acceptNeighbor = async (requestId: string) => {
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await acceptNeighborRequest(requestId)
      await refreshNeighborOverview()
      await refreshProfile()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '处理邻里申请失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const rejectNeighbor = async (requestId: string) => {
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await rejectNeighborRequest(requestId)
      await refreshNeighborOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '拒绝邻里申请失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const saveNeighborNoticeDraft = async () => {
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await updateNeighborNotice(neighborNoticeDraft.value)
      await refreshNeighborOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新邻里公告失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const changeNeighborRole = async (targetUsername: string, role: 'manager' | 'member') => {
    neighborActionRunning.value = true
    errorMessage.value = ''
    try {
      await updateNeighborMemberRole(targetUsername, role)
      await refreshNeighborOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新成员身份失败'
      throw error
    } finally {
      neighborActionRunning.value = false
    }
  }

  const toggleSelectedTag = (tagId: string) => {
    const normalized = String(tagId || '').trim()
    if (!normalized) return
    if (draftSelectedTagIds.value.includes(normalized)) {
      draftSelectedTagIds.value = draftSelectedTagIds.value.filter(entry => entry !== normalized)
      return
    }
    if (draftSelectedTagIds.value.length >= 3) return
    draftSelectedTagIds.value = [...draftSelectedTagIds.value, normalized]
  }

  const refreshSubscriptions = async () => {
    subscriptionsLoading.value = true
    errorMessage.value = ''
    try {
      const data = await fetchSubscriptionOverview()
      subscriptions.value = data?.subscriptions ?? []
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '获取订阅列表失败'
      throw error
    } finally {
      subscriptionsLoading.value = false
    }
  }

  const followPreset = async (targetType: 'style' | 'expert' | 'neighbor_group' | 'festival', targetId: string, label: string) => {
    subscriptionsActionRunning.value = true
    errorMessage.value = ''
    try {
      await createSubscription({ target_type: targetType, target_id: targetId, label })
      await refreshSubscriptions()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '添加订阅失败'
      throw error
    } finally {
      subscriptionsActionRunning.value = false
    }
  }

  const unfollow = async (subscriptionId: string) => {
    subscriptionsActionRunning.value = true
    errorMessage.value = ''
    try {
      await removeSubscription(subscriptionId)
      await refreshSubscriptions()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '取消订阅失败'
      throw error
    } finally {
      subscriptionsActionRunning.value = false
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
    draftSelectedTagIds,
    friendUsernameDraft,
    hasProfile,
    displayTitle,
    hasDirtyDraft,
    relationshipLoading,
    relationshipActionRunning,
    incomingRequests,
    outgoingRequests,
    friends,
    blockedUsers,
    neighborLoading,
    neighborActionRunning,
    neighborGroup,
    neighborPublicGroups,
    neighborIncomingInvites,
    neighborManagedRequests,
    neighborNameDraft,
    neighborSummaryDraft,
    neighborNoticeDraft,
    neighborCapacityDraft,
    neighborInviteUsernameDraft,
    subscriptionsLoading,
    subscriptionsActionRunning,
    subscriptions,
    refreshProfile,
    hydrateFromProfile,
    saveProfile,
    refreshRelationships,
    submitFriendRequest,
    acceptRequest,
    rejectRequest,
    blockTarget,
    unblockTarget,
    refreshNeighborOverview,
    submitNeighborGroup,
    applyNeighbor,
    inviteNeighbor,
    acceptNeighbor,
    rejectNeighbor,
    saveNeighborNoticeDraft,
    changeNeighborRole,
    toggleSelectedTag,
    refreshSubscriptions,
    followPreset,
    unfollow
  }
})
