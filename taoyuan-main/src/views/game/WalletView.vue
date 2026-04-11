<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Wallet :size="14" />
        <span>钱袋</span>
      </div>
      <span class="text-xs text-muted">{{ unlockedCount }}/{{ WALLET_ITEMS.length }}</span>
    </div>
    <p class="text-xs text-muted mb-3">永久被动加成，满足条件后自动解锁。</p>

    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-sm text-accent">
          <TrendingUp :size="14" />
          <span>后期经济观测</span>
        </div>
        <span class="text-xs" :class="economyRiskClass">{{ economyRiskLabel }}</span>
      </div>
      <p class="text-xs text-muted mb-2">
        {{ economyOverview.currentSegment?.label ?? '经营观察中' }}
        <span v-if="economyOverview.currentSegment">· {{ economyOverview.currentSegment.recommendedFocus }}</span>
      </p>

      <div class="grid grid-cols-2 gap-2 mb-2">
        <div v-for="metric in economyMetricCards" :key="metric.label" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/20">
          <p class="text-[10px] text-muted">{{ metric.label }}</p>
          <p class="text-sm text-accent mt-0.5">{{ metric.value }}</p>
          <p class="text-[10px] text-muted mt-1">{{ metric.hint }}</p>
        </div>
      </div>

      <div v-if="economyOverview.latestRiskReport?.summary" class="border rounded-xs px-2 py-2 mb-2" :class="economyRiskPanelClass">
        <div class="flex items-center gap-1 text-[10px] mb-1" :class="economyRiskClass">
          <AlertTriangle :size="12" />
          <span>风险提示</span>
        </div>
        <p class="text-xs text-muted">{{ economyOverview.latestRiskReport.summary }}</p>
      </div>

      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[10px] text-accent mb-1">推荐资金去向</p>
        <div class="space-y-1.5">
          <div v-for="sink in economyRecommendedSinks" :key="sink.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-text">{{ sink.name }}</p>
              <span class="text-[10px] text-accent">{{ sink.priceBandLabel }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ sink.showcaseHook }}</p>
            <p class="text-[10px] text-muted/80 mt-1">联动：{{ sink.linkedSystemsLabel }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-accent">额度兑换</span>
        <span class="text-xs text-muted">{{ playerStore.money }}文</span>
      </div>
      <p class="text-xs text-muted mb-2">桃源铜钱可与账号额度双向兑换，汇率由管理员统一配置。</p>

      <div class="border border-accent/10 rounded-xs p-2 mb-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">当前账号额度</span>
          <span class="text-xs" :class="exchangeContext.loggedIn ? 'text-accent' : 'text-muted'">
            {{ exchangeContext.loggedIn ? `${quotaDisplay} quota / $${dollarsDisplay}` : '未登录' }}
          </span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">兑换汇率</span>
          <span class="text-xs text-accent">1文 = ${{ exchangeContext.exchangeRateDollarPerMoney.toFixed(6) }}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">参考</span>
          <span class="text-xs text-muted">{{ moneyPerDollarLabel }}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">今日转入（额度→铜钱）</span>
          <span class="text-xs" :class="importLimitReached ? 'text-warning' : 'text-muted'">{{ dailyImportUsageLabel }}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-xs text-muted">今日提现（铜钱→额度）</span>
          <span class="text-xs" :class="exportLimitReached ? 'text-warning' : 'text-muted'">{{ dailyExportUsageLabel }}</span>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 mb-2">
        <p class="text-xs text-muted mb-1">兑换铜钱</p>
        <input
          v-model.number="exchangeMoney"
          type="number"
          min="1"
          step="1"
          class="w-full px-2 py-1.5 bg-bg border border-accent/30 rounded-xs text-xs text-text focus:border-accent outline-none"
          placeholder="请输入要兑换的铜钱数量"
        />
        <p class="text-[10px] text-muted mt-1">{{ exchangePreviewLabel }}</p>
        <p v-if="importLimitReached || exportLimitReached" class="text-[10px] text-warning mt-1">
          {{ importLimitReached ? '今日转入额度已达上限。' : '' }}{{ exportLimitReached ? '今日提现额度已达上限。' : '' }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn text-xs justify-center"
          :class="canImport ? '' : 'opacity-50 cursor-not-allowed'"
          :disabled="!canImport || importing"
          @click="handleImport"
        >
          {{ importing ? '导入中...' : '导入额度→铜钱' }}
        </button>
        <button
          class="btn text-xs justify-center"
          :class="canExport ? '' : 'opacity-50 cursor-not-allowed'"
          :disabled="!canExport || exporting"
          @click="handleExport"
        >
          {{ exporting ? '导出中...' : '导出铜钱→额度' }}
        </button>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-accent">钱包流派</span>
        <span class="text-xs text-muted">{{ walletStore.currentArchetype ? '已选择' : '未选择' }}</span>
      </div>
      <p class="text-xs text-muted mb-3">在旧钱包被动之外，可额外选择一个经营流派，影响目标偏好与商店推荐。</p>

      <div class="grid grid-cols-1 gap-2 mb-3">
        <button
          v-for="archetype in walletStore.archetypes"
          :key="archetype.id"
          class="border rounded-xs px-3 py-2 text-left transition-colors"
          :class="walletStore.currentArchetypeId === archetype.id ? 'border-accent bg-accent/5' : walletStore.canUnlockArchetype(archetype.id) ? 'border-accent/20 hover:bg-accent/5' : 'border-accent/10 opacity-70'"
          @click="handleSelectArchetype(archetype.id)"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-sm" :class="walletStore.currentArchetypeId === archetype.id ? 'text-accent' : ''">{{ archetype.name }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ archetype.title }}</p>
            </div>
            <span class="text-[10px]" :class="walletStore.canUnlockArchetype(archetype.id) ? 'text-success' : 'text-warning'">
              {{ walletStore.canUnlockArchetype(archetype.id) ? (walletStore.currentArchetypeId === archetype.id ? '使用中' : '可选择') : '未解锁' }}
            </span>
          </div>
          <p class="text-xs text-muted mt-1">{{ archetype.description }}</p>
          <p class="text-[10px] text-muted mt-1">{{ walletStore.getArchetypeUnlockHint(archetype.id) }}</p>
        </button>
      </div>

      <div v-if="walletStore.currentArchetype" class="border border-accent/10 rounded-xs p-2 mb-2">
        <div class="flex items-center justify-between gap-2 mb-1">
          <p class="text-xs text-accent">{{ walletStore.currentArchetype.name }} · 当前效果</p>
          <button class="text-[10px] text-warning hover:text-warning/80" @click="openResetArchetypeConfirm">重置流派</button>
        </div>
        <p class="text-xs text-muted">{{ walletStore.getArchetypeDescriptionText(walletStore.currentArchetype.id) }}</p>
        <div class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/20">
          <p class="text-[10px] text-accent mb-1">主效果</p>
          <p class="text-xs text-muted">{{ walletStore.currentArchetypeMainEffectText }}</p>
          <ul v-if="walletStore.currentArchetypeMainEffectSummary.length > 0" class="mt-2 space-y-1">
            <li v-for="summary in walletStore.currentArchetypeMainEffectSummary" :key="summary" class="text-[10px] text-muted">• {{ summary }}</li>
          </ul>
        </div>
        <div v-if="walletStore.currentArchetypeNodeEffects.length > 0" class="border border-success/20 rounded-xs p-2 mt-2 bg-success/5">
          <p class="text-[10px] text-success mb-1">已激活节点效果</p>
          <div class="space-y-1.5">
            <div v-for="nodeEffect in walletStore.currentArchetypeNodeEffects" :key="nodeEffect.id" class="border border-success/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-text">{{ nodeEffect.name }}</p>
                <div class="flex flex-wrap gap-1 justify-end">
                  <span v-for="label in nodeEffect.moduleLabels" :key="`${nodeEffect.id}-${label}`" class="text-[10px] px-1 rounded-xs border border-success/20 text-success">
                    {{ label }}
                  </span>
                </div>
              </div>
              <ul v-if="nodeEffect.summaries.length > 0" class="mt-1 space-y-1">
                <li v-for="summary in nodeEffect.summaries" :key="`${nodeEffect.id}-${summary}`" class="text-[10px] text-muted">• {{ summary }}</li>
              </ul>
            </div>
          </div>
        </div>
        <ul class="mt-2 space-y-1">
          <li v-for="summary in walletStore.getCurrentArchetypeSummary()" :key="summary" class="text-[10px] text-muted">• {{ summary }}</li>
        </ul>
      </div>

      <div v-if="walletStore.currentArchetypeNodes.length > 0" class="space-y-2">
        <p class="text-xs text-accent">流派节点</p>
        <div
          v-for="node in walletStore.currentArchetypeNodes"
          :key="node.id"
          class="border rounded-xs px-3 py-2"
          :class="walletStore.isNodeUnlocked(node.id) ? 'border-success/30 bg-success/5' : 'border-accent/10'"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-xs">{{ node.name }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ node.description }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="label in walletStore.getNodeModuleLabels(node.id)"
                  :key="`${node.id}-${label}`"
                  class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent"
                >
                  {{ label }}
                </span>
              </div>
            </div>
            <button
              class="btn !px-2 !py-1 text-[10px]"
              :class="walletStore.canUnlockNode(node.id) ? '' : 'opacity-50 cursor-not-allowed'"
              :disabled="walletStore.isNodeUnlocked(node.id) || !walletStore.canUnlockNode(node.id)"
              @click="handleUnlockNode(node.id)"
            >
              {{ walletStore.isNodeUnlocked(node.id) ? '已解锁' : '解锁' }}
            </button>
          </div>
          <ul v-if="walletStore.getNodeEffectSummary(node.id).length > 0" class="mt-1 space-y-1">
            <li v-for="summary in walletStore.getNodeEffectSummary(node.id)" :key="`${node.id}-${summary}`" class="text-[10px] text-muted">• {{ summary }}</li>
          </ul>
          <p class="text-[10px] text-muted mt-1">条件：{{ walletStore.getNodeUnlockHint(node.id) }}</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col space-y-1.5">
      <div
        v-for="item in WALLET_ITEMS"
        :key="item.id"
        class="border rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        :class="walletStore.has(item.id) ? 'border-accent/20' : 'border-accent/10 opacity-50'"
        @click="selectedItem = item"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm" :class="walletStore.has(item.id) ? 'text-accent' : 'text-muted'">
            {{ item.name }}
          </span>
          <CircleCheck v-if="walletStore.has(item.id)" :size="14" class="text-success shrink-0" />
          <Lock v-else :size="14" class="text-muted shrink-0" />
        </div>
        <p class="text-xs text-muted mt-0.5">{{ item.description }}</p>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="selectedItem"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="selectedItem = null"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="selectedItem = null">
            <X :size="14" />
          </button>
          <p class="text-sm mb-2" :class="walletStore.has(selectedItem.id) ? 'text-accent' : 'text-muted'">
            {{ selectedItem.name }}
          </p>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">效果</p>
            <p class="text-xs">{{ selectedItem.description }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted mb-1">解锁条件</p>
            <p class="text-xs">{{ selectedItem.unlockCondition }}</p>
          </div>
          <div class="border rounded-xs p-2" :class="walletStore.has(selectedItem.id) ? 'border-success/30' : 'border-accent/10'">
            <div class="flex items-center justify-center space-x-1">
              <CircleCheck v-if="walletStore.has(selectedItem.id)" :size="12" class="text-success" />
              <Lock v-else :size="12" class="text-muted" />
              <span class="text-xs" :class="walletStore.has(selectedItem.id) ? 'text-success' : 'text-muted'">
                {{ walletStore.has(selectedItem.id) ? '已解锁' : '未解锁' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="panel-fade">
      <div
        v-if="showResetArchetypeConfirm"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        @click.self="showResetArchetypeConfirm = false"
      >
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="showResetArchetypeConfirm = false">
            <X :size="14" />
          </button>
          <p class="text-sm text-warning mb-2">重置钱包流派</p>
          <p class="text-xs text-muted leading-relaxed mb-2">
            确认后将清空当前已选择的流派与已解锁节点进度，此操作无法撤销。
          </p>
          <div class="border border-warning/20 rounded-xs p-2 mb-3 bg-warning/5">
            <p class="text-xs text-warning">{{ walletStore.currentArchetype?.name ?? '当前流派' }}</p>
            <p class="text-[10px] text-muted mt-1">已解锁节点 {{ unlockedArchetypeNodeCount }} 个</p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn text-xs justify-center" @click="showResetArchetypeConfirm = false">取消</button>
            <button class="btn text-xs justify-center !bg-warning !text-bg" @click="handleResetArchetype">确认重置</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { Wallet, CircleCheck, Lock, X, TrendingUp, AlertTriangle } from 'lucide-vue-next'
  import { useWalletStore } from '@/stores/useWalletStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { WALLET_ITEMS } from '@/data/wallet'
  import { ECONOMY_SINK_CONTENT_DEFS } from '@/data/market'
  import type { WalletArchetypeId, WalletItemDef } from '@/types'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { exportTaoyuanToQuota, fetchTaoyuanExchangeContext, importQuotaToTaoyuan } from '@/utils/quotaExchangeApi'

  const walletStore = useWalletStore()
  const playerStore = usePlayerStore()
  const saveStore = useSaveStore()

  const selectedItem = ref<WalletItemDef | null>(null)
  const showResetArchetypeConfirm = ref(false)
  const exchangeMoney = ref(100)
  const importing = ref(false)
  const exporting = ref(false)
  const exchangeContext = ref({
    exchangeRateDollarPerMoney: 0.0002,
    exchangeRateQuotaPerMoney: 100,
    accountExchangeRate: 500000,
    dailyImportLimitMoney: 0,
    dailyExportLimitMoney: 0,
    todayImportedMoney: 0,
    todayExportedMoney: 0,
    quota: null as number | null,
    dollars: null as number | null,
    loggedIn: false,
    returnButtonEnabled: true,
    returnButtonText: '返回首页',
    returnButtonUrl: '/',
    aboutButtonEnabled: true,
    aboutButtonText: '关于游戏',
    aboutDialogTitle: '关于桃源乡',
    aboutDialogContent: '',
  })

  const unlockedCount = computed(() => WALLET_ITEMS.filter(i => walletStore.has(i.id)).length)
  const economyOverview = computed(() => playerStore.getEconomyOverview())
  const economyRiskLabel = computed(() => {
    const level = economyOverview.value.latestRiskReport?.level ?? 'healthy'
    if (level === 'critical') return '高风险'
    if (level === 'warning') return '预警中'
    if (level === 'watch') return '观察中'
    return '平稳'
  })
  const economyRiskClass = computed(() => {
    const level = economyOverview.value.latestRiskReport?.level ?? 'healthy'
    if (level === 'critical') return 'text-danger'
    if (level === 'warning') return 'text-warning'
    if (level === 'watch') return 'text-accent'
    return 'text-success'
  })
  const economyRiskPanelClass = computed(() => {
    const level = economyOverview.value.latestRiskReport?.level ?? 'healthy'
    if (level === 'critical') return 'border-danger/30 bg-danger/5'
    if (level === 'warning') return 'border-warning/30 bg-warning/5'
    if (level === 'watch') return 'border-accent/30 bg-accent/5'
    return 'border-success/30 bg-success/5'
  })
  const economyMetricCards = computed(() => [
    {
      label: '通胀压力',
      value: economyOverview.value.inflationPressure.toFixed(1),
      hint: '越高越需要新 sink 承接资产'
    },
    {
      label: '消耗满足度',
      value: `${Math.round(economyOverview.value.sinkSatisfaction * 100)}%`,
      hint: '越低越说明花钱出口不足'
    },
    {
      label: '循环多样度',
      value: String(economyOverview.value.loopDiversity),
      hint: '越低越容易陷入单一路线'
    },
    {
      label: '单系统收入占比',
      value: `${Math.round(economyOverview.value.dominantIncomeShare * 100)}%`,
      hint: '过高时应主动切换经营方向'
    }
  ])
  const economyRecommendedSinks = computed(() => {
    const segmentId = economyOverview.value.currentSegment?.id ?? 'mid_transition'
    const tierRank = segmentId === 'endgame_tycoon' ? 3 : segmentId === 'late_builder' ? 2 : 1
    return ECONOMY_SINK_CONTENT_DEFS
      .filter(item => (item.tier === 'mid_transition' ? 1 : item.tier === 'late_growth' ? 2 : 3) <= tierRank)
      .map(item => {
        let score = item.tier === 'mid_transition' ? 1 : item.tier === 'late_growth' ? 2 : 3
        if (economyOverview.value.sinkSatisfaction < 0.35 && ['service', 'maintenance', 'luxuryCatalog'].includes(item.category)) score += 2
        if (economyOverview.value.dominantIncomeShare > 0.6 && item.linkedSystems.includes('market')) score += 2
        if (economyOverview.value.loopDiversity < 4) score += item.linkedSystems.length
        return {
          ...item,
          score,
          priceBandLabel: `${item.priceBand[0]}~${item.priceBand[1]}文`,
          linkedSystemsLabel: item.linkedSystems.join(' / ')
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  })
  const unlockedArchetypeNodeCount = computed(() => walletStore.currentArchetypeNodes.filter(node => walletStore.isNodeUnlocked(node.id)).length)
  const sanitizedExchangeMoney = computed(() => Math.max(0, Math.floor(Number(exchangeMoney.value) || 0)))
  const quotaDisplay = computed(() => exchangeContext.value.quota ?? 0)
  const dollarsDisplay = computed(() => {
    const value = exchangeContext.value.dollars ?? 0
    return value.toFixed(4)
  })
  const moneyPerDollarLabel = computed(() => {
    const dollarPerMoney = exchangeContext.value.exchangeRateDollarPerMoney || 0.0002
    const moneyPerDollar = Math.max(1, Math.round(1 / dollarPerMoney))
    return `${moneyPerDollar}文 ≈ $1.00`
  })
  const dailyImportUsageLabel = computed(() => {
    const used = exchangeContext.value.todayImportedMoney || 0
    const limit = exchangeContext.value.dailyImportLimitMoney || 0
    return limit > 0 ? `${used} / ${limit} 文` : `${used} / 不限`
  })
  const dailyExportUsageLabel = computed(() => {
    const used = exchangeContext.value.todayExportedMoney || 0
    const limit = exchangeContext.value.dailyExportLimitMoney || 0
    return limit > 0 ? `${used} / ${limit} 文` : `${used} / 不限`
  })
  const importLimitReached = computed(() => {
    const limit = exchangeContext.value.dailyImportLimitMoney || 0
    return limit > 0 && (exchangeContext.value.todayImportedMoney || 0) >= limit
  })
  const exportLimitReached = computed(() => {
    const limit = exchangeContext.value.dailyExportLimitMoney || 0
    return limit > 0 && (exchangeContext.value.todayExportedMoney || 0) >= limit
  })
  const exchangePreviewLabel = computed(() => {
    const money = sanitizedExchangeMoney.value
    if (money <= 0) return '请输入大于 0 的铜钱数量。'
    const dollars = money * exchangeContext.value.exchangeRateDollarPerMoney
    const quota = Math.round(dollars * (exchangeContext.value.accountExchangeRate || 500000))
    const importLimit = exchangeContext.value.dailyImportLimitMoney || 0
    const exportLimit = exchangeContext.value.dailyExportLimitMoney || 0
    const importNext = (exchangeContext.value.todayImportedMoney || 0) + money
    const exportNext = (exchangeContext.value.todayExportedMoney || 0) + money
    if (importLimit > 0 && importNext > importLimit) {
      return `${money}文 转入后将超出今日转入限额（${importNext}/${importLimit}文）`
    }
    if (exportLimit > 0 && exportNext > exportLimit) {
      return `${money}文 提现后将超出今日提现限额（${exportNext}/${exportLimit}文）`
    }
    return `${money}文 ⇄ $${dollars.toFixed(4)} ⇄ ${quota} quota`
  })
  const canImport = computed(() => {
    if (!exchangeContext.value.loggedIn || sanitizedExchangeMoney.value <= 0) return false
    const limit = exchangeContext.value.dailyImportLimitMoney || 0
    if (limit <= 0) return true
    return (exchangeContext.value.todayImportedMoney || 0) + sanitizedExchangeMoney.value <= limit
  })
  const canExport = computed(() => {
    if (!exchangeContext.value.loggedIn || sanitizedExchangeMoney.value <= 0) return false
    if (playerStore.money < sanitizedExchangeMoney.value) return false
    const limit = exchangeContext.value.dailyExportLimitMoney || 0
    if (limit <= 0) return true
    return (exchangeContext.value.todayExportedMoney || 0) + sanitizedExchangeMoney.value <= limit
  })

  const refreshExchangeContext = async () => {
    exchangeContext.value = await fetchTaoyuanExchangeContext()
  }

  const openResetArchetypeConfirm = () => {
    if (!walletStore.currentArchetype) return
    showResetArchetypeConfirm.value = true
  }

  const handleSelectArchetype = (archetypeId: WalletArchetypeId) => {
    if (!walletStore.selectArchetype(archetypeId)) {
      showFloat(walletStore.getArchetypeUnlockHint(archetypeId), 'danger')
      return
    }
    showFloat(`已切换为${walletStore.currentArchetype?.name ?? '该流派'}`, 'accent')
    addLog(`你选择了钱包流派「${walletStore.currentArchetype?.name ?? archetypeId}」。`)
  }

  const handleUnlockNode = (nodeId: string) => {
    if (!walletStore.unlockNode(nodeId)) {
      showFloat(walletStore.getNodeUnlockHint(nodeId), 'danger')
      return
    }
    const node = walletStore.currentArchetypeNodes.find(entry => entry.id === nodeId)
    showFloat(`已解锁 ${node?.name ?? '节点'}`, 'success')
    addLog(`钱包流派节点「${node?.name ?? nodeId}」已解锁。`)
  }

  const handleResetArchetype = () => {
    const prev = walletStore.currentArchetype?.name
    walletStore.resetArchetype()
    showResetArchetypeConfirm.value = false
    showFloat('已重置钱包流派', 'danger')
    addLog(`已重置钱包流派${prev ? `「${prev}」` : ''}。`)
  }

  const persistExchangeResult = async () => {
    if (saveStore.activeSlot < 0) {
      addLog('兑换结果已更新到当前进度，请记得手动保存存档。')
      return
    }
    const ok = await saveStore.autoSave()
    if (!ok) {
      showFloat('兑换成功，但自动存档失败', 'danger')
      addLog('额度兑换成功，但自动存档失败。')
    }
  }

  const handleImport = async () => {
    if (!canImport.value) return
    importing.value = true
    try {
      const result = await importQuotaToTaoyuan(sanitizedExchangeMoney.value)
      playerStore.setMoney(playerStore.money + (result.moneyReceived ?? 0))
      exchangeContext.value = {
        ...exchangeContext.value,
        exchangeRateDollarPerMoney: result.exchangeRateDollarPerMoney,
        exchangeRateQuotaPerMoney: result.exchangeRateQuotaPerMoney,
        dailyImportLimitMoney: result.dailyImportLimitMoney,
        dailyExportLimitMoney: result.dailyExportLimitMoney,
        todayImportedMoney: result.todayImportedMoney,
        todayExportedMoney: result.todayExportedMoney,
        quota: result.quota ?? exchangeContext.value.quota,
        dollars: result.dollars ?? exchangeContext.value.dollars,
        loggedIn: true,
      }
      await persistExchangeResult()
      showFloat(`+${result.moneyReceived ?? 0}文`, 'accent')
      addLog(`从账号额度导入了${result.moneyReceived ?? 0}文。`)
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '导入额度失败', 'danger')
    } finally {
      importing.value = false
    }
  }

  const handleExport = async () => {
    if (!canExport.value) return
    exporting.value = true
    try {
      const result = await exportTaoyuanToQuota(sanitizedExchangeMoney.value)
      playerStore.setMoney(playerStore.money - (result.moneySpent ?? 0))
      exchangeContext.value = {
        ...exchangeContext.value,
        exchangeRateDollarPerMoney: result.exchangeRateDollarPerMoney,
        exchangeRateQuotaPerMoney: result.exchangeRateQuotaPerMoney,
        dailyImportLimitMoney: result.dailyImportLimitMoney,
        dailyExportLimitMoney: result.dailyExportLimitMoney,
        todayImportedMoney: result.todayImportedMoney,
        todayExportedMoney: result.todayExportedMoney,
        quota: result.quota ?? exchangeContext.value.quota,
        dollars: result.dollars ?? exchangeContext.value.dollars,
        loggedIn: true,
      }
      await persistExchangeResult()
      showFloat(`+${result.quotaGained ?? 0}quota`, 'success')
      addLog(`导出了${result.moneySpent ?? 0}文，获得 ${result.quotaGained ?? 0} quota。`)
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '导出额度失败', 'danger')
    } finally {
      exporting.value = false
    }
  }

  onMounted(() => {
    void refreshExchangeContext()
  })
</script>
