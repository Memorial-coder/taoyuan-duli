import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type FestivalRoomState =
  | 'created'
  | 'inviting'
  | 'ready_check'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'settling'
  | 'closed'
  | 'aborted'

export type FestivalRoomMemberState =
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

export interface FestivalRoomTemplate {
  id: string
  label: string
  summary: string
  default_member_limit: number
  opening_title: string
  recommended_gameplay_template_ids: string[]
}

export interface FestivalGameplayActionOption {
  id: string
  label: string
  summary: string
  unique_per_member: boolean
}

export interface FestivalGameplayTemplate {
  id: string
  label: string
  kind: string
  summary: string
  objective_label: string
  score_label: string
  default_target: number
  recommended_room_template_ids: string[]
  action_options: FestivalGameplayActionOption[]
}

export interface FestivalGameplayContributionSnapshot {
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

export interface FestivalGameplayAvailableAction {
  id: string
  label: string
  summary: string
  unique_per_member: boolean
  can_use: boolean
  disabled_reason: string
}

export interface FestivalGameplaySnapshot {
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
  contributions: FestivalGameplayContributionSnapshot[]
  available_actions: FestivalGameplayAvailableAction[]
}

export interface FestivalRoomMemberSnapshot {
  username: string
  display_name: string
  role: string
  status: FestivalRoomMemberState
  status_label: string
  invited_at: number
  joined_at: number
  ready_at: number
  disconnected_at: number
  reconnected_at: number
  left_at: number
  active_receipt_id: string
}

export interface FestivalRoomInvitationSnapshot {
  id: string
  target_username: string
  target_display_name: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: number
  responded_at: number
}

export interface FestivalRoomEventSnapshot {
  id: string
  event: string
  actor_username: string
  actor_display_name: string
  summary: string
  created_at: number
}

export interface FestivalRoomReceiptPreview {
  id: string
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

export interface FestivalRoomOpeningCeremony {
  stage: 'countdown' | 'running_intro'
  title: string
  subtitle: string
  lines: string[]
  countdown_remaining_seconds: number
}

export interface FestivalMemorialSnapshot {
  memorial_id: string
  label: string
  room_id: string
  template_id: string
  template_label: string
  gameplay_template_id: string
  gameplay_template_label: string
  awarded_at: number
  reward_summary: string
  reward_money: number
  reward_ticket_quantity: number
  decoration_label: string
  title_label: string
  squadmate_display_names: string[]
  squadmate_friend_display_names: string[]
  photo_moment_label: string
  photo_line: string
  photo_taken: boolean
}

export interface FestivalRoomSnapshot {
  id: string
  title: string
  template_id: string
  template_label: string
  template_summary: string
  gameplay_template_id: string
  host_username: string
  host_display_name: string
  state: FestivalRoomState
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
  members: FestivalRoomMemberSnapshot[]
  invitations: FestivalRoomInvitationSnapshot[]
  recent_events: FestivalRoomEventSnapshot[]
  settlement_receipts: FestivalRoomReceiptPreview[]
  gameplay: FestivalGameplaySnapshot
  opening_ceremony: FestivalRoomOpeningCeremony | null
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

export interface FestivalRoomOverview {
  bulletin: string
  templates: FestivalRoomTemplate[]
  gameplay_templates: FestivalGameplayTemplate[]
  my_room: FestivalRoomSnapshot | null
  invited_rooms: FestivalRoomSnapshot[]
  visible_rooms: FestivalRoomSnapshot[]
  recent_memorials: FestivalMemorialSnapshot[]
  recent_receipts: Array<{
    id: string
    room_id: string
    room_title: string
    template_id: string
    template_label: string
    target_slot: number
    status: 'created' | 'persist_preview' | 'pending_persist' | 'persisted' | 'compensation_pending'
    status_label: string
    reward_payload: FestivalRoomReceiptPreview['reward_payload']
    summary: string
    created_at: number
  }>
}

export interface FestivalRoomActionResponse {
  ok: boolean
  room: FestivalRoomSnapshot
  overview: FestivalRoomOverview
  msg?: string
}

export interface FestivalRoomOverviewResponse extends FestivalRoomOverview {
  ok: boolean
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再使用节会房间')
  }
}

const request = async <T>(input: string, initFactory?: RequestInit | (() => Promise<RequestInit> | RequestInit)) => {
  await ensureLoggedInContext()
  const { data } = await fetchProtectedJson<T>(async () => {
    const init = typeof initFactory === 'function' ? await initFactory() : initFactory
    return fetch(input, {
      credentials: 'include',
      ...init
    })
  }, {
    fallbackMessage: '节会房间请求失败',
    networkErrorMessage: '节会房间连接失败，请检查网络后重试'
  })
  return data
}

export const fetchFestivalRoomOverview = async (): Promise<FestivalRoomOverview | null> => {
  const data = await request<FestivalRoomOverviewResponse>('/api/taoyuan/online/festival/rooms')
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

export const createFestivalRoom = async (payload: {
  template_id: string
  gameplay_template_id?: string
  title?: string
  member_limit?: number
  countdown_seconds?: number
}): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>('/api/taoyuan/online/festival/rooms', () => buildSignedJsonInit('POST', payload))
  return data as FestivalRoomActionResponse
}

export const inviteFestivalRoomMember = async (roomId: string, targetUsername: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/invite`, () =>
    buildSignedJsonInit('POST', { target_username: targetUsername })
  )
  return data as FestivalRoomActionResponse
}

export const joinFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/join`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const leaveFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/leave`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const startFestivalRoomReadyCheck = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/ready-check`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const readyFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/ready`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const unreadyFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/unready`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const startFestivalRoomCountdown = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/start`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const disconnectFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/disconnect`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const reconnectFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/reconnect`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const submitFestivalRoomGameplayAction = async (roomId: string, actionId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/action`, () =>
    buildSignedJsonInit('POST', { action_id: actionId })
  )
  return data as FestivalRoomActionResponse
}

export const settleFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/settle`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const closeFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/close`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}
