<template>
  <section class="game-panel-muted min-w-0 px-3 py-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs text-accent">目标计划</p>
        <p class="mt-1 text-[10px] text-muted">每日、本周、本季合并到同一栏里，按当前节奏切换查看。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-xs border px-2 py-1 text-xs transition-colors"
          :class="
            activeTab === tab.id
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-accent/10 bg-bg/10 text-muted hover:bg-accent/5'
          "
          @click="emit('selectTab', tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div
      v-if="activeTab === 'daily'"
      class="mt-3 space-y-2"
      :data-prompt-focus="buildPromptFocusAttr('daily-goals')"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-accent">今日目标</p>
        <span class="text-[11px] text-muted">{{ currentDayLabel }}</span>
      </div>
      <div v-if="dailyGoals.length > 0" class="space-y-2">
        <TopGoalsGoalCard
          v-for="goal in dailyGoals"
          :key="goal.id"
          :goal="goal"
          :action="getGoalAction(goal)"
          :show-source="false"
          :get-goal-progress-text="getGoalProgressText"
          :get-goal-source-text="getGoalSourceText"
        />
      </div>
      <p v-else class="text-xs text-muted leading-6">今日暂无额外目标，优先按当前里程碑和任务板推进。</p>
    </div>

    <div
      v-else-if="activeTab === 'weekly'"
      class="mt-3 space-y-2"
      :data-prompt-focus="buildPromptFocusAttr('theme-week-goals')"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-accent">本周目标</p>
        <span class="text-[11px] text-muted">{{ themeWeekGoals.length }} 项</span>
      </div>
      <div v-if="themeWeekGoals.length > 0" class="space-y-2">
        <TopGoalsGoalCard
          v-for="goal in themeWeekGoals"
          :key="goal.id"
          :goal="goal"
          :action="getGoalAction(goal)"
          :show-source="false"
          :get-goal-progress-text="getGoalProgressText"
          :get-goal-source-text="getGoalSourceText"
        />
      </div>
      <p v-else class="text-xs text-muted leading-6">本周暂无额外目标，优先完成今日目标，再推进当前里程碑。</p>

      <div v-if="themeWeekGoalCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
        <button
          v-for="cta in themeWeekGoalCtas"
          :key="cta.id"
          type="button"
          class="btn !px-2 !py-1 text-[10px]"
          @click="emit('selectCta', cta)"
        >
          {{ cta.label }}
        </button>
      </div>
    </div>

    <div
      v-else
      class="mt-3 space-y-2"
      :data-prompt-focus="buildPromptFocusAttr('season-goals')"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs text-accent">本季目标</p>
          <p class="mt-1 text-[10px] text-muted">{{ currentSeasonLabel }}</p>
        </div>
        <span class="text-[11px] text-muted">{{ seasonCompletedCount }} / {{ seasonTotalCount }}</span>
      </div>
      <div v-if="seasonGoals.length > 0" class="space-y-2">
        <TopGoalsGoalCard
          v-for="goal in seasonGoals"
          :key="goal.id"
          :goal="goal"
          :action="getGoalAction(goal)"
          :show-source="false"
          :get-goal-progress-text="getGoalProgressText"
          :get-goal-source-text="getGoalSourceText"
        />
      </div>
      <p v-else class="text-xs text-muted leading-6">当前季节目标会在这里显示，完成后可以继续扩展长期经营线。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
  import TopGoalsGoalCard from './TopGoalsGoalCard.vue'
  import type { PromptAction } from '@/types'
  import type { GoalState } from '@/stores/useGoalStore'
  import type { TopGoalsCta, TopGoalsPlanTab } from './types'

  const tabs: Array<{ id: TopGoalsPlanTab; label: string }> = [
    { id: 'daily', label: '今日' },
    { id: 'weekly', label: '本周' },
    { id: 'season', label: '本季' }
  ]

  defineProps<{
    activeTab: TopGoalsPlanTab
    buildPromptFocusAttr: (focusKey: string) => string
    currentDayLabel: string
    currentSeasonLabel: string
    dailyGoals: GoalState[]
    themeWeekGoals: GoalState[]
    seasonGoals: GoalState[]
    seasonCompletedCount: number
    seasonTotalCount: number
    themeWeekGoalCtas: TopGoalsCta[]
    getGoalAction: (goal: GoalState) => PromptAction | null
    getGoalProgressText: (goal: GoalState) => string
    getGoalSourceText: (goal: GoalState) => string
  }>()

  const emit = defineEmits<{
    selectCta: [cta: TopGoalsCta]
    selectTab: [tab: TopGoalsPlanTab]
  }>()
</script>
