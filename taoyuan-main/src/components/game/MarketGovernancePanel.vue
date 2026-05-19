<template>
  <div class="border border-danger/20 rounded-xs p-3 mb-4 bg-danger/5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm text-danger">官方调控</p>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded-xs border"
            :class="governance.sanction.blocked ? 'border-danger/30 text-danger' : 'border-success/30 text-success'"
          >
            {{ governance.sanction.blocked ? '交易受限' : '交易正常' }}
          </span>
        </div>
        <p class="text-xs text-muted mt-1 leading-5">{{ governance.bulletin }}</p>
      </div>
      <button class="btn !px-2 !py-1 text-[10px] shrink-0" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div class="grid gap-2 mt-3 md:grid-cols-3">
      <div class="border border-danger/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-danger mb-1">价格区间</p>
        <p class="text-[10px] text-muted">邻里寄售：{{ governance.price_bands.consignment.min_money }}-{{ governance.price_bands.consignment.max_money }}文</p>
        <p class="text-[10px] text-muted mt-1">节庆摊位：{{ governance.price_bands.festival.min_money }}-{{ governance.price_bands.festival.max_money }}文</p>
        <p class="text-[10px] text-muted mt-1">官站现金回款：{{ governance.price_bands.official_money.min_money }}-{{ governance.price_bands.official_money.max_money }}文</p>
      </div>
      <div class="border border-warning/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-warning mb-1">稀有品类限制</p>
        <p class="text-[10px] text-muted">{{ governance.rare_policy.summary }}</p>
        <p class="text-[10px] text-muted mt-1">屏蔽规则：{{ governance.rare_policy.blocked_rules.length > 0 ? governance.rare_policy.blocked_rules.join('、') : '无' }}</p>
      </div>
      <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-accent mb-1">今日反刷状态</p>
        <p class="text-[10px] text-muted">已操作 {{ governance.my_today.total_action_count }}/{{ governance.anti_abuse.daily_trade_action_limit }} 次</p>
        <p class="text-[10px] text-muted mt-1">资金波动 {{ governance.my_today.total_money_volume }}/{{ governance.anti_abuse.daily_money_volume_limit }} 文</p>
        <p class="text-[10px] text-muted mt-1">下次可操作 {{ governance.my_today.next_action_ready_in_seconds }} 秒后</p>
      </div>
    </div>

    <div class="grid gap-2 mt-3 md:grid-cols-2">
      <div class="border border-danger/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-danger mb-1">周期开关</p>
        <div class="space-y-1">
          <div v-for="source in governance.sources" :key="source.id" class="flex items-center justify-between gap-2 text-[10px]">
            <span class="text-muted">{{ source.label }}</span>
            <span :class="source.enabled ? 'text-success' : 'text-danger'">{{ source.enabled ? '开放' : '关闭' }}</span>
          </div>
        </div>
      </div>
      <div class="border border-danger/10 rounded-xs px-2 py-2 bg-bg/10">
        <p class="text-[10px] text-danger mb-1">制裁与限制</p>
        <p class="text-[10px] text-muted">挂单上限：{{ governance.anti_abuse.daily_consignment_listing_limit }} 次 / 日</p>
        <p class="text-[10px] text-muted mt-1">寄售购买上限：{{ governance.anti_abuse.daily_consignment_purchase_limit }} 次 / 日</p>
        <p class="text-[10px] text-muted mt-1">同物资在架上限：{{ governance.anti_abuse.duplicate_open_listing_limit }} 份</p>
        <p v-if="governance.sanction.blocked" class="text-[10px] text-danger mt-2">
          当前账号已被限制：{{ governance.sanction.reason || '已列入集市黑名单' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarketGovernancePublicSnapshot } from '@/utils/marketGovernanceApi'

defineProps<{
  governance: MarketGovernancePublicSnapshot
  loading?: boolean
}>()

defineEmits<{
  (event: 'refresh'): void
}>()
</script>
