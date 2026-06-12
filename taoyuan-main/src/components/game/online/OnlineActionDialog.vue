<template>
  <Teleport :to="teleportTarget">
    <Transition name="dialog-pop">
    <div
      v-if="open"
      class="game-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      data-testid="online-action-dialog"
      @mousedown.self="handleBackdrop"
      @keydown.esc.prevent.stop="handleEscape"
    >
      <section
        ref="dialogRef"
        class="game-panel flex max-h-[min(88vh,42rem)] w-full max-w-lg flex-col gap-3 overflow-hidden"
        :class="toneClass"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="description ? descriptionId : undefined"
        tabindex="-1"
      >
        <header class="min-w-0 border-b border-accent/10 pb-3">
          <p
            :id="titleId"
            ref="titleRef"
            class="text-sm leading-5 text-accent"
            data-testid="online-action-dialog-title"
            tabindex="-1"
          >
            {{ title }}
          </p>
          <p
            v-if="description"
            :id="descriptionId"
            class="mt-1 text-xs leading-5 text-muted"
            data-testid="online-action-dialog-description"
          >
            {{ description }}
          </p>
        </header>

        <div v-if="$slots.default" class="min-h-0 overflow-y-auto pr-1 text-xs leading-5 text-muted">
          <slot />
        </div>

        <div v-if="hasDetailsSlot" class="border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-4 text-muted" data-testid="online-action-dialog-details">
          <slot name="details" />
        </div>

        <slot
          v-if="$slots.footer"
          name="footer"
          :confirm-disabled="confirmBlocked"
          :confirm="handleConfirm"
          :cancel="handleCancel"
        />

        <footer v-else class="space-y-3 border-t border-accent/10 pt-3">
          <label v-if="requireText" class="block">
            <span class="text-[0.625rem] leading-4 text-muted">输入「{{ requireText }}」后继续</span>
            <input
              v-model="requiredTextInput"
              class="online-input mt-1 w-full"
              data-testid="online-action-dialog-required-text"
              :disabled="running"
              autocomplete="off"
            />
          </label>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              data-testid="online-action-dialog-cancel"
              :disabled="running"
              @click="handleCancel"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              :class="confirmButtonClass"
              data-testid="online-action-dialog-confirm"
              :disabled="confirmBlocked"
              @click="handleConfirm"
            >
              {{ running ? '处理中' : confirmLabel }}
            </button>
          </div>
        </footer>
      </section>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, useSlots, watch } from 'vue'
  import { useFullscreenTeleportTarget } from '@/composables/useFullscreenTeleportTarget'

  type DialogTone = 'default' | 'danger' | 'warning' | 'success'

  const props = withDefaults(defineProps<{
    open: boolean
    title: string
    description?: string
    tone?: DialogTone
    confirmLabel?: string
    cancelLabel?: string
    confirmDisabled?: boolean
    running?: boolean
    requireText?: string
    closeOnBackdrop?: boolean
  }>(), {
    description: '',
    tone: 'default',
    confirmLabel: '确认',
    cancelLabel: '取消',
    confirmDisabled: false,
    running: false,
    requireText: '',
    closeOnBackdrop: true,
  })

  const emit = defineEmits<{
    confirm: []
    cancel: []
    close: []
  }>()

  const slots = useSlots()
  const dialogRef = ref<HTMLElement | null>(null)
  const titleRef = ref<HTMLElement | null>(null)
  const requiredTextInput = ref('')
  const previousFocus = ref<HTMLElement | null>(null)
  const { teleportTarget, syncTeleportTarget } = useFullscreenTeleportTarget()
  const dialogId = `online-action-dialog-${Math.random().toString(36).slice(2, 10)}`
  const titleId = `${dialogId}-title`
  const descriptionId = `${dialogId}-description`

  const hasDetailsSlot = computed(() => Boolean(slots.details))
  const requireTextSatisfied = computed(() => !props.requireText || requiredTextInput.value.trim() === props.requireText)
  const confirmBlocked = computed(() => props.running || props.confirmDisabled || !requireTextSatisfied.value)
  const toneClass = computed(() => ({
    'border-danger/35': props.tone === 'danger',
    'border-warning/35': props.tone === 'warning',
    'border-success/35': props.tone === 'success',
  }))
  const confirmButtonClass = computed(() => props.tone === 'danger' ? 'online-action-btn--danger' : 'online-action-btn--primary')

  const focusFirstControl = async () => {
    await nextTick()
    const focusTarget = dialogRef.value?.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    )
    ;(focusTarget || titleRef.value || dialogRef.value)?.focus()
  }

  const restoreFocus = async () => {
    await nextTick()
    previousFocus.value?.focus()
    previousFocus.value = null
  }

  const requestClose = () => {
    emit('close')
  }

  const handleCancel = () => {
    emit('cancel')
    requestClose()
  }

  const handleConfirm = () => {
    if (confirmBlocked.value) return
    emit('confirm')
  }

  const handleBackdrop = () => {
    if (!props.closeOnBackdrop || props.running) return
    requestClose()
  }

  const handleEscape = () => {
    if (props.running) return
    if (props.tone === 'danger') {
      handleCancel()
      return
    }
    requestClose()
  }

  const handleGlobalKeydown = (event: KeyboardEvent) => {
    if (!props.open || event.key !== 'Escape') return
    event.preventDefault()
    handleEscape()
  }

  watch(
    () => props.open,
    isOpen => {
      if (isOpen) {
        syncTeleportTarget()
        previousFocus.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
        requiredTextInput.value = ''
        window.addEventListener('keydown', handleGlobalKeydown)
        void focusFirstControl()
        return
      }
      window.removeEventListener('keydown', handleGlobalKeydown)
      void restoreFocus()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleGlobalKeydown)
    void restoreFocus()
  })
</script>
