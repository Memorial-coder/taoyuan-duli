<template>
  <article class="game-panel-muted flex h-full min-h-[132px] min-w-0 flex-col justify-between p-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-accent">
        <component :is="icon" :size="15" aria-hidden="true" />
        <h3 class="truncate text-sm leading-5">{{ title }}</h3>
      </div>
      <p
        class="mt-3 min-h-[32px] text-[0.625rem] leading-4"
        :class="error ? 'text-red-200' : 'text-muted'"
        :data-testid="`online-module-${moduleKey}-status`"
      >
        {{ error || status }}
      </p>
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
