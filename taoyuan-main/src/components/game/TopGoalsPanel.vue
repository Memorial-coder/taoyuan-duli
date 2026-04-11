<template>
  <div class="game-panel px-3 py-3 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm text-accent">目标规划</p>
        <p class="text-[11px] text-muted mt-1">
          <template v-if="goalStore.currentMainQuest">
            当前里程碑：第{{ goalStore.currentMainQuest.id }}阶段 · {{ goalStore.currentMainQuest.title }}
          </template>
          <template v-else>当前里程碑：已完成全部主线阶段</template>
        </p>
        <p v-if="goalStore.currentThemeWeek" class="text-[11px] text-accent/80 mt-1">
          本周主题：{{ goalStore.currentThemeWeek.name }}（{{ goalStore.currentThemeWeek.startDay }}-{{ goalStore.currentThemeWeek.endDay }}日）
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="game-chip">目标声望 {{ goalStore.goalReputation }}</span>
        <span class="game-chip">今日 {{ goalStore.dailyGoals.length }} 项</span>
        <span class="game-chip">长期 {{ longTermCompletedCount }} / {{ goalStore.longTermGoals.length }}</span>
        <button class="btn !px-2 !py-1" @click="collapsed = !collapsed">
          <span>{{ collapsed ? '展开目标' : '收起目标' }}</span>
        </button>
      </div>
    </div>

    <div v-if="!collapsed" class="mt-3">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:gap-4 2xl:grid-cols-12">
        <section class="game-panel-muted px-3 py-3 2xl:col-span-4">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">今日目标</p>
          <span class="text-[11px] text-muted">{{ currentDayLabel }}</span>
        </div>
        <div class="space-y-2">
            <div v-for="goal in goalStore.dailyGoals" :key="goal.id" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span>{{ goal.title }}</span>
              <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
            </div>
            <p class="text-[10px] text-accent/80 mt-1">{{ goalStore.getGoalSourceText(goal) }}</p>
            <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
          </div>
        </div>
        </section>

        <section class="game-panel-muted px-3 py-3 2xl:col-span-4">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">当前里程碑</p>
          <span class="text-[11px] text-muted">{{ currentMainQuestProgress }}</span>
        </div>

        <div v-if="goalStore.currentMainQuest" class="space-y-2">
          <p class="text-sm text-text">{{ goalStore.currentMainQuest.title }}</p>
          <p class="text-[11px] text-muted leading-5">{{ goalStore.currentMainQuest.description }}</p>
            <div class="space-y-2 mt-2">
              <div v-for="condition in goalStore.currentMainQuest.conditions" :key="condition.id" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span>{{ condition.title }}</span>
                <span :class="condition.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(condition) }}</span>
              </div>
              <p class="text-[11px] text-muted mt-1 leading-5">{{ condition.description }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-muted leading-6">你已经完成全部阶段目标，可以自由经营你的桃源。</div>
        </section>

        <section class="game-panel-muted px-3 py-3 2xl:col-span-4">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">本季目标</p>
          <span class="text-[11px] text-muted">{{ currentSeasonLabel }}</span>
        </div>
        <div class="space-y-2">
          <div v-if="goalStore.currentThemeWeek" class="rounded-xs border border-accent/10 bg-accent/5 px-2 py-2">
            <p class="text-[11px] text-accent">{{ goalStore.currentThemeWeek.name }}</p>
            <p class="text-[10px] text-muted mt-1 leading-5">{{ goalStore.currentThemeWeek.description }}</p>
          </div>
          <div class="rounded-xs border border-warning/20 bg-warning/5 px-2 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-warning">市场轮换摘要</p>
              <span class="text-[10px] text-muted">{{ marketOverview.phaseLabel }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1 leading-5">{{ marketOverview.phaseDescription }}</p>
            <p v-if="marketOverview.hotspotCategoryLabels.length > 0" class="text-[10px] text-warning mt-1">
              热点：{{ marketOverview.hotspotCategoryLabels.slice(0, 3).join('、') }}
            </p>
            <p v-if="marketRouteHighlights" class="text-[10px] text-success mt-1">建议路线：{{ marketRouteHighlights }}</p>
            <p v-if="marketOverview.overflowPenaltyCount > 0" class="text-[10px] text-danger mt-1">
              当前有 {{ marketOverview.overflowPenaltyCount }} 个品类处于过剩压制，建议尽快换线出货。
            </p>
          </div>
          <div v-if="goalStore.currentThemeWeekGoals.length > 0" class="rounded-xs border border-success/20 bg-success/5 px-2 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-success">本周重点目标</p>
              <span class="text-[10px] text-muted">{{ goalStore.currentThemeWeekGoals.length }} 项</span>
            </div>
            <div class="space-y-1.5 mt-2">
              <div v-for="goal in goalStore.currentThemeWeekGoals" :key="`theme-${goal.id}`" class="rounded-xs border border-success/10 px-2 py-2 bg-bg/10">
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span>{{ goal.title }}</span>
                  <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
                </div>
                <p class="text-[10px] text-success/80 mt-1">{{ goalStore.getGoalSourceText(goal) }}</p>
                <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
              </div>
            </div>
          </div>
          <div v-for="goal in goalStore.seasonGoals" :key="goal.id" class="rounded-xs border border-accent/10 px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span>{{ goal.title }}</span>
              <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
            </div>
            <p class="text-[10px] text-accent/80 mt-1">{{ goalStore.getGoalSourceText(goal) }}</p>
            <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
          </div>
        </div>
        </section>

        <section class="game-panel-muted px-3 py-3 lg:col-span-2 2xl:col-span-12">
        <div class="flex items-center justify-between gap-3 mb-2">
          <p class="text-xs text-accent">长期目标</p>
          <span class="text-[11px] text-muted">{{ longTermCompletedCount }} / {{ goalStore.longTermGoals.length }} 已完成</span>
        </div>
        <div class="space-y-2">
          <div v-for="group in longTermGoalGroups" :key="group.label">
            <button
              class="w-full flex items-center justify-between px-2 py-1 rounded-xs border border-accent/10 bg-bg/10 text-xs hover:bg-accent/5 transition-colors"
              @click="toggleLongTermGroup(group.label)"
            >
              <span>{{ group.label }}</span>
              <span class="text-muted">
                {{ group.goals.filter(g => g.completed).length }}/{{ group.goals.length }}
                <span class="ml-1">{{ expandedLongTermGroups.includes(group.label) ? '▲' : '▼' }}</span>
              </span>
            </button>
              <div v-if="expandedLongTermGroups.includes(group.label)" class="space-y-1 mt-1">
                <div v-for="goal in group.goals" :key="goal.id" class="rounded-xs border border-accent/10 px-2 py-2 ml-2 bg-bg/10">
                <div class="flex items-center justify-between gap-3 text-xs">
                  <span :class="goal.completed ? 'line-through text-muted' : ''">{{ goal.title }}</span>
                  <span :class="goal.completed ? 'text-success' : 'text-muted'">{{ goalStore.getGoalProgressText(goal) }}</span>
                </div>
                <p class="text-[11px] text-muted mt-1 leading-5">{{ goal.description }}</p>
              </div>
            </div>
          </div>
        </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useGameStore, SEASON_NAMES } from '@/stores/useGameStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useShopStore } from '@/stores/useShopStore'

  const gameStore = useGameStore()
  const goalStore = useGoalStore()
  const shopStore = useShopStore()
  const collapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const expandedLongTermGroups = ref<string[]>([])
  const marketOverview = computed(() => shopStore.marketDynamicsOverview)
  const marketRouteHighlights = computed(() => shopStore.recommendedMarketDynamicsRoutes.slice(0, 2).map(route => route.label).join('、'))

  const currentDayLabel = computed(() => `${gameStore.day}日待办`)
  const currentSeasonLabel = computed(() => `第${gameStore.year}年 ${SEASON_NAMES[gameStore.season]}季`)
  const currentMainQuestProgress = computed(() => {
    const current = goalStore.currentMainQuest
    if (!current) return `${goalStore.completedMainQuestCount}/${goalStore.mainQuestStages.length}`
    const done = current.conditions.filter(condition => condition.completed).length
    return `${done}/${current.conditions.length}`
  })

  const LONG_TERM_GROUP_MAP: Record<string, string> = {
    long_money_1: '财富积累', long_money_2: '财富积累', long_money_3: '财富积累',
    long_home_1: '家园建设', long_home_2: '家园建设',
    long_mine_1: '矿洞探索', long_mine_2: '矿洞探索',
    long_cook_1: '烹饪成就', long_cook_2: '烹饪成就',
    long_fish_1: '钓鱼成就', long_fish_2: '钓鱼成就',
    long_social_1: '社交关系', long_social_2: '社交关系',
    long_collect_1: '收藏图鉴', long_collect_2: '收藏图鉴',
    long_bundle_1: '社区建设', long_bundle_2: '社区建设',
    long_crabpot_1: '蟹笼渔家',
    long_family_1: '家庭成就', long_family_2: '家庭成就',
  }

  const longTermGoalGroups = computed(() => {
    const groupMap = new Map<string, typeof goalStore.longTermGoals>()
    for (const goal of goalStore.longTermGoals) {
      const label = LONG_TERM_GROUP_MAP[goal.id] ?? '其他'
      if (!groupMap.has(label)) groupMap.set(label, [])
      groupMap.get(label)!.push(goal)
    }
    return Array.from(groupMap.entries()).map(([label, goals]) => ({ label, goals }))
  })

  const longTermCompletedCount = computed(() => goalStore.longTermGoals.filter(g => g.completed).length)

  const toggleLongTermGroup = (label: string) => {
    const idx = expandedLongTermGroups.value.indexOf(label)
    if (idx !== -1) {
      expandedLongTermGroups.value.splice(idx, 1)
    } else {
      expandedLongTermGroups.value.push(label)
    }
  }

  onMounted(() => {
    goalStore.ensureInitialized()
    goalStore.evaluateProgressAndRewards()
  })
</script>

<style scoped>
  @media (max-width: 768px) {
    .game-panel {
      padding-top: 10px;
      padding-bottom: 10px;
    }
  }

  section {
    min-width: 0;
  }
</style>