<template>
  <div class="shrink-0 flex items-center" :class="title ? 'text-sm text-accent mb-3' : 'text-xs text-muted mb-2'">
    <div class="flex-1 border-t" :class="title ? 'border-accent/30' : 'border-accent/15'" />
    <span class="px-2">
      <slot>{{ label }}</slot>
    </span>
    <div class="flex-1 border-t" :class="title ? 'border-accent/30' : 'border-accent/15'" />
  </div>
</template>

<script setup lang="ts">
  defineProps<{ label?: string; title?: boolean }>()
</script>
