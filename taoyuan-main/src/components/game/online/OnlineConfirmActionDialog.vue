<template>
  <OnlineActionDialog
    :open="open"
    :title="title"
    :description="description"
    tone="danger"
    :confirm-label="confirmLabel"
    :cancel-label="cancelLabel"
    :confirm-disabled="confirmBlocked"
    :running="running"
    :close-on-backdrop="false"
    @confirm="handleConfirm"
    @cancel="emit('cancel')"
    @close="emit('close')"
  >
    <div class="space-y-3" data-testid="online-confirm-action-dialog">
      <section class="game-panel-muted p-2">
        <p class="text-xs leading-5 text-accent">影响对象</p>
        <ul class="mt-2 space-y-2" data-testid="online-confirm-impact-list" role="list">
          <li
            v-for="item in normalizedImpactItems"
            :key="item.id"
            class="flex min-w-0 justify-between gap-3 text-[0.625rem] leading-4 text-muted"
          >
            <span class="min-w-0 truncate">{{ item.label }}</span>
            <span v-if="item.value" class="shrink-0 text-accent">{{ item.value }}</span>
          </li>
          <li v-if="normalizedImpactItems.length === 0" class="text-[0.625rem] leading-4 text-danger">
            缺少影响对象
          </li>
        </ul>
      </section>

      <section v-if="normalizedAssetChanges.length" class="game-panel-muted p-2">
        <p class="text-xs leading-5 text-accent">资产变化</p>
        <ul class="mt-2 space-y-2" data-testid="online-confirm-asset-list" role="list">
          <li
            v-for="item in normalizedAssetChanges"
            :key="item.id"
            class="flex min-w-0 justify-between gap-3 text-[0.625rem] leading-4 text-muted"
          >
            <span class="min-w-0 truncate">{{ item.label }}</span>
            <span v-if="item.value" class="shrink-0 text-accent">{{ item.value }}</span>
          </li>
        </ul>
      </section>

      <p v-if="irreversible" class="border border-danger/25 bg-danger/10 p-2 text-[0.625rem] leading-5 text-danger" data-testid="online-confirm-irreversible">
        此操作不可撤销
      </p>

      <p v-if="recoveryHint" class="text-[0.625rem] leading-5 text-muted" data-testid="online-confirm-recovery-hint">
        {{ recoveryHint }}
      </p>

      <label v-if="requireText" class="block">
        <span class="text-[0.625rem] leading-4 text-muted">输入「{{ requireText }}」后继续</span>
        <input
          v-model="requiredTextInput"
          class="online-input mt-1 w-full"
          data-testid="online-confirm-required-text"
          :disabled="running"
          autocomplete="off"
        />
      </label>
    </div>

    <template #footer="{ confirm, cancel }">
      <footer class="space-y-3 border-t border-accent/10 pt-3">
        <p v-if="confirmBlockedReason" class="text-[0.625rem] leading-4 text-muted" data-testid="online-confirm-disabled-reason">
          {{ confirmBlockedReason }}
        </p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            data-testid="online-confirm-action-dialog-cancel"
            :disabled="running"
            @click="cancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="online-action-btn online-action-btn--compact online-action-btn--danger justify-center"
            data-testid="online-confirm-action-dialog-confirm"
            :disabled="confirmBlocked"
            @click="confirm"
          >
            {{ running ? '处理中' : confirmLabel }}
          </button>
        </div>
      </footer>
    </template>
  </OnlineActionDialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import OnlineActionDialog from './OnlineActionDialog.vue'

  type ConfirmItemInput = string | {
    id?: string
    label: string
    value?: string
  }

  type ConfirmItem = {
    id: string
    label: string
    value: string
  }

  const props = withDefaults(defineProps<{
    open: boolean
    title: string
    description?: string
    impactItems?: ConfirmItemInput[]
    assetChanges?: ConfirmItemInput[]
    irreversible?: boolean
    requireText?: string
    confirmLabel?: string
    cancelLabel?: string
    running?: boolean
    recoveryHint?: string
  }>(), {
    description: '',
    impactItems: () => [],
    assetChanges: () => [],
    irreversible: false,
    requireText: '',
    confirmLabel: '确认执行',
    cancelLabel: '取消',
    running: false,
    recoveryHint: '',
  })

  const emit = defineEmits<{
    confirm: []
    cancel: []
    close: []
  }>()

  const requiredTextInput = ref('')

  const normalizeItems = (items: ConfirmItemInput[], prefix: string): ConfirmItem[] => items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `${prefix}-${index}-${item}`,
        label: item,
        value: '',
      }
    }

    return {
      id: item.id || `${prefix}-${index}-${item.label}`,
      label: item.label,
      value: item.value || '',
    }
  })

  const normalizedImpactItems = computed(() => normalizeItems(props.impactItems, 'impact'))
  const normalizedAssetChanges = computed(() => normalizeItems(props.assetChanges, 'asset'))
  const requireTextSatisfied = computed(() => !props.requireText || requiredTextInput.value.trim() === props.requireText)
  const hasImpactItems = computed(() => normalizedImpactItems.value.length > 0)
  const confirmBlocked = computed(() => props.running || !hasImpactItems.value || !requireTextSatisfied.value)
  const confirmBlockedReason = computed(() => {
    if (!hasImpactItems.value) return '需要先提供影响对象'
    if (!requireTextSatisfied.value) return '确认文字未填写'
    return ''
  })

  const handleConfirm = () => {
    if (confirmBlocked.value) return
    emit('confirm')
  }

  watch(
    () => props.open,
    isOpen => {
      if (isOpen) requiredTextInput.value = ''
    }
  )
</script>
