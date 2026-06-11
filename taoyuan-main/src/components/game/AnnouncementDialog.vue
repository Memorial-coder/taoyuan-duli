<template>
  <div
    class="game-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 md:p-4"
    data-testid="announcement-dialog"
  >
    <div class="announcement-panel game-panel w-full max-w-2xl">
      <div class="announcement-header">
        <div class="min-w-0">
          <p class="text-[0.6875rem] text-accent">更新公告</p>
          <h2 class="announcement-title">{{ announcement.title }}</h2>
        </div>
        <div class="announcement-meta">
          <span v-if="announcement.version">v{{ announcement.version }}</span>
          <span v-if="announcement.priority">优先级 {{ announcement.priority }}</span>
        </div>
      </div>

      <div class="announcement-scroll">
        <img
          v-if="announcement.image_url"
          :src="announcement.image_url"
          :alt="announcement.title"
          class="announcement-image"
          loading="lazy"
        />
        <div class="announcement-rich" v-html="bodyHtml" />
      </div>

      <div class="announcement-actions">
        <Button class="announcement-button justify-center" :icon="Check" @click="$emit('close')">
          {{ announcement.button_texts.close || '知道了' }}
        </Button>
        <Button
          class="announcement-button announcement-button-update justify-center"
          :icon="RefreshCw"
          @click="$emit('saveUpdate')"
        >
          保存存档并更新
        </Button>
        <Button
          v-if="announcement.cta_url"
          class="announcement-button announcement-button-primary justify-center"
          :icon="ExternalLink"
          @click="$emit('cta')"
        >
          {{ announcement.cta_text || announcement.button_texts.cta || '查看详情' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Check, ExternalLink, RefreshCw } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { renderRichContent } from '@/utils/safeMarkdown'
  import type { TaoyuanAnnouncement } from '@/types/announcement'

  const props = defineProps<{
    announcement: TaoyuanAnnouncement
  }>()

  defineEmits<{
    close: []
    cta: []
    saveUpdate: []
  }>()

  const bodyHtml = computed(() => renderRichContent(props.announcement.body || ''))
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

  .announcement-meta span {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(200, 164, 92, 0.08);
    white-space: nowrap;
  }

  .announcement-scroll {
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
  }

  .announcement-image {
    display: block;
    width: 100%;
    max-height: 320px;
    object-fit: contain;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.18);
    margin-bottom: 12px;
  }

  .announcement-rich {
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

  .announcement-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
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

  .announcement-button-primary {
    background: rgba(200, 164, 92, 0.92);
    border-color: rgba(200, 164, 92, 0.92);
    color: rgb(var(--color-bg));
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

    .announcement-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
