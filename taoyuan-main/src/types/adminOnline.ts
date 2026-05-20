export interface AdminOnlineOverviewSummary {
  active_room_count: number
  pending_activity_receipt_count: number
  pending_coop_compensation_count: number
  visible_society_count: number
  pending_hall_report_count: number
  pending_image_report_count: number
  image_blacklist_count: number
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
  }
  audit: {
    online_logs: Array<Record<string, any>>
  }
}
