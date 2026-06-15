<template>
  <section class="weekly-activity-board" :class="{ 'weekly-activity-board--compact': compact }" data-testid="weekly-activity-board">
    <template v-if="overview">
      <div class="weekly-activity-board__header">
        <div class="min-w-0">
          <p class="weekly-activity-board__eyebrow">
            <CalendarClock :size="12" />
            本周活动
          </p>
          <h3 class="weekly-activity-board__title">{{ overview.theme.label }}</h3>
          <p class="weekly-activity-board__desc">{{ overview.theme.description }}</p>
        </div>
        <div class="weekly-activity-board__score">
          <strong>{{ overview.completedCount }}/{{ overview.totalCount }}</strong>
          <span>剩 {{ overview.remainingDays }} 天</span>
        </div>
      </div>

      <div class="weekly-activity-board__progress" aria-hidden="true">
        <div :style="{ width: `${activityProgressPercent}%` }" />
      </div>

      <div class="weekly-activity-board__tasks">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="weekly-activity-board__task"
          :class="{ 'weekly-activity-board__task--done': task.completed }"
        >
          <component :is="task.completed ? CheckCircle2 : Circle" :size="14" class="weekly-activity-board__task-icon" />
          <div class="weekly-activity-board__task-main">
            <div class="weekly-activity-board__task-title-row">
              <p class="weekly-activity-board__task-title">{{ task.title }}</p>
              <span class="weekly-activity-board__task-progress">{{ getTaskProgressText(task) }}</span>
            </div>
            <p class="weekly-activity-board__task-desc">{{ task.description }}</p>
          </div>
          <button
            v-if="isSubmissionTask(task)"
            type="button"
            class="weekly-activity-board__submit"
            :disabled="!getSubmitStatus(task).canSubmit"
            @click.stop="handleSubmit(task)"
          >
            <Send :size="12" />
            <span>{{ getSubmitStatus(task).label }}</span>
          </button>
        </div>
      </div>

      <div class="weekly-activity-board__rewards">
        <div v-for="tier in overview.rewardTiers" :key="tier.threshold" class="weekly-activity-board__reward">
          <div class="weekly-activity-board__reward-copy">
            <p>
              <Gift :size="12" />
              {{ tier.label }}
            </p>
            <span>{{ getRewardSummary(tier) }}</span>
          </div>
          <button
            type="button"
            class="weekly-activity-board__claim"
            :class="{ 'weekly-activity-board__claim--ready': tier.claimable }"
            :disabled="tier.claimed || !tier.claimable"
            @click="handleClaim(tier.threshold)"
          >
            <TicketCheck :size="12" />
            <span>{{ getClaimLabel(tier) }}</span>
          </button>
        </div>
      </div>
    </template>

    <div v-else class="weekly-activity-board__empty">
      <p>本周活动会在目标系统初始化后显示。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { CalendarClock, CheckCircle2, Circle, Gift, Send, TicketCheck } from 'lucide-vue-next'
  import { REWARD_TICKET_LABELS } from '@/data/rewardTickets'
  import { useGoalStore } from '@/stores/useGoalStore'
  import type { RewardTicketType, WeeklyActivityRewardTier, WeeklyActivityTaskState } from '@/types'

  type WeeklyActivityRewardTierDisplay = WeeklyActivityRewardTier & {
    claimed?: boolean
    claimable?: boolean
  }

  withDefaults(defineProps<{ compact?: boolean }>(), {
    compact: false
  })

  const goalStore = useGoalStore()
  const overview = computed(() => goalStore.weeklyActivityOverview)
  const tasks = computed(() => overview.value?.state.tasks ?? [])
  const activityProgressPercent = computed(() => {
    const current = overview.value
    if (!current?.totalCount) return 0
    return Math.min(100, Math.round((current.completedCount / current.totalCount) * 100))
  })

  onMounted(() => {
    goalStore.ensureInitialized()
    goalStore.evaluateProgressAndRewards()
  })

  const isSubmissionTask = (task: WeeklyActivityTaskState) =>
    task.kind === 'itemSubmission' || task.kind === 'fishSubmission' || task.kind === 'seedSubmission'

  const getTaskProgressText = (task: WeeklyActivityTaskState) => {
    const progress = Math.min(task.targetValue, Math.max(0, Math.floor(task.progressValue)))
    return `${progress}/${task.targetValue}${task.progressUnit ?? ''}`
  }

  const getSubmitStatus = (task: WeeklyActivityTaskState) => goalStore.getWeeklyActivityTaskSubmitStatus(task)

  const handleSubmit = (task: WeeklyActivityTaskState) => {
    goalStore.submitWeeklyActivityTask(task.id)
    goalStore.evaluateProgressAndRewards()
  }

  const getRewardSummary = (tier: WeeklyActivityRewardTierDisplay) => {
    const ticketRewards = Object.entries(tier.reward.ticketRewards ?? {}) as Array<[RewardTicketType, number]>
    if (ticketRewards.length === 0) return tier.description
    return ticketRewards
      .filter(([, amount]) => amount > 0)
      .map(([ticketType, amount]) => `${REWARD_TICKET_LABELS[ticketType] ?? ticketType}+${amount}`)
      .join('，')
  }

  const getClaimLabel = (tier: WeeklyActivityRewardTierDisplay) => {
    if (tier.claimed) return '已领取'
    if (tier.claimable) return '领取'
    return `${tier.threshold}项`
  }

  const handleClaim = (threshold: 5 | 7 | 10) => {
    goalStore.claimWeeklyActivityReward(threshold)
    goalStore.evaluateProgressAndRewards()
  }
</script>

<style scoped>
  .weekly-activity-board {
    display: grid;
    gap: 12px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.36);
    border-radius: 2px;
    background: color-mix(in srgb, rgb(var(--color-bg)) 88%, var(--color-accent) 12%);
    padding: 14px;
  }

  .weekly-activity-board__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .weekly-activity-board__eyebrow,
  .weekly-activity-board__reward-copy p,
  .weekly-activity-board__submit,
  .weekly-activity-board__claim {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .weekly-activity-board__eyebrow {
    color: var(--color-accent);
    font-size: 10px;
    line-height: 1.4;
  }

  .weekly-activity-board__title {
    margin-top: 4px;
    color: var(--color-accent);
    font-size: 17px;
    line-height: 1.35;
  }

  .weekly-activity-board__desc {
    margin-top: 4px;
    max-width: 680px;
    color: var(--color-muted);
    font-size: 11px;
    line-height: 1.55;
  }

  .weekly-activity-board__score {
    flex: 0 0 auto;
    min-width: 86px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.24);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.68);
    padding: 8px 10px;
    text-align: center;
  }

  .weekly-activity-board__score strong,
  .weekly-activity-board__score span {
    display: block;
    line-height: 1.35;
  }

  .weekly-activity-board__score strong {
    color: var(--color-accent);
    font-size: 22px;
  }

  .weekly-activity-board__score span {
    color: var(--color-muted);
    font-size: 11px;
  }

  .weekly-activity-board__progress {
    height: 8px;
    overflow: hidden;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.14);
    border-radius: 2px;
    background: rgb(var(--color-bg));
  }

  .weekly-activity-board__progress div {
    height: 100%;
    background: rgb(var(--color-accent-rgb) / 0.72);
    transition: width 0.18s ease;
  }

  .weekly-activity-board__tasks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 8px;
  }

  .weekly-activity-board--compact .weekly-activity-board__tasks {
    grid-template-columns: 1fr;
  }

  .weekly-activity-board__task,
  .weekly-activity-board__reward {
    border: 1px solid rgb(var(--color-accent-rgb) / 0.16);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.68);
  }

  .weekly-activity-board__task {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-height: 62px;
    padding: 9px;
  }

  .weekly-activity-board__task--done {
    border-color: rgb(var(--color-success-rgb) / 0.28);
    background: rgb(var(--color-success-rgb) / 0.06);
  }

  .weekly-activity-board__task-icon {
    color: var(--color-muted);
  }

  .weekly-activity-board__task--done .weekly-activity-board__task-icon {
    color: var(--color-success);
  }

  .weekly-activity-board__task-main {
    min-width: 0;
  }

  .weekly-activity-board__task-title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .weekly-activity-board__task-title {
    min-width: 0;
    overflow-wrap: anywhere;
    color: rgb(var(--color-text));
    font-size: 11px;
    line-height: 1.45;
  }

  .weekly-activity-board__task-progress {
    flex: 0 0 auto;
    color: var(--color-accent);
    font-size: 10px;
    line-height: 1.35;
  }

  .weekly-activity-board__task-desc {
    margin-top: 3px;
    color: var(--color-muted);
    font-size: 10px;
    line-height: 1.45;
  }

  .weekly-activity-board__submit,
  .weekly-activity-board__claim {
    justify-content: center;
    min-width: 62px;
    min-height: 28px;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.18);
    border-radius: 2px;
    background: rgb(var(--color-bg));
    color: var(--color-accent);
    font-size: 10px;
    line-height: 1.2;
  }

  .weekly-activity-board__submit:disabled,
  .weekly-activity-board__claim:disabled {
    cursor: not-allowed;
    color: var(--color-muted);
    opacity: 0.72;
  }

  .weekly-activity-board__submit:not(:disabled):hover,
  .weekly-activity-board__claim--ready:hover {
    border-color: rgb(var(--color-accent-rgb) / 0.48);
    background: rgb(var(--color-accent-rgb) / 0.1);
  }

  .weekly-activity-board__rewards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .weekly-activity-board__reward {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px;
  }

  .weekly-activity-board__reward-copy {
    min-width: 0;
  }

  .weekly-activity-board__reward-copy p {
    color: rgb(var(--color-text));
    font-size: 11px;
    line-height: 1.4;
  }

  .weekly-activity-board__reward-copy span {
    display: block;
    margin-top: 3px;
    overflow-wrap: anywhere;
    color: var(--color-muted);
    font-size: 10px;
    line-height: 1.4;
  }

  .weekly-activity-board__claim--ready {
    border-color: rgb(var(--color-success-rgb) / 0.35);
    background: rgb(var(--color-success-rgb) / 0.08);
    color: var(--color-success);
  }

  .weekly-activity-board__empty {
    color: var(--color-muted);
    font-size: 11px;
    line-height: 1.6;
  }

  @media (max-width: 720px) {
    .weekly-activity-board__header,
    .weekly-activity-board__reward {
      align-items: stretch;
      flex-direction: column;
    }

    .weekly-activity-board__score {
      display: flex;
      justify-content: space-between;
      min-width: 0;
      text-align: left;
    }

    .weekly-activity-board__tasks,
    .weekly-activity-board__rewards {
      grid-template-columns: 1fr;
    }

    .weekly-activity-board__task {
      grid-template-columns: 16px minmax(0, 1fr);
    }

    .weekly-activity-board__submit {
      grid-column: 2;
      justify-self: start;
      min-width: 72px;
    }

    .weekly-activity-board__claim {
      width: 100%;
    }
  }
</style>
