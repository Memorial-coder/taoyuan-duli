<template>
  <div class="game-modal-overlay fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-4" @click.self="emit('close')">
    <div class="game-panel w-full max-w-4xl max-h-[86vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] tracking-[0.24em] text-accent/70">睡后摘要</p>
          <p class="mt-1 text-lg text-accent">{{ digest.title }}</p>
          <p class="mt-1 text-xs text-muted">{{ formatDayTag(digest.dayTag) }}</p>
        </div>
        <button class="text-muted transition-colors hover:text-text" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <div v-if="digest.alerts.length > 0" class="mt-4 space-y-2 rounded-xs border border-warning/20 bg-warning/5 px-4 py-3">
        <div class="flex items-center gap-2 text-[11px] text-warning">
          <AlertTriangle :size="13" />
          <span>风险与异常</span>
        </div>
        <p
          v-for="alert in digest.alerts"
          :key="`daily-digest-alert-${alert.message}`"
          class="text-xs leading-5"
          :class="getToneTextClass(alert.tone)"
        >
          {{ alert.message }}
        </p>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div
          v-for="section in digest.sections"
          :key="`daily-digest-section-${section.sectionId}`"
          class="rounded-xs border px-4 py-4"
          :class="getToneShellClass(section.tone)"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-[11px]" :class="getToneTextClass(section.tone)">{{ section.title }}</p>
            <span class="text-[10px] text-muted">本次摘要</span>
          </div>
          <p class="mt-2 text-sm text-text leading-6">{{ section.headline }}</p>
          <div v-if="section.detailLines.length > 0" class="mt-3 space-y-1">
            <p
              v-for="line in section.detailLines"
              :key="`daily-digest-detail-${section.sectionId}-${line}`"
              class="text-xs text-muted leading-5"
            >
              - {{ line }}
            </p>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-2 md:flex-row md:justify-end">
        <Button class="w-full justify-center md:w-auto" @click="emit('close')">继续晨间</Button>
        <Button class="w-full justify-center !bg-accent !text-bg md:w-auto" @click="emit('open-record-center')">查看记录中心</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { AlertTriangle, X } from 'lucide-vue-next'
  import type { DailyDigestEntry } from '@/types'
  import { formatRecordDayTag } from '@/stores/usePlayerRecordCenterStore'

  const props = defineProps<{
    digest: DailyDigestEntry
  }>()

  const emit = defineEmits<{
    close: []
    'open-record-center': []
  }>()

  const formatDayTag = (dayTag: string) => formatRecordDayTag(dayTag)

  const getToneShellClass = (tone: string) => {
    if (tone === 'danger') return 'border-danger/20 bg-danger/5'
    if (tone === 'warning') return 'border-warning/20 bg-warning/5'
    if (tone === 'success') return 'border-success/20 bg-success/5'
    return 'border-accent/10 bg-bg/50'
  }

  const getToneTextClass = (tone: string) => {
    if (tone === 'danger') return 'text-danger'
    if (tone === 'warning') return 'text-warning'
    if (tone === 'success') return 'text-success'
    return 'text-accent'
  }

  const digest = props.digest
</script>
