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

          <div v-if="expeditionRoomStore.myRoom.gameplay.available_actions.length > 0" class="space-y-2">
            <p class="text-[10px] text-muted">玩法动作</p>
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

          <div class="grid grid-cols-2 gap-2">
            <Button v-if="expeditionRoomStore.myRoom.can_host_ready_check" :disabled="expeditionRoomStore.actionRunning" @click="startReadyCheck(expeditionRoomStore.myRoom.id)">
              开始 ready
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_ready" :disabled="expeditionRoomStore.actionRunning" @click="readyRoom(expeditionRoomStore.myRoom.id)">
              我已准备
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_unready" :disabled="expeditionRoomStore.actionRunning" @click="unreadyRoom(expeditionRoomStore.myRoom.id)">
              取消准备
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_host_start_countdown" :disabled="expeditionRoomStore.actionRunning" @click="startCountdown(expeditionRoomStore.myRoom.id)">
              开始倒计时
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_disconnect" :disabled="expeditionRoomStore.actionRunning" @click="disconnectRoom(expeditionRoomStore.myRoom.id)">
              模拟断线
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_reconnect" :disabled="expeditionRoomStore.actionRunning" @click="reconnectRoom(expeditionRoomStore.myRoom.id)">
              恢复连接
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_host_settle" :disabled="expeditionRoomStore.actionRunning" @click="settleRoom(expeditionRoomStore.myRoom.id)">
              撤离并结算
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_host_close" :disabled="expeditionRoomStore.actionRunning" @click="closeRoom(expeditionRoomStore.myRoom.id)">
              {{ expeditionRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
            </Button>
            <Button v-if="expeditionRoomStore.myRoom.can_leave" :disabled="expeditionRoomStore.actionRunning" @click="leaveRoom(expeditionRoomStore.myRoom.id)">
              离开房间
            </Button>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'

  const route = useRoute()
  const expeditionRoomStore = useExpeditionRoomStore()

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
</script>
