<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center space-x-1.5 text-sm text-accent mb-3">
      <Flower :size="14" />
      <span>农场装饰</span>
    </div>

    <!-- 美观度概览 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">当前美观度</p>
        <span class="text-sm text-accent font-medium">{{ decorationStore.beautyScore }}</span>
      </div>
      <div class="h-1.5 bg-bg rounded-xs border border-accent/10 mb-2">
        <div
          class="h-full rounded-xs bg-accent transition-all"
          :style="{ width: Math.min(100, Math.floor(decorationStore.beautyScore / 2)) + '%' }"
        />
      </div>
      <div class="grid grid-cols-3 gap-1 text-[10px] text-muted">
        <span :class="decorationStore.beautyScore >= 50 ? 'text-success' : ''">50: NPC好感+1/天</span>
        <span :class="decorationStore.beautyScore >= 100 ? 'text-success' : ''">100: 好感上限+250</span>
        <span :class="decorationStore.beautyScore >= 200 ? 'text-success' : ''">200: 商店折扣5%</span>
      </div>
    </div>

    <!-- 已放置装饰 -->
    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <p class="text-xs text-muted mb-2">
        <Home :size="12" class="inline" />
        已放置
      </p>
      <div v-if="placedDecorations.length === 0" class="flex flex-col items-center justify-center py-3 text-muted">
        <Flower :size="20" />
        <p class="text-xs mt-1">尚未放置任何装饰</p>
      </div>
      <div v-else class="flex flex-col space-y-1">
        <div
          v-for="item in placedDecorations"
          :key="item.def.id"
          class="flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1"
        >
          <div class="min-w-0">
            <span class="text-xs">{{ item.def.name }}</span>
            <span class="text-[10px] text-muted ml-1">×{{ item.placedCount }}</span>
            <span class="text-[10px] text-accent ml-1">美观+{{ item.def.beautyScore * item.placedCount }}</span>
          </div>
          <Button :icon="Minus" :icon-size="10" @click="handleRemove(item.def.id)" />
        </div>
      </div>
    </div>

    <!-- 装饰商店 -->
    <div class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">
          <ShoppingBag :size="12" class="inline" />
          装饰商店
        </p>
        <!-- 分类过滤 -->
        <div class="flex gap-1">
          <button
            v-for="cat in categories"
            :key="cat.value"
            class="text-[10px] px-1.5 py-0.5 rounded-xs border transition-colors"
            :class="activeCategory === cat.value ? 'border-accent text-accent' : 'border-accent/20 text-muted hover:border-accent/50'"
            @click="activeCategory = cat.value"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <div class="flex flex-col space-y-1.5">
        <div
          v-for="def in filteredDecorations"
          :key="def.id"
          class="border rounded-xs px-3 py-2"
          :class="isLocked(def) ? 'border-accent/10 opacity-50' : 'border-accent/20'"
        >
          <div class="flex items-center justify-between">
            <div class="min-w-0">
              <p class="text-xs">{{ def.name }}</p>
              <p class="text-[10px] text-muted truncate">{{ def.description }}</p>
              <div class="flex gap-2 mt-0.5">
                <span class="text-[10px] text-accent">美观+{{ def.beautyScore }}</span>
                <span class="text-[10px] text-muted">最多{{ def.maxCount }}个</span>
                <span v-if="def.unlockBeauty > 0 && isLocked(def)" class="text-[10px] text-muted">需美观度{{ def.unlockBeauty }}</span>
                <span v-if="getOwnedCount(def.id) > 0" class="text-[10px] text-muted">已购{{ getOwnedCount(def.id) }}个</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 ml-2 shrink-0">
              <Button
                :disabled="isLocked(def) || !canAfford(def.price)"
                @click="handleBuy(def.id)"
              >
                {{ def.price }}文
              </Button>
              <Button
                v-if="getOwnedCount(def.id) > decorationStore.getPlacedCount(def.id)"
                :icon="Plus"
                :icon-size="10"
                @click="handlePlace(def.id)"
              >
                放置
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Flower, Home, ShoppingBag, Plus, Minus } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useDecorationStore } from '@/stores/useDecorationStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { DECORATIONS, DECORATION_CATEGORY_NAMES } from '@/data/decorations'
  import type { DecorationCategory } from '@/data/decorations'
  import { addLog } from '@/composables/useGameLog'

  const decorationStore = useDecorationStore()
  const playerStore = usePlayerStore()

  const activeCategory = ref<DecorationCategory | 'all'>('all')

  const categories = [
    { value: 'all' as const, label: '全部' },
    ...Object.entries(DECORATION_CATEGORY_NAMES).map(([v, l]) => ({ value: v as DecorationCategory, label: l }))
  ]

  const filteredDecorations = computed(() =>
    activeCategory.value === 'all'
      ? DECORATIONS
      : DECORATIONS.filter(d => d.category === activeCategory.value)
  )

  const placedDecorations = computed(() =>
    DECORATIONS.filter(d => decorationStore.getPlacedCount(d.id) > 0)
      .map(d => ({ def: d, placedCount: decorationStore.getPlacedCount(d.id) }))
  )

  const isLocked = (def: (typeof DECORATIONS)[number]) =>
    decorationStore.beautyScore < def.unlockBeauty

  const canAfford = (price: number) => playerStore.money >= price

  const getOwnedCount = (id: string) => decorationStore.getOwnedCount(id)

  const handleBuy = (id: string) => {
    const result = decorationStore.buyDecoration(id)
    addLog(result.message)
  }

  const handlePlace = (id: string) => {
    const result = decorationStore.placeDecoration(id)
    addLog(result.message)
  }

  const handleRemove = (id: string) => {
    const result = decorationStore.removeDecoration(id)
    addLog(result.message)
  }
</script>
