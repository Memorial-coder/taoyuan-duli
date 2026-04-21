<template>
  <div class="game-panel space-y-3 px-3 py-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm text-accent">目标规划</p>
        <p class="mt-1 text-[11px] text-muted">
          <template v-if="goalStore.currentMainQuest">
            当前里程碑：第{{ goalStore.currentMainQuest.id }}阶段 · {{ goalStore.currentMainQuest.title }}
          </template>
          <template v-else>当前里程碑：已完成全部主线阶段</template>
        </p>
        <p v-if="goalStore.currentThemeWeek" class="mt-1 text-[11px] text-accent/80">
          本周主题：{{ goalStore.currentThemeWeek.name }}（{{ goalStore.currentThemeWeek.startDay }}-{{ goalStore.currentThemeWeek.endDay }}日）
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="game-chip">今日 {{ goalStore.dailyGoals.length }} 项</span>
        <span class="game-chip">里程碑 {{ currentMainQuestProgress }}</span>
        <span v-if="goalStore.currentThemeWeek" class="game-chip">{{ goalStore.currentThemeWeek.name }}</span>
        <template v-if="!collapsed">
          <span class="game-chip">目标声望 {{ goalStore.goalReputation }}</span>
          <span class="game-chip">长期 {{ longTermCompletedCount }} / {{ goalStore.longTermGoals.length }}</span>
          <span class="game-chip">连周 {{ goalStore.weeklyStreakState.current }} / 最佳 {{ goalStore.weeklyStreakState.best }}</span>
          <span v-if="goalStore.currentEventCampaign" class="game-chip">活动 {{ goalStore.currentEventCampaign.label }}</span>
        </template>
        <button class="btn !px-2 !py-1" @click="collapsed = !collapsed">
          <span>{{ collapsed ? '展开完整规划' : '收起详细规划' }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="collapsed"
      class="rounded-xs border border-accent/15 bg-bg/10 px-3 py-3"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-accent">今日聚焦</p>
        <span class="text-[10px] text-muted">{{ compactStatusLabel }}</span>
      </div>
      <p class="mt-2 text-sm text-text">{{ compactHeadline }}</p>
      <p class="mt-1 text-[10px] text-muted leading-5">{{ compactSummary }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-if="compactCta"
          type="button"
          class="btn !px-3 !py-1.5 text-[10px]"
          @click="handleTopGoalsCta(compactCta)"
        >
          {{ compactCta.label }}
        </button>
        <button
          type="button"
          class="btn !px-3 !py-1.5 text-[10px]"
          @click="collapsed = false"
        >
          查看完整规划
        </button>
      </div>
    </div>

    <GuidanceDigestPanel v-else surface-id="top_goals" title="周目标与活动摘要" />

    <div v-if="!collapsed && decisionLoopActions.length > 0" class="rounded-xs border border-accent/15 bg-bg/10 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
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
          <p class="mt-1 text-xs text-text">{{ action.label }}</p>
          <p class="mt-1 text-[10px] text-muted leading-4">{{ action.summary }}</p>
        </button>
      </div>
    </div>

    <div v-if="!collapsed" class="mt-3 space-y-3">
      <div class="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)] xl:gap-4">
        <TopGoalsExecutionDeck
          :active-tab="activePlanTab"
          :build-prompt-focus-attr="buildPromptFocusAttr"
          :current-day-label="currentDayLabel"
          :current-season-label="currentSeasonLabel"
          :daily-goals="goalStore.dailyGoals"
          :theme-week-goals="goalStore.currentThemeWeekGoals"
          :season-goals="seasonGoalsByPriority"
          :season-completed-count="seasonCompletedCount"
          :season-total-count="goalStore.seasonGoals.length"
          :theme-week-goal-ctas="themeWeekGoalCtas"
          :get-goal-action="buildGoalAction"
          :get-goal-progress-text="goalStore.getGoalProgressText"
          :get-goal-source-text="goalStore.getGoalSourceText"
          @select-cta="handleTopGoalsCta"
          @select-tab="selectPlanTab"
        />

        <TopGoalsSummarySidebar
          :build-prompt-focus-attr="buildPromptFocusAttr"
          :current-event-campaign="goalStore.currentEventCampaign"
          :current-main-quest="goalStore.currentMainQuest"
          :current-main-quest-progress="currentMainQuestProgress"
          :get-goal-action="buildGoalAction"
          :market-overview="marketOverview"
          :market-route-highlights="marketRouteHighlights"
          :market-ctas="marketCtas"
          :last-weekly-settlement="goalStore.lastWeeklyGoalSettlement"
          :last-weekly-settlement-week-label="lastWeeklySettlementWeekLabel"
          :weekly-streak="goalStore.weeklyStreakState"
          :get-goal-progress-text="goalStore.getGoalProgressText"
          :get-goal-source-text="goalStore.getGoalSourceText"
          @select-cta="handleTopGoalsCta"
        />
      </div>

      <TopGoalsDetailTabs
        :build-prompt-focus-attr="buildPromptFocusAttr"
        :collapsed="detailsCollapsed"
        :expanded-long-term-groups="expandedLongTermGroups"
        :get-goal-action="buildGoalAction"
        :long-term-completed-count="longTermCompletedCount"
        :long-term-goal-count="goalStore.longTermGoals.length"
        :long-term-goal-groups="longTermGoalGroups"
        :get-goal-progress-text="goalStore.getGoalProgressText"
        :get-goal-source-text="goalStore.getGoalSourceText"
        @toggle-collapsed="detailsCollapsed = !detailsCollapsed"
        @toggle-long-term-group="toggleLongTermGroup"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { navigateToPromptTarget, usePromptFocusPanel } from '@/composables/usePromptNavigation'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import TopGoalsDetailTabs from '@/components/game/topGoals/TopGoalsDetailTabs.vue'
  import TopGoalsExecutionDeck from '@/components/game/topGoals/TopGoalsExecutionDeck.vue'
  import TopGoalsSummarySidebar from '@/components/game/topGoals/TopGoalsSummarySidebar.vue'
  import { useTopGoalsPanelModel } from '@/components/game/topGoals/useTopGoalsPanelModel'
  import { useGameStore } from '@/stores/useGameStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import type { GuidanceCrossSystemAction } from '@/types'
  import type { TopGoalsCta, TopGoalsPlanTab } from '@/components/game/topGoals/types'

  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const shopStore = useShopStore()
  const tutorialStore = useTutorialStore()
  const route = useRoute()
  const collapsed = ref(true)
  const activePlanTab = ref<TopGoalsPlanTab>('daily')
  const detailsCollapsed = ref(false)
  const expandedLongTermGroups = ref<string[]>([])

  const {
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
    themeWeekGoalCtas,
    lastWeeklySettlementWeekLabel,
    buildNavigationCta,
    buildGoalAction,
    getDecisionActionPath,
    getSurfaceCtaLabel
  } = useTopGoalsPanelModel({ gameStore, goalStore, shopStore, tutorialStore })

  const primaryDecisionAction = computed(() => decisionLoopActions.value[0] ?? null)
  const primaryDailyGoal = computed(() => goalStore.dailyGoals.find(goal => !goal.completed) ?? goalStore.dailyGoals[0] ?? null)
  const compactCta = computed<TopGoalsCta | null>(() => {
    if (primaryDecisionAction.value) {
      return buildNavigationCta(primaryDecisionAction.value)
    }

    const goalAction = primaryDailyGoal.value ? buildGoalAction(primaryDailyGoal.value) : null
    return goalAction ? { ...goalAction, mode: 'cta' } : null
  })
  const compactHeadline = computed(() => {
    if (primaryDecisionAction.value) return primaryDecisionAction.value.label
    if (primaryDailyGoal.value) return `今天先做：${primaryDailyGoal.value.title}`
    if (goalStore.currentMainQuest) return goalStore.currentMainQuest.title
    return '今天先按当前里程碑慢慢推进'
  })
  const compactSummary = computed(() => {
    if (primaryDecisionAction.value?.summary) return primaryDecisionAction.value.summary
    if (goalStore.currentThemeWeek) return `本周主题：${goalStore.currentThemeWeek.name}。先按里程碑和今日目标慢慢推进就好。`
    if (goalStore.currentMainQuest?.description) return goalStore.currentMainQuest.description
    if (primaryDailyGoal.value) return `先完成「${primaryDailyGoal.value.title}」，会比同时追多条线更顺手。`
    return '先处理眼前这一步，再决定要不要展开更完整的经营规划。'
  })
  const compactStatusLabel = computed(() => {
    if (primaryDecisionAction.value) return `本周路线 ${decisionLoopActions.value.length} 条`
    if (primaryDailyGoal.value) return `今日目标 ${goalStore.dailyGoals.length} 项`
    return `里程碑 ${currentMainQuestProgress.value}`
  })

  const toggleLongTermGroup = (label: string) => {
    const idx = expandedLongTermGroups.value.indexOf(label)
    if (idx !== -1) {
      expandedLongTermGroups.value.splice(idx, 1)
    } else {
      expandedLongTermGroups.value.push(label)
    }
  }

  const selectPlanTab = (tab: TopGoalsPlanTab) => {
    activePlanTab.value = tab
  }

  const ensureInitialLongTermGroupExpanded = () => {
    if (expandedLongTermGroups.value.length > 0) return
    const nextGroup = longTermGoalGroups.value.find(group => group.goals.some(goal => !goal.completed)) ?? longTermGoalGroups.value[0]
    if (nextGroup) expandedLongTermGroups.value = [nextGroup.label]
  }

  const revealTopGoalsSection = async (sectionId: string) => {
    collapsed.value = false
    if (sectionId === 'daily-goals') {
      activePlanTab.value = 'daily'
      return
    }
    if (sectionId === 'theme-week-goals') {
      activePlanTab.value = 'weekly'
      return
    }
    if (sectionId === 'season-goals') {
      activePlanTab.value = 'season'
      return
    }
    if (sectionId === 'long-term-goals') {
      detailsCollapsed.value = false
      ensureInitialLongTermGroupExpanded()
    }
  }

  const { buildPromptFocusAttr } = usePromptFocusPanel('top_goals', {
    routeMatcher: () => route.path.startsWith('/game/'),
    handlers: {
      'daily-goals': async () => revealTopGoalsSection('daily-goals'),
      'current-main-quest': async () => revealTopGoalsSection('current-main-quest'),
      'theme-week-goals': async () => revealTopGoalsSection('theme-week-goals'),
      'long-term-goals': async () => revealTopGoalsSection('long-term-goals'),
      'season-goals': async () => revealTopGoalsSection('season-goals')
    }
  })

  const handleTopGoalsCta = (cta: TopGoalsCta) => {
    if (cta.routeId && cta.sourceSurfaceId) {
      tutorialStore.markGuidanceRouteAdopted(cta.routeId, cta.sourceSurfaceId)
    }
    navigateToPromptTarget(cta)
  }

  const handleOpenDecisionAction = (action: GuidanceCrossSystemAction) => {
    const cta = buildNavigationCta(action)
    if (!cta) return
    handleTopGoalsCta(cta)
  }

  onMounted(() => {
    goalStore.ensureInitialized()
    goalStore.evaluateProgressAndRewards()
    ensureInitialLongTermGroupExpanded()
  })
</script>

<style scoped>
  @media (max-width: 768px) {
    .game-panel {
      padding-top: 10px;
      padding-bottom: 10px;
    }
  }
</style>
