<template>
  <div class="border border-warning/20 rounded-xs p-3 mb-4 bg-warning/5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm text-warning">节庆摊位</p>
          <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-warning/20 text-warning">{{ stall.week_label }}</span>
        </div>
        <p class="text-xs text-muted mt-1 leading-5">{{ stall.bulletin }}</p>
        <p class="text-[10px] text-muted mt-1">{{ stall.refresh_hint }}</p>
      </div>
      <button class="btn !px-2 !py-1 text-[10px] shrink-0" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="stall.festival_theme || categories.length > 0" class="grid gap-2 mt-3 md:grid-cols-2">
      <div v-if="stall.festival_theme" class="border border-warning/15 rounded-xs px-2 py-2 bg-warning/10">
        <p class="text-[10px] text-warning">本周节庆主题</p>
        <p class="text-xs text-text mt-1">{{ stall.festival_theme.label }}</p>
        <p class="text-[10px] text-muted mt-1 leading-4">{{ stall.festival_theme.bulletin }}</p>
      </div>
      <div v-if="categories.length > 0" class="border border-accent/15 rounded-xs px-2 py-2 bg-accent/5">
        <p class="text-[10px] text-accent">摊位分类</p>
        <div class="mt-1 space-y-1">
          <div v-for="category in categories" :key="category.id" class="flex items-center justify-between gap-2 text-[10px] text-muted">
            <span>{{ category.label }}</span>
            <span>{{ category.offer_count }} 项</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!stall.save_available" class="border border-warning/20 rounded-xs px-2 py-2 mt-3 bg-warning/10">
      <p class="text-[10px] text-warning">服务端存档未就绪</p>
      <p class="text-xs text-muted mt-1">{{ stall.save_message || '当前没有可用的服务端存档，暂时不能购买节庆摊位。' }}</p>
    </div>

    <div class="grid gap-3 mt-3">
      <div v-for="section in groupedCategorySections" :key="section.id" class="border border-warning/10 rounded-xs p-2 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs text-warning">{{ section.label }}</p>
          <span class="text-[10px] text-muted">{{ section.offers.length }} 项</span>
        </div>
        <div class="grid gap-2">
          <div
            v-for="offer in section.offers"
            :key="offer.id"
            class="border rounded-xs px-3 py-3"
            :class="offer.can_exchange ? 'border-warning/15 bg-bg/30' : 'border-danger/20 bg-danger/5 opacity-80'"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-sm text-text">{{ offer.name }}</p>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-warning/20 text-warning">{{ offer.badge }}</span>
                  <span
                    v-for="tag in offer.tags.slice(0, 2)"
                    :key="`${offer.id}-${tag}`"
                    class="text-[10px] px-1.5 py-0.5 rounded-xs border border-warning/10 text-muted"
                  >
                    {{ tag }}
                  </span>
                </div>
                <p class="text-xs text-muted mt-1 leading-5">{{ offer.description }}</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div class="border border-danger/15 rounded-xs px-2 py-2 bg-danger/5">
                    <p class="text-[10px] text-danger mb-1">花费</p>
                    <p class="text-xs text-text">{{ formatBundle(offer.costs) }}</p>
                  </div>
                  <div class="border border-success/15 rounded-xs px-2 py-2 bg-success/5">
                    <p class="text-[10px] text-success mb-1">带回</p>
                    <p class="text-xs text-text">{{ formatBundle(offer.rewards) }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-3 mt-2 text-[10px] text-muted">
                  <span>个人已买 {{ offer.claimed_by_user }}/{{ offer.weekly_limit_per_user }}</span>
                  <span>摊位余量 {{ offer.remaining_global }}/{{ offer.station_stock }}</span>
                </div>
                <p v-if="!offer.can_exchange && offer.disabled_reason" class="text-[10px] text-warning mt-2">{{ offer.disabled_reason }}</p>
              </div>
              <button
                class="btn !px-2 !py-1 text-xs shrink-0"
                :disabled="running || !offer.can_exchange"
                @click="$emit('buy', offer.id)"
              >
                {{ running ? '购买中...' : `购买 ${offer.price_money}文` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="stall.my_records.length > 0" class="mt-3 border border-warning/10 rounded-xs p-2 bg-bg/20">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-[10px] text-warning">本周购买记录</p>
        <span class="text-[10px] text-muted">{{ stall.my_records.length }} 条</span>
      </div>
      <div class="space-y-1.5">
        <div v-for="record in stall.my_records.slice(0, 4)" :key="record.id" class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-text">{{ record.offer_name }}</p>
            <span class="text-[10px] text-muted">{{ formatTime(record.created_at) }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">花费 {{ formatBundle(record.costs) }} · 带回 {{ formatBundle(record.rewards) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getItemById } from '@/data'
import type { FestivalStallBundleEntry, FestivalStallSnapshot } from '@/utils/festivalStallApi'

const props = defineProps<{
  stall: FestivalStallSnapshot
  loading?: boolean
  running?: boolean
}>()

defineEmits<{
  (event: 'refresh'): void
  (event: 'buy', offerId: string): void
}>()

const loading = computed(() => props.loading === true)
const running = computed(() => props.running === true)
const categories = computed(() => (props.stall.categories ?? []).filter(category => Number(category.offer_count || 0) > 0))
const groupedCategorySections = computed(() => {
  const offers = Array.isArray(props.stall.offers) ? props.stall.offers : []
  return categories.value
    .map(category => ({
      ...category,
      offers: offers.filter(offer => offer.booth_category === category.id)
    }))
    .filter(section => section.offers.length > 0)
})

const formatBundle = (entries: FestivalStallBundleEntry[]) => {
  if (!Array.isArray(entries) || entries.length === 0) return '无'
  return entries
    .map(entry => {
      if (entry.type === 'money') return `${entry.amount}文`
      if (entry.type === 'ticket') return `${entry.ticket_type}券×${entry.quantity}`
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
