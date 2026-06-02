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
              <span class="text-[10px] text-muted">{{ currentSociety?.my_role_label || '未加入' }}</span>
            </div>
            <div v-if="currentSociety" class="mt-3 space-y-3">
              <div class="border border-accent/10 bg-black/10 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-accent">{{ currentSociety.name }}</p>
                    <p class="mt-1 text-[10px] text-muted">
                      {{ currentSociety.theme_label }} · {{ currentSociety.visibility_label }} · {{ currentSociety.member_count }}/{{ currentSociety.capacity }} 人
                    </p>
                  </div>
                  <span class="w-fit shrink-0 text-[10px] text-accent">{{ currentSociety.emblem_label }}</span>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-muted">{{ currentSociety.summary || '这个村社还没写简介。' }}</p>
              </div>

              <div class="grid gap-2 md:grid-cols-2">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">我的身份</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.my_role_label || '成员' }}</p>
                  <p class="mt-1 text-[10px] text-muted">社长：{{ currentSociety.leader_display_name }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">入社条件</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.join_requirement_label }}</p>
                  <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">{{ currentSociety.join_requirement_note || currentSociety.join_requirement_summary }}</p>
                </div>
              </div>

              <div class="grid gap-2 md:grid-cols-3">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">福利等级</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.level_title }}</p>
                  <p class="mt-1 text-[10px] text-muted">等级 {{ currentSociety.level }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">公共建设</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.public_projects.length }} 项</p>
                  <p class="mt-1 text-[10px] text-muted">{{ activeProjectCount }} 项推进中</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">提案</p>
                  <p class="mt-1 text-xs text-accent">{{ currentSociety.active_proposals.length }} 条</p>
                  <p class="mt-1 text-[10px] text-muted">归档 {{ currentSociety.proposal_history.length }} 条</p>
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
              <span class="text-[10px] text-muted">{{ currentSociety.can_manage_notice ? '可编辑' : '只读' }}</span>
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

          <div v-if="!currentSociety" ref="createPanelRef" class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">创建村社</p>
              <span class="text-[10px] text-muted">组织底座</span>
            </div>
            <div class="mt-3 space-y-2">
              <label class="block">
                <span class="text-[10px] text-muted">村社名称</span>
                <input
                  v-model="societyStore.draftName"
                  maxlength="24"
                  class="online-input mt-1 w-full"
                  data-testid="online-society-create-name-input"
                  placeholder="例如：清溪灯社"
                />
              </label>
              <label class="block">
                <span class="text-[10px] text-muted">一句简介</span>
                <textarea
                  v-model="societyStore.draftSummary"
                  rows="3"
                  maxlength="120"
                  class="online-textarea mt-1 w-full"
                  data-testid="online-society-create-summary-input"
                  placeholder="写清楚这个村社想组织怎样的生活、节会和协作方式。"
                />
              </label>
              <label class="block">
                <span class="text-[10px] text-muted">初始公告</span>
                <textarea
                  v-model="societyStore.draftNotice"
                  rows="2"
                  maxlength="160"
                  class="online-textarea mt-1 w-full"
                  data-testid="online-society-create-notice-input"
                  placeholder="例如：本周先招募稳定成员，再排第一轮节会值守。"
                />
              </label>
              <div class="grid gap-2 md:grid-cols-2">
                <label class="block">
                  <span class="text-[10px] text-muted">村社徽记</span>
                  <select v-model="societyStore.draftEmblem" class="online-select mt-1 w-full" data-testid="online-society-create-emblem-select">
                    <option v-for="entry in societyStore.emblemOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[10px] text-muted">村社主题</span>
                  <select v-model="societyStore.draftTheme" class="online-select mt-1 w-full" data-testid="online-society-create-theme-select">
                    <option v-for="entry in societyStore.themeOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
              </div>
              <div class="grid gap-2 md:grid-cols-2">
                <label class="block">
                  <span class="text-[10px] text-muted">公开范围</span>
                  <select v-model="societyStore.draftVisibility" class="online-select mt-1 w-full" data-testid="online-society-create-visibility-select">
                    <option v-for="entry in societyStore.visibilityOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[10px] text-muted">成员容量</span>
                  <select v-model="societyStore.draftCapacity" class="online-select mt-1 w-full" data-testid="online-society-create-capacity-select">
                    <option v-for="entry in societyStore.capacityOptions" :key="entry.value" :value="entry.value">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
              </div>
              <label class="block">
                <span class="text-[10px] text-muted">入社条件</span>
                <select v-model="societyStore.draftJoinRequirementId" class="online-select mt-1 w-full" data-testid="online-society-create-join-requirement-select">
                  <option v-for="entry in societyStore.joinRequirementOptions" :key="entry.id" :value="entry.id">
                    {{ entry.label }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-[10px] text-muted">补充说明</span>
                <input
                  v-model="societyStore.draftJoinRequirementNote"
                  maxlength="80"
                  class="online-input mt-1 w-full"
                  data-testid="online-society-create-join-note-input"
                  placeholder="例如：希望先有公开名片和稳定经营节奏。"
                />
              </label>
              <button
                class="online-action-btn online-action-btn--primary w-full justify-center"
                data-testid="online-society-create-submit"
                type="button"
                :disabled="!canSubmitSociety"
                @click="createSociety"
              >
                {{ societyStore.actionRunning ? '创建中' : '创建村社' }}
              </button>
            </div>
          </div>

          <div v-if="!currentSociety && hasJoinRelations" class="game-panel-muted p-3">
            <p class="text-sm text-accent">我与村社的待处理关系</p>
            <div class="mt-3 space-y-2">
              <div v-for="request in societyStore.incomingInvites" :key="request.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs text-text">{{ request.society_name }}</p>
                <p class="mt-1 text-[10px] text-muted">邀请人：{{ request.invited_by_display_name || request.invited_by }}</p>
                <p v-if="request.target_save_id" class="mt-1 text-[10px] text-muted">受邀存档 ID：{{ request.target_save_id }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button class="online-action-btn online-action-btn--compact" type="button" :disabled="societyStore.actionRunning" @click="acceptRequest(request.id)">
                    接受
                  </button>
                  <button class="online-action-btn online-action-btn--compact" type="button" :disabled="societyStore.actionRunning" @click="rejectRequest(request.id)">
                    拒绝
                  </button>
                </div>
              </div>
              <div v-for="request in societyStore.myPendingRequests" :key="request.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs text-text">已申请：{{ request.society_name }}</p>
                <p class="mt-1 text-[10px] text-muted">等待村社管理者处理。</p>
                <p v-if="request.target_save_id" class="mt-1 text-[10px] text-muted">申请存档 ID：{{ request.target_save_id }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">公开村社</p>
            <span class="text-[10px] text-muted">{{ societyStore.visibleSocieties.length }} 个</span>
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
                  <p class="mt-1 text-[10px] text-muted">{{ society.theme_label }} · {{ society.visibility_label }} · {{ society.member_count }}/{{ society.capacity }} 人</p>
                </div>
                <span class="shrink-0 text-[10px]" :class="getSocietyJoinState(society).tone">
                  {{ getSocietyJoinState(society).label }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-[10px] leading-4 text-muted">{{ society.summary || '这个村社还没写简介。' }}</p>
              <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">公告：{{ society.notice || '暂无公告' }}</p>
              <p class="mt-1 text-[10px] text-muted">入社条件：{{ society.join_requirement_label }}</p>
              <p v-if="society.join_requirement_note" class="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">{{ society.join_requirement_note }}</p>
              <p class="mt-1 text-[10px] text-muted">发起人：{{ society.leader_display_name }}</p>
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
            <span class="text-[10px] text-muted">{{ memberCount }} 人</span>
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
                  <p class="mt-1 text-[10px] text-muted">{{ member.username }} · {{ member.role_label }}</p>
                  <p v-if="member.save_id" class="mt-1 text-[10px] text-muted">存档 ID：{{ member.save_id }}</p>
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
                <span v-else class="w-fit shrink-0 text-[10px] text-muted">{{ member.role === 'president' ? '社长职位不可在此调整' : '只读' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员治理</p>
            <div class="mt-3 grid gap-2 text-xs">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">待处理申请 / 邀请</p>
                <p class="mt-1 text-accent">{{ societyStore.managedRequests.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">我收到的邀请</p>
                <p class="mt-1 text-accent">{{ societyStore.incomingInvites.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">我的待处理申请</p>
                <p class="mt-1 text-accent">{{ societyStore.myPendingRequests.length }} 条</p>
              </div>
            </div>
          </div>

          <div v-if="currentSociety?.can_invite" class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">邀请玩家</p>
              <span class="text-[10px] text-muted">可用用户名或存档 ID</span>
            </div>
            <div class="mt-3 space-y-2">
              <input
                v-model="societyStore.draftInviteUsername"
                class="online-input w-full"
                placeholder="输入玩家用户名"
              />
              <input
                v-model="societyStore.draftInviteSaveId"
                class="online-input w-full"
                inputmode="numeric"
                placeholder="或输入目标存档 ID"
              />
              <button
                class="online-action-btn online-action-btn--primary w-full justify-center"
                type="button"
                :disabled="societyStore.actionRunning || !canInviteMember"
                @click="inviteMember"
              >
                {{ societyStore.actionRunning ? '邀请中' : '发送邀请' }}
              </button>
            </div>
          </div>

          <div v-if="currentSociety?.can_review_requests" class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">申请处理</p>
              <span class="text-[10px] text-muted">{{ societyStore.managedRequests.length }} 条</span>
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
                <p class="mt-1 text-[10px] text-muted">{{ request.society_name }}</p>
                <p v-if="request.target_save_id" class="mt-1 text-[10px] text-muted">存档 ID：{{ request.target_save_id }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button class="online-action-btn online-action-btn--compact" :data-testid="`online-society-managed-request-accept-${request.id}`" type="button" :disabled="societyStore.actionRunning" @click="acceptRequest(request.id)">
                    接受
                  </button>
                  <button class="online-action-btn online-action-btn--compact" :data-testid="`online-society-managed-request-reject-${request.id}`" type="button" :disabled="societyStore.actionRunning" @click="rejectRequest(request.id)">
                    拒绝
                  </button>
                </div>
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
            <span class="text-[10px] text-muted">{{ currentSociety?.level_title || '未加入' }}</span>
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
              <p class="mt-1 text-[10px] text-muted">
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
                <span class="text-[10px] text-muted">共用物资 {{ currentSociety.public_warehouse.funds }} 铜钱</span>
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
                  <p class="text-[10px] text-accent">{{ entry.label }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ entry.category_label }} · 本周 +{{ entry.weekly_points }} 分</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ entry.costs.map(cost => cost.label).join(' + ') }}</p>
                </button>
              </div>
              <div
                v-if="currentSociety.public_warehouse.consume_options.length > 0"
                class="mt-3 border border-warning/15 bg-warning/5 p-2"
                data-testid="online-society-warehouse-consume-panel"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-warning">公共消耗</p>
                  <span class="text-[10px] text-muted">只扣公共仓</span>
                </div>
                <div class="mt-2 grid gap-2 md:grid-cols-2">
                  <button
                    v-for="entry in currentSociety.public_warehouse.consume_options"
                    :key="entry.id"
                    type="button"
                    class="border border-warning/20 bg-black/10 px-2 py-2 text-left transition-colors hover:border-warning/40 disabled:cursor-not-allowed disabled:opacity-60"
                    :data-testid="`online-society-warehouse-consume-${entry.id}`"
                    :disabled="societyStore.actionRunning"
                    @click="consumeWarehouse(entry)"
                  >
                    <p class="text-[10px] text-warning">{{ entry.label }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                    <p class="mt-1 text-[10px] text-muted">消耗：{{ entry.costs.map(cost => cost.label).join(' + ') }}</p>
                    <p v-if="entry.room_preload_hint" class="mt-1 text-[10px] leading-4 text-warning">{{ entry.room_preload_hint }}</p>
                    <p v-if="entry.asset_boundary" class="mt-1 text-[10px] leading-4 text-muted">{{ entry.asset_boundary }}</p>
                  </button>
                </div>
              </div>
              <div
                v-if="currentSociety.public_warehouse.weekly_settlement"
                class="mt-3 border border-accent/10 bg-black/10 p-2"
                data-testid="online-society-warehouse-weekly-settlement"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-accent">本周村社仓廪</p>
                  <span class="text-[10px] text-muted">{{ currentSociety.public_warehouse.weekly_settlement.status_label }}</span>
                </div>
                <p class="mt-1 text-[10px] leading-4 text-muted">
                  {{ currentSociety.public_warehouse.weekly_settlement.total_points }} 分 ·
                  {{ currentSociety.public_warehouse.weekly_settlement.contributor_count }} 人 ·
                  {{ currentSociety.public_warehouse.weekly_settlement.covered_category_count }}/5 类齐备
                </p>
                <div class="mt-2 grid gap-1.5 sm:grid-cols-5">
                  <div
                    v-for="category in currentSociety.public_warehouse.weekly_settlement.categories"
                    :key="category.id"
                    class="border border-accent/10 px-1.5 py-1 text-[10px] text-muted"
                  >
                    <p class="text-accent">{{ category.label }}</p>
                    <p>{{ category.points }} 分 / {{ category.count }} 次</p>
                  </div>
                </div>
                <div class="mt-2 grid gap-1.5 md:grid-cols-3">
                  <div
                    v-for="effect in warehouseWeeklyEffects"
                    :key="effect.label"
                    class="border border-accent/10 px-2 py-1.5 text-[10px] leading-4 text-muted"
                    :class="effect.active ? 'bg-success/10 text-success' : 'bg-black/10'"
                  >
                    <p>{{ effect.label }}</p>
                    <p class="mt-0.5 text-muted">{{ effect.summary }}</p>
                  </div>
                </div>
              </div>
              <div v-if="currentSociety.public_warehouse.items.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                <span v-for="entry in currentSociety.public_warehouse.items" :key="entry.item_id" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                  {{ entry.label }}
                </span>
              </div>
              <div v-if="currentSociety.public_warehouse.logs.length > 0" class="mt-3 border-t border-accent/10 pt-2">
                <p class="text-[10px] text-accent">最近仓廪记录</p>
                <div class="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
                  <div v-for="entry in currentSociety.public_warehouse.logs.slice(0, 6)" :key="entry.id" class="text-[10px] leading-4 text-muted">
                    {{ warehouseLogText(entry) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-2 md:grid-cols-2">
              <div v-for="welfare in currentSociety.welfare_unlocks" :key="welfare.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs" :class="welfare.unlocked ? 'text-success' : 'text-muted'">{{ welfare.label }}</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ welfare.summary }}</p>
                <p class="mt-1 text-[10px] text-muted">解锁等级：{{ welfare.unlock_level }}</p>
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
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ currentSociety.exclusive_festival.summary }}</p>
              <p class="mt-1 text-[10px] text-muted">解锁等级：{{ currentSociety.exclusive_festival.unlock_level }}</p>
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ currentSociety.exclusive_festival.perk_summary }}</p>
            </div>
            <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in currentSociety.exclusive_decors" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-success' : 'text-muted'">{{ entry.label }}</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                <p class="mt-1 text-[10px] text-muted">解锁等级：{{ entry.unlock_level }}</p>
              </div>
            </div>
            <div class="border-t border-accent/10 pt-3">
              <p class="text-sm text-accent">专属任务</p>
              <div class="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                <div v-for="entry in currentSociety.exclusive_tasks" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                    <span class="text-[10px] text-muted">{{ entry.status_label }}</span>
                  </div>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                  <p class="mt-1 text-[10px] text-muted">解锁等级：{{ entry.unlock_level }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'projects'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">公共建设</p>
          <span class="text-[10px] text-muted">{{ currentSociety?.public_projects.length || 0 }} 项</span>
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
            @select-project="selectAsyncCommunityProject"
            @trigger-contribution="triggerAsyncCommunityContribution"
          />

          <div class="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="project in currentSociety.public_projects" :key="project.id" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text">{{ project.label }}</p>
                <p class="mt-1 text-[10px] text-muted">
                  {{ project.status_label }} · {{ project.progress }}/{{ project.target_progress }} · 已贡献 {{ project.my_contribution_count }} 次
                </p>
              </div>
              <span class="shrink-0 text-[10px]" :class="project.status === 'completed' ? 'text-success' : 'text-accent'">{{ project.progress_percent }}%</span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
              <div class="h-full bg-accent/70 transition-all" :style="{ width: `${project.progress_percent}%` }" />
            </div>
            <p class="mt-2 text-[10px] leading-4 text-muted">{{ project.summary }}</p>
            <p v-if="project.progress_note" class="mt-1 text-[10px] leading-4 text-muted">{{ project.progress_note }}</p>
            <p v-if="project.status === 'completed'" class="mt-1 text-[10px] leading-4 text-success">{{ project.world_feedback || project.completion_feedback }}</p>
            <RouterLink
              v-if="project.completion_room_launch"
              class="mt-2 flex items-center justify-between gap-2 border border-accent/20 bg-accent/10 px-2 py-2 text-[10px] text-accent"
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
              <span class="min-w-0">
                {{ project.completion_room_launch.label }}：{{ project.completion_room_launch.summary }}
              </span>
              <span class="shrink-0">创建房间</span>
            </RouterLink>
            <div v-if="(project.completion_rewards || []).length > 0" class="mt-2 space-y-1 text-[10px] leading-4 text-muted">
              <p class="text-accent">完工效果</p>
              <p
                v-for="reward in project.completion_rewards || []"
                :key="`${project.id}-${reward.id}`"
                :class="reward.active ? 'text-success' : 'text-muted'"
              >
                {{ reward.label }}：{{ reward.summary }}
              </p>
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
                <p class="text-[10px] text-accent">{{ entry.label }} · +{{ entry.progress_gain }} 进度</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                <p class="mt-1 text-[10px] text-muted">
                  {{ packageCostText(entry) }}
                  <span v-if="packageLimitText(entry)"> · {{ packageLimitText(entry) }}</span>
                </p>
              </button>
            </div>

            <div v-if="project.recent_contributions.length > 0" class="mt-3 border-t border-accent/10 pt-2">
              <p class="text-[10px] text-accent">最近捐献</p>
              <div class="mt-1 space-y-1">
                <div v-for="entry in project.recent_contributions" :key="entry.id" class="text-[10px] leading-4 text-muted">
                  {{ entry.display_name }} 提交了 {{ entry.package_label }}（+{{ entry.progress_gain }}） · {{ costListText(entry.costs) }}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'proposals'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">活跃提案</p>
            <span class="text-[10px] text-muted">{{ currentSociety?.active_proposals.length || 0 }} 条</span>
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
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="proposal in currentSociety.active_proposals" :key="proposal.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ proposal.title }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ proposal.kind_label }} · {{ proposal.status_label }}</p>
                </div>
                <span class="shrink-0 text-[10px] text-accent">{{ proposal.total_vote_count }} 票</span>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted">{{ proposal.summary }}</p>
              <p class="mt-2 text-[10px] text-muted">
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
              <p v-if="proposal.my_vote_choice" class="mt-2 text-[10px] text-success">我的当前票：{{ getProposalVoteLabel(proposal) }}</p>
              <div v-if="proposal.can_close" class="mt-2 space-y-2">
                <input
                  v-model="proposalResolutionNotes[proposal.id]"
                  maxlength="120"
                  class="online-input w-full"
                  placeholder="归档备注，例如：按多数票执行，本周先试运行。"
                />
                <div class="flex justify-end">
                  <button
                    class="online-action-btn online-action-btn--compact"
                    type="button"
                    :disabled="societyStore.actionRunning"
                    @click="archiveProposal(proposal.id)"
                  >
                    归档提案
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">发起提案</p>
              <span class="text-[10px] text-muted">{{ currentSociety?.can_create_proposal ? '可发起' : '只读' }}</span>
            </div>
            <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后可以查看是否具备发起提案权限。</div>
            <div v-else-if="!currentSociety.can_create_proposal" class="mt-3 text-xs leading-5 text-muted">当前身份没有发起提案权限。</div>
            <div v-else class="mt-3 space-y-2">
              <input
                v-model="societyStore.draftProposalTitle"
                maxlength="40"
                class="online-input w-full"
                data-testid="online-society-proposal-title-input"
                placeholder="提案标题，例如：本周节会联机排班"
              />
              <select v-model="societyStore.draftProposalKind" class="online-select w-full" data-testid="online-society-proposal-kind-select">
                <option v-for="entry in societyStore.proposalKindOptions" :key="entry.id" :value="entry.id">
                  {{ entry.label }}
                </option>
              </select>
              <textarea
                v-model="societyStore.draftProposalSummary"
                rows="3"
                maxlength="160"
                class="online-textarea w-full"
                data-testid="online-society-proposal-summary-input"
                placeholder="写清楚本次提案的背景、目标和希望大家表决的方向。"
              />
              <button
                class="online-action-btn online-action-btn--primary w-full justify-center"
                data-testid="online-society-proposal-submit"
                type="button"
                :disabled="societyStore.actionRunning || !canSubmitProposal"
                @click="submitProposal"
              >
                {{ societyStore.actionRunning ? '提交中' : '发起提案' }}
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
                    <p class="mt-1 text-[10px] text-muted">{{ proposal.kind_label }} · {{ proposal.result_label }}</p>
                  </div>
                  <span class="shrink-0 text-[10px] text-muted">{{ proposal.total_vote_count }} 票</span>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-muted">{{ proposal.summary }}</p>
                <p v-if="proposal.resolution_note" class="mt-1 text-[10px] leading-4 text-muted">归档备注：{{ proposal.resolution_note }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'chronicles'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">村社史册</p>
            <span class="text-[10px] text-muted">{{ currentSociety?.chronicle.founded_date_label || '未加入' }}</span>
          </div>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示史册摘要。</div>
          <div v-else class="mt-3 space-y-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">年度摘要</p>
              <p class="mt-1 text-xs leading-5 text-accent">{{ currentSociety.chronicle.annual_summary }}</p>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">成立日期</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.founded_date_label || '待记录' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">历任职位</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.role_history.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">公共建设</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.public_projects.length }} 项</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">节会参与</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.festival_participations.length }} 条</p>
              </div>
            </div>
            <div v-if="currentSociety.chronicle.role_history.length > 0" class="max-h-56 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">历任职位</p>
              <div v-for="entry in currentSociety.chronicle.role_history" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.display_name }}</p>
                  <span class="shrink-0 text-[10px] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                </div>
                <p class="mt-1 text-[10px] text-muted">{{ entry.role_label }}</p>
              </div>
            </div>
            <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">公共建设列表</p>
              <div v-for="entry in currentSociety.chronicle.public_projects" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.label }}</p>
                  <span class="shrink-0 text-[10px]" :class="entry.status === 'completed' ? 'text-success' : 'text-muted'">{{ entry.status_label }}</span>
                </div>
                <p class="mt-1 text-[10px] text-muted">
                  {{ entry.progress }}/{{ entry.target_progress }} · 共 {{ entry.contribution_count }} 条贡献
                  <template v-if="entry.completed_at && entry.completed_by_display_name">
                    · {{ entry.completed_by_display_name }} 完工
                  </template>
                </p>
                <p v-if="activeCompletionRewardText(entry.completion_rewards)" class="mt-1 text-[10px] leading-4 text-success">
                  落成效果：{{ activeCompletionRewardText(entry.completion_rewards) }}
                </p>
              </div>
            </div>
            <div v-if="currentSociety.chronicle.festival_participations.length > 0" class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">节会参与列表</p>
              <div v-for="entry in currentSociety.chronicle.festival_participations" :key="entry.memorial_id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.template_label }}</p>
                  <span class="shrink-0 text-[10px] text-muted">{{ formatChronicleDate(entry.awarded_at) }}</span>
                </div>
                <p class="mt-1 text-[10px] text-muted">{{ entry.gameplay_template_label }} · {{ entry.participant_count }} 名社员参与</p>
                <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">{{ entry.participant_display_names.join('、') }}</p>
              </div>
            </div>
            <div v-if="currentSociety.chronicle.timeline.length > 0" class="max-h-72 space-y-2 overflow-y-auto pr-1">
              <p class="text-xs text-accent">关键事件时间线</p>
              <div v-for="entry in currentSociety.chronicle.timeline" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.label }}</p>
                  <span class="shrink-0 text-[10px] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                </div>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
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
                <span class="shrink-0 text-[10px] text-accent">{{ entry.contribution_count }} 次</span>
              </div>
              <p class="mt-1 text-[10px] text-muted">{{ entry.project_count }} 项建设 · +{{ entry.total_progress_gain }} 进度</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue'
  import { RouterLink, useRoute, useRouter } from 'vue-router'
  import { ShieldCheck } from 'lucide-vue-next'
  import AsyncCommunityBoard from '@/components/game/online/AsyncCommunityBoard.vue'
  import OnlineEmptyState from '@/components/game/online/OnlineEmptyState.vue'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import OnlineStatusBanner from '@/components/game/online/OnlineStatusBanner.vue'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import type { OnlineVisualAsyncProject } from '@/types/onlineVisual'
  import type {
    SocietyProjectCompletionRewardSnapshot,
    SocietyProjectPackageSnapshot,
    SocietyProposalChoice,
    SocietyWarehouseConsumeOptionSnapshot,
    SocietyProposalSnapshot,
    SocietyRole,
    SocietyWarehouseLogSnapshot,
    SocietySnapshot,
  } from '@/utils/societyApi'

  type SocietyTabKey = 'overview' | 'members' | 'storage' | 'projects' | 'proposals' | 'chronicles'
  type SocietyTabMeta = { key: SocietyTabKey; label: string; summary: string }
  const router = useRouter()

  const route = useRoute()
  const societyStore = useSocietyStore()
  const memberRoleDrafts = reactive<Record<string, Exclude<SocietyRole, 'president'>>>({})
  const proposalResolutionNotes = reactive<Record<string, string>>({})
  const selectedAsyncCommunityProjectId = ref('')
  const tabs: SocietyTabMeta[] = [
    { key: 'overview', label: '总览', summary: '查看我的村社、公告摘要和公开村社入口。' },
    { key: 'members', label: '成员', summary: '查看成员、职位和待处理申请邀请摘要。' },
    { key: 'storage', label: '仓库与福利', summary: '查看公共仓库、福利等级、专属节会和装饰摘要。' },
    { key: 'projects', label: '公共建设', summary: '查看公共建设进度和近期推进状态。' },
    { key: 'proposals', label: '提案', summary: '查看活跃提案和归档数量。' },
    { key: 'chronicles', label: '史册', summary: '查看村社成立、建设、节会参与和贡献成员摘要。' },
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
  const packageCostText = (entry: SocietyProjectPackageSnapshot) =>
    costListText(entry.costs)
  const packageLimitText = (entry: SocietyProjectPackageSnapshot) => {
    const limits: string[] = []
    if (entry.daily_limit > 0) limits.push(`24小时 ${entry.daily_limit} 次`)
    if (entry.weekly_limit > 0) limits.push(`7天 ${entry.weekly_limit} 次`)
    return limits.join(' / ')
  }
  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const pendingRequestBySocietyId = computed(() => new Map(societyStore.myPendingRequests.map(request => [request.society_id, request])))
  const incomingInviteBySocietyId = computed(() => new Map(societyStore.incomingInvites.map(request => [request.society_id, request])))
  const hasJoinRelations = computed(() => societyStore.incomingInvites.length > 0 || societyStore.myPendingRequests.length > 0)
  const canSubmitSociety = computed(() => societyStore.draftName.trim().length > 0 && !societyStore.actionRunning)
  const canInviteMember = computed(() => !!societyStore.draftInviteUsername.trim() || !!societyStore.draftInviteSaveId.trim())
  const canSubmitProposal = computed(() => societyStore.draftProposalTitle.trim().length > 0 && societyStore.draftProposalSummary.trim().length > 0)
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

  const warehouseLogText = (entry: SocietyWarehouseLogSnapshot) => {
    const detail = entry.entries.map(cost => cost.label).filter(Boolean).join(' + ') || '无材料明细'
    if (entry.action === 'consume') return `${entry.display_name} 消耗了 ${entry.deposit_label} · ${detail} · 只扣公共仓`
    return `${entry.display_name} 补入了 ${entry.deposit_label} · ${entry.category_label || '公共仓'} · ${detail}`
  }

  const createSociety = async () => {
    if (!canSubmitSociety.value) return
    await societyStore.submitSociety().catch(() => {})
  }

  const applySociety = async (societyId: string) => {
    await societyStore.applySociety(societyId).catch(() => {})
  }

  const inviteMember = async () => {
    if (!canInviteMember.value) return
    await societyStore.inviteMember().catch(() => {})
  }

  const acceptRequest = async (requestId: string) => {
    await societyStore.acceptRequest(requestId).catch(() => {})
  }

  const rejectRequest = async (requestId: string) => {
    await societyStore.rejectRequest(requestId).catch(() => {})
  }

  const changeMemberRole = async (targetUsername: string) => {
    const role = memberRoleDrafts[targetUsername]
    if (!role) return
    await societyStore.changeMemberRole(targetUsername, role).catch(() => {})
  }

  const saveNotice = async () => {
    await societyStore.saveNotice().catch(() => {})
  }

  const submitProposal = async () => {
    if (!canSubmitProposal.value) return
    await societyStore.submitProposal().catch(() => {})
  }

  const castVote = async (proposalId: string, choice: SocietyProposalChoice) => {
    await societyStore.castProposalVote(proposalId, choice).catch(() => {})
  }

  const archiveProposal = async (proposalId: string) => {
    await societyStore.archiveProposal(proposalId, proposalResolutionNotes[proposalId] || '').catch(() => {})
    proposalResolutionNotes[proposalId] = ''
  }

  const selectAsyncCommunityProject = (projectId: string) => {
    selectedAsyncCommunityProjectId.value = projectId
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

  const consumeWarehouse = async (entry: SocietyWarehouseConsumeOptionSnapshot) => {
    const result = await societyStore.consumeWarehouse(entry.id).catch(() => null)
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
