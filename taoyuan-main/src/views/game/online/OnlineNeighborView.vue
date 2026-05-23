<template>
  <div class="space-y-3" data-testid="online-neighbor-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Users :size="16" />
            <h2 class="game-section-title">在线邻里</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ identityLabel }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="refreshRunning"
            @click="refreshNeighborShell"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': refreshRunning }" />
            {{ refreshRunning ? '刷新中' : '刷新邻里' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="socialStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
        {{ socialStore.errorMessage }}
      </div>

      <div class="grid gap-2 text-xs md:grid-cols-4">
        <div v-for="stat in identityStats" :key="stat.label" class="game-panel-muted px-2 py-2">
          <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
          <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 border px-3 py-2 text-xs transition-colors"
          :class="activeTab === tab.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="{ name: 'social' }">
          <ExternalLink :size="12" />
          完整邻里页
        </RouterLink>
      </div>

      <div v-if="activeTab === 'profile'" class="space-y-3">
        <div v-if="!socialStore.profile" class="game-panel-muted p-3 text-xs leading-5 text-muted">
          暂未载入公开名片。刷新后会在这里显示名片摘要。
        </div>

        <template v-else>
          <div class="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div class="game-panel-muted space-y-3 p-3">
              <div class="flex flex-col gap-3 md:flex-row md:items-start">
                <div
                  class="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden border border-accent/10 bg-black/10 md:w-28"
                >
                  <img
                    v-if="socialStore.profile.avatar_image_url"
                    :src="socialStore.profile.avatar_image_url"
                    :alt="socialStore.profile.avatar_image_alt || '名片头像'"
                    class="h-full w-full object-cover"
                  />
                  <IdCard v-else :size="32" class="text-accent/60" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0">
                      <p class="text-sm text-accent">{{ socialStore.displayTitle }}</p>
                      <p class="mt-1 text-xs leading-5 text-muted">
                        {{ socialStore.profile.display_name }} · {{ socialStore.profile.honorific }}
                      </p>
                    </div>
                    <span class="w-fit shrink-0 border border-accent/20 px-2 py-1 text-[10px] text-accent">
                      {{ profileVisibilityLabel }}
                    </span>
                  </div>
                  <p v-if="socialStore.profile.avatar_image_alt" class="mt-2 text-[10px] leading-4 text-muted">
                    {{ socialStore.profile.avatar_image_alt }}
                  </p>
                  <p class="mt-3 text-xs leading-5">
                    {{ socialStore.profile.public_intro || '这个人还没写公开介绍。' }}
                  </p>
                </div>
              </div>

              <div class="grid gap-2 text-xs md:grid-cols-2">
                <div class="border border-accent/10 bg-black/10 p-2 md:col-span-2">
                  <p class="text-[10px] text-muted">当前存档 ID</p>
                  <p class="mt-1 break-all text-accent">{{ currentSaveIdentityLabel }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">庄园名</p>
                  <p class="mt-1 text-accent">{{ socialStore.profile.manor_name || '未填写' }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ socialStore.profile.public_title || '未设置称号' }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">季节进度</p>
                  <p class="mt-1 text-accent">{{ socialStore.profile.season_progress || '未同步' }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ socialStore.profile.showcase_theme || '未设置主题' }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">主营方向</p>
                  <p class="mt-1 text-accent">{{ socialStore.profile.primary_route_label || '未设置' }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2">
                  <p class="text-[10px] text-muted">邻里身份</p>
                  <p class="mt-1 text-accent">{{ socialStore.profile.neighborhood_role || '未设置' }}</p>
                </div>
                <div class="border border-accent/10 bg-black/10 p-2 md:col-span-2">
                  <p class="text-[10px] text-muted">最近活跃</p>
                  <p class="mt-1 text-accent">{{ socialStore.profile.recent_activity || '暂无记录' }}</p>
                </div>
              </div>

              <div class="border border-accent/10 bg-black/10 p-2 text-xs">
                <p class="text-[10px] text-muted">关系标签</p>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="tag in socialStore.profile.public_tags"
                    :key="tag.id"
                    class="border px-1.5 py-0.5 text-[10px]"
                    :class="tag.source === 'selected' ? 'border-accent/40 bg-accent/5 text-accent' : 'border-accent/15 text-muted'"
                  >
                    {{ tag.label }}
                  </span>
                  <span v-if="socialStore.profile.public_tags.length === 0" class="text-[10px] text-muted">
                    当前还没有公开标签。
                  </span>
                </div>
              </div>
            </div>

            <div class="game-panel-muted space-y-3 p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">名片设置</p>
                <button
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="!socialStore.hasDirtyDraft || socialStore.saving"
                  @click="saveProfile"
                >
                  <Save :size="12" />
                  {{ socialStore.saving ? '保存中' : '保存名片' }}
                </button>
              </div>

              <div class="grid gap-2 md:grid-cols-2">
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

              <div class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">公开头像</p>
                  <button
                    class="online-action-btn online-action-btn--compact"
                    type="button"
                    :disabled="uploadingAvatar"
                    @click="triggerAvatarUpload"
                  >
                    <Upload :size="12" />
                    {{ uploadingAvatar ? '上传中' : '上传头像' }}
                  </button>
                </div>
                <input
                  ref="avatarInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden"
                  @change="handleAvatarSelected"
                />
                <div v-if="socialStore.draftAvatarImageUrl" class="mt-2 space-y-2">
                  <img
                    :src="socialStore.draftAvatarImageUrl"
                    :alt="socialStore.draftAvatarImageAlt || '名片头像'"
                    class="mx-auto max-h-32 border border-accent/15 object-cover"
                  />
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

              <div class="space-y-2">
                <p class="text-[10px] text-muted">手选标签（最多 3 个）</p>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="tag in socialStore.profile.available_tag_options"
                    :key="tag.id"
                    class="border px-1.5 py-0.5 text-[10px] transition-colors"
                    :class="socialStore.draftSelectedTagIds.includes(tag.id) ? 'border-accent/40 bg-accent/5 text-accent' : 'border-accent/15 text-muted'"
                    type="button"
                    @click="toggleTag(tag.id)"
                  >
                    {{ tag.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <details class="game-panel-muted p-3">
            <summary class="cursor-pointer text-sm text-accent">
              展示档案 · 史册 {{ unlockedChronicleCount }} / 荣誉 {{ unlockedHonorCount }} / 纪念 {{ unlockedCommemorativeCount }} / 成就 {{ unlockedAchievementCardCount }}
            </summary>
            <div class="mt-3 grid gap-3 lg:grid-cols-2">
              <div class="border border-accent/10 bg-black/10 p-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">玩家史册</p>
                  <span class="text-[10px] text-muted">
                    已点亮 {{ unlockedChronicleCount }}/{{ socialStore.profile.player_chronicle?.milestones.length || 0 }}
                  </span>
                </div>
                <div
                  v-if="!socialStore.profile.player_chronicle || socialStore.profile.player_chronicle.milestones.length === 0"
                  class="mt-2 text-[10px] text-muted"
                >
                  当前还没有可回看的联机史册记录。
                </div>
                <div v-else class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  <div
                    v-for="entry in socialStore.profile.player_chronicle.milestones"
                    :key="entry.id"
                    class="border px-2 py-2"
                    :class="entry.unlocked ? 'border-accent/20 bg-accent/5' : 'border-accent/10 bg-black/10'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                      <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                        {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未达成' }}
                      </span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-muted">
                      {{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="border border-accent/10 bg-black/10 p-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">荣誉系统</p>
                  <span class="text-[10px] text-muted">
                    已解锁 {{ unlockedHonorCount }}/{{ socialStore.profile.award_showcase.honors.length }}
                  </span>
                </div>
                <div class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  <div
                    v-for="entry in socialStore.profile.award_showcase.honors"
                    :key="entry.id"
                    class="border px-2 py-2"
                    :class="entry.unlocked ? 'border-accent/20 bg-accent/5' : 'border-accent/10 bg-black/10'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                      <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                        {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未达成' }}
                      </span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-muted">
                      {{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="border border-accent/10 bg-black/10 p-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">纪念品与称号</p>
                  <span class="text-[10px] text-muted">
                    纪念 {{ unlockedCommemorativeCount }}/{{ socialStore.profile.award_showcase.commemoratives.length }} · 称号 {{ unlockedTitleCount }}/{{ socialStore.profile.award_showcase.titles.length }}
                  </span>
                </div>
                <div class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  <div
                    v-for="entry in socialStore.profile.award_showcase.commemoratives"
                    :key="entry.id"
                    class="border px-2 py-2"
                    :class="entry.unlocked ? 'border-accent/20 bg-accent/5' : 'border-accent/10 bg-black/10'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs" :class="entry.unlocked ? 'text-accent' : 'text-muted'">{{ entry.label }}</p>
                      <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                        {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未收录' }}
                      </span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-muted">
                      {{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}
                    </p>
                  </div>
                  <div
                    v-for="entry in socialStore.profile.award_showcase.titles"
                    :key="entry.id"
                    class="border px-2 py-2"
                    :class="entry.unlocked ? 'border-success/20 bg-success/5' : 'border-accent/10 bg-black/10'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                        {{ entry.label }}
                        <span v-if="entry.active" class="ml-1 text-[10px] text-accent">当前展示</span>
                      </p>
                      <span class="text-[10px]" :class="entry.unlocked ? 'text-success' : 'text-muted'">
                        {{ entry.unlocked ? formatChronicleDate(entry.recorded_at) : '未收录' }}
                      </span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-muted">
                      {{ entry.unlocked ? entry.detail || entry.summary : entry.summary }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="border border-accent/10 bg-black/10 p-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">可展示成就卡</p>
                  <span class="text-[10px] text-muted">
                    已点亮 {{ unlockedAchievementCardCount }}/{{ socialStore.profile.award_showcase.achievement_cards.length }}
                  </span>
                </div>
                <div class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  <div
                    v-for="entry in unlockedAchievementCards"
                    :key="entry.id"
                    class="border border-accent/20 bg-accent/5 px-2 py-2"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs text-accent">{{ entry.label }}</p>
                      <span class="text-[10px] text-success">{{ formatChronicleDate(entry.recorded_at) }}</span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.detail || entry.summary }}</p>
                  </div>
                  <div v-if="unlockedAchievementCardCount === 0" class="text-[10px] text-muted">
                    当前还没有可展示的联机成就卡。
                  </div>
                </div>
              </div>
            </div>
          </details>
        </template>
      </div>

      <div v-else-if="activeTab === 'friends'" class="game-panel-muted grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <div class="space-y-3">
          <div class="grid gap-2 text-xs md:grid-cols-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">好友</p>
              <p class="mt-1 text-accent">{{ socialStore.friends.length }} 位</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">收到申请</p>
              <p class="mt-1 text-accent">{{ socialStore.incomingRequests.length }} 条</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">发出申请</p>
              <p class="mt-1 text-accent">{{ socialStore.outgoingRequests.length }} 条</p>
            </div>
          </div>
          <p class="text-xs leading-5 text-muted">
            好友搜索、申请处理、访问庄园、写信、送礼和房间邀请使用独立好友驿站承接。
          </p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact h-fit justify-center" :to="{ name: 'friend-station' }">
          <ExternalLink :size="12" />
          好友驿站
        </RouterLink>
      </div>

      <div v-else-if="activeTab === 'neighbor'" class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div class="space-y-3">
          <div class="border border-accent/10 bg-black/10 p-3">
            <p class="text-xs text-accent">{{ neighborGroupTitle }}</p>
            <p class="mt-1 text-[10px] leading-5 text-muted">{{ neighborGroupSummary }}</p>
          </div>
          <div class="grid gap-2 text-xs md:grid-cols-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">公开邻里</p>
              <p class="mt-1 text-accent">{{ socialStore.neighborPublicGroups.length }} 个</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">收到邀请</p>
              <p class="mt-1 text-accent">{{ socialStore.neighborIncomingInvites.length }} 条</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">待处理申请</p>
              <p class="mt-1 text-accent">{{ socialStore.neighborManagedRequests.length }} 条</p>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div v-for="group in publicGroupPreview" :key="group.id" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-xs text-accent">{{ group.name }}</p>
            <p class="mt-1 text-[10px] text-muted">Lv.{{ group.level }} · {{ group.member_count }}/{{ group.capacity }} 人</p>
          </div>
          <div v-if="publicGroupPreview.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
            当前没有公开邻里摘要。
          </div>
        </div>
      </div>

      <div v-else class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div class="space-y-3">
          <div class="grid gap-2 text-xs md:grid-cols-2">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">当前订阅</p>
              <p class="mt-1 text-accent">{{ socialStore.subscriptions.length }} 项</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">订阅提示</p>
              <p class="mt-1 text-accent">{{ socialStore.subscriptionNotices.length }} 条</p>
            </div>
          </div>
          <p class="text-xs leading-5 text-muted">
            庄园风格、玩法高手、邻里组织和节庆主题关注项集中在这里。
          </p>
        </div>
        <div class="space-y-2">
          <div v-for="entry in subscriptionPreview" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
            <p class="text-xs text-accent">{{ entry.label }}</p>
            <p class="mt-1 text-[10px] text-muted">{{ subscriptionTypeLabel(entry.target_type) }}</p>
          </div>
          <div v-if="subscriptionPreview.length === 0" class="border border-accent/10 bg-black/10 p-3 text-xs text-muted">
            当前还没有关注或订阅。
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ArrowLeft, ExternalLink, IdCard, RefreshCw, Save, Upload, Users } from 'lucide-vue-next'
  import { useSocialStore } from '@/stores/useSocialStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { showFloat } from '@/composables/useGameLog'
  import { uploadHallImage } from '@/utils/taoyuanHallApi'

  type NeighborTabKey = 'profile' | 'friends' | 'neighbor' | 'subscriptions'
  type NeighborTabMeta = { key: NeighborTabKey; label: string; summary: string }

  const socialStore = useSocialStore()
  const saveStore = useSaveStore()
  const activeTab = ref<NeighborTabKey>('profile')
  const lastRefreshAttemptAt = ref(0)
  const uploadingAvatar = ref(false)
  const avatarInputRef = ref<HTMLInputElement | null>(null)
  const tabs: NeighborTabMeta[] = [
    { key: 'profile', label: '名片', summary: '公开名片摘要与主要入口独立展示。' },
    { key: 'friends', label: '好友', summary: '好友主操作从这里进入好友驿站。' },
    { key: 'neighbor', label: '邻里', summary: '邻里组织、申请和邀请摘要集中在这里。' },
    { key: 'subscriptions', label: '订阅', summary: '关注项和订阅提示单独成区。' },
  ]
  const defaultTab = tabs[0]!

  const refreshRunning = computed(() =>
    socialStore.loading ||
    socialStore.relationshipLoading ||
    socialStore.neighborLoading ||
    socialStore.subscriptionsLoading
  )
  const activeTabMeta = computed<NeighborTabMeta>(() => tabs.find(tab => tab.key === activeTab.value) ?? defaultTab)
  const profileVisibilityLabel = computed(() => {
    if (!socialStore.profile) return '未公开'
    if (socialStore.profile.visibility === 'public') return '公开'
    if (socialStore.profile.visibility === 'friends_only') return '仅好友'
    return '私密'
  })
  const identityLabel = computed(() => {
    if (!socialStore.profile) return '公开名片、好友、邻里组织和订阅分区管理。'
    return `${socialStore.displayTitle} · ${profileVisibilityLabel.value}名片`
  })
  const refreshStateLabel = computed(() => {
    if (refreshRunning.value) return '正在刷新邻里摘要'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })
  const neighborGroupLabel = computed(() => {
    if (!socialStore.neighborGroup) return '未加入'
    return socialStore.neighborGroup.name || '已加入邻里'
  })
  const identityStats = computed(() => [
    { label: '名片', value: socialStore.profile ? profileVisibilityLabel.value : '未载入' },
    { label: '好友', value: `${socialStore.friends.length} 位` },
    { label: '邻里', value: neighborGroupLabel.value },
    { label: '订阅', value: `${socialStore.subscriptions.length} 项` },
  ])
  const currentSaveIdentityLabel = computed(() => {
    const identity = saveStore.currentOnlineIdentity
    if (!identity?.save_id) return '尚未绑定服务端存档 ID'
    const slotLabel = identity.save_slot === null || identity.save_slot === undefined
      ? ''
      : ` · 槽位 ${Number(identity.save_slot) + 1}`
    return `${identity.save_id}${slotLabel}`
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
  const unlockedAchievementCards = computed(() =>
    (socialStore.profile?.award_showcase?.achievement_cards || []).filter(entry => entry.unlocked).slice(0, 6)
  )
  const unlockedAchievementCardCount = computed(() =>
    (socialStore.profile?.award_showcase?.achievement_cards || []).filter(entry => entry.unlocked).length
  )
  const neighborGroupTitle = computed(() => socialStore.neighborGroup?.name || '尚未加入邻里')
  const neighborGroupSummary = computed(() => {
    if (!socialStore.neighborGroup) return '可以从公开邻里里申请加入，也可以在完整邻里页创建自己的邻里组织。'
    return socialStore.neighborGroup.summary || socialStore.neighborGroup.notice || '这个邻里还没写简介。'
  })
  const publicGroupPreview = computed(() => socialStore.neighborPublicGroups.slice(0, 3))
  const subscriptionPreview = computed(() => socialStore.subscriptions.slice(0, 3))

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

  const subscriptionTypeLabel = (type: 'style' | 'expert' | 'neighbor_group' | 'festival') => {
    if (type === 'style') return '庄园风格'
    if (type === 'expert') return '玩法高手'
    if (type === 'neighbor_group') return '村社 / 邻里'
    return '节庆活动'
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

  const refreshNeighborShell = async () => {
    await Promise.allSettled([
      socialStore.refreshProfile(),
      socialStore.refreshRelationships(),
      socialStore.refreshNeighborOverview(),
      socialStore.refreshSubscriptions(),
    ])
    lastRefreshAttemptAt.value = Date.now()
  }

  onMounted(() => {
    void refreshNeighborShell()
  })
</script>
