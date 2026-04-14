<template>
  <div class="space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm text-accent">村庄建设总览</p>
        <p class="text-[11px] text-muted mt-1">
          独立查看建设树、维护、捐赠、预算承接与繁荣度，不再只挂在村民页里。
        </p>
      </div>
      <div class="flex gap-2">
        <Button class="justify-center" @click="void router.push({ name: 'village' })">村民入口</Button>
        <Button class="justify-center" @click="void router.push({ name: 'home' })">返回设施</Button>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-2">
      <section class="game-panel-muted px-3 py-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs text-accent">建设概览</p>
          <span class="text-[10px] text-muted">{{ phaseLabel }} / {{ segmentLabel }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-muted">已完成</p>
            <p class="text-accent mt-1">{{ overview.completedProjects }}/{{ overview.totalProjects }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-muted">可推进</p>
            <p class="text-accent mt-1">{{ overview.availableProjects }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-muted">维护中</p>
            <p class="text-accent mt-1">{{ overview.activeMaintenancePlans.length }}</p>
          </div>
          <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <p class="text-muted">捐赠计划</p>
            <p class="text-accent mt-1">{{ overview.availableDonationPlans.length }}</p>
          </div>
        </div>
      </section>

      <section class="game-panel-muted px-3 py-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs text-accent">终局繁荣度</p>
          <span class="text-[10px] text-muted">{{ prosperity.tier }}</span>
        </div>
        <div class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] text-muted">总分</p>
            <span class="text-accent">{{ prosperity.total }}</span>
          </div>
          <p class="text-[10px] text-muted mt-1">当前作为只读综合评价，汇总建设、维护、捐赠、博物馆、瀚海、公会、生产展示与家庭陪伴成果。</p>
        </div>
        <div class="space-y-1.5 mt-2">
          <div v-for="entry in prosperity.entries" :key="entry.sourceId" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] text-text">{{ entry.sourceLabel }}</span>
              <span class="text-[10px] text-accent">{{ entry.score }}</span>
            </div>
            <p class="text-[10px] text-muted mt-1">{{ entry.description }}</p>
          </div>
        </div>
      </section>
    </div>

    <section v-if="budgetRecommendations.length > 0" class="game-panel-muted px-3 py-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-xs text-accent">预算承接建议</p>
        <span class="text-[10px] text-muted">VILL-040</span>
      </div>
      <div class="space-y-2">
        <div v-for="entry in budgetRecommendations" :key="entry.channelId" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] text-text">{{ entry.channelLabel }}</p>
            <span class="text-[10px] text-accent">{{ entry.projects.length }} 项承接</span>
          </div>
          <p class="text-[10px] text-muted mt-1">{{ entry.summary }}</p>
          <p class="text-[10px] text-accent/80 mt-1" v-if="entry.projects.length > 0">
            推荐项目：{{ entry.projects.map(project => project.name).join('、') }}
          </p>
        </div>
      </div>
    </section>

    <section class="game-panel-muted px-3 py-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-xs text-accent">建设树</p>
        <span class="text-[10px] text-muted">按阶段分组</span>
      </div>
      <div class="space-y-3">
        <div v-for="group in phaseGroups" :key="group.id">
          <p class="text-[11px] text-accent mb-2">{{ group.label }} · {{ group.projects.length }} 项</p>
          <div class="space-y-2">
            <div v-for="project in group.projects" :key="project.id" class="border rounded-xs px-3 py-2" :class="project.completed ? 'border-success/30 bg-success/5' : 'border-accent/10'">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-xs" :class="project.completed ? 'text-success' : 'text-accent'">{{ project.name }}</p>
                  <p class="text-[10px] text-muted mt-0.5 leading-4">
                    {{ project.contentTier }} · {{ project.buildMode }} · {{ project.linkedSystems.join(' / ') || '无联动' }}
                  </p>
                </div>
                <span class="text-[10px] whitespace-nowrap" :class="project.completed ? 'text-success' : project.clueUnlocked ? 'text-accent' : 'text-muted'">
                  {{ project.completed ? '已完成' : project.clueUnlocked ? '可建设' : '待线索' }}
                </span>
              </div>

              <p class="text-[10px] text-muted mt-1 leading-4">{{ project.blockedReason ?? '当前条件已满足，可直接推进。' }}</p>

              <div v-if="project.requirementProgresses.length > 0" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
                <p class="text-[10px] text-muted mb-1">跨系统门槛</p>
                <div v-for="requirement in project.requirementProgresses" :key="`${project.id}-${requirement.type}`" class="flex items-center justify-between text-[10px] mt-0.5">
                  <span class="text-muted">{{ requirement.displayLabel }}</span>
                  <span :class="requirement.met ? 'text-success' : 'text-warning'">{{ requirement.current }}/{{ requirement.target }}</span>
                </div>
              </div>

              <div v-if="!project.completed" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
                <div class="flex items-center justify-between text-[10px]">
                  <span class="text-muted">铜钱</span>
                  <span :class="playerStore.money >= getVillageProjectMoneyCost(project.id) ? 'text-success' : 'text-danger'">
                    {{ playerStore.money }}/{{ getVillageProjectMoneyCost(project.id) }}文
                  </span>
                </div>
                <div v-for="material in getVillageProjectMaterials(project.id)" :key="material.itemId" class="flex items-center justify-between text-[10px] mt-0.5">
                  <span class="text-muted">{{ getItemName(material.itemId) }}</span>
                  <span :class="getCombinedItemCount(material.itemId) >= material.quantity ? 'text-success' : 'text-danger'">
                    {{ getCombinedItemCount(material.itemId) }}/{{ material.quantity }}
                  </span>
                </div>
              </div>

              <div v-if="project.maintenance" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-accent">维护状态</p>
                  <span class="text-[10px]" :class="project.maintenance.active ? 'text-success' : project.maintenance.overdue ? 'text-warning' : 'text-muted'">
                    {{ project.maintenance.statusLabel }}
                  </span>
                </div>
                <p class="text-[10px] text-muted mt-1">{{ project.maintenance.plan.effectSummary }}</p>
                <div class="flex items-center justify-between text-[10px] mt-1">
                  <span class="text-muted">维护费</span>
                  <span class="text-accent">{{ project.maintenance.plan.costMoney }}文 / {{ project.maintenance.plan.cycleDays }}天</span>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                  <Button class="justify-center" @click="toggleMaintenanceAutoRenew(project.id)">
                    {{ project.maintenance.state.autoRenew ? '关闭自动续费' : '开启自动续费' }}
                  </Button>
                  <Button v-if="!project.maintenance.active" class="justify-center" @click="payMaintenance(project.id)">
                    {{ project.maintenance.overdue ? '补缴维护' : '启用维护' }}
                  </Button>
                </div>
              </div>

              <div v-if="project.donation" class="border border-accent/10 rounded-xs p-2 mt-2 bg-bg/10">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] text-accent">捐赠计划</p>
                  <span class="text-[10px] text-accent">{{ Math.round(project.donation.progressRate * 100) }}%</span>
                </div>
                <p class="text-[10px] text-muted mt-1">{{ project.donation.plan.label }}</p>
                <p v-if="project.donation.acceptedItems.length > 0" class="text-[10px] text-muted mt-1">
                  接收：{{ project.donation.acceptedItems.map(item => `${item.itemName} x${getCombinedItemCount(item.itemId)}`).join('、') }}
                </p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <Button v-if="getFirstAvailableDonationItem(project.id)" class="justify-center" @click="quickDonate(project.id)">
                    捐赠 1 个 {{ getFirstAvailableDonationItem(project.id)?.itemName }}
                  </Button>
                  <Button v-if="getFirstClaimableDonationMilestone(project.id)" class="justify-center" @click="claimDonationMilestone(project.id)">
                    领取{{ getFirstClaimableDonationMilestone(project.id)?.label }}
                  </Button>
                </div>
              </div>

              <div class="flex items-center justify-between gap-2 mt-2">
                <p class="text-[10px] text-success/90 leading-4">{{ getVillageProjectHint(project.id) }}</p>
                <Button v-if="!project.completed" class="shrink-0 justify-center" :disabled="!project.canBuildNow" @click="completeProject(project.id)">
                  建设
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="game-panel-muted px-3 py-3">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-xs text-accent">最近建设日志</p>
        <span class="text-[10px] text-muted">VILL-044</span>
      </div>
      <div v-if="recentVillageLogs.length > 0" class="space-y-1.5">
        <div v-for="(entry, index) in recentVillageLogs" :key="`village-log-${index}`" class="border border-accent/10 rounded-xs px-2 py-2 bg-bg/10">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] text-accent">{{ entry.dayLabel || '未标记日期' }}</span>
            <span class="text-[10px] text-muted">{{ entry.tags?.join(' · ') }}</span>
          </div>
          <p class="text-[11px] mt-1">{{ entry.msg }}</p>
        </div>
      </div>
      <p v-else class="text-[11px] text-muted">暂无建设日志，推进项目后会在这里沉淀阶段记录。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import Button from '@/components/game/Button.vue'
  import { getCombinedItemCount } from '@/composables/useCombinedInventory'
  import { addLog, logHistory, showFloat } from '@/composables/useGameLog'
  import { getItemById } from '@/data'
  import { useBreedingStore } from '@/stores/useBreedingStore'
  import { useFishPondStore } from '@/stores/useFishPondStore'
  import { useGoalStore } from '@/stores/useGoalStore'
  import { useGuildStore } from '@/stores/useGuildStore'
  import { useHanhaiStore } from '@/stores/useHanhaiStore'
  import { useMuseumStore } from '@/stores/useMuseumStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import { useVillageProjectStore } from '@/stores/useVillageProjectStore'
  import type { ProsperityScoreBreakdown } from '@/types'

  const router = useRouter()
  const breedingStore = useBreedingStore()
  const fishPondStore = useFishPondStore()
  const goalStore = useGoalStore()
  const guildStore = useGuildStore()
  const hanhaiStore = useHanhaiStore()
  const museumStore = useMuseumStore()
  const npcStore = useNpcStore()
  const playerStore = usePlayerStore()
  const villageProjectStore = useVillageProjectStore()

  const overview = computed(() => villageProjectStore.overviewSummary)
  const prosperity = computed<ProsperityScoreBreakdown>(() => {
    const completedProjects = villageProjectStore.projectSummaries.filter(project => project.completed).length
    const activeMaintenance = villageProjectStore.maintenanceSummaries.filter(summary => summary.active).length
    const overdueMaintenance = villageProjectStore.maintenanceSummaries.filter(summary => summary.overdue).length
    const reachedDonationPlans = villageProjectStore.donationSummaries.filter(summary => summary.targetReached).length
    const progressingDonationPlans = villageProjectStore.donationSummaries.filter(summary => summary.unlocked && summary.state.totalAmount > 0).length
    const familyWishCompletions = npcStore.getFamilyWishOverview().state.completedWishIds.length
    const entries = [
      {
        sourceId: 'village_projects',
        sourceLabel: '建设规模',
        score: Math.min(24, completedProjects * 2 + villageProjectStore.villageProjectLevel),
        description: '已完成建设项目越多，村庄基础繁荣越高。'
      },
      {
        sourceId: 'maintenance',
        sourceLabel: '维护稳定',
        score: Math.max(0, Math.min(12, activeMaintenance * 4 - overdueMaintenance * 2)),
        description: '关键项目维持正常运转时，长期繁荣度才会持续生效。'
      },
      {
        sourceId: 'donation',
        sourceLabel: '专项捐赠',
        score: Math.min(10, reachedDonationPlans * 4 + progressingDonationPlans * 2),
        description: '捐赠计划与里程碑代表村庄对外部资源的长期承接能力。'
      },
      {
        sourceId: 'museum',
        sourceLabel: '展陈影响',
        score: Math.min(14, museumStore.exhibitLevel * 2 + museumStore.donatedCategoryCoverage),
        description: '博物馆展陈与专题展会持续提升村庄文化影响力。'
      },
      {
        sourceId: 'hanhai',
        sourceLabel: '瀚海联动',
        score: Math.min(12, hanhaiStore.totalRelicClears),
        description: '瀚海探索与商路成果会反向放大村庄终局声望。'
      },
      {
        sourceId: 'guild',
        sourceLabel: '公会协力',
        score: Math.min(10, guildStore.completedGoalCount * 2 + Math.floor(guildStore.contributionPoints / 200)),
        description: '公会讨伐与后勤协力会提升整体建设号召力。'
      },
      {
        sourceId: 'breeding_fishpond',
        sourceLabel: '生产展示',
        score: Math.min(10, breedingStore.compendium.length + Math.floor(fishPondStore.discoveredBreeds.size / 6)),
        description: '育种图鉴与鱼塘品系越丰富，越能支撑终局展示与供货。'
      },
      {
        sourceId: 'family',
        sourceLabel: '家庭与陪伴',
        score: Math.min(8, familyWishCompletions * 2 + npcStore.children.length * 2),
        description: '家庭愿望、陪伴线和子女成长会为村庄带来长期人气与稳定性。'
      }
    ]
    const total = entries.reduce((sum, entry) => sum + entry.score, 0)
    const tier = total >= 72 ? '盛世' : total >= 56 ? '昌盛' : total >= 40 ? '繁荣' : total >= 24 ? '兴建' : '起步'
    return { total, tier, entries }
  })
  const budgetRecommendations = computed(() => {
    const channelLabels: Record<string, string> = {
      trade: '商路预算',
      museum: '展馆预算',
      academy: '学舍预算'
    }
    const channelSystemMap: Record<string, string[]> = {
      trade: ['quest', 'hanhai'],
      museum: ['museum'],
      academy: ['goal', 'guild']
    }
    return Object.values(goalStore.weeklyBudgetSelections)
      .filter((selection): selection is NonNullable<typeof selection> => Boolean(selection))
      .map(selection => {
        const linkedSystems = channelSystemMap[selection.channelId] ?? []
        const projects = villageProjectStore.projectSummaries
          .filter(project => !project.completed && project.linkedSystems.some(system => linkedSystems.includes(system)))
          .slice(0, 3)
        return {
          channelId: selection.channelId,
          channelLabel: channelLabels[selection.channelId] ?? selection.channelId,
          projects,
          summary:
            selection.channelId === 'trade'
              ? '本周商路预算更适合优先推进承接订单与瀚海联动的建设分支。'
              : selection.channelId === 'museum'
                ? '本周展馆预算更适合优先推进与博物馆/研究相关的建设分支。'
                : '本周学舍预算更适合优先推进目标、公会与成长支撑型建设分支。'
        }
      })
  })
  const recentVillageLogs = computed(() =>
    logHistory.value
      .filter(entry => entry.category === 'village')
      .slice(-8)
      .reverse()
  )

  const phaseLabelMap = {
    bootstrap: '中期过渡',
    expansion: '后期扩建',
    endgame: '终局展示'
  } as const

  const segmentLabelMap = {
    midgame_operator: '中期经营者',
    capital_builder: '扩建型庄主',
    endgame_patron: '终局投资人'
  } as const

  const phaseLabel = computed(() => phaseLabelMap[overview.value.currentPhase as keyof typeof phaseLabelMap] ?? overview.value.currentPhase)
  const segmentLabel = computed(
    () => segmentLabelMap[overview.value.currentPlayerSegment as keyof typeof segmentLabelMap] ?? overview.value.currentPlayerSegment
  )
  const phaseGroups = computed(() => [
    {
      id: 'bootstrap',
      label: '基础层',
      projects: villageProjectStore.getProjectSummariesByPhase('bootstrap')
    },
    {
      id: 'expansion',
      label: '发展层',
      projects: villageProjectStore.getProjectSummariesByPhase('expansion')
    },
    {
      id: 'endgame',
      label: '终局层',
      projects: villageProjectStore.getProjectSummariesByPhase('endgame')
    }
  ])

  const getItemName = (itemId: string) => getItemById(itemId)?.name ?? itemId
  const getVillageProjectMoneyCost = (projectId: string) =>
    villageProjectStore.projects.find(entry => entry.id === projectId)?.moneyCost ?? 0
  const getVillageProjectMaterials = (projectId: string) =>
    villageProjectStore.projects.find(entry => entry.id === projectId)?.materials ?? []
  const getFirstAvailableDonationItem = (projectId: string) => {
    const summary = villageProjectStore.getProjectDonationSummary(projectId)
    return summary?.acceptedItems.find(item => getCombinedItemCount(item.itemId) > 0) ?? null
  }
  const getFirstClaimableDonationMilestone = (projectId: string) => {
    const summary = villageProjectStore.getProjectDonationSummary(projectId)
    return summary?.milestones.find(milestone => milestone.reached && !milestone.claimed) ?? null
  }

  const getVillageProjectHint = (projectId: string) => {
    const summary = villageProjectStore.getProjectSummary(projectId)
    if (!summary) return '项目不存在。'
    if (summary.completed) return '已完成，可继续通过维护、捐赠与繁荣度承接长期收益。'
    return summary.blockedReason ?? '材料、铜钱与跨系统门槛均已满足，可直接推进。'
  }

  const completeProject = (projectId: string) => {
    const result = villageProjectStore.completeProject(projectId)
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (!result.success) addLog(result.message)
  }

  const payMaintenance = (projectId: string) => {
    const result = villageProjectStore.payProjectMaintenance(projectId)
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (!result.success) addLog(result.message)
  }

  const toggleMaintenanceAutoRenew = (projectId: string) => {
    const summary = villageProjectStore.getProjectMaintenanceSummary(projectId)
    if (!summary) return
    villageProjectStore.setMaintenanceAutoRenew(projectId, !summary.state.autoRenew)
    addLog(`【村庄建设】${summary.plan.label}${summary.state.autoRenew ? '已关闭' : '已开启'}自动续费。`)
    showFloat(summary.state.autoRenew ? '已关闭自动续费' : '已开启自动续费', 'success')
  }

  const quickDonate = (projectId: string) => {
    const donationItem = getFirstAvailableDonationItem(projectId)
    if (!donationItem) {
      showFloat('当前没有可用于捐赠的物资', 'danger')
      return
    }
    const result = villageProjectStore.donateToProject(projectId, donationItem.itemId, 1)
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (!result.success) addLog(result.message)
  }

  const claimDonationMilestone = (projectId: string) => {
    const milestone = getFirstClaimableDonationMilestone(projectId)
    if (!milestone) {
      showFloat('当前没有可领取的捐赠里程碑', 'danger')
      return
    }
    const result = villageProjectStore.claimDonationMilestone(projectId, milestone.id)
    showFloat(result.message, result.success ? 'success' : 'danger')
    if (!result.success) addLog(result.message)
  }
</script>
