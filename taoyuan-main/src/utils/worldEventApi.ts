import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export interface WorldEventActionOption {
  id: string
  label: string
  summary: string
  cost_money: number
  progress_delta: number
  can_use: boolean
  disabled_reason: string
}

export interface WorldEventContributorSnapshot {
  username: string
  display_name: string
  progress_value: number
  action_count: number
  last_action_id: string
  last_action_label: string
  last_action_at: number
  settled_at: number
  rank: number
}

export interface WorldEventReceiptSnapshot {
  id: string
  target_username: string
  target_display_name: string
  target_slot: number | null
  contribution_value: number
  reward_payload: { money: number }
  reward_summary: string
  badge_label: string
  rank: number
  status: 'pending_persist' | 'persisted' | 'compensation_pending'
  status_label: string
  reward_result: string
  last_error: string
  created_at: number
}

export interface WorldEventSnapshot {
  id: string
  definition_id: string
  label: string
  season: string
  season_label: string
  scope: string
  scope_label: string
  scope_value: string
  scope_key: string
  state: string
  state_label: string
  summary: string
  objective_label: string
  progress_value: number
  target_progress: number
  progress_percent: number
  progress_text: string
  cycle_key: string
  is_current_season: boolean
  can_contribute: boolean
  locked_reason: string
  reward_money_hint: number
  reward_summary: string
  completion_text: string
  completed_at: number
  settled_at: number
  contribution_actions: WorldEventActionOption[]
  contributors: WorldEventContributorSnapshot[]
  recent_logs: Array<{
    id: string
    username: string
    display_name: string
    action_id: string
    action_label: string
    progress_delta: number
    summary: string
    created_at: number
  }>
  settlement_receipts: WorldEventReceiptSnapshot[]
  my_contribution: {
    progress_value: number
    action_count: number
    last_action_label: string
    last_action_at: number
    settled_at: number
    rank: number
  } | null
}

export interface WorldEventOverview {
  bulletin: string
  current_season: string
  current_season_label: string
  current_cycle_key: string
  current_event: WorldEventSnapshot | null
  events: WorldEventSnapshot[]
  world_events: WorldEventSnapshot[]
  current_world_events: WorldEventSnapshot[]
  recent_annals: Array<{
    id: string
    event_id: string
    event_label: string
    season: string
    season_label: string
    cycle_key: string
    summary: string
    completed_at: number
    contributor_count: number
    top_contributor_username: string
    top_contributor_display_name: string
  }>
  total_contribution_points: number
  my_records: Array<{
    record_id: string
    event_id: string
    event_label: string
    season: string
    season_label: string
    cycle_key: string
    contribution_value: number
    reward_money: number
    reward_summary: string
    badge_label: string
    rank: number
    completed_at: number
  }>
  seasonal_badges: Array<{
    event_id: string
    label: string
    cycle_key: string
    rank: number
    awarded_at: number
  }>
}

export interface WorldEventActionResponse {
  ok: boolean
  event: WorldEventSnapshot
  overview: WorldEventOverview
  msg?: string
}

export interface WorldEventOverviewResponse extends WorldEventOverview {
  ok: boolean
  msg?: string
}

const ensureLoggedInContext = async () => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') {
    throw new Error('请先登录后再参与四季大事件')
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
    fallbackMessage: '四季大事件请求失败',
    networkErrorMessage: '四季大事件连接失败，请检查网络后重试',
  })
  return data
}

export const fetchWorldEventOverview = async (): Promise<WorldEventOverview | null> => {
  const data = await request<WorldEventOverviewResponse>('/api/taoyuan/online/world-events')
  return data?.events ? {
    bulletin: data.bulletin,
    current_season: data.current_season,
    current_season_label: data.current_season_label,
    current_cycle_key: data.current_cycle_key,
    current_event: data.current_event ?? null,
    events: data.events ?? [],
    world_events: data.world_events ?? [],
    current_world_events: data.current_world_events ?? [],
    recent_annals: data.recent_annals ?? [],
    total_contribution_points: data.total_contribution_points ?? 0,
    my_records: data.my_records ?? [],
    seasonal_badges: data.seasonal_badges ?? [],
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

export const contributeWorldEvent = async (eventId: string, actionId: string): Promise<WorldEventActionResponse> => {
  const data = await request<WorldEventActionResponse>(`/api/taoyuan/online/world-events/${encodeURIComponent(eventId)}/contribute`, () =>
    buildSignedJsonInit('POST', { action_id: actionId })
  )
  return data as WorldEventActionResponse
}
