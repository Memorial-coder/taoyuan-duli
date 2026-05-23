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

      <div
        v-else-if="activeTab === 'friends'"
        class="game-panel-muted grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_240px]"
        data-testid="online-neighbor-friends-entry"
      >
        <div class="space-y-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">好友驿站</p>
              <p class="mt-1 text-xs leading-5 text-muted">
                好友搜索、申请、黑名单和目标玩家互动由独立驿站承接。
              </p>
            </div>
            <button
              class="online-action-btn online-action-btn--compact shrink-0"
              type="button"
              :disabled="socialStore.relationshipLoading"
              @click="refreshFriendSummary"
            >
              <RefreshCw :size="12" :class="{ 'animate-spin': socialStore.relationshipLoading }" />
              {{ socialStore.relationshipLoading ? '刷新中' : '刷新好友' }}
            </button>
          </div>
          <div class="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
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
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">已拉黑</p>
              <p class="mt-1 text-accent">{{ socialStore.blockedUsers.length }} 位</p>
            </div>
          </div>
        </div>
        <RouterLink
          class="online-action-btn online-action-btn--compact h-fit justify-center"
          :to="{ name: 'friend-station', query: { source: 'online_neighbor' } }"
          data-testid="online-neighbor-friend-station-link"
        >
          <ExternalLink :size="12" />
          好友驿站
        </RouterLink>
      </div>

      <div v-else-if="activeTab === 'neighbor'" class="space-y-3" data-testid="online-neighbor-group-page">
        <div class="game-panel-muted space-y-3 p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ neighborGroupTitle }}</p>
              <p class="mt-1 text-xs leading-5 text-muted">{{ neighborGroupSummary }}</p>
            </div>
            <button
              class="online-action-btn online-action-btn--compact shrink-0"
              type="button"
              :disabled="socialStore.neighborLoading"
              @click="refreshNeighborSummary"
            >
              <RefreshCw :size="12" :class="{ 'animate-spin': socialStore.neighborLoading }" />
              {{ socialStore.neighborLoading ? '刷新中' : '刷新邻里' }}
            </button>
          </div>

          <div class="grid gap-2 text-xs md:grid-cols-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">邻里任务</p>
                <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'quest', query: { scope: 'neighbor' } }">
                  去看委托
                </RouterLink>
              </div>
              <p class="mt-2 text-xs text-accent">{{ neighborTaskCard.title }}</p>
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ neighborTaskCard.summary }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">邻里进度</p>
              <p class="mt-2 text-xs text-accent">{{ neighborProgressCard.title }}</p>
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ neighborProgressCard.summary }}</p>
            </div>
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">邻里排行</p>
              <div v-if="neighborLeaderboard.length === 0" class="mt-2 text-[10px] leading-4 text-muted">
                当前还没有可比较的公开邻里。
              </div>
              <div v-else class="mt-2 space-y-1.5">
                <div v-for="(group, index) in neighborLeaderboard" :key="group.id" class="border border-accent/10 px-2 py-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <p class="truncate text-[10px] text-accent">{{ index + 1 }}. {{ group.name }}</p>
                    <span class="shrink-0 text-[10px] text-muted">Lv.{{ group.level }}</span>
                  </div>
                  <p class="mt-1 text-[10px] text-muted">{{ group.member_count }}/{{ group.capacity }} 人</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
          <div class="space-y-3">
            <template v-if="socialStore.neighborGroup">
              <div class="game-panel-muted space-y-3 p-3">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0">
                    <p class="text-sm text-accent">{{ socialStore.neighborGroup.name }}</p>
                    <p class="mt-1 text-xs leading-5 text-muted">
                      {{ socialStore.neighborGroup.summary || '这个邻里还没写简介。' }}
                    </p>
                  </div>
                  <span class="w-fit shrink-0 border border-accent/20 px-2 py-1 text-[10px] text-muted">
                    Lv.{{ socialStore.neighborGroup.level }} · {{ socialStore.neighborGroup.member_count }}/{{ socialStore.neighborGroup.capacity }}
                  </span>
                </div>
                <div class="grid gap-2 text-xs md:grid-cols-3">
                  <div class="border border-accent/10 bg-black/10 p-2">
                    <p class="text-[10px] text-muted">我的身份</p>
                    <p class="mt-1 text-accent">{{ neighborRoleLabel(socialStore.neighborGroup.role) }}</p>
                  </div>
                  <div class="border border-accent/10 bg-black/10 p-2">
                    <p class="text-[10px] text-muted">成员</p>
                    <p class="mt-1 text-accent">{{ socialStore.neighborGroup.member_count }} 人</p>
                  </div>
                  <div class="border border-accent/10 bg-black/10 p-2">
                    <p class="text-[10px] text-muted">待处理</p>
                    <p class="mt-1 text-accent">{{ socialStore.neighborManagedRequests.length }} 条</p>
                  </div>
                </div>

                <div v-if="canManageNeighbor" class="space-y-2">
                  <label class="flex flex-col gap-1 text-[10px] text-muted">
                    邻里公告
                    <textarea
                      v-model="socialStore.neighborNoticeDraft"
                      rows="2"
                      maxlength="160"
                      class="online-textarea resize-none"
                      placeholder="写一句让成员一眼知道本周在忙什么。"
                    />
                  </label>
                  <div class="flex justify-end">
                    <button
                      class="online-action-btn online-action-btn--compact"
                      type="button"
                      :disabled="socialStore.neighborActionRunning"
                      @click="saveNeighborNotice"
                    >
                      保存公告
                    </button>
                  </div>
                </div>
                <div v-else class="border border-accent/10 bg-black/10 p-2 text-xs">
                  <p class="text-[10px] text-muted">邻里公告</p>
                  <p class="mt-1 leading-5">{{ socialStore.neighborGroup.notice || '暂无公告' }}</p>
                </div>
              </div>

              <div class="game-panel-muted p-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm text-accent">成员</p>
                  <span class="text-[10px] text-muted">{{ neighborMembers.length }} 人</span>
                </div>
                <div v-if="neighborMembers.length === 0" class="mt-2 text-xs text-muted">
                  当前还没有成员信息。
                </div>
                <div v-else class="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                  <div v-for="member in neighborMembers" :key="member.username" class="border border-accent/10 bg-black/10 p-2">
                    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div class="min-w-0">
                        <p class="truncate text-xs text-accent">{{ member.username }}</p>
                        <p class="mt-1 text-[10px] text-muted">{{ formatChronicleDate(member.joined_at) || '加入时间未记录' }}</p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-[10px] text-muted">{{ neighborRoleLabel(member.role) }}</span>
                        <button
                          v-if="canChangeNeighborRoles && member.role !== 'leader'"
                          class="online-action-btn online-action-btn--compact"
                          type="button"
                          :disabled="socialStore.neighborActionRunning"
                          @click="setNeighborRole(member.username, member.role === 'manager' ? 'member' : 'manager')"
                        >
                          {{ member.role === 'manager' ? '改普通成员' : '升为管事' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="game-panel-muted p-3">
                <p class="text-sm text-accent">邻里动态</p>
                <div v-if="neighborActivityLog.length === 0" class="mt-2 text-xs text-muted">
                  当前还没有新的邻里动态。
                </div>
                <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  <div v-for="entry in neighborActivityLog" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs">{{ entry.message }}</p>
                      <span class="shrink-0 text-[10px] text-muted">{{ formatChronicleDate(entry.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="game-panel-muted space-y-2 p-3">
                <p class="text-sm text-accent">创建邻里</p>
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
                  <button
                    class="online-action-btn online-action-btn--compact"
                    type="button"
                    :disabled="socialStore.neighborActionRunning || !socialStore.neighborNameDraft.trim()"
                    @click="createNeighbor"
                  >
                    创建邻里
                  </button>
                </div>
              </div>
            </template>
          </div>

          <div class="space-y-3">
            <div class="game-panel-muted p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-accent">公开邻里</p>
                <span class="text-[10px] text-muted">{{ socialStore.neighborPublicGroups.length }} 个</span>
              </div>
              <div v-if="socialStore.neighborPublicGroups.length === 0" class="mt-2 text-xs text-muted">
                当前还没有公开邻里。
              </div>
              <div v-else class="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                <div v-for="group in socialStore.neighborPublicGroups" :key="group.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-xs text-accent">{{ group.name }}</p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">{{ group.summary || '这个邻里还没写简介。' }}</p>
                    </div>
                    <span class="shrink-0 text-[10px] text-muted">Lv.{{ group.level }} · {{ group.member_count }}/{{ group.capacity }}</span>
                  </div>
                  <p class="mt-2 text-[10px] leading-4 text-muted">公告：{{ group.notice || '暂无公告' }}</p>
                  <div v-if="!socialStore.neighborGroup && group.can_apply" class="mt-2 flex justify-end">
                    <button
                      class="online-action-btn online-action-btn--compact"
                      type="button"
                      :disabled="socialStore.neighborActionRunning"
                      @click="applyNeighbor(group.id)"
                    >
                      申请加入
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="socialStore.neighborGroup && canManageNeighbor" class="game-panel-muted space-y-2 p-3">
              <p class="text-sm text-accent">邀请成员</p>
              <div class="online-action-row">
                <input
                  v-model="socialStore.neighborInviteUsernameDraft"
                  class="online-input min-w-0 flex-1"
                  placeholder="输入玩家用户名"
                />
                <button
                  class="online-action-btn online-action-btn--compact"
                  type="button"
                  :disabled="socialStore.neighborActionRunning || !socialStore.neighborInviteUsernameDraft.trim()"
                  @click="inviteNeighbor"
                >
                  发送邀请
                </button>
              </div>
            </div>

            <div class="game-panel-muted p-3">
              <p class="text-sm text-accent">申请与邀请</p>
              <div v-if="neighborPendingRequests.length === 0" class="mt-2 text-xs text-muted">
                当前没有新的邻里申请或邀请。
              </div>
              <div v-else class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                <div v-for="entry in neighborPendingRequests" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs text-accent">
                        <template v-if="entry.type === 'apply'">{{ entry.username }} 申请加入</template>
                        <template v-else>收到邻里邀请：{{ entry.group_name || entry.group_id }}</template>
                      </p>
                      <p class="mt-1 text-[10px] text-muted">{{ formatChronicleDate(entry.created_at) }}</p>
                    </div>
                    <div class="flex shrink-0 gap-2">
                      <button
                        class="online-action-btn online-action-btn--compact"
                        type="button"
                        :disabled="socialStore.neighborActionRunning || (entry.type === 'apply' && !canManageNeighbor)"
                        @click="acceptNeighbor(entry.id)"
                      >
                        接受
                      </button>
                      <button
                        class="online-action-btn online-action-btn--compact"
                        type="button"
                        :disabled="socialStore.neighborActionRunning || (entry.type === 'apply' && !canManageNeighbor)"
                        @click="rejectNeighbor(entry.id)"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
    if (!socialStore.neighborGroup) return '可以从公开邻里里申请加入，也可以在邻里标签里创建自己的邻里组织。'
    return socialStore.neighborGroup.summary || socialStore.neighborGroup.notice || '这个邻里还没写简介。'
  })
  const canManageNeighbor = computed(() => {
    const role = socialStore.neighborGroup?.role
    return role === 'leader' || role === 'manager'
  })
  const canChangeNeighborRoles = computed(() => socialStore.neighborGroup?.role === 'leader')
  const neighborMembers = computed(() => socialStore.neighborGroup?.members || [])
  const neighborActivityLog = computed(() => socialStore.neighborGroup?.activity_log || [])
  const neighborPendingRequests = computed(() => [
    ...(canManageNeighbor.value ? socialStore.neighborManagedRequests : []),
    ...socialStore.neighborIncomingInvites,
  ])
  const neighborLeaderboard = computed(() =>
    [...socialStore.neighborPublicGroups]
      .sort((left, right) => right.level - left.level || right.member_count - left.member_count || left.name.localeCompare(right.name, 'zh-CN'))
      .slice(0, 3)
  )
  const neighborTaskCard = computed(() => {
    if (!socialStore.neighborGroup) {
      return {
        title: '先加入一个邻里',
        summary: '先从公开邻里里挑一个申请加入，之后再去委托面板接互助单。',
      }
    }
    if (!socialStore.neighborGroup.notice?.trim()) {
      return {
        title: '补一条本周公告',
        summary: canManageNeighbor.value
          ? '先把本周在忙什么写清楚，成员和访客更容易跟上节奏。'
          : '当前邻里还没有公告，可以提醒管事补上本周方向。',
      }
    }
    const openSlots = Math.max(socialStore.neighborGroup.capacity - socialStore.neighborGroup.member_count, 0)
    if (openSlots > 0) {
      return {
        title: '继续招募邻里成员',
        summary: `当前还有 ${openSlots} 个空位，可以继续邀请好友或处理入组申请。`,
      }
    }
    if ((socialStore.neighborGroup.activity_log || []).length === 0) {
      return {
        title: '让邻里先动起来',
        summary: '先处理一条申请、邀请或委托协作，给邻里留下第一条动态。',
      }
    }
    return {
      title: '把互助单接到邻里里',
      summary: '邻里骨架已经跑通，接下来更适合去委托面板组织公开 / 邻里协作单。',
    }
  })
  const neighborProgressCard = computed(() => {
    if (!socialStore.neighborGroup) {
      return {
        title: `当前公开邻里 ${socialStore.neighborPublicGroups.length} 个`,
        summary: '先从公开邻里列表里挑一个等级、人数和主题更合适的去申请加入。',
      }
    }
    const openSlots = Math.max(socialStore.neighborGroup.capacity - socialStore.neighborGroup.member_count, 0)
    const activityCount = socialStore.neighborGroup.activity_log?.length || 0
    return {
      title: `Lv.${socialStore.neighborGroup.level} · ${socialStore.neighborGroup.member_count}/${socialStore.neighborGroup.capacity} 人`,
      summary: `当前还剩 ${openSlots} 个空位，最近累计留下 ${activityCount} 条邻里动态。`,
    }
  })
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

  const refreshFriendSummary = async () => {
    await socialStore.refreshRelationships().catch(() => {})
    lastRefreshAttemptAt.value = Date.now()
  }

  const runNeighborAction = async (action: () => Promise<unknown>, fallbackMessage: string) => {
    try {
      await action()
      lastRefreshAttemptAt.value = Date.now()
    } catch (error: any) {
      showFloat(error?.message || fallbackMessage, 'danger')
    }
  }

  const refreshNeighborSummary = async () => {
    await runNeighborAction(() => socialStore.refreshNeighborOverview(), '刷新邻里失败')
  }

  const createNeighbor = async () => {
    await runNeighborAction(() => socialStore.submitNeighborGroup(), '创建邻里失败')
  }

  const applyNeighbor = async (groupId: string) => {
    await runNeighborAction(() => socialStore.applyNeighbor(groupId), '申请加入邻里失败')
  }

  const inviteNeighbor = async () => {
    await runNeighborAction(() => socialStore.inviteNeighbor(), '发送邻里邀请失败')
  }

  const acceptNeighbor = async (requestId: string) => {
    await runNeighborAction(() => socialStore.acceptNeighbor(requestId), '接受邻里请求失败')
  }

  const rejectNeighbor = async (requestId: string) => {
    await runNeighborAction(() => socialStore.rejectNeighbor(requestId), '拒绝邻里请求失败')
  }

  const saveNeighborNotice = async () => {
    await runNeighborAction(() => socialStore.saveNeighborNoticeDraft(), '保存邻里公告失败')
  }

  const setNeighborRole = async (targetUsername: string, role: 'manager' | 'member') => {
    await runNeighborAction(() => socialStore.changeNeighborRole(targetUsername, role), '调整邻里身份失败')
  }

  const neighborRoleLabel = (role?: 'leader' | 'manager' | 'member') => {
    if (role === 'leader') return '邻里社长'
    if (role === 'manager') return '邻里管事'
    return '邻里成员'
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
