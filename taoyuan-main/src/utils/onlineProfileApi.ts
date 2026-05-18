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
