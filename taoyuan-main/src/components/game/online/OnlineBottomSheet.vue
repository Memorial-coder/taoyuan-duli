<template>
  <Teleport :to="teleportTarget">
    <Transition name="sheet-slide">
    <div
      v-if="open"
      class="game-modal-overlay online-bottom-sheet fixed inset-0 z-50 flex bg-black/70"
      :class="overlayClass"
      data-testid="online-bottom-sheet"
      @mousedown.self="handleBackdrop"
      @keydown.esc.prevent.stop="requestClose"
    >
      <section
        ref="sheetRef"
        class="game-panel online-bottom-sheet__panel flex w-full flex-col gap-0 overflow-hidden"
        :class="panelClass"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="description ? descriptionId : undefined"
        tabindex="-1"
      >
        <header class="online-bottom-sheet__header shrink-0 border-b border-accent/10 pb-3">
          <slot name="header" :title="title" :description="description" :close="requestClose">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="min-w-0">
                <p
                  :id="titleId"
                  ref="titleRef"
                  class="text-sm leading-5 text-accent"
                  data-testid="online-bottom-sheet-title"
                  tabindex="-1"
                >
                  {{ title }}
                </p>
                <p
                  v-if="description"
                  :id="descriptionId"
                  class="mt-1 text-xs leading-5 text-muted"
                  data-testid="online-bottom-sheet-description"
                >
                  {{ description }}
                </p>
              </div>
              <button
                ref="closeButtonRef"
                type="button"
                class="online-action-btn online-action-btn--icon online-action-btn--compact shrink-0"
                data-testid="online-bottom-sheet-close"
                aria-label="关闭"
                @click="requestClose"
              >
                <X :size="14" />
              </button>
            </div>
          </slot>
        </header>

        <div class="online-bottom-sheet__body min-h-0 flex-1 overflow-y-auto py-3 pr-1 text-xs leading-5 text-muted">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="online-bottom-sheet__footer shrink-0 border-t border-accent/10 pt-3"
        >
          <slot name="footer" :close="requestClose" />
        </footer>
      </section>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { X } from 'lucide-vue-next'
  import { useFullscreenTeleportTarget } from '@/composables/useFullscreenTeleportTarget'

  type BottomSheetSide = 'bottom' | 'right' | 'center'

  const props = withDefaults(defineProps<{
    open: boolean
    title: string
    description?: string
    side?: BottomSheetSide
    closeOnBackdrop?: boolean
    initialFocus?: string
  }>(), {
    description: '',
    side: 'bottom',
    closeOnBackdrop: true,
    initialFocus: '',
  })

  const emit = defineEmits<{
    close: []
    'after-open': []
    'after-close': []
  }>()

  const sheetRef = ref<HTMLElement | null>(null)
  const titleRef = ref<HTMLElement | null>(null)
  const closeButtonRef = ref<HTMLElement | null>(null)
  const previousFocus = ref<HTMLElement | null>(null)
  const previousBodyOverflow = ref('')
  const { teleportTarget, syncTeleportTarget } = useFullscreenTeleportTarget()
  const sheetId = `online-bottom-sheet-${Math.random().toString(36).slice(2, 10)}`
  const titleId = `${sheetId}-title`
  const descriptionId = `${sheetId}-description`

  const overlayClass = computed(() => ({
    'items-end justify-center': props.side === 'bottom',
    'items-stretch justify-end': props.side === 'right',
    'items-center justify-center': props.side === 'center',
  }))

  const panelClass = computed(() => ({
    'online-bottom-sheet__panel--bottom max-w-2xl': props.side === 'bottom',
    'online-bottom-sheet__panel--right max-w-md': props.side === 'right',
    'online-bottom-sheet__panel--center max-w-lg': props.side === 'center',
  }))

  const lockPageScroll = () => {
    if (typeof document === 'undefined') return
    previousBodyOverflow.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  const unlockPageScroll = () => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = previousBodyOverflow.value
  }

  const focusSheet = async () => {
    await nextTick()
    const preferredTarget = props.initialFocus
      ? sheetRef.value?.querySelector<HTMLElement>(props.initialFocus)
      : null
    const firstControl = sheetRef.value?.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    )
    ;(preferredTarget || firstControl || titleRef.value || closeButtonRef.value || sheetRef.value)?.focus()
  }

  const restoreFocus = async () => {
    await nextTick()
    previousFocus.value?.focus()
    previousFocus.value = null
  }

  const requestClose = () => {
    emit('close')
  }

  const handleBackdrop = () => {
    if (!props.closeOnBackdrop) return
    requestClose()
  }

  watch(
    () => props.open,
    async isOpen => {
      if (isOpen) {
        syncTeleportTarget()
        previousFocus.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
        lockPageScroll()
        await focusSheet()
        emit('after-open')
        return
      }

      unlockPageScroll()
      await restoreFocus()
      emit('after-close')
    }
  )

  onBeforeUnmount(() => {
    if (props.open) unlockPageScroll()
  })
</script>

<style scoped>
  .online-bottom-sheet__panel {
    max-height: min(88vh, 44rem);
  }

  .online-bottom-sheet__panel--bottom {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .online-bottom-sheet__panel--right {
    height: 100%;
    max-height: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .online-bottom-sheet__footer {
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  }

  @media (min-width: 768px) {
    .online-bottom-sheet__panel--bottom {
      margin-bottom: 1rem;
      border-bottom-left-radius: 2px;
      border-bottom-right-radius: 2px;
    }
  }
</style>
