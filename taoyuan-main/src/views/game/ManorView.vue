<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-sm text-accent">公开庄园</p>
        <p class="text-[10px] text-muted mt-1">把庄园公开展示成一个可以被别人理解的在线地点。</p>
      </div>
      <Button class="text-[10px]" :disabled="manorStore.loading" @click="refreshSnapshot">
        {{ manorStore.loading ? '加载中…' : '刷新庄园快照' }}
      </Button>
    </div>

    <div v-if="manorStore.errorMessage" class="game-panel border border-danger/20 rounded-xs p-3 text-xs text-danger">
      {{ manorStore.errorMessage }}
    </div>

    <ManorPreviewCard :snapshot="manorStore.snapshot" />

    <div class="game-panel border border-accent/10 rounded-xs p-3 text-[10px] text-muted space-y-1">
      <p>当前这轮先完成 L20 的最小公开庄园快照：公开状态、展示主题、主视觉摘要、经营标签、当前重点和本周目标都已经有落点。</p>
      <p>留言墙、访客痕迹、导览和收藏会在 `L21-L24` 继续接。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import Button from '@/components/game/Button.vue'
  import ManorPreviewCard from '@/components/game/ManorPreviewCard.vue'
  import { useManorStore } from '@/stores/useManorStore'

  const manorStore = useManorStore()

  const refreshSnapshot = async () => {
    await manorStore.refreshSnapshot().catch(() => {})
  }

  onMounted(() => {
    if (!manorStore.snapshot) {
      void refreshSnapshot()
    }
  })
</script>
