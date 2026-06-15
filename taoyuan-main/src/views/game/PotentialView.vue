<template>
  <div data-testid="potential-view">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-sm text-accent">
        <Sparkles :size="14" />
        <span>桃源潜能</span>
      </div>
      <button class="potential-plain-link" @click="navigateToPanel('skills')">
        <Star :size="12" />
        <span>天赋精研</span>
      </button>
    </div>

    <div class="potential-resource-grid mb-3" data-testid="potential-resource-grid">
      <div v-for="resource in resourceRows" :key="resource.id" class="potential-resource-tile">
        <p class="text-[0.625rem] text-muted">{{ resource.label }}</p>
        <p class="text-base text-accent tabular-nums">{{ resource.amount }}</p>
        <p class="text-[0.625rem] text-muted leading-4">{{ resource.summary }}</p>
      </div>
    </div>

    <section
      v-if="lastUnlockResult"
      class="potential-unlock-result mb-3"
      data-testid="potential-unlock-result"
    >
      <div class="flex min-w-0 items-start gap-2">
        <CheckCircle2 :size="16" class="mt-0.5 shrink-0 text-success" />
        <div class="min-w-0">
          <p class="text-sm text-success">{{ lastUnlockResult.title }}</p>
          <p class="mt-1 text-xs leading-relaxed text-text">{{ lastUnlockResult.effectText }}</p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ lastUnlockResult.surface }}</p>
        </div>
      </div>
      <button class="potential-icon-link" type="button" aria-label="关闭参悟结果" @click="lastUnlockResult = null">
        <X :size="12" />
      </button>
    </section>

    <div class="potential-branch-tabs mb-3" role="tablist" aria-label="潜能分线">
      <button
        v-for="branch in branchRows"
        :key="branch.id"
        type="button"
        class="potential-branch-tab"
        :class="{ 'potential-branch-tab-active': selectedBranchId === branch.id }"
        :aria-selected="selectedBranchId === branch.id"
        :data-testid="`potential-branch-tab-${branch.id}`"
        @click="selectedBranchId = branch.id"
      >
        <span>{{ branch.label }}</span>
        <span class="tabular-nums">{{ branch.rank }}/{{ branch.maxRank }}</span>
      </button>
    </div>

    <section class="mb-3 border border-accent/20 rounded-xs px-3 py-2" data-testid="potential-branch-summary">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm text-accent">{{ selectedBranch?.label }}</p>
          <p class="text-xs text-muted mt-1 leading-relaxed">{{ selectedBranch?.summary }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2 text-[0.625rem] text-muted">
          <span>总阶 {{ potentialStore.totalRank }}</span>
          <span>{{ selectedBranch?.rank ?? 0 }}/{{ selectedBranch?.maxRank ?? 0 }}</span>
        </div>
      </div>
    </section>

    <section
      class="potential-next-step mb-3"
      :class="`potential-next-step-${nextStep.tone}`"
      data-testid="potential-next-step"
    >
      <component :is="nextStep.icon" :size="16" class="mt-0.5 shrink-0" />
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <p class="text-xs text-accent">{{ nextStep.title }}</p>
          <span class="potential-status-badge" :class="`potential-status-${nextStep.tone}`">{{ nextStep.label }}</span>
        </div>
        <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ nextStep.detail }}</p>
      </div>
      <button
        v-if="nextStep.action === 'randomNpc'"
        class="potential-plain-link potential-next-step-action"
        type="button"
        @click="goToRandomNpcPanel"
      >
        <Users :size="12" />
        <span>{{ nextStep.actionLabel }}</span>
      </button>
    </section>

    <div class="potential-node-grid mb-3" data-testid="potential-node-grid">
      <article
        v-for="node in branchNodes"
        :key="node.id"
        class="potential-node"
        :class="`potential-node-${nodeStatus(node).tone}`"
        :data-testid="`potential-node-${node.id}`"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm" :class="potentialStore.getNodeRank(node.id) > 0 ? 'text-accent' : 'text-text'">
              {{ node.label }}
            </p>
            <p class="text-[0.625rem] text-muted mt-1 leading-relaxed">{{ node.summary }}</p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <span class="potential-rank-pill">{{ potentialStore.getNodeRank(node.id) }}/{{ node.maxRank }}</span>
            <span class="potential-status-badge" :class="`potential-status-${nodeStatus(node).tone}`">
              <component :is="nodeStatus(node).icon" :size="11" />
              <span>{{ nodeStatus(node).label }}</span>
            </span>
          </div>
        </div>

        <div class="mt-2 border-t border-accent/10 pt-2">
          <p class="text-[0.625rem] text-muted">{{ node.surface }}</p>
          <p class="text-xs mt-1 text-success">
            {{ effectDisplay(node) }}
          </p>
        </div>

        <div class="mt-2 min-h-10">
          <p class="text-[0.625rem] text-muted">{{ nodeNextLabel(node) }}</p>
          <p class="text-xs text-accent leading-relaxed">{{ costDisplay(node) }}</p>
          <p
            v-if="upgradeReason(node)"
            class="text-[0.625rem] mt-1 leading-4"
            :class="nodeStatus(node).tone === 'missing' || nodeStatus(node).tone === 'locked' ? 'text-warning' : 'text-muted'"
          >
            {{ upgradeReason(node) }}
          </p>
        </div>

        <button
          class="potential-action-btn mt-2"
          :class="canUseNodeAction(node) ? 'potential-action-btn-ready' : 'potential-action-btn-secondary'"
          :disabled="potentialStore.getNodeRank(node.id) >= node.maxRank"
          @click="openUpgradePreview(node)"
        >
          <component :is="nodeActionIcon(node)" :size="12" />
          <span>{{ nodeActionLabel(node) }}</span>
        </button>
      </article>
    </div>

    <section class="mb-3 border border-accent/20 rounded-xs px-3 py-2" data-testid="potential-respec-panel">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm text-accent">分线重修</p>
          <p class="text-xs text-muted mt-1 leading-relaxed">{{ respecPreviewText }}</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            v-if="confirmRespecBranchId !== selectedBranchId"
            class="potential-plain-link"
            :disabled="!respecPreview.canRefund"
            @click="confirmRespecBranchId = selectedBranchId"
          >
            <RotateCcw :size="12" />
            <span>重修本线</span>
          </button>
          <template v-else>
            <button class="potential-danger-link" @click="handleRefundBranch">
              <CheckCircle2 :size="12" />
              <span>确认</span>
            </button>
            <button class="potential-plain-link" @click="confirmRespecBranchId = null">
              <X :size="12" />
              <span>取消</span>
            </button>
          </template>
        </div>
      </div>
    </section>

    <div class="potential-source-grid" data-testid="potential-source-grid">
      <div v-for="source in sourceRows" :key="source.id" class="potential-source-row">
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs text-accent">{{ source.label }}</p>
          <span class="potential-source-pill tabular-nums">{{ source.progress.claims }}/{{ source.progress.maxClaims }}</span>
        </div>
        <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ source.summary }}</p>
        <div class="potential-source-progress mt-2" data-testid="potential-source-progress">
          <span :style="{ width: `${source.progress.percent}%` }"></span>
        </div>
        <p class="text-[0.625rem] text-muted/80 mt-1">
          {{ source.periodLabel }}已获 {{ source.progress.claims }}/{{ source.progress.maxClaims }} 次 · 常规获得 {{ source.rewardText }}
        </p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="upgradePreview"
        class="potential-upgrade-backdrop"
        data-testid="potential-upgrade-dialog"
        @click.self="closeUpgradePreview"
      >
        <section
          class="potential-upgrade-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="`${upgradePreview.node.label}参悟预览`"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ upgradePreview.node.label }}</p>
              <p class="mt-1 text-xs leading-relaxed text-muted">{{ upgradePreview.node.summary }}</p>
            </div>
            <button class="potential-icon-link" type="button" aria-label="关闭参悟预览" @click="closeUpgradePreview">
              <X :size="12" />
            </button>
          </div>

          <div class="potential-upgrade-rank mt-3">
            <span class="tabular-nums">{{ upgradePreview.currentRank }}/{{ upgradePreview.node.maxRank }}</span>
            <span>→</span>
            <span class="tabular-nums">{{ upgradePreview.nextRank }}/{{ upgradePreview.node.maxRank }}</span>
          </div>

          <div class="potential-upgrade-effect mt-3">
            <div>
              <p class="text-[0.625rem] text-muted">当前效果</p>
              <p class="mt-1 text-xs text-text">{{ upgradePreview.currentEffectText }}</p>
            </div>
            <div>
              <p class="text-[0.625rem] text-muted">下一级预览</p>
              <p class="mt-1 text-xs text-success">{{ upgradePreview.nextEffectText }}</p>
            </div>
            <div>
              <p class="text-[0.625rem] text-muted">本次提升</p>
              <p class="mt-1 text-xs text-accent">{{ upgradePreview.deltaText }}</p>
            </div>
          </div>

          <div class="mt-3">
            <p class="text-[0.625rem] text-muted">参悟消耗</p>
            <div class="potential-upgrade-costs mt-2">
              <span
                v-for="cost in upgradePreview.costRows"
                :key="cost.resourceId"
                class="potential-upgrade-cost"
                :class="cost.enough ? 'potential-upgrade-cost-ok' : 'potential-upgrade-cost-missing'"
              >
                {{ cost.label }} {{ cost.owned }}/{{ cost.amount }}
              </span>
            </div>
          </div>

          <p
            v-if="upgradePreview.reason"
            class="mt-3 text-xs leading-relaxed text-warning"
          >
            {{ upgradePreview.reason }}
          </p>

          <div class="mt-4 flex justify-end gap-2">
            <button class="potential-plain-link" type="button" @click="closeUpgradePreview">
              <X :size="12" />
              <span>取消</span>
            </button>
            <button
              class="potential-action-btn potential-upgrade-confirm"
              type="button"
              :class="upgradePreview.canUpgrade ? 'potential-action-btn-ready' : 'potential-action-btn-disabled'"
              :disabled="!upgradePreview.canUpgrade"
              @click="confirmUpgrade"
            >
              <Unlock :size="12" />
              <span>确认参悟</span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, type Component } from 'vue'
  import { AlertTriangle, CheckCircle2, LockKeyhole, RotateCcw, Sparkles, Star, Unlock, Users, X } from 'lucide-vue-next'
  import {
    POTENTIAL_EFFECT_VALUES,
    POTENTIAL_RESOURCE_DEFS,
    POTENTIAL_SOURCE_RULES,
    formatPotentialEffectValue
  } from '@/data/potential'
  import { navigateToPanel } from '@/composables/useNavigation'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { usePotentialStore } from '@/stores/usePotentialStore'
  import type { PotentialBranchId, PotentialNodeDef, PotentialResourceCost } from '@/types'

  const potentialStore = usePotentialStore()
  const selectedBranchId = ref<PotentialBranchId>('body')
  const confirmRespecBranchId = ref<PotentialBranchId | null>(null)
  const pendingUpgradeNodeId = ref<PotentialNodeDef['id'] | null>(null)
  const lastUnlockResult = ref<{
    title: string
    effectText: string
    surface: string
  } | null>(null)

  type PotentialNextStep = {
    tone: 'ready' | 'missing' | 'locked' | 'maxed'
    label: string
    icon: Component
    title: string
    detail: string
    action?: 'randomNpc'
    actionLabel?: string
  }

  const resourceRows = computed(() =>
    POTENTIAL_RESOURCE_DEFS.map(resource => ({
      ...resource,
      amount: potentialStore.getPotentialResource(resource.id)
    }))
  )

  const branchRows = computed(() => potentialStore.branchSummaries)
  const selectedBranch = computed(() => branchRows.value.find(branch => branch.id === selectedBranchId.value) ?? branchRows.value[0])
  const branchNodes = computed(() => potentialStore.getBranchNodes(selectedBranchId.value))
  const pendingUpgradeNode = computed(() => (pendingUpgradeNodeId.value ? potentialStore.getNodeDef(pendingUpgradeNodeId.value) ?? null : null))
  const respecPreview = computed(() => potentialStore.getPotentialBranchRefundPreview(selectedBranchId.value))
  const sourceRows = computed(() =>
    POTENTIAL_SOURCE_RULES.map(source => ({
      ...source,
      rewardText: costListDisplay(source.rewards),
      periodLabel: sourcePeriodLabel(source.cap.period),
      progress: potentialStore.getPotentialSourceProgress(source.id)
    }))
  )

  const resourceLabel = (resourceId: PotentialResourceCost['resourceId']): string =>
    POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === resourceId)?.label ?? resourceId

  const costListDisplay = (costs: PotentialResourceCost[]): string =>
    costs.length > 0 ? costs.map(cost => `${resourceLabel(cost.resourceId)} ${cost.amount}`).join('、') : '无需材料'

  const sourcePeriodLabel = (period: 'daily' | 'weekly' | 'seasonal'): string => {
    if (period === 'daily') return '今日'
    if (period === 'weekly') return '本周'
    return '本季'
  }

  const costDisplay = (node: PotentialNodeDef): string => {
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return '已经修满'
    return costListDisplay(potentialStore.getNodeNextCost(node.id))
  }

  const upgradeReason = (node: PotentialNodeDef): string => potentialStore.getPotentialNodeUpgradeReason(node.id)

  const canUseNodeAction = (node: PotentialNodeDef): boolean => potentialStore.canUpgradePotentialNode(node.id)

  const nodeNextLabel = (node: PotentialNodeDef): string => {
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return '当前状态'
    return '下一阶'
  }

  const nodeStatus = (node: PotentialNodeDef) => {
    const rank = potentialStore.getNodeRank(node.id)
    if (rank >= node.maxRank) return { tone: 'maxed', label: '已修满', icon: CheckCircle2 }
    const reason = potentialStore.getPotentialNodeUpgradeReason(node.id)
    if (!reason) return { tone: 'ready', label: '可参悟', icon: Sparkles }
    if (reason.includes('不足')) return { tone: 'missing', label: '缺材料', icon: AlertTriangle }
    return { tone: 'locked', label: '未解锁', icon: LockKeyhole }
  }

  const nodeActionIcon = (node: PotentialNodeDef) => {
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return CheckCircle2
    if (!canUseNodeAction(node)) return AlertTriangle
    return Unlock
  }

  const nodeActionLabel = (node: PotentialNodeDef): string => {
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return '已修满'
    return canUseNodeAction(node) ? '预览参悟' : '查看条件'
  }

  const effectDisplay = (node: PotentialNodeDef): string => {
    const effect = POTENTIAL_EFFECT_VALUES[node.effectKey]
    const value = potentialStore.getPotentialEffectValue(node.effectKey)
    if (effect.unit === 'switch') return value > 0 ? effect.playerSummary : '参悟后显化提示能力。'
    return `${effect.label}：${formatPotentialEffectValue(effect, value)}`
  }

  const effectChangeDisplay = (node: PotentialNodeDef, beforeValue: number, afterValue: number): string => {
    const effect = POTENTIAL_EFFECT_VALUES[node.effectKey]
    if (effect.unit === 'switch') return afterValue > beforeValue ? effect.playerSummary : `${effect.label}保持显化。`
    const delta = Math.max(0, afterValue - beforeValue)
    return `${effect.label} +${formatPotentialEffectValue(effect, delta)}，当前 ${formatPotentialEffectValue(effect, afterValue)}。`
  }

  const effectValueDisplay = (node: PotentialNodeDef, value: number): string => {
    const effect = POTENTIAL_EFFECT_VALUES[node.effectKey]
    if (effect.unit === 'switch') return value > 0 ? effect.playerSummary : '尚未显化'
    return `${effect.label}：${formatPotentialEffectValue(effect, value)}`
  }

  const getNextEffectValue = (node: PotentialNodeDef): number => {
    const effect = POTENTIAL_EFFECT_VALUES[node.effectKey]
    const currentValue = potentialStore.getPotentialEffectValue(node.effectKey)
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return currentValue
    if (effect.unit === 'switch') return 1
    return Math.min(effect.cap, Math.max(0, currentValue + effect.valuePerRank))
  }

  const upgradePreview = computed(() => {
    const node = pendingUpgradeNode.value
    if (!node) return null
    const currentRank = potentialStore.getNodeRank(node.id)
    const nextRank = Math.min(node.maxRank, currentRank + 1)
    const beforeValue = potentialStore.getPotentialEffectValue(node.effectKey)
    const afterValue = getNextEffectValue(node)
    const reason = upgradeReason(node)
    const costRows = potentialStore.getNodeNextCost(node.id).map(cost => {
      const owned = potentialStore.getPotentialResource(cost.resourceId)
      return {
        ...cost,
        label: resourceLabel(cost.resourceId),
        owned,
        enough: owned >= cost.amount
      }
    })
    return {
      node,
      currentRank,
      nextRank,
      costRows,
      reason,
      canUpgrade: currentRank < node.maxRank && !reason,
      currentEffectText: effectValueDisplay(node, beforeValue),
      nextEffectText: effectValueDisplay(node, afterValue),
      deltaText: effectChangeDisplay(node, beforeValue, afterValue)
    }
  })

  const isRandomNpcGateReason = (node: PotentialNodeDef, reason: string): boolean =>
    node.unlockConditions.some(condition => condition.kind === 'randomNpcMilestone' && reason.includes(condition.label))

  const goToRandomNpcPanel = () => navigateToPanel('village')

  const nextStep = computed<PotentialNextStep>(() => {
    const ready = branchNodes.value.find(node => potentialStore.getNodeRank(node.id) < node.maxRank && potentialStore.canUpgradePotentialNode(node.id))
    if (ready) {
      return {
        tone: 'ready',
        label: '可参悟',
        icon: Sparkles,
        title: `推荐先点 ${ready.label}`,
        detail: `${ready.surface}会立刻生效：${effectDisplay(ready)}`
      }
    }

    const blocked = branchNodes.value.find(node => potentialStore.getNodeRank(node.id) < node.maxRank)
    if (blocked) {
      const reason = potentialStore.getPotentialNodeUpgradeReason(blocked.id)
      const randomNpcGate = isRandomNpcGateReason(blocked, reason)
      return {
        tone: reason.includes('不足') ? 'missing' : 'locked',
        label: reason.includes('不足') ? '缺材料' : '未解锁',
        icon: reason.includes('不足') ? AlertTriangle : LockKeyhole,
        title: `下一步：${blocked.label}`,
        detail: reason || '继续积累潜能材料后再来参悟。',
        action: randomNpcGate ? 'randomNpc' : undefined,
        actionLabel: randomNpcGate ? '去桃源村' : undefined
      }
    }

    return {
      tone: 'maxed',
      label: '已修满',
      icon: CheckCircle2,
      title: `${selectedBranch.value?.label ?? '本线'}已经修满`,
      detail: '可以切换到其他分线继续规划。'
    }
  })

  const respecPreviewText = computed(() => {
    if (!respecPreview.value.canRefund) return '本线还没有投入材料。'
    const refundText = costListDisplay(respecPreview.value.refunded)
    const retainedText = costListDisplay(respecPreview.value.retainedCost)
    return respecPreview.value.freeSeasonKey
      ? `本季首次重修会返还 ${refundText}。`
      : `重修会返还 ${refundText}，留下 ${retainedText} 作为修行损耗。`
  })

  const openUpgradePreview = (node: PotentialNodeDef) => {
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return
    pendingUpgradeNodeId.value = node.id
  }

  const closeUpgradePreview = () => {
    pendingUpgradeNodeId.value = null
  }

  const confirmUpgrade = () => {
    const node = pendingUpgradeNode.value
    if (!node) return
    if (!canUseNodeAction(node)) {
      showFloat(upgradeReason(node), 'danger')
      return
    }
    handleUpgrade(node)
    closeUpgradePreview()
  }

  const handleUpgrade = (node: PotentialNodeDef) => {
    if (!canUseNodeAction(node)) {
      showFloat(upgradeReason(node), 'danger')
      return
    }
    const beforeValue = potentialStore.getPotentialEffectValue(node.effectKey)
    const result = potentialStore.upgradePotentialNode(node.id)
    const rank = potentialStore.getNodeRank(node.id)
    const afterValue = potentialStore.getPotentialEffectValue(node.effectKey)
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      const effectText = effectChangeDisplay(node, beforeValue, afterValue)
      lastUnlockResult.value = {
        title: `${node.label} ${rank}/${node.maxRank}`,
        effectText,
        surface: node.surface
      }
      addLog(`【潜能】${result.message}${effectText}`)
    }
  }

  const handleRefundBranch = () => {
    const result = potentialStore.refundPotentialBranch(selectedBranchId.value)
    confirmRespecBranchId.value = null
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      addLog(`【潜能】${result.message}返还：${costListDisplay(result.refunded)}。`)
    }
  }
</script>

<style scoped>
  .potential-resource-grid,
  .potential-node-grid,
  .potential-source-grid {
    display: grid;
    gap: 0.5rem;
  }

  .potential-resource-grid {
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }

  .potential-node-grid {
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  }

  .potential-source-grid {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .potential-resource-tile,
  .potential-node,
  .potential-source-row {
    border: 1px solid rgb(var(--color-accent) / 0.18);
    border-radius: 2px;
    padding: 0.625rem;
    background: rgb(var(--color-panel) / 0.42);
  }

  .potential-unlock-result,
  .potential-next-step {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.625rem;
    border: 1px solid rgb(var(--color-accent) / 0.22);
    border-radius: 2px;
    padding: 0.625rem;
    background: rgb(var(--color-panel) / 0.5);
  }

  .potential-unlock-result {
    border-color: rgb(var(--color-success) / 0.35);
    background: rgb(var(--color-success) / 0.08);
  }

  .potential-next-step {
    justify-content: flex-start;
  }

  .potential-next-step-action {
    margin-left: auto;
    flex-shrink: 0;
  }

  .potential-next-step-ready {
    border-color: rgb(var(--color-success) / 0.32);
  }

  .potential-next-step-missing,
  .potential-next-step-locked {
    border-color: rgb(var(--color-warning) / 0.35);
  }

  .potential-next-step-maxed {
    border-color: rgb(var(--color-accent) / 0.28);
  }

  .potential-branch-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .potential-branch-tab,
  .potential-action-btn,
  .potential-plain-link,
  .potential-icon-link,
  .potential-danger-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-height: 2rem;
    border-radius: 2px;
    border: 1px solid rgb(var(--color-accent) / 0.22);
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }

  .potential-icon-link {
    min-height: 1.75rem;
    width: 1.75rem;
    padding: 0;
    color: rgb(var(--color-muted));
  }

  .potential-branch-tab {
    min-width: 0;
    flex-direction: column;
    color: rgb(var(--color-muted));
  }

  .potential-branch-tab-active {
    border-color: rgb(var(--color-accent) / 0.55);
    background: rgb(var(--color-accent) / 0.08);
    color: rgb(var(--color-accent));
  }

  .potential-rank-pill {
    flex-shrink: 0;
    border: 1px solid rgb(var(--color-accent) / 0.22);
    border-radius: 2px;
    padding: 0.125rem 0.375rem;
    color: rgb(var(--color-accent));
    font-size: 0.625rem;
    font-variant-numeric: tabular-nums;
  }

  .potential-status-badge,
  .potential-source-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.1875rem;
    min-height: 1.25rem;
    border: 1px solid rgb(var(--color-accent) / 0.18);
    border-radius: 2px;
    padding: 0.125rem 0.3125rem;
    font-size: 0.625rem;
    line-height: 1;
    white-space: nowrap;
  }

  .potential-status-ready {
    border-color: rgb(var(--color-success) / 0.3);
    color: rgb(var(--color-success));
    background: rgb(var(--color-success) / 0.07);
  }

  .potential-status-missing,
  .potential-status-locked {
    border-color: rgb(var(--color-warning) / 0.32);
    color: rgb(var(--color-warning));
    background: rgb(var(--color-warning) / 0.07);
  }

  .potential-status-maxed {
    color: rgb(var(--color-accent));
    background: rgb(var(--color-accent) / 0.06);
  }

  .potential-source-pill {
    color: rgb(var(--color-accent));
    background: rgb(var(--color-accent) / 0.06);
  }

  .potential-node {
    border-left-width: 3px;
  }

  .potential-node-ready {
    border-left-color: rgb(var(--color-success) / 0.75);
  }

  .potential-node-missing,
  .potential-node-locked {
    border-left-color: rgb(var(--color-warning) / 0.7);
  }

  .potential-node-maxed {
    border-left-color: rgb(var(--color-accent) / 0.75);
  }

  .potential-action-btn {
    width: 100%;
  }

  .potential-action-btn-ready,
  .potential-action-btn-secondary,
  .potential-plain-link {
    color: rgb(var(--color-accent));
  }

  .potential-action-btn-ready:hover,
  .potential-action-btn-secondary:hover,
  .potential-plain-link:hover {
    border-color: rgb(var(--color-accent) / 0.55);
    background: rgb(var(--color-accent) / 0.08);
  }

  .potential-action-btn-secondary {
    border-color: rgb(var(--color-warning) / 0.26);
    color: rgb(var(--color-warning));
  }

  .potential-action-btn-disabled,
  .potential-action-btn:disabled,
  .potential-plain-link:disabled {
    cursor: not-allowed;
    color: rgb(var(--color-muted) / 0.65);
    opacity: 0.7;
  }

  .potential-danger-link {
    border-color: rgb(var(--color-danger) / 0.35);
    color: rgb(var(--color-danger));
  }

  .potential-danger-link:hover {
    background: rgb(var(--color-danger) / 0.08);
  }

  .potential-source-progress {
    height: 0.3125rem;
    overflow: hidden;
    border: 1px solid rgb(var(--color-accent) / 0.12);
    border-radius: 999px;
    background: rgb(var(--color-muted) / 0.12);
  }

  .potential-source-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgb(var(--color-accent) / 0.72);
    transition: width 0.18s ease;
  }

  .potential-upgrade-backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgb(0 0 0 / 0.5);
  }

  .potential-upgrade-dialog {
    width: min(32rem, 100%);
    max-height: min(38rem, 88dvh);
    overflow: auto;
    border: 1px solid rgb(var(--color-accent) / 0.28);
    border-radius: 4px;
    padding: 0.875rem;
    background: rgb(var(--color-panel));
    box-shadow: 0 1.25rem 3rem rgb(0 0 0 / 0.35);
  }

  .potential-upgrade-rank,
  .potential-upgrade-effect,
  .potential-upgrade-costs {
    display: grid;
    gap: 0.5rem;
  }

  .potential-upgrade-rank {
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    border: 1px solid rgb(var(--color-accent) / 0.18);
    border-radius: 2px;
    padding: 0.5rem;
    color: rgb(var(--color-accent));
    text-align: center;
  }

  .potential-upgrade-effect {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .potential-upgrade-effect > div {
    min-width: 0;
    border: 1px solid rgb(var(--color-accent) / 0.14);
    border-radius: 2px;
    padding: 0.5rem;
    background: rgb(var(--color-bg) / 0.28);
  }

  .potential-upgrade-costs {
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  }

  .potential-upgrade-cost {
    border: 1px solid rgb(var(--color-accent) / 0.18);
    border-radius: 2px;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    line-height: 1.25;
  }

  .potential-upgrade-cost-ok {
    color: rgb(var(--color-success));
    background: rgb(var(--color-success) / 0.06);
  }

  .potential-upgrade-cost-missing {
    color: rgb(var(--color-warning));
    background: rgb(var(--color-warning) / 0.07);
  }

  .potential-upgrade-confirm {
    width: auto;
    min-width: 6.5rem;
  }

  @media (max-width: 420px) {
    .potential-next-step {
      flex-wrap: wrap;
    }

    .potential-next-step-action {
      width: 100%;
      margin-left: 0;
    }

    .potential-branch-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .potential-node-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .potential-upgrade-backdrop {
      align-items: flex-end;
      padding: 0.75rem;
    }

    .potential-upgrade-effect {
      grid-template-columns: minmax(0, 1fr);
    }

    .potential-upgrade-dialog {
      max-height: 84dvh;
    }
  }
</style>
