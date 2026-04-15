<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <BookMarked :size="14" />
        <span>百科</span>
      </div>
      <span class="text-[10px] text-muted">独立入口</span>
    </div>

    <p class="text-[10px] text-muted mb-3">百科已从“收藏与资料”中独立出来，这里可直接查询机制、用途、解锁条件和跨系统资料。</p>

    <GlossaryTab />
  </div>
</template>

<script setup lang="ts">
  import { BookMarked } from 'lucide-vue-next'
  import GlossaryTab from '@/components/game/GlossaryTab.vue'
</script>