<template>
  <div class="record-center-panel flex h-full min-h-0 flex-col">
    <div class="flex items-start justify-between gap-3 border-b border-accent/10 pb-3">
      <div class="min-w-0">
        <p class="text-sm text-accent">记录中心</p>
        <p class="mt-1 text-xs text-muted leading-5">把睡觉后的日结、行旅见闻、长期线索和系统消息分开回看，不再堆成一屏纯文本。</p>
      </div>
      <button class="shrink-0 text-muted transition-colors hover:text-text" @click="emit('close')">
        <X :size="16" />
      </button>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="tab in tabOptions"
        :key="`record-tab-${tab.id}`"
        class="rounded-xs border px-3 py-2 text-xs transition-colors"
        :class="activeTab === tab.id ? 'border-accent bg-accent/10 text-accent' : 'border-accent/10 bg-bg/50 text-muted hover:bg-accent/5'"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
        <span v-if="tab.id === 'daily' && recordCenterStore.unreadDailyDigestCount > 0" class="ml-1 text-success">
          {{ recordCenterStore.unreadDailyDigestCount }}
        </span>
      </button>
    </div>

    <div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
      <section v-if="activeTab === 'daily'" class="space-y-3">
        <div v-if="!dailyDigests.length" class="record-empty">
          <BookOpenText :size="32" class="mb-2 text-accent/30" />
          <p class="text-xs text-muted">还没有新的日结摘要。</p>
        </div>
        <article v-for="digest in dailyDigests" :key="`daily-digest-${digest.dayTag}`" class="rounded-xs border border-accent/10 bg-bg/60 px-4 py-3">
          <button class="flex w-full items-start justify-between gap-3 text-left" @click="toggleDailyDigest(digest.dayTag)">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ digest.title }}</p>
              <p class="mt-1 text-[11px] text-muted">{{ formatDayTag(digest.dayTag) }}</p>
            </div>
            <span class="shrink-0 pt-0.5 text-muted">
              <ChevronDown v-if="isDailyDigestExpanded(digest.dayTag)" :size="14" />
              <ChevronRight v-else :size="14" />
            </span>
          </button>

          <div v-if="isDailyDigestExpanded(digest.dayTag)" class="mt-3 space-y-3">
            <div v-if="digest.alerts.length > 0" class="space-y-2 rounded-xs border border-warning/20 bg-warning/5 px-3 py-3">
              <div class="flex items-center gap-2 text-[11px] text-warning">
                <AlertTriangle :size="13" />
                <span>风险与异常</span>
              </div>
              <p
                v-for="alert in digest.alerts"
                :key="`digest-alert-${digest.dayTag}-${alert.message}`"
                class="text-xs leading-5"
                :class="getToneTextClass(alert.tone)"
              >
                {{ alert.message }}
              </p>
            </div>

            <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div
                v-for="section in digest.sections"
                :key="`digest-section-${digest.dayTag}-${section.sectionId}`"
                class="rounded-xs border px-3 py-3"
                :class="getToneShellClass(section.tone)"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="text-[11px]" :class="getToneTextClass(section.tone)">{{ section.title }}</p>
                  <span class="text-[10px] text-muted">摘要</span>
                </div>
                <p class="mt-2 text-sm text-text">{{ section.headline }}</p>
                <div v-if="section.detailLines.length > 0" class="mt-2 space-y-1">
                  <p
                    v-for="line in section.detailLines"
                    :key="`digest-detail-${digest.dayTag}-${section.sectionId}-${line}`"
                    class="text-xs text-muted leading-5"
                  >
                    - {{ line }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-else-if="activeTab === 'chronicle'" class="space-y-4">
        <div class="space-y-2 rounded-xs border border-accent/10 bg-bg/60 px-3 py-3">
          <div class="flex items-center gap-2 text-[11px] text-muted">
            <Filter :size="12" />
            <span>筛选</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in chronicleTypeOptions"
              :key="`chronicle-type-${option.value}`"
              class="rounded-xs border px-2.5 py-1.5 text-[11px] transition-colors"
              :class="selectedChronicleType === option.value ? 'border-accent bg-accent/10 text-accent' : 'border-accent/10 text-muted hover:bg-accent/5'"
              @click="selectedChronicleType = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in chronicleRegionOptions"
              :key="`chronicle-region-${option.value}`"
              class="rounded-xs border px-2.5 py-1.5 text-[11px] transition-colors"
              :class="selectedChronicleRegion === option.value ? 'border-accent bg-accent/10 text-accent' : 'border-accent/10 text-muted hover:bg-accent/5'"
              @click="selectedChronicleRegion = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="filteredChronicleEntries.length <= 0" class="record-empty">
          <Compass :size="32" class="mb-2 text-accent/30" />
          <p class="text-xs text-muted">当前筛选下还没有见闻记录。</p>
        </div>
        <article
          v-for="entry in filteredChronicleEntries"
          :key="`chronicle-entry-${entry.id}`"
          class="rounded-xs border border-accent/10 bg-bg/60 px-4 py-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap gap-1.5">
                <span class="rounded-xs border border-accent/15 px-1.5 py-0.5 text-[10px] text-accent">{{ getChronicleTypeLabel(entry.type) }}</span>
                <span v-if="entry.regionId" class="rounded-xs border border-accent/10 px-1.5 py-0.5 text-[10px] text-muted">{{ getChronicleRegionLabel(entry.regionId) }}</span>
              </div>
              <p class="mt-2 text-sm text-text">{{ entry.title }}</p>
              <p class="mt-1 text-xs text-muted leading-5">{{ entry.summary }}</p>
            </div>
            <span class="shrink-0 text-[10px] text-muted">{{ formatDayTag(entry.lastRecordedDayTag) }}</span>
          </div>
          <div v-if="entry.detailLines.length > 0" class="mt-3 space-y-1">
            <p v-for="line in entry.detailLines.slice(0, 3)" :key="`chronicle-line-${entry.id}-${line}`" class="text-xs text-muted leading-5">
              - {{ line }}
            </p>
          </div>
          <div v-if="entry.tags.length > 0" class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="tag in entry.tags.slice(0, 4)"
              :key="`chronicle-tag-${entry.id}-${tag}`"
              class="rounded-xs border border-accent/10 px-1.5 py-0.5 text-[10px] text-muted"
            >
              {{ tag }}
            </span>
          </div>
        </article>
      </section>

      <section v-else-if="activeTab === 'clues'" class="space-y-4">
        <article
          v-for="group in clueGroups"
          :key="`clue-group-${group.id}`"
          class="rounded-xs border border-accent/10 bg-bg/60 px-4 py-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ group.title }}</p>
              <p class="mt-1 text-xs text-muted leading-5">{{ group.summary }}</p>
            </div>
            <span class="shrink-0 text-[10px] text-muted">{{ group.entries.length }} 条</span>
          </div>

          <div v-if="group.entries.length <= 0" class="mt-3 rounded-xs border border-accent/10 bg-bg/40 px-3 py-3 text-xs text-muted">
            这里还没有新的可回看记录。
          </div>
          <div v-else class="mt-3 space-y-3">
            <div
              v-for="entry in group.entries"
              :key="`clue-entry-${group.id}-${entry.id}`"
              class="rounded-xs border border-accent/10 bg-bg/50 px-3 py-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap gap-1.5">
                    <span class="rounded-xs border border-accent/10 px-1.5 py-0.5 text-[10px] text-muted">{{ entry.sourceLabel }}</span>
                  </div>
                  <p class="mt-2 text-sm text-text">{{ entry.title }}</p>
                  <p class="mt-1 text-xs text-muted leading-5">{{ entry.summary }}</p>
                </div>
                <span class="shrink-0 text-[10px] text-muted">{{ entry.dayLabel }}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="space-y-4">
        <div class="flex items-center justify-between gap-3 rounded-xs border border-accent/10 bg-bg/60 px-3 py-3">
          <div>
            <p class="text-sm text-accent">系统消息</p>
            <p class="mt-1 text-xs text-muted">只保留原始消息流水；这里只有这里可以清空本地消息历史。</p>
          </div>
          <button
            v-if="systemLogGroups.length > 0"
            class="rounded-xs border border-danger/20 px-3 py-2 text-[11px] text-danger transition-colors hover:bg-danger/5"
            @click="requestClearLogs(null)"
          >
                  <Trash2 :size="12" class="mr-1 inline" />
            清空全部
          </button>
        </div>

        <div v-if="systemLogGroups.length <= 0" class="record-empty">
          <ScrollText :size="32" class="mb-2 text-accent/30" />
          <p class="text-xs text-muted">当前没有系统消息。</p>
        </div>
        <article
          v-for="group in systemLogGroups"
          :key="`system-group-${group.id}`"
          class="rounded-xs border border-accent/10 bg-bg/60 px-4 py-3"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">{{ group.label }}</p>
            <span class="text-[10px] text-muted">{{ group.totalCount }} 条</span>
          </div>

          <div class="mt-3 space-y-3">
            <div v-for="dayGroup in group.dayGroups" :key="`system-day-${group.id}-${dayGroup.dayLabel}`" class="rounded-xs border border-accent/10 bg-bg/50 px-3 py-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-accent">{{ dayGroup.dayLabel || '未标记日期' }}</p>
                  <button class="text-[10px] text-muted transition-colors hover:text-danger" @click="requestClearLogs(dayGroup.dayLabel)">
                  清空这天
                </button>
              </div>
              <div class="mt-2 space-y-1">
                <p
                  v-for="entry in dayGroup.entries"
                  :key="`system-entry-${group.id}-${dayGroup.dayLabel}-${entry.key}`"
                  class="text-xs text-muted leading-5"
                >
                  {{ entry.message }}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>

    <Transition name="panel-fade">
      <div v-if="clearLogTarget !== undefined" class="game-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
        <div class="game-panel w-full max-w-xs text-center">
          <p class="mb-4 text-xs leading-relaxed">
            {{ clearLogTarget === null ? '确认清空全部系统消息？' : `确认清空「${clearLogTarget || '未标记日期'}」的系统消息？` }}
          </p>
          <div class="flex justify-center gap-3">
            <Button @click="clearLogTarget = undefined">取消</Button>
            <Button class="btn-danger" :icon="Trash2" :icon-size="12" @click="executeClearLogs">确认</Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import {
    AlertTriangle,
    BookOpenText,
    ChevronDown,
    ChevronRight,
    Compass,
    Filter,
    ScrollText,
    Trash2,
    X,
  } from 'lucide-vue-next'
  import { clearAllLogs, clearDayLogs, logHistory } from '@/composables/useGameLog'
  import { getItemById, getNpcById } from '@/data'
  import { useFrontierChronicleStore } from '@/stores/useFrontierChronicleStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerRecordCenterStore, formatRecordDayTag, getRecordDayTagSortValue } from '@/stores/usePlayerRecordCenterStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSecretNoteStore } from '@/stores/useSecretNoteStore'
  import type { GameLogCategory, RecordCenterTabId, RegionId } from '@/types'

  interface ClueEntry {
    id: string
    title: string
    summary: string
    dayLabel: string
    sortValue: number
    sourceLabel: string
  }

  interface ClueGroup {
    id: 'secret_notes' | 'gift_clues' | 'world_signals' | 'weekly_chronicle'
    title: string
    summary: string
    entries: ClueEntry[]
  }

  interface SystemLogDayEntry {
    key: string
    message: string
  }

  interface SystemLogDayGroup {
    dayLabel: string
    entries: SystemLogDayEntry[]
  }

  const props = defineProps<{
    initialTab: RecordCenterTabId
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const recordCenterStore = usePlayerRecordCenterStore()
  const frontierChronicleStore = useFrontierChronicleStore()
  const goalStore = useGoalStore()
  const npcStore = useNpcStore()
  const playerStore = usePlayerStore()
  const secretNoteStore = useSecretNoteStore()

  const activeTab = ref<RecordCenterTabId>(props.initialTab)
  const selectedChronicleType = ref<'all' | 'journey' | 'rumor' | 'variant' | 'companion'>('all')
  const selectedChronicleRegion = ref<'all' | RegionId>('all')
  const expandedDailyDigestDayTags = ref<string[]>([])
  const clearLogTarget = ref<string | null | undefined>(undefined)

  const tabOptions = [
    { id: 'daily' as const, label: '日结' },
    { id: 'chronicle' as const, label: '见闻' },
    { id: 'clues' as const, label: '线索' },
    { id: 'system' as const, label: '系统' },
  ]

  const chronicleTypeOptions = [
    { value: 'all' as const, label: '全部' },
    { value: 'journey' as const, label: '行旅' },
    { value: 'rumor' as const, label: '传闻' },
    { value: 'variant' as const, label: '季节变体' },
    { value: 'companion' as const, label: '同伴' },
  ]

  const chronicleRegionOptions = computed(() => {
    const options: Array<{ value: 'all' | RegionId; label: string }> = [{ value: 'all', label: '全部区域' }]
    for (const regionId of frontierChronicleStore.getChronicleOverview().regionOptions) {
      options.push({ value: regionId, label: getChronicleRegionLabel(regionId) })
    }
    return options
  })

  const dailyDigests = computed(() => recordCenterStore.dailyDigests)

  const ensureExpandedDailyDigest = (dayTag: string) => {
    if (!dayTag || expandedDailyDigestDayTags.value.includes(dayTag)) return
    expandedDailyDigestDayTags.value = [dayTag, ...expandedDailyDigestDayTags.value]
  }

  watch(
    () => props.initialTab,
    nextTab => {
      activeTab.value = nextTab
    },
    { immediate: true }
  )

  watch(
    dailyDigests,
    nextDigests => {
      const latestDayTag = nextDigests[0]?.dayTag ?? ''
      if (latestDayTag) ensureExpandedDailyDigest(latestDayTag)
      const validDayTags = new Set(nextDigests.map(entry => entry.dayTag))
      expandedDailyDigestDayTags.value = expandedDailyDigestDayTags.value.filter(dayTag => validDayTags.has(dayTag))
    },
    { immediate: true }
  )

  watch(
    activeTab,
    nextTab => {
      recordCenterStore.setLastOpenTab(nextTab)
      if (nextTab === 'daily' && recordCenterStore.latestDailyDigest?.dayTag) {
        recordCenterStore.markDailyDigestRead(recordCenterStore.latestDailyDigest.dayTag)
      }
    },
    { immediate: true }
  )

  const switchTab = (tab: RecordCenterTabId) => {
    activeTab.value = tab
  }

  const isDailyDigestExpanded = (dayTag: string) => expandedDailyDigestDayTags.value.includes(dayTag)

  const toggleDailyDigest = (dayTag: string) => {
    if (isDailyDigestExpanded(dayTag)) {
      expandedDailyDigestDayTags.value = expandedDailyDigestDayTags.value.filter(entry => entry !== dayTag)
      return
    }
    expandedDailyDigestDayTags.value = [dayTag, ...expandedDailyDigestDayTags.value]
  }

  const filteredChronicleEntries = computed(() =>
    frontierChronicleStore.chronicleEntries.filter(entry => {
      if (selectedChronicleType.value !== 'all' && entry.type !== selectedChronicleType.value) return false
      if (selectedChronicleRegion.value !== 'all' && entry.regionId !== selectedChronicleRegion.value) return false
      return true
    })
  )

  const lifestyleDiscoverySnapshot = computed(() => playerStore.getLifestyleDiscoverySnapshot())

  const createClueEntry = (payload: Omit<ClueEntry, 'dayLabel' | 'sortValue'> & { dayTag: string }) => ({
    id: payload.id,
    title: payload.title,
    summary: payload.summary,
    dayLabel: formatRecordDayTag(payload.dayTag),
    sortValue: getRecordDayTagSortValue(payload.dayTag),
    sourceLabel: payload.sourceLabel,
  })

  const humanizeFallbackId = (value: string) =>
    value
      .replace(/^npc:/, '')
      .replace(/^record:/, '')
      .replace(/^note:/, '')
      .replace(/_/g, ' ')
      .replace(/:/g, ' / ')
      .trim() || '未命名记录'

  const formatGiftClueFallback = (clueId: string) => {
    const scriptedMatch = /^gift_check:([^:]+):([^:]+):(loved|liked|hated)$/.exec(clueId)
    if (scriptedMatch) {
      const [, npcId, itemId, preference] = scriptedMatch as unknown as [string, string, string, 'loved' | 'liked' | 'hated']
      const npcName = getNpcById(npcId)?.name ?? npcId
      const itemName = getItemById(itemId)?.name ?? itemId
      const preferenceLabelMap: Record<'loved' | 'liked' | 'hated', string> = {
        loved: '很喜欢',
        liked: '挺喜欢',
        hated: '很讨厌',
      }
      return {
        title: `${npcName}的礼物验证`,
        summary: `你亲手验证过：${npcName}对「${itemName}」${preferenceLabelMap[preference] ?? preference}。`,
      }
    }
    return {
      title: '礼物线索',
      summary: humanizeFallbackId(clueId),
    }
  }

  const formatWorldSignalLabel = (bucket: string, rawId: string) => {
    if (bucket === 'rareVisitors') {
      if (rawId === 'traveling_merchant') return { title: '特殊来访：旅行商人', summary: '你已经记录过这位流动来访者的到访。' }
      if (rawId.includes('bookseller')) return { title: '特殊来访：游学书生', summary: '这位专带见闻书与线索书的人物已经被你记录。' }
      return { title: '特殊来访', summary: humanizeFallbackId(rawId) }
    }
    if (bucket === 'worldRestorations') {
      return { title: '世界变化', summary: humanizeFallbackId(rawId) }
    }
    if (bucket === 'specialOrders') {
      if (rawId.startsWith('npc:')) {
        const npcName = getNpcById(rawId.slice(4))?.name ?? rawId.slice(4)
        return { title: '特别委托联系人', summary: npcName }
      }
      return { title: '特别委托归档', summary: humanizeFallbackId(rawId) }
    }
    if (bucket === 'masteryUnlocks') {
      return { title: '精通记录', summary: humanizeFallbackId(rawId) }
    }
    if (bucket === 'prizeProgress') {
      return { title: '奖契推进', summary: humanizeFallbackId(rawId) }
    }
    if (bucket === 'mysteryBoxes') {
      return { title: '奇盒目录', summary: humanizeFallbackId(rawId) }
    }
    if (bucket === 'lifestyleUnlocks') {
      if (rawId.startsWith('pet_adopted_')) return { title: '生活方式解锁', summary: `收养了宠物：${humanizeFallbackId(rawId.replace('pet_adopted_', ''))}` }
      if (rawId.startsWith('pet_bond_')) return { title: '生活方式解锁', summary: `宠物羁绊：${humanizeFallbackId(rawId.replace('pet_bond_', ''))}` }
      if (rawId.startsWith('home_renovation_')) return { title: '宅院改造', summary: humanizeFallbackId(rawId.replace('home_renovation_', '')) }
      if (rawId.startsWith('trinket_equipped_')) {
        const itemId = rawId.replace('trinket_equipped_', '')
        return { title: '饰物启用', summary: getItemById(itemId)?.name ?? humanizeFallbackId(itemId) }
      }
      const itemName = getItemById(rawId)?.name
      return { title: '生活方式解锁', summary: itemName ?? humanizeFallbackId(rawId) }
    }
    return { title: '长期记录', summary: humanizeFallbackId(rawId) }
  }

  const secretNoteEntries = computed(() => {
    const entries = Object.values(secretNoteStore.noteLeadStates)
      .filter(state => state.recordText.trim().length > 0)
      .map(state => {
        const note = secretNoteStore.getNoteDef(state.noteId)
        return createClueEntry({
          id: `secret-note:${state.noteId}`,
          title: note?.title ?? `秘密纸条 #${state.noteId}`,
          summary: state.recordText.trim(),
          dayTag: state.resolvedDayTag || state.unlockedDayTag || '',
          sourceLabel: '秘密纸条',
        })
      })

    const secretLeadExtras = Object.entries(lifestyleDiscoverySnapshot.value.secretLeads)
      .filter(([id]) => !id.startsWith('note:') && !id.startsWith('record:'))
      .map(([id, info]) =>
        createClueEntry({
          id: `secret-ledger:${id}`,
          title: '秘密线索',
          summary: humanizeFallbackId(id),
          dayTag: info.lastSeenDayTag || info.firstSeenDayTag || '',
          sourceLabel: '秘密线索',
        })
      )

    return [...entries, ...secretLeadExtras].sort((left, right) => right.sortValue - left.sortValue)
  })

  const giftClueEntries = computed(() => {
    const relationshipClueMap = new Map(npcStore.relationshipClues.map(clue => [clue.clueId, clue]))
    return Object.entries(lifestyleDiscoverySnapshot.value.giftClues)
      .map(([clueId, info]) => {
        const clue = relationshipClueMap.get(clueId)
        const fallback = formatGiftClueFallback(clueId)
        return createClueEntry({
          id: `gift-clue:${clueId}`,
          title: clue ? `${getNpcById(clue.npcId)?.name ?? clue.npcId}的礼物线索` : fallback.title,
          summary: clue?.text ?? fallback.summary,
          dayTag: info.lastSeenDayTag || info.firstSeenDayTag || '',
          sourceLabel: '关系与礼物线索',
        })
      })
      .sort((left, right) => right.sortValue - left.sortValue)
  })

  const worldSignalEntries = computed(() => {
    const entries: ClueEntry[] = []
    const buckets: Array<keyof typeof lifestyleDiscoverySnapshot.value> = [
      'worldRestorations',
      'rareVisitors',
      'specialOrders',
      'masteryUnlocks',
      'prizeProgress',
      'mysteryBoxes',
      'lifestyleUnlocks',
    ]

    for (const bucket of buckets) {
      const currentBucket = lifestyleDiscoverySnapshot.value[bucket]
      for (const [rawId, info] of Object.entries(currentBucket)) {
        const formatted = formatWorldSignalLabel(bucket, rawId)
        entries.push(
          createClueEntry({
            id: `${bucket}:${rawId}`,
            title: formatted.title,
            summary: formatted.summary,
            dayTag: info.lastSeenDayTag || info.firstSeenDayTag || '',
            sourceLabel: bucket === 'rareVisitors' ? '特殊来访' : bucket === 'worldRestorations' ? '世界变化' : '长期记录',
          })
        )
      }
    }

    return entries.sort((left, right) => right.sortValue - left.sortValue)
  })

  const weeklyChronicleEntries = computed(() =>
    goalStore.weeklyChronicleEntries
      .map(entry =>
        createClueEntry({
          id: `weekly-chronicle:${entry.weekId}`,
          title: `周纪行：${entry.weekId}`,
          summary: entry.settlementSummary,
          dayTag: entry.createdAtDayTag,
          sourceLabel: '周纪行',
        })
      )
      .sort((left, right) => right.sortValue - left.sortValue)
  )

  const clueGroups = computed<ClueGroup[]>(() => [
    {
      id: 'secret_notes',
      title: '秘密纸条',
      summary: '只展示已经真正写进长期记录的纸条结果，不再让“写进见闻”停留在即时提示里。',
      entries: secretNoteEntries.value,
    },
    {
      id: 'gift_clues',
      title: '关系与礼物线索',
      summary: '把你已经验证过的好感与送礼线索单独收好，方便后续送礼与关系推进。',
      entries: giftClueEntries.value,
    },
    {
      id: 'world_signals',
      title: '世界变化与特殊来访',
      summary: '统一承接来访、世界变化、生活方式和其他长期世界信号，不再散在各页。',
      entries: worldSignalEntries.value,
    },
    {
      id: 'weekly_chronicle',
      title: '周纪行',
      summary: '把每周的重点结算、方向承接和后续准备独立收口，避免它混进系统流水里。',
      entries: weeklyChronicleEntries.value,
    },
  ])

  const categoryGroupLabelMap: Record<string, string> = {
    system: '系统',
    operations: '经营',
    social: '社交',
    economy: '经济',
    quest: '任务',
    other: '其他',
  }

  const resolveSystemLogGroupId = (category?: GameLogCategory) => {
    if (!category || category === 'system') return 'system'
    if (category === 'social') return 'social'
    if (category === 'quest' || category === 'goal') return 'quest'
    if (category === 'economy' || category === 'market') return 'economy'
    if (category === 'processing' || category === 'breeding' || category === 'hanhai' || category === 'village' || category === 'guild' || category === 'museum') {
      return 'operations'
    }
    return 'other'
  }

  const systemLogGroups = computed(() => {
    const grouped = new Map<
      string,
      {
        id: string
        label: string
        totalCount: number
        dayGroups: Array<SystemLogDayGroup>
      }
    >()

    const dayGroupMaps = new Map<string, Map<string, SystemLogDayEntry[]>>()

    const reversedEntries = [...logHistory.value].reverse()
    for (const [index, entry] of reversedEntries.entries()) {
      const groupId = resolveSystemLogGroupId(entry.category)
      const label = categoryGroupLabelMap[groupId] ?? '其他'
      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          id: groupId,
          label,
          totalCount: 0,
          dayGroups: [],
        })
        dayGroupMaps.set(groupId, new Map())
      }
      const group = grouped.get(groupId)!
      group.totalCount += 1
      const dayLabel = entry.dayLabel || '未标记日期'
      const dayMap = dayGroupMaps.get(groupId)!
      const dayEntries = dayMap.get(dayLabel) ?? []
      dayEntries.push({
        key: `${groupId}:${dayLabel}:${index}`,
        message: entry.msg,
      })
      dayMap.set(dayLabel, dayEntries)
    }

    for (const [groupId, group] of grouped.entries()) {
      const dayMap = dayGroupMaps.get(groupId)!
      group.dayGroups = [...dayMap.entries()].map(([dayLabel, entries]) => ({
        dayLabel,
        entries,
      }))
    }

    const groupOrder = ['system', 'operations', 'social', 'economy', 'quest', 'other']
    return [...grouped.values()].sort((left, right) => groupOrder.indexOf(left.id) - groupOrder.indexOf(right.id))
  })

  const requestClearLogs = (dayLabel: string | null) => {
    clearLogTarget.value = dayLabel
  }

  const executeClearLogs = () => {
    if (clearLogTarget.value === null) {
      clearAllLogs()
    } else if (typeof clearLogTarget.value === 'string' && clearLogTarget.value.length > 0) {
      clearDayLogs(clearLogTarget.value === '未标记日期' ? '' : clearLogTarget.value)
    }
    clearLogTarget.value = undefined
  }

  const getChronicleTypeLabel = (type: string) => {
    const typeLabelMap: Record<string, string> = {
      journey: '行旅',
      rumor: '传闻',
      variant: '季节变体',
      companion: '同伴',
      photo: '留影',
    }
    return typeLabelMap[type] ?? type
  }

  function getChronicleRegionLabel(regionId: RegionId) {
    return frontierChronicleStore.regionNotables && frontierChronicleStore.regionNotables[regionId] != null
      ? ({
          ancient_road: '古驿荒道',
          mirage_marsh: '蜃潮泽地',
          cloud_highland: '云岚高地',
        }[regionId] ?? regionId)
      : ({
          ancient_road: '古驿荒道',
          mirage_marsh: '蜃潮泽地',
          cloud_highland: '云岚高地',
        }[regionId] ?? regionId)
  }

  const formatDayTag = (dayTag: string) => formatRecordDayTag(dayTag)

  const getToneShellClass = (tone: string) => {
    if (tone === 'danger') return 'border-danger/20 bg-danger/5'
    if (tone === 'warning') return 'border-warning/20 bg-warning/5'
    if (tone === 'success') return 'border-success/20 bg-success/5'
    return 'border-accent/10 bg-bg/50'
  }

  const getToneTextClass = (tone: string) => {
    if (tone === 'danger') return 'text-danger'
    if (tone === 'warning') return 'text-warning'
    if (tone === 'success') return 'text-success'
    return 'text-accent'
  }
</script>

<style scoped>
  .record-center-panel {
    min-height: 0;
  }

  .record-empty {
    display: flex;
    min-height: 220px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(200, 164, 92, 0.12);
    border-radius: 2px;
    background: rgba(14, 18, 28, 0.45);
    text-align: center;
  }
</style>
