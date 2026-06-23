<template>
  <div>
    <div class="flex items-center space-x-1.5 text-sm text-accent mb-3">
      <Flower :size="14" />
      <span>农场装饰</span>
    </div>

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
      <div class="grid grid-cols-3 gap-1 text-[0.625rem] text-muted">
        <span :class="decorationStore.beautyScore >= 50 ? 'text-success' : ''">50: NPC好感+1/天</span>
        <span :class="decorationStore.beautyScore >= 100 ? 'text-success' : ''">100: 好感上限+250</span>
        <span :class="decorationStore.beautyScore >= 200 ? 'text-success' : ''">200: 商店折扣5%</span>
      </div>
      <div
        class="mt-3 grid gap-1.5"
        data-testid="decoration-demand-bias-panel"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-muted">需求风向</p>
          <span class="text-[0.625rem] text-accent">{{ decorationStore.activeDecorationDemandBiases.length }}/{{ decorationStore.decorationDemandBiasOverview.length }}</span>
        </div>
        <div
          v-for="bias in decorationStore.decorationDemandBiasOverview"
          :key="bias.id"
          class="border border-accent/10 bg-black/10 px-2 py-1.5"
          data-testid="decoration-demand-bias-row"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[0.625rem]" :class="bias.unlocked ? 'text-accent' : 'text-muted'">{{ bias.label }}</p>
            <span class="shrink-0 text-[0.625rem]" :class="bias.unlocked ? 'text-success' : 'text-muted'">
              {{ bias.unlocked ? `权重+${bias.weight}` : bias.progressLabel }}
            </span>
          </div>
          <p class="mt-0.5 text-[0.625rem] leading-4 text-muted">{{ bias.summary }}</p>
          <p class="mt-0.5 text-[0.625rem] leading-4 text-muted/70">
            影响：{{ bias.familyWishIds.map(getFamilyWishTitle).join('、') }} · {{ bias.guardrail }}
          </p>
        </div>
      </div>
      <div
        v-if="decorationStore.npcDecorationEffectSummary.length > 0"
        class="mt-3 grid gap-1.5"
        data-testid="decoration-npc-effect-summary"
      >
        <div
          v-for="effect in decorationStore.npcDecorationEffectSummary"
          :key="effect.id"
          class="border border-accent/10 bg-black/10 px-2 py-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[0.625rem] text-accent">{{ effect.label }}</p>
            <span class="shrink-0 text-[0.625rem] text-success">{{ effect.value }}</span>
          </div>
          <p class="mt-0.5 text-[0.625rem] leading-4 text-muted">{{ effect.summary }}</p>
        </div>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <p class="text-xs text-muted mb-2">
        <Home :size="12" class="inline" />
        已放置
      </p>
      <div v-if="placedDecorations.length === 0" class="flex flex-col items-center justify-center py-3 text-muted">
        <Flower :size="20" />
        <p class="text-xs mt-1">尚未放置任何装饰</p>
      </div>
      <div v-else class="decoration-card-grid desktop-adaptive-grid--cards" data-testid="decoration-placed-grid">
        <div
          v-for="item in placedDecorations"
          :key="item.def.id"
          class="decoration-card-grid__item flex items-center gap-1.5 border border-accent/10 rounded-xs px-2 py-1"
        >
          <ItemIcon :item="decoItem(item.def)" size="xs" :show-badge="false" />
          <div class="min-w-0">
            <span class="text-xs">{{ item.def.name }}</span>
            <span class="text-[0.625rem] text-muted ml-1">x{{ item.placedCount }}</span>
            <span class="text-[0.625rem] text-accent ml-1">美观+{{ item.def.beautyScore * item.placedCount }}</span>
          </div>
          <Button class="shrink-0" :icon="Minus" :icon-size="10" @click="handleRemove(item.def.id)" />
        </div>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">
          <ShoppingBag :size="12" class="inline" />
          装饰商店
        </p>
        <div class="flex gap-1">
          <button
            v-for="cat in categories"
            :key="cat.value"
            class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border transition-colors"
            :class="activeCategory === cat.value ? 'border-accent text-accent' : 'border-accent/20 text-muted hover:border-accent/50'"
            @click="activeCategory = cat.value"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <div class="decoration-card-grid desktop-adaptive-grid--cards" data-testid="decoration-shop-grid">
        <div
          v-for="def in filteredDecorations"
          :key="def.id"
          class="decoration-card-grid__item border rounded-xs px-3 py-2"
          :class="isUnavailable(def) ? 'border-accent/10 opacity-50' : 'border-accent/20'"
        >
          <div class="flex items-center gap-2">
            <ItemIcon :item="decoItem(def)" size="xs" :show-badge="false" :silhouette="isLocked(def)" />
            <div class="min-w-0 flex-1">
              <p class="text-xs">{{ def.name }}</p>
              <p class="text-[0.625rem] text-muted truncate">{{ def.description }}</p>
              <div class="flex gap-2 mt-0.5 flex-wrap">
                <span class="text-[0.625rem] text-accent">美观+{{ def.beautyScore }}</span>
                <span class="text-[0.625rem] text-muted">最多{{ def.maxCount }}个</span>
                <span v-if="isCatalogDecoration(def)" class="text-[0.625rem] text-muted">目录限定</span>
                <span v-else-if="def.unlockBeauty > 0 && isLocked(def)" class="text-[0.625rem] text-muted">需美观度{{ def.unlockBeauty }}</span>
                <span v-if="hasReachedMaxCount(def.id)" class="text-[0.625rem] text-muted">已达上限</span>
                <span v-if="getOwnedCount(def.id) > 0" class="text-[0.625rem] text-muted">已购{{ getOwnedCount(def.id) }}个</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <Button
                v-if="!isCatalogDecoration(def) || isCatalogDirectPurchaseUnlocked(def)"
                :disabled="!canBuy(def.id)"
                @click="handleBuy(def.id)"
              >
                {{ def.price }}文
              </Button>
              <span v-else-if="getOwnedCount(def.id) === 0" class="text-[0.625rem] text-muted">需赵木匠「定制家具」或商店目录</span>
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
  import { ref, computed, onMounted } from 'vue'
  import { Flower, Home, ShoppingBag, Plus, Minus } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { loadItemIconManifest } from '@/composables/useItemIconManifest'
  import { useDecorationStore } from '@/stores/useDecorationStore'
  import { DECORATIONS, DECORATION_CATEGORY_NAMES } from '@/data/decorations'
  import { WS09_FAMILY_WISH_DEFS, WS15_FAMILY_WISH_DEFS } from '@/data/npcs'
  import type { DecorationCategory } from '@/data/decorations'
  import { addLog } from '@/composables/useGameLog'
  import { scrollByViewport, useKeyboardShortcutTabActions } from '@/composables/useKeyboardShortcutContextActions'
  import type { ItemDef } from '@/types'

  const decorationStore = useDecorationStore()
  const activeCategory = ref<DecorationCategory | 'all'>('all')

  type DecorationEntry = (typeof DECORATIONS)[number]
  const familyWishTitleMap = new Map([...WS09_FAMILY_WISH_DEFS, ...WS15_FAMILY_WISH_DEFS].map(wish => [wish.id, wish.title]))

  const decoItem = (def: DecorationEntry): ItemDef => ({
    id: def.id,
    name: def.name,
    category: 'misc',
    description: def.description,
    sellPrice: def.price,
    edible: false,
  })

  onMounted(() => { void loadItemIconManifest() })

  const categories = [
    { value: 'all' as const, label: '全部' },
    ...Object.entries(DECORATION_CATEGORY_NAMES).map(([value, label]) => ({ value: value as DecorationCategory, label }))
  ]

  const decorationCategoryTabs = categories.map(category => category.value)

  useKeyboardShortcutTabActions({
    tabs: decorationCategoryTabs,
    current: activeCategory,
    onPageUp: () => scrollByViewport(-1),
    onPageDown: () => scrollByViewport(1)
  })

  const filteredDecorations = computed(() =>
    activeCategory.value === 'all'
      ? DECORATIONS
      : DECORATIONS.filter(def => def.category === activeCategory.value)
  )

  const placedDecorations = computed(() =>
    DECORATIONS.filter(def => decorationStore.getPlacedCount(def.id) > 0)
      .map(def => ({ def, placedCount: decorationStore.getPlacedCount(def.id) }))
  )

  const isCatalogDecoration = (def: DecorationEntry) => decorationStore.isCatalogDecoration(def.id)
  const isCatalogDirectPurchaseUnlocked = (def: DecorationEntry) => decorationStore.isCatalogDirectPurchaseUnlocked(def.id)

  const isLocked = (def: DecorationEntry) =>
    !decorationStore.isUnlockedForDirectPurchase(def.id)

  const isUnavailable = (def: DecorationEntry) =>
    isLocked(def) || (isCatalogDecoration(def) && !isCatalogDirectPurchaseUnlocked(def) && getOwnedCount(def.id) === 0)

  const canBuy = (id: string) => decorationStore.canBuyDecoration(id)

  const getOwnedCount = (id: string) => decorationStore.getOwnedCount(id)

  const hasReachedMaxCount = (id: string) => decorationStore.hasReachedMaxCount(id)

  const getFamilyWishTitle = (wishId: string) => familyWishTitleMap.get(wishId) ?? wishId

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

<style scoped>
  .decoration-card-grid__item {
    min-width: 0;
  }
</style>
