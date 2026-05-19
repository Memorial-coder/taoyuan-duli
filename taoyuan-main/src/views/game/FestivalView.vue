<template>
  <div class="space-y-3">
    <div class="border border-accent/20 rounded-xs p-3 bg-bg/20">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] tracking-[0.24em] text-accent/70">节会房间</p>
          <p class="text-sm text-accent mt-1">同场联机与玩法模板</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ festivalRoomStore.overview?.bulletin || '先从房间底座把创建、邀请、准备、倒计时和结算流程跑通。' }}</p>
        </div>
        <Button class="shrink-0" :disabled="festivalRoomStore.loading || festivalRoomStore.actionRunning" @click="refreshOverview">
          刷新
        </Button>
      </div>
      <p v-if="festivalRoomStore.errorMessage" class="text-xs text-danger mt-3">{{ festivalRoomStore.errorMessage }}</p>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">创建节会房间</p>
          <span class="text-[10px] text-muted">L60-L62 第一轮</span>
        </div>
        <div class="space-y-2">
          <label class="block">
            <span class="text-[10px] text-muted">节会房型</span>
            <select v-model="festivalRoomStore.selectedTemplateId" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
              <option v-for="template in festivalRoomStore.templates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="festivalRoomStore.selectedTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ festivalRoomStore.selectedTemplate.label }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ festivalRoomStore.selectedTemplate.summary }}</p>
            <p class="text-[10px] text-muted mt-1">默认人数上限：{{ festivalRoomStore.selectedTemplate.default_member_limit }} 人</p>
            <p v-if="festivalRoomStore.recommendedGameplayTemplates.length > 0" class="text-[10px] text-muted mt-1">
              推荐玩法：{{ festivalRoomStore.recommendedGameplayTemplates.map(template => template.label).join(' / ') }}
            </p>
          </div>
          <label class="block">
            <span class="text-[10px] text-muted">玩法模板</span>
            <select v-model="festivalRoomStore.selectedGameplayTemplateId" class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text">
              <option v-for="template in festivalRoomStore.gameplayTemplates" :key="template.id" :value="template.id">
                {{ template.label }}
              </option>
            </select>
          </label>
          <div v-if="festivalRoomStore.selectedGameplayTemplate" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-xs text-accent">{{ festivalRoomStore.selectedGameplayTemplate.label }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ festivalRoomStore.selectedGameplayTemplate.summary }}</p>
            <p class="text-[10px] text-muted mt-1">{{ festivalRoomStore.selectedGameplayTemplate.objective_label }} · 目标 {{ festivalRoomStore.selectedGameplayTemplate.default_target }}</p>
            <div v-if="festivalRoomStore.selectedGameplayTemplate.action_options.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="action in festivalRoomStore.selectedGameplayTemplate.action_options"
                :key="action.id"
                class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ action.label }}
              </span>
            </div>
          </div>
          <label class="block">
            <span class="text-[10px] text-muted">房间标题</span>
            <input
              v-model="festivalRoomStore.draftTitle"
              maxlength="30"
              class="w-full mt-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text"
              placeholder="例如：端午夜练舟"
            />
          </label>
          <Button class="w-full justify-center" :disabled="festivalRoomStore.actionRunning" @click="createRoom">
            创建房间
          </Button>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm text-accent">我的节会状态</p>
          <span class="text-[10px] text-muted">{{ festivalRoomStore.myRoom ? festivalRoomStore.myRoom.state_label : '空闲中' }}</span>
        </div>
        <div v-if="festivalRoomStore.myRoom" class="space-y-2">
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ festivalRoomStore.myRoom.title }}</p>
                <p class="text-[10px] text-muted mt-1">{{ festivalRoomStore.myRoom.template_label }} · {{ festivalRoomStore.myRoom.gameplay.template_label }} · {{ festivalRoomStore.myRoom.joined_member_count }}/{{ festivalRoomStore.myRoom.member_limit }} 人</p>
              </div>
              <span class="text-[10px] text-muted">{{ festivalRoomStore.myRoom.state_label }}</span>
            </div>
            <p v-if="festivalRoomStore.myRoom.state_reason" class="text-[10px] text-warning mt-1">{{ festivalRoomStore.myRoom.state_reason }}</p>
            <p v-if="festivalRoomStore.myRoom.opening_ceremony" class="text-[10px] text-success mt-1">
              {{ festivalRoomStore.myRoom.opening_ceremony.subtitle }}
            </p>
          </div>

          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ festivalRoomStore.myRoom.gameplay.template_label }}</p>
                <p class="text-[10px] text-muted mt-1 leading-4">{{ festivalRoomStore.myRoom.gameplay.template_summary }}</p>
              </div>
              <span class="text-[10px] text-muted">{{ festivalRoomStore.myRoom.gameplay.phase_label }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2">{{ festivalRoomStore.myRoom.gameplay.progress_text }} · {{ festivalRoomStore.myRoom.gameplay.score_label }} {{ festivalRoomStore.myRoom.gameplay.score_value }}</p>
            <p v-if="festivalRoomStore.myRoom.gameplay.last_action_summary" class="text-[10px] text-success mt-1 leading-4">
              {{ festivalRoomStore.myRoom.gameplay.last_action_summary }}
            </p>
            <div v-if="festivalRoomStore.myRoom.gameplay.contributions.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="contribution in festivalRoomStore.myRoom.gameplay.contributions"
                :key="`${festivalRoomStore.myRoom.id}-${contribution.username}-gameplay`"
                class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ contribution.display_name }} · {{ contribution.action_count }} 次 · {{ contribution.progress_value }} 贡献
              </span>
            </div>
          </div>

          <div v-if="festivalRoomStore.myRoom.gameplay.available_actions.length > 0" class="space-y-2">
            <p class="text-[10px] text-muted">玩法动作</p>
            <div class="space-y-2">
              <div
                v-for="action in festivalRoomStore.myRoom.gameplay.available_actions"
                :key="`${festivalRoomStore.myRoom.id}-${action.id}`"
                class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10"
              >
                <div class="flex items-center gap-2">
                  <Button :disabled="festivalRoomStore.actionRunning || !action.can_use" @click="playGameplayAction(festivalRoomStore.myRoom.id, action.id)">
                    {{ action.label }}
                  </Button>
                  <p class="text-[10px] text-muted leading-4">{{ action.summary }}</p>
                </div>
                <p v-if="!action.can_use && action.disabled_reason" class="text-[10px] text-muted mt-1">{{ action.disabled_reason }}</p>
              </div>
            </div>
          </div>

          <label class="block">
            <span class="text-[10px] text-muted">邀请玩家</span>
            <div class="flex gap-2 mt-1">
              <input
                v-model="festivalRoomStore.draftInviteUsername"
                class="flex-1 bg-bg border border-accent/20 rounded-xs px-2 py-2 text-xs text-text"
                placeholder="输入用户名"
              />
              <Button :disabled="festivalRoomStore.actionRunning" @click="inviteMember(festivalRoomStore.myRoom.id)">
                邀请
              </Button>
            </div>
          </label>

          <div class="grid grid-cols-2 gap-2">
            <Button v-if="festivalRoomStore.myRoom.can_host_ready_check" :disabled="festivalRoomStore.actionRunning" @click="startReadyCheck(festivalRoomStore.myRoom.id)">
              开准备
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_ready" :disabled="festivalRoomStore.actionRunning" @click="readyRoom(festivalRoomStore.myRoom.id)">
              我已准备
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_unready" :disabled="festivalRoomStore.actionRunning" @click="unreadyRoom(festivalRoomStore.myRoom.id)">
              取消准备
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_host_start_countdown" :disabled="festivalRoomStore.actionRunning" @click="startCountdown(festivalRoomStore.myRoom.id)">
              开倒计时
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_disconnect" :disabled="festivalRoomStore.actionRunning" @click="disconnectRoom(festivalRoomStore.myRoom.id)">
              模拟断线
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_reconnect" :disabled="festivalRoomStore.actionRunning" @click="reconnectRoom(festivalRoomStore.myRoom.id)">
              恢复连接
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_host_settle" :disabled="festivalRoomStore.actionRunning" @click="settleRoom(festivalRoomStore.myRoom.id)">
              进入结算
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_host_close" :disabled="festivalRoomStore.actionRunning" @click="closeRoom(festivalRoomStore.myRoom.id)">
              {{ festivalRoomStore.myRoom.state === 'settling' ? '正式关闭' : '取消房间' }}
            </Button>
            <Button v-if="festivalRoomStore.myRoom.can_leave" :disabled="festivalRoomStore.actionRunning" @click="leaveRoom(festivalRoomStore.myRoom.id)">
              离开房间
            </Button>
          </div>
        </div>
        <p v-else class="text-xs text-muted leading-5">当前没有进行中的节会房间。可以先创建自己的房间，或从下方待邀列表加入别人发来的节会邀请。</p>
      </div>
    </div>

    <div v-if="festivalRoomStore.invitedRooms.length > 0" class="border border-warning/20 rounded-xs p-3 bg-warning/5">
      <p class="text-sm text-warning mb-2">待处理邀请</p>
      <div class="space-y-2">
        <div v-for="room in festivalRoomStore.invitedRooms" :key="room.id" class="border border-warning/15 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-text">{{ room.title }}</p>
              <p class="text-[10px] text-muted mt-1">{{ room.template_label }} · {{ room.gameplay.template_label }} · 房主 {{ room.host_display_name }}</p>
            </div>
            <Button :disabled="festivalRoomStore.actionRunning || !room.can_join" @click="joinRoom(room.id)">
              加入
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
        <p class="text-sm text-accent mb-2">可见房间</p>
        <div v-if="festivalRoomStore.visibleRooms.length === 0" class="text-xs text-muted">当前还没有你能查看的节会房间。</div>
        <div v-else class="space-y-2">
          <div v-for="room in festivalRoomStore.visibleRooms" :key="room.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ room.title }}</p>
                <p class="text-[10px] text-muted mt-1">{{ room.template_label }} · {{ room.gameplay.template_label }} · {{ room.state_label }} · {{ room.joined_member_count }}/{{ room.member_limit }} 人</p>
              </div>
              <span class="text-[10px] text-muted">{{ room.ready_member_count }} 已准备</span>
            </div>
            <p class="text-[10px] text-muted mt-2">{{ room.gameplay.progress_text }} · {{ room.gameplay.score_label }} {{ room.gameplay.score_value }}</p>
            <div v-if="room.members.length > 0" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="member in room.members"
                :key="`${room.id}-${member.username}`"
                class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted"
              >
                {{ member.display_name }} · {{ member.status_label }}
              </span>
            </div>
            <div v-if="room.recent_events.length > 0" class="mt-2 space-y-1">
              <p v-for="event in room.recent_events.slice(0, 3)" :key="event.id" class="text-[10px] text-muted leading-4">
                - {{ event.summary }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-accent mb-2">最近结算凭证</p>
          <div v-if="festivalRoomStore.recentReceipts.length === 0" class="text-xs text-muted leading-5">节会结算目前先生成凭证预览，用来证明房间生命周期、逐成员凭证和关闭流程已经打通。后续具体小游戏奖励会继续接到这里。</div>
          <div v-else class="space-y-2">
            <div v-for="receipt in festivalRoomStore.recentReceipts" :key="receipt.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ receipt.room_title }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ receipt.template_label }} · 槽位 {{ receipt.target_slot + 1 }}</p>
                </div>
                <span class="text-[10px] text-accent">{{ receipt.status_label }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2 leading-4">{{ receipt.summary }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/20 rounded-xs p-3 bg-bg/10">
          <p class="text-sm text-accent mb-2">最近纪念册</p>
          <div v-if="festivalRoomStore.recentMemorials.length === 0" class="text-xs text-muted leading-5">节会纪念册会按最近结算顺序留档，记录你参加过哪些节会、拿到哪些奖励、和谁同场，以及这场节会的合影文案。</div>
          <div v-else class="space-y-2">
            <div v-for="memorial in festivalRoomStore.recentMemorials" :key="memorial.memorial_id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-text">{{ memorial.label }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ memorial.template_label }} · {{ memorial.gameplay_template_label }}</p>
                </div>
                <span class="text-[10px] text-accent">{{ memorial.photo_taken ? '已留档' : '未留影' }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2 leading-4">{{ memorial.reward_summary }}</p>
              <p v-if="memorial.squadmate_display_names.length > 0" class="text-[10px] text-muted mt-1 leading-4">同场成员：{{ memorial.squadmate_display_names.join('、') }}</p>
              <p v-if="memorial.squadmate_friend_display_names.length > 0" class="text-[10px] text-success mt-1 leading-4">同场好友：{{ memorial.squadmate_friend_display_names.join('、') }}</p>
              <p v-if="memorial.photo_line" class="text-[10px] text-muted mt-1 leading-4">{{ memorial.photo_line }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import Button from '@/components/game/Button.vue'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'

  const festivalRoomStore = useFestivalRoomStore()

  const refreshOverview = async () => {
    await festivalRoomStore.refreshOverview().catch(() => {})
  }

  const createRoom = async () => {
    await festivalRoomStore.createRoom().catch(() => {})
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

  const playGameplayAction = async (roomId: string, actionId: string) => {
    await festivalRoomStore.submitGameplayAction(roomId, actionId).catch(() => {})
  }

  const settleRoom = async (roomId: string) => {
    await festivalRoomStore.settleRoomAction(roomId).catch(() => {})
  }

  const closeRoom = async (roomId: string) => {
    await festivalRoomStore.closeRoomAction(roomId).catch(() => {})
  }

  onMounted(() => {
    void refreshOverview()
  })
</script>
