<template>
  <div class="min-h-screen px-4 py-6 md:py-8" :class="{ 'pt-10': Capacitor.isNativePlatform() }" @click="toolbarMenu = null">
    <div class="mx-auto w-full max-w-6xl space-y-4">
      <div class="game-panel">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <button class="btn" @click="goBack">
              <ArrowLeft :size="14" />
              <span>返回首页</span>
            </button>
            <div>
              <h1 class="text-accent text-lg md:text-xl mb-2 flex items-center gap-2">
                <MessagesSquare :size="18" />
                交流大厅
              </h1>
              <p class="text-xs text-muted leading-6">
                这里是桃源乡的论坛 + 求助大厅。任何人都能浏览，登录当前游戏账号后即可发帖、回复与管理自己的求助帖。
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button v-if="viewer.isAdmin" class="btn" @click="toggleAdminReports">
              <span>举报管理</span>
              <span v-if="pendingReportsCount > 0">({{ pendingReportsCount }})</span>
            </button>
            <button class="btn" @click="refreshAll" :disabled="loadingPosts || loadingDetail || loadingViewer">
              <RefreshCw :size="14" />
              <span>刷新</span>
            </button>
            <button class="btn" @click="openComposer">
              <SquarePen :size="14" />
              <span>发帖</span>
            </button>
          </div>
        </div>

        <div class="mt-3 text-xs">
          <span v-if="viewerStatus === 'unavailable'" class="text-warning">当前登录状态暂时无法确认，请检查网络后再试。</span>
          <span v-else-if="viewer.loggedIn" class="text-success">当前账号：{{ viewer.displayName || viewer.username }}（可发帖 / 回复）</span>
          <span v-else class="text-muted">当前为游客浏览模式，请先登录游戏账号后再发帖或回复。</span>
        </div>
      </div>

      <div class="game-panel hall-toolbar">
        <div class="hall-toolbar__search-row">
          <div class="hall-toolbar__search-box">
            <Search :size="14" class="text-muted shrink-0" />
            <input
              v-model="keywordInput"
              type="text"
              maxlength="50"
              placeholder="搜索标题或正文..."
              class="hall-toolbar__search-input"
              @keydown.enter.prevent="applyKeywordSearch"
            />
          </div>
          <div class="flex gap-2 shrink-0">
            <button class="btn !px-2 !py-1" @click="applyKeywordSearch">
              <span>搜索</span>
            </button>
            <button class="btn !px-2 !py-1" @click="resetKeywordSearch" :disabled="!keyword && !keywordInput">
              <span>清空</span>
            </button>
          </div>
        </div>

        <div class="hall-toolbar__filters">
          <div class="hall-select-wrap hall-select-wrap--custom" @click.stop>
            <span class="hall-select-wrap__label">分类</span>
            <button class="hall-select-button" @click.stop="toggleToolbarMenu('category')">
              <span>{{ selectedCategoryLabel }}</span>
              <ArrowDown :size="14" class="hall-select-button__arrow" />
            </button>
            <div v-if="toolbarMenu === 'category'" class="hall-dropdown-panel" @click.stop>
              <button
                v-for="item in categoryOptions"
                :key="item.value"
                class="hall-dropdown-option"
                :class="{ 'hall-dropdown-option--active': category === item.value }"
                @click="selectCategory(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div class="hall-select-wrap hall-select-wrap--custom" @click.stop>
            <span class="hall-select-wrap__label">排序</span>
            <button class="hall-select-button" @click.stop="toggleToolbarMenu('sort')">
              <span>{{ selectedSortLabel }}</span>
              <ArrowDown :size="14" class="hall-select-button__arrow" />
            </button>
            <div v-if="toolbarMenu === 'sort'" class="hall-dropdown-panel" @click.stop>
              <button
                v-for="item in sortOptions"
                :key="item.value"
                class="hall-dropdown-option"
                :class="{ 'hall-dropdown-option--active': sortBy === item.value }"
                @click="selectSort(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div class="hall-select-wrap hall-select-wrap--custom" @click.stop>
            <span class="hall-select-wrap__label">视图</span>
            <button class="hall-select-button" @click.stop="toggleToolbarMenu('mine')">
              <span>{{ selectedMineLabel }}</span>
              <ArrowDown :size="14" class="hall-select-button__arrow" />
            </button>
            <div v-if="toolbarMenu === 'mine'" class="hall-dropdown-panel" @click.stop>
              <button
                v-for="item in mineOptions"
                :key="item.value"
                class="hall-dropdown-option"
                :class="{ 'hall-dropdown-option--active': mineFilter === item.value, 'hall-dropdown-option--disabled': !viewer.loggedIn && item.value !== 'all' }"
                :disabled="!viewer.loggedIn && item.value !== 'all'"
                @click="selectMineFilter(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
          <button
            v-if="goalStore.currentEventCampaign"
            class="hall-chip"
            :class="{ 'hall-chip--active': currentActivityOnly }"
            @click.stop="currentActivityOnly = !currentActivityOnly; currentPage = 1; void loadPosts()"
          >
            {{ currentActivityOnly ? `只看${currentActivityLabel}` : `筛选${currentActivityLabel}` }}
          </button>
        </div>
      </div>

      <div class="game-panel">
        <div class="flex items-center justify-between gap-3 mb-3">
          <p class="text-sm text-accent">本周路线摘要</p>
          <span class="text-[11px] text-muted">{{ weeklyPlanSnapshot.weekId }}</span>
        </div>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-3">
            <p class="text-[10px] text-muted">本周主路线</p>
            <p class="mt-1 text-xs text-accent">{{ weeklyPlanSnapshot.primaryRouteLabel }}</p>
            <p class="mt-1 text-[10px] text-muted leading-4">{{ weeklyPlanSnapshot.primaryRouteSummary }}</p>
          </div>
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-3">
            <p class="text-[10px] text-muted">辅助路线</p>
            <p class="mt-1 text-xs text-accent">{{ weeklyPlanSnapshot.secondaryRouteLabels.join('、') || '当前优先跟主路线。' }}</p>
            <p class="mt-1 text-[10px] text-muted leading-4">{{ weeklyPlanSnapshot.secondaryRouteSummaries[0] || '如果主路线推进顺利，再补这条副线即可。' }}</p>
          </div>
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-3">
            <p class="text-[10px] text-muted">当前可领取</p>
            <p class="mt-1 text-xs text-accent">{{ weeklyPlanSnapshot.claimableNodeLabels.join('、') || '当前没有额外领奖点。' }}</p>
            <p class="mt-1 text-[10px] text-muted leading-4">大厅更适合用来发周中求助帖、补充领奖路径和展示收尾成果。</p>
          </div>
          <div class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-3">
            <p class="text-[10px] text-muted">下周准备</p>
            <p class="mt-1 text-[10px] text-muted leading-4">{{ weeklyPlanSnapshot.nextWeekPrepSummary }}</p>
            <p v-if="latestWeeklyChronicle" class="mt-1 text-[10px] text-accent/80">最近周纪行：{{ latestWeeklyChronicle.weekId }}</p>
          </div>
        </div>
      </div>

      <div v-if="viewer.isAdmin && showAdminReports" class="game-panel space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">举报管理</p>
          <button class="btn !px-2 !py-1" @click="loadAdminReports" :disabled="loadingAdminReports">
            <span>{{ loadingAdminReports ? '刷新中...' : '刷新举报' }}</span>
          </button>
        </div>

        <div v-if="loadingAdminReports" class="text-xs text-muted">举报列表加载中...</div>
        <div v-else-if="!adminReports.length" class="text-xs text-muted">当前没有举报记录。</div>
        <div v-else class="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
          <div v-for="report in adminReports" :key="report.id" class="rounded-xs border border-accent/15 bg-bg/15 px-3 py-3">
            <div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span>类型：{{ report.type === 'post' ? '帖子' : '回复' }}</span>
              <span>举报人：{{ report.reporter_display_name }}</span>
              <span>时间：{{ formatTime(report.created_at) }}</span>
              <span :class="report.status === 'pending' ? 'text-warning' : 'text-muted'">状态：{{ reportStatusLabel(report.status) }}</span>
            </div>
            <div class="text-sm leading-6 mb-3">{{ report.reason }}</div>
            <div class="flex flex-wrap gap-2">
              <button class="btn !px-2 !py-1" @click="openPost(report.post_id)">
                <span>查看内容</span>
              </button>
              <button
                v-if="report.type === 'post'"
                class="btn !px-2 !py-1"
                @click="hidePostFromReport(report)"
                :disabled="processingReportId === report.id"
              >
                <span>{{ processingReportId === report.id ? '处理中...' : '隐藏帖子' }}</span>
              </button>
              <button
                v-if="report.type === 'reply' && report.reply_id"
                class="btn btn-danger !px-2 !py-1"
                @click="deleteReplyFromReport(report)"
                :disabled="processingReportId === report.id"
              >
                <span>{{ processingReportId === report.id ? '处理中...' : '删除回复' }}</span>
              </button>
              <button
                class="btn !px-2 !py-1"
                @click="updateReportStatus(report.id, 'resolved')"
                :disabled="processingReportId === report.id || report.status !== 'pending'"
              >
                <span>标记已处理</span>
              </button>
              <button
                class="btn !px-2 !py-1"
                @click="updateReportStatus(report.id, 'dismissed')"
                :disabled="processingReportId === report.id || report.status !== 'pending'"
              >
                <span>忽略</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div class="game-panel min-h-[420px]">
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="text-sm text-accent">帖子列表</p>
            <span class="text-xs text-muted">共 {{ totalPosts }} 条</span>
          </div>

          <div class="flex items-center justify-between gap-3 mb-3 text-[11px] text-muted">
            <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
            <span>每页 {{ pageSize }} 条</span>
          </div>

          <div v-if="loadingPosts" class="text-center text-xs text-muted py-10">帖子加载中...</div>

          <div v-else-if="!posts.length" class="text-center text-xs text-muted py-10 leading-6">
            暂无符合条件的帖子。<br />
            {{ viewer.loggedIn ? '你可以成为第一个发帖的人。' : '登录后可参与互动。' }}
          </div>

          <div v-else class="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
            <button
              v-for="post in posts"
              :key="post.id"
              class="hall-post-item w-full text-left"
              :class="{ 'hall-post-item--active': selectedPostId === post.id }"
              @click="openPost(post.id)"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-sm text-text break-all">{{ post.title }}</span>
                    <span v-if="post.is_official" class="hall-tag hall-tag--featured">官方</span>
                    <span v-if="post.activity_source_label" class="hall-tag hall-tag--pinned">{{ post.activity_source_label }}</span>
                    <span v-if="post.pinned" class="hall-tag hall-tag--pinned">置顶</span>
                    <span v-if="post.featured" class="hall-tag hall-tag--featured">精</span>
                    <span class="hall-tag" :class="post.type === 'help' ? 'hall-tag--help' : 'hall-tag--discussion'">
                      {{ post.type === 'help' ? '求助' : '交流' }}
                    </span>
                    <span v-if="post.solved" class="hall-tag hall-tag--solved">已解决</span>
                    <span v-if="post.reward_enabled && post.reward_amount > 0" class="hall-tag hall-tag--reward">
                      悬赏 {{ post.reward_amount }} 文
                    </span>
                    <span v-if="post.is_mine" class="hall-tag hall-tag--mine">我的</span>
                  </div>
                  <p class="text-xs text-muted leading-6 hall-preview">{{ post.preview }}</p>
                  <p v-if="post.related_route_labels?.length" class="text-[11px] text-accent/80 mt-1">关联路线：{{ post.related_route_labels.join('、') }}</p>
                  <p v-if="post.primary_route_label" class="text-[11px] text-warning mt-1">主路线：{{ post.primary_route_label }}</p>
                  <p v-if="post.weekly_chronicle_week_id" class="text-[11px] text-muted mt-1">周纪行：{{ post.weekly_chronicle_week_id }}</p>
                </div>
                <span class="text-xs text-muted shrink-0">{{ post.reply_count }} 回复</span>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                <span>作者：{{ post.author_display_name }}</span>
                <span>活跃：{{ formatTime(post.last_activity_at) }}</span>
              </div>
            </button>
          </div>
        </div>

        <div class="game-panel min-h-[420px]">
          <div v-if="loadingDetail" class="text-center text-xs text-muted py-12">帖子详情加载中...</div>

          <div v-else-if="!selectedPost" class="text-center text-xs text-muted py-12 leading-6">
            请先从左侧选择一个帖子查看详情。<br />
            你也可以直接发一个新帖开始交流。
          </div>

          <div v-else class="space-y-4">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <span v-if="selectedPost.is_official" class="hall-tag hall-tag--featured">官方</span>
                <span v-if="selectedPost.activity_source_label" class="hall-tag hall-tag--pinned">{{ selectedPost.activity_source_label }}</span>
                <span v-if="selectedPost.pinned" class="hall-tag hall-tag--pinned">置顶</span>
                <span v-if="selectedPost.featured" class="hall-tag hall-tag--featured">精</span>
                <span class="hall-tag" :class="selectedPost.type === 'help' ? 'hall-tag--help' : 'hall-tag--discussion'">
                  {{ selectedPost.type === 'help' ? '求助帖' : '交流帖' }}
                </span>
                <span v-if="selectedPost.solved" class="hall-tag hall-tag--solved">已解决</span>
                <span v-if="selectedPost.reward_enabled && selectedPost.reward_amount > 0" class="hall-tag hall-tag--reward">
                  悬赏 {{ selectedPost.reward_amount }} 文
                </span>
                <span v-if="selectedPost.best_reply_id" class="hall-tag hall-tag--best">最佳回复已选</span>
                <button
                  v-if="selectedPost.viewer_can_solve"
                  class="btn !px-2 !py-1"
                  @click="toggleSolved"
                  :disabled="solvingPost"
                >
                  <CheckCircle2 :size="12" />
                  <span>{{ selectedPost.solved ? '取消已解决' : '标记已解决' }}</span>
                </button>
                <button
                  v-if="selectedPost.viewer_can_delete"
                  class="btn btn-danger !px-2 !py-1"
                  @click="removePost"
                  :disabled="deletingPost"
                >
                  <Trash2 :size="12" />
                  <span>{{ deletingPost ? '删除中...' : '删除帖子' }}</span>
                </button>
                <button
                  v-else-if="viewer.loggedIn"
                  class="btn !px-2 !py-1"
                  @click="reportPost"
                >
                  <span>举报帖子</span>
                </button>
                <button
                  v-if="viewer.isAdmin && !selectedPost.viewer_can_delete"
                  class="btn btn-danger !px-2 !py-1"
                  @click="hideCurrentPost"
                  :disabled="adminHidingPost"
                >
                  <span>{{ adminHidingPost ? '隐藏中...' : '管理员隐藏帖' }}</span>
                </button>
              </div>

              <div>
                <h2 class="text-accent text-base md:text-lg mb-2 break-all">{{ selectedPost.title }}</h2>
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>楼主：{{ selectedPost.author_display_name }}</span>
                  <span>发布时间：{{ formatTime(selectedPost.created_at) }}</span>
                  <span>最后活跃：{{ formatTime(selectedPost.last_activity_at) }}</span>
                  <span v-if="selectedPost.reward_enabled && selectedPost.reward_amount > 0">悬赏状态：{{ rewardStatusText(selectedPost.reward_status) }}</span>
                </div>
                <p v-if="selectedPost.related_route_labels?.length" class="text-[11px] text-accent/80 mt-1">
                  关联路线：{{ selectedPost.related_route_labels.join('、') }}
                </p>
                <p v-if="selectedPost.primary_route_label" class="text-[11px] text-warning mt-1">
                  本周主路线：{{ selectedPost.primary_route_label }}
                  <span v-if="selectedPost.secondary_route_labels?.length"> · 辅助：{{ selectedPost.secondary_route_labels.join('、') }}</span>
                </p>
                <p v-if="selectedPost.claimable_node_labels?.length" class="text-[11px] text-muted mt-1">
                  当前可领：{{ selectedPost.claimable_node_labels.join('、') }}
                </p>
                <p v-if="selectedPost.next_week_prep_summary" class="text-[11px] text-muted mt-1">
                  下周准备：{{ selectedPost.next_week_prep_summary }}
                </p>
                <p v-if="selectedPost.weekly_chronicle_week_id" class="text-[11px] text-accent/80 mt-1">
                  周纪行来源：{{ selectedPost.weekly_chronicle_week_id }}
                  <span v-if="selectedPost.chronicle_source_labels?.length"> · {{ selectedPost.chronicle_source_labels.join('、') }}</span>
                </p>
              </div>

              <div
                v-if="selectedPost.reward_enabled && selectedPost.reward_amount > 0"
                class="border border-accent/25 rounded-xs px-3 py-2 bg-accent/5 text-xs leading-6"
              >
                <span class="text-accent">求助悬赏：</span>
                当前悬赏 <span class="text-text">{{ selectedPost.reward_amount }} 文</span>。
                <span v-if="selectedPost.reward_status === 'paid' && selectedPost.reward_paid_to" class="text-muted">
                  已发放给 {{ selectedPost.reward_paid_to }}，时间：{{ formatTime(selectedPost.reward_paid_at || 0) }}。
                </span>
                <span v-else class="text-muted">结帖后状态会变为已关闭。</span>
              </div>

              <div class="border border-accent/15 rounded-xs px-3 py-3 bg-bg/20 space-y-3">
                <template v-for="block in selectedPost.blocks" :key="block.id">
                  <div v-if="block.type === 'text'" class="hall-content text-sm leading-7 text-text">
                    {{ block.text }}
                  </div>
                  <div v-else class="space-y-2">
                    <img
                      :src="block.url"
                      :alt="block.alt || '帖子图片'"
                      class="hall-image"
                      @click="openImage(block.url)"
                    />
                    <p v-if="block.alt" class="text-[11px] text-muted">{{ block.alt }}</p>
                  </div>
                </template>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                class="btn !px-2 !py-1"
                :class="{ 'btn-active': selectedPost.viewer_liked }"
                :disabled="!!likingPostId || !!dislikingPostId"
                @click="likePost"
              >
                <span>👍 {{ selectedPost.like_count ?? 0 }}</span>
              </button>
              <button
                class="btn !px-2 !py-1"
                :class="{ 'btn-active': selectedPost.viewer_disliked }"
                :disabled="!!likingPostId || !!dislikingPostId"
                @click="dislikePost"
              >
                <span>👎 {{ selectedPost.dislike_count ?? 0 }}</span>
              </button>
              <template v-if="viewer.isAdmin">
                <button class="btn !px-2 !py-1" :disabled="pinningPost" @click="togglePin">
                  <span>{{ selectedPost.pinned ? '取消置顶' : '置顶' }}</span>
                </button>
                <button class="btn !px-2 !py-1" :disabled="featuringPost" @click="toggleFeature">
                  <span>{{ selectedPost.featured ? '取消加精' : '加精' }}</span>
                </button>
              </template>
            </div>

            <div>
              <Divider :label="`回复（${selectedPost.replies.length}）`" />

              <div v-if="!selectedPost.replies.length" class="text-xs text-muted py-4">暂无回复，快来参与讨论吧。</div>

              <div v-else class="space-y-3 max-h-[34vh] overflow-y-auto pr-1">
                <div v-for="reply in orderedReplies" :key="reply.id" class="border border-accent/15 rounded-xs px-3 py-3 bg-bg/15">
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted mb-2">
                    <span>{{ reply.author_display_name }}</span>
                    <span>{{ formatTime(reply.created_at) }}</span>
                    <span v-if="reply.is_mine" class="text-accent">我的回复</span>
                    <span v-if="reply.is_best" class="text-warning">最佳回复</span>
                  </div>
                  <div v-if="reply.reply_to_excerpt" class="mb-2 rounded-xs border border-accent/10 bg-black/10 px-2 py-1 text-[11px] text-muted">
                    回复 @{{ reply.reply_to_author_display_name || '匿名' }}：{{ reply.reply_to_excerpt }}
                  </div>
                  <div class="hall-content text-sm leading-7">{{ reply.content }}</div>
                  <div class="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      class="btn !px-2 !py-1"
                      :class="{ 'btn-active': reply.viewer_liked }"
                      :disabled="likingReplyId === reply.id"
                      @click="likeReply(reply.id)"
                    >
                      <span>👍 {{ reply.like_count ?? 0 }}</span>
                    </button>
                    <button class="btn !px-2 !py-1" @click="setReplyTarget(reply)">
                      <span>引用回复</span>
                    </button>
                    <button v-if="viewer.loggedIn && !reply.is_mine" class="btn !px-2 !py-1" @click="reportReply(reply.id)">
                      <span>举报</span>
                    </button>
                    <button
                      v-if="viewer.isAdmin"
                      class="btn btn-danger !px-2 !py-1"
                      @click="adminDeleteReply(reply.id)"
                      :disabled="deletingReplyId === reply.id"
                    >
                      <span>{{ deletingReplyId === reply.id ? '删除中...' : '管理员删回复' }}</span>
                    </button>
                    <button v-if="selectedPost.viewer_can_pick_best && !reply.is_best && reply.author !== selectedPost.author" class="btn !px-2 !py-1" @click="pickBestReply(reply.id)" :disabled="pickingBestReplyId === reply.id">
                      <CheckCircle2 :size="12" />
                      <span>{{ pickingBestReplyId === reply.id ? '发放中...' : '设为最佳回复并发悬赏' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Divider label="发表回复" />
              <div v-if="replyTarget" class="rounded-xs border border-accent/15 bg-accent/5 px-3 py-2 text-xs">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-accent">正在回复 @{{ replyTarget.author_display_name }}</span>
                  <button class="text-muted hover:text-text" @click="clearReplyTarget">取消</button>
                </div>
                <div class="mt-1 text-muted line-clamp-2">{{ replyTarget.content }}</div>
              </div>
              <textarea
                v-model="replyContent"
                rows="4"
                maxlength="1000"
                placeholder="写下你的想法、经验或建议..."
                class="hall-textarea"
              />
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-xs text-muted">
                  {{ viewer.loggedIn ? '回复后会立即显示在帖子下方。' : '请先登录游戏账号后再回复。' }}
                </p>
                <button class="btn" @click="submitReply" :disabled="replying || !selectedPost">
                  <Send :size="14" />
                  <span>{{ replying ? '发送中...' : '发送回复' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="panel-fade">
      <div v-if="showComposer" class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4" @click.self="showComposer = false">
        <div class="game-panel w-full max-w-2xl">
          <div class="flex items-center justify-between gap-3 mb-4">
            <p class="text-sm text-accent flex items-center gap-2">
              <SquarePen :size="14" />
              发布新帖子
            </p>
            <button class="text-muted hover:text-text" @click="showComposer = false">
              <X :size="14" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-xs text-muted mb-1 block">帖子类型</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="item in postTypeOptions"
                  :key="item.value"
                  class="hall-chip"
                  :class="{ 'hall-chip--active': composer.type === item.value }"
                  @click="composer.type = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div>
              <label class="text-xs text-muted mb-1 block">快捷模板</label>
              <div class="flex flex-wrap gap-2">
                <button class="hall-chip" @click="applyComposerTemplate('player_help_template')">玩家求助模板</button>
                <button v-if="viewer.isAdmin" class="hall-chip" @click="applyComposerTemplate('event_announcement')">活动公告模板</button>
                <button v-if="viewer.isAdmin" class="hall-chip" @click="applyComposerTemplate('showcase_wrapup')">收尾展示模板</button>
              </div>
            </div>

            <div>
              <label class="text-xs text-muted mb-1 block">标题</label>
              <input
                v-model="composer.title"
                type="text"
                maxlength="60"
                placeholder="请输入标题，建议概括主题或问题"
                class="hall-input"
              />
            </div>

            <div v-if="composer.type === 'help'">
              <label class="text-xs text-muted mb-1 block">求助悬赏（可选）</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="composer.rewardAmount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="不填或 0 表示无悬赏"
                  class="hall-input"
                />
                <span class="text-xs text-muted shrink-0">文</span>
              </div>
              <p class="text-[11px] text-muted mt-1">适合帖子量较大时吸引更多人优先帮助你。</p>
            </div>

            <div>
              <label class="text-xs text-muted mb-2 block">正文内容块</label>
              <p class="text-xs text-muted mb-3">支持像朋友圈一样在文字中间插图，图片会在阅读帖子时直接显示。</p>
              <div class="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                <div v-for="(block, index) in composerBlocks" :key="block.id" class="border border-accent/15 rounded-xs p-3 bg-bg/15 space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs text-muted">
                      {{ block.type === 'text' ? `文字段 ${index + 1}` : `图片段 ${index + 1}` }}
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <button class="btn !px-2 !py-1" @click="moveBlock(index, -1)" :disabled="index === 0">
                        <ArrowUp :size="12" />
                        <span>上移</span>
                      </button>
                      <button class="btn !px-2 !py-1" @click="moveBlock(index, 1)" :disabled="index === composerBlocks.length - 1">
                        <ArrowDown :size="12" />
                        <span>下移</span>
                      </button>
                      <button class="btn !px-2 !py-1" @click="addTextBlock(index)">
                        <SquarePen :size="12" />
                        <span>后面加文字</span>
                      </button>
                      <button class="btn !px-2 !py-1" @click="triggerInsertImage(index)">
                        <Upload :size="12" />
                        <span>后面插图</span>
                      </button>
                      <button class="btn btn-danger !px-2 !py-1" @click="removeBlock(index)">
                        <Trash2 :size="12" />
                        <span>删除</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    v-if="block.type === 'text'"
                    v-model="block.text"
                    rows="5"
                    maxlength="5000"
                    placeholder="输入这一段文字内容..."
                    class="hall-textarea"
                  />

                  <div v-else class="space-y-2">
                    <img :src="block.url" :alt="block.alt || '插图'" class="hall-image" />
                    <div class="text-[11px] text-muted break-all">{{ block.alt || '图片' }}</div>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 mt-3">
                <button class="btn" @click="addTextBlock()">
                  <SquarePen :size="14" />
                  <span>新增文字段</span>
                </button>
                <button class="btn" @click="triggerInsertImage()" :disabled="uploadingImage">
                  <Upload :size="14" />
                  <span>{{ uploadingImage ? '上传中...' : '插入图片' }}</span>
                </button>
                <input ref="imageInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleImageSelected" />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted">发帖后所有访客都可以浏览，登录用户可以回复。</p>
              <div class="flex gap-2">
                <button class="btn" @click="showComposer = false">取消</button>
                <button class="btn" @click="submitPost" :disabled="submittingPost">
                  <SquarePen :size="14" />
                  <span>{{ submittingPost ? '发布中...' : '确认发布' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div class="game-panel">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p class="text-xs text-muted">帖子较多时建议优先使用：关键词搜索 + 高悬赏排序 + 我的视图。</p>
        <div class="flex flex-wrap gap-2">
          <button class="btn" @click="changePage(-1)" :disabled="currentPage <= 1 || loadingPosts">
            <ArrowLeft :size="14" />
            <span>上一页</span>
          </button>
          <button class="btn" @click="changePage(1)" :disabled="!hasMorePosts || loadingPosts">
            <span>下一页</span>
            <ArrowRight :size="14" />
          </button>
        </div>
      </div>
    </div>

    <button class="hall-fab md:hidden" @click="openComposer">
      <SquarePen :size="18" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, MessagesSquare, RefreshCw, Search, Send, SquarePen, Trash2, Upload, X } from 'lucide-vue-next'
  import Divider from '@/components/game/Divider.vue'
  import { showFloat } from '@/composables/useGameLog'
  import { Capacitor } from '@capacitor/core'
  import {
    createHallPost,
    createHallReply,
    deleteHallReplyByAdmin,
    deleteHallPost,
    fetchHallPostDetail,
    fetchHallAdminReports,
    fetchHallPosts,
    fetchHallViewer,
    hideHallPostByAdmin,
    reportHallPost,
    reportHallReply,
    selectHallBestReply,
    solveHallPost,
    updateHallAdminReportStatus,
    uploadHallImage,
    likeHallPost,
    dislikeHallPost,
    likeHallReply,
    pinHallPost,
    featureHallPost,
  } from '@/utils/taoyuanHallApi'
  import type { HallAdminReport, HallCategory, HallContentBlock, HallMineFilter, HallPostDetail, HallPostSummary, HallPostType, HallSort, HallViewer } from '@/types'
  import { useGoalStore } from '@/stores/useGoalStore'

  const router = useRouter()
  const route = useRoute()
  const goalStore = useGoalStore()

  const viewer = ref<HallViewer>({ loggedIn: false, username: null, displayName: null })
  const viewerStatus = ref<'ready' | 'unavailable'>('ready')
  const posts = ref<HallPostSummary[]>([])
  const selectedPost = ref<HallPostDetail | null>(null)
  const selectedPostId = ref<string | null>(null)
  const detailRequestId = ref(0)

  const loadingViewer = ref(false)
  const loadingPosts = ref(false)
  const loadingDetail = ref(false)
  const submittingPost = ref(false)
  const replying = ref(false)
  const solvingPost = ref(false)
  const deletingPost = ref(false)
  const uploadingImage = ref(false)
  const pickingBestReplyId = ref<string | null>(null)
  const adminHidingPost = ref(false)
  const deletingReplyId = ref<string | null>(null)
  const loadingAdminReports = ref(false)
  const showAdminReports = ref(false)
  const processingReportId = ref<string | null>(null)
  const adminReports = ref<HallAdminReport[]>([])

  const category = ref<HallCategory>('all')
  const sortBy = ref<HallSort>('latest')
  const mineFilter = ref<HallMineFilter>('all')
  const keyword = ref('')
  const keywordInput = ref('')
  const currentActivityOnly = ref(false)
  const currentPage = ref(1)
  const pageSize = 20
  const totalPosts = ref(0)
  const hasMorePosts = ref(false)
  const replyContent = ref('')
  const replyTarget = ref<HallPostDetail['replies'][number] | null>(null)
  const showComposer = ref(false)
  const composer = reactive<{ title: string; type: HallPostType; rewardAmount: number }>({
    title: '',
    type: 'discussion',
    rewardAmount: 0,
  })
  const composerBlocks = ref<HallContentBlock[]>([])
  const composerMeta = reactive<{
    isOfficial: boolean
    officialTemplateType: 'event_announcement' | 'player_help_template' | 'showcase_wrapup' | null
    activitySourceId: string | null
    activitySourceLabel: string | null
    relatedRouteLabels: string[]
    weeklyPlanId: string | null
    primaryRouteLabel: string | null
    secondaryRouteLabels: string[]
    claimableNodeLabels: string[]
    nextWeekPrepSummary: string | null
    weeklyChronicleWeekId: string | null
    chronicleSourceLabels: string[]
  }>({
    isOfficial: false,
    officialTemplateType: null,
    activitySourceId: null,
    activitySourceLabel: null,
    relatedRouteLabels: [],
    weeklyPlanId: null,
    primaryRouteLabel: null,
    secondaryRouteLabels: [],
    claimableNodeLabels: [],
    nextWeekPrepSummary: null,
    weeklyChronicleWeekId: null,
    chronicleSourceLabels: [],
  })
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const pendingInsertIndex = ref<number | null>(null)

  const categoryOptions: Array<{ value: HallCategory; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'discussion', label: '只看交流' },
    { value: 'help', label: '只看求助' },
    { value: 'solved', label: '只看已解决' },
  ]

  const sortOptions: Array<{ value: HallSort; label: string }> = [
    { value: 'latest', label: '最新' },
    { value: 'hot', label: '最热' },
    { value: 'reward', label: '高悬赏' },
  ]

  const totalPages = computed(() => Math.max(1, Math.ceil(totalPosts.value / pageSize)))
  const toolbarMenu = ref<null | 'category' | 'sort' | 'mine'>(null)
  const orderedReplies = computed(() => {
    if (!selectedPost.value) return []
    return [...selectedPost.value.replies].sort((a, b) => {
      if (!!a.is_best !== !!b.is_best) return a.is_best ? -1 : 1
      return (a.created_at || 0) - (b.created_at || 0)
    })
  })
  const pendingReportsCount = computed(() => adminReports.value.filter(item => item.status === 'pending').length)

  const mineOptions: Array<{ value: HallMineFilter; label: string }> = [
    { value: 'all', label: '全部帖子' },
    { value: 'posts', label: '我发布的' },
    { value: 'replies', label: '我回复的' },
    { value: 'help', label: '我的求助' },
  ]

  const postTypeOptions: Array<{ value: HallPostType; label: string }> = [
    { value: 'discussion', label: '交流帖' },
    { value: 'help', label: '求助帖' },
  ]

  const selectedCategoryLabel = computed(() => categoryOptions.find(item => item.value === category.value)?.label || '全部')
  const selectedSortLabel = computed(() => sortOptions.find(item => item.value === sortBy.value)?.label || '最新')
  const selectedMineLabel = computed(() => mineOptions.find(item => item.value === mineFilter.value)?.label || '全部帖子')

  const weeklyPlanSnapshot = computed(() => goalStore.weeklyPlanSnapshot)
  const latestWeeklyChronicle = computed(() => goalStore.latestWeeklyChronicleEntry)
  const currentActivitySourceId = computed(() => goalStore.currentEventCampaign?.id ?? '')
  const currentActivityLabel = computed(() => goalStore.currentEventCampaign?.label ?? '当前活动')

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '--'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const createTempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const createTextBlock = (text = ''): HallContentBlock => ({ id: createTempId(), type: 'text', text })

  const resetComposer = () => {
    composer.title = ''
    composer.type = 'discussion'
    composer.rewardAmount = 0
    composerBlocks.value = [createTextBlock()]
    composerMeta.isOfficial = false
    composerMeta.officialTemplateType = null
    composerMeta.activitySourceId = null
    composerMeta.activitySourceLabel = null
    composerMeta.relatedRouteLabels = []
    composerMeta.weeklyPlanId = null
    composerMeta.primaryRouteLabel = null
    composerMeta.secondaryRouteLabels = []
    composerMeta.claimableNodeLabels = []
    composerMeta.nextWeekPrepSummary = null
    composerMeta.weeklyChronicleWeekId = null
    composerMeta.chronicleSourceLabels = []
    pendingInsertIndex.value = null
  }

  const applyComposerTemplate = (templateType: 'event_announcement' | 'player_help_template' | 'showcase_wrapup') => {
    const currentCampaign = goalStore.currentEventCampaign
    const nextThemeWeek = goalStore.nextThemeWeekPreview
    const titlePrefix = currentCampaign?.label ?? currentActivityLabel.value
    const currentPlan = weeklyPlanSnapshot.value
    const latestChronicle = latestWeeklyChronicle.value
    if (templateType === 'event_announcement') {
      composer.type = 'discussion'
      composer.title = `${titlePrefix} · 活动公告`
      composerBlocks.value = [
        createTextBlock(`【本周开启】${currentCampaign?.label ?? '当前活动'}\n\n本周主路线是「${currentPlan.primaryRouteLabel}」，辅助路线为「${currentPlan.secondaryRouteLabels.join('、') || '当前优先跟主路线'}」。`),
        createTextBlock(`【本周节奏】\n1. 先看 TopGoals / Quest\n2. 当前可领奖点：${currentPlan.claimableNodeLabels.join('、') || '暂无额外领奖点'}\n3. 下周准备：${currentPlan.nextWeekPrepSummary}`),
      ]
      composerMeta.isOfficial = viewer.value.isAdmin === true
      composerMeta.officialTemplateType = 'event_announcement'
      composerMeta.activitySourceId = currentCampaign?.id ?? null
      composerMeta.activitySourceLabel = currentCampaign?.label ?? null
      composerMeta.relatedRouteLabels = [...(currentCampaign?.linkedRouteLabels ?? [])]
      composerMeta.weeklyPlanId = currentPlan.planId
      composerMeta.primaryRouteLabel = currentPlan.primaryRouteLabel
      composerMeta.secondaryRouteLabels = [...currentPlan.secondaryRouteLabels]
      composerMeta.claimableNodeLabels = [...currentPlan.claimableNodeLabels]
      composerMeta.nextWeekPrepSummary = currentPlan.nextWeekPrepSummary
      composerMeta.weeklyChronicleWeekId = null
      composerMeta.chronicleSourceLabels = []
      return
    }
    if (templateType === 'showcase_wrapup') {
      composer.type = 'discussion'
      composer.title = `${titlePrefix} · 收尾展示`
      composerBlocks.value = [
        createTextBlock(`【本周收尾】${latestChronicle ? latestChronicle.settlementSummary : `欢迎分享你在${currentCampaign?.label ?? '当前活动'}中的高光成果、领奖情况和最推荐的路线。`}`),
        createTextBlock(`【高光与下周】${latestChronicle?.highlightSummaries.join('；') || '可围绕本周主路线、领奖点和活动展示来收尾。'}\n\n下周预告：${currentPlan.nextWeekPrepSummary || (nextThemeWeek ? `${nextThemeWeek.name} 即将到来，可提前准备相关物资与样本。` : '下周主题周预告尚未生成。')}`),
      ]
      composerMeta.isOfficial = viewer.value.isAdmin === true
      composerMeta.officialTemplateType = 'showcase_wrapup'
      composerMeta.activitySourceId = currentCampaign?.id ?? null
      composerMeta.activitySourceLabel = currentCampaign?.label ?? null
      composerMeta.relatedRouteLabels = [...(currentCampaign?.linkedRouteLabels ?? [])]
      composerMeta.weeklyPlanId = currentPlan.planId
      composerMeta.primaryRouteLabel = currentPlan.primaryRouteLabel
      composerMeta.secondaryRouteLabels = [...currentPlan.secondaryRouteLabels]
      composerMeta.claimableNodeLabels = [...currentPlan.claimableNodeLabels]
      composerMeta.nextWeekPrepSummary = currentPlan.nextWeekPrepSummary
      composerMeta.weeklyChronicleWeekId = latestChronicle?.weekId ?? null
      composerMeta.chronicleSourceLabels = [...(latestChronicle?.highlightSummaries ?? [])]
      return
    }
    composer.type = 'help'
    composer.title = `${titlePrefix} · 玩家求助`
    composer.rewardAmount = 0
    composerBlocks.value = [
      createTextBlock(`【我当前卡住的点】\n请描述你在本周主路线「${currentPlan.primaryRouteLabel}」里卡住的是报名、领奖、供货、展陈还是路线选择。`),
      createTextBlock(`【我已经试过的做法】\n可补充你已经看过的辅助路线（${currentPlan.secondaryRouteLabels.join('、') || '暂无'}）、可领奖点（${currentPlan.claimableNodeLabels.join('、') || '暂无'}）和仍然没接上的地方。`),
    ]
    composerMeta.isOfficial = false
    composerMeta.officialTemplateType = 'player_help_template'
    composerMeta.activitySourceId = currentCampaign?.id ?? null
    composerMeta.activitySourceLabel = currentCampaign?.label ?? null
    composerMeta.relatedRouteLabels = [...(currentCampaign?.linkedRouteLabels ?? [])]
    composerMeta.weeklyPlanId = currentPlan.planId
    composerMeta.primaryRouteLabel = currentPlan.primaryRouteLabel
    composerMeta.secondaryRouteLabels = [...currentPlan.secondaryRouteLabels]
    composerMeta.claimableNodeLabels = [...currentPlan.claimableNodeLabels]
    composerMeta.nextWeekPrepSummary = currentPlan.nextWeekPrepSummary
    composerMeta.weeklyChronicleWeekId = null
    composerMeta.chronicleSourceLabels = []
  }

  const rewardStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return '进行中'
      case 'closed':
        return '已关闭'
      case 'paid':
        return '已发放'
      default:
        return '无悬赏'
    }
  }

  const reportStatusLabel = (status: HallAdminReport['status']) => {
    switch (status) {
      case 'resolved':
        return '已处理'
      case 'dismissed':
        return '已忽略'
      default:
        return '待处理'
    }
  }

  const syncPostQuery = async (postId: string | null) => {
    if (postId) {
      await router.replace({ path: '/hall', query: { post: postId } })
    } else {
      await router.replace({ path: '/hall' })
    }
  }

  const loadViewer = async () => {
    loadingViewer.value = true
    try {
      viewer.value = await fetchHallViewer()
      viewerStatus.value = 'ready'
    } catch (error) {
      viewerStatus.value = 'unavailable'
      showFloat(error instanceof Error ? error.message : '交流大厅连接失败，请检查网络后再试', 'danger')
    } finally {
      loadingViewer.value = false
    }
  }

  const loadPosts = async () => {
    if (mineFilter.value !== 'all' && !viewer.value.loggedIn) {
      mineFilter.value = 'all'
      return
    }
    loadingPosts.value = true
    try {
      const result = await fetchHallPosts({
        category: category.value,
        sort: sortBy.value,
        mine: mineFilter.value,
        keyword: keyword.value,
        activitySourceId: currentActivityOnly.value && currentActivitySourceId.value ? currentActivitySourceId.value : '',
        page: currentPage.value,
        pageSize,
      })
      posts.value = result.posts
      totalPosts.value = result.total
      hasMorePosts.value = result.has_more
      currentPage.value = result.page
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '获取帖子列表失败', 'danger')
      posts.value = []
      totalPosts.value = 0
      hasMorePosts.value = false
    } finally {
      loadingPosts.value = false
    }
  }

  const loadDetail = async (postId: string) => {
    const activeRequestId = ++detailRequestId.value
    loadingDetail.value = true
    try {
      const detail = await fetchHallPostDetail(postId)
      if (activeRequestId !== detailRequestId.value || selectedPostId.value !== postId) return
      selectedPost.value = detail
      selectedPostId.value = postId
    } catch (error) {
      if (activeRequestId !== detailRequestId.value || selectedPostId.value !== postId) return
      selectedPost.value = null
      showFloat(error instanceof Error ? error.message : '获取帖子详情失败', 'danger')
    } finally {
      if (activeRequestId === detailRequestId.value) {
        loadingDetail.value = false
      }
    }
  }

  const refreshAll = async () => {
    await loadViewer()
    await loadPosts()
    if (viewer.value.isAdmin && showAdminReports.value) {
      await loadAdminReports()
    }
    if (selectedPostId.value) {
      await loadDetail(selectedPostId.value)
    }
  }

  const openPost = async (postId: string) => {
    selectedPostId.value = postId
    await syncPostQuery(postId)
    await loadDetail(postId)
  }

  const goBack = () => {
    void router.push('/')
  }

  const openImage = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const applyKeywordSearch = () => {
    keyword.value = keywordInput.value.trim()
    currentPage.value = 1
    void loadPosts()
  }

  const resetKeywordSearch = () => {
    keywordInput.value = ''
    keyword.value = ''
    currentPage.value = 1
    void loadPosts()
  }

  const changePage = (offset: number) => {
    const nextPage = currentPage.value + offset
    if (nextPage < 1) return
    if (offset > 0 && !hasMorePosts.value) return
    currentPage.value = nextPage
    void loadPosts()
  }

  const removePost = async () => {
    if (!selectedPost.value) return
    if (!window.confirm('确定删除这个帖子吗？如果悬赏尚未发放，将自动退回桃源铜钱。')) return
    deletingPost.value = true
    try {
      await deleteHallPost(selectedPost.value.id)
      showFloat('帖子已删除', 'success')
      selectedPost.value = null
      selectedPostId.value = null
      await syncPostQuery(null)
      await loadPosts()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '删除帖子失败', 'danger')
    } finally {
      deletingPost.value = false
    }
  }

  const loadAdminReports = async () => {
    if (!viewer.value.isAdmin) return
    loadingAdminReports.value = true
    try {
      adminReports.value = await fetchHallAdminReports()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '获取举报列表失败', 'danger')
    } finally {
      loadingAdminReports.value = false
    }
  }

  const toggleAdminReports = async () => {
    showAdminReports.value = !showAdminReports.value
    if (showAdminReports.value) {
      await loadAdminReports()
    }
  }

  const updateReportStatus = async (reportId: string, status: 'dismissed' | 'resolved') => {
    processingReportId.value = reportId
    try {
      await updateHallAdminReportStatus(reportId, status)
      await loadAdminReports()
      showFloat(status === 'resolved' ? '举报已标记为已处理' : '举报已忽略', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '更新举报状态失败', 'danger')
    } finally {
      processingReportId.value = null
    }
  }

  const hideCurrentPost = async () => {
    if (!selectedPost.value) return
    const reason = window.prompt('请输入隐藏原因（可选）')?.trim() || ''
    adminHidingPost.value = true
    try {
      await hideHallPostByAdmin(selectedPost.value.id, true, reason)
      showFloat('帖子已隐藏', 'success')
      selectedPost.value = null
      selectedPostId.value = null
      await syncPostQuery(null)
      await loadPosts()
      if (showAdminReports.value) await loadAdminReports()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '隐藏帖子失败', 'danger')
    } finally {
      adminHidingPost.value = false
    }
  }

  const adminDeleteReply = async (replyId: string) => {
    if (!selectedPost.value) return
    if (!window.confirm('确定删除这条回复吗？')) return
    deletingReplyId.value = replyId
    try {
      const updated = await deleteHallReplyByAdmin(selectedPost.value.id, replyId)
      selectedPost.value = updated
      await loadPosts()
      if (showAdminReports.value) await loadAdminReports()
      showFloat('回复已删除', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '删除回复失败', 'danger')
    } finally {
      deletingReplyId.value = null
    }
  }

  const hidePostFromReport = async (report: HallAdminReport) => {
    processingReportId.value = report.id
    try {
      await hideHallPostByAdmin(report.post_id, true, report.reason)
      await updateHallAdminReportStatus(report.id, 'resolved')
      await loadAdminReports()
      await loadPosts()
      if (selectedPost.value?.id === report.post_id) {
        selectedPost.value = null
        selectedPostId.value = null
        await syncPostQuery(null)
      }
      showFloat('帖子已隐藏并处理举报', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '处理举报失败', 'danger')
    } finally {
      processingReportId.value = null
    }
  }

  const deleteReplyFromReport = async (report: HallAdminReport) => {
    if (!report.reply_id) return
    processingReportId.value = report.id
    try {
      const updated = await deleteHallReplyByAdmin(report.post_id, report.reply_id)
      if (selectedPost.value?.id === report.post_id) {
        selectedPost.value = updated
      }
      await updateHallAdminReportStatus(report.id, 'resolved')
      await loadAdminReports()
      await loadPosts()
      showFloat('回复已删除并处理举报', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '处理举报失败', 'danger')
    } finally {
      processingReportId.value = null
    }
  }

  const setReplyTarget = (reply: HallPostDetail['replies'][number]) => {
    replyTarget.value = reply
  }

  const clearReplyTarget = () => {
    replyTarget.value = null
  }

  const reportPost = async () => {
    if (!selectedPost.value) return
    if (!(await ensureLoggedInForInteraction())) return
    const reason = window.prompt('请输入举报原因（至少 2 个字）')?.trim() || ''
    if (!reason) return
    try {
      await reportHallPost(selectedPost.value.id, reason)
      showFloat('举报已提交', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '举报帖子失败', 'danger')
    }
  }

  const reportReply = async (replyId: string) => {
    if (!selectedPost.value) return
    if (!(await ensureLoggedInForInteraction())) return
    const reason = window.prompt('请输入举报原因（至少 2 个字）')?.trim() || ''
    if (!reason) return
    try {
      await reportHallReply(selectedPost.value.id, replyId, reason)
      showFloat('举报已提交', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '举报回复失败', 'danger')
    }
  }

  const pickBestReply = async (replyId: string) => {
    if (!selectedPost.value) return
    pickingBestReplyId.value = replyId
    try {
      const updated = await selectHallBestReply(selectedPost.value.id, replyId)
      selectedPost.value = updated
      showFloat('已设置最佳回复并完成悬赏发放', 'success')
      await loadPosts()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '设置最佳回复失败', 'danger')
    } finally {
      pickingBestReplyId.value = null
    }
  }

  const ensureLoggedInForInteraction = async () => {
    await loadViewer()
    if (viewerStatus.value === 'unavailable') {
      return false
    }
    if (!viewer.value.loggedIn) {
      showFloat('请先登录游戏账号后再互动', 'danger')
      return false
    }
    return true
  }

  const openComposer = async () => {
    if (!(await ensureLoggedInForInteraction())) return
    if (!composerBlocks.value.length) resetComposer()
    showComposer.value = true
  }

  const addTextBlock = (afterIndex?: number) => {
    const block = createTextBlock()
    if (typeof afterIndex === 'number' && afterIndex >= 0) {
      composerBlocks.value.splice(afterIndex + 1, 0, block)
    } else {
      composerBlocks.value.push(block)
    }
  }

  const moveBlock = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= composerBlocks.value.length) return
    const next = [...composerBlocks.value]
    const item = next[index]
    if (!item) return
    next.splice(index, 1)
    next.splice(target, 0, item)
    composerBlocks.value = next
  }

  const removeBlock = (index: number) => {
    composerBlocks.value.splice(index, 1)
    if (!composerBlocks.value.length) {
      composerBlocks.value = [createTextBlock()]
    }
  }

  const triggerInsertImage = (afterIndex?: number) => {
    pendingInsertIndex.value = typeof afterIndex === 'number' ? afterIndex : composerBlocks.value.length - 1
    imageInputRef.value?.click()
  }

  const handleImageSelected = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!(await ensureLoggedInForInteraction())) return
    if (file.size > 5 * 1024 * 1024) {
      showFloat('单张图片不能超过 5MB', 'danger')
      return
    }

    uploadingImage.value = true
    try {
      const uploaded = await uploadHallImage(file)
      const insertAt = pendingInsertIndex.value !== null ? pendingInsertIndex.value + 1 : composerBlocks.value.length
      composerBlocks.value.splice(insertAt, 0, {
        id: createTempId(),
        type: 'image',
        url: uploaded.url,
        alt: uploaded.alt,
      })
      const nextBlock = composerBlocks.value[insertAt + 1]
      if (!nextBlock || nextBlock.type !== 'text') {
        composerBlocks.value.splice(insertAt + 1, 0, createTextBlock())
      }
      showFloat('图片上传成功', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '上传图片失败', 'danger')
    } finally {
      uploadingImage.value = false
      pendingInsertIndex.value = null
    }
  }

  const submitPost = async () => {
    if (!(await ensureLoggedInForInteraction())) return
    if (uploadingImage.value) {
      showFloat('请等待图片上传完成后再发布。', 'danger')
      return
    }
    if (!composer.title.trim()) {
      showFloat('请输入帖子标题', 'danger')
      return
    }
    const hasMeaningfulBlock = composerBlocks.value.some(block => block.type === 'image' || (block.type === 'text' && block.text.trim()))
    if (!hasMeaningfulBlock) {
      showFloat('请至少填写一段文字或上传一张图片', 'danger')
      return
    }

    submittingPost.value = true
    try {
      const created = await createHallPost({
        title: composer.title,
        blocks: composerBlocks.value,
        type: composer.type,
        rewardAmount: composer.type === 'help' ? composer.rewardAmount : 0,
        isOfficial: composerMeta.isOfficial,
        officialTemplateType: composerMeta.officialTemplateType,
        activitySourceId: composerMeta.activitySourceId ?? goalStore.currentEventCampaign?.id ?? null,
        activitySourceLabel: composerMeta.activitySourceLabel ?? goalStore.currentEventCampaign?.label ?? null,
        relatedRouteLabels: composerMeta.relatedRouteLabels.length > 0
          ? composerMeta.relatedRouteLabels
          : [...(goalStore.currentEventCampaign?.linkedRouteLabels ?? [])],
        weeklyPlanId: composerMeta.weeklyPlanId ?? weeklyPlanSnapshot.value.planId,
        primaryRouteLabel: composerMeta.primaryRouteLabel ?? weeklyPlanSnapshot.value.primaryRouteLabel,
        secondaryRouteLabels: composerMeta.secondaryRouteLabels.length > 0
          ? composerMeta.secondaryRouteLabels
          : [...weeklyPlanSnapshot.value.secondaryRouteLabels],
        claimableNodeLabels: composerMeta.claimableNodeLabels.length > 0
          ? composerMeta.claimableNodeLabels
          : [...weeklyPlanSnapshot.value.claimableNodeLabels],
        nextWeekPrepSummary: composerMeta.nextWeekPrepSummary ?? weeklyPlanSnapshot.value.nextWeekPrepSummary,
        weeklyChronicleWeekId: composerMeta.weeklyChronicleWeekId ?? latestWeeklyChronicle.value?.weekId ?? null,
        chronicleSourceLabels: composerMeta.chronicleSourceLabels.length > 0
          ? composerMeta.chronicleSourceLabels
          : [...(latestWeeklyChronicle.value?.highlightSummaries ?? [])],
      })
      resetComposer()
      showComposer.value = false
      showFloat('帖子发布成功', 'success')
      currentPage.value = 1
      await loadPosts()
      await openPost(created.id)
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '发帖失败', 'danger')
    } finally {
      submittingPost.value = false
    }
  }

  const submitReply = async () => {
    if (!selectedPost.value) return
    if (!(await ensureLoggedInForInteraction())) return
    if (!replyContent.value.trim()) {
      showFloat('请输入回复内容', 'danger')
      return
    }

    replying.value = true
    try {
      const updated = await createHallReply(selectedPost.value.id, replyContent.value, replyTarget.value?.id)
      replyContent.value = ''
      replyTarget.value = null
      selectedPost.value = updated
      showFloat('回复已发送', 'success')
      await loadPosts()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '回复失败', 'danger')
    } finally {
      replying.value = false
    }
  }

  const toggleSolved = async () => {
    if (!selectedPost.value) return
    solvingPost.value = true
    try {
      const updated = await solveHallPost(selectedPost.value.id, !selectedPost.value.solved)
      selectedPost.value = updated
      showFloat(updated.solved ? '已标记为已解决' : '已取消已解决状态', 'success')
      await loadPosts()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '更新失败', 'danger')
    } finally {
      solvingPost.value = false
    }
  }

  const handleMineFilter = async (value: HallMineFilter) => {
    if (value !== 'all' && !viewer.value.loggedIn) {
      showFloat('请先登录后再查看我的内容', 'danger')
      return
    }
    mineFilter.value = value
  }

  const toggleToolbarMenu = (name: 'category' | 'sort' | 'mine') => {
    toolbarMenu.value = toolbarMenu.value === name ? null : name
  }

  const selectCategory = (value: HallCategory) => {
    category.value = value
    toolbarMenu.value = null
  }

  const selectSort = (value: HallSort) => {
    sortBy.value = value
    toolbarMenu.value = null
  }

  const selectMineFilter = async (value: HallMineFilter) => {
    await handleMineFilter(value)
    toolbarMenu.value = null
  }

  watch([category, sortBy, mineFilter], () => {
    currentPage.value = 1
    void loadPosts()
  })

  watch(
    () => route.query.post,
    (value) => {
      const postId = typeof value === 'string' ? value : null
      if (!postId) {
        selectedPostId.value = null
        selectedPost.value = null
        replyTarget.value = null
        return
      }
      if (postId === selectedPostId.value && selectedPost.value?.id === postId) return
      replyTarget.value = null
      void loadDetail(postId)
    },
    { immediate: true }
  )

  const likingPostId = ref<string | null>(null)
  const dislikingPostId = ref<string | null>(null)
  const likingReplyId = ref<string | null>(null)
  const pinningPost = ref(false)
  const featuringPost = ref(false)

  const likePost = async () => {
    if (!selectedPost.value) return
    if (!(await ensureLoggedInForInteraction())) return
    likingPostId.value = selectedPost.value.id
    try {
      const updated = await likeHallPost(selectedPost.value.id)
      selectedPost.value = updated
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '操作失败', 'danger')
    } finally {
      likingPostId.value = null
    }
  }

  const dislikePost = async () => {
    if (!selectedPost.value) return
    if (!(await ensureLoggedInForInteraction())) return
    dislikingPostId.value = selectedPost.value.id
    try {
      const updated = await dislikeHallPost(selectedPost.value.id)
      selectedPost.value = updated
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '操作失败', 'danger')
    } finally {
      dislikingPostId.value = null
    }
  }

  const likeReply = async (replyId: string) => {
    if (!selectedPost.value) return
    if (!(await ensureLoggedInForInteraction())) return
    likingReplyId.value = replyId
    try {
      const updated = await likeHallReply(selectedPost.value.id, replyId)
      selectedPost.value = updated
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '操作失败', 'danger')
    } finally {
      likingReplyId.value = null
    }
  }

  const togglePin = async () => {
    if (!selectedPost.value) return
    pinningPost.value = true
    try {
      const updated = await pinHallPost(selectedPost.value.id, !selectedPost.value.pinned)
      selectedPost.value = updated
      showFloat(updated.pinned ? '已置顶' : '已取消置顶', 'success')
      await loadPosts()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '操作失败', 'danger')
    } finally {
      pinningPost.value = false
    }
  }

  const toggleFeature = async () => {
    if (!selectedPost.value) return
    featuringPost.value = true
    try {
      const updated = await featureHallPost(selectedPost.value.id, !selectedPost.value.featured)
      selectedPost.value = updated
      showFloat(updated.featured ? '已加精' : '已取消加精', 'success')
      await loadPosts()
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '操作失败', 'danger')
    } finally {
      featuringPost.value = false
    }
  }

  onMounted(async () => {
    goalStore.ensureInitialized()
    resetComposer()
    await loadViewer()
    await loadPosts()
    if (typeof route.query.post === 'string') {
      await loadDetail(route.query.post)
    }
  })
</script>

<style scoped>
  .hall-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 5px 10px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    background: rgba(43, 45, 60, 0.65);
    color: rgb(var(--color-text));
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .hall-chip:hover {
    border-color: rgba(200, 164, 92, 0.45);
  }

  .hall-chip--active {
    background: rgba(200, 164, 92, 0.16);
    border-color: rgba(200, 164, 92, 0.5);
    color: var(--color-accent);
  }

  .hall-chip--disabled {
    opacity: 0.45;
  }

  .hall-post-item {
    border: 1px solid rgba(200, 164, 92, 0.15);
    border-radius: 2px;
    padding: 12px;
    background: rgba(26, 26, 26, 0.2);
    transition: all 0.15s ease;
  }

  .hall-post-item:hover {
    border-color: rgba(200, 164, 92, 0.4);
  }

  .hall-post-item--active {
    border-color: rgba(200, 164, 92, 0.55);
    background: rgba(200, 164, 92, 0.08);
  }

  .hall-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 11px;
    line-height: 1.4;
    border: 1px solid transparent;
  }

  .hall-tag--discussion {
    color: #d6c08a;
    background: rgba(200, 164, 92, 0.1);
    border-color: rgba(200, 164, 92, 0.25);
  }

  .hall-tag--help {
    color: #f5d08d;
    background: rgba(195, 64, 67, 0.12);
    border-color: rgba(195, 64, 67, 0.3);
  }

  .hall-tag--solved {
    color: #9fe0b0;
    background: rgba(90, 158, 111, 0.12);
    border-color: rgba(90, 158, 111, 0.3);
  }

  .hall-tag--mine {
    color: #8cc7ff;
    background: rgba(76, 110, 138, 0.18);
    border-color: rgba(76, 110, 138, 0.35);
  }

  .hall-tag--reward {
    color: #ffd88b;
    background: rgba(255, 187, 0, 0.12);
    border-color: rgba(255, 187, 0, 0.3);
  }

  .hall-tag--best {
    color: #9ad7ff;
    background: rgba(62, 119, 168, 0.16);
    border-color: rgba(62, 119, 168, 0.35);
  }

  .hall-tag--pinned {
    color: #ff9f6b;
    background: rgba(200, 100, 40, 0.16);
    border-color: rgba(200, 100, 40, 0.35);
  }

  .hall-tag--featured {
    color: #f0c040;
    background: rgba(180, 140, 20, 0.16);
    border-color: rgba(180, 140, 20, 0.4);
    font-weight: 600;
  }

  .btn-active {
    background: rgba(200, 164, 92, 0.22);
    border-color: rgba(200, 164, 92, 0.55);
    color: var(--color-accent);
  }

  .hall-toolbar {
    position: sticky;
    top: 8px;
    z-index: 20;
    backdrop-filter: blur(8px);
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .hall-toolbar__search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .hall-toolbar__search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
    border: 1px solid rgba(200, 164, 92, 0.2);
    background: rgba(26, 26, 26, 0.18);
    border-radius: 2px;
    padding: 8px 10px;
  }

  .hall-toolbar__search-input {
    width: 100%;
    min-width: 0;
    background: transparent;
    outline: none;
    border: none;
    color: rgb(var(--color-text));
    font-size: 13px;
  }

  .hall-toolbar__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .hall-select-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 6px 8px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    background: rgba(26, 26, 26, 0.14);
    border-radius: 2px;
  }

  .hall-select-wrap--custom {
    position: relative;
  }

  .hall-select-wrap__label {
    font-size: 12px;
    color: rgb(var(--color-muted));
    white-space: nowrap;
  }

  .hall-select-button {
    min-width: 120px;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: none;
    outline: none;
    background: transparent;
    color: rgb(var(--color-text));
    font-size: 12px;
    cursor: pointer;
  }

  .hall-select-button__arrow {
    color: rgb(var(--color-muted));
  }

  .hall-dropdown-panel {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 180px;
    padding: 6px;
    border-radius: 6px;
    border: 1px solid rgba(200, 164, 92, 0.28);
    background: rgb(38, 40, 56);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    z-index: 50;
  }

  .hall-dropdown-option {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: rgb(var(--color-text));
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .hall-dropdown-option:hover {
    background: rgba(200, 164, 92, 0.12);
    color: var(--color-accent);
  }

  .hall-dropdown-option--active {
    background: rgba(200, 164, 92, 0.18);
    color: var(--color-accent);
  }

  .hall-dropdown-option--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .hall-preview,
  .hall-content {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .hall-input,
  .hall-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgb(var(--color-bg));
    border: 1px solid rgba(200, 164, 92, 0.25);
    border-radius: 2px;
    color: rgb(var(--color-text));
    font-size: 13px;
    outline: none;
  }

  .hall-input:focus,
  .hall-textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  .hall-textarea {
    resize: vertical;
    min-height: 110px;
  }

  .hall-image {
    display: block;
    width: 100%;
    max-height: 420px;
    object-fit: contain;
    border-radius: 2px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    background: rgba(0, 0, 0, 0.15);
    cursor: zoom-in;
  }

  .hall-fab {
    position: fixed;
    right: 18px;
    bottom: 22px;
    z-index: 40;
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid rgba(200, 164, 92, 0.45);
    background: rgba(200, 164, 92, 0.92);
    color: rgb(var(--color-bg));
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 768px) {
    .hall-toolbar__search-row {
      flex-direction: column;
      align-items: stretch;
    }

    .hall-toolbar__filters {
      flex-direction: column;
    }

    .hall-select-wrap {
      width: 100%;
    }

    .hall-select-button {
      min-width: 0;
      width: 100%;
    }

    .hall-dropdown-panel {
      min-width: 100%;
    }
  }
</style>
