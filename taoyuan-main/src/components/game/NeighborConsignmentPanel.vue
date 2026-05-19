<template>
  <div class="border border-accent/20 rounded-xs p-3 mb-4 bg-accent/5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm text-accent">邻里寄售</p>
          <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent">{{ overview.neighbor_group ? overview.neighbor_group.name : '未加入邻里' }}</span>
        </div>
        <p class="text-xs text-muted mt-1 leading-5">{{ overview.bulletin }}</p>
      </div>
      <button class="btn !px-2 !py-1 text-[10px] shrink-0" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="overview.neighbor_group" class="grid gap-2 mt-3 md:grid-cols-2">
      <div class="border border-accent/15 rounded-xs px-2 py-2 bg-bg/20">
        <p class="text-[10px] text-accent">邻里信息</p>
        <p class="text-xs text-text mt-1">{{ overview.neighbor_group.name }}</p>
        <p class="text-[10px] text-muted mt-1">身份：{{ overview.neighbor_group.role }} · 成员 {{ overview.neighbor_group.member_count }} 人</p>
      </div>
      <div class="border border-warning/15 rounded-xs px-2 py-2 bg-warning/5">
        <p class="text-[10px] text-warning">寄售规则</p>
        <div class="flex flex-wrap gap-1.5 mt-1">
          <span v-for="option in overview.scope_options" :key="option.id" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-warning/20 text-warning">
            {{ option.label }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="!overview.neighbor_group" class="border border-warning/20 rounded-xs px-2 py-2 mt-3 bg-warning/5">
      <p class="text-[10px] text-warning">请先加入邻里</p>
      <p class="text-xs text-muted mt-1">邻里寄售只对已加入邻里的玩家开放。</p>
    </div>

    <div class="mt-3 border border-accent/15 rounded-xs p-2 bg-bg/20">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-[10px] text-accent">挂出寄售</p>
        <span class="text-[10px] text-muted">固定价 · 到期回收</span>
      </div>
      <div class="grid gap-2 md:grid-cols-4">
        <label class="block">
          <span class="text-[10px] text-muted">物品 ID</span>
          <input v-model="draft.item_id" class="mt-1 w-full rounded-xs border border-accent/15 bg-bg/50 px-2 py-1 text-xs" placeholder="wood" />
        </label>
        <label class="block">
          <span class="text-[10px] text-muted">数量</span>
          <input v-model.number="draft.quantity" type="number" min="1" class="mt-1 w-full rounded-xs border border-accent/15 bg-bg/50 px-2 py-1 text-xs" />
        </label>
        <label class="block">
          <span class="text-[10px] text-muted">固定价</span>
          <input v-model.number="draft.price_money" type="number" min="1" class="mt-1 w-full rounded-xs border border-accent/15 bg-bg/50 px-2 py-1 text-xs" />
        </label>
        <label class="block">
          <span class="text-[10px] text-muted">范围</span>
          <select v-model="draft.scope" class="mt-1 w-full rounded-xs border border-accent/15 bg-bg/50 px-2 py-1 text-xs">
            <option v-for="option in overview.scope_options" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
        </label>
      </div>
      <div class="mt-2 flex flex-wrap gap-2">
        <button class="btn !px-2 !py-1 text-xs" :disabled="running || !overview.neighbor_group" @click="$emit('create', { ...draft })">挂出</button>
      </div>
      <p class="text-[10px] text-muted mt-2">当前第一版寄售只支持普通品质物资，挂单会从服务端存档里扣除对应普通品质库存。</p>
    </div>

    <div class="grid gap-2 mt-3">
      <div class="border border-accent/15 rounded-xs p-2 bg-bg/20">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-[10px] text-accent">当前可买</p>
          <span class="text-[10px] text-muted">{{ overview.open_listings.length }} 单</span>
        </div>
        <div class="space-y-2">
          <div v-for="listing in overview.open_listings" :key="listing.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-text">{{ formatItemName(listing.item_id) }} ×{{ listing.quantity }}</p>
                <p class="text-[10px] text-muted mt-1">卖家：{{ listing.seller_username }} · {{ listing.scope_label }} · {{ listing.status }}</p>
              </div>
              <span class="text-xs text-accent">{{ listing.price_money }}文</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button class="btn !px-2 !py-1 text-[10px]" :disabled="running || !listing.can_buy" @click="$emit('buy', listing.id)">购买</button>
              <button v-if="listing.can_cancel" class="btn !px-2 !py-1 text-[10px]" :disabled="running" @click="$emit('cancel', listing.id)">取消</button>
              <button v-if="listing.can_reclaim" class="btn !px-2 !py-1 text-[10px]" :disabled="running" @click="$emit('reclaim', listing.id)">回收</button>
            </div>
            <p v-if="!listing.can_buy && listing.visible_to_viewer" class="text-[10px] text-warning mt-1">当前无法购买这份寄售。</p>
          </div>
        </div>
      </div>

      <div v-if="overview.my_listings.length > 0" class="border border-accent/15 rounded-xs p-2 bg-bg/20">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-[10px] text-accent">我的寄售</p>
          <span class="text-[10px] text-muted">{{ overview.my_listings.length }} 单</span>
        </div>
        <div class="space-y-2">
          <div v-for="listing in overview.my_listings" :key="listing.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-text">{{ formatItemName(listing.item_id) }} ×{{ listing.quantity }} · {{ listing.price_money }}文</p>
            <p class="text-[10px] text-muted mt-1">{{ listing.scope_label }} · {{ listing.status }}</p>
            <button v-if="listing.can_cancel" class="mt-2 btn !px-2 !py-1 text-[10px]" :disabled="running" @click="$emit('cancel', listing.id)">取消挂单</button>
            <button v-else-if="listing.can_reclaim" class="mt-2 btn !px-2 !py-1 text-[10px]" :disabled="running" @click="$emit('reclaim', listing.id)">回收过期物资</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watchEffect } from 'vue'
import { getItemById } from '@/data'
import type { NeighborConsignmentOverview } from '@/utils/neighborConsignmentApi'

const props = defineProps<{
  overview: NeighborConsignmentOverview
  loading?: boolean
  running?: boolean
}>()

defineEmits<{
  (event: 'refresh'): void
  (event: 'create', payload: { item_id: string; quantity: number; price_money: number; scope: 'neighbors' | 'friends'; duration_hours?: number; expires_at?: number }): void
  (event: 'buy', listingId: string): void
  (event: 'cancel', listingId: string): void
  (event: 'reclaim', listingId: string): void
}>()

const loading = computed(() => props.loading === true)
const running = computed(() => props.running === true)
const draft = reactive({
  item_id: 'wood',
  quantity: 1,
  price_money: 50,
  scope: 'neighbors' as 'neighbors' | 'friends',
  duration_hours: 72,
})

watchEffect(() => {
  if (!props.overview.scope_options.some(option => option.id === draft.scope)) {
    draft.scope = props.overview.scope_options[0]?.id ?? 'neighbors'
  }
})

const formatItemName = (itemId: string) => getItemById(itemId)?.name ?? itemId
</script>
