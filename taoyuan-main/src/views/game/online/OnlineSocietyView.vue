<template>
  <div class="space-y-3" data-testid="online-society-page">
    <OnlineModuleShell
      title="在线村社"
      :summary="moduleSummary"
      :meta="refreshStateLabel"
      refresh-label="刷新村社"
      :refresh-running="societyStore.loading"
      :refresh-disabled="societyStore.loading"
      :stats="summaryStats"
      stats-grid-class="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6"
      :tabs="tabs"
      :active-tab="activeTab"
      @refresh="refreshSocietyModule"
      @update:active-tab="setActiveTab"
    >
      <template #icon>
        <ShieldCheck :size="16" />
      </template>
      <template #errors>
        <OnlineStatusBanner
          v-if="societyStore.errorMessage"
          tone="danger"
          title="村社信息暂时没有刷新成功"
          :description="societyStore.errorMessage"
          action-label="重试"
          @action="refreshSocietyModule"
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
      </div>

      <div v-if="activeTab === 'overview'" class="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">我的村社</p>
              <span class="text-[0.625rem] text-muted">{{ currentSociety?.my_role_label || '未加入' }}</span>
            </div>
            <div v-if="currentSociety" class="mt-3 space-y-3">
              <div class="border border-accent/10 bg-black/10 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-accent">{{ currentSociety.name }}</p>
                    <p class="mt-1 text-[0.625rem] text-muted">
                      {{ currentSociety.theme_label }} · {{ currentSociety.visibility_label }} · {{ currentSociety.member_count }}/{{ currentSociety.capacity }} 人
                    </p>
                  </div>
                  <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ currentSociety.emblem_label }}</span>
                </div>
                <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ currentSociety.summary || '这个村社还没写简介。' }}</p>
              </div>

              <div class="grid gap-2 md:grid-cols-2">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">我的身份</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.my_role_label || '成员' }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">社长：{{ currentSociety.leader_display_name }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">入社条件</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.join_requirement_label }}</p>
                  <p class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ currentSociety.join_requirement_note || currentSociety.join_requirement_summary }}</p>
                </div>
              </div>

              <div class="grid gap-2 md:grid-cols-3">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">福利等级</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.level_title }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">等级 {{ currentSociety.level }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">公共建设</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.public_projects.length }} 项</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ activeProjectCount }} 项推进中</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">提案</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.active_proposals.length }} 条</p>
                  <p class="mt-1 text-[0.625rem] text-muted">归档 {{ currentSociety.proposal_history.length }} 条</p>
                </div>
              </div>
            </div>
            <OnlineEmptyState
              v-else
              class="mt-3"
              title="还没有加入村社"
              description="可以先创建自己的村社，也可以从公开村社里申请加入；失败时会保留当前草稿和已加载列表。"
              primary-label="创建村社"
              @primary="focusCreateSociety"
            />
          </div>

          <div v-if="currentSociety" class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">村社公告</p>
              <span class="text-[0.625rem] text-muted">{{ currentSociety.can_manage_notice ? '可编辑' : '只读' }}</span>
            </div>
            <template v-if="currentSociety.can_manage_notice">
              <textarea
                v-model="societyStore.draftNotice"
                rows="3"
                maxlength="160"
                class="online-textarea mt-3 w-full"
                placeholder="写一句让成员知道本周在忙什么。"
              />
              <div class="mt-2 flex justify-end">
                <button
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="societyStore.actionRunning"
                  @click="saveNotice"
                >
                  保存公告
                </button>
              </div>
            </template>
            <p v-else class="mt-3 text-xs leading-5 text-muted">{{ currentSociety.notice || '当前还没有村社公告。' }}</p>
          </div>

          <div v-if="!currentSociety" ref="createPanelRef" class="game-panel-muted p-3" data-testid="online-society-create-summary">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">创建村社</p>
              <span class="text-[0.625rem] text-muted">分步确认</span>
            </div>
            <p class="mt-2 text-xs leading-5 text-muted">
              先定名称、简介、徽记、公开方式和入社条件；草稿会留在向导里，创建失败后可以直接修改再提交。
            </p>
            <div class="mt-3 grid gap-2 text-xs md:grid-cols-2">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">草稿名称</p>
                <p class="mt-1 truncate text-accent">{{ societyStore.draftName.trim() || '还没有填写' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">徽记与主题</p>
                <p class="mt-1 truncate text-accent">{{ societyCreateEmblemLabel }} · {{ societyCreateThemeLabel }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">公开方式</p>
                <p class="mt-1 truncate text-accent">{{ societyCreateVisibilityLabel }} · {{ societyCreateCapacityLabel }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">入社条件</p>
                <p class="mt-1 truncate text-accent">{{ societyCreateJoinRequirementLabel }}</p>
              </div>
            </div>
            <button
              class="online-action-btn online-action-btn--primary mt-3 w-full justify-center"
              data-testid="online-society-create-trigger"
              type="button"
              @click="openSocietyCreateDialog"
            >
              创建村社
            </button>
          </div>

          <div v-if="!currentSociety && hasJoinRelations" class="game-panel-muted p-3">
            <p class="text-sm text-accent">我与村社的待处理关系</p>
            <div class="mt-3 space-y-2">
              <div v-for="request in societyStore.incomingInvites" :key="request.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs text-text">{{ request.society_name }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">邀请人：{{ request.invited_by_display_name || request.invited_by }}</p>
                <p v-if="request.target_save_id" class="mt-1 text-[0.625rem] text-muted">受邀存档 ID：{{ request.target_save_id }}</p>
                <button
                  class="online-action-btn online-action-btn--compact mt-2 w-full justify-center"
                  :data-testid="`online-society-incoming-request-detail-${request.id}`"
                  type="button"
                  :disabled="societyStore.actionRunning"
                  @click="openSocietyRequestDetail(request)"
                >
                  查看处理
                </button>
              </div>
              <div v-for="request in societyStore.myPendingRequests" :key="request.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs text-text">已申请：{{ request.society_name }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">等待村社管理者处理。</p>
                <p v-if="request.target_save_id" class="mt-1 text-[0.625rem] text-muted">申请存档 ID：{{ request.target_save_id }}</p>
                <button
                  class="online-action-btn online-action-btn--compact mt-2 w-full justify-center"
                  :data-testid="`online-society-pending-request-detail-${request.id}`"
                  type="button"
                  :disabled="societyStore.actionRunning"
                  @click="openSocietyRequestDetail(request)"
                >
                  查看详情
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">公开村社</p>
            <span class="text-[0.625rem] text-muted">{{ societyStore.visibleSocieties.length }} 个</span>
          </div>
          <OnlineEmptyState
            v-if="societyStore.visibleSocieties.length === 0"
            class="mt-3"
            title="还没有公开村社"
            description="等有村社公开名片后，会在这里显示可申请加入的入口。"
          />
          <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            <div v-for="society in visibleSocietyPreview" :key="society.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ society.name }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ society.theme_label }} · {{ society.visibility_label }} · {{ society.member_count }}/{{ society.capacity }} 人</p>
                </div>
                <span class="shrink-0 text-[0.625rem]" :class="getSocietyJoinState(society).tone">
                  {{ getSocietyJoinState(society).label }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ society.summary || '这个村社还没写简介。' }}</p>
              <p class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">公告：{{ society.notice || '暂无公告' }}</p>
              <p class="mt-1 text-[0.625rem] text-muted">入社条件：{{ society.join_requirement_label }}</p>
              <p v-if="society.join_requirement_note" class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ society.join_requirement_note }}</p>
              <p class="mt-1 text-[0.625rem] text-muted">发起人：{{ society.leader_display_name }}</p>
              <div v-if="society.can_apply && !currentSociety && !pendingRequestBySocietyId.has(society.id)" class="mt-2 flex justify-end">
                <button
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="societyStore.actionRunning"
                  @click="applySociety(society.id)"
                >
                  申请加入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'members'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">成员与职位</p>
            <span class="text-[0.625rem] text-muted">{{ memberCount }} 人</span>
          </div>
          <OnlineEmptyState
            v-if="!currentSociety"
            class="mt-3"
            title="加入村社后显示成员"
            description="成员、职位和治理入口会在加入后显示；现在可以回到总览创建村社或申请公开村社。"
          />
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="member in currentSociety.members" :key="`${currentSociety.id}-${member.username}`" class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-member-entry">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ member.display_name }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ member.username }} · {{ member.role_label }}</p>
                  <p v-if="member.save_id" class="mt-1 text-[0.625rem] text-muted">存档 ID：{{ member.save_id }}</p>
                </div>
                <div v-if="currentSociety.can_manage_roles && member.role !== 'president'" class="flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto">
                  <select v-model="memberRoleDrafts[member.username]" class="online-select min-w-32 flex-1 md:flex-none" :data-testid="`online-society-member-role-select-${member.username}`">
                    <option v-for="entry in assignableRoleOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                  <button
                    class="online-action-btn online-action-btn--compact"
                    :data-testid="`online-society-member-role-submit-${member.username}`"
                    type="button"
                    :disabled="societyStore.actionRunning || memberRoleDrafts[member.username] === member.role"
                    @click="changeMemberRole(member.username)"
                  >
                    调整
                  </button>
                </div>
                <span v-else class="w-fit shrink-0 text-[0.625rem] text-muted">{{ member.role === 'president' ? '社长职位不可在此调整' : '只读' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3" :data-testid="hasSocietyAdminActions ? 'online-society-admin-actions' : 'online-society-member-actions'">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">{{ hasSocietyAdminActions ? '管理员动作' : '成员视图' }}</p>
              <span class="text-[0.625rem] text-muted">{{ currentSociety?.my_role_label || '未加入' }}</span>
            </div>
            <div class="mt-3 grid gap-2 text-xs">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">待处理申请 / 邀请</p>
                <p class="mt-1 text-accent">{{ societyStore.managedRequests.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">我收到的邀请</p>
                <p class="mt-1 text-accent">{{ societyStore.incomingInvites.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">我的待处理申请</p>
                <p class="mt-1 text-accent">{{ societyStore.myPendingRequests.length }} 条</p>
              </div>
            </div>
            <div v-if="hasSocietyAdminActions" class="mt-3 grid gap-2">
              <button
                v-if="currentSociety?.can_invite"
                class="online-action-btn online-action-btn--primary w-full justify-center"
                data-testid="online-society-invite-panel-trigger"
                type="button"
                :disabled="societyInviteBusy"
                @click="openSocietyInvitePanel"
              >
                <UserPlus :size="12" />
                邀请成员
              </button>
              <button
                v-if="currentSociety?.can_review_requests"
                class="online-action-btn online-action-btn--compact w-full justify-center"
                data-testid="online-society-request-review-trigger"
                type="button"
                :disabled="societyStore.actionRunning || societyStore.managedRequests.length === 0"
                @click="societyStore.managedRequests[0] && openSocietyRequestDetail(societyStore.managedRequests[0])"
              >
                <ClipboardList :size="12" />
                {{ societyStore.managedRequests.length > 0 ? '处理第一条申请' : '暂无申请要处理' }}
              </button>
            </div>
            <p v-else class="mt-3 text-xs leading-5 text-muted">
              当前身份只显示成员和职位，不展示邀请、处理申请或调整职位的管理主按钮。
            </p>
          </div>

          <div v-if="currentSociety?.can_invite" class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">备用单人邀请</p>
              <span class="text-[0.625rem] text-muted">备用入口</span>
            </div>
            <details class="mt-3 border border-accent/10 bg-black/10 p-2">
              <summary class="cursor-pointer text-[0.625rem] text-muted">展开单人邀请表单</summary>
              <div class="mt-3 space-y-2">
                <input
                  v-model="societyStore.draftInviteUsername"
                  class="online-input w-full"
                  data-testid="online-society-invite-username-input"
                  placeholder="输入玩家用户名"
                />
                <input
                  v-model="societyStore.draftInviteSaveId"
                  class="online-input w-full"
                  data-testid="online-society-invite-save-id-input"
                  inputmode="numeric"
                  placeholder="或输入目标存档 ID"
                />
                <button
                  class="online-action-btn online-action-btn--primary w-full justify-center"
                  data-testid="online-society-invite-submit"
                  type="button"
                  :disabled="societyStore.actionRunning || !canInviteMember"
                  @click="inviteMember"
                >
                  {{ societyStore.actionRunning ? '邀请中' : '发送邀请' }}
                </button>
              </div>
            </details>
          </div>

          <div v-if="currentSociety?.can_review_requests" class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">申请处理</p>
              <span class="text-[0.625rem] text-muted">{{ societyStore.managedRequests.length }} 条</span>
            </div>
            <OnlineEmptyState
              v-if="societyStore.managedRequests.length === 0"
              class="mt-3"
              title="没有待处理申请"
              description="新的入社申请或邀请结果会汇总到这里，管理员可以在这里集中处理。"
            />
            <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              <div v-for="request in societyStore.managedRequests" :key="request.id" class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-managed-request-entry">
                <p class="text-xs text-text">{{ request.display_name }} · {{ request.type_label }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">{{ request.society_name }}</p>
                <p v-if="request.target_save_id" class="mt-1 text-[0.625rem] text-muted">存档 ID：{{ request.target_save_id }}</p>
                <button
                  class="online-action-btn online-action-btn--compact mt-2 w-full justify-center"
                  :data-testid="`online-society-managed-request-detail-${request.id}`"
                  type="button"
                  :disabled="societyStore.actionRunning"
                  @click="openSocietyRequestDetail(request)"
                >
                  查看处理
                </button>
              </div>
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">权限边界</p>
            <p class="mt-2 text-xs leading-5 text-muted">
              {{ memberPermissionSummary }}
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'storage'" class="grid gap-3 lg:grid-cols-2">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">仓库与福利</p>
            <span class="text-[0.625rem] text-muted">{{ currentSociety?.level_title || '未加入' }}</span>
          </div>
          <OnlineEmptyState
            v-if="!currentSociety"
            class="mt-3"
            title="加入村社后显示仓库"
            description="公共仓库、福利等级、专属节会和装饰解锁会在加入村社后显示。"
          />
          <div v-else class="mt-3 space-y-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-xs text-accent">福利等级</p>
              <p class="mt-1 text-[0.625rem] text-muted">
                等级 {{ currentSociety.level }} · 福利经验 {{ currentSociety.welfare_xp }}/{{ currentWelfareProgressTotal }}
                {{ currentSociety.welfare_xp_to_next_level > 0 ? `· 距下一级 ${currentSociety.welfare_xp_to_next_level}` : '· 已达当前最高级' }}
              </p>
              <div class="mt-2 h-2 overflow-hidden border border-accent/10 bg-bg">
                <div class="h-full bg-accent/70 transition-all" :style="{ width: `${currentWelfareProgressPercent}%` }" />
              </div>
            </div>

            <div class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">公共仓库</p>
                <span class="text-[0.625rem] text-muted">共用物资 {{ currentSociety.public_warehouse.funds }} 铜钱</span>
              </div>
              <div v-if="currentSociety.public_warehouse.deposit_options.length > 0" class="mt-3 grid gap-2 md:grid-cols-2">
                <button
                  v-for="entry in currentSociety.public_warehouse.deposit_options"
                  :key="entry.id"
                  type="button"
                  class="border border-accent/15 bg-black/10 px-2 py-2 text-left transition-colors hover:border-accent/35 disabled:cursor-not-allowed disabled:opacity-60"
                  :data-testid="`online-society-warehouse-deposit-${entry.id}`"
                  :disabled="societyStore.actionRunning"
                  @click="depositWarehouse(entry.id)"
                >
                  <p class="text-[0.625rem] text-accent">{{ entry.label }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ entry.category_label }} · 本周 +{{ entry.weekly_points }} 分</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ entry.costs.map(cost => cost.label).join(' + ') }}</p>
                </button>
              </div>
              <div
                v-if="currentSociety.public_warehouse.consume_options.length > 0"
                class="mt-3 border border-warning/15 bg-warning/5 p-2"
                data-testid="online-society-warehouse-consume-panel"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-warning">公共消耗</p>
                  <span class="text-[0.625rem] text-muted">只扣公共仓</span>
                </div>
                <div class="mt-2 grid gap-2 md:grid-cols-2">
                  <button
                    v-for="entry in currentSociety.public_warehouse.consume_options"
                    :key="entry.id"
                    type="button"
                    class="border border-warning/20 bg-black/10 px-2 py-2 text-left transition-colors hover:border-warning/40 disabled:cursor-not-allowed disabled:opacity-60"
                    :data-testid="`online-society-warehouse-consume-${entry.id}`"
                    :disabled="societyStore.actionRunning"
                    @click="openWarehouseConsumeConfirm(entry)"
                  >
                    <p class="text-[0.625rem] text-warning">{{ entry.label }}</p>
                    <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
                    <p class="mt-1 text-[0.625rem] text-muted">消耗：{{ entry.costs.map(cost => cost.label).join(' + ') }}</p>
                    <p v-if="entry.room_preload_hint" class="mt-1 text-[0.625rem] leading-4 text-warning">{{ entry.room_preload_hint }}</p>
                    <p v-if="entry.asset_boundary" class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.asset_boundary }}</p>
                  </button>
                </div>
              </div>
              <div
                v-if="currentSociety.public_warehouse.weekly_settlement"
                class="mt-3 border border-accent/10 bg-black/10 p-2"
                data-testid="online-society-warehouse-weekly-settlement"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-accent">本周村社仓廪</p>
                  <span class="text-[0.625rem] text-muted">{{ currentSociety.public_warehouse.weekly_settlement.status_label }}</span>
                </div>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                  {{ currentSociety.public_warehouse.weekly_settlement.total_points }} 分 ·
                  {{ currentSociety.public_warehouse.weekly_settlement.contributor_count }} 人 ·
                  {{ currentSociety.public_warehouse.weekly_settlement.covered_category_count }}/5 类齐备
                </p>
                <div class="mt-2 grid gap-1.5 sm:grid-cols-5">
                  <div
                    v-for="category in currentSociety.public_warehouse.weekly_settlement.categories"
                    :key="category.id"
                    class="border border-accent/10 px-1.5 py-1 text-[0.625rem] text-muted"
                  >
                    <p class="text-accent">{{ category.label }}</p>
                    <p>{{ category.points }} 分 / {{ category.count }} 次</p>
                  </div>
                </div>
                <div class="mt-2 grid gap-1.5 md:grid-cols-3">
                  <div
                    v-for="effect in warehouseWeeklyEffects"
                    :key="effect.label"
                    class="border border-accent/10 px-2 py-1.5 text-[0.625rem] leading-4 text-muted"
                    :class="effect.active ? 'bg-success/10 text-success' : 'bg-black/10'"
                  >
                    <p>{{ effect.label }}</p>
                    <p class="mt-0.5 text-muted">{{ effect.summary }}</p>
                  </div>
                </div>
              </div>
              <div v-if="currentSociety.public_warehouse.items.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                <span v-for="entry in currentSociety.public_warehouse.items" :key="entry.item_id" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                  {{ entry.label }}
                </span>
              </div>
              <div v-if="currentSociety.public_warehouse.logs.length > 0" class="mt-3 border-t border-accent/10 pt-2">
                <p class="text-[0.625rem] text-accent">最近仓廪记录</p>
                <div class="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
                  <div v-for="entry in currentSociety.public_warehouse.logs.slice(0, 6)" :key="entry.id" class="text-[0.625rem] leading-4 text-muted">
                    {{ warehouseLogText(entry) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-2 md:grid-cols-2">
              <div v-for="welfare in currentSociety.welfare_unlocks" :key="welfare.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs" :class="welfare.unlocked ? 'text-success' : 'text-muted'">{{ welfare.label }}</p>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ welfare.summary }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">解锁等级：{{ welfare.unlock_level }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">节会与装饰</p>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示专属节会和装饰解锁摘要。</div>
          <div v-else class="mt-3 space-y-2">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-xs" :class="currentSociety.exclusive_festival.unlocked ? 'text-success' : 'text-muted'">
                {{ currentSociety.exclusive_festival.label }}
              </p>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ currentSociety.exclusive_festival.summary }}</p>
              <p class="mt-1 text-[0.625rem] text-muted">解锁等级：{{ currentSociety.exclusive_festival.unlock_level }}</p>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ currentSociety.exclusive_festival.perk_summary }}</p>
            </div>
            <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in currentSociety.exclusive_decors" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-success' : 'text-muted'">{{ entry.label }}</p>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">解锁等级：{{ entry.unlock_level }}</p>
              </div>
            </div>
            <div class="border-t border-accent/10 pt-3">
              <p class="text-sm text-accent">专属任务</p>
              <div class="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                <div v-for="entry in currentSociety.exclusive_tasks" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                    <span class="text-[0.625rem] text-muted">{{ entry.status_label }}</span>
                  </div>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">解锁等级：{{ entry.unlock_level }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'projects'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">公共建设</p>
          <span class="text-[0.625rem] text-muted">{{ currentSociety?.public_projects.length || 0 }} 项</span>
        </div>
        <OnlineEmptyState
          v-if="!currentSociety"
          class="mt-3"
          title="加入村社后显示公共建设"
          description="公共建设进度、贡献入口和最近捐献记录会在这里集中展示。"
        />
        <div v-else class="mt-3 space-y-3">
          <AsyncCommunityBoard
            v-if="asyncCommunityProjects.length > 0"
            :projects="asyncCommunityProjects"
            :selected-project-id="activeAsyncCommunityProjectId"
            :recent-feedback="currentSociety.visual_state?.recent_feedback || ''"
            :action-running="societyStore.actionRunning"
            :action-labels="asyncCommunityActionLabels"
            details-mode="compact"
            @select-project="selectAsyncCommunityProject"
            @trigger-contribution="triggerAsyncCommunityContribution"
            @open-detail="openSocietyProjectDetail"
          />

          <div class="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div
              v-for="project in currentSociety.public_projects"
              :key="project.id"
              class="border border-accent/10 bg-black/10 p-2"
              :data-testid="`online-society-project-card-${project.id}`"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ project.label }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">
                    {{ project.status_label }} · {{ project.progress }}/{{ project.target_progress }} · 已贡献 {{ project.my_contribution_count }} 次
                  </p>
                </div>
                <span class="shrink-0 text-[0.625rem]" :class="project.status === 'completed' ? 'text-success' : 'text-accent'">{{ project.progress_percent }}%</span>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                <div class="h-full bg-accent/70 transition-all" :style="{ width: `${project.progress_percent}%` }" />
              </div>
              <p class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ project.summary }}</p>
              <p v-if="project.progress_note" class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ project.progress_note }}</p>
              <p v-if="project.status === 'completed'" class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-success">{{ project.world_feedback || project.completion_feedback }}</p>
              <RouterLink
                v-if="project.completion_room_launch"
                class="mt-2 flex items-center justify-between gap-2 border border-accent/20 bg-accent/10 px-2 py-2 text-[0.625rem] text-accent"
                :to="{
                  name: 'online-festival',
                  query: {
                    tab: 'festival-room',
                    template: project.completion_room_launch.template_id,
                    gameplay: project.completion_room_launch.gameplay_template_id,
                    title: project.completion_room_launch.title,
                  },
                }"
                data-testid="online-society-completion-room-launch"
              >
                <span class="min-w-0 truncate">
                  {{ project.completion_room_launch.label }}：{{ project.completion_room_launch.summary }}
                </span>
                <span class="shrink-0">创建房间</span>
              </RouterLink>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  class="online-action-btn online-action-btn--compact justify-center"
                  :data-testid="`online-society-project-detail-trigger-${project.id}`"
                  @click="openSocietyProjectDetail(project.id)"
                >
                  查看详情
                </button>
                <span class="text-[0.625rem] text-muted">最近记录 {{ project.recent_contributions.length }} 条</span>
              </div>

              <div v-if="project.can_contribute" class="mt-3 grid gap-2 md:grid-cols-2">
                <button
                  v-for="entry in project.contribution_packages"
                  :key="`${project.id}-${entry.id}`"
                  type="button"
                  class="border border-accent/15 bg-black/10 px-2 py-2 text-left transition-colors hover:border-accent/35 disabled:cursor-not-allowed disabled:opacity-60"
                  :data-testid="`online-society-project-contribute-${project.id}-${entry.id}`"
                  :disabled="societyStore.actionRunning"
                  @click="contributeProject(project.id, entry.id)"
                >
                  <p class="text-[0.625rem] text-accent">{{ entry.label }} · +{{ entry.progress_gain }} 进度</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">
                    {{ packageCostText(entry) }}
                    <span v-if="packageLimitText(entry)"> · {{ packageLimitText(entry) }}</span>
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'proposals'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">活跃提案</p>
            <span class="text-[0.625rem] text-muted">{{ currentSociety?.active_proposals.length || 0 }} 条</span>
          </div>
          <OnlineEmptyState
            v-if="!currentSociety"
            class="mt-3"
            title="加入村社后显示提案"
            description="活跃提案、投票入口和归档记录会在这里展示。"
          />
          <OnlineEmptyState
            v-else-if="currentSociety.active_proposals.length === 0"
            class="mt-3"
            title="没有进行中的提案"
            description="新的村社提案发起后，会在这里显示投票和归档进度。"
          />
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1" data-testid="online-society-proposal-list">
            <article
              v-for="proposal in currentSociety.active_proposals"
              :key="proposal.id"
              class="border border-accent/10 bg-black/10 p-2"
              :data-testid="`online-society-proposal-entry-${proposal.id}`"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ proposal.title }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ proposal.kind_label }} · {{ proposal.status_label }}</p>
                </div>
                <span class="shrink-0 text-[0.625rem] text-accent">{{ proposal.total_vote_count }} 票</span>
              </div>
              <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ proposal.summary }}</p>
              <p class="mt-2 text-[0.625rem] text-muted">
                赞成 {{ proposal.vote_counts.support }} / 反对 {{ proposal.vote_counts.reject }} / 暂缓 {{ proposal.vote_counts.abstain }}
              </p>
              <div v-if="proposal.can_vote" class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="choice in proposal.choice_options"
                  :key="`${proposal.id}-${choice.id}`"
                  class="online-action-btn online-action-btn--compact"
                  :data-testid="`online-society-proposal-vote-${proposal.id}-${choice.id}`"
                  type="button"
                  :disabled="societyStore.actionRunning"
                  @click="castVote(proposal.id, choice.id)"
                >
                  {{ choice.label }}
                </button>
              </div>
              <p v-if="proposal.my_vote_choice" class="mt-2 text-[0.625rem] text-success">我的当前票：{{ getProposalVoteLabel(proposal) }}</p>
              <div v-if="proposal.can_close" class="mt-2 flex justify-end">
                <button
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :data-testid="`online-society-proposal-close-trigger-${proposal.id}`"
                  :disabled="societyStore.actionRunning"
                  @click="openProposalArchiveDialog(proposal)"
                >
                  归档提案
                </button>
              </div>
            </article>
          </div>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3" data-testid="online-society-proposal-action-panel">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">提案操作</p>
              <span class="text-[0.625rem] text-muted">{{ currentSociety?.can_create_proposal ? '可发起' : '只读' }}</span>
            </div>
            <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后可以查看是否具备发起提案权限。</div>
            <div v-else-if="!currentSociety.can_create_proposal" class="mt-3 text-xs leading-5 text-muted">当前身份没有发起提案权限。</div>
            <div v-else class="mt-3 space-y-3">
              <div class="grid gap-2 text-xs">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">草稿标题</p>
                  <p class="mt-1 truncate text-accent">{{ societyStore.draftProposalTitle.trim() || '还没有填写' }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[0.625rem] text-muted">提案类型</p>
                  <p class="mt-1 truncate text-accent">{{ draftProposalKindLabel }}</p>
                </div>
              </div>
              <button
                class="online-action-btn online-action-btn--primary w-full justify-center"
                data-testid="online-society-proposal-create-trigger"
                type="button"
                :disabled="societyStore.actionRunning"
                @click="openSocietyProposalDialog"
              >
                发起提案
              </button>
            </div>
          </div>

          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">提案归档</p>
            <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示历史提案。</div>
            <div v-else-if="currentSociety.proposal_history.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有已归档的村社提案。</div>
            <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              <div v-for="proposal in currentSociety.proposal_history" :key="proposal.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ proposal.title }}</p>
                    <p class="mt-1 text-[0.625rem] text-muted">{{ proposal.kind_label }} · {{ proposal.result_label }}</p>
                  </div>
                  <span class="shrink-0 text-[0.625rem] text-muted">{{ proposal.total_vote_count }} 票</span>
                </div>
                <p class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ proposal.summary }}</p>
                <details
                  v-if="proposal.resolution_note"
                  class="mt-2 border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-4 text-muted"
                  :data-testid="`online-society-proposal-archive-note-${proposal.id}`"
                >
                  <summary class="cursor-pointer text-accent">查看归档备注</summary>
                  <p class="mt-1">{{ proposal.resolution_note }}</p>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'chronicles'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">村社史册</p>
            <span class="text-[0.625rem] text-muted">{{ currentSociety?.chronicle.founded_date_label || '未加入' }}</span>
          </div>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示史册摘要。</div>
          <div v-else class="mt-3 space-y-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">年度摘要</p>
              <p class="mt-1 text-xs leading-5 text-accent">{{ currentSociety.chronicle.annual_summary }}</p>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">成立日期</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.founded_date_label || '待记录' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">历任职位</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.role_history.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">公共建设</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.public_projects.length }} 项</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[0.625rem] text-muted">节会参与</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.festival_participations.length }} 条</p>
              </div>
            </div>
            <div v-if="currentSociety.chronicle.role_history.length > 0" class="max-h-56 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">历任职位</p>
              <div v-for="entry in currentSociety.chronicle.role_history" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.display_name }}</p>
                  <span class="shrink-0 text-[0.625rem] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                </div>
                <p class="mt-1 text-[0.625rem] text-muted">{{ entry.role_label }}</p>
              </div>
            </div>
            <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">公共建设列表</p>
              <div v-for="entry in currentSociety.chronicle.public_projects" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.label }}</p>
                  <span class="shrink-0 text-[0.625rem]" :class="entry.status === 'completed' ? 'text-success' : 'text-muted'">{{ entry.status_label }}</span>
                </div>
                <p class="mt-1 text-[0.625rem] text-muted">
                  {{ entry.progress }}/{{ entry.target_progress }} · 共 {{ entry.contribution_count }} 条贡献
                  <template v-if="entry.completed_at && entry.completed_by_display_name">
                    · {{ entry.completed_by_display_name }} 完工
                  </template>
                </p>
                <p v-if="activeCompletionRewardText(entry.completion_rewards)" class="mt-1 text-[0.625rem] leading-4 text-success">
                  落成效果：{{ activeCompletionRewardText(entry.completion_rewards) }}
                </p>
              </div>
            </div>
            <div v-if="currentSociety.chronicle.festival_participations.length > 0" class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">节会参与列表</p>
              <div v-for="entry in currentSociety.chronicle.festival_participations" :key="entry.memorial_id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.template_label }}</p>
                  <span class="shrink-0 text-[0.625rem] text-muted">{{ formatChronicleDate(entry.awarded_at) }}</span>
                </div>
                <p class="mt-1 text-[0.625rem] text-muted">{{ entry.gameplay_template_label }} · {{ entry.participant_count }} 名社员参与</p>
                <p class="mt-1 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ entry.participant_display_names.join('、') }}</p>
              </div>
            </div>
            <div v-if="currentSociety.chronicle.timeline.length > 0" class="max-h-72 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">关键事件时间线</p>
              <div v-for="entry in currentSociety.chronicle.timeline" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.label }}</p>
                  <span class="shrink-0 text-[0.625rem] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                </div>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">主要贡献成员</p>
          <div v-if="!currentSociety || currentSociety.chronicle.top_contributors.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有贡献成员记录。</div>
          <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            <div v-for="entry in currentSociety.chronicle.top_contributors" :key="entry.username" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-xs text-text">{{ entry.display_name }}</p>
                <span class="shrink-0 text-[0.625rem] text-accent">{{ entry.contribution_count }} 次</span>
              </div>
              <p class="mt-1 text-[0.625rem] text-muted">{{ entry.project_count }} 项建设 · +{{ entry.total_progress_gain }} 进度</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <OnlineActionDialog
      :open="societyCreateOpen"
      title="创建村社"
      description="按步骤确认名称、公告、徽记、公开方式和入社条件；创建失败时，当前草稿会继续保留。"
      :confirm-disabled="societyCreateSubmitDisabled"
      :running="societyStore.actionRunning"
      @confirm="createSociety"
      @cancel="closeSocietyCreateDialog"
      @close="closeSocietyCreateDialog"
    >
      <div class="space-y-3" data-testid="online-society-create-dialog">
        <div class="flex flex-wrap gap-1" role="list" aria-label="创建村社步骤">
          <span
            v-for="step in societyCreateSteps"
            :key="step.key"
            class="border px-2 py-1 text-[0.625rem]"
            :class="step.key === societyCreateStep ? 'border-accent/40 bg-accent/5 text-accent' : 'border-accent/15 text-muted'"
            role="listitem"
          >
            {{ step.label }}
          </span>
        </div>

        <OnlineStatusBanner
          v-if="societyCreateError"
          tone="danger"
          title="村社暂时没有创建成功"
          :description="societyCreateError"
        />

        <section v-if="societyCreateStep === 'basic'" class="space-y-2" data-testid="online-society-create-step-basic">
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            村社名称
            <input
              v-model="societyStore.draftName"
              maxlength="24"
              class="online-input w-full"
              data-testid="online-society-create-name-input"
              placeholder="例如：清溪灯社"
            />
          </label>
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            一句简介
            <textarea
              v-model="societyStore.draftSummary"
              rows="3"
              maxlength="120"
              class="online-textarea w-full resize-none"
              data-testid="online-society-create-summary-input"
              placeholder="写清楚这个村社想组织怎样的生活、节会和协作方式。"
            />
          </label>
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            初始公告
            <textarea
              v-model="societyStore.draftNotice"
              rows="2"
              maxlength="160"
              class="online-textarea w-full resize-none"
              data-testid="online-society-create-notice-input"
              placeholder="例如：本周先招募稳定成员，再排第一轮节会值守。"
            />
          </label>
        </section>

        <section v-else-if="societyCreateStep === 'style'" class="space-y-2" data-testid="online-society-create-step-style">
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            村社徽记
            <select v-model="societyStore.draftEmblem" class="online-select w-full" data-testid="online-society-create-emblem-select">
              <option v-for="entry in societyStore.emblemOptions" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            村社主题
            <select v-model="societyStore.draftTheme" class="online-select w-full" data-testid="online-society-create-theme-select">
              <option v-for="entry in societyStore.themeOptions" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </label>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">当前外观</p>
            <p class="mt-1 text-xs text-accent">{{ societyCreateEmblemLabel }} · {{ societyCreateThemeLabel }}</p>
          </div>
        </section>

        <section v-else-if="societyCreateStep === 'access'" class="space-y-2" data-testid="online-society-create-step-access">
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            公开范围
            <select v-model="societyStore.draftVisibility" class="online-select w-full" data-testid="online-society-create-visibility-select">
              <option v-for="entry in societyStore.visibilityOptions" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            成员容量
            <select v-model="societyStore.draftCapacity" class="online-select w-full" data-testid="online-society-create-capacity-select">
              <option v-for="entry in societyStore.capacityOptions" :key="entry.value" :value="entry.value">
                {{ entry.label }}
              </option>
            </select>
          </label>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">展示方式</p>
            <p class="mt-1 text-xs text-accent">{{ societyCreateVisibilityLabel }} · {{ societyCreateCapacityLabel }}</p>
          </div>
        </section>

        <section v-else-if="societyCreateStep === 'join'" class="space-y-2" data-testid="online-society-create-step-join">
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            入社条件
            <select v-model="societyStore.draftJoinRequirementId" class="online-select w-full" data-testid="online-society-create-join-requirement-select">
              <option v-for="entry in societyStore.joinRequirementOptions" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-[0.625rem] text-muted">
            补充说明
            <input
              v-model="societyStore.draftJoinRequirementNote"
              maxlength="80"
              class="online-input w-full"
              data-testid="online-society-create-join-note-input"
              placeholder="例如：希望先有公开名片和稳定经营节奏。"
            />
          </label>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">条件摘要</p>
            <p class="mt-1 text-xs leading-5 text-accent">{{ societyCreateJoinRequirementLabel }}</p>
            <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ societyCreateJoinRequirementSummary }}</p>
          </div>
        </section>

        <section v-else class="space-y-2" data-testid="online-society-create-step-review">
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">村社名称</p>
            <p class="mt-1 text-xs text-accent">{{ societyStore.draftName.trim() || '未填写' }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">简介与公告</p>
            <p class="mt-1 text-xs leading-5 text-accent">{{ societyStore.draftSummary.trim() || '创建后可以继续补充简介。' }}</p>
            <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ societyStore.draftNotice.trim() || '创建后可以再写公告。' }}</p>
          </div>
          <div class="grid gap-2 text-xs md:grid-cols-2">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">徽记主题</p>
              <p class="mt-1 text-accent">{{ societyCreateEmblemLabel }} · {{ societyCreateThemeLabel }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[0.625rem] text-muted">公开与容量</p>
              <p class="mt-1 text-accent">{{ societyCreateVisibilityLabel }} · {{ societyCreateCapacityLabel }}</p>
            </div>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">入社条件</p>
            <p class="mt-1 text-xs text-accent">{{ societyCreateJoinRequirementLabel }}</p>
            <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ societyStore.draftJoinRequirementNote.trim() || societyCreateJoinRequirementSummary }}</p>
          </div>
        </section>
      </div>

      <template #footer="{ confirmDisabled, confirm, cancel }">
        <footer class="space-y-3 border-t border-accent/10 pt-3">
          <p v-if="societyCreateStep === 'basic' && !societyStore.draftName.trim()" class="text-[0.625rem] leading-4 text-muted">
            先填写村社名称，再继续下一步。
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              :disabled="societyStore.actionRunning"
              @click="cancel"
            >
              稍后再说
            </button>
            <button
              v-if="societyCreateStep !== 'basic'"
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              data-testid="online-society-create-back"
              :disabled="societyStore.actionRunning"
              @click="goPreviousSocietyCreateStep"
            >
              <ChevronLeft :size="12" />
              上一步
            </button>
            <button
              v-if="societyCreateStep !== 'review'"
              type="button"
              class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
              data-testid="online-society-create-next"
              :disabled="societyCreateNextDisabled"
              @click="goNextSocietyCreateStep"
            >
              下一步
              <ChevronRight :size="12" />
            </button>
            <button
              v-else
              class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
              data-testid="online-society-create-submit"
              type="button"
              :disabled="confirmDisabled"
              @click="confirm"
            >
              {{ societyStore.actionRunning ? '创建中' : '创建村社' }}
            </button>
          </div>
        </footer>
      </template>
    </OnlineActionDialog>

    <OnlineBottomSheet
      :open="Boolean(selectedSocietyProjectDetailId)"
      :title="selectedSocietyProjectDetailTitle"
      :description="selectedSocietyProjectDetailDescription"
      side="right"
      @close="closeSocietyProjectDetail"
    >
      <div
        v-if="selectedAsyncCommunityProjectDetail || selectedPublicProjectDetail"
        class="space-y-3"
        data-testid="online-society-project-detail-sheet"
      >
        <section class="grid gap-2 text-xs md:grid-cols-2">
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">工程状态</p>
            <p class="mt-1 text-accent">{{ selectedPublicProjectDetail?.status_label || '推进中' }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">当前阶段</p>
            <p class="mt-1 text-accent">
              {{ selectedSocietyProjectCurrentStage?.label || selectedPublicProjectDetail?.progress_note || '等待推进' }}
            </p>
          </div>
        </section>

        <section v-if="selectedAsyncCommunityProjectDetail" class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-project-stage-list">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent">阶段详情</p>
            <span class="text-[0.625rem] text-muted">{{ selectedSocietyProjectCompletedStageCount }}/{{ selectedAsyncCommunityProjectDetail.stages.length }} 阶段</span>
          </div>
          <div class="mt-2 space-y-2">
            <div v-for="stage in selectedAsyncCommunityProjectDetail.stages" :key="stage.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-[0.625rem] text-accent">{{ stage.label || stage.id }}</p>
                <span class="shrink-0 text-[0.625rem] text-muted">{{ asyncStageProgressPercent(stage) }}%</span>
              </div>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                {{ asyncStageStateLabel(stage.state) }} · {{ stage.progress_value }}/{{ stage.progress_target }}
              </p>
            </div>
          </div>
        </section>

        <section v-if="selectedSocietyProjectReadbackRows.length > 0" class="border border-accent/10 bg-black/10 p-2" data-testid="async-community-project-readback">
          <div
            v-for="entry in selectedSocietyProjectReadbackRows"
            :key="entry.id"
            class="flex items-center justify-between gap-3 text-[0.625rem] leading-4"
          >
            <span class="text-muted">{{ entry.label }}</span>
            <strong class="text-right text-accent">{{ entry.value }}</strong>
          </div>
        </section>

        <section v-if="(selectedPublicProjectDetail?.completion_rewards || []).length > 0" class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-project-completion-rewards">
          <p class="text-xs text-accent">完工效果</p>
          <div class="mt-2 space-y-1">
            <p
              v-for="reward in selectedPublicProjectDetail?.completion_rewards || []"
              :key="`${selectedPublicProjectDetail?.id}-${reward.id}`"
              class="text-[0.625rem] leading-4"
              :class="reward.active ? 'text-success' : 'text-muted'"
            >
              {{ reward.label }}：{{ reward.summary }}
            </p>
          </div>
        </section>

        <RouterLink
          v-if="selectedPublicProjectDetail?.completion_room_launch"
          class="flex items-center justify-between gap-2 border border-accent/20 bg-accent/10 px-2 py-2 text-[0.625rem] text-accent"
          :to="{
            name: 'online-festival',
            query: {
              tab: 'festival-room',
              template: selectedPublicProjectDetail.completion_room_launch.template_id,
              gameplay: selectedPublicProjectDetail.completion_room_launch.gameplay_template_id,
              title: selectedPublicProjectDetail.completion_room_launch.title,
            },
          }"
          data-testid="online-society-project-detail-room-launch"
        >
          <span class="min-w-0 truncate">
            {{ selectedPublicProjectDetail.completion_room_launch.label }}：{{ selectedPublicProjectDetail.completion_room_launch.summary }}
          </span>
          <span class="shrink-0">创建房间</span>
        </RouterLink>

        <section class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-project-recent-contributions">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent">贡献记录</p>
            <span class="text-[0.625rem] text-muted">{{ selectedPublicProjectDetail?.recent_contributions.length || 0 }} 条</span>
          </div>
          <div v-if="selectedPublicProjectDetail && selectedPublicProjectDetail.recent_contributions.length > 0" class="mt-2 space-y-2">
            <div v-for="entry in selectedPublicProjectDetail.recent_contributions" :key="entry.id" class="text-[0.625rem] leading-4 text-muted">
              {{ entry.display_name }} 提交了 {{ entry.package_label }}（+{{ entry.progress_gain }}） · {{ costListText(entry.costs) }}
            </div>
          </div>
          <p v-else class="mt-2 text-[0.625rem] leading-4 text-muted">当前还没有新的贡献记录。</p>
        </section>

        <section v-if="selectedAsyncCommunityProjectDetail && selectedAsyncCommunityProjectDetail.contributors.length > 0" class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-project-contributors">
          <p class="text-xs text-accent">贡献榜</p>
          <div class="mt-2 space-y-2">
            <div v-for="contributor in selectedAsyncCommunityProjectDetail.contributors" :key="contributor.username" class="flex items-center justify-between gap-2 text-[0.625rem] leading-4 text-muted">
              <span class="min-w-0 truncate">#{{ contributor.rank }} {{ contributor.display_name || contributor.username }}</span>
              <span class="shrink-0 text-accent">{{ contributor.contribution_value }}</span>
            </div>
          </div>
        </section>

        <section v-if="selectedAsyncCommunityProjectDetail && selectedAsyncCommunityProjectDetail.history.length > 0" class="border border-accent/10 bg-black/10 p-2" data-testid="online-society-project-history">
          <p class="text-xs text-accent">历史回看</p>
          <div class="mt-2 space-y-2">
            <p v-for="entry in selectedAsyncCommunityProjectDetail.history" :key="entry.id" class="text-[0.625rem] leading-4 text-muted">
              {{ entry.summary }}
            </p>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            @click="closeSocietyProjectDetail"
          >
            关闭详情
          </button>
        </div>
      </template>
    </OnlineBottomSheet>

    <OnlineActionDialog
      :open="societyProposalDialogOpen"
      title="发起村社提案"
      description="把背景、目标和希望大家表决的方向写清楚；提交失败时草稿会保留在这里。"
      confirm-label="发起提案"
      cancel-label="稍后再写"
      :confirm-disabled="!canSubmitProposal"
      :running="societyStore.actionRunning"
      :close-on-backdrop="!societyStore.actionRunning"
      @confirm="submitProposal"
      @cancel="closeSocietyProposalDialog"
      @close="closeSocietyProposalDialog"
    >
      <div class="space-y-3" data-testid="online-society-proposal-dialog">
        <OnlineStatusBanner
          v-if="societyProposalDialogError"
          tone="danger"
          title="提案暂时没有发起成功"
          :description="societyProposalDialogError"
        />

        <label class="block">
          <span class="text-[0.625rem] text-muted">提案标题</span>
          <input
            v-model="societyStore.draftProposalTitle"
            maxlength="40"
            class="online-input mt-1 w-full"
            data-testid="online-society-proposal-title-input"
            placeholder="例如：本周节会联机排班"
          />
        </label>

        <label class="block">
          <span class="text-[0.625rem] text-muted">提案类型</span>
          <select v-model="societyStore.draftProposalKind" class="online-select mt-1 w-full" data-testid="online-society-proposal-kind-select">
            <option v-for="entry in societyStore.proposalKindOptions" :key="entry.id" :value="entry.id">
              {{ entry.label }}
            </option>
          </select>
        </label>

        <label class="block">
          <span class="text-[0.625rem] text-muted">提案说明</span>
          <textarea
            v-model="societyStore.draftProposalSummary"
            rows="4"
            maxlength="160"
            class="online-textarea mt-1 w-full"
            data-testid="online-society-proposal-summary-input"
            placeholder="写清楚本次提案的背景、目标和希望大家表决的方向。"
          />
        </label>
      </div>

      <template #footer="{ cancel }">
        <footer class="space-y-3 border-t border-accent/10 pt-3">
          <p v-if="!canSubmitProposal" class="text-[0.625rem] leading-4 text-muted">
            标题和说明都填写后才能发起提案。
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              :disabled="societyStore.actionRunning"
              @click="cancel"
            >
              稍后再写
            </button>
            <button
              class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
              data-testid="online-society-proposal-submit"
              type="button"
              :disabled="societyStore.actionRunning || !canSubmitProposal"
              @click="submitProposal"
            >
              {{ societyStore.actionRunning ? '提交中' : '发起提案' }}
            </button>
          </div>
        </footer>
      </template>
    </OnlineActionDialog>

    <OnlineActionDialog
      :open="Boolean(selectedSocietyProposalToArchive)"
      title="归档村社提案"
      :description="selectedSocietyProposalArchiveDescription"
      tone="warning"
      confirm-label="确认归档"
      cancel-label="继续投票"
      :running="societyStore.actionRunning"
      :close-on-backdrop="false"
      @confirm="archiveSelectedProposal"
      @cancel="closeProposalArchiveDialog"
      @close="closeProposalArchiveDialog"
    >
      <div v-if="selectedSocietyProposalToArchive" class="space-y-3" data-testid="online-society-proposal-close-dialog">
        <OnlineStatusBanner
          v-if="societyProposalArchiveError"
          tone="danger"
          title="提案暂时没有归档成功"
          :description="societyProposalArchiveError"
        />

        <section class="game-panel-muted p-2">
          <p class="text-xs leading-5 text-accent">影响对象</p>
          <ul class="mt-2 space-y-2" data-testid="online-society-proposal-close-impact-list">
            <li class="flex min-w-0 justify-between gap-3 text-[0.625rem] leading-4 text-muted">
              <span class="min-w-0 truncate">提案</span>
              <span class="shrink-0 text-accent">{{ selectedSocietyProposalToArchive.title }}</span>
            </li>
            <li class="flex min-w-0 justify-between gap-3 text-[0.625rem] leading-4 text-muted">
              <span class="min-w-0 truncate">当前票数</span>
              <span class="shrink-0 text-accent">{{ selectedSocietyProposalVoteSummary }}</span>
            </li>
            <li class="flex min-w-0 justify-between gap-3 text-[0.625rem] leading-4 text-muted">
              <span class="min-w-0 truncate">归档后</span>
              <span class="shrink-0 text-accent">移入历史提案</span>
            </li>
          </ul>
        </section>

        <label class="block">
          <span class="text-[0.625rem] text-muted">归档备注</span>
          <textarea
            v-model="societyProposalArchiveNote"
            rows="3"
            maxlength="120"
            class="online-textarea mt-1 w-full"
            data-testid="online-society-proposal-close-note-input"
            placeholder="例如：按多数票执行，本周先试运行。"
          />
        </label>

        <p class="text-[0.625rem] leading-5 text-muted" data-testid="online-society-proposal-close-recovery">
          如果归档没有成功，弹窗会保留备注，可稍后重试。
        </p>
      </div>

      <template #footer="{ cancel }">
        <footer class="space-y-3 border-t border-accent/10 pt-3">
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="online-action-btn online-action-btn--compact justify-center"
              :disabled="societyStore.actionRunning"
              @click="cancel"
            >
              继续投票
            </button>
            <button
              type="button"
              class="online-action-btn online-action-btn--compact online-action-btn--danger justify-center"
              data-testid="online-society-proposal-close-confirm"
              :disabled="societyStore.actionRunning || !selectedSocietyProposalToArchive"
              @click="archiveSelectedProposal"
            >
              {{ societyStore.actionRunning ? '归档中' : '确认归档' }}
            </button>
          </div>
        </footer>
      </template>
    </OnlineActionDialog>

    <OnlineInvitePanel
      :open="societyInvitePanelOpen"
      domain="society"
      title="邀请村社成员"
      description="可一次输入多个玩家名或存档 ID；已在村社里的玩家会被跳过，失败项可单独重试。"
      :results="societyInviteResults"
      :busy="societyInviteBusy"
      @invite="inviteSocietyRecipients"
      @retry="retrySocietyInvite"
      @remove="removeSocietyInviteResult"
      @close="closeSocietyInvitePanel"
    />

    <div v-if="selectedWarehouseConsumeOption" class="contents" data-testid="online-society-warehouse-consume-confirm">
      <OnlineConfirmActionDialog
        :open="true"
        title="确认公共仓消耗"
        :description="selectedWarehouseConsumeDescription"
        :impact-items="selectedWarehouseConsumeImpactItems"
        :asset-changes="selectedWarehouseConsumeAssetChanges"
        :irreversible="true"
        require-text="确认公共消耗"
        confirm-label="确认公共消耗"
        cancel-label="先不消耗"
        :running="societyStore.actionRunning"
        :recovery-hint="selectedWarehouseConsumeRecoveryHint"
        @confirm="confirmWarehouseConsume"
        @cancel="closeWarehouseConsumeConfirm"
        @close="closeWarehouseConsumeConfirm"
      />
    </div>

    <OnlineBottomSheet
      :open="Boolean(selectedSocietyRequest)"
      :title="selectedSocietyRequestTitle"
      :description="selectedSocietyRequestDescription"
      side="right"
      :close-on-backdrop="!societyStore.actionRunning"
      @close="closeSocietyRequestDetail"
    >
      <div v-if="selectedSocietyRequest" class="space-y-3" data-testid="online-society-request-detail-sheet">
        <OnlineStatusBanner
          v-if="societyRequestActionError"
          tone="danger"
          title="申请暂时没有处理成功"
          :description="societyRequestActionError"
        />

        <div class="grid gap-2 text-xs">
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">请求类型</p>
            <p class="mt-1 text-accent">{{ selectedSocietyRequest.type_label || (selectedSocietyRequest.type === 'apply' ? '加入申请' : '村社邀请') }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">玩家</p>
            <p class="mt-1 break-all text-accent">{{ selectedSocietyRequest.display_name || selectedSocietyRequest.username }}</p>
            <p class="mt-1 break-all text-[0.625rem] text-muted">{{ selectedSocietyRequest.username }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">村社</p>
            <p class="mt-1 break-all text-accent">{{ selectedSocietyRequest.society_name }}</p>
          </div>
          <div v-if="selectedSocietyRequest.target_save_id" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">目标存档</p>
            <p class="mt-1 text-accent">{{ selectedSocietyRequest.target_save_id }}</p>
            <p v-if="selectedSocietyRequest.target_save_slot !== null" class="mt-1 text-[0.625rem] text-muted">槽位 {{ Number(selectedSocietyRequest.target_save_slot) + 1 }}</p>
          </div>
          <div v-if="selectedSocietyRequest.invited_by" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">邀请人</p>
            <p class="mt-1 break-all text-accent">{{ selectedSocietyRequest.invited_by_display_name || selectedSocietyRequest.invited_by }}</p>
          </div>
          <div class="border border-accent/10 bg-black/10 p-2">
            <p class="text-[0.625rem] text-muted">提交时间</p>
            <p class="mt-1 text-accent">{{ formatSocietyRequestDate(selectedSocietyRequest.created_at) }}</p>
          </div>
        </div>

        <p v-if="!selectedSocietyRequestCanAct" class="text-xs leading-5 text-muted">
          这条记录当前只用于查看，暂时没有可执行动作。
        </p>
      </div>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            :disabled="societyStore.actionRunning"
            @click="closeSocietyRequestDetail"
          >
            稍后处理
          </button>
          <button
            v-if="selectedSocietyRequestCanAct"
            type="button"
            class="online-action-btn online-action-btn--compact justify-center"
            :data-testid="selectedSocietyRequestRejectTestId"
            :disabled="selectedSocietyRequestActionDisabled"
            @click="rejectSelectedSocietyRequest"
          >
            拒绝
          </button>
          <button
            v-if="selectedSocietyRequestCanAct"
            type="button"
            class="online-action-btn online-action-btn--compact online-action-btn--primary justify-center"
            :data-testid="selectedSocietyRequestAcceptTestId"
            :disabled="selectedSocietyRequestActionDisabled"
            @click="acceptSelectedSocietyRequest"
          >
            接受
          </button>
        </div>
      </template>
    </OnlineBottomSheet>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue'
  import { RouterLink, useRoute, useRouter } from 'vue-router'
  import { ClipboardList, ChevronLeft, ChevronRight, ShieldCheck, UserPlus } from 'lucide-vue-next'
  import AsyncCommunityBoard from '@/components/game/online/AsyncCommunityBoard.vue'
  import OnlineActionDialog from '@/components/game/online/OnlineActionDialog.vue'
  import OnlineBottomSheet from '@/components/game/online/OnlineBottomSheet.vue'
  import OnlineConfirmActionDialog from '@/components/game/online/OnlineConfirmActionDialog.vue'
  import OnlineEmptyState from '@/components/game/online/OnlineEmptyState.vue'
  import OnlineInvitePanel, {
    type OnlineInviteResult,
  } from '@/components/game/online/OnlineInvitePanel.vue'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import OnlineStatusBanner from '@/components/game/online/OnlineStatusBanner.vue'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import type { OnlineVisualAsyncProject, OnlineVisualAsyncStage } from '@/types/onlineVisual'
  import type {
    SocietyProjectCompletionRewardSnapshot,
    SocietyProjectPackageSnapshot,
    SocietyPublicProjectSnapshot,
    SocietyProposalChoice,
    SocietyJoinRequestSnapshot,
    SocietyWarehouseConsumeOptionSnapshot,
    SocietyProposalSnapshot,
    SocietyRole,
    SocietyWarehouseLogSnapshot,
    SocietySnapshot,
  } from '@/utils/societyApi'

  type SocietyTabKey = 'overview' | 'members' | 'storage' | 'projects' | 'proposals' | 'chronicles'
  type SocietyTabMeta = { key: SocietyTabKey; label: string; summary: string }
  type SocietyCreateStepKey = 'basic' | 'style' | 'access' | 'join' | 'review'
  const router = useRouter()

  const route = useRoute()
  const societyStore = useSocietyStore()
  const memberRoleDrafts = reactive<Record<string, Exclude<SocietyRole, 'president'>>>({})
  const proposalResolutionNotes = reactive<Record<string, string>>({})
  const selectedAsyncCommunityProjectId = ref('')
  const selectedSocietyProjectDetailId = ref('')
  const societyCreateOpen = ref(false)
  const societyCreateStep = ref<SocietyCreateStepKey>('basic')
  const societyCreateError = ref('')
  const societyInvitePanelOpen = ref(false)
  const societyInviteResults = ref<OnlineInviteResult[]>([])
  const societyInviteBatchRunning = ref(false)
  const selectedSocietyRequest = ref<SocietyJoinRequestSnapshot | null>(null)
  const societyRequestActionError = ref('')
  const societyProposalDialogOpen = ref(false)
  const societyProposalDialogError = ref('')
  const selectedSocietyProposalToArchive = ref<SocietyProposalSnapshot | null>(null)
  const societyProposalArchiveNote = ref('')
  const societyProposalArchiveError = ref('')
  const selectedWarehouseConsumeOption = ref<SocietyWarehouseConsumeOptionSnapshot | null>(null)
  const warehouseConsumeConfirmError = ref('')
  const tabs: SocietyTabMeta[] = [
    { key: 'overview', label: '总览', summary: '查看我的村社、公告摘要和公开村社入口。' },
    { key: 'members', label: '成员', summary: '查看成员、职位和待处理申请邀请摘要。' },
    { key: 'storage', label: '仓库与福利', summary: '查看公共仓库、福利等级、专属节会和装饰摘要。' },
    { key: 'projects', label: '公共建设', summary: '查看公共建设进度和近期推进状态。' },
    { key: 'proposals', label: '提案', summary: '查看活跃提案和归档数量。' },
    { key: 'chronicles', label: '史册', summary: '查看村社成立、建设、节会参与和贡献成员摘要。' },
  ]
  const societyCreateSteps: Array<{ key: SocietyCreateStepKey; label: string }> = [
    { key: 'basic', label: '名称与公告' },
    { key: 'style', label: '徽记主题' },
    { key: 'access', label: '公开容量' },
    { key: 'join', label: '入社条件' },
    { key: 'review', label: '确认创建' },
  ]

  const normalizeTab = (value: unknown): SocietyTabKey => {
    const raw = Array.isArray(value) ? value[0] : value
    if (raw === 'members' || raw === 'storage' || raw === 'projects' || raw === 'proposals' || raw === 'chronicles') return raw
    return 'overview'
  }

  const activeTab = ref<SocietyTabKey>(normalizeTab(route.query.tab))
  const setActiveTab = (tab: string) => {
    activeTab.value = tab as SocietyTabKey
  }
  const createPanelRef = ref<HTMLElement | null>(null)
  const currentSociety = computed(() => societyStore.mySociety)
  const visibleSocietyPreview = computed(() => societyStore.visibleSocieties)
  const memberCount = computed(() => currentSociety.value?.members.length ?? 0)
  const activeProjectCount = computed(() => currentSociety.value?.public_projects.filter(project => project.status !== 'completed').length ?? 0)
  const asyncCommunityProjects = computed<OnlineVisualAsyncProject[]>(() => {
    const visualState = currentSociety.value?.visual_state
    if (!visualState || visualState.board_type !== 'async') return []
    return visualState.async_projects || []
  })
  const asyncCommunityProjectIds = computed(() => new Set(asyncCommunityProjects.value.map(project => project.id)))
  const activeAsyncCommunityProjectId = computed(() => {
    if (selectedAsyncCommunityProjectId.value && asyncCommunityProjectIds.value.has(selectedAsyncCommunityProjectId.value)) {
      return selectedAsyncCommunityProjectId.value
    }
    const visualSelectedId = currentSociety.value?.visual_state?.selected_visual_id || ''
    if (visualSelectedId && asyncCommunityProjectIds.value.has(visualSelectedId)) return visualSelectedId
    return asyncCommunityProjects.value.find(project => !project.completion_event_id)?.id || asyncCommunityProjects.value[0]?.id || ''
  })
  const selectedAsyncCommunityProjectDetail = computed<OnlineVisualAsyncProject | null>(() =>
    asyncCommunityProjects.value.find(project => project.id === selectedSocietyProjectDetailId.value) || null
  )
  const selectedPublicProjectDetail = computed<SocietyPublicProjectSnapshot | null>(() =>
    currentSociety.value?.public_projects.find(project => project.id === selectedSocietyProjectDetailId.value) ?? null
  )
  const selectedSocietyProjectCurrentStage = computed<OnlineVisualAsyncStage | null>(() => {
    const project = selectedAsyncCommunityProjectDetail.value
    if (!project) return null
    return project.stages.find(stage => stage.id === project.current_stage_id)
      || project.stages.find(stage => stage.state === 'active')
      || project.stages.find(stage => stage.state !== 'complete')
      || project.stages[project.stages.length - 1]
      || null
  })
  const selectedSocietyProjectDetailTitle = computed(() =>
    selectedPublicProjectDetail.value?.label || selectedAsyncCommunityProjectDetail.value?.label || '公共工程详情'
  )
  const selectedSocietyProjectDetailDescription = computed(() => {
    const publicProject = selectedPublicProjectDetail.value
    const visualProject = selectedAsyncCommunityProjectDetail.value
    if (!publicProject && !visualProject) return '查看阶段、贡献记录和工程历史。'
    const progress = publicProject
      ? `${publicProject.progress}/${publicProject.target_progress}`
      : `${selectedSocietyProjectCompletedStageCount.value}/${visualProject?.stages.length || 0} 阶段`
    return `${publicProject?.status_label || '推进中'} · ${progress} · 详情和记录已收进抽屉。`
  })
  const selectedSocietyProjectCompletedStageCount = computed(() =>
    selectedAsyncCommunityProjectDetail.value?.stages.filter(stage => stage.state === 'complete').length ?? 0
  )
  const asyncCommunityActionLabels = computed(() => {
    const labels: Record<string, string> = {}
    for (const project of asyncCommunityProjects.value) {
      for (const stage of project.stages) {
        for (const option of stage.contribution_options) labels[option.id] = option.label
      }
    }
    for (const project of currentSociety.value?.public_projects ?? []) {
      for (const entry of project.contribution_packages) labels[entry.id] = entry.label
    }
    return labels
  })
  const activeCompletionRewardText = (rewards: SocietyProjectCompletionRewardSnapshot[] = []) =>
    rewards.filter(entry => entry.active).map(entry => entry.label).filter(Boolean).join(' / ')
  const costListText = (costs: Array<{ label: string }> = []) =>
    costs.length > 0 ? costs.map(cost => cost.label).filter(Boolean).join(' + ') : '无需材料'
  const selectedWarehouseConsumeCostText = computed(() =>
    costListText(selectedWarehouseConsumeOption.value?.costs ?? [])
  )
  const selectedWarehouseConsumeDescription = computed(() => {
    const entry = selectedWarehouseConsumeOption.value
    const baseText = entry
      ? `确认后会从公共仓扣除「${entry.label}」所需物资，不会扣个人背包或个人铜钱。`
      : '确认后只会扣公共仓库存，不会扣个人资产。'
    if (!warehouseConsumeConfirmError.value) return baseText
    return `${baseText} 上次尝试没有成功：${warehouseConsumeConfirmError.value}`
  })
  const selectedWarehouseConsumeImpactItems = computed(() => {
    const entry = selectedWarehouseConsumeOption.value
    if (!entry) return []
    return [
      { id: 'consume-option', label: '公共用途', value: entry.label },
      { id: 'consume-summary', label: '用途说明', value: entry.summary || '消耗公共仓物资' },
      { id: 'consume-boundary', label: '扣除边界', value: entry.asset_boundary || '只扣公共仓' },
    ]
  })
  const selectedWarehouseConsumeAssetChanges = computed(() => {
    if (!selectedWarehouseConsumeOption.value) return []
    return [
      { id: 'public-warehouse-cost', label: '公共仓扣除', value: selectedWarehouseConsumeCostText.value },
      { id: 'personal-assets', label: '个人资产', value: '不扣个人背包或铜钱' },
    ]
  })
  const selectedWarehouseConsumeRecoveryHint = computed(() =>
    warehouseConsumeConfirmError.value || '确认失败时不会扣个人资产，可留在弹窗中重试或先取消。'
  )
  const packageCostText = (entry: SocietyProjectPackageSnapshot) =>
    costListText(entry.costs)
  const packageLimitText = (entry: SocietyProjectPackageSnapshot) => {
    const limits: string[] = []
    if (entry.daily_limit > 0) limits.push(`24小时 ${entry.daily_limit} 次`)
    if (entry.weekly_limit > 0) limits.push(`7天 ${entry.weekly_limit} 次`)
    return limits.join(' / ')
  }
  const asyncStageStateLabel = (state: string) => ({
    pending: '未开始',
    active: '推进中',
    complete: '已完成',
  }[state] || state || '未记录')
  const asyncStageReadbackStateLabel = (state: string) =>
    state === 'active' ? '进行中' : asyncStageStateLabel(state)
  const asyncStageProgressPercent = (stage: OnlineVisualAsyncStage) => {
    if (stage.progress_target <= 0) return stage.state === 'complete' ? 100 : 0
    return Math.min(100, Math.round((Math.max(0, stage.progress_value) / stage.progress_target) * 100))
  }
  const selectedSocietyProjectReadbackRows = computed(() => {
    const project = selectedAsyncCommunityProjectDetail.value
    if (!project) return []
    const stage = selectedSocietyProjectCurrentStage.value
    const stageLabel = stage?.label || '等待阶段'
    const stageState = stage ? asyncStageReadbackStateLabel(stage.state) : '未开始'
    return [
      { id: 'progress', label: '阶段收口', value: `${selectedSocietyProjectCompletedStageCount.value}/${project.stages.length} 阶段` },
      { id: 'stage', label: '当前回看', value: `${stageLabel} · ${stageState}` },
      { id: 'records', label: '贡献记录', value: `${project.contributors.length} 人 · ${project.history.length} 条历史` },
    ]
  })
  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const pendingRequestBySocietyId = computed(() => new Map(societyStore.myPendingRequests.map(request => [request.society_id, request])))
  const incomingInviteBySocietyId = computed(() => new Map(societyStore.incomingInvites.map(request => [request.society_id, request])))
  const hasJoinRelations = computed(() => societyStore.incomingInvites.length > 0 || societyStore.myPendingRequests.length > 0)
  const canSubmitSociety = computed(() => societyStore.draftName.trim().length > 0 && !societyStore.actionRunning)
  const societyCreateStepIndex = computed(() =>
    societyCreateSteps.findIndex(step => step.key === societyCreateStep.value)
  )
  const societyCreateNextDisabled = computed(() =>
    societyStore.actionRunning ||
    (societyCreateStep.value === 'basic' && !societyStore.draftName.trim())
  )
  const societyCreateSubmitDisabled = computed(() =>
    societyStore.actionRunning || !societyStore.draftName.trim()
  )
  const societyCreateEmblemLabel = computed(() =>
    societyStore.emblemOptions.find(entry => entry.id === societyStore.draftEmblem)?.label || '默认徽记'
  )
  const societyCreateThemeLabel = computed(() =>
    societyStore.themeOptions.find(entry => entry.id === societyStore.draftTheme)?.label || '默认主题'
  )
  const societyCreateVisibilityLabel = computed(() =>
    societyStore.visibilityOptions.find(entry => entry.id === societyStore.draftVisibility)?.label || '公开'
  )
  const societyCreateCapacityLabel = computed(() =>
    societyStore.capacityOptions.find(entry => entry.value === societyStore.draftCapacity)?.label || `${societyStore.draftCapacity} 人`
  )
  const societyCreateJoinRequirement = computed(() =>
    societyStore.joinRequirementOptions.find(entry => entry.id === societyStore.draftJoinRequirementId)
  )
  const societyCreateJoinRequirementLabel = computed(() =>
    societyCreateJoinRequirement.value?.label || '开放申请'
  )
  const societyCreateJoinRequirementSummary = computed(() =>
    societyStore.draftJoinRequirementNote.trim() ||
    societyCreateJoinRequirement.value?.summary ||
    '创建后可以继续调整入社说明。'
  )
  const canInviteMember = computed(() => !!societyStore.draftInviteUsername.trim() || !!societyStore.draftInviteSaveId.trim())
  const societyInviteBusy = computed(() => societyStore.actionRunning || societyInviteBatchRunning.value)
  const societyMemberInviteKeys = computed(() => new Set(
    (currentSociety.value?.members ?? [])
      .flatMap(member => [member.username, String(member.save_id || '')])
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  ))
  const hasSocietyAdminActions = computed(() => Boolean(
    currentSociety.value?.can_invite ||
    currentSociety.value?.can_review_requests ||
    currentSociety.value?.can_manage_roles
  ))
  const selectedSocietyRequestIsManaged = computed(() => Boolean(
    selectedSocietyRequest.value &&
    societyStore.managedRequests.some(request => request.id === selectedSocietyRequest.value?.id)
  ))
  const selectedSocietyRequestIsIncomingInvite = computed(() => Boolean(
    selectedSocietyRequest.value &&
    societyStore.incomingInvites.some(request => request.id === selectedSocietyRequest.value?.id)
  ))
  const selectedSocietyRequestCanAct = computed(() => {
    if (!selectedSocietyRequest.value) return false
    if (selectedSocietyRequestIsManaged.value) return Boolean(currentSociety.value?.can_review_requests)
    return selectedSocietyRequestIsIncomingInvite.value
  })
  const selectedSocietyRequestActionDisabled = computed(() =>
    societyStore.actionRunning || !selectedSocietyRequestCanAct.value
  )
  const selectedSocietyRequestTitle = computed(() => {
    const request = selectedSocietyRequest.value
    if (!request) return '申请与邀请详情'
    if (selectedSocietyRequestIsManaged.value && request.type === 'apply') return `${request.display_name || request.username} 申请加入村社`
    if (selectedSocietyRequestIsManaged.value) return `邀请 ${request.display_name || request.username} 加入村社`
    if (selectedSocietyRequestIsIncomingInvite.value) return `收到村社邀请：${request.society_name}`
    return `已申请：${request.society_name}`
  })
  const selectedSocietyRequestDescription = computed(() => {
    const request = selectedSocietyRequest.value
    if (!request) return '查看申请来源、目标存档和可处理动作。'
    if (selectedSocietyRequestIsManaged.value) {
      return currentSociety.value?.can_review_requests
        ? '确认后会更新该玩家和村社成员关系；失败时可留在详情里重试。'
        : '只有村社管理员可以处理成员申请或邀请。'
    }
    if (selectedSocietyRequestIsIncomingInvite.value) {
      return '确认后你会加入这个村社；拒绝后这条邀请会关闭。'
    }
    return '这条申请正在等待村社管理员处理。'
  })
  const selectedSocietyRequestAcceptTestId = computed(() =>
    selectedSocietyRequest.value
      ? `online-society-managed-request-accept-${selectedSocietyRequest.value.id}`
      : 'online-society-managed-request-accept'
  )
  const selectedSocietyRequestRejectTestId = computed(() =>
    selectedSocietyRequest.value
      ? `online-society-managed-request-reject-${selectedSocietyRequest.value.id}`
      : 'online-society-managed-request-reject'
  )
  const canSubmitProposal = computed(() => societyStore.draftProposalTitle.trim().length > 0 && societyStore.draftProposalSummary.trim().length > 0)
  const draftProposalKindLabel = computed(() =>
    societyStore.proposalKindOptions.find(entry => entry.id === societyStore.draftProposalKind)?.label || '治理提案'
  )
  const selectedSocietyProposalVoteSummary = computed(() => {
    const proposal = selectedSocietyProposalToArchive.value
    if (!proposal) return '尚未选择提案'
    return `赞成 ${proposal.vote_counts.support} / 反对 ${proposal.vote_counts.reject} / 暂缓 ${proposal.vote_counts.abstain}`
  })
  const selectedSocietyProposalArchiveDescription = computed(() => {
    const proposal = selectedSocietyProposalToArchive.value
    if (!proposal) return '归档前请确认提案、票数和备注。'
    return `确认后「${proposal.title}」会移入归档，成员仍可在归档区查看结果。`
  })
  const assignableRoleOptions = computed(() =>
    societyStore.roleOptions.filter(entry => entry.id !== 'president') as Array<{ id: Exclude<SocietyRole, 'president'>; label: string }>
  )
  const currentWelfareProgressTotal = computed(() => {
    const society = currentSociety.value
    if (!society) return 1
    if (society.welfare_xp_to_next_level <= 0) return Math.max(1, society.welfare_xp)
    return Math.max(1, society.welfare_xp + society.welfare_xp_to_next_level)
  })
  const currentWelfareProgressPercent = computed(() => {
    const society = currentSociety.value
    if (!society) return 0
    if (society.welfare_xp_to_next_level <= 0) return 100
    return Math.min(100, Math.round((society.welfare_xp / currentWelfareProgressTotal.value) * 100))
  })
  const memberPermissionSummary = computed(() => {
    const society = currentSociety.value
    if (!society) return '加入村社后才会显示成员治理权限。'
    const permissions = [
      society.can_invite ? '邀请成员' : '',
      society.can_review_requests ? '处理申请' : '',
      society.can_manage_roles ? '调整职位' : '',
    ].filter(Boolean)
    return permissions.length > 0 ? `当前身份可${permissions.join('、')}。` : '当前身份只显示成员和职位，不显示治理控件。'
  })
  const moduleSummary = computed(() => {
    const society = currentSociety.value
    if (!society) return `当前未加入村社；公开村社 ${societyStore.visibleSocieties.length} 个，待处理邀请 ${societyStore.incomingInvites.length} 条。`
    return `${society.name} · ${society.my_role_label || '成员'} · ${society.member_count}/${society.capacity} 人 · ${activeProjectCount.value} 项建设推进中。`
  })
  const refreshStateLabel = computed(() => societyStore.loading ? '正在刷新村社摘要' : '进入村社模块后会加载摘要信息')
  const summaryStats = computed(() => [
    { label: '我的村社', value: currentSociety.value?.name || '未加入' },
    { label: '公开村社', value: `${societyStore.visibleSocieties.length} 个` },
    { label: '成员', value: `${memberCount.value} 人` },
    { label: '申请邀请', value: `${societyStore.managedRequests.length + societyStore.incomingInvites.length + societyStore.myPendingRequests.length} 条` },
    { label: '公共建设', value: `${currentSociety.value?.public_projects.length || 0} 项` },
    { label: '提案', value: `${currentSociety.value?.active_proposals.length || 0} 条` },
  ])
  const warehouseWeeklyEffects = computed(() => {
    const effects = currentSociety.value?.public_warehouse.weekly_settlement?.effects
    if (!effects) return []
    return [effects.disaster_response, effects.festival_cost_discount, effects.public_task_bonus]
  })

  const refreshSocietyModule = async () => {
    await societyStore.refreshOverview().catch(() => {})
  }

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const applyInviteRouteDraft = () => {
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    if (targetUsername) societyStore.draftInviteUsername = targetUsername
    if (targetSaveId) societyStore.draftInviteSaveId = targetSaveId
  }

  const focusCreateSociety = () => {
    createPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    openSocietyCreateDialog()
  }

  const openSocietyCreateDialog = () => {
    societyCreateError.value = ''
    societyCreateStep.value = 'basic'
    societyCreateOpen.value = true
  }

  const closeSocietyCreateDialog = () => {
    if (societyStore.actionRunning) return
    societyCreateOpen.value = false
  }

  const goNextSocietyCreateStep = () => {
    if (societyCreateNextDisabled.value) return
    const nextStep = societyCreateSteps[societyCreateStepIndex.value + 1]
    if (nextStep) societyCreateStep.value = nextStep.key
  }

  const goPreviousSocietyCreateStep = () => {
    const previousStep = societyCreateSteps[societyCreateStepIndex.value - 1]
    if (previousStep) societyCreateStep.value = previousStep.key
  }

  const getSocietyJoinState = (society: SocietySnapshot) => {
    if (currentSociety.value?.id === society.id) return { label: '已加入', tone: 'text-success' }
    if (pendingRequestBySocietyId.value.has(society.id)) return { label: '已申请', tone: 'text-muted' }
    if (incomingInviteBySocietyId.value.has(society.id)) return { label: '待接受', tone: 'text-accent' }
    if (society.can_apply) return { label: '可申请', tone: 'text-accent' }
    return { label: society.visibility_label, tone: 'text-muted' }
  }

  const formatChronicleDate = (timestamp: number) => {
    if (!timestamp) return '待记录'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const getProposalVoteLabel = (proposal: SocietyProposalSnapshot) => {
    return proposal.choice_options.find(entry => entry.id === proposal.my_vote_choice)?.label || proposal.my_vote_choice || '未投票'
  }

  const getSocietyActionError = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : societyStore.errorMessage || fallback

  const formatSocietyRequestDate = (timestamp: number) => {
    if (!timestamp) return '未记录'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const warehouseLogText = (entry: SocietyWarehouseLogSnapshot) => {
    const detail = entry.entries.map(cost => cost.label).filter(Boolean).join(' + ') || '无材料明细'
    if (entry.action === 'consume') return `${entry.display_name} 消耗了 ${entry.deposit_label} · ${detail} · 只扣公共仓`
    return `${entry.display_name} 补入了 ${entry.deposit_label} · ${entry.category_label || '公共仓'} · ${detail}`
  }

  const createSociety = async () => {
    if (!canSubmitSociety.value) return
    societyCreateError.value = ''
    try {
      await societyStore.submitSociety()
      societyCreateOpen.value = false
      societyCreateStep.value = 'basic'
    } catch (error) {
      societyCreateError.value = error instanceof Error
        ? error.message
        : societyStore.errorMessage || '创建村社失败，请稍后再试。'
    }
  }

  const applySociety = async (societyId: string) => {
    await societyStore.applySociety(societyId).catch(() => {})
  }

  const openSocietyInvitePanel = () => {
    societyInvitePanelOpen.value = true
  }

  const closeSocietyInvitePanel = () => {
    if (societyInviteBusy.value) return
    societyInvitePanelOpen.value = false
  }

  const upsertSocietyInviteResult = (row: OnlineInviteResult) => {
    const key = row.username.trim().toLowerCase()
    const nextRows = societyInviteResults.value.filter(entry => entry.username.trim().toLowerCase() !== key)
    societyInviteResults.value = [...nextRows, row]
  }

  const removeSocietyInviteResult = (recipient: string) => {
    const key = recipient.trim().toLowerCase()
    societyInviteResults.value = societyInviteResults.value.filter(row => row.username.trim().toLowerCase() !== key)
  }

  const inviteSocietyRecipients = async (recipients: string[]) => {
    if (societyInviteBatchRunning.value) return
    societyInviteBatchRunning.value = true
    try {
      for (const rawRecipient of recipients) {
        const recipient = rawRecipient.trim()
        if (!recipient) continue
        const recipientKey = recipient.toLowerCase()
        if (societyMemberInviteKeys.value.has(recipientKey)) {
          upsertSocietyInviteResult({
            username: recipient,
            status: 'blocked',
            message: '这位玩家已经在村社里。',
          })
          continue
        }

        upsertSocietyInviteResult({
          username: recipient,
          status: 'inviting',
          message: '正在发送邀请。',
        })

        try {
          societyStore.draftInviteUsername = ''
          societyStore.draftInviteSaveId = ''
          if (/^\d+$/.test(recipient)) societyStore.draftInviteSaveId = recipient
          else societyStore.draftInviteUsername = recipient
          await societyStore.inviteMember()
          upsertSocietyInviteResult({
            username: recipient,
            status: 'invited',
            message: '邀请已发送。',
          })
        } catch (error) {
          upsertSocietyInviteResult({
            username: recipient,
            status: 'failed',
            message: getSocietyActionError(error, '邀请没有发送成功，可稍后重试。'),
          })
        }
      }
    } finally {
      societyInviteBatchRunning.value = false
    }
  }

  const retrySocietyInvite = async (recipient: string) => {
    await inviteSocietyRecipients([recipient])
  }

  const inviteMember = async () => {
    if (!canInviteMember.value) return
    await societyStore.inviteMember().catch(() => {})
  }

  const openSocietyRequestDetail = (request: SocietyJoinRequestSnapshot) => {
    societyRequestActionError.value = ''
    selectedSocietyRequest.value = request
  }

  const closeSocietyRequestDetail = () => {
    if (societyStore.actionRunning) return
    selectedSocietyRequest.value = null
    societyRequestActionError.value = ''
  }

  const acceptSelectedSocietyRequest = async () => {
    const request = selectedSocietyRequest.value
    if (!request || selectedSocietyRequestActionDisabled.value) return
    societyRequestActionError.value = ''
    try {
      await societyStore.acceptRequest(request.id)
      closeSocietyRequestDetail()
    } catch (error) {
      societyRequestActionError.value = getSocietyActionError(error, '村社申请暂时没有处理成功。')
    }
  }

  const rejectSelectedSocietyRequest = async () => {
    const request = selectedSocietyRequest.value
    if (!request || selectedSocietyRequestActionDisabled.value) return
    societyRequestActionError.value = ''
    try {
      await societyStore.rejectRequest(request.id)
      closeSocietyRequestDetail()
    } catch (error) {
      societyRequestActionError.value = getSocietyActionError(error, '村社申请暂时没有处理成功。')
    }
  }

  const changeMemberRole = async (targetUsername: string) => {
    const role = memberRoleDrafts[targetUsername]
    if (!role) return
    await societyStore.changeMemberRole(targetUsername, role).catch(() => {})
  }

  const saveNotice = async () => {
    await societyStore.saveNotice().catch(() => {})
  }

  const openSocietyProposalDialog = () => {
    societyProposalDialogError.value = ''
    societyProposalDialogOpen.value = true
  }

  const closeSocietyProposalDialog = () => {
    if (societyStore.actionRunning) return
    societyProposalDialogOpen.value = false
    societyProposalDialogError.value = ''
  }

  const submitProposal = async () => {
    if (!canSubmitProposal.value) return
    societyProposalDialogError.value = ''
    try {
      await societyStore.submitProposal()
      societyProposalDialogOpen.value = false
    } catch (error) {
      societyProposalDialogError.value = getSocietyActionError(error, '提案暂时没有发起成功，可稍后重试。')
    }
  }

  const castVote = async (proposalId: string, choice: SocietyProposalChoice) => {
    await societyStore.castProposalVote(proposalId, choice).catch(() => {})
  }

  const openProposalArchiveDialog = (proposal: SocietyProposalSnapshot) => {
    societyProposalArchiveError.value = ''
    selectedSocietyProposalToArchive.value = proposal
    societyProposalArchiveNote.value = proposalResolutionNotes[proposal.id] || proposal.resolution_note || ''
  }

  const closeProposalArchiveDialog = () => {
    if (societyStore.actionRunning) return
    selectedSocietyProposalToArchive.value = null
    societyProposalArchiveNote.value = ''
    societyProposalArchiveError.value = ''
  }

  const archiveSelectedProposal = async () => {
    const proposal = selectedSocietyProposalToArchive.value
    if (!proposal || societyStore.actionRunning) return
    societyProposalArchiveError.value = ''
    try {
      await societyStore.archiveProposal(proposal.id, societyProposalArchiveNote.value.trim())
      proposalResolutionNotes[proposal.id] = ''
      closeProposalArchiveDialog()
    } catch (error) {
      societyProposalArchiveError.value = getSocietyActionError(error, '提案暂时没有归档成功，可检查网络后重试。')
    }
  }

  const selectAsyncCommunityProject = (projectId: string) => {
    selectedAsyncCommunityProjectId.value = projectId
  }

  const openSocietyProjectDetail = (projectId: string) => {
    selectedSocietyProjectDetailId.value = projectId
    if (asyncCommunityProjectIds.value.has(projectId)) selectedAsyncCommunityProjectId.value = projectId
  }

  const closeSocietyProjectDetail = () => {
    selectedSocietyProjectDetailId.value = ''
  }

  const triggerAsyncCommunityContribution = async (payload: { projectId: string, optionId: string }) => {
    if (!payload.projectId || !payload.optionId) return
    selectedAsyncCommunityProjectId.value = payload.projectId
    await societyStore.contributeProject(payload.projectId, payload.optionId).catch(() => {})
  }

  const contributeProject = async (projectId: string, packageId: string) => {
    await societyStore.contributeProject(projectId, packageId).catch(() => {})
  }

  const depositWarehouse = async (depositId: string) => {
    await societyStore.depositWarehouse(depositId).catch(() => {})
  }

  const openWarehouseConsumeConfirm = (entry: SocietyWarehouseConsumeOptionSnapshot) => {
    warehouseConsumeConfirmError.value = ''
    selectedWarehouseConsumeOption.value = entry
  }

  const closeWarehouseConsumeConfirm = () => {
    if (societyStore.actionRunning) return
    selectedWarehouseConsumeOption.value = null
    warehouseConsumeConfirmError.value = ''
  }

  const executeWarehouseConsume = async (entry: SocietyWarehouseConsumeOptionSnapshot) => {
    const result = await societyStore.consumeWarehouse(entry.id)
    const preload = result?.log_entry?.room_preload || result?.consume?.room_preload || entry.room_preload
    if (!preload?.room_template_id) return
    await router.push({
      name: 'online-festival',
      query: {
        tab: 'festival-room',
        template: preload.room_template_id,
        gameplay: preload.gameplay_template_id || 'assembly',
        title: preload.title || entry.label,
        source_label: preload.source_label || entry.source_label || '公共仓联动',
        source_feedback: preload.source_feedback || preload.room_preload_hint || entry.room_preload_hint || entry.summary,
        source_context_summary: preload.source_context_summary || entry.public_context_summary || entry.summary,
      },
    }).catch(() => {})
  }

  const confirmWarehouseConsume = async () => {
    const entry = selectedWarehouseConsumeOption.value
    if (!entry || societyStore.actionRunning) return
    warehouseConsumeConfirmError.value = ''
    try {
      await executeWarehouseConsume(entry)
      closeWarehouseConsumeConfirm()
    } catch (error) {
      warehouseConsumeConfirmError.value = getSocietyActionError(error, '公共仓消耗暂时没有完成，可稍后重试。')
    }
  }

  watchEffect(() => {
    for (const member of currentSociety.value?.members ?? []) {
      if (member.role !== 'president' && !memberRoleDrafts[member.username]) {
        memberRoleDrafts[member.username] = member.role as Exclude<SocietyRole, 'president'>
      }
    }
    for (const proposal of currentSociety.value?.active_proposals ?? []) {
      if (proposalResolutionNotes[proposal.id] === undefined) proposalResolutionNotes[proposal.id] = ''
    }
  })

  watch(
    () => route.query.tab,
    tab => {
      activeTab.value = normalizeTab(tab)
    }
  )

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      applyInviteRouteDraft()
    }
  )

  onMounted(() => {
    applyInviteRouteDraft()
    void refreshSocietyModule()
  })
</script>
