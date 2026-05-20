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
        <p class="text-[10px] text-muted">{{ card.label }}</p>
        <p class="mt-2 text-lg text-accent">{{ card.value }}</p>
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
import type { AdminOnlineOverviewPayload } from '@/types'
import {
  fetchAdminOnlineAuditLogs,
  fetchAdminOnlineOverview,
  retryAdminActivitySettlement,
  rollbackAdminCoopOrder,
  retryAdminCoopCompensation,
  unbanAdminOnlineUser,
} from '@/utils/adminOnlineApi'

const props = defineProps<{
  canLoad: boolean
}>()

const loading = ref(false)
const busyId = ref('')
const error = ref('')
const overview = ref<AdminOnlineOverviewPayload | null>(null)
const auditLogs = ref<Array<Record<string, any>>>([])

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
    const [nextOverview, nextAudit] = await Promise.all([
      fetchAdminOnlineOverview(),
      fetchAdminOnlineAuditLogs(),
    ])
    overview.value = nextOverview
    auditLogs.value = Array.isArray(nextAudit.logs) ? nextAudit.logs : []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取联机治理数据失败'
  } finally {
    loading.value = false
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
