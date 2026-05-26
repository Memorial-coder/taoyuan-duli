<template>
  <div class="space-y-3" data-testid="online-manor-page">
    <OnlineModuleShell
      title="在线庄园"
      :summary="identityLabel"
      :meta="`${routeTargetHelperText} · ${refreshStateLabel}`"
      refresh-label="刷新庄园"
      :refresh-running="manorStore.loading"
      :refresh-disabled="manorStore.loading"
      :stats="identityStats"
      :tabs="tabs"
      :active-tab="activeTab"
      @refresh="refreshSnapshot"
      @update:active-tab="setActiveTab"
    >
      <template #icon>
        <Home :size="16" />
      </template>
      <template #errors>
        <div v-if="manorStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {{ manorStore.errorMessage }}
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
                data-testid="online-manor-cover-alt-input"
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
                data-testid="online-manor-theme-label-input"
                maxlength="30"
                class="online-input mt-3 w-full"
                placeholder="保存当前主题名"
              />
              <button
                data-testid="online-manor-theme-save-button"
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
                data-testid="online-manor-template-select"
                class="online-select shrink-0 md:w-48"
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
                data-testid="online-manor-guestbook-input"
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
                  data-testid="online-manor-guestbook-submit"
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

            <div v-else data-testid="online-manor-guestbook-list" class="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in guestbookEntries" :key="entry.id" data-testid="online-manor-guestbook-entry" class="border border-accent/10 bg-bg/30 p-3">
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
                    data-testid="online-manor-guestbook-pin"
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
                    data-testid="online-manor-guestbook-reply-input"
                    maxlength="160"
                    class="online-input"
                    placeholder="回复这条留言"
                  />
                  <button
                    data-testid="online-manor-guestbook-reply-submit"
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
              <select v-model="manorStore.visitPurposeDraft" data-testid="online-manor-visit-purpose-select" class="online-select w-full">
                <option v-for="option in visitPurposeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <input
                v-model="manorStore.visitSummaryDraft"
                data-testid="online-manor-visit-summary-input"
                maxlength="160"
                class="online-input w-full"
                placeholder="这次来访做了什么"
              />
              <input
                v-model="manorStore.visitFeedbackDraft"
                data-testid="online-manor-visit-feedback-input"
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
                data-testid="online-manor-visit-submit"
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

            <div v-else data-testid="online-manor-visit-list" class="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in visitEntries" :key="entry.id" data-testid="online-manor-visit-entry" class="border border-accent/10 bg-bg/30 p-3">
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

            <div class="mt-3 border-t border-accent/10 pt-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-accent">访客行为审计</p>
                <span class="text-[10px] text-muted">{{ visitorActivityEntries.length }} 条</span>
              </div>
              <div data-testid="online-manor-visitor-activity-summary" class="mt-2 grid gap-2 md:grid-cols-4">
                <div v-for="row in visitorActivitySummaryRows" :key="row.id" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-accent">{{ row.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ row.value }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ row.detail }}</p>
                </div>
              </div>
              <p data-testid="online-manor-visitor-dispute-summary" class="mt-2 text-[10px] leading-5 text-muted">
                争议回看：{{ visitorActivityDisputeSummary }}
              </p>
              <div v-if="visitorActivityEntries.length > 0" data-testid="online-manor-visitor-activity-log" class="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                <div v-for="entry in visitorActivityEntries" :key="entry.id" data-testid="online-manor-visitor-activity-entry" class="border border-accent/10 bg-bg/30 p-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex min-w-0 flex-wrap items-center gap-2">
                      <p class="text-[10px] text-accent">{{ entry.visitor_display_name }}</p>
                      <span class="border px-2 py-0.5 text-[10px]" :class="visitorActivityKindBadgeClass(entry.kind)">
                        {{ entry.kind_label }}
                      </span>
                    </div>
                    <span class="text-[10px] text-muted">{{ formatVisitTime(entry.created_at) }}</span>
                  </div>
                  <p class="mt-1 text-[10px] leading-4 text-accent">{{ entry.title || visitorActivityFallbackTitle(entry.kind) }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
                  <p v-if="entry.object_label || entry.action_label" class="mt-1 text-[10px] leading-4 text-muted">
                    对象：{{ entry.object_label || '未记录对象' }} · 动作：{{ entry.action_label || '未记录动作' }}
                  </p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.audit_note }}</p>
                </div>
              </div>
              <p v-else class="mt-2 text-[10px] leading-5 text-muted">暂无可回看的访客照料或轻采行为。</p>
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
                  data-testid="online-manor-guide-title-input"
                  maxlength="30"
                  class="online-input w-full"
                  placeholder="参观点标题"
                />
                <input
                  v-model="manorStore.guidePointSummaryDraft"
                  data-testid="online-manor-guide-summary-input"
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
                  data-testid="online-manor-guide-submit"
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

            <div v-else data-testid="online-manor-guide-list" class="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
              <div v-for="point in guidePoints" :key="point.id" data-testid="online-manor-guide-point" class="border border-accent/10 bg-bg/30 p-3">
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

      <div v-else-if="activeTab === 'care'" class="space-y-3">
        <div v-if="snapshot" class="game-panel-muted grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div class="space-y-3">
            <div class="flex flex-col gap-2 border border-accent/10 bg-black/10 p-3 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-accent">
                  <Sprout :size="13" />
                  <p class="text-xs">好友庄园照料</p>
                </div>
                <p class="mt-2 text-[10px] leading-5 text-muted">
                  今日访客剩余 {{ careRemainingLabel }} · 庄园剩余 {{ manorCareRemainingLabel }} · 权限 {{ carePermissionLabel }}
                </p>
                <p class="mt-1 text-[10px] leading-5 text-muted">
                  轻采剩余 {{ stealRemainingLabel }} · 庄园轻采 {{ manorStealRemainingLabel }} · 权限 {{ stealPermissionLabel }}
                </p>
                <p v-if="!snapshot.care_state.can_care" class="mt-1 text-[10px] leading-5 text-amber-200">
                  {{ snapshot.care_state.care_denied_reason || '当前庄园暂未开放照料。' }}
                </p>
                <p v-if="!snapshot.steal_state.can_steal" class="mt-1 text-[10px] leading-5 text-amber-200">
                  {{ snapshot.steal_state.steal_denied_reason || '当前庄园暂未开放轻采。' }}
                </p>
                <div class="mt-2 grid gap-2 md:grid-cols-2" data-testid="online-manor-care-readable-limits">
                  <div v-for="row in careReadableLimitRows" :key="row.id" class="border border-accent/10 bg-bg/30 p-2">
                    <p class="text-[10px] text-accent">{{ row.label }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ row.value }}</p>
                    <p v-if="row.detail" class="mt-1 text-[10px] leading-4 text-muted">{{ row.detail }}</p>
                  </div>
                </div>
                <p v-if="careFailureReason" data-testid="online-manor-care-failure-reason" class="mt-2 text-[10px] leading-5 text-amber-200">
                  照料失败原因：{{ careFailureReason }}
                </p>
                <p data-testid="online-manor-care-anti-abuse-summary" class="mt-1 text-[10px] leading-5 text-muted">
                  照料审计：{{ careAntiAbuseSummary }}
                </p>
                <div class="mt-2 grid gap-2 md:grid-cols-2" data-testid="online-manor-steal-readable-limits">
                  <div v-for="row in stealReadableLimitRows" :key="row.id" class="border border-accent/10 bg-bg/30 p-2">
                    <p class="text-[10px] text-accent">{{ row.label }}</p>
                    <p class="mt-1 text-[10px] leading-4 text-muted">{{ row.value }}</p>
                    <p v-if="row.detail" class="mt-1 text-[10px] leading-4 text-muted">{{ row.detail }}</p>
                  </div>
                </div>
                <p v-if="stealFailureReason" data-testid="online-manor-steal-failure-reason" class="mt-2 text-[10px] leading-5 text-amber-200">
                  轻采失败原因：{{ stealFailureReason }}
                </p>
                <p data-testid="online-manor-steal-anti-abuse-summary" class="mt-1 text-[10px] leading-5 text-muted">
                  反刷审计：{{ stealAntiAbuseSummary }}
                </p>
              </div>
            </div>

            <VisualSceneBoard
              v-if="showCareSceneBoard"
              :objects="careVisualObjects"
              :selected-object-id="selectedCareObjectId"
              :recent-feedback="careSceneFeedback"
              :action-running="manorStore.careActionRunning || manorStore.stealActionRunning"
              :action-labels="careSceneActionLabels"
              @select-object="manorStore.selectCareObject"
              @trigger-action="submitCareVisualAction"
            />

            <div v-else class="border border-accent/10 bg-black/10 p-3 text-xs leading-5 text-muted">
              这座庄园当前没有可视化照料对象；田地、果树、畜棚、鱼塘等对象会在庄园公开快照允许时显示。
            </div>

            <div class="border border-accent/10 bg-black/10 p-3" data-testid="online-manor-care-room-panel">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="text-xs text-accent">协作护理房间</p>
                  <p class="mt-1 text-[10px] leading-5 text-muted">
                    {{ careRoomSummary }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                  <button
                    v-for="memberLimit in careRoomMemberLimitOptions"
                    :key="memberLimit"
                    data-testid="online-manor-care-room-create"
                    class="online-action-btn online-action-btn--compact"
                    type="button"
                    :disabled="!careRoomState?.can_create_room || manorStore.careRoomActionRunning"
                    @click="createCareRoom(memberLimit)"
                  >
                    <Plus :size="12" />
                    {{ memberLimit }} 人房
                  </button>
                </div>
              </div>
              <p v-if="careRoomState && !careRoomState.can_create_room" class="mt-2 text-[10px] leading-5 text-amber-200">
                {{ careRoomState.create_denied_reason || '当前庄园暂未开放协作护理房间。' }}
              </p>

              <div v-if="activeCareRooms.length > 0" data-testid="online-manor-care-room-list" class="mt-3 space-y-2">
                <div
                  v-for="room in activeCareRooms"
                  :key="room.id"
                  data-testid="online-manor-care-room-entry"
                  class="border border-accent/10 bg-bg/30 p-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-xs text-accent">{{ careRoomStatusLabel(room.status) }} · {{ room.participants.length }}/{{ room.member_limit }}</p>
                    <span class="text-[10px] text-muted">{{ careRoomWindowLabel(room) }}</span>
                  </div>
                  <p class="mt-2 text-[10px] leading-5 text-muted">{{ room.summary || '等待护理分工推进。' }}</p>
                  <div data-testid="online-manor-care-room-progress-summary" class="mt-2 grid gap-2 text-[10px] leading-4 text-muted md:grid-cols-3">
                    <p><span class="text-accent">分工进度</span><br>{{ careRoomProgressSummary(room) }}</p>
                    <p><span class="text-accent">结算条件</span><br>{{ careRoomSettlementHint(room) }}</p>
                    <p data-testid="online-manor-care-room-risk-summary"><span class="text-accent">风险回看</span><br>{{ careRoomRiskSummary(room) }}</p>
                  </div>
                  <p class="mt-2 text-[10px] leading-5 text-muted">
                    待完成：{{ careRoomPendingActionLabels(room) }}
                  </p>
                  <div class="mt-2 flex flex-wrap gap-1">
                    <span
                      v-for="participant in room.participants"
                      :key="`${room.id}-${participant.username}`"
                      class="border border-accent/10 bg-black/10 px-2 py-1 text-[10px] text-muted"
                    >
                      {{ participant.display_name }} · {{ participant.role_label }}
                    </span>
                  </div>
                  <div v-if="room.actions.length > 0" data-testid="online-manor-care-room-action-ledger" class="mt-2 space-y-2 border-l border-accent/20 pl-2">
                    <div v-for="action in room.actions" :key="action.id">
                      <p class="text-[10px] text-accent">
                        {{ action.actual_order }}. {{ action.actor_display_name }} · {{ action.action_label }}
                      </p>
                      <p class="mt-1 text-[10px] leading-4 text-muted">
                        {{ action.object_label }} · 预期第 {{ action.expected_order }} 步 · {{ action.role_label }}{{ action.role_matched ? '匹配' : '未匹配' }}
                      </p>
                      <p class="text-[10px] leading-4 text-muted">
                        健康 +{{ action.health_delta }}{{ action.order_risk ? ` · 顺序风险 +${action.risk_delta}` : ' · 顺序正常' }}
                      </p>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      v-if="room.can_join"
                      data-testid="online-manor-care-room-join"
                      class="online-action-btn online-action-btn--compact"
                      type="button"
                      :disabled="manorStore.careRoomActionRunning"
                      @click="joinCareRoom(room.id)"
                    >
                      <Plus :size="12" />
                      加入
                    </button>
                    <button
                      v-for="actionId in room.available_action_ids"
                      :key="`${room.id}-${actionId}`"
                      data-testid="online-manor-care-room-action"
                      class="online-action-btn online-action-btn--compact"
                      type="button"
                      :disabled="manorStore.careRoomActionRunning"
                      @click="submitCareRoomAction(room.id, actionId)"
                    >
                      <Sprout :size="12" />
                      {{ careRoomActionLabel(actionId) }}
                    </button>
                    <button
                      v-if="room.can_settle"
                      data-testid="online-manor-care-room-settle"
                      class="online-action-btn online-action-btn--compact online-action-btn--primary"
                      type="button"
                      :disabled="manorStore.careRoomActionRunning"
                      @click="settleCareRoom(room.id)"
                    >
                      <Save :size="12" />
                      结算护理
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="mt-3 border border-accent/10 bg-bg/30 p-3 text-[10px] leading-5 text-muted">
                当前没有进行中的协作护理房间。
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">照料效果</p>
              <p class="mt-2 text-[10px] leading-5 text-muted">{{ careReadableImpactSummary }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">{{ snapshot.care_state.audit.reward_cap_summary }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">{{ snapshot.care_state.audit.settlement_summary }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">异常标记：{{ riskFlagLabel(snapshot.care_state.audit.risk_flags) }}</p>
              <div class="mt-2 space-y-2">
                <div v-for="effect in careEffectEntries" :key="effect.id" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-accent">{{ effect.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">给主人：{{ effect.ownerBenefit }}</p>
                  <p class="text-[10px] leading-4 text-muted">访客：{{ effect.visitorReward }}</p>
                </div>
              </div>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">轻采规则</p>
              <p class="mt-2 text-[10px] leading-5 text-muted">{{ stealReadableImpactSummary }}</p>
              <p class="mt-2 text-[10px] leading-5 text-muted">{{ snapshot.steal_state.audit.reward_cap_summary }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">{{ snapshot.steal_state.audit.settlement_summary }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">异常标记：{{ riskFlagLabel(snapshot.steal_state.audit.risk_flags) }}</p>
              <div class="mt-2 space-y-2">
                <div v-for="effect in stealEffectEntries" :key="effect.id" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-accent">{{ effect.label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">主人：{{ effect.ownerCompensation }}</p>
                  <p class="text-[10px] leading-4 text-muted">访客：{{ effect.visitorReward }}</p>
                </div>
              </div>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">最近照料记录</p>
              <div v-if="recentCareEntries.length > 0" data-testid="online-manor-care-log" class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                <div v-for="entry in recentCareEntries" :key="entry.id" data-testid="online-manor-care-entry" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-accent">{{ entry.visitor_display_name }} · {{ entry.action_label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary || `${entry.object_label} 已被照料` }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">给主人：{{ entry.owner_benefit }} · 访客：{{ entry.visitor_reward }}</p>
                </div>
              </div>
              <p v-else class="mt-2 text-[10px] leading-5 text-muted">今日还没有好友照料记录。</p>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">最近轻采记录</p>
              <div v-if="recentStealEntries.length > 0" data-testid="online-manor-steal-log" class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                <div v-for="entry in recentStealEntries" :key="entry.id" data-testid="online-manor-steal-entry" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-accent">{{ entry.visitor_display_name }} · {{ entry.action_label }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary || `${entry.object_label} 已有轻采记录` }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">
                    主人：{{ entry.owner_compensation }} · 访客：{{ entry.visitor_reward }} · 单次 {{ entry.visitor_reward_quantity || entry.quantity || 1 }}
                  </p>
                  <p v-if="entry.note" class="mt-1 text-[10px] leading-4 text-muted">留言：{{ entry.note }}</p>
                </div>
              </div>
              <p v-else class="mt-2 text-[10px] leading-5 text-muted">今日还没有轻采记录。</p>
            </div>

            <div class="border border-accent/10 bg-black/10 p-3">
              <p class="text-xs text-accent">协作护理记录</p>
              <div v-if="recentCareRoomRecords.length > 0" data-testid="online-manor-care-room-records" class="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                <div v-for="room in recentCareRoomRecords" :key="room.id" data-testid="online-manor-care-room-record" class="border border-accent/10 bg-bg/30 p-2">
                  <p class="text-[10px] text-accent">健康度 {{ room.health_score }} · 风险 {{ room.risk_score }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">{{ room.summary }}</p>
                  <p class="mt-1 text-[10px] leading-4 text-muted">参与：{{ room.participants.map(participant => participant.display_name).join('、') }}</p>
                  <p data-testid="online-manor-care-room-record-settlement" class="mt-1 text-[10px] leading-4 text-muted">
                    凭证：{{ room.settlement_receipt_id || '未记录' }} · 结算：{{ careRoomSettledByLabel(room) }}
                  </p>
                  <div v-if="room.actions.length > 0" data-testid="online-manor-care-room-record-actions" class="mt-2 space-y-1">
                    <p v-for="action in room.actions" :key="action.id" class="text-[10px] leading-4 text-muted">
                      {{ action.actual_order }}. {{ action.actor_display_name }} · {{ action.action_label }} · 健康 +{{ action.health_delta }}{{ action.order_risk ? ` · 顺序风险 +${action.risk_delta}` : '' }}
                    </p>
                  </div>
                </div>
              </div>
              <p v-else class="mt-2 text-[10px] leading-5 text-muted">暂无协作护理记录。</p>
            </div>
          </div>
        </div>

        <div v-else class="game-panel-muted p-3 text-xs leading-5 text-muted">
          先刷新庄园快照，照料页会显示好友庄园中的可互动对象、次数限制和最近照料记录。
        </div>
      </div>

      <div v-else class="game-panel-muted grid gap-2 p-3 md:grid-cols-2">
        <div class="border border-accent/10 bg-black/10 p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <p class="text-[10px] text-muted">{{ isOwner ? '我的收藏' : '收藏与关注' }}</p>
              <p class="mt-1 text-sm text-accent">{{ favoriteOverviewLabel }}</p>
              <p class="mt-2 text-[10px] leading-5 text-muted">
                {{ isOwner ? '这是你自己的庄园，收藏和关注列表会展示其他玩家与热门庄园。' : '访客模式可以把当前庄园加入收藏或关注更新，刷新后概览会同步状态。' }}
              </p>
            </div>
            <div v-if="!isOwner" class="flex shrink-0 flex-col gap-2">
              <button
                data-testid="online-manor-favorite-button"
                class="online-action-btn online-action-btn--compact justify-center"
                type="button"
                :disabled="manorStore.favoriteActionRunning || snapshot?.is_favorited_by_viewer"
                @click="favoriteManor"
              >
                <Sparkles :size="12" />
                {{ snapshot?.is_favorited_by_viewer ? '已收藏' : '收藏庄园' }}
              </button>
              <button
                data-testid="online-manor-follow-button"
                class="online-action-btn online-action-btn--compact justify-center"
                type="button"
                :disabled="manorStore.favoriteActionRunning || snapshot?.is_followed_by_viewer"
                @click="followManor"
              >
                <Pin :size="12" />
                {{ snapshot?.is_followed_by_viewer ? '已关注' : '关注庄园' }}
              </button>
            </div>
          </div>
          <div v-if="manorStore.favoriteOverview?.favorites.length" data-testid="online-manor-favorite-list" class="mt-3 space-y-2">
            <div
              v-for="entry in manorStore.favoriteOverview.favorites"
              :key="entry.id"
              data-testid="online-manor-favorite-entry"
              class="border border-accent/10 bg-bg/30 p-2"
            >
              <p class="text-xs text-accent">{{ entry.snapshot.display_name || entry.manor_username }}</p>
              <p class="mt-1 text-[10px] leading-5 text-muted">主题：{{ entry.theme || entry.snapshot.showcase_theme || '未设置主题' }}</p>
            </div>
          </div>
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
    Home,
    Image as ImageIcon,
    MapPin,
    MessageSquare,
    Pin,
    Plus,
    Reply,
    Route,
    Save,
    Send,
    Sprout,
    Sparkles,
    Upload,
  } from 'lucide-vue-next'
  import ManorPreviewCard from '@/components/game/ManorPreviewCard.vue'
  import OnlineModuleShell from '@/components/game/online/OnlineModuleShell.vue'
  import VisualSceneBoard from '@/components/game/online/VisualSceneBoard.vue'
  import { showFloat } from '@/composables/useGameLog'
  import { useManorStore } from '@/stores/useManorStore'
  import type { OnlineVisualObject } from '@/types/onlineVisual'
  import type { OnlineManorCareRoom } from '@/utils/onlineProfileApi'
  import { uploadHallImage } from '@/utils/taoyuanHallApi'

  type ManorTabKey = 'overview' | 'theme' | 'guestbook' | 'visits' | 'guide' | 'care' | 'favorites'
  type ManorTabMeta = { key: ManorTabKey; label: string; summary: string }
  type ManorCareActionPayload = { objectId: string; actionId: string }
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
  const careRoomMemberLimitOptions = [2, 3, 4]
  const tabs: ManorTabMeta[] = [
    { key: 'overview', label: '概览', summary: '先看庄园快照、主题与互动数量，不展开长表单。' },
    { key: 'theme', label: '主题', summary: '集中承接主题、模板、主图与官方精选。' },
    { key: 'guestbook', label: '留言', summary: '留言输入、回复和置顶会在这里独立处理。' },
    { key: 'visits', label: '来访', summary: '访客记录、来访目的和反馈会从长页中拆出。' },
    { key: 'guide', label: '导览', summary: '维护参观点与路线摘要，避免夹在其它操作中间。' },
    { key: 'care', label: '照料', summary: '用场景物件处理浇水、喂食、除虫等好友互助动作。' },
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
  const visitorActivityEntries = computed(() => snapshot.value?.visitor_activity_entries ?? [])
  const visitorActivityKindCounts = computed(() => {
    const counts = {
      visit: 0,
      care: 0,
      steal: 0,
      care_room: 0,
    }
    for (const entry of visitorActivityEntries.value) {
      counts[entry.kind] += 1
    }
    return counts
  })
  const visitorActivitySummaryRows = computed(() => {
    const counts = visitorActivityKindCounts.value
    return [
      { id: 'visit', label: '普通来访', value: `${counts.visit} 条`, detail: '由来访页手动记录目的、行为和反馈。' },
      { id: 'care', label: '好友照料', value: `${counts.care} 条`, detail: '可回看谁照料了哪个对象与服务端落账说明。' },
      { id: 'steal', label: '轻采记录', value: `${counts.steal} 条`, detail: '用于轻采收益、主人补偿和争议复核。' },
      { id: 'care_room', label: '护理房间', value: `${counts.care_room} 条`, detail: '记录多人护理结算与协作窗口结果。' },
    ]
  })
  const visitorActivityDisputeSummary = computed(() => {
    const counts = visitorActivityKindCounts.value
    const auditCount = counts.care + counts.steal + counts.care_room
    if (visitorActivityEntries.value.length === 0) return '暂无访客照料、轻采或护理房行为。'
    if (counts.steal > 0) return `${counts.steal} 条轻采记录可用于核对主人补偿、访客收益和反刷审计；另有 ${counts.care} 条照料、${counts.care_room} 条护理房记录。`
    if (auditCount > 0) return `${auditCount} 条照料 / 护理行为可回看操作者、对象、动作和审计说明。`
    return '当前只有普通来访记录，暂无需要争议复核的照料或轻采行为。'
  })
  const visitSummaryLength = computed(() => manorStore.visitSummaryDraft.length)
  const visitFeedbackLength = computed(() => manorStore.visitFeedbackDraft.length)
  const canRecordVisit = computed(() => !manorStore.visitActionRunning)
  const guidePoints = computed(() => snapshot.value?.guide_points ?? [])
  const currentGuideRoute = computed(() => snapshot.value?.guide_routes?.[0] ?? null)
  const guideTitleLength = computed(() => manorStore.guidePointTitleDraft.length)
  const guideSummaryLength = computed(() => manorStore.guidePointSummaryDraft.length)
  const canSaveGuide = computed(() => manorStore.guidePointTitleDraft.trim().length > 0 && !manorStore.guideActionRunning)
  const careSceneActionLabels = computed<Record<string, string>>(() => ({
    ...(snapshot.value?.care_state.action_labels ?? {}),
    ...(snapshot.value?.care_state.scene_action_labels ?? {}),
    ...(snapshot.value?.steal_state.action_labels ?? {}),
  }))
  const careActionIds = computed(() => new Set(Object.keys(snapshot.value?.care_state.action_labels ?? {})))
  const stealActionIds = computed(() => new Set(Object.keys(snapshot.value?.steal_state.action_labels ?? {})))
  const careVisualObjects = computed<OnlineVisualObject[]>(() => {
    const currentSnapshot = snapshot.value
    const visualState = currentSnapshot?.visual_state
    if (!currentSnapshot || visualState?.board_type !== 'scene') return []
    return (visualState.objects ?? []).map(object => ({
      ...object,
      available_action_ids: object.available_action_ids.filter(actionId =>
        (currentSnapshot.care_state.can_care && careActionIds.value.has(actionId))
        || (currentSnapshot.steal_state.can_steal && stealActionIds.value.has(actionId))
      ),
    }))
  })
  const showCareSceneBoard = computed(() => careVisualObjects.value.length > 0)
  const selectedCareObjectId = computed(() => manorStore.selectedCareObjectId || snapshot.value?.visual_state.selected_visual_id || '')
  const careSceneFeedback = computed(() => snapshot.value?.visual_state.recent_feedback || '')
  const recentCareEntries = computed(() => (snapshot.value?.care_entries ?? []).slice(0, 8))
  const recentStealEntries = computed(() => (snapshot.value?.steal_entries ?? []).slice(0, 8))
  const careRemainingLabel = computed(() => {
    const careState = snapshot.value?.care_state
    if (!careState) return '0/0'
    return `${careState.remaining_care_count}/${careState.limits.visitor_daily_limit}`
  })
  const manorCareRemainingLabel = computed(() => {
    const careState = snapshot.value?.care_state
    if (!careState) return '0/0'
    return `${careState.manor_remaining_care_count}/${careState.limits.manor_daily_limit}`
  })
  const stealRemainingLabel = computed(() => {
    const stealState = snapshot.value?.steal_state
    if (!stealState) return '0/0'
    return `${stealState.remaining_steal_count}/${stealState.limits.visitor_daily_limit}`
  })
  const manorStealRemainingLabel = computed(() => {
    const stealState = snapshot.value?.steal_state
    if (!stealState) return '0/0'
    return `${stealState.manor_remaining_steal_count}/${stealState.limits.manor_daily_limit}`
  })
  const careReadableLimitRows = computed(() => {
    const careState = snapshot.value?.care_state
    if (!careState) return []
    const audit = careState.audit
    return [
      {
        id: 'visitor',
        label: '访客今日照料',
        value: `${careState.visitor_daily_count}/${careState.limits.visitor_daily_limit}`,
        detail: `剩余 ${careState.remaining_care_count} 次，同一访客上限${audit.visitor_limit_enforced ? '已启用' : '未启用'}。`,
      },
      {
        id: 'manor',
        label: '庄园今日承载',
        value: `${careState.manor_daily_count}/${careState.limits.manor_daily_limit}`,
        detail: `剩余 ${careState.manor_remaining_care_count} 次，庄园总量上限${audit.manor_limit_enforced ? '已启用' : '未启用'}。`,
      },
      {
        id: 'object',
        label: '单物件照料',
        value: audit.object_limit_enforced ? '按场景物件限次' : '未启用',
        detail: '田地、果树、畜棚和鱼塘等对象会随服务端审计记录照料来源。',
      },
      {
        id: 'window',
        label: '短时反刷窗口',
        value: `${audit.recent_window_count} 次/${Math.round(audit.recent_window_seconds / 60)} 分钟`,
        detail: audit.dispute_log_available ? '审计日志可追溯，可用于争议复核。' : '当前未开放争议复核日志。',
      },
    ]
  })
  const careFailureReason = computed(() => {
    const careState = snapshot.value?.care_state
    if (!careState || careState.can_care) return ''
    return careState.care_denied_reason || '当前庄园暂未开放照料。'
  })
  const careAntiAbuseSummary = computed(() => {
    const audit = snapshot.value?.care_state.audit
    if (!audit) return '刷新后显示每日次数、短时窗口和异常标记。'
    const riskLabel = riskFlagLabel(audit.risk_flags)
    const visitorCounts = audit.daily_visitor_counts
      .slice(0, 3)
      .map(entry => `${entry.visitor_display_name || entry.visitor_username} ${entry.count}/${entry.limit}`)
      .join('、')
    return `${riskLabel}；近窗 ${audit.recent_window_count} 次；${visitorCounts || '暂无访客触达上限记录'}。`
  })
  const careReadableImpactSummary = computed(() => {
    const careState = snapshot.value?.care_state
    if (!careState) return '刷新庄园快照后显示照料收益、服务端落账和审计规则。'
    const audit = careState.audit
    const objectLimit = audit.object_limit_enforced ? '单物件限次已启用' : '单物件限次未启用'
    return `${objectLimit} · ${audit.visitor_limit_enforced ? '访客日上限已启用' : '访客日上限未启用'} · ${audit.manor_limit_enforced ? '庄园日上限已启用' : '庄园日上限未启用'}`
  })
  const stealReadableLimitRows = computed(() => {
    const stealState = snapshot.value?.steal_state
    if (!stealState) return []
    const audit = stealState.audit
    return [
      {
        id: 'visitor',
        label: '访客今日次数',
        value: `${stealState.visitor_daily_count}/${stealState.limits.visitor_daily_limit}`,
        detail: `剩余 ${stealState.remaining_steal_count} 次，同一访客上限${audit.visitor_limit_enforced ? '已启用' : '未启用'}。`,
      },
      {
        id: 'manor',
        label: '庄园今日承载',
        value: `${stealState.manor_daily_count}/${stealState.limits.manor_daily_limit}`,
        detail: `剩余 ${stealState.manor_remaining_steal_count} 次，庄园总量上限${audit.manor_limit_enforced ? '已启用' : '未启用'}。`,
      },
      {
        id: 'object',
        label: '单物件限制',
        value: `${stealState.limits.object_daily_limit} 次/日`,
        detail: `物件日上限${audit.object_limit_enforced ? '已启用' : '未启用'}，白名单${audit.whitelist_enforced ? '已启用' : '未启用'}。`,
      },
      {
        id: 'window',
        label: '短时反刷窗口',
        value: `${audit.recent_window_count} 次/${Math.round(audit.recent_window_seconds / 60)} 分钟`,
        detail: audit.dispute_log_available ? '审计日志可追溯，可用于争议复核。' : '当前未开放争议复核日志。',
      },
    ]
  })
  const stealFailureReason = computed(() => {
    const stealState = snapshot.value?.steal_state
    if (!stealState || stealState.can_steal) return ''
    return stealState.steal_denied_reason || '当前庄园暂未开放轻采。'
  })
  const stealAntiAbuseSummary = computed(() => {
    const audit = snapshot.value?.steal_state.audit
    if (!audit) return '刷新后显示每日次数、短时窗口和异常标记。'
    const riskLabel = riskFlagLabel(audit.risk_flags)
    const visitorCounts = audit.daily_visitor_counts
      .slice(0, 3)
      .map(entry => `${entry.visitor_display_name || entry.visitor_username} ${entry.count}/${entry.limit}`)
      .join('、')
    return `${riskLabel}；近窗 ${audit.recent_window_count} 次；${visitorCounts || '暂无访客触达上限记录'}。`
  })
  const stealReadableImpactSummary = computed(() => {
    const stealState = snapshot.value?.steal_state
    if (!stealState) return '刷新庄园快照后显示轻采收益上限、主人保留比例和凭证落账说明。'
    const audit = stealState.audit
    const reservedPercent = audit.owner_reserved_percent === undefined ? '未配置' : `${audit.owner_reserved_percent}%`
    const rewardCap = audit.visitor_reward_quantity_cap === undefined ? '未配置' : `${audit.visitor_reward_quantity_cap} 件`
    return `主人保留 ${reservedPercent} · 访客单次收益上限 ${rewardCap} · ${stealState.whitelist_summary}`
  })
  const carePermissionLabel = computed(() => {
    if (snapshot.value?.care_state.can_care) return '可照料'
    return snapshot.value?.access_policy.care_mode === 'closed' ? '已关闭' : '受限'
  })
  const stealPermissionLabel = computed(() => {
    if (snapshot.value?.steal_state.can_steal) return '可轻采'
    return snapshot.value?.access_policy.steal_mode === 'closed' ? '已关闭' : '受限'
  })
  const careEffectEntries = computed(() =>
    Object.entries(snapshot.value?.care_state.action_effects ?? {}).map(([id, effect]) => ({
      id,
      label: careSceneActionLabels.value[id] || id,
      ownerBenefit: effect.owner_benefit,
      visitorReward: effect.visitor_reward,
    }))
  )
  const stealEffectEntries = computed(() =>
    Object.entries(snapshot.value?.steal_state.action_effects ?? {}).map(([id, effect]) => ({
      id,
      label: careSceneActionLabels.value[id] || id,
      ownerCompensation: effect.owner_compensation,
      visitorReward: effect.visitor_reward,
    }))
  )
  const careRoomState = computed(() => snapshot.value?.care_room_state ?? null)
  const activeCareRooms = computed(() => careRoomState.value?.active_rooms ?? [])
  const recentCareRoomRecords = computed(() => snapshot.value?.care_room_records ?? [])
  const careRoomSummary = computed(() => {
    const state = careRoomState.value
    if (!state) return '刷新庄园快照后可建立 2-4 人护理房间。'
    return `窗口 ${Math.round(state.limits.window_seconds / 60)} 分钟 · ${state.record_summary}`
  })
  const careRoomActionTotal = computed(() => Object.keys(careRoomState.value?.action_labels ?? {}).length || 4)
  const activeTabMeta = computed<ManorTabMeta>(() => tabs.find(tab => tab.key === activeTab.value) ?? defaultTab)
  const setActiveTab = (tab: string) => {
    activeTab.value = tab as ManorTabKey
  }

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
  const favoriteOverviewLabel = computed(() => {
    if (!snapshot.value || isOwner.value) return `${manorStore.favoriteOverview?.favorites.length ?? 0} 项`
    return favoriteSummaryText.value
  })

  const overviewStats = computed(() => [
    { label: '当前主题', value: currentTheme.value },
    { label: '来访摘要', value: snapshot.value?.today_visit_summary || '暂无来访' },
    { label: '收藏关注', value: favoriteSummaryText.value },
    { label: '导览点', value: `${guidePoints.value.length} 个` },
  ])

  const overviewCopy = computed(() => {
    if (!snapshot.value) return '先刷新庄园快照，概览页只承接摘要，主题、留言、来访、导览会在各自标签里处理。'
    if (snapshot.value.viewer_is_owner) return '这是自己的庄园概览；管理操作已经按主题、留言、来访、导览和收藏拆到各标签页。'
    return '这是访客视角的庄园概览；页面只展示可访问内容，不暴露庄园主编辑控件。'
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

  const visitorActivityKindBadgeClass = (kind: string) => {
    if (kind === 'care') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    if (kind === 'steal') return 'border-amber-400/40 bg-amber-500/10 text-amber-200'
    if (kind === 'care_room') return 'border-sky-400/30 bg-sky-500/10 text-sky-200'
    return 'border-accent/20 bg-accent/10 text-accent'
  }

  const visitorActivityFallbackTitle = (kind: string) => {
    if (kind === 'care') return '好友照料记录'
    if (kind === 'steal') return '轻采争议记录'
    if (kind === 'care_room') return '协作护理房记录'
    return '普通来访记录'
  }

  const riskFlagLabel = (flags: string[] = []) => {
    if (flags.length === 0) return '暂无异常'
    const labels: Record<string, string> = {
      same_visitor_limit_reached: '同一访客触达日上限',
      manor_daily_limit_reached: '庄园日上限已触达',
      short_window_cluster: '短时间集中操作',
    }
    return flags.map(flag => labels[flag] || flag).join('、')
  }

  const careRoomStatusLabel = (status: OnlineManorCareRoom['status']) => {
    if (status === 'completed') return '已结算'
    if (status === 'expired') return '窗口结束'
    if (status === 'in_progress') return '护理中'
    return '待加入'
  }

  const careRoomWindowLabel = (room: OnlineManorCareRoom) => {
    if (room.status === 'completed') return formatVisitTime(room.settled_at)
    if (room.remaining_seconds <= 0) return '窗口已结束'
    const minutes = Math.ceil(room.remaining_seconds / 60)
    return `剩余 ${minutes} 分钟`
  }

  const careRoomActionLabel = (actionId: string) => careRoomState.value?.action_labels[actionId] || actionId

  const careRoomCompletedActionCount = (room: OnlineManorCareRoom) => new Set(room.actions.map(action => action.action_id)).size

  const careRoomProgressSummary = (room: OnlineManorCareRoom) => {
    const completed = careRoomCompletedActionCount(room)
    return `${completed}/${careRoomActionTotal.value} 项 · 成员 ${room.participants.length}/${room.member_limit} · 健康 ${room.health_score || 0}`
  }

  const careRoomPendingActionLabels = (room: OnlineManorCareRoom) => {
    const labels = careRoomState.value?.action_labels ?? {}
    const completed = new Set(room.actions.map(action => action.action_id))
    const pending = Object.entries(labels)
      .filter(([actionId]) => !completed.has(actionId))
      .map(([, label]) => label)
    return pending.length > 0 ? pending.join('、') : '全部护理分工已完成'
  }

  const careRoomRiskSummary = (room: OnlineManorCareRoom) => {
    const riskyActions = room.actions.filter(action => action.order_risk).length
    const roleMismatch = room.actions.filter(action => !action.role_matched).length
    if (room.actions.length === 0) return '暂无动作，顺序风险尚未产生。'
    if (riskyActions === 0 && roleMismatch === 0) return `顺序正常，累计风险 ${room.risk_score || 0}。`
    return `${riskyActions} 个顺序提前 · ${roleMismatch} 个角色未匹配 · 累计风险 ${room.risk_score || 0}`
  }

  const careRoomSettlementHint = (room: OnlineManorCareRoom) => {
    if (room.status === 'completed') return `已结算 · ${careRoomSettledByLabel(room)}`
    if (room.participants.length < 2) return '至少 2 人加入后才能开始护理与结算。'
    if (room.can_settle) return '已达到结算门槛，可由成员或庄园主人收尾。'
    const remainingActions = Math.max(0, 2 - room.actions.length)
    if (remainingActions > 0) return `还需完成 ${remainingActions} 个护理分工后才能结算。`
    return '等待服务端刷新结算状态。'
  }

  const careRoomSettledByLabel = (room: OnlineManorCareRoom) => {
    if (!room.settled_by) return room.settled_at ? formatVisitTime(room.settled_at) : '未结算'
    const settledAt = formatVisitTime(room.settled_at)
    return settledAt ? `${room.settled_by} · ${settledAt}` : room.settled_by
  }

  const saveGuide = async () => {
    await manorStore.saveGuideSnapshot().catch(() => {})
  }

  const createCareRoom = async (memberLimit: number) => {
    await manorStore.createCareRoom(memberLimit).catch(() => {})
  }

  const joinCareRoom = async (roomId: string) => {
    await manorStore.joinCareRoom(roomId).catch(() => {})
  }

  const submitCareRoomAction = async (roomId: string, actionId: string) => {
    await manorStore.submitCareRoomAction(roomId, actionId).catch(() => {})
  }

  const settleCareRoom = async (roomId: string) => {
    await manorStore.settleCareRoom(roomId).catch(() => {})
  }

  const submitCareVisualAction = async (payload: ManorCareActionPayload) => {
    manorStore.selectCareObject(payload.objectId)
    if (stealActionIds.value.has(payload.actionId)) {
      await manorStore.submitStealAction(payload.objectId, payload.actionId).catch(() => {})
      return
    }
    await manorStore.submitCareAction(payload.objectId, payload.actionId).catch(() => {})
  }

  const favoriteManor = async () => {
    await manorStore.favoriteCurrentManor().catch(() => {})
  }

  const followManor = async () => {
    await manorStore.followCurrentManor().catch(() => {})
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
