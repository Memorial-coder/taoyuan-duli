import { ensureCurrentAccount, ensureCurrentCsrfToken } from '@/utils/accountStorage'
import { fetchProtectedJson } from '@/utils/protectedApi'

export type SocietyVisibility = 'public' | 'semi_public' | 'private'
export type SocietyRole = 'president' | 'steward' | 'buyer' | 'treasurer' | 'scribe' | 'member'
export type SocietyProposalStatus = 'open' | 'closed'
export type SocietyProposalChoice = 'support' | 'reject' | 'abstain'

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

export interface SocietyJoinRequestSnapshot {
  id: string
  society_id: string
  society_name: string
  username: string
  display_name: string
  invited_by: string
  invited_by_display_name: string
  type: 'apply' | 'invite'
  type_label: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: number
  updated_at: number
}

export interface SocietyProposalVoteSnapshot {
  username: string
  display_name: string
  choice: SocietyProposalChoice
  choice_label: string
  voted_at: number
}

export interface SocietyProposalSnapshot {
  id: string
  title: string
  summary: string
  kind: string
  kind_label: string
  status: SocietyProposalStatus
  status_label: string
  created_by: string
  created_by_display_name: string
  created_at: number
  updated_at: number
  closed_at: number
  vote_counts: {
    support: number
    reject: number
    abstain: number
  }
  total_vote_count: number
  my_vote_choice: SocietyProposalChoice | ''
  can_vote: boolean
  can_close: boolean
  result_choice: 'support' | 'reject' | 'abstain' | 'tie' | 'pending'
  result_label: string
  resolution_note: string
  choice_options: Array<{
    id: SocietyProposalChoice
    label: string
  }>
  votes: SocietyProposalVoteSnapshot[]
}

export interface SocietySnapshot {
  id: string
  name: string
  summary: string
  notice: string
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
  my_role: SocietyRole | ''
  my_role_label: string
  can_apply: boolean
  can_invite: boolean
  can_review_requests: boolean
  can_manage_roles: boolean
  can_manage_notice: boolean
  can_create_proposal: boolean
  can_close_proposal: boolean
  members: SocietyMemberSnapshot[]
  activity_log: SocietyActivityEntry[]
  active_proposals: SocietyProposalSnapshot[]
  proposal_history: SocietyProposalSnapshot[]
}

export interface SocietyOverviewResponse {
  ok: boolean
  bulletin: string
  my_society: SocietySnapshot | null
  visible_societies: SocietySnapshot[]
  incoming_invites: SocietyJoinRequestSnapshot[]
  my_pending_requests: SocietyJoinRequestSnapshot[]
  managed_requests: SocietyJoinRequestSnapshot[]
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
  role_options: Array<{
    id: string
    label: string
  }>
  proposal_kind_options: Array<{
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
  notice?: string
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

export const applyToSociety = async (societyId: string) => {
  return requestSocietyAction<{
    ok: boolean
    request?: SocietyJoinRequestSnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>(`/api/taoyuan/online/societies/${encodeURIComponent(societyId)}/apply`, {
    method: 'POST',
  })
}

export const inviteToSociety = async (targetUsername: string) => {
  return requestSocietyAction<{
    ok: boolean
    request?: SocietyJoinRequestSnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>('/api/taoyuan/online/societies/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername }),
  })
}

export const acceptSocietyRequest = async (requestId: string) => {
  return requestSocietyAction<{
    ok: boolean
    request?: SocietyJoinRequestSnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>(`/api/taoyuan/online/societies/requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
  })
}

export const rejectSocietyRequest = async (requestId: string) => {
  return requestSocietyAction<{
    ok: boolean
    request?: SocietyJoinRequestSnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>(`/api/taoyuan/online/societies/requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST',
  })
}

export const updateSocietyMemberRole = async (targetUsername: string, role: Exclude<SocietyRole, 'president'>) => {
  return requestSocietyAction<{
    ok: boolean
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>('/api/taoyuan/online/societies/members/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_username: targetUsername, role }),
  })
}

export const updateSocietyNotice = async (notice: string) => {
  return requestSocietyAction<{
    ok: boolean
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>('/api/taoyuan/online/societies/notice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notice }),
  })
}

export const createSocietyProposal = async (payload: {
  title: string
  summary: string
  kind: string
}) => {
  return requestSocietyAction<{
    ok: boolean
    proposal?: SocietyProposalSnapshot
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>('/api/taoyuan/online/societies/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export const voteSocietyProposal = async (proposalId: string, choice: SocietyProposalChoice) => {
  return requestSocietyAction<{
    ok: boolean
    proposal?: SocietyProposalSnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>(`/api/taoyuan/online/societies/proposals/${encodeURIComponent(proposalId)}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice }),
  })
}

export const closeSocietyProposal = async (proposalId: string, resolutionNote: string) => {
  return requestSocietyAction<{
    ok: boolean
    proposal?: SocietyProposalSnapshot
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>(`/api/taoyuan/online/societies/proposals/${encodeURIComponent(proposalId)}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution_note: resolutionNote }),
  })
}
