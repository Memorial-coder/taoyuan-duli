<template>
  <div class="space-y-3" data-testid="online-center">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Wifi :size="16" />
            <h2 class="game-section-title">在线中心</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">
            联机玩法统一从这里分流，交流大厅仍保留在主菜单外入口。
          </p>
          <p class="mt-1 text-[10px] leading-4 text-muted">
            {{ lastRefreshedLabel }}
            <span v-if="errorCount > 0"> · {{ errorCount }} 个模块摘要暂不可用</span>
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="refreshing"
            @click="refreshOnlineSummary"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': refreshing }" />
            {{ refreshing ? '刷新中' : '刷新摘要' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" to="/hall">
            <MessageCircle :size="12" />
            交流大厅
          </RouterLink>
        </div>
      </div>

      <nav class="grid grid-cols-3 gap-1 md:grid-cols-6" aria-label="在线模块快捷入口">
        <RouterLink
          v-for="module in modules"
          :key="`${module.key}-quick`"
          class="flex min-w-0 flex-col items-center gap-1 border border-accent/15 bg-black/10 px-1 py-2 text-[10px] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
          :data-testid="`online-module-${module.key}-quick-link`"
          :to="{ name: module.routeName }"
        >
          <component :is="module.icon" :size="13" />
          <span class="truncate">{{ module.title }}</span>
        </RouterLink>
      </nav>
    </section>

    <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      <OnlineModuleCard
        v-for="module in modules"
        :key="module.routeName"
        :module-key="module.key"
        :title="module.title"
        :summary="module.summary"
        :status="module.status"
        :stats="module.stats"
        :to="{ name: module.routeName }"
        :icon="module.icon"
        :error="module.error"
      />
    </section>

    <section class="game-panel-muted p-3" data-testid="online-visual-activity-group">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Map :size="15" />
            <h3 class="text-sm leading-5">可视化活动</h3>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">地图、场景、轨道和异步工程入口集中在这里。</p>
        </div>
        <span class="text-[10px] leading-4 text-muted">{{ visualActivitySummary }}</span>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <RouterLink
          v-for="activity in visualActivities"
          :key="activity.key"
          class="flex min-h-[116px] min-w-0 flex-col justify-between border border-accent/15 bg-black/10 p-3 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
          :data-testid="activity.testId"
          :to="activity.to"
        >
          <div class="min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2 text-accent">
                <component :is="activity.icon" :size="14" />
                <p class="truncate text-xs leading-4">{{ activity.title }}</p>
              </div>
              <span class="shrink-0 text-[10px] leading-4 text-muted">{{ activity.boardType }}</span>
            </div>
            <p class="mt-2 text-[10px] leading-4 text-muted">{{ activity.summary }}</p>
          </div>
          <p class="mt-2 text-[10px] leading-4 text-accent">{{ activity.status }}</p>
        </RouterLink>
      </div>
      <div class="mt-3 border border-accent/10 bg-black/10 p-3" data-testid="online-visual-feature-flag-panel">
        <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <p class="text-xs leading-4 text-accent">可视化功能开关</p>
            <p class="mt-1 text-[10px] leading-4 text-muted">
              {{ onlineVisualFeatureFlagSummary }}
            </p>
          </div>
          <span class="text-[10px] leading-4 text-muted">关闭时保留旧入口或只读回看</span>
        </div>
        <div class="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="featureFlag in onlineVisualFeatureFlagItems"
            :key="featureFlag.key"
            class="border border-accent/10 bg-background/70 p-2"
            :data-testid="featureFlag.fallbackTestId"
          >
            <div class="flex items-start justify-between gap-2">
              <label class="flex min-w-0 items-start gap-2">
                <input
                  class="online-input mt-0.5 size-3 shrink-0"
                  type="checkbox"
                  :checked="featureFlag.enabled"
                  disabled
                  :aria-label="featureFlag.label"
                />
                <span class="min-w-0">
                  <span class="block text-xs leading-4 text-text">{{ featureFlag.label }}</span>
                  <span class="mt-1 block text-[10px] leading-4 text-muted">{{ featureFlag.summary }}</span>
                </span>
              </label>
              <span class="shrink-0 text-[10px] leading-4 text-accent">
                {{ featureFlag.enabled ? '开启' : '降级' }}
              </span>
            </div>
            <p class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-visual-feature-flag-fallback">
              {{ featureFlag.fallbackLabel }}
            </p>
            <RouterLink
              class="mt-2 inline-flex text-[10px] leading-4 text-accent hover:text-highlight"
              :to="{ name: featureFlag.fallbackRouteName }"
              data-testid="online-visual-feature-flag-fallback-link"
            >
              降级入口
            </RouterLink>
          </article>
        </div>
      </div>
      <div class="mt-3 border border-accent/10 bg-black/10 p-3" data-testid="online-visual-activity-schedule">
        <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <p class="text-xs leading-4 text-accent">活动排期</p>
            <p class="mt-1 text-[10px] leading-4 text-muted">{{ onlineVisualScheduleSummary }}</p>
          </div>
          <span class="text-[10px] leading-4 text-muted">过期后保留纪念或复刻入口</span>
        </div>
        <div class="mt-2 grid gap-2 lg:grid-cols-5" data-testid="online-visual-festival-calendar">
          <RouterLink
            v-for="entry in onlineVisualFestivalCalendar"
            :key="entry.id"
            class="flex min-h-[148px] min-w-0 flex-col justify-between border border-accent/10 bg-background/70 p-2 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
            :data-testid="entry.testId"
            :to="routeForScheduleEntry(entry)"
          >
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs leading-4 text-text">{{ entry.title }}</p>
                <span class="shrink-0 text-[10px] leading-4 text-accent">{{ entry.windowLabel }}</span>
              </div>
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.entryLabel }}</p>
              <p class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-visual-schedule-scene">
                {{ entry.visualScene }}
              </p>
            </div>
            <div class="mt-2 space-y-1">
              <p class="text-[10px] leading-4 text-muted" data-testid="online-visual-schedule-reward-pool">
                {{ entry.rewardPoolLabel }}
              </p>
              <p class="text-[10px] leading-4 text-accent" data-testid="online-visual-schedule-npc-line">
                {{ entry.npcLine }}
              </p>
            </div>
          </RouterLink>
        </div>
        <div class="mt-3 grid gap-2 lg:grid-cols-3">
          <div class="border border-accent/10 bg-background/70 p-2" data-testid="online-visual-daily-rotation">
            <p class="text-xs leading-4 text-accent">每日短玩法</p>
            <RouterLink
              v-for="entry in onlineVisualDailyRotation"
              :key="entry.id"
              class="mt-2 block border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
              :data-testid="entry.testId"
              :to="routeForScheduleEntry(entry)"
            >
              <span class="block text-text">{{ entry.title }} · {{ entry.windowLabel }}</span>
              <span class="mt-1 block">{{ entry.rewardSettlement }}</span>
            </RouterLink>
          </div>
          <div class="border border-accent/10 bg-background/70 p-2" data-testid="online-visual-weekly-rotation">
            <p class="text-xs leading-4 text-accent">每周长玩法</p>
            <RouterLink
              v-for="entry in onlineVisualWeeklyRotation"
              :key="entry.id"
              class="mt-2 block border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
              :data-testid="entry.testId"
              :to="routeForScheduleEntry(entry)"
            >
              <span class="block text-text">{{ entry.title }} · {{ entry.entryLabel }}</span>
              <span class="mt-1 block">{{ entry.replayRetention }}</span>
            </RouterLink>
          </div>
          <div class="border border-accent/10 bg-background/70 p-2" data-testid="online-visual-seasonal-rotation">
            <p class="text-xs leading-4 text-accent">赛季与过期保留</p>
            <RouterLink
              v-for="entry in onlineVisualSeasonalRotation"
              :key="entry.id"
              class="mt-2 block border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
              :data-testid="entry.testId"
              :to="routeForScheduleEntry(entry)"
            >
              <span class="block text-text">{{ entry.title }} · {{ entry.windowLabel }}</span>
              <span class="mt-1 block">{{ entry.replayRetention }}</span>
            </RouterLink>
            <ul class="mt-2 space-y-1" data-testid="online-visual-expired-retention">
              <li
                v-for="retention in onlineVisualExpiredRetention"
                :key="retention"
                class="text-[10px] leading-4 text-muted"
              >
                {{ retention }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import {
    CalendarDays,
    ClipboardList,
    HeartHandshake,
    Handshake,
    Home,
    Lamp,
    Map,
    MessageCircle,
    Pickaxe,
    RefreshCw,
    ShieldCheck,
    Users,
    Warehouse,
    Waves,
    Wifi
  } from 'lucide-vue-next'
  import type { Component } from 'vue'
  import type { RouteLocationRaw } from 'vue-router'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import { useCohabitationStore } from '@/stores/useCohabitationStore'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useManorStore } from '@/stores/useManorStore'
  import { useSocialStore } from '@/stores/useSocialStore'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import OnlineModuleCard from '@/components/game/online/OnlineModuleCard.vue'
  import {
    ONLINE_VISUAL_FEATURE_FLAGS,
    createOnlineVisualFeatureFlagState,
    isOnlineVisualFeatureEnabled,
  } from '@/data/onlineVisualFeatureFlags'
  import {
    ONLINE_VISUAL_DAILY_ACTIVITY_ROTATION,
    ONLINE_VISUAL_EXPIRED_ACTIVITY_RETENTION,
    ONLINE_VISUAL_FESTIVAL_ACTIVITY_CALENDAR,
    ONLINE_VISUAL_SEASONAL_ACTIVITY_ROTATION,
    ONLINE_VISUAL_WEEKLY_ACTIVITY_ROTATION,
    type OnlineVisualActivityScheduleEntry,
  } from '@/data/onlineVisualActivitySchedule'

  type ModuleKey = 'manor' | 'cohabitation' | 'neighbor' | 'orders' | 'festival' | 'society'
  type ModuleStat = { label: string; value: string | number }
  type ModuleCard = {
    key: ModuleKey
    title: string
    summary: string
    status: string
    stats: ModuleStat[]
    routeName: string
    icon: Component
    error: string
  }
  type VisualActivityKey = 'cavern' | 'lantern' | 'dragon-boat' | 'society-projects' | 'relay-orders' | 'warehouse'
  type VisualActivityCard = {
    key: VisualActivityKey
    title: string
    summary: string
    status: string
    boardType: string
    to: RouteLocationRaw
    icon: Component
    testId: string
  }

  const manorStore = useManorStore()
  const cohabitationStore = useCohabitationStore()
  const socialStore = useSocialStore()
  const coopOrderStore = useCoopOrderStore()
  const festivalRoomStore = useFestivalRoomStore()
  const expeditionRoomStore = useExpeditionRoomStore()
  const societyStore = useSocietyStore()
  const refreshing = ref(false)
  const lastRefreshedAt = ref(0)
  const moduleErrors = ref<Partial<Record<ModuleKey, string>>>({})
  const onlineVisualFeatureFlagState = createOnlineVisualFeatureFlagState()

  const countLabel = (count: number | undefined, unit = '项') => `${count ?? 0}${unit}`
  const hasSummary = (value: unknown) => (value ? '已同步' : '未同步')
  const normalizeError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

  const setModuleError = (key: ModuleKey, message: string) => {
    moduleErrors.value = {
      ...moduleErrors.value,
      [key]: message,
    }
  }

  const runSummaryTask = async (key: ModuleKey, runner: () => Promise<unknown>, fallback: string) => {
    try {
      await runner()
      setModuleError(key, '')
    } catch (error) {
      setModuleError(key, normalizeError(error, fallback))
    }
  }

  const refreshOnlineSummary = async () => {
    if (refreshing.value) return
    refreshing.value = true
    await Promise.all([
      runSummaryTask('manor', async () => Promise.all([
        manorStore.refreshSnapshot('', { silent: true }),
        manorStore.refreshFavoriteOverview(),
      ]), '庄园摘要刷新失败'),
      runSummaryTask('cohabitation', () => cohabitationStore.refreshOverview({ silent: true }), '共同庄园摘要刷新失败'),
      runSummaryTask('neighbor', async () => Promise.all([
        socialStore.refreshProfile({ silent: true }),
        socialStore.refreshRelationships({ silent: true }),
        socialStore.refreshNeighborOverview({ silent: true }),
        socialStore.refreshSubscriptions(),
      ]), '邻里摘要刷新失败'),
      runSummaryTask('orders', () => coopOrderStore.refreshOverview({ silent: true }), '委托摘要刷新失败'),
      runSummaryTask('festival', async () => Promise.all([
        festivalRoomStore.refreshOverview({ silent: true }),
        expeditionRoomStore.refreshOverview({ silent: true }),
      ]), '节会摘要刷新失败'),
      runSummaryTask('society', () => societyStore.refreshOverview({ silent: true }), '村社摘要刷新失败'),
    ])
    lastRefreshedAt.value = Date.now()
    refreshing.value = false
  }

  const lastRefreshedLabel = computed(() => {
    if (refreshing.value && !lastRefreshedAt.value) return '正在刷新在线摘要'
    if (!lastRefreshedAt.value) return '尚未刷新在线摘要'
    const time = new Date(lastRefreshedAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `摘要更新于 ${time}`
  })

  const errorCount = computed(() => Object.values(moduleErrors.value).filter(Boolean).length)

  const visualActivities = computed<VisualActivityCard[]>(() => [
    {
      key: 'cavern',
      title: '协作矿洞',
      summary: '节点地图、撤离点、组合收益和路线回看。',
      status: expeditionRoomStore.myRoom ? `远征房：${expeditionRoomStore.myRoom.state_label}` : `${expeditionRoomStore.visibleRooms.length} 间远征房可见`,
      boardType: '地图',
      to: { name: 'online-festival', query: { tab: 'expedition-room' } },
      icon: Pickaxe,
      testId: 'online-visual-activity-cavern',
    },
    {
      key: 'lantern',
      title: '灯会现场',
      summary: '主灯、灯谜、人群、留影点和好友回看。',
      status: festivalRoomStore.myRoom ? `节会房：${festivalRoomStore.myRoom.state_label}` : `${festivalRoomStore.visibleRooms.length} 间节会房可见`,
      boardType: '场景',
      to: { name: 'online-festival', query: { tab: 'festival-room' } },
      icon: Lamp,
      testId: 'online-visual-activity-lantern',
    },
    {
      key: 'dragon-boat',
      title: '龙舟赛道',
      summary: '多船轨道、名次榜、冲线状态和赛道回看。',
      status: festivalRoomStore.myRoom ? '本房可查看赛道状态' : '支持 2 / 4 / 6 / 8 人房',
      boardType: '轨道',
      to: { name: 'online-festival', query: { tab: 'festival-room' } },
      icon: Waves,
      testId: 'online-visual-activity-dragon-boat',
    },
    {
      key: 'society-projects',
      title: '村社公共建设',
      summary: '修桥、节庆广场、花灯墙等异步工程现场。',
      status: societyStore.mySociety ? `${societyStore.mySociety.public_projects.length} 项公共建设` : '加入村社后可共建',
      boardType: '异步',
      to: { name: 'online-society', query: { tab: 'projects' } },
      icon: ClipboardList,
      testId: 'online-visual-activity-society-projects',
    },
    {
      key: 'relay-orders',
      title: '公共订单接力',
      summary: '多段委托路线、阶段贡献和分账摘要。',
      status: `${coopOrderStore.visibleOrders.filter(order => order.collaboration_mode === 'multi_stage').length} 张接力单可见`,
      boardType: '异步',
      to: { name: 'online-orders', query: { tab: 'available' } },
      icon: Handshake,
      testId: 'online-visual-activity-relay-orders',
    },
    {
      key: 'warehouse',
      title: '村社仓廪',
      summary: '五类入仓、周结算、灾害与节会公共效果。',
      status: societyStore.mySociety?.public_warehouse.weekly_settlement?.status_label || '等待本周入仓',
      boardType: '仓廪',
      to: { name: 'online-society', query: { tab: 'storage' } },
      icon: Warehouse,
      testId: 'online-visual-activity-warehouse',
    },
  ])

  const visualActivitySummary = computed(() => {
    const activeRooms = [festivalRoomStore.myRoom, expeditionRoomStore.myRoom].filter(Boolean).length
    const projectCount = societyStore.mySociety?.public_projects.length || 0
    return `${visualActivities.value.length} 类活动 · ${activeRooms} 间活动房 · ${projectCount} 项公共建设`
  })

  const onlineVisualFeatureFlagItems = computed(() =>
    ONLINE_VISUAL_FEATURE_FLAGS.map(flag => ({
      ...flag,
      enabled: isOnlineVisualFeatureEnabled(onlineVisualFeatureFlagState, flag.key),
    }))
  )

  const onlineVisualFeatureFlagSummary = computed(() => {
    const enabledCount = onlineVisualFeatureFlagItems.value.filter(flag => flag.enabled).length
    return `${enabledCount}/${onlineVisualFeatureFlagItems.value.length} 个开关默认开启 · 配置缺失时按定义保守降级`
  })

  const onlineVisualFestivalCalendar = ONLINE_VISUAL_FESTIVAL_ACTIVITY_CALENDAR
  const onlineVisualDailyRotation = ONLINE_VISUAL_DAILY_ACTIVITY_ROTATION
  const onlineVisualWeeklyRotation = ONLINE_VISUAL_WEEKLY_ACTIVITY_ROTATION
  const onlineVisualSeasonalRotation = ONLINE_VISUAL_SEASONAL_ACTIVITY_ROTATION
  const onlineVisualExpiredRetention = ONLINE_VISUAL_EXPIRED_ACTIVITY_RETENTION
  const onlineVisualScheduleSummary = computed(() =>
    `${onlineVisualFestivalCalendar.length} 个节会 · ${onlineVisualDailyRotation.length} 个每日短玩法 · ${onlineVisualWeeklyRotation.length} 个每周目标`
  )
  const routeForScheduleEntry = (entry: OnlineVisualActivityScheduleEntry): RouteLocationRaw => ({
    name: entry.routeName,
    query: entry.routeQuery,
  })

  const modules = computed<ModuleCard[]>(() => [
    {
      key: 'manor',
      title: '庄园',
      summary: '公开展示、来访、留言、主题周、收藏。',
      status: manorStore.snapshot
        ? `${manorStore.snapshot.manor_name || manorStore.snapshot.display_name || '我的庄园'} · ${manorStore.snapshot.theme_week?.active_theme || manorStore.snapshot.showcase_theme || '未设主题'}`
        : '还没有同步庄园快照。',
      stats: [
        { label: '快照', value: hasSummary(manorStore.snapshot) },
        { label: '收藏', value: countLabel(manorStore.favoriteOverview?.favorites.length) },
        { label: '关注', value: manorStore.snapshot?.is_followed_by_viewer ? '已关注' : '未关注' },
        { label: '来访', value: countLabel(manorStore.snapshot?.visit_entries.length) },
      ],
      routeName: 'online-manor',
      icon: Home,
      error: moduleErrors.value.manor || ''
    },
    {
      key: 'cohabitation',
      title: '共同庄园',
      summary: '同居契约、共同地图、仓库、基金、权限。',
      status: cohabitationStore.summary.total > 0
        ? `${cohabitationStore.summary.active} 份已生效 · ${cohabitationStore.summary.pending} 份待接受`
        : '尚未建立共同庄园契约。',
      stats: [
        { label: '契约', value: countLabel(cohabitationStore.summary.total, '份') },
        { label: '已生效', value: countLabel(cohabitationStore.summary.active, '份') },
        { label: '共同基金', value: cohabitationStore.fund?.balance ?? cohabitationStore.selectedContract?.shared_fund?.balance ?? 0 },
        { label: '仓库', value: countLabel(cohabitationStore.warehouse?.summary.item_count ?? cohabitationStore.selectedContract?.shared_warehouse?.items?.length) },
      ],
      routeName: 'online-cohabitation',
      icon: HeartHandshake,
      error: moduleErrors.value.cohabitation || ''
    },
    {
      key: 'neighbor',
      title: '邻里',
      summary: '名片、好友、邻里组织、订阅。',
      status: socialStore.profile
        ? `${socialStore.displayTitle} · ${socialStore.neighborGroup?.name || '尚未加入邻里'}`
        : '还没有同步公开名片。',
      stats: [
        { label: '名片', value: hasSummary(socialStore.profile) },
        { label: '好友', value: countLabel(socialStore.friends.length, '人') },
        { label: '申请', value: countLabel(socialStore.incomingRequests.length + socialStore.outgoingRequests.length) },
        { label: '邻里', value: socialStore.neighborGroup ? `${socialStore.neighborGroup.member_count}人` : '未加入' },
      ],
      routeName: 'online-neighbor',
      icon: Users,
      error: moduleErrors.value.neighbor || ''
    },
    {
      key: 'orders',
      title: '委托',
      summary: '在线求助单、接单、交付、互助声望。',
      status: `${coopOrderStore.reputationSummary.trust_level.label} · 已完成 ${coopOrderStore.reputationSummary.completed_count} 单`,
      stats: [
        { label: '我的发布', value: countLabel(coopOrderStore.myOrders.length) },
        { label: '我的接单', value: countLabel(coopOrderStore.myAcceptedOrders.length) },
        { label: '可见委托', value: countLabel(coopOrderStore.visibleOrders.length) },
        { label: '补偿', value: countLabel(coopOrderStore.myCompensations.length) },
      ],
      routeName: 'online-orders',
      icon: Handshake,
      error: moduleErrors.value.orders || ''
    },
    {
      key: 'festival',
      title: '节会',
      summary: '世界事件、节会房间、远征房间、纪念。',
      status: festivalRoomStore.myRoom
        ? `节会房间：${festivalRoomStore.myRoom.state_label}`
        : expeditionRoomStore.myRoom
          ? `远征房间：${expeditionRoomStore.myRoom.state_label}`
          : '暂无进行中的节会或远征房间。',
      stats: [
        { label: '节会房', value: festivalRoomStore.myRoom ? '进行中' : '无' },
        { label: '节会邀请', value: countLabel(festivalRoomStore.invitedRooms.length) },
        { label: '远征房', value: expeditionRoomStore.myRoom ? '进行中' : '无' },
        { label: '远征邀请', value: countLabel(expeditionRoomStore.invitedRooms.length) },
      ],
      routeName: 'online-festival',
      icon: CalendarDays,
      error: moduleErrors.value.festival || ''
    },
    {
      key: 'society',
      title: '村社',
      summary: '组织、成员、仓库、提案、公共建设。',
      status: societyStore.mySociety
        ? `${societyStore.mySociety.name} · ${societyStore.mySociety.my_role_label || '成员'}`
        : '尚未加入村社，可进入后创建或申请。',
      stats: [
        { label: '我的村社', value: societyStore.mySociety ? `${societyStore.mySociety.member_count}人` : '未加入' },
        { label: '邀请', value: countLabel(societyStore.incomingInvites.length) },
        { label: '申请', value: countLabel(societyStore.managedRequests.length + societyStore.myPendingRequests.length) },
        { label: '提案', value: countLabel(societyStore.mySociety?.active_proposals.length) },
      ],
      routeName: 'online-society',
      icon: ShieldCheck,
      error: moduleErrors.value.society || ''
    }
  ])

  onMounted(() => {
    void refreshOnlineSummary()
  })
</script>
