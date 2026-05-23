<template>
  <div class="space-y-3" data-testid="online-manor-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Home :size="16" />
            <h2 class="game-section-title">在线庄园</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ identityLabel }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ routeTargetHelperText }} · {{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="manorStore.loading"
            @click="refreshSnapshot"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': manorStore.loading }" />
            {{ manorStore.loading ? '刷新中' : '刷新庄园' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="manorStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
        {{ manorStore.errorMessage }}
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
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="legacyManorTarget">
          <ExternalLink :size="12" />
          完整庄园页
        </RouterLink>
      </div>

      <div v-if="activeTab === 'overview'" class="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div class="space-y-3">
          <ManorPreviewCard
            v-if="snapshot"
            :snapshot="snapshot"
            :favorite-overview="manorStore.favoriteOverview"
          />
          <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
            先刷新庄园快照，概览页会把庄园预览卡、主题、来访和收藏关注摘要集中到第一屏。
          </div>
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div v-for="stat in overviewStats" :key="stat.label" class="border border-accent/10 bg-black/10 p-2">
              <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
              <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
            </div>
          </div>
          <p class="text-xs leading-5 text-muted">
            {{ overviewCopy }}
          </p>
        </div>
        <div class="grid gap-2">
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'theme'">查看主题</button>
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'guestbook'">去留言</button>
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'visits'">看访客</button>
        </div>
      </div>

      <div v-else-if="activeTab === 'theme'" class="game-panel-muted grid gap-2 p-3 md:grid-cols-2">
        <div class="border border-accent/10 bg-black/10 p-3">
          <p class="text-[10px] text-muted">当前主题</p>
          <p class="mt-1 text-sm text-accent">{{ currentTheme }}</p>
          <p class="mt-2 text-[10px] leading-5 text-muted">
            {{ isOwner ? '主题编辑、主图上传和模板保存会在 C2 迁入；当前完整操作仍保留在旧庄园页。' : '访客只查看主题展示，不显示庄园主编辑控件。' }}
          </p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-3">
          <p class="text-[10px] text-muted">官方精选</p>
          <p class="mt-1 text-xs text-accent">{{ snapshot?.theme_week?.official_pick?.label || '暂无官方精选' }}</p>
          <p class="mt-2 text-[10px] leading-5 text-muted">{{ snapshot?.theme_week?.official_pick?.reason || '进入主题页后会集中处理主题推荐和精选信息。' }}</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'guestbook'" class="game-panel-muted space-y-2 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-muted">留言将在 C3 迁成独立输入与列表区；当前先显示最近摘要。</p>
          <span class="text-[10px] text-accent">{{ guestbookEntries.length }} 条</span>
        </div>
        <div v-if="guestbookEntries.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
          当前还没有留言。
        </div>
        <div v-for="entry in guestbookEntries.slice(0, 3)" :key="entry.id" class="border border-accent/10 bg-black/10 p-3">
          <p class="text-xs text-accent">{{ entry.author_display_name }}</p>
          <p class="mt-1 text-[10px] leading-5 text-muted">{{ entry.content }}</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'visits'" class="game-panel-muted space-y-2 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-muted">来访会在 C4 迁成独立记录区；当前先显示最近摘要。</p>
          <span class="text-[10px] text-accent">{{ visitEntries.length }} 次</span>
        </div>
        <div v-if="visitEntries.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
          当前还没有来访记录。
        </div>
        <div v-for="entry in visitEntries.slice(0, 3)" :key="entry.id" class="border border-accent/10 bg-black/10 p-3">
          <p class="text-xs text-accent">{{ entry.visitor_display_name }}</p>
          <p class="mt-1 text-[10px] leading-5 text-muted">{{ entry.summary || '前来参观庄园' }}</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'guide'" class="game-panel-muted space-y-2 p-3">
        <p class="text-xs leading-5 text-muted">
          导览点会在 C4 迁入独立维护区；当前先展示已设参观点，不展开新增表单。
        </p>
        <div v-if="guidePoints.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
          当前还没有导览点。
        </div>
        <div v-for="point in guidePoints" :key="point.id" class="border border-accent/10 bg-black/10 p-3">
          <p class="text-xs text-accent">{{ point.order }}. {{ point.title }}</p>
          <p class="mt-1 text-[10px] leading-5 text-muted">{{ point.summary }}</p>
        </div>
      </div>

      <div v-else class="game-panel-muted grid gap-2 p-3 md:grid-cols-2">
        <div class="border border-accent/10 bg-black/10 p-3">
          <p class="text-[10px] text-muted">我的收藏</p>
          <p class="mt-1 text-sm text-accent">{{ manorStore.favoriteOverview?.favorites.length ?? 0 }} 项</p>
          <p class="mt-2 text-[10px] leading-5 text-muted">收藏列表会留在庄园模块内，不放回在线中心首页。</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-3">
          <p class="text-[10px] text-muted">热门庄园</p>
          <p class="mt-1 text-sm text-accent">{{ manorStore.favoriteOverview?.hot_manors.length ?? 0 }} 座</p>
          <p class="mt-2 text-[10px] leading-5 text-muted">后续收藏页会承接热门庄园和同主题收藏列表。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { ArrowLeft, ExternalLink, Home, RefreshCw } from 'lucide-vue-next'
  import ManorPreviewCard from '@/components/game/ManorPreviewCard.vue'
  import { useManorStore } from '@/stores/useManorStore'

  type ManorTabKey = 'overview' | 'theme' | 'guestbook' | 'visits' | 'guide' | 'favorites'
  type ManorTabMeta = { key: ManorTabKey; label: string; summary: string }

  const route = useRoute()
  const manorStore = useManorStore()
  const activeTab = ref<ManorTabKey>('overview')
  const lastRefreshAttemptAt = ref(0)
  const tabs: ManorTabMeta[] = [
    { key: 'overview', label: '概览', summary: '先看庄园快照、主题与互动数量，不展开长表单。' },
    { key: 'theme', label: '主题', summary: '集中承接主题、模板、主图与官方精选。' },
    { key: 'guestbook', label: '留言', summary: '留言输入、回复和置顶会在这里独立处理。' },
    { key: 'visits', label: '来访', summary: '访客记录、来访目的和反馈会从长页中拆出。' },
    { key: 'guide', label: '导览', summary: '维护参观点与路线摘要，避免夹在其它操作中间。' },
    { key: 'favorites', label: '收藏', summary: '收藏、关注、同主题和热门庄园集中在这里。' },
  ]
  const defaultTab = tabs[0]!

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const routeTargetUsername = computed(() => getRouteQueryText(route.query.target_username))
  const routeTargetSaveId = computed(() => getRouteQueryText(route.query.target_save_id))
  const routeTargetContextLabel = computed(() => routeTargetUsername.value || (routeTargetSaveId.value ? `ID ${routeTargetSaveId.value}` : ''))
  const snapshot = computed(() => manorStore.snapshot)
  const isOwner = computed(() => snapshot.value?.viewer_is_owner !== false)
  const currentTheme = computed(() => snapshot.value?.theme_week?.active_theme || snapshot.value?.showcase_theme || '未设置主题')
  const guestbookEntries = computed(() => snapshot.value?.guestbook_entries ?? [])
  const visitEntries = computed(() => snapshot.value?.visit_entries ?? [])
  const guidePoints = computed(() => snapshot.value?.guide_points ?? [])
  const activeTabMeta = computed<ManorTabMeta>(() => tabs.find(tab => tab.key === activeTab.value) ?? defaultTab)

  const identityLabel = computed(() => {
    if (!snapshot.value) return routeTargetContextLabel.value ? `正在访问 ${routeTargetContextLabel.value} 的庄园` : '我的在线庄园'
    if (snapshot.value.viewer_is_owner) return `${snapshot.value.manor_name || snapshot.value.display_name || '我的庄园'} · 自己的庄园`
    return `${snapshot.value.display_name || snapshot.value.username} 的公开庄园`
  })

  const routeTargetHelperText = computed(() => {
    if (!routeTargetContextLabel.value) return '默认进入自己的庄园概览。'
    return routeTargetSaveId.value
      ? `保留好友入口上下文，正在按存档 ID ${routeTargetSaveId.value} 查看目标庄园。`
      : '保留好友入口上下文，正在按玩家名查看目标庄园。'
  })

  const refreshStateLabel = computed(() => {
    if (manorStore.loading) return '正在同步快照'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })

  const identityStats = computed(() => [
    { label: '访问模式', value: isOwner.value ? '自己管理' : '访客访问' },
    { label: '主题', value: currentTheme.value },
    { label: '留言', value: `${guestbookEntries.value.length} 条` },
    { label: '来访', value: `${visitEntries.value.length} 次` },
  ])

  const favoriteSummaryText = computed(() => {
    const favoriteCount = manorStore.favoriteOverview?.favorites.length ?? 0
    if (!snapshot.value) return `收藏 ${favoriteCount} 项`
    if (snapshot.value.viewer_is_owner) return `我的收藏 ${favoriteCount} 项`
    const favoriteLabel = snapshot.value.is_favorited_by_viewer ? '已收藏' : '未收藏'
    const followLabel = snapshot.value.is_followed_by_viewer ? '已关注' : '未关注'
    return `${favoriteLabel} · ${followLabel}`
  })

  const overviewStats = computed(() => [
    { label: '当前主题', value: currentTheme.value },
    { label: '来访摘要', value: snapshot.value?.today_visit_summary || '暂无来访' },
    { label: '收藏关注', value: favoriteSummaryText.value },
    { label: '导览点', value: `${guidePoints.value.length} 个` },
  ])

  const overviewCopy = computed(() => {
    if (!snapshot.value) return '先刷新庄园快照，概览页只承接摘要，完整表单会按主题、留言、来访、导览分拆。'
    if (snapshot.value.viewer_is_owner) return '这是自己的庄园概览；管理操作会逐步拆到各标签页，当前仍可从完整庄园页过渡处理。'
    return '这是访客视角的庄园概览；页面只展示可访问内容，不暴露庄园主编辑控件。'
  })

  const legacyManorTarget = computed(() => {
    const query: Record<string, string> = {}
    if (routeTargetUsername.value) query.target_username = routeTargetUsername.value
    if (routeTargetSaveId.value) query.target_save_id = routeTargetSaveId.value
    return Object.keys(query).length > 0
      ? { name: 'manor', query }
      : { name: 'manor' }
  })

  const refreshSnapshot = async () => {
    await manorStore.refreshSnapshot({
      target_username: routeTargetUsername.value,
      target_save_id: routeTargetSaveId.value || undefined,
    }).catch(() => {})
    await manorStore.refreshFavoriteOverview().catch(() => {})
    lastRefreshAttemptAt.value = Date.now()
  }

  onMounted(() => {
    void refreshSnapshot()
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      activeTab.value = 'overview'
      void refreshSnapshot()
    }
  )
</script>
