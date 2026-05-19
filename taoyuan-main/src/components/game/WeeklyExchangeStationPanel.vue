<template>
  <div class="border border-accent/20 rounded-xs p-3 mb-4 bg-accent/5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm text-accent">每周交换站</p>
          <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent">{{ station.week_label }}</span>
        </div>
        <p class="text-xs text-muted mt-1 leading-5">{{ station.bulletin }}</p>
        <p class="text-[10px] text-muted mt-1">{{ station.refresh_hint }}</p>
      </div>
      <button class="btn !px-2 !py-1 text-[10px] shrink-0" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="!station.save_available" class="border border-warning/20 rounded-xs px-2 py-2 mt-3 bg-warning/5">
      <p class="text-[10px] text-warning">服务端存档未就绪</p>
      <p class="text-xs text-muted mt-1">{{ station.save_message || '当前没有可用的服务端存档，暂时不能换物。' }}</p>
    </div>

    <div class="grid gap-2 mt-3">
      <div
        v-for="offer in station.offers"
        :key="offer.id"
        class="border rounded-xs px-3 py-3"
        :class="offer.can_exchange ? 'border-accent/15 bg-bg/30' : 'border-warning/20 bg-warning/5 opacity-80'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <p class="text-sm text-text">{{ offer.name }}</p>
              <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent">{{ offer.badge }}</span>
              <span
                v-for="tag in offer.tags.slice(0, 2)"
                :key="`${offer.id}-${tag}`"
                class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/10 text-muted"
              >
                {{ tag }}
              </span>
            </div>
            <p class="text-xs text-muted mt-1 leading-5">{{ offer.description }}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div class="border border-danger/15 rounded-xs px-2 py-2 bg-danger/5">
                <p class="text-[10px] text-danger mb-1">交出</p>
                <p class="text-xs text-text">{{ formatBundle(offer.costs) }}</p>
              </div>
              <div class="border border-success/15 rounded-xs px-2 py-2 bg-success/5">
                <p class="text-[10px] text-success mb-1">换回</p>
                <p class="text-xs text-text">{{ formatBundle(offer.rewards) }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-3 mt-2 text-[10px] text-muted">
              <span>个人已换 {{ offer.claimed_by_user }}/{{ offer.weekly_limit_per_user }}</span>
              <span>站内余量 {{ offer.remaining_global }}/{{ offer.station_stock }}</span>
            </div>
            <p v-if="!offer.can_exchange && offer.disabled_reason" class="text-[10px] text-warning mt-2">{{ offer.disabled_reason }}</p>
          </div>
          <button
            class="btn !px-2 !py-1 text-xs shrink-0"
            :disabled="running || !offer.can_exchange"
            @click="$emit('exchange', offer.id)"
          >
            {{ running ? '换物中...' : '立即换物' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="station.my_records.length > 0" class="mt-3 border border-accent/10 rounded-xs p-2 bg-bg/20">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-[10px] text-accent">本周换物记录</p>
        <span class="text-[10px] text-muted">{{ station.my_records.length }} 条</span>
      </div>
      <div class="space-y-1.5">
        <div v-for="record in station.my_records.slice(0, 4)" :key="record.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-text">{{ record.offer_name }}</p>
            <span class="text-[10px] text-muted">{{ formatTime(record.created_at) }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">交出 {{ formatBundle(record.costs) }} · 换回 {{ formatBundle(record.rewards) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getItemById } from '@/data'
import type { WeeklyExchangeBundleEntry, WeeklyExchangeStationSnapshot } from '@/utils/weeklyExchangeApi'

const props = defineProps<{
  station: WeeklyExchangeStationSnapshot
  loading?: boolean
  running?: boolean
}>()

defineEmits<{
  (event: 'refresh'): void
  (event: 'exchange', offerId: string): void
}>()

const loading = computed(() => props.loading === true)
const running = computed(() => props.running === true)

const formatBundle = (entries: WeeklyExchangeBundleEntry[]) => {
  if (!Array.isArray(entries) || entries.length === 0) return '无'
  return entries
    .map(entry => {
      if (entry.type === 'money') return `${entry.amount}文`
      const def = getItemById(entry.item_id)
      return `${def?.name ?? entry.item_id}×${entry.quantity}`
    })
    .join('、')
}

const formatTime = (unixSeconds: number) => {
  const date = new Date(Number(unixSeconds || 0) * 1000)
  if (Number.isNaN(date.getTime())) return '--:--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}
</script>
