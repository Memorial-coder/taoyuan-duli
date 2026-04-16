<template>
  <section
    class="game-panel-muted min-w-0 px-3 py-3"
    :data-prompt-focus="buildPromptFocusAttr('long-term-goals')"
  >
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p class="text-xs text-accent">长期目标</p>
        <p class="mt-1 text-[10px] text-muted">把想做的大事分开看看，挑一类慢慢推进就好。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-xs border border-accent/20 bg-bg/10 px-2 py-1 text-xs text-accent">
          长期目标 {{ longTermCompletedCount }}/{{ longTermGoalCount }}
        </span>
        <button
          type="button"
          class="rounded-xs border border-accent/20 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/5"
          @click="emit('toggleCollapsed')"
        >
          {{ collapsed ? '展开详情' : '收起详情' }}
        </button>
      </div>
    </div>

    <div v-if="!collapsed" class="mt-3 overflow-hidden rounded-xs border border-accent/10 bg-bg/5">
      <div
        v-for="group in longTermGoalGroups"
        :key="group.label"
        class="border-b border-accent/10 last:border-b-0"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/5"
          @click="emit('toggleLongTermGroup', group.label)"
        >
          <span>{{ group.label }}</span>
          <span class="text-muted">
            {{ group.goals.filter(goal => goal.completed).length }}/{{ group.goals.length }}
            <span class="ml-1">{{ expandedLongTermGroups.includes(group.label) ? '收' : '展' }}</span>
          </span>
        </button>

        <div v-if="expandedLongTermGroups.includes(group.label)" class="border-t border-accent/10 px-3 py-2">
          <div class="space-y-1 border-l border-accent/10 pl-3">
            <TopGoalsGoalCard
              v-for="goal in group.goals"
              :key="goal.id"
              :goal="goal"
              :action="getGoalAction(goal)"
              variant="list"
              :show-source="false"
              :strike-completed="true"
              :get-goal-progress-text="getGoalProgressText"
              :get-goal-source-text="getGoalSourceText"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import TopGoalsGoalCard from './TopGoalsGoalCard.vue'
  import type { GoalState } from '@/stores/useGoalStore'
  import type { PromptAction } from '@/types'
  import type { TopGoalsLongTermGroup } from './types'

  defineProps<{
    buildPromptFocusAttr: (focusKey: string) => string
    collapsed: boolean
    expandedLongTermGroups: string[]
    getGoalAction: (goal: GoalState) => PromptAction | null
    longTermCompletedCount: number
    longTermGoalCount: number
    longTermGoalGroups: TopGoalsLongTermGroup[]
    getGoalProgressText: (goal: GoalState) => string
    getGoalSourceText: (goal: GoalState) => string
  }>()

  const emit = defineEmits<{
    toggleCollapsed: []
    toggleLongTermGroup: [label: string]
  }>()
</script>
