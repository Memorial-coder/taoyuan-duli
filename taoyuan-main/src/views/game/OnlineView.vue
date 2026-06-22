<template>
  <div class="space-y-3" data-testid="online-center">
    <section class="game-panel space-y-3" data-testid="online-center-hero-actions">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0 max-w-2xl">
          <div class="flex items-center gap-2 text-accent">
            <Wifi :size="16" aria-hidden="true" />
            <h2 class="game-section-title">在线中心</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">
            先处理正在进行的房间、邀请和互助待办；更多记录和说明可在各模块里展开查看。
          </p>
          <p class="mt-1 text-[0.625rem] leading-4 text-muted">
            {{ lastRefreshedLabel }}
            <span v-if="errorCount > 0"> · {{ errorCount }} 个模块摘要暂不可用</span>
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="refreshing"
            @click="refreshOnlineSummary"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': refreshing }" aria-hidden="true" />
            {{ refreshing ? '刷新中' : '刷新摘要' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" to="/hall">
            <MessageCircle :size="12" aria-hidden="true" />
            交流大厅
          </RouterLink>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <dl class="grid gap-2 sm:grid-cols-3" data-testid="online-center-status-summary">
          <div
            v-for="item in onlineCenterStatusCards"
            :key="item.id"
            class="min-w-0 border border-accent/10 bg-black/10 p-3"
            :data-testid="`online-center-status-${item.id}`"
          >
            <dt class="text-[0.625rem] leading-4 text-muted">{{ item.label }}</dt>
            <dd class="mt-1 truncate text-sm leading-5 text-accent">{{ item.value }}</dd>
            <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ item.summary }}</p>
          </div>
        </dl>

        <div class="grid gap-2 md:grid-cols-3" data-testid="online-center-hero-action-list">
          <RouterLink
            v-for="action in onlineCenterHeroActions"
            :key="action.id"
            class="group flex min-h-[116px] min-w-0 flex-col justify-between border border-accent/20 bg-accent/5 p-3 text-left transition-colors hover:border-accent/45 hover:bg-accent/10"
            :data-testid="`online-center-hero-action-${action.id}`"
            :to="action.to"
          >
            <span class="flex min-w-0 items-start justify-between gap-3">
              <span class="min-w-0">
                <span class="block truncate text-sm leading-5 text-text">{{ action.label }}</span>
                <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ action.status }}</span>
              </span>
              <component :is="action.icon" class="shrink-0 text-accent" :size="16" aria-hidden="true" />
            </span>
            <span class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ action.summary }}</span>
          </RouterLink>
        </div>
      </div>

      <section class="space-y-3" data-testid="online-activity-center">
        <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <h3 class="text-sm leading-5 text-accent">联机活动中心</h3>
            <p class="mt-1 text-xs leading-5 text-muted">
              今日推荐、房间状态、好友动向和本周奖励进度集中展示，先选能马上推进的一项。
            </p>
          </div>
          <span class="text-[0.625rem] leading-4 text-muted">{{ onlineActivityCenterSummary }}</span>
        </div>

        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-5" data-testid="online-center-playable-minigames">
          <RouterLink
            v-for="minigame in onlinePlayableMiniGameCards"
            :key="minigame.id"
            class="group flex min-h-[172px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
            :class="activityThemeClass(minigame.theme)"
            :data-testid="`online-center-playable-minigame-${minigame.id}`"
            :to="minigame.to"
          >
            <span class="min-w-0">
              <span class="flex min-w-0 items-start justify-between gap-2">
                <span class="min-w-0">
                  <span class="block truncate text-xs leading-4 text-text">{{ minigame.title }}</span>
                  <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ minigame.status }}</span>
                </span>
                <component :is="minigame.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
              </span>
              <span class="mt-2 line-clamp-2 block text-[0.625rem] leading-4 text-muted">{{ minigame.summary }}</span>
              <span class="mt-2 flex flex-wrap gap-1" data-testid="online-center-minigame-event-hooks">
                <span
                  v-for="hook in minigame.eventHooks"
                  :key="`${minigame.id}-${hook}`"
                  class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
                >
                  {{ hook }}
                </span>
              </span>
            </span>
            <span class="mt-2 text-[0.625rem] leading-4 text-accent" data-testid="online-center-minigame-reward-loop">
              {{ minigame.rewardHint }}
            </span>
          </RouterLink>
        </div>

        <section class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-async-collaboration">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div class="min-w-0">
              <h4 class="text-xs leading-4 text-accent">离线也能帮</h4>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                好友不在线时，把委托、帮手、设施和奖励收成一条轻协作日常。
              </p>
            </div>
            <span class="text-[0.625rem] leading-4 text-muted">{{ onlineAsyncCollaborationSummary }}</span>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-testid="online-center-async-collaboration-modes">
            <RouterLink
              v-for="card in onlineAsyncCollaborationCards"
              :key="card.id"
              class="group flex min-h-[142px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
              :class="activityThemeClass(card.theme)"
              :data-testid="`online-center-async-collaboration-card-${card.id}`"
              :to="card.to"
            >
              <span class="min-w-0">
                <span class="flex min-w-0 items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block truncate text-xs leading-4 text-text">{{ card.title }}</span>
                    <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ card.status }}</span>
                  </span>
                  <component :is="card.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
                </span>
                <span class="mt-2 line-clamp-2 block text-[0.625rem] leading-4 text-muted">{{ card.summary }}</span>
                <span class="mt-2 block text-[0.625rem] leading-4 text-muted" data-testid="online-center-async-collaboration-reward">
                  {{ card.rewardHint }}
                </span>
              </span>
              <span class="mt-2 flex items-center justify-between gap-2 text-[0.625rem] leading-4">
                <span class="min-w-0 truncate text-muted">{{ card.impactLabel }}</span>
                <span class="shrink-0 text-accent">{{ card.actionLabel }}</span>
              </span>
            </RouterLink>
          </div>
        </section>

        <section class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-reward-path">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div class="min-w-0">
              <h4 class="text-xs leading-4 text-accent">联机奖励路线</h4>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                每日、每周、协作和长线奖励放在同一条路径里，先让玩家知道为什么要约人。
              </p>
            </div>
            <span class="text-[0.625rem] leading-4 text-muted">{{ onlineRewardPathSummary }}</span>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-testid="online-center-reward-path-tiers">
            <RouterLink
              v-for="reward in onlineRewardPathCards"
              :key="reward.id"
              class="group flex min-h-[166px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
              :class="activityThemeClass(reward.theme)"
              :data-testid="`online-center-reward-path-card-${reward.id}`"
              :to="reward.to"
            >
              <span class="min-w-0">
                <span class="flex min-w-0 items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block text-[0.625rem] leading-4 text-muted">{{ reward.layerLabel }}</span>
                    <span class="mt-1 block truncate text-xs leading-4 text-text">{{ reward.title }}</span>
                    <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ reward.status }}</span>
                  </span>
                  <component :is="reward.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
                </span>
                <span class="mt-2 line-clamp-2 block text-[0.625rem] leading-4 text-muted">{{ reward.summary }}</span>
                <span class="mt-2 flex flex-wrap gap-1" data-testid="online-center-reward-path-rewards">
                  <span
                    v-for="item in reward.rewardItems"
                    :key="`${reward.id}-${item}`"
                    class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
                  >
                    {{ item }}
                  </span>
                </span>
              </span>
              <span class="mt-2 block">
                <span class="flex items-center justify-between gap-2 text-[0.625rem] leading-4">
                  <span class="text-muted">{{ reward.progressLabel }}</span>
                  <span class="text-accent">{{ reward.actionLabel }}</span>
                </span>
                <span class="mt-1 block h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
                  <span
                    class="block h-full"
                    :class="activityProgressClass(reward.theme)"
                    :style="{ width: `${reward.progressPercent}%` }"
                  />
                </span>
              </span>
            </RouterLink>
          </div>
        </section>

        <section class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-reward-claim-plan">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div class="min-w-0">
              <h4 class="text-xs leading-4 text-accent">奖励兑现清单</h4>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                把今天能领、差一步能领、长期在攒的奖励拆成可执行目标，避免玩家只看到一排奖励名。
              </p>
            </div>
            <span class="text-[0.625rem] leading-4 text-muted">{{ onlineRewardClaimPlanSummary }}</span>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-testid="online-center-reward-claim-plan-cards">
            <RouterLink
              v-for="claim in onlineRewardClaimPlanCards"
              :key="claim.id"
              class="group flex min-h-[154px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
              :class="activityThemeClass(claim.theme)"
              :data-testid="`online-center-reward-claim-plan-${claim.id}`"
              :to="claim.to"
            >
              <span class="min-w-0">
                <span class="flex min-w-0 items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block text-[0.625rem] leading-4 text-muted">{{ claim.layerLabel }}</span>
                    <span class="mt-1 block truncate text-xs leading-4 text-text">{{ claim.title }}</span>
                    <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ claim.status }}</span>
                  </span>
                  <component :is="claim.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
                </span>
                <span class="mt-2 grid gap-1 text-[0.625rem] leading-4 text-muted" data-testid="online-center-reward-claim-plan-detail">
                  <span data-testid="online-center-reward-claim-plan-next-action">{{ claim.nextActionLabel }}</span>
                  <span data-testid="online-center-reward-claim-plan-reward">{{ claim.rewardLabel }}</span>
                  <span data-testid="online-center-reward-claim-plan-proof">{{ claim.proofLabel }}</span>
                </span>
              </span>
              <span class="mt-2 block">
                <span class="flex items-center justify-between gap-2 text-[0.625rem] leading-4">
                  <span class="text-muted">{{ claim.progressLabel }}</span>
                  <span class="text-accent">{{ claim.actionLabel }}</span>
                </span>
                <span class="mt-1 block h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
                  <span
                    class="block h-full"
                    :class="activityProgressClass(claim.theme)"
                    :style="{ width: `${claim.progressPercent}%` }"
                  />
                </span>
              </span>
            </RouterLink>
          </div>
        </section>

        <section class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-collection-goals">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div class="min-w-0">
              <h4 class="text-xs leading-4 text-accent">联机收集目标</h4>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                把节会、远征、好友和庄园协作沉淀成可追的纪念册、图鉴、徽章和称号。
              </p>
            </div>
            <span class="text-[0.625rem] leading-4 text-muted">{{ onlineCollectionGoalSummary }}</span>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-testid="online-center-collection-goal-cards">
            <RouterLink
              v-for="goal in onlineCollectionGoalCards"
              :key="goal.id"
              class="group flex min-h-[154px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
              :class="activityThemeClass(goal.theme)"
              :data-testid="`online-center-collection-goal-${goal.id}`"
              :to="goal.to"
            >
              <span class="min-w-0">
                <span class="flex min-w-0 items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block truncate text-xs leading-4 text-text">{{ goal.title }}</span>
                    <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ goal.status }}</span>
                  </span>
                  <component :is="goal.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
                </span>
                <span class="mt-2 line-clamp-2 block text-[0.625rem] leading-4 text-muted">{{ goal.summary }}</span>
                <span class="mt-2 block text-[0.625rem] leading-4 text-muted" data-testid="online-center-collection-goal-reward">
                  {{ goal.rewardHint }}
                </span>
              </span>
              <span class="mt-2 block">
                <span class="flex items-center justify-between gap-2 text-[0.625rem] leading-4">
                  <span class="text-muted">{{ goal.progressLabel }}</span>
                  <span class="text-accent">{{ goal.actionLabel }}</span>
                </span>
                <span class="mt-1 block h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
                  <span
                    class="block h-full"
                    :class="activityProgressClass(goal.theme)"
                    :style="{ width: `${goal.progressPercent}%` }"
                  />
                </span>
              </span>
            </RouterLink>
          </div>
        </section>

        <section class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-season-themes">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div class="min-w-0">
              <h4 class="text-xs leading-4 text-accent">每周主题与赛季限定</h4>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                灯会周、远征周、丰收周和老带新奖励提前摆出来，让每周刷新有明确目标。
              </p>
            </div>
            <span class="text-[0.625rem] leading-4 text-muted">{{ onlineSeasonThemeSummary }}</span>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4" data-testid="online-center-season-theme-cards">
            <RouterLink
              v-for="theme in onlineSeasonThemeCards"
              :key="theme.id"
              class="group flex min-h-[158px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
              :class="activityThemeClass(theme.theme)"
              :data-testid="`online-center-season-theme-${theme.id}`"
              :to="theme.to"
            >
              <span class="min-w-0">
                <span class="flex min-w-0 items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block truncate text-xs leading-4 text-text">{{ theme.title }}</span>
                    <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ theme.status }}</span>
                  </span>
                  <component :is="theme.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
                </span>
                <span class="mt-2 line-clamp-2 block text-[0.625rem] leading-4 text-muted">{{ theme.summary }}</span>
                <span class="mt-2 block text-[0.625rem] leading-4 text-muted" data-testid="online-center-season-theme-limited-reward">
                  {{ theme.limitedReward }}
                </span>
              </span>
              <span class="mt-2 block">
                <span class="flex items-center justify-between gap-2 text-[0.625rem] leading-4">
                  <span class="text-muted">{{ theme.progressLabel }}</span>
                  <span class="text-accent">{{ theme.actionLabel }}</span>
                </span>
                <span class="mt-1 block h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
                  <span
                    class="block h-full"
                    :class="activityProgressClass(theme.theme)"
                    :style="{ width: `${theme.progressPercent}%` }"
                  />
                </span>
              </span>
            </RouterLink>
          </div>
        </section>

        <div class="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div class="space-y-3">
            <div class="grid gap-2 md:grid-cols-3" data-testid="online-center-daily-recommendations">
              <RouterLink
                v-for="activity in onlineDailyActivityCards"
                :key="`daily-${activity.id}`"
                class="group flex min-h-[184px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
                :class="activityThemeClass(activity.theme)"
                :data-testid="`online-center-daily-recommendation-${activity.id}`"
                :to="activity.to"
              >
                <span class="flex min-w-0 items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block text-[0.625rem] leading-4 text-muted">{{ activity.eyebrow }}</span>
                    <span class="mt-1 block truncate text-sm leading-5 text-text">{{ activity.title }}</span>
                    <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ activity.stateLabel }}</span>
                  </span>
                  <component :is="activity.icon" class="shrink-0 text-accent" :size="16" aria-hidden="true" />
                </span>
                <span class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ activity.summary }}</span>
                <span class="mt-2 grid gap-1 text-[0.625rem] leading-4 text-muted" data-testid="online-center-daily-recommendation-plan">
                  <span data-testid="online-center-daily-recommendation-reason">{{ activity.reasonLabel }}</span>
                  <span data-testid="online-center-daily-recommendation-duration">{{ activity.durationLabel }}</span>
                  <span data-testid="online-center-daily-recommendation-reward">{{ activity.rewardLabel }}</span>
                  <span data-testid="online-center-daily-recommendation-teamwork">{{ activity.teamworkLabel }}</span>
                </span>
                <span class="mt-2 block h-1.5 overflow-hidden bg-black/20" aria-hidden="true">
                  <span
                    class="block h-full"
                    :class="activityProgressClass(activity.theme)"
                    :style="{ width: `${activity.progressPercent}%` }"
                  />
                </span>
              </RouterLink>
            </div>

            <div class="grid gap-2 lg:grid-cols-3" data-testid="online-center-theme-activity-grid">
              <RouterLink
                v-for="activity in onlineThemeActivityCards"
                :key="`theme-${activity.id}`"
                class="flex min-h-[236px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
                :class="activityThemeClass(activity.theme)"
                :data-testid="`online-center-theme-activity-${activity.id}`"
                :to="activity.to"
              >
                <span class="min-w-0">
                  <span class="flex min-w-0 items-start justify-between gap-2">
                    <span class="min-w-0">
                      <span class="block text-[0.625rem] leading-4 text-muted">{{ activity.eyebrow }}</span>
                      <span class="mt-1 block truncate text-sm leading-5 text-text">{{ activity.title }}</span>
                    </span>
                    <span class="shrink-0 border border-accent/20 px-2 py-1 text-[0.625rem] leading-4 text-accent">{{ activity.actionLabel }}</span>
                  </span>
                  <span class="mt-3 grid grid-cols-3 gap-1" data-testid="online-center-game-card-statuses">
                    <span
                      v-for="status in activity.statuses"
                      :key="status"
                      class="min-w-0 border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
                    >
                      {{ status }}
                    </span>
                  </span>
                  <p class="mt-3 text-[0.625rem] leading-4 text-muted">{{ activity.summary }}</p>
                  <dl class="mt-3 grid gap-1 text-[0.625rem] leading-4 text-muted">
                    <div v-for="stat in activity.stats" :key="stat.label" class="flex justify-between gap-2">
                      <dt>{{ stat.label }}</dt>
                      <dd class="text-accent">{{ stat.value }}</dd>
                    </div>
                  </dl>
                </span>
                <span class="mt-3 grid gap-2">
                  <span class="grid grid-cols-2 gap-1" data-testid="online-center-collaboration-roles">
                    <span
                      v-for="role in activity.collaborationRoles"
                      :key="role"
                      class="border border-accent/10 bg-black/10 px-2 py-1 text-[0.625rem] leading-4 text-muted"
                    >
                      {{ role }}
                    </span>
                  </span>
                  <span class="line-clamp-2 text-[0.625rem] leading-4 text-accent" data-testid="online-center-reward-preview">
                    {{ activity.rewardPreview.join(' · ') }}
                  </span>
                </span>
              </RouterLink>
            </div>
          </div>

          <aside class="grid gap-3" data-testid="online-center-side-progress">
            <div class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-weekly-reward-progress">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs leading-4 text-accent">本周奖励进度</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ onlineWeeklyRewardSummary }}</p>
                </div>
                <span class="shrink-0 text-sm leading-5 text-accent">{{ onlineWeeklyRewardProgressLabel }}</span>
              </div>
              <div class="mt-3 h-2 overflow-hidden bg-black/20" aria-hidden="true">
                <div class="h-full bg-accent/80" :style="{ width: `${onlineWeeklyRewardProgressPercent}%` }" />
              </div>
              <div class="mt-3 grid gap-2">
                <RouterLink
                  v-for="step in onlineWeeklyRewardSteps"
                  :key="step.id"
                  class="border border-accent/10 bg-background/70 p-2 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
                  :data-testid="`online-center-weekly-reward-step-${step.id}`"
                  :to="step.to"
                >
                  <span class="flex items-start justify-between gap-2">
                    <span class="min-w-0">
                      <span class="block text-xs leading-4 text-text">{{ step.label }}</span>
                      <span class="mt-1 block text-[0.625rem] leading-4 text-muted">{{ step.summary }}</span>
                    </span>
                    <span class="shrink-0 text-[0.625rem] leading-4 text-accent">{{ step.status }}</span>
                  </span>
                </RouterLink>
              </div>
            </div>

            <div class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-friend-activity-feed">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs leading-4 text-accent">好友正在玩</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ onlineFriendActivitySummary }}</p>
                </div>
                <Users :size="15" class="shrink-0 text-accent" aria-hidden="true" />
              </div>
              <div class="mt-3 grid gap-2">
                <RouterLink
                  v-for="entry in onlineFriendActivityEntries"
                  :key="entry.id"
                  class="border border-accent/10 bg-background/70 p-2 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
                  :data-testid="`online-center-friend-activity-${entry.id}`"
                  :to="entry.to"
                >
                  <span class="flex items-start justify-between gap-2">
                    <span class="min-w-0">
                      <span class="block truncate text-xs leading-4 text-text">{{ entry.label }}</span>
                      <span class="mt-1 block text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</span>
                    </span>
                    <span class="shrink-0 text-[0.625rem] leading-4 text-accent">{{ entry.status }}</span>
                  </span>
                </RouterLink>
              </div>
            </div>

            <div class="border border-accent/15 bg-black/10 p-3" data-testid="online-center-friend-team-board">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs leading-4 text-accent">好友榜 / 队伍榜</p>
                  <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ onlineFriendTeamBoardSummary }}</p>
                </div>
                <ShieldCheck :size="15" class="shrink-0 text-accent" aria-hidden="true" />
              </div>
              <div class="mt-3 grid gap-2">
                <RouterLink
                  v-for="entry in onlineFriendTeamBoardEntries"
                  :key="entry.id"
                  class="border border-accent/10 bg-background/70 p-2 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
                  :data-testid="`online-center-friend-team-board-entry-${entry.id}`"
                  :to="entry.to"
                >
                  <span class="flex items-start justify-between gap-2">
                    <span class="min-w-0">
                      <span class="block truncate text-xs leading-4 text-text">{{ entry.label }}</span>
                      <span class="mt-1 block text-[0.625rem] leading-4 text-muted">{{ entry.summary }}</span>
                    </span>
                    <span class="shrink-0 text-[0.625rem] leading-4 text-accent">{{ entry.status }}</span>
                  </span>
                </RouterLink>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section class="space-y-2" data-testid="online-center-today-todos">
        <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <h3 class="text-sm leading-5 text-accent">今日联机待办</h3>
            <p class="mt-1 text-xs leading-5 text-muted">
              优先处理邀请、共同庄园确认、可照料庄园、互助委托和可领取邮件。
            </p>
          </div>
          <span class="text-[0.625rem] leading-4 text-muted">{{ onlineCenterTodoSummary }}</span>
        </div>
        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <RouterLink
            v-for="todo in todayTodoCards"
            :key="todo.id"
            class="group flex min-h-[108px] min-w-0 flex-col justify-between border p-3 text-left transition-colors"
            :class="todo.tone === 'urgent'
              ? 'border-amber-300/30 bg-amber-500/10 hover:border-amber-200/60'
              : todo.tone === 'reward'
                ? 'border-emerald-300/25 bg-emerald-500/10 hover:border-emerald-200/55'
                : 'border-accent/15 bg-black/10 hover:border-accent/35 hover:bg-accent/5'"
            :data-testid="`online-center-todo-${todo.id}`"
            :to="todo.to"
          >
            <span class="flex min-w-0 items-start justify-between gap-2">
              <span class="min-w-0">
                <span class="block truncate text-xs leading-4 text-text">{{ todo.label }}</span>
                <span class="mt-1 block text-[0.625rem] leading-4 text-accent">{{ todo.status }}</span>
              </span>
              <component :is="todo.icon" class="shrink-0 text-accent" :size="15" aria-hidden="true" />
            </span>
            <span class="mt-2 line-clamp-2 text-[0.625rem] leading-4 text-muted">{{ todo.summary }}</span>
          </RouterLink>
        </div>
      </section>

      <OnlineStatusBanner
        v-if="errorCount > 0"
        tone="warning"
        title="部分在线摘要暂不可用"
        :description="`${errorCount} 个模块刷新失败，可以先进入对应页面继续处理。`"
        action-label="重试"
        @action="refreshOnlineSummary"
      />

      <nav class="grid grid-cols-3 gap-1 md:grid-cols-6" aria-label="在线模块快捷入口" data-testid="online-center-quick-links">
        <RouterLink
          v-for="module in modules"
          :key="`${module.key}-quick`"
          class="flex min-w-0 flex-col items-center gap-1 border border-accent/15 bg-black/10 px-1 py-2 text-[0.625rem] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
          :data-testid="`online-module-${module.key}-quick-link`"
          :to="{ name: module.routeName }"
        >
          <component :is="module.icon" :size="13" aria-hidden="true" />
          <span class="truncate">{{ module.title }}</span>
        </RouterLink>
      </nav>
    </section>

    <section class="game-panel space-y-3" data-testid="online-center-module-entry-group">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div class="min-w-0">
          <h3 class="text-sm leading-5 text-accent">常用入口</h3>
          <p class="mt-1 text-xs leading-5 text-muted">更多数字、记录和细节进入各模块页面查看。</p>
        </div>
        <span class="text-[0.625rem] leading-4 text-muted">{{ modules.length }} 个在线模块</span>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <OnlineModuleCard
          v-for="module in modules"
          :key="module.routeName"
          :module-key="module.key"
          :title="module.title"
          :summary="module.summary"
          :status="module.status"
          :stats="module.stats"
          :to="{ name: module.routeName }"
          :icon="module.icon"
          :error="module.error"
        />
      </div>
    </section>

    <section class="game-panel-muted p-3" data-testid="online-visual-activity-group">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <Map :size="15" />
            <h3 class="text-sm leading-5">可视化活动</h3>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">地图、场景、轨道和异步工程入口集中在这里。</p>
        </div>
        <span class="text-[0.625rem] leading-4 text-muted">{{ visualActivitySummary }}</span>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <RouterLink
          v-for="activity in visualActivities"
          :key="activity.key"
          class="flex min-h-[116px] min-w-0 flex-col justify-between border border-accent/15 bg-black/10 p-3 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
          :data-testid="activity.testId"
          :to="activity.targetRoute"
        >
          <div class="min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2 text-accent">
                <component :is="activity.icon" :size="14" />
                <p class="truncate text-xs leading-4">{{ activity.title }}</p>
              </div>
              <span class="shrink-0 text-[0.625rem] leading-4 text-muted">{{ activity.boardType }}</span>
            </div>
            <p class="mt-2 text-[0.625rem] leading-4 text-muted">{{ activity.summary }}</p>
            <p
              v-if="!activity.enabled"
              class="mt-2 text-[0.625rem] leading-4 text-muted"
              data-testid="online-visual-activity-fallback"
            >
              备用入口可用：进入后按原页面继续操作。
            </p>
          </div>
          <p class="mt-2 text-[0.625rem] leading-4 text-accent">{{ activity.enabled ? activity.status : '可从备用入口继续' }}</p>
        </RouterLink>
      </div>
      <OnlineTechnicalDetails
        class="mt-3"
        title="更多入口说明"
        summary="备用入口和异常时的继续方式默认收起，需要时可展开查看。"
        tone="warning"
      >
        <div class="space-y-3" data-testid="online-center-governance-details">
          <div class="border border-accent/10 bg-black/10 p-3" data-testid="online-visual-feature-flag-panel">
            <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div class="min-w-0">
                <p class="text-xs leading-4 text-accent">入口可用状态</p>
                <p class="mt-1 text-[0.625rem] leading-4 text-muted">
                  {{ onlineVisualFeatureFlagSummary }}
                </p>
              </div>
              <span class="text-[0.625rem] leading-4 text-muted">不可用时可从备用入口继续或只读回看</span>
            </div>
            <div class="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="featureFlag in onlineVisualFeatureFlagItems"
                :key="featureFlag.key"
                class="border border-accent/10 bg-background/70 p-2"
                :data-testid="featureFlag.fallbackTestId"
              >
                <div class="flex items-start justify-between gap-2">
                  <label class="flex min-w-0 items-start gap-2">
                    <input
                      class="online-input mt-0.5 size-3 shrink-0"
                      type="checkbox"
                      :checked="featureFlag.enabled"
                      disabled
                      :aria-label="featureFlag.label"
                    />
                    <span class="min-w-0">
                      <span class="block text-xs leading-4 text-text">{{ featureFlag.label }}</span>
                      <span class="mt-1 block text-[0.625rem] leading-4 text-muted">{{ featureFlag.summary }}</span>
                    </span>
                  </label>
                  <span class="shrink-0 text-[0.625rem] leading-4 text-accent">
                    {{ featureFlag.enabled ? '开启' : '备用' }}
                  </span>
                </div>
                <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-feature-flag-fallback">
                  {{ featureFlag.fallbackLabel }}
                </p>
                <dl class="mt-2 grid gap-1 text-[0.625rem] leading-4 text-muted">
                  <div data-testid="online-visual-feature-flag-safe-close">
                    <dt class="text-accent">收尾</dt>
                    <dd>{{ featureFlag.activeRoomClosePolicy }}</dd>
                  </div>
                  <div data-testid="online-visual-feature-flag-missing-config">
                    <dt class="text-accent">缺失</dt>
                    <dd>{{ featureFlag.missingConfigFallback }}</dd>
                  </div>
                </dl>
                <RouterLink
                  class="mt-2 inline-flex text-[0.625rem] leading-4 text-accent hover:text-highlight"
                  :to="{ name: featureFlag.fallbackRouteName }"
                  data-testid="online-visual-feature-flag-fallback-link"
                >
                  备用操作
                </RouterLink>
              </article>
            </div>
          </div>
        </div>
      </OnlineTechnicalDetails>
      <div class="mt-3 border border-accent/10 bg-black/10 p-3" data-testid="online-visual-activity-schedule">
        <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <p class="text-xs leading-4 text-accent">活动排期</p>
            <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ onlineVisualScheduleSummary }}</p>
          </div>
          <span class="text-[0.625rem] leading-4 text-muted">只展示可参加入口和下一步</span>
        </div>
        <div class="mt-2 grid gap-2 lg:grid-cols-5" data-testid="online-visual-festival-calendar">
          <RouterLink
            v-for="entry in onlineVisualFestivalCalendar"
            :key="entry.id"
            class="flex min-h-[148px] min-w-0 flex-col justify-between border border-accent/10 bg-background/70 p-2 text-left transition-colors hover:border-accent/35 hover:bg-accent/5"
            :data-testid="entry.testId"
            :to="entry.targetRoute"
          >
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs leading-4 text-text">{{ entry.title }}</p>
                <span class="shrink-0 text-[0.625rem] leading-4 text-accent">{{ entry.windowLabel }}</span>
              </div>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ entry.entryLabel }}</p>
              <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-schedule-scene">
                {{ entry.visualScene }}
              </p>
              <p
                v-if="!entry.enabled"
                class="mt-2 text-[0.625rem] leading-4 text-muted"
                data-testid="online-visual-schedule-fallback"
              >
                可从备用入口参加。
              </p>
            </div>
            <div class="mt-2 space-y-1">
              <p class="text-[0.625rem] leading-4 text-muted" data-testid="online-visual-schedule-reward-pool">
                下一步：{{ entry.entryLabel }}
              </p>
              <p class="text-[0.625rem] leading-4 text-accent" data-testid="online-visual-schedule-npc-line">
                {{ entry.npcLine }}
              </p>
            </div>
          </RouterLink>
        </div>
        <div class="mt-3 grid gap-2 lg:grid-cols-3">
          <div class="border border-accent/10 bg-background/70 p-2" data-testid="online-visual-daily-rotation">
            <p class="text-xs leading-4 text-accent">每日短玩法</p>
            <RouterLink
              v-for="entry in onlineVisualDailyRotation"
              :key="entry.id"
              class="mt-2 block border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
              :data-testid="entry.testId"
              :to="entry.targetRoute"
            >
              <span class="block text-text">{{ entry.title }} · {{ entry.windowLabel }}</span>
              <span class="mt-1 block">{{ entry.entryLabel }}</span>
              <span v-if="!entry.enabled" class="mt-1 block" data-testid="online-visual-schedule-fallback">
                可从备用入口参加。
              </span>
            </RouterLink>
          </div>
          <div class="border border-accent/10 bg-background/70 p-2" data-testid="online-visual-weekly-rotation">
            <p class="text-xs leading-4 text-accent">每周长玩法</p>
            <RouterLink
              v-for="entry in onlineVisualWeeklyRotation"
              :key="entry.id"
              class="mt-2 block border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
              :data-testid="entry.testId"
              :to="entry.targetRoute"
            >
              <span class="block text-text">{{ entry.title }} · {{ entry.entryLabel }}</span>
              <span class="mt-1 block">{{ entry.visualScene }}</span>
              <span v-if="!entry.enabled" class="mt-1 block" data-testid="online-visual-schedule-fallback">
                可从备用入口参加。
              </span>
            </RouterLink>
          </div>
          <div class="border border-accent/10 bg-background/70 p-2" data-testid="online-visual-seasonal-rotation">
            <p class="text-xs leading-4 text-accent">赛季与过期保留</p>
            <RouterLink
              v-for="entry in onlineVisualSeasonalRotation"
              :key="entry.id"
              class="mt-2 block border border-accent/10 bg-black/10 p-2 text-[0.625rem] leading-4 text-muted transition-colors hover:border-accent/35 hover:text-accent"
              :data-testid="entry.testId"
              :to="entry.targetRoute"
            >
              <span class="block text-text">{{ entry.title }} · {{ entry.windowLabel }}</span>
              <span class="mt-1 block">{{ entry.replayRetention }}</span>
              <span v-if="!entry.enabled" class="mt-1 block" data-testid="online-visual-schedule-fallback">
                可从备用入口参加。
              </span>
            </RouterLink>
            <ul class="mt-2 space-y-1" data-testid="online-visual-expired-retention">
              <li
                v-for="retention in onlineVisualExpiredRetention"
                :key="retention"
                class="text-[0.625rem] leading-4 text-muted"
              >
                {{ retention }}
              </li>
            </ul>
          </div>
        </div>
      </div>
      <OnlineTechnicalDetails
        class="mt-3"
        title="奖励与记录说明"
        summary="奖励说明、记录边界和参与限制默认收起，活动卡只展示可参加入口。"
        tone="warning"
      >
        <div class="border border-accent/10 bg-black/10 p-3" data-testid="online-visual-reward-control-panel">
          <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div class="min-w-0">
              <p class="text-xs leading-4 text-accent">奖励与投放控制</p>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted">{{ onlineVisualRewardControlSummary }}</p>
            </div>
            <span class="text-[0.625rem] leading-4 text-muted">结算记录优先 · 纪念优先</span>
          </div>
          <div class="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="policy in onlineVisualRewardControlPolicies"
              :key="policy.key"
              class="border border-accent/10 bg-background/70 p-2"
              :data-testid="policy.testId"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs leading-4 text-text">{{ policy.label }}</p>
                <span class="shrink-0 text-[0.625rem] leading-4 text-accent">限额</span>
              </div>
              <dl class="mt-2 grid gap-1 text-[0.625rem] leading-4 text-muted">
                <div data-testid="online-visual-reward-base">
                  <dt class="text-accent">基础</dt>
                  <dd>{{ policy.baseReward }}</dd>
                </div>
                <div data-testid="online-visual-reward-performance">
                  <dt class="text-accent">表现 / 协作</dt>
                  <dd>{{ policy.performanceReward }} {{ policy.collaborationReward }}</dd>
                </div>
                <div data-testid="online-visual-reward-memorial">
                  <dt class="text-accent">纪念</dt>
                  <dd>{{ policy.memorialReward }}</dd>
                </div>
                <div data-testid="online-visual-reward-authority">
                  <dt class="text-accent">结算边界</dt>
                  <dd>{{ policy.serverAuthority }}</dd>
                </div>
                <div data-testid="online-visual-reward-cap">
                  <dt class="text-accent">上限</dt>
                  <dd>{{ policy.capSummary }}</dd>
                </div>
              </dl>
              <p class="mt-2 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-reward-anti-inflation">
                {{ policy.antiInflationRule }}
              </p>
              <p class="mt-1 text-[0.625rem] leading-4 text-muted" data-testid="online-visual-reward-solo-parity">
                {{ policy.soloParityRule }}
              </p>
            </article>
          </div>
          <ul class="mt-3 grid gap-1 sm:grid-cols-2" data-testid="online-visual-reward-global-guardrails">
            <li
              v-for="guardrail in onlineVisualRewardGlobalGuardrails"
              :key="guardrail"
              class="border border-accent/10 bg-background/70 p-2 text-[0.625rem] leading-4 text-muted"
            >
              {{ guardrail }}
            </li>
          </ul>
        </div>
      </OnlineTechnicalDetails>
    </section>

    <OnlineStickyActionBar
      :status-label="onlineCenterStickyStatus"
      :primary-action="onlineCenterStickyPrimaryAction"
      :secondary-actions="onlineCenterStickySecondaryActions"
      @primary="handleOnlineCenterAction(onlineCenterPrimaryAction?.id)"
      @secondary="handleOnlineCenterAction"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import {
    CalendarDays,
    ClipboardList,
    HeartHandshake,
    Handshake,
    Home,
    Inbox,
    Lamp,
    Map,
    MessageCircle,
    Pickaxe,
    RefreshCw,
    ShieldCheck,
    Users,
    Warehouse,
    Waves,
    Wifi
  } from 'lucide-vue-next'
  import type { Component } from 'vue'
  import { useRouter, type RouteLocationRaw } from 'vue-router'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import { useCohabitationStore } from '@/stores/useCohabitationStore'
  import { useExpeditionRoomStore } from '@/stores/useExpeditionRoomStore'
  import { useFestivalRoomStore } from '@/stores/useFestivalRoomStore'
  import { useMailboxStore } from '@/stores/useMailboxStore'
  import { useManorStore } from '@/stores/useManorStore'
  import { useSocialStore } from '@/stores/useSocialStore'
  import { useSocietyStore } from '@/stores/useSocietyStore'
  import OnlineModuleCard from '@/components/game/online/OnlineModuleCard.vue'
  import OnlineStatusBanner from '@/components/game/online/OnlineStatusBanner.vue'
  import OnlineStickyActionBar from '@/components/game/online/OnlineStickyActionBar.vue'
  import OnlineTechnicalDetails from '@/components/game/online/OnlineTechnicalDetails.vue'
  import {
    ONLINE_VISUAL_FEATURE_FLAGS,
    createOnlineVisualFeatureFlagState,
    getOnlineVisualFeatureFlagConfig,
    getOnlineVisualFeatureFlagKeyForSceneSpec,
    isOnlineVisualFeatureEnabled,
    type OnlineVisualFeatureFlagKey,
  } from '@/data/onlineVisualFeatureFlags'
  import {
    ONLINE_VISUAL_DAILY_ACTIVITY_ROTATION,
    ONLINE_VISUAL_EXPIRED_ACTIVITY_RETENTION,
    ONLINE_VISUAL_FESTIVAL_ACTIVITY_CALENDAR,
    ONLINE_VISUAL_SEASONAL_ACTIVITY_ROTATION,
    ONLINE_VISUAL_WEEKLY_ACTIVITY_ROTATION,
    type OnlineVisualActivityScheduleEntry,
  } from '@/data/onlineVisualActivitySchedule'
  import {
    ONLINE_VISUAL_REWARD_CONTROL_POLICIES,
    ONLINE_VISUAL_REWARD_GLOBAL_GUARDRAILS,
  } from '@/data/onlineVisualRewardControl'

  type ModuleKey = 'manor' | 'cohabitation' | 'neighbor' | 'orders' | 'festival' | 'society' | 'mail'
  type ModuleStat = { label: string; value: string | number }
  type ModuleCard = {
    key: ModuleKey
    title: string
    summary: string
    status: string
    stats: ModuleStat[]
    routeName: string
    icon: Component
    error: string
  }
  type OnlineCenterHeroActionId = 'continue-room' | 'handle-invites' | 'create-room' | 'society-todos' | 'relay-orders'
  type OnlineCenterHeroAction = {
    id: OnlineCenterHeroActionId
    label: string
    status: string
    summary: string
    to: RouteLocationRaw
    icon: Component
  }
  type OnlineCenterStatusCard = { id: string; label: string; value: string; summary: string }
  type OnlineCenterTodoCard = {
    id: string
    label: string
    status: string
    summary: string
    to: RouteLocationRaw
    icon: Component
    tone: 'urgent' | 'default' | 'reward'
  }
  type OnlineActivityTheme = 'festival' | 'expedition' | 'manor'
  type OnlineActivityCard = {
    id: string
    theme: OnlineActivityTheme
    eyebrow: string
    title: string
    summary: string
    stateLabel: string
    todayLabel: string
    weeklyRewardLabel: string
    actionLabel: string
    progressPercent: number
    to: RouteLocationRaw
    icon: Component
    statuses: string[]
    stats: ModuleStat[]
    collaborationRoles: string[]
    rewardPreview: string[]
  }
  type OnlineDailyActivityCard = {
    id: string
    theme: OnlineActivityTheme
    eyebrow: string
    title: string
    summary: string
    stateLabel: string
    reasonLabel: string
    durationLabel: string
    rewardLabel: string
    teamworkLabel: string
    progressPercent: number
    priority: number
    to: RouteLocationRaw
    icon: Component
  }
  type OnlinePlayableMiniGameCard = {
    id: string
    theme: OnlineActivityTheme
    title: string
    status: string
    summary: string
    eventHooks: string[]
    rewardHint: string
    to: RouteLocationRaw
    icon: Component
  }
  type OnlineAsyncCollaborationCard = {
    id: string
    theme: OnlineActivityTheme
    title: string
    status: string
    summary: string
    rewardHint: string
    impactLabel: string
    actionLabel: string
    to: RouteLocationRaw
    icon: Component
    ready: boolean
  }
  type OnlineRewardPathCard = {
    id: string
    theme: OnlineActivityTheme
    layerLabel: string
    title: string
    status: string
    summary: string
    rewardItems: string[]
    progressLabel: string
    progressPercent: number
    actionLabel: string
    to: RouteLocationRaw
    icon: Component
    ready: boolean
  }
  type OnlineRewardClaimPlanCard = {
    id: string
    theme: OnlineActivityTheme
    layerLabel: string
    title: string
    status: string
    nextActionLabel: string
    rewardLabel: string
    proofLabel: string
    progressLabel: string
    progressPercent: number
    actionLabel: string
    to: RouteLocationRaw
    icon: Component
    ready: boolean
  }
  type OnlineCollectionGoalCard = {
    id: string
    theme: OnlineActivityTheme
    title: string
    status: string
    summary: string
    rewardHint: string
    progressLabel: string
    progressPercent: number
    actionLabel: string
    to: RouteLocationRaw
    icon: Component
    unlocked: boolean
  }
  type OnlineSeasonThemeCard = {
    id: string
    theme: OnlineActivityTheme
    title: string
    status: string
    summary: string
    limitedReward: string
    progressLabel: string
    progressPercent: number
    actionLabel: string
    to: RouteLocationRaw
    icon: Component
    active: boolean
  }
  type OnlineWeeklyRewardStep = {
    id: string
    label: string
    summary: string
    status: string
    to: RouteLocationRaw
    completed: boolean
  }
  type OnlineFriendActivityEntry = {
    id: string
    label: string
    summary: string
    status: string
    to: RouteLocationRaw
  }
  type OnlineFriendTeamBoardEntry = {
    id: string
    label: string
    summary: string
    status: string
    to: RouteLocationRaw
  }
  type OnlineCenterStickyAction = {
    id: OnlineCenterHeroActionId
    label: string
    tone: 'primary' | 'default'
    icon: Component
  }
  type VisualActivityKey = 'cavern' | 'lantern' | 'dragon-boat' | 'society-projects' | 'relay-orders' | 'warehouse'
  type VisualActivityCard = {
    key: VisualActivityKey
    title: string
    summary: string
    status: string
    boardType: string
    to: RouteLocationRaw
    sceneSpecId?: string
    featureFlagKey?: OnlineVisualFeatureFlagKey
    icon: Component
    testId: string
  }
  type ResolvedVisualActivityCard = VisualActivityCard & {
    enabled: boolean
    targetRoute: RouteLocationRaw
    fallbackRoute: RouteLocationRaw | null
    fallbackLabel: string
    fallbackStatus: string
  }
  type ResolvedOnlineVisualScheduleEntry = OnlineVisualActivityScheduleEntry & {
    enabled: boolean
    targetRoute: RouteLocationRaw
    fallbackRoute: RouteLocationRaw | null
    fallbackLabel: string
    fallbackStatus: string
  }

  const router = useRouter()
  const manorStore = useManorStore()
  const cohabitationStore = useCohabitationStore()
  const socialStore = useSocialStore()
  const coopOrderStore = useCoopOrderStore()
  const festivalRoomStore = useFestivalRoomStore()
  const expeditionRoomStore = useExpeditionRoomStore()
  const societyStore = useSocietyStore()
  const mailboxStore = useMailboxStore()
  const refreshing = ref(false)
  const lastRefreshedAt = ref(0)
  const moduleErrors = ref<Partial<Record<ModuleKey, string>>>({})
  const onlineVisualFeatureFlagState = createOnlineVisualFeatureFlagState()

  const countLabel = (count: number | undefined, unit = '项') => `${count ?? 0}${unit}`
  const hasSummary = (value: unknown) => (value ? '已同步' : '未同步')
  const normalizeError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
  const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
  const progressFromRoom = (room: { gameplay: { progress_percent: number } } | null | undefined, fallback = 0) =>
    clampPercent(room ? room.gameplay.progress_percent : fallback)
  const roomPrimaryStateLabel = (room: {
    state_label: string
    can_host_settle: boolean
    can_host_start_countdown: boolean
    can_ready: boolean
    can_host_ready_check: boolean
    can_host_close: boolean
  } | null) => {
    if (!room) return ''
    if (room.can_host_settle) return '可结算'
    if (room.can_host_start_countdown) return '可开始'
    if (room.can_ready) return '可准备'
    if (room.can_host_ready_check) return '可发起准备'
    if (room.can_host_close) return '可关闭'
    return room.state_label
  }
  const compactActivityStatuses = (statuses: string[]) => [...new Set(statuses.filter(Boolean))].slice(0, 6)
  const activityThemeClass = (theme: OnlineActivityTheme) => ({
    'border-rose-300/25 bg-rose-500/10 hover:border-rose-200/55 hover:bg-rose-500/15': theme === 'festival',
    'border-sky-300/25 bg-sky-500/10 hover:border-sky-200/55 hover:bg-sky-500/15': theme === 'expedition',
    'border-emerald-300/25 bg-emerald-500/10 hover:border-emerald-200/55 hover:bg-emerald-500/15': theme === 'manor',
  })
  const activityProgressClass = (theme: OnlineActivityTheme) => ({
    'bg-rose-300/80': theme === 'festival',
    'bg-sky-300/80': theme === 'expedition',
    'bg-emerald-300/80': theme === 'manor',
  })

  const setModuleError = (key: ModuleKey, message: string) => {
    moduleErrors.value = {
      ...moduleErrors.value,
      [key]: message,
    }
  }

  const runSummaryTask = async (key: ModuleKey, runner: () => Promise<unknown>, fallback: string) => {
    try {
      await runner()
      setModuleError(key, '')
    } catch (error) {
      setModuleError(key, normalizeError(error, fallback))
    }
  }

  const refreshOnlineSummary = async () => {
    if (refreshing.value) return
    refreshing.value = true
    await Promise.all([
      runSummaryTask('manor', async () => Promise.all([
        manorStore.refreshSnapshot('', { silent: true }),
        manorStore.refreshFavoriteOverview(),
      ]), '庄园摘要刷新失败'),
      runSummaryTask('cohabitation', () => cohabitationStore.refreshOverview({ silent: true }), '共同庄园摘要刷新失败'),
      runSummaryTask('neighbor', async () => Promise.all([
        socialStore.refreshProfile({ silent: true }),
        socialStore.refreshRelationships({ silent: true }),
        socialStore.refreshNeighborOverview({ silent: true }),
        socialStore.refreshSubscriptions(),
      ]), '邻里摘要刷新失败'),
      runSummaryTask('orders', () => coopOrderStore.refreshOverview({ silent: true }), '委托摘要刷新失败'),
      runSummaryTask('festival', async () => Promise.all([
        festivalRoomStore.refreshOverview({ silent: true }),
        expeditionRoomStore.refreshOverview({ silent: true }),
      ]), '节会摘要刷新失败'),
      runSummaryTask('society', () => societyStore.refreshOverview({ silent: true }), '村社摘要刷新失败'),
      runSummaryTask('mail', () => mailboxStore.refreshList({ silent: true }), '邮件摘要刷新失败'),
    ])
    lastRefreshedAt.value = Date.now()
    refreshing.value = false
  }

  const lastRefreshedLabel = computed(() => {
    if (refreshing.value && !lastRefreshedAt.value) return '正在刷新在线摘要'
    if (!lastRefreshedAt.value) return '尚未刷新在线摘要'
    const time = new Date(lastRefreshedAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `摘要更新于 ${time}`
  })

  const errorCount = computed(() => Object.values(moduleErrors.value).filter(Boolean).length)
  const roomInviteCount = computed(() => festivalRoomStore.invitedRooms.length + expeditionRoomStore.invitedRooms.length)
  const societyTodoCount = computed(() =>
    societyStore.incomingInvites.length
    + societyStore.managedRequests.length
    + societyStore.myPendingRequests.length
    + (societyStore.mySociety?.active_proposals.length ?? 0)
  )
  const relayOrderCount = computed(() =>
    coopOrderStore.visibleOrders.filter(order => order.collaboration_mode === 'multi_stage').length
  )
  const acceptedOrderCount = computed(() => coopOrderStore.myAcceptedOrders.length)
  const pendingCohabitationCount = computed(() => cohabitationStore.summary.pending)
  const claimableMailCount = computed(() =>
    mailboxStore.mails.filter(mail => mail.can_claim && !mail.is_claimed && !mail.is_expired).length
  )
  const unreadMailCount = computed(() => mailboxStore.inboxStatus.unread_count || mailboxStore.unreadCount)
  const manorCareTodo = computed(() => {
    const snapshot = manorStore.snapshot
    if (!snapshot || snapshot.viewer_is_owner !== false) return null
    if (snapshot.care_state.can_care) {
      return {
        status: '可照料',
        summary: `${snapshot.manor_name || snapshot.display_name || '好友庄园'} 有可照料对象，进入后查看剩余次数和结算提示。`,
      }
    }
    if (snapshot.steal_state.can_steal) {
      return {
        status: '可轻采',
        summary: `${snapshot.manor_name || snapshot.display_name || '好友庄园'} 允许轻采，进入后先确认主人保留和日上限。`,
      }
    }
    return null
  })
  const activeRoomLabel = computed(() => {
    if (festivalRoomStore.myRoom) return `节会房间：${festivalRoomStore.myRoom.state_label}`
    if (expeditionRoomStore.myRoom) return `远征房间：${expeditionRoomStore.myRoom.state_label}`
    if (roomInviteCount.value > 0) return `${roomInviteCount.value} 个房间邀请`
    return '可创建活动房间'
  })
  const activeRoomSummary = computed(() => {
    if (festivalRoomStore.myRoom) return festivalRoomStore.myRoom.title || festivalRoomStore.myRoom.template_label
    if (expeditionRoomStore.myRoom) return expeditionRoomStore.myRoom.title || expeditionRoomStore.myRoom.template_label
    if (roomInviteCount.value > 0) return '先处理邀请，再进入准备或玩法。'
    return '可从节会房间或远征房间开始。'
  })
  const invitationTargetRoute = computed<RouteLocationRaw>(() => {
    if (festivalRoomStore.invitedRooms.length > 0) return { name: 'online-festival', query: { tab: 'festival-room' } }
    if (expeditionRoomStore.invitedRooms.length > 0) return { name: 'online-festival', query: { tab: 'expedition-room' } }
    return { name: 'online-society', query: { tab: 'members' } }
  })
  const onlineCenterStatusCards = computed<OnlineCenterStatusCard[]>(() => [
    {
      id: 'activity',
      label: '活动房间',
      value: activeRoomLabel.value,
      summary: activeRoomSummary.value,
    },
    {
      id: 'society',
      label: '村社待办',
      value: societyTodoCount.value > 0 ? countLabel(societyTodoCount.value) : '暂无待办',
      summary: societyStore.mySociety ? `${societyStore.mySociety.name} · ${societyStore.mySociety.my_role_label || '成员'}` : '可进入村社创建或申请加入。',
    },
    {
      id: 'orders',
      label: '接力委托',
      value: relayOrderCount.value > 0 ? countLabel(relayOrderCount.value, '张') : '暂无接力',
      summary: `${coopOrderStore.visibleOrders.length} 张可见委托，适合顺手帮忙。`,
    },
  ])
  const todayTodoCards = computed<OnlineCenterTodoCard[]>(() => {
    const todos: OnlineCenterTodoCard[] = []
    if (roomInviteCount.value > 0) {
      todos.push({
        id: 'room-invites',
        label: '房间邀请',
        status: `${roomInviteCount.value} 个待确认`,
        summary: '先接受或拒绝节会 / 远征邀请，再进入准备大厅。',
        to: invitationTargetRoute.value,
        icon: Users,
        tone: 'urgent',
      })
    }
    if (pendingCohabitationCount.value > 0) {
      todos.push({
        id: 'cohabitation-pending',
        label: '共同庄园确认',
        status: `${pendingCohabitationCount.value} 份待确认`,
        summary: '确认契约成员、个人资产边界和共同基金规则后再接受。',
        to: { name: 'online-cohabitation', query: { tab: 'overview' } },
        icon: HeartHandshake,
        tone: 'urgent',
      })
    }
    if (manorCareTodo.value) {
      todos.push({
        id: 'manor-care',
        label: '好友庄园照料',
        status: manorCareTodo.value.status,
        summary: manorCareTodo.value.summary,
        to: { name: 'online-manor', query: { tab: 'care' } },
        icon: Home,
        tone: 'default',
      })
    }
    if (relayOrderCount.value > 0 || acceptedOrderCount.value > 0) {
      todos.push({
        id: 'coop-orders',
        label: '互助委托',
        status: relayOrderCount.value > 0 ? `${relayOrderCount.value} 张接力单` : `${acceptedOrderCount.value} 张已接单`,
        summary: relayOrderCount.value > 0 ? '有多段接力委托可接，适合顺手补材料或加工。' : '已有接单等待交付或查看分账。',
        to: { name: 'online-orders', query: { tab: relayOrderCount.value > 0 ? 'available' : 'accepted' } },
        icon: Handshake,
        tone: 'default',
      })
    }
    if (claimableMailCount.value > 0 || unreadMailCount.value > 0) {
      todos.push({
        id: 'mail-rewards',
        label: '奖励 / 邮件',
        status: claimableMailCount.value > 0 ? `${claimableMailCount.value} 封可领取` : `${unreadMailCount.value} 封未读`,
        summary: claimableMailCount.value > 0 ? '活动奖励或补偿邮件可领取，进入邮箱确认写入状态。' : '有新邮件可读，奖励邮件会在详情里提示领取。',
        to: { name: 'mail' },
        icon: Inbox,
        tone: 'reward',
      })
    }
    if (todos.length > 0) return todos.slice(0, 5)
    return [{
      id: 'create-room',
      label: '创建活动房间',
      status: '暂无紧急待办',
      summary: '现在可以开一个节会房或远征房，邀请好友进入准备大厅。',
      to: { name: 'online-festival', query: { tab: 'festival-room' } },
      icon: CalendarDays,
      tone: 'default',
    }]
  })
  const onlineCenterTodoSummary = computed(() => {
    const actionableCount = todayTodoCards.value.filter(todo => todo.id !== 'create-room').length
    return actionableCount > 0 ? `${actionableCount} 项需要处理` : '没有待处理事项'
  })
  const festivalActivityCard = computed<OnlineActivityCard>(() => {
    const room = festivalRoomStore.myRoom
    const inviteCount = festivalRoomStore.invitedRooms.length
    const visibleCount = festivalRoomStore.visibleRooms.length
    const receiptCount = festivalRoomStore.recentReceipts.length
    return {
      id: 'festival',
      theme: 'festival',
      eyebrow: '节会 · 市集 · 灯会',
      title: room ? room.title : '节会小游戏',
      summary: room
        ? `${room.gameplay.objective_label}，当前 ${room.gameplay.progress_text}。`
        : '灯谜、花灯、赛舟和集市小游戏集中在节会房，适合 2-8 人短局。',
      stateLabel: room ? roomPrimaryStateLabel(room) : inviteCount > 0 ? `${inviteCount} 个邀请待确认` : visibleCount > 0 ? `${visibleCount} 间可加入` : '可邀请好友开房',
      todayLabel: room ? `${room.joined_member_count}/${room.member_limit} 人 · ${room.gameplay.phase_label}` : visibleCount > 0 ? '今日可加入' : '今日可开房',
      weeklyRewardLabel: receiptCount > 0 ? `${receiptCount} 条结算 / 纪念记录` : '本周奖励剩余：待结算',
      actionLabel: room ? roomPrimaryStateLabel(room) : inviteCount > 0 ? '处理邀请' : '邀请好友',
      progressPercent: progressFromRoom(room, receiptCount > 0 ? 35 : visibleCount > 0 ? 20 : 8),
      to: { name: 'online-festival', query: { tab: 'festival-room' } },
      icon: Lamp,
      statuses: compactActivityStatuses([
        room ? room.state_label : '',
        inviteCount > 0 ? '可加入' : visibleCount > 0 ? '可加入' : '可邀请',
        room?.can_host_settle ? '可结算' : '',
        receiptCount > 0 ? '今日已完成' : '',
        '本周奖励剩余',
      ]),
      stats: [
        { label: '可见房', value: countLabel(visibleCount, '间') },
        { label: '邀请', value: countLabel(inviteCount) },
        { label: '纪念', value: countLabel(festivalRoomStore.recentMemorials.length) },
      ],
      collaborationRoles: ['点灯 / 解谜', '摆摊 / 供品', '秩序 / 互动', '留影 / 结算'],
      rewardPreview: ['节会票券', '留影纪念', '称号 / 人气', '好友回看'],
    }
  })
  const expeditionActivityCard = computed<OnlineActivityCard>(() => {
    const room = expeditionRoomStore.myRoom
    const inviteCount = expeditionRoomStore.invitedRooms.length
    const visibleCount = expeditionRoomStore.visibleRooms.length
    const receiptCount = expeditionRoomStore.recentReceipts.length
    return {
      id: 'expedition',
      theme: 'expedition',
      eyebrow: '远征 · 地图 · 战利品',
      title: room ? room.title : '资源护送',
      summary: room
        ? `${room.gameplay.objective_label}，当前 ${room.gameplay.progress_text}。`
        : '短路线、护送、遭遇战和遗迹探索集中到远征房，强调分工推进。',
      stateLabel: room ? roomPrimaryStateLabel(room) : inviteCount > 0 ? `${inviteCount} 个远征邀请` : visibleCount > 0 ? `${visibleCount} 间队伍可加入` : '可创建远征队伍',
      todayLabel: room ? `${room.joined_member_count}/${room.member_limit} 人 · ${room.gameplay.phase_label}` : '今日推荐：2-5 分钟短局',
      weeklyRewardLabel: receiptCount > 0 ? `${receiptCount} 条战利品记录` : '本周奖励剩余：路线待完成',
      actionLabel: room ? roomPrimaryStateLabel(room) : inviteCount > 0 ? '处理邀请' : '创建队伍',
      progressPercent: progressFromRoom(room, receiptCount > 0 ? 35 : visibleCount > 0 ? 22 : 10),
      to: { name: 'online-festival', query: { tab: 'expedition-room' } },
      icon: Pickaxe,
      statuses: compactActivityStatuses([
        room ? room.state_label : '',
        inviteCount > 0 ? '可加入' : visibleCount > 0 ? '可加入' : '可邀请',
        room?.can_host_settle ? '可结算' : '',
        receiptCount > 0 ? '今日已完成' : '',
        '本周奖励剩余',
      ]),
      stats: [
        { label: '队伍', value: countLabel(visibleCount, '间') },
        { label: '邀请', value: countLabel(inviteCount) },
        { label: '结算', value: countLabel(receiptCount) },
      ],
      collaborationRoles: ['采集 / 探路', '护送 / 战斗', '补给 / 支援', '撤离 / 结算'],
      rewardPreview: ['路线战利品', '节点贡献', '协作称号', '回放记录'],
    }
  })
  const manorActivityCard = computed<OnlineActivityCard>(() => {
    const snapshot = manorStore.snapshot
    const careTodo = manorCareTodo.value
    const favoriteCount = manorStore.favoriteOverview?.favorites.length ?? 0
    const hotCount = manorStore.favoriteOverview?.hot_manors.length ?? 0
    const activeContractCount = cohabitationStore.summary.active
    const progressSeed = [
      careTodo ? 25 : 0,
      favoriteCount > 0 ? 20 : 0,
      hotCount > 0 ? 20 : 0,
      activeContractCount > 0 ? 25 : 0,
    ].reduce((sum, value) => sum + value, 10)
    return {
      id: 'manor',
      theme: 'manor',
      eyebrow: '庄园 · 协作经营 · 共同建设',
      title: snapshot?.theme_week?.active_theme || snapshot?.showcase_theme || '庄园协作',
      summary: careTodo?.summary || '共同浇灌、动物护理、作坊接力和访客订单都从庄园入口串起来。',
      stateLabel: careTodo ? careTodo.status : pendingCohabitationCount.value > 0 ? `${pendingCohabitationCount.value} 份契约待确认` : activeContractCount > 0 ? `${activeContractCount} 份共同庄园` : '可拜访 / 可展示',
      todayLabel: careTodo ? '今日可协助好友' : snapshot ? '今日可更新展示' : '今日可同步庄园',
      weeklyRewardLabel: activeContractCount > 0 ? '本周共同目标：可推进' : '本周奖励剩余：友情点 / 纪念',
      actionLabel: careTodo ? '去照料' : pendingCohabitationCount.value > 0 ? '确认契约' : '查看庄园',
      progressPercent: clampPercent(progressSeed),
      to: careTodo ? { name: 'online-manor', query: { tab: 'care' } } : { name: 'online-manor' },
      icon: Home,
      statuses: compactActivityStatuses([
        careTodo ? '可加入' : '可邀请',
        pendingCohabitationCount.value > 0 ? '可结算' : '',
        snapshot ? '今日已同步' : '',
        '本周奖励剩余',
      ]),
      stats: [
        { label: '好友收藏', value: countLabel(favoriteCount) },
        { label: '热门庄园', value: countLabel(hotCount) },
        { label: '共同契约', value: countLabel(cohabitationStore.summary.total, '份') },
      ],
      collaborationRoles: ['共同浇灌', '动物护理', '作坊接力', '访客订单'],
      rewardPreview: ['友情点', '轻伴手礼', '协作经验', '庄园称号'],
    }
  })
  const onlineThemeActivityCards = computed<OnlineActivityCard[]>(() => [
    festivalActivityCard.value,
    expeditionActivityCard.value,
    manorActivityCard.value,
  ])
  const pickDailyActivityCards = (cards: OnlineDailyActivityCard[]) => {
    const seen = new Set<string>()
    return [...cards]
      .sort((left, right) => right.priority - left.priority || right.progressPercent - left.progressPercent)
      .filter(card => {
        if (seen.has(card.id)) return false
        seen.add(card.id)
        return true
      })
      .slice(0, 3)
  }
  const onlineDailyActivityCards = computed<OnlineDailyActivityCard[]>(() => {
    const festivalRoom = festivalRoomStore.myRoom
    const expeditionRoom = expeditionRoomStore.myRoom
    const festivalInviteCount = festivalRoomStore.invitedRooms.length
    const expeditionInviteCount = expeditionRoomStore.invitedRooms.length
    const candidates: OnlineDailyActivityCard[] = []
    const pushCandidate = (card: OnlineDailyActivityCard) => {
      candidates.push(card)
    }

    if (festivalInviteCount + expeditionInviteCount > 0) {
      pushCandidate({
        id: 'handle-room-invites',
        theme: festivalInviteCount > 0 ? 'festival' : 'expedition',
        eyebrow: '今日优先 · 好友正在等',
        title: '处理房间邀请',
        stateLabel: `${festivalInviteCount + expeditionInviteCount} 个待确认`,
        summary: '先把节会或远征邀请处理掉，接下来的准备、开始和结算都会接到同一条房间线。',
        reasonLabel: '推荐原因：有人已经发起组队',
        durationLabel: '预计耗时：1 分钟内确认',
        rewardLabel: '奖励预期：进入短局、准备或领奖链路',
        teamworkLabel: '协作人数：按邀请房间队伍人数',
        progressPercent: 100,
        priority: 120,
        to: invitationTargetRoute.value,
        icon: Users,
      })
    }

    if (festivalRoom) {
      pushCandidate({
        id: 'continue-festival-room',
        theme: 'festival',
        eyebrow: '今日优先 · 节会房进行中',
        title: festivalRoom.title || festivalRoom.template_label,
        stateLabel: roomPrimaryStateLabel(festivalRoom) || festivalRoom.state_label,
        summary: `${festivalRoom.gameplay.objective_label}，当前 ${festivalRoom.gameplay.progress_text}。`,
        reasonLabel: '推荐原因：已有房间可继续推进',
        durationLabel: '预计耗时：2-5 分钟短局',
        rewardLabel: festivalRoom.can_host_settle ? '奖励预期：可结算节会票券 / 纪念' : '奖励预期：推进本周节会进度',
        teamworkLabel: `协作人数：${festivalRoom.members.length}/${festivalRoom.member_limit} 人`,
        progressPercent: progressFromRoom(festivalRoom, 60),
        priority: festivalRoom.can_host_settle ? 116 : 108,
        to: { name: 'online-festival', query: { tab: 'festival-room' } },
        icon: Lamp,
      })
    }

    if (expeditionRoom) {
      pushCandidate({
        id: 'continue-expedition-room',
        theme: 'expedition',
        eyebrow: '今日优先 · 远征队进行中',
        title: expeditionRoom.title || expeditionRoom.template_label,
        stateLabel: roomPrimaryStateLabel(expeditionRoom) || expeditionRoom.state_label,
        summary: `${expeditionRoom.gameplay.objective_label}，当前 ${expeditionRoom.gameplay.progress_text}。`,
        reasonLabel: '推荐原因：队伍路线已经开局',
        durationLabel: '预计耗时：2-5 分钟护送 / 探索',
        rewardLabel: expeditionRoom.can_host_settle ? '奖励预期：可结算战利品 / 护送评分' : '奖励预期：推进远征图鉴',
        teamworkLabel: `协作人数：${expeditionRoom.members.length}/${expeditionRoom.member_limit} 人`,
        progressPercent: progressFromRoom(expeditionRoom, 55),
        priority: expeditionRoom.can_host_settle ? 114 : 106,
        to: { name: 'online-festival', query: { tab: 'expedition-room' } },
        icon: Pickaxe,
      })
    }

    if (claimableMailCount.value > 0 || unreadMailCount.value > 0) {
      pushCandidate({
        id: 'claim-online-rewards',
        theme: 'festival',
        eyebrow: '今日优先 · 奖励别漏',
        title: claimableMailCount.value > 0 ? '领取联机奖励' : '查看联机邮件',
        stateLabel: claimableMailCount.value > 0 ? `${claimableMailCount.value} 封可领取` : `${unreadMailCount.value} 封未读`,
        summary: '把离线协作、活动补偿和房间结算回执集中收口，避免玩家做完短局却不知道奖励在哪。',
        reasonLabel: claimableMailCount.value > 0 ? '推荐原因：已有奖励待入账' : '推荐原因：有新回执待查看',
        durationLabel: '预计耗时：1 分钟',
        rewardLabel: '奖励预期：铜钱 / 材料 / 好友币 / 补偿',
        teamworkLabel: '协作人数：离线协作也计入',
        progressPercent: claimableMailCount.value > 0 ? 100 : 55,
        priority: claimableMailCount.value > 0 ? 102 : 72,
        to: { name: 'mail' },
        icon: Inbox,
      })
    }

    if (relayOrderCount.value > 0 || acceptedOrderCount.value > 0) {
      pushCandidate({
        id: 'daily-relay-orders',
        theme: 'manor',
        eyebrow: '今日推荐 · 轻协作',
        title: relayOrderCount.value > 0 ? '接一张互助委托' : '推进已接委托',
        stateLabel: relayOrderCount.value > 0 ? `${relayOrderCount.value} 张可接` : `${acceptedOrderCount.value} 张已接`,
        summary: '接力委托适合没有固定队友时顺手做一段，能补材料、加工或交付进度。',
        reasonLabel: '推荐原因：不需要同时在线',
        durationLabel: '预计耗时：1-3 分钟',
        rewardLabel: '奖励预期：好友币 / 分账 / 本周进度',
        teamworkLabel: '协作人数：异步多人接力',
        progressPercent: relayOrderCount.value > 0 ? 76 : 64,
        priority: 92,
        to: { name: 'online-orders', query: { tab: relayOrderCount.value > 0 ? 'available' : 'accepted' } },
        icon: Handshake,
      })
    }

    if (manorCareTodo.value || pendingCohabitationCount.value > 0) {
      pushCandidate({
        id: 'daily-manor-care',
        theme: 'manor',
        eyebrow: '今日推荐 · 庄园协作',
        title: manorCareTodo.value ? '照料好友庄园' : '确认共同庄园',
        stateLabel: manorCareTodo.value ? manorCareTodo.value.status : `${pendingCohabitationCount.value} 份待确认`,
        summary: manorCareTodo.value?.summary || '确认共同庄园后，可把农田、仓库、基金和设施借用串成长期协作。',
        reasonLabel: '推荐原因：好友不在线也能推进',
        durationLabel: '预计耗时：1-3 分钟',
        rewardLabel: '奖励预期：友情点 / 协作经验 / 庄园称号',
        teamworkLabel: '协作人数：好友庄园 / 共同庄园',
        progressPercent: manorCareTodo.value ? 82 : 48,
        priority: manorCareTodo.value ? 88 : 70,
        to: manorCareTodo.value ? { name: 'online-manor', query: { tab: 'care' } } : { name: 'online-cohabitation', query: { tab: 'overview' } },
        icon: Home,
      })
    }

    pushCandidate({
      id: 'daily-lantern-riddle',
      theme: 'festival',
      eyebrow: '今日推荐 · 2-5 分钟短局',
      title: '灯谜竞猜',
      stateLabel: festivalRoomStore.visibleRooms.some(room => room.template_id === 'lantern_fair') ? '有房可加入' : '可邀请开局',
      summary: '抢答、整理题签、观众秩序和隐藏题签一起影响结算，适合把节会做成快速组队入口。',
      reasonLabel: '推荐原因：低成本、适合拉好友',
      durationLabel: '预计耗时：2-5 分钟',
      rewardLabel: '奖励预期：节会票券 / 纪念册 / 保底协作经验',
      teamworkLabel: '协作人数：2-8 人',
      progressPercent: festivalRoomStore.visibleRooms.some(room => room.template_id === 'lantern_fair') ? 72 : 44,
      priority: 64,
      to: { name: 'online-festival', query: { tab: 'festival-room', template: 'lantern_fair', gameplay: 'quiz_buzz', open_wizard: '1' } },
      icon: Lamp,
    })

    pushCandidate({
      id: 'daily-resource-escort',
      theme: 'expedition',
      eyebrow: '今日推荐 · 2-5 分钟短局',
      title: '资源护送',
      stateLabel: expeditionRoomStore.visibleRooms.some(room => room.template_id === 'escort_convoy') ? '有队可加入' : '可邀请组队',
      summary: '路线、天气、破车事件和货物完整度共同结算，给远征玩家一个更像任务的短局。',
      reasonLabel: '推荐原因：路线感强、结算清楚',
      durationLabel: '预计耗时：2-5 分钟',
      rewardLabel: '奖励预期：远征材料 / 护送评分 / 保底友情点',
      teamworkLabel: '协作人数：2-4 人',
      progressPercent: expeditionRoomStore.visibleRooms.some(room => room.template_id === 'escort_convoy') ? 70 : 42,
      priority: 62,
      to: { name: 'online-festival', query: { tab: 'expedition-room', template: 'escort_convoy', gameplay: 'expedition_escort', open_wizard: '1' } },
      icon: Pickaxe,
    })

    pushCandidate({
      id: 'daily-friend-help',
      theme: 'manor',
      eyebrow: '今日推荐 · 没人组队也能做',
      title: '每日互助',
      stateLabel: socialStore.friends.length > 0 ? `${socialStore.friends.length} 位好友` : '可发现好友',
      summary: '把留言礼物、照料、轻采和好友挑战放到轻互动链路里，避免联机只剩建房。',
      reasonLabel: '推荐原因：单人也能留下互动',
      durationLabel: '预计耗时：1-3 分钟',
      rewardLabel: '奖励预期：好友币 / 材料 / 新人协助奖励',
      teamworkLabel: '协作人数：好友异步参与',
      progressPercent: socialStore.friends.length > 0 ? 58 : 34,
      priority: 50,
      to: { name: 'online-neighbor', query: { tab: socialStore.friends.length > 0 ? 'friends' : 'discover' } },
      icon: MessageCircle,
    })

    return pickDailyActivityCards(candidates)
  })
  const onlinePlayableMiniGameCards = computed<OnlinePlayableMiniGameCard[]>(() => {
    const festivalRoom = festivalRoomStore.myRoom
    const expeditionRoom = expeditionRoomStore.myRoom
    const hasLanternRoom = festivalRoom?.template_id === 'lantern_fair'
    const hasEscortRoom = expeditionRoom?.template_id === 'escort_convoy'
    const lanternVisibleCount = festivalRoomStore.visibleRooms.filter(room => room.template_id === 'lantern_fair').length
    const escortVisibleCount = expeditionRoomStore.visibleRooms.filter(room => room.template_id === 'escort_convoy').length
    return [
      {
        id: 'lantern-riddle',
        theme: 'festival',
        title: '灯谜竞猜',
        status: hasLanternRoom ? roomPrimaryStateLabel(festivalRoom) : lanternVisibleCount > 0 ? `${lanternVisibleCount} 间可加入` : '可邀请开局',
        summary: '2-5 分钟短局，抢答、整理题签和观众秩序一起影响结算。',
        eventHooks: ['灯谜连发', 'NPC 乱入', '隐藏题签'],
        rewardHint: '节会票券 / 纪念册 / 失败保底协作经验',
        to: { name: 'online-festival', query: { tab: 'festival-room', template: 'lantern_fair', gameplay: 'quiz_buzz', open_wizard: '1' } },
        icon: Lamp,
      },
      {
        id: 'stall-relay',
        theme: 'festival',
        title: '摆摊接力',
        status: festivalRoom ? roomPrimaryStateLabel(festivalRoom) : '可邀请好友',
        summary: '分工备料、分拣和提交，适合把节会订单做成多人接力。',
        eventHooks: ['客流波动', '季节订单', '隐藏伴手礼'],
        rewardHint: '好友币 / 节庆订单分 / 本周进度',
        to: { name: 'online-festival', query: { tab: 'festival-room', template: 'laba_cookpot', gameplay: 'gathering', open_wizard: '1' } },
        icon: ClipboardList,
      },
      {
        id: 'resource-escort',
        theme: 'expedition',
        title: '资源护送',
        status: hasEscortRoom ? roomPrimaryStateLabel(expeditionRoom) : escortVisibleCount > 0 ? `${escortVisibleCount} 队可加入` : '可邀请组队',
        summary: '2-5 分钟短局，护送里程、货物完整度和途中事件共同结算。',
        eventHooks: ['天气影响', '破车事件', '夜巡隐藏目标'],
        rewardHint: '远征材料 / 护送评分 / 失败保底友情点',
        to: { name: 'online-festival', query: { tab: 'expedition-room', template: 'escort_convoy', gameplay: 'expedition_escort', open_wizard: '1' } },
        icon: Pickaxe,
      },
      {
        id: 'shared-care',
        theme: 'manor',
        title: '共同浇灌',
        status: manorCareTodo.value ? manorCareTodo.value.status : '可拜访照料',
        summary: '好友不在线也能留下照料记录，把庄园协作做成轻量日常。',
        eventHooks: ['天气加成', '动物心情', '设施借用'],
        rewardHint: '友情点 / 协作经验 / 庄园称号进度',
        to: { name: 'online-manor', query: { tab: 'care' } },
        icon: Home,
      },
      {
        id: 'daily-help',
        theme: 'manor',
        title: '每日互助',
        status: relayOrderCount.value > 0 ? `${relayOrderCount.value} 张接力单` : '可留下委托',
        summary: '留言礼物、好友挑战和异步委托放到同一条轻协作入口里。',
        eventHooks: ['好友挑战', '留言礼物', '异步奖励'],
        rewardHint: '每日材料 / 好友币 / 新人协助奖励',
        to: { name: 'online-orders', query: { tab: relayOrderCount.value > 0 ? 'available' : 'publish' } },
        icon: Handshake,
      },
    ]
  })
  const onlineAsyncCollaborationCards = computed<OnlineAsyncCollaborationCard[]>(() => {
    const friendCount = socialStore.friends.length
    const activeCohabitationCount = cohabitationStore.summary.active
    const totalCohabitationCount = cohabitationStore.summary.total
    const hasClaimableReward = claimableMailCount.value > 0
    return [
      {
        id: 'leave-commission',
        theme: 'manor',
        title: '留下委托',
        status: '可发布',
        summary: '把缺材料、加工或交付拆成异步求助单，好友上线后能直接接下一段。',
        rewardHint: '好友币 / 委托分账 / 本周接力进度',
        impactLabel: `${coopOrderStore.visibleOrders.length} 张委托可见`,
        actionLabel: '去发布',
        to: { name: 'online-orders', query: { tab: 'publish' } },
        icon: ClipboardList,
        ready: true,
      },
      {
        id: 'send-helper',
        theme: 'manor',
        title: '派出帮手',
        status: manorCareTodo.value ? manorCareTodo.value.status : friendCount > 0 ? `${friendCount} 位好友可互助` : '待发现好友',
        summary: '把浇灌、喂食、除虫或轻采做成一次短动作，离线好友也能收到记录。',
        rewardHint: '友情点 / 协作经验 / 庄园称号进度',
        impactLabel: manorCareTodo.value ? '今日有照料目标' : '可从好友庄园开始',
        actionLabel: '去照料',
        to: { name: 'online-manor', query: { tab: 'care' } },
        icon: Handshake,
        ready: Boolean(manorCareTodo.value || friendCount > 0),
      },
      {
        id: 'borrow-facility',
        theme: 'manor',
        title: '借用庄园设施',
        status: activeCohabitationCount > 0 ? `${activeCohabitationCount} 份共同庄园` : pendingCohabitationCount.value > 0 ? `${pendingCohabitationCount.value} 份待确认` : '可建立契约',
        summary: '从共同地图进入农田、仓库和建筑经营，把设施借用变成有记录的异步协作。',
        rewardHint: '共同产出 / 仓库记录 / 建设贡献',
        impactLabel: `${totalCohabitationCount} 份契约记录`,
        actionLabel: activeCohabitationCount > 0 ? '去设施' : '看契约',
        to: { name: 'online-cohabitation', query: { tab: activeCohabitationCount > 0 ? 'map' : 'overview' } },
        icon: Warehouse,
        ready: activeCohabitationCount > 0 || pendingCohabitationCount.value > 0,
      },
      {
        id: 'claim-async-rewards',
        theme: 'festival',
        title: '领取异步协作奖励',
        status: hasClaimableReward ? `${claimableMailCount.value} 封可领取` : unreadMailCount.value > 0 ? `${unreadMailCount.value} 封未读` : '待奖励入账',
        summary: '把离线委托、照料、补偿和活动邮件集中收口，减少玩家错过回报。',
        rewardHint: '铜钱 / 材料 / 好友币 / 补偿邮件',
        impactLabel: hasClaimableReward ? '有奖励待领取' : '邮件箱会保留回执',
        actionLabel: '去领取',
        to: { name: 'mail' },
        icon: Inbox,
        ready: hasClaimableReward || unreadMailCount.value > 0,
      },
    ]
  })
  const onlineAsyncCollaborationReadyCount = computed(() =>
    onlineAsyncCollaborationCards.value.filter(card => card.ready).length
  )
  const onlineAsyncCollaborationSummary = computed(() =>
    `${onlineAsyncCollaborationReadyCount.value}/${onlineAsyncCollaborationCards.value.length} 项可推进`
  )
  const onlineActivityCenterSummary = computed(() => {
    const activeCount = onlineThemeActivityCards.value.filter(activity =>
      activity.stateLabel.includes('可') || activity.stateLabel.includes('邀请') || activity.stateLabel.includes('进行') || activity.stateLabel.includes('待确认')
    ).length
    return `${onlineThemeActivityCards.value.length} 类主题 · ${activeCount} 类可推进`
  })
  const onlineWeeklyRewardSteps = computed<OnlineWeeklyRewardStep[]>(() => [
    {
      id: 'festival-receipts',
      label: '节会纪念 / 结算',
      summary: festivalRoomStore.recentReceipts.length > 0
        ? `已有 ${festivalRoomStore.recentReceipts.length} 条节会结算记录。`
        : '完成一次节会房短局后可查看纪念或结算记录。',
      status: festivalRoomStore.recentReceipts.length > 0 ? '已推进' : '待完成',
      to: { name: 'online-festival', query: { tab: 'memorials' } },
      completed: festivalRoomStore.recentReceipts.length > 0,
    },
    {
      id: 'expedition-receipts',
      label: '远征路线 / 战利品',
      summary: expeditionRoomStore.recentReceipts.length > 0
        ? `已有 ${expeditionRoomStore.recentReceipts.length} 条远征战利品记录。`
        : '完成一条资源护送或小矿洞路线后回看贡献。',
      status: expeditionRoomStore.recentReceipts.length > 0 ? '已推进' : '待完成',
      to: { name: 'online-festival', query: { tab: 'expedition-room' } },
      completed: expeditionRoomStore.recentReceipts.length > 0,
    },
    {
      id: 'relay-orders',
      label: '公共订单接力',
      summary: relayOrderCount.value > 0
        ? `${relayOrderCount.value} 张接力委托可接。`
        : `${acceptedOrderCount.value} 张已接单 / 可查看交付。`,
      status: relayOrderCount.value > 0 || acceptedOrderCount.value > 0 ? '可推进' : '待接单',
      to: { name: 'online-orders', query: { tab: relayOrderCount.value > 0 ? 'available' : 'accepted' } },
      completed: acceptedOrderCount.value > 0,
    },
    {
      id: 'society-weekly',
      label: '村社周结算',
      summary: societyStore.mySociety?.public_warehouse.weekly_settlement
        ? `${societyStore.mySociety.public_warehouse.weekly_settlement.status_label} · ${societyStore.mySociety.public_warehouse.weekly_settlement.total_points} 分`
        : '加入村社后通过公共仓廪、工程或提案推进周目标。',
      status: societyStore.mySociety?.public_warehouse.weekly_settlement ? '可查看' : '待加入',
      to: { name: 'online-society', query: { tab: 'storage' } },
      completed: Boolean(societyStore.mySociety?.public_warehouse.weekly_settlement),
    },
  ])
  const onlineWeeklyRewardCompletedCount = computed(() =>
    onlineWeeklyRewardSteps.value.filter(step => step.completed).length
  )
  const onlineWeeklyRewardProgressPercent = computed(() =>
    clampPercent((onlineWeeklyRewardCompletedCount.value / Math.max(1, onlineWeeklyRewardSteps.value.length)) * 100)
  )
  const onlineWeeklyRewardProgressLabel = computed(() =>
    `${onlineWeeklyRewardCompletedCount.value}/${onlineWeeklyRewardSteps.value.length}`
  )
  const onlineWeeklyRewardSummary = computed(() =>
    `${onlineWeeklyRewardCompletedCount.value} 项已推进，剩余 ${onlineWeeklyRewardSteps.value.length - onlineWeeklyRewardCompletedCount.value} 项可补。`
  )
  const onlineTotalReceiptCount = computed(() =>
    festivalRoomStore.recentReceipts.length + expeditionRoomStore.recentReceipts.length
  )
  const onlineCollectionGoalCount = computed(() => [
    festivalRoomStore.recentReceipts.length > 0 || festivalRoomStore.recentMemorials.length > 0,
    expeditionRoomStore.recentReceipts.length > 0,
    socialStore.friends.length > 0,
    cohabitationStore.summary.total > 0,
  ].filter(Boolean).length)
  const onlineRewardPathCards = computed<OnlineRewardPathCard[]>(() => {
    const dailyReadyCount = [
      claimableMailCount.value > 0 || unreadMailCount.value > 0,
      relayOrderCount.value > 0 || acceptedOrderCount.value > 0,
      Boolean(manorCareTodo.value),
      roomInviteCount.value > 0 || Boolean(festivalRoomStore.myRoom || expeditionRoomStore.myRoom),
    ].filter(Boolean).length
    const collaborationReadyCount = [
      Boolean(festivalRoomStore.myRoom || expeditionRoomStore.myRoom),
      onlineTotalReceiptCount.value > 0,
      cohabitationStore.summary.active > 0,
      socialStore.friends.length > 0,
    ].filter(Boolean).length

    return [
      {
        id: 'daily-rewards',
        theme: 'festival',
        layerLabel: '每日奖励',
        title: '今日联机回报',
        status: claimableMailCount.value > 0 ? `${claimableMailCount.value} 封可领取` : dailyReadyCount > 0 ? `${dailyReadyCount} 项可推进` : '待开局',
        summary: '短局、互助、邮件和好友币集中成每日小回报，避免玩家点完不知道收益在哪。',
        rewardItems: ['铜钱', '材料', '好友币', '联机经验'],
        progressLabel: `${dailyReadyCount}/4 今日线索`,
        progressPercent: clampPercent((dailyReadyCount / 4) * 100),
        actionLabel: claimableMailCount.value > 0 ? '领奖' : '去推进',
        to: claimableMailCount.value > 0 ? { name: 'mail' } : { name: 'online-orders', query: { tab: relayOrderCount.value > 0 ? 'available' : 'publish' } },
        icon: Inbox,
        ready: dailyReadyCount > 0,
      },
      {
        id: 'weekly-rewards',
        theme: 'expedition',
        layerLabel: '每周奖励',
        title: '本周联机进度',
        status: `${onlineWeeklyRewardCompletedCount.value}/${onlineWeeklyRewardSteps.value.length} 项已推进`,
        summary: '把节会纪念、远征战利品、公共订单和村社周结算合成一条每周追踪。',
        rewardItems: ['稀有材料', '潜能资源', '专属装饰', '限定称号'],
        progressLabel: onlineWeeklyRewardSummary.value,
        progressPercent: onlineWeeklyRewardProgressPercent.value,
        actionLabel: '看周进度',
        to: { name: 'online-festival', query: { tab: 'festival-room' } },
        icon: CalendarDays,
        ready: onlineWeeklyRewardCompletedCount.value > 0,
      },
      {
        id: 'collaboration-rewards',
        theme: 'manor',
        layerLabel: '协作奖励',
        title: '队伍连携与好友默契',
        status: collaborationReadyCount > 0 ? `${collaborationReadyCount} 条协作信号` : '待组队',
        summary: '把房主、队友、好友和新人协助收益说清楚，让组队不只是凑人数。',
        rewardItems: ['队伍连携加成', '好友默契等级', '房主额外奖励', '新人协助奖励'],
        progressLabel: onlineTotalReceiptCount.value > 0 ? `${onlineTotalReceiptCount.value} 条结算可回看` : activeRoomLabel.value,
        progressPercent: clampPercent((collaborationReadyCount / 4) * 100),
        actionLabel: '去组队',
        to: festivalRoomStore.myRoom
          ? { name: 'online-festival', query: { tab: 'festival-room' } }
          : expeditionRoomStore.myRoom
            ? { name: 'online-festival', query: { tab: 'expedition-room' } }
            : { name: 'online-neighbor' },
        icon: HeartHandshake,
        ready: collaborationReadyCount > 0,
      },
      {
        id: 'long-term-rewards',
        theme: 'festival',
        layerLabel: '长线奖励',
        title: '收集、等级和限定外观',
        status: `${onlineCollectionGoalCount.value}/4 类已起步`,
        summary: '把纪念册、图鉴、好友徽章和庄园称号作为长期目标，给短局一个可积累的方向。',
        rewardItems: ['联机等级', '小游戏熟练度', '赛季进度', '稀有外观/家具'],
        progressLabel: `纪念 ${festivalRoomStore.recentMemorials.length} · 战利品 ${expeditionRoomStore.recentReceipts.length}`,
        progressPercent: clampPercent((onlineCollectionGoalCount.value / 4) * 100),
        actionLabel: '看收集',
        to: { name: 'online-festival', query: { tab: festivalRoomStore.recentMemorials.length > 0 ? 'memorials' : 'festival-room' } },
        icon: ShieldCheck,
        ready: onlineCollectionGoalCount.value > 0,
      },
    ]
  })
  const onlineRewardPathReadyCount = computed(() =>
    onlineRewardPathCards.value.filter(card => card.ready).length
  )
  const onlineRewardPathSummary = computed(() =>
    `${onlineRewardPathReadyCount.value}/${onlineRewardPathCards.value.length} 层已有进度`
  )
  const onlineRewardClaimPlanCards = computed<OnlineRewardClaimPlanCard[]>(() => {
    const activeRoom = festivalRoomStore.myRoom || expeditionRoomStore.myRoom
    const nextWeeklyStep = onlineWeeklyRewardSteps.value.find(step => !step.completed) ?? onlineWeeklyRewardSteps.value[0]
    const collaborationSignalCount = [
      Boolean(activeRoom),
      roomInviteCount.value > 0,
      onlineTotalReceiptCount.value > 0,
      socialStore.friends.length > 0,
      cohabitationStore.summary.active > 0,
    ].filter(Boolean).length
    const longTermProofCount =
      festivalRoomStore.recentMemorials.length
      + festivalRoomStore.recentReceipts.length
      + expeditionRoomStore.recentReceipts.length
      + Math.min(3, socialStore.friends.length)
      + Math.min(3, cohabitationStore.summary.total)

    return [
      {
        id: 'daily-cashout',
        theme: 'festival',
        layerLabel: '今日兑现',
        title: '把能领的奖励先落袋',
        status: claimableMailCount.value > 0
          ? `${claimableMailCount.value} 封可领取`
          : unreadMailCount.value > 0
            ? `${unreadMailCount.value} 封待查看`
            : `${todayTodoCards.value.length} 个今日入口`,
        nextActionLabel: claimableMailCount.value > 0
          ? '下一步：进入邮箱领取奖励邮件。'
          : '下一步：从今日推荐里完成一个 2-5 分钟入口。',
        rewardLabel: '奖励：铜钱、材料、好友币和联机经验优先结算。',
        proofLabel: claimableMailCount.value > 0
          ? '凭证：邮箱已有奖励待入账。'
          : unreadMailCount.value > 0
            ? '凭证：邮箱有新回执，可能包含活动奖励。'
            : `凭证：${onlineDailyActivityCards.value.length} 个短局入口可推进。`,
        progressLabel: claimableMailCount.value > 0 ? '可立即领取' : `${todayTodoCards.value.length} 个今日动作`,
        progressPercent: claimableMailCount.value > 0 ? 100 : clampPercent((todayTodoCards.value.length / 5) * 100),
        actionLabel: claimableMailCount.value > 0 ? '去领取' : '去短局',
        to: claimableMailCount.value > 0
          ? { name: 'mail' }
          : todayTodoCards.value[0]?.to ?? { name: 'online-festival', query: { tab: 'festival-room' } },
        icon: Inbox,
        ready: claimableMailCount.value > 0 || unreadMailCount.value > 0 || todayTodoCards.value.length > 0,
      },
      {
        id: 'weekly-cashout',
        theme: 'expedition',
        layerLabel: '本周兑现',
        title: '补齐周奖励缺口',
        status: onlineWeeklyRewardSummary.value,
        nextActionLabel: nextWeeklyStep
          ? `下一步：${nextWeeklyStep.label}。`
          : '下一步：查看本周联机进度。',
        rewardLabel: '奖励：稀有材料、潜能资源、限定装饰和称号。',
        proofLabel: `凭证：${onlineWeeklyRewardProgressLabel.value} 项周目标已有进度。`,
        progressLabel: onlineWeeklyRewardProgressLabel.value,
        progressPercent: onlineWeeklyRewardProgressPercent.value,
        actionLabel: onlineWeeklyRewardCompletedCount.value >= onlineWeeklyRewardSteps.value.length ? '看结算' : '补周进度',
        to: nextWeeklyStep?.to ?? { name: 'online-festival', query: { tab: 'festival-room' } },
        icon: CalendarDays,
        ready: onlineWeeklyRewardCompletedCount.value > 0 || Boolean(nextWeeklyStep),
      },
      {
        id: 'collaboration-cashout',
        theme: 'manor',
        layerLabel: '协作兑现',
        title: '把组队收益讲清楚',
        status: activeRoom
          ? '当前有房间'
          : roomInviteCount.value > 0
            ? `${roomInviteCount.value} 个邀请`
            : collaborationSignalCount > 0
              ? `${collaborationSignalCount} 条协作线索`
              : '待组队',
        nextActionLabel: activeRoom
          ? '下一步：回到房间补分工、开始或结算。'
          : roomInviteCount.value > 0
            ? '下一步：先处理好友房间邀请。'
            : '下一步：邀请好友、串门或接力委托形成协作记录。',
        rewardLabel: '奖励：队伍连携、房主额外奖励、好友默契和新人协助收益。',
        proofLabel: onlineTotalReceiptCount.value > 0
          ? `凭证：${onlineTotalReceiptCount.value} 条节会 / 远征结算可回看。`
          : `凭证：${socialStore.friends.length} 位好友，${cohabitationStore.summary.active} 份共同庄园。`,
        progressLabel: `${collaborationSignalCount}/5 协作信号`,
        progressPercent: clampPercent((collaborationSignalCount / 5) * 100),
        actionLabel: activeRoom || roomInviteCount.value > 0 ? '去房间' : '找队友',
        to: festivalRoomStore.myRoom || roomInviteCount.value > 0
          ? { name: 'online-festival', query: { tab: 'festival-room' } }
          : expeditionRoomStore.myRoom
            ? { name: 'online-festival', query: { tab: 'expedition-room' } }
            : { name: 'online-neighbor' },
        icon: HeartHandshake,
        ready: collaborationSignalCount > 0,
      },
      {
        id: 'long-term-cashout',
        theme: 'festival',
        layerLabel: '长期兑现',
        title: '把复玩目标沉淀成收藏',
        status: `${onlineCollectionGoalCount.value}/4 类已起步`,
        nextActionLabel: onlineCollectionGoalCount.value > 0
          ? '下一步：回看纪念册、战利品或好友徽章进度。'
          : '下一步：先完成一局节会或远征，留下第一条收藏凭证。',
        rewardLabel: '奖励：小游戏熟练度、赛季进度、稀有外观和家具。',
        proofLabel: `凭证：纪念 ${festivalRoomStore.recentMemorials.length} 条，结算 ${onlineTotalReceiptCount.value} 条，协作 ${longTermProofCount} 条。`,
        progressLabel: `${longTermProofCount}/12 长线凭证`,
        progressPercent: clampPercent((longTermProofCount / 12) * 100),
        actionLabel: onlineCollectionGoalCount.value > 0 ? '看收藏' : '开一局',
        to: { name: 'online-festival', query: { tab: onlineCollectionGoalCount.value > 0 ? 'memorials' : 'festival-room' } },
        icon: ShieldCheck,
        ready: onlineCollectionGoalCount.value > 0,
      },
    ]
  })
  const onlineRewardClaimPlanReadyCount = computed(() =>
    onlineRewardClaimPlanCards.value.filter(card => card.ready).length
  )
  const onlineRewardClaimPlanSummary = computed(() =>
    `${onlineRewardClaimPlanReadyCount.value}/${onlineRewardClaimPlanCards.value.length} 项可兑现`
  )
  const onlineCollectionGoalCards = computed<OnlineCollectionGoalCard[]>(() => {
    const festivalCollectionCount = festivalRoomStore.recentMemorials.length + festivalRoomStore.recentReceipts.length
    const expeditionCollectionCount = expeditionRoomStore.recentReceipts.length
    const friendBadgeCount = socialStore.friends.length + Math.min(3, socialStore.friendDiscoveryPlayers.length)
    const manorTitleProgress = [
      cohabitationStore.summary.active > 0,
      cohabitationStore.summary.total > 0,
      Boolean(manorStore.favoriteOverview?.favorites.length),
      Boolean(manorStore.favoriteOverview?.hot_manors.length),
      Boolean(manorCareTodo.value),
    ].filter(Boolean).length

    return [
      {
        id: 'festival-memorial-book',
        theme: 'festival',
        title: '节会纪念册',
        status: festivalCollectionCount > 0 ? `${festivalCollectionCount} 条纪念` : '待留下第一张',
        summary: '灯谜、花灯、摆摊和龙舟结算都会沉淀为节会回忆，支撑限定称号与装饰追求。',
        rewardHint: '收集目标：节会纪念、限定称号、灯会装饰',
        progressLabel: `${festivalCollectionCount}/6 纪念线索`,
        progressPercent: clampPercent((festivalCollectionCount / 6) * 100),
        actionLabel: festivalCollectionCount > 0 ? '看纪念' : '去开局',
        to: { name: 'online-festival', query: { tab: festivalCollectionCount > 0 ? 'memorials' : 'festival-room' } },
        icon: Lamp,
        unlocked: festivalCollectionCount > 0,
      },
      {
        id: 'expedition-almanac',
        theme: 'expedition',
        title: '远征图鉴',
        status: expeditionCollectionCount > 0 ? `${expeditionCollectionCount} 条战利品` : '待完成路线',
        summary: '护送、矿洞和遗迹短局会留下路线、风险、连携和战利品记录，给远征复玩一个目标。',
        rewardHint: '收集目标：路线图鉴、稀有材料、远征称号',
        progressLabel: `${expeditionCollectionCount}/6 路线记录`,
        progressPercent: clampPercent((expeditionCollectionCount / 6) * 100),
        actionLabel: expeditionCollectionCount > 0 ? '看战利品' : '去远征',
        to: { name: 'online-festival', query: { tab: 'expedition-room' } },
        icon: Pickaxe,
        unlocked: expeditionCollectionCount > 0,
      },
      {
        id: 'friend-badges',
        theme: 'manor',
        title: '好友徽章',
        status: friendBadgeCount > 0 ? `${friendBadgeCount} 位互动对象` : '待发现好友',
        summary: '好友互助、留言礼物、挑战榜和组队记录会汇成轻社交目标，降低再次约人的成本。',
        rewardHint: '收集目标：好友徽章、默契等级、新人协助奖励',
        progressLabel: `${friendBadgeCount}/6 好友线索`,
        progressPercent: clampPercent((friendBadgeCount / 6) * 100),
        actionLabel: friendBadgeCount > 0 ? '看好友' : '去发现',
        to: { name: 'online-neighbor' },
        icon: Users,
        unlocked: friendBadgeCount > 0,
      },
      {
        id: 'manor-collaboration-title',
        theme: 'manor',
        title: '庄园协作称号',
        status: manorTitleProgress > 0 ? `${manorTitleProgress}/5 条进度` : '待开始协作',
        summary: '共同浇灌、动物护理、设施借用和共同庄园契约会汇成庄园协作称号线。',
        rewardHint: '收集目标：庄园称号、协作经验、共同建设纪念',
        progressLabel: `${manorTitleProgress}/5 协作信号`,
        progressPercent: clampPercent((manorTitleProgress / 5) * 100),
        actionLabel: manorTitleProgress > 0 ? '看庄园' : '去协作',
        to: { name: cohabitationStore.summary.total > 0 ? 'online-cohabitation' : 'online-manor', query: { tab: cohabitationStore.summary.total > 0 ? 'map' : 'care' } },
        icon: Home,
        unlocked: manorTitleProgress > 0,
      },
    ]
  })
  const onlineCollectionGoalUnlockedCount = computed(() =>
    onlineCollectionGoalCards.value.filter(goal => goal.unlocked).length
  )
  const onlineCollectionGoalSummary = computed(() =>
    `${onlineCollectionGoalUnlockedCount.value}/${onlineCollectionGoalCards.value.length} 类已有进度`
  )
  const onlineSeasonThemeCards = computed<OnlineSeasonThemeCard[]>(() => {
    const lanternWeekProgress = Math.min(
      6,
      festivalRoomStore.recentMemorials.length
      + festivalRoomStore.recentReceipts.length
      + (festivalRoomStore.myRoom ? 1 : 0),
    )
    const expeditionWeekProgress = Math.min(
      6,
      expeditionRoomStore.recentReceipts.length
      + expeditionRoomStore.visibleRooms.length
      + (expeditionRoomStore.myRoom ? 1 : 0),
    )
    const harvestWeekProgress = [
      Boolean(manorCareTodo.value),
      cohabitationStore.summary.active > 0,
      cohabitationStore.summary.pending > 0,
      Boolean(manorStore.favoriteOverview?.favorites.length),
      Boolean(manorStore.favoriteOverview?.hot_manors.length),
      acceptedOrderCount.value > 0 || relayOrderCount.value > 0,
    ].filter(Boolean).length
    const mentorProgress = Math.min(
      6,
      socialStore.friends.length
      + socialStore.friendDiscoveryPlayers.length
      + (roomInviteCount.value > 0 ? 1 : 0),
    )

    return [
      {
        id: 'lantern-week',
        theme: 'festival',
        title: '灯会周',
        status: festivalRoomStore.myRoom ? festivalRoomStore.myRoom.state_label : lanternWeekProgress > 0 ? `${lanternWeekProgress} 条灯会线索` : '待开灯会房',
        summary: '把灯谜竞猜、花灯巡游、节庆订单和节会纪念册合成一周主题，适合轻量约人。',
        limitedReward: '限定预告：花灯家具 / 灯会称号 / 纪念册页签',
        progressLabel: `${lanternWeekProgress}/6 灯会进度`,
        progressPercent: clampPercent((lanternWeekProgress / 6) * 100),
        actionLabel: festivalRoomStore.myRoom ? '回房间' : '去灯会',
        to: { name: 'online-festival', query: { tab: 'festival-room', template: 'lantern_fair', gameplay: 'quiz_buzz', open_wizard: '1' } },
        icon: Lamp,
        active: lanternWeekProgress > 0,
      },
      {
        id: 'expedition-week',
        theme: 'expedition',
        title: '远征周',
        status: expeditionRoomStore.myRoom ? expeditionRoomStore.myRoom.state_label : expeditionWeekProgress > 0 ? `${expeditionWeekProgress} 条路线线索` : '待组远征队',
        summary: '把双人路线、小队遭遇战、资源护送和遗迹探索放进同一周追踪。',
        limitedReward: '限定预告：远征旗帜 / 战利品陈列 / 路线称号',
        progressLabel: `${expeditionWeekProgress}/6 远征进度`,
        progressPercent: clampPercent((expeditionWeekProgress / 6) * 100),
        actionLabel: expeditionRoomStore.myRoom ? '回队伍' : '去远征',
        to: { name: 'online-festival', query: { tab: 'expedition-room', template: 'escort_convoy', gameplay: 'expedition_escort', open_wizard: '1' } },
        icon: Pickaxe,
        active: expeditionWeekProgress > 0,
      },
      {
        id: 'harvest-week',
        theme: 'manor',
        title: '丰收周',
        status: harvestWeekProgress > 0 ? `${harvestWeekProgress}/6 项协作` : '待开启庄园协作',
        summary: '把共同浇灌、动物护理、作坊接力和访客订单串成庄园经营周。',
        limitedReward: '限定预告：丰收家具 / 庄园协作称号 / 共同建设纪念',
        progressLabel: `${harvestWeekProgress}/6 丰收进度`,
        progressPercent: clampPercent((harvestWeekProgress / 6) * 100),
        actionLabel: cohabitationStore.summary.active > 0 ? '去共同庄园' : '去庄园',
        to: cohabitationStore.summary.active > 0
          ? { name: 'online-cohabitation', query: { tab: 'map' } }
          : { name: 'online-manor', query: { tab: 'care' } },
        icon: Home,
        active: harvestWeekProgress > 0,
      },
      {
        id: 'mentor-bonus',
        theme: 'manor',
        title: '老带新奖励',
        status: mentorProgress > 0 ? `${mentorProgress} 位可互动对象` : '待发现新人',
        summary: '把好友发现、邀请组队和新人协助奖励放到同一个入口，解决没人组队的问题。',
        limitedReward: '限定预告：新人协助奖励 / 默契徽章 / 房主额外奖励',
        progressLabel: `${mentorProgress}/6 带新线索`,
        progressPercent: clampPercent((mentorProgress / 6) * 100),
        actionLabel: '去邀请',
        to: { name: 'online-neighbor' },
        icon: Users,
        active: mentorProgress > 0,
      },
    ]
  })
  const onlineSeasonThemeActiveCount = computed(() =>
    onlineSeasonThemeCards.value.filter(theme => theme.active).length
  )
  const onlineSeasonThemeSummary = computed(() =>
    `${onlineSeasonThemeActiveCount.value}/${onlineSeasonThemeCards.value.length} 个主题已有进度`
  )
  const onlineFriendActivityEntries = computed<OnlineFriendActivityEntry[]>(() => {
    const entries: OnlineFriendActivityEntry[] = []
    for (const relation of socialStore.friends.slice(0, 3)) {
      const profile = relation.profile
      entries.push({
        id: `friend-${profile.username}`,
        label: profile.display_name || profile.player_name || profile.username,
        summary: profile.recent_activity || profile.season_progress || profile.public_title || '好友在线资料已同步。',
        status: '好友',
        to: { name: 'online-neighbor', query: { player: profile.username } },
      })
    }
    for (const player of socialStore.friendDiscoveryPlayers.slice(0, 3)) {
      if (entries.length >= 5) break
      entries.push({
        id: `discover-${player.save_identity.save_id}`,
        label: player.profile.display_name || player.profile.player_name || player.profile.username,
        summary: player.profile.recent_activity || player.recommendation_reasons[0] || '近期活跃玩家，可从邻里页继续互动。',
        status: player.is_online ? '在线' : player.is_recently_active ? '近期活跃' : '可发现',
        to: { name: 'online-neighbor', query: { player: player.profile.username } },
      })
    }
    if (entries.length > 0) return entries.slice(0, 5)
    return [
      {
        id: 'festival-room',
        label: '节会房间',
        summary: roomInviteCount.value > 0 ? '有好友邀请你加入节会或远征房。' : '邀请好友后，这里会优先显示他们的在线活动。',
        status: roomInviteCount.value > 0 ? `${roomInviteCount.value} 个邀请` : '等待好友',
        to: invitationTargetRoute.value,
      },
      {
        id: 'friend-discovery',
        label: '好友大厅',
        summary: '进入邻里页刷新近期玩家、好友关系和可邀请对象。',
        status: '去发现',
        to: { name: 'online-neighbor' },
      },
    ]
  })
  const onlineFriendActivitySummary = computed(() =>
    socialStore.friends.length > 0 || socialStore.friendDiscoveryPlayers.length > 0
      ? `${socialStore.friends.length} 位好友 · ${socialStore.friendDiscoveryPlayers.length} 位近期玩家`
      : '暂无好友动态，先去邻里页发现玩家。'
  )
  const onlineFriendTeamBoardEntries = computed<OnlineFriendTeamBoardEntry[]>(() => {
    const entries: OnlineFriendTeamBoardEntry[] = []
    for (const relation of socialStore.friends.slice(0, 2)) {
      const profile = relation.profile
      entries.push({
        id: `friend-board-${profile.username}`,
        label: profile.display_name || profile.player_name || profile.username,
        summary: profile.season_progress || profile.recent_activity || profile.public_title || '适合发起轻协作或邀请进房。',
        status: '好友',
        to: { name: 'online-neighbor', query: { player: profile.username } },
      })
    }
    for (const receipt of festivalRoomStore.recentReceipts.slice(0, 2)) {
      entries.push({
        id: `festival-board-${receipt.id}`,
        label: receipt.room_title || receipt.template_label || '节会短局',
        summary: receipt.summary || '最近节会结算记录，可从这里复盘再开一局。',
        status: receipt.status_label || '节会',
        to: { name: 'online-festival', query: { tab: 'memorials' } },
      })
    }
    for (const receipt of expeditionRoomStore.recentReceipts.slice(0, 2)) {
      entries.push({
        id: `expedition-board-${receipt.id}`,
        label: receipt.room_title || receipt.template_label || '远征短局',
        summary: receipt.summary || '最近远征结算记录，可继续补路线和战利品。',
        status: receipt.status_label || '远征',
        to: { name: 'online-festival', query: { tab: 'expedition-room' } },
      })
    }
    if (entries.length > 0) return entries.slice(0, 5)
    return [
      {
        id: 'start-festival-board',
        label: '节会开局榜',
        summary: '完成灯谜、摆摊或龙舟短局后，这里会展示可回看的队伍表现。',
        status: '待开局',
        to: { name: 'online-festival', query: { tab: 'festival-room' } },
      },
      {
        id: 'start-expedition-board',
        label: '远征队伍榜',
        summary: '完成护送、矿洞或遗迹短局后，这里会展示路线结算和队伍表现。',
        status: '待开局',
        to: { name: 'online-festival', query: { tab: 'expedition-room' } },
      },
    ]
  })
  const onlineFriendTeamBoardSummary = computed(() => {
    const receiptCount = festivalRoomStore.recentReceipts.length + expeditionRoomStore.recentReceipts.length
    if (receiptCount > 0) return `${receiptCount} 条队伍结算可回看`
    if (socialStore.friends.length > 0) return `${socialStore.friends.length} 位好友可邀请`
    return '完成短局后会生成队伍表现入口'
  })
  const createRoomAction = computed<OnlineCenterHeroAction>(() => ({
    id: 'create-room',
    label: '创建活动房间',
    status: '节会或远征',
    summary: '开一个节会房或远征队伍，把好友邀请进准备大厅。',
    to: { name: 'online-festival', query: { tab: 'festival-room' } },
    icon: CalendarDays,
  }))
  const continueRoomAction = computed<OnlineCenterHeroAction | null>(() => {
    if (festivalRoomStore.myRoom) {
      return {
        id: 'continue-room',
        label: '继续节会房间',
        status: festivalRoomStore.myRoom.state_label,
        summary: festivalRoomStore.myRoom.title || festivalRoomStore.myRoom.template_label,
        to: { name: 'online-festival', query: { tab: 'festival-room' } },
        icon: Lamp,
      }
    }
    if (expeditionRoomStore.myRoom) {
      return {
        id: 'continue-room',
        label: '继续远征房间',
        status: expeditionRoomStore.myRoom.state_label,
        summary: expeditionRoomStore.myRoom.title || expeditionRoomStore.myRoom.template_label,
        to: { name: 'online-festival', query: { tab: 'expedition-room' } },
        icon: Pickaxe,
      }
    }
    return null
  })
  const inviteAction = computed<OnlineCenterHeroAction | null>(() => {
    const totalInviteCount = roomInviteCount.value + societyStore.incomingInvites.length
    if (totalInviteCount <= 0) return null
    return {
      id: 'handle-invites',
      label: '处理邀请',
      status: `${totalInviteCount} 个待处理`,
      summary: roomInviteCount.value > 0 ? '先确认活动房邀请，再进入准备或玩法。' : '有村社邀请等待确认。',
      to: invitationTargetRoute.value,
      icon: Users,
    }
  })
  const societyTodoAction = computed<OnlineCenterHeroAction | null>(() => {
    if (societyTodoCount.value <= 0) return null
    return {
      id: 'society-todos',
      label: '查看村社待办',
      status: `${societyTodoCount.value} 项待处理`,
      summary: '处理成员申请、提案或自己的加入进度。',
      to: { name: 'online-society', query: { tab: societyStore.managedRequests.length > 0 ? 'members' : 'proposals' } },
      icon: ShieldCheck,
    }
  })
  const relayOrderAction = computed<OnlineCenterHeroAction | null>(() => {
    if (relayOrderCount.value <= 0) return null
    return {
      id: 'relay-orders',
      label: '接力委托',
      status: `${relayOrderCount.value} 张可接`,
      summary: '查看多段互助委托，接下适合当前材料和时间的一段。',
      to: { name: 'online-orders', query: { tab: 'available' } },
      icon: Handshake,
    }
  })
  const onlineCenterHeroActions = computed<OnlineCenterHeroAction[]>(() => {
    const current = continueRoomAction.value
    const invites = inviteAction.value
    const societyTodos = societyTodoAction.value
    const relayOrders = relayOrderAction.value
    const actions = current
      ? [current, invites, societyTodos, relayOrders, createRoomAction.value]
      : invites
        ? [invites, createRoomAction.value, societyTodos, relayOrders]
        : [createRoomAction.value, relayOrders, societyTodos]
    return actions.filter((action): action is OnlineCenterHeroAction => Boolean(action)).slice(0, 3)
  })
  const onlineCenterPrimaryAction = computed(() => onlineCenterHeroActions.value[0] ?? null)
  const onlineCenterStickyStatus = computed(() => {
    if (errorCount.value > 0) return `${errorCount.value} 个摘要暂不可用`
    return activeRoomLabel.value
  })
  const onlineCenterStickyPrimaryAction = computed<OnlineCenterStickyAction | null>(() => {
    const action = onlineCenterPrimaryAction.value
    return action ? { id: action.id, label: action.label, tone: 'primary', icon: action.icon } : null
  })
  const onlineCenterStickySecondaryActions = computed<OnlineCenterStickyAction[]>(() =>
    onlineCenterHeroActions.value.slice(1, 3).map(action => ({
      id: action.id,
      label: action.label,
      tone: 'default',
      icon: action.icon,
    }))
  )
  const handleOnlineCenterAction = (actionId?: string) => {
    const action = onlineCenterHeroActions.value.find(item => item.id === actionId) ?? onlineCenterPrimaryAction.value
    if (!action) return
    void router.push(action.to)
  }

  const routeForFeatureFallback = (featureFlagKey: OnlineVisualFeatureFlagKey): RouteLocationRaw | null => {
    const featureFlag = getOnlineVisualFeatureFlagConfig(featureFlagKey)
    return featureFlag ? { name: featureFlag.fallbackRouteName } : null
  }

  const resolveVisualFeatureFallback = (
    primaryRoute: RouteLocationRaw,
    featureFlagKey: OnlineVisualFeatureFlagKey | undefined,
  ) => {
    if (!featureFlagKey) {
      return {
        enabled: true,
        targetRoute: primaryRoute,
        fallbackRoute: null,
        fallbackLabel: '',
        fallbackStatus: '使用可视化入口',
      }
    }

    const featureFlag = getOnlineVisualFeatureFlagConfig(featureFlagKey)
    const enabled = isOnlineVisualFeatureEnabled(onlineVisualFeatureFlagState, featureFlagKey)
    const fallbackRoute = routeForFeatureFallback(featureFlagKey)
    const fallbackStatus = enabled ? '可视化入口开启' : '可从备用入口继续 / 只读回看'

    return {
      enabled,
      targetRoute: enabled ? primaryRoute : fallbackRoute ?? primaryRoute,
      fallbackRoute,
      fallbackLabel: featureFlag?.fallbackLabel ?? '',
      fallbackStatus,
    }
  }

  const routeForScheduleEntry = (entry: OnlineVisualActivityScheduleEntry): RouteLocationRaw => ({
    name: entry.routeName,
    query: entry.routeQuery,
  })

  const resolveScheduleEntry = (entry: OnlineVisualActivityScheduleEntry): ResolvedOnlineVisualScheduleEntry => {
    const featureFlagKey = getOnlineVisualFeatureFlagKeyForSceneSpec(entry.sceneSpecId)
    return {
      ...entry,
      ...resolveVisualFeatureFallback(routeForScheduleEntry(entry), featureFlagKey),
    }
  }

  const visualActivities = computed<ResolvedVisualActivityCard[]>(() => {
    const activities: VisualActivityCard[] = [
      {
        key: 'cavern',
        title: '协作矿洞',
        summary: '节点地图、撤离点、组合收益和路线回看。',
        status: expeditionRoomStore.myRoom ? `远征房：${expeditionRoomStore.myRoom.state_label}` : `${expeditionRoomStore.visibleRooms.length} 间远征房可见`,
        boardType: '地图',
        to: { name: 'online-festival', query: { tab: 'expedition-room' } },
        sceneSpecId: 'expedition_cavern',
        featureFlagKey: 'expedition_cavern',
        icon: Pickaxe,
        testId: 'online-visual-activity-cavern',
      },
      {
        key: 'lantern',
        title: '灯会现场',
        summary: '主灯、灯谜、人群、留影点和好友回看。',
        status: festivalRoomStore.myRoom ? `节会房：${festivalRoomStore.myRoom.state_label}` : `${festivalRoomStore.visibleRooms.length} 间节会房可见`,
        boardType: '场景',
        to: { name: 'online-festival', query: { tab: 'festival-room' } },
        sceneSpecId: 'lantern_fair',
        featureFlagKey: 'lantern_fair',
        icon: Lamp,
        testId: 'online-visual-activity-lantern',
      },
      {
        key: 'dragon-boat',
        title: '龙舟赛道',
        summary: '多船轨道、名次榜、冲线状态和赛道回看。',
        status: festivalRoomStore.myRoom ? '本房可查看赛道状态' : '支持 2 / 4 / 6 / 8 人房',
        boardType: '轨道',
        to: { name: 'online-festival', query: { tab: 'festival-room' } },
        sceneSpecId: 'dragon_boat',
        featureFlagKey: 'dragon_boat',
        icon: Waves,
        testId: 'online-visual-activity-dragon-boat',
      },
      {
        key: 'society-projects',
        title: '村社公共建设',
        summary: '修桥、节庆广场、花灯墙等异步工程现场。',
        status: societyStore.mySociety ? `${societyStore.mySociety.public_projects.length} 项公共建设` : '加入村社后可共建',
        boardType: '异步',
        to: { name: 'online-society', query: { tab: 'projects' } },
        icon: ClipboardList,
        testId: 'online-visual-activity-society-projects',
      },
      {
        key: 'relay-orders',
        title: '公共订单接力',
        summary: '多段委托路线、阶段贡献和分账摘要。',
        status: `${coopOrderStore.visibleOrders.filter(order => order.collaboration_mode === 'multi_stage').length} 张接力单可见`,
        boardType: '异步',
        to: { name: 'online-orders', query: { tab: 'available' } },
        icon: Handshake,
        testId: 'online-visual-activity-relay-orders',
      },
      {
        key: 'warehouse',
        title: '村社仓廪',
        summary: '五类入仓、周结算、灾害与节会公共效果。',
        status: societyStore.mySociety?.public_warehouse.weekly_settlement?.status_label || '等待本周入仓',
        boardType: '仓廪',
        to: { name: 'online-society', query: { tab: 'storage' } },
        icon: Warehouse,
        testId: 'online-visual-activity-warehouse',
      },
    ]

    return activities.map(activity => ({
      ...activity,
      ...resolveVisualFeatureFallback(activity.to, activity.featureFlagKey),
    }))
  })

  const visualActivitySummary = computed(() => {
    const activeRooms = [festivalRoomStore.myRoom, expeditionRoomStore.myRoom].filter(Boolean).length
    const projectCount = societyStore.mySociety?.public_projects.length || 0
    return `${visualActivities.value.length} 类活动 · ${activeRooms} 间活动房 · ${projectCount} 项公共建设`
  })

  const onlineVisualFeatureFlagItems = computed(() =>
    ONLINE_VISUAL_FEATURE_FLAGS.map(flag => ({
      ...flag,
      enabled: isOnlineVisualFeatureEnabled(onlineVisualFeatureFlagState, flag.key),
    }))
  )

  const onlineVisualFeatureFlagSummary = computed(() => {
    const enabledCount = onlineVisualFeatureFlagItems.value.filter(flag => flag.enabled).length
    return `${enabledCount}/${onlineVisualFeatureFlagItems.value.length} 个入口默认开启 · 配置缺失时保留备用入口`
  })

  const onlineVisualFestivalCalendar = computed<ResolvedOnlineVisualScheduleEntry[]>(() =>
    ONLINE_VISUAL_FESTIVAL_ACTIVITY_CALENDAR.map(resolveScheduleEntry)
  )
  const onlineVisualDailyRotation = computed<ResolvedOnlineVisualScheduleEntry[]>(() =>
    ONLINE_VISUAL_DAILY_ACTIVITY_ROTATION.map(resolveScheduleEntry)
  )
  const onlineVisualWeeklyRotation = computed<ResolvedOnlineVisualScheduleEntry[]>(() =>
    ONLINE_VISUAL_WEEKLY_ACTIVITY_ROTATION.map(resolveScheduleEntry)
  )
  const onlineVisualSeasonalRotation = computed<ResolvedOnlineVisualScheduleEntry[]>(() =>
    ONLINE_VISUAL_SEASONAL_ACTIVITY_ROTATION.map(resolveScheduleEntry)
  )
  const onlineVisualExpiredRetention = ONLINE_VISUAL_EXPIRED_ACTIVITY_RETENTION
  const onlineVisualScheduleSummary = computed(() =>
    `${onlineVisualFestivalCalendar.value.length} 个节会 · ${onlineVisualDailyRotation.value.length} 个每日短玩法 · ${onlineVisualWeeklyRotation.value.length} 个每周目标`
  )
  const onlineVisualRewardControlPolicies = ONLINE_VISUAL_REWARD_CONTROL_POLICIES
  const onlineVisualRewardGlobalGuardrails = ONLINE_VISUAL_REWARD_GLOBAL_GUARDRAILS
  const onlineVisualRewardControlSummary = computed(() =>
    `${onlineVisualRewardControlPolicies.length} 类奖励口径 · ${onlineVisualRewardGlobalGuardrails.length} 条全局护栏 · 不扩大前端发奖`
  )

  const modules = computed<ModuleCard[]>(() => [
    {
      key: 'manor',
      title: '庄园',
      summary: '公开展示、来访、留言、主题周、收藏。',
      status: manorStore.snapshot
        ? `${manorStore.snapshot.manor_name || manorStore.snapshot.display_name || '我的庄园'} · ${manorStore.snapshot.theme_week?.active_theme || manorStore.snapshot.showcase_theme || '未设主题'}`
        : '还没有同步庄园快照。',
      stats: [
        { label: '快照', value: hasSummary(manorStore.snapshot) },
        { label: '收藏', value: countLabel(manorStore.favoriteOverview?.favorites.length) },
        { label: '关注', value: manorStore.snapshot?.is_followed_by_viewer ? '已关注' : '未关注' },
        { label: '来访', value: countLabel(manorStore.snapshot?.visit_entries.length) },
      ],
      routeName: 'online-manor',
      icon: Home,
      error: moduleErrors.value.manor || ''
    },
    {
      key: 'cohabitation',
      title: '共同庄园',
      summary: '同居契约、共同地图、仓库、基金、权限。',
      status: cohabitationStore.summary.total > 0
        ? `${cohabitationStore.summary.active} 份已生效 · ${cohabitationStore.summary.pending} 份待接受`
        : '尚未建立共同庄园契约。',
      stats: [
        { label: '契约', value: countLabel(cohabitationStore.summary.total, '份') },
        { label: '已生效', value: countLabel(cohabitationStore.summary.active, '份') },
        { label: '共同基金', value: cohabitationStore.fund?.balance ?? cohabitationStore.selectedContract?.shared_fund?.balance ?? 0 },
        { label: '仓库', value: countLabel(cohabitationStore.warehouse?.summary.item_count ?? cohabitationStore.selectedContract?.shared_warehouse?.items?.length) },
      ],
      routeName: 'online-cohabitation',
      icon: HeartHandshake,
      error: moduleErrors.value.cohabitation || ''
    },
    {
      key: 'neighbor',
      title: '邻里',
      summary: '名片、好友、邻里组织、订阅。',
      status: socialStore.profile
        ? `${socialStore.displayTitle} · ${socialStore.neighborGroup?.name || '尚未加入邻里'}`
        : '还没有同步公开名片。',
      stats: [
        { label: '名片', value: hasSummary(socialStore.profile) },
        { label: '好友', value: countLabel(socialStore.friends.length, '人') },
        { label: '申请', value: countLabel(socialStore.incomingRequests.length + socialStore.outgoingRequests.length) },
        { label: '邻里', value: socialStore.neighborGroup ? `${socialStore.neighborGroup.member_count}人` : '未加入' },
      ],
      routeName: 'online-neighbor',
      icon: Users,
      error: moduleErrors.value.neighbor || ''
    },
    {
      key: 'orders',
      title: '委托',
      summary: '在线求助单、接单、交付、互助声望。',
      status: `${coopOrderStore.reputationSummary.trust_level.label} · 已完成 ${coopOrderStore.reputationSummary.completed_count} 单`,
      stats: [
        { label: '我的发布', value: countLabel(coopOrderStore.myOrders.length) },
        { label: '我的接单', value: countLabel(coopOrderStore.myAcceptedOrders.length) },
        { label: '可见委托', value: countLabel(coopOrderStore.visibleOrders.length) },
        { label: '补偿', value: countLabel(coopOrderStore.myCompensations.length) },
      ],
      routeName: 'online-orders',
      icon: Handshake,
      error: moduleErrors.value.orders || ''
    },
    {
      key: 'festival',
      title: '节会',
      summary: '世界事件、节会房间、远征房间、纪念。',
      status: festivalRoomStore.myRoom
        ? `节会房间：${festivalRoomStore.myRoom.state_label}`
        : expeditionRoomStore.myRoom
          ? `远征房间：${expeditionRoomStore.myRoom.state_label}`
          : '暂无进行中的节会或远征房间。',
      stats: [
        { label: '节会房', value: festivalRoomStore.myRoom ? '进行中' : '无' },
        { label: '节会邀请', value: countLabel(festivalRoomStore.invitedRooms.length) },
        { label: '远征房', value: expeditionRoomStore.myRoom ? '进行中' : '无' },
        { label: '远征邀请', value: countLabel(expeditionRoomStore.invitedRooms.length) },
      ],
      routeName: 'online-festival',
      icon: CalendarDays,
      error: moduleErrors.value.festival || ''
    },
    {
      key: 'society',
      title: '村社',
      summary: '组织、成员、仓库、提案、公共建设。',
      status: societyStore.mySociety
        ? `${societyStore.mySociety.name} · ${societyStore.mySociety.my_role_label || '成员'}`
        : '尚未加入村社，可进入后创建或申请。',
      stats: [
        { label: '我的村社', value: societyStore.mySociety ? `${societyStore.mySociety.member_count}人` : '未加入' },
        { label: '邀请', value: countLabel(societyStore.incomingInvites.length) },
        { label: '申请', value: countLabel(societyStore.managedRequests.length + societyStore.myPendingRequests.length) },
        { label: '提案', value: countLabel(societyStore.mySociety?.active_proposals.length) },
      ],
      routeName: 'online-society',
      icon: ShieldCheck,
      error: moduleErrors.value.society || ''
    }
  ])

  onMounted(() => {
    void refreshOnlineSummary()
  })
</script>
