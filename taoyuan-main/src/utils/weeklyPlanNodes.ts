import type { WeeklyPlanSnapshot } from '@/types'

export type WeeklyPlanNode = {
  id: string
  label: string
}

const QUEST_ACTION_NODE_IDS = new Set([
  'limited_time_window',
  'weekly_settlement_digest'
])

export const getWeeklyPlanNodes = (
  snapshot: WeeklyPlanSnapshot,
  predicate: (id: string) => boolean
): WeeklyPlanNode[] => snapshot.claimableNodeLabels
  .map((label, index) => ({
    id: snapshot.claimableNodeIds[index] ?? '',
    label
  }))
  .filter(node => predicate(node.id))

export const getWeeklyPlanQuestActionNodes = (snapshot: WeeklyPlanSnapshot) => (
  getWeeklyPlanNodes(snapshot, id => QUEST_ACTION_NODE_IDS.has(id) || id.startsWith('weekly_goal_'))
)
