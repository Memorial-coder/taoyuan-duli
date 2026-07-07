<template>
  <div class="space-y-4" data-testid="admin-log-center-panel">
    <div class="game-panel space-y-4">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-sm text-accent">日志中心</p>
          <p class="text-xs text-muted mt-1">统一检索管理审计、在线审计、内容审核、内容发布和游戏长期日志。</p>
        </div>
        <button class="btn !px-3 !py-2" @click="refreshAll" :disabled="loadingAny">
          {{ loadingAny ? '刷新中...' : '刷新日志' }}
        </button>
      </div>

      <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

      <div class="admin-log-overview-grid" data-testid="admin-log-overview">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="admin-log-source"
          :class="{ 'admin-log-source--active': activeTab === tab.key }"
          :disabled="tab.key === 'admin_audit' && !canViewAudit"
          @click="setActiveTab(tab.key)"
        >
          <span class="text-[0.6875rem] text-muted">{{ tab.label }}</span>
          <span class="admin-log-source__count">{{ formatCount(sourceTotal(tab.key)) }}</span>
          <span class="text-[0.6875rem] text-muted">{{ sourceSubline(tab.key) }}</span>
          <span class="text-[0.6875rem] text-muted">{{ sourceLatestLine(tab.key) }}</span>
        </button>
      </div>

      <div class="admin-log-tabs" data-testid="admin-log-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="admin-log-tab"
          :class="{ 'admin-log-tab--active': activeTab === tab.key }"
          :disabled="tab.key === 'admin_audit' && !canViewAudit"
          @click="setActiveTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6" data-testid="admin-log-filters">
        <label class="admin-label">
          <span>{{ usernameFilterLabel }}</span>
          <input v-model="filters.username" type="text" class="admin-input" :placeholder="usernameFilterPlaceholder" @keydown.enter.prevent="refreshActive" />
        </label>
        <label class="admin-label">
          <span>{{ actionFilterLabel }}</span>
          <input v-model="filters.action" type="text" class="admin-input" :placeholder="actionFilterPlaceholder" @keydown.enter.prevent="refreshActive" />
        </label>
        <label class="admin-label">
          <span>结果</span>
          <input v-model="filters.outcome" type="text" class="admin-input" placeholder="completed / rejected" @keydown.enter.prevent="refreshActive" />
        </label>
        <label class="admin-label">
          <span>{{ categoryFilterLabel }}</span>
          <input v-model="filters.category" type="text" class="admin-input" :placeholder="categoryFilterPlaceholder" @keydown.enter.prevent="refreshActive" />
        </label>
        <label class="admin-label">
          <span>开始时间</span>
          <input v-model="filters.createdFrom" type="datetime-local" class="admin-input" />
        </label>
        <label class="admin-label">
          <span>结束时间</span>
          <input v-model="filters.createdTo" type="datetime-local" class="admin-input" />
        </label>
      </div>

      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label class="admin-label">
          <span>关键词</span>
          <input v-model="filters.keyword" type="text" class="admin-input" :placeholder="keywordFilterPlaceholder" @keydown.enter.prevent="refreshActive" />
        </label>
        <div class="flex items-end gap-2">
          <button class="btn !px-3 !py-2" @click="refreshActive" :disabled="loadingAny">应用筛选</button>
          <button class="btn !px-3 !py-2" @click="resetFilters" :disabled="loadingAny">清空</button>
        </div>
      </div>
    </div>

    <div class="game-panel space-y-4" data-testid="admin-log-results">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-sm text-accent">{{ activeTabLabel }}</p>
          <p class="text-xs text-muted mt-1">{{ activePolicyText }}</p>
          <p class="text-xs text-muted mt-1">{{ activeFilterText }}</p>
        </div>
        <div class="text-xs text-muted">
          共 {{ formatCount(activeTotal) }} 条 · 第 {{ activePage }} / {{ activePageCount }} 页
        </div>
      </div>

      <div v-if="activeLoading" class="text-xs text-muted">日志加载中...</div>
      <div v-else-if="!activeRows.length" class="text-xs text-muted">当前筛选下暂无日志。</div>
      <div v-else class="admin-log-list">
        <article v-for="row in activeRows" :key="row.id" class="admin-record-card text-xs text-muted space-y-2">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="text-text break-all">{{ row.title }}</div>
              <div class="text-[0.6875rem] text-muted mt-1">{{ row.subtitle }}</div>
            </div>
            <span class="admin-chip">{{ row.badge }}</span>
          </div>
          <div>{{ formatTime(row.created_at) }} · {{ row.sourceLabel }}</div>
          <div v-if="row.detail">详情：{{ row.detail }}</div>
        </article>
      </div>

      <div class="admin-log-pager" data-testid="admin-log-pager">
        <button class="btn !px-3 !py-2" :disabled="activePage <= 1 || activeLoading" @click="goPage(-1)">上一页</button>
        <button class="btn !px-3 !py-2" :disabled="activePage >= activePageCount || activeLoading" @click="goPage(1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import {
    fetchAdminLogCenterOverview,
    fetchAdminPrivateChatMessages,
    fetchContentRevisions,
    fetchGameplayLogs,
    type AdminPrivateChatMessageEntry,
    type AdminLogCenterOverviewResult,
    type ContentRevisionEntry,
    type GameplayLogEntry,
  } from '@/utils/adminContentApi'
  import {
    fetchAdminContentModerationEvents,
    fetchAdminContentRiskSignals,
    fetchAdminOnlineAuditLogPage,
  } from '@/utils/adminOnlineApi'
  import type { AdminContentModerationEvent, AdminContentRiskSignal } from '@/types'
  import { fetchAdminAuditLogs, type AdminAuditLogEntry } from '@/utils/userAdminApi'
  import { showFloat } from '@/composables/useGameLog'

  type LogTabKey = 'all' | 'admin_audit' | 'online_audit' | 'content_moderation' | 'gameplay' | 'private_chat' | 'content_revision'

  interface NormalizedLogRow {
    id: string
    source: LogTabKey
    sourceLabel: string
    title: string
    subtitle: string
    badge: string
    detail: string
    created_at: number
  }

  const props = defineProps<{
    canLoad: boolean
    canViewAudit: boolean
  }>()

  const announcementAuditActions = [
    'create_taoyuan_announcement',
    'update_taoyuan_announcement',
    'publish_taoyuan_announcement',
    'offline_taoyuan_announcement',
    'delete_taoyuan_announcement',
  ]

  const tabs: Array<{ key: LogTabKey; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'admin_audit', label: '管理审计' },
    { key: 'online_audit', label: '在线审计' },
    { key: 'content_moderation', label: '内容审核' },
    { key: 'gameplay', label: '游戏日志' },
    { key: 'private_chat', label: '私聊记录' },
    { key: 'content_revision', label: '内容发布' },
  ]

  const activeTab = ref<LogTabKey>('all')
  const overview = ref<AdminLogCenterOverviewResult['sources'] | null>(null)
  const pageSize = 40
  const pages = reactive<Record<LogTabKey, number>>({
    all: 1,
    admin_audit: 1,
    online_audit: 1,
    content_moderation: 1,
    gameplay: 1,
    private_chat: 1,
    content_revision: 1,
  })
  const totals = reactive<Record<LogTabKey, number>>({
    all: 0,
    admin_audit: 0,
    online_audit: 0,
    content_moderation: 0,
    gameplay: 0,
    private_chat: 0,
    content_revision: 0,
  })
  const rows = reactive<Record<LogTabKey, NormalizedLogRow[]>>({
    all: [],
    admin_audit: [],
    online_audit: [],
    content_moderation: [],
    gameplay: [],
    private_chat: [],
    content_revision: [],
  })
  const loading = reactive<Record<LogTabKey | 'overview', boolean>>({
    all: false,
    admin_audit: false,
    online_audit: false,
    content_moderation: false,
    gameplay: false,
    private_chat: false,
    content_revision: false,
    overview: false,
  })
  const filters = reactive({
    username: '',
    action: '',
    outcome: '',
    category: '',
    keyword: '',
    createdFrom: '',
    createdTo: '',
  })
  const errorMessage = ref('')

  const loadingAny = computed(() => Object.values(loading).some(Boolean))
  const activeTabLabel = computed(() => tabs.find(tab => tab.key === activeTab.value)?.label || '全部')
  const activeRows = computed(() => rows[activeTab.value])
  const activePage = computed(() => pages[activeTab.value])
  const activeTotal = computed(() => totals[activeTab.value])
  const activeLoading = computed(() => loading[activeTab.value])
  const activePageCount = computed(() => Math.max(1, Math.ceil(activeTotal.value / pageSize)))
  const isPrivateChatTab = computed(() => activeTab.value === 'private_chat')
  const usernameFilterLabel = computed(() => isPrivateChatTab.value ? '参与人' : '用户名')
  const usernameFilterPlaceholder = computed(() => isPrivateChatTab.value ? '发送者或接收者账号' : '目标或玩家账号')
  const actionFilterLabel = computed(() => isPrivateChatTab.value ? '发送者' : '动作')
  const actionFilterPlaceholder = computed(() => isPrivateChatTab.value ? '发送者账号' : 'action / route')
  const categoryFilterLabel = computed(() => isPrivateChatTab.value ? '接收者' : '分类/场景')
  const categoryFilterPlaceholder = computed(() => isPrivateChatTab.value ? '接收者账号' : 'system / hall / scene')
  const keywordFilterPlaceholder = computed(() => isPrivateChatTab.value ? '私聊内容、图片说明、发送者或接收者' : '游戏日志消息、元数据或内容标题')

  const toTimestamp = (value: string) => {
    if (!value) return undefined
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : undefined
  }

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCount = (value?: number | null) => new Intl.NumberFormat('zh-CN').format(Math.max(0, Number(value) || 0))

  const formatDetail = (detail: Record<string, unknown> = {}, maxEntries = 8) => {
    const entries = Object.entries(detail || {}).filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    if (!entries.length) return ''
    return entries.slice(0, maxEntries).map(([key, value]) => `${key}: ${String(value)}`).join('；')
  }

  const sourceOverview = (key: LogTabKey) => {
    if (key === 'all') return null
    return overview.value?.[key] || null
  }

  const sourceTotal = (key: LogTabKey) => {
    if (key !== 'all') return sourceOverview(key)?.total || 0
    return ['admin_audit', 'online_audit', 'content_moderation', 'gameplay', 'private_chat', 'content_revision']
      .reduce((sum, item) => sum + (overview.value?.[item as Exclude<LogTabKey, 'all'>]?.total || 0), 0)
  }

  const sourceSubline = (key: LogTabKey) => {
    if (key === 'all') {
      return `汇总 ${formatCount(sourceTotal(key))} 条`
    }
    const source = sourceOverview(key)
    if (!source) return '等待刷新'
    if (key === 'gameplay') return `30 天 · 上限 ${formatCount(source.max_total)}`
    if (key === 'private_chat') return source.retention_label || '长期保留'
    if (source.retention_label) return source.retention_label
    if (source.retention_days) return `${source.retention_days} 天留存${source.preserves_major_evidence ? ' · 重大保留' : ''}`
    return source.latest_created_at ? `最近 ${formatTime(source.latest_created_at)}` : '暂无记录'
  }

  const sourceLatestLine = (key: LogTabKey) => {
    if (key === 'all') {
      const latest = ['admin_audit', 'online_audit', 'content_moderation', 'gameplay', 'private_chat', 'content_revision']
        .reduce((max, item) => Math.max(max, overview.value?.[item as Exclude<LogTabKey, 'all'>]?.latest_created_at || 0), 0)
      return latest ? `最近写入 ${formatTime(latest)}` : '最近写入 -'
    }
    const source = sourceOverview(key)
    return source?.latest_created_at ? `最近写入 ${formatTime(source.latest_created_at)}` : '最近写入 -'
  }

  const activePolicyText = computed(() => {
    if (activeTab.value === 'all') return '聚合展示各日志源第一页结果，按时间倒序合并。'
    const source = sourceOverview(activeTab.value)
    if (activeTab.value === 'gameplay') return `默认留存 30 天，最多 ${formatCount(source?.max_total || 1000000)} 条，单用户单存档最多 ${formatCount(source?.max_per_user_slot || 24000)} 条。`
    if (activeTab.value === 'private_chat') return `${source?.retention_label || '每会话最近 500 条'}，展示发送者、接收者、内容和发送时间。`
    if (source?.retention_label) return `${source.retention_label}，当前总数 ${formatCount(source.total)} 条。`
    if (source?.retention_days) return `至少留存 ${source.retention_days} 天${source.preserves_major_evidence ? '，重大证据类日志不过期清理' : ''}。`
    return '显示真实总数、分页和当前筛选条件。'
  })

  const activeFilterText = computed(() => {
    const items = [
      filters.createdFrom ? `开始 ${filters.createdFrom}` : '',
      filters.createdTo ? `结束 ${filters.createdTo}` : '',
      filters.username.trim() ? `${isPrivateChatTab.value ? '参与人' : '用户'} ${filters.username.trim()}` : '',
      filters.action.trim() ? `${isPrivateChatTab.value ? '发送者' : '动作'} ${filters.action.trim()}` : '',
      filters.outcome.trim() ? `结果 ${filters.outcome.trim()}` : '',
      filters.category.trim() ? `${isPrivateChatTab.value ? '接收者' : '分类/场景'} ${filters.category.trim()}` : '',
      filters.keyword.trim() ? `关键词 ${filters.keyword.trim()}` : '',
    ].filter(Boolean)
    return items.length ? `当前筛选：${items.join(' · ')}` : '当前筛选：全部'
  })

  const normalizeAdminAudit = (log: AdminAuditLogEntry): NormalizedLogRow => ({
    id: `admin_${log.id}`,
    source: 'admin_audit',
    sourceLabel: '管理审计',
    title: log.action || 'admin_action',
    subtitle: `${log.operator_name || log.operator_role || '管理员'} · 目标 ${log.target_username || '-'}`,
    badge: String((log as AdminAuditLogEntry & { outcome?: string }).outcome || log.detail?.outcome || 'completed'),
    detail: formatDetail(log.detail),
    created_at: Number(log.created_at) || 0,
  })

  const normalizeOnlineAudit = (log: Record<string, any>): NormalizedLogRow => ({
    id: `online_${log.id}`,
    source: 'online_audit',
    sourceLabel: '在线审计',
    title: String(log.action || log.route_key || 'online_action'),
    subtitle: `${log.username || 'guest'} · ${log.method || 'POST'} ${log.path || log.route_key || '-'}`,
    badge: String(log.outcome || log.status_code || 'completed'),
    detail: formatDetail(log.detail || {}),
    created_at: Number(log.created_at) || 0,
  })

  const normalizeModerationEvent = (event: AdminContentModerationEvent): NormalizedLogRow => ({
    id: `moderation_${event.id}`,
    source: 'content_moderation',
    sourceLabel: '内容审核',
    title: `${event.action || 'moderation'} · ${event.scene || event.content_type || '-'}`,
    subtitle: `${event.username || 'guest'} · ${event.matched_category || event.severity || '-'}`,
    badge: event.outcome || event.severity || 'review',
    detail: formatDetail({
      excerpt: event.content_excerpt,
      rule: event.rule_version,
      request_id: event.request_id,
    }),
    created_at: Number(event.created_at) || 0,
  })

  const normalizeRiskSignal = (signal: AdminContentRiskSignal): NormalizedLogRow => ({
    id: `risk_${signal.id}`,
    source: 'content_moderation',
    sourceLabel: '风险信号',
    title: `${signal.signal_type || 'risk_signal'} · 风险 ${signal.risk_score || 0}`,
    subtitle: `${signal.username || signal.usernames?.[0] || 'guest'} · ${signal.scene || signal.target_type || '-'}`,
    badge: signal.status || signal.outcome || 'pending',
    detail: formatDetail({
      reason: signal.reason_code,
      events: signal.event_count,
      reports: signal.report_count,
    }),
    created_at: Number(signal.updated_at || signal.created_at) || 0,
  })

  const normalizeGameplay = (log: GameplayLogEntry): NormalizedLogRow => ({
    id: `gameplay_${log.id}`,
    source: 'gameplay',
    sourceLabel: '游戏日志',
    title: log.message || 'gameplay_log',
    subtitle: `${log.username || 'guest'} · ${log.category || 'system'} · ${log.route_name || '-'}`,
    badge: log.day_label || '未标记日期',
    detail: [
      log.tags?.length ? `标签: ${log.tags.join('、')}` : '',
      formatDetail(log.meta || {}),
    ].filter(Boolean).join('；'),
    created_at: Number(log.created_at) || 0,
  })

  const privateChatTypeLabel = (type: string) => {
    if (type === 'photo') return '图片'
    if (type === 'gift') return '礼物'
    return '文字'
  }

  const normalizePrivateChat = (message: AdminPrivateChatMessageEntry): NormalizedLogRow => ({
    id: `private_chat_${message.id}`,
    source: 'private_chat',
    sourceLabel: '私聊记录',
    title: message.content || message.photo_alt || (message.type === 'gift' ? '礼物私聊' : '私聊消息'),
    subtitle: `发送者 ${message.sender_display_name || message.sender_username || '-'}（${message.sender_username || '-'}） · 接收者 ${message.recipient_display_name || message.recipient_username || '-'}（${message.recipient_username || '-'}）`,
    badge: privateChatTypeLabel(message.type),
    detail: formatDetail({
      发送者: message.sender_username,
      接收者: message.recipient_username,
      内容: message.content,
      图片: message.photo_url,
      图片说明: message.photo_alt,
      礼物数量: message.gift_reward_count,
      领取时间: message.gift_claimed_at ? formatTime(message.gift_claimed_at) : '',
    }),
    created_at: Number(message.created_at) || 0,
  })

  const normalizeContentRevision = (revision: ContentRevisionEntry): NormalizedLogRow => ({
    id: `revision_${revision.id}`,
    source: 'content_revision',
    sourceLabel: '内容发布',
    title: revision.title || revision.content_key || 'content_revision',
    subtitle: `${revision.operator_name || revision.operator_role || '管理员'} · ${revision.content_key}`,
    badge: revision.published ? '已发布' : '草稿',
    detail: revision.summary || '',
    created_at: Number(revision.created_at) || 0,
  })

  const normalizeAnnouncementAudit = (log: AdminAuditLogEntry): NormalizedLogRow => ({
    id: `announcement_${log.id}`,
    source: 'content_revision',
    sourceLabel: '公告审计',
    title: log.action || 'announcement_audit',
    subtitle: `${log.operator_name || log.operator_role || '管理员'} · ${String(log.detail?.title || log.detail?.target_id || '公告')}`,
    badge: String((log as AdminAuditLogEntry & { outcome?: string }).outcome || log.detail?.outcome || 'completed'),
    detail: formatDetail({
      target_id: log.detail?.target_id,
      status: log.detail?.status,
      template_type: log.detail?.template_type,
      reason: log.detail?.reason,
    }),
    created_at: Number(log.created_at) || 0,
  })

  const commonParams = () => ({
    username: filters.username.trim(),
    action: filters.action.trim(),
    outcome: filters.outcome.trim(),
    createdFrom: toTimestamp(filters.createdFrom),
    createdTo: toTimestamp(filters.createdTo),
  })

  const refreshOverview = async () => {
    if (!props.canLoad) return
    loading.overview = true
    try {
      overview.value = (await fetchAdminLogCenterOverview()).sources
    } finally {
      loading.overview = false
    }
  }

  const refreshAdminAudit = async (options: { page?: number; pageSize?: number; assign?: boolean } = {}) => {
    if (!props.canLoad || !props.canViewAudit) {
      rows.admin_audit = []
      totals.admin_audit = 0
      return { total: 0, rows: [] as NormalizedLogRow[] }
    }
    loading.admin_audit = true
    try {
      const result = await fetchAdminAuditLogs({
        ...commonParams(),
        operatorName: filters.category.trim(),
        page: options.page || pages.admin_audit,
        pageSize: options.pageSize || pageSize,
      })
      const nextRows = result.logs.map(normalizeAdminAudit)
      if (options.assign !== false) {
        totals.admin_audit = result.total
        rows.admin_audit = nextRows
      }
      return { total: result.total, rows: nextRows }
    } finally {
      loading.admin_audit = false
    }
  }

  const refreshOnlineAudit = async (options: { page?: number; pageSize?: number; assign?: boolean } = {}) => {
    if (!props.canLoad) return { total: 0, rows: [] as NormalizedLogRow[] }
    loading.online_audit = true
    try {
      const result = await fetchAdminOnlineAuditLogPage({
        ...commonParams(),
        routeKey: filters.category.trim(),
        page: options.page || pages.online_audit,
        pageSize: options.pageSize || pageSize,
      })
      const nextTotal = Number(result.total) || 0
      const nextRows = (Array.isArray(result.logs) ? result.logs : []).map(normalizeOnlineAudit)
      if (options.assign !== false) {
        totals.online_audit = nextTotal
        rows.online_audit = nextRows
      }
      return { total: nextTotal, rows: nextRows }
    } finally {
      loading.online_audit = false
    }
  }

  const refreshContentModeration = async (options: { page?: number; pageSize?: number; assign?: boolean } = {}) => {
    if (!props.canLoad) return { total: 0, rows: [] as NormalizedLogRow[] }
    loading.content_moderation = true
    try {
      const effectivePageSize = options.pageSize || pageSize
      const params = {
        username: filters.username.trim(),
        scene: filters.category.trim(),
        action: filters.action.trim(),
        outcome: filters.outcome.trim(),
        createdFrom: toTimestamp(filters.createdFrom),
        createdTo: toTimestamp(filters.createdTo),
        page: options.page || pages.content_moderation,
        pageSize: Math.max(10, Math.floor(effectivePageSize / 2)),
      }
      const [events, signals] = await Promise.all([
        fetchAdminContentModerationEvents(params),
        fetchAdminContentRiskSignals({
          username: filters.username.trim(),
          scene: filters.category.trim(),
          status: filters.outcome.trim() as AdminContentRiskSignal['status'] | 'all' || 'all',
          createdFrom: toTimestamp(filters.createdFrom),
          createdTo: toTimestamp(filters.createdTo),
          page: options.page || pages.content_moderation,
          pageSize: Math.max(10, Math.floor(effectivePageSize / 2)),
        }),
      ])
      const nextTotal = (Number(events.total) || 0) + (Number(signals.total) || 0)
      const nextRows = [
        ...(Array.isArray(events.events) ? events.events.map(normalizeModerationEvent) : []),
        ...(Array.isArray(signals.signals) ? signals.signals.map(normalizeRiskSignal) : []),
      ].sort((left, right) => right.created_at - left.created_at).slice(0, effectivePageSize)
      if (options.assign !== false) {
        totals.content_moderation = nextTotal
        rows.content_moderation = nextRows
      }
      return { total: nextTotal, rows: nextRows }
    } finally {
      loading.content_moderation = false
    }
  }

  const refreshGameplay = async (options: { page?: number; pageSize?: number; assign?: boolean } = {}) => {
    if (!props.canLoad) return { total: 0, rows: [] as NormalizedLogRow[] }
    loading.gameplay = true
    try {
      const result = await fetchGameplayLogs({
        username: filters.username.trim(),
        category: filters.category.trim(),
        keyword: filters.keyword.trim(),
        action: filters.action.trim(),
        outcome: filters.outcome.trim(),
        createdFrom: toTimestamp(filters.createdFrom),
        createdTo: toTimestamp(filters.createdTo),
        page: options.page || pages.gameplay,
        pageSize: options.pageSize || pageSize,
      })
      const nextRows = result.logs.map(normalizeGameplay)
      if (options.assign !== false) {
        totals.gameplay = result.total
        rows.gameplay = nextRows
      }
      return { total: result.total, rows: nextRows }
    } finally {
      loading.gameplay = false
    }
  }

  const refreshPrivateChat = async (options: { page?: number; pageSize?: number; assign?: boolean } = {}) => {
    if (!props.canLoad) return { total: 0, rows: [] as NormalizedLogRow[] }
    loading.private_chat = true
    try {
      const result = await fetchAdminPrivateChatMessages({
        username: filters.username.trim(),
        senderUsername: filters.action.trim(),
        recipientUsername: filters.category.trim(),
        keyword: filters.keyword.trim(),
        createdFrom: toTimestamp(filters.createdFrom),
        createdTo: toTimestamp(filters.createdTo),
        page: options.page || pages.private_chat,
        pageSize: options.pageSize || pageSize,
      })
      const nextRows = result.messages.map(normalizePrivateChat)
      if (options.assign !== false) {
        totals.private_chat = result.total
        rows.private_chat = nextRows
      }
      return { total: result.total, rows: nextRows }
    } finally {
      loading.private_chat = false
    }
  }

  const refreshContentRevisions = async (options: { page?: number; pageSize?: number; assign?: boolean } = {}) => {
    if (!props.canLoad) return { total: 0, rows: [] as NormalizedLogRow[] }
    loading.content_revision = true
    try {
      const effectivePageSize = options.pageSize || pageSize
      const revisionResult = await fetchContentRevisions({
        contentKey: filters.category.trim(),
        action: filters.action.trim(),
        operatorName: filters.username.trim(),
        keyword: filters.keyword.trim(),
        createdFrom: toTimestamp(filters.createdFrom),
        createdTo: toTimestamp(filters.createdTo),
        page: options.page || pages.content_revision,
        pageSize: effectivePageSize,
      })
      const shouldIncludeAnnouncements = props.canViewAudit && (
        !filters.category.trim()
        || '公告审计'.includes(filters.category.trim())
        || '内容发布'.includes(filters.category.trim())
        || 'announcement'.includes(filters.category.trim().toLocaleLowerCase('zh-CN'))
      )
      const actionFilter = filters.action.trim()
      const announcementActions = actionFilter
        ? announcementAuditActions.filter(action => action === actionFilter)
        : announcementAuditActions
      const announcementBatches = shouldIncludeAnnouncements
        ? await Promise.all(announcementActions.map(action => fetchAdminAuditLogs({
          username: filters.username.trim(),
          action,
          outcome: filters.outcome.trim(),
          keyword: filters.keyword.trim(),
          createdFrom: toTimestamp(filters.createdFrom),
          createdTo: toTimestamp(filters.createdTo),
          page: options.page || pages.content_revision,
          pageSize: Math.max(20, Math.floor(effectivePageSize / 2)),
        })))
        : []
      const announcementRows = announcementBatches.flatMap(batch => batch.logs.map(normalizeAnnouncementAudit))
      const nextTotal = (Number(revisionResult.total) || 0) + announcementBatches.reduce((sum, batch) => sum + (Number(batch.total) || 0), 0)
      const nextRows = [
        ...revisionResult.revisions.map(normalizeContentRevision),
        ...announcementRows,
      ].sort((left, right) => right.created_at - left.created_at).slice(0, effectivePageSize)
      if (options.assign !== false) {
        totals.content_revision = nextTotal
        rows.content_revision = nextRows
      }
      return { total: nextTotal, rows: nextRows }
    } finally {
      loading.content_revision = false
    }
  }

  const refreshAllLogs = async () => {
    loading.all = true
    try {
      const candidatePageSize = Math.min(100, Math.max(pageSize, pages.all * pageSize))
      const [adminAudit, onlineAudit, contentModeration, gameplay, privateChat, contentRevision] = await Promise.all([
        refreshAdminAudit({ page: 1, pageSize: candidatePageSize, assign: false }),
        refreshOnlineAudit({ page: 1, pageSize: candidatePageSize, assign: false }),
        refreshContentModeration({ page: 1, pageSize: candidatePageSize, assign: false }),
        refreshGameplay({ page: 1, pageSize: candidatePageSize, assign: false }),
        refreshPrivateChat({ page: 1, pageSize: candidatePageSize, assign: false }),
        refreshContentRevisions({ page: 1, pageSize: candidatePageSize, assign: false }),
      ])
      const merged = [
        ...(props.canViewAudit ? adminAudit.rows : []),
        ...onlineAudit.rows,
        ...contentModeration.rows,
        ...gameplay.rows,
        ...privateChat.rows,
        ...contentRevision.rows,
      ].sort((left, right) => right.created_at - left.created_at)
      totals.admin_audit = adminAudit.total
      totals.online_audit = onlineAudit.total
      totals.content_moderation = contentModeration.total
      totals.gameplay = gameplay.total
      totals.private_chat = privateChat.total
      totals.content_revision = contentRevision.total
      totals.all = onlineAudit.total + contentModeration.total + gameplay.total + privateChat.total + contentRevision.total + (props.canViewAudit ? adminAudit.total : 0)
      rows.all = merged.slice((pages.all - 1) * pageSize, pages.all * pageSize)
    } finally {
      loading.all = false
    }
  }

  const refreshActive = async () => {
    errorMessage.value = ''
    try {
      if (activeTab.value === 'all') {
        await refreshAllLogs()
      } else if (activeTab.value === 'admin_audit') {
        await refreshAdminAudit()
      } else if (activeTab.value === 'online_audit') {
        await refreshOnlineAudit()
      } else if (activeTab.value === 'content_moderation') {
        await refreshContentModeration()
      } else if (activeTab.value === 'gameplay') {
        await refreshGameplay()
      } else if (activeTab.value === 'private_chat') {
        await refreshPrivateChat()
      } else {
        await refreshContentRevisions()
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取日志失败'
      showFloat(errorMessage.value, 'danger')
    }
  }

  const refreshAll = async () => {
    errorMessage.value = ''
    try {
      await refreshOverview()
      await refreshAllLogs()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取日志失败'
      showFloat(errorMessage.value, 'danger')
    }
  }

  const setActiveTab = (key: LogTabKey) => {
    if (key === 'admin_audit' && !props.canViewAudit) return
    activeTab.value = key
    void refreshActive()
  }

  const resetFilters = () => {
    filters.username = ''
    filters.action = ''
    filters.outcome = ''
    filters.category = ''
    filters.keyword = ''
    filters.createdFrom = ''
    filters.createdTo = ''
    for (const key of Object.keys(pages) as LogTabKey[]) pages[key] = 1
    void refreshAll()
  }

  const goPage = (delta: number) => {
    pages[activeTab.value] = Math.min(activePageCount.value, Math.max(1, pages[activeTab.value] + delta))
    void refreshActive()
  }

  watch(
    () => props.canLoad,
    value => {
      if (value) void refreshAll()
    },
    { immediate: true }
  )
</script>

<style scoped>
  .admin-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.75rem;
    color: rgb(var(--color-muted));
  }

  .admin-input {
    width: 100%;
    padding: 10px 12px;
    background: rgba(14, 18, 28, 0.82);
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 2px;
    color: rgb(var(--color-text));
    outline: none;
    font-size: 0.8125rem;
  }

  .admin-log-overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }

  .admin-log-source {
    min-height: 108px;
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    background: rgba(14, 18, 28, 0.42);
    padding: 12px;
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: rgb(var(--color-text));
  }

  .admin-log-source--active {
    border-color: rgba(200, 164, 92, 0.55);
    background: rgba(200, 164, 92, 0.1);
  }

  .admin-log-source:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .admin-log-source__count {
    color: rgb(var(--color-accent));
    font-size: 1.25rem;
    line-height: 1.35;
  }

  .admin-log-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .admin-log-tab {
    min-width: max-content;
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    padding: 8px 12px;
    color: rgb(var(--color-muted));
    background: rgba(14, 18, 28, 0.48);
    font-size: 0.75rem;
  }

  .admin-log-tab--active {
    color: rgb(var(--color-bg));
    background: rgb(var(--color-accent));
  }

  .admin-log-tab:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .admin-log-list {
    display: grid;
    gap: 10px;
    max-height: 58vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .admin-record-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
  }

  .admin-chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(200, 164, 92, 0.2);
    border-radius: 2px;
    padding: 4px 8px;
    background: rgba(200, 164, 92, 0.08);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .admin-log-pager {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
