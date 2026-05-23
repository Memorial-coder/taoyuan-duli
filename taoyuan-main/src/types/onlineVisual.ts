export type OnlineVisualBoardType = 'map' | 'scene' | 'track' | 'async'

export type OnlineVisualHighlightType = 'info' | 'success' | 'warning' | 'danger' | 'reward'

export type OnlineVisualNodeState = 'hidden' | 'locked' | 'available' | 'active' | 'resolved' | 'danger' | 'reward' | 'exit'

export type OnlineVisualObjectState = 'idle' | 'needs_action' | 'busy' | 'complete' | 'overheated' | 'blocked'

export type OnlineVisualTrackCellKind = 'normal' | 'boost' | 'risk' | 'turn' | 'finish'

export type OnlineVisualTrackTeamState = 'idle' | 'advancing' | 'retreating' | 'boosted' | 'blocked' | 'protected' | 'finished'

export type OnlineVisualTrackEffect = 'advance' | 'retreat' | 'boost' | 'blocked' | 'protect'

export type OnlineVisualAsyncStageState = 'locked' | 'pending' | 'active' | 'complete'

export type OnlineVisualAsyncHistoryType = 'contribution' | 'milestone' | 'stage_complete' | 'celebration'

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

export interface OnlineVisualObject {
  id: string
  label: string
  kind: string
  x: number
  y: number
  state: OnlineVisualObjectState
  available_action_ids: string[]
  progress_value: number
  progress_target: number
  handled_by: string
  handled_at: number
  requires_cooperation: boolean
  cooperation_required_count: number
  cooperation_current_count: number
}

export interface OnlineVisualTrackCell {
  id: string
  label: string
  index: number
  kind: OnlineVisualTrackCellKind
  occupant_team_ids: string[]
  event_id: string
  effect_ids: OnlineVisualTrackEffect[]
  available_action_ids: string[]
  risk_preview: string
  reward_preview: string
}

export interface OnlineVisualTrackTeam {
  team_id: string
  label: string
  marker: string
  position_index: number
  state: OnlineVisualTrackTeamState
  last_action_id: string
}

export interface OnlineVisualTrack {
  id: string
  label: string
  kind: string
  length: number
  current_round: number
  cells: OnlineVisualTrackCell[]
  teams: OnlineVisualTrackTeam[]
}

export interface OnlineVisualAsyncContributionOption {
  id: string
  label: string
  kind: string
  available_action_id: string
  daily_limit: number
  weekly_limit: number
  resource_cost_preview: Record<string, number>
  progress_delta: number
  reward_preview: string
}

export interface OnlineVisualAsyncMilestone {
  id: string
  label: string
  progress_required: number
  reached: boolean
  reward_preview: string
}

export interface OnlineVisualAsyncStage {
  id: string
  label: string
  state: OnlineVisualAsyncStageState
  progress_value: number
  progress_target: number
  object_ids: string[]
  contribution_options: OnlineVisualAsyncContributionOption[]
  milestones: OnlineVisualAsyncMilestone[]
}

export interface OnlineVisualAsyncContributor {
  username: string
  display_name: string
  contribution_value: number
  rank: number
}

export interface OnlineVisualAsyncHistoryEntry {
  id: string
  type: OnlineVisualAsyncHistoryType
  actor_username: string
  actor_display_name: string
  summary: string
  created_at: number
}

export interface OnlineVisualAsyncProject {
  id: string
  label: string
  kind: string
  day_tag: string
  week_tag: string
  starts_at: number
  ends_at: number
  current_stage_id: string
  stages: OnlineVisualAsyncStage[]
  contributors: OnlineVisualAsyncContributor[]
  history: OnlineVisualAsyncHistoryEntry[]
  completion_room_template_id: string
  completion_event_id: string
}

export interface OnlineVisualState {
  board_type: OnlineVisualBoardType
  board_id: string
  revision: number
  selected_visual_id: string
  nodes: OnlineVisualNode[]
  objects: OnlineVisualObject[]
  tracks: OnlineVisualTrack[]
  async_projects: OnlineVisualAsyncProject[]
  highlights: OnlineVisualHighlight[]
  recent_feedback: string
}
