<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1.5 text-sm text-accent">
        <Map :size="14" />
        <span>行旅图</span>
      </div>
      <span class="text-xs" :class="regionMapStore.unlockedRegionCount > 0 ? 'text-success' : 'text-muted'">
        {{ regionMapStore.unlockedRegionCount > 0 ? '已开放' : '按进度开放' }}
      </span>
    </div>

    <div v-if="regionMapStore.unlockedRegionCount <= 0" class="border border-accent/20 rounded-xs p-3 mb-3">
      <div class="flex items-center gap-2 mb-2 text-accent/70">
        <Map :size="18" />
        <span class="text-xs">未开放时也可先查看开放条件</span>
      </div>
      <p class="text-sm text-muted">行旅图会随着玩家进度逐步开放。</p>
      <p class="text-xs text-muted mt-1 leading-5">
        当任意区域满足解锁条件后，这里会自动切换成正式可推进的区域总入口，不再需要额外开关。      </p>
      <p class="text-xs text-accent/80 mt-2 leading-5">现在不再需要额外开关，任一区域满足条件后会自动进入可用状态。</p>
      <div class="mt-3 space-y-2">
        <div
          v-for="entry in lockedRegionUnlockGuides"
          :key="`region-unlock-guide-${entry.id}`"
          class="border border-accent/10 rounded-xs p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-accent">{{ entry.name }}</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.description }}</p>
            </div>
            <span class="text-[10px] shrink-0" :class="entry.ready ? 'text-success' : 'text-muted'">
              {{ entry.ready ? '条件已满足' : '尚未满足' }}
            </span>
          </div>
          <p class="text-[10px] text-muted mt-2 leading-4">{{ entry.summary }}</p>
          <p class="text-[10px] text-accent/80 mt-1 leading-4">承接方向：{{ entry.linkedSystems.join(' / ') }}</p>
        </div>
      </div>
    </div>

    <template v-else>
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
        <p class="text-[10px] text-muted mt-2 leading-4">
          当前主题周：{{ currentThemeWeekLabel }}。当前入口已接通区域状态、路线完成、首领记录与资源台账，后续将继续把结算接到旧系统。
        </p>
      </div>

      <div v-if="!isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">远征筹备</p>
            <p class="text-[10px] text-muted mt-1 leading-4">先决定推进风格与撤退规则，再出发。路线和首领现在都会进入多阶段远征，而不是一键完成。</p>
          </div>
          <span class="text-[10px] text-muted shrink-0">当前 HP {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <p class="text-[10px] text-muted mb-2">推进风格</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="entry in expeditionApproachOptions"
                :key="`approach-${entry.value}`"
                class="border rounded-xs px-2 py-1 text-[10px] hover:bg-accent/5"
                :class="selectedApproach === entry.value ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
                @click="selectedApproach = entry.value"
              >
                {{ entry.label }}
              </button>
            </div>
            <p class="text-[10px] text-muted mt-2 leading-4">{{ currentApproachDescription }}</p>
          </div>
          <div>
            <p class="text-[10px] text-muted mb-2">撤退规则</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="entry in expeditionRetreatRuleOptions"
                :key="`retreat-${entry.value}`"
                class="border rounded-xs px-2 py-1 text-[10px] hover:bg-accent/5"
                :class="selectedRetreatRule === entry.value ? 'border-accent text-accent' : 'border-accent/20 text-muted'"
                @click="selectedRetreatRule = entry.value"
              >
                {{ entry.label }}
              </button>
            </div>
            <p class="text-[10px] text-muted mt-2 leading-4">{{ currentRetreatRuleDescription }}</p>
          </div>
        </div>
      </div>

      <div v-if="!isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <p class="text-xs text-accent">{{ regionMapStore.frontierDigest.headline }}</p>
        <div class="mt-2 space-y-1">
          <p
            v-for="line in regionMapStore.frontierDigest.highlightSummaries"
            :key="`digest-highlight-${line}`"
            class="text-[10px] text-muted leading-4"
          >
            - {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.nextHookSummaries"
            :key="`digest-hook-${line}`"
            class="text-[10px] text-accent/80 leading-4"
          >
            -> {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.riskSummaries"
            :key="`digest-risk-${line}`"
            class="text-[10px] text-warning leading-4"
          >
            ! {{ line }}
          </p>
        </div>
      </div>

      <div
        class="border border-accent/20 rounded-xs p-4 mb-3"
        style="background-image: linear-gradient(135deg, rgba(168, 138, 86, 0.12), rgba(36, 39, 56, 0.72));"
      >
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
          <div class="min-w-0">
            <p class="text-[10px] tracking-[0.28em] text-accent/70">区域切换</p>
            <p class="text-sm text-accent mt-1">先选定这趟要展开查看的区域</p>
            <p class="text-[10px] text-muted mt-1 leading-4">切到单一区域时，路线、传闻、季节变体和同行合同会更集中地展开。</p>
          </div>
          <div class="shrink-0 md:text-right">
            <p class="text-[10px] text-muted">当前筛选</p>
            <p class="text-sm text-accent mt-1">{{ selectedRegionFilterLabel }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <button
            class="border rounded-xs px-4 py-3 min-h-[88px] text-left transition-colors"
            :class="allRegionsSelected ? 'border-accent bg-accent/10 text-accent' : 'border-accent/15 bg-bg/50 text-muted hover:bg-accent/5'"
            data-testid="region-switch-all"
            :aria-pressed="allRegionsSelected"
            @click="selectedRegionId = null"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm">全部区域</p>
                <p class="text-[10px] mt-2 leading-4" :class="allRegionsSelected ? 'text-accent/80' : 'text-muted'">
                  一次查看整张行旅图，适合统览本周焦点与多区域承接。
                </p>
              </div>
              <span class="text-[10px] shrink-0" :class="allRegionsSelected ? 'text-success' : 'text-muted'">
                {{ allRegionsSelected ? '当前展开' : '总览' }}
              </span>
            </div>
            <div class="mt-3 flex items-center justify-between gap-3 text-[10px]">
              <span :class="allRegionsSelected ? 'text-accent/80' : 'text-muted'">
                已开放 {{ regionMapStore.unlockedRegionCount }}/{{ regionMapStore.regionDefs.length }} 区
              </span>
              <span :class="allRegionsSelected ? 'text-accent' : 'text-muted'">焦点：{{ currentFocusLabel }}</span>
            </div>
          </button>

          <button
            v-for="region in regionMapStore.regionSummaries"
            :key="`region-filter-${region.id}`"
            class="border rounded-xs px-4 py-3 min-h-[88px] text-left transition-colors"
            :class="selectedRegionId === region.id ? 'border-accent bg-accent/10 text-accent' : 'border-accent/15 bg-bg/50 text-muted hover:bg-accent/5'"
            :data-testid="`region-switch-${region.id}`"
            :aria-pressed="selectedRegionId === region.id"
            @click="selectedRegionId = region.id"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm">{{ region.name }}</p>
                <p class="text-[10px] mt-2 leading-4" :class="selectedRegionId === region.id ? 'text-accent/80' : 'text-muted'">
                  {{ region.description }}
                </p>
              </div>
              <span
                class="text-[10px] shrink-0"
                :class="selectedRegionId === region.id ? 'text-success' : region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? 'text-accent' : 'text-muted'"
              >
                {{ selectedRegionId === region.id ? '当前展开' : region.id === regionMapStore.currentWeeklyFocus.focusedRegionId ? '本周焦点' : '区域入口' }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
              <span :class="selectedRegionId === region.id ? 'text-accent/80' : 'text-muted'">
                路线 {{ region.completedRouteCount }}/{{ region.routeCount }}
              </span>
              <span :class="selectedRegionId === region.id ? 'text-accent/80' : 'text-muted'">
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
        <p class="text-[10px] text-muted">操作回执</p>
        <p class="text-[11px] mt-2 leading-5" :class="actionToneClass">{{ lastActionSummary }}</p>
      </div>

      <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] tracking-[0.24em] text-accent/70">远征筹备</p>
            <p class="text-xs text-accent mt-1">{{ currentSession ? `进行中：${currentSession.targetName}` : '先定推进风格，再发起探索。' }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">
              已选 {{ currentApproachDescription ? expeditionApproachOptions.find(entry => entry.value === selectedApproach)?.label : '稳健推进' }} / {{ expeditionRetreatRuleOptions.find(entry => entry.value === selectedRetreatRule)?.label ?? '平衡推进' }}
            </p>
          </div>
          <button
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
            @click="mobilePrepExpanded = !mobilePrepExpanded"
          >
            {{ mobilePrepExpanded ? '收起' : '展开' }}
          </button>
        </div>

        <div v-if="mobilePrepExpanded" class="space-y-3 mt-3">
          <div>
            <p class="text-[10px] text-muted mb-2">推进风格</p>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="entry in expeditionApproachOptions"
                :key="`compact-approach-${entry.value}`"
                class="border rounded-xs px-3 py-2 text-left hover:bg-accent/5"
                :class="selectedApproach === entry.value ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted'"
                @click="selectedApproach = entry.value"
              >
                <p class="text-[10px]">{{ entry.label }}</p>
                <p class="text-[10px] mt-1 leading-4 text-muted">{{ entry.description }}</p>
              </button>
            </div>
          </div>

          <div>
            <p class="text-[10px] text-muted mb-2">撤退规则</p>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="entry in expeditionRetreatRuleOptions"
                :key="`compact-retreat-${entry.value}`"
                class="border rounded-xs px-3 py-2 text-left hover:bg-accent/5"
                :class="selectedRetreatRule === entry.value ? 'border-accent text-accent bg-accent/10' : 'border-accent/20 text-muted'"
                @click="selectedRetreatRule = entry.value"
              >
                <p class="text-[10px]">{{ entry.label }}</p>
                <p class="text-[10px] mt-1 leading-4 text-muted">{{ entry.description }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2 mb-3">
        <div v-for="region in visibleRegionSummaries" :key="region.id" class="border border-accent/20 rounded-xs p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-accent">{{ region.name }}</p>
              <p class="text-xs text-muted mt-1 leading-5" :class="isCompactMobile ? 'compact-clamp-3' : ''">{{ region.description }}</p>
            </div>
            <span class="text-[10px] shrink-0" :class="region.unlocked ? 'text-success' : 'text-muted'">
              {{ region.unlocked ? '已解锁' : '未解锁' }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mt-3">
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
              <span class="text-muted">地图勘明</span>
              <span>{{ getRegionKnowledgeSummary(region.id).surveyLabel }}</span>
            </div>
          </div>

          <p class="text-[10px] text-muted mt-2 leading-4">
            认知进度：情报 {{ getRegionKnowledgeSummary(region.id).intel }} / 勘明 {{ getRegionKnowledgeSummary(region.id).survey }} / 熟域 {{ getRegionKnowledgeSummary(region.id).familiarity }}
          </p>

          <div v-if="region.unlocked" class="mt-3 space-y-2">
            <div
              class="border border-accent/10 rounded-xs px-3 py-3 overflow-hidden"
              style="background-image: linear-gradient(135deg, rgba(168, 138, 86, 0.12), rgba(24, 24, 24, 0.04));"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] text-muted">卷轴路网</p>
                  <p class="text-xs text-accent mt-1">{{ getRegionMapBoardSummary(region.id).headline }}</p>
                  <p v-if="isCompactMobile" class="text-[10px] text-muted mt-2 leading-4">左右滑动看路段，路线按钮仍以下方清单为准。</p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="text-[10px]" :class="getRegionFogMeta(region.id).toneClass">{{ getRegionFogMeta(region.id).label }}</span>
                  <p class="text-[10px] text-muted mt-1">{{ getRegionMapBoardSummary(region.id).subhead }}</p>
                </div>
              </div>

              <div class="mt-3 space-y-3">
                <div
                  class="region-map-scroll-rail overflow-x-auto pb-1"
                  :data-testid="`region-map-rail-${region.id}`"
                >
                  <div class="region-map-scroll-track flex items-stretch gap-2 min-w-[540px] md:min-w-[700px]">
                    <template v-for="(node, index) in getRegionMapNodes(region.id)" :key="`map-node-${node.key}`">
                      <div
                        class="region-map-scroll-card w-36 md:w-40 shrink-0 border rounded-xs px-3 py-2"
                        :class="getMapNodeCardClass(node)"
                        :data-node-current="isFocusedMapNode(region.id, node, index) ? 'true' : undefined"
                        :data-node-autofocus="selectedRegionId === region.id && index === 0 ? 'true' : undefined"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span class="text-[10px]" :class="node.laneToneClass">{{ node.laneLabel }}</span>
                          <span class="text-[10px]" :class="node.stageToneClass">{{ node.stageLabel }}</span>
                        </div>
                        <p class="text-xs text-accent mt-2">{{ node.title }}</p>
                        <p class="text-[10px] text-muted mt-1 leading-4" :class="isCompactMobile ? 'compact-clamp-3' : ''">{{ node.description }}</p>
                        <div class="mt-2 space-y-1" v-if="node.detailLines.length > 0">
                          <p v-for="line in node.detailLines.slice(0, 3)" :key="`${node.key}-${line}`" class="text-[10px] text-muted leading-4">
                            · {{ line }}
                          </p>
                        </div>
                        <button
                          class="mt-3 w-full border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                          :class="node.disabled ? 'opacity-60 text-muted' : ''"
                          :aria-disabled="node.disabled"
                          :title="node.disabledReason"
                          @click="handleMapNodeAction(node)"
                        >
                          {{ node.actionLabel }}
                        </button>
                      </div>

                      <div
                        v-if="index < getRegionMapNodes(region.id).length - 1"
                        class="w-12 shrink-0 flex flex-col items-center justify-center text-[10px] text-muted"
                      >
                        <div class="h-px w-full bg-accent/15"></div>
                        <span class="mt-1">{{ index === 1 ? '营地位' : index === getRegionMapNodes(region.id).length - 2 ? '深推' : '推进' }}</span>
                      </div>
                    </template>
                  </div>
                </div>

                <div v-if="getSecondaryMapNodes(region.id).length > 0" class="region-map-scroll-rail overflow-x-auto pb-1">
                  <div class="region-map-scroll-track flex items-stretch gap-2 min-w-[280px] md:min-w-[360px] pl-5 md:pl-8">
                    <div class="w-16 shrink-0 flex items-center justify-center text-[10px] text-success">支线岔口</div>
                    <div
                      v-for="node in getSecondaryMapNodes(region.id)"
                      :key="`map-side-${node.key}`"
                      class="region-map-scroll-card w-36 md:w-40 shrink-0 border rounded-xs px-3 py-2"
                      :class="getMapNodeCardClass(node)"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px]" :class="node.laneToneClass">{{ node.laneLabel }}</span>
                        <span class="text-[10px]" :class="node.stageToneClass">{{ node.stageLabel }}</span>
                      </div>
                      <p class="text-xs text-accent mt-2">{{ node.title }}</p>
                      <p class="text-[10px] text-muted mt-1 leading-4" :class="isCompactMobile ? 'compact-clamp-3' : ''">{{ node.description }}</p>
                      <div class="mt-2 space-y-1" v-if="node.detailLines.length > 0">
                        <p v-for="line in node.detailLines.slice(0, 2)" :key="`${node.key}-detail-${line}`" class="text-[10px] text-muted leading-4">
                          · {{ line }}
                        </p>
                      </div>
                      <button
                        class="mt-3 w-full border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                        :class="node.disabled ? 'opacity-60 text-muted' : ''"
                        :aria-disabled="node.disabled"
                        :title="node.disabledReason"
                        @click="handleMapNodeAction(node)"
                      >
                        {{ node.actionLabel }}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  v-if="isCompactMobile"
                  class="w-full border border-accent/20 rounded-xs px-3 py-2 text-[10px] text-accent hover:bg-accent/5"
                  @click="toggleCompactRegionSection(region.id)"
                >
                  {{ isCompactRegionSectionOpen(region.id) ? '收起区域细节' : '展开区域细节' }}
                </button>
              </div>
            </div>

            <div v-if="!isCompactMobile || isCompactRegionSectionOpen(region.id)" class="space-y-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">季节变体快照</p>
                  <span class="text-[10px]" :class="getRegionVariantSnapshot(region.id).activeVariantId ? 'text-warning' : 'text-success'">
                    {{ getRegionVariantSnapshot(region.id).activeVariantId ? getRegionVariantSnapshot(region.id).activeVariantLabel : '常态版图' }}
                  </span>
                </div>
                <p class="text-xs text-accent mt-1">{{ getRegionVariantSnapshot(region.id).summary }}</p>
                <div class="space-y-1 mt-2">
                  <p
                    v-for="line in getRegionVariantSnapshot(region.id).detailLines.slice(0, 3)"
                    :key="`${region.id}-variant-${line}`"
                    class="text-[10px] text-muted leading-4"
                  >
                    路 {{ line }}
                  </p>
                </div>
              </div>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-muted">本周传闻板</p>
                  <span
                    class="text-[10px]"
                    :class="getRegionRumorBoard(region.id).some(entry => !entry.fulfilled) ? 'text-warning' : 'text-success'"
                  >
                    {{ getRegionRumorBoard(region.id).length }} 条
                  </span>
                </div>
                <p v-if="getRegionRumorBoard(region.id).length === 0" class="text-[10px] text-muted mt-2 leading-4">
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
                        <p class="text-[10px] text-accent">{{ entry.title }}</p>
                        <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.summary }}</p>
                        <p class="text-[10px] text-muted mt-1 leading-4">
                          {{ entry.sourceNpcName }} / {{ entry.sourceLocation }} / {{ entry.relationshipStageLabel }}
                        </p>
                      </div>
                      <span class="text-[10px] shrink-0" :class="entry.fulfilled ? 'text-success' : 'text-warning'">
                        {{ entry.fulfilled ? '已兑现' : '待兑现' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div class="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                class="border border-danger/20 rounded-xs px-2 py-1 text-[10px] text-danger hover:bg-danger/5"
                :class="[isCompactMobile ? 'w-full' : '', !canChallengeBoss(region.id) ? 'opacity-60' : '']"
                :aria-disabled="!canChallengeBoss(region.id)"
                :title="getBossDisabledReason(region.id)"
                :data-testid="`region-boss-primary-${region.id}`"
                @click="handleRunBoss(region.id)"
              >
                发起首领远征
              </button>
              </div>
              <p v-if="getBossDisabledReason(region.id)" class="text-[10px] text-muted leading-4">
                {{ getBossDisabledReason(region.id) }}
              </p>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[10px] text-muted mb-2">首领准备</p>
              <p class="text-xs text-accent">{{ getBossMapPreview(region.id).description }}</p>
              <div class="flex items-center justify-between gap-2 mt-2">
                <span class="text-[10px]" :class="getBossMapPreview(region.id).stageToneClass">{{ getBossMapPreview(region.id).stageLabel }}</span>
                <span class="text-[10px] text-muted">{{ getBossPrepSummary(region.id).headline }}</span>
              </div>
              <div class="mt-2 space-y-1" v-if="getBossMapPreview(region.id).detailLines.length > 0">
                <p
                  v-for="line in getBossMapPreview(region.id).detailLines"
                  :key="`${region.id}-boss-map-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
              </div>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[10px] text-muted mb-2">回流承接</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="panel in getLinkedPanels(region.linkedSystems)"
                  :key="`${region.id}-${panel.key}`"
                  class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                  @click="handleNavigate(panel.key)"
                >
                  去{{ panel.label }}
                </button>
              </div>
              </div>

              <div class="border border-accent/10 rounded-xs px-3 py-2">
              <p class="text-[10px] text-muted mb-2">本区重点承接</p>
              <p class="text-xs text-accent">{{ getRegionHandoffSummary(region.id).headline }}</p>
              <div class="mt-2 space-y-1" v-if="getRegionHandoffSummary(region.id).detailLines.length > 0">
                <p
                  v-for="line in getRegionHandoffSummary(region.id).detailLines"
                  :key="`${region.id}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
              </div>

              <div class="space-y-2">
                <div class="border border-accent/10 rounded-xs px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[10px] text-muted">本周区域事件</p>
                  <span class="text-[10px] text-accent">{{ getActiveRegionEvents(region.id).length }}/{{ getRegionWeeklyEventCapacity(region.id) }}</span>
                </div>
                <p v-if="getActiveRegionEvents(region.id).length === 0" class="text-[10px] text-muted mt-2 leading-4">
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
                        <p class="text-[10px] text-muted mt-0.5 leading-4">{{ event.description }}</p>
                        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted">
                          <span>体力 {{ event.staminaCost }}</span>
                          <span>耗时 {{ event.timeCostHours }}h</span>
                          <span>资源 +{{ event.rewardAmount }}</span>
                        </div>
                        <p v-if="event.encounterHint" class="text-[10px] text-muted mt-1 leading-4">
                          - {{ event.encounterHint }}
                        </p>
                        <p v-if="event.handoffHint" class="text-[10px] text-accent/80 mt-1 leading-4">
                          -> {{ event.handoffHint }}
                        </p>
                      </div>
                      <span class="text-[10px] shrink-0 text-muted">本周 {{ event.weeklyCompletions }}/{{ event.maxWeeklyCompletions ?? 1 }}</span>
                    </div>

                    <div class="flex flex-wrap gap-2 mt-2">
                      <button
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                        :class="!canRunEvent(event.id) ? 'opacity-60' : ''"
                        :aria-disabled="!canRunEvent(event.id)"
                        :title="getEventDisabledReason(event.id)"
                        @click="handleRunEvent(event.id)"
                      >
                        处理事件
                      </button>
                    </div>
                    <p v-if="getEventDisabledReason(event.id)" class="text-[10px] text-muted mt-2 leading-4">
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
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-xs text-accent">{{ getRouteMapPreview(route).title }}</p>
                      <span class="text-[10px]" :class="getRouteMapPreview(route).stageToneClass">{{ getRouteMapPreview(route).stageLabel }}</span>
                      <span class="border border-accent/10 rounded-xs px-1.5 py-0.5 text-[10px] text-muted">{{ getRouteTypeLabel(route.nodeType) }}</span>
                    </div>
                    <p class="text-[10px] text-muted mt-1 leading-4" :class="isCompactMobile ? 'compact-clamp-3' : ''">{{ getRouteMapPreview(route).description }}</p>
                    <div class="flex flex-wrap gap-2 mt-2 text-[10px] text-muted">
                      <span v-if="getRouteMapPreview(route).stage !== 'unknown'">认知 {{ getRouteKnowledgeSummary(route.id).intelLabel }}</span>
                      <span v-if="getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered'">体力 {{ route.staminaCost }}</span>
                      <span v-if="getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered'">耗时 {{ route.timeCostHours }}h</span>
                      <span v-if="getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered'">熟悉 {{ getRouteKnowledgeSummary(route.id).familiarityLabel }}</span>
                      <span
                        v-if="getRouteMapPreview(route).stage === 'mastered' || getRouteMapPreview(route).stage === 'surveyed'"
                        :class="getRouteShortcutSummary(route.id).toneClass"
                      >
                        {{ getRouteShortcutSummary(route.id).label }}
                      </span>
                    </div>
                    <div v-if="getRouteDispatchSignals(route).length > 0" class="flex flex-wrap gap-2 mt-2">
                      <span
                        v-for="signal in getRouteDispatchSignals(route)"
                        :key="`${route.id}-${signal.label}`"
                        class="border rounded-xs px-2 py-0.5 text-[10px]"
                        :class="signal.shellClass"
                      >
                        <span :class="signal.toneClass">{{ signal.label }}</span>
                      </span>
                    </div>
                  </div>
                  <span class="text-[10px] shrink-0 text-muted">{{ getRouteCompletionLabel(route.id) }}</span>
                </div>

                <div :class="isCompactMobile ? 'flex flex-col gap-2 mt-3' : 'flex flex-wrap gap-2 mt-2'">
                  <button
                    class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
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
                  class="mt-2 w-full border border-accent/20 rounded-xs px-3 py-2 text-[10px] text-accent hover:bg-accent/5"
                  @click="toggleCompactRouteDetails(route.id)"
                >
                  {{ isCompactRouteDetailsOpen(route.id) ? '收起路线细节' : '展开路线细节' }}
                </button>

                <div v-if="!isCompactMobile || isCompactRouteDetailsOpen(route.id)" class="mt-2 space-y-2">
                  <p v-if="getRouteMapPreview(route).stage !== 'unknown'" class="text-[10px] text-muted leading-4">
                    路线勘明 {{ getRouteKnowledgeSummary(route.id).surveyProgress }}/100 · 熟悉 {{ getRouteKnowledgeSummary(route.id).familiarity }}/100
                  </p>
                  <p
                    v-if="getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered'"
                    class="text-[10px] leading-4"
                    :class="getAutoPatrolStatus(route.id).mode === 'blocked' ? 'text-warning' : getRouteShortcutSummary(route.id).level === 'none' ? 'text-muted' : 'text-accent/80'"
                  >
                    {{ getRouteDispatchSummary(route) }}
                  </p>
                  <p v-if="route.encounterHint && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')" class="text-[10px] text-muted leading-4">
                    - {{ route.encounterHint }}
                  </p>
                  <p v-if="route.handoffHint && (getRouteMapPreview(route).stage === 'surveyed' || getRouteMapPreview(route).stage === 'mastered')" class="text-[10px] text-accent/80 leading-4">
                    -> {{ route.handoffHint }}
                  </p>
                  <div
                    v-if="getActiveCompanionContract(route.id) || getCompanionContractCandidates(route.id).length > 0"
                    class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/50"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-[10px] text-muted">同伴远行合同</p>
                      <span class="text-[10px]" :class="getActiveCompanionContract(route.id) ? 'text-warning' : 'text-muted'">
                        {{ getActiveCompanionContract(route.id) ? '已挂合同' : '可派合同' }}
                      </span>
                    </div>
                    <template v-if="getActiveCompanionContract(route.id)">
                      <p class="text-[10px] text-accent mt-2">
                        {{ getActiveCompanionContract(route.id)?.npcName }} / {{ getActiveCompanionContract(route.id)?.relationshipStageLabel }}
                      </p>
                      <p class="text-[10px] text-muted mt-1 leading-4">{{ getActiveCompanionContract(route.id)?.summary }}</p>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <button
                          class="border border-danger/20 rounded-xs px-2 py-1 text-[10px] text-danger hover:bg-danger/5"
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
                        class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                        :class="isCompactMobile ? 'w-full' : ''"
                        @click="handleAssignCompanionContract(route.id, candidate.npcId)"
                      >
                        挂 {{ candidate.npcName }}
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="getRouteDisabledReason(route.id)" class="text-[10px] text-muted mt-2 leading-4">
                  {{ getRouteDisabledReason(route.id) }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[10px] text-muted">锁区预览</p>
                <p class="text-xs text-accent mt-1">当前区域尚未开放，不会展开路线、首领和事件操作。</p>
              </div>
              <span class="text-[10px] shrink-0 text-warning">待解锁</span>
            </div>
            <div class="mt-3 space-y-2 text-[10px] leading-4">
              <p class="text-muted">解锁条件：{{ getUnlockSummary(region.id) }}</p>
              <p class="text-muted">主题方向：{{ region.themeHint }}</p>
              <p class="text-accent/80">解锁后承接：{{ region.linkedSystems.join(' / ') }}</p>
              <p class="text-muted">先满足解锁条件，下面这些路网、路线和首领入口才会真正开放。</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-bg/70">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] tracking-[0.24em] text-accent/70">总览摘要</p>
            <p class="text-xs text-accent mt-1">把全局状态放到后面看，不抢当前区域操作。</p>
          </div>
          <span class="text-[10px] text-muted shrink-0">主题周 {{ currentThemeWeekLabel }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <div
            v-for="card in compactSummaryCards"
            :key="`compact-summary-${card.label}`"
            class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
          >
            <p class="text-[10px] text-muted">{{ card.label }}</p>
            <p class="text-sm mt-1" :class="card.toneClass">{{ card.value }}</p>
          </div>
        </div>
      </div>

      <div v-if="isCompactMobile" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] tracking-[0.24em] text-accent/70">前线导向</p>
            <p class="text-xs text-accent mt-1">{{ regionMapStore.frontierDigest.headline }}</p>
          </div>
          <button
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
            @click="mobileDigestExpanded = !mobileDigestExpanded"
          >
            {{ mobileDigestExpanded ? '收起' : '展开' }}
          </button>
        </div>

        <div v-if="mobileDigestExpanded" class="mt-3 space-y-1">
          <p
            v-for="line in regionMapStore.frontierDigest.highlightSummaries"
            :key="`compact-digest-highlight-${line}`"
            class="text-[10px] text-muted leading-4"
          >
            - {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.nextHookSummaries"
            :key="`compact-digest-hook-${line}`"
            class="text-[10px] text-accent/80 leading-4"
          >
            -> {{ line }}
          </p>
          <p
            v-for="line in regionMapStore.frontierDigest.riskSummaries"
            :key="`compact-digest-risk-${line}`"
            class="text-[10px] text-warning leading-4"
          >
            ! {{ line }}
          </p>
        </div>
      </div>

      <div v-if="currentSession && false" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">进行中远征：{{ currentSession.targetName }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">
              {{ currentSessionRegionLabel }} / {{ currentSession.mode === 'boss' ? '首领远征' : '路线远征' }} / {{ currentSessionStatusLabel }}
            </p>
          </div>
          <span class="text-[10px] shrink-0" :class="currentSession.status === 'failure' ? 'text-danger' : currentSession.status === 'ready_to_settle' ? 'text-success' : 'text-accent'">
            {{ currentSession.progressStep }}/{{ currentSession.totalSteps }}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-[10px] mt-3">
          <div class="flex items-center justify-between"><span class="text-muted">生命</span><span>{{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">士气</span><span>{{ currentSession.morale }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">风险</span><span>{{ currentSession.danger }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">视野</span><span>{{ currentSession.visibility }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">负重</span><span>{{ currentSession.carryLoad }}/{{ currentSession.maxCarryLoad }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">发现</span><span>{{ currentSession.findings }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">口粮</span><span>{{ currentSession.supplies.rations }}</span></div>
          <div class="flex items-center justify-between"><span class="text-muted">药剂 / 器具</span><span>{{ currentSession.supplies.medicine }} / {{ currentSession.supplies.utility }}</span></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/50">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] text-muted">前线态势</p>
              <span class="text-[10px] text-accent">准备 {{ currentSession.frontlinePrep }}</span>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mt-2">
              <div class="flex items-center justify-between">
                <span class="text-muted">天气</span>
                <span :class="getWeatherToneClass(currentSession.riskState.weather)">{{ getWeatherLabel(currentSession.riskState.weather) }}</span>
              </div>
              <div class="flex items-center justify-between"><span class="text-muted">污染</span><span>{{ currentSession.riskState.pollution }}</span></div>
              <div class="flex items-center justify-between"><span class="text-muted">警戒</span><span>{{ currentSession.riskState.alertness }}</span></div>
              <div class="flex items-center justify-between"><span class="text-muted">异变</span><span>{{ currentSession.riskState.anomaly }}</span></div>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/50">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] text-muted">携带层</p>
              <span class="text-[10px]" :class="currentSession.carryItems.length > 0 ? 'text-accent' : 'text-muted'">{{ currentSession.carryItems.length }} 项</span>
            </div>
            <div v-if="currentSession.carryItems.length > 0" class="space-y-1 mt-2">
              <p v-for="item in currentSession.carryItems" :key="item.id" class="text-[10px] leading-4">
                <span class="text-accent">{{ item.label }} x{{ item.quantity }}</span>
                <span class="text-muted"> · {{ getCarryCategoryLabel(item.category) }} · 负重 {{ item.burden }}</span>
              </p>
            </div>
            <p v-else class="text-[10px] text-muted mt-2 leading-4">当前没有额外途中携带物。</p>
          </div>
        </div>

        <div class="mt-3 border border-accent/10 rounded-xs px-3 py-2 bg-bg/50">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] text-muted">事件链留痕</p>
            <span class="text-[10px]" :class="currentSession.queuedEncounterKind ? 'text-warning' : 'text-muted'">
              {{ currentSession.queuedEncounterKind ? `后续指向 ${getEncounterKindLabel(currentSession.queuedEncounterKind)}` : '暂无强制后续' }}
            </span>
          </div>
          <div v-if="currentSessionEncounterTrail.length > 0" class="space-y-1 mt-2">
            <p v-for="entry in currentSessionEncounterTrail" :key="entry.id" class="text-[10px] leading-4">
              <span class="text-accent">{{ getEncounterKindLabel(entry.kind) }}</span>
              <span class="text-muted"> · {{ entry.summary }}</span>
              <span v-if="entry.nextKind" class="text-warning"> · 后续 {{ getEncounterKindLabel(entry.nextKind) }}</span>
            </p>
          </div>
          <p v-else class="text-[10px] text-muted mt-2 leading-4">当前还没有形成可追踪的遭遇留痕。</p>
        </div>

        <div v-if="currentSessionShortcutSummary" class="mt-3 border border-accent/10 rounded-xs px-3 py-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] text-muted">熟路态势</p>
            <span class="text-[10px]" :class="currentSessionShortcutSummary.toneClass">{{ currentSessionShortcutSummary.label }}</span>
          </div>
          <p class="text-[10px] mt-2 leading-4" :class="currentSessionShortcutSummary.level === 'none' ? 'text-muted' : 'text-accent'">
            {{ currentSessionShortcutSummary.headline }}
          </p>
          <p class="text-[10px] mt-1 leading-4" :class="currentSessionShortcutSummary.level === 'none' ? 'text-muted' : 'text-success'">
            {{ currentSessionShortcutSummary.benefitSummary }}
          </p>
        </div>

        <div class="mt-3 border border-accent/10 rounded-xs px-3 py-2 bg-bg/50">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[10px] text-muted">当前旅程节点</p>
            <span class="text-[10px] text-accent">{{ currentSessionNodeHeadline }}</span>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="entry in currentSession.nodeHistory"
              :key="entry.id"
              class="border rounded-xs px-2 py-1 text-[10px]"
              :class="entry.lane === 'camp' ? 'border-success/20 text-success' : entry.lane === 'branch' ? 'border-warning/20 text-warning' : entry.lane === 'deep' || entry.lane === 'boss' ? 'border-danger/20 text-danger' : 'border-accent/20 text-accent'"
            >
              {{ entry.step > 0 ? `第 ${entry.step} 节点` : '出发' }} · {{ entry.label }}
            </span>
          </div>
        </div>

        <div
          v-if="currentSession.status === 'ongoing' && currentSessionNodeChoices.length > 0 && !currentSession.pendingEncounter && !currentSession.campState"
          class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-bg/50"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] text-muted">下一节点选择</p>
              <p class="text-[10px] text-accent mt-1">这一段不再是纯步数推进，你可以先定这一步往主线还是侧线走。</p>
            </div>
            <span class="text-[10px] text-muted shrink-0">{{ currentSession.progressStep + 1 }}/{{ currentSession.totalSteps }}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
            <button
              v-for="choice in currentSessionNodeChoices"
              :key="`${currentSession.sessionId}-${choice.id}`"
              class="border rounded-xs px-3 py-3 text-left hover:bg-accent/5"
              :class="choice.lane === 'branch' ? 'border-warning/20' : choice.lane === 'deep' || choice.lane === 'boss' ? 'border-danger/20' : 'border-accent/20'"
              @click="handleAdvanceExpedition(choice.id)"
            >
              <div class="flex items-center justify-between gap-3">
                <p
                  class="text-[10px]"
                  :class="choice.lane === 'branch' ? 'text-warning' : choice.lane === 'deep' || choice.lane === 'boss' ? 'text-danger' : 'text-accent'"
                >
                  {{ choice.label }}
                </p>
                <span class="text-[10px] text-muted shrink-0">{{ getNodeLaneSummary(choice.lane) }}</span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ choice.summary }}</p>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mt-3">
          <button
            class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
            :disabled="currentSession.status !== 'ongoing' || currentSession.campUsed || Boolean(currentSession.pendingEncounter) || Boolean(currentSession.campState)"
            @click="handleCampExpedition"
          >
            搭前线营地
          </button>
          <button
            class="border border-danger/20 rounded-xs px-2 py-1 text-[10px] text-danger hover:bg-danger/5"
            :disabled="currentSession.status !== 'ongoing'"
            @click="handleRetreatExpedition"
          >
            主动撤退
          </button>
          <button
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
            :disabled="currentSession.status === 'ongoing'"
            @click="handleSettleExpedition"
          >
            结算收束
          </button>
        </div>

        <div v-if="currentSession.campState" class="mt-3 border border-success/20 rounded-xs px-3 py-3 bg-success/5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-accent">前线营地</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ currentSession.campState.nightEventHint }}</p>
            </div>
            <span class="text-[10px] text-success shrink-0">已扎营</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
            <button
              v-for="actionId in currentSession.campState.availableActionIds"
              :key="`${currentSession.sessionId}-camp-${actionId}`"
              class="border rounded-xs px-3 py-3 text-left hover:bg-bg/40"
              :class="actionId === 'rest' || actionId === 'mark' ? 'border-success/20' : actionId === 'scout' ? 'border-warning/20' : 'border-accent/20'"
              @click="handleResolveCampAction(actionId)"
            >
              <p class="text-[10px]" :class="CAMP_ACTION_META[actionId]?.toneClass ?? 'text-accent'">{{ CAMP_ACTION_META[actionId]?.label ?? actionId }}</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ CAMP_ACTION_META[actionId]?.summary ?? '' }}</p>
            </button>
          </div>
          <p class="text-[10px] text-muted mt-2 leading-4">营地动作完成后，才会继续回到节点选择；若预设为“扎营后收束”，则会在动作完成后直接返程。</p>
        </div>

        <div v-if="currentSession.pendingEncounter" class="mt-3 border border-warning/20 rounded-xs px-3 py-3 bg-warning/5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-accent">途中遭遇：{{ currentSession.pendingEncounter.title }}</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ currentSession.pendingEncounter.summary }}</p>
            </div>
            <span class="text-[10px] shrink-0" :class="currentSession.pendingEncounter.risk === 'high' ? 'text-danger' : currentSession.pendingEncounter.risk === 'medium' ? 'text-warning' : 'text-success'">
              {{ currentSession.pendingEncounter.risk === 'high' ? '高风险' : currentSession.pendingEncounter.risk === 'medium' ? '中风险' : '低风险' }}
            </span>
          </div>
          <div v-if="currentSession.pendingEncounter.detailLines.length > 0" class="mt-2 space-y-1">
            <p v-for="line in currentSession.pendingEncounter.detailLines" :key="`${currentSession.pendingEncounter.id}-${line}`" class="text-[10px] text-muted leading-4">- {{ line }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <button
              v-for="option in currentSession.pendingEncounter.options"
              :key="`${currentSession.pendingEncounter.id}-${option.id}`"
              class="border rounded-xs px-2 py-2 text-left hover:bg-accent/5"
              :class="option.tone === 'danger' ? 'border-danger/20' : option.tone === 'success' ? 'border-success/20' : 'border-accent/20'"
              @click="handleResolveEncounter(option.id)"
            >
              <p class="text-[10px]" :class="option.tone === 'danger' ? 'text-danger' : option.tone === 'success' ? 'text-success' : 'text-accent'">{{ option.label }}</p>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ option.summary }}</p>
            </button>
          </div>
        </div>

        <div class="mt-3 border border-accent/10 rounded-xs px-3 py-2">
          <p class="text-[10px] text-muted mb-2">旅程日志</p>
          <div class="space-y-2" v-if="currentSession.journal.length > 0">
            <div
              v-for="entry in currentSession.journal.slice().reverse()"
              :key="entry.id"
              class="border rounded-xs px-2 py-2"
              :class="entry.tone === 'danger' ? 'border-danger/20' : entry.tone === 'success' ? 'border-success/20' : 'border-accent/10'"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-[10px]" :class="entry.tone === 'danger' ? 'text-danger' : entry.tone === 'success' ? 'text-success' : 'text-accent'">
                  {{ entry.title }}
                </p>
                <span class="text-[10px] text-muted">{{ entry.step > 0 ? `第 ${entry.step} 节点` : '出发' }}</span>
              </div>
              <p class="text-[10px] text-muted mt-1 leading-4">{{ entry.summary }}</p>
              <div v-if="entry.effects.length > 0" class="mt-1 space-y-1">
                <p v-for="effect in entry.effects" :key="`${entry.id}-${effect}`" class="text-[10px] text-muted leading-4">- {{ effect }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RegionExpeditionStagePanel
        v-if="currentSession"
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

      <div v-if="latestJourneyAftermathSummary" class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">旅后分发：{{ latestJourneyAftermathSummary.entry.targetName }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">
              {{ latestJourneyAftermathSummary.regionName }} / {{ latestJourneyAftermathSummary.entry.mode === 'boss' ? '首领远征' : '路线远征' }} / 最近一次回城结果
            </p>
            <div v-if="latestJourneyAftermathSummary.actions.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="action in latestJourneyAftermathSummary.actions"
                :key="`latest-activated-${latestJourneyAftermathSummary.entry.id}-${action.key}`"
                class="border border-accent/20 rounded-xs px-2 py-0.5 text-[10px] text-accent/80"
              >
                已激活 {{ action.label }}
              </span>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <span class="text-[10px]" :class="latestJourneyAftermathSummary.toneClass">
              {{ getArchiveOutcomeLabel(latestJourneyAftermathSummary.entry.outcome) }}
            </span>
            <button
              v-if="isCompactMobile"
              class="mt-2 block border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
              @click="mobileLatestAftermathExpanded = !mobileLatestAftermathExpanded"
            >
              {{ mobileLatestAftermathExpanded ? '收起' : '展开' }}
            </button>
          </div>
        </div>

        <div v-if="!isCompactMobile || mobileLatestAftermathExpanded" class="space-y-3 mt-3">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="border border-accent/10 rounded-xs px-3 py-2">
            <p class="text-[10px] text-muted mb-2">旅程回顾</p>
            <div class="space-y-1">
              <p
                v-for="line in latestJourneyAftermathSummary.journeyLines"
                :key="`latest-journey-${latestJourneyAftermathSummary.entry.id}-${line}`"
                class="text-[10px] text-muted leading-4"
              >
                · {{ line }}
              </p>
            </div>
          </div>

          <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
            <p class="text-[10px] text-muted mb-2">回流分发</p>
            <div class="space-y-1">
              <p
                v-for="line in latestJourneyAftermathSummary.rewardLines"
                :key="`latest-reward-${latestJourneyAftermathSummary.entry.id}-${line}`"
                class="text-[10px] leading-4"
                :class="line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还') ? 'text-success' : 'text-muted'"
              >
                · {{ line }}
              </p>
            </div>
          </div>

          <div class="border border-accent/10 rounded-xs px-3 py-2">
            <p class="text-[10px] text-muted mb-2">后续去向</p>
            <div class="space-y-1">
              <p
                v-for="line in latestJourneyAftermathSummary.aftermathLines"
                :key="`latest-aftermath-${latestJourneyAftermathSummary.entry.id}-${line}`"
                class="text-[10px] text-muted leading-4"
              >
                · {{ line }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="latestJourneyAftermathSummary.handoffBoard" class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-accent/5">
          <p class="text-[10px] text-muted">戏剧化回流入口</p>
          <p class="text-xs text-accent mt-1">{{ latestJourneyAftermathSummary.handoffBoard.headline }}</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
              <p class="text-[10px] text-muted mb-2">资源去向</p>
              <div class="space-y-1">
                <p
                  v-for="line in latestJourneyAftermathSummary.handoffBoard.resourceLines"
                  :key="`latest-resource-flow-${latestJourneyAftermathSummary.entry.id}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>

            <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
              <p class="text-[10px] text-muted mb-2">推荐动作</p>
              <div class="space-y-2">
                <div
                  v-for="action in latestJourneyAftermathSummary.handoffBoard.actionCards"
                  :key="`latest-action-card-${latestJourneyAftermathSummary.entry.id}-${action.key}`"
                  class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-[10px] text-accent">去{{ action.label }}</p>
                        <span class="text-[10px] shrink-0" :class="action.statusToneClass">{{ action.statusLabel }}</span>
                      </div>
                      <p class="text-[10px] text-muted mt-1 leading-4">{{ action.summary }}</p>
                      <p class="text-[10px] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                    </div>
                    <button
                      class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
                      @click="handleNavigate(action.key)"
                    >
                      前往
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
              <p class="text-[10px] text-muted mb-2">为什么现在去</p>
              <div class="space-y-1">
                <p
                  v-for="line in latestJourneyAftermathSummary.handoffBoard.whyNowLines"
                  :key="`latest-why-now-${latestJourneyAftermathSummary.entry.id}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="latestJourneyAftermathSummary.handoffBoard.receiptSections.length > 0" class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              v-for="section in latestJourneyAftermathSummary.handoffBoard.receiptSections"
              :key="`latest-receipt-${latestJourneyAftermathSummary.entry.id}-${section.title}`"
              class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <p class="text-[10px] text-muted">{{ section.title }}</p>
                <span class="text-[10px] shrink-0" :class="section.statusToneClass">{{ section.statusLabel }}</span>
              </div>
              <div class="space-y-1">
                <p
                  v-for="line in section.lines"
                  :key="`latest-receipt-line-${latestJourneyAftermathSummary.entry.id}-${section.title}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="latestJourneyAftermathSummary.actions.length > 0" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="action in latestJourneyAftermathSummary.actions"
            :key="`latest-journey-action-${action.key}`"
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
            @click="handleNavigate(action.key)"
          >
            去{{ action.label }}
          </button>
        </div>
        </div>
      </div>

      <div v-if="regionMapStore.journeyHistory.length > 0" class="border border-accent/20 rounded-xs p-3 mb-3">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="min-w-0">
            <p class="text-xs text-muted">最近远征记录</p>
            <p class="text-[10px] text-muted mt-1 leading-4">最近的推进、撤退和回城会在这里回看。</p>
          </div>
          <button
            v-if="isCompactMobile"
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
            @click="mobileHistoryExpanded = !mobileHistoryExpanded"
          >
            {{ mobileHistoryExpanded ? '收起' : `展开 ${regionMapStore.journeyHistory.length} 条` }}
          </button>
        </div>
        <div v-if="!isCompactMobile || mobileHistoryExpanded" class="space-y-2">
          <div v-for="entry in regionMapStore.journeyHistory" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ entry.targetName }}</p>
                <p class="text-[10px] text-muted mt-0.5 leading-4">{{ getRegionName(entry.regionId) }} / {{ entry.mode === 'boss' ? '首领远征' : '路线远征' }} / {{ getArchiveOutcomeLabel(entry.outcome) }}</p>
              </div>
              <span class="text-[10px] text-muted shrink-0">{{ entry.endedAtDayTag || entry.startedAtDayTag }}</span>
            </div>
            <div class="mt-2 space-y-1">
              <p v-for="line in entry.summaryLines" :key="`${entry.id}-${line}`" class="text-[10px] text-muted leading-4">- {{ line }}</p>
            </div>
            <p v-if="entry.carryItems.length > 0" class="text-[10px] text-muted mt-2 leading-4">
              携带清单：{{ formatCarryManifest(entry.carryItems, 4) }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
                @click="handleSelectJourneyAftermath(entry)"
              >
                设为当前回看
              </button>
              <button
                class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                @click="handleOpenJourneyAftermath(entry)"
              >
                查看旅后处理
              </button>
              <button
                v-for="action in getArchiveAftermathSummary(entry).actions.slice(0, 3)"
                :key="`${entry.id}-action-${action.key}`"
                class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
                @click="handleNavigate(action.key)"
              >
                去{{ action.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedJourneyAftermathSummary" class="border border-accent/20 rounded-xs p-3 mb-3 bg-accent/5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-accent">旅后处理台账：{{ selectedJourneyAftermathSummary.entry.targetName }}</p>
            <p class="text-[10px] text-muted mt-1 leading-4">
              {{ selectedJourneyAftermathSummary.regionName }} / {{ selectedJourneyAftermathSummary.entry.mode === 'boss' ? '首领远征' : '路线远征' }} / 常驻页内回看
            </p>
            <div v-if="selectedJourneyAftermathSummary.actions.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="action in selectedJourneyAftermathSummary.actions"
                :key="`selected-activated-${selectedJourneyAftermathSummary.entry.id}-${action.key}`"
                class="border border-accent/20 rounded-xs px-2 py-0.5 text-[10px] text-accent/80"
              >
                已激活 {{ action.label }}
              </span>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <span class="text-[10px]" :class="selectedJourneyAftermathSummary.toneClass">
              {{ getArchiveOutcomeLabel(selectedJourneyAftermathSummary.entry.outcome) }}
            </span>
            <p class="text-[10px] text-muted mt-1">{{ selectedJourneyAftermathSummary.entry.endedAtDayTag || selectedJourneyAftermathSummary.entry.startedAtDayTag }}</p>
            <button
              v-if="isCompactMobile"
              class="mt-2 block border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
              @click="mobileSelectedAftermathExpanded = !mobileSelectedAftermathExpanded"
            >
              {{ mobileSelectedAftermathExpanded ? '收起' : '展开' }}
            </button>
          </div>
        </div>

        <div v-if="!isCompactMobile || mobileSelectedAftermathExpanded" class="space-y-3 mt-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
            <p class="text-[10px] text-muted mb-2">旅程回顾</p>
            <div class="space-y-1">
              <p
                v-for="line in selectedJourneyAftermathSummary.journeyLines"
                :key="`selected-journey-${selectedJourneyAftermathSummary.entry.id}-${line}`"
                class="text-[10px] text-muted leading-4"
              >
                · {{ line }}
              </p>
            </div>
          </div>

          <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
            <p class="text-[10px] text-muted mb-2">回流分发</p>
            <div class="space-y-1">
              <p
                v-for="line in selectedJourneyAftermathSummary.rewardLines"
                :key="`selected-reward-${selectedJourneyAftermathSummary.entry.id}-${line}`"
                class="text-[10px] leading-4"
                :class="line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还') ? 'text-success' : 'text-muted'"
              >
                · {{ line }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="selectedJourneyAftermathSummary.handoffBoard" class="mt-3 space-y-3">
          <div class="border border-accent/10 rounded-xs px-3 py-3 bg-bg/60">
            <p class="text-[10px] text-muted">后续去向</p>
            <p class="text-xs text-accent mt-1">{{ selectedJourneyAftermathSummary.handoffBoard.headline }}</p>
            <div class="space-y-1 mt-2">
              <p
                v-for="line in selectedJourneyAftermathSummary.aftermathLines"
                :key="`selected-aftermath-${selectedJourneyAftermathSummary.entry.id}-${line}`"
                class="text-[10px] text-muted leading-4"
              >
                · {{ line }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
              <p class="text-[10px] text-muted mb-2">资源去向</p>
              <div class="space-y-1">
                <p
                  v-for="line in selectedJourneyAftermathSummary.handoffBoard.resourceLines"
                  :key="`selected-resource-${selectedJourneyAftermathSummary.entry.id}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>

            <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
              <p class="text-[10px] text-muted mb-2">推荐动作</p>
              <div class="space-y-2">
                <div
                  v-for="action in selectedJourneyAftermathSummary.handoffBoard.actionCards"
                  :key="`selected-action-card-${selectedJourneyAftermathSummary.entry.id}-${action.key}`"
                  class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-[10px] text-accent">去{{ action.label }}</p>
                        <span class="text-[10px] shrink-0" :class="action.statusToneClass">{{ action.statusLabel }}</span>
                      </div>
                      <p class="text-[10px] text-muted mt-1 leading-4">{{ action.summary }}</p>
                      <p class="text-[10px] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                    </div>
                    <button
                      class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
                      @click="handleNavigate(action.key)"
                    >
                      前往
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
              <p class="text-[10px] text-muted mb-2">为什么现在去</p>
              <div class="space-y-1">
                <p
                  v-for="line in selectedJourneyAftermathSummary.handoffBoard.whyNowLines"
                  :key="`selected-why-now-${selectedJourneyAftermathSummary.entry.id}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="selectedJourneyAftermathSummary.handoffBoard.receiptSections.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              v-for="section in selectedJourneyAftermathSummary.handoffBoard.receiptSections"
              :key="`selected-receipt-${selectedJourneyAftermathSummary.entry.id}-${section.title}`"
              class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <p class="text-[10px] text-muted">{{ section.title }}</p>
                <span class="text-[10px] shrink-0" :class="section.statusToneClass">{{ section.statusLabel }}</span>
              </div>
              <div class="space-y-1">
                <p
                  v-for="line in section.lines"
                  :key="`selected-receipt-line-${selectedJourneyAftermathSummary.entry.id}-${section.title}-${line}`"
                  class="text-[10px] text-muted leading-4"
                >
                  · {{ line }}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div class="border border-accent/20 rounded-xs p-3">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="min-w-0">
            <p class="text-xs text-muted">资源家族总览</p>
            <p class="text-[10px] text-muted mt-1 leading-4">把远征回流带来的库存集中看，避免首屏堆太多资源说明。</p>
          </div>
          <button
            v-if="isCompactMobile"
            class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
            @click="mobileLedgerExpanded = !mobileLedgerExpanded"
          >
            {{ mobileLedgerExpanded ? '收起' : `展开 ${regionMapStore.resourceLedgerEntries.length} 组` }}
          </button>
        </div>
        <div v-if="!isCompactMobile || mobileLedgerExpanded" class="space-y-2">
          <div v-for="entry in regionMapStore.resourceLedgerEntries" :key="entry.id" class="border border-accent/10 rounded-xs px-3 py-2">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-accent">{{ entry.label }}</p>
                <p class="text-[10px] text-muted mt-0.5 leading-4">{{ entry.description }}</p>
              </div>
              <span class="text-xs shrink-0">{{ entry.quantity }}</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <button
                class="border border-success/20 rounded-xs px-2 py-1 text-[10px] text-success hover:bg-success/5"
                :disabled="entry.quantity <= 0 || !regionMapStore.resourceFeatureEnabled"
                @click="handlePublicResourceTurnIn(entry.id)"
              >
                交付 1 份
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="settlementDialog"
        class="fixed inset-0 z-50 flex bg-black/45"
        :class="isCompactMobile ? 'items-end justify-stretch px-0' : 'items-center justify-center px-4'"
        @click.self="settlementDialog = null"
      >
        <div
          class="w-full border bg-bg overflow-y-auto"
          :class="[settlementToneClass, isCompactMobile ? 'max-w-none rounded-none px-3 py-3 min-h-[88vh] max-h-[100vh]' : 'max-w-2xl rounded-xs p-4 max-h-[85vh]']"
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
                  <p class="text-[10px] text-muted mb-2">旅程回顾</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in expeditionSettlementDialog?.journeyLines ?? []"
                      :key="`settlement-journey-${line}`"
                      class="text-[11px] leading-5 text-muted"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>

                <div class="border border-success/20 rounded-xs px-3 py-3 bg-success/5">
                  <p class="text-[10px] text-muted mb-2">回流分发</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in expeditionSettlementDialog?.rewardLines ?? []"
                      :key="`settlement-reward-${line}`"
                      class="text-[11px] leading-5"
                      :class="line.includes('物品') || line.includes('资源') || line.includes('发放') || line.includes('返还') ? 'text-success' : 'text-muted'"
                    >
                      · {{ line }}
                    </p>
                  </div>
                </div>

                <div class="border border-accent/10 rounded-xs px-3 py-3">
                  <p class="text-[10px] text-muted mb-2">旅后处理</p>
                  <div class="space-y-1">
                    <p
                      v-for="line in expeditionSettlementDialog?.aftermathLines ?? []"
                      :key="`settlement-aftermath-${line}`"
                      class="text-[11px] leading-5 text-muted"
                    >
                      · {{ line }}
                    </p>
                  </div>

                  <div v-if="expeditionSettlementDialog?.handoffBoard" class="mt-3 border border-accent/10 rounded-xs px-3 py-3 bg-accent/5">
                    <p class="text-[10px] text-muted">戏剧化回流入口</p>
                    <p class="text-[11px] text-accent mt-1">{{ expeditionSettlementDialog?.handoffBoard?.headline }}</p>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                      <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                        <p class="text-[10px] text-muted mb-2">资源去向</p>
                        <div class="space-y-1">
                          <p
                            v-for="line in expeditionSettlementDialog?.handoffBoard?.resourceLines ?? []"
                            :key="`settlement-resource-${line}`"
                            class="text-[10px] text-muted leading-4"
                          >
                            · {{ line }}
                          </p>
                        </div>
                      </div>

                      <div class="border border-success/20 rounded-xs px-3 py-2 bg-success/5">
                        <p class="text-[10px] text-muted mb-2">推荐动作</p>
                        <div class="space-y-2">
                          <div
                            v-for="action in expeditionSettlementDialog?.handoffBoard?.actionCards ?? []"
                            :key="`settlement-action-card-${action.key}`"
                            class="border border-success/20 rounded-xs px-2 py-2 bg-bg/70"
                          >
                            <div class="flex items-start justify-between gap-3">
                              <div class="min-w-0">
                                <p class="text-[10px] text-accent">去{{ action.label }}</p>
                                <p class="text-[10px] text-muted mt-1 leading-4">{{ action.summary }}</p>
                                <p class="text-[10px] text-accent/80 mt-1 leading-4">为什么现在去：{{ action.reason }}</p>
                              </div>
                              <button
                                class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5 shrink-0"
                                @click="handleSettlementAction(action.key)"
                              >
                                前往
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60">
                        <p class="text-[10px] text-muted mb-2">为什么现在去</p>
                        <div class="space-y-1">
                          <p
                            v-for="line in expeditionSettlementDialog?.handoffBoard?.whyNowLines ?? []"
                            :key="`settlement-why-now-${line}`"
                            class="text-[10px] text-muted leading-4"
                          >
                            · {{ line }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div v-if="(expeditionSettlementDialog?.handoffBoard?.receiptSections?.length ?? 0) > 0" class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div
                        v-for="section in expeditionSettlementDialog?.handoffBoard?.receiptSections ?? []"
                        :key="`settlement-receipt-${section.title}`"
                        class="border border-accent/10 rounded-xs px-3 py-2 bg-bg/60"
                      >
                        <p class="text-[10px] text-muted mb-2">{{ section.title }}</p>
                        <div class="space-y-1">
                          <p
                            v-for="line in section.lines"
                            :key="`settlement-receipt-line-${section.title}-${line}`"
                            class="text-[10px] text-muted leading-4"
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
                      class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-accent hover:bg-accent/5"
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
                  class="text-[11px] leading-5 text-muted"
                >
                  {{ line }}
                </p>
              </div>
            </div>
            <button class="border border-accent/20 rounded-xs px-2 py-1 text-[10px] text-muted hover:bg-accent/5" @click="settlementDialog = null">
              关闭
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { Map } from 'lucide-vue-next'
  import JourneySettlementReveal from '@/components/game/regionMap/JourneySettlementReveal.vue'
  import RegionExpeditionStagePanel from '@/components/game/regionMap/RegionExpeditionStagePanel.vue'
  import { navigateToPanel, type PanelKey } from '@/composables/useNavigation'
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
    RegionExpeditionEncounterKind,
    RegionExpeditionEncounterMemory,
    RegionExpeditionNodeLane,
    RegionExpeditionRetreatRule,
    RegionExpeditionWeather,
    RegionId,
    RegionLinkedSystem,
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
  const lastActionSummary = ref('')
  const actionTone = ref<'success' | 'danger' | 'accent'>('success')
  const selectedRegionId = ref<RegionId | null>(regionMapStore.currentWeeklyFocus.focusedRegionId ?? null)
  type SettlementDialogAction = { key: PanelKey; label: string }
  type StatusChip = { statusLabel: string; statusToneClass: string }
  type SettlementDialogActionCard = SettlementDialogAction & { summary: string; reason: string } & StatusChip
  type JourneyHandoffReceiptSection = { title: string; lines: string[] } & StatusChip
  type MapVisibilityStage = 'unknown' | 'heard' | 'surveyed' | 'mastered'
  type RegionMapBoardNode = {
    key: string
    kind: 'route' | 'boss'
    regionId: RegionId
    routeId?: string
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
  type JourneyHandoffBoard = {
    headline: string
    resourceLines: string[]
    actionCards: SettlementDialogActionCard[]
    whyNowLines: string[]
    receiptSections: JourneyHandoffReceiptSection[]
  }
  type RouteDispatchSignal = { label: string; toneClass: string; shellClass: string }
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
  const mobileLedgerExpanded = ref(false)
  const mobileLatestAftermathExpanded = ref(true)
  const mobileSelectedAftermathExpanded = ref(false)
  const compactRegionSectionState = ref<Record<string, boolean>>({})
  const compactRouteDetailState = ref<Record<string, boolean>>({})
  const selectedApproach = ref<RegionExpeditionApproach>('steady')
  const selectedRetreatRule = ref<RegionExpeditionRetreatRule>('balanced')

  const currentDayTag = computed(() => `${gameStore.year}-${gameStore.season}-${gameStore.day}`)
  const currentWeekId = computed(() => getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day).seasonWeekId)

  const currentFocusLabel = computed(() => {
    const focusedId = regionMapStore.metaState.weeklyFocusState.focusedRegionId
    if (!focusedId) return '未设置'
    const match = regionMapStore.regionDefs.find(region => region.id === focusedId)
    return match?.name ?? '未设置'
  })

  const currentThemeWeekLabel = computed(() => goalStore.currentThemeWeek?.name ?? currentWeekId.value)
  const allRegionsSelected = computed(() => selectedRegionId.value === null)
  const selectedRegionFilterLabel = computed(() => {
    if (selectedRegionId.value === null) return '全部区域'
    return regionMapStore.regionDefs.find(region => region.id === selectedRegionId.value)?.name ?? '全部区域'
  })
  const compactSummaryCards = computed(() => [
    { label: '已解锁区域', value: `${regionMapStore.unlockedRegionCount}/${regionMapStore.regionDefs.length}`, toneClass: 'text-accent' },
    { label: '运行中远征', value: regionMapStore.hasActiveExpedition ? '进行中' : '无', toneClass: regionMapStore.hasActiveExpedition ? 'text-success' : 'text-muted' },
    { label: '本周焦点', value: currentFocusLabel.value, toneClass: 'text-accent' },
    { label: '资源家族', value: `${regionMapStore.resourceFamilyDefs.length} 组`, toneClass: 'text-muted' }
  ])
  const visibleRegionSummaries = computed(() =>
    selectedRegionId.value
      ? regionMapStore.regionSummaries.filter(region => region.id === selectedRegionId.value)
      : regionMapStore.regionSummaries
  )
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
  const toggleCompactRegionSection = (regionId: RegionId) => {
    compactRegionSectionState.value = {
      ...compactRegionSectionState.value,
      [regionId]: !compactRegionSectionState.value[regionId]
    }
  }
  const isCompactRegionSectionOpen = (regionId: RegionId) => Boolean(compactRegionSectionState.value[regionId])
  const toggleCompactRouteDetails = (routeId: string) => {
    compactRouteDetailState.value = {
      ...compactRouteDetailState.value,
      [routeId]: !compactRouteDetailState.value[routeId]
    }
  }
  const isCompactRouteDetailsOpen = (routeId: string) => Boolean(compactRouteDetailState.value[routeId])
  const isFocusedMapNode = (regionId: RegionId, node: RegionMapBoardNode, index = 0) => {
    const session = currentSession.value
    if (session?.regionId === regionId) {
      if (session.mode === 'boss') return node.kind === 'boss'
      if (session.routeId && node.kind === 'route' && node.routeId === session.routeId) return true
    }
    return selectedRegionId.value === regionId && index === 0
  }
  const scrollCompactRegionRailIntoView = async () => {
    if (!isCompactMobile.value || !selectedRegionId.value || typeof document === 'undefined') return
    await nextTick()
    const rail = document.querySelector(`[data-testid="region-map-rail-${selectedRegionId.value}"]`) as HTMLElement | null
    if (!rail) return
    const target =
      (rail.querySelector('[data-node-current="true"]') as HTMLElement | null) ??
      (rail.querySelector('[data-node-autofocus="true"]') as HTMLElement | null)
    target?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth'
    })
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
  const getNodeLaneSummary = (lane: RegionExpeditionNodeLane) =>
    lane === 'boss' ? '首领压进' : lane === 'deep' ? '深层推进' : lane === 'branch' ? '支线侧探' : lane === 'camp' ? '前线营地' : '主线推进'
  const getWeatherLabel = (weather: RegionExpeditionWeather) =>
    weather === 'storm' ? '风暴' : weather === 'fog' ? '浓雾' : weather === 'wind' ? '劲风' : '晴稳'
  const getWeatherToneClass = (weather: RegionExpeditionWeather) =>
    weather === 'storm' ? 'text-danger' : weather === 'fog' ? 'text-warning' : weather === 'wind' ? 'text-accent' : 'text-success'
  const getCarryCategoryLabel = (category: RegionExpeditionCarryItemCategory) =>
    category === 'clue' ? '线索' : category === 'refined' ? '精炼' : category === 'supply' ? '补给' : '资源'
  const getEncounterKindLabel = (kind: RegionExpeditionEncounterKind | null) =>
    kind === 'hazard'
      ? '险段'
      : kind === 'cache'
        ? '收获'
        : kind === 'traveler'
          ? '旅者'
          : kind === 'support'
            ? '支援'
            : kind === 'anomaly'
              ? '异变'
              : kind === 'boss_prep'
                ? '前夜'
                : kind === 'weekly_event'
                  ? '事件'
                  : '未定'
  const formatCarryManifest = (carryItems: RegionExpeditionCarryItem[], limit = 4) =>
    carryItems
      .slice(0, limit)
      .map(item => `${item.label} x${item.quantity}（${getCarryCategoryLabel(item.category)} / 负重 ${item.burden}）`)
      .join(' / ')
  const currentSessionEncounterTrail = computed<RegionExpeditionEncounterMemory[]>(() =>
    currentSession.value ? [...currentSession.value.encounterMemory].slice(-4).reverse() : []
  )
  const CAMP_ACTION_META: Record<string, { label: string; summary: string; toneClass: string }> = {
    rest: { label: '休整伤势', summary: '优先回复生命、稳住士气，把营火时间用在恢复。', toneClass: 'text-success' },
    sort: { label: '整理补给', summary: '压低负重、梳理收获，让下一段推进有更多腾挪空间。', toneClass: 'text-accent' },
    mark: { label: '标记路线', summary: '把坡口、路标和回撤线重新钉稳，换更低的后续风险。', toneClass: 'text-success' },
    scout: { label: '观察侦察', summary: '派出夜间观察，提前看清下一个节点的局势。', toneClass: 'text-warning' }
  }
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
  const latestJourneyAftermathSummary = computed(() => {
    const entry = regionMapStore.settlementState.journeyHistory[0] ?? null
    return entry ? getArchiveAftermathSummary(entry) : null
  })
  const selectedJourneyAftermathEntry = computed(() => {
    if (selectedJourneyAftermathId.value) {
      const matched = regionMapStore.settlementState.journeyHistory.find(entry => entry.id === selectedJourneyAftermathId.value) ?? null
      if (matched) return matched
    }
    return regionMapStore.settlementState.journeyHistory[0] ?? null
  })
  const selectedJourneyAftermathSummary = computed(() => {
    const entry = selectedJourneyAftermathEntry.value
    return entry ? getArchiveAftermathSummary(entry) : null
  })
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

  onMounted(() => {
    syncCompactViewportMode()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncCompactViewportMode)
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

  const openSettlementDialog = (title: string, lines: string[], tone: 'success' | 'danger' | 'accent' = 'success') => {
    settlementDialog.value = {
      kind: 'simple',
      title,
      lines: lines.filter(Boolean),
      tone
    }
  }

  const buildSettlementActionPanels = (regionId: RegionId | null) => {
    if (!regionId) return [] as SettlementDialogAction[]
    const region = regionMapStore.regionDefs.find(entry => entry.id === regionId)
    if (!region) return [] as SettlementDialogAction[]
    return getLinkedPanels(region.linkedSystems).slice(0, 4)
  }

  const createStatusChip = (ready: boolean, readyLabel = '已满足', pendingLabel = '待推进'): StatusChip => ({
    statusLabel: ready ? readyLabel : pendingLabel,
    statusToneClass: ready ? 'text-success' : 'text-muted'
  })

  const createJourneyReceiptSection = (
    title: string,
    lines: string[],
    ready: boolean,
    readyLabel = '已形成回执',
    pendingLabel = '待继续推进'
  ): JourneyHandoffReceiptSection => ({
    title,
    lines: lines.filter(Boolean),
    ...createStatusChip(ready, readyLabel, pendingLabel)
  })

  const buildJourneyReceiptSections = (regionId: RegionId | null): JourneyHandoffReceiptSection[] => {
    if (!regionId) return []

    if (regionId === 'ancient_road') {
      const archiveStock = regionMapStore.getFamilyResourceQuantity('ancient_archive')
      const shopFocus = shopStore.activityCampaignOfferRecommendations[0]?.name ?? shopStore.recommendedCatalogOffers[0]?.name ?? ''
      const hanhaiHint = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
      const specialOrderLabel = questStore.specialOrder?.targetItemName ?? questStore.specialOrder?.description ?? ''
      const campaignLabel = questStore.currentLimitedTimeQuestCampaign?.label ?? ''
      const campaignRemainingDays = questStore.currentLimitedTimeQuestRemainingDays ?? 0

      return [
        createJourneyReceiptSection(
          '交差回执',
          [
            questStore.boardQuests.length > 0
              ? `任务板：当前告示栏仍有 ${questStore.boardQuests.length} 条委托待接。`
              : '任务板：当前告示栏暂时没有常规委托堆积。',
            questStore.activeQuests.length > 0 ? `进行中：你手头还有 ${questStore.activeQuests.length} 条任务可一起承接这趟回城结果。` : ''
          ],
          questStore.boardQuests.length > 0 || questStore.activeQuests.length > 0 || archiveStock > 0,
          '可立刻交差',
          '待补委托条件'
        ),
        createJourneyReceiptSection(
          '变现回执',
          [
            archiveStock > 0 ? `库存确认：古迹残卷 ${archiveStock} 份，可立刻转成交付或后续调查。` : '',
            shopFocus ? `商圈周转：当前优先货架是「${shopFocus}」，可直接把荒道收益换成下一趟补给。` : '商圈周转：可先把荒道回收物换成补给、口粮和行装。'
          ],
          archiveStock > 0 || Boolean(shopFocus),
          '可立刻变现',
          '待补可卖收益'
        ),
        createJourneyReceiptSection(
          '解锁后续',
          [
            specialOrderLabel ? `特殊订单：当前可继续承接「${specialOrderLabel}」。` : '',
            campaignLabel ? `活动窗口：${campaignRemainingDays > 0 ? `「${campaignLabel}」剩余 ${campaignRemainingDays} 天。` : `「${campaignLabel}」当前已开启。`}` : '',
            hanhaiHint ? `瀚海延伸：${hanhaiHint}` : ''
          ],
          Boolean(specialOrderLabel) || Boolean(campaignLabel) || Boolean(hanhaiHint),
          '后续已打开',
          '待触发后续'
        )
      ].filter(section => section.lines.length > 0)
    }

    if (regionId === 'mirage_marsh') {
      const specimenStock = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
      const pondContest = fishPondStore.currentPondContestDef?.label ?? ''
      const museumFocus = museumStore.featuredScholarCommissionOverview[0]?.title ?? ''

      return [
        createJourneyReceiptSection(
          '交差回执',
          [
            museumStore.availableScholarCommissionCount > 0
              ? `博物馆：当前还有 ${museumStore.availableScholarCommissionCount} 条学者委托待接。`
              : '博物馆：当前暂无堆积中的学者委托。',
            museumFocus ? `馆务重点：目前优先处理「${museumFocus}」。` : ''
          ],
          museumStore.availableScholarCommissionCount > 0 || Boolean(museumFocus),
          '可立刻交付',
          '待馆务刷新'
        ),
        createJourneyReceiptSection(
          '变现回执',
          [
            specimenStock > 0 ? `样本库存：生态样本 ${specimenStock} 份，可先转展示池或研究交付。` : '',
            pondContest ? `鱼塘周赛：当前「${pondContest}」能立刻消化这趟泽地收获。` : '鱼塘周赛：本周暂无特别点名的周赛承接。'
          ],
          specimenStock > 0 || Boolean(pondContest),
          '可立刻承接',
          '待样本回流'
        ),
        createJourneyReceiptSection(
          '解锁后续',
          [
            fishPondStore.displayOverview.entryCount > 0
              ? `展示池：当前已有 ${fishPondStore.displayOverview.entryCount} 条高光样本在展陈。`
              : '展示池：当前仍可继续把泽地样本推入展示池。',
            goalStore.currentEventCampaign ? `活动承接：当前「${goalStore.currentEventCampaign.label}」也能接住这批样本。` : ''
          ],
          fishPondStore.displayOverview.entryCount > 0 || Boolean(goalStore.currentEventCampaign),
          '后续已打开',
          '待继续沉淀'
        )
      ].filter(section => section.lines.length > 0)
    }

    const crystalStock = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const projectName = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter(project => project.available || project.completed)
      .slice(0, 1)[0]?.name ?? ''

    return [
      createJourneyReceiptSection(
        '交差回执',
        [
          `公会战备：当前位于 ${guildStore.crossSystemOverview.currentRankBandLabel}。`,
          villageProjectStore.overviewSummary.availableProjects > 0
            ? `建设排队：当前仍有 ${villageProjectStore.overviewSummary.availableProjects} 项村庄建设可继续推进。`
            : '建设排队：当前可见建设项已基本处理完毕。'
        ],
        true,
        '可立刻交差',
        '待战备提升'
      ),
      createJourneyReceiptSection(
        '变现回执',
        [
          crystalStock > 0 ? `灵脉结晶：当前库存 ${crystalStock}，可继续转成战备、建设与高阶准备。` : '',
          goalStore.currentThemeWeek?.name ? `主题周放大：本周「${goalStore.currentThemeWeek.name}」会提高高地回流价值。` : ''
        ],
        crystalStock > 0 || Boolean(goalStore.currentThemeWeek?.name),
        '可立刻转化',
        '待形成库存'
      ),
      createJourneyReceiptSection(
        '解锁后续',
        [
          projectName ? `建设前置：下一步可继续推进「${projectName}」。` : '',
          '下一轮：高地成果会优先回灌到公会远征准备与后续建设链。'
        ],
        Boolean(projectName) || villageProjectStore.overviewSummary.availableProjects > 0,
        '建设可继续',
        '待建设解锁'
      )
    ].filter(section => section.lines.length > 0)
  }

  const buildJourneyHandoffBoard = (regionId: RegionId | null): JourneyHandoffBoard | null => {
    if (!regionId) return null

    const allowedKeys = new Set(buildSettlementActionPanels(regionId).map(action => action.key))
    const createActionCard = (
      key: PanelKey,
      label: string,
      summary: string,
      reason: string,
      ready: boolean,
      readyLabel = '可立刻处理',
      pendingLabel = '待准备'
    ): SettlementDialogActionCard => ({
      key,
      label,
      summary,
      reason,
      ...createStatusChip(ready, readyLabel, pendingLabel)
    })

    if (regionId === 'ancient_road') {
      const archiveStock = regionMapStore.getFamilyResourceQuantity('ancient_archive')
      const shopFocus = shopStore.activityCampaignOfferRecommendations[0]?.name ?? shopStore.recommendedCatalogOffers[0]?.name ?? ''
      const hanhaiHint = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
      const questReady = questStore.boardQuests.length > 0 || questStore.activeQuests.length > 0 || archiveStock > 0
      const shopReady = archiveStock > 0 || Boolean(shopFocus)
      const hanhaiReady = Boolean(hanhaiHint)
      const actionCards = [
        createActionCard(
          'quest',
          '任务板',
          archiveStock > 0 ? `先把古迹残卷 ${archiveStock} 份转成交付、委托或调查线索。` : '先检查有没有可承接的残卷交付与调查委托。',
          goalStore.currentEventCampaign
            ? `当前活动「${goalStore.currentEventCampaign.label}」也能直接接住这趟荒道回流。`
            : '任务板最容易把本趟荒道见闻立刻变成明确进度。',
          questReady,
          '可立刻交差',
          '先补委托条件'
        ),
        createActionCard(
          'shop',
          '商圈',
          shopFocus ? `围绕「${shopFocus}」补货，把这趟回城收益转成下一趟远行准备。` : '把荒道回收物换成补给、口粮和下一趟远行物资。',
          shopFocus ? `商圈当前就有「${shopFocus}」这类重点承接。` : '回城后立刻补货，能最快改善下一次出发质量。',
          shopReady,
          '可立刻变现',
          '待补可卖收益'
        ),
        createActionCard(
          'hanhai',
          '瀚海',
          hanhaiHint ? `把荒道带回的路引与线索接进瀚海：${hanhaiHint}` : '把荒道回流继续接成更远的商路、合同或遗迹线。',
          hanhaiHint ? '瀚海当前已经给出了明确的后续动作。' : '荒道最自然的长线出口，就是把线索继续推向瀚海。',
          hanhaiReady,
          '后续已打开',
          '待触发后续'
        )
      ].filter(action => allowedKeys.has(action.key))

      return {
        headline: '荒道回流会优先拆进任务板、商圈与瀚海。',
        resourceLines: [
          archiveStock > 0
            ? `古迹残卷 ${archiveStock} 份 -> 先交任务板，再延伸成商圈补给与瀚海线索。`
            : '荒道文书、残卷和路引会优先流向任务板与瀚海合同链。',
          shopFocus ? `周转物资 -> 商圈优先看「${shopFocus}」，把收益转成补给。` : '补给与周转品可先送去商圈，换成下一趟行囊。'
        ],
        actionCards,
        whyNowLines: getJourneyFollowUpNotes(regionId).slice(0, 4),
        receiptSections: buildJourneyReceiptSections(regionId)
      }
    }

    if (regionId === 'mirage_marsh') {
      const specimenStock = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
      const pondContest = fishPondStore.currentPondContestDef?.label ?? ''
      const museumFocus = museumStore.featuredScholarCommissionOverview[0]?.title ?? ''
      const fishpondReady = specimenStock > 0 || Boolean(pondContest)
      const museumReady = museumStore.availableScholarCommissionCount > 0 || Boolean(museumFocus)
      const actionCards = [
        createActionCard(
          'fishpond',
          '鱼塘',
          specimenStock > 0 ? `先把生态样本 ${specimenStock} 份转进展示池、周赛养成或素材整理。` : '先看鱼塘周赛和展示池，把泽地回流变成持续收益。',
          pondContest ? `本周周赛「${pondContest}」正好能消化这趟泽地收获。` : '鱼塘通常是蜃潮泽地样本最先落地的地方。',
          fishpondReady,
          '可立刻承接',
          '待样本回流'
        ),
        createActionCard(
          'museum',
          '博物馆',
          museumStore.availableScholarCommissionCount > 0
            ? `当前还有 ${museumStore.availableScholarCommissionCount} 条学者委托待接，能立刻消化样本和见闻。`
            : '先检查馆务和学者委托，把这趟样本变成收藏与研究推进。',
          museumFocus ? `馆务重点「${museumFocus}」和这趟泽地素材高度匹配。` : '蜃潮泽地的样本与异闻，最容易直接长进博物馆价值。',
          museumReady,
          '可立刻交付',
          '待馆务刷新'
        )
      ].filter(action => allowedKeys.has(action.key))

      return {
        headline: '泽地回流会优先拆进鱼塘与博物馆。',
        resourceLines: [
          specimenStock > 0
            ? `生态样本 ${specimenStock} 份 -> 先投鱼塘展示 / 周赛，再转博物馆委托。`
            : '泽地带回的样本、藻材和生态线索会优先流向鱼塘与博物馆。',
          museumFocus ? `研究重点 -> 当前馆务「${museumFocus}」可直接承接这趟泽地见闻。` : '研究与展陈需求，通常会吃到泽地带回的样本。'
        ],
        actionCards,
        whyNowLines: getJourneyFollowUpNotes(regionId).slice(0, 4),
        receiptSections: buildJourneyReceiptSections(regionId)
      }
    }

    const crystalStock = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const projectName = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter(project => project.available || project.completed)
      .slice(0, 1)[0]?.name ?? ''
    const guildReady = true
    const villageReady = Boolean(projectName) || villageProjectStore.overviewSummary.availableProjects > 0
    const walletReady = crystalStock > 0 || Boolean(goalStore.currentThemeWeek?.name)
    const actionCards = [
      createActionCard(
        'guild',
        '公会',
        '先去公会把高地推进成果接进战备与下一轮远征准备。',
        `当前公会战备位于 ${guildStore.crossSystemOverview.currentRankBandLabel}，现在最容易承接高地回流。`,
        guildReady,
        '可立刻交差',
        '待战备提升'
      ),
      createActionCard(
        'village',
        '村庄',
        projectName ? `继续推进「${projectName}」等高地建设前置。` : '把高地带回的成果继续投进村庄建设与长期前置。',
        projectName ? `当前就有「${projectName}」这类建设项可继续接力。` : '高地回流和村庄建设的联动最容易形成长期收益。',
        villageReady,
        '建设可继续',
        '待建设解锁'
      ),
      createActionCard(
        'wallet',
        '钱包',
        crystalStock > 0 ? `把灵脉结晶 ${crystalStock} 份继续转成高阶准备、预算与后续投入。` : '把高地回流继续转成高阶准备与预算安排。',
        goalStore.currentThemeWeek?.name ? `本周「${goalStore.currentThemeWeek.name}」会放大这部分高地回流价值。` : '高地收益最怕压仓，尽快转成准备更值。',
        walletReady,
        '可立刻转化',
        '待形成库存'
      )
    ].filter(action => allowedKeys.has(action.key))

    return {
      headline: '高地回流会优先拆进公会、村庄与钱包。',
      resourceLines: [
        crystalStock > 0
          ? `灵脉结晶 ${crystalStock} 份 -> 先补公会战备，再转建设与高阶准备。`
          : '高地带回的晶体、军备和前哨成果会优先流向公会与建设线。',
        projectName ? `建设前置 -> 当前可继续推进「${projectName}」。` : '建设前置会持续消化高地带回的阶段成果。'
      ],
      actionCards,
      whyNowLines: getJourneyFollowUpNotes(regionId).slice(0, 4),
      receiptSections: buildJourneyReceiptSections(regionId)
    }
  }

  const getJourneyFollowUpNotes = (regionId: RegionId) => {
    if (regionId === 'ancient_road') {
      const archiveStock = regionMapStore.getFamilyResourceQuantity('ancient_archive')
      const shopFocus = shopStore.activityCampaignOfferRecommendations[0]?.name ?? shopStore.recommendedCatalogOffers[0]?.name ?? ''
      const hanhaiHint = hanhaiStore.crossSystemOverview.recommendedActions[0] ?? ''
      return [
        archiveStock > 0 ? `任务板：当前古迹残卷 ${archiveStock} 份，可优先转成交付、委托或后续线索。` : '',
        shopFocus ? `商圈：可先围绕「${shopFocus}」补货，把荒道收获变成下一趟远行准备。` : '',
        hanhaiHint ? `瀚海：${hanhaiHint}` : '',
        goalStore.currentEventCampaign ? `活动：当前「${goalStore.currentEventCampaign.label}」也能承接这趟荒道回流。` : ''
      ].filter(Boolean)
    }

    if (regionId === 'mirage_marsh') {
      const specimenStock = regionMapStore.getFamilyResourceQuantity('ecology_specimen')
      const pondContest = fishPondStore.currentPondContestDef?.label ?? ''
      const museumFocus = museumStore.featuredScholarCommissionOverview[0]?.title ?? ''
      return [
        specimenStock > 0 ? `鱼塘/博物馆：当前生态样本 ${specimenStock} 份，可优先转成展示池与学者委托。` : '',
        pondContest ? `鱼塘：本周周赛「${pondContest}」可继续吃到这趟泽地带回的样本与素材。` : '',
        museumStore.availableScholarCommissionCount > 0 ? `博物馆：当前还有 ${museumStore.availableScholarCommissionCount} 条学者委托待接。` : '',
        museumFocus ? `馆务重点：可优先处理「${museumFocus}」。` : ''
      ].filter(Boolean)
    }

    const crystalStock = regionMapStore.getFamilyResourceQuantity('ley_crystal')
    const projectName = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter(project => project.available || project.completed)
      .slice(0, 1)[0]?.name ?? ''
    return [
      crystalStock > 0 ? `公会/钱包：当前灵脉结晶 ${crystalStock} 份，可继续转成高地战备与高阶准备。` : '',
      `公会：当前战备位于 ${guildStore.crossSystemOverview.currentRankBandLabel}，可继续承接高地推进结果。`,
      projectName ? `村庄：可继续推进「${projectName}」等高地建设前置。` : '',
      goalStore.currentThemeWeek?.name ? `主题周：本周「${goalStore.currentThemeWeek.name}」会放大高地回流价值。` : ''
    ].filter(Boolean)
  }

  const getExpeditionSettlementBuckets = (lines: string[]) => {
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
      if (focusedRegionId && selectedRegionId.value !== null) {
        selectedRegionId.value = focusedRegionId
      }
    }
  )

  watch(
    () => regionMapStore.journeyHistory.map(entry => entry.id),
    entryIds => {
      if (entryIds.length === 0) {
        selectedJourneyAftermathId.value = null
        return
      }

      if (!selectedJourneyAftermathId.value || !entryIds.includes(selectedJourneyAftermathId.value)) {
        selectedJourneyAftermathId.value = entryIds[0] ?? null
      }
    },
    { immediate: true }
  )

  const getUnlockSummary = (regionId: RegionId) => regionMapStore.getRegionUnlockProgress(regionId).summary

  const getRegionName = (regionId: RegionId) => regionMapStore.regionDefs.find(region => region.id === regionId)?.name ?? regionId

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
    regionMapStore.metaState.seasonalRegionStates[regionId] ?? {
      regionId,
      weekId: '',
      season: gameStore.season,
      weather: gameStore.weather,
      activeVariantId: null,
      activeVariantLabel: '',
      summary: '当前区域尚未生成季节变体快照。',
      detailLines: [],
      affectedRouteIds: [],
      manualExplorationRequired: false,
      seenVariantIds: [],
      lastUpdatedDayTag: ''
    }

  const getRegionRumorBoard = (regionId: RegionId) => regionMapStore.metaState.rumorBoard.entriesByRegion[regionId] ?? []

  const getAutoPatrolStatus = (routeId: string) =>
    regionMapStore.metaState.autoPatrolStates[routeId] ?? {
      routeId,
      enabled: true,
      mode: 'manual',
      lastAutoSettledDayTag: '',
      lastEvaluatedDayTag: '',
      blockedReason: '',
      blockedTags: []
    }

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

    return lines.slice(0, 3)
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

  const getRegionRoutes = (regionId: RegionId) => regionMapStore.routeDefs.filter(route => route.regionId === regionId)

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

  const isRouteUnlocked = (routeId: string) => regionMapStore.getRouteUnlockStatus(routeId).unlocked

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

  const getMapNodeCardClass = (node: RegionMapBoardNode) =>
    node.kind === 'boss'
      ? node.stageLabel === '未知'
        ? 'border-dashed border-danger/20 bg-bg/40'
        : node.stageLabel === '熟路'
          ? 'border-danger/30 bg-danger/10'
          : 'border-danger/20 bg-danger/5'
      : node.stageLabel === '熟路'
        ? 'border-success/30 bg-success/5'
        : node.stageLabel === '已勘明'
          ? 'border-accent/30 bg-accent/5'
          : node.stageLabel === '已听说'
            ? 'border-warning/20 bg-warning/5'
            : 'border-dashed border-accent/15 bg-bg/40'

  const handleMapNodeAction = (node: RegionMapBoardNode) => {
    if (node.disabled) {
      if (node.disabledReason) {
        setActionSummary(node.disabledReason, 'accent')
        openSettlementDialog('暂时无法前往', [node.disabledReason], 'accent')
      }
      return
    }

    if (node.kind === 'boss') {
      handleRunBoss(node.regionId)
      return
    }

    if (node.routeId) {
      handleRunRoute(node.routeId)
    }
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

  const LINKED_SYSTEM_PANEL_MAP: Record<RegionLinkedSystem, { key: PanelKey; label: string }> = {
    quest: { key: 'quest', label: '任务板' },
    shop: { key: 'shop', label: '商圈' },
    museum: { key: 'museum', label: '博物馆' },
    guild: { key: 'guild', label: '公会' },
    hanhai: { key: 'hanhai', label: '瀚海' },
    fishPond: { key: 'fishpond', label: '鱼塘' },
    villageProject: { key: 'village', label: '村庄' },
    wallet: { key: 'wallet', label: '钱包' }
  }

  const getLinkedPanels = (linkedSystems: RegionLinkedSystem[]) =>
    [...new Set(linkedSystems)]
      .map(system => LINKED_SYSTEM_PANEL_MAP[system])
      .filter(Boolean)

  const getRegionHandoffSummary = (regionId: RegionId) => {
    const regionSummary = regionMapStore.regionSummaries.find(region => region.id === regionId) ?? null
    const unlockedRouteCount = getRegionRoutes(regionId).filter(route => isRouteUnlocked(route.id)).length

    if (!regionSummary?.unlocked) {
      return {
        headline: '先推进解锁',
        detailLines: [`当前解锁条件：${getUnlockSummary(regionId)}`]
      }
    }

    if (regionId === 'ancient_road') {
      const detailLines = [
        `荒道节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('ancient_road')}/${unlockedRouteCount} 条，可继续补护送线和残卷线。`,
        goalStore.currentEventCampaign ? `活动承接：${goalStore.currentEventCampaign.label}` : '',
        hanhaiStore.crossSystemOverview.featuredCaravanContracts.length > 0
          ? `瀚海合同：${hanhaiStore.crossSystemOverview.featuredCaravanContracts.slice(0, 2).map(contract => contract.label).join('、')}`
          : '',
        hanhaiStore.crossSystemOverview.activeBossCycle
          ? `瀚海焦点首领：${hanhaiStore.crossSystemOverview.activeBossCycle.label}`
          : '',
        shopStore.activityCampaignOfferRecommendations.length > 0
          ? `商圈补给：${shopStore.activityCampaignOfferRecommendations.slice(0, 2).map(offer => offer.name).join('、')}`
          : shopStore.recommendedCatalogOffers.length > 0
            ? `商圈推荐：${shopStore.recommendedCatalogOffers.slice(0, 2).map(offer => offer.name).join('、')}`
            : '',
        regionMapStore.getFamilyResourceQuantity('ancient_archive') > 0
          ? `当前已持有古迹残卷 ${regionMapStore.getFamilyResourceQuantity('ancient_archive')} 份，可先回任务板、商圈或瀚海消化。`
          : ''
      ].filter(Boolean)

      return {
        headline: '任务板 -> 商圈 -> 瀚海',
        detailLines
      }
    }

    if (regionId === 'mirage_marsh') {
      const detailLines = [
        `泽地节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('mirage_marsh')}/${unlockedRouteCount} 条，可继续补夜游、样本和异常线。`,
        fishPondStore.currentPondContestDef ? `鱼塘周赛：${fishPondStore.currentPondContestDef.label}` : '',
        fishPondStore.displayOverview.entryCount > 0
          ? `展示池：已摆入 ${fishPondStore.displayOverview.entryCount} 条高光样本，总观赏值 ${fishPondStore.displayOverview.totalShowValue}`
          : '',
        museumStore.availableScholarCommissionCount > 0
          ? `馆务委托：当前可承接 ${museumStore.availableScholarCommissionCount} 条学者委托`
          : '',
        museumStore.featuredScholarCommissionOverview.length > 0
          ? `重点馆务：${museumStore.featuredScholarCommissionOverview.slice(0, 2).map(commission => commission.title).join('、')}`
          : '',
        goalStore.currentEventCampaign ? `邮件/活动承接：${goalStore.currentEventCampaign.label}` : '',
        regionMapStore.getFamilyResourceQuantity('ecology_specimen') > 0
          ? `当前生态样本库存 ${regionMapStore.getFamilyResourceQuantity('ecology_specimen')} 份，可优先转成鱼塘展示或馆务委托。`
          : ''
      ].filter(Boolean)

      return {
        headline: '鱼塘 -> 博物馆 -> 邮箱',
        detailLines
      }
    }

    const highlandProjectNames = villageProjectStore
      .getLinkedProjectSummaries('guild')
      .filter(project => project.available || project.completed)
      .slice(0, 2)
      .map(project => project.name)
    const detailLines = [
      goalStore.currentThemeWeek?.name ? `主题周承接：${goalStore.currentThemeWeek.name}` : '',
      `高地节点：已完成 ${regionMapStore.getRegionCompletedRouteCount('cloud_highland')}/${unlockedRouteCount} 条。`,
      `公会战备：Lv.${guildStore.guildLevel} / ${guildStore.crossSystemOverview.currentRankBandLabel}。`,
      highlandProjectNames.length > 0 ? `建设前置：${highlandProjectNames.join('、')}` : '',
      regionMapStore.getFamilyResourceQuantity('ley_crystal') > 0
        ? `灵脉结晶：当前库存 ${regionMapStore.getFamilyResourceQuantity('ley_crystal')}，可继续接公会、建设与高阶准备。`
        : ''
    ].filter(Boolean)
    return {
      headline: '公会 -> 村庄 -> 钱包',
      detailLines
    }
  }

  const handleNavigate = (panelKey: PanelKey) => {
    navigateToPanel(panelKey)
  }

  const handleSettlementAction = (panelKey: PanelKey) => {
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


  const canChallengeBoss = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.available ?? false

  const getBossDisabledReason = (regionId: RegionId) =>
    regionMapStore.regionBossAvailability.find(entry => entry.regionId === regionId)?.disabledReason ?? ''

  const handleRunBoss = (regionId: RegionId) => {
    const result = regionMapStore.startBossExpeditionSession(regionId, currentDayTag.value, selectedApproach.value, selectedRetreatRule.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
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
  }

  const handleCampExpedition = () => {
    const result = regionMapStore.campActiveExpedition(currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
  }

  const handleResolveCampAction = (actionId: RegionCampActionId) => {
    const result = regionMapStore.resolveCampAction(actionId, currentDayTag.value)
    setActionSummary(result.message, result.success ? 'success' : 'danger')
    if (result.success) {
      settlementDialog.value = null
    } else {
      openSettlementDialog(result.title, result.lines, result.tone)
    }
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
    openExpeditionSettlementDialog(result.title, result.lines, result.tone)
  }

  const handleOpenJourneyAftermath = (entry: RegionExpeditionArchiveEntry) => {
    openArchiveAftermathDialog(entry)
  }

  const handleSelectJourneyAftermath = (entry: RegionExpeditionArchiveEntry) => {
    selectedJourneyAftermathId.value = entry.id
    setActionSummary(`已将「${entry.targetName}」设为当前旅后处理回看。`, 'accent')
  }

  const handlePublicResourceTurnIn = (familyId: RegionalResourceFamilyId) => {
    const ok = regionMapStore.recordResourceTurnIn(familyId, 1)
    setActionSummary(
      ok
        ? `已交付 1 份${regionMapStore.resourceFamilyDefs.find(family => family.id === familyId)?.label ?? familyId}。`
        : '交付失败：当前资源不足。',
      ok ? 'success' : 'danger'
    )
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
