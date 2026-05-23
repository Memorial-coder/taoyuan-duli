<template>
  <div class="space-y-2 overflow-y-auto pr-1" :style="{ maxHeight }">
    <slot />
  </div>
</template>

<script setup lang="ts">
  withDefaults(defineProps<{
    maxHeight?: string
  }>(), {
    maxHeight: '32rem',
  })
</script>
