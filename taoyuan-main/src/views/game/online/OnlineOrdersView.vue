<template>
  <div class="space-y-3" data-testid="online-orders-page">
    <OnlineModuleShell
      title="在线委托"
      :summary="moduleSummary"
      :meta="refreshStateLabel"
      refresh-label="刷新委托"
      :refresh-running="coopOrderStore.loading"
      :refresh-disabled="coopOrderStore.loading"
      :stats="summaryStats"
      stats-grid-class="grid gap-2 text-xs md:grid-cols-5"
      :tabs="tabs"
      :active-tab="activeTab"
      @refresh="refreshOrders"
      @update:active-tab="setActiveTab"
    >
      <template #icon>
        <Handshake :size="16" />
      </template>
      <template #errors>
        <OnlineStatusBanner
          v-if="coopOrderStore.errorMessage"
          tone="danger"
          title="在线委托暂时没有刷新成功"
          :description="coopOrderStore.errorMessage"
          action-label="重试"
          @action="refreshOrders"
        />
      </template>
    </OnlineModuleShell>

    <section
      class="space-y-3"
      role="tabpanel"
      :id="`online-module-panel-${activeTab}`"
      :aria-labelledby="`online-module-tab-${activeTab}`"
      data-testid="online-module-tabpanel"
    >
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
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">发布求助单</p>
              <p class="mt-1 text-xs leading-5 text-muted">
                先用向导分步填写类型、需求数量、协作模式和回报；发布失败时会保留草稿。
              </p>
            </div>
            <button
              data-testid="online-orders-publish-wizard-trigger"
              class="online-action-btn online-action-btn--primary shrink-0 justify-center"
              type="button"
              :disabled="coopOrderStore.actionRunning"
              @click="openOrderWizard"
            >
              <PlusCircle :size="12" />
              发布求助单
            </button>
          </div>

          <div v-if="targetDraftSummary" class="border border-accent/15 bg-accent/5 px-3 py-2 text-xs text-muted">
            {{ targetDraftSummary }}
          </div>

          <div class="grid gap-2 text-xs md:grid-cols-3" data-testid="online-orders-publish-summary">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">草稿标题</p>
              <p class="mt-1 truncate text-accent">{{ coopOrderStore.titleDraft.trim() || '尚未填写' }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">协作模式</p>
              <p class="mt-1 text-accent">{{ coopOrderStore.collaborationModeDraft === 'multi_stage' ? `接力单 · ${coopOrderStore.stageDrafts.length} 段` : '单阶段委托' }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">回报</p>
              <p class="mt-1 truncate text-accent">{{ getCoopRewardTypeLabel(coopOrderStore.rewardTypeDraft) }} {{ coopOrderStore.rewardValueDraft }}{{ coopOrderStore.rewardLabelDraft ? ` · ${coopOrderStore.rewardLabelDraft}` : '' }}</p>
            </div>
          </div>

          <p class="text-[0.625rem] leading-4 text-muted">
            单阶段会整单结算；多段接力单会把总回报按阶段拆分，并允许不同人各自完成擅长的一段。
          </p>
        </div>
        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">互助声望</p>
          <div class="mt-3 grid gap-2 text-xs">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">信任等级</p>
              <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.trust_level.label }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">累计互助</p>
              <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.completed_count }} 次</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'available'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div class="game-panel-muted p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">当前可见委托</p>
              <p class="mt-1 text-[0.625rem] text-muted">
                {{ orderBoardFilterLabel }} · {{ availableOrderCards.length }}/{{ coopOrderStore.visibleOrders.length }} 张
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-1" aria-label="委托筛选">
              <button
                v-for="option in orderBoardFilterOptions"
                :key="option.id"
                type="button"
                :data-testid="`online-orders-board-filter-${option.id}`"
                class="online-action-btn online-action-btn--compact"
                :class="{ 'online-action-btn--primary': orderBoardFilter === option.id }"
                @click="orderBoardFilter = option.id"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <OnlineEmptyState
            v-if="availableOrderCards.length === 0"
            class="mt-3"
            title="没有符合筛选的求助单"
            description="可以切回全部委托看看，也可以自己发布一张求助单，写清楚缺什么和希望别人怎么帮。"
            primary-label="查看全部"
            secondary-label="发布求助单"
            @primary="orderBoardFilter = 'all'"
            @secondary="setActiveTab('publish')"
          />
          <OnlineScrollArea v-else class="mt-3" max-height="32rem" data-testid="online-orders-available-list">
            <div
              v-for="order in availableOrderCards"
              :key="order.id"
              data-testid="online-orders-available-entry"
              class="cursor-pointer border border-accent/10 bg-black/10 p-2 transition hover:border-accent/30 focus:outline-none focus-visible:border-accent"
              role="button"
              tabindex="0"
              @click="openAvailableOrderDetail(order)"
              @keydown.enter.prevent="openAvailableOrderDetail(order)"
              @keydown.space.prevent="openAvailableOrderDetail(order)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-1">
                    <p class="truncate text-xs text-accent">{{ order.title }}</p>
                    <span v-if="isRelayOrder(order)" class="border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[0.625rem] text-warning">
                      接力单
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-1 text-[0.625rem] leading-4 text-muted">
                    {{ getAvailableOrderDemandSummary(order) }}
                  </p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">
                  {{ getAvailableOrderStatusLabel(order) }}
                </span>
              </div>
              <div class="mt-2 grid gap-1 text-[0.625rem] text-muted sm:grid-cols-2">
                <p class="truncate">回报：{{ getOrderRewardSummary(order) }}</p>
                <p class="truncate sm:text-right">{{ getOrderDeadlineSummary(order) }}</p>
              </div>
              <div class="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  data-testid="online-orders-available-detail-trigger"
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  @click.stop="openAvailableOrderDetail(order)"
                >
                  <Info :size="12" />
                  详情
                </button>
                <button
                  v-if="!isRelayOrder(order)"
                  data-testid="online-orders-accept-submit"
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="coopOrderStore.actionRunning || !canAcceptSingleOrder(order)"
                  @click.stop="openOrderActionConfirm({ kind: 'accept-order', orderId: order.id })"
                >
                  {{ order.assignee_username ? '已有人接单' : '接这张单' }}
                </button>
              </div>
            </div>
          </OnlineScrollArea>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3" data-testid="online-orders-society-board">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">村社公共订单板</p>
              <span class="text-[0.625rem] text-muted">公开接力</span>
            </div>
            <div class="mt-3 grid gap-2 text-xs">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">公开订单</p>
                <p class="mt-1 text-accent">{{ societyOrderBoard.public_orders }} 张</p>
                <p class="mt-1 text-[0.625rem] text-muted">开放 {{ societyOrderBoard.open_public_orders }} 张</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">公开接力</p>
                <p class="mt-1 text-accent">{{ societyOrderBoard.public_relay_orders }} 张</p>
                <p class="mt-1 text-[0.625rem] text-muted">可接 {{ societyOrderBoard.open_public_relay_orders }} 张</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">分账池</p>
                <p class="mt-1 text-accent">{{ societyOrderBoard.reward_pool_value }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">已落账 {{ societyOrderBoard.confirmed_reward_value }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">补偿风险</p>
                <p class="mt-1 text-accent">{{ societyOrderBoard.compensation_count }} 条</p>
                <p class="mt-1 text-[0.625rem] text-muted">补偿中 {{ societyOrderBoard.compensation_pending_reward_value }}</p>
              </div>
            </div>
            <div data-testid="online-orders-society-board-settlement" class="mt-3 border border-warning/20 bg-warning/5 p-2">
              <p class="text-[0.625rem] leading-5 text-muted">{{ societyOrderBoardSettlementSummary }}</p>
              <div class="mt-2 grid gap-1 sm:grid-cols-2">
                <p v-for="row in societyOrderBoardStatusRows" :key="row.id" class="text-[0.625rem] text-muted">
                  {{ row.label }}：{{ row.value }}
                </p>
              </div>
            </div>
            <div data-testid="online-orders-society-board-receipts" class="mt-3 space-y-2">
              <p class="text-[0.625rem] text-muted">最近公开记录</p>
              <div v-if="societyOrderBoard.recent_receipts.length > 0" class="max-h-40 space-y-2 overflow-y-auto pr-1">
                <div v-for="receipt in societyOrderBoard.recent_receipts" :key="receipt.receipt_id" class="border border-accent/10 bg-black/10 p-2">
                  <p class="truncate text-[0.625rem] text-accent">{{ receipt.order_title || '公共订单' }} · {{ receipt.stage_title || '整单' }}</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                    {{ receipt.assignee_display_name || '未署名成员' }} · {{ getCoopRewardTypeLabel(receipt.reward_type) }} {{ receipt.reward_value }} · {{ getRelaySettlementRouteLabel(receipt.reward_route) }}
                  </p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                    记录 {{ receipt.receipt_id }} · {{ getCoopReceiptStatusLabel(receipt.status) }}
                  </p>
                  <p
                    v-if="receipt.relay_story_summary"
                    data-testid="online-orders-society-board-receipt-story"
                    class="mt-1 text-[0.625rem] leading-4 text-muted"
                  >
                    {{ receipt.relay_story_chapter_title || '\u63a5\u529b\u6545\u4e8b' }}: {{ receipt.relay_story_summary }}
                  </p>
                  <p v-if="receipt.relay_story_settlement_summary" class="mt-1 text-[0.625rem] leading-4 text-muted">
                    {{ receipt.relay_story_settlement_summary }}
                  </p>
                </div>
              </div>
              <OnlineEmptyState
                v-else
                title="还没有公开结算记录"
                description="公开接力单完成并结算后，会在这里读回最近公开记录和分账去向。"
              />
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">互助声望</p>
            <div class="mt-3 grid gap-2 text-xs">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">信任等级</p>
                <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.trust_level.label }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">总帮助声望</p>
                <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.total }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">已完成互助</p>
                <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.completed_count }} 次</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'mine'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">我的发布</p>
          <span class="text-[0.625rem] text-muted">{{ coopOrderStore.myOrders.length }} 张</span>
        </div>
        <OnlineEmptyState
          v-if="coopOrderStore.myOrders.length === 0"
          class="mt-3"
          title="还没有发布求助单"
          description="发布后可以在这里确认交付、查看接力阶段和处理结算。"
          primary-label="发布求助单"
          @primary="setActiveTab('publish')"
        />
        <OnlineScrollArea v-else class="mt-3" max-height="32rem" data-testid="online-orders-mine-list">
          <div v-for="order in coopOrderStore.myOrders" :key="order.id" data-testid="online-orders-mine-entry" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="truncate text-xs text-accent">{{ order.title }}</p>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ order.description || '无描述' }}</p>
              </div>
              <span class="w-fit shrink-0 text-[0.625rem]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">
                {{ getCoopOrderStatusLabel(order.status) }}
              </span>
            </div>
            <p class="mt-2 text-[0.625rem] text-muted">
              {{ getCoopOrderTypeLabel(order.order_type) }} · {{ getCoopOrderScopeLabel(order.scope) }} · 截止 {{ formatCoopTime(order.deadline_at) }}
            </p>
            <p class="mt-1 text-[0.625rem] text-accent">
              回报：{{ getCoopRewardTypeLabel(order.reward_type) }} {{ order.reward_value }} {{ order.reward_label ? `· ${order.reward_label}` : '' }}
            </p>
            <AsyncCommunityBoard
              v-if="order.visual_state?.async_projects?.length"
              class="mt-2"
              :projects="order.visual_state.async_projects"
              :recent-feedback="order.visual_state.recent_feedback"
              :action-running="coopOrderStore.actionRunning"
              @trigger-contribution="triggerOrderRelayAction(order, $event.optionId)"
            />
            <OnlineOrderStoryFlowPanel
              v-if="order.visual_state?.story_flow"
              class="mt-2"
              :story-flow="order.visual_state.story_flow"
            />
            <div v-if="order.relay_settlement_summary" class="mt-2 border border-warning/20 bg-warning/5 p-2" data-testid="online-orders-relay-settlement-summary">
              <div class="flex flex-col gap-1 text-[0.625rem] text-muted sm:flex-row sm:items-center sm:justify-between">
                <span>分账池：{{ getCoopRewardTypeLabel(order.relay_settlement_summary.reward_type) }} {{ order.relay_settlement_summary.pool_reward_value }} · {{ getRelaySettlementStatusLabel(order.relay_settlement_summary.status) }}</span>
                <span>已落账 {{ order.relay_settlement_summary.confirmed_reward_value }} / 待结 {{ order.relay_settlement_summary.pending_reward_value }}</span>
              </div>
              <div class="mt-2 grid gap-1 md:grid-cols-2">
                <p
                  v-for="share in order.relay_settlement_summary.shares"
                  :key="share.stage_id"
                  class="truncate text-[0.625rem] text-muted"
                >
                  {{ share.sequence }}. {{ share.stage_title }}：{{ share.share_percent }}% / {{ share.reward_value }} · {{ getRelaySettlementRouteLabel(share.reward_route) }}
                </p>
              </div>
            </div>
            <p v-if="order.assignee_username" class="mt-1 text-[0.625rem] text-success">
              当前接单人：{{ order.assignee_display_name || order.assignee_username }}
            </p>
            <p v-if="order.collaboration_mode !== 'multi_stage' && order.delivery_status !== 'none'" class="mt-1 text-[0.625rem] text-accent">
              交付状态：{{ getCoopDeliveryStatusLabel(order.delivery_status) }}
            </p>

            <div v-if="order.collaboration_mode === 'multi_stage'" class="mt-2 space-y-2">
              <div v-for="stage in order.stages || []" :key="stage.id" class="border border-accent/10 bg-bg/40 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="text-xs text-accent">阶段 {{ stage.sequence }} · {{ stage.title }}</p>
                    <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ stage.description || '这段还没写说明。' }}</p>
                  </div>
                  <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ getCoopDeliveryStatusLabel(stage.delivery_status) }}</span>
                </div>
                <p class="mt-2 text-[0.625rem] text-muted">
                  {{ getCoopOrderTypeLabel(stage.preferred_order_type) }} · 目标 {{ stage.target_item_id || '未指定资源' }} ×{{ stage.target_quantity }}
                </p>
                <p v-if="stage.assignee_username" class="mt-1 text-[0.625rem] text-success">
                  当前阶段接单人：{{ stage.assignee_display_name || stage.assignee_username }}
                </p>
                <div v-if="stage.delivery_status === 'submitted'" class="mt-2 space-y-2">
                  <div v-if="canShowSettlementControls(order.reward_type)" class="border border-accent/10 bg-black/10 p-2">
                    <div class="grid gap-2 md:grid-cols-2">
                      <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
                        结算去向
                        <select
                          v-model="coopOrderStore.ensureSettlementDraft(order.id, stage.id).rewardRoute"
                          data-testid="online-orders-settlement-route-select"
                          class="online-select"
                          @change="syncSettlementContractDefault(order.id, stage.id)"
                        >
                          <option value="personal">接单人个人铜钱</option>
                          <option value="shared_fund" :disabled="familySharedFundContracts.length === 0">家族 / 合伙共同基金</option>
                        </select>
                      </label>
                      <label v-if="isSharedFundSettlementSelected(order.id, stage.id)" class="flex flex-col gap-1 text-[0.625rem] text-muted">
                        共同庄园
                        <select
                          v-model="coopOrderStore.ensureSettlementDraft(order.id, stage.id).cohabitationContractId"
                          data-testid="online-orders-settlement-contract-select"
                          class="online-select"
                        >
                          <option value="">请选择共同庄园契约</option>
                          <option v-for="contract in familySharedFundContracts" :key="contract.id" :value="contract.id">
                            {{ getSettlementContractLabel(contract) }}
                          </option>
                        </select>
                      </label>
                    </div>
                    <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ getSettlementHint(order.id, stage.id) }}</p>
                  </div>
                  <div class="flex justify-end">
                    <button
                      data-testid="online-orders-stage-confirm-submit"
                      class="online-action-btn online-action-btn--compact"
                      type="button"
                      :disabled="coopOrderStore.actionRunning || !canConfirmSettlement(order.id, stage.id)"
                      @click="openOrderActionConfirm({ kind: 'confirm-delivery', orderId: order.id, stageId: stage.id })"
                    >
                      确认这一段
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="order.delivery_status === 'submitted'" class="mt-2 space-y-2">
              <div v-if="canShowSettlementControls(order.reward_type)" class="border border-accent/10 bg-black/10 p-2">
                <div class="grid gap-2 md:grid-cols-2">
                  <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
                    结算去向
                    <select
                      v-model="coopOrderStore.ensureSettlementDraft(order.id).rewardRoute"
                      data-testid="online-orders-settlement-route-select"
                      class="online-select"
                      @change="syncSettlementContractDefault(order.id)"
                    >
                      <option value="personal">接单人个人铜钱</option>
                      <option value="shared_fund" :disabled="familySharedFundContracts.length === 0">家族 / 合伙共同基金</option>
                    </select>
                  </label>
                  <label v-if="isSharedFundSettlementSelected(order.id)" class="flex flex-col gap-1 text-[0.625rem] text-muted">
                    共同庄园
                    <select
                      v-model="coopOrderStore.ensureSettlementDraft(order.id).cohabitationContractId"
                      data-testid="online-orders-settlement-contract-select"
                      class="online-select"
                    >
                      <option value="">请选择共同庄园契约</option>
                      <option v-for="contract in familySharedFundContracts" :key="contract.id" :value="contract.id">
                        {{ getSettlementContractLabel(contract) }}
                      </option>
                    </select>
                  </label>
                </div>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ getSettlementHint(order.id) }}</p>
              </div>
              <div class="flex justify-end">
                <button
                  data-testid="online-orders-confirm-submit"
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="coopOrderStore.actionRunning || !canConfirmSettlement(order.id)"
                  @click="openOrderActionConfirm({ kind: 'confirm-delivery', orderId: order.id })"
                >
                  确认结算
                </button>
              </div>
            </div>
          </div>
        </OnlineScrollArea>
      </div>

      <div v-else-if="activeTab === 'accepted'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">我的接单</p>
            <span class="text-[0.625rem] text-muted">{{ coopOrderStore.myAcceptedOrders.length }} 张</span>
          </div>
          <OnlineEmptyState
            v-if="coopOrderStore.myAcceptedOrders.length === 0"
            class="mt-3"
            title="还没有接下求助单"
            description="接单后可以在这里提交交付、取消未交付的接单，或者处理自己占到的接力阶段。"
            primary-label="查看可接委托"
            @primary="setActiveTab('available')"
          />
          <OnlineScrollArea v-else class="mt-3" max-height="32rem" data-testid="online-orders-accepted-list">
            <div v-for="order in coopOrderStore.myAcceptedOrders" :key="order.id" data-testid="online-orders-accepted-entry" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ order.title }}</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ order.owner_display_name }} 发布 · {{ order.description || '无描述' }}</p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem] text-muted">
                  {{ order.collaboration_mode === 'multi_stage' ? `已接 ${coopOrderStore.getAssignedStages(order).length} 段` : getCoopDeliveryStatusLabel(order.delivery_status) }}
                </span>
              </div>
              <p class="mt-2 text-[0.625rem] text-muted">
                {{ getCoopOrderTypeLabel(order.order_type) }} · 截止 {{ formatCoopTime(order.deadline_at) }}
              </p>
              <AsyncCommunityBoard
                v-if="order.visual_state?.async_projects?.length"
                class="mt-2"
                :projects="order.visual_state.async_projects"
                :recent-feedback="order.visual_state.recent_feedback"
                :action-running="coopOrderStore.actionRunning"
                @trigger-contribution="triggerOrderRelayAction(order, $event.optionId)"
              />
              <OnlineOrderStoryFlowPanel
                v-if="order.visual_state?.story_flow"
                class="mt-2"
                :story-flow="order.visual_state.story_flow"
              />
              <div v-if="order.relay_settlement_summary" class="mt-2 border border-warning/20 bg-warning/5 p-2" data-testid="online-orders-relay-settlement-summary">
                <div class="flex flex-col gap-1 text-[0.625rem] text-muted sm:flex-row sm:items-center sm:justify-between">
                  <span>分账池：{{ getCoopRewardTypeLabel(order.relay_settlement_summary.reward_type) }} {{ order.relay_settlement_summary.pool_reward_value }} · {{ getRelaySettlementStatusLabel(order.relay_settlement_summary.status) }}</span>
                  <span>已落账 {{ order.relay_settlement_summary.confirmed_reward_value }} / 待结 {{ order.relay_settlement_summary.pending_reward_value }}</span>
                </div>
                <div class="mt-2 grid gap-1 md:grid-cols-2">
                  <p
                    v-for="share in order.relay_settlement_summary.shares"
                    :key="share.stage_id"
                    class="truncate text-[0.625rem] text-muted"
                  >
                    {{ share.sequence }}. {{ share.stage_title }}：{{ share.share_percent }}% / {{ share.reward_value }} · {{ getRelaySettlementRouteLabel(share.reward_route) }}
                  </p>
                </div>
              </div>

              <div v-if="order.collaboration_mode === 'multi_stage'" class="mt-2 space-y-2">
                <div
                  v-for="stage in coopOrderStore.getAssignedStages(order)"
                  :key="stage.id"
                  class="border border-accent/10 bg-bg/40 p-2"
                >
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="text-xs text-accent">阶段 {{ stage.sequence }} · {{ stage.title }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ stage.description || '这段还没写说明。' }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ getCoopDeliveryStatusLabel(stage.delivery_status) }}</span>
                  </div>
                  <p class="mt-2 text-[0.625rem] text-muted">
                    {{ getCoopOrderTypeLabel(stage.preferred_order_type) }} · 目标 {{ stage.target_item_id || '未指定资源' }} ×{{ stage.target_quantity }}
                  </p>
                  <div v-if="stage.delivery_status === 'none'" class="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_100px]">
                    <input
                      v-model="coopOrderStore.ensureDeliveryDraft(order.id, stage.id).itemId"
                      class="online-input"
                      placeholder="资源 ID，例如 wheat"
                    />
                    <input
                      v-model.number="coopOrderStore.ensureDeliveryDraft(order.id, stage.id).quantity"
                      type="number"
                      min="1"
                      class="online-input"
                      placeholder="数量"
                    />
                  </div>
                  <textarea
                    v-if="stage.delivery_status === 'none'"
                    v-model="coopOrderStore.ensureDeliveryDraft(order.id, stage.id).note"
                    rows="2"
                    maxlength="160"
                    class="online-textarea mt-2 w-full resize-none"
                    placeholder="说明你完成了这一段什么工作。"
                  />
                  <div class="mt-2 flex flex-wrap justify-end gap-2">
                    <button
                      v-if="stage.delivery_status === 'none'"
                      data-testid="online-orders-stage-delivery-submit"
                      class="online-action-btn online-action-btn--compact"
                      type="button"
                      :disabled="coopOrderStore.actionRunning"
                      @click="openOrderActionConfirm({ kind: 'submit-delivery', orderId: order.id, stageId: stage.id })"
                    >
                      提交这一段
                    </button>
                    <button
                      class="online-action-btn online-action-btn--danger online-action-btn--compact"
                      type="button"
                      :disabled="coopOrderStore.actionRunning || stage.delivery_status !== 'none'"
                      @click="openOrderActionConfirm({ kind: 'cancel-stage', orderId: order.id, stageId: stage.id })"
                    >
                      取消这一段
                    </button>
                  </div>
                </div>
                <OnlineEmptyState
                  v-if="coopOrderStore.getAssignedStages(order).length === 0"
                  title="还没有占到接力阶段"
                  description="这张单是多段任务，可以回到可接列表选择其中一段来接。"
                  primary-label="查看可接阶段"
                  @primary="setActiveTab('available')"
                />
              </div>

              <template v-else>
                <div v-if="order.delivery_status === 'none'" class="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_100px]">
                  <input
                    v-model="coopOrderStore.ensureDeliveryDraft(order.id).itemId"
                    data-testid="online-orders-delivery-item-input"
                    class="online-input"
                    placeholder="资源 ID，例如 wheat"
                  />
                  <input
                    v-model.number="coopOrderStore.ensureDeliveryDraft(order.id).quantity"
                    data-testid="online-orders-delivery-quantity-input"
                    type="number"
                    min="1"
                    class="online-input"
                    placeholder="数量"
                  />
                </div>
                <textarea
                  v-if="order.delivery_status === 'none'"
                  v-model="coopOrderStore.ensureDeliveryDraft(order.id).note"
                  data-testid="online-orders-delivery-note-input"
                  rows="2"
                  maxlength="160"
                  class="online-textarea mt-2 w-full resize-none"
                  placeholder="交付说明，或者说明这次帮了什么。"
                />
                <div class="mt-2 flex flex-wrap justify-end gap-2">
                  <button
                    v-if="order.delivery_status === 'none'"
                    data-testid="online-orders-delivery-submit"
                    class="online-action-btn online-action-btn--compact"
                    type="button"
                    :disabled="coopOrderStore.actionRunning"
                    @click="openOrderActionConfirm({ kind: 'submit-delivery', orderId: order.id })"
                  >
                    提交交付
                  </button>
                  <button
                    class="online-action-btn online-action-btn--danger online-action-btn--compact"
                    type="button"
                    :disabled="coopOrderStore.actionRunning || order.status !== 'open' || order.delivery_status !== 'none'"
                    @click="openOrderActionConfirm({ kind: 'cancel-order', orderId: order.id })"
                  >
                    取消接单
                  </button>
                </div>
              </template>
            </div>
          </OnlineScrollArea>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">互助声望</p>
          <div class="mt-3 grid gap-2 text-xs">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">信任等级</p>
              <p class="mt-1 text-accent">{{ coopOrderStore.reputationSummary.trust_level.label }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">专业方向</p>
              <p class="mt-1 text-accent">{{ reputationSpecialtySummary }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">我常帮的人</p>
              <p class="mt-1 text-accent">{{ helpedTargetSummary }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">结算记录</p>
            <span class="text-[0.625rem] text-muted">{{ coopOrderStore.myReceipts.length }} 条</span>
          </div>
          <OnlineEmptyState
            v-if="coopOrderStore.myReceipts.length === 0"
            class="mt-3"
            title="还没有结算记录"
            description="你发布或接下的委托完成结算后，会在这里显示交付资源、奖励去向和补偿状态。"
          />
          <OnlineScrollArea v-else class="mt-3" max-height="36rem" data-testid="online-orders-receipt-list">
            <div v-for="receipt in coopOrderStore.myReceipts" :key="receipt.id" data-testid="online-orders-receipt-entry" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ receipt.stage_title || `委托 ${receipt.order_id}` }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ getCoopReceiptStatusLabel(receipt.status) }}</p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem]" :class="receipt.status === 'confirmed' ? 'text-success' : receipt.status === 'compensation_pending' ? 'text-warning' : 'text-muted'">
                  {{ getCoopReceiptStatusLabel(receipt.status) }}
                </span>
              </div>
              <p class="mt-2 text-[0.625rem] text-muted">
                发布人：{{ receipt.owner_display_name || receipt.owner_username }} · 接单人：{{ receipt.assignee_display_name || receipt.assignee_username }}
              </p>
              <p class="mt-1 text-[0.625rem] text-accent">
                回报：{{ getCoopRewardTypeLabel(receipt.reward_type) }} {{ receipt.reward_value }} {{ receipt.reward_label ? `· ${receipt.reward_label}` : '' }}
              </p>
              <p class="mt-1 text-[0.625rem] text-muted">
                交付资源：{{ formatDeliveredItems(receipt.delivered_items) }}
              </p>
              <p class="mt-1 text-[0.625rem] text-muted">
                交付说明：{{ receipt.result_note || '未填写额外交付说明。' }}
              </p>
              <p v-if="receipt.help_reputation_delta > 0 || receipt.specialty_reputation_delta > 0" class="mt-1 text-[0.625rem] text-success">
                互助声望 +{{ receipt.help_reputation_delta }} · 专业 +{{ receipt.specialty_reputation_delta }} · {{ receipt.trust_level_label || '信赖已更新' }}
              </p>
              <p v-if="receipt.reward_result" class="mt-1 text-[0.625rem] text-success">
                {{ receipt.reward_result }}
              </p>
              <p v-if="receipt.reward_route === 'shared_fund'" class="mt-1 text-[0.625rem] text-success">
                结算去向：共同基金
              </p>
              <p
                v-if="receipt.shared_order_efficiency_bonus_applied"
                class="mt-1 text-[0.625rem] text-success"
                data-testid="online-orders-receipt-efficiency-bonus"
              >
                同接效率：原始 {{ formatCoopDuration(receipt.order_original_duration_seconds) }} · 减免 {{ formatCoopDuration(receipt.order_efficiency_bonus_seconds) }} · 有效 {{ formatCoopDuration(receipt.order_effective_duration_seconds) }}
              </p>
              <OnlineTechnicalDetails
                v-if="saveStore.isBuiltInSampleRuntime"
                class="mt-2"
                title="结算记录详情"
                summary="展开查看记录编号、结算去向编号和更新时间。"
                :copyable="receiptTechnicalCopyValue(receipt)"
              >
                <div class="grid gap-1 sm:grid-cols-2">
                  <p>记录编号：{{ receipt.id }}</p>
                  <p>关联委托：{{ receipt.order_id }}</p>
                  <p v-if="receipt.stage_id">接力阶段：{{ receipt.stage_id }}</p>
                  <p>重复提交保护：{{ receipt.idempotency_key || '未记录' }}</p>
                  <p v-if="receipt.cohabitation_contract_id">共同庄园契约：{{ receipt.cohabitation_contract_id }}</p>
                  <p v-if="receipt.shared_fund_ledger_id">共同基金流水：{{ receipt.shared_fund_ledger_id }}</p>
                  <p v-if="receipt.compensation_id">关联补偿：{{ receipt.compensation_id }}</p>
                  <p>创建：{{ formatCoopTime(receipt.created_at) }}</p>
                  <p>确认：{{ formatCoopTime(receipt.confirmed_at) }}</p>
                  <p>更新：{{ formatCoopTime(receipt.updated_at) }}</p>
                </div>
              </OnlineTechnicalDetails>
            </div>
          </OnlineScrollArea>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">补偿重试</p>
            <span class="text-[0.625rem] text-muted">{{ coopOrderStore.myCompensations.length }} 条</span>
          </div>
          <OnlineEmptyState
            v-if="coopOrderStore.myCompensations.length === 0"
            class="mt-3"
            title="没有待处理补偿"
            description="如果结算需要补偿重试，会在这里显示原因、尝试次数和重试入口。"
          />
          <OnlineScrollArea v-else class="mt-3" max-height="36rem" data-testid="online-orders-compensation-list">
            <div v-for="compensation in coopOrderStore.myCompensations" :key="compensation.id" data-testid="online-orders-compensation-entry" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ compensation.reason || `委托 ${compensation.order_id}` }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ getCompensationStatusLabel(compensation.status) }}</p>
                </div>
                <span class="shrink-0 text-[0.625rem]" :class="compensation.status === 'pending' ? 'text-warning' : 'text-success'">
                  {{ getCompensationStatusLabel(compensation.status) }}
                </span>
              </div>
              <p class="mt-2 text-[0.625rem] text-accent">
                回报：{{ getCoopRewardTypeLabel(compensation.reward_type) }} {{ compensation.reward_value }} {{ compensation.reward_label ? `· ${compensation.reward_label}` : '' }}
              </p>
              <p class="mt-1 text-[0.625rem] text-muted">
                原因：{{ compensation.reason || '未记录补偿原因。' }}
              </p>
              <OnlineStatusBanner
                v-if="compensation.last_error"
                class="mt-2"
                tone="warning"
                title="最近一次补偿没有处理成功"
                description="可以稍后重试；详细原因已收进补偿详情。"
              />
              <p class="mt-2 text-[0.625rem] text-muted">已尝试 {{ compensation.attempt_count }} 次</p>
              <OnlineTechnicalDetails
                v-if="saveStore.isBuiltInSampleRuntime"
                class="mt-2"
                title="补偿详情"
                summary="展开查看补偿编号、关联记录、最近失败原因和更新时间。"
                :copyable="compensationTechnicalCopyValue(compensation)"
              >
                <div class="grid gap-1 sm:grid-cols-2">
                  <p>补偿编号：{{ compensation.id }}</p>
                  <p>关联记录：{{ compensation.receipt_id }}</p>
                  <p>关联委托：{{ compensation.order_id }}</p>
                  <p v-if="compensation.stage_id">接力阶段：{{ compensation.stage_id }}</p>
                  <p>发布人：{{ compensation.owner_username }}</p>
                  <p>接单人：{{ compensation.assignee_username }}</p>
                  <p>创建：{{ formatCoopTime(compensation.created_at) }}</p>
                  <p>更新：{{ formatCoopTime(compensation.updated_at) }}</p>
                  <p v-if="compensation.resolved_at">解决：{{ formatCoopTime(compensation.resolved_at) }}</p>
                  <p v-if="compensation.last_error" class="sm:col-span-2">最近失败原因：{{ compensation.last_error }}</p>
                </div>
              </OnlineTechnicalDetails>
              <div v-if="compensation.status === 'pending'" class="mt-2 flex justify-end">
                <button
                  data-testid="online-orders-compensation-retry-submit"
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="coopOrderStore.actionRunning"
                  @click="openOrderActionConfirm({ kind: 'retry-compensation', compensationId: compensation.id })"
                >
                  重试补偿
                </button>
              </div>
            </div>
          </OnlineScrollArea>
        </div>
      </div>
    </section>

    <OnlineOrderWizard
      :open="orderWizardOpen"
      :running="coopOrderStore.actionRunning"
      :error-message="coopOrderStore.errorMessage"
      :target-draft-summary="targetDraftSummary"
      :order-type-options="COOP_ORDER_TYPE_OPTIONS"
      :scope-options="COOP_ORDER_SCOPE_OPTIONS"
      :reward-type-options="COOP_REWARD_TYPE_OPTIONS"
      @submit="submitOrderDraft"
      @close="closeOrderWizard"
    />

    <OnlineBottomSheet
      :open="availableOrderDetailOpen"
      :title="availableOrderDetailTitle"
      :description="availableOrderDetailDescription"
      side="bottom"
      @close="closeAvailableOrderDetail"
    >
      <div v-if="selectedAvailableOrder" class="space-y-3" data-testid="online-orders-detail-sheet">
        <div class="grid gap-2 text-xs sm:grid-cols-2">
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">发布人</p>
            <p class="mt-1 text-accent">{{ selectedAvailableOrder.owner_display_name || selectedAvailableOrder.owner_username }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">可见范围</p>
            <p class="mt-1 text-accent">{{ getCoopOrderScopeLabel(selectedAvailableOrder.scope) }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">需求</p>
            <p class="mt-1 text-accent">{{ getAvailableOrderDemandSummary(selectedAvailableOrder) }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">回报</p>
            <p class="mt-1 text-accent">{{ getOrderRewardSummary(selectedAvailableOrder) }}</p>
          </div>
        </div>

        <div class="border border-accent/10 bg-black/10 p-2">
          <p class="text-[0.625rem] text-muted">委托说明</p>
          <p class="mt-1 text-xs leading-5 text-text">{{ selectedAvailableOrder.description || '发布人还没有填写额外说明。' }}</p>
          <p v-if="selectedAvailableOrder.priority_reasons?.length" class="mt-2 text-[0.625rem] leading-4 text-warning">
            推荐理由：{{ selectedAvailableOrder.priority_reasons.join('；') }}
          </p>
          <p v-if="selectedAvailableOrder.assignee_username" class="mt-1 text-[0.625rem] text-success">
            当前接单人：{{ selectedAvailableOrder.assignee_display_name || selectedAvailableOrder.assignee_username }}
          </p>
        </div>

        <div v-if="isRelayOrder(selectedAvailableOrder)" class="border border-warning/20 bg-warning/5 p-2" data-testid="online-orders-detail-relay-progress">
          <div class="flex items-center justify-between gap-2 text-[0.625rem] text-muted">
            <span>{{ getRelayStageProgressLabel(selectedAvailableOrder) }}</span>
            <span>{{ getRelayStageProgressPercent(selectedAvailableOrder) }}%</span>
          </div>
          <div class="mt-1 h-1.5 overflow-hidden border border-warning/20 bg-black/20">
            <div class="h-full bg-warning" :style="{ width: `${getRelayStageProgressPercent(selectedAvailableOrder)}%` }" />
          </div>
        </div>

        <AsyncCommunityBoard
          v-if="selectedAvailableOrder.visual_state?.async_projects?.length"
          :projects="selectedAvailableOrder.visual_state.async_projects"
          :recent-feedback="selectedAvailableOrder.visual_state.recent_feedback"
          :action-running="coopOrderStore.actionRunning"
          @trigger-contribution="triggerOrderRelayAction(selectedAvailableOrder, $event.optionId)"
        />
        <OnlineOrderStoryFlowPanel
          v-if="selectedAvailableOrder.visual_state?.story_flow"
          :story-flow="selectedAvailableOrder.visual_state.story_flow"
        />

        <div v-if="selectedAvailableOrder.relay_settlement_summary" class="border border-warning/20 bg-warning/5 p-2" data-testid="online-orders-relay-settlement-summary">
          <div class="flex flex-col gap-1 text-[0.625rem] text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>分账池：{{ getCoopRewardTypeLabel(selectedAvailableOrder.relay_settlement_summary.reward_type) }} {{ selectedAvailableOrder.relay_settlement_summary.pool_reward_value }} · {{ getRelaySettlementStatusLabel(selectedAvailableOrder.relay_settlement_summary.status) }}</span>
            <span>已落账 {{ selectedAvailableOrder.relay_settlement_summary.confirmed_reward_value }} / 待结 {{ selectedAvailableOrder.relay_settlement_summary.pending_reward_value }}</span>
          </div>
          <OnlineTechnicalDetails
            class="mt-2"
            title="接力分账详情"
            summary="展开查看每一段的回报比例、去向和结算状态。"
          >
            <div class="grid gap-1 md:grid-cols-2">
              <p
                v-for="share in selectedAvailableOrder.relay_settlement_summary.shares"
                :key="share.stage_id"
                class="truncate"
              >
                {{ share.sequence }}. {{ share.stage_title }}：{{ share.share_percent }}% / {{ share.reward_value }} · {{ getRelaySettlementRouteLabel(share.reward_route) }} · {{ getCoopReceiptStatusLabel(share.settlement_status === 'pending' ? 'pending_owner_confirm' : share.settlement_status) }}
              </p>
            </div>
          </OnlineTechnicalDetails>
        </div>

        <div v-if="selectedAvailableOrder.collaboration_mode === 'multi_stage'" class="space-y-2" data-testid="online-orders-detail-stage-list">
          <OnlineEmptyState
            v-if="coopOrderStore.getOpenStages(selectedAvailableOrder).length === 0"
            title="当前没有可接阶段"
            description="这张接力单的开放阶段可能已经被接走，或者正在等发布人确认上一段交付。"
          />
          <div
            v-for="stage in coopOrderStore.getOpenStages(selectedAvailableOrder)"
            :key="stage.id"
            class="border border-accent/10 bg-bg/40 p-2"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="text-xs text-accent">阶段 {{ stage.sequence }} · {{ stage.title }}</p>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ stage.description || '这段还没写说明。' }}</p>
              </div>
              <span class="w-fit shrink-0 text-[0.625rem] text-success">可接力</span>
            </div>
            <p class="mt-2 text-[0.625rem] text-muted">
              {{ getCoopOrderTypeLabel(stage.preferred_order_type) }} · 目标 {{ stage.target_item_id || '未指定资源' }} ×{{ stage.target_quantity }}
            </p>
            <div class="mt-2 flex justify-end">
              <button
                data-testid="online-orders-stage-accept-submit"
                class="online-action-btn online-action-btn--compact"
                type="button"
                :disabled="coopOrderStore.actionRunning"
                @click="openOrderActionConfirmFromDetail({ kind: 'accept-stage', orderId: selectedAvailableOrder.id, stageId: stage.id })"
              >
                接这一段
              </button>
            </div>
          </div>
        </div>

        <div v-else class="flex justify-end">
          <button
            data-testid="online-orders-detail-accept-submit"
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="coopOrderStore.actionRunning || !canAcceptSingleOrder(selectedAvailableOrder)"
            @click="openOrderActionConfirmFromDetail({ kind: 'accept-order', orderId: selectedAvailableOrder.id })"
          >
            {{ selectedAvailableOrder.assignee_username ? '已有人接单' : '接这张单' }}
          </button>
        </div>
      </div>
    </OnlineBottomSheet>

    <div v-if="orderActionConfirmOpen" class="contents" data-testid="online-orders-action-confirm">
      <OnlineConfirmActionDialog
        :open="orderActionConfirmOpen"
        :title="orderActionConfirmTitle"
        :description="orderActionConfirmDescription"
        :impact-items="orderActionConfirmImpactItems"
        :asset-changes="orderActionConfirmAssetChanges"
        :require-text="orderActionConfirmRequireText"
        :confirm-label="orderActionConfirmLabel"
        :running="coopOrderStore.actionRunning"
        :recovery-hint="orderActionConfirmRecoveryHint"
        @confirm="confirmOrderAction"
        @cancel="closeOrderActionConfirm"
        @close="closeOrderActionConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { ExternalLink, Handshake, Info, PlusCircle } from 'lucide-vue-next'
  import AsyncCommunityBoard from '@/components/game/online/AsyncCommunityBoard.vue'
  import OnlineBottomSheet from '@/components/game/online/OnlineBottomSheet.vue'
  import OnlineConfirmActionDialog from '@/components/game/online/OnlineConfirmActionDialog.vue'
  import OnlineEmptyState from '@/components/game/online/OnlineEmptyState.vue'
  import OnlineOrderWizard from '@/components/game/online/OnlineOrderWizard.vue'
  import OnlineOrderStoryFlowPanel from '@/components/game/online/OnlineOrderStoryFlowPanel.vue'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import OnlineScrollArea from '@/components/game/online/OnlineScrollArea.vue'
  import OnlineStatusBanner from '@/components/game/online/OnlineStatusBanner.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import { useCohabitationStore } from '@/stores/useCohabitationStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import type { CohabitationContract } from '@/utils/cohabitationApi'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import type { OnlineCoopCompensationEntry, OnlineCoopOrderEntry, OnlineCoopOrderScope, OnlineCoopOrderStageEntry, OnlineCoopOrderType, OnlineCoopReceiptEntry, OnlineCoopRewardType, OnlineCoopSocietyOrderBoard } from '@/utils/onlineProfileApi'

  type OrdersTabKey = 'publish' | 'available' | 'mine' | 'accepted' | 'receipts'
  type OrdersTabMeta = { key: OrdersTabKey; label: string; summary: string }
  type OrderActionConfirm =
    | { kind: 'accept-order'; orderId: string }
    | { kind: 'accept-stage'; orderId: string; stageId: string }
    | { kind: 'submit-delivery'; orderId: string; stageId?: string }
    | { kind: 'confirm-delivery'; orderId: string; stageId?: string }
    | { kind: 'cancel-order'; orderId: string }
    | { kind: 'cancel-stage'; orderId: string; stageId: string }
    | { kind: 'retry-compensation'; compensationId: string }
  type ConfirmDialogItem = { id: string; label: string; value?: string }

  const route = useRoute()
  const coopOrderStore = useCoopOrderStore()
  const cohabitationStore = useCohabitationStore()
  const saveStore = useSaveStore()
  const lastRefreshAttemptAt = ref(0)
  const orderWizardOpen = ref(false)
  const orderActionConfirm = ref<OrderActionConfirm | null>(null)
  const selectedAvailableOrderId = ref('')
  const orderBoardFilter = ref<'all' | 'single' | 'relay'>('all')
  const FAMILY_SHARED_FUND_TYPES = new Set(['oath_manor', 'business_partner'])
  const orderBoardFilterOptions: Array<{ id: 'all' | 'single' | 'relay'; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'single', label: '普通' },
    { id: 'relay', label: '接力单' },
  ]
  const tabs: OrdersTabMeta[] = [
    { key: 'publish', label: '发布', summary: '发布求助单、设置范围、奖励和多段接力草稿。' },
    { key: 'available', label: '可接', summary: '查看当前可见的公开、好友或邻里求助单。' },
    { key: 'mine', label: '我的发布', summary: '查看自己发布的求助单与待确认交付。' },
    { key: 'accepted', label: '我的接单', summary: '处理自己接下的求助单与交付草稿。' },
    { key: 'receipts', label: '结算与补偿', summary: '查看结算记录、补偿状态和异常原因。' },
  ]
  const defaultTab = tabs[1]!
  const normalizeTab = (value: unknown): OrdersTabKey => {
    const raw = Array.isArray(value) ? value[0] : value
    if (raw === 'publish' || raw === 'available' || raw === 'mine' || raw === 'accepted' || raw === 'receipts') return raw
    return 'available'
  }
  const activeTab = ref<OrdersTabKey>(normalizeTab(route.query.tab))
  const setActiveTab = (tab: string) => {
    activeTab.value = tab as OrdersTabKey
  }

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
    return `求助单、接单、交付、结算记录和补偿集中管理；当前互助等级：${trust}。`
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
  const boardSummary = computed(() => coopOrderStore.overview?.board_summary || {
    total_orders: coopOrderStore.overview?.orders?.length || 0,
    open_orders: (coopOrderStore.overview?.orders || []).filter(order => order.status === 'open').length,
    relay_orders: (coopOrderStore.overview?.orders || []).filter(order => order.collaboration_mode === 'multi_stage').length,
    open_relay_orders: (coopOrderStore.overview?.orders || []).filter(order => order.collaboration_mode === 'multi_stage' && order.status === 'open').length,
  })
  const buildFallbackSocietyOrderBoard = (): OnlineCoopSocietyOrderBoard => {
    const publicOrders = (coopOrderStore.overview?.orders || []).filter(order => order.scope === 'public')
    const publicRelayOrders = publicOrders.filter(order => isRelayOrder(order))
    const settlementSummaries = publicRelayOrders
      .map(order => order.relay_settlement_summary)
      .filter((summary): summary is NonNullable<OnlineCoopOrderEntry['relay_settlement_summary']> => Boolean(summary))
    return {
      public_orders: publicOrders.length,
      open_public_orders: publicOrders.filter(order => order.status === 'open').length,
      public_relay_orders: publicRelayOrders.length,
      open_public_relay_orders: publicRelayOrders.filter(order => order.status === 'open').length,
      reward_pool_value: settlementSummaries.reduce((sum, summary) => sum + summary.pool_reward_value, 0),
      confirmed_reward_value: settlementSummaries.reduce((sum, summary) => sum + summary.confirmed_reward_value, 0),
      pending_reward_value: settlementSummaries.reduce((sum, summary) => sum + summary.pending_reward_value, 0),
      compensation_pending_reward_value: settlementSummaries.reduce((sum, summary) => sum + summary.compensation_pending_reward_value, 0),
      compensation_count: (coopOrderStore.overview?.compensations || []).filter(entry => entry.status === 'pending').length,
      settlement_status_counts: {
        planned: settlementSummaries.filter(summary => summary.status === 'planned').length,
        settling: settlementSummaries.filter(summary => summary.status === 'settling').length,
        settled: settlementSummaries.filter(summary => summary.status === 'settled').length,
        compensation_pending: settlementSummaries.filter(summary => summary.status === 'compensation_pending').length,
      },
      recent_receipts: [],
    }
  }
  const societyOrderBoard = computed<OnlineCoopSocietyOrderBoard>(() =>
    coopOrderStore.overview?.society_order_board || buildFallbackSocietyOrderBoard()
  )
  const societyOrderBoardStatusRows = computed(() => [
    { id: 'planned', label: '待分账', value: societyOrderBoard.value.settlement_status_counts.planned },
    { id: 'settling', label: '分账中', value: societyOrderBoard.value.settlement_status_counts.settling },
    { id: 'settled', label: '已完成', value: societyOrderBoard.value.settlement_status_counts.settled },
    { id: 'compensation', label: '补偿中', value: societyOrderBoard.value.settlement_status_counts.compensation_pending },
  ])
  const societyOrderBoardSettlementSummary = computed(() =>
    `分账池 ${societyOrderBoard.value.reward_pool_value} · 已落账 ${societyOrderBoard.value.confirmed_reward_value} · 待结 ${societyOrderBoard.value.pending_reward_value} · 补偿中 ${societyOrderBoard.value.compensation_pending_reward_value}`
  )
  const summaryStats = computed(() => [
    { label: '订单总数', value: `${boardSummary.value.total_orders} 张` },
    { label: '开放订单', value: `${boardSummary.value.open_orders} 张` },
    { label: '接力单', value: `${boardSummary.value.relay_orders} 张` },
    { label: '开放接力', value: `${boardSummary.value.open_relay_orders} 张` },
    { label: '待补偿', value: `${pendingCompensationCount.value} 条` },
  ])
  const familySharedFundContracts = computed(() =>
    cohabitationStore.activeContracts.filter(contract => FAMILY_SHARED_FUND_TYPES.has(String(contract.type)))
  )
  const targetDraftSummary = computed(() => {
    if (!coopOrderStore.targetSaveIdDraft && !coopOrderStore.targetDisplayNameDraft) return ''
    const target = coopOrderStore.targetDisplayNameDraft || '目标好友'
    const saveId = coopOrderStore.targetSaveIdDraft ? `（存档 ID ${coopOrderStore.targetSaveIdDraft}）` : ''
    return `这张求助单会面向 ${target}${saveId}，系统仍会按存档级关系确认。`
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
  const getCompensationStatusLabel = (status: 'pending' | 'resolved') =>
    status === 'pending' ? '待重试' : '已解决'
  const getRelaySettlementStatusLabel = (status: 'planned' | 'settling' | 'settled' | 'compensation_pending') => {
    if (status === 'settled') return '已完成分账'
    if (status === 'settling') return '分账进行中'
    if (status === 'compensation_pending') return '补偿处理中'
    return '待分账'
  }
  const getRelaySettlementRouteLabel = (route: 'personal' | 'shared_fund') =>
    route === 'shared_fund' ? '共同基金' : '个人铜钱'
  const formatDeliveredItems = (items: Array<{ item_id: string; quantity: number }>) => {
    if (items.length === 0) return '未登记资源'
    return items.map(item => `${item.item_id} ×${item.quantity}`).join('、')
  }
  const receiptTechnicalCopyValue = (receipt: OnlineCoopReceiptEntry): string[] => [
    receipt.id,
    receipt.order_id,
    receipt.stage_id,
    receipt.idempotency_key,
    receipt.cohabitation_contract_id,
    receipt.shared_fund_ledger_id,
    receipt.compensation_id,
  ].filter((value): value is string => Boolean(value))
  const compensationTechnicalCopyValue = (compensation: OnlineCoopCompensationEntry): string[] => [
    compensation.id,
    compensation.receipt_id,
    compensation.order_id,
    compensation.stage_id,
  ].filter((value): value is string => Boolean(value))
  const formatCoopTime = (timestamp: number) => {
    if (!timestamp) return '未设置'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false })
  }
  const formatCoopDuration = (seconds: number | null | undefined) => {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
    if (safeSeconds < 60) return `${safeSeconds} 秒`
    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = safeSeconds % 60
    if (minutes < 60) return remainingSeconds > 0 ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours} 小时 ${remainingMinutes} 分` : `${hours} 小时`
  }
  const canShowSettlementControls = (rewardType: OnlineCoopRewardType) => rewardType === 'money'
  const isSharedFundSettlementSelected = (orderId: string, stageId = '') =>
    coopOrderStore.ensureSettlementDraft(orderId, stageId).rewardRoute === 'shared_fund'
  const canConfirmSettlement = (orderId: string, stageId = '') => {
    const draft = coopOrderStore.ensureSettlementDraft(orderId, stageId)
    return draft.rewardRoute !== 'shared_fund' || Boolean(draft.cohabitationContractId.trim())
  }
  const syncSettlementContractDefault = (orderId: string, stageId = '') => {
    const draft = coopOrderStore.ensureSettlementDraft(orderId, stageId)
    if (draft.rewardRoute === 'personal') {
      draft.cohabitationContractId = ''
      return
    }
    if (!draft.cohabitationContractId && familySharedFundContracts.value.length > 0) {
      draft.cohabitationContractId = familySharedFundContracts.value[0]!.id
    }
  }
  const getSettlementHint = (orderId: string, stageId = '') => {
    if (isSharedFundSettlementSelected(orderId, stageId)) {
      return '共同基金仅限家族 / 合伙庄园，系统会确认发布人与接单人同为成员。'
    }
    return '默认写入接单人个人铜钱。'
  }
  const getSettlementContractLabel = (contract: CohabitationContract) => {
    const balance = Number(contract.shared_fund?.balance || 0)
    return `${contract.title || contract.type_label || contract.id} · 余额 ${balance}`
  }
  const isOrderAcceptable = (order: OnlineCoopOrderEntry) => {
    if (order.status !== 'open') return false
    if (order.collaboration_mode === 'multi_stage') {
      return coopOrderStore.getOpenStages(order).length > 0
    }
    return !order.assignee_username
  }
  const canAcceptSingleOrder = (order: OnlineCoopOrderEntry) =>
    order.status === 'open' && order.collaboration_mode !== 'multi_stage' && !order.assignee_username
  const isRelayOrder = (order: OnlineCoopOrderEntry) => order.collaboration_mode === 'multi_stage' || (order.stages?.length ?? 0) > 0
  const getRelayStageCounts = (order: OnlineCoopOrderEntry) => {
    const stages = order.stages || []
    return {
      total: stages.length,
      complete: stages.filter(stage => stage.delivery_status === 'confirmed').length,
      active: stages.filter(stage => stage.assignee_username && stage.delivery_status !== 'confirmed').length,
      open: stages.filter(stage => !stage.assignee_username && stage.delivery_status === 'none').length,
    }
  }
  const getRelayStageProgressPercent = (order: OnlineCoopOrderEntry) => {
    const counts = getRelayStageCounts(order)
    if (counts.total <= 0) return 0
    return Math.min(100, Math.round((counts.complete / counts.total) * 100))
  }
  const getRelayStageProgressLabel = (order: OnlineCoopOrderEntry) => {
    const counts = getRelayStageCounts(order)
    if (counts.total <= 0) return '暂无接力阶段'
    return `阶段 ${counts.complete}/${counts.total} 已确认 · ${counts.active} 段处理中 · ${counts.open} 段可接`
  }
  const getAvailableOrderRank = (order: OnlineCoopOrderEntry) => {
    if (isOrderAcceptable(order)) return 0
    if (order.status === 'open') return 1
    return 2
  }
  const orderBoardFilterLabel = computed(() =>
    orderBoardFilterOptions.find(option => option.id === orderBoardFilter.value)?.label || '全部'
  )
  const availableOrderCards = computed(() =>
    [...coopOrderStore.visibleOrders]
      .filter(order => {
        if (orderBoardFilter.value === 'relay') return isRelayOrder(order)
        if (orderBoardFilter.value === 'single') return !isRelayOrder(order)
        return true
      })
      .sort((left, right) =>
        getAvailableOrderRank(left) - getAvailableOrderRank(right) || right.updated_at - left.updated_at
      )
  )
  const getAvailableOrderDemandSummary = (order: OnlineCoopOrderEntry) => {
    const typeLabel = getCoopOrderTypeLabel(order.order_type)
    if (isRelayOrder(order)) {
      const counts = getRelayStageCounts(order)
      return `${typeLabel} · ${counts.total} 段接力 · ${counts.open} 段可接`
    }
    return `${typeLabel} · ${order.description.trim() || '等待发布人补充说明'}`
  }
  const getOrderDeadlineSummary = (order: OnlineCoopOrderEntry) => {
    if (!order.deadline_at) return '未设置截止时间'
    const remainingSeconds = Math.floor(order.deadline_at - Date.now() / 1000)
    if (remainingSeconds <= 0) return '已到截止时间'
    return `剩余 ${formatCoopDuration(remainingSeconds)}`
  }
  const getAvailableOrderStatusLabel = (order: OnlineCoopOrderEntry) => {
    if (order.status !== 'open') return getCoopOrderStatusLabel(order.status)
    return isOrderAcceptable(order) ? '可接' : '处理中'
  }
  const selectedAvailableOrder = computed(() => {
    if (!selectedAvailableOrderId.value) return null
    return availableOrderCards.value.find(order => order.id === selectedAvailableOrderId.value)
      || getOrderById(selectedAvailableOrderId.value)
      || null
  })
  const availableOrderDetailOpen = computed(() => Boolean(selectedAvailableOrder.value))
  const availableOrderDetailTitle = computed(() => selectedAvailableOrder.value?.title || '委托详情')
  const availableOrderDetailDescription = computed(() => {
    const order = selectedAvailableOrder.value
    if (!order) return ''
    return `${getAvailableOrderDemandSummary(order)} · ${getOrderDeadlineSummary(order)}`
  })
  const reputationSpecialtySummary = computed(() => {
    const specialties = coopOrderStore.reputationSummary.specialty_ranks.slice(0, 2)
    if (specialties.length === 0) return '暂无专业方向'
    return specialties.map(entry => `${getCoopOrderTypeLabel(entry.order_type as OnlineCoopOrderType)} ${entry.score}`).join('、')
  })
  const helpedTargetSummary = computed(() => {
    const targets = coopOrderStore.reputationSummary.top_helped_targets.slice(0, 2)
    if (targets.length === 0) return '暂无稳定互助对象'
    return targets.map(entry => `${entry.display_name || entry.username} ${entry.help_count} 次`).join('、')
  })

  const getOrderById = (orderId: string) =>
    (coopOrderStore.overview?.orders || []).find(order => order.id === orderId)
  const getOrderStageById = (order: OnlineCoopOrderEntry | undefined, stageId = '') =>
    (order?.stages || []).find(stage => stage.id === stageId)
  const getCompensationById = (compensationId: string) =>
    coopOrderStore.myCompensations.find(compensation => compensation.id === compensationId)
  const getActionOrderId = (action: OrderActionConfirm | null) =>
    action && 'orderId' in action ? action.orderId : ''
  const getActionStageId = (action: OrderActionConfirm | null) =>
    action && 'stageId' in action ? action.stageId : ''
  const getOrderRewardSummary = (order: OnlineCoopOrderEntry | undefined) => {
    if (!order) return '未找到回报'
    return `${getCoopRewardTypeLabel(order.reward_type)} ${order.reward_value}${order.reward_label ? ` · ${order.reward_label}` : ''}`
  }
  const getCompensationRewardSummary = (compensation: OnlineCoopCompensationEntry | undefined) => {
    if (!compensation) return '未找到回报'
    return `${getCoopRewardTypeLabel(compensation.reward_type)} ${compensation.reward_value}${compensation.reward_label ? ` · ${compensation.reward_label}` : ''}`
  }
  const getStageDisplayLabel = (stage: OnlineCoopOrderStageEntry | undefined) =>
    stage ? `阶段 ${stage.sequence} · ${stage.title}` : '整单'
  const getDeliveryDraftSummary = (orderId: string, stageId = '') => {
    const draft = coopOrderStore.ensureDeliveryDraft(orderId, stageId)
    const item = draft.itemId.trim()
      ? `${draft.itemId.trim()} ×${Math.max(1, Math.floor(Number(draft.quantity) || 1))}`
      : '未登记资源'
    const note = draft.note.trim() || '未填写说明'
    return `${item} · ${note}`
  }
  const getSettlementRouteSummary = (orderId: string, stageId = '') => {
    const draft = coopOrderStore.ensureSettlementDraft(orderId, stageId)
    if (draft.rewardRoute !== 'shared_fund') return '接单人个人铜钱'
    const contract = familySharedFundContracts.value.find(entry => entry.id === draft.cohabitationContractId)
    return `共同基金 · ${contract ? getSettlementContractLabel(contract) : draft.cohabitationContractId || '未选择庄园'}`
  }
  const orderActionConfirmOpen = computed(() => Boolean(orderActionConfirm.value))
  const orderActionConfirmCompensation = computed(() =>
    orderActionConfirm.value?.kind === 'retry-compensation'
      ? getCompensationById(orderActionConfirm.value.compensationId)
      : undefined
  )
  const orderActionConfirmOrder = computed(() => {
    if (orderActionConfirm.value?.kind === 'retry-compensation') {
      const compensation = orderActionConfirmCompensation.value
      return compensation ? getOrderById(compensation.order_id) : undefined
    }
    return getOrderById(getActionOrderId(orderActionConfirm.value))
  })
  const orderActionConfirmStage = computed(() =>
    getOrderStageById(orderActionConfirmOrder.value, getActionStageId(orderActionConfirm.value))
  )
  const orderActionConfirmTitle = computed(() => {
    const action = orderActionConfirm.value
    if (!action) return '确认委托操作'
    if (action.kind === 'accept-order') return '确认接下这张求助单'
    if (action.kind === 'accept-stage') return '确认接下这一段'
    if (action.kind === 'submit-delivery') return action.stageId ? '确认提交这一段交付' : '确认提交交付'
    if (action.kind === 'confirm-delivery') return action.stageId ? '确认这一段结算' : '确认委托结算'
    if (action.kind === 'cancel-order') return '确认取消接单'
    if (action.kind === 'cancel-stage') return '确认取消这一段'
    return '确认重试补偿'
  })
  const orderActionConfirmBaseDescription = computed(() => {
    const action = orderActionConfirm.value
    if (!action) return '请先选择一个委托操作。'
    if (action.kind === 'accept-order' || action.kind === 'accept-stage') {
      return '确认后会把这项求助加入“我的接单”，你需要在截止前提交交付。'
    }
    if (action.kind === 'submit-delivery') {
      return '确认后发布人会看到你的交付内容；提交成功后，这份交付草稿会被清空。'
    }
    if (action.kind === 'confirm-delivery') {
      return '确认后会按当前结算去向记录回报；如果入账没有成功，会留下补偿处理入口。'
    }
    if (action.kind === 'cancel-order' || action.kind === 'cancel-stage') {
      return '确认后会释放这次接单，其他玩家可以继续接手。'
    }
    return '确认后会按补偿记录重新尝试发放回报。'
  })
  const orderActionConfirmDescription = computed(() =>
    coopOrderStore.errorMessage && orderActionConfirm.value
      ? `${orderActionConfirmBaseDescription.value} 最近失败原因：${coopOrderStore.errorMessage}`
      : orderActionConfirmBaseDescription.value
  )
  const orderActionConfirmLabel = computed(() => {
    const action = orderActionConfirm.value
    if (!action) return '确认执行'
    if (action.kind === 'accept-order' || action.kind === 'accept-stage') return '确认接单'
    if (action.kind === 'submit-delivery') return '确认提交'
    if (action.kind === 'confirm-delivery') return '确认结算'
    if (action.kind === 'cancel-order' || action.kind === 'cancel-stage') return '确认取消'
    return '确认重试'
  })
  const orderActionConfirmRequireText = computed(() => {
    const action = orderActionConfirm.value
    return action?.kind === 'cancel-order' || action?.kind === 'cancel-stage' ? '取消' : ''
  })
  const orderActionConfirmRecoveryHint = computed(() => {
    const action = orderActionConfirm.value
    if (!action) return ''
    if (action.kind === 'accept-order' || action.kind === 'accept-stage') return '接单失败时不会占用这张单，可以刷新列表后再试。'
    if (action.kind === 'submit-delivery') return '提交失败时会保留当前交付草稿，你可以修改资源、数量或说明后重试。'
    if (action.kind === 'confirm-delivery') return '结算失败时仍会保留待确认记录，并在补偿页显示可处理的恢复入口。'
    if (action.kind === 'cancel-order' || action.kind === 'cancel-stage') return '取消失败时接单状态不会变化，可以刷新后再次确认。'
    return '补偿重试失败时会更新最近失败原因，便于稍后继续处理。'
  })
  const orderActionConfirmImpactItems = computed<ConfirmDialogItem[]>(() => {
    const action = orderActionConfirm.value
    if (!action) return []
    if (action.kind === 'retry-compensation') {
      const compensation = orderActionConfirmCompensation.value
      if (!compensation) return []
      return [
        { id: 'compensation', label: '补偿记录', value: compensation.id },
        { id: 'receipt', label: '结算记录', value: compensation.receipt_id },
        { id: 'order', label: '关联求助单', value: orderActionConfirmOrder.value?.title || compensation.order_id },
      ]
    }

    const order = orderActionConfirmOrder.value
    if (!order) return []
    const stage = orderActionConfirmStage.value
    const items: ConfirmDialogItem[] = [
      { id: 'order', label: '求助单', value: order.title },
      { id: 'owner', label: '发布人', value: order.owner_display_name || order.owner_username || '未知' },
      { id: 'deadline', label: '截止时间', value: formatCoopTime(order.deadline_at) },
    ]
    if (stage) {
      items.push({ id: 'stage', label: '接力阶段', value: getStageDisplayLabel(stage) })
    }
    const assignee = stage?.assignee_display_name || stage?.assignee_username || order.assignee_display_name || order.assignee_username
    if (assignee && (action.kind === 'submit-delivery' || action.kind === 'confirm-delivery' || action.kind === 'cancel-order' || action.kind === 'cancel-stage')) {
      items.push({ id: 'assignee', label: '接单人', value: assignee })
    }
    return items
  })
  const orderActionConfirmAssetChanges = computed<ConfirmDialogItem[]>(() => {
    const action = orderActionConfirm.value
    if (!action) return []
    if (action.kind === 'retry-compensation') {
      const compensation = orderActionConfirmCompensation.value
      if (!compensation) return []
      return [
        { id: 'reward', label: '补偿回报', value: getCompensationRewardSummary(compensation) },
        { id: 'attempt', label: '当前尝试次数', value: `${compensation.attempt_count} 次` },
      ]
    }

    const order = orderActionConfirmOrder.value
    if (!order) return []
    const stageId = getActionStageId(action)
    if (action.kind === 'accept-order' || action.kind === 'accept-stage') {
      return [
        { id: 'reward', label: '可获得回报', value: getOrderRewardSummary(order) },
        { id: 'state', label: '接单状态', value: '进入“我的接单”' },
      ]
    }
    if (action.kind === 'submit-delivery') {
      return [
        { id: 'delivery', label: '交付内容', value: getDeliveryDraftSummary(order.id, stageId) },
        { id: 'state', label: '交付状态', value: '等待发布人确认' },
      ]
    }
    if (action.kind === 'confirm-delivery') {
      return [
        { id: 'reward', label: '结算回报', value: getOrderRewardSummary(order) },
        { id: 'route', label: '结算去向', value: getSettlementRouteSummary(order.id, stageId) },
      ]
    }
    return [
      { id: 'state', label: '接单状态', value: '释放给其他玩家' },
      { id: 'draft', label: '交付草稿', value: '保留在本地输入框中' },
    ]
  })

  const refreshOrders = async () => {
    await coopOrderStore.refreshOverview().catch(() => {})
    lastRefreshAttemptAt.value = Date.now()
  }

  const openOrderWizard = () => {
    orderWizardOpen.value = true
  }

  const openAvailableOrderDetail = (order: OnlineCoopOrderEntry) => {
    selectedAvailableOrderId.value = order.id
  }

  const closeAvailableOrderDetail = () => {
    selectedAvailableOrderId.value = ''
  }

  const closeOrderWizard = () => {
    if (coopOrderStore.actionRunning) return
    orderWizardOpen.value = false
  }

  const submitOrderDraft = async () => {
    try {
      await coopOrderStore.submitOrder()
      orderWizardOpen.value = false
      activeTab.value = 'mine'
    } catch {
      orderWizardOpen.value = true
    }
  }

  const openOrderActionConfirm = (action: OrderActionConfirm) => {
    const orderId = getActionOrderId(action)
    const stageId = getActionStageId(action)
    if (action.kind === 'retry-compensation') {
      if (!getCompensationById(action.compensationId)) return
    } else {
      const order = getOrderById(orderId)
      if (!order) return
      if (stageId && !getOrderStageById(order, stageId)) return
    }
    coopOrderStore.errorMessage = ''
    orderActionConfirm.value = action
  }

  const openOrderActionConfirmFromDetail = (action: OrderActionConfirm) => {
    openOrderActionConfirm(action)
    if (orderActionConfirm.value) {
      closeAvailableOrderDetail()
    }
  }

  const closeOrderActionConfirm = () => {
    if (coopOrderStore.actionRunning) return
    orderActionConfirm.value = null
  }

  const runOrderStoreAction = async (action: () => Promise<void>) => {
    try {
      await action()
      return !coopOrderStore.errorMessage
    } catch {
      return false
    }
  }

  const acceptOrderEntry = async (orderId: string) => {
    return runOrderStoreAction(() => coopOrderStore.acceptOrder(orderId))
  }
  const acceptStageEntry = async (orderId: string, stageId: string) => {
    return runOrderStoreAction(() => coopOrderStore.acceptStage(orderId, stageId))
  }
  const cancelOrderEntry = async (orderId: string) => {
    return runOrderStoreAction(() => coopOrderStore.cancelAcceptedOrder(orderId))
  }
  const cancelStageEntry = async (orderId: string, stageId: string) => {
    return runOrderStoreAction(() => coopOrderStore.cancelAcceptedStage(orderId, stageId))
  }
  const submitDeliveryEntry = async (orderId: string) => {
    return runOrderStoreAction(() => coopOrderStore.submitDelivery(orderId))
  }
  const submitStageDeliveryEntry = async (orderId: string, stageId: string) => {
    return runOrderStoreAction(() => coopOrderStore.submitDelivery(orderId, stageId))
  }
  const confirmDeliveryEntry = async (orderId: string) => {
    return runOrderStoreAction(() => coopOrderStore.confirmDelivery(orderId))
  }
  const confirmStageDeliveryEntry = async (orderId: string, stageId: string) => {
    return runOrderStoreAction(() => coopOrderStore.confirmDelivery(orderId, stageId))
  }
  const triggerOrderRelayAction = (order: OnlineCoopOrderEntry, optionId: string) => {
    const [action, stageId] = optionId.split(':')
    if (!stageId) return
    if (action === 'accept_stage') {
      openOrderActionConfirm({ kind: 'accept-stage', orderId: order.id, stageId })
      if (orderActionConfirm.value && selectedAvailableOrderId.value === order.id) {
        closeAvailableOrderDetail()
      }
      return
    }
    if (action === 'confirm_stage') {
      openOrderActionConfirm({ kind: 'confirm-delivery', orderId: order.id, stageId })
      if (orderActionConfirm.value && selectedAvailableOrderId.value === order.id) {
        closeAvailableOrderDetail()
      }
      return
    }
    if (action === 'deliver_stage') {
      const draft = coopOrderStore.ensureDeliveryDraft(order.id, stageId)
      if (!draft.note.trim()) {
        draft.note = '从接力路线提交交付说明'
      }
      openOrderActionConfirm({ kind: 'submit-delivery', orderId: order.id, stageId })
      if (orderActionConfirm.value && selectedAvailableOrderId.value === order.id) {
        closeAvailableOrderDetail()
      }
    }
  }
  const retryCompensationEntry = async (compensationId: string) => {
    return runOrderStoreAction(() => coopOrderStore.retryCompensation(compensationId))
  }
  const confirmOrderAction = async () => {
    const action = orderActionConfirm.value
    if (!action) return
    let success = false
    if (action.kind === 'accept-order') {
      success = await acceptOrderEntry(action.orderId)
    } else if (action.kind === 'accept-stage') {
      success = await acceptStageEntry(action.orderId, action.stageId)
    } else if (action.kind === 'submit-delivery') {
      success = action.stageId
        ? await submitStageDeliveryEntry(action.orderId, action.stageId)
        : await submitDeliveryEntry(action.orderId)
    } else if (action.kind === 'confirm-delivery') {
      success = action.stageId
        ? await confirmStageDeliveryEntry(action.orderId, action.stageId)
        : await confirmDeliveryEntry(action.orderId)
    } else if (action.kind === 'cancel-order') {
      success = await cancelOrderEntry(action.orderId)
    } else if (action.kind === 'cancel-stage') {
      success = await cancelStageEntry(action.orderId, action.stageId)
    } else {
      success = await retryCompensationEntry(action.compensationId)
    }
    if (success) {
      orderActionConfirm.value = null
    }
  }

  onMounted(() => {
    applyCoopRouteDraft()
    void refreshOrders()
    void cohabitationStore.refreshOverview({ silent: true }).catch(() => {})
  })

  watch(
    () => route.query.tab,
    tab => {
      activeTab.value = normalizeTab(tab)
    }
  )

  watch(
    () => [route.query.scope, route.query.target_username, route.query.target_save_id],
    () => {
      applyCoopRouteDraft()
    }
  )
</script>
