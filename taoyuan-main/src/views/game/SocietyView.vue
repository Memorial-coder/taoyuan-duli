<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/20">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">村社</p>
          <p class="text-sm text-accent mt-1">从邻里互助推进到共治组织</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ societyStore.overview?.bulletin || '先把村社创建、成员治理、公告与提案骨架跑通，再继续补公共建设。' }}</p>
        </div>
        <Button class="shrink-0" :disabled="societyStore.loading || societyStore.actionRunning" @click="refreshOverview">
          刷新
        </Button>
      </div>
      <p v-if="societyStore.errorMessage" class="text-xs text-danger mt-3">{{ societyStore.errorMessage }}</p>
    </div>

    <div class="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div class="space-y-3">
        <div v-if="societyStore.mySociety" class="space-y-3">
          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-accent">{{ societyStore.mySociety.name }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ societyStore.mySociety.theme_label }} · {{ societyStore.mySociety.visibility_label }} · {{ societyStore.mySociety.member_count }}/{{ societyStore.mySociety.capacity }} 人</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[0.625rem] text-accent">{{ societyStore.mySociety.my_role_label || '成员' }}</span>
                <Button class="!px-2 !py-1" :disabled="societyStore.actionRunning" @click="leaveCurrentSociety">
                  {{ societyStore.mySociety.my_role === 'president' && societyStore.mySociety.member_count <= 1 ? '退出并解散' : '退出村社' }}
                </Button>
              </div>
            </div>
            <p class="text-xs text-muted mt-2 leading-5">{{ societyStore.mySociety.summary || '这个村社还没写简介。' }}</p>
            <div class="grid gap-2 md:grid-cols-3 mt-3">
              <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted">徽记</p>
                <p class="text-xs text-accent mt-1">{{ societyStore.mySociety.emblem_label }}</p>
              </div>
              <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted">发起人</p>
                <p class="text-xs text-accent mt-1">{{ societyStore.mySociety.leader_display_name }}</p>
              </div>
              <div class="border border-accent/10 rounded-xs p-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted">入社条件</p>
                <p class="text-xs text-accent mt-1">{{ societyStore.mySociety.join_requirement_label }}</p>
                <p v-if="societyStore.mySociety.join_requirement_note" class="text-[0.625rem] text-muted mt-1">{{ societyStore.mySociety.join_requirement_note }}</p>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-sm text-accent">村社公告</p>
              <span class="text-[0.625rem] text-muted">{{ societyStore.mySociety.can_manage_notice ? '可编辑' : '只读' }}</span>
            </div>
            <template v-if="societyStore.mySociety.can_manage_notice">
              <textarea
                v-model="societyStore.draftNotice"
                rows="3"
                maxlength="160"
                class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text resize-none"
                placeholder="写一句让成员知道本周在忙什么。"
              />
              <div class="flex justify-end mt-2">
                <Button :disabled="societyStore.actionRunning" @click="saveNotice">保存公告</Button>
              </div>
            </template>
            <p v-else class="text-xs text-muted leading-5">{{ societyStore.mySociety.notice || '当前还没有村社公告。' }}</p>
          </div>

          <div v-if="societyStore.mySociety.can_invite || societyStore.managedRequests.length > 0 || societyStore.incomingInvites.length > 0" class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div v-if="societyStore.mySociety.can_invite">
              <p class="text-sm text-accent mb-2">邀请或处理入社</p>
              <div class="online-action-row">
                <input
                  v-model="societyStore.draftInviteUsername"
                  class="online-input flex-1"
                  placeholder="输入玩家用户名"
                />
                <Button class="online-action-btn online-action-btn--primary" :disabled="societyStore.actionRunning" @click="inviteMember">
                  邀请
                </Button>
              </div>
            </div>

            <div v-if="societyStore.managedRequests.length > 0">
              <p class="text-xs text-accent mb-2">待处理申请 / 邀请</p>
              <div class="space-y-2">
                <div v-for="request in societyStore.managedRequests" :key="request.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                  <p class="text-xs text-text">{{ request.display_name }} · {{ request.type_label }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">{{ request.society_name }}</p>
                  <p v-if="request.target_save_id" class="text-[0.625rem] text-muted mt-1">存档 ID：{{ request.target_save_id }}</p>
                  <div class="flex gap-2 mt-2">
                    <Button :disabled="societyStore.actionRunning" @click="acceptRequest(request.id)">接受</Button>
                    <Button :disabled="societyStore.actionRunning" @click="rejectRequest(request.id)">拒绝</Button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="societyStore.incomingInvites.length > 0">
              <p class="text-xs text-accent mb-2">我收到的村社邀请</p>
              <div class="space-y-2">
                <div v-for="request in societyStore.incomingInvites" :key="request.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                  <p class="text-xs text-text">{{ request.society_name }}</p>
                  <p class="text-[0.625rem] text-muted mt-1">邀请人：{{ request.invited_by_display_name || request.invited_by }}</p>
                  <p v-if="request.target_save_id" class="text-[0.625rem] text-muted mt-1">受邀存档 ID：{{ request.target_save_id }}</p>
                  <div class="flex gap-2 mt-2">
                    <Button :disabled="societyStore.actionRunning" @click="acceptRequest(request.id)">接受</Button>
                    <Button :disabled="societyStore.actionRunning" @click="rejectRequest(request.id)">拒绝</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-sm text-accent">成员与职位</p>
              <span class="text-[0.625rem] text-muted">{{ societyStore.mySociety.can_manage_roles ? '社长可调整职位' : '当前只读' }}</span>
            </div>
            <div class="space-y-2">
              <div v-for="member in societyStore.mySociety.members" :key="`${societyStore.mySociety.id}-${member.username}`" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-text">{{ member.display_name }}</p>
                    <p class="text-[0.625rem] text-muted mt-1">{{ member.username }} · {{ member.role_label }}</p>
                    <p v-if="member.save_id" class="text-[0.625rem] text-muted mt-1">存档 ID：{{ member.save_id }}</p>
                  </div>
                  <div v-if="societyStore.mySociety.can_manage_roles && member.role !== 'president'" class="flex items-center gap-2">
                    <select
                      v-model="memberRoleDrafts[member.username]"
                      class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-text"
                    >
                      <option v-for="entry in assignableRoleOptions" :key="entry.id" :value="entry.id">
                        {{ entry.label }}
                      </option>
                    </select>
                    <Button :disabled="societyStore.actionRunning" @click="changeMemberRole(member.username)">
                      调整
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">村社等级与福利</p>
              <span class="text-[0.625rem] text-muted">{{ societyStore.mySociety.level_title }}</span>
            </div>
            <div>
              <p class="text-[0.625rem] text-muted">
                等级 {{ societyStore.mySociety.level }} · 福利经验 {{ societyStore.mySociety.welfare_xp }}/{{ currentWelfareProgressTotal }}
                {{ societyStore.mySociety.welfare_xp_to_next_level > 0 ? `· 距下一级 ${societyStore.mySociety.welfare_xp_to_next_level}` : '· 已达当前最高级' }}
              </p>
              <div class="w-full h-2 rounded-xs bg-bg/80 overflow-hidden mt-2">
                <div class="h-full bg-accent/70 transition-all" :style="{ width: `${currentWelfareProgressPercent}%` }" />
              </div>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div v-for="welfare in societyStore.mySociety.welfare_unlocks" :key="welfare.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-xs" :class="welfare.unlocked ? 'text-success' : 'text-muted'">{{ welfare.label }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ welfare.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">解锁等级：{{ welfare.unlock_level }}</p>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">公共仓库</p>
              <span class="text-[0.625rem] text-muted">共用物资 {{ societyStore.mySociety.public_warehouse.funds }} 铜钱</span>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <button
                v-for="entry in societyStore.mySociety.public_warehouse.deposit_options"
                :key="entry.id"
                type="button"
                class="text-left border border-accent/15 rounded-xs px-2 py-2 bg-bg/10 hover:border-accent/35 disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="societyStore.actionRunning"
                @click="depositWarehouse(entry.id)"
              >
                <p class="text-[0.625rem] text-accent">{{ entry.label }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ entry.costs.map(cost => cost.label).join(' + ') }}</p>
              </button>
            </div>
            <div v-if="societyStore.mySociety.public_warehouse.items.length > 0" class="border-t border-accent/10 pt-2">
              <p class="text-[0.625rem] text-accent mb-1">仓库物资</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="entry in societyStore.mySociety.public_warehouse.items"
                  :key="entry.item_id"
                  class="flex items-center gap-1 text-[0.625rem] text-muted border border-accent/10 rounded-xs px-2 py-1"
                >
                  <ItemIcon :item="getItemById(entry.item_id)" size="xs" :show-badge="false" />
                  {{ entry.label }}
                </span>
              </div>
            </div>
            <div v-if="societyStore.mySociety.public_warehouse.logs.length > 0" class="border-t border-accent/10 pt-2 space-y-1">
              <p class="text-[0.625rem] text-accent">最近入仓</p>
              <div v-for="entry in societyStore.mySociety.public_warehouse.logs.slice(0, 4)" :key="entry.id" class="text-[0.625rem] text-muted leading-4">
                {{ entry.display_name }} 补入了 {{ entry.deposit_label }} · {{ entry.entries.map(cost => cost.label).join(' + ') }}
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">专属节会与装饰</p>
              <span class="text-[0.625rem] text-muted">按主题与等级解锁</span>
            </div>
            <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <p class="text-xs" :class="societyStore.mySociety.exclusive_festival.unlocked ? 'text-success' : 'text-muted'">
                {{ societyStore.mySociety.exclusive_festival.label }}
              </p>
              <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ societyStore.mySociety.exclusive_festival.summary }}</p>
              <p class="text-[0.625rem] text-muted mt-1">解锁等级：{{ societyStore.mySociety.exclusive_festival.unlock_level }}</p>
              <p class="text-[0.625rem] text-muted mt-1">{{ societyStore.mySociety.exclusive_festival.perk_summary }}</p>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div v-for="entry in societyStore.mySociety.exclusive_decors" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-xs" :class="entry.unlocked ? 'text-success' : 'text-muted'">{{ entry.label }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">解锁等级：{{ entry.unlock_level }}</p>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">专属任务</p>
              <span class="text-[0.625rem] text-muted">围绕本社主题与福利推进</span>
            </div>
            <div class="space-y-2">
              <div v-for="entry in societyStore.mySociety.exclusive_tasks" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                  <span class="text-[0.625rem] text-muted">{{ entry.status_label }}</span>
                </div>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1">解锁等级：{{ entry.unlock_level }}</p>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">村社史册</p>
              <span class="text-[0.625rem] text-muted">L101 第一轮</span>
            </div>
            <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <p class="text-[0.625rem] text-muted">成立日期</p>
              <p class="text-xs text-accent mt-1">{{ societyStore.mySociety.chronicle.founded_date_label || '待记录' }}</p>
              <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ societyStore.mySociety.chronicle.annual_summary }}</p>
            </div>

            <div v-if="societyStore.mySociety.chronicle.role_history.length > 0" class="space-y-2">
              <p class="text-xs text-accent">历任职位</p>
              <div class="space-y-2">
                <div
                  v-for="entry in societyStore.mySociety.chronicle.role_history.slice(0, 6)"
                  :key="entry.id"
                  class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs text-text">{{ entry.display_name }}</p>
                    <span class="text-[0.625rem] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-1">{{ entry.role_label }}</p>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs text-accent">公共建设列表</p>
              <div class="space-y-2">
                <div
                  v-for="entry in societyStore.mySociety.chronicle.public_projects"
                  :key="entry.id"
                  class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs text-text">{{ entry.label }}</p>
                    <span class="text-[0.625rem]" :class="entry.status === 'completed' ? 'text-success' : 'text-muted'">{{ entry.status_label }}</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-1">
                    {{ entry.progress }}/{{ entry.target_progress }} · 共 {{ entry.contribution_count }} 条贡献
                    <template v-if="entry.completed_at && entry.completed_by_display_name">
                      · {{ entry.completed_by_display_name }} 完工
                    </template>
                  </p>
                </div>
              </div>
            </div>

            <div v-if="societyStore.mySociety.chronicle.festival_participations.length > 0" class="space-y-2">
              <p class="text-xs text-accent">节会参与列表</p>
              <div class="space-y-2">
                <div
                  v-for="entry in societyStore.mySociety.chronicle.festival_participations"
                  :key="entry.memorial_id"
                  class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs text-text">{{ entry.template_label }}</p>
                    <span class="text-[0.625rem] text-muted">{{ formatChronicleDate(entry.awarded_at) }}</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-1">{{ entry.gameplay_template_label }} · {{ entry.participant_count }} 名社员参与</p>
                  <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.participant_display_names.join('、') }}</p>
                </div>
              </div>
            </div>

            <div v-if="societyStore.mySociety.chronicle.top_contributors.length > 0" class="space-y-2">
              <p class="text-xs text-accent">主要贡献成员</p>
              <div class="space-y-2">
                <div
                  v-for="entry in societyStore.mySociety.chronicle.top_contributors"
                  :key="entry.username"
                  class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs text-text">{{ entry.display_name }}</p>
                    <span class="text-[0.625rem] text-accent">+{{ entry.total_progress_gain }} 进度</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-1">主导 {{ entry.project_count }} 项工程 · 留下 {{ entry.contribution_count }} 条贡献</p>
                </div>
              </div>
            </div>

            <div v-if="societyStore.mySociety.chronicle.timeline.length > 0" class="space-y-2">
              <p class="text-xs text-accent">关键事件时间线</p>
              <div class="space-y-2">
                <div
                  v-for="entry in societyStore.mySociety.chronicle.timeline"
                  :key="entry.id"
                  class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs text-text">{{ entry.label }}</p>
                    <span class="text-[0.625rem] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">村社会议</p>
              <span class="text-[0.625rem] text-muted">{{ societyStore.mySociety.can_create_proposal ? '成员可发起提案' : '当前只读' }}</span>
            </div>

            <div v-if="societyStore.mySociety.can_create_proposal" class="space-y-3">
              <input
                v-model="societyStore.draftProposalTitle"
                maxlength="40"
                class="online-input w-full"
                placeholder="提案标题，例如：本周节会联机排班"
              />
              <select v-model="societyStore.draftProposalKind" class="online-select w-full">
                <option v-for="entry in societyStore.proposalKindOptions" :key="entry.id" :value="entry.id">
                  {{ entry.label }}
                </option>
              </select>
              <textarea
                v-model="societyStore.draftProposalSummary"
                rows="3"
                maxlength="160"
                class="online-textarea w-full resize-none"
                placeholder="写清楚本次提案的背景、目标和希望大家表决的方向。"
              />
              <div class="flex justify-end">
                <Button class="online-action-btn online-action-btn--primary" :disabled="societyStore.actionRunning" @click="submitProposal">
                  发起提案
                </Button>
              </div>
            </div>

            <div>
              <p class="text-xs text-accent mb-2">进行中提案</p>
              <div v-if="societyStore.mySociety.active_proposals.length === 0" class="text-[0.625rem] text-muted leading-5">当前还没有进行中的村社提案。</div>
              <div v-else class="space-y-2">
                <div v-for="proposal in societyStore.mySociety.active_proposals" :key="proposal.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-text">{{ proposal.title }}</p>
                      <p class="text-[0.625rem] text-muted mt-1">{{ proposal.kind_label }} · 发起人 {{ proposal.created_by_display_name }}</p>
                    </div>
                    <span class="text-[0.625rem] text-accent">{{ proposal.status_label }}</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ proposal.summary }}</p>
                  <p class="text-[0.625rem] text-muted mt-2">赞成 {{ proposal.vote_counts.support }} / 反对 {{ proposal.vote_counts.reject }} / 暂缓 {{ proposal.vote_counts.abstain }}</p>
                  <div v-if="proposal.can_vote" class="flex flex-wrap gap-2 mt-2">
                    <Button
                      v-for="choice in proposal.choice_options"
                      :key="`${proposal.id}-${choice.id}`"
                      :disabled="societyStore.actionRunning"
                      @click="castVote(proposal.id, choice.id)"
                    >
                      {{ choice.label }}
                    </Button>
                  </div>
                  <p v-if="proposal.my_vote_choice" class="text-[0.625rem] text-success mt-2">我的当前票：{{ proposal.votes.find(entry => entry.username === currentUsername)?.choice_label || proposal.my_vote_choice }}</p>
                  <div v-if="proposal.can_close" class="mt-2 space-y-2">
                    <input
                      v-model="proposalResolutionNotes[proposal.id]"
                      maxlength="120"
                      class="online-input w-full"
                      placeholder="归档备注，例如：按多数票执行，本周先试运行。"
                    />
                    <div class="flex justify-end">
                      <Button class="online-action-btn online-action-btn--primary" :disabled="societyStore.actionRunning" @click="archiveProposal(proposal.id)">
                        归档提案
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs text-accent mb-2">历史提案</p>
              <div v-if="societyStore.mySociety.proposal_history.length === 0" class="text-[0.625rem] text-muted leading-5">当前还没有已归档的村社提案。</div>
              <div v-else class="space-y-2">
                <div v-for="proposal in societyStore.mySociety.proposal_history" :key="proposal.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-text">{{ proposal.title }}</p>
                      <p class="text-[0.625rem] text-muted mt-1">{{ proposal.kind_label }} · {{ proposal.result_label }}</p>
                    </div>
                    <span class="text-[0.625rem] text-muted">{{ proposal.total_vote_count }} 票</span>
                  </div>
                  <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ proposal.summary }}</p>
                  <p v-if="proposal.resolution_note" class="text-[0.625rem] text-muted mt-1">归档备注：{{ proposal.resolution_note }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">公共建设</p>
              <span class="text-[0.625rem] text-muted">L73 第一轮</span>
            </div>
            <div class="space-y-2">
              <div
                v-for="project in societyStore.mySociety.public_projects"
                :key="project.id"
                class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs text-text">{{ project.label }}</p>
                    <p class="text-[0.625rem] text-muted mt-1">{{ project.status_label }} · {{ project.progress }}/{{ project.target_progress }} · 已贡献 {{ project.my_contribution_count }} 次</p>
                  </div>
                  <span class="text-[0.625rem]" :class="project.status === 'completed' ? 'text-success' : 'text-accent'">
                    {{ project.progress_percent }}%
                  </span>
                </div>
                <div class="w-full h-2 rounded-xs bg-bg/80 overflow-hidden mt-2">
                  <div class="h-full bg-accent/70 transition-all" :style="{ width: `${project.progress_percent}%` }" />
                </div>
                <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ project.summary }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ project.progress_note }}</p>
                <p v-if="project.status === 'completed'" class="text-[0.625rem] text-success mt-1 leading-4">{{ project.world_feedback }}</p>

                <div v-if="project.can_contribute" class="grid gap-2 md:grid-cols-2 mt-3">
                  <button
                    v-for="entry in project.contribution_packages"
                    :key="`${project.id}-${entry.id}`"
                    type="button"
                    class="text-left border border-accent/15 rounded-xs px-2 py-2 bg-bg/10 hover:border-accent/35 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="societyStore.actionRunning"
                    @click="contributeProject(project.id, entry.id)"
                  >
                    <p class="text-[0.625rem] text-accent">{{ entry.label }} · +{{ entry.progress_gain }} 进度</p>
                    <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                    <p class="text-[0.625rem] text-muted mt-1">{{ entry.costs.map(cost => cost.label).join(' + ') }}</p>
                  </button>
                </div>

                <div v-if="project.recent_contributions.length > 0" class="mt-3">
                  <p class="text-[0.625rem] text-accent mb-1">最近捐献</p>
                  <div class="space-y-1">
                    <div v-for="entry in project.recent_contributions" :key="entry.id" class="text-[0.625rem] text-muted leading-4">
                      {{ entry.display_name }} 提交了 {{ entry.package_label }}（+{{ entry.progress_gain }}） · {{ entry.costs.map(cost => cost.label).join(' + ') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-sm text-accent">创建村社</p>
              <span class="text-[0.625rem] text-muted">L70-L72 底座</span>
            </div>
            <div class="space-y-2">
              <label class="block">
                <span class="text-[0.625rem] text-muted">村社名称</span>
                <input
                  v-model="societyStore.draftName"
                  maxlength="24"
                  class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text"
                  placeholder="例如：清溪灯社"
                />
              </label>
              <label class="block">
                <span class="text-[0.625rem] text-muted">一句简介</span>
                <textarea
                  v-model="societyStore.draftSummary"
                  rows="3"
                  maxlength="120"
                  class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text resize-none"
                  placeholder="写清楚这个村社想组织怎样的生活、节会和协作方式。"
                />
              </label>
              <label class="block">
                <span class="text-[0.625rem] text-muted">初始公告</span>
                <textarea
                  v-model="societyStore.draftNotice"
                  rows="2"
                  maxlength="160"
                  class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text resize-none"
                  placeholder="例如：本周先招募稳定成员，再排第一轮节会值守。"
                />
              </label>
              <div class="grid gap-2 md:grid-cols-2">
                <label class="block">
                  <span class="text-[0.625rem] text-muted">村社徽记</span>
                  <select v-model="societyStore.draftEmblem" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                    <option v-for="entry in societyStore.emblemOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">村社主题</span>
                  <select v-model="societyStore.draftTheme" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                    <option v-for="entry in societyStore.themeOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
              </div>
              <div class="grid gap-2 md:grid-cols-2">
                <label class="block">
                  <span class="text-[0.625rem] text-muted">公开范围</span>
                  <select v-model="societyStore.draftVisibility" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                    <option v-for="entry in societyStore.visibilityOptions" :key="entry.id" :value="entry.id">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">成员容量</span>
                  <select v-model="societyStore.draftCapacity" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                    <option v-for="entry in societyStore.capacityOptions" :key="entry.value" :value="entry.value">
                      {{ entry.label }}
                    </option>
                  </select>
                </label>
              </div>
              <label class="block">
                <span class="text-[0.625rem] text-muted">入社条件</span>
                <select v-model="societyStore.draftJoinRequirementId" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
                  <option v-for="entry in societyStore.joinRequirementOptions" :key="entry.id" :value="entry.id">
                    {{ entry.label }}
                  </option>
                </select>
              </label>
              <label class="block">
                <span class="text-[0.625rem] text-muted">补充说明</span>
                <input
                  v-model="societyStore.draftJoinRequirementNote"
                  maxlength="80"
                  class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text"
                  placeholder="例如：希望先有公开名片和稳定经营节奏。"
                />
              </label>
              <Button class="w-full justify-center" :disabled="societyStore.actionRunning" @click="createSociety">
                创建村社
              </Button>
            </div>
          </div>

          <div v-if="societyStore.incomingInvites.length > 0 || societyStore.myPendingRequests.length > 0" class="border border-accent/20 rounded-xs p-3 bg-bg/10">
            <p class="text-sm text-accent mb-2">我与村社的待处理关系</p>
            <div class="space-y-2">
              <div v-for="request in societyStore.incomingInvites" :key="request.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-xs text-text">{{ request.society_name }}</p>
                <p class="text-[0.625rem] text-muted mt-1">邀请人：{{ request.invited_by_display_name || request.invited_by }}</p>
                <p v-if="request.target_save_id" class="text-[0.625rem] text-muted mt-1">受邀存档 ID：{{ request.target_save_id }}</p>
                <div class="flex gap-2 mt-2">
                  <Button :disabled="societyStore.actionRunning" @click="acceptRequest(request.id)">接受</Button>
                  <Button :disabled="societyStore.actionRunning" @click="rejectRequest(request.id)">拒绝</Button>
                </div>
              </div>
              <div v-for="request in societyStore.myPendingRequests" :key="request.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-xs text-text">已申请：{{ request.society_name }}</p>
                <p class="text-[0.625rem] text-muted mt-1">等待村社管理者处理。</p>
                <p v-if="request.target_save_id" class="text-[0.625rem] text-muted mt-1">申请存档 ID：{{ request.target_save_id }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">公开村社</p>
        <div v-if="societyStore.visibleSocieties.length === 0" class="text-xs text-muted leading-5">当前还没有可公开查看的村社。等第一批村社建立起来后，这里会用来筛选和比较不同组织方向。</div>
        <div v-else class="space-y-2">
          <div v-for="society in societyStore.visibleSocieties" :key="society.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-text">{{ society.name }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ society.theme_label }} · {{ society.visibility_label }} · {{ society.member_count }}/{{ society.capacity }} 人</p>
              </div>
              <span class="text-[0.625rem] text-accent">{{ society.emblem_label }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ society.summary || '这个村社还没写简介。' }}</p>
            <p class="text-[0.625rem] text-muted mt-1">公告：{{ society.notice || '暂无公告' }}</p>
            <p class="text-[0.625rem] text-muted mt-1">入社条件：{{ society.join_requirement_label }}</p>
            <p v-if="society.join_requirement_note" class="text-[0.625rem] text-muted mt-1">{{ society.join_requirement_note }}</p>
            <p class="text-[0.625rem] text-muted mt-1">发起人：{{ society.leader_display_name }}</p>
            <div v-if="society.can_apply" class="flex justify-end mt-2">
              <Button :disabled="societyStore.actionRunning" @click="applySociety(society.id)">
                申请加入
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, watch, watchEffect } from 'vue'
  import { useRoute } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import { getItemById } from '@/data'
  import type { SocietyProposalChoice, SocietyRole } from '@/utils/societyApi'
  import { ensureCurrentAccount } from '@/utils/accountStorage'

  const route = useRoute()
  const societyStore = useSocietyStore()
  const memberRoleDrafts = reactive<Record<string, Exclude<SocietyRole, 'president'>>>({})
  const proposalResolutionNotes = reactive<Record<string, string>>({})
  const currentUsername = computed(() => currentAccountUsername.value)
  const currentAccountUsername = reactive<{ value: string }>({ value: '' })

  const assignableRoleOptions = computed(() =>
    societyStore.roleOptions.filter(entry => entry.id !== 'president') as Array<{ id: Exclude<SocietyRole, 'president'>; label: string }>
  )

  const currentWelfareProgressTotal = computed(() => {
    const society = societyStore.mySociety
    if (!society) return 1
    if (society.welfare_xp_to_next_level <= 0) return Math.max(1, society.welfare_xp)
    return Math.max(1, society.welfare_xp + society.welfare_xp_to_next_level)
  })

  const currentWelfareProgressPercent = computed(() => {
    const society = societyStore.mySociety
    if (!society) return 0
    if (society.welfare_xp_to_next_level <= 0) return 100
    return Math.min(100, Math.round((society.welfare_xp / currentWelfareProgressTotal.value) * 100))
  })

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

  watchEffect(() => {
    for (const member of societyStore.mySociety?.members ?? []) {
      if (member.role !== 'president' && !memberRoleDrafts[member.username]) {
        memberRoleDrafts[member.username] = member.role as Exclude<SocietyRole, 'president'>
      }
    }
    for (const proposal of societyStore.mySociety?.active_proposals ?? []) {
      if (proposalResolutionNotes[proposal.id] === undefined) proposalResolutionNotes[proposal.id] = ''
    }
  })

  const loadCurrentAccount = async () => {
    const account = await ensureCurrentAccount()
    currentAccountUsername.value = account && account !== 'guest' ? account : ''
  }

  const refreshOverview = async () => {
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

  const createSociety = async () => {
    await societyStore.submitSociety().catch(() => {})
  }

  const applySociety = async (societyId: string) => {
    await societyStore.applySociety(societyId).catch(() => {})
  }

  const inviteMember = async () => {
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

  const leaveCurrentSociety = async () => {
    const message = societyStore.mySociety?.my_role === 'president' && (societyStore.mySociety?.member_count || 0) <= 1
      ? '确认退出并解散当前村社吗？此操作会移除整张村社卡片。'
      : '确认退出当前村社吗？'
    if (typeof window !== 'undefined' && !window.confirm(message)) return
    await societyStore.exitSociety().catch(() => {})
  }

  const submitProposal = async () => {
    await societyStore.submitProposal().catch(() => {})
  }

  const castVote = async (proposalId: string, choice: SocietyProposalChoice) => {
    await societyStore.castProposalVote(proposalId, choice).catch(() => {})
  }

  const archiveProposal = async (proposalId: string) => {
    await societyStore.archiveProposal(proposalId, proposalResolutionNotes[proposalId] || '').catch(() => {})
    proposalResolutionNotes[proposalId] = ''
  }

  const contributeProject = async (projectId: string, packageId: string) => {
    await societyStore.contributeProject(projectId, packageId).catch(() => {})
  }

  const depositWarehouse = async (depositId: string) => {
    await societyStore.depositWarehouse(depositId).catch(() => {})
  }

  onMounted(() => {
    applyInviteRouteDraft()
    void loadCurrentAccount()
    void refreshOverview()
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      applyInviteRouteDraft()
    }
  )
</script>
