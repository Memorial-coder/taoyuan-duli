import { computed } from 'vue'
import { type PanelKey } from '@/composables/useNavigation'
import { SEASON_NAMES, useGameStore } from '@/stores/useGameStore'
import { useGoalStore } from '@/stores/useGoalStore'
import { useShopStore } from '@/stores/useShopStore'
import { useTutorialStore } from '@/stores/useTutorialStore'
import type { GuidanceCrossSystemAction, GuidanceSurfaceId } from '@/types'
import type { TopGoalsCta, TopGoalsLongTermGroup } from './types'

interface UseTopGoalsPanelModelOptions {
  gameStore: ReturnType<typeof useGameStore>
  goalStore: ReturnType<typeof useGoalStore>
  shopStore: ReturnType<typeof useShopStore>
  tutorialStore: ReturnType<typeof useTutorialStore>
}

const GUIDANCE_SURFACE_LABELS: Record<GuidanceSurfaceId, string> = {
  wallet: '钱包',
  quest: '任务板',
  breeding: '育种',
  fishpond: '鱼塘',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  npc: '关系',
  shop: '商圈',
  mail: '邮箱',
  top_goals: '目标规划'
}

const GUIDANCE_SURFACE_PANEL_MAP: Partial<Record<GuidanceSurfaceId, PanelKey>> = {
  wallet: 'wallet',
  quest: 'quest',
  breeding: 'breeding',
  fishpond: 'fishpond',
  museum: 'museum',
  guild: 'guild',
  hanhai: 'hanhai',
  npc: 'village',
  shop: 'shop',
  mail: 'mail'
}

const LONG_TERM_GROUP_MAP: Record<string, string> = {
  long_money_1: '财富积累',
  long_money_2: '财富积累',
  long_money_3: '财富积累',
  long_home_1: '家园建设',
  long_home_2: '家园建设',
  long_mine_1: '矿洞探索',
  long_mine_2: '矿洞探索',
  long_cook_1: '烹饪成就',
  long_cook_2: '烹饪成就',
  long_fish_1: '钓鱼成就',
  long_fish_2: '钓鱼成就',
  long_social_1: '社交关系',
  long_social_2: '社交关系',
  long_collect_1: '收藏图鉴',
  long_collect_2: '收藏图鉴',
  long_bundle_1: '社区建设',
  long_bundle_2: '社区建设',
  long_crabpot_1: '蟹笼渔家',
  long_family_1: '家庭成就',
  long_family_2: '家庭成就'
}

const formatWeekId = (weekId: string): string => {
  const matched = weekId.match(/^(\d+)-(spring|summer|autumn|winter)-week-(\d+)$/)
  if (!matched) return weekId

  const [, year, season, week] = matched
  return `第${year}年${SEASON_NAMES[season as keyof typeof SEASON_NAMES]}第${week}周`
}

const getSurfaceLabel = (surfaceId: GuidanceSurfaceId) => GUIDANCE_SURFACE_LABELS[surfaceId] ?? surfaceId

const dedupeCtas = (ctas: Array<TopGoalsCta | null>) => {
  const unique = new Map<string, TopGoalsCta>()
  for (const cta of ctas) {
    if (!cta) continue
    const key = `${cta.panelKey}:${cta.label}`
    if (!unique.has(key)) unique.set(key, cta)
  }
  return Array.from(unique.values())
}

export const useTopGoalsPanelModel = ({ gameStore, goalStore, shopStore, tutorialStore }: UseTopGoalsPanelModelOptions) => {
  const marketOverview = computed(() => shopStore.marketDynamicsOverview)
  const marketRouteHighlights = computed(() => shopStore.recommendedMarketDynamicsRoutes.slice(0, 2).map(route => route.label).join('、'))
  const decisionLoopActions = computed(() => tutorialStore.guidanceCrossSystemOverview.weeklyDecisionLoop)
  const currentDayLabel = computed(() => `${gameStore.day}日劳动`)
  const currentSeasonLabel = computed(() => `第${gameStore.year}年 ${SEASON_NAMES[gameStore.season]}`)
  const seasonCompletedCount = computed(() => goalStore.seasonGoals.filter(goal => goal.completed).length)
  const seasonGoalsByPriority = computed(() => {
    const incomplete = goalStore.seasonGoals.filter(goal => !goal.completed)
    const completed = goalStore.seasonGoals.filter(goal => goal.completed)
    return [...incomplete, ...completed]
  })
  const seasonPreviewGoals = computed(() => seasonGoalsByPriority.value.slice(0, 3))
  const lastWeeklySettlementWeekLabel = computed(() => {
    const weekId = goalStore.lastWeeklyGoalSettlement?.weekId
    return weekId ? formatWeekId(weekId) : ''
  })
  const currentMainQuestProgress = computed(() => {
    const current = goalStore.currentMainQuest
    if (!current) return `${goalStore.completedMainQuestCount}/${goalStore.mainQuestStages.length}`
    const done = current.conditions.filter(condition => condition.completed).length
    return `${done}/${current.conditions.length}`
  })
  const longTermGoalGroups = computed<TopGoalsLongTermGroup[]>(() => {
    const groupMap = new Map<string, typeof goalStore.longTermGoals>()
    for (const goal of goalStore.longTermGoals) {
      const label = LONG_TERM_GROUP_MAP[goal.id] ?? '其他'
      if (!groupMap.has(label)) groupMap.set(label, [])
      groupMap.get(label)!.push(goal)
    }
    return Array.from(groupMap.entries()).map(([label, goals]) => ({ label, goals }))
  })
  const longTermCompletedCount = computed(() => goalStore.longTermGoals.filter(goal => goal.completed).length)
  const getSurfaceCtaLabel = (surfaceId: GuidanceSurfaceId) => {
    switch (surfaceId) {
      case 'shop':
        return '去商圈'
      case 'quest':
        return '去任务板'
      case 'breeding':
        return '去育种'
      case 'museum':
        return '去博物馆'
      case 'mail':
        return '去邮箱'
      default:
        return `前往${getSurfaceLabel(surfaceId)}`
    }
  }
  const getDecisionActionPath = (action: GuidanceCrossSystemAction) => {
    const sourceLabel = getSurfaceLabel(action.sourceSurfaceId)
    const targetLabel = getSurfaceLabel(action.targetSurfaceId)
    return sourceLabel === targetLabel ? targetLabel : `${sourceLabel} -> ${targetLabel}`
  }
  const buildNavigationCta = (action: GuidanceCrossSystemAction, label = getSurfaceCtaLabel(action.targetSurfaceId)): TopGoalsCta | null => {
    const panelKey = GUIDANCE_SURFACE_PANEL_MAP[action.targetSurfaceId]
    if (!panelKey) return null

    return {
      id: action.id,
      label,
      panelKey,
      routeId: action.routeId,
      sourceSurfaceId: action.sourceSurfaceId
    }
  }
  const questDecisionAction = computed(() => decisionLoopActions.value.find(action => action.targetSurfaceId === 'quest') ?? null)
  const marketDecisionAction = computed(() => decisionLoopActions.value.find(action => action.targetSurfaceId === 'shop') ?? null)
  const breedingDecisionAction = computed(() => decisionLoopActions.value.find(action => action.targetSurfaceId === 'breeding') ?? null)
  const themeWeekCtas = computed(() => {
    if (!goalStore.currentThemeWeek) return [] as TopGoalsCta[]
    return dedupeCtas([
      questDecisionAction.value ? buildNavigationCta(questDecisionAction.value, '去任务板') : { id: 'theme-week-quest', label: '去任务板', panelKey: 'quest' },
      breedingDecisionAction.value ? buildNavigationCta(breedingDecisionAction.value, '去育种') : null
    ])
  })
  const marketCtas = computed(() =>
    dedupeCtas([
      marketDecisionAction.value ? buildNavigationCta(marketDecisionAction.value, '去商圈') : { id: 'market-shop', label: '去商圈', panelKey: 'shop' }
    ])
  )
  const themeWeekGoalCtas = computed(() => {
    if (goalStore.currentThemeWeekGoals.length === 0) return [] as TopGoalsCta[]
    return dedupeCtas([
      questDecisionAction.value ? buildNavigationCta(questDecisionAction.value, '去任务板') : { id: 'weekly-goals-quest', label: '去任务板', panelKey: 'quest' },
      breedingDecisionAction.value ? buildNavigationCta(breedingDecisionAction.value, '去育种') : null
    ])
  })

  return {
    currentDayLabel,
    currentMainQuestProgress,
    currentSeasonLabel,
    decisionLoopActions,
    longTermCompletedCount,
    longTermGoalGroups,
    marketCtas,
    marketOverview,
    marketRouteHighlights,
    seasonCompletedCount,
    seasonGoalsByPriority,
    seasonPreviewGoals,
    themeWeekCtas,
    themeWeekGoalCtas,
    lastWeeklySettlementWeekLabel,
    buildNavigationCta,
    getDecisionActionPath,
    getSurfaceCtaLabel
  }
}
