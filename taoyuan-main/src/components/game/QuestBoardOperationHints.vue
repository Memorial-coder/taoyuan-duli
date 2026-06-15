<template>
  <div
    class="quest-operation-hints"
    :class="props.focusClass"
    :data-prompt-focus="props.focusAttr || undefined"
    data-testid="quest-operation-hints"
  >
    <div class="quest-operation-hints__header">
      <p>经营提示</p>
      <span>任务与订单</span>
    </div>

    <div class="quest-operation-hints__primary">
      <div class="quest-operation-hints__title-row">
        <p>本周主路线</p>
        <span>{{ weeklyPlanSnapshot.weekId }}</span>
      </div>
      <strong>{{ weeklyPlanSnapshot.primaryRouteLabel }}</strong>
      <p>{{ weeklyPlanSnapshot.primaryRouteSummary }}</p>
      <small v-if="weeklyPlanSnapshot.secondaryRouteLabels.length > 0">
        辅助路线：{{ weeklyPlanSnapshot.secondaryRouteLabels.join('、') }}
      </small>
    </div>

    <div class="quest-operation-hints__grid">
      <section v-if="goalStore.currentEventCampaign" class="quest-operation-hints__card">
        <div class="quest-operation-hints__title-row">
          <p>活动编排</p>
          <span>{{ goalStore.currentEventCampaign.cadence }}</span>
        </div>
        <p>{{ goalStore.currentEventCampaign.description }}</p>
        <small>结算模板：{{ eventMailTemplateTitles }}</small>
      </section>

      <section v-if="questStore.currentLimitedTimeQuestCampaign" class="quest-operation-hints__card quest-operation-hints__card--warning">
        <div class="quest-operation-hints__title-row">
          <p>任务收尾</p>
          <span>剩余 {{ questStore.currentLimitedTimeQuestRemainingDays }} 天</span>
        </div>
        <p>{{ questStore.currentLimitedTimeQuestCampaign.description }}</p>
        <small>{{ weeklyPlanQuestActionNodeLabels.join('、') || '当前没有额外任务收尾节点。' }}</small>
        <small>活动来源：{{ questStore.currentLimitedTimeQuestCampaign.activitySourceLabel }}</small>
      </section>

      <section v-if="goalStore.currentThemeWeek" class="quest-operation-hints__card">
        <div class="quest-operation-hints__title-row">
          <p>下周准备</p>
          <span>{{ goalStore.currentThemeWeek.startDay }}-{{ goalStore.currentThemeWeek.endDay }}日</span>
        </div>
        <strong>{{ weeklyPlanSnapshot.nextWeekPrepSummary }}</strong>
        <p>{{ goalStore.currentThemeWeek.description }}</p>
      </section>

      <section v-if="questStore.specialOrder" class="quest-operation-hints__card">
        <div class="quest-operation-hints__title-row">
          <p>特殊订单风向</p>
          <span>剩余 {{ questStore.specialOrder.daysRemaining }} 天</span>
        </div>
        <p>{{ questStore.specialOrder.demandHint || '本期特殊订单会优先消耗高价值经营产出。' }}</p>
        <small v-if="questStore.specialOrder.recommendedHybridIds?.length">
          推荐关注：{{ questStore.specialOrder.recommendedHybridIds.map(getHybridName).join('、') }}
        </small>
      </section>

      <section v-if="questStore.marketQuestBiasProfile.relationshipFocusLabels?.length" class="quest-operation-hints__card">
        <div class="quest-operation-hints__title-row">
          <p>家庭 / 仙缘风向</p>
          <span>关系联动</span>
        </div>
        <p>{{ questStore.marketQuestBiasProfile.boardHint }}</p>
        <small v-if="questStore.marketQuestBiasProfile.specialOrderHint">
          {{ questStore.marketQuestBiasProfile.specialOrderHint }}
        </small>
      </section>
    </div>

    <div class="quest-operation-hints__daily">
      <div class="quest-operation-hints__title-row">
        <p>今日随机目标</p>
        <span>{{ goalStore.dailyGoals.length }} 项</span>
      </div>

      <div v-if="goalStore.dailyGoals.length === 0" class="quest-operation-hints__empty">今日暂无经营提示。</div>
      <div v-else class="quest-operation-hints__daily-grid" data-testid="quest-daily-goal-grid">
        <section v-for="goal in goalStore.dailyGoals" :key="goal.id" class="quest-operation-hints__daily-card">
          <div class="quest-operation-hints__title-row">
            <p>{{ goal.title }}</p>
            <span :class="{ 'quest-operation-hints__status--done': goal.completed }">{{ goalStore.getGoalSourceText(goal) }}</span>
          </div>
          <p>{{ goal.description }}</p>
        </section>
      </div>
    </div>

    <div v-if="props.showActions" class="quest-operation-hints__actions">
      <button class="btn prompt-action-cta !px-2 !py-1 text-[0.625rem]" @click="focusQuestSection('main-quest', '看主线')">看主线</button>
      <button class="btn prompt-action-cta !px-2 !py-1 text-[0.625rem]" @click="focusQuestSection('board-quests', '看委托')">看委托</button>
      <button v-if="questStore.specialOrder" class="btn prompt-action-cta !px-2 !py-1 text-[0.625rem]" @click="focusQuestSection('special-order', '看特殊订单')">
        看特殊订单
      </button>
      <button class="btn prompt-action-cta !px-2 !py-1 text-[0.625rem]" @click="focusQuestSection('active-quests', '看进行中任务')">看进行中任务</button>
      <button class="btn prompt-action-cta !px-2 !py-1 text-[0.625rem]" @click="focusQuestSection('village-route', '看村庄路线')">看村庄路线</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { runPromptAction } from '@/composables/usePromptNavigation'
  import { getItemById } from '@/data'
  import { getCropById } from '@/data/crops'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { getWeeklyPlanQuestActionNodes } from '@/utils/weeklyPlanNodes'

  const props = withDefaults(defineProps<{
    focusAttr?: string
    focusClass?: string
    showActions?: boolean
  }>(), {
    focusAttr: '',
    focusClass: '',
    showActions: true
  })

  const goalStore = useGoalStore()
  const questStore = useQuestStore()
  const weeklyPlanSnapshot = computed(() => goalStore.weeklyPlanSnapshot)
  const weeklyPlanQuestActionNodeLabels = computed(() => getWeeklyPlanQuestActionNodes(weeklyPlanSnapshot.value).map(node => node.label))
  const eventMailTemplateTitles = computed(() => {
    const campaign = goalStore.currentEventCampaign
    if (!campaign) return ''
    return goalStore.eventMailTemplateRefs
      .filter(template => campaign.mailboxTemplateIds.includes(template.id))
      .map(template => template.title)
      .join('、')
  })

  const getItemName = (id: string): string => {
    return getItemById(id)?.name ?? id
  }

  const getHybridName = (id: string): string => {
    return getCropById(id)?.name ?? getItemName(id)
  }

  const focusQuestSection = (focusKey: string, label: string) => {
    runPromptAction({
      id: `quest-${focusKey}`,
      label,
      mode: 'cta',
      panelKey: 'quest',
      focusKey
    })
  }
</script>

<style scoped>
  .quest-operation-hints {
    display: grid;
    gap: 10px;
    min-width: 0;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.2);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.72);
    padding: 10px;
  }

  .quest-operation-hints__header,
  .quest-operation-hints__title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .quest-operation-hints__header p {
    color: var(--color-accent);
    font-size: 12px;
    line-height: 1.35;
  }

  .quest-operation-hints__header span,
  .quest-operation-hints__title-row span {
    flex: 0 0 auto;
    color: var(--color-muted);
    font-size: 10px;
    line-height: 1.35;
  }

  .quest-operation-hints__primary,
  .quest-operation-hints__card,
  .quest-operation-hints__daily {
    min-width: 0;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.12);
    border-radius: 2px;
    background: rgb(var(--color-bg) / 0.58);
    padding: 9px;
  }

  .quest-operation-hints__primary {
    border-color: rgb(var(--color-accent-rgb) / 0.28);
    background: rgb(var(--color-accent-rgb) / 0.06);
  }

  .quest-operation-hints__grid,
  .quest-operation-hints__daily-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    min-width: 0;
  }

  .quest-operation-hints__card--warning {
    border-color: rgb(var(--color-warning-rgb) / 0.24);
    background: rgb(var(--color-warning-rgb) / 0.05);
  }

  .quest-operation-hints__title-row p {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--color-accent);
    font-size: 11px;
    line-height: 1.4;
  }

  .quest-operation-hints__primary strong,
  .quest-operation-hints__card strong {
    display: block;
    margin-top: 4px;
    color: rgb(var(--color-text));
    font-size: 11px;
    line-height: 1.45;
  }

  .quest-operation-hints__primary p,
  .quest-operation-hints__card p,
  .quest-operation-hints__daily-card p,
  .quest-operation-hints__empty {
    margin-top: 4px;
    color: var(--color-muted);
    font-size: 10px;
    line-height: 1.55;
  }

  .quest-operation-hints__primary small,
  .quest-operation-hints__card small {
    display: block;
    margin-top: 4px;
    color: var(--color-success);
    font-size: 10px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .quest-operation-hints__daily {
    display: grid;
    gap: 8px;
  }

  .quest-operation-hints__daily-card {
    min-width: 0;
    border: 1px solid rgb(var(--color-accent-rgb) / 0.1);
    border-radius: 2px;
    padding: 8px;
  }

  .quest-operation-hints__daily-card .quest-operation-hints__title-row p {
    color: rgb(var(--color-text));
  }

  .quest-operation-hints__daily-card .quest-operation-hints__title-row span {
    color: var(--color-accent);
  }

  .quest-operation-hints__status--done {
    color: var(--color-success) !important;
  }

  .quest-operation-hints__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  @media (min-width: 560px) {
    .quest-operation-hints__grid,
    .quest-operation-hints__daily-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
