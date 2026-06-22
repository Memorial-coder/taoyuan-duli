<template>
  <div class="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]" data-testid="online-cohabitation-fund-panel">
    <div class="game-panel-muted p-3">
      <div class="flex items-center gap-2 text-accent">
        <Wallet :size="13" />
        <p class="text-sm">共同基金</p>
      </div>
      <p class="mt-3 text-3xl font-semibold text-accent">{{ balance }}</p>
      <p class="mt-2 text-xs leading-5 text-muted">个人铜币不会在这里合并；余额只来自共同基金流水。</p>
      <div class="mt-3 grid gap-2 text-xs">
        <p class="border border-accent/10 bg-black/10 p-2 text-muted">注资：{{ contributionEnabled ? '已开放' : '未开放' }}</p>
        <p class="border border-accent/10 bg-black/10 p-2 text-muted">消费：{{ spendEnabled ? '已开放' : '暂缓' }}</p>
        <p class="border border-accent/10 bg-black/10 p-2 text-muted">中额支出：{{ mediumSpendEnabled ? '已开放' : '需权限' }}</p>
        <p class="border border-accent/10 bg-black/10 p-2 text-muted">大额草案：{{ largeSpendDraftEnabled ? '已开放' : '需权限' }}</p>
      </div>
      <div class="mt-3 border border-accent/10 bg-black/10 p-2">
        <p class="text-xs text-accent">个人注资</p>
        <div class="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            :value="contributionAmount"
            type="number"
            min="1"
            step="1"
            class="online-input text-xs"
            data-testid="online-cohabitation-fund-contribution-input"
            @input="emit('set-contribution-amount', numberFromInput($event))"
          >
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            :disabled="!canUseContribution || actionLoading"
            data-testid="online-cohabitation-fund-contribution-submit"
            @click="emit('contribute')"
          >
            注入共同基金
          </button>
        </div>
      </div>
      <div class="mt-3 border border-accent/10 bg-black/10 p-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">自动购买</p>
          <span class="text-[0.625rem] text-muted">白名单</span>
        </div>
        <div class="mt-2 grid gap-2">
          <button
            v-for="option in purchaseOptions"
            :key="option.targetRef"
            type="button"
            class="online-action-btn online-action-btn--compact justify-between"
            :disabled="!canUsePurchase(option) || actionLoading"
            :data-testid="`online-cohabitation-fund-buy-${option.itemId}`"
            @click="emit('buy', option)"
          >
            <span class="inline-flex min-w-0 items-center gap-1.5">
              <ItemIcon :item="getItemById(option.itemId)" size="xs" :show-badge="false" />
              <span class="truncate">{{ option.label }}</span>
            </span>
            <span>{{ option.amount }} 文</span>
          </button>
        </div>
      </div>
      <div class="mt-3 border border-accent/10 bg-black/10 p-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">中额预算</p>
          <span class="text-[0.625rem] text-muted">{{ canSpendMedium ? '已授权' : '需授权' }}</span>
        </div>
        <div class="mt-2 grid gap-2">
          <button
            v-for="option in mediumSpendOptions"
            :key="option.purpose"
            type="button"
            class="online-action-btn online-action-btn--compact justify-between"
            :disabled="!canUseMediumSpend(option) || actionLoading"
            :data-testid="`online-cohabitation-fund-medium-${option.purpose}`"
            @click="emit('spend-medium', option)"
          >
            <span>{{ option.label }}</span>
            <span>{{ option.amount }} 文</span>
          </button>
        </div>
      </div>
      <div class="mt-3 border border-accent/10 bg-black/10 p-2" data-testid="online-cohabitation-fund-large-draft-form">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">大额草案</p>
          <span class="text-[0.625rem] text-muted">{{ largeSpendRequiresBoth ? '双方确认' : '安全阀关闭' }}</span>
        </div>
        <div class="mt-2 grid gap-2">
          <select
            :value="largeDraftPurpose"
            class="online-select text-xs"
            data-testid="online-cohabitation-fund-large-draft-purpose"
            @change="selectLargeDraftPurpose"
          >
            <option
              v-for="option in largeSpendOptions"
              :key="option.purpose"
              :value="option.purpose"
            >
              {{ option.label }}
            </option>
          </select>
          <input
            :value="largeDraftAmount"
            type="number"
            :min="largeDraftMinAmount"
            :max="selectedLargeSpendOption?.maxAmount"
            step="1"
            class="online-input text-xs"
            data-testid="online-cohabitation-fund-large-draft-amount"
            placeholder="金额"
            @input="emit('set-large-draft-amount', numberFromInput($event))"
          >
          <input
            :value="largeDraftTargetRef"
            class="online-input text-xs"
            data-testid="online-cohabitation-fund-large-draft-target"
            maxlength="80"
            :placeholder="largeDraftTargetPlaceholder"
            @input="emit('set-large-draft-target-ref', textFromInput($event))"
          >
          <div
            v-if="selectedLargeSpendOption"
            class="grid gap-2 text-[0.625rem] sm:grid-cols-2"
            data-testid="online-cohabitation-fund-large-draft-risk-summary"
          >
            <span class="border border-accent/10 bg-bg/30 px-2 py-1 text-muted">
              {{ selectedLargeSpendOption.category }} · 上限 {{ selectedLargeSpendOption.maxAmount }}
            </span>
            <span class="border px-2 py-1" :class="selectedLargeSpendIsHighRisk ? 'border-amber-300/20 bg-amber-500/10 text-amber-100' : 'border-accent/10 bg-bg/30 text-muted'">
              {{ largeSpendPolicyLabel }}
            </span>
          </div>
          <input
            :value="largeDraftMemo"
            class="online-input text-xs"
            data-testid="online-cohabitation-fund-large-draft-memo"
            maxlength="80"
            placeholder="备注（可选）"
            @input="emit('set-large-draft-memo', textFromInput($event))"
          >
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            :disabled="!canCreateLargeDraft || actionLoading"
            data-testid="online-cohabitation-fund-large-draft-submit"
            @click="emit('create-large-draft')"
          >
            <ClipboardList :size="12" />
            创建确认草案
          </button>
        </div>
        <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ largeSpendExecutionSummary }}</p>
      </div>
      <p v-if="actionMessage" class="mt-3 text-[0.625rem] leading-4" :class="actionOk ? 'text-emerald-200' : 'text-red-100'">
        {{ actionMessage }}
      </p>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
  import { ClipboardList, Wallet } from 'lucide-vue-next'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { getItemById } from '@/data/items'

  type FundMediumSpendPurpose = 'processing_materials' | 'building_materials'
  type FundMediumSpendOption = {
    label: string
    purpose: FundMediumSpendPurpose
    targetRef: string
    amount: number
    maxAmount: number
  }
  type FundPurchaseOption = {
    label: string
    itemId: string
    targetRef: string
    quantity: number
    amount: number
    purpose: string
  }
  type FundLargeSpendPurpose = 'family_building' | 'manor_expansion' | 'rare_item_purchase' | 'limited_decoration' | 'shared_decoration_removal' | 'family_major_event'
  type FundLargeSpendOption = {
    label: string
    purpose: FundLargeSpendPurpose
    category: string
    maxAmount: number
    confirmationRequired: boolean
  }
  type PurchaseGate = (option: FundPurchaseOption) => boolean
  type MediumSpendGate = (option: FundMediumSpendOption) => boolean

  withDefaults(defineProps<{
    balance: number
    contributionEnabled?: boolean
    spendEnabled?: boolean
    mediumSpendEnabled?: boolean
    largeSpendDraftEnabled?: boolean
    canSpendMedium?: boolean
    largeSpendRequiresBoth?: boolean
    actionLoading?: boolean
    contributionAmount: number
    canUseContribution: boolean
    purchaseOptions: FundPurchaseOption[]
    canUsePurchase: PurchaseGate
    mediumSpendOptions: FundMediumSpendOption[]
    canUseMediumSpend: MediumSpendGate
    largeDraftPurpose: FundLargeSpendPurpose
    largeDraftAmount: number
    largeDraftTargetRef: string
    largeDraftMemo: string
    largeSpendOptions: FundLargeSpendOption[]
    largeDraftMinAmount: number
    selectedLargeSpendOption: FundLargeSpendOption | null
    selectedLargeSpendIsHighRisk: boolean
    largeSpendPolicyLabel: string
    largeSpendExecutionSummary: string
    largeDraftTargetPlaceholder: string
    canCreateLargeDraft: boolean
    actionMessage?: string
    actionOk?: boolean
  }>(), {
    contributionEnabled: false,
    spendEnabled: false,
    mediumSpendEnabled: false,
    largeSpendDraftEnabled: false,
    canSpendMedium: false,
    largeSpendRequiresBoth: false,
    actionLoading: false,
    actionMessage: '',
    actionOk: false,
  })

  const emit = defineEmits<{
    'set-contribution-amount': [value: number]
    contribute: []
    buy: [option: FundPurchaseOption]
    'spend-medium': [option: FundMediumSpendOption]
    'set-large-draft-purpose': [value: FundLargeSpendPurpose]
    'large-draft-purpose-change': []
    'set-large-draft-amount': [value: number]
    'set-large-draft-target-ref': [value: string]
    'set-large-draft-memo': [value: string]
    'create-large-draft': []
  }>()

  const textFromInput = (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value
  const numberFromInput = (event: Event) => Number(textFromInput(event))

  const selectLargeDraftPurpose = (event: Event) => {
    emit('set-large-draft-purpose', textFromInput(event) as FundLargeSpendPurpose)
    emit('large-draft-purpose-change')
  }
</script>
