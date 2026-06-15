<template>
  <section class="map-goals-panel" data-testid="goals-page">
    <div class="map-goals-panel__header">
      <div class="min-w-0">
        <p class="map-goals-panel__eyebrow">随身备忘</p>
        <p class="map-goals-panel__title">目标</p>
        <p class="map-goals-panel__intro">今天先看三件事：先做什么、本周押哪条线、里程碑差多少。</p>
      </div>
    </div>

    <WeeklyActivityBoard class="map-goals-panel__weekly-activity" />

    <section class="map-goals-panel__goal-list-panel" data-testid="goals-list-panel">
      <div class="map-goals-panel__section-heading">
        <p>目标清单</p>
        <span>{{ activeTabLabel }}</span>
      </div>

      <div class="map-goals-panel__tabs" role="tablist" aria-label="目标分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="map-goals-panel__tab"
          :class="{ 'map-goals-panel__tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :data-testid="`goals-tab-${tab.id}`"
          role="tab"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <small>{{ tab.count }}</small>
        </button>
      </div>

      <div class="map-goals-panel__body" data-testid="goals-list">
        <section v-if="activeTab === 'daily'" class="map-goals-panel__goal-section">
          <TopGoalsGoalCard
            v-for="goal in orderedGoals(goalStore.dailyGoals)"
            :key="goal.id"
            :goal="goal"
            :action="buildGoalAction(goal)"
            :auto-run-action="false"
            :show-source="false"
            :get-goal-progress-text="goalStore.getGoalProgressText"
            :get-goal-source-text="goalStore.getGoalSourceText"
            @select-action="handlePromptAction"
          />
          <p v-if="goalStore.dailyGoals.length === 0" class="map-goals-panel__empty">今天没有额外目标，按里程碑慢慢推进就好。</p>
        </section>

        <section v-else-if="activeTab === 'weekly'" class="map-goals-panel__goal-section">
          <TopGoalsGoalCard
            v-for="goal in orderedGoals(goalStore.currentThemeWeekGoals)"
            :key="goal.id"
            :goal="goal"
            :action="buildGoalAction(goal)"
            :auto-run-action="false"
            :show-source="false"
            :get-goal-progress-text="goalStore.getGoalProgressText"
            :get-goal-source-text="goalStore.getGoalSourceText"
            @select-action="handlePromptAction"
          />
          <div v-if="themeWeekGoalCtas.length > 0" class="map-goals-panel__cta-row">
            <button
              v-for="cta in themeWeekGoalCtas"
              :key="cta.id"
              type="button"
              class="btn !px-2 !py-1 text-[0.625rem]"
              @click="handleTopGoalsCta(cta)"
            >
              {{ cta.label }}
            </button>
          </div>
          <p v-if="goalStore.currentThemeWeekGoals.length === 0" class="map-goals-panel__empty">本周暂无额外目标，先完成今日目标和当前里程碑。</p>
        </section>

        <section v-else-if="activeTab === 'season'" class="map-goals-panel__goal-section" :data-prompt-focus="buildPromptFocusAttr('season-goals')">
          <TopGoalsGoalCard
            v-for="goal in seasonGoalsByPriority"
            :key="goal.id"
            :goal="goal"
            :action="buildGoalAction(goal)"
            :auto-run-action="false"
            :show-source="false"
            :get-goal-progress-text="goalStore.getGoalProgressText"
            :get-goal-source-text="goalStore.getGoalSourceText"
            @select-action="handlePromptAction"
          />
          <p v-if="goalStore.seasonGoals.length === 0" class="map-goals-panel__empty">当前季节目标会在这里显示。</p>
        </section>

        <section v-else class="map-goals-panel__goal-section" :data-prompt-focus="buildPromptFocusAttr('long-term-goals')">
          <div v-for="group in longTermGoalGroups" :key="group.label" class="map-goals-panel__long-group">
            <p class="map-goals-panel__long-title">{{ group.label }}</p>
            <TopGoalsGoalCard
              v-for="goal in orderedGoals(group.goals)"
              :key="goal.id"
              :goal="goal"
              :action="buildGoalAction(goal)"
              :auto-run-action="false"
              :show-source="false"
              :get-goal-progress-text="goalStore.getGoalProgressText"
              :get-goal-source-text="goalStore.getGoalSourceText"
              @select-action="handlePromptAction"
            />
          </div>
          <p v-if="longTermGoalGroups.length === 0" class="map-goals-panel__empty">长期目标会随着经营进度逐步出现。</p>
        </section>
      </div>
    </section>

    <div class="map-goals-panel__dashboard" data-testid="goals-dashboard">
      <div class="map-goals-panel__summary" data-testid="goals-summary">
        <section class="map-goals-panel__summary-item map-goals-panel__summary-item--daily" :data-prompt-focus="buildPromptFocusAttr('daily-goals')">
          <span>今天先做</span>
          <strong>{{ todayHeadline }}</strong>
          <button
            v-if="todayAction"
            type="button"
            class="map-goals-panel__inline-action"
            @click="handlePromptAction(todayAction)"
          >
            {{ todayAction.label }}
          </button>
        </section>
        <section class="map-goals-panel__summary-item map-goals-panel__summary-item--weekly" :data-prompt-focus="buildPromptFocusAttr('theme-week-goals')">
          <span>本周主线</span>
          <strong>{{ weeklyHeadline }}</strong>
          <p>{{ weeklySummary }}</p>
        </section>
        <section class="map-goals-panel__summary-item map-goals-panel__summary-item--milestone" :data-prompt-focus="buildPromptFocusAttr('current-main-quest')">
          <span>里程碑</span>
          <strong>{{ milestoneHeadline }}</strong>
          <p>{{ currentMainQuestProgress }}</p>
        </section>
      </div>
    </div>

    <section class="map-goals-panel__guidance-hub" data-testid="goals-operation-zone">
      <div class="map-goals-panel__section-heading">
        <p>经营线索</p>
        <span>路线、提示与入口合并</span>
      </div>

      <div class="map-goals-panel__guidance-hub-grid">
        <QuestBoardOperationHints :show-actions="false" />

        <div class="map-goals-panel__guidance-stack">
          <GuidanceDigestPanel surface-id="quest" title="任务路线引导" />
          <aside class="map-goals-panel__quick-notes" data-testid="goals-quick-notes">
            <div class="map-goals-panel__section-heading">
              <p>顺手线索</p>
              <span>不重复本周活动</span>
            </div>
            <div class="map-goals-panel__note-list">
              <section
                v-for="note in quickNotes"
                :key="note.id"
                class="map-goals-panel__note"
                :class="`map-goals-panel__note--${note.tone}`"
              >
                <span>{{ note.label }}</span>
                <strong>{{ note.title }}</strong>
                <p>{{ note.body }}</p>
              </section>
            </div>
          </aside>

          <section v-if="decisionLoopActions.length > 0" class="map-goals-panel__route-panel">
            <div class="map-goals-panel__section-heading">
              <p>推荐入口</p>
              <span>最多三条</span>
            </div>
            <div class="map-goals-panel__route-row" data-testid="goals-weekly-route">
              <button
                v-for="action in decisionLoopActions.slice(0, 3)"
                :key="action.id"
                type="button"
                class="map-goals-panel__route-action"
                @click="handleDecisionAction(action)"
              >
                <span>{{ getDecisionActionPath(action) }}</span>
                <strong>{{ action.label }}</strong>
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { navigateToPromptTarget, usePromptFocusPanel } from '@/composables/usePromptNavigation'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QuestBoardOperationHints from '@/components/game/QuestBoardOperationHints.vue'
  import WeeklyActivityBoard from '@/components/game/WeeklyActivityBoard.vue'
  import TopGoalsGoalCard from '@/components/game/topGoals/TopGoalsGoalCard.vue'
  import { useTopGoalsPanelModel } from '@/components/game/topGoals/useTopGoalsPanelModel'
  import { useGameStore } from '@/stores/useGameStore'
  import { useGoalStore, type GoalState } from '@/stores/useGoalStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import { getWeeklyPlanQuestActionNodes } from '@/utils/weeklyPlanNodes'
  import type { GuidanceCrossSystemAction, PromptAction } from '@/types'
  import type { TopGoalsCta } from '@/components/game/topGoals/types'

  type MapGoalTab = 'daily' | 'weekly' | 'season' | 'long'
  type GoalQuickNote = {
    id: string
    label: string
    title: string
    body: string
    tone: 'accent' | 'success' | 'warning'
  }

  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const shopStore = useShopStore()
  const tutorialStore = useTutorialStore()
  const activeTab = ref<MapGoalTab>('daily')

  const {
    currentDayLabel,
    currentMainQuestProgress,
    decisionLoopActions,
    longTermCompletedCount,
    longTermGoalGroups,
    marketOverview,
    marketRouteHighlights,
    seasonCompletedCount,
    seasonGoalsByPriority,
    themeWeekGoalCtas,
    buildNavigationCta,
    buildGoalAction,
    getDecisionActionPath
  } = useTopGoalsPanelModel({ gameStore, goalStore, shopStore, tutorialStore })

  const weeklyPlanQuestActionNodeLabels = computed(() => getWeeklyPlanQuestActionNodes(goalStore.weeklyPlanSnapshot).map(node => node.label))
  const primaryDailyGoal = computed(() => goalStore.dailyGoals.find(goal => !goal.completed) ?? goalStore.dailyGoals[0] ?? null)
  const todayAction = computed(() => (primaryDailyGoal.value ? buildGoalAction(primaryDailyGoal.value) : null))
  const marketNoteTitle = computed(() => {
    if (marketOverview.value.hotspotCategoryLabels.length > 0) return `${marketOverview.value.hotspotCategoryLabels.slice(0, 3).join('、')}走热`
    return marketOverview.value.phaseLabel || '暂无明显热点'
  })
  const quickNotes = computed<GoalQuickNote[]>(() => {
    const notes: GoalQuickNote[] = [
      {
        id: 'market',
        label: '市场',
        title: marketNoteTitle.value,
        body: marketRouteHighlights.value ? `顺路看 ${marketRouteHighlights.value}` : '按当前热度挑一两项备货。',
        tone: 'accent'
      }
    ]
    if (weeklyPlanQuestActionNodeLabels.value.length > 0) {
      notes.push({
        id: 'quest-closeout',
        label: '任务',
        title: '收尾节点',
        body: weeklyPlanQuestActionNodeLabels.value.join('、'),
        tone: 'success'
      })
    }
    if (goalStore.weeklyPlanSnapshot.nextWeekPrepSummary) {
      notes.push({
        id: 'next-week',
        label: '下周',
        title: '主题预告',
        body: goalStore.weeklyPlanSnapshot.nextWeekPrepSummary,
        tone: 'warning'
      })
    }
    return notes.slice(0, 3)
  })

  const todayHeadline = computed(() => {
    if (primaryDailyGoal.value) return primaryDailyGoal.value.title
    if (goalStore.currentMainQuest) return goalStore.currentMainQuest.title
    return `${currentDayLabel.value}先稳住主线`
  })

  const weeklyHeadline = computed(() => {
    const activity = goalStore.weeklyActivityOverview
    if (activity) return `本周活动：${activity.theme.label}`
    if (goalStore.weeklyPlanSnapshot.primaryRouteLabel) return goalStore.weeklyPlanSnapshot.primaryRouteLabel
    if (goalStore.currentThemeWeek?.name) return goalStore.currentThemeWeek.name
    return '按今日目标推进'
  })

  const weeklySummary = computed(() => {
    const activity = goalStore.weeklyActivityOverview
    const parts: string[] = []
    if (activity) parts.push(`已完成 ${activity.completedCount}/${activity.totalCount} 项，剩 ${activity.remainingDays} 天`)
    if (goalStore.weeklyPlanSnapshot.primaryRouteSummary) parts.push(goalStore.weeklyPlanSnapshot.primaryRouteSummary)
    if (goalStore.weeklyPlanSnapshot.secondaryRouteLabels.length > 0) parts.push(`顺路：${goalStore.weeklyPlanSnapshot.secondaryRouteLabels.slice(0, 2).join('、')}`)
    if (goalStore.weeklyPlanSnapshot.nextWeekPrepSummary) parts.push(`下周：${goalStore.weeklyPlanSnapshot.nextWeekPrepSummary}`)
    return parts.join('；') || '本周先跟着目标和任务走。'
  })

  const milestoneHeadline = computed(() => {
    if (goalStore.currentMainQuest) return goalStore.currentMainQuest.title
    return '全部经营阶段已完成'
  })

  const tabs = computed<Array<{ id: MapGoalTab; label: string; count: string }>>(() => [
    { id: 'daily', label: '今日', count: String(goalStore.dailyGoals.filter(goal => !goal.completed).length || goalStore.dailyGoals.length) },
    {
      id: 'weekly',
      label: '本周',
      count: goalStore.weeklyActivityOverview
        ? `${goalStore.weeklyActivityOverview.completedCount}/${goalStore.weeklyActivityOverview.totalCount}`
        : String(goalStore.currentThemeWeekGoals.filter(goal => !goal.completed).length || goalStore.currentThemeWeekGoals.length)
    },
    { id: 'season', label: '本季', count: `${seasonCompletedCount.value}/${goalStore.seasonGoals.length}` },
    { id: 'long', label: '长期', count: `${longTermCompletedCount.value}/${goalStore.longTermGoals.length}` }
  ])
  const activeTabLabel = computed(() => tabs.value.find(tab => tab.id === activeTab.value)?.label ?? '今日')

  const orderedGoals = (goals: GoalState[]) => {
    const incomplete = goals.filter(goal => !goal.completed)
    const completed = goals.filter(goal => goal.completed)
    return [...incomplete, ...completed]
  }

  const handlePromptAction = (action: PromptAction) => {
    navigateToPromptTarget(action)
  }

  const handleTopGoalsCta = (cta: TopGoalsCta) => {
    if (cta.routeId && cta.sourceSurfaceId) {
      tutorialStore.markGuidanceRouteAdopted(cta.routeId, cta.sourceSurfaceId)
    }
    handlePromptAction(cta)
  }

  const handleDecisionAction = (action: GuidanceCrossSystemAction) => {
    const cta = buildNavigationCta(action)
    if (!cta) return
    handleTopGoalsCta(cta)
  }

  const revealTopGoalsSection = (sectionId: string) => {
    if (sectionId === 'daily-goals') activeTab.value = 'daily'
    if (sectionId === 'theme-week-goals') activeTab.value = 'weekly'
    if (sectionId === 'season-goals') activeTab.value = 'season'
    if (sectionId === 'long-term-goals') activeTab.value = 'long'
  }

  const { buildPromptFocusAttr } = usePromptFocusPanel('goals', {
    handlers: {
      'daily-goals': async () => revealTopGoalsSection('daily-goals'),
      'current-main-quest': async () => revealTopGoalsSection('current-main-quest'),
      'theme-week-goals': async () => revealTopGoalsSection('theme-week-goals'),
      'long-term-goals': async () => revealTopGoalsSection('long-term-goals'),
      'season-goals': async () => revealTopGoalsSection('season-goals')
    }
  })

  onMounted(() => {
    goalStore.ensureInitialized()
    goalStore.evaluateProgressAndRewards()
  })
</script>

<style scoped>
  .map-goals-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .map-goals-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .map-goals-panel__back,
  .map-goals-panel__inline-action,
  .map-goals-panel__tab,
  .map-goals-panel__route-action {
    border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
    border-radius: 2px;
    background: rgb(var(--color-bg));
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .map-goals-panel__back {
    display: inline-flex;
    align-items: center;
    gap: calc(4px * var(--mobile-map-tile-scale, 1));
    padding: calc(5px * var(--mobile-map-tile-scale, 1)) calc(8px * var(--mobile-map-tile-scale, 1));
    color: var(--color-accent);
    font-size: calc(11px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__eyebrow {
    color: var(--color-muted);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.3;
  }

  .map-goals-panel__title {
    color: var(--color-accent);
    font-size: calc(16px * var(--mobile-map-tile-scale, 1));
    line-height: 1.35;
  }

  .map-goals-panel__intro {
    margin-top: 4px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  .map-goals-panel__summary {
    display: grid;
    grid-template-columns: 1fr;
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__dashboard,
  .map-goals-panel__guidance-hub,
  .map-goals-panel__guidance-hub-grid,
  .map-goals-panel__guidance-stack,
  .map-goals-panel__goal-list-panel {
    display: grid;
    gap: calc(10px * var(--mobile-map-tile-scale, 1));
    min-width: 0;
  }

  .map-goals-panel__weekly-activity {
    box-shadow:
      0 0 0 1px rgb(var(--color-accent-rgb) / 0.08),
      0 10px 24px rgb(0 0 0 / 0.16);
  }

  .map-goals-panel__summary-item,
  .map-goals-panel__note,
  .map-goals-panel__route-panel,
  .map-goals-panel__goal-list-panel {
    border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
    border-radius: 2px;
    background: rgb(var(--color-bg));
  }

  .map-goals-panel__summary-item {
    min-height: calc(92px * var(--mobile-map-tile-scale, 1));
    padding: calc(8px * var(--mobile-map-tile-scale, 1)) calc(10px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__summary-item--weekly {
    border-color: rgb(var(--color-accent-rgb) / 0.36);
    background: color-mix(in srgb, rgb(var(--color-bg)) 90%, var(--color-accent) 10%);
  }

  .map-goals-panel__summary-item span,
  .map-goals-panel__note span,
  .map-goals-panel__route-action span {
    display: block;
    color: var(--color-muted);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.4;
  }

  .map-goals-panel__summary-item strong,
  .map-goals-panel__note strong,
  .map-goals-panel__route-action strong {
    display: block;
    margin-top: calc(3px * var(--mobile-map-tile-scale, 1));
    color: rgb(var(--color-text));
    font-size: calc(12px * var(--mobile-map-tile-scale, 1));
    line-height: 1.45;
  }

  .map-goals-panel__summary-item--weekly strong {
    color: var(--color-accent);
    font-size: calc(13px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__summary-item p,
  .map-goals-panel__note p {
    margin-top: calc(4px * var(--mobile-map-tile-scale, 1));
    color: var(--color-muted);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.55;
  }

  .map-goals-panel__inline-action {
    margin-top: calc(6px * var(--mobile-map-tile-scale, 1));
    padding: calc(3px * var(--mobile-map-tile-scale, 1)) calc(7px * var(--mobile-map-tile-scale, 1));
    color: var(--color-accent);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
    min-width: 0;
  }

  .map-goals-panel__section-heading p,
  .map-goals-panel__section-heading span {
    line-height: 1.35;
  }

  .map-goals-panel__section-heading p {
    color: var(--color-accent);
    font-size: calc(11px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__section-heading span {
    color: var(--color-muted);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    text-align: right;
  }

  .map-goals-panel__quick-notes,
  .map-goals-panel__note-list {
    display: grid;
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
    min-width: 0;
  }

  .map-goals-panel__note {
    min-height: calc(78px * var(--mobile-map-tile-scale, 1));
    padding: calc(8px * var(--mobile-map-tile-scale, 1)) calc(10px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__note--success {
    border-color: rgb(var(--color-success-rgb) / 0.22);
    background: rgb(var(--color-success-rgb) / 0.05);
  }

  .map-goals-panel__note--warning {
    border-color: rgb(var(--color-warning-rgb) / 0.26);
    background: rgb(var(--color-warning-rgb) / 0.05);
  }

  .map-goals-panel__route-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: calc(7px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__route-action {
    padding: calc(7px * var(--mobile-map-tile-scale, 1)) calc(9px * var(--mobile-map-tile-scale, 1));
    text-align: left;
  }

  .map-goals-panel__route-panel,
  .map-goals-panel__goal-list-panel {
    padding: calc(10px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: calc(6px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__tab {
    min-width: 0;
    padding: calc(6px * var(--mobile-map-tile-scale, 1)) calc(4px * var(--mobile-map-tile-scale, 1));
    color: var(--color-muted);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.25;
  }

  .map-goals-panel__tab span,
  .map-goals-panel__tab small {
    display: block;
    overflow-wrap: anywhere;
  }

  .map-goals-panel__tab small {
    margin-top: calc(2px * var(--mobile-map-tile-scale, 1));
    color: var(--color-accent);
  }

  .map-goals-panel__tab--active,
  .map-goals-panel__back:hover,
  .map-goals-panel__inline-action:hover,
  .map-goals-panel__route-action:hover {
    background: rgb(var(--color-accent-rgb) / 0.12);
    border-color: rgb(var(--color-accent-rgb) / 0.45);
    color: var(--color-accent);
  }

  .map-goals-panel__body {
    padding-top: calc(2px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__goal-section,
  .map-goals-panel__long-group {
    display: grid;
    gap: calc(7px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__long-group + .map-goals-panel__long-group {
    margin-top: calc(10px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__long-title {
    color: var(--color-accent);
    font-size: calc(11px * var(--mobile-map-tile-scale, 1));
    line-height: 1.4;
  }

  .map-goals-panel__cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: calc(6px * var(--mobile-map-tile-scale, 1));
  }

  .map-goals-panel__empty {
    color: var(--color-muted);
    font-size: calc(11px * var(--mobile-map-tile-scale, 1));
    line-height: 1.7;
  }

  @media (min-width: 520px) {
    .map-goals-panel__route-row {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (min-width: 760px) {
    .map-goals-panel__summary {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr) minmax(0, 0.9fr);
    }

    .map-goals-panel__dashboard {
      grid-template-columns: 1fr;
      align-items: start;
    }
  }
</style>
