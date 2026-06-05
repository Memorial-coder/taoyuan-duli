<template>
  <section
    class="online-status-banner rounded-xs border px-3 py-2"
    :class="toneClass"
    data-testid="online-status-banner"
    :aria-live="liveMode"
  >
    <div class="flex min-w-0 items-start gap-2">
      <component :is="toneIcon" class="mt-0.5 shrink-0" :size="14" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="text-xs leading-5 text-current">{{ title }}</p>
        <p v-if="description" class="mt-1 text-[0.625rem] leading-4 opacity-80">{{ description }}</p>
      </div>
      <div v-if="actionLabel || dismissible" class="flex shrink-0 items-center gap-1">
        <button
          v-if="actionLabel"
          class="online-action-btn online-action-btn--compact"
          type="button"
          data-testid="online-status-banner-action"
          @click="emit('action')"
        >
          {{ actionLabel }}
        </button>
        <button
          v-if="dismissible"
          class="online-action-btn online-action-btn--compact online-action-btn--icon"
          type="button"
          data-testid="online-status-banner-dismiss"
          aria-label="关闭提示"
          @click="emit('dismiss')"
        >
          <X :size="13" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-vue-next'

  type StatusTone = 'info' | 'loading' | 'success' | 'warning' | 'danger'

  const props = withDefaults(defineProps<{
    tone?: StatusTone
    title: string
    description?: string
    actionLabel?: string
    dismissible?: boolean
  }>(), {
    tone: 'info',
    description: '',
    actionLabel: '',
    dismissible: false,
  })

  const emit = defineEmits<{
    action: []
    dismiss: []
  }>()

  const toneClassMap: Record<StatusTone, string> = {
    info: 'border-accent/20 bg-accent/5 text-accent',
    loading: 'border-accent/20 bg-accent/5 text-accent',
    success: 'border-success/25 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    danger: 'border-red-300/30 bg-red-500/10 text-red-100',
  }

  const toneIconMap = {
    info: Info,
    loading: Loader2,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
  } satisfies Record<StatusTone, unknown>

  const toneClass = computed(() => toneClassMap[props.tone])
  const toneIcon = computed(() => toneIconMap[props.tone])
  const liveMode = computed(() => props.tone === 'danger' || props.tone === 'success' ? 'assertive' : 'polite')
</script>
