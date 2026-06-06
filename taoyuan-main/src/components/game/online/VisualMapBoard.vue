<template>
  <section class="visual-map-board" data-testid="visual-map-board">
    <div class="visual-map-board__canvas" role="group" aria-label="可视化地图">
      <svg class="visual-map-board__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line
          v-for="link in visibleLinks"
          :key="link.id"
          :x1="link.from.x"
          :y1="link.from.y"
          :x2="link.to.x"
          :y2="link.to.y"
          class="visual-map-board__link"
          :class="`visual-map-board__link--${link.tone}`"
        />
      </svg>

      <button
        v-for="node in visibleNodes"
        :key="node.id"
        type="button"
        class="visual-map-board__node"
        :class="[
          `visual-map-board__node--${node.state}`,
          { 'visual-map-board__node--selected': node.id === activeNodeId },
          { 'visual-map-board__node--current': node.id === currentNode?.id },
        ]"
        :style="{ left: `${node.x}%`, top: `${node.y}%` }"
        :data-testid="`visual-map-node-${node.id}`"
        :aria-label="nodeAriaLabel(node)"
        :title="nodeTooltip(node)"
        @click="selectNode(node.id)"
      >
        <component :is="nodeIcon(node)" :size="15" aria-hidden="true" />
        <span class="visual-map-board__node-label">{{ node.label || node.kind || node.id }}</span>
      </button>

      <div
        v-if="currentNode"
        class="visual-map-board__party-marker"
        :style="{ left: `${currentNode.x}%`, top: `${currentNode.y}%` }"
        aria-hidden="true"
      >
        <MapPin :size="13" />
        <span>队伍</span>
      </div>
    </div>

    <div v-if="visibleNodes.length > 0" class="visual-map-board__mobile-list" aria-label="地图节点列表">
      <button
        v-for="node in visibleNodes"
        :key="`mobile-${node.id}`"
        type="button"
        class="visual-map-board__mobile-node"
        :class="{
          'visual-map-board__mobile-node--selected': node.id === activeNodeId,
          'visual-map-board__mobile-node--current': node.id === currentNode?.id,
        }"
        @click="selectNode(node.id)"
      >
        <component :is="nodeIcon(node)" :size="14" aria-hidden="true" />
        <span>{{ node.label || node.kind || node.id }}</span>
        <small>{{ node.id === currentNode?.id ? '队伍所在' : stateLabel(node.state) }}</small>
      </button>
    </div>

    <div class="visual-map-board__side">
      <template v-if="!isCompactViewport">
        <div v-if="selectedNode" class="visual-map-board__detail" data-testid="visual-map-node-detail">
          <div class="visual-map-board__detail-head">
            <div class="min-w-0">
              <p class="visual-map-board__title">{{ selectedNode.label || selectedNode.id }}</p>
              <p class="visual-map-board__meta">{{ stateLabel(selectedNode.state) }} · {{ selectedNode.kind || 'node' }}</p>
              <p v-if="selectedNode.id === currentNode?.id" class="visual-map-board__current-text">队伍当前位置</p>
            </div>
            <span v-if="selectedNode.claimed_by || selectedNode.owner_username" class="visual-map-board__claim">
              {{ selectedNode.claimed_by || selectedNode.owner_username }}
            </span>
          </div>

          <div class="visual-map-board__preview-grid">
            <p v-if="selectedNode.risk_preview" class="visual-map-board__preview visual-map-board__preview--risk">
              {{ selectedNode.risk_preview }}
            </p>
            <p v-if="selectedNode.reward_preview" class="visual-map-board__preview visual-map-board__preview--reward">
              {{ selectedNode.reward_preview }}
            </p>
          </div>

          <div
            v-if="selectedNodeFailureReason || selectedNodeImpactText"
            class="visual-map-board__readable-feedback"
            data-testid="visual-map-readable-feedback"
          >
            <p v-if="selectedNodeFailureReason" class="visual-map-board__readable-line visual-map-board__readable-line--warning">
              失败原因：{{ selectedNodeFailureReason }}
            </p>
            <p v-if="selectedNodeImpactText" class="visual-map-board__readable-line">
              影响范围：{{ selectedNodeImpactText }}
            </p>
          </div>

          <OnlineTechnicalDetails
            v-if="selectedNodeTechnicalReason"
            class="visual-map-board__technical-details"
            title="规则细节"
            summary="展开查看节点状态与可行动作判断。"
          >
            <p data-testid="visual-map-technical-reason">{{ selectedNodeTechnicalReason }}</p>
          </OnlineTechnicalDetails>

          <div v-if="resourcePreviewText(selectedNode.resource_cost_preview)" class="visual-map-board__resource">
            消耗：{{ resourcePreviewText(selectedNode.resource_cost_preview) }}
          </div>
          <div v-if="resourcePreviewText(selectedNode.resource_reward_preview)" class="visual-map-board__resource">
            产出：{{ resourcePreviewText(selectedNode.resource_reward_preview) }}
          </div>

          <div v-if="selectedNode.available_action_ids.length > 0" class="visual-map-board__actions">
            <button
              v-for="actionId in selectedNode.available_action_ids"
              :key="`${selectedNode.id}-${actionId}`"
              type="button"
              class="visual-map-board__action"
              :data-testid="`visual-map-action-${actionId}`"
              :disabled="actionRunning"
              :title="actionId"
              @click="$emit('trigger-action', { nodeId: selectedNode.id, actionId })"
            >
              <Play :size="13" aria-hidden="true" />
              <span>{{ actionLabel(actionId) }}</span>
            </button>
          </div>
        </div>

        <div v-else class="visual-map-board__empty">
          <MapPin :size="16" aria-hidden="true" />
          <span>选择一个节点</span>
        </div>

        <p
          v-if="recentFeedback"
          :key="feedbackAnimationKey"
          class="visual-map-board__feedback"
          data-testid="visual-map-action-result"
          aria-live="polite"
        >
          行动结果：{{ recentFeedback }}
        </p>
      </template>

      <template v-else>
        <button
          v-if="selectedNode"
          type="button"
          class="visual-map-board__mobile-detail-trigger"
          data-testid="visual-map-detail-sheet-trigger"
          @click="openDetailSheet"
        >
          <span>已选择 {{ selectedNode.label || selectedNode.id }}</span>
          <small>{{ selectedNode.available_action_ids.length > 0 ? '查看详情和行动' : '查看详情' }}</small>
        </button>

        <div v-else class="visual-map-board__empty">
          <MapPin :size="16" aria-hidden="true" />
          <span>选择一个节点</span>
        </div>

        <p
          v-if="recentFeedback"
          :key="feedbackAnimationKey"
          class="visual-map-board__feedback"
          data-testid="visual-map-mobile-action-result"
          aria-live="polite"
        >
          行动结果：{{ recentFeedback }}
        </p>
      </template>
    </div>

    <OnlineBottomSheet
      v-if="selectedNode && isCompactViewport"
      :open="detailSheetOpen"
      :title="selectedNode.label || selectedNode.id"
      :description="`${stateLabel(selectedNode.state)} · ${selectedNode.kind || 'node'}`"
      side="bottom"
      initial-focus=".visual-map-board__action"
      @close="closeDetailSheet"
    >
      <div class="visual-map-board__detail visual-map-board__detail--sheet" data-testid="visual-map-node-detail">
        <div class="visual-map-board__detail-head">
          <div class="min-w-0">
            <p class="visual-map-board__title">{{ selectedNode.label || selectedNode.id }}</p>
            <p class="visual-map-board__meta">{{ stateLabel(selectedNode.state) }} · {{ selectedNode.kind || 'node' }}</p>
            <p v-if="selectedNode.id === currentNode?.id" class="visual-map-board__current-text">队伍当前位置</p>
          </div>
          <span v-if="selectedNode.claimed_by || selectedNode.owner_username" class="visual-map-board__claim">
            {{ selectedNode.claimed_by || selectedNode.owner_username }}
          </span>
        </div>

        <div class="visual-map-board__preview-grid">
          <p v-if="selectedNode.risk_preview" class="visual-map-board__preview visual-map-board__preview--risk">
            {{ selectedNode.risk_preview }}
          </p>
          <p v-if="selectedNode.reward_preview" class="visual-map-board__preview visual-map-board__preview--reward">
            {{ selectedNode.reward_preview }}
          </p>
        </div>

        <div
          v-if="selectedNodeFailureReason || selectedNodeImpactText"
          class="visual-map-board__readable-feedback"
          data-testid="visual-map-readable-feedback"
        >
          <p v-if="selectedNodeFailureReason" class="visual-map-board__readable-line visual-map-board__readable-line--warning">
            失败原因：{{ selectedNodeFailureReason }}
          </p>
          <p v-if="selectedNodeImpactText" class="visual-map-board__readable-line">
            影响范围：{{ selectedNodeImpactText }}
          </p>
        </div>

        <OnlineTechnicalDetails
          v-if="selectedNodeTechnicalReason"
          class="visual-map-board__technical-details"
          title="规则细节"
          summary="展开查看节点状态与可行动作判断。"
        >
          <p data-testid="visual-map-technical-reason">{{ selectedNodeTechnicalReason }}</p>
        </OnlineTechnicalDetails>

        <div v-if="resourcePreviewText(selectedNode.resource_cost_preview)" class="visual-map-board__resource">
          消耗：{{ resourcePreviewText(selectedNode.resource_cost_preview) }}
        </div>
        <div v-if="resourcePreviewText(selectedNode.resource_reward_preview)" class="visual-map-board__resource">
          产出：{{ resourcePreviewText(selectedNode.resource_reward_preview) }}
        </div>

        <div v-if="selectedNode.available_action_ids.length > 0" class="visual-map-board__actions">
          <button
            v-for="actionId in selectedNode.available_action_ids"
            :key="`${selectedNode.id}-${actionId}`"
            type="button"
            class="visual-map-board__action"
            :data-testid="`visual-map-action-${actionId}`"
            :disabled="actionRunning"
            :title="actionId"
            @click="$emit('trigger-action', { nodeId: selectedNode.id, actionId })"
          >
            <Play :size="13" aria-hidden="true" />
            <span>{{ actionLabel(actionId) }}</span>
          </button>
        </div>
      </div>

      <p
        v-if="recentFeedback"
        :key="feedbackAnimationKey"
        class="visual-map-board__feedback"
        data-testid="visual-map-action-result"
        aria-live="polite"
      >
        行动结果：{{ recentFeedback }}
      </p>
    </OnlineBottomSheet>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { AlertTriangle, Circle, DoorOpen, Gift, MapPin, Pickaxe, Play, Shield } from 'lucide-vue-next'
  import OnlineBottomSheet from '@/components/game/online/OnlineBottomSheet.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import type { Component } from 'vue'
  import type { OnlineVisualNode } from '@/types/onlineVisual'

  const props = withDefaults(defineProps<{
    nodes: OnlineVisualNode[]
    selectedNodeId?: string
    currentNodeId?: string
    recentFeedback?: string
    revision?: number
    actionRunning?: boolean
    actionLabels?: Record<string, string>
  }>(), {
    selectedNodeId: '',
    currentNodeId: '',
    recentFeedback: '',
    revision: 0,
    actionRunning: false,
    actionLabels: () => ({}),
  })

  const emit = defineEmits<{
    (event: 'select-node', nodeId: string): void
    (event: 'trigger-action', payload: { nodeId: string, actionId: string }): void
  }>()

  const visibleNodes = computed(() => props.nodes.filter(node => node.state !== 'hidden'))
  const nodeById = computed(() => new Map(visibleNodes.value.map(node => [node.id, node])))
  const detailSheetOpen = ref(false)
  const isCompactViewport = ref(false)
  let viewportQuery: MediaQueryList | null = null
  const activeNodeId = computed(() => {
    if (props.selectedNodeId && nodeById.value.has(props.selectedNodeId)) return props.selectedNodeId
    return visibleNodes.value[0]?.id || ''
  })
  const selectedNode = computed(() => nodeById.value.get(activeNodeId.value) || null)
  const currentNode = computed(() => (props.currentNodeId ? nodeById.value.get(props.currentNodeId) : null) || null)
  const feedbackAnimationKey = computed(() => `${props.revision}:${props.recentFeedback}`)
  const selectedNodeFailureReason = computed(() => {
    const node = selectedNode.value
    if (!node) return ''
    if (node.available_action_ids.length > 0) return ''
    if (node.state === 'locked') return '节点尚未解锁，请先处理相邻节点或稍后再试。'
    if (node.state === 'resolved') return '节点已经处理完成，当前不能重复行动。'
    if (node.state === 'hidden') return '节点尚未公开，不能直接提交行动。'
    return '当前节点没有可用行动，需刷新房间或选择其它节点。'
  })
  const selectedNodeTechnicalReason = computed(() => {
    const node = selectedNode.value
    if (!node || node.available_action_ids.length > 0) return ''
    const connected = node.connected_node_ids.length > 0 ? node.connected_node_ids.join(', ') : 'none'
    return `state=${node.state}; available_action_ids=${node.available_action_ids.length}; connected_node_ids=${connected}; current_node=${node.id === currentNode.value?.id ? 'true' : 'false'}`
  })
  const selectedNodeImpactText = computed(() => {
    const node = selectedNode.value
    if (!node) return ''
    const parts = [
      node.risk_preview ? `风险：${node.risk_preview}` : '',
      node.reward_preview ? `收益：${node.reward_preview}` : '',
      resourcePreviewText(node.resource_cost_preview) ? `消耗 ${resourcePreviewText(node.resource_cost_preview)}` : '',
      resourcePreviewText(node.resource_reward_preview) ? `产出 ${resourcePreviewText(node.resource_reward_preview)}` : '',
    ].filter(Boolean)
    return parts.join('；')
  })

  const visibleLinks = computed(() => {
    const seen = new Set<string>()
    return visibleNodes.value.flatMap(from => from.connected_node_ids.map(targetId => {
      const to = nodeById.value.get(targetId)
      if (!to) return null
      const id = [from.id, to.id].sort().join('__')
      if (seen.has(id)) return null
      seen.add(id)
      return {
        id,
        from,
        to,
        tone: from.state === 'locked' || to.state === 'locked' ? 'muted' : 'active',
      }
    }).filter(Boolean) as Array<{ id: string, from: OnlineVisualNode, to: OnlineVisualNode, tone: 'active' | 'muted' }>)
  })

  const selectNode = (nodeId: string) => {
    emit('select-node', nodeId)
    if (isCompactViewport.value) detailSheetOpen.value = true
  }

  const openDetailSheet = () => {
    detailSheetOpen.value = true
  }

  const closeDetailSheet = () => {
    detailSheetOpen.value = false
  }

  const updateViewportMode = () => {
    isCompactViewport.value = Boolean(viewportQuery?.matches)
    if (!isCompactViewport.value) closeDetailSheet()
  }

  const stateLabel = (state: OnlineVisualNode['state']) => ({
    hidden: '未知',
    locked: '锁定',
    available: '可行动',
    active: '处理中',
    resolved: '已处理',
    danger: '危险',
    reward: '奖励',
    exit: '撤离',
  }[state] || state)

  const nodeIcon = (node: OnlineVisualNode): Component => {
    if (node.state === 'danger') return AlertTriangle
    if (node.state === 'reward') return Gift
    if (node.state === 'exit') return DoorOpen
    if (node.kind.includes('ore') || node.kind.includes('mine')) return Pickaxe
    if (node.state === 'resolved') return Shield
    return Circle
  }

  const nodeTooltip = (node: OnlineVisualNode) => {
    const label = node.label || node.id
    const status = stateLabel(node.state)
    const current = node.id === currentNode.value?.id ? ' · 队伍当前位置' : ''
    return node.risk_preview ? `${label} · ${status}${current} · ${node.risk_preview}` : `${label} · ${status}${current}`
  }

  const nodeAriaLabel = (node: OnlineVisualNode) => {
    const label = node.label || node.id
    const current = node.id === currentNode.value?.id ? '，队伍当前位置' : ''
    return `${label}，${stateLabel(node.state)}${current}`
  }

  const actionLabel = (actionId: string) => props.actionLabels[actionId] || actionId.split('_').join(' ')

  const resourcePreviewText = (preview: Record<string, number>) => Object.entries(preview || {})
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => `${id} x${amount}`)
    .join('、')

  onMounted(() => {
    if (typeof window === 'undefined') return
    viewportQuery = window.matchMedia('(max-width: 760px)')
    updateViewportMode()
    viewportQuery.addEventListener('change', updateViewportMode)
  })

  onBeforeUnmount(() => {
    viewportQuery?.removeEventListener('change', updateViewportMode)
  })
</script>

<style scoped>
  .visual-map-board {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(14rem, 0.8fr);
    gap: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    background: rgb(var(--color-bg) / 0.16);
    padding: 0.75rem;
  }

  .visual-map-board__canvas {
    position: relative;
    min-height: 18rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 7%, transparent) 1px, transparent 1px),
      linear-gradient(0deg, color-mix(in srgb, var(--color-accent) 6%, transparent) 1px, transparent 1px),
      rgb(0 0 0 / 0.12);
    background-size: 2.5rem 2.5rem;
  }

  .visual-map-board__links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .visual-map-board__link {
    stroke-width: 0.65;
    vector-effect: non-scaling-stroke;
  }

  .visual-map-board__link--active {
    stroke: color-mix(in srgb, var(--color-accent) 58%, transparent);
  }

  .visual-map-board__link--muted {
    stroke: color-mix(in srgb, var(--color-muted) 28%, transparent);
    stroke-dasharray: 3 3;
  }

  .visual-map-board__node {
    position: absolute;
    z-index: 1;
    display: inline-flex;
    max-width: 7.5rem;
    min-width: var(--online-visual-touch-target, 44px);
    min-height: var(--online-visual-touch-target, 44px);
    translate: -50% -50%;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 34%, transparent);
    background: rgb(var(--color-bg) / 0.9);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.45rem;
    font-size: 0.68rem;
    line-height: 1;
    text-align: center;
    box-shadow: 0 0.4rem 1.2rem rgb(0 0 0 / 0.2);
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
  }

  .visual-map-board__node:hover,
  .visual-map-board__node:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent) 80%, transparent);
    transform: translateY(-1px);
    outline: none;
  }

  .visual-map-board__node--selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  }

  .visual-map-board__node--current {
    border-color: color-mix(in srgb, var(--color-success) 78%, transparent);
    box-shadow: 0 0.4rem 1.2rem rgb(0 0 0 / 0.2), 0 0 0 3px color-mix(in srgb, var(--color-success) 18%, transparent);
  }

  .visual-map-board__node--locked {
    color: var(--color-muted);
    border-color: color-mix(in srgb, var(--color-muted) 22%, transparent);
  }

  .visual-map-board__node--danger {
    border-color: color-mix(in srgb, #d4976a 75%, transparent);
    color: #d4976a;
  }

  .visual-map-board__node--reward,
  .visual-map-board__node--exit {
    border-color: color-mix(in srgb, var(--color-success) 72%, transparent);
    color: var(--color-success);
  }

  .visual-map-board__node-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .visual-map-board__party-marker {
    position: absolute;
    z-index: 2;
    display: inline-flex;
    min-height: 1.45rem;
    translate: -50% calc(-100% - 0.65rem);
    align-items: center;
    gap: 0.2rem;
    border: 1px solid color-mix(in srgb, var(--color-success) 62%, transparent);
    background: rgb(var(--color-bg) / 0.94);
    color: var(--color-success);
    padding: 0.15rem 0.4rem;
    font-size: 0.65rem;
    line-height: 1;
    pointer-events: none;
    box-shadow: 0 0.35rem 1rem rgb(0 0 0 / 0.22);
  }

  .visual-map-board__party-marker::after {
    position: absolute;
    left: 50%;
    bottom: -0.35rem;
    width: 0.5rem;
    height: 0.5rem;
    translate: -50% 0;
    rotate: 45deg;
    border-right: 1px solid color-mix(in srgb, var(--color-success) 62%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-success) 62%, transparent);
    background: rgb(var(--color-bg) / 0.94);
    content: '';
  }

  .visual-map-board__mobile-list {
    display: none;
  }

  .visual-map-board__side {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.5rem;
  }

  .visual-map-board__detail,
  .visual-map-board__empty,
  .visual-map-board__mobile-detail-trigger,
  .visual-map-board__feedback {
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.625rem;
  }

  .visual-map-board__mobile-detail-trigger {
    display: flex;
    min-height: var(--online-visual-touch-target, 44px);
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: rgb(var(--color-text));
    text-align: left;
  }

  .visual-map-board__mobile-detail-trigger small {
    flex-shrink: 0;
    color: var(--color-accent);
    font-size: 0.68rem;
    line-height: 1.2;
  }

  .visual-map-board__detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .visual-map-board__title {
    overflow: hidden;
    color: var(--color-accent);
    font-size: 0.82rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .visual-map-board__meta,
  .visual-map-board__claim,
  .visual-map-board__resource,
  .visual-map-board__current-text,
  .visual-map-board__feedback {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .visual-map-board__claim {
    flex-shrink: 0;
    color: var(--color-accent);
  }

  .visual-map-board__current-text {
    margin-top: 0.18rem;
    color: var(--color-success);
  }

  .visual-map-board__preview-grid,
  .visual-map-board__readable-feedback,
  .visual-map-board__actions {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.625rem;
  }

  .visual-map-board__preview {
    font-size: 0.68rem;
    line-height: 1.5;
  }

  .visual-map-board__preview--risk {
    color: #d4976a;
  }

  .visual-map-board__preview--reward {
    color: var(--color-success);
  }

  .visual-map-board__readable-feedback {
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.45rem;
  }

  .visual-map-board__readable-line {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .visual-map-board__readable-line--warning {
    color: #d4976a;
  }

  .visual-map-board__technical-details {
    margin-top: 0.625rem;
  }

  .visual-map-board__action {
    display: inline-flex;
    min-height: var(--online-visual-touch-target, 44px);
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 28%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    line-height: 1.1;
  }

  .visual-map-board__action:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .visual-map-board__empty {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  .visual-map-board__feedback {
    animation: visual-map-feedback-pop 0.34s ease-out;
  }

  @keyframes visual-map-feedback-pop {
    from {
      border-color: color-mix(in srgb, var(--color-success) 44%, transparent);
      background: color-mix(in srgb, var(--color-success) 12%, transparent);
      transform: translateY(0.2rem);
      opacity: 0.35;
    }

    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 760px) {
    .visual-map-board {
      grid-template-columns: 1fr;
    }

    .visual-map-board__canvas {
      min-height: 16rem;
      overflow-x: auto;
    }

    .visual-map-board__mobile-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .visual-map-board__mobile-node {
      display: grid;
      min-height: calc(var(--online-visual-touch-target, 44px) + 0.45rem);
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 0.25rem 0.4rem;
      border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
      background: rgb(0 0 0 / 0.1);
      color: rgb(var(--color-text));
      padding: 0.45rem;
      text-align: left;
    }

    .visual-map-board__mobile-node span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.72rem;
    }

    .visual-map-board__mobile-node small {
      grid-column: 2;
      color: var(--color-muted);
      font-size: 0.62rem;
      line-height: 1;
    }

    .visual-map-board__mobile-node--selected {
      border-color: color-mix(in srgb, var(--color-accent) 68%, transparent);
      background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    }

    .visual-map-board__mobile-node--current {
      border-color: color-mix(in srgb, var(--color-success) 58%, transparent);
    }
  }
</style>
