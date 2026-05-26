import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'
import type { OnlineVisualState } from '@/types/onlineVisual'

export type OnlineProfileVisibility = 'public' | 'friends_only' | 'private'
export type OnlineManorAccessMode = 'public' | 'friends' | 'mutual' | 'closed'

export interface OnlineProfileResponse {
  ok: boolean
  profile?: {
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
  msg?: string
}

export interface OnlineRelationCard {
  request_id?: string
  friendship_id?: string
  block_id?: string
  created_at: number
  last_interaction_at?: number
  friends_since?: number
  from_save_id?: number
  to_save_id?: number
  from_save_slot?: number | null
  to_save_slot?: number | null
  own_save_id?: number
  own_save_slot?: number | null
  friend_save_id?: number
  friend_save_slot?: number | null
  blocker_save_id?: number
  blocker_save_slot?: number | null
  blocked_save_id?: number
  blocked_save_slot?: number | null
  profile: NonNullable<OnlineProfileResponse['profile']>
}

export interface OnlineSaveIdentity {
  save_id: number
  account_username: string
  save_slot: number | null
  nickname_snapshot?: string
  created_at?: number
  updated_at?: number
}

export interface OnlinePlayerSearchResponse {
  ok: boolean
  save_identity?: OnlineSaveIdentity
  profile?: NonNullable<OnlineProfileResponse['profile']>
  msg?: string
}

export interface OnlineRelationshipOverviewResponse {
  ok: boolean
  incoming_requests: OnlineRelationCard[]
  outgoing_requests: OnlineRelationCard[]
  friends: OnlineRelationCard[]
  blocked_users: OnlineRelationCard[]
  neighbor_group?: OnlineNeighborGroupSummary | null
  msg?: string
}

export interface OnlineNeighborActivityLog {
  id: string
  type: string
  message: string
  created_at: number
}

export interface OnlineNeighborMember {
  username: string
  role: 'leader' | 'manager' | 'member'
  joined_at: number
}

export interface OnlineNeighborGroupSummary {
  id: string
  name: string
  summary: string
  notice: string
  level: number
  capacity: number
  member_count: number
  role?: 'leader' | 'manager' | 'member'
  leader_username?: string
  members?: OnlineNeighborMember[]
  activity_log: OnlineNeighborActivityLog[]
  can_apply?: boolean
}

export interface OnlineNeighborRequest {
  id: string
  group_id: string
  username: string
  invited_by?: string
  type: 'apply' | 'invite'
  status: 'pending' | 'accepted' | 'rejected'
  created_at: number
  updated_at: number
  group_name?: string
}

export interface OnlineNeighborOverviewResponse {
  ok: boolean
  managed_requests: OnlineNeighborRequest[]
  my_group: OnlineNeighborGroupSummary | null
  incoming_invites: OnlineNeighborRequest[]
  public_groups: OnlineNeighborGroupSummary[]
  msg?: string
}

export interface OnlineSubscriptionEntry {
  id: string
  subscriber_username: string
  target_type: 'style' | 'expert' | 'neighbor_group' | 'festival'
  target_id: string
  label: string
  created_at: number
}

export interface OnlineSubscriptionOverviewResponse {
  ok: boolean
  subscriptions: OnlineSubscriptionEntry[]
  msg?: string
}

export interface OnlineManorInteractionVisitorCount {
  visitor_username: string
  visitor_display_name: string
  count: number
  limit: number
  remaining: number
}

export interface OnlineManorInteractionAudit {
  visitor_limit_enforced: boolean
  manor_limit_enforced: boolean
  object_limit_enforced: boolean
  whitelist_enforced?: boolean
  reward_cap_summary: string
  settlement_summary: string
  owner_reserved_percent?: number
  visitor_reward_quantity_cap?: number
  recent_window_seconds: number
  recent_window_count: number
  daily_visitor_counts: OnlineManorInteractionVisitorCount[]
  risk_flags: string[]
  dispute_log_available: boolean
}

export interface OnlineManorVisitorActivityEntry {
  id: string
  source_id: string
  kind: 'visit' | 'care' | 'steal' | 'care_room'
  kind_label: string
  visitor_username: string
  visitor_display_name: string
  title: string
  summary: string
  object_label: string
  action_label: string
  audit_note: string
  created_at: number
}

export interface OnlineManorCareRoomParticipant {
  username: string
  display_name: string
  role_id: string
  role_label: string
  joined_at: number
}

export interface OnlineManorCareRoomAction {
  id: string
  action_id: string
  action_label: string
  role_id: string
  role_label: string
  object_id: string
  object_label: string
  actor_username: string
  actor_display_name: string
  expected_order: number
  actual_order: number
  order_risk: boolean
  role_matched: boolean
  risk_delta: number
  health_delta: number
  idempotency_key: string
  summary: string
  created_at: number
}

export interface OnlineManorCareRoom {
  id: string
  target_username: string
  target_save_id: number
  target_save_slot: number | null
  creator_username: string
  creator_display_name: string
  member_limit: number
  day_tag: string
  idempotency_key: string
  status: 'open' | 'in_progress' | 'completed' | 'expired'
  window_started_at: number
  window_ends_at: number
  participants: OnlineManorCareRoomParticipant[]
  actions: OnlineManorCareRoomAction[]
  risk_score: number
  health_score: number
  health_delta: number
  settlement_receipt_id: string
  settled_by: string
  settled_at: number
  summary: string
  created_at: number
  updated_at: number
  viewer_is_member: boolean
  remaining_seconds: number
  available_action_ids: string[]
  can_join: boolean
  can_act: boolean
  can_settle: boolean
}

export interface OnlineManorSnapshot {
  username: string
  display_name: string
  visibility: OnlineProfileVisibility
  viewer_is_owner: boolean
  manor_name: string
  avatar_image_url: string
  avatar_image_alt: string
  cover_image_url: string
  cover_image_alt: string
  public_title: string
  showcase_theme: string
  season_progress: string
  current_focus: string
  weekly_goal: string
  visual_summary: string
  placed_decoration_count: number
  public_tags: Array<{
    id: string
    label: string
    source: 'auto' | 'selected'
  }>
  guestbook_entries: Array<{
    id: string
    target_username: string
    target_save_id: number
    target_save_slot: number | null
    author_username: string
    author_display_name: string
    kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature'
    content: string
    reply_text: string
    reply_author_display_name: string
    pinned: boolean
    created_at: number
    updated_at: number
  }>
  visit_entries: Array<{
    id: string
    target_username: string
    target_save_id: number
    target_save_slot: number | null
    visitor_username: string
    visitor_display_name: string
    purpose: 'explore' | 'friend_visit' | 'gift' | 'quest' | 'other'
    summary: string
    feedback: string
    carried_items: Array<{
      itemId: string
      quantity: number
    }>
    created_at: number
    updated_at: number
  }>
  visitor_activity_entries: OnlineManorVisitorActivityEntry[]
  guide_points: Array<{
    id: string
    title: string
    summary: string
    order: number
  }>
  guide_routes: Array<{
    id: string
    title: string
    summary: string
    point_ids: string[]
  }>
  today_visit_summary: string
  is_favorited_by_viewer: boolean
  is_followed_by_viewer: boolean
  access_policy: {
    visit_mode: OnlineManorAccessMode
    care_mode: OnlineManorAccessMode
    steal_mode: OnlineManorAccessMode
    updated_at: number
    options: Array<{
      id: OnlineManorAccessMode
      label: string
    }>
  }
  relation_context: {
    viewer_is_owner: boolean
    viewer_is_friend: boolean
    viewer_is_mutual: boolean
    viewer_follows_owner: boolean
    owner_follows_viewer: boolean
    mutual_follow: boolean
    can_visit: boolean
    can_care: boolean
    can_steal: boolean
  }
  visual_state: OnlineVisualState
  care_state: {
    day_tag: string
    action_labels: Record<string, string>
    scene_action_labels: Record<string, string>
    action_effects: Record<string, {
      owner_benefit: string
      visitor_reward: string
    }>
    limits: {
      visitor_daily_limit: number
      manor_daily_limit: number
    }
    visitor_daily_count: number
    manor_daily_count: number
    remaining_care_count: number
    manor_remaining_care_count: number
    can_care: boolean
    audit: OnlineManorInteractionAudit
    care_denied_reason: string
  }
  steal_state: {
    day_tag: string
    action_labels: Record<string, string>
    action_effects: Record<string, {
      owner_compensation: string
      visitor_reward: string
    }>
    limits: {
      visitor_daily_limit: number
      manor_daily_limit: number
      object_daily_limit: number
    }
    visitor_daily_count: number
    manor_daily_count: number
    remaining_steal_count: number
    manor_remaining_steal_count: number
    can_steal: boolean
    steal_denied_reason: string
    audit: OnlineManorInteractionAudit
    whitelist_summary: string
    target_use_hints: Record<string, {
      item_id: string
      label: string
      use_tags: string[]
      use_summary: string
    }>
  }
  care_entries: Array<{
    id: string
    target_username: string
    target_save_id: number
    target_save_slot: number | null
    visitor_username: string
    visitor_display_name: string
    action_id: string
    action_label: string
    object_id: string
    object_label: string
    day_tag: string
    idempotency_key: string
    owner_benefit: string
    visitor_reward: string
    reward_item_id?: string
    reward_quantity?: number
    reward_quality?: string
    reward_save_revision?: number
    summary: string
    created_at: number
  }>
  steal_entries: Array<{
    id: string
    target_username: string
    target_save_id: number
    target_save_slot: number | null
    visitor_username: string
    visitor_display_name: string
    action_id: string
    action_label: string
    object_id: string
    object_label: string
    target_id: string
    target_label: string
    item_id: string
    item_label: string
    quantity: number
    use_tags: string[]
    use_summary: string
    day_tag: string
    idempotency_key: string
    owner_compensation: string
    visitor_reward: string
    visitor_reward_quantity?: number
    reward_daily_cap?: number
    owner_reserved_ratio?: number
    settlement_receipt_id?: string
    note: string
    summary: string
    created_at: number
  }>
  care_room_state: {
    viewer_username: string
    day_tag: string
    limits: {
      min_members: number
      max_members: number
      window_seconds: number
    }
    action_labels: Record<string, string>
    role_labels: Record<string, string>
    action_effects: Record<string, {
      role_id: string
      role_label: string
      object_id: string
      object_label: string
      expected_order: number
      health_delta: number
      risk_delta: number
      summary: string
    }>
    can_create_room: boolean
    create_denied_reason: string
    active_rooms: OnlineManorCareRoom[]
    recent_records: OnlineManorCareRoom[]
    record_summary: string
  }
  care_room_records: OnlineManorCareRoom[]
  theme_week: {
    season: string
    week_tag: string
    active_theme: string
    active_theme_source: 'owner' | 'showcase' | 'seasonal_default'
    score: number
    recommendations: string[]
    official_pick: { label: string; reason: string } | null
    seasonal_options: string[]
    template_id: 'showcase' | 'operational' | 'festival' | 'collection' | 'story'
    cover_image_url: string
    cover_image_alt: string
    template_options: Array<{
      id: 'showcase' | 'operational' | 'festival' | 'collection' | 'story'
      label: string
      summary: string
    }>
  }
}

export type OnlineManorTarget = string | {
  target_username?: string
  target_save_id?: number | string
}

export const fetchOnlineProfile = async (): Promise<OnlineProfileResponse['profile'] | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineProfileResponse>(() => fetch('/api/taoyuan/online/profile', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取公开档案失败',
    networkErrorMessage: '公开档案连接失败，请检查网络或稍后重试'
  })
  return data?.profile ?? null
}

export const saveOnlineProfile = async (payload: {
  visibility: OnlineProfileVisibility
  public_intro: string
  manor_name: string
  public_title: string
  neighborhood_role: string
  showcase_theme: string
  avatar_image_url?: string
  avatar_image_alt?: string
  selected_tag_ids: string[]
}): Promise<OnlineProfileResponse['profile'] | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineProfileResponse>(async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return fetch('/api/taoyuan/online/profile', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(payload)
    })
  }, {
    fallbackMessage: '保存公开档案失败',
    networkErrorMessage: '公开档案连接失败，请检查网络或稍后重试'
  })
  return data?.profile ?? null
}

const requestSocialAction = async <T = any>(path: string, init: RequestInit): Promise<T | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<T>(async () => {
    const csrfToken = await ensureCurrentCsrfToken()
    return fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init.headers || {}),
        'X-CSRF-Token': csrfToken,
      },
    })
  }, {
    fallbackMessage: '桃源社交请求失败',
    networkErrorMessage: '桃源社交服务连接失败，请检查网络或稍后重试'
  })
  return data
}

type SocialTargetPayload = {
  target_username?: string
  target_save_id?: number
}

const buildSocialTargetBody = (target: SocialTargetPayload) => {
  return target
}

export const fetchRelationshipOverview = async (): Promise<OnlineRelationshipOverviewResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineRelationshipOverviewResponse>(() => fetch('/api/taoyuan/online/social/relationships', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取好友关系失败',
    networkErrorMessage: '好友关系服务连接失败，请检查网络或稍后重试'
  })
  return data ?? null
}

export const searchPlayerBySaveId = async (saveId: number): Promise<OnlinePlayerSearchResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlinePlayerSearchResponse>(() => fetch(`/api/taoyuan/online/social/player-search?save_id=${encodeURIComponent(String(saveId))}`, {
    credentials: 'include'
  }), {
    fallbackMessage: '搜索存档玩家失败',
    networkErrorMessage: '桃源社交搜索连接失败，请检查网络或稍后重试'
  })
  return data ?? null
}

export const sendFriendRequest = async (target: SocialTargetPayload) => {
  return requestSocialAction('/api/taoyuan/online/social/friend-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSocialTargetBody(target))
  })
}

export const acceptFriendRequest = async (requestId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/friend-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST'
  })
}

export const rejectFriendRequest = async (requestId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/friend-requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST'
  })
}

export const removeFriend = async (friendshipId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/friends/${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE'
  })
}

export const blockPlayer = async (target: SocialTargetPayload) => {
  return requestSocialAction('/api/taoyuan/online/social/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSocialTargetBody(target))
  })
}

export const unblockPlayer = async (target: SocialTargetPayload) => {
  return requestSocialAction('/api/taoyuan/online/social/blocks/unblock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSocialTargetBody(target))
  })
}

export const fetchNeighborOverview = async (): Promise<OnlineNeighborOverviewResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineNeighborOverviewResponse>(() => fetch('/api/taoyuan/online/social/neighbors/overview', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取邻里信息失败',
    networkErrorMessage: '邻里服务连接失败，请检查网络或稍后重试'
  })
  return data ?? null
}

export const createNeighborGroup = async (payload: {
  name: string
  summary: string
  notice: string
  capacity: number
}) => {
  return requestSocialAction('/api/taoyuan/online/social/neighbors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const applyToNeighborGroup = async (groupId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/neighbors/${encodeURIComponent(groupId)}/apply`, {
    method: 'POST'
  })
}

export const inviteToNeighborGroup = async (targetUsername: string) => {
  return requestSocialAction('/api/taoyuan/online/social/neighbors/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername })
  })
}

export const acceptNeighborRequest = async (requestId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/neighbors/requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST'
  })
}

export const rejectNeighborRequest = async (requestId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/neighbors/requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST'
  })
}

export const updateNeighborNotice = async (notice: string) => {
  return requestSocialAction('/api/taoyuan/online/social/neighbors/notice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notice })
  })
}

export const updateNeighborMemberRole = async (targetUsername: string, role: 'manager' | 'member') => {
  return requestSocialAction('/api/taoyuan/online/social/neighbors/members/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername, role })
  })
}

export const fetchSubscriptionOverview = async (): Promise<OnlineSubscriptionOverviewResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineSubscriptionOverviewResponse>(() => fetch('/api/taoyuan/online/social/subscriptions', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取订阅列表失败',
    networkErrorMessage: '订阅服务连接失败，请检查网络或稍后重试'
  })
  return data ?? null
}

export const createSubscription = async (payload: {
  target_type: 'style' | 'expert' | 'neighbor_group' | 'festival'
  target_id: string
  label: string
}) => {
  return requestSocialAction('/api/taoyuan/online/social/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const removeSubscription = async (subscriptionId: string) => {
  return requestSocialAction(`/api/taoyuan/online/social/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE'
  })
}

export const fetchOwnManorSnapshot = async (): Promise<OnlineManorSnapshot | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<{ ok: boolean; snapshot?: OnlineManorSnapshot }>(() => fetch('/api/taoyuan/online/manor', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取庄园快照失败',
    networkErrorMessage: '庄园服务连接失败，请检查网络或稍后重试'
  })
  return data?.snapshot ?? null
}

const normalizeManorTarget = (target: OnlineManorTarget) => {
  if (typeof target === 'string') {
    return {
      targetUsername: target.trim(),
      targetSaveId: ''
    }
  }
  return {
    targetUsername: String(target?.target_username || '').trim(),
    targetSaveId: target?.target_save_id === undefined || target?.target_save_id === null
      ? ''
      : String(target.target_save_id).trim()
  }
}

export const fetchManorSnapshot = async (target: OnlineManorTarget = ''): Promise<OnlineManorSnapshot | null> => {
  const { targetUsername, targetSaveId } = normalizeManorTarget(target)
  if (targetSaveId) {
    const { data } = await fetchProtectedJson<{ ok: boolean; snapshot?: OnlineManorSnapshot }>(() => fetch(`/api/taoyuan/online/manor?target_save_id=${encodeURIComponent(targetSaveId)}`, {
      credentials: 'include'
    }), {
      fallbackMessage: '获取玩家庄园失败',
      networkErrorMessage: '庄园服务连接失败，请检查网络或稍后重试'
    })
    return data?.snapshot ?? null
  }
  if (!targetUsername) return fetchOwnManorSnapshot()
  const { data } = await fetchProtectedJson<{ ok: boolean; snapshot?: OnlineManorSnapshot }>(() => fetch(`/api/taoyuan/online/manor/${encodeURIComponent(targetUsername)}`, {
    credentials: 'include'
  }), {
    fallbackMessage: '获取玩家庄园失败',
    networkErrorMessage: '庄园服务连接失败，请检查网络或稍后重试'
  })
  return data?.snapshot ?? null
}

export const createManorGuestbookEntry = async (payload: {
  target_username: string
  target_save_id?: number
  kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature'
  content: string
}) => {
  return requestSocialAction('/api/taoyuan/online/manor/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const replyManorGuestbookEntry = async (entryId: string, replyText: string) => {
  return requestSocialAction(`/api/taoyuan/online/manor/guestbook/${encodeURIComponent(entryId)}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply_text: replyText })
  })
}

export const pinManorGuestbookEntry = async (entryId: string, pinned: boolean) => {
  return requestSocialAction(`/api/taoyuan/online/manor/guestbook/${encodeURIComponent(entryId)}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned })
  })
}

export const recordManorVisit = async (payload: {
  target_username: string
  target_save_id?: number
  purpose: 'explore' | 'friend_visit' | 'gift' | 'quest' | 'other'
  summary: string
  feedback: string
  carried_items?: Array<{
    itemId: string
    quantity: number
  }>
}) => {
  return requestSocialAction('/api/taoyuan/online/manor/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const saveManorGuide = async (payload: {
  guide_points: Array<{
    id?: string
    title: string
    summary: string
    order: number
  }>
  guide_routes: Array<{
    id?: string
    title: string
    summary: string
    point_ids: string[]
  }>
}) => {
  return requestSocialAction<{ ok: boolean; snapshot?: OnlineManorSnapshot }>('/api/taoyuan/online/manor/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const saveManorThemeWeek = async (payload: {
  label: string
  season: string
  week_tag: string
  template_id: 'showcase' | 'operational' | 'festival' | 'collection' | 'story'
  cover_image_url?: string
  cover_image_alt?: string
}) => {
  return requestSocialAction<{ ok: boolean; snapshot?: OnlineManorSnapshot }>('/api/taoyuan/online/manor/theme-week', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const saveManorAccessPolicy = async (payload: {
  visit_mode: OnlineManorAccessMode
  care_mode: OnlineManorAccessMode
  steal_mode: OnlineManorAccessMode
}) => {
  return requestSocialAction<{ ok: boolean; policy?: OnlineManorSnapshot['access_policy']; snapshot?: OnlineManorSnapshot }>('/api/taoyuan/online/manor/access-policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const submitManorCare = async (payload: {
  target_username: string
  target_save_id?: number
  object_id: string
  action_id: string
  idempotency_key?: string
}) => {
  return requestSocialAction<{ ok: boolean; entry?: OnlineManorSnapshot['care_entries'][number]; snapshot?: OnlineManorSnapshot; idempotent?: boolean }>('/api/taoyuan/online/manor/care', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const submitManorSteal = async (payload: {
  target_username: string
  target_save_id?: number
  object_id: string
  action_id: string
  target_id?: string
  note?: string
  idempotency_key?: string
}) => {
  return requestSocialAction<{ ok: boolean; entry?: OnlineManorSnapshot['steal_entries'][number]; snapshot?: OnlineManorSnapshot; idempotent?: boolean }>('/api/taoyuan/online/manor/steal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const createManorCareRoom = async (payload: {
  target_username: string
  target_save_id?: number
  member_limit?: number
  idempotency_key?: string
}) => {
  return requestSocialAction<{ ok: boolean; room?: OnlineManorCareRoom; snapshot?: OnlineManorSnapshot; idempotent?: boolean }>('/api/taoyuan/online/manor/care-rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const joinManorCareRoom = async (roomId: string) => {
  return requestSocialAction<{ ok: boolean; room?: OnlineManorCareRoom; snapshot?: OnlineManorSnapshot; idempotent?: boolean }>(`/api/taoyuan/online/manor/care-rooms/${encodeURIComponent(roomId)}/join`, {
    method: 'POST'
  })
}

export const submitManorCareRoomAction = async (roomId: string, payload: {
  action_id: string
  idempotency_key?: string
}) => {
  return requestSocialAction<{ ok: boolean; action?: OnlineManorCareRoomAction; room?: OnlineManorCareRoom; snapshot?: OnlineManorSnapshot; idempotent?: boolean }>(`/api/taoyuan/online/manor/care-rooms/${encodeURIComponent(roomId)}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const settleManorCareRoom = async (roomId: string, payload: {
  idempotency_key?: string
} = {}) => {
  return requestSocialAction<{ ok: boolean; room?: OnlineManorCareRoom; snapshot?: OnlineManorSnapshot; idempotent?: boolean }>(`/api/taoyuan/online/manor/care-rooms/${encodeURIComponent(roomId)}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const favoriteManor = async (username: string, theme: string) => {
  return requestSocialAction(`/api/taoyuan/online/manor/${encodeURIComponent(username)}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme })
  })
}

export const followManor = async (username: string) => {
  return requestSocialAction(`/api/taoyuan/online/manor/${encodeURIComponent(username)}/follow`, {
    method: 'POST'
  })
}

export type OnlineCoopOrderType =
  | 'material_help'
  | 'festival_supply'
  | 'museum_support'
  | 'fishpond_borrow'
  | 'breeding_cert'
  | 'village_build'
  | 'expedition_supply'
  | 'npc_request'
  | 'emergency_response'

export type OnlineCoopOrderScope = 'public' | 'neighbors' | 'friends'
export type OnlineCoopRewardType = 'money' | 'reputation' | 'gift'
export type OnlineCoopRewardRoute = 'personal' | 'shared_fund'

export interface OnlineCoopRewardSettlementPayload {
  reward_route?: OnlineCoopRewardRoute
  cohabitation_contract_id?: string
}

export interface OnlineCoopOrderStageEntry {
  id: string
  title: string
  description: string
  preferred_order_type: OnlineCoopOrderType
  target_item_id: string
  target_quantity: number
  reward_value: number
  reward_label: string
  assignee_username: string
  assignee_display_name: string
  accepted_at: number
  canceled_at: number
  active_receipt_id: string
  delivery_status: 'none' | 'submitted' | 'confirmed' | 'compensation_pending'
  delivery_note: string
  delivered_items: Array<{
    item_id: string
    quantity: number
  }>
  compensation_id: string
  confirmed_at: number
  sequence: number
  updated_at: number
}

export interface OnlineCoopRelaySettlementShare {
  stage_id: string
  stage_title: string
  sequence: number
  assignee_username: string
  assignee_display_name: string
  reward_value: number
  reward_label: string
  share_percent: number
  delivery_status: 'none' | 'submitted' | 'confirmed' | 'compensation_pending'
  settlement_status: 'pending' | 'pending_owner_confirm' | 'confirmed' | 'compensation_pending'
  settlement_receipt_id: string
  reward_route: OnlineCoopRewardRoute
  cohabitation_contract_id: string
  shared_fund_ledger_id: string
  confirmed_at: number
}

export interface OnlineCoopRelaySettlementSummary {
  split_mode: 'stage_pool_weighted'
  status: 'planned' | 'settling' | 'settled' | 'compensation_pending'
  reward_type: OnlineCoopRewardType
  pool_reward_value: number
  allocated_reward_value: number
  confirmed_reward_value: number
  pending_reward_value: number
  compensation_pending_reward_value: number
  reward_label: string
  shares: OnlineCoopRelaySettlementShare[]
}

export interface OnlineCoopSocietyOrderBoardReceipt {
  receipt_id: string
  order_id: string
  order_title: string
  stage_id: string
  stage_title: string
  assignee_display_name: string
  reward_type: OnlineCoopRewardType
  reward_value: number
  reward_label: string
  reward_route: OnlineCoopRewardRoute
  status: 'pending_owner_confirm' | 'confirmed' | 'compensation_pending'
  confirmed_at: number
  updated_at: number
}

export interface OnlineCoopSocietyOrderBoard {
  public_orders: number
  open_public_orders: number
  public_relay_orders: number
  open_public_relay_orders: number
  reward_pool_value: number
  confirmed_reward_value: number
  pending_reward_value: number
  compensation_pending_reward_value: number
  compensation_count: number
  settlement_status_counts: {
    planned: number
    settling: number
    settled: number
    compensation_pending: number
  }
  recent_receipts: OnlineCoopSocietyOrderBoardReceipt[]
}

export interface OnlineCoopOrderEntry {
  id: string
  owner_username: string
  owner_display_name: string
  title: string
  description: string
  order_type: OnlineCoopOrderType
  collaboration_mode?: 'single' | 'multi_stage'
  scope: OnlineCoopOrderScope
  target_save_id?: number
  target_save_slot?: number | null
  target_username?: string
  target_display_name?: string
  deadline_at: number
  reward_type: OnlineCoopRewardType
  reward_value: number
  reward_label: string
  status: 'open' | 'closed' | 'expired'
  assignee_username: string
  assignee_display_name: string
  accepted_at: number
  canceled_at: number
  active_receipt_id: string
  delivery_status: 'none' | 'submitted' | 'confirmed' | 'compensation_pending'
  delivery_note: string
  delivered_items: Array<{
    item_id: string
    quantity: number
  }>
  settlement_confirmed_at: number
  compensation_id: string
  priority_score?: number
  priority_reasons?: string[]
  stages?: OnlineCoopOrderStageEntry[]
  relay_settlement_summary?: OnlineCoopRelaySettlementSummary | null
  visual_state?: import('@/types/onlineVisual').OnlineVisualState
  created_at: number
  updated_at: number
}

export interface OnlineCoopReceiptEntry {
  id: string
  order_id: string
  stage_id: string
  stage_title: string
  owner_username: string
  owner_display_name?: string
  assignee_username: string
  assignee_display_name?: string
  reward_type: OnlineCoopRewardType
  reward_value: number
  reward_label: string
  delivered_items: Array<{
    item_id: string
    quantity: number
  }>
  result_note: string
  idempotency_key: string
  status: 'pending_owner_confirm' | 'confirmed' | 'compensation_pending'
  reward_result: string
  reward_route: OnlineCoopRewardRoute
  cohabitation_contract_id: string
  shared_fund_ledger_id: string
  compensation_id: string
  help_reputation_delta: number
  specialty_reputation_delta: number
  trust_level_label: string
  created_at: number
  confirmed_at: number
  updated_at: number
}

export interface OnlineCoopCompensationEntry {
  id: string
  receipt_id: string
  order_id: string
  stage_id: string
  owner_username: string
  assignee_username: string
  reward_type: OnlineCoopRewardType
  reward_value: number
  reward_label: string
  reason: string
  last_error: string
  status: 'pending' | 'resolved'
  attempt_count: number
  created_at: number
  updated_at: number
  resolved_at: number
}

export interface OnlineCoopOrderOverviewResponse {
  ok: boolean
  orders: OnlineCoopOrderEntry[]
  receipts: OnlineCoopReceiptEntry[]
  compensations: OnlineCoopCompensationEntry[]
  board_summary?: {
    total_orders: number
    open_orders: number
    relay_orders: number
    open_relay_orders: number
  }
  society_order_board?: OnlineCoopSocietyOrderBoard
  reputation_summary: {
    total: number
    by_order_type: Record<string, number>
    completed_count: number
    updated_at: number
    trust_level: {
      id: string
      label: string
    }
    specialty_ranks: Array<{
      order_type: string
      score: number
    }>
    top_helped_targets: Array<{
      username: string
      display_name: string
      help_count: number
      total_points: number
    }>
    top_helpers: Array<{
      username: string
      display_name: string
      help_count: number
      total_points: number
    }>
  }
  order_type_options: OnlineCoopOrderType[]
  scope_options: OnlineCoopOrderScope[]
  reward_type_options: OnlineCoopRewardType[]
  msg?: string
}

export const fetchCoopOrderOverview = async (): Promise<OnlineCoopOrderOverviewResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineCoopOrderOverviewResponse>(() => fetch('/api/taoyuan/online/orders', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取求助单列表失败',
    networkErrorMessage: '求助单服务连接失败，请检查网络或稍后重试'
  })
  return data ?? null
}

export const createCoopOrder = async (payload: {
  title: string
  description: string
  order_type: OnlineCoopOrderType
  scope: OnlineCoopOrderScope
  target_save_id?: number
  deadline_at: number
  reward_type: OnlineCoopRewardType
  reward_value: number
  reward_label: string
  stage_definitions?: Array<{
    title: string
    description: string
    preferred_order_type: OnlineCoopOrderType
    target_item_id: string
    target_quantity: number
  }>
}) => {
  return requestSocialAction<{ ok: boolean; order?: OnlineCoopOrderEntry }>('/api/taoyuan/online/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const acceptCoopOrder = async (orderId: string) => {
  return requestSocialAction<{ ok: boolean; order?: OnlineCoopOrderEntry }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/accept`, {
    method: 'POST'
  })
}

export const cancelAcceptedCoopOrder = async (orderId: string) => {
  return requestSocialAction<{ ok: boolean; order?: OnlineCoopOrderEntry }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/cancel-accept`, {
    method: 'POST'
  })
}

export const acceptCoopOrderStage = async (orderId: string, stageId: string) => {
  return requestSocialAction<{ ok: boolean; order?: OnlineCoopOrderEntry; stage?: OnlineCoopOrderStageEntry }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/stages/${encodeURIComponent(stageId)}/accept`, {
    method: 'POST'
  })
}

export const cancelAcceptedCoopOrderStage = async (orderId: string, stageId: string) => {
  return requestSocialAction<{ ok: boolean; order?: OnlineCoopOrderEntry; stage?: OnlineCoopOrderStageEntry }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/stages/${encodeURIComponent(stageId)}/cancel-accept`, {
    method: 'POST'
  })
}

export const submitCoopOrderDelivery = async (orderId: string, payload: {
  delivered_items: Array<{
    item_id: string
    quantity: number
  }>
  result_note: string
}) => {
  return requestSocialAction<{
    ok: boolean
    order?: OnlineCoopOrderEntry
    receipt?: OnlineCoopReceiptEntry
    duplicate_protected?: boolean
  }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const submitCoopOrderStageDelivery = async (orderId: string, stageId: string, payload: {
  delivered_items: Array<{
    item_id: string
    quantity: number
  }>
  result_note: string
}) => {
  return requestSocialAction<{
    ok: boolean
    order?: OnlineCoopOrderEntry
    stage?: OnlineCoopOrderStageEntry
    receipt?: OnlineCoopReceiptEntry
    duplicate_protected?: boolean
  }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/stages/${encodeURIComponent(stageId)}/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const confirmCoopOrderDelivery = async (orderId: string, payload: OnlineCoopRewardSettlementPayload = {}) => {
  return requestSocialAction<{
    ok: boolean
    order?: OnlineCoopOrderEntry
    receipt?: OnlineCoopReceiptEntry
    compensation?: OnlineCoopCompensationEntry | null
  }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const confirmCoopOrderStageDelivery = async (orderId: string, stageId: string, payload: OnlineCoopRewardSettlementPayload = {}) => {
  return requestSocialAction<{
    ok: boolean
    order?: OnlineCoopOrderEntry
    stage?: OnlineCoopOrderStageEntry
    receipt?: OnlineCoopReceiptEntry
    compensation?: OnlineCoopCompensationEntry | null
  }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/stages/${encodeURIComponent(stageId)}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const retryCoopOrderCompensation = async (compensationId: string) => {
  return requestSocialAction<{
    ok: boolean
    order?: OnlineCoopOrderEntry
    receipt?: OnlineCoopReceiptEntry
    compensation?: OnlineCoopCompensationEntry
  }>(`/api/taoyuan/online/orders/compensations/${encodeURIComponent(compensationId)}/retry`, {
    method: 'POST'
  })
}

export interface OnlineFavoriteOverviewResponse {
  ok: boolean
  favorites: Array<{
    id: string
    owner_username: string
    manor_username: string
    theme: string
    created_at: number
    snapshot: OnlineManorSnapshot
  }>
  same_theme_favorites: Array<Array<{
    manor_username: string
    display_name: string
  }>>
  hot_manors: Array<{
    manor_username: string
    favorite_count: number
    theme: string
  }>
}

export const fetchFavoriteOverview = async (): Promise<OnlineFavoriteOverviewResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<OnlineFavoriteOverviewResponse>(() => fetch('/api/taoyuan/online/manor/favorites/overview', {
    credentials: 'include'
  }), {
    fallbackMessage: '获取庄园收藏失败',
    networkErrorMessage: '庄园收藏服务连接失败，请检查网络或稍后重试'
  })
  return data ?? null
}
