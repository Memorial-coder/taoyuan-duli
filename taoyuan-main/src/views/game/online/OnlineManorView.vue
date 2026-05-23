<template>
  <div class="space-y-3" data-testid="online-manor-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Home :size="16" />
            <h2 class="game-section-title">在线庄园</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ identityLabel }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ routeTargetHelperText }} · {{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="manorStore.loading"
            @click="refreshSnapshot"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': manorStore.loading }" />
            {{ manorStore.loading ? '刷新中' : '刷新庄园' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="manorStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
        {{ manorStore.errorMessage }}
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
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="legacyManorTarget">
          <ExternalLink :size="12" />
          完整庄园页
        </RouterLink>
      </div>

      <div v-if="activeTab === 'overview'" class="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div class="space-y-3">
          <ManorPreviewCard
            v-if="snapshot"
            :snapshot="snapshot"
            :favorite-overview="manorStore.favoriteOverview"
          />
          <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
            先刷新庄园快照，概览页会把庄园预览卡、主题、来访和收藏关注摘要集中到第一屏。
          </div>
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div v-for="stat in overviewStats" :key="stat.label" class="border border-accent/10 bg-black/10 p-2">
              <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
              <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
            </div>
          </div>
          <p class="text-xs leading-5 text-muted">
            {{ overviewCopy }}
          </p>
        </div>
        <div class="grid gap-2">
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'theme'">查看主题</button>
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'guestbook'">去留言</button>
          <button class="online-action-btn online-action-btn--compact w-full" type="button" @click="activeTab = 'visits'">看访客</button>
        </div>
      </div>

      <div v-else-if="activeTab === 'theme'" class="space-y-3">
        <div v-if="snapshot" class="game-panel-muted space-y-3 p-3">
          <div v-if="isOwner" class="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
            <div class="border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs text-accent">庄园主图</p>
                  <p class="mt-1 text-[10px] leading-5 text-muted">上传后的主图会跟随主题周保存，并出现在公开展示里。</p>
                </div>
                <button
                  class="online-action-btn online-action-btn--compact shrink-0"
                  type="button"
                  :disabled="uploadingCover"
                  @click="triggerCoverUpload"
                >
                  <Upload :size="12" />
                  {{ uploadingCover ? '上传中' : '上传' }}
                </button>
              </div>
              <input ref="coverInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleCoverSelected" />
              <div class="mt-3 overflow-hidden border border-accent/10 bg-bg/30">
                <img
                  v-if="coverImageUrl"
                  :src="coverImageUrl"
                  :alt="coverImageAlt"
                  class="h-36 w-full object-cover"
                />
                <div v-else class="flex h-36 items-center justify-center gap-2 px-3 text-[10px] text-muted">
                  <ImageIcon :size="14" />
                  暂无庄园主图
                </div>
              </div>
              <input
                v-model="manorStore.coverImageAltDraft"
                maxlength="120"
                class="online-input mt-2 w-full"
                placeholder="主图说明"
              />
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">保存主题</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">主题名、模板和主图会作为同一次主题周快照保存。</p>
              <input
                v-model="manorStore.themeLabelDraft"
                maxlength="30"
                class="online-input mt-3 w-full"
                placeholder="保存当前主题名"
              />
              <button
                class="online-action-btn online-action-btn--compact online-action-btn--primary mt-2 w-full justify-center"
                type="button"
                :disabled="manorStore.themeActionRunning"
                @click="saveThemeWeek"
              >
                <Save :size="12" />
                {{ manorStore.themeActionRunning ? '保存中' : '保存主题' }}
              </button>
            </div>
          </div>

          <div v-else class="border border-accent/10 bg-black/10 p-3">
            <p class="text-xs text-accent">主题展示</p>
            <p class="mt-1 text-[10px] leading-5 text-muted">访客模式只展示庄园主人公开的主题、主图、模板与推荐信息，不提供编辑控件。</p>
          </div>

          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-[10px] text-muted">当前主题</p>
              <p class="mt-1 text-sm text-accent">{{ currentTheme }}</p>
              <div class="mt-2 grid gap-1 text-[10px] leading-5 text-muted">
                <p>来源：{{ activeThemeSource }}</p>
                <p>主题分：{{ themeScoreLabel }}</p>
                <p>展示模板：{{ selectedTemplateOption?.label || '暂无模板' }}</p>
              </div>
              <div v-if="coverImageUrl" class="mt-3 overflow-hidden border border-accent/10 bg-bg/30">
                <img :src="coverImageUrl" :alt="coverImageAlt" class="h-40 w-full object-cover" />
              </div>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center gap-2 text-accent">
                <Sparkles :size="13" />
                <p class="text-xs">模板预览</p>
              </div>
              <p class="mt-2 text-sm text-accent">{{ selectedTemplateOption?.label || '默认展示' }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">{{ selectedTemplateOption?.summary || '当前主题暂无模板说明。' }}</p>
              <div class="mt-3 border border-accent/10 bg-bg/30 p-2">
                <p class="text-[10px] text-muted">预览摘要</p>
                <p class="mt-1 text-xs text-accent">{{ currentTheme }}</p>
                <p class="mt-1 text-[10px] leading-5 text-muted">{{ coverImageAlt || '庄园公开展示会按所选模板整理主图、主题和互动摘要。' }}</p>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 bg-black/10 p-3">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="text-xs text-accent">展示模板</p>
                <p class="mt-1 text-[10px] leading-5 text-muted">
                  {{ isOwner ? '选择公开庄园的展示方式，保存主题后会同步到庄园快照。' : '这是庄园主人当前公开使用的模板。' }}
                </p>
              </div>
              <select
                v-if="isOwner && templateOptions.length > 0"
                v-model="manorStore.templateIdDraft"
                class="online-input shrink-0 md:w-48"
              >
                <option v-for="option in templateOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="mt-3 grid gap-2 md:grid-cols-2">
              <template v-if="isOwner">
                <button
                  v-for="option in templateOptions"
                  :key="option.id"
                  type="button"
                  class="border px-3 py-2 text-left text-[10px] transition-colors"
                  :class="manorStore.templateIdDraft === option.id ? 'border-accent/40 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
                  @click="manorStore.templateIdDraft = option.id"
                >
                  <span class="block text-xs">{{ option.label }}</span>
                  <span class="mt-1 block leading-5">{{ option.summary }}</span>
                </button>
              </template>
              <template v-else>
                <div
                  v-for="option in templateOptions"
                  :key="option.id"
                  class="border px-3 py-2 text-[10px]"
                  :class="selectedTemplateOption?.id === option.id ? 'border-accent/40 bg-accent/10 text-accent' : 'border-accent/10 text-muted'"
                >
                  <span class="block text-xs">{{ option.label }}</span>
                  <span class="mt-1 block leading-5">{{ option.summary }}</span>
                </div>
              </template>
              <div v-if="templateOptions.length === 0" class="border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
                当前快照还没有模板选项。
              </div>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">主题推荐</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="item in themeRecommendations" :key="item" class="border border-accent/15 px-2 py-1 text-[10px] text-muted">
                  {{ item }}
                </span>
                <span v-if="themeRecommendations.length === 0" class="text-[10px] text-muted">当前没有额外推荐。</span>
              </div>
            </div>
            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">官方精选</p>
              <p class="mt-2 text-xs text-accent">{{ officialPickLabel }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">{{ officialPickReason }}</p>
            </div>
          </div>
        </div>

        <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
          先刷新庄园快照，主题页会显示公开主题、模板预览、主图、推荐和官方精选。
        </div>
      </div>

      <div v-else-if="activeTab === 'guestbook'" class="space-y-3">
        <div v-if="snapshot" class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div class="space-y-3">
            <div class="border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center gap-2 text-accent">
                <MessageSquare :size="13" />
                <p class="text-xs">留言类型</p>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5 lg:grid-cols-2">
                <button
                  v-for="option in guestbookKindOptions"
                  :key="option.id"
                  type="button"
                  class="border px-3 py-2 text-left text-[10px] transition-colors"
                  :class="manorStore.guestbookKindDraft === option.id ? 'border-accent/40 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
                  @click="manorStore.setGuestbookKind(option.id)"
                >
                  <span class="block text-xs">{{ option.label }}</span>
                </button>
              </div>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-[10px] text-muted">当前留言模式</p>
                <span class="text-[10px] text-accent">{{ currentGuestbookKind.label }}</span>
              </div>
              <p class="mt-1 text-[10px] leading-5 text-muted">{{ currentGuestbookKind.helper }}</p>
              <div class="mt-3 flex flex-wrap gap-1">
                <button
                  v-for="pick in manorStore.guestbookQuickPicks"
                  :key="pick"
                  type="button"
                  class="border border-accent/15 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/30 hover:text-accent"
                  @click="manorStore.applyGuestbookQuickPick(pick)"
                >
                  {{ pick }}
                </button>
              </div>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <textarea
                v-model="manorStore.guestbookDraft"
                rows="4"
                maxlength="160"
                class="online-textarea w-full"
                :placeholder="manorStore.guestbookPlaceholder"
              />
              <div class="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p class="text-[10px] leading-5 text-muted">
                  将以“{{ currentGuestbookKind.label }}”写入这座庄园的互动痕迹。{{ guestbookDraftLength }}/160
                </p>
                <button
                  class="online-action-btn online-action-btn--compact online-action-btn--primary shrink-0"
                  type="button"
                  :disabled="!canSubmitGuestbook"
                  @click="submitGuestbook"
                >
                  <Send :size="12" />
                  {{ manorStore.guestbookActionRunning ? '提交中' : manorStore.guestbookSubmitLabel }}
                </button>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 bg-black/10 p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">留言列表</p>
                <p class="mt-1 text-[10px] leading-5 text-muted">留言在独立滚动区域内展示，回复和置顶只对庄园主人开放。</p>
              </div>
              <span class="shrink-0 text-[10px] text-accent">{{ guestbookEntries.length }} 条</span>
            </div>

            <div v-if="manorStore.loading && guestbookEntries.length === 0" class="mt-3 border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
              正在加载留言墙。
            </div>
            <div v-else-if="manorStore.errorMessage && guestbookEntries.length === 0" class="mt-3 border border-red-300/20 bg-red-500/10 p-3 text-xs text-red-100">
              {{ manorStore.errorMessage }}
            </div>
            <div v-else-if="guestbookEntries.length === 0" class="mt-3 border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
              当前还没有访客留言。
            </div>

            <div v-else class="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in guestbookEntries" :key="entry.id" class="border border-accent/10 bg-bg/30 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-xs text-accent">{{ entry.author_display_name }}</p>
                      <span class="border px-2 py-0.5 text-[10px]" :class="guestbookKindBadgeClass(entry.kind)">
                        {{ guestbookKindLabel(entry.kind) }}
                      </span>
                      <span v-if="entry.pinned" class="border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                        置顶
                      </span>
                      <span class="text-[10px] text-muted">{{ formatGuestbookTime(entry.created_at) }}</span>
                    </div>
                    <div class="mt-2">
                      <div
                        v-if="entry.kind === 'stamp'"
                        class="inline-flex border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-amber-100"
                      >
                        {{ entry.content }}
                      </div>
                      <p v-else-if="entry.kind === 'signature'" class="text-right text-xs italic text-fuchsia-100">
                        —— {{ entry.content }}
                      </p>
                      <p v-else class="text-[10px] leading-5 text-muted">
                        {{ entry.content }}
                      </p>
                    </div>
                  </div>
                  <button
                    v-if="isOwner"
                    class="online-action-btn online-action-btn--compact shrink-0"
                    type="button"
                    :disabled="manorStore.guestbookActionRunning"
                    @click="togglePinned(entry.id, !entry.pinned)"
                  >
                    <Pin :size="12" />
                    {{ entry.pinned ? '取消' : '置顶' }}
                  </button>
                </div>

                <div v-if="entry.reply_text" class="mt-3 border border-accent/10 bg-black/10 px-3 py-2">
                  <p class="text-[10px] text-muted">{{ entry.reply_author_display_name || '庄园主人' }} 回复：</p>
                  <p class="mt-1 text-[10px] leading-5">{{ entry.reply_text }}</p>
                </div>
                <div v-else-if="isOwner" class="online-action-row mt-3">
                  <input
                    v-model="manorStore.guestbookReplyDraft[entry.id]"
                    maxlength="160"
                    class="online-input"
                    placeholder="回复这条留言"
                  />
                  <button
                    class="online-action-btn online-action-btn--compact"
                    type="button"
                    :disabled="manorStore.guestbookActionRunning || !manorStore.guestbookReplyDraft[entry.id]?.trim()"
                    @click="replyGuestbook(entry.id)"
                  >
                    <Reply :size="12" />
                    回复
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
          先刷新庄园快照，留言页会显示留言输入、快捷留言和独立留言列表。
        </div>
      </div>

      <div v-else-if="activeTab === 'visits'" class="space-y-3">
        <div v-if="snapshot" class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div class="border border-accent/10 bg-black/10 p-3">
            <div class="flex items-center gap-2 text-accent">
              <MapPin :size="13" />
              <p class="text-xs">记录这次来访</p>
            </div>
            <div class="mt-3 grid gap-2">
              <select v-model="manorStore.visitPurposeDraft" class="online-select w-full">
                <option v-for="option in visitPurposeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <input
                v-model="manorStore.visitSummaryDraft"
                maxlength="160"
                class="online-input w-full"
                placeholder="这次来访做了什么"
              />
              <input
                v-model="manorStore.visitFeedbackDraft"
                maxlength="160"
                class="online-input w-full"
                placeholder="给庄园主的反馈"
              />
            </div>
            <div class="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p class="text-[10px] leading-5 text-muted">
                行为 {{ visitSummaryLength }}/160 · 反馈 {{ visitFeedbackLength }}/160
              </p>
              <button
                class="online-action-btn online-action-btn--compact online-action-btn--primary shrink-0"
                type="button"
                :disabled="!canRecordVisit"
                @click="recordVisit"
              >
                <Send :size="12" />
                {{ manorStore.visitActionRunning ? '记录中' : '记录来访' }}
              </button>
            </div>
          </div>

          <div class="border border-accent/10 bg-black/10 p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">来访记录</p>
                <p class="mt-1 text-[10px] leading-5 text-muted">{{ snapshot.today_visit_summary || '今日暂无来访摘要' }}</p>
              </div>
              <span class="shrink-0 text-[10px] text-accent">{{ visitEntries.length }} 次</span>
            </div>

            <div v-if="manorStore.loading && visitEntries.length === 0" class="mt-3 border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
              正在加载来访记录。
            </div>
            <div v-else-if="manorStore.errorMessage && visitEntries.length === 0" class="mt-3 border border-red-300/20 bg-red-500/10 p-3 text-xs text-red-100">
              {{ manorStore.errorMessage }}
            </div>
            <div v-else-if="visitEntries.length === 0" class="mt-3 border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
              当前还没有来访记录。
            </div>

            <div v-else class="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in visitEntries" :key="entry.id" class="border border-accent/10 bg-bg/30 p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs text-accent">{{ entry.visitor_display_name }} · {{ visitPurposeLabel(entry.purpose) }}</p>
                  <span class="text-[10px] text-muted">{{ formatVisitTime(entry.created_at) }}</span>
                </div>
                <p class="mt-2 text-[10px] leading-5 text-muted">来访行为：{{ entry.summary || '前来参观庄园' }}</p>
                <p v-if="entry.feedback" class="mt-1 text-[10px] leading-5 text-muted">来访反馈：{{ entry.feedback }}</p>
                <p v-if="entry.carried_items.length > 0" class="mt-1 text-[10px] leading-5 text-muted">
                  带走委托：{{ entry.carried_items.map(item => `${item.itemId} x${item.quantity}`).join('、') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
          先刷新庄园快照，来访页会显示来访目的、记录输入和历史列表。
        </div>
      </div>

      <div v-else-if="activeTab === 'guide'" class="space-y-3">
        <div v-if="snapshot" class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div class="space-y-3">
            <div v-if="isOwner" class="border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center gap-2 text-accent">
                <Plus :size="13" />
                <p class="text-xs">新增导览点</p>
              </div>
              <div class="mt-3 grid gap-2">
                <input
                  v-model="manorStore.guidePointTitleDraft"
                  maxlength="30"
                  class="online-input w-full"
                  placeholder="参观点标题"
                />
                <input
                  v-model="manorStore.guidePointSummaryDraft"
                  maxlength="120"
                  class="online-input w-full"
                  placeholder="告诉访客为什么值得看"
                />
              </div>
              <div class="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p class="text-[10px] leading-5 text-muted">
                  标题 {{ guideTitleLength }}/30 · 说明 {{ guideSummaryLength }}/120
                </p>
                <button
                  class="online-action-btn online-action-btn--compact online-action-btn--primary shrink-0"
                  type="button"
                  :disabled="!canSaveGuide"
                  @click="saveGuide"
                >
                  <Plus :size="12" />
                  {{ manorStore.guideActionRunning ? '保存中' : '加入导览点' }}
                </button>
              </div>
            </div>

            <div v-else class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">访客导览</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">访客可以查看庄园主人公开的路线和参观点，不显示导览维护表单。</p>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <div class="flex items-center gap-2 text-accent">
                <Route :size="13" />
                <p class="text-xs">路线摘要</p>
              </div>
              <p class="mt-2 text-xs text-accent">{{ currentGuideRoute?.title || '还没设置主题路线' }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">
                {{ currentGuideRoute?.summary || '保存第一个参观点后，会自动整理出一条基础参观路线。' }}
              </p>
              <p class="mt-2 text-[10px] leading-5 text-muted">今日来访：{{ snapshot.today_visit_summary || '暂无来访' }}</p>
            </div>
          </div>

          <div class="border border-accent/10 bg-black/10 p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs text-accent">已设参观点</p>
                <p class="mt-1 text-[10px] leading-5 text-muted">导览点在独立列表里维护，不再夹在庄园长页中间。</p>
              </div>
              <span class="shrink-0 text-[10px] text-accent">{{ guidePoints.length }} 个</span>
            </div>

            <div v-if="manorStore.loading && guidePoints.length === 0" class="mt-3 border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
              正在加载导览点。
            </div>
            <div v-else-if="manorStore.errorMessage && guidePoints.length === 0" class="mt-3 border border-red-300/20 bg-red-500/10 p-3 text-xs text-red-100">
              {{ manorStore.errorMessage }}
            </div>
            <div v-else-if="guidePoints.length === 0" class="mt-3 border border-accent/10 bg-bg/30 p-3 text-xs text-muted">
              当前还没有导览点。
            </div>

            <div v-else class="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="point in guidePoints" :key="point.id" class="border border-accent/10 bg-bg/30 p-3">
                <p class="text-xs text-accent">{{ point.order }}. {{ point.title }}</p>
                <p class="mt-1 text-[10px] leading-5 text-muted">{{ point.summary }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
          先刷新庄园快照，导览页会显示路线摘要、导览点新增和已设参观点。
        </div>
      </div>

      <div v-else class="game-panel-muted grid gap-2 p-3 md:grid-cols-2">
        <div class="border border-accent/10 bg-black/10 p-3">
          <p class="text-[10px] text-muted">我的收藏</p>
          <p class="mt-1 text-sm text-accent">{{ manorStore.favoriteOverview?.favorites.length ?? 0 }} 项</p>
          <p class="mt-2 text-[10px] leading-5 text-muted">收藏列表会留在庄园模块内，不放回在线中心首页。</p>
        </div>
        <div class="border border-accent/10 bg-black/10 p-3">
          <p class="text-[10px] text-muted">热门庄园</p>
          <p class="mt-1 text-sm text-accent">{{ manorStore.favoriteOverview?.hot_manors.length ?? 0 }} 座</p>
          <p class="mt-2 text-[10px] leading-5 text-muted">后续收藏页会承接热门庄园和同主题收藏列表。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    ArrowLeft,
    ExternalLink,
    Home,
    Image as ImageIcon,
    MapPin,
    MessageSquare,
    Pin,
    Plus,
    RefreshCw,
    Reply,
    Route,
    Save,
    Send,
    Sparkles,
    Upload,
  } from 'lucide-vue-next'
  import ManorPreviewCard from '@/components/game/ManorPreviewCard.vue'
  import { showFloat } from '@/composables/useGameLog'
  import { useManorStore } from '@/stores/useManorStore'
  import { uploadHallImage } from '@/utils/taoyuanHallApi'

  type ManorTabKey = 'overview' | 'theme' | 'guestbook' | 'visits' | 'guide' | 'favorites'
  type ManorTabMeta = { key: ManorTabKey; label: string; summary: string }
  type GuestbookKind = 'text' | 'blessing' | 'advice' | 'stamp' | 'signature'
  type VisitPurpose = 'explore' | 'friend_visit' | 'gift' | 'quest' | 'other'

  const route = useRoute()
  const manorStore = useManorStore()
  const activeTab = ref<ManorTabKey>('overview')
  const lastRefreshAttemptAt = ref(0)
  const uploadingCover = ref(false)
  const coverInputRef = ref<HTMLInputElement | null>(null)
  const guestbookKindOptions: Array<{ id: GuestbookKind; label: string; helper: string }> = [
    { id: 'text', label: '留言', helper: '自由写参观感受，适合留下完整的一句话。' },
    { id: 'blessing', label: '祝福', helper: '更适合节气问候、丰收祝愿和暖一点的回声。' },
    { id: 'advice', label: '建议', helper: '给主人留一条经营建议，告诉他还能怎么继续打磨。' },
    { id: 'stamp', label: '图章', helper: '像盖章一样留下短印记，适合节气、主题和来访证明。' },
    { id: 'signature', label: '签名', helper: '用落款式写法留名，让来访痕迹更像一封短短的署名。' },
  ]
  const visitPurposeOptions: Array<{ value: VisitPurpose; label: string }> = [
    { value: 'explore', label: '参观取景' },
    { value: 'friend_visit', label: '好友回访' },
    { value: 'gift', label: '带礼探访' },
    { value: 'quest', label: '顺手带走需求' },
    { value: 'other', label: '其他来意' },
  ]
  const tabs: ManorTabMeta[] = [
    { key: 'overview', label: '概览', summary: '先看庄园快照、主题与互动数量，不展开长表单。' },
    { key: 'theme', label: '主题', summary: '集中承接主题、模板、主图与官方精选。' },
    { key: 'guestbook', label: '留言', summary: '留言输入、回复和置顶会在这里独立处理。' },
    { key: 'visits', label: '来访', summary: '访客记录、来访目的和反馈会从长页中拆出。' },
    { key: 'guide', label: '导览', summary: '维护参观点与路线摘要，避免夹在其它操作中间。' },
    { key: 'favorites', label: '收藏', summary: '收藏、关注、同主题和热门庄园集中在这里。' },
  ]
  const defaultTab = tabs[0]!

  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }

  const routeTargetUsername = computed(() => getRouteQueryText(route.query.target_username))
  const routeTargetSaveId = computed(() => getRouteQueryText(route.query.target_save_id))
  const routeTargetContextLabel = computed(() => routeTargetUsername.value || (routeTargetSaveId.value ? `ID ${routeTargetSaveId.value}` : ''))
  const snapshot = computed(() => manorStore.snapshot)
  const isOwner = computed(() => snapshot.value?.viewer_is_owner !== false)
  const themeWeek = computed(() => snapshot.value?.theme_week)
  const currentTheme = computed(() => snapshot.value?.theme_week?.active_theme || snapshot.value?.showcase_theme || '未设置主题')
  const activeThemeSource = computed(() => themeWeek.value?.active_theme_source || '暂无来源')
  const themeScoreLabel = computed(() => themeWeek.value ? String(themeWeek.value.score) : '暂无评分')
  const templateOptions = computed(() => themeWeek.value?.template_options ?? [])
  const selectedTemplateOption = computed(() => {
    const draftTemplate = templateOptions.value.find(option => option.id === manorStore.templateIdDraft)
    const activeTemplate = templateOptions.value.find(option => option.id === themeWeek.value?.template_id)
    return draftTemplate ?? activeTemplate ?? templateOptions.value[0] ?? null
  })
  const coverImageUrl = computed(() => manorStore.coverImageUrlDraft || themeWeek.value?.cover_image_url || '')
  const coverImageAlt = computed(() => manorStore.coverImageAltDraft || themeWeek.value?.cover_image_alt || '庄园主图')
  const themeRecommendations = computed(() => themeWeek.value?.recommendations ?? [])
  const officialPickLabel = computed(() => themeWeek.value?.official_pick?.label || '暂无官方精选')
  const officialPickReason = computed(() => themeWeek.value?.official_pick?.reason || '当前主题分尚未达到精选门槛。')
  const guestbookEntries = computed(() => snapshot.value?.guestbook_entries ?? [])
  const currentGuestbookKind = computed(() => guestbookKindOptions.find(option => option.id === manorStore.guestbookKindDraft) ?? guestbookKindOptions[0]!)
  const guestbookDraftLength = computed(() => manorStore.guestbookDraft.trim().length)
  const canSubmitGuestbook = computed(() => guestbookDraftLength.value > 0 && !manorStore.guestbookActionRunning)
  const visitEntries = computed(() => snapshot.value?.visit_entries ?? [])
  const visitSummaryLength = computed(() => manorStore.visitSummaryDraft.length)
  const visitFeedbackLength = computed(() => manorStore.visitFeedbackDraft.length)
  const canRecordVisit = computed(() => !manorStore.visitActionRunning)
  const guidePoints = computed(() => snapshot.value?.guide_points ?? [])
  const currentGuideRoute = computed(() => snapshot.value?.guide_routes?.[0] ?? null)
  const guideTitleLength = computed(() => manorStore.guidePointTitleDraft.length)
  const guideSummaryLength = computed(() => manorStore.guidePointSummaryDraft.length)
  const canSaveGuide = computed(() => manorStore.guidePointTitleDraft.trim().length > 0 && !manorStore.guideActionRunning)
  const activeTabMeta = computed<ManorTabMeta>(() => tabs.find(tab => tab.key === activeTab.value) ?? defaultTab)

  const identityLabel = computed(() => {
    if (!snapshot.value) return routeTargetContextLabel.value ? `正在访问 ${routeTargetContextLabel.value} 的庄园` : '我的在线庄园'
    if (snapshot.value.viewer_is_owner) return `${snapshot.value.manor_name || snapshot.value.display_name || '我的庄园'} · 自己的庄园`
    return `${snapshot.value.display_name || snapshot.value.username} 的公开庄园`
  })

  const routeTargetHelperText = computed(() => {
    if (!routeTargetContextLabel.value) return '默认进入自己的庄园概览。'
    return routeTargetSaveId.value
      ? `保留好友入口上下文，正在按存档 ID ${routeTargetSaveId.value} 查看目标庄园。`
      : '保留好友入口上下文，正在按玩家名查看目标庄园。'
  })

  const refreshStateLabel = computed(() => {
    if (manorStore.loading) return '正在同步快照'
    if (!lastRefreshAttemptAt.value) return '尚未刷新'
    const time = new Date(lastRefreshAttemptAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `上次刷新 ${time}`
  })

  const identityStats = computed(() => [
    { label: '访问模式', value: isOwner.value ? '自己管理' : '访客访问' },
    { label: '主题', value: currentTheme.value },
    { label: '留言', value: `${guestbookEntries.value.length} 条` },
    { label: '来访', value: `${visitEntries.value.length} 次` },
  ])

  const favoriteSummaryText = computed(() => {
    const favoriteCount = manorStore.favoriteOverview?.favorites.length ?? 0
    if (!snapshot.value) return `收藏 ${favoriteCount} 项`
    if (snapshot.value.viewer_is_owner) return `我的收藏 ${favoriteCount} 项`
    const favoriteLabel = snapshot.value.is_favorited_by_viewer ? '已收藏' : '未收藏'
    const followLabel = snapshot.value.is_followed_by_viewer ? '已关注' : '未关注'
    return `${favoriteLabel} · ${followLabel}`
  })

  const overviewStats = computed(() => [
    { label: '当前主题', value: currentTheme.value },
    { label: '来访摘要', value: snapshot.value?.today_visit_summary || '暂无来访' },
    { label: '收藏关注', value: favoriteSummaryText.value },
    { label: '导览点', value: `${guidePoints.value.length} 个` },
  ])

  const overviewCopy = computed(() => {
    if (!snapshot.value) return '先刷新庄园快照，概览页只承接摘要，完整表单会按主题、留言、来访、导览分拆。'
    if (snapshot.value.viewer_is_owner) return '这是自己的庄园概览；管理操作会逐步拆到各标签页，当前仍可从完整庄园页过渡处理。'
    return '这是访客视角的庄园概览；页面只展示可访问内容，不暴露庄园主编辑控件。'
  })

  const legacyManorTarget = computed(() => {
    const query: Record<string, string> = {}
    if (routeTargetUsername.value) query.target_username = routeTargetUsername.value
    if (routeTargetSaveId.value) query.target_save_id = routeTargetSaveId.value
    return Object.keys(query).length > 0
      ? { name: 'manor', query }
      : { name: 'manor' }
  })

  const refreshSnapshot = async () => {
    await manorStore.refreshSnapshot({
      target_username: routeTargetUsername.value,
      target_save_id: routeTargetSaveId.value || undefined,
    }).catch(() => {})
    await manorStore.refreshFavoriteOverview().catch(() => {})
    lastRefreshAttemptAt.value = Date.now()
  }

  const saveThemeWeek = async () => {
    await manorStore.saveThemeWeekSnapshot().catch(() => {})
  }

  const triggerCoverUpload = () => {
    coverInputRef.value?.click()
  }

  const handleCoverSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return
    uploadingCover.value = true
    try {
      const uploaded = await uploadHallImage(file, 'manor_cover')
      manorStore.coverImageUrlDraft = uploaded.url
      manorStore.coverImageAltDraft = uploaded.alt || file.name.replace(/\.[^.]+$/, '')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '上传庄园主图失败', 'danger')
    } finally {
      uploadingCover.value = false
      if (input) input.value = ''
    }
  }

  const submitGuestbook = async () => {
    await manorStore.createGuestbookEntry().catch(() => {})
  }

  const replyGuestbook = async (entryId: string) => {
    await manorStore.replyGuestbookEntry(entryId).catch(() => {})
  }

  const togglePinned = async (entryId: string, pinned: boolean) => {
    await manorStore.togglePinnedGuestbookEntry(entryId, pinned).catch(() => {})
  }

  const guestbookKindLabel = (kind: string) => {
    if (kind === 'blessing') return '祝福'
    if (kind === 'advice') return '建议'
    if (kind === 'stamp') return '图章'
    if (kind === 'signature') return '签名'
    return '留言'
  }

  const guestbookKindBadgeClass = (kind: string) => {
    if (kind === 'blessing') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    if (kind === 'advice') return 'border-sky-400/30 bg-sky-500/10 text-sky-200'
    if (kind === 'stamp') return 'border-amber-400/40 bg-amber-500/10 text-amber-200'
    if (kind === 'signature') return 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200'
    return 'border-accent/20 bg-accent/10 text-accent'
  }

  const formatGuestbookTime = (createdAt: number) => {
    if (!createdAt) return ''
    return new Date(createdAt * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const recordVisit = async () => {
    await manorStore.createVisitRecord().catch(() => {})
  }

  const visitPurposeLabel = (purpose: string) => {
    return visitPurposeOptions.find(option => option.value === purpose)?.label || '其他来意'
  }

  const formatVisitTime = (createdAt: number) => {
    if (!createdAt) return ''
    return new Date(createdAt * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const saveGuide = async () => {
    await manorStore.saveGuideSnapshot().catch(() => {})
  }

  onMounted(() => {
    void refreshSnapshot()
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      activeTab.value = 'overview'
      void refreshSnapshot()
    }
  )
</script>
