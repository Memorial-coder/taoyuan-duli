import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import type { Router } from 'vue-router'
import _pkg from '../../package.json'
import { apiFetch } from '@/utils/apiClient'
import type {
  AnnouncementEventType,
  TaoyuanAnnouncement,
  TaoyuanAnnouncementPayload,
} from '@/types/announcement'

const pkg = _pkg as typeof _pkg & { version?: string }

export const getAnnouncementClientVersion = (): string => String(pkg.version || '3.0.0').trim() || '3.0.0'

export const getAnnouncementClientChannel = (): string => {
  try {
    return Capacitor.getPlatform() || 'web'
  } catch {
    return 'web'
  }
}

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await apiFetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) throw new Error(data?.msg || '公告请求失败')
  return data as T
}

export const normalizeAnnouncement = (raw: Partial<TaoyuanAnnouncement> = {}): TaoyuanAnnouncement => ({
  id: String(raw.id || ''),
  title: String(raw.title || ''),
  body: String(raw.body || ''),
  image_url: String(raw.image_url || ''),
  version: String(raw.version || ''),
  target_versions: Array.isArray(raw.target_versions) ? raw.target_versions.map(item => String(item)).filter(Boolean) : [],
  target_channels: Array.isArray(raw.target_channels) ? raw.target_channels.map(item => String(item)).filter(Boolean) : [],
  start_at: raw.start_at === null || raw.start_at === undefined ? null : Number(raw.start_at) || null,
  end_at: raw.end_at === null || raw.end_at === undefined ? null : Number(raw.end_at) || null,
  priority: Number(raw.priority) || 0,
  status: raw.status === 'draft' || raw.status === 'offline' || raw.status === 'published' ? raw.status : 'draft',
  cta_text: String(raw.cta_text || ''),
  cta_url: String(raw.cta_url || ''),
  button_texts: {
    close: String(raw.button_texts?.close || '知道了'),
    suppress: String(raw.button_texts?.suppress || '本条不再提示'),
    cta: String(raw.button_texts?.cta || raw.cta_text || '查看详情'),
  },
  template_type: String(raw.template_type || ''),
  created_at: Number(raw.created_at) || 0,
  updated_at: Number(raw.updated_at) || 0,
  published_at: raw.published_at === null || raw.published_at === undefined ? null : Number(raw.published_at) || null,
  offline_at: raw.offline_at === null || raw.offline_at === undefined ? null : Number(raw.offline_at) || null,
  operator_name: String(raw.operator_name || ''),
  operator_role: String(raw.operator_role || ''),
})

export const normalizeAnnouncementPayload = (payload: TaoyuanAnnouncementPayload): TaoyuanAnnouncementPayload => ({
  ...payload,
  title: String(payload.title || '').trim(),
  body: String(payload.body || '').trim(),
  image_url: String(payload.image_url || '').trim(),
  version: String(payload.version || '').trim(),
  target_versions: Array.isArray(payload.target_versions) ? payload.target_versions.map(item => String(item).trim()).filter(Boolean) : [],
  target_channels: Array.isArray(payload.target_channels) ? payload.target_channels.map(item => String(item).trim()).filter(Boolean) : [],
  start_at: payload.start_at === null || payload.start_at === undefined ? null : Number(payload.start_at) || null,
  end_at: payload.end_at === null || payload.end_at === undefined ? null : Number(payload.end_at) || null,
  priority: Math.max(0, Math.min(999, Number(payload.priority) || 0)),
  cta_text: String(payload.cta_text || '').trim(),
  cta_url: String(payload.cta_url || '').trim(),
  button_texts: {
    close: String(payload.button_texts?.close || '知道了').trim() || '知道了',
    suppress: String(payload.button_texts?.suppress || '本条不再提示').trim() || '本条不再提示',
    cta: String(payload.button_texts?.cta || '查看详情').trim() || '查看详情',
  },
  template_type: String(payload.template_type || '').trim(),
})

const buildAnnouncementSearch = (params: { version?: string; channel?: string; limit?: number } = {}) => {
  const search = new URLSearchParams()
  search.set('version', params.version || getAnnouncementClientVersion())
  search.set('channel', params.channel || getAnnouncementClientChannel())
  if (params.limit) search.set('limit', String(params.limit))
  return search.toString()
}

export const fetchActiveAnnouncements = async (params: { version?: string; channel?: string } = {}) => {
  const data = await requestJson<{ announcements?: Partial<TaoyuanAnnouncement>[] }>(
    `/api/taoyuan/announcements/active?${buildAnnouncementSearch(params)}`,
  )
  return (Array.isArray(data.announcements) ? data.announcements : []).map(normalizeAnnouncement)
}

export const fetchAnnouncementHistory = async (params: { version?: string; channel?: string; limit?: number } = {}) => {
  const data = await requestJson<{ announcements?: Partial<TaoyuanAnnouncement>[] }>(
    `/api/taoyuan/announcements/history?${buildAnnouncementSearch({ ...params, limit: params.limit || 80 })}`,
  )
  return (Array.isArray(data.announcements) ? data.announcements : []).map(normalizeAnnouncement)
}

export const recordAnnouncementEvent = async (
  announcementId: string,
  eventType: AnnouncementEventType,
  detail: Record<string, unknown> = {},
) => {
  const data = await requestJson<{ recorded: boolean }>(
    `/api/taoyuan/announcements/${encodeURIComponent(announcementId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventType,
        client_version: getAnnouncementClientVersion(),
        client_channel: getAnnouncementClientChannel(),
        detail,
      }),
    },
  )
  return Boolean(data.recorded)
}

export const openAnnouncementTarget = async (url: string, router: Router) => {
  const target = String(url || '').trim()
  if (!target) return
  if (target.startsWith('/') && !target.startsWith('//')) {
    await router.push(target)
    return
  }
  if (!/^https?:\/\//i.test(target)) return
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: target })
    return
  }
  window.open(target, '_blank', 'noopener,noreferrer')
}
