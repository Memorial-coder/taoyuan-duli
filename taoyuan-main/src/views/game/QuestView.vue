<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center space-x-1.5 text-sm text-accent mb-3">
      <ClipboardList :size="14" />
      <span>任务</span>
    </div>

    <div v-if="isCompactMobile" class="border border-accent/15 rounded-xs px-3 py-2 mb-3 bg-bg/10">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-accent">任务提示</p>
          <p class="text-xs text-muted mt-1 leading-5">先看主线、今日委托和进行中任务，需要时再展开经营提示与建设线路。</p>
        </div>
        <button class="btn !px-2 !py-1 text-xs shrink-0" @click="questPreludeExpanded = !questPreludeExpanded">
          {{ questPreludeExpanded || questPreludeForceOpen ? '收起' : '展开' }}
        </button>
      </div>
    </div>

    <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70" data-testid="quest-primary-action-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] tracking-[0.24em] text-accent/70">当前推荐动作</p>
          <p class="text-sm text-accent mt-1">{{ mobileQuestPrimaryActionCard.title }}</p>
          <p class="text-xs text-muted mt-2 leading-5">{{ mobileQuestPrimaryActionCard.summary }}</p>
        </div>
        <span class="text-[10px] shrink-0" :class="mobileQuestPrimaryActionCard.statusToneClass">{{ mobileQuestPrimaryActionCard.statusLabel }}</span>
      </div>
      <div v-if="mobileQuestPrimaryActionCard.detailLines.length > 0" class="mt-3 space-y-1">
        <p
          v-for="line in mobileQuestPrimaryActionCard.detailLines"
          :key="`quest-primary-action-${line}`"
          class="text-xs text-muted leading-5"
        >
          · {{ line }}
        </p>
      </div>
      <button class="mt-3 w-full border border-accent/20 rounded-xs px-3 py-2 text-xs text-accent hover:bg-accent/5" @click="handleMobileQuestPrimaryAction">
        {{ mobileQuestPrimaryActionCard.ctaLabel }}
      </button>
    </div>

    <template v-if="!isCompactMobile || questPreludeExpanded || questPreludeForceOpen">
    <GuidanceDigestPanel surface-id="quest" title="任务路线引导" />

    <QaGovernancePanel page-id="quest" title="结算治理总览" />

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('prompt-hints')"
      :data-prompt-focus="buildPromptFocusAttr('prompt-hints')"
    >
      <p class="text-xs text-muted mb-2">经营提示</p>
      <div class="border border-accent/10 rounded-xs px-3 py-2 mb-2 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">本周主路线</p>
          <span class="text-[10px] text-muted">{{ weeklyPlanSnapshot.weekId }}</span>
        </div>
        <p class="text-[10px] text-accent mt-1">{{ weeklyPlanSnapshot.primaryRouteLabel }}</p>
        <p class="text-[10px] text-muted mt-1">{{ weeklyPlanSnapshot.primaryRouteSummary }}</p>
        <p v-if="weeklyPlanSnapshot.secondaryRouteLabels.length > 0" class="text-[10px] text-success mt-1">
          辅助路线：{{ weeklyPlanSnapshot.secondaryRouteLabels.join('、') }}
        </p>
      </div>
      <div v-if="goalStore.currentEventCampaign" class="border border-accent/10 rounded-xs px-3 py-2 mb-2 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">活动编排</p>
          <span class="text-[10px] text-muted">{{ goalStore.currentEventCampaign.cadence }}</span>
        </div>
        <p class="text-[10px] text-muted mt-1">{{ goalStore.currentEventCampaign.description }}</p>
        <p class="text-[10px] text-accent mt-1">结算模板：{{ goalStore.eventMailTemplateRefs.filter(template => goalStore.currentEventCampaign?.mailboxTemplateIds.includes(template.id)).map(template => template.title).join('、') }}</p>
      </div>
      <div v-if="questStore.currentLimitedTimeQuestCampaign" class="border border-warning/20 rounded-xs px-3 py-2 mb-2 bg-warning/5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-warning">当前可领取 / 限时窗口</p>
          <span class="text-[10px] text-muted">剩余 {{ questStore.currentLimitedTimeQuestRemainingDays }} 天</span>
        </div>
        <p class="text-[10px] text-muted mt-1">{{ questStore.currentLimitedTimeQuestCampaign.description }}</p>
        <p class="text-[10px] text-accent mt-1">{{ weeklyPlanSnapshot.claimableNodeLabels.join('、') || '当前没有额外领奖点。' }}</p>
        <p class="text-[10px] text-success mt-1">活动来源：{{ questStore.currentLimitedTimeQuestCampaign.activitySourceLabel }}</p>
      </div>
      <div v-if="goalStore.currentThemeWeek" class="border border-accent/10 rounded-xs px-3 py-2 mb-2 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">下周准备 / 主题预告</p>
          <span class="text-[10px] text-muted">{{ goalStore.currentThemeWeek.startDay }}-{{ goalStore.currentThemeWeek.endDay }}日</span>
        </div>
        <p class="text-[10px] text-accent mt-1">{{ weeklyPlanSnapshot.nextWeekPrepSummary }}</p>
        <p class="text-[10px] text-muted mt-1">{{ goalStore.currentThemeWeek.description }}</p>
      </div>
      <div v-if="questStore.specialOrder" class="border border-accent/10 rounded-xs px-3 py-2 mb-2 bg-accent/5">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">特殊订单风向</p>
          <span class="text-[10px] text-muted">剩余 {{ questStore.specialOrder.daysRemaining }} 天</span>
        </div>
        <p class="text-[10px] text-muted mt-1">{{ questStore.specialOrder.demandHint || '本期特殊订单会优先消耗高价值经营产出。' }}</p>
        <p v-if="questStore.specialOrder.recommendedHybridIds?.length" class="text-[10px] text-success mt-1">
          推荐关注：{{ questStore.specialOrder.recommendedHybridIds.map(getHybridName).join('、') }}
        </p>
      </div>
      <div v-if="questStore.marketQuestBiasProfile.relationshipFocusLabels?.length" class="border border-accent/10 rounded-xs px-3 py-2 mb-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-accent">家庭 / 仙缘风向</p>
          <span class="text-[10px] text-muted">关系联动</span>
        </div>
        <p class="text-[10px] text-muted mt-1">{{ questStore.marketQuestBiasProfile.boardHint }}</p>
        <p v-if="questStore.marketQuestBiasProfile.specialOrderHint" class="text-[10px] text-accent mt-1">
          {{ questStore.marketQuestBiasProfile.specialOrderHint }}
        </p>
      </div>
      <div v-if="goalStore.dailyGoals.length === 0" class="text-xs text-muted">今日暂无经营提示。</div>
      <div v-else class="space-y-1.5">
        <div v-for="goal in goalStore.dailyGoals" :key="goal.id" class="border border-accent/10 rounded-xs px-3 py-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs">{{ goal.title }}</p>
            <span class="text-[10px]" :class="goal.completed ? 'text-success' : 'text-accent'">{{ goalStore.getGoalSourceText(goal) }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">{{ goal.description }}</p>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusQuestSection('main-quest', '看主线')">看主线</button>
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusQuestSection('board-quests', '看委托')">看委托</button>
        <button v-if="questStore.specialOrder" class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusQuestSection('special-order', '看特殊订单')">
          看特殊订单
        </button>
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusQuestSection('active-quests', '看进行中任务')">看进行中任务</button>
        <button class="btn prompt-action-cta !px-2 !py-1 text-[10px]" @click="focusQuestSection('village-route', '看村庄路线')">看村庄路线</button>
      </div>
    </div>

    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('village-route')"
      :data-prompt-focus="buildPromptFocusAttr('village-route')"
    >
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">村庄建设线路</p>
        <span class="text-[10px] text-muted">{{ villagePhaseLabel }}</span>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">可接任务数加成</span>
          <span class="text-xs text-accent">+{{ villageProjectStore.getQuestCapacityBonus() }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">告示栏加成</span>
          <span class="text-xs text-accent">+{{ villageProjectStore.getDailyQuestBoardBonus() }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">委托铜钱加成</span>
          <span class="text-xs text-accent">{{ Math.round(villageProjectStore.getQuestMoneyBonusRate() * 100) }}%</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">委托好感加成</span>
          <span class="text-xs text-accent">+{{ villageProjectStore.getQuestFriendshipBonus() }}</span>
        </div>
      </div>
      <div v-if="villageQuestProjects.length > 0" class="space-y-1.5">
        <div v-for="project in villageQuestProjects" :key="project.id" class="border border-accent/10 rounded-xs px-3 py-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent truncate">{{ project.name }}</p>
            <span class="text-[10px]" :class="project.canBuildNow ? 'text-success' : 'text-muted'">
              {{ project.canBuildNow ? '可推进' : '待前置' }}
            </span>
          </div>
          <p class="text-[10px] text-muted mt-1 leading-4">{{ project.blockedReason ?? '完成后会继续强化委托收益、任务容量或相关板块入口。' }}</p>
        </div>
      </div>
      <div v-else class="text-xs text-muted">当前暂无与委托/订单直接联动的建设项目。</div>
    </div>
    </template>

    <!-- 主线任务 -->
    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('main-quest')"
      :data-prompt-focus="buildPromptFocusAttr('main-quest')"
    >
      <p class="text-xs text-muted mb-2">
        <BookOpen :size="12" class="inline" />
        主线任务
      </p>
      <div
        v-if="mainQuestDef"
        class="flex items-center justify-between border rounded-xs px-3 py-1.5 cursor-pointer"
        :class="questStore.mainQuest?.accepted && canSubmitMainQuest ? 'border-success/50 bg-success/5 hover:bg-success/10' : 'border-accent/20 hover:bg-accent/5'"
        @click="questModal = { type: 'main' }"
      >
        <div class="min-w-0">
          <p class="text-xs text-accent truncate">第{{ mainQuestDef.chapter }}章 · {{ mainQuestDef.title }}</p>
          <p class="text-xs text-muted truncate">{{ mainQuestDef.description }}</p>
        </div>
        <span class="text-xs whitespace-nowrap ml-2" :class="canSubmitMainQuest ? 'text-success' : questStore.mainQuest?.accepted ? 'text-accent' : 'text-muted'">
          {{ canSubmitMainQuest ? '可提交' : questStore.mainQuest?.accepted ? '进行中' : '未接取' }}
        </span>
      </div>
      <div v-else-if="questStore.completedMainQuests.length >= totalMainQuestCount" class="flex flex-col items-center justify-center py-4 text-muted">
        <CheckCircle :size="24" />
        <p class="text-xs mt-1">主线任务已全部完成</p>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div>
          <p class="text-xs text-muted">在线求助单</p>
          <p class="text-[10px] text-muted mt-1">先把公开 / 好友 / 邻里求助发出去，接单和交付链路会在下一轮继续接。</p>
        </div>
        <Button class="text-[10px]" :disabled="coopOrderStore.loading || coopOrderStore.actionRunning" @click="refreshCoopOrders">
          {{ coopOrderStore.loading ? '加载中…' : '刷新求助单' }}
        </Button>
      </div>

      <div v-if="coopOrderStore.errorMessage" class="border border-danger/20 rounded-xs p-2 text-xs text-danger mb-2">
        {{ coopOrderStore.errorMessage }}
      </div>

      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="space-y-2">
          <div class="grid gap-2 md:grid-cols-2">
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              求助标题
              <input
                v-model="coopOrderStore.titleDraft"
                maxlength="40"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="例如：缺一批冬菜备节"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              求助类别
              <select v-model="coopOrderStore.orderTypeDraft" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
                <option v-for="option in coopOrderTypeOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              可见范围
              <select v-model="coopOrderStore.scopeDraft" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
                <option v-for="option in coopOrderScopeOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              截止时间
              <input
                v-model="coopOrderStore.deadlineAtDraft"
                type="datetime-local"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              />
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              回报类型
              <select v-model="coopOrderStore.rewardTypeDraft" class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent">
                <option v-for="option in coopRewardTypeOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-[10px] text-muted">
              回报数值
              <input
                v-model.number="coopOrderStore.rewardValueDraft"
                type="number"
                min="1"
                class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              />
            </label>
          </div>

          <label class="flex flex-col gap-1 text-[10px] text-muted">
            回报说明
            <input
              v-model="coopOrderStore.rewardLabelDraft"
              maxlength="40"
              class="bg-bg border border-accent/20 rounded-xs px-2 py-1 text-xs text-text outline-none focus:border-accent"
              placeholder="例如：铜钱回报 / 人情回礼 / 节庆礼包"
            />
          </label>

          <label class="flex flex-col gap-1 text-[10px] text-muted">
            求助内容
            <textarea
              v-model="coopOrderStore.descriptionDraft"
              rows="3"
              maxlength="160"
              class="bg-bg border border-accent/20 rounded-xs px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
              placeholder="写清楚当前缺什么、希望别人怎么帮、为什么这单值得接。"
            />
          </label>

          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] text-muted">当前回报可以先走铜钱 / 声望 / 礼物说明，真正结算凭证和交付会在下一轮继续补。</p>
            <Button class="text-[10px]" :disabled="coopOrderStore.actionRunning" @click="submitCoopOrder">
              {{ coopOrderStore.actionRunning ? '发布中…' : '发布求助单' }}
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">我接下的求助单</p>
            <div v-if="coopOrderStore.myAcceptedOrders.length === 0" class="text-[10px] text-muted">当前还没有自己接下的求助单。</div>
            <div v-for="order in coopOrderStore.myAcceptedOrders" :key="order.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-xs text-accent">{{ order.title }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ order.owner_display_name }} 发布 · {{ order.description }}</p>
                </div>
                <span class="text-[10px]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">{{ order.status === 'open' ? '已接单' : order.status === 'expired' ? '已过期' : '已关闭' }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2">
                {{ getCoopOrderTypeLabel(order.order_type) }} · 截止 {{ formatCoopDeadline(order.deadline_at) }}
              </p>
              <div class="flex justify-end mt-2">
                <Button class="text-[10px]" :disabled="coopOrderStore.actionRunning || order.status !== 'open'" @click="cancelAcceptedCoopOrderEntry(order.id)">
                  取消接单
                </Button>
              </div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">我发布的求助单</p>
            <div v-if="coopOrderStore.myOrders.length === 0" class="text-[10px] text-muted">当前还没有自己发布的求助单。</div>
            <div v-for="order in coopOrderStore.myOrders" :key="order.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-xs text-accent">{{ order.title }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ order.description }}</p>
                </div>
                <span class="text-[10px]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">{{ order.status === 'open' ? '进行中' : order.status === 'expired' ? '已过期' : '已关闭' }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2">
                {{ getCoopOrderTypeLabel(order.order_type) }} · {{ getCoopOrderScopeLabel(order.scope) }} · 截止 {{ formatCoopDeadline(order.deadline_at) }}
              </p>
              <p class="text-[10px] text-accent mt-1">
                回报：{{ getCoopRewardTypeLabel(order.reward_type) }} {{ order.reward_value }} {{ order.reward_label ? `· ${order.reward_label}` : '' }}
              </p>
              <p v-if="order.assignee_username" class="text-[10px] text-success mt-1">
                当前接单人：{{ order.assignee_display_name || order.assignee_username }}
              </p>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs p-2">
            <p class="text-[10px] text-muted mb-1">当前可见求助单</p>
            <div v-if="coopOrderStore.visibleOrders.length === 0" class="text-[10px] text-muted">当前还没有对你可见的求助单。</div>
            <div v-for="order in coopOrderStore.visibleOrders" :key="order.id" class="border border-accent/10 rounded-xs p-2 mb-1.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-xs text-accent">{{ order.title }}</p>
                  <p class="text-[10px] text-muted mt-1">{{ order.owner_display_name }} · {{ getCoopOrderScopeLabel(order.scope) }}</p>
                </div>
                <span class="text-[10px]" :class="order.status === 'open' ? 'text-success' : 'text-muted'">{{ order.status === 'open' ? '可接' : order.status === 'expired' ? '已过期' : '已关闭' }}</span>
              </div>
              <p class="text-[10px] text-muted mt-2">{{ order.description }}</p>
              <p class="text-[10px] text-muted mt-2">
                {{ getCoopOrderTypeLabel(order.order_type) }} · 截止 {{ formatCoopDeadline(order.deadline_at) }}
              </p>
              <p class="text-[10px] text-accent mt-1">
                回报：{{ getCoopRewardTypeLabel(order.reward_type) }} {{ order.reward_value }} {{ order.reward_label ? `· ${order.reward_label}` : '' }}
              </p>
              <p v-if="order.assignee_username" class="text-[10px] text-success mt-1">
                当前接单人：{{ order.assignee_display_name || order.assignee_username }}
              </p>
              <div class="flex justify-end mt-2">
                <Button
                  class="text-[10px]"
                  :disabled="coopOrderStore.actionRunning || order.status !== 'open' || !!order.assignee_username"
                  @click="acceptCoopOrderEntry(order.id)"
                >
                  {{ order.assignee_username ? '已有人接单' : '接这张单' }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 今日委托 -->
    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('board-quests')"
      :data-prompt-focus="buildPromptFocusAttr('board-quests')"
    >
      <p class="text-xs text-muted mb-2">
        <Calendar :size="12" class="inline" />
        今日委托
      </p>
      <div v-if="questStore.boardQuests.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
        <Calendar :size="24" />
        <p class="text-xs mt-1">今日暂无委托</p>
      </div>
      <div v-else class="flex flex-col space-y-1.5">
        <div
          v-for="quest in questStore.boardQuests"
          :key="quest.id"
          class="flex items-center justify-between rounded-xs px-3 py-1.5 cursor-pointer"
          :class="quest.isUrgent ? 'border border-red-500/50 bg-red-500/5 hover:bg-red-500/10' : 'border border-accent/20 hover:bg-accent/5'"
          @click="questModal = { type: 'board', questId: quest.id }"
        >
          <div class="min-w-0">
            <p class="text-xs truncate min-w-0" :class="quest.isUrgent ? 'text-red-400' : ''">{{ quest.description }}</p>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <span v-if="questStore.hasCompletedQuestHistory(quest)" class="text-[10px] px-1 rounded-xs border border-success/20 text-success">
                做过同类
              </span>
              <span v-if="quest.variantLabel" class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent">
                {{ quest.variantLabel }}
              </span>
              <span v-if="quest.rumorTask" class="text-[10px] px-1 rounded-xs border border-warning/20 text-warning">
                传闻轻任务
              </span>
              <span v-if="quest.isUrgent" class="text-[10px] px-1 rounded-xs border border-red-500/40 text-red-400">
                紧急 · 仅剩1天
              </span>
              <span v-if="quest.sourceCategory" class="text-[10px] px-1 rounded-xs border border-success/20 text-success">
                村民委托 · {{ getCategoryLabel(quest.sourceCategory) }}
              </span>
              <span v-if="quest.relationshipStageRequired" class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent">
                需{{ getStageLabel(quest.relationshipStageRequired) }}
              </span>
            </div>
            <p v-if="quest.sourceLabel" class="text-[10px] text-warning/80 mt-0.5 truncate">{{ quest.sourceLabel }}</p>
            <p v-if="getQuestRewardPreview(quest)" class="text-[10px] text-muted/70 mt-0.5 truncate">{{ getQuestRewardPreview(quest) }}</p>
            <p v-if="getQuestRelationshipPreview(quest)" class="text-[10px] text-accent/70 mt-0.5 truncate">{{ getQuestRelationshipPreview(quest) }}</p>
          </div>
          <span class="text-xs whitespace-nowrap ml-2" :class="quest.isUrgent ? 'text-red-400' : 'text-accent'">{{ quest.moneyReward }}文</span>
        </div>
      </div>
    </div>

    <!-- 特殊订单 -->
    <div
      v-if="questStore.specialOrder"
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('special-order')"
      :data-prompt-focus="buildPromptFocusAttr('special-order')"
    >
      <p class="text-xs text-muted mb-2">
        <Star :size="12" class="inline" />
        特殊订单
      </p>
      <div
        class="flex items-center justify-between border border-accent/20 rounded-xs px-3 py-1.5 cursor-pointer hover:bg-accent/5"
        @click="questModal = { type: 'special' }"
      >
        <div class="min-w-0">
          <p class="text-xs truncate">{{ questStore.specialOrder.description }}</p>
              <div class="flex flex-wrap gap-1 mt-0.5" v-if="questStore.specialOrder.themeTag || questStore.specialOrder.preferredSeasons?.length || questStore.specialOrder.activitySourceLabel || questStore.specialOrder.orderScoreRule">
                <span class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent" v-if="questStore.specialOrder.themeTag">{{ getThemeLabel(questStore.specialOrder.themeTag) }}</span>
                <span class="text-[10px] px-1 rounded-xs border border-warning/20 text-warning" v-if="questStore.specialOrder.activitySourceLabel">
                  {{ questStore.specialOrder.activitySourceLabel }}
                </span>
                <span class="text-[10px] px-1 rounded-xs border border-success/20 text-success" v-if="questStore.specialOrder.orderScoreRule">
                  {{ getOrderStageTypeLabel(questStore.specialOrder.orderStageType) }}
                </span>
                <span class="text-[10px] px-1 rounded-xs border border-success/20 text-success" v-if="questStore.specialOrder.preferredSeasons?.length">
                  {{ questStore.specialOrder.preferredSeasons.map(getSeasonLabel).join(' / ') }}偏好
                </span>
              </div>
              <p v-if="questStore.specialOrder.demandHint" class="text-[10px] text-muted/70 mt-0.5 truncate">{{ questStore.specialOrder.demandHint }}</p>
        </div>
        <span class="text-xs text-accent whitespace-nowrap ml-2">{{ questStore.specialOrder.moneyReward }}文</span>
      </div>
    </div>

    <div class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div>
          <p class="text-xs text-muted">奖券与阶段赏格</p>
          <p class="text-[10px] text-muted mt-0.5">
            委托入账按「{{ rewardTicketPrizeNaming.intakeLabel }}」记，兑换统一走「{{ rewardTicketPrizeNaming.exchangeLabel }}」。
          </p>
        </div>
        <span class="text-[10px] text-accent">{{ activeRewardTicketPrizeStage.label }}</span>
      </div>
      <div class="space-y-1.5 mb-2">
        <p v-for="line in rewardTicketSourceHints" :key="line" class="text-[10px] text-muted leading-4">
          {{ line }}
        </p>
      </div>
      <div class="space-y-1.5">
        <div v-for="stage in rewardTicketPrizeStageEntries" :key="stage.id" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs" :class="stage.active ? 'text-accent' : stage.unlocked ? 'text-success' : 'text-text'">{{ stage.label }}</p>
            <span class="text-[10px]" :class="stage.active ? 'text-accent' : stage.unlocked ? 'text-success' : 'text-muted'">
              {{ stage.active ? '当前奖池' : stage.unlocked ? '已解锁' : `累计 ${stage.unlockLifetimeTickets} 张` }}
            </span>
          </div>
          <p class="text-[10px] text-muted mt-1">{{ stage.spotlightRewards.join('、') }}</p>
          <p class="text-[10px] text-muted/80 mt-0.5">{{ stage.notes[0] }}</p>
        </div>
      </div>
    </div>

    <!-- 进行中 -->
    <div
      class="border border-accent/20 rounded-xs p-3 mb-3"
      :class="promptSectionClass('active-quests')"
      :data-prompt-focus="buildPromptFocusAttr('active-quests')"
    >
      <p class="text-xs text-muted mb-2">
        <Clock :size="12" class="inline" />
        进行中 ({{ questStore.activeQuests.length }}/{{ questStore.MAX_ACTIVE_QUESTS }})
      </p>
      <div v-if="questStore.activeQuests.length === 0" class="flex flex-col items-center justify-center py-4 text-muted">
        <Clock :size="24" />
        <p class="text-xs mt-1">暂无进行中的任务</p>
      </div>
      <div v-else class="flex flex-col space-y-1.5">
        <div
          v-for="quest in questStore.activeQuests"
          :key="quest.id"
          class="border rounded-xs px-3 py-1.5 cursor-pointer"
          :class="canSubmit(quest) ? 'border-success/50 bg-success/5 hover:bg-success/10' : quest.isUrgent ? 'border-red-500/50 bg-red-500/5 hover:bg-red-500/10' : quest.type === 'special_order' ? 'border-accent/30 hover:bg-accent/5' : 'border-accent/20 hover:bg-accent/5'"
          @click="questModal = { type: 'active', questId: quest.id }"
        >
          <div class="flex items-center justify-between">
            <div class="min-w-0">
              <p class="text-xs truncate min-w-0">{{ quest.description }}</p>
              <div class="flex flex-wrap gap-1 mt-0.5" v-if="quest.isUrgent || quest.sourceCategory || quest.relationshipStageRequired || quest.themeTag || quest.bonusSummary?.length || quest.activitySourceLabel || quest.orderScoreRule">
                <span v-if="quest.variantLabel" class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent">
                  {{ quest.variantLabel }}
                </span>
                <span v-if="quest.rumorTask" class="text-[10px] px-1 rounded-xs border border-warning/20 text-warning">
                  传闻轻任务
                </span>
                <span v-if="quest.isUrgent" class="text-[10px] px-1 rounded-xs border border-red-500/40 text-red-400">
                  紧急委托
                </span>
                <span v-if="quest.themeTag" class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent">
                  {{ getThemeLabel(quest.themeTag) }}
                </span>
                <span v-if="quest.activitySourceLabel" class="text-[10px] px-1 rounded-xs border border-warning/20 text-warning">
                  {{ quest.activitySourceLabel }}
                </span>
                <span v-if="quest.orderScoreRule" class="text-[10px] px-1 rounded-xs border border-success/20 text-success">
                  {{ getOrderStageTypeLabel(quest.orderStageType) }}
                </span>
                <span v-if="quest.sourceCategory" class="text-[10px] px-1 rounded-xs border border-success/20 text-success">
                  {{ getCategoryLabel(quest.sourceCategory) }}
                </span>
                <span v-if="quest.relationshipStageRequired" class="text-[10px] px-1 rounded-xs border border-accent/20 text-accent">
                  {{ getStageLabel(quest.relationshipStageRequired) }}
                </span>
              </div>
              <p v-if="quest.sourceLabel" class="text-[10px] text-warning/80 mt-0.5 truncate">{{ quest.sourceLabel }}</p>
              <p v-if="getQuestRelationshipPreview(quest)" class="text-[10px] text-accent/70 mt-0.5 truncate">{{ getQuestRelationshipPreview(quest) }}</p>
            </div>
            <span class="text-xs whitespace-nowrap ml-2" :class="canSubmit(quest) ? 'text-success' : 'text-muted'">
              {{ canSubmit(quest) ? '可提交' : `剩${quest.daysRemaining}天` }}
            </span>
          </div>
          <div v-if="quest.type !== 'delivery'" class="mt-1 flex items-center space-x-2">
            <div class="flex-1 h-1 bg-bg rounded-xs border border-accent/10">
              <div
                class="h-full rounded-xs bg-accent transition-all"
                :style="{ width: Math.floor((getEffectiveProgress(quest) / getQuestProgressMax(quest)) * 100) + '%' }"
              />
            </div>
            <span class="text-xs text-muted">{{ getEffectiveProgress(quest) }}/{{ getQuestProgressMax(quest) }}</span>
          </div>
          <div v-else class="mt-0.5">
            <span class="text-xs text-muted">背包 {{ inventoryStore.getItemCount(quest.targetItemId) }}/{{ quest.targetQuantity }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计 -->
    <div class="border border-accent/10 rounded-xs p-2 text-center">
      <p class="text-xs text-muted">
        累计完成委托 {{ questStore.completedQuestCount }} 个 · 主线进度 {{ questStore.completedMainQuests.length }}/{{ totalMainQuestCount }}
      </p>
    </div>

    <div class="border border-accent/10 rounded-xs p-3 mt-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted">订单历史</p>
        <span class="text-[10px] text-accent">{{ questStore.completedQuestHistory.length }} 条</span>
      </div>
      <div v-if="questStore.completedQuestHistory.length === 0" class="text-[10px] text-muted">还没有已完成订单记录。</div>
      <div v-else class="space-y-1.5">
        <div v-for="entry in questStore.completedQuestHistory.slice(0, 6)" :key="entry.id" class="border border-accent/10 rounded-xs px-2 py-1.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-accent truncate">{{ entry.npcName }}：{{ entry.description }}</p>
            <span class="text-[10px]" :class="entry.isSpecialOrder ? 'text-warning' : 'text-muted'">
              {{ entry.isSpecialOrder ? '特单' : '委托' }}
            </span>
          </div>
          <p class="text-[10px] text-muted mt-0.5">{{ entry.completedDayTag }} / {{ entry.rewardSummary }}</p>
          <p v-if="entry.activitySourceLabel || entry.themeTag" class="text-[10px] text-muted/70 mt-0.5">
            {{ [entry.activitySourceLabel, getHistoryThemeLabel(entry.themeTag)].filter(Boolean).join(' / ') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="questModal" class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="questModal = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="questModal = null">
            <X :size="14" />
          </button>

          <!-- 主线任务详情 -->
          <template v-if="questModal.type === 'main' && mainQuestDef">
            <p class="text-accent text-sm mb-1">第{{ mainQuestDef.chapter }}章「{{ chapterTitle }}」</p>
            <p class="text-xs font-bold text-accent mb-1">{{ mainQuestDef.title }}</p>
            <p class="text-xs text-muted leading-relaxed mb-2">{{ mainQuestDef.description }}</p>
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">目标</p>
              <div v-for="(obj, i) in mainQuestDef.objectives" :key="i" class="flex items-center space-x-1">
                <CircleCheck v-if="mainQuestProgress[i]" :size="12" class="text-success shrink-0" />
                <Circle v-else :size="12" class="text-danger shrink-0" />
                <span class="text-xs" :class="mainQuestProgress[i] ? 'text-success' : ''">{{ obj.label }}</span>
              </div>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-3">
              <p class="text-xs text-muted mb-1">奖励</p>
              <p class="text-xs">
                {{ mainQuestDef.moneyReward }}文
                <template v-if="mainQuestDef.friendshipReward?.length">+ 好感</template>
                <template v-if="mainQuestDef.itemReward?.length">
                  + {{ mainQuestDef.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join(', ') }}
                </template>
              </p>
            </div>
            <Button
              v-if="!questStore.mainQuest?.accepted"
              class="w-full justify-center"
              :icon="Plus"
              :icon-size="12"
              @click="handleAcceptMain"
            >
              接取任务
            </Button>
            <Button
              v-else
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': canSubmitMainQuest }"
              :icon="CheckCircle"
              :icon-size="12"
              :disabled="!canSubmitMainQuest"
              @click="handleSubmitMain"
            >
              提交任务
            </Button>
          </template>

          <!-- 委托详情 -->
          <template v-if="questModal.type === 'board' && selectedBoardQuest">
            <p class="text-accent text-sm mb-2">委托详情</p>
            <p class="text-xs leading-relaxed mb-2">{{ selectedBoardQuest.description }}</p>
            <div v-if="selectedBoardQuest.sourceCategory || selectedBoardQuest.relationshipStageRequired" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">委托来源</p>
              <p class="text-xs">
                <span v-if="selectedBoardQuest.sourceCategory">村民委托 · {{ getCategoryLabel(selectedBoardQuest.sourceCategory) }}</span>
                <span v-if="selectedBoardQuest.relationshipStageRequired">
                  <template v-if="selectedBoardQuest.sourceCategory"> · </template>需{{ getStageLabel(selectedBoardQuest.relationshipStageRequired) }}
                </span>
              </p>
            </div>
            <div v-if="getQuestRelationshipImpactLines(selectedBoardQuest).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">关系影响</p>
              <p
                v-for="line in getQuestRelationshipImpactLines(selectedBoardQuest)"
                :key="line"
                class="text-[10px] leading-4"
              >
                {{ line }}
              </p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">目标</p>
              <p class="text-xs">{{ selectedBoardQuest.targetItemName }} × {{ selectedBoardQuest.targetQuantity }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-3">
              <p class="text-xs text-muted mb-1">奖励</p>
              <p class="text-xs">{{ selectedBoardQuest.moneyReward }}文 + 好感{{ selectedBoardQuest.friendshipReward }}</p>
              <p v-if="getQuestRewardDetails(selectedBoardQuest).length > 0" class="text-[10px] text-accent mt-1 leading-4">
                {{ getQuestRewardDetails(selectedBoardQuest).join('；') }}
              </p>
              <p v-if="selectedBoardQuest.bonusSummary?.length" class="text-[10px] text-success mt-1">
                {{ selectedBoardQuest.bonusSummary.join('；') }}
              </p>
            </div>
            <Button
              class="w-full justify-center"
              :icon="Plus"
              :icon-size="12"
              :disabled="questStore.activeQuests.length >= questStore.MAX_ACTIVE_QUESTS"
              @click="handleAccept(selectedBoardQuest.id)"
            >
              接取委托
            </Button>
          </template>

          <!-- 特殊订单详情 -->
          <template v-if="questModal.type === 'special' && questStore.specialOrder">
            <p class="text-accent text-sm mb-2">
              特殊订单
              <span v-if="questStore.specialOrder.tierLabel" class="text-[10px] text-muted border border-accent/20 rounded-xs px-1 ml-1">
                {{ questStore.specialOrder.tierLabel }}
              </span>
              <span v-if="questStore.specialOrder.themeTag" class="text-[10px] text-accent border border-accent/20 rounded-xs px-1 ml-1">
                {{ getThemeLabel(questStore.specialOrder.themeTag) }}
              </span>
              <span v-if="questStore.specialOrder.activitySourceLabel" class="text-[10px] text-warning border border-warning/20 rounded-xs px-1 ml-1">
                {{ questStore.specialOrder.activitySourceLabel }}
              </span>
            </p>
            <p class="text-xs leading-relaxed mb-2">{{ questStore.specialOrder.description }}</p>
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">目标</p>
              <p class="text-xs">{{ getQuestTargetSummary(questStore.specialOrder) }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-2" v-if="questStore.specialOrder.demandHint || questStore.specialOrder.recommendedHybridIds?.length || questStore.specialOrder.preferredSeasons?.length">
              <p class="text-xs text-muted mb-1">需求提示</p>
              <p v-if="questStore.specialOrder.demandHint" class="text-xs text-accent/80 leading-relaxed">{{ questStore.specialOrder.demandHint }}</p>
              <p v-if="questStore.specialOrder.preferredSeasons?.length" class="text-[10px] text-muted mt-1">
                更常见于：{{ questStore.specialOrder.preferredSeasons.map(getSeasonLabel).join(' / ') }}
              </p>
              <p v-if="questStore.specialOrder.recommendedHybridIds?.length" class="text-[10px] text-success mt-1">
                推荐杂交：{{ questStore.specialOrder.recommendedHybridIds.map(getHybridName).join('、') }}
              </p>
            </div>
            <div v-if="getSpecialOrderRuleLines(questStore.specialOrder).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">订单规则</p>
              <p v-for="line in getSpecialOrderRuleLines(questStore.specialOrder)" :key="line" class="text-[10px] leading-4">
                {{ line }}
              </p>
            </div>
            <div v-if="getSpecialOrderScoreHintLines(questStore.specialOrder).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">评分提示</p>
              <p v-for="line in getSpecialOrderScoreHintLines(questStore.specialOrder)" :key="line" class="text-[10px] leading-4 text-success/90">
                {{ line }}
              </p>
            </div>
            <div v-if="getSpecialOrderDeliverySourceLines(questStore.specialOrder).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">交付来源</p>
              <p v-for="line in getSpecialOrderDeliverySourceLines(questStore.specialOrder)" :key="line" class="text-[10px] leading-4 text-warning/90">
                {{ line }}
              </p>
            </div>
            <div v-if="getSpecialOrderStageLines(questStore.specialOrder).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">阶段 / 交付结构</p>
              <p v-for="line in getSpecialOrderStageLines(questStore.specialOrder)" :key="line" class="text-[10px] leading-4">
                {{ line }}
              </p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-3">
              <p class="text-xs text-muted mb-1">奖励</p>
              <p class="text-xs">
                {{ questStore.specialOrder.moneyReward }}文 + 好感{{ questStore.specialOrder.friendshipReward }}
                <template v-if="questStore.specialOrder.itemReward?.length">
                  + {{ questStore.specialOrder.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join(', ') }}
                </template>
              </p>
              <p v-if="getQuestRewardDetails(questStore.specialOrder).length > 0" class="text-[10px] text-accent mt-1 leading-4">
                {{ getQuestRewardDetails(questStore.specialOrder).join('；') }}
              </p>
            </div>
            <Button
              class="w-full justify-center"
              :icon="Plus"
              :icon-size="12"
              :disabled="questStore.activeQuests.length >= questStore.MAX_ACTIVE_QUESTS"
              @click="handleAcceptSpecialOrder"
            >
              接取订单
            </Button>
          </template>

          <!-- 进行中任务详情 -->
          <template v-if="questModal.type === 'active' && selectedActiveQuest">
            <p class="text-accent text-sm mb-2">
              {{ selectedActiveQuest.type === 'special_order' ? '特殊订单' : '委托' }}
            </p>
            <p class="text-xs leading-relaxed mb-2">{{ selectedActiveQuest.description }}</p>
            <div v-if="selectedActiveQuest.sourceCategory || selectedActiveQuest.relationshipStageRequired || selectedActiveQuest.themeTag || selectedActiveQuest.activitySourceLabel" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">委托来源</p>
              <p class="text-xs">
                <span v-if="selectedActiveQuest.themeTag">{{ getThemeLabel(selectedActiveQuest.themeTag) }}</span>
                <span v-if="selectedActiveQuest.activitySourceLabel">
                  <template v-if="selectedActiveQuest.themeTag"> · </template>{{ selectedActiveQuest.activitySourceLabel }}
                </span>
                <span v-if="selectedActiveQuest.sourceCategory">村民委托 · {{ getCategoryLabel(selectedActiveQuest.sourceCategory) }}</span>
                <span v-if="selectedActiveQuest.relationshipStageRequired">
                  <template v-if="selectedActiveQuest.sourceCategory || selectedActiveQuest.themeTag"> · </template>需{{ getStageLabel(selectedActiveQuest.relationshipStageRequired) }}
                </span>
              </p>
            </div>
            <div v-if="selectedActiveQuest.type === 'special_order' && getSpecialOrderRuleLines(selectedActiveQuest).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">订单规则</p>
              <p v-for="line in getSpecialOrderRuleLines(selectedActiveQuest)" :key="line" class="text-[10px] leading-4">
                {{ line }}
              </p>
            </div>
            <div v-if="selectedActiveQuest.type === 'special_order' && getSpecialOrderScoreHintLines(selectedActiveQuest).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">评分提示</p>
              <p v-for="line in getSpecialOrderScoreHintLines(selectedActiveQuest)" :key="line" class="text-[10px] leading-4 text-success/90">
                {{ line }}
              </p>
            </div>
            <div v-if="selectedActiveQuest.type === 'special_order' && getSpecialOrderDeliverySourceLines(selectedActiveQuest).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">交付来源</p>
              <p v-for="line in getSpecialOrderDeliverySourceLines(selectedActiveQuest)" :key="line" class="text-[10px] leading-4 text-warning/90">
                {{ line }}
              </p>
            </div>
            <div v-if="selectedActiveQuest.type === 'special_order' && getSpecialOrderStageLines(selectedActiveQuest).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">阶段 / 交付结构</p>
              <p v-for="line in getSpecialOrderStageLines(selectedActiveQuest)" :key="line" class="text-[10px] leading-4">
                {{ line }}
              </p>
            </div>
            <div v-if="getQuestRelationshipImpactLines(selectedActiveQuest).length > 0" class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">关系影响</p>
              <p
                v-for="line in getQuestRelationshipImpactLines(selectedActiveQuest)"
                :key="line"
                class="text-[10px] leading-4"
              >
                {{ line }}
              </p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">进度</p>
              <div v-if="selectedActiveQuest.type !== 'delivery'" class="flex items-center space-x-2">
                <div class="flex-1 h-1.5 bg-bg rounded-xs border border-accent/10">
                  <div
                    class="h-full rounded-xs bg-accent transition-all"
                    :style="{
                      width: Math.floor((getEffectiveProgress(selectedActiveQuest) / getQuestProgressMax(selectedActiveQuest)) * 100) + '%'
                    }"
                  />
                </div>
                <span class="text-xs text-muted">
                  {{ getEffectiveProgress(selectedActiveQuest) }}/{{ getQuestProgressMax(selectedActiveQuest) }}
                </span>
              </div>
              <p v-else class="text-xs">
                背包中 {{ inventoryStore.getItemCount(selectedActiveQuest.targetItemId) }}/{{ selectedActiveQuest.targetQuantity }}
              </p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-2">
              <p class="text-xs text-muted mb-1">剩余时间</p>
              <p class="text-xs">{{ selectedActiveQuest.daysRemaining }} 天</p>
            </div>
            <div class="border border-accent/10 rounded-xs p-2 mb-3">
              <p class="text-xs text-muted mb-1">奖励</p>
              <p class="text-xs">
                {{ selectedActiveQuest.moneyReward }}文 + 好感{{ selectedActiveQuest.friendshipReward }}
                <template v-if="selectedActiveQuest.itemReward?.length">
                  + {{ selectedActiveQuest.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join(', ') }}
                </template>
              </p>
              <p v-if="getQuestRewardDetails(selectedActiveQuest).length > 0" class="text-[10px] text-accent mt-1 leading-4">
                {{ getQuestRewardDetails(selectedActiveQuest).join('；') }}
              </p>
              <p v-if="selectedActiveQuest.bonusSummary?.length" class="text-[10px] text-success mt-1">
                {{ selectedActiveQuest.bonusSummary.join('；') }}
              </p>
            </div>
            <Button
              class="w-full justify-center"
              :class="{ '!bg-accent !text-bg': canSubmit(selectedActiveQuest) }"
              :icon="CheckCircle"
              :icon-size="12"
              :disabled="!canSubmit(selectedActiveQuest)"
              @click="handleSubmit(selectedActiveQuest.id)"
            >
              提交任务
            </Button>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { ClipboardList, Calendar, Clock, Plus, CheckCircle, CircleCheck, Circle, Star, BookOpen, X } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { runPromptAction, usePromptFocusPanel } from '@/composables/usePromptNavigation'
  import GuidanceDigestPanel from '@/components/game/GuidanceDigestPanel.vue'
  import QaGovernancePanel from '@/components/game/QaGovernancePanel.vue'
  import type { QuestInstance, RelationshipStage, VillagerQuestCategory } from '@/types'
  import { useInventoryStore } from '@/stores/useInventoryStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { useCoopOrderStore } from '@/stores/useCoopOrderStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import { useWalletStore } from '@/stores/useWalletStore'
  import type { OnlineCoopOrderScope, OnlineCoopOrderType, OnlineCoopRewardType } from '@/utils/onlineProfileApi'
  import { REWARD_TICKET_LABELS } from '@/data/rewardTickets'
  import { getSpecialOrderRewardProfile } from '@/data/quests'
  import { getItemById, getStoryQuestById, CHAPTER_TITLES, STORY_QUESTS } from '@/data'
  import { getCropById } from '@/data/crops'
  import { addLog } from '@/composables/useGameLog'

  const questStore = useQuestStore()
  const coopOrderStore = useCoopOrderStore()
  const inventoryStore = useInventoryStore()
  const goalStore = useGoalStore()
  const isCompactMobile = ref(false)
  const questPreludeExpanded = ref(false)
  const weeklyPlanSnapshot = computed(() => goalStore.weeklyPlanSnapshot)
  const npcStore = useNpcStore()
  const villageProjectStore = useVillageProjectStore()
  const walletStore = useWalletStore()
  const { buildPromptFocusAttr, isPromptFocusActive } = usePromptFocusPanel('quest')
  const syncCompactViewportMode = () => {
    isCompactMobile.value = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  }
  const questPreludeForceOpen = computed(() => ['prompt-hints', 'village-route'].some(key => isPromptFocusActive(key)))

  const CATEGORY_LABELS: Record<VillagerQuestCategory, string> = {
    gathering: '采集',
    cooking: '烹饪筹备',
    fishing: '钓鱼',
    errand: '跑腿',
    festival_prep: '节庆筹备',
    rumor: '传闻请托'
  }

  const STAGE_LABELS: Record<RelationshipStage, string> = {
    recognize: '认识',
    familiar: '熟悉',
    friend: '朋友',
    bestie: '挚友',
    romance: '恋爱',
    married: '婚后',
    family: '家庭'
  }

  const COOP_ORDER_TYPE_OPTIONS: Array<{ id: OnlineCoopOrderType; label: string }> = [
    { id: 'material_help', label: '材料求助' },
    { id: 'festival_supply', label: '节庆备货' },
    { id: 'museum_support', label: '博物馆补展' },
    { id: 'fishpond_borrow', label: '鱼塘借种' },
    { id: 'breeding_cert', label: '育种认证' },
    { id: 'village_build', label: '村社建设' },
    { id: 'expedition_supply', label: '远征补给' },
    { id: 'npc_request', label: 'NPC 特殊请求' },
    { id: 'emergency_response', label: '临时灾害应对' },
  ]

  const COOP_ORDER_SCOPE_OPTIONS: Array<{ id: OnlineCoopOrderScope; label: string }> = [
    { id: 'public', label: '公开' },
    { id: 'friends', label: '好友' },
    { id: 'neighbors', label: '邻里' },
  ]

  const COOP_REWARD_TYPE_OPTIONS: Array<{ id: OnlineCoopRewardType; label: string }> = [
    { id: 'money', label: '赏金' },
    { id: 'reputation', label: '声望' },
    { id: 'gift', label: '礼物' },
  ]

  const coopOrderTypeOptions = computed(() => COOP_ORDER_TYPE_OPTIONS)
  const coopOrderScopeOptions = computed(() => COOP_ORDER_SCOPE_OPTIONS)
  const coopRewardTypeOptions = computed(() => COOP_REWARD_TYPE_OPTIONS)

  const getItemName = (id: string): string => {
    return getItemById(id)?.name ?? id
  }

  const getCoopOrderTypeLabel = (orderType: OnlineCoopOrderType) =>
    COOP_ORDER_TYPE_OPTIONS.find(option => option.id === orderType)?.label || orderType

  const getCoopOrderScopeLabel = (scope: OnlineCoopOrderScope) =>
    COOP_ORDER_SCOPE_OPTIONS.find(option => option.id === scope)?.label || scope

  const getCoopRewardTypeLabel = (rewardType: OnlineCoopRewardType) =>
    COOP_REWARD_TYPE_OPTIONS.find(option => option.id === rewardType)?.label || rewardType

  const formatCoopDeadline = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false })

  const refreshCoopOrders = async () => {
    await coopOrderStore.refreshOverview().catch(() => {})
  }

  const submitCoopOrder = async () => {
    await coopOrderStore.submitOrder().catch(() => {})
  }

  const acceptCoopOrderEntry = async (orderId: string) => {
    await coopOrderStore.acceptOrder(orderId).catch(() => {})
  }

  const cancelAcceptedCoopOrderEntry = async (orderId: string) => {
    await coopOrderStore.cancelAcceptedOrder(orderId).catch(() => {})
  }

  const focusQuestSection = (focusKey: string, label: string) => {
    runPromptAction({
      id: `quest-${focusKey}`,
      label,
      mode: 'cta',
      panelKey: 'quest',
      focusKey
    })
  }

  const promptSectionClass = (focusKey: string) => (isPromptFocusActive(focusKey) ? 'prompt-focus-target--active' : '')

  const getHybridName = (id: string): string => {
    return getCropById(id)?.name ?? getItemName(id)
  }

  const getCategoryLabel = (category?: VillagerQuestCategory): string => {
    return category ? CATEGORY_LABELS[category] : '委托'
  }

  const getStageLabel = (stage?: RelationshipStage): string => {
    return stage ? STAGE_LABELS[stage] : '认识'
  }

  const getQuestRewardDetails = (quest: QuestInstance | null | undefined): string[] => {
    if (!quest) return []
    const details: string[] = []
    if (quest.rewardProfileId) {
      const profile = getSpecialOrderRewardProfile(quest.rewardProfileId)
      details.push(`奖励档案：${profile?.label ?? quest.rewardProfileId}`)
    }
    if (quest.ticketReward && Object.keys(quest.ticketReward).length > 0) {
      details.push(`票券：${Object.entries(quest.ticketReward).map(([ticketType, amount]) => `${REWARD_TICKET_LABELS[ticketType as keyof typeof REWARD_TICKET_LABELS] ?? ticketType}×${amount}`).join('、')}`)
    }
    if (quest.itemReward?.length) {
      details.push(`物品：${quest.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join('、')}`)
    }
    if (quest.recipeReward?.length) {
      details.push(`食谱：${quest.recipeReward.join('、')}`)
    }
    if (quest.buildingClueText) {
      details.push('附带生活/建筑线索')
    }
    return details
  }

  const getQuestRewardPreview = (quest: QuestInstance | null | undefined): string => {
    if (!quest) return ''
    const parts: string[] = [`奖励：${quest.moneyReward}文`]
    if (quest.friendshipReward) {
      parts.push(`好感+${quest.friendshipReward}`)
    }
    if (quest.ticketReward && Object.keys(quest.ticketReward).length > 0) {
      parts.push(`票券${Object.entries(quest.ticketReward).map(([ticketType, amount]) => `${REWARD_TICKET_LABELS[ticketType as keyof typeof REWARD_TICKET_LABELS] ?? ticketType}×${amount}`).join('、')}`)
    }
    if (quest.itemReward?.length) {
      parts.push(`物品${quest.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join('、')}`)
    }
    return parts.join(' · ')
  }

  const SEASON_LABELS: Record<string, string> = {
    spring: '春季',
    summer: '夏季',
    autumn: '秋季',
    winter: '冬季'
  }

  const getSeasonLabel = (season: string): string => {
    return SEASON_LABELS[season] ?? season
  }

  const getThemeLabel = (themeTag?: QuestInstance['themeTag']): string => {
    if (themeTag === 'fishpond') return '鱼塘订单'
    if (themeTag === 'breeding') return '育种订单'
    return '特殊订单'
  }
  const getHistoryThemeLabel = (themeTag?: string): string =>
    themeTag === 'fishpond' || themeTag === 'breeding' ? getThemeLabel(themeTag) : ''

  const getOrderStageTypeLabel = (orderStageType?: QuestInstance['orderStageType']): string => {
    if (orderStageType === 'combo') return '组合交付'
    if (orderStageType === 'multi') return '阶段订单'
    if (orderStageType === 'single') return '单阶段订单'
    return '订单 3.0'
  }

  const getSpecialOrderRuleLines = (quest: QuestInstance | null | undefined): string[] => {
    if (!quest) return []
    const lines: string[] = []

    if (quest.orderScoreRule) {
      lines.push(`评分规则：${quest.orderScoreRule.label}`)
      lines.push(quest.orderScoreRule.description)
      if (quest.orderScoreRule.factorSummary.length > 0) {
        lines.push(`评分关注：${quest.orderScoreRule.factorSummary.join('；')}`)
      }
      if (quest.orderScoreRule.previewText) {
        lines.push(`结算提示：${quest.orderScoreRule.previewText}`)
      }
    }

    if (quest.antiRepeatTags?.length) {
      lines.push(`轮换标签：${quest.antiRepeatTags.join(' / ')}`)
    }

    if (quest.requirementSummary?.length) {
      lines.push(...quest.requirementSummary.map(line => `要求：${line}`))
    }

    return lines
  }

  const getSpecialOrderScoreHintLines = (quest: QuestInstance | null | undefined): string[] => {
    if (!quest?.scoreHint?.length) return []
    return quest.scoreHint
  }

  const getSpecialOrderDeliverySourceLines = (quest: QuestInstance | null | undefined): string[] => {
    if (!quest?.deliverySourceHint?.length) return []
    return quest.deliverySourceHint
  }

  const getSpecialOrderStageLines = (quest: QuestInstance | null | undefined): string[] => {
    if (!quest) return []
    const lines: string[] = []

    if (quest.activitySourceLabel) {
      lines.push(`活动来源：${quest.activitySourceLabel}`)
    }
    if (quest.orderStageType) {
      lines.push(`订单结构：${getOrderStageTypeLabel(quest.orderStageType)}`)
    }
    if (quest.stageDefinitions?.length) {
      quest.stageDefinitions.forEach((stage, index) => {
        const targetText = stage.targetItemName && stage.targetQuantity ? ` · ${stage.targetItemName}×${stage.targetQuantity}` : ''
        lines.push(`阶段 ${index + 1}：${stage.title}${targetText}`)
        if (stage.description) {
          lines.push(`- ${stage.description}`)
        }
      })
    }
    if (quest.comboRequirements?.length) {
      lines.push(`组合交付：${quest.comboRequirements.map(requirement => `${requirement.itemName}×${requirement.quantity}`).join('、')}`)
    }
    if (quest.orderProgressState) {
      const currentStage = (quest.orderProgressState.currentStageIndex ?? 0) + 1
      lines.push(`当前阶段进度：第 ${currentStage} 阶段`)
    }

    return lines
  }

  const getQuestRelationshipPreview = (quest: QuestInstance | null | undefined): string => {
    if (!quest || !quest.sourceCategory) return ''

    const parts: string[] = [`当前关系：${npcStore.getRelationshipStageText(quest.npcId)}`]
    const currentBenefits = npcStore.getRelationshipBenefits(quest.npcId)

    if (currentBenefits.length > 0) {
      parts.push(`当前关系收益：${currentBenefits[0]}`)
    } else if (quest.relationshipStageRequired) {
      parts.push(`接取门槛：需${getStageLabel(quest.relationshipStageRequired)}`)
    }

    return parts.join(' · ')
  }

  const getQuestRelationshipImpactLines = (quest: QuestInstance | null | undefined): string[] => {
    if (!quest || !quest.sourceCategory) return []

    const lines: string[] = [`当前关系阶段：${npcStore.getRelationshipStageText(quest.npcId)}`]

    if (quest.relationshipStageRequired) {
      lines.push(`委托解锁条件：需达到${getStageLabel(quest.relationshipStageRequired)}`)
    }

    const currentBenefits = npcStore.getRelationshipBenefits(quest.npcId)
    if (currentBenefits.length > 0) {
      lines.push(`当前关系收益：${currentBenefits.join('；')}`)
    }

    const nextBenefits = npcStore.getNextRelationshipBenefits(quest.npcId)
    if (nextBenefits.length > 0) {
      lines.push(`下一阶段可解锁：${nextBenefits.join('；')}`)
    }

    return lines
  }

  const getQuestProgressMax = (quest: QuestInstance | null | undefined): number => {
    if (!quest) return 1
    if (quest.comboRequirements?.length) {
      return quest.comboRequirements.reduce((total, requirement) => total + requirement.quantity, 0)
    }
    return Math.max(1, quest.targetQuantity)
  }

  const getQuestTargetSummary = (quest: QuestInstance | null | undefined): string => {
    if (!quest) return ''
    if (quest.comboRequirements?.length) {
      return quest.comboRequirements.map(requirement => `${requirement.itemName} × ${requirement.quantity}`).join('、')
    }
    return `${quest.targetItemName} × ${quest.targetQuantity}`
  }

  const rewardTicketPrizeNaming = computed(() => walletStore.rewardTicketPrizeNaming)
  const activeRewardTicketPrizeStage = computed(() => walletStore.activeRewardTicketPrizeStage)
  const rewardTicketPrizeStageEntries = computed(() => walletStore.rewardTicketPrizeStageEntries.slice(0, 3))
  const rewardTicketSourceHints = computed(() => walletStore.rewardTicketSourceHints.slice(0, 3))

  const villagePhaseLabelMap = {
    bootstrap: '中期过渡',
    expansion: '后期扩建',
    endgame: '终局展示'
  } as const

  const villagePhaseLabel = computed(() => villagePhaseLabelMap[villageProjectStore.overviewSummary.currentPhase] ?? villageProjectStore.overviewSummary.currentPhase)
  const villageQuestProjects = computed(() => villageProjectStore.getLinkedProjectSummaries('quest').filter(project => !project.completed).slice(0, 3))

  // === 弹窗状态 ===

  type QuestModalState = { type: 'main' } | { type: 'board'; questId: string } | { type: 'special' } | { type: 'active'; questId: string }

  const questModal = ref<QuestModalState | null>(null)

  const selectedBoardQuest = computed(() => {
    const m = questModal.value
    if (!m || m.type !== 'board') return null
    return questStore.boardQuests.find(q => q.id === m.questId) ?? null
  })

  const selectedActiveQuest = computed(() => {
    const m = questModal.value
    if (!m || m.type !== 'active') return null
    return questStore.activeQuests.find(q => q.id === m.questId) ?? null
  })

  const totalMainQuestCount = STORY_QUESTS.length

  // === 主线任务 ===

  const mainQuestDef = computed(() => {
    if (!questStore.mainQuest) return null
    return getStoryQuestById(questStore.mainQuest.questId) ?? null
  })

  const chapterTitle = computed(() => {
    if (!mainQuestDef.value) return ''
    return CHAPTER_TITLES[mainQuestDef.value.chapter] ?? ''
  })

  const mainQuestProgress = computed(() => {
    return questStore.mainQuest?.objectiveProgress ?? []
  })

  const canSubmitMainQuest = computed(() => questStore.canSubmitMainQuest())
  const availableQuestSlots = computed(() => Math.max(0, questStore.MAX_ACTIVE_QUESTS - questStore.activeQuests.length))
  const firstReadyActiveQuest = computed(() => questStore.activeQuests.find(quest => canSubmit(quest)) ?? null)
  const urgentBoardQuest = computed(() => questStore.boardQuests.find(quest => quest.isUrgent) ?? null)

  type QuestPrimaryActionCard = {
    title: string
    summary: string
    detailLines: string[]
    statusLabel: string
    statusToneClass: string
    ctaLabel: string
    action: 'main' | 'board' | 'special' | 'active' | 'village-route'
    questId?: string
  }

  const mobileQuestPrimaryActionCard = computed<QuestPrimaryActionCard>(() => {
    if (mainQuestDef.value && canSubmitMainQuest.value) {
      return {
        title: '先交主线',
        summary: '当前主线已经满足提交条件，先领掉这一段回报，再决定今天接哪张单子。',
        detailLines: [`第${mainQuestDef.value.chapter}章 · ${mainQuestDef.value.title}`, chapterTitle.value].filter(
          (line): line is string => !!line
        ),
        statusLabel: '可提交',
        statusToneClass: 'text-success',
        ctaLabel: '去交主线',
        action: 'main'
      }
    }

    if (firstReadyActiveQuest.value) {
      return {
        title: '先交进行中的任务',
        summary: '这条任务已经可提交，先腾出任务栏，再决定要不要接新的委托或特殊订单。',
        detailLines: [
          firstReadyActiveQuest.value.description,
          getQuestRewardPreview(firstReadyActiveQuest.value)
        ].filter((line): line is string => !!line),
        statusLabel: '可提交',
        statusToneClass: 'text-success',
        ctaLabel: '去交这条任务',
        action: 'active',
        questId: firstReadyActiveQuest.value.id
      }
    }

    if (urgentBoardQuest.value && availableQuestSlots.value > 0) {
      return {
        title: '先看紧急委托',
        summary: '这条委托只剩 1 天，适合先确认能不能接，避免今天错过。',
        detailLines: [
          urgentBoardQuest.value.description,
          getQuestRewardPreview(urgentBoardQuest.value)
        ].filter((line): line is string => !!line),
        statusLabel: '紧急',
        statusToneClass: 'text-danger',
        ctaLabel: '看这张委托',
        action: 'board',
        questId: urgentBoardQuest.value.id
      }
    }

    if (questStore.specialOrder && !questStore.specialOrder.accepted && availableQuestSlots.value > 0) {
      return {
        title: '先看特殊订单',
        summary: '本期特殊订单还没接，先看交付要求和奖励，再决定要不要占用一个任务栏位。',
        detailLines: [
          `剩余 ${questStore.specialOrder.daysRemaining} 天`,
          getQuestRewardPreview(questStore.specialOrder)
        ].filter((line): line is string => !!line),
        statusLabel: '特单',
        statusToneClass: 'text-warning',
        ctaLabel: '看特殊订单',
        action: 'special'
      }
    }

    if (mainQuestDef.value && !questStore.mainQuest?.accepted) {
      return {
        title: '先接主线',
        summary: '主线还没接下来，先挂上这条长期目标，后面做委托时也更容易顺手推进。',
        detailLines: [`第${mainQuestDef.value.chapter}章 · ${mainQuestDef.value.title}`, mainQuestDef.value.description],
        statusLabel: '主线',
        statusToneClass: 'text-accent',
        ctaLabel: '去看主线',
        action: 'main'
      }
    }

    if (mainQuestDef.value && questStore.mainQuest?.accepted) {
      return {
        title: '先看主线差哪一步',
        summary: '主线已经在推进中，先确认还差什么，再决定今天的委托怎么配更顺。',
        detailLines: [`第${mainQuestDef.value.chapter}章 · ${mainQuestDef.value.title}`, mainQuestDef.value.description],
        statusLabel: '推进中',
        statusToneClass: 'text-accent',
        ctaLabel: '看主线进度',
        action: 'main'
      }
    }

    if (questStore.activeQuests[0]) {
      const activeQuest = questStore.activeQuests[0]
      return {
        title: '先推正在进行的任务',
        summary: '任务栏里已经有进行中的单子，先看最上面这条进度，避免今天来回切任务。',
        detailLines: [
          activeQuest.description,
          `进度 ${getEffectiveProgress(activeQuest)}/${getQuestProgressMax(activeQuest)} · 剩余 ${activeQuest.daysRemaining} 天`
        ],
        statusLabel: '进行中',
        statusToneClass: 'text-accent',
        ctaLabel: '看这条任务',
        action: 'active',
        questId: activeQuest.id
      }
    }

    if (questStore.boardQuests[0]) {
      return {
        title: '先挑一张今日委托',
        summary: '主线和特单都不着急时，先接一张今天最顺手的委托，起步最快。',
        detailLines: [
          questStore.boardQuests[0].description,
          getQuestRewardPreview(questStore.boardQuests[0])
        ].filter((line): line is string => !!line),
        statusLabel: '委托',
        statusToneClass: 'text-accent',
        ctaLabel: '看今日委托',
        action: 'board',
        questId: questStore.boardQuests[0].id
      }
    }

    return {
      title: '先补村庄任务加成',
      summary: '当前没有立刻要交的单子时，先补任务容量和收益加成，后面接委托会更顺。',
      detailLines: [
        `可接任务数 +${villageProjectStore.getQuestCapacityBonus()}`,
        `委托铜钱加成 ${Math.round(villageProjectStore.getQuestMoneyBonusRate() * 100)}%`
      ],
      statusLabel: '建设',
      statusToneClass: 'text-warning',
      ctaLabel: '看村庄路线',
      action: 'village-route'
    }
  })
  const handleMobileQuestPrimaryAction = () => {
    const action = mobileQuestPrimaryActionCard.value
    if (action.action === 'main') {
      questModal.value = { type: 'main' }
      return
    }
    if (action.action === 'special') {
      questModal.value = { type: 'special' }
      return
    }
    if (action.action === 'board' && action.questId) {
      questModal.value = { type: 'board', questId: action.questId }
      return
    }
    if (action.action === 'active' && action.questId) {
      questModal.value = { type: 'active', questId: action.questId }
      return
    }
    focusQuestSection('village-route', '看村庄路线')
  }

  const handleAcceptMain = () => {
    const result = questStore.acceptMainQuest()
    addLog(result.message)
    if (result.success) {
      questModal.value = null
    }
  }

  const handleSubmitMain = () => {
    const result = questStore.submitMainQuest()
    addLog(result.message)
    if (result.success) {
      questModal.value = null
    }
  }

  // === 日常委托 ===

  const getEffectiveProgress = (quest: QuestInstance): number => {
    return questStore.getQuestEffectiveProgress(quest)
  }

  const canSubmit = (quest: QuestInstance): boolean => {
    return questStore.canSubmitQuest(quest)
  }

  const handleAccept = (questId: string) => {
    const result = questStore.acceptQuest(questId)
    addLog(result.message)
    if (result.success) {
      questModal.value = null
    }
  }

  const handleAcceptSpecialOrder = () => {
    const result = questStore.acceptSpecialOrder()
    addLog(result.message)
    if (result.success) {
      questModal.value = null
    }
  }

  const handleSubmit = (questId: string) => {
    const result = questStore.submitQuest(questId)
    addLog(result.message)
    if (result.success) {
      questModal.value = null
    }
  }

  onMounted(() => {
    syncCompactViewportMode()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncCompactViewportMode)
    }
    questStore.initMainQuest()
    goalStore.ensureInitialized()
    void coopOrderStore.refreshOverview()
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', syncCompactViewportMode)
    }
  })
</script>
