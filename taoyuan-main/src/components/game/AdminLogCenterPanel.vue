<template>
  <div class="space-y-4">
    <div class="game-panel space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm text-accent">日志中心</p>
          <p class="text-xs text-muted mt-1">查看管理审计、内容发布记录和长期游戏日志。</p>
        </div>
        <button class="btn !px-3 !py-2" @click="refreshAll" :disabled="loadingAny">
          {{ loadingAny ? '刷新中...' : '刷新日志' }}
        </button>
      </div>

      <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

      <div class="grid gap-3 md:grid-cols-3">
        <label class="admin-label">
          <span>用户名</span>
          <input v-model="filters.username" type="text" class="admin-input" placeholder="留空查看全部" />
        </label>
        <label class="admin-label">
          <span>分类</span>
          <input v-model="filters.category" type="text" class="admin-input" placeholder="如 system / goal / economy" />
        </label>
        <label class="admin-label">
          <span>关键词</span>
          <input v-model="filters.keyword" type="text" class="admin-input" placeholder="日志关键词" @keydown.enter.prevent="refreshGameplayLogs" />
        </label>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="game-panel space-y-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">内容发布日志</p>
          <span class="text-xs text-muted">{{ contentRevisions.length }} 条</span>
        </div>
        <div v-if="loadingContentLogs" class="text-xs text-muted">内容日志加载中...</div>
        <div v-else-if="!contentRevisions.length" class="text-xs text-muted">暂无内容发布日志。</div>
        <div v-else class="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
          <div v-for="revision in contentRevisions" :key="revision.id" class="admin-record-card text-xs text-muted space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-text">{{ revision.title || revision.content_key }}</div>
                <div class="text-[11px] text-muted mt-1">#{{ revision.id }} · {{ revision.action }}</div>
              </div>
              <span class="admin-status" :class="revision.published ? 'admin-status--sent' : 'admin-status--draft'">
                {{ revision.published ? '已发布' : '草稿' }}
              </span>
            </div>
            <div>{{ formatTime(revision.created_at) }} · {{ revision.operator_name || revision.operator_role || '管理员' }}</div>
            <div>{{ revision.summary || '无备注' }}</div>
          </div>
        </div>
      </div>

      <div class="game-panel space-y-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">游戏长期日志</p>
          <span class="text-xs text-muted">{{ gameplayLogs.length }} 条</span>
        </div>
        <div v-if="loadingGameplayLogs" class="text-xs text-muted">游戏日志加载中...</div>
        <div v-else-if="!gameplayLogs.length" class="text-xs text-muted">暂无游戏日志。</div>
        <div v-else class="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
          <div v-for="log in gameplayLogs" :key="log.id" class="admin-record-card text-xs text-muted space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-text break-all">{{ log.message }}</div>
                <div class="text-[11px] text-muted mt-1">{{ log.username || 'guest' }} · {{ log.category }}</div>
              </div>
              <span class="admin-chip">{{ log.day_label || '未标记日期' }}</span>
            </div>
            <div>{{ formatTime(log.created_at) }} · 路由 {{ log.route_name || '-' }}</div>
            <div v-if="log.tags?.length">标签：{{ log.tags.join('、') }}</div>
            <div v-if="Object.keys(log.meta || {}).length">元数据：{{ formatDetail(log.meta) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="canViewAudit" class="game-panel space-y-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm text-accent">管理员审计日志</p>
        <span class="text-xs text-muted">{{ auditLogs.length }} 条</span>
      </div>
      <div v-if="loadingAuditLogs" class="text-xs text-muted">审计日志加载中...</div>
      <div v-else-if="!auditLogs.length" class="text-xs text-muted">暂无审计日志。</div>
      <div v-else class="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
        <div v-for="log in auditLogs" :key="log.id" class="admin-record-card text-xs text-muted space-y-2">
          <div class="flex items-center justify-between gap-3">
            <div class="text-text">{{ formatAuditAction(log.action) }}</div>
            <span class="admin-chip">{{ log.operator_name || log.operator_role }}</span>
          </div>
          <div>{{ formatTime(log.created_at) }} · 目标账号：{{ log.target_username || '-' }}</div>
          <div>详情：{{ formatDetail(log.detail) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { fetchGameplayLogs, fetchContentRevisions, type ContentRevisionEntry, type GameplayLogEntry } from '@/utils/adminContentApi'
  import { fetchAdminAuditLogs, type AdminAuditLogEntry } from '@/utils/userAdminApi'
  import { showFloat } from '@/composables/useGameLog'

  const props = defineProps<{
    canLoad: boolean
    canViewAudit: boolean
  }>()

  const filters = reactive({
    username: '',
    category: '',
    keyword: '',
  })

  const contentRevisions = ref<ContentRevisionEntry[]>([])
  const gameplayLogs = ref<GameplayLogEntry[]>([])
  const auditLogs = ref<AdminAuditLogEntry[]>([])
  const loadingContentLogs = ref(false)
  const loadingGameplayLogs = ref(false)
  const loadingAuditLogs = ref(false)
  const errorMessage = ref('')

  const loadingAny = computed(() => loadingContentLogs.value || loadingGameplayLogs.value || loadingAuditLogs.value)

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

  const formatAuditAction = (action: string) => {
    const mapping: Record<string, string> = {
      set_user_quota: '修改额度',
      reset_user_password: '重置密码',
      set_user_status: '修改状态',
      delete_user: '删除用户',
      export_user_save: '导出存档',
      migrate_user_save: '迁移存档',
      publish_homepage_about: '发布首页关于内容',
      restore_homepage_about: '恢复首页关于内容',
      upload_content_image: '上传内容图片',
    }
    return mapping[action] || action
  }

  const formatDetail = (detail: Record<string, unknown>) => {
    const entries = Object.entries(detail || {})
    if (!entries.length) return '-'
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join('；')
  }

  const refreshContentLogs = async () => {
    if (!props.canLoad) return
    loadingContentLogs.value = true
    try {
      const result = await fetchContentRevisions({ contentKey: 'homepage_about', page: 1, pageSize: 40 })
      contentRevisions.value = result.revisions
    } finally {
      loadingContentLogs.value = false
    }
  }

  const refreshGameplayLogs = async () => {
    if (!props.canLoad) return
    loadingGameplayLogs.value = true
    try {
      const result = await fetchGameplayLogs({
        username: filters.username.trim(),
        category: filters.category.trim(),
        keyword: filters.keyword.trim(),
        page: 1,
        pageSize: 80,
      })
      gameplayLogs.value = result.logs
    } finally {
      loadingGameplayLogs.value = false
    }
  }

  const refreshAuditLogs = async () => {
    if (!props.canLoad || !props.canViewAudit) return
    loadingAuditLogs.value = true
    try {
      const result = await fetchAdminAuditLogs({ page: 1, pageSize: 40 })
      auditLogs.value = result.logs
    } finally {
      loadingAuditLogs.value = false
    }
  }

  const refreshAll = async () => {
    errorMessage.value = ''
    try {
      await Promise.all([
        refreshContentLogs(),
        refreshGameplayLogs(),
        refreshAuditLogs(),
      ])
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取日志失败'
      showFloat(errorMessage.value, 'danger')
    }
  }

  watch(
    () => props.canLoad,
    value => {
      if (value) {
        void refreshAll()
      }
    },
    { immediate: true }
  )
</script>

<style scoped>
  .admin-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
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
    font-size: 13px;
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
    font-size: 12px;
    color: rgb(var(--color-text));
  }

  .admin-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .admin-status--draft {
    color: #c9ced9;
    background: rgba(120, 130, 150, 0.14);
    border-color: rgba(120, 130, 150, 0.25);
  }

  .admin-status--sent {
    color: #96deac;
    background: rgba(72, 146, 95, 0.14);
    border-color: rgba(72, 146, 95, 0.3);
  }
</style>