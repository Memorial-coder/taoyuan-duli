<template>
  <div class="space-y-3" data-testid="online-festival-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <CalendarDays :size="16" />
            <h2 class="game-section-title">在线节会</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">世界事件、节会房间、远征房间和纪念记录会在后续阶段拆入这里。</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="{ name: 'online' }">
          <ArrowLeft :size="12" />
          在线中心
        </RouterLink>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <span v-for="tab in tabs" :key="tab" class="game-panel-muted px-2 py-2 text-center text-muted">{{ tab }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ArrowLeft, CalendarDays } from 'lucide-vue-next'

  const tabs = ['世界事件', '节会房间', '远征房间', '纪念记录'] as const
</script>
