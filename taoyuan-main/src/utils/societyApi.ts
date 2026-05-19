import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type SocietyVisibility = 'public' | 'semi_public' | 'private'
export type SocietyRole = 'president' | 'steward' | 'buyer' | 'treasurer' | 'scribe' | 'member'

export interface SocietyMemberSnapshot {
  username: string
  display_name: string
  role: SocietyRole | string
  role_label: string
  joined_at: number
}

export interface SocietyActivityEntry {
  id: string
  type: string
  message: string
  created_at: number
}

export interface SocietySnapshot {
  id: string
  name: string
  summary: string
  emblem: string
  emblem_label: string
  theme: string
  theme_label: string
  visibility: SocietyVisibility
  visibility_label: string
  capacity: number
  member_count: number
  leader_username: string
  leader_display_name: string
  join_requirement_id: string
  join_requirement_label: string
  join_requirement_summary: string
  join_requirement_note: string
  created_at: number
  updated_at: number
  my_role: string
  my_role_label: string
  can_apply: boolean
  members: SocietyMemberSnapshot[]
  activity_log: SocietyActivityEntry[]
}

export interface SocietyOverviewResponse {
  ok: boolean
  bulletin: string
  my_society: SocietySnapshot | null
  visible_societies: SocietySnapshot[]
  visibility_options: Array<{
    id: SocietyVisibility
    label: string
    summary: string
  }>
  theme_options: Array<{
    id: string
    label: string
    summary: string
  }>
  emblem_options: Array<{
    id: string
    label: string
  }>
  capacity_options: Array<{
    value: number
    label: string
  }>
  join_requirement_options: Array<{
    id: string
    label: string
    summary: string
  }>
  msg?: string
}

const requestSocietyAction = async <T = any>(path: string, init: RequestInit): Promise<T | null> => {
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
    fallbackMessage: '村社请求失败',
    networkErrorMessage: '村社服务连接失败，请检查网络或稍后重试',
  })
  return data
}

export const fetchSocietyOverview = async (): Promise<SocietyOverviewResponse | null> => {
  const account = await ensureCurrentAccount()
  if (!account || account === 'guest') return null
  const { data } = await fetchProtectedJson<SocietyOverviewResponse>(() => fetch('/api/taoyuan/online/societies', {
    credentials: 'include',
  }), {
    fallbackMessage: '获取村社信息失败',
    networkErrorMessage: '村社服务连接失败，请检查网络或稍后重试',
  })
  return data ?? null
}

export const createSociety = async (payload: {
  name: string
  summary: string
  emblem: string
  theme: string
  visibility: SocietyVisibility
  capacity: number
  join_requirement_id: string
  join_requirement_note: string
}) => {
  return requestSocietyAction<{
    ok: boolean
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>('/api/taoyuan/online/societies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
