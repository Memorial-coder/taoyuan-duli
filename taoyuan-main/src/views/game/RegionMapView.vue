<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Map :size="14" />
        <span>行旅图</span>
      </div>
      <span class="text-xs" :class="regionMapStore.unlockedRegionCount > 0 ? 'text-success' : 'text-muted'">
        {{ regionMapStore.unlockedRegionCount > 0 ? '已开放' : '近郊开放' }}
      </span>
    </div>

    <RegionOpenWorldMap
      class="mb-3"
      :regions="regionMapStore.openWorldRegionEntries"
      :active-region="activeOpenWorldRegionView"
      :selected-tile="selectedOpenWorldTileView"
      :day-tag="currentDayTag"
      :logs="regionMapStore.openWorldState.log"
      :repaired-outpost-count="regionMapStore.openWorldState.handbook.repairedOutpostIds.length"
      @select-region="handleSelectOpenWorldRegion"
      @select-tile="handleSelectOpenWorldTile"
      @pan-viewport="handlePanOpenWorldViewport"
      @move="handleMoveOpenWorldPlayer"
      @perform-action="handlePerformOpenWorldAction"
    />

    <div v-if="regionMapStore.unlockedRegionCount <= 0" class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center gap-2 mb-2 text-accent/70">
        <Map :size="18" />
        <span class="text-xs">远方区域开放条件</span>
      </div>
      <p class="text-sm text-muted">近郊 / 竹林已可探索，古驿荒道、蜃潮泽地、云岚高地会随着玩家进度逐步开放。</p>
      <p class="text-xs text-muted mt-1 leading-5">
        满足条件后，对应开放地图会直接在上方区域切换中亮起。
      </p>
      <div class="mt-3 space-y-2">
        <div
          v-for="entry in lockedRegionUnlockGuides"
          :key="`region-unlock-guide-${entry.id}`"
          class="border border-accent/10 rounded-xs p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-accent">{{ entry.name }}</p>
              <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.description }}</p>
            </div>
            <span class="text-[0.625rem] shrink-0" :class="entry.ready ? 'text-success' : 'text-muted'">
              {{ entry.ready ? '条件已满足' : '尚未满足' }}
            </span>
          </div>
          <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ entry.summary }}</p>
          <p class="text-[0.625rem] text-accent/80 mt-1 leading-4">承接方向：{{ entry.linkedSystems.join(' / ') }}</p>
        </div>
      </div>
    </div>

    <template v-if="regionMapStore.unlockedRegionCount > 0">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs text-muted">旧远征、旅后处理和资源整备仍保留在下方，作为开放地图的承接入口。</p>
      </div>
      <div class="mb-3 border border-accent/20 rounded-xs p-1 bg-bg/70" data-testid="region-map-tabs">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-1">
          <button
            v-for="tab in regionMapTabs"
            :key="tab.id"
            class="min-h-[52px] rounded-xs px-3 py-2 text-left transition-colors"
            :class="activeRegionMapTab === tab.id ? 'bg-accent/10 text-accent border border-accent/30' : 'text-muted hover:bg-accent/5 border border-transparent'"
            :aria-pressed="activeRegionMapTab === tab.id"
            :data-testid="`region-map-tab-${tab.id}`"
            @click="setRegionMapTab(tab.id)"
          >
            <span class="block text-xs">{{ tab.label }}</span>
            <span class="block text-[0.625rem] leading-4 mt-1">{{ tab.summary }}</span>
          </button>
        </div>
      </div>

      <section v-show="activeRegionMapTab === 'today'" class="space-y-3">
      <div v-if="!isCompactMobile" class="border border-accent/20 rounded-xs p-2 mb-3">
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-muted">已解锁区域</span>
            <span class="text-accent">{{ regionMapStore.unlockedRegionCount }}/{{ regionMapStore.regionDefs.length }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">运行中远征</span>
            <span>{{ regionMapStore.hasActiveExpedition ? '进行中' : '无' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">本周焦点</span>
            <span class="text-accent">{{ currentFocusLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">资源家族</span>
            <span>{{ regionMapStore.resourceFamilyDefs.length }} 组</span>
          </div>
        </div>
        <p class="text-[0.625rem] text-muted mt-2 leading-4">
          当前主题周：{{ currentThemeWeekLabel }}。当前入口已接通区域状态、路线完成、首领记录与资源台账，后续将继续把结算接到旧系统。
        </p>
      </div>

      <div v-if="!isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">远征筹备</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">先决定推进风格与撤退规则，再出发。路线和首领现在都会进入多阶段远征，而不是一键完成。</p>
          </div>
          <span class="text-[0.625rem] text-muted shrink-0">当前 HP {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <p class="text-[0.625rem] text-muted mb-2">推进风格</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="entry in expeditionApproachOptions"
                :key="`approach-${entry.value}`"
                class="border rounded-xs px-2 py-1 text-[0.625rem] hover:bg-accent/5"
                :class="selectedApproach === entry.value ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
                @click="selectedApproach = entry.value"
              >
                {{ entry.label }}
              </button>
            </div>
            <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ currentApproachDescription }}</p>
            <button
              class="mt-3 border border-accent/20 rounded-xs px-3 py-2 text-xs text-accent hover:bg-accent/5"
              @click="goToExpeditionRoom"
            >
              前往联机远征房间
            </button>
          </div>
          <div>
            <p class="text-[0.625rem] text-muted mb-2">撤退规则</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="entry in expeditionRetreatRuleOptions"
                :key="`retreat-${entry.value}`"
                class="border rounded-xs px-2 py-1 text-[0.625rem] hover:bg-accent/5"
                :class="selectedRetreatRule === entry.value ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
                @click="selectedRetreatRule = entry.value"
              >
                {{ entry.label }}
              </button>
            </div>
            <p class="text-[0.625rem] text-muted mt-2 leading-4">{{ currentRetreatRuleDescription }}</p>
          </div>
        </div>
      </div>

      <div v-if="!isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <p class="text-xs text-accent">{{ regionMapStore.frontierDigest.headline }}</p>
        <div class="mt-2 space-y-1">
          <p
            v-for="line in regionMapStore.frontierDigest.highlightSummaries"
            :key="`digest-highlight-${line}`"
            class="text-[0.625rem] text-muted leading-4"
          >
            - {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.nextHookSummaries"
            :key="`digest-hook-${line}`"
            class="text-[0.625rem] text-accent/80 leading-4"
          >
            -> {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.riskSummaries"
            :key="`digest-risk-${line}`"
            class="text-[0.625rem] text-warning leading-4"
          >
            ! {{ line }}
          </p>
        </div>
      </div>

      <div v-if="frontierWorldSignalCards.length > 0" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">活地图信号</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">
              这里把季节变体、来访气泡、修复设施落点、节庆装点和短活动窗口压成同一层地图提示，不再散在别的页里。
            </p>
          </div>
          <span class="text-[0.625rem] text-muted shrink-0">{{ frontierWorldSignalCards.length }} 条</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <div
            v-for="state in frontierMapAdvancedStates"
            :key="state.id"
            class="border rounded-xs px-2 py-2"
            :class="state.shellClass"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.625rem]" :class="state.toneClass">{{ state.label }}</p>
              <span class="text-[0.625rem] text-muted">{{ state.statusLabel }}</span>
            </div>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ state.summary }}</p>
            <p
              v-for="line in state.detailLines.slice(0, 2)"
              :key="`frontier-map-state-${state.id}-${line}`"
              class="text-[0.625rem] text-accent/80 mt-0.5 leading-4"
            >
              - {{ line }}
            </p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <div
            v-for="entry in frontierWorldSignalCards"
            :key="entry.id"
            class="border rounded-xs px-3 py-2"
            :class="entry.shellClass"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.625rem]" :class="entry.toneClass">{{ entry.label }}</p>
              <span class="text-[0.625rem] text-muted">{{ entry.statusLabel }}</span>
            </div>
            <p class="text-xs text-text mt-1">{{ entry.title }}</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
            <p class="text-[0.625rem] text-accent/80 mt-1 leading-4">{{ entry.detail }}</p>
          </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70" data-testid="region-primary-action-card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">当前建议动作</p>
            <p class="text-sm text-accent mt-1">{{ primaryJourneyActionCard.title }}</p>
            <p class="text-xs text-muted mt-2 leading-5">{{ primaryJourneyActionCard.summary }}</p>
          </div>
          <span class="text-[0.625rem] shrink-0" :class="primaryJourneyActionCard.statusToneClass">{{ primaryJourneyActionCard.statusLabel }}</span>
        </div>
        <div v-if="primaryJourneyActionCard.detailLines.length > 0" class="mt-3 space-y-1">
          <p
            v-for="line in primaryJourneyActionCard.detailLines"
            :key="`primary-journey-action-${line}`"
            class="text-xs text-muted leading-5"
          >
            · {{ line }}
          </p>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            class="border border-accent/20 rounded-xs px-3 py-2 text-xs text-accent hover:bg-accent/5"
            :class="isCompactMobile ? 'w-full' : ''"
            @click="handlePrimaryJourneyAction"
          >
            {{ primaryJourneyActionCard.ctaLabel }}
          </button>
        </div>
      </div>

      <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">行旅步骤</p>
            <p class="text-xs text-accent mt-1">把移动端收口成“选区 -> 看路 -> 出发 -> 推进 -> 回城”。</p>
          </div>
          <span class="text-[0.625rem] shrink-0 text-success">当前：{{ mobileJourneyFlowSteps.find(step => step.active)?.label ?? '选区' }}</span>
        </div>
        <div class="region-map-scroll-rail overflow-x-auto pt-3">
          <div class="region-map-scroll-track flex gap-2 min-w-max">
            <button
              v-for="step in mobileJourneyFlowSteps"
              :key="`mobile-flow-${step.id}`"
              class="region-map-scroll-card w-32 min-h-[96px] shrink-0 border rounded-xs px-3 py-2 text-left"
              :class="step.active ? 'border-accent bg-accent/10 text-accent' : step.done ? 'border-success/20 bg-success/5 text-success' : 'border-accent/10 bg-bg/60 text-muted'"
              :data-testid="`region-mobile-flow-step-${step.id}`"
              :disabled="!step.enabled"
              @click="handleMobileFlowStep(step.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs">{{ step.label }}</p>
                <span class="text-[0.625rem]">{{ step.done ? '已过' : step.active ? '当前' : step.enabled ? '跳转' : '待到达' }}</span>
              </div>
              <p class="mt-2 text-xs leading-5" :class="step.active ? 'text-accent/80' : step.done ? 'text-success' : 'text-muted'">
                {{ step.summary }}
              </p>
            </button>
          </div>
        </div>
      </div>

      <div v-if="shouldShowJourneyTermPrimer" class="border border-warning/20 rounded-xs p-3 mb-3 bg-warning/5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.625rem] tracking-[0.24em] text-warning/80">看图说明</p>
            <p class="text-xs text-accent mt-1">第一次看行旅图时，先记住这几个高频词就够了。</p>
          </div>
          <button
            class="border border-warning/20 rounded-xs px-2 py-1 text-xs text-warning hover:bg-warning/10 shrink-0"
            @click="dismissJourneyTermPrimer"
          >
            知道了
          </button>
        </div>
        <div class="grid grid-cols-1 gap-2 mt-3">
          <div
            v-for="entry in journeyTermPrimerCards"
            :key="`journey-term-primer-${entry.term}`"
            class="border border-warning/10 rounded-xs px-3 py-2 bg-bg/60"
          >
            <p class="text-[0.625rem] text-warning">{{ entry.term }}</p>
            <p class="text-xs text-muted mt-1 leading-5">{{ entry.summary }}</p>
          </div>
        </div>
      </div>

      <div
        v-if="latestJourneyAftermathSummary && hasPendingLatestAftermathAction"
        class="border border-success/20 rounded-xs p-3 mb-3 bg-success/5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-success">回城事项待处理</p>
            <p class="text-[0.625rem] text-muted mt-1 leading-4">最新远征已经回城，先处理旅后去向能减少资源和后续动作散落。</p>
          </div>
          <button
            class="border border-success/30 rounded-xs px-3 py-2 text-xs text-success hover:bg-success/10 shrink-0"
            @click="openAftermathTab"
          >
            处理回城事项
          </button>
        </div>
      </div>
      </section>

      <section v-show="activeRegionMapTab === 'map'" class="space-y-3">
      <div
        class="border border-accent/20 rounded-xs p-4 mb-3"
        style="background-image: linear-gradient(135deg, rgba(168, 138, 86, 0.12), rgba(36, 39, 56, 0.72));"
      >
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
          <div class="min-w-0">
            <p class="text-[0.625rem] tracking-[0.28em] text-accent/70">区域切换</p>
            <p class="text-sm text-accent mt-1">先选定这趟要展开查看的区域</p>
            <p class="text-xs text-muted mt-1 leading-5">切到单一区域时，路线、传闻、季节变体和同行合同会更集中地展开。</p>
          </div>
          <div class="shrink-0 md:text-right">
            <p class="text-[0.625rem] text-muted">当前筛选</p>
            <p class="text-sm text-accent mt-1">{{ selectedRegionFilterLabel }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="region in regionMapStore.regionSummaries"
            :key="`region-filter-${region.id}`"
            class="border rounded-xs px-4 py-3 min-h-[88px] text-left transition-colors"
            :class="currentSelectedRegionId === region.id ? 'border-accent bg-accent/10 text-accent' : 'border-accent/15 bg-bg/50 text-muted hover:bg-accent/5'"
            :data-testid="`region-switch-${region.id}`"
            :aria-pressed="currentSelectedRegionId === region.id"
            @click="handleSelectRegionFilter(region.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm">{{ region.name }}</p>
                <p class="text-xs mt-2 leading-5" :class="currentSelectedRegionId === region.id ? 'text-accent/80' : 'text-muted'">
                  {{ region.description }}
                </p>
              </div>
              <span
                class="text-[0.625rem] shrink-0"
                :class="currentSelectedRegionId === region.id ? 'text-success' : region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? 'text-accent' : 'text-muted'"
              >
                {{ currentSelectedRegionId === region.id ? '当前展开' : region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? '本周焦点' : '区域入口' }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem]">
              <span :class="currentSelectedRegionId === region.id ? 'text-accent/80' : 'text-muted'">
                路线 {{ region.completedRouteCount }}/{{ region.routeCount }}
              </span>
              <span :class="currentSelectedRegionId === region.id ? 'text-accent/80' : 'text-muted'">
                {{ region.themeHint }}
              </span>
              <span :class="region.unlocked ? 'text-success' : 'text-muted'">
                {{ region.unlocked ? '已解锁' : '未解锁' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div v-if="lastActionSummary" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70">
        <p class="text-[0.625rem] text-muted">操作回执</p>
        <p class="text-[0.6875rem] mt-2 leading-5" :class="actionToneClass">{{ lastActionSummary }}</p>
      </div>

      <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">远征筹备</p>
            <p class="text-xs text-accent mt-1">{{ currentSession ? `进行中：${currentSession.targetName}` : '先定推进风格，再发起探索。' }}</p>
            <p class="text-xs text-muted mt-1 leading-5">
              已选 {{ currentApproachDescription ? expeditionApproachOptions.find(entry => entry.value === selectedApproach)?.label : '稳健推进' }} / {{ expeditionRetreatRuleOptions.find(entry => entry.value === selectedRetreatRule)?.label ?? '平衡推进' }}
            </p>
          </div>
          <button
            class="border border-accent/20 rounded-xs px-2 py-1 text-xs text-accent hover:bg-accent/5 shrink-0"
            @click="mobilePrepExpanded = !mobilePrepExpanded"
          >
            {{ mobilePrepExpanded ? '收起' : '展开' }}
          </button>
        </div>

        <div v-if="mobilePrepExpanded" class="space-y-3 mt-3">
          <div>
            <p class="text-[0.625rem] text-muted mb-2">推进风格</p>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="entry in expeditionApproachOptions"
                :key="`compact-approach-${entry.value}`"
                class="border rounded-xs px-3 py-2 text-left hover:bg-accent/5"
                :class="selectedApproach === entry.value ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted'"
                @click="selectedApproach = entry.value"
              >
                <p class="text-xs">{{ entry.label }}</p>
                <p class="text-xs mt-1 leading-5 text-muted">{{ entry.description }}</p>
              </button>
            </div>
          </div>

          <div>
            <p class="text-[0.625rem] text-muted mb-2">撤退规则</p>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="entry in expeditionRetreatRuleOptions"
                :key="`compact-retreat-${entry.value}`"
                class="border rounded-xs px-3 py-2 text-left hover:bg-accent/5"
                :class="selectedRetreatRule === entry.value ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted'"
                @click="selectedRetreatRule = entry.value"
              >
                <p class="text-xs">{{ entry.label }}</p>
                <p class="text-xs mt-1 leading-5 text-muted">{{ entry.description }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref="regionListAnchor" class="space-y-2 mb-3">
        <div v-for="region in visibleRegionSummaries" :key="region.id" class="border border-accent/20 rounded-xs p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ region.name }}</p>
              <p class="text-xs text-muted mt-1 leading-5" :class="isCompactMobile ? 'compact-clamp-3' : ''">{{ region.description }}</p>
            </div>
            <span class="text-[0.625rem] shrink-0" :class="region.unlocked ? 'text-success' : 'text-muted'">
              {{ region.unlocked ? '已解锁' : '未解锁' }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.625rem] mt-3">
            <div class="flex items-center justify-between">
              <span class="text-muted">主题</span>
              <span>{{ region.themeHint }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">路线</span>
              <span class="text-accent">{{ region.completedRouteCount }}/{{ region.routeCount }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">接线系统</span>
              <span>{{ region.linkedSystems.join(' / ') }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">首领</span>
              <span>{{ region.boss?.name ?? '待接线' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">解锁进度</span>
              <span>{{ getUnlockSummary(region.id) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">周焦点</span>
              <span :class="region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? 'text-success' : 'text-muted'">
                {{ region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? '当前焦点' : '普通' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">区域情报</span>
              <span class="text-accent">{{ getRegionKnowledgeSummary(region.id).intelLabel }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">地图摸清</span>
              <span>{{ getRegionKnowledgeSummary(region.id).surveyLabel }}</span>
            </div>
          </div>

          <p class="text-[0.625rem] text-muted mt-2 leading-4">
            看清进度：情报 {{ getRegionKnowledgeSummary(region.id).intel }} / 摸清 {{ getRegionKnowledgeSummary(region.id).survey }} / 走熟 {{ getRegionKnowledgeSummary(region.id).familiarity }}
          </p>

          <div v-if="region.unlocked && shouldRenderRegionDetail(region.id)" class="mt-3 space-y-2">
            <div
              class="border border-accent/10 rounded-xs px-3 py-3 overflow-hidden"
              style="background-image: linear-gradient(135deg, rgba(168, 138, 86, 0.12), rgba(24, 24, 24, 0.04));"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[0.625rem] text-muted">路线总览</p>
                  <p class="text-xs text-accent mt-1">{{ getRegionMapBoardSummary(region.id).headline }}</p>
                  <p v-if="isCompactMobile" class="text-[0.625rem] text-muted mt-2 leading-4">这里先看推进进度，真正出发统一以下方路线卡和首领入口为准。</p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="text-[0.625rem]" :class="getRegionFogMeta(region.id).toneClass">{{ getRegionFogMeta(region.id).label }}</span>
                  <p class="text-[0.625rem] text-muted mt-1">{{ getRegionMapBoardSummary(region.id).subhead }}</p>
                </div>
              </div>

              <div class="mt-3 space-y-3" :data-testid="`region-map-rail-${region.id}`">
                <RegionExplorationTree
                  :region-name="region.name"
                  :summary="getRegionTreeSummary(region.id)"
                  :nodes="getRegionExplorationTree(region.id).nodes"
                  :links="getRegionExplorationTree(region.id).links"
                  :initial-node-key="getRegionTreeInitialNodeKey(region.id)"
                  @trigger-action="handleRegionTreeNodeAction"
                  @navigate="handleRegionTreeNavigate"
                />

                <button
                  class="w-full border border-accent/20 rounded-xs px-3 py-2 text-[0.625rem] text-accent hover:bg-accent/5"
                  @click="toggleCompactRegionSection(region.id)"
                >
                  {{ isCompactRegionSectionOpen(region.id) ? '收起旧版细节与旅后材料' : '展开旧版细节与旅后材料' }}
                </button>
              </div>
            </div>

            <div v-if="isCompactRegionSectionOpen(region.id)" class="space-y-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">季节变体快照</p>
                  <span class="text-[0.625rem]" :class="getRegionVariantSnapshot(region.id).activeVariantId ? 'text-warning' : 'text-success'">
                    {{ getRegionVariantSnapshot(region.id).activeVariantId ? getRegionVariantSnapshot(region.id).activeVariantLabel : '常态版图' }}
                  </span>
                </div>
                <p class="text-xs text-accent mt-1">{{ getRegionVariantSnapshot(region.id).summary }}</p>
                <div class="space-y-1 mt-2">
                  <p
                    v-for="line in getRegionVariantSnapshot(region.id).detailLines.slice(0, 3)"
                    :key="`${region.id}-variant-${line}`"
                    class="text-[0.625rem] text-muted leading-4"
                  >
                    路 {{ line }}
                  </p>
                </div>
              </div>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[0.625rem] text-muted">本周传闻板</p>
                  <span
                    class="text-[0.625rem]"
                    :class="getRegionRumorBoard(region.id).some(entry => !entry.fulfilled) ? 'text-warning' : 'text-success'"
                  >
                    {{ getRegionRumorBoard(region.id).length }} 条
                  </span>
                </div>
                <p v-if="getRegionRumorBoard(region.id).length === 0" class="text-[0.625rem] text-muted mt-2 leading-4">
                  本周暂时没有挂出来的区域传闻，等天气、时间或人手窗口刷新后再来看看。
                </p>
                <div v-else class="space-y-2 mt-2">
                  <div
                    v-for="entry in getRegionRumorBoard(region.id)"
                    :key="entry.id"
                    class="border border-accent/10 rounded-xs px-2 py-2"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-[0.625rem] text-accent">{{ entry.title }}</p>
                        <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                        <p class="text-[0.625rem] text-muted mt-1 leading-4">
                          {{ entry.sourceNpcName }} / {{ entry.sourceLocation }} / {{ entry.relationshipStageLabel }}
                        </p>
                      </div>
                      <span class="text-[0.625rem] shrink-0" :class="entry.fulfilled ? 'text-success' : 'text-warning'">
                        {{ entry.fulfilled ? '已兑现' : '待兑现' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div class="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                class="border border-danger/20 rounded-xs px-2 py-1 text-[0.625rem] text-danger hover:bg-danger/5"
                :class="[isCompactMobile ? 'w-full' : '', !canChallengeBoss(region.id) ? 'opacity-60' : '']"
                :aria-disabled="!canChallengeBoss(region.id)"
                :title="getBossDisabledReason(region.id)"
                :data-testid="`region-boss-primary-${region.id}`"
                @click="handleRunBoss(region.id)"
              >
                发起首领远征
              </button>
              </div>
              <p v-if="getBossDisabledReason(region.id)" class="text-[0.625rem] text-muted leading-4">
                {{ getBossDisabledReason(region.id) }}
              </p>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[0.625rem] text-muted mb-2">首领准备</p>
              <div class="mb-2 flex justify-center">
                <FishBossImage
                  kind="regionBoss"
                  :id="getBossMapPreview(region.id).bossId"
                  :name="getBossMapPreview(region.id).bossName || getBossMapPreview(region.id).title"
                  :resolution="256"
                  size="lg"
                  :silhouette="!canChallengeBoss(region.id) || !getBossMapPreview(region.id).bossId"
                />
              </div>
              <p class="text-xs text-accent">{{ getBossMapPreview(region.id).description }}</p>
              <div class="flex items-center justify-between gap-2 mt-2">
                <span class="text-[0.625rem]" :class="getBossMapPreview(region.id).stageToneClass">{{ getBossMapPreview(region.id).stageLabel }}</span>
                <span class="text-[0.625rem] text-muted">{{ getBossPrepSummary(region.id).headline }}</span>
              </div>
              <div class="mt-2 space-y-1" v-if="getBossMapPreview(region.id).detailLines.length > 0">
                <p
                  v-for="line in getBossMapPreview(region.id).detailLines"
                  :key="`${region.id}-boss-map-${line}`"
                  class="text-[0.625rem] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
              </div>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[0.625rem] text-muted mb-2">回城去向</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="panel in getLinkedPanels(region.linkedSystems)"
                  :key="`${region.id}-${panel.key}`"
                  class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                  @click="handleNavigate(panel.key)"
                >
                  去{{ panel.label }}
                </button>
              </div>
              </div>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[0.625rem] text-muted mb-2">本区回城重点</p>
              <p class="text-xs text-accent">{{ getRegionHandoffSummary(region.id).headline }}</p>
              <div class="mt-2 space-y-1" v-if="getRegionHandoffSummary(region.id).detailLines.length > 0">
                <p
                  v-for="line in getRegionHandoffSummary(region.id).detailLines"
                  :key="`${region.id}-${line}`"
                  class="text-[0.625rem] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
              </div>

              <div class="space-y-2">
                <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[0.625rem] text-muted">本周区域事件</p>
                  <span class="text-[0.625rem] text-accent">{{ getActiveRegionEvents(region.id).length }}/{{ getRegionWeeklyEventCapacity(region.id) }}</span>
                </div>
                <p v-if="getActiveRegionEvents(region.id).length === 0" class="text-[0.625rem] text-muted mt-2 leading-4">
                  当前没有激活事件，通常会在周切换或同步焦点后刷新。
                </p>
                <div v-else class="space-y-2 mt-2">
                  <div
                    v-for="event in getActiveRegionEvents(region.id)"
                    :key="event.id"
                    class="border border-accent/10 rounded-xs px-3 py-2"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs text-accent">{{ event.name }}</p>
                        <p class="text-[0.625rem] text-muted mt-0.5 leading-4">{{ event.description }}</p>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[0.625rem] text-muted">
                          <span>体力 {{ event.staminaCost }}</span>
                          <span>耗时 {{ event.timeCostHours }}h</span>
                          <span>资源 +{{ event.rewardAmount }}</span>
                        </div>
                        <p v-if="event.encounterHint" class="text-[0.625rem] text-muted mt-1 leading-4">
                          - {{ event.encounterHint }}
                        </p>
                        <p v-if="event.handoffHint" class="text-[0.625rem] text-accent/80 mt-1 leading-4">
                          -> {{ event.handoffHint }}
                        </p>
                      </div>
                      <span class="text-[0.625rem] shrink-0 text-muted">本周 {{ event.weeklyCompletions }}/{{ event.maxWeeklyCompletions ?? 1 }}</span>
                    </div>

                    <div class="flex flex-wrap gap-2 mt-2">
                      <button
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                        :class="!canRunEvent(event.id) ? 'opacity-60' : ''"
                        :aria-disabled="!canRunEvent(event.id)"
                        :title="getEventDisabledReason(event.id)"
                        @click="handleRunEvent(event.id)"
                      >
                        处理事件
                      </button>
                    </div>
                    <p v-if="getEventDisabledReason(event.id)" class="text-[0.625rem] text-muted mt-2 leading-4">
                      {{ getEventDisabledReason(event.id) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div class="space-y-2">
                <div
                  v-for="route in getRegionRoutes(region.id)"
                  :key="route.id"
                  class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/40"
                  :data-testid="`region-route-card-${route.id}`"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-xs text-accent">{{ getRouteMapPreview(route).title }}</p>
                        <span class="text-[0.625rem]" :class="getRouteMapPreview(route).stageToneClass">{{ getRouteMapPreview(route).stageLabel }}</span>
                        <span class="border border-accent/10 rounded-xs px-1.5 py-0.5 text-[0.625rem] text-muted">{{ getRouteTypeLabel(route.nodeType) }}</span>
                      </div>
                      <p class="text-[0.625rem] text-muted mt-1 leading-4" :class="isCompactMobile ? 'compact-clamp-3' : ''">{{ getRouteMapPreview(route).description }}</p>
                      <p
                        v-if="getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered' || getRouteMapPreview(route).stage === 'heard'"
                        class="text-[0.625rem] mt-2 leading-4"
                        :class="getRouteDecisionSummary(route).focusToneClass"
                      >
                        {{ getRouteDecisionSummary(route).headline }}
                      </p>
                      <div class="flex flex-wrap gap-2 mt-2 text-[0.625rem] text-muted">
                        <span
                          v-if="getRouteMapPreview(route).stage !== 'unknown'"
                          class="border rounded-xs px-1.5 py-0.5"
                          :class="getRouteDecisionSummary(route).focusToneClass === 'text-danger' ? 'border-danger/20 text-danger' : getRouteDecisionSummary(route).focusToneClass === 'text-success' ? 'border-success/20 text-success' : getRouteDecisionSummary(route).focusToneClass === 'text-warning' ? 'border-warning/20 text-warning' : 'border-accent/20 text-accent'"
                        >
                          {{ getRouteDecisionSummary(route).focusLabel }}
                        </span>
                        <span
                          v-if="getRouteMapPreview(route).stage !== 'unknown'"
                          class="border rounded-xs px-1.5 py-0.5"
                          :class="getRouteDecisionSummary(route).riskToneClass === 'text-danger' ? 'border-danger/20 text-danger' : getRouteDecisionSummary(route).riskToneClass === 'text-success' ? 'border-success/20 text-success' : getRouteDecisionSummary(route).riskToneClass === 'text-warning' ? 'border-warning/20 text-warning' : 'border-accent/20 text-accent'"
                        >
                          {{ getRouteDecisionSummary(route).riskLabel }}
                        </span>
                        <span
                          v-if="getRouteMapPreview(route).stage !== 'unknown'"
                          class="border border-accent/10 rounded-xs px-1.5 py-0.5 text-accent/80"
                        >
                          主要带回 {{ getRouteDecisionSummary(route).rewardLabel }}
                        </span>
                        <span
                          v-if="getRouteMapPreview(route).stage !== 'unknown'"
                          class="border rounded-xs px-1.5 py-0.5"
                          :class="getRouteDecisionSummary(route).modeToneClass === 'text-success' ? 'border-success/20 text-success' : getRouteDecisionSummary(route).modeToneClass === 'text-warning' ? 'border-warning/20 text-warning' : 'border-accent/10 text-muted'"
                        >
                          {{ getRouteDecisionSummary(route).modeLabel }}
                        </span>
                        <span v-if="!isCompactMobile && getRouteMapPreview(route).stage !== 'unknown'">认知 {{ getRouteKnowledgeSummary(route.id).intelLabel }}</span>
                        <span v-if="!isCompactMobile && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')">体力 {{ route.staminaCost }}</span>
                        <span v-if="!isCompactMobile && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')">耗时 {{ route.timeCostHours }}h</span>
                        <span v-if="!isCompactMobile && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')">熟悉 {{ getRouteKnowledgeSummary(route.id).familiarityLabel }}</span>
                        <span
                        v-if="!isCompactMobile && (getRouteMapPreview(route).stage === 'mastered' || getRouteMapPreview(route).stage === 'surveyed')"
                        :class="getRouteShortcutSummary(route.id).toneClass"
                      >
                        {{ getRouteShortcutSummary(route.id).label }}
                      </span>
                      </div>
                      <p
                        v-if="getRouteDecisionSummary(route).linkedSummary && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')"
                        class="text-[0.625rem] text-accent/80 mt-2 leading-4"
                      >
                        回城优先：{{ getRouteDecisionSummary(route).linkedSummary }}
                      </p>
                      <div v-if="!isCompactMobile && getRouteDispatchSignals(route).length > 0" class="flex flex-wrap gap-2 mt-2">
                        <span
                          v-for="signal in getRouteDispatchSignals(route)"
                        :key="`${route.id}-${signal.label}`"
                        class="border rounded-xs px-2 py-0.5 text-[0.625rem]"
                        :class="signal.shellClass"
                      >
                        <span :class="signal.toneClass">{{ signal.label }}</span>
                      </span>
                    </div>
                  </div>
                  <span class="text-[0.625rem] shrink-0 text-muted">{{ getRouteCompletionLabel(route.id) }}</span>
                </div>

                <div :class="isCompactMobile ? 'flex flex-col gap-2 mt-3' : 'flex flex-wrap gap-2 mt-2'">
                  <button
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                    :class="[isCompactMobile ? 'w-full' : '', !canRunRoute(route.id) ? 'opacity-60' : '']"
                    :aria-disabled="!canRunRoute(route.id)"
                    :title="getRouteDisabledReason(route.id)"
                    :data-testid="`region-route-primary-${route.id}`"
                    :data-expedition-mode="shouldAutoRunRoute(route.id) ? 'auto' : 'manual'"
                    @click="handleRunRoute(route.id)"
                  >
                    {{ getRouteRunActionLabel(route.id) }}
                  </button>
                </div>

                <button
                  v-if="isCompactMobile"
                  class="mt-2 w-full border border-accent/20 rounded-xs px-3 py-2 text-[0.625rem] text-accent hover:bg-accent/5"
                  @click="toggleCompactRouteDetails(route.id)"
                >
                  {{ isCompactRouteDetailsOpen(route.id) ? '收起路线细节' : '展开路线细节' }}
                </button>

                <div v-if="!isCompactMobile || isCompactRouteDetailsOpen(route.id)" class="mt-2 space-y-2">
                  <p v-if="getRouteMapPreview(route).stage !== 'unknown'" class="text-[0.625rem] text-muted leading-4">
                    路线勘明 {{ getRouteKnowledgeSummary(route.id).surveyProgress }}/100 · 熟悉 {{ getRouteKnowledgeSummary(route.id).familiarity }}/100
                  </p>
                  <div
                    v-if="getRouteBuildAdvice(route) && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')"
                    class="border border-accent/10 rounded-xs px-3 py-2 bg-accent/5"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-[0.625rem] text-muted">构筑接入提示</p>
                      <span class="text-[0.625rem] text-accent">构筑分 {{ getRouteBuildAdvice(route)?.buildScore }}</span>
                    </div>
                    <p class="text-[0.625rem] text-accent mt-1 leading-4">
                      出发体力 {{ route.staminaCost }} -> {{ getRouteBuildAdvice(route)?.adjustedStaminaCost }}，推荐先看 {{ getRouteDecisionSummary(route).rewardLabel }}。
                    </p>
                    <p
                      v-for="line in getRouteBuildAdvice(route)?.summaryLines ?? []"
                      :key="`${route.id}-build-line-${line}`"
                      class="text-[0.625rem] text-muted mt-1 leading-4"
                    >
                      · {{ line }}
                    </p>
                    <p v-if="getRouteBuildAdvice(route)?.focusLine" class="text-[0.625rem] text-accent/80 mt-1 leading-4">
                      这条线当前更吃：{{ getRouteBuildAdvice(route)?.focusLine }}
                    </p>
                    <p v-if="getRouteBuildAdvice(route)?.missingLine" class="text-[0.625rem] text-warning mt-1 leading-4">
                      当前短板：{{ getRouteBuildAdvice(route)?.missingLine }}
                    </p>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <button
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                        @click="handleNavigate('inventory')"
                      >
                        去背包调装备
                      </button>
                      <button
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                        @click="handleNavigate('skills')"
                      >
                        去技能补构筑
                      </button>
                    </div>
                  </div>
                  <p
                    v-if="getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered'"
                    class="text-[0.625rem] leading-4"
                    :class="getAutoPatrolStatus(route.id).mode === 'blocked' ? 'text-warning' : getRouteShortcutSummary(route.id).level === 'none' ? 'text-muted' : 'text-accent/80'"
                  >
                    {{ getRouteDispatchSummary(route) }}
                  </p>
                  <p v-if="route.encounterHint && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')" class="text-[0.625rem] text-muted leading-4">
                    - {{ route.encounterHint }}
                  </p>
                  <p v-if="route.handoffHint && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')" class="text-[0.625rem] text-accent/80 leading-4">
                    -> {{ route.handoffHint }}
                  </p>
                  <div
                    v-if="getActiveCompanionContract(route.id) || getCompanionContractCandidates(route.id).length > 0"
                    class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/50"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-[0.625rem] text-muted">同伴远行合同</p>
                      <span class="text-[0.625rem]" :class="getActiveCompanionContract(route.id) ? 'text-warning' : 'text-muted'">
                        {{ getActiveCompanionContract(route.id) ? '已挂合同' : '可派合同' }}
                      </span>
                    </div>
                    <template v-if="getActiveCompanionContract(route.id)">
                      <p class="text-[0.625rem] text-accent mt-2">
                        {{ getActiveCompanionContract(route.id)?.npcName }} / {{ getActiveCompanionContract(route.id)?.relationshipStageLabel }}
                      </p>
                      <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ getActiveCompanionContract(route.id)?.summary }}</p>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <button
                          class="border border-danger/20 rounded-xs px-2 py-1 text-[0.625rem] text-danger hover:bg-danger/5"
                          :class="isCompactMobile ? 'w-full' : ''"
                          @click="handleClearCompanionContract(route.id)"
                        >
                          撤回合同
                        </button>
                      </div>
                    </template>
                    <div v-else class="flex flex-col sm:flex-row flex-wrap gap-2 mt-2">
                      <button
                        v-for="candidate in getCompanionContractCandidates(route.id).slice(0, 3)"
                        :key="`${route.id}-${candidate.npcId}`"
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                        :class="isCompactMobile ? 'w-full' : ''"
                        @click="handleAssignCompanionContract(route.id, candidate.npcId)"
                      >
                        挂 {{ candidate.npcName }}
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="getRouteDisabledReason(route.id)" class="text-[0.625rem] text-muted mt-2 leading-4">
                  {{ getRouteDisabledReason(route.id) }}
                </p>
              </div>
            </div>
            </div>
          <div v-else-if="region.unlocked && isCompactMobile" class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[0.625rem] text-muted">这一区先不摊开全部细节</p>
                <p class="text-xs text-accent mt-1">先决定要不要看 {{ region.name }} 的路线、首领准备和回城去向。</p>
                <p class="text-[0.625rem] text-muted mt-2 leading-4">移动端先只保留这一层概要，避免把整页路线和台账一次性压出来。</p>
              </div>
              <span class="text-[0.625rem] shrink-0 text-muted">待展开</span>
            </div>
            <button
              class="mt-3 w-full border border-accent/20 rounded-xs px-3 py-2 text-[0.625rem] text-accent hover:bg-accent/5"
              @click="handleSelectRegionFilter(region.id)"
            >
              只看这个区域
            </button>
          </div>
          <div v-else class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[0.625rem] text-muted">锁区预览</p>
                <p class="text-xs text-accent mt-1">当前区域尚未开放，不会展开路线、首领和事件操作。</p>
              </div>
              <span class="text-[0.625rem] shrink-0 text-warning">待解锁</span>
            </div>
            <div class="mt-3 space-y-2 text-[0.625rem] leading-4">
              <p class="text-muted">解锁条件：{{ getUnlockSummary(region.id) }}</p>
              <p class="text-muted">主题方向：{{ region.themeHint }}</p>
              <p class="text-accent/80">解锁后承接：{{ region.linkedSystems.join(' / ') }}</p>
              <p class="text-muted">先满足解锁条件，下面这些路网、路线和首领入口才会真正开放。</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[0.625rem] tracking-[0.24em] text-accent/70">补充信息</p>
            <p class="text-xs text-accent mt-1">{{ regionMapStore.frontierDigest.headline }}</p>
          </div>
          <button
            class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
            @click="mobileDigestExpanded = !mobileDigestExpanded"
          >
            {{ mobileDigestExpanded ? '收起' : '展开' }}
          </button>
        </div>

        <div v-if="mobileDigestExpanded" class="mt-3 space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="card in compactSummaryCards"
              :key="`compact-summary-${card.label}`"
              class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
            >
              <p class="text-[0.625rem] text-muted">{{ card.label }}</p>
              <p class="text-sm mt-1" :class="card.toneClass">{{ card.value }}</p>
            </div>
          </div>

          <div class="space-y-1">
          <p
            v-for="line in regionMapStore.frontierDigest.highlightSummaries"
            :key="`compact-digest-highlight-${line}`"
            class="text-[0.625rem] text-muted leading-4"
          >
            - {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.nextHookSummaries"
            :key="`compact-digest-hook-${line}`"
            class="text-[0.625rem] text-accent/80 leading-4"
          >
            -> {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.riskSummaries"
            :key="`compact-digest-risk-${line}`"
            class="text-[0.625rem] text-warning leading-4"
          >
            ! {{ line }}
          </p>
          </div>
        </div>
      </div>

      </section>

      <section v-show="activeRegionMapTab === 'today'" class="space-y-3">
      <div v-if="currentSession" ref="stagePanelAnchor">
        <RegionExpeditionStagePanel
          :session="currentSession"
          :region-label="currentSessionRegionLabel"
          :status-label="currentSessionStatusLabel"
          :player-hp="playerStore.hp"
          :player-max-hp="playerStore.getMaxHp()"
          :node-choices="currentSessionNodeChoices"
          :encounter-trail="currentSessionEncounterTrail"
          :current-node-headline="currentSessionNodeHeadline"
          :shortcut-summary="currentSessionShortcutSummary"
          :intro-lines="currentSessionIntroLines"
          :signal-lines="currentSessionSignalLines"
          :approach-label="currentSessionApproachLabel"
          :retreat-label="currentSessionRetreatLabel"
          :compact-mode="isCompactMobile"
          @advance="handleAdvanceExpedition"
          @camp="handleCampExpedition"
          @retreat="handleRetreatExpedition"
          @settle="handleSettleExpedition"
          @resolve-camp="handleResolveCampAction"
          @resolve-encounter="handleResolveEncounter"
        />
      </div>
      </section>

      <section v-show="activeRegionMapTab === 'aftermath'" ref="latestAftermathAnchor" class="space-y-3">
        <RegionJourneyAftermathPanel
          :latest-summary="latestJourneyAftermathSummary"
          :pinned-summary="pinnedJourneyAftermathSummary"
          :visible-history-entries="visibleJourneyHistoryEntries"
          :journey-history-overflow-entries="journeyHistoryOverflowEntries"
          :has-more-journey-history-entries="hasMoreJourneyHistoryEntries"
          :mobile-history-collapsed-summary="mobileHistoryCollapsedSummary"
          :is-compact-mobile="isCompactMobile"
          v-model:mobile-latest-expanded="mobileLatestAftermathExpanded"
          v-model:mobile-selected-expanded="mobileSelectedAftermathExpanded"
          v-model:mobile-history-expanded="mobileHistoryExpanded"
          v-model:mobile-history-section-expanded="mobileHistorySectionExpanded"
          :has-resource-ledger-entries="hasResourceLedgerEntries"
          :get-journey-action-tag-meta="getJourneyActionTagMeta"
          :get-archive-outcome-label="getArchiveOutcomeLabel"
          :get-journey-action-status="getJourneyActionStatus"
          :is-journey-action-processed="isJourneyActionProcessed"
          :get-journey-action-button-meta="getJourneyActionButtonMeta"
          :get-region-name="getRegionName"
          :format-carry-manifest="formatCarryManifest"
          :get-archive-aftermath-summary="getArchiveAftermathSummary"
          @navigate="handleJourneyActionNavigate"
          @scroll-resource="scrollToResourceLedger"
          @clear-selected="clearSelectedJourneyAftermath"
          @select-aftermath="handleSelectJourneyAftermath"
          @open-aftermath="handleOpenJourneyAftermath"
        />
      </section>

      <section v-show="activeRegionMapTab === 'resource'" class="space-y-3">
        <div ref="resourceLedgerAnchor">
          <RegionResourcePrepPanel
            :is-compact-mobile="isCompactMobile"
            v-model:mobile-ledger-expanded="mobileLedgerExpanded"
            :resource-ledger-entries="regionMapStore.resourceLedgerEntries"
            :resource-feature-enabled="regionMapStore.resourceFeatureEnabled"
            :visible-journey-crafting-entries="visibleJourneyCraftingEntries"
            :visible-journey-awakening-entries="visibleJourneyAwakeningEntries"
            :visible-journey-camp-module-entries="visibleJourneyCampModuleEntries"
            :visible-journey-route-permit-entries="visibleJourneyRoutePermitEntries"
            :get-journey-recipe-status="getJourneyRecipeStatus"
            :format-journey-recipe-materials="formatJourneyRecipeMaterials"
            :can-unlock-journey-awakening="canUnlockJourneyAwakening"
            :can-unlock-journey-camp-module="canUnlockJourneyCampModule"
            :can-unlock-journey-route-permit="canUnlockJourneyRoutePermit"
            :get-resource-family-label="getResourceFamilyLabel"
            @navigate="handleNavigate"
            @turn-in="handlePublicResourceTurnIn"
            @craft="handleCraftJourneyRecipe"
            @unlock-awakening="handleUnlockJourneyAwakening"
            @unlock-camp-module="handleUnlockJourneyCampModule"
            @unlock-route-permit="handleUnlockJourneyRoutePermit"
          />
        </div>
      </section>

      <Transition name="dialog-pop">
        <div
          v-if="settlementDialog"
          class="fixed inset-0 z-50 flex bg-black/45"
          :class="isCompactMobile ? 'items-end justify-stretch px-0' : 'items-center justify-center px-4'"
          @click.self="settlementDialog = null"
        >
        <div
          class="w-full border bg-bg overflow-y-auto"
          :class="[settlementToneClass, isCompactMobile ? 'max-w-none rounded-t-sm px-3 py-3 max-h-[88vh]' : 'max-w-2xl rounded-xs p-4 max-h-[85vh]']"
          :style="isCompactMobile ? 'padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));' : ''"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ settlementDialog.title }}</p>
              <JourneySettlementReveal
                v-if="expeditionSettlementDialog"
                class="mt-3"
                :journey-lines="expeditionSettlementDialog.journeyLines"
                :reward-lines="expeditionSettlementDialog.rewardLines"
                :aftermath-lines="expeditionSettlementDialog.aftermathLines"
                :handoff-board="expeditionSettlementDialog.handoffBoard"
                :actions="expeditionSettlementDialog.actions"
                :compact-mode="isCompactMobile"
                @navigate="handleSettlementAction"
                @close="settlementDialog = null"
              />

              <div v-else-if="false" class="mt-3 space-y-3">
                <div class="border border-accent/10 rounded-xs px-3 py-3">
                  <p class="text-[0.625rem] text-muted mb-2">旅程回顾</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in expeditionSettlementDialog?.journeyLines ?? []"
                      :key="`settlement-journey-${line}`"
                      class="text-[0.6875rem] leading-5 text-muted"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>

                <div class="border border-success/20 rounded-xs px-3 py-3 bg-success/5">
                  <p class="text-[0.625rem] text-muted mb-2">回流分发</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in expeditionSettlementDialog?.rewardLines ?? []"
                      :key="`settlement-reward-${line}`"
                      class="text-[0.6875rem] leading-5"
                      :class="line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还') ? 'text-success' : 'text-muted'"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>

                <div class="border border-accent/10 rounded-xs px-3 py-3">
                  <p class="text-[0.625rem] text-muted mb-2">旅后处理</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in expeditionSettlementDialog?.aftermathLines ?? []"
                      :key="`settlement-aftermath-${line}`"
                      class="text-[0.6875rem] leading-5 text-muted"
                    >
                      · {{ line }}
                    </p>
                  </div>

                  <div v-if="expeditionSettlementDialog?.handoffBoard" class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-accent/5">
                    <p class="text-[0.625rem] text-muted">戏剧化回流入口</p>
                    <p class="text-[0.6875rem] text-accent mt-1">{{ expeditionSettlementDialog?.handoffBoard?.headline }}</p>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                        <p class="text-[0.625rem] text-muted mb-2">资源去向</p>
                        <div class="space-y-1">
                          <p
                            v-for="line in expeditionSettlementDialog?.handoffBoard?.resourceLines ?? []"
                            :key="`settlement-resource-${line}`"
                            class="text-[0.625rem] text-muted leading-4"
                          >
                            · {{ line }}
                          </p>
                        </div>
                      </div>

                      <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
                        <p class="text-[0.625rem] text-muted mb-2">推荐动作</p>
                        <div class="space-y-2">
                          <div
                            v-for="action in expeditionSettlementDialog?.handoffBoard?.actionCards ?? []"
                            :key="`settlement-action-card-${action.key}`"
                            class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
                          >
                            <div class="flex items-start justify-between gap-3">
                              <div class="min-w-0">
                                <p class="text-[0.625rem] text-accent">去{{ action.label }}</p>
                                <p class="text-[0.625rem] text-muted mt-1 leading-4">{{ action.summary }}</p>
                                <p class="text-[0.625rem] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                              </div>
                              <button
                                class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5 shrink-0"
                                @click="handleSettlementAction(action.key)"
                              >
                                前往
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                        <p class="text-[0.625rem] text-muted mb-2">为什么现在去</p>
                        <div class="space-y-1">
                          <p
                            v-for="line in expeditionSettlementDialog?.handoffBoard?.whyNowLines ?? []"
                            :key="`settlement-why-now-${line}`"
                            class="text-[0.625rem] text-muted leading-4"
                          >
                            · {{ line }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div v-if="(expeditionSettlementDialog?.handoffBoard?.receiptSections?.length ?? 0) > 0" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        v-for="section in expeditionSettlementDialog?.handoffBoard?.receiptSections ?? []"
                        :key="`settlement-receipt-${section.title}`"
                        class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
                      >
                        <p class="text-[0.625rem] text-muted mb-2">{{ section.title }}</p>
                        <div class="space-y-1">
                          <p
                            v-for="line in section.lines"
                            :key="`settlement-receipt-line-${section.title}-${line}`"
                            class="text-[0.625rem] text-muted leading-4"
                          >
                            · {{ line }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else-if="(expeditionSettlementDialog?.actions?.length ?? 0) > 0" class="mt-3 flex flex-wrap gap-2">
                    <button
                      v-for="action in expeditionSettlementDialog?.actions ?? []"
                      :key="`settlement-action-${action.key}`"
                      class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-accent hover:bg-accent/5"
                      @click="handleSettlementAction(action.key)"
                    >
                      去{{ action.label }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="mt-2 space-y-1">
                <p
                  v-for="line in settlementDialog.lines"
                  :key="`settlement-line-${line}`"
                  class="text-[0.6875rem] leading-5 text-muted"
                >
                  {{ line }}
                </p>
              </div>
            </div>
            <button class="border border-accent/20 rounded-xs px-2 py-1 text-[0.625rem] text-muted hover:bg-accent/5" @click="settlementDialog = null">
              关闭
            </button>
          </div>
        </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { Map } from 'lucide-vue-next'
  import FishBossImage from '@/components/game/FishBossImage.vue'
  import RegionExplorationTree from '@/components/game/regionMap/RegionExplorationTree.vue'
  import RegionOpenWorldMap from '@/components/game/regionMap/RegionOpenWorldMap.vue'
  import JourneySettlementReveal from '@/components/game/regionMap/JourneySettlementReveal.vue'
  import RegionExpeditionStagePanel from '@/components/game/regionMap/RegionExpeditionStagePanel.vue'
  import RegionJourneyAftermathPanel from '@/components/game/regionMap/RegionJourneyAftermathPanel.vue'
  import RegionResourcePrepPanel from '@/components/game/regionMap/RegionResourcePrepPanel.vue'
  import { getRareVisitorsForDay } from '@/data/bookseller'
  import { resolveEnvironmentWindow } from '@/data/environmentWindows'
  import { getSeasonalActivitiesForDay, getSeasonEventsForDay } from '@/data/events'
  import { getItemById } from '@/data/items'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import { navigateToPanel, type PanelKey } from '@/composables/useNavigation'
  import { useRegionJourneyHandoffModel } from '@/composables/useRegionJourneyHandoffModel'
  import { getWeekCycleInfo } from '@/utils/weekCycle'
  import { useFishPondStore } from '@/stores/useFishPondStore'
  import { useGameStore } from '@/stores/useGameStore'
  import { useGuildStore } from '@/stores/useGuildStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useHanhaiStore } from '@/stores/useHanhaiStore'
  import { useMuseumStore } from '@/stores/useMuseumStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useQuestStore } from '@/stores/useQuestStore'
  import { useRegionMapStore } from '@/stores/useRegionMapStore'
  import { useShopStore } from '@/stores/useShopStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import type {
    RegionCampActionId,
    RegionExpeditionArchiveEntry,
    RegionExpeditionApproach,
    RegionExpeditionCarryItem,
    RegionExpeditionCarryItemCategory,
    RegionExpeditionEncounterMemory,
    RegionExpeditionRetreatRule,
    RegionExpeditionWeather,
    RegionExplorationTreeLink,
    RegionExplorationTreeNode,
    RegionId,
    RegionLinkedSystem,
    RegionOpenWorldActionId,
    RegionOpenWorldId,
    RegionOpenWorldViewportBounds,
    RegionRouteDef,
    RegionalResourceFamilyId
  } from '@/types/region'

  const fishPondStore = useFishPondStore()
  const gameStore = useGameStore()
  const guildStore = useGuildStore()
  const goalStore = useGoalStore()
  const hanhaiStore = useHanhaiStore()
  const museumStore = useMuseumStore()
  const playerStore = usePlayerStore()
  const questStore = useQuestStore()
  const regionMapStore = useRegionMapStore()
  const shopStore = useShopStore()
  const villageProjectStore = useVillageProjectStore()
  const { buildJourneyHandoffBoard, getRegionHandoffSummary } = useRegionJourneyHandoffModel({
    regionMapStore,
    shopStore,
    hanhaiStore,
    fishPondStore,
    museumStore,
    questStore,
    goalStore,
    guildStore,
    villageProjectStore,
    buildSettlementActionPanels,
    getRegionRoutes,
    isRouteUnlocked,
    getUnlockSummary
  })
  const lastActionSummary = ref('')
  const actionTone = ref<'success' | 'danger' | 'accent'>('success')
  const selectedRegionId = ref<RegionId | null>(
    regionMapStore.regionSummaries.find(region => region.id === regionMapStore.currentWeeklyFocus.focusedRegionId && region.unlocked)?.id
      ?? regionMapStore.regionSummaries.find(region => region.unlocked)?.id
      ?? regionMapStore.regionSummaries[0]?.id
      ?? null
  )
  const regionListAnchor = ref<HTMLElement | null>(null)
  const stagePanelAnchor = ref<HTMLElement | null>(null)
  const latestAftermathAnchor = ref<HTMLElement | null>(null)
  const resourceLedgerAnchor = ref<HTMLElement | null>(null)
  const router = useRouter()
  type SettlementDialogAction = { key: PanelKey; label: string }
  type StatusChip = { statusLabel: string; statusToneClass: string }
  type SettlementDialogActionCard = SettlementDialogAction & { summary: string; reason: string } & StatusChip
  type JourneyHandoffReceiptSection = { title: string; lines: string[] } & StatusChip
  type PrimaryJourneyActionCard = {
    kind: 'session' | 'focus' | 'aftermath' | 'fallback'
    title: string
    summary: string
    detailLines: string[]
    ctaLabel: string
    statusLabel: string
    statusToneClass: string
    regionId: RegionId | null
    routeId: string | null
    panelKey: PanelKey | null
  }
  type MobileJourneyFlowStepId = 'region' | 'route' | 'prep' | 'session' | 'aftermath'
  type RegionMapTabId = 'today' | 'map' | 'aftermath' | 'resource'
  type MapVisibilityStage = 'unknown' | 'heard' | 'surveyed' | 'mastered'
  type RegionMapBoardNode = {
    key: string
    kind: 'route' | 'boss'
    regionId: RegionId
    routeId?: string
    bossId?: string
    bossName?: string
    laneLabel: string
    laneToneClass: string
    title: string
    description: string
    detailLines: string[]
    stageLabel: string
    stageToneClass: string
    disabled: boolean
    disabledReason: string
    actionLabel: string
  }
  type RegionExplorationTreeBuild = {
    nodes: RegionExplorationTreeNode[]
    links: RegionExplorationTreeLink[]
  }
  type JourneyHandoffBoard = {
    headline: string
    resourceLines: string[]
    actionCards: SettlementDialogActionCard[]
    whyNowLines: string[]
    receiptSections: JourneyHandoffReceiptSection[]
  }
  type LinkedPanel = { key: PanelKey; label: string }
  type RouteDispatchSignal = { label: string; toneClass: string; shellClass: string }
  type RouteBuildAdvice = {
    adjustedStaminaCost: number
    buildScore: number
    summaryLines: string[]
    missingLine: string
    focusLine: string
  }
  type FrontierMapOverlayKind = 'season' | 'visitor' | 'repair' | 'activity'
  type FrontierWorldSignalCard = {
    id: string
    kind: FrontierMapOverlayKind
    label: string
    title: string
    summary: string
    detail: string
    priority: number
    routeIds: string[]
    statusLabel: string
    toneClass: string
    shellClass: string
  }
  type FrontierMapAdvancedState = {
    id: FrontierMapOverlayKind
    label: string
    statusLabel: string
    summary: string
    detailLines: string[]
    active: boolean
    toneClass: string
    shellClass: string
  }
  type SettlementDialogState =
    | {
        kind: 'simple'
        title: string
        lines: string[]
        tone: 'success' | 'danger' | 'accent'
      }
    | {
        kind: 'expedition'
        title: string
        lines: string[]
        tone: 'success' | 'danger' | 'accent'
        entryId: string | null
        journeyLines: string[]
        rewardLines: string[]
        aftermathLines: string[]
        handoffBoard: JourneyHandoffBoard | null
        actions: SettlementDialogAction[]
      }

  const settlementDialog = ref<SettlementDialogState | null>(null)
  const isCompactMobile = ref(false)
  const mobilePrepExpanded = ref(false)
  const mobileDigestExpanded = ref(false)
  const mobileHistoryExpanded = ref(false)
  const mobileHistorySectionExpanded = ref(false)
  const mobileLedgerExpanded = ref(false)
  const mobileLatestAftermathExpanded = ref(false)
  const mobileSelectedAftermathExpanded = ref(false)
  const selectedJourneyAftermathPinned = ref(false)
  const journeyTermPrimerDismissed = ref(false)
  const activeRegionMapTab = ref<RegionMapTabId>('today')
  const openWorldViewportOrigins = ref<Partial<Record<RegionOpenWorldId, Pick<RegionOpenWorldViewportBounds, 'minX' | 'minY'>>>>({})
  const compactRegionSectionState = ref<Record<string, boolean>>({})
  const compactRouteDetailState = ref<Record<string, boolean>>({})
  const selectedApproach = ref<RegionExpeditionApproach>('steady')
  const selectedRetreatRule = ref<RegionExpeditionRetreatRule>('balanced')
  const frontierMapAdvancedStateDefs: Array<{
    id: FrontierMapOverlayKind
    label: string
    emptySummary: string
    activeToneClass: string
    activeShellClass: string
  }> = [
    {
      id: 'season',
      label: '季节版',
      emptySummary: '当前没有区域季节变体显形，路线按常规地貌显示。',
      activeToneClass: 'text-warning',
      activeShellClass: 'border-warning/20 bg-warning/5'
    },
    {
      id: 'visitor',
      label: '来访版',
      emptySummary: '今日暂无稀有来访气泡，地图不会额外挂出临时摊位。',
      activeToneClass: 'text-accent',
      activeShellClass: 'border-accent/20 bg-accent/5'
    },
    {
      id: 'repair',
      label: '修复版',
      emptySummary: '还没有新的修复设施落点需要强调，村图保持基础路线。',
      activeToneClass: 'text-success',
      activeShellClass: 'border-success/20 bg-success/5'
    },
    {
      id: 'activity',
      label: '活动版',
      emptySummary: '节庆、短活动和环境窗口暂未叠加成活动层。',
      activeToneClass: 'text-danger',
      activeShellClass: 'border-danger/20 bg-danger/5'
    }
  ]

  const currentDayTag = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)
  const currentWeekId = computed(() => getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId)
  const clampOpenWorldViewportValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const getOpenWorldViewportOrigin = (regionId: RegionOpenWorldId) => openWorldViewportOrigins.value[regionId] ?? null
  const setOpenWorldViewportOrigin = (regionId: RegionOpenWorldId, bounds: Pick<RegionOpenWorldViewportBounds, 'minX' | 'minY'>) => {
    openWorldViewportOrigins.value = {
      ...openWorldViewportOrigins.value,
      [regionId]: {
        minX: bounds.minX,
        minY: bounds.minY
      }
    }
  }
  const activeOpenWorldRegionView = computed(() =>
    regionMapStore.getOpenWorldRegionView(
      regionMapStore.openWorldState.activeRegionId,
      getOpenWorldViewportOrigin(regionMapStore.openWorldState.activeRegionId)
    )
  )
  const selectedOpenWorldTileView = computed(() =>
    regionMapStore.getOpenWorldTileView(regionMapStore.openWorldState.activeRegionId, regionMapStore.openWorldState.selectedTileId)
  )

  const currentFocusLabel = computed(() => {
    const focusedId = regionMapStore.metaState.weeklyFocusState.focusedRegionId
    if (!focusedId) return '未设置'
    const match = regionMapStore.regionDefs.find(region => region.id === focusedId)
    return match?.name ?? '未设置'
  })

  const currentThemeWeekLabel = computed(() => goalStore.currentThemeWeek?.name ?? currentWeekId.value)
  const festivalResolutionContext = computed(() => ({
    year: gameStore.year,
    villageProjectLevel: villageProjectStore.villageProjectLevel,
    themeWeekLabel: goalStore.currentThemeWeek?.name ?? null
  }))
  const todayRegionEvents = computed(() => getSeasonEventsForDay(gameStore.season, gameStore.day, festivalResolutionContext.value))
  const todaySeasonalActivities = computed(() => getSeasonalActivitiesForDay(gameStore.season, gameStore.day))
  const todayRareVisitors = computed(() => getRareVisitorsForDay(gameStore.season, gameStore.day))
  const environmentWindow = computed(() =>
    resolveEnvironmentWindow({
      season: gameStore.season,
      weather: gameStore.weather,
      day: gameStore.day,
      year: gameStore.year,
      isFestivalDay: todayRegionEvents.value.length > 0
    })
  )
  const getAnyUnlockedRouteIds = (limit = 3): string[] =>
    regionMapStore.routeDefs
      .filter(route => regionMapStore.getRouteUnlockStatus(route.id).unlocked)
      .map(route => route.id)
      .slice(0, limit)
  const getUnlockedRouteIdsBySystems = (
    systems: RegionLinkedSystem[],
    limit = 3
  ): string[] => {
    const routeIds = regionMapStore.routeDefs
      .filter(route => regionMapStore.getRouteUnlockStatus(route.id).unlocked)
      .filter(route => route.linkedSystems.some(system => systems.includes(system)))
      .map(route => route.id)
      .slice(0, limit)
    return routeIds.length > 0 ? routeIds : getAnyUnlockedRouteIds(limit)
  }
  const getVisitorSignalRouteIds = (kind: string): string[] => {
    if (kind === 'merchant') return getUnlockedRouteIdsBySystems(['shop', 'quest', 'hanhai'])
    if (kind === 'performer') return getUnlockedRouteIdsBySystems(['quest', 'villageProject'])
    return getUnlockedRouteIdsBySystems(['hanhai', 'shop', 'quest'])
  }
  const getFestivalSignalRouteIds = (festivalType?: string): string[] => {
    if (festivalType === 'fishing_contest') return getUnlockedRouteIdsBySystems(['fishPond', 'quest'])
    if (festivalType === 'harvest_fair' || festivalType === 'tea_contest') return getUnlockedRouteIdsBySystems(['shop', 'quest'])
    if (festivalType === 'dragon_boat' || festivalType === 'kite_flying') return getUnlockedRouteIdsBySystems(['quest', 'villageProject'])
    return getUnlockedRouteIdsBySystems(['quest', 'shop', 'villageProject'])
  }
  const getActivitySignalRouteIds = (activityId: string): string[] => {
    if (activityId === 'river_run_week') return getUnlockedRouteIdsBySystems(['fishPond', 'quest'])
    if (activityId === 'harvest_preview_market') return getUnlockedRouteIdsBySystems(['shop', 'quest'])
    return getUnlockedRouteIdsBySystems(['quest', 'villageProject'])
  }
  const frontierWorldSignalCards = computed<FrontierWorldSignalCard[]>(() => {
    const cards: FrontierWorldSignalCard[] = []

    const seasonalCards = regionMapStore.regionSummaries
      .filter(region => region.unlocked)
      .map((region): FrontierWorldSignalCard | null => {
        const snapshot = regionMapStore.metaState.seasonalRegionStates[region.id]
        return snapshot?.activeVariantId
          ? {
              id: `variant:${region.id}:${snapshot.activeVariantId}`,
              kind: 'season' as const,
              label: '季节变体',
              title: `${region.name} · ${snapshot.activeVariantLabel}`,
              summary: snapshot.summary,
              detail: snapshot.detailLines[0] ?? '这片区域本周更适合手动看一眼。',
              priority: 90,
              routeIds: snapshot.affectedRouteIds,
              statusLabel: '季节版',
              toneClass: 'text-warning',
              shellClass: 'border-warning/20 bg-warning/5'
            }
          : null
      })
      .filter((entry): entry is FrontierWorldSignalCard => !!entry)

    cards.push(...seasonalCards.slice(0, 3))
    if (environmentWindow.value.forage.active) {
      cards.push({
        id: `environment:${environmentWindow.value.id}`,
        kind: 'activity' as const,
        label: '环境窗口',
        title: environmentWindow.value.forage.label,
        summary: environmentWindow.value.forage.summary,
        detail: environmentWindow.value.forage.routeHint,
        priority: 82,
        routeIds: getUnlockedRouteIdsBySystems(['quest', 'fishPond', 'villageProject']),
        statusLabel: '活动版',
        toneClass: 'text-danger',
        shellClass: 'border-danger/20 bg-danger/5'
      })
    }

    cards.push(
      ...todayRareVisitors.value.slice(0, 2).map(visitor => ({
        id: `visitor:${visitor.id}`,
        kind: 'visitor' as const,
        label: '来访气泡',
        title: `${visitor.name} · ${visitor.stallName}`,
        summary: visitor.teaser,
        detail: visitor.prepHints[0] ?? '今天只会停这一天，值不值得专门去看由你自己决定。',
        priority: 78,
        routeIds: getVisitorSignalRouteIds(visitor.kind),
        statusLabel: '来访版',
        toneClass: 'text-accent',
        shellClass: 'border-accent/20 bg-accent/5'
      }))
    )

    cards.push(
      ...todayRegionEvents.value.slice(0, 2).map(event => ({
        id: `festival:${event.id}`,
        kind: 'activity' as const,
        label: '节庆装点',
        title: event.name,
        summary: event.variantNotes?.decorationNotes[0] ?? event.description,
        detail:
          event.variantNotes?.stallNotes[0] ??
          event.prepChecklist?.[0] ??
          '今天的节庆会直接改动广场、摊位和村口布置。',
        priority: 74,
        routeIds: getFestivalSignalRouteIds(event.festivalType),
        statusLabel: '活动版',
        toneClass: 'text-danger',
        shellClass: 'border-danger/20 bg-danger/5'
      }))
    )

    cards.push(
      ...todaySeasonalActivities.value.slice(0, 2).map(activity => ({
        id: `activity:${activity.id}`,
        kind: 'activity' as const,
        label: '短活动窗口',
        title: activity.name,
        summary: activity.description,
        detail: activity.prepChecklist[0] ?? '这几天值得顺手改一下行程，别按平常节奏硬跑。',
        priority: 70,
        routeIds: getActivitySignalRouteIds(activity.id),
        statusLabel: '活动版',
        toneClass: 'text-danger',
        shellClass: 'border-danger/20 bg-danger/5'
      }))
    )

    const restorationCards = villageProjectStore.communityRestorationEffects
      .filter(entry => entry.unlocked && (entry.type === 'service' || entry.type === 'entry'))
      .slice(0, 3)
      .map(entry => ({
        id: `restoration:${entry.id}`,
        kind: 'repair' as const,
        label: entry.type === 'service' ? '设施落点' : '新摊位落点',
        title: entry.title,
        summary: entry.summary,
        detail: `${entry.projectName} 已进入地图承接层。`,
        priority: 66,
        routeIds: getUnlockedRouteIdsBySystems(['villageProject', 'quest']),
        statusLabel: '修复版',
        toneClass: 'text-success',
        shellClass: 'border-success/20 bg-success/5'
      }))

    cards.push(...restorationCards)

    return cards.sort((left, right) => right.priority - left.priority).slice(0, 8)
  })
  const frontierMapAdvancedStates = computed<FrontierMapAdvancedState[]>(() =>
    frontierMapAdvancedStateDefs.map(def => {
      const cards = frontierWorldSignalCards.value.filter(card => card.kind === def.id)
      const topCard = cards[0] ?? null
      const active = cards.length > 0
      return {
        id: def.id,
        label: def.label,
        statusLabel: active ? `${cards.length} 层` : '待触发',
        summary: topCard ? `${topCard.title}：${topCard.summary}` : def.emptySummary,
        detailLines: cards.slice(0, 3).map(card => `${card.label} · ${card.detail}`),
        active,
        toneClass: active ? def.activeToneClass : 'text-muted',
        shellClass: active ? def.activeShellClass : 'border-accent/10 bg-bg/10'
      }
    })
  )
  const getPreferredRegionSelectionId = () =>
    regionMapStore.regionSummaries.find(region => region.id === regionMapStore.currentWeeklyFocus.focusedRegionId && region.unlocked)?.id
    ?? regionMapStore.regionSummaries.find(region => region.unlocked)?.id
    ?? regionMapStore.regionSummaries[0]?.id
    ?? null
  const currentSelectedRegionId = computed<RegionId | null>(() => selectedRegionId.value ?? getPreferredRegionSelectionId())
  const selectedRegionFilterLabel = computed(() => {
    const regionId = currentSelectedRegionId.value
    return regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? '未选定区域'
  })
  const compactSummaryCards = computed(() => [
    { label: '已解锁区域', value: `${regionMapStore.unlockedRegionCount}/${regionMapStore.regionDefs.length}`, toneClass: 'text-accent' },
    { label: '运行中远征', value: regionMapStore.hasActiveExpedition ? '进行中' : '无', toneClass: regionMapStore.hasActiveExpedition ? 'text-success' : 'text-muted' },
    { label: '本周焦点', value: currentFocusLabel.value, toneClass: 'text-accent' },
    { label: '资源家族', value: `${regionMapStore.resourceFamilyDefs.length} 组`, toneClass: 'text-muted' }
  ])
  const visibleRegionSummaries = computed(() => {
    const regionId = currentSelectedRegionId.value
    return regionId ? regionMapStore.regionSummaries.filter(region => region.id === regionId) : regionMapStore.regionSummaries
  })
  const latestJourneyHistoryEntryId = computed(() => regionMapStore.settlementState.journeyHistory[0]?.id ?? null)
  const journeyHistoryOverflowEntries = computed(() => {
    const latestEntryId = latestJourneyHistoryEntryId.value
    return latestEntryId
      ? regionMapStore.journeyHistory.filter(entry => entry.id !== latestEntryId)
      : regionMapStore.journeyHistory
  })
  const hasMoreJourneyHistoryEntries = computed(() => journeyHistoryOverflowEntries.value.length > 2)
  const visibleJourneyHistoryEntries = computed(() =>
    mobileHistoryExpanded.value || !hasMoreJourneyHistoryEntries.value
      ? journeyHistoryOverflowEntries.value
      : journeyHistoryOverflowEntries.value.slice(0, 2)
  )
  const mobileHistoryCollapsedSummary = computed(() =>
    journeyHistoryOverflowEntries.value.length === 1
      ? '另有 1 条更早远征记录，按需展开回看。'
      : `另有 ${journeyHistoryOverflowEntries.value.length} 条更早远征记录，按需展开回看。`
  )
  const hasResourceLedgerEntries = computed(() => regionMapStore.resourceLedgerEntries.length > 0)
  const visibleJourneyCraftingEntries = computed(() => {
    const regionId = currentSelectedRegionId.value
    return regionMapStore.journeyCraftingEntries.filter(entry => (!regionId || entry.regionId === regionId) && (entry.unlocked || entry.crafted))
  })
  const visibleJourneyAwakeningEntries = computed(() => {
    const regionId = currentSelectedRegionId.value
    return regionMapStore.journeyAwakeningEntries.filter(entry => !regionId || entry.regionId === regionId)
  })
  const visibleJourneyCampModuleEntries = computed(() => {
    const regionId = currentSelectedRegionId.value
    return regionMapStore.journeyCampModuleEntries.filter(entry => !regionId || entry.regionId === regionId)
  })
  const visibleJourneyRoutePermitEntries = computed(() => {
    const regionId = currentSelectedRegionId.value
    return regionMapStore.journeyRoutePermitEntries.filter(entry => !regionId || entry.regionId === regionId)
  })
  const lockedRegionUnlockGuides = computed(() =>
    regionMapStore.regionDefs.map(region => {
      const progress = regionMapStore.getRegionUnlockProgress(region.id)
      return {
        ...region,
        ready: progress.ready,
        summary: progress.summary
      }
    })
  )
  const actionToneClass = computed(() =>
    actionTone.value === 'danger'
      ? 'text-danger'
      : actionTone.value === 'accent'
        ? 'text-accent'
        : 'text-success'
  )
  const settlementToneClass = computed(() =>
    settlementDialog.value?.tone === 'danger'
      ? 'border-danger/30'
      : settlementDialog.value?.tone === 'accent'
        ? 'border-accent/30'
        : 'border-success/30'
  )
  const expeditionSettlementDialog = computed(() =>
    settlementDialog.value?.kind === 'expedition' ? settlementDialog.value : null
  )
  const expeditionApproachOptions: Array<{ value: RegionExpeditionApproach; label: string; description: string }> = [
    { value: 'steady', label: '稳健推进', description: '默认节奏，状态均衡，适合首次摸图或稳定推进。' },
    { value: 'scout', label: '侦察优先', description: '更容易保持视野与控伤，但负重和爆发略弱。' },
    { value: 'greedy', label: '激进搜刮', description: '更快积累发现与负重，但风险和损耗都更高。' }
  ]
  const expeditionRetreatRuleOptions: Array<{ value: RegionExpeditionRetreatRule; label: string; description: string }> = [
    { value: 'balanced', label: '平衡推进', description: '手动判断什么时候撤退或收束。' },
    { value: 'low_hp', label: '低血撤离', description: '生命线过低时自动撤退，适合保守推进。' },
    { value: 'pack_full', label: '满载撤离', description: '负重逼近上限时自动带着战利品撤出。' },
    { value: 'after_camp', label: '扎营后收束', description: '打一轮、扎一次营，再带着记录返程。' }
  ]
  const currentApproachDescription = computed(
    () => expeditionApproachOptions.find(entry => entry.value === selectedApproach.value)?.description ?? ''
  )
  const currentRetreatRuleDescription = computed(
    () => expeditionRetreatRuleOptions.find(entry => entry.value === selectedRetreatRule.value)?.description ?? ''
  )
  const syncCompactViewportMode = () => {
    isCompactMobile.value = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  }
  const scrollAnchorIntoView = async (anchor: HTMLElement | null) => {
    if (!anchor) return
    await nextTick()
    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    anchor.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    })
  }
  const revealRegionSelection = (regionId: RegionId, routeId: string | null = null) => {
    selectedRegionId.value = regionId
    compactRegionSectionState.value = {
      ...compactRegionSectionState.value,
      [regionId]: true
    }
    if (routeId) {
      compactRouteDetailState.value = {
        ...compactRouteDetailState.value,
        [routeId]: true
      }
    }
  }
  const getDefaultMobileRegionId = () => currentSelectedRegionId.value ?? getPreferredRegionSelectionId()
  const handleSelectRegionFilter = (regionId: RegionId) => {
    setRegionMapTab('map')
    if (isCompactMobile.value) {
      revealRegionSelection(regionId)
      return
    }
    selectedRegionId.value = regionId
  }
  const toggleCompactRegionSection = (regionId: RegionId) => {
    compactRegionSectionState.value = {
      ...compactRegionSectionState.value,
      [regionId]: !compactRegionSectionState.value[regionId]
    }
  }
  const isCompactRegionSectionOpen = (regionId: RegionId) => Boolean(compactRegionSectionState.value[regionId])
  const shouldRenderRegionDetail = (regionId: RegionId) => !isCompactMobile.value || currentSelectedRegionId.value === regionId
  const toggleCompactRouteDetails = (routeId: string) => {
    compactRouteDetailState.value = {
      ...compactRouteDetailState.value,
      [routeId]: !compactRouteDetailState.value[routeId]
    }
  }
  const isCompactRouteDetailsOpen = (routeId: string) => Boolean(compactRouteDetailState.value[routeId])
  const scrollCompactRegionRailIntoView = async () => {
    if (!isCompactMobile.value || !currentSelectedRegionId.value || typeof document === 'undefined') return
    await nextTick()
    const rail = document.querySelector(`[data-testid="region-map-rail-${currentSelectedRegionId.value}"]`) as HTMLElement | null
    if (!rail) return
    const target =
      (rail.querySelector('.region-exploration-tree__node--current') as HTMLElement | null) ??
      (rail.querySelector('[data-testid^="region-tree-node-route:"]') as HTMLElement | null)
    if (!target) return
    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    const nextLeft = Math.max(0, target.offsetLeft - (rail.clientWidth - target.clientWidth) / 2)
    rail.scrollTo({
      left: nextLeft,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    })
  }
  const scrollToResourceLedger = async () => {
    setRegionMapTab('resource')
    await scrollAnchorIntoView(resourceLedgerAnchor.value)
  }
  const getApproachLabel = (approach: RegionExpeditionApproach) =>
    expeditionApproachOptions.find(entry => entry.value === approach)?.label ?? '稳健推进'
  const getRetreatRuleLabel = (retreatRule: RegionExpeditionRetreatRule) =>
    expeditionRetreatRuleOptions.find(entry => entry.value === retreatRule)?.label ?? '平衡推进'
  const currentSession = computed<any>(() => regionMapStore.sessionState.activeSession)
  const currentSessionNodeChoices = computed<any[]>(() => regionMapStore.sessionState.currentExpeditionNodeChoices)
  const selectedJourneyAftermathId = ref<string | null>(null)
  const currentSessionApproachLabel = computed(() =>
    currentSession.value ? getApproachLabel(currentSession.value.approach) : '稳健推进'
  )
  const currentSessionRetreatLabel = computed(() =>
    currentSession.value ? getRetreatRuleLabel(currentSession.value.retreatRule) : '平衡推进'
  )
  const currentSessionShortcutSummary = computed<any>(() =>
    currentSession.value?.routeId ? getRouteShortcutSummary(currentSession.value.routeId) : null
  )
  const currentSessionNodeHeadline = computed(() => {
    const session = currentSession.value
    return session?.nodeHistory[session.nodeHistory.length - 1]?.label ?? '出发营地'
  })
  const getWeatherLabel = (weather: RegionExpeditionWeather) =>
    weather === 'storm' ? '风暴' : weather === 'fog' ? '浓雾' : weather === 'wind' ? '劲风' : '晴稳'
  const getCarryCategoryLabel = (category: RegionExpeditionCarryItemCategory) =>
    category === 'clue' ? '线索' : category === 'refined' ? '精炼' : category === 'supply' ? '补给' : '资源'
  const formatCarryManifest = (carryItems: RegionExpeditionCarryItem[], limit = 4) =>
    carryItems
      .slice(0, limit)
      .map(item => `${item.label} x${item.quantity}（${getCarryCategoryLabel(item.category)} / 负重 ${item.burden}）`)
      .join(' / ')
  const currentSessionEncounterTrail = computed<RegionExpeditionEncounterMemory[]>(() =>
    currentSession.value ? [...currentSession.value.encounterMemory].slice(-4).reverse() : []
  )
  const getArchiveJourneyLines = (entry: RegionExpeditionArchiveEntry) => {
    const journalLines = entry.journal
      .map(logEntry => `${logEntry.step > 0 ? `第 ${logEntry.step} 节点` : '出发'} · ${logEntry.title}：${logEntry.summary}`)
      .slice(-6)

    return journalLines.length > 0 ? journalLines : getExpeditionSettlementBuckets(entry.summaryLines).journeyLines.slice(0, 4)
  }

  const getArchiveAftermathSummary = (entry: RegionExpeditionArchiveEntry) => {
    const buckets = getExpeditionSettlementBuckets(entry.summaryLines)
    const handoff = getRegionHandoffSummary(entry.regionId)
    const handoffBoard = buildJourneyHandoffBoard(entry.regionId)
    const actions = buildSettlementActionPanels(entry.regionId)
    const carryLine = entry.carryItems.length > 0 ? `携带清单：${formatCarryManifest(entry.carryItems, 4)}` : ''
    const lastBossOutcomeDayTag = regionMapStore.lastBossOutcome.resolvedDayTag || ''
    const entryDayTag = entry.endedAtDayTag || entry.startedAtDayTag || ''
    const extraAftermathLines =
      entry.mode === 'boss' &&
      regionMapStore.lastBossOutcome.regionId === entry.regionId &&
      regionMapStore.lastBossOutcome.summary &&
      lastBossOutcomeDayTag === entryDayTag
        ? [regionMapStore.lastBossOutcome.summary]
        : []

    return {
      entry,
      regionName: getRegionName(entry.regionId),
      journeyLines: getArchiveJourneyLines(entry),
      rewardLines: [...new Set([carryLine, ...buckets.rewardLines].filter(Boolean))].slice(0, 4),
      aftermathLines: [
        ...extraAftermathLines,
        ...buckets.aftermathLines,
        ...(actions.length > 0 ? [`已激活系统：${actions.map(action => action.label).join(' / ')}`] : []),
        ...(handoffBoard?.whyNowLines.slice(0, 2) ?? []),
        `后续承接：${handoff.headline}`,
        ...handoff.detailLines.slice(0, 2)
      ]
        .filter(Boolean)
        .slice(0, 5),
      handoffBoard,
      actions,
      toneClass:
        entry.outcome === 'failure'
          ? 'text-danger'
          : entry.outcome === 'retreated'
            ? 'text-accent'
            : 'text-success',
      tone:
        entry.outcome === 'failure'
          ? ('danger' as const)
          : entry.outcome === 'retreated'
            ? ('accent' as const)
            : ('success' as const)
    }
  }
  const isJourneyActionProcessed = (entryId: string, panelKey: PanelKey) => regionMapStore.isJourneyActionProcessed(entryId, panelKey)
  const markJourneyActionProcessed = (entryId: string, panelKey: PanelKey) => {
    regionMapStore.markJourneyActionProcessed(entryId, panelKey)
  }
  const getJourneyActionStatus = (
    entryId: string,
    panelKey: PanelKey,
    statusLabel: string,
    statusToneClass: string
  ) =>
    isJourneyActionProcessed(entryId, panelKey)
      ? { statusLabel: '已处理', statusToneClass: 'text-success' }
      : { statusLabel, statusToneClass }
  const getJourneyActionTagMeta = (entryId: string, panelKey: PanelKey) =>
    isJourneyActionProcessed(entryId, panelKey)
      ? {
          labelPrefix: '已处理',
          className: 'border-success/20 text-success bg-success/5'
        }
      : {
          labelPrefix: '已激活',
          className: 'border-accent/20 text-accent/80'
        }
  const getJourneyActionButtonMeta = (entryId: string, panelKey: PanelKey, label: string) =>
    isJourneyActionProcessed(entryId, panelKey)
      ? {
          label: `已处理 · ${label}`,
          className: 'border-success/20 text-success bg-success/5 hover:bg-success/10'
        }
      : {
          label: `去${label}`,
          className: 'border-accent/20 text-accent hover:bg-accent/5'
        }
  const latestJourneyAftermathSummary = computed(() => {
    const entry = regionMapStore.settlementState.journeyHistory[0] ?? null
    return entry ? getArchiveAftermathSummary(entry) : null
  })
  const journeyTermPrimerCards = [
    { term: '看清进度', summary: '表示你对这个区域知道了多少；越高，路线说明、风险和细节越清楚。' },
    { term: '地图摸清', summary: '表示这片区域整体被踏勘到什么程度；越高，地图节点和路线信息越完整。' },
    { term: '熟路', summary: '同一路线走多了会更顺，后续可能少走几段、开局更稳。' },
    { term: '回城办事单', summary: '就是最近一次回城后最值得先去处理的承接清单。' }
  ] as const
  const shouldShowJourneyTermPrimer = computed(() => isCompactMobile.value && !journeyTermPrimerDismissed.value)
  const dismissJourneyTermPrimer = () => {
    journeyTermPrimerDismissed.value = true
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('taoyuan_region_map_term_primer_seen_v1', '1')
    }
  }
  const selectedJourneyAftermathEntry = computed(() => {
    if (selectedJourneyAftermathId.value) {
      const matched = journeyHistoryOverflowEntries.value.find(entry => entry.id === selectedJourneyAftermathId.value) ?? null
      if (matched) return matched
    }
    return journeyHistoryOverflowEntries.value[0] ?? null
  })
  const selectedJourneyAftermathSummary = computed(() => {
    const entry = selectedJourneyAftermathEntry.value
    return entry ? getArchiveAftermathSummary(entry) : null
  })
  const pinnedJourneyAftermathSummary = computed(() => (selectedJourneyAftermathPinned.value ? selectedJourneyAftermathSummary.value : null))
  const currentSessionRegionLabel = computed(() =>
    currentSession.value ? getRegionName(currentSession.value.regionId) : '未指定区域'
  )
  const currentSessionStatusLabel = computed(() => {
    if (!currentSession.value) return '无'
    if (currentSession.value.campState) return '前线营地'
    return currentSession.value.status === 'ongoing'
      ? '推进中'
      : currentSession.value.status === 'ready_to_settle'
        ? '待收束'
        : currentSession.value.status === 'retreated'
          ? '已撤退'
          : currentSession.value.status === 'failure'
            ? '已失利'
            : '已完成'
  })
  const primaryJourneyActionCard = computed<PrimaryJourneyActionCard>(() => {
    const session = currentSession.value
    if (session) {
      const nextChoiceSummary =
        session.pendingEncounter
          ? `先处理「${session.pendingEncounter.title}」再决定下一段。`
          : session.campState
            ? '你已经扎营，先在营地做完这一轮整备。'
            : currentSessionNodeChoices.value.length > 0
              ? `下一步：${currentSessionNodeChoices.value.slice(0, 2).map(choice => choice.label).join(' / ')}`
              : `当前状态：${currentSessionStatusLabel.value}`

      return {
        kind: 'session',
        title: `继续：${session.targetName}`,
        summary:
          session.status === 'ready_to_settle'
            ? '这一趟已经可以回城收束，先把旅程结果带回去消化。'
            : `当前推进到「${currentSessionNodeHeadline.value}」，最适合直接续上这趟远征。`,
        detailLines: [
          `${currentSessionRegionLabel.value} / ${currentSessionStatusLabel.value}`,
          nextChoiceSummary,
          currentSessionSignalLines.value[0] ?? ''
        ].filter(Boolean),
        ctaLabel:
          session.pendingEncounter
            ? '处理当前遭遇'
            : session.campState
              ? '打开前线营地'
              : session.status === 'ready_to_settle'
                ? '前往收束'
                : '继续这趟远征',
        statusLabel: session.status === 'ready_to_settle' ? '可回城' : '进行中',
        statusToneClass: session.status === 'ready_to_settle' ? 'text-success' : 'text-accent',
        regionId: session.regionId,
        routeId: session.routeId,
        panelKey: null
      }
    }

    const focusedRegionId = regionMapStore.currentWeeklyFocus.focusedRegionId
    const focusedRegion = focusedRegionId
      ? regionMapStore.regionSummaries.find(region => region.id === focusedRegionId && region.unlocked) ?? null
      : null

    if (focusedRegion) {
      const preferredRoute = getPreferredFocusRoute(focusedRegion.id)
      const handoffSummary = getRegionHandoffSummary(focusedRegion.id)
      const routeReady = preferredRoute ? canRunRoute(preferredRoute.id) : false
      const routeBlockedReason = preferredRoute ? getRouteDisabledReason(preferredRoute.id) : ''
      const routeSummary =
        preferredRoute && routeReady
          ? `推荐路线：${preferredRoute.name} · ${getRouteTypeLabel(preferredRoute.nodeType)}`
          : preferredRoute
            ? `当前主线：${preferredRoute.name}`
            : `区域主题：${focusedRegion.themeHint}`

      return {
        kind: 'focus',
        title: routeReady && preferredRoute ? `先看 ${focusedRegion.name} · ${preferredRoute.name}` : `先看本周焦点：${focusedRegion.name}`,
        summary:
          routeReady && preferredRoute
            ? `本周先压「${preferredRoute.name}」，最容易把这片区域的推进和回城承接接起来。`
            : `本周焦点仍在 ${focusedRegion.name}，先展开区域，把路线、传闻和首领前置看清。`,
        detailLines: [
          routeSummary,
          routeReady
            ? `回城去向：${handoffSummary.headline}`
            : routeBlockedReason
              ? `当前阻塞：${routeBlockedReason}`
              : `区域承接：${handoffSummary.headline}`,
          preferredRoute?.handoffHint ?? preferredRoute?.encounterHint ?? ''
        ].filter(Boolean),
        ctaLabel: routeReady ? '查看推荐路线' : '查看焦点区域',
        statusLabel: routeReady ? '本周焦点' : '先补前置',
        statusToneClass: routeReady ? 'text-success' : 'text-accent',
        regionId: focusedRegion.id,
        routeId: preferredRoute?.id ?? null,
        panelKey: null
      }
    }

    const latestAftermath = latestJourneyAftermathSummary.value
    if (latestAftermath) {
      const handoffActionCard =
        latestAftermath.handoffBoard?.actionCards.find((action: any) => !isJourneyActionProcessed(latestAftermath.entry.id, action.key)) ?? null
      const fallbackAction =
        latestAftermath.actions.find((action: any) => !isJourneyActionProcessed(latestAftermath.entry.id, action.key)) ?? null
      const nextAction = handoffActionCard ?? fallbackAction

      if (!nextAction) {
        return {
          kind: 'fallback',
          title: `${latestAftermath.entry.targetName} 已收尾`,
          summary: '这趟回城办事单已经清完了，接下来可以继续本周焦点，或者直接准备下一次出发。',
          detailLines: [
            `${latestAftermath.regionName} / ${getArchiveOutcomeLabel(latestAftermath.entry.outcome)}`,
            latestAftermath.rewardLines[0] ?? latestAftermath.aftermathLines[0] ?? ''
          ].filter(Boolean),
          ctaLabel: '查看区域入口',
          statusLabel: '已收尾',
          statusToneClass: 'text-success',
          regionId: null,
          routeId: null,
          panelKey: null
        }
      }

      return {
        kind: 'aftermath',
        title: `先处理：${latestAftermath.entry.targetName}`,
        summary: `这趟回城最适合先去${nextAction.label}，把收获立刻转成后续收益。`,
        detailLines: [
          `${latestAftermath.regionName} / ${getArchiveOutcomeLabel(latestAftermath.entry.outcome)}`,
          handoffActionCard?.reason
            ? `为什么现在去：${handoffActionCard.reason}`
            : latestAftermath.aftermathLines[0] ?? latestAftermath.rewardLines[0] ?? ''
        ].filter(Boolean),
        ctaLabel: `去${nextAction.label}`,
        statusLabel: '待处理回城',
        statusToneClass: latestAftermath.toneClass,
        regionId: latestAftermath.entry.regionId,
        routeId: null,
        panelKey: nextAction.key
      }
    }

    return {
      kind: 'fallback',
      title: '先从焦点区域开始规划',
      summary: '当前没有进行中的远征，也没有新的回城办事单，先从已开放区域里挑一张图展开。',
      detailLines: [`已开放 ${regionMapStore.unlockedRegionCount}/${regionMapStore.regionDefs.length} 区`, `当前主题周：${currentThemeWeekLabel.value}`],
      ctaLabel: '查看区域入口',
      statusLabel: '等待出发',
      statusToneClass: 'text-muted',
      regionId: null,
      routeId: null,
      panelKey: null
    }
  })
  const hasPendingLatestAftermathAction = computed(() => {
    const latest = latestJourneyAftermathSummary.value
    if (!latest) return false
    const pendingKeys = [
      ...(latest.handoffBoard?.actionCards.map((action: any) => action.key) ?? []),
      ...latest.actions.map((action: any) => action.key)
    ]
    return [...new Set(pendingKeys)].some(panelKey => !isJourneyActionProcessed(latest.entry.id, panelKey))
  })
  const regionMapTabs = computed<Array<{ id: RegionMapTabId; label: string; summary: string }>>(() => [
    {
      id: 'today',
      label: '今日行动',
      summary: currentSession.value
        ? `推进 ${currentSession.value.targetName}`
        : hasPendingLatestAftermathAction.value
          ? '先处理回城事项'
          : primaryJourneyActionCard.value.statusLabel
    },
    {
      id: 'map',
      label: '地图路线',
      summary: selectedRegionFilterLabel.value
    },
    {
      id: 'aftermath',
      label: '旅后处理',
      summary: latestJourneyAftermathSummary.value
        ? latestJourneyAftermathSummary.value.entry.targetName
        : `${journeyHistoryOverflowEntries.value.length} 条记录`
    },
    {
      id: 'resource',
      label: '资源整备',
      summary: hasResourceLedgerEntries.value
        ? `${regionMapStore.resourceLedgerEntries.length} 组资源`
        : '暂无库存'
    }
  ])
  function setRegionMapTab(tabId: RegionMapTabId) {
    activeRegionMapTab.value = tabId
    if (tabId === 'aftermath') {
      mobileLatestAftermathExpanded.value = hasPendingLatestAftermathAction.value
    }
    if (tabId === 'resource' && isCompactMobile.value) {
      mobileLedgerExpanded.value = true
    }
  }
  async function openAftermathTab() {
    setRegionMapTab('aftermath')
    if (latestJourneyAftermathSummary.value) {
      selectedJourneyAftermathId.value = latestJourneyAftermathSummary.value.entry.id
    }
    await scrollAnchorIntoView(latestAftermathAnchor.value)
  }
  watch(
    () => latestJourneyAftermathSummary.value?.entry.id ?? null,
    () => {
      mobileLatestAftermathExpanded.value = hasPendingLatestAftermathAction.value
    },
    { immediate: true }
  )
  const mobileJourneyFlowCurrentStep = computed<MobileJourneyFlowStepId>(() => {
    if (currentSession.value) return 'session'
    if (hasPendingLatestAftermathAction.value) return 'aftermath'
    if (currentSelectedRegionId.value) {
      return mobilePrepExpanded.value ? 'prep' : 'route'
    }
    return 'region'
  })
  const mobileJourneyFlowSteps = computed(() => {
    const stepOrder: MobileJourneyFlowStepId[] = ['region', 'route', 'prep', 'session', 'aftermath']
    const currentIndex = stepOrder.indexOf(mobileJourneyFlowCurrentStep.value)
    return [
      {
        id: 'region' as const,
        label: '选区',
        summary: selectedRegionFilterLabel.value
      },
      {
        id: 'route' as const,
        label: '看路',
        summary: currentSession.value ? currentSessionNodeHeadline.value : '先看用途和风险'
      },
      {
        id: 'prep' as const,
        label: '出发',
        summary: `${getApproachLabel(selectedApproach.value)} / ${getRetreatRuleLabel(selectedRetreatRule.value)}`
      },
      {
        id: 'session' as const,
        label: '推进',
        summary: currentSession.value ? currentSessionStatusLabel.value : '没有进行中远征'
      },
      {
        id: 'aftermath' as const,
        label: '回城',
        summary: hasPendingLatestAftermathAction.value ? '先处理回城办事单' : '暂无待处理回城'
      }
    ].map((step, index) => ({
      ...step,
      active: step.id === mobileJourneyFlowCurrentStep.value,
      done: currentIndex > index,
      enabled:
        step.id === 'region'
        || (step.id === 'route' && Boolean(getDefaultMobileRegionId()))
        || (step.id === 'prep' && Boolean(getDefaultMobileRegionId()))
        || (step.id === 'session' && Boolean(currentSession.value))
        || (step.id === 'aftermath' && Boolean(latestJourneyAftermathSummary.value))
    }))
  })
  const handleMobileFlowStep = async (stepId: MobileJourneyFlowStepId) => {
    if (stepId === 'region') {
      setRegionMapTab('map')
      const regionId = getDefaultMobileRegionId()
      if (regionId) {
        revealRegionSelection(regionId)
      }
      await scrollAnchorIntoView(regionListAnchor.value)
      return
    }

    if (stepId === 'route' || stepId === 'prep') {
      setRegionMapTab('map')
      const regionId = getDefaultMobileRegionId()
      if (!regionId) return
      revealRegionSelection(regionId)
      if (stepId === 'prep') {
        mobilePrepExpanded.value = true
      }
      await scrollAnchorIntoView(regionListAnchor.value)
      return
    }

    if (stepId === 'session' && currentSession.value) {
      setRegionMapTab('today')
      await scrollAnchorIntoView(stagePanelAnchor.value)
      return
    }

    if (stepId === 'aftermath' && latestJourneyAftermathSummary.value) {
      await openAftermathTab()
    }
  }

  onMounted(() => {
    syncCompactViewportMode()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncCompactViewportMode)
      journeyTermPrimerDismissed.value = window.localStorage.getItem('taoyuan_region_map_term_primer_seen_v1') === '1'
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', syncCompactViewportMode)
    }
  })

  watch(
    [isCompactMobile, selectedRegionId, () => currentSession.value?.sessionId, () => currentSession.value?.progressStep],
    () => {
      void scrollCompactRegionRailIntoView()
    }
  )

  const setActionSummary = (message: string, tone: 'success' | 'danger' | 'accent' = 'success') => {
    lastActionSummary.value = message
    actionTone.value = tone
  }

  type RegionActionTimeResult = { passedOut?: boolean; message?: string }
  const handleRegionActionEndDay = (result: { timeResult?: RegionActionTimeResult }) => {
    if (!result.timeResult?.passedOut) return
    handleEndDay()
  }

  const openSettlementDialog = (title: string, lines: string[], tone: 'success' | 'danger' | 'accent' = 'success') => {
    settlementDialog.value = {
      kind: 'simple',
      title,
      lines: lines.filter(Boolean),
      tone
    }
  }

  function buildSettlementActionPanels(regionId: RegionId | null): SettlementDialogAction[] {
    if (!regionId) return [] as SettlementDialogAction[]
    const region = regionMapStore.regionDefs.find(entry => entry.id === regionId)
    if (!region) return [] as SettlementDialogAction[]
    return getLinkedPanels(region.linkedSystems).slice(0, 6)
  }

  function getJourneyAdjustedStaminaCost(baseCost: number, staminaCostReduction: number) {
    return Math.max(1, Math.floor(Math.max(1, baseCost) * (1 - Math.min(0.45, Math.max(0, staminaCostReduction)))))
  }

  function getRouteBuildAdvice(route: RegionRouteDef): RouteBuildAdvice | null {
    const snapshot = regionMapStore.getRouteJourneyBuildSnapshot(route.id)
    if (!snapshot) return null
    return {
      adjustedStaminaCost: getJourneyAdjustedStaminaCost(route.staminaCost, snapshot.outcome.staminaCostReduction),
      buildScore: snapshot.buildScore,
      summaryLines: snapshot.summaryLines.slice(0, 2),
      missingLine: snapshot.missingStats[0] ?? '',
      focusLine: route.requiredStats.focusLines[0] ?? ''
    }
  }

  function getJourneyRecipeStatus(recipeId: string) {
    return regionMapStore.canCraftJourneyRecipe(recipeId)
  }

  function canUnlockJourneyAwakening(entry: (typeof regionMapStore.journeyAwakeningEntries)[number]) {
    if (entry.unlocked) return { ok: false, reason: '该觉醒已激活。' }
    if (regionMapStore.getRegionCompletedRouteCount(entry.regionId) < entry.requiredRouteCompletions) {
      return { ok: false, reason: `需先完成 ${entry.requiredRouteCompletions} 条该区域路线。` }
    }
    if (regionMapStore.getFamilyResourceQuantity(entry.requiredFamilyId) < entry.requiredFamilyAmount) {
      return { ok: false, reason: `${entry.requiredFamilyAmount} 份${getResourceFamilyLabel(entry.requiredFamilyId)}不足。` }
    }
    return { ok: true, reason: '' }
  }

  function canUnlockJourneyCampModule(entry: (typeof regionMapStore.journeyCampModuleEntries)[number]) {
    if (entry.level > 0) return { ok: false, reason: '该模组已安装。' }
    if (regionMapStore.getFamilyResourceQuantity(entry.requiredFamilyId) < entry.requiredFamilyAmount) {
      return { ok: false, reason: `${entry.requiredFamilyAmount} 份${getResourceFamilyLabel(entry.requiredFamilyId)}不足。` }
    }
    return { ok: true, reason: '' }
  }

  function canUnlockJourneyRoutePermit(entry: (typeof regionMapStore.journeyRoutePermitEntries)[number]) {
    if (entry.level > 0) return { ok: false, reason: '该许可证已签发。' }
    const missingRoute = entry.requiredRouteIds.find(routeId => (regionMapStore.saveData.routeStates[routeId]?.completions ?? 0) <= 0)
    if (missingRoute) {
      return {
        ok: false,
        reason: `需先完成 ${getRegionRoutes(entry.regionId).find(route => route.id === missingRoute)?.name ?? missingRoute}。`
      }
    }
    if (regionMapStore.getFamilyResourceQuantity(entry.requiredFamilyId) < entry.requiredFamilyAmount) {
      return { ok: false, reason: `${entry.requiredFamilyAmount} 份${getResourceFamilyLabel(entry.requiredFamilyId)}不足。` }
    }
    return { ok: true, reason: '' }
  }

  function formatJourneyRecipeMaterials(recipe: (typeof regionMapStore.journeyCraftingEntries)[number]) {
    return recipe.requiredItems
      .map(item => {
        const itemName = getItemById(item.itemId)?.name ?? item.itemId
        return `${itemName} x${item.quantity}`
      })
      .join(' / ')
  }

  function getExpeditionSettlementBuckets(lines: string[]) {
    const journeyLines: string[] = []
    const rewardLines: string[] = []
    const aftermathLines: string[] = []

    for (const line of lines.filter(Boolean)) {
      if (
        line.includes('资源') ||
        line.includes('物品') ||
        line.includes('返还') ||
        line.includes('发放') ||
        line.includes('保留') ||
        line.includes('带回') ||
        line.includes('携带清单')
      ) {
        rewardLines.push(line)
        continue
      }

      if (
        line.includes('区域认知') ||
        line.includes('路线熟悉') ||
        line.includes('建议') ||
        line.includes('熟路') ||
        line.includes('捷径') ||
        line.includes('路标') ||
        line.includes('前线态势') ||
        line.includes('事件链留痕')
      ) {
        aftermathLines.push(line)
        continue
      }

      journeyLines.push(line)
    }

    return {
      journeyLines: journeyLines.length > 0 ? journeyLines : ['这趟旅程没有留下额外的阶段摘要。'],
      rewardLines: rewardLines.length > 0 ? rewardLines : ['本次没有形成可观的资源回流。'],
      aftermathLines: aftermathLines.length > 0 ? aftermathLines : ['暂时没有额外的旅后处理提示。']
    }
  }

  const openExpeditionSettlementDialog = (title: string, lines: string[], tone: 'success' | 'danger' | 'accent' = 'success') => {
    const latestJourney = regionMapStore.journeyHistory[0] ?? null
    const regionId = latestJourney?.regionId ?? null
    const buckets = getExpeditionSettlementBuckets(lines)
    const handoff = regionId ? getRegionHandoffSummary(regionId) : null
    const handoffBoard = buildJourneyHandoffBoard(regionId)
    const aftermathLines = [
      ...buckets.aftermathLines,
      ...(handoffBoard?.whyNowLines.slice(0, 2) ?? []),
      ...(handoff ? [`后续承接：${handoff.headline}`, ...handoff.detailLines.slice(0, 2)] : [])
    ].filter(Boolean)

    settlementDialog.value = {
      kind: 'expedition',
      title,
      lines: lines.filter(Boolean),
      tone,
      entryId: latestJourney?.id ?? null,
      journeyLines: buckets.journeyLines,
      rewardLines: buckets.rewardLines,
      aftermathLines: aftermathLines.length > 0 ? aftermathLines : ['暂时没有额外的旅后处理提示。'],
      handoffBoard,
      actions: buildSettlementActionPanels(regionId)
    }
  }

  const openArchiveAftermathDialog = (entry: RegionExpeditionArchiveEntry) => {
    const summary = getArchiveAftermathSummary(entry)
    settlementDialog.value = {
      kind: 'expedition',
      title: `旅后处理：${entry.targetName}`,
      lines: entry.summaryLines.filter(Boolean),
      tone: summary.tone,
      entryId: entry.id,
      journeyLines: summary.journeyLines,
      rewardLines: summary.rewardLines,
      aftermathLines: summary.aftermathLines,
      handoffBoard: summary.handoffBoard,
      actions: summary.actions
    }
  }

  const ensureWeeklyEventRuntime = () => {
    regionMapStore.refreshUnlocksFromProgress(currentDayTag.value)
    regionMapStore.ensureWeeklyEventRuntime(currentWeekId.value, regionMapStore.currentWeeklyFocus.focusedRegionId, currentDayTag.value)
    regionMapStore.ensureOpenWorldState(currentDayTag.value)
    regionMapStore.ensureFrontierWorldSignals(currentDayTag.value)
  }

  watch(
    [currentDayTag, currentWeekId, () => regionMapStore.currentWeeklyFocus.focusedRegionId],
    () => {
      ensureWeeklyEventRuntime()
    },
    { immediate: true }
  )

  watch(
    () => regionMapStore.currentWeeklyFocus.focusedRegionId,
    focusedRegionId => {
      if (focusedRegionId) {
        selectedRegionId.value = focusedRegionId
      }
    }
  )

  watch(
    () => journeyHistoryOverflowEntries.value.map(entry => entry.id),
    entryIds => {
      if (entryIds.length === 0) {
        selectedJourneyAftermathId.value = null
        selectedJourneyAftermathPinned.value = false
        return
      }

      if (selectedJourneyAftermathPinned.value && (!selectedJourneyAftermathId.value || !entryIds.includes(selectedJourneyAftermathId.value))) {
        selectedJourneyAftermathId.value = entryIds[0] ?? null
      }
    },
    { immediate: true }
  )

  function getUnlockSummary(regionId: RegionId) {
    return regionMapStore.getRegionUnlockProgress(regionId).summary
  }

  function getRegionName(regionId: RegionId) {
    return regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? regionId
  }

  function getResourceFamilyLabel(familyId: RegionalResourceFamilyId) {
    return regionMapStore.resourceFamilyDefs.find(entry => entry.id === familyId)?.label ?? familyId
  }

  const getKnowledgeTierLabel = (value: number, tiers: [string, string, string, string]) =>
    value >= 80 ? tiers[3] : value >= 55 ? tiers[2] : value >= 25 ? tiers[1] : tiers[0]

  const getRegionKnowledgeSummary = (regionId: RegionId) => {
    const state = regionMapStore.getRegionKnowledgeState(regionId)
    return {
      ...state,
      intelLabel: getKnowledgeTierLabel(state.intel, ['未知地带', '已有传闻', '情报成形', '了然于胸']),
      surveyLabel: getKnowledgeTierLabel(state.survey, ['迷雾未散', '略有踏勘', '道路渐明', '地图勘透']),
      familiarityLabel: getKnowledgeTierLabel(state.familiarity, ['初来乍到', '勉强认路', '往返熟悉', '熟路可循'])
    }
  }

  const getRouteKnowledgeSummary = (routeId: string) => {
    const state = regionMapStore.getRouteKnowledgeState(routeId)
    return {
      ...state,
      intelLabel: getKnowledgeTierLabel(state.intel, ['未摸清', '略知线索', '节点明确', '路况尽知']),
      familiarityLabel: getKnowledgeTierLabel(state.familiarity, ['陌生', '记住入口', '越走越熟', '熟路'])
    }
  }

  const getShortcutToneClass = (level: 'none' | 'marked' | 'shortcut' | 'mastered') =>
    level === 'mastered'
      ? 'text-success'
      : level === 'shortcut'
        ? 'text-accent'
        : level === 'marked'
          ? 'text-warning'
          : 'text-muted'

  const getRouteShortcutSummary = (routeId: string) => {
    const profile = regionMapStore.getRouteShortcutProfile(routeId)
    const benefitParts = [
      profile.stepReduction > 0 ? `少走 ${profile.stepReduction} 段` : '',
      profile.visibilityBonus > 0 ? `视野 +${profile.visibilityBonus}` : '',
      profile.dangerReduction > 0 ? `初始风险 -${profile.dangerReduction}` : '',
      profile.supplyBonus.rations > 0 ? `口粮 +${profile.supplyBonus.rations}` : '',
      profile.supplyBonus.utility > 0 ? `器具 +${profile.supplyBonus.utility}` : ''
    ].filter(Boolean)

    return {
      ...profile,
      toneClass: getShortcutToneClass(profile.level),
      headline:
        profile.level === 'mastered'
          ? '这条路已经真正走成熟路，后续远征能更快切进核心路段。'
          : profile.level === 'shortcut'
            ? '你已在沿线立下稳定捷径，再出发时能更快进入正线。'
            : profile.level === 'marked'
              ? '沿途路标逐渐清晰，虽然暂时还不能少走路，但已更容易稳住方向。'
              : '这条路仍较陌生，当前还没有形成稳定捷径。',
      benefitSummary: benefitParts.length > 0 ? `当前增益：${benefitParts.join(' · ')}` : '当前增益：暂无额外捷径收益。'
    }
  }

  const getRegionVariantSnapshot = (regionId: RegionId) =>
    regionMapStore.peekRegionVariantSnapshot(regionId)

  const getRegionRumorBoard = (regionId: RegionId) => regionMapStore.peekRumorBoardForRegion(regionId)

  const getAutoPatrolStatus = (routeId: string) => regionMapStore.peekAutoPatrolStatus(routeId)

  const getActiveCompanionContract = (routeId: string) =>
    regionMapStore.metaState.companionContracts.find(contract => contract.routeId === routeId && contract.status === 'active') ?? null

  const getCompanionContractCandidates = (routeId: string) => regionMapStore.getCompanionContractCandidates(routeId)

  const currentSessionIntroLines = computed(() => {
    const session = currentSession.value
    if (!session) return []

    const lines = [
      `策略：${getApproachLabel(session.approach)} / ${getRetreatRuleLabel(session.retreatRule)}`,
      `前线态势：准备 ${session.frontlinePrep} / 天气 ${getWeatherLabel(session.riskState.weather)} / 风险 ${session.danger}`,
      `补给：口粮 ${session.supplies.rations} / 药剂 ${session.supplies.medicine} / 器具 ${session.supplies.utility}`
    ]

    const activeContract = session.routeId ? getActiveCompanionContract(session.routeId) : null
    if (activeContract) {
      lines.push(`同行合同：${activeContract.npcName} / ${activeContract.relationshipStageLabel}`)
    }

    const rumorCount = getRegionRumorBoard(session.regionId).filter(entry => !entry.fulfilled).length
    if (rumorCount > 0) {
      lines.push(`本周传闻：当前仍有 ${rumorCount} 条区域传闻等待兑现。`)
    }

    const seasonalState = getRegionVariantSnapshot(session.regionId)
    if (
      seasonalState.activeVariantId &&
      (!session.routeId || seasonalState.affectedRouteIds.length === 0 || seasonalState.affectedRouteIds.includes(session.routeId))
    ) {
      lines.push(`季节变体：${seasonalState.activeVariantLabel}`)
    }

    return lines.slice(0, 4)
  })

  const currentSessionSignalLines = computed(() => {
    const session = currentSession.value
    if (!session) return []

    const lines: string[] = []
    const seasonalState = getRegionVariantSnapshot(session.regionId)
    if (
      seasonalState.activeVariantId &&
      (!session.routeId || seasonalState.affectedRouteIds.length === 0 || seasonalState.affectedRouteIds.includes(session.routeId))
    ) {
      lines.push(`季节变体：${seasonalState.activeVariantLabel} · ${seasonalState.summary}`)
    }

    const rumorEntries = getRegionRumorBoard(session.regionId).filter(entry => !entry.fulfilled)
    const activeAdvancedStateLabels = frontierMapAdvancedStates.value
      .filter(state => state.active)
      .map(state => state.label)
    if (environmentWindow.value.forage.active) {
      lines.push(`环境窗口：${environmentWindow.value.forage.routeHint}`)
    }
    if (activeAdvancedStateLabels.length > 0) {
      lines.push(`高级状态：${activeAdvancedStateLabels.join(' / ')}`)
    }
    if (rumorEntries.length > 0) {
      lines.push(`传闻未兑：${rumorEntries.slice(0, 2).map(entry => entry.title).join(' / ')}`)
    }

    if (session.routeId) {
      const autoPatrolStatus = getAutoPatrolStatus(session.routeId)
      if (autoPatrolStatus.mode === 'blocked' && autoPatrolStatus.blockedReason) {
        lines.push(`必须手动：${autoPatrolStatus.blockedReason}`)
      }
      const activeContract = getActiveCompanionContract(session.routeId)
      if (activeContract) {
        lines.push(`同行合同：${activeContract.npcName} · ${activeContract.summary}`)
      }
    }

    return lines.slice(0, 4)
  })

  const getRouteDispatchSignals = (route: RegionRouteDef): RouteDispatchSignal[] => {
    const signals: RouteDispatchSignal[] = []
    const autoPatrolStatus = getAutoPatrolStatus(route.id)
    const seasonalState = getRegionVariantSnapshot(route.regionId)
    const rumorCount = getRegionRumorBoard(route.regionId).filter(entry => !entry.fulfilled).length
    const activeContract = getActiveCompanionContract(route.id)

    if (
      seasonalState.activeVariantId &&
      (seasonalState.affectedRouteIds.length === 0 || seasonalState.affectedRouteIds.includes(route.id))
    ) {
      signals.push({
        label: seasonalState.activeVariantLabel,
        toneClass: 'text-warning',
        shellClass: 'border-warning/20 bg-warning/5'
      })
    }

    if (rumorCount > 0) {
      signals.push({
        label: `${rumorCount} 条传闻`,
        toneClass: 'text-accent',
        shellClass: 'border-accent/20 bg-accent/5'
      })
    }

    if (activeContract) {
      signals.push({
        label: `同行 ${activeContract.npcName}`,
        toneClass: 'text-success',
        shellClass: 'border-success/20 bg-success/5'
      })
    }

    if (environmentWindow.value.forage.active) {
      signals.push({
        label: environmentWindow.value.forage.label,
        toneClass: 'text-danger',
        shellClass: 'border-danger/20 bg-danger/5'
      })
    }

    const routeOverlaySignals = frontierWorldSignalCards.value.filter(card => card.routeIds.includes(route.id) && card.kind !== 'season')
    if (routeOverlaySignals[0]) {
      signals.push({
        label: routeOverlaySignals[0].label,
        toneClass: routeOverlaySignals[0].toneClass,
        shellClass: routeOverlaySignals[0].shellClass
      })
    }

    if (autoPatrolStatus.mode === 'ready') {
      signals.push({
        label: '熟路可巡行',
        toneClass: 'text-success',
        shellClass: 'border-success/20 bg-success/5'
      })
    } else if (autoPatrolStatus.mode === 'blocked') {
      signals.push({
        label: '必须手动',
        toneClass: 'text-warning',
        shellClass: 'border-warning/20 bg-warning/5'
      })
    } else {
      signals.push({
        label: '手动勘探',
        toneClass: 'text-muted',
        shellClass: 'border-accent/10 bg-bg/60'
      })
    }

    return signals.slice(0, 4)
  }

  const getRouteDispatchSummary = (route: RegionRouteDef) => {
    const autoPatrolStatus = getAutoPatrolStatus(route.id)
    if (autoPatrolStatus.mode === 'blocked' && autoPatrolStatus.blockedReason) {
      return `自动巡行被阻塞：${autoPatrolStatus.blockedReason}`
    }

    const activeContract = getActiveCompanionContract(route.id)
    if (activeContract) {
      return `同行合同：${activeContract.summary}`
    }

    const seasonalState = getRegionVariantSnapshot(route.regionId)
    if (
      seasonalState.activeVariantId &&
      (seasonalState.affectedRouteIds.length === 0 || seasonalState.affectedRouteIds.includes(route.id))
    ) {
      return `变体信号：${seasonalState.summary}`
    }

    if (route.handoffHint) return route.handoffHint
    if (route.encounterHint) return route.encounterHint
    return getRouteShortcutSummary(route.id).headline
  }

  const getRouteDecisionSummary = (route: RegionRouteDef) => {
    const preview = getRouteMapPreview(route)
    const shortcutSummary = getRouteShortcutSummary(route.id)
    const autoPatrolStatus = getAutoPatrolStatus(route.id)
    const resourceLabel = regionMapStore.resourceFamilyDefs.find(family => family.id === route.primaryResourceFamilyId)?.label ?? '区域资源'
    const linkedLabels = getLinkedPanels(route.linkedSystems)
      .slice(0, 2)
      .map(panel => panel.label)
      .join(' / ')

    const focusMeta =
      route.nodeType === 'elite'
        ? {
            label: '冲首领前置',
            toneClass: 'text-danger',
            headline: '这条线更适合先压风险、补前线准备，再决定要不要继续冲首领。'
          }
        : route.nodeType === 'handoff'
          ? {
              label: '冲回城承接',
              toneClass: 'text-success',
              headline: '这条线更适合把当前收益直接带回旧系统，快速形成闭环。'
            }
          : preview.stage === 'heard'
            ? {
                label: '先补情报',
                toneClass: 'text-warning',
                headline: '这条线当前更适合先把节点和路况看清，不适合一上来就压收益。'
              }
            : route.primaryResourceFamilyId === 'ancient_archive'
              ? {
                  label: '冲线索文书',
                  toneClass: 'text-accent',
                  headline: '适合优先补古迹残卷、路引和押运线索，把荒道推进接到任务板与瀚海。'
                }
              : route.primaryResourceFamilyId === 'ecology_specimen'
                ? {
                    label: '冲样本展示',
                    toneClass: 'text-success',
                    headline: '适合优先拿生态样本与观察记录，把泽地推进接到鱼塘和馆务。'
                  }
                : {
                    label: '冲高地战备',
                    toneClass: 'text-warning',
                    headline: '适合优先收高地资源和战备前置，把推进接到公会与建设线。'
                  }

    const riskMeta =
      route.nodeType === 'elite'
        ? { label: '高风险', toneClass: 'text-danger' }
        : route.nodeType === 'handoff'
          ? { label: '中风险', toneClass: 'text-warning' }
          : shortcutSummary.level === 'mastered'
            ? { label: '低风险', toneClass: 'text-success' }
            : { label: '稳步推进', toneClass: 'text-accent' }

    const modeMeta =
      autoPatrolStatus.mode === 'ready'
        ? { label: '熟路可巡行', toneClass: 'text-success' }
        : autoPatrolStatus.mode === 'blocked'
          ? { label: '必须手动', toneClass: 'text-warning' }
          : { label: '手动探索', toneClass: 'text-muted' }

    return {
      headline: focusMeta.headline,
      focusLabel: focusMeta.label,
      focusToneClass: focusMeta.toneClass,
      riskLabel: riskMeta.label,
      riskToneClass: riskMeta.toneClass,
      modeLabel: modeMeta.label,
      modeToneClass: modeMeta.toneClass,
      rewardLabel: resourceLabel,
      linkedSummary: linkedLabels
    }
  }

  function getRegionRoutes(regionId: RegionId) {
    return regionMapStore.routeDefs.filter(route => route.regionId === regionId)
  }

  const getRouteCompletionLabel = (routeId: string) => {
    const state = regionMapStore.saveData.routeStates[routeId]
    return `完成 ${state?.completions ?? 0} 次`
  }

  const ROUTE_NODE_TYPE_LABEL_MAP = {
    route: '主路线',
    event: '区域事件',
    elite: '精英线',
    handoff: '承接线'
  } as const

  const getRouteTypeLabel = (nodeType: keyof typeof ROUTE_NODE_TYPE_LABEL_MAP) => ROUTE_NODE_TYPE_LABEL_MAP[nodeType] ?? '路线'

  function isRouteUnlocked(routeId: string) {
    return regionMapStore.getRouteUnlockStatus(routeId).unlocked
  }

  const canRunRoute = (routeId: string) => regionMapStore.getRouteExpeditionStatus(routeId).available

  const shouldAutoRunRoute = (routeId: string) => getAutoPatrolStatus(routeId).mode === 'ready'

  const getRouteRunActionLabel = (routeId: string) =>
    shouldAutoRunRoute(routeId) ? '自动巡行' : getAutoPatrolStatus(routeId).mode === 'blocked' ? '手动探索' : '发起远征'

  const getRouteDisabledReason = (routeId: string) => {
    const routeStatus = regionMapStore.getRouteExpeditionStatus(routeId)
    return routeStatus.available ? '' : routeStatus.reason
  }

  const getVisibilityStageMeta = (stage: MapVisibilityStage) => ({
    label:
      stage === 'mastered'
        ? '熟路'
        : stage === 'surveyed'
          ? '已勘明'
          : stage === 'heard'
            ? '已听说'
            : '未知',
    toneClass:
      stage === 'mastered'
        ? 'text-success'
        : stage === 'surveyed'
          ? 'text-accent'
          : stage === 'heard'
            ? 'text-warning'
            : 'text-muted'
  })

  const getRegionFogMeta = (regionId: RegionId) => {
    const regionKnowledge = getRegionKnowledgeSummary(regionId)
    return {
      label:
        regionKnowledge.survey >= 80
          ? '迷雾勘透'
          : regionKnowledge.survey >= 55
            ? '道路渐明'
            : regionKnowledge.survey >= 25
              ? '略有踏勘'
              : '迷雾浓重',
      toneClass:
        regionKnowledge.survey >= 80
          ? 'text-success'
          : regionKnowledge.survey >= 55
            ? 'text-accent'
            : regionKnowledge.survey >= 25
              ? 'text-warning'
              : 'text-muted'
    }
  }

  const getRouteVisibilityStage = (route: RegionRouteDef): MapVisibilityStage => {
    return regionMapStore.getRouteNodeVisibilityStage(route.id)
  }

  const getBossVisibilityStage = (regionId: RegionId): MapVisibilityStage => regionMapStore.getBossNodeVisibilityStage(regionId)

  const getRouteLaneMeta = (route: RegionRouteDef) =>
    route.nodeType === 'elite'
      ? { label: '深层', toneClass: 'text-danger' }
      : route.nodeType === 'handoff'
        ? { label: '支线', toneClass: 'text-success' }
        : { label: '主线', toneClass: 'text-accent' }

  const getRouteMapPreview = (route: RegionRouteDef) => {
    const stage = getRouteVisibilityStage(route)
    const routeKnowledge = getRouteKnowledgeSummary(route.id)
    const shortcutSummary = getRouteShortcutSummary(route.id)
    const nodeState = regionMapStore.getRouteMapNodeState(route.id)
    const campState = regionMapStore.getCampSiteState(route.regionId, route.id, null)
    const stageMeta = getVisibilityStageMeta(stage)
    const laneMeta = getRouteLaneMeta(route)
    const visibleTitle = stage === 'unknown' ? `未明${laneMeta.label}` : route.name
    const visibleDescription =
      stage === 'mastered' || stage === 'surveyed'
        ? route.description
        : stage === 'heard'
          ? `${laneMeta.label}的风声已经传回，但具体风险和收益仍在迷雾里。`
          : '这里只能看到一团模糊路标，继续提升区域情报与勘明才能把节点形状真正掀开。'

    const detailLines =
      stage === 'mastered' || stage === 'surveyed'
        ? [
            `体力 ${route.staminaCost} / 耗时 ${route.timeCostHours}h`,
            `认知 ${routeKnowledge.intelLabel} / 熟悉 ${routeKnowledge.familiarityLabel}`,
            nodeState.visitCount > 0 ? `节点足迹：踏入 ${nodeState.visitCount} 次 / 勘位 ${nodeState.surveyCount} 次` : '',
            campState.visitCount > 0 ? `营地档案：标记 ${campState.markCount} / 侦察 ${campState.scoutCount} / 整理 ${campState.sortCount}` : '',
            shortcutSummary.level === 'none' ? '' : shortcutSummary.benefitSummary
          ].filter(Boolean)
        : stage === 'heard'
          ? [`节点定位：${laneMeta.label}`, `当前状态：${stageMeta.label}`, nodeState.visitCount > 0 ? `已留下 ${nodeState.visitCount} 次足迹。` : '']
          : ['继续完成主线、事件与区域探索，才能让节点从迷雾里浮出来。']

    return {
      stage,
      stageLabel: stageMeta.label,
      stageToneClass: stageMeta.toneClass,
      title: visibleTitle,
      description: visibleDescription,
      detailLines
    }
  }

  const getBossMapPreview = (regionId: RegionId) => {
    const boss = regionMapStore.bossDefs.find(entry => entry.regionId === regionId)
    const stage = getBossVisibilityStage(regionId)
    const stageMeta = getVisibilityStageMeta(stage)
    const prepSummary = getBossPrepSummary(regionId)
    const nodeState = regionMapStore.getBossMapNodeState(regionId)
    const campState = boss ? regionMapStore.getCampSiteState(regionId, null, boss.id) : null

    return {
      stage,
      bossId: boss?.id ?? '',
      bossName: boss?.name ?? '',
      stageLabel: stageMeta.label,
      stageToneClass: stageMeta.toneClass,
      title: stage === 'unknown' ? '深层终点' : boss?.name ?? '首领节点',
      description:
        stage === 'mastered' || stage === 'surveyed'
          ? boss?.description ?? '该区域首领尚未配置。'
          : stage === 'heard'
            ? '你已经知道这片区域存在深层终点，但仍需要把路线和战备再推进一层。'
            : '首领方向仍埋在迷雾最深处，至少先走通一条区域路线再来勘它。',
      detailLines:
        stage === 'mastered' || stage === 'surveyed'
          ? [
              ...prepSummary.detailLines.slice(0, 2),
              nodeState.visitCount > 0 ? `深层足迹：逼近 ${nodeState.visitCount} 次 / 勘位 ${nodeState.surveyCount} 次` : '',
              campState && campState.visitCount > 0 ? `营地档案：标记 ${campState.markCount} / 侦察 ${campState.scoutCount} / 休整 ${campState.restCount}` : ''
            ].filter(Boolean)
          : stage === 'heard'
            ? [`当前阶段：${prepSummary.headline}`]
            : ['先让主线浮出地形，再为首领方向腾出战备和勘明空间。']
    }
  }

  const getPreferredFocusRoute = (regionId: RegionId) => {
    const regionRoutes = getRegionRoutes(regionId)
    const highlightedRoutes = regionMapStore.currentWeeklyFocus.highlightedRouteIds
      .map(routeId => regionRoutes.find(route => route.id === routeId) ?? null)
      .filter((route): route is RegionRouteDef => Boolean(route))

    return (
      highlightedRoutes.find(route => canRunRoute(route.id)) ??
      highlightedRoutes.find(route => getRouteMapPreview(route).stage !== 'unknown') ??
      regionRoutes.find(route => canRunRoute(route.id)) ??
      regionRoutes.find(route => getRouteMapPreview(route).stage !== 'unknown') ??
      regionRoutes[0] ??
      null
    )
  }

  const getRegionMapNodes = (regionId: RegionId) => {
    const routeNodes: RegionMapBoardNode[] = getRegionRoutes(regionId)
      .filter(route => route.nodeType !== 'handoff')
      .map(route => {
        const preview = getRouteMapPreview(route)
        const laneMeta = getRouteLaneMeta(route)
        const canStart = preview.stage !== 'unknown' && canRunRoute(route.id)
        return {
          key: route.id,
          kind: 'route',
          regionId,
          routeId: route.id,
          laneLabel: laneMeta.label,
          laneToneClass: laneMeta.toneClass,
          title: preview.title,
          description: preview.description,
          detailLines: preview.detailLines,
          stageLabel: preview.stageLabel,
          stageToneClass: preview.stageToneClass,
          disabled: !canStart,
          disabledReason: preview.stage === 'unknown' ? '该节点仍被迷雾遮蔽。' : getRouteDisabledReason(route.id),
          actionLabel: canStart ? getRouteRunActionLabel(route.id) : preview.stage === 'unknown' ? '迷雾中' : '待解锁'
        }
      })

    const bossPreview = getBossMapPreview(regionId)
    const canStartBoss = bossPreview.stage !== 'unknown' && canChallengeBoss(regionId)
    const bossNode: RegionMapBoardNode = {
      key: `${regionId}-boss`,
      kind: 'boss',
      regionId,
      bossId: bossPreview.bossId,
      bossName: bossPreview.bossName,
      laneLabel: '首领',
      laneToneClass: 'text-danger',
      title: bossPreview.title,
      description: bossPreview.description,
      detailLines: bossPreview.detailLines,
      stageLabel: bossPreview.stageLabel,
      stageToneClass: bossPreview.stageToneClass,
      disabled: !canStartBoss,
      disabledReason: bossPreview.stage === 'unknown' ? '首领方向仍被迷雾覆盖。' : getBossDisabledReason(regionId),
      actionLabel: canStartBoss ? '发起首领' : bossPreview.stage === 'unknown' ? '迷雾中' : '待战备'
    }

    return [...routeNodes, bossNode]
  }

  const getSecondaryMapNodes = (regionId: RegionId) =>
    getRegionRoutes(regionId)
      .filter(route => route.nodeType === 'handoff')
      .map(route => {
        const preview = getRouteMapPreview(route)
        const canStart = preview.stage !== 'unknown' && canRunRoute(route.id)
        return {
          key: route.id,
          kind: 'route' as const,
          regionId,
          routeId: route.id,
          laneLabel: '支线',
          laneToneClass: 'text-success',
          title: preview.title,
          description: preview.description,
          detailLines: preview.detailLines,
          stageLabel: preview.stageLabel,
          stageToneClass: preview.stageToneClass,
          disabled: !canStart,
          disabledReason: preview.stage === 'unknown' ? '支线节点仍被迷雾遮蔽。' : getRouteDisabledReason(route.id),
          actionLabel: canStart ? getRouteRunActionLabel(route.id) : preview.stage === 'unknown' ? '迷雾中' : '待解锁'
        } satisfies RegionMapBoardNode
      })

  const getRegionMapBoardSummary = (regionId: RegionId) => {
    const nodes = [...getRegionMapNodes(regionId), ...getSecondaryMapNodes(regionId)]
    const visibleCount = nodes.filter(node => node.stageLabel !== '未知').length
    const surveyedCount = nodes.filter(node => node.stageLabel === '已勘明' || node.stageLabel === '熟路').length
    return {
      headline:
        currentSession.value?.regionId === regionId
          ? '当前远征正在这张路网里推进，可直接把已显形节点接进下一步。'
          : regionMapStore.currentWeeklyFocus.focusedRegionId === regionId
            ? '本周焦点正在优先照亮这片区域，适合把主线和支线一起规划。'
            : `当前已有 ${visibleCount}/${nodes.length} 个节点浮出迷雾。`,
      subhead: surveyedCount > 0 ? `已勘明 ${surveyedCount} 个节点` : '继续探索可解锁更多节点细节'
    }
  }

  const buildTreeNodeConnections = (
    nodes: RegionExplorationTreeNode[],
    links: RegionExplorationTreeLink[]
  ): RegionExplorationTreeBuild => {
    const linkedKeys = new globalThis.Map<string, Set<string>>()
    for (const node of nodes) linkedKeys.set(node.key, new Set(node.connectedNodeKeys))
    for (const link of links) {
      if (!linkedKeys.has(link.from)) linkedKeys.set(link.from, new Set())
      if (!linkedKeys.has(link.to)) linkedKeys.set(link.to, new Set())
      linkedKeys.get(link.from)?.add(link.to)
      linkedKeys.get(link.to)?.add(link.from)
    }
    return {
      nodes: nodes.map(node => ({
        ...node,
        connectedNodeKeys: [...(linkedKeys.get(node.key) ?? new Set<string>())]
      })),
      links
    }
  }

  const getTreeStatusFromStage = (stage: MapVisibilityStage, disabled = false): RegionExplorationTreeNode['status'] => {
    if (disabled && stage !== 'unknown') return 'locked'
    if (stage === 'mastered') return 'mastered'
    if (stage === 'surveyed') return 'available'
    if (stage === 'heard') return 'heard'
    return 'unknown'
  }

  const toTreeLinkedPanels = (panels: LinkedPanel[]) =>
    panels.map(panel => ({ key: panel.key, label: panel.label }))

  const getRegionExplorationTree = (regionId: RegionId): RegionExplorationTreeBuild => {
    const region = regionMapStore.regionDefs.find(entry => entry.id === regionId)
    const regionSummary = regionMapStore.regionSummaries.find(entry => entry.id === regionId)
    const rootKey = `root:${regionId}`
    const fogMeta = getRegionFogMeta(regionId)
    const knowledge = getRegionKnowledgeSummary(regionId)
    const primaryRoutes = getRegionRoutes(regionId).filter(route => route.nodeType !== 'handoff')
    const handoffRoutes = getRegionRoutes(regionId).filter(route => route.nodeType === 'handoff')
    const activeRouteId = currentSession.value?.regionId === regionId ? currentSession.value.routeId : null
    const activeBoss = currentSession.value?.regionId === regionId && currentSession.value.mode === 'boss'
    const preferredRoute = getPreferredFocusRoute(regionId)
    const nodes: RegionExplorationTreeNode[] = []
    const links: RegionExplorationTreeLink[] = []
    const regionLinkedSystems = region?.linkedSystems ?? []
    const getRegionalPanelLinks = (preferredSystems: RegionLinkedSystem[], fallbackSystems: RegionLinkedSystem[] = ['quest']) => {
      const systems = [
        ...preferredSystems.filter(system => regionLinkedSystems.includes(system)),
        ...fallbackSystems
      ]
      return toTreeLinkedPanels(getLinkedPanels([...new Set<RegionLinkedSystem>(systems)]))
    }

    nodes.push({
      key: rootKey,
      type: 'root',
      lane: 'root',
      regionId,
      parentNodeKey: null,
      connectedNodeKeys: [],
      x: 9,
      y: 50,
      title: region?.name ?? regionId,
      description: region?.description ?? '这片区域还没有完整档案。',
      stageLabel: regionSummary?.unlocked ? fogMeta.label : '未解锁',
      stageToneClass: regionSummary?.unlocked ? fogMeta.toneClass : 'text-muted',
      laneLabel: '树根',
      laneToneClass: 'text-accent',
      status: regionSummary?.unlocked ? 'available' : 'locked',
      detailLines: [
        `情报 ${knowledge.intelLabel} / 勘明 ${knowledge.surveyLabel} / 熟悉 ${knowledge.familiarityLabel}`,
        `路线 ${regionSummary?.completedRouteCount ?? 0}/${regionSummary?.routeCount ?? primaryRoutes.length}`,
        regionSummary?.themeHint ? `主题：${regionSummary.themeHint}` : ''
      ].filter(Boolean),
      rewardPreview: '从这里展开路线、事件、营地和回城承接。',
      riskPreview: regionSummary?.unlocked ? '区域已开放，先看当前可处理分支。' : getUnlockSummary(regionId),
      actionLabel: '',
      disabled: false,
      disabledReason: '',
      badges: [
        regionId === regionMapStore.currentWeeklyFocus.focusedRegionId ? '本周焦点' : '常规区域',
        `${getActiveRegionEvents(regionId).length}/${getRegionWeeklyEventCapacity(regionId)} 事件`
      ],
      linkedPanels: toTreeLinkedPanels(getLinkedPanels(region?.linkedSystems ?? [])),
      highlighted: regionId === regionMapStore.currentWeeklyFocus.focusedRegionId
    })

    let previousRouteKey = rootKey
    const routeStep = primaryRoutes.length > 1 ? 48 / (primaryRoutes.length - 1) : 0
    const getRouteTreeX = (route: RegionRouteDef) =>
      Math.min(82, Math.max(26, 26 + routeStep * Math.max(0, primaryRoutes.findIndex(entry => entry.id === route.id))))
    primaryRoutes.forEach((route, index) => {
      const preview = getRouteMapPreview(route)
      const laneMeta = getRouteLaneMeta(route)
      const decision = getRouteDecisionSummary(route)
      const canStart = preview.stage !== 'unknown' && canRunRoute(route.id)
      const routeKey = `route:${route.id}`
      const lane = route.nodeType === 'elite' ? 'deep' : 'main'
      const routeX = getRouteTreeX(route)
      const routeY = route.nodeType === 'elite' ? 60 : index % 2 === 0 ? 42 : 50
      const isCurrent = activeRouteId === route.id
      nodes.push({
        key: routeKey,
        type: route.nodeType === 'elite' ? 'monster' : 'route',
        lane,
        regionId,
        routeId: route.id,
        parentNodeKey: previousRouteKey,
        connectedNodeKeys: [],
        x: routeX,
        y: routeY,
        title: preview.title,
        description: preview.description,
        stageLabel: preview.stageLabel,
        stageToneClass: preview.stageToneClass,
        laneLabel: route.nodeType === 'elite' ? '怪物/深层' : laneMeta.label,
        laneToneClass: laneMeta.toneClass,
        status: getTreeStatusFromStage(preview.stage, !canStart),
        detailLines: [
          ...preview.detailLines,
          getRouteDispatchSummary(route),
          decision.linkedSummary ? `联动：${decision.linkedSummary}` : ''
        ].filter(Boolean),
        rewardPreview: `主要带回 ${decision.rewardLabel}`,
        riskPreview: `${decision.riskLabel} / ${decision.modeLabel}`,
        actionLabel: canStart ? getRouteRunActionLabel(route.id) : preview.stage === 'unknown' ? '迷雾中' : '待解锁',
        disabled: !canStart,
        disabledReason: preview.stage === 'unknown' ? '该节点仍被迷雾遮蔽。' : getRouteDisabledReason(route.id),
        badges: [
          getRouteTypeLabel(route.nodeType),
          route.nodeType === 'elite' ? '怪物巢' : '',
          decision.focusLabel,
          getRouteCompletionLabel(route.id),
          regionMapStore.currentWeeklyFocus.highlightedRouteIds.includes(route.id) ? '焦点路线' : ''
        ].filter(Boolean),
        linkedPanels: toTreeLinkedPanels(getLinkedPanels(route.linkedSystems)),
        current: isCurrent,
        highlighted: isCurrent || regionMapStore.currentWeeklyFocus.highlightedRouteIds.includes(route.id)
      })
      links.push({
        key: `tree-link-${previousRouteKey}-${routeKey}`,
        from: previousRouteKey,
        to: routeKey,
        tone: lane === 'deep' ? 'deep' : 'main',
        dashed: preview.stage === 'unknown',
        active: isCurrent
      })
      previousRouteKey = routeKey
    })

    if (preferredRoute) {
      const campState = regionMapStore.getCampSiteState(regionId, preferredRoute.id, null)
      const routePreview = getRouteMapPreview(preferredRoute)
      const campKey = `camp:${preferredRoute.id}`
      const canStart = routePreview.stage !== 'unknown' && canRunRoute(preferredRoute.id)
      nodes.push({
        key: campKey,
        type: 'camp',
        lane: 'camp',
        regionId,
        routeId: preferredRoute.id,
        parentNodeKey: `route:${preferredRoute.id}`,
        connectedNodeKeys: [],
        x: Math.min(78, Math.max(30, 26 + routeStep * Math.max(0, primaryRoutes.findIndex(route => route.id === preferredRoute.id)))),
        y: 78,
        title: '前线营地',
        description: '营地用于休整、整理、标记和侦察，把单次远征转成长期地图进展。',
        stageLabel: campState.visitCount > 0 ? '已扎营' : routePreview.stageLabel,
        stageToneClass: campState.visitCount > 0 ? 'text-success' : routePreview.stageToneClass,
        laneLabel: '营地',
        laneToneClass: 'text-success',
        status: campState.visitCount > 0 ? 'resolved' : getTreeStatusFromStage(routePreview.stage, !canStart),
        detailLines: [
          `休整 ${campState.restCount} / 整理 ${campState.sortCount} / 标记 ${campState.markCount} / 侦察 ${campState.scoutCount}`,
          `安全进度 ${campState.safetyProgress} / 储备 ${campState.stashTier}`,
          getRouteShortcutSummary(preferredRoute.id).headline
        ],
        rewardPreview: '提升路线熟悉、捷径和后续随机节点质量。',
        riskPreview: '适合在继续深推前降低损耗。',
        actionLabel: canStart ? '沿营地出发' : '待路线显形',
        disabled: !canStart,
        disabledReason: routePreview.stage === 'unknown' ? '先让相邻路线从迷雾里显形。' : getRouteDisabledReason(preferredRoute.id),
        badges: ['长期据点', getRouteShortcutSummary(preferredRoute.id).label],
        linkedPanels: [],
        highlighted: activeRouteId === preferredRoute.id
      })
      links.push({
        key: `tree-link-route-${preferredRoute.id}-${campKey}`,
        from: `route:${preferredRoute.id}`,
        to: campKey,
        tone: 'camp',
        dashed: routePreview.stage === 'unknown'
      })
    }

    const ecologyAnchorRoute =
      preferredRoute ??
      primaryRoutes.find(route => getRouteMapPreview(route).stage !== 'unknown') ??
      primaryRoutes[0] ??
      null
    if (ecologyAnchorRoute) {
      const preview = getRouteMapPreview(ecologyAnchorRoute)
      const anchorX = getRouteTreeX(ecologyAnchorRoute)
      const canStart = preview.stage !== 'unknown' && canRunRoute(ecologyAnchorRoute.id)
      const ecologyStage: MapVisibilityStage = preview.stage !== 'unknown' ? preview.stage : 'unknown'
      const animalKey = `ecology:${regionId}:animal:${currentWeekId.value}`
      const treeKey = `ecology:${regionId}:tree:${currentWeekId.value}`
      const monsterRoute = primaryRoutes.find(route => route.nodeType === 'elite') ?? ecologyAnchorRoute
      const hasEliteRouteNode = primaryRoutes.some(route => route.nodeType === 'elite')

      nodes.push({
        key: animalKey,
        type: 'animal',
        lane: 'branch',
        regionId,
        routeId: ecologyAnchorRoute.id,
        parentNodeKey: `route:${ecologyAnchorRoute.id}`,
        connectedNodeKeys: [],
        x: Math.min(82, Math.max(18, anchorX - 13)),
        y: 27,
        title: '动物踪迹',
        description: '路线边缘出现足迹、鸣叫和迁徙痕迹，适合在开拓地图时先观察生态。',
        stageLabel: preview.stage === 'unknown' ? '未知' : preview.stage === 'mastered' ? '熟路生态' : '生态传闻',
        stageToneClass: preview.stage === 'unknown' ? 'text-muted' : preview.stage === 'mastered' ? 'text-success' : 'text-warning',
        laneLabel: '动物',
        laneToneClass: 'text-accent',
        status: getTreeStatusFromStage(ecologyStage, !canStart),
        detailLines: [
          `靠近路线：${preview.title}`,
          '观察动物会把生态线索挂到鱼塘、博物馆或任务板，不在主界面堆长建议。',
          `周期：${currentWeekId.value}`
        ],
        rewardPreview: '可能带回生态样本、鱼塘线索或博物馆记录。',
        riskPreview: '低到中风险，适合作为开雾和补情报的轻支线。',
        actionLabel: canStart ? '观察动物' : preview.stage === 'unknown' ? '迷雾中' : '待路线显形',
        disabled: !canStart,
        disabledReason: preview.stage === 'unknown' ? '先让相邻路线从迷雾里显形。' : getRouteDisabledReason(ecologyAnchorRoute.id),
        badges: ['动物', '生态拓展', '周期节点'],
        linkedPanels: getRegionalPanelLinks(['fishPond', 'museum', 'quest']),
        highlighted: canStart
      })
      links.push({
        key: `tree-link-route-${ecologyAnchorRoute.id}-${animalKey}`,
        from: `route:${ecologyAnchorRoute.id}`,
        to: animalKey,
        tone: 'branch',
        dashed: preview.stage !== 'mastered'
      })

      nodes.push({
        key: treeKey,
        type: 'tree',
        lane: 'branch',
        regionId,
        routeId: ecologyAnchorRoute.id,
        parentNodeKey: `route:${ecologyAnchorRoute.id}`,
        connectedNodeKeys: [],
        x: Math.min(88, Math.max(32, anchorX + 15)),
        y: 72,
        title: '林缘树丛',
        description: '树丛、倒木和可采伐边界会作为地图开拓支线，提示这里还能继续伸出分叉。',
        stageLabel: preview.stage === 'unknown' ? '未知' : preview.stage === 'mastered' ? '熟路林缘' : '林缘显形',
        stageToneClass: preview.stage === 'unknown' ? 'text-muted' : preview.stage === 'mastered' ? 'text-success' : 'text-warning',
        laneLabel: '树丛',
        laneToneClass: 'text-success',
        status: getTreeStatusFromStage(ecologyStage, !canStart),
        detailLines: [
          `靠近路线：${preview.title}`,
          '树丛节点偏向采集、营地材料和村建承接，适合把开拓感做成长期成长。',
          `周期：${currentWeekId.value}`
        ],
        rewardPreview: '可能带回木材、营地材料、采集经验或商圈需求。',
        riskPreview: '低风险，但可能消耗时间和体力。',
        actionLabel: canStart ? '开拓林缘' : preview.stage === 'unknown' ? '迷雾中' : '待路线显形',
        disabled: !canStart,
        disabledReason: preview.stage === 'unknown' ? '先勘明相邻路线。' : getRouteDisabledReason(ecologyAnchorRoute.id),
        badges: ['树丛', '采集', '开拓'],
        linkedPanels: getRegionalPanelLinks(['villageProject', 'shop', 'inventory', 'skills'], ['inventory', 'skills']),
        highlighted: canStart && preview.stage === 'mastered'
      })
      links.push({
        key: `tree-link-route-${ecologyAnchorRoute.id}-${treeKey}`,
        from: `route:${ecologyAnchorRoute.id}`,
        to: treeKey,
        tone: 'camp',
        dashed: preview.stage !== 'mastered'
      })

      if (!hasEliteRouteNode) {
        const monsterPreview = getRouteMapPreview(monsterRoute)
        const canFight = monsterPreview.stage !== 'unknown' && canRunRoute(monsterRoute.id)
        const monsterKey = `ecology:${regionId}:monster:${currentWeekId.value}`
        nodes.push({
          key: monsterKey,
          type: 'monster',
          lane: 'deep',
          regionId,
          routeId: monsterRoute.id,
          parentNodeKey: `route:${monsterRoute.id}`,
          connectedNodeKeys: [],
          x: Math.min(86, Math.max(34, getRouteTreeX(monsterRoute) + 11)),
          y: 62,
          title: '游荡怪物',
          description: '开拓边界附近出现游荡怪物，作为非首领战斗压力和危险生态的显性节点。',
          stageLabel: monsterPreview.stage === 'unknown' ? '未知' : '危险显形',
          stageToneClass: monsterPreview.stage === 'unknown' ? 'text-muted' : 'text-danger',
          laneLabel: '怪物',
          laneToneClass: 'text-danger',
          status: getTreeStatusFromStage(monsterPreview.stage, !canFight),
          detailLines: [
            `靠近路线：${monsterPreview.title}`,
            '这是开拓时的危险支线，后续可接入完整战斗面板。',
            `周期：${currentWeekId.value}`
          ],
          rewardPreview: '可能带回战利品、公会讨伐记录或稀有材料。',
          riskPreview: '中高风险，建议先检查战备、技能和补给。',
          actionLabel: canFight ? '遭遇怪物' : monsterPreview.stage === 'unknown' ? '迷雾中' : '待战备',
          disabled: !canFight,
          disabledReason: monsterPreview.stage === 'unknown' ? '先让相邻路线显形。' : getRouteDisabledReason(monsterRoute.id),
          badges: ['怪物', '危险生态', '周期节点'],
          linkedPanels: getRegionalPanelLinks(['guild', 'skills', 'inventory'], ['guild', 'skills']),
          highlighted: canFight
        })
        links.push({
          key: `tree-link-route-${monsterRoute.id}-${monsterKey}`,
          from: `route:${monsterRoute.id}`,
          to: monsterKey,
          tone: 'deep',
          dashed: monsterPreview.stage !== 'mastered'
        })
      }
    }

    handoffRoutes.slice(0, 2).forEach((route, index) => {
      const preview = getRouteMapPreview(route)
      const decision = getRouteDecisionSummary(route)
      const canStart = preview.stage !== 'unknown' && canRunRoute(route.id)
      const parentRoute = primaryRoutes[Math.min(primaryRoutes.length - 1, Math.max(0, index + 1))] ?? preferredRoute
      const handoffKey = `handoff:${route.id}`
      nodes.push({
        key: handoffKey,
        type: 'handoff',
        lane: 'branch',
        regionId,
        routeId: route.id,
        parentNodeKey: parentRoute ? `route:${parentRoute.id}` : rootKey,
        connectedNodeKeys: [],
        x: 42 + index * 18,
        y: 20 + index * 4,
        title: preview.title,
        description: route.handoffHint || preview.description,
        stageLabel: preview.stageLabel,
        stageToneClass: preview.stageToneClass,
        laneLabel: '承接分支',
        laneToneClass: 'text-success',
        status: getTreeStatusFromStage(preview.stage, !canStart),
        detailLines: [...preview.detailLines, decision.linkedSummary ? `回城去向：${decision.linkedSummary}` : ''].filter(Boolean),
        rewardPreview: `承接 ${decision.rewardLabel}`,
        riskPreview: decision.riskLabel,
        actionLabel: canStart ? getRouteRunActionLabel(route.id) : preview.stage === 'unknown' ? '迷雾中' : '待解锁',
        disabled: !canStart,
        disabledReason: preview.stage === 'unknown' ? '承接分支仍在迷雾里。' : getRouteDisabledReason(route.id),
        badges: ['回城承接', decision.focusLabel],
        linkedPanels: toTreeLinkedPanels(getLinkedPanels(route.linkedSystems)),
        highlighted: activeRouteId === route.id
      })
      links.push({
        key: `tree-link-${parentRoute?.id ?? rootKey}-${handoffKey}`,
        from: parentRoute ? `route:${parentRoute.id}` : rootKey,
        to: handoffKey,
        tone: 'branch',
        dashed: preview.stage === 'unknown'
      })
    })

    getActiveRegionEvents(regionId).slice(0, 3).forEach((event, index) => {
      const parentRoute = preferredRoute ?? primaryRoutes[index % Math.max(1, primaryRoutes.length)]
      const canStart = canRunEvent(event.id)
      const eventKey = `event:${event.id}`
      nodes.push({
        key: eventKey,
        type: event.encounterHint?.includes('异常') ? 'anomaly' : 'event',
        lane: 'branch',
        regionId,
        eventId: event.id,
        parentNodeKey: parentRoute ? `route:${parentRoute.id}` : rootKey,
        connectedNodeKeys: [],
        x: 34 + index * 16,
        y: 88 - (index % 2) * 7,
        title: event.name,
        description: event.description,
        stageLabel: event.weeklyCompletions > 0 ? '已处理' : '本周显形',
        stageToneClass: event.weeklyCompletions > 0 ? 'text-success' : 'text-warning',
        laneLabel: '事件分支',
        laneToneClass: 'text-warning',
        status: event.weeklyCompletions > 0 ? 'resolved' : canStart ? 'available' : 'locked',
        detailLines: [
          event.encounterHint ?? '',
          event.handoffHint ? `承接：${event.handoffHint}` : '',
          `本周 ${event.weeklyCompletions}/${event.maxWeeklyCompletions ?? 1}`
        ].filter(Boolean),
        rewardPreview: `资源 +${event.rewardAmount}`,
        riskPreview: `体力 ${event.staminaCost} / 耗时 ${event.timeCostHours}h`,
        actionLabel: canStart ? '处理事件' : '待处理条件',
        disabled: !canStart,
        disabledReason: getEventDisabledReason(event.id),
        badges: ['周期节点', event.weeklyCompletions > 0 ? '已兑现' : '待兑现'],
        linkedPanels: toTreeLinkedPanels(getLinkedPanels(event.linkedSystems)),
        highlighted: event.weeklyCompletions <= 0
      })
      links.push({
        key: `tree-link-${parentRoute?.id ?? rootKey}-${eventKey}`,
        from: parentRoute ? `route:${parentRoute.id}` : rootKey,
        to: eventKey,
        tone: 'branch',
        dashed: !canStart
      })
    })

    getRegionRumorBoard(regionId).filter(entry => !entry.fulfilled).slice(0, 2).forEach((rumor, index) => {
      const parentRoute = rumor.targetRouteId
        ? primaryRoutes.find(route => route.id === rumor.targetRouteId) ?? preferredRoute
        : preferredRoute
      const rumorKey = `rumor:${rumor.id}`
      nodes.push({
        key: rumorKey,
        type: 'rumor',
        lane: 'branch',
        regionId,
        routeId: rumor.targetRouteId ?? parentRoute?.id,
        parentNodeKey: parentRoute ? `route:${parentRoute.id}` : rootKey,
        connectedNodeKeys: [],
        x: 30 + index * 20,
        y: 12,
        title: rumor.title,
        description: rumor.summary,
        stageLabel: '传闻',
        stageToneClass: 'text-warning',
        laneLabel: '传闻',
        laneToneClass: 'text-warning',
        status: 'heard',
        detailLines: [
          `${rumor.sourceNpcName} / ${rumor.sourceLocation} / ${rumor.relationshipStageLabel}`,
          ...rumor.detailLines.slice(0, 2)
        ],
        rewardPreview: rumor.tags.join(' / '),
        riskPreview: '需要沿相邻路线兑现。',
        actionLabel: parentRoute ? '追踪传闻' : '',
        disabled: !parentRoute || !canRunRoute(parentRoute.id),
        disabledReason: parentRoute ? getRouteDisabledReason(parentRoute.id) : '传闻尚未指向可执行路线。',
        badges: ['传闻板', '待兑现'],
        linkedPanels: [],
        highlighted: true
      })
      links.push({
        key: `tree-link-${parentRoute?.id ?? rootKey}-${rumorKey}`,
        from: parentRoute ? `route:${parentRoute.id}` : rootKey,
        to: rumorKey,
        tone: 'branch',
        dashed: true
      })
    })

    if (preferredRoute && getActiveRegionEvents(regionId).length === 0) {
      const preview = getRouteMapPreview(preferredRoute)
      const canStart = preview.stage !== 'unknown' && canRunRoute(preferredRoute.id)
      const resourceFamily = regionMapStore.resourceFamilyDefs.find(family => family.id === preferredRoute.primaryResourceFamilyId)
      const cacheKey = `cache:${preferredRoute.id}:${currentWeekId.value}`
      nodes.push({
        key: cacheKey,
        type: 'chest',
        lane: 'branch',
        regionId,
        routeId: preferredRoute.id,
        parentNodeKey: `route:${preferredRoute.id}`,
        connectedNodeKeys: [],
        x: 76,
        y: 76,
        title: '隐蔽补给箱',
        description: '本周没有明确事件时，地图会把可顺手处理的补给点挂到熟悉路线附近。',
        stageLabel: preview.stage === 'unknown' ? '未知' : '传闻',
        stageToneClass: preview.stage === 'unknown' ? 'text-muted' : 'text-warning',
        laneLabel: '宝箱',
        laneToneClass: 'text-success',
        status: getTreeStatusFromStage(preview.stage, !canStart),
        detailLines: ['补给箱跟随周期开启，实际收益由相邻路线结算。'],
        rewardPreview: resourceFamily ? `可能带回 ${resourceFamily.label}` : '可能带回区域资源',
        riskPreview: '低风险，但需要先能进入相邻路线。',
        actionLabel: canStart ? '顺路搜取' : '待路线显形',
        disabled: !canStart,
        disabledReason: preview.stage === 'unknown' ? '先勘明相邻路线。' : getRouteDisabledReason(preferredRoute.id),
        badges: ['周期宝箱', '顺路处理'],
        linkedPanels: []
      })
      links.push({
        key: `tree-link-route-${preferredRoute.id}-${cacheKey}`,
        from: `route:${preferredRoute.id}`,
        to: cacheKey,
        tone: 'branch',
        dashed: true
      })
    }

    const bossPreview = getBossMapPreview(regionId)
    const bossKey = `boss:${regionId}`
    const canStartBoss = bossPreview.stage !== 'unknown' && canChallengeBoss(regionId)
    nodes.push({
      key: bossKey,
      type: 'boss',
      lane: 'boss',
      regionId,
      bossId: bossPreview.bossId,
      parentNodeKey: previousRouteKey,
      connectedNodeKeys: [],
      x: 91,
      y: 50,
      title: bossPreview.title,
      description: bossPreview.description,
      stageLabel: bossPreview.stageLabel,
      stageToneClass: bossPreview.stageToneClass,
      laneLabel: '首领',
      laneToneClass: 'text-danger',
      status: getTreeStatusFromStage(bossPreview.stage, !canStartBoss),
      detailLines: bossPreview.detailLines,
      rewardPreview: getBossPrepSummary(regionId).headline,
      riskPreview: getBossDisabledReason(regionId) || '高压终点，建议先处理前置分支。',
      actionLabel: canStartBoss ? '发起首领' : bossPreview.stage === 'unknown' ? '迷雾中' : '待战备',
      disabled: !canStartBoss,
      disabledReason: bossPreview.stage === 'unknown' ? '首领方向仍被迷雾覆盖。' : getBossDisabledReason(regionId),
      badges: ['终点', (regionMapStore.saveData.bossClearCounts[regionId] ?? 0) > 0 ? `已胜 ${regionMapStore.saveData.bossClearCounts[regionId]}` : '未胜'],
      linkedPanels: toTreeLinkedPanels(getLinkedPanels(region?.linkedSystems ?? [])),
      current: activeBoss,
      highlighted: activeBoss
    })
    links.push({
      key: `tree-link-${previousRouteKey}-${bossKey}`,
      from: previousRouteKey,
      to: bossKey,
      tone: 'boss',
      dashed: bossPreview.stage === 'unknown',
      active: activeBoss
    })

    return buildTreeNodeConnections(nodes, links)
  }

  const getRegionTreeSummary = (regionId: RegionId) => {
    const board = getRegionMapBoardSummary(regionId)
    const rumorCount = getRegionRumorBoard(regionId).filter(entry => !entry.fulfilled).length
    const eventCount = getActiveRegionEvents(regionId).filter(event => event.weeklyCompletions <= 0).length
    const ecologyCount = getRegionExplorationTree(regionId).nodes.filter(node => node.key.startsWith('ecology:')).length
    return `${board.headline} 当前树上挂出 ${eventCount} 个事件、${rumorCount} 条传闻、${ecologyCount} 个生态拓展，节点详情里处理风险、收益和回城去向。`
  }

  const getRegionTreeInitialNodeKey = (regionId: RegionId) => {
    const session = currentSession.value
    if (session?.regionId === regionId) {
      if (session.mode === 'boss') return `boss:${regionId}`
      if (session.routeId) return `route:${session.routeId}`
    }
    const preferredRoute = getPreferredFocusRoute(regionId)
    return preferredRoute ? `route:${preferredRoute.id}` : `root:${regionId}`
  }

  const handleRegionTreeNodeAction = (node: RegionExplorationTreeNode) => {
    if (node.disabled) {
      const reason = node.disabledReason || '该节点当前还不能处理。'
      setActionSummary(reason, 'accent')
      openSettlementDialog('节点暂不可用', [reason], 'accent')
      return
    }
    if (node.type === 'boss') {
      handleRunBoss(node.regionId)
      return
    }
    if (node.type === 'event' || node.type === 'anomaly') {
      if (node.eventId) handleRunEvent(node.eventId)
      return
    }
    if (node.routeId) {
      handleRunRoute(node.routeId)
    }
  }

  const handleRegionTreeNavigate = (panelKey: string) => {
    handleNavigate(panelKey as PanelKey)
  }

  const getActiveRegionEvents = (regionId: RegionId) => regionMapStore.getActiveRegionEvents(regionId)

  const getRegionWeeklyEventCapacity = (regionId: RegionId) =>
    regionMapStore.currentWeeklyFocus.focusedRegionId === regionId ? 3 : 2

  const getArchiveOutcomeLabel = (outcome: 'ready_to_settle' | 'victory' | 'retreated' | 'failure') =>
    outcome === 'victory' || outcome === 'ready_to_settle' ? '凯旋' : outcome === 'retreated' ? '撤退回城' : '失利撤出'

  const canRunEvent = (eventId: string) => regionMapStore.getEventAvailability(eventId).available

  const getEventDisabledReason = (eventId: string) => {
    const eventStatus = regionMapStore.getEventAvailability(eventId)
    return eventStatus.available ? '' : eventStatus.reason
  }

  const getBossPrepSummary = (regionId: RegionId) => {
    const boss = regionMapStore.bossDefs.find(entry => entry.regionId === regionId)
    if (!boss) {
      return {
        headline: '暂无首领配置',
        detailLines: []
      }
    }

    const routeCount = regionMapStore.getRegionCompletedRouteCount(regionId)
    const status = regionMapStore.getBossExpeditionStatus(regionId)
    const detailLines = [
      `路线门槛：已完成 ${routeCount} 条区域路线，达到 1 条即可开启首领挑战。`,
      `执行门槛：体力 ${boss.staminaCost} / 耗时 ${boss.timeCostHours}h。`,
      status.available ? '当前条件已满足，可直接挑战。' : `当前阻塞：${status.reason}`
    ]

    if (regionId === 'cloud_highland') {
      const projectNames = villageProjectStore
        .getLinkedProjectSummaries('guild')
        .filter(project => project.available || project.completed)
        .slice(0, 2)
        .map(project => project.name)
      detailLines.push(`公会战备：Lv.${guildStore.guildLevel} / ${guildStore.crossSystemOverview.currentRankBandLabel}。`)
      detailLines.push(
        projectNames.length > 0
          ? `建设承接：${projectNames.join('、')}。`
          : '建设承接：当前暂无可见的高地联动建设。'
      )
      detailLines.push(`当前体力：${playerStore.stamina} / 灵脉结晶 ${regionMapStore.getFamilyResourceQuantity('ley_crystal')}。`)
      return {
        headline: '公会 -> 村庄建设 -> 首领',
        detailLines
      }
    }

    return {
      headline: '路线 -> 首领',
      detailLines
    }
  }

  function getLinkedSystemPanel(system: RegionLinkedSystem): LinkedPanel | null {
    switch (system) {
      case 'quest':
        return { key: 'quest', label: '任务板' }
      case 'shop':
        return { key: 'shop', label: '商圈' }
      case 'museum':
        return { key: 'museum', label: '博物馆' }
      case 'guild':
        return { key: 'guild', label: '公会' }
      case 'hanhai':
        return { key: 'hanhai', label: '瀚海' }
      case 'fishPond':
        return { key: 'fishpond', label: '鱼塘' }
      case 'villageProject':
        return { key: 'village', label: '村庄' }
      case 'wallet':
        return { key: 'wallet', label: '钱包' }
      case 'inventory':
        return { key: 'inventory', label: '背包' }
      case 'skills':
        return { key: 'skills', label: '技能' }
      default:
        return null
    }
  }

  function getLinkedPanels(linkedSystems: RegionLinkedSystem[]): LinkedPanel[] {
    return [...new Set(linkedSystems)]
      .map(system => getLinkedSystemPanel(system))
      .filter((panel): panel is LinkedPanel => panel !== null)
  }

  const handleNavigate = (panelKey: PanelKey) => {
    navigateToPanel(panelKey)
  }
  const goToExpeditionRoom = () => {
    void router.push({ name: 'online-festival', query: { tab: 'expedition' } })
  }
  const handleJourneyActionNavigate = (entryId: string, panelKey: PanelKey) => {
    markJourneyActionProcessed(entryId, panelKey)
    handleNavigate(panelKey)
  }

  const handlePrimaryJourneyAction = async () => {
    const action = primaryJourneyActionCard.value

    if (action.kind === 'session' && action.regionId) {
      setRegionMapTab('today')
      revealRegionSelection(action.regionId, action.routeId)
      await scrollAnchorIntoView(stagePanelAnchor.value)
      return
    }

    if (action.kind === 'focus' && action.regionId) {
      setRegionMapTab('map')
      revealRegionSelection(action.regionId, action.routeId)
      await scrollAnchorIntoView(regionListAnchor.value)
      return
    }

    if (action.kind === 'aftermath') {
      if (action.panelKey) {
        const latestEntryId = latestJourneyAftermathSummary.value?.entry.id
        if (latestEntryId) {
          handleJourneyActionNavigate(latestEntryId, action.panelKey)
        } else {
          handleNavigate(action.panelKey)
        }
        return
      }

      if (latestJourneyAftermathSummary.value) {
        revealRegionSelection(latestJourneyAftermathSummary.value.entry.regionId)
      }
      await openAftermathTab()
      return
    }

    const regionId = getPreferredRegionSelectionId()
    if (regionId) {
      setRegionMapTab('map')
      selectedRegionId.value = regionId
    }
    await scrollAnchorIntoView(regionListAnchor.value)
  }

  const handleSettlementAction = (panelKey: PanelKey) => {
    if (settlementDialog.value?.kind === 'expedition' && settlementDialog.value.entryId) {
      markJourneyActionProcessed(settlementDialog.value.entryId, panelKey)
    }
    settlementDialog.value = null
    handleNavigate(panelKey)
  }

  const handleRunRoute = (routeId: string) => {
    if (shouldAutoRunRoute(routeId)) {
      const result = regionMapStore.runRouteExpedition(routeId, currentDayTag.value)
      setActionSummary(result.message, result.success ? 'success' : 'danger')
      openSettlementDialog(result.success ? '自动巡行' : '无法自动巡行', [result.message], result.success ? 'success' : 'danger')
      return
    }

    const result = regionMapStore.startRouteExpeditionSession(routeId, currentDayTag.value, selectedApproach.value, selectedRetreatRule.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      setRegionMapTab('today')
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
  }

  const handleAssignCompanionContract = (routeId: string, npcId: string) => {
    const result = regionMapStore.assignCompanionContract(routeId, npcId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
  }

  const handleClearCompanionContract = (routeId: string) => {
    const result = regionMapStore.clearCompanionContract(routeId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
  }

  const handleRunEvent = (eventId: string) => {
    const result = regionMapStore.runRegionEvent(eventId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    openSettlementDialog(result.success ? '区域事件结算' : '区域事件未完成', [result.message], result.success ? 'success' : 'danger')
  }

  const handleSelectOpenWorldRegion = (regionId: RegionOpenWorldId) => {
    const result = regionMapStore.setActiveOpenWorldRegion(regionId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'accent' : 'danger')
  }

  const handleSelectOpenWorldTile = (tileId: string) => {
    const result = regionMapStore.selectOpenWorldTile(tileId)
    if (!result.success) setActionSummary(result.message, result.tone)
  }

  const handlePanOpenWorldViewport = (delta: { deltaX: number; deltaY: number }) => {
    const regionId = regionMapStore.openWorldState.activeRegionId
    const view = activeOpenWorldRegionView.value
    const viewportWidth = view.bounds.maxX - view.bounds.minX + 1
    const viewportHeight = view.bounds.maxY - view.bounds.minY + 1
    setOpenWorldViewportOrigin(regionId, {
      minX: clampOpenWorldViewportValue(view.bounds.minX + delta.deltaX, 0, Math.max(0, view.def.width - viewportWidth)),
      minY: clampOpenWorldViewportValue(view.bounds.minY + delta.deltaY, 0, Math.max(0, view.def.height - viewportHeight))
    })
  }

  const handleMoveOpenWorldPlayer = (tileId: string) => {
    const regionId = regionMapStore.openWorldState.activeRegionId
    setOpenWorldViewportOrigin(regionId, activeOpenWorldRegionView.value.bounds)
    const result = regionMapStore.moveOpenWorldPlayer(tileId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'accent' : result.tone)
  }

  const handlePerformOpenWorldAction = (tileId: string, actionId: RegionOpenWorldActionId) => {
    const result = regionMapStore.performOpenWorldAction(tileId, actionId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : result.tone)
    if (!result.success) {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
    handleRegionActionEndDay(result)
  }


  const canChallengeBoss = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.available ?? false

  const getBossDisabledReason = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.disabledReason ?? ''

  const handleRunBoss = (regionId: RegionId) => {
    const result = regionMapStore.startBossExpeditionSession(regionId, currentDayTag.value, selectedApproach.value, selectedRetreatRule.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      setRegionMapTab('today')
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
  }

  const handleAdvanceExpedition = (choiceId?: string) => {
    const result = regionMapStore.advanceActiveExpedition(choiceId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
    handleRegionActionEndDay(result)
  }

  const handleCampExpedition = () => {
    const result = regionMapStore.campActiveExpedition(currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
    handleRegionActionEndDay(result)
  }

  const handleResolveCampAction = (actionId: RegionCampActionId) => {
    const result = regionMapStore.resolveCampAction(actionId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
    handleRegionActionEndDay(result)
  }

  const handleRetreatExpedition = () => {
    const result = regionMapStore.retreatActiveExpedition(currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
  }

  const handleResolveEncounter = (optionId: 'cautious' | 'balanced' | 'bold') => {
    const result = regionMapStore.resolveActiveEncounter(optionId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
  }

  const handleSettleExpedition = () => {
    const result = regionMapStore.settleActiveExpedition(currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    setRegionMapTab('aftermath')
    openExpeditionSettlementDialog(result.title, result.lines, result.tone)
  }

  const handleOpenJourneyAftermath = (entry: RegionExpeditionArchiveEntry) => {
    setRegionMapTab('aftermath')
    openArchiveAftermathDialog(entry)
  }

  const handleSelectJourneyAftermath = (entry: RegionExpeditionArchiveEntry) => {
    setRegionMapTab('aftermath')
    selectedJourneyAftermathId.value = entry.id
    selectedJourneyAftermathPinned.value = true
    mobileSelectedAftermathExpanded.value = true
    setActionSummary(`已将「${entry.targetName}」设为当前旅后处理回看。`, 'accent')
  }
  const clearSelectedJourneyAftermath = () => {
    selectedJourneyAftermathPinned.value = false
    selectedJourneyAftermathId.value = null
    mobileSelectedAftermathExpanded.value = false
    setActionSummary('已收起常驻旅后回看，页面只保留最新办事单与历史入口。', 'accent')
  }

  const handlePublicResourceTurnIn = (familyId: RegionalResourceFamilyId) => {
    const familyLabel = regionMapStore.resourceFamilyDefs.find(family => family.id === familyId)?.label ?? familyId
    const ok = regionMapStore.recordResourceTurnIn(familyId, 1)
    const successMessage = `已交付 1 份${familyLabel}，当前会计入“区域资源交付数”，用于周目标与承接验证。`
    const failureMessage = '交付失败：当前资源不足。'
    setActionSummary(
      ok ? successMessage : failureMessage,
      ok ? 'success' : 'danger'
    )
    showFloat(ok ? `已交付 1 份${familyLabel}` : failureMessage, ok ? 'success' : 'danger')
    addLog(`【行旅图】${ok ? successMessage : failureMessage}`)
  }

  const handleCraftJourneyRecipe = (recipeId: string) => {
    const result = regionMapStore.craftJourneyRecipe(recipeId)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    showFloat(result.message, result.success ? 'success' : 'danger')
  }

  const handleUnlockJourneyAwakening = (awakeningId: string) => {
    const result = regionMapStore.unlockJourneyAwakening(awakeningId)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    showFloat(result.message, result.success ? 'success' : 'danger')
  }

  const handleUnlockJourneyCampModule = (moduleId: string) => {
    const result = regionMapStore.unlockJourneyCampModule(moduleId)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    showFloat(result.message, result.success ? 'success' : 'danger')
  }

  const handleUnlockJourneyRoutePermit = (permitId: string) => {
    const result = regionMapStore.unlockJourneyRoutePermit(permitId)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    showFloat(result.message, result.success ? 'success' : 'danger')
  }
</script>

<style scoped>
  .compact-clamp-3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }

  .region-map-scroll-rail {
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .region-map-scroll-track {
    width: max-content;
  }

  .region-map-scroll-card {
    scroll-snap-align: start;
  }
</style>
