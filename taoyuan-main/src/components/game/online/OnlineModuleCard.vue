<template>
  <article class="game-panel-muted flex h-full min-h-[176px] min-w-0 flex-col justify-between p-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-accent">
        <component :is="icon" :size="15" />
        <h3 class="truncate text-sm leading-5">{{ title }}</h3>
      </div>
      <p class="mt-2 min-h-[40px] text-xs leading-5 text-muted">{{ summary }}</p>
      <p class="mt-2 min-h-[32px] text-[10px] leading-4" :class="error ? 'text-red-200' : 'text-muted'">
        {{ error || status }}
      </p>
      <dl class="mt-3 grid grid-cols-2 gap-2">
        <div
          v-for="stat in stats"
          :key="`${moduleKey}-${stat.label}`"
          class="min-w-0 border border-accent/10 bg-black/10 p-2"
        >
          <dt class="truncate text-[10px] leading-4 text-muted">{{ stat.label }}</dt>
          <dd class="mt-1 truncate text-xs leading-4 text-accent">{{ stat.value }}</dd>
        </div>
      </dl>
    </div>
    <RouterLink
      class="online-action-btn online-action-btn--compact mt-3 w-full"
      :data-testid="`online-module-${moduleKey}-link`"
      :to="to"
    >
      <ArrowRight :size="12" />
      {{ actionLabel }}
    </RouterLink>
  </article>
</template>

<script setup lang="ts">
  import type { Component } from 'vue'
  import { ArrowRight } from 'lucide-vue-next'
  import { RouterLink, type RouteLocationRaw } from 'vue-router'

  type OnlineModuleStat = { label: string; value: string | number }

  withDefaults(defineProps<{
    moduleKey: string
    title: string
    summary: string
    status: string
    stats: OnlineModuleStat[]
    to: RouteLocationRaw
    icon: Component
    error?: string
    actionLabel?: string
  }>(), {
    error: '',
    actionLabel: '进入',
  })
</script>
