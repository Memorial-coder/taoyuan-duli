<template>
  <div class="space-y-3" data-testid="online-festival-page">
    <OnlineModuleShell
      title="在线节会"
      :summary="moduleSummary"
      :meta="refreshStateLabel"
      refresh-label="刷新节会"
      :refresh-running="refreshing"
      :refresh-disabled="refreshing"
      :stats="summaryStats"
      :tabs="tabs"
      :active-tab="activeTab"
      @refresh="refreshFestivalModule"
      @update:active-tab="setActiveTab"
    >
      <template #icon>
        <CalendarDays :size="16" />
      </template>
      <template #errors>
        <div v-if="errorMessages.length > 0" class="grid gap-2">
          <div v-for="message in errorMessages" :key="message" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {{ message }}
          </div>
        </div>
      </template>
    </OnlineModuleShell>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
      </div>

      <div v-if="activeTab === 'world'" class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">当前季节大事件</p>
              <span class="text-[0.625rem] text-muted">{{ worldEventStore.currentEvent?.state_label || '未开放' }}</span>
            </div>
            <div v-if="worldEventStore.currentEvent" class="mt-3 space-y-3">
              <div class="border border-accent/10 bg-black/10 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-accent">{{ worldEventStore.currentEvent.label }}</p>
                    <p class="mt-1 text-[0.625rem] text-muted">{{ worldEventStore.currentEvent.scope_label }} · {{ worldEventStore.currentEvent.season_label }}</p>
                  </div>
                  <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ worldEventStore.currentEvent.progress_text }}</span>
                </div>
                <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ worldEventStore.currentEvent.summary }}</p>
                <div class="mt-2 h-2 overflow-hidden border border-accent/10 bg-bg">
                  <div class="h-full bg-accent/70 transition-all" :style="{ width: `${worldEventStore.currentEvent.progress_percent}%` }" />
                </div>
                <p class="mt-2 text-[0.625rem] text-muted">
                  {{ worldEventStore.currentEvent.objective_label }} · {{ worldEventStore.currentEvent.progress_text }} · 基础回礼 {{ worldEventStore.currentEvent.reward_money_hint }} 铜钱起
                </p>
                <p v-if="worldEventStore.currentEvent.locked_reason" class="mt-1 text-[0.625rem] leading-4 text-warning">
                  {{ worldEventStore.currentEvent.locked_reason }}
                </p>
                <p v-else-if="worldEventStore.currentEvent.completion_text" class="mt-1 text-[0.625rem] leading-4 text-success">
                  {{ worldEventStore.currentEvent.completion_text }}
                </p>
              </div>

              <div v-if="worldEventStore.currentEvent.contribution_actions.length > 0" class="space-y-2">
                <p class="text-[0.625rem] text-muted">可提交贡献</p>
                <div class="grid gap-2 md:grid-cols-2">
                  <div
                    v-for="action in worldEventStore.currentEvent.contribution_actions"
                    :key="`${worldEventStore.currentEvent.id}-${action.id}`"
                    class="border border-accent/10 bg-black/10 p-2"
                  >
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <Button
                        class="online-action-btn online-action-btn--compact shrink-0"
                        :data-testid="`online-festival-world-contribute-${action.id}`"
                        :disabled="worldEventStore.actionRunning || !action.can_use"
                        @click="contributeWorldEventAction(worldEventStore.currentEvent.id, action.id)"
                      >
                        {{ action.label }}
                      </Button>
                      <p class="text-[0.625rem] leading-4 text-muted">{{ action.summary }}</p>
                    </div>
                    <p class="mt-2 text-[0.625rem] text-muted">工钱 {{ action.cost_money }} 铜钱 · 推进 {{ action.progress_delta }} 点</p>
                    <p v-if="!action.can_use && action.disabled_reason" class="mt-1 text-[0.625rem] text-muted">{{ action.disabled_reason }}</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">当前贡献榜</p>
                  <div v-if="worldEventStore.currentEvent.contributors.length === 0" class="mt-2 text-[0.625rem] text-muted">当前还没有人提交季节贡献。</div>
                  <div v-else class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    <p v-for="contributor in worldEventStore.currentEvent.contributors" :key="`${worldEventStore.currentEvent.id}-${contributor.username}`" class="text-[0.625rem] leading-4 text-muted">
                      {{ contributor.rank }}. {{ contributor.display_name }} · {{ contributor.progress_value }} 点 · {{ contributor.action_count }} 次
                    </p>
                  </div>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">我的季节记录</p>
                  <div v-if="!worldEventStore.currentEvent.my_contribution" class="mt-2 text-[0.625rem] text-muted">你本季还没有提交贡献。</div>
                  <div v-else class="mt-2 space-y-1.5">
                    <p class="text-[0.625rem] text-muted">当前排名：第 {{ worldEventStore.currentEvent.my_contribution.rank }} 名</p>
                    <p class="text-[0.625rem] text-muted">累计贡献：{{ worldEventStore.currentEvent.my_contribution.progress_value }} 点</p>
                    <p class="text-[0.625rem] text-muted">提交次数：{{ worldEventStore.currentEvent.my_contribution.action_count }} 次</p>
                    <p v-if="worldEventStore.currentEvent.my_contribution.last_action_label" class="text-[0.625rem] text-muted">
                      最近动作：{{ worldEventStore.currentEvent.my_contribution.last_action_label }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="mt-3 text-xs leading-5 text-muted">当前季节大事件还没有载入成功，可以刷新页面后再试。</p>
          </div>

          <div class="space-y-3">
            <div v-if="worldEventStore.publicGoal" class="game-panel-muted p-3">
              <p class="text-sm text-accent">公共目标</p>
              <p class="mt-2 text-[0.625rem] leading-5 text-muted">{{ worldEventStore.publicGoal.summary }}</p>
              <div class="mt-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ worldEventStore.publicGoal.label }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ worldEventStore.publicGoal.progress_text }}</p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ worldEventStore.publicGoal.phase_reward_label }}</span>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                <div class="h-full bg-accent/70 transition-all" :style="{ width: `${worldEventStore.publicGoal.progress_percent}%` }" />
              </div>
              <div v-if="worldEventStore.publicGoal.milestones.length > 0" class="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                <div v-for="milestone in worldEventStore.publicGoal.milestones" :key="milestone.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-[0.625rem] text-text">{{ milestone.label }}</p>
                    <span class="text-[0.625rem]" :class="milestone.reached ? 'text-success' : 'text-muted'">{{ milestone.progress_text }}</span>
                  </div>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ milestone.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">阶段奖励：{{ milestone.reward_label }}</p>
                </div>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <p class="text-sm text-accent">我的世界贡献</p>
              <p class="mt-2 text-[0.625rem] text-muted">累计贡献：{{ worldEventStore.overview?.total_contribution_points || 0 }} 点</p>
              <div v-if="worldEventStore.myRecords.length === 0" class="mt-2 text-xs leading-5 text-muted">当前账号还没有完成过四季大事件结算。</div>
              <div v-else class="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                <div v-for="record in worldEventStore.myRecords.slice(0, 4)" :key="record.record_id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ record.event_label }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">{{ record.season_label }} · 第 {{ record.rank }} 名</p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-success">+{{ record.reward_money }} 铜钱</span>
                  </div>
                  <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ record.reward_summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div class="game-panel-muted p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-accent">世界事件列表</p>
              <span class="text-[0.625rem] text-muted">{{ worldEventStore.worldEvents.length }} 条</span>
            </div>
            <p v-if="worldEventStore.worldEvents.length > 0" class="mt-2 text-[0.625rem] text-muted">
              当前可推进 {{ worldEventStore.currentWorldEvents.length }} 条作用域事件。
            </p>
            <div v-if="worldEventStore.worldEvents.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有载入其它世界事件。</div>
            <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="event in worldEventStore.worldEvents" :key="event.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="truncate text-xs text-text">{{ event.label }}</p>
                    <p class="mt-1 text-[0.625rem] text-muted">{{ event.scope_label }} · {{ event.state_label }}</p>
                  </div>
                  <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ event.progress_text }}</span>
                </div>
                <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ event.summary }}</p>
                <p class="mt-1 text-[0.625rem] text-muted">范围：{{ event.scope_value || event.scope_label }}</p>
                <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                  <div class="h-full bg-accent/70 transition-all" :style="{ width: `${event.progress_percent}%` }" />
                </div>
                <div v-if="event.contribution_actions.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    v-for="action in event.contribution_actions"
                    :key="`${event.id}-${action.id}`"
                    class="online-action-btn online-action-btn--compact"
                    :disabled="worldEventStore.actionRunning || !action.can_use"
                    @click="contributeWorldEventAction(event.id, action.id)"
                  >
                    {{ action.label }}
                  </Button>
                </div>
                <p v-if="event.locked_reason" class="mt-2 text-[0.625rem] leading-4 text-muted">{{ event.locked_reason }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">最近史册</p>
                <span class="text-[0.625rem] text-muted">{{ worldEventStore.recentAnnals.length }} 条</span>
              </div>
              <div v-if="worldEventStore.recentAnnals.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有完成并归档的四季大事件。</div>
              <div v-else class="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                <div v-for="annal in worldEventStore.recentAnnals" :key="annal.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ annal.event_label }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">{{ annal.season_label }} · {{ annal.cycle_key }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ annal.contributor_count }} 人</span>
                  </div>
                  <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ annal.summary }}</p>
                  <p v-if="annal.top_contributor_display_name" class="mt-1 text-[0.625rem] leading-4 text-muted">
                    领头贡献：{{ annal.top_contributor_display_name }}
                  </p>
                </div>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">世界纪年</p>
                <span class="text-[0.625rem] text-muted">{{ worldEventStore.recentChronicles.length }} 条</span>
              </div>
              <div v-if="worldEventStore.recentChronicles.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有生成世界纪年摘要。</div>
              <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                <div v-for="chronicle in worldEventStore.recentChronicles" :key="chronicle.cycle_key" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ chronicle.year }} 年 · {{ chronicle.cycle_key }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">
                        公共进度 {{ chronicle.public_goal_progress }} / {{ chronicle.public_goal_target }} · 已完成事件 {{ chronicle.total_completed_events }}
                      </p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ chronicle.total_contribution_points }} 点</span>
                  </div>
                  <p v-if="chronicle.annual_society_champion" class="mt-2 text-[0.625rem] leading-4 text-muted">
                    年度冠军村社：{{ chronicle.annual_society_champion.society_name }} · 贡献 {{ chronicle.annual_society_champion.contribution_score }}
                  </p>
                  <p v-if="chronicle.annal_summaries.length > 0" class="mt-1 text-[0.625rem] leading-4 text-muted">
                    世界史册：{{ chronicle.annal_summaries[0] }}
                  </p>
                  <p v-if="hasDivisionFirstCompletions(chronicle)" class="mt-1 text-[0.625rem] leading-4 text-muted">
                    分区首个完成者：{{ formatChronicleDivisionFirsts(chronicle) }}
                  </p>
                  <p v-if="chronicle.famous_manors.length > 0" class="mt-1 text-[0.625rem] leading-4 text-muted">
                    著名庄园：{{ formatChronicleFamousManors(chronicle) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'festival-room'" class="space-y-3">
        <div class="game-panel-muted p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">节会房间</p>
              <p class="mt-1 text-xs leading-5 text-muted">{{ festivalRoomStore.overview?.bulletin || '先从房间底座把创建、邀请、准备、倒计时和结算流程跑通。' }}</p>
            </div>
            <span class="shrink-0 text-[0.625rem] text-muted">{{ festivalRoomStore.loading ? '正在刷新' : '已载入房间摘要' }}</span>
          </div>
        </div>

        <div class="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_320px]" data-testid="online-festival-room-desktop-layout">
          <div class="space-y-3 xl:order-2" data-testid="online-festival-room-main-stage">
            <div class="game-panel-muted p-3" data-testid="online-festival-room-status-panel">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">我的节会状态</p>
                <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.myRoom ? festivalRoomStore.myRoom.state_label : '空闲中' }}</span>
              </div>
              <div v-if="festivalRoomStore.myRoom" class="mt-3 space-y-3" data-testid="online-festival-room-my-room">
                <OnlineVisualRoomShell
                  :title="festivalRoomStore.myRoom.title"
                  :subtitle="`${festivalRoomStore.myRoom.template_label} · ${festivalRoomStore.myRoom.gameplay.template_label} · ${festivalRoomStore.myRoom.joined_member_count}/${festivalRoomStore.myRoom.member_limit} 人`"
                  :status-label="festivalRoomStore.myRoom.state_label"
                  :phase-label="festivalRoomStore.myRoom.gameplay.phase_label"
                  :state-reason="festivalRoomStore.myRoom.state_reason"
                  :connection-state="festivalRoomConnectionState"
                  :conflict-message="festivalRoomConflictMessage"
                  :action-feedback="festivalRoomActionFeedback"
                  :error-messages="festivalRoomShellErrors"
                  :permission-hints="festivalRoomPermissionHints"
                  :focus-hints="festivalRoomFocusHints"
                  :visual-content-label="festivalRoomVisualContentLabel"
                  :fallback-entry-label="festivalRoomFallbackEntryLabel"
                  :fallback-entry-hint="festivalRoomFallbackEntryHint"
                  :fallback-entry-visible="festivalRoomFallbackActionsVisible"
                  :countdown-seconds="festivalRoomStore.myRoom.countdown_seconds"
                  :countdown-remaining-seconds="festivalRoomStore.myRoom.opening_ceremony?.countdown_remaining_seconds || 0"
                  :members="festivalRoomShellMembers"
                  :ready-member-count="festivalRoomStore.myRoom.ready_member_count"
                  :member-limit="festivalRoomStore.myRoom.member_limit"
                  :reward-preview="festivalRoomRewardPreview"
                  :settlement-records="festivalRoomSettlementRecords"
                >
                  <template #actions>
                    <Button
                      class="online-action-btn online-action-btn--primary min-h-[44px] justify-center"
                      data-testid="online-festival-room-lobby-trigger"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="openFestivalRoomLobby"
                    >
                      <UsersRound :size="14" aria-hidden="true" />
                      打开准备大厅
                    </Button>
                  </template>
                </OnlineVisualRoomShell>
                <OnlineTechnicalDetails
                  v-if="festivalRoomStore.myRoom.can_disconnect"
                  title="调试操作"
                  summary="网络异常测试入口默认收起，主流程请优先使用准备、倒计时和结算。"
                >
                  <Button class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="disconnectRoom(festivalRoomStore.myRoom.id)">
                    网络异常测试
                  </Button>
                </OnlineTechnicalDetails>
                <OnlineTechnicalDetails
                  v-if="festivalRoomBackupActionsVisible"
                  title="备用房间操作"
                  summary="旧准备、倒计时、结算和关闭入口保留为测试钩子；主流程请打开准备大厅。"
                >
                  <div class="grid gap-2 sm:grid-cols-2" data-testid="online-festival-room-lobby-backup-actions">
                    <Button
                      v-if="festivalRoomStore.myRoom.can_host_ready_check"
                      class="online-action-btn online-action-btn--compact justify-center"
                      data-testid="online-festival-room-ready-check-submit"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="startReadyCheck(festivalRoomStore.myRoom.id)"
                    >
                      开始准备
                    </Button>
                    <Button
                      v-if="festivalRoomStore.myRoom.can_ready"
                      class="online-action-btn online-action-btn--compact justify-center"
                      data-testid="online-festival-room-ready-submit"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="readyRoom(festivalRoomStore.myRoom.id)"
                    >
                      我已准备
                    </Button>
                    <Button v-if="festivalRoomStore.myRoom.can_unready" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="unreadyRoom(festivalRoomStore.myRoom.id)">
                      取消准备
                    </Button>
                    <Button
                      v-if="festivalRoomStore.myRoom.can_host_start_countdown"
                      class="online-action-btn online-action-btn--compact justify-center"
                      data-testid="online-festival-room-start-submit"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="startCountdown(festivalRoomStore.myRoom.id)"
                    >
                      开始倒计时
                    </Button>
                    <Button v-if="festivalRoomStore.myRoom.can_reconnect" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="reconnectRoom(festivalRoomStore.myRoom.id)">
                      恢复连接
                    </Button>
                    <Button
                      v-if="festivalRoomStore.myRoom.can_host_settle"
                      class="online-action-btn online-action-btn--compact justify-center"
                      data-testid="online-festival-room-settle-submit"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="openFestivalSettleConfirm"
                    >
                      进入结算
                    </Button>
                    <Button
                      v-if="festivalRoomStore.myRoom.can_host_close"
                      class="online-action-btn online-action-btn--compact justify-center"
                      data-testid="online-festival-room-close-submit"
                      :disabled="festivalRoomStore.actionRunning"
                      @click="openFestivalCloseConfirm"
                    >
                      {{ festivalRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
                    </Button>
                    <Button v-if="festivalRoomStore.myRoom.can_leave" class="online-action-btn online-action-btn--compact justify-center" :disabled="festivalRoomStore.actionRunning" @click="leaveRoom(festivalRoomStore.myRoom.id)">
                      离开房间
                    </Button>
                  </div>
                </OnlineTechnicalDetails>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ festivalRoomStore.myRoom.title }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">
                        {{ festivalRoomStore.myRoom.template_label }} · {{ festivalRoomStore.myRoom.gameplay.template_label }} · {{ festivalRoomStore.myRoom.joined_member_count }}/{{ festivalRoomStore.myRoom.member_limit }} 人
                      </p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ festivalRoomStore.myRoom.state_label }}</span>
                  </div>
                  <p v-if="festivalRoomStore.myRoom.state_reason" class="mt-1 text-[0.625rem] leading-4 text-warning">{{ festivalRoomStore.myRoom.state_reason }}</p>
                  <p v-if="festivalRoomStore.myRoom.opening_ceremony" class="mt-1 text-[0.625rem] leading-4 text-success">
                    {{ festivalRoomStore.myRoom.opening_ceremony.subtitle }}
                  </p>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ festivalRoomStore.myRoom.gameplay.template_label }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.myRoom.gameplay.template_summary }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ festivalRoomStore.myRoom.gameplay.phase_label }}</span>
                  </div>
                  <p class="mt-2 text-[0.625rem] text-muted">
                    {{ festivalRoomStore.myRoom.gameplay.progress_text }} · {{ festivalRoomStore.myRoom.gameplay.score_label }} {{ festivalRoomStore.myRoom.gameplay.score_value }}
                  </p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${festivalRoomStore.myRoom.gameplay.progress_percent}%` }" />
                  </div>
                  <p v-if="festivalRoomStore.myRoom.gameplay.last_action_summary" class="mt-2 text-[0.625rem] leading-4 text-success">
                    {{ festivalRoomStore.myRoom.gameplay.last_action_summary }}
                  </p>
                  <div v-if="festivalRoomStore.myRoom.gameplay.contributions.length > 0" class="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="contribution in festivalRoomStore.myRoom.gameplay.contributions"
                      :key="`${festivalRoomStore.myRoom.id}-${contribution.username}-gameplay`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ contribution.display_name }} · {{ contribution.action_count }} 次 · {{ contribution.progress_value }} 贡献
                    </span>
                  </div>
                </div>

                <div v-if="festivalRoomStore.myFestivalState" class="space-y-3 border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ festivalRoomStore.myFestivalState.round_text }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.current_event.summary }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-muted">压力 {{ festivalRoomStore.myFestivalState.pressure_text }}</span>
                  </div>
                  <div class="grid gap-2 md:grid-cols-2">
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-[0.625rem] text-muted">当前事件</p>
                      <p class="mt-1 text-xs text-text">{{ festivalRoomStore.myFestivalState.current_event.label }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.current_event.pressure_hint }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.current_event.resource_hint }}</p>
                    </div>
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-[0.625rem] text-muted">我的职责</p>
                      <template v-if="festivalRoomStore.myFestivalState.my_role">
                        <p class="mt-1 text-xs text-text">{{ festivalRoomStore.myFestivalState.my_role.role_label }}</p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.myFestivalState.my_role.role_summary }}</p>
                      </template>
                      <p v-else class="mt-1 text-[0.625rem] text-muted">加入房间后会显示本局职责。</p>
                    </div>
                  </div>
                  <div class="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="resource in festivalRoomStore.myFestivalState.team_resources"
                      :key="`${festivalRoomStore.myRoom.id}-${resource.id}`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ resource.text }}
                    </span>
                  </div>
                  <div v-if="festivalRoomStore.myFestivalState.role_assignments.length > 0" class="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="role in festivalRoomStore.myFestivalState.role_assignments"
                      :key="`${festivalRoomStore.myRoom.id}-${role.username}-festival-role`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ role.display_name }} · {{ role.role_label }}
                    </span>
                  </div>
                  <p v-if="festivalRoomStore.myFestivalState.recent_feedback" class="text-[0.625rem] leading-4 text-success">
                    {{ festivalRoomStore.myFestivalState.recent_feedback }}
                  </p>
                  <div v-if="festivalRoomStore.myFestivalState.round_log.length > 0" class="space-y-1">
                    <p class="text-[0.625rem] text-muted">回合记录</p>
                    <div class="max-h-28 space-y-1 overflow-y-auto pr-1">
                      <p
                        v-for="entry in festivalRoomStore.myFestivalState.round_log.slice(0, 6)"
                        :key="entry.id"
                        class="text-[0.625rem] leading-4 text-muted"
                      >
                        - {{ entry.summary }}
                      </p>
                    </div>
                  </div>
                </div>

                <VisualSceneBoard
                  v-if="showFestivalSceneBoard"
                  :objects="festivalSceneObjects"
                  :selected-object-id="selectedFestivalSceneObjectId"
                  :recent-feedback="festivalSceneFeedback"
                  :action-running="festivalRoomStore.actionRunning"
                  :action-labels="festivalSceneActionLabels"
                  @select-object="selectFestivalVisualObject"
                  @trigger-action="triggerFestivalVisualAction"
                />

                <VisualTrackBoard
                  v-if="showFestivalTrackBoard"
                  :tracks="festivalTracks"
                  :selected-track-id="selectedFestivalTrackId"
                  :selected-cell-id="selectedFestivalTrackCellId"
                  :recent-feedback="festivalTrackFeedback"
                  :action-running="festivalRoomStore.actionRunning"
                  :action-labels="festivalSceneActionLabels"
                  @select-cell="selectFestivalTrackCell"
                  @trigger-action="triggerFestivalTrackAction"
                />
                <div v-if="festivalVisualHighlights.length > 0" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">本局高光</p>
                  <div class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                    <p v-for="highlight in festivalVisualHighlights" :key="highlight.id" class="text-[0.625rem] leading-4 text-muted">
                      {{ highlight.label }} · {{ highlight.summary }}
                    </p>
                  </div>
                </div>

                <OnlineTechnicalDetails
                  v-if="festivalRoomFallbackActionsVisible"
                  title="旧节会按钮备用操作"
                  summary="当前没有可用的场景或赛道主行动，旧节会按钮保留为键盘和回归测试的备用操作。"
                  :default-open="true"
                >
                  <div class="grid gap-2 md:grid-cols-2" data-testid="online-festival-room-gameplay-backup-actions">
                    <div
                      v-for="action in festivalRoomStore.myRoom.gameplay.available_actions"
                      :key="`${festivalRoomStore.myRoom.id}-${action.id}`"
                      class="border border-accent/10 bg-black/10 p-2"
                    >
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <Button
                          class="online-action-btn online-action-btn--compact shrink-0"
                          :data-testid="`online-festival-room-gameplay-action-${action.id}`"
                          :disabled="festivalRoomStore.actionRunning || !action.can_use"
                          @click="playGameplayAction(festivalRoomStore.myRoom.id, action.id)"
                        >
                          {{ action.label }}
                        </Button>
                        <p class="text-[0.625rem] leading-4 text-muted">{{ action.summary }}</p>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-if="action.required_role_label" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {{ action.required_role_label }}
                        </span>
                        <span v-if="action.once_per_round" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          每回合一次
                        </span>
                        <span v-if="action.pressure_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {{ action.pressure_delta_text }}
                        </span>
                        <span v-if="action.resource_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {{ action.resource_delta_text }}
                        </span>
                      </div>
                      <p v-if="action.round_effect" class="mt-2 text-[0.625rem] leading-4 text-muted">{{ action.round_effect }}</p>
                      <p v-if="!action.can_use && action.disabled_reason" class="mt-1 text-[0.625rem] text-muted">{{ action.disabled_reason }}</p>
                    </div>
                  </div>
                </OnlineTechnicalDetails>

                <div v-if="festivalRoomStore.myRoom.settlement_receipts.length > 0" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">本房结算凭证</p>
                  <div class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    <div
                      v-for="receipt in festivalRoomStore.myRoom.settlement_receipts"
                      :key="receipt.id"
                      class="text-[0.625rem] leading-4 text-muted"
                    >
                      <p>{{ receipt.target_display_name }} · {{ receipt.status_label }} · {{ receipt.summary }}</p>
                      <div v-if="hasRouteReplay(receipt.route_replay)" class="mt-1 space-y-1 border-l border-accent/20 pl-2">
                        <p class="text-accent">{{ receipt.route_replay.title }}</p>
                        <p>{{ receipt.route_replay.summary }}</p>
                        <p v-if="routeReplayRouteText(receipt.route_replay)">路线：{{ routeReplayRouteText(receipt.route_replay) }}</p>
                        <p v-if="routeReplayRaceText(receipt.route_replay)">{{ routeReplayRaceText(receipt.route_replay) }}</p>
                        <div v-if="routeReplayRaceRankingRows(receipt.route_replay).length" data-testid="online-festival-dragon-boat-race-rankings" class="space-y-0.5 border-l border-accent/25 pl-2">
                          <p class="text-accent/90">赛道名次：{{ routeReplayRaceScaleText(receipt.route_replay) }}</p>
                          <p v-for="row in routeReplayRaceRankingRows(receipt.route_replay)" :key="`${receipt.id}-${row.id}`">
                            {{ row.rankLabel }} · {{ row.label }} · {{ row.positionText }} · {{ row.scoreText }} · {{ row.finishText }}
                          </p>
                        </div>
                        <div v-if="routeReplayMemoryRecords(receipt.route_replay).length" data-testid="online-festival-lantern-replay-memory-records" class="space-y-0.5 border-l border-warning/30 pl-2">
                          <p v-for="record in routeReplayMemoryRecords(receipt.route_replay)" :key="`${receipt.id}-${record.type}`">
                            {{ formatFestivalMemoryRecord(record) }}
                          </p>
                        </div>
                        <p v-if="routeReplayPeakText(receipt.route_replay)">{{ routeReplayPeakLabel(receipt.route_replay) }}：{{ routeReplayPeakText(receipt.route_replay) }}</p>
                        <p v-if="routeReplayComboText(receipt.route_replay)" data-testid="online-festival-expedition-receipt-combos">组合收益：{{ routeReplayComboText(receipt.route_replay) }}</p>
                        <p v-if="routeReplayWithdrawalText(receipt.route_replay)" data-testid="online-festival-expedition-receipt-withdrawal">提前收尾：{{ routeReplayWithdrawalText(receipt.route_replay) }}</p>
                        <p v-if="routeReplayCargoIntegrityText(receipt.route_replay)" data-testid="online-festival-escort-cargo-integrity">货物完整度：{{ routeReplayCargoIntegrityText(receipt.route_replay) }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-xs text-accent">邀请玩家</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">打开邀请面板，可批量输入并查看每位玩家的邀请结果。</p>
                    </div>
                    <Button
                      class="online-action-btn online-action-btn--primary min-h-[44px] justify-center"
                      data-testid="online-festival-room-invite-trigger"
                      :disabled="festivalRoomStore.actionRunning || festivalInviteSubmitting"
                      @click="openFestivalInvitePanel"
                    >
                      <UserPlus :size="14" aria-hidden="true" />
                      邀请玩家
                    </Button>
                  </div>
                </div>

                <OnlineTechnicalDetails
                  title="备用邀请表单"
                  summary="保留旧单人邀请入口和测试钩子，主流程请优先使用邀请面板。"
                >
                  <label class="block">
                    <span class="text-[0.625rem] text-muted">邀请玩家</span>
                    <div class="online-action-row mt-1">
                      <input
                        v-model="festivalRoomStore.draftInviteUsername"
                        class="online-input flex-1"
                        data-testid="online-festival-room-invite-username-input"
                        placeholder="输入用户名"
                      />
                      <Button
                        class="online-action-btn online-action-btn--primary"
                        data-testid="online-festival-room-invite-submit"
                        :disabled="festivalRoomStore.actionRunning"
                        @click="inviteMember(festivalRoomStore.myRoom.id)"
                      >
                        邀请
                      </Button>
                    </div>
                  </label>
                </OnlineTechnicalDetails>

              </div>
              <p v-else class="mt-3 text-xs leading-5 text-muted">当前没有进行中的节会房间。可以先处理邀请，或创建自己的节会房间。</p>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">待处理邀请</p>
                <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.invitedRooms.length }} 条</span>
              </div>
              <div v-if="festivalRoomStore.invitedRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有待处理的节会邀请。</div>
              <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                <div v-for="room in festivalRoomStore.invitedRooms" :key="room.id" class="border border-warning/15 bg-warning/5 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ room.title }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">{{ room.template_label }} · {{ room.gameplay.template_label }} · 房主 {{ room.host_display_name }}</p>
                    </div>
                    <Button class="online-action-btn online-action-btn--compact shrink-0" :disabled="festivalRoomStore.actionRunning || !room.can_join" @click="joinRoom(room.id)">
                      加入
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 xl:order-1" data-testid="online-festival-room-left-list">
            <div class="game-panel-muted p-3" data-testid="online-festival-room-create-entry">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">创建节会房间</p>
                <span class="text-[0.625rem] text-muted">向导创建</span>
              </div>
              <div class="mt-3 space-y-3">
                <Button
                  class="online-action-btn online-action-btn--primary min-h-[44px] w-full justify-center"
                  data-testid="online-room-create-trigger"
                  :disabled="festivalRoomStore.actionRunning"
                  @click="openFestivalRoomWizard"
                >
                  <Lamp :size="14" aria-hidden="true" />
                  创建节会房间
                </Button>
                <div class="border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-5 text-muted">
                  <p class="text-xs text-accent">当前草稿</p>
                  <p class="mt-1">
                    {{ festivalRoomStore.selectedTemplate?.label || '待选择房型' }} · {{ festivalRoomStore.selectedGameplayTemplate?.label || '待选择玩法' }} · {{ festivalRoomStore.normalizedDraftMemberLimit }} 人
                  </p>
                  <p v-if="festivalRoomStore.draftTitle.trim()" class="mt-1">标题：{{ festivalRoomStore.draftTitle }}</p>
                </div>
              </div>
            </div>

            <OnlineTechnicalDetails
              title="备用创建表单"
              summary="保留旧创建入口和测试钩子，主流程请优先使用创建向导。"
            >
              <div class="space-y-3" data-testid="online-festival-room-create-backup">
                <div class="flex flex-wrap gap-2">
                  <Button class="online-action-btn online-action-btn--compact w-fit" :disabled="festivalRoomStore.actionRunning" @click="selectLanternFairDraft">
                    <Lamp :size="13" aria-hidden="true" />
                    灯会共建
                  </Button>
                  <Button class="online-action-btn online-action-btn--compact w-fit" :disabled="festivalRoomStore.actionRunning" @click="selectDragonBoatDraft">
                    <Flag :size="13" aria-hidden="true" />
                    端午赛舟
                  </Button>
                </div>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">节会房型</span>
                  <select v-model="festivalRoomStore.selectedTemplateId" class="online-select mt-1" data-testid="online-festival-room-template-select">
                    <option v-for="template in festivalRoomStore.templates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="festivalRoomStore.selectedTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ festivalRoomStore.selectedTemplate.label }}</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.selectedTemplate.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">
                    人数范围：{{ festivalRoomStore.selectedTemplate.min_member_limit }}-{{ festivalRoomStore.selectedTemplate.max_member_limit }} 人
                  </p>
                  <p v-if="festivalRoomStore.recommendedGameplayTemplates.length > 0" class="mt-1 text-[0.625rem] text-muted">
                    推荐玩法：{{ festivalRoomStore.recommendedGameplayTemplates.map(template => template.label).join(' / ') }}
                  </p>
                </div>
                <div
                  v-if="selectedFestivalSceneAssetSpec"
                  class="border border-warning/20 bg-warning/5 p-2"
                  data-testid="online-festival-scene-asset-spec"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-accent">{{ selectedFestivalSceneAssetSpec.label }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ selectedFestivalSceneAssetSpec.firstScreenSignal }}</p>
                    </div>
                    <span class="shrink-0 text-[0.625rem] text-warning">现场素材</span>
                  </div>
                  <div class="mt-2 grid gap-1.5 sm:grid-cols-2" data-testid="online-festival-scene-clickable-assets">
                    <p
                      v-for="asset in selectedFestivalSceneClickableAssets"
                      :key="asset.id"
                      class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
                    >
                      <span class="text-text">{{ asset.label }}</span> · {{ asset.summary }}
                    </p>
                  </div>
                  <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-scene-collaboration-goal">
                    协作目标：{{ selectedFestivalSceneAssetSpec.collaborationGoal }}
                  </p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-scene-solo-fallback">
                    单人保底：{{ selectedFestivalSceneAssetSpec.soloFallbackGoal }}
                  </p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2" data-testid="online-festival-scene-catalog">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-accent">节会现场总览</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                        每个节会都先展示首屏现场、可点击物件、协作目标和单人保底，未接入房型只作为素材预备。
                      </p>
                    </div>
                    <span class="shrink-0 text-[0.625rem] text-warning">19.4</span>
                  </div>
                  <div class="mt-2 grid gap-2 lg:grid-cols-2">
                    <article
                      v-for="sceneSpec in festivalSceneAssetSpecs"
                      :key="sceneSpec.templateId"
                      class="border border-accent/10 bg-background/70 p-2"
                      :data-testid="`online-festival-scene-catalog-card-${sceneSpec.templateId}`"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="text-xs text-text">{{ sceneSpec.label }}</p>
                          <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-scene-first-screen">
                            {{ sceneSpec.firstScreenSignal }}
                          </p>
                        </div>
                        <span
                          class="shrink-0 border border-accent/10 px-1.5 py-0.5 text-[0.625rem] text-muted"
                          data-testid="online-festival-scene-template-status"
                        >
                          {{ isFestivalSceneLiveTemplate(sceneSpec.templateId) ? '已接入房型' : '素材预备' }}
                        </span>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5" data-testid="online-festival-scene-first-screen-assets">
                        <span
                          v-for="asset in festivalSceneFirstScreenAssets(sceneSpec)"
                          :key="asset.id"
                          class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] text-muted"
                        >
                          {{ asset.label }}
                        </span>
                      </div>
                      <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-scene-clickable-count">
                        可点击物件：{{ festivalSceneClickableCount(sceneSpec) }} 个
                      </p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-scene-catalog-collaboration">
                        协作目标：{{ sceneSpec.collaborationGoal }}
                      </p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-scene-catalog-solo">
                        单人保底：{{ sceneSpec.soloFallbackGoal }}
                      </p>
                    </article>
                  </div>
                </div>
                <div class="block">
                  <span class="text-[0.625rem] text-muted">人数上限</span>
                  <div class="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4" data-testid="online-festival-room-member-limit-group">
                    <button
                      v-for="limit in festivalRoomStore.memberLimitOptions"
                      :key="limit"
                      type="button"
                      class="online-action-btn online-action-btn--compact justify-center"
                      :class="{ 'online-action-btn--primary': festivalRoomStore.normalizedDraftMemberLimit === limit }"
                      :aria-pressed="festivalRoomStore.normalizedDraftMemberLimit === limit"
                      :data-testid="`online-festival-room-member-limit-${limit}`"
                      @click="festivalRoomStore.draftMemberLimit = limit"
                    >
                      {{ limit }} 人
                    </button>
                  </div>
                </div>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">玩法模板</span>
                  <select v-model="festivalRoomStore.selectedGameplayTemplateId" class="online-select mt-1" data-testid="online-festival-room-gameplay-select">
                    <option v-for="template in festivalRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="festivalRoomStore.selectedGameplayTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ festivalRoomStore.selectedGameplayTemplate.label }}</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ festivalRoomStore.selectedGameplayTemplate.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">
                    {{ festivalRoomStore.selectedGameplayTemplate.objective_label }} · 目标 {{ festivalRoomStore.selectedGameplayTemplate.default_target }}
                  </p>
                  <div v-if="festivalRoomStore.selectedGameplayTemplate.action_options.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                    <span
                      v-for="action in festivalRoomStore.selectedGameplayTemplate.action_options"
                      :key="action.id"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ action.label }}
                    </span>
                  </div>
                </div>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">房间标题</span>
                  <input
                    v-model="festivalRoomStore.draftTitle"
                    maxlength="30"
                    class="online-input mt-1"
                    data-testid="online-festival-room-title-input"
                    placeholder="例如：端午夜练舟"
                  />
                </label>
                <Button
                  class="online-action-btn online-action-btn--primary w-full justify-center"
                  data-testid="online-festival-room-create-submit"
                  :disabled="festivalRoomStore.actionRunning || !festivalRoomStore.selectedTemplate || !festivalRoomStore.selectedGameplayTemplate"
                  @click="createRoom"
                >
                  创建房间
                </Button>
              </div>
            </OnlineTechnicalDetails>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">可见房间</p>
                <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.visibleRooms.length }} 间</span>
              </div>
              <div v-if="festivalRoomStore.visibleRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有你能查看的节会房间。</div>
              <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                <div v-for="room in festivalRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ room.title }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">
                        {{ room.template_label }} · {{ room.gameplay.template_label }} · {{ room.state_label }} · {{ room.joined_member_count }}/{{ room.member_limit }} 人
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <span class="text-[0.625rem] text-muted">{{ room.ready_member_count }} 已准备</span>
                      <Button v-if="room.can_join" class="online-action-btn online-action-btn--compact" :disabled="festivalRoomStore.actionRunning" @click="joinRoom(room.id)">
                        加入
                      </Button>
                    </div>
                  </div>
                  <p class="mt-2 text-[0.625rem] text-muted">{{ room.gameplay.progress_text }} · {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${room.gameplay.progress_percent}%` }" />
                  </div>
                  <div v-if="room.members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="member in room.members"
                      :key="`${room.id}-${member.username}`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ member.display_name }} · {{ member.status_label }}
                    </span>
                  </div>
                  <div v-if="room.recent_events.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                    <p v-for="event in room.recent_events.slice(0, 4)" :key="event.id" class="text-[0.625rem] leading-4 text-muted">
                      - {{ event.summary }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 xl:order-3" data-testid="online-festival-room-right-status">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">房间状态侧栏</p>
                <span class="text-[0.625rem] text-muted">320px</span>
              </div>
              <div class="mt-3 space-y-2 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-room-desktop-status-summary">
                <p>当前房间：{{ festivalRoomStore.myRoom ? festivalRoomStore.myRoom.state_label : '空闲中' }}</p>
                <p>待处理邀请：{{ festivalRoomStore.invitedRooms.length }} 条</p>
                <p>可见房间：{{ festivalRoomStore.visibleRooms.length }} 间</p>
                <p>最近结算：{{ festivalRoomStore.recentReceipts.length }} 条</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">最近结算凭证</p>
            <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.recentReceipts.length }} 条</span>
          </div>
          <div v-if="festivalRoomStore.recentReceipts.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有节会房间结算凭证。</div>
          <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in festivalRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ receipt.room_title }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ receipt.template_label }} · 槽位 {{ receipt.target_slot + 1 }}</p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ receipt.status_label }}</span>
              </div>
              <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ receipt.summary }}</p>
              <div v-if="hasRouteReplay(receipt.route_replay)" class="mt-2 space-y-1 border-l border-accent/20 pl-2 text-[0.625rem] leading-4 text-muted">
                <p class="text-accent">{{ receipt.route_replay.title }}</p>
                <p>{{ receipt.route_replay.summary }}</p>
                <p v-if="routeReplayRouteText(receipt.route_replay)">路线：{{ routeReplayRouteText(receipt.route_replay) }}</p>
                <p v-if="routeReplayRaceText(receipt.route_replay)">{{ routeReplayRaceText(receipt.route_replay) }}</p>
                <div v-if="routeReplayRaceRankingRows(receipt.route_replay).length" data-testid="online-festival-dragon-boat-race-rankings" class="space-y-0.5 border-l border-accent/25 pl-2">
                  <p class="text-accent/90">赛道名次：{{ routeReplayRaceScaleText(receipt.route_replay) }}</p>
                  <p v-for="row in routeReplayRaceRankingRows(receipt.route_replay)" :key="`${receipt.id}-${row.id}`">
                    {{ row.rankLabel }} · {{ row.label }} · {{ row.positionText }} · {{ row.scoreText }} · {{ row.finishText }}
                  </p>
                </div>
                <div v-if="routeReplayMemoryRecords(receipt.route_replay).length" data-testid="online-festival-lantern-replay-memory-records" class="space-y-0.5 border-l border-warning/30 pl-2">
                  <p v-for="record in routeReplayMemoryRecords(receipt.route_replay)" :key="`${receipt.id}-${record.type}`">
                    {{ formatFestivalMemoryRecord(record) }}
                  </p>
                </div>
                <p v-if="routeReplayPeakText(receipt.route_replay)">{{ routeReplayPeakLabel(receipt.route_replay) }}：{{ routeReplayPeakText(receipt.route_replay) }}</p>
                <p v-if="routeReplayComboText(receipt.route_replay)" data-testid="online-festival-expedition-receipt-combos">组合收益：{{ routeReplayComboText(receipt.route_replay) }}</p>
                <p v-if="routeReplayWithdrawalText(receipt.route_replay)" data-testid="online-festival-expedition-receipt-withdrawal">提前收尾：{{ routeReplayWithdrawalText(receipt.route_replay) }}</p>
                <p v-if="routeReplayCargoIntegrityText(receipt.route_replay)" data-testid="online-festival-escort-cargo-integrity">货物完整度：{{ routeReplayCargoIntegrityText(receipt.route_replay) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'expedition-room'" class="space-y-3">
        <div class="game-panel-muted p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">远征房间</p>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ expeditionRoomStore.overview?.bulletin || '这一页承接远征房间、协作矿洞、组队采集、护送抵运和海域共探的最小闭环。' }}
              </p>
            </div>
            <span class="shrink-0 text-[0.625rem] text-muted">{{ expeditionRoomStore.loading ? '正在刷新' : '已载入远征摘要' }}</span>
          </div>
        </div>

        <div class="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_320px]" data-testid="online-expedition-room-desktop-layout">
          <div class="space-y-3 xl:order-2" data-testid="online-expedition-room-main-stage">
            <div class="game-panel-muted p-3" data-testid="online-expedition-room-status-panel">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">我的远征状态</p>
                <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : '空闲中' }}</span>
              </div>
              <div v-if="expeditionRoomStore.myRoom" class="mt-3 space-y-3" data-testid="online-expedition-room-my-room">
                <OnlineVisualRoomShell
                  :title="expeditionRoomStore.myRoom.title"
                  :subtitle="`${expeditionRoomStore.myRoom.template_label} · ${expeditionRoomStore.myRoom.gameplay.template_label} · ${expeditionRoomStore.myRoom.joined_member_count}/${expeditionRoomStore.myRoom.member_limit} 人`"
                  :status-label="expeditionRoomStore.myRoom.state_label"
                  :phase-label="expeditionRoomStore.myRoom.gameplay.phase_label"
                  :state-reason="expeditionRoomStore.myRoom.state_reason"
                  :connection-state="expeditionRoomConnectionState"
                  :conflict-message="expeditionRoomConflictMessage"
                  :action-feedback="expeditionRoomActionFeedback"
                  :error-messages="expeditionRoomShellErrors"
                  :permission-hints="expeditionRoomPermissionHints"
                  :focus-hints="expeditionRoomFocusHints"
                  :visual-content-label="expeditionRoomVisualContentLabel"
                  :fallback-entry-label="expeditionRoomFallbackEntryLabel"
                  :fallback-entry-hint="expeditionRoomFallbackEntryHint"
                  :fallback-entry-visible="showExpeditionFallbackActions"
                  :countdown-seconds="expeditionRoomStore.myRoom.countdown_seconds"
                  :countdown-remaining-seconds="expeditionRoomStore.myRoom.opening_ceremony?.countdown_remaining_seconds || 0"
                  :members="expeditionRoomShellMembers"
                  :ready-member-count="expeditionRoomStore.myRoom.ready_member_count"
                  :member-limit="expeditionRoomStore.myRoom.member_limit"
                  :reward-preview="expeditionRoomRewardPreview"
                  :settlement-records="expeditionRoomSettlementRecords"
                >
                  <template #actions>
                    <Button
                      class="online-action-btn online-action-btn--primary min-h-[44px] justify-center"
                      data-testid="online-expedition-room-lobby-trigger"
                      :disabled="expeditionRoomStore.actionRunning"
                      @click="openExpeditionRoomLobby"
                    >
                      <UsersRound :size="14" aria-hidden="true" />
                      打开准备大厅
                    </Button>
                  </template>
                </OnlineVisualRoomShell>

                <OnlineTechnicalDetails
                  v-if="expeditionRoomStore.myRoom.can_disconnect"
                  title="调试操作"
                  summary="网络异常测试入口默认收起，主流程请优先使用准备、倒计时和结算。"
                >
                  <Button
                    class="online-action-btn online-action-btn--compact justify-center"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="disconnectExpeditionRoom(expeditionRoomStore.myRoom.id)"
                  >
                    网络异常测试
                  </Button>
                </OnlineTechnicalDetails>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.title }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">
                        {{ expeditionRoomStore.myRoom.template_label }} · {{ expeditionRoomStore.myRoom.gameplay.template_label }} · {{ expeditionRoomStore.myRoom.joined_member_count }}/{{ expeditionRoomStore.myRoom.member_limit }} 人
                      </p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ expeditionRoomStore.myRoom.state_label }}</span>
                  </div>
                  <p v-if="expeditionRoomStore.myRoom.state_reason" class="mt-1 text-[0.625rem] leading-4 text-warning">{{ expeditionRoomStore.myRoom.state_reason }}</p>
                  <p v-if="expeditionRoomStore.myRoom.opening_ceremony" class="mt-1 text-[0.625rem] leading-4 text-success">
                    {{ expeditionRoomStore.myRoom.opening_ceremony.subtitle }}
                  </p>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.template_label }}</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.template_summary }}</p>
                    </div>
                    <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ expeditionRoomStore.myRoom.gameplay.phase_label }}</span>
                  </div>
                  <p class="mt-2 text-[0.625rem] text-muted">
                    {{ expeditionRoomStore.myRoom.gameplay.progress_text }} · {{ expeditionRoomStore.myRoom.gameplay.score_label }} {{ expeditionRoomStore.myRoom.gameplay.score_value }}
                  </p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${expeditionRoomStore.myRoom.gameplay.progress_percent}%` }" />
                  </div>
                  <p v-if="expeditionRoomStore.myRoom.gameplay.last_action_summary" class="mt-2 text-[0.625rem] leading-4 text-success">
                    {{ expeditionRoomStore.myRoom.gameplay.last_action_summary }}
                  </p>
                  <div v-if="expeditionRoomStore.myRoom.gameplay.contributions.length > 0" class="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="contribution in expeditionRoomStore.myRoom.gameplay.contributions"
                      :key="`${expeditionRoomStore.myRoom.id}-${contribution.username}-expedition-gameplay`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ contribution.display_name }} · {{ contribution.action_count }} 次 · {{ contribution.progress_value }} 贡献
                    </span>
                  </div>
                </div>

                <VisualMapBoard
                  v-if="showExpeditionMapBoard"
                  :nodes="expeditionVisualMapNodes"
                  :selected-node-id="selectedExpeditionVisualNodeId"
                  :current-node-id="expeditionRoomStore.myRoom.visual_state.selected_visual_id"
                  :revision="expeditionRoomStore.myRoom.visual_state.revision"
                  :recent-feedback="expeditionRoomStore.myRoom.visual_state.recent_feedback || expeditionRoomStore.myRoom.gameplay.cavern_state?.recent_feedback || ''"
                  :action-running="expeditionRoomStore.actionRunning"
                  :action-labels="expeditionVisualActionLabels"
                  @select-node="selectedExpeditionVisualNodeId = $event"
                  @trigger-action="triggerExpeditionVisualAction"
                />

                <VisualTrackBoard
                  v-if="showExpeditionTrackBoard"
                  :tracks="expeditionVisualTracks"
                  :selected-track-id="selectedExpeditionTrackId"
                  :selected-cell-id="selectedExpeditionTrackCellId"
                  :recent-feedback="expeditionRoomStore.myRoom.visual_state.recent_feedback || expeditionRoomStore.myRoom.gameplay.last_action_summary || ''"
                  :action-running="expeditionRoomStore.actionRunning"
                  :action-labels="expeditionVisualActionLabels"
                  @select-cell="selectExpeditionTrackCell"
                  @trigger-action="triggerExpeditionTrackAction"
                />

                <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state" class="space-y-3">
                  <div class="border border-accent/10 bg-black/10 p-2">
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div class="min-w-0">
                        <p class="truncate text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.round_text }}</p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.summary }}</p>
                      </div>
                      <span class="w-fit shrink-0 text-[0.625rem] text-warning">风险 {{ expeditionRoomStore.myRoom.gameplay.cavern_state.risk_text }}</span>
                    </div>
                    <div class="mt-2 grid gap-2 md:grid-cols-2">
                      <div class="border border-accent/10 bg-black/10 p-2">
                        <p class="text-[0.625rem] text-muted">事件卡</p>
                        <p class="mt-1 text-xs text-text">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.label }}</p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.risk_hint }}</p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.resource_hint }}</p>
                      </div>
                      <div class="border border-accent/10 bg-black/10 p-2">
                        <p class="text-[0.625rem] text-muted">我的职责</p>
                        <template v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.my_role">
                          <p class="mt-1 text-xs text-text">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_label }}</p>
                          <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_summary }}</p>
                        </template>
                        <p v-else class="mt-1 text-[0.625rem] text-muted">加入房间后会显示本局职责。</p>
                      </div>
                    </div>
                    <p v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback" class="mt-2 text-[0.625rem] leading-4 text-success">
                      {{ expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback }}
                    </p>
                    <div
                      v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records.length > 0 || expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_state === 'confirmed'"
                      class="mt-2 grid gap-2 md:grid-cols-2"
                    >
                      <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records.length > 0" data-testid="online-festival-expedition-cavern-combo-summary" class="border border-success/20 bg-success/5 p-2">
                        <p class="text-[0.625rem] text-success">节点组合收益</p>
                        <p
                          v-for="combo in expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records"
                          :key="`${expeditionRoomStore.myRoom.id}-${combo.combo_id}`"
                          class="mt-1 text-[0.625rem] leading-4 text-muted"
                        >
                          {{ combo.label }}：{{ combo.summary }} · 采集值 +{{ combo.score_delta }} · 风险 {{ formatSignedCavernDelta(combo.risk_delta) }}{{ combo.resource_delta_text ? ` · ${combo.resource_delta_text}` : '' }}
                        </p>
                      </div>
                      <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_state === 'confirmed'" data-testid="online-festival-expedition-cavern-withdrawal-summary" class="border border-warning/20 bg-warning/5 p-2">
                        <p class="text-[0.625rem] text-warning">提前收尾</p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                          {{ expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_summary || '撤离点已锁定，房主可以进入结算。' }}
                        </p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-expedition-cavern-withdrawal-locked-combos">
                          {{ cavernWithdrawalLockedComboLabel(expeditionRoomStore.myRoom.gameplay.cavern_state) }}
                        </p>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                          {{ cavernWithdrawalActorLabel(expeditionRoomStore.myRoom.gameplay.cavern_state) }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="grid gap-2 md:grid-cols-2">
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-xs text-accent">队伍资源</p>
                      <div class="mt-2 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto pr-1">
                        <div v-for="resource in expeditionRoomStore.myRoom.gameplay.cavern_state.team_resources" :key="resource.id" class="border border-accent/10 bg-black/10 p-2">
                          <p class="text-[0.625rem] text-accent">{{ resource.label }}</p>
                          <p class="mt-1 text-xs text-text">{{ resource.value }} / {{ resource.max_value }}</p>
                          <p class="mt-1 text-[0.625rem] text-muted">{{ resource.text }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="border border-accent/10 bg-black/10 p-2">
                      <p class="text-xs text-accent">职责分工</p>
                      <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.role_assignments.length === 0" class="mt-2 text-[0.625rem] text-muted">当前还没有完成队伍分工。</div>
                      <div v-else class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                        <div v-for="role in expeditionRoomStore.myRoom.gameplay.cavern_state.role_assignments" :key="`${expeditionRoomStore.myRoom.id}-${role.username}-role`" class="flex items-start justify-between gap-2">
                          <span class="min-w-0 truncate text-[0.625rem] text-text">{{ role.display_name }}</span>
                          <span class="shrink-0 text-[0.625rem] text-accent">{{ role.role_label }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.round_log.length > 0" class="border border-accent/10 bg-black/10 p-2">
                    <p class="text-xs text-accent">回合日志</p>
                    <div class="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                      <div v-for="entry in expeditionRoomStore.myRoom.gameplay.cavern_state.round_log.slice(0, 8)" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <p class="min-w-0 truncate text-[0.625rem] text-accent">第 {{ entry.round_number }} 回合 · {{ entry.action_label }}</p>
                          <span v-if="entry.role_label" class="shrink-0 text-[0.625rem] text-muted">{{ entry.role_label }}</span>
                        </div>
                        <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="showExpeditionFallbackActions" class="space-y-2">
                  <p class="text-[0.625rem] text-muted">玩法动作</p>
                  <div class="grid gap-2 md:grid-cols-2">
                    <div
                      v-for="action in expeditionRoomStore.myRoom.gameplay.available_actions"
                      :key="`${expeditionRoomStore.myRoom.id}-${action.id}`"
                      class="border border-accent/10 bg-black/10 p-2"
                    >
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <Button
                          class="online-action-btn online-action-btn--compact shrink-0"
                          :data-testid="`online-expedition-room-gameplay-action-${action.id}`"
                          :disabled="expeditionRoomStore.actionRunning || !action.can_use"
                          @click="playExpeditionGameplayAction(expeditionRoomStore.myRoom.id, action.id)"
                        >
                          {{ action.label }}
                        </Button>
                        <p class="text-[0.625rem] leading-4 text-muted">{{ action.summary }}</p>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-if="action.required_role_label" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {{ action.required_role_label }}
                        </span>
                        <span v-if="action.once_per_round" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          每回合一次
                        </span>
                        <span v-if="action.risk_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {{ action.risk_delta_text }}
                        </span>
                        <span v-if="action.resource_delta_text" class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {{ action.resource_delta_text }}
                        </span>
                      </div>
                      <p v-if="action.round_effect" class="mt-2 text-[0.625rem] leading-4 text-muted">{{ action.round_effect }}</p>
                      <p v-if="!action.can_use && action.disabled_reason" class="mt-1 text-[0.625rem] text-muted">{{ action.disabled_reason }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="expeditionRoomStore.myRoom.settlement_receipts.length > 0" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">本房结算凭证</p>
                  <div class="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    <p
                      v-for="receipt in expeditionRoomStore.myRoom.settlement_receipts"
                      :key="receipt.id"
                      class="text-[0.625rem] leading-4 text-muted"
                    >
                      {{ receipt.target_display_name }} · {{ receipt.status_label }} · {{ receipt.summary }}
                    </p>
                  </div>
                </div>

                <div class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0">
                      <p class="text-xs text-accent">邀请玩家</p>
                      <p class="mt-1 text-[0.625rem] leading-4 text-muted">打开邀请面板，可批量输入并查看每位玩家的邀请结果。</p>
                    </div>
                    <Button
                      class="online-action-btn online-action-btn--primary min-h-[44px] justify-center"
                      data-testid="online-expedition-room-invite-trigger"
                      :disabled="expeditionRoomStore.actionRunning || expeditionInviteSubmitting"
                      @click="openExpeditionInvitePanel"
                    >
                      <UserPlus :size="14" aria-hidden="true" />
                      邀请玩家
                    </Button>
                  </div>
                </div>

                <OnlineTechnicalDetails
                  title="备用邀请表单"
                  summary="保留旧远征单人邀请入口和测试钩子，主流程请优先使用邀请面板。"
                >
                  <label class="block">
                    <span class="text-[0.625rem] text-muted">邀请玩家</span>
                    <div class="online-action-row mt-1">
                      <input
                        v-model="expeditionRoomStore.draftInviteUsername"
                        class="online-input flex-1"
                        data-testid="online-expedition-room-invite-username-input"
                        placeholder="输入用户名"
                      />
                      <Button
                        class="online-action-btn online-action-btn--primary"
                        data-testid="online-expedition-room-invite-submit"
                        :disabled="expeditionRoomStore.actionRunning"
                        @click="inviteExpeditionMember(expeditionRoomStore.myRoom.id)"
                      >
                        邀请
                      </Button>
                    </div>
                  </label>
                </OnlineTechnicalDetails>

                <OnlineTechnicalDetails
                  v-if="expeditionRoomBackupActionsVisible"
                  title="备用房间操作"
                  summary="旧准备、倒计时、结算和关闭入口保留为测试钩子；主流程请打开准备大厅。"
                >
                  <div class="grid gap-2 sm:grid-cols-2" data-testid="online-expedition-room-lobby-backup-actions">
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_ready_check"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-ready-check-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="startExpeditionReadyCheck(expeditionRoomStore.myRoom.id)"
                  >
                    开始准备
                  </Button>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_ready"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-ready-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="readyExpeditionRoom(expeditionRoomStore.myRoom.id)"
                  >
                    我已准备
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_unready" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="unreadyExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    取消准备
                  </Button>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_start_countdown"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-start-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="startExpeditionCountdown(expeditionRoomStore.myRoom.id)"
                  >
                    开始倒计时
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_reconnect" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="reconnectExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    恢复连接
                  </Button>
                  <div
                    v-if="expeditionRoomStore.myRoom.can_host_settle"
                    class="flex"
                    data-testid="online-expedition-room-shell-settle-submit"
                    @click="openExpeditionSettleConfirm"
                  >
                    <Button
                      class="online-action-btn online-action-btn--compact w-full justify-center"
                      data-testid="online-expedition-room-settle-submit"
                      :disabled="expeditionRoomStore.actionRunning"
                      @click="openExpeditionSettleConfirm"
                    >
                      撤离并结算
                    </Button>
                  </div>
                  <Button
                    v-if="expeditionRoomStore.myRoom.can_host_close"
                    class="online-action-btn online-action-btn--compact justify-center"
                    data-testid="online-expedition-room-close-submit"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="openExpeditionCloseConfirm"
                  >
                    {{ expeditionRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
                  </Button>
                  <Button v-if="expeditionRoomStore.myRoom.can_leave" class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="leaveExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    离开房间
                  </Button>
                  </div>
                </OnlineTechnicalDetails>
                <OnlineTechnicalDetails
                  v-if="expeditionRoomStore.myRoom.can_disconnect"
                  title="调试操作"
                  summary="网络异常测试入口默认收起，备用操作区仍保留原远征按钮。"
                >
                  <Button class="online-action-btn online-action-btn--compact justify-center" :disabled="expeditionRoomStore.actionRunning" @click="disconnectExpeditionRoom(expeditionRoomStore.myRoom.id)">
                    网络异常测试
                  </Button>
                </OnlineTechnicalDetails>
              </div>
              <p v-else class="mt-3 text-xs leading-5 text-muted">当前没有进行中的远征房间。可以先处理邀请，或创建自己的远征房间。</p>
            </div>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">待处理邀请</p>
                <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.invitedRooms.length }} 条</span>
              </div>
              <div v-if="expeditionRoomStore.invitedRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有待处理的远征邀请。</div>
              <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                <div v-for="room in expeditionRoomStore.invitedRooms" :key="room.id" class="border border-warning/15 bg-warning/5 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-text">{{ room.title }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">{{ room.template_label }} · {{ room.gameplay.template_label }} · 房主 {{ room.host_display_name }}</p>
                    </div>
                    <Button class="online-action-btn online-action-btn--compact shrink-0" :disabled="expeditionRoomStore.actionRunning || !room.can_join" @click="joinExpeditionRoom(room.id)">
                      加入
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 xl:order-1" data-testid="online-expedition-room-left-list">
            <div class="game-panel-muted p-3" data-testid="online-expedition-room-create-entry">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">创建远征房间</p>
                <span class="text-[0.625rem] text-muted">向导创建</span>
              </div>
              <div class="mt-3 space-y-3">
                <Button
                  class="online-action-btn online-action-btn--primary min-h-[44px] w-full justify-center"
                  data-testid="online-expedition-room-create-trigger"
                  :disabled="expeditionRoomStore.actionRunning"
                  @click="openExpeditionRoomWizard"
                >
                  <Flag :size="14" aria-hidden="true" />
                  创建远征队伍
                </Button>
                <div class="border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-5 text-muted">
                  <p class="text-xs text-accent">当前草稿</p>
                  <p class="mt-1">
                    {{ expeditionRoomStore.selectedTemplate?.label || '待选择路线' }} · {{ expeditionRoomStore.selectedGameplayTemplate?.label || '待选择玩法' }} · {{ expeditionRoomStore.normalizedDraftMemberLimit }} 人
                  </p>
                  <p v-if="expeditionRoomStore.draftTitle.trim()" class="mt-1">标题：{{ expeditionRoomStore.draftTitle }}</p>
                </div>
              </div>
            </div>

            <OnlineTechnicalDetails
              title="备用创建表单"
              summary="保留旧远征创建入口和测试钩子，主流程请优先使用创建向导。"
            >
              <div class="space-y-3" data-testid="online-expedition-room-create-backup">
                <label class="block">
                  <span class="text-[0.625rem] text-muted">远征模板</span>
                  <select v-model="expeditionRoomStore.selectedTemplateId" class="online-select mt-1" data-testid="online-expedition-room-template-select">
                    <option v-for="template in expeditionRoomStore.templates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="expeditionRoomStore.selectedTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ expeditionRoomStore.selectedTemplate.label }}</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.selectedTemplate.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">默认人数上限：{{ expeditionRoomStore.selectedTemplate.default_member_limit }} 人</p>
                  <p v-if="expeditionRoomStore.recommendedGameplayTemplates.length > 0" class="mt-1 text-[0.625rem] text-muted">
                    推荐玩法：{{ expeditionRoomStore.recommendedGameplayTemplates.map(template => template.label).join(' / ') }}
                  </p>
                </div>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">玩法模板</span>
                  <select v-model="expeditionRoomStore.selectedGameplayTemplateId" class="online-select mt-1" data-testid="online-expedition-room-gameplay-select">
                    <option v-for="template in expeditionRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <div v-if="expeditionRoomStore.selectedGameplayTemplate" class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-xs text-accent">{{ expeditionRoomStore.selectedGameplayTemplate.label }}</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ expeditionRoomStore.selectedGameplayTemplate.summary }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">
                    {{ expeditionRoomStore.selectedGameplayTemplate.objective_label }} · 目标 {{ expeditionRoomStore.selectedGameplayTemplate.default_target }}
                  </p>
                  <div v-if="expeditionRoomStore.selectedGameplayTemplate.action_options.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                    <span
                      v-for="action in expeditionRoomStore.selectedGameplayTemplate.action_options"
                      :key="action.id"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ action.label }}
                    </span>
                  </div>
                </div>
                <label class="block">
                  <span class="text-[0.625rem] text-muted">房间标题</span>
                  <input
                    v-model="expeditionRoomStore.draftTitle"
                    maxlength="30"
                    class="online-input mt-1"
                    data-testid="online-expedition-room-title-input"
                    placeholder="例如：高地补给接力"
                  />
                </label>
                <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4" data-testid="online-expedition-room-member-limit-group">
                  <Button
                    v-for="limit in expeditionRoomStore.memberLimitOptions"
                    :key="limit"
                    class="online-action-btn online-action-btn--compact min-h-[44px] justify-center"
                    :class="expeditionRoomStore.draftMemberLimit === limit ? 'online-action-btn--primary' : ''"
                    :data-testid="`online-expedition-room-member-limit-${limit}`"
                    :disabled="expeditionRoomStore.actionRunning"
                    @click="expeditionRoomStore.draftMemberLimit = limit"
                  >
                    {{ limit }} 人
                  </Button>
                </div>
                <Button
                  class="online-action-btn online-action-btn--primary w-full justify-center"
                  data-testid="online-expedition-room-create-submit"
                  :disabled="expeditionRoomStore.actionRunning || !expeditionRoomStore.selectedTemplate || !expeditionRoomStore.selectedGameplayTemplate"
                  @click="createExpeditionRoom"
                >
                  创建远征房间
                </Button>
              </div>
            </OnlineTechnicalDetails>

            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">可见房间</p>
                <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.visibleRooms.length }} 间</span>
              </div>
              <div v-if="expeditionRoomStore.visibleRooms.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有你能查看的远征房间。</div>
              <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                <div v-for="room in expeditionRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ room.title }}</p>
                      <p class="mt-1 text-[0.625rem] text-muted">
                        {{ room.template_label }} · {{ room.gameplay.template_label }} · {{ room.state_label }} · {{ room.joined_member_count }}/{{ room.member_limit }} 人
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <span class="text-[0.625rem] text-muted">{{ room.ready_member_count }} 已准备</span>
                      <Button v-if="room.can_join" class="online-action-btn online-action-btn--compact" :disabled="expeditionRoomStore.actionRunning" @click="joinExpeditionRoom(room.id)">
                        加入
                      </Button>
                    </div>
                  </div>
                  <p class="mt-2 text-[0.625rem] text-muted">{{ room.gameplay.progress_text }} · {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
                  <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
                    <div class="h-full bg-accent/70 transition-all" :style="{ width: `${room.gameplay.progress_percent}%` }" />
                  </div>
                  <div v-if="room.members.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    <span
                      v-for="member in room.members"
                      :key="`${room.id}-${member.username}`"
                      class="border border-accent/15 px-1.5 py-0.5 text-[0.625rem] text-muted"
                    >
                      {{ member.display_name }} · {{ member.status_label }}
                    </span>
                  </div>
                  <div v-if="room.recent_events.length > 0" class="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                    <p v-for="event in room.recent_events.slice(0, 4)" :key="event.id" class="text-[0.625rem] leading-4 text-muted">
                      - {{ event.summary }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 xl:order-3" data-testid="online-expedition-room-right-status">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">远征状态侧栏</p>
                <span class="text-[0.625rem] text-muted">320px</span>
              </div>
              <div class="mt-3 space-y-2 text-[0.625rem] leading-4 text-muted" data-testid="online-expedition-room-desktop-status-summary">
                <p>当前房间：{{ expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : '空闲中' }}</p>
                <p>待处理邀请：{{ expeditionRoomStore.invitedRooms.length }} 条</p>
                <p>可见房间：{{ expeditionRoomStore.visibleRooms.length }} 间</p>
                <p>最近结算：{{ expeditionRoomStore.recentReceipts.length }} 条</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">最近结算凭证</p>
            <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.recentReceipts.length }} 条</span>
          </div>
          <div v-if="expeditionRoomStore.recentReceipts.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有远征房间结算凭证。</div>
          <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in expeditionRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ receipt.room_title }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ receipt.template_label }} · 槽位 {{ receipt.target_slot + 1 }}</p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem] text-accent">{{ receipt.status_label }}</span>
              </div>
              <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ receipt.summary }}</p>
              <div v-if="hasRouteReplay(receipt.route_replay)" class="mt-2 space-y-1 border-l border-accent/20 pl-2 text-[0.625rem] leading-4 text-muted">
                <p class="text-accent">{{ receipt.route_replay.title }}</p>
                <p>{{ receipt.route_replay.summary }}</p>
                <p v-if="routeReplayRouteText(receipt.route_replay)">路线：{{ routeReplayRouteText(receipt.route_replay) }}</p>
                <p v-if="routeReplayRaceText(receipt.route_replay)">{{ routeReplayRaceText(receipt.route_replay) }}</p>
                <div v-if="routeReplayRaceRankingRows(receipt.route_replay).length" data-testid="online-festival-dragon-boat-race-rankings" class="space-y-0.5 border-l border-accent/25 pl-2">
                  <p class="text-accent/90">赛道名次：{{ routeReplayRaceScaleText(receipt.route_replay) }}</p>
                  <p v-for="row in routeReplayRaceRankingRows(receipt.route_replay)" :key="`${receipt.id}-${row.id}`">
                    {{ row.rankLabel }} · {{ row.label }} · {{ row.positionText }} · {{ row.scoreText }} · {{ row.finishText }}
                  </p>
                </div>
                <p v-if="routeReplayPeakText(receipt.route_replay)">{{ routeReplayPeakLabel(receipt.route_replay) }}：{{ routeReplayPeakText(receipt.route_replay) }}</p>
                <p v-if="routeReplayComboText(receipt.route_replay)" data-testid="online-festival-expedition-receipt-combos">组合收益：{{ routeReplayComboText(receipt.route_replay) }}</p>
                <p v-if="routeReplayWithdrawalText(receipt.route_replay)" data-testid="online-festival-expedition-receipt-withdrawal">提前收尾：{{ routeReplayWithdrawalText(receipt.route_replay) }}</p>
                <p v-if="routeReplayCargoIntegrityText(receipt.route_replay)" data-testid="online-festival-escort-cargo-integrity">货物完整度：{{ routeReplayCargoIntegrityText(receipt.route_replay) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-2">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">节会纪念</p>
            <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.recentMemorials.length }} 条</span>
          </div>
          <div v-if="festivalRoomStore.recentMemorials.length === 0" class="mt-3 text-xs text-muted">当前没有节会纪念记录。</div>
          <div v-else class="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            <div
              v-for="memorial in festivalRoomStore.recentMemorials.slice(0, 6)"
              :key="memorial.memorial_id"
              class="border border-accent/10 bg-black/10 p-2"
              :data-testid="`online-festival-memorial-card-${memorial.memorial_id}`"
            >
              <p class="truncate text-xs text-accent">{{ memorial.label }}</p>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ memorial.template_label }} · {{ memorial.gameplay_template_label }}</p>
              <p class="mt-1 text-[0.625rem] text-muted">{{ memorial.reward_summary }}</p>
              <p v-if="memorial.photo_line" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-memorial-photo-line">纪念留影：{{ memorial.photo_line }}</p>
              <p v-if="festivalMemorySummaryText(memorial.memory_record_summary)" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-lantern-memory-summary">灯会回看摘要：{{ festivalMemorySummaryText(memorial.memory_record_summary) }}</p>
              <div v-if="festivalMemoryRecords(memorial.memory_records).length" data-testid="online-festival-lantern-memorial-memory-records" class="mt-1 space-y-0.5 border-l border-accent/20 pl-2 text-[0.625rem] leading-4 text-muted">
                <p
                  v-for="record in festivalMemoryRecords(memorial.memory_records)"
                  :key="`${memorial.memorial_id}-${record.type}`"
                  :data-testid="`online-festival-lantern-memorial-memory-record-${record.type}`"
                >
                  {{ formatFestivalMemoryRecord(record) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">好友灯会回看</p>
            <span class="text-[0.625rem] text-muted">{{ festivalRoomStore.friendMemorials.length }} 条</span>
          </div>
          <div class="online-action-row mt-3">
            <input
              v-model="festivalRoomStore.draftFriendMemorialUsername"
              class="online-input flex-1"
              data-testid="online-festival-friend-memorial-username-input"
              placeholder="好友用户名"
            >
            <Button
              class="online-action-btn online-action-btn--compact justify-center"
              data-testid="online-festival-friend-memorial-submit"
              :disabled="festivalRoomStore.actionRunning"
              @click="loadFriendMemorials"
            >
              查看
            </Button>
          </div>
          <p v-if="festivalRoomStore.friendMemorialOverview" class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-friend-memorial-overview">
            {{ festivalRoomStore.friendMemorialOverview.target_display_name || festivalRoomStore.friendMemorialOverview.target_username }} · {{ festivalRoomStore.friendMemorialOverview.is_self ? '自己的纪念册' : '好友纪念册' }}
          </p>
          <p v-if="festivalRoomStore.friendMemorialOverview?.friend_replay_summary?.summary" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-friend-replay-summary">
            好友回看摘要：{{ formatFestivalFriendReplaySummary(festivalRoomStore.friendMemorialOverview.friend_replay_summary) }}
          </p>
          <div v-if="festivalRoomStore.friendMemorials.length === 0" class="mt-3 text-xs text-muted">当前没有可回看的好友灯会纪念。</div>
          <div v-else class="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            <div
              v-for="memorial in festivalRoomStore.friendMemorials.slice(0, 6)"
              :key="`friend-${memorial.memorial_id}`"
              class="border border-accent/10 bg-black/10 p-2"
              :data-testid="`online-festival-friend-memorial-card-${memorial.memorial_id}`"
            >
              <p class="truncate text-xs text-accent">{{ memorial.label }}</p>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ memorial.template_label }} · {{ memorial.gameplay_template_label }}</p>
              <p v-if="memorial.photo_line" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-friend-photo-line">纪念留影：{{ memorial.photo_line }}</p>
              <p v-if="festivalMemorySummaryText(memorial.memory_record_summary)" class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-festival-friend-memory-summary">灯会回看摘要：{{ festivalMemorySummaryText(memorial.memory_record_summary) }}</p>
              <div v-if="festivalMemoryRecords(memorial.memory_records).length" data-testid="online-festival-friend-lantern-memory-records" class="mt-1 space-y-0.5 border-l border-accent/20 pl-2 text-[0.625rem] leading-4 text-muted">
                <p
                  v-for="record in festivalMemoryRecords(memorial.memory_records)"
                  :key="`friend-${memorial.memorial_id}-${record.type}`"
                  :data-testid="`online-festival-friend-lantern-memory-record-${record.type}`"
                >
                  {{ formatFestivalMemoryRecord(record) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">最近结算凭证</p>
            <span class="text-[0.625rem] text-muted">{{ recentReceiptCards.length }} 条</span>
          </div>
          <div v-if="recentReceiptCards.length === 0" class="mt-3 text-xs text-muted">当前没有节会或远征结算凭证。</div>
          <div v-else class="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="receipt in recentReceiptCards" :key="receipt.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ receipt.roomTitle }}</p>
                  <p class="mt-1 text-[0.625rem] text-muted">{{ receipt.domainLabel }} · {{ receipt.templateLabel }}</p>
                </div>
                <span class="w-fit shrink-0 text-[0.625rem] text-muted">{{ receipt.statusLabel }}</span>
              </div>
              <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ receipt.summary }}</p>
              <div v-if="hasRouteReplay(receipt.routeReplay)" class="mt-2 space-y-1 border-l border-accent/20 pl-2 text-[0.625rem] leading-4 text-muted">
                <p class="text-accent">{{ receipt.routeReplay.title }}</p>
                <p>{{ receipt.routeReplay.summary }}</p>
                <p v-if="routeReplayRouteText(receipt.routeReplay)">路线：{{ routeReplayRouteText(receipt.routeReplay) }}</p>
                <p v-if="routeReplayRaceText(receipt.routeReplay)">{{ routeReplayRaceText(receipt.routeReplay) }}</p>
                <div v-if="routeReplayRaceRankingRows(receipt.routeReplay).length" data-testid="online-festival-dragon-boat-race-rankings" class="space-y-0.5 border-l border-accent/25 pl-2">
                  <p class="text-accent/90">赛道名次：{{ routeReplayRaceScaleText(receipt.routeReplay) }}</p>
                  <p v-for="row in routeReplayRaceRankingRows(receipt.routeReplay)" :key="`${receipt.id}-${row.id}`">
                    {{ row.rankLabel }} · {{ row.label }} · {{ row.positionText }} · {{ row.scoreText }} · {{ row.finishText }}
                  </p>
                </div>
                <div v-if="routeReplayMemoryRecords(receipt.routeReplay).length" data-testid="online-festival-lantern-replay-memory-records" class="space-y-0.5 border-l border-warning/30 pl-2">
                  <p v-for="record in routeReplayMemoryRecords(receipt.routeReplay)" :key="`${receipt.id}-${record.type}`">
                    {{ formatFestivalMemoryRecord(record) }}
                  </p>
                </div>
                <p v-if="routeReplayPeakText(receipt.routeReplay)">{{ routeReplayPeakLabel(receipt.routeReplay) }}：{{ routeReplayPeakText(receipt.routeReplay) }}</p>
                <p v-if="routeReplayComboText(receipt.routeReplay)" data-testid="online-festival-expedition-receipt-combos">组合收益：{{ routeReplayComboText(receipt.routeReplay) }}</p>
                <p v-if="routeReplayWithdrawalText(receipt.routeReplay)" data-testid="online-festival-expedition-receipt-withdrawal">提前收尾：{{ routeReplayWithdrawalText(receipt.routeReplay) }}</p>
                <p v-if="routeReplayCargoIntegrityText(receipt.routeReplay)" data-testid="online-festival-escort-cargo-integrity">货物完整度：{{ routeReplayCargoIntegrityText(receipt.routeReplay) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <OnlineRoomWizard
      :open="showFestivalRoomWizard"
      domain="festival"
      :initial-template-id="festivalRoomStore.selectedTemplateId"
      :initial-gameplay-id="festivalRoomStore.selectedGameplayTemplateId"
      :initial-member-limit="festivalRoomStore.normalizedDraftMemberLimit"
      :initial-title="festivalRoomStore.draftTitle"
      initial-visibility="public"
      :templates="festivalRoomStore.templates"
      :gameplay-templates="festivalRoomStore.gameplayTemplates"
      :member-limit-options="festivalRoomStore.memberLimitOptions"
      :busy="festivalRoomStore.actionRunning"
      :error-message="festivalRoomStore.errorMessage"
      @submit="submitFestivalRoomWizard"
      @cancel="closeFestivalRoomWizard"
      @close="closeFestivalRoomWizard"
      @draft-change="syncFestivalRoomWizardDraft"
    />

    <OnlineRoomWizard
      :open="showExpeditionRoomWizard"
      domain="expedition"
      :initial-template-id="expeditionRoomStore.selectedTemplateId"
      :initial-gameplay-id="expeditionRoomStore.selectedGameplayTemplateId"
      :initial-member-limit="expeditionRoomStore.normalizedDraftMemberLimit"
      :initial-title="expeditionRoomStore.draftTitle"
      initial-visibility="public"
      :templates="expeditionRoomStore.templates"
      :gameplay-templates="expeditionRoomStore.gameplayTemplates"
      :member-limit-options="expeditionRoomStore.memberLimitOptions"
      :busy="expeditionRoomStore.actionRunning"
      :error-message="expeditionRoomStore.errorMessage"
      @submit="submitExpeditionRoomWizard"
      @cancel="closeExpeditionRoomWizard"
      @close="closeExpeditionRoomWizard"
      @draft-change="syncExpeditionRoomWizardDraft"
    />

    <OnlineInvitePanel
      :open="showFestivalInvitePanel"
      domain="festival"
      title="邀请玩家加入节会房"
      description="可以一次输入多个玩家；发送后会逐项显示成功或失败。"
      :existing-members="festivalInviteExistingMembers"
      :results="festivalInviteResults"
      :busy="festivalRoomStore.actionRunning || festivalInviteSubmitting"
      @invite="submitFestivalInvites"
      @retry="retryFestivalInvite"
      @remove="removeFestivalInviteResult"
      @close="closeFestivalInvitePanel"
    />

    <OnlineRoomLobbyDialog
      :open="showFestivalRoomLobby"
      domain="festival"
      :room="festivalLobbyRoom"
      :current-user-id="festivalLobbyCurrentUserId"
      :busy-action="festivalRoomStore.actionRunning"
      :last-feedback="festivalLobbyLastFeedback"
      @invite="openFestivalInvitePanel"
      @ready="handleFestivalLobbyReady"
      @unready="handleFestivalLobbyUnready"
      @start-ready-check="handleFestivalLobbyStartReadyCheck"
      @start-countdown="handleFestivalLobbyStartCountdown"
      @settle="handleFestivalLobbySettle"
      @cancel-room="handleFestivalLobbyCloseRoom"
      @leave-room="handleFestivalLobbyLeaveRoom"
      @accept-invite="handleFestivalLobbyAcceptInvite"
      @reconnect="handleFestivalLobbyReconnect"
      @view-countdown="openFestivalRoomLobby"
      @enter-gameplay="closeFestivalRoomLobby"
      @view-members="openFestivalRoomLobby"
      @view-objective="closeFestivalRoomLobby"
      @view-settlement="closeFestivalRoomLobby"
      @view-record="closeFestivalRoomLobby"
      @return-lobby="closeFestivalRoomLobby"
      @notify-members="openFestivalInvitePanel"
      @retry-settle="handleFestivalLobbySettle"
      @rematch="openFestivalRoomWizard"
      @close="closeFestivalRoomLobby"
    />

    <OnlineRoomLobbyDialog
      :open="showExpeditionRoomLobby"
      domain="expedition"
      :room="expeditionLobbyRoom"
      :current-user-id="expeditionLobbyCurrentUserId"
      :busy-action="expeditionRoomStore.actionRunning"
      :last-feedback="expeditionLobbyLastFeedback"
      @invite="openExpeditionInvitePanel"
      @ready="handleExpeditionLobbyReady"
      @unready="handleExpeditionLobbyUnready"
      @start-ready-check="handleExpeditionLobbyStartReadyCheck"
      @start-countdown="handleExpeditionLobbyStartCountdown"
      @settle="handleExpeditionLobbySettle"
      @cancel-room="handleExpeditionLobbyCloseRoom"
      @leave-room="handleExpeditionLobbyLeaveRoom"
      @accept-invite="handleExpeditionLobbyAcceptInvite"
      @reconnect="handleExpeditionLobbyReconnect"
      @view-countdown="openExpeditionRoomLobby"
      @enter-gameplay="closeExpeditionRoomLobby"
      @view-members="openExpeditionRoomLobby"
      @view-objective="closeExpeditionRoomLobby"
      @view-settlement="closeExpeditionRoomLobby"
      @view-record="closeExpeditionRoomLobby"
      @return-lobby="closeExpeditionRoomLobby"
      @notify-members="openExpeditionInvitePanel"
      @retry-settle="handleExpeditionLobbySettle"
      @rematch="openExpeditionRoomWizard"
      @close="closeExpeditionRoomLobby"
    />

    <div v-if="showFestivalSettleConfirm" class="contents" data-testid="online-room-settle-confirm">
      <OnlineConfirmActionDialog
        :open="showFestivalSettleConfirm"
        title="确认节会结算"
        :description="festivalSettleConfirmDescription"
        :impact-items="festivalSettleImpactItems"
        :asset-changes="festivalSettleAssetChanges"
        confirm-label="确认结算"
        cancel-label="返回房间"
        :running="festivalRoomStore.actionRunning"
        :recovery-hint="festivalSettleRecoveryHint"
        @confirm="confirmFestivalSettle"
        @cancel="closeFestivalConfirmDialog"
        @close="closeFestivalConfirmDialog"
      />
    </div>

    <div v-if="showFestivalCloseConfirm" class="contents" data-testid="online-room-close-confirm">
      <OnlineConfirmActionDialog
        :open="showFestivalCloseConfirm"
        :title="festivalCloseConfirmTitle"
        :description="festivalCloseConfirmDescription"
        :impact-items="festivalCloseImpactItems"
        :asset-changes="festivalCloseAssetChanges"
        :irreversible="true"
        :require-text="festivalCloseRequireText"
        :confirm-label="festivalCloseConfirmLabel"
        cancel-label="返回房间"
        :running="festivalRoomStore.actionRunning"
        :recovery-hint="festivalCloseRecoveryHint"
        @confirm="confirmFestivalCloseRoom"
        @cancel="closeFestivalConfirmDialog"
        @close="closeFestivalConfirmDialog"
      />
    </div>

    <div v-if="showExpeditionSettleConfirm" class="contents" data-testid="online-expedition-room-settle-confirm">
      <OnlineConfirmActionDialog
        :open="showExpeditionSettleConfirm"
        title="确认远征结算"
        :description="expeditionSettleConfirmDescription"
        :impact-items="expeditionSettleImpactItems"
        :asset-changes="expeditionSettleAssetChanges"
        confirm-label="确认结算"
        cancel-label="返回房间"
        :running="expeditionRoomStore.actionRunning"
        :recovery-hint="expeditionSettleRecoveryHint"
        @confirm="confirmExpeditionSettle"
        @cancel="closeExpeditionConfirmDialog"
        @close="closeExpeditionConfirmDialog"
      />
    </div>

    <div v-if="showExpeditionCloseConfirm" class="contents" data-testid="online-expedition-room-close-confirm">
      <OnlineConfirmActionDialog
        :open="showExpeditionCloseConfirm"
        :title="expeditionCloseConfirmTitle"
        :description="expeditionCloseConfirmDescription"
        :impact-items="expeditionCloseImpactItems"
        :asset-changes="expeditionCloseAssetChanges"
        :irreversible="true"
        :require-text="expeditionCloseRequireText"
        :confirm-label="expeditionCloseConfirmLabel"
        cancel-label="返回房间"
        :running="expeditionRoomStore.actionRunning"
        :recovery-hint="expeditionCloseRecoveryHint"
        @confirm="confirmExpeditionCloseRoom"
        @cancel="closeExpeditionConfirmDialog"
        @close="closeExpeditionConfirmDialog"
      />
    </div>

    <OnlineInvitePanel
      :open="showExpeditionInvitePanel"
      domain="expedition"
      title="邀请玩家加入远征队伍"
      description="可以一次输入多个玩家；发送后会逐项显示成功或失败。"
      :existing-members="expeditionInviteExistingMembers"
      :results="expeditionInviteResults"
      :busy="expeditionRoomStore.actionRunning || expeditionInviteSubmitting"
      @invite="submitExpeditionInvites"
      @retry="retryExpeditionInvite"
      @remove="removeExpeditionInviteResult"
      @close="closeExpeditionInvitePanel"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { CalendarDays, Flag, Lamp, UserPlus, UsersRound } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import OnlineConfirmActionDialog from '@/components/game/online/OnlineConfirmActionDialog.vue'
  import OnlineInvitePanel, { type OnlineInviteResult } from '@/components/game/online/OnlineInvitePanel.vue'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import OnlineRoomLobbyDialog, { type OnlineRoomLobbyRoom } from '@/components/game/online/OnlineRoomLobbyDialog.vue'
  import OnlineRoomWizard, { type OnlineRoomWizardDraft } from '@/components/game/online/OnlineRoomWizard.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import OnlineVisualRoomShell from '@/components/game/online/OnlineVisualRoomShell.vue'
  import VisualMapBoard from '@/components/game/online/VisualMapBoard.vue'
  import VisualSceneBoard from '@/components/game/online/VisualSceneBoard.vue'
  import VisualTrackBoard from '@/components/game/online/VisualTrackBoard.vue'
  import {
    ONLINE_FESTIVAL_SCENE_ASSET_SPECS,
    getOnlineFestivalSceneAssetSpec,
    type OnlineFestivalSceneAssetSpec,
  } from '@/data/onlineFestivalSceneAssets'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useWorldEventStore } from '@/stores/useWorldEventStore'
  import type { OnlineVisualNode, OnlineVisualObject, OnlineVisualTrack } from '@/types/onlineVisual'
  import type { ExpeditionCavernComboRecordSnapshot, ExpeditionCavernStateSnapshot, ExpeditionRoomRouteReplay } from '@/utils/expeditionRoomApi'
  import type { FestivalFriendReplaySummary, FestivalMemoryRecordSummary, FestivalRoomRouteReplay, FestivalRoomRouteReplayMemoryRecord } from '@/utils/festivalRoomApi'
  import type { WorldEventOverview } from '@/utils/worldEventApi'

  type FestivalTabKey = 'world' | 'festival-room' | 'expedition-room' | 'memorials'
  type FestivalTabMeta = { key: FestivalTabKey; label: string; summary: string }
  type ActivityRouteReplay = FestivalRoomRouteReplay | ExpeditionRoomRouteReplay
  type ReceiptCard = {
    id: string
    roomTitle: string
    templateLabel: string
    domainLabel: string
    statusLabel: string
    summary: string
    routeReplay: ActivityRouteReplay
  }

  const route = useRoute()
  const worldEventStore = useWorldEventStore()
  const festivalRoomStore = useFestivalRoomStore()
  const expeditionRoomStore = useExpeditionRoomStore()
  const festivalSceneAssetSpecs = ONLINE_FESTIVAL_SCENE_ASSET_SPECS
  const selectedFestivalSceneAssetSpec = computed(() =>
    getOnlineFestivalSceneAssetSpec(festivalRoomStore.selectedTemplateId)
  )
  const selectedFestivalSceneClickableAssets = computed(() =>
    selectedFestivalSceneAssetSpec.value?.assets.filter(asset => asset.clickable) ?? []
  )
  const festivalSceneTemplateIds = computed(() =>
    new Set(festivalRoomStore.templates.map(template => template.id))
  )
  const isFestivalSceneLiveTemplate = (templateId: string) =>
    festivalSceneTemplateIds.value.has(templateId)
  const festivalSceneClickableCount = (sceneSpec: OnlineFestivalSceneAssetSpec) =>
    sceneSpec.assets.filter(asset => asset.clickable).length
  const festivalSceneFirstScreenAssets = (sceneSpec: OnlineFestivalSceneAssetSpec) =>
    sceneSpec.assets.filter(asset => asset.firstScreen)
  type ChronicleSnapshot = WorldEventOverview['recent_chronicles'][number]
  type FestivalVisualActionPayload = { objectId: string; actionId: string }
  type FestivalTrackCellPayload = { trackId: string; cellId: string }
  type FestivalTrackActionPayload = FestivalTrackCellPayload & { actionId: string }

  const hasDivisionFirstCompletions = (chronicle: ChronicleSnapshot) =>
    Object.keys(chronicle.first_completed_divisions || {}).length > 0
  const formatChronicleDivisionFirsts = (chronicle: ChronicleSnapshot) =>
    Object.entries(chronicle.first_completed_divisions || {})
      .slice(0, 2)
      .map(([divisionLabel, entry]) => `${divisionLabel} - ${entry.top_contributor_display_name || '待记录'}`)
      .join(' / ')
  const formatChronicleFamousManors = (chronicle: ChronicleSnapshot) =>
    chronicle.famous_manors.map(manor => `${manor.display_name}（${manor.favorite_count} 收藏）`).join('、')

  const tabs: FestivalTabMeta[] = [
    { key: 'world', label: '世界事件', summary: '查看当前季节大事件、公共目标和世界纪年入口。' },
    { key: 'festival-room', label: '节会房间', summary: '创建节会房间，处理邀请、ready、玩法动作和结算凭证。' },
    { key: 'expedition-room', label: '远征房间', summary: '创建远征队伍，处理分工、资源、回合动作、断线恢复和结算。' },
    { key: 'memorials', label: '纪念记录', summary: '集中查看节会纪念、结算凭证和后续纪年记录入口。' },
  ]

  const normalizeTab = (value: unknown): FestivalTabKey => {
    const raw = Array.isArray(value) ? value[0] : value
    if (raw === 'festival' || raw === 'festival-room') return 'festival-room'
    if (raw === 'expedition' || raw === 'expedition-room') return 'expedition-room'
    if (raw === 'memorials') return 'memorials'
    return 'world'
  }

  const activeTab = ref<FestivalTabKey>(normalizeTab(route.query.tab))
  const showFestivalRoomWizard = ref(false)
  const showFestivalRoomLobby = ref(false)
  const festivalConfirmAction = ref<'settle' | 'close' | ''>('')
  const showExpeditionRoomWizard = ref(false)
  const showExpeditionRoomLobby = ref(false)
  const expeditionConfirmAction = ref<'settle' | 'close' | ''>('')
  const showFestivalInvitePanel = ref(false)
  const showExpeditionInvitePanel = ref(false)
  const festivalInviteSubmitting = ref(false)
  const expeditionInviteSubmitting = ref(false)
  const festivalInviteResults = ref<OnlineInviteResult[]>([])
  const expeditionInviteResults = ref<OnlineInviteResult[]>([])
  const selectedFestivalVisualObjectId = ref('')
  const selectedFestivalVisualTrackId = ref('')
  const selectedFestivalVisualTrackCellId = ref('')
  const selectedExpeditionVisualNodeId = ref('')
  const selectedExpeditionVisualTrackId = ref('')
  const selectedExpeditionVisualTrackCellId = ref('')
  const setActiveTab = (tab: string) => {
    activeTab.value = tab as FestivalTabKey
  }
  const lastRefreshAttemptAt = ref(0)
  const refreshing = computed(() => worldEventStore.loading || festivalRoomStore.loading || expeditionRoomStore.loading)
  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const moduleSummary = computed(() => {
    const season = worldEventStore.overview?.current_season_label || '世界事件未载入'
    const festivalStatus = festivalRoomStore.myRoom?.state_label || `${festivalRoomStore.visibleRooms.length} 间可见节会房`
    const expeditionStatus = expeditionRoomStore.myRoom?.state_label || `${expeditionRoomStore.visibleRooms.length} 间可见远征房`
    return `${season}；节会房间 ${festivalStatus}；远征房间 ${expeditionStatus}。`
  })
  const refreshStateLabel = computed(() => {
    if (refreshing.value) return '正在刷新节会模块摘要'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })
  const errorMessages = computed(() =>
    [worldEventStore.errorMessage, festivalRoomStore.errorMessage, expeditionRoomStore.errorMessage].filter(Boolean)
  )
  const summaryStats = computed(() => [
    { label: '当前事件', value: worldEventStore.currentEvent?.label || '未载入' },
    { label: '节会房间', value: festivalRoomStore.myRoom?.state_label || `${festivalRoomStore.visibleRooms.length} 可见` },
    { label: '远征房间', value: expeditionRoomStore.myRoom?.state_label || `${expeditionRoomStore.visibleRooms.length} 可见` },
    { label: '纪念与凭证', value: `${festivalRoomStore.recentMemorials.length + festivalRoomStore.recentReceipts.length + expeditionRoomStore.recentReceipts.length} 条` },
  ])
  const recentReceiptCards = computed<ReceiptCard[]>(() => [
    ...festivalRoomStore.recentReceipts.map(receipt => ({
      id: `festival-${receipt.id}`,
      roomTitle: receipt.room_title,
      templateLabel: receipt.template_label,
      domainLabel: '节会',
      statusLabel: receipt.status_label,
      summary: receipt.summary,
      routeReplay: receipt.route_replay,
    })),
    ...expeditionRoomStore.recentReceipts.map(receipt => ({
      id: `expedition-${receipt.id}`,
      roomTitle: receipt.room_title,
      templateLabel: receipt.template_label,
      domainLabel: '远征',
      statusLabel: receipt.status_label,
      summary: receipt.summary,
      routeReplay: receipt.route_replay,
    })),
  ].slice(0, 8))
  const hasRouteReplay = (replay?: ActivityRouteReplay | null) => Boolean(replay?.kind)
  const routeReplayRouteText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay)) return ''
    return (replay?.route_nodes ?? []).map(node => node.label).filter(Boolean).join(' -> ')
  }
  const routeReplayRaceText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'dragon_boat' || !replay.race_result?.rank_label) return ''
    const title = replay.race_result.title_label ? `称号：${replay.race_result.title_label}` : ''
    const popularity = replay.race_result.popularity_label || (replay.race_result.popularity_bonus > 0 ? `节会人气 +${replay.race_result.popularity_bonus}` : '')
    const rankings = (replay.race_rankings ?? [])
      .slice(0, 4)
      .map(row => `${row.rank_label} ${row.label}`)
      .join(' / ')
    const rankingText = rankings && replay.race_result.team_count > 1 ? `赛道榜：${rankings}` : ''
    return [replay.race_result.rank_label, popularity, title, rankingText].filter(Boolean).join(' · ')
  }
  const routeReplayRaceScaleText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'dragon_boat') return ''
    const teamCount = Math.max(0, Math.floor(Number(replay.race_result?.team_count) || replay.race_rankings?.length || 0))
    if (teamCount >= 4) return '四船扩展'
    if (teamCount === 3) return '三船竞速'
    if (teamCount === 2) return '双船演练'
    return '合作成绩'
  }
  const routeReplayRaceRankingRows = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'dragon_boat' || !Array.isArray(replay.race_rankings)) return []
    const trackLength = Math.max(
      1,
      replay.route_nodes?.length || 0,
      ...replay.race_rankings.map(row => Math.floor(Number(row.position_index) || 0) + 1)
    )
    return replay.race_rankings
      .filter(row => row.team_id || row.label)
      .slice(0, 8)
      .map(row => {
        const position = Math.max(1, Math.floor(Number(row.position_index) || 0) + 1)
        const score = Math.max(0, Math.floor(Number(row.score_value) || 0))
        return {
          id: row.team_id || `${row.rank}-${row.label}`,
          rankLabel: row.rank_label || (row.rank > 0 ? `第 ${row.rank} 名` : '未排名'),
          label: row.label || row.team_id || '未命名船队',
          positionText: `第 ${Math.min(position, trackLength)} / ${trackLength} 格`,
          scoreText: `赛舟分 ${score}`,
          finishText: row.finished ? '已冲线' : '仍在赛道中',
        }
      })
  }
  const festivalMemoryRecords = (records?: FestivalRoomRouteReplayMemoryRecord[] | null) =>
    (Array.isArray(records) ? records : [])
      .filter(record => record.label || record.type || record.summary)
      .slice(0, 8)
  const festivalMemorySummaryText = (summary?: FestivalMemoryRecordSummary | null) => {
    if (!summary || summary.total_count <= 0) return ''
    const signedText = '署名 ' + summary.signed_count + '/' + summary.total_count
    const pendingText = summary.pending_count > 0 ? '待署名 ' + summary.pending_count : ''
    const typeText = summary.record_types.length > 0 ? '类型 ' + summary.record_types.join(' / ') : ''
    const actorText = summary.signed_actor_display_names.length > 0 ? '署名人 ' + summary.signed_actor_display_names.slice(0, 3).join('、') : ''
    return [summary.summary, signedText, pendingText, typeText, actorText].filter(Boolean).join(' · ')
  }
  const formatFestivalFriendReplaySummary = (summary?: FestivalFriendReplaySummary | null) => {
    if (!summary) return ''
    const countText = '纪念 ' + summary.memorial_count + ' 条'
    const signedText = '署名 ' + summary.signed_memory_record_count + '/' + summary.memory_record_total_count
    const typeText = summary.memory_record_types.length > 0 ? '类型 ' + summary.memory_record_types.join(' / ') : ''
    const photoText = summary.has_photo_line ? '含留影文案' : ''
    return [summary.summary, countText, signedText, typeText, photoText].filter(Boolean).join(' · ')
  }
  const routeReplayMemoryRecords = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'lantern_fair' || !('memory_records' in replay)) return []
    return festivalMemoryRecords(replay.memory_records as FestivalRoomRouteReplayMemoryRecord[])
  }
  const formatFestivalMemoryRecord = (record: FestivalRoomRouteReplayMemoryRecord) => {
    const actor = record.actor_display_name || record.actor_username || '待署名'
    const round = record.round_number > 0 ? `第 ${record.round_number} 回合` : ''
    const action = record.action_label || record.object_label || ''
    const summary = record.summary || ''
    return [`${record.label || '纪念'}：${actor}`, round, action, summary].filter(Boolean).join(' · ')
  }
  const formatSignedCavernDelta = (value: number) => {
    if (value > 0) return `+${value}`
    if (value < 0) return String(value)
    return '持平'
  }
  const formatActivityTimestamp = (seconds?: number) => {
    const value = Math.floor(Number(seconds) || 0)
    if (value <= 0) return ''
    return new Date(value * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const cavernWithdrawalActorLabel = (cavernState: ExpeditionCavernStateSnapshot) => {
    const actor = cavernState.withdrawal_actor_display_name || cavernState.withdrawal_actor_username || '撤离确认人未记录'
    const time = formatActivityTimestamp(cavernState.withdrawal_at)
    return time ? `确认人：${actor} · ${time}` : `确认人：${actor}`
  }
  const routeReplayComboText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'expedition_cavern' || !('combo_records' in replay)) return ''
    return (replay.combo_records as ExpeditionCavernComboRecordSnapshot[])
      .filter(combo => combo.combo_id)
      .map(combo => `${combo.label} 采集值 +${combo.score_delta} / 风险 ${formatSignedCavernDelta(combo.risk_delta)}${combo.resource_delta_text ? ` / ${combo.resource_delta_text}` : ''}`)
      .join('；')
  }
  const routeReplayCargoIntegrityText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'escort_convoy' || !('cargo_integrity' in replay)) return ''
    const cargo = replay.cargo_integrity
    if (!cargo?.max) return ''
    const delta = cargo.last_delta > 0 ? `+${cargo.last_delta}` : String(cargo.last_delta)
    const deltaText = cargo.last_delta ? `最近 ${delta}` : '最近持平'
    const detailText = `稳固 ${cargo.protect_count} · 事件 ${cargo.incident_handled_count} · 货损 ${cargo.damage_count}`
    return [`${cargo.value}/${cargo.max}`, cargo.label, detailText, deltaText, cargo.last_reason].filter(Boolean).join(' · ')
  }
  const routeReplayWithdrawalText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || replay?.kind !== 'expedition_cavern' || !('withdrawal_state' in replay) || replay.withdrawal_state !== 'confirmed') return ''
    const actor = replay.withdrawal_actor_display_name || replay.withdrawal_actor_username || '撤离确认人未记录'
    const time = formatActivityTimestamp(replay.withdrawal_at)
    const summary = replay.withdrawal_summary || '撤离点已确认。'
    const lockedComboText = routeReplayWithdrawalLockedComboLabel(replay)
    return [summary, lockedComboText, time ? `${actor} · ${time}` : actor].filter(Boolean).join(' · ')
  }
  const formatLockedComboIds = (comboIds: string[] = []) => comboIds.length > 0 ? comboIds.join('、') : '无新增组合'
  const cavernWithdrawalLockedComboLabel = (cavernState: ExpeditionCavernStateSnapshot) => {
    const count = cavernState.withdrawal_locked_combo_count || cavernState.withdrawal_locked_combo_ids.length || 0
    return `锁定组合 ${count} 条：${formatLockedComboIds(cavernState.withdrawal_locked_combo_ids)}`
  }
  const routeReplayWithdrawalLockedComboLabel = (replay: ActivityRouteReplay) => {
    if (!hasRouteReplay(replay) || replay.kind !== 'expedition_cavern' || !('withdrawal_locked_combo_ids' in replay)) return ''
    const comboIds = replay.withdrawal_locked_combo_ids || []
    const count = replay.withdrawal_locked_combo_count || comboIds.length || 0
    return `锁定组合 ${count} 条：${formatLockedComboIds(comboIds)}`
  }
  const routeReplayPeakLabel = (replay?: ActivityRouteReplay | null) =>
    replay?.kind === 'dragon_boat' || replay?.kind === 'lantern_fair' ? '压力峰值' : '风险峰值'
  const routeReplayPeakText = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay) || !replay?.risk_peak) return ''
    const peak = replay.risk_peak as ActivityRouteReplay['risk_peak'] & { label?: string }
    const summary = peak.summary || peak.label || (peak.value > 0 ? `峰值 ${peak.value}` : '')
    if (!summary) return ''
    const roundText = peak.round_number > 0 ? `第 ${peak.round_number} 回合` : ''
    const actor = peak.actor_display_name || ''
    const action = peak.action_label || ''
    return [roundText, actor, action, summary].filter(Boolean).join(' · ')
  }
  const festivalGameplayActionMap = computed(() =>
    new Map((festivalRoomStore.myRoom?.gameplay.available_actions ?? []).map(action => [action.id, action]))
  )
  const festivalSceneObjects = computed<OnlineVisualObject[]>(() => {
    const visualState = festivalRoomStore.myRoom?.visual_state
    if (visualState?.board_type !== 'scene') return []
    const actionMap = festivalGameplayActionMap.value
    return (visualState.objects ?? []).map(object => ({
      ...object,
      available_action_ids: object.available_action_ids.filter(actionId => actionMap.get(actionId)?.can_use),
    }))
  })
  const festivalTracks = computed<OnlineVisualTrack[]>(() => {
    const visualState = festivalRoomStore.myRoom?.visual_state
    if (visualState?.board_type !== 'track') return []
    const actionMap = festivalGameplayActionMap.value
    return (visualState.tracks ?? []).map(track => ({
      ...track,
      cells: track.cells.map(cell => ({
        ...cell,
        available_action_ids: cell.available_action_ids.filter(actionId => actionMap.get(actionId)?.can_use),
      })),
    }))
  })
  const showFestivalSceneBoard = computed(() => festivalSceneObjects.value.length > 0)
  const showFestivalTrackBoard = computed(() => festivalTracks.value.some(track => track.cells.length > 0))
  const hasPrimaryFestivalVisualActions = computed(() =>
    festivalSceneObjects.value.some(object => object.available_action_ids.length > 0)
    || festivalTracks.value.some(track => track.cells.some(cell => cell.available_action_ids.length > 0))
  )
  const festivalRoomFallbackActionsVisible = computed(() =>
    (festivalRoomStore.myRoom?.gameplay.available_actions.length ?? 0) > 0 && !hasPrimaryFestivalVisualActions.value
  )
  const festivalRoomVisualContentLabel = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return '节会可视化内容尚未载入。'
    if (showFestivalTrackBoard.value) return '龙舟或节会轨道作为主入口，赛道格动作继续提交服务端节会行动。'
    if (showFestivalSceneBoard.value) return '节会现场物件作为主入口，点灯、解谜、秩序和留影都从场景热区提交。'
    return '当前房间没有可用场景或轨道热区，旧节会按钮作为主入口。'
  })
  const festivalRoomFallbackEntryLabel = '旧节会按钮备用操作'
  const festivalRoomFallbackEntryHint = '当场景或赛道没有可用主行动时，旧节会按钮会在备用操作中展开；结算和关闭按钮仍在房间操作区。'
  const selectedFestivalSceneObjectId = computed(() =>
    selectedFestivalVisualObjectId.value || festivalRoomStore.myRoom?.visual_state.selected_visual_id || ''
  )
  const selectedFestivalTrackId = computed(() =>
    selectedFestivalVisualTrackId.value || festivalTracks.value[0]?.id || ''
  )
  const selectedFestivalTrackCellId = computed(() =>
    selectedFestivalVisualTrackCellId.value || festivalRoomStore.myRoom?.visual_state.selected_visual_id || ''
  )
  const festivalSceneFeedback = computed(() =>
    festivalRoomStore.myRoom?.visual_state.recent_feedback || festivalRoomStore.myFestivalState?.recent_feedback || ''
  )
  const festivalTrackFeedback = computed(() =>
    festivalRoomStore.myRoom?.visual_state.recent_feedback || festivalRoomStore.myFestivalState?.recent_feedback || ''
  )
  const festivalVisualHighlights = computed(() => {
    const visualState = festivalRoomStore.myRoom?.visual_state
    return visualState?.board_type === 'scene' || visualState?.board_type === 'track' ? visualState.highlights.slice(0, 4) : []
  })
  const festivalSceneActionLabels = computed<Record<string, string>>(() =>
    Object.fromEntries(Array.from(festivalGameplayActionMap.value.values()).map(action => [action.id, action.label]))
  )
  const festivalRoomShellMembers = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    return room.members.map(member => ({
      username: member.username,
      displayName: member.display_name,
      statusLabel: member.status_label,
      isHost: member.username === room.host_username,
    }))
  })
  const festivalLobbyIsHostUser = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return false
    return room.can_host_ready_check || room.can_host_start_countdown || room.can_host_settle || room.can_host_close
  })
  const festivalLobbyCurrentMember = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return null
    if (festivalLobbyIsHostUser.value) {
      return room.members.find(member => member.username === room.host_username) ?? null
    }
    const nonHostWithMyStatus = room.members.find(member => member.username !== room.host_username && member.status === room.my_member_status)
    if (nonHostWithMyStatus) return nonHostWithMyStatus
    return room.members.find(member => member.status === room.my_member_status)
      ?? room.members.find(member => member.username !== room.host_username)
      ?? room.members[0]
      ?? null
  })
  const festivalLobbyCurrentUserId = computed(() =>
    festivalLobbyCurrentMember.value?.username || (festivalLobbyIsHostUser.value ? festivalRoomStore.myRoom?.host_username || '' : '')
  )
  const festivalLobbyRoom = computed<OnlineRoomLobbyRoom | null>(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return null
    return {
      id: room.id,
      title: room.title,
      template_label: room.template_label,
      gameplay_template_label: room.gameplay.template_label,
      state: room.state,
      state_label: room.state_label,
      host_username: room.host_username,
      member_limit: room.member_limit,
      members: room.members.map(member => ({
        id: member.username,
        username: member.username,
        display_name: member.display_name,
        role: member.username === room.host_username ? 'host' : member.role,
        status: member.status,
        status_label: member.status_label,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        ready_at: member.ready_at,
        disconnected_at: member.disconnected_at,
        left_at: member.left_at,
      })),
      can_invite: festivalLobbyIsHostUser.value && !['settled', 'closed'].includes(room.state),
      can_join: room.can_join,
      can_ready: room.can_ready,
      can_unready: room.can_unready,
      can_leave: room.can_leave,
      can_reconnect: room.can_reconnect,
      can_host_ready_check: room.can_host_ready_check,
      can_host_start_countdown: room.can_host_start_countdown,
      can_host_settle: room.can_host_settle,
      can_host_close: room.can_host_close,
    }
  })
  const festivalLobbyLastFeedback = computed(() =>
    festivalRoomActionFeedback.value || festivalRoomStore.errorMessage || festivalRoomStore.myFestivalState?.recent_feedback || ''
  )
  const festivalRoomBackupActionsVisible = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return false
    return room.can_host_ready_check
      || room.can_ready
      || room.can_unready
      || room.can_host_start_countdown
      || room.can_reconnect
      || room.can_host_settle
      || room.can_host_close
      || room.can_leave
  })
  const showFestivalSettleConfirm = computed(() => festivalConfirmAction.value === 'settle')
  const showFestivalCloseConfirm = computed(() => festivalConfirmAction.value === 'close')
  const festivalSettleUnfinishedMembers = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    return room.members.filter(member => !['finished', 'settled', 'left', 'kicked'].includes(member.status))
  })
  const festivalSettleConfirmDescription = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return '结算会根据当前节会房间进度生成奖励记录。'
    const unfinishedText = festivalSettleUnfinishedMembers.value.length > 0
      ? `当前还有 ${festivalSettleUnfinishedMembers.value.length} 名成员未完成，系统会按现有进度结算。`
      : '所有成员已完成或已有结果，适合进入结算。'
    return `${room.title} 将按当前节会进度生成奖励记录和回看内容。${unfinishedText}`
  })
  const festivalSettleImpactItems = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const unfinishedMembers = festivalSettleUnfinishedMembers.value
      .map(member => member.display_name || member.username)
      .slice(0, 3)
      .join('、')
    return [
      { id: 'room', label: '节会房间', value: room.title },
      { id: 'state', label: '当前状态', value: room.state_label },
      { id: 'members', label: '参与成员', value: `${room.joined_member_count}/${room.member_limit} 人` },
      {
        id: 'unfinished-members',
        label: '未完成成员',
        value: unfinishedMembers || '无',
      },
    ]
  })
  const festivalSettleAssetChanges = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const rewardItems = festivalRoomRewardPreview.value.slice(0, 3).map((label, index) => ({
      id: `reward-${index}`,
      label,
      value: '',
    }))
    return rewardItems.length > 0
      ? rewardItems
      : [{
        id: 'reward-preview-empty',
        label: room.settlement_receipts.length > 0 ? '已有结算记录会继续保留。' : '奖励预览将在结算后生成。',
        value: '',
      }]
  })
  const festivalSettleRecoveryHint = computed(() =>
    festivalRoomStore.errorMessage || '如果结算没有完成，房间会保留当前状态，可刷新后再次尝试。'
  )
  const festivalCloseConfirmTitle = computed(() => {
    const state = festivalRoomStore.myRoom?.state
    if (state === 'running') return '确认关闭进行中的节会房间'
    if (state === 'settling') return '确认关闭节会房间'
    return '确认取消节会房间'
  })
  const festivalCloseConfirmDescription = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return '关闭后成员需要返回大厅，未生成的新奖励不会补发。'
    const runningText = room.state === 'running'
      ? '房间正在进行中，关闭后成员会退出本轮节会，未完成进度不会继续推进。'
      : '关闭后成员会回到大厅，后续需要重新创建房间。'
    return `${room.title} 当前为「${room.state_label}」。${runningText}`
  })
  const festivalCloseImpactItems = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const readyCount = room.members.filter(member => ['ready', 'countdown_locked', 'active', 'finished', 'settled'].includes(member.status)).length
    return [
      { id: 'room', label: '节会房间', value: room.title },
      { id: 'state', label: '当前状态', value: room.state_label },
      { id: 'members', label: '影响成员', value: `${room.members.length} 人` },
      { id: 'ready-members', label: '已准备或已参与', value: `${readyCount} 人` },
    ]
  })
  const festivalCloseAssetChanges = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const existingRecords = room.settlement_receipts.length
    return [
      {
        id: 'new-reward',
        label: existingRecords > 0 ? '已有结算记录继续保留。' : '不会生成新的成员奖励。',
        value: existingRecords > 0 ? `${existingRecords} 条` : '',
      },
      {
        id: 'member-progress',
        label: '未完成的节会进度会停止推进。',
        value: '',
      },
    ]
  })
  const festivalCloseRequireText = computed(() =>
    festivalRoomStore.myRoom?.state === 'running' ? '确认关闭房间' : ''
  )
  const festivalCloseConfirmLabel = computed(() => {
    const state = festivalRoomStore.myRoom?.state
    if (state === 'settling') return '正式关闭'
    if (state === 'running') return '确认关闭房间'
    return '确认取消房间'
  })
  const festivalCloseRecoveryHint = computed(() =>
    festivalRoomStore.errorMessage || '如果关闭没有完成，房间会保留当前状态，可刷新后再次尝试。'
  )
  const festivalInviteExistingMembers = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    return room.members.map(member => ({
      id: member.username,
      username: member.username,
      displayName: member.display_name,
      status: member.status,
      statusLabel: member.status_label,
    }))
  })
  const festivalRoomConnectionState = computed<'online' | 'disconnected' | 'reconnecting' | 'conflict'>(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return 'online'
    if (room.state_label.includes('冲突')) return 'conflict'
    if (room.can_reconnect) return 'disconnected'
    if (room.my_member_status === 'disconnected') return 'reconnecting'
    return 'online'
  })
  const festivalRoomShellErrors = computed(() => {
    const messages = [
      festivalRoomStore.errorMessage,
      festivalRoomConnectionState.value === 'conflict' ? '服务端节会房间状态存在冲突，请刷新后再继续提交。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set(messages))
  })
  const festivalRoomConflictMessage = computed(() =>
    festivalRoomConnectionState.value === 'conflict' ? '当前本地节会状态可能落后于服务端，请先刷新确认。' : ''
  )
  const festivalRoomActionFeedback = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return ''
    return room.visual_state.recent_feedback
      || room.gameplay.last_action_summary
      || ''
  })
  const festivalRoomPermissionHints = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const disabledActions = room.gameplay.available_actions
      .filter(action => !action.can_use && action.disabled_reason)
      .slice(0, 3)
      .map(action => `${action.label}：${action.disabled_reason}`)
    const canUseHostAction = room.can_host_ready_check || room.can_host_start_countdown || room.can_host_settle || room.can_host_close
    const roomHints = [
      !canUseHostAction ? '房主操作：开场、关闭房间和最终结算需要房主权限与正确阶段。' : '',
      room.my_member_status === 'invited' ? '成员权限：加入房间后才能提交节会现场行动。' : '',
      room.my_member_status === 'disconnected' ? '重连权限：恢复连接前请先刷新节会房间状态。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set([...roomHints, ...disabledActions])).slice(0, 5)
  })
  const festivalRoomFocusHints = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const boardHint = room.visual_state.board_type === 'track'
      ? 'Tab 进入龙舟赛道格后用 Enter 选择水道，再提交划桨、稳舵或鼓点行动。'
      : 'Tab 进入灯会物件后用 Enter 选择热区，再提交点灯、解谜、秩序或留影行动。'
    return [
      boardHint,
      '可视化行动不可用时，旧节会按钮会在备用操作中展开；结算入口仍在房间操作区。',
    ]
  })
  const festivalRoomRewardPreview = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    const actionHints = room.gameplay.available_actions
      .flatMap(action => [action.round_effect, action.resource_delta_text, action.pressure_delta_text])
      .filter(Boolean)
      .slice(0, 3) as string[]
    const receiptHints = room.settlement_receipts
      .slice(0, 2)
      .map(receipt => `${receipt.target_display_name} · ${receipt.status_label} · ${receipt.summary}`)
    return [...actionHints, ...receiptHints]
  })
  const formatRewardPayloadLabel = (rewardPayload?: { money?: number; reward_tickets?: number; items?: Array<{ item_id: string; quantity: number }> }) => {
    const rewardItems = (rewardPayload?.items ?? [])
      .map(item => `${item.item_id} x${item.quantity}`)
      .join('、')
    const rewardParts = [
      (rewardPayload?.money ?? 0) > 0 ? `${rewardPayload?.money} 铜钱` : '',
      (rewardPayload?.reward_tickets ?? 0) > 0 ? `${rewardPayload?.reward_tickets} 张奖券` : '',
      rewardItems,
    ].filter(Boolean)
    return rewardParts.length > 0 ? `奖励已记录：${rewardParts.join('、')}` : ''
  }
  const festivalRoomSettlementRecords = computed(() => {
    const room = festivalRoomStore.myRoom
    if (!room) return []
    return room.settlement_receipts.slice(0, 4).map(receipt => {
      const rewardLabel = formatRewardPayloadLabel(receipt.reward_payload)
      return {
        id: receipt.id,
        targetLabel: receipt.target_display_name,
        statusLabel: receipt.status_label,
        summary: receipt.summary,
        replayLabel: formatFestivalRoomShellReplay(receipt.route_replay),
        rewardLabel: rewardLabel || '结算记录已生成，纪念或留影回看由房间记录读回。',
      }
    })
  })
  const formatFestivalRoomShellReplay = (replay?: ActivityRouteReplay | null) => {
    if (!hasRouteReplay(replay)) return ''
    if (replay?.kind === 'lantern_fair') {
      const memorySummary = routeReplayMemoryRecords(replay)
        .map(record => formatFestivalMemoryRecord(record))
        .join('；')
      const peakText = routeReplayPeakText(replay)
      return [
        replay.summary || replay.title,
        memorySummary ? `灯会纪念：${memorySummary}` : '',
        peakText ? `压力峰值：${peakText}` : '',
      ].filter(Boolean).join('；')
    }
    if (replay?.kind === 'expedition_cavern') {
      const comboCount = 'combo_records' in replay && Array.isArray(replay.combo_records)
        ? replay.combo_records.length
        : 0
      const withdrawalText = routeReplayWithdrawalText(replay)
      const peakText = routeReplayPeakText(replay)
      return [
        replay.summary || replay.title,
        comboCount > 0 ? `组合收益 ${comboCount} 条` : '',
        withdrawalText ? `提前撤离 · ${withdrawalText}` : '',
        peakText ? `风险峰值：${peakText}` : '',
      ].filter(Boolean).join('；')
    }
    if (replay?.kind === 'dragon_boat') {
      const raceText = routeReplayRaceText(replay)
      const scaleText = routeReplayRaceScaleText(replay)
      const rankingText = routeReplayRaceRankingRows(replay)
        .slice(0, 4)
        .map(row => `${row.rankLabel} ${row.label} · ${row.scoreText} · ${row.finishText}`)
        .join('；')
      const peakText = routeReplayPeakText(replay)
      return [
        replay.summary || replay.title,
        scaleText ? `竞速规模：${scaleText}` : '',
        raceText ? `龙舟成绩：${raceText}` : '',
        rankingText ? `赛道名次：${rankingText}` : '',
        peakText ? `压力峰值：${peakText}` : '',
      ].filter(Boolean).join('；')
    }
    if (replay?.kind === 'escort_convoy') {
      const cargoText = routeReplayCargoIntegrityText(replay)
      const peakText = routeReplayPeakText(replay)
      return [
        replay.summary || replay.title,
        cargoText ? `货物完整度：${cargoText}` : '',
        peakText ? `风险峰值：${peakText}` : '',
      ].filter(Boolean).join('；')
    }
    return replay?.summary || replay?.title || ''
  }
  const expeditionRoomShellMembers = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    return room.members.map(member => ({
      username: member.username,
      displayName: member.display_name,
      statusLabel: member.status_label,
      isHost: member.username === room.host_username,
    }))
  })
  const expeditionInviteExistingMembers = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    return room.members.map(member => ({
      id: member.username,
      username: member.username,
      displayName: member.display_name,
      status: member.status,
      statusLabel: member.status_label,
    }))
  })
  const expeditionRoomConnectionState = computed<'online' | 'disconnected' | 'reconnecting' | 'conflict'>(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return 'online'
    if (room.state_label.includes('冲突')) return 'conflict'
    if (room.can_reconnect) return 'disconnected'
    if (room.my_member_status === 'disconnected') return 'reconnecting'
    return 'online'
  })
  const expeditionRoomShellErrors = computed(() => {
    const messages = [
      expeditionRoomStore.errorMessage,
      expeditionRoomConnectionState.value === 'conflict' ? '服务端远征房间状态存在冲突，请刷新后再继续提交。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set(messages))
  })
  const expeditionRoomConflictMessage = computed(() =>
    expeditionRoomConnectionState.value === 'conflict' ? '当前本地远征状态可能落后于服务端，请先刷新确认。' : ''
  )
  const expeditionRoomActionFeedback = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return ''
    return room.visual_state.recent_feedback
      || room.gameplay.cavern_state?.recent_feedback
      || room.gameplay.last_action_summary
      || ''
  })
  const expeditionRoomPermissionHints = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const disabledActions = room.gameplay.available_actions
      .filter(action => !action.can_use && action.disabled_reason)
      .slice(0, 3)
      .map(action => `${action.label}：${action.disabled_reason}`)
    const canUseHostAction = room.can_host_ready_check || room.can_host_start_countdown || room.can_host_settle || room.can_host_close
    const roomHints = [
      !canUseHostAction ? '房主操作：开场、关闭房间和最终结算需要房主权限与正确阶段。' : '',
      room.my_member_status === 'invited' ? '成员权限：加入远征房间后才能提交矿洞、护送或共探行动。' : '',
      room.my_member_status === 'disconnected' ? '重连权限：恢复连接前请先刷新远征房间状态。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set([...roomHints, ...disabledActions])).slice(0, 5)
  })
  const expeditionRoomFocusHints = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const boardHint = room.visual_state.board_type === 'track'
      ? 'Tab 进入护送或赛道格后用 Enter 选择格子，再提交对应行动。'
      : 'Tab 进入矿洞节点后用 Enter 选择节点，再提交探路、采集、支护或撤离。'
    return [
      boardHint,
      '旧远征按钮和结算入口仍在房间下方，移动端与键盘用户可继续从备用操作进入。',
    ]
  })
  const expeditionRoomRewardPreview = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const actionHints = room.gameplay.available_actions
      .flatMap(action => [action.round_effect, action.resource_delta_text, action.risk_delta_text])
      .filter(Boolean)
      .slice(0, 3) as string[]
    const receiptHints = room.settlement_receipts
      .slice(0, 2)
      .map(receipt => `${receipt.target_display_name || receipt.target_username} · ${receipt.status_label} · ${receipt.summary}`)
    return [...actionHints, ...receiptHints]
  })
  const expeditionRoomSettlementRecords = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    return room.settlement_receipts.slice(0, 4).map(receipt => {
      const rewardLabel = formatRewardPayloadLabel(receipt.reward_payload)
      return {
        id: receipt.id,
        targetLabel: receipt.target_display_name || receipt.target_username,
        statusLabel: receipt.status_label,
        summary: receipt.summary,
        replayLabel: formatFestivalRoomShellReplay(receipt.route_replay),
        rewardLabel: rewardLabel || '结算记录已生成，暂无额外物品记录。',
      }
    })
  })
  const expeditionLobbyIsHostUser = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return false
    return room.can_host_ready_check || room.can_host_start_countdown || room.can_host_settle || room.can_host_close
  })
  const expeditionLobbyCurrentMember = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return null
    if (expeditionLobbyIsHostUser.value) {
      return room.members.find(member => member.username === room.host_username) ?? null
    }
    const nonHostWithMyStatus = room.members.find(member => member.username !== room.host_username && member.status === room.my_member_status)
    if (nonHostWithMyStatus) return nonHostWithMyStatus
    return room.members.find(member => member.status === room.my_member_status)
      ?? room.members.find(member => member.username !== room.host_username)
      ?? room.members[0]
      ?? null
  })
  const expeditionLobbyCurrentUserId = computed(() =>
    expeditionLobbyCurrentMember.value?.username || (expeditionLobbyIsHostUser.value ? expeditionRoomStore.myRoom?.host_username || '' : '')
  )
  const expeditionLobbyRoom = computed<OnlineRoomLobbyRoom | null>(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return null
    return {
      id: room.id,
      title: room.title,
      template_label: room.template_label,
      gameplay_template_label: room.gameplay.template_label,
      state: room.state,
      state_label: room.state_label,
      host_username: room.host_username,
      member_limit: room.member_limit,
      members: room.members.map(member => ({
        id: member.username,
        username: member.username,
        display_name: member.display_name,
        role: member.username === room.host_username ? 'host' : member.role,
        status: member.status,
        status_label: member.status_label,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        ready_at: member.ready_at,
        disconnected_at: member.disconnected_at,
        left_at: member.left_at,
      })),
      can_invite: expeditionLobbyIsHostUser.value && !['settled', 'closed'].includes(room.state),
      can_join: room.can_join,
      can_ready: room.can_ready,
      can_unready: room.can_unready,
      can_leave: room.can_leave,
      can_reconnect: room.can_reconnect,
      can_host_ready_check: room.can_host_ready_check,
      can_host_start_countdown: room.can_host_start_countdown,
      can_host_settle: room.can_host_settle,
      can_host_close: room.can_host_close,
    }
  })
  const expeditionLobbyLastFeedback = computed(() =>
    expeditionRoomActionFeedback.value || expeditionRoomStore.errorMessage || ''
  )
  const expeditionRoomBackupActionsVisible = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return false
    return room.can_host_ready_check
      || room.can_ready
      || room.can_unready
      || room.can_host_start_countdown
      || room.can_reconnect
      || room.can_host_settle
      || room.can_host_close
      || room.can_leave
  })
  const showExpeditionSettleConfirm = computed(() => expeditionConfirmAction.value === 'settle')
  const showExpeditionCloseConfirm = computed(() => expeditionConfirmAction.value === 'close')
  const expeditionSettleUnfinishedMembers = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    return room.members.filter(member => !['finished', 'settled', 'left', 'kicked'].includes(member.status))
  })
  const expeditionSettleConfirmDescription = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return '结算会根据当前远征进度生成奖励记录。'
    const unfinishedText = expeditionSettleUnfinishedMembers.value.length > 0
      ? `当前还有 ${expeditionSettleUnfinishedMembers.value.length} 名成员未完成，系统会按现有远征进度结算。`
      : '所有成员已完成或已有结果，适合进入结算。'
    return `${room.title} 将按当前路线进度生成奖励记录和远征回看。${unfinishedText}`
  })
  const expeditionSettleImpactItems = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const unfinishedMembers = expeditionSettleUnfinishedMembers.value
      .map(member => member.display_name || member.username)
      .slice(0, 3)
      .join('、')
    return [
      { id: 'room', label: '远征房间', value: room.title },
      { id: 'state', label: '当前状态', value: room.state_label },
      { id: 'members', label: '参与成员', value: `${room.joined_member_count}/${room.member_limit} 人` },
      { id: 'unfinished-members', label: '未完成成员', value: unfinishedMembers || '无' },
    ]
  })
  const expeditionSettleAssetChanges = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const rewardItems = expeditionRoomRewardPreview.value.slice(0, 3).map((label, index) => ({
      id: `reward-${index}`,
      label,
      value: '',
    }))
    return rewardItems.length > 0
      ? rewardItems
      : [{
        id: 'reward-preview-empty',
        label: room.settlement_receipts.length > 0 ? '已有结算记录会继续保留。' : '奖励预览将在结算后生成。',
        value: '',
      }]
  })
  const expeditionSettleRecoveryHint = computed(() =>
    expeditionRoomStore.errorMessage || '如果结算没有完成，远征房间会保留当前状态，可刷新后再次尝试。'
  )
  const expeditionCloseConfirmTitle = computed(() => {
    const state = expeditionRoomStore.myRoom?.state
    if (state === 'running') return '确认关闭进行中的远征房间'
    if (state === 'settling') return '确认关闭远征房间'
    return '确认取消远征房间'
  })
  const expeditionCloseConfirmDescription = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return '关闭后成员需要返回大厅，未生成的新奖励不会补发。'
    const runningText = room.state === 'running'
      ? '房间正在进行中，关闭后成员会退出本轮远征，未完成进度不会继续推进。'
      : '关闭后成员会回到大厅，后续需要重新创建远征队伍。'
    return `${room.title} 当前为「${room.state_label}」。${runningText}`
  })
  const expeditionCloseImpactItems = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const readyCount = room.members.filter(member => ['ready', 'countdown_locked', 'active', 'finished', 'settled'].includes(member.status)).length
    return [
      { id: 'room', label: '远征房间', value: room.title },
      { id: 'state', label: '当前状态', value: room.state_label },
      { id: 'members', label: '影响成员', value: `${room.members.length} 人` },
      { id: 'ready-members', label: '已准备或已参与', value: `${readyCount} 人` },
    ]
  })
  const expeditionCloseAssetChanges = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const existingRecords = room.settlement_receipts.length
    return [
      {
        id: 'new-reward',
        label: existingRecords > 0 ? '已有结算记录继续保留。' : '不会生成新的成员奖励。',
        value: existingRecords > 0 ? `${existingRecords} 条` : '',
      },
      {
        id: 'member-progress',
        label: '未完成的远征进度会停止推进。',
        value: '',
      },
    ]
  })
  const expeditionCloseRequireText = computed(() =>
    expeditionRoomStore.myRoom?.state === 'running' ? '确认关闭远征房间' : ''
  )
  const expeditionCloseConfirmLabel = computed(() => {
    const state = expeditionRoomStore.myRoom?.state
    if (state === 'settling') return '正式关闭'
    if (state === 'running') return '确认关闭远征房间'
    return '确认取消房间'
  })
  const expeditionCloseRecoveryHint = computed(() =>
    expeditionRoomStore.errorMessage || '如果关闭没有完成，远征房间会保留当前状态，可刷新后再次尝试。'
  )
  const expeditionGameplayActionMap = computed(() =>
    new Map((expeditionRoomStore.myRoom?.gameplay.available_actions ?? []).map(action => [action.id, action]))
  )
  const expeditionVisualMapNodes = computed<OnlineVisualNode[]>(() => {
    const visualState = expeditionRoomStore.myRoom?.visual_state
    if (visualState?.board_type !== 'map') return []
    const actionMap = expeditionGameplayActionMap.value
    return (visualState.nodes ?? []).map(node => ({
      ...node,
      available_action_ids: node.available_action_ids.filter(actionId => actionMap.get(actionId)?.can_use),
    }))
  })
  const expeditionVisualTracks = computed<OnlineVisualTrack[]>(() => {
    const visualState = expeditionRoomStore.myRoom?.visual_state
    if (visualState?.board_type !== 'track') return []
    const actionMap = expeditionGameplayActionMap.value
    return (visualState.tracks ?? []).map(track => ({
      ...track,
      cells: track.cells.map(cell => ({
        ...cell,
        available_action_ids: cell.available_action_ids.filter(actionId => actionMap.get(actionId)?.can_use),
      })),
    }))
  })
  const showExpeditionMapBoard = computed(() => expeditionVisualMapNodes.value.length > 0)
  const showExpeditionTrackBoard = computed(() => expeditionVisualTracks.value.some(track => track.cells.length > 0))
  const selectedExpeditionTrackId = computed(() =>
    selectedExpeditionVisualTrackId.value || expeditionVisualTracks.value[0]?.id || ''
  )
  const selectedExpeditionTrackCellId = computed(() =>
    selectedExpeditionVisualTrackCellId.value || expeditionRoomStore.myRoom?.visual_state.selected_visual_id || ''
  )
  const hasExpeditionVisualNodeActions = computed(() =>
    expeditionVisualMapNodes.value.some(node => node.available_action_ids.length > 0)
  )
  const hasExpeditionVisualTrackActions = computed(() =>
    expeditionVisualTracks.value.some(track => track.cells.some(cell => cell.available_action_ids.length > 0))
  )
  const hasPrimaryExpeditionVisualActions = computed(() =>
    (showExpeditionMapBoard.value && hasExpeditionVisualNodeActions.value)
    || (showExpeditionTrackBoard.value && hasExpeditionVisualTrackActions.value)
  )
  const showExpeditionFallbackActions = computed(() =>
    (expeditionRoomStore.myRoom?.gameplay.available_actions.length ?? 0) > 0 && !hasPrimaryExpeditionVisualActions.value
  )
  const expeditionRoomVisualContentLabel = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return '远征可视化内容尚未载入。'
    if (showExpeditionTrackBoard.value) return '远征轨道或护送路线作为主入口，轨道格动作继续提交服务端远征行动。'
    if (showExpeditionMapBoard.value) return '矿洞节点地图作为主入口，撤离点、采集、支护和探路都从节点动作提交。'
    return '当前房间没有可用地图或轨道热区，旧远征按钮作为主入口。'
  })
  const expeditionRoomFallbackEntryLabel = '旧远征按钮备用操作'
  const expeditionRoomFallbackEntryHint = '当地图 / 轨道没有可用动作或可视化配置缺失时，下方旧玩法动作面板继续提交同一远征行动；结算和关闭按钮仍在房间壳操作区。'
  const expeditionVisualActionLabels = computed<Record<string, string>>(() =>
    Object.fromEntries(Array.from(expeditionGameplayActionMap.value.values()).map(action => [action.id, action.label]))
  )

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }
  const applyInviteRouteDraft = () => {
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    if (targetUsername) {
      festivalRoomStore.draftInviteUsername = targetUsername
      expeditionRoomStore.draftInviteUsername = targetUsername
    }
    if (targetSaveId) {
      festivalRoomStore.draftInviteSaveId = targetSaveId
      expeditionRoomStore.draftInviteSaveId = targetSaveId
    }
  }
  const applyFestivalRoomRouteDraft = () => {
    const templateId = getRouteQueryText(route.query.template) || getRouteQueryText(route.query.template_id)
    const gameplayId = getRouteQueryText(route.query.gameplay) || getRouteQueryText(route.query.gameplay_template_id)
    const title = getRouteQueryText(route.query.title)
    const sourceLabel = getRouteQueryText(route.query.source_label)
    const sourceFeedback = getRouteQueryText(route.query.source_feedback)
    const sourceContextSummary = getRouteQueryText(route.query.source_context_summary)
    if (!templateId && !gameplayId && !title && !sourceLabel && !sourceFeedback && !sourceContextSummary) return
    if (templateId) festivalRoomStore.selectedTemplateId = templateId
    if (gameplayId) {
      festivalRoomStore.selectedGameplayTemplateId = gameplayId
    } else if (templateId === 'lantern_fair' || templateId === 'laba_cookpot') {
      festivalRoomStore.selectedGameplayTemplateId = 'assembly'
    }
    if (title && !festivalRoomStore.draftTitle.trim()) festivalRoomStore.draftTitle = title
    if (sourceLabel) festivalRoomStore.draftSourceLabel = sourceLabel
    if (sourceFeedback) festivalRoomStore.draftSourceFeedback = sourceFeedback
    if (sourceContextSummary) festivalRoomStore.draftSourceContextSummary = sourceContextSummary
  }
  const applyExpeditionRoomRouteDraft = () => {
    const usingExpeditionTab = normalizeTab(route.query.tab) === 'expedition-room'
    const templateId = getRouteQueryText(route.query.expedition_template)
      || getRouteQueryText(route.query.expedition_template_id)
      || (usingExpeditionTab ? getRouteQueryText(route.query.template) || getRouteQueryText(route.query.template_id) : '')
    const gameplayId = getRouteQueryText(route.query.expedition_gameplay)
      || getRouteQueryText(route.query.expedition_gameplay_template_id)
      || (usingExpeditionTab ? getRouteQueryText(route.query.gameplay) || getRouteQueryText(route.query.gameplay_template_id) : '')
    const title = getRouteQueryText(route.query.expedition_title)
      || (usingExpeditionTab ? getRouteQueryText(route.query.title) : '')
    if (!templateId && !gameplayId && !title) return
    if (templateId) expeditionRoomStore.selectedTemplateId = templateId
    if (gameplayId) expeditionRoomStore.selectedGameplayTemplateId = gameplayId
    if (title && !expeditionRoomStore.draftTitle.trim()) expeditionRoomStore.draftTitle = title
  }
  const refreshFestivalModule = async () => {
    await Promise.all([
      worldEventStore.refreshOverview().catch(() => {}),
      festivalRoomStore.refreshOverview().catch(() => {}),
      expeditionRoomStore.refreshOverview().catch(() => {}),
    ])
    lastRefreshAttemptAt.value = Date.now()
  }
  const contributeWorldEventAction = async (eventId: string, actionId: string) => {
    await worldEventStore.contribute(eventId, actionId).catch(() => {})
  }
  const createRoom = async () => {
    await festivalRoomStore.createRoom().catch(() => {})
  }
  const normalizeInviteRecipient = (recipient: string) => recipient.trim().toLowerCase()
  const upsertInviteResult = (rows: OnlineInviteResult[], row: OnlineInviteResult) => {
    const nextRows = rows.slice()
    const rowKey = normalizeInviteRecipient(row.username)
    const existingIndex = nextRows.findIndex(item => normalizeInviteRecipient(item.username) === rowKey)
    if (existingIndex >= 0) {
      nextRows[existingIndex] = { ...nextRows[existingIndex], ...row }
      return nextRows
    }
    nextRows.push(row)
    return nextRows
  }
  const removeInviteResult = (rows: OnlineInviteResult[], recipient: string) => {
    const rowKey = normalizeInviteRecipient(recipient)
    return rows.filter(row => normalizeInviteRecipient(row.username) !== rowKey)
  }
  const inviteFailureMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error) || !error.message.trim()) return fallback
    if (error.message.includes('冲突')) return '房间信息有更新，请刷新后继续。'
    return error.message
  }
  const openFestivalInvitePanel = () => {
    showFestivalInvitePanel.value = true
  }
  const closeFestivalInvitePanel = () => {
    showFestivalInvitePanel.value = false
  }
  const openFestivalRoomLobby = () => {
    showFestivalRoomLobby.value = true
  }
  const closeFestivalRoomLobby = () => {
    showFestivalRoomLobby.value = false
  }
  const openFestivalSettleConfirm = () => {
    if (!festivalRoomStore.myRoom || festivalRoomStore.actionRunning) return
    festivalConfirmAction.value = 'settle'
  }
  const openFestivalCloseConfirm = () => {
    if (!festivalRoomStore.myRoom || festivalRoomStore.actionRunning) return
    festivalConfirmAction.value = 'close'
  }
  const closeFestivalConfirmDialog = () => {
    if (festivalRoomStore.actionRunning) return
    festivalConfirmAction.value = ''
  }
  const confirmFestivalSettle = async () => {
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    try {
      await festivalRoomStore.settleRoomAction(roomId)
      closeFestivalConfirmDialog()
    } catch {
      // Store errorMessage remains visible in the dialog so the host can retry.
    }
  }
  const confirmFestivalCloseRoom = async () => {
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    try {
      await festivalRoomStore.closeRoomAction(roomId)
      closeFestivalConfirmDialog()
    } catch {
      // Store errorMessage remains visible in the dialog so the host can retry.
    }
  }
  const openExpeditionInvitePanel = () => {
    activeTab.value = 'expedition-room'
    showExpeditionInvitePanel.value = true
  }
  const closeExpeditionInvitePanel = () => {
    showExpeditionInvitePanel.value = false
  }
  const openExpeditionRoomLobby = () => {
    activeTab.value = 'expedition-room'
    showExpeditionRoomLobby.value = true
  }
  const closeExpeditionRoomLobby = () => {
    showExpeditionRoomLobby.value = false
  }
  const openExpeditionSettleConfirm = () => {
    if (!expeditionRoomStore.myRoom || expeditionRoomStore.actionRunning) return
    expeditionConfirmAction.value = 'settle'
  }
  const openExpeditionCloseConfirm = () => {
    if (!expeditionRoomStore.myRoom || expeditionRoomStore.actionRunning) return
    expeditionConfirmAction.value = 'close'
  }
  const closeExpeditionConfirmDialog = () => {
    if (expeditionRoomStore.actionRunning) return
    expeditionConfirmAction.value = ''
  }
  const confirmExpeditionSettle = async () => {
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId) return
    try {
      await expeditionRoomStore.settleRoomAction(roomId)
      closeExpeditionConfirmDialog()
    } catch {
      // Store errorMessage remains visible in the dialog so the host can retry.
    }
  }
  const confirmExpeditionCloseRoom = async () => {
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId) return
    try {
      await expeditionRoomStore.closeRoomAction(roomId)
      closeExpeditionConfirmDialog()
    } catch {
      // Store errorMessage remains visible in the dialog so the host can retry.
    }
  }
  const openFestivalRoomWizard = () => {
    showFestivalRoomWizard.value = true
  }
  const closeFestivalRoomWizard = () => {
    showFestivalRoomWizard.value = false
  }
  const syncFestivalRoomWizardDraft = (draft: OnlineRoomWizardDraft) => {
    if (draft.domain !== 'festival') return
    festivalRoomStore.selectedTemplateId = draft.templateId
    festivalRoomStore.selectedGameplayTemplateId = draft.gameplayId
    festivalRoomStore.draftMemberLimit = draft.memberLimit
    festivalRoomStore.draftTitle = draft.title
  }
  const submitFestivalRoomWizard = async (draft: OnlineRoomWizardDraft) => {
    syncFestivalRoomWizardDraft(draft)
    try {
      await festivalRoomStore.createRoom()
      await festivalRoomStore.refreshOverview({ silent: true }).catch(() => {})
      closeFestivalRoomWizard()
    } catch {
      // Store errorMessage is passed back into the wizard so the draft stays visible.
    }
  }
  const openExpeditionRoomWizard = () => {
    activeTab.value = 'expedition-room'
    showExpeditionRoomWizard.value = true
  }
  const closeExpeditionRoomWizard = () => {
    showExpeditionRoomWizard.value = false
  }
  const syncExpeditionRoomWizardDraft = (draft: OnlineRoomWizardDraft) => {
    if (draft.domain !== 'expedition') return
    expeditionRoomStore.selectedTemplateId = draft.templateId
    expeditionRoomStore.selectedGameplayTemplateId = draft.gameplayId
    expeditionRoomStore.draftMemberLimit = draft.memberLimit
    expeditionRoomStore.draftTitle = draft.title
  }
  const submitExpeditionRoomWizard = async (draft: OnlineRoomWizardDraft) => {
    syncExpeditionRoomWizardDraft(draft)
    try {
      await expeditionRoomStore.createRoom()
      await expeditionRoomStore.refreshOverview({ silent: true }).catch(() => {})
      closeExpeditionRoomWizard()
    } catch {
      // Store errorMessage is passed back into the wizard so the draft stays visible.
    }
  }
  const selectLanternFairDraft = () => {
    festivalRoomStore.selectedTemplateId = 'lantern_fair'
    festivalRoomStore.selectedGameplayTemplateId = 'assembly'
    if (!festivalRoomStore.draftTitle.trim()) festivalRoomStore.draftTitle = '上元灯会共建'
  }
  const selectDragonBoatDraft = () => {
    festivalRoomStore.selectedTemplateId = 'dragon_boat'
    festivalRoomStore.selectedGameplayTemplateId = 'squad_coop'
    if (!festivalRoomStore.draftTitle.trim()) festivalRoomStore.draftTitle = '端午赛舟演练'
  }
  const submitFestivalInvites = async (recipients: string[]) => {
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId || recipients.length === 0) return
    festivalInviteSubmitting.value = true
    try {
      for (const recipient of recipients) {
        festivalInviteResults.value = upsertInviteResult(festivalInviteResults.value, {
          username: recipient,
          status: 'inviting',
          message: '正在发送邀请。',
        })
        festivalRoomStore.draftInviteUsername = recipient
        festivalRoomStore.draftInviteSaveId = ''
        try {
          await festivalRoomStore.inviteMember(roomId)
          festivalInviteResults.value = upsertInviteResult(festivalInviteResults.value, {
            username: recipient,
            status: 'invited',
            message: '邀请已发送，等待对方加入。',
          })
        } catch (error) {
          festivalInviteResults.value = upsertInviteResult(festivalInviteResults.value, {
            username: recipient,
            status: 'failed',
            message: inviteFailureMessage(error, '邀请没有发出，可以稍后重试。'),
          })
        }
      }
    } finally {
      festivalRoomStore.draftInviteUsername = ''
      festivalRoomStore.draftInviteSaveId = ''
      festivalInviteSubmitting.value = false
    }
  }
  const retryFestivalInvite = async (recipient: string) => {
    await submitFestivalInvites([recipient])
  }
  const removeFestivalInviteResult = (recipient: string) => {
    festivalInviteResults.value = removeInviteResult(festivalInviteResults.value, recipient)
  }
  const inviteMember = async (roomId: string) => {
    await festivalRoomStore.inviteMember(roomId).catch(() => {})
  }
  const joinRoom = async (roomId: string) => {
    await festivalRoomStore.joinRoom(roomId).catch(() => {})
  }
  const leaveRoom = async (roomId: string) => {
    await festivalRoomStore.leaveRoomAction(roomId).catch(() => {})
  }
  const startReadyCheck = async (roomId: string) => {
    await festivalRoomStore.startReadyCheck(roomId).catch(() => {})
  }
  const readyRoom = async (roomId: string) => {
    await festivalRoomStore.readyRoomAction(roomId).catch(() => {})
  }
  const unreadyRoom = async (roomId: string) => {
    await festivalRoomStore.unreadyRoomAction(roomId).catch(() => {})
  }
  const startCountdown = async (roomId: string) => {
    await festivalRoomStore.startCountdown(roomId).catch(() => {})
  }
  const disconnectRoom = async (roomId: string) => {
    await festivalRoomStore.disconnectRoomAction(roomId).catch(() => {})
  }
  const reconnectRoom = async (roomId: string) => {
    await festivalRoomStore.reconnectRoomAction(roomId).catch(() => {})
  }
  const runFestivalLobbyRoomAction = async (action: (roomId: string) => Promise<void>) => {
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    await action(roomId)
  }
  const handleFestivalLobbyStartReadyCheck = async () => {
    await runFestivalLobbyRoomAction(startReadyCheck)
  }
  const handleFestivalLobbyReady = async () => {
    await runFestivalLobbyRoomAction(readyRoom)
  }
  const handleFestivalLobbyUnready = async () => {
    await runFestivalLobbyRoomAction(unreadyRoom)
  }
  const handleFestivalLobbyStartCountdown = async () => {
    await runFestivalLobbyRoomAction(startCountdown)
  }
  const handleFestivalLobbySettle = () => {
    openFestivalSettleConfirm()
  }
  const handleFestivalLobbyCloseRoom = () => {
    openFestivalCloseConfirm()
  }
  const handleFestivalLobbyLeaveRoom = async () => {
    await runFestivalLobbyRoomAction(leaveRoom)
  }
  const handleFestivalLobbyAcceptInvite = async () => {
    await runFestivalLobbyRoomAction(joinRoom)
  }
  const handleFestivalLobbyReconnect = async () => {
    await runFestivalLobbyRoomAction(reconnectRoom)
  }
  const playGameplayAction = async (roomId: string, actionId: string) => {
    await festivalRoomStore.submitGameplayAction(roomId, actionId).catch(() => {})
  }
  const selectFestivalVisualObject = (objectId: string) => {
    selectedFestivalVisualObjectId.value = objectId
  }
  const selectFestivalTrackCell = (payload: FestivalTrackCellPayload) => {
    selectedFestivalVisualTrackId.value = payload.trackId
    selectedFestivalVisualTrackCellId.value = payload.cellId
  }
  const triggerFestivalVisualAction = async (payload: FestivalVisualActionPayload) => {
    selectedFestivalVisualObjectId.value = payload.objectId
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    await playGameplayAction(roomId, payload.actionId)
  }
  const triggerFestivalTrackAction = async (payload: FestivalTrackActionPayload) => {
    selectedFestivalVisualTrackId.value = payload.trackId
    selectedFestivalVisualTrackCellId.value = payload.cellId
    const roomId = festivalRoomStore.myRoom?.id
    if (!roomId) return
    await playGameplayAction(roomId, payload.actionId)
  }
  const loadFriendMemorials = async () => {
    await festivalRoomStore.loadFriendMemorials().catch(() => {})
  }
  const createExpeditionRoom = async () => {
    await expeditionRoomStore.createRoom().catch(() => {})
  }
  const submitExpeditionInvites = async (recipients: string[]) => {
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId || recipients.length === 0) return
    expeditionInviteSubmitting.value = true
    try {
      for (const recipient of recipients) {
        expeditionInviteResults.value = upsertInviteResult(expeditionInviteResults.value, {
          username: recipient,
          status: 'inviting',
          message: '正在发送邀请。',
        })
        expeditionRoomStore.draftInviteUsername = recipient
        expeditionRoomStore.draftInviteSaveId = ''
        try {
          await expeditionRoomStore.inviteMember(roomId)
          expeditionInviteResults.value = upsertInviteResult(expeditionInviteResults.value, {
            username: recipient,
            status: 'invited',
            message: '邀请已发送，等待对方加入。',
          })
        } catch (error) {
          expeditionInviteResults.value = upsertInviteResult(expeditionInviteResults.value, {
            username: recipient,
            status: 'failed',
            message: inviteFailureMessage(error, '邀请没有发出，可以稍后重试。'),
          })
        }
      }
    } finally {
      expeditionRoomStore.draftInviteUsername = ''
      expeditionRoomStore.draftInviteSaveId = ''
      expeditionInviteSubmitting.value = false
    }
  }
  const retryExpeditionInvite = async (recipient: string) => {
    await submitExpeditionInvites([recipient])
  }
  const removeExpeditionInviteResult = (recipient: string) => {
    expeditionInviteResults.value = removeInviteResult(expeditionInviteResults.value, recipient)
  }
  const inviteExpeditionMember = async (roomId: string) => {
    await expeditionRoomStore.inviteMember(roomId).catch(() => {})
  }
  const joinExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.joinRoom(roomId).catch(() => {})
  }
  const leaveExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.leaveRoomAction(roomId).catch(() => {})
  }
  const startExpeditionReadyCheck = async (roomId: string) => {
    await expeditionRoomStore.startReadyCheck(roomId).catch(() => {})
  }
  const readyExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.readyRoomAction(roomId).catch(() => {})
  }
  const unreadyExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.unreadyRoomAction(roomId).catch(() => {})
  }
  const startExpeditionCountdown = async (roomId: string) => {
    await expeditionRoomStore.startCountdown(roomId).catch(() => {})
  }
  const disconnectExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.disconnectRoomAction(roomId).catch(() => {})
  }
  const reconnectExpeditionRoom = async (roomId: string) => {
    await expeditionRoomStore.reconnectRoomAction(roomId).catch(() => {})
  }
  const runExpeditionLobbyRoomAction = async (action: (roomId: string) => Promise<void>) => {
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId) return
    await action(roomId)
  }
  const handleExpeditionLobbyStartReadyCheck = async () => {
    await runExpeditionLobbyRoomAction(startExpeditionReadyCheck)
  }
  const handleExpeditionLobbyReady = async () => {
    await runExpeditionLobbyRoomAction(readyExpeditionRoom)
  }
  const handleExpeditionLobbyUnready = async () => {
    await runExpeditionLobbyRoomAction(unreadyExpeditionRoom)
  }
  const handleExpeditionLobbyStartCountdown = async () => {
    await runExpeditionLobbyRoomAction(startExpeditionCountdown)
  }
  const handleExpeditionLobbySettle = () => {
    openExpeditionSettleConfirm()
  }
  const handleExpeditionLobbyCloseRoom = () => {
    openExpeditionCloseConfirm()
  }
  const handleExpeditionLobbyLeaveRoom = async () => {
    await runExpeditionLobbyRoomAction(leaveExpeditionRoom)
  }
  const handleExpeditionLobbyAcceptInvite = async () => {
    await runExpeditionLobbyRoomAction(joinExpeditionRoom)
  }
  const handleExpeditionLobbyReconnect = async () => {
    await runExpeditionLobbyRoomAction(reconnectExpeditionRoom)
  }
  const playExpeditionGameplayAction = async (roomId: string, actionId: string) => {
    await expeditionRoomStore.submitGameplayAction(roomId, actionId).catch(() => {})
  }
  const triggerExpeditionVisualAction = async (payload: { nodeId: string; actionId: string }) => {
    selectedExpeditionVisualNodeId.value = payload.nodeId
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId) return
    await playExpeditionGameplayAction(roomId, payload.actionId)
  }
  const selectExpeditionTrackCell = (payload: { trackId: string; cellId: string }) => {
    selectedExpeditionVisualTrackId.value = payload.trackId
    selectedExpeditionVisualTrackCellId.value = payload.cellId
  }
  const triggerExpeditionTrackAction = async (payload: { trackId: string; cellId: string; actionId: string }) => {
    selectedExpeditionVisualTrackId.value = payload.trackId
    selectedExpeditionVisualTrackCellId.value = payload.cellId
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId) return
    await playExpeditionGameplayAction(roomId, payload.actionId)
  }
  watch(
    () => route.query.tab,
    tab => {
      activeTab.value = normalizeTab(tab)
    }
  )
  watch(
    () => festivalRoomStore.myRoom?.id,
    () => {
      selectedFestivalVisualObjectId.value = ''
      selectedFestivalVisualTrackId.value = ''
      selectedFestivalVisualTrackCellId.value = ''
    }
  )
  watch(
    () => expeditionRoomStore.myRoom?.id,
    () => {
      selectedExpeditionVisualNodeId.value = ''
      selectedExpeditionVisualTrackId.value = ''
      selectedExpeditionVisualTrackCellId.value = ''
    }
  )
  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      applyInviteRouteDraft()
    }
  )
  watch(
    () => [
      route.query.template,
      route.query.template_id,
      route.query.gameplay,
      route.query.gameplay_template_id,
      route.query.title,
      route.query.source_label,
      route.query.source_feedback,
      route.query.source_context_summary,
    ],
    () => {
      applyFestivalRoomRouteDraft()
    }
  )
  watch(
    () => [
      route.query.tab,
      route.query.expedition_template,
      route.query.expedition_template_id,
      route.query.expedition_gameplay,
      route.query.expedition_gameplay_template_id,
      route.query.expedition_title,
      route.query.template,
      route.query.template_id,
      route.query.gameplay,
      route.query.gameplay_template_id,
      route.query.title,
    ],
    () => {
      applyExpeditionRoomRouteDraft()
    }
  )

  onMounted(() => {
    applyInviteRouteDraft()
    applyFestivalRoomRouteDraft()
    applyExpeditionRoomRouteDraft()
    void refreshFestivalModule()
  })
</script>
