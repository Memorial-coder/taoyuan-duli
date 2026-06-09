<template>
  <aside class="min-w-0 space-y-3">
    <section
      class="game-panel-muted min-w-0 px-3 py-3"
      :data-prompt-focus="buildPromptFocusAttr('current-main-quest')"
    >
      <div class="mb-2 rounded-xs border border-warning/20 bg-warning/5 px-2 py-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.6875rem] text-warning">本周主路线</p>
          <span class="text-[0.625rem] text-muted">{{ weeklyPlanSnapshot.weekId }}</span>
        </div>
        <p class="mt-1 text-[0.625rem] text-accent leading-5">{{ weeklyPlanSnapshot.primaryRouteLabel }}</p>
        <p class="mt-1 text-[0.625rem] text-muted leading-5">{{ weeklyPlanSnapshot.primaryRouteSummary }}</p>
        <p v-if="weeklyPlanSnapshot.secondaryRouteLabels.length > 0" class="mt-1 text-[0.625rem] text-success">
          辅助路线：{{ weeklyPlanSnapshot.secondaryRouteLabels.join('、') }}
        </p>
        <p v-if="weeklyPlanSnapshot.claimableNodeLabels.length > 0" class="mt-1 text-[0.625rem] text-muted">
          当前可领：{{ weeklyPlanSnapshot.claimableNodeLabels.join('、') }}
        </p>
        <p class="mt-1 text-[0.625rem] text-muted leading-5">下周准备：{{ weeklyPlanSnapshot.nextWeekPrepSummary }}</p>
      </div>
      <div v-if="currentEventCampaign" class="mb-2 rounded-xs border border-warning/20 bg-warning/5 px-2 py-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.6875rem] text-warning">本周活动</p>
          <span class="text-[0.625rem] text-muted">{{ currentEventCampaign.cadence }}</span>
        </div>
        <p class="mt-1 text-[0.625rem] text-muted leading-5">{{ currentEventCampaign.description }}</p>
      </div>

      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="text-xs text-accent">当前里程碑</p>
        <span class="text-[0.6875rem] text-muted">{{ currentMainQuestProgress }}</span>
      </div>

      <div v-if="currentMainQuest" class="space-y-2">
        <p class="text-sm text-text">{{ currentMainQuest.title }}</p>
        <p class="text-[0.6875rem] text-muted leading-5">{{ currentMainQuest.description }}</p>
        <div class="mt-2 space-y-2">
          <TopGoalsGoalCard
            v-for="condition in currentMainQuest.conditions"
            :key="condition.id"
            :goal="condition"
            :action="getGoalAction(condition)"
            :show-source="false"
            :get-goal-progress-text="getGoalProgressText"
            :get-goal-source-text="getGoalSourceText"
          />
        </div>
      </div>
      <div v-else class="text-xs text-muted leading-6">你已经完成全部主线阶段，可以自由经营你的桃源。</div>
    </section>

    <section class="game-panel-muted min-w-0 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs text-warning">市场轮换摘要</p>
        <span class="text-[0.625rem] text-muted">{{ marketOverview.phaseLabel }}</span>
      </div>
      <p v-if="marketOverview.hotspotCategoryLabels.length > 0" class="mt-1 text-[0.625rem] text-warning">
        热点：{{ marketOverview.hotspotCategoryLabels.slice(0, 3).join('、') }}
      </p>
      <p v-else class="mt-1 text-[0.625rem] text-muted">热点等待刷新</p>
      <p class="mt-1 text-[0.625rem] text-muted leading-5">
        详细行情、地区收购和过剩压制已收进商圈「市场」标签。
      </p>
      <div v-if="marketCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
        <button
          v-for="cta in marketCtas"
          :key="cta.id"
          type="button"
          class="btn !px-2 !py-1 text-[0.625rem]"
          @click="emit('selectCta', cta)"
        >
          {{ cta.label }}
        </button>
      </div>
    </section>

    <section v-if="lastWeeklySettlement" class="game-panel-muted min-w-0 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs text-accent">上周结算</p>
        <span class="text-[0.625rem] text-muted">{{ lastWeeklySettlementWeekLabel }}</span>
      </div>
      <p class="text-[0.625rem] text-muted">
        完成 {{ lastWeeklySettlement.completedGoalCount }}/{{ lastWeeklySettlement.totalGoalCount }} · 连周 {{ weeklyStreak.current }} · 最佳
        {{ weeklyStreak.best }}
      </p>
      <p v-if="lastWeeklySettlement.rewardHighlights.length > 0" class="mt-1 text-[0.625rem] text-success">
        奖励：{{ lastWeeklySettlement.rewardHighlights.slice(0, 2).join('；') }}
      </p>
      <p v-if="lastWeeklySettlement.failureHighlights.length > 0" class="mt-1 text-[0.625rem] text-warning">
        未完成：{{ lastWeeklySettlement.failureHighlights.slice(0, 2).join('；') }}
      </p>
      <p v-if="lastWeeklySettlement.recommendationHighlights.length > 0" class="mt-1 text-[0.625rem] text-muted">
        建议：{{ lastWeeklySettlement.recommendationHighlights.slice(0, 2).join('；') }}
      </p>
    </section>

    <section v-if="latestWeeklyChronicle" class="game-panel-muted min-w-0 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs text-accent">最近周纪行</p>
        <span class="text-[0.625rem] text-muted">{{ latestWeeklyChronicle.weekId }}</span>
      </div>
      <p class="text-[0.625rem] text-muted leading-5">{{ latestWeeklyChronicle.settlementSummary }}</p>
      <p v-if="latestWeeklyChronicle.highlightSummaries.length > 0" class="mt-1 text-[0.625rem] text-success">
        高光：{{ latestWeeklyChronicle.highlightSummaries.join('；') }}
      </p>
      <p class="mt-1 text-[0.625rem] text-muted">下周准备：{{ latestWeeklyChronicle.nextWeekPrepSummary }}</p>
    </section>
  </aside>
</template>

<script setup lang="ts">
  import TopGoalsGoalCard from './TopGoalsGoalCard.vue'
  import type { GoalState, MainQuestStageState } from '@/stores/useGoalStore'
  import type { PromptAction, WeeklyChronicleEntry, WeeklyGoalSettlementSummary, WeeklyPlanSnapshot } from '@/types'
  import type {
    TopGoalsCta,
    TopGoalsEventCampaignSummary,
    TopGoalsMarketOverview,
    TopGoalsWeeklyStreakSummary
  } from './types'

  defineProps<{
    buildPromptFocusAttr: (focusKey: string) => string
    currentEventCampaign: TopGoalsEventCampaignSummary | null
    weeklyPlanSnapshot: WeeklyPlanSnapshot
    currentMainQuest: MainQuestStageState | null
    currentMainQuestProgress: string
    getGoalAction: (goal: GoalState) => PromptAction | null
    marketOverview: TopGoalsMarketOverview
    marketRouteHighlights: string
    marketCtas: TopGoalsCta[]
    lastWeeklySettlement: WeeklyGoalSettlementSummary | null
    latestWeeklyChronicle: WeeklyChronicleEntry | null
    lastWeeklySettlementWeekLabel: string
    weeklyStreak: TopGoalsWeeklyStreakSummary
    getGoalProgressText: (goal: GoalState) => string
    getGoalSourceText: (goal: GoalState) => string
  }>()

  const emit = defineEmits<{
    selectCta: [cta: TopGoalsCta]
  }>()
</script>
