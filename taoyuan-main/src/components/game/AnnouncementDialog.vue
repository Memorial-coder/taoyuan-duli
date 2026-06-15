<template>
  <div
    v-if="primaryAnnouncement"
    class="game-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 md:p-4"
    data-testid="announcement-dialog"
  >
    <div class="announcement-panel game-panel w-full max-w-2xl">
      <div class="announcement-header">
        <div class="min-w-0">
          <p class="text-[0.6875rem] text-accent">更新公告</p>
          <h2 class="announcement-title">
            {{ announcements.length > 1 ? `未读公告（${announcements.length}条）` : primaryAnnouncement.title }}
          </h2>
        </div>
        <div class="announcement-meta">
          <span v-if="announcements.length > 1">按优先级展示</span>
          <span v-else-if="primaryAnnouncement.version">v{{ primaryAnnouncement.version }}</span>
          <span v-if="primaryAnnouncement.priority">优先级 {{ primaryAnnouncement.priority }}</span>
        </div>
      </div>

      <div class="announcement-scroll">
        <article
          v-for="announcement in announcements"
          :key="announcement.id"
          class="announcement-item"
          :class="{ 'announcement-item--collapsed': !isAnnouncementExpanded(announcement.id) }"
          data-testid="announcement-popup-item"
        >
          <button
            type="button"
            class="announcement-summary"
            :aria-expanded="isAnnouncementExpanded(announcement.id)"
            @click="toggleAnnouncement(announcement.id)"
          >
            <div class="announcement-summary-main">
              <h3 class="announcement-item-title">{{ announcement.title }}</h3>
              <p class="announcement-item-meta">
                {{ formatTime(announcement.published_at || announcement.created_at) }}
                <template v-if="announcement.version"> · v{{ announcement.version }}</template>
              </p>
            </div>
            <div class="announcement-summary-side">
              <span v-if="announcement.template_type" class="announcement-chip">{{ templateLabel(announcement.template_type) }}</span>
              <span v-if="announcement.rewards.length" class="announcement-chip announcement-chip--reward">奖励 {{ announcement.rewards.length }}</span>
              <span class="announcement-toggle">
                {{ isAnnouncementExpanded(announcement.id) ? '收起' : '展开' }}
                <ChevronDown
                  :size="14"
                  class="announcement-toggle-icon"
                  :class="{ 'announcement-toggle-icon--open': isAnnouncementExpanded(announcement.id) }"
                />
              </span>
            </div>
          </button>

          <template v-if="isAnnouncementExpanded(announcement.id)">
            <img
              v-if="announcement.image_url"
              :src="announcement.image_url"
              :alt="announcement.title"
              class="announcement-image"
              loading="lazy"
            />
            <div class="announcement-rich taoyuan-rich-markdown" v-html="renderBody(announcement.body)" />
            <div v-if="announcement.rewards.length" class="announcement-rewards" data-testid="announcement-popup-rewards">
              <span>{{ rewardHintLabel }}</span>
              <strong>{{ announcement.rewards.map(rewardLabel).join(' / ') }}</strong>
            </div>
            <Button
              v-if="announcement.cta_url"
              class="announcement-item-cta justify-center"
              :icon="ExternalLink"
              @click="$emit('cta', announcement)"
            >
              {{ announcement.cta_text || announcement.button_texts.cta || '查看详情' }}
            </Button>
          </template>
        </article>
      </div>

      <div class="announcement-actions">
        <Button class="announcement-button justify-center" :icon="Check" :disabled="closing" @click="$emit('close')">
          {{ closeButtonLabel }}
        </Button>
        <Button
          class="announcement-button announcement-button-update justify-center"
          :icon="RefreshCw"
          :disabled="closing"
          @click="$emit('saveUpdate')"
        >
          保存存档并更新
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Check, ChevronDown, ExternalLink, RefreshCw } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { renderRichContent } from '@/utils/safeMarkdown'
  import type { TaoyuanAnnouncement } from '@/types/announcement'

  const props = defineProps<{
    announcements: TaoyuanAnnouncement[]
    closing?: boolean
    claimRewards?: boolean
  }>()

  defineEmits<{
    close: []
    cta: [announcement: TaoyuanAnnouncement]
    saveUpdate: []
  }>()

  const expandedAnnouncementIds = ref<Set<string>>(new Set())
  const primaryAnnouncement = computed(() => props.announcements[0] || null)
  const hasAnnouncementRewards = computed(() => props.announcements.some(announcement => announcement.rewards.length > 0))
  const shouldClaimRewards = computed(() => hasAnnouncementRewards.value && props.claimRewards !== false)
  const rewardHintLabel = computed(() => (
    shouldClaimRewards.value ? '点击“知道并领取”后发放' : '服务端存档登录后可领取'
  ))
  const closeButtonLabel = computed(() => {
    if (props.closing && hasAnnouncementRewards.value) return shouldClaimRewards.value ? '领取中...' : '关闭中...'
    return shouldClaimRewards.value ? '知道并领取' : (primaryAnnouncement.value?.button_texts.close || '知道了')
  })

  const syncExpandedAnnouncements = () => {
    const firstId = props.announcements[0]?.id || ''
    expandedAnnouncementIds.value = firstId ? new Set([firstId]) : new Set()
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
    () => props.announcements.map(announcement => announcement.id).join('|'),
    syncExpandedAnnouncements,
    { immediate: true }
  )
</script>

<style scoped>
  .announcement-panel {
    display: flex;
    max-height: min(88vh, 720px);
    min-height: 0;
    flex-direction: column;
    gap: 14px;
    border-radius: 6px;
  }

  .announcement-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
  }

  .announcement-title {
    margin-top: 4px;
    color: rgb(var(--color-text));
    font-size: 1rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
  }

  .announcement-meta span,
  .announcement-chip {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(200, 164, 92, 0.08);
    white-space: nowrap;
  }

  .announcement-chip {
    color: rgb(var(--color-accent));
    font-size: 0.6875rem;
  }

  .announcement-chip--reward {
    border-color: rgba(104, 211, 145, 0.28);
    color: rgb(var(--color-success));
    background: rgba(104, 211, 145, 0.1);
  }

  .announcement-scroll {
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
    display: grid;
    gap: 10px;
  }

  .announcement-item {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.14);
    padding: 12px;
  }

  .announcement-item--collapsed {
    background: rgba(0, 0, 0, 0.08);
  }

  .announcement-summary {
    display: flex;
    width: 100%;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
    color: inherit;
  }

  .announcement-summary-main {
    min-width: 0;
    flex: 1 1 auto;
  }

  .announcement-summary-side {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
  }

  .announcement-item-title {
    color: rgb(var(--color-text));
    font-size: 0.9375rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-item-meta {
    margin-top: 4px;
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
    line-height: 1.4;
  }

  .announcement-toggle {
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

  .announcement-toggle-icon {
    flex: 0 0 auto;
    transition: transform 160ms ease;
  }

  .announcement-toggle-icon--open {
    transform: rotate(180deg);
  }

  .announcement-image {
    display: block;
    width: 100%;
    max-height: 320px;
    object-fit: contain;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.18);
    margin: 12px 0;
  }

  .announcement-rich {
    margin-top: 10px;
    color: rgb(var(--color-text));
    font-size: 0.8125rem;
    line-height: 1.8;
    word-break: break-word;
  }

  .announcement-rich :deep(p),
  .announcement-rich :deep(ul),
  .announcement-rich :deep(ol),
  .announcement-rich :deep(blockquote),
  .announcement-rich :deep(figure),
  .announcement-rich :deep(h1),
  .announcement-rich :deep(h2),
  .announcement-rich :deep(h3),
  .announcement-rich :deep(pre),
  .announcement-rich :deep(table) {
    margin: 0 0 10px;
  }

  .announcement-rich :deep(ul),
  .announcement-rich :deep(ol) {
    padding-left: 18px;
  }

  .announcement-rich :deep(a) {
    color: rgb(var(--color-accent));
    text-decoration: underline;
  }

  .announcement-rich :deep(img) {
    display: block;
    max-width: 100%;
    max-height: 360px;
    object-fit: contain;
    border-radius: 4px;
    margin: 8px 0;
  }

  .announcement-rich :deep(table) {
    width: 100%;
    border-collapse: collapse;
  }

  .announcement-rich :deep(th),
  .announcement-rich :deep(td) {
    border: 1px solid rgba(200, 164, 92, 0.16);
    padding: 6px 8px;
    vertical-align: top;
  }

  .announcement-rewards {
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

  .announcement-rewards strong {
    color: rgb(var(--color-success));
    font-size: 0.75rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-item-cta {
    margin-top: 10px;
    min-height: 36px;
  }

  .announcement-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
  }

  .announcement-button {
    min-width: 0;
    min-height: 40px;
    white-space: normal;
  }

  .announcement-button-update {
    border-color: rgba(104, 211, 145, 0.5);
    background: rgba(104, 211, 145, 0.12);
    color: rgb(var(--color-success));
  }

  @media (max-width: 520px) {
    .announcement-panel {
      max-height: 90vh;
      gap: 12px;
    }

    .announcement-header {
      grid-template-columns: 1fr;
    }

    .announcement-meta {
      justify-content: flex-start;
    }

    .announcement-summary {
      gap: 8px;
    }

    .announcement-summary-side {
      align-items: flex-end;
      flex-direction: column;
      gap: 6px;
    }

    .announcement-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
