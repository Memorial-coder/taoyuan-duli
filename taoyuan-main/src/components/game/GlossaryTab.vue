<template>
  <div>
    <!-- 搜索框 -->
    <div class="relative mb-2">
      <Search :size="12" class="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        v-model="search"
        type="text"
        placeholder="搜索名称或描述…"
        class="w-full bg-transparent border border-accent/20 rounded-xs pl-6 pr-2 py-1 text-xs text-text placeholder:text-muted/50 outline-none focus:border-accent/50"
      />
      <button v-if="search" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text" @click="search = ''">
        <X :size="10" />
      </button>
    </div>

    <!-- 分类筛选 -->
    <div class="flex flex-wrap gap-1 mb-3">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="px-1.5 py-0.5 text-xs rounded-xs border transition-colors"
        :class="
          activeCategory === cat.value
            ? 'bg-accent text-bg border-accent'
            : 'border-accent/20 text-muted hover:border-accent/50'
        "
        @click="activeCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 词条数量 -->
    <p class="text-xs text-muted mb-2">共 {{ filteredEntries.length }} 条</p>

    <!-- 词条列表 -->
    <div class="max-h-72 overflow-y-auto flex flex-col space-y-1">
      <div
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="border border-accent/15 rounded-xs px-2 py-1.5 cursor-pointer hover:bg-accent/5 transition-colors"
        :class="{ 'border-accent/40 bg-accent/5': activeId === entry.id }"
        @click="toggleEntry(entry.id)"
      >
        <!-- 词条头 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5 min-w-0">
            <span class="text-xs font-medium truncate" :class="getCategoryColor(entry.category)">{{ entry.name }}</span>
            <span class="text-xs text-muted/60 shrink-0">{{ entry.categoryLabel }}</span>
          </div>
          <ChevronDown
            :size="10"
            class="text-muted shrink-0 transition-transform"
            :class="{ 'rotate-180': activeId === entry.id }"
          />
        </div>

        <!-- 展开详情 -->
        <template v-if="activeId === entry.id">
          <p class="text-xs text-muted mt-1 leading-relaxed">{{ entry.description }}</p>
          <div v-if="entry.details.length > 0" class="mt-1.5 border-t border-accent/10 pt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div
              v-for="detail in entry.details"
              :key="detail.label"
              class="flex items-start justify-between"
              :class="detail.value.length > 12 ? 'col-span-2' : 'col-span-1'"
            >
              <span class="text-xs text-muted shrink-0">{{ detail.label }}</span>
              <span class="text-xs text-right ml-2 break-words min-w-0">{{ detail.value }}</span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="filteredEntries.length === 0" class="flex flex-col items-center justify-center py-10 space-y-2">
        <BookOpen :size="36" class="text-accent/20" />
        <p class="text-xs text-muted">没有找到匹配的词条</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Search, X, ChevronDown, BookOpen } from 'lucide-vue-next'
  import { GLOSSARY, GLOSSARY_CATEGORY_LABELS } from '@/data/glossary'
  import type { GlossaryCategory } from '@/data/glossary'

  const search = ref('')
  const activeCategory = ref<GlossaryCategory | 'all'>('all')
  const activeId = ref<string | null>(null)

  const categories = [
    { value: 'all' as const, label: '全部' },
    ...Object.entries(GLOSSARY_CATEGORY_LABELS).map(([value, label]) => ({
      value: value as GlossaryCategory,
      label,
    })),
  ]

  const filteredEntries = computed(() => {
    const q = search.value.trim().toLowerCase()
    return GLOSSARY.filter(entry => {
      if (activeCategory.value !== 'all' && entry.category !== activeCategory.value) return false
      if (!q) return true
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.details.some(d => d.value.toLowerCase().includes(q))
      )
    })
  })

  function toggleEntry(id: string) {
    activeId.value = activeId.value === id ? null : id
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
    item: 'text-muted',
    location: 'text-water',
  }

  function getCategoryColor(category: GlossaryCategory): string {
    return CATEGORY_COLOR_MAP[category] ?? 'text-accent'
  }
</script>
