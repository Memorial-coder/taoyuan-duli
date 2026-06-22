<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="text-sm text-accent">{{ manorStore.snapshot && !manorStore.snapshot.viewer_is_owner ? `${manorStore.snapshot.display_name}的公开庄园` : '公开庄园' }}</p>
        <p class="text-[0.625rem] text-muted mt-1">{{ routeTargetHelperText }}</p>
      </div>
      <Button class="text-[0.625rem]" :disabled="manorStore.loading" @click="refreshSnapshot">
        {{ manorStore.loading ? '加载中…' : '刷新庄园快照' }}
      </Button>
    </div>

    <div v-if="manorStore.errorMessage" class="game-panel border border-danger/20 rounded-xs p-3 text-xs text-danger">
      {{ manorStore.errorMessage }}
    </div>

    <ManorPreviewCard :snapshot="manorStore.snapshot" :favorite-overview="manorStore.favoriteOverview" />

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-xs text-accent">庄园互助照料</p>
          <p class="mt-1 text-[0.625rem] text-muted">
            今日 {{ manorStore.snapshot.care_state.manor_daily_count }}/{{ manorStore.snapshot.care_state.limits.manor_daily_limit }} ·
            照料剩余 {{ manorStore.snapshot.care_state.remaining_care_count }} ·
            偷菜 {{ manorStore.snapshot.steal_state.manor_daily_count }}/{{ manorStore.snapshot.steal_state.limits.manor_daily_limit }}
          </p>
        </div>
        <div class="flex flex-col items-start gap-1 text-[0.625rem] text-muted md:items-end">
          <span class="w-fit shrink-0">
            {{ manorStore.snapshot.care_state.can_care ? '可照料' : manorStore.snapshot.care_state.care_denied_reason }}
          </span>
          <span class="w-fit shrink-0">
            {{ manorStore.snapshot.steal_state.can_steal ? `可轻采 ${manorStore.snapshot.steal_state.remaining_steal_count} 次` : manorStore.snapshot.steal_state.steal_denied_reason }}
          </span>
        </div>
      </div>

      <div v-if="manorStore.snapshot.viewer_is_owner" class="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <label class="block">
          <span class="text-[0.625rem] text-muted">访问权限</span>
          <select v-model="manorStore.accessVisitModeDraft" class="mt-1 w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
            <option v-for="option in manorStore.snapshot.access_policy.options" :key="`visit-${option.id}`" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="text-[0.625rem] text-muted">照料权限</span>
          <select v-model="manorStore.accessCareModeDraft" class="mt-1 w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
            <option v-for="option in manorStore.snapshot.access_policy.options" :key="`care-${option.id}`" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="text-[0.625rem] text-muted">偷菜权限</span>
          <select v-model="manorStore.accessStealModeDraft" class="mt-1 w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
            <option v-for="option in manorStore.snapshot.access_policy.options" :key="`steal-${option.id}`" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="flex items-end">
          <Button class="online-action-btn online-action-btn--compact" :disabled="manorStore.accessPolicyActionRunning" @click="saveAccessPolicy">
            {{ manorStore.accessPolicyActionRunning ? '保存中…' : '保存权限' }}
          </Button>
        </div>
      </div>

      <VisualSceneBoard
        v-if="manorCareObjects.length > 0"
        :objects="manorCareObjects"
        :selected-object-id="manorStore.selectedCareObjectId || manorStore.snapshot.visual_state.selected_visual_id"
        :recent-feedback="manorStore.snapshot.visual_state.recent_feedback"
        :action-running="manorStore.careActionRunning || manorStore.stealActionRunning"
        :action-labels="manorStore.snapshot.care_state.scene_action_labels"
        @select-object="manorStore.selectCareObject"
        @trigger-action="submitManorSceneAction"
      />

      <p v-if="manorStore.snapshot.steal_state.whitelist_summary" class="text-[0.625rem] leading-4 text-muted">
        {{ manorStore.snapshot.steal_state.whitelist_summary }}
      </p>
      <div v-if="Object.keys(manorStore.snapshot.steal_state.target_use_hints || {}).length > 0" class="flex flex-wrap gap-1">
        <span
          v-for="hint in Object.values(manorStore.snapshot.steal_state.target_use_hints).slice(0, 4)"
          :key="hint.item_id"
          class="border border-accent/10 rounded-xs px-2 py-0.5 text-[0.625rem] text-muted"
        >
          {{ hint.label }} · {{ hint.use_summary }}
        </span>
      </div>

      <div v-if="manorStore.snapshot.care_entries.length > 0" class="border border-accent/10 rounded-xs p-2">
        <p class="text-[0.625rem] text-muted mb-1">最近照料</p>
        <div class="max-h-28 space-y-1 overflow-y-auto pr-1">
          <p v-for="entry in manorStore.snapshot.care_entries.slice(0, 6)" :key="entry.id" class="text-[0.625rem] leading-4 text-muted">
            {{ entry.visitor_display_name }} · {{ entry.object_label }} · {{ entry.action_label }} · {{ entry.owner_benefit }}
          </p>
        </div>
      </div>

      <div v-if="manorStore.snapshot.steal_entries.length > 0" class="border border-accent/10 rounded-xs p-2">
        <p class="text-[0.625rem] text-muted mb-1">最近轻采</p>
        <div class="max-h-28 space-y-1 overflow-y-auto pr-1">
          <p v-for="entry in manorStore.snapshot.steal_entries.slice(0, 6)" :key="entry.id" class="text-[0.625rem] leading-4 text-muted">
            {{ entry.visitor_display_name }} · {{ entry.object_label }} · {{ entry.target_label }} · {{ entry.use_summary || entry.owner_compensation }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">收藏与关注</p>
      <div v-if="!manorStore.snapshot.viewer_is_owner" class="flex gap-2">
        <Button class="text-[0.625rem]" :disabled="manorStore.favoriteActionRunning || manorStore.snapshot.is_favorited_by_viewer" @click="favoriteManor">
          {{ manorStore.snapshot.is_favorited_by_viewer ? '已收藏' : '收藏庄园' }}
        </Button>
        <Button class="text-[0.625rem]" :disabled="manorStore.favoriteActionRunning || manorStore.snapshot.is_followed_by_viewer" @click="followManor">
          {{ manorStore.snapshot.is_followed_by_viewer ? '已关注更新' : '关注庄园更新' }}
        </Button>
      </div>
      <p v-else class="text-[0.625rem] text-muted">这是你自己的庄园，收藏和关注列表会展示其他玩家与热门庄园。</p>
      <div v-if="manorStore.favoriteOverview" class="grid gap-2 md:grid-cols-2">
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">同主题收藏</p>
          <div v-if="manorStore.favoriteOverview.same_theme_favorites.length === 0" class="text-[0.625rem] text-muted">当前还没有同主题收藏列表。</div>
          <div
            v-for="(group, index) in manorStore.favoriteOverview.same_theme_favorites"
            :key="index"
            class="border border-accent/10 rounded-xs p-2 mb-1.5"
          >
            <p class="text-xs text-accent">{{ group.map(entry => entry.display_name).join('、') }}</p>
          </div>
        </div>
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">热门庄园榜</p>
          <div v-if="manorStore.favoriteOverview.hot_manors.length === 0" class="text-[0.625rem] text-muted">当前还没有热门庄园榜。</div>
          <div v-for="entry in manorStore.favoriteOverview.hot_manors" :key="entry.manor_username" class="border border-accent/10 rounded-xs p-2 mb-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-accent">{{ entry.manor_username }}</p>
              <span class="text-[0.625rem] text-muted">收藏 {{ entry.favorite_count }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-1">{{ entry.theme || '未分类主题' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">庄园主题周</p>
      <div v-if="manorStore.snapshot.viewer_is_owner" class="border border-accent/10 rounded-xs p-2 bg-bg/10 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-muted">庄园主图</p>
          <Button class="text-[0.625rem]" :disabled="uploadingCover" @click="triggerCoverUpload">
            {{ uploadingCover ? '上传中…' : '上传主图' }}
          </Button>
        </div>
        <input ref="coverInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleCoverSelected" />
        <div v-if="manorStore.coverImageUrlDraft" class="space-y-2">
          <img :src="manorStore.coverImageUrlDraft" :alt="manorStore.coverImageAltDraft || '庄园主图'" class="max-h-40 w-full rounded-xs border border-accent/15 object-cover" />
          <input
            v-model="manorStore.coverImageAltDraft"
            maxlength="120"
            class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
            placeholder="主图说明"
          />
        </div>
      </div>
      <div v-if="manorStore.snapshot.viewer_is_owner" class="grid gap-2 md:grid-cols-2">
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">展示模板</p>
          <select
            v-model="manorStore.templateIdDraft"
            class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
          >
            <option
              v-for="option in manorStore.snapshot.theme_week.template_options"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="text-[0.625rem] text-muted mt-2">
            {{ manorStore.snapshot.theme_week.template_options.find(item => item.id === manorStore.templateIdDraft)?.summary || '选择一种公开展示方式。' }}
          </p>
        </div>
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">模板速览</p>
          <div class="grid gap-1">
            <button
              v-for="option in manorStore.snapshot.theme_week.template_options"
              :key="option.id"
              type="button"
              class="text-left text-[0.625rem] px-2 py-1 rounded-xs border transition-colors"
              :class="manorStore.templateIdDraft === option.id ? 'border-accent/40 text-accent bg-accent/5' : 'border-accent/15 text-muted'"
              @click="manorStore.templateIdDraft = option.id"
            >
              <span class="block">{{ option.label }}</span>
              <span class="block mt-0.5 opacity-80">{{ option.summary }}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="grid gap-2 md:grid-cols-2">
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">当前主题</p>
          <p class="text-xs text-accent">{{ manorStore.snapshot.theme_week.active_theme }}</p>
          <p class="text-[0.625rem] text-muted mt-1">来源：{{ manorStore.snapshot.theme_week.active_theme_source }}</p>
          <p class="text-[0.625rem] text-muted mt-2">主题分：{{ manorStore.snapshot.theme_week.score }}</p>
        </div>
        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">官方精选</p>
          <p class="text-xs text-accent">{{ manorStore.snapshot.theme_week.official_pick?.label || '暂无官方精选' }}</p>
          <p class="text-[0.625rem] text-muted mt-1">{{ manorStore.snapshot.theme_week.official_pick?.reason || '当前主题分尚未达到精选门槛。' }}</p>
        </div>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[0.625rem] text-muted mb-1">主题推荐</p>
        <div class="flex flex-wrap gap-1">
          <span v-for="item in manorStore.snapshot.theme_week.recommendations" :key="item" class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted">
            {{ item }}
          </span>
          <span v-if="manorStore.snapshot.theme_week.recommendations.length === 0" class="text-[0.625rem] text-muted">当前没有额外推荐。</span>
        </div>
      </div>
      <div v-if="manorStore.snapshot.viewer_is_owner" class="online-action-row">
        <input
          v-model="manorStore.themeLabelDraft"
          maxlength="30"
          class="online-input flex-1"
          placeholder="保存当前主题名"
        />
        <Button class="online-action-btn online-action-btn--primary" :disabled="manorStore.themeActionRunning" @click="saveThemeWeek">
          {{ manorStore.themeActionRunning ? '保存中…' : '保存主题' }}
        </Button>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">留言墙</p>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
        <button
          v-for="option in guestbookKindOptions"
          :key="option.id"
          type="button"
          class="text-left text-[0.625rem] px-2 py-1.5 rounded-xs border transition-colors"
          :class="manorStore.guestbookKindDraft === option.id ? 'border-accent/40 text-accent bg-accent/5' : 'border-accent/15 text-muted'"
          @click="manorStore.setGuestbookKind(option.id)"
        >
          <span class="block">{{ option.label }}</span>
        </button>
      </div>
      <div class="border border-accent/10 rounded-xs p-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.625rem] text-muted">当前留言模式</p>
          <span class="text-[0.625rem] text-accent">{{ currentGuestbookKind.label }}</span>
        </div>
        <p class="text-[0.625rem] text-muted mt-1">{{ currentGuestbookKind.helper }}</p>
        <div class="flex flex-wrap gap-1 mt-2">
          <button
            v-for="pick in manorStore.guestbookQuickPicks"
            :key="pick"
            type="button"
            class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/15 text-muted hover:border-accent/30 hover:text-accent"
            @click="manorStore.applyGuestbookQuickPick(pick)"
          >
            {{ pick }}
          </button>
        </div>
      </div>
      <textarea
        v-model="manorStore.guestbookDraft"
        rows="3"
        maxlength="160"
        class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
        :placeholder="manorStore.guestbookPlaceholder"
      />
      <div class="flex items-center justify-between gap-2">
        <p class="text-[0.625rem] text-muted">当前会以“{{ currentGuestbookKind.label }}”写入这座庄园的互动痕迹。</p>
        <Button class="text-[0.625rem]" :disabled="manorStore.guestbookActionRunning" @click="submitGuestbook">
          {{ manorStore.guestbookActionRunning ? '提交中…' : manorStore.guestbookSubmitLabel }}
        </Button>
      </div>

      <div class="space-y-2">
        <div v-if="manorStore.snapshot.guestbook_entries.length === 0" class="text-[0.625rem] text-muted">当前还没有访客留言。</div>
        <div v-for="entry in manorStore.snapshot.guestbook_entries" :key="entry.id" class="border border-accent/10 rounded-xs p-2">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-xs text-accent">{{ entry.author_display_name }}</p>
                <span class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border" :class="guestbookKindBadgeClass(entry.kind)">
                  {{ guestbookKindLabel(entry.kind) }}
                </span>
                <span v-if="entry.pinned" class="text-[0.625rem] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent bg-accent/5">
                  置顶
                </span>
              </div>
              <div class="mt-2">
                <div
                  v-if="entry.kind === 'stamp'"
                  class="inline-flex rounded-xs border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-amber-100"
                >
                  {{ entry.content }}
                </div>
                <p v-else-if="entry.kind === 'signature'" class="text-xs text-right italic text-fuchsia-100">
                  —— {{ entry.content }}
                </p>
                <p v-else class="text-[0.625rem] text-muted mt-1">
                  {{ entry.content }}
                </p>
              </div>
            </div>
            <Button
              v-if="manorStore.snapshot.viewer_is_owner"
              class="text-[0.625rem]"
              :disabled="manorStore.guestbookActionRunning"
              @click="togglePinned(entry.id, !entry.pinned)"
            >
              {{ entry.pinned ? '取消置顶' : '置顶' }}
            </Button>
          </div>
          <div v-if="entry.reply_text" class="border border-accent/10 rounded-xs px-2 py-1.5 mt-2 bg-bg/10">
            <p class="text-[0.625rem] text-muted">{{ entry.reply_author_display_name || '庄园主人' }} 回复：</p>
            <p class="text-[0.625rem] mt-1">{{ entry.reply_text }}</p>
          </div>
          <div v-else-if="manorStore.snapshot.viewer_is_owner" class="mt-2 flex gap-2">
            <input
              v-model="manorStore.guestbookReplyDraft[entry.id]"
              maxlength="160"
              class="flex-1 bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              placeholder="回复这条留言"
            />
            <Button class="text-[0.625rem]" :disabled="manorStore.guestbookActionRunning" @click="replyGuestbook(entry.id)">
              回复
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">访客记录</p>
      <div class="grid gap-2 md:grid-cols-3">
        <select v-model="manorStore.visitPurposeDraft" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
          <option value="explore">参观取景</option>
          <option value="friend_visit">好友回访</option>
          <option value="gift">带礼探访</option>
          <option value="quest">顺手带走需求</option>
          <option value="other">其他来意</option>
        </select>
        <input
          v-model="manorStore.visitSummaryDraft"
          maxlength="160"
          class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
          placeholder="这次来访做了什么"
        />
        <input
          v-model="manorStore.visitFeedbackDraft"
          maxlength="160"
          class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
          placeholder="给庄园主的反馈"
        />
      </div>
      <div class="flex justify-end">
        <Button class="text-[0.625rem]" :disabled="manorStore.visitActionRunning" @click="recordVisit">
          {{ manorStore.visitActionRunning ? '记录中…' : '记录这次来访' }}
        </Button>
      </div>

      <div class="space-y-2">
        <div v-if="manorStore.snapshot.visit_entries.length === 0" class="text-[0.625rem] text-muted">当前还没有访客记录。</div>
        <div v-for="entry in manorStore.snapshot.visit_entries" :key="entry.id" class="border border-accent/10 rounded-xs p-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent">{{ entry.visitor_display_name }} · {{ visitPurposeLabel(entry.purpose) }}</p>
            <span class="text-[0.625rem] text-muted">{{ new Date(entry.created_at * 1000).toLocaleString('zh-CN', { hour12: false }) }}</span>
          </div>
          <p class="text-[0.625rem] text-muted mt-1">来访行为：{{ entry.summary }}</p>
          <p v-if="entry.feedback" class="text-[0.625rem] text-muted mt-1">来访反馈：{{ entry.feedback }}</p>
          <div v-if="entry.carried_items.length > 0" class="mt-1 flex flex-wrap items-center gap-1 text-[0.625rem] text-muted">
            <span>带走委托：</span>
            <span
              v-for="item in entry.carried_items"
              :key="`${entry.id}-${item.itemId}`"
              class="inline-flex items-center gap-1 rounded-xs border border-accent/10 px-1 py-0.5"
            >
              <ItemIcon :item="getItemById(item.itemId)" size="xs" :show-badge="false" />
              <span>{{ getItemById(item.itemId)?.name ?? item.itemId }} x{{ item.quantity }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <p class="text-xs text-accent">庄园导览</p>
      <div class="grid gap-2 md:grid-cols-2">
        <div v-if="manorStore.snapshot.viewer_is_owner" class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">推荐参观点</p>
          <input
            v-model="manorStore.guidePointTitleDraft"
            maxlength="30"
            class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent mb-2"
            placeholder="参观点标题"
          />
          <input
            v-model="manorStore.guidePointSummaryDraft"
            maxlength="120"
            class="w-full bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
            placeholder="告诉访客为什么值得看"
          />
          <div class="flex justify-end mt-2">
            <Button class="text-[0.625rem]" :disabled="manorStore.guideActionRunning" @click="saveGuide">
              {{ manorStore.guideActionRunning ? '保存中…' : '加入导览点' }}
            </Button>
          </div>
        </div>

        <div class="border border-accent/10 rounded-xs p-2">
          <p class="text-[0.625rem] text-muted mb-1">今日来访摘要</p>
          <p class="text-xs text-accent">{{ manorStore.snapshot.today_visit_summary }}</p>
          <p class="text-[0.625rem] text-muted mt-2">
            当前主题路线：{{ manorStore.snapshot.guide_routes[0]?.title || '还没设置主题路线' }}
          </p>
          <p class="text-[0.625rem] text-muted mt-1">
            {{ manorStore.snapshot.guide_routes[0]?.summary || '保存第一个参观点后，会自动整理出一条基础参观路线。' }}
          </p>
        </div>
      </div>

      <div class="border border-accent/10 rounded-xs p-2">
        <p class="text-[0.625rem] text-muted mb-1">已设置参观点</p>
        <div v-if="manorStore.snapshot.guide_points.length === 0" class="text-[0.625rem] text-muted">当前还没有推荐参观点。</div>
        <div v-for="point in manorStore.snapshot.guide_points" :key="point.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
          <p class="text-xs text-accent">{{ point.order }}. {{ point.title }}</p>
          <p class="text-[0.625rem] text-muted mt-1">{{ point.summary }}</p>
        </div>
      </div>
    </div>

    <div v-if="manorStore.snapshot" class="game-panel border border-accent/10 rounded-xs p-3 space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-accent">求助单入口</p>
          <p class="text-[0.625rem] text-muted mt-1 leading-5">想把访客来意、缺货需求或临时补货转成真正的联机协作，可以直接去委托面板发布或接单。</p>
        </div>
        <Button class="text-[0.625rem] shrink-0" @click="openQuestBoard">前往委托</Button>
      </div>
    </div>

    <div class="game-panel border border-accent/10 rounded-xs p-3 text-[0.625rem] text-muted space-y-1">
      <p>当前庄园公开页已经串起快照、留言、来访、导览、收藏、主题周与展示模板，公开庄园开始更像一个可持续经营的线上门面。</p>
      <p>模板切换会跟随主题周一起保存，并直接驱动上方预览卡切换为展示类、经营类、节庆类、收藏类或故事类布局。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import ManorPreviewCard from '@/components/game/ManorPreviewCard.vue'
  import VisualSceneBoard from '@/components/game/online/VisualSceneBoard.vue'
  import { useManorStore } from '@/stores/useManorStore'
  import { getItemById } from '@/data'
  import { showFloat } from '@/composables/useGameLog'
  import { uploadHallImage } from '@/utils/taoyuanHallApi'
  import type { OnlineVisualObject } from '@/types/onlineVisual'

  const route = useRoute()
  const router = useRouter()
  const manorStore = useManorStore()
  const uploadingCover = ref(false)
  const coverInputRef = ref<HTMLInputElement | null>(null)
  const guestbookKindOptions = [
    { id: 'text', label: '留言', helper: '自由写参观感受，适合留下完整的一句话。' },
    { id: 'blessing', label: '祝福', helper: '更适合节气问候、丰收祝愿和暖一点的回声。' },
    { id: 'advice', label: '建议', helper: '给主人留一条经营建议，告诉他还能怎么继续打磨。' },
    { id: 'stamp', label: '图章', helper: '像盖章一样留下短印记，适合节气、主题和来访证明。' },
    { id: 'signature', label: '签名', helper: '用落款式写法留名，让来访痕迹更像一封短短的署名。' },
  ] as const
  const currentGuestbookKind = computed(() => guestbookKindOptions.find(option => option.id === manorStore.guestbookKindDraft) ?? guestbookKindOptions[0])
  const getRouteQueryText = (value: unknown) => {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw.trim() : ''
  }
  const routeTargetUsername = computed(() => getRouteQueryText(route.query.target_username))
  const routeTargetSaveId = computed(() => getRouteQueryText(route.query.target_save_id))
  const routeTargetContextLabel = computed(() => routeTargetUsername.value || (routeTargetSaveId.value ? `ID ${routeTargetSaveId.value}` : ''))
  const routeTargetHelperText = computed(() => {
    if (!routeTargetContextLabel.value) return '把庄园公开展示成一个可以被别人理解的在线地点。'
    return routeTargetSaveId.value
      ? `从好友驿站打开，当前正在查看目标玩家的庄园快照（ID ${routeTargetSaveId.value}）。`
      : '从好友驿站打开，当前正在查看目标玩家的庄园快照。'
  })
  type ManorCareActionPayload = { objectId: string; actionId: string }
  const manorCareObjects = computed<OnlineVisualObject[]>(() => {
    const visualState = manorStore.snapshot?.visual_state
    return visualState?.board_type === 'scene' ? visualState.objects : []
  })

  const refreshSnapshot = async () => {
    await manorStore.refreshSnapshot({
      target_username: routeTargetUsername.value,
      target_save_id: routeTargetSaveId.value || undefined,
    }).catch(() => {})
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

  const guestbookKindLabel = (kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature') => {
    if (kind === 'blessing') return '祝福'
    if (kind === 'advice') return '建议'
    if (kind === 'stamp') return '图章'
    if (kind === 'signature') return '签名'
    return '留言'
  }

  const guestbookKindBadgeClass = (kind: 'text' | 'blessing' | 'advice' | 'stamp' | 'signature') => {
    if (kind === 'blessing') return 'border-emerald-400/30 text-emerald-200 bg-emerald-500/10'
    if (kind === 'advice') return 'border-sky-400/30 text-sky-200 bg-sky-500/10'
    if (kind === 'stamp') return 'border-amber-400/40 text-amber-200 bg-amber-500/10'
    if (kind === 'signature') return 'border-fuchsia-400/30 text-fuchsia-200 bg-fuchsia-500/10'
    return 'border-accent/20 text-accent bg-accent/5'
  }

  const recordVisit = async () => {
    await manorStore.createVisitRecord().catch(() => {})
  }

  const visitPurposeLabel = (purpose: 'explore' | 'friend_visit' | 'gift' | 'quest' | 'other') => {
    if (purpose === 'explore') return '参观取景'
    if (purpose === 'friend_visit') return '好友回访'
    if (purpose === 'gift') return '带礼探访'
    if (purpose === 'quest') return '带走需求'
    return '其他来意'
  }

  const saveGuide = async () => {
    await manorStore.saveGuideSnapshot().catch(() => {})
  }

  const favoriteManor = async () => {
    await manorStore.favoriteCurrentManor().catch(() => {})
  }

  const followManor = async () => {
    await manorStore.followCurrentManor().catch(() => {})
  }

  const openQuestBoard = () => {
    const targetUsername = manorStore.snapshot?.viewer_is_owner ? '' : manorStore.snapshot?.username || routeTargetUsername.value
    const targetSaveId = manorStore.snapshot?.viewer_is_owner ? '' : routeTargetSaveId.value
    const query: Record<string, string> = {}
    if (targetUsername || targetSaveId) {
      query.scope = 'friends'
      if (targetUsername) query.target_username = targetUsername
      if (targetSaveId) query.target_save_id = targetSaveId
    }
    void router.push(Object.keys(query).length > 0
      ? { name: 'quest', query }
      : { name: 'quest' })
  }

  const saveThemeWeek = async () => {
    await manorStore.saveThemeWeekSnapshot().catch(() => {})
  }

  const submitManorSceneAction = async (payload: ManorCareActionPayload) => {
    if (payload.actionId.startsWith('steal_')) {
      await manorStore.submitStealAction(payload.objectId, payload.actionId).catch(() => {})
      return
    }
    await manorStore.submitCareAction(payload.objectId, payload.actionId).catch(() => {})
  }

  const saveAccessPolicy = async () => {
    await manorStore.saveAccessPolicySnapshot().catch(() => {})
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
    } catch (error: any) {
      showFloat(error?.message || '上传庄园主图失败', 'danger')
    } finally {
      uploadingCover.value = false
      if (input) input.value = ''
    }
  }

  onMounted(() => {
    void refreshSnapshot()
    void manorStore.refreshFavoriteOverview()
  })

  watch(
    () => [route.query.target_username, route.query.target_save_id],
    () => {
      void refreshSnapshot()
    }
  )
</script>
