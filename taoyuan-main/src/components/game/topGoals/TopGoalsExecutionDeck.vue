<template>
  <div class="min-w-0 space-y-3">
    <div class="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      <section class="game-panel-muted min-w-0 px-3 py-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-xs text-accent">今日目标</p>
          <span class="text-[11px] text-muted">{{ currentDayLabel }}</span>
        </div>
        <div class="space-y-2">
          <TopGoalsGoalCard
            v-for="goal in dailyGoals"
            :key="goal.id"
            :goal="goal"
            :get-goal-progress-text="getGoalProgressText"
            :get-goal-source-text="getGoalSourceText"
          />
        </div>
      </section>

      <section class="game-panel-muted min-w-0 px-3 py-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-xs text-accent">当前里程碑</p>
          <span class="text-[11px] text-muted">{{ currentMainQuestProgress }}</span>
        </div>

        <div v-if="currentMainQuest" class="space-y-2">
          <p class="text-sm text-text">{{ currentMainQuest.title }}</p>
          <p class="text-[11px] text-muted leading-5">{{ currentMainQuest.description }}</p>
          <div class="mt-2 space-y-2">
            <TopGoalsGoalCard
              v-for="condition in currentMainQuest.conditions"
              :key="condition.id"
              :goal="condition"
              :show-source="false"
              :get-goal-progress-text="getGoalProgressText"
              :get-goal-source-text="getGoalSourceText"
            />
          </div>
        </div>
        <div v-else class="text-xs text-muted leading-6">你已经完成全部阶段目标，可以自由经营你的桃源。</div>
      </section>
    </div>

    <section class="game-panel-muted min-w-0 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="text-xs text-success">本周重点目标</p>
        <span class="text-[11px] text-muted">{{ themeWeekGoals.length }} 项</span>
      </div>

      <div v-if="themeWeekGoals.length > 0" class="space-y-2">
        <TopGoalsGoalCard
          v-for="goal in themeWeekGoals"
          :key="goal.id"
          :goal="goal"
          tone="success"
          :get-goal-progress-text="getGoalProgressText"
          :get-goal-source-text="getGoalSourceText"
        />
      </div>
      <p v-else class="text-xs text-muted leading-6">本周暂无额外重点目标，优先推进今日目标与当前里程碑。</p>

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
    </section>
  </div>
</template>

<script setup lang="ts">
  import TopGoalsGoalCard from './TopGoalsGoalCard.vue'
  import type { GoalState, MainQuestStageState } from '@/stores/useGoalStore'
  import type { TopGoalsCta } from './types'

  defineProps<{
    currentDayLabel: string
    dailyGoals: GoalState[]
    currentMainQuest: MainQuestStageState | null
    currentMainQuestProgress: string
    themeWeekGoals: GoalState[]
    themeWeekGoalCtas: TopGoalsCta[]
    getGoalProgressText: (goal: GoalState) => string
    getGoalSourceText: (goal: GoalState) => string
  }>()

  const emit = defineEmits<{
    selectCta: [cta: TopGoalsCta]
  }>()
</script>
