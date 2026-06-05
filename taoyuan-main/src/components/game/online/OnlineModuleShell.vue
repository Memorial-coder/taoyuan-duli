<template>
  <section class="game-panel space-y-3">
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-accent">
          <slot name="icon" />
          <h2 class="game-section-title">{{ title }}</h2>
        </div>
        <p class="mt-1 text-xs leading-5 text-muted">{{ summary }}</p>
        <p v-if="meta" class="mt-1 text-[0.625rem] leading-4 text-muted">{{ meta }}</p>
      </div>
      <div class="flex shrink-0 flex-wrap gap-2">
        <div v-if="$slots.primaryAction" class="contents" data-testid="online-module-primary-action">
          <slot name="primaryAction" />
        </div>
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
    <div v-if="$slots.status" data-testid="online-module-status">
      <slot name="status" />
    </div>

    <div v-if="stats.length > 0" :class="statsGridClass || 'grid gap-2 text-xs md:grid-cols-4'">
      <div v-for="stat in stats" :key="stat.label" class="game-panel-muted px-2 py-2">
        <p class="truncate text-[0.625rem] text-muted">{{ stat.label }}</p>
        <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
      </div>
    </div>

    <div
      class="online-module-tablist sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1 backdrop-blur md:static md:z-auto md:mx-0 md:px-0 md:pt-0 md:backdrop-blur-0"
      data-testid="online-module-tablist"
      role="tablist"
      :aria-label="`${title} 标签`"
    >
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :data-testid="`online-module-tab-${tab.key}`"
        :id="moduleTabId(tab.key)"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :aria-controls="modulePanelId(tab.key)"
        :tabindex="activeTab === tab.key ? 0 : -1"
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

  const moduleTabId = (key: string) => `online-module-tab-${key}`
  const modulePanelId = (key: string) => `online-module-panel-${key}`

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
