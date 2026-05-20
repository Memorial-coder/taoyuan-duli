import type { AdminOnlineOverviewPayload } from '@/types'
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
  }>('/api/admin/taoyuan/hall/overview')
}

export const fetchAdminOnlineAuditLogs = async () => {
  return adminRequest<{ logs: Array<Record<string, any>>; total: number; page: number; pageSize?: number; page_size?: number }>(
    '/api/admin/taoyuan/audit-logs?page=1&page_size=80',
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

export const unbanAdminOnlineUser = async (username: string) => {
  return adminRequest<{ user: Record<string, any> }>(`/api/admin/taoyuan/users/${encodeURIComponent(username)}/unban`, {
    method: 'POST',
  })
}
