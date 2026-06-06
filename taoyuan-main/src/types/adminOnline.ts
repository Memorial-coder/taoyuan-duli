export interface AdminOnlineOverviewSummary {
  active_room_count: number
  pending_activity_receipt_count: number
  pending_coop_compensation_count: number
  visible_society_count: number
  pending_hall_report_count: number
  pending_image_report_count: number
  image_blacklist_count: number
  content_moderation_event_count?: number
  content_risk_signal_count?: number
  online_audit_count: number
}

export interface AdminOnlinePlayerSummary {
  username: string
  display_name: string
  created_at: number
  status: string
  save_file: {
    exists: boolean
    file_name: string
    file_size: number
    updated_at: number | null
    slot_count: number
  }
}

export interface AdminOnlineOverviewPayload {
  summary: AdminOnlineOverviewSummary
  recent_players: AdminOnlinePlayerSummary[]
  coop: {
    orders: Array<Record<string, any>>
    receipts: Array<Record<string, any>>
    compensations: Array<Record<string, any>>
  }
  activities: {
    rooms: Array<Record<string, any>>
    pending_receipts: Array<Record<string, any>>
  }
  societies: Array<Record<string, any>>
  manor: {
    hot_manors: Array<Record<string, any>>
  }
  hall: {
    reports: Array<Record<string, any>>
    image_reports: Array<Record<string, any>>
    recent_posts: Array<Record<string, any>>
    image_blacklist: Array<Record<string, any>>
    moderation_events?: AdminContentModerationEvent[]
    risk_signals?: AdminContentRiskSignal[]
  }
  audit: {
    online_logs: Array<Record<string, any>>
  }
}

export interface AdminContentModerationEvent {
  id: string
  request_id: string
  scene: string
  field: string
  username: string
  content_type: string
  content_id: string
  action: string
  severity: string
  matched_category: string
  matched_term_hash: string
  rule_version: string
  content_hash: string
  content_excerpt: string
  outcome: string
  created_at: number
}

export interface AdminContentRiskSignal {
  id: string
  signal_type: string
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  username: string
  target_type: string
  target_id: string
  content_type: string
  content_id: string
  request_id: string
  scene: string
  reason_code: string
  outcome: string
  risk_score: number
  event_count: number
  report_count: number
  reporter_count: number
  event_ids: string[]
  report_ids: string[]
  request_ids: string[]
  matched_categories: string[]
  rule_versions: string[]
  content_hashes: string[]
  image_hash_prefix: string
  ip_hash: string
  usernames: string[]
  route_keys: string[]
  created_at: number
  updated_at: number
}

export interface AdminContentModerationRulesMetadata {
  version: string
  updated_at: number
  source: string
  hard_block_category_count: number
  hard_block_term_count: number
  soft_block_category_count: number
  soft_block_term_count: number
  hard_block_categories: Array<{ category: string; term_count: number }>
  soft_block_categories: Array<{ category: string; term_count: number }>
  scene_policy: Record<string, string>
}
