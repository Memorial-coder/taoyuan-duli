<template>
  <div class="space-y-3" data-testid="online-orders-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Handshake :size="16" />
            <h2 class="game-section-title">在线委托</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ moduleSummary }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="coopOrderStore.loading"
            @click="refreshOrders"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': coopOrderStore.loading }" />
            {{ coopOrderStore.loading ? '刷新中' : '刷新委托' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="coopOrderStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
        {{ coopOrderStore.errorMessage }}
      </div>

      <div class="grid gap-2 text-xs md:grid-cols-5">
        <div v-for="stat in summaryStats" :key="stat.label" class="game-panel-muted px-2 py-2">
          <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
          <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 border px-3 py-2 text-xs transition-colors"
          :class="activeTab === tab.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="{ name: 'quest', query: route.query }">
          <ExternalLink :size="12" />
          单人任务板
        </RouterLink>
      </div>

      <div v-if="activeTab === 'publish'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div class="game-panel-muted space-y-3 p-3">
          <div v-if="targetDraftSummary" class="border border-accent/15 bg-accent/5 px-3 py-2 text-xs text-muted">
            {{ targetDraftSummary }}
          </div>

          <div class="grid gap-2 md:grid-cols-2">
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              求助标题
              <input
                v-model="coopOrderStore.titleDraft"
                maxlength="40"
                class="online-input"
                placeholder="例如：缺一批冬菜备节"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              求助类别
              <select v-model="coopOrderStore.orderTypeDraft" class="online-select">
                <option v-for="option in COOP_ORDER_TYPE_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              可见范围
              <select v-model="coopOrderStore.scopeDraft" class="online-select">
                <option v-for="option in COOP_ORDER_SCOPE_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              协作模式
              <select v-model="coopOrderStore.collaborationModeDraft" class="online-select">
                <option value="single">单阶段委托</option>
                <option value="multi_stage">多段接力单</option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              截止时间
              <input
                v-model="coopOrderStore.deadlineAtDraft"
                type="datetime-local"
                class="online-input"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              回报类型
              <select v-model="coopOrderStore.rewardTypeDraft" class="online-select">
                <option v-for="option in COOP_REWARD_TYPE_OPTIONS" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              回报数值
              <input
                v-model.number="coopOrderStore.rewardValueDraft"
                type="number"
                min="1"
                class="online-input"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              回报说明
              <input
                v-model="coopOrderStore.rewardLabelDraft"
                maxlength="40"
                class="online-input"
                placeholder="例如：铜钱回报 / 人情回礼 / 节庆礼包"
              />
            </label>
          </div>

          <label class="flex flex-col gap-1 text-[10px] text-muted">
            求助内容
            <textarea
              v-model="coopOrderStore.descriptionDraft"
              rows="3"
              maxlength="160"
              class="online-textarea resize-none"
              placeholder="写清楚当前缺什么、希望别人怎么帮、为什么这单值得接。"
            />
          </label>

          <div v-if="coopOrderStore.collaborationModeDraft === 'multi_stage'" class="space-y-2 border border-accent/10 bg-black/10 p-2">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="text-xs text-accent">接力阶段</p>
                <p class="mt-1 text-[10px] text-muted">至少补齐 2 个子目标，服务端会按阶段记录接单与交付状态。</p>
              </div>
              <button
                class="online-action-btn online-action-btn--compact shrink-0"
                type="button"
                :disabled="coopOrderStore.actionRunning"
                @click="coopOrderStore.addStageDraft()"
              >
                新增阶段
              </button>
            </div>

            <div v-if="coopOrderStore.stageDrafts.length === 0" class="border border-accent/10 bg-bg/40 px-3 py-2 text-[10px] text-muted">
              当前还没有阶段，请至少补 2 个子目标。
            </div>
            <div
              v-for="(stage, index) in coopOrderStore.stageDrafts"
              :key="stage.id"
              class="space-y-2 border border-accent/10 bg-bg/40 p-2"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">阶段 {{ index + 1 }}</p>
                <button
                  class="online-action-btn online-action-btn--danger online-action-btn--compact"
                  type="button"
                  :disabled="coopOrderStore.actionRunning"
                  @click="coopOrderStore.removeStageDraft(stage.id)"
                >
                  删除
                </button>
              </div>
              <div class="grid gap-2 md:grid-cols-2">
                <input
                  v-model="stage.title"
                  maxlength="40"
                  class="online-input"
                  placeholder="阶段标题，例如：先补齐冬菜"
                />
                <select v-model="stage.preferredOrderType" class="online-select">
                  <option v-for="option in COOP_ORDER_TYPE_OPTIONS" :key="option.id" :value="option.id">
                    {{ option.label }}
                  </option>
                </select>
                <input
                  v-model="stage.targetItemId"
                  maxlength="40"
                  class="online-input"
                  placeholder="目标资源 ID，例如 wheat"
                />
                <input
                  v-model.number="stage.targetQuantity"
                  type="number"
                  min="1"
                  class="online-input"
                  placeholder="数量"
                />
              </div>
              <textarea
                v-model="stage.description"
                rows="2"
                maxlength="120"
                class="online-textarea w-full resize-none"
                placeholder="告诉接力的人这一段具体要做什么。"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[10px] leading-4 text-muted">
              单阶段会整单结算；多段接力单会把总回报按阶段拆分，并允许不同人各自完成擅长的一段。
            </p>
            <button
              class="online-action-btn online-action-btn--primary shrink-0"
              type="button"
              :disabled="coopOrderStore.actionRunning"
              @click="submitOrderDraft"
            >
              {{ coopOrderStore.actionRunning ? '发布中' : '发布求助单' }}
            </button>
          </div>
        </div>
        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">互助声望</p>
          <div class="mt-3 grid gap-2 text-xs">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">信任等级</p>
              <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.trust_level.label }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">累计互助</p>
              <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.completed_count }} 次</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'available'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">当前可见委托</p>
          <span class="text-[10px] text-muted">{{ coopOrderStore.visibleOrders.length }} 张</span>
        </div>
        <div v-if="coopOrderStore.visibleOrders.length === 0" class="mt-3 text-xs text-muted">
          当前没有可见在线求助单。
        </div>
        <div v-else class="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          <div v-for="order in coopOrderStore.visibleOrders" :key="order.id" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="truncate text-xs text-accent">{{ order.title }}</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ order.owner_display_name }} 发布 · {{ order.description || '无描述' }}</p>
              </div>
              <span class="w-fit shrink-0 text-[10px]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">
                {{ getCoopOrderStatusLabel(order.status) }}
              </span>
            </div>
            <p class="mt-2 text-[10px] text-muted">
              {{ getCoopOrderTypeLabel(order.order_type) }} · {{ getCoopOrderScopeLabel(order.scope) }} · 截止 {{ formatCoopTime(order.deadline_at) }}
            </p>
            <p v-if="order.collaboration_mode === 'multi_stage'" class="mt-1 text-[10px] text-accent">
              接力阶段 {{ coopOrderStore.getOpenStages(order).length }}/{{ order.stages?.length || 0 }} 可接
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'mine'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">我的发布</p>
          <span class="text-[10px] text-muted">{{ coopOrderStore.myOrders.length }} 张</span>
        </div>
        <div v-if="coopOrderStore.myOrders.length === 0" class="mt-3 text-xs text-muted">
          当前还没有自己发布的求助单。
        </div>
        <div v-else class="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          <div v-for="order in coopOrderStore.myOrders" :key="order.id" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs text-accent">{{ order.title }}</p>
              <span class="shrink-0 text-[10px]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">
                {{ getCoopOrderStatusLabel(order.status) }}
              </span>
            </div>
            <p class="mt-1 text-[10px] leading-4 text-muted">{{ order.description || '无描述' }}</p>
            <p class="mt-2 text-[10px] text-muted">
              回报：{{ getCoopRewardTypeLabel(order.reward_type) }} {{ order.reward_value }} {{ order.reward_label ? `· ${order.reward_label}` : '' }}
            </p>
            <p v-if="order.delivery_status !== 'none'" class="mt-1 text-[10px] text-accent">
              交付状态：{{ getCoopDeliveryStatusLabel(order.delivery_status) }}
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'accepted'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">我的接单</p>
          <span class="text-[10px] text-muted">{{ coopOrderStore.myAcceptedOrders.length }} 张</span>
        </div>
        <div v-if="coopOrderStore.myAcceptedOrders.length === 0" class="mt-3 text-xs text-muted">
          当前还没有自己接下的求助单。
        </div>
        <div v-else class="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          <div v-for="order in coopOrderStore.myAcceptedOrders" :key="order.id" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs text-accent">{{ order.title }}</p>
              <span class="shrink-0 text-[10px] text-muted">{{ getCoopDeliveryStatusLabel(order.delivery_status) }}</span>
            </div>
            <p class="mt-1 text-[10px] leading-4 text-muted">{{ order.owner_display_name }} 发布 · {{ order.description || '无描述' }}</p>
            <p class="mt-2 text-[10px] text-muted">
              {{ getCoopOrderTypeLabel(order.order_type) }} · 截止 {{ formatCoopTime(order.deadline_at) }}
            </p>
            <p v-if="order.collaboration_mode === 'multi_stage'" class="mt-1 text-[10px] text-accent">
              已接阶段 {{ coopOrderStore.getAssignedStages(order).length }} 个
            </p>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-2">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">结算凭证</p>
            <span class="text-[10px] text-muted">{{ coopOrderStore.myReceipts.length }} 条</span>
          </div>
          <div v-if="coopOrderStore.myReceipts.length === 0" class="mt-3 text-xs text-muted">
            当前没有结算凭证。
          </div>
          <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in coopOrderStore.myReceipts" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <p class="truncate text-xs text-accent">{{ receipt.stage_title || receipt.order_id }}</p>
              <p class="mt-1 text-[10px] text-muted">
                {{ getCoopReceiptStatusLabel(receipt.status) }} · {{ getCoopRewardTypeLabel(receipt.reward_type) }} {{ receipt.reward_value }}
              </p>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">补偿重试</p>
            <span class="text-[10px] text-muted">{{ coopOrderStore.myCompensations.length }} 条</span>
          </div>
          <div v-if="coopOrderStore.myCompensations.length === 0" class="mt-3 text-xs text-muted">
            当前没有待处理补偿。
          </div>
          <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            <div v-for="compensation in coopOrderStore.myCompensations" :key="compensation.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-xs text-accent">{{ compensation.reason || compensation.order_id }}</p>
                <span class="shrink-0 text-[10px]" :class="compensation.status === 'pending' ? 'text-warning' : 'text-success'">
                  {{ compensation.status === 'pending' ? '待重试' : '已解决' }}
                </span>
              </div>
              <p v-if="compensation.last_error" class="mt-1 text-[10px] leading-4 text-danger">
                {{ compensation.last_error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { ArrowLeft, ExternalLink, Handshake, RefreshCw } from 'lucide-vue-next'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import type { OnlineCoopOrderScope, OnlineCoopOrderType, OnlineCoopRewardType } from '@/utils/onlineProfileApi'

  type OrdersTabKey = 'publish' | 'available' | 'mine' | 'accepted' | 'receipts'
  type OrdersTabMeta = { key: OrdersTabKey; label: string; summary: string }

  const route = useRoute()
  const coopOrderStore = useCoopOrderStore()
  const activeTab = ref<OrdersTabKey>('available')
  const lastRefreshAttemptAt = ref(0)
  const tabs: OrdersTabMeta[] = [
    { key: 'publish', label: '发布', summary: '发布求助单、设置范围、奖励和多段接力草稿。' },
    { key: 'available', label: '可接', summary: '查看当前可见的公开、好友或邻里求助单。' },
    { key: 'mine', label: '我的发布', summary: '查看自己发布的求助单与待确认交付。' },
    { key: 'accepted', label: '我的接单', summary: '处理自己接下的求助单与交付草稿。' },
    { key: 'receipts', label: '凭证与补偿', summary: '查看结算凭证、补偿状态和异常原因。' },
  ]
  const defaultTab = tabs[1]!

  const COOP_ORDER_TYPE_OPTIONS: Array<{ id: OnlineCoopOrderType; label: string }> = [
    { id: 'material_help', label: '材料求助' },
    { id: 'festival_supply', label: '节庆备货' },
    { id: 'museum_support', label: '博物馆补展' },
    { id: 'fishpond_borrow', label: '鱼塘借种' },
    { id: 'breeding_cert', label: '育种认证' },
    { id: 'village_build', label: '村社建设' },
    { id: 'expedition_supply', label: '远征补给' },
    { id: 'npc_request', label: 'NPC 特殊请求' },
    { id: 'emergency_response', label: '临时灾害应对' },
  ]
  const COOP_ORDER_SCOPE_OPTIONS: Array<{ id: OnlineCoopOrderScope; label: string }> = [
    { id: 'public', label: '公开' },
    { id: 'friends', label: '好友' },
    { id: 'neighbors', label: '邻里' },
  ]
  const COOP_REWARD_TYPE_OPTIONS: Array<{ id: OnlineCoopRewardType; label: string }> = [
    { id: 'money', label: '赏金' },
    { id: 'reputation', label: '声望' },
    { id: 'gift', label: '礼物' },
  ]

  const activeTabMeta = computed<OrdersTabMeta>(() => tabs.find(tab => tab.key === activeTab.value) ?? defaultTab)
  const moduleSummary = computed(() => {
    const trust = coopOrderStore.reputationSummary.trust_level.label
    return `求助单、接单、交付、凭证和补偿集中管理；当前互助等级：${trust}。`
  })
  const refreshStateLabel = computed(() => {
    if (coopOrderStore.loading) return '正在刷新在线委托摘要'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })
  const pendingCompensationCount = computed(() =>
    coopOrderStore.myCompensations.filter(entry => entry.status === 'pending').length
  )
  const summaryStats = computed(() => [
    { label: '可接委托', value: `${coopOrderStore.visibleOrders.length} 张` },
    { label: '我的发布', value: `${coopOrderStore.myOrders.length} 张` },
    { label: '我的接单', value: `${coopOrderStore.myAcceptedOrders.length} 张` },
    { label: '结算凭证', value: `${coopOrderStore.myReceipts.length} 条` },
    { label: '待补偿', value: `${pendingCompensationCount.value} 条` },
  ])
  const targetDraftSummary = computed(() => {
    if (!coopOrderStore.targetSaveIdDraft && !coopOrderStore.targetDisplayNameDraft) return ''
    const target = coopOrderStore.targetDisplayNameDraft || '目标好友'
    const saveId = coopOrderStore.targetSaveIdDraft ? `（存档 ID ${coopOrderStore.targetSaveIdDraft}）` : ''
    return `这张求助单会面向 ${target}${saveId}，服务端仍会按存档级关系校验。`
  })

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }
  const parseRouteSaveId = (value: string) => {
    const saveId = Number(value)
    return Number.isInteger(saveId) && saveId >= 100000000 && saveId < 1000000000 ? saveId : 0
  }
  const isCoopOrderScope = (value: string): value is OnlineCoopOrderScope =>
    COOP_ORDER_SCOPE_OPTIONS.some(option => option.id === value)
  const applyCoopRouteDraft = () => {
    const scope = getRouteQueryText(route.query.scope)
    if (isCoopOrderScope(scope)) {
      coopOrderStore.scopeDraft = scope
    }
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    const parsedTargetSaveId = parseRouteSaveId(targetSaveId)
    coopOrderStore.targetSaveIdDraft = parsedTargetSaveId
    coopOrderStore.targetDisplayNameDraft = targetUsername
    if (!targetUsername && !parsedTargetSaveId) return
    if (parsedTargetSaveId) {
      coopOrderStore.scopeDraft = 'friends'
    }
    if (!coopOrderStore.titleDraft.trim()) {
      coopOrderStore.titleDraft = targetUsername ? `与${targetUsername}协作` : `与存档 ${parsedTargetSaveId} 协作`
    }
    if (!coopOrderStore.descriptionDraft.trim()) {
      coopOrderStore.descriptionDraft = parsedTargetSaveId
        ? `面向好友 ${targetUsername || `存档 ${parsedTargetSaveId}`}（存档 ID ${targetSaveId}）发起一张协作求助单。`
        : `面向好友 ${targetUsername} 发起一张协作求助单。`
    }
  }

  const getCoopOrderTypeLabel = (orderType: OnlineCoopOrderType) =>
    COOP_ORDER_TYPE_OPTIONS.find(option => option.id === orderType)?.label || orderType
  const getCoopOrderScopeLabel = (scope: OnlineCoopOrderScope) =>
    COOP_ORDER_SCOPE_OPTIONS.find(option => option.id === scope)?.label || scope
  const getCoopRewardTypeLabel = (rewardType: OnlineCoopRewardType) =>
    COOP_REWARD_TYPE_OPTIONS.find(option => option.id === rewardType)?.label || rewardType
  const getCoopOrderStatusLabel = (status: 'open' | 'closed' | 'expired') => {
    if (status === 'open') return '进行中'
    if (status === 'expired') return '已过期'
    return '已关闭'
  }
  const getCoopDeliveryStatusLabel = (status: 'none' | 'submitted' | 'confirmed' | 'compensation_pending') => {
    if (status === 'submitted') return '待确认'
    if (status === 'confirmed') return '已完成'
    if (status === 'compensation_pending') return '补偿处理中'
    return '未提交'
  }
  const getCoopReceiptStatusLabel = (status: 'pending_owner_confirm' | 'confirmed' | 'compensation_pending') => {
    if (status === 'pending_owner_confirm') return '待发布人确认'
    if (status === 'confirmed') return '已确认'
    return '补偿处理中'
  }
  const formatCoopTime = (timestamp: number) => {
    if (!timestamp) return '未设置'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false })
  }

  const refreshOrders = async () => {
    await coopOrderStore.refreshOverview().catch(() => {})
    lastRefreshAttemptAt.value = Date.now()
  }

  const submitOrderDraft = async () => {
    await coopOrderStore.submitOrder().catch(() => {})
  }

  onMounted(() => {
    applyCoopRouteDraft()
    void refreshOrders()
  })
</script>
