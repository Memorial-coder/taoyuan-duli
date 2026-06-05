<template>
  <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]" data-testid="online-cohabitation-warehouse-panel">
    <div class="game-panel-muted p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-accent">
          <Package :size="13" />
          <p class="text-sm">共同仓库</p>
        </div>
        <span class="text-[0.625rem] text-muted">{{ totalQuantity }} 件</span>
      </div>
      <div v-if="items.length === 0" class="mt-3 text-xs leading-5 text-muted">共同仓库当前没有可展示物品。</div>
      <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
        <div v-for="item in items" :key="`${item.item_id}-${item.quality}`" class="border border-accent/10 bg-black/10 p-2">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-xs text-text">{{ item.label || item.item_id }}</p>
              <p class="mt-1 text-[0.625rem] text-muted">{{ item.item_id }} · {{ item.quality || 'normal' }}</p>
              <p v-if="frozenQuantity(item) > 0" class="mt-1 text-[0.625rem] text-amber-100">
                &#20923;&#32467; {{ frozenQuantity(item) }} / &#21487;&#29992; {{ availableQuantity(item) }}
              </p>
            </div>
            <span class="text-xs text-accent">x{{ item.quantity }}</span>
          </div>
          <div class="mt-2 flex items-center justify-between gap-2">
            <span class="text-[0.625rem] text-muted">卖价 {{ sellUnitPriceForItem(item) || '未配置' }} 文</span>
            <div class="flex shrink-0 gap-2">
              <button
                type="button"
                class="online-action-btn online-action-btn--compact"
                :disabled="isHighValueItem(item) || !canWithdrawItem(item) || actionLoading"
                :data-testid="`online-cohabitation-warehouse-withdraw-${item.item_id}`"
                @click="emit('withdraw', item)"
              >
                取出 1 个
              </button>
              <button
                v-if="isHighValueItem(item)"
                type="button"
                class="online-action-btn online-action-btn--compact"
                :disabled="!canCreateHighValueDraft(item) || actionLoading"
                :data-testid="`online-cohabitation-warehouse-high-value-draft-${item.item_id}`"
                @click="emit('create-high-value-draft', item)"
              >
                申请取出
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact"
                :disabled="!canSellItem(item) || actionLoading"
                :data-testid="`online-cohabitation-warehouse-sell-${item.item_id}`"
                @click="emit('sell', item)"
              >
                卖出 1 个
              </button>
            </div>
          </div>
        </div>
      </div>
      <p v-if="actionMessage" class="mt-2 text-[0.625rem] leading-4" :class="actionOk ? 'text-emerald-200' : 'text-red-100'">
        {{ actionMessage }}
      </p>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
  import { Package } from 'lucide-vue-next'
  import type { CohabitationWarehouseItem } from '@/utils/cohabitationApi'

  type NumberResolver = (item: CohabitationWarehouseItem) => number
  type ItemGate = (item: CohabitationWarehouseItem) => boolean

  withDefaults(defineProps<{
    totalQuantity: number
    items: CohabitationWarehouseItem[]
    actionLoading?: boolean
    actionMessage?: string
    actionOk?: boolean
    frozenQuantity: NumberResolver
    availableQuantity: NumberResolver
    sellUnitPriceForItem: NumberResolver
    isHighValueItem: ItemGate
    canWithdrawItem: ItemGate
    canCreateHighValueDraft: ItemGate
    canSellItem: ItemGate
  }>(), {
    actionLoading: false,
    actionMessage: '',
    actionOk: false,
  })

  const emit = defineEmits<{
    withdraw: [item: CohabitationWarehouseItem]
    'create-high-value-draft': [item: CohabitationWarehouseItem]
    sell: [item: CohabitationWarehouseItem]
  }>()
</script>
