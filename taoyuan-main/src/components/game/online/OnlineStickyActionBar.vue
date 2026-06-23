<template>
  <div
    class="online-sticky-action-bar__spacer md:hidden"
    data-testid="online-sticky-action-bar-spacer"
    aria-hidden="true"
    :style="spacerStyle"
  />
  <aside
    ref="stickyActionBarRef"
    class="online-sticky-action-bar fixed inset-x-0 bottom-0 z-40 border-t border-accent/20 bg-panel/95 px-3 pt-3 backdrop-blur md:static md:border md:bg-black/10 md:p-3 md:backdrop-blur-0"
    data-testid="online-sticky-action-bar"
  >
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div v-if="statusLabel || disabledReason" class="min-w-0 text-xs leading-5">
        <p v-if="statusLabel" class="truncate text-accent" data-testid="online-sticky-status-label">
          {{ statusLabel }}
        </p>
        <p v-if="disabledReason" class="text-[0.625rem] leading-4 text-muted" data-testid="online-sticky-disabled-reason">
          {{ disabledReason }}
        </p>
      </div>

      <div
        v-if="mobileFixedActions.length"
        class="online-sticky-action-bar__fixed-actions"
        data-testid="online-sticky-fixed-actions"
        aria-label="房间关键操作"
      >
        <button
          v-for="action in mobileFixedActions"
          :key="action.id"
          type="button"
          class="online-sticky-action-bar__fixed-action"
          :class="buttonToneClass(action)"
          :data-testid="`online-sticky-fixed-action-${action.id}`"
          :disabled="action.disabled || Boolean(disabledReason)"
          @click="emitFixed(action)"
        >
          <component v-if="action.icon" :is="action.icon" :size="13" aria-hidden="true" />
          <span>{{ action.label }}</span>
          <small>{{ action.hint || (action.disabled ? '未就绪' : '可操作') }}</small>
        </button>
      </div>

      <div class="relative flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div v-if="secondaryActions.length" class="flex min-w-0 flex-wrap gap-2">
          <button
            v-for="action in secondaryActions"
            :key="action.id"
            type="button"
            class="online-action-btn online-action-btn--compact min-h-[44px] flex-1 justify-center sm:flex-none"
            :class="buttonToneClass(action)"
            :data-testid="`online-sticky-secondary-action-${action.id}`"
            :disabled="action.disabled"
            @click="emitSecondary(action)"
          >
            <component v-if="action.icon" :is="action.icon" :size="13" />
            {{ action.label }}
          </button>
        </div>

        <div v-if="moreActions.length" class="relative">
          <button
            type="button"
            class="online-action-btn online-action-btn--compact min-h-[44px] w-full justify-center sm:w-auto"
            data-testid="online-sticky-more-toggle"
            :aria-expanded="moreOpen"
            aria-controls="online-sticky-more-menu"
            @click="moreOpen = !moreOpen"
          >
            <MoreHorizontal :size="13" />
            更多
          </button>
          <Transition name="menu-pop">
            <div
              v-if="moreOpen"
              id="online-sticky-more-menu"
              class="game-panel absolute bottom-full right-0 mb-2 grid min-w-[12rem] gap-2 p-2"
              data-testid="online-sticky-more-menu"
              role="menu"
            >
              <button
                v-for="action in moreActions"
                :key="action.id"
                type="button"
                class="online-action-btn online-action-btn--compact justify-start"
                :class="buttonToneClass(action)"
                :data-testid="`online-sticky-more-action-${action.id}`"
                :disabled="action.disabled"
                role="menuitem"
                @click="emitMore(action)"
              >
                <component v-if="action.icon" :is="action.icon" :size="13" />
                {{ action.label }}
              </button>
            </div>
          </Transition>
        </div>

        <button
          v-if="primaryAction"
          type="button"
          class="online-action-btn min-h-[44px] w-full justify-center sm:w-auto"
          :class="primaryButtonClass"
          data-testid="online-sticky-primary-action"
          :disabled="primaryAction.disabled || Boolean(disabledReason)"
          @click="emitPrimary"
        >
          <component :is="primaryAction.icon || ArrowRight" :size="14" />
          {{ primaryAction.label }}
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
  import { ArrowRight, MoreHorizontal } from 'lucide-vue-next'

  type OnlineActionTone = 'default' | 'primary' | 'danger'

  export type OnlineStickyAction = {
    id: string
    label: string
    disabled?: boolean
    tone?: OnlineActionTone
    icon?: Component
    hint?: string
  }

  const props = withDefaults(defineProps<{
    statusLabel?: string
    primaryAction?: OnlineStickyAction | null
    secondaryActions?: OnlineStickyAction[]
    moreActions?: OnlineStickyAction[]
    mobileFixedActions?: OnlineStickyAction[]
    disabledReason?: string
  }>(), {
    statusLabel: '',
    primaryAction: null,
    secondaryActions: () => [],
    moreActions: () => [],
    mobileFixedActions: () => [],
    disabledReason: '',
  })

  const emit = defineEmits<{
    primary: []
    secondary: [id: string]
    more: [id: string]
    fixed: [id: string]
  }>()

  const moreOpen = ref(false)
  const stickyActionBarRef = ref<HTMLElement | null>(null)
  const stickyActionBarHeight = ref(0)
  let resizeObserver: ResizeObserver | null = null
  let syncFrame = 0

  const primaryButtonClass = computed(() => buttonToneClass(props.primaryAction))
  const spacerStyle = computed(() => stickyActionBarHeight.value > 0
    ? { '--online-sticky-action-bar-spacer-height': `${stickyActionBarHeight.value}px` }
    : undefined)

  const buttonToneClass = (action?: OnlineStickyAction | null) => ({
    'online-action-btn--primary': action?.tone === 'primary' || !action?.tone,
    'online-action-btn--danger': action?.tone === 'danger',
  })

  const syncStickyActionBarHeight = () => {
    if (typeof window === 'undefined') return
    if (syncFrame) window.cancelAnimationFrame(syncFrame)
    syncFrame = window.requestAnimationFrame(() => {
      syncFrame = 0
      const nextHeight = stickyActionBarRef.value?.getBoundingClientRect().height ?? 0
      stickyActionBarHeight.value = Math.ceil(nextHeight)
    })
  }

  const emitPrimary = () => {
    if (!props.primaryAction || props.primaryAction.disabled || props.disabledReason) return
    emit('primary')
  }

  const emitSecondary = (action: OnlineStickyAction) => {
    if (action.disabled) return
    emit('secondary', action.id)
  }

  const emitMore = (action: OnlineStickyAction) => {
    if (action.disabled) return
    moreOpen.value = false
    emit('more', action.id)
  }

  const emitFixed = (action: OnlineStickyAction) => {
    if (action.disabled || props.disabledReason) return
    emit('fixed', action.id)
  }

  watch(
    () => [
      props.statusLabel,
      props.disabledReason,
      props.primaryAction?.id,
      props.primaryAction?.label,
      props.primaryAction?.disabled,
      props.secondaryActions.map(action => `${action.id}:${action.label}:${action.disabled}`).join('|'),
      props.moreActions.map(action => `${action.id}:${action.label}:${action.disabled}`).join('|'),
      props.mobileFixedActions.map(action => `${action.id}:${action.label}:${action.disabled}:${action.hint}`).join('|'),
    ],
    () => {
      void nextTick(syncStickyActionBarHeight)
    }
  )

  onMounted(() => {
    syncStickyActionBarHeight()
    if (typeof ResizeObserver !== 'undefined' && stickyActionBarRef.value) {
      resizeObserver = new ResizeObserver(syncStickyActionBarHeight)
      resizeObserver.observe(stickyActionBarRef.value)
    }
    window.addEventListener('resize', syncStickyActionBarHeight)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (syncFrame) window.cancelAnimationFrame(syncFrame)
    window.removeEventListener('resize', syncStickyActionBarHeight)
  })
</script>

<style scoped>
  .online-sticky-action-bar__spacer {
    height: var(
      --online-sticky-action-bar-spacer-height,
      var(--online-sticky-action-bar-fallback-height, calc(6rem + env(safe-area-inset-bottom, 0px)))
    );
  }

  .online-sticky-action-bar {
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  }

  .online-sticky-action-bar__fixed-actions {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .online-sticky-action-bar__fixed-action {
    display: flex;
    min-width: 0;
    min-height: 52px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
    background: rgb(0 0 0 / 0.12);
    color: rgb(var(--color-text));
    padding: 0.35rem 0.25rem;
    text-align: center;
  }

  .online-sticky-action-bar__fixed-action:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .online-sticky-action-bar__fixed-action span,
  .online-sticky-action-bar__fixed-action small {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .online-sticky-action-bar__fixed-action span {
    font-size: 0.68rem;
    line-height: 1.15;
  }

  .online-sticky-action-bar__fixed-action small {
    color: var(--color-muted);
    font-size: 0.56rem;
    line-height: 1.1;
  }

  @media (min-width: 768px) {
    .online-sticky-action-bar {
      padding-bottom: 0.75rem;
    }

    .online-sticky-action-bar__fixed-actions {
      display: none;
    }
  }
</style>
