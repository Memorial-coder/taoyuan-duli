export type OnlineVisualBoardType = 'map' | 'scene' | 'track' | 'async'

export type OnlineVisualHighlightType = 'info' | 'success' | 'warning' | 'danger' | 'reward'

export type OnlineVisualNodeState = 'hidden' | 'locked' | 'available' | 'active' | 'resolved' | 'danger' | 'reward' | 'exit'

export interface OnlineVisualHighlight {
  id: string
  visual_id: string
  type: OnlineVisualHighlightType
  label: string
  summary: string
  created_at: number
}

export interface OnlineVisualNode {
  id: string
  label: string
  kind: string
  x: number
  y: number
  state: OnlineVisualNodeState
  connected_node_ids: string[]
  event_id: string
  available_action_ids: string[]
  owner_username: string
  claimed_by: string
  risk_preview: string
  reward_preview: string
  resource_cost_preview: Record<string, number>
  resource_reward_preview: Record<string, number>
}

export interface OnlineVisualState {
  board_type: OnlineVisualBoardType
  board_id: string
  revision: number
  selected_visual_id: string
  nodes: OnlineVisualNode[]
  highlights: OnlineVisualHighlight[]
  recent_feedback: string
}
