<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Map :size="14" />
        <span>行旅图</span>
      </div>
      <span class="text-xs" :class="regionMapStore.featureEnabled ? 'text-success' : 'text-muted'">
        {{ regionMapStore.featureEnabled ? '已接线' : '未开启' }}
      </span>
    </div>

    <div v-if="!regionMapStore.featureEnabled" class="border border-accent/20 rounded-xs p-3 mb-3">
      <p class="text-sm text-muted">行旅图功能当前处于关闭状态。</p>
      <p class="text-xs text-muted mt-1 leading-5">
        Day 1 已完成入口、状态和存档骨架接线。开启 `lateGameRegionMap` 后，这里会作为区域总入口承接后续区域路线与远征内容。
      </p>
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
        <p v-if="lastActionSummary" class="text-[10px] text-success mt-2 leading-4">{{ lastActionSummary }}</p>
      </div>

      <div class="space-y-2 mb-3">
        <div v-for="region in regionMapStore.regionSummaries" :key="region.id" class="border border-accent/20 rounded-xs p-3">
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
                @click="handleRunBoss(region.id)"
              >
                挑战首领
              </button>
              <button
                v-if="isDev"
                class="border border-danger/20 rounded-xs px-2 py-1 text-[10px] text-danger hover:bg-danger/5"
                :disabled="!region.unlocked"
                @click="handleBossClear(region.id)"
              >
                首领清关
              </button>
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
                  </div>
                  <span class="text-[10px] shrink-0 text-muted">{{ getRouteCompletionLabel(route.id) }}</span>
                </div>

                <div class="flex flex-wrap gap-2 mt-2">
                  <button
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                    :disabled="!region.unlocked"
                    @click="handleRunRoute(route.id)"
                  >
                    巡行
                  </button>
                  <button
                    v-if="isDev"
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                    :disabled="!region.unlocked"
                    @click="handleStartRoute(route.id)"
                  >
                    开始路线
                  </button>
                  <button
                    v-if="isDev"
                    class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
                    :disabled="!region.unlocked"
                    @click="handleCompleteRoute(route.id)"
                  >
                    完成并结算
                  </button>
                </div>
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
        <div v-if="isDev" class="flex justify-end mt-2">
          <button class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5" @click="regionMapStore.clearExpedition()">
            清空远征状态
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
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Map } from 'lucide-vue-next'
  import { navigateToPanel, type PanelKey } from '@/composables/useNavigation'
  import { getWeekCycleInfo } from '@/utils/weekCycle'
  import { useGameStore } from '@/stores/useGameStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useRegionMapStore } from '@/stores/useRegionMapStore'
  import type { RegionId, RegionLinkedSystem, RegionalResourceFamilyId } from '@/types/region'

  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const regionMapStore = useRegionMapStore()
  const lastActionSummary = ref('')
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

  const getUnlockSummary = (regionId: RegionId) => regionMapStore.getRegionUnlockProgress(regionId).summary

  const getRegionRoutes = (regionId: RegionId) => regionMapStore.routeDefs.filter(route => route.regionId === regionId)

  const getRouteCompletionLabel = (routeId: string) => {
    const state = regionMapStore.saveData.routeStates[routeId]
    return `完成 ${state?.completions ?? 0} 次`
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

  const handleNavigate = (panelKey: PanelKey) => {
    navigateToPanel(panelKey)
  }

  const handleUnlockRegion = (regionId: RegionId) => {
    regionMapStore.unlockRegion(regionId, currentDayTag.value)
    lastActionSummary.value = `已解锁 ${regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? regionId}。`
  }

  const handleFocusRegion = (regionId: RegionId) => {
    const highlightedRouteIds = getRegionRoutes(regionId).map(route => route.id).slice(0, 2)
    regionMapStore.setWeeklyFocus(currentWeekId.value, regionId, highlightedRouteIds)
    lastActionSummary.value = `本周区域焦点已切到 ${regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? regionId}。`
  }

  const handleStartRoute = (routeId: string) => {
    const ok = regionMapStore.beginRoute(routeId, currentDayTag.value)
    lastActionSummary.value = ok ? `已开始路线：${getRegionRoutes(regionMapStore.saveData.expedition.activeRegionId ?? 'ancient_road').find(route => route.id === routeId)?.name ?? routeId}。` : '当前路线未解锁，无法开始。'
  }

  const handleRunRoute = (routeId: string) => {
    const result = regionMapStore.runRouteExpedition(routeId, currentDayTag.value)
    lastActionSummary.value = result.message
  }

  const handleCompleteRoute = (routeId: string) => {
    const result = regionMapStore.completeRouteAndGrantRewards(routeId, currentDayTag.value)
    lastActionSummary.value = result
      ? `路线已结算：获得 ${result.rewardAmount} 点家族进度${result.rewardItems.length > 0 ? `，并发放 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''}。`
      : '当前路线未解锁，无法结算。'
  }

  const handleBossClear = (regionId: RegionId) => {
    const result = regionMapStore.clearBossAndGrantRewards(regionId)
    lastActionSummary.value = result
      ? `首领已记录：获得 ${result.rewardAmount} 点家族进度${result.rewardItems.length > 0 ? `，并发放 ${result.rewardItems.map(item => `${item.itemId}×${item.quantity}`).join('、')}` : ''}。`
      : '当前区域未解锁，或远征首领子开关未开启。'
  }

  const canChallengeBoss = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.available ?? false

  const handleRunBoss = (regionId: RegionId) => {
    const result = regionMapStore.runBossExpedition(regionId)
    lastActionSummary.value = result.message
  }

  const handleRefreshUnlocks = () => {
    const unlocked = regionMapStore.refreshUnlocksFromProgress(currentDayTag.value)
    lastActionSummary.value = unlocked.length > 0 ? `按现有进度自动解锁：${unlocked.join('、')}。` : '当前没有新增区域被自动解锁。'
  }

  const handleSyncWeeklyFocus = () => {
    const focusedId = regionMapStore.currentWeeklyFocus.focusedRegionId ?? 'ancient_road'
    const highlightedRouteIds = getRegionRoutes(focusedId).map(route => route.id).slice(0, 2)
    regionMapStore.setWeeklyFocus(currentWeekId.value, focusedId, highlightedRouteIds)
    lastActionSummary.value = `已同步本周焦点为 ${regionMapStore.regionDefs.find(region => region.id === focusedId)?.name ?? focusedId}。`
  }

  const handleResourceTurnIn = () => {
    const focusedRegionId = regionMapStore.currentWeeklyFocus.focusedRegionId ?? 'ancient_road'
    const route = getRegionRoutes(focusedRegionId)[0]
    const familyId = route?.primaryResourceFamilyId ?? 'ancient_archive'
    const ok = regionMapStore.recordResourceTurnIn(familyId, 1)
    lastActionSummary.value = ok ? `已交付 1 份${regionMapStore.resourceFamilyDefs.find(family => family.id === familyId)?.label ?? familyId}。` : '交付失败：当前资源不足，或区域资源子开关未开启。'
  }

  const handlePublicResourceTurnIn = (familyId: RegionalResourceFamilyId) => {
    const ok = regionMapStore.recordResourceTurnIn(familyId, 1)
    lastActionSummary.value = ok
      ? `已交付 1 份${regionMapStore.resourceFamilyDefs.find(family => family.id === familyId)?.label ?? familyId}。`
      : '交付失败：当前资源不足，或区域资源子开关未开启。'
  }
</script>
