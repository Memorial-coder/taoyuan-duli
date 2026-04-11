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
      <div class="flex items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="game-section-title">样例存档</p>
          <p class="game-section-desc">用于验证后期经济、育种、鱼塘与综合终局联动；同时作为 CORE-007 的实际加载入口。</p>
        </div>
        <span class="game-chip">{{ sampleSaves.length }} 套内置样例</span>
      </div>

      <div class="grid gap-3 xl:grid-cols-2">
        <div v-for="sample in sampleSaves" :key="sample.id" class="game-panel-muted p-3 space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <p class="text-xs text-accent">{{ sample.label }}</p>
              <p class="text-[11px] text-muted leading-5">{{ sample.description }}</p>
            </div>
            <Button
              class="shrink-0 justify-center"
              :icon="sampleBusyId === sample.id ? LoaderCircle : DatabaseZap"
              :disabled="sampleBusyId !== null"
              @click="loadSample(sample.id)"
            >
              {{ sampleBusyId === sample.id ? '加载中' : '载入' }}
            </Button>
          </div>
          <div class="flex flex-wrap gap-1">
            <span v-for="tag in sample.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded-xs border border-accent/20 text-accent">
              {{ tag }}
            </span>
          </div>
        </div>
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
            <Button class="justify-center" :icon="Wand2" :disabled="!gameStore.isGameStarted" @click="applyCalendarDebug">应用日期并刷新主题周</Button>
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

  interface LateGameDebugCommandApi {
    listSamples: () => Array<{ id: string; label: string; description: string; tags: string[] }>
    loadSample: (sampleId: string) => Promise<boolean>
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

  const sampleBusyId = ref<string | null>(null)
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

  const sampleSaves = computed(() => saveStore.getBuiltInSampleSaves())
  const currentWeekInfo = computed(() => getWeekCycleInfo(gameStore.year, gameStore.season, gameStore.day))
  const economyOverview = computed(() => playerStore.getEconomyOverview())
  const latestSnapshot = computed(() => goalStore.latestWeeklyMetricSnapshot)
  const archiveSnapshots = computed(() => [...goalStore.weeklyMetricArchive.snapshots].slice().reverse())
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

  const loadSample = async (sampleId: string) => {
    sampleBusyId.value = sampleId
    try {
      const ok = await saveStore.loadBuiltInSampleSave(sampleId)
      if (ok) {
        debugYear.value = gameStore.year
        debugSeason.value = gameStore.season
        debugDay.value = gameStore.day
        debugHour.value = gameStore.hour
        showFloat(`已载入样例：${sampleId}`, 'success')
      } else {
        showFloat('样例载入失败。', 'danger')
      }
      return ok
    } finally {
      sampleBusyId.value = null
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
    goalStore.refreshThemeWeek(true)
    goalStore.evaluateProgressAndRewards()
    showFloat('已应用调试日期并刷新目标 / 主题周。', 'success')
  }

  const injectSpecialOrder = () => {
    if (!gameStore.isGameStarted) {
      showFloat('请先载入样例或进入游戏态。', 'danger')
      return
    }
    questStore.generateSpecialOrder(gameStore.season, Math.min(4, Math.max(1, specialOrderTier.value)))
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

  const debugApi: LateGameDebugCommandApi = {
    listSamples: () => saveStore.getBuiltInSampleSaves(),
    loadSample,
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