import { clearStoredAdminToken, getStoredAdminToken, setStoredAdminToken } from '@/utils/taoyuanMailboxAdminApi'

export type AdminRole = 'super_admin' | 'admin'
export type UserAdminStatus = 'active' | 'banned' | 'deleted'

export interface AdminPermissions {
  view_users: boolean
  edit_quota: boolean
  view_save: boolean
  export_save: boolean
  migrate_save: boolean
  reset_password: boolean
  update_status: boolean
  delete_user: boolean
  view_audit_logs: boolean
  manage_content: boolean
  view_content_logs: boolean
  view_gameplay_logs: boolean
  view_user_ips: boolean
}

export interface AdminSessionInfo {
  role: AdminRole
  role_label: string
  permissions: AdminPermissions
}

const emptyAdminPermissions = (): AdminPermissions => ({
  view_users: false,
  edit_quota: false,
  view_save: false,
  export_save: false,
  migrate_save: false,
  reset_password: false,
  update_status: false,
  delete_user: false,
  view_audit_logs: false,
  manage_content: false,
  view_content_logs: false,
  view_gameplay_logs: false,
  view_user_ips: false,
})

export interface UserSaveSlotSummary {
  slot: number
  exists: boolean
  raw_length: number
}

export interface UserSaveFileSummary {
  exists: boolean
  file_name: string
  file_path: string
  file_size: number
  updated_at: number | null
  slot_count: number
  slots: UserSaveSlotSummary[]
}

export interface UserIpSourceCount {
  source: string
  count: number
}

export interface UserIpRecord {
  username?: string
  display_name?: string
  ip_hash: string
  ip_masked: string
  ip_display: string
  ip_address?: string
  first_seen_at: number
  last_seen_at: number
  source: string
  sources: UserIpSourceCount[]
  count: number
  same_user_count: number
}

export interface UserIpProfile {
  username: string
  latest_ip: UserIpRecord | null
  history: UserIpRecord[]
  same_ip_users: UserIpRecord[]
  retention_days: number
}

export interface UserIpLookup {
  ip_hash: string
  ip_masked: string
  ip_display: string
  ip_address?: string
  total: number
  retention_days: number
  users: UserIpRecord[]
}

export interface UserAdminSummary {
  username: string
  display_name: string
  quota: number
  created_at: number
  status: UserAdminStatus
  banned_at: number | null
  deleted_at: number | null
  save_file: UserSaveFileSummary
  last_ip?: UserIpRecord | null
}

export interface UserAdminDetail {
  username: string
  display_name: string
  quota: number
  created_at: number
  status: UserAdminStatus
  banned_at: number | null
  deleted_at: number | null
  save_file: UserSaveFileSummary
  last_ip?: UserIpRecord | null
}

export interface UserAdminListResult {
  total: number
  page: number
  pageSize: number
  users: UserAdminSummary[]
}

export interface AdminAuditLogEntry {
  id: string
  operator_role: string
  operator_name: string
  action: string
  target_username: string
  detail: Record<string, unknown>
  created_at: number
}

export interface AdminAuditLogListResult {
  total: number
  page: number
  pageSize: number
  logs: AdminAuditLogEntry[]
}

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const ensureAdminToken = (tokenOverride?: string) => {
  const token = String(tokenOverride || '').trim() || getStoredAdminToken()
  if (!token) throw new Error('请先填写管理员口令')
  return token
}

const withAdminHeaders = (token: string, init?: RequestInit): RequestInit => ({
  credentials: 'include',
  ...init,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Token': token,
    ...(init?.headers || {}),
  },
})

const adminRequest = async <T>(path: string, init?: RequestInit, tokenOverride?: string): Promise<T> => {
  const token = ensureAdminToken(tokenOverride)
  const res = await fetch(path, withAdminHeaders(token, init))
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    if (res.status === 403) throw new Error('管理员口令无效或权限不足')
    throw new Error(data?.msg || '管理员请求失败')
  }
  return data as T
}

export const verifyAdminSession = async (tokenOverride?: string, persistToken = false): Promise<AdminSessionInfo> => {
  const token = ensureAdminToken(tokenOverride)
  try {
    const data = await adminRequest<{ role: AdminRole; role_label: string; permissions: AdminPermissions }>(
      '/api/admin/me',
      undefined,
      token,
    )
    if (!data?.role || !data?.role_label || !data?.permissions || typeof data.permissions !== 'object') {
      throw new Error('当前管理服务返回的管理员信息不完整，请确认已连接最新的 Node 管理服务')
    }

    const permissions = {
      ...emptyAdminPermissions(),
      ...data.permissions,
    }

    if (persistToken) setStoredAdminToken(token)
    return {
      role: data.role,
      role_label: data.role_label,
      permissions,
    }
  } catch (error) {
    if (persistToken || token === getStoredAdminToken()) clearStoredAdminToken()
    throw error
  }
}

export const clearAdminSessionToken = () => {
  clearStoredAdminToken()
}

export const setAdminSessionToken = (token: string) => {
  setStoredAdminToken(token)
}

export const getAdminSessionToken = () => getStoredAdminToken()

export const fetchAdminUsers = async (
  params: { keyword?: string; status?: string; page?: number; pageSize?: number },
  tokenOverride?: string,
): Promise<UserAdminListResult> => {
  const search = new URLSearchParams()
  if (params.keyword) search.set('keyword', params.keyword)
  if (params.status && params.status !== 'all') search.set('status', params.status)
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 20))
  const data = await adminRequest<UserAdminListResult>(`/api/admin/users?${search.toString()}`, undefined, tokenOverride)
  return {
    total: Number(data.total) || 0,
    page: Number(data.page) || 1,
    pageSize: Number((data as UserAdminListResult & { page_size?: number }).pageSize || (data as UserAdminListResult & { page_size?: number }).page_size) || params.pageSize || 20,
    users: Array.isArray(data.users) ? data.users : [],
  }
}

export const fetchAdminUserDetail = async (username: string, tokenOverride?: string): Promise<UserAdminDetail> => {
  const data = await adminRequest<{ user: UserAdminDetail }>(`/api/admin/users/${encodeURIComponent(username)}`, undefined, tokenOverride)
  if (!data.user) throw new Error('用户详情不存在')
  return data.user
}

const normalizeUserIpRecord = (record?: Partial<UserIpRecord> | null): UserIpRecord | null => {
  if (!record) return null
  return {
    username: String(record.username || ''),
    display_name: String(record.display_name || record.username || ''),
    ip_hash: String(record.ip_hash || ''),
    ip_masked: String(record.ip_masked || ''),
    ip_display: String(record.ip_display || record.ip_masked || ''),
    ...(record.ip_address ? { ip_address: String(record.ip_address) } : {}),
    first_seen_at: Number(record.first_seen_at) || 0,
    last_seen_at: Number(record.last_seen_at) || 0,
    source: String(record.source || ''),
    sources: Array.isArray(record.sources)
      ? record.sources.map(item => ({
          source: String(item?.source || ''),
          count: Number(item?.count) || 0,
        })).filter(item => item.source && item.count > 0)
      : [],
    count: Number(record.count) || 0,
    same_user_count: Number(record.same_user_count) || 0,
  }
}

const normalizeUserIpProfile = (profile?: Partial<UserIpProfile> | null): UserIpProfile => ({
  username: String(profile?.username || ''),
  latest_ip: normalizeUserIpRecord(profile?.latest_ip),
  history: Array.isArray(profile?.history)
    ? profile.history.map(item => normalizeUserIpRecord(item)).filter((item): item is UserIpRecord => !!item)
    : [],
  same_ip_users: Array.isArray(profile?.same_ip_users)
    ? profile.same_ip_users.map(item => normalizeUserIpRecord(item)).filter((item): item is UserIpRecord => !!item)
    : [],
  retention_days: Number(profile?.retention_days) || 0,
})

export const fetchAdminUserIpProfile = async (username: string, tokenOverride?: string): Promise<UserIpProfile> => {
  const data = await adminRequest<{ profile?: UserIpProfile }>(
    `/api/admin/users/${encodeURIComponent(username)}/ip-profile`,
    undefined,
    tokenOverride,
  )
  return normalizeUserIpProfile(data.profile)
}

export const lookupAdminUsersByIp = async (ip: string, tokenOverride?: string): Promise<UserIpLookup> => {
  const search = new URLSearchParams()
  search.set('ip', ip)
  const data = await adminRequest<{ lookup?: UserIpLookup }>(`/api/admin/user-ips?${search.toString()}`, undefined, tokenOverride)
  const lookup = (data.lookup || {}) as Partial<UserIpLookup>
  return {
    ip_hash: String(lookup.ip_hash || ''),
    ip_masked: String(lookup.ip_masked || ''),
    ip_display: String(lookup.ip_display || lookup.ip_masked || ''),
    ...(lookup.ip_address ? { ip_address: String(lookup.ip_address) } : {}),
    total: Number(lookup.total) || 0,
    retention_days: Number(lookup.retention_days) || 0,
    users: Array.isArray(lookup.users)
      ? lookup.users.map(item => normalizeUserIpRecord(item)).filter((item): item is UserIpRecord => !!item)
      : [],
  }
}

export const updateAdminUserQuota = async (username: string, quota: number, tokenOverride?: string): Promise<UserAdminDetail> => {
  const data = await adminRequest<{ user: UserAdminDetail }>(
    `/api/admin/users/${encodeURIComponent(username)}/quota`,
    {
      method: 'POST',
      body: JSON.stringify({ quota }),
    },
    tokenOverride,
  )
  if (!data.user) throw new Error('额度更新结果缺失')
  return data.user
}

export const resetAdminUserPassword = async (username: string, newPassword: string, tokenOverride?: string): Promise<void> => {
  await adminRequest(
    `/api/admin/users/${encodeURIComponent(username)}/reset-password`,
    {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    },
    tokenOverride,
  )
}

export const setAdminUserStatus = async (username: string, status: UserAdminStatus, tokenOverride?: string): Promise<UserAdminDetail> => {
  const data = await adminRequest<{ user: UserAdminDetail }>(
    `/api/admin/users/${encodeURIComponent(username)}/status`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
    tokenOverride,
  )
  if (!data.user) throw new Error('状态更新结果缺失')
  return data.user
}

export const deleteAdminUser = async (username: string, tokenOverride?: string): Promise<UserAdminDetail> => {
  const data = await adminRequest<{ user: UserAdminDetail }>(
    `/api/admin/users/${encodeURIComponent(username)}`,
    { method: 'DELETE' },
    tokenOverride,
  )
  if (!data.user) throw new Error('删除结果缺失')
  return data.user
}

export const deleteAdminUsers = async (
  usernames: string[],
  tokenOverride?: string,
): Promise<{ deleted_usernames: string[]; missing_usernames: string[] }> => {
  const data = await adminRequest<{ deleted_usernames?: string[]; missing_usernames?: string[] }>(
    '/api/admin/users/batch-delete',
    {
      method: 'POST',
      body: JSON.stringify({ usernames }),
    },
    tokenOverride,
  )
  return {
    deleted_usernames: Array.isArray(data.deleted_usernames) ? data.deleted_usernames : [],
    missing_usernames: Array.isArray(data.missing_usernames) ? data.missing_usernames : [],
  }
}

export const fetchAdminUserSave = async (username: string, tokenOverride?: string): Promise<UserSaveFileSummary> => {
  const data = await adminRequest<{ save: UserSaveFileSummary }>(`/api/admin/users/${encodeURIComponent(username)}/save`, undefined, tokenOverride)
  if (!data.save) throw new Error('存档信息不存在')
  return data.save
}

export const downloadAdminUserSave = async (username: string, tokenOverride?: string): Promise<void> => {
  const token = ensureAdminToken(tokenOverride)
  const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/save/export`, withAdminHeaders(token))
  const contentType = String(res.headers.get('content-type') || '').toLowerCase()
  if (!res.ok) {
    const data = await parseJsonSafe(res)
    throw new Error(data?.msg || '导出存档失败')
  }
  if (contentType.includes('application/json')) {
    const text = await res.text()
    try {
      const data = JSON.parse(text)
      if (data && typeof data === 'object' && data.ok === false) {
        throw new Error(String(data.msg || '导出存档失败'))
      }
    } catch (error) {
      if (error instanceof Error) throw error
    }
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `${username}.json`
    anchor.click()
    URL.revokeObjectURL(href)
    return
  }
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${username}.json`
  anchor.click()
  URL.revokeObjectURL(href)
}

export const migrateAdminUserSave = async (
  username: string,
  payload: { target_username: string; overwrite: boolean },
  tokenOverride?: string,
): Promise<UserSaveFileSummary> => {
  const data = await adminRequest<{ save: UserSaveFileSummary }>(
    `/api/admin/users/${encodeURIComponent(username)}/save/migrate`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    tokenOverride,
  )
  if (!data.save) throw new Error('迁移结果缺失')
  return data.save
}

export const fetchAdminAuditLogs = async (
  params: {
    username?: string
    action?: string
    operatorName?: string
    outcome?: string
    keyword?: string
    createdFrom?: number
    createdTo?: number
    page?: number
    pageSize?: number
  },
  tokenOverride?: string,
): Promise<AdminAuditLogListResult> => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.action) search.set('action', params.action)
  if (params.operatorName) search.set('operator_name', params.operatorName)
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.keyword) search.set('keyword', params.keyword)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 100))
  const data = await adminRequest<AdminAuditLogListResult>(`/api/admin/audit-logs?${search.toString()}`, undefined, tokenOverride)
  return {
    total: Number(data.total) || 0,
    page: Number(data.page) || 1,
    pageSize: Number((data as AdminAuditLogListResult & { page_size?: number }).pageSize || (data as AdminAuditLogListResult & { page_size?: number }).page_size) || params.pageSize || 100,
    logs: Array.isArray(data.logs) ? data.logs : [],
  }
}
