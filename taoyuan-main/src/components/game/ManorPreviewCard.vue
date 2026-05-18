<template>
  <div v-if="snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="text-sm text-accent">{{ snapshot.manor_name }}</p>
        <p class="text-[10px] text-muted mt-1">{{ snapshot.public_title }} · {{ snapshot.display_name }}</p>
      </div>
      <span class="text-[10px] text-muted">{{ snapshot.season_progress }}</span>
    </div>

    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">展示主题</p>
        <p class="text-accent mt-1">{{ snapshot.showcase_theme }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">主视觉摘要</p>
        <p class="text-accent mt-1">{{ snapshot.visual_summary }}</p>
      </div>
    </div>

    <div class="border border-accent/10 rounded-xs p-2 text-xs">
      <p class="text-[10px] text-muted">当前重点</p>
      <p class="mt-1">{{ snapshot.current_focus }}</p>
      <p class="text-[10px] text-muted mt-2">本周目标：{{ snapshot.weekly_goal }}</p>
    </div>

    <div class="border border-accent/10 rounded-xs p-2 text-xs">
      <p class="text-[10px] text-muted">经营标签</p>
      <div class="flex flex-wrap gap-1 mt-1">
        <span
          v-for="tag in snapshot.public_tags"
          :key="tag.id"
          class="text-[10px] px-1.5 py-0.5 rounded-xs border"
          :class="tag.source === 'selected' ? 'border-accent/40 text-accent bg-accent/5' : 'border-accent/15 text-muted'"
        >
          {{ tag.label }}
        </span>
        <span v-if="snapshot.public_tags.length === 0" class="text-[10px] text-muted">当前还没有公开经营标签。</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { OnlineManorSnapshot } from '@/utils/onlineProfileApi'

  defineProps<{
    snapshot: OnlineManorSnapshot | null
  }>()
</script>
