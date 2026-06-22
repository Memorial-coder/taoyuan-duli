<template>
  <div class="space-y-3" data-testid="expedition-room-page">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/20">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">联机远征大厅</p>
          <p class="text-sm text-accent mt-1">组队、准备、出发与结算</p>
          <p class="text-xs text-muted mt-2 leading-5">
            {{ expeditionRoomStore.overview?.bulletin || '这一页先承接远征房间、协作矿洞、组队采集、护送抵运和海域共探的最小闭环。' }}
          </p>
        </div>
        <Button class="shrink-0" :disabled="expeditionRoomStore.loading || expeditionRoomStore.actionRunning" @click="refreshOverview">
          刷新
        </Button>
      </div>
      <p v-if="expeditionRoomStore.errorMessage" class="text-xs text-danger mt-3">{{ expeditionRoomStore.errorMessage }}</p>
    </div>

    <div class="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_320px]" data-testid="expedition-room-desktop-layout">
      <div class="border border-accent/20 rounded-xs bg-bg/10 p-3 xl:order-1" data-testid="expedition-room-left-list">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">创建远征队伍</p>
          <span class="text-[0.625rem] text-muted">L80 第一轮</span>
        </div>
        <div class="space-y-3" data-testid="expedition-room-create-entry">
          <Button
            class="online-action-btn online-action-btn--primary min-h-[44px] w-full justify-center"
            data-testid="online-expedition-room-create-trigger"
            :disabled="expeditionRoomStore.actionRunning"
            @click="openExpeditionRoomWizard"
          >
            {{ '\u521b\u5efa\u8fdc\u5f81\u961f\u4f0d' }}
          </Button>
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10 text-[0.625rem] leading-5 text-muted">
            <p class="text-xs text-accent">{{ '\u5f53\u524d\u8349\u7a3f' }}</p>
            <p class="mt-1">
              {{ expeditionRoomStore.selectedTemplate?.label || '\u5f85\u9009\u62e9\u8def\u7ebf' }}{{ ' \u00b7 ' }}{{ expeditionRoomStore.selectedGameplayTemplate?.label || '\u5f85\u9009\u62e9\u73a9\u6cd5' }}{{ ' \u00b7 ' }}{{ expeditionRoomStore.normalizedDraftMemberLimit }} {{ '\u4eba' }}
            </p>
            <p v-if="expeditionRoomStore.draftTitle.trim()" class="mt-1">{{ '\u6807\u9898\uff1a' }}{{ expeditionRoomStore.draftTitle }}</p>
          </div>
        </div>

        <OnlineTechnicalDetails
          :title="'\u5907\u7528\u521b\u5efa\u8868\u5355'"
          :summary="'\u4fdd\u7559\u65e7\u521b\u5efa\u5165\u53e3\u548c\u6d4b\u8bd5\u94a9\u5b50\uff0c\u4e3b\u6d41\u7a0b\u8bf7\u4f18\u5148\u4f7f\u7528\u521b\u5efa\u5411\u5bfc\u3002'"
        >
        <div class="space-y-3">
          <label class="block">
            <span class="text-[0.625rem] text-muted">远征模板</span>
            <select v-model="expeditionRoomStore.selectedTemplateId" class="online-select mt-1" data-testid="expedition-room-template-select">
              <option v-for="template in expeditionRoomStore.templates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="expeditionRoomStore.selectedTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ expeditionRoomStore.selectedTemplate.label }}</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ expeditionRoomStore.selectedTemplate.summary }}</p>
            <p class="text-[0.625rem] text-muted mt-1">默认人数上限：{{ expeditionRoomStore.selectedTemplate.default_member_limit }} 人</p>
          </div>
          <label class="block">
            <span class="text-[0.625rem] text-muted">玩法模板</span>
            <select v-model="expeditionRoomStore.selectedGameplayTemplateId" class="online-select mt-1" data-testid="expedition-room-gameplay-select">
              <option v-for="template in expeditionRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="expeditionRoomStore.selectedGameplayTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ expeditionRoomStore.selectedGameplayTemplate.label }}</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ expeditionRoomStore.selectedGameplayTemplate.summary }}</p>
            <p class="text-[0.625rem] text-muted mt-1">{{ expeditionRoomStore.selectedGameplayTemplate.objective_label }} 目标 {{ expeditionRoomStore.selectedGameplayTemplate.default_target }}</p>
          </div>
          <label class="block">
            <span class="text-[0.625rem] text-muted">房间标题</span>
            <input
              v-model="expeditionRoomStore.draftTitle"
              maxlength="30"
              class="online-input mt-1"
              data-testid="expedition-room-title-input"
              placeholder="例如：高地补给接力"
            />
          </label>
          <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4" data-testid="expedition-room-member-limit-group">
            <Button
              v-for="limit in expeditionRoomStore.memberLimitOptions"
              :key="limit"
              class="online-action-btn online-action-btn--compact min-h-[44px] justify-center"
              :class="expeditionRoomStore.draftMemberLimit === limit ? 'online-action-btn--primary' : ''"
              :disabled="expeditionRoomStore.actionRunning"
              @click="expeditionRoomStore.draftMemberLimit = limit"
            >
              {{ limit }} {{ '\u4eba' }}
            </Button>
          </div>
          <Button class="online-action-btn online-action-btn--primary w-full" data-testid="expedition-room-create-submit" :disabled="expeditionRoomStore.actionRunning" @click="createRoom">
            创建远征房间
          </Button>
        </div>
        </OnlineTechnicalDetails>
      </div>

      <div class="border border-accent/20 rounded-xs bg-bg/10 p-3 xl:order-2" data-testid="expedition-room-main-stage">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">我的远征大厅</p>
          <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : '空闲中' }}</span>
        </div>
        <div v-if="expeditionRoomStore.myRoom" class="space-y-2">
          <OnlineVisualRoomShell
            :title="expeditionRoomStore.myRoom.title"
            :subtitle="`${expeditionRoomStore.myRoom.template_label} / ${expeditionRoomStore.myRoom.gameplay.template_label} / ${expeditionRoomStore.myRoom.joined_member_count}/${expeditionRoomStore.myRoom.member_limit} 人`"
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
            :members="expeditionRoomShellMembers"
            :ready-member-count="expeditionRoomStore.myRoom.ready_member_count"
            :member-limit="expeditionRoomStore.myRoom.member_limit"
            :reward-preview="expeditionRoomRewardPreview"
            :settlement-records="expeditionRoomSettlementRecords"
            :collaboration-progress-label="expeditionRoomCollaborationProgressLabel"
            :collaboration-progress-percent="expeditionRoomStore.myRoom.gameplay.progress_percent"
            :collaboration-score-label="expeditionRoomCollaborationScoreLabel"
            :collaboration-roles="expeditionRoomCollaborationRoles"
            :collaboration-feedback="expeditionRoomCollaborationFeedback"
          >
            <template #actions>
              <Button
                class="online-action-btn online-action-btn--primary min-h-[44px] justify-center"
                data-testid="online-expedition-room-lobby-trigger"
                :disabled="expeditionRoomStore.actionRunning"
                @click="openExpeditionRoomLobby"
              >
                打开准备大厅
              </Button>
            </template>
          </OnlineVisualRoomShell>
          <OnlineTechnicalDetails
            v-if="expeditionRoomBackupActionsVisible"
            title="备用房间操作"
            summary="备用准备、倒计时、结算和关闭入口默认收起；主流程请打开准备大厅。"
          >
            <div class="grid gap-2 sm:grid-cols-2" data-testid="expedition-room-lobby-backup-actions">
              <Button
                v-if="expeditionRoomStore.myRoom.can_host_ready_check"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-ready-check-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="startReadyCheck(expeditionRoomStore.myRoom.id)"
              >
                开始准备
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_ready"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-ready-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="readyRoom(expeditionRoomStore.myRoom.id)"
              >
                我已准备
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_unready"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="expeditionRoomStore.actionRunning"
                @click="unreadyRoom(expeditionRoomStore.myRoom.id)"
              >
                取消准备
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_host_start_countdown"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-start-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="startCountdown(expeditionRoomStore.myRoom.id)"
              >
                开始倒计时
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_reconnect"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="expeditionRoomStore.actionRunning"
                @click="reconnectRoom(expeditionRoomStore.myRoom.id)"
              >
                恢复连接
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_host_settle"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-settle-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="openExpeditionSettleConfirm"
              >
                撤离并结算
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_host_close"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-close-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="openExpeditionCloseConfirm"
              >
                {{ expeditionRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_leave"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="expeditionRoomStore.actionRunning"
                @click="leaveRoom(expeditionRoomStore.myRoom.id)"
              >
                离开房间
              </Button>
            </div>
          </OnlineTechnicalDetails>
          <OnlineTechnicalDetails
            v-if="expeditionRoomStore.myRoom.can_disconnect && saveStore.isBuiltInSampleRuntime"
            title="连接恢复"
            summary="连接中断时的恢复入口默认收起，主流程请优先使用准备、倒计时和结算。"
          >
            <Button
              class="online-action-btn online-action-btn--compact justify-center"
              data-testid="expedition-room-disconnect-submit"
              :disabled="expeditionRoomStore.actionRunning"
              @click="disconnectRoom(expeditionRoomStore.myRoom.id)"
            >
              模拟连接中断
            </Button>
          </OnlineTechnicalDetails>
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ expeditionRoomStore.myRoom.title }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ expeditionRoomStore.myRoom.template_label }} / {{ expeditionRoomStore.myRoom.gameplay.template_label }} / {{ expeditionRoomStore.myRoom.joined_member_count }}/{{ expeditionRoomStore.myRoom.member_limit }} 人</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.myRoom.state_label }}</span>
            </div>
            <p v-if="expeditionRoomStore.myRoom.state_reason" class="text-[0.625rem] text-warning mt-1">{{ expeditionRoomStore.myRoom.state_reason }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.template_label }}</p>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ expeditionRoomStore.myRoom.gameplay.template_summary }}</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ expeditionRoomStore.myRoom.gameplay.phase_label }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2">{{ expeditionRoomStore.myRoom.gameplay.progress_text }} / {{ expeditionRoomStore.myRoom.gameplay.score_label }} {{ expeditionRoomStore.myRoom.gameplay.score_value }}</p>
            <p v-if="expeditionRoomStore.myRoom.gameplay.last_action_summary" class="text-[0.625rem] text-success mt-1 leading-4">
              {{ expeditionRoomStore.myRoom.gameplay.last_action_summary }}
            </p>
          </div>

          <VisualMapBoard
            v-if="expeditionVisualMapNodes.length > 0"
            :nodes="expeditionVisualMapNodes"
            :selected-node-id="selectedExpeditionVisualNodeId"
            :current-node-id="currentExpeditionVisualNodeId"
            :revision="expeditionRoomStore.myRoom.visual_state.revision"
            :recent-feedback="expeditionRoomStore.myRoom.visual_state.recent_feedback || expeditionRoomStore.myRoom.gameplay.cavern_state?.recent_feedback || ''"
            :action-running="expeditionRoomStore.actionRunning"
            :action-labels="expeditionVisualActionLabels"
            @select-node="selectedExpeditionVisualNodeId = $event"
            @trigger-action="playGameplayAction(expeditionRoomStore.myRoom.id, $event.actionId)"
          />

          <VisualTrackBoard
            v-if="showExpeditionTrackBoard"
            :tracks="expeditionVisualTracks"
            :selected-track-id="selectedExpeditionVisualTrackId"
            :selected-cell-id="selectedExpeditionVisualTrackCellId"
            :recent-feedback="expeditionRoomStore.myRoom.visual_state.recent_feedback || expeditionRoomStore.myRoom.gameplay.last_action_summary || ''"
            :action-running="expeditionRoomStore.actionRunning"
            :action-labels="expeditionVisualActionLabels"
            @select-cell="selectExpeditionTrackCell"
            @trigger-action="triggerExpeditionTrackAction"
          />

          <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state" class="space-y-2">
            <div class="border border-accent/15 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.round_text }}</p>
                  <p class="text-[0.625rem] text-text mt-1 leading-4">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.summary }}</p>
                </div>
                <span class="shrink-0 text-[0.625rem] text-warning">风险 {{ expeditionRoomStore.myRoom.gameplay.cavern_state.risk_text }}</span>
              </div>
              <div class="grid gap-2 sm:grid-cols-2 mt-2">
                <p class="text-[0.625rem] text-muted leading-4">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.risk_hint }}</p>
                <p class="text-[0.625rem] text-muted leading-4">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.resource_hint }}</p>
              </div>
              <p v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback" class="text-[0.625rem] text-success mt-2 leading-4">
                {{ expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback }}
              </p>
              <div
                v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records.length > 0 || expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_state === 'confirmed'"
                class="mt-2 grid gap-2 sm:grid-cols-2"
              >
                <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records.length > 0" data-testid="expedition-cavern-combo-summary" class="border border-success/20 rounded-xs bg-success/5 px-2 py-2">
                  <p class="text-[0.625rem] text-success">节点组合收益</p>
                  <div class="mt-1 space-y-1">
                    <p
                      v-for="combo in expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records"
                      :key="`${expeditionRoomStore.myRoom.id}-${combo.combo_id}`"
                      class="text-[0.625rem] leading-4 text-muted"
                    >
                      {{ combo.label }}：{{ combo.summary }} · 采集值 +{{ combo.score_delta }} · 风险 {{ formatSignedCavernDelta(combo.risk_delta) }}{{ combo.resource_delta_text ? ` · ${combo.resource_delta_text}` : '' }}
                    </p>
                  </div>
                </div>
                <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_state === 'confirmed'" data-testid="expedition-cavern-withdrawal-summary" class="border border-warning/20 rounded-xs bg-warning/5 px-2 py-2">
                  <p class="text-[0.625rem] text-warning">提前收尾</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                    {{ expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_summary || '撤离点已锁定，房主可以进入结算。' }}
                  </p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="expedition-cavern-withdrawal-locked-combos">
                    {{ cavernWithdrawalLockedComboLabel(expeditionRoomStore.myRoom.gameplay.cavern_state) }}
                  </p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                    {{ cavernWithdrawalActorLabel(expeditionRoomStore.myRoom.gameplay.cavern_state) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted mb-2">队伍资源</p>
                <div class="grid grid-cols-2 gap-2">
                  <div v-for="resource in expeditionRoomStore.myRoom.gameplay.cavern_state.team_resources" :key="resource.id" class="border border-accent/10 rounded-xs px-2 py-1">
                    <p class="text-[0.625rem] text-accent">{{ resource.label }}</p>
                    <p class="text-xs text-text mt-1">{{ resource.value }} / {{ resource.max_value }}</p>
                  </div>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-[0.625rem] text-muted mb-2">职责分工</p>
                <div class="space-y-1">
                  <div v-for="role in expeditionRoomStore.myRoom.gameplay.cavern_state.role_assignments" :key="role.username" class="flex items-start justify-between gap-2">
                    <span class="min-w-0 text-[0.625rem] text-text truncate">{{ role.display_name }}</span>
                    <span class="shrink-0 text-[0.625rem] text-accent">{{ role.role_label }}</span>
                  </div>
                </div>
                <p v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.my_role" class="text-[0.625rem] text-muted mt-2 leading-4">
                  我的职责：{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_label }}，{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_summary }}
                </p>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">邀请玩家</p>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">打开邀请面板，可批量输入并查看每位玩家的邀请结果。</p>
              </div>
              <Button
                class="online-action-btn online-action-btn--primary shrink-0 justify-center"
                data-testid="online-expedition-room-invite-trigger"
                :disabled="expeditionRoomStore.actionRunning || expeditionInviteSubmitting"
                @click="openExpeditionInvitePanel"
              >
                邀请玩家
              </Button>
            </div>
          </div>

          <OnlineTechnicalDetails
            title="备用邀请表单"
            summary="备用单人邀请入口默认收起；主流程请使用邀请面板。"
          >
            <label class="block">
              <span class="text-[0.625rem] text-muted">邀请玩家</span>
              <div class="online-action-row mt-1">
                <input
                  v-model="expeditionRoomStore.draftInviteUsername"
                  class="online-input flex-1"
                  data-testid="expedition-room-invite-username-input"
                  placeholder="输入用户名"
                />
                <Button
                  class="online-action-btn online-action-btn--primary"
                  data-testid="expedition-room-invite-submit"
                  :disabled="expeditionRoomStore.actionRunning"
                  @click="inviteMember(expeditionRoomStore.myRoom.id)"
                >
                  邀请
                </Button>
              </div>
            </label>
          </OnlineTechnicalDetails>

          <div
            v-if="showExpeditionFallbackActions"
            class="space-y-2"
          >
            <p class="text-[0.625rem] text-muted">备用玩法动作</p>
            <div
              v-for="action in expeditionRoomStore.myRoom.gameplay.available_actions"
              :key="`${expeditionRoomStore.myRoom.id}-${action.id}`"
              class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
            >
              <div class="flex items-start gap-2">
                <Button class="online-action-btn online-action-btn--primary shrink-0" :disabled="expeditionRoomStore.actionRunning || !action.can_use" @click="playGameplayAction(expeditionRoomStore.myRoom.id, action.id)">
                  {{ action.label }}
                </Button>
                <div class="min-w-0">
                  <p class="text-[0.625rem] text-muted leading-4">{{ action.summary }}</p>
                  <p v-if="action.round_effect" class="text-[0.625rem] text-accent mt-1 leading-4">{{ action.round_effect }}</p>
                  <p v-if="action.required_role_label || action.risk_delta_text || action.resource_delta_text" class="text-[0.625rem] text-muted mt-1 leading-4">
                    <span v-if="action.required_role_label">职责 {{ action.required_role_label }}</span>
                    <span v-if="action.risk_delta_text"> / {{ action.risk_delta_text }}</span>
                    <span v-if="action.resource_delta_text"> / {{ action.resource_delta_text }}</span>
                  </p>
                </div>
              </div>
              <p v-if="!action.can_use && action.disabled_reason" class="text-[0.625rem] text-muted mt-1">{{ action.disabled_reason }}</p>
            </div>
          </div>

          <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state?.round_log.length" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-[0.625rem] text-muted mb-2">回合日志</p>
            <div class="space-y-2">
              <div v-for="entry in expeditionRoomStore.myRoom.gameplay.cavern_state.round_log.slice(0, 5)" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="min-w-0 text-[0.625rem] text-accent">第 {{ entry.round_number }} 回合 · {{ entry.action_label }}</p>
                  <span v-if="entry.role_label" class="shrink-0 text-[0.625rem] text-muted">{{ entry.role_label }}</span>
                </div>
                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
              </div>
            </div>
          </div>

        </div>
        <p v-else class="text-xs text-muted leading-5">当前没有进行中的远征房间。可以先创建自己的房间，或者从下方邀请列表加入队伍。</p>
      </div>

      <div class="border border-accent/20 rounded-xs bg-bg/10 p-3 xl:order-3" data-testid="expedition-room-right-status">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">远征状态侧栏</p>
          <span class="text-[0.625rem] text-muted">320px</span>
        </div>
        <div class="mt-3 space-y-2 text-[0.625rem] leading-4 text-muted" data-testid="expedition-room-desktop-status-summary">
          <p>当前房间：{{ expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : '空闲中' }}</p>
          <p>待处理邀请：{{ expeditionRoomStore.invitedRooms.length }} 条</p>
          <p>可见房间：{{ expeditionRoomStore.visibleRooms.length }} 间</p>
          <p>最近结算：{{ expeditionRoomStore.recentReceipts.length }} 条</p>
        </div>
      </div>
    </div>

    <div v-if="expeditionRoomStore.invitedRooms.length > 0" data-testid="expedition-invited-rooms" class="border border-warning/20 rounded-xs p-3 bg-warning/5">
      <p class="text-sm text-warning mb-2">待处理邀请</p>
      <div class="space-y-2">
        <div
          v-for="room in expeditionRoomStore.invitedRooms"
          :key="room.id"
          :data-testid="`expedition-invited-room-${room.id}`"
          class="border border-warning/15 rounded-xs px-2 py-2 bg-bg/10"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-text">{{ room.title }}</p>
              <p class="text-[0.625rem] text-muted mt-1">{{ room.template_label }} / {{ room.gameplay.template_label }} / 房主 {{ room.host_display_name }}</p>
            </div>
            <Button :disabled="expeditionRoomStore.actionRunning || !room.can_join" @click="joinRoom(room.id)">
              加入
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">可见房间</p>
        <div v-if="expeditionRoomStore.visibleRooms.length === 0" class="text-xs text-muted">当前还没有你能查看的远征房间。</div>
        <div v-else class="space-y-2">
          <div v-for="room in expeditionRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ room.title }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ room.template_label }} / {{ room.gameplay.template_label }} / {{ room.state_label }} / {{ room.joined_member_count }}/{{ room.member_limit }} 人</p>
              </div>
              <span class="text-[0.625rem] text-muted">{{ room.ready_member_count }} 已准备</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2">{{ room.gameplay.progress_text }} / {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">最近结算</p>
        <div v-if="expeditionRoomStore.recentReceipts.length === 0" class="text-xs text-muted leading-5">
          远征结算会优先写回铜钱和材料，这里回看最近的成员结算记录。
        </div>
        <div v-else class="space-y-2">
          <div v-for="receipt in expeditionRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-text">{{ receipt.room_title }}</p>
                <p class="text-[0.625rem] text-muted mt-1">{{ receipt.template_label }} / 槽位 {{ receipt.target_slot + 1 }}</p>
              </div>
              <span class="text-[0.625rem] text-accent">{{ receipt.status_label }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ receipt.summary }}</p>
            <div v-if="receipt.route_replay?.kind" class="mt-2 border border-accent/10 bg-bg/20 px-2 py-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[0.625rem] text-accent">{{ receipt.route_replay.title }}</p>
                <span class="text-[0.625rem] text-warning">风险峰值 {{ receipt.route_replay.risk_peak.value }}</span>
              </div>
              <p class="mt-1 text-[0.625rem] text-text leading-4">
                {{ receipt.route_replay.route_nodes.map(node => node.label).join(' -> ') }}
              </p>
              <p class="mt-1 text-[0.625rem] text-muted leading-4">{{ receipt.route_replay.summary }}</p>
              <div v-if="receipt.route_replay.highlight_nodes.length > 0" class="mt-2 space-y-1">
                <p v-for="highlight in receipt.route_replay.highlight_nodes.slice(0, 2)" :key="`${receipt.id}-${highlight.node_id}-${highlight.label}`" class="text-[0.625rem] text-muted leading-4">
                  {{ highlight.label }}：{{ highlight.summary }}
                </p>
              </div>
              <div v-if="receipt.route_replay.member_contributions.length > 0" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="contribution in receipt.route_replay.member_contributions.slice(0, 4)"
                  :key="`${receipt.id}-${contribution.username}`"
                  class="border border-accent/10 px-1.5 py-0.5 text-[0.625rem] text-muted"
                >
                  {{ contribution.display_name }} {{ contribution.role_label || '队员' }} · {{ contribution.action_count }} 次
                </span>
              </div>
              <div v-if="receipt.route_replay.combo_records.length > 0" data-testid="expedition-cavern-receipt-combos" class="mt-2 space-y-1 border-l border-success/30 pl-2">
                <p v-for="combo in receipt.route_replay.combo_records" :key="`${receipt.id}-${combo.combo_id}`" class="text-[0.625rem] text-muted leading-4">
                  {{ combo.label }}：采集值 +{{ combo.score_delta }} · 风险 {{ formatSignedCavernDelta(combo.risk_delta) }}{{ combo.resource_delta_text ? ` · ${combo.resource_delta_text}` : '' }}
                </p>
              </div>
              <p v-if="receipt.route_replay.withdrawal_state === 'confirmed'" data-testid="expedition-cavern-receipt-withdrawal" class="mt-2 text-[0.625rem] text-muted leading-4">
                提前收尾：{{ receipt.route_replay.withdrawal_summary || '撤离点已确认。' }} · {{ routeReplayWithdrawalLockedComboLabel(receipt.route_replay) }} · {{ routeReplayWithdrawalActorLabel(receipt.route_replay) }}
              </p>
              <p v-if="routeReplayCargoIntegrityText(receipt.route_replay)" data-testid="expedition-escort-receipt-cargo-integrity" class="mt-2 text-[0.625rem] text-muted leading-4">
                货物完整度：{{ routeReplayCargoIntegrityText(receipt.route_replay) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <div v-if="showExpeditionSettleConfirm" class="contents" data-testid="expedition-room-settle-confirm">
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

    <div v-if="showExpeditionCloseConfirm" class="contents" data-testid="expedition-room-close-confirm">
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
      description="可以一次输入多名玩家；失败项会保留在结果里，方便稍后重试。"
      :existing-members="expeditionInviteExistingMembers"
      :recent-players="expeditionInviteSelectablePlayers"
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
  import Button from '@/components/game/Button.vue'
  import OnlineConfirmActionDialog from '@/components/game/online/OnlineConfirmActionDialog.vue'
  import OnlineInvitePanel, { type OnlineInvitePlayerGroup, type OnlineInviteRecentPlayer, type OnlineInviteResult } from '@/components/game/online/OnlineInvitePanel.vue'
  import OnlineRoomLobbyDialog, { type OnlineRoomLobbyRoom } from '@/components/game/online/OnlineRoomLobbyDialog.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import OnlineVisualRoomShell, {
    type OnlineVisualRoomShellCollaborationFeedback,
    type OnlineVisualRoomShellCollaborationRole,
  } from '@/components/game/online/OnlineVisualRoomShell.vue'
  import VisualMapBoard from '@/components/game/online/VisualMapBoard.vue'
  import OnlineRoomWizard, { type OnlineRoomWizardDraft } from '@/components/game/online/OnlineRoomWizard.vue'
  import VisualTrackBoard from '@/components/game/online/VisualTrackBoard.vue'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useSocialStore } from '@/stores/useSocialStore'
  import type { OnlineRelationCard } from '@/utils/onlineProfileApi'
  import type {
    ExpeditionCavernRoundLogSnapshot,
    ExpeditionCavernRoleSnapshot,
    ExpeditionGameplayContributionSnapshot,
  } from '@/utils/expeditionRoomApi'
  import type { OnlineVisualNode, OnlineVisualTrack } from '@/types/onlineVisual'

  const route = useRoute()
  const expeditionRoomStore = useExpeditionRoomStore()
  const saveStore = useSaveStore()
  const socialStore = useSocialStore()
  const selectedExpeditionVisualNodeId = ref('')
  const selectedExpeditionVisualTrackId = ref('')
  const selectedExpeditionVisualTrackCellId = ref('')

  const showExpeditionRoomWizard = ref(false)
  const showExpeditionRoomLobby = ref(false)
  const showExpeditionInvitePanel = ref(false)
  const expeditionConfirmAction = ref<'settle' | 'close' | ''>('')
  const expeditionInviteSubmitting = ref(false)
  const expeditionInviteResults = ref<OnlineInviteResult[]>([])
  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const applyInviteRouteDraft = () => {
    const targetUsername = getRouteQueryText(route.query.target_username)
    const targetSaveId = getRouteQueryText(route.query.target_save_id)
    if (targetUsername) expeditionRoomStore.draftInviteUsername = targetUsername
    if (targetSaveId) expeditionRoomStore.draftInviteSaveId = targetSaveId
  }

  const refreshOverview = async () => {
    await expeditionRoomStore.refreshOverview().catch(() => {})
  }

  const createMockCavernNodes = (): OnlineVisualNode[] => {
    const room = expeditionRoomStore.myRoom
    if (!room || room.gameplay_template_id !== 'expedition_cavern') return []
    const actions = room.gameplay.available_actions.map(action => action.id)
    return [
      {
        id: 'mock_cavern_entrance',
        label: '洞口',
        kind: 'entrance',
        x: 10,
        y: 52,
        state: 'resolved',
        connected_node_ids: ['mock_cavern_crossroad'],
        event_id: 'cavern_entrance',
        available_action_ids: [],
        owner_username: '',
        claimed_by: '',
        risk_preview: '撤离路线已确认。',
        reward_preview: '保留当前探索成果。',
        resource_cost_preview: {},
        resource_reward_preview: {},
      },
      {
        id: 'mock_cavern_crossroad',
        label: '岔路',
        kind: 'crossroad',
        x: 28,
        y: 42,
        state: 'active',
        connected_node_ids: ['mock_cavern_entrance', 'mock_cavern_ore', 'mock_cavern_support'],
        event_id: room.gameplay.cavern_state?.current_event.id || 'cavern_current_event',
        available_action_ids: actions.slice(0, 2),
        owner_username: '',
        claimed_by: '',
        risk_preview: room.gameplay.cavern_state?.current_event.risk_hint || '继续推进会改变风险。',
        reward_preview: room.gameplay.cavern_state?.current_event.resource_hint || '队伍资源会随行动变化。',
        resource_cost_preview: {},
        resource_reward_preview: {},
      },
      {
        id: 'mock_cavern_ore',
        label: '矿脉',
        kind: 'ore_vein',
        x: 52,
        y: 30,
        state: actions.length > 0 ? 'available' : 'locked',
        connected_node_ids: ['mock_cavern_crossroad', 'mock_cavern_cache'],
        event_id: 'cavern_glimmering_vein',
        available_action_ids: actions.slice(0, 3),
        owner_username: '',
        claimed_by: '',
        risk_preview: '采集会提高塌方和迷路风险。',
        reward_preview: '可能带回矿石、拓片或队伍补给。',
        resource_cost_preview: { torch: 1 },
        resource_reward_preview: { ore: 2 },
      },
      {
        id: 'mock_cavern_support',
        label: '塌方点',
        kind: 'support',
        x: 48,
        y: 62,
        state: 'danger',
        connected_node_ids: ['mock_cavern_crossroad', 'mock_cavern_exit'],
        event_id: 'cavern_loose_rocks',
        available_action_ids: actions.slice(0, 2),
        owner_username: '',
        claimed_by: '',
        risk_preview: '支护失败会推高全队风险。',
        reward_preview: '处理后可打开安全通路。',
        resource_cost_preview: { rope: 1 },
        resource_reward_preview: { marker: 1 },
      },
      {
        id: 'mock_cavern_cache',
        label: '暗室',
        kind: 'cache',
        x: 74,
        y: 34,
        state: 'reward',
        connected_node_ids: ['mock_cavern_ore', 'mock_cavern_exit'],
        event_id: 'cavern_hidden_cache',
        available_action_ids: actions.slice(0, 1),
        owner_username: '',
        claimed_by: '',
        risk_preview: '打开前最好确认撤离路线。',
        reward_preview: '可能获得额外纪念物。',
        resource_cost_preview: {},
        resource_reward_preview: { memory: 1 },
      },
      {
        id: 'mock_cavern_exit',
        label: '撤离点',
        kind: 'exit',
        x: 88,
        y: 54,
        state: 'exit',
        connected_node_ids: ['mock_cavern_support', 'mock_cavern_cache'],
        event_id: 'cavern_exit',
        available_action_ids: actions.slice(-1),
        owner_username: '',
        claimed_by: '',
        risk_preview: '可提前收尾。',
        reward_preview: '保住已采集收益并进入结算。',
        resource_cost_preview: {},
        resource_reward_preview: {},
      },
    ]
  }

  const expeditionVisualMapNodes = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    if (room.gameplay_template_id === 'expedition_escort' && room.visual_state.board_type === 'track') {
      return createEscortConvoyMapNodes(expeditionVisualTracks.value)
    }
    if (room.visual_state.board_type !== 'map') return []
    if (room.visual_state.nodes.length > 0) return room.visual_state.nodes
    return createMockCavernNodes()
  })

  const currentExpeditionVisualNodeId = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return ''
    const nodes = expeditionVisualMapNodes.value
    if (room.visual_state.selected_visual_id && nodes.some(node => node.id === room.visual_state.selected_visual_id)) {
      return room.visual_state.selected_visual_id
    }
    return nodes.find(node => node.state === 'active')?.id || ''
  })

  const hasExpeditionVisualNodeActions = computed(() => expeditionVisualMapNodes.value
    .some(node => node.available_action_ids.length > 0))

  const expeditionVisualTracks = computed<OnlineVisualTrack[]>(() => {
    const room = expeditionRoomStore.myRoom
    if (!room || room.visual_state.board_type !== 'track') return []
    return room.visual_state.tracks.map(track => ({
      ...track,
      cells: track.cells.map(cell => ({
        ...cell,
        available_action_ids: cell.available_action_ids.filter(actionId =>
          room.gameplay.available_actions.some(action => action.id === actionId && action.can_use)
        ),
      })),
    }))
  })

  const showExpeditionTrackBoard = computed(() => expeditionVisualTracks.value.some(track => track.cells.length > 0))

  const hasExpeditionVisualTrackActions = computed(() => expeditionVisualTracks.value
    .some(track => track.cells.some(cell => cell.available_action_ids.length > 0)))

  const createEscortConvoyMapNodes = (tracks: OnlineVisualTrack[]): OnlineVisualNode[] => {
    const track = tracks.find(entry => entry.kind === 'escort_convoy') || tracks[0]
    if (!track || track.cells.length === 0) return []
    const convoyTeam = track.teams[0]
    const positionIndex = Math.max(0, Math.floor(Number(convoyTeam?.position_index) || 0))
    const sortedCells = [...track.cells].sort((left, right) => left.index - right.index)
    const stepWidth = sortedCells.length > 1 ? 76 / (sortedCells.length - 1) : 0
    return sortedCells.map((cell, index) => {
      const hasConvoy = (cell.occupant_team_ids || []).includes(convoyTeam?.team_id || '')
      const isPast = cell.index < positionIndex
      const nextCell = sortedCells[index + 1]
      const previousCell = sortedCells[index - 1]
      const connectedNodeIds = [previousCell?.id, nextCell?.id].filter(Boolean) as string[]
      const state: OnlineVisualNode['state'] = hasConvoy
        ? 'active'
        : isPast
          ? 'resolved'
          : cell.kind === 'finish'
            ? 'exit'
            : cell.kind === 'risk'
              ? 'danger'
              : cell.kind === 'boost'
                ? 'reward'
                : 'available'
      return {
        id: cell.id,
        label: cell.label,
        kind: `escort_${cell.kind}`,
        x: Math.min(92, Math.max(8, 12 + stepWidth * index)),
        y: index % 2 === 0 ? 42 : 58,
        state,
        connected_node_ids: connectedNodeIds,
        event_id: cell.event_id,
        available_action_ids: cell.available_action_ids,
        owner_username: '',
        claimed_by: hasConvoy ? (convoyTeam?.label || '车队') : '',
        risk_preview: cell.risk_preview,
        reward_preview: cell.reward_preview,
        resource_cost_preview: {},
        resource_reward_preview: {},
      }
    })
  }

  const hasPrimaryExpeditionVisualActions = computed(() =>
    (expeditionVisualMapNodes.value.length > 0 && hasExpeditionVisualNodeActions.value)
    || (showExpeditionTrackBoard.value && hasExpeditionVisualTrackActions.value)
  )

  const showExpeditionFallbackActions = computed(() =>
    (expeditionRoomStore.myRoom?.gameplay.available_actions.length ?? 0) > 0 && !hasPrimaryExpeditionVisualActions.value
  )

  const expeditionRoomVisualContentLabel = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return '远征可视化内容尚未载入。'
    if (showExpeditionTrackBoard.value) return '远征轨道或护送路线作为主入口，轨道格动作会提交到当前远征房间。'
    if (expeditionVisualMapNodes.value.length > 0) return '矿洞节点地图作为主入口，撤离点、采集、支护和探路都从节点动作提交。'
    return '当前房间没有可用地图或轨道热区，备用操作会作为主入口。'
  })

  const expeditionRoomFallbackEntryLabel = '远征备用操作'
  const expeditionRoomFallbackEntryHint = '当地图 / 轨道没有可用动作或可视化内容缺失时，下方备用操作继续提交同一远征行动；结算和关闭按钮仍在房间操作区。'

  const expeditionVisualActionLabels = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return {}
    return Object.fromEntries(room.gameplay.available_actions.map(action => [action.id, action.label]))
  })

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

  const fallbackExpeditionCollaborationRoles = [
    { id: 'gather', label: '采集', summary: '负责探索节点、收集资源和标记路线收益。' },
    { id: 'escort', label: '护送 / 战斗', summary: '负责遭遇处理、风险压制和护送安全。' },
    { id: 'submit', label: '加工 / 提交', summary: '负责整备补给、提交目标和触发撤离。' },
    { id: 'support', label: '加成 / 支援', summary: '负责连携加成、补位和降低失败损失。' },
  ]
  const expeditionContributionLabel = (contribution?: ExpeditionGameplayContributionSnapshot) => {
    if (!contribution) return ''
    return `${contribution.action_count} 次 · ${contribution.progress_value} 贡献`
  }
  const expeditionContributionByUser = (contributions: ExpeditionGameplayContributionSnapshot[]) =>
    new Map(contributions.map(contribution => [contribution.username, contribution]))
  const buildAssignedExpeditionRoles = (
    assignments: ExpeditionCavernRoleSnapshot[],
    contributions: ExpeditionGameplayContributionSnapshot[],
  ): OnlineVisualRoomShellCollaborationRole[] => {
    const contributionMap = expeditionContributionByUser(contributions)
    return assignments.slice(0, 4).map(role => {
      const contribution = contributionMap.get(role.username)
      return {
        id: `${role.username}-${role.role_id}`,
        label: role.role_label,
        ownerLabel: role.display_name || role.username,
        summary: role.role_summary || contribution?.last_action_label || '负责本轮远征目标的一部分。',
        statusLabel: expeditionContributionLabel(contribution) || '待行动',
      }
    })
  }
  const buildFallbackExpeditionRoles = (
    members: NonNullable<typeof expeditionRoomStore.myRoom>['members'],
    contributions: ExpeditionGameplayContributionSnapshot[],
  ): OnlineVisualRoomShellCollaborationRole[] => {
    const contributionMap = expeditionContributionByUser(contributions)
    return members.slice(0, 4).map((member, index) => {
      const role = fallbackExpeditionCollaborationRoles[index % fallbackExpeditionCollaborationRoles.length]!
      const contribution = contributionMap.get(member.username)
      return {
        id: `${member.username}-${role.id}`,
        label: role.label,
        ownerLabel: member.display_name || member.username,
        summary: role.summary,
        statusLabel: expeditionContributionLabel(contribution) || member.status_label,
      }
    })
  }
  const pushUniqueExpeditionFeedback = (
    entries: OnlineVisualRoomShellCollaborationFeedback[],
    seen: Set<string>,
    entry: OnlineVisualRoomShellCollaborationFeedback,
  ) => {
    const key = `${entry.label}-${entry.summary || ''}`
    if (!entry.label || !entry.summary || seen.has(key)) return
    seen.add(key)
    entries.push(entry)
  }
  const logToExpeditionFeedback = (entry: ExpeditionCavernRoundLogSnapshot): OnlineVisualRoomShellCollaborationFeedback => ({
    id: `expedition-log-${entry.id}`,
    label: [entry.actor_display_name, entry.action_label].filter(Boolean).join('完成了') || entry.role_label || '队友行动',
    summary: entry.summary,
    tone: 'success',
  })
  const expeditionRoomCollaborationProgressLabel = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return ''
    return `${room.gameplay.objective_label} · ${room.gameplay.progress_text}`
  })
  const expeditionRoomCollaborationScoreLabel = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return ''
    return [
      `${room.gameplay.score_label} ${room.gameplay.score_value}`,
      room.gameplay.cavern_state?.risk_text ? `风险 ${room.gameplay.cavern_state.risk_text}` : '',
    ].filter(Boolean).join(' · ')
  })
  const expeditionRoomCollaborationRoles = computed<OnlineVisualRoomShellCollaborationRole[]>(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const assignments = room.gameplay.cavern_state?.role_assignments ?? []
    if (assignments.length > 0) return buildAssignedExpeditionRoles(assignments, room.gameplay.contributions)
    return buildFallbackExpeditionRoles(room.members, room.gameplay.contributions)
  })
  const expeditionRoomCollaborationFeedback = computed<OnlineVisualRoomShellCollaborationFeedback[]>(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const entries: OnlineVisualRoomShellCollaborationFeedback[] = []
    const seen = new Set<string>()
    const cavernState = room.gameplay.cavern_state
    pushUniqueExpeditionFeedback(entries, seen, {
      id: 'expedition-recent-feedback',
      label: '队伍反馈',
      summary: cavernState?.recent_feedback || room.visual_state.recent_feedback,
      tone: 'success',
    })
    pushUniqueExpeditionFeedback(entries, seen, {
      id: 'expedition-last-action',
      label: room.gameplay.last_actor_display_name ? `${room.gameplay.last_actor_display_name}完成了${room.gameplay.last_action_id || '行动'}` : '最近行动',
      summary: room.gameplay.last_action_summary,
      tone: 'success',
    })
    for (const combo of (cavernState?.combo_records ?? []).slice(0, 3)) {
      pushUniqueExpeditionFeedback(entries, seen, {
        id: `expedition-combo-${combo.combo_id}`,
        label: combo.label || '队伍达成连携',
        summary: combo.summary || combo.resource_delta_text,
        tone: 'success',
      })
    }
    if (cavernState?.withdrawal_summary) {
      pushUniqueExpeditionFeedback(entries, seen, {
        id: 'expedition-withdrawal',
        label: '撤离节点',
        summary: cavernState.withdrawal_summary,
        tone: 'warning',
      })
    }
    for (const entry of (cavernState?.round_log ?? []).slice(0, 4)) {
      pushUniqueExpeditionFeedback(entries, seen, logToExpeditionFeedback(entry))
    }
    return entries.slice(0, 5)
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

  const normalizeInviteCandidate = (value = '') => value.trim().toLowerCase()
  const relationToInvitePlayer = (relation: OnlineRelationCard): OnlineInviteRecentPlayer | null => {
    const profile = relation.profile
    const username = profile.username.trim()
    if (!username) return null
    return {
      id: `friend-${username}`,
      username,
      displayName: profile.display_name || profile.player_name || username,
      group: 'friends',
      subtitle: [
        '好友',
        profile.public_title || '',
        profile.recent_activity || profile.season_progress || '',
      ].filter(Boolean).join(' · '),
    }
  }
  const discoveryInvitePlayerGroup = (player: typeof socialStore.friendDiscoveryPlayers[number]): OnlineInvitePlayerGroup => {
    if (player.relation_status === 'blocked') return 'blocked'
    if (player.relation_status === 'friend' && player.is_online) return 'online-friends'
    if (player.relation_status === 'friend') return 'friends'
    if (player.is_recently_active || player.is_online) return 'recent'
    return 'recommended'
  }
  const mergeInvitePlayers = (
    candidates: Array<OnlineInviteRecentPlayer | null>,
    existingMembers: { id?: string; username?: string; displayName?: string; statusLabel?: string }[],
  ) => {
    const existingKeys = new Set(
      existingMembers.flatMap(member => [member.id, member.username, member.displayName].map(value => normalizeInviteCandidate(value || '')))
        .filter(Boolean)
    )
    const seen = new Set<string>()
    const players: OnlineInviteRecentPlayer[] = []
    for (const candidate of candidates) {
      if (!candidate?.username.trim()) continue
      const key = normalizeInviteCandidate(candidate.username)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const disabled = existingKeys.has(key) || existingKeys.has(normalizeInviteCandidate(candidate.displayName || ''))
      players.push({
        ...candidate,
        disabled: candidate.disabled || disabled,
        reason: disabled ? '已在当前房间' : candidate.reason,
      })
      if (players.length >= 12) break
    }
    return players
  }
  const expeditionInviteSelectablePlayers = computed<OnlineInviteRecentPlayer[]>(() => mergeInvitePlayers([
    ...socialStore.friendDiscoveryPlayers.map(player => ({
      id: `discover-${player.save_identity.save_id}`,
      username: player.profile.username,
      displayName: player.profile.display_name || player.profile.player_name || player.profile.username,
      group: discoveryInvitePlayerGroup(player),
      subtitle: [
        player.relation_status === 'friend' ? '好友大厅' : '最近玩家',
        player.is_online ? '在线' : player.is_recently_active ? '近期活跃' : '',
        player.recommendation_reasons[0] || '',
      ].filter(Boolean).join(' · '),
      disabled: player.relation_status === 'blocked',
      reason: player.relation_status === 'blocked' ? '已屏蔽' : '',
    })),
    ...socialStore.friends.map(relationToInvitePlayer),
  ], expeditionInviteExistingMembers.value))

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
      expeditionRoomConnectionState.value === 'conflict' ? '房间信息有更新，请刷新后继续。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set(messages))
  })

  const expeditionRoomConflictMessage = computed(() =>
    expeditionRoomConnectionState.value === 'conflict' ? '当前房间状态可能不是最新，请先刷新确认。' : ''
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
      !canUseHostAction ? '房主操作：开始准备、关闭房间和最终结算需要房主权限与正确阶段。' : '',
      room.my_member_status === 'invited' ? '成员权限：接受邀请或加入房间后才能提交玩法行动。' : '',
      room.my_member_status === 'disconnected' ? '重连权限：恢复连接前请先刷新房间状态。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set([...roomHints, ...disabledActions])).slice(0, 5)
  })

  const expeditionRoomFocusHints = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    const boardHint = room.visual_state.board_type === 'track'
      ? 'Tab 进入赛道格后用 Enter 选择格子，再触发可用赛道行动。'
      : 'Tab 进入矿洞节点后用 Enter 选择节点，再触发探路、采集、支护或撤离。'
    return [
      boardHint,
      '备用操作仍保留在下方，键盘用户可以继续完成行动。',
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
      .map(receipt => `${receipt.target_display_name} · ${receipt.status_label} · ${receipt.summary}`)
    return [...actionHints, ...receiptHints]
  })

  const expeditionRoomSettlementRecords = computed(() => {
    const room = expeditionRoomStore.myRoom
    if (!room) return []
    return room.settlement_receipts.slice(0, 4).map(receipt => {
      const routeReplay = receipt.route_replay
      const rewardItems = receipt.reward_payload.items.map(item => ({
        itemId: item.item_id,
        quantity: item.quantity,
      }))
      const rewardParts = [
        receipt.reward_payload.money > 0 ? `${receipt.reward_payload.money} 铜钱` : '',
        receipt.reward_payload.reward_tickets > 0 ? `${receipt.reward_payload.reward_tickets} 张奖券` : '',
      ].filter(Boolean)
      return {
        id: receipt.id,
        targetLabel: receipt.target_display_name,
        statusLabel: receipt.status_label,
        summary: receipt.summary,
        replayLabel: formatExpeditionRoomShellReplay(routeReplay),
        rewardLabel: rewardParts.length > 0 ? `奖励已记录：${rewardParts.join('、')}` : rewardItems.length > 0 ? '奖励已记录' : '结算记录已生成，暂无额外物品记录。',
        rewardItems,
      }
    })
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

  const routeReplayCargoIntegrityText = (routeReplay: NonNullable<typeof expeditionRoomStore.myRoom>["settlement_receipts"][number]["route_replay"]) => {
    if (!routeReplay?.kind || routeReplay.kind !== 'escort_convoy') return ''
    const cargo = routeReplay.cargo_integrity
    if (!cargo?.max) return ''
    const delta = cargo.last_delta > 0 ? `+${cargo.last_delta}` : String(cargo.last_delta)
    const deltaText = cargo.last_delta ? `最近 ${delta}` : '最近持平'
    const detailText = `稳固 ${cargo.protect_count} · 事件 ${cargo.incident_handled_count} · 货损 ${cargo.damage_count}`
    return [`${cargo.value}/${cargo.max}`, cargo.label, detailText, deltaText, cargo.last_reason].filter(Boolean).join(' · ')
  }

  const formatExpeditionRoomShellReplay = (routeReplay: NonNullable<typeof expeditionRoomStore.myRoom>['settlement_receipts'][number]['route_replay']) => {
    if (!routeReplay?.kind) return ''
    if (routeReplay.kind === 'expedition_cavern') {
      const parts = [
        routeReplay.summary || routeReplay.title,
        routeReplay.combo_records.length > 0 ? `组合收益 ${routeReplay.combo_records.length} 条` : '',
        routeReplay.withdrawal_state === 'confirmed' ? `提前撤离 · ${routeReplay.withdrawal_summary || routeReplayWithdrawalActorLabel(routeReplay)} · ${routeReplayWithdrawalLockedComboLabel(routeReplay)}` : '',
        routeReplay.risk_peak?.summary ? `风险峰值：${routeReplay.risk_peak.summary}` : '',
      ].filter(Boolean)
      return parts.join('；')
    }
    if (routeReplay.kind === 'escort_convoy') {
      const cargoText = routeReplayCargoIntegrityText(routeReplay)
      return [
        routeReplay.summary || routeReplay.title,
        cargoText ? `货物完整度：${cargoText}` : '',
        routeReplay.risk_peak?.summary ? `风险峰值：${routeReplay.risk_peak.summary}` : '',
      ].filter(Boolean).join('；')
    }
    return routeReplay.summary || routeReplay.title || ''
  }

  const formatSignedCavernDelta = (value: number) => {
    const numeric = Math.floor(Number(value) || 0)
    return numeric > 0 ? `+${numeric}` : String(numeric)
  }

  const formatExpeditionTime = (seconds: number) => {
    if (!seconds) return ''
    return new Date(seconds * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const cavernWithdrawalActorLabel = (cavernState: NonNullable<typeof expeditionRoomStore.myRoom>['gameplay']['cavern_state']) => {
    if (!cavernState) return '撤离确认人未记录'
    const actor = cavernState.withdrawal_actor_display_name || cavernState.withdrawal_actor_username || '撤离确认人未记录'
    const time = formatExpeditionTime(cavernState.withdrawal_at)
    return time ? `${actor} · ${time}` : actor
  }

  const formatLockedComboIds = (comboIds: string[] = []) => comboIds.length > 0 ? comboIds.join('、') : '无新增组合'

  const openExpeditionRoomWizard = () => {
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
  const openExpeditionInvitePanel = () => {
    expeditionInviteResults.value = []
    showExpeditionInvitePanel.value = true
  }
  const closeExpeditionInvitePanel = () => {
    showExpeditionInvitePanel.value = false
  }
  const openExpeditionRoomLobby = () => {
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
  const runExpeditionLobbyRoomAction = async (action: (roomId: string) => Promise<void>) => {
    const roomId = expeditionRoomStore.myRoom?.id
    if (!roomId) return
    await action(roomId)
  }
  const handleExpeditionLobbyStartReadyCheck = async () => {
    await runExpeditionLobbyRoomAction(startReadyCheck)
  }
  const handleExpeditionLobbyReady = async () => {
    await runExpeditionLobbyRoomAction(readyRoom)
  }
  const handleExpeditionLobbyUnready = async () => {
    await runExpeditionLobbyRoomAction(unreadyRoom)
  }
  const handleExpeditionLobbyStartCountdown = async () => {
    await runExpeditionLobbyRoomAction(startCountdown)
  }
  const handleExpeditionLobbySettle = () => {
    openExpeditionSettleConfirm()
  }
  const handleExpeditionLobbyCloseRoom = () => {
    openExpeditionCloseConfirm()
  }
  const handleExpeditionLobbyLeaveRoom = async () => {
    await runExpeditionLobbyRoomAction(leaveRoom)
  }
  const handleExpeditionLobbyAcceptInvite = async () => {
    await runExpeditionLobbyRoomAction(joinRoom)
  }
  const handleExpeditionLobbyReconnect = async () => {
    await runExpeditionLobbyRoomAction(reconnectRoom)
  }
  const cavernWithdrawalLockedComboLabel = (cavernState: NonNullable<typeof expeditionRoomStore.myRoom>['gameplay']['cavern_state']) => {
    const count = cavernState?.withdrawal_locked_combo_count || cavernState?.withdrawal_locked_combo_ids?.length || 0
    return `锁定组合 ${count} 条：${formatLockedComboIds(cavernState?.withdrawal_locked_combo_ids || [])}`
  }

  const routeReplayWithdrawalLockedComboLabel = (routeReplay: NonNullable<typeof expeditionRoomStore.myRoom>['settlement_receipts'][number]['route_replay']) => {
    const count = routeReplay.withdrawal_locked_combo_count || routeReplay.withdrawal_locked_combo_ids.length || 0
    return `锁定组合 ${count} 条：${formatLockedComboIds(routeReplay.withdrawal_locked_combo_ids)}`
  }

  const routeReplayWithdrawalActorLabel = (routeReplay: NonNullable<typeof expeditionRoomStore.myRoom>['settlement_receipts'][number]['route_replay']) => {
    const actor = routeReplay.withdrawal_actor_display_name || routeReplay.withdrawal_actor_username || '撤离确认人未记录'
    const time = formatExpeditionTime(routeReplay.withdrawal_at)
    return time ? `${actor} · ${time}` : actor
  }

  const createRoom = async () => {
    await expeditionRoomStore.createRoom().catch(() => {})
  }

  const inviteMember = async (roomId: string) => {
    await expeditionRoomStore.inviteMember(roomId).catch(() => {})
  }

  const joinRoom = async (roomId: string) => {
    await expeditionRoomStore.joinRoom(roomId).catch(() => {})
  }

  const leaveRoom = async (roomId: string) => {
    await expeditionRoomStore.leaveRoomAction(roomId).catch(() => {})
  }

  const startReadyCheck = async (roomId: string) => {
    await expeditionRoomStore.startReadyCheck(roomId).catch(() => {})
  }

  const readyRoom = async (roomId: string) => {
    await expeditionRoomStore.readyRoomAction(roomId).catch(() => {})
  }

  const unreadyRoom = async (roomId: string) => {
    await expeditionRoomStore.unreadyRoomAction(roomId).catch(() => {})
  }

  const startCountdown = async (roomId: string) => {
    await expeditionRoomStore.startCountdown(roomId).catch(() => {})
  }

  const disconnectRoom = async (roomId: string) => {
    await expeditionRoomStore.disconnectRoomAction(roomId).catch(() => {})
  }

  const reconnectRoom = async (roomId: string) => {
    await expeditionRoomStore.reconnectRoomAction(roomId).catch(() => {})
  }

  const playGameplayAction = async (roomId: string, actionId: string) => {
    await expeditionRoomStore.submitGameplayAction(roomId, actionId).catch(() => {})
  }

  const selectExpeditionTrackCell = (payload: { trackId: string; cellId: string }) => {
    selectedExpeditionVisualTrackId.value = payload.trackId
    selectedExpeditionVisualTrackCellId.value = payload.cellId
  }

  const triggerExpeditionTrackAction = async (payload: { trackId: string; cellId: string; actionId: string }) => {
    selectedExpeditionVisualTrackId.value = payload.trackId
    selectedExpeditionVisualTrackCellId.value = payload.cellId
    await playGameplayAction(expeditionRoomStore.myRoom?.id || '', payload.actionId)
  }

  onMounted(() => {
    applyInviteRouteDraft()
    void refreshOverview()
    void Promise.allSettled([
      socialStore.refreshRelationships({ silent: true }),
      socialStore.refreshFriendDiscovery({ silent: true }),
    ])
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      applyInviteRouteDraft()
    }
  )

  watch(expeditionVisualMapNodes, nodes => {
    if (nodes.length === 0) {
      selectedExpeditionVisualNodeId.value = ''
      return
    }
    const firstNode = nodes[0]
    if (firstNode && !nodes.some(node => node.id === selectedExpeditionVisualNodeId.value)) {
      selectedExpeditionVisualNodeId.value = currentExpeditionVisualNodeId.value || firstNode.id
    }
  }, { immediate: true })

  watch(expeditionVisualTracks, tracks => {
    if (tracks.length === 0) {
      selectedExpeditionVisualTrackId.value = ''
      selectedExpeditionVisualTrackCellId.value = ''
      return
    }
    const selectedTrack = tracks.find(track => track.id === selectedExpeditionVisualTrackId.value) || tracks[0]
    selectedExpeditionVisualTrackId.value = selectedTrack?.id || ''
    const roomSelectedCell = expeditionRoomStore.myRoom?.visual_state.selected_visual_id || ''
    const fallbackCellId = selectedTrack?.cells.find(cell => cell.id === roomSelectedCell)?.id || selectedTrack?.cells[0]?.id || ''
    if (selectedTrack && !selectedTrack.cells.some(cell => cell.id === selectedExpeditionVisualTrackCellId.value)) {
      selectedExpeditionVisualTrackCellId.value = fallbackCellId
    }
  }, { immediate: true })
</script>
