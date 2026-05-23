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

      <nav class="grid grid-cols-5 gap-1" aria-label="在线模块快捷入口">
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

    <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import {
    CalendarDays,
    Handshake,
    Home,
    MessageCircle,
    RefreshCw,
    ShieldCheck,
    Users,
    Wifi
  } from 'lucide-vue-next'
  import type { Component } from 'vue'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useManorStore } from '@/stores/useManorStore'
  import { useSocialStore } from '@/stores/useSocialStore'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import OnlineModuleCard from '@/components/game/online/OnlineModuleCard.vue'

  type ModuleKey = 'manor' | 'neighbor' | 'orders' | 'festival' | 'society'
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

  const manorStore = useManorStore()
  const socialStore = useSocialStore()
  const coopOrderStore = useCoopOrderStore()
  const festivalRoomStore = useFestivalRoomStore()
  const expeditionRoomStore = useExpeditionRoomStore()
  const societyStore = useSocietyStore()
  const refreshing = ref(false)
  const lastRefreshedAt = ref(0)
  const moduleErrors = ref<Partial<Record<ModuleKey, string>>>({})

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
