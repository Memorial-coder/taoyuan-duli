export type AnnouncementStatus = 'draft' | 'published' | 'offline'
export type AnnouncementEventType = 'impression' | 'close' | 'suppress' | 'cta_click'

export interface AnnouncementButtonTexts {
  close: string
  suppress: string
  cta: string
}

export interface TaoyuanAnnouncement {
  id: string
  title: string
  body: string
  image_url: string
  version: string
  target_versions: string[]
  target_channels: string[]
  start_at: number | null
  end_at: number | null
  priority: number
  status: AnnouncementStatus
  cta_text: string
  cta_url: string
  button_texts: AnnouncementButtonTexts
  template_type: string
  created_at: number
  updated_at?: number
  published_at: number | null
  offline_at?: number | null
  operator_name?: string
  operator_role?: string
}

export interface TaoyuanAnnouncementTemplate {
  id: string
  label: string
  title: string
  body: string
  template_type: string
}

export interface TaoyuanAnnouncementPayload {
  id?: string
  title: string
  body: string
  image_url: string
  version: string
  target_versions: string[]
  target_channels: string[]
  start_at: number | null
  end_at: number | null
  priority: number
  cta_text: string
  cta_url: string
  button_texts: AnnouncementButtonTexts
  template_type: string
}

export interface TaoyuanAnnouncementStats {
  impression_count: number
  close_count: number
  suppress_count: number
  cta_click_count: number
  read_count: number
  exposed_user_count: number
  event_count: number
}

export interface TaoyuanAnnouncementEvent {
  id: string
  announcement_id: string
  username: string
  event_type: AnnouncementEventType
  client_version: string
  client_channel: string
  detail: Record<string, unknown>
  created_at: number
}

export interface TaoyuanAnnouncementAuditLog {
  id: string
  action: string
  operator_name: string
  operator_role: string
  actor_username: string
  actor_role: string
  target_id: string
  created_at: number
  detail: Record<string, unknown>
}
