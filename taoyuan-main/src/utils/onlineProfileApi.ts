import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type OnlineProfileVisibility = 'public' | 'friends_only' | 'private'

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
  msg?: string
}

export interface OnlineRelationCard {
  request_id?: string
  friendship_id?: string
  block_id?: string
  created_at: number
  last_interaction_at?: number
  friends_since?: number
  profile: NonNullable<OnlineProfileResponse['profile']>
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

export interface OnlineManorSnapshot {
  username: string
  display_name: string
  visibility: OnlineProfileVisibility
  viewer_is_owner: boolean
  manor_name: string
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
    template_options: Array<{
      id: 'showcase' | 'operational' | 'festival' | 'collection' | 'story'
      label: string
      summary: string
    }>
  }
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

export const sendFriendRequest = async (targetUsername: string) => {
  return requestSocialAction('/api/taoyuan/online/social/friend-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername })
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

export const blockPlayer = async (targetUsername: string) => {
  return requestSocialAction('/api/taoyuan/online/social/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername })
  })
}

export const unblockPlayer = async (targetUsername: string) => {
  return requestSocialAction('/api/taoyuan/online/social/blocks/unblock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername })
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

export const createManorGuestbookEntry = async (payload: {
  target_username: string
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
}) => {
  return requestSocialAction<{ ok: boolean; snapshot?: OnlineManorSnapshot }>('/api/taoyuan/online/manor/theme-week', {
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

export interface OnlineCoopOrderEntry {
  id: string
  owner_username: string
  owner_display_name: string
  title: string
  description: string
  order_type: OnlineCoopOrderType
  scope: OnlineCoopOrderScope
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
  created_at: number
  updated_at: number
}

export interface OnlineCoopReceiptEntry {
  id: string
  order_id: string
  owner_username: string
  assignee_username: string
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
  compensation_id: string
  created_at: number
  confirmed_at: number
  updated_at: number
}

export interface OnlineCoopCompensationEntry {
  id: string
  receipt_id: string
  order_id: string
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
  reputation_summary: {
    total: number
    by_order_type: Record<string, number>
    updated_at: number
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
  deadline_at: number
  reward_type: OnlineCoopRewardType
  reward_value: number
  reward_label: string
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

export const confirmCoopOrderDelivery = async (orderId: string) => {
  return requestSocialAction<{
    ok: boolean
    order?: OnlineCoopOrderEntry
    receipt?: OnlineCoopReceiptEntry
    compensation?: OnlineCoopCompensationEntry | null
  }>(`/api/taoyuan/online/orders/${encodeURIComponent(orderId)}/confirm-delivery`, {
    method: 'POST'
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
