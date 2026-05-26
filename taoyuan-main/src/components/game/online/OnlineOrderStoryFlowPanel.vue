<template>
  <section class="online-order-story-flow" data-testid="online-orders-story-flow" aria-label="订单故事流转图">
    <div class="online-order-story-flow__head">
      <div class="min-w-0">
        <p class="online-order-story-flow__title">{{ storyFlow.title || '订单流转图' }}</p>
        <p class="online-order-story-flow__summary">{{ storyFlow.summary }}</p>
      </div>
      <span class="online-order-story-flow__badge">{{ completedCount }}/{{ storyFlow.chapters.length }}</span>
    </div>

    <div class="online-order-story-flow__chapters" data-testid="online-orders-story-flow-chapters">
      <article
        v-for="chapter in storyFlow.chapters"
        :key="chapter.id"
        class="online-order-story-flow__chapter"
        :class="[
          `online-order-story-flow__chapter--${chapter.state}`,
          { 'online-order-story-flow__chapter--current': chapter.id === storyFlow.current_chapter_id },
        ]"
        data-testid="online-orders-story-flow-chapter"
      >
        <div class="online-order-story-flow__chapter-head">
          <span class="online-order-story-flow__sequence">{{ chapter.sequence }}</span>
          <span class="online-order-story-flow__state">{{ chapterStateLabel(chapter.state) }}</span>
        </div>
        <p class="online-order-story-flow__role">{{ chapter.role_label }} · {{ chapter.target_label }}</p>
        <p class="online-order-story-flow__chapter-title">{{ chapter.title }}</p>
        <p class="online-order-story-flow__chapter-summary">{{ chapter.summary }}</p>
        <p class="online-order-story-flow__chapter-detail">{{ chapter.detail }}</p>
        <p class="online-order-story-flow__settlement">{{ chapter.settlement_summary }}</p>
        <p v-if="chapter.next_hint" class="online-order-story-flow__next">{{ chapter.next_hint }}</p>
      </article>
    </div>

    <div v-if="storyFlow.timeline.length > 0" class="online-order-story-flow__timeline" data-testid="online-orders-story-flow-timeline">
      <p class="online-order-story-flow__timeline-title">故事时间线</p>
      <div
        v-for="entry in storyFlow.timeline.slice(-4)"
        :key="entry.id"
        class="online-order-story-flow__timeline-entry"
      >
        <span>{{ formatStoryTime(entry.created_at) }}</span>
        <span>{{ entry.summary }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { OnlineVisualStoryChapterState, OnlineVisualStoryFlow } from '@/types/onlineVisual'

  const props = defineProps<{
    storyFlow: OnlineVisualStoryFlow
  }>()

  const completedCount = computed(() =>
    props.storyFlow.chapters.filter(chapter => chapter.state === 'confirmed').length
  )

  const chapterStateLabel = (state: OnlineVisualStoryChapterState) => {
    if (state === 'confirmed') return '已确认'
    if (state === 'compensation_pending') return '补偿中'
    if (state === 'submitted') return '待确认'
    if (state === 'accepted') return '流转中'
    return '待接力'
  }

  const formatStoryTime = (timestamp: number) => {
    if (!timestamp) return '未记录'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
</script>

<style scoped>
  .online-order-story-flow {
    display: grid;
    gap: 0.65rem;
    border: 1px solid color-mix(in srgb, var(--color-warning) 18%, transparent);
    background:
      linear-gradient(90deg, rgb(var(--color-warning-rgb, 245 158 11) / 0.06), transparent 40%),
      rgb(0 0 0 / 0.1);
    padding: 0.7rem;
  }

  .online-order-story-flow__head,
  .online-order-story-flow__chapter-head,
  .online-order-story-flow__timeline-entry {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .online-order-story-flow__title {
    overflow: hidden;
    color: var(--color-accent);
    font-size: 0.78rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .online-order-story-flow__summary,
  .online-order-story-flow__role,
  .online-order-story-flow__chapter-summary,
  .online-order-story-flow__chapter-detail,
  .online-order-story-flow__settlement,
  .online-order-story-flow__next,
  .online-order-story-flow__timeline-title,
  .online-order-story-flow__timeline-entry {
    color: var(--color-muted);
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .online-order-story-flow__badge,
  .online-order-story-flow__state,
  .online-order-story-flow__sequence {
    flex: 0 0 auto;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    background: rgb(0 0 0 / 0.14);
    color: var(--color-accent);
    font-size: 0.66rem;
    line-height: 1;
    padding: 0.3rem 0.4rem;
  }

  .online-order-story-flow__chapters {
    display: grid;
    grid-auto-columns: minmax(11rem, 1fr);
    grid-auto-flow: column;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.15rem;
  }

  .online-order-story-flow__chapter {
    min-width: 0;
    border: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    background: rgb(var(--color-bg) / 0.2);
    padding: 0.55rem;
  }

  .online-order-story-flow__chapter--current {
    border-color: color-mix(in srgb, var(--color-warning) 48%, transparent);
  }

  .online-order-story-flow__chapter--confirmed .online-order-story-flow__state,
  .online-order-story-flow__chapter--confirmed .online-order-story-flow__sequence {
    border-color: color-mix(in srgb, var(--color-success) 45%, transparent);
    color: var(--color-success);
  }

  .online-order-story-flow__chapter--compensation_pending .online-order-story-flow__state,
  .online-order-story-flow__chapter--compensation_pending .online-order-story-flow__sequence {
    border-color: color-mix(in srgb, var(--color-danger) 45%, transparent);
    color: var(--color-danger);
  }

  .online-order-story-flow__chapter-title {
    margin-top: 0.35rem;
    overflow: hidden;
    color: rgb(var(--color-text));
    font-size: 0.74rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .online-order-story-flow__chapter-summary,
  .online-order-story-flow__chapter-detail,
  .online-order-story-flow__settlement,
  .online-order-story-flow__next {
    margin-top: 0.35rem;
  }

  .online-order-story-flow__timeline {
    display: grid;
    gap: 0.35rem;
    border-top: 1px solid color-mix(in srgb, var(--color-accent) 12%, transparent);
    padding-top: 0.55rem;
  }

  .online-order-story-flow__timeline-entry {
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    background: rgb(0 0 0 / 0.1);
    padding: 0.35rem 0.45rem;
  }

  .online-order-story-flow__timeline-entry span:first-child {
    flex: 0 0 auto;
    color: var(--color-accent);
  }

  .online-order-story-flow__timeline-entry span:last-child {
    min-width: 0;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    .online-order-story-flow__chapters {
      grid-auto-columns: minmax(9.5rem, 82%);
    }

    .online-order-story-flow__timeline-entry {
      display: grid;
    }

    .online-order-story-flow__timeline-entry span:last-child {
      text-align: left;
      white-space: normal;
    }
  }
</style>
