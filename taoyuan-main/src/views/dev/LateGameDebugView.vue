<template>
  <div class="main-menu-root flex min-h-screen flex-col gap-4 px-4 py-6 md:gap-5">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="space-y-1">
          <p class="flex items-center gap-1.5 text-sm text-accent">
            <Bug :size="14" />
            后期调试面板
          </p>
          <p class="text-xs text-muted leading-5">
            仅开发环境可见。用于样例档加载、周循环推进、主题周切换、测试订单注入与后期特性开关联调。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button class="justify-center" :icon="ArrowLeft" @click="goBack">返回主菜单</Button>
          <Button class="justify-center" :icon="Play" :disabled="!gameStore.isGameStarted" @click="openCurrentGame">进入当前游戏</Button>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-4">
        <div class="game-panel-muted p-3">
          <p class="text-[10px] text-muted">当前状态</p>
          <p class="mt-1 text-xs text-accent">{{ gameStore.isGameStarted ? '已载入游戏态' : '未进入游戏态' }}</p>
        </div>
        <div class="game-panel-muted p-3">
          <p class="text-[10px] text-muted">当前日期</p>
          <p class="mt-1 text-xs text-accent">第{{ gameStore.year }}年{{ SEASON_NAMES[gameStore.season] }}第{{ gameStore.day }}天 {{ gameStore.timeDisplay }}</p>
        </div>
        <div class="game-panel-muted p-3">
          <p class="text-[10px] text-muted">当前主题周</p>
          <p class="mt-1 text-xs text-accent">{{ goalStore.currentThemeWeek?.name ?? '未激活' }}</p>
        </div>
        <div class="game-panel-muted p-3">
          <p class="text-[10px] text-muted">经济分层</p>
          <p class="mt-1 text-xs text-accent">{{ economyOverview.currentSegment?.label ?? '未判定' }}</p>
        </div>
      </div>
    </section>

    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-1">
          <p class="game-section-title">样例导航器</p>
          <p class="game-section-desc">主样例负责高保真联调，回归样例负责卡边界；推荐落点和 smoke 提示都从同一套样例元数据读取。</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="game-chip">筛出 {{ filteredSampleCount }}/{{ sampleSaves.length }} 套</span>
          <span class="game-chip">主样例 {{ flagshipSampleCount }}</span>
          <span class="game-chip">回归样例 {{ regressionSampleCount }}</span>
        </div>
      </div>

      <div class="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            v-model="sampleSearch"
            type="text"
            placeholder="搜索样例名称、标签或焦点系统"
            class="w-full pl-9 pr-3 py-2 bg-bg border border-accent/20 rounded-xs text-xs outline-none"
          />
        </div>
        <div class="text-[11px] text-muted self-center">
          {{ activeSampleTag ? `当前标签：${activeSampleTag}` : '当前显示全部标签' }}
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          class="px-2 py-1 text-[10px] rounded-xs border transition-colors"
          :class="!activeSampleTag ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted hover:border-accent/40'"
          @click="activeSampleTag = ''"
        >
          全部
        </button>
        <button
          v-for="tag in sampleTags"
          :key="tag"
          class="px-2 py-1 text-[10px] rounded-xs border transition-colors"
          :class="activeSampleTag === tag ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted hover:border-accent/40'"
          @click="activeSampleTag = activeSampleTag === tag ? '' : tag"
        >
          {{ tag }}
        </button>
      </div>

      <div class="space-y-4">
        <section v-for="group in groupedSampleSections" :key="group.tier" class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-xs text-accent">{{ group.title }}</p>
              <p class="text-[11px] text-muted leading-5">{{ group.description }}</p>
            </div>
            <span class="game-chip">{{ group.items.length }} 套</span>
          </div>

          <div class="grid gap-3 xl:grid-cols-2">
            <article v-for="sample in group.items" :key="sample.id" class="game-panel-muted p-3 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <p class="text-xs text-accent">{{ sample.label }}</p>
                  <p class="text-[11px] text-muted leading-5">{{ sample.description }}</p>
                </div>
                <span class="text-[10px] px-2 py-1 rounded-xs border border-accent/20 text-accent whitespace-nowrap">
                  推荐：{{ routeNameLabels[sample.recommendedRouteName] ?? sample.recommendedRouteName }}
                </span>
              </div>

              <div class="flex flex-wrap gap-1">
                <span v-for="tag in sample.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent">
                  {{ tag }}
                </span>
              </div>

              <div class="space-y-1">
                <p class="text-[10px] text-muted">覆盖系统</p>
                <p class="text-[11px] leading-5 text-text">{{ sample.focusAreas.join(' · ') }}</p>
              </div>

              <div class="space-y-1">
                <p class="text-[10px] text-muted">推荐 smoke 动作</p>
                <ul class="space-y-1">
                  <li v-for="check in sample.smokeChecks" :key="check.id" class="text-[11px] text-muted leading-5">
                    · {{ check.label }}
                  </li>
                </ul>
              </div>

              <div class="grid gap-2 md:grid-cols-2">
                <Button
                  class="justify-center"
                  :icon="sampleBusyKey === getSampleBusyKey(sample.id, 'load') ? LoaderCircle : DatabaseZap"
                  :disabled="sampleBusyKey !== null"
                  @click="loadSample(sample.id)"
                >
                  {{ sampleBusyKey === getSampleBusyKey(sample.id, 'load') ? '载入中' : '只载入' }}
                </Button>
                <Button
                  class="justify-center"
                  :icon="sampleBusyKey === getSampleBusyKey(sample.id, 'open') ? LoaderCircle : Play"
                  :disabled="sampleBusyKey !== null"
                  @click="loadAndOpenSample(sample.id, sample.recommendedRouteName)"
                >
                  {{ sampleBusyKey === getSampleBusyKey(sample.id, 'open') ? '进入中' : '载入并进入' }}
                </Button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>

    <div class="grid gap-4 xl:grid-cols-2">
      <section class="game-panel space-y-3">
        <div class="space-y-1">
          <p class="game-section-title">快速命令</p>
          <p class="game-section-desc">覆盖加钱、切周、切主题、强制结算、投放测试订单与票券快照注入。</p>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <p class="text-xs text-accent">资金与结算</p>
          <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input v-model.number="addMoneyAmount" type="number" min="1" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none" />
            <Button class="justify-center" :icon="Coins" @click="handleAddMoney">加钱</Button>
            <Button class="justify-center" :icon="CalendarDays" :disabled="!gameStore.isGameStarted" @click="runEndDay">强制日结</Button>
          </div>
          <div class="grid gap-2 md:grid-cols-2">
            <Button class="justify-center" :icon="RefreshCw" :disabled="!gameStore.isGameStarted" @click="advanceToNextWeek">推进到下周</Button>
            <Button class="justify-center" :icon="BookOpenCheck" :disabled="!gameStore.isGameStarted" @click="generateCurrentWeekSnapshot">生成当前周快照</Button>
          </div>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <p class="text-xs text-accent">时间 / 主题周切换</p>
          <div class="grid gap-2 md:grid-cols-4">
            <input v-model.number="debugYear" type="number" min="1" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none" />
            <select v-model="debugSeason" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none">
              <option v-for="season in seasonOptions" :key="season" :value="season">{{ SEASON_NAMES[season] }}</option>
            </select>
            <input v-model.number="debugDay" type="number" min="1" max="28" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none" />
            <input v-model.number="debugHour" type="number" min="6" max="25" step="0.5" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none" />
          </div>
          <div class="grid gap-2 md:grid-cols-2">
            <Button class="justify-center" :icon="Wand2" :disabled="!gameStore.isGameStarted" @click="applyCalendarDebug">覆写日期（不跑完整结算）</Button>
            <Button class="justify-center" :icon="Sparkles" :disabled="!gameStore.isGameStarted" @click="goalStore.refreshThemeWeek(true)">重发主题周提示</Button>
          </div>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <p class="text-xs text-accent">测试订单 / 票券快照</p>
          <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <select v-model.number="specialOrderTier" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none">
              <option :value="1">特殊订单 Tier 1</option>
              <option :value="2">特殊订单 Tier 2</option>
              <option :value="3">特殊订单 Tier 3</option>
              <option :value="4">特殊订单 Tier 4</option>
            </select>
            <Button class="justify-center" :icon="ClipboardList" :disabled="!gameStore.isGameStarted" @click="injectSpecialOrder">投放测试订单</Button>
          </div>
          <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select v-model="ticketType" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none">
              <option v-for="type in rewardTicketTypes" :key="type" :value="type">{{ ticketTypeLabels[type] }}</option>
            </select>
            <input v-model.number="ticketAmount" type="number" min="1" class="w-full px-2 py-1 bg-bg border border-accent/20 rounded-xs text-xs outline-none" />
            <Button class="justify-center" :icon="FlaskConical" :disabled="!gameStore.isGameStarted" @click="injectTicketBalance">注入票券</Button>
          </div>
        </div>
      </section>

      <section class="game-panel space-y-3">
        <div class="space-y-1">
          <p class="game-section-title">后期快照与经济观测</p>
          <p class="game-section-desc">复用 CORE-005 指标快照与 WS01 经济观测，验证调试面板与周循环数据是否连通。</p>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="game-panel-muted p-3 space-y-1">
            <p class="text-[10px] text-muted">通胀压力</p>
            <p class="text-xs text-accent">{{ economyOverview.inflationPressure.toFixed(2) }}</p>
          </div>
          <div class="game-panel-muted p-3 space-y-1">
            <p class="text-[10px] text-muted">消耗满足度</p>
            <p class="text-xs text-accent">{{ (economyOverview.sinkSatisfaction * 100).toFixed(1) }}%</p>
          </div>
          <div class="game-panel-muted p-3 space-y-1">
            <p class="text-[10px] text-muted">循环多样度</p>
            <p class="text-xs text-accent">{{ economyOverview.loopDiversity }}</p>
          </div>
          <div class="game-panel-muted p-3 space-y-1">
            <p class="text-[10px] text-muted">单系统收入占比</p>
            <p class="text-xs text-accent">{{ (economyOverview.dominantIncomeShare * 100).toFixed(1) }}%</p>
          </div>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs text-accent">最近周快照</p>
            <span class="text-[10px] text-muted">{{ currentWeekInfo.seasonWeekId }}</span>
          </div>
          <div v-if="latestSnapshot" class="grid gap-2 md:grid-cols-2">
            <div class="text-[11px] text-muted">净收入：<span class="text-accent">{{ latestSnapshot.netIncome }}</span></div>
            <div class="text-[11px] text-muted">周收支：<span class="text-accent">{{ latestSnapshot.totalIncome }} / {{ latestSnapshot.totalExpense }}</span></div>
            <div class="text-[11px] text-muted">Sink：<span class="text-accent">{{ latestSnapshot.sinkSpend }}</span></div>
            <div class="text-[11px] text-muted">博物馆展陈：<span class="text-accent">{{ latestSnapshot.museumExhibitLevel }}</span></div>
            <div class="text-[11px] text-muted">鱼塘周赛代理值：<span class="text-accent">{{ latestSnapshot.fishPondContestScore }}</span></div>
            <div class="text-[11px] text-muted">社交参与：<span class="text-accent">{{ latestSnapshot.socialParticipationScore }}</span></div>
            <div class="text-[11px] text-muted md:col-span-2">
              票券快照：
              <span class="text-accent">{{ formatTicketBalances(latestSnapshot.ticketBalances) }}</span>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted">当前尚无周快照，可点击左侧“生成当前周快照”。</p>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <p class="text-xs text-accent">快照归档</p>
          <div v-if="archiveSnapshots.length > 0" class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div v-for="snapshot in archiveSnapshots" :key="snapshot.weekId" class="border border-accent/10 rounded-xs px-2 py-1.5 text-[11px]">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ snapshot.weekId }}</span>
                <span class="text-muted">净收入 {{ snapshot.netIncome }}</span>
              </div>
              <p class="mt-1 text-muted">主题周 {{ snapshot.activeThemeWeekId ?? '无' }} · 繁荣度 {{ snapshot.villageProsperityScore }} · 快照样本 {{ snapshot.sourceSnapshotCount }}</p>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted">暂无归档。</p>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <p class="text-xs text-accent">结构化日志（最近 8 条）</p>
          <div v-if="recentStructuredLogs.length > 0" class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div v-for="(entry, index) in recentStructuredLogs" :key="`${entry.dayLabel}-${index}`" class="border border-accent/10 rounded-xs px-2 py-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] text-accent">{{ entry.category ?? 'system' }}</span>
                <span class="text-[10px] text-muted">{{ entry.dayLabel || '未标记日期' }}</span>
              </div>
              <p class="mt-1 text-[11px]">{{ entry.msg }}</p>
              <p v-if="entry.tags?.length" class="mt-1 text-[10px] text-success">{{ entry.tags.join(' · ') }}</p>
              <p v-if="entry.meta && Object.keys(entry.meta).length" class="mt-1 text-[10px] text-muted break-all">{{ formatMeta(entry.meta) }}</p>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted">暂无结构化日志。</p>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs text-accent">最近一次高阶订单生成 Trace</p>
            <span class="text-[10px] text-muted">{{ latestSpecialOrderTrace?.weekId ?? latestSpecialOrderTrace?.mode ?? '未生成' }}</span>
          </div>
          <div v-if="latestSpecialOrderTrace" class="space-y-2">
            <div class="grid gap-2 md:grid-cols-2">
              <div class="text-[11px] text-muted">模式：<span class="text-accent">{{ latestSpecialOrderTrace.mode }}</span></div>
              <div class="text-[11px] text-muted">季节 / Tier：<span class="text-accent">{{ latestSpecialOrderTrace.season }} / {{ latestSpecialOrderTrace.tier }}</span></div>
              <div class="text-[11px] text-muted">周标识：<span class="text-accent">{{ latestSpecialOrderTrace.weekId ?? 'legacy' }}</span></div>
              <div class="text-[11px] text-muted">尝试次数：<span class="text-accent">{{ latestSpecialOrderTrace.attempts }}</span></div>
            </div>
            <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <p class="text-[11px] text-accent">最终命中</p>
              <p class="text-[10px] text-muted mt-1">订单 {{ latestSpecialOrderTrace.selectedOrderId ?? '未生成' }} · 模板 {{ latestSpecialOrderTrace.selectedTemplateName ?? '未命中' }} · 目标 {{ latestSpecialOrderTrace.selectedTargetItemId ?? '无' }}</p>
              <p class="text-[10px] text-muted mt-1">{{ latestSpecialOrderTrace.selectedReason }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
              <p class="text-[11px] text-accent">偏置来源</p>
              <p class="text-[10px] text-muted mt-1">主题偏好：{{ latestSpecialOrderTrace.preferredThemeTag ?? '无' }}</p>
              <p class="text-[10px] text-muted mt-1">杂交偏好：{{ latestSpecialOrderTrace.preferredHybridIds?.length ? latestSpecialOrderTrace.preferredHybridIds.join(' · ') : '无' }}</p>
              <p class="text-[10px] text-muted mt-1">偏好类目：{{ latestSpecialOrderTrace.preferredMarketCategories?.length ? latestSpecialOrderTrace.preferredMarketCategories.join(' · ') : '无' }}</p>
              <p class="text-[10px] text-muted mt-1">抑制类目：{{ latestSpecialOrderTrace.discouragedMarketCategories?.length ? latestSpecialOrderTrace.discouragedMarketCategories.join(' · ') : '无' }}</p>
            </div>
            <div class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              <div v-for="attempt in latestSpecialOrderTrace.attemptsDetail" :key="`trace-attempt-${attempt.attempt}`" class="border border-accent/10 rounded-xs px-2 py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[11px] text-accent">Attempt {{ attempt.attempt }}</p>
                  <span class="text-[10px] text-muted">{{ formatTraceAttemptSummary(attempt) }}</span>
                </div>
                <p v-if="attempt.blockReason" class="text-[10px] text-warning mt-1">{{ attempt.blockReason }}</p>
                <div class="space-y-1 mt-2">
                  <div v-for="candidate in attempt.candidates" :key="`${attempt.attempt}-${candidate.templateName}-${candidate.targetItemId}`" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] text-text">{{ candidate.templateName }} · {{ candidate.targetItemId }}</span>
                      <span class="text-[10px] text-accent">权重 {{ candidate.finalWeight.toFixed(2) }}</span>
                    </div>
                    <p class="text-[10px] text-muted mt-1">{{ formatTraceCandidateSummary(candidate) }}</p>
                    <p v-if="candidate.weightReasons?.length" class="text-[10px] text-success mt-1">{{ candidate.weightReasons.join('；') }}</p>
                    <p v-if="candidate.blockedByAntiRepeat" class="text-[10px] text-warning mt-1">anti-repeat 阻断：{{ candidate.blockedTags?.join('、') || '是' }}{{ candidate.cooldownWeeks ? ` · 冷却 ${candidate.cooldownWeeks} 周` : '' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted">尚未生成高阶订单 trace，可先投放测试订单。</p>
        </div>

        <div class="game-panel-muted p-3 space-y-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs text-accent">最近一次周目标结算</p>
            <span class="text-[10px] text-muted">{{ latestWeeklyGoalSettlement?.weekId ?? '未结算' }}</span>
          </div>
          <div v-if="latestWeeklyGoalSettlement" class="space-y-2">
            <div class="grid gap-2 md:grid-cols-2">
              <div class="text-[11px] text-muted">周次：<span class="text-accent">{{ latestWeeklyGoalSettlement.weekId }}</span></div>
              <div class="text-[11px] text-muted">完成：<span class="text-accent">{{ latestWeeklyGoalSettlement.completedGoalCount }}/{{ latestWeeklyGoalSettlement.totalGoalCount }}</span></div>
              <div class="text-[11px] text-muted">主题周：<span class="text-accent">{{ latestWeeklyGoalSettlement.linkedThemeWeekId ?? '无' }}</span></div>
              <div class="text-[11px] text-muted">结算日：<span class="text-accent">{{ latestWeeklyGoalSettlement.settledAtDayTag }}</span></div>
            </div>
            <div v-if="latestWeeklyGoalSettlement.rewardHighlights.length > 0" class="border border-success/20 rounded-xs px-2 py-2 bg-success/5">
              <p class="text-[11px] text-success">奖励摘要</p>
              <p class="text-[10px] text-muted mt-1">{{ latestWeeklyGoalSettlement.rewardHighlights.join('；') }}</p>
            </div>
            <div v-if="latestWeeklyGoalSettlement.failureHighlights.length > 0" class="border border-warning/20 rounded-xs px-2 py-2 bg-warning/5">
              <p class="text-[11px] text-warning">失败留痕</p>
              <p class="text-[10px] text-muted mt-1">{{ latestWeeklyGoalSettlement.failureHighlights.join('；') }}</p>
            </div>
            <div v-if="latestWeeklyGoalSettlement.compensationRewardSummaries.length > 0" class="border border-accent/20 rounded-xs px-2 py-2 bg-accent/5">
              <p class="text-[11px] text-accent">柔性补偿</p>
              <p class="text-[10px] text-muted mt-1">{{ latestWeeklyGoalSettlement.compensationRewardSummaries.join('；') }}</p>
            </div>
            <div class="space-y-1 max-h-56 overflow-y-auto pr-1">
              <div v-for="item in latestWeeklyGoalSettlement.items" :key="`settlement-${item.goalId}`" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] text-text">{{ item.title }}</span>
                  <span :class="item.completed ? 'text-success' : 'text-warning'" class="text-[10px]">{{ item.progressValue }}/{{ item.targetValue }}</span>
                </div>
                <p v-if="item.rewardSummary" class="text-[10px] text-success mt-1">奖励：{{ item.rewardSummary }}</p>
                <p v-if="item.compensationSummary" class="text-[10px] text-accent mt-1">补偿：{{ item.compensationSummary }}</p>
                <p v-if="item.failureCompensationReason" class="text-[10px] text-muted mt-1">{{ item.failureCompensationReason }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted">尚无周目标结算记录，先推进到下周即可生成。</p>
        </div>
      </section>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <section class="game-panel space-y-3">
        <div class="space-y-1">
          <p class="game-section-title">后期特性开关</p>
          <p class="game-section-desc">复用 CORE-001 的 feature flag 底座，验证开发态覆盖是否工作。</p>
        </div>
        <div class="space-y-2">
          <div v-for="flag in settingsStore.lateGameFeatureConfigs" :key="flag.id" class="game-panel-muted p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1 min-w-0">
                <p class="text-xs text-accent">{{ flag.label }}</p>
                <p class="text-[11px] text-muted leading-5">{{ flag.description }}</p>
                <p class="text-[10px] text-muted">
                  当前：{{ featureState[flag.id] ? '开启' : '关闭' }}
                  <span v-if="settingsStore.lateGameFeatureOverrides[flag.id] !== undefined"> · 已覆盖</span>
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                <Button class="justify-center" :icon="ShieldCheck" @click="toggleFeature(flag.id)">
                  {{ featureState[flag.id] ? '关闭' : '开启' }}
                </Button>
                <Button
                  v-if="settingsStore.lateGameFeatureOverrides[flag.id] !== undefined"
                  class="justify-center"
                  :icon="Trash2"
                  @click="settingsStore.clearFeatureOverride(flag.id)"
                >
                  清除
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end">
          <Button class="justify-center" :icon="Trash2" @click="settingsStore.clearAllFeatureOverrides()">清空全部覆盖</Button>
        </div>
      </section>

      <section class="game-panel space-y-3">
        <div class="space-y-1">
          <p class="game-section-title">平衡参数快捷预设</p>
          <p class="game-section-desc">复用 CORE-004 调参入口，不改业务逻辑即可快速观察后期参数影响。</p>
        </div>
        <div class="grid gap-2 md:grid-cols-2">
          <Button class="justify-center" :icon="Settings2" @click="applyBalancePreset({ maintenanceMultiplier: 1.5 })">维护费 ×1.5</Button>
          <Button class="justify-center" :icon="Settings2" @click="applyBalancePreset({ highValueOrderCashRatio: 0.55 })">高阶订单现金占比 55%</Button>
          <Button class="justify-center" :icon="Settings2" @click="applyBalancePreset({ ticketRewardRate: 1.5 })">票券产出 ×1.5</Button>
          <Button class="justify-center" :icon="Settings2" @click="applyBalancePreset({ casinoCashExpectationMultiplier: 0.65 })">赌坊现金期望 65%</Button>
        </div>
        <div class="game-panel-muted p-3 space-y-1 text-[11px] text-muted">
          <p>maintenanceMultiplier：<span class="text-accent">{{ balanceConfig.maintenanceMultiplier }}</span></p>
          <p>ticketRewardRate：<span class="text-accent">{{ balanceConfig.ticketRewardRate }}</span></p>
          <p>highValueOrderCashRatio：<span class="text-accent">{{ balanceConfig.highValueOrderCashRatio }}</span></p>
          <p>casinoCashExpectationMultiplier：<span class="text-accent">{{ balanceConfig.casinoCashExpectationMultiplier }}</span></p>
        </div>
        <div class="flex justify-end">
          <Button class="justify-center" :icon="Trash2" @click="settingsStore.clearLateGameBalanceOverrides()">清空平衡覆盖</Button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    ArrowLeft,
    BookOpenCheck,
    Bug,
    CalendarDays,
    ClipboardList,
    Coins,
    DatabaseZap,
    FlaskConical,
    LoaderCircle,
    Play,
    RefreshCw,
    Search,
    Settings2,
    ShieldCheck,
    Sparkles,
    Trash2,
    Wand2
  } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import { handleEndDay } from '@/composables/useEndDay'
  import { logHistory, showFloat } from '@/composables/useGameLog'
  import { getWeekCycleInfo } from '@/utils/weekCycle'
  import { SEASON_NAMES, useGameStore } from '@/stores/useGameStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { useSettingsStore } from '@/stores/useSettingsStore'
  import type { LateGameBalanceOverride, LateGameFeatureFlag, RewardTicketType, Season } from '@/types'
  import type { BuiltInSampleRouteName } from '@/data/sampleSaves'

  interface LateGameDebugCommandApi {
    listSamples: () => Array<{
      id: string
      label: string
      description: string
      tags: string[]
      tier: 'flagship' | 'regression'
      recommendedRouteName: BuiltInSampleRouteName
      focusAreas: string[]
      smokeChecks: Array<{ id: string; label: string }>
    }>
    loadSample: (sampleId: string) => Promise<boolean>
    loadAndOpenSample: (sampleId: string, routeName?: BuiltInSampleRouteName) => Promise<boolean>
    addMoney: (amount: number) => void
    advanceDay: () => void
    advanceToNextWeek: () => void
    applyCalendar: (payload: { year?: number; season?: Season; day?: number; hour?: number }) => void
    refreshThemeWeek: () => void
    injectSpecialOrder: (tier?: number) => void
    injectTicketBalance: (type: RewardTicketType, amount: number) => void
    setFeatureFlag: (flagId: LateGameFeatureFlag, enabled: boolean | null) => void
    clearFeatureFlags: () => void
    getSummary: () => Record<string, unknown>
  }

  const router = useRouter()
  const saveStore = useSaveStore()
  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()
  const settingsStore = useSettingsStore()

  const sampleBusyKey = ref<string | null>(null)
  const sampleSearch = ref('')
  const activeSampleTag = ref('')
  const addMoneyAmount = ref(10000)
  const specialOrderTier = ref(4)
  const debugYear = ref(2)
  const debugSeason = ref<Season>('autumn')
  const debugDay = ref(21)
  const debugHour = ref(8)
  const ticketType = ref<RewardTicketType>('construction')
  const ticketAmount = ref(3)

  const seasonOptions: Season[] = ['spring', 'summer', 'autumn', 'winter']
  const rewardTicketTypes: RewardTicketType[] = ['construction', 'exhibit', 'caravan', 'research', 'guildLogistics', 'familyFavor']
  const ticketTypeLabels: Record<RewardTicketType, string> = {
    construction: '建设券',
    exhibit: '展陈券',
    caravan: '商路票',
    research: '研究券',
    guildLogistics: '公会后勤券',
    familyFavor: '家业情谊券'
  }
  const routeNameLabels: Record<BuiltInSampleRouteName, string> = {
    farm: '农场',
    village: '村庄',
    'village-projects': '村庄建设',
    shop: '商店',
    forage: '采集',
    fishing: '钓鱼',
    mining: '矿洞',
    cooking: '烹饪',
    workshop: '工坊',
    upgrade: '工具升级',
    inventory: '背包',
    skills: '技能',
    achievement: '成就',
    glossary: '图鉴',
    wallet: '钱包',
    quest: '任务',
    mail: '邮箱',
    charinfo: '角色信息',
    breeding: '育种',
    museum: '博物馆',
    guild: '公会',
    hanhai: '瀚海',
    fishpond: '鱼塘',
    decoration: '装饰'
  }

  const sampleSaves = computed(() => saveStore.getBuiltInSampleSaves())
  const sampleTags = computed(() =>
    Array.from(new Set(sampleSaves.value.flatMap(sample => sample.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  )
  const filteredSamples = computed(() => {
    const keyword = sampleSearch.value.trim().toLocaleLowerCase('zh-CN')
    return sampleSaves.value.filter(sample => {
      if (activeSampleTag.value && !sample.tags.includes(activeSampleTag.value)) return false
      if (!keyword) return true
      const haystack = [
        sample.label,
        sample.description,
        sample.recommendedRouteName,
        ...sample.tags,
        ...sample.focusAreas,
        ...sample.smokeChecks.map(check => check.label)
      ].join(' ').toLocaleLowerCase('zh-CN')
      return haystack.includes(keyword)
    })
  })
  const groupedSampleSections = computed(() => {
    const defs = [
      {
        tier: 'flagship' as const,
        title: '主样例',
        description: '用于检查一整条高保真后期链路，默认都能继续玩。'
      },
      {
        tier: 'regression' as const,
        title: '回归样例',
        description: '用于卡住跨天、跨周、周赛结算和主题周刷新边界。'
      }
    ]
    return defs
      .map(def => ({
        ...def,
        items: filteredSamples.value.filter(sample => sample.tier === def.tier)
      }))
      .filter(group => group.items.length > 0)
  })
  const filteredSampleCount = computed(() => filteredSamples.value.length)
  const flagshipSampleCount = computed(() => sampleSaves.value.filter(sample => sample.tier === 'flagship').length)
  const regressionSampleCount = computed(() => sampleSaves.value.filter(sample => sample.tier === 'regression').length)
  const currentWeekInfo = computed(() => getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day))
  const economyOverview = computed(() => playerStore.getEconomyOverview())
  const latestSnapshot = computed(() => goalStore.latestWeeklyMetricSnapshot)
  const archiveSnapshots = computed(() => [...goalStore.weeklyMetricArchive.snapshots].slice().reverse())
  const latestSpecialOrderTrace = computed(() => questStore.lastSpecialOrderGenerationTrace)
  const latestWeeklyGoalSettlement = computed(() => goalStore.lastWeeklyGoalSettlement)
  const recentStructuredLogs = computed(() =>
    logHistory.value
      .filter(entry => entry.tags?.length || entry.category)
      .slice(-8)
      .reverse()
  )
  const featureState = computed(() => settingsStore.getLateGameFeatureState())
  const balanceConfig = computed(() => settingsStore.getLateGameBalanceConfig())

  const resolveLoadedGameRoute = () => {
    if (gameStore.currentLocationGroup === 'village_area') return '/game/village'
    if (gameStore.currentLocationGroup === 'nature') return '/game/forage'
    if (gameStore.currentLocationGroup === 'mine') return '/game/mining'
    if (gameStore.currentLocationGroup === 'hanhai') return '/game/hanhai'
    return '/game/farm'
  }

  const goBack = () => {
    void router.push('/')
  }

  const openCurrentGame = () => {
    if (!gameStore.isGameStarted) return
    void router.push(resolveLoadedGameRoute())
  }

  const getSampleBusyKey = (sampleId: string, action: 'load' | 'open') => `${action}:${sampleId}`

  const syncDebugCalendar = () => {
    debugYear.value = gameStore.year
    debugSeason.value = gameStore.season
    debugDay.value = gameStore.day
    debugHour.value = gameStore.hour
  }

  const openSampleRoute = async (routeName?: BuiltInSampleRouteName) => {
    if (!routeName) {
      openCurrentGame()
      return
    }
    await router.push({ name: routeName })
  }

  const loadSample = async (sampleId: string) => {
    sampleBusyKey.value = getSampleBusyKey(sampleId, 'load')
    try {
      const ok = await saveStore.loadBuiltInSampleSave(sampleId)
      if (ok) {
        syncDebugCalendar()
        showFloat(`已载入样例：${sampleId}`, 'success')
      } else {
        showFloat('样例载入失败。', 'danger')
      }
      return ok
    } finally {
      sampleBusyKey.value = null
    }
  }

  const loadAndOpenSample = async (sampleId: string, routeName?: BuiltInSampleRouteName) => {
    sampleBusyKey.value = getSampleBusyKey(sampleId, 'open')
    try {
      const ok = await saveStore.loadBuiltInSampleSave(sampleId)
      if (!ok) {
        showFloat('样例载入失败。', 'danger')
        return false
      }
      syncDebugCalendar()
      await openSampleRoute(routeName)
      showFloat(`已载入并跳转：${sampleId}`, 'success')
      return true
    } finally {
      sampleBusyKey.value = null
    }
  }

  const handleAddMoney = () => {
    const amount = Math.max(1, Math.floor(addMoneyAmount.value || 0))
    playerStore.earnMoney(amount, { countAsEarned: false, system: 'system' })
    showFloat(`已增加 ${amount} 文`, 'success')
  }

  const runEndDay = () => {
    if (!gameStore.isGameStarted) {
      showFloat('请先载入样例或进入游戏态。', 'danger')
      return
    }
    handleEndDay()
  }

  const advanceToNextWeek = () => {
    if (!gameStore.isGameStarted) {
      showFloat('请先载入样例或进入游戏态。', 'danger')
      return
    }

    const previousWeekId = currentWeekInfo.value.seasonWeekId
    let guard = 8
    while (guard-- > 0) {
      handleEndDay()
      if (getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId !== previousWeekId) {
        showFloat('已推进到下一个周起点。', 'success')
        return
      }
    }

    showFloat('未能在预期步数内推进到下周，请检查当前时间状态。', 'danger')
  }

  const generateCurrentWeekSnapshot = () => {
    if (!gameStore.isGameStarted) {
      showFloat('请先载入样例或进入游戏态。', 'danger')
      return null
    }

    const weekInfo = getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day)
    const generatedAtDayTag = `${gameStore.year}-${gameStore.season}-${gameStore.day}`
    const snapshot = goalStore.archiveWeeklyMetricSnapshot(weekInfo, generatedAtDayTag)
    showFloat(`已生成快照：${snapshot.weekId}`, 'success')
    return snapshot
  }

  const applyCalendarDebug = () => {
    if (!gameStore.isGameStarted) {
      showFloat('请先载入样例或进入游戏态。', 'danger')
      return
    }

    gameStore.year = Math.max(1, Math.floor(debugYear.value || 1))
    gameStore.season = debugSeason.value
    gameStore.day = Math.min(28, Math.max(1, Math.floor(debugDay.value || 1)))
    gameStore.hour = Math.min(25, Math.max(6, Number(debugHour.value || 8)))
    gameStore.weather = 'sunny'
    gameStore.setTomorrowWeather('sunny')
    gameStore.currentLocation = 'farm'
    gameStore.currentLocationGroup = 'farm'
  goalStore.refreshDailyGoals(false)
  goalStore.refreshSeasonGoals(false)
  goalStore.refreshWeeklyGoals(false)
  goalStore.refreshThemeWeek(true)
  goalStore.evaluateProgressAndRewards()
    showFloat('已覆写调试日期并刷新目标 / 主题周（未执行完整跨系统结算）。', 'accent')
  }

  const injectSpecialOrder = () => {
    if (!gameStore.isGameStarted) {
      showFloat('请先载入样例或进入游戏态。', 'danger')
      return
    }
    questStore.generateSpecialOrder(gameStore.season, Math.min(4, Math.max(1, specialOrderTier.value)), {
      weekId: currentWeekInfo.value.seasonWeekId,
      absoluteWeek: currentWeekInfo.value.absoluteWeek
    })
    showFloat('已投放测试特殊订单。', 'success')
  }

  const injectTicketBalance = () => {
    const amount = Math.max(1, Math.floor(ticketAmount.value || 0))
    const snapshot = archiveSnapshots.value[0] ?? generateCurrentWeekSnapshot()
    if (!snapshot) {
      showFloat('暂无可注入的周快照。', 'danger')
      return
    }
    snapshot.ticketBalances = {
      ...snapshot.ticketBalances,
      [ticketType.value]: (snapshot.ticketBalances[ticketType.value] ?? 0) + amount
    }
    goalStore.weeklyMetricArchive.lastGeneratedWeekId = snapshot.weekId
    showFloat(`已向 ${snapshot.weekId} 注入 ${ticketTypeLabels[ticketType.value]} +${amount}`, 'success')
  }

  const toggleFeature = (flagId: LateGameFeatureFlag) => {
    settingsStore.setFeatureOverride(flagId, !featureState.value[flagId])
  }

  const applyBalancePreset = (overrides: LateGameBalanceOverride) => {
    settingsStore.setLateGameBalanceOverrides(overrides)
    showFloat('已写入平衡覆盖。', 'success')
  }

  const formatTicketBalances = (balances: Partial<Record<RewardTicketType, number>> | undefined) => {
    const entries = Object.entries(balances ?? {}).filter(([, value]) => (value ?? 0) > 0)
    if (entries.length === 0) return '无'
    return entries.map(([type, value]) => `${ticketTypeLabels[type as RewardTicketType] ?? type} ${value}`).join(' · ')
  }

  const formatMeta = (meta: Record<string, unknown>) => JSON.stringify(meta)
  const formatTraceAttemptSummary = (attempt: NonNullable<typeof latestSpecialOrderTrace.value>['attemptsDetail'][number]) => {
    const selected = attempt.selectedTemplateName ? `${attempt.selectedTemplateName} · ${attempt.selectedTargetItemId ?? '无目标'}` : '未命中候选'
    const blocked = attempt.blockedByAntiRepeat ? ' · anti-repeat 阻断' : ''
    return `${selected} · 候选 ${attempt.candidateCount}${blocked}`
  }
  const formatTraceCandidateSummary = (candidate: NonNullable<typeof latestSpecialOrderTrace.value>['attemptsDetail'][number]['candidates'][number]) => {
    const tags = candidate.blockedTags?.length ? `阻断标签 ${candidate.blockedTags.join('、')}` : '未命中阻断'
    return `Tier ${candidate.tier}${candidate.themeTag ? ` · 主题 ${candidate.themeTag}` : ''}${candidate.requiredHybridId ? ` · 杂交 ${candidate.requiredHybridId}` : ''} · ${tags}`
  }

  const debugApi: LateGameDebugCommandApi = {
    listSamples: () => saveStore.getBuiltInSampleSaves(),
    loadSample,
    loadAndOpenSample,
    addMoney: amount => {
      addMoneyAmount.value = amount
      handleAddMoney()
    },
    advanceDay: runEndDay,
    advanceToNextWeek,
    applyCalendar: payload => {
      debugYear.value = payload.year ?? debugYear.value
      debugSeason.value = payload.season ?? debugSeason.value
      debugDay.value = payload.day ?? debugDay.value
      debugHour.value = payload.hour ?? debugHour.value
      applyCalendarDebug()
    },
    refreshThemeWeek: () => goalStore.refreshThemeWeek(true),
    injectSpecialOrder: tier => {
      specialOrderTier.value = tier ?? specialOrderTier.value
      injectSpecialOrder()
    },
    injectTicketBalance: (type, amount) => {
      ticketType.value = type
      ticketAmount.value = amount
      injectTicketBalance()
    },
    setFeatureFlag: (flagId, enabled) => {
      if (enabled === null) {
        settingsStore.clearFeatureOverride(flagId)
      } else {
        settingsStore.setFeatureOverride(flagId, enabled)
      }
    },
    clearFeatureFlags: () => settingsStore.clearAllFeatureOverrides(),
    getSummary: () => ({
      started: gameStore.isGameStarted,
      date: { year: gameStore.year, season: gameStore.season, day: gameStore.day, hour: gameStore.hour },
      week: currentWeekInfo.value,
      themeWeek: goalStore.currentThemeWeek,
      latestSnapshot: goalStore.latestWeeklyMetricSnapshot,
      economyOverview: playerStore.getEconomyOverview(),
      specialOrder: questStore.specialOrder,
      featureFlags: settingsStore.getLateGameFeatureState()
    })
  }

  onMounted(() => {
    ;(globalThis as { __TAOYUAN_LATE_GAME_DEBUG__?: LateGameDebugCommandApi }).__TAOYUAN_LATE_GAME_DEBUG__ = debugApi
    debugYear.value = gameStore.year
    debugSeason.value = gameStore.season
    debugDay.value = gameStore.day
    debugHour.value = gameStore.hour
  })

  onUnmounted(() => {
    delete (globalThis as { __TAOYUAN_LATE_GAME_DEBUG__?: LateGameDebugCommandApi }).__TAOYUAN_LATE_GAME_DEBUG__
  })
</script>

<style scoped>
  .main-menu-root {
    max-width: 1160px;
    margin: 0 auto;
  }
</style>
