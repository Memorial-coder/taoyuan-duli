<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Map :size="14" />
        <span>行旅图</span>
      </div>
      <span class="text-xs" :class="regionMapStore.unlockedRegionCount > 0 ? 'text-success' : 'text-muted'">
        {{ regionMapStore.unlockedRegionCount > 0 ? '已开放' : '按进度开放' }}
      </span>
    </div>

    <div v-if="regionMapStore.unlockedRegionCount <= 0" class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center gap-2 mb-2 text-accent/70">
        <Map :size="18" />
        <span class="text-xs">未开放时也可先查看开放条件</span>
      </div>
      <p class="text-sm text-muted">行旅图会随着玩家进度逐步开放。</p>
      <p class="text-xs text-muted mt-1 leading-5">
        当任意区域满足解锁条件后，这里会自动切换成正式可推进的区域总入口，不再需要额外开关。      </p>
      <p class="text-xs text-accent/80 mt-2 leading-5">现在不再需要额外开关，任一区域满足条件后会自动进入可用状态。</p>
      <div class="mt-3 space-y-2">
        <div
          v-for="entry in lockedRegionUnlockGuides"
          :key="`region-unlock-guide-${entry.id}`"
          class="border border-accent/10 rounded-xs p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-accent">{{ entry.name }}</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.description }}</p>
            </div>
            <span class="text-[10px] shrink-0" :class="entry.ready ? 'text-success' : 'text-muted'">
              {{ entry.ready ? '条件已满足' : '尚未满足' }}
            </span>
          </div>
          <p class="text-[10px] text-muted mt-2 leading-4">{{ entry.summary }}</p>
          <p class="text-[10px] text-accent/80 mt-1 leading-4">承接方向：{{ entry.linkedSystems.join(' / ') }}</p>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-muted">已解锁区域</span>
            <span class="text-accent">{{ regionMapStore.unlockedRegionCount }}/{{ regionMapStore.regionDefs.length }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">运行中远征</span>
            <span>{{ regionMapStore.hasActiveExpedition ? '进行中' : '无' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">本周焦点</span>
            <span class="text-accent">{{ currentFocusLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">资源家族</span>
            <span>{{ regionMapStore.resourceFamilyDefs.length }} 组</span>
          </div>
        </div>
        <p class="text-[10px] text-muted mt-2 leading-4">
          当前主题周：{{ currentThemeWeekLabel }}。当前入口已接通区域状态、路线完成、首领记录与资源台账，后续将继续把结算接到旧系统。
        </p>
      </div>

      <div v-if="isDev" class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">开发态操作</p>
            <p class="text-[10px] text-muted mt-1 leading-4">用于快速验证区域解锁、周焦点、路线完成和首领记录是否贯通。</p>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <button class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5" @click="handleRefreshUnlocks">
              刷新解锁
            </button>
            <button class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5" @click="handleSyncWeeklyFocus">
              同步周焦点
            </button>
            <button class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5" @click="handleResourceTurnIn">
              记 1 次交付
            </button>
          </div>
        </div>
        <p
          v-if="lastActionSummary"
          class="text-[10px] mt-2 leading-4"
          :class="actionToneClass"
        >
          {{ lastActionSummary }}
        </p>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <p class="text-xs text-accent">{{ regionMapStore.frontierDigest.headline }}</p>
        <div class="mt-2 space-y-1">
          <p
            v-for="line in regionMapStore.frontierDigest.highlightSummaries"
            :key="`digest-highlight-${line}`"
            class="text-[10px] text-muted leading-4"
          >
            - {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.nextHookSummaries"
            :key="`digest-hook-${line}`"
            class="text-[10px] text-accent/80 leading-4"
          >
            -> {{ line }}
          </p>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-muted">区域切换</p>
          <button
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] hover:bg-accent/5"
            :class="selectedRegionId === null ? 'text-accent' : 'text-muted'"
            @click="selectedRegionId = null"
          >
            全部区域
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="region in regionMapStore.regionSummaries"
            :key="`region-filter-${region.id}`"
            class="border rounded-xs px-2 py-1 text-[10px] hover:bg-accent/5"
            :class="selectedRegionId === region.id ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
            @click="selectedRegionId = region.id"
          >
            {{ region.name }}
          </button>
        </div>
      </div>

      <div class="space-y-2 mb-3">
        <div v-for="region in visibleRegionSummaries" :key="region.id" class="border border-accent/20 rounded-xs p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ region.name }}</p>
              <p class="text-xs text-muted mt-1 leading-5">{{ region.description }}</p>
            </div>
            <span class="text-[10px] shrink-0" :class="region.unlocked ? 'text-success' : 'text-muted'">
              {{ region.unlocked ? '已解锁' : '未解锁' }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mt-3">
            <div class="flex items-center justify-between">
              <span class="text-muted">主题</span>
              <span>{{ region.themeHint }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">路线</span>
              <span class="text-accent">{{ region.completedRouteCount }}/{{ region.routeCount }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">接线系统</span>
              <span>{{ region.linkedSystems.join(' / ') }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">首领</span>
              <span>{{ region.boss?.name ?? '待接线' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">解锁进度</span>
              <span>{{ getUnlockSummary(region.id) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">周焦点</span>
              <span :class="region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? 'text-success' : 'text-muted'">
                {{ region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? '当前焦点' : '普通' }}
              </span>
            </div>
          </div>

          <div class="mt-3 space-y-2">
            <div class="flex flex-wrap gap-2">
              <button
                v-if="isDev"
                class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] hover:bg-accent/5"
                :class="region.unlocked ? 'text-muted' : 'text-accent'"
                :disabled="region.unlocked"
                @click="handleUnlockRegion(region.id)"
              >
                {{ region.unlocked ? '已解锁' : '手动解锁' }}
              </button>
              <button
                v-if="isDev"
                class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
                @click="handleFocusRegion(region.id)"
              >
                设为本周焦点
              </button>
              <button
                class="border border-danger/20 rounded-xs px-2 py-1 text-[10px] text-danger hover:bg-danger/5"
                :disabled="!canChallengeBoss(region.id)"
                :title="getBossDisabledReason(region.id)"
                @click="handleRunBoss(region.id)"
              >
                挑战首领
              </button>
              <button
                v-if="isDev"
                class="border border-danger/20 rounded-xs px-2 py-1 text-[10px] text-danger hover:bg-danger/5"
                :disabled="!canChallengeBoss(region.id)"
                :title="getBossDisabledReason(region.id)"
                @click="handleBossClear(region.id)"
              >
                首领清关
              </button>
            </div>
            <p v-if="getBossDisabledReason(region.id)" class="text-[10px] text-muted leading-4">
              {{ getBossDisabledReason(region.id) }}
            </p>

            <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[10px] text-muted mb-2">首领准备</p>
              <p class="text-xs text-accent">{{ getBossPrepSummary(region.id).headline }}</p>
              <div class="mt-2 space-y-1" v-if="getBossPrepSummary(region.id).detailLines.length > 0">
                <p
                  v-for="line in getBossPrepSummary(region.id).detailLines"
                  :key="`${region.id}-boss-prep-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[10px] text-muted mb-2">回流承接</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="panel in getLinkedPanels(region.linkedSystems)"
                  :key="`${region.id}-${panel.key}`"
                  class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                  @click="handleNavigate(panel.key)"
                >
                  去{{ panel.label }}
                </button>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[10px] text-muted mb-2">本区重点承接</p>
              <p class="text-xs text-accent">{{ getRegionHandoffSummary(region.id).headline }}</p>
              <div class="mt-2 space-y-1" v-if="getRegionHandoffSummary(region.id).detailLines.length > 0">
                <p
                  v-for="line in getRegionHandoffSummary(region.id).detailLines"
                  :key="`${region.id}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[10px] text-muted">本周区域事件</p>
                  <span class="text-[10px] text-accent">{{ getActiveRegionEvents(region.id).length }}/{{ getRegionWeeklyEventCapacity(region.id) }}</span>
                </div>
                <p v-if="getActiveRegionEvents(region.id).length === 0" class="text-[10px] text-muted mt-2 leading-4">
                  当前没有激活事件，通常会在周切换或同步焦点后刷新。
                </p>
                <div v-else class="space-y-2 mt-2">
                  <div
                    v-for="event in getActiveRegionEvents(region.id)"
                    :key="event.id"
                    class="border border-accent/10 rounded-xs px-3 py-2"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs text-accent">{{ event.name }}</p>
                        <p class="text-[10px] text-muted mt-0.5 leading-4">{{ event.description }}</p>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted">
                          <span>体力 {{ event.staminaCost }}</span>
                          <span>耗时 {{ event.timeCostHours }}h</span>
                          <span>资源 +{{ event.rewardAmount }}</span>
                        </div>
                        <p v-if="event.encounterHint" class="text-[10px] text-muted mt-1 leading-4">
                          - {{ event.encounterHint }}
                        </p>
                        <p v-if="event.handoffHint" class="text-[10px] text-accent/80 mt-1 leading-4">
                          -> {{ event.handoffHint }}
                        </p>
                      </div>
                      <span class="text-[10px] shrink-0 text-muted">本周 {{ event.weeklyCompletions }}/{{ event.maxWeeklyCompletions ?? 1 }}</span>
                    </div>

                    <div class="flex flex-wrap gap-2 mt-2">
                      <button
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                        :disabled="!canRunEvent(event.id)"
                        :title="getEventDisabledReason(event.id)"
                        @click="handleRunEvent(event.id)"
                      >
                        处理事件
                      </button>
                    </div>
                    <p v-if="getEventDisabledReason(event.id)" class="text-[10px] text-muted mt-2 leading-4">
                      {{ getEventDisabledReason(event.id) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div
                v-for="route in getRegionRoutes(region.id)"
                :key="route.id"
                class="border border-accent/10 rounded-xs px-3 py-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs text-accent">{{ route.name }}</p>
                    <p class="text-[10px] text-muted mt-0.5 leading-4">{{ route.description }}</p>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted">
                      <span>{{ getRouteTypeLabel(route.nodeType) }}</span>
                      <span>体力 {{ route.staminaCost }}</span>
                      <span>耗时 {{ route.timeCostHours }}h</span>
                    </div>
                    <p v-if="route.encounterHint" class="text-[10px] text-muted mt-1 leading-4">
                      - {{ route.encounterHint }}
                    </p>
                    <p v-if="route.handoffHint" class="text-[10px] text-accent/80 mt-1 leading-4">
                      -> {{ route.handoffHint }}
                    </p>
                  </div>
                  <span class="text-[10px] shrink-0 text-muted">{{ getRouteCompletionLabel(route.id) }}</span>
                </div>

                <div class="flex flex-wrap gap-2 mt-2">
                  <button
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                    :disabled="!canRunRoute(route.id)"
                    :title="getRouteDisabledReason(route.id)"
                    @click="handleRunRoute(route.id)"
                  >
                    巡行
                  </button>
                  <button
                    v-if="isDev"
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                    :disabled="!canRunRoute(route.id)"
                    :title="getRouteDisabledReason(route.id)"
                    @click="handleStartRoute(route.id)"
                  >
                    开始路线
                  </button>
                  <button
                    v-if="isDev"
                    class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
                    :disabled="!canCompleteRoute(route.id)"
                    :title="getCompleteRouteDisabledReason(route.id)"
                    @click="handleCompleteRoute(route.id)"
                  >
                    完成并结算
                  </button>
                </div>
                <p v-if="getRouteDisabledReason(route.id)" class="text-[10px] text-muted mt-2 leading-4">
                  {{ getRouteDisabledReason(route.id) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="regionMapStore.activeExpeditionSummary" class="border border-accent/20 rounded-xs p-3 mb-3">
        <p class="text-xs text-accent">当前远征</p>
        <p class="text-[10px] text-muted mt-1 leading-4">
          {{
            [
              regionMapStore.activeExpeditionSummary.region?.name,
              regionMapStore.activeExpeditionSummary.route?.name,
              regionMapStore.activeExpeditionSummary.boss?.name
            ].filter(Boolean).join(' / ') || '暂无详情'
          }}
        </p>
        <div class="flex justify-end mt-2">
          <button class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5" @click="regionMapStore.clearExpedition()">
            收束当前远征
          </button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3">
        <p class="text-xs text-muted mb-2">资源家族总览</p>
        <div class="space-y-2">
          <div v-for="entry in regionMapStore.resourceLedgerEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ entry.label }}</p>
                <p class="text-[10px] text-muted mt-0.5 leading-4">{{ entry.description }}</p>
              </div>
              <span class="text-xs shrink-0">{{ entry.quantity }}</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <button
                class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
                :disabled="entry.quantity <= 0 || !regionMapStore.resourceFeatureEnabled"
                @click="handlePublicResourceTurnIn(entry.id)"
              >
                交付 1 份
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="settlementDialog"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4"
        @click.self="settlementDialog = null"
      >
        <div class="w-full max-w-md border rounded-xs bg-bg p-4" :class="settlementToneClass">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ settlementDialog.title }}</p>
              <div class="mt-2 space-y-1">
                <p
                  v-for="line in settlementDialog.lines"
                  :key="`settlement-line-${line}`"
                  class="text-[11px] leading-5 text-muted"
                >
                  {{ line }}
                </p>
              </div>
            </div>
            <button class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-muted hover:bg-accent/5" @click="settlementDialog = null">
              关闭
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Map } from 'lucide-vue-next'
  import { navigateToPanel, type PanelKey } from '@/composables/useNavigation'
  import { getWeekCycleInfo } from '@/utils/weekCycle'
  import { useFishPondStore } from '@/stores/useFishPondStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useGuildStore } from '@/stores/useGuildStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useHanhaiStore } from '@/stores/useHanhaiStore'
  import { useMuseumStore } from '@/stores/useMuseumStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useRegionMapStore } from '@/stores/useRegionMapStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import type { RegionId, RegionLinkedSystem, RegionalResourceFamilyId } from '@/types/region'

  const fishPondStore = useFishPondStore()
  const gameStore = useGameStore()
  const guildStore = useGuildStore()
  const goalStore = useGoalStore()
  const hanhaiStore = useHanhaiStore()
  const museumStore = useMuseumStore()
  const playerStore = usePlayerStore()
  const regionMapStore = useRegionMapStore()
  const shopStore = useShopStore()
  const villageProjectStore = useVillageProjectStore()
  const lastActionSummary = ref('')
  const actionTone = ref<'success' | 'danger' | 'accent'>('success')
  const selectedRegionId = ref<RegionId | null>(regionMapStore.currentWeeklyFocus.focusedRegionId ?? null)
  const settlementDialog = ref<{ title: string; lines: string[]; tone: 'success' | 'danger' | 'accent' } | null>(null)
  const isDev = import.meta.env.DEV

  const currentDayTag = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)
  const currentWeekId = computed(() => getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId)

  const currentFocusLabel = computed(() => {
    const focusedId = regionMapStore.currentWeeklyFocus.focusedRegionId
    if (!focusedId) return '未设置'
    const match = regionMapStore.regionDefs.find(region => region.id === focusedId)
    return match?.name ?? '未设置'
  })

  const currentThemeWeekLabel = computed(() => goalStore.currentThemeWeek?.name ?? currentWeekId.value)
  const visibleRegionSummaries = computed(() =>
    selectedRegionId.value
      ? regionMapStore.regionSummaries.filter(region => region.id === selectedRegionId.value)
      : regionMapStore.regionSummaries
  )
  const lockedRegionUnlockGuides = computed(() =>
    regionMapStore.regionDefs.map(region => {
      const progress = regionMapStore.getRegionUnlockProgress(region.id)
      return {
        ...region,
        ready: progress.ready,
        summary: progress.summary
      }
    })
  )
  const actionToneClass = computed(() =>
    actionTone.value === 'danger'
      ? 'text-danger'
      : actionTone.value === 'accent'
        ? 'text-accent'
        : 'text-success'
  )
  const settlementToneClass = computed(() =>
    settlementDialog.value?.tone === 'danger'
      ? 'border-danger/30'
      : settlementDialog.value?.tone === 'accent'
        ? 'border-accent/30'
        : 'border-success/30'
  )

  const setActionSummary = (message: string, tone: 'success' | 'danger' | 'accent' = 'success') => {
    lastActionSummary.value = message
    actionTone.value = tone
  }

  const openSettlementDialog = (title: string, lines: string[], tone: 'success' | 'danger' | 'accent' = 'success') => {
    settlementDialog.value = {
      title,
      lines: lines.filter(Boolean),
      tone
    }
  }

  const ensureWeeklyEventRuntime = () => {
    regionMapStore.refreshUnlocksFromProgress(currentDayTag.value)
    regionMapStore.ensureWeeklyEventRuntime(currentWeekId.value, regionMapStore.currentWeeklyFocus.focusedRegionId, currentDayTag.value)
  }

  watch(
    [currentDayTag, currentWeekId, () => regionMapStore.currentWeeklyFocus.focusedRegionId],
    () => {
      ensureWeeklyEventRuntime()
    },
    { immediate: true }
  )

  watch(
    () => regionMapStore.currentWeeklyFocus.focusedRegionId,
    focusedRegionId => {
      if (focusedRegionId && selectedRegionId.value !== null) {
        selectedRegionId.value = focusedRegionId
      }
    }
  )

  const getUnlockSummary = (regionId: RegionId) => regionMapStore.getRegionUnlockProgress(regionId).summary

  const getRegionRoutes = (regionId: RegionId) => regionMapStore.routeDefs.filter(route => route.regionId === regionId)

  const getRouteCompletionLabel = (routeId: string) => {
    const state = regionMapStore.saveData.routeStates[routeId]
    return `完成 ${state?.completions ?? 0} 次`
  }

  const ROUTE_NODE_TYPE_LABEL_MAP = {
    route: '主路线',
    event: '区域事件',
    elite: '精英线',
    handoff: '承接线'
  } as const

  const getRouteTypeLabel = (nodeType: keyof typeof ROUTE_NODE_TYPE_LABEL_MAP) => ROUTE_NODE_TYPE_LABEL_MAP[nodeType] ?? '路线'

  const isRouteUnlocked = (routeId: string) => regionMapStore.getRouteUnlockStatus(routeId).unlocked

  const canRunRoute = (routeId: string) => regionMapStore.getRouteExpeditionStatus(routeId).available

  const canCompleteRoute = (routeId: string) =>
    regionMapStore.activeExpeditionSummary?.route?.id === routeId || canRunRoute(routeId)

  const getRouteDisabledReason = (routeId: string) => {
    const routeStatus = regionMapStore.getRouteExpeditionStatus(routeId)
    return routeStatus.available ? '' : routeStatus.reason
  }

  const getActiveRegionEvents = (regionId: RegionId) => regionMapStore.getActiveRegionEvents(regionId)

  const getRegionWeeklyEventCapacity = (regionId: RegionId) =>
    regionMapStore.currentWeeklyFocus.focusedRegionId === regionId ? 3 : 2

  const getCompleteRouteDisabledReason = (routeId: string) =>
    regionMapStore.activeExpeditionSummary?.route?.id === routeId ? '' : getRouteDisabledReason(routeId)

  const canRunEvent = (eventId: string) => regionMapStore.getEventAvailability(eventId).available

  const getEventDisabledReason = (eventId: string) => {
    const eventStatus = regionMapStore.getEventAvailability(eventId)
    return eventStatus.available ? '' : eventStatus.reason
  }

  const getBossPrepSummary = (regionId: RegionId) => {
    const boss = regionMapStore.bossDefs.find(entry => entry.regionId === regionId)
    if (!boss) {
      return {
        headline: '暂无首领配置',
        detailLines: []
      }
    }

    const routeCount = regionMapStore.getRegionCompletedRouteCount(regionId)
    const status = regionMapStore.getBossExpeditionStatus(regionId)
    const detailLines = [
      `路线门槛：已完成 ${routeCount} 条区域路线，达到 1 条即可开启首领挑战。`,
      `执行门槛：体力 ${boss.staminaCost} / 耗时 ${boss.timeCostHours}h。`,
      status.available ? '当前条件已满足，可直接挑战。' : `当前阻塞：${status.reason}`
    ]

    if (regionId === 'cloud_highland') {
      const projectNames = villageProjectStore
        .getLinkedProjectSummaries('guild')
        .filter(project => project.available || project.completed)
        .slice(0, 2)
        .map(project => project.name)
      detailLines.push(`公会战备：Lv.${guildStore.guildLevel} / ${guildStore.crossSystemOverview.currentRankBandLabel}。`)
      detailLines.push(
        projectNames.length > 0
          ? `建设承接：${projectNames.join('、')}。`
          : '建设承接：当前暂无可见的高地联动建设。'
      )
      detailLines.push(`当前体力：${playerStore.stamina} / 灵脉结晶 ${regionMapStore.getFamilyResourceQuantity('ley_crystal')}。`)
      return {
        headline: '公会 -> 村庄建设 -> 首领',
        detailLines
      }
    }

    return {
      headline: '路线 -> 首领',
      detailLines
    }
  }

  const LINKED_SYSTEM_PANEL_MAP: Record<RegionLinkedSystem, { key: PanelKey; label: string }> = {
    quest: { key: 'quest', label: '任务板' },
    shop: { key: 'shop', label: '商圈' },
    museum: { key: 'museum', label: '博物馆' },
    guild: { key: 'guild', label: '公会' },
    hanhai: { key: 'hanhai', label: '瀚海' },
    fishPond: { key: 'fishpond', label: '鱼塘' },
    villageProject: { key: 'village', label: '村庄' },
    wallet: { key: 'wallet', label: '钱包' }
  }

  const getLinkedPanels = (linkedSystems: RegionLinkedSystem[]) =>
    [...new Set(linkedSystems)]
      .map(system => LINKED_SYSTEM_PANEL_MAP[system])
      .filter(Boolean)

  const getRegionHandoffSummary = (regionId: RegionId) => {
    const regionSummary = regionMapStore.regionSummaries.find(region => region.id === regionId) ?? null
    const unlockedRouteCount = getRegionRoutes(regionId).filter(route => isRouteUnlocked(route.id)).length

    if (!regionSummary?.unlocked) {
      return {
        headline: '先推进解锁',
        detailLines: [`当前解锁条件：${getUnlockSummary(regionId)}`]
      }
    }

    if (regionId === 'ancient_road') {
      const detailLines = [
        `荒道节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('ancient_road')}/${unlockedRouteCount} 条，可继续补护送线和残卷线。`,
        goalStore.currentEventCampaign ? `活动承接：${goalStore.currentEventCampaign.label}` : '',
        hanhaiStore.crossSystemOverview.featuredCaravanContracts.length > 0
          ? `瀚海合同：${hanhaiStore.crossSystemOverview.featuredCaravanContracts.slice(0, 2).map(contract => contract.label).join('、')}`
          : '',
        hanhaiStore.crossSystemOverview.activeBossCycle
          ? `瀚海焦点首领：${hanhaiStore.crossSystemOverview.activeBossCycle.label}`
          : '',
        shopStore.activityCampaignOfferRecommendations.length > 0
          ? `商圈补给：${shopStore.activityCampaignOfferRecommendations.slice(0, 2).map(offer => offer.name).join('、')}`
          : shopStore.recommendedCatalogOffers.length > 0
            ? `商圈推荐：${shopStore.recommendedCatalogOffers.slice(0, 2).map(offer => offer.name).join('、')}`
            : '',
        regionMapStore.getFamilyResourceQuantity('ancient_archive') > 0
          ? `当前已持有古迹残卷 ${regionMapStore.getFamilyResourceQuantity('ancient_archive')} 份，可先回任务板、商圈或瀚海消化。`
          : ''
      ].filter(Boolean)

      return {
        headline: '任务板 -> 商圈 -> 瀚海',
        detailLines
      }
    }

    if (regionId === 'mirage_marsh') {
      const detailLines = [
        `泽地节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('mirage_marsh')}/${unlockedRouteCount} 条，可继续补夜游、样本和异常线。`,
        fishPondStore.currentPondContestDef ? `鱼塘周赛：${fishPondStore.currentPondContestDef.label}` : '',
        fishPondStore.displayOverview.entryCount > 0
          ? `展示池：已摆入 ${fishPondStore.displayOverview.entryCount} 条高光样本，总观赏值 ${fishPondStore.displayOverview.totalShowValue}`
          : '',
        museumStore.availableScholarCommissionCount > 0
          ? `馆务委托：当前可承接 ${museumStore.availableScholarCommissionCount} 条学者委托`
          : '',
        museumStore.featuredScholarCommissionOverview.length > 0
          ? `重点馆务：${museumStore.featuredScholarCommissionOverview.slice(0, 2).map(commission => commission.title).join('、')}`
          : '',
        goalStore.currentEventCampaign ? `邮件/活动承接：${goalStore.currentEventCampaign.label}` : '',
        regionMapStore.getFamilyResourceQuantity('ecology_specimen') > 0
          ? `当前生态样本库存 ${regionMapStore.getFamilyResourceQuantity('ecology_specimen')} 份，可优先转成鱼塘展示或馆务委托。`
          : ''
      ].filter(Boolean)

      return {
        headline: '鱼塘 -> 博物馆 -> 邮箱',
        detailLines
      }
    }

    const highlandProjectNames = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter(project => project.available || project.completed)
      .slice(0, 2)
      .map(project => project.name)
    const detailLines = [
      goalStore.currentThemeWeek?.name ? `主题周承接：${goalStore.currentThemeWeek.name}` : '',
      `高地节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('cloud_highland')}/${unlockedRouteCount} 条。`,
      `公会战备：Lv.${guildStore.guildLevel} / ${guildStore.crossSystemOverview.currentRankBandLabel}。`,
      highlandProjectNames.length > 0 ? `建设前置：${highlandProjectNames.join('、')}` : '',
      regionMapStore.getFamilyResourceQuantity('ley_crystal') > 0
        ? `灵脉结晶：当前库存 ${regionMapStore.getFamilyResourceQuantity('ley_crystal')}，可继续接公会、建设与高阶准备。`
        : ''
    ].filter(Boolean)
    return {
      headline: '公会 -> 村庄 -> 钱包',
      detailLines
    }
  }

  const handleNavigate = (panelKey: PanelKey) => {
    navigateToPanel(panelKey)
  }

  const handleUnlockRegion = (regionId: RegionId) => {
    regionMapStore.unlockRegion(regionId, currentDayTag.value)
    setActionSummary(`已解锁 ${regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? regionId}。`)
  }

  const handleFocusRegion = (regionId: RegionId) => {
    const highlightedRouteIds = getRegionRoutes(regionId).map(route => route.id).slice(0, 2)
    regionMapStore.setWeeklyFocus(currentWeekId.value, regionId, highlightedRouteIds)
    regionMapStore.refreshWeeklyEventRuntime(currentWeekId.value, regionId, currentDayTag.value)
    selectedRegionId.value = regionId
    setActionSummary(`本周区域焦点已切到 ${regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? regionId}。`, 'accent')
  }

  const handleStartRoute = (routeId: string) => {
    const ok = regionMapStore.beginRoute(routeId, currentDayTag.value)
    setActionSummary(
      ok ? `已开始路线：${getRegionRoutes(regionMapStore.saveData.expedition.activeRegionId ?? 'ancient_road').find(route => route.id === routeId)?.name ?? routeId}。` : '当前路线未解锁，无法开始。',
      ok ? 'accent' : 'danger'
    )
  }

  const handleRunRoute = (routeId: string) => {
    const result = regionMapStore.runRouteExpedition(routeId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    openSettlementDialog(result.success ? '路线结算' : '路线未完成', [result.message], result.success ? 'success' : 'danger')
  }

  const handleRunEvent = (eventId: string) => {
    const result = regionMapStore.runRegionEvent(eventId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    openSettlementDialog(result.success ? '区域事件结算' : '区域事件未完成', [result.message], result.success ? 'success' : 'danger')
  }

  const handleCompleteRoute = (routeId: string) => {
    const isActiveRoute = regionMapStore.activeExpeditionSummary?.route?.id === routeId
    if (!isActiveRoute) {
      const status = regionMapStore.getRouteExpeditionStatus(routeId)
      if (!status.available) {
        setActionSummary(status.reason, 'danger')
        return
      }
    }
    const result = regionMapStore.completeRouteAndGrantRewards(routeId, currentDayTag.value)
    if (isActiveRoute && result) {
      regionMapStore.clearExpedition()
    }
    setActionSummary(
      result
        ? `路线已结算：获得 ${result.rewardAmount} 点家族进度${result.rewardItems.length > 0 ? `，并发放 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''}。`
        : '当前路线未解锁，无法结算。',
      result ? 'success' : 'danger'
    )
    openSettlementDialog(
      result ? '路线结算' : '路线未完成',
      result
        ? [
            `区域资源 +${result.rewardAmount}`,
            result.rewardItems.length > 0 ? `物品奖励：${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''
          ]
        : ['当前路线未解锁，无法结算。'],
      result ? 'success' : 'danger'
    )
  }

  const handleBossClear = (regionId: RegionId) => {
    const status = regionMapStore.getBossExpeditionStatus(regionId)
    if (!status.available) {
      setActionSummary(status.reason, 'danger')
      return
    }
    const result = regionMapStore.clearBossAndGrantRewards(regionId, currentDayTag.value)
    setActionSummary(
      result
        ? `首领已记录：获得 ${result.rewardAmount} 点家族进度${result.rewardItems.length > 0 ? `，并发放 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''}。`
        : '当前区域未解锁，无法记录首领结果。',
      result ? 'success' : 'danger'
    )
    openSettlementDialog(
      result ? '首领结算' : '首领未完成',
      result
        ? [
            `区域资源 +${result.rewardAmount}`,
            result.rewardItems.length > 0 ? `物品奖励：${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''
          ]
        : ['当前区域未解锁，无法记录首领结果。'],
      result ? 'success' : 'danger'
    )
  }

  const canChallengeBoss = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.available ?? false

  const getBossDisabledReason = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.disabledReason ?? ''

  const handleRunBoss = (regionId: RegionId) => {
    const result = regionMapStore.runBossExpedition(regionId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    openSettlementDialog(result.success ? '首领结算' : '首领回退', [result.message], result.success ? 'success' : 'danger')
  }

  const handleRefreshUnlocks = () => {
    const unlocked = regionMapStore.refreshUnlocksFromProgress(currentDayTag.value)
    setActionSummary(unlocked.length > 0 ? `按现有进度自动解锁：${unlocked.join('、')}。` : '当前没有新增区域被自动解锁。', unlocked.length > 0 ? 'success' : 'accent')
  }

  const handleSyncWeeklyFocus = () => {
    const focusedId = regionMapStore.currentWeeklyFocus.focusedRegionId ?? 'ancient_road'
    const highlightedRouteIds = getRegionRoutes(focusedId).map(route => route.id).slice(0, 2)
    regionMapStore.setWeeklyFocus(currentWeekId.value, focusedId, highlightedRouteIds)
    regionMapStore.refreshWeeklyEventRuntime(currentWeekId.value, focusedId, currentDayTag.value)
    selectedRegionId.value = focusedId
    setActionSummary(`已同步本周焦点为 ${regionMapStore.regionDefs.find(region => region.id === focusedId)?.name ?? focusedId}。`, 'accent')
  }

  const handleResourceTurnIn = () => {
    const focusedRegionId = regionMapStore.currentWeeklyFocus.focusedRegionId ?? 'ancient_road'
    const route = getRegionRoutes(focusedRegionId)[0]
    const familyId = route?.primaryResourceFamilyId ?? 'ancient_archive'
    const ok = regionMapStore.recordResourceTurnIn(familyId, 1)
    setActionSummary(ok ? `已交付 1 份${regionMapStore.resourceFamilyDefs.find(family => family.id === familyId)?.label ?? familyId}。` : '交付失败：当前资源不足。', ok ? 'success' : 'danger')
  }

  const handlePublicResourceTurnIn = (familyId: RegionalResourceFamilyId) => {
    const ok = regionMapStore.recordResourceTurnIn(familyId, 1)
    setActionSummary(
      ok
        ? `已交付 1 份${regionMapStore.resourceFamilyDefs.find(family => family.id === familyId)?.label ?? familyId}。`
        : '交付失败：当前资源不足。',
      ok ? 'success' : 'danger'
    )
  }
</script>
