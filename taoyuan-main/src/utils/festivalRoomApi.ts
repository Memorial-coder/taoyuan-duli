import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'
import type { OnlineVisualState } from '@/types/onlineVisual'

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
  | 'timeout'

export interface FestivalRoomTemplate {
  id: string
  label: string
  summary: string
  default_member_limit: number
  min_member_limit: number
  max_member_limit: number
  opening_title: string
  recommended_gameplay_template_ids: string[]
}

export interface FestivalGameplayActionOption {
  id: string
  label: string
  summary: string
  unique_per_member: boolean
  required_role?: string
  once_per_round?: boolean
  pressure_delta?: number
  risk_delta?: number
  resource_delta?: Record<string, number>
  combo_tags?: string[]
  round_effect?: string
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
  required_role: string
  required_role_label: string
  once_per_round: boolean
  pressure_delta: number
  pressure_delta_text: string
  risk_delta: number
  risk_delta_text: string
  resource_delta: Record<string, number>
  resource_delta_text: string
  combo_tags: string[]
  round_effect: string
  can_use: boolean
  disabled_reason: string
}

export interface FestivalCurrentEvent {
  id: string
  label: string
  summary: string
  pressure_hint: string
  resource_hint: string
  combo_tags: string[]
}

export interface FestivalResourceSnapshot {
  id: string
  label: string
  value: number
  max_value: number
  text: string
}

export interface FestivalRoleSnapshot {
  username: string
  display_name: string
  role_id: string
  role_label: string
  role_summary: string
}

export interface FestivalRoundActionSnapshot {
  round_number: number
  action_id: string
  actor_username: string
  created_at: number
}

export interface FestivalRoundLogSnapshot {
  id: string
  round_number: number
  event_id: string
  actor_username: string
  actor_display_name: string
  action_id: string
  action_label: string
  role_id: string
  role_label: string
  summary: string
  progress_delta: number
  score_delta: number
  pressure_delta: number
  resource_delta: Record<string, number>
  resource_delta_text: string
  created_at: number
}

export interface FestivalRoundStateSnapshot {
  round_number: number
  round_text: string
  current_event: FestivalCurrentEvent
  pressure_value: number
  pressure_max: number
  pressure_text: string
  team_resources: FestivalResourceSnapshot[]
  role_assignments: FestivalRoleSnapshot[]
  my_role: FestivalRoleSnapshot | null
  round_actions: FestivalRoundActionSnapshot[]
  round_log: FestivalRoundLogSnapshot[]
  recent_feedback: string
  resource_summary: string
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
  festival_state: FestivalRoundStateSnapshot | null
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
  target_save_id: number
  target_save_slot: number | null
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

export interface FestivalRoomActionLogSnapshot {
  id: string
  room_id: string
  activity_domain: string
  template_id: string
  action: string
  action_category: string
  actor_username: string
  actor_display_name: string
  room_state: string
  room_state_reason: string
  gameplay_template_id: string
  gameplay_phase: string
  gameplay_action_id: string
  gameplay_action_label: string
  target_ref: string
  idempotency_key: string
  member_count: number
  settlement_version: number
  settlement_receipt_ids: string[]
  compensation_hint: string
  summary: string
  created_at: number
}

export interface FestivalRoomRouteReplayNode {
  id: string
  label: string
  kind: string
  state: string
  order: number
}

export interface FestivalRoomRouteReplayHighlight {
  node_id: string
  label: string
  summary: string
  type: string
}

export interface FestivalRoomRouteReplayContribution {
  username: string
  display_name: string
  role_label: string
  progress_value: number
  score_value: number
  action_count: number
  summary: string
}

export interface FestivalRoomRouteReplayRaceResult {
  mode: string
  rank: number
  rank_label: string
  team_count: number
  title_label: string
  popularity_bonus: number
  popularity_label: string
  reached_finish: boolean
}

export interface FestivalRoomRouteReplayRaceRanking {
  team_id: string
  label: string
  rank: number
  rank_label: string
  position_index: number
  score_value: number
  finished: boolean
  summary: string
}

export interface FestivalRoomRouteReplayMemoryRecord {
  type: string
  label: string
  actor_username: string
  actor_display_name: string
  action_id: string
  action_label: string
  object_id: string
  object_label: string
  round_number: number
  summary: string
}

export interface FestivalRoomRouteReplay {
  kind: string
  title: string
  summary: string
  route_nodes: FestivalRoomRouteReplayNode[]
  highlight_nodes: FestivalRoomRouteReplayHighlight[]
  risk_peak: {
    value: number
    round_number: number
    action_label: string
    actor_display_name: string
    summary: string
  }
  member_contributions: FestivalRoomRouteReplayContribution[]
  race_result: FestivalRoomRouteReplayRaceResult
  race_rankings: FestivalRoomRouteReplayRaceRanking[]
  memory_records: FestivalRoomRouteReplayMemoryRecord[]
  combo_records?: Array<{
    combo_id: string
    label: string
    score_delta: number
    risk_delta: number
    resource_delta_text: string
  }>
  withdrawal_state?: string
  withdrawal_summary?: string
  withdrawal_locked_combo_ids?: string[]
  withdrawal_locked_combo_count?: number
  withdrawal_actor_username?: string
  withdrawal_actor_display_name?: string
  withdrawal_at?: number
}

export interface FestivalRoomReceiptPreview {
  id: string
  idempotency_key: string
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
  route_replay: FestivalRoomRouteReplay
  created_at: number
}

export interface FestivalRoomActionReceipt {
  idempotency_key: string
  actor_username: string
  actor_display_name: string
  action_id: string
  action_label: string
  summary: string
  room_progress_value: number
  room_score_value: number
  contribution_progress_value: number
  contribution_score_value: number
  contribution_action_count: number
  completed: boolean
  created_at: number
}

export interface FestivalRoomOpeningCeremony {
  stage: 'countdown' | 'running_intro'
  title: string
  subtitle: string
  lines: string[]
  countdown_remaining_seconds: number
}

export interface FestivalMemoryRecordSummary {
  total_count: number
  signed_count: number
  pending_count: number
  memory_record_counts: Record<string, number>
  record_types: string[]
  signed_record_types: string[]
  pending_record_types: string[]
  signed_actor_display_names: string[]
  summary: string
}

export interface FestivalFriendReplaySummary {
  memorial_count: number
  memory_record_total_count: number
  signed_memory_record_count: number
  memory_record_types: string[]
  memory_record_counts: Record<string, number>
  has_photo_line: boolean
  summary: string
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
  memory_records: FestivalRoomRouteReplayMemoryRecord[]
  memory_record_summary: FestivalMemoryRecordSummary
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
  action_log: FestivalRoomActionLogSnapshot[]
  settlement_receipts: FestivalRoomReceiptPreview[]
  visual_state: OnlineVisualState
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
    route_replay: FestivalRoomRouteReplay
    created_at: number
  }>
}

export interface FestivalRoomActionResponse {
  ok: boolean
  room: FestivalRoomSnapshot
  overview: FestivalRoomOverview
  idempotency_replayed?: boolean
  action_receipt?: FestivalRoomActionReceipt
  code?: string
  msg?: string
}

export interface FestivalRoomOverviewResponse extends FestivalRoomOverview {
  ok: boolean
  msg?: string
}

export interface FestivalFriendMemorialOverview {
  target_username: string
  target_display_name: string
  viewer_username: string
  is_self: boolean
  is_friend: boolean
  friend_replay_summary: FestivalFriendReplaySummary
  memorials: FestivalMemorialSnapshot[]
}

export interface FestivalFriendMemorialOverviewResponse extends FestivalFriendMemorialOverview {
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

export const fetchFestivalFriendMemorials = async (targetUsername: string): Promise<FestivalFriendMemorialOverview> => {
  const normalizedTarget = targetUsername.trim()
  if (!normalizedTarget) throw new Error('请先填写要回看的好友用户名')
  const data = await request<FestivalFriendMemorialOverviewResponse>(
    `/api/taoyuan/online/festival/memorials/${encodeURIComponent(normalizedTarget)}`
  )
  if (!data) throw new Error('好友节会纪念读取失败')
  return {
    target_username: data.target_username,
    target_display_name: data.target_display_name,
    viewer_username: data.viewer_username,
    is_self: data.is_self,
    is_friend: data.is_friend,
    friend_replay_summary: data.friend_replay_summary ?? {
      memorial_count: data.memorials?.length ?? 0,
      memory_record_total_count: 0,
      signed_memory_record_count: 0,
      memory_record_types: [],
      memory_record_counts: {},
      has_photo_line: data.memorials?.some(memorial => Boolean(memorial.photo_line)) ?? false,
      summary: '',
    },
    memorials: data.memorials ?? [],
  }
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

const createRoomActionIdempotencyKey = (roomId: string, actionId: string) => {
  const nonce = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)
  return `festival-room-action:${roomId}:${actionId}:${Date.now()}:${nonce}`.slice(0, 120)
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
  source_label?: string
  source_feedback?: string
  source_context_summary?: string
}): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>('/api/taoyuan/online/festival/rooms', () => buildSignedJsonInit('POST', payload))
  return data as FestivalRoomActionResponse
}

export const inviteFestivalRoomMember = async (roomId: string, target: { target_username?: string; target_save_id?: number }): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/invite`, () =>
    buildSignedJsonInit('POST', target)
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

export const submitFestivalRoomGameplayAction = async (
  roomId: string,
  actionId: string,
  idempotencyKey = createRoomActionIdempotencyKey(roomId, actionId)
): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/action`, () =>
    buildSignedJsonInit('POST', { action_id: actionId, idempotency_key: idempotencyKey })
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
