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
  type OnlinePlayerSearchResponse,
  type OnlineSubscriptionEntry,
  rejectFriendRequest,
  rejectNeighborRequest,
  removeFriend,
  removeSubscription,
  saveOnlineProfile,
  sendFriendRequest,
  searchPlayerBySaveId,
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
  avatar_image_url: string
  avatar_image_alt: string
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
  player_chronicle: {
    milestones: Array<{
      id: string
      label: string
      summary: string
      unlocked: boolean
      recorded_at: number
      detail: string
      source_type: string
      source_id: string
    }>
    updated_at: number
  } | null
  award_showcase: {
    honors: Array<{
      id: string
      label: string
      summary: string
      category: string
      unlocked: boolean
      recorded_at: number
      detail: string
      source_type: string
      source_id: string
      active: boolean
    }>
    commemoratives: Array<{
      id: string
      label: string
      summary: string
      category: string
      unlocked: boolean
      recorded_at: number
      detail: string
      source_type: string
      source_id: string
      active: boolean
    }>
    titles: Array<{
      id: string
      label: string
      summary: string
      category: string
      unlocked: boolean
      recorded_at: number
      detail: string
      source_type: string
      source_id: string
      active: boolean
    }>
    achievement_cards: Array<{
      id: string
      label: string
      summary: string
      category: string
      unlocked: boolean
      recorded_at: number
      detail: string
      source_type: string
      source_id: string
      active: boolean
    }>
    summary: {
      honor_count: number
      commemorative_count: number
      title_count: number
      achievement_count: number
    }
  }
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
  const draftAvatarImageUrl = ref('')
  const draftAvatarImageAlt = ref('')
  const draftSelectedTagIds = ref<string[]>([])
  const friendSaveIdDraft = ref('')
  const playerSearchResult = ref<OnlinePlayerSearchResponse | null>(null)
  const playerSearchLoading = ref(false)
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
  const subscriptionNotices = ref<Array<{
    id: string
    title: string
    message: string
    createdAt: number
  }>>([])

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
      draftShowcaseTheme.value !== profile.value.showcase_theme ||
      draftAvatarImageUrl.value !== profile.value.avatar_image_url ||
      draftAvatarImageAlt.value !== profile.value.avatar_image_alt
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
      avatar_image_url: raw.avatar_image_url,
      avatar_image_alt: raw.avatar_image_alt,
      visibility: raw.visibility,
      active_quest_count: raw.active_quest_count,
      public_tags: raw.public_tags,
      selected_tag_ids: raw.selected_tag_ids,
      available_tag_options: raw.available_tag_options,
      player_chronicle: raw.player_chronicle ?? null,
      award_showcase: raw.award_showcase,
      updated_at: raw.updated_at,
      last_active_at: raw.last_active_at
    }
    draftIntro.value = raw.public_intro
    draftVisibility.value = raw.visibility
    draftManorName.value = raw.manor_name
    draftPublicTitle.value = raw.public_title
    draftNeighborhoodRole.value = raw.neighborhood_role
    draftShowcaseTheme.value = raw.showcase_theme
    draftAvatarImageUrl.value = raw.avatar_image_url
    draftAvatarImageAlt.value = raw.avatar_image_alt
    draftSelectedTagIds.value = [...raw.selected_tag_ids]
  }

  const refreshProfile = async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true
    if (!silent) {
      loading.value = true
      errorMessage.value = ''
    }
    try {
      const raw = await fetchOnlineProfile()
      hydrateFromProfile(raw ?? undefined)
      lastLoadedAt.value = Date.now()
      return profile.value
    } catch (error) {
      if (!silent) {
        profile.value = null
        errorMessage.value = error instanceof Error ? error.message : '获取公开档案失败'
      }
      throw error
    } finally {
      if (!silent) loading.value = false
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
        avatar_image_url: draftAvatarImageUrl.value,
        avatar_image_alt: draftAvatarImageAlt.value,
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

  const refreshRelationships = async (options: { silent?: boolean } = {}) => {
    relationshipLoading.value = true
    if (!options.silent) errorMessage.value = ''
    try {
      const data = await fetchRelationshipOverview()
      incomingRequests.value = data?.incoming_requests ?? []
      outgoingRequests.value = data?.outgoing_requests ?? []
      friends.value = data?.friends ?? []
      blockedUsers.value = data?.blocked_users ?? []
      return data
    } catch (error) {
      if (!options.silent) errorMessage.value = error instanceof Error ? error.message : '获取好友关系失败'
      throw error
    } finally {
      relationshipLoading.value = false
    }
  }

  const parseSaveIdDraft = (raw: string): number => {
    const normalized = String(raw || '').replace(/\D/g, '')
    const saveId = Number(normalized)
    return Number.isInteger(saveId) ? saveId : 0
  }

  const searchPlayerBySaveIdDraft = async () => {
    const saveId = parseSaveIdDraft(friendSaveIdDraft.value)
    if (!saveId) return null
    playerSearchLoading.value = true
    errorMessage.value = ''
    playerSearchResult.value = null
    try {
      const data = await searchPlayerBySaveId(saveId)
      playerSearchResult.value = data
      return data
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '搜索存档玩家失败'
      throw error
    } finally {
      playerSearchLoading.value = false
    }
  }

  const submitFriendRequestBySaveId = async (saveId: number) => {
    if (!Number.isInteger(saveId)) return
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await sendFriendRequest({ target_save_id: saveId })
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

  const removeFriendship = async (friendshipId: string) => {
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await removeFriend(friendshipId)
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '删除好友失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const blockTargetBySaveId = async (saveId: number) => {
    if (!Number.isInteger(saveId)) return
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await blockPlayer({ target_save_id: saveId })
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
      await unblockPlayer({ target_username: targetUsername })
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '解除拉黑失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const unblockTargetBySaveId = async (saveId: number) => {
    if (!Number.isInteger(saveId)) return
    relationshipActionRunning.value = true
    errorMessage.value = ''
    try {
      await unblockPlayer({ target_save_id: saveId })
      await refreshRelationships()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '解除拉黑失败'
      throw error
    } finally {
      relationshipActionRunning.value = false
    }
  }

  const refreshNeighborOverview = async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true
    if (!silent) {
      neighborLoading.value = true
      errorMessage.value = ''
    }
    try {
      const data = await fetchNeighborOverview()
      neighborGroup.value = data?.my_group ?? null
      neighborPublicGroups.value = data?.public_groups ?? []
      neighborIncomingInvites.value = data?.incoming_invites ?? []
      neighborManagedRequests.value = data?.managed_requests ?? []
      neighborNoticeDraft.value = data?.my_group?.notice ?? ''
      return data
    } catch (error) {
      if (!silent) errorMessage.value = error instanceof Error ? error.message : '获取邻里信息失败'
      throw error
    } finally {
      if (!silent) neighborLoading.value = false
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
      subscriptionNotices.value = [
        {
          id: `notice_${Date.now()}`,
          title: '订阅已保存',
          message: `你已经关注了「${label}」，后续这里会集中显示相关更新。`,
          createdAt: Date.now()
        },
        ...subscriptionNotices.value
      ].slice(0, 12)
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
      subscriptionNotices.value = [
        {
          id: `notice_${Date.now()}`,
          title: '订阅已取消',
          message: '你已经移除了一个关注项。',
          createdAt: Date.now()
        },
        ...subscriptionNotices.value
      ].slice(0, 12)
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
    draftAvatarImageUrl,
    draftAvatarImageAlt,
    draftSelectedTagIds,
    friendSaveIdDraft,
    playerSearchResult,
    playerSearchLoading,
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
    subscriptionNotices,
    refreshProfile,
    hydrateFromProfile,
    saveProfile,
    refreshRelationships,
    searchPlayerBySaveIdDraft,
    submitFriendRequestBySaveId,
    acceptRequest,
    rejectRequest,
    removeFriendship,
    blockTargetBySaveId,
    unblockTarget,
    unblockTargetBySaveId,
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
