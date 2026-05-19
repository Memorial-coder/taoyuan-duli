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
  status: 'created' | 'persist_preview'
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

export interface FestivalRoomSnapshot {
  id: string
  title: string
  template_id: string
  template_label: string
  template_summary: string
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
  my_room: FestivalRoomSnapshot | null
  invited_rooms: FestivalRoomSnapshot[]
  visible_rooms: FestivalRoomSnapshot[]
  recent_receipts: Array<{
    id: string
    room_id: string
    room_title: string
    template_id: string
    template_label: string
    target_slot: number
    status: 'created' | 'persist_preview'
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
    my_room: data.my_room ?? null,
    invited_rooms: data.invited_rooms ?? [],
    visible_rooms: data.visible_rooms ?? [],
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

export const settleFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/settle`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}

export const closeFestivalRoom = async (roomId: string): Promise<FestivalRoomActionResponse> => {
  const data = await request<FestivalRoomActionResponse>(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(roomId)}/close`, () => buildSignedInit('POST'))
  return data as FestivalRoomActionResponse
}
