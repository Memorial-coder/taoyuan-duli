<template>
  <div class="space-y-3" data-testid="online-neighbor-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Users :size="16" />
            <h2 class="game-section-title">在线邻里</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ identityLabel }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="refreshRunning"
            @click="refreshNeighborShell"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': refreshRunning }" />
            {{ refreshRunning ? '刷新中' : '刷新邻里' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="socialStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
        {{ socialStore.errorMessage }}
      </div>

      <div class="grid gap-2 text-xs md:grid-cols-4">
        <div v-for="stat in identityStats" :key="stat.label" class="game-panel-muted px-2 py-2">
          <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
          <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 border px-3 py-2 text-xs transition-colors"
          :class="activeTab === tab.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="{ name: 'social' }">
          <ExternalLink :size="12" />
          完整邻里页
        </RouterLink>
      </div>

      <div v-if="activeTab === 'profile'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div class="game-panel-muted p-3">
          <div v-if="socialStore.profile" class="space-y-3">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="text-sm text-accent">{{ socialStore.displayTitle }}</p>
                <p class="mt-1 text-xs leading-5 text-muted">{{ socialStore.profile.display_name }} · {{ socialStore.profile.honorific }}</p>
              </div>
              <span class="w-fit border border-accent/20 px-2 py-1 text-[10px] text-accent">{{ profileVisibilityLabel }}</span>
            </div>
            <div class="grid gap-2 text-xs md:grid-cols-2">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">庄园名</p>
                <p class="mt-1 text-accent">{{ socialStore.profile.manor_name || '未填写' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">展示主题</p>
                <p class="mt-1 text-accent">{{ socialStore.profile.showcase_theme || '未设置' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">主营方向</p>
                <p class="mt-1 text-accent">{{ socialStore.profile.primary_route_label || '未设置' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">邻里身份</p>
                <p class="mt-1 text-accent">{{ socialStore.profile.neighborhood_role || '未设置' }}</p>
              </div>
            </div>
            <div class="border border-accent/10 bg-black/10 p-3 text-xs leading-5">
              {{ socialStore.profile.public_intro || '这个人还没写公开介绍。' }}
            </div>
          </div>
          <div v-else class="text-xs leading-5 text-muted">
            暂未载入公开名片。刷新后会在这里显示名片摘要。
          </div>
        </div>

        <div class="grid gap-2">
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'friends'">好友入口</button>
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'neighbor'">邻里组织</button>
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'subscriptions'">关注订阅</button>
        </div>
      </div>

      <div v-else-if="activeTab === 'friends'" class="game-panel-muted grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <div class="space-y-3">
          <div class="grid gap-2 text-xs md:grid-cols-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">好友</p>
              <p class="mt-1 text-accent">{{ socialStore.friends.length }} 位</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">收到申请</p>
              <p class="mt-1 text-accent">{{ socialStore.incomingRequests.length }} 条</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">发出申请</p>
              <p class="mt-1 text-accent">{{ socialStore.outgoingRequests.length }} 条</p>
            </div>
          </div>
          <p class="text-xs leading-5 text-muted">
            好友搜索、申请处理、访问庄园、写信、送礼和房间邀请使用独立好友驿站承接。
          </p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact h-fit justify-center" :to="{ name: 'friend-station' }">
          <ExternalLink :size="12" />
          好友驿站
        </RouterLink>
      </div>

      <div v-else-if="activeTab === 'neighbor'" class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div class="space-y-3">
          <div class="border border-accent/10 bg-black/10 p-3">
            <p class="text-xs text-accent">{{ neighborGroupTitle }}</p>
            <p class="mt-1 text-[10px] leading-5 text-muted">{{ neighborGroupSummary }}</p>
          </div>
          <div class="grid gap-2 text-xs md:grid-cols-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">公开邻里</p>
              <p class="mt-1 text-accent">{{ socialStore.neighborPublicGroups.length }} 个</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">收到邀请</p>
              <p class="mt-1 text-accent">{{ socialStore.neighborIncomingInvites.length }} 条</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">待处理申请</p>
              <p class="mt-1 text-accent">{{ socialStore.neighborManagedRequests.length }} 条</p>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div v-for="group in publicGroupPreview" :key="group.id" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-xs text-accent">{{ group.name }}</p>
            <p class="mt-1 text-[10px] text-muted">Lv.{{ group.level }} · {{ group.member_count }}/{{ group.capacity }} 人</p>
          </div>
          <div v-if="publicGroupPreview.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
            当前没有公开邻里摘要。
          </div>
        </div>
      </div>

      <div v-else class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div class="space-y-3">
          <div class="grid gap-2 text-xs md:grid-cols-2">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">当前订阅</p>
              <p class="mt-1 text-accent">{{ socialStore.subscriptions.length }} 项</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">订阅提示</p>
              <p class="mt-1 text-accent">{{ socialStore.subscriptionNotices.length }} 条</p>
            </div>
          </div>
          <p class="text-xs leading-5 text-muted">
            庄园风格、玩法高手、邻里组织和节庆主题关注项集中在这里。
          </p>
        </div>
        <div class="space-y-2">
          <div v-for="entry in subscriptionPreview" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-xs text-accent">{{ entry.label }}</p>
            <p class="mt-1 text-[10px] text-muted">{{ subscriptionTypeLabel(entry.target_type) }}</p>
          </div>
          <div v-if="subscriptionPreview.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
            当前还没有关注或订阅。
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ArrowLeft, ExternalLink, RefreshCw, Users } from 'lucide-vue-next'
  import { useSocialStore } from '@/stores/useSocialStore'

  type NeighborTabKey = 'profile' | 'friends' | 'neighbor' | 'subscriptions'
  type NeighborTabMeta = { key: NeighborTabKey; label: string; summary: string }

  const socialStore = useSocialStore()
  const activeTab = ref<NeighborTabKey>('profile')
  const lastRefreshAttemptAt = ref(0)
  const tabs: NeighborTabMeta[] = [
    { key: 'profile', label: '名片', summary: '公开名片摘要与主要入口独立展示。' },
    { key: 'friends', label: '好友', summary: '好友主操作从这里进入好友驿站。' },
    { key: 'neighbor', label: '邻里', summary: '邻里组织、申请和邀请摘要集中在这里。' },
    { key: 'subscriptions', label: '订阅', summary: '关注项和订阅提示单独成区。' },
  ]
  const defaultTab = tabs[0]!

  const refreshRunning = computed(() =>
    socialStore.loading ||
    socialStore.relationshipLoading ||
    socialStore.neighborLoading ||
    socialStore.subscriptionsLoading
  )
  const activeTabMeta = computed<NeighborTabMeta>(() => tabs.find(tab => tab.key === activeTab.value) ?? defaultTab)
  const profileVisibilityLabel = computed(() => {
    if (!socialStore.profile) return '未公开'
    if (socialStore.profile.visibility === 'public') return '公开'
    if (socialStore.profile.visibility === 'friends_only') return '仅好友'
    return '私密'
  })
  const identityLabel = computed(() => {
    if (!socialStore.profile) return '公开名片、好友、邻里组织和订阅分区管理。'
    return `${socialStore.displayTitle} · ${profileVisibilityLabel.value}名片`
  })
  const refreshStateLabel = computed(() => {
    if (refreshRunning.value) return '正在刷新邻里摘要'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })
  const neighborGroupLabel = computed(() => {
    if (!socialStore.neighborGroup) return '未加入'
    return socialStore.neighborGroup.name || '已加入邻里'
  })
  const identityStats = computed(() => [
    { label: '名片', value: socialStore.profile ? profileVisibilityLabel.value : '未载入' },
    { label: '好友', value: `${socialStore.friends.length} 位` },
    { label: '邻里', value: neighborGroupLabel.value },
    { label: '订阅', value: `${socialStore.subscriptions.length} 项` },
  ])
  const neighborGroupTitle = computed(() => socialStore.neighborGroup?.name || '尚未加入邻里')
  const neighborGroupSummary = computed(() => {
    if (!socialStore.neighborGroup) return '可以从公开邻里里申请加入，也可以在完整邻里页创建自己的邻里组织。'
    return socialStore.neighborGroup.summary || socialStore.neighborGroup.notice || '这个邻里还没写简介。'
  })
  const publicGroupPreview = computed(() => socialStore.neighborPublicGroups.slice(0, 3))
  const subscriptionPreview = computed(() => socialStore.subscriptions.slice(0, 3))

  const subscriptionTypeLabel = (type: 'style' | 'expert' | 'neighbor_group' | 'festival') => {
    if (type === 'style') return '庄园风格'
    if (type === 'expert') return '玩法高手'
    if (type === 'neighbor_group') return '村社 / 邻里'
    return '节庆活动'
  }

  const refreshNeighborShell = async () => {
    await Promise.allSettled([
      socialStore.refreshProfile(),
      socialStore.refreshRelationships(),
      socialStore.refreshNeighborOverview(),
      socialStore.refreshSubscriptions(),
    ])
    lastRefreshAttemptAt.value = Date.now()
  }

  onMounted(() => {
    void refreshNeighborShell()
  })
</script>
