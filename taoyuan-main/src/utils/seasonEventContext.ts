import type { SeasonEventResolutionContext } from '@/data/events'
import { useGameStore } from '@/stores/useGameStore'
import { useGoalStore } from '@/stores/useGoalStore'
import { useNpcStore } from '@/stores/useNpcStore'
import { useVillageProjectStore } from '@/stores/useVillageProjectStore'

const RELATIONSHIP_STAGE_RANK: Record<string, number> = {
  stranger: 0,
  recognize: 1,
  acquaintance: 2,
  familiar: 3,
  friendly: 4,
  friend: 4,
  bestFriend: 5,
  bestie: 5,
  romance: 6,
  married: 7,
  family: 8
}

export const buildSeasonEventResolutionContext = (): SeasonEventResolutionContext => {
  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const npcStore = useNpcStore()
  const villageProjectStore = useVillageProjectStore()
  const friendRank = RELATIONSHIP_STAGE_RANK['friend'] ?? 4

  const closeRelationshipCount = npcStore.npcStates.filter(state => {
    const stage = npcStore.getRelationshipStage(state.npcId)
    return (RELATIONSHIP_STAGE_RANK[stage] ?? 0) >= friendRank
  }).length

  return {
    year: gameStore.year,
    villageProjectLevel: villageProjectStore.villageProjectLevel,
    closeRelationshipCount,
    hasSpouse: Boolean(npcStore.getSpouse()),
    themeWeekLabel: goalStore.currentThemeWeek?.name ?? null
  }
}
