import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type ExpeditionRoomState =
  | 'created'
  | 'inviting'
  | 'ready_check'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'settling'
  | 'closed'
  | 'aborted'

export type ExpeditionRoomMemberState =
  | 'invited'
  | 'joined'
  | 'ready'
  | 'countdown_locked'
  | 'active'
  | 'disconnected'
  | 'reconnecting'
  | 'finished'
  | 'settled'
  | 'left'
  | 'kicked'

export interface ExpeditionRoomTemplate {
  activity_domain?: string
  id: string
  label: string
  summary: string
  default_member_limit: number
  opening_title: string
  recommended_gameplay_template_ids: string[]
}

export interface ExpeditionGameplayActionOption {
  id: string
  label: string
  summary: string
  unique_per_member: boolean
}

export interface ExpeditionGameplayTemplate {
  activity_domain?: string
  id: string
  label: string
  kind: string
  summary: string
  objective_label: string
  score_label: string
  default_target: number
  recommended_room_template_ids: string[]
  action_options: ExpeditionGameplayActionOption[]
}

export interface ExpeditionGameplayContributionSnapshot {
  username: string
  display_name: string
  progress_value: number
  score_value: number
  action_count: number
  locked: boolean
  last_action_id: string
  last_action_label: string
  last_action_at: number
}

export interface ExpeditionGameplayAvailableAction {
  id: string
  label: string
  summary: string
  unique_per_member: boolean
  can_use: boolean
  disabled_reason: string
}

export interface ExpeditionGameplaySnapshot {
  template_id: string
  template_label: string
  template_kind: string
  template_summary: string
  objective_label: string
  progress_value: number
  progress_target: number
  progress_percent: number
  progress_text: string
  score_label: string
  score_value: number
  phase: 'prep' | 'active' | 'completed'
  phase_label: string
  last_action_id: string
  last_action_summary: string
  last_actor_username: string
  last_actor_display_name: string
  is_completed: boolean
  completed_at: number
  contributions: ExpeditionGameplayContributionSnapshot[]
  available_actions: ExpeditionGameplayAvailableAction[]
}

export interface ExpeditionRoomMemberSnapshot {
  username: string
  display_name: string
  role: string
  status: ExpeditionRoomMemberState
  status_label: string
  invited_at: number
  joined_at: number
  ready_at: number
  disconnected_at: number
  reconnected_at: number
  left_at: number
  active_receipt_id: string
}

export interface ExpeditionRoomInvitationSnapshot {
  id: string
  target_username: string
  target_display_name: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: number
  responded_at: number
}

export interface ExpeditionRoomEventSnapshot {
  id: string
  event: string
  actor_username: string
  actor_display_name: string
  summary: string
  created_at: number
}

export interface ExpeditionRoomReceiptPreview {
  id: string
  activity_domain?: string
  target_username: string
  target_display_name: string
  target_slot: number
  status: 'created' | 'persist_preview' | 'pending_persist' | 'persisted' | 'compensation_pending'
  status_label: string
  reward_payload: {
    money: number
    reward_tickets: number
    items: Array<{
      item_id: string
      quantity: number
    }>
  }
  summary: string
  created_at: number
}

export interface ExpeditionRoomOpeningCeremony {
  stage: 'countdown' | 'running_intro'
  title: string
  subtitle: string
  lines: string[]
  countdown_remaining_seconds: number
}

export interface ExpeditionRoomSnapshot {
  id: string
  activity_domain?: string
  title: string
  template_id: string
  template_label: string
  template_summary: string
  gameplay_template_id: string
  host_username: string
  host_display_name: string
  state: ExpeditionRoomState
  state_label: string
  state_reason: string
  member_limit: number
  countdown_seconds: number
  reconnect_window_seconds: number
  created_at: number
  updated_at: number
  ready_check_started_at: number
  countdown_started_at: number
  countdown_ends_at: number
  running_started_at: number
  settled_at: number
  closed_at: number
  aborted_at: number
  settlement_version: number
  members: ExpeditionRoomMemberSnapshot[]
  invitations: ExpeditionRoomInvitationSnapshot[]
  recent_events: ExpeditionRoomEventSnapshot[]
  settlement_receipts: ExpeditionRoomReceiptPreview[]
  gameplay: ExpeditionGameplaySnapshot
  opening_ceremony: ExpeditionRoomOpeningCeremony | null
  joined_member_count: number
  ready_member_count: number
  my_member_status: string
  invitation_id: string
  can_join: boolean
  can_leave: boolean
  can_ready: boolean
  can_unready: boolean
  can_disconnect: boolean
  can_reconnect: boolean
  can_host_ready_check: boolean
  can_host_start_countdown: boolean
  can_host_settle: boolean
  can_host_close: boolean
}

export interface ExpeditionRoomOverview {
  bulletin: string
  templates: ExpeditionRoomTemplate[]
  gameplay_templates: ExpeditionGameplayTemplate[]
  my_room: ExpeditionRoomSnapshot | null
  invited_rooms: ExpeditionRoomSnapshot[]
  visible_rooms: ExpeditionRoomSnapshot[]
  recent_memorials: unknown[]
  recent_receipts: Array<{
    id: string
    room_id: string
    room_title: string
    template_id: string
    template_label: string
    target_slot: number
    status: 'created' | 'persist_preview' | 'pending_persist' | 'persisted' | 'compensation_pending'
    status_label: string
    reward_payload: ExpeditionRoomReceiptPreview['reward_payload']
    summary: string
    created_at: number
  }>
}

export interface ExpeditionRoomActionResponse {
  ok: boolean
  room: ExpeditionRoomSnapshot
  overview: ExpeditionRoomOverview
  msg?: string
}

export interface ExpeditionRoomOverviewResponse extends ExpeditionRoomOverview {
  ok: boolean
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用联机远征房间')
  }
}

const request = async <T>(input: string, initFactory?: RequestInit | (() => Promise<RequestInit> | RequestInit)) => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson<T>(async () => {
    const init = typeof initFactory === 'function' ? await initFactory() : initFactory
    return fetch(input, {
      credentials: 'include',
      ...init,
    })
  }, {
    fallbackMessage: '远征房间请求失败',
    networkErrorMessage: '远征房间连接失败，请检查网络后重试',
  })
  return data
}

export const fetchExpeditionRoomOverview = async (): Promise<ExpeditionRoomOverview | null> => {
  const data = await request<ExpeditionRoomOverviewResponse>('/api/taoyuan/online/expedition/rooms')
  return data?.templates ? {
    bulletin: data.bulletin,
    templates: data.templates,
    gameplay_templates: data.gameplay_templates ?? [],
    my_room: data.my_room ?? null,
    invited_rooms: data.invited_rooms ?? [],
    visible_rooms: data.visible_rooms ?? [],
    recent_memorials: data.recent_memorials ?? [],
    recent_receipts: data.recent_receipts ?? [],
  } : null
}

const buildSignedJsonInit = async (method: 'POST', body?: Record<string, unknown>) => {
  const csrfToken = await ensureCurrentCsrfToken()
  return {
    method,
    headers: {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  }
}

const buildSignedInit = async (method: 'POST') => {
  const csrfToken = await ensureCurrentCsrfToken()
  return {
    method,
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  }
}

export const createExpeditionRoom = async (payload: {
  template_id: string
  gameplay_template_id?: string
  title?: string
  member_limit?: number
  countdown_seconds?: number
}): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>('/api/taoyuan/online/expedition/rooms', () => buildSignedJsonInit('POST', payload)) as Promise<ExpeditionRoomActionResponse>

export const inviteExpeditionRoomMember = async (roomId: string, targetUsername: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/invite`, () =>
    buildSignedJsonInit('POST', { target_username: targetUsername })
  ) as Promise<ExpeditionRoomActionResponse>

export const joinExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/join`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const leaveExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/leave`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const startExpeditionRoomReadyCheck = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready-check`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const readyExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/ready`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const unreadyExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/unready`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const startExpeditionRoomCountdown = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/start`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const disconnectExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/disconnect`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const reconnectExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/reconnect`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const submitExpeditionRoomGameplayAction = async (roomId: string, actionId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/action`, () =>
    buildSignedJsonInit('POST', { action_id: actionId })
  ) as Promise<ExpeditionRoomActionResponse>

export const settleExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/settle`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>

export const closeExpeditionRoom = async (roomId: string): Promise<ExpeditionRoomActionResponse> =>
  request<ExpeditionRoomActionResponse>(`/api/taoyuan/online/expedition/rooms/${encodeURIComponent(roomId)}/close`, () => buildSignedInit('POST')) as Promise<ExpeditionRoomActionResponse>
