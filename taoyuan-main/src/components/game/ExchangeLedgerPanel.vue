<template>
  <div class="border border-success/20 rounded-xs p-3 mb-4 bg-success/5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm text-success">交换记录与声誉</p>
          <span v-if="ledger.summary" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-success/20 text-success">
            {{ ledger.summary.trust_level.label }}
          </span>
        </div>
        <p class="text-xs text-muted mt-1 leading-5">{{ ledger.bulletin }}</p>
      </div>
      <button class="btn !px-2 !py-1 text-[10px] shrink-0" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="ledger.summary" class="grid gap-2 mt-3 md:grid-cols-4">
      <div class="border border-success/15 rounded-xs px-2 py-2 bg-bg/20">
        <p class="text-[10px] text-muted">已完成交换</p>
        <p class="text-sm text-success mt-0.5">{{ ledger.summary.total_completed_count }} 次</p>
        <p class="text-[10px] text-muted mt-1">总记录 {{ ledger.summary.total_entry_count }} 条</p>
      </div>
      <div class="border border-warning/15 rounded-xs px-2 py-2 bg-warning/5">
        <p class="text-[10px] text-muted">异常与回收</p>
        <p class="text-sm text-warning mt-0.5">{{ ledger.summary.anomaly_count }} 条</p>
        <p class="text-[10px] text-muted mt-1">含取消 / 过期 / 回收</p>
      </div>
      <div class="border border-accent/15 rounded-xs px-2 py-2 bg-accent/5">
        <p class="text-[10px] text-muted">支出 / 回款</p>
        <p class="text-sm text-accent mt-0.5">{{ ledger.summary.total_money_spent }} / {{ ledger.summary.total_money_received }}文</p>
        <p class="text-[10px] text-muted mt-1">累计波动 {{ ledger.summary.total_money_volume }} 文</p>
      </div>
      <div class="border border-danger/15 rounded-xs px-2 py-2 bg-danger/5">
        <p class="text-[10px] text-muted">我的争议</p>
        <p class="text-sm text-danger mt-0.5">{{ ledger.summary.total_dispute_count }} 条</p>
        <p class="text-[10px] text-muted mt-1">待处理 {{ ledger.summary.open_dispute_count }} 条</p>
      </div>
    </div>

    <div v-if="ledger.summary" class="grid gap-2 mt-3 md:grid-cols-3">
      <div class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-success mb-1">常用交换来源</p>
        <div v-if="ledger.summary.source_ranks.length === 0" class="text-[10px] text-muted">当前还没有可统计的交换来源。</div>
        <div v-for="entry in ledger.summary.source_ranks" :key="entry.source" class="text-[10px] text-muted mb-1">
          {{ entry.label }} · {{ entry.count }} 次
        </div>
      </div>
      <div class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-success mb-1">常往对象</p>
        <div v-if="ledger.summary.counterparty_ranks.length === 0" class="text-[10px] text-muted">当前还没有稳定往来对象。</div>
        <div v-for="entry in ledger.summary.counterparty_ranks" :key="entry.key" class="text-[10px] text-muted mb-1">
          {{ entry.label }} · {{ entry.count }} 次
        </div>
      </div>
      <div class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-success mb-1">最常交易品类</p>
        <div v-if="ledger.summary.category_ranks.length === 0" class="text-[10px] text-muted">当前还没有稳定品类分布。</div>
        <div v-for="entry in ledger.summary.category_ranks" :key="entry.label" class="text-[10px] text-muted mb-1">
          {{ entry.label }} · {{ entry.count }} 次
        </div>
      </div>
    </div>

    <div class="mt-3 border border-success/10 rounded-xs p-2 bg-bg/20">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-[10px] text-success">最近交换流水</p>
        <span class="text-[10px] text-muted">{{ ledger.entries.length }} 条</span>
      </div>
      <div v-if="ledger.entries.length === 0" class="text-[10px] text-muted">当前还没有可回看的交换记录。</div>
      <div v-else class="space-y-2">
        <div v-for="entry in ledger.entries.slice(0, 8)" :key="entry.id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <p class="text-xs text-text">{{ entry.title }}</p>
                <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-success/20 text-success">{{ entry.source_label }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/10 text-muted">{{ entry.status_label }}</span>
              </div>
              <p class="text-[10px] text-muted mt-1">
                {{ entry.event_label }} · {{ entry.counterparty_label || '系统摊位' }} · {{ entry.price_label }}
              </p>
              <p class="text-[10px] text-muted mt-1">
                交出 {{ formatBundle(entry.offered_entries) }} · 到账 {{ formatBundle(entry.received_entries) }}
              </p>
              <p v-if="entry.category_labels.length > 0" class="text-[10px] text-muted mt-1">
                品类：{{ entry.category_labels.join('、') }}
              </p>
              <p v-if="entry.open_dispute_count > 0" class="text-[10px] text-danger mt-1">
                当前有 {{ entry.open_dispute_count }} 条待处理争议
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-[10px] text-muted">{{ formatTime(entry.created_at) }}</p>
              <button
                v-if="entry.reportable"
                class="btn !px-2 !py-1 text-[10px] mt-2"
                :disabled="running"
                @click="submitDispute(entry)"
              >
                {{ running ? '提交中...' : '上报争议' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ledger.my_disputes.length > 0" class="mt-3 border border-danger/10 rounded-xs p-2 bg-danger/5">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-[10px] text-danger">我的争议记录</p>
        <span class="text-[10px] text-muted">{{ ledger.my_disputes.length }} 条</span>
      </div>
      <div class="space-y-1.5">
        <div v-for="dispute in ledger.my_disputes.slice(0, 4)" :key="dispute.id" class="border border-danger/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-text">{{ dispute.event_label }}</p>
            <span class="text-[10px] text-muted">{{ dispute.status === 'open' ? '待处理' : dispute.status === 'resolved' ? '已解决' : '已驳回' }}</span>
          </div>
          <p class="text-[10px] text-danger mt-1">{{ dispute.reason_label }}</p>
          <p v-if="dispute.note" class="text-[10px] text-muted mt-1">{{ dispute.note }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getItemById } from '@/data'
import type { ExchangeLedgerBundleEntry, ExchangeLedgerEntry, ExchangeLedgerOverview } from '@/utils/exchangeLedgerApi'

const props = defineProps<{
  ledger: ExchangeLedgerOverview
  loading?: boolean
  running?: boolean
}>()

const emit = defineEmits<{
  (event: 'refresh'): void
  (event: 'report-dispute', payload: { entryId: string; reasonCode: string; note: string }): void
}>()

const formatBundle = (entries: ExchangeLedgerBundleEntry[]) => {
  if (!Array.isArray(entries) || entries.length === 0) return '无'
  return entries
    .map(entry => {
      if (entry.type === 'money') return `${entry.amount}文`
      if (entry.type === 'ticket') return `${entry.ticket_type}券×${entry.quantity}`
      const def = getItemById(entry.item_id)
      return `${def?.name ?? entry.item_id}×${entry.quantity}`
    })
    .join('、')
}

const formatTime = (unixSeconds: number) => {
  const date = new Date(Number(unixSeconds || 0) * 1000)
  if (Number.isNaN(date.getTime())) return '--:--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

const submitDispute = (entry: ExchangeLedgerEntry) => {
  const defaultReason = props.ledger.reason_options[0]?.id ?? 'other'
  emit('report-dispute', {
    entryId: entry.id,
    reasonCode: defaultReason,
    note: `${entry.event_label}：请帮我复核这条交换记录。`,
  })
}
</script>
