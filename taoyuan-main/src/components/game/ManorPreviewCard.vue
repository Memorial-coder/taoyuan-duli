<template>
  <div v-if="snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="text-sm text-accent">{{ snapshot.manor_name }}</p>
        <p class="text-[10px] text-muted mt-1">{{ snapshot.public_title }} · {{ snapshot.display_name }}</p>
      </div>
      <div class="text-right">
        <p class="text-[10px] text-muted">{{ snapshot.season_progress }}</p>
        <p class="text-[10px] text-muted mt-1">{{ templateLabel }}</p>
      </div>
    </div>

    <div v-if="templateId === 'showcase'" class="grid grid-cols-2 gap-2 text-xs">
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">展示主题</p>
        <p class="text-accent mt-1">{{ snapshot.showcase_theme }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">主视觉摘要</p>
        <p class="text-accent mt-1">{{ snapshot.visual_summary }}</p>
      </div>
    </div>

    <div v-else-if="templateId === 'operational'" class="space-y-2 text-xs">
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">当前重点</p>
        <p class="mt-1">{{ snapshot.current_focus }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">本周目标</p>
        <p class="mt-1">{{ snapshot.weekly_goal }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">今日经营标签</p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span v-for="tag in snapshot.public_tags" :key="tag.id" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted">
            {{ tag.label }}
          </span>
          <span v-if="snapshot.public_tags.length === 0" class="text-[10px] text-muted">当前还没有公开经营标签。</span>
        </div>
      </div>
    </div>

    <div v-else-if="templateId === 'festival'" class="space-y-2 text-xs">
      <div class="grid grid-cols-2 gap-2">
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted">主题分</p>
          <p class="text-accent mt-1">{{ snapshot.theme_week?.score ?? 0 }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted">官方精选</p>
          <p class="text-accent mt-1">{{ snapshot.theme_week?.official_pick?.label || '暂无官方精选' }}</p>
        </div>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">推荐主题</p>
        <p class="mt-1">{{ snapshot.theme_week?.recommendations.join('、') || '当前没有额外推荐。' }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">来访摘要</p>
        <p class="mt-1">{{ snapshot.today_visit_summary }}</p>
      </div>
    </div>

    <div v-else-if="templateId === 'collection'" class="space-y-2 text-xs">
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">收藏网络</p>
        <p class="mt-1">
          {{ favoriteCountText }}
        </p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">同主题收藏</p>
        <p class="mt-1">
          {{ sameThemeText }}
        </p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">热门庄园提示</p>
        <p class="mt-1">{{ hotManorText }}</p>
      </div>
    </div>

    <div v-else class="space-y-2 text-xs">
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">故事主线</p>
        <p class="mt-1">{{ snapshot.current_focus }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">导览路线</p>
        <p class="mt-1">{{ snapshot.guide_routes[0]?.summary || '还没有设置主题路线。' }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-muted">留言痕迹</p>
        <p class="mt-1">{{ guestbookSummaryText }}</p>
      </div>
    </div>

    <div class="border border-accent/10 rounded-xs p-2 text-xs">
      <p class="text-[10px] text-muted">经营标签</p>
      <div class="flex flex-wrap gap-1 mt-1">
        <span
          v-for="tag in snapshot.public_tags"
          :key="tag.id"
          class="text-[10px] px-1.5 py-0.5 rounded-xs border"
          :class="tag.source === 'selected' ? 'border-accent/40 text-accent bg-accent/5' : 'border-accent/15 text-muted'"
        >
          {{ tag.label }}
        </span>
        <span v-if="snapshot.public_tags.length === 0" class="text-[10px] text-muted">当前还没有公开经营标签。</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { OnlineFavoriteOverviewResponse, OnlineManorSnapshot } from '@/utils/onlineProfileApi'

  const props = defineProps<{
    snapshot: OnlineManorSnapshot | null
    favoriteOverview?: OnlineFavoriteOverviewResponse | null
  }>()

  const templateId = computed(() => props.snapshot?.theme_week?.template_id || 'showcase')
  const templateLabel = computed(() => props.snapshot?.theme_week?.template_options.find(item => item.id === templateId.value)?.label || '展示类布局')
  const favoriteCountText = computed(() => {
    const overview = props.favoriteOverview
    if (!overview) return '当前还没有收藏数据。'
    return `收藏总览里有 ${overview.hot_manors.length} 个热门庄园，当前收藏了 ${overview.favorites.length} 座。`
  })
  const sameThemeText = computed(() => {
    const overview = props.favoriteOverview
    if (!overview || overview.same_theme_favorites.length === 0) return '当前没有同主题收藏列表。'
    return overview.same_theme_favorites.map(group => group.map(entry => entry.display_name).join('、')).join('；')
  })
  const guestbookSummaryText = computed(() => {
    const entry = props.snapshot?.guestbook_entries?.[0]
    if (!entry) return '当前还没有新的故事留言。'
    if (entry.kind === 'stamp') return `图章｜${entry.content}`
    if (entry.kind === 'signature') return `签名｜${entry.content}`
    return `${entry.author_display_name}：${entry.content}`
  })
  const hotManorText = computed(() => {
    const overview = props.favoriteOverview
    if (!overview || overview.hot_manors.length === 0) return '当前还没有热门庄园榜。'
    const first = overview.hot_manors[0]
    if (!first) return '当前还没有热门庄园榜。'
    return `${first.manor_username} 当前收藏 ${first.favorite_count} 次。`
  })
</script>
