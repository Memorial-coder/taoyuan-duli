<template>
  <div class="space-y-3">
    <div class="border border-accent/10 rounded-xs p-2 space-y-2">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1 space-y-2">
          <div>
            <p class="text-xs text-muted">百科用于查机制、送礼、解锁条件和跨系统资料。</p>
            <p class="text-[10px] text-muted/70 mt-0.5">图鉴看收录与缺口，百科看答案与路线。</p>
          </div>

          <div class="relative">
            <Search :size="12" class="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              v-model="search"
              type="text"
              placeholder="搜索名称、用途、解锁条件、礼物偏好…"
              class="w-full bg-transparent border border-accent/20 rounded-xs pl-6 pr-7 py-1 text-xs text-text placeholder:text-muted/50 outline-none focus:border-accent/50"
            />
            <button v-if="search" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text" @click="search = ''">
              <X :size="10" />
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="border border-accent/10 rounded-xs px-2 py-1">
            <p class="text-[10px] text-muted">当前结果</p>
            <p class="text-xs text-accent">{{ filteredEntries.length }} 条</p>
          </div>
          <button
            class="px-2 py-1 text-xs rounded-xs border transition-colors"
            :class="includeSpoilers ? 'bg-warning/10 border-warning/30 text-warning' : 'border-accent/20 text-muted hover:border-accent/50'"
            @click="includeSpoilers = !includeSpoilers"
          >
            {{ includeSpoilers ? '隐藏隐秘词条' : `显示隐秘词条（${spoilerCount}）` }}
          </button>
        </div>
      </div>

      <div>
        <p class="text-[10px] text-muted mb-1">按问题查</p>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="intent in intents"
            :key="intent.value"
            class="px-1.5 py-0.5 text-xs rounded-xs border transition-colors"
            :class="activeIntent === intent.value ? 'bg-accent text-bg border-accent' : 'border-accent/20 text-muted hover:border-accent/50'"
            @click="activeIntent = intent.value"
          >
            {{ intent.label }}<span v-if="intent.count > 0" class="opacity-70"> · {{ intent.count }}</span>
          </button>
        </div>
      </div>

      <div>
        <p class="text-[10px] text-muted mb-1">按分类看</p>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="cat in categories"
            :key="cat.value"
            class="px-1.5 py-0.5 text-xs rounded-xs border transition-colors"
            :class="activeCategory === cat.value ? 'bg-accent text-bg border-accent' : 'border-accent/20 text-muted hover:border-accent/50'"
            @click="activeCategory = cat.value"
          >
            {{ cat.label }}<span v-if="cat.count > 0" class="opacity-70"> · {{ cat.count }}</span>
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted">{{ resultSummary }}</p>
        <button
          v-if="hasActiveFilters"
          class="text-xs text-muted hover:text-text underline underline-offset-2"
          @click="resetFilters"
        >
          清空筛选
        </button>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div class="border border-accent/10 rounded-xs p-2">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-muted">词条列表</p>
          <span class="text-[10px] text-muted/70">{{ filteredEntries.length }} / {{ derived.visibleEntryCount }}</span>
        </div>

        <div ref="listRef" class="max-h-[30rem] overflow-y-auto pr-1" @scroll="onListScroll">
          <div v-if="filteredEntries.length > 0" :style="{ paddingTop: topPad + 'px', paddingBottom: bottomPad + 'px' }">
            <div class="flex flex-col space-y-1">
              <button
                v-for="entry in visibleItems"
                :key="entry.id"
                class="w-full h-[6.75rem] overflow-hidden text-left border rounded-xs px-2 py-1.5 transition-colors"
                :class="selectedId === entry.id ? 'border-accent/40 bg-accent/5' : 'border-accent/15 hover:bg-accent/5'"
                @click="selectedId = entry.id"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs font-medium break-words" :class="getCategoryColor(entry.category)" v-html="highlightText(entry.name)" />
                    <div class="flex flex-wrap items-center gap-1 mt-0.5">
                      <span class="text-[10px] text-muted/70">{{ entry.categoryLabel }}</span>
                      <span v-if="entry.spoiler" class="text-[10px] px-1 py-0.5 rounded-xs border border-warning/30 text-warning">隐秘</span>
                    </div>
                  </div>
                  <span class="text-[10px] text-muted shrink-0">{{ entry.relatedPanels.length > 0 ? `${entry.relatedPanels.length} 个入口` : '资料' }}</span>
                </div>

                <p class="text-[10px] text-muted mt-1 leading-relaxed line-clamp-2">{{ getPreviewText(entry) }}</p>

                <div class="flex flex-wrap gap-1 mt-1.5">
                  <span
                    v-for="tag in getIntentTags(entry)"
                    :key="`${entry.id}_${tag}`"
                    class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/10 text-muted"
                  >
                    {{ tag }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-10 space-y-2">
            <BookOpen :size="36" class="text-accent/20" />
            <p class="text-xs text-muted">没有找到匹配的词条</p>
            <p class="text-[10px] text-muted/70">可以换个问题入口，或清空筛选后再看。</p>
          </div>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 min-h-[18rem]">
        <template v-if="selectedEntry">
          <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <p class="text-sm" :class="getCategoryColor(selectedEntry.category)">{{ selectedEntry.name }}</p>
              <div class="flex flex-wrap items-center gap-1 mt-0.5">
                <span class="text-[10px] text-muted">{{ selectedEntry.categoryLabel }}</span>
                <span v-if="selectedEntry.spoiler" class="text-[10px] px-1 py-0.5 rounded-xs border border-warning/30 text-warning">隐秘词条</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[10px] text-muted">相关系统</p>
              <p class="text-xs text-accent">{{ selectedEntry.relatedPanels.length }} 个</p>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted leading-relaxed">{{ selectedEntry.description || '暂无额外描述。' }}</p>
          </div>

          <div v-if="selectedEntry.source || selectedEntry.usage" class="grid grid-cols-1 xl:grid-cols-2 gap-2 mb-2">
            <div v-if="selectedEntry.source" class="border border-accent/10 rounded-xs p-2">
              <p class="text-xs text-muted mb-1">获取 / 解锁</p>
              <p class="text-xs text-text leading-relaxed">{{ selectedEntry.source }}</p>
            </div>
            <div v-if="selectedEntry.usage" class="border border-accent/10 rounded-xs p-2">
              <p class="text-xs text-muted mb-1">用途 / 作用</p>
              <p class="text-xs text-text leading-relaxed">{{ selectedEntry.usage }}</p>
            </div>
          </div>

          <div v-if="selectedEntry.details.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">详细信息</p>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-1">
              <div
                v-for="detail in selectedEntry.details"
                :key="`${selectedEntry.id}_${detail.label}`"
                class="flex items-start justify-between gap-2"
                :class="detail.value.length > 18 ? 'xl:col-span-2' : 'xl:col-span-1'"
              >
                <span class="text-xs text-muted shrink-0">{{ detail.label }}</span>
                <span class="text-xs text-right break-words">{{ detail.value }}</span>
              </div>
            </div>
          </div>

          <div v-if="relatedEntries.length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">相关词条</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="entry in relatedEntries"
                :key="`related_${entry.id}`"
                class="px-1.5 py-0.5 text-xs rounded-xs border border-accent/20 text-text hover:border-accent/50 hover:bg-accent/5 transition-colors"
                @click="selectedId = entry.id"
              >
                {{ entry.name }}
              </button>
            </div>
          </div>

          <div v-if="selectedEntry.relatedPanels.length > 0" class="border border-accent/10 rounded-xs p-2">
            <p class="text-xs text-muted mb-1">前往相关系统</p>
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="panel in selectedEntry.relatedPanels"
                :key="`${selectedEntry.id}_${panel.panel}`"
                class="justify-center"
                @click="navigateToPanel(panel.panel)"
              >
                {{ panel.label }}
              </Button>
            </div>
          </div>
        </template>

        <div v-else class="h-full min-h-[18rem] flex flex-col items-center justify-center text-center space-y-2">
          <BookOpen :size="36" class="text-accent/20" />
          <p class="text-xs text-muted">从左侧选择一个词条开始查看。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { Search, X, BookOpen } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { navigateToPanel } from '@/composables/useNavigation'
  import { GLOSSARY, GLOSSARY_CATEGORY_LABELS, GLOSSARY_INTENT_LABELS } from '@/data/glossary'
  import type { GlossaryCategory, GlossaryEntry, GlossaryIntentKey, GlossaryOpenPreset } from '@/data/glossary'

  const props = defineProps<{
    preset?: GlossaryOpenPreset | null
  }>()

  const emit = defineEmits<{
    (e: 'preset-applied'): void
  }>()

  const search = ref('')
  const activeCategory = ref<GlossaryCategory | 'all'>('all')
  const activeIntent = ref<GlossaryIntentKey | 'all'>('all')
  const includeSpoilers = ref(false)
  const selectedId = ref<string | null>(null)

  const glossaryMap = new Map(GLOSSARY.map(entry => [entry.id, entry]))
  const spoilerCount = GLOSSARY.filter(entry => entry.spoiler).length
  const sortedGlossary = [...GLOSSARY].sort((a, b) => {
    const categoryDiff = a.categoryLabel.localeCompare(b.categoryLabel, 'zh-Hans-CN')
    if (categoryDiff !== 0) return categoryDiff
    return a.name.localeCompare(b.name, 'zh-Hans-CN')
  })

  const normalizeQuery = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim()

  const getMatchScore = (entry: GlossaryEntry, query: string): number => {
    if (!query) return 0
    const normalizedName = normalizeQuery(entry.name)
    const normalizedCategory = normalizeQuery(entry.categoryLabel)
    let score = 0

    if (normalizedName === query) score += 120
    if (normalizedName.startsWith(query)) score += 80
    if (normalizedName.includes(query)) score += 60
    if (normalizedCategory.includes(query)) score += 30
    if ((entry.source ?? '').toLowerCase().includes(query)) score += 20
    if ((entry.usage ?? '').toLowerCase().includes(query)) score += 18
    if (entry.keywords.some(keyword => normalizeQuery(keyword).includes(query))) score += 24
    if (entry.details.some(detail => normalizeQuery(detail.label).includes(query))) score += 18
    if (entry.details.some(detail => normalizeQuery(detail.value).includes(query))) score += 12
    if (normalizeQuery(entry.description).includes(query)) score += 10

    return score
  }

  const derived = computed(() => {
    const q = normalizeQuery(search.value)
    const categoryCounts = Object.fromEntries(
      Object.keys(GLOSSARY_CATEGORY_LABELS).map(key => [key, 0])
    ) as Record<GlossaryCategory, number>
    const intentCounts = Object.fromEntries(
      Object.keys(GLOSSARY_INTENT_LABELS).map(key => [key, 0])
    ) as Record<GlossaryIntentKey, number>

    const visibleBase: GlossaryEntry[] = []
    const filtered: GlossaryEntry[] = []

    for (const entry of sortedGlossary) {
      if (!includeSpoilers.value && entry.spoiler) continue
      visibleBase.push(entry)

      const queryMatched = !q || entry.searchText.includes(q)
      if (!queryMatched) continue

      if (activeIntent.value === 'all' || entry.intents.includes(activeIntent.value)) {
        categoryCounts[entry.category] += 1
      }

      if (activeCategory.value === 'all' || entry.category === activeCategory.value) {
        for (const intent of entry.intents) {
          intentCounts[intent] += 1
        }
      }

      if (activeCategory.value !== 'all' && entry.category !== activeCategory.value) continue
      if (activeIntent.value !== 'all' && !entry.intents.includes(activeIntent.value)) continue
      filtered.push(entry)
    }

    if (q) {
      filtered.sort((a, b) => {
        const scoreDiff = getMatchScore(b, q) - getMatchScore(a, q)
        if (scoreDiff !== 0) return scoreDiff
        const categoryDiff = a.categoryLabel.localeCompare(b.categoryLabel, 'zh-Hans-CN')
        if (categoryDiff !== 0) return categoryDiff
        return a.name.localeCompare(b.name, 'zh-Hans-CN')
      })
    }

    return {
      visibleEntries: visibleBase,
      visibleEntryCount: visibleBase.length,
      filteredEntries: filtered,
      categoryCounts,
      intentCounts,
      query: q,
    }
  })

  const filteredEntries = computed(() => derived.value.filteredEntries)

  const categories = computed(() => [
    { value: 'all' as const, label: '全部', count: filteredEntries.value.length },
    ...Object.entries(GLOSSARY_CATEGORY_LABELS).map(([value, label]) => ({
      value: value as GlossaryCategory,
      label,
      count: derived.value.categoryCounts[value as GlossaryCategory],
    })),
  ])

  const intents = computed(() => [
    { value: 'all' as const, label: '全部问题', count: filteredEntries.value.length },
    ...Object.entries(GLOSSARY_INTENT_LABELS).map(([value, label]) => ({
      value: value as GlossaryIntentKey,
      label,
      count: derived.value.intentCounts[value as GlossaryIntentKey],
    })),
  ])

  watch(filteredEntries, entries => {
    if (!entries.some(entry => entry.id === selectedId.value)) {
      selectedId.value = entries[0]?.id ?? null
    }
  }, { immediate: true })

  const selectedEntry = computed(() => {
    if (!selectedId.value) return null
    return glossaryMap.get(selectedId.value) ?? null
  })

  const relatedEntries = computed(() => {
    if (!selectedEntry.value) return [] as GlossaryEntry[]
    return selectedEntry.value.relatedEntryIds.map(id => glossaryMap.get(id)).filter((entry): entry is GlossaryEntry => Boolean(entry))
  })

  const hasActiveFilters = computed(() =>
    Boolean(search.value.trim()) || activeCategory.value !== 'all' || activeIntent.value !== 'all' || includeSpoilers.value
  )

  const resultSummary = computed(() => {
    const q = search.value.trim()
    if (q) return `已按“${q}”检索，命中 ${filteredEntries.value.length} 条词条。`
    if (activeIntent.value !== 'all' || activeCategory.value !== 'all') {
      return `当前视图展示 ${filteredEntries.value.length} 条词条。`
    }
    return `当前共可浏览 ${derived.value.visibleEntryCount} 条词条。`
  })

  const listRef = ref<HTMLElement | null>(null)
  const listScrollTop = ref(0)
  const listContainerHeight = ref(480)
  const ROW_H = 108
  const VBUFFER = 5
  let rafId = 0

  const syncListHeight = () => {
    if (listRef.value) listContainerHeight.value = listRef.value.clientHeight
  }

  const onListScroll = (event: Event) => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      listScrollTop.value = (event.target as HTMLElement).scrollTop
      rafId = 0
    })
  }

  onMounted(() => {
    syncListHeight()
    window.addEventListener('resize', syncListHeight)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', syncListHeight)
    if (rafId) cancelAnimationFrame(rafId)
  })

  const totalRows = computed(() => filteredEntries.value.length)
  const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(listScrollTop.value / ROW_H) - VBUFFER)
    const end = Math.min(totalRows.value, Math.ceil((listScrollTop.value + listContainerHeight.value) / ROW_H) + VBUFFER)
    return { start, end }
  })

  const visibleItems = computed(() => filteredEntries.value.slice(visibleRange.value.start, visibleRange.value.end))
  const topPad = computed(() => visibleRange.value.start * ROW_H)
  const bottomPad = computed(() => Math.max(0, (totalRows.value - visibleRange.value.end) * ROW_H))

  watch([search, activeCategory, activeIntent, includeSpoilers], () => {
    listScrollTop.value = 0
    if (listRef.value) listRef.value.scrollTop = 0
  })

  const resetFilters = () => {
    search.value = ''
    activeCategory.value = 'all'
    activeIntent.value = 'all'
    includeSpoilers.value = false
  }

  const getIntentTags = (entry: GlossaryEntry): string[] => entry.intents.slice(0, 3).map(intent => GLOSSARY_INTENT_LABELS[intent])

  const getPreviewText = (entry: GlossaryEntry): string => {
    if (activeIntent.value === 'acquire') return entry.source ?? entry.description
    if (activeIntent.value === 'usage') return entry.usage ?? entry.description
    if (activeIntent.value === 'gift') {
      return entry.details.find(detail => /礼物|供奉/.test(detail.label))?.value ?? entry.description
    }
    if (activeIntent.value === 'unlock') {
      return entry.details.find(detail => /解锁|获取/.test(detail.label))?.value ?? entry.source ?? entry.description
    }
    if (activeIntent.value === 'where') {
      return entry.details.find(detail => /地点|季节|天气|条件/.test(detail.label))?.value ?? entry.description
    }
    return entry.source ?? entry.usage ?? entry.description
  }

  const CATEGORY_COLOR_MAP: Record<GlossaryCategory, string> = {
    crop: 'text-success',
    fish: 'text-water',
    npc: 'text-quality-excellent',
    animal: 'text-quality-fine',
    recipe: 'text-accent',
    machine: 'text-muted',
    ring: 'text-quality-supreme',
    hat: 'text-accent',
    shoe: 'text-quality-excellent',
    seed: 'text-success',
    weapon: 'text-danger',
    item: 'text-muted',
    location: 'text-water',
  }

  const getCategoryColor = (category: GlossaryCategory): string => CATEGORY_COLOR_MAP[category] ?? 'text-accent'

  const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const highlightText = (value: string): string => {
    const query = search.value.trim()
    if (!query) return escapeHtml(value)

    const lowerValue = value.toLowerCase()
    const lowerQuery = query.toLowerCase()
    let cursor = 0
    let html = ''

    while (cursor < value.length) {
      const nextIndex = lowerValue.indexOf(lowerQuery, cursor)
      if (nextIndex === -1) {
        html += escapeHtml(value.slice(cursor))
        break
      }
      html += escapeHtml(value.slice(cursor, nextIndex))
      html += `<mark class="bg-warning/15 text-warning px-0.5 rounded-[2px]">${escapeHtml(value.slice(nextIndex, nextIndex + query.length))}</mark>`
      cursor = nextIndex + query.length
    }

    return html
  }

  const applyPreset = (preset: GlossaryOpenPreset) => {
    search.value = preset.search ?? ''
    activeCategory.value = preset.category ?? 'all'
    activeIntent.value = preset.intent ?? 'all'
    if (preset.includeSpoilers !== undefined) includeSpoilers.value = preset.includeSpoilers
  }

  watch(() => props.preset, preset => {
    if (!preset) return
    applyPreset(preset)
    emit('preset-applied')
  }, { immediate: true, deep: true })
</script>
