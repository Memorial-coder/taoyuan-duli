<template>
  <div v-if="shouldRender" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/20">
    <div class="flex items-start justify-between gap-3 mb-2">
      <div class="min-w-0">
        <p class="text-[10px] text-muted">{{ titleText }}</p>
        <p class="text-xs text-accent mt-1 leading-5">{{ primaryHeadline }}</p>
      </div>
      <div class="shrink-0 text-right">
        <span
          class="inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[10px]"
          :class="snapshot.hasFreshContent ? 'border-accent/30 text-accent' : 'border-success/20 text-success'"
        >
          {{ snapshot.unlockTier }}
        </span>
        <p class="text-[10px] text-muted mt-1">{{ snapshotStatusText }}</p>
      </div>
    </div>

    <div v-if="primarySummary?.detailLines.length" class="space-y-1 mb-2">
      <p
        v-for="line in primarySummary.detailLines"
        :key="line"
        class="text-[10px] text-muted leading-4"
      >
        · {{ line }}
      </p>
    </div>

    <div v-if="visibleRoutes.length" class="space-y-1.5 mb-2">
      <button
        v-for="route in visibleRoutes"
        :key="route.id"
        class="w-full border border-accent/10 rounded-xs px-2 py-2 text-left transition-colors hover:bg-accent/5"
        @click="handleAdoptRoute(route.id)"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-accent">{{ route.label }}</p>
          <span class="text-[10px]" :class="route.status === 'adopted' ? 'text-success' : 'text-muted'">
            {{ route.status === 'adopted' ? '已采纳' : '记下路线' }}
          </span>
        </div>
        <p class="text-[10px] text-muted mt-0.5 leading-4">{{ route.summary }}</p>
      </button>
    </div>

    <div v-if="primarySummary" class="flex flex-wrap gap-2">
      <button
        class="border border-success/20 rounded-xs px-2 py-1 text-[10px] transition-colors"
        :class="primarySummary.status === 'adopted' ? 'text-success bg-success/5 cursor-default' : 'text-success hover:bg-success/5'"
        :disabled="primarySummary.status === 'adopted'"
        @click="handleAdoptSummary(primarySummary.id)"
      >
        {{ primarySummary.status === 'adopted' ? '已记下要点' : '记下要点' }}
      </button>
      <button
        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] transition-colors"
        :class="primarySummary.status === 'dismissed' ? 'text-muted bg-bg/30 cursor-default' : 'text-muted hover:bg-accent/5'"
        :disabled="primarySummary.status === 'dismissed'"
        @click="handleDismissSummary(primarySummary.id)"
      >
        {{ primarySummary.status === 'dismissed' ? '稍后再看' : '收起提示' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useTutorialStore } from '@/stores/useTutorialStore'
  import type { GuidanceSurfaceId } from '@/types'

  const props = defineProps<{
    surfaceId: GuidanceSurfaceId
    title?: string
  }>()

  const tutorialStore = useTutorialStore()

  const snapshot = computed(() => tutorialStore.getGuidanceSurfaceSnapshot(props.surfaceId))
  const primarySummary = computed(
    () =>
      snapshot.value.summaryStates.find(summary => summary.active && summary.status !== 'dismissed') ??
      snapshot.value.summaryStates.find(summary => summary.active) ??
      snapshot.value.summaryStates[0] ??
      null
  )
  const visibleRoutes = computed(() => snapshot.value.routeStates.filter(route => route.active).slice(0, 2))
  const shouldRender = computed(() => snapshot.value.activeSummaryCount > 0 || snapshot.value.activeRouteCount > 0)
  const primaryHeadline = computed(() => primarySummary.value?.headline || snapshot.value.headline || '当前暂无新的经营引导。')
  const titleText = computed(() => props.title || primarySummary.value?.title || '经营引导')
  const snapshotStatusText = computed(() => {
    if (primarySummary.value?.status === 'adopted') return '要点已记录'
    if (snapshot.value.hasFreshContent) return '有新推荐'
    return '已同步'
  })

  const handleAdoptSummary = (summaryId: string) => {
    tutorialStore.markGuidanceSummaryAdopted(summaryId, props.surfaceId)
  }

  const handleDismissSummary = (summaryId: string) => {
    tutorialStore.markGuidanceSummaryDismissed(summaryId, props.surfaceId)
  }

  const handleAdoptRoute = (routeId: string) => {
    tutorialStore.markGuidanceRouteAdopted(routeId, props.surfaceId)
  }

  onMounted(() => {
    tutorialStore.markGuidanceSurfaceViewed(props.surfaceId)
  })
</script>
