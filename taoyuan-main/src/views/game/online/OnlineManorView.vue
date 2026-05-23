<template>
  <div class="space-y-3" data-testid="online-manor-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Home :size="16" />
            <h2 class="game-section-title">在线庄园</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">庄园展示、来访、留言、主题与收藏会在后续阶段拆入这里。</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="{ name: 'online' }">
          <ArrowLeft :size="12" />
          在线中心
        </RouterLink>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
        <span v-for="tab in tabs" :key="tab" class="game-panel-muted px-2 py-2 text-center text-muted">{{ tab }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ArrowLeft, Home } from 'lucide-vue-next'

  const tabs = ['概览', '主题', '留言', '来访', '导览', '收藏'] as const
</script>
