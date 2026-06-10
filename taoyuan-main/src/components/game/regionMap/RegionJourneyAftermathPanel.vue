<script setup lang="ts">
  type Fn = (...args: any[]) => any

  defineProps<{
    latestSummary: any | null
    pinnedSummary: any | null
    visibleHistoryEntries: any[]
    journeyHistoryOverflowEntries: any[]
    hasMoreJourneyHistoryEntries: boolean
    mobileHistoryCollapsedSummary: string
    isCompactMobile: boolean
    mobileLatestExpanded: boolean
    mobileSelectedExpanded: boolean
    mobileHistoryExpanded: boolean
    mobileHistorySectionExpanded: boolean
    hasResourceLedgerEntries: boolean
    getJourneyActionTagMeta: Fn
    getArchiveOutcomeLabel: Fn
    getJourneyActionStatus: Fn
    isJourneyActionProcessed: Fn
    getJourneyActionButtonMeta: Fn
    getRegionName: Fn
    formatCarryManifest: Fn
    getArchiveAftermathSummary: Fn
  }>()

  const emit = defineEmits<{
    'update:mobileLatestExpanded': [value: boolean]
    'update:mobileSelectedExpanded': [value: boolean]
    'update:mobileHistoryExpanded': [value: boolean]
    'update:mobileHistorySectionExpanded': [value: boolean]
    navigate: [entryId: string, panelKey: any]
    scrollResource: []
    clearSelected: []
    selectAftermath: [entry: any]
    openAftermath: [entry: any]
  }>()
</script>

<template>
  <div class="space-y-3">
    <div v-if="latestSummary" class="border border-accent/20 rounded-xs p-3 mb-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">回城办事单：{{ latestSummary.entry.targetName }}</p>
                <p class="text-xs text-muted mt-1 leading-5">
                  {{ latestSummary.regionName }} / {{ latestSummary.entry.mode === 'boss' ? '首领远征' : '路线远征' }} / 最近一次回城结果
                </p>
                <div v-if="latestSummary.actions.length > 0" class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-for="action in latestSummary.actions"
                    :key="`latest-activated-${latestSummary.entry.id}-${action.key}`"
                    class="border rounded-xs px-2 py-0.5 text-[0.625rem]"
                    :class="getJourneyActionTagMeta(latestSummary.entry.id, action.key).className"
                  >
                    {{ getJourneyActionTagMeta(latestSummary.entry.id, action.key).labelPrefix }} {{ action.label }}
                  </span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <span class="text-[0.625rem]" :class="latestSummary.toneClass">
                  {{ getArchiveOutcomeLabel(latestSummary.entry.outcome) }}
                </span>
                <button
                  v-if="isCompactMobile"
                  class="mt-2 block border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                  @click="emit('update:mobileLatestExpanded', !mobileLatestExpanded)"
                >
                  {{ mobileLatestExpanded ? '收起' : '展开' }}
                </button>
              </div>
            </div>
    
            <div v-if="!isCompactMobile || mobileLatestExpanded" class="space-y-3 mt-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <p class="text-[0.625rem] text-muted mb-2">旅程回顾</p>
                <div class="space-y-1">
                  <p
                    v-for="line in latestSummary.journeyLines"
                    :key="`latest-journey-${latestSummary.entry.id}-${line}`"
                    class="text-[0.625rem] text-muted leading-4"
                  >
                    · {{ line }}
                  </p>
                </div>
              </div>
    
              <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
                <p class="text-[0.625rem] text-muted mb-2">回流分发</p>
                <div class="space-y-1">
                  <p
                    v-for="line in latestSummary.rewardLines"
                    :key="`latest-reward-${latestSummary.entry.id}-${line}`"
                    class="text-[0.625rem] leading-4"
                    :class="line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还') ? 'text-success' : 'text-muted'"
                  >
                    · {{ line }}
                  </p>
                </div>
              </div>
    
              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <p class="text-[0.625rem] text-muted mb-2">后续去向</p>
                <div class="space-y-1">
                  <p
                    v-for="line in latestSummary.aftermathLines"
                    :key="`latest-aftermath-${latestSummary.entry.id}-${line}`"
                    class="text-[0.625rem] text-muted leading-4"
                  >
                    · {{ line }}
                  </p>
                </div>
              </div>
            </div>
    
            <div v-if="latestSummary.handoffBoard" class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-accent/5">
              <p class="text-[0.625rem] text-muted">回城办事入口</p>
              <p class="text-xs text-accent mt-1">{{ latestSummary.handoffBoard.headline }}</p>
    
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                  <p class="text-[0.625rem] text-muted mb-2">资源去向</p>
                  <div v-if="isCompactMobile && hasResourceLedgerEntries" class="space-y-2">
                    <p class="text-xs text-muted leading-5">这趟带回的区域资源已经并到下方“资源家族总览”，库存和交付以下方总览为准。</p>
                    <button
                      class="w-full border border-accent/20 rounded-xs px-2 py-1 text-xs text-accent hover:bg-accent/5"
                      @click="emit('scrollResource')"
                    >
                      去看资源总览
                    </button>
                  </div>
                  <div v-else class="space-y-1">
                    <p
                      v-for="line in latestSummary.handoffBoard.resourceLines"
                      :key="`latest-resource-flow-${latestSummary.entry.id}-${line}`"
                      class="text-[0.625rem] text-muted leading-4"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>
    
                <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
                  <p class="text-[0.625rem] text-muted mb-2">推荐动作</p>
                  <div class="space-y-2">
                    <div
                      v-for="action in latestSummary.handoffBoard.actionCards"
                      :key="`latest-action-card-${latestSummary.entry.id}-${action.key}`"
                      class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="flex items-center justify-between gap-2">
                            <p class="text-[0.625rem] text-accent">去{{ action.label }}</p>
                            <span
                              class="text-[0.625rem] shrink-0"
                              :class="getJourneyActionStatus(latestSummary.entry.id, action.key, action.statusLabel, action.statusToneClass).statusToneClass"
                            >
                              {{ getJourneyActionStatus(latestSummary.entry.id, action.key, action.statusLabel, action.statusToneClass).statusLabel }}
                            </span>
                          </div>
                          <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ action.summary }}</p>
                          <p class="text-[0.625rem] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                        </div>
                        <button
                          class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
                          @click="emit('navigate', latestSummary.entry.id, action.key)"
                        >
                          {{ isJourneyActionProcessed(latestSummary.entry.id, action.key) ? '再次前往' : '前往' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
    
                <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                  <p class="text-[0.625rem] text-muted mb-2">为什么现在去</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in latestSummary.handoffBoard.whyNowLines"
                      :key="`latest-why-now-${latestSummary.entry.id}-${line}`"
                      class="text-[0.625rem] text-muted leading-4"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>
              </div>
    
              <div v-if="latestSummary.handoffBoard.receiptSections.length > 0" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  v-for="section in latestSummary.handoffBoard.receiptSections"
                  :key="`latest-receipt-${latestSummary.entry.id}-${section.title}`"
                  class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <p class="text-[0.625rem] text-muted">{{ section.title }}</p>
                    <span class="text-[0.625rem] shrink-0" :class="section.statusToneClass">{{ section.statusLabel }}</span>
                  </div>
                  <div class="space-y-1">
                    <p
                      v-for="line in section.lines"
                      :key="`latest-receipt-line-${latestSummary.entry.id}-${section.title}-${line}`"
                      class="text-[0.625rem] text-muted leading-4"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
    
            <div v-else-if="latestSummary.actions.length > 0" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="action in latestSummary.actions"
                :key="`latest-journey-action-${action.key}`"
                class="border rounded-xs px-2 py-1 text-[0.625rem]"
                :class="getJourneyActionButtonMeta(latestSummary.entry.id, action.key, action.label).className"
                @click="emit('navigate', latestSummary.entry.id, action.key)"
              >
                {{ getJourneyActionButtonMeta(latestSummary.entry.id, action.key, action.label).label }}
              </button>
            </div>
            </div>
          </div>
    
          <div v-if="visibleHistoryEntries.length > 0" class="border border-accent/20 rounded-xs p-3 mb-3">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <p class="text-xs text-muted">最近远征记录</p>
                <p class="text-xs text-muted mt-1 leading-5">最新一条回城办事单已单独置顶，这里只保留更早的记录，默认看最近 2 条。</p>
              </div>
              <button
                v-if="isCompactMobile"
                class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
                @click="emit('update:mobileHistorySectionExpanded', !mobileHistorySectionExpanded)"
              >
                {{ mobileHistorySectionExpanded ? '收起历史' : `展开 ${journeyHistoryOverflowEntries.length} 条` }}
              </button>
              <button
                v-else-if="hasMoreJourneyHistoryEntries"
                class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
                @click="emit('update:mobileHistoryExpanded', !mobileHistoryExpanded)"
              >
                {{ mobileHistoryExpanded ? '只看最近 2 条' : `展开全部 ${journeyHistoryOverflowEntries.length} 条` }}
              </button>
            </div>
            <p v-if="isCompactMobile && !mobileHistorySectionExpanded" class="text-xs text-muted leading-5">
              {{ mobileHistoryCollapsedSummary }}
            </p>
            <div v-else class="space-y-2">
              <div v-for="entry in visibleHistoryEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs text-accent">{{ entry.targetName }}</p>
                    <p class="text-[0.625rem] text-muted mt-0.5 leading-4">{{ getRegionName(entry.regionId) }} / {{ entry.mode === 'boss' ? '首领远征' : '路线远征' }} / {{ getArchiveOutcomeLabel(entry.outcome) }}</p>
                  </div>
                  <span class="text-[0.625rem] text-muted shrink-0">{{ entry.endedAtDayTag || entry.startedAtDayTag }}</span>
                </div>
                <div class="mt-2 space-y-1">
                  <p v-for="line in entry.summaryLines" :key="`${entry.id}-${line}`" class="text-[0.625rem] text-muted leading-4">- {{ line }}</p>
                </div>
                <p v-if="entry.carryItems.length > 0" class="text-[0.625rem] text-muted mt-2 leading-4">
                  携带清单：{{ formatCarryManifest(entry.carryItems, 4) }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    class="border border-success/20 rounded-xs px-2 py-1 text-[0.625rem] text-success hover:bg-success/5"
                    @click="emit('selectAftermath', entry)"
                  >
                    设为当前回看
                  </button>
                  <button
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                    @click="emit('openAftermath', entry)"
                  >
                    查看旅后处理
                  </button>
                  <button
                    v-for="action in getArchiveAftermathSummary(entry).actions.slice(0, 3)"
                    :key="`${entry.id}-action-${action.key}`"
                    class="border rounded-xs px-2 py-1 text-[0.625rem]"
                    :class="getJourneyActionButtonMeta(entry.id, action.key, action.label).className"
                    @click="emit('navigate', entry.id, action.key)"
                  >
                    {{ getJourneyActionButtonMeta(entry.id, action.key, action.label).label }}
                  </button>
                </div>
              </div>
              <button
                v-if="isCompactMobile && hasMoreJourneyHistoryEntries"
                class="w-full border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                @click="emit('update:mobileHistoryExpanded', !mobileHistoryExpanded)"
              >
                {{ mobileHistoryExpanded ? '只看最近 2 条' : `展开全部 ${journeyHistoryOverflowEntries.length} 条` }}
              </button>
            </div>
          </div>
    
          <div v-if="pinnedSummary" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">旅后处理台账：{{ pinnedSummary.entry.targetName }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">
                  {{ pinnedSummary.regionName }} / {{ pinnedSummary.entry.mode === 'boss' ? '首领远征' : '路线远征' }} / 常驻页内回看
                </p>
                <div v-if="pinnedSummary.actions.length > 0" class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-for="action in pinnedSummary.actions"
                    :key="`selected-activated-${pinnedSummary.entry.id}-${action.key}`"
                    class="border rounded-xs px-2 py-0.5 text-[0.625rem]"
                    :class="getJourneyActionTagMeta(pinnedSummary.entry.id, action.key).className"
                  >
                    {{ getJourneyActionTagMeta(pinnedSummary.entry.id, action.key).labelPrefix }} {{ action.label }}
                  </span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <span class="text-[0.625rem]" :class="pinnedSummary.toneClass">
                  {{ getArchiveOutcomeLabel(pinnedSummary.entry.outcome) }}
                </span>
                <p class="text-[0.625rem] text-muted mt-1">{{ pinnedSummary.entry.endedAtDayTag || pinnedSummary.entry.startedAtDayTag }}</p>
                <button
                  v-if="isCompactMobile"
                  class="mt-2 block border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                  @click="emit('update:mobileSelectedExpanded', !mobileSelectedExpanded)"
                >
                  {{ mobileSelectedExpanded ? '收起' : '展开' }}
                </button>
                <button
                  class="mt-2 block border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                  @click="emit('clearSelected')"
                >
                  结束回看
                </button>
              </div>
            </div>
    
            <div v-if="!isCompactMobile || mobileSelectedExpanded" class="space-y-3 mt-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                <p class="text-[0.625rem] text-muted mb-2">旅程回顾</p>
                <div class="space-y-1">
                  <p
                    v-for="line in pinnedSummary.journeyLines"
                    :key="`selected-journey-${pinnedSummary.entry.id}-${line}`"
                    class="text-[0.625rem] text-muted leading-4"
                  >
                    · {{ line }}
                  </p>
                </div>
              </div>
    
              <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
                <p class="text-[0.625rem] text-muted mb-2">回流分发</p>
                <div class="space-y-1">
                  <p
                    v-for="line in pinnedSummary.rewardLines"
                    :key="`selected-reward-${pinnedSummary.entry.id}-${line}`"
                    class="text-[0.625rem] leading-4"
                    :class="line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还') ? 'text-success' : 'text-muted'"
                  >
                    · {{ line }}
                  </p>
                </div>
              </div>
            </div>
    
            <div v-if="pinnedSummary.handoffBoard" class="mt-3 space-y-3">
              <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
                <p class="text-[0.625rem] text-muted">后续去向</p>
                <p class="text-xs text-accent mt-1">{{ pinnedSummary.handoffBoard.headline }}</p>
                <div class="space-y-1 mt-2">
                  <p
                    v-for="line in pinnedSummary.aftermathLines"
                    :key="`selected-aftermath-${pinnedSummary.entry.id}-${line}`"
                    class="text-[0.625rem] text-muted leading-4"
                  >
                    · {{ line }}
                  </p>
                </div>
              </div>
    
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                  <p class="text-[0.625rem] text-muted mb-2">资源去向</p>
                  <div v-if="isCompactMobile && hasResourceLedgerEntries" class="space-y-2">
                    <p class="text-xs text-muted leading-5">这趟带回的区域资源已经并到下方“资源家族总览”，回看时不用再把同一批库存重新读一遍。</p>
                    <button
                      class="w-full border border-accent/20 rounded-xs px-2 py-1 text-xs text-accent hover:bg-accent/5"
                      @click="emit('scrollResource')"
                    >
                      去看资源总览
                    </button>
                  </div>
                  <div v-else class="space-y-1">
                    <p
                      v-for="line in pinnedSummary.handoffBoard.resourceLines"
                      :key="`selected-resource-${pinnedSummary.entry.id}-${line}`"
                      class="text-[0.625rem] text-muted leading-4"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>
    
                  <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
                    <p class="text-[0.625rem] text-muted mb-2">推荐动作</p>
                    <div class="space-y-2">
                      <div
                        v-for="action in pinnedSummary.handoffBoard.actionCards"
                        :key="`selected-action-card-${pinnedSummary.entry.id}-${action.key}`"
                        class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="flex items-center justify-between gap-2">
                            <p class="text-[0.625rem] text-accent">去{{ action.label }}</p>
                              <span
                                class="text-[0.625rem] shrink-0"
                                :class="getJourneyActionStatus(pinnedSummary.entry.id, action.key, action.statusLabel, action.statusToneClass).statusToneClass"
                              >
                                {{ getJourneyActionStatus(pinnedSummary.entry.id, action.key, action.statusLabel, action.statusToneClass).statusLabel }}
                              </span>
                            </div>
                            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ action.summary }}</p>
                            <p class="text-[0.625rem] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                          </div>
                          <button
                            class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
                            @click="emit('navigate', pinnedSummary.entry.id, action.key)"
                          >
                            {{ isJourneyActionProcessed(pinnedSummary.entry.id, action.key) ? '再次前往' : '前往' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
    
                <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                  <p class="text-[0.625rem] text-muted mb-2">为什么现在去</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in pinnedSummary.handoffBoard.whyNowLines"
                      :key="`selected-why-now-${pinnedSummary.entry.id}-${line}`"
                      class="text-[0.625rem] text-muted leading-4"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>
              </div>
    
              <div v-if="pinnedSummary.handoffBoard.receiptSections.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  v-for="section in pinnedSummary.handoffBoard.receiptSections"
                  :key="`selected-receipt-${pinnedSummary.entry.id}-${section.title}`"
                  class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <p class="text-[0.625rem] text-muted">{{ section.title }}</p>
                    <span class="text-[0.625rem] shrink-0" :class="section.statusToneClass">{{ section.statusLabel }}</span>
                  </div>
                  <div class="space-y-1">
                    <p
                      v-for="line in section.lines"
                      :key="`selected-receipt-line-${pinnedSummary.entry.id}-${section.title}-${line}`"
                      class="text-[0.625rem] text-muted leading-4"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
    
            <div v-else-if="pinnedSummary.actions.length > 0" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="action in pinnedSummary.actions"
                :key="`selected-journey-action-${pinnedSummary.entry.id}-${action.key}`"
                class="border rounded-xs px-2 py-1 text-[0.625rem]"
                :class="getJourneyActionButtonMeta(pinnedSummary.entry.id, action.key, action.label).className"
                @click="emit('navigate', pinnedSummary.entry.id, action.key)"
              >
                {{ getJourneyActionButtonMeta(pinnedSummary.entry.id, action.key, action.label).label }}
              </button>
            </div>
            </div>
          </div>
  </div>
</template>
