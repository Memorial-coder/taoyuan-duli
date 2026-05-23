<template>
  <section class="game-panel space-y-3">
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-accent">
          <slot name="icon" />
          <h2 class="game-section-title">{{ title }}</h2>
        </div>
        <p class="mt-1 text-xs leading-5 text-muted">{{ summary }}</p>
        <p v-if="meta" class="mt-1 text-[10px] leading-4 text-muted">{{ meta }}</p>
      </div>
      <div class="flex shrink-0 flex-wrap gap-2">
        <button
          data-testid="online-module-refresh-button"
          class="online-action-btn online-action-btn--compact"
          type="button"
          :disabled="refreshDisabled || refreshRunning"
          @click="emit('refresh')"
        >
          <RefreshCw :size="12" :class="{ 'animate-spin': refreshRunning }" />
          {{ refreshRunning ? refreshRunningLabel : refreshLabel }}
        </button>
        <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
          <ArrowLeft :size="12" />
          在线中心
        </RouterLink>
        <slot name="actions" />
      </div>
    </div>

    <slot name="errors" />

    <div v-if="stats.length > 0" :class="statsGridClass || 'grid gap-2 text-xs md:grid-cols-4'">
      <div v-for="stat in stats" :key="stat.label" class="game-panel-muted px-2 py-2">
        <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
        <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
      </div>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :data-testid="`online-module-tab-${tab.key}`"
        type="button"
        class="shrink-0 border px-3 py-2 text-xs transition-colors"
        :class="activeTab === tab.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
        @click="emit('update:activeTab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { ArrowLeft, RefreshCw } from 'lucide-vue-next'
  import { RouterLink } from 'vue-router'

  type OnlineModuleStat = { label: string; value: string | number }
  type OnlineModuleTab = { key: string; label: string; summary: string }

  withDefaults(defineProps<{
    title: string
    summary: string
    meta?: string
    refreshLabel: string
    refreshRunningLabel?: string
    refreshRunning?: boolean
    refreshDisabled?: boolean
    stats: OnlineModuleStat[]
    statsGridClass?: string
    tabs: OnlineModuleTab[]
    activeTab: string
  }>(), {
    meta: '',
    refreshRunningLabel: '刷新中',
    refreshRunning: false,
    refreshDisabled: false,
    statsGridClass: '',
  })

  const emit = defineEmits<{
    refresh: []
    'update:activeTab': [key: string]
  }>()
</script>
