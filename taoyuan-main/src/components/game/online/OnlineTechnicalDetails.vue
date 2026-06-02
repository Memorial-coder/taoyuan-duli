<template>
  <details
    ref="detailsRef"
    class="game-panel-muted online-technical-details"
    :class="toneClass"
    :open="isOpen"
    data-testid="online-technical-details"
    @toggle="handleToggle"
  >
    <summary
      class="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-xs leading-5 text-accent"
      data-testid="online-technical-details-toggle"
    >
      <span class="min-w-0 truncate">{{ title }}</span>
      <ChevronDown :size="14" class="shrink-0 transition-transform" :class="{ 'rotate-180': isOpen }" />
    </summary>

    <div class="space-y-3 border-t border-accent/10 p-3">
      <div class="text-xs leading-5 text-muted" data-testid="online-technical-details-summary">
        <slot name="summary">
          <p v-if="summary">{{ summary }}</p>
        </slot>
      </div>

      <div v-if="copyValue" class="game-panel-muted p-2 text-[10px] leading-4 text-muted">
        <p class="truncate" data-testid="online-technical-details-copy-preview">{{ copyPreview }}</p>
        <button
          type="button"
          class="online-action-btn online-action-btn--compact mt-2"
          data-testid="online-technical-details-copy"
          @click="copyTechnicalValue"
        >
          <Copy :size="12" />
          {{ copyState === 'copied' ? '已复制' : '复制凭证' }}
        </button>
        <p v-if="copyState === 'failed'" class="mt-1 text-danger" data-testid="online-technical-details-copy-error">
          复制失败，请手动选择
        </p>
      </div>

      <div class="text-[10px] leading-5 text-muted" data-testid="online-technical-details-content">
        <slot />
      </div>

      <div v-if="$slots.actions" class="flex flex-wrap gap-2 border-t border-accent/10 pt-3" data-testid="online-technical-details-actions">
        <slot name="actions" />
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ChevronDown, Copy } from 'lucide-vue-next'

  type TechnicalDetailsTone = 'default' | 'warning' | 'danger' | 'success'

  const props = withDefaults(defineProps<{
    title: string
    summary?: string
    defaultOpen?: boolean
    tone?: TechnicalDetailsTone
    copyable?: string | string[] | boolean
  }>(), {
    summary: '',
    defaultOpen: false,
    tone: 'default',
    copyable: false,
  })

  const detailsRef = ref<HTMLDetailsElement | null>(null)
  const isOpen = ref(props.defaultOpen)
  const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
  let copyTimer = 0

  const toneClass = computed(() => ({
    'border-warning/35': props.tone === 'warning',
    'border-danger/35': props.tone === 'danger',
    'border-success/35': props.tone === 'success',
  }))

  const copyValue = computed(() => {
    if (Array.isArray(props.copyable)) return props.copyable.filter(Boolean).join('\n')
    if (typeof props.copyable === 'string') return props.copyable
    return ''
  })

  const copyPreview = computed(() => {
    const value = copyValue.value.trim()
    if (value.length <= 28) return value
    return `${value.slice(0, 12)}...${value.slice(-8)}`
  })

  const handleToggle = () => {
    isOpen.value = Boolean(detailsRef.value?.open)
  }

  const copyTechnicalValue = async () => {
    if (!copyValue.value) return
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable')
      }
      await navigator.clipboard.writeText(copyValue.value)
      copyState.value = 'copied'
    } catch {
      copyState.value = 'failed'
    }

    if (typeof window !== 'undefined') {
      window.clearTimeout(copyTimer)
      copyTimer = window.setTimeout(() => {
        copyState.value = 'idle'
      }, 1800)
    }
  }

  watch(
    () => props.defaultOpen,
    defaultOpen => {
      isOpen.value = defaultOpen
    }
  )
</script>

<style scoped>
  .online-technical-details > summary::-webkit-details-marker {
    display: none;
  }
</style>
