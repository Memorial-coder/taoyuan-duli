<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/20">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] tracking-[0.24em] text-accent/70">联机远征房间</p>
          <p class="text-sm text-accent mt-1">先组队，再分工，再补给，再结算</p>
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

    <div class="grid gap-3 md:grid-cols-2">
      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">创建远征房间</p>
          <span class="text-[10px] text-muted">L80 第一轮</span>
        </div>
        <div class="space-y-3">
          <label class="block">
            <span class="text-[10px] text-muted">远征模板</span>
            <select v-model="expeditionRoomStore.selectedTemplateId" class="online-select mt-1">
              <option v-for="template in expeditionRoomStore.templates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="expeditionRoomStore.selectedTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ expeditionRoomStore.selectedTemplate.label }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ expeditionRoomStore.selectedTemplate.summary }}</p>
            <p class="text-[10px] text-muted mt-1">默认人数上限：{{ expeditionRoomStore.selectedTemplate.default_member_limit }} 人</p>
          </div>
          <label class="block">
            <span class="text-[10px] text-muted">玩法模板</span>
            <select v-model="expeditionRoomStore.selectedGameplayTemplateId" class="online-select mt-1">
              <option v-for="template in expeditionRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="expeditionRoomStore.selectedGameplayTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ expeditionRoomStore.selectedGameplayTemplate.label }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ expeditionRoomStore.selectedGameplayTemplate.summary }}</p>
            <p class="text-[10px] text-muted mt-1">{{ expeditionRoomStore.selectedGameplayTemplate.objective_label }} 目标 {{ expeditionRoomStore.selectedGameplayTemplate.default_target }}</p>
          </div>
          <label class="block">
            <span class="text-[10px] text-muted">房间标题</span>
            <input
              v-model="expeditionRoomStore.draftTitle"
              maxlength="30"
              class="online-input mt-1"
              placeholder="例如：高地补给接力"
            />
          </label>
          <Button class="online-action-btn online-action-btn--primary w-full" :disabled="expeditionRoomStore.actionRunning" @click="createRoom">
            创建远征房间
          </Button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">我的远征状态</p>
          <span class="text-[10px] text-muted">{{ expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : '空闲中' }}</span>
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
            :countdown-seconds="expeditionRoomStore.myRoom.countdown_seconds"
            :members="expeditionRoomShellMembers"
            :ready-member-count="expeditionRoomStore.myRoom.ready_member_count"
            :member-limit="expeditionRoomStore.myRoom.member_limit"
            :reward-preview="expeditionRoomRewardPreview"
            :settlement-records="expeditionRoomSettlementRecords"
          >
            <template #actions>
              <Button
                v-if="expeditionRoomStore.myRoom.can_host_ready_check"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-ready-check-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="startReadyCheck(expeditionRoomStore.myRoom.id)"
              >
                开始 ready
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
                v-if="expeditionRoomStore.myRoom.can_disconnect"
                class="online-action-btn online-action-btn--compact justify-center"
                :disabled="expeditionRoomStore.actionRunning"
                @click="disconnectRoom(expeditionRoomStore.myRoom.id)"
              >
                模拟断线
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
                @click="settleRoom(expeditionRoomStore.myRoom.id)"
              >
                撤离并结算
              </Button>
              <Button
                v-if="expeditionRoomStore.myRoom.can_host_close"
                class="online-action-btn online-action-btn--compact justify-center"
                data-testid="expedition-room-close-submit"
                :disabled="expeditionRoomStore.actionRunning"
                @click="closeRoom(expeditionRoomStore.myRoom.id)"
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
            </template>
          </OnlineVisualRoomShell>
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ expeditionRoomStore.myRoom.title }}</p>
                <p class="text-[10px] text-muted mt-1">{{ expeditionRoomStore.myRoom.template_label }} / {{ expeditionRoomStore.myRoom.gameplay.template_label }} / {{ expeditionRoomStore.myRoom.joined_member_count }}/{{ expeditionRoomStore.myRoom.member_limit }} 人</p>
              </div>
              <span class="text-[10px] text-muted">{{ expeditionRoomStore.myRoom.state_label }}</span>
            </div>
            <p v-if="expeditionRoomStore.myRoom.state_reason" class="text-[10px] text-warning mt-1">{{ expeditionRoomStore.myRoom.state_reason }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ expeditionRoomStore.myRoom.gameplay.template_label }}</p>
                <p class="text-[10px] text-muted mt-1 leading-4">{{ expeditionRoomStore.myRoom.gameplay.template_summary }}</p>
              </div>
              <span class="text-[10px] text-muted">{{ expeditionRoomStore.myRoom.gameplay.phase_label }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2">{{ expeditionRoomStore.myRoom.gameplay.progress_text }} / {{ expeditionRoomStore.myRoom.gameplay.score_label }} {{ expeditionRoomStore.myRoom.gameplay.score_value }}</p>
            <p v-if="expeditionRoomStore.myRoom.gameplay.last_action_summary" class="text-[10px] text-success mt-1 leading-4">
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
                  <p class="text-[10px] text-text mt-1 leading-4">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.summary }}</p>
                </div>
                <span class="shrink-0 text-[10px] text-warning">风险 {{ expeditionRoomStore.myRoom.gameplay.cavern_state.risk_text }}</span>
              </div>
              <div class="grid gap-2 sm:grid-cols-2 mt-2">
                <p class="text-[10px] text-muted leading-4">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.risk_hint }}</p>
                <p class="text-[10px] text-muted leading-4">{{ expeditionRoomStore.myRoom.gameplay.cavern_state.current_event.resource_hint }}</p>
              </div>
              <p v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback" class="text-[10px] text-success mt-2 leading-4">
                {{ expeditionRoomStore.myRoom.gameplay.cavern_state.recent_feedback }}
              </p>
              <div
                v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records.length > 0 || expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_state === 'confirmed'"
                class="mt-2 grid gap-2 sm:grid-cols-2"
              >
                <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records.length > 0" data-testid="expedition-cavern-combo-summary" class="border border-success/20 rounded-xs bg-success/5 px-2 py-2">
                  <p class="text-[10px] text-success">节点组合收益</p>
                  <div class="mt-1 space-y-1">
                    <p
                      v-for="combo in expeditionRoomStore.myRoom.gameplay.cavern_state.combo_records"
                      :key="`${expeditionRoomStore.myRoom.id}-${combo.combo_id}`"
                      class="text-[10px] leading-4 text-muted"
                    >
                      {{ combo.label }}：{{ combo.summary }} · 采集值 +{{ combo.score_delta }} · 风险 {{ formatSignedCavernDelta(combo.risk_delta) }}{{ combo.resource_delta_text ? ` · ${combo.resource_delta_text}` : '' }}
                    </p>
                  </div>
                </div>
                <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_state === 'confirmed'" data-testid="expedition-cavern-withdrawal-summary" class="border border-warning/20 rounded-xs bg-warning/5 px-2 py-2">
                  <p class="text-[10px] text-warning">提前收尾</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">
                    {{ expeditionRoomStore.myRoom.gameplay.cavern_state.withdrawal_summary || '撤离点已锁定，房主可以进入结算。' }}
                  </p>
                  <p class="mt-1 text-[10px] leading-4 text-muted" data-testid="expedition-cavern-withdrawal-locked-combos">
                    {{ cavernWithdrawalLockedComboLabel(expeditionRoomStore.myRoom.gameplay.cavern_state) }}
                  </p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">
                    {{ cavernWithdrawalActorLabel(expeditionRoomStore.myRoom.gameplay.cavern_state) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-[10px] text-muted mb-2">队伍资源</p>
                <div class="grid grid-cols-2 gap-2">
                  <div v-for="resource in expeditionRoomStore.myRoom.gameplay.cavern_state.team_resources" :key="resource.id" class="border border-accent/10 rounded-xs px-2 py-1">
                    <p class="text-[10px] text-accent">{{ resource.label }}</p>
                    <p class="text-xs text-text mt-1">{{ resource.value }} / {{ resource.max_value }}</p>
                  </div>
                </div>
              </div>
              <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <p class="text-[10px] text-muted mb-2">职责分工</p>
                <div class="space-y-1">
                  <div v-for="role in expeditionRoomStore.myRoom.gameplay.cavern_state.role_assignments" :key="role.username" class="flex items-start justify-between gap-2">
                    <span class="min-w-0 text-[10px] text-text truncate">{{ role.display_name }}</span>
                    <span class="shrink-0 text-[10px] text-accent">{{ role.role_label }}</span>
                  </div>
                </div>
                <p v-if="expeditionRoomStore.myRoom.gameplay.cavern_state.my_role" class="text-[10px] text-muted mt-2 leading-4">
                  我的职责：{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_label }}，{{ expeditionRoomStore.myRoom.gameplay.cavern_state.my_role.role_summary }}
                </p>
              </div>
            </div>
          </div>

          <label class="block">
            <span class="text-[10px] text-muted">邀请玩家</span>
            <div class="online-action-row mt-1">
              <input
                v-model="expeditionRoomStore.draftInviteUsername"
                class="online-input flex-1"
                placeholder="输入用户名"
              />
              <Button class="online-action-btn online-action-btn--primary" :disabled="expeditionRoomStore.actionRunning" @click="inviteMember(expeditionRoomStore.myRoom.id)">
                邀请
              </Button>
            </div>
          </label>

          <div
            v-if="expeditionRoomStore.myRoom.gameplay.available_actions.length > 0 && !hasPrimaryExpeditionVisualActions"
            class="space-y-2"
          >
            <p class="text-[10px] text-muted">降级玩法动作</p>
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
                  <p class="text-[10px] text-muted leading-4">{{ action.summary }}</p>
                  <p v-if="action.round_effect" class="text-[10px] text-accent mt-1 leading-4">{{ action.round_effect }}</p>
                  <p v-if="action.required_role_label || action.risk_delta_text || action.resource_delta_text" class="text-[10px] text-muted mt-1 leading-4">
                    <span v-if="action.required_role_label">职责 {{ action.required_role_label }}</span>
                    <span v-if="action.risk_delta_text"> / {{ action.risk_delta_text }}</span>
                    <span v-if="action.resource_delta_text"> / {{ action.resource_delta_text }}</span>
                  </p>
                </div>
              </div>
              <p v-if="!action.can_use && action.disabled_reason" class="text-[10px] text-muted mt-1">{{ action.disabled_reason }}</p>
            </div>
          </div>

          <div v-if="expeditionRoomStore.myRoom.gameplay.cavern_state?.round_log.length" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-[10px] text-muted mb-2">回合日志</p>
            <div class="space-y-2">
              <div v-for="entry in expeditionRoomStore.myRoom.gameplay.cavern_state.round_log.slice(0, 5)" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="min-w-0 text-[10px] text-accent">第 {{ entry.round_number }} 回合 · {{ entry.action_label }}</p>
                  <span v-if="entry.role_label" class="shrink-0 text-[10px] text-muted">{{ entry.role_label }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.summary }}</p>
              </div>
            </div>
          </div>

        </div>
        <p v-else class="text-xs text-muted leading-5">当前没有进行中的远征房间。可以先创建自己的房间，或者从下方邀请列表加入队伍。</p>
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
              <p class="text-[10px] text-muted mt-1">{{ room.template_label }} / {{ room.gameplay.template_label }} / 房主 {{ room.host_display_name }}</p>
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
                <p class="text-[10px] text-muted mt-1">{{ room.template_label }} / {{ room.gameplay.template_label }} / {{ room.state_label }} / {{ room.joined_member_count }}/{{ room.member_limit }} 人</p>
              </div>
              <span class="text-[10px] text-muted">{{ room.ready_member_count }} 已准备</span>
            </div>
            <p class="text-[10px] text-muted mt-2">{{ room.gameplay.progress_text }} / {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">最近结算凭证</p>
        <div v-if="expeditionRoomStore.recentReceipts.length === 0" class="text-xs text-muted leading-5">
          远征结算会优先写回铜钱和材料，这里先回看最近的 per-member receipt。
        </div>
        <div v-else class="space-y-2">
          <div v-for="receipt in expeditionRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-text">{{ receipt.room_title }}</p>
                <p class="text-[10px] text-muted mt-1">{{ receipt.template_label }} / 槽位 {{ receipt.target_slot + 1 }}</p>
              </div>
              <span class="text-[10px] text-accent">{{ receipt.status_label }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2 leading-4">{{ receipt.summary }}</p>
            <div v-if="receipt.route_replay?.kind" class="mt-2 border border-accent/10 bg-bg/20 px-2 py-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-accent">{{ receipt.route_replay.title }}</p>
                <span class="text-[10px] text-warning">风险峰值 {{ receipt.route_replay.risk_peak.value }}</span>
              </div>
              <p class="mt-1 text-[10px] text-text leading-4">
                {{ receipt.route_replay.route_nodes.map(node => node.label).join(' -> ') }}
              </p>
              <p class="mt-1 text-[10px] text-muted leading-4">{{ receipt.route_replay.summary }}</p>
              <div v-if="receipt.route_replay.highlight_nodes.length > 0" class="mt-2 space-y-1">
                <p v-for="highlight in receipt.route_replay.highlight_nodes.slice(0, 2)" :key="`${receipt.id}-${highlight.node_id}-${highlight.label}`" class="text-[10px] text-muted leading-4">
                  {{ highlight.label }}：{{ highlight.summary }}
                </p>
              </div>
              <div v-if="receipt.route_replay.member_contributions.length > 0" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="contribution in receipt.route_replay.member_contributions.slice(0, 4)"
                  :key="`${receipt.id}-${contribution.username}`"
                  class="border border-accent/10 px-1.5 py-0.5 text-[10px] text-muted"
                >
                  {{ contribution.display_name }} {{ contribution.role_label || '队员' }} · {{ contribution.action_count }} 次
                </span>
              </div>
              <div v-if="receipt.route_replay.combo_records.length > 0" data-testid="expedition-cavern-receipt-combos" class="mt-2 space-y-1 border-l border-success/30 pl-2">
                <p v-for="combo in receipt.route_replay.combo_records" :key="`${receipt.id}-${combo.combo_id}`" class="text-[10px] text-muted leading-4">
                  {{ combo.label }}：采集值 +{{ combo.score_delta }} · 风险 {{ formatSignedCavernDelta(combo.risk_delta) }}{{ combo.resource_delta_text ? ` · ${combo.resource_delta_text}` : '' }}
                </p>
              </div>
              <p v-if="receipt.route_replay.withdrawal_state === 'confirmed'" data-testid="expedition-cavern-receipt-withdrawal" class="mt-2 text-[10px] text-muted leading-4">
                提前收尾：{{ receipt.route_replay.withdrawal_summary || '撤离点已确认。' }} · {{ routeReplayWithdrawalLockedComboLabel(receipt.route_replay) }} · {{ routeReplayWithdrawalActorLabel(receipt.route_replay) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import OnlineVisualRoomShell from '@/components/game/online/OnlineVisualRoomShell.vue'
  import VisualMapBoard from '@/components/game/online/VisualMapBoard.vue'
  import VisualTrackBoard from '@/components/game/online/VisualTrackBoard.vue'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import type { OnlineVisualNode, OnlineVisualTrack } from '@/types/onlineVisual'

  const route = useRoute()
  const expeditionRoomStore = useExpeditionRoomStore()
  const selectedExpeditionVisualNodeId = ref('')
  const selectedExpeditionVisualTrackId = ref('')
  const selectedExpeditionVisualTrackCellId = ref('')

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
      expeditionRoomConnectionState.value === 'conflict' ? '服务端房间状态存在冲突，请刷新后再继续提交。' : '',
    ].filter(Boolean) as string[]
    return Array.from(new Set(messages))
  })

  const expeditionRoomConflictMessage = computed(() =>
    expeditionRoomConnectionState.value === 'conflict' ? '当前本地房间状态可能落后于服务端，请先刷新确认。' : ''
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
      '旧按钮面板仍保留在下方，键盘用户可以继续使用降级动作入口。',
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
      const rewardItems = receipt.reward_payload.items
        .map(item => `${item.item_id} x${item.quantity}`)
        .join('、')
      const rewardParts = [
        receipt.reward_payload.money > 0 ? `${receipt.reward_payload.money} 铜钱` : '',
        receipt.reward_payload.reward_tickets > 0 ? `${receipt.reward_payload.reward_tickets} 张奖券` : '',
        rewardItems,
      ].filter(Boolean)
      return {
        id: receipt.id,
        targetLabel: receipt.target_display_name,
        statusLabel: receipt.status_label,
        summary: receipt.summary,
        replayLabel: formatExpeditionRoomShellReplay(routeReplay),
        rewardLabel: rewardParts.length > 0 ? `服务端落账：${rewardParts.join('、')}` : '服务端凭证已生成，暂无额外物品落账。',
      }
    })
  })

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

  const settleRoom = async (roomId: string) => {
    await expeditionRoomStore.settleRoomAction(roomId).catch(() => {})
  }

  const closeRoom = async (roomId: string) => {
    await expeditionRoomStore.closeRoomAction(roomId).catch(() => {})
  }

  onMounted(() => {
    applyInviteRouteDraft()
    void refreshOverview()
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
