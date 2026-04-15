<template>
  <aside class="min-w-0 space-y-3">
    <section class="game-panel-muted min-w-0 px-3 py-3">
      <div v-if="currentEventCampaign" class="mb-2 rounded-xs border border-warning/20 bg-warning/5 px-2 py-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] text-warning">本周活动</p>
          <span class="text-[10px] text-muted">{{ currentEventCampaign.cadence }}</span>
        </div>
        <p class="mt-1 text-[10px] text-muted leading-5">{{ currentEventCampaign.description }}</p>
      </div>

      <div class="mb-2 flex items-center justify-between gap-3">
        <div>
          <p class="text-xs text-accent">本季概览</p>
          <p class="mt-1 text-[10px] text-muted">{{ currentSeasonLabel }}</p>
        </div>
        <button
          type="button"
          class="rounded-xs border border-accent/20 px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/5"
          @click="emit('requestDetailTab', 'season')"
        >
          查看全部
        </button>
      </div>

      <div class="space-y-2">
        <div v-if="currentThemeWeek" class="rounded-xs border border-accent/10 bg-accent/5 px-2 py-2">
          <p class="text-[11px] text-accent">{{ currentThemeWeek.name }}</p>
          <p class="mt-1 text-[10px] text-muted leading-5">{{ currentThemeWeek.description }}</p>
          <div v-if="themeWeekCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
            <button
              v-for="cta in themeWeekCtas"
              :key="cta.id"
              type="button"
              class="btn !px-2 !py-1 text-[10px]"
              @click="emit('selectCta', cta)"
            >
              {{ cta.label }}
            </button>
          </div>
        </div>

        <div class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] text-accent">优先季目标</p>
            <span class="text-[10px] text-muted">{{ seasonCompletedCount }} / {{ seasonTotalCount }}</span>
          </div>
          <div v-if="seasonPreviewGoals.length > 0" class="mt-2 space-y-2">
            <TopGoalsGoalCard
              v-for="goal in seasonPreviewGoals"
              :key="goal.id"
              :goal="goal"
              :get-goal-progress-text="getGoalProgressText"
              :get-goal-source-text="getGoalSourceText"
            />
          </div>
          <p v-else class="mt-2 text-xs text-muted leading-6">当前季节目标将在这里展示。</p>
          <p v-if="seasonTotalCount > seasonPreviewGoals.length" class="mt-2 text-[10px] text-muted">
            其余 {{ seasonTotalCount - seasonPreviewGoals.length }} 项季目标已移到下方详情区。
          </p>
        </div>
      </div>
    </section>

    <section class="game-panel-muted min-w-0 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs text-warning">市场轮换摘要</p>
        <span class="text-[10px] text-muted">{{ marketOverview.phaseLabel }}</span>
      </div>
      <p class="text-[10px] text-muted leading-5">{{ marketOverview.phaseDescription }}</p>
      <p v-if="marketOverview.hotspotCategoryLabels.length > 0" class="mt-1 text-[10px] text-warning">
        热点：{{ marketOverview.hotspotCategoryLabels.slice(0, 3).join('、') }}
      </p>
      <p v-if="marketRouteHighlights" class="mt-1 text-[10px] text-success">建议路线：{{ marketRouteHighlights }}</p>
      <p v-if="marketOverview.overflowPenaltyCount > 0" class="mt-1 text-[10px] text-danger">
        当前有 {{ marketOverview.overflowPenaltyCount }} 个品类处于过剩压制，建议尽快换线出货。
      </p>
      <div v-if="marketCtas.length > 0" class="mt-2 flex flex-wrap gap-1">
        <button
          v-for="cta in marketCtas"
          :key="cta.id"
          type="button"
          class="btn !px-2 !py-1 text-[10px]"
          @click="emit('selectCta', cta)"
        >
          {{ cta.label }}
        </button>
      </div>
    </section>

    <section v-if="lastWeeklySettlement" class="game-panel-muted min-w-0 px-3 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs text-accent">上周结算</p>
        <span class="text-[10px] text-muted">{{ lastWeeklySettlementWeekLabel }}</span>
      </div>
      <p class="text-[10px] text-muted">
        完成 {{ lastWeeklySettlement.completedGoalCount }}/{{ lastWeeklySettlement.totalGoalCount }} · 连周 {{ weeklyStreak.current }} · 最佳 {{ weeklyStreak.best }}
      </p>
      <p v-if="lastWeeklySettlement.rewardHighlights.length > 0" class="mt-1 text-[10px] text-success">
        奖励：{{ lastWeeklySettlement.rewardHighlights.slice(0, 2).join('；') }}
      </p>
      <p v-if="lastWeeklySettlement.failureHighlights.length > 0" class="mt-1 text-[10px] text-warning">
        未完成：{{ lastWeeklySettlement.failureHighlights.slice(0, 2).join('；') }}
      </p>
      <p v-if="lastWeeklySettlement.recommendationHighlights.length > 0" class="mt-1 text-[10px] text-muted">
        建议：{{ lastWeeklySettlement.recommendationHighlights.slice(0, 2).join('；') }}
      </p>
    </section>
  </aside>
</template>

<script setup lang="ts">
  import TopGoalsGoalCard from './TopGoalsGoalCard.vue'
  import type { GoalState } from '@/stores/useGoalStore'
  import type { WeeklyGoalSettlementSummary } from '@/types'
  import type {
    TopGoalsCta,
    TopGoalsDetailTab,
    TopGoalsEventCampaignSummary,
    TopGoalsMarketOverview,
    TopGoalsThemeWeekSummary,
    TopGoalsWeeklyStreakSummary
  } from './types'

  defineProps<{
    currentEventCampaign: TopGoalsEventCampaignSummary | null
    currentSeasonLabel: string
    currentThemeWeek: TopGoalsThemeWeekSummary | null
    themeWeekCtas: TopGoalsCta[]
    seasonPreviewGoals: GoalState[]
    seasonCompletedCount: number
    seasonTotalCount: number
    marketOverview: TopGoalsMarketOverview
    marketRouteHighlights: string
    marketCtas: TopGoalsCta[]
    lastWeeklySettlement: WeeklyGoalSettlementSummary | null
    lastWeeklySettlementWeekLabel: string
    weeklyStreak: TopGoalsWeeklyStreakSummary
    getGoalProgressText: (goal: GoalState) => string
    getGoalSourceText: (goal: GoalState) => string
  }>()

  const emit = defineEmits<{
    selectCta: [cta: TopGoalsCta]
    requestDetailTab: [tab: TopGoalsDetailTab]
  }>()
</script>
