<template>
  <div v-if="showPanel" class="border border-warning/20 rounded-xs p-3 mb-3 bg-warning/5">
    <div class="flex items-start justify-between gap-3 mb-2">
      <div class="min-w-0">
        <p class="text-[10px] text-muted">{{ panelTitle }}</p>
        <p class="text-xs text-warning mt-1 leading-5">{{ activeTier.label }}</p>
        <p class="text-[10px] text-muted mt-1 leading-4">{{ activeTier.summary }}</p>
      </div>
      <div class="shrink-0 text-right">
        <p class="text-[10px] text-muted">存档模式</p>
        <p class="text-[10px] text-accent mt-0.5">{{ saveOverview.storageMode }}</p>
        <p class="text-[10px] text-muted mt-1">灰度通道</p>
        <p class="text-[10px] text-warning mt-0.5">{{ playerOverview.runtimeState.activeGrayReleaseChannel }}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 mb-2">
      <div class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/20">
        <p class="text-[10px] text-muted">下次周巡检</p>
        <p class="text-xs text-warning mt-0.5">{{ weeklyCountdownLabel }}</p>
        <p class="text-[10px] text-muted mt-1">迁移方案：{{ migrationProfileLabel }}</p>
      </div>
      <div class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/20">
        <p class="text-[10px] text-muted">回滚 / 热修</p>
        <p class="text-xs text-warning mt-0.5">{{ rollbackHotfixLabel }}</p>
        <p class="text-[10px] text-muted mt-1">回归套件 {{ playerOverview.regressionSuiteCount }} 组</p>
      </div>
    </div>

    <div class="border border-warning/10 rounded-xs p-2 mb-2 bg-bg/10">
      <p class="text-[10px] text-warning mb-1">需求摘要</p>
      <p class="text-[10px] text-muted leading-4">{{ requirementSummary }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
      <div class="border border-warning/10 rounded-xs p-2 bg-bg/10">
        <p class="text-[10px] text-warning mb-1">花费拆解</p>
        <p class="text-[10px] text-muted leading-4">{{ costBreakdown }}</p>
      </div>
      <div class="border border-warning/10 rounded-xs p-2 bg-bg/10">
        <p class="text-[10px] text-warning mb-1">收益预览</p>
        <p class="text-[10px] text-muted leading-4">{{ rewardPreview }}</p>
      </div>
    </div>

    <div class="border border-warning/10 rounded-xs p-2 mb-2 bg-bg/10">
      <p class="text-[10px] text-warning mb-1">推荐理由</p>
      <p class="text-[10px] text-muted leading-4">{{ recommendationReason }}</p>
    </div>

    <div class="border border-danger/20 rounded-xs p-2 mb-2 bg-danger/5">
      <p class="text-[10px] text-danger mb-1">风险说明</p>
      <p class="text-[10px] text-muted leading-4">{{ riskExplanation }}</p>
    </div>

    <div v-if="crossSystemLoopLines.length > 0" class="border border-warning/10 rounded-xs p-2 mb-2 bg-bg/10">
      <p class="text-[10px] text-warning mb-1">跨系统闭环</p>
      <p
        v-for="line in crossSystemLoopLines"
        :key="line"
        class="text-[10px] text-muted leading-4"
      >
        · {{ line }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        class="justify-center"
        :class="playerOverview.runtimeState.activeGrayReleaseChannel === 'stable' ? '!bg-success !text-bg' : ''"
        @click="setGrayReleaseChannel('stable')"
      >
        切到稳定
      </Button>
      <Button
        class="justify-center"
        :class="playerOverview.runtimeState.activeGrayReleaseChannel === 'canary' ? '!bg-warning !text-bg' : ''"
        @click="setGrayReleaseChannel('canary')"
      >
        切到灰度
      </Button>
      <Button class="justify-center" @click="markReleaseGateCompleted">
        记录发布闸门
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import Button from '@/components/game/Button.vue'
  import { WS12_QUEST_SETTLEMENT_GOVERNANCE_CONTENT_DEFS } from '@/data/quests'
  import { WS12_VILLAGE_PROJECT_GOVERNANCE_CONTENT_DEFS } from '@/data/villageProjects'
  import { useGameStore } from '@/stores/useGameStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { getWeekCycleInfo } from '@/utils/weekCycle'

  type QaGovernancePageId = 'wallet' | 'quest' | 'breeding' | 'museum' | 'shop' | 'guild' | 'hanhai' | 'npc' | 'fishpond'

  interface GovernanceTierSummary {
    id: string
    label: string
    summary: string
    priceBand: {
      money: [number, number]
      timeMinutes: [number, number]
      rolloutScope: string[]
    }
    outputBand: {
      auditedChains: string[]
      regressionSuites: string[]
      compensationReach: string
    }
    consumptionBand: {
      manualChecks: [number, number]
      receiptRetentionDays: [number, number]
      rollbackBudgetPerWeek: [number, number]
    }
  }

  interface GovernanceBandSummary {
    label: string
    summary: string
    costBreakdown: string
    rewardPreview: string
  }

  const props = defineProps<{
    pageId: QaGovernancePageId
    title?: string
  }>()

  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const saveStore = useSaveStore()

  const playerOverview = computed(() => playerStore.qaGovernanceOverview)
  const saveOverview = computed(() => saveStore.qaGovernanceOverview)
  const saveCrossSystemOverview = computed(() => saveStore.qaGovernanceCrossSystemOverview)
  const migrationProfile = computed(() => playerStore.getQaGovernanceMigrationProfile())
  const currentWeekInfo = computed(() => getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day))
  const currentDayTag = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)
  const showPanel = computed(() => import.meta.env.DEV)
  const defaultTier: GovernanceTierSummary = {
    id: 'mid_transition',
    label: '中期过渡治理包',
    summary: '优先稳住读档、结算与灰度边界。',
    priceBand: { money: [0, 0], timeMinutes: [0, 0], rolloutScope: ['stable'] },
    outputBand: { auditedChains: [], regressionSuites: [], compensationReach: '基础说明' },
    consumptionBand: { manualChecks: [0, 0], receiptRetentionDays: [0, 0], rollbackBudgetPerWeek: [0, 0] }
  }

  const activeTier = computed<GovernanceTierSummary>(() => {
    const tiers = playerOverview.value.contentTiers as unknown as readonly GovernanceTierSummary[]
    if (playerOverview.value.runtimeState.activeGrayReleaseChannel === 'canary' || playerOverview.value.runtimeState.postReleaseHotfixCount > 0) {
      return tiers.find(tier => tier.id === 'endgame_showcase') ?? tiers[tiers.length - 1] ?? defaultTier
    }
    if (playerOverview.value.runtimeState.rollbackTriggerCount > 0 || playerOverview.value.runtimeState.completedRegressionSuiteIds.includes('ws12_regression_weekly_cycles')) {
      return tiers.find(tier => tier.id === 'late_growth') ?? tiers[0] ?? defaultTier
    }
    return tiers.find(tier => tier.id === 'mid_transition') ?? tiers[0] ?? defaultTier
  })

  const contextBand = computed<GovernanceBandSummary | null>(() => {
    if (props.pageId === 'quest') {
      const def =
        WS12_QUEST_SETTLEMENT_GOVERNANCE_CONTENT_DEFS.find(entry => entry.tier === activeTier.value?.id) ??
        WS12_QUEST_SETTLEMENT_GOVERNANCE_CONTENT_DEFS[0]
      if (!def) return null
      return {
        label: def.label,
        summary: `当前聚焦 ${def.linkedQuestTypes.join('、')} 结算链路与 ${def.outputBand.compatibilityScope.join('、')} 兼容边界。`,
        costBreakdown: `人工复核 ${def.consumptionBand.manualReviews[0]}~${def.consumptionBand.manualReviews[1]} 次，重试预算 ${def.consumptionBand.retryBudget[0]}~${def.consumptionBand.retryBudget[1]} 次。`,
        rewardPreview: `覆盖奖励 ${def.outputBand.coveredRewards.join('、')}，回执校验 ${def.outputBand.receiptChecks[0]}~${def.outputBand.receiptChecks[1]} 次。`
      }
    }

    if (props.pageId === 'museum' || props.pageId === 'guild' || props.pageId === 'hanhai') {
      const def =
        WS12_VILLAGE_PROJECT_GOVERNANCE_CONTENT_DEFS.find(entry => entry.tier === activeTier.value?.id) ??
        WS12_VILLAGE_PROJECT_GOVERNANCE_CONTENT_DEFS[0]
      if (!def) return null
      return {
        label: def.label,
        summary: `当前聚焦 ${def.outputBand.compatibilityScope.join('、')} 的维护 / 捐献一致性。`,
        costBreakdown: `人工复核 ${def.consumptionBand.manualChecks[0]}~${def.consumptionBand.manualChecks[1]} 次，回滚预算 ${def.consumptionBand.rollbackBudget[0]}~${def.consumptionBand.rollbackBudget[1]} 次。`,
        rewardPreview: `覆盖方案 ${def.outputBand.coveredPlans[0]}~${def.outputBand.coveredPlans[1]} 项，补偿范围：${def.outputBand.compensationReach}。`
      }
    }

    if (!activeTier.value) return null
    return {
      label: activeTier.value.label,
      summary: activeTier.value.summary,
      costBreakdown: `人工检查 ${activeTier.value.consumptionBand.manualChecks[0]}~${activeTier.value.consumptionBand.manualChecks[1]} 次，回执留存 ${activeTier.value.consumptionBand.receiptRetentionDays[0]}~${activeTier.value.consumptionBand.receiptRetentionDays[1]} 天。`,
      rewardPreview: `覆盖链路 ${activeTier.value.outputBand.auditedChains.join('、')}，补偿范围：${activeTier.value.outputBand.compensationReach}。`
    }
  })

  const panelTitle = computed(() => props.title ?? 'QA 治理面板')
  const migrationProfileLabel = computed(() => migrationProfile.value?.label ?? '未配置')
  const rollbackHotfixLabel = computed(
    () => `${playerOverview.value.runtimeState.rollbackTriggerCount} / ${playerOverview.value.runtimeState.postReleaseHotfixCount}`
  )
  const weeklyCountdownLabel = computed(() => `距下次周巡检 ${Math.max(0, currentWeekInfo.value.weekEndDay - currentWeekInfo.value.day)} 天`)
  const requirementSummary = computed(() => {
    const compatibilityScope = migrationProfile.value?.compatibilityScope.join('、') ?? '未配置'
    return `${contextBand.value?.label ?? activeTier.value?.label ?? '治理包'}当前聚焦 ${compatibilityScope}，用于覆盖本页高风险结算、兼容与灰度边界。`
  })
  const costBreakdown = computed(() => contextBand.value?.costBreakdown ?? '当前未配置治理成本拆解。')
  const rewardPreview = computed(() => contextBand.value?.rewardPreview ?? '当前未配置治理收益预览。')
  const recommendationReason = computed(() => {
    if (playerOverview.value.latestRiskSummary) return playerOverview.value.latestRiskSummary
    return playerOverview.value.baselineAudit.playerSegments[0]?.recommendedFocus ?? playerOverview.value.baselineAudit.summary
  })
  const riskExplanation = computed(() => playerOverview.value.baselineAudit.rollbackRules[0]?.condition ?? '当前未配置软回滚条件。')
  const crossSystemLoopLines = computed(() =>
    saveCrossSystemOverview.value.loops.slice(0, 3).map(loop => `${loop.label}：${loop.summaryTemplate} ${loop.evidence}`.trim())
  )

  const setGrayReleaseChannel = (channel: 'stable' | 'canary') => {
    playerStore.setQaGovernanceGrayReleaseChannel(channel)
  }

  const markReleaseGateCompleted = () => {
    if (!playerOverview.value.tuning.operations.releaseGateQuickActionEnabled) return
    playerStore.markQaGovernanceRegressionSuiteCompleted('ws12_regression_release_gate', currentDayTag.value)
  }
</script>
