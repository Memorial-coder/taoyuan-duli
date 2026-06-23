import { clearStoredAdminToken, getStoredAdminToken, setStoredAdminToken } from '@/utils/taoyuanMailboxAdminApi'
import type { OfficialManagedConfigKey, OfficialManagedConfigStatus } from '@/types'
import type { AndroidAppReleaseConfig } from '@/types/androidRelease'
import type {
  TaoyuanAnnouncement,
  TaoyuanAnnouncementAuditLog,
  TaoyuanAnnouncementEvent,
  TaoyuanAnnouncementPayload,
  TaoyuanAnnouncementStats,
  TaoyuanAnnouncementTemplate,
} from '@/types/announcement'
import { normalizeAnnouncement, normalizeAnnouncementPayload } from '@/utils/announcementApi'
import { createDefaultAndroidAppReleaseConfig, normalizeAndroidAppReleaseConfig } from '@/utils/androidRelease'

export interface HomepageAboutContentPayload {
  aboutButtonEnabled: boolean
  aboutButtonText: string
  aboutDialogTitle: string
  aboutDialogContent: string
}

export interface ContentRevisionEntry {
  id: string
  content_key: string
  title: string
  summary: string
  action: string
  published: boolean
  operator_role: string
  operator_name: string
  payload: HomepageAboutContentPayload
  created_at: number
}

export interface ContentRevisionListResult {
  total: number
  page: number
  pageSize: number
  revisions: ContentRevisionEntry[]
}

export interface HomepageAboutContentResult {
  content: HomepageAboutContentPayload
  revisions: ContentRevisionListResult
  officialManagedStatus?: OfficialManagedConfigStatus
  readonlyManagedFields: OfficialManagedConfigKey[]
}

export interface GameplayLogEntry {
  id: string
  username: string
  day_label: string
  category: string
  message: string
  route_name: string
  tags: string[]
  meta: Record<string, unknown>
  save_slot?: number | null
  created_at: number
}

export interface GameplayLogListResult {
  total: number
  page: number
  pageSize: number
  logs: GameplayLogEntry[]
  retention?: {
    retention_days: number
    max_total: number
    max_per_user_slot: number
  }
}

export interface AdminLogSourceOverview {
  label: string
  total: number
  latest_created_at: number
  retention_days?: number | null
  retention_label?: string
  max_total?: number
  max_per_user_slot?: number
  risk_signal_total?: number
  preserves_major_evidence?: boolean
  visible?: boolean
}

export interface AdminLogCenterOverviewResult {
  sources: Record<
    'admin_audit' | 'online_audit' | 'content_moderation' | 'gameplay' | 'content_revision',
    AdminLogSourceOverview
  >
}

export interface AdminAndroidReleaseConfigResult {
  config: AndroidAppReleaseConfig
}

export interface AdminAnnouncementListResult {
  announcements: TaoyuanAnnouncement[]
  templates: TaoyuanAnnouncementTemplate[]
}

export interface AdminAnnouncementStatsResult {
  announcement: TaoyuanAnnouncement
  stats: TaoyuanAnnouncementStats
  recent_events: TaoyuanAnnouncementEvent[]
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

const adminRequest = async <T>(path: string, init?: RequestInit, tokenOverride?: string): Promise<T> => {
  const token = ensureAdminToken(tokenOverride)
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      ...(init?.headers || {}),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    if (res.status === 403) throw new Error('管理员口令无效或权限不足')
    throw new Error(data?.msg || '管理员请求失败')
  }
  return data as T
}

export const setAdminContentToken = (token: string) => setStoredAdminToken(token)
export const getAdminContentToken = () => getStoredAdminToken()
export const clearAdminContentToken = () => clearStoredAdminToken()

export const fetchHomepageAboutContent = async (tokenOverride?: string): Promise<HomepageAboutContentResult> => {
  const data = await adminRequest<{
    content: HomepageAboutContentPayload
    revisions: ContentRevisionListResult & { page_size?: number }
    officialManagedStatus?: OfficialManagedConfigStatus
    readonlyManagedFields?: OfficialManagedConfigKey[]
  }>('/api/admin/content/homepage-about?page_size=40', undefined, tokenOverride)
  return {
    content: {
      aboutButtonEnabled: data.content?.aboutButtonEnabled !== false,
      aboutButtonText: data.content?.aboutButtonText || '关于游戏',
      aboutDialogTitle: data.content?.aboutDialogTitle || '关于桃源乡',
      aboutDialogContent: data.content?.aboutDialogContent || '',
    },
    revisions: {
      total: Number(data.revisions?.total) || 0,
      page: Number(data.revisions?.page) || 1,
      pageSize: Number(data.revisions?.pageSize || data.revisions?.page_size) || 40,
      revisions: Array.isArray(data.revisions?.revisions) ? data.revisions.revisions : [],
    },
    officialManagedStatus: data.officialManagedStatus,
    readonlyManagedFields: Array.isArray(data.readonlyManagedFields) ? data.readonlyManagedFields : [],
  }
}

export const saveHomepageAboutContent = async (
  payload: HomepageAboutContentPayload & { action: 'draft' | 'publish'; summary?: string },
  tokenOverride?: string,
) => {
  return adminRequest<{
    action: string
    content: HomepageAboutContentPayload
    revision: ContentRevisionEntry
  }>(
    '/api/admin/content/homepage-about',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    tokenOverride,
  )
}

export const restoreHomepageAboutRevision = async (revisionId: string, tokenOverride?: string) => {
  return adminRequest<{
    content: HomepageAboutContentPayload
    revision: ContentRevisionEntry
    restored_from: string
  }>(`/api/admin/content/homepage-about/restore/${encodeURIComponent(revisionId)}`, { method: 'POST' }, tokenOverride)
}

export const fetchContentRevisions = async (
  params: {
    contentKey?: string
    action?: string
    operatorName?: string
    keyword?: string
    createdFrom?: number
    createdTo?: number
    page?: number
    pageSize?: number
  },
  tokenOverride?: string,
): Promise<ContentRevisionListResult> => {
  const search = new URLSearchParams()
  if (params.contentKey) search.set('content_key', params.contentKey)
  if (params.action) search.set('action', params.action)
  if (params.operatorName) search.set('operator_name', params.operatorName)
  if (params.keyword) search.set('keyword', params.keyword)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 40))
  const data = await adminRequest<ContentRevisionListResult & { page_size?: number }>(`/api/admin/content/revisions?${search.toString()}`, undefined, tokenOverride)
  return {
    total: Number(data.total) || 0,
    page: Number(data.page) || 1,
    pageSize: Number(data.pageSize || data.page_size) || params.pageSize || 40,
    revisions: Array.isArray(data.revisions) ? data.revisions : [],
  }
}

const readFileAsDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export const uploadAdminContentImage = async (file: File, tokenOverride?: string) => {
  const dataUrl = await readFileAsDataUrl(file)
  return adminRequest<{ url: string; alt: string }>(
    '/api/admin/content/upload-image',
    {
      method: 'POST',
      body: JSON.stringify({
        data_url: dataUrl,
        filename: file.name,
      }),
    },
    tokenOverride,
  )
}

export const fetchAdminLogCenterOverview = async (tokenOverride?: string): Promise<AdminLogCenterOverviewResult> => {
  const data = await adminRequest<AdminLogCenterOverviewResult>('/api/admin/log-center/overview', undefined, tokenOverride)
  const normalizeSource = (source: Partial<AdminLogSourceOverview> | undefined): AdminLogSourceOverview => ({
    label: String(source?.label || ''),
    total: Number(source?.total) || 0,
    latest_created_at: Number(source?.latest_created_at) || 0,
    retention_days: source?.retention_days === null ? null : Number(source?.retention_days) || 0,
    retention_label: source?.retention_label ? String(source.retention_label) : '',
    max_total: Number(source?.max_total) || 0,
    max_per_user_slot: Number(source?.max_per_user_slot) || 0,
    risk_signal_total: Number(source?.risk_signal_total) || 0,
    preserves_major_evidence: source?.preserves_major_evidence === true,
    visible: source?.visible !== false,
  })
  return {
    sources: {
      admin_audit: normalizeSource(data.sources?.admin_audit),
      online_audit: normalizeSource(data.sources?.online_audit),
      content_moderation: normalizeSource(data.sources?.content_moderation),
      gameplay: normalizeSource(data.sources?.gameplay),
      content_revision: normalizeSource(data.sources?.content_revision),
    },
  }
}

export const fetchAdminAnnouncements = async (tokenOverride?: string): Promise<AdminAnnouncementListResult> => {
  const data = await adminRequest<{
    announcements?: Partial<TaoyuanAnnouncement>[]
    templates?: TaoyuanAnnouncementTemplate[]
  }>('/api/admin/taoyuan/announcements', undefined, tokenOverride)
  return {
    announcements: (Array.isArray(data.announcements) ? data.announcements : []).map(normalizeAnnouncement),
    templates: Array.isArray(data.templates) ? data.templates : [],
  }
}

export const createAdminAnnouncement = async (payload: TaoyuanAnnouncementPayload, tokenOverride?: string) => {
  const data = await adminRequest<{ announcement?: Partial<TaoyuanAnnouncement> }>(
    '/api/admin/taoyuan/announcements',
    {
      method: 'POST',
      body: JSON.stringify(normalizeAnnouncementPayload(payload)),
    },
    tokenOverride,
  )
  return normalizeAnnouncement(data.announcement || {})
}

export const updateAdminAnnouncement = async (id: string, payload: TaoyuanAnnouncementPayload, tokenOverride?: string) => {
  const data = await adminRequest<{ announcement?: Partial<TaoyuanAnnouncement> }>(
    `/api/admin/taoyuan/announcements/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(normalizeAnnouncementPayload(payload)),
    },
    tokenOverride,
  )
  return normalizeAnnouncement(data.announcement || {})
}

export const publishAdminAnnouncement = async (id: string, tokenOverride?: string) => {
  const data = await adminRequest<{ announcement?: Partial<TaoyuanAnnouncement>; realtime_emitted?: number }>(
    `/api/admin/taoyuan/announcements/${encodeURIComponent(id)}/publish`,
    { method: 'POST' },
    tokenOverride,
  )
  return {
    announcement: normalizeAnnouncement(data.announcement || {}),
    realtimeEmitted: Number(data.realtime_emitted) || 0,
  }
}

export const offlineAdminAnnouncement = async (id: string, tokenOverride?: string) => {
  const data = await adminRequest<{ announcement?: Partial<TaoyuanAnnouncement>; realtime_emitted?: number }>(
    `/api/admin/taoyuan/announcements/${encodeURIComponent(id)}/offline`,
    { method: 'POST' },
    tokenOverride,
  )
  return {
    announcement: normalizeAnnouncement(data.announcement || {}),
    realtimeEmitted: Number(data.realtime_emitted) || 0,
  }
}

export const deleteAdminAnnouncement = async (id: string, tokenOverride?: string) => {
  const data = await adminRequest<{
    announcement?: Partial<TaoyuanAnnouncement>
    deleted_event_count?: number
    realtime_emitted?: number
  }>(
    `/api/admin/taoyuan/announcements/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    tokenOverride,
  )
  return {
    announcement: normalizeAnnouncement(data.announcement || {}),
    deletedEventCount: Number(data.deleted_event_count) || 0,
    realtimeEmitted: Number(data.realtime_emitted) || 0,
  }
}

export const fetchAdminAnnouncementStats = async (id: string, tokenOverride?: string): Promise<AdminAnnouncementStatsResult> => {
  const data = await adminRequest<{
    announcement?: Partial<TaoyuanAnnouncement>
    stats?: Partial<TaoyuanAnnouncementStats>
    recent_events?: TaoyuanAnnouncementEvent[]
  }>(`/api/admin/taoyuan/announcements/${encodeURIComponent(id)}/stats`, undefined, tokenOverride)
  return {
    announcement: normalizeAnnouncement(data.announcement || {}),
    stats: {
      impression_count: Number(data.stats?.impression_count) || 0,
      close_count: Number(data.stats?.close_count) || 0,
      suppress_count: Number(data.stats?.suppress_count) || 0,
      cta_click_count: Number(data.stats?.cta_click_count) || 0,
      reward_claim_count: Number(data.stats?.reward_claim_count) || 0,
      read_count: Number(data.stats?.read_count) || 0,
      exposed_user_count: Number(data.stats?.exposed_user_count) || 0,
      event_count: Number(data.stats?.event_count) || 0,
    },
    recent_events: Array.isArray(data.recent_events) ? data.recent_events : [],
  }
}

export const fetchAdminAnnouncementAuditLogs = async (id: string, tokenOverride?: string): Promise<TaoyuanAnnouncementAuditLog[]> => {
  const data = await adminRequest<{ logs?: TaoyuanAnnouncementAuditLog[] }>(
    `/api/admin/taoyuan/announcements/${encodeURIComponent(id)}/audit-logs`,
    undefined,
    tokenOverride,
  )
  return Array.isArray(data.logs) ? data.logs : []
}

export const fetchGameplayLogs = async (
  params: {
    username?: string
    category?: string
    keyword?: string
    action?: string
    outcome?: string
    createdFrom?: number
    createdTo?: number
    saveSlot?: number | null
    page?: number
    pageSize?: number
  },
  tokenOverride?: string,
): Promise<GameplayLogListResult> => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.category) search.set('category', params.category)
  if (params.keyword) search.set('keyword', params.keyword)
  if (params.action) search.set('action', params.action)
  if (params.outcome) search.set('outcome', params.outcome)
  if (params.createdFrom) search.set('created_from', String(params.createdFrom))
  if (params.createdTo) search.set('created_to', String(params.createdTo))
  if (params.saveSlot !== null && params.saveSlot !== undefined && Number.isInteger(params.saveSlot) && params.saveSlot >= 0) {
    search.set('save_slot', String(params.saveSlot))
  }
  search.set('page', String(params.page || 1))
  search.set('page_size', String(params.pageSize || 50))
  const data = await adminRequest<GameplayLogListResult & { page_size?: number }>(`/api/admin/gameplay-logs?${search.toString()}`, undefined, tokenOverride)
  return {
    total: Number(data.total) || 0,
    page: Number(data.page) || 1,
    pageSize: Number(data.pageSize || data.page_size) || params.pageSize || 50,
    logs: Array.isArray(data.logs) ? data.logs : [],
    retention: data.retention,
  }
}

export const fetchAdminAndroidReleaseConfig = async (tokenOverride?: string): Promise<AdminAndroidReleaseConfigResult> => {
  const data = await adminRequest<{ config?: AndroidAppReleaseConfig }>('/api/admin/taoyuan/android/release-config', undefined, tokenOverride)
  return {
    config: normalizeAndroidAppReleaseConfig(data?.config ?? createDefaultAndroidAppReleaseConfig()),
  }
}

export const saveAdminAndroidReleaseConfig = async (
  payload: AndroidAppReleaseConfig,
  tokenOverride?: string,
): Promise<AdminAndroidReleaseConfigResult> => {
  const data = await adminRequest<{ config?: AndroidAppReleaseConfig }>(
    '/api/admin/taoyuan/android/release-config',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    tokenOverride,
  )
  return {
    config: normalizeAndroidAppReleaseConfig(data?.config ?? payload),
  }
}
