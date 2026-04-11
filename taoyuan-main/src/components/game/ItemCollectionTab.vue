<template>
  <div>
    <div class="border border-accent/10 rounded-xs p-2 mb-2 space-y-2">
      <div>
        <p class="text-xs text-muted mb-1">图鉴分区快捷入口</p>
        <div class="flex flex-wrap gap-1">
          <Button class="justify-center" @click="navigateToPanel('breeding')">
            <FlaskConical :size="12" class="mr-1" />
            育种图鉴
          </Button>
          <Button class="justify-center" @click="navigateToPanel('fishpond')">
            <Waves :size="12" class="mr-1" />
            鱼塘图鉴
          </Button>
          <Button class="justify-center" @click="navigateToPanel('guild')">
            <Swords :size="12" class="mr-1" />
            怪物图鉴
          </Button>
        </div>
      </div>

      <div class="relative">
        <Search :size="12" class="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          v-model="collectionSearch"
          type="text"
          placeholder="搜索名称或描述…"
          class="w-full bg-transparent border border-accent/20 rounded-xs pl-6 pr-2 py-1 text-xs text-text placeholder:text-muted/50 outline-none focus:border-accent/50"
        />
      </div>

      <div class="flex flex-wrap gap-1">
        <button
          v-for="cat in collectionCategories"
          :key="cat.value"
          class="px-1.5 py-0.5 text-xs rounded-xs border transition-colors"
          :class="collectionCategory === cat.value ? 'bg-accent text-bg border-accent' : 'border-accent/20 text-muted hover:border-accent/50'"
          @click="collectionCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="flex flex-wrap gap-1">
        <button
          v-for="option in collectionDiscoverFilters"
          :key="option.value"
          class="px-1.5 py-0.5 text-xs rounded-xs border transition-colors"
          :class="collectionDiscoverFilter === option.value ? 'bg-accent text-bg border-accent' : 'border-accent/20 text-muted hover:border-accent/50'"
          @click="collectionDiscoverFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs text-muted">已发现 {{ achievementStore.discoveredCount }}/{{ allItems.length }}</p>
          <p class="text-xs text-muted/70">当前筛选 {{ filteredDiscoveredCount }}/{{ filteredCollectionItems.length }}</p>
        </div>
        <select
          v-model="collectionSort"
          class="bg-transparent border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent/50"
        >
          <option value="default">默认排序</option>
          <option value="recent">最近发现</option>
          <option value="price_desc">售价从高到低</option>
          <option value="price_asc">售价从低到高</option>
        </select>
      </div>
    </div>

    <div v-if="filteredCollectionItems.length === 0" class="flex flex-col items-center justify-center py-10 space-y-2 border border-accent/10 rounded-xs">
      <BookOpen :size="36" class="text-accent/20" />
      <p class="text-xs text-muted">当前筛选下没有匹配条目</p>
    </div>

    <div ref="collectionRef" class="max-h-72 overflow-y-auto" @scroll="onCollectionScroll">
      <div v-if="filteredCollectionItems.length > 0" :style="{ paddingTop: topPad + 'px', paddingBottom: bottomPad + 'px' }">
        <div class="grid grid-cols-3 md:grid-cols-5 gap-1">
          <div
            v-for="item in visibleItems"
            :key="item.id"
            class="border rounded-xs p-1.5 text-xs text-center truncate mr-1"
            :class="
              achievementStore.isDiscovered(item.id)
                ? 'border-accent/20 cursor-pointer hover:bg-accent/5 ' + getCategoryColor(item.category)
                : 'border-accent/10 text-muted/40 cursor-pointer hover:bg-accent/5'
            "
            @click="activeCollectionId = item.id"
          >
            <template v-if="achievementStore.isDiscovered(item.id)">{{ item.name }}</template>
            <Lock v-else :size="12" class="mx-auto text-muted/30" />
          </div>
        </div>
      </div>
    </div>

    <div class="border border-accent/10 rounded-xs p-2 mt-2 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs text-muted">图鉴阶段进度</p>
          <p v-if="nextCollectionMilestone" class="text-xs text-accent">
            距离「{{ nextCollectionMilestone.title }}」还差 {{ nextCollectionMilestone.remaining }} 种发现
          </p>
          <p v-else class="text-xs text-success">已达到当前全部图鉴阶段里程碑</p>
        </div>
        <span class="text-xs text-muted">{{ achievementStore.discoveredCount }}/{{ allItems.length }}</span>
      </div>

      <div class="grid grid-cols-1 gap-1">
        <div
          v-for="milestone in collectionMilestones"
          :key="milestone.count"
          class="border rounded-xs px-2 py-1.5"
          :class="milestone.reached ? 'border-success/30 bg-success/5' : 'border-accent/10'"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs" :class="milestone.reached ? 'text-success' : 'text-text'">
              {{ milestone.title }} · {{ milestone.count }}种
            </span>
            <span class="text-[10px]" :class="milestone.reached ? 'text-success' : 'text-muted'">
              {{ milestone.reached ? '已达成' : `还差${milestone.remaining}` }}
            </span>
          </div>
          <p class="text-[10px] text-muted mt-0.5">{{ milestone.description }}</p>
          <div class="flex flex-wrap gap-1 mt-1">
            <span v-for="effect in milestone.effects" :key="effect.label" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/10 text-muted">
              {{ effect.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <Transition name="panel-fade">
      <div
        v-if="activeCollectionItem"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="activeCollectionId = null"
      >
        <div class="game-panel max-w-xs w-full relative max-h-[80vh] overflow-y-auto">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeCollectionId = null">
            <X :size="14" />
          </button>

          <p class="text-sm mb-2" :class="activeCollectionDiscovered ? getCategoryColor(activeCollectionItem.category) : 'text-muted'">
            {{ activeCollectionDisplayName }}
          </p>

          <template v-if="!activeCollectionDiscovered && activeCollectionHint">
            <div class="border border-warning/20 rounded-xs p-2 mb-2 bg-warning/5">
              <p class="text-xs text-warning mb-1">未发现条目引导</p>
              <p class="text-xs text-text leading-relaxed">{{ activeCollectionHint.summary }}</p>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">推荐线索</p>
              <div class="flex flex-col space-y-1">
                <p v-for="clue in activeCollectionHint.clues" :key="clue" class="text-xs text-text leading-relaxed">• {{ clue }}</p>
              </div>
            </div>

            <div v-if="activeCollectionHint.relatedPanels.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">前往相关系统</p>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="entry in activeCollectionHint.relatedPanels"
                  :key="entry.panel"
                  class="justify-center"
                  @click="handleCollectionHintNavigate(entry.panel)"
                >
                  {{ entry.label }}
                </Button>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">分类</span>
                <span class="text-xs">{{ CATEGORY_NAMES[activeCollectionItem.category] ?? activeCollectionItem.category }}</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">当前状态</span>
                <span class="text-xs text-warning">尚未收录</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">解锁后可查看</span>
                <span class="text-xs text-muted">来源 / 用途 / 详细属性</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted">{{ activeCollectionItem.description }}</p>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">获取方式</p>
              <p class="text-xs text-text leading-relaxed">{{ activeCollectionSource }}</p>
            </div>

            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">使用方式</p>
              <p class="text-xs text-text leading-relaxed">{{ activeCollectionUsage }}</p>
            </div>

            <div v-if="activeCollectionExtraDetails.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">详细信息</p>
              <div class="grid grid-cols-1 gap-y-1">
                <div v-for="detail in activeCollectionExtraDetails" :key="detail.label" class="flex items-start justify-between gap-2">
                  <span class="text-xs text-muted shrink-0">{{ detail.label }}</span>
                  <span class="text-xs text-right break-words">{{ detail.value }}</span>
                </div>
              </div>
            </div>

            <div v-if="activeCollectionProducedBy.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">可由以下方式产出</p>
              <div class="flex flex-col space-y-1">
                <p v-for="entry in activeCollectionProducedBy" :key="entry" class="text-xs text-text leading-relaxed">• {{ entry }}</p>
              </div>
            </div>

            <div v-if="activeCollectionUsedIn.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">可用于以下加工/制作</p>
              <div class="flex flex-col space-y-1">
                <p v-for="entry in activeCollectionUsedIn" :key="entry" class="text-xs text-text leading-relaxed">• {{ entry }}</p>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs p-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted">分类</span>
                <span class="text-xs">{{ CATEGORY_NAMES[activeCollectionItem.category] ?? activeCollectionItem.category }}</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">售价</span>
                <span class="text-xs text-accent">{{ activeCollectionItem.sellPrice }}文</span>
              </div>
              <div v-if="activeCollectionItem.edible && activeCollectionItem.staminaRestore" class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">恢复</span>
                <span class="text-xs text-success">
                  +{{ activeCollectionItem.staminaRestore }}体力
                  <template v-if="activeCollectionItem.healthRestore">/ +{{ activeCollectionItem.healthRestore }}HP</template>
                </span>
              </div>

              <template v-if="activeWeaponDef">
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">类型</span>
                  <span class="text-xs">{{ WEAPON_TYPE_NAMES[activeWeaponDef.type] }}</span>
                </div>
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">攻击力</span>
                  <span class="text-xs text-danger">{{ activeWeaponDef.attack }}</span>
                </div>
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">暴击率</span>
                  <span class="text-xs">{{ Math.round(activeWeaponDef.critRate * 100) }}%</span>
                </div>
                <div v-if="activeWeaponDef.fixedEnchantment" class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">固定附魔</span>
                  <span class="text-xs text-quality-supreme">{{ ENCHANTMENTS[activeWeaponDef.fixedEnchantment]?.name }}</span>
                </div>
              </template>

              <template v-if="activeEquipEffects.length > 0">
                <div v-for="(eff, i) in activeEquipEffects" :key="i" class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-muted">{{ EFFECT_NAMES[eff.type] ?? eff.type }}</span>
                  <span class="text-xs text-success">{{ formatEffectValue(eff) }}</span>
                </div>
              </template>

              <div v-if="achievementStore.getDiscoveryTime(activeCollectionItem.id)" class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-muted">发现于</span>
                <span class="text-xs text-muted">{{ achievementStore.getDiscoveryTime(activeCollectionItem.id) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
  import { BookOpen, Lock, Search, FlaskConical, Waves, Swords, X } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { useAchievementStore } from '@/stores/useAchievementStore'
  import { ITEMS, getItemById, getItemSource } from '@/data/items'
  import { HYBRID_DEFS } from '@/data/breeding'
  import { getCropById, getCropBySeedId } from '@/data/crops'
  import { FISHING_LOCATIONS, getFishById } from '@/data/fish'
  import { PROCESSING_RECIPES, PROCESSING_MACHINES, SPRINKLERS, FERTILIZERS, BAITS, TACKLES, BOMBS } from '@/data/processing'
  import { FRUIT_TREE_DEFS } from '@/data/fruitTrees'
  import {
    COLLECTION_MILESTONES,
    COLLECTION_CATEGORY_NAMES,
    COLLECTION_CATEGORY_COLORS,
    getCollectionUsageText,
    getUndiscoveredCollectionHint,
  } from '@/data/collectionRegistry'
  import { WEAPONS, ENCHANTMENTS, WEAPON_TYPE_NAMES } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { getHatById } from '@/data/hats'
  import { getShoeById } from '@/data/shoes'
  import { navigateToPanel, type PanelKey } from '@/composables/useNavigation'
  import type { ItemCategory } from '@/types'

  const achievementStore = useAchievementStore()

  const allItems = ITEMS
  const CATEGORY_NAMES = COLLECTION_CATEGORY_NAMES

  const collectionRef = ref<HTMLElement | null>(null)
  const collectionScrollTop = ref(0)
  const ROW_H = 34
  const VBUFFER = 5
  const collectionSearch = ref('')
  const collectionCategory = ref<ItemCategory | 'all'>('all')
  const collectionDiscoverFilter = ref<'all' | 'discovered' | 'undiscovered'>('all')
  const collectionSort = ref<'default' | 'recent' | 'price_desc' | 'price_asc'>('default')

  const collectionCols = ref(window.innerWidth >= 768 ? 5 : 3)
  const updateCols = () => {
    collectionCols.value = window.innerWidth >= 768 ? 5 : 3
  }
  onMounted(() => window.addEventListener('resize', updateCols))
  onUnmounted(() => window.removeEventListener('resize', updateCols))

  let rafId = 0
  const onCollectionScroll = (e: Event) => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      collectionScrollTop.value = (e.target as HTMLElement).scrollTop
      rafId = 0
    })
  }

  const containerH = ref(288)
  onMounted(() => {
    if (collectionRef.value) containerH.value = collectionRef.value.clientHeight
  })

  const filteredCollectionItems = computed(() => {
    const q = collectionSearch.value.trim().toLowerCase()
    const items = allItems.filter(item => {
      if (collectionCategory.value !== 'all' && item.category !== collectionCategory.value) return false
      const discovered = achievementStore.isDiscovered(item.id)
      if (collectionDiscoverFilter.value === 'discovered' && !discovered) return false
      if (collectionDiscoverFilter.value === 'undiscovered' && discovered) return false
      if (!q) return true
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    })

    const getRecentRank = (itemId: string) => {
      const index = achievementStore.discoveredItems.indexOf(itemId)
      return index === -1 ? -1 : index
    }

    return [...items].sort((a, b) => {
      switch (collectionSort.value) {
        case 'recent':
          return getRecentRank(b.id) - getRecentRank(a.id)
        case 'price_desc':
          return b.sellPrice - a.sellPrice
        case 'price_asc':
          return a.sellPrice - b.sellPrice
        default:
          return 0
      }
    })
  })

  const filteredDiscoveredCount = computed(() => filteredCollectionItems.value.filter(item => achievementStore.isDiscovered(item.id)).length)

  const totalRows = computed(() => Math.ceil(filteredCollectionItems.value.length / collectionCols.value))
  const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(collectionScrollTop.value / ROW_H) - VBUFFER)
    const end = Math.min(totalRows.value, Math.ceil((collectionScrollTop.value + containerH.value) / ROW_H) + VBUFFER)
    return { start, end }
  })
  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return filteredCollectionItems.value.slice(start * collectionCols.value, end * collectionCols.value)
  })
  const topPad = computed(() => visibleRange.value.start * ROW_H)
  const bottomPad = computed(() => Math.max(0, (totalRows.value - visibleRange.value.end) * ROW_H))

  watch([collectionSearch, collectionCategory, collectionDiscoverFilter, collectionSort], () => {
    collectionScrollTop.value = 0
    if (collectionRef.value) collectionRef.value.scrollTop = 0
  })

  const collectionCategories = computed(() => [
    { value: 'all' as const, label: '全部' },
    ...Array.from(new Set(allItems.map(item => item.category))).map(category => ({
      value: category,
      label: CATEGORY_NAMES[category] ?? category,
    })),
  ])

  const collectionDiscoverFilters = [
    { value: 'all' as const, label: '全部状态' },
    { value: 'discovered' as const, label: '已发现' },
    { value: 'undiscovered' as const, label: '未发现' },
  ]

  const activeCollectionId = ref<string | null>(null)
  const activeCollectionItem = computed(() => {
    if (!activeCollectionId.value) return null
    return getItemById(activeCollectionId.value) ?? null
  })
  const activeCollectionDiscovered = computed(() => {
    if (!activeCollectionItem.value) return false
    return achievementStore.isDiscovered(activeCollectionItem.value.id)
  })
  const activeCollectionDisplayName = computed(() => {
    if (!activeCollectionItem.value) return ''
    if (activeCollectionDiscovered.value) return activeCollectionItem.value.name
    return `未发现的${COLLECTION_CATEGORY_NAMES[activeCollectionItem.value.category] ?? '条目'}`
  })
  const activeCollectionHint = computed(() => {
    if (!activeCollectionItem.value || activeCollectionDiscovered.value) return null
    return getUndiscoveredCollectionHint(activeCollectionItem.value)
  })
  const handleCollectionHintNavigate = (panel: PanelKey) => {
    activeCollectionId.value = null
    navigateToPanel(panel)
  }

  const activeCollectionSource = computed(() => {
    if (!activeCollectionItem.value) return '未知'
    return getItemSource(activeCollectionItem.value.id)
  })
  const activeCollectionUsage = computed(() => {
    if (!activeCollectionItem.value) return '未知'
    return getCollectionUsageText(activeCollectionItem.value)
  })

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`
  const getItemName = (id: string): string => getItemById(id)?.name ?? id
  const formatCraftCost = (entries: { itemId: string; quantity: number }[]) => entries.map(entry => `${getItemName(entry.itemId)}×${entry.quantity}`).join('、')

  const activeCollectionExtraDetails = computed(() => {
    if (!activeCollectionItem.value) return [] as { label: string; value: string }[]

    const item = activeCollectionItem.value
    const details: { label: string; value: string }[] = []

    if (item.category === 'crop') {
      const crop = getCropById(item.id)
      if (crop) {
        details.push({ label: '对应种子', value: getItemName(crop.seedId) })
        details.push({ label: '适种季节', value: crop.season.join('、') })
        details.push({ label: '生长天数', value: `${crop.growthDays}天` })
        details.push({ label: '播种价格', value: `${crop.seedPrice}文` })
        details.push({ label: '深度灌溉', value: crop.deepWatering ? '需要' : '不需要' })
        if (crop.regrowth && crop.regrowthDays) details.push({ label: '多次收获', value: `是（间隔${crop.regrowthDays}天）` })
        if (crop.maxHarvests) details.push({ label: '最多收获', value: `${crop.maxHarvests}次` })
        if (crop.giantCropEligible) details.push({ label: '巨型作物', value: '可形成巨型作物' })
      }
    } else if (item.category === 'seed') {
      const crop = getCropBySeedId(item.id)
      if (crop) {
        details.push({ label: '对应作物', value: crop.name })
        details.push({ label: '适种季节', value: crop.season.join('、') })
        details.push({ label: '成熟时间', value: `${crop.growthDays}天` })
        details.push({ label: '深度灌溉', value: crop.deepWatering ? '需要' : '不需要' })
        if (crop.regrowth && crop.regrowthDays) details.push({ label: '多次收获', value: `是（间隔${crop.regrowthDays}天）` })
        if (crop.maxHarvests) details.push({ label: '最多收获', value: `${crop.maxHarvests}次` })
        if (crop.giantCropEligible) details.push({ label: '巨型作物', value: '可形成巨型作物' })
      }
    } else if (item.category === 'fish') {
      const fish = getFishById(item.id)
      if (fish) {
        details.push({ label: '出没地点', value: FISHING_LOCATIONS.find(location => location.id === fish.location)?.name ?? (fish.location ?? '溪流') })
        details.push({ label: '出没季节', value: fish.season.join('、') })
        details.push({ label: '天气需求', value: fish.weather.includes('any') ? '不限' : fish.weather.join('、') })
        details.push({ label: '难度', value: fish.difficulty })
      }
    } else if (item.category === 'fruit') {
      const tree = FRUIT_TREE_DEFS.find(entry => entry.fruitId === item.id)
      if (tree) {
        details.push({ label: '来源果树', value: tree.name })
        details.push({ label: '结果季节', value: tree.fruitSeason })
        details.push({ label: '树苗', value: getItemName(tree.saplingId) })
        details.push({ label: '成熟时间', value: `${tree.growthDays}天` })
      }
    } else if (item.category === 'sapling') {
      const tree = FRUIT_TREE_DEFS.find(entry => entry.saplingId === item.id)
      if (tree) {
        details.push({ label: '对应果树', value: tree.name })
        details.push({ label: '成熟时间', value: `${tree.growthDays}天` })
        details.push({ label: '产果季节', value: tree.fruitSeason })
        details.push({ label: '产出果实', value: tree.fruitName })
      }
    } else if (item.category === 'machine') {
      const machineId = item.id.startsWith('machine_') ? item.id.replace(/^machine_/, '') : item.id
      const machine = PROCESSING_MACHINES.find(entry => entry.id === machineId)
      if (machine) {
        details.push({ label: '制作费用', value: `${machine.craftMoney}文` })
        details.push({ label: '制作材料', value: formatCraftCost(machine.craftCost) })
      }
    } else if (item.category === 'sprinkler') {
      const sprinkler = SPRINKLERS.find(entry => entry.id === item.id)
      if (sprinkler) {
        details.push({ label: '覆盖范围', value: `${sprinkler.range}格` })
        details.push({ label: '制作费用', value: `${sprinkler.craftMoney}文` })
        details.push({ label: '制作材料', value: formatCraftCost(sprinkler.craftCost) })
      }
    } else if (item.category === 'fertilizer') {
      const fertilizer = FERTILIZERS.find(entry => entry.id === item.id)
      if (fertilizer) {
        if (fertilizer.qualityBonus) details.push({ label: '品质加成', value: formatPercent(fertilizer.qualityBonus) })
        if (fertilizer.growthSpeedup) details.push({ label: '生长加速', value: formatPercent(fertilizer.growthSpeedup) })
        if (fertilizer.retainChance !== undefined) details.push({ label: '保湿概率', value: formatPercent(fertilizer.retainChance) })
        details.push({ label: '商店价格', value: `${fertilizer.shopPrice}文` })
      }
    } else if (item.category === 'bait') {
      const bait = BAITS.find(entry => entry.id === item.id)
      if (bait) {
        if (bait.shopPrice) details.push({ label: '商店价格', value: `${bait.shopPrice}文` })
        if (bait.doubleCatchChance) details.push({ label: '双倍鱼获', value: formatPercent(bait.doubleCatchChance) })
        if (bait.ignoresSeason) details.push({ label: '季节限制', value: '可无视季节限制' })
      }
    } else if (item.category === 'tackle') {
      const tackle = TACKLES.find(entry => entry.id === item.id)
      if (tackle) {
        details.push({ label: '耐久', value: `${tackle.maxDurability}` })
        details.push({ label: '需求鱼竿', value: tackle.requiredRodTier })
        if (tackle.shopPrice) details.push({ label: '商店价格', value: `${tackle.shopPrice}文` })
      }
    } else if (item.category === 'bomb') {
      const bomb = BOMBS.find(entry => entry.id === item.id)
      if (bomb) {
        details.push({ label: '矿石倍率', value: `${bomb.oreMultiplier}倍` })
        details.push({ label: '清除怪物', value: bomb.clearsMonster ? '是' : '否' })
      }
    }

    return details
  })

  const activeCollectionProducedBy = computed(() => {
    if (!activeCollectionItem.value) return [] as string[]
    return PROCESSING_RECIPES.filter(recipe => recipe.outputItemId === activeCollectionItem.value!.id).map(recipe => {
      const machine = PROCESSING_MACHINES.find(entry => entry.id === recipe.machineType)
      return `${machine?.name ?? recipe.machineType}：${recipe.description}`
    })
  })
  const activeCollectionUsedIn = computed(() => {
    if (!activeCollectionItem.value) return [] as string[]
    return PROCESSING_RECIPES.filter(recipe => recipe.inputItemId === activeCollectionItem.value!.id || recipe.extraInputs?.some(entry => entry.itemId === activeCollectionItem.value!.id)).map(recipe => {
      const machine = PROCESSING_MACHINES.find(entry => entry.id === recipe.machineType)
      return `${machine?.name ?? recipe.machineType}：${recipe.name} → ${getItemName(recipe.outputItemId)}`
    })
  })

  const activeWeaponDef = computed(() => {
    if (!activeCollectionItem.value || activeCollectionItem.value.category !== 'weapon') return null
    return WEAPONS[activeCollectionItem.value.id] ?? null
  })
  const activeEquipEffects = computed(() => {
    if (!activeCollectionItem.value) return []
    const id = activeCollectionItem.value.id
    const cat = activeCollectionItem.value.category
    if (cat === 'ring') return getRingById(id)?.effects ?? []
    if (cat === 'hat') return getHatById(id)?.effects ?? []
    if (cat === 'shoe') return getShoeById(id)?.effects ?? []
    return []
  })

  const EFFECT_NAMES: Record<string, string> = {
    attack_bonus: '攻击力',
    crit_rate_bonus: '暴击率',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '最大HP',
    stamina_reduction: '体力消耗降低',
    mining_stamina: '采矿体力降低',
    farming_stamina: '农耕体力降低',
    fishing_stamina: '钓鱼体力降低',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '作物生长加速',
    fish_quality_bonus: '鱼类品质',
    fishing_calm: '鱼温顺度',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '怪物掉落',
    exp_bonus: '经验加成',
    treasure_find: '宝箱发现率',
    ore_bonus: '额外矿石',
    luck: '幸运',
    travel_speed: '旅行加速',
  }

  const FLAT_VALUE_EFFECTS = new Set(['attack_bonus', 'max_hp_bonus', 'ore_bonus'])
  const formatEffectValue = (eff: { type: string; value: number }): string => {
    if (FLAT_VALUE_EFFECTS.has(eff.type)) return `+${eff.value}`
    return `+${Math.round(eff.value * 100)}%`
  }

  const getCategoryColor = (category: ItemCategory): string => COLLECTION_CATEGORY_COLORS[category] ?? 'text-accent'

  const collectionMilestones = computed(() =>
    COLLECTION_MILESTONES.map(milestone => {
      const remaining = Math.max(0, milestone.count - achievementStore.discoveredCount)
      return {
        ...milestone,
        reached: remaining === 0,
        remaining,
      }
    })
  )
  const nextCollectionMilestone = computed(() => collectionMilestones.value.find(milestone => !milestone.reached) ?? null)

  const hybridItemIds = new Set(HYBRID_DEFS.map(h => h.resultCropId))
  void hybridItemIds
</script>