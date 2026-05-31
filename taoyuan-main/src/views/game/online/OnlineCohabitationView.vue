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

          <div class="game-panel-muted p-3" data-testid="online-cohabitation-shared-pets-panel">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">共同宠物照料</p>
              <span class="text-[10px] text-muted">{{ cohabitationStore.sharedPets?.summary.pet_count ?? 0 }} 只 · {{ cohabitationStore.sharedPets?.summary.cared_count ?? 0 }} 已照料</span>
            </div>
            <div v-if="sharedPets.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有可照料的共同宠物。</div>
            <div v-else class="mt-3 space-y-3">
              <div class="max-h-48 space-y-2 overflow-y-auto pr-1">
                <button
                  v-for="pet in sharedPets"
                  :key="pet.id"
                  type="button"
                  class="w-full border p-2 text-left transition-colors"
                  :class="pet.id === selectedSharedPetId ? 'border-accent/50 bg-accent/10' : 'border-accent/10 bg-black/10 hover:border-accent/30'"
                  :data-testid="`online-cohabitation-shared-pet-${pet.id}`"
                  @click="selectSharedPet(pet)"
                >
                  <p class="truncate text-xs text-text">{{ pet.name || pet.type }}</p>
                  <p class="mt-1 text-[10px] text-muted">
                    {{ pet.origin_owner_display_name || pet.origin_owner_username }} · {{ pet.permission_mode }} · 照料 {{ pet.pet_state.care_count }} 次 · 心情 {{ pet.pet_state.mood }}
                  </p>
                </button>
              </div>
              <div v-if="selectedSharedPet" class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted">
                <p class="truncate text-xs text-text">{{ selectedSharedPet.name || selectedSharedPet.type }}</p>
                <p class="mt-1">来源：{{ selectedSharedPet.origin_owner_display_name || selectedSharedPet.origin_owner_username }}</p>
                <p class="mt-1">照料：{{ selectedSharedPet.current_caregiver_display_name || selectedSharedPet.current_caregiver_username || '未记录' }}</p>
                <p class="mt-1">用品：{{ selectedSharedPet.pet_state.last_care_item_label || selectedSharedPet.pet_state.last_care_item_id || '未使用' }} · 好感 {{ selectedSharedPet.pet_state.friendship }} · 心情 {{ selectedSharedPet.pet_state.mood }}</p>
                <p class="mt-1" data-testid="online-cohabitation-shared-pet-coop-bonus">
                  同时在线加成：{{ sharedPetCoopBonusLabel(selectedSharedPet) }}
                </p>
              </div>
              <label class="block text-[10px] leading-4 text-muted">
                <span>照料用品</span>
                <select
                  v-model="selectedSharedPetCareItemId"
                  class="online-select mt-1 w-full"
                  data-testid="online-cohabitation-shared-pet-care-item-select"
                >
                  <option v-for="item in sharedPetCareOptions" :key="item.itemId" :value="item.itemId">
                    {{ item.label }} · 库存 {{ item.quantity }} · 好感 +{{ item.friendshipGain }} / 心情 +{{ item.moodGain }}
                  </option>
                </select>
              </label>
              <p v-if="selectedSharedPetCareItem" class="text-[10px] leading-4 text-muted" data-testid="online-cohabitation-shared-pet-care-item-stock">
                {{ selectedSharedPetCareItem.label }} · {{ selectedSharedPetCareItem.effect }} · 共同仓库 {{ selectedSharedPetCareItem.quantity }} 个
              </p>
              <div
                v-if="selectedSharedPetCareItem?.requiresConfirmation"
                class="space-y-2 border border-amber-300/30 bg-amber-950/20 p-2 text-[10px] leading-4 text-amber-100"
                data-testid="online-cohabitation-shared-pet-care-risk-panel"
              >
                <p data-testid="online-cohabitation-shared-pet-care-risk-label">
                  {{ selectedSharedPetCareItem.label }} · {{ selectedSharedPetCareItem.riskLevel || 'high_value_pet_treat' }}
                </p>
                <p>回滚：{{ selectedSharedPetCareItem.rollbackPlan }}</p>
                <p>补偿：{{ selectedSharedPetCareItem.compensationHint }}</p>
                <label class="flex items-center gap-2">
                  <input
                    v-model="sharedPetCareRiskAcknowledged"
                    type="checkbox"
                    class="online-input h-4 w-4 min-w-4 accent-accent"
                    data-testid="online-cohabitation-shared-pet-care-risk-confirm"
                  >
                  已确认高阶用品消耗、补偿和回滚方案
                </label>
                <input
                  v-model="sharedPetCareConfirmationText"
                  class="online-input w-full"
                  :placeholder="sharedPetCareConfirmationPhrase"
                  data-testid="online-cohabitation-shared-pet-care-risk-text"
                >
              </div>
              <button
                class="online-action-btn online-action-btn--compact w-full justify-center"
                type="button"
                :disabled="!canCareSelectedSharedPet || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-shared-pet-care"
                @click="careSelectedSharedPet"
              >
                <Heart :size="12" />
                {{ selectedSharedPetCareItem?.label || '用品' }}照料
              </button>
              <p v-if="sharedPetActionMessage" class="text-[10px] leading-4" :class="sharedPetActionOk ? 'text-emerald-200' : 'text-red-100'">
                {{ sharedPetActionMessage }}
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
                  <div
                    v-if="separationSharedFundReadbackRows.length"
                    class="space-y-2 border border-sky-300/20 bg-sky-500/5 p-2 text-[10px] text-muted"
                    data-testid="online-cohabitation-separation-shared-fund-dispute-readback"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-accent">共同基金拆分 / 争议确认</p>
                      <span>
                        返还 {{ separationSharedFundReadbackSummary.refund_total }} 铜币 · 待确认 {{ separationSharedFundReadbackSummary.pending_member_usernames.length }}
                      </span>
                    </div>
                    <p class="leading-4">
                      依据：{{ separationSharedFundReadbackSummary.fund_split_basis }}；注资 {{ separationSharedFundReadbackSummary.capital_total }}，可追溯经营 {{ separationSharedFundReadbackSummary.operating_total }}，拆分基数 {{ separationSharedFundReadbackSummary.split_basis_total }}。无法识别经营贡献或消费差额先走双方确认，确认阶段只写审计，不改个人铜币或共同基金。
                    </p>
                    <p
                      v-if="separationSharedFundReadbackSummary.rows_requiring_confirmation || separationSharedFundReadbackSummary.requires_unidentified_operating_confirmation"
                      class="leading-4"
                    >
                      需要差额确认 {{ separationSharedFundReadbackSummary.rows_requiring_confirmation }} 行；未知经营贡献 {{ separationSharedFundReadbackSummary.unidentified_operating_contribution_total }} 铜币 / {{ separationSharedFundReadbackSummary.unidentified_operating_contribution_rows }} 组；已确认 {{ separationSharedFundReadbackSummary.confirmed_member_usernames.join('、') || '暂无' }}；待确认 {{ separationSharedFundReadbackSummary.pending_member_usernames.join('、') || '暂无' }}。
                    </p>
                    <p
                      v-if="separationSharedFundReadbackSummary.requires_unidentified_operating_confirmation"
                      class="break-all leading-4"
                      data-testid="online-cohabitation-separation-shared-fund-unidentified-operating"
                    >
                      未知经营贡献争议 hash：{{ separationSharedFundReadbackSummary.unidentified_operating_contribution_hash || '待锁定' }}；来源流水 {{ separationSharedFundReadbackSummary.unidentified_operating_ledger_ids.join('、') || '待补充' }}。
                    </p>
                    <div
                      v-if="separationSharedFundReadbackSummary.requires_unidentified_operating_confirmation"
                      class="grid gap-2 md:grid-cols-2"
                      data-testid="online-cohabitation-separation-shared-fund-manual-allocation"
                    >
                      <label
                        v-for="member in separationSharedFundManualAllocationMembers"
                        :key="member.username_key"
                        class="space-y-1 border border-accent/10 bg-bg/30 p-2"
                      >
                        <span class="block text-accent">{{ member.username }}</span>
                        <input
                          v-model.number="separationSharedFundManualAllocation[member.username_key]"
                          class="online-input w-full"
                          type="number"
                          min="0"
                          step="1"
                          :data-testid="`online-cohabitation-separation-shared-fund-manual-allocation-${member.username_key}`"
                        />
                      </label>
                      <p
                        class="md:col-span-2"
                        :class="separationSharedFundManualAllocationBalanced ? 'text-emerald-200' : 'text-amber-100'"
                      >
                        人工分配合计 {{ separationSharedFundManualAllocationTotal }} / {{ separationSharedFundReadbackSummary.unidentified_operating_contribution_total }} 铜币；确认后会锁定分配 hash 并重算返还权重。
                      </p>
                    </div>
                    <div class="grid gap-2 md:grid-cols-2">
                      <div
                        v-for="row in separationSharedFundReadbackRows"
                        :key="row.key"
                        class="border border-accent/10 bg-bg/30 p-2"
                      >
                        <p class="text-accent">{{ row.origin_owner_username }}</p>
                        <p class="mt-1">注资 {{ row.capital_contribution_amount }} · 经营 {{ row.operating_contribution_amount }} · 返还 {{ row.suggested_refund_amount }}</p>
                        <p class="mt-1">拆分基数 {{ row.split_basis_amount }} · 经营流水 {{ row.operating_ledger_count }} 笔 · 卖出流水 {{ row.warehouse_sale_ledger_count }} 笔</p>
                        <p class="mt-1">{{ row.requires_confirmation ? '消费差额需双方确认' : '无需额外差额确认' }} · {{ row.return_status }}</p>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="separationSharedDecorationRemovalDisputes.length"
                    class="space-y-2 border border-amber-300/20 bg-amber-500/5 p-2 text-[10px] text-muted"
                    data-testid="online-cohabitation-shared-decoration-removal-disputes"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-accent">共同装修拆除争议冻结</p>
                      <span>
                        待收口 {{ separationSharedDecorationRemovalFreezeSummary.pending_count }} 笔 · 冻结 {{ separationSharedDecorationRemovalFreezeSummary.total_amount }} 铜币
                      </span>
                    </div>
                    <p class="leading-4">
                      策略：{{ separationSharedDecorationRemovalFreezePolicy.status }}；需拆除完成或退款回执收口，不改个人小屋、家具或个人铜币。
                    </p>
                    <div class="grid gap-2 md:grid-cols-2">
                      <div
                        v-for="dispute in separationSharedDecorationRemovalDisputes"
                        :key="`${dispute.draft_id}-${dispute.target_ref}-${dispute.original_fund_ledger_id}`"
                        class="border border-accent/10 bg-bg/30 p-2"
                      >
                        <p class="text-accent">{{ dispute.target_ref || '未绑定目标' }}</p>
                        <p class="mt-1">金额：{{ dispute.amount }} · 状态：{{ dispute.status }}</p>
                        <p class="mt-1 break-all">草案：{{ dispute.draft_id || '未知' }}</p>
                        <p class="mt-1 break-all">基金流水：{{ dispute.original_fund_ledger_id || '待写入' }}</p>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="separationStoryCinematicReadbackRows.length"
                    class="space-y-2 border border-fuchsia-300/20 bg-fuchsia-500/5 p-2 text-[10px] text-muted"
                    data-testid="online-cohabitation-separation-story-cinematic-readback"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-accent">关系剧情 / 演出证据</p>
                      <span>{{ separationStoryCinematicBoundaryLabel }}</span>
                    </div>
                    <div class="grid gap-2 md:grid-cols-2">
                      <p
                        v-for="row in separationStoryCinematicReadbackRows"
                        :key="row.key"
                        class="border border-accent/10 bg-bg/30 p-2"
                        :data-testid="`online-cohabitation-separation-story-cinematic-${row.key}`"
                      >
                        <span class="block text-accent">{{ row.label }}</span>
                        <span class="mt-1 block break-all">{{ row.value }}</span>
                      </p>
                    </div>
                    <div
                      v-if="separationStoryCinematicPlaybackSteps.length"
                      class="space-y-2 border border-fuchsia-300/20 bg-bg/40 p-2"
                      data-testid="online-cohabitation-separation-story-cinematic-player"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <p class="text-accent">演出时间线</p>
                        <span>{{ separationStoryCinematicPlaybackStepLabel }}</span>
                      </div>
                      <div class="border border-accent/10 bg-fuchsia-500/10 p-2">
                        <p class="text-accent">{{ separationStoryCinematicPlaybackActiveStep.label }}</p>
                        <p class="mt-1 leading-4">{{ separationStoryCinematicPlaybackActiveStep.detail }}</p>
                      </div>
                      <div class="grid gap-1 md:grid-cols-3">
                        <span
                          v-for="(step, index) in separationStoryCinematicPlaybackSteps"
                          :key="step.key"
                          class="border px-2 py-1"
                          :class="index === separationStoryCinematicPlaybackIndex ? 'border-fuchsia-200 bg-fuchsia-500/20 text-fuchsia-100' : 'border-accent/10 text-muted'"
                        >
                          {{ step.short_label }}
                        </span>
                      </div>
                    </div>
                    <p class="leading-4">
                      只读契约记录：剧情 receipt 可写入成员存档，NPC、家庭和孩子主状态仍由后续剧情规则处理。
                    </p>
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
                        :disabled="!canConfirmSeparationSharedFundDelta || !separationSharedFundManualAllocationBalanced || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-shared-fund-delta-confirm"
                        @click="confirmSeparationSharedFundDelta"
                      >
                        <CheckCircle2 :size="12" />
                        确认争议
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
                        :disabled="!canRecordSeparationStoryCinematicPlayback || separationStoryCinematicPlaybackActive || cohabitationStore.actionLoading"
                        data-testid="online-cohabitation-separation-story-cinematic-playback"
                        @click="playSeparationStoryCinematicPlayback"
                      >
                        <Play :size="12" />
                        播放演出
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
              <p class="border border-accent/10 bg-black/10 p-2 text-muted" data-testid="online-cohabitation-authoritative-warehouse-summary">普通仓库操作按权限开放，高价值取出走草案确认；农田 / 动物 / 宠物 / 工坊和离线自动收益入仓均由服务端落账。</p>
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
            <div
              v-if="mapRegions.length > 0"
              class="mt-3 space-y-2"
              data-testid="online-cohabitation-shared-map-region-tabs"
            >
              <div class="overflow-x-auto pb-1">
                <div class="flex min-w-max gap-2">
                  <button
                    v-for="region in mapRegions"
                    :key="region.region_index"
                    type="button"
                    class="min-h-[2.75rem] border px-3 py-2 text-left text-[10px] leading-4 transition-colors"
                    :class="activeSharedMapRegion?.region_index === region.region_index ? 'border-accent/60 bg-accent/10 text-accent' : 'border-accent/10 bg-black/10 text-muted hover:border-accent/30'"
                    :data-testid="`online-cohabitation-shared-map-region-tab-${region.region_index}`"
                    @click="setActiveSharedMapRegion(region.region_index)"
                  >
                    <span class="block text-xs">第 {{ region.region_index + 1 }} 区</span>
                    <span class="block max-w-28 truncate">{{ region.member_display_name || region.member_username }}</span>
                  </button>
                </div>
              </div>
              <div
                v-if="activeSharedMapRegion"
                class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted"
                data-testid="online-cohabitation-shared-map-region-page-summary"
              >
                当前显示第 {{ activeSharedMapRegion.region_index + 1 }} 区 ·
                {{ activeSharedMapRegion.member_display_name || activeSharedMapRegion.member_username }} ·
                {{ pagedSharedFarmPlots.length }} / {{ activeSharedMapRegion.field_plot_count }} 块 ·
                {{ activeSharedMapRegion.permission_mode }}
              </div>
            </div>
            <div class="mt-3 overflow-x-auto pb-1">
              <div
                class="grid min-w-max gap-1"
                :style="stitchedMapGridStyle"
                data-testid="online-cohabitation-shared-map-page-grid"
              >
                <template v-for="cell in stitchedSharedFarmCells" :key="cell.key">
                  <button
                    v-if="cell.plot"
                    class="flex h-9 w-9 flex-col items-center justify-center border text-[9px] leading-3 transition-colors"
                    :class="[plotClass(cell.plot), selectedSharedFarmPlot?.id === cell.plot.id ? 'ring-1 ring-accent/70' : '', cell.regionIndex === activeSharedMapRegion?.region_index ? 'outline outline-1 outline-accent/40' : '']"
                    :title="plotTitle(cell.plot)"
                    type="button"
                    :data-testid="`online-cohabitation-shared-farm-plot-${cell.plot.id}`"
                    @click="selectSharedFarmPlot(cell.plot)"
                  >
                    <span>{{ plotGlyph(cell.plot) }}</span>
                    <span class="max-w-full truncate px-0.5">{{ cell.plot.plot_state.crop_id || plotStateLabel(cell.plot.plot_state.state) }}</span>
                  </button>
                  <span v-else class="h-9 w-9 border border-dashed border-accent/10 bg-black/5" aria-hidden="true" />
                </template>
              </div>
            </div>
          </template>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员区域</p>
            <div v-if="mapRegions.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有可展示的成员区域。</div>
            <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              <button
                v-for="region in mapRegions"
                :key="region.region_index"
                type="button"
                class="w-full border p-2 text-left transition-colors"
                :class="activeSharedMapRegion?.region_index === region.region_index ? 'border-accent/50 bg-accent/10' : 'border-accent/10 bg-black/10 hover:border-accent/30'"
                :data-testid="`online-cohabitation-shared-map-region-card-${region.region_index}`"
                @click="setActiveSharedMapRegion(region.region_index)"
              >
                <p class="truncate text-xs text-text">{{ region.member_display_name || region.member_username }}</p>
                <p class="mt-1 text-[10px] text-muted">
                  第 {{ region.region_index + 1 }} 区 · {{ region.field_plot_count }} 块 · {{ region.permission_mode }}
                </p>
                <p class="mt-1 text-[10px] text-muted">来源：{{ region.origin_owner_id }}</p>
              </button>
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">共同农田操作</p>
              <span class="text-[10px] text-muted">{{ selectedSharedFarmPlot ? selectedSharedFarmPlot.source_area : '未选地块' }}</span>
            </div>
            <div v-if="!selectedSharedFarmPlot" class="mt-3 text-xs leading-5 text-muted">
              点选左侧地块后，可按服务端权限执行浇水、种植或收获。
            </div>
            <div v-else class="mt-3 space-y-3">
              <div class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted">
                <p class="truncate text-xs text-text">{{ selectedSharedFarmPlot.origin_owner_display_name || selectedSharedFarmPlot.origin_owner_username }}</p>
                <p class="mt-1">地块：{{ selectedSharedFarmPlot.source_plot_id }} · {{ selectedSharedFarmPlot.permission_mode }}</p>
                <p class="mt-1">状态：{{ plotStateLabel(selectedSharedFarmPlot.plot_state.state) }} · {{ selectedSharedFarmPlot.plot_state.crop_id || '无作物' }}</p>
                <p class="mt-1">肥料：{{ selectedSharedFarmPlot.plot_state.fertilizer || '无' }}</p>
                <p class="mt-1">管护：{{ selectedSharedFarmPlot.current_steward_display_name || selectedSharedFarmPlot.current_steward_username || '未记录' }}</p>
                <p class="mt-1" data-testid="online-cohabitation-shared-farm-coop-bonus">{{ sharedFarmCoopBonusLabel(selectedSharedFarmPlot) }}</p>
              </div>
              <label class="block">
                <span class="text-[10px] text-muted">&#31181;&#23376;</span>
                <select
                  v-model="sharedFarmSeedItemId"
                  class="online-select mt-1 text-xs"
                  data-testid="online-cohabitation-shared-farm-seed"
                >
                  <option v-for="option in sharedFarmSeedOptions" :key="option.itemId" :value="option.itemId">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-[10px] text-muted">&#32933;&#26009;</span>
                <select
                  v-model="selectedSharedFarmFertilizerItemId"
                  class="online-select mt-1 text-xs"
                  data-testid="online-cohabitation-shared-farm-fertilizer"
                >
                  <option v-for="option in sharedFarmFertilizerOptions" :key="option.itemId" :value="option.itemId">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <div class="grid gap-2">
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canWaterSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-water"
                  @click="waterSelectedSharedFarmPlot"
                >
                  <Droplets :size="12" />
                  浇水
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canCureSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-cure-pests"
                  @click="cureSelectedSharedFarmPlot"
                >
                  <Bug :size="12" />
                  除虫
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canClearWeedsSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-clear-weeds"
                  @click="clearWeedsSelectedSharedFarmPlot"
                >
                  <Scissors :size="12" />
                  清草
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canRemoveCropSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-remove-crop"
                  @click="removeCropSelectedSharedFarmPlot"
                >
                  <Scissors :size="12" />
                  铲除作物
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canPlantSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-plant"
                  @click="plantSelectedSharedFarmPlot"
                >
                  <Sprout :size="12" />
                  种植
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canFertilizeSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-fertilize"
                  @click="fertilizeSelectedSharedFarmPlot"
                >
                  <Sprout :size="12" />
                  {{ selectedSharedFarmFertilizer?.label || '施肥' }}
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canHarvestSelectedSharedFarmPlot || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-farm-harvest"
                  @click="harvestSelectedSharedFarmPlot"
                >
                  <Package :size="12" />
                  收获入仓
                </button>
              </div>
              <p v-if="sharedFarmActionMessage" class="text-[10px] leading-4" :class="sharedFarmActionOk ? 'text-emerald-200' : 'text-red-100'">
                {{ sharedFarmActionMessage }}
              </p>
            </div>
          </div>

          <div class="game-panel-muted p-3" data-testid="online-cohabitation-shared-animals-panel">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">共同动物照料</p>
              <span class="text-[10px] text-muted">{{ cohabitationStore.sharedAnimals?.summary.animal_count ?? 0 }} 只 · {{ cohabitationStore.sharedAnimals?.summary.product_ready_count ?? 0 }} 待收</span>
            </div>
            <div class="mt-3 grid gap-2 border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" data-testid="online-cohabitation-shared-animal-buy-panel">
              <label class="block">
                <span>购买动物</span>
                <select v-model="selectedSharedAnimalBuyType" class="online-select mt-1 w-full" data-testid="online-cohabitation-shared-animal-buy-type">
                  <option v-for="option in sharedAnimalPurchaseOptions" :key="option.type" :value="option.type">
                    {{ option.label }} · {{ option.unitPrice }} 文
                  </option>
                </select>
              </label>
              <label class="block">
                <span>昵称</span>
                <input v-model.trim="sharedAnimalBuyName" class="online-input mt-1 w-full" maxlength="24" data-testid="online-cohabitation-shared-animal-buy-name" />
              </label>
              <button
                class="online-action-btn online-action-btn--compact self-end justify-center"
                type="button"
                :disabled="!canBuySharedAnimal || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-shared-animal-buy"
                @click="buySelectedSharedAnimal"
              >
                <Package :size="12" />
                购买
              </button>
            </div>
            <div v-if="sharedAnimals.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有可照料的共同动物。</div>
            <div v-else class="mt-3 space-y-3">
              <div class="max-h-48 space-y-2 overflow-y-auto pr-1">
                <button
                  v-for="animal in sharedAnimals"
                  :key="animal.id"
                  type="button"
                  class="w-full border p-2 text-left transition-colors"
                  :class="animal.id === selectedSharedAnimalId ? 'border-accent/50 bg-accent/10' : 'border-accent/10 bg-black/10 hover:border-accent/30'"
                  :data-testid="`online-cohabitation-shared-animal-${animal.id}`"
                  @click="selectSharedAnimal(animal)"
                >
                  <p class="truncate text-xs text-text">{{ animal.name || animal.type }}</p>
                  <p class="mt-1 text-[10px] text-muted">
                    {{ animal.origin_owner_display_name || animal.origin_owner_username }} · {{ animal.permission_mode }} · {{ animal.animal_state.was_fed ? '已喂' : '待喂' }} · {{ animal.animal_state.was_petted ? '已摸' : '待摸' }} · {{ sharedAnimalProductStatus(animal) }}
                  </p>
                </button>
              </div>
              <div v-if="selectedSharedAnimal" class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted">
                <p class="truncate text-xs text-text">{{ selectedSharedAnimal.name || selectedSharedAnimal.type }}</p>
                <p class="mt-1">来源：{{ selectedSharedAnimal.origin_owner_display_name || selectedSharedAnimal.origin_owner_username }}</p>
                <p class="mt-1">照料：{{ selectedSharedAnimal.current_keeper_display_name || selectedSharedAnimal.current_keeper_username || '未记录' }}</p>
                <p class="mt-1">饲料：{{ selectedSharedAnimal.animal_state.fed_with || '无' }} · 饥饿 {{ selectedSharedAnimal.animal_state.hunger }}</p>
                <p class="mt-1">抚摸：{{ selectedSharedAnimal.animal_state.was_petted ? '已完成' : '待照料' }} · 心情 {{ selectedSharedAnimal.animal_state.mood }}</p>
                <p class="mt-1">产物：{{ sharedAnimalProductStatus(selectedSharedAnimal) }}</p>
                <p class="mt-1" data-testid="online-cohabitation-shared-animal-coop-bonus">{{ sharedAnimalCoopBonusLabel(selectedSharedAnimal) }}</p>
              </div>
              <div class="grid gap-2 sm:grid-cols-4">
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canFeedSelectedSharedAnimal || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-animal-feed"
                  @click="feedSelectedSharedAnimal"
                >
                  <Package :size="12" />
                  干草喂食
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canPetSelectedSharedAnimal || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-animal-pet"
                  @click="petSelectedSharedAnimal"
                >
                  <Heart :size="12" />
                  抚摸
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canCollectSelectedSharedAnimalProduct || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-animal-collect-product"
                  @click="collectSelectedSharedAnimalProduct"
                >
                  <Package :size="12" />
                  收取入仓
                </button>
                <button
                  class="online-action-btn online-action-btn--compact justify-center"
                  type="button"
                  :disabled="!canSellSelectedSharedAnimal || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-shared-animal-sell"
                  @click="sellSelectedSharedAnimal"
                >
                  <Package :size="12" />
                  出售入基金
                </button>
              </div>
            </div>
            <p v-if="sharedAnimalActionMessage" class="mt-2 text-[10px] leading-4" :class="sharedAnimalActionOk ? 'text-emerald-200' : 'text-red-100'">
              {{ sharedAnimalActionMessage }}
            </p>
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
                  <p v-if="warehouseFrozenQuantity(item) > 0" class="mt-1 text-[10px] text-amber-100">
                    &#20923;&#32467; {{ warehouseFrozenQuantity(item) }} / &#21487;&#29992; {{ warehouseAvailableQuantity(item) }}
                  </p>
                </div>
                <span class="text-xs text-accent">x{{ item.quantity }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-[10px] text-muted">卖价 {{ warehouseSellUnitPriceForItem(item) || '未配置' }} 文</span>
                <div class="flex shrink-0 gap-2">
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="isHighValueWarehouseItem(item) || !canWithdrawWarehouseItem(item) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-withdraw-${item.item_id}`"
                    @click="withdrawWarehouseItem(item)"
                  >
                    取出 1 个
                  </button>
                  <button
                    v-if="isHighValueWarehouseItem(item)"
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canCreateHighValueWarehouseWithdrawalDraft(item) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-high-value-draft-${item.item_id}`"
                    @click="createHighValueWarehouseWithdrawalDraft(item)"
                  >
                    申请取出
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
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">高价值冻结：{{ cohabitationStore.warehouse?.summary.frozen_quantity ?? 0 }} 件 / 草案 {{ cohabitationStore.warehouse?.summary.active_high_value_withdrawal_draft_count ?? 0 }}</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">卖出：{{ cohabitationStore.warehouse?.summary.sell_enabled ? '开放' : '暂缓' }}</p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted" data-testid="online-cohabitation-warehouse-item-policy-summary">
                分级策略：v{{ cohabitationStore.warehouse?.summary.item_policy_version ?? '-' }} · 普通 {{ cohabitationStore.warehouse?.summary.common_item_policy_count ?? 0 }} / 稀有 {{ cohabitationStore.warehouse?.summary.rare_item_policy_count ?? 0 }} / 任务保护 {{ cohabitationStore.warehouse?.summary.task_protected_item_policy_count ?? 0 }}
              </p>
              <p class="border border-accent/10 bg-black/10 p-2 text-muted">
                默认保护：{{ cohabitationStore.warehouse?.summary.unclassified_items_default_protected ? '未分类物品拒绝普通流' : '未声明' }}
              </p>
            </div>
            <div
              v-if="warehouseGovernance"
              class="mt-3 border border-accent/10 bg-black/10 p-2"
              data-testid="online-cohabitation-warehouse-governance-panel"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">高频治理</p>
                <span class="text-[10px]" :class="warehouseGovernanceNeedsRecovery ? 'text-red-100' : 'text-muted'">
                  {{ warehouseGovernanceStatusLabel }}
                </span>
              </div>
              <div class="mt-2 grid gap-2 text-[10px] text-muted sm:grid-cols-2">
                <p class="border border-accent/10 px-2 py-1">入仓 {{ warehouseGovernance.actor_window.inbound_action_count }}/{{ warehouseGovernance.inbound_action_limit }}</p>
                <p class="border border-accent/10 px-2 py-1">出仓 {{ warehouseGovernance.actor_window.outbound_action_count }}/{{ warehouseGovernance.outbound_action_limit }}</p>
              </div>
              <p v-if="warehouseGovernanceBlocking?.reason" class="mt-2 text-[10px] leading-4 text-red-100">
                {{ warehouseGovernanceBlocking.reason }}
              </p>
              <p v-else-if="warehouseGovernanceActiveRecovery" class="mt-2 text-[10px] leading-4 text-muted">
                已恢复 {{ warehouseGovernanceActiveRecovery.direction }}，至 {{ formatTime(warehouseGovernanceActiveRecovery.expires_at) }}
              </p>
              <div v-if="warehouseGovernanceNeedsRecovery" class="mt-2 grid gap-2">
                <input
                  v-model.trim="warehouseGovernanceRecoverReason"
                  class="online-input text-xs"
                  maxlength="80"
                  placeholder="恢复原因"
                  data-testid="online-cohabitation-warehouse-governance-reason"
                >
                <button
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-center"
                  :disabled="!canRecoverWarehouseGovernance || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-warehouse-governance-recover"
                  @click="recoverWarehouseGovernance"
                >
                  <ShieldCheck :size="12" />
                  恢复{{ warehouseGovernanceDirectionLabel }}
                </button>
              </div>
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
            <div
              class="mt-3 border border-accent/10 bg-black/10 p-2"
              data-testid="online-cohabitation-shared-workshop-panel"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">共同工坊</p>
                <span class="text-[10px] text-muted">共享仓库进出</span>
              </div>
              <div class="mt-2 grid gap-2">
                <select
                  v-model="selectedSharedWorkshopRecipeId"
                  class="online-select text-xs"
                  data-testid="online-cohabitation-shared-workshop-recipe"
                >
                  <option v-for="recipe in sharedWorkshopRecipeOptions" :key="recipe.id" :value="recipe.id">
                    {{ recipe.label }}
                  </option>
                </select>
                <div v-if="selectedSharedWorkshopRecipe" class="grid gap-2 text-[10px] text-muted">
                  <div class="grid gap-2 sm:grid-cols-2">
                    <p class="border border-accent/10 bg-bg/30 px-2 py-1">
                      {{ sharedWorkshopStationLabel(selectedSharedWorkshopRecipe.station) }} · {{ sharedWorkshopProcessKindLabel(selectedSharedWorkshopRecipe.process_kind) }}
                    </p>
                    <p class="border border-accent/10 bg-bg/30 px-2 py-1" data-testid="online-cohabitation-shared-workshop-output">
                      产出 {{ sharedWorkshopOutputLabel }}
                    </p>
                  </div>
                  <div class="grid gap-1" data-testid="online-cohabitation-shared-workshop-inputs">
                    <p
                      v-for="row in sharedWorkshopInputRows"
                      :key="`${row.item_id}-${row.quality}`"
                      class="flex items-center justify-between gap-2 border px-2 py-1"
                      :class="row.enough ? 'border-accent/10 bg-bg/30 text-muted' : 'border-red-300/20 bg-red-500/10 text-red-100'"
                    >
                      <span>{{ row.label }} · {{ qualityLabel(row.quality) }} x{{ row.quantity }}</span>
                      <span>库存 {{ row.available }}</span>
                    </p>
                  </div>
                  <p v-if="selectedSharedWorkshopRecipe.alchemy_result_kind" class="text-[10px] leading-4 text-muted">
                    炼丹结果：{{ sharedWorkshopAlchemyResultLabel(selectedSharedWorkshopRecipe.alchemy_result_kind) }}
                  </p>
                  <label v-if="selectedSharedWorkshopRecipe.process_kind === 'alchemy_elixir'" class="grid gap-1 text-[10px] leading-4 text-muted">
                    <span>结果模式</span>
                    <select
                      v-model="sharedWorkshopAlchemyResultMode"
                      class="online-select text-xs"
                      :disabled="!selectedSharedWorkshopSupportsAlchemyAuto"
                      data-testid="online-cohabitation-shared-workshop-alchemy-result-mode"
                    >
                      <option value="fixed">固定结果</option>
                      <option value="auto">自动概率</option>
                    </select>
                  </label>
                  <label
                    v-if="sharedWorkshopAlchemyResultMode === 'auto' && selectedSharedWorkshopSupportsAlchemyAuto"
                    class="grid gap-1 text-[10px] leading-4 text-muted"
                  >
                    <span>火候</span>
                    <select
                      v-model="sharedWorkshopAlchemyHeatLevel"
                      class="online-select text-xs"
                      data-testid="online-cohabitation-shared-workshop-alchemy-heat"
                    >
                      <option value="gentle">文火</option>
                      <option value="balanced">中火</option>
                      <option value="strong">武火</option>
                    </select>
                  </label>
                  <p
                    v-if="sharedWorkshopAlchemyResultMode === 'auto' && sharedWorkshopAlchemyWeightPreviewLabel"
                    class="text-[10px] leading-4 text-muted"
                    data-testid="online-cohabitation-shared-workshop-alchemy-weight-preview"
                  >
                    自动权重：{{ sharedWorkshopAlchemyWeightPreviewLabel }}
                  </p>
                  <p class="text-[10px] leading-4 text-muted" data-testid="online-cohabitation-shared-workshop-medium-budget">
                    中额预算：{{ sharedWorkshopMediumBudgetLedger ? sharedWorkshopMediumBudgetLedger.id : '未绑定' }}
                  </p>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="!canProcessSelectedSharedWorkshopRecipe || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-shared-workshop-process"
                    @click="processSelectedSharedWorkshopRecipe"
                  >
                    <Package :size="12" />
                    执行共同工坊
                  </button>
                  <p
                    v-if="sharedWorkshopActionMessage"
                    class="text-[10px] leading-4"
                    :class="sharedWorkshopActionOk ? 'text-emerald-200' : 'text-red-100'"
                  >
                    {{ sharedWorkshopActionMessage }}
                  </p>
                  <div
                    v-if="sharedWorkshopLastResultRows.length"
                    class="grid gap-1 text-[10px] text-muted"
                    data-testid="online-cohabitation-shared-workshop-readback"
                  >
                    <p
                      v-for="row in sharedWorkshopLastResultRows"
                      :key="row.id"
                      class="border border-accent/10 bg-bg/30 px-2 py-1"
                    >
                      {{ row.label }}：{{ row.value }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">高价值取出确认</p>
            <div v-if="warehouseHighValueWithdrawalDrafts.length === 0" class="mt-3 text-xs leading-5 text-muted">暂无高品质 / 稀有物取出草案。</div>
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="draft in warehouseHighValueWithdrawalDrafts" :key="draft.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="truncate text-xs text-text">{{ warehouseItemLabels[draft.item_id] || draft.item_id }} x{{ draft.quantity }} · {{ highValueDraftStateLabel(draft.state) }}</p>
                <p class="mt-1 text-[10px] text-muted">{{ draft.quality }} · {{ highValueDraftRiskLabel(draft.risk_level) }} · 已确认 {{ draft.confirmation_state.confirmed_member_usernames.length }}/{{ draft.confirmation_state.required_member_usernames.length }}</p>
                <p class="mt-1 text-[10px] text-muted">冻结 {{ draft.frozen_quantity }} 件 · {{ draft.freeze_policy }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canConfirmHighValueWarehouseDraft(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-high-value-confirm-${draft.id}`"
                    @click="confirmHighValueWarehouseWithdrawalDraft(draft)"
                  >
                    确认
                  </button>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canExecuteHighValueWarehouseDraft(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-high-value-execute-${draft.id}`"
                    @click="executeHighValueWarehouseWithdrawalDraft(draft)"
                  >
                    执行
                  </button>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canRollbackHighValueWarehouseDraft(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-high-value-rollback-${draft.id}`"
                    @click="rollbackHighValueWarehouseWithdrawalDraft(draft)"
                  >
                    撤销冻结
                  </button>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="!canReadHighValueWarehouseCompensationAudit(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-warehouse-high-value-compensation-audit-${draft.id}`"
                    @click="readHighValueWarehouseCompensationAudit(draft)"
                  >
                    <ClipboardList :size="12" />
                    审计回看
                  </button>
                </div>
                <p
                  v-if="draft.compensation_execution_status === 'recorded'"
                  class="mt-2 text-[10px] text-emerald-200"
                  :data-testid="`online-cohabitation-warehouse-compensation-execution-recorded-${draft.id}`"
                >
                  补偿回执已记录：{{ draft.compensation_execution_action || 'manual' }} · {{ formatTime(draft.compensation_execution_recorded_at || 0) }}
                </p>
                <p
                  v-if="draft.compensation_appeal_resolution_status === 'recorded'"
                  class="mt-1 text-[10px] text-emerald-200"
                  :data-testid="`online-cohabitation-warehouse-manual-appeal-resolution-recorded-${draft.id}`"
                >
                  申诉恢复已记录：{{ warehouseManualAppealResolutionActionLabel(draft.compensation_appeal_resolution_action || 'audit_only') }} · {{ formatTime(draft.compensation_appeal_resolution_recorded_at || 0) }}
                </p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3" data-testid="online-cohabitation-warehouse-compensation-audit-panel">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">补偿审计证据包</p>
              <span class="text-[10px] text-muted">record-only</span>
            </div>
            <div v-if="!warehouseCompensationAuditBundle" class="mt-3 text-xs leading-5 text-muted">暂无补偿审计证据包。</div>
            <div v-else class="mt-3 border border-accent/10 bg-black/10 p-2" data-testid="online-cohabitation-warehouse-compensation-audit-bundle">
              <p class="truncate text-xs text-text" data-testid="online-cohabitation-warehouse-compensation-audit-summary">
                草案 {{ warehouseCompensationAuditBundle.draft_id }} · {{ warehouseCompensationAuditBundle.appeal_packet.timeline_complete ? '时间线完整' : '证据待补' }}
              </p>
              <div class="mt-2 grid gap-2 text-[10px] text-muted sm:grid-cols-2" data-testid="online-cohabitation-warehouse-compensation-audit-evidence">
                <p v-for="row in warehouseCompensationAuditBundleRows" :key="row.label" class="border border-accent/10 px-2 py-1">
                  {{ row.label }} {{ row.value }}
                </p>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-cohabitation-warehouse-compensation-audit-missing">
                缺失证据：{{ warehouseCompensationAuditMissingEvidenceLabel }}
              </p>
              <div class="mt-2 grid gap-2 text-[10px] text-muted sm:grid-cols-2" data-testid="online-cohabitation-warehouse-compensation-audit-target-save">
                <p v-for="row in warehouseCompensationAuditTargetRows" :key="row.label" class="border border-accent/10 px-2 py-1">{{ row.label }}：{{ row.value }}</p>
              </div>
              <div v-if="warehouseCompensationAuditTargetSlotRows.length" class="mt-2 grid gap-2 text-[10px] text-muted" data-testid="online-cohabitation-warehouse-compensation-audit-target-slots">
                <p v-for="row in warehouseCompensationAuditTargetSlotRows" :key="row.id" class="border border-accent/10 px-2 py-1">{{ row.label }}：{{ row.value }}</p>
              </div>
              <div class="mt-2 grid gap-2 text-[10px] text-muted" data-testid="online-cohabitation-warehouse-compensation-audit-ledger-ids">
                <p v-if="warehouseCompensationAuditLedgerRows.length === 0" class="border border-accent/10 px-2 py-1">暂无流水证据。</p>
                <p v-for="row in warehouseCompensationAuditLedgerRows" :key="row.id" class="border border-accent/10 px-2 py-1">{{ row.label }}：{{ row.value }}</p>
              </div>
              <div class="mt-2 grid gap-2 text-[10px] text-muted" data-testid="online-cohabitation-warehouse-compensation-audit-timeline">
                <p v-if="warehouseCompensationAuditTimelineRows.length === 0" class="border border-accent/10 px-2 py-1">暂无审计时间线。</p>
                <p v-for="row in warehouseCompensationAuditTimelineRows" :key="row.id" class="border border-accent/10 px-2 py-1">{{ row.label }}：{{ row.value }}</p>
              </div>
              <div v-if="warehouseCompensationRollbackAuditRows.length" class="mt-2 grid gap-2 text-[10px] text-muted sm:grid-cols-2" data-testid="online-cohabitation-warehouse-compensation-audit-rollback-evidence">
                <p v-for="row in warehouseCompensationRollbackAuditRows" :key="row.label" class="border border-accent/10 px-2 py-1">{{ row.label }}：{{ row.value }}</p>
              </div>
              <div class="mt-2 flex flex-wrap gap-2 text-[10px] text-muted" data-testid="online-cohabitation-warehouse-compensation-audit-appeal-actions">
                <span v-if="warehouseCompensationAuditAppealActionRows.length === 0" class="border border-accent/10 px-2 py-1">无后续动作</span>
                <span v-for="row in warehouseCompensationAuditAppealActionRows" :key="row.id" class="border border-accent/10 px-2 py-1">{{ row.label }}</span>
              </div>
              <div class="mt-2 grid gap-2 text-[10px] text-muted" data-testid="online-cohabitation-warehouse-compensation-audit-asset-boundary">
                <p v-for="row in warehouseCompensationAuditAssetRows" :key="row.label" class="border border-accent/10 px-2 py-1">{{ row.label }}：{{ row.value }}</p>
              </div>
              <div class="mt-3 grid gap-2 border border-accent/10 bg-black/10 p-2" data-testid="online-cohabitation-warehouse-compensation-execution-form">
                <p class="text-[10px] leading-4 text-muted">补偿执行只记录人工回执，不自动扣个人背包、不恢复共同仓库。</p>
                <input
                  v-model.trim="warehouseCompensationExecutionReceipt"
                  class="online-input text-xs"
                  maxlength="80"
                  placeholder="人工回执编号"
                  data-testid="online-cohabitation-warehouse-compensation-execution-receipt"
                />
                <input
                  v-model.trim="warehouseCompensationExecutionNote"
                  class="online-input text-xs"
                  maxlength="100"
                  placeholder="回执说明"
                  data-testid="online-cohabitation-warehouse-compensation-execution-note"
                />
                <label class="flex items-center gap-2 text-[10px] text-muted">
                  <input
                    v-model="warehouseCompensationExecutionConfirmed"
                    class="online-input size-3 accent-[var(--ty-accent)]"
                    type="checkbox"
                    data-testid="online-cohabitation-warehouse-compensation-execution-confirm"
                  />
                  确认只登记人工补偿 / 无需补偿回执，保持个人存档与共同仓库不变
                </label>
                <button
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-center"
                  :disabled="!canRecordHighValueWarehouseCompensationExecution || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-warehouse-compensation-execution-submit"
                  @click="recordHighValueWarehouseCompensationExecution"
                >
                  <ShieldCheck :size="12" />
                  记录补偿回执
                </button>
              </div>
              <p
                v-if="warehouseManualAppealResolutionAlreadyRecorded"
                class="mt-3 border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] leading-4 text-emerald-100"
                data-testid="online-cohabitation-warehouse-manual-appeal-resolution-recorded"
              >
                人工申诉恢复已记录：{{ warehouseManualAppealResolutionActionLabel(String(warehouseCompensationAuditDraft['compensation_appeal_resolution_action'] || 'audit_only')) }} · {{ formatTime(Number(warehouseCompensationAuditDraft['compensation_appeal_resolution_recorded_at'] || 0)) }} · record-only
              </p>
              <div
                v-if="warehouseManualAppealResolutionVisible"
                class="mt-3 grid gap-2 border border-accent/10 bg-black/10 p-2"
                data-testid="online-cohabitation-warehouse-manual-appeal-resolution-form"
              >
                <p class="text-[10px] leading-4 text-muted">人工申诉恢复只登记处理结论与执行审计引用，不自动还仓、不改个人背包。</p>
                <select
                  v-model="warehouseManualAppealResolutionAction"
                  class="online-select text-xs"
                  data-testid="online-cohabitation-warehouse-manual-appeal-resolution-action"
                >
                  <option value="manual_appeal_compensated">人工补偿已处理</option>
                  <option value="manual_appeal_restored">人工恢复已处理</option>
                  <option value="manual_appeal_denied">申诉驳回</option>
                  <option value="audit_only">仅审计归档</option>
                </select>
                <input
                  v-model.trim="warehouseManualAppealResolutionReceipt"
                  class="online-input text-xs"
                  maxlength="80"
                  placeholder="人工申诉恢复回执"
                  data-testid="online-cohabitation-warehouse-manual-appeal-resolution-receipt"
                />
                <input
                  v-model.trim="warehouseManualAppealResolutionNote"
                  class="online-input text-xs"
                  maxlength="120"
                  placeholder="处理说明"
                  data-testid="online-cohabitation-warehouse-manual-appeal-resolution-note"
                />
                <label class="flex items-center gap-2 text-[10px] text-muted">
                  <input
                    v-model="warehouseManualAppealResolutionConfirmed"
                    class="online-input size-3 accent-[var(--ty-accent)]"
                    type="checkbox"
                    data-testid="online-cohabitation-warehouse-manual-appeal-resolution-confirm"
                  />
                  确认只登记人工申诉恢复结论，保持个人存档与共同仓库不变
                </label>
                <button
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-center"
                  :disabled="!canRecordHighValueWarehouseManualAppealResolution || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-warehouse-manual-appeal-resolution-submit"
                  @click="recordHighValueWarehouseManualAppealResolution"
                >
                  <ShieldCheck :size="12" />
                  记录申诉恢复
                </button>
              </div>
              <p
                v-if="warehouseOperatorReceiptAuditAlreadyRecorded"
                class="mt-3 border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] leading-4 text-emerald-100"
                data-testid="online-cohabitation-warehouse-operator-receipt-audit-recorded"
              >
                操作回执审计复核已记录：{{ warehouseOperatorReceiptAuditActionLabel(String(warehouseCompensationAuditDraft['compensation_operator_receipt_audit_action'] || 'audit_only')) }} · {{ formatTime(Number(warehouseCompensationAuditDraft['compensation_operator_receipt_audit_recorded_at'] || 0)) }} · record-only
              </p>
              <div
                v-if="warehouseOperatorReceiptAuditEvidenceRows.length"
                class="mt-2 grid gap-2 text-[10px] text-muted sm:grid-cols-2"
                data-testid="online-cohabitation-warehouse-operator-receipt-audit-evidence"
              >
                <p v-for="row in warehouseOperatorReceiptAuditEvidenceRows" :key="row.label" class="border border-accent/10 px-2 py-1">
                  {{ row.label }}：{{ row.value }}
                </p>
              </div>
              <div
                v-if="warehouseOperatorReceiptAuditVisible"
                class="mt-3 grid gap-2 border border-accent/10 bg-black/10 p-2"
                data-testid="online-cohabitation-warehouse-operator-receipt-audit-form"
              >
                <p class="text-[10px] leading-4 text-muted">操作回执审计复核只登记人工核验结论，引用补偿执行审计和可选申诉恢复审计，不改个人存档或共同仓库。</p>
                <select
                  v-model="warehouseOperatorReceiptAuditAction"
                  class="online-select text-xs"
                  data-testid="online-cohabitation-warehouse-operator-receipt-audit-action"
                >
                  <option value="operator_receipt_verified">回执已核验</option>
                  <option value="operator_receipt_disputed">回执存在争议</option>
                  <option value="audit_only">仅审计归档</option>
                </select>
                <input
                  v-model.trim="warehouseOperatorReceiptAuditReceipt"
                  class="online-input text-xs"
                  maxlength="80"
                  placeholder="操作回执审计编号"
                  data-testid="online-cohabitation-warehouse-operator-receipt-audit-receipt"
                />
                <input
                  v-model.trim="warehouseOperatorReceiptAuditNote"
                  class="online-input text-xs"
                  maxlength="120"
                  placeholder="复核说明"
                  data-testid="online-cohabitation-warehouse-operator-receipt-audit-note"
                />
                <label class="flex items-center gap-2 text-[10px] text-muted">
                  <input
                    v-model="warehouseOperatorReceiptAuditConfirmed"
                    class="online-input size-3 accent-[var(--ty-accent)]"
                    type="checkbox"
                    data-testid="online-cohabitation-warehouse-operator-receipt-audit-confirm"
                  />
                  确认只登记操作回执审计复核，保持个人存档与共同仓库不变
                </label>
                <button
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-center"
                  :disabled="!canRecordHighValueWarehouseOperatorReceiptAuditReview || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-warehouse-operator-receipt-audit-submit"
                  @click="recordHighValueWarehouseOperatorReceiptAuditReview"
                >
                  <ShieldCheck :size="12" />
                  记录回执审计
                </button>
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
                @change="handleLargeFundDraftPurposeChange"
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
                :max="selectedFundLargeSpendOption?.maxAmount"
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
                :placeholder="fundLargeDraftTargetPlaceholder"
              >
              <div
                v-if="selectedFundLargeSpendOption"
                class="grid gap-2 text-[10px] sm:grid-cols-2"
                data-testid="online-cohabitation-fund-large-draft-risk-summary"
              >
                <span class="border border-accent/10 bg-bg/30 px-2 py-1 text-muted">
                  {{ selectedFundLargeSpendOption.category }} · 上限 {{ selectedFundLargeSpendOption.maxAmount }}
                </span>
                <span class="border px-2 py-1" :class="selectedLargeFundSpendIsHighRisk ? 'border-amber-300/20 bg-amber-500/10 text-amber-100' : 'border-accent/10 bg-bg/30 text-muted'">
                  {{ selectedLargeFundSpendPolicyLabel }}
                </span>
              </div>
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
            <p class="mt-2 text-[10px] leading-4 text-muted">{{ selectedLargeFundSpendExecutionSummary }}</p>
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
                <div v-if="isHighRiskLargeFundSpendPurpose(draft.purpose) || draft.deferred_operations.length > 0" class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-if="isHighRiskLargeFundSpendPurpose(draft.purpose) && draft.high_risk_receipt_status"
                    class="border px-2 py-1 text-[10px]"
                    :class="highRiskReceiptStateClass(draft.high_risk_receipt_status)"
                  >
                    回执 {{ highRiskReceiptStatusLabel(draft.high_risk_receipt_status) }}
                  </span>
                  <span
                    v-for="item in draft.deferred_operations.slice(0, 4)"
                    :key="`${draft.id}-deferred-${item}`"
                    class="border border-accent/10 bg-bg/30 px-2 py-1 text-[10px] text-muted"
                  >
                    {{ deferredOperationLabel(item) }}
                  </span>
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
                <div class="mt-2 grid gap-2 sm:grid-cols-3">
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
                  <button
                    v-if="isHighRiskLargeFundSpendPurpose(draft.purpose)"
                    type="button"
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="!canRecordHighRiskReceiptDraft(draft) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-fund-large-draft-receipt-${draft.id}`"
                    @click="selectHighRiskReceiptDraft(draft)"
                  >
                    <ShieldCheck :size="12" />
                    记录回执
                  </button>
                </div>
                <div
                  v-if="selectedHighRiskReceiptDraftId === draft.id"
                  class="mt-2 border border-amber-300/20 bg-amber-500/10 p-2"
                  data-testid="online-cohabitation-fund-high-risk-receipt-form"
                >
                  <div class="grid gap-2 sm:grid-cols-2">
                    <select
                      v-model="fundHighRiskReceiptOutcome"
                      class="online-select text-xs"
                      data-testid="online-cohabitation-fund-high-risk-receipt-outcome"
                    >
                      <option value="delivered">交付回执</option>
                      <option value="refunded">退款回执</option>
                    </select>
                    <input
                      v-model="fundHighRiskReceiptRef"
                      class="online-input text-xs"
                      data-testid="online-cohabitation-fund-high-risk-receipt-ref"
                      maxlength="100"
                      :placeholder="highRiskReceiptRefPlaceholder"
                    >
                    <input
                      v-model="fundHighRiskReceiptMemo"
                      class="online-input text-xs sm:col-span-2"
                      data-testid="online-cohabitation-fund-high-risk-receipt-memo"
                      maxlength="100"
                      placeholder="回执备注（可选）"
                    >
                  </div>
                  <label
                    v-if="fundHighRiskReceiptOutcome === 'refunded'"
                    class="mt-2 flex items-center gap-2 text-[10px] text-amber-100"
                    data-testid="online-cohabitation-fund-high-risk-receipt-ack"
                  >
                    <input
                      v-model="fundHighRiskReceiptCompensationAcknowledged"
                      type="checkbox"
                      class="online-input h-4 w-4 min-w-4 accent-accent"
                    >
                    已确认退款补偿方案
                  </label>
                  <button
                    type="button"
                    class="online-action-btn online-action-btn--compact mt-2 w-full justify-center"
                    :disabled="!canSubmitHighRiskReceipt || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-fund-high-risk-receipt-submit"
                    @click="recordHighRiskReceipt"
                  >
                    <ShieldCheck :size="12" />
                    提交高风险回执
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
                  <p
                    v-if="hasSimultaneousOnlineBonus(entry.simultaneous_online_bonus)"
                    class="mt-1 text-[10px] leading-4 text-emerald-100"
                    :data-testid="`online-cohabitation-fund-ledger-bonus-${entry.id}`"
                  >
                    同时在线加成：{{ simultaneousOnlineBonusLabel(entry.simultaneous_online_bonus) }} · {{ simultaneousOnlineBonusEvidenceLabel(entry.simultaneous_online_bonus) }}
                  </p>
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
              <div
                v-if="canManagePermissionPanel"
                class="mt-3 grid gap-2"
                data-testid="online-cohabitation-permission-grouped-toggles"
              >
                <div
                  v-for="group in permissionToggleGroups(member.permissions)"
                  :key="`${member.username}-toggle-group-${group.id}`"
                  class="border border-accent/10 bg-bg/30 p-2"
                  :data-testid="`online-cohabitation-permission-toggle-group-${group.id}`"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-[10px] text-accent">{{ permissionGroupLabel(group.id) }}</p>
                    <span class="text-[10px] text-muted">{{ group.enabled }}/{{ group.total }}</span>
                  </div>
                  <div class="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      v-for="option in group.options"
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
            <div class="mt-3 grid gap-2 sm:grid-cols-4">
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyOrdersPanel.write_enabled"
                @click="createFamilyOrderFromPanel"
              >
                发布订单
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyOrdersPanel.write_enabled || !firstOpenFamilyOrder"
                @click="acceptFirstFamilyOrder"
              >
                接取订单
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyOrdersPanel.write_enabled || !firstAcceptedFamilyOrder"
                @click="deliverFirstFamilyOrder"
              >
                交付订单
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyOrdersPanel.settlement_enabled || !firstDeliveredFamilyOrder"
                @click="settleFirstFamilyOrder"
              >
                结算订单
              </button>
            </div>
            <p
              v-if="familyOrderActionMessage"
              class="mt-2 text-[10px] leading-4"
              :class="familyOrderActionOk ? 'text-emerald-200' : 'text-red-100'"
            >
              {{ familyOrderActionMessage }}
            </p>
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
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyReputationPanel.write_enabled"
                @click="awardFamilyReputationFromPanel"
              >
                发放声望
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyReputationPanel.summary.shared_fund_reward_enabled"
                @click="claimFamilyReputationRewardFromPanel"
              >
                领取奖励
              </button>
            </div>
            <p
              v-if="familyReputationActionMessage"
              class="mt-2 text-[10px] leading-4"
              :class="familyReputationActionOk ? 'text-emerald-200' : 'text-red-100'"
            >
              {{ familyReputationActionMessage }}
            </p>
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
                  <p v-if="entry.medium_fund_budget_ledger_id || entry.medium_fund_budget_linked">中额预算：{{ entry.medium_fund_budget_ledger_id || '已绑定' }}</p>
                  <p>状态：{{ familyBuildingLedgerStatusLabel(entry.status) }} · {{ formatTime(entry.at || entry.created_at) }}</p>
                  <p>
                    材料：{{ entry.shared_warehouse_materials_consumed ? '已消耗' : '未消耗' }} ·
                    真实建造：{{ entry.real_build_applied ? '已落账' : '未落账' }} ·
                    个人铜币：{{ entry.personal_money_merged ? '合并' : '独立' }}
                  </p>
                  <p
                    v-if="hasSimultaneousOnlineBonus(entry.simultaneous_online_bonus)"
                    class="text-emerald-100"
                    :data-testid="`online-cohabitation-building-ledger-bonus-${entry.id}`"
                  >
                    同时在线加成：{{ simultaneousOnlineBonusLabel(entry.simultaneous_online_bonus) }} · {{ simultaneousOnlineBonusEvidenceLabel(entry.simultaneous_online_bonus) }}
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
                  <div
                    v-if="entry.real_build_demolition_main_state_manifest?.length"
                    class="mt-2 grid gap-2 md:grid-cols-2"
                    :data-testid="`online-cohabitation-building-main-state-candidate-snapshot-${entry.id}`"
                  >
                    <div
                      v-for="row in entry.real_build_demolition_main_state_manifest"
                      :key="`${entry.id}-${row.username_key}-candidate-snapshot`"
                      class="border border-accent/10 bg-black/10 p-2"
                    >
                      <p class="truncate text-[10px] text-text">{{ row.username || row.username_key }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ formatFamilyBuildingMainStateCandidateSnapshot(row) }}</p>
                    </div>
                  </div>
                  <p v-if="entry.real_build_demolition_main_state_policy">
                    主态策略：{{ entry.real_build_demolition_main_state_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_mapped_at || entry.real_build_demolition_main_state_mapping_manifest_hash">
                    映射证明：{{ entry.real_build_demolition_main_state_mapped_by_display_name || entry.real_build_demolition_main_state_mapped_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_main_state_mapped_at) }} · {{ entry.real_build_demolition_main_state_mapping_manifest?.length || 0 }} 条 · {{ entry.real_build_demolition_main_state_mapping_manifest_hash || '无 hash' }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_mapping_policy">
                    映射策略：{{ entry.real_build_demolition_main_state_mapping_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_guarded_at || entry.real_build_demolition_main_state_guard_manifest_hash">
                    安全阀：{{ entry.real_build_demolition_main_state_guarded_by_display_name || entry.real_build_demolition_main_state_guarded_by_username || '已确认' }} · {{ formatTime(entry.real_build_demolition_main_state_guarded_at) }} · {{ entry.real_build_demolition_main_state_guard_manifest?.length || 0 }} 条 · {{ entry.real_build_demolition_main_state_guard_manifest_hash || '无 hash' }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_guard_policy">
                    安全阀策略：{{ entry.real_build_demolition_main_state_guard_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_executed_at || entry.real_build_demolition_main_state_execution_state">
                    主态执行：{{ entry.real_build_demolition_main_state_executed_by_display_name || entry.real_build_demolition_main_state_executed_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_main_state_executed_at) }} · {{ familyBuildingMainStateExecutionLabel(entry.real_build_demolition_main_state_execution_state) }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_execute_policy">
                    执行策略：{{ entry.real_build_demolition_main_state_execute_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_target_bound_at || entry.real_build_demolition_main_state_exact_target_manifest_hash">
                    精确目标：{{ entry.real_build_demolition_main_state_exact_target_bound_by_display_name || entry.real_build_demolition_main_state_exact_target_bound_by_username || '已绑定' }} · {{ formatTime(entry.real_build_demolition_main_state_exact_target_bound_at) }} · {{ entry.real_build_demolition_main_state_exact_target_manifest?.length || 0 }} 条 · {{ entry.real_build_demolition_main_state_exact_target_manifest_hash || '无 hash' }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_target_policy">
                    精确目标策略：{{ entry.real_build_demolition_main_state_exact_target_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_target_resolution_idempotency_key || entry.real_build_demolition_main_state_exact_target_resolution_policy">
                    目标解析：{{ entry.real_build_demolition_main_state_exact_target_resolved_by_display_name || entry.real_build_demolition_main_state_exact_target_resolved_by_username || '已解析' }} · {{ formatTime(entry.real_build_demolition_main_state_exact_target_resolved_at) }} · {{ entry.real_build_demolition_main_state_exact_target_manifest_hash || '无 hash' }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_target_resolution_policy">
                    解析策略：{{ entry.real_build_demolition_main_state_exact_target_resolution_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_execute_idempotency_key || entry.real_build_demolition_main_state_exact_execution_state">
                    精确执行：{{ entry.real_build_demolition_main_state_exact_executed_by_display_name || entry.real_build_demolition_main_state_exact_executed_by_username || '已记录' }} · {{ formatTime(entry.real_build_demolition_main_state_exact_executed_at) }} · {{ familyBuildingMainStateExecutionLabel(entry.real_build_demolition_main_state_exact_execution_state) }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_execute_policy">
                    精确执行策略：{{ entry.real_build_demolition_main_state_exact_execute_policy }}
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_mutation_idempotency_key || entry.real_build_demolition_main_state_exact_mutation_policy">
                    主态变更：{{ entry.real_build_demolition_main_state_exact_mutated_by_display_name || entry.real_build_demolition_main_state_exact_mutated_by_username || '已执行' }} · {{ formatTime(entry.real_build_demolition_main_state_exact_mutated_at) }} · {{ entry.real_build_demolition_main_state_exact_mutation_receipts?.length || 0 }} 份回执
                  </p>
                  <p v-if="entry.real_build_demolition_main_state_exact_mutation_policy">
                    变更策略：{{ entry.real_build_demolition_main_state_exact_mutation_policy }}
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
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canVerifyFamilyBuildingRealDemolitionMainStateMapping(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-verify-main-state-mapping-${entry.id}`"
                    @click="verifyFamilyBuildingRealDemolitionMainStateMapping(entry)"
                  >
                    <ShieldCheck :size="12" />
                    证明映射
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canGuardFamilyBuildingRealDemolitionMainStateMutation(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-guard-main-state-mutation-${entry.id}`"
                    @click="guardFamilyBuildingRealDemolitionMainStateMutation(entry)"
                  >
                    <ShieldCheck :size="12" />
                    确认安全阀
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canExecuteFamilyBuildingRealDemolitionMainStateMutation(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-execute-main-state-mutation-${entry.id}`"
                    @click="executeFamilyBuildingRealDemolitionMainStateMutation(entry)"
                  >
                    <ShieldCheck :size="12" />
                    阻断执行
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canBindFamilyBuildingRealDemolitionMainStateExactTargets(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-bind-main-state-exact-targets-${entry.id}`"
                    @click="bindFamilyBuildingRealDemolitionMainStateExactTargets(entry)"
                  >
                    <ShieldCheck :size="12" />
                    绑定目标
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canExecuteFamilyBuildingRealDemolitionMainStateExactTargets(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-execute-main-state-exact-targets-${entry.id}`"
                    @click="executeFamilyBuildingRealDemolitionMainStateExactTargets(entry)"
                  >
                    <ShieldCheck :size="12" />
                    精确阻断
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canResolveFamilyBuildingRealDemolitionMainStateExactTargets(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-resolve-main-state-exact-targets-${entry.id}`"
                    @click="resolveFamilyBuildingRealDemolitionMainStateExactTargets(entry)"
                  >
                    <ShieldCheck :size="12" />
                    解析目标
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canExecuteFamilyBuildingRealDemolitionMainStateExactMutation(entry) || cohabitationStore.actionLoading"
                    :data-testid="`online-cohabitation-building-real-demolition-execute-main-state-exact-mutation-${entry.id}`"
                    @click="executeFamilyBuildingRealDemolitionMainStateExactMutation(entry)"
                  >
                    <ShieldCheck :size="12" />
                    执行变更
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
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyVisibilityPanel.write_enabled"
                @click="publishFamilyVisibilityFromPanel"
              >
                写入公开
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyVisibilityPanel.summary.rollback_enabled"
                @click="rollbackFamilyVisibilityFromPanel"
              >
                回滚公开
              </button>
            </div>
            <p
              v-if="familyVisibilityActionMessage"
              class="mt-2 text-[10px] leading-4"
              :class="familyVisibilityActionOk ? 'text-emerald-200' : 'text-red-100'"
            >
              {{ familyVisibilityActionMessage }}
            </p>
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
            <div class="mt-3 grid gap-2 sm:grid-cols-4">
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyFestivalSeatsPanel.seat_reservation_enabled"
                @click="reserveFamilyFestivalSeatsFromPanel"
              >
                锁席
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyFestivalSeatsPanel.festival_room_binding_enabled"
                @click="createFamilyFestivalRoomFromPanel"
              >
                开房
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyFestivalSeatsPanel.summary.shared_warehouse_consume_enabled"
                @click="consumeFamilyFestivalSuppliesFromPanel"
              >
                供品
              </button>
              <button
                type="button"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="cohabitationStore.actionLoading || !familyFestivalSeatsPanel.summary.settlement_enabled"
                @click="settleFamilyFestivalRewardsFromPanel"
              >
                结算
              </button>
            </div>
            <p
              v-if="familyFestivalSeatActionMessage"
              class="mt-2 text-[10px] leading-4"
              :class="familyFestivalSeatActionOk ? 'text-emerald-200' : 'text-red-100'"
            >
              {{ familyFestivalSeatActionMessage }}
            </p>
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
          <div class="game-panel-muted p-3" data-testid="online-cohabitation-offline-queue-panel">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">离线队列合并</p>
              <span class="text-[10px] text-muted">{{ offlineQueueSupportedActionCount }} 项</span>
            </div>
            <div class="mt-3 border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted" data-testid="online-cohabitation-offline-auto-income-summary">
              <div class="flex items-center justify-between gap-2">
                <span>自动收益待领：{{ offlineAutoIncomePendingCount }} 项</span>
                <button
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="!canCollectOfflineAutoIncome || cohabitationStore.actionLoading"
                  data-testid="online-cohabitation-offline-auto-income-collect"
                  @click="collectOfflineAutoIncome"
                >
                  <Package :size="12" />
                  领取
                </button>
              </div>
              <p class="mt-1">{{ offlineAutoIncomePolicyText }}</p>
            </div>
            <div class="mt-3 space-y-3">
              <label class="block text-[10px] leading-4 text-muted">
                <span>待合并操作</span>
                <select
                  v-model="selectedOfflineQueueActionId"
                  class="online-select mt-1 w-full"
                  data-testid="online-cohabitation-offline-queue-action-select"
                >
                  <option v-for="option in offlineQueueActionOptions" :key="option.id" :value="option.id">
                    {{ option.label }} · {{ option.targetLabel }}
                  </option>
                </select>
              </label>
              <div class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted">
                <p class="truncate text-xs text-text" data-testid="online-cohabitation-offline-queue-selected-label">
                  {{ selectedOfflineQueueActionOption?.label || '未选择操作' }}
                </p>
                <p class="mt-1" data-testid="online-cohabitation-offline-queue-selected-target">
                  目标：{{ selectedOfflineQueueActionOption?.targetLabel || '未选择目标' }}
                </p>
                <p class="mt-1" data-testid="online-cohabitation-offline-queue-selected-state">
                  {{ selectedOfflineQueueActionOption?.enabled ? '服务端队列可提交' : selectedOfflineQueueActionOption?.disabledReason || '当前不可提交' }}
                </p>
              </div>
              <label
                v-if="selectedOfflineQueueActionId === 'record_rare_item_refund_receipt' || selectedOfflineQueueActionId === 'record_family_major_event_refund_receipt' || selectedOfflineQueueActionId === 'record_limited_decoration_refund_receipt' || selectedOfflineQueueActionId === 'record_shared_decoration_removal_refund_receipt'"
                class="flex items-start gap-2 border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted"
                data-testid="online-cohabitation-offline-refund-ack"
              >
                <input v-model="offlineQueueRefundAcknowledged" class="online-input mt-0.5 h-4 w-4 min-w-4 accent-accent" type="checkbox" />
                <span>确认补偿方案，退款只退回共同基金，不改个人小屋、背包或共同仓库。</span>
              </label>
              <div class="border border-accent/10 bg-black/10 p-2 text-[10px] leading-4 text-muted" data-testid="online-cohabitation-offline-local-queue">
                <div class="flex items-center justify-between gap-2">
                  <span>{{ offlineQueueDraftSummaryLabel }}</span>
                  <span>{{ offlineQueueDraftStorageLabel }}</span>
                </div>
                <div class="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canSubmitOfflineQueueMerge || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-offline-local-queue-add"
                    @click="cacheSelectedOfflineQueueOperation"
                  >
                    <ClipboardList :size="12" />
                    加入缓存
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canSubmitOfflineQueueDraftMerge || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-offline-local-queue-merge"
                    @click="submitOfflineQueueDraftMerge"
                  >
                    <Clock3 :size="12" />
                    合并缓存
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="!canPreflightOfflineQueueDraft || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-offline-local-queue-preflight"
                    @click="preflightOfflineQueueDraft"
                  >
                    <ShieldCheck :size="12" />
                    预检缓存
                  </button>
                  <button
                    class="online-action-btn online-action-btn--compact justify-center"
                    type="button"
                    :disabled="offlineQueueDraftOperations.length === 0 || cohabitationStore.actionLoading"
                    data-testid="online-cohabitation-offline-local-queue-clear"
                    @click="clearOfflineQueueDraftOperations"
                  >
                    <XCircle :size="12" />
                    清空缓存
                  </button>
                </div>
                <p v-if="offlineQueueDraftRows.length === 0" class="mt-2">本地缓存为空</p>
                <div v-else class="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
                  <div
                    v-for="row in offlineQueueDraftRows"
                    :key="row.id"
                    class="grid gap-2 border border-accent/10 bg-bg/30 p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    data-testid="online-cohabitation-offline-local-queue-row"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-text">{{ row.label }} · {{ row.targetLabel }}</p>
                      <p class="mt-1 truncate">{{ row.savedLabel }}</p>
                    </div>
                    <button
                      class="online-action-btn online-action-btn--compact justify-center"
                      type="button"
                      :disabled="cohabitationStore.actionLoading"
                      :data-testid="`online-cohabitation-offline-local-queue-remove-${row.index}`"
                      @click="removeOfflineQueueDraftOperation(row.index)"
                    >
                      <XCircle :size="12" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                class="online-action-btn online-action-btn--compact w-full justify-center"
                type="button"
                :disabled="!canSubmitOfflineQueueMerge || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-offline-queue-submit"
                @click="submitSelectedOfflineQueueMerge"
              >
                <Clock3 :size="12" />
                合并选中离线操作
              </button>
              <button
                class="online-action-btn online-action-btn--compact w-full justify-center"
                type="button"
                :disabled="!canPreflightOfflineConflicts || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-offline-conflict-preflight"
                @click="submitOfflineConflictPreflight"
              >
                <ShieldCheck :size="12" />
                预检服务端冲突
              </button>
              <button
                class="online-action-btn online-action-btn--compact w-full justify-center"
                type="button"
                :disabled="!cohabitationStore.canOpenSelectedContract || cohabitationStore.actionLoading"
                data-testid="online-cohabitation-daily-settle"
                @click="submitCohabitationDailySettle"
              >
                <Clock3 :size="12" />
                共同庄园日结
              </button>
              <p
                v-if="dailySettleActionMessage"
                class="text-[10px] leading-4"
                :class="dailySettleActionOk ? 'text-emerald-200' : 'text-red-100'"
                data-testid="online-cohabitation-daily-settle-message"
              >
                {{ dailySettleActionMessage }}
              </p>
              <p
                v-if="offlineQueueActionMessage"
                class="text-[10px] leading-4"
                :class="offlineQueueActionOk ? 'text-emerald-200' : 'text-red-100'"
                data-testid="online-cohabitation-offline-queue-message"
              >
                {{ offlineQueueActionMessage }}
              </p>
              <div
                v-if="offlineQueueMergeRows.length || offlineConflictResolutionLabel || offlineConflictAutoResolutionLabel || offlineConflictPreflightLabel"
                class="space-y-1 text-[10px] text-muted"
                data-testid="online-cohabitation-offline-queue-results"
              >
                <p class="border border-accent/10 bg-black/10 p-2 leading-4" data-testid="online-cohabitation-offline-queue-revision-state">
                  {{ offlineQueueRevisionStateLabel }}
                </p>
                <p
                  v-if="offlineConflictResolutionLabel"
                  class="border border-accent/10 bg-black/10 p-2 leading-4"
                  data-testid="online-cohabitation-offline-conflict-resolution"
                >
                  {{ offlineConflictResolutionLabel }}
                </p>
                <p
                  v-if="offlineConflictAutoResolutionLabel"
                  class="border border-accent/10 bg-black/10 p-2 leading-4"
                  data-testid="online-cohabitation-offline-conflict-auto-resolution"
                >
                  {{ offlineConflictAutoResolutionLabel }}
                </p>
                <p
                  v-if="offlineConflictPreflightLabel"
                  class="border border-accent/10 bg-black/10 p-2 leading-4"
                  data-testid="online-cohabitation-offline-conflict-preflight-result"
                >
                  {{ offlineConflictPreflightLabel }}
                </p>
                <div v-for="row in offlineQueueMergeRows" :key="row.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-text">{{ row.label }}</span>
                    <span :class="row.ok ? 'text-emerald-200' : 'text-red-100'">{{ row.status }}</span>
                  </div>
                  <p class="mt-1 leading-4">{{ row.detail }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3" data-testid="online-cohabitation-shared-audit-log">
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
                <p v-if="sharedLogDetail(entry)" class="mt-2 text-[10px] leading-4 text-muted" data-testid="online-cohabitation-shared-audit-detail">{{ sharedLogDetail(entry) }}</p>
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
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    Bug,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ClipboardList,
    Droplets,
    Heart,
    HeartHandshake,
    Lock,
    Map,
    Network,
    Package,
    Play,
    Scissors,
    ShieldCheck,
    Sprout,
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
    CohabitationFundShopPurchaseCatalogItem,
    CohabitationFundLargeSpendDraft,
    CohabitationFundLedgerEntry,
    CohabitationMember,
    CohabitationOfflineQueueAction,
    CohabitationOfflineQueueMergeEntry,
    CohabitationOfflineQueueOperation,
    CohabitationSharedAnimal,
    CohabitationSharedPet,
    CohabitationSharedPlot,
    CohabitationSharedRegion,
    CohabitationSharedWorkshopRecipe,
    CohabitationWarehouseCompensationAuditBundle,
    CohabitationWarehouseHighValueWithdrawalDraft,
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
  type FundHighRiskReceiptOutcome = 'delivered' | 'refunded'
  type SharedAnimalProductInfo = { productId: string; produceDays: number }
  type SharedAnimalPurchaseOption = { type: string; label: string; unitPrice: number }
  type SharedPetCareItemInfo = {
    itemId: string
    label: string
    effect: string
    friendshipGain: number
    moodGain: number
    riskLevel?: string
    requiresConfirmation?: boolean
    confirmationPhrase?: string
    rollbackPlan?: string
    compensationHint?: string
  }
  type SharedWorkshopRecipeOption = CohabitationSharedWorkshopRecipe
  type SharedAlchemyWeights = {
    success: number
    partial: number
    failed: number
    rare: number
  }
  type SharedAlchemyHeatLevel = 'gentle' | 'balanced' | 'strong'
  type SharedWorkshopResultRow = { id: string; label: string; value: string }
  type SharedDecorationStateEntry = Record<string, unknown> & {
    decoration_id?: string
    decoration_kind?: string
    from_location_ref?: string
    to_location_ref?: string
    placement_ref?: string
    target_ref?: string
    state?: string
  }
  type StitchedSharedFarmCell = {
    key: string
    plot: CohabitationSharedPlot | null
    regionIndex: number | null
  }
  type OfflineQueueUiActionId =
    | 'water_shared_farm'
    | 'care_shared_farm_cure_pests'
    | 'care_shared_farm_clear_weeds'
    | 'plant_shared_farm'
    | 'fertilize_shared_farm_basic'
    | 'fertilize_shared_farm_premium'
    | 'harvest_shared_farm'
    | 'feed_shared_animal'
    | 'pet_shared_animal'
    | 'collect_shared_animal_product'
    | 'buy_shared_animal'
    | 'sell_shared_animal'
    | 'care_shared_pet'
    | 'process_shared_workshop_recipe'
    | 'move_shared_decoration'
    | 'record_rare_item_delivery_receipt'
    | 'record_rare_item_refund_receipt'
    | 'record_family_major_event_receipt'
    | 'record_family_major_event_refund_receipt'
    | 'record_limited_decoration_delivery_receipt'
    | 'record_limited_decoration_refund_receipt'
    | 'record_shared_decoration_removal_refund_receipt'
    | 'record_shared_decoration_removal_receipt'
    | 'settle_shared_daily'
    | 'collect_offline_auto_income'
  type OfflineQueueActionOption = {
    id: OfflineQueueUiActionId
    queueAction: CohabitationOfflineQueueAction
    label: string
    targetLabel: string
    enabled: boolean
    disabledReason: string
  }
  type OfflineQueueResultRow = {
    id: string
    label: string
    status: string
    detail: string
    ok: boolean
  }
  type OfflineQueueDraftOperation = CohabitationOfflineQueueOperation & {
    cached_at?: number
    cached_label?: string
    cached_target_label?: string
  }
  type OfflineQueueDraftRow = {
    index: number
    id: string
    label: string
    targetLabel: string
    savedLabel: string
  }
  type SeparationSharedDecorationRemovalDispute = {
    draft_id: string
    target_ref: string
    original_fund_ledger_id: string
    amount: number
    status: string
  }
  type SeparationSharedDecorationRemovalFreezeSummary = {
    pending_count: number
    total_amount: number
  }
  type SeparationSharedDecorationRemovalFreezePolicy = {
    status: string
  }
  type SeparationSharedFundReadbackRow = {
    key: string
    origin_owner_username: string
    capital_contribution_amount: number
    operating_contribution_amount: number
    split_basis_amount: number
    suggested_refund_amount: number
    fund_split_basis: string
    operating_ledger_count: number
    warehouse_sale_ledger_count: number
    requires_confirmation: boolean
    return_status: string
  }

  const OFFLINE_QUEUE_DRAFT_STORAGE_PREFIX = 'taoyuan:cohabitation:offline-queue:drafts:v1'
  const OFFLINE_QUEUE_DRAFT_MAX_OPERATIONS = 12
  type SeparationSharedFundReadbackSummary = {
    capital_total: number
    operating_total: number
    split_basis_total: number
    refund_total: number
    rows_requiring_confirmation: number
    requires_consumption_delta_confirmation: boolean
    requires_unidentified_operating_confirmation: boolean
    unidentified_operating_contribution_total: number
    unidentified_operating_contribution_rows: number
    unidentified_operating_contribution_hash: string
    unidentified_operating_ledger_ids: string[]
    manual_unidentified_operating_allocation_total: number
    manual_unidentified_operating_allocation_hash: string
    manual_unidentified_operating_allocation_applied: boolean
    required_member_usernames: string[]
    confirmed_member_usernames: string[]
    pending_member_usernames: string[]
    all_members_confirmed: boolean
    fund_split_basis: string
  }
  type SeparationSharedFundManualAllocationMember = {
    username: string
    username_key: string
    split_basis_amount: number
  }
  type SeparationStoryCinematicReadbackRow = {
    key: string
    label: string
    value: string
  }
  type SeparationStoryCinematicPlaybackStep = {
    key: string
    kind: 'stage' | 'dialogue' | 'animation'
    label: string
    short_label: string
    detail: string
    duration_ms: number
  }

  const separationStoryValueLabel = (value: unknown, fallback = '待记录') => {
    if (typeof value === 'string') return value.trim() || fallback
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'boolean') return value ? '是' : '否'
    return fallback
  }
  const separationStoryFlagLabel = (value: unknown, truthy = '是', falsy = '否') =>
    value === true ? truthy : falsy
  const separationStoryDialogueLinesLabel = (value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) return '待记录'
    return value
      .map((line, index) => {
        const entry = line && typeof line === 'object' && !Array.isArray(line)
          ? line as Record<string, unknown>
          : {}
        const speaker = separationStoryValueLabel(entry.speaker_role, `角色${index + 1}`)
        const text = separationStoryValueLabel(entry.text, '')
        return text ? `${speaker}：${text}` : ''
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(' / ') || '待记录'
  }
  const separationStoryAnimationCuesLabel = (value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) return '待记录'
    return value
      .map((cue, index) => {
        const entry = cue && typeof cue === 'object' && !Array.isArray(cue)
          ? cue as Record<string, unknown>
          : {}
        const action = separationStoryValueLabel(entry.action, '')
        const stage = separationStoryValueLabel(entry.stage, `段落${index + 1}`)
        return action ? `${stage}:${action}` : ''
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(' / ') || '待记录'
  }

  const largeFundSpendPurposeIds: FundLargeSpendPurpose[] = [
    'family_building',
    'manor_expansion',
    'rare_item_purchase',
    'limited_decoration',
    'shared_decoration_removal',
    'family_major_event',
  ]
  const highRiskLargeFundSpendPurposeIds: FundLargeSpendPurpose[] = [
    'rare_item_purchase',
    'limited_decoration',
    'shared_decoration_removal',
    'family_major_event',
  ]
  const largeFundSpendTargetRefs: Record<FundLargeSpendPurpose, string> = {
    family_building: 'family_building:family_hall:build',
    manor_expansion: 'manor_expansion:shared_plot:north',
    rare_item_purchase: 'rare_item:lotus_seed_rare',
    limited_decoration: 'limited_decoration:spring_lantern',
    shared_decoration_removal: 'shared_decoration:tea_room_wall:remove',
    family_major_event: 'family_major_event:child_schooling',
  }

  const sharedAnimalProductCatalog: Record<string, SharedAnimalProductInfo> = {
    chicken: { productId: 'egg', produceDays: 1 },
    duck: { productId: 'duck_egg', produceDays: 2 },
    rabbit: { productId: 'rabbit_fur', produceDays: 3 },
    goose: { productId: 'goose_egg', produceDays: 2 },
    quail: { productId: 'quail_egg', produceDays: 1 },
    pigeon: { productId: 'pigeon_egg', produceDays: 2 },
    silkie: { productId: 'silkie_egg', produceDays: 2 },
    peacock: { productId: 'peacock_feather', produceDays: 4 },
    cow: { productId: 'milk', produceDays: 1 },
    sheep: { productId: 'wool', produceDays: 3 },
    goat: { productId: 'goat_milk', produceDays: 2 },
    pig: { productId: 'truffle', produceDays: 2 },
    buffalo: { productId: 'buffalo_milk', produceDays: 2 },
    yak: { productId: 'yak_milk', produceDays: 2 },
    alpaca: { productId: 'alpaca_wool', produceDays: 3 },
    deer: { productId: 'antler_velvet', produceDays: 5 },
    donkey: { productId: 'donkey_milk', produceDays: 3 },
    camel: { productId: 'camel_milk', produceDays: 2 },
    ostrich: { productId: 'ostrich_egg', produceDays: 3 },
  }
  const sharedPetCareItemCatalog: Record<string, SharedPetCareItemInfo> = {
    vitality_feed: { itemId: 'vitality_feed', label: '活力饲料', effect: '活力照料', friendshipGain: 3, moodGain: 8, riskLevel: 'standard' },
    premium_feed: { itemId: 'premium_feed', label: '精饲料', effect: '亲密照料', friendshipGain: 6, moodGain: 12, riskLevel: 'standard' },
    nourishing_feed: { itemId: 'nourishing_feed', label: '滋补饲料', effect: '滋养照料', friendshipGain: 4, moodGain: 10, riskLevel: 'standard' },
    sesame_patrol_biscuit: {
      itemId: 'sesame_patrol_biscuit',
      label: '芝麻巡院饼',
      effect: '巡院照料',
      friendshipGain: 8,
      moodGain: 14,
      riskLevel: 'high_value_pet_treat',
      requiresConfirmation: true,
      confirmationPhrase: '确认消耗共同宠物高阶点心',
      rollbackPlan: '缺少确认会被服务端阻断，提交后按共同宠物与仓库 ledger 补偿。',
      compensationHint: '异常时按共同宠物照料 ledger 和共同仓库扣料 ledger 返还或重放。',
    },
    lotus_heart_cat_treat: {
      itemId: 'lotus_heart_cat_treat',
      label: '莲心桂花糕',
      effect: '高阶灵宠点心',
      friendshipGain: 10,
      moodGain: 16,
      riskLevel: 'high_value_pet_treat',
      requiresConfirmation: true,
      confirmationPhrase: '确认消耗共同宠物高阶点心',
      rollbackPlan: '缺少确认会被服务端阻断，提交后按共同宠物与仓库 ledger 补偿。',
      compensationHint: '异常时按共同宠物照料 ledger 和共同仓库扣料 ledger 返还或重放。',
    },
    spirit_fruit_mooncake: {
      itemId: 'spirit_fruit_mooncake',
      label: '灵果月华糕',
      effect: '稀有灵宠点心',
      friendshipGain: 14,
      moodGain: 20,
      riskLevel: 'rare_pet_treat',
      requiresConfirmation: true,
      confirmationPhrase: '确认消耗共同宠物高阶点心',
      rollbackPlan: '缺少确认会被服务端阻断，提交后按共同宠物与仓库 ledger 补偿。',
      compensationHint: '异常时按共同宠物照料 ledger 和共同仓库扣料 ledger 返还或重放。',
    },
  }

  const route = useRoute()
  const cohabitationStore = useCohabitationStore()
  const activeTab = ref<CohabitationTabKey>('overview')
  const lastRefreshAttemptAt = ref(0)
  const warehouseActionMessage = ref('')
  const warehouseActionOk = ref(false)
  const warehouseDepositItemId = ref('rice')
  const warehouseDepositQuantity = ref(1)
  const warehouseGovernanceRecoverReason = ref('')
  const warehouseCompensationExecutionReceipt = ref('')
  const warehouseCompensationExecutionNote = ref('')
  const warehouseCompensationExecutionConfirmed = ref(false)
  const warehouseManualAppealResolutionAction = ref('manual_appeal_compensated')
  const warehouseManualAppealResolutionReceipt = ref('')
  const warehouseManualAppealResolutionNote = ref('')
  const warehouseManualAppealResolutionConfirmed = ref(false)
  const warehouseOperatorReceiptAuditAction = ref('operator_receipt_verified')
  const warehouseOperatorReceiptAuditReceipt = ref('')
  const warehouseOperatorReceiptAuditNote = ref('')
  const warehouseOperatorReceiptAuditConfirmed = ref(false)
  const sharedWorkshopActionMessage = ref('')
  const sharedWorkshopActionOk = ref(false)
  const selectedSharedWorkshopRecipeId = ref('shared_dried_cabbage')
  const sharedWorkshopAlchemyResultMode = ref<'fixed' | 'auto'>('fixed')
  const sharedWorkshopAlchemyHeatLevel = ref<SharedAlchemyHeatLevel>('balanced')
  const sharedWorkshopLastResultRows = ref<SharedWorkshopResultRow[]>([])
  const sharedFarmActionMessage = ref('')
  const sharedFarmActionOk = ref(false)
  const activeSharedMapRegionIndex = ref(0)
  const selectedSharedFarmPlotId = ref('')
  const sharedFarmSeedItemId = ref('seed_cabbage')
  const sharedAnimalActionMessage = ref('')
  const sharedAnimalActionOk = ref(false)
  const selectedSharedAnimalId = ref('')
  const selectedSharedAnimalBuyType = ref('chicken')
  const sharedAnimalBuyName = ref('')
  const sharedPetActionMessage = ref('')
  const sharedPetActionOk = ref(false)
  const selectedSharedPetId = ref('')
  const selectedSharedPetCareItemId = ref('vitality_feed')
  const sharedPetCareRiskAcknowledged = ref(false)
  const sharedPetCareConfirmationText = ref('')
  const fundActionMessage = ref('')
  const offlineQueueActionMessage = ref('')
  const offlineQueueActionOk = ref(false)
  const offlineQueueDraftOperations = ref<OfflineQueueDraftOperation[]>([])
  const dailySettleActionMessage = ref('')
  const dailySettleActionOk = ref(false)
  const selectedOfflineQueueActionId = ref<OfflineQueueUiActionId>('water_shared_farm')
  const offlineQueueRefundAcknowledged = ref(false)
  const fundActionOk = ref(false)
  const fundContributionAmount = ref(50)
  const fundLargeDraftPurpose = ref<FundLargeSpendPurpose>('family_building')
  const fundLargeDraftAmount = ref(1500)
  const fundLargeDraftTargetRef = ref('family_building:family_hall:build')
  const fundLargeDraftMemo = ref('')
  const selectedHighRiskReceiptDraftId = ref('')
  const fundHighRiskReceiptOutcome = ref<FundHighRiskReceiptOutcome>('delivered')
  const fundHighRiskReceiptRef = ref('')
  const fundHighRiskReceiptMemo = ref('')
  const fundHighRiskReceiptCompensationAcknowledged = ref(false)
  const familyOrderActionMessage = ref('')
  const familyOrderActionOk = ref(false)
  const familyReputationActionMessage = ref('')
  const familyReputationActionOk = ref(false)
  const familyBuildingActionMessage = ref('')
  const familyBuildingActionOk = ref(false)
  const familyVisibilityActionMessage = ref('')
  const familyVisibilityActionOk = ref(false)
  const familyFestivalSeatActionMessage = ref('')
  const familyFestivalSeatActionOk = ref(false)
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
  const separationSharedFundManualAllocation = ref<Record<string, number>>({})
  const separationStoryCinematicPlaybackActive = ref(false)
  const separationStoryCinematicPlaybackIndex = ref(0)
  const separationStoryCinematicPlaybackTimer = ref<ReturnType<typeof window.setTimeout> | null>(null)

  const tabs: CohabitationTabMeta[] = [
    { key: 'overview', label: '总览', summary: '切换已建立的共同庄园契约，查看成员、状态和资产边界。' },
    { key: 'map', label: '地图', summary: '只读展示成员农田横向拼接、来源归属和暂缓写操作。' },
    { key: 'warehouse', label: '仓库', summary: '查看共同仓库物品与来源流水，普通物品可按权限取出或卖入共同基金。' },
    { key: 'fund', label: '基金', summary: '查看共同基金余额、注资和权限支出流水，个人铜币保持独立。' },
    { key: 'permissions', label: '权限', summary: '查看和调整成员业务权限分组，确认安全阀仍由服务端强制开启。' },
    { key: 'orders', label: '订单', summary: '只读查看家族订单预备路线、成员阶段权限和共同资产结算边界。' },
    { key: 'reputation', label: '声望', summary: '只读查看家族声望预览分、来源证据和未来奖励治理边界。' },
    { key: 'buildings', label: '建筑', summary: '查看家族建筑蓝图、建筑流水，并按服务端规则提交真实落账、材料消耗和回滚补偿收口。' },
    { key: 'relations', label: '关系', summary: '只读查看契约成员、家族职位、共同能力节点和隐私边界。' },
    { key: 'visibility', label: '公开', summary: '只读查看关系图公开范围、可见数据类别、成员同意和隐私护栏。' },
    { key: 'festivalSeats', label: '节会', summary: '只读查看家族节会席位、候选模板、场景预排和结算护栏。' },
    { key: 'offline', label: '离线', summary: '查看成员最近活跃、共同日志和无需全员在线的能力边界。' },
  ]

  const cohabitationTabKeys = new Set<CohabitationTabKey>(tabs.map(tab => tab.key))

  const syncActiveTabFromRoute = () => {
    const tab = route.query.tab
    const candidate = Array.isArray(tab) ? tab[0] : tab
    if (candidate && cohabitationTabKeys.has(candidate as CohabitationTabKey)) {
      activeTab.value = candidate as CohabitationTabKey
    }
  }

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
  const separationSharedDecorationRemovalDisputes = computed<SeparationSharedDecorationRemovalDispute[]>(() => {
    const disputes = latestSeparationPreview.value?.asset_return?.shared_decoration_removal_disputes
    if (!Array.isArray(disputes)) return []
    return disputes.map((entry) => {
      const item = entry as Record<string, unknown>
      return {
        draft_id: String(item.draft_id ?? ''),
        target_ref: String(item.target_ref ?? ''),
        original_fund_ledger_id: String(item.original_fund_ledger_id ?? ''),
        amount: Math.max(0, Math.floor(Number(item.amount) || 0)),
        status: String(item.status ?? item.state ?? 'pending'),
      }
    }).filter(item => item.draft_id || item.target_ref || item.original_fund_ledger_id || item.amount > 0)
  })
  const separationSharedDecorationRemovalFreezeSummary = computed<SeparationSharedDecorationRemovalFreezeSummary>(() => {
    const summary = latestSeparationPreview.value?.asset_return?.shared_decoration_removal_freeze_summary as Record<string, unknown> | undefined
    const disputes = separationSharedDecorationRemovalDisputes.value
    const fallbackAmount = disputes.reduce((sum, dispute) => sum + dispute.amount, 0)
    return {
      pending_count: Math.max(0, Math.floor(Number(summary?.pending_count) || disputes.length)),
      total_amount: Math.max(0, Math.floor(Number(summary?.total_amount) || fallbackAmount)),
    }
  })
  const separationSharedDecorationRemovalFreezePolicy = computed<SeparationSharedDecorationRemovalFreezePolicy>(() => {
    const policy = latestSeparationPreview.value?.asset_return?.shared_decoration_removal_freeze_policy as Record<string, unknown> | undefined
    return {
      status: String(policy?.status ?? policy?.mode ?? '等待拆除完成或退款回执'),
    }
  })
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
  const separationSharedFundRows = computed<Array<Record<string, unknown>>>(() => {
    const rows = latestSeparationPreview.value?.asset_return?.fund_contributions_by_origin_owner
    return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : []
  })
  const separationSharedFundReadbackRows = computed<SeparationSharedFundReadbackRow[]>(() =>
    separationSharedFundRows.value.map((row, index) => {
      const operatingLedgerIds = Array.isArray(row.operating_ledger_ids) ? row.operating_ledger_ids : []
      const warehouseSaleLedgerIds = Array.isArray(row.warehouse_sale_ledger_ids) ? row.warehouse_sale_ledger_ids : []
      const owner = String(row.origin_owner_username ?? row.username ?? '')
      return {
        key: `${owner || 'member'}-${index}`,
        origin_owner_username: owner || '未知成员',
        capital_contribution_amount: Math.max(0, Math.floor(Number(row.capital_contribution_amount ?? row.amount) || 0)),
        operating_contribution_amount: Math.max(0, Math.floor(Number(row.operating_contribution_amount) || 0)),
        split_basis_amount: Math.max(0, Math.floor(Number(row.split_basis_amount ?? row.amount) || 0)),
        suggested_refund_amount: Math.max(0, Math.floor(Number(row.suggested_refund_amount) || 0)),
        fund_split_basis: String(row.fund_split_basis ?? 'capital_and_traceable_operating_income'),
        operating_ledger_count: operatingLedgerIds.length,
        warehouse_sale_ledger_count: warehouseSaleLedgerIds.length,
        requires_confirmation: row.requires_consumption_delta_confirmation === true,
        return_status: String(row.return_status ?? 'manual_personal_money_write_required'),
      }
    }).filter(row => row.suggested_refund_amount > 0 || row.capital_contribution_amount > 0 || row.operating_contribution_amount > 0)
  )
  const separationSharedFundDeltaConfirmationSummary = computed<Record<string, unknown>>(() => {
    const requestSummary = separationExecutionRequest.value?.shared_fund_delta_confirmation_summary
    if (requestSummary && typeof requestSummary === 'object' && !Array.isArray(requestSummary)) return requestSummary as Record<string, unknown>
    const assetSummary = latestSeparationPreview.value?.asset_return?.shared_fund_delta_confirmation_summary
    if (assetSummary && typeof assetSummary === 'object' && !Array.isArray(assetSummary)) return assetSummary as Record<string, unknown>
    return {}
  })
  const separationSharedFundReadbackSummary = computed<SeparationSharedFundReadbackSummary>(() => {
    const rows = separationSharedFundReadbackRows.value
    const summary = separationSharedFundDeltaConfirmationSummary.value
    const assetReturn = latestSeparationPreview.value?.asset_return as Record<string, unknown> | undefined
    const unidentifiedSummary = assetReturn?.fund_unidentified_operating_summary
    const unidentifiedOperatingSummary = unidentifiedSummary && typeof unidentifiedSummary === 'object' && !Array.isArray(unidentifiedSummary)
      ? unidentifiedSummary as Record<string, unknown>
      : {}
    const toUsernameList = (value: unknown) => Array.isArray(value)
      ? value.map(item => String(item || '').trim()).filter(Boolean)
      : []
    const toStringList = (value: unknown) => Array.isArray(value)
      ? value.map(item => String(item || '').trim()).filter(Boolean)
      : []
    const requiredMemberUsernames = toUsernameList(summary.required_member_usernames)
    const confirmedMemberUsernames = toUsernameList(summary.confirmed_member_usernames)
    const pendingMemberUsernames = toUsernameList(summary.pending_member_usernames)
    const rowsRequiringConfirmation = Math.max(0, Math.floor(Number(summary.rows_requiring_confirmation) || rows.filter(row => row.requires_confirmation).length))
    const unidentifiedOperatingTotal = Math.max(0, Math.floor(
      Number(summary.unidentified_operating_contribution_total)
      || Number(unidentifiedOperatingSummary.total_amount)
      || 0
    ))
    const unidentifiedOperatingRows = Math.max(0, Math.floor(
      Number(summary.unidentified_operating_contribution_rows)
      || Number(unidentifiedOperatingSummary.row_count)
      || Number(unidentifiedOperatingSummary.contribution_count)
      || 0
    ))
    const unidentifiedOperatingLedgerIds = toStringList(summary.unidentified_operating_ledger_ids).length
      ? toStringList(summary.unidentified_operating_ledger_ids)
      : toStringList(unidentifiedOperatingSummary.ledger_ids)
    const requiresUnidentifiedOperatingConfirmation =
      summary.requires_unidentified_operating_confirmation === true
      || unidentifiedOperatingSummary.requires_both_confirm === true
      || unidentifiedOperatingTotal > 0
    return {
      capital_total: Math.max(0, Math.floor(Number(latestSeparationPreview.value?.asset_return?.fund_total_contributed) || rows.reduce((sum, row) => sum + row.capital_contribution_amount, 0))),
      operating_total: Math.max(0, Math.floor(Number(latestSeparationPreview.value?.asset_return?.fund_total_operating_contributed) || rows.reduce((sum, row) => sum + row.operating_contribution_amount, 0))),
      split_basis_total: Math.max(0, Math.floor(Number(latestSeparationPreview.value?.asset_return?.fund_total_split_basis) || rows.reduce((sum, row) => sum + row.split_basis_amount, 0))),
      refund_total: Math.max(0, Math.floor(Number(summary.refund_total) || rows.reduce((sum, row) => sum + row.suggested_refund_amount, 0))),
      rows_requiring_confirmation: rowsRequiringConfirmation,
      requires_consumption_delta_confirmation: summary.requires_consumption_delta_confirmation === true || rowsRequiringConfirmation > 0,
      requires_unidentified_operating_confirmation: requiresUnidentifiedOperatingConfirmation,
      unidentified_operating_contribution_total: unidentifiedOperatingTotal,
      unidentified_operating_contribution_rows: unidentifiedOperatingRows,
      unidentified_operating_contribution_hash: String(
        summary.unidentified_operating_contribution_hash
        ?? assetReturn?.fund_unidentified_operating_contribution_hash
        ?? ''
      ),
      unidentified_operating_ledger_ids: unidentifiedOperatingLedgerIds,
      manual_unidentified_operating_allocation_total: Math.max(0, Math.floor(Number(summary.manual_unidentified_operating_allocation_total) || 0)),
      manual_unidentified_operating_allocation_hash: String(summary.manual_unidentified_operating_allocation_hash ?? ''),
      manual_unidentified_operating_allocation_applied: summary.manual_unidentified_operating_allocation_applied === true,
      required_member_usernames: requiredMemberUsernames,
      confirmed_member_usernames: confirmedMemberUsernames,
      pending_member_usernames: pendingMemberUsernames,
      all_members_confirmed: summary.all_members_confirmed === true || (requiredMemberUsernames.length > 0 && pendingMemberUsernames.length === 0),
      fund_split_basis: String(summary.fund_split_basis ?? rows[0]?.fund_split_basis ?? 'capital_and_traceable_operating_income'),
    }
  })
  const separationSharedFundManualAllocationMembers = computed<SeparationSharedFundManualAllocationMember[]>(() => {
    const rows = separationSharedFundReadbackRows.value
    const rowByUsername = new globalThis.Map(rows.map(row => [normalizeActorKey(row.origin_owner_username), row]))
    const members = selectedContract.value?.members ?? []
    const acceptedMemberRows = members
      .filter(member => member.status === 'accepted')
      .map(member => {
        const username = String(member.username || '').trim()
        const usernameKey = normalizeActorKey(member.username_key || username)
        const fundRow = rowByUsername.get(normalizeActorKey(username))
        return {
          username,
          username_key: usernameKey,
          split_basis_amount: Math.max(1, fundRow?.split_basis_amount ?? 1),
        }
      })
      .filter(member => member.username)
    if (acceptedMemberRows.length > 0) return acceptedMemberRows
    return rows.map(row => ({
      username: row.origin_owner_username,
      username_key: normalizeActorKey(row.origin_owner_username),
      split_basis_amount: Math.max(1, row.split_basis_amount),
    }))
  })
  const separationSharedFundManualAllocationTotal = computed(() =>
    separationSharedFundManualAllocationMembers.value.reduce((sum, member) => {
      const amount = Math.max(0, Math.floor(Number(separationSharedFundManualAllocation.value[member.username_key]) || 0))
      return sum + amount
    }, 0)
  )
  const separationSharedFundManualAllocationBalanced = computed(() => {
    const expected = separationSharedFundReadbackSummary.value.unidentified_operating_contribution_total
    return expected <= 0 || separationSharedFundManualAllocationTotal.value === expected
  })
  const seedSeparationSharedFundManualAllocation = () => {
    const expected = separationSharedFundReadbackSummary.value.unidentified_operating_contribution_total
    const members = separationSharedFundManualAllocationMembers.value
    if (expected <= 0 || members.length === 0) return
    if (members.some(member => Number(separationSharedFundManualAllocation.value[member.username_key]) > 0)) return
    const totalBasis = members.reduce((sum, member) => sum + member.split_basis_amount, 0)
    let allocated = 0
    const next: Record<string, number> = {}
    members.forEach((member, index) => {
      const amount = index === members.length - 1
        ? Math.max(0, expected - allocated)
        : Math.floor((expected * member.split_basis_amount) / Math.max(1, totalBasis))
      allocated += amount
      next[member.username_key] = amount
    })
    separationSharedFundManualAllocation.value = next
  }
  watch(
    () => [
      latestSeparationPreview.value?.id || '',
      separationSharedFundReadbackSummary.value.unidentified_operating_contribution_total,
      separationSharedFundManualAllocationMembers.value.map(member => member.username_key).join('|'),
    ],
    () => seedSeparationSharedFundManualAllocation(),
    { immediate: true }
  )
  const separationSharedFundDeltaRequiresConfirmation = computed(() =>
    separationSharedFundReadbackSummary.value.requires_consumption_delta_confirmation
    || separationSharedFundReadbackSummary.value.requires_unidentified_operating_confirmation
  )
  const separationSharedFundDeltaConfirmed = computed(() => {
    if (!separationSharedFundDeltaRequiresConfirmation.value) return true
    const request = separationExecutionRequest.value
    return request?.shared_fund_delta_confirmed === true || request?.status === 'shared_fund_delta_confirmed'
  })
  const separationStoryCinematicResolution = computed<Record<string, unknown> | null>(() => {
    const resolution = separationExecutionRequest.value?.family_story_resolution
    if (!resolution || typeof resolution !== 'object' || Array.isArray(resolution)) return null
    return resolution as Record<string, unknown>
  })
  const separationStoryCinematicBoundaryLabel = computed(() => {
    const resolution = separationStoryCinematicResolution.value
    if (!resolution) return '待记录'
    const cinematic = resolution.frontend_cinematic_pending === true ? '演出待播放' : '演出无需播放'
    const personalState = resolution.personal_state_mutated === true ? '个人主状态已变更' : '个人主状态未变更'
    const contractOnly = resolution.contract_record_only !== false ? '契约只读记录' : '允许后续写主态'
    return `${cinematic} · ${personalState} · ${contractOnly}`
  })
  const toSeparationStoryObjects = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map(item => item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : null)
          .filter((item): item is Record<string, unknown> => item !== null)
      : []
  const compactSeparationStoryText = (value: unknown) => String(value ?? '').trim()
  const separationStoryCinematicPlaybackSteps = computed<SeparationStoryCinematicPlaybackStep[]>(() => {
    const resolution = separationStoryCinematicResolution.value
    if (!resolution) return []
    const steps: SeparationStoryCinematicPlaybackStep[] = []
    const stageDirection = compactSeparationStoryText(resolution.cinematic_stage_direction)
    if (stageDirection) {
      steps.push({
        key: 'stage_direction',
        kind: 'stage',
        label: '场景调度',
        short_label: '场景',
        detail: stageDirection,
        duration_ms: 1200,
      })
    }
    toSeparationStoryObjects(resolution.dialogue_lines).forEach((line, index) => {
      const text = compactSeparationStoryText(line.text)
      if (!text) return
      const speaker = compactSeparationStoryText(line.speaker_label || line.speaker_role) || `角色${index + 1}`
      const beat = compactSeparationStoryText(line.beat)
      steps.push({
        key: `dialogue_${compactSeparationStoryText(line.line_id) || index}`,
        kind: 'dialogue',
        label: `${speaker}${beat ? ` · ${beat}` : ''}`,
        short_label: `台词${index + 1}`,
        detail: text,
        duration_ms: 1500,
      })
    })
    toSeparationStoryObjects(resolution.animation_cues).forEach((cue, index) => {
      const action = compactSeparationStoryText(cue.action)
      if (!action) return
      const stage = compactSeparationStoryText(cue.stage) || '场景'
      const timing = compactSeparationStoryText(cue.timing)
      steps.push({
        key: `cue_${compactSeparationStoryText(cue.cue_id) || index}`,
        kind: 'animation',
        label: `${stage}${timing ? ` · ${timing}` : ''}`,
        short_label: `Cue${index + 1}`,
        detail: action,
        duration_ms: Math.min(2400, Math.max(700, Math.floor(Number(cue.duration_ms) || 1200))),
      })
    })
    return steps.slice(0, 18)
  })
  const separationStoryCinematicPlaybackActiveStep = computed<SeparationStoryCinematicPlaybackStep>(() =>
    separationStoryCinematicPlaybackSteps.value[separationStoryCinematicPlaybackIndex.value]
    || separationStoryCinematicPlaybackSteps.value[0]
    || {
      key: 'pending',
      kind: 'stage',
      label: '待播放',
      short_label: '待播放',
      detail: '等待剧情记录生成演出时间线。',
      duration_ms: 900,
    }
  )
  const separationStoryCinematicPlaybackStepLabel = computed(() => {
    const total = separationStoryCinematicPlaybackSteps.value.length
    if (total <= 0) return '0 / 0'
    return `${Math.min(separationStoryCinematicPlaybackIndex.value + 1, total)} / ${total}`
  })
  onBeforeUnmount(() => {
    if (separationStoryCinematicPlaybackTimer.value !== null) {
      window.clearTimeout(separationStoryCinematicPlaybackTimer.value)
    }
  })
  const separationStoryCinematicReadbackRows = computed<SeparationStoryCinematicReadbackRow[]>(() => {
    const resolution = separationStoryCinematicResolution.value
    if (!resolution) return []
    return [
      { key: 'story_event_kind', label: '剧情类型', value: separationStoryValueLabel(resolution.story_event_kind) },
      { key: 'relationship_story_rule', label: '剧情规则', value: separationStoryValueLabel(resolution.relationship_story_rule) },
      { key: 'dialogue_event_id', label: '对话事件', value: separationStoryValueLabel(resolution.dialogue_event_id) },
      { key: 'animation_event_id', label: '搬离 / 交接演出', value: separationStoryValueLabel(resolution.animation_event_id) },
      { key: 'dialogue_lines', label: '专属台词', value: separationStoryDialogueLinesLabel(resolution.dialogue_lines) },
      { key: 'animation_cues', label: '演出 Cue', value: separationStoryAnimationCuesLabel(resolution.animation_cues) },
      { key: 'cinematic_stage_direction', label: '场景调度', value: separationStoryValueLabel(resolution.cinematic_stage_direction) },
      { key: 'exit_record_kind', label: '退出记录', value: separationStoryValueLabel(resolution.exit_record_kind) },
      { key: 'family_fund_settlement_state', label: '共同基金结算', value: separationStoryValueLabel(resolution.family_fund_settlement_state) },
      { key: 'frontend_cinematic_pending', label: '前端演出', value: separationStoryFlagLabel(resolution.frontend_cinematic_pending, '待播放', '无需播放') },
      { key: 'frontend_cinematic_played', label: '演出回执', value: separationStoryFlagLabel(resolution.frontend_cinematic_played, '已播放', '未播放') },
      { key: 'frontend_cinematic_played_at', label: '播放时间', value: Number(resolution.frontend_cinematic_played_at) > 0 ? formatTime(Number(resolution.frontend_cinematic_played_at)) : '未记录' },
      { key: 'frontend_cinematic_played_by', label: '播放记录人', value: separationStoryValueLabel(resolution.frontend_cinematic_played_by, '未记录') },
      { key: 'personal_state_mutated', label: '个人主状态', value: separationStoryFlagLabel(resolution.personal_state_mutated, '已变更', '未变更') },
      { key: 'meeting_record_required', label: '家族会议', value: separationStoryFlagLabel(resolution.meeting_record_required, '需要', '不需要') },
      { key: 'handover_record_required', label: '交接记录', value: separationStoryFlagLabel(resolution.handover_record_required, '需要', '不需要') },
      { key: 'future_cooperation_option', label: '未来合作', value: separationStoryFlagLabel(resolution.future_cooperation_option, '保留选项', '无') },
    ]
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
    if (separationExecutionRequest.value?.status === 'shared_fund_delta_confirmed') return '共同基金消费差额双方已确认，等待共同基金返还。'
    if (separationExecutionRequest.value?.status === 'shared_fund_delta_confirmation_pending') return '共同基金消费差额已记录部分确认，等待双方确认。'
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
  const canConfirmSeparationSharedFundDelta = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    if (!separationSharedFundDeltaRequiresConfirmation.value || separationSharedFundDeltaConfirmed.value) return false
    if (!['personal_save_written', 'shared_fund_delta_confirmation_pending'].includes(String(separationExecutionRequest.value?.status || ''))) return false
    if (!separationExecutionRequest.value?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
    return true
  })
  const canRefundSeparationSharedFund = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    const expectedStatus = separationSharedFundDeltaRequiresConfirmation.value ? 'shared_fund_delta_confirmed' : 'personal_save_written'
    if (separationExecutionRequest.value?.status !== expectedStatus) return false
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
  const canRecordSeparationStoryCinematicPlayback = computed(() => {
    const preview = latestSeparationPreview.value
    if (!preview || !selectedContract.value || !cohabitationStore.canOpenSelectedContract) return false
    if (!['active', 'separation_pending'].includes(String(selectedContract.value.status))) return false
    if (preview.state !== 'confirmed') return false
    if (preview.confirmation_state?.all_members_confirmed !== true) return false
    const request = separationExecutionRequest.value
    const requestStatus = String(request?.status || '')
    if (!['family_story_resolved', 'personal_story_receipts_written', 'child_arrangement_resolved', 'personal_family_receipts_written'].includes(requestStatus)) return false
    const resolution = separationStoryCinematicResolution.value
    if (!resolution || resolution.frontend_cinematic_played === true) return false
    if (resolution.frontend_cinematic_pending !== true && !resolution.dialogue_event_id && !resolution.animation_event_id) return false
    if (!request?.execution_ledger_id || !separationPlotReturnManifestHash.value) return false
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
  const activeSharedMapRegion = computed(() => {
    const regions = mapRegions.value
    if (!regions.length) return null
    return regions.find(region => region.region_index === activeSharedMapRegionIndex.value) ?? regions[0] ?? null
  })
  const plotMatchesSharedMapRegion = (plot: CohabitationSharedPlot, region: CohabitationSharedRegion) => {
    if (plot.origin_owner_id === region.origin_owner_id) return true
    if (plot.origin_owner_username === region.member_username) return true
    if (plot.origin_owner_key === region.member_username_key) return true
    const plotX = Number(plot.x)
    const plotY = Number(plot.y)
    return Number.isFinite(plotX) &&
      Number.isFinite(plotY) &&
      plotX >= region.x &&
      plotX < region.x + region.width &&
      plotY >= region.y &&
      plotY < region.y + region.height
  }
  const pagedSharedFarmPlots = computed(() => {
    const plots = cohabitationStore.sharedMap?.plots ?? []
    const region = activeSharedMapRegion.value
    if (!region) return plots
    return plots.filter(plot => plotMatchesSharedMapRegion(plot, region))
  })
  const stitchedMapGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${Math.max(1, cohabitationStore.sharedMap?.layout.columns || activeSharedMapRegion.value?.width || pagedSharedFarmPlots.value.length || 1)}, minmax(2.25rem, 1fr))`,
  }))
  const stitchedSharedFarmCells = computed<StitchedSharedFarmCell[]>(() => {
    const sharedMap = cohabitationStore.sharedMap
    const plots = sharedMap?.plots ?? []
    if (!sharedMap) return []
    const columns = Math.max(1, Number(sharedMap.layout?.columns) || activeSharedMapRegion.value?.width || plots.length || 1)
    const rows = Math.max(1, Number(sharedMap.layout?.rows) || Math.ceil(Math.max(plots.length, 1) / columns))
    const plotByPosition = new globalThis.Map<string, CohabitationSharedPlot>()
    plots.forEach(plot => {
      const x = Number(plot.x)
      const y = Number(plot.y)
      if (Number.isFinite(x) && Number.isFinite(y)) plotByPosition.set(`${x}:${y}`, plot)
    })
    const cells: StitchedSharedFarmCell[] = []
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const plot = plotByPosition.get(`${x}:${y}`) ?? null
        const region = plot
          ? mapRegions.value.find(item => plotMatchesSharedMapRegion(plot, item)) ?? null
          : mapRegions.value.find(item => x >= item.x && x < item.x + item.width && y >= item.y && y < item.y + item.height) ?? null
        cells.push({
          key: `${x}:${y}`,
          plot,
          regionIndex: region?.region_index ?? null,
        })
      }
    }
    return cells
  })
  const mapRevisionLabel = computed(() => {
    if (!cohabitationStore.sharedMap) return '暂无地图'
    return `版本 ${cohabitationStore.sharedMap.revision}`
  })
  const selectedSharedFarmPlot = computed(() => {
    const plots = cohabitationStore.sharedMap?.plots ?? []
    if (!plots.length) return null
    if (!selectedSharedFarmPlotId.value) return null
    return plots.find(plot => plot.id === selectedSharedFarmPlotId.value) ?? null
  })
  const sharedAnimals = computed(() => cohabitationStore.sharedAnimals?.animals ?? [])
  const selectedSharedAnimal = computed(() => {
    if (!sharedAnimals.value.length || !selectedSharedAnimalId.value) return null
    return sharedAnimals.value.find(animal => animal.id === selectedSharedAnimalId.value) ?? null
  })
  const fallbackSharedAnimalPurchaseOptions: SharedAnimalPurchaseOption[] = [
    { type: 'chicken', label: '鸡', unitPrice: 800 },
    { type: 'cow', label: '牛', unitPrice: 1500 },
    { type: 'sheep', label: '羊', unitPrice: 8000 },
  ]
  const sharedAnimalPurchaseOptions = computed<SharedAnimalPurchaseOption[]>(() => {
    const supported = cohabitationStore.sharedAnimals?.summary.supported_purchase_animal_types
    const types = Array.isArray(supported) && supported.length ? supported : fallbackSharedAnimalPurchaseOptions.map(option => option.type)
    return types.map(type => fallbackSharedAnimalPurchaseOptions.find(option => option.type === type) ?? {
      type,
      label: type,
      unitPrice: 0,
    })
  })
  const selectedSharedAnimalBuyOption = computed(() =>
    sharedAnimalPurchaseOptions.value.find(option => option.type === selectedSharedAnimalBuyType.value) ?? sharedAnimalPurchaseOptions.value[0] ?? null
  )
  const sharedPets = computed(() => cohabitationStore.sharedPets?.pets ?? [])
  const selectedSharedPet = computed(() => {
    if (!sharedPets.value.length || !selectedSharedPetId.value) return null
    return sharedPets.value.find(pet => pet.id === selectedSharedPetId.value) ?? null
  })
  const sharedPetCareItemQuantity = (itemId: string) => (cohabitationStore.warehouse?.items ?? [])
    .filter(item => item.item_id === itemId)
    .reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.quantity) || 0)), 0)
  const sharedPetCareOptions = computed(() => {
    const supported = cohabitationStore.sharedPets?.summary.supported_care_item_ids
    const itemIds = Array.isArray(supported) && supported.length
      ? supported
      : ['vitality_feed']
    return Array.from(new Set(itemIds))
      .map(itemId => {
        const info = sharedPetCareItemCatalog[itemId] ?? {
          itemId,
          label: itemId,
          effect: '照料',
          friendshipGain: 0,
          moodGain: 0,
        }
        return {
          ...info,
          quantity: sharedPetCareItemQuantity(itemId),
        }
      })
  })
  const selectedSharedPetCareItem = computed(() =>
    sharedPetCareOptions.value.find(item => item.itemId === selectedSharedPetCareItemId.value) ??
    sharedPetCareOptions.value[0] ??
    null
  )
  const selectedSharedPetCareRequiresConfirmation = computed(() => selectedSharedPetCareItem.value?.requiresConfirmation === true)
  const sharedPetCareConfirmationPhrase = computed(() =>
    selectedSharedPetCareItem.value?.confirmationPhrase || '确认消耗共同宠物高阶点心'
  )
  const sharedPetCareRiskConfirmed = computed(() =>
    !selectedSharedPetCareRequiresConfirmation.value ||
    (sharedPetCareRiskAcknowledged.value && sharedPetCareConfirmationText.value.trim() === sharedPetCareConfirmationPhrase.value)
  )
  const sharedPetCoopBonusLabel = (pet: CohabitationSharedPet | null | undefined) => {
    const bonus = Math.max(0, Math.floor(Number(pet?.pet_state?.cooperation_mood_bonus) || 0))
    const members = Array.isArray(pet?.pet_state?.last_cooperation_bonus_members)
      ? pet.pet_state.last_cooperation_bonus_members.filter(Boolean)
      : []
    if (bonus <= 0) return '暂无'
    return members.length ? `心情 +${bonus} · ${members.join(' / ')}` : `心情 +${bonus}`
  }
  const getSharedAnimalProductInfo = (animal: CohabitationSharedAnimal | null | undefined) => {
    if (!animal) return null
    return sharedAnimalProductCatalog[animal.type || animal.animal_state.type || ''] ?? null
  }
  const isSharedAnimalProductReady = (animal: CohabitationSharedAnimal | null | undefined) => {
    const info = getSharedAnimalProductInfo(animal)
    if (!animal || !info) return false
    return animal.animal_state.was_fed === true &&
      animal.animal_state.sick !== true &&
      Math.max(0, Math.floor(Number(animal.animal_state.days_since_product) || 0)) >= info.produceDays
  }
  const sharedAnimalProductStatus = (animal: CohabitationSharedAnimal | null | undefined) => {
    const info = getSharedAnimalProductInfo(animal)
    if (!animal || !info) return '无产物'
    const days = Math.max(0, Math.floor(Number(animal.animal_state.days_since_product) || 0))
    return isSharedAnimalProductReady(animal)
      ? `${info.productId} 可收`
      : `${info.productId} ${days}/${info.produceDays}天`
  }
  const sharedFarmCoopBonusLabel = (plot: CohabitationSharedPlot | null | undefined) => {
    const state = plot?.plot_state
    if (!state) return '同时在线加成：未触发'
    const health = Math.max(0, Math.floor(Number(state.cooperation_health_bonus) || 0))
    const quality = Math.max(0, Math.floor(Number(state.cooperation_quality_bonus) || 0))
    const consumedHealth = Math.max(0, Math.floor(Number(state.last_cooperation_health_bonus_consumed_value) || 0))
    const consumedQuality = Math.max(0, Math.floor(Number(state.last_cooperation_quality_bonus_consumed_value) || 0))
    const fertilizerQuality = state.fertilizer === 'quality_fertilizer' ? 1 : 0
    const fertilizerGrowth = state.fertilizer === 'deluxe_speed_gro' ? 2 : state.fertilizer === 'speed_gro' ? 1 : 0
    const fertilizerRetention = state.fertilizer === 'quality_retaining_soil' ? 1 : 0
    const consumedFertilizerQuality = Math.max(0, Math.floor(Number(state.last_fertilizer_quality_bonus_consumed_value) || 0))
    const consumedFertilizerGrowth = Math.max(0, Math.floor(Number(state.last_fertilizer_growth_bonus_consumed_value) || 0))
    const consumedFertilizerRetention = Math.max(0, Math.floor(Number(state.last_fertilizer_water_retention_value) || 0))
    const members = Array.isArray(state.last_cooperation_bonus_members) ? state.last_cooperation_bonus_members.filter(Boolean) : []
    const active = [health > 0 ? `健康 +${health}` : '', quality > 0 ? `品质 +${quality}` : ''].filter(Boolean).join(' / ')
    const fertilizerActive = [
      fertilizerQuality > 0 ? `肥料品质 +${fertilizerQuality}` : '',
      fertilizerGrowth > 0 ? `肥料成长 +${fertilizerGrowth}` : '',
      fertilizerRetention > 0 ? '肥料保水' : '',
    ].filter(Boolean).join(' / ')
    const consumedCooperation = [
      consumedHealth > 0 ? `已消耗健康 ${consumedHealth}` : '',
      consumedQuality > 0 ? `已消耗品质 ${consumedQuality}` : '',
    ].filter(Boolean).join(' / ')
    const consumedFertilizer = [
      consumedFertilizerQuality > 0 ? `已消耗肥料品质 ${consumedFertilizerQuality}` : '',
      consumedFertilizerGrowth > 0 ? `已消耗肥料成长 ${consumedFertilizerGrowth}` : '',
      consumedFertilizerRetention > 0 ? `已触发肥料保水 ${consumedFertilizerRetention}` : '',
    ].filter(Boolean).join(' / ')
    const consumed = [consumedCooperation, consumedFertilizer].filter(Boolean).join(' / ')
    const suffix = members.length ? ` · ${members.join(' / ')}` : ''
    if (active) return `同时在线加成：${[active, fertilizerActive].filter(Boolean).join(' / ')}${suffix}`
    if (fertilizerActive) return `肥料加成：${fertilizerActive}`
    if (consumed) return `${consumedCooperation ? '同时在线加成' : '肥料加成'}：${consumed}`
    return '同时在线加成：未触发'
  }
  const sharedAnimalCoopBonusLabel = (animal: CohabitationSharedAnimal | null | undefined) => {
    const state = animal?.animal_state
    if (!state) return '同时在线加成：未触发'
    const mood = Math.max(0, Math.floor(Number(state.cooperation_mood_bonus) || 0))
    const consumedMood = Math.max(0, Math.floor(Number(state.last_cooperation_mood_bonus_consumed_value) || 0))
    const progress = Math.max(0, Math.floor(Number(state.last_cooperation_mood_product_progress_bonus_days) || 0))
    const members = Array.isArray(state.last_cooperation_bonus_members) ? state.last_cooperation_bonus_members.filter(Boolean) : []
    const suffix = members.length ? ` · ${members.join(' / ')}` : ''
    if (mood > 0) return `同时在线加成：心情 +${mood}${suffix}`
    if (consumedMood > 0) return `同时在线加成：已消耗心情 ${consumedMood}${progress > 0 ? `，产物进度 +${progress}` : ''}`
    return '同时在线加成：未触发'
  }
  const warehouseItems = computed(() => cohabitationStore.warehouse?.items ?? [])
  const warehouseFrozenQuantity = (item: CohabitationWarehouseItem) => Math.max(0, Math.floor(Number(item.frozen_quantity) || 0))
  const warehouseAvailableQuantity = (item: CohabitationWarehouseItem) => {
    const total = Math.max(0, Math.floor(Number(item.quantity) || 0))
    if (typeof item.available_quantity === 'number') return Math.max(0, Math.min(total, Math.floor(item.available_quantity)))
    return Math.max(0, total - warehouseFrozenQuantity(item))
  }

  const warehouseLedger = computed(() => cohabitationStore.warehouse?.ledger ?? [])
  const warehouseHighValueWithdrawalDrafts = computed(() => cohabitationStore.warehouse?.high_value_withdrawal_drafts ?? [])
  const warehouseCompensationAuditBundle = computed<CohabitationWarehouseCompensationAuditBundle | null>(() => cohabitationStore.warehouseCompensationAuditBundle)
  const warehouseCompensationAuditBundleRows = computed(() => {
    const bundle = warehouseCompensationAuditBundle.value
    if (!bundle) return []
    return [
      { label: '取出流水', value: bundle.ledger_evidence.withdraw_ledger_count },
      { label: '来源流水', value: bundle.ledger_evidence.source_ledger_count },
      { label: '复核审计', value: bundle.review_audits.length },
      { label: '预检审计', value: bundle.preflight_audits.length },
      { label: '执行审计', value: bundle.execution_audits.length },
      { label: '回执复核', value: bundle.operator_receipt_audit_reviews?.length ?? 0 },
      { label: '回滚审计', value: bundle.rollback_audits?.length ?? 0 },
    ]
  })
  const warehouseCompensationAuditAssetRows = computed(() => {
    const boundary = warehouseCompensationAuditBundle.value?.asset_boundary
    if (!boundary) return []
    return [
      { label: '个人铜币合并', value: boundary.personal_money_merged ? '是' : '否' },
      { label: '个人存档', value: boundary.personal_save_changed ? '已变更' : '不变' },
      { label: '共同仓库', value: boundary.shared_warehouse_changed ? '已变更' : '不变' },
      { label: '自动补偿', value: boundary.auto_compensation_enabled ? '开启' : '关闭' },
      { label: '个人背包写入', value: boundary.personal_inventory_mutation_enabled ? '开启' : '关闭' },
    ]
  })
  const warehouseCompensationAuditMissingEvidenceLabel = computed(() => warehouseCompensationAuditBundle.value?.appeal_packet.missing_evidence.length ? warehouseCompensationAuditBundle.value.appeal_packet.missing_evidence.join(' / ') : '无')
  const auditValueLabel = (value: unknown, fallback = '?') => {
    if (typeof value === 'string') return value.trim() || fallback
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'boolean') return value ? '是' : '否'
    return fallback
  }
  const warehouseCompensationAuditActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      warehouse_high_value_withdrawal_draft_created: '高价值草案创建',
      warehouse_high_value_withdrawal_draft_confirmed: '高价值草案确认',
      warehouse_high_value_withdrawal_executed: '高价值取出执行',
      warehouse_high_value_withdrawal_compensation_review_requested: '补偿复核申请',
      warehouse_high_value_withdrawal_compensation_review_resolved: '补偿复核处理',
      warehouse_high_value_withdrawal_compensation_preflight_recorded: '补偿预检记录',
      warehouse_high_value_withdrawal_compensation_execution_recorded: '人工补偿回执',
      warehouse_high_value_withdrawal_manual_appeal_resolution_recorded: '人工申诉恢复',
      warehouse_high_value_withdrawal_operator_receipt_audit_reviewed: '回执审计复核',
      warehouse_high_value_withdrawal_rolled_back: '高价值草案回滚',
    }
    return labels[action] || action
  }
  const warehouseOperatorReceiptAuditActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      operator_receipt_verified: '回执已核验',
      operator_receipt_disputed: '回执存在争议',
      audit_only: '仅审计归档',
    }
    return labels[action] || action
  }
  const warehouseManualAppealResolutionActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      manual_appeal_restored: '人工恢复已处理',
      manual_appeal_compensated: '人工补偿已处理',
      manual_appeal_denied: '申诉驳回',
      audit_only: '仅审计归档',
    }
    return labels[action] || action
  }
  const warehouseCompensationAuditAppealActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      operator_receipt_audit_review: '回执审计复核',
      manual_appeal_resolution: '人工申诉处理',
    }
    return labels[action] || action
  }
  const warehouseCompensationAuditTargetRows = computed(() => {
    const target: Record<string, unknown> = warehouseCompensationAuditBundle.value?.target_save ?? {}
    return [
      { label: '目标玩家', value: auditValueLabel(target['target_username']) },
      { label: '目标存档', value: `${auditValueLabel(target['target_save_id'])} / 槽 ${auditValueLabel(target['target_save_slot'])}` },
      { label: '存档可读', value: auditValueLabel(target['save_available'], '未知') },
      { label: '目标物数量', value: auditValueLabel(target['target_item_quantity'], '0') },
      { label: '槽位证据', value: auditValueLabel(target['target_item_slot_evidence_present'], '未知') },
      { label: '槽位数量匹配', value: auditValueLabel(target['target_slot_quantity_matches'], '未知') },
      { label: '个人铜币快照', value: `${auditValueLabel(target['personal_money_snapshot'], '0')} 铜币` },
      { label: '不可读原因', value: auditValueLabel(target['unavailable_reason'], '无') },
    ]
  })
  const warehouseCompensationAuditTargetSlotRows = computed(() => {
    const target: Record<string, unknown> = warehouseCompensationAuditBundle.value?.target_save ?? {}
    const slots = Array.isArray(target['target_slot_evidence']) ? target['target_slot_evidence'] : []
    return slots.map((slot, index) => {
      const row = slot && typeof slot === 'object' ? slot as Record<string, unknown> : {}
      const bag = auditValueLabel(row['bag'], 'inventory.items')
      const slotIndex = auditValueLabel(row['index'], String(index))
      const matches = row['matches_item'] === true ? '匹配' : '不匹配'
      return {
        id: `${bag}:${slotIndex}:${index}`,
        label: `${bag} #${slotIndex}`,
        value: `${auditValueLabel(row['item_id'])} ${auditValueLabel(row['quality'], 'normal')} x${auditValueLabel(row['quantity'], '0')} / ${matches}`,
      }
    }).slice(0, 6)
  })
  const warehouseCompensationAuditLedgerRows = computed(() => {
    const evidence = warehouseCompensationAuditBundle.value?.ledger_evidence
    if (!evidence) return []
    return [
      ...evidence.withdraw_ledger_entries.map(entry => ({
        id: `withdraw:${entry.id}`,
        label: `取出 ledger ${entry.id}`,
        value: `${entry.item_id} ${entry.quality || 'normal'} x${entry.quantity} / ${entry.actor_display_name || entry.actor_username || '未知'} / ${formatTime(entry.created_at)}`,
      })),
      ...evidence.source_ledger_entries.map(entry => ({
        id: `source:${entry.id}`,
        label: `来源 ledger ${entry.id}`,
        value: `${entry.item_id} ${entry.quality || 'normal'} x${entry.quantity} / ${entry.actor_display_name || entry.actor_username || '未知'} / ${formatTime(entry.created_at)}`,
      })),
    ].slice(0, 8)
  })
  const warehouseCompensationAuditTimelineRows = computed(() => {
    const timeline = warehouseCompensationAuditBundle.value?.audit_timeline ?? []
    return timeline.map(entry => ({
      id: entry.id || `${entry.action}:${entry.at}`,
      label: warehouseCompensationAuditActionLabel(entry.action),
      value: `${entry.actor_display_name || entry.actor_username || '未知'} / ${formatTime(entry.at)} / ${entry.idempotency_key || '无幂等键'}`,
    })).slice(0, 8)
  })
  const warehouseCompensationRollbackAuditRows = computed(() => {
    const audit = warehouseCompensationAuditBundle.value?.rollback_audits?.[0]
    const detail = audit?.detail && typeof audit.detail === 'object' ? audit.detail as Record<string, unknown> : {}
    const draft = warehouseCompensationAuditDraft.value
    const state = String(draft['state'] || '')
    if (state !== 'rolled_back' && !audit) return []
    const frozenAt = Number(draft['frozen_at'] || 0)
    const rolledBackAt = Number(draft['rolled_back_at'] || audit?.at || 0)
    const releaseLabel = draft['freeze_release_available'] === true ? '仍可释放' : '已释放 / 不可继续释放'
    const sharedWarehouseChanged = detail['shared_warehouse_changed'] === true ? '已变更' : '不变'
    const personalSaveChanged = detail['personal_save_changed'] === true ? '已变更' : '不变'
    const rows = [
      { label: '冻结数量', value: auditValueLabel(draft['frozen_quantity'], '0') },
      { label: '冻结时间', value: frozenAt > 0 ? formatTime(frozenAt) : '未记录' },
      { label: '释放状态', value: releaseLabel },
      { label: '回滚幂等键', value: auditValueLabel(draft['rollback_idempotency_key'] || audit?.idempotency_key, '无幂等键') },
      { label: '回滚原因', value: auditValueLabel(draft['rollback_reason'] || detail['reason'], '未记录') },
      { label: '回滚人', value: auditValueLabel(draft['rolled_back_by_username'] || audit?.actor_display_name || audit?.actor_username, '未知') },
      { label: '回滚时间', value: rolledBackAt > 0 ? formatTime(rolledBackAt) : '未记录' },
      { label: '释放冻结', value: auditValueLabel(detail['released_frozen_quantity'], '0') },
      { label: '资产边界', value: `共同仓库${sharedWarehouseChanged} / 个人存档${personalSaveChanged}` },
    ]
    return rows.filter(row => row.value !== '')
  })
  const warehouseCompensationAuditAppealActionRows = computed(() => (warehouseCompensationAuditBundle.value?.appeal_packet.next_supported_actions ?? [])
    .map(action => ({ id: action, label: warehouseCompensationAuditAppealActionLabel(action) })))
  const warehouseOperatorReceiptAuditEvidenceRows = computed(() => {
    const audit = warehouseCompensationAuditBundle.value?.operator_receipt_audit_reviews?.[0]
    const detail = audit?.detail && typeof audit.detail === 'object' ? audit.detail as Record<string, unknown> : {}
    const draft = warehouseCompensationAuditDraft.value
    const status = String(draft['compensation_operator_receipt_audit_status'] || '')
    if (status !== 'recorded' && !audit) return []
    const recordedAt = Number(draft['compensation_operator_receipt_audit_recorded_at'] || audit?.at || 0)
    const action = String(draft['compensation_operator_receipt_audit_action'] || detail['audit_action'] || '')
    const rows = [
      { label: '复核结论', value: warehouseOperatorReceiptAuditActionLabel(action || 'audit_only') },
      { label: '复核回执', value: auditValueLabel(draft['compensation_operator_receipt_audit_receipt'] || detail['audit_receipt'], '未记录') },
      { label: '复核说明', value: auditValueLabel(draft['compensation_operator_receipt_audit_note'] || detail['audit_note'], '未记录') },
      { label: '执行审计', value: auditValueLabel(draft['compensation_operator_receipt_audit_execution_audit_id'] || detail['execution_audit_id'], '未引用') },
      { label: '执行幂等键', value: auditValueLabel(draft['compensation_operator_receipt_audit_execution_idempotency_key'] || detail['execution_idempotency_key'], '未引用') },
      { label: '申诉审计', value: auditValueLabel(draft['compensation_operator_receipt_audit_appeal_resolution_audit_id'] || detail['appeal_resolution_audit_id'], '未绑定') },
      { label: '申诉幂等键', value: auditValueLabel(draft['compensation_operator_receipt_audit_appeal_resolution_idempotency_key'] || detail['appeal_resolution_idempotency_key'], '未绑定') },
      { label: '记录人', value: auditValueLabel(draft['compensation_operator_receipt_audit_recorded_by_username'] || audit?.actor_display_name || audit?.actor_username, '未知') },
      { label: '记录时间', value: recordedAt > 0 ? formatTime(recordedAt) : '未记录' },
      { label: '资产边界', value: 'record-only / 不改个人背包 / 不还共同仓库' },
    ]
    return rows.filter(row => row.value !== '')
  })
  const warehouseCompensationAuditDraft = computed(() => {
    const raw = warehouseCompensationAuditBundle.value?.draft
    return raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  })
  const warehouseCompensationExecutionAction = computed(() => {
    const reviewAction = String(warehouseCompensationAuditDraft.value['compensation_review_compensation_action'] || '')
    return ['manual_restore_recorded', 'manual_compensation_recorded', 'no_compensation_needed'].includes(reviewAction)
      ? reviewAction
      : 'manual_compensation_recorded'
  })
  const warehouseCompensationExecutionPreflightAudit = computed(() => {
    const audits = warehouseCompensationAuditBundle.value?.preflight_audits ?? []
    return audits[0] ?? null
  })
  const warehouseCompensationExecutionAlreadyRecorded = computed(() =>
    String(warehouseCompensationAuditDraft.value['compensation_execution_status'] || '') === 'recorded'
  )
  const warehouseManualAppealResolutionAlreadyRecorded = computed(() =>
    String(warehouseCompensationAuditDraft.value['compensation_appeal_resolution_status'] || '') === 'recorded'
  )
  const warehouseOperatorReceiptAuditAlreadyRecorded = computed(() =>
    String(warehouseCompensationAuditDraft.value['compensation_operator_receipt_audit_status'] || '') === 'recorded'
  )
  const warehouseCompensationExecutionAudit = computed(() => {
    const audits = warehouseCompensationAuditBundle.value?.execution_audits ?? []
    return audits[0] ?? null
  })
  const warehouseManualAppealResolutionAudit = computed(() => {
    const audits = warehouseCompensationAuditBundle.value?.appeal_resolution_audits ?? []
    return audits[0] ?? null
  })
  const warehouseManualAppealResolutionVisible = computed(() => {
    const nextActions = warehouseCompensationAuditBundle.value?.appeal_packet.next_supported_actions ?? []
    return warehouseCompensationExecutionAlreadyRecorded.value === true &&
      warehouseManualAppealResolutionAlreadyRecorded.value === false &&
      nextActions.includes('manual_appeal_resolution')
  })
  const warehouseOperatorReceiptAuditVisible = computed(() => {
    const nextActions = warehouseCompensationAuditBundle.value?.appeal_packet.next_supported_actions ?? []
    return warehouseCompensationExecutionAlreadyRecorded.value === true &&
      warehouseOperatorReceiptAuditAlreadyRecorded.value === false &&
      Boolean(warehouseCompensationExecutionAudit.value?.idempotency_key || warehouseCompensationExecutionAudit.value?.id) &&
      (!warehouseManualAppealResolutionAlreadyRecorded.value || Boolean(warehouseManualAppealResolutionAudit.value?.idempotency_key || warehouseManualAppealResolutionAudit.value?.id)) &&
      nextActions.includes('operator_receipt_audit_review')
  })
  const canRecordHighValueWarehouseCompensationExecution = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(warehouseCompensationAuditBundle.value?.draft_id) &&
    String(warehouseCompensationAuditDraft.value['state'] || '') === 'executed' &&
    String(warehouseCompensationAuditDraft.value['compensation_review_status'] || '') === 'approved' &&
    Boolean(warehouseCompensationExecutionPreflightAudit.value?.idempotency_key || warehouseCompensationExecutionPreflightAudit.value?.id) &&
    warehouseCompensationExecutionAlreadyRecorded.value === false &&
    warehouseCompensationExecutionConfirmed.value === true &&
    warehouseCompensationExecutionReceipt.value.trim().length >= 4
  )
  const canRecordHighValueWarehouseManualAppealResolution = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(warehouseCompensationAuditBundle.value?.draft_id) &&
    warehouseManualAppealResolutionVisible.value === true &&
    Boolean(warehouseCompensationExecutionAudit.value?.idempotency_key || warehouseCompensationExecutionAudit.value?.id) &&
    warehouseManualAppealResolutionConfirmed.value === true &&
    warehouseManualAppealResolutionReceipt.value.trim().length >= 4 &&
    warehouseManualAppealResolutionNote.value.trim().length >= 4
  )
  const canRecordHighValueWarehouseOperatorReceiptAuditReview = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(warehouseCompensationAuditBundle.value?.draft_id) &&
    warehouseOperatorReceiptAuditVisible.value === true &&
    warehouseOperatorReceiptAuditConfirmed.value === true &&
    warehouseOperatorReceiptAuditReceipt.value.trim().length >= 4 &&
    warehouseOperatorReceiptAuditNote.value.trim().length >= 4
  )
  const warehouseGovernance = computed(() => cohabitationStore.warehouse?.governance ?? null)
  const warehouseGovernanceBlocking = computed(() => warehouseGovernance.value?.blocking ?? null)
  const warehouseGovernanceActiveRecovery = computed(() => warehouseGovernance.value?.active_recoveries?.[0] ?? null)
  const warehouseGovernanceNeedsRecovery = computed(() =>
    warehouseGovernanceBlocking.value?.block_inbound === true || warehouseGovernanceBlocking.value?.block_outbound === true
  )
  const warehouseGovernanceRecoveryDirection = computed<'inbound' | 'outbound' | 'all'>(() => {
    const directions = warehouseGovernanceBlocking.value?.blocked_directions ?? []
    if (directions.includes('inbound') && directions.includes('outbound')) return 'all'
    if (directions.includes('inbound') || warehouseGovernanceBlocking.value?.block_inbound === true) return 'inbound'
    if (directions.includes('outbound') || warehouseGovernanceBlocking.value?.block_outbound === true) return 'outbound'
    return 'all'
  })
  const warehouseGovernanceDirectionLabel = computed(() => {
    if (warehouseGovernanceRecoveryDirection.value === 'inbound') return '入仓'
    if (warehouseGovernanceRecoveryDirection.value === 'outbound') return '出仓'
    return '入仓 / 出仓'
  })
  const warehouseGovernanceStatusLabel = computed(() => {
    if (warehouseGovernanceNeedsRecovery.value) return '已阻断'
    if (warehouseGovernanceActiveRecovery.value) return '恢复中'
    return '正常'
  })
  const fundLedger = computed(() => cohabitationStore.fund?.ledger ?? [])
  const findLatestMediumFundBudgetLedger = (purpose: FundMediumSpendPurpose, targetRefs: string[] = []) => {
    const acceptedRefs = targetRefs.map(ref => ref.trim()).filter(Boolean)
    return fundLedger.value.find(entry => {
      if (entry.action !== 'spend' || entry.spend_tier !== 'medium' || entry.status !== 'committed') return false
      if (entry.purpose !== purpose) return false
      const targetRef = entry.target_ref || ''
      if (acceptedRefs.length === 0) return true
      return acceptedRefs.some(ref => targetRef === ref || targetRef.startsWith(ref))
    }) ?? null
  }
  const sharedWorkshopMediumBudgetLedger = computed(() =>
    findLatestMediumFundBudgetLedger('processing_materials', ['ui:processing_materials', 'shared_workshop:'])
  )
  const buildingMaterialsMediumBudgetLedger = computed(() =>
    findLatestMediumFundBudgetLedger('building_materials', ['ui:building_materials', 'family_building:'])
  )
  const permissionMembers = computed(() => cohabitationStore.permissionsPanel?.members ?? [])
  const permissionAudits = computed(() => cohabitationStore.permissionsPanel?.recent_permission_audits ?? [])
  const roleMembers = computed(() => cohabitationStore.rolePanel?.members ?? [])
  const roleOptions = computed(() => cohabitationStore.rolePanel?.role_options ?? [])
  const familyOrdersPanel = computed(() => cohabitationStore.familyOrdersPanel)
  const familyOrderMembers = computed(() => familyOrdersPanel.value?.members ?? [])
  const familyOrderDeferredOperations = computed(() => familyOrdersPanel.value?.deferred_operations ?? [])
  const familyOrderStages = computed(() => familyOrdersPanel.value?.visual_state_preview.async_projects?.[0]?.stages ?? [])
  const familyOrderLedger = computed(() => (familyOrdersPanel.value?.orders ?? familyOrdersPanel.value?.ledger ?? []) as Array<Record<string, unknown>>)
  const firstOpenFamilyOrder = computed(() => familyOrderLedger.value.find(order => order.status === 'open'))
  const firstAcceptedFamilyOrder = computed(() => familyOrderLedger.value.find(order => order.status === 'accepted'))
  const firstDeliveredFamilyOrder = computed(() => familyOrderLedger.value.find(order => order.status === 'delivered' && order.reward_settled !== true))
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
  const familyReputationRewardCatalog = computed(() => familyReputationPanel.value?.reward_catalog ?? [])
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
  const latestFamilyVisibilityRollbackAudit = computed(() => (familyVisibilityPanel.value?.audit ?? []).find(entry => entry.rollback_available === true))
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
  const firstAvailableFamilyFestivalTemplate = computed(() => familyFestivalSeatTemplates.value.find(template => template.available) ?? familyFestivalSeatTemplates.value[0] ?? null)
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
      { label: '自动收益', value: summary?.auto_offline_income_enabled ? `可领取 ${summary?.offline_auto_income_pending_count ?? 0} 项` : '暂未开放' },
      { label: '冲突预检', value: summary?.offline_conflict_preflight_enabled ? '服务端预检' : '暂未开放' },
      { label: '冲突解决', value: summary?.offline_conflict_resolution_enabled ? '服务端证据包' : '暂未开放' },
      { label: '自动解决', value: summary?.offline_conflict_auto_resolve_enabled ? '先预检后合并' : '暂未开放' },
    ]
  })
  const offlineAutoIncomePendingCount = computed(() => Math.max(
    0,
    Math.floor(Number(cohabitationStore.offlineStatus?.summary.offline_auto_income_pending_count) || Number(cohabitationStore.offlineStatus?.offline_auto_income?.pending_count) || 0),
  ))
  const offlineAutoIncomePolicyText = computed(() => {
    const autoIncome = cohabitationStore.offlineStatus?.offline_auto_income
    const farmCount = Number(autoIncome?.harvestable_plot_count) || 0
    const animalCount = Number(autoIncome?.ready_animal_product_count) || 0
    return `服务端按当前契约状态领取：农田 ${farmCount}、动物产物 ${animalCount}，只写共同仓库流水。`
  })
  const canCollectOfflineAutoIncome = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.summary.auto_offline_income_enabled === true &&
    cohabitationStore.offlineStatus?.actor_capabilities?.collect_offline_auto_income === true &&
    offlineAutoIncomePendingCount.value > 0
  )
  const canManagePermissionPanel = computed(() => cohabitationStore.permissionsPanel?.editable_by_actor === true)
  const canManageRolePanel = computed(() => cohabitationStore.rolePanel?.editable_by_actor === true)
  const permissionToggleOptions = [
    { group: 'farm', key: 'water', label: '浇水' },
    { group: 'farm', key: 'cure_pests', label: '除虫清草' },
    { group: 'farm', key: 'plant', label: '种植施肥' },
    { group: 'farm', key: 'harvest', label: '收获' },
    { group: 'farm', key: 'remove_crop', label: '铲除作物' },
    { group: 'farm', key: 'use_premium_fertilizer', label: '高级肥料' },
    { group: 'animal', key: 'feed', label: '喂食' },
    { group: 'animal', key: 'pet', label: '抚摸' },
    { group: 'animal', key: 'collect_product', label: '收产物' },
    { group: 'animal', key: 'buy_animal', label: '买动物' },
    { group: 'animal', key: 'sell_animal', label: '卖动物' },
    { group: 'storage', key: 'deposit', label: '仓库放入' },
    { group: 'storage', key: 'withdraw_common', label: '取普通物' },
    { group: 'storage', key: 'withdraw_high_quality', label: '取高品质物' },
    { group: 'storage', key: 'withdraw_rare', label: '取稀有物' },
    { group: 'storage', key: 'sell_items', label: '卖出' },
    { group: 'construction', key: 'move_common_furniture', label: '移动家具' },
    { group: 'construction', key: 'move_memorial_furniture', label: '移动纪念家具' },
    { group: 'construction', key: 'buy_furniture', label: '买家具' },
    { group: 'construction', key: 'demolish_building', label: '拆建筑' },
    { group: 'construction', key: 'expand_manor', label: '扩建' },
    { group: 'fund', key: 'spend_small', label: '小额基金' },
    { group: 'fund', key: 'spend_medium', label: '中额基金' },
    { group: 'fund', key: 'spend_large', label: '大额基金' },
    { group: 'fund', key: 'auto_buy_seeds_feed', label: '自动买种子饲料' },
    { group: 'family', key: 'child_daily_care', label: '孩子照料' },
    { group: 'family', key: 'family_wish_submit', label: '家庭心愿' },
    { group: 'family', key: 'major_family_choice', label: '重大选择' },
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
    seed_cabbage: '白菜种子',
    seed_radish: '萝卜种子',
    seed_rice: '水稻种子',
    seed_wheat: '小麦种子',
    seed_corn: '玉米种子',
    seed_tea: '茶树苗',
    seed_lotus: '莲藕苗',
    seed_turnip: '芜菁种子',
    seed_carrot: '胡萝卜种子',
    seed_sweet_potato: '红薯种苗',
    seed_pumpkin: '南瓜种子',
    seed_sesame: '芝麻种子',
    seed_peach: '桃树苗',
    seed_chili: '辣椒种子',
    wood: '木材',
    stone: '石料',
    clay: '黏土',
    coal: '煤炭',
    copper_ore: '铜矿石',
    iron_ore: '铁矿石',
    cabbage: '白菜',
    firewood: '木柴',
    honey: '蜂蜜',
    dried_cabbage: '干菜',
    dried_radish: '萝卜干',
    rice_flour: '米粉',
    sesame_paste: '芝麻酱',
    sesame_powder: '芝麻粉',
    pumpkin_preserve: '南瓜酱',
    pickled_chili: '泡椒',
    pickled_ginger: '腌姜',
    sesame_oil: '芝麻油',
    dried_lotus_seed: '干莲子',
    lotus_heart_powder: '莲心粉',
    herb: '草药',
    herbal_paste: '草药膏',
    lotus_seed: '莲子',
    lotus_root: '莲藕',
    food_congee: '白粥',
    food_stir_fried_cabbage: '炒青菜',
    food_radish_soup: '萝卜汤',
    food_herbal_porridge: '药膳粥',
    food_miner_lunch: '矿工便当',
    food_honey_tea: '蜂蜜茶',
    food_ginger_soup: '姜汤',
    food_rice_ball: '饭团',
    food_vegetable_soup: '田园蔬菜汤',
    food_roasted_sweet_potato: '烤红薯',
    food_rice_flour_roll: '米粉卷',
    food_sesame_tangyuan: '芝麻汤圆',
    food_lotus_sesame_calming_cake: '莲心芝麻安神糕',
    food_spicy_pumpkin_rice: '赛舟辣南瓜饭',
    qingxin_lotus_elixir: '清心莲丹',
    partial_elixir_slurry: '偏丹膏',
    failed_elixir_ash: '废丹灰',
    rare_elixir_crystal: '奇丹晶',
    rice_vinegar: '米醋',
    pickled_radish: '腌萝卜',
    rapeseed: '油菜籽',
    rapeseed_oil: '菜籽油',
    green_tea_drink: '绿茶',
    broad_bean: '蚕豆',
    tofu: '豆腐',
    quartz: '石英',
    charcoal: '木炭',
    refined_quartz: '精制石英',
    osmanthus: '桂花',
    osmanthus_honey: '桂花蜜',
    bamboo_shoot: '春笋',
    winter_wheat: '冬小麦',
    napa_cabbage: '冬白菜',
    potato: '土豆',
    ginger: '生姜',
    egg: '鸡蛋',
    silkie_egg: '乌鸡蛋',
    goat_milk: '羊奶',
    truffle: '松露',
    camel_milk: '驼奶',
    crucian: '鲫鱼',
    carp: '鲤鱼',
    bass: '鲈鱼',
    mandarin_fish: '桂花鱼',
    eel: '鳗鱼',
    river_crab: '河蟹',
    creek_shrimp: '溪虾',
    candied_peach: '蜜桃脯',
    food_scrambled_egg_rice: '蛋炒饭',
    food_boiled_egg: '水煮蛋',
    food_silkie_egg_soup: '乌鸡蛋羹',
    food_goat_milk_soup: '羊奶汤',
    food_truffle_fried_rice: '松露炒饭',
    food_camel_milk_tea: '驼奶茶',
    food_spicy_boat_rice_ball: '辛火赛舟饭团',
    food_first_catch_soup: '初钓鱼汤',
    food_braised_carp: '红烧鲤鱼',
    food_steamed_bass: '清蒸鲈鱼',
    food_maple_grilled_fish: '枫叶烤鱼',
    food_grilled_eel: '烤鳗鱼',
    food_crab_soup: '蟹黄汤',
    food_anglers_platter: '渔夫拼盘',
    food_lotus_fish_roll: '莲藕鱼卷',
    food_sesame_eel_rice: '芝麻鳗鱼饭',
    food_crab_osmanthus_congee: '桂香蟹粥',
    food_festival_fish_feast: '节庆鱼宴',
    food_winter_bamboo_duck_congee: '冬笋鸭蛋粥',
    food_buffalo_milk_pudding: '水牛乳米糕',
    food_goose_egg_sesame_cake: '鹅蛋芝麻糕',
    food_quail_egg_herb_custard: '鹌鹑药蛋羹',
    food_spring_roll: '春卷',
    food_lotus_lantern_cake: '荷灯糕',
    food_harvest_feast: '丰收盛宴',
    food_new_year_dumpling: '年夜饺',
    food_rapeseed_bamboo_rice_roll: '菜油春笋米粉卷',
    food_pumpkin_harvest_cauldron: '丰收南瓜大锅羹',
    food_pickled_radish_guard_soup: '腌萝卜护院汤',
    food_candied_peach_spirit_cake: '蜜桃灵果糕',
    warming_sweet_potato_pill: '温阳薯丸',
    grain_breath_elixir: '谷气续行丹',
    sesame_courtesy_elixir: '芝香护礼丸',
    pumpkin_warmth_elixir: '南瓜聚火丹',
    spicy_vitality_pill: '辛火行气丸',
    osmanthus_focus_elixir: '桂露凝神丹',
    tea_focus_elixir: '茶心凝神丹',
    stone_root_guard_pill: '石根护脉丸',
    moon_herb: '月草',
    spirit_peach_elixir: '灵桃醒神丹',
    marsh_spore_sample: '湿地孢样',
    luminous_algae: '夜光藻团',
    ley_crystal_shard: '灵脉碎晶',
    ley_crystal_focus_elixir: '灵脉凝神丹',
    wind_etched_core: '风蚀晶核',
    wind_core_guard_pill: '风蚀护脉丸',
    marsh_luminous_cleansing_elixir: '泽光净息丹',
    moon_pearl: '月珠',
    moon_pearl_calm_elixir: '月珠安神丹',
    jade_orchid: '玉兰',
    jade_orchid_focus_elixir: '玉兰凝心丹',
    lotus_seed_rare: '稀有莲子',
    rare_lotus_guard_elixir: '稀莲护心丹',
    jade_peach: '翠桃',
    jade_peach_spirit_elixir: '翠桃醒神丹',
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
  const qualityLabel = (value = 'normal') => {
    const labels: Record<string, string> = {
      normal: '普通',
      fine: '优质',
      rare: '稀有',
    }
    return labels[value] || value || '普通'
  }
  const sharedWorkshopStationLabel = (value = '') => {
    const labels: Record<string, string> = {
      drying_rack: '晒架',
      stone_mill: '石磨',
      sauce_jar: '酱缸',
      oil_press: '油坊',
      herb_grinder: '药碾',
      stove: '灶台',
      alchemy_furnace: '丹炉',
      wine_workshop: '酒坊',
      tea_maker: '茶炉',
      tofu_press: '豆腐坊',
      furnace: '熔炉',
      sugar_jar: '糖渍罐',
      beehive: '蜂箱',
    }
    return labels[value] || value || '工坊'
  }
  const sharedWorkshopProcessKindLabel = (value = '') => {
    const labels: Record<string, string> = {
      processing: '加工',
      cooking_material: '料理材料',
      cooking_dish: '料理成品',
      alchemy_material: '炼丹材料',
      alchemy_elixir: '炼丹',
    }
    return labels[value] || value || '加工'
  }
  const sharedWorkshopAlchemyResultLabel = (value = '') => {
    const labels: Record<string, string> = {
      success: '成丹',
      partial: '偏丹',
      failed: '废丹',
      rare: '奇丹',
    }
    return labels[value] || value || '未记录'
  }
  const sharedAlchemyDefaultBaseWeights: SharedAlchemyWeights = { success: 80, partial: 14, failed: 4, rare: 2 }
  const sharedWorkshopAlchemyWeightProfiles: Record<string, { profile: string; label: string; weights: SharedAlchemyWeights }> = {
    shared_grain_breath_elixir: { profile: 'grain_steady', label: '谷气稳炉', weights: { success: 82, partial: 13, failed: 3, rare: 2 } },
    shared_sesame_courtesy_elixir: { profile: 'sesame_careful', label: '芝香护礼', weights: { success: 78, partial: 17, failed: 3, rare: 2 } },
    shared_pumpkin_warmth_elixir: { profile: 'pumpkin_warm_fire', label: '南瓜温火', weights: { success: 76, partial: 16, failed: 5, rare: 3 } },
    shared_spicy_vitality_pill: { profile: 'spicy_high_flame', label: '辛火猛炉', weights: { success: 72, partial: 16, failed: 7, rare: 5 } },
    shared_osmanthus_focus_elixir: { profile: 'osmanthus_focus', label: '桂露凝神', weights: { success: 84, partial: 10, failed: 4, rare: 2 } },
    shared_tea_focus_elixir: { profile: 'tea_focus', label: '茶心凝神', weights: { success: 84, partial: 10, failed: 4, rare: 2 } },
    shared_stone_root_guard_pill: { profile: 'stone_guard', label: '石根护脉', weights: { success: 80, partial: 12, failed: 6, rare: 2 } },
    shared_spirit_peach_elixir: { profile: 'spirit_peach_rare_material', label: '灵桃稀材', weights: { success: 70, partial: 15, failed: 7, rare: 8 } },
    shared_ley_crystal_focus_elixir: { profile: 'ley_crystal_rare_material', label: '灵脉稀材', weights: { success: 68, partial: 16, failed: 8, rare: 8 } },
    shared_wind_core_guard_pill: { profile: 'wind_core_rare_material', label: '风蚀稀材', weights: { success: 66, partial: 17, failed: 8, rare: 9 } },
    shared_marsh_luminous_cleansing_elixir: { profile: 'marsh_luminous_rare_material', label: '泽光稀材', weights: { success: 64, partial: 18, failed: 8, rare: 10 } },
    shared_moon_pearl_calm_elixir: { profile: 'moon_pearl_rare_material', label: '月珠稀材', weights: { success: 63, partial: 18, failed: 8, rare: 11 } },
    shared_jade_orchid_focus_elixir: { profile: 'jade_orchid_rare_material', label: '玉兰稀材', weights: { success: 62, partial: 18, failed: 8, rare: 12 } },
    shared_rare_lotus_guard_elixir: { profile: 'rare_lotus_seed_material', label: '稀莲稀材', weights: { success: 61, partial: 18, failed: 8, rare: 13 } },
    shared_jade_peach_spirit_elixir: { profile: 'jade_peach_rare_material', label: '翠桃稀材', weights: { success: 60, partial: 19, failed: 8, rare: 13 } },
  }
  const sharedWorkshopAlchemyHeatProfiles: Record<SharedAlchemyHeatLevel, { label: string; profile: string; deltas: SharedAlchemyWeights }> = {
    gentle: { label: '文火', profile: 'gentle_fire', deltas: { success: 3, partial: 1, failed: -3, rare: -1 } },
    balanced: { label: '中火', profile: 'balanced_fire', deltas: { success: 0, partial: 0, failed: 0, rare: 0 } },
    strong: { label: '武火', profile: 'strong_fire', deltas: { success: -5, partial: -1, failed: 3, rare: 3 } },
  }
  const normalizeSharedWorkshopAlchemyWeights = (weights: SharedAlchemyWeights): SharedAlchemyWeights => {
    const success = Math.max(0, Math.floor(Number(weights.success) || 0))
    const partial = Math.max(0, Math.floor(Number(weights.partial) || 0))
    const failed = Math.max(0, Math.floor(Number(weights.failed) || 0))
    const rare = Math.max(0, Math.floor(Number(weights.rare) || 0))
    const total = success + partial + failed + rare
    if (total <= 0 || total === 100) return total <= 0 ? sharedAlchemyDefaultBaseWeights : { success, partial, failed, rare }
    const normalizedSuccess = Math.max(0, Math.min(100, Math.floor((success * 100) / total)))
    const normalizedPartial = Math.max(0, Math.min(100 - normalizedSuccess, Math.floor((partial * 100) / total)))
    const normalizedFailed = Math.max(0, Math.min(100 - normalizedSuccess - normalizedPartial, Math.floor((failed * 100) / total)))
    return {
      success: normalizedSuccess,
      partial: normalizedPartial,
      failed: normalizedFailed,
      rare: Math.max(0, 100 - normalizedSuccess - normalizedPartial - normalizedFailed),
    }
  }
  const applySharedWorkshopAlchemyHeatProfile = (weights: SharedAlchemyWeights, heatLevel: SharedAlchemyHeatLevel) => {
    const heat = sharedWorkshopAlchemyHeatProfiles[heatLevel] ?? sharedWorkshopAlchemyHeatProfiles.balanced
    return normalizeSharedWorkshopAlchemyWeights({
      success: weights.success + heat.deltas.success,
      partial: weights.partial + heat.deltas.partial,
      failed: weights.failed + heat.deltas.failed,
      rare: weights.rare + heat.deltas.rare,
    })
  }
  const sharedWorkshopAlchemyWeightsLabel = (weights?: Record<string, number> | null) => {
    if (!weights) return ''
    const success = Math.max(0, Math.floor(Number(weights.success) || 0))
    const partial = Math.max(0, Math.floor(Number(weights.partial) || 0))
    const failed = Math.max(0, Math.floor(Number(weights.failed) || 0))
    const rare = Math.max(0, Math.floor(Number(weights.rare) || 0))
    return `成丹 ${success} / 偏丹 ${partial} / 废丹 ${failed} / 奇丹 ${rare}`
  }
  const dailySettlementSummaryLabel = (settlement: Record<string, unknown> | null | undefined) => {
    if (!settlement) return '共同庄园日结已提交'
    const farmGrowth = Math.max(0, Math.floor(Number(settlement.farm_growth_count) || 0))
    const healthCount = Math.max(0, Math.floor(Number(settlement.farm_health_bonus_consumed_count) || 0))
    const moodCount = Math.max(0, Math.floor(Number(settlement.animal_mood_bonus_consumed_count) || 0))
    const harvestable = Math.max(0, Math.floor(Number(settlement.farm_harvestable_count) || 0))
    const parts = [`农田成长 ${farmGrowth}`, `健康消耗 ${healthCount}`, `心情消耗 ${moodCount}`]
    if (harvestable > 0) parts.push(`成熟 ${harvestable}`)
    return `共同庄园日结：${parts.join(' / ')}`
  }
  const hasSimultaneousOnlineBonus = (bonus: Record<string, unknown> | undefined) => bonus?.applied === true
  const simultaneousOnlineBonusEvidenceLabel = (bonus: Record<string, unknown> | undefined) => {
    if (!hasSimultaneousOnlineBonus(bonus)) return '无协作证据'
    const typeValue = bonus?.type
    const type = typeof typeValue === 'string' ? typeValue : ''
    if (type === 'shared_order_confirm_efficiency') {
      const assigneeValue = bonus?.assignee_username
      const confirmerValue = bonus?.confirmer_username
      const receiptValue = bonus?.receipt_id
      const assignee = typeof assigneeValue === 'string' ? assigneeValue : ''
      const confirmer = typeof confirmerValue === 'string' ? confirmerValue : ''
      const receipt = typeof receiptValue === 'string' ? receiptValue : ''
      const originalDuration = Math.max(0, Math.floor(Number(bonus?.order_original_duration_seconds) || 0))
      const bonusDuration = Math.max(0, Math.floor(Number(bonus?.order_efficiency_bonus_seconds) || 0))
      const effectiveDuration = Math.max(0, Math.floor(Number(bonus?.order_effective_duration_seconds) || 0))
      return [
        assignee ? `接单 ${assignee}` : '',
        confirmer ? `确认 ${confirmer}` : '',
        receipt ? `凭证 ${receipt}` : '',
        originalDuration > 0 ? `原始 ${formatDuration(originalDuration)}` : '',
        bonusDuration > 0 ? `减免 ${formatDuration(bonusDuration)}` : '',
        originalDuration > 0 ? `有效 ${formatDuration(effectiveDuration)}` : '',
      ].filter(Boolean).join(' · ') || '订单协作已记录'
    }
    if (type === 'family_building_decoration_atmosphere') {
      const appliedByValue = bonus?.applied_by_username
      const materialsActorValue = bonus?.materials_actor_username
      const photoMomentValue = bonus?.photo_moment_id
      const atmosphereEventValue = bonus?.family_atmosphere_event_id
      const appliedBy = typeof appliedByValue === 'string' ? appliedByValue : ''
      const materialsActor = typeof materialsActorValue === 'string' ? materialsActorValue : ''
      const photoMoment = typeof photoMomentValue === 'string' ? photoMomentValue : ''
      const atmosphereEvent = typeof atmosphereEventValue === 'string' ? atmosphereEventValue : ''
      return [appliedBy ? `落账 ${appliedBy}` : '', materialsActor ? `建材 ${materialsActor}` : '', photoMoment || atmosphereEvent].filter(Boolean).join(' · ') || '装修协作已记录'
    }
    const recentMembersValue = bonus?.recent_member_usernames
    const members = Array.isArray(recentMembersValue) ? recentMembersValue.filter(Boolean).join(' / ') : ''
    return members ? `成员 ${members}` : '协作证据已记录'
  }
  const simultaneousOnlineBonusLabel = (bonus: Record<string, unknown> | undefined) => {
    if (!bonus || bonus.applied !== true) return '未触发'
    const type = typeof bonus.type === 'string' ? bonus.type : ''
    const value = Number(bonus.bonus_value) || 0
    const before = typeof bonus.output_quality_before === 'string' ? qualityLabel(bonus.output_quality_before) : ''
    const after = typeof bonus.output_quality_after === 'string' ? qualityLabel(bonus.output_quality_after) : ''
    if (type === 'shared_alchemy_success_rate') {
      const percent = Number(bonus.success_rate_bonus_percent) || value
      return `炼丹成功率 +${percent}%`
    }
    if (type === 'shared_workshop_process_quality') {
      const processKind = typeof bonus.process_kind === 'string' ? bonus.process_kind : ''
      const prefix = processKind === 'cooking_dish' ? '料理品质' : '工坊品质'
      return before && after && before !== after ? `${prefix} ${before} -> ${after}` : `${prefix}加成`
    }
    if (type === 'shared_farm_water_health') return value > 0 ? `农田健康 +${value}` : '农田健康加成'
    if (type === 'shared_farm_plant_fertilize_quality') return value > 0 ? `农田品质 +${value}` : '农田品质加成'
    if (type === 'shared_farm_plant_fertilize_quality_harvest') return before && after && before !== after ? `收获品质 ${before} -> ${after}` : '收获品质加成'
    if (type === 'shared_animal_feed_pet_mood') return value > 0 ? `动物心情 +${value}` : '动物心情加成'
    if (type === 'shared_order_confirm_efficiency') return '订单确认效率加成'
    if (type === 'family_building_decoration_atmosphere') return '装修合照 / 家庭氛围'
    if (before && after && before !== after) return `${before} -> ${after}`
    return value > 0 ? `品质加成 +${value}` : '已触发'
  }
  const sharedFarmSeedOptions = [
    { itemId: 'seed_cabbage', label: '白菜种子' },
    { itemId: 'seed_radish', label: '萝卜种子' },
    { itemId: 'seed_rice', label: '水稻种子' },
    { itemId: 'seed_wheat', label: '小麦种子' },
    { itemId: 'seed_corn', label: '玉米种子' },
    { itemId: 'seed_tea', label: '茶树苗' },
    { itemId: 'seed_lotus', label: '莲藕苗' },
    { itemId: 'seed_turnip', label: '芜菁种子' },
    { itemId: 'seed_carrot', label: '胡萝卜种子' },
    { itemId: 'seed_sweet_potato', label: '红薯种苗' },
    { itemId: 'seed_pumpkin', label: '南瓜种子' },
    { itemId: 'seed_sesame', label: '芝麻种子' },
    { itemId: 'seed_peach', label: '桃树苗' },
    { itemId: 'seed_chili', label: '辣椒种子' },
  ]
  const sharedWorkshopRecipeOptions: SharedWorkshopRecipeOption[] = [
    { id: 'shared_dried_cabbage', label: '共同晒制干菜', station: 'drying_rack', process_kind: 'processing', input_items: [{ item_id: 'cabbage', quantity: 1, quality: 'normal' }], output_item_id: 'dried_cabbage', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_dried_radish', label: '共同酱缸萝卜干', station: 'sauce_jar', process_kind: 'processing', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }], output_item_id: 'dried_radish', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_rice_flour', label: '共同石磨米粉', station: 'stone_mill', process_kind: 'cooking_material', input_items: [{ item_id: 'rice', quantity: 2, quality: 'normal' }], output_item_id: 'rice_flour', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_sesame_paste', label: '共同石磨芝麻酱', station: 'stone_mill', process_kind: 'cooking_material', input_items: [{ item_id: 'sesame', quantity: 2, quality: 'normal' }], output_item_id: 'sesame_paste', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_sesame_powder', label: '共同石磨芝麻粉', station: 'stone_mill', process_kind: 'cooking_material', input_items: [{ item_id: 'sesame', quantity: 2, quality: 'normal' }], output_item_id: 'sesame_powder', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_pumpkin_preserve', label: '共同酱缸南瓜酱', station: 'sauce_jar', process_kind: 'cooking_material', input_items: [{ item_id: 'pumpkin', quantity: 1, quality: 'normal' }], output_item_id: 'pumpkin_preserve', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_pickled_chili', label: '共同酱缸泡椒', station: 'sauce_jar', process_kind: 'cooking_material', input_items: [{ item_id: 'chili', quantity: 2, quality: 'normal' }], output_item_id: 'pickled_chili', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_sesame_oil', label: '共同油坊芝麻油', station: 'oil_press', process_kind: 'cooking_material', input_items: [{ item_id: 'sesame', quantity: 3, quality: 'normal' }], output_item_id: 'sesame_oil', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_lotus_heart_powder', label: '共同药碾莲心粉', station: 'herb_grinder', process_kind: 'cooking_material', input_items: [{ item_id: 'dried_lotus_seed', quantity: 1, quality: 'normal' }], output_item_id: 'lotus_heart_powder', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_rice_vinegar', label: '共同酒坊米醋', station: 'wine_workshop', process_kind: 'cooking_material', input_items: [{ item_id: 'rice', quantity: 2, quality: 'normal' }], output_item_id: 'rice_vinegar', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_pickled_radish', label: '共同酱缸腌萝卜', station: 'sauce_jar', process_kind: 'cooking_material', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }, { item_id: 'rice_vinegar', quantity: 1, quality: 'fine' }], output_item_id: 'pickled_radish', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_rapeseed_oil', label: '共同油坊菜籽油', station: 'oil_press', process_kind: 'cooking_material', input_items: [{ item_id: 'rapeseed', quantity: 3, quality: 'normal' }], output_item_id: 'rapeseed_oil', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_green_tea_drink', label: '共同茶炉绿茶', station: 'tea_maker', process_kind: 'cooking_material', input_items: [{ item_id: 'tea', quantity: 2, quality: 'normal' }], output_item_id: 'green_tea_drink', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_tofu', label: '共同豆腐坊豆腐', station: 'tofu_press', process_kind: 'cooking_material', input_items: [{ item_id: 'broad_bean', quantity: 3, quality: 'normal' }], output_item_id: 'tofu', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_refined_quartz', label: '共同熔炉精制石英', station: 'furnace', process_kind: 'alchemy_material', input_items: [{ item_id: 'quartz', quantity: 2, quality: 'normal' }, { item_id: 'charcoal', quantity: 1, quality: 'normal' }], output_item_id: 'refined_quartz', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_candied_peach', label: '共同糖渍罐蜜桃脯', station: 'sugar_jar', process_kind: 'cooking_material', input_items: [{ item_id: 'peach', quantity: 2, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'candied_peach', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_osmanthus_honey', label: '共同蜂箱桂花蜜', station: 'beehive', process_kind: 'alchemy_material', input_items: [{ item_id: 'osmanthus', quantity: 1, quality: 'normal' }], output_item_id: 'osmanthus_honey', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_rice_ball', label: '共同灶台饭团', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'rice', quantity: 1, quality: 'normal' }], output_item_id: 'food_rice_ball', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_vegetable_soup', label: '共同灶台田园蔬菜汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'cabbage', quantity: 1, quality: 'normal' }, { item_id: 'radish', quantity: 1, quality: 'normal' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_vegetable_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_stir_fried_cabbage', label: '共同灶台炒青菜', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'cabbage', quantity: 2, quality: 'normal' }], output_item_id: 'food_stir_fried_cabbage', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_radish_soup', label: '共同灶台萝卜汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_radish_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_herbal_porridge', label: '共同灶台药膳粥', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'herb', quantity: 2, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }], output_item_id: 'food_herbal_porridge', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_miner_lunch', label: '共同灶台矿工便当', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'potato', quantity: 2, quality: 'normal' }, { item_id: 'sweet_potato', quantity: 1, quality: 'normal' }], output_item_id: 'food_miner_lunch', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_honey_tea', label: '共同茶炉蜂蜜茶', station: 'tea_maker', process_kind: 'cooking_dish', input_items: [{ item_id: 'honey', quantity: 1, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }], output_item_id: 'food_honey_tea', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_ginger_soup', label: '共同灶台姜汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'ginger', quantity: 2, quality: 'normal' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_ginger_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_scrambled_egg_rice', label: '共同灶台蛋炒饭', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'egg', quantity: 1, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }], output_item_id: 'food_scrambled_egg_rice', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_boiled_egg', label: '共同灶台水煮蛋', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'egg', quantity: 2, quality: 'normal' }], output_item_id: 'food_boiled_egg', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_silkie_egg_soup', label: '共同灶台乌鸡蛋羹', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'silkie_egg', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_silkie_egg_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_goat_milk_soup', label: '共同灶台羊奶汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'goat_milk', quantity: 2, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }], output_item_id: 'food_goat_milk_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_truffle_fried_rice', label: '共同灶台松露炒饭', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'truffle', quantity: 1, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }, { item_id: 'egg', quantity: 1, quality: 'normal' }], output_item_id: 'food_truffle_fried_rice', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_camel_milk_tea', label: '共同茶炉驼奶茶', station: 'tea_maker', process_kind: 'cooking_dish', input_items: [{ item_id: 'camel_milk', quantity: 1, quality: 'normal' }, { item_id: 'tea', quantity: 1, quality: 'normal' }], output_item_id: 'food_camel_milk_tea', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_congee', label: '共同灶台白粥', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'rice', quantity: 2, quality: 'normal' }], output_item_id: 'food_congee', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_first_catch_soup', label: '共同灶台初钓鱼汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'crucian', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_first_catch_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_braised_carp', label: '共同灶台红烧鲤鱼', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'carp', quantity: 1, quality: 'normal' }, { item_id: 'sesame', quantity: 2, quality: 'normal' }], output_item_id: 'food_braised_carp', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_steamed_bass', label: '共同灶台清蒸鲈鱼', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'bass', quantity: 1, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_steamed_bass', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_maple_grilled_fish', label: '共同灶台枫叶烤鱼', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'mandarin_fish', quantity: 1, quality: 'normal' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_maple_grilled_fish', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_grilled_eel', label: '共同灶台烤鳗鱼', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'eel', quantity: 1, quality: 'normal' }, { item_id: 'sesame', quantity: 1, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_grilled_eel', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_crab_soup', label: '共同灶台蟹黄汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'river_crab', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_crab_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_anglers_platter', label: '共同灶台渔夫拼盘', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'bass', quantity: 1, quality: 'normal' }, { item_id: 'creek_shrimp', quantity: 1, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_anglers_platter', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_lotus_fish_roll', label: '共同灶台莲藕鱼卷', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'bass', quantity: 1, quality: 'normal' }, { item_id: 'lotus_root', quantity: 1, quality: 'normal' }, { item_id: 'rice_flour', quantity: 1, quality: 'fine' }], output_item_id: 'food_lotus_fish_roll', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_sesame_eel_rice', label: '共同灶台芝麻鳗鱼饭', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'eel', quantity: 1, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }, { item_id: 'sesame_oil', quantity: 1, quality: 'fine' }], output_item_id: 'food_sesame_eel_rice', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_crab_osmanthus_congee', label: '共同灶台桂香蟹粥', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'river_crab', quantity: 1, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }, { item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }], output_item_id: 'food_crab_osmanthus_congee', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_festival_fish_feast', label: '共同灶台节庆鱼宴', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'mandarin_fish', quantity: 1, quality: 'normal' }, { item_id: 'creek_shrimp', quantity: 1, quality: 'normal' }, { item_id: 'pickled_ginger', quantity: 1, quality: 'fine' }, { item_id: 'sesame_oil', quantity: 1, quality: 'fine' }], output_item_id: 'food_festival_fish_feast', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_winter_bamboo_duck_congee', label: '共同灶台冬笋鸭蛋粥', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'winter_bamboo_shoot', quantity: 1, quality: 'normal' }, { item_id: 'duck_egg', quantity: 1, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_winter_bamboo_duck_congee', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_buffalo_milk_pudding', label: '共同灶台水牛乳米糕', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'buffalo_milk', quantity: 1, quality: 'normal' }, { item_id: 'rice_flour', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'food_buffalo_milk_pudding', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_goose_egg_sesame_cake', label: '共同灶台鹅蛋芝麻糕', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'goose_egg', quantity: 1, quality: 'normal' }, { item_id: 'rice_flour', quantity: 1, quality: 'fine' }, { item_id: 'sesame_powder', quantity: 1, quality: 'fine' }], output_item_id: 'food_goose_egg_sesame_cake', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_quail_egg_herb_custard', label: '共同灶台鹌鹑药蛋羹', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'quail_egg', quantity: 2, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }, { item_id: 'goat_milk', quantity: 1, quality: 'normal' }], output_item_id: 'food_quail_egg_herb_custard', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_spring_roll', label: '共同灶台春卷', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'cabbage', quantity: 2, quality: 'normal' }, { item_id: 'bamboo_shoot', quantity: 1, quality: 'normal' }, { item_id: 'sesame_oil', quantity: 1, quality: 'fine' }], output_item_id: 'food_spring_roll', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_lotus_lantern_cake', label: '共同灶台荷灯糕', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'lotus_seed', quantity: 2, quality: 'normal' }, { item_id: 'rice', quantity: 2, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'food_lotus_lantern_cake', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_harvest_feast', label: '共同灶台丰收盛宴', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'pumpkin', quantity: 1, quality: 'normal' }, { item_id: 'sweet_potato', quantity: 1, quality: 'normal' }, { item_id: 'corn', quantity: 1, quality: 'normal' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_harvest_feast', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_new_year_dumpling', label: '共同灶台年夜饺', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'winter_wheat', quantity: 3, quality: 'normal' }, { item_id: 'napa_cabbage', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }], output_item_id: 'food_new_year_dumpling', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_roasted_sweet_potato', label: '共同灶台烤红薯', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'sweet_potato', quantity: 2, quality: 'normal' }], output_item_id: 'food_roasted_sweet_potato', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_rice_flour_roll', label: '共同灶台米粉卷', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'rice_flour', quantity: 1, quality: 'fine' }, { item_id: 'dried_radish', quantity: 1, quality: 'normal' }], output_item_id: 'food_rice_flour_roll', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_sesame_tangyuan', label: '共同灶台芝麻汤圆', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'rice_flour', quantity: 1, quality: 'fine' }, { item_id: 'sesame_paste', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'food_sesame_tangyuan', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_lotus_sesame_calming_cake', label: '共同灶台莲心芝麻安神糕', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'sesame_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'food_lotus_sesame_calming_cake', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_spicy_pumpkin_rice', label: '共同灶台赛舟辣南瓜饭', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'pumpkin_preserve', quantity: 1, quality: 'fine' }, { item_id: 'pickled_chili', quantity: 1, quality: 'fine' }, { item_id: 'sesame_oil', quantity: 1, quality: 'fine' }, { item_id: 'rice', quantity: 1, quality: 'normal' }], output_item_id: 'food_spicy_pumpkin_rice', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_spicy_boat_rice_ball', label: '共同灶台辛火赛舟饭团', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'pickled_chili', quantity: 1, quality: 'fine' }, { item_id: 'rice', quantity: 2, quality: 'normal' }, { item_id: 'sesame_oil', quantity: 1, quality: 'fine' }], output_item_id: 'food_spicy_boat_rice_ball', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_rapeseed_bamboo_rice_roll', label: '共同灶台菜油春笋米粉卷', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'rice_flour', quantity: 1, quality: 'fine' }, { item_id: 'bamboo_shoot', quantity: 1, quality: 'normal' }, { item_id: 'rapeseed_oil', quantity: 1, quality: 'fine' }], output_item_id: 'food_rapeseed_bamboo_rice_roll', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_pumpkin_harvest_cauldron', label: '共同灶台丰收南瓜大锅羹', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'pumpkin_preserve', quantity: 1, quality: 'fine' }, { item_id: 'sweet_potato', quantity: 1, quality: 'normal' }, { item_id: 'rice', quantity: 1, quality: 'normal' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_pumpkin_harvest_cauldron', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_pickled_radish_guard_soup', label: '共同灶台腌萝卜护院汤', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'pickled_radish', quantity: 1, quality: 'fine' }, { item_id: 'tofu', quantity: 1, quality: 'fine' }, { item_id: 'firewood', quantity: 1, quality: 'normal' }], output_item_id: 'food_pickled_radish_guard_soup', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_candied_peach_spirit_cake', label: '共同灶台蜜桃灵果糕', station: 'stove', process_kind: 'cooking_dish', input_items: [{ item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'rice_flour', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'food_candied_peach_spirit_cake', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_herb_paste', label: '共同药碾草药膏', station: 'herb_grinder', process_kind: 'alchemy_material', input_items: [{ item_id: 'herb', quantity: 2, quality: 'normal' }], output_item_id: 'herbal_paste', output_quantity: 1, output_quality: 'normal' },
    { id: 'shared_qingxin_lotus_elixir', label: '共同丹炉清心莲丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'lotus_seed', quantity: 2, quality: 'normal' }, { item_id: 'lotus_root', quantity: 1, quality: 'normal' }, { item_id: 'herbal_paste', quantity: 1, quality: 'fine' }], output_item_id: 'qingxin_lotus_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_qingxin_lotus_partial', label: '共同丹炉清心偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'lotus_seed', quantity: 2, quality: 'normal' }, { item_id: 'lotus_root', quantity: 1, quality: 'normal' }, { item_id: 'herbal_paste', quantity: 1, quality: 'fine' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_qingxin_lotus_failed', label: '共同丹炉清心废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'lotus_seed', quantity: 2, quality: 'normal' }, { item_id: 'lotus_root', quantity: 1, quality: 'normal' }, { item_id: 'herbal_paste', quantity: 1, quality: 'fine' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_qingxin_lotus_rare', label: '共同丹炉清心奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'lotus_seed', quantity: 2, quality: 'normal' }, { item_id: 'lotus_root', quantity: 1, quality: 'normal' }, { item_id: 'herbal_paste', quantity: 1, quality: 'fine' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_warming_sweet_potato_pill', label: '共同丹炉温阳薯丸', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sweet_potato', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'warming_sweet_potato_pill', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_warming_sweet_potato_partial', label: '共同丹炉温阳偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sweet_potato', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_warming_sweet_potato_failed', label: '共同丹炉温阳废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sweet_potato', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_warming_sweet_potato_rare', label: '共同丹炉温阳奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sweet_potato', quantity: 2, quality: 'normal' }, { item_id: 'ginger', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_grain_breath_elixir', label: '共同丹炉谷气续行丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'rice', quantity: 3, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'grain_breath_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_grain_breath_partial', label: '共同丹炉谷气偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'rice', quantity: 3, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_grain_breath_failed', label: '共同丹炉谷气废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'rice', quantity: 3, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_grain_breath_rare', label: '共同丹炉谷气奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'rice', quantity: 3, quality: 'normal' }, { item_id: 'herb', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_sesame_courtesy_elixir', label: '共同丹炉芝香护礼丸', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sesame', quantity: 2, quality: 'normal' }, { item_id: 'tea', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'sesame_courtesy_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_sesame_courtesy_partial', label: '共同丹炉芝香偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sesame', quantity: 2, quality: 'normal' }, { item_id: 'tea', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_sesame_courtesy_failed', label: '共同丹炉芝香废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sesame', quantity: 2, quality: 'normal' }, { item_id: 'tea', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_sesame_courtesy_rare', label: '共同丹炉芝香奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'sesame', quantity: 2, quality: 'normal' }, { item_id: 'tea', quantity: 1, quality: 'normal' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_pumpkin_warmth_elixir', label: '共同丹炉南瓜聚火丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pumpkin', quantity: 2, quality: 'normal' }, { item_id: 'sesame_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'pumpkin_warmth_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_pumpkin_warmth_partial', label: '共同丹炉南瓜偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pumpkin', quantity: 2, quality: 'normal' }, { item_id: 'sesame_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_pumpkin_warmth_failed', label: '共同丹炉南瓜废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pumpkin', quantity: 2, quality: 'normal' }, { item_id: 'sesame_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_pumpkin_warmth_rare', label: '共同丹炉南瓜奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pumpkin', quantity: 2, quality: 'normal' }, { item_id: 'sesame_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_spicy_vitality_pill', label: '共同丹炉辛火行气丸', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_chili', quantity: 1, quality: 'fine' }, { item_id: 'sesame_paste', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }], output_item_id: 'spicy_vitality_pill', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_spicy_vitality_partial', label: '共同丹炉辛火偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_chili', quantity: 1, quality: 'fine' }, { item_id: 'sesame_paste', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_spicy_vitality_failed', label: '共同丹炉辛火废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_chili', quantity: 1, quality: 'fine' }, { item_id: 'sesame_paste', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_spicy_vitality_rare', label: '共同丹炉辛火奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_chili', quantity: 1, quality: 'fine' }, { item_id: 'sesame_paste', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_osmanthus_focus_elixir', label: '共同丹炉桂露凝神丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }, { item_id: 'lotus_seed', quantity: 1, quality: 'normal' }], output_item_id: 'osmanthus_focus_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_osmanthus_focus_partial', label: '共同丹炉桂露偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }, { item_id: 'lotus_seed', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_osmanthus_focus_failed', label: '共同丹炉桂露废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }, { item_id: 'lotus_seed', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_osmanthus_focus_rare', label: '共同丹炉桂露奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'tea', quantity: 2, quality: 'normal' }, { item_id: 'lotus_seed', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_tea_focus_elixir', label: '共同丹炉茶心凝神丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'tea_focus_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_tea_focus_partial', label: '共同丹炉茶心偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_tea_focus_failed', label: '共同丹炉茶心废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_tea_focus_rare', label: '共同丹炉茶心奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'honey', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_stone_root_guard_pill', label: '共同丹炉石根护脉丸', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }, { item_id: 'potato', quantity: 1, quality: 'normal' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }], output_item_id: 'stone_root_guard_pill', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_stone_root_guard_partial', label: '共同丹炉石根偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }, { item_id: 'potato', quantity: 1, quality: 'normal' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_stone_root_guard_failed', label: '共同丹炉石根废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }, { item_id: 'potato', quantity: 1, quality: 'normal' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_stone_root_guard_rare', label: '共同丹炉石根奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'radish', quantity: 2, quality: 'normal' }, { item_id: 'potato', quantity: 1, quality: 'normal' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_spirit_peach_elixir', label: '共同丹炉灵桃醒神丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'peach', quantity: 2, quality: 'fine' }, { item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'moon_herb', quantity: 1, quality: 'normal' }], output_item_id: 'spirit_peach_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_spirit_peach_partial', label: '共同丹炉灵桃偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'peach', quantity: 2, quality: 'fine' }, { item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'moon_herb', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_spirit_peach_failed', label: '共同丹炉灵桃废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'peach', quantity: 2, quality: 'fine' }, { item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'moon_herb', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_spirit_peach_rare', label: '共同丹炉灵桃奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'peach', quantity: 2, quality: 'fine' }, { item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'moon_herb', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_ley_crystal_focus_elixir', label: '共同丹炉灵脉凝神丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'ley_crystal_shard', quantity: 1, quality: 'normal' }], output_item_id: 'ley_crystal_focus_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_ley_crystal_focus_partial', label: '共同丹炉灵脉偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'ley_crystal_shard', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_ley_crystal_focus_failed', label: '共同丹炉灵脉废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'ley_crystal_shard', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_ley_crystal_focus_rare', label: '共同丹炉灵脉奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'ley_crystal_shard', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_wind_core_guard_pill', label: '共同丹炉风蚀护脉丸', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_ginger', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'wind_etched_core', quantity: 1, quality: 'normal' }], output_item_id: 'wind_core_guard_pill', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_wind_core_guard_partial', label: '共同丹炉风蚀偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_ginger', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'wind_etched_core', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_wind_core_guard_failed', label: '共同丹炉风蚀废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_ginger', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'wind_etched_core', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_wind_core_guard_rare', label: '共同丹炉风蚀奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'pickled_ginger', quantity: 1, quality: 'fine' }, { item_id: 'refined_quartz', quantity: 1, quality: 'fine' }, { item_id: 'wind_etched_core', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_marsh_luminous_cleansing_elixir', label: '共同丹炉泽光净息丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'marsh_spore_sample', quantity: 1, quality: 'normal' }, { item_id: 'luminous_algae', quantity: 1, quality: 'normal' }], output_item_id: 'marsh_luminous_cleansing_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_marsh_luminous_cleansing_partial', label: '共同丹炉泽光偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'marsh_spore_sample', quantity: 1, quality: 'normal' }, { item_id: 'luminous_algae', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_marsh_luminous_cleansing_failed', label: '共同丹炉泽光废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'marsh_spore_sample', quantity: 1, quality: 'normal' }, { item_id: 'luminous_algae', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_marsh_luminous_cleansing_rare', label: '共同丹炉泽光奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'marsh_spore_sample', quantity: 1, quality: 'normal' }, { item_id: 'luminous_algae', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_moon_pearl_calm_elixir', label: '共同丹炉月珠安神丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'moon_pearl', quantity: 1, quality: 'normal' }], output_item_id: 'moon_pearl_calm_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_moon_pearl_calm_partial', label: '共同丹炉月珠偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'moon_pearl', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_moon_pearl_calm_failed', label: '共同丹炉月珠废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'moon_pearl', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_moon_pearl_calm_rare', label: '共同丹炉月珠奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'green_tea_drink', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'moon_pearl', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_jade_orchid_focus_elixir', label: '共同丹炉玉兰凝心丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'jade_orchid', quantity: 1, quality: 'normal' }], output_item_id: 'jade_orchid_focus_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_jade_orchid_focus_partial', label: '共同丹炉玉兰偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'jade_orchid', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_jade_orchid_focus_failed', label: '共同丹炉玉兰废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'jade_orchid', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_jade_orchid_focus_rare', label: '共同丹炉玉兰奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'jade_orchid', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_rare_lotus_guard_elixir', label: '共同丹炉稀莲护心丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'lotus_seed_rare', quantity: 1, quality: 'normal' }], output_item_id: 'rare_lotus_guard_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_rare_lotus_guard_partial', label: '共同丹炉稀莲偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'lotus_seed_rare', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_rare_lotus_guard_failed', label: '共同丹炉稀莲废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'lotus_seed_rare', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_rare_lotus_guard_rare', label: '共同丹炉稀莲奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'herbal_paste', quantity: 1, quality: 'fine' }, { item_id: 'lotus_heart_powder', quantity: 1, quality: 'fine' }, { item_id: 'lotus_seed_rare', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
    { id: 'shared_jade_peach_spirit_elixir', label: '共同丹炉翠桃醒神丹', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'jade_peach', quantity: 1, quality: 'normal' }], output_item_id: 'jade_peach_spirit_elixir', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'success' },
    { id: 'shared_jade_peach_spirit_partial', label: '共同丹炉翠桃偏丹膏', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'jade_peach', quantity: 1, quality: 'normal' }], output_item_id: 'partial_elixir_slurry', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'partial' },
    { id: 'shared_jade_peach_spirit_failed', label: '共同丹炉翠桃废丹灰', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'jade_peach', quantity: 1, quality: 'normal' }], output_item_id: 'failed_elixir_ash', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'failed' },
    { id: 'shared_jade_peach_spirit_rare', label: '共同丹炉翠桃奇丹晶', station: 'alchemy_furnace', process_kind: 'alchemy_elixir', input_items: [{ item_id: 'candied_peach', quantity: 1, quality: 'fine' }, { item_id: 'osmanthus_honey', quantity: 1, quality: 'fine' }, { item_id: 'jade_peach', quantity: 1, quality: 'normal' }], output_item_id: 'rare_elixir_crystal', output_quantity: 1, output_quality: 'normal', alchemy_result_kind: 'rare' },
  ]
  const selectedSharedWorkshopRecipe = computed(() =>
    sharedWorkshopRecipeOptions.find(recipe => recipe.id === selectedSharedWorkshopRecipeId.value) ?? sharedWorkshopRecipeOptions[0] ?? null
  )
  const selectedSharedWorkshopSupportsAlchemyAuto = computed(() =>
    selectedSharedWorkshopRecipe.value?.process_kind === 'alchemy_elixir' &&
    selectedSharedWorkshopRecipe.value?.alchemy_result_kind === 'success'
  )
  const selectedSharedWorkshopAlchemyWeightProfile = computed(() => {
    const recipe = selectedSharedWorkshopRecipe.value
    if (!recipe || !selectedSharedWorkshopSupportsAlchemyAuto.value) return null
    return sharedWorkshopAlchemyWeightProfiles[recipe.id] ?? {
      profile: 'default_balanced',
      label: '通用平衡',
      weights: sharedAlchemyDefaultBaseWeights,
    }
  })
  const sharedWorkshopAlchemyWeightPreviewLabel = computed(() => {
    const profile = selectedSharedWorkshopAlchemyWeightProfile.value
    if (!profile) return ''
    const heat = sharedWorkshopAlchemyHeatProfiles[sharedWorkshopAlchemyHeatLevel.value] ?? sharedWorkshopAlchemyHeatProfiles.balanced
    const heatAdjustedWeights = applySharedWorkshopAlchemyHeatProfile(profile.weights, sharedWorkshopAlchemyHeatLevel.value)
    return `${profile.label} · ${heat.label} · 火候后 ${sharedWorkshopAlchemyWeightsLabel(heatAdjustedWeights)}`
  })
  const sharedWarehouseItemQuantity = (itemId: string, quality = 'normal') => (cohabitationStore.warehouse?.items ?? [])
    .filter(item => item.item_id === itemId && (item.quality || 'normal') === quality)
    .reduce((sum, item) => sum + warehouseAvailableQuantity(item), 0)
  const sharedWorkshopInputRows = computed(() => (selectedSharedWorkshopRecipe.value?.input_items ?? []).map(input => {
    const available = sharedWarehouseItemQuantity(input.item_id, input.quality)
    return {
      ...input,
      label: warehouseItemLabels[input.item_id] || input.item_id,
      available,
      enough: available >= input.quantity,
    }
  }))
  const sharedWorkshopOutputLabel = computed(() => {
    const recipe = selectedSharedWorkshopRecipe.value
    if (!recipe) return '未选择配方'
    return `${warehouseItemLabels[recipe.output_item_id] || recipe.output_item_id} x${recipe.output_quantity} · ${qualityLabel(recipe.output_quality)}`
  })
  const canProcessSelectedSharedWorkshopRecipe = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.process_shared_workshop_recipe === true &&
    Boolean(selectedSharedWorkshopRecipe.value) &&
    sharedWorkshopInputRows.value.length > 0 &&
    sharedWorkshopInputRows.value.every(row => row.enough)
  )
  const sharedDecorationStateEntries = computed<SharedDecorationStateEntry[]>(() =>
    (selectedContract.value?.shared_decoration_state ?? [])
      .filter((entry): entry is SharedDecorationStateEntry => Boolean(entry) && typeof entry === 'object')
  )
  const selectedOfflineSharedDecoration = computed(() =>
    sharedDecorationStateEntries.value.find(entry =>
      typeof entry.decoration_id === 'string' &&
      entry.decoration_id.length > 0 &&
      entry.state !== 'removed'
    ) ?? null
  )
  const selectedOfflineSharedDecorationId = computed(() =>
    typeof selectedOfflineSharedDecoration.value?.decoration_id === 'string'
      ? selectedOfflineSharedDecoration.value.decoration_id
      : ''
  )
  const selectedOfflineSharedDecorationKind = computed(() =>
    selectedOfflineSharedDecoration.value?.decoration_kind === 'memorial' ? 'memorial' : 'common'
  )
  const selectedOfflineSharedDecorationLocation = computed(() => {
    const entry = selectedOfflineSharedDecoration.value
    return [
      entry?.to_location_ref,
      entry?.placement_ref,
      entry?.from_location_ref,
      entry?.target_ref,
    ].find(value => typeof value === 'string' && value.length > 0) as string | undefined || ''
  })
  const selectedOfflineSharedDecorationTargetLabel = computed(() => {
    const decorationId = selectedOfflineSharedDecorationId.value
    if (!decorationId) return '未选择共同装饰'
    const location = selectedOfflineSharedDecorationLocation.value
    return location ? `${decorationId} -> ${location}` : decorationId
  })
  const canMoveSelectedSharedDecoration = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.move_shared_decoration === true &&
    Boolean(selectedOfflineSharedDecorationId.value)
  )
  const selectedOfflineRareItemDeliveryReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'rare_item_purchase' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineRareItemDeliveryReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineRareItemDeliveryReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择稀有物交付回执'
  })
  const selectedOfflineRareItemRefundReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'rare_item_purchase' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineRareItemRefundReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineRareItemRefundReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择稀有物退款回执'
  })
  const canRecordOfflineRareItemDeliveryReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_rare_item_delivery_receipt === true &&
    Boolean(selectedOfflineRareItemDeliveryReceiptDraft.value)
  )
  const canRecordOfflineRareItemRefundReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_rare_item_refund_receipt === true &&
    Boolean(selectedOfflineRareItemRefundReceiptDraft.value) &&
    offlineQueueRefundAcknowledged.value
  )
  const selectedOfflineFamilyMajorEventReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'family_major_event' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineFamilyMajorEventReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineFamilyMajorEventReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择家庭事件回执'
  })
  const selectedOfflineFamilyMajorEventRefundReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'family_major_event' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineFamilyMajorEventRefundReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineFamilyMajorEventRefundReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择家庭事件退款回执'
  })
  const canRecordOfflineFamilyMajorEventReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_family_major_event_receipt === true &&
    Boolean(selectedOfflineFamilyMajorEventReceiptDraft.value)
  )
  const canRecordOfflineFamilyMajorEventRefundReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_family_major_event_refund_receipt === true &&
    Boolean(selectedOfflineFamilyMajorEventRefundReceiptDraft.value) &&
    offlineQueueRefundAcknowledged.value
  )
  const selectedOfflineLimitedDecorationDeliveryReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'limited_decoration' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineLimitedDecorationDeliveryReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineLimitedDecorationDeliveryReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择限定装饰交付回执'
  })
  const selectedOfflineLimitedDecorationRefundReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'limited_decoration' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineLimitedDecorationRefundReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineLimitedDecorationRefundReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择限定装饰退款回执'
  })
  const canRecordOfflineLimitedDecorationDeliveryReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_limited_decoration_delivery_receipt === true &&
    Boolean(selectedOfflineLimitedDecorationDeliveryReceiptDraft.value)
  )
  const canRecordOfflineLimitedDecorationRefundReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_limited_decoration_refund_receipt === true &&
    Boolean(selectedOfflineLimitedDecorationRefundReceiptDraft.value) &&
    offlineQueueRefundAcknowledged.value
  )
  const selectedOfflineSharedDecorationRemovalReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'shared_decoration_removal' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineSharedDecorationRemovalReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineSharedDecorationRemovalReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择共同装修拆除回执'
  })
  const selectedOfflineSharedDecorationRemovalRefundReceiptDraft = computed<CohabitationFundLargeSpendDraft | null>(() =>
    (cohabitationStore.fund?.large_spend_drafts ?? []).find(draft =>
      draft.purpose === 'shared_decoration_removal' &&
      draft.state === 'executed' &&
      Boolean(draft.final_spend_ledger_id) &&
      (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending')
    ) ?? null
  )
  const selectedOfflineSharedDecorationRemovalRefundReceiptTargetLabel = computed(() => {
    const draft = selectedOfflineSharedDecorationRemovalRefundReceiptDraft.value
    return draft?.target_ref || draft?.id || '未选择共同装修拆除退款回执'
  })
  const canRecordOfflineSharedDecorationRemovalRefundReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_shared_decoration_removal_refund_receipt === true &&
    Boolean(selectedOfflineSharedDecorationRemovalRefundReceiptDraft.value) &&
    offlineQueueRefundAcknowledged.value
  )
  const canRecordOfflineSharedDecorationRemovalReceipt = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.record_shared_decoration_removal_receipt === true &&
    Boolean(selectedOfflineSharedDecorationRemovalReceiptDraft.value)
  )
  const sharedFarmFertilizerCatalog = [
    { itemId: 'basic_fertilizer', label: '基础肥料', queueAction: 'fertilize_shared_farm_basic' as CohabitationOfflineQueueAction, premium: false },
    { itemId: 'quality_fertilizer', label: '优质肥料', queueAction: 'fertilize_shared_farm_premium' as CohabitationOfflineQueueAction, premium: true },
    { itemId: 'speed_gro', label: '速长肥', queueAction: 'fertilize_shared_farm_premium' as CohabitationOfflineQueueAction, premium: true },
    { itemId: 'deluxe_speed_gro', label: '高级速长肥', queueAction: 'fertilize_shared_farm_premium' as CohabitationOfflineQueueAction, premium: true },
    { itemId: 'quality_retaining_soil', label: '保水壤土', queueAction: 'fertilize_shared_farm_premium' as CohabitationOfflineQueueAction, premium: true },
  ]
  const sharedFarmFertilizerOptions = computed(() => {
    const supported = cohabitationStore.sharedMap?.summary.supported_fertilizer_item_ids ?? []
    const supportedSet = new Set(supported)
    const options = supported.length > 0
      ? sharedFarmFertilizerCatalog.filter(option => supportedSet.has(option.itemId))
      : sharedFarmFertilizerCatalog
    return options.map(option => ({
      ...option,
      label: option.premium ? `${option.label}（高级）` : option.label,
    }))
  })
  const selectedSharedFarmFertilizerItemId = ref('basic_fertilizer')
  const selectedSharedFarmFertilizer = computed(() =>
    sharedFarmFertilizerOptions.value.find(option => option.itemId === selectedSharedFarmFertilizerItemId.value) ??
    sharedFarmFertilizerOptions.value[0] ??
    null
  )
  const canWaterSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    if (!plot || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedMap?.summary.farm_water_write_enabled !== true) return false
    return (plot.plot_state.state === 'planted' || plot.plot_state.state === 'growing') && plot.plot_state.watered !== true
  })
  const canCureSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    if (!plot || !cohabitationStore.canOpenSelectedContract) return false
    return plot.plot_state.infested === true
  })
  const canClearWeedsSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    if (!plot || !cohabitationStore.canOpenSelectedContract) return false
    return plot.plot_state.weedy === true
  })
  const canRemoveCropSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    if (!plot || !cohabitationStore.canOpenSelectedContract) return false
    return ['planted', 'growing', 'harvestable'].includes(plot.plot_state.state)
  })
  const canPlantSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    if (!plot || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedMap?.summary.farm_plant_write_enabled !== true) return false
    return plot.plot_state.state === 'tilled' && sharedFarmSeedOptions.some(option => option.itemId === sharedFarmSeedItemId.value)
  })
  const canFertilizeSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    const fertilizer = selectedSharedFarmFertilizer.value
    if (!plot || !fertilizer || !cohabitationStore.canOpenSelectedContract) return false
    const summary = cohabitationStore.sharedMap?.summary
    if ((summary?.farm_fertilize_write_enabled ?? summary?.farm_plant_write_enabled) !== true) return false
    if (fertilizer.premium && summary?.farm_premium_fertilizer_write_enabled !== true) return false
    return plot.plot_state.state !== 'wasteland' && !plot.plot_state.fertilizer
  })
  const canHarvestSelectedSharedFarmPlot = computed(() => {
    const plot = selectedSharedFarmPlot.value
    if (!plot || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedMap?.summary.farm_harvest_write_enabled !== true) return false
    return plot.plot_state.state === 'harvestable' && Boolean(plot.plot_state.crop_id)
  })
  const canFeedSelectedSharedAnimal = computed(() => {
    const animal = selectedSharedAnimal.value
    if (!animal || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedAnimals?.summary.animal_feed_write_enabled !== true) return false
    return animal.animal_state.was_fed !== true
  })
  const canBuySharedAnimal = computed(() => {
    const option = selectedSharedAnimalBuyOption.value
    if (!option || !cohabitationStore.canOpenSelectedContract) return false
    const summary = cohabitationStore.sharedAnimals?.summary
    if (summary?.animal_buy_write_enabled !== true || summary?.shared_fund_animal_purchase_enabled !== true) return false
    if (cohabitationStore.fund?.permissions?.can_spend_medium !== true) return false
    const balance = Math.max(0, Math.floor(Number(cohabitationStore.fund?.balance ?? selectedContract.value?.shared_fund?.balance) || 0))
    return option.unitPrice > 0 && balance >= option.unitPrice
  })
  const canSellSelectedSharedAnimal = computed(() => {
    const animal = selectedSharedAnimal.value
    if (!animal || !cohabitationStore.canOpenSelectedContract) return false
    const summary = cohabitationStore.sharedAnimals?.summary
    if (summary?.animal_sell_write_enabled !== true || summary?.shared_fund_animal_sale_income_enabled !== true) return false
    return animal.origin_owner_username === 'shared_fund' || animal.origin_owner_key === 'shared_fund' || String(animal.origin_owner_id || '').startsWith('shared_fund:')
  })
  const canPetSelectedSharedAnimal = computed(() => {
    const animal = selectedSharedAnimal.value
    if (!animal || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedAnimals?.summary.animal_pet_write_enabled !== true) return false
    return animal.animal_state.was_petted !== true
  })
  const canCollectSelectedSharedAnimalProduct = computed(() => {
    const animal = selectedSharedAnimal.value
    if (!animal || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedAnimals?.summary.animal_product_collect_write_enabled !== true) return false
    if (cohabitationStore.sharedAnimals?.summary.shared_warehouse_product_deposit_enabled !== true) return false
    return isSharedAnimalProductReady(animal)
  })
  const canCareSelectedSharedPet = computed(() => {
    const pet = selectedSharedPet.value
    if (!pet || !cohabitationStore.canOpenSelectedContract) return false
    if (cohabitationStore.sharedPets?.summary.pet_care_write_enabled !== true) return false
    if (cohabitationStore.sharedPets?.summary.shared_warehouse_pet_care_consume_enabled !== true) return false
    if (!sharedPetCareRiskConfirmed.value) return false
    return (selectedSharedPetCareItem.value?.quantity ?? 0) > 0
  })
  const canSettleSharedDailyOffline = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.actor_capabilities?.settle_shared_daily === true
  )
  const offlineQueueSupportedActionSet = computed(() => new Set(cohabitationStore.offlineStatus?.summary.offline_queue_supported_actions ?? []))
  const offlineQueueSupportedActionCount = computed(() => offlineQueueSupportedActionSet.value.size)
  const isOfflineQueueActionSupported = (action: CohabitationOfflineQueueAction) => offlineQueueSupportedActionSet.value.has(action)
  const offlineQueueTargetLabel = (kind: 'plot' | 'animal' | 'animal_purchase' | 'pet' | 'workshop' | 'decoration' | 'rare_item_receipt' | 'rare_item_refund_receipt' | 'family_major_event_receipt' | 'family_major_event_refund_receipt' | 'limited_decoration_receipt' | 'limited_decoration_refund_receipt' | 'decoration_refund_receipt' | 'decoration_receipt' | 'daily_settle' | 'auto_income') => {
    if (kind === 'plot') return selectedSharedFarmPlot.value?.id || '未选地块'
    if (kind === 'animal_purchase') return selectedSharedAnimalBuyOption.value?.label || '未选动物类型'
    if (kind === 'animal') return selectedSharedAnimal.value?.name || selectedSharedAnimal.value?.type || selectedSharedAnimal.value?.id || '未选动物'
    if (kind === 'pet') return selectedSharedPet.value?.name || selectedSharedPet.value?.type || selectedSharedPet.value?.id || '未选宠物'
    if (kind === 'decoration') return selectedOfflineSharedDecorationTargetLabel.value
    if (kind === 'rare_item_receipt') return selectedOfflineRareItemDeliveryReceiptTargetLabel.value
    if (kind === 'rare_item_refund_receipt') return selectedOfflineRareItemRefundReceiptTargetLabel.value
    if (kind === 'family_major_event_receipt') return selectedOfflineFamilyMajorEventReceiptTargetLabel.value
    if (kind === 'family_major_event_refund_receipt') return selectedOfflineFamilyMajorEventRefundReceiptTargetLabel.value
    if (kind === 'limited_decoration_receipt') return selectedOfflineLimitedDecorationDeliveryReceiptTargetLabel.value
    if (kind === 'limited_decoration_refund_receipt') return selectedOfflineLimitedDecorationRefundReceiptTargetLabel.value
    if (kind === 'decoration_refund_receipt') return selectedOfflineSharedDecorationRemovalRefundReceiptTargetLabel.value
    if (kind === 'decoration_receipt') return selectedOfflineSharedDecorationRemovalReceiptTargetLabel.value
    if (kind === 'daily_settle') return '共同庄园日结'
    if (kind === 'auto_income') return `${offlineAutoIncomePendingCount.value} 项待领`
    return selectedSharedWorkshopRecipe.value?.label || '未选配方'
  }
  const offlineQueueActionOptions = computed<OfflineQueueActionOption[]>(() => {
    const queueEnabled = cohabitationStore.canOpenSelectedContract && cohabitationStore.offlineStatus?.summary.offline_queue_merge_enabled === true
    const makeOption = (
      id: OfflineQueueUiActionId,
      queueAction: CohabitationOfflineQueueAction,
      label: string,
      targetKind: 'plot' | 'animal' | 'animal_purchase' | 'pet' | 'workshop' | 'decoration' | 'rare_item_receipt' | 'rare_item_refund_receipt' | 'family_major_event_receipt' | 'family_major_event_refund_receipt' | 'limited_decoration_receipt' | 'limited_decoration_refund_receipt' | 'decoration_refund_receipt' | 'decoration_receipt' | 'daily_settle' | 'auto_income',
      actionEnabled: boolean,
      disabledReason: string
    ): OfflineQueueActionOption => {
      const supported = isOfflineQueueActionSupported(queueAction)
      const enabled = queueEnabled && supported && actionEnabled
      return {
        id,
        queueAction,
        label,
        targetLabel: offlineQueueTargetLabel(targetKind),
        enabled,
        disabledReason: !queueEnabled
          ? '离线队列合并未开放'
          : !supported
            ? '服务端暂不支持该队列动作'
            : disabledReason,
      }
    }
    return [
      makeOption('water_shared_farm', 'water_shared_farm', '共同农田浇水', 'plot', canWaterSelectedSharedFarmPlot.value, '请选择可浇水地块'),
      makeOption('care_shared_farm_cure_pests', 'care_shared_farm', '共同农田除虫', 'plot', canCureSelectedSharedFarmPlot.value, '请选择有虫害地块'),
      makeOption('care_shared_farm_clear_weeds', 'care_shared_farm', '共同农田清草', 'plot', canClearWeedsSelectedSharedFarmPlot.value, '请选择有杂草地块'),
      makeOption('plant_shared_farm', 'plant_shared_farm', '共同农田种植', 'plot', canPlantSelectedSharedFarmPlot.value, '请选择可种植地块和种子'),
      makeOption('fertilize_shared_farm_basic', 'fertilize_shared_farm_basic', '共同农田基础施肥', 'plot', canFertilizeSelectedSharedFarmPlot.value && selectedSharedFarmFertilizer.value?.premium !== true, '请选择基础肥料并确认共同仓库库存'),
      makeOption('fertilize_shared_farm_premium', 'fertilize_shared_farm_premium', '共同农田高级施肥', 'plot', canFertilizeSelectedSharedFarmPlot.value && selectedSharedFarmFertilizer.value?.premium === true, '请选择高级肥料并确认共同仓库库存与权限'),
      makeOption('harvest_shared_farm', 'harvest_shared_farm', '共同农田收获入仓', 'plot', canHarvestSelectedSharedFarmPlot.value, '请选择可收获地块'),
      makeOption('feed_shared_animal', 'feed_shared_animal', '共同动物干草喂食', 'animal', canFeedSelectedSharedAnimal.value, '请选择可喂食动物并确认共同仓库干草'),
      makeOption('pet_shared_animal', 'pet_shared_animal', '共同动物抚摸', 'animal', canPetSelectedSharedAnimal.value, '请选择可抚摸动物'),
      makeOption('collect_shared_animal_product', 'collect_shared_animal_product', '共同动物产物入仓', 'animal', canCollectSelectedSharedAnimalProduct.value, '请选择可收取产物的动物'),
      makeOption('buy_shared_animal', 'buy_shared_animal', '共同动物买入', 'animal_purchase', canBuySharedAnimal.value, '请选择可购买动物并确认共同基金余额'),
      makeOption('sell_shared_animal', 'sell_shared_animal', '共同动物出售', 'animal', canSellSelectedSharedAnimal.value, '请选择共同基金购入的动物'),
      makeOption('care_shared_pet', 'care_shared_pet', '共同宠物用品照料', 'pet', canCareSelectedSharedPet.value, '请选择宠物、用品并完成高阶确认'),
      makeOption('process_shared_workshop_recipe', 'process_shared_workshop_recipe', '共同工坊处理', 'workshop', canProcessSelectedSharedWorkshopRecipe.value, '请选择材料充足且有权限的工坊配方'),
      makeOption('move_shared_decoration', 'move_shared_decoration', '共同装饰移动', 'decoration', canMoveSelectedSharedDecoration.value, '请选择可移动的共同装饰并确认建设权限'),
      makeOption('record_rare_item_delivery_receipt', 'record_rare_item_delivery_receipt', '稀有物交付回执', 'rare_item_receipt', canRecordOfflineRareItemDeliveryReceipt.value, '请选择已扣款且待交付回执的稀有物采购草案'),
      makeOption('record_rare_item_refund_receipt', 'record_rare_item_refund_receipt', '稀有物退款回执', 'rare_item_refund_receipt', canRecordOfflineRareItemRefundReceipt.value, '请选择已扣款且待退款回执的稀有物采购草案，并确认补偿方案'),
      makeOption('record_family_major_event_receipt', 'record_family_major_event_receipt', '家庭事件回执', 'family_major_event_receipt', canRecordOfflineFamilyMajorEventReceipt.value, '请选择已扣款且待回执的家庭重大事件草案'),
      makeOption('record_family_major_event_refund_receipt', 'record_family_major_event_refund_receipt', '家庭事件退款回执', 'family_major_event_refund_receipt', canRecordOfflineFamilyMajorEventRefundReceipt.value, '请选择已扣款且待退款回执的家庭重大事件草案，并确认补偿方案'),
      makeOption('record_limited_decoration_delivery_receipt', 'record_limited_decoration_delivery_receipt', '限定装饰交付回执', 'limited_decoration_receipt', canRecordOfflineLimitedDecorationDeliveryReceipt.value, '请选择已扣款且待交付回执的限定装饰草案'),
      makeOption('record_limited_decoration_refund_receipt', 'record_limited_decoration_refund_receipt', '限定装饰退款回执', 'limited_decoration_refund_receipt', canRecordOfflineLimitedDecorationRefundReceipt.value, '请选择已扣款且待退款回执的限定装饰草案，并确认补偿方案'),
      makeOption('record_shared_decoration_removal_refund_receipt', 'record_shared_decoration_removal_refund_receipt', '共同装修拆除退款回执', 'decoration_refund_receipt', canRecordOfflineSharedDecorationRemovalRefundReceipt.value, '请选择已扣款且待退款回执的共同装修拆除草案，并确认补偿方案'),
      makeOption('record_shared_decoration_removal_receipt', 'record_shared_decoration_removal_receipt', '共同装修拆除回执', 'decoration_receipt', canRecordOfflineSharedDecorationRemovalReceipt.value, '请选择已扣款且待回执的共同装修拆除草案'),
      makeOption('settle_shared_daily', 'settle_shared_daily', '共同庄园日结', 'daily_settle', canSettleSharedDailyOffline.value, '当前契约暂不可离线日结'),
      makeOption('collect_offline_auto_income', 'collect_offline_auto_income', '离线自动收益领取', 'auto_income', canCollectOfflineAutoIncome.value, '当前没有可领取自动收益或缺少权限'),
    ]
  })
  const selectedOfflineQueueActionOption = computed(() =>
    offlineQueueActionOptions.value.find(option => option.id === selectedOfflineQueueActionId.value) ?? offlineQueueActionOptions.value[0] ?? null
  )
  const canSubmitOfflineQueueMerge = computed(() => selectedOfflineQueueActionOption.value?.enabled === true)
  const canPreflightOfflineConflicts = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.summary.offline_conflict_preflight_enabled === true &&
    cohabitationStore.offlineStatus?.actor_capabilities?.preflight_offline_conflicts === true
  )
  const offlineQueueMergeRows = computed<OfflineQueueResultRow[]>(() => {
    const merge = cohabitationStore.offlineQueueMerge
    if (!merge) return []
    const results = [...(merge.results ?? []), ...(merge.rejected ?? [])]
    return results.map((entry, index) => ({
      id: entry.operation_id || `${entry.action}-${index}`,
      label: offlineQueueActionLabel(entry.action),
      status: offlineQueueResultStatusLabel(entry.status),
      detail: offlineQueueResultDetail(entry),
      ok: entry.status === 'committed' || entry.status === 'idempotent',
    }))
  })
  const offlineConflictResolutionLabel = computed(() => {
    const resolution = cohabitationStore.offlineQueueMerge?.offline_conflict_resolution
    if (!resolution) return ''
    const committed = Math.max(0, Math.floor(Number(resolution.committed_count) || 0))
    const idempotent = Math.max(0, Math.floor(Number(resolution.idempotent_count) || 0))
    const rejected = Math.max(0, Math.floor(Number(resolution.rejected_count) || 0))
    const ledgerCount = Math.max(0, Math.floor(Number(resolution.ledger_count) || 0))
    const beforeRevision = Math.max(0, Math.floor(Number(resolution.server_queue_revision_before) || 0))
    const afterRevision = Math.max(0, Math.floor(Number(resolution.server_queue_revision_after) || beforeRevision))
    const stale = resolution.client_queue_stale === true ? '客户端基线过期，按服务端最新状态处理' : '客户端基线一致'
    return `冲突解决证据：提交 ${committed} / 幂等 ${idempotent} / 拒绝 ${rejected} · 流水 ${ledgerCount} 笔 · revision ${beforeRevision}->${afterRevision} · ${stale}`
  })
  const offlineConflictAutoResolutionLabel = computed(() => {
    const resolution = cohabitationStore.offlineConflictAutoResolution
    if (!resolution) return ''
    const accepted = Math.max(0, Math.floor(Number(resolution.accepted_count) || 0))
    const rejected = Math.max(0, Math.floor(Number(resolution.rejected_count) || 0))
    const unsupported = Math.max(0, Math.floor(Number(resolution.unsupported_action_count) || 0))
    const stale = resolution.client_queue_stale === true ? '本地基线过期' : '本地基线一致'
    return `自动解决：${accepted} 项提交 / ${rejected} 项拒绝 · 不支持 ${unsupported} 项 · ${stale}`
  })
  const offlineConflictPreflightLabel = computed(() => {
    const preflight = cohabitationStore.offlineConflictPreflight
    if (!preflight) return ''
    const clientRevision = Math.max(0, Math.floor(Number(preflight.client_queue_revision) || 0))
    const serverRevision = Math.max(0, Math.floor(Number(preflight.server_queue_revision) || 0))
    const unsupportedCount = Array.isArray(preflight.unsupported_actions) ? preflight.unsupported_actions.length : 0
    const stale = preflight.client_queue_stale === true ? '客户端基线已过期，请刷新后合并' : '客户端基线与服务端一致'
    return `冲突预检：客户端 ${clientRevision} / 服务端 ${serverRevision} · ${stale} · 不支持动作 ${unsupportedCount} 项`
  })
  const offlineQueueRevisionStateLabel = computed(() => {
    const merge = cohabitationStore.offlineQueueMerge
    if (!merge) return '尚未合并离线队列'
    const clientRevision = Math.max(0, Math.floor(Number(merge.client_queue_revision) || 0))
    const beforeRevision = Math.max(0, Math.floor(Number(merge.server_queue_revision_before) || 0))
    const afterRevision = Math.max(0, Math.floor(Number(merge.server_queue_revision_after) || beforeRevision))
    const stale = merge.client_queue_stale === true ? '客户端基线已过期，服务端按最新共同资产合并' : '客户端基线未过期'
    return `队列 revision：客户端 ${clientRevision} / 服务端 ${beforeRevision} -> ${afterRevision} · ${stale}`
  })
  const normalizedWarehouseDepositQuantity = computed(() => Math.max(0, Math.floor(Number(warehouseDepositQuantity.value) || 0)))
  const canDepositWarehouseItem = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.warehouse?.summary.deposit_enabled === true &&
    cohabitationStore.warehouse?.permissions.can_deposit === true &&
    Boolean(warehouseDepositItemId.value) &&
    normalizedWarehouseDepositQuantity.value > 0 &&
    normalizedWarehouseDepositQuantity.value <= 99
  )
  const canRecoverWarehouseGovernance = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    warehouseGovernanceNeedsRecovery.value &&
    warehouseGovernanceRecoverReason.value.trim().length >= 4
  )
  const normalizedFundContributionAmount = computed(() => Math.max(0, Math.floor(Number(fundContributionAmount.value) || 0)))
  const canUseFundContribution = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.fund?.summary.contribution_enabled === true &&
    normalizedFundContributionAmount.value > 0
  )
  const fallbackFundPurchaseOptions: FundPurchaseOption[] = [
    {
      label: '白菜种子 x2',
      itemId: 'seed_cabbage',
      targetRef: 'shop:seed_cabbage',
      quantity: 2,
      amount: 20,
      purpose: 'seed_budget',
    },
    {
      label: '萝卜种子 x2',
      itemId: 'seed_radish',
      targetRef: 'shop:seed_radish',
      quantity: 2,
      amount: 30,
      purpose: 'seed_budget',
    },
    {
      label: '水稻种子 x2',
      itemId: 'seed_rice',
      targetRef: 'shop:seed_rice',
      quantity: 2,
      amount: 40,
      purpose: 'seed_budget',
    },
    { label: '小麦种子 x2', itemId: 'seed_wheat', targetRef: 'shop:seed_wheat', quantity: 2, amount: 36, purpose: 'seed_budget' },
    { label: '玉米种子 x2', itemId: 'seed_corn', targetRef: 'shop:seed_corn', quantity: 2, amount: 60, purpose: 'seed_budget' },
    { label: '茶树苗 x2', itemId: 'seed_tea', targetRef: 'shop:seed_tea', quantity: 2, amount: 90, purpose: 'seed_budget' },
    { label: '莲藕苗 x2', itemId: 'seed_lotus', targetRef: 'shop:seed_lotus', quantity: 2, amount: 70, purpose: 'seed_budget' },
    { label: '芜菁种子 x2', itemId: 'seed_turnip', targetRef: 'shop:seed_turnip', quantity: 2, amount: 32, purpose: 'seed_budget' },
    { label: '胡萝卜种子 x2', itemId: 'seed_carrot', targetRef: 'shop:seed_carrot', quantity: 2, amount: 24, purpose: 'seed_budget' },
    { label: '红薯种苗 x2', itemId: 'seed_sweet_potato', targetRef: 'shop:seed_sweet_potato', quantity: 2, amount: 36, purpose: 'seed_budget' },
    { label: '南瓜种子 x2', itemId: 'seed_pumpkin', targetRef: 'shop:seed_pumpkin', quantity: 2, amount: 56, purpose: 'seed_budget' },
    { label: '芝麻种子 x2', itemId: 'seed_sesame', targetRef: 'shop:seed_sesame', quantity: 2, amount: 44, purpose: 'seed_budget' },
    { label: '桃树苗 x2', itemId: 'seed_peach', targetRef: 'shop:seed_peach', quantity: 2, amount: 110, purpose: 'seed_budget' },
    { label: '辣椒种子 x2', itemId: 'seed_chili', targetRef: 'shop:seed_chili', quantity: 2, amount: 48, purpose: 'seed_budget' },
    {
      label: '鱼饲料 x1',
      itemId: 'fish_feed',
      targetRef: 'shop:fish_feed',
      quantity: 1,
      amount: 30,
      purpose: 'feed_budget',
    },
    {
      label: '精饲料 x1',
      itemId: 'premium_feed',
      targetRef: 'shop:premium_feed',
      quantity: 1,
      amount: 200,
      purpose: 'feed_budget',
    },
    {
      label: '滋补饲料 x1',
      itemId: 'nourishing_feed',
      targetRef: 'shop:nourishing_feed',
      quantity: 1,
      amount: 250,
      purpose: 'feed_budget',
    },
    {
      label: '活力饲料 x1',
      itemId: 'vitality_feed',
      targetRef: 'shop:vitality_feed',
      quantity: 1,
      amount: 300,
      purpose: 'feed_budget',
    },
  ]
  const mapFundPurchaseCatalogItem = (item: CohabitationFundShopPurchaseCatalogItem): FundPurchaseOption | null => {
    const quantity = Math.max(1, Math.floor(Number(item.default_quantity) || (item.category === 'seed' ? 2 : 1)))
    const amount = Math.max(0, Math.floor(Number(item.default_amount) || Number(item.unit_price) * quantity))
    const purpose = item.allowed_purposes?.[0] || (item.category === 'feed' ? 'feed_budget' : 'seed_budget')
    if (!item.target_ref || !item.item_id || amount <= 0) return null
    return {
      label: `${item.label || item.item_id} x${quantity}`,
      itemId: item.item_id,
      targetRef: item.target_ref,
      quantity,
      amount,
      purpose,
    }
  }
  const fundPurchaseOptions = computed<FundPurchaseOption[]>(() => {
    const summary = cohabitationStore.fund?.summary
    const catalog = summary?.auto_purchase_catalog?.length
      ? summary.auto_purchase_catalog
      : summary?.allowed_shop_purchase_items ?? []
    const mapped = catalog.map(mapFundPurchaseCatalogItem).filter((item): item is FundPurchaseOption => Boolean(item))
    return mapped.length > 0 ? mapped : fallbackFundPurchaseOptions
  })
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
    largeFundSpendPurposeIds.includes(value as FundLargeSpendPurpose)
  const isHighRiskLargeFundSpendPurpose = (value: string): value is FundLargeSpendPurpose =>
    highRiskLargeFundSpendPurposeIds.includes(value as FundLargeSpendPurpose)
  const fundLargeSpendOptions = computed<FundLargeSpendOption[]>(() =>
    (cohabitationStore.fund?.summary.allowed_large_spend_purposes ?? [])
      .filter(purpose => isLargeFundSpendPurpose(purpose.id))
      .map(purpose => ({
        label: purpose.label,
        purpose: purpose.id as FundLargeSpendPurpose,
        category: purpose.category,
        maxAmount: purpose.max_amount,
        confirmationRequired: purpose.confirmation_required,
      }))
  )
  const selectedFundLargeSpendOption = computed(() =>
    fundLargeSpendOptions.value.find(option => option.purpose === fundLargeDraftPurpose.value) ?? fundLargeSpendOptions.value[0] ?? null
  )
  const selectedLargeFundSpendIsHighRisk = computed(() =>
    selectedFundLargeSpendOption.value ? isHighRiskLargeFundSpendPurpose(selectedFundLargeSpendOption.value.purpose) : false
  )
  const selectedLargeFundSpendPolicyLabel = computed(() => {
    const purpose = selectedFundLargeSpendOption.value?.purpose
    if (purpose === 'family_major_event') return '家庭 / 孩子回执待收口'
    if (purpose === 'shared_decoration_removal') return '拆除 / 退款回执待收口'
    if (purpose === 'rare_item_purchase' || purpose === 'limited_decoration') return '交付 / 退款回执待收口'
    return selectedFundLargeSpendOption.value?.confirmationRequired ? '双方确认后执行' : '确认安全阀关闭'
  })
  const selectedLargeFundSpendExecutionSummary = computed(() => {
    const purpose = selectedFundLargeSpendOption.value?.purpose
    if (purpose === 'family_major_event') return '执行会扣共同基金；家庭事件和孩子安排后续通过回执收口，不直接改个人家庭主状态。'
    if (purpose === 'shared_decoration_removal') return '执行会扣共同基金；共同装修拆除完成或退款后续通过回执收口，不直接改个人小屋主状态。'
    if (purpose === 'rare_item_purchase' || purpose === 'limited_decoration') return '执行会扣共同基金；采购交付或退款后续通过回执收口，不直接改个人背包或小屋。'
    return '执行会扣共同基金并写建筑流水；真实落账和材料消耗在建筑页继续提交。'
  })
  const fundLargeDraftTargetPlaceholder = computed(() => {
    const purpose = selectedFundLargeSpendOption.value?.purpose ?? fundLargeDraftPurpose.value
    return largeFundSpendTargetRefs[purpose] ?? 'target_ref'
  })
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

  const syncLargeFundDraftTargetRef = (force = false) => {
    const purpose = selectedFundLargeSpendOption.value?.purpose ?? fundLargeDraftPurpose.value
    if (!isLargeFundSpendPurpose(purpose)) return
    const current = fundLargeDraftTargetRef.value.trim()
    const defaultRefs = Object.values(largeFundSpendTargetRefs)
    if (force || !current || defaultRefs.includes(current)) {
      fundLargeDraftTargetRef.value = largeFundSpendTargetRefs[purpose]
    }
  }

  const handleLargeFundDraftPurposeChange = () => {
    syncLargeFundDraftTargetRef(true)
    const option = selectedFundLargeSpendOption.value
    if (option && normalizedFundLargeDraftAmount.value > option.maxAmount) {
      fundLargeDraftAmount.value = option.maxAmount
    }
    if (normalizedFundLargeDraftAmount.value < fundLargeDraftMinAmount.value) {
      fundLargeDraftAmount.value = fundLargeDraftMinAmount.value
    }
  }

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

  const resetSharedPetCareConfirmation = () => {
    sharedPetCareRiskAcknowledged.value = false
    sharedPetCareConfirmationText.value = ''
  }

  const selectContract = async (contractId: string) => {
    await cohabitationStore.selectContract(contractId)
    warehouseActionMessage.value = ''
    warehouseGovernanceRecoverReason.value = ''
    sharedFarmActionMessage.value = ''
    sharedAnimalActionMessage.value = ''
    sharedPetActionMessage.value = ''
    sharedWorkshopActionMessage.value = ''
    sharedWorkshopLastResultRows.value = []
    activeSharedMapRegionIndex.value = 0
    selectedSharedFarmPlotId.value = ''
    selectedSharedAnimalId.value = ''
    selectedSharedPetId.value = ''
    selectedSharedPetCareItemId.value = 'vitality_feed'
    resetSharedPetCareConfirmation()
    fundActionMessage.value = ''
    familyOrderActionMessage.value = ''
    familyReputationActionMessage.value = ''
    familyBuildingActionMessage.value = ''
    familyVisibilityActionMessage.value = ''
    familyFestivalSeatActionMessage.value = ''
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

  const selectSharedFarmPlot = (plot: CohabitationSharedPlot) => {
    selectedSharedFarmPlotId.value = plot.id
    sharedFarmActionMessage.value = ''
    sharedFarmActionOk.value = false
  }

  const setActiveSharedMapRegion = (regionIndex: number) => {
    activeSharedMapRegionIndex.value = regionIndex
    if (!pagedSharedFarmPlots.value.some(plot => plot.id === selectedSharedFarmPlotId.value)) {
      selectedSharedFarmPlotId.value = ''
      sharedFarmActionMessage.value = ''
      sharedFarmActionOk.value = false
    }
  }

  const selectSharedAnimal = (animal: CohabitationSharedAnimal) => {
    selectedSharedAnimalId.value = animal.id
    sharedAnimalActionMessage.value = ''
    sharedAnimalActionOk.value = false
  }

  const buySelectedSharedAnimal = async () => {
    const option = selectedSharedAnimalBuyOption.value
    if (!option) return
    sharedAnimalActionMessage.value = ''
    sharedAnimalActionOk.value = false
    try {
      const result = await cohabitationStore.buySharedAnimal({
        animal_type: option.type,
        name: sharedAnimalBuyName.value.trim(),
        memo: `前端共同动物购买：${option.type}`,
        idempotency_key: `ui-shared-animal-buy-${option.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedAnimalId.value = result?.animal?.id || selectedSharedAnimalId.value
      sharedAnimalActionOk.value = true
      sharedAnimalBuyName.value = ''
      const amount = result?.animal_action?.total_amount ?? option.unitPrice
      sharedAnimalActionMessage.value = result?.idempotent || result?.already_bought || result?.already_purchased
        ? '已读回共同动物购买记录'
        : `共同动物已购买，扣除共同基金 ${amount} 文`
    } catch (error) {
      sharedAnimalActionMessage.value = error instanceof Error ? error.message : '购买共同动物失败'
    }
  }

  const sellSelectedSharedAnimal = async () => {
    const animal = selectedSharedAnimal.value
    if (!animal) return
    sharedAnimalActionMessage.value = ''
    sharedAnimalActionOk.value = false
    try {
      const result = await cohabitationStore.sellSharedAnimal({
        animal_id: animal.id,
        memo: `前端共同动物出售：${animal.id}`,
        idempotency_key: `ui-shared-animal-sell-${animal.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedAnimalId.value = ''
      sharedAnimalActionOk.value = true
      const amount = result?.animal_action?.total_amount ?? 0
      const balance = result?.animal_action?.balance_after
      sharedAnimalActionMessage.value = result?.idempotent || result?.already_sold
        ? '已读回共同动物出售记录'
        : typeof balance === 'number'
          ? `共同动物已出售，基金入账 ${amount} 文，余额 ${balance} 文`
          : `共同动物已出售，基金入账 ${amount} 文`
    } catch (error) {
      sharedAnimalActionMessage.value = error instanceof Error ? error.message : '出售共同动物失败'
    }
  }

  const selectSharedPet = (pet: CohabitationSharedPet) => {
    selectedSharedPetId.value = pet.id
    sharedPetActionMessage.value = ''
    sharedPetActionOk.value = false
    resetSharedPetCareConfirmation()
  }

  const waterSelectedSharedFarmPlot = async () => {
    const plot = selectedSharedFarmPlot.value
    if (!plot) return
    sharedFarmActionMessage.value = ''
    sharedFarmActionOk.value = false
    try {
      const result = await cohabitationStore.waterSharedFarmPlot({
        plot_id: plot.id,
        memo: `前端共同农田浇水：${plot.id}`,
        idempotency_key: `ui-shared-farm-water-${plot.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedFarmPlotId.value = result?.plot?.id || plot.id
      sharedFarmActionOk.value = true
      sharedFarmActionMessage.value = result?.idempotent || result?.already_watered
        ? '已读回共同农田浇水记录'
        : '共同农田已浇水，契约地图和农田流水已刷新'
    } catch (error) {
      sharedFarmActionMessage.value = error instanceof Error ? error.message : '浇水共同农田失败'
    }
  }

  const sharedFarmCareActionLabel = (action: 'cure_pests' | 'clear_weeds' | 'remove_crop') => {
    if (action === 'cure_pests') return '除虫'
    if (action === 'clear_weeds') return '清草'
    return '铲除作物'
  }
  const offlineQueueActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      water_shared_farm: '共同农田浇水',
      care_shared_farm: '共同农田管护',
      plant_shared_farm: '共同农田种植',
      fertilize_shared_farm_basic: '共同农田基础施肥',
      fertilize_shared_farm_premium: '共同农田高级施肥',
      harvest_shared_farm: '共同农田收获入仓',
      feed_shared_animal: '共同动物喂食',
      pet_shared_animal: '共同动物抚摸',
      collect_shared_animal_product: '共同动物产物入仓',
      buy_shared_animal: '共同动物买入',
      sell_shared_animal: '共同动物出售',
      care_shared_pet: '共同宠物照料',
      process_shared_workshop_recipe: '共同工坊处理',
      move_shared_decoration: '共同装饰移动',
      record_rare_item_delivery_receipt: '稀有物交付回执',
      record_rare_item_refund_receipt: '稀有物退款回执',
      record_family_major_event_receipt: '家庭事件回执',
      record_family_major_event_refund_receipt: '家庭事件退款回执',
      record_limited_decoration_delivery_receipt: '限定装饰交付回执',
      record_limited_decoration_refund_receipt: '限定装饰退款回执',
      record_shared_decoration_removal_refund_receipt: '共同装修拆除退款回执',
      record_shared_decoration_removal_receipt: '共同装修拆除回执',
      settle_shared_daily: '共同庄园日结',
      collect_offline_auto_income: '离线自动收益领取',
    }
    return labels[action] || action
  }
  const offlineQueueResultStatusLabel = (status: string) => {
    if (status === 'committed') return '已提交'
    if (status === 'idempotent') return '幂等读回'
    if (status === 'rejected') return '已拒绝'
    return status || '未记录'
  }
  const offlineQueueResultDetail = (entry: CohabitationOfflineQueueMergeEntry) => {
    if (entry.status === 'rejected') return entry.reason || '服务端权威拒绝，未改个人存档或共同资产'
    if (entry.action === 'settle_shared_daily') {
      const farmGrowthCount = Math.max(0, Math.floor(Number(entry.farm_growth_count) || 0))
      const healthBonusCount = Math.max(0, Math.floor(Number(entry.farm_health_bonus_consumed_count) || 0))
      const moodBonusCount = Math.max(0, Math.floor(Number(entry.animal_mood_bonus_consumed_count) || 0))
      const harvestableCount = Math.max(0, Math.floor(Number(entry.farm_harvestable_count) || 0))
      const hungerCount = Math.max(0, Math.floor(Number(entry.animal_hunger_increased_count) || 0))
      return [
        `农田成长 ${farmGrowthCount}`,
        `健康消耗 ${healthBonusCount}`,
        `心情消耗 ${moodBonusCount}`,
        harvestableCount ? `成熟 ${harvestableCount}` : '',
        hungerCount ? `饥饿增加 ${hungerCount}` : '',
        entry.shared_map_changed === true ? '地图已变更' : '',
        entry.shared_animals_changed === true ? '动物已变更' : '',
        entry.personal_save_changed === false ? '个人存档未改' : '',
        entry.shared_warehouse_changed === false ? '共同仓库未改' : '',
        entry.shared_fund_changed === false ? '共同基金未改' : '',
        entry.client_base_stale === true ? '客户端基线过期' : '',
      ].filter(Boolean).join(' · ') || '共同庄园日结已按服务端契约状态合并'
    }
    if (entry.action === 'collect_offline_auto_income') {
      const collected = Math.max(0, Math.floor(Number(entry.collected_count) || 0))
      const farmCount = Math.max(0, Math.floor(Number(entry.farm_harvest_count) || 0))
      const animalCount = Math.max(0, Math.floor(Number(entry.animal_product_count) || 0))
      const remainingCount = Math.max(0, Math.floor(Number(entry.remaining_pending_count) || 0))
      const batchMode = typeof entry.batch_mode === 'string' ? entry.batch_mode : ''
      const ledgerIds = [entry.ledger_id, ...(entry.warehouse_ledger_ids ?? [])].filter(Boolean)
      return [
        `领取 ${collected} 项`,
        `农田 ${farmCount}`,
        `动物产物 ${animalCount}`,
        batchMode === 'targeted' ? '按目标批处理' : '',
        remainingCount ? `剩余 ${remainingCount}` : '',
        ledgerIds.length ? `流水 ${ledgerIds.length} 笔` : '',
        '个人存档未改',
        entry.client_base_stale === true ? '客户端基线过期' : '',
      ].filter(Boolean).join(' · ')
    }
    if (entry.action === 'buy_shared_animal' || entry.action === 'sell_shared_animal') {
      const amount = Math.max(0, Math.floor(Number(entry.total_amount) || Number(entry.unit_price) || 0))
      const balanceAfter = Math.max(0, Math.floor(Number(entry.balance_after) || 0))
      const animalName = typeof entry.animal_name === 'string' && entry.animal_name ? entry.animal_name : ''
      const animalType = typeof entry.animal_type === 'string' && entry.animal_type ? entry.animal_type : ''
      const animalId = typeof entry.animal_id === 'string' && entry.animal_id ? entry.animal_id : ''
      const fundLedgerIds = [
        typeof entry.fund_ledger_id === 'string' ? entry.fund_ledger_id : '',
        ...(Array.isArray(entry.fund_ledger_ids) ? entry.fund_ledger_ids : []),
      ].filter(Boolean)
      return [
        animalName || animalType || animalId ? `动物 ${animalName || animalType || animalId}` : '',
        amount ? `基金${entry.action === 'buy_shared_animal' ? '支出' : '入账'} ${amount}` : '',
        balanceAfter ? `余额 ${balanceAfter}` : '',
        fundLedgerIds.length ? `基金流水 ${fundLedgerIds.length} 笔` : '',
        entry.personal_save_changed === false ? '个人存档未改' : '',
        entry.client_base_stale === true ? '客户端基线过期' : '',
      ].filter(Boolean).join(' · ') || '共同动物买卖已按服务端状态合并'
    }
    if (entry.action === 'move_shared_decoration') {
      const decorationId = typeof entry.decoration_id === 'string' ? entry.decoration_id : ''
      const toLocation = typeof entry.to_location_ref === 'string' ? entry.to_location_ref : ''
      const permissions = Array.isArray(entry.required_permission_keys) ? entry.required_permission_keys.filter(Boolean).join(' / ') : ''
      return [
        decorationId ? `装饰 ${decorationId}` : '',
        toLocation ? `目标 ${toLocation}` : '',
        permissions ? `权限 ${permissions}` : '',
        entry.shared_decoration_state_changed === true ? '共同装饰状态已写' : '',
        entry.personal_home_mutated === false ? '个人小屋未改' : '',
        entry.shared_fund_changed === false ? '共同基金未改' : '',
        entry.shared_warehouse_changed === false ? '共同仓库未改' : '',
        entry.client_base_stale === true ? '客户端基线过期' : '',
      ].filter(Boolean).join(' · ') || '共同装饰移动已按服务端契约状态合并'
    }
    if (entry.action === 'record_rare_item_refund_receipt' || entry.action === 'record_family_major_event_refund_receipt' || entry.action === 'record_limited_decoration_refund_receipt' || entry.action === 'record_shared_decoration_removal_refund_receipt') {
      const isRareItemRefund = entry.action === 'record_rare_item_refund_receipt'
      const isFamilyMajorEventRefund = entry.action === 'record_family_major_event_refund_receipt'
      const isLimitedDecorationRefund = entry.action === 'record_limited_decoration_refund_receipt'
      const draftId = typeof entry.draft_id === 'string' ? entry.draft_id : ''
      const receiptRef = typeof entry.receipt_ref === 'string' ? entry.receipt_ref : ''
      const refundAmount = Math.max(0, Math.floor(Number(entry.refund_amount) || 0))
      const balanceAfter = Math.max(0, Math.floor(Number(entry.balance_after) || 0))
      const fundLedgerId = typeof entry.refund_fund_ledger_id === 'string' ? entry.refund_fund_ledger_id : ''
      return [
        draftId ? `草案 ${draftId}` : '',
        receiptRef ? `回执 ${receiptRef}` : '',
        refundAmount ? `退回基金 ${refundAmount}` : '',
        balanceAfter ? `余额 ${balanceAfter}` : '',
        fundLedgerId ? '基金退款流水已写' : '',
        isFamilyMajorEventRefund && entry.contract_family_state_changed === false ? '家庭事件状态未改' : '',
        entry.shared_decoration_state_changed === false ? '共同装饰状态未改' : '',
        isFamilyMajorEventRefund && entry.personal_family_state_mutated === false ? '个人家庭未改' : '',
        entry.personal_home_mutated === false ? '个人小屋未改' : '',
        entry.personal_inventory_merged === false ? '个人背包未改' : '',
        entry.shared_warehouse_changed === false ? '共同仓库未改' : '',
        entry.client_base_stale === true ? '客户端基线过期' : '',
      ].filter(Boolean).join(' · ') || (isFamilyMajorEventRefund ? '家庭事件退款回执已按服务端共同基金状态合并' : (isRareItemRefund ? '稀有物退款回执已按服务端共同基金状态合并' : (isLimitedDecorationRefund ? '限定装饰退款回执已按服务端共同基金状态合并' : '共同装修拆除退款回执已按服务端共同基金状态合并')))
    }
    if (entry.action === 'record_rare_item_delivery_receipt' || entry.action === 'record_family_major_event_receipt' || entry.action === 'record_limited_decoration_delivery_receipt' || entry.action === 'record_shared_decoration_removal_receipt') {
      const isRareItemDelivery = entry.action === 'record_rare_item_delivery_receipt'
      const isFamilyMajorEventReceipt = entry.action === 'record_family_major_event_receipt'
      const isLimitedDecorationDelivery = entry.action === 'record_limited_decoration_delivery_receipt'
      const itemId = typeof entry.item_id === 'string' ? entry.item_id : ''
      const decorationId = typeof entry.decoration_id === 'string' ? entry.decoration_id : ''
      const draftId = typeof entry.draft_id === 'string' ? entry.draft_id : ''
      const receiptRef = typeof entry.receipt_ref === 'string' ? entry.receipt_ref : ''
      const permissions = Array.isArray(entry.required_permission_keys) ? entry.required_permission_keys.filter(Boolean).join(' / ') : ''
      return [
        itemId ? `稀有物 ${itemId}` : '',
        decorationId ? `装饰 ${decorationId}` : '',
        draftId ? `草案 ${draftId}` : '',
        receiptRef ? `回执 ${receiptRef}` : '',
        permissions ? `权限 ${permissions}` : '',
        isFamilyMajorEventReceipt && entry.contract_family_state_changed === true ? '家庭事件状态已写' : '',
        entry.shared_decoration_state_changed === true ? '共同装饰状态已写' : '',
        isRareItemDelivery && entry.shared_decoration_state_changed === false ? '共同装饰状态未改' : '',
        isFamilyMajorEventReceipt && entry.personal_family_state_mutated === false ? '个人家庭未改' : '',
        isRareItemDelivery && entry.personal_inventory_merged === false ? '个人背包未合并' : '',
        isLimitedDecorationDelivery && entry.personal_inventory_merged === false ? '个人背包未合并' : '',
        entry.personal_home_mutated === false ? '个人小屋未改' : '',
        entry.shared_fund_changed === false ? '共同基金未再扣款' : '',
        entry.shared_warehouse_changed === false ? '共同仓库未改' : '',
        entry.client_base_stale === true ? '客户端基线过期' : '',
      ].filter(Boolean).join(' · ') || (isFamilyMajorEventReceipt ? '家庭事件回执已按服务端契约状态合并' : (isRareItemDelivery ? '稀有物交付回执已按服务端契约状态合并' : (isLimitedDecorationDelivery ? '限定装饰交付回执已按服务端契约状态合并' : '共同装修拆除回执已按服务端契约状态合并')))
    }
    const ledgerIds = [entry.ledger_id, ...(entry.warehouse_ledger_ids ?? [])].filter(Boolean)
    const outputItemId = typeof entry.output_item_id === 'string' ? entry.output_item_id : ''
    const outputQuantity = Math.max(1, Math.floor(Number(entry.output_quantity) || 1))
    const target = ['target_ref', 'plot_id', 'animal_id', 'pet_id', 'recipe_id', 'decoration_id']
      .map(key => entry[key])
      .find(value => typeof value === 'string' && value.length > 0)
    const output = outputItemId
      ? `${warehouseItemLabels[outputItemId] || outputItemId} x${outputQuantity}`
      : ''
    const boundaries = [
      entry.personal_save_changed === false ? '个人存档未改' : '',
      entry.shared_fund_changed === false ? '共同基金未改' : '',
      entry.shared_warehouse_changed === true ? '共同仓库已写流水' : '',
      entry.client_base_stale === true ? '客户端基线过期' : '',
    ].filter(Boolean)
    const revisionText = typeof entry.server_base_revision === 'number' || typeof entry.server_committed_revision === 'number'
      ? `revision ${Number(entry.client_base_revision) || 0}/${Number(entry.server_base_revision) || 0}->${Number(entry.server_committed_revision) || 0}`
      : ''
    return [target ? `目标 ${target}` : '', output, ledgerIds.length ? `流水 ${ledgerIds.length} 笔` : '', revisionText, ...boundaries]
      .filter(Boolean)
      .join(' · ') || '服务端已按当前契约状态合并'
  }
  const offlineQueueClientRevision = () => Math.max(
    0,
    Number(cohabitationStore.sharedMap?.revision) || 0,
    Number(cohabitationStore.sharedAnimals?.revision) || 0,
    Number(cohabitationStore.sharedPets?.revision) || 0,
    Number(cohabitationStore.warehouse?.summary.ledger_count) || 0,
    Number(selectedContract.value?.updated_at) || 0,
    Number(selectedContract.value?.shared_decoration_state?.length) || 0,
    Number(cohabitationStore.fund?.large_spend_drafts?.length) || 0,
  )
  const getOfflineQueueDraftStorageKey = (contractId: string) => `${OFFLINE_QUEUE_DRAFT_STORAGE_PREFIX}:${contractId}`
  const cloneOfflineQueuePayload = (payload: unknown): Record<string, unknown> => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
    return { ...(payload as Record<string, unknown>) }
  }
  const normalizeOfflineQueueDraftOperation = (raw: unknown): OfflineQueueDraftOperation | null => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const record = raw as Record<string, unknown>
    const action = typeof record.action === 'string' ? record.action.trim() : ''
    if (!action) return null
    const operationId = typeof record.operation_id === 'string' && record.operation_id.trim()
      ? record.operation_id.trim()
      : `ui-offline-local-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return {
      action,
      operation_id: operationId,
      idempotency_key: typeof record.idempotency_key === 'string' && record.idempotency_key.trim()
        ? record.idempotency_key.trim()
        : operationId,
      client_base_revision: Math.max(0, Math.floor(Number(record.client_base_revision) || 0)),
      payload: cloneOfflineQueuePayload(record.payload),
      cached_at: Math.max(0, Math.floor(Number(record.cached_at) || 0)),
      cached_label: typeof record.cached_label === 'string' ? record.cached_label : '',
      cached_target_label: typeof record.cached_target_label === 'string' ? record.cached_target_label : '',
    }
  }
  const loadOfflineQueueDraftOperations = (contractId: string | null | undefined) => {
    const normalizedContractId = `${contractId || ''}`.trim()
    if (typeof window === 'undefined' || !normalizedContractId) {
      offlineQueueDraftOperations.value = []
      return
    }
    try {
      const raw = window.localStorage.getItem(getOfflineQueueDraftStorageKey(normalizedContractId))
      if (!raw) {
        offlineQueueDraftOperations.value = []
        return
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const operations = Array.isArray(parsed.operations)
        ? parsed.operations
            .map(normalizeOfflineQueueDraftOperation)
            .filter((operation): operation is OfflineQueueDraftOperation => Boolean(operation))
            .slice(-OFFLINE_QUEUE_DRAFT_MAX_OPERATIONS)
        : []
      offlineQueueDraftOperations.value = operations
    } catch {
      offlineQueueDraftOperations.value = []
    }
  }
  const persistOfflineQueueDraftOperations = () => {
    const contractId = cohabitationStore.activeContractId
    if (typeof window === 'undefined' || !contractId) return true
    const key = getOfflineQueueDraftStorageKey(contractId)
    try {
      if (offlineQueueDraftOperations.value.length === 0) {
        window.localStorage.removeItem(key)
        return true
      }
      window.localStorage.setItem(key, JSON.stringify({
        version: 1,
        contract_id: contractId,
        saved_at: Math.floor(Date.now() / 1000),
        operations: offlineQueueDraftOperations.value.slice(-OFFLINE_QUEUE_DRAFT_MAX_OPERATIONS),
      }))
      return true
    } catch {
      offlineQueueActionOk.value = false
      offlineQueueActionMessage.value = '本地离线缓存写入失败'
      return false
    }
  }
  const toOfflineQueueMergeOperation = (operation: OfflineQueueDraftOperation): CohabitationOfflineQueueOperation => ({
    action: operation.action,
    operation_id: operation.operation_id,
    idempotency_key: operation.idempotency_key,
    client_base_revision: operation.client_base_revision,
    payload: cloneOfflineQueuePayload(operation.payload),
  })
  const offlineQueueDraftClientRevision = computed(() => {
    const revisions = offlineQueueDraftOperations.value
      .map(operation => Math.max(0, Math.floor(Number(operation.client_base_revision) || 0)))
      .filter(revision => revision > 0)
    return revisions.length ? Math.min(...revisions) : offlineQueueClientRevision()
  })
  const offlineQueueDraftRows = computed<OfflineQueueDraftRow[]>(() =>
    offlineQueueDraftOperations.value.map((operation, index) => ({
      index,
      id: operation.operation_id || `${operation.action}-${index}`,
      label: operation.cached_label || offlineQueueActionLabel(operation.action),
      targetLabel: operation.cached_target_label || String(operation.payload?.target_ref || operation.payload?.receipt_ref || operation.payload?.draft_id || operation.payload?.plot_id || operation.payload?.animal_id || operation.payload?.pet_id || operation.payload?.recipe_id || operation.payload?.decoration_id || '当前目标'),
      savedLabel: operation.cached_at ? `缓存 ${formatTime(operation.cached_at)}` : '缓存时间未知',
    }))
  )
  const offlineQueueDraftSummaryLabel = computed(() =>
    offlineQueueDraftOperations.value.length > 0
      ? `本地缓存 ${offlineQueueDraftOperations.value.length} 项 · revision ${offlineQueueDraftClientRevision.value}`
      : '本地缓存 0 项'
  )
  const offlineQueueDraftStorageLabel = computed(() =>
    cohabitationStore.activeContractId ? '当前契约' : '未选契约'
  )
  const canSubmitOfflineQueueDraftMerge = computed(() =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.offlineStatus?.summary.offline_queue_merge_enabled === true &&
    offlineQueueDraftOperations.value.length > 0
  )
  const canPreflightOfflineQueueDraft = computed(() =>
    canPreflightOfflineConflicts.value &&
    offlineQueueDraftOperations.value.length > 0
  )
  const buildSelectedOfflineQueueOperation = (): CohabitationOfflineQueueOperation | null => {
    const option = selectedOfflineQueueActionOption.value
    if (!option) return null
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const operationId = `ui-offline-${option.id}-${suffix}`
    const basePayload: Record<string, unknown> = { memo: `前端离线队列合并：${option.label}` }
    if (option.id.includes('shared_farm')) {
      const plot = selectedSharedFarmPlot.value
      if (!plot) return null
      basePayload.plot_id = plot.id
      if (option.id === 'care_shared_farm_cure_pests') basePayload.action = 'cure_pests'
      if (option.id === 'care_shared_farm_clear_weeds') basePayload.action = 'clear_weeds'
      if (option.id === 'plant_shared_farm') basePayload.seed_item_id = sharedFarmSeedItemId.value
      if (option.id === 'fertilize_shared_farm_basic' || option.id === 'fertilize_shared_farm_premium') {
        const fertilizer = selectedSharedFarmFertilizer.value
        if (!fertilizer) return null
        basePayload.fertilizer_item_id = fertilizer.itemId
      }
    } else if (option.id === 'buy_shared_animal') {
      const purchaseOption = selectedSharedAnimalBuyOption.value
      if (!purchaseOption) return null
      basePayload.animal_type = purchaseOption.type
      const name = sharedAnimalBuyName.value.trim()
      if (name) basePayload.name = name
    } else if (option.id === 'sell_shared_animal') {
      const animal = selectedSharedAnimal.value
      if (!animal) return null
      basePayload.animal_id = animal.id
    } else if (option.id.includes('shared_animal')) {
      const animal = selectedSharedAnimal.value
      if (!animal) return null
      basePayload.animal_id = animal.id
      if (option.id === 'feed_shared_animal') basePayload.feed_item_id = 'hay'
    } else if (option.id === 'care_shared_pet') {
      const pet = selectedSharedPet.value
      const careItem = selectedSharedPetCareItem.value
      if (!pet || !careItem) return null
      basePayload.pet_id = pet.id
      basePayload.care_item_id = careItem.itemId
      if (careItem.requiresConfirmation) {
        basePayload.confirmed_high_value_care = true
        basePayload.risk_acknowledged = sharedPetCareRiskAcknowledged.value
        basePayload.confirmation_text = sharedPetCareConfirmationText.value.trim()
        basePayload.rollback_plan_acknowledged = sharedPetCareRiskAcknowledged.value
        basePayload.compensation_plan_acknowledged = sharedPetCareRiskAcknowledged.value
      }
    } else if (option.id === 'process_shared_workshop_recipe') {
      const recipe = selectedSharedWorkshopRecipe.value
      if (!recipe) return null
      basePayload.recipe_id = recipe.id
    } else if (option.id === 'move_shared_decoration') {
      const decoration = selectedOfflineSharedDecoration.value
      const decorationId = selectedOfflineSharedDecorationId.value
      if (!decoration || !decorationId) return null
      const toLocationRef = `shared_manor:offline_decoration:${decorationId}:${suffix}`
      basePayload.decoration_id = decorationId
      basePayload.decoration_kind = selectedOfflineSharedDecorationKind.value
      basePayload.from_location_ref = selectedOfflineSharedDecorationLocation.value
      basePayload.to_location_ref = toLocationRef
      basePayload.placement_ref = `${toLocationRef}:placed`
      basePayload.target_ref = `shared_decoration:${decorationId}:offline_move`
    } else if (option.id === 'record_rare_item_delivery_receipt') {
      const draft = selectedOfflineRareItemDeliveryReceiptDraft.value
      if (!draft) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `rare_item:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'delivered'
    } else if (option.id === 'record_rare_item_refund_receipt') {
      const draft = selectedOfflineRareItemRefundReceiptDraft.value
      if (!draft || !offlineQueueRefundAcknowledged.value) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `rare_item_refund:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'refunded'
      basePayload.compensation_plan_acknowledged = true
    } else if (option.id === 'record_family_major_event_receipt') {
      const draft = selectedOfflineFamilyMajorEventReceiptDraft.value
      if (!draft) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `family_event:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'delivered'
    } else if (option.id === 'record_family_major_event_refund_receipt') {
      const draft = selectedOfflineFamilyMajorEventRefundReceiptDraft.value
      if (!draft || !offlineQueueRefundAcknowledged.value) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `family_event_refund:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'refunded'
      basePayload.compensation_plan_acknowledged = true
    } else if (option.id === 'record_limited_decoration_delivery_receipt') {
      const draft = selectedOfflineLimitedDecorationDeliveryReceiptDraft.value
      if (!draft) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `limited_decoration:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'delivered'
    } else if (option.id === 'record_limited_decoration_refund_receipt') {
      const draft = selectedOfflineLimitedDecorationRefundReceiptDraft.value
      if (!draft || !offlineQueueRefundAcknowledged.value) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `limited_decoration_refund:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'refunded'
      basePayload.compensation_plan_acknowledged = true
    } else if (option.id === 'record_shared_decoration_removal_refund_receipt') {
      const draft = selectedOfflineSharedDecorationRemovalRefundReceiptDraft.value
      if (!draft || !offlineQueueRefundAcknowledged.value) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `shared_decoration_removal_refund:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'refunded'
      basePayload.compensation_plan_acknowledged = true
    } else if (option.id === 'record_shared_decoration_removal_receipt') {
      const draft = selectedOfflineSharedDecorationRemovalReceiptDraft.value
      if (!draft) return null
      basePayload.draft_id = draft.id
      basePayload.target_ref = draft.target_ref
      basePayload.receipt_ref = `shared_decoration_removal:${draft.target_ref || draft.id}:offline_receipt`
      basePayload.outcome = 'delivered'
    } else if (option.id === 'settle_shared_daily') {
      basePayload.memo = '前端离线队列共同庄园日结'
    } else if (option.id === 'collect_offline_auto_income') {
      basePayload.client_queue_revision = offlineQueueClientRevision()
    }
    return {
      action: option.queueAction,
      operation_id: operationId,
      idempotency_key: operationId,
      client_base_revision: offlineQueueClientRevision(),
      payload: basePayload,
    }
  }
  const cacheSelectedOfflineQueueOperation = () => {
    const option = selectedOfflineQueueActionOption.value
    const operation = buildSelectedOfflineQueueOperation()
    offlineQueueActionMessage.value = ''
    offlineQueueActionOk.value = false
    if (!option || !operation || !canSubmitOfflineQueueMerge.value) {
      offlineQueueActionMessage.value = option?.disabledReason || '请选择可缓存的离线操作'
      return
    }
    const draftOperation: OfflineQueueDraftOperation = {
      ...operation,
      payload: cloneOfflineQueuePayload(operation.payload),
      cached_at: Math.floor(Date.now() / 1000),
      cached_label: option.label,
      cached_target_label: option.targetLabel,
    }
    offlineQueueDraftOperations.value = [
      ...offlineQueueDraftOperations.value,
      draftOperation,
    ].slice(-OFFLINE_QUEUE_DRAFT_MAX_OPERATIONS)
    if (!persistOfflineQueueDraftOperations()) return
    offlineQueueActionOk.value = true
    offlineQueueActionMessage.value = `已加入本地离线缓存，当前 ${offlineQueueDraftOperations.value.length} 项`
  }
  const removeOfflineQueueDraftOperation = (index: number) => {
    if (index < 0 || index >= offlineQueueDraftOperations.value.length) return
    offlineQueueDraftOperations.value = offlineQueueDraftOperations.value.filter((_, rowIndex) => rowIndex !== index)
    if (!persistOfflineQueueDraftOperations()) return
    offlineQueueActionOk.value = true
    offlineQueueActionMessage.value = `已移除本地缓存操作，剩余 ${offlineQueueDraftOperations.value.length} 项`
  }
  const clearOfflineQueueDraftOperations = () => {
    offlineQueueDraftOperations.value = []
    if (!persistOfflineQueueDraftOperations()) return
    offlineQueueActionOk.value = true
    offlineQueueActionMessage.value = '本地离线缓存已清空'
  }
  const submitOfflineConflictPreflight = async () => {
    offlineQueueActionMessage.value = ''
    offlineQueueActionOk.value = false
    if (!canPreflightOfflineConflicts.value) {
      offlineQueueActionMessage.value = '当前契约暂未开放离线冲突预检'
      return
    }
    try {
      const option = selectedOfflineQueueActionOption.value
      const result = await cohabitationStore.preflightOfflineConflicts({
        idempotency_key: `ui-offline-conflict-preflight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        client_queue_revision: offlineQueueClientRevision(),
        actions: option?.queueAction ? [option.queueAction] : [],
        memo: '前端预检离线经营冲突',
      })
      const preflight = result?.offline_conflict_preflight
      const stale = preflight?.client_queue_stale === true
      const unsupportedActions = preflight?.unsupported_actions
      const unsupportedCount = Array.isArray(unsupportedActions) ? unsupportedActions.length : 0
      offlineQueueActionOk.value = !stale && unsupportedCount === 0
      offlineQueueActionMessage.value = stale
        ? '服务端检测到客户端基线过期，请刷新后再合并离线操作'
        : unsupportedCount > 0
          ? `离线冲突预检发现 ${unsupportedCount} 项暂不支持动作`
          : '离线冲突预检通过，可按服务端当前状态继续合并'
    } catch (error) {
      offlineQueueActionMessage.value = error instanceof Error ? error.message : '预检离线经营冲突失败'
    }
  }

  const preflightOfflineQueueDraft = async () => {
    offlineQueueActionMessage.value = ''
    offlineQueueActionOk.value = false
    if (!canPreflightOfflineQueueDraft.value) {
      offlineQueueActionMessage.value = '当前没有可预检的本地离线缓存'
      return
    }
    try {
      const actions = [...new Set(offlineQueueDraftOperations.value.map(operation => operation.action))]
      const result = await cohabitationStore.preflightOfflineConflicts({
        idempotency_key: `ui-offline-local-conflict-preflight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        client_queue_revision: offlineQueueDraftClientRevision.value,
        actions,
        memo: '前端预检本地离线经营缓存',
      })
      const preflight = result?.offline_conflict_preflight
      const stale = preflight?.client_queue_stale === true
      const unsupportedActions = preflight?.unsupported_actions
      const unsupportedCount = Array.isArray(unsupportedActions) ? unsupportedActions.length : 0
      offlineQueueActionOk.value = !stale && unsupportedCount === 0
      offlineQueueActionMessage.value = stale
        ? '本地缓存基线已过期，合并时将以服务端最新共同资产为准'
        : unsupportedCount > 0
          ? `本地缓存预检发现 ${unsupportedCount} 项暂不支持动作`
          : `本地缓存预检通过，${actions.length} 类动作可合并`
    } catch (error) {
      offlineQueueActionMessage.value = error instanceof Error ? error.message : '预检本地离线缓存失败'
    }
  }

  const submitSelectedOfflineQueueMerge = async () => {
    const option = selectedOfflineQueueActionOption.value
    const operation = buildSelectedOfflineQueueOperation()
    offlineQueueActionMessage.value = ''
    offlineQueueActionOk.value = false
    if (!option || !operation || !canSubmitOfflineQueueMerge.value) {
      offlineQueueActionMessage.value = option?.disabledReason || '请选择可合并的离线操作'
      return
    }
    const queueId = `ui-offline-queue-${option.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const result = await cohabitationStore.mergeOfflineQueue({
        idempotency_key: queueId,
        client_queue_revision: offlineQueueClientRevision(),
        operations: [operation],
      })
      const merge = result?.offline_queue_merge
      const accepted = merge?.accepted_count ?? 0
      const rejected = merge?.rejected_count ?? 0
      offlineQueueActionOk.value = accepted > 0 && rejected === 0
      offlineQueueActionMessage.value = rejected > 0
        ? `离线队列已合并，${accepted} 项提交、${rejected} 项拒绝`
        : `离线队列已合并，${accepted} 项提交并刷新共同日志`
    } catch (error) {
      offlineQueueActionMessage.value = error instanceof Error ? error.message : '合并离线经营队列失败'
    }
  }

  const submitOfflineQueueDraftMerge = async () => {
    offlineQueueActionMessage.value = ''
    offlineQueueActionOk.value = false
    if (!canSubmitOfflineQueueDraftMerge.value) {
      offlineQueueActionMessage.value = '当前没有可合并的本地离线缓存'
      return
    }
    const operations = offlineQueueDraftOperations.value.map(toOfflineQueueMergeOperation)
    const queueId = `ui-offline-local-queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const result = await cohabitationStore.resolveOfflineConflicts({
        idempotency_key: queueId,
        client_queue_revision: offlineQueueDraftClientRevision.value,
        resolution_strategy: 'server_authoritative_auto_merge',
        allow_partial: true,
        memo: '前端自动解决本地离线缓存冲突',
        operations,
      })
      const merge = result?.offline_queue_merge
      const accepted = merge?.accepted_count ?? 0
      const rejected = merge?.rejected_count ?? 0
      const settledOperationIds = new Set(
        (merge?.results ?? [])
          .filter(entry => entry.status === 'committed' || entry.status === 'idempotent')
          .map(entry => entry.operation_id)
          .filter((operationId): operationId is string => Boolean(operationId))
      )
      offlineQueueDraftOperations.value = rejected > 0
        ? offlineQueueDraftOperations.value.filter(operation => !settledOperationIds.has(operation.operation_id || ''))
        : []
      if (!persistOfflineQueueDraftOperations()) return
      offlineQueueActionOk.value = accepted > 0 && rejected === 0
      offlineQueueActionMessage.value = rejected > 0
        ? `本地缓存已合并，${accepted} 项提交、${rejected} 项拒绝，拒绝项已保留`
        : `本地缓存已合并，${accepted} 项提交并刷新共同日志`
    } catch (error) {
      offlineQueueActionMessage.value = error instanceof Error ? error.message : '合并本地离线缓存失败'
    }
  }

  const collectOfflineAutoIncome = async () => {
    offlineQueueActionMessage.value = ''
    offlineQueueActionOk.value = false
    if (!canCollectOfflineAutoIncome.value) {
      offlineQueueActionMessage.value = '当前没有可领取的离线自动收益'
      return
    }
    try {
      const result = await cohabitationStore.collectOfflineAutoIncome({
        idempotency_key: `ui-offline-auto-income-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        client_queue_revision: offlineQueueClientRevision(),
        client_base_revision: offlineQueueClientRevision(),
        memo: '前端领取离线自动收益',
      })
      const claim = result?.offline_auto_income_claim as Record<string, unknown> | undefined
      const collected = Math.max(0, Math.floor(Number(claim?.collected_count) || 0))
      offlineQueueActionOk.value = true
      offlineQueueActionMessage.value = collected > 0
        ? `离线自动收益已领取 ${collected} 项，已写共同仓库流水`
        : '服务端最新状态没有可领取收益'
    } catch (error) {
      offlineQueueActionMessage.value = error instanceof Error ? error.message : '领取离线自动收益失败'
    }
  }

  const submitCohabitationDailySettle = async () => {
    dailySettleActionMessage.value = ''
    dailySettleActionOk.value = false
    try {
      const result = await cohabitationStore.settleDailyBonus({
        idempotency_key: `ui-cohabitation-daily-settle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        memo: '前端共同庄园日结',
      })
      dailySettleActionOk.value = true
      dailySettleActionMessage.value = dailySettlementSummaryLabel(result?.daily_settlement ?? cohabitationStore.dailySettlement)
    } catch (error) {
      dailySettleActionMessage.value = error instanceof Error ? error.message : '共同庄园日结失败'
    }
  }

  const careSelectedSharedFarmPlot = async (action: 'cure_pests' | 'clear_weeds' | 'remove_crop') => {
    const plot = selectedSharedFarmPlot.value
    if (!plot) return
    const actionLabel = sharedFarmCareActionLabel(action)
    sharedFarmActionMessage.value = ''
    sharedFarmActionOk.value = false
    try {
      const result = await cohabitationStore.careSharedFarmPlot({
        plot_id: plot.id,
        action,
        memo: `前端共同农田${actionLabel}：${plot.id}`,
        idempotency_key: `ui-shared-farm-${action}-${plot.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedFarmPlotId.value = result?.plot?.id || plot.id
      sharedFarmActionOk.value = true
      sharedFarmActionMessage.value = result?.idempotent || result?.already_applied
        ? `已读回共同农田${actionLabel}记录`
        : `共同农田已${actionLabel}，契约地图和农田流水已刷新`
    } catch (error) {
      sharedFarmActionMessage.value = error instanceof Error ? error.message : '管护共同农田失败'
    }
  }

  const cureSelectedSharedFarmPlot = async () => {
    await careSelectedSharedFarmPlot('cure_pests')
  }

  const clearWeedsSelectedSharedFarmPlot = async () => {
    await careSelectedSharedFarmPlot('clear_weeds')
  }

  const removeCropSelectedSharedFarmPlot = async () => {
    await careSelectedSharedFarmPlot('remove_crop')
  }

  const plantSelectedSharedFarmPlot = async () => {
    const plot = selectedSharedFarmPlot.value
    if (!plot) return
    sharedFarmActionMessage.value = ''
    sharedFarmActionOk.value = false
    try {
      const result = await cohabitationStore.plantSharedFarmPlot({
        plot_id: plot.id,
        seed_item_id: sharedFarmSeedItemId.value,
        memo: `前端共同农田种植：${plot.id}`,
        idempotency_key: `ui-shared-farm-plant-${plot.id}-${sharedFarmSeedItemId.value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedFarmPlotId.value = result?.plot?.id || plot.id
      sharedFarmActionOk.value = true
      sharedFarmActionMessage.value = result?.idempotent || result?.already_planted
        ? '已读回共同农田种植记录'
        : '共同农田已种植，共同仓库扣种流水已刷新'
    } catch (error) {
      sharedFarmActionMessage.value = error instanceof Error ? error.message : '种植共同农田失败'
    }
  }

  const fertilizeSelectedSharedFarmPlot = async () => {
    const plot = selectedSharedFarmPlot.value
    const fertilizer = selectedSharedFarmFertilizer.value
    if (!plot || !fertilizer) return
    sharedFarmActionMessage.value = ''
    sharedFarmActionOk.value = false
    try {
      const result = await cohabitationStore.fertilizeSharedFarmPlot({
        plot_id: plot.id,
        fertilizer_item_id: fertilizer.itemId,
        memo: `前端共同农田${fertilizer.premium ? '高级' : '基础'}施肥：${plot.id}`,
        idempotency_key: `ui-shared-farm-fertilize-${plot.id}-${fertilizer.itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedFarmPlotId.value = result?.plot?.id || plot.id
      sharedFarmActionOk.value = true
      sharedFarmActionMessage.value = result?.idempotent || result?.already_fertilized
        ? '已读回共同农田施肥记录'
        : `共同农田已使用${fertilizer.label}，共同仓库扣肥流水已刷新`
    } catch (error) {
      sharedFarmActionMessage.value = error instanceof Error ? error.message : '共同农田施肥失败'
    }
  }

  const harvestSelectedSharedFarmPlot = async () => {
    const plot = selectedSharedFarmPlot.value
    if (!plot) return
    sharedFarmActionMessage.value = ''
    sharedFarmActionOk.value = false
    try {
      const result = await cohabitationStore.harvestSharedFarmPlot({
        plot_id: plot.id,
        memo: `前端共同农田收获：${plot.id}`,
        idempotency_key: `ui-shared-farm-harvest-${plot.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedFarmPlotId.value = result?.plot?.id || plot.id
      const outputItemId = result?.farm_action?.output_item_id || result?.ledger_entry?.output_item_id || plot.plot_state.crop_id || ''
      const outputQuantity = result?.farm_action?.output_quantity || result?.ledger_entry?.output_quantity || 1
      sharedFarmActionOk.value = true
      sharedFarmActionMessage.value = result?.idempotent || result?.already_harvested
        ? '已读回共同农田收获记录'
        : `共同农田已收获，${warehouseItemLabels[outputItemId] || outputItemId || '产出'} x${outputQuantity} 已进入共同仓库`
    } catch (error) {
      sharedFarmActionMessage.value = error instanceof Error ? error.message : '收获共同农田失败'
    }
  }

  const feedSelectedSharedAnimal = async () => {
    const animal = selectedSharedAnimal.value
    if (!animal) return
    sharedAnimalActionMessage.value = ''
    sharedAnimalActionOk.value = false
    try {
      const result = await cohabitationStore.feedSharedAnimal({
        animal_id: animal.id,
        feed_item_id: 'hay',
        memo: `前端共同动物喂食：${animal.id}`,
        idempotency_key: `ui-shared-animal-feed-${animal.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedAnimalId.value = result?.animal?.id || animal.id
      sharedAnimalActionOk.value = true
      sharedAnimalActionMessage.value = result?.idempotent || result?.already_fed
        ? '已读回共同动物喂食记录'
        : '共同动物已喂食，共同仓库干草扣料流水已刷新'
    } catch (error) {
      sharedAnimalActionMessage.value = error instanceof Error ? error.message : '喂食共同动物失败'
    }
  }

  const petSelectedSharedAnimal = async () => {
    const animal = selectedSharedAnimal.value
    if (!animal) return
    sharedAnimalActionMessage.value = ''
    sharedAnimalActionOk.value = false
    try {
      const result = await cohabitationStore.petSharedAnimal({
        animal_id: animal.id,
        memo: `前端共同动物抚摸：${animal.id}`,
        idempotency_key: `ui-shared-animal-pet-${animal.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedAnimalId.value = result?.animal?.id || animal.id
      sharedAnimalActionOk.value = true
      sharedAnimalActionMessage.value = result?.idempotent || result?.already_petted
        ? '已读回共同动物抚摸记录'
        : '共同动物已抚摸，契约动物状态和照料流水已刷新'
    } catch (error) {
      sharedAnimalActionMessage.value = error instanceof Error ? error.message : '抚摸共同动物失败'
    }
  }

  const collectSelectedSharedAnimalProduct = async () => {
    const animal = selectedSharedAnimal.value
    if (!animal) return
    sharedAnimalActionMessage.value = ''
    sharedAnimalActionOk.value = false
    try {
      const result = await cohabitationStore.collectSharedAnimalProduct({
        animal_id: animal.id,
        memo: `前端共同动物产物收取：${animal.id}`,
        idempotency_key: `ui-shared-animal-collect-product-${animal.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedAnimalId.value = result?.animal?.id || animal.id
      sharedAnimalActionOk.value = true
      sharedAnimalActionMessage.value = result?.idempotent || result?.already_collected
        ? '已读回共同动物产物收取记录'
        : '共同动物产物已进入共同仓库，来源流水已刷新'
    } catch (error) {
      sharedAnimalActionMessage.value = error instanceof Error ? error.message : '收取共同动物产物失败'
    }
  }

  const careSelectedSharedPet = async () => {
    const pet = selectedSharedPet.value
    const careItem = selectedSharedPetCareItem.value
    if (!pet || !careItem) return
    sharedPetActionMessage.value = ''
    sharedPetActionOk.value = false
    try {
      const result = await cohabitationStore.careSharedPet({
        pet_id: pet.id,
        care_item_id: careItem.itemId,
        memo: `前端共同宠物照料：${pet.id}:${careItem.itemId}`,
        ...(careItem.requiresConfirmation ? {
          confirmed_high_value_care: true,
          risk_acknowledged: sharedPetCareRiskAcknowledged.value,
          confirmation_text: sharedPetCareConfirmationText.value.trim(),
          rollback_plan_acknowledged: sharedPetCareRiskAcknowledged.value,
          compensation_plan_acknowledged: sharedPetCareRiskAcknowledged.value,
        } : {}),
        idempotency_key: `ui-shared-pet-care-${pet.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      selectedSharedPetId.value = result?.pet?.id || pet.id
      sharedPetActionOk.value = true
      resetSharedPetCareConfirmation()
      const bonus = Number(result?.pet_action?.simultaneous_online_bonus?.bonus_value) || 0
      const usedItemLabel = result?.pet_action?.care_item_label || result?.ledger_entry?.care_item_label || careItem.label
      sharedPetActionMessage.value = result?.idempotent || result?.already_cared
        ? '已读回共同宠物照料记录'
        : bonus > 0
          ? `共同宠物已照料，共同仓库${usedItemLabel}已扣料，并触发同时在线心情 +${bonus}`
          : `共同宠物已照料，共同仓库${usedItemLabel}扣料流水已刷新`
    } catch (error) {
      sharedPetActionMessage.value = error instanceof Error ? error.message : '照料共同宠物失败'
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

  const buildSeparationSharedFundManualAllocationPayload = () => {
    if (!separationSharedFundReadbackSummary.value.requires_unidentified_operating_confirmation) return {}
    const expected = separationSharedFundReadbackSummary.value.unidentified_operating_contribution_total
    if (expected <= 0) return {}
    if (!separationSharedFundManualAllocationBalanced.value) {
      throw new Error(`未知经营贡献人工分配合计需等于 ${expected} 铜币`)
    }
    return {
      unidentified_operating_contribution_hash: separationSharedFundReadbackSummary.value.unidentified_operating_contribution_hash,
      unidentified_operating_allocation: separationSharedFundManualAllocationMembers.value.map(member => ({
        target_username: member.username,
        target_username_key: member.username_key,
        amount: Math.max(0, Math.floor(Number(separationSharedFundManualAllocation.value[member.username_key]) || 0)),
      })),
    }
  }

  const confirmSeparationSharedFundDelta = async () => {
    if (!latestSeparationPreview.value || !canConfirmSeparationSharedFundDelta.value) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const manualAllocationPayload = buildSeparationSharedFundManualAllocationPayload()
      const result = await cohabitationStore.confirmSeparationSharedFundDelta(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        ...manualAllocationPayload,
        memo: '前端确认分居共同基金消费差额 / 未知经营贡献争议；不改共同基金、个人铜币或共同仓库',
        idempotency_key: `ui-separation-shared-fund-delta-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      const summary = result?.shared_fund_delta_confirmation as Record<string, unknown> | undefined
      const pending = Array.isArray(summary?.pending_member_usernames) ? summary.pending_member_usernames.length : 0
      separationActionMessage.value = result?.already_confirmed || pending === 0
        ? '共同基金消费差额 / 未知经营贡献争议已双方确认'
        : `已确认共同基金消费差额 / 未知经营贡献争议，仍待 ${pending} 位成员确认`
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '确认分居共同基金争议失败'
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

  const waitForSeparationStoryCinematicStep = (durationMs: number) => new Promise<void>(resolve => {
    const duration = Math.min(2400, Math.max(600, Math.floor(Number(durationMs) || 1000)))
    separationStoryCinematicPlaybackTimer.value = window.setTimeout(() => {
      separationStoryCinematicPlaybackTimer.value = null
      resolve()
    }, duration)
  })

  const playSeparationStoryCinematicPlayback = async () => {
    if (!latestSeparationPreview.value || !canRecordSeparationStoryCinematicPlayback.value || separationStoryCinematicPlaybackActive.value) return
    const steps = separationStoryCinematicPlaybackSteps.value
    if (steps.length === 0) {
      await recordSeparationStoryCinematicPlayback()
      return
    }
    separationActionMessage.value = '正在播放分居关系剧情演出'
    separationActionOk.value = false
    separationStoryCinematicPlaybackActive.value = true
    try {
      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index]
        if (!step) continue
        separationStoryCinematicPlaybackIndex.value = index
        await waitForSeparationStoryCinematicStep(step.duration_ms)
      }
    } finally {
      separationStoryCinematicPlaybackActive.value = false
      if (separationStoryCinematicPlaybackTimer.value !== null) {
        window.clearTimeout(separationStoryCinematicPlaybackTimer.value)
        separationStoryCinematicPlaybackTimer.value = null
      }
    }
    await recordSeparationStoryCinematicPlayback()
  }

  const recordSeparationStoryCinematicPlayback = async () => {
    if (!latestSeparationPreview.value || !canRecordSeparationStoryCinematicPlayback.value) return
    const resolution = separationStoryCinematicResolution.value
    if (!resolution) return
    separationActionMessage.value = ''
    separationActionOk.value = false
    try {
      const result = await cohabitationStore.recordSeparationStoryCinematicPlayback(latestSeparationPreview.value.id, {
        execution_ledger_id: separationExecutionRequest.value?.execution_ledger_id,
        plot_return_manifest_hash: separationPlotReturnManifestHash.value,
        story_event_kind: String(resolution.story_event_kind || ''),
        dialogue_event_id: String(resolution.dialogue_event_id || ''),
        animation_event_id: String(resolution.animation_event_id || ''),
        playback_state: resolution.frontend_cinematic_pending === true ? 'played' : 'record_only',
        memo: '前端已触发分居关系剧情演出；只记录共同契约回执，不改个人 NPC / 家庭主状态',
        idempotency_key: `ui-separation-story-cinematic-${latestSeparationPreview.value.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      separationActionOk.value = true
      separationActionMessage.value = result?.idempotent || result?.already_played
        ? '已读回分居剧情演出播放记录'
        : '已记录分居剧情演出播放回执'
    } catch (error) {
      separationActionMessage.value = error instanceof Error ? error.message : '记录分居剧情演出播放失败'
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
  const warehouseQualitySellMultiplier = (quality = 'normal') => {
    if (quality === 'fine') return 1.5
    if (quality === 'excellent') return 2
    if (quality === 'supreme') return 3
    return 1
  }
  const warehouseSellUnitPriceForItem = (item: CohabitationWarehouseItem) => {
    const base = warehouseSellUnitPrice(item.item_id)
    if (base <= 0) return 0
    return Math.floor(base * warehouseQualitySellMultiplier(item.quality || 'normal'))
  }
  const fundLedgerPurposeLabel = (entry: CohabitationFundLedgerEntry) => {
    const label = entry.spend_purpose_label || entry.purpose || 'shared_fund'
    if (entry.spend_tier === 'large') return `${label} · 大额`
    return entry.spend_tier === 'medium' ? `${label} · 中额` : label
  }
  const largeFundSpendPurposeLabel = (value: string) => {
    const labels: Record<string, string> = {
      family_building: '大额家族建筑',
      manor_expansion: '大额庄园扩建',
      rare_item_purchase: '稀有物采购',
      limited_decoration: '限定装饰采购',
      shared_decoration_removal: '共同装修拆除确认',
      family_major_event: '孩子 / 家庭重大事件',
    }
    return labels[value] || value || '大额草案'
  }
  const highRiskReceiptStatusLabel = (value: string) => {
    const labels: Record<string, string> = {
      pending: '待收口',
      delivered: '已交付',
      refunded: '已退款',
    }
    return labels[value] || value || '无'
  }
  const highRiskReceiptStateClass = (value: string) => {
    if (value === 'delivered') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    if (value === 'refunded') return 'border-sky-400/30 bg-sky-500/10 text-sky-200'
    return 'border-amber-400/30 bg-amber-500/10 text-amber-100'
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
  const canRecordHighRiskReceiptDraft = (draft: CohabitationFundLargeSpendDraft) =>
    cohabitationStore.canOpenSelectedContract &&
    isHighRiskLargeFundSpendPurpose(draft.purpose) &&
    draft.state === 'executed' &&
    Boolean(draft.final_spend_ledger_id) &&
    (!draft.high_risk_receipt_status || draft.high_risk_receipt_status === 'pending') &&
    cohabitationStore.fund?.permissions.can_spend_large === true
  const selectedHighRiskReceiptDraft = computed(() =>
    fundLargeSpendDrafts.value.find(draft => draft.id === selectedHighRiskReceiptDraftId.value) ?? null
  )
  const highRiskReceiptRefPlaceholder = computed(() => {
    const draft = selectedHighRiskReceiptDraft.value
    if (!draft) return 'receipt:ref'
    if (draft.purpose === 'family_major_event') return `family_event:${draft.target_ref}:receipt`
    if (draft.purpose === 'shared_decoration_removal') return `shared_decoration_removal:${draft.target_ref}:receipt`
    return `delivery:${draft.target_ref}:receipt`
  })
  const canSubmitHighRiskReceipt = computed(() => {
    const draft = selectedHighRiskReceiptDraft.value
    if (!draft) return false
    return canRecordHighRiskReceiptDraft(draft) &&
      fundHighRiskReceiptRef.value.trim().length > 0 &&
      (fundHighRiskReceiptOutcome.value === 'delivered' || fundHighRiskReceiptCompensationAcknowledged.value)
  })

  const selectHighRiskReceiptDraft = (draft: CohabitationFundLargeSpendDraft) => {
    selectedHighRiskReceiptDraftId.value = draft.id
    fundHighRiskReceiptOutcome.value = 'delivered'
    fundHighRiskReceiptRef.value = draft.high_risk_receipt_ref || (draft.purpose === 'family_major_event'
      ? `family_event:${draft.target_ref}:receipt`
      : draft.purpose === 'shared_decoration_removal'
        ? `shared_decoration_removal:${draft.target_ref}:receipt`
        : `delivery:${draft.target_ref}:receipt`)
    fundHighRiskReceiptMemo.value = draft.high_risk_receipt_memo || ''
    fundHighRiskReceiptCompensationAcknowledged.value = false
  }

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
  const formatFamilyBuildingMainStateCandidateSnapshot = (
    row: CohabitationFamilyBuildingLedgerEntry['real_build_demolition_main_state_manifest'][number],
  ) => {
    const snapshot = row.candidate_snapshot || {}
    const home = snapshot.home || {}
    const decoration = snapshot.decoration || {}
    const renovationKeys = home.homeRenovationStateKeys?.length ? home.homeRenovationStateKeys.join(' / ') : '无'
    const ownedKeys = decoration.ownedKeys?.length ? decoration.ownedKeys.join(' / ') : '无'
    const placedKeys = decoration.placedKeys?.length ? decoration.placedKeys.join(' / ') : '无'
    return `农舍 ${home.farmhouseLevel ?? '-'} · 山洞 ${home.caveUnlocked ? '开' : '关'} / ${home.caveChoice || 'none'} · 温室 ${home.greenhouseUnlocked ? '开' : '关'} · 酒窖 ${home.cellarSlots ?? 0} · 改造 ${renovationKeys} · 装饰拥有 ${decoration.ownedCount ?? 0}(${ownedKeys}) · 已放置 ${decoration.placedCount ?? 0}(${placedKeys})`
  }
  const selectFamilyBuildingMainStateCandidatePathForMapping = (
    row: CohabitationFamilyBuildingLedgerEntry['real_build_demolition_main_state_manifest'][number],
  ) => {
    const paths = row.candidate_paths || []
    const snapshot = row.candidate_snapshot || {}
    const home = snapshot.home || {}
    const decoration = snapshot.decoration || {}
    const ownedCount = decoration.ownedCount ?? 0
    const placedCount = decoration.placedCount ?? 0
    const preferredPaths = [
      home.homeRenovationStateKeys?.length ? 'home.homeRenovationStates' : '',
      ownedCount > placedCount ? 'decoration.owned' : '',
      placedCount > 0 ? 'decoration.placed' : '',
      home.caveChoice === 'mushroom' || home.caveChoice === 'fruit_bat' ? 'home.caveChoice' : '',
      home.caveUnlocked === true && (!home.caveChoice || home.caveChoice === 'none') ? 'home.caveUnlocked' : '',
      home.greenhouseUnlocked === true ? 'home.greenhouseUnlocked' : '',
      (home.cellarSlots ?? 0) > 0 ? 'home.cellarSlots' : '',
      (home.farmhouseLevel ?? 0) > 0 ? 'home.farmhouseLevel' : '',
    ].filter(Boolean)
    return preferredPaths.find(path => paths.includes(path)) || paths[0] || 'home.homeRenovationStates'
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
  const canVerifyFamilyBuildingRealDemolitionMainStateMapping = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_preview_idempotency_key) &&
    Boolean(entry.real_build_demolition_main_state_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_manifest) &&
    entry.real_build_demolition_main_state_manifest.length > 0 &&
    !entry.real_build_demolition_main_state_mapping_idempotency_key
  const canGuardFamilyBuildingRealDemolitionMainStateMutation = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_mapping_idempotency_key) &&
    Boolean(entry.real_build_demolition_main_state_mapping_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_mapping_manifest) &&
    entry.real_build_demolition_main_state_mapping_manifest.length > 0 &&
    !entry.real_build_demolition_main_state_guard_idempotency_key
  const canExecuteFamilyBuildingRealDemolitionMainStateMutation = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_guard_idempotency_key) &&
    Boolean(entry.real_build_demolition_main_state_guard_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_guard_manifest) &&
    entry.real_build_demolition_main_state_guard_manifest.length > 0 &&
    !entry.real_build_demolition_main_state_execute_idempotency_key
  const canBindFamilyBuildingRealDemolitionMainStateExactTargets = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_execute_idempotency_key) &&
    entry.real_build_demolition_main_state_execution_state === 'blocked_missing_exact_personal_target' &&
    Boolean(entry.real_build_demolition_main_state_guard_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_guard_manifest) &&
    entry.real_build_demolition_main_state_guard_manifest.length > 0 &&
    !entry.real_build_demolition_main_state_exact_target_idempotency_key
  const canExecuteFamilyBuildingRealDemolitionMainStateExactTargets = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_exact_target_idempotency_key) &&
    entry.real_build_demolition_main_state_execution_state === 'exact_target_bound_pending_execute' &&
    Boolean(entry.real_build_demolition_main_state_exact_target_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_exact_target_manifest) &&
    entry.real_build_demolition_main_state_exact_target_manifest.length > 0 &&
    !entry.real_build_demolition_main_state_exact_execute_idempotency_key
  const canResolveFamilyBuildingRealDemolitionMainStateExactTargets = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_exact_target_idempotency_key) &&
    Boolean(entry.real_build_demolition_main_state_exact_execute_idempotency_key) &&
    entry.real_build_demolition_main_state_exact_execution_state === 'blocked_unresolved_exact_target_selector' &&
    Boolean(entry.real_build_demolition_main_state_exact_target_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_exact_target_manifest) &&
    entry.real_build_demolition_main_state_exact_target_manifest.length > 0 &&
    !entry.real_build_demolition_main_state_exact_target_resolution_idempotency_key
  const isSupportedFamilyBuildingMainStateExactMutationSelector = (target: { candidate_path?: string; delete_selector?: string; exact_target_ref?: string; target_kind?: string }) => {
    const candidatePath = target.candidate_path || ''
    const selector = target.delete_selector || target.exact_target_ref || ''
    const targetKind = target.target_kind || ''
    if (!candidatePath || !selector || selector.includes('.ui_exact_target_') || selector.includes('.qa_exact_target_') || selector.includes('.resolved_target_')) return false
    if (!selector.startsWith(`${candidatePath}.`)) return false
    const childKey = selector.slice(candidatePath.length + 1)
    if (!/^[a-z0-9_:-]{1,80}$/i.test(childKey)) return false
    if (targetKind && targetKind !== 'home' && candidatePath.startsWith('home.')) return false
    if (candidatePath === 'home.homeRenovationStates') return true
    if (candidatePath === 'home.farmhouseLevel') return /^[1-3]$/.test(childKey)
    if (candidatePath === 'home.caveChoice') return childKey === 'mushroom' || childKey === 'fruit_bat'
    if (candidatePath === 'home.caveUnlocked') return childKey === 'true'
    if (candidatePath === 'home.cellarSlots') return /^\d+$/.test(childKey)
    if (candidatePath === 'home.greenhouseUnlocked') return childKey === 'true'
    if (candidatePath === 'decoration.placed' || candidatePath === 'decoration.owned') return !targetKind || targetKind === 'decoration'
    return false
  }
  const canExecuteFamilyBuildingRealDemolitionMainStateExactMutation = (entry: CohabitationFamilyBuildingLedgerEntry) =>
    cohabitationStore.canOpenSelectedContract &&
    Boolean(entry.real_build_demolition_main_state_exact_target_resolution_idempotency_key) &&
    entry.real_build_demolition_main_state_exact_execution_state === 'blocked_personal_main_state_mutation_adapter_missing' &&
    Boolean(entry.real_build_demolition_main_state_exact_target_manifest_hash) &&
    Array.isArray(entry.real_build_demolition_main_state_exact_target_manifest) &&
    entry.real_build_demolition_main_state_exact_target_manifest.length > 0 &&
    entry.real_build_demolition_main_state_exact_target_manifest.every(isSupportedFamilyBuildingMainStateExactMutationSelector) &&
    !entry.real_build_demolition_main_state_exact_mutation_idempotency_key

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

  const processSelectedSharedWorkshopRecipe = async () => {
    sharedWorkshopActionMessage.value = ''
    sharedWorkshopActionOk.value = false
    sharedWorkshopLastResultRows.value = []
    const recipe = selectedSharedWorkshopRecipe.value
    if (!recipe) {
      sharedWorkshopActionMessage.value = '请选择共同工坊配方'
      return
    }
    if (!canProcessSelectedSharedWorkshopRecipe.value) {
      sharedWorkshopActionMessage.value = '共同仓库材料不足或当前成员没有工坊处理权限'
      return
    }
    try {
      const mediumBudgetLedger = sharedWorkshopMediumBudgetLedger.value
      const result = await cohabitationStore.processSharedWorkshopRecipe({
        recipe_id: recipe.id,
        alchemy_result_mode: selectedSharedWorkshopSupportsAlchemyAuto.value ? sharedWorkshopAlchemyResultMode.value : 'fixed',
        alchemy_heat_level: selectedSharedWorkshopSupportsAlchemyAuto.value && sharedWorkshopAlchemyResultMode.value === 'auto' ? sharedWorkshopAlchemyHeatLevel.value : 'balanced',
        fund_ledger_id: mediumBudgetLedger?.id || undefined,
        memo: `前端执行共同工坊配方：${recipe.label}`,
        idempotency_key: `ui-shared-workshop-${recipe.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const action = result?.workshop_action
      const outputItemId = action?.output_item_id || result?.recipe?.output_item_id || recipe.output_item_id
      const outputQuantity = action?.output_quantity ?? result?.recipe?.output_quantity ?? recipe.output_quantity
      const outputQuality = action?.output_quality || result?.recipe?.output_quality || recipe.output_quality
      const outputLabel = `${warehouseItemLabels[outputItemId] || outputItemId} x${outputQuantity} · ${qualityLabel(outputQuality)}`
      const ledgerIds = action?.warehouse_ledger_ids ?? result?.warehouse_ledger_entries?.map(entry => entry.id).filter(Boolean) ?? []
      const linkedFundLedgerId = action?.fund_ledger_id || mediumBudgetLedger?.id || ''
      const alchemyAutoResultLabel = action?.alchemy_auto_result
        ? `自动概率 · ${sharedWorkshopAlchemyResultLabel(action.alchemy_result_kind || '')} · ${action.alchemy_result_roll ?? 0}/${action.alchemy_result_roll_mod ?? 100}`
        : action?.alchemy_result_kind
          ? sharedWorkshopAlchemyResultLabel(action.alchemy_result_kind)
          : ''
      const alchemyWeightsLabel = sharedWorkshopAlchemyWeightsLabel(action?.alchemy_result_weights ?? null)
      const alchemyWeightProfile = typeof action?.alchemy_result_weight_profile === 'string' ? action.alchemy_result_weight_profile : ''
      const alchemyHeatLevel = (typeof action?.alchemy_heat_level === 'string' ? action.alchemy_heat_level : 'balanced') as SharedAlchemyHeatLevel
      const alchemyHeatLabel = (sharedWorkshopAlchemyHeatProfiles[alchemyHeatLevel] ?? sharedWorkshopAlchemyHeatProfiles.balanced).label
      sharedWorkshopLastResultRows.value = [
        { id: 'output', label: '产出入仓', value: outputLabel },
        { id: 'ledger', label: '流水', value: ledgerIds.length > 0 ? `${ledgerIds.length} 笔 · ${ledgerIds.slice(0, 3).join(' / ')}` : '服务端已处理，未返回流水 ID' },
        ...(alchemyAutoResultLabel ? [{ id: 'alchemy-result', label: '炼丹结果', value: alchemyAutoResultLabel }] : []),
        ...(action?.alchemy_auto_result && alchemyWeightsLabel ? [{ id: 'alchemy-weights', label: '概率权重', value: [alchemyWeightProfile ? `档位 ${alchemyWeightProfile}` : '', `火候 ${alchemyHeatLabel}`, alchemyWeightsLabel].filter(Boolean).join(' · ') }] : []),
        { id: 'bonus', label: '同时在线加成', value: simultaneousOnlineBonusLabel(action?.simultaneous_online_bonus) },
        { id: 'personal', label: '个人存档', value: action?.personal_save_changed === false ? '未改个人存档' : '以服务端回执为准' },
        { id: 'warehouse', label: '共同仓库', value: action?.shared_warehouse_changed === true ? '已消耗材料并写入产出' : '以刷新后仓库为准' },
        { id: 'fund', label: '共同基金', value: action?.shared_fund_changed === false ? '未重复扣共同基金' : '以服务端回执为准' },
        { id: 'medium-budget', label: '中额预算', value: action?.medium_fund_budget_linked && linkedFundLedgerId ? `已绑定 ${linkedFundLedgerId}` : '未绑定中额预算' },
      ]
      sharedWorkshopActionOk.value = true
      const budgetSuffix = action?.medium_fund_budget_linked && linkedFundLedgerId ? `，中额预算 ${linkedFundLedgerId} 已绑定` : ''
      sharedWorkshopActionMessage.value = result?.already_processed
        ? `该工坊配方已处理，已读回 ${outputLabel}${budgetSuffix}`
        : `已完成 ${recipe.label}，${outputLabel} 已进入共同仓库${budgetSuffix}`
    } catch (error) {
      sharedWorkshopActionMessage.value = error instanceof Error ? error.message : '处理共同工坊配方失败'
    }
  }

  const recoverWarehouseGovernance = async () => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    if (!canRecoverWarehouseGovernance.value) {
      warehouseActionMessage.value = '请填写共同仓库治理恢复原因'
      return
    }
    try {
      const direction = warehouseGovernanceRecoveryDirection.value
      const directionLabel = warehouseGovernanceDirectionLabel.value
      const result = await cohabitationStore.recoverWarehouseGovernance({
        direction,
        target_username: selectedContractActorMember.value?.username || cohabitationStore.currentAccount,
        reason: warehouseGovernanceRecoverReason.value.trim(),
        recovery_note: `前端恢复共同仓库${directionLabel}高频阻断`,
        idempotency_key: `ui-warehouse-governance-recover-${direction}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseGovernanceRecoverReason.value = ''
      const expiresAt = result?.recovery?.expires_at
      warehouseActionMessage.value = typeof expiresAt === 'number' && expiresAt > 0
        ? `已恢复${directionLabel}治理窗口，生效至 ${formatTime(expiresAt)}`
        : `已恢复${directionLabel}治理窗口`
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '恢复共同仓库治理阻断失败'
    }
  }

  const canSellWarehouseItem = (item: CohabitationWarehouseItem) =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.warehouse?.summary.sell_enabled === true &&
    cohabitationStore.warehouse?.permissions.can_sell_items === true &&
    warehouseAvailableQuantity(item) > 0 &&
    !isRareWarehouseItemId(item.item_id) &&
    ((item.quality || 'normal') === 'normal' || cohabitationStore.warehouse?.permissions.can_withdraw_high_quality === true) &&
    warehouseSellUnitPriceForItem(item) > 0

  const canWithdrawWarehouseItem = (item: CohabitationWarehouseItem) =>
    cohabitationStore.canOpenSelectedContract &&
    cohabitationStore.warehouse?.summary.withdraw_enabled === true &&
    cohabitationStore.warehouse?.permissions.can_withdraw_common === true &&
    warehouseAvailableQuantity(item) > 0 &&
    (item.quality || 'normal') === 'normal'

  const isRareWarehouseItemId = (itemId = '') => {
    const normalized = itemId.toLocaleLowerCase('zh-CN')
    return ['rare', 'legendary', 'unique', 'memorial', 'quest', 'key', 'token', 'voucher', 'ancient'].some(flag => normalized.includes(flag))
  }
  const isHighValueWarehouseItem = (item: CohabitationWarehouseItem) =>
    (item.quality || 'normal') !== 'normal' || isRareWarehouseItemId(item.item_id)
  const highValueDraftRiskLabel = (risk = '') => risk === 'rare' ? '稀有保护' : '高品质保护'
  const highValueDraftStateLabel = (state = '') => {
    if (state === 'pending_confirmation') return '待确认'
    if (state === 'ready_to_execute') return '可执行'
    if (state === 'executed') return '已执行'
    if (state === 'rolled_back') return '已撤销'
    return state || '未知'
  }
  const canCreateHighValueWarehouseWithdrawalDraft = (item: CohabitationWarehouseItem) =>
    cohabitationStore.canOpenSelectedContract &&
    (cohabitationStore.warehouse?.permissions.can_create_high_value_withdrawal_draft === true ||
      cohabitationStore.warehouse?.permissions.can_withdraw_high_quality === true ||
      cohabitationStore.warehouse?.permissions.can_withdraw_rare === true) &&
    warehouseAvailableQuantity(item) > 0 &&
    isHighValueWarehouseItem(item)
  const canConfirmHighValueWarehouseDraft = (draft: CohabitationWarehouseHighValueWithdrawalDraft) =>
    cohabitationStore.canOpenSelectedContract &&
    draft.state === 'pending_confirmation' &&
    draft.confirmation_state.pending_member_usernames.some(username => currentActorKeys.value.has(normalizeActorKey(username)))
  const canExecuteHighValueWarehouseDraft = (draft: CohabitationWarehouseHighValueWithdrawalDraft) =>
    cohabitationStore.canOpenSelectedContract &&
    draft.state === 'ready_to_execute' &&
    (currentActorKeys.value.has(normalizeActorKey(draft.requester_username)) ||
      currentActorKeys.value.has(normalizeActorKey(draft.requester_username_key || '')))
  const canRollbackHighValueWarehouseDraft = (draft: CohabitationWarehouseHighValueWithdrawalDraft) =>
    cohabitationStore.canOpenSelectedContract &&
    (draft.state === 'pending_confirmation' || draft.state === 'ready_to_execute') &&
    (currentActorKeys.value.has(normalizeActorKey(draft.requester_username)) ||
      currentActorKeys.value.has(normalizeActorKey(draft.requester_username_key || '')) ||
      cohabitationStore.warehouse?.permissions.can_create_high_value_withdrawal_draft === true)

  const canReadHighValueWarehouseCompensationAudit = (draft: CohabitationWarehouseHighValueWithdrawalDraft) =>
    cohabitationStore.canOpenSelectedContract && Boolean(draft.id)

  const readHighValueWarehouseCompensationAudit = async (draft: CohabitationWarehouseHighValueWithdrawalDraft) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    warehouseCompensationExecutionReceipt.value = draft.compensation_execution_receipt || ''
    warehouseCompensationExecutionNote.value = draft.compensation_execution_note || ''
    warehouseCompensationExecutionConfirmed.value = false
    warehouseManualAppealResolutionAction.value = draft.compensation_appeal_resolution_action || 'manual_appeal_compensated'
    warehouseManualAppealResolutionReceipt.value = draft.compensation_appeal_resolution_receipt || ''
    warehouseManualAppealResolutionNote.value = draft.compensation_appeal_resolution_note || ''
    warehouseManualAppealResolutionConfirmed.value = false
    warehouseOperatorReceiptAuditAction.value = draft.compensation_operator_receipt_audit_action || 'operator_receipt_verified'
    warehouseOperatorReceiptAuditReceipt.value = draft.compensation_operator_receipt_audit_receipt || ''
    warehouseOperatorReceiptAuditNote.value = draft.compensation_operator_receipt_audit_note || ''
    warehouseOperatorReceiptAuditConfirmed.value = false
    try {
      const result = await cohabitationStore.fetchWarehouseHighValueWithdrawalCompensationAuditBundle(draft.id)
      const bundle = result?.compensation_audit_bundle
      warehouseActionOk.value = true
      warehouseActionMessage.value = bundle?.appeal_packet.timeline_complete
        ? '已读取补偿审计证据包，时间线完整'
        : `已读取补偿审计证据包，缺失证据：${bundle?.appeal_packet.missing_evidence.join(' / ') || '无'}`
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '读取补偿审计证据包失败'
    }
  }

  const recordHighValueWarehouseCompensationExecution = async () => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    const bundle = warehouseCompensationAuditBundle.value
    const preflightAudit = warehouseCompensationExecutionPreflightAudit.value
    if (!bundle?.draft_id || !preflightAudit) {
      warehouseActionMessage.value = '请先读取包含预检记录的补偿审计证据包'
      return
    }
    if (!canRecordHighValueWarehouseCompensationExecution.value) {
      warehouseActionMessage.value = '请确认草案已执行、补偿复核已通过、预检审计存在，并填写人工回执编号'
      return
    }
    try {
      const result = await cohabitationStore.recordWarehouseHighValueWithdrawalCompensationExecution(bundle.draft_id, {
        execution_action: warehouseCompensationExecutionAction.value,
        execution_receipt: warehouseCompensationExecutionReceipt.value.trim(),
        execution_note: warehouseCompensationExecutionNote.value.trim() || '前端记录共同仓库高价值补偿人工回执',
        confirmation_text: 'CONFIRM_MANUAL_COMPENSATION_RECORDED',
        preflight_idempotency_key: preflightAudit.idempotency_key || undefined,
        preflight_audit_id: preflightAudit.id || undefined,
        idempotency_key: `ui-warehouse-compensation-execution-${bundle.draft_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseActionMessage.value = result?.compensation_execution?.record_only
        ? '已记录人工补偿回执，个人存档与共同仓库保持不变'
        : '已提交补偿回执记录'
      await cohabitationStore.fetchWarehouseHighValueWithdrawalCompensationAuditBundle(bundle.draft_id)
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值补偿回执失败'
    } finally {
      warehouseCompensationExecutionConfirmed.value = false
    }
  }

  const recordHighValueWarehouseManualAppealResolution = async () => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    const bundle = warehouseCompensationAuditBundle.value
    const executionAudit = warehouseCompensationExecutionAudit.value
    if (!bundle?.draft_id || !executionAudit) {
      warehouseActionMessage.value = '请先读取包含执行回执审计的补偿审计证据包'
      return
    }
    if (!canRecordHighValueWarehouseManualAppealResolution.value) {
      warehouseActionMessage.value = '请确认补偿回执已记录、申诉恢复仍可处理，并填写回执与处理说明'
      return
    }
    try {
      const result = await cohabitationStore.recordWarehouseHighValueWithdrawalManualAppealResolution(bundle.draft_id, {
        resolution_action: warehouseManualAppealResolutionAction.value,
        resolution_receipt: warehouseManualAppealResolutionReceipt.value.trim(),
        resolution_note: warehouseManualAppealResolutionNote.value.trim(),
        confirmation_text: 'CONFIRM_MANUAL_APPEAL_RESOLUTION_RECORDED',
        execution_idempotency_key: executionAudit.idempotency_key || undefined,
        execution_audit_id: executionAudit.id || undefined,
        idempotency_key: `ui-warehouse-manual-appeal-resolution-${bundle.draft_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseActionMessage.value = result?.manual_appeal_resolution?.record_only
        ? '已记录人工申诉恢复结论，个人存档与共同仓库保持不变'
        : '已提交人工申诉恢复记录'
      await cohabitationStore.fetchWarehouseHighValueWithdrawalCompensationAuditBundle(bundle.draft_id)
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值人工申诉恢复失败'
    } finally {
      warehouseManualAppealResolutionConfirmed.value = false
    }
  }

  const recordHighValueWarehouseOperatorReceiptAuditReview = async () => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    const bundle = warehouseCompensationAuditBundle.value
    const executionAudit = warehouseCompensationExecutionAudit.value
    const appealResolutionAudit = warehouseManualAppealResolutionAudit.value
    if (!bundle?.draft_id || !executionAudit) {
      warehouseActionMessage.value = '请先读取包含执行回执审计的补偿审计证据包'
      return
    }
    if (warehouseManualAppealResolutionAlreadyRecorded.value && !appealResolutionAudit) {
      warehouseActionMessage.value = '人工申诉恢复已记录，请先读取包含申诉恢复审计的证据包'
      return
    }
    if (!canRecordHighValueWarehouseOperatorReceiptAuditReview.value) {
      warehouseActionMessage.value = '请确认补偿回执已记录、回执审计仍可复核，并填写审计编号与复核说明'
      return
    }
    try {
      const result = await cohabitationStore.recordWarehouseHighValueWithdrawalOperatorReceiptAuditReview(bundle.draft_id, {
        audit_action: warehouseOperatorReceiptAuditAction.value,
        audit_receipt: warehouseOperatorReceiptAuditReceipt.value.trim(),
        audit_note: warehouseOperatorReceiptAuditNote.value.trim(),
        confirmation_text: 'CONFIRM_OPERATOR_RECEIPT_AUDIT_REVIEWED',
        execution_idempotency_key: executionAudit.idempotency_key || undefined,
        execution_audit_id: executionAudit.id || undefined,
        appeal_resolution_idempotency_key: appealResolutionAudit?.idempotency_key || undefined,
        appeal_resolution_audit_id: appealResolutionAudit?.id || undefined,
        idempotency_key: `ui-warehouse-operator-receipt-audit-${bundle.draft_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseActionMessage.value = result?.operator_receipt_audit_review?.record_only
        ? '已记录操作回执审计复核，个人存档与共同仓库保持不变'
        : '已提交操作回执审计复核'
      await cohabitationStore.fetchWarehouseHighValueWithdrawalCompensationAuditBundle(bundle.draft_id)
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '记录共同仓库高价值操作回执审计复核失败'
    } finally {
      warehouseOperatorReceiptAuditConfirmed.value = false
    }
  }

  const createHighValueWarehouseWithdrawalDraft = async (item: CohabitationWarehouseItem) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    try {
      const result = await cohabitationStore.createWarehouseHighValueWithdrawalDraft({
        item_id: item.item_id,
        quantity: 1,
        quality: item.quality || 'normal',
        reason: `申请取出 ${item.label || item.item_id}，先冻结并等待成员确认`,
        idempotency_key: `ui-warehouse-high-value-draft-${item.item_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseActionMessage.value = result?.draft?.confirmation_state.all_members_confirmed
        ? `已冻结 ${item.label || item.item_id} x1，草案可执行`
        : `已冻结 ${item.label || item.item_id} x1，等待成员确认`
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '创建高价值取出草案失败'
    }
  }

  const confirmHighValueWarehouseWithdrawalDraft = async (draft: CohabitationWarehouseHighValueWithdrawalDraft) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    try {
      const result = await cohabitationStore.confirmWarehouseHighValueWithdrawalDraft(draft.id, {
        confirmation_text: '确认高价值取出冻结与回滚方案',
        freeze_acknowledged: true,
        rollback_plan_acknowledged: true,
        idempotency_key: `ui-warehouse-high-value-confirm-${draft.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseActionMessage.value = result?.draft?.state === 'ready_to_execute' ? '双方已确认，草案可执行' : '已确认，等待其他成员'
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '确认高价值取出草案失败'
    }
  }

  const executeHighValueWarehouseWithdrawalDraft = async (draft: CohabitationWarehouseHighValueWithdrawalDraft) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    try {
      const result = await cohabitationStore.executeWarehouseHighValueWithdrawalDraft(draft.id, {
        expected_state: draft.state,
        reason: '执行已确认的高价值取出草案',
        idempotency_key: `ui-warehouse-high-value-execute-${draft.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      const total = result?.personal_inventory?.total_quantity
      warehouseActionMessage.value = typeof total === 'number'
        ? `已执行高价值取出，个人背包现有 ${total} 个`
        : '已执行高价值取出'
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '执行高价值取出草案失败'
    }
  }

  const rollbackHighValueWarehouseWithdrawalDraft = async (draft: CohabitationWarehouseHighValueWithdrawalDraft) => {
    warehouseActionMessage.value = ''
    warehouseActionOk.value = false
    try {
      await cohabitationStore.rollbackWarehouseHighValueWithdrawalDraft(draft.id, {
        reason: '前端撤销高价值取出草案并释放冻结库存',
        idempotency_key: `ui-warehouse-high-value-rollback-${draft.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      warehouseActionOk.value = true
      warehouseActionMessage.value = '已撤销草案并释放冻结库存'
    } catch (error) {
      warehouseActionMessage.value = error instanceof Error ? error.message : '撤销高价值取出草案失败'
    }
  }

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

  const canUseFundPurchase = (option: { amount: number }) => {
    const fundSummary = cohabitationStore.fund?.summary
    const fundPermissions = cohabitationStore.fund?.permissions
    const shopPurchaseEnabled = fundSummary?.shop_purchase_to_shared_warehouse_enabled === true
      ? fundPermissions?.can_shop_purchase_to_shared_warehouse === true
      : fundSummary?.spend_enabled === true && fundPermissions?.can_auto_buy_seeds_feed === true
    return cohabitationStore.canOpenSelectedContract && shopPurchaseEnabled && (cohabitationStore.fund?.balance ?? 0) >= option.amount
  }
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

  const buyWithSharedFund = async (option: FundPurchaseOption) => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    try {
      const result = await cohabitationStore.purchaseSharedFundShopItem({
        target_ref: option.targetRef,
        quantity: option.quantity,
        amount: option.amount,
        purpose: option.purpose,
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
        : `已创建 ${option.label} 草案${isHighRiskLargeFundSpendPurpose(option.purpose) ? '，后续需回执收口' : ''}，等待成员确认`
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

  const recordHighRiskReceipt = async () => {
    fundActionMessage.value = ''
    fundActionOk.value = false
    const draft = selectedHighRiskReceiptDraft.value
    const receiptRef = fundHighRiskReceiptRef.value.trim()
    if (!draft || !canRecordHighRiskReceiptDraft(draft) || !receiptRef) {
      fundActionMessage.value = '请选择已扣款且待回执的高风险草案，并填写回执引用'
      return
    }
    if (fundHighRiskReceiptOutcome.value === 'refunded' && !fundHighRiskReceiptCompensationAcknowledged.value) {
      fundActionMessage.value = '退款回执需要先确认补偿方案'
      return
    }
    try {
      const result = await cohabitationStore.recordSharedFundHighRiskReceipt(draft.id, {
        outcome: fundHighRiskReceiptOutcome.value,
        receipt_ref: receiptRef,
        memo: fundHighRiskReceiptMemo.value.trim() || undefined,
        compensation_plan_acknowledged: fundHighRiskReceiptOutcome.value === 'refunded'
          ? fundHighRiskReceiptCompensationAcknowledged.value
          : undefined,
        idempotency_key: `ui-fund-high-risk-receipt-${draft.id}-${fundHighRiskReceiptOutcome.value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      fundActionOk.value = true
      const balance = result?.shared_fund?.balance_after ?? result?.fund?.balance
      const refundAmount = result?.shared_fund?.refund_amount ?? 0
      fundActionMessage.value = result?.idempotent || result?.already_recorded
        ? '已读回既有高风险回执'
        : fundHighRiskReceiptOutcome.value === 'refunded'
          ? `已记录退款回执，退回共同基金 ${refundAmount} 文${typeof balance === 'number' ? `，余额 ${balance} 文` : ''}`
          : '已记录交付回执，高风险草案收口'
      selectedHighRiskReceiptDraftId.value = ''
      fundHighRiskReceiptRef.value = ''
      fundHighRiskReceiptMemo.value = ''
      fundHighRiskReceiptCompensationAcknowledged.value = false
    } catch (error) {
      fundActionMessage.value = error instanceof Error ? error.message : '记录共同基金高风险回执失败'
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
      const mediumBudgetLedger = buildingMaterialsMediumBudgetLedger.value
      const result = await cohabitationStore.consumeFamilyBuildingMaterials({
        building_ledger_id: entry.id,
        medium_fund_ledger_id: mediumBudgetLedger?.id || undefined,
        memo: `前端消耗家族建筑共同仓库材料：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-materials-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const consumedQuantity = result?.shared_warehouse?.consumed_quantity ?? 0
      const linkedFundLedgerId = result?.shared_fund?.medium_fund_budget_ledger_id || mediumBudgetLedger?.id || ''
      const budgetSuffix = result?.shared_fund?.medium_fund_budget_linked && linkedFundLedgerId ? `，中额预算 ${linkedFundLedgerId} 已绑定` : ''
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_consumed
        ? `该建筑流水已经消耗过共同仓库建材，已刷新状态${budgetSuffix}`
        : `已消耗共同仓库建材 ${consumedQuantity} 份，未重复扣共同基金或个人铜币${budgetSuffix}`
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

  const verifyFamilyBuildingRealDemolitionMainStateMapping = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    const manifest = entry.real_build_demolition_main_state_manifest || []
    if (!entry.real_build_demolition_main_state_manifest_hash || manifest.length === 0) {
      familyBuildingActionMessage.value = '请先生成个人主状态预览清单'
      return
    }
    try {
      const result = await cohabitationStore.verifyFamilyBuildingRealDemolitionMainStateMapping({
        building_ledger_id: entry.id,
        manifest_hash: entry.real_build_demolition_main_state_manifest_hash,
        memo: `前端记录家族建筑真实拆除个人主状态映射证明：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-mapping-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mappings: manifest.map(item => {
          const candidatePath = selectFamilyBuildingMainStateCandidatePathForMapping(item)
          return {
            username: item.username,
            username_key: item.username_key,
            save_slot: item.save_slot,
            save_id: item.save_id,
            real_build_ref: item.real_build_ref,
            candidate_path: candidatePath,
            binding_ref: `ui-proof:${entry.id}:${item.username_key}:${candidatePath}`,
            snapshot_hash: item.snapshot_hash,
          }
        }),
      })
      const mappingCount = result?.main_state_mapping?.manifest?.length
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_mapping_manifest?.length
        ?? entry.real_build_demolition_main_state_mapping_manifest?.length
        ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_mapped
        ? `该真实拆除个人主状态映射证明已记录，已读回 ${mappingCount} 条`
        : `已记录个人主状态映射证明 ${mappingCount} 条，仍未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '记录家族建筑真实拆除个人主状态映射证明失败'
    }
  }

  const guardFamilyBuildingRealDemolitionMainStateMutation = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    const mappingManifest = entry.real_build_demolition_main_state_mapping_manifest || []
    if (!entry.real_build_demolition_main_state_mapping_manifest_hash || mappingManifest.length === 0) {
      familyBuildingActionMessage.value = '请先记录个人主状态映射证明'
      return
    }
    try {
      const result = await cohabitationStore.guardFamilyBuildingRealDemolitionMainStateMutation({
        building_ledger_id: entry.id,
        mapping_manifest_hash: entry.real_build_demolition_main_state_mapping_manifest_hash,
        confirmation_text: '确认主状态变更安全阀',
        compensation_plan_acknowledged: true,
        rollback_plan_acknowledged: true,
        memo: `前端确认家族建筑真实拆除个人主状态变更安全阀：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-mutation-guard-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const guardCount = result?.main_state_mutation_guard?.manifest?.length
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_guard_manifest?.length
        ?? entry.real_build_demolition_main_state_guard_manifest?.length
        ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_guarded
        ? `该真实拆除个人主状态变更安全阀已确认，已读回 ${guardCount} 条`
        : `已确认个人主状态变更安全阀 ${guardCount} 条，仍未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '记录家族建筑真实拆除个人主状态变更安全阀失败'
    }
  }

  const executeFamilyBuildingRealDemolitionMainStateMutation = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    const guardManifest = entry.real_build_demolition_main_state_guard_manifest || []
    if (!entry.real_build_demolition_main_state_guard_manifest_hash || guardManifest.length === 0) {
      familyBuildingActionMessage.value = '请先确认个人主状态变更安全阀'
      return
    }
    try {
      const result = await cohabitationStore.executeFamilyBuildingRealDemolitionMainStateMutation({
        building_ledger_id: entry.id,
        guard_manifest_hash: entry.real_build_demolition_main_state_guard_manifest_hash,
        memo: `前端执行家族建筑真实拆除个人主状态阻断：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-execute-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const executionState = result?.main_state_execution?.execution_state
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_execution_state
        ?? entry.real_build_demolition_main_state_execution_state
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_executed
        ? `该个人主状态执行已记录：${familyBuildingMainStateExecutionLabel(executionState)}`
        : `已记录个人主状态执行阻断：${familyBuildingMainStateExecutionLabel(executionState)}，未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '执行家族建筑真实拆除个人主状态变更失败'
    }
  }

  const bindFamilyBuildingRealDemolitionMainStateExactTargets = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    const guardManifest = entry.real_build_demolition_main_state_guard_manifest || []
    if (!entry.real_build_demolition_main_state_guard_manifest_hash || guardManifest.length === 0) {
      familyBuildingActionMessage.value = '请先确认个人主状态变更安全阀'
      return
    }
    try {
      const result = await cohabitationStore.bindFamilyBuildingRealDemolitionMainStateExactTargets({
        building_ledger_id: entry.id,
        guard_manifest_hash: entry.real_build_demolition_main_state_guard_manifest_hash,
        expected_execution_state: 'blocked_missing_exact_personal_target',
        memo: `前端绑定家族建筑真实拆除个人主状态精确目标：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-exact-targets-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        targets: guardManifest.map((item, index) => {
          const exactTargetRef = `${item.candidate_path}.ui_exact_target_${entry.id}_${index}`
          return {
            username: item.username,
            username_key: item.username_key,
            save_slot: item.save_slot,
            save_id: item.save_id,
            real_build_ref: item.real_build_ref,
            candidate_path: item.candidate_path,
            binding_ref: item.binding_ref,
            snapshot_hash: item.snapshot_hash,
            exact_target_ref: exactTargetRef,
            delete_selector: exactTargetRef,
            target_kind: item.candidate_path.startsWith('decoration.') ? 'decoration' : 'home',
          }
        }),
      })
      const targetCount = result?.building_ledger_entry?.real_build_demolition_main_state_exact_target_manifest?.length
        ?? entry.real_build_demolition_main_state_exact_target_manifest?.length
        ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_bound
        ? `该个人主状态精确目标已绑定，已读回 ${targetCount} 条`
        : `已绑定个人主状态精确目标 ${targetCount} 条，仍未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '绑定家族建筑真实拆除个人主状态精确目标失败'
    }
  }

  const executeFamilyBuildingRealDemolitionMainStateExactTargets = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    if (!entry.real_build_demolition_main_state_exact_target_manifest_hash) {
      familyBuildingActionMessage.value = '请先绑定个人主状态精确目标'
      return
    }
    try {
      const result = await cohabitationStore.executeFamilyBuildingRealDemolitionMainStateExactTargets({
        building_ledger_id: entry.id,
        exact_target_manifest_hash: entry.real_build_demolition_main_state_exact_target_manifest_hash,
        expected_execution_state: 'exact_target_bound_pending_execute',
        confirmation_text: '确认精确执行安全阀',
        compensation_plan_acknowledged: true,
        rollback_plan_acknowledged: true,
        memo: `前端执行家族建筑真实拆除个人主状态精确目标阻断：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-exact-execute-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const executionState = result?.main_state_exact_execution?.execution_state
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_exact_execution_state
        ?? entry.real_build_demolition_main_state_exact_execution_state
      const unresolvedCount = result?.main_state_exact_execution?.unresolved_target_count
        ?? entry.real_build_demolition_main_state_exact_target_manifest?.length
        ?? 0
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_executed
        ? `该个人主状态精确执行已记录：${familyBuildingMainStateExecutionLabel(executionState)}`
        : `已记录个人主状态精确执行阻断：${familyBuildingMainStateExecutionLabel(executionState)}，待人工解析 ${unresolvedCount} 个目标，未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '执行家族建筑真实拆除个人主状态精确目标失败'
    }
  }

  const resolveFamilyBuildingRealDemolitionMainStateExactTargets = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    const exactTargetManifest = entry.real_build_demolition_main_state_exact_target_manifest || []
    if (!entry.real_build_demolition_main_state_exact_target_manifest_hash || exactTargetManifest.length === 0) {
      familyBuildingActionMessage.value = '请先绑定并执行个人主状态精确目标安全阀'
      return
    }
    try {
      const result = await cohabitationStore.resolveFamilyBuildingRealDemolitionMainStateExactTargets({
        building_ledger_id: entry.id,
        exact_target_manifest_hash: entry.real_build_demolition_main_state_exact_target_manifest_hash,
        expected_execution_state: 'blocked_unresolved_exact_target_selector',
        confirmation_text: '确认人工解析精确目标',
        memo: `前端人工解析家族建筑真实拆除个人主状态精确目标：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-exact-target-resolution-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        targets: exactTargetManifest.map((item, index) => {
          const resolvedTargetRef = `${item.candidate_path}.resolved_target_${entry.id}_${index}`
          return {
            username: item.username,
            username_key: item.username_key,
            save_slot: item.save_slot,
            save_id: item.save_id,
            real_build_ref: item.real_build_ref,
            candidate_path: item.candidate_path,
            binding_ref: item.binding_ref,
            snapshot_hash: item.snapshot_hash,
            exact_target_ref: resolvedTargetRef,
            delete_selector: resolvedTargetRef,
            target_kind: item.target_kind,
            resolution_proof: `ui-resolution-proof-${entry.id}-${index}`,
          }
        }),
      })
      const manifestCount = result?.main_state_exact_target_resolution?.manifest?.length
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_exact_target_manifest?.length
        ?? exactTargetManifest.length
      const executionState = result?.building_ledger_entry?.real_build_demolition_main_state_exact_execution_state
        ?? entry.real_build_demolition_main_state_exact_execution_state
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_resolved
        ? `该个人主状态精确目标已解析，已读回 ${manifestCount} 条`
        : `已人工解析个人主状态精确目标 ${manifestCount} 条，当前状态：${familyBuildingMainStateExecutionLabel(executionState)}，仍未删除个人房屋或建筑主状态`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '人工解析家族建筑真实拆除个人主状态精确目标失败'
    }
  }

  const executeFamilyBuildingRealDemolitionMainStateExactMutation = async (entry: CohabitationFamilyBuildingLedgerEntry) => {
    familyBuildingActionMessage.value = ''
    familyBuildingActionOk.value = false
    const exactTargetManifest = entry.real_build_demolition_main_state_exact_target_manifest || []
    if (!entry.real_build_demolition_main_state_exact_target_manifest_hash || exactTargetManifest.length === 0) {
      familyBuildingActionMessage.value = '请先完成人工解析个人主状态精确目标'
      return
    }
    if (!exactTargetManifest.every(isSupportedFamilyBuildingMainStateExactMutationSelector)) {
      familyBuildingActionMessage.value = '当前精确目标还不是可执行的窄 selector，请先人工选择真实 home / decoration 目标'
      return
    }
    try {
      const result = await cohabitationStore.executeFamilyBuildingRealDemolitionMainStateExactMutation({
        building_ledger_id: entry.id,
        exact_target_manifest_hash: entry.real_build_demolition_main_state_exact_target_manifest_hash,
        expected_execution_state: 'blocked_personal_main_state_mutation_adapter_missing',
        confirmation_text: '确认执行个人主状态变更',
        compensation_plan_acknowledged: true,
        rollback_plan_acknowledged: true,
        memo: `前端执行家族建筑真实拆除个人主状态精确变更：${entry.target_ref || entry.building_id || entry.project_id}`,
        idempotency_key: `ui-family-building-real-demolition-main-state-exact-mutation-${entry.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      const receiptCount = result?.main_state_exact_mutation?.receipts?.length
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_exact_mutation_receipts?.length
        ?? 0
      const executionState = result?.main_state_exact_mutation?.execution_state
        ?? result?.building_ledger_entry?.real_build_demolition_main_state_exact_execution_state
        ?? entry.real_build_demolition_main_state_exact_execution_state
      familyBuildingActionOk.value = true
      familyBuildingActionMessage.value = result?.already_mutated
        ? `该个人主状态精确变更已执行，已读回 ${receiptCount} 份回执`
        : `已执行个人主状态精确变更，写入 ${receiptCount} 份个人回执，当前状态：${familyBuildingMainStateExecutionLabel(executionState)}`
    } catch (error) {
      familyBuildingActionMessage.value = error instanceof Error ? error.message : '执行家族建筑真实拆除个人主状态精确变更失败'
    }
  }

  const makeFamilyActionIdempotencyKey = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const recordFamilyOrderResult = (message: string) => {
    familyOrderActionOk.value = true
    familyOrderActionMessage.value = message
  }
  const createFamilyOrderFromPanel = async () => {
    familyOrderActionMessage.value = ''
    familyOrderActionOk.value = false
    try {
      const result = await cohabitationStore.createFamilyOrder({
        title: '共同庄园备货单',
        order_type: 'material_help',
        stage_id: 'gather_materials',
        reward_route: 'shared_fund',
        reward_amount: 120,
        memo: '前端创建家族订单',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-order-create'),
      })
      const orderId = String(result?.order?.id || '')
      recordFamilyOrderResult(result?.idempotent ? '已读回家族订单发布记录' : `已发布家族订单${orderId ? `：${orderId}` : ''}`)
    } catch (error) {
      familyOrderActionMessage.value = error instanceof Error ? error.message : '创建家族订单失败'
    }
  }
  const acceptFirstFamilyOrder = async () => {
    const orderId = String(firstOpenFamilyOrder.value?.id || '')
    if (!orderId) return
    familyOrderActionMessage.value = ''
    familyOrderActionOk.value = false
    try {
      const result = await cohabitationStore.acceptFamilyOrder(orderId, {
        stage_id: String(firstOpenFamilyOrder.value?.stage_id || 'gather_materials'),
        memo: '前端接取家族订单',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-order-accept'),
      })
      recordFamilyOrderResult(result?.idempotent ? '已读回家族订单接取记录' : '已接取家族订单')
    } catch (error) {
      familyOrderActionMessage.value = error instanceof Error ? error.message : '接取家族订单失败'
    }
  }
  const deliverFirstFamilyOrder = async () => {
    const orderId = String(firstAcceptedFamilyOrder.value?.id || '')
    if (!orderId) return
    familyOrderActionMessage.value = ''
    familyOrderActionOk.value = false
    try {
      const result = await cohabitationStore.deliverFamilyOrder(orderId, {
        stage_id: String(firstAcceptedFamilyOrder.value?.stage_id || 'handoff_confirm'),
        delivery_note: '前端交付家族订单',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-order-deliver'),
      })
      recordFamilyOrderResult(result?.idempotent ? '已读回家族订单交付记录' : '已交付家族订单')
    } catch (error) {
      familyOrderActionMessage.value = error instanceof Error ? error.message : '交付家族订单失败'
    }
  }
  const settleFirstFamilyOrder = async () => {
    const orderId = String(firstDeliveredFamilyOrder.value?.id || '')
    if (!orderId) return
    familyOrderActionMessage.value = ''
    familyOrderActionOk.value = false
    try {
      const result = await cohabitationStore.settleFamilyOrder(orderId, {
        memo: '前端结算家族订单',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-order-settle'),
      })
      const fundAmount = Number(result?.fund_ledger_entry?.amount || 0)
      recordFamilyOrderResult(fundAmount > 0 ? `已结算家族订单，基金入账 ${fundAmount} 文` : '已结算家族订单')
    } catch (error) {
      familyOrderActionMessage.value = error instanceof Error ? error.message : '结算家族订单失败'
    }
  }
  const awardFamilyReputationFromPanel = async () => {
    familyReputationActionMessage.value = ''
    familyReputationActionOk.value = false
    try {
      const result = await cohabitationStore.awardFamilyReputation({
        source_type: 'family_governance',
        source_ref: `family_governance:ui:${Date.now()}`,
        points: 4,
        memo: '前端发放家族声望',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-reputation-award'),
      })
      familyReputationActionOk.value = true
      familyReputationActionMessage.value = result?.idempotent ? '已读回家族声望发放记录' : '已发放家族声望'
    } catch (error) {
      familyReputationActionMessage.value = error instanceof Error ? error.message : '发放家族声望失败'
    }
  }
  const claimFamilyReputationRewardFromPanel = async () => {
    const reward = familyReputationRewardCatalog.value.find(entry => entry.claim_enabled === true) ?? familyReputationRewardCatalog.value[0]
    familyReputationActionMessage.value = ''
    familyReputationActionOk.value = false
    try {
      const result = await cohabitationStore.claimFamilyReputationReward({
        reward_type: String(reward?.reward_type || 'shared_fund_grant'),
        reward_label: String(reward?.label || 'family reputation reward'),
        cost_points: Number(reward?.cost_points || 20),
        amount: Number(reward?.amount || 88),
        memo: '前端领取家族声望奖励',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-reputation-claim'),
      })
      const amount = Number(result?.fund_ledger_entry?.amount || reward?.amount || 0)
      familyReputationActionOk.value = true
      familyReputationActionMessage.value = result?.idempotent ? '已读回声望奖励领取记录' : `已领取声望奖励，基金入账 ${amount} 文`
    } catch (error) {
      familyReputationActionMessage.value = error instanceof Error ? error.message : '领取家族声望奖励失败'
    }
  }
  const publishFamilyVisibilityFromPanel = async () => {
    familyVisibilityActionMessage.value = ''
    familyVisibilityActionOk.value = false
    const memberConsent = Object.fromEntries(familyVisibilityMembers.value.map(member => [member.username_key, true]))
    try {
      const result = await cohabitationStore.updateFamilyVisibility({
        default_scope: 'public_profile',
        enabled_scope_ids: ['contract_members', 'public_profile', 'festival_room'],
        public_category_ids: ['contract_members', 'family_roles', 'shared_capabilities'],
        member_consent: memberConsent,
        memo: '前端写入家族公开设置',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-visibility-update'),
      })
      familyVisibilityActionOk.value = true
      familyVisibilityActionMessage.value = result?.idempotent ? '已读回家族公开设置记录' : '已写入家族公开设置与审计'
    } catch (error) {
      familyVisibilityActionMessage.value = error instanceof Error ? error.message : '更新家族公开设置失败'
    }
  }
  const rollbackFamilyVisibilityFromPanel = async () => {
    familyVisibilityActionMessage.value = ''
    familyVisibilityActionOk.value = false
    try {
      const result = await cohabitationStore.rollbackFamilyVisibility({
        audit_id: String(latestFamilyVisibilityRollbackAudit.value?.id || ''),
        memo: '前端回滚家族公开设置',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-visibility-rollback'),
      })
      familyVisibilityActionOk.value = true
      familyVisibilityActionMessage.value = result?.idempotent ? '已读回家族公开回滚记录' : '已回滚家族公开设置'
    } catch (error) {
      familyVisibilityActionMessage.value = error instanceof Error ? error.message : '回滚家族公开设置失败'
    }
  }
  const reserveFamilyFestivalSeatsFromPanel = async () => {
    const template = firstAvailableFamilyFestivalTemplate.value
    if (!template) return
    familyFestivalSeatActionMessage.value = ''
    familyFestivalSeatActionOk.value = false
    try {
      const result = await cohabitationStore.reserveFamilyFestivalSeats({
        template_id: template.id,
        seat_usernames: familyFestivalSeatMembers.value.map(member => member.username).filter(Boolean),
        memo: '前端锁定家族节会席位',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-festival-reserve'),
      })
      const seatCount = Number(result?.ledger_entry?.seat_count || familyFestivalSeatMembers.value.length || 0)
      familyFestivalSeatActionOk.value = true
      familyFestivalSeatActionMessage.value = result?.idempotent ? '已读回节会锁席记录' : `已锁定节会席位 ${seatCount} 个`
    } catch (error) {
      familyFestivalSeatActionMessage.value = error instanceof Error ? error.message : '锁定家族节会席位失败'
    }
  }
  const createFamilyFestivalRoomFromPanel = async () => {
    const template = firstAvailableFamilyFestivalTemplate.value
    if (!template) return
    familyFestivalSeatActionMessage.value = ''
    familyFestivalSeatActionOk.value = false
    try {
      const result = await cohabitationStore.createFamilyFestivalRoom({
        template_id: template.id,
        title: `${template.label || '家族节会'}共同席`,
        memo: '前端创建家族节会房间',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-festival-room'),
      })
      familyFestivalSeatActionOk.value = true
      familyFestivalSeatActionMessage.value = result?.idempotent ? '已读回节会房间记录' : `已创建节会房间${result?.room_id ? `：${result.room_id}` : ''}`
    } catch (error) {
      familyFestivalSeatActionMessage.value = error instanceof Error ? error.message : '创建家族节会房间失败'
    }
  }
  const consumeFamilyFestivalSuppliesFromPanel = async () => {
    const template = firstAvailableFamilyFestivalTemplate.value
    if (!template) return
    familyFestivalSeatActionMessage.value = ''
    familyFestivalSeatActionOk.value = false
    try {
      const result = await cohabitationStore.consumeFamilyFestivalSupplies({
        template_id: template.id,
        memo: '前端消耗家族节会供品',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-festival-supplies'),
      })
      const count = Array.isArray(result?.warehouse_ledger_entries) ? result.warehouse_ledger_entries.length : 0
      familyFestivalSeatActionOk.value = true
      familyFestivalSeatActionMessage.value = result?.idempotent ? '已读回节会供品消耗记录' : `已消耗节会供品，仓库流水 ${count} 笔`
    } catch (error) {
      familyFestivalSeatActionMessage.value = error instanceof Error ? error.message : '消耗家族节会供品失败'
    }
  }
  const settleFamilyFestivalRewardsFromPanel = async () => {
    const template = firstAvailableFamilyFestivalTemplate.value
    if (!template) return
    familyFestivalSeatActionMessage.value = ''
    familyFestivalSeatActionOk.value = false
    try {
      const result = await cohabitationStore.settleFamilyFestivalRewards({
        template_id: template.id,
        amount: 120,
        points: 10,
        memo: '前端结算家族节会奖励',
        idempotency_key: makeFamilyActionIdempotencyKey('ui-family-festival-settle'),
      })
      const amount = Number(result?.fund_ledger_entry?.amount || 0)
      familyFestivalSeatActionOk.value = true
      familyFestivalSeatActionMessage.value = result?.idempotent ? '已读回节会奖励结算记录' : `已结算节会奖励，基金入账 ${amount} 文`
    } catch (error) {
      familyFestivalSeatActionMessage.value = error instanceof Error ? error.message : '结算家族节会奖励失败'
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
      collect_offline_auto_income: '离线自动收益领取',
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
      high_risk_purchase_receipt: '高风险采购回执',
      confirm_high_risk_purchase_receipt: '确认高风险采购回执',
      delivery_or_refund: '交付 / 退款收口',
      family_event_resolution_receipt: '家庭事件决议回执',
      child_arrangement_review: '孩子安排复核',
      high_risk_purchase_governance_review: '高风险采购治理复核',
      family_event_governance_review: '家庭事件治理复核',
      freeze_shared_decoration_removal_disputes: '冻结共同装修拆除争议',
      write_family_building_ledger: '建筑流水',
      real_build_apply: '真实建造落账',
      demolish_family_building: '拆除家族建筑',
      real_build_demolition_manual_review: '真实拆除人工复核',
      real_build_demolition_execute: '真实拆除执行',
      real_build_demolition_personal_save_write: '真实拆除个人存档写回',
      real_build_demolition_main_state_mapping: '真实拆除个人主状态映射',
      real_build_demolition_main_state_mutation_guard: '真实拆除个人主状态变更安全阀',
      real_build_demolition_main_state_execute: '真实拆除个人主状态执行',
      real_build_demolition_main_state_exact_target_required: '真实拆除个人主状态精确目标待绑定',
      real_build_demolition_main_state_exact_execute: '真实拆除个人主状态精确执行',
      real_build_demolition_main_state_exact_target_manual_resolution: '真实拆除个人主状态精确目标人工解析',
      real_build_demolition_main_state_exact_mutation_adapter_required: '真实拆除个人主状态变更适配器待补',
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
      confirm_shared_fund_delta: '确认共同基金差额',
      refund_shared_fund: '返还共同基金',
      return_shared_warehouse_items: '返还共同仓库',
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
      warehouse_governance_recovered: '仓库治理恢复',
      warehouse_high_value_withdrawal_draft_created: '高价值草案创建',
      warehouse_high_value_withdrawal_draft_confirmed: '高价值草案确认',
      warehouse_high_value_withdrawal_executed: '高价值取出执行',
      warehouse_high_value_withdrawal_compensation_review_requested: '补偿复核申请',
      warehouse_high_value_withdrawal_compensation_review_resolved: '补偿复核处理',
      fund_shop_purchase_deposited: '共同基金购买入仓',
      warehouse_high_value_withdrawal_compensation_preflight_recorded: '补偿预检记录',
      warehouse_high_value_withdrawal_compensation_execution_recorded: '人工补偿回执',
      warehouse_high_value_withdrawal_manual_appeal_resolution_recorded: '人工申诉恢复',
      warehouse_high_value_withdrawal_operator_receipt_audit_reviewed: '回执审计复核',
      warehouse_high_value_withdrawal_rolled_back: '高价值草案回滚',
      shared_workshop_processed: '共同工坊处理',
      shared_decoration_moved: '共同装饰移动',
      offline_queue_merged: '离线队列合并',
      offline_conflict_preflighted: '离线冲突预检',
      offline_conflict_auto_resolved: '离线冲突自动解决',
      offline_auto_income_collected: '离线自动收益领取',
      cohabitation_daily_settled: '共同庄园日结',
      shared_farm_crop_removed: '共同农田铲除',
      fund_contributed: '共同基金注资',
      fund_spent: '共同基金支出',
      fund_large_spend_draft_created: '大额草案创建',
      fund_large_spend_draft_confirmed: '大额草案确认',
      fund_large_spend_draft_executed: '大额草案扣款',
      fund_large_spend_draft_expired: '大额草案过期',
      fund_high_risk_receipt_recorded: '高风险回执收口',
      fund_high_risk_execution_blocked: '高风险扣款阻断',
      fund_order_income: '公共订单入基金',
      fund_order_income_credited: '公共订单入基金',
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
      family_building_real_demolition_main_state_execution_blocked: '真实拆除主态执行阻断',
      permissions_updated: '权限更新',
      family_role_updated: '家族职位更新',
      separation_preview_created: '分居预览创建',
      separation_preview_confirmed: '分居预览确认',
      separation_execution_requested: '分居执行请求',
      separation_asset_return_recorded: '分居返还记录',
      separation_personal_farm_written: '来源田区写回',
      separation_shared_fund_delta_confirmation_recorded: '基金差额确认',
      separation_shared_fund_refunded: '共同基金返还',
      separation_shared_warehouse_returned: '共同仓库返还',
      separation_decorations_buildings_split: '装饰建筑拆分',
      separation_family_story_resolved: '剧情拆分记录',
      separation_story_cinematic_played: '剧情演出播放',
      separation_personal_story_receipts_written: '剧情回执写入',
      separation_child_arrangement_resolved: '孩子安排记录',
      separation_personal_family_receipts_written: '家庭回执写入',
    }
    return labels[action] || action
  }

  const sharedLogKindLabel = (action: string) => {
    if (action.includes('warehouse')) return '仓库'
    if (action.includes('workshop')) return '工坊'
    if (action.includes('decoration')) return '装修'
    if (action.includes('shared_farm')) return '共同农田'
    if (action.includes('fund')) return '基金'
    if (action.includes('permission') || action.includes('role')) return '治理'
    if (action.includes('offline')) return '离线'
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
    if (entry.action === 'warehouse_governance_recovered') {
      const direction = typeof detail.direction === 'string' ? detail.direction : ''
      const expiresAt = Number(detail.expires_at) || 0
      const directionLabel = direction === 'inbound' ? '入仓' : direction === 'outbound' ? '出仓' : '入仓 / 出仓'
      return expiresAt > 0 ? `${target || '成员'} ${directionLabel}恢复至 ${formatTime(expiresAt)}` : `${target || '成员'} ${directionLabel}恢复已记录`
    }
    if (entry.action === 'shared_workshop_processed') {
      const recipeId = typeof detail.recipe_id === 'string' ? detail.recipe_id : ''
      const recipe = sharedWorkshopRecipeOptions.find(option => option.id === recipeId)
      const outputItemId = typeof detail.output_item_id === 'string' ? detail.output_item_id : recipe?.output_item_id || ''
      const outputQuantity = Number(detail.output_quantity) || recipe?.output_quantity || 0
      const outputQuality = typeof detail.output_quality === 'string' ? detail.output_quality : recipe?.output_quality || 'normal'
      const ledgerCount = Array.isArray(detail.warehouse_ledger_ids) ? detail.warehouse_ledger_ids.length : 0
      const output = outputItemId ? `${warehouseItemLabels[outputItemId] || outputItemId} x${outputQuantity} · ${qualityLabel(outputQuality)}` : '产出已入仓'
      return `${recipe?.label || recipeId || '共同工坊'}：${output}，流水 ${ledgerCount} 笔，个人存档与共同基金不变`
    }
    if (entry.action === 'offline_auto_income_collected') {
      const collected = Number(detail.collected_count) || 0
      const farmCount = Number(detail.farm_harvest_count) || 0
      const animalCount = Number(detail.animal_product_count) || 0
      const warehouseLedgerCount = Array.isArray(detail.warehouse_ledger_ids) ? detail.warehouse_ledger_ids.length : 0
      return `领取 ${collected} 项：农田 ${farmCount}、动物产物 ${animalCount}，共同仓库流水 ${warehouseLedgerCount} 笔，个人存档与共同基金不变`
    }
    if (entry.action === 'offline_conflict_preflighted') {
      const clientRevision = Math.max(0, Math.floor(Number(detail.client_queue_revision) || 0))
      const serverRevision = Math.max(0, Math.floor(Number(detail.server_queue_revision) || 0))
      const unsupportedCount = Array.isArray(detail.unsupported_actions) ? detail.unsupported_actions.length : 0
      return `客户端 revision ${clientRevision} / 服务端 ${serverRevision}，${detail.client_queue_stale === true ? '需刷新后合并' : '可继续合并'}，不支持动作 ${unsupportedCount} 项`
    }
    if (entry.action === 'offline_conflict_auto_resolved') {
      const accepted = Number(detail.accepted_count) || 0
      const rejected = Number(detail.rejected_count) || 0
      const unsupported = Number(detail.unsupported_action_count) || 0
      const stale = detail.client_queue_stale === true ? '本地基线过期' : '本地基线一致'
      return `自动解决：提交 ${accepted}、拒绝 ${rejected}、不支持 ${unsupported}，${stale}，按服务端最新状态合并`
    }
    if (entry.action === 'shared_decoration_moved') {
      const move = detail.decoration_move && typeof detail.decoration_move === 'object'
        ? detail.decoration_move as Record<string, unknown>
        : detail
      const decorationId = typeof move.decoration_id === 'string' ? move.decoration_id : ''
      const toLocation = typeof move.to_location_ref === 'string' ? move.to_location_ref : ''
      const permissions = Array.isArray(detail.required_permission_keys) ? detail.required_permission_keys.filter(Boolean).join(' / ') : ''
      return [
        decorationId ? `装饰 ${decorationId}` : '',
        toLocation ? `目标 ${toLocation}` : '',
        permissions ? `权限 ${permissions}` : '',
        '不改个人小屋',
      ].filter(Boolean).join(' · ')
    }
    if (entry.action === 'offline_queue_merged') {
      const resolution = detail.offline_conflict_resolution && typeof detail.offline_conflict_resolution === 'object'
        ? detail.offline_conflict_resolution as Record<string, unknown>
        : {}
      const committed = Number(resolution.committed_count) || Number(detail.operation_count) || 0
      const idempotent = Number(resolution.idempotent_count) || 0
      const rejected = Number(resolution.rejected_count) || Number(detail.rejected_count) || 0
      const ledgerCount = Number(resolution.ledger_count) || (Array.isArray(detail.result_ledger_ids) ? detail.result_ledger_ids.length : 0)
      const stale = resolution.client_queue_stale === true || detail.client_queue_stale === true ? '客户端基线过期，按服务端最新状态处理' : '客户端基线一致'
      return `服务端权威队列合并：提交 ${committed}、幂等 ${idempotent}、拒绝 ${rejected}，流水 ${ledgerCount} 笔，${stale}`
    }
    if (entry.action === 'fund_high_risk_receipt_recorded') {
      const purpose = typeof detail.purpose === 'string' ? detail.purpose : ''
      const purposeLabel = typeof detail.purpose_label === 'string'
        ? detail.purpose_label
        : purpose === 'shared_decoration_removal'
          ? '共同装修拆除'
          : '高风险支出'
      const outcome = detail.outcome === 'refunded' ? '退款回执' : '交付回执'
      const amount = Number(detail.amount) || 0
      const refundLedgerId = typeof detail.refund_fund_ledger_id === 'string' ? detail.refund_fund_ledger_id : ''
      const originalLedgerId = typeof detail.original_fund_ledger_id === 'string' ? detail.original_fund_ledger_id : ''
      if (purpose === 'shared_decoration_removal') {
        const suffix = refundLedgerId ? `，退款 ledger ${refundLedgerId}` : '，不改个人小屋或装修主状态'
        return `${purposeLabel}已记录${outcome}，原基金 ledger ${originalLedgerId || '待核对'}，金额 ${amount} 文${suffix}`
      }
      return `${purposeLabel}已记录${outcome}，金额 ${amount} 文，个人铜币不合并`
    }
    if (entry.action === 'fund_high_risk_execution_blocked') {
      const pendingCount = Number(detail.pending_receipt_count) || 0
      const requiredOperation = typeof detail.required_operation === 'string' ? detail.required_operation : 'record_high_risk_receipt'
      return `仍有 ${pendingCount} 笔高风险扣款未收口，已阻断新的共同基金高风险执行；需先 ${requiredOperation}`
    }
    if (entry.action === 'separation_preview_created') {
      const version = Number(detail.preview_version) || 1
      const disputeCount = Number(detail.shared_decoration_removal_dispute_count) || Number(detail.shared_decoration_removal_disputes) || 0
      return disputeCount > 0
        ? `预览版本 v${version}，冻结 ${disputeCount} 笔共同装修拆除争议，仅生成返还草案，未执行拆分`
        : `预览版本 v${version}，仅生成返还草案，未执行拆分`
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
    if (entry.action === 'separation_shared_fund_delta_confirmation_recorded') {
      const confirmed = Array.isArray(detail.confirmed_member_usernames) ? detail.confirmed_member_usernames.length : 0
      const pending = Array.isArray(detail.pending_member_usernames) ? detail.pending_member_usernames.length : 0
      const amount = Number(detail.refund_total) || 0
      const amountText = amount > 0 ? `，锁定返还 ${amount} 文` : ''
      return pending > 0
        ? `共同基金消费差额已确认 ${confirmed} 人，仍有 ${pending} 人待确认${amountText}，未改动资金`
        : `共同基金消费差额已全员确认${amountText}，未改动资金`
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
    if (entry.action === 'separation_story_cinematic_played') {
      const eventId = typeof detail.animation_event_id === 'string' && detail.animation_event_id
        ? detail.animation_event_id
        : typeof detail.dialogue_event_id === 'string'
          ? detail.dialogue_event_id
          : ''
      return eventId ? `已记录分居剧情演出播放：${eventId}` : '已记录分居剧情演出播放'
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
    if (entry.action === 'family_building_real_demolition_main_state_execution_blocked') {
      return '已阻断个人主状态执行，缺少精确 home / decoration 删除目标，未改个人存档或共同资产'
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

  const familyBuildingMainStateExecutionLabel = (state?: string) => {
    const labels: Record<string, string> = {
      blocked_missing_exact_personal_target: '缺精确目标已阻断',
      ready_for_exact_personal_target_execution: '精确目标待执行',
      exact_target_bound_pending_execute: '精确目标已绑定待执行',
      blocked_unresolved_exact_target_selector: '精确目标未解析已阻断',
      blocked_personal_main_state_mutation_adapter_missing: '缺主状态变更适配器已阻断',
      personal_main_state_mutated: '个人主状态已变更',
      real_build_demolition_main_state_exact_target_required: '待绑定精确目标',
      real_build_demolition_main_state_exact_execute: '待精确执行',
      real_build_demolition_main_state_exact_target_manual_resolution: '待人工解析精确目标',
      real_build_demolition_main_state_exact_mutation_adapter_required: '待补主状态变更适配器',
    }
    return labels[state || ''] || state || '未执行'
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

  const permissionToggleGroups = (permissions: Record<string, Record<string, boolean>>) =>
    permissionToggleOptions.reduce<Array<{
      id: string
      enabled: number
      total: number
      options: typeof permissionToggleOptions
    }>>((groups, option) => {
      let group = groups.find(entry => entry.id === option.group)
      if (!group) {
        const values = permissions?.[option.group] ?? {}
        group = {
          id: option.group,
          enabled: Object.values(values).filter(Boolean).length,
          total: Object.keys(values).length || permissionToggleOptions.filter(entry => entry.group === option.group).length,
          options: [],
        }
        groups.push(group)
      }
      group.options.push(option)
      return groups
    }, [])

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
      withdraw_warehouse_common: '取出普通物品',
      spend_fund_small: '小额基金支出',
      spend_fund_medium: '中额基金支出',
      auto_pay_seeds_feed: '自动购买种子饲料',
      process_shared_workshop_recipe: '处理共同工坊配方',
      water_shared_farm: '浇水共同农田',
      plant_shared_farm: '种植共同农田',
      harvest_shared_farm: '收获共同农田',
      care_shared_farm: '管护共同农田',
      feed_shared_animal: '喂食共同动物',
      pet_shared_animal: '抚摸共同动物',
      collect_shared_animal_product: '收取动物产物',
      buy_shared_animal: '买入共同动物',
      sell_shared_animal: '出售共同动物',
      care_shared_pet: '照料共同宠物',
      record_rare_item_delivery_receipt: '稀有物交付回执',
      record_rare_item_refund_receipt: '稀有物退款回执',
      record_family_major_event_receipt: '家庭事件回执',
      record_family_major_event_refund_receipt: '家庭事件退款回执',
      record_limited_decoration_delivery_receipt: '限定装饰交付回执',
      record_limited_decoration_refund_receipt: '限定装饰退款回执',
      record_shared_decoration_removal_refund_receipt: '共同装修拆除退款回执',
      record_shared_decoration_removal_receipt: '共同装修拆除回执',
      settle_shared_daily: '共同庄园日结',
      collect_offline_auto_income: '领取离线自动收益',
      preflight_offline_conflicts: '预检离线冲突',
      resolve_offline_conflicts: '离线冲突解决',
      read_fund: '读取共同基金',
      contribute_fund: '注资共同基金',
      read_permissions: '读取权限',
      manage_permissions: '管理权限',
      create_separation_preview: '创建分居预览',
    }
    return labels[value] || value
  }

  onMounted(() => {
    syncActiveTabFromRoute()
    void refreshModule()
  })

  watch(() => cohabitationStore.activeContractId, (contractId) => {
    loadOfflineQueueDraftOperations(contractId)
  }, { immediate: true })

  watch(() => route.query.tab, () => {
    syncActiveTabFromRoute()
  })

  watch(selectedSharedPetCareItemId, () => {
    resetSharedPetCareConfirmation()
    sharedPetActionMessage.value = ''
    sharedPetActionOk.value = false
  })

  watch(selectedSharedWorkshopRecipeId, () => {
    if (!selectedSharedWorkshopSupportsAlchemyAuto.value) sharedWorkshopAlchemyResultMode.value = 'fixed'
    if (!selectedSharedWorkshopSupportsAlchemyAuto.value) sharedWorkshopAlchemyHeatLevel.value = 'balanced'
    sharedWorkshopActionMessage.value = ''
    sharedWorkshopActionOk.value = false
    sharedWorkshopLastResultRows.value = []
  })
</script>
