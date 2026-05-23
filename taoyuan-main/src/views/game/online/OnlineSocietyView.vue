<template>
  <div class="space-y-3" data-testid="online-society-page">
    <section class="game-panel space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-accent">
            <ShieldCheck :size="16" />
            <h2 class="game-section-title">在线村社</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted">{{ moduleSummary }}</p>
          <p class="mt-1 text-[10px] leading-4 text-muted">{{ refreshStateLabel }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            class="online-action-btn online-action-btn--compact"
            type="button"
            :disabled="societyStore.loading"
            @click="refreshSocietyModule"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': societyStore.loading }" />
            {{ societyStore.loading ? '刷新中' : '刷新村社' }}
          </button>
          <RouterLink class="online-action-btn online-action-btn--compact" :to="{ name: 'online' }">
            <ArrowLeft :size="12" />
            在线中心
          </RouterLink>
        </div>
      </div>

      <div v-if="societyStore.errorMessage" class="border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
        {{ societyStore.errorMessage }}
      </div>

      <div class="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
        <div v-for="stat in summaryStats" :key="stat.label" class="game-panel-muted px-2 py-2">
          <p class="truncate text-[10px] text-muted">{{ stat.label }}</p>
          <p class="mt-1 truncate text-xs text-accent">{{ stat.value }}</p>
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 border px-3 py-2 text-xs transition-colors"
          :class="activeTab === tab.key ? 'border-accent/50 bg-accent/10 text-accent' : 'border-accent/15 text-muted hover:border-accent/30 hover:text-accent'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div class="game-panel-muted flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p class="text-sm text-accent">{{ activeTabMeta.label }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ activeTabMeta.summary }}</p>
        </div>
        <RouterLink class="online-action-btn online-action-btn--compact shrink-0" :to="{ name: 'society' }">
          <ExternalLink :size="12" />
          打开村社旧页
        </RouterLink>
      </div>

      <div v-if="activeTab === 'overview'" class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">我的村社</p>
            <span class="text-[10px] text-muted">{{ currentSociety?.my_role_label || '未加入' }}</span>
          </div>
          <div v-if="currentSociety" class="mt-3 space-y-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-xs text-accent">{{ currentSociety.name }}</p>
                  <p class="mt-1 text-[10px] text-muted">
                    {{ currentSociety.theme_label }} · {{ currentSociety.visibility_label }} · {{ currentSociety.member_count }}/{{ currentSociety.capacity }} 人
                  </p>
                </div>
                <span class="w-fit shrink-0 text-[10px] text-accent">{{ currentSociety.emblem_label }}</span>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted">{{ currentSociety.summary || '这个村社还没写简介。' }}</p>
            </div>
            <div class="grid gap-2 md:grid-cols-3">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">公告</p>
                <p class="mt-1 line-clamp-3 text-[10px] leading-4 text-text">{{ currentSociety.notice || '暂无公告' }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">福利等级</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.level_title }}</p>
                <p class="mt-1 text-[10px] text-muted">等级 {{ currentSociety.level }}</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">公共建设</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.public_projects.length }} 项</p>
                <p class="mt-1 text-[10px] text-muted">{{ activeProjectCount }} 项推进中</p>
              </div>
            </div>
          </div>
          <div v-else class="mt-3 space-y-3">
            <p class="text-xs leading-5 text-muted">当前还没有加入村社。可以创建自己的村社，或从公开村社里申请加入。</p>
            <RouterLink class="online-action-btn online-action-btn--primary w-fit" :to="{ name: 'society' }">
              创建或申请
            </RouterLink>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">公开村社</p>
            <span class="text-[10px] text-muted">{{ societyStore.visibleSocieties.length }} 个</span>
          </div>
          <div v-if="societyStore.visibleSocieties.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有可公开查看的村社。</div>
          <div v-else class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            <div v-for="society in visibleSocietyPreview" :key="society.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ society.name }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ society.theme_label }} · {{ society.member_count }}/{{ society.capacity }} 人</p>
                </div>
                <span class="shrink-0 text-[10px]" :class="society.can_apply ? 'text-accent' : 'text-muted'">
                  {{ society.can_apply ? '可申请' : society.visibility_label }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-[10px] leading-4 text-muted">{{ society.summary || '这个村社还没写简介。' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'members'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">成员列表</p>
            <span class="text-[10px] text-muted">{{ memberCount }} 人</span>
          </div>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会在这里看到成员和职位摘要。</div>
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="member in currentSociety.members" :key="`${currentSociety.id}-${member.username}`" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ member.display_name }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ member.username }} · {{ member.role_label }}</p>
                </div>
                <span v-if="member.save_id" class="shrink-0 text-[10px] text-muted">存档 {{ member.save_id }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">成员治理</p>
            <div class="mt-3 grid gap-2 text-xs">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">待处理申请 / 邀请</p>
                <p class="mt-1 text-accent">{{ societyStore.managedRequests.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">我收到的邀请</p>
                <p class="mt-1 text-accent">{{ societyStore.incomingInvites.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">我的待处理申请</p>
                <p class="mt-1 text-accent">{{ societyStore.myPendingRequests.length }} 条</p>
              </div>
            </div>
          </div>
          <div class="game-panel-muted p-3">
            <p class="text-sm text-accent">权限边界</p>
            <p class="mt-2 text-xs leading-5 text-muted">
              {{ currentSociety?.can_manage_roles ? '当前身份可调整成员职位。' : '当前身份只显示可读成员摘要。' }}
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'storage'" class="grid gap-3 lg:grid-cols-2">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">仓库与福利</p>
            <span class="text-[10px] text-muted">{{ currentSociety?.level_title || '未加入' }}</span>
          </div>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示公共仓库和福利等级。</div>
          <div v-else class="mt-3 space-y-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-xs text-accent">公共仓库</p>
              <p class="mt-1 text-[10px] text-muted">共用物资 {{ currentSociety.public_warehouse.funds }} 铜钱</p>
              <div v-if="currentSociety.public_warehouse.items.length > 0" class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                <span v-for="entry in currentSociety.public_warehouse.items" :key="entry.item_id" class="border border-accent/15 px-1.5 py-0.5 text-[10px] text-muted">
                  {{ entry.label }}
                </span>
              </div>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div v-for="welfare in currentSociety.welfare_unlocks" :key="welfare.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs" :class="welfare.unlocked ? 'text-success' : 'text-muted'">{{ welfare.label }}</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ welfare.summary }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">节会与装饰</p>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示专属节会和装饰解锁摘要。</div>
          <div v-else class="mt-3 space-y-2">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-xs" :class="currentSociety.exclusive_festival.unlocked ? 'text-success' : 'text-muted'">
                {{ currentSociety.exclusive_festival.label }}
              </p>
              <p class="mt-1 text-[10px] leading-4 text-muted">{{ currentSociety.exclusive_festival.summary }}</p>
            </div>
            <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in currentSociety.exclusive_decors" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <p class="text-xs" :class="entry.unlocked ? 'text-success' : 'text-muted'">{{ entry.label }}</p>
                <p class="mt-1 text-[10px] leading-4 text-muted">{{ entry.summary }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'projects'" class="game-panel-muted p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-accent">公共建设</p>
          <span class="text-[10px] text-muted">{{ currentSociety?.public_projects.length || 0 }} 项</span>
        </div>
        <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示公共建设摘要。</div>
        <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
          <div v-for="project in currentSociety.public_projects" :key="project.id" class="border border-accent/10 bg-black/10 p-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs text-text">{{ project.label }}</p>
                <p class="mt-1 text-[10px] text-muted">{{ project.status_label }} · {{ project.progress }}/{{ project.target_progress }}</p>
              </div>
              <span class="shrink-0 text-[10px]" :class="project.status === 'completed' ? 'text-success' : 'text-accent'">{{ project.progress_percent }}%</span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden border border-accent/10 bg-bg">
              <div class="h-full bg-accent/70 transition-all" :style="{ width: `${project.progress_percent}%` }" />
            </div>
            <p class="mt-2 text-[10px] leading-4 text-muted">{{ project.summary }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'proposals'" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">活跃提案</p>
            <span class="text-[10px] text-muted">{{ currentSociety?.active_proposals.length || 0 }} 条</span>
          </div>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示提案摘要。</div>
          <div v-else-if="currentSociety.active_proposals.length === 0" class="mt-3 text-xs leading-5 text-muted">当前没有进行中的村社提案。</div>
          <div v-else class="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
            <div v-for="proposal in currentSociety.active_proposals" :key="proposal.id" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-xs text-text">{{ proposal.title }}</p>
                  <p class="mt-1 text-[10px] text-muted">{{ proposal.kind_label }} · {{ proposal.status_label }}</p>
                </div>
                <span class="shrink-0 text-[10px] text-accent">{{ proposal.total_vote_count }} 票</span>
              </div>
              <p class="mt-2 text-[10px] leading-4 text-muted">{{ proposal.summary }}</p>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">提案归档</p>
          <p class="mt-2 text-xs leading-5 text-muted">已归档 {{ currentSociety?.proposal_history.length || 0 }} 条。</p>
        </div>
      </div>

      <div v-else class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="game-panel-muted p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-accent">村社史册</p>
            <span class="text-[10px] text-muted">{{ currentSociety?.chronicle.founded_date_label || '未加入' }}</span>
          </div>
          <div v-if="!currentSociety" class="mt-3 text-xs leading-5 text-muted">加入村社后会显示史册摘要。</div>
          <div v-else class="mt-3 space-y-3">
            <div class="border border-accent/10 bg-black/10 p-2">
              <p class="text-[10px] text-muted">年度摘要</p>
              <p class="mt-1 text-xs leading-5 text-accent">{{ currentSociety.chronicle.annual_summary }}</p>
            </div>
            <div class="grid gap-2 md:grid-cols-2">
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">历任职位</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.role_history.length }} 条</p>
              </div>
              <div class="border border-accent/10 bg-black/10 p-2">
                <p class="text-[10px] text-muted">节会参与</p>
                <p class="mt-1 text-xs text-accent">{{ currentSociety.chronicle.festival_participations.length }} 条</p>
              </div>
            </div>
            <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
              <div v-for="entry in currentSociety.chronicle.public_projects" :key="entry.id" class="border border-accent/10 bg-black/10 p-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-text">{{ entry.label }}</p>
                  <span class="shrink-0 text-[10px]" :class="entry.status === 'completed' ? 'text-success' : 'text-muted'">{{ entry.status_label }}</span>
                </div>
                <p class="mt-1 text-[10px] text-muted">{{ entry.progress }}/{{ entry.target_progress }} · 共 {{ entry.contribution_count }} 条贡献</p>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel-muted p-3">
          <p class="text-sm text-accent">主要贡献成员</p>
          <div v-if="!currentSociety || currentSociety.chronicle.top_contributors.length === 0" class="mt-3 text-xs leading-5 text-muted">当前还没有贡献成员记录。</div>
          <div v-else class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            <div v-for="entry in currentSociety.chronicle.top_contributors" :key="entry.username" class="border border-accent/10 bg-black/10 p-2">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-xs text-text">{{ entry.display_name }}</p>
                <span class="shrink-0 text-[10px] text-accent">{{ entry.contribution_count }} 次</span>
              </div>
              <p class="mt-1 text-[10px] text-muted">{{ entry.project_count }} 项建设 · +{{ entry.total_progress_gain }} 进度</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-vue-next'
  import { useSocietyStore } from '@/stores/useSocietyStore'

  type SocietyTabKey = 'overview' | 'members' | 'storage' | 'projects' | 'proposals' | 'chronicles'
  type SocietyTabMeta = { key: SocietyTabKey; label: string; summary: string }

  const route = useRoute()
  const societyStore = useSocietyStore()
  const tabs: SocietyTabMeta[] = [
    { key: 'overview', label: '总览', summary: '查看我的村社、公告摘要和公开村社入口。' },
    { key: 'members', label: '成员', summary: '查看成员、职位和待处理申请邀请摘要。' },
    { key: 'storage', label: '仓库与福利', summary: '查看公共仓库、福利等级、专属节会和装饰摘要。' },
    { key: 'projects', label: '公共建设', summary: '查看公共建设进度和近期推进状态。' },
    { key: 'proposals', label: '提案', summary: '查看活跃提案和归档数量。' },
    { key: 'chronicles', label: '史册', summary: '查看村社成立、建设、节会参与和贡献成员摘要。' },
  ]

  const normalizeTab = (value: unknown): SocietyTabKey => {
    const raw = Array.isArray(value) ? value[0] : value
    if (raw === 'members' || raw === 'storage' || raw === 'projects' || raw === 'proposals' || raw === 'chronicles') return raw
    return 'overview'
  }

  const activeTab = ref<SocietyTabKey>(normalizeTab(route.query.tab))
  const currentSociety = computed(() => societyStore.mySociety)
  const visibleSocietyPreview = computed(() => societyStore.visibleSocieties.slice(0, 5))
  const memberCount = computed(() => currentSociety.value?.members.length ?? 0)
  const activeProjectCount = computed(() => currentSociety.value?.public_projects.filter(project => project.status !== 'completed').length ?? 0)
  const activeTabMeta = computed(() => tabs.find(tab => tab.key === activeTab.value) ?? tabs[0]!)
  const moduleSummary = computed(() => {
    const society = currentSociety.value
    if (!society) return `当前未加入村社；公开村社 ${societyStore.visibleSocieties.length} 个，待处理邀请 ${societyStore.incomingInvites.length} 条。`
    return `${society.name} · ${society.my_role_label || '成员'} · ${society.member_count}/${society.capacity} 人 · ${activeProjectCount.value} 项建设推进中。`
  })
  const refreshStateLabel = computed(() => societyStore.loading ? '正在刷新村社摘要' : '进入村社模块后会加载摘要信息')
  const summaryStats = computed(() => [
    { label: '我的村社', value: currentSociety.value?.name || '未加入' },
    { label: '公开村社', value: `${societyStore.visibleSocieties.length} 个` },
    { label: '成员', value: `${memberCount.value} 人` },
    { label: '申请邀请', value: `${societyStore.managedRequests.length + societyStore.incomingInvites.length + societyStore.myPendingRequests.length} 条` },
    { label: '公共建设', value: `${currentSociety.value?.public_projects.length || 0} 项` },
    { label: '提案', value: `${currentSociety.value?.active_proposals.length || 0} 条` },
  ])

  const refreshSocietyModule = async () => {
    await societyStore.refreshOverview().catch(() => {})
  }

  watch(
    () => route.query.tab,
    tab => {
      activeTab.value = normalizeTab(tab)
    }
  )

  onMounted(() => {
    void refreshSocietyModule()
  })
</script>
