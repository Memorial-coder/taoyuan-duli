<template>
  <div class="game-panel px-3 py-3 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm text-accent">目标规划</p>
        <p class="text-[11px] text-muted mt-1">
          <template v-if="goalStore.currentMainQuest">
            当前里程碑：第{{ goalStore.currentMainQuest.id }}阶段 · {{ goalStore.currentMainQuest.title }}
          </template>
          <template v-else>当前里程碑：已完成全部主线阶段</template>
        </p>
        <p v-if="goalStore.currentThemeWeek" class="text-[11px] text-accent/80 mt-1">
          本周主题：{{ goalStore.currentThemeWeek.name }}（{{ goalStore.currentThemeWeek.startDay }}-{{ goalStore.currentThemeWeek.endDay }}日）
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="game-chip">目标声望 {{ goalStore.goalReputation }}</span>
        <span class="game-chip">今日 {{ goalStore.dailyGoals.length }} 项</span>
        <span class="game-chip">长期 {{ longTermCompletedCount }} / {{ goalStore.longTermGoals.length }}</span>
        <span class="game-chip">连周 {{ goalStore.weeklyStreakState.current }} / 最高 {{ goalStore.weeklyStreakState.best }}</span>
        <span v-if="goalStore.currentEventCampaign" class="game-chip">活动 {{ goalStore.currentEventCampaign.label }}</span>
        <button class="btn !px-2 !py-1" @click="collapsed = !collapsed">
          <span>{{ collapsed ? '展开目标' : '收起目标' }}</span>
        </button>
      </div>
    </div>

    <GuidanceDigestPanel surface-id="top_goals" title="周目标与活动摘要" />

    <div v-if="decisionLoopActions.length > 0" class="border border-accent/15 rounded-xs px-3 py-3 bg-bg/10">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-xs text-accent">本周承接路线</p>
        <span class="text-[10px] text-muted">{{ decisionLoopActions.length }} 条</span>
      </div>
      <div class="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <button
          v-for="action in decisionLoopActions"
          :key="action.id"
          type="button"
          class="w-full rounded-xs border border-accent/10 px-2 py-2 text-left transition-colors hover:bg-accent/5"
          @click="handleOpenDecisionAction(action)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] text-accent">{{ getDecisionActionPath(action) }}</span>
            <span class="text-[10px]" :class="action.adopted ? 'text-success' : 'text-muted'">
              {{ action.adopted ? '已采纳' : getSurfaceCtaLabel(action.targetSurfaceId) }}
            </span>
          </div>
          <p class="text-xs text-text mt-1">{{ action.label }}</p>
          <p class="text-[10px] text-muted mt-1 leading-4">{{ action.summary }}</p>
        </button>
      </div>
    </div>

    <div v-if="!collapsed" class="mt-3">
      <div class="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.15fr)] xl:gap-4">
        <section class="game-panel-muted px-3 py-3 xl:self-start">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">今日目标</p>
          <span class="text-[11px] text-muted">{{ currentDayLabel }}</span>
        </div>
        <div class="space-y-2">
            <div v-for="goal in goalStore.dailyGoals" :key="goal.id" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span>{{ goal.title }}</span>
              <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
            </div>
            <p class="text-[10px] text-accent/80 mt-1">{{ goalStore.getGoalSourceText(goal) }}</p>
            <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
          </div>
        </div>
        </section>

        <section class="game-panel-muted px-3 py-3 xl:self-start">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">当前里程碑</p>
          <span class="text-[11px] text-muted">{{ currentMainQuestProgress }}</span>
        </div>

        <div v-if="goalStore.currentMainQuest" class="space-y-2">
          <p class="text-sm text-text">{{ goalStore.currentMainQuest.title }}</p>
          <p class="text-[11px] text-muted leading-5">{{ goalStore.currentMainQuest.description }}</p>
            <div class="space-y-2 mt-2">
              <div v-for="condition in goalStore.currentMainQuest.conditions" :key="condition.id" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span>{{ condition.title }}</span>
                <span :class="condition.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(condition) }}</span>
              </div>
              <p class="text-[11px] text-muted mt-1 leading-5">{{ condition.description }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-muted leading-6">你已经完成全部阶段目标，可以自由经营你的桃源。</div>
        </section>

        <section class="game-panel-muted px-3 py-3 xl:self-start">
        <div v-if="goalStore.currentEventCampaign" class="rounded-xs border border-warning/20 bg-warning/5 px-2 py-2 mb-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] text-warning">本周活动</p>
            <span class="text-[10px] text-muted">{{ goalStore.currentEventCampaign.cadence }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1 leading-5">{{ goalStore.currentEventCampaign.description }}</p>
        </div>
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">本季目标</p>
          <span class="text-[11px] text-muted">{{ currentSeasonLabel }}</span>
        </div>
        <div class="space-y-2">
          <div v-if="goalStore.currentThemeWeek" class="rounded-xs border border-accent/10 bg-accent/5 px-2 py-2">
            <p class="text-[11px] text-accent">{{ goalStore.currentThemeWeek.name }}</p>
            <p class="text-[10px] text-muted mt-1 leading-5">{{ goalStore.currentThemeWeek.description }}</p>
            <div v-if="themeWeekCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
              <button
                v-for="cta in themeWeekCtas"
                :key="cta.id"
                type="button"
                class="btn !px-2 !py-1 text-[10px]"
                @click="handleTopGoalsCta(cta)"
              >
                {{ cta.label }}
              </button>
            </div>
          </div>
          <div class="rounded-xs border border-warning/20 bg-warning/5 px-2 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-warning">市场轮换摘要</p>
              <span class="text-[10px] text-muted">{{ marketOverview.phaseLabel }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1 leading-5">{{ marketOverview.phaseDescription }}</p>
            <p v-if="marketOverview.hotspotCategoryLabels.length > 0" class="text-[10px] text-warning mt-1">
              热点：{{ marketOverview.hotspotCategoryLabels.slice(0, 3).join('、') }}
            </p>
            <p v-if="marketRouteHighlights" class="text-[10px] text-success mt-1">建议路线：{{ marketRouteHighlights }}</p>
            <p v-if="marketOverview.overflowPenaltyCount > 0" class="text-[10px] text-danger mt-1">
              当前有 {{ marketOverview.overflowPenaltyCount }} 个品类处于过剩压制，建议尽快换线出货。
            </p>
            <div v-if="marketCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
              <button
                v-for="cta in marketCtas"
                :key="cta.id"
                type="button"
                class="btn !px-2 !py-1 text-[10px]"
                @click="handleTopGoalsCta(cta)"
              >
                {{ cta.label }}
              </button>
            </div>
          </div>
          <div v-if="goalStore.currentThemeWeekGoals.length > 0" class="rounded-xs border border-success/20 bg-success/5 px-2 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-success">本周重点目标</p>
              <span class="text-[10px] text-muted">{{ goalStore.currentThemeWeekGoals.length }} 项</span>
            </div>
            <div class="space-y-1.5 mt-2">
              <div v-for="goal in goalStore.currentThemeWeekGoals" :key="`theme-${goal.id}`" class="rounded-xs border border-success/10 px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span>{{ goal.title }}</span>
                  <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
                </div>
                <p class="text-[10px] text-success/80 mt-1">{{ goalStore.getGoalSourceText(goal) }}</p>
                <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
              </div>
            </div>
            <div v-if="themeWeekGoalCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
              <button
                v-for="cta in themeWeekGoalCtas"
                :key="cta.id"
                type="button"
                class="btn !px-2 !py-1 text-[10px]"
                @click="handleTopGoalsCta(cta)"
              >
                {{ cta.label }}
              </button>
            </div>
          </div>
          <div v-if="goalStore.lastWeeklyGoalSettlement" class="rounded-xs border border-accent/20 bg-accent/5 px-2 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-accent">上周结算</p>
              <span class="text-[10px] text-muted">{{ lastWeeklySettlementWeekLabel }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">
              完成 {{ goalStore.lastWeeklyGoalSettlement.completedGoalCount }}/{{ goalStore.lastWeeklyGoalSettlement.totalGoalCount }} ·
              连周 {{ goalStore.weeklyStreakState.current }} · 最佳 {{ goalStore.weeklyStreakState.best }}
            </p>
            <p v-if="goalStore.lastWeeklyGoalSettlement.rewardHighlights.length > 0" class="text-[10px] text-success mt-1">
              奖励：{{ goalStore.lastWeeklyGoalSettlement.rewardHighlights.slice(0, 2).join('；') }}
            </p>
            <p v-if="goalStore.lastWeeklyGoalSettlement.failureHighlights.length > 0" class="text-[10px] text-warning mt-1">
              未完成：{{ goalStore.lastWeeklyGoalSettlement.failureHighlights.slice(0, 2).join('；') }}
            </p>
            <p v-if="goalStore.lastWeeklyGoalSettlement.recommendationHighlights.length > 0" class="text-[10px] text-muted mt-1">
              建议：{{ goalStore.lastWeeklyGoalSettlement.recommendationHighlights.slice(0, 2).join('；') }}
            </p>
          </div>
          <div v-for="goal in goalStore.seasonGoals" :key="goal.id" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span>{{ goal.title }}</span>
              <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
            </div>
            <p class="text-[10px] text-accent/80 mt-1">{{ goalStore.getGoalSourceText(goal) }}</p>
            <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
          </div>
        </div>
        </section>

        <section class="game-panel-muted px-3 py-3 lg:col-span-2 xl:col-span-3">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">长期目标</p>
          <span class="text-[11px] text-muted">{{ longTermCompletedCount }} / {{ goalStore.longTermGoals.length }} 已完成</span>
        </div>
        <div class="space-y-2">
          <div v-for="group in longTermGoalGroups" :key="group.label">
            <button
              class="w-full flex items-center justify-between px-2 py-1 rounded-xs border border-accent/10 bg-bg/10 text-xs hover:bg-accent/5 transition-colors"
              @click="toggleLongTermGroup(group.label)"
            >
              <span>{{ group.label }}</span>
              <span class="text-muted">
                {{ group.goals.filter(g => g.completed).length }}/{{ group.goals.length }}
                <span class="ml-1">{{ expandedLongTermGroups.includes(group.label) ? '▲' : '▼' }}</span>
              </span>
            </button>
              <div v-if="expandedLongTermGroups.includes(group.label)" class="space-y-1 mt-1">
                <div v-for="goal in group.goals" :key="goal.id" class="rounded-xs border border-accent/10 px-2 py-2 ml-2 bg-bg/10">
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span :class="goal.completed ? 'line-through text-muted' : ''">{{ goal.title }}</span>
                  <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
                </div>
                <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { navigateToPanel, type PanelKey } from '@/composables/useNavigation'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useShopStore } from '@/stores/useShopStore'
  import type { GuidanceCrossSystemAction, GuidanceSurfaceId } from '@/types'

  interface TopGoalsCta {
    id: string
    label: string
    panelKey: PanelKey
    routeId?: string
    sourceSurfaceId?: GuidanceSurfaceId
  }

  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const shopStore = useShopStore()
  const tutorialStore = useTutorialStore()
  const route = useRoute()
  const collapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const expandedLongTermGroups = ref<string[]>([])
  const marketOverview = computed(() => shopStore.marketDynamicsOverview)
  const marketRouteHighlights = computed(() => shopStore.recommendedMarketDynamicsRoutes.slice(0, 2).map(route => route.label).join('、'))
  const decisionLoopActions = computed(() => tutorialStore.guidanceCrossSystemOverview.weeklyDecisionLoop)

  const currentDayLabel = computed(() => `${gameStore.day}日待办`)
  const currentSeasonLabel = computed(() => `第${gameStore.year}年 ${SEASON_NAMES[gameStore.season]}季`)
  const GUIDANCE_SURFACE_LABELS: Record<GuidanceSurfaceId, string> = {
    wallet: '钱袋',
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
  const formatWeekId = (weekId: string): string => {
    const matched = weekId.match(/^(\d+)-(spring|summer|autumn|winter)-week-(\d+)$/)
    if (!matched) return weekId
    const [, year, season, week] = matched
    return `第${year}年${SEASON_NAMES[season as keyof typeof SEASON_NAMES]}季第${week}周`
  }
  const getSurfaceLabel = (surfaceId: GuidanceSurfaceId) => GUIDANCE_SURFACE_LABELS[surfaceId] ?? surfaceId
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
  const buildCtaFromAction = (action: GuidanceCrossSystemAction, label = getSurfaceCtaLabel(action.targetSurfaceId)): TopGoalsCta | null => {
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
  const dedupeCtas = (ctas: Array<TopGoalsCta | null>) => {
    const unique = new Map<string, TopGoalsCta>()
    for (const cta of ctas) {
      if (!cta) continue
      const key = `${cta.panelKey}:${cta.label}`
      if (!unique.has(key)) unique.set(key, cta)
    }
    return Array.from(unique.values())
  }
  const questDecisionAction = computed(() => decisionLoopActions.value.find(action => action.targetSurfaceId === 'quest') ?? null)
  const marketDecisionAction = computed(() => decisionLoopActions.value.find(action => action.targetSurfaceId === 'shop') ?? null)
  const breedingDecisionAction = computed(() => decisionLoopActions.value.find(action => action.targetSurfaceId === 'breeding') ?? null)
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

  const LONG_TERM_GROUP_MAP: Record<string, string> = {
    long_money_1: '财富积累', long_money_2: '财富积累', long_money_3: '财富积累',
    long_home_1: '家园建设', long_home_2: '家园建设',
    long_mine_1: '矿洞探索', long_mine_2: '矿洞探索',
    long_cook_1: '烹饪成就', long_cook_2: '烹饪成就',
    long_fish_1: '钓鱼成就', long_fish_2: '钓鱼成就',
    long_social_1: '社交关系', long_social_2: '社交关系',
    long_collect_1: '收藏图鉴', long_collect_2: '收藏图鉴',
    long_bundle_1: '社区建设', long_bundle_2: '社区建设',
    long_crabpot_1: '蟹笼渔家',
    long_family_1: '家庭成就', long_family_2: '家庭成就',
  }

  const longTermGoalGroups = computed(() => {
    const groupMap = new Map<string, typeof goalStore.longTermGoals>()
    for (const goal of goalStore.longTermGoals) {
      const label = LONG_TERM_GROUP_MAP[goal.id] ?? '其他'
      if (!groupMap.has(label)) groupMap.set(label, [])
      groupMap.get(label)!.push(goal)
    }
    return Array.from(groupMap.entries()).map(([label, goals]) => ({ label, goals }))
  })

  const longTermCompletedCount = computed(() => goalStore.longTermGoals.filter(g => g.completed).length)
  const themeWeekCtas = computed(() => {
    if (!goalStore.currentThemeWeek) return [] as TopGoalsCta[]
    return dedupeCtas([
      questDecisionAction.value ? buildCtaFromAction(questDecisionAction.value, '去任务板') : { id: 'theme-week-quest', label: '去任务板', panelKey: 'quest' },
      breedingDecisionAction.value ? buildCtaFromAction(breedingDecisionAction.value, '去育种') : null
    ])
  })
  const marketCtas = computed(() =>
    dedupeCtas([
      marketDecisionAction.value ? buildCtaFromAction(marketDecisionAction.value, '去商圈') : { id: 'market-shop', label: '去商圈', panelKey: 'shop' }
    ])
  )
  const themeWeekGoalCtas = computed(() => {
    if (goalStore.currentThemeWeekGoals.length === 0) return [] as TopGoalsCta[]
    return dedupeCtas([
      questDecisionAction.value ? buildCtaFromAction(questDecisionAction.value, '去任务板') : { id: 'weekly-goals-quest', label: '去任务板', panelKey: 'quest' },
      breedingDecisionAction.value ? buildCtaFromAction(breedingDecisionAction.value, '去育种') : null
    ])
  })

  const toggleLongTermGroup = (label: string) => {
    const idx = expandedLongTermGroups.value.indexOf(label)
    if (idx !== -1) {
      expandedLongTermGroups.value.splice(idx, 1)
    } else {
      expandedLongTermGroups.value.push(label)
    }
  }

  const handleTopGoalsCta = (cta: TopGoalsCta) => {
    if (cta.routeId && cta.sourceSurfaceId) {
      tutorialStore.markGuidanceRouteAdopted(cta.routeId, cta.sourceSurfaceId)
    }
    if (route.name === cta.panelKey) return
    navigateToPanel(cta.panelKey)
  }

  const handleOpenDecisionAction = (action: GuidanceCrossSystemAction) => {
    const cta = buildCtaFromAction(action)
    if (!cta) return
    handleTopGoalsCta(cta)
  }

  onMounted(() => {
    goalStore.ensureInitialized()
    goalStore.evaluateProgressAndRewards()
  })
</script>

<style scoped>
  @media (max-width: 768px) {
    .game-panel {
      padding-top: 10px;
      padding-bottom: 10px;
    }
  }

  section {
    min-width: 0;
  }
</style>
