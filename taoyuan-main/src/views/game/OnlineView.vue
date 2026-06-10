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

  type ModuleKey = 'manor' | 'cohabitation' | 'neighbor' | 'orders' | 'festival' | 'society'
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
  const refreshing = ref(false)
  const lastRefreshedAt = ref(0)
  const moduleErrors = ref<Partial<Record<ModuleKey, string>>>({})
  const onlineVisualFeatureFlagState = createOnlineVisualFeatureFlagState()

  const countLabel = (count: number | undefined, unit = '项') => `${count ?? 0}${unit}`
  const hasSummary = (value: unknown) => (value ? '已同步' : '未同步')
  const normalizeError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

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
