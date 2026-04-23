import { clearStoredAdminToken, getStoredAdminToken, setStoredAdminToken } from '@/utils/taoyuanMailboxAdminApi'
import type { OfficialManagedConfigKey, OfficialManagedConfigStatus } from '@/types'
import type { AndroidAppReleaseConfig } from '@/types/androidRelease'
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
}

export interface AdminAndroidReleaseConfigResult {
  config: AndroidAppReleaseConfig
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
  params: { contentKey?: string; page?: number; pageSize?: number },
  tokenOverride?: string,
): Promise<ContentRevisionListResult> => {
  const search = new URLSearchParams()
  if (params.contentKey) search.set('content_key', params.contentKey)
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

export const fetchGameplayLogs = async (
  params: { username?: string; category?: string; keyword?: string; saveSlot?: number | null; page?: number; pageSize?: number },
  tokenOverride?: string,
): Promise<GameplayLogListResult> => {
  const search = new URLSearchParams()
  if (params.username) search.set('username', params.username)
  if (params.category) search.set('category', params.category)
  if (params.keyword) search.set('keyword', params.keyword)
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
