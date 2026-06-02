<template>
  <section
    class="game-panel-muted flex min-w-0 flex-col items-start gap-3 p-4 text-left"
    data-testid="online-empty-state"
  >
    <div v-if="illustration" class="text-2xl leading-none" aria-hidden="true">{{ illustration }}</div>
    <div class="min-w-0 space-y-1">
      <h3 class="text-sm leading-5 text-accent">{{ title }}</h3>
      <p class="text-xs leading-5 text-muted">{{ description }}</p>
    </div>
    <div v-if="primaryLabel || secondaryLabel" class="flex w-full flex-wrap gap-2">
      <button
        v-if="primaryLabel"
        class="online-action-btn online-action-btn--compact online-action-btn--primary"
        type="button"
        data-testid="online-empty-state-primary"
        @click="emit('primary')"
      >
        {{ primaryLabel }}
      </button>
      <button
        v-if="secondaryLabel"
        class="online-action-btn online-action-btn--compact"
        type="button"
        data-testid="online-empty-state-secondary"
        @click="emit('secondary')"
      >
        {{ secondaryLabel }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
  withDefaults(defineProps<{
    title: string
    description: string
    primaryLabel?: string
    secondaryLabel?: string
    illustration?: string
  }>(), {
    primaryLabel: '',
    secondaryLabel: '',
    illustration: '',
  })

  const emit = defineEmits<{
    primary: []
    secondary: []
  }>()
</script>
