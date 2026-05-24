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
              <p v-if="!cohabitationStore.canOpenSelectedContract" class="text-xs leading-5 text-muted">
                这份契约尚未生效，只在列表中保留状态，不开放共同庄园地图、仓库、基金或权限面板。
              </p>
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
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">田区按来源玩家和存档 ID 显示，不写回个人农田。</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">仓库取出、卖出和自动入仓仍保持关闭。</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">分居返还只显示已有预览，不在前端执行资产返还。</p>
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
            <p class="border border-accent/10 bg-black/10 p-2 text-muted">大额确认：{{ cohabitationStore.fund?.summary.large_spend_requires_both ? '需要' : '未启用' }}</p>
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
            <p v-if="fundActionMessage" class="mt-2 text-[10px] leading-4" :class="fundActionOk ? 'text-emerald-200' : 'text-red-100'">
              {{ fundActionMessage }}
            </p>
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
                  <p class="mt-1 text-[10px] text-muted">{{ entry.purpose || 'shared_fund' }} · {{ formatTime(entry.created_at) }}</p>
                </div>
                <span class="text-xs text-accent">{{ entry.amount }}</span>
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
    CheckCircle2,
    Clock3,
    ClipboardList,
    HeartHandshake,
    Lock,
    Map,
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
    CohabitationFamilyRoleOption,
    CohabitationMember,
    CohabitationSharedPlot,
    CohabitationWarehouseItem,
  } from '@/utils/cohabitationApi'

  type CohabitationTabKey = 'overview' | 'map' | 'warehouse' | 'fund' | 'permissions' | 'orders' | 'reputation' | 'buildings' | 'offline'
  type CohabitationTabMeta = { key: CohabitationTabKey; label: string; summary: string }

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
  const permissionActionMessage = ref('')
  const permissionActionOk = ref(false)
  const roleActionMessage = ref('')
  const roleActionOk = ref(false)

  const tabs: CohabitationTabMeta[] = [
    { key: 'overview', label: '总览', summary: '切换已建立的共同庄园契约，查看成员、状态和资产边界。' },
    { key: 'map', label: '地图', summary: '只读展示成员农田横向拼接、来源归属和暂缓写操作。' },
    { key: 'warehouse', label: '仓库', summary: '查看共同仓库物品与来源流水，普通物品可按权限取出或卖入共同基金。' },
    { key: 'fund', label: '基金', summary: '查看共同基金余额和注资流水，个人铜币保持独立。' },
    { key: 'permissions', label: '权限', summary: '查看成员权限分组和强制安全阀，不在这里扩大高风险操作。' },
    { key: 'orders', label: '订单', summary: '只读查看家族订单预备路线、成员阶段权限和共同资产结算边界。' },
    { key: 'reputation', label: '声望', summary: '只读查看家族声望预览分、来源证据和未来奖励治理边界。' },
    { key: 'buildings', label: '建筑', summary: '只读查看家族建筑蓝图、材料缺口、规划场景和共同资产边界。' },
    { key: 'offline', label: '离线', summary: '查看成员最近活跃、共同日志和无需全员在线的能力边界。' },
  ]

  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const selectedContract = computed(() => cohabitationStore.selectedContract)
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
  const familyBuildingSummaryCards = computed(() => {
    const summary = familyBuildingsPanel.value?.summary
    return [
      { label: '蓝图', value: summary?.preview_building_count ?? 0 },
      { label: '职位就绪', value: summary?.role_ready_building_count ?? 0 },
      { label: '成员', value: `${summary?.member_count ?? 0}/${summary?.max_members ?? 0}` },
      { label: '真实建造', value: summary?.construction_ledger_enabled ? '开放' : '暂缓' },
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

  const setActiveTab = (tab: string) => {
    activeTab.value = tab as CohabitationTabKey
  }

  const refreshModule = async () => {
    await cohabitationStore.refreshAll()
    lastRefreshAttemptAt.value = Date.now()
  }

  const selectContract = async (contractId: string) => {
    await cohabitationStore.selectContract(contractId)
    warehouseActionMessage.value = ''
    fundActionMessage.value = ''
    permissionActionMessage.value = ''
    roleActionMessage.value = ''
    if (!cohabitationStore.canOpenSelectedContract && activeTab.value !== 'overview') {
      activeTab.value = 'overview'
    }
  }

  const warehouseSellUnitPrice = (itemId: string) => warehouseSellPriceByItemId[itemId] ?? 0

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
      consume_shared_building_materials: '消耗共同建材',
      spend_shared_fund_for_building: '建筑基金支出',
      write_family_building_ledger: '建筑流水',
      demolish_family_building: '拆除家族建筑',
      family_building_compensation_replay: '建筑补偿重放',
      family_building_rollback: '建筑回滚',
    }
    return labels[value] || value
  }

  const familyBuildingStateLabel = (value: string) => {
    const labels: Record<string, string> = {
      ready_for_blueprint: '蓝图就绪',
      needs_role: '缺职位',
      disabled: '未启用',
      preview_ready: '预览就绪',
      staffed: '已有人手',
      locked: '暂锁',
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
      fund_order_income: '公共订单入基金',
      permissions_updated: '权限更新',
      family_role_updated: '家族职位更新',
      separation_preview_created: '分居预览创建',
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
