<template>
  <div :class="wrapperClass">
    <div class="flex items-center justify-between gap-3 text-xs">
      <span :class="titleClass">{{ goal.title }}</span>
      <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ getGoalProgressText(goal) }}</span>
    </div>
    <p v-if="showSource" :class="sourceClass">{{ getGoalSourceText(goal) }}</p>
    <p class="mt-1 text-[11px] text-muted leading-5">{{ goal.description }}</p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { GoalState } from '@/stores/useGoalStore'

  const props = withDefaults(
    defineProps<{
      goal: GoalState
      tone?: 'accent' | 'success'
      showSource?: boolean
      indented?: boolean
      strikeCompleted?: boolean
      getGoalProgressText: (goal: GoalState) => string
      getGoalSourceText: (goal: GoalState) => string
    }>(),
    {
      tone: 'accent',
      showSource: true,
      indented: false,
      strikeCompleted: false
    }
  )

  const wrapperClass = computed(() => {
    const classes = ['rounded-xs', 'border', 'bg-bg/10', 'px-2', 'py-2']
    classes.push(props.tone === 'success' ? 'border-success/10' : 'border-accent/10')
    if (props.indented) classes.push('ml-2')
    return classes.join(' ')
  })

  const sourceClass = computed(() => (props.tone === 'success' ? 'mt-1 text-[10px] text-success/80' : 'mt-1 text-[10px] text-accent/80'))

  const titleClass = computed(() => (props.strikeCompleted && props.goal.completed ? 'line-through text-muted' : ''))
</script>
