<template>
  <Transition name="panel-fade">
    <div v-if="props.open" class="game-modal-overlay fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3" @click.self="$emit('close')">
      <div
        class="map-container game-panel w-full max-w-sm md:max-w-150 max-h-[85vh] overflow-y-auto relative"
        :style="{ '--mobile-map-tile-scale': mobileMapTileScaleCss }"
        data-testid="mobile-map-menu"
      >
        <button
          class="absolute top-4 right-4 px-2 py-1 text-xs transition-colors hover:border-accent/60 hover:bg-panel/80 text-muted border border-accent/20"
          @click="$emit('close')"
        >
          <X :size="14" />
        </button>
        <p class="text-accent text-sm text-center mb-3 tracking-widest">桃源乡地图</p>

        <div v-if="primaryQuickEntry" class="map-area mb-3">
          <p class="map-area-title">当前推荐</p>
          <div class="quick-entry-stack">
            <button
              class="quick-entry-btn"
              :class="{ 'quick-entry-active': props.current === primaryQuickEntry.key }"
              data-testid="mobile-map-menu-primary-entry"
              @click="goQuickEntry(primaryQuickEntry)"
            >
              <div class="min-w-0">
                <p class="quick-entry-title">{{ primaryQuickEntry.title }}</p>
                <p class="quick-entry-summary">{{ primaryQuickEntry.summary }}</p>
              </div>
              <span class="quick-entry-tag">{{ primaryQuickEntry.tag }}</span>
            </button>
          </div>
          <div v-if="secondaryQuickEntries.length > 0" class="quick-link-row">
            <button
              v-for="entry in secondaryQuickEntries"
              :key="`quick-link-${entry.key}-${entry.title}`"
              class="quick-link-chip"
              :data-testid="`mobile-map-quick-link-${entry.key}`"
              @click="goQuickEntry(entry)"
            >
              <span class="quick-link-chip-title">{{ entry.title }}</span>
              <span class="quick-link-chip-tag">{{ entry.tag }}</span>
            </button>
          </div>
        </div>

        <div class="map-area mb-3">
          <p class="map-area-title">常用工具</p>
          <div class="tool-entry-grid">
            <button class="tool-entry-btn" @click="go('mail')">
              <span class="tool-entry-icon-shell">
                <Mail :size="mobileMapToolIconSize" />
              </span>
              <span class="tool-entry-copy">
                <span class="tool-entry-title">邮箱</span>
                <span class="tool-entry-meta">{{ mailboxStore.unreadCount > 0 ? `${mailboxStore.unreadCount > 99 ? '99+' : mailboxStore.unreadCount} 未读` : '查看奖励与消息' }}</span>
              </span>
            </button>
            <button class="tool-entry-btn" @click="$emit('open-log')">
              <span class="tool-entry-icon-shell">
                <ScrollText :size="mobileMapToolIconSize" />
              </span>
              <span class="tool-entry-copy">
                <span class="tool-entry-title">日志</span>
                <span class="tool-entry-meta">回看最近记录</span>
              </span>
            </button>
            <button v-if="props.hasVoidChest" class="tool-entry-btn" @click="$emit('open-void')">
              <span class="tool-entry-icon-shell">
                <Package :size="mobileMapToolIconSize" />
              </span>
              <span class="tool-entry-copy">
                <span class="tool-entry-title">虚空箱</span>
                <span class="tool-entry-meta">远程存取库存</span>
              </span>
            </button>
            <button class="tool-entry-btn" data-testid="mobile-map-menu-open-settings" @click="$emit('open-settings')">
              <span class="tool-entry-icon-shell">
                <Settings :size="mobileMapToolIconSize" />
              </span>
              <span class="tool-entry-copy">
                <span class="tool-entry-title">设置</span>
                <span class="tool-entry-meta">音量、存档与选项</span>
              </span>
            </button>
          </div>
        </div>

        <!-- 田庄 -->
        <div class="map-area">
          <p class="map-area-title">田庄</p>
          <div class="map-area-grid">
            <button
              v-for="t in farmGroup"
              :key="t.key"
              class="map-loc"
              :class="{ 'map-loc-active': props.current === t.key }"
              :data-testid="`mobile-map-loc-${t.key}`"
              @click="go(t.key)"
            >
              <component :is="t.getIcon ? t.getIcon() : t.icon" :size="mobileMapLocIconSize" />
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <div class="map-path">···</div>

        <!-- 野外 -->
        <div class="flex space-x-2">
          <div class="map-area flex-1">
            <p class="map-area-title">村落</p>
            <div class="map-area-grid">
              <button
                v-for="t in villageGroup"
                :key="t.key"
                class="map-loc"
                :class="{ 'map-loc-active': props.current === t.key }"
                :data-testid="`mobile-map-loc-${t.key}`"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="mobileMapLocIconSize" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>
          <div class="map-area flex-1">
            <p class="map-area-title">野外</p>
            <div class="map-area-grid">
              <button
                v-for="t in wildGroup"
                :key="t.key"
                class="map-loc"
                :class="{ 'map-loc-active': props.current === t.key }"
                :data-testid="`mobile-map-loc-${t.key}`"
                @click="go(t.key)"
              >
                <component :is="t.getIcon ? t.getIcon() : t.icon" :size="mobileMapLocIconSize" />
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="map-path">···</div>

        <!-- 工坊 -->
        <div class="map-area">
          <p class="map-area-title">工坊</p>
          <div class="map-area-grid">
            <button
              v-for="t in craftGroup"
              :key="t.key"
              class="map-loc"
              :class="{ 'map-loc-active': props.current === t.key }"
              :data-testid="`mobile-map-loc-${t.key}`"
              @click="go(t.key)"
            >
              <component :is="t.getIcon ? t.getIcon() : t.icon" :size="mobileMapLocIconSize" />
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <div class="map-path">···</div>

        <!-- 随身 -->
        <div class="map-area">
          <p class="map-area-title">随身</p>
          <div class="map-area-grid">
            <button
              v-for="t in personalGroup"
              :key="t.key"
              class="map-loc"
              :class="{ 'map-loc-active': props.current === t.key }"
              :data-testid="`mobile-map-loc-${t.key}`"
              @click="go(t.key)"
            >
              <component :is="t.getIcon ? t.getIcon() : t.icon" :size="mobileMapLocIconSize" />
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Mail, Package, ScrollText, Settings, X } from 'lucide-vue-next'
  import { TABS, navigateToPanel } from '@/composables/useNavigation'
  import type { PanelKey } from '@/composables/useNavigation'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useRegionMapStore } from '@/stores/useRegionMapStore'
  import { MAX_FONT_SIZE, MIN_FONT_SIZE, useSettingsStore } from '@/stores/useSettingsStore'

  const props = defineProps<{ open: boolean; current: string; hasVoidChest?: boolean }>()
  const emit = defineEmits<{ close: []; 'open-settings': []; 'open-log': []; 'open-void': [] }>()
  const goalStore = useGoalStore()
  const mailboxStore = useMailboxStore()
  const regionMapStore = useRegionMapStore()
  const settingsStore = useSettingsStore()
  const MOBILE_MAP_SCALE_BASELINE = 16
  const MOBILE_MAP_MIN_SCALE = MIN_FONT_SIZE / MOBILE_MAP_SCALE_BASELINE
  const MOBILE_MAP_MAX_SCALE = MAX_FONT_SIZE / MOBILE_MAP_SCALE_BASELINE

  type QuickEntry = {
    key: PanelKey
    title: string
    summary: string
    tag: string
    entryId?: string
  }

  const tabMap = computed(() => {
    const m = new Map<string, (typeof TABS)[number]>()
    for (const t of TABS) m.set(t.key, t)
    return m
  })

  const pick = (keys: PanelKey[]) => keys.map(k => tabMap.value.get(k)!).filter(Boolean)
  const preferredAftermathPanelByRegion: Record<string, PanelKey> = {
    ancient_road: 'quest',
    mirage_marsh: 'fishpond',
    cloud_highland: 'guild'
  }
  const routeLabelToPanelKey = (label: string): PanelKey | null => {
    const normalized = label.trim().toLowerCase()
    const map: Record<string, PanelKey> = {
      topgoals: 'quest',
      top_goals: 'quest',
      '任务': 'quest',
      quest: 'quest',
      '邮箱': 'mail',
      mail: 'mail',
      '商店': 'shop',
      '商圈': 'shop',
      shop: 'shop',
      '鱼塘': 'fishpond',
      fishpond: 'fishpond',
      '博物馆': 'museum',
      museum: 'museum',
      '公会': 'guild',
      guild: 'guild',
      '瀚海': 'hanhai',
      hanhai: 'hanhai',
      '行旅图': 'region-map',
      'region-map': 'region-map',
      regionmap: 'region-map',
      '村庄': 'village',
      village: 'village',
      '育种': 'breeding',
      breeding: 'breeding'
    }
    return map[normalized] ?? null
  }

  const quickEntries = computed<QuickEntry[]>(() => {
    const entries: QuickEntry[] = []
    const seen = new Set<PanelKey>()
    const pushEntry = (entry: QuickEntry | null) => {
      if (!entry || seen.has(entry.key)) return
      entries.push(entry)
      seen.add(entry.key)
    }

    if (regionMapStore.hasActiveExpedition) {
      pushEntry({
        key: 'region-map',
        title: '继续远征',
        summary: '当前还有一趟进行中的远征待继续。',
        tag: '进行中'
      })
    }

    const latestJourney = regionMapStore.journeyHistory[0] ?? null
    if (latestJourney) {
      const latestRegionName = regionMapStore.regionDefs.find(region => region.id === latestJourney.regionId)?.name ?? '行旅图'
      const preferredAftermathPanel = preferredAftermathPanelByRegion[latestJourney.regionId] ?? 'region-map'
      const preferredAftermathLabel = tabMap.value.get(preferredAftermathPanel)?.label ?? '行旅图'
      const alreadyProcessed = preferredAftermathPanel !== 'region-map' && regionMapStore.isJourneyActionProcessed(latestJourney.id, preferredAftermathPanel)
      if (!alreadyProcessed) {
      pushEntry({
        key: preferredAftermathPanel,
        title: `回城先去${preferredAftermathLabel}`,
        summary: `最近刚从${latestRegionName}回城，先把这趟回城后续处理完。`,
        tag: '回城',
        entryId: latestJourney.id
      })
      }
    }

    if (goalStore.weeklyPlanSnapshot.claimableNodeLabels.length > 0) {
      pushEntry({
        key: 'quest',
        title: '先领可领奖点',
        summary: `当前有 ${goalStore.weeklyPlanSnapshot.claimableNodeLabels.length} 处可领奖或可收尾节点。`,
        tag: '可领取'
      })
    }

    if (mailboxStore.unreadCount > 0) {
      pushEntry({
        key: 'mail',
        title: '查看邮箱',
        summary: '奖励、系统消息或活动信件还没处理完。',
        tag: '未读'
      })
    }

    const primaryRouteKey = goalStore.weeklyPlanSnapshot.primaryRouteLabel
      ? routeLabelToPanelKey(goalStore.weeklyPlanSnapshot.primaryRouteLabel)
      : null
    if (primaryRouteKey && primaryRouteKey !== 'quest') {
      pushEntry({
        key: primaryRouteKey,
        title: `本周主线：${goalStore.weeklyPlanSnapshot.primaryRouteLabel}`,
        summary: '这是本周最推荐继续推进的系统入口。',
        tag: '主线'
      })
    }

    if (regionMapStore.currentWeeklyFocus.focusedRegionId) {
      const focusedRegion = regionMapStore.regionDefs.find(region => region.id === regionMapStore.currentWeeklyFocus.focusedRegionId)
      pushEntry({
        key: 'region-map',
        title: focusedRegion ? `本周焦点：${focusedRegion.name}` : '查看本周焦点',
        summary: focusedRegion ? `先回${focusedRegion.name}继续规划下一趟远征。` : '先回行旅图继续规划下一趟远征。',
        tag: '焦点'
      })
    }

    const nonCurrentEntries = entries.filter(entry => entry.key !== props.current)
    return (nonCurrentEntries.length > 0 ? nonCurrentEntries : entries).slice(0, 3)
  })
  const primaryQuickEntry = computed(() => quickEntries.value[0] ?? null)
  const secondaryQuickEntries = computed(() => quickEntries.value.slice(1))
  const mobileMapTileScale = computed(() => {
    const scale = settingsStore.fontSize / MOBILE_MAP_SCALE_BASELINE
    return Math.min(MOBILE_MAP_MAX_SCALE, Math.max(MOBILE_MAP_MIN_SCALE, scale))
  })
  const mobileMapTileScaleCss = computed(() => mobileMapTileScale.value.toFixed(3))
  const mobileMapLocIconSize = computed(() => Number((18 * mobileMapTileScale.value).toFixed(2)))
  const mobileMapToolIconSize = computed(() => Number((16 * mobileMapTileScale.value).toFixed(2)))

  const farmGroup = computed(() => pick(['farm', 'animal', 'cottage', 'home', 'breeding', 'fishpond', 'decoration']))
  const villageGroup = computed(() => pick(['village', 'shop', 'museum', 'guild']))
  const wildGroup = computed(() => pick(['forage', 'fishing', 'mining', 'hanhai', 'region-map']))
  const craftGroup = computed(() => pick(['cooking', 'workshop', 'upgrade']))
  const personalGroup = computed(() => pick(['charinfo', 'inventory', 'skills', 'achievement', 'wallet', 'quest', 'mail', 'glossary']))

  const go = (key: PanelKey) => {
    navigateToPanel(key)
    emit('close')
  }
  const goQuickEntry = (entry: QuickEntry) => {
    if (entry.entryId) {
      regionMapStore.markJourneyActionProcessed(entry.entryId, entry.key)
    }
    go(entry.key)
  }
</script>

<style scoped>
  .game-modal-overlay > .map-container.game-panel.max-w-sm {
    width: min(100%, 384px);
  }

  @media (min-width: 768px) {
    .game-modal-overlay > .map-container.game-panel.max-w-sm {
      width: min(100%, 600px);
    }
  }

  /* 地图菜单 */
  .map-area {
    border: 1px dashed rgba(200, 164, 92, 0.3);
    border-radius: 2px;
    padding: calc(8px * var(--mobile-map-tile-scale, 1));
  }

  .map-area-title {
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    color: var(--color-muted);
    margin-bottom: calc(6px * var(--mobile-map-tile-scale, 1));
    letter-spacing: 0.1em;
    text-align: center;
  }

  .map-area-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: calc(6px * var(--mobile-map-tile-scale, 1));
  }

  .map-loc {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(4px * var(--mobile-map-tile-scale, 1));
    margin: calc(2px * var(--mobile-map-tile-scale, 1));
    padding: calc(6px * var(--mobile-map-tile-scale, 1)) calc(8px * var(--mobile-map-tile-scale, 1));
    min-width: calc(52px * var(--mobile-map-tile-scale, 1));
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.3;
    color: rgb(var(--color-text));
    background: rgb(var(--color-bg));
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .map-loc:hover,
  .map-loc:active {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .map-loc-active {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .map-path {
    text-align: center;
    color: rgba(200, 164, 92, 0.3);
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1;
    padding: calc(4px * var(--mobile-map-tile-scale, 1)) 0;
    letter-spacing: 0.3em;
  }

  .quick-entry-stack {
    display: grid;
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
    margin-top: calc(8px * var(--mobile-map-tile-scale, 1));
  }

  .quick-entry-btn {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: calc(10px * var(--mobile-map-tile-scale, 1));
    width: 100%;
    text-align: left;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    padding: calc(8px * var(--mobile-map-tile-scale, 1)) calc(10px * var(--mobile-map-tile-scale, 1));
    background: rgb(var(--color-bg));
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .quick-entry-btn:hover,
  .quick-entry-btn:active,
  .quick-entry-active {
    background: rgba(200, 164, 92, 0.12);
    border-color: rgba(200, 164, 92, 0.5);
  }

  .quick-entry-title {
    font-size: calc(12px * var(--mobile-map-tile-scale, 1));
    color: var(--color-accent);
    line-height: 1.35;
  }

  .quick-entry-summary {
    margin-top: calc(4px * var(--mobile-map-tile-scale, 1));
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.5;
    color: var(--color-muted);
  }

  .quick-entry-tag {
    flex-shrink: 0;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    padding: calc(2px * var(--mobile-map-tile-scale, 1)) calc(6px * var(--mobile-map-tile-scale, 1));
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    color: var(--color-accent);
    background: rgba(200, 164, 92, 0.08);
  }

  .tool-entry-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
    margin-top: calc(8px * var(--mobile-map-tile-scale, 1));
  }

  .quick-link-row {
    display: flex;
    flex-wrap: wrap;
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
    margin-top: calc(8px * var(--mobile-map-tile-scale, 1));
  }

  .quick-link-chip {
    display: flex;
    align-items: center;
    gap: calc(6px * var(--mobile-map-tile-scale, 1));
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    padding: calc(6px * var(--mobile-map-tile-scale, 1)) calc(8px * var(--mobile-map-tile-scale, 1));
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.35;
    color: var(--color-muted);
    background: rgba(200, 164, 92, 0.06);
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .quick-link-chip:hover,
  .quick-link-chip:active {
    background: rgba(200, 164, 92, 0.12);
    border-color: rgba(200, 164, 92, 0.4);
    color: rgb(var(--color-text));
  }

  .quick-link-chip-title {
    color: rgb(var(--color-text));
  }

  .quick-link-chip-tag {
    color: var(--color-accent);
  }

  .tool-entry-btn {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
    gap: calc(8px * var(--mobile-map-tile-scale, 1));
    min-height: calc(56px * var(--mobile-map-tile-scale, 1));
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    padding: calc(8px * var(--mobile-map-tile-scale, 1)) calc(10px * var(--mobile-map-tile-scale, 1));
    text-align: left;
    background: rgb(var(--color-bg));
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .tool-entry-icon-shell {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(24px * var(--mobile-map-tile-scale, 1));
    height: calc(24px * var(--mobile-map-tile-scale, 1));
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    background: rgba(200, 164, 92, 0.08);
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .tool-entry-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: calc(4px * var(--mobile-map-tile-scale, 1));
    min-width: 0;
  }

  .tool-entry-btn:hover,
  .tool-entry-btn:active {
    background: rgba(200, 164, 92, 0.12);
    border-color: rgba(200, 164, 92, 0.5);
  }

  .tool-entry-btn:hover .tool-entry-icon-shell,
  .tool-entry-btn:active .tool-entry-icon-shell {
    border-color: rgba(200, 164, 92, 0.45);
    background: rgba(200, 164, 92, 0.14);
  }

  .tool-entry-title {
    font-size: calc(12px * var(--mobile-map-tile-scale, 1));
    color: var(--color-accent);
  }

  .tool-entry-meta {
    font-size: calc(10px * var(--mobile-map-tile-scale, 1));
    line-height: 1.5;
    color: var(--color-muted);
  }
</style>
