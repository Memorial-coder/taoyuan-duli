export type HallPostType = 'discussion' | 'help'
export type HallCategory = 'all' | 'discussion' | 'help' | 'solved'
export type HallMineFilter = 'all' | 'posts' | 'replies' | 'help'
export type HallSort = 'latest' | 'hot' | 'reward'
export type HallRewardStatus = 'none' | 'open' | 'closed' | 'paid'

export interface HallViewer {
  loggedIn: boolean
  username: string | null
  displayName: string | null
  isAdmin?: boolean
}

export interface HallReply {
  id: string
  content: string
  author: string
  author_display_name: string
  created_at: number
  is_mine: boolean
  is_best?: boolean
  reply_to_id?: string | null
  reply_to_author_display_name?: string | null
  reply_to_excerpt?: string | null
  image_url?: string | null
  image_alt?: string | null
  like_count?: number
  viewer_liked?: boolean
}

export interface HallTextBlock {
  id: string
  type: 'text'
  text: string
}

export interface HallImageBlock {
  id: string
  type: 'image'
  url: string
  alt: string
  width?: number | null
  height?: number | null
}

export type HallContentBlock = HallTextBlock | HallImageBlock

export interface HallPostSummary {
  id: string
  title: string
  preview: string
  type: HallPostType
  solved: boolean
  reward_enabled: boolean
  reward_amount: number
  reward_status: HallRewardStatus
  author: string
  author_display_name: string
  created_at: number
  updated_at: number
  last_activity_at: number
  reply_count: number
  is_mine: boolean
  like_count?: number
  dislike_count?: number
  viewer_liked?: boolean
  viewer_disliked?: boolean
  pinned?: boolean
  featured?: boolean
}

export interface HallPostDetail extends HallPostSummary {
  content?: string
  blocks: HallContentBlock[]
  replies: HallReply[]
  best_reply_id?: string | null
  reward_paid_to?: string | null
  reward_paid_at?: number | null
  viewer_can_reply: boolean
  viewer_is_author: boolean
  viewer_can_solve: boolean
  viewer_can_delete?: boolean
  viewer_can_pick_best?: boolean
}

export interface HallReportResult {
  id: string
  status: 'pending' | 'dismissed' | 'resolved'
}

export interface HallAdminReport {
  id: string
  type: 'post' | 'reply'
  post_id: string
  reply_id?: string | null
  reason: string
  reporter: string
  reporter_display_name: string
  target_author?: string | null
  target_author_display_name?: string | null
  status: 'pending' | 'dismissed' | 'resolved'
  created_at: number
  resolved_at?: number | null
}

export interface HallBannedUser {
  username: string
  display_name: string
  reason?: string | null
  created_at: number
}

export interface HallPostListResult {
  posts: HallPostSummary[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}