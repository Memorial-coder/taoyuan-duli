export type OnlineVisualBoardType = 'map' | 'scene' | 'track' | 'async'

export type OnlineVisualHighlightType = 'info' | 'success' | 'warning' | 'danger' | 'reward'

export interface OnlineVisualHighlight {
  id: string
  visual_id: string
  type: OnlineVisualHighlightType
  label: string
  summary: string
  created_at: number
}

export interface OnlineVisualState {
  board_type: OnlineVisualBoardType
  board_id: string
  revision: number
  selected_visual_id: string
  highlights: OnlineVisualHighlight[]
  recent_feedback: string
}
