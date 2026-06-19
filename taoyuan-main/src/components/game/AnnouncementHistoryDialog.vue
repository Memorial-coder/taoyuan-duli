<template>
  <Transition name="dialog-pop">
  <div
    v-if="open"
    class="game-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-bg/80 p-3 md:p-4"
    data-testid="announcement-history-dialog"
    @click.self="$emit('close')"
  >
    <div class="announcement-history game-panel w-full max-w-3xl">
      <div class="announcement-history-header">
        <div>
          <p class="text-[0.6875rem] text-accent">更新公告</p>
          <h2 class="text-base text-text leading-6">历史公告</h2>
        </div>
        <div class="flex gap-2">
          <Button class="justify-center" :icon="RefreshCw" :disabled="loading" @click="$emit('refresh')">
            {{ loading ? '刷新中...' : '刷新' }}
          </Button>
          <button type="button" class="announcement-close" aria-label="关闭历史公告" @click="$emit('close')">
            <X :size="16" />
          </button>
        </div>
      </div>

      <div v-if="error" class="text-xs text-danger leading-6">{{ error }}</div>
      <div v-else-if="loading && !announcements.length" class="text-xs text-muted leading-6">公告加载中...</div>
      <div v-else-if="!announcements.length" class="text-xs text-muted leading-6">暂无历史公告。</div>

      <div v-else class="announcement-history-list">
        <article
          v-for="announcement in announcements"
          :key="announcement.id"
          class="announcement-history-item"
          :class="{
            'announcement-history-item--collapsed': !isAnnouncementExpanded(announcement.id),
            'announcement-history-item--pinned': announcement.is_pinned,
          }"
          data-testid="announcement-history-item"
        >
          <button
            type="button"
            class="announcement-history-summary"
            :aria-expanded="isAnnouncementExpanded(announcement.id)"
            @click="toggleAnnouncement(announcement.id)"
          >
            <div class="announcement-history-summary-main">
              <h3 class="announcement-history-title">{{ announcement.title }}</h3>
              <p class="text-[0.6875rem] text-muted mt-1">
                {{ formatTime(announcement.published_at || announcement.created_at) }}
                <template v-if="announcement.version"> · v{{ announcement.version }}</template>
              </p>
            </div>
            <div class="announcement-history-summary-side">
              <span v-if="announcement.is_pinned" class="announcement-chip announcement-chip--pinned">置顶</span>
              <span v-if="announcement.template_type" class="announcement-chip">{{ templateLabel(announcement.template_type) }}</span>
              <span v-if="announcement.rewards.length" class="announcement-chip announcement-chip--reward">奖励 {{ announcement.rewards.length }}</span>
              <span class="announcement-history-toggle">
                {{ isAnnouncementExpanded(announcement.id) ? '收起' : '展开' }}
                <ChevronDown
                  :size="14"
                  class="announcement-history-toggle-icon"
                  :class="{ 'announcement-history-toggle-icon--open': isAnnouncementExpanded(announcement.id) }"
                />
              </span>
            </div>
          </button>

          <template v-if="isAnnouncementExpanded(announcement.id)">
            <img
              v-if="announcement.image_url"
              :src="announcement.image_url"
              :alt="announcement.title"
              class="announcement-history-image"
              loading="lazy"
            />
            <div class="announcement-history-rich taoyuan-rich-markdown" v-html="renderBody(announcement.body)" />
            <div v-if="announcement.rewards.length" class="announcement-history-rewards">
              <span>公告奖励</span>
              <strong>{{ announcement.rewards.map(rewardLabel).join(' / ') }}</strong>
            </div>
            <Button
              v-if="announcement.cta_url"
              class="announcement-history-cta justify-center"
              :icon="ExternalLink"
              @click="$emit('cta', announcement)"
            >
              {{ announcement.cta_text || announcement.button_texts.cta || '查看详情' }}
            </Button>
          </template>
        </article>
      </div>
    </div>
  </div>
  </Transition>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ChevronDown, ExternalLink, RefreshCw, X } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { renderRichContent } from '@/utils/safeMarkdown'
  import type { TaoyuanAnnouncement } from '@/types/announcement'

  const props = defineProps<{
    open: boolean
    announcements: TaoyuanAnnouncement[]
    loading: boolean
    error: string
  }>()

  defineEmits<{
    close: []
    refresh: []
    cta: [announcement: TaoyuanAnnouncement]
  }>()

  const expandedAnnouncementIds = ref<Set<string>>(new Set())

  const syncExpandedAnnouncements = (reset = false) => {
    const latestId = props.announcements[0]?.id || ''
    if (reset) {
      expandedAnnouncementIds.value = latestId ? new Set([latestId]) : new Set()
      return
    }

    const availableIds = new Set(props.announcements.map(announcement => announcement.id))
    const next = new Set([...expandedAnnouncementIds.value].filter(id => availableIds.has(id)))
    if (latestId) next.add(latestId)
    expandedAnnouncementIds.value = next
  }

  const isAnnouncementExpanded = (id: string) => expandedAnnouncementIds.value.has(id)

  const toggleAnnouncement = (id: string) => {
    const next = new Set(expandedAnnouncementIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    expandedAnnouncementIds.value = next
  }

  const renderBody = (body: string) => renderRichContent(body || '')

  const rewardLabel = (reward: TaoyuanAnnouncement['rewards'][number]) => {
    if (reward.type === 'money') return `铜钱 x${Number(reward.amount) || 0}`
    const quantity = Number(reward.quantity) || 0
    const quality = reward.type === 'item' || reward.type === 'seed' ? `/${reward.quality || 'normal'}` : ''
    return `${reward.type}:${reward.id || '-'} x${quantity}${quality}`
  }

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) return '未发布'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const templateLabel = (templateType: string) => {
    const labels: Record<string, string> = {
      version_update: '版本更新',
      maintenance: '停服维护',
      hotfix: '热修复',
      event_preview: '活动预告',
      compensation: '补偿说明',
    }
    return labels[templateType] || templateType
  }

  watch(
    () => props.open,
    open => {
      if (open) syncExpandedAnnouncements(true)
    },
    { immediate: true }
  )

  watch(
    () => props.announcements.map(announcement => announcement.id).join('|'),
    () => {
      if (props.open) syncExpandedAnnouncements(false)
    }
  )
</script>

<style scoped>
  .announcement-history {
    display: flex;
    max-height: 88vh;
    min-height: 0;
    flex-direction: column;
    gap: 14px;
    border-radius: 6px;
  }

  .announcement-history-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .announcement-close {
    display: inline-flex;
    width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(200, 164, 92, 0.22);
    border-radius: 4px;
    color: rgb(var(--color-muted));
  }

  .announcement-history-list {
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
    display: grid;
    gap: 12px;
  }

  .announcement-history-item {
    border: 1px solid var(--color-border-subtle);
    border-radius: 6px;
    background: var(--color-surface-raised);
    padding: 12px;
  }

  .announcement-history-item--pinned {
    border-color: rgba(244, 189, 96, 0.46);
    background: linear-gradient(180deg, rgba(244, 189, 96, 0.12), rgba(244, 189, 96, 0.04)), var(--color-surface-raised);
  }

  .announcement-history-item--collapsed {
    background: var(--color-surface-muted);
  }

  .announcement-history-item--pinned.announcement-history-item--collapsed {
    background: linear-gradient(180deg, rgba(244, 189, 96, 0.1), rgba(244, 189, 96, 0.03)), var(--color-surface-muted);
  }

  .announcement-history-summary {
    display: flex;
    width: 100%;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
    color: inherit;
  }

  .announcement-history-summary-main {
    min-width: 0;
    flex: 1 1 auto;
  }

  .announcement-history-summary-side {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
  }

  .announcement-history-title {
    color: rgb(var(--color-text));
    font-size: 0.9375rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-chip {
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 999px;
    color: rgb(var(--color-accent));
    font-size: 0.6875rem;
    padding: 2px 8px;
    white-space: nowrap;
  }

  .announcement-chip--reward {
    border-color: rgba(104, 211, 145, 0.28);
    color: rgb(var(--color-success));
    background: rgba(104, 211, 145, 0.1);
  }

  .announcement-chip--pinned {
    border-color: rgba(244, 189, 96, 0.38);
    color: #ffd88a;
    background: rgba(244, 189, 96, 0.14);
  }

  .announcement-history-toggle {
    display: inline-flex;
    min-height: 28px;
    align-items: center;
    gap: 4px;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 4px;
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
    padding: 3px 8px;
    white-space: nowrap;
  }

  .announcement-history-toggle-icon {
    flex: 0 0 auto;
    transition: transform 160ms ease;
  }

  .announcement-history-toggle-icon--open {
    transform: rotate(180deg);
  }

  .announcement-history-image {
    display: block;
    width: 100%;
    max-height: 240px;
    object-fit: contain;
    margin-top: 10px;
    border-radius: 4px;
    border: 1px solid rgba(200, 164, 92, 0.12);
  }

  .announcement-history-rich {
    margin-top: 10px;
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    line-height: 1.75;
    word-break: break-word;
  }

  .announcement-history-rich :deep(p),
  .announcement-history-rich :deep(ul),
  .announcement-history-rich :deep(ol),
  .announcement-history-rich :deep(blockquote),
  .announcement-history-rich :deep(h1),
  .announcement-history-rich :deep(h2),
  .announcement-history-rich :deep(h3),
  .announcement-history-rich :deep(pre),
  .announcement-history-rich :deep(table) {
    margin: 0 0 10px;
  }

  .announcement-history-rich :deep(ul),
  .announcement-history-rich :deep(ol) {
    padding-left: 18px;
  }

  .announcement-history-rich :deep(img) {
    max-width: 100%;
    max-height: 260px;
    object-fit: contain;
  }

  .announcement-history-rewards {
    display: grid;
    gap: 4px;
    margin-top: 10px;
    border: 1px solid rgba(104, 211, 145, 0.22);
    border-radius: 4px;
    background: rgba(104, 211, 145, 0.08);
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
    padding: 8px;
  }

  .announcement-history-rewards strong {
    color: rgb(var(--color-success));
    font-size: 0.75rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-history-cta {
    margin-top: 10px;
    min-height: 36px;
  }

  @media (max-width: 520px) {
    .announcement-history {
      max-height: 90vh;
    }

    .announcement-history-header {
      align-items: stretch;
      flex-direction: column;
    }

    .announcement-history-summary {
      gap: 8px;
    }

    .announcement-history-summary-side {
      align-items: flex-end;
      flex-direction: column;
      gap: 6px;
    }
  }
</style>
