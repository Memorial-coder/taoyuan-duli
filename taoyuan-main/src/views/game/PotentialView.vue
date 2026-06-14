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

    <div class="potential-node-grid mb-3" data-testid="potential-node-grid">
      <article
        v-for="node in branchNodes"
        :key="node.id"
        class="potential-node"
        :data-testid="`potential-node-${node.id}`"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm" :class="potentialStore.getNodeRank(node.id) > 0 ? 'text-accent' : 'text-text'">
              {{ node.label }}
            </p>
            <p class="text-[0.625rem] text-muted mt-1 leading-relaxed">{{ node.summary }}</p>
          </div>
          <span class="potential-rank-pill">{{ potentialStore.getNodeRank(node.id) }}/{{ node.maxRank }}</span>
        </div>

        <div class="mt-2 border-t border-accent/10 pt-2">
          <p class="text-[0.625rem] text-muted">{{ node.surface }}</p>
          <p class="text-xs mt-1" :class="node.firstVersionConnected ? 'text-success' : 'text-muted'">
            {{ effectDisplay(node) }}
          </p>
        </div>

        <div class="mt-2 min-h-10">
          <p class="text-[0.625rem] text-muted">下一阶</p>
          <p class="text-xs text-accent leading-relaxed">{{ costDisplay(node) }}</p>
          <p v-if="upgradeReason(node)" class="text-[0.625rem] text-muted mt-1 leading-4">
            {{ upgradeReason(node) }}
          </p>
        </div>

        <button
          class="potential-action-btn mt-2"
          :class="potentialStore.canUpgradePotentialNode(node.id) ? 'potential-action-btn-ready' : 'potential-action-btn-disabled'"
          :disabled="!potentialStore.canUpgradePotentialNode(node.id)"
          @click="handleUpgrade(node.id)"
        >
          <Unlock :size="12" />
          <span>{{ potentialStore.getNodeRank(node.id) >= node.maxRank ? '已修满' : '参悟' }}</span>
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
      <div v-for="source in sourceRules" :key="source.id" class="potential-source-row">
        <p class="text-xs text-accent">{{ source.label }}</p>
        <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ source.summary }}</p>
        <p class="text-[0.625rem] text-muted/80 mt-1">
          {{ source.cap.period === 'daily' ? '每日' : source.cap.period === 'weekly' ? '每周' : '每季' }}最多 {{ source.cap.maxClaims }} 次
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { CheckCircle2, RotateCcw, Sparkles, Star, Unlock, X } from 'lucide-vue-next'
  import {
    POTENTIAL_EFFECT_VALUES,
    POTENTIAL_RESOURCE_DEFS,
    POTENTIAL_SOURCE_RULES,
    formatPotentialEffectValue
  } from '@/data/potential'
  import { navigateToPanel } from '@/composables/useNavigation'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { usePotentialStore } from '@/stores/usePotentialStore'
  import type { PotentialBranchId, PotentialNodeDef, PotentialNodeId, PotentialResourceCost } from '@/types'

  const potentialStore = usePotentialStore()
  const selectedBranchId = ref<PotentialBranchId>('body')
  const confirmRespecBranchId = ref<PotentialBranchId | null>(null)

  const resourceRows = computed(() =>
    POTENTIAL_RESOURCE_DEFS.map(resource => ({
      ...resource,
      amount: potentialStore.getPotentialResource(resource.id)
    }))
  )

  const branchRows = computed(() => potentialStore.branchSummaries)
  const selectedBranch = computed(() => branchRows.value.find(branch => branch.id === selectedBranchId.value) ?? branchRows.value[0])
  const branchNodes = computed(() => potentialStore.getBranchNodes(selectedBranchId.value))
  const sourceRules = computed(() => POTENTIAL_SOURCE_RULES)
  const respecPreview = computed(() => potentialStore.getPotentialBranchRefundPreview(selectedBranchId.value))

  const resourceLabel = (resourceId: PotentialResourceCost['resourceId']): string =>
    POTENTIAL_RESOURCE_DEFS.find(resource => resource.id === resourceId)?.label ?? resourceId

  const costListDisplay = (costs: PotentialResourceCost[]): string =>
    costs.length > 0 ? costs.map(cost => `${resourceLabel(cost.resourceId)} ${cost.amount}`).join('、') : '无需材料'

  const costDisplay = (node: PotentialNodeDef): string => {
    if (potentialStore.getNodeRank(node.id) >= node.maxRank) return '已经修满'
    return costListDisplay(potentialStore.getNodeNextCost(node.id))
  }

  const upgradeReason = (node: PotentialNodeDef): string => potentialStore.getPotentialNodeUpgradeReason(node.id)

  const effectDisplay = (node: PotentialNodeDef): string => {
    const effect = POTENTIAL_EFFECT_VALUES[node.effectKey]
    const value = potentialStore.getPotentialEffectValue(node.effectKey)
    if (!effect.firstVersionConnected) return potentialStore.getNodeRank(node.id) > 0 ? '已参悟，后续修行中显化。' : effect.playerSummary
    if (effect.unit === 'switch') return value > 0 ? effect.playerSummary : '参悟后显化提示能力。'
    return `${effect.label}：${formatPotentialEffectValue(effect, value)}`
  }

  const respecPreviewText = computed(() => {
    if (!respecPreview.value.canRefund) return '本线还没有投入材料。'
    const refundText = costListDisplay(respecPreview.value.refunded)
    const retainedText = costListDisplay(respecPreview.value.retainedCost)
    return respecPreview.value.freeSeasonKey
      ? `本季首次重修会返还 ${refundText}。`
      : `重修会返还 ${refundText}，留下 ${retainedText} 作为修行损耗。`
  })

  const handleUpgrade = (nodeId: PotentialNodeId) => {
    const result = potentialStore.upgradePotentialNode(nodeId)
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (result.success) addLog(`【潜能】${result.message}`)
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

  .potential-branch-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .potential-branch-tab,
  .potential-action-btn,
  .potential-plain-link,
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

  .potential-action-btn {
    width: 100%;
  }

  .potential-action-btn-ready,
  .potential-plain-link {
    color: rgb(var(--color-accent));
  }

  .potential-action-btn-ready:hover,
  .potential-plain-link:hover {
    border-color: rgb(var(--color-accent) / 0.55);
    background: rgb(var(--color-accent) / 0.08);
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

  @media (max-width: 420px) {
    .potential-branch-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .potential-node-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
