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

export interface SocietyCostEntry {
  type: 'money' | 'item'
  amount?: number
  item_id?: string
  quantity?: number
  quality?: string
  label: string
}

export interface SocietyProjectPackageSnapshot {
  id: string
  label: string
  summary: string
  progress_gain: number
  costs: SocietyCostEntry[]
}

export interface SocietyProjectContributionSnapshot {
  id: string
  username: string
  display_name: string
  package_id: string
  package_label: string
  progress_gain: number
  costs: SocietyCostEntry[]
  created_at: number
}

export interface SocietyPublicProjectSnapshot {
  id: string
  label: string
  summary: string
  status: 'active' | 'completed'
  status_label: string
  progress: number
  target_progress: number
  progress_percent: number
  remaining_progress: number
  completed_at: number
  completed_by: string
  completed_by_display_name: string
  progress_note: string
  completion_feedback: string
  world_feedback: string
  can_contribute: boolean
  my_contribution_count: number
  contribution_packages: SocietyProjectPackageSnapshot[]
  recent_contributions: SocietyProjectContributionSnapshot[]
}

export interface SocietyWelfareUnlockSnapshot {
  id: string
  label: string
  summary: string
  unlock_level: number
  unlocked: boolean
}

export interface SocietyWarehouseItemSnapshot {
  item_id: string
  quantity: number
  label: string
}

export interface SocietyWarehouseLogSnapshot {
  id: string
  username: string
  display_name: string
  deposit_id: string
  deposit_label: string
  entries: SocietyCostEntry[]
  created_at: number
}

export interface SocietyWarehouseDepositOptionSnapshot {
  id: string
  label: string
  summary: string
  costs: SocietyCostEntry[]
}

export interface SocietyExclusiveFestivalSnapshot {
  id: string
  label: string
  summary: string
  perk_summary: string
  unlock_level: number
  unlocked: boolean
}

export interface SocietyExclusiveDecorSnapshot {
  id: string
  label: string
  summary: string
  unlock_level: number
  unlocked: boolean
}

export interface SocietyExclusiveTaskSnapshot {
  id: string
  label: string
  summary: string
  unlock_level: number
  unlocked: boolean
  status_label: string
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
  level: number
  level_title: string
  welfare_xp: number
  welfare_total_xp: number
  welfare_xp_to_next_level: number
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
  public_projects: SocietyPublicProjectSnapshot[]
  welfare_unlocks: SocietyWelfareUnlockSnapshot[]
  exclusive_festival: SocietyExclusiveFestivalSnapshot
  exclusive_decors: SocietyExclusiveDecorSnapshot[]
  exclusive_tasks: SocietyExclusiveTaskSnapshot[]
  public_warehouse: {
    funds: number
    items: SocietyWarehouseItemSnapshot[]
    logs: SocietyWarehouseLogSnapshot[]
    deposit_options: SocietyWarehouseDepositOptionSnapshot[]
  }
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
  public_project_defs: Array<{
    id: string
    label: string
    summary: string
    target_progress: number
  }>
  public_project_package_options: SocietyProjectPackageSnapshot[]
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

export const contributeSocietyPublicProject = async (projectId: string, packageId: string) => {
  return requestSocietyAction<{
    ok: boolean
    project?: SocietyPublicProjectSnapshot
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
    player_money?: number
  }>(`/api/taoyuan/online/societies/public-projects/${encodeURIComponent(projectId)}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package_id: packageId }),
  })
}

export const depositSocietyWarehouse = async (depositId: string) => {
  return requestSocietyAction<{
    ok: boolean
    warehouse?: SocietySnapshot['public_warehouse']
    society?: SocietySnapshot
    overview?: Omit<SocietyOverviewResponse, 'ok'>
  }>('/api/taoyuan/online/societies/public-warehouse/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deposit_id: depositId }),
  })
}
