<template>
  <section class="game-panel-muted min-w-0 px-3 py-3">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p class="text-xs text-accent">目标详情</p>
        <p class="mt-1 text-[10px] text-muted">长列表下沉到底部全宽区，避免桌面端侧栏被季目标和长期目标一起拉得过高。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xs border px-2 py-1 text-xs transition-colors"
          :class="activeTab === 'longTerm' ? 'border-accent/30 bg-accent/10 text-accent' : 'border-accent/10 bg-bg/10 text-muted hover:bg-accent/5'"
          @click="emit('selectTab', 'longTerm')"
        >
          长期目标 {{ longTermCompletedCount }}/{{ longTermGoalCount }}
        </button>
        <button
          type="button"
          class="rounded-xs border px-2 py-1 text-xs transition-colors"
          :class="activeTab === 'season' ? 'border-accent/30 bg-accent/10 text-accent' : 'border-accent/10 bg-bg/10 text-muted hover:bg-accent/5'"
          @click="emit('selectTab', 'season')"
        >
          本季全部目标 {{ seasonCompletedCount }}/{{ seasonGoals.length }}
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'longTerm'" class="mt-3 space-y-2">
      <div
        v-for="group in longTermGoalGroups"
        :key="group.label"
        class="rounded-xs border border-accent/10 bg-bg/5 px-2 py-2"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-xs border border-accent/10 bg-bg/10 px-2 py-1 text-left text-xs transition-colors hover:bg-accent/5"
          @click="emit('toggleLongTermGroup', group.label)"
        >
          <span>{{ group.label }}</span>
          <span class="text-muted">
            {{ group.goals.filter(goal => goal.completed).length }}/{{ group.goals.length }}
            <span class="ml-1">{{ expandedLongTermGroups.includes(group.label) ? '^' : 'v' }}</span>
          </span>
        </button>

        <div v-if="expandedLongTermGroups.includes(group.label)" class="mt-2 space-y-1">
          <TopGoalsGoalCard
            v-for="goal in group.goals"
            :key="goal.id"
            :goal="goal"
            :show-source="false"
            :indented="true"
            :strike-completed="true"
            :get-goal-progress-text="getGoalProgressText"
            :get-goal-source-text="getGoalSourceText"
          />
        </div>
      </div>
    </div>

    <div v-else class="mt-3">
      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="text-xs text-accent">本季全部目标</p>
        <span class="text-[11px] text-muted">{{ currentSeasonLabel }}</span>
      </div>

      <div v-if="seasonGoals.length > 0" class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <TopGoalsGoalCard
          v-for="goal in seasonGoals"
          :key="goal.id"
          :goal="goal"
          :get-goal-progress-text="getGoalProgressText"
          :get-goal-source-text="getGoalSourceText"
        />
      </div>
      <p v-else class="text-xs text-muted leading-6">当前季节目标将在这里展示。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
  import TopGoalsGoalCard from './TopGoalsGoalCard.vue'
  import type { GoalState } from '@/stores/useGoalStore'
  import type { TopGoalsDetailTab, TopGoalsLongTermGroup } from './types'

  defineProps<{
    activeTab: TopGoalsDetailTab
    currentSeasonLabel: string
    expandedLongTermGroups: string[]
    longTermCompletedCount: number
    longTermGoalCount: number
    longTermGoalGroups: TopGoalsLongTermGroup[]
    seasonCompletedCount: number
    seasonGoals: GoalState[]
    getGoalProgressText: (goal: GoalState) => string
    getGoalSourceText: (goal: GoalState) => string
  }>()

  const emit = defineEmits<{
    selectTab: [tab: TopGoalsDetailTab]
    toggleLongTermGroup: [label: string]
  }>()
</script>
