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

        <div v-if="socialStore.profile.avatar_image_url" class="border border-accent/10 rounded-xs p-2 bg-bg/10">
          <p class="text-[10px] text-muted mb-2">公开头像</p>
          <img :src="socialStore.profile.avatar_image_url" :alt="socialStore.profile.avatar_image_alt || '名片头像'" class="mx-auto max-h-32 rounded-xs border border-accent/15 object-cover" />
          <p v-if="socialStore.profile.avatar_image_alt" class="text-[10px] text-muted mt-2 text-center">{{ socialStore.profile.avatar_image_alt }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="border border-accent/10 rounded-xs p-2 col-span-2">
            <p class="text-[10px] text-muted">当前存档 ID</p>
            <p class="text-accent mt-1 break-all">{{ currentSaveIdentityLabel }}</p>
            <p class="text-[10px] text-muted mt-1">
              昵称和公开名片可随时调整；存档 ID 由服务端生成并保持固定，用于好友搜索、邀请和协作校验。
            </p>
          </div>
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

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <p class="text-[10px] text-muted">关系标签</p>
          <div class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="tag in socialStore.profile.public_tags"
              :key="tag.id"
              class="text-[10px] px-1.5 py-0.5 rounded-xs border"
              :class="tag.source === 'selected' ? 'border-accent/40 text-accent bg-accent/5' : 'border-accent/15 text-muted'"
            >
              {{ tag.label }}
            </span>
            <span v-if="socialStore.profile.public_tags.length === 0" class="text-[10px] text-muted">当前还没有公开标签。</span>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] text-muted">玩家史册</p>
            <span class="text-[10px] text-muted">
              已点亮 {{ unlockedChronicleCount }}/{{ socialStore.profile.player_chronicle?.milestones.length || 0 }}
            </span>
          </div>
          <div v-if="!socialStore.profile.player_chronicle || socialStore.profile.player_chronicle.milestones.length === 0" class="text-[10px] text-muted mt-2">
            当前还没有可回看的联机史册记录。
          </div>
          <div v-else class="space-y-2 mt-2">
            <div
              v-for="entry in socialStore.profile.player_chronicle.milestones"
              :key="entry.id"
              class="border rounded-xs px-2 py-2"
              :class="entry.unlocked ? 'border-accent/20 bg-accent/5' : 'border-accent/10 bg-bg/10'"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                  {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未达成' }}
                </span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">
                {{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}
              </p>
            </div>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] text-muted">荣誉系统</p>
            <span class="text-[10px] text-muted">
              已解锁 {{ unlockedHonorCount }}/{{ socialStore.profile.award_showcase.honors.length }}
            </span>
          </div>
          <div class="space-y-2 mt-2">
            <div
              v-for="entry in socialStore.profile.award_showcase.honors"
              :key="entry.id"
              class="border rounded-xs px-2 py-2"
              :class="entry.unlocked ? 'border-accent/20 bg-accent/5' : 'border-accent/10 bg-bg/10'"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                  {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未达成' }}
                </span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] text-muted">纪念品与称号</p>
            <span class="text-[10px] text-muted">
              纪念 {{ unlockedCommemorativeCount }}/{{ socialStore.profile.award_showcase.commemoratives.length }} · 称号 {{ unlockedTitleCount }}/{{ socialStore.profile.award_showcase.titles.length }}
            </span>
          </div>
          <div class="space-y-2 mt-2">
            <div
              v-for="entry in socialStore.profile.award_showcase.commemoratives"
              :key="entry.id"
              class="border rounded-xs px-2 py-2"
              :class="entry.unlocked ? 'border-accent/20 bg-accent/5' : 'border-accent/10 bg-bg/10'"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                  {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未收录' }}
                </span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}</p>
            </div>
            <div
              v-for="entry in socialStore.profile.award_showcase.titles"
              :key="entry.id"
              class="border rounded-xs px-2 py-2"
              :class="entry.unlocked ? 'border-success/20 bg-success/5' : 'border-accent/10 bg-bg/10'"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                  {{ entry.label }}
                  <span v-if="entry.active" class="text-[10px] text-accent ml-1">当前展示</span>
                </p>
                <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                  {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未收录' }}
                </span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}</p>
            </div>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] text-muted">可展示成就卡</p>
            <span class="text-[10px] text-muted">
              已点亮 {{ unlockedAchievementCardCount }}/{{ socialStore.profile.award_showcase.achievement_cards.length }}
            </span>
          </div>
          <div class="space-y-2 mt-2">
            <div
              v-for="entry in socialStore.profile.award_showcase.achievement_cards.filter(item => item.unlocked).slice(0, 6)"
              :key="entry.id"
              class="border border-accent/20 rounded-xs px-2 py-2 bg-accent/5"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">{{ entry.label }}</p>
                <span class="text-[10px] text-success">{{ formatChronicleDate(entry.recorded_at) }}</span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.detail || entry.summary }}</p>
            </div>
            <div v-if="unlockedAchievementCardCount === 0" class="text-[10px] text-muted">
              当前还没有可展示的联机成就卡。
            </div>
          </div>
        </div>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <p class="text-xs text-accent">名片设置</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            庄园名
            <input v-model="socialStore.draftManorName" maxlength="40" class="online-input" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            公开称号
            <input v-model="socialStore.draftPublicTitle" maxlength="24" class="online-input" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            邻里身份
            <input v-model="socialStore.draftNeighborhoodRole" maxlength="24" class="online-input" />
          </label>
          <label class="flex flex-col gap-1 text-[10px] text-muted">
            展示主题
            <input v-model="socialStore.draftShowcaseTheme" maxlength="24" class="online-input" />
          </label>
        </div>
        <div class="border border-accent/10 rounded-xs p-2 bg-bg/10 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] text-muted">公开头像</p>
            <Button class="text-[10px]" :disabled="uploadingAvatar" @click="triggerAvatarUpload">
              {{ uploadingAvatar ? '上传中…' : '上传头像' }}
            </Button>
          </div>
          <input ref="avatarInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleAvatarSelected" />
          <div v-if="socialStore.draftAvatarImageUrl" class="space-y-2">
            <img :src="socialStore.draftAvatarImageUrl" :alt="socialStore.draftAvatarImageAlt || '名片头像'" class="mx-auto max-h-32 rounded-xs border border-accent/15 object-cover" />
            <input
              v-model="socialStore.draftAvatarImageAlt"
              maxlength="120"
              class="online-input w-full"
              placeholder="头像说明"
            />
          </div>
        </div>
        <label class="flex flex-col gap-1 text-[10px] text-muted">
          公开状态
          <select v-model="socialStore.draftVisibility" class="online-select">
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
            class="online-textarea resize-none"
            placeholder="例如：这周主打鱼塘与博物馆补展，欢迎来看看。"
          />
        </label>
        <div class="space-y-1">
          <p class="text-[10px] text-muted">手选标签（最多 3 个）</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="tag in socialStore.profile.available_tag_options"
              :key="tag.id"
              class="text-[10px] px-1.5 py-0.5 rounded-xs border transition-colors"
              :class="socialStore.draftSelectedTagIds.includes(tag.id) ? 'border-accent/40 text-accent bg-accent/5' : 'border-accent/15 text-muted'"
              @click="toggleTag(tag.id)"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted">保存后会同步成公开名片预览。</p>
          <Button class="text-[10px]" :disabled="!socialStore.hasDirtyDraft || socialStore.saving" @click="saveProfile">
            {{ socialStore.saving ? '保存中…' : '保存名片' }}
          </Button>
        </div>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">好友驿站</p>
          <Button class="text-[10px]" @click="goFriendStation">
            前往好友驿站
          </Button>
        </div>
        <p class="text-[10px] text-muted leading-5">
          加好友、处理申请、删除、拉黑和好友互动已经统一迁到联机主导航里的好友驿站；这里继续保留公开名片、邻里和订阅内容。
        </p>
      </div>

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">邻里</p>
          <Button class="text-[10px]" :disabled="socialStore.neighborLoading || socialStore.neighborActionRunning" @click="refreshNeighbors">
            {{ socialStore.neighborLoading ? '加载中…' : '刷新邻里' }}
          </Button>
        </div>

        <div class="grid gap-2 md:grid-cols-3">
          <div class="border border-accent/10 rounded-xs p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[10px] text-muted">邻里任务</p>
              <Button class="text-[10px]" @click="goQuestBoard">去看委托</Button>
            </div>
            <p class="text-xs text-accent mt-2">{{ neighborTaskCard.title }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ neighborTaskCard.summary }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted">邻里进度</p>
            <p class="text-xs text-accent mt-2">{{ neighborProgressCard.title }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">{{ neighborProgressCard.summary }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">邻里排行</p>
            <div v-if="neighborLeaderboard.length === 0" class="text-[10px] text-muted leading-4">当前还没有可比较的公开邻里。</div>
            <div v-else class="space-y-1.5">
              <div v-for="(group, index) in neighborLeaderboard" :key="group.id" class="border border-accent/10 rounded-xs px-2 py-1.5">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-accent">{{ index + 1 }}. {{ group.name }}</p>
                  <span class="text-[10px] text-muted">Lv.{{ group.level }}</span>
                </div>
                <p class="text-[10px] text-muted mt-1">{{ group.member_count }}/{{ group.capacity }} 人</p>
              </div>
            </div>
          </div>
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
            <div class="online-action-row">
              <input
                v-model="socialStore.neighborInviteUsernameDraft"
                class="online-input flex-1"
                placeholder="输入玩家用户名"
              />
              <Button class="online-action-btn online-action-btn--primary" :disabled="socialStore.neighborActionRunning" @click="inviteNeighbor">
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
              class="online-input w-full"
              placeholder="邻里名称"
            />
            <input
              v-model="socialStore.neighborSummaryDraft"
              maxlength="120"
              class="online-input w-full"
              placeholder="一句简介，告诉别人你们这群人想过怎样的日子。"
            />
            <textarea
              v-model="socialStore.neighborNoticeDraft"
              rows="2"
              maxlength="160"
              class="online-textarea w-full resize-none"
              placeholder="初始公告"
            />
            <select v-model="socialStore.neighborCapacityDraft" class="online-select w-full">
              <option :value="12">小型邻里（3-12）</option>
              <option :value="30">中型邻里（12-30）</option>
              <option :value="60">大型邻里（30+）</option>
            </select>
            <div class="flex justify-end">
              <Button class="online-action-btn online-action-btn--primary" :disabled="socialStore.neighborActionRunning" @click="createNeighbor">
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

      <div class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">关注与订阅</p>
          <Button class="text-[10px]" :disabled="socialStore.subscriptionsLoading || socialStore.subscriptionsActionRunning" @click="refreshSubscriptions">
            {{ socialStore.subscriptionsLoading ? '加载中…' : '刷新订阅' }}
          </Button>
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <div class="border border-accent/10 rounded-xs p-2 space-y-2">
            <p class="text-[10px] text-muted">快速关注</p>
            <div class="flex flex-wrap gap-2">
              <Button class="text-[10px]" :disabled="socialStore.subscriptionsActionRunning" @click="followPreset('style', socialStore.profile.showcase_theme || '本周经营展示', `庄园风格：${socialStore.profile.showcase_theme || '本周经营展示'}`)">
                关注当前庄园风格
              </Button>
              <Button class="text-[10px]" :disabled="socialStore.subscriptionsActionRunning" @click="followPreset('expert', socialStore.profile.primary_route_label || '田庄经营', `玩法高手：${socialStore.profile.primary_route_label || '田庄经营'}`)">
                订阅主营方向
              </Button>
              <Button class="text-[10px]" :disabled="socialStore.subscriptionsActionRunning || !socialStore.neighborGroup" @click="socialStore.neighborGroup && followPreset('neighbor_group', socialStore.neighborGroup.id, `村社 / 邻里：${socialStore.neighborGroup.name}`)">
                订阅当前邻里
              </Button>
              <Button class="text-[10px]" :disabled="socialStore.subscriptionsActionRunning" @click="followPreset('festival', socialStore.profile.showcase_theme || '本周经营展示', `节庆活动：${socialStore.profile.showcase_theme || '本周经营展示'}`)">
                订阅当前节庆主题
              </Button>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">当前订阅</p>
            <div v-if="socialStore.subscriptions.length === 0" class="text-[10px] text-muted">当前还没有任何关注或订阅。</div>
            <div v-for="entry in socialStore.subscriptions" :key="entry.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs text-accent">{{ entry.label }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ subscriptionTypeLabel(entry.target_type) }}</p>
                </div>
                <Button class="text-[10px]" :disabled="socialStore.subscriptionsActionRunning" @click="unfollow(entry.id)">
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[10px] text-muted mb-1">订阅动态</p>
          <div v-if="socialStore.subscriptionNotices.length === 0" class="text-[10px] text-muted">当前还没有订阅提示。</div>
          <div v-for="notice in socialStore.subscriptionNotices" :key="notice.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">{{ notice.title }}</p>
              <span class="text-[10px] text-muted">{{ new Date(notice.createdAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ notice.message }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import { useSocialStore } from '@/stores/useSocialStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { showFloat } from '@/composables/useGameLog'
  import { uploadHallImage } from '@/utils/taoyuanHallApi'

  const router = useRouter()
  const socialStore = useSocialStore()
  const saveStore = useSaveStore()
  const uploadingAvatar = ref(false)
  const avatarInputRef = ref<HTMLInputElement | null>(null)

  const visibilityLabel = computed(() => {
    if (!socialStore.profile) return '未公开'
    if (socialStore.profile.visibility === 'public') return '公开'
    if (socialStore.profile.visibility === 'friends_only') return '仅好友'
    return '私密'
  })

  const unlockedChronicleCount = computed(() =>
    (socialStore.profile?.player_chronicle?.milestones || []).filter(entry => entry.unlocked).length
  )

  const unlockedHonorCount = computed(() =>
    (socialStore.profile?.award_showcase?.honors || []).filter(entry => entry.unlocked).length
  )

  const unlockedCommemorativeCount = computed(() =>
    (socialStore.profile?.award_showcase?.commemoratives || []).filter(entry => entry.unlocked).length
  )

  const unlockedTitleCount = computed(() =>
    (socialStore.profile?.award_showcase?.titles || []).filter(entry => entry.unlocked).length
  )

  const unlockedAchievementCardCount = computed(() =>
    (socialStore.profile?.award_showcase?.achievement_cards || []).filter(entry => entry.unlocked).length
  )
  const currentSaveIdentityLabel = computed(() => {
    const identity = saveStore.currentOnlineIdentity
    if (!identity?.save_id) return '尚未绑定服务端存档 ID'
    const slotLabel = identity.save_slot === null || identity.save_slot === undefined
      ? ''
      : ` · 槽位 ${Number(identity.save_slot) + 1}`
    return `${identity.save_id}${slotLabel}`
  })
  const neighborLeaderboard = computed(() =>
    [...socialStore.neighborPublicGroups]
      .sort((left, right) => right.level - left.level || right.member_count - left.member_count || left.name.localeCompare(right.name, 'zh-CN'))
      .slice(0, 3)
  )
  const neighborTaskCard = computed(() => {
    if (!socialStore.neighborGroup) {
      return {
        title: '先加入一个邻里',
        summary: '先从公开邻里里挑一个申请加入，之后再去委托面板接互助单。'
      }
    }
    if (!socialStore.neighborGroup.notice?.trim()) {
      return {
        title: '补一条本周公告',
        summary: '先把本周在忙什么写清楚，成员和访客更容易跟上节奏。'
      }
    }
    const openSlots = Math.max(socialStore.neighborGroup.capacity - socialStore.neighborGroup.member_count, 0)
    if (openSlots > 0) {
      return {
        title: '继续招募邻里成员',
        summary: `当前还有 ${openSlots} 个空位，可以继续邀请好友或处理入组申请。`
      }
    }
    if ((socialStore.neighborGroup.activity_log || []).length === 0) {
      return {
        title: '让邻里先动起来',
        summary: '先处理一条申请、邀请或委托协作，给邻里留下第一条动态。'
      }
    }
    return {
      title: '把互助单接到邻里里',
      summary: '邻里骨架已经跑通，接下来更适合去委托面板组织公开 / 邻里协作单。'
    }
  })
  const neighborProgressCard = computed(() => {
    if (!socialStore.neighborGroup) {
      return {
        title: `当前公开邻里 ${socialStore.neighborPublicGroups.length} 个`,
        summary: '先从公开邻里列表里挑一个等级、人数和主题更合适的去申请加入。'
      }
    }
    const openSlots = Math.max(socialStore.neighborGroup.capacity - socialStore.neighborGroup.member_count, 0)
    const activityCount = socialStore.neighborGroup.activity_log?.length || 0
    return {
      title: `Lv.${socialStore.neighborGroup.level} · ${socialStore.neighborGroup.member_count}/${socialStore.neighborGroup.capacity} 人`,
      summary: `当前还剩 ${openSlots} 个空位，最近累计留下 ${activityCount} 条邻里动态。`
    }
  })

  const formatChronicleDate = (timestamp: number) => {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const refreshProfile = async () => {
    await socialStore.refreshProfile().catch(() => {})
  }

  const saveProfile = async () => {
    await socialStore.saveProfile().catch(() => {})
  }

  const triggerAvatarUpload = () => {
    avatarInputRef.value?.click()
  }

  const handleAvatarSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return
    uploadingAvatar.value = true
    try {
      const uploaded = await uploadHallImage(file, 'profile_avatar')
      socialStore.draftAvatarImageUrl = uploaded.url
      socialStore.draftAvatarImageAlt = uploaded.alt || file.name.replace(/\.[^.]+$/, '')
    } catch (error: any) {
      showFloat(error?.message || '上传头像失败', 'danger')
    } finally {
      uploadingAvatar.value = false
      if (input) input.value = ''
    }
  }

  const toggleTag = (tagId: string) => {
    socialStore.toggleSelectedTag(tagId)
  }

  const refreshNeighbors = async () => {
    await socialStore.refreshNeighborOverview().catch(() => {})
  }

  const goQuestBoard = () => {
    void router.push('/game/quest')
  }

  const goFriendStation = () => {
    void router.push('/game/friend-station')
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

  const refreshSubscriptions = async () => {
    await socialStore.refreshSubscriptions().catch(() => {})
  }

  const followPreset = async (targetType: 'style' | 'expert' | 'neighbor_group' | 'festival', targetId: string, label: string) => {
    await socialStore.followPreset(targetType, targetId, label).catch(() => {})
  }

  const unfollow = async (subscriptionId: string) => {
    await socialStore.unfollow(subscriptionId).catch(() => {})
  }

  const subscriptionTypeLabel = (type: 'style' | 'expert' | 'neighbor_group' | 'festival') => {
    if (type === 'style') return '庄园风格'
    if (type === 'expert') return '玩法高手'
    if (type === 'neighbor_group') return '村社 / 邻里'
    return '节庆活动'
  }

  onMounted(() => {
    if (!socialStore.profile) {
      void refreshProfile()
    }
    void refreshNeighbors()
    void refreshSubscriptions()
  })
</script>
