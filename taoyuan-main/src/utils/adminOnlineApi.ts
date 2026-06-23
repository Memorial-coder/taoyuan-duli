import type {
  AdminContentModerationEvent,
  AdminContentModerationRulesMetadata,
  AdminContentRiskSignal,
  AdminOnlineOverviewPayload,
  OnlineReleaseConfig,
} from '@/types'
import { parseJsonSafe } from '@/utils/protectedApi'
import { getStoredAdminToken } from '@/utils/taoyuanMailboxAdminApi'

const ensureAdminToken = () => {
  const token = String(getStoredAdminToken() || '').trim()
  if (!token) throw new Error('请先填写管理员口令')
  return token
}

const adminRequest = async <T = any>(path: string, init?: RequestInit): Promise<T> => {
  const token = ensureAdminToken()
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      ...(init?.headers || {}),
    },
  })
  const data = await parseJsonSafe<T & { ok?: boolean; msg?: string }>(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '管理员请求失败')
  }
  return data as T
}

export const fetchAdminOnlineOverview = async (): Promise<AdminOnlineOverviewPayload> => {
  const data = await adminRequest<{ overview: AdminOnlineOverviewPayload }>('/api/admin/taoyuan/overview')
  return data.overview
}

export const fetchAdminOnlinePlayers = async () => {
  return adminRequest<{ users: Array<Record<string, any>>; total: number; page: number; pageSize?: number; page_size?: number }>(
    '/api/admin/taoyuan/players?page=1&page_size=20',
  )
}

export const fetchAdminOnlineSocieties = async () => {
  return adminRequest<{ societies: Array<Record<string, any>> }>('/api/admin/taoyuan/societies')
}

export const fetchAdminOnlineManors = async () => {
  return adminRequest<{ hot_manors: Array<Record<string, any>>; favorites: Record<string, any> }>('/api/admin/taoyuan/manors?limit=10')
}

export const fetchAdminOnlineOrders = async () => {
  return adminRequest<{ overview: Record<string, any> }>('/api/admin/taoyuan/orders')
}

export const fetchAdminOnlineFestival = async (domain = '') => {
  const search = domain ? `?domain=${encodeURIComponent(domain)}` : ''
  return adminRequest<{ rooms: Record<string, any> }>(`/api/admin/taoyuan/festival${search}`)
}

export const fetchAdminOnlineHallOverview = async () => {
  return adminRequest<{
    posts: Array<Record<string, any>>
    reports: Array<Record<string, any>>
    image_reports: Array<Record<string, any>>
    blacklist: Array<Record<string, any>>
    moderation_events: AdminContentModerationEvent[]
    risk_signals: AdminContentRiskSignal[]
  }>('/api/admin/taoyuan/hall/overview')
}

export const fetchAdminContentModerationEvents = async (params: {
  username?: string
  scene?: string
  action?: string
  outcome?: string
  createdFrom?: number
  createdTo?: number
  page?: number
  pageSize?: number
} = {}) => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.scene) search.set('scene', params.scene)
  if (params.action) search.set('action', params.action)
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 80))
  return adminRequest<{
    events: AdminContentModerationEvent[]
    total: number
    page: number
    pageSize?: number
    page_size?: number
  }>(`/api/admin/taoyuan/content-moderation/events?${search.toString()}`)
}

export const fetchAdminContentRiskSignals = async (params: {
  username?: string
  signalType?: string
  scene?: string
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed' | 'all'
  createdFrom?: number
  createdTo?: number
  page?: number
  pageSize?: number
} = {}) => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.signalType) search.set('signal_type', params.signalType)
  if (params.scene) search.set('scene', params.scene)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  search.set('status', params.status || 'all')
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 80))
  return adminRequest<{
    signals: AdminContentRiskSignal[]
    total: number
    page: number
    pageSize?: number
    page_size?: number
  }>(`/api/admin/taoyuan/content-moderation/risk-signals?${search.toString()}`)
}

export const updateAdminContentRiskSignalStatus = async (
  signalId: string,
  status: AdminContentRiskSignal['status'],
  reason = '',
  options: { adminNote?: string } = {},
) => {
  return adminRequest<{ signal: AdminContentRiskSignal }>(
    `/api/admin/taoyuan/content-moderation/risk-signals/${encodeURIComponent(signalId)}/status`,
    {
      method: 'POST',
      body: JSON.stringify({
        status,
        reason,
        admin_note: options.adminNote || '',
      }),
    },
  )
}

export const fetchAdminContentModerationRulesMetadata = async () => {
  const data = await adminRequest<{ rules: AdminContentModerationRulesMetadata }>('/api/admin/taoyuan/content-moderation/rules')
  return data.rules
}

export const fetchAdminOnlineAuditLogs = async () => {
  return adminRequest<{ logs: Array<Record<string, any>>; total: number; page: number; pageSize?: number; page_size?: number }>(
    '/api/admin/taoyuan/audit-logs?page=1&page_size=80',
  )
}

export const fetchAdminOnlineAuditLogPage = async (params: {
  username?: string
  routeKey?: string
  action?: string
  outcome?: string
  createdFrom?: number
  createdTo?: number
  page?: number
  pageSize?: number
} = {}) => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.routeKey) search.set('route_key', params.routeKey)
  if (params.action) search.set('action', params.action)
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 80))
  return adminRequest<{
    logs: Array<Record<string, any>>
    total: number
    page: number
    pageSize?: number
    page_size?: number
    retention_days?: number
  }>(`/api/admin/taoyuan/audit-logs?${search.toString()}`)
}

export const fetchAdminGovernanceAuditLogs = async (params: {
  username?: string
  action?: string
  outcome?: string
  createdFrom?: number
  createdTo?: number
  page?: number
  pageSize?: number
} = {}) => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.action) search.set('action', params.action)
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 80))
  return adminRequest<{ logs: Array<Record<string, any>>; total: number; page: number; pageSize?: number; page_size?: number }>(
    `/api/admin/audit-logs?${search.toString()}`,
  )
}

export const retryAdminCoopCompensation = async (compensationId: string) => {
  return adminRequest(`/api/admin/taoyuan/orders/compensations/${encodeURIComponent(compensationId)}/retry`, {
    method: 'POST',
  })
}

export const rollbackAdminCoopOrder = async (orderId: string) => {
  return adminRequest(`/api/admin/taoyuan/orders/${encodeURIComponent(orderId)}/rollback`, {
    method: 'POST',
  })
}

export const retryAdminActivitySettlement = async (roomId: string) => {
  return adminRequest(`/api/admin/taoyuan/festival/rooms/${encodeURIComponent(roomId)}/retry-close`, {
    method: 'POST',
  })
}

export const banAdminOnlineUser = async (
  username: string,
  options: { reason?: string; adminNote?: string } = {},
) => {
  return adminRequest<{ user: Record<string, any> }>(`/api/admin/users/${encodeURIComponent(username)}/status`, {
    method: 'POST',
    body: JSON.stringify({
      status: 'banned',
      reason: options.reason || '',
      admin_note: options.adminNote || '',
    }),
  })
}

export const unbanAdminOnlineUser = async (
  username: string,
  options: { reason?: string; adminNote?: string } = {},
) => {
  return adminRequest<{ user: Record<string, any> }>(`/api/admin/taoyuan/users/${encodeURIComponent(username)}/unban`, {
    method: 'POST',
    body: JSON.stringify({
      reason: options.reason || '',
      admin_note: options.adminNote || '',
    }),
  })
}

export const fetchAdminOnlineReleaseConfig = async (): Promise<OnlineReleaseConfig> => {
  const data = await adminRequest<{ config: OnlineReleaseConfig }>('/api/admin/taoyuan/online-release-config')
  return data.config
}

export const saveAdminOnlineReleaseConfig = async (payload: OnlineReleaseConfig): Promise<OnlineReleaseConfig> => {
  const data = await adminRequest<{ config: OnlineReleaseConfig }>('/api/admin/taoyuan/online-release-config', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.config
}
