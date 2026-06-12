<template>
  <section class="region-exploration-tree" data-testid="region-exploration-tree">
    <div class="region-exploration-tree__head">
      <div class="min-w-0">
        <p class="region-exploration-tree__eyebrow">区域探索树</p>
        <p class="region-exploration-tree__title">{{ regionName }}</p>
        <p class="region-exploration-tree__summary">{{ summary }}</p>
      </div>
      <div class="region-exploration-tree__stats">
        <span>{{ visibleNodeCount }}/{{ nodes.length }} 已显形</span>
        <span>{{ actionableNodeCount }} 个可处理</span>
      </div>
    </div>

    <div class="region-exploration-tree__body">
      <div class="region-exploration-tree__canvas" role="group" :aria-label="`${regionName}探索树`">
        <svg class="region-exploration-tree__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line
            v-for="link in visibleLinks"
            :key="link.key"
            :x1="link.from.x"
            :y1="link.from.y"
            :x2="link.to.x"
            :y2="link.to.y"
            class="region-exploration-tree__link"
            :class="[
              `region-exploration-tree__link--${link.tone}`,
              {
                'region-exploration-tree__link--dashed': link.dashed,
                'region-exploration-tree__link--active': link.active
              }
            ]"
          />
        </svg>

        <button
          v-for="node in nodes"
          :key="node.key"
          type="button"
          class="region-exploration-tree__node"
          :class="[
            `region-exploration-tree__node--${node.type}`,
            `region-exploration-tree__node--${node.status}`,
            {
              'region-exploration-tree__node--selected': selectedNode?.key === node.key,
              'region-exploration-tree__node--current': node.current,
              'region-exploration-tree__node--highlighted': node.highlighted
            }
          ]"
          :style="{ left: `${node.x}%`, top: `${node.y}%` }"
          :data-testid="`region-tree-node-${node.key}`"
          :aria-label="nodeAriaLabel(node)"
          :title="node.disabledReason || node.description"
          @click="selectNode(node.key)"
        >
          <component :is="getNodeIcon(node.type)" :size="15" aria-hidden="true" />
          <span class="region-exploration-tree__node-label">{{ node.title }}</span>
          <span v-if="node.current" class="region-exploration-tree__current-dot" aria-hidden="true" />
        </button>
      </div>

      <aside class="region-exploration-tree__detail" data-testid="region-tree-node-detail">
        <template v-if="selectedNode">
          <div class="region-exploration-tree__detail-head">
            <div class="min-w-0">
              <p class="region-exploration-tree__detail-kicker" :class="selectedNode.laneToneClass">
                {{ selectedNode.laneLabel }} / {{ selectedNode.stageLabel }}
              </p>
              <p class="region-exploration-tree__detail-title">{{ selectedNode.title }}</p>
              <p class="region-exploration-tree__detail-summary">{{ selectedNode.description }}</p>
            </div>
            <span class="region-exploration-tree__status" :class="selectedNode.stageToneClass">
              {{ selectedNode.stageLabel }}
            </span>
          </div>

          <div v-if="selectedNode.badges.length > 0" class="region-exploration-tree__badges">
            <span v-for="badge in selectedNode.badges" :key="`${selectedNode.key}-${badge}`">{{ badge }}</span>
          </div>

          <div class="region-exploration-tree__preview-grid">
            <p v-if="selectedNode.riskPreview" class="region-exploration-tree__preview region-exploration-tree__preview--risk">
              {{ selectedNode.riskPreview }}
            </p>
            <p v-if="selectedNode.rewardPreview" class="region-exploration-tree__preview region-exploration-tree__preview--reward">
              {{ selectedNode.rewardPreview }}
            </p>
          </div>

          <div v-if="selectedNode.detailLines.length > 0" class="region-exploration-tree__lines">
            <p v-for="line in selectedNode.detailLines.slice(0, 5)" :key="`${selectedNode.key}-${line}`">
              {{ line }}
            </p>
          </div>

          <p v-if="selectedNode.disabled && selectedNode.disabledReason" class="region-exploration-tree__disabled">
            {{ selectedNode.disabledReason }}
          </p>

          <div v-if="selectedNode.linkedPanels.length > 0" class="region-exploration-tree__linked">
            <button
              v-for="panel in selectedNode.linkedPanels"
              :key="`${selectedNode.key}-${panel.key}`"
              type="button"
              class="region-exploration-tree__link-button"
              @click="$emit('navigate', panel.key)"
            >
              <Link2 :size="13" aria-hidden="true" />
              <span>{{ panel.label }}</span>
            </button>
          </div>

          <button
            v-if="selectedNode.actionLabel"
            type="button"
            class="region-exploration-tree__action"
            :disabled="selectedNode.disabled"
            :title="selectedNode.disabledReason"
            :data-testid="`region-tree-action-${selectedNode.key}`"
            @click="$emit('trigger-action', selectedNode)"
          >
            <Play :size="13" aria-hidden="true" />
            <span>{{ selectedNode.actionLabel }}</span>
          </button>
        </template>

        <template v-else>
          <div class="region-exploration-tree__empty">
            <MapPin :size="16" aria-hidden="true" />
            <span>选择一个节点查看详情</span>
          </div>
        </template>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import {
    Box,
    CircleHelp,
    Compass,
    GitBranch,
    Landmark,
    Link2,
    MapPin,
    PawPrint,
    Pickaxe,
    Play,
    Route,
    ScrollText,
    ShieldAlert,
    Skull,
    Swords,
    Tent,
    Trees
  } from 'lucide-vue-next'
  import type {
    RegionExplorationTreeLink,
    RegionExplorationTreeNode,
    RegionExplorationTreeNodeType
  } from '@/types/region'

  const props = defineProps<{
    regionName: string
    summary: string
    nodes: RegionExplorationTreeNode[]
    links: RegionExplorationTreeLink[]
    initialNodeKey?: string
  }>()

  const emit = defineEmits<{
    (event: 'select-node', node: RegionExplorationTreeNode): void
    (event: 'trigger-action', node: RegionExplorationTreeNode): void
    (event: 'navigate', panelKey: string): void
  }>()

  const selectedNodeKey = ref('')
  type ResolvedRegionTreeLink = Omit<RegionExplorationTreeLink, 'from' | 'to'> & {
    from: RegionExplorationTreeNode
    to: RegionExplorationTreeNode
  }

  const nodeByKey = computed(() => new Map(props.nodes.map(node => [node.key, node])))

  const selectedNode = computed(() =>
    nodeByKey.value.get(selectedNodeKey.value) ??
    props.nodes.find(node => node.current) ??
    props.nodes.find(node => !node.disabled && node.type !== 'root') ??
    props.nodes[0] ??
    null
  )

  const visibleNodeCount = computed(() => props.nodes.filter(node => node.status !== 'unknown').length)
  const actionableNodeCount = computed(() => props.nodes.filter(node => node.actionLabel && !node.disabled).length)

  const visibleLinks = computed(() =>
    props.links
      .map(link => {
        const from = nodeByKey.value.get(link.from)
        const to = nodeByKey.value.get(link.to)
        return from && to ? { ...link, from, to } : null
      })
      .filter((link): link is ResolvedRegionTreeLink => Boolean(link))
  )

  const selectNode = (nodeKey: string) => {
    selectedNodeKey.value = nodeKey
    const node = nodeByKey.value.get(nodeKey)
    if (node) emit('select-node', node)
  }

  watch(
    () => [props.initialNodeKey, props.nodes.map(node => node.key).join('|')],
    () => {
      const preferred = props.initialNodeKey && nodeByKey.value.has(props.initialNodeKey)
        ? props.initialNodeKey
        : props.nodes.find(node => node.current)?.key ?? props.nodes.find(node => !node.disabled && node.type !== 'root')?.key ?? props.nodes[0]?.key ?? ''
      if (!selectedNodeKey.value || !nodeByKey.value.has(selectedNodeKey.value)) selectedNodeKey.value = preferred
    },
    { immediate: true }
  )

  const nodeAriaLabel = (node: RegionExplorationTreeNode) =>
    `${node.title}，${node.laneLabel}，${node.stageLabel}${node.disabled ? `，${node.disabledReason}` : ''}`

  const getNodeIcon = (type: RegionExplorationTreeNodeType) => {
    switch (type) {
      case 'root':
        return Landmark
      case 'route':
        return Route
      case 'camp':
        return Tent
      case 'boss':
        return Skull
      case 'chest':
        return Box
      case 'monster':
        return Swords
      case 'animal':
        return PawPrint
      case 'tree':
        return Trees
      case 'event':
        return GitBranch
      case 'rumor':
        return ScrollText
      case 'resource':
        return Pickaxe
      case 'anomaly':
        return ShieldAlert
      case 'handoff':
        return Compass
      default:
        return CircleHelp
    }
  }
</script>

<style scoped>
  .region-exploration-tree {
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.16);
    border-radius: 4px;
    background:
      linear-gradient(135deg, rgb(var(--color-accent-rgb, 168 138 86) / 0.1), transparent 42%),
      rgb(var(--color-bg-rgb, 24 24 24) / 0.62);
    padding: 0.75rem;
  }

  .region-exploration-tree__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .region-exploration-tree__eyebrow {
    color: rgb(var(--color-accent-rgb, 168 138 86) / 0.72);
    font-size: 0.625rem;
  }

  .region-exploration-tree__title {
    color: var(--color-accent, #a88a56);
    font-size: 0.875rem;
    margin-top: 0.125rem;
  }

  .region-exploration-tree__summary {
    color: var(--color-muted, #9ca3af);
    font-size: 0.75rem;
    line-height: 1.5;
    margin-top: 0.25rem;
  }

  .region-exploration-tree__stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 0;
    text-align: right;
    color: var(--color-muted, #9ca3af);
    font-size: 0.625rem;
  }

  .region-exploration-tree__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.42fr);
    gap: 0.75rem;
  }

  .region-exploration-tree__canvas {
    position: relative;
    min-height: 22rem;
    overflow: hidden;
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.12);
    border-radius: 4px;
    background:
      radial-gradient(circle at 16% 48%, rgb(var(--color-accent-rgb, 168 138 86) / 0.12), transparent 18%),
      linear-gradient(90deg, rgb(var(--color-accent-rgb, 168 138 86) / 0.05) 1px, transparent 1px),
      linear-gradient(0deg, rgb(var(--color-accent-rgb, 168 138 86) / 0.05) 1px, transparent 1px);
    background-size: auto, 2rem 2rem, 2rem 2rem;
  }

  .region-exploration-tree__links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .region-exploration-tree__link {
    stroke: rgb(var(--color-accent-rgb, 168 138 86) / 0.22);
    stroke-width: 0.6;
    vector-effect: non-scaling-stroke;
  }

  .region-exploration-tree__link--main,
  .region-exploration-tree__link--active {
    stroke: rgb(var(--color-accent-rgb, 168 138 86) / 0.48);
    stroke-width: 1;
  }

  .region-exploration-tree__link--branch,
  .region-exploration-tree__link--camp {
    stroke: rgb(74 222 128 / 0.46);
  }

  .region-exploration-tree__link--deep,
  .region-exploration-tree__link--boss {
    stroke: rgb(248 113 113 / 0.48);
  }

  .region-exploration-tree__link--dashed {
    stroke-dasharray: 4 4;
  }

  .region-exploration-tree__link--active {
    filter: drop-shadow(0 0 4px rgb(var(--color-accent-rgb, 168 138 86) / 0.5));
  }

  .region-exploration-tree__node {
    position: absolute;
    z-index: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.25rem;
    width: 7.8rem;
    min-height: 2.5rem;
    transform: translate(-50%, -50%);
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.2);
    border-radius: 4px;
    background: rgb(var(--color-bg-rgb, 24 24 24) / 0.92);
    color: var(--color-muted, #9ca3af);
    padding: 0.45rem 0.5rem;
    text-align: left;
    transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
  }

  .region-exploration-tree__node:hover,
  .region-exploration-tree__node--selected {
    border-color: rgb(var(--color-accent-rgb, 168 138 86) / 0.72);
    color: var(--color-accent, #a88a56);
    transform: translate(-50%, -50%) scale(1.02);
  }

  .region-exploration-tree__node--unknown,
  .region-exploration-tree__node--locked {
    border-style: dashed;
    opacity: 0.62;
  }

  .region-exploration-tree__node--mastered,
  .region-exploration-tree__node--resolved {
    border-color: rgb(74 222 128 / 0.42);
    background: rgb(74 222 128 / 0.08);
  }

  .region-exploration-tree__node--boss,
  .region-exploration-tree__node--monster {
    border-color: rgb(248 113 113 / 0.38);
  }

  .region-exploration-tree__node--animal {
    border-color: rgb(96 165 250 / 0.38);
    background: rgb(96 165 250 / 0.07);
  }

  .region-exploration-tree__node--tree {
    border-color: rgb(34 197 94 / 0.36);
    background: rgb(34 197 94 / 0.07);
  }

  .region-exploration-tree__node--current {
    box-shadow: 0 0 0 2px rgb(var(--color-accent-rgb, 168 138 86) / 0.18);
  }

  .region-exploration-tree__node-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.6875rem;
  }

  .region-exploration-tree__current-dot {
    position: absolute;
    top: -0.2rem;
    right: -0.2rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--color-accent, #a88a56);
  }

  .region-exploration-tree__detail {
    min-height: 22rem;
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.12);
    border-radius: 4px;
    background: rgb(var(--color-bg-rgb, 24 24 24) / 0.72);
    padding: 0.75rem;
  }

  .region-exploration-tree__detail-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .region-exploration-tree__detail-kicker,
  .region-exploration-tree__status {
    font-size: 0.625rem;
  }

  .region-exploration-tree__detail-title {
    color: var(--color-accent, #a88a56);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .region-exploration-tree__detail-summary {
    color: var(--color-muted, #9ca3af);
    font-size: 0.75rem;
    line-height: 1.6;
    margin-top: 0.35rem;
  }

  .region-exploration-tree__badges,
  .region-exploration-tree__linked,
  .region-exploration-tree__preview-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.65rem;
  }

  .region-exploration-tree__badges span {
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.16);
    border-radius: 4px;
    color: var(--color-muted, #9ca3af);
    font-size: 0.625rem;
    padding: 0.15rem 0.35rem;
  }

  .region-exploration-tree__preview {
    flex: 1 1 9rem;
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.12);
    border-radius: 4px;
    color: var(--color-muted, #9ca3af);
    font-size: 0.6875rem;
    line-height: 1.5;
    padding: 0.45rem 0.5rem;
  }

  .region-exploration-tree__preview--risk {
    border-color: rgb(248 113 113 / 0.22);
  }

  .region-exploration-tree__preview--reward {
    border-color: rgb(74 222 128 / 0.22);
  }

  .region-exploration-tree__lines {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.65rem;
    color: var(--color-muted, #9ca3af);
    font-size: 0.6875rem;
    line-height: 1.5;
  }

  .region-exploration-tree__disabled {
    color: var(--color-warning, #fbbf24);
    font-size: 0.6875rem;
    line-height: 1.5;
    margin-top: 0.65rem;
  }

  .region-exploration-tree__link-button,
  .region-exploration-tree__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    border: 1px solid rgb(var(--color-accent-rgb, 168 138 86) / 0.2);
    border-radius: 4px;
    color: var(--color-accent, #a88a56);
    font-size: 0.6875rem;
    min-height: 2rem;
    padding: 0.35rem 0.55rem;
  }

  .region-exploration-tree__action {
    width: 100%;
    margin-top: 0.75rem;
  }

  .region-exploration-tree__action:disabled {
    color: var(--color-muted, #9ca3af);
    opacity: 0.62;
  }

  .region-exploration-tree__empty {
    display: flex;
    min-height: 100%;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    color: var(--color-muted, #9ca3af);
    font-size: 0.75rem;
  }

  @media (max-width: 767px) {
    .region-exploration-tree__head,
    .region-exploration-tree__body {
      display: flex;
      flex-direction: column;
    }

    .region-exploration-tree__stats {
      text-align: left;
    }

    .region-exploration-tree__canvas {
      min-height: 20rem;
      overflow-x: auto;
    }

    .region-exploration-tree__node {
      width: 6.6rem;
    }

    .region-exploration-tree__detail {
      min-height: 0;
    }
  }
</style>
