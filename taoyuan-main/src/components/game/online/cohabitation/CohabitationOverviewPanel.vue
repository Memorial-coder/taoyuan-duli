<template>
  <div class="space-y-3" data-testid="online-cohabitation-overview-summary">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-testid="online-cohabitation-overview-main-cards">
      <article class="game-panel-muted p-3" data-testid="online-cohabitation-overview-contract-card">
        <div class="flex items-center gap-2 text-accent">
          <HeartHandshake :size="13" />
          <p class="text-sm">契约状态</p>
        </div>
        <p class="mt-3 text-lg text-text">{{ contractStatusLabel }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">{{ contractDetailLabel }}</p>
      </article>

      <article class="game-panel-muted p-3" data-testid="online-cohabitation-overview-fund-card">
        <div class="flex items-center gap-2 text-accent">
          <Wallet :size="13" />
          <p class="text-sm">共同基金</p>
        </div>
        <p class="mt-3 text-lg text-text">{{ fundBalanceLabel }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">{{ fundDetailLabel }}</p>
      </article>

      <article class="game-panel-muted p-3" data-testid="online-cohabitation-overview-warehouse-card">
        <div class="flex items-center gap-2 text-accent">
          <Package :size="13" />
          <p class="text-sm">共同仓库</p>
        </div>
        <p class="mt-3 text-lg text-text">{{ warehouseSummaryLabel }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">{{ warehouseDetailLabel }}</p>
      </article>

      <article class="game-panel-muted p-3" data-testid="online-cohabitation-overview-risk-card">
        <div class="flex items-center gap-2 text-accent">
          <ShieldCheck :size="13" />
          <p class="text-sm">今日建议 / 风险待办</p>
        </div>
        <p class="mt-3 text-lg text-text">{{ riskTodoLabel }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">{{ recommendationLabel }}</p>
      </article>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
  import {
    HeartHandshake,
    Package,
    ShieldCheck,
    Wallet,
  } from 'lucide-vue-next'

  defineProps<{
    contractStatusLabel: string
    contractDetailLabel: string
    fundBalanceLabel: string
    fundDetailLabel: string
    warehouseSummaryLabel: string
    warehouseDetailLabel: string
    riskTodoLabel: string
    recommendationLabel: string
  }>()
</script>
