<template>
  <component
    :is="rootTag"
    :type="rootTag === 'button' ? 'button' : undefined"
    :class="wrapperClass"
    @click="handleActionClick"
  >
    <div class="flex items-center justify-between gap-3 text-xs">
      <span :class="titleClass">{{ goal.title }}</span>
      <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ getGoalProgressText(goal) }}</span>
    </div>
    <p v-if="showSource" :class="sourceClass">{{ getGoalSourceText(goal) }}</p>

    <div v-if="showInlineAction" class="mt-1 flex items-end gap-3">
      <p class="min-w-0 flex-1 text-[11px] text-muted leading-5">{{ goal.description }}</p>
      <span class="shrink-0 whitespace-nowrap text-[10px] text-accent">{{ action!.label }} -></span>
    </div>
    <p v-else class="mt-1 text-[11px] text-muted leading-5">{{ goal.description }}</p>

    <div v-if="showTrailingAction" class="mt-2 flex justify-end text-[10px]">
      <span class="text-accent">{{ action!.label }} -></span>
    </div>
  </component>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { GoalState } from '@/stores/useGoalStore'
  import type { PromptAction } from '@/types'
  import { runPromptAction } from '@/composables/usePromptNavigation'

  const props = withDefaults(
    defineProps<{
      goal: GoalState
      action?: PromptAction | null
      tone?: 'accent' | 'success'
      variant?: 'card' | 'list'
      showSource?: boolean
      indented?: boolean
      strikeCompleted?: boolean
      getGoalProgressText: (goal: GoalState) => string
      getGoalSourceText: (goal: GoalState) => string
    }>(),
    {
      tone: 'accent',
      variant: 'card',
      showSource: true,
      indented: false,
      strikeCompleted: false,
      action: null
    }
  )

  const rootTag = computed(() => (props.action ? 'button' : 'div'))

  const wrapperClass = computed(() => {
    if (props.variant === 'list') {
      const classes = ['rounded-xs', 'px-2', 'py-1.5']
      if (props.indented) classes.push('pl-3')
      if (props.action) classes.push('prompt-action-card', 'prompt-action-card--clickable', 'w-full', 'text-left')
      return classes.join(' ')
    }

    const classes = ['rounded-xs', 'border', 'bg-bg/10', 'px-2', 'py-2']
    classes.push(props.tone === 'success' ? 'border-success/10' : 'border-accent/10')
    if (props.indented) classes.push('ml-2')
    if (props.action) classes.push('prompt-action-card', 'prompt-action-card--clickable', 'w-full', 'text-left')
    return classes.join(' ')
  })

  const sourceClass = computed(() => (props.tone === 'success' ? 'mt-1 text-[10px] text-success/80' : 'mt-1 text-[10px] text-accent/80'))

  const titleClass = computed(() => (props.strikeCompleted && props.goal.completed ? 'line-through text-muted' : ''))

  const showInlineAction = computed(() => !!props.action)

  const showTrailingAction = computed(() => false)

  const handleActionClick = () => {
    if (!props.action) return
    runPromptAction(props.action)
  }
</script>
