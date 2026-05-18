<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-sm text-accent">公开名片</p>
        <p class="text-[10px] text-muted mt-1">把当前账号的公开名片整理出来，方便后续好友、邻里和来访系统直接复用。</p>
      </div>
      <Button class="text-[10px]" :disabled="socialStore.loading || socialStore.saving" @click="refreshProfile">
        {{ socialStore.loading ? '加载中…' : '刷新名片' }}
      </Button>
    </div>

    <div v-if="socialStore.errorMessage" class="game-panel border border-danger/20 rounded-xs p-3 text-xs text-danger">
      {{ socialStore.errorMessage }}
    </div>

    <div v-if="!socialStore.profile" class="game-panel border border-accent/10 rounded-xs p-3 text-xs text-muted">
      暂未载入公开名片。登录后可自动读取当前账号的公开资料。
    </div>

    <template v-else>
      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm text-accent">{{ socialStore.displayTitle }}</p>
            <p class="text-[10px] text-muted mt-1">{{ socialStore.profile.display_name }} · {{ socialStore.profile.honorific }}</p>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/30 text-accent">
            {{ visibilityLabel }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">庄园名</p>
            <p class="text-accent mt-1">{{ socialStore.profile.manor_name }}</p>
            <p class="text-[10px] text-muted mt-1">{{ socialStore.profile.public_title }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">季节进度</p>
            <p class="text-accent mt-1">{{ socialStore.profile.season_progress }}</p>
            <p class="text-[10px] text-muted mt-1">{{ socialStore.profile.showcase_theme }}</p>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <p class="text-[10px] text-muted">公开介绍</p>
          <p class="mt-1">{{ socialStore.profile.public_intro || '这个人还没写公开介绍。' }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">主营方向</p>
            <p class="text-accent mt-1">{{ socialStore.profile.primary_route_label }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">邻里身份</p>
            <p class="text-accent mt-1">{{ socialStore.profile.neighborhood_role }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">最近活跃</p>
            <p class="text-accent mt-1">{{ socialStore.profile.recent_activity }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">本周展示主题</p>
            <p class="text-accent mt-1">{{ socialStore.profile.showcase_theme }}</p>
          </div>
        </div>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <p class="text-xs text-accent">名片设置</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            庄园名
            <input v-model="socialStore.draftManorName" maxlength="40" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            公开称号
            <input v-model="socialStore.draftPublicTitle" maxlength="24" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            邻里身份
            <input v-model="socialStore.draftNeighborhoodRole" maxlength="24" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            展示主题
            <input v-model="socialStore.draftShowcaseTheme" maxlength="24" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent" />
          </label>
        </div>
        <label class="flex flex-col gap-1 text-[10px] text-muted">
          公开状态
          <select v-model="socialStore.draftVisibility" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
            <option value="public">公开</option>
            <option value="friends_only">仅好友（当前视作未公开）</option>
            <option value="private">私密</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-[10px] text-muted">
          一句公开介绍
          <textarea
            v-model="socialStore.draftIntro"
            rows="3"
            maxlength="120"
            class="bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
            placeholder="例如：这周主打鱼塘与博物馆补展，欢迎来看看。"
          />
        </label>
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">保存后会同步成公开名片预览。</p>
          <Button class="text-[10px]" :disabled="!socialStore.hasDirtyDraft || socialStore.saving" @click="saveProfile">
            {{ socialStore.saving ? '保存中…' : '保存名片' }}
          </Button>
        </div>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">好友与拉黑</p>
          <Button class="text-[10px]" :disabled="socialStore.relationshipLoading || socialStore.relationshipActionRunning" @click="refreshRelationships">
            {{ socialStore.relationshipLoading ? '加载中…' : '刷新关系' }}
          </Button>
        </div>
        <div class="flex gap-2">
          <input
            v-model="socialStore.friendUsernameDraft"
            class="flex-1 bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
            placeholder="输入玩家用户名"
          />
          <Button class="text-[10px]" :disabled="socialStore.relationshipActionRunning" @click="sendFriendRequest">
            加好友
          </Button>
          <Button class="text-[10px]" :disabled="socialStore.relationshipActionRunning" @click="blockPlayer">
            拉黑
          </Button>
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">收到的申请</p>
            <div v-if="socialStore.incomingRequests.length === 0" class="text-[10px] text-muted">当前没有新的好友申请。</div>
            <div v-for="entry in socialStore.incomingRequests" :key="entry.request_id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <p class="text-xs text-accent">{{ entry.profile.display_name }}</p>
              <p class="text-[10px] text-muted mt-1">{{ entry.profile.recent_activity }}</p>
              <div class="flex gap-2 mt-2">
                <Button class="text-[10px]" :disabled="socialStore.relationshipActionRunning" @click="acceptRequest(entry.request_id!)">接受</Button>
                <Button class="text-[10px]" :disabled="socialStore.relationshipActionRunning" @click="rejectRequest(entry.request_id!)">拒绝</Button>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">发出的申请</p>
            <div v-if="socialStore.outgoingRequests.length === 0" class="text-[10px] text-muted">当前没有待处理的外发申请。</div>
            <div v-for="entry in socialStore.outgoingRequests" :key="entry.request_id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <p class="text-xs text-accent">{{ entry.profile.display_name }}</p>
              <p class="text-[10px] text-muted mt-1">{{ entry.profile.recent_activity }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted mb-1">好友列表（按最近互动 / 活跃排序）</p>
          <div v-if="socialStore.friends.length === 0" class="text-[10px] text-muted">当前还没有好友。</div>
          <div v-for="entry in socialStore.friends" :key="entry.friendship_id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">{{ entry.profile.display_name }}</p>
              <span class="text-[10px] text-muted">{{ entry.profile.public_title }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ entry.profile.recent_activity }}</p>
            <p class="text-[10px] text-muted mt-1">主营方向：{{ entry.profile.primary_route_label }} · 展示主题：{{ entry.profile.showcase_theme }}</p>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted mb-1">已拉黑</p>
          <div v-if="socialStore.blockedUsers.length === 0" class="text-[10px] text-muted">当前没有拉黑玩家。</div>
          <div v-for="entry in socialStore.blockedUsers" :key="entry.block_id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">{{ entry.profile.display_name }}</p>
              <Button class="text-[10px]" :disabled="socialStore.relationshipActionRunning" @click="unblockPlayer(entry.profile.username)">解除拉黑</Button>
            </div>
          </div>
        </div>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">邻里</p>
          <Button class="text-[10px]" :disabled="socialStore.neighborLoading || socialStore.neighborActionRunning" @click="refreshNeighbors">
            {{ socialStore.neighborLoading ? '加载中…' : '刷新邻里' }}
          </Button>
        </div>

        <template v-if="socialStore.neighborGroup">
          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs text-accent">{{ socialStore.neighborGroup.name }}</p>
                <p class="text-[10px] text-muted mt-1">{{ socialStore.neighborGroup.summary || '这个邻里还没写简介。' }}</p>
              </div>
              <span class="text-[10px] text-muted">Lv.{{ socialStore.neighborGroup.level }} · {{ socialStore.neighborGroup.member_count }}/{{ socialStore.neighborGroup.capacity }}</span>
            </div>
            <p class="text-[10px] text-muted mt-2">我的身份：{{ neighborRoleLabel(socialStore.neighborGroup.role) }}</p>
          </div>

          <label class="flex flex-col gap-1 text-[10px] text-muted">
            邻里公告
            <textarea
              v-model="socialStore.neighborNoticeDraft"
              rows="2"
              maxlength="160"
              class="bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
              placeholder="写一句让成员一眼知道本周在忙什么。"
            />
          </label>
          <div class="flex justify-end">
            <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="saveNeighborNotice">
              保存公告
            </Button>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">成员</p>
            <div v-for="member in socialStore.neighborGroup.members || []" :key="member.username" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">{{ member.username }}</p>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted">{{ neighborRoleLabel(member.role) }}</span>
                  <template v-if="socialStore.neighborGroup.role === 'leader' && member.role !== 'leader'">
                    <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="setNeighborRole(member.username, member.role === 'manager' ? 'member' : 'manager')">
                      {{ member.role === 'manager' ? '改普通成员' : '升为管事' }}
                    </Button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">邻里动态</p>
            <div v-if="(socialStore.neighborGroup.activity_log || []).length === 0" class="text-[10px] text-muted">当前还没有新的邻里动态。</div>
            <div v-for="entry in socialStore.neighborGroup.activity_log || []" :key="entry.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <p class="text-xs">{{ entry.message }}</p>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">待处理申请 / 邀请</p>
            <div v-if="socialStore.neighborManagedRequests.length === 0 && socialStore.neighborIncomingInvites.length === 0" class="text-[10px] text-muted">当前没有新的邻里申请或邀请。</div>
            <div v-for="entry in socialStore.neighborManagedRequests" :key="entry.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <p class="text-xs text-accent">{{ entry.username }} 申请加入</p>
              <div class="flex gap-2 mt-2">
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="acceptNeighbor(entry.id)">接受</Button>
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="rejectNeighbor(entry.id)">拒绝</Button>
              </div>
            </div>
            <div v-for="entry in socialStore.neighborIncomingInvites" :key="entry.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <p class="text-xs text-accent">收到邻里邀请：{{ entry.group_name }}</p>
              <div class="flex gap-2 mt-2">
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="acceptNeighbor(entry.id)">接受</Button>
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="rejectNeighbor(entry.id)">拒绝</Button>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">邀请成员</p>
            <div class="flex gap-2">
              <input
                v-model="socialStore.neighborInviteUsernameDraft"
                class="flex-1 bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="输入玩家用户名"
              />
              <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="inviteNeighbor">
                发送邀请
              </Button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="border border-accent/10 rounded-xs p-2 space-y-2">
            <p class="text-[10px] text-muted">创建邻里</p>
            <input
              v-model="socialStore.neighborNameDraft"
              maxlength="24"
              class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              placeholder="邻里名称"
            />
            <input
              v-model="socialStore.neighborSummaryDraft"
              maxlength="120"
              class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              placeholder="一句简介，告诉别人你们这群人想过怎样的日子。"
            />
            <textarea
              v-model="socialStore.neighborNoticeDraft"
              rows="2"
              maxlength="160"
              class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
              placeholder="初始公告"
            />
            <select v-model="socialStore.neighborCapacityDraft" class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
              <option :value="12">小型邻里（3-12）</option>
              <option :value="30">中型邻里（12-30）</option>
              <option :value="60">大型邻里（30+）</option>
            </select>
            <div class="flex justify-end">
              <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="createNeighbor">
                创建邻里
              </Button>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">公开邻里</p>
            <div v-if="socialStore.neighborPublicGroups.length === 0" class="text-[10px] text-muted">当前还没有公开邻里。</div>
            <div v-for="group in socialStore.neighborPublicGroups" :key="group.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs text-accent">{{ group.name }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ group.summary || '这个邻里还没写简介。' }}</p>
                </div>
                <span class="text-[10px] text-muted">Lv.{{ group.level }} · {{ group.member_count }}/{{ group.capacity }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2">公告：{{ group.notice || '暂无公告' }}</p>
              <div v-if="group.can_apply" class="flex justify-end mt-2">
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="applyNeighbor(group.id)">
                  申请加入
                </Button>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">收到的邻里邀请</p>
            <div v-if="socialStore.neighborIncomingInvites.length === 0" class="text-[10px] text-muted">当前没有待处理的邻里邀请。</div>
            <div v-for="entry in socialStore.neighborIncomingInvites" :key="entry.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <p class="text-xs text-accent">{{ entry.group_name }}</p>
              <div class="flex gap-2 mt-2">
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="acceptNeighbor(entry.id)">接受</Button>
                <Button class="text-[10px]" :disabled="socialStore.neighborActionRunning" @click="rejectNeighbor(entry.id)">拒绝</Button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import Button from '@/components/game/Button.vue'
  import { useSocialStore } from '@/stores/useSocialStore'

  const socialStore = useSocialStore()

  const visibilityLabel = computed(() => {
    if (!socialStore.profile) return '未公开'
    if (socialStore.profile.visibility === 'public') return '公开'
    if (socialStore.profile.visibility === 'friends_only') return '仅好友'
    return '私密'
  })

  const refreshProfile = async () => {
    await socialStore.refreshProfile().catch(() => {})
  }

  const saveProfile = async () => {
    await socialStore.saveProfile().catch(() => {})
  }

  const refreshRelationships = async () => {
    await socialStore.refreshRelationships().catch(() => {})
  }

  const sendFriendRequest = async () => {
    await socialStore.submitFriendRequest().catch(() => {})
  }

  const acceptRequest = async (requestId: string) => {
    await socialStore.acceptRequest(requestId).catch(() => {})
  }

  const rejectRequest = async (requestId: string) => {
    await socialStore.rejectRequest(requestId).catch(() => {})
  }

  const blockPlayer = async () => {
    await socialStore.blockTarget().catch(() => {})
  }

  const unblockPlayer = async (targetUsername: string) => {
    await socialStore.unblockTarget(targetUsername).catch(() => {})
  }

  const refreshNeighbors = async () => {
    await socialStore.refreshNeighborOverview().catch(() => {})
  }

  const createNeighbor = async () => {
    await socialStore.submitNeighborGroup().catch(() => {})
  }

  const applyNeighbor = async (groupId: string) => {
    await socialStore.applyNeighbor(groupId).catch(() => {})
  }

  const inviteNeighbor = async () => {
    await socialStore.inviteNeighbor().catch(() => {})
  }

  const acceptNeighbor = async (requestId: string) => {
    await socialStore.acceptNeighbor(requestId).catch(() => {})
  }

  const rejectNeighbor = async (requestId: string) => {
    await socialStore.rejectNeighbor(requestId).catch(() => {})
  }

  const saveNeighborNotice = async () => {
    await socialStore.saveNeighborNoticeDraft().catch(() => {})
  }

  const setNeighborRole = async (targetUsername: string, role: 'manager' | 'member') => {
    await socialStore.changeNeighborRole(targetUsername, role).catch(() => {})
  }

  const neighborRoleLabel = (role?: 'leader' | 'manager' | 'member') => {
    if (role === 'leader') return '邻里社长'
    if (role === 'manager') return '邻里管事'
    return '邻里成员'
  }

  onMounted(() => {
    if (!socialStore.profile) {
      void refreshProfile()
    }
    void refreshRelationships()
    void refreshNeighbors()
  })
</script>
