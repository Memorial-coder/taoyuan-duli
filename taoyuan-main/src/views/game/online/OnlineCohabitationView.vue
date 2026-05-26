<template>
  <div class="space-y-3" data-testid="online-cohabitation-page">
    <OnlineModuleShell
      title="共同庄园"
      :summary="moduleSummary"
      :meta="refreshStateLabel"
      refresh-label="刷新共同庄园"
      :refresh-running="cohabitationStore.loading || cohabitationStore.detailsLoading"
      :refresh-disabled="cohabitationStore.loading || cohabitationStore.detailsLoading"
      :stats="summaryStats"
      stats-grid-class="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6"
      :tabs="tabs"
      :active-tab="activeTab"
      @refresh="refreshModule"
      @update:active-tab="setActiveTab"
    >
      <template #icon>
        <HeartHandshake :size="16" />
      </template>
      <template #errors>
        <div v-if="cohabitationStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {{ cohabitationStore.errorMessage }}
        </div>
      </template>
    </OnlineModuleShell>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
        <span v-if="selectedContract" class="w-fit shrink-0 border border-accent/15 px-2 py-1 text-[10px] text-muted">
          {{ selectedContract.type_label }} · {{ statusLabel(selectedContract.status) }}
        </span>
      </div>

      <div v-if="activeTab === 'overview'" class="grid gap-3 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">契约列表</p>
            <span class="text-[10px] text-muted">{{ cohabitationStore.contracts.length }} 份</span>
          </div>
          <div v-if="cohabitationStore.contracts.length === 0" class="mt-3 border border-accent/10 bg-black/10 p-3 text-xs leading-5 text-muted">
            当前账号还没有可切换的共同庄园契约。
          </div>
          <div v-else class="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            <button
              v-for="contract in cohabitationStore.contracts"
              :key="contract.id"
              type="button"
              class="w-full border p-3 text-left transition-colors"
              :class="contract.id === cohabitationStore.activeContractId ? 'border-accent/50 bg-accent/10' : 'border-accent/10 bg-black/10 hover:border-accent/30'"
              :data-testid="`online-cohabitation-contract-${contract.id}`"
              @click="selectContract(contract.id)"
            >
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ contract.title || contract.type_label }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ contract.shared_manor_id }} · {{ contract.members.length }} 人</p>
                </div>
                <span class="w-fit shrink-0 border px-2 py-0.5 text-[10px]" :class="statusBadgeClass(contract.status)">
                  {{ statusLabel(contract.status) }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-[10px] leading-4 text-muted">
                {{ contractMembersLabel(contract) }}
              </p>
              <div class="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <span class="border border-accent/10 px-2 py-1 text-muted">基金 {{ contract.shared_fund?.balance ?? 0 }}</span>
                <span class="border border-accent/10 px-2 py-1 text-muted">仓库 {{ contract.shared_warehouse?.items?.length ?? 0 }}</span>
                <span class="border border-accent/10 px-2 py-1 text-muted">审计 {{ contract.audit_log?.length ?? 0 }}</span>
              </div>
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-accent">
                <HeartHandshake :size="13" />
                <p class="text-sm">发起契约</p>
              </div>
              <span class="text-[10px] text-muted">{{ contractDraftMemberRangeLabel }}</span>
            </div>
            <div class="mt-3 grid gap-2">
              <div class="grid gap-2 md:grid-cols-2">
                <label class="block">
                  <span class="text-[10px] text-muted">关系类型</span>
                  <select
                    v-model="contractDraftType"
                    class="online-select mt-1 text-xs"
                    data-testid="online-cohabitation-contract-create-type"
                  >
                    <option
                      v-for="option in relationOptions"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[10px] text-muted">标题</span>
                  <input
                    v-model="contractDraftTitle"
                    class="online-input mt-1 text-xs"
                    data-testid="online-cohabitation-contract-create-title"
                    maxlength="40"
                    placeholder="共同庄园"
                  >
                </label>
              </div>
              <label class="block">
                <span class="text-[10px] text-muted">邀请好友</span>
                <input
                  v-model="contractDraftTargetUsernames"
                  class="online-input mt-1 text-xs"
                  data-testid="online-cohabitation-contract-create-targets"
                  placeholder="用户名，多个用逗号分隔"
                >
              </label>
              <button
                class="online-action-btn online-action-btn--compact justify-center"
                type="button"
                :disabled="!canCreateContractDraft || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-contract-create-submit"
                @click="createContractDraft"
              >
                <HeartHandshake :size="12" />
                发起共同庄园
              </button>
              <p
                v-if="contractActionMessage && !selectedContract"
                class="text-xs leading-5"
                :class="contractActionOk ? 'text-emerald-200' : 'text-red-100'"
              >
                {{ contractActionMessage }}
              </p>
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <div class="flex items-center gap-2 text-accent">
              <HeartHandshake :size="13" />
              <p class="text-sm">当前入口</p>
            </div>
            <div v-if="selectedContract" class="mt-3 space-y-3">
              <div class="grid gap-2 md:grid-cols-3">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">关系类型</p>
                  <p class="mt-1 text-xs text-accent">{{ selectedContract.type_label }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">成员</p>
                  <p class="mt-1 text-xs text-accent">{{ selectedContract.members.length }} 人</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">共同基金</p>
                  <p class="mt-1 text-xs text-accent">{{ selectedContract.shared_fund?.balance ?? 0 }}</p>
                </div>
              </div>
              <div class="border border-accent/10 bg-black/10 p-3">
                <p class="text-[10px] text-muted">成员边界</p>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="member in selectedContract.members"
                    :key="member.username"
                    class="border border-accent/15 px-2 py-1 text-[10px] text-muted"
                  >
                    {{ member.display_name || member.username }} · {{ member.status === 'accepted' ? '已接受' : statusLabel(member.status) }}
                  </span>
                </div>
              </div>
              <div class="grid gap-2 md:grid-cols-2">
                <button
                  v-if="canAcceptSelectedContract"
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="cohabitationStore.actionLoading"
                  @click="acceptSelectedContract"
                >
                  <CheckCircle2 :size="12" />
                  接受契约
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!cohabitationStore.canOpenSelectedContract"
                  @click="activeTab = 'map'"
                >
                  <Map :size="12" />
                  进入共同地图
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!cohabitationStore.canOpenSelectedContract"
                  @click="activeTab = 'offline'"
                >
                  <Clock3 :size="12" />
                  查看离线状态
                </button>
              </div>
              <p
                v-if="contractActionMessage"
                class="text-xs leading-5"
                :class="contractActionOk ? 'text-emerald-200' : 'text-red-100'"
              >
                {{ contractActionMessage }}
              </p>
              <p v-if="!cohabitationStore.canOpenSelectedContract" class="text-xs leading-5 text-muted">
                这份契约尚未生效，只在列表中保留状态，不开放共同庄园地图、仓库、基金或权限面板。
              </p>
              <div v-if="cohabitationStore.canOpenSelectedContract || latestSeparationPreview" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs text-accent">分居返还预览</p>
                  <span class="text-[10px] text-muted">
                    {{ latestSeparationPreview ? `v${latestSeparationPreview.version}` : '未生成' }}
                  </span>
                </div>
                <div class="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    v-model="separationPreviewReason"
                    class="online-input text-xs"
                    data-testid="online-cohabitation-separation-preview-reason"
                    maxlength="80"
                    placeholder="原因备注（可选）"
                  >
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canCreateSeparationPreview || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-separation-preview-submit"
                    @click="createSeparationPreview"
                  >
                    <XCircle :size="12" />
                    生成预览
                  </button>
                </div>
                <p
                  v-if="separationActionMessage"
                  class="mt-2 text-[10px] leading-4"
                  :class="separationActionOk ? 'text-emerald-200' : 'text-red-100'"
                >
                  {{ separationActionMessage }}
                </p>
                <div v-if="latestSeparationPreview" class="mt-3 space-y-2">
                  <p class="text-[10px] leading-4 text-muted">{{ latestSeparationPreview.summary }}</p>
                  <div class="grid gap-2 text-[10px] md:grid-cols-3">
                    <p class="border border-accent/10 bg-bg/30 p-2 text-muted">创建：{{ formatTime(latestSeparationPreview.created_at) }}</p>
                    <p class="border border-accent/10 bg-bg/30 p-2 text-muted">可确认：{{ formatTime(latestSeparationPreview.confirm_after_at) }}</p>
                    <p class="border border-accent/10 bg-bg/30 p-2 text-muted">过期：{{ formatTime(latestSeparationPreview.expires_at) }}</p>
                  </div>
                  <div v-if="separationPreviewDeferredOperations.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="item in separationPreviewDeferredOperations"
                      :key="item"
                      class="border border-accent/15 px-2 py-1 text-[10px] text-muted"
                    >
                      {{ deferredOperationLabel(item) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-2 border border-accent/10 bg-bg/30 p-2 text-[10px] text-muted">
                    <p>{{ separationPreviewConfirmationLabel }}</p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canConfirmSeparationPreview || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-preview-confirm"
                        @click="confirmSeparationPreview"
                      >
                        <CheckCircle2 :size="12" />
                        确认预览
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canRequestSeparationExecution || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-execution-request"
                        @click="requestSeparationExecution"
                      >
                        <Clock3 :size="12" />
                        请求执行
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canExecuteSeparationAssetReturn || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-asset-return-execute"
                        @click="executeSeparationAssetReturn"
                      >
                        <ShieldCheck :size="12" />
                        记录返还
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canWriteSeparationPersonalFarmReturns || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-personal-farm-write"
                        @click="writeSeparationPersonalFarmReturns"
                      >
                        <Map :size="12" />
                        写回田区
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canRefundSeparationSharedFund || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-shared-fund-refund"
                        @click="refundSeparationSharedFund"
                      >
                        <Wallet :size="12" />
                        返还基金
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canReturnSeparationSharedWarehouse || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-shared-warehouse-return"
                        @click="returnSeparationSharedWarehouse"
                      >
                        <Package :size="12" />
                        返还仓库
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canSplitSeparationDecorationsBuildings || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-decoration-building-split"
                        @click="splitSeparationDecorationsBuildings"
                      >
                        <Building2 :size="12" />
                        拆分装建
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canResolveSeparationFamilyStory || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-family-story-resolve"
                        @click="resolveSeparationFamilyStory"
                      >
                        <ClipboardList :size="12" />
                        记录剧情
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canWriteSeparationPersonalStoryReceipts || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-personal-story-receipts"
                        @click="writeSeparationPersonalStoryReceipts"
                      >
                        <ClipboardList :size="12" />
                        写回剧情
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canResolveSeparationChildArrangement || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-child-arrangement"
                        @click="resolveSeparationChildArrangement"
                      >
                        <HeartHandshake :size="12" />
                        安排孩子
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact justify-center"
                        type="button"
                        :disabled="!canWriteSeparationPersonalFamilyReceipts || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-personal-family-receipts"
                        @click="writeSeparationPersonalFamilyReceipts"
                      >
                        <HeartHandshake :size="12" />
                        写回家庭
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="mt-3 text-xs leading-5 text-muted">
              刷新后会自动选中最近的共同庄园契约。
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <div class="flex items-center gap-2 text-accent">
              <Lock :size="13" />
              <p class="text-sm">本轮安全边界</p>
            </div>
            <div class="mt-3 grid gap-2 text-xs md:grid-cols-2">
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">个人铜币不合并，共同基金单独显示。</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">田区按来源玩家和存档 ID 显示，分居执行按预览 hash 分步写回。</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">普通仓库操作按权限开放，高价值取出和自动入仓仍保持关闭。</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">分居返还由服务端分步执行，前端只提交确认过的返还意图。</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'map'" class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Map :size="13" />
              <p class="text-sm">共同农田地图</p>
            </div>
            <span class="text-[10px] text-muted">{{ mapRevisionLabel }}</span>
          </div>
          <div v-if="!cohabitationStore.sharedMap" class="mt-3 border border-accent/10 bg-black/10 p-3 text-xs leading-5 text-muted">
            选择一份已生效契约后会显示共同农田拼接地图。
          </div>
          <template v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="stat in mapStats" :key="stat.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ stat.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ stat.value }}</p>
              </div>
            </div>
            <div class="mt-3 overflow-x-auto pb-1">
              <div class="grid min-w-max gap-1" :style="mapGridStyle">
                <div
                  v-for="plot in cohabitationStore.sharedMap.plots"
                  :key="plot.id"
                  class="flex h-9 w-9 flex-col items-center justify-center border text-[9px] leading-3"
                  :class="plotClass(plot)"
                  :title="plotTitle(plot)"
                >
                  <span>{{ plotGlyph(plot) }}</span>
                  <span class="max-w-full truncate px-0.5">{{ plot.plot_state.crop_id || plotStateLabel(plot.plot_state.state) }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员区域</p>
            <div v-if="mapRegions.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有可展示的成员区域。</div>
            <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              <div v-for="region in mapRegions" :key="region.region_index" class="border border-accent/10 bg-black/10 p-2">
                <p class="truncate text-xs text-text">{{ region.member_display_name || region.member_username }}</p>
                <p class="mt-1 text-[10px] text-muted">
                  第 {{ region.region_index + 1 }} 区 · {{ region.field_plot_count }} 块 · {{ region.permission_mode }}
                </p>
                <p class="mt-1 text-[10px] text-muted">来源：{{ region.origin_owner_id }}</p>
              </div>
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓写操作</p>
            <div class="mt-3 flex flex-wrap gap-1">
              <span
                v-for="entry in cohabitationStore.sharedMap?.summary.deferred_writes ?? []"
                :key="entry"
                class="border border-accent/15 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(entry) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'warehouse'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Package :size="13" />
              <p class="text-sm">共同仓库</p>
            </div>
            <span class="text-[10px] text-muted">{{ cohabitationStore.warehouse?.summary.total_quantity ?? 0 }} 件</span>
          </div>
          <div v-if="warehouseItems.length === 0" class="mt-3 text-xs leading-5 text-muted">共同仓库当前没有可展示物品。</div>
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="item in warehouseItems" :key="`${item.item_id}-${item.quality}`" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ item.label || item.item_id }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ item.item_id }} · {{ item.quality || 'normal' }}</p>
                </div>
                <span class="text-xs text-accent">x{{ item.quantity }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-[10px] text-muted">卖价 {{ warehouseSellUnitPrice(item.item_id) || '未配置' }} 文</span>
                <div class="flex shrink-0 gap-2">
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canWithdrawWarehouseItem(item) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-withdraw-${item.item_id}`"
                    @click="withdrawWarehouseItem(item)"
                  >
                    取出 1 个
                  </button>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canSellWarehouseItem(item) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-sell-${item.item_id}`"
                    @click="sellWarehouseItem(item)"
                  >
                    卖出 1 个
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="warehouseActionMessage" class="mt-2 text-[10px] leading-4" :class="warehouseActionOk ? 'text-emerald-200' : 'text-red-100'">
            {{ warehouseActionMessage }}
          </p>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">仓库策略</p>
            <div class="mt-3 grid gap-2 text-xs">
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">放入：{{ cohabitationStore.warehouse?.summary.deposit_enabled ? '已按权限开放' : '当前不可放入' }}</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">取出：{{ cohabitationStore.warehouse?.summary.withdraw_enabled ? '开放' : '暂缓' }}</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">卖出：{{ cohabitationStore.warehouse?.summary.sell_enabled ? '开放' : '暂缓' }}</p>
            </div>
            <div class="mt-3 border border-accent/10 bg-black/10 p-2">
              <p class="text-xs text-accent">放入普通物品</p>
              <div class="mt-2 grid gap-2">
                <select
                  v-model="warehouseDepositItemId"
                  class="online-select text-xs"
                  data-testid="online-cohabitation-warehouse-deposit-item"
                >
                  <option v-for="option in warehouseDepositOptions" :key="option.itemId" :value="option.itemId">
                    {{ option.label }}
                  </option>
                </select>
                <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    v-model.number="warehouseDepositQuantity"
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    class="online-input text-xs"
                    data-testid="online-cohabitation-warehouse-deposit-quantity"
                  >
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="!canDepositWarehouseItem || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-warehouse-deposit-submit"
                    @click="depositWarehouseItem"
                  >
                    放入仓库
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">最近流水</p>
            <div v-if="warehouseLedger.length === 0" class="mt-3 text-xs leading-5 text-muted">还没有共同仓库流水。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in warehouseLedger" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs text-text">{{ entry.actor_display_name || entry.actor_username }} · {{ entry.action }}</p>
                <p class="mt-1 text-[10px] text-muted">{{ entry.item_id }} x{{ entry.quantity }} · {{ formatTime(entry.created_at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'fund'" class="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center gap-2 text-accent">
            <Wallet :size="13" />
            <p class="text-sm">共同基金</p>
          </div>
          <p class="mt-3 text-3xl font-semibold text-accent">{{ cohabitationStore.fund?.balance ?? 0 }}</p>
          <p class="mt-2 text-xs leading-5 text-muted">个人铜币不会在这里合并；余额只来自共同基金流水。</p>
          <div class="mt-3 grid gap-2 text-xs">
            <p class="border border-accent/10 bg-black/10 p-2 text-muted">注资：{{ cohabitationStore.fund?.summary.contribution_enabled ? '已开放' : '未开放' }}</p>
            <p class="border border-accent/10 bg-black/10 p-2 text-muted">消费：{{ cohabitationStore.fund?.summary.spend_enabled ? '已开放' : '暂缓' }}</p>
            <p class="border border-accent/10 bg-black/10 p-2 text-muted">中额支出：{{ cohabitationStore.fund?.summary.medium_spend_enabled ? '已开放' : '需权限' }}</p>
            <p class="border border-accent/10 bg-black/10 p-2 text-muted">大额草案：{{ cohabitationStore.fund?.summary.large_spend_draft_enabled ? '已开放' : '需权限' }}</p>
          </div>
          <div class="mt-3 border border-accent/10 bg-black/10 p-2">
            <p class="text-xs text-accent">个人注资</p>
            <div class="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                v-model.number="fundContributionAmount"
                type="number"
                min="1"
                step="1"
                class="online-input text-xs"
                data-testid="online-cohabitation-fund-contribution-input"
              >
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="!canUseFundContribution || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-fund-contribution-submit"
                @click="contributeToSharedFund"
              >
                注入共同基金
              </button>
            </div>
          </div>
          <div class="mt-3 border border-accent/10 bg-black/10 p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">自动购买</p>
              <span class="text-[10px] text-muted">白名单</span>
            </div>
            <div class="mt-2 grid gap-2">
              <button
                v-for="option in fundPurchaseOptions"
                :key="option.targetRef"
                type="button"
                class="online-action-btn online-action-btn--compact justify-between"
                :disabled="!canUseFundPurchase(option) || cohabitationStore.actionLoading"
                :data-testid="`online-cohabitation-fund-buy-${option.itemId}`"
                @click="buyWithSharedFund(option)"
              >
                <span>{{ option.label }}</span>
                <span>{{ option.amount }} 文</span>
              </button>
            </div>
          </div>
          <div class="mt-3 border border-accent/10 bg-black/10 p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">中额预算</p>
              <span class="text-[10px] text-muted">{{ cohabitationStore.fund?.permissions.can_spend_medium ? '已授权' : '需授权' }}</span>
            </div>
            <div class="mt-2 grid gap-2">
              <button
                v-for="option in fundMediumSpendOptions"
                :key="option.purpose"
                type="button"
                class="online-action-btn online-action-btn--compact justify-between"
                :disabled="!canUseMediumFundSpend(option) || cohabitationStore.actionLoading"
                :data-testid="`online-cohabitation-fund-medium-${option.purpose}`"
                @click="spendMediumSharedFund(option)"
              >
                <span>{{ option.label }}</span>
                <span>{{ option.amount }} 文</span>
              </button>
            </div>
          </div>
          <div class="mt-3 border border-accent/10 bg-black/10 p-2" data-testid="online-cohabitation-fund-large-draft-form">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">大额草案</p>
              <span class="text-[10px] text-muted">{{ cohabitationStore.fund?.summary.large_spend_requires_both ? '双方确认' : '安全阀关闭' }}</span>
            </div>
            <div class="mt-2 grid gap-2">
              <select
                v-model="fundLargeDraftPurpose"
                class="online-select text-xs"
                data-testid="online-cohabitation-fund-large-draft-purpose"
              >
                <option
                  v-for="option in fundLargeSpendOptions"
                  :key="option.purpose"
                  :value="option.purpose"
                >
                  {{ option.label }}
                </option>
              </select>
              <input
                v-model.number="fundLargeDraftAmount"
                type="number"
                :min="fundLargeDraftMinAmount"
                step="1"
                class="online-input text-xs"
                data-testid="online-cohabitation-fund-large-draft-amount"
                placeholder="金额"
              >
              <input
                v-model="fundLargeDraftTargetRef"
                class="online-input text-xs"
                data-testid="online-cohabitation-fund-large-draft-target"
                maxlength="80"
                placeholder="building:family_hall"
              >
              <input
                v-model="fundLargeDraftMemo"
                class="online-input text-xs"
                data-testid="online-cohabitation-fund-large-draft-memo"
                maxlength="80"
                placeholder="备注（可选）"
              >
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="!canCreateLargeFundDraft || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-fund-large-draft-submit"
                @click="createLargeFundSpendDraft"
              >
                <ClipboardList :size="12" />
                创建确认草案
              </button>
            </div>
            <p class="mt-2 text-[10px] leading-4 text-muted">执行会扣共同基金并写建筑流水；真实落账和材料消耗在建筑页继续提交。</p>
          </div>
          <p v-if="fundActionMessage" class="mt-3 text-[10px] leading-4" :class="fundActionOk ? 'text-emerald-200' : 'text-red-100'">
            {{ fundActionMessage }}
          </p>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3" data-testid="online-cohabitation-fund-large-drafts">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">大额草案</p>
              <span class="text-[10px] text-muted">{{ fundLargeSpendDrafts.length }} 份</span>
            </div>
            <div v-if="fundLargeSpendDrafts.length === 0" class="mt-3 text-xs leading-5 text-muted">还没有大额确认草案。</div>
            <div v-else class="mt-3 max-h-[20rem] space-y-2 overflow-y-auto pr-1">
              <div
                v-for="draft in fundLargeSpendDrafts"
                :key="draft.id"
                class="border border-accent/10 bg-black/10 p-2"
                :data-testid="`online-cohabitation-fund-large-draft-${draft.id}`"
              >
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ draft.purpose_label || largeFundSpendPurposeLabel(draft.purpose) }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ draft.target_ref }} · {{ formatTime(draft.created_at) }}</p>
                  </div>
                  <span class="w-fit shrink-0 border px-2 py-0.5 text-[10px]" :class="largeFundDraftStateClass(draft.state)">
                    {{ largeFundDraftStateLabel(draft.state) }}
                  </span>
                </div>
                <div class="mt-2 grid gap-2 text-[10px] md:grid-cols-4">
                  <p class="border border-accent/10 bg-bg/30 p-2 text-muted">金额 {{ draft.amount }}</p>
                  <p class="border border-accent/10 bg-bg/30 p-2 text-muted">余额 {{ draft.current_balance_snapshot || draft.balance_snapshot }}</p>
                  <p class="border border-accent/10 bg-bg/30 p-2 text-muted">已确认 {{ draft.confirmed_member_usernames.length }}/{{ draft.required_member_usernames.length }}</p>
                  <p class="border border-accent/10 bg-bg/30 p-2 text-muted">到期 {{ formatTime(draft.expires_at) }}</p>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="username in draft.pending_member_usernames"
                    :key="`${draft.id}-${username}`"
                    class="border border-amber-300/20 px-2 py-1 text-[10px] text-amber-100"
                  >
                    待 {{ largeFundDraftMemberLabel(username) }}
                  </span>
                  <span
                    v-for="username in draft.confirmed_member_usernames"
                    :key="`${draft.id}-${username}-confirmed`"
                    class="border border-emerald-300/20 px-2 py-1 text-[10px] text-emerald-100"
                  >
                    已 {{ largeFundDraftMemberLabel(username) }}
                  </span>
                </div>
                <p v-if="draft.final_spend_ledger_id" class="mt-2 text-[10px] leading-4 text-muted">基金流水：{{ draft.final_spend_ledger_id }}</p>
                <div class="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="!canConfirmLargeFundDraft(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-fund-large-draft-confirm-${draft.id}`"
                    @click="confirmLargeFundSpendDraft(draft)"
                  >
                    <CheckCircle2 :size="12" />
                    确认
                  </button>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="!canExecuteLargeFundDraft(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-fund-large-draft-execute-${draft.id}`"
                    @click="executeLargeFundSpendDraft(draft)"
                  >
                    <Wallet :size="12" />
                    执行扣款
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">基金流水</p>
            <span class="text-[10px] text-muted">{{ fundLedger.length }} 条</span>
          </div>
          <div v-if="fundLedger.length === 0" class="mt-3 text-xs leading-5 text-muted">还没有共同基金流水。</div>
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="entry in fundLedger" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ entry.actor_display_name || entry.actor_username }} · {{ entry.action }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ fundLedgerPurposeLabel(entry) }} · {{ formatTime(entry.created_at) }}</p>
                </div>
                <span class="text-xs text-accent">{{ entry.amount }}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'permissions'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <ShieldCheck :size="13" />
              <p class="text-sm">成员权限</p>
            </div>
            <span class="text-[10px] text-muted">{{ cohabitationStore.permissionsPanel?.editable_by_actor ? '可管理' : '只读' }}</span>
          </div>
          <div v-if="permissionMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有权限面板数据。</div>
          <div v-else class="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="member in permissionMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-3">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ member.role }} · {{ member.manor_role || '无家族职位' }}</p>
                </div>
                <span class="w-fit shrink-0 text-[10px] text-accent">{{ enabledPermissionCount(member.permissions) }} 项已开</span>
              </div>
              <div class="mt-3 grid gap-2 md:grid-cols-2">
                <div v-for="group in permissionGroups(member.permissions)" :key="`${member.username}-${group.id}`" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-muted">{{ permissionGroupLabel(group.id) }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-accent">{{ group.enabled }}/{{ group.total }}</p>
                </div>
              </div>
              <div v-if="canManagePermissionPanel" class="mt-3 grid gap-2">
                <button
                  v-for="option in permissionToggleOptions"
                  :key="`${member.username}-${option.group}-${option.key}`"
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-between"
                  :disabled="cohabitationStore.actionLoading"
                  :data-testid="`online-cohabitation-permission-${member.username}-${option.group}-${option.key}`"
                  @click="toggleMemberPermission(member, option)"
                >
                  <span>{{ option.label }}</span>
                  <span>{{ member.permissions?.[option.group]?.[option.key] ? '开启' : '关闭' }}</span>
                </button>
              </div>
            </div>
          </div>
          <p v-if="permissionActionMessage" class="mt-2 text-[10px] leading-4" :class="permissionActionOk ? 'text-emerald-200' : 'text-red-100'">
            {{ permissionActionMessage }}
          </p>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">强制安全阀</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="entry in safetyRailEntries"
                :key="entry.key"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ safetyRailLabel(entry.key) }}</span>
                <span :class="entry.enabled ? 'text-emerald-200' : 'text-muted'">{{ entry.enabled ? '开启' : '关闭' }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">家族职位</p>
              <span class="text-[10px] text-muted">{{ cohabitationStore.rolePanel?.role_management_enabled ? (canManageRolePanel ? '可管理' : '只读') : '未启用' }}</span>
            </div>
            <div v-if="roleMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">当前契约没有家族职位面板。</div>
            <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              <div v-for="member in roleMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
                  </div>
                  <span class="shrink-0 text-[10px] text-accent">{{ member.can_manage_roles ? '家主' : '成员' }}</span>
                </div>
                <p v-if="member.permission_focus?.length" class="mt-2 text-[10px] leading-4 text-muted">
                  {{ member.permission_focus.map(familyRoleFocusLabel).join('、') }}
                </p>
                <div v-if="canManageRolePanel" class="mt-2 grid grid-cols-2 gap-2">
                  <button
                    v-for="option in roleOptions"
                    :key="`${member.username}-${option.id}`"
                    type="button"
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="cohabitationStore.actionLoading || member.manor_role === option.id"
                    :data-testid="`online-cohabitation-role-${member.username}-${option.id}`"
                    @click="changeMemberRole(member, option)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
            <p v-if="roleActionMessage" class="mt-2 text-[10px] leading-4" :class="roleActionOk ? 'text-emerald-200' : 'text-red-100'">
              {{ roleActionMessage }}
            </p>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">权限审计</p>
            <div v-if="permissionAudits.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无权限变更审计。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in permissionAudits" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs text-text">{{ entry.actor_display_name || entry.actor_username }}</p>
                <p class="mt-1 text-[10px] text-muted">{{ entry.action }} · {{ formatTime(entry.at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'orders'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <ClipboardList :size="13" />
              <p class="text-sm">家族订单预备路线</p>
            </div>
            <span class="text-[10px] text-muted">{{ familyOrdersPanel?.family_orders_enabled ? '已启用预览' : '未启用' }}</span>
          </div>
          <div v-if="!familyOrdersPanel" class="mt-3 text-xs leading-5 text-muted">当前没有家族订单预备面板数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="item in familyOrderSummaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <p v-if="familyOrdersPanel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
              {{ familyOrdersPanel.summary.disabled_reason }}
            </p>
            <p class="mt-3 text-[10px] leading-4 text-muted">{{ familyOrdersPanel.visual_state_preview.recent_feedback }}</p>
            <div class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="stage in familyOrderStages" :key="stage.id" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ stage.sequence }}. {{ stage.title }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ stage.description }}</p>
                  </div>
                  <span class="shrink-0 border border-accent/10 px-2 py-0.5 text-[10px] text-muted">{{ familyOrderStageStateLabel(stage.state) }}</span>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-muted">
                  推荐职位：{{ stage.preferred_roles.map(familyRoleLabel).join('、') || '不限' }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员订单权限</p>
            <div v-if="familyOrderMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无成员订单权限预览。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="member in familyOrderMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
                  </div>
                  <span class="shrink-0 text-[10px] text-accent">{{ enabledOrderPermissionCount(member.order_permissions) }} 项预览</span>
                </div>
                <p v-if="member.permission_focus?.length" class="mt-2 text-[10px] leading-4 text-muted">
                  {{ member.permission_focus.map(familyRoleFocusLabel).join('、') }}
                </p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">结算边界</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in familyOrderSettlementCards"
                :key="item.label"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="text-accent">{{ item.value }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓写操作</p>
            <div v-if="familyOrderDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in familyOrderDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'reputation'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Trophy :size="13" />
              <p class="text-sm">家族声望预览</p>
            </div>
            <span class="text-[10px] text-muted">{{ familyReputationPanel?.reputation_enabled ? '已启用预览' : '未启用' }}</span>
          </div>
          <div v-if="!familyReputationPanel" class="mt-3 text-xs leading-5 text-muted">当前没有家族声望预备面板数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="item in familyReputationSummaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <p v-if="familyReputationPanel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
              {{ familyReputationPanel.summary.disabled_reason }}
            </p>
            <div class="mt-3 border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="text-text">{{ familyReputationPanel.summary.level.label }}</span>
                <span class="text-muted">{{ familyReputationProgressPercent }}%</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden bg-bg/60">
                <div class="h-full bg-accent/70" :style="{ width: `${familyReputationProgressPercent}%` }"></div>
              </div>
            </div>
            <div class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="source in familyReputationSources" :key="source.id" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ source.label }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ source.evidence_count }} 条证据 · {{ source.audit_required ? '需审计' : '无审计要求' }}</p>
                  </div>
                  <span class="shrink-0 text-xs text-accent">{{ source.preview_points }} 分</span>
                </div>
                <p v-if="source.deferred_operation" class="mt-2 text-[10px] leading-4 text-muted">
                  暂缓：{{ deferredOperationLabel(source.deferred_operation) }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员贡献预览</p>
            <div v-if="familyReputationMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无成员贡献预览。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="member in familyReputationMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
                  </div>
                  <span class="shrink-0 text-xs text-accent">{{ member.preview_points }} 分</span>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-muted">
                  仓库 {{ member.warehouse_deposit_count }} 次 / 基金 {{ member.fund_contribution_count }} 次 / 治理 {{ member.governance_action_count }} 次
                </p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">治理边界</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in familyReputationGovernanceCards"
                :key="item.label"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="text-accent">{{ item.value }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓能力</p>
            <div v-if="familyReputationDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in familyReputationDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'buildings'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Building2 :size="13" />
              <p class="text-sm">家族建筑蓝图</p>
            </div>
            <span class="text-[10px] text-muted">{{ familyBuildingsPanel?.family_buildings_enabled ? '已启用预览' : '未启用' }}</span>
          </div>
          <div v-if="!familyBuildingsPanel" class="mt-3 text-xs leading-5 text-muted">当前没有家族建筑预备面板数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="item in familyBuildingSummaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <p v-if="familyBuildingsPanel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
              {{ familyBuildingsPanel.summary.disabled_reason }}
            </p>
            <p class="mt-3 text-[10px] leading-4 text-muted">{{ familyBuildingsPanel.visual_state_preview.recent_feedback }}</p>
            <p
              v-if="familyBuildingActionMessage"
              class="mt-3 text-[10px] leading-4"
              :class="familyBuildingActionOk ? 'text-emerald-200' : 'text-red-100'"
            >
              {{ familyBuildingActionMessage }}
            </p>
            <div class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="building in familyBuildingCandidates" :key="building.id" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ building.label }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ building.summary }}</p>
                  </div>
                  <span class="shrink-0 border border-accent/10 px-2 py-0.5 text-[10px] text-muted">{{ familyBuildingStateLabel(building.planning_state) }}</span>
                </div>
                <div class="mt-2 grid gap-2 md:grid-cols-2">
                  <div class="border border-accent/10 bg-bg/30 p-2">
                    <p class="text-[10px] text-muted">基金预览</p>
                    <p class="mt-1 text-xs text-accent">{{ building.shared_fund_cost }} / {{ building.shared_fund_balance_preview }}</p>
                  </div>
                  <div class="border border-accent/10 bg-bg/30 p-2">
                    <p class="text-[10px] text-muted">材料</p>
                    <p class="mt-1 text-xs text-accent">{{ readyMaterialCount(building.material_plan) }}/{{ building.material_plan.length }}</p>
                  </div>
                </div>
                <p v-if="building.missing_roles.length" class="mt-2 text-[10px] leading-4 text-muted">
                  缺职位：{{ building.missing_roles.map(familyRoleLabel).join('、') }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">规划场景</p>
            <div v-if="familyBuildingSceneObjects.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无建筑场景预览。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="object in familyBuildingSceneObjects" :key="String(object.id)" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ object.label || object.id }}</p>
                  <span class="shrink-0 text-[10px] text-accent">{{ familyBuildingStateLabel(String(object.state || '')) }}</span>
                </div>
                <p class="mt-1 text-[10px] text-muted">{{ object.kind || 'scene_object' }} · {{ object.x ?? 0 }}, {{ object.y ?? 0 }}</p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3" data-testid="online-cohabitation-building-ledger">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">建筑流水</p>
              <span class="text-[10px] text-muted">{{ familyBuildingLedgerEntries.length }} 条</span>
            </div>
            <div v-if="familyBuildingLedgerEntries.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无建筑流水。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in familyBuildingLedgerEntries" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ familyBuildingLedgerActionLabel(entry.action) }} · {{ entry.purpose_label || entry.purpose }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">
                      {{ entry.target_ref || entry.building_id || entry.project_id || '未绑定目标' }} · {{ entry.actor_display_name || entry.actor_username }}
                    </p>
                  </div>
                  <span class="shrink-0 text-xs text-accent">{{ entry.amount }}</span>
                </div>
                <div class="mt-2 grid gap-1 text-[10px] leading-4 text-muted">
                  <p>基金流水：{{ entry.fund_ledger_id || '无' }} · 草案：{{ entry.draft_id || '无' }}</p>
                  <p>状态：{{ familyBuildingLedgerStatusLabel(entry.status) }} · {{ formatTime(entry.at || entry.created_at) }}</p>
                  <p>
                    材料：{{ entry.shared_warehouse_materials_consumed ? '已消耗' : '未消耗' }} ·
                    真实建造：{{ entry.real_build_applied ? '已落账' : '未落账' }} ·
                    个人铜币：{{ entry.personal_money_merged ? '合并' : '独立' }}
                  </p>
                  <p v-if="entry.reverted_at || entry.status === 'reverted'">
                    回滚：{{ entry.reverted_by_display_name || entry.reverted_by_username || '已记录' }} · {{ formatTime(entry.reverted_at) }} · {{ entry.rollback_policy || entry.rollback_reason || '不自动退款或恢复建材' }}
                  </p>
                  <p v-if="entry.shared_fund_refunded || entry.fund_refund_ledger_id">
                    基金退款：{{ entry.fund_refunded_by_display_name || entry.fund_refunded_by_username || '已记录' }} · {{ formatTime(entry.fund_refunded_at) }} · {{ entry.fund_refund_ledger_id || '无 ledger' }}
                  </p>
                  <p v-if="entry.shared_warehouse_materials_restored || entry.material_restore_ledger_ids?.length">
                    建材恢复：{{ entry.materials_restored_by_display_name || entry.materials_restored_by_username || '已记录' }} · {{ formatTime(entry.materials_restored_at) }} · {{ entry.material_restore_ledger_ids?.length || 0 }} 条 ledger
                  </p>
                  <p v-if="entry.compensation_replayed_at || entry.status === 'compensated'">
                    补偿收口：{{ entry.compensation_replayed_by_display_name || entry.compensation_replayed_by_username || '已记录' }} · {{ formatTime(entry.compensation_replayed_at) }} · {{ entry.real_build_demolished ? '已拆除真实建筑' : '未拆真实建筑' }}
                  </p>
                  <p v-if="entry.real_build_demolition_requested_at || entry.real_build_demolition_review_state === 'pending_manual_review'">
                    拆除复核：{{ entry.real_build_demolition_requested_by_display_name || entry.real_build_demolition_requested_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_requested_at) }} · {{ familyBuildingDemolitionReviewLabel(entry.real_build_demolition_review_state) }}
                  </p>
                  <p v-if="entry.real_build_demolition_reviewed_at || entry.real_build_demolition_review_state === 'rejected'">
                    复核处理：{{ entry.real_build_demolition_reviewed_by_display_name || entry.real_build_demolition_reviewed_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_reviewed_at) }} · {{ familyBuildingDemolitionReviewLabel(entry.real_build_demolition_review_state) }}
                  </p>
                  <p v-if="entry.real_build_demolition_review_note">
                    复核说明：{{ entry.real_build_demolition_review_note }}
                  </p>
                  <p v-if="entry.real_build_demolition_execution_requested_at || entry.real_build_demolition_execution_state === 'pending_personal_save_write'">
                    执行请求：{{ entry.real_build_demolition_execution_requested_by_display_name || entry.real_build_demolition_execution_requested_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_execution_requested_at) }} · {{ familyBuildingDemolitionExecutionLabel(entry.real_build_demolition_execution_state) }}
                  </p>
                  <p v-if="entry.real_build_demolition_personal_save_written_at || entry.real_build_demolition_execution_state === 'executed'">
                    存档写回：{{ entry.real_build_demolition_personal_save_written_by_display_name || entry.real_build_demolition_personal_save_written_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_personal_save_written_at) }} · {{ entry.real_build_demolition_personal_save_receipts?.length || 0 }} 份回执
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_previewed_at || entry.real_build_demolition_main_state_manifest_hash">
                    主态预览：{{ entry.real_build_demolition_main_state_previewed_by_display_name || entry.real_build_demolition_main_state_previewed_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_main_state_previewed_at) }} · {{ entry.real_build_demolition_main_state_manifest?.length || 0 }} 人 · {{ entry.real_build_demolition_main_state_manifest_hash || '无 hash' }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_policy">
                    主态策略：{{ entry.real_build_demolition_main_state_policy }}
                  </p>
                </div>
                <div class="mt-2 grid gap-2 md:grid-cols-12">
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canApplyFamilyBuildingRealBuild(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-build-${entry.id}`"
                    @click="applyFamilyBuildingRealBuild(entry)"
                  >
                    <Building2 :size="12" />
                    真实落账
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canConsumeFamilyBuildingMaterials(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-materials-${entry.id}`"
                    @click="consumeFamilyBuildingMaterials(entry)"
                  >
                    <Package :size="12" />
                    消耗建材
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canRollbackFamilyBuilding(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-rollback-${entry.id}`"
                    @click="rollbackFamilyBuilding(entry)"
                  >
                    <ShieldCheck :size="12" />
                    记录回滚
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canRefundFamilyBuildingFund(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-fund-refund-${entry.id}`"
                    @click="refundFamilyBuildingFund(entry)"
                  >
                    <Wallet :size="12" />
                    退回基金
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canRestoreFamilyBuildingMaterials(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-materials-restore-${entry.id}`"
                    @click="restoreFamilyBuildingMaterials(entry)"
                  >
                    <Package :size="12" />
                    恢复建材
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canReplayFamilyBuildingCompensation(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-compensation-replay-${entry.id}`"
                    @click="replayFamilyBuildingCompensation(entry)"
                  >
                    <CheckCircle2 :size="12" />
                    收口补偿
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canRequestFamilyBuildingRealDemolitionReview(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-review-${entry.id}`"
                    @click="requestFamilyBuildingRealDemolitionReview(entry)"
                  >
                    <ShieldCheck :size="12" />
                    请求复核
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canApproveFamilyBuildingRealDemolitionReview(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-approve-${entry.id}`"
                    @click="approveFamilyBuildingRealDemolitionReview(entry)"
                  >
                    <CheckCircle2 :size="12" />
                    批准复核
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canRejectFamilyBuildingRealDemolitionReview(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-reject-${entry.id}`"
                    @click="rejectFamilyBuildingRealDemolitionReview(entry)"
                  >
                    <XCircle :size="12" />
                    驳回复核
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canRequestFamilyBuildingRealDemolitionExecution(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-execution-${entry.id}`"
                    @click="requestFamilyBuildingRealDemolitionExecution(entry)"
                  >
                    <ShieldCheck :size="12" />
                    请求执行
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canWriteFamilyBuildingRealDemolitionPersonalSave(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-write-personal-save-${entry.id}`"
                    @click="writeFamilyBuildingRealDemolitionPersonalSave(entry)"
                  >
                    <CheckCircle2 :size="12" />
                    写回存档
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canPreviewFamilyBuildingRealDemolitionMainState(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-preview-main-state-${entry.id}`"
                    @click="previewFamilyBuildingRealDemolitionMainState(entry)"
                  >
                    <ClipboardList :size="12" />
                    预览主态
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">资产边界</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in familyBuildingBoundaryCards"
                :key="item.label"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="text-accent">{{ item.value }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓写操作</p>
            <div v-if="familyBuildingDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in familyBuildingDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'relations'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Network :size="13" />
              <p class="text-sm">家族关系图</p>
            </div>
            <span class="text-[10px] text-muted">{{ familyRelationsPanel?.family_relations_enabled ? '已启用预览' : '未启用' }}</span>
          </div>
          <div v-if="!familyRelationsPanel" class="mt-3 text-xs leading-5 text-muted">当前没有家族关系图预备面板数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="item in familyRelationSummaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <p v-if="familyRelationsPanel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
              {{ familyRelationsPanel.summary.disabled_reason }}
            </p>
            <p class="mt-3 text-[10px] leading-4 text-muted">{{ familyRelationsPanel.visual_state_preview.recent_feedback }}</p>
            <div class="relative mt-3 h-72 overflow-hidden border border-accent/10 bg-black/10">
              <div
                v-for="node in familyRelationGraphNodes"
                :key="node.id"
                class="absolute min-h-10 w-24 -translate-x-1/2 -translate-y-1/2 border px-2 py-1 text-center shadow-sm"
                :class="familyRelationNodeClass(node.node_type)"
                :style="{ left: `${node.x}%`, top: `${node.y}%` }"
              >
                <p class="truncate text-[10px] text-text">{{ node.label }}</p>
                <p class="mt-0.5 truncate text-[9px] text-muted">{{ familyRelationKindLabel(node.kind) }}</p>
              </div>
            </div>
            <div class="mt-3 grid gap-2 md:grid-cols-2">
              <div v-for="link in familyRelationLinks.slice(0, 8)" :key="link.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="truncate text-xs text-text">{{ link.label || familyRelationKindLabel(link.kind) }}</p>
                <p class="mt-1 truncate text-[10px] text-muted">{{ link.from }} -> {{ link.to }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员节点</p>
            <div v-if="familyRelationMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无成员节点。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="member in familyRelationMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.relation_label }} · {{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
                  </div>
                  <span class="shrink-0 text-[10px] text-accent">{{ member.status === 'accepted' ? '已接受' : '待确认' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">隐私护栏</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in familyRelationPrivacyCards"
                :key="item.label"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="text-accent">{{ item.value }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓能力</p>
            <div v-if="familyRelationDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in familyRelationDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'visibility'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Lock :size="13" />
              <p class="text-sm">关系公开设置</p>
            </div>
            <span class="text-[10px] text-muted">{{ familyVisibilityPanel?.visibility_settings_enabled ? '契约内可见' : '未启用' }}</span>
          </div>
          <div v-if="!familyVisibilityPanel" class="mt-3 text-xs leading-5 text-muted">当前没有关系公开设置预备面板数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="item in familyVisibilitySummaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <p v-if="familyVisibilityPanel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
              {{ familyVisibilityPanel.summary.disabled_reason }}
            </p>
            <p class="mt-3 text-[10px] leading-4 text-muted">{{ familyVisibilityPanel.governance.current_policy || '当前没有公开策略说明。' }}</p>
            <div class="mt-3 grid gap-2 md:grid-cols-2">
              <div v-for="scope in familyVisibilityScopes" :key="scope.id" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ scope.label }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ scope.summary }}</p>
                  </div>
                  <span class="shrink-0 border border-accent/10 px-2 py-0.5 text-[10px]" :class="scope.enabled ? 'text-accent' : 'text-muted'">
                    {{ scope.enabled ? '可见' : '关闭' }}
                  </span>
                </div>
              </div>
            </div>
            <div class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="category in familyVisibilityDataCategories" :key="category.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ category.label }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ familyVisibilitySourceLabel(category.source) }}</p>
                  </div>
                  <span class="shrink-0 text-[10px]" :class="category.online_visible ? 'text-accent' : 'text-muted'">
                    {{ category.online_visible ? '契约可见' : '私密' }}
                  </span>
                </div>
                <p class="mt-1 text-[10px] text-muted">公开档案：{{ category.publication_allowed ? '未来可申请' : '禁止' }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员同意</p>
            <div v-if="familyVisibilityMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无成员可见性数据。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="member in familyVisibilityMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
                  </div>
                  <span class="shrink-0 text-[10px] text-accent">{{ member.visibility_permissions.consent_status === 'not_requested' ? '未请求' : member.visibility_permissions.consent_status }}</span>
                </div>
                <p class="mt-2 text-[10px] text-muted">管理预览：{{ member.visibility_permissions.can_manage_visibility_preview === true ? '可看' : '不可用' }}</p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">隐私护栏</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in familyVisibilityGuardCards"
                :key="item.label"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="text-accent">{{ item.value }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓能力</p>
            <div v-if="familyVisibilityDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in familyVisibilityDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'festivalSeats'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <CalendarDays :size="13" />
              <p class="text-sm">家族节会席位</p>
            </div>
            <span class="text-[10px] text-muted">{{ familyFestivalSeatsPanel?.festival_seats_enabled ? '已启用预览' : '未启用' }}</span>
          </div>
          <div v-if="!familyFestivalSeatsPanel" class="mt-3 text-xs leading-5 text-muted">当前没有家族节会席位预备面板数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-4">
              <div v-for="item in familyFestivalSeatSummaryCards" :key="item.label" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <p v-if="familyFestivalSeatsPanel.summary.disabled_reason" class="mt-3 text-[10px] leading-4 text-muted">
              {{ familyFestivalSeatsPanel.summary.disabled_reason }}
            </p>
            <p class="mt-3 text-[10px] leading-4 text-muted">{{ familyFestivalSeatsPanel.visual_state_preview.recent_feedback }}</p>
            <div class="relative mt-3 h-72 overflow-hidden border border-accent/10 bg-black/10">
              <div
                v-for="object in familyFestivalSeatSceneObjects"
                :key="object.id"
                class="absolute min-h-10 w-24 -translate-x-1/2 -translate-y-1/2 border px-2 py-1 text-center shadow-sm"
                :class="familyFestivalSceneObjectClass(object.kind, object.state)"
                :style="{ left: `${object.x}%`, top: `${object.y}%` }"
              >
                <p class="truncate text-[10px] text-text">{{ object.label || object.id }}</p>
                <p class="mt-0.5 truncate text-[9px] text-muted">{{ familyFestivalObjectKindLabel(object.kind) }} · {{ familyFestivalSeatStateLabel(object.state) }}</p>
              </div>
            </div>
            <div class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="template in familyFestivalSeatTemplates" :key="template.id" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ template.label }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ template.summary }}</p>
                  </div>
                  <span class="shrink-0 border border-accent/10 px-2 py-0.5 text-[10px]" :class="template.available ? 'text-accent' : 'text-muted'">
                    {{ template.available ? '可预排' : '不适配' }}
                  </span>
                </div>
                <p class="mt-2 text-[10px] text-muted">
                  {{ familyFestivalVisualTypeLabel(template.visual_type) }} · 上限 {{ template.member_limit }} 人 · 推荐 {{ template.recommended_roles.map(familyRoleLabel).join('、') || '暂无' }}
                </p>
                <p v-if="template.disabled_reason" class="mt-1 text-[10px] leading-4 text-muted">{{ template.disabled_reason }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员席位</p>
            <div v-if="familyFestivalSeatMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无成员席位。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="member in familyFestivalSeatMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.seat_label || '未分配席位' }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.display_name || member.username }} · {{ member.manor_role_label || familyRoleLabel(member.manor_role) }}</p>
                  </div>
                  <span class="shrink-0 text-[10px] text-accent">{{ familyFestivalSeatStateLabel(member.seat_state) }}</span>
                </div>
                <p v-if="member.seat_summary" class="mt-2 text-[10px] leading-4 text-muted">{{ member.seat_summary }}</p>
                <div class="mt-2 grid gap-2 text-[10px] text-muted">
                  <span>供给预览：{{ member.seat_permissions.can_prepare_supplies_preview ? '可看' : '不可用' }}</span>
                  <span>开房：{{ member.seat_permissions.can_open_festival_room ? '开放' : '暂缓' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">结算护栏</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="item in familyFestivalSeatGuardCards"
                :key="item.label"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="text-accent">{{ item.value }}</span>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓能力</p>
            <div v-if="familyFestivalSeatDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in familyFestivalSeatDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-accent">
              <Clock3 :size="13" />
              <p class="text-sm">离线经营状态</p>
            </div>
            <span class="text-[10px] text-muted">{{ cohabitationStore.offlineStatus?.summary.member_online_required ? '需全员在线' : '可独立经营' }}</span>
          </div>
          <div v-if="offlineMembers.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有离线经营状态数据。</div>
          <div v-else>
            <div class="mt-3 grid gap-2 md:grid-cols-3">
              <div
                v-for="item in offlineSummaryCards"
                :key="item.label"
                class="border border-accent/10 bg-black/10 p-2"
              >
                <p class="text-[10px] text-muted">{{ item.label }}</p>
                <p class="mt-1 text-xs text-accent">{{ item.value }}</p>
              </div>
            </div>
            <div class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="member in offlineMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-3">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ member.display_name || member.username }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ member.last_action || '暂无最近行动' }}</p>
                  </div>
                  <span class="w-fit shrink-0 border px-2 py-0.5 text-[10px]" :class="member.online_state === 'recently_active' ? 'border-emerald-400/30 text-emerald-200' : 'border-accent/10 text-muted'">
                    {{ member.online_state === 'recently_active' ? '近期活跃' : '离线或空闲' }}
                  </span>
                </div>
                <p class="mt-2 text-[10px] text-muted">离线时长：{{ formatDuration(member.offline_seconds) }}</p>
                <p class="mt-1 text-[10px] text-muted">独立经营：{{ member.can_operate_independently ? '允许' : '不可用' }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">能力边界</p>
            <div class="mt-3 space-y-2">
              <div
                v-for="entry in actorCapabilityEntries"
                :key="entry.key"
                class="flex items-center justify-between gap-2 border border-accent/10 bg-black/10 p-2 text-xs"
              >
                <span class="text-muted">{{ capabilityLabel(entry.key) }}</span>
                <CheckCircle2 v-if="entry.enabled" :size="13" class="text-emerald-200" />
                <XCircle v-else :size="13" class="text-muted" />
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">共同日志</p>
            <div v-if="sharedLog.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有共同日志。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in sharedLog" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ sharedLogActionLabel(entry.action) }}</p>
                    <p class="mt-1 text-[10px] text-muted">{{ entry.actor_display_name || entry.actor_username }} · {{ formatTime(entry.at) }}</p>
                  </div>
                  <span class="shrink-0 border border-accent/10 px-2 py-0.5 text-[10px] text-muted">{{ sharedLogKindLabel(entry.action) }}</span>
                </div>
                <p v-if="sharedLogDetail(entry)" class="mt-2 text-[10px] leading-4 text-muted">{{ sharedLogDetail(entry) }}</p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">暂缓能力</p>
            <div v-if="offlineDeferredOperations.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无暂缓项。</div>
            <div v-else class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="item in offlineDeferredOperations"
                :key="item"
                class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
              >
                {{ deferredOperationLabel(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import {
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ClipboardList,
    HeartHandshake,
    Lock,
    Map,
    Network,
    Package,
    ShieldCheck,
    Trophy,
    Wallet,
    XCircle,
  } from 'lucide-vue-next'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import { useCohabitationStore } from '@/stores/useCohabitationStore'
  import type {
    CohabitationAuditEntry,
    CohabitationContract,
    CohabitationFamilyBuildingLedgerEntry,
    CohabitationFamilyRoleOption,
    CohabitationFundLargeSpendDraft,
    CohabitationFundLedgerEntry,
    CohabitationMember,
    CohabitationSharedPlot,
    CohabitationWarehouseItem,
  } from '@/utils/cohabitationApi'

  type CohabitationTabKey = 'overview' | 'map' | 'warehouse' | 'fund' | 'permissions' | 'orders' | 'reputation' | 'buildings' | 'relations' | 'visibility' | 'festivalSeats' | 'offline'
  type CohabitationTabMeta = { key: CohabitationTabKey; label: string; summary: string }
  type FundMediumSpendPurpose = 'processing_materials' | 'building_materials'
  type FundMediumSpendOption = {
    label: string
    purpose: FundMediumSpendPurpose
    targetRef: string
    amount: number
    maxAmount: number
  }
  type FundLargeSpendPurpose = 'family_building' | 'manor_expansion'
  type FundLargeSpendOption = {
    label: string
    purpose: FundLargeSpendPurpose
    category: string
    maxAmount: number
  }

  const cohabitationStore = useCohabitationStore()
  const activeTab = ref<CohabitationTabKey>('overview')
  const lastRefreshAttemptAt = ref(0)
  const warehouseActionMessage = ref('')
  const warehouseActionOk = ref(false)
  const warehouseDepositItemId = ref('rice')
  const warehouseDepositQuantity = ref(1)
  const fundActionMessage = ref('')
  const fundActionOk = ref(false)
  const fundContributionAmount = ref(50)
  const fundLargeDraftPurpose = ref<FundLargeSpendPurpose>('family_building')
  const fundLargeDraftAmount = ref(1500)
  const fundLargeDraftTargetRef = ref('family_building:family_hall:build')
  const fundLargeDraftMemo = ref('')
  const familyBuildingActionMessage = ref('')
  const familyBuildingActionOk = ref(false)
  const permissionActionMessage = ref('')
  const permissionActionOk = ref(false)
  const roleActionMessage = ref('')
  const roleActionOk = ref(false)
  const contractActionMessage = ref('')
  const contractActionOk = ref(false)
  const contractDraftType = ref('lover_cohabitation')
  const contractDraftTitle = ref('')
  const contractDraftTargetUsernames = ref('')
  const separationActionMessage = ref('')
  const separationActionOk = ref(false)
  const separationPreviewReason = ref('')

  const tabs: CohabitationTabMeta[] = [
    { key: 'overview', label: '总览', summary: '切换已建立的共同庄园契约，查看成员、状态和资产边界。' },
    { key: 'map', label: '地图', summary: '只读展示成员农田横向拼接、来源归属和暂缓写操作。' },
    { key: 'warehouse', label: '仓库', summary: '查看共同仓库物品与来源流水，普通物品可按权限取出或卖入共同基金。' },
    { key: 'fund', label: '基金', summary: '查看共同基金余额、注资和权限支出流水，个人铜币保持独立。' },
    { key: 'permissions', label: '权限', summary: '查看成员权限分组和强制安全阀，不在这里扩大高风险操作。' },
    { key: 'orders', label: '订单', summary: '只读查看家族订单预备路线、成员阶段权限和共同资产结算边界。' },
    { key: 'reputation', label: '声望', summary: '只读查看家族声望预览分、来源证据和未来奖励治理边界。' },
    { key: 'buildings', label: '建筑', summary: '查看家族建筑蓝图、建筑流水，并按服务端规则提交真实落账、材料消耗和回滚补偿收口。' },
    { key: 'relations', label: '关系', summary: '只读查看契约成员、家族职位、共同能力节点和隐私边界。' },
    { key: 'visibility', label: '公开', summary: '只读查看关系图公开范围、可见数据类别、成员同意和隐私护栏。' },
    { key: 'festivalSeats', label: '节会', summary: '只读查看家族节会席位、候选模板、场景预排和结算护栏。' },
    { key: 'offline', label: '离线', summary: '查看成员最近活跃、共同日志和无需全员在线的能力边界。' },
  ]

  const normalizeActorKey = (value = '') => value.trim().toLocaleLowerCase('zh-CN')

  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const relationOptions = computed(() => cohabitationStore.overview?.relation_options ?? [])
  const selectedRelationOption = computed(() =>
    relationOptions.value.find(option => option.id === contractDraftType.value) ?? relationOptions.value[0] ?? null
  )
  const contractDraftTargets = computed(() => [...new Set(
    contractDraftTargetUsernames.value
      .split(/[,\s，、；;]+/)
      .map(value => value.trim())
      .filter(Boolean)
  )])
  const contractDraftMemberCount = computed(() => contractDraftTargets.value.length + 1)
  const contractDraftMemberRangeLabel = computed(() => {
    const option = selectedRelationOption.value
    if (!option) return '关系类型未载入'
    return `${option.min_members}-${option.max_members} 人`
  })
  const canCreateContractDraft = computed(() => {
    const option = selectedRelationOption.value
    if (!option || contractDraftTargets.value.length === 0) return false
    return contractDraftMemberCount.value >= option.min_members && contractDraftMemberCount.value <= option.max_members
  })
  const selectedContract = computed(() => cohabitationStore.selectedContract)
  const latestSeparationPreview = computed(() => selectedContract.value?.separation_previews?.[0] ?? null)
  const separationPreviewDeferredOperations = computed(() => latestSeparationPreview.value?.deferred_operations ?? [])
  const canCreateSeparationPreview = computed(() =>
    selectedContract.value?.status === 'active' && cohabitationStore.canOpenSelectedContract
  )
  const separationPreviewConfirmedBy = computed(() =>
    latestSeparationPreview.value?.confirmation_state?.confirmed_by ?? []
  )
  const separationPreviewPendingMembers = computed(() =>
    latestSeparationPreview.value?.confirmation_state?.pending_member_usernames
      ?? latestSeparationPreview.value?.confirmation_state?.required_member_usernames
      ?? []
  )
  const separationExecutionRequest = computed(() =>
    latestSeparationPreview.value?.confirmation_state?.execution_request ?? null
  )
  const separationPlotReturnManifestHash = computed(() => {
    const hash = latestSeparationPreview.value?.asset_return?.plot_return_manifest_hash
    return typeof hash === 'string' ? hash : ''
  })
  const separationDecorationSplitManifestHash = computed(() => {
    const hash = latestSeparationPreview.value?.asset_return?.decoration_split_manifest_hash
    return typeof hash === 'string' ? hash : ''
  })
  const separationBuildingSplitManifestHash = computed(() => {
    const hash = latestSeparationPreview.value?.asset_return?.family_building_split_manifest_hash
    return typeof hash === 'string' ? hash : ''
  })
  const canConfirmSeparationPreview = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (!['draft', 'confirmed'].includes(String(preview.state))) return false
    const currentKeys = currentActorKeys.value
    return !separationPreviewConfirmedBy.value.some(username => currentKeys.has(normalizeActorKey(username)))
  })
  const separationPreviewConfirmationLabel = computed(() => {
    const confirmed = separationPreviewConfirmedBy.value
    const pending = separationPreviewPendingMembers.value
    if (separationExecutionRequest.value?.status === 'personal_family_receipts_written') return '个人家庭 receipt 已写入成员存档，装饰 / 建筑拆分记录已完成。'
    if (separationExecutionRequest.value?.status === 'child_arrangement_resolved') return '孩子安排已记录，等待个人家庭存档 receipt。'
    if (separationExecutionRequest.value?.status === 'personal_story_receipts_written') return '个人剧情 receipt 已写入成员存档，等待孩子安排或家庭 receipt。'
    if (separationExecutionRequest.value?.status === 'family_story_resolved') return '分居剧情拆分已记录在共同契约，等待个人剧情 receipt 和孩子安排。'
    if (separationExecutionRequest.value?.status === 'decorations_buildings_split') return '装饰 / 建筑拆分已记录，等待剧情拆分。'
    if (separationExecutionRequest.value?.status === 'shared_warehouse_returned') return '共同仓库已按来源写回个人背包，等待装饰 / 建筑拆分。'
    if (separationExecutionRequest.value?.status === 'shared_fund_refunded') return '共同基金已返还个人铜币，等待共同仓库返还。'
    if (separationExecutionRequest.value?.status === 'personal_save_written') return '来源田区已写回个人农田，等待共同基金 / 仓库返还。'
    if (separationExecutionRequest.value?.status === 'asset_return_recorded') return '已记录返还执行，等待个人存档写回。'
    if (separationExecutionRequest.value?.status === 'pending_manual_execution') return '已请求执行，等待后续返还执行接口。'
    if (latestSeparationPreview.value?.confirmation_state?.all_members_confirmed) return '双方已确认，等待后续返还执行接口。'
    if (confirmed.length) return `已确认：${confirmed.join('、')}；待确认：${pending.join('、') || '无'}`
    return `待确认：${pending.join('、') || '契约成员'}`
  })
  const canRequestSeparationExecution = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status === 'pending_manual_execution') return false
    return Math.floor(Date.now() / 1000) >= Number(preview.confirm_after_at || 0)
  })
  const canExecuteSeparationAssetReturn = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'pending_manual_execution') return false
    if (!separationExecutionRequest.value?.id || !separationPlotReturnManifestHash.value) return false
    return Math.floor(Date.now() / 1000) >= Number(preview.confirm_after_at || 0)
  })
  const canWriteSeparationPersonalFarmReturns = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'asset_return_recorded') return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canRefundSeparationSharedFund = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'personal_save_written') return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canReturnSeparationSharedWarehouse = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'shared_fund_refunded') return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canSplitSeparationDecorationsBuildings = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'shared_warehouse_returned') return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    if (!separationDecorationSplitManifestHash.value || !separationBuildingSplitManifestHash.value) return false
    return true
  })
  const canResolveSeparationFamilyStory = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'decorations_buildings_split') return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canWriteSeparationPersonalStoryReceipts = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (separationExecutionRequest.value?.status !== 'family_story_resolved') return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canResolveSeparationChildArrangement = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    const request = separationExecutionRequest.value
    const requestStatus = String(request?.status || '')
    if (!['family_story_resolved', 'personal_story_receipts_written'].includes(requestStatus)) return false
    const familyStoryResolution = request?.family_story_resolution as Record<string, unknown> | undefined
    if (familyStoryResolution?.child_arrangement_required !== true) return false
    if (request?.child_arrangement_resolved === true) return false
    if (!request?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canWriteSeparationPersonalFamilyReceipts = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    const request = separationExecutionRequest.value
    if (request?.status !== 'child_arrangement_resolved') return false
    if (request?.personal_family_receipts_written === true) return false
    if (!request?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const selectedContractActorMember = computed(() => {
    const account = normalizeActorKey(cohabitationStore.currentAccount)
    if (!account || !selectedContract.value) return null
    return selectedContract.value.members.find(member =>
      normalizeActorKey(member.username_key) === account || normalizeActorKey(member.username) === account
    ) ?? null
  })
  const currentActorKeys = computed(() => new Set([
    cohabitationStore.currentAccount,
    selectedContractActorMember.value?.username,
    selectedContractActorMember.value?.username_key,
  ].filter(Boolean).map(value => normalizeActorKey(String(value)))))
  const canAcceptSelectedContract = computed(() =>
    selectedContract.value?.status === 'pending_acceptance'
    && selectedContractActorMember.value?.status !== 'accepted'
  )
  const moduleSummary = computed(() => {
    const active = cohabitationStore.summary.active
    const total = cohabitationStore.summary.total
    if (total <= 0) return '还没有共同庄园契约。'
    return `共 ${total} 份契约，${active} 份已生效，可从这里切换到共同庄园视图。`
  })
  const refreshStateLabel = computed(() => {
    if (cohabitationStore.loading || cohabitationStore.detailsLoading) return '正在同步共同庄园'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })
  const summaryStats = computed(() => [
    { label: '契约', value: cohabitationStore.summary.total },
    { label: '已生效', value: cohabitationStore.summary.active },
    { label: '待接受', value: cohabitationStore.summary.pending },
    { label: '分居预览', value: cohabitationStore.summary.separation_previews },
    { label: '共同基金', value: cohabitationStore.fund?.balance ?? selectedContract.value?.shared_fund?.balance ?? 0 },
    { label: '仓库物品', value: cohabitationStore.warehouse?.summary.item_count ?? selectedContract.value?.shared_warehouse?.items?.length ?? 0 },
  ])
  const mapStats = computed(() => [
    { label: '总地块', value: cohabitationStore.sharedMap?.summary.total_plots ?? 0 },
    { label: '可收获', value: cohabitationStore.sharedMap?.summary.harvestable_plots ?? 0 },
    { label: '需浇水', value: cohabitationStore.sharedMap?.summary.waterable_plots ?? 0 },
    { label: '来源玩家', value: cohabitationStore.sharedMap?.summary.origin_owner_count ?? 0 },
  ])
  const mapRegions = computed(() => cohabitationStore.sharedMap?.layout.regions ?? [])
  const mapGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${Math.max(1, cohabitationStore.sharedMap?.layout.columns ?? 1)}, minmax(2.25rem, 1fr))`,
  }))
  const mapRevisionLabel = computed(() => {
    if (!cohabitationStore.sharedMap) return '暂无地图'
    return `版本 ${cohabitationStore.sharedMap.revision}`
  })
  const warehouseItems = computed(() => cohabitationStore.warehouse?.items ?? [])
  const warehouseLedger = computed(() => cohabitationStore.warehouse?.ledger ?? [])
  const fundLedger = computed(() => cohabitationStore.fund?.ledger ?? [])
  const permissionMembers = computed(() => cohabitationStore.permissionsPanel?.members ?? [])
  const permissionAudits = computed(() => cohabitationStore.permissionsPanel?.recent_permission_audits ?? [])
  const roleMembers = computed(() => cohabitationStore.rolePanel?.members ?? [])
  const roleOptions = computed(() => cohabitationStore.rolePanel?.role_options ?? [])
  const familyOrdersPanel = computed(() => cohabitationStore.familyOrdersPanel)
  const familyOrderMembers = computed(() => familyOrdersPanel.value?.members ?? [])
  const familyOrderDeferredOperations = computed(() => familyOrdersPanel.value?.deferred_operations ?? [])
  const familyOrderStages = computed(() => familyOrdersPanel.value?.visual_state_preview.async_projects?.[0]?.stages ?? [])
  const familyOrderSummaryCards = computed(() => {
    const summary = familyOrdersPanel.value?.summary
    return [
      { label: '预览订单', value: summary?.preview_order_count ?? 0 },
      { label: '待结算', value: summary?.pending_settlement_count ?? 0 },
      { label: '基金候选', value: summary?.reward_to_shared_fund_candidate_count ?? 0 },
      { label: '候选金额', value: summary?.reward_to_shared_fund_preview_amount ?? 0 },
    ]
  })
  const familyOrderSettlementCards = computed(() => {
    const settlement = familyOrdersPanel.value?.settlement ?? {}
    return [
      { label: '写入共同基金', value: settlement.reward_to_shared_fund_enabled === true ? '开放' : '暂缓' },
      { label: '写入共同仓库', value: settlement.reward_to_shared_warehouse_enabled === true ? '开放' : '暂缓' },
      { label: '幂等凭证', value: settlement.idempotency_required === true ? '必须' : '未声明' },
      { label: '补偿 / 回滚', value: settlement.compensation_required === true || settlement.rollback_required === true ? '必须' : '未声明' },
    ]
  })
  const familyReputationPanel = computed(() => cohabitationStore.familyReputationPanel)
  const familyReputationMembers = computed(() => familyReputationPanel.value?.members ?? [])
  const familyReputationSources = computed(() => familyReputationPanel.value?.source_breakdown ?? [])
  const familyReputationDeferredOperations = computed(() => familyReputationPanel.value?.deferred_operations ?? [])
  const familyReputationProgressPercent = computed(() => Math.round(
    Math.max(0, Math.min(1, familyReputationPanel.value?.summary.level.progress_to_next ?? 0)) * 100
  ))
  const familyReputationSummaryCards = computed(() => {
    const summary = familyReputationPanel.value?.summary
    return [
      { label: '预览分', value: summary?.current_points ?? 0 },
      { label: '等级', value: summary?.level.label ?? '暂无' },
      { label: '来源', value: summary?.source_count ?? 0 },
      { label: '成员', value: `${summary?.member_count ?? 0}/${summary?.max_members ?? 0}` },
    ]
  })
  const familyReputationGovernanceCards = computed(() => {
    const governance = familyReputationPanel.value?.governance ?? {}
    return [
      { label: '服务端权威', value: governance.server_authoritative === true ? '必须' : '未声明' },
      { label: '未来幂等', value: governance.idempotency_required_for_future_writes === true ? '必须' : '未声明' },
      { label: '奖励补偿', value: governance.compensation_required_for_future_rewards === true ? '必须' : '未声明' },
      { label: '周封顶', value: governance.weekly_cap_required === true ? '必须' : '未声明' },
    ]
  })
  const familyBuildingsPanel = computed(() => cohabitationStore.familyBuildingsPanel)
  const familyBuildingCandidates = computed(() => familyBuildingsPanel.value?.candidate_buildings ?? [])
  const familyBuildingSceneObjects = computed(() => familyBuildingsPanel.value?.visual_state_preview.scene_objects ?? [])
  const familyBuildingDeferredOperations = computed(() => familyBuildingsPanel.value?.deferred_operations ?? [])
  const familyBuildingLedgerEntries = computed(() => familyBuildingsPanel.value?.construction_ledger ?? [])
  const familyBuildingSummaryCards = computed(() => {
    const summary = familyBuildingsPanel.value?.summary
    return [
      { label: '蓝图', value: summary?.preview_building_count ?? 0 },
      { label: '职位就绪', value: summary?.role_ready_building_count ?? 0 },
      { label: '成员', value: `${summary?.member_count ?? 0}/${summary?.max_members ?? 0}` },
      { label: '建筑流水', value: summary?.construction_ledger_enabled ? `${summary?.construction_ledger_count ?? 0} 条` : '暂缓' },
    ]
  })
  const familyBuildingBoundaryCards = computed(() => {
    const boundaries = familyBuildingsPanel.value?.asset_boundaries ?? {}
    const governance = familyBuildingsPanel.value?.governance ?? {}
    return [
      { label: '共同基金消耗', value: boundaries.shared_fund_consume_enabled === true ? '开放' : '暂缓' },
      { label: '共同仓库材料', value: boundaries.shared_warehouse_consume_enabled === true ? '开放' : '暂缓' },
      { label: '来源追踪', value: boundaries.origin_assets_required_for_return === true ? '必须' : '未声明' },
      { label: '建造回滚', value: governance.rollback_required_for_building_writes === true ? '必须' : '未声明' },
    ]
  })
  const familyRelationsPanel = computed(() => cohabitationStore.familyRelationsPanel)
  const familyRelationMembers = computed(() => familyRelationsPanel.value?.members ?? [])
  const familyRelationGraphNodes = computed(() => familyRelationsPanel.value?.graph.nodes ?? [])
  const familyRelationLinks = computed(() => familyRelationsPanel.value?.graph.links ?? [])
  const familyRelationDeferredOperations = computed(() => familyRelationsPanel.value?.deferred_operations ?? [])
  const familyRelationSummaryCards = computed(() => {
    const summary = familyRelationsPanel.value?.summary
    return [
      { label: '成员', value: `${summary?.accepted_member_count ?? 0}/${summary?.max_members ?? 0}` },
      { label: '节点', value: summary?.graph_node_count ?? 0 },
      { label: '连接', value: summary?.graph_link_count ?? 0 },
      { label: '个人关系', value: summary?.private_single_player_graph_exposed ? '公开' : '私密' },
    ]
  })
  const familyRelationPrivacyCards = computed(() => {
    const privacy = familyRelationsPanel.value?.privacy ?? {}
    const governance = familyRelationsPanel.value?.governance ?? {}
    return [
      { label: '本地 NPC', value: privacy.local_npc_nodes_exposed === true ? '公开' : '私密' },
      { label: '随机 NPC', value: privacy.random_npc_nodes_exposed === true ? '公开' : '私密' },
      { label: '孩子 / 宠物', value: privacy.children_nodes_exposed === true || privacy.pets_exposed === true ? '公开' : '私密' },
      { label: '未来公开同意', value: governance.future_publication_requires_consent === true ? '必须' : '未声明' },
    ]
  })
  const familyVisibilityPanel = computed(() => cohabitationStore.familyVisibilityPanel)
  const familyVisibilityMembers = computed(() => familyVisibilityPanel.value?.members ?? [])
  const familyVisibilityScopes = computed(() => familyVisibilityPanel.value?.visibility_scopes ?? [])
  const familyVisibilityDataCategories = computed(() => familyVisibilityPanel.value?.data_categories ?? [])
  const familyVisibilityDeferredOperations = computed(() => familyVisibilityPanel.value?.deferred_operations ?? [])
  const familyVisibilitySummaryCards = computed(() => {
    const summary = familyVisibilityPanel.value?.summary
    return [
      { label: '默认范围', value: familyVisibilityScopeLabel(summary?.default_scope || '') },
      { label: '成员', value: `${summary?.accepted_member_count ?? 0}/${summary?.max_members ?? 0}` },
      { label: '公开档案', value: summary?.public_profile_enabled ? '开放' : '关闭' },
      { label: '可见审计', value: summary?.visibility_audit_enabled ? '开放' : '暂缓' },
    ]
  })
  const familyVisibilityGuardCards = computed(() => {
    const guards = familyVisibilityPanel.value?.privacy_guards ?? {}
    const governance = familyVisibilityPanel.value?.governance ?? {}
    return [
      { label: '个人存档读取', value: guards.personal_save_read_enabled === true ? '开放' : '禁止' },
      { label: '固定 / 随机 NPC', value: guards.fixed_npcs_private === true && guards.random_npcs_private === true ? '私密' : '需检查' },
      { label: '孩子 / 宠物', value: guards.children_private === true && guards.pets_private === true ? '私密' : '需检查' },
      { label: '成员同意', value: governance.future_publication_requires_all_visible_member_consent === true ? '必须' : '未声明' },
      { label: '未来幂等', value: governance.future_writes_require_idempotency === true ? '必须' : '未声明' },
      { label: '错误公开补偿', value: governance.compensation_required_for_wrong_visibility === true ? '必须' : '未声明' },
    ]
  })
  const familyFestivalSeatsPanel = computed(() => cohabitationStore.familyFestivalSeatsPanel)
  const familyFestivalSeatMembers = computed(() => familyFestivalSeatsPanel.value?.members ?? [])
  const familyFestivalSeatTemplates = computed(() => familyFestivalSeatsPanel.value?.candidate_templates ?? [])
  const familyFestivalSeatSceneObjects = computed(() => familyFestivalSeatsPanel.value?.visual_state_preview.scene_objects ?? [])
  const familyFestivalSeatDeferredOperations = computed(() => familyFestivalSeatsPanel.value?.deferred_operations ?? [])
  const familyFestivalSeatSummaryCards = computed(() => {
    const summary = familyFestivalSeatsPanel.value?.summary
    return [
      { label: '预排席位', value: `${summary?.preview_seat_count ?? 0}/${summary?.member_count ?? 0}` },
      { label: '候选模板', value: summary?.available_template_count ?? 0 },
      { label: '节会开房', value: summary?.festival_room_create_enabled ? '开放' : '暂缓' },
      { label: '奖励结算', value: summary?.reward_enabled ? '开放' : '暂缓' },
    ]
  })
  const familyFestivalSeatGuardCards = computed(() => {
    const governance = familyFestivalSeatsPanel.value?.governance ?? {}
    const settlement = familyFestivalSeatsPanel.value?.settlement ?? {}
    return [
      { label: '服务端权威', value: governance.server_authoritative === true ? '必须' : '未声明' },
      { label: '锁席幂等', value: governance.seat_reservation_requires_idempotency === true ? '必须' : '未声明' },
      { label: '断线恢复', value: governance.disconnect_recovery_required === true ? '必须' : '未声明' },
      { label: '节会凭证', value: settlement.festival_receipt_required === true ? '必须' : '未声明' },
      { label: '共同基金奖励', value: settlement.reward_to_shared_fund_enabled === true ? '开放' : '暂缓' },
      { label: '补偿重放', value: settlement.compensation_replay_required === true ? '必须' : '未声明' },
    ]
  })
  const offlineMembers = computed(() => cohabitationStore.offlineStatus?.members ?? [])
  const sharedLog = computed(() => cohabitationStore.offlineStatus?.recent_shared_log ?? [])
  const offlineDeferredOperations = computed(() => cohabitationStore.offlineStatus?.deferred_operations ?? [])
  const safetyRailEntries = computed(() => Object.entries(cohabitationStore.permissionsPanel?.safety_rails ?? {})
    .map(([key, enabled]) => ({ key, enabled: enabled === true })))
  const actorCapabilityEntries = computed(() => Object.entries(cohabitationStore.offlineStatus?.actor_capabilities ?? {})
    .map(([key, enabled]) => ({ key, enabled: enabled === true })))
  const offlineSummaryCards = computed(() => {
    const summary = cohabitationStore.offlineStatus?.summary
    return [
      { label: '经营模式', value: summary?.independent_operations_enabled ? '成员可独立经营' : '暂不可经营' },
      { label: '离线阻塞', value: summary?.offline_member_blocks_operations ? '离线会阻塞' : '离线不阻塞' },
      { label: '自动收益', value: summary?.auto_offline_income_enabled ? '已开启' : '暂未开放' },
    ]
  })
  const canManagePermissionPanel = computed(() => cohabitationStore.permissionsPanel?.editable_by_actor === true)
  const canManageRolePanel = computed(() => cohabitationStore.rolePanel?.editable_by_actor === true)
  const permissionToggleOptions = [
    { group: 'storage', key: 'deposit', label: '仓库放入' },
    { group: 'storage', key: 'withdraw_common', label: '取普通物' },
    { group: 'storage', key: 'sell_items', label: '卖出普通物' },
    { group: 'fund', key: 'spend_small', label: '小额基金' },
    { group: 'fund', key: 'spend_medium', label: '中额基金' },
    { group: 'fund', key: 'auto_buy_seeds_feed', label: '自动买种子饲料' },
  ]
  const warehouseItemLabels: Record<string, string> = {
    rice: '稻米',
    wheat: '小麦',
    corn: '玉米',
    tea: '茶叶',
    lotus: '莲藕',
    turnip: '芜菁',
    carrot: '胡萝卜',
    radish: '萝卜',
    sweet_potato: '红薯',
    pumpkin: '南瓜',
    sesame: '芝麻',
    peach: '桃子',
    chili: '辣椒',
    wood: '木材',
    stone: '石料',
    clay: '黏土',
    coal: '煤炭',
    copper_ore: '铜矿石',
    iron_ore: '铁矿石',
  }
  const warehouseSellPriceByItemId: Record<string, number> = {
    rice: 35,
    wheat: 55,
    corn: 80,
    tea: 160,
    lotus: 130,
    turnip: 75,
    carrot: 50,
    radish: 75,
    sweet_potato: 70,
    pumpkin: 120,
    sesame: 95,
    peach: 140,
    chili: 90,
    wood: 15,
    stone: 10,
    clay: 12,
    coal: 25,
    copper_ore: 45,
    iron_ore: 70,
  }
  const warehouseDepositOptions = Object.keys(warehouseSellPriceByItemId).map(itemId => ({
    itemId,
    label: warehouseItemLabels[itemId] ? `${warehouseItemLabels[itemId]}（${itemId}）` : itemId,
  }))
  const normalizedWarehouseDepositQuantity = computed(() => Math.max(0, Math.floor(Number(warehouseDepositQuantity.value) || 0)))
  const canDepositWarehouseItem = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.warehouse?.summary.deposit_enabled === true &&
    cohabitationStore.warehouse?.permissions.can_deposit === true &&
    Boolean(warehouseDepositItemId.value) &&
    normalizedWarehouseDepositQuantity.value > 0 &&
    normalizedWarehouseDepositQuantity.value <= 99
  )
  const normalizedFundContributionAmount = computed(() => Math.max(0, Math.floor(Number(fundContributionAmount.value) || 0)))
  const canUseFundContribution = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.fund?.summary.contribution_enabled === true &&
    normalizedFundContributionAmount.value > 0
  )
  const fundPurchaseOptions = [
    {
      label: '白菜种子 x2',
      itemId: 'seed_cabbage',
      targetRef: 'shop:seed_cabbage',
      amount: 20,
      purpose: 'seed_budget',
    },
    {
      label: '萝卜种子 x2',
      itemId: 'seed_radish',
      targetRef: 'shop:seed_radish',
      amount: 30,
      purpose: 'seed_budget',
    },
    {
      label: '水稻种子 x2',
      itemId: 'seed_rice',
      targetRef: 'shop:seed_rice',
      amount: 40,
      purpose: 'seed_budget',
    },
    {
      label: '鱼饲料 x1',
      itemId: 'fish_feed',
      targetRef: 'shop:fish_feed',
      amount: 30,
      purpose: 'feed_budget',
    },
    {
      label: '精饲料 x1',
      itemId: 'premium_feed',
      targetRef: 'shop:premium_feed',
      amount: 200,
      purpose: 'feed_budget',
    },
    {
      label: '滋补饲料 x1',
      itemId: 'nourishing_feed',
      targetRef: 'shop:nourishing_feed',
      amount: 250,
      purpose: 'feed_budget',
    },
    {
      label: '活力饲料 x1',
      itemId: 'vitality_feed',
      targetRef: 'shop:vitality_feed',
      amount: 300,
      purpose: 'feed_budget',
    },
  ]
  const mediumFundSpendAmounts: Record<FundMediumSpendPurpose, number> = {
    processing_materials: 300,
    building_materials: 400,
  }
  const mediumFundSpendTargetRefs: Record<FundMediumSpendPurpose, string> = {
    processing_materials: 'ui:processing_materials',
    building_materials: 'ui:building_materials',
  }
  const isMediumFundSpendPurpose = (value: string): value is FundMediumSpendPurpose =>
    value === 'processing_materials' || value === 'building_materials'
  const fundMediumSpendOptions = computed<FundMediumSpendOption[]>(() =>
    (cohabitationStore.fund?.summary.allowed_medium_spend_purposes ?? [])
      .filter(purpose => isMediumFundSpendPurpose(purpose.id))
      .map(purpose => {
        const id = purpose.id as FundMediumSpendPurpose
        return {
          label: purpose.label,
          purpose: id,
          targetRef: mediumFundSpendTargetRefs[id],
          amount: Math.min(mediumFundSpendAmounts[id], purpose.max_amount),
          maxAmount: purpose.max_amount,
        }
      })
  )
  const isLargeFundSpendPurpose = (value: string): value is FundLargeSpendPurpose =>
    value === 'family_building' || value === 'manor_expansion'
  const fundLargeSpendOptions = computed<FundLargeSpendOption[]>(() =>
    (cohabitationStore.fund?.summary.allowed_large_spend_purposes ?? [])
      .filter(purpose => isLargeFundSpendPurpose(purpose.id))
      .map(purpose => ({
        label: purpose.label,
        purpose: purpose.id as FundLargeSpendPurpose,
        category: purpose.category,
        maxAmount: purpose.max_amount,
      }))
  )
  const selectedFundLargeSpendOption = computed(() =>
    fundLargeSpendOptions.value.find(option => option.purpose === fundLargeDraftPurpose.value) ?? fundLargeSpendOptions.value[0] ?? null
  )
  const normalizedFundLargeDraftAmount = computed(() => Math.max(0, Math.floor(Number(fundLargeDraftAmount.value) || 0)))
  const fundLargeDraftMinAmount = computed(() => (cohabitationStore.fund?.summary.medium_spend_max_amount ?? 1200) + 1)
  const fundLargeSpendDrafts = computed(() => cohabitationStore.fund?.large_spend_drafts ?? [])
  const canCreateLargeFundDraft = computed(() => {
    const option = selectedFundLargeSpendOption.value
    const amount = normalizedFundLargeDraftAmount.value
    return cohabitationStore.canOpenSelectedContract &&
      cohabitationStore.fund?.summary.large_spend_draft_enabled === true &&
      cohabitationStore.fund?.summary.large_spend_requires_both === true &&
      cohabitationStore.fund?.permissions.can_spend_large === true &&
      Boolean(option) &&
      amount >= fundLargeDraftMinAmount.value &&
      amount <= (option?.maxAmount ?? 0) &&
      (cohabitationStore.fund?.balance ?? 0) >= amount &&
      fundLargeDraftTargetRef.value.trim().length > 0
  })

  const setActiveTab = (tab: string) => {
    activeTab.value = tab as CohabitationTabKey
  }

  const syncContractDraftType = () => {
    if (relationOptions.value.length === 0) return
    if (!relationOptions.value.some(option => option.id === contractDraftType.value)) {
      contractDraftType.value = String(relationOptions.value[0]?.id || '')
    }
  }

  const refreshModule = async () => {
    await cohabitationStore.refreshAll()
    syncContractDraftType()
    lastRefreshAttemptAt.value = Date.now()
  }

  const selectContract = async (contractId: string) => {
    await cohabitationStore.selectContract(contractId)
    warehouseActionMessage.value = ''
    fundActionMessage.value = ''
    familyBuildingActionMessage.value = ''
    permissionActionMessage.value = ''
    roleActionMessage.value = ''
    contractActionMessage.value = ''
    separationActionMessage.value = ''
    if (!cohabitationStore.canOpenSelectedContract && activeTab.value !== 'overview') {
      activeTab.value = 'overview'
    }
  }

  const acceptSelectedContract = async () => {
    if (!selectedContract.value || !canAcceptSelectedContract.value) return
    contractActionMessage.value = ''
    contractActionOk.value = false
    try {
      const result = await cohabitationStore.acceptContract(selectedContract.value.id)
      contractActionOk.value = true
      contractActionMessage.value = result?.contract?.status === 'active'
        ? '已接受契约，共同庄园已生效'
        : '已接受契约，等待其他成员确认'
    } catch (error) {
      contractActionMessage.value = error instanceof Error ? error.message : '接受共同庄园契约失败'
    }
  }

  const createContractDraft = async () => {
    contractActionMessage.value = ''
    contractActionOk.value = false
    const option = selectedRelationOption.value
    const targetUsernames = contractDraftTargets.value
    if (!option || targetUsernames.length === 0) {
      contractActionMessage.value = '请选择关系类型并填写好友用户名'
      return
    }
    if (contractDraftMemberCount.value < option.min_members || contractDraftMemberCount.value > option.max_members) {
      contractActionMessage.value = `${option.label}需要 ${option.min_members}-${option.max_members} 名成员`
      return
    }
    const title = contractDraftTitle.value.trim()
    try {
      const result = await cohabitationStore.createContract({
        type: String(option.id),
        title: title || undefined,
        target_usernames: targetUsernames,
        idempotency_key: `ui-contract-create-${option.id}-${targetUsernames.join('-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      contractActionOk.value = true
      contractActionMessage.value = result?.idempotent
        ? '已找到已有契约，已切换到该契约'
        : '已发起契约，等待好友接受'
      if (!result?.idempotent) {
        contractDraftTitle.value = ''
        contractDraftTargetUsernames.value = ''
      }
    } catch (error) {
      contractActionMessage.value = error instanceof Error ? error.message : '创建共同庄园契约失败'
    }
  }

  const createSeparationPreview = async () => {
    if (!selectedContract.value || !canCreateSeparationPreview.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    const reason = separationPreviewReason.value.trim()
    try {
      const result = await cohabitationStore.createSeparationPreview({
        reason: reason || undefined,
        idempotency_key: `ui-separation-preview-${selectedContract.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent
        ? '已读回已有分居预览'
        : '已生成分居返还预览'
      separationPreviewReason.value = ''
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '生成分居预览失败'
    }
  }

  const confirmSeparationPreview = async () => {
    if (!latestSeparationPreview.value || !canConfirmSeparationPreview.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.confirmSeparationPreview(latestSeparationPreview.value.id, {
        idempotency_key: `ui-separation-preview-confirm-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent
        ? '已读回已有分居预览确认'
        : '已确认分居返还预览'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '确认分居预览失败'
    }
  }

  const requestSeparationExecution = async () => {
    if (!latestSeparationPreview.value || !canRequestSeparationExecution.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.requestSeparationExecution(latestSeparationPreview.value.id, {
        idempotency_key: `ui-separation-execution-request-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent
        ? '已读回已有分居执行请求'
        : '已请求分居执行'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '请求分居执行失败'
    }
  }

  const executeSeparationAssetReturn = async () => {
    if (!latestSeparationPreview.value || !canExecuteSeparationAssetReturn.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.executeSeparationAssetReturn(latestSeparationPreview.value.id, {
        execution_request_id: separationExecutionRequest.value?.id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        idempotency_key: `ui-separation-asset-return-record-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent
        ? '已读回已有分居返还执行记录'
        : '已记录分居返还执行'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '记录分居返还执行失败'
    }
  }

  const writeSeparationPersonalFarmReturns = async () => {
    if (!latestSeparationPreview.value || !canWriteSeparationPersonalFarmReturns.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.writeSeparationPersonalFarmReturns(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        idempotency_key: `ui-separation-personal-farm-write-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent
        ? '已读回已有来源田区写回记录'
        : '已写回分居来源田区'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '写回分居来源田区失败'
    }
  }

  const refundSeparationSharedFund = async () => {
    if (!latestSeparationPreview.value || !canRefundSeparationSharedFund.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.refundSeparationSharedFund(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        idempotency_key: `ui-separation-shared-fund-refund-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent || result?.already_refunded
        ? '已读回已有共同基金返还记录'
        : '已返还分居共同基金'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '返还分居共同基金失败'
    }
  }

  const returnSeparationSharedWarehouse = async () => {
    if (!latestSeparationPreview.value || !canReturnSeparationSharedWarehouse.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.returnSeparationSharedWarehouse(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        idempotency_key: `ui-separation-shared-warehouse-return-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const returnedQuantity = Number(result?.shared_warehouse?.returned_quantity) || 0
      separationActionMessage.value = result?.idempotent || result?.already_returned
        ? '已读回已有共同仓库返还记录'
        : returnedQuantity > 0
          ? `已返还共同仓库物品 ${returnedQuantity} 件`
          : '共同仓库返还已完成'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '返还分居共同仓库失败'
    }
  }

  const splitSeparationDecorationsBuildings = async () => {
    if (!latestSeparationPreview.value || !canSplitSeparationDecorationsBuildings.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.splitSeparationDecorationsBuildings(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        decoration_split_manifest_hash: separationDecorationSplitManifestHash.value,
        building_split_manifest_hash: separationBuildingSplitManifestHash.value,
        memo: '前端记录分居装饰 / 建筑拆分；不改个人小屋、家具、真实建筑或共同资产主状态',
        idempotency_key: `ui-separation-decoration-building-split-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const receiptCount = Array.isArray(result?.receipts) ? result.receipts.length : 0
      separationActionMessage.value = result?.idempotent || result?.already_split
        ? '已读回已有装饰 / 建筑拆分记录'
        : receiptCount > 0
          ? `已记录装饰 / 建筑拆分 ${receiptCount} 份`
          : '装饰 / 建筑拆分已记录'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '记录分居装饰 / 建筑拆分失败'
    }
  }

  const resolveSeparationFamilyStory = async () => {
    if (!latestSeparationPreview.value || !canResolveSeparationFamilyStory.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.resolveSeparationFamilyStory(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        resolution_choice: 'peaceful_separation',
        memo: '前端记录分居剧情拆分状态；个人剧情和孩子安排留后续接口',
        idempotency_key: `ui-separation-family-story-resolve-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const storyState = typeof result?.story_resolution?.story_state === 'string' ? result.story_resolution.story_state : ''
      separationActionMessage.value = result?.idempotent || result?.already_resolved
        ? '已读回已有分居剧情拆分记录'
        : storyState === 'personal_story_write_pending'
          ? '已记录分居剧情拆分，个人剧情 receipt 待后续写回'
          : '已记录分居剧情拆分'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '记录分居剧情拆分失败'
    }
  }

  const writeSeparationPersonalStoryReceipts = async () => {
    if (!latestSeparationPreview.value || !canWriteSeparationPersonalStoryReceipts.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.writeSeparationPersonalStoryReceipts(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        memo: '前端写入分居个人剧情回执；不改个人 NPC、家庭、孩子或资产状态',
        idempotency_key: `ui-separation-personal-story-receipts-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const receiptCount = Array.isArray(result?.receipts) ? result.receipts.length : 0
      separationActionMessage.value = result?.idempotent || result?.already_written
        ? '已读回已有个人剧情回执'
        : receiptCount > 0
          ? `已写入个人剧情回执 ${receiptCount} 份`
          : '个人剧情回执已写入'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '写入分居个人剧情回执失败'
    }
  }

  const resolveSeparationChildArrangement = async () => {
    if (!latestSeparationPreview.value || !canResolveSeparationChildArrangement.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.resolveSeparationChildArrangement(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        arrangement_choice: 'shared_care_pending_personal_saves',
        memo: '前端记录分居孩子安排；个人家庭和孩子存档留后续 receipt',
        idempotency_key: `ui-separation-child-arrangement-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const childArrangement = result?.child_arrangement
      const childCount = Number(childArrangement?.child_count) || 0
      separationActionMessage.value = result?.idempotent || result?.already_resolved
        ? '已读回已有孩子安排记录'
        : childCount > 0
          ? `已记录 ${childCount} 名孩子的分居安排`
          : '孩子安排已记录'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '记录分居孩子安排失败'
    }
  }

  const writeSeparationPersonalFamilyReceipts = async () => {
    if (!latestSeparationPreview.value || !canWriteSeparationPersonalFamilyReceipts.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.writeSeparationPersonalFamilyReceipts(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        memo: '前端写入分居个人家庭回执；不改个人孩子、家庭、NPC 或资产状态',
        idempotency_key: `ui-separation-personal-family-receipts-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const receiptCount = Array.isArray(result?.receipts) ? result.receipts.length : 0
      separationActionMessage.value = result?.idempotent || result?.already_written
        ? '已读回已有个人家庭回执'
        : receiptCount > 0
          ? `已写入个人家庭回执 ${receiptCount} 份`
          : '个人家庭回执已写入'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '写入分居个人家庭回执失败'
    }
  }

  const warehouseSellUnitPrice = (itemId: string) => warehouseSellPriceByItemId[itemId] ?? 0
  const fundLedgerPurposeLabel = (entry: CohabitationFundLedgerEntry) => {
    const label = entry.spend_purpose_label || entry.purpose || 'shared_fund'
    if (entry.spend_tier === 'large') return `${label} · 大额`
    return entry.spend_tier === 'medium' ? `${label} · 中额` : label
  }
  const largeFundSpendPurposeLabel = (value: string) => {
    const labels: Record<string, string> = {
      family_building: '大额家族建筑',
      manor_expansion: '大额庄园扩建',
    }
    return labels[value] || value || '大额草案'
  }
  const largeFundDraftStateLabel = (value: string) => {
    const labels: Record<string, string> = {
      pending_confirmation: '待确认',
      ready_to_execute: '可执行',
      executed: '已扣款',
      expired: '已过期',
      cancelled: '已取消',
    }
    return labels[value] || value || '未知'
  }
  const largeFundDraftStateClass = (value: string) => {
    if (value === 'ready_to_execute') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    if (value === 'pending_confirmation') return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
    if (value === 'executed') return 'border-sky-400/30 bg-sky-500/10 text-sky-200'
    return 'border-accent/10 text-muted'
  }
  const largeFundDraftMemberLabel = (username: string) => {
    const key = normalizeActorKey(username)
    const member = selectedContract.value?.members.find(entry =>
      normalizeActorKey(entry.username) === key || normalizeActorKey(entry.username_key) === key
    )
    return member?.display_name || member?.username || username
  }
  const canConfirmLargeFundDraft = (draft: CohabitationFundLargeSpendDraft) =>
    cohabitationStore.canOpenSelectedContract &&
    draft.state === 'pending_confirmation' &&
    draft.pending_member_usernames.some(username => currentActorKeys.value.has(normalizeActorKey(username)))
  const canExecuteLargeFundDraft = (draft: CohabitationFundLargeSpendDraft) =>
    cohabitationStore.canOpenSelectedContract &&
    draft.state === 'ready_to_execute' &&
    draft.confirmation_status === 'confirmed' &&
    cohabitationStore.fund?.summary.large_spend_execution_enabled === true &&
    cohabitationStore.fund?.permissions.can_spend_large === true &&
    (cohabitationStore.fund?.balance ?? 0) >= draft.amount

  const familyBuildingLedgerTargetId = (entry: CohabitationFamilyBuildingLedgerEntry) => {
    if (entry.building_id) return entry.building_id
    if (entry.project_id) return entry.project_id
    const parts = String(entry.target_ref || '').split(':').filter(Boolean)
    if ((parts[0] === 'family_building' || parts[0] === 'manor_expansion') && parts[1]) return parts[1]
    return entry.purpose || ''
  }
  const familyBuildingCandidateForLedger = (entry: CohabitationFamilyBuildingLedgerEntry) => {
    const targetId = familyBuildingLedgerTargetId(entry)
    return familyBuildingCandidates.value.find(building => building.id === targetId) ?? null
  }
  const canApplyFamilyBuildingRealBuild = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.shared_fund_deducted === true &&
    Boolean(entry.fund_ledger_id) &&
    entry.real_build_applied !== true &&
    entry.status !== 'compensated' &&
    entry.status !== 'reverted'
  const canConsumeFamilyBuildingMaterials = (entry: CohabitationFamilyBuildingLedgerEntry) => {
    const candidate = familyBuildingCandidateForLedger(entry)
    return cohabitationStore.canOpenSelectedContract &&
      entry.real_build_applied === true &&
      entry.shared_warehouse_materials_consumed !== true &&
      entry.status !== 'compensated' &&
      entry.status !== 'reverted' &&
      candidate?.material_consume_enabled === true
  }
  const canRollbackFamilyBuilding = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.shared_fund_deducted === true &&
    Boolean(entry.fund_ledger_id) &&
    entry.status !== 'compensated' &&
    entry.status !== 'reverted'
  const canRefundFamilyBuildingFund = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.status === 'reverted' &&
    entry.shared_fund_deducted === true &&
    Boolean(entry.fund_ledger_id) &&
    entry.shared_fund_refunded !== true &&
    !entry.fund_refund_ledger_id
  const canRestoreFamilyBuildingMaterials = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.status === 'reverted' &&
    entry.shared_fund_refunded === true &&
    Boolean(entry.fund_refund_ledger_id) &&
    entry.shared_warehouse_materials_consumed === true &&
    Array.isArray(entry.material_ledger_ids) &&
    entry.material_ledger_ids.length > 0 &&
    entry.shared_warehouse_materials_restored !== true &&
    (!Array.isArray(entry.material_restore_ledger_ids) || entry.material_restore_ledger_ids.length === 0)
  const canReplayFamilyBuildingCompensation = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.status === 'reverted' &&
    entry.shared_fund_refunded === true &&
    Boolean(entry.fund_refund_ledger_id) &&
    (
      entry.shared_warehouse_materials_consumed !== true ||
      (
        entry.shared_warehouse_materials_restored === true &&
        Array.isArray(entry.material_restore_ledger_ids) &&
        entry.material_restore_ledger_ids.length > 0
      )
    ) &&
    entry.compensation_required !== false &&
    !entry.compensation_replay_idempotency_key
  const canRequestFamilyBuildingRealDemolitionReview = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.status === 'compensated' &&
    entry.compensation_required === false &&
    entry.real_build_applied === true &&
    entry.real_build_demolished !== true &&
    entry.real_build_demolition_review_state !== 'pending_manual_review' &&
    !entry.real_build_demolition_request_idempotency_key
  const canRejectFamilyBuildingRealDemolitionReview = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.real_build_demolition_review_state === 'pending_manual_review' &&
    Boolean(entry.real_build_demolition_request_idempotency_key) &&
    entry.real_build_demolished !== true &&
    !entry.real_build_demolition_review_idempotency_key
  const canApproveFamilyBuildingRealDemolitionReview = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.real_build_demolition_review_state === 'pending_manual_review' &&
    Boolean(entry.real_build_demolition_request_idempotency_key) &&
    entry.real_build_demolished !== true &&
    !entry.real_build_demolition_review_idempotency_key
  const canRequestFamilyBuildingRealDemolitionExecution = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.real_build_demolition_review_state === 'approved_for_execute' &&
    Boolean(entry.real_build_demolition_review_idempotency_key) &&
    entry.real_build_applied === true &&
    Boolean(entry.real_build_ref) &&
    entry.real_build_demolished !== true &&
    entry.real_build_demolition_execution_state !== 'pending_personal_save_write' &&
    !entry.real_build_demolition_execution_request_idempotency_key
  const canWriteFamilyBuildingRealDemolitionPersonalSave = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.real_build_demolition_review_state === 'approved_for_execute' &&
    Boolean(entry.real_build_demolition_review_idempotency_key) &&
    entry.real_build_demolition_execution_state === 'pending_personal_save_write' &&
    Boolean(entry.real_build_demolition_execution_request_idempotency_key) &&
    entry.real_build_applied === true &&
    Boolean(entry.real_build_ref) &&
    entry.real_build_demolished !== true &&
    !entry.real_build_demolition_personal_save_write_idempotency_key
  const canPreviewFamilyBuildingRealDemolitionMainState = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    entry.real_build_demolition_execution_state === 'executed' &&
    entry.real_build_demolished === true &&
    Boolean(entry.real_build_demolition_personal_save_write_idempotency_key) &&
    entry.real_build_applied === true &&
    Boolean(entry.real_build_ref) &&
    !entry.real_build_demolition_main_state_preview_idempotency_key

  const depositWarehouseItem = async () => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    const quantity = normalizedWarehouseDepositQuantity.value
    const itemId = warehouseDepositItemId.value
    if (!itemId || quantity <= 0) {
      warehouseActionMessage.value = '请选择要放入的普通物品和数量'
      return
    }
    try {
      const result = await cohabitationStore.depositSharedWarehouseItem({
        item_id: itemId,
        quantity,
        quality: 'normal',
        idempotency_key: `ui-warehouse-deposit-${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      const remaining = result?.personal_inventory?.remaining_quantity
      const label = warehouseItemLabels[itemId] || itemId
      warehouseActionMessage.value = typeof remaining === 'number'
        ? `已放入 ${label} x${quantity}，个人背包剩余 ${remaining} 个`
        : `已放入 ${label} x${quantity}`
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '放入共同仓库物品失败'
    }
  }

  const canSellWarehouseItem = (item: CohabitationWarehouseItem) =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.warehouse?.summary.sell_enabled === true &&
    cohabitationStore.warehouse?.permissions.can_sell_items === true &&
    (item.quantity ?? 0) > 0 &&
    (item.quality || 'normal') === 'normal' &&
    warehouseSellUnitPrice(item.item_id) > 0

  const canWithdrawWarehouseItem = (item: CohabitationWarehouseItem) =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.warehouse?.summary.withdraw_enabled === true &&
    cohabitationStore.warehouse?.permissions.can_withdraw_common === true &&
    (item.quantity ?? 0) > 0 &&
    (item.quality || 'normal') === 'normal'

  const sellWarehouseItem = async (item: CohabitationWarehouseItem) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    try {
      const result = await cohabitationStore.sellSharedWarehouseItem({
        item_id: item.item_id,
        quantity: 1,
        quality: item.quality || 'normal',
        memo: `共同庄园前端卖出：${item.label || item.item_id}`,
        idempotency_key: `ui-warehouse-sell-${item.item_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      const amount = result?.sale?.total_amount ?? warehouseSellUnitPrice(item.item_id)
      const balance = result?.sale?.balance_after
      warehouseActionMessage.value = typeof balance === 'number'
        ? `已卖出 ${item.label || item.item_id} x1，入账 ${amount} 文，基金余额 ${balance} 文`
        : `已卖出 ${item.label || item.item_id} x1，入账 ${amount} 文`
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '卖出共同仓库物品失败'
    }
  }

  const withdrawWarehouseItem = async (item: CohabitationWarehouseItem) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    try {
      const result = await cohabitationStore.withdrawSharedWarehouseItem({
        item_id: item.item_id,
        quantity: 1,
        quality: item.quality || 'normal',
        idempotency_key: `ui-warehouse-withdraw-${item.item_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      const total = result?.personal_inventory?.total_quantity
      warehouseActionMessage.value = typeof total === 'number'
        ? `已取出 ${item.label || item.item_id} x1，个人背包现有 ${total} 个`
        : `已取出 ${item.label || item.item_id} x1`
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '取出共同仓库物品失败'
    }
  }

  const canUseFundPurchase = (option: { amount: number }) =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.fund?.summary.spend_enabled === true &&
    cohabitationStore.fund?.permissions.can_auto_buy_seeds_feed === true &&
    (cohabitationStore.fund?.balance ?? 0) >= option.amount
  const canUseMediumFundSpend = (option: FundMediumSpendOption) =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.fund?.summary.medium_spend_enabled === true &&
    cohabitationStore.fund?.permissions.can_spend_medium === true &&
    (cohabitationStore.fund?.balance ?? 0) >= option.amount

  const contributeToSharedFund = async () => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    const amount = normalizedFundContributionAmount.value
    if (amount <= 0) {
      fundActionMessage.value = '注资金额需要大于 0'
      return
    }
    try {
      const result = await cohabitationStore.contributeSharedFund({
        amount,
        purpose: 'front_fund_top_up',
        memo: '共同庄园前端个人注资',
        idempotency_key: `ui-fund-contribute-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      fundActionOk.value = true
      const remaining = result?.personal_money?.remaining_money
      fundActionMessage.value = typeof remaining === 'number'
        ? `已注资 ${amount} 文，个人剩余 ${remaining} 文`
        : `已注资 ${amount} 文`
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '共同基金注资失败'
    }
  }

  const buyWithSharedFund = async (option: typeof fundPurchaseOptions[number]) => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    try {
      const result = await cohabitationStore.spendSharedFund({
        amount: option.amount,
        purpose: option.purpose,
        target_ref: option.targetRef,
        auto_pay: true,
        memo: `共同庄园前端自动购买：${option.label}`,
        idempotency_key: `ui-fund-buy-${option.itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const quantity = result?.purchase?.quantity ?? 0
      fundActionOk.value = true
      fundActionMessage.value = quantity > 0 ? `已到账：${option.label}` : '共同基金支出已提交'
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '共同基金购买失败'
    }
  }

  const spendMediumSharedFund = async (option: FundMediumSpendOption) => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    try {
      const result = await cohabitationStore.spendSharedFund({
        amount: option.amount,
        purpose: option.purpose,
        target_ref: option.targetRef,
        auto_pay: false,
        memo: `共同庄园前端中额预算：${option.label}`,
        idempotency_key: `ui-fund-medium-${option.purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      fundActionOk.value = true
      const balance = result?.fund?.balance
      fundActionMessage.value = typeof balance === 'number'
        ? `已支出 ${option.label} ${option.amount} 文，基金余额 ${balance} 文`
        : `已支出 ${option.label} ${option.amount} 文`
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '共同基金中额支出失败'
    }
  }

  const createLargeFundSpendDraft = async () => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    const option = selectedFundLargeSpendOption.value
    const amount = normalizedFundLargeDraftAmount.value
    const targetRef = fundLargeDraftTargetRef.value.trim()
    if (!option || amount < fundLargeDraftMinAmount.value || !targetRef) {
      fundActionMessage.value = `大额草案需要用途、目标引用和至少 ${fundLargeDraftMinAmount.value} 文`
      return
    }
    try {
      const result = await cohabitationStore.createSharedFundLargeSpendDraft({
        amount,
        purpose: option.purpose,
        target_ref: targetRef,
        memo: fundLargeDraftMemo.value.trim() || undefined,
        idempotency_key: `ui-fund-large-draft-${option.purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      fundActionOk.value = true
      fundActionMessage.value = result?.idempotent
        ? '已读回已有大额确认草案'
        : `已创建 ${option.label} 草案，等待成员确认`
      if (!result?.idempotent) {
        fundLargeDraftMemo.value = ''
      }
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '创建共同基金大额草案失败'
    }
  }

  const confirmLargeFundSpendDraft = async (draft: CohabitationFundLargeSpendDraft) => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    try {
      const result = await cohabitationStore.confirmSharedFundLargeSpendDraft(draft.id, {
        memo: `前端确认共同基金大额草案：${draft.target_ref}`,
        idempotency_key: `ui-fund-large-confirm-${draft.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      fundActionOk.value = true
      fundActionMessage.value = result?.draft?.state === 'ready_to_execute'
        ? '草案已完成确认，可执行扣款'
        : '已确认共同基金大额草案'
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '确认共同基金大额草案失败'
    }
  }

  const executeLargeFundSpendDraft = async (draft: CohabitationFundLargeSpendDraft) => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    try {
      const result = await cohabitationStore.executeSharedFundLargeSpendDraft(draft.id, {
        memo: `前端执行共同基金大额草案扣款：${draft.target_ref}`,
        idempotency_key: `ui-fund-large-execute-${draft.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      fundActionOk.value = true
      const balance = result?.fund?.balance
      fundActionMessage.value = typeof balance === 'number'
        ? `已扣款 ${draft.amount} 文，基金余额 ${balance} 文`
        : '已执行共同基金大额草案扣款'
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '执行共同基金大额草案扣款失败'
    }
  }

  const applyFamilyBuildingRealBuild = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.applyFamilyBuildingRealBuild({
        building_ledger_id: entry.id,
        memo: `前端提交家族建筑真实落账：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-build-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_applied
        ? '该建筑流水已经真实落账，已刷新状态'
        : '已提交家族建筑真实落账，未重复扣共同基金'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '家族建筑真实落账失败'
    }
  }

  const consumeFamilyBuildingMaterials = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.consumeFamilyBuildingMaterials({
        building_ledger_id: entry.id,
        memo: `前端消耗家族建筑共同仓库材料：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-materials-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const consumedQuantity = result?.shared_warehouse?.consumed_quantity ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_consumed
        ? '该建筑流水已经消耗过共同仓库建材，已刷新状态'
        : `已消耗共同仓库建材 ${consumedQuantity} 份，未重复扣共同基金或个人铜币`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '消耗家族建筑共同仓库材料失败'
    }
  }

  const rollbackFamilyBuilding = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.rollbackFamilyBuilding({
        building_ledger_id: entry.id,
        memo: `前端记录家族建筑回滚：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-rollback-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_reverted
        ? '该建筑流水已经记录回滚，已刷新状态'
        : '已记录家族建筑回滚，未自动退基金或恢复建材'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '记录家族建筑回滚失败'
    }
  }

  const refundFamilyBuildingFund = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.refundFamilyBuildingFund({
        building_ledger_id: entry.id,
        memo: `前端退回家族建筑共同基金：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-fund-refund-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const refundAmount = result?.shared_fund?.refund_amount ?? entry.amount ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_refunded
        ? '该建筑流水已经退回共同基金，已刷新状态'
        : `已退回家族建筑共同基金 ${refundAmount} 文，未恢复建材或改个人资产`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '退回家族建筑共同基金失败'
    }
  }

  const restoreFamilyBuildingMaterials = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.restoreFamilyBuildingMaterials({
        building_ledger_id: entry.id,
        memo: `前端恢复家族建筑共同仓库材料：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-materials-restore-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const restoredQuantity = result?.shared_warehouse?.restored_quantity ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_restored
        ? '该建筑流水已经恢复过共同仓库建材，已刷新状态'
        : `已恢复共同仓库建材 ${restoredQuantity} 份，未写个人背包或个人铜币`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '恢复家族建筑共同仓库材料失败'
    }
  }

  const replayFamilyBuildingCompensation = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.replayFamilyBuildingCompensation({
        building_ledger_id: entry.id,
        memo: `前端收口家族建筑补偿重放：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-compensation-replay-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_compensated
        ? '该建筑流水已经完成补偿收口，已刷新状态'
        : '已收口家族建筑回滚补偿，真实建筑拆除仍需人工复核'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '收口家族建筑补偿重放失败'
    }
  }

  const requestFamilyBuildingRealDemolitionReview = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.requestFamilyBuildingRealDemolitionReview({
        building_ledger_id: entry.id,
        memo: `前端请求家族建筑真实拆除复核：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-review-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_requested
        ? '该建筑流水已经在真实拆除人工复核中，已刷新状态'
        : '已请求真实建筑拆除人工复核，当前不会删除任何建筑或资产'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '请求家族建筑真实拆除复核失败'
    }
  }

  const rejectFamilyBuildingRealDemolitionReview = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.rejectFamilyBuildingRealDemolitionReview({
        building_ledger_id: entry.id,
        memo: `前端驳回家族建筑真实拆除复核：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-reject-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_rejected
        ? '该真实拆除复核已经驳回，已刷新状态'
        : '已驳回真实拆除复核，未删除真实建筑或改共同资产'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '驳回家族建筑真实拆除复核失败'
    }
  }

  const approveFamilyBuildingRealDemolitionReview = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.approveFamilyBuildingRealDemolitionReview({
        building_ledger_id: entry.id,
        memo: `前端批准家族建筑真实拆除复核：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-approve-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_approved
        ? '该真实拆除复核已经批准待执行，已刷新状态'
        : '已批准真实拆除复核，仍未删除真实建筑或改共同资产'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '批准家族建筑真实拆除复核失败'
    }
  }

  const requestFamilyBuildingRealDemolitionExecution = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.requestFamilyBuildingRealDemolitionExecution({
        building_ledger_id: entry.id,
        memo: `前端请求家族建筑真实拆除执行：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-execution-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_execution_requested
        ? '该真实拆除执行请求已经记录，等待个人存档写回安全阀'
        : '已请求真实拆除执行，当前只进入待写回状态，不删除真实建筑或改共同资产'
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '请求家族建筑真实拆除执行失败'
    }
  }

  const writeFamilyBuildingRealDemolitionPersonalSave = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.writeFamilyBuildingRealDemolitionPersonalSave({
        building_ledger_id: entry.id,
        memo: `前端写回家族建筑真实拆除个人存档：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-write-personal-save-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const receiptCount = result?.demolition_execution?.receipt_count ?? result?.receipts?.length ?? entry.real_build_demolition_personal_save_receipts?.length ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_written
        ? `该真实拆除个人存档已经写回，已读回 ${receiptCount} 份回执`
        : `已写回真实拆除个人存档回执 ${receiptCount} 份，未改共同基金、仓库、个人铜币或背包`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '写回家族建筑真实拆除个人存档失败'
    }
  }

  const previewFamilyBuildingRealDemolitionMainState = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    try {
      const result = await cohabitationStore.previewFamilyBuildingRealDemolitionMainState({
        building_ledger_id: entry.id,
        memo: `前端预览家族建筑真实拆除个人主状态：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-preview-main-state-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const manifestCount = result?.main_state_preview?.manifest?.length
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_manifest?.length
        ?? entry.real_build_demolition_main_state_manifest?.length
        ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_previewed
        ? `该真实拆除个人主状态预览已记录，已读回 ${manifestCount} 条阻断清单`
        : `已生成个人主状态预览 ${manifestCount} 条，未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '预览家族建筑真实拆除个人主状态失败'
    }
  }

  const toggleMemberPermission = async (
    member: CohabitationMember & { permissions: Record<string, Record<string, boolean>> },
    option: typeof permissionToggleOptions[number]
  ) => {
    permissionActionMessage.value = ''
    permissionActionOk.value = false
    const current = member.permissions?.[option.group]?.[option.key] === true
    try {
      await cohabitationStore.updateMemberPermissions({
        target_username: member.username,
        permissions: {
          [option.group]: {
            [option.key]: !current,
          },
        },
        note: `前端权限面板切换：${option.label}`,
        idempotency_key: `ui-permission-${member.username}-${option.group}-${option.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      permissionActionOk.value = true
      permissionActionMessage.value = `${member.display_name || member.username} 的「${option.label}」已${current ? '关闭' : '开启'}`
    } catch (error) {
      permissionActionMessage.value = error instanceof Error ? error.message : '更新共同庄园权限失败'
    }
  }

  const changeMemberRole = async (
    member: CohabitationMember & { manor_role_label?: string },
    option: CohabitationFamilyRoleOption
  ) => {
    roleActionMessage.value = ''
    roleActionOk.value = false
    try {
      await cohabitationStore.updateMemberRole({
        target_username: member.username,
        manor_role: option.id,
        note: `前端家族职位切换：${option.label}`,
        idempotency_key: `ui-family-role-${member.username}-${option.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      roleActionOk.value = true
      roleActionMessage.value = `${member.display_name || member.username} 已调整为「${option.label}」`
    } catch (error) {
      roleActionMessage.value = error instanceof Error ? error.message : '调整家族庄园职位失败'
    }
  }

  const statusLabel = (status: string) => {
    if (status === 'active') return '已生效'
    if (status === 'pending_acceptance') return '待接受'
    if (status === 'separation_pending') return '分居处理中'
    if (status === 'closed') return '已关闭'
    if (status === 'declined') return '已拒绝'
    if (status === 'accepted') return '已接受'
    if (status === 'pending') return '待确认'
    return status || '未知'
  }

  const statusBadgeClass = (status: string) => {
    if (status === 'active') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    if (status === 'pending_acceptance' || status === 'pending') return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
    if (status === 'separation_pending') return 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200'
    return 'border-accent/10 text-muted'
  }

  const contractMembersLabel = (contract: CohabitationContract) =>
    contract.members.map(member => member.display_name || member.username).join('、') || '暂无成员'

  const plotStateLabel = (state: string) => {
    if (state === 'harvestable') return '熟'
    if (state === 'growing' || state === 'planted') return '苗'
    if (state === 'tilled') return '垦'
    if (state === 'wasteland') return '荒'
    return state || '空'
  }

  const plotGlyph = (plot: CohabitationSharedPlot) => {
    if (plot.plot_state.infested) return '虫'
    if (plot.plot_state.weedy) return '草'
    if (plot.plot_state.state === 'harvestable') return '收'
    if (plot.plot_state.state === 'growing' || plot.plot_state.state === 'planted') return plot.plot_state.watered ? '润' : '旱'
    if (plot.plot_state.state === 'tilled') return '田'
    return '土'
  }

  const plotClass = (plot: CohabitationSharedPlot) => {
    if (plot.plot_state.state === 'harvestable') return 'border-amber-300/40 bg-amber-500/15 text-amber-100'
    if (plot.plot_state.infested || plot.plot_state.weedy) return 'border-red-300/30 bg-red-500/10 text-red-100'
    if (plot.plot_state.state === 'growing' || plot.plot_state.state === 'planted') return 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
    if (plot.plot_state.state === 'tilled') return 'border-sky-300/25 bg-sky-500/10 text-sky-100'
    return 'border-accent/10 bg-black/10 text-muted'
  }

  const plotTitle = (plot: CohabitationSharedPlot) =>
    `${plot.origin_owner_display_name || plot.origin_owner_username} · ${plot.permission_mode} · ${plot.plot_state.crop_id || plot.plot_state.state}`

  const deferredOperationLabel = (value: string) => {
    const labels: Record<string, string> = {
      plant: '共同种植',
      water: '共同浇水',
      harvest: '共同收获',
      shared_warehouse_auto_deposit: '产出自动入仓',
      persistent_shared_manor_map: '持久共同地图',
      offline_auto_income: '离线自动收益',
      offline_worker_queue: '离线队列',
      simultaneous_online_bonus: '同时在线加成',
      conflict_merge_tool: '冲突合并工具',
      create_family_order: '创建家族订单',
      accept_family_order_stage: '领取订单阶段',
      submit_family_order_delivery: '提交订单交付',
      confirm_family_order_delivery: '确认订单交付',
      settle_to_shared_fund: '结算入共同基金',
      deposit_reward_to_shared_warehouse: '奖励入共同仓库',
      family_reputation: '家族声望',
      family_order_rollback: '家族订单回滚',
      family_order_compensation_replay: '订单补偿重放',
      award_family_reputation: '发放家族声望',
      family_reputation_ledger: '声望流水',
      family_order_reputation: '订单声望',
      family_building_reputation: '建筑声望',
      family_festival_seat_reputation: '节会席位声望',
      family_reputation_weekly_cap: '声望周封顶',
      family_reputation_compensation_replay: '声望补偿重放',
      family_reputation_leaderboard: '声望排行',
      family_reputation_rewards: '声望奖励',
      plan_family_building: '规划家族建筑',
      reserve_family_building_site: '预留建筑地块',
      confirm_large_fund_spend: '确认大额基金支出',
      execute_large_fund_spend: '执行大额基金扣款',
      consume_shared_building_materials: '消耗共同建材',
      spend_shared_fund_for_building: '建筑基金支出',
      building_ledger_write: '建筑流水写入',
      fund_compensation_replay: '基金补偿重放',
      write_family_building_ledger: '建筑流水',
      real_build_apply: '真实建造落账',
      demolish_family_building: '拆除家族建筑',
      real_build_demolition_manual_review: '真实拆除人工复核',
      real_build_demolition_execute: '真实拆除执行',
      real_build_demolition_personal_save_write: '真实拆除个人存档写回',
      real_build_demolition_main_state_mapping: '真实拆除个人主状态映射',
      family_building_compensation_replay: '建筑补偿重放',
      family_building_rollback: '建筑回滚',
      publish_family_relation_graph_to_profile: '公开关系图到档案',
      member_visibility_settings: '成员可见设置',
      family_relation_story_events: '家族关系事件',
      invite_random_npc_family_public_node: '随机 NPC 公开节点',
      family_relation_graph_frontend_panel: '关系图前端面板',
      relationship_visibility_audit: '关系可见性审计',
      family_relation_graph_compensation_replay: '关系图补偿重放',
      family_relation_graph_rollback: '关系图回滚',
      update_family_visibility_settings: '更新可见性设置',
      collect_family_visibility_consent: '收集成员公开同意',
      publish_contract_graph_to_profile: '契约关系图公开档案',
      bind_family_relation_graph_to_festival_room: '关系图绑定节会房间',
      visibility_audit_log: '可见性审计日志',
      visibility_rollback: '可见性回滚',
      visibility_compensation_replay: '可见性补偿重放',
      reserve_family_festival_seat: '锁定家族节会席位',
      bind_family_seat_to_festival_room: '席位绑定节会房间',
      create_festival_room_from_family_seats: '由席位创建节会房间',
      consume_shared_festival_supplies: '消耗共同节会物资',
      award_family_festival_reputation: '发放节会家族声望',
      settle_family_festival_rewards: '结算节会奖励',
      family_festival_compensation_replay: '节会补偿重放',
      family_festival_seat_rollback: '席位回滚',
      execute_asset_return: '执行资产返还',
      write_personal_save_refunds: '写回个人存档返还',
      split_decorations: '拆分装修家具',
      split_decorations_buildings: '拆分装饰建筑',
      split_family_buildings: '拆分家族建筑',
      resolve_family_story: '处理家庭剧情',
      write_personal_story_receipts: '个人剧情回执',
      resolve_child_arrangement: '孩子安排',
      freeze_high_value_disputes: '冻结高价值争议',
    }
    return labels[value] || value
  }

  const familyVisibilityScopeLabel = (value: string) => {
    const labels: Record<string, string> = {
      contract_members_only: '仅契约成员',
      contract_members: '契约成员',
      mutual_friends: '互关好友',
      society_members: '同村社成员',
      public_profile: '公开档案',
      festival_room: '节会房间',
      disabled: '未启用',
    }
    return labels[value] || value || '未知'
  }

  const familyVisibilitySourceLabel = (value: string) => {
    const labels: Record<string, string> = {
      cohabitation_contract: '来自共同庄园契约',
      derived_contract_capabilities: '来自契约共同能力',
      single_player_save: '来自个人存档',
    }
    return labels[value] || value || '未知来源'
  }

  const familyRelationNodeClass = (type: string) => {
    if (type === 'root') return 'border-accent/30 bg-accent/10 text-accent'
    if (type === 'member') return 'border-emerald-300/25 bg-emerald-500/10'
    if (type === 'role') return 'border-sky-300/25 bg-sky-500/10'
    return 'border-amber-300/25 bg-amber-500/10'
  }

  const familyRelationKindLabel = (value: string) => {
    const labels: Record<string, string> = {
      family_manor_contract: '契约',
      contract_member: '成员',
      family_role: '职位',
      family_capability: '共同能力',
      membership: '成员关系',
      role_assignment: '职位关联',
    }
    return labels[value] || value
  }

  const familyFestivalSceneObjectClass = (kind: string, state: string) => {
    if (state === 'needs_role' || state === 'locked') return 'border-amber-300/25 bg-amber-500/10'
    if (kind === 'banner') return 'border-accent/30 bg-accent/10 text-accent'
    if (kind === 'seats') return 'border-emerald-300/25 bg-emerald-500/10'
    if (kind === 'budget') return 'border-sky-300/25 bg-sky-500/10'
    return 'border-accent/10 bg-black/20'
  }

  const familyFestivalObjectKindLabel = (value: string) => {
    const labels: Record<string, string> = {
      banner: '席旗',
      supply: '供给',
      stage: '搭场',
      budget: '账房',
      seats: '成员席',
    }
    return labels[value] || value
  }

  const familyFestivalSeatStateLabel = (value: string) => {
    const labels: Record<string, string> = {
      preview_ready: '预览就绪',
      staffed: '已有人手',
      needs_role: '缺职位',
      locked: '暂锁',
      disabled: '未启用',
    }
    return labels[value] || value || '未知'
  }

  const familyFestivalVisualTypeLabel = (value: string) => {
    const labels: Record<string, string> = {
      lantern: '灯会',
      track: '赛道',
      banquet: '宴席',
      ritual: '仪式',
      stroll: '同游',
    }
    return labels[value] || value || '节会'
  }

  const familyBuildingStateLabel = (value: string) => {
    const labels: Record<string, string> = {
      ready_for_blueprint: '蓝图就绪',
      build_applied: '已落账',
      materials_consumed: '材料已消耗',
      needs_role: '缺职位',
      disabled: '未启用',
      preview_ready: '预览就绪',
      staffed: '已有人手',
      locked: '暂锁',
    }
    return labels[value] || value || '未知'
  }

  const familyBuildingLedgerActionLabel = (value: CohabitationFamilyBuildingLedgerEntry['action']) => {
    const labels: Record<string, string> = {
      fund_large_spend_executed: '大额支出执行',
      large_fund_spend_execute: '大额支出执行',
      fund_large_spend_execute: '大额支出执行',
      real_build_applied: '真实建造落账',
      manor_expansion_recorded: '扩建记录',
      compensated: '补偿记录',
      reverted: '回滚记录',
      family_building_spend: '建筑支出',
    }
    return labels[value] || value || '建筑流水'
  }

  const familyBuildingLedgerStatusLabel = (value: CohabitationFamilyBuildingLedgerEntry['status']) => {
    const labels: Record<string, string> = {
      fund_spend_recorded: '基金扣款已记录',
      build_applied: '真实建造已落账',
      compensated: '已补偿',
      reverted: '已回滚',
      applied: '已记录',
      executed: '已执行',
      pending: '待处理',
      deferred: '暂缓',
      reversed: '已回滚',
    }
    return labels[value] || value || '未知'
  }

  const readyMaterialCount = (items: Array<{ enough: boolean }>) =>
    items.filter(item => item.enough).length

  const familyOrderStageStateLabel = (value: string) => {
    const labels: Record<string, string> = {
      available: '可预览',
      locked: '暂锁',
      planning: '规划中',
      done: '已完成',
    }
    return labels[value] || value
  }

  const enabledOrderPermissionCount = (permissions: Record<string, boolean> | undefined) =>
    Object.values(permissions ?? {}).filter(Boolean).length

  const sharedLogActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      contract_created: '契约创建',
      contract_accepted: '契约接受',
      warehouse_deposit: '共同仓库放入',
      warehouse_withdraw: '共同仓库取出',
      warehouse_sell: '共同仓库卖出',
      fund_contribute: '共同基金注资',
      fund_spend: '共同基金支出',
      fund_large_spend_draft_created: '大额草案创建',
      fund_large_spend_draft_confirmed: '大额草案确认',
      fund_large_spend_draft_executed: '大额草案扣款',
      fund_large_spend_draft_expired: '大额草案过期',
      fund_order_income: '公共订单入基金',
      family_building_real_build_applied: '建筑真实落账',
      family_building_materials_consumed: '建筑材料消耗',
      family_building_rollback_recorded: '建筑回滚记录',
      family_building_fund_refunded: '建筑基金退款',
      family_building_materials_restored: '建筑材料恢复',
      family_building_compensation_replayed: '建筑补偿收口',
      family_building_real_demolition_requested: '真实拆除复核请求',
      family_building_real_demolition_approved: '真实拆除复核批准',
      family_building_real_demolition_rejected: '真实拆除复核驳回',
      family_building_real_demolition_execution_requested: '真实拆除执行请求',
      family_building_real_demolition_personal_save_written: '真实拆除存档写回',
      permissions_updated: '权限更新',
      family_role_updated: '家族职位更新',
      separation_preview_created: '分居预览创建',
      separation_preview_confirmed: '分居预览确认',
      separation_execution_requested: '分居执行请求',
      separation_asset_return_recorded: '分居返还记录',
      separation_personal_farm_written: '来源田区写回',
      separation_shared_fund_refunded: '共同基金返还',
      separation_shared_warehouse_returned: '共同仓库返还',
      separation_decorations_buildings_split: '装饰建筑拆分',
      separation_family_story_resolved: '剧情拆分记录',
      separation_personal_story_receipts_written: '剧情回执写入',
      separation_child_arrangement_resolved: '孩子安排记录',
      separation_personal_family_receipts_written: '家庭回执写入',
    }
    return labels[action] || action
  }

  const sharedLogKindLabel = (action: string) => {
    if (action.includes('warehouse')) return '仓库'
    if (action.includes('fund')) return '基金'
    if (action.includes('permission') || action.includes('role')) return '治理'
    if (action.includes('separation')) return '分居'
    if (action.includes('contract')) return '契约'
    return '日志'
  }

  const sharedLogDetail = (entry: CohabitationAuditEntry) => {
    const detail = entry.detail || {}
    const target = typeof detail.target_display_name === 'string'
      ? detail.target_display_name
      : typeof detail.target_username === 'string'
        ? detail.target_username
        : ''
    if (entry.action === 'permissions_updated') {
      const count = Number(detail.changed_field_count) || 0
      return target ? `${target} 变更 ${count} 项权限` : `变更 ${count} 项权限`
    }
    if (entry.action === 'family_role_updated') {
      const before = typeof detail.before_role_label === 'string' ? detail.before_role_label : ''
      const after = typeof detail.after_role_label === 'string' ? detail.after_role_label : ''
      return target ? `${target}：${before || '原职位'} -> ${after || '新职位'}` : `${before || '原职位'} -> ${after || '新职位'}`
    }
    if (entry.action === 'separation_preview_created') {
      const version = Number(detail.preview_version) || 1
      return `预览版本 v${version}，仅生成返还草案，未执行拆分`
    }
    if (entry.action === 'separation_preview_confirmed') {
      const pending = Array.isArray(detail.pending_member_usernames) ? detail.pending_member_usernames.length : 0
      return pending > 0 ? `已确认预览，仍有 ${pending} 人待确认` : '成员已确认预览，仍未执行返还'
    }
    if (entry.action === 'separation_execution_requested') {
      return '已进入待执行请求，仍未执行返还'
    }
    if (entry.action === 'separation_asset_return_recorded') {
      const count = Number(detail.plot_return_count) || 0
      return count > 0 ? `已记录 ${count} 块来源田区返还，等待个人存档写回` : '已记录返还执行，等待个人存档写回'
    }
    if (entry.action === 'separation_personal_farm_written') {
      const count = Number(detail.restored_plot_count) || 0
      return count > 0 ? `已写回 ${count} 块来源田区，等待基金 / 仓库返还` : '来源田区已写回个人农田'
    }
    if (entry.action === 'separation_shared_fund_refunded') {
      const amount = Number(detail.refund_total) || 0
      return amount > 0 ? `已返还共同基金 ${amount} 文，等待共同仓库返还` : '共同基金返还已记录'
    }
    if (entry.action === 'separation_shared_warehouse_returned') {
      const quantity = Number(detail.returned_quantity) || 0
      return quantity > 0 ? `已按来源返还共同仓库 ${quantity} 件，等待装饰 / 建筑拆分` : '共同仓库返还已记录，等待装饰 / 建筑拆分'
    }
    if (entry.action === 'separation_decorations_buildings_split') {
      const decorationCount = Number(detail.decoration_count) || 0
      const buildingCount = Number(detail.building_count) || 0
      if (decorationCount > 0 || buildingCount > 0) return `已记录装饰 ${decorationCount} 件、建筑 ${buildingCount} 项拆分，等待剧情拆分`
      return '装饰 / 建筑拆分已记录，等待剧情拆分'
    }
    if (entry.action === 'separation_family_story_resolved') {
      const needsPersonalStory = detail.personal_story_write_required === true
      const needsChildArrangement = detail.child_arrangement_required === true
      if (needsChildArrangement) return '已记录剧情拆分，等待孩子安排和个人剧情 receipt'
      return needsPersonalStory ? '已记录剧情拆分，等待个人剧情 receipt' : '已记录剧情拆分'
    }
    if (entry.action === 'separation_personal_story_receipts_written') {
      const count = Number(detail.receipt_count) || 0
      return count > 0 ? `已写入个人剧情回执 ${count} 份` : '已写入个人剧情回执'
    }
    if (entry.action === 'separation_child_arrangement_resolved') {
      const count = Number(detail.child_count) || 0
      return count > 0 ? `已记录 ${count} 名孩子的安排，个人家庭存档 receipt 仍暂缓` : '孩子安排已记录，个人家庭存档 receipt 仍暂缓'
    }
    if (entry.action === 'separation_personal_family_receipts_written') {
      const count = Number(detail.receipt_count) || 0
      return count > 0 ? `已写入个人家庭回执 ${count} 份` : '已写入个人家庭回执'
    }
    if (entry.action === 'family_building_rollback_recorded') {
      const targetRef = typeof detail.target_ref === 'string'
        ? detail.target_ref
        : typeof detail.building_id === 'string'
          ? detail.building_id
          : typeof detail.project_id === 'string'
            ? detail.project_id
            : ''
      return targetRef
        ? `已记录 ${targetRef} 建筑回滚，不自动退基金或恢复建材`
        : '已记录建筑回滚，不自动退基金或恢复建材'
    }
    if (entry.action === 'family_building_fund_refunded') {
      const refundAmount = Number(detail.refund_amount) || Number(detail.amount) || 0
      const balanceAfter = Number(detail.shared_fund_balance_after) || 0
      const suffix = balanceAfter > 0 ? `，基金余额 ${balanceAfter} 文` : ''
      return refundAmount > 0
        ? `已退回共同基金 ${refundAmount} 文${suffix}，不恢复建材或个人资产`
        : '已记录建筑基金退款，不恢复建材或个人资产'
    }
    if (entry.action === 'family_building_materials_restored') {
      const restoredQuantity = Number(detail.restored_quantity) || 0
      const materialCount = Array.isArray(detail.material_restorations) ? detail.material_restorations.length : Number(detail.material_count) || 0
      return restoredQuantity > 0
        ? `已恢复共同仓库建材 ${restoredQuantity} 件，涉及 ${materialCount} 类材料，不写个人背包`
        : '已记录建筑材料恢复，不写个人背包或个人铜币'
    }
    if (entry.action === 'family_building_compensation_replayed') {
      return '已收口家族建筑回滚补偿，真实建筑拆除仍需独立人工复核'
    }
    if (entry.action === 'family_building_real_demolition_requested') {
      return '已请求真实建筑拆除人工复核，执行仍关闭且不改任何个人或共同资产'
    }
    if (entry.action === 'family_building_real_demolition_approved') {
      return '已批准真实建筑拆除复核，等待独立执行安全阀，不删除真实建筑或改共同资产'
    }
    if (entry.action === 'family_building_real_demolition_rejected') {
      return '已驳回真实建筑拆除复核，不删除真实建筑或改共同资产'
    }
    if (entry.action === 'family_building_real_demolition_execution_requested') {
      return '已请求真实拆除执行，只进入个人存档待写回安全阀，不删除建筑或改共同资产'
    }
    if (entry.action === 'family_building_real_demolition_personal_save_written') {
      const count = typeof detail.receipt_count === 'number' ? detail.receipt_count : 0
      return `已写回真实拆除个人存档回执 ${count} 份，不改共同基金、仓库、个人铜币或背包`
    }
    const itemId = typeof detail.item_id === 'string' ? detail.item_id : ''
    const amount = Number(detail.amount) || Number(detail.quantity) || 0
    if (itemId && amount > 0) return `${warehouseItemLabels[itemId] || itemId} x${amount}`
    if (amount > 0) return `${amount} 文`
    return ''
  }

  const formatTime = (value: number) => {
    if (!value) return '暂无时间'
    return new Date(value * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const familyBuildingDemolitionReviewLabel = (state?: string) => {
    const labels: Record<string, string> = {
      not_requested: '未请求',
      pending_manual_review: '待人工复核',
      approved_for_execute: '已批准待执行',
      rejected: '已驳回',
      executed: '已执行',
    }
    return labels[state || 'not_requested'] || state || '未请求'
  }

  const familyBuildingDemolitionExecutionLabel = (state?: string) => {
    const labels: Record<string, string> = {
      not_requested: '未请求',
      pending_personal_save_write: '待个人存档写回',
      executed: '已执行',
      cancelled: '已取消',
    }
    return labels[state || 'not_requested'] || state || '未请求'
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '暂无记录'
    if (seconds < 60) return `${seconds} 秒`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    if (hours < 48) return `${hours} 小时`
    return `${Math.floor(hours / 24)} 天`
  }

  const enabledPermissionCount = (permissions: Record<string, Record<string, boolean>>) =>
    Object.values(permissions).reduce((sum, group) => sum + Object.values(group).filter(Boolean).length, 0)

  const permissionGroups = (permissions: Record<string, Record<string, boolean>>) =>
    Object.entries(permissions).map(([id, values]) => ({
      id,
      enabled: Object.values(values).filter(Boolean).length,
      total: Object.keys(values).length,
    }))

  const permissionGroupLabel = (value: string) => {
    const labels: Record<string, string> = {
      farm: '农田',
      animal: '动物',
      storage: '仓库',
      construction: '建设',
      fund: '资金',
      family: '家庭',
      confirmations: '确认',
    }
    return labels[value] || value
  }

  const safetyRailLabel = (value: string) => {
    const labels: Record<string, string> = {
      rare_withdraw_requires_both: '稀有取出双方确认',
      large_fund_spend_requires_both: '大额基金双方确认',
      demolish_requires_both: '拆除双方确认',
      separation_requires_preview: '分居必须先预览',
      confirmations_readonly: '安全阀只读',
    }
    return labels[value] || value
  }

  const familyRoleLabel = (value: string | undefined) => {
    const labels: Record<string, string> = {
      family_head: '家主',
      storage_keeper: '管仓',
      farm_steward: '农务',
      animal_keeper: '牧养',
      workshop_keeper: '工坊',
      treasurer: '账房',
    }
    return labels[value || ''] || value || '无家族职位'
  }

  const familyRoleFocusLabel = (value: string) => {
    const labels: Record<string, string> = {
      permissions: '权限',
      fund: '基金',
      construction: '建设',
      storage: '仓库',
      farm: '农田',
      animal: '动物',
      workshop: '工坊',
    }
    return labels[value] || value
  }

  const capabilityLabel = (value: string) => {
    const labels: Record<string, string> = {
      read_shared_map: '读取共同地图',
      read_warehouse: '读取共同仓库',
      deposit_warehouse: '放入共同仓库',
      read_fund: '读取共同基金',
      contribute_fund: '注资共同基金',
      read_permissions: '读取权限',
      manage_permissions: '管理权限',
      create_separation_preview: '创建分居预览',
    }
    return labels[value] || value
  }

  onMounted(() => {
    void refreshModule()
  })
</script>
