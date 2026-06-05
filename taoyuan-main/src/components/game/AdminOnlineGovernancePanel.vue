<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-accent">联机治理总览</p>
        <p class="text-xs text-muted mt-1">把委托补偿、误封恢复、举报与联机运行态收口到同一页，优先处理待补偿和待审核事故。</p>
      </div>
      <button class="btn" :disabled="loading" @click="void refresh()">
        <span>{{ loading ? '刷新中...' : '刷新联机治理' }}</span>
      </button>
    </div>

    <div v-if="error" class="text-xs text-danger">{{ error }}</div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in summaryCards" :key="card.label" class="admin-summary-card">
        <p class="text-[0.625rem] text-muted">{{ card.label }}</p>
        <p class="mt-2 text-lg text-accent">{{ card.value }}</p>
      </div>
    </div>

    <div class="game-panel space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm text-accent">联机发布控制</p>
          <p class="text-xs text-muted mt-1 leading-5">把内测环境、灰度通道、模块开关、样板和发布说明收口到同一页；默认 stable 全开，不会主动影响现有玩家。</p>
        </div>
        <button class="btn" :disabled="savingReleaseConfig || !releaseConfigDraft" @click="void saveReleaseConfig()">
          <span>{{ savingReleaseConfig ? '保存中...' : '保存发布配置' }}</span>
        </button>
      </div>

      <div v-if="releaseConfigDraft" class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div class="space-y-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="admin-record-card space-y-3 text-xs text-muted">
              <div class="flex items-center justify-between gap-2">
                <span class="text-accent">联机测试环境</span>
                <button class="btn !px-2 !py-1" @click="releaseConfigDraft.enabled = !releaseConfigDraft.enabled">
                  {{ releaseConfigDraft.enabled ? '关闭' : '开启' }}
                </button>
              </div>
              <div>当前状态：{{ releaseConfigDraft.enabled ? '已启用' : '已关闭' }}</div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="btn !px-2 !py-1"
                  :class="{ '!bg-success !text-bg': releaseConfigDraft.grayChannel === 'stable' }"
                  @click="releaseConfigDraft.grayChannel = 'stable'"
                >
                  稳定
                </button>
                <button
                  class="btn !px-2 !py-1"
                  :class="{ '!bg-warning !text-bg': releaseConfigDraft.grayChannel === 'canary' }"
                  @click="releaseConfigDraft.grayChannel = 'canary'"
                >
                  灰度
                </button>
              </div>
              <div>白名单 {{ releaseConfigDraft.whitelistUsernames.length }} 个账号。</div>
            </div>

            <div class="admin-record-card space-y-3 text-xs text-muted">
              <div class="text-accent">测试账号白名单</div>
              <textarea
                v-model="releaseConfigDraft.testWhitelist"
                rows="5"
                class="online-textarea w-full"
                placeholder="一行一个用户名，或使用逗号分隔"
              />
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div v-for="moduleCard in releaseModuleCards" :key="moduleCard.key" class="admin-record-card space-y-2 text-xs text-muted">
              <div class="flex items-center justify-between gap-2">
                <span class="text-accent">{{ moduleCard.label }}</span>
                <button class="btn !px-2 !py-1" @click="toggleReleaseModule(moduleCard.key)">
                  {{ moduleCard.enabled ? '关闭' : '开放' }}
                </button>
              </div>
              <div>{{ moduleCard.summary }}</div>
              <div>状态：{{ moduleCard.enabled ? '已开放' : '已关闭' }}</div>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">内测庄园样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.manor" type="text" class="online-input w-full" />
            </label>
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">测试村社样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.society" type="text" class="online-input w-full" />
            </label>
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">测试节会样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.festival" type="text" class="online-input w-full" />
            </label>
            <label class="admin-record-card space-y-2 text-xs text-muted">
              <span class="text-accent">测试远征样板</span>
              <input v-model="releaseConfigDraft.betaTemplates.expedition" type="text" class="online-input w-full" />
            </label>
          </div>
        </div>

        <div class="space-y-4">
          <div class="admin-record-card space-y-3 text-xs text-muted">
            <p class="text-sm text-accent">事故预案</p>
            <div v-for="plan in incidentPlaybooks" :key="plan.title" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2">
              <div class="text-accent">{{ plan.title }}</div>
              <div class="mt-1 leading-5">{{ plan.summary }}</div>
            </div>
          </div>

          <div class="admin-record-card space-y-3 text-xs text-muted">
            <p class="text-sm text-accent">发布说明</p>
            <label class="space-y-1 block">
              <span>新功能说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.features" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>可见变化说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.visibleChanges" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>玩家注意事项</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.playerNotice" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>已知问题说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.knownIssues" rows="5" class="online-textarea w-full" />
            </label>
            <label class="space-y-1 block">
              <span>回退策略说明</span>
              <textarea v-model="releaseConfigDraft.releaseNotes.rollbackPlan" rows="5" class="online-textarea w-full" />
            </label>
          </div>

          <div class="admin-record-card space-y-3 text-xs text-muted">
            <p class="text-sm text-accent">发布闸门</p>
            <div v-for="item in releaseChecklistItems" :key="item.id" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-accent">{{ item.label }}</span>
                <span>{{ item.owner }}</span>
              </div>
            </div>
            <div class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
              <div class="text-accent">默认公告模板</div>
              <div v-for="line in releaseAnnouncementLines" :key="line" class="mt-1">{{ line }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="game-panel space-y-4">
      <div>
        <p class="text-sm text-accent">联机扩展模板</p>
        <p class="text-xs text-muted mt-1 leading-5">把后续新内容接入约束先写死：默认复用现有 runtime、状态机、结算凭证和五大面板，不另起第二套底层。</p>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <div v-for="template in expansionTemplates" :key="template.id" class="admin-record-card space-y-2 text-xs text-muted">
          <div class="flex items-center justify-between gap-2">
            <span class="text-accent">{{ template.label }}</span>
            <span>{{ template.module }}</span>
          </div>
          <div>挂点：{{ template.anchors }}</div>
          <div>交付：{{ template.delivery }}</div>
          <div>验收：{{ template.acceptance }}</div>
        </div>
      </div>
      <div class="grid gap-3 xl:grid-cols-3">
        <div v-for="group in expansionSlotGroups" :key="group.id" class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">{{ group.label }}</p>
          <div v-for="item in group.items" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="game-panel space-y-4">
      <div>
        <p class="text-sm text-accent">联机版本整理</p>
        <p class="text-xs text-muted mt-1 leading-5">把当前已落地功能、待补项、风险、灰度口径和最终验收条件汇总到一个后台可读页面，方便后续继续扩线时对照。</p>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <div v-for="section in versionHandoffSections" :key="section.id" class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">{{ section.label }}</p>
          <div v-for="item in section.items" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
      </div>
      <div class="grid gap-3 xl:grid-cols-2">
        <div class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">阶段检查点</p>
          <div v-for="item in stageCheckpoints" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
        <div class="admin-record-card space-y-2 text-xs text-muted">
          <p class="text-sm text-accent">最终验收口径</p>
          <div v-for="item in finalAcceptanceItems" :key="item" class="rounded-xs border border-accent/10 bg-bg/10 px-2 py-2 leading-5">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
      <div class="space-y-4">
        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">委托补偿</p>
            <span class="text-xs text-muted">{{ pendingCompensations.length }} 条待处理</span>
          </div>
          <div v-if="!pendingCompensations.length" class="text-xs text-muted">当前没有待处理的委托补偿。</div>
          <div v-else class="space-y-2">
            <div
              v-for="entry in pendingCompensations"
              :key="entry.id"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">#{{ entry.id }}</span>
                <span>{{ formatTime(entry.updated_at || entry.created_at) }}</span>
              </div>
              <div>单号：{{ entry.order_id }}{{ entry.stage_id ? ` / 阶段 ${entry.stage_id}` : '' }}</div>
              <div>发布人：{{ entry.owner_username }} · 承接人：{{ entry.assignee_username }}</div>
              <div>原因：{{ entry.reason || entry.last_error || '待补偿' }}</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="busyId === entry.id" @click="void retryCompensation(entry.id)">
                  {{ busyId === entry.id ? '处理中...' : '重放补偿' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">委托回滚</p>
            <span class="text-xs text-muted">仅允许回滚仍处于 open、尚未交付的委托</span>
          </div>
          <div v-if="!rollbackableOrders.length" class="text-xs text-muted">当前没有可安全回滚的委托。</div>
          <div v-else class="space-y-2">
            <div
              v-for="order in rollbackableOrders"
              :key="order.id"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ order.title || order.id }}</span>
                <span>{{ order.scope }} / {{ order.delivery_status }}</span>
              </div>
              <div>发布人：{{ order.owner_display_name || order.owner_username }}</div>
              <div>承接人：{{ order.assignee_display_name || order.assignee_username || '未接单' }}</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-danger !px-2 !py-1" :disabled="busyId === order.id" @click="void rollbackOrder(order.id)">
                  {{ busyId === order.id ? '处理中...' : '回滚委托' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">结算重放</p>
            <span class="text-xs text-muted">{{ retryableRooms.length }} 个房间仍在结算中</span>
          </div>
          <div v-if="!retryableRooms.length" class="text-xs text-muted">当前没有需要重放结算的活动房间。</div>
          <div v-else class="space-y-2">
            <div
              v-for="room in retryableRooms"
              :key="room.id"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ room.title || room.id }}</span>
                <span>{{ room.activity_domain }} / {{ room.state }}</span>
              </div>
              <div>房主：{{ room.host_display_name || room.host_username }}</div>
              <div>成员：{{ room.members?.length || 0 }} 人</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="busyId === room.id" @click="void retryRoomSettlement(room.id)">
                  {{ busyId === room.id ? '处理中...' : '重放结算' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">误封恢复</p>
            <span class="text-xs text-muted">最近封禁账号</span>
          </div>
          <div v-if="!bannedPlayers.length" class="text-xs text-muted">当前没有可恢复的封禁账号。</div>
          <div v-else class="space-y-2">
            <div
              v-for="player in bannedPlayers"
              :key="player.username"
              class="admin-record-card text-xs text-muted space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ player.display_name || player.username }}</span>
                <span>@{{ player.username }}</span>
              </div>
              <div>封禁时间：{{ formatTime(player.banned_at || player.updated_at || player.created_at) }}</div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="busyId === player.username" @click="void unbanUser(player.username)">
                  {{ busyId === player.username ? '处理中...' : '恢复正常' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">联机模块概览</p>
            <span class="text-xs text-muted">当前快照</span>
          </div>
          <div class="text-xs text-muted space-y-2">
            <div>最近玩家：{{ recentPlayerCount }} 个</div>
            <div>村社：{{ societyCount }} 个</div>
            <div>活动房间：{{ activeRoomCount }} 个</div>
            <div>热门庄园：{{ hotManorCount }} 个</div>
            <div>图片黑名单：{{ imageBlacklistCount }} 条</div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">待处理举报</p>
            <span class="text-xs text-muted">帖子 {{ hallReports.length }} / 图片 {{ imageReports.length }}</span>
          </div>
          <div v-if="!hallReports.length && !imageReports.length" class="text-xs text-muted">当前没有待处理举报。</div>
          <div v-else class="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
            <div v-for="report in hallReports" :key="report.id" class="admin-record-card text-xs text-muted space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">帖子举报</span>
                <span>{{ formatTime(report.created_at) }}</span>
              </div>
              <div>{{ report.target_author_display_name || report.target_author || report.post_id }}</div>
              <div>{{ report.reason }}</div>
            </div>
            <div v-for="report in imageReports" :key="report.id" class="admin-record-card text-xs text-muted space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">图片举报</span>
                <span>{{ formatTime(report.created_at) }}</span>
              </div>
              <div>{{ report.target_display_name || report.target_username }}</div>
              <div>{{ report.reason }}</div>
            </div>
          </div>
        </div>

        <div class="game-panel space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-accent">联机审计</p>
            <span class="text-xs text-muted">最近 {{ auditLogs.length }} 条</span>
          </div>
          <div v-if="!auditLogs.length" class="text-xs text-muted">当前没有在线审计日志。</div>
          <div v-else class="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
            <div v-for="log in auditLogs" :key="log.id" class="admin-record-card text-xs text-muted space-y-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-accent">{{ log.action || log.route_key || 'online' }}</span>
                <span>{{ formatTime(log.created_at) }}</span>
              </div>
              <div>玩家：{{ log.username || '-' }} → {{ log.target_username || '-' }}</div>
              <div>结果：{{ log.outcome || '-' }} / {{ log.status_code || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showFloat } from '@/composables/useGameLog'
import { WS12_COMPENSATION_PLANS, WS12_RELEASE_ANNOUNCEMENT, WS12_RELEASE_CHECKLIST } from '@/data/goals'
import {
  ONLINE_EXPANSION_SLOT_GROUPS,
  ONLINE_EXPANSION_TEMPLATES,
  ONLINE_FINAL_ACCEPTANCE,
  ONLINE_STAGE_CHECKPOINTS,
  ONLINE_VERSION_HANDOFF_SECTIONS,
} from '@/data/onlineExpansion'
import type { AdminOnlineOverviewPayload, OnlineReleaseConfig } from '@/types'
import {
  fetchAdminOnlineAuditLogs,
  fetchAdminOnlineOverview,
  fetchAdminOnlineReleaseConfig,
  retryAdminActivitySettlement,
  rollbackAdminCoopOrder,
  retryAdminCoopCompensation,
  saveAdminOnlineReleaseConfig,
  unbanAdminOnlineUser,
} from '@/utils/adminOnlineApi'

const props = defineProps<{
  canLoad: boolean
}>()

const loading = ref(false)
const busyId = ref('')
const error = ref('')
const savingReleaseConfig = ref(false)
const createDefaultReleaseConfig = (): OnlineReleaseConfig => ({
  enabled: true,
  grayChannel: 'stable',
  featureFlags: {
    socialFriendsEnabled: true,
    manorVisitEnabled: true,
    coopOrderEnabled: true,
    festivalRoomEnabled: true,
    expeditionRoomEnabled: true,
  },
  moduleSwitches: {
    social: true,
    manor: true,
    order: true,
    festival: true,
    expedition: true,
    society: true,
  },
  testWhitelist: '',
  whitelistUsernames: [],
  betaTemplates: {
    manor: '桃源联机内测样板庄园',
    society: '桃源联机测试村社',
    festival: '桃源联机测试节会',
    expedition: '桃源联机测试远征',
  },
  releaseNotes: {
    features: '',
    visibleChanges: '',
    playerNotice: '',
    knownIssues: '',
    rollbackPlan: '',
  },
})

const cloneReleaseConfig = (config: OnlineReleaseConfig): OnlineReleaseConfig => JSON.parse(JSON.stringify(config))
const overview = ref<AdminOnlineOverviewPayload | null>(null)
const auditLogs = ref<Array<Record<string, any>>>([])
const releaseConfigDraft = ref<OnlineReleaseConfig>(createDefaultReleaseConfig())

const summaryCards = computed(() => {
  const summary = overview.value?.summary
  if (!summary) return []
  return [
    { label: '活动房间', value: summary.active_room_count },
    { label: '活动待补偿', value: summary.pending_activity_receipt_count },
    { label: '委托待补偿', value: summary.pending_coop_compensation_count },
    { label: '待审核举报', value: summary.pending_hall_report_count + summary.pending_image_report_count },
  ]
})

const pendingCompensations = computed(() => (overview.value?.coop.compensations || []) as Array<Record<string, any>>)
const rollbackableOrders = computed(() => ((overview.value?.coop.orders || []) as Array<Record<string, any>>)
  .filter(order => order.status === 'open' && order.delivery_status === 'none' && !order.assignee_username))
const retryableRooms = computed(() => ((overview.value?.activities.rooms || []) as Array<Record<string, any>>)
  .filter(room => room.state === 'settling'))
const bannedPlayers = computed(() => ((overview.value?.recent_players || []) as Array<Record<string, any>>)
  .filter(player => player.status === 'banned'))
const hallReports = computed(() => ((overview.value?.hall.reports || []) as Array<Record<string, any>>)
  .filter(report => report.status === 'pending'))
const imageReports = computed(() => ((overview.value?.hall.image_reports || []) as Array<Record<string, any>>)
  .filter(report => report.status === 'pending'))
const societyCount = computed(() => (overview.value?.societies || []).length)
const activeRoomCount = computed(() => (overview.value?.activities.rooms || []).length)
const hotManorCount = computed(() => (overview.value?.manor.hot_manors || []).length)
const recentPlayerCount = computed(() => (overview.value?.recent_players || []).length)
const imageBlacklistCount = computed(() => (overview.value?.hall.image_blacklist || []).length)
const releaseChecklistItems = computed(() => WS12_RELEASE_CHECKLIST)
const releaseAnnouncementLines = computed(() => [...WS12_RELEASE_ANNOUNCEMENT])
const expansionTemplates = computed(() => ONLINE_EXPANSION_TEMPLATES)
const expansionSlotGroups = computed(() => ONLINE_EXPANSION_SLOT_GROUPS)
const versionHandoffSections = computed(() => ONLINE_VERSION_HANDOFF_SECTIONS)
const stageCheckpoints = computed(() => ONLINE_STAGE_CHECKPOINTS)
const finalAcceptanceItems = computed(() => ONLINE_FINAL_ACCEPTANCE)
const releaseModuleCards = computed(() => {
  const draft = releaseConfigDraft.value
  if (!draft) return []
  return [
    {
      key: 'social' as const,
      label: '好友功能',
      enabled: draft.moduleSwitches.social && draft.featureFlags.socialFriendsEnabled,
      summary: '对应好友关系、申请、接受和拒绝链路，可单独小范围灰度。'
    },
    {
      key: 'manor' as const,
      label: '庄园互访',
      enabled: draft.moduleSwitches.manor && draft.featureFlags.manorVisitEnabled,
      summary: '对应庄园公开页、留言、来访记录与收藏关注读写。'
    },
    {
      key: 'order' as const,
      label: '求助单',
      enabled: draft.moduleSwitches.order && draft.featureFlags.coopOrderEnabled,
      summary: '对应委托发布、接单、交付、确认和补偿重试链路。'
    },
    {
      key: 'festival' as const,
      label: '节会房间',
      enabled: draft.moduleSwitches.festival && draft.featureFlags.festivalRoomEnabled,
      summary: '对应房间创建、邀请、准备、断线恢复、结算和关闭链路。'
    },
    {
      key: 'expedition' as const,
      label: '远征房间',
      enabled: draft.moduleSwitches.expedition && draft.featureFlags.expeditionRoomEnabled,
      summary: '对应远征房间创建、邀请、准备、玩法动作、结算和关闭链路。'
    },
  ]
})
const incidentPlaybooks = computed(() => [
  {
    title: '结算失败回滚',
    summary: `当前可直接处理委托回滚 ${rollbackableOrders.value.length} 条、结算重放 ${retryableRooms.value.length} 个房间。`
  },
  {
    title: '送礼失败补发',
    summary: `通过邮件管理页的补偿 / 活动奖励模板补发玩家礼物或说明；当前可复用 ${WS12_COMPENSATION_PLANS.length} 条既有补偿预案，不改原有结算口径。`
  },
  {
    title: '房间断线补偿',
    summary: '节会与远征房间已支持 disconnect / reconnect；若房间停在 settling，可在本页继续执行结算重放。'
  },
  {
    title: '公共事件重算',
    summary: '世界事件以实时总览为准，先切回 stable，再按当前世界事件总览与 smoke 链路复核公共进度与纪年快照。'
  },
  {
    title: '审核误伤恢复',
    summary: `当前可直接恢复误封账号；若涉及图片 / 大厅误伤，再结合现有举报与黑名单面板回滚可见性。最近封禁 ${bannedPlayers.value.length} 个账号。`
  },
])

const formatTime = (timestamp?: number | null) => {
  if (!timestamp) return '-'
  return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const refresh = async () => {
  if (!props.canLoad) return
  loading.value = true
  error.value = ''
  try {
    const [nextOverview, nextAudit, nextReleaseConfig] = await Promise.all([
      fetchAdminOnlineOverview(),
      fetchAdminOnlineAuditLogs(),
      fetchAdminOnlineReleaseConfig(),
    ])
    overview.value = nextOverview
    auditLogs.value = Array.isArray(nextAudit.logs) ? nextAudit.logs : []
    releaseConfigDraft.value = cloneReleaseConfig(nextReleaseConfig)
  } catch (err) {
    releaseConfigDraft.value = createDefaultReleaseConfig()
    error.value = err instanceof Error ? err.message : '获取联机治理数据失败'
  } finally {
    loading.value = false
  }
}

const normalizeWhitelistDraft = (draft: OnlineReleaseConfig) => {
  draft.testWhitelist = draft.testWhitelist
    .split(/\r?\n|,/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join('\n')
  draft.whitelistUsernames = draft.testWhitelist
    ? draft.testWhitelist.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
    : []
}

const toggleReleaseModule = (moduleKey: 'social' | 'manor' | 'order' | 'festival' | 'expedition') => {
  if (!releaseConfigDraft.value) return
  if (moduleKey === 'social') {
    releaseConfigDraft.value.moduleSwitches.social = !releaseConfigDraft.value.moduleSwitches.social
    releaseConfigDraft.value.featureFlags.socialFriendsEnabled = releaseConfigDraft.value.moduleSwitches.social
    return
  }
  if (moduleKey === 'manor') {
    releaseConfigDraft.value.moduleSwitches.manor = !releaseConfigDraft.value.moduleSwitches.manor
    releaseConfigDraft.value.featureFlags.manorVisitEnabled = releaseConfigDraft.value.moduleSwitches.manor
    return
  }
  if (moduleKey === 'order') {
    releaseConfigDraft.value.moduleSwitches.order = !releaseConfigDraft.value.moduleSwitches.order
    releaseConfigDraft.value.featureFlags.coopOrderEnabled = releaseConfigDraft.value.moduleSwitches.order
    return
  }
  if (moduleKey === 'expedition') {
    releaseConfigDraft.value.moduleSwitches.expedition = !releaseConfigDraft.value.moduleSwitches.expedition
    releaseConfigDraft.value.featureFlags.expeditionRoomEnabled = releaseConfigDraft.value.moduleSwitches.expedition
    return
  }
  releaseConfigDraft.value.moduleSwitches.festival = !releaseConfigDraft.value.moduleSwitches.festival
  releaseConfigDraft.value.featureFlags.festivalRoomEnabled = releaseConfigDraft.value.moduleSwitches.festival
}

const saveReleaseConfig = async () => {
  savingReleaseConfig.value = true
  try {
    normalizeWhitelistDraft(releaseConfigDraft.value)
    const saved = await saveAdminOnlineReleaseConfig(releaseConfigDraft.value)
    releaseConfigDraft.value = cloneReleaseConfig(saved)
    showFloat('联机发布配置已保存', 'success')
  } catch (err) {
    showFloat(err instanceof Error ? err.message : '保存联机发布配置失败', 'danger')
  } finally {
    savingReleaseConfig.value = false
  }
}

const withBusy = async (id: string, runner: () => Promise<void>) => {
  busyId.value = id
  try {
    await runner()
    await refresh()
  } finally {
    busyId.value = ''
  }
}

const retryCompensation = async (compensationId: string) => {
  await withBusy(compensationId, async () => {
    await retryAdminCoopCompensation(compensationId)
    showFloat('补偿已重放', 'success')
  })
}

const rollbackOrder = async (orderId: string) => {
  if (typeof window !== 'undefined' && !window.confirm('确认回滚这条未交付委托吗？')) return
  await withBusy(orderId, async () => {
    await rollbackAdminCoopOrder(orderId)
    showFloat('委托已回滚', 'success')
  })
}

const retryRoomSettlement = async (roomId: string) => {
  await withBusy(roomId, async () => {
    await retryAdminActivitySettlement(roomId)
    showFloat('活动结算已重放', 'success')
  })
}

const unbanUser = async (username: string) => {
  if (typeof window !== 'undefined' && !window.confirm(`确认恢复账号 ${username} 为正常状态吗？`)) return
  await withBusy(username, async () => {
    await unbanAdminOnlineUser(username)
    showFloat('账号已恢复正常', 'success')
  })
}

onMounted(() => {
  void refresh()
})
</script>

<style scoped>
.admin-summary-card {
  border: 1px solid rgba(227, 179, 65, 0.16);
  background: rgba(12, 16, 24, 0.22);
  border-radius: 10px;
  padding: 0.9rem 1rem;
}
</style>
