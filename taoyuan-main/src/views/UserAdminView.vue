<template>
  <div class="min-h-screen px-0 py-3 md:px-1 md:py-4 xl:px-2 2xl:px-3" :class="{ 'pt-10': Capacitor.isNativePlatform() }">
    <div class="w-full space-y-3 xl:space-y-4">
      <div class="game-panel space-y-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <button class="btn" @click="goBack">
              <ArrowLeft :size="14" />
              <span>返回首页</span>
            </button>
            <div>
              <h1 class="text-accent text-lg md:text-xl mb-2 flex items-center gap-2">
                <Users :size="18" />
                用户管理
              </h1>
              <p class="text-xs text-muted leading-6">
                超级管理员拥有全权限；普通管理员可查看用户、修改额度、查看存档，但不能删号、重置密码或迁移存档。
              </p>
            </div>
          </div>

          <div class="admin-top-actions">
            <button class="btn" @click="openMailAdmin()" :disabled="!canManageMail">
              <Mail :size="14" />
              <span>邮件管理</span>
            </button>
            <button class="btn" @click="openAdminPanel('content')">
              <span>首页关于</span>
            </button>
            <button class="btn" @click="openAdminPanel('logs')">
              <span>日志中心</span>
            </button>
            <button class="btn !bg-accent !text-bg" type="button">
              <Users :size="14" />
              <span>用户管理</span>
            </button>
            <button class="btn" @click="refreshAll" :disabled="loadingUsers || !hasToken || !isAuthorized">
              <RefreshCw :size="14" />
              <span>{{ loadingUsers ? '刷新中...' : '刷新数据' }}</span>
            </button>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <label class="admin-label">
            <span>管理员口令</span>
            <input
              v-model="adminTokenInput"
              type="password"
              class="admin-input"
              placeholder="填写管理员口令"
              @keydown.enter.prevent="saveAdminTokenAndReload"
            />
          </label>
          <button class="btn" @click="saveAdminTokenAndReload" :disabled="savingToken || !adminTokenInput.trim()">
            <KeyRound :size="14" />
            <span>{{ savingToken ? '验证中...' : '保存并验证' }}</span>
          </button>
          <button class="btn" @click="clearAdminTokenValue" :disabled="savingToken && !adminTokenInput">
            <Trash2 :size="14" />
            <span>清空口令</span>
          </button>
        </div>

        <div class="text-xs leading-6">
          <span v-if="isAuthorized && adminSession" class="text-success">
            已连接 {{ adminSession.role_label }} 权限，可进行用户管理。
          </span>
          <span v-else-if="tokenError" class="text-danger">{{ tokenError }}</span>
          <span v-else class="text-muted">填写管理员口令后即可查看用户与存档信息。</span>
        </div>
      </div>

      <template v-if="hasToken && isAuthorized && adminSession">
        <div class="game-panel space-y-4">
          <div class="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div class="grid gap-3 md:grid-cols-4 2xl:min-w-0 2xl:flex-1">
              <label class="admin-label md:col-span-2">
                <span>搜索用户</span>
                <input v-model="filters.keyword" type="text" class="admin-input" placeholder="按用户名或显示名搜索" @keydown.enter.prevent="applyFilters" />
              </label>

              <label class="admin-label">
                <span>状态筛选</span>
                <select v-model="filters.status" class="admin-select">
                  <option value="all">全部</option>
                  <option value="active">正常</option>
                  <option value="banned">已封禁</option>
                  <option value="deleted">已删除</option>
                </select>
              </label>

              <label class="admin-label">
                <span>每页条数</span>
                <select v-model.number="filters.pageSize" class="admin-select">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                </select>
              </label>
            </div>

            <div class="admin-filter-summary">
              <span class="admin-chip">当前角色：{{ adminSession.role_label }}</span>
              <span class="admin-chip">用户总数：{{ totalUsers }}</span>
              <span class="admin-chip">当前页：{{ users.length }}</span>
              <span class="admin-chip">有存档：{{ usersWithSaveCount }}</span>
              <button class="btn admin-filter-summary__action" @click="applyFilters">
                <Search :size="14" />
                <span>查询</span>
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="game-panel space-y-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-accent">用户列表</p>
              <span class="text-xs text-muted">共 {{ totalUsers }} 个用户</span>
            </div>

            <div v-if="loadingUsers" class="text-xs text-muted">用户列表加载中...</div>
            <div v-else-if="!users.length" class="text-xs text-muted">当前没有符合条件的用户。</div>
            <div v-else class="admin-user-table-wrap">
              <div class="admin-user-table admin-user-table--head">
                <div>用户</div>
                <div>注册时间</div>
                <div>状态</div>
                <div>额度</div>
                <div>最近保存</div>
                <div>存档概览</div>
                <div>操作</div>
              </div>

              <div
                v-for="user in users"
                :key="user.username"
                class="admin-user-table admin-user-table--row"
                :class="{ 'admin-user-table--active': selectedUsername === user.username }"
              >
                <div class="admin-user-line admin-user-line--user" data-label="用户">
                  <button class="admin-user-cell" @click="selectUser(user.username)">
                    <span class="admin-user-cell__primary">{{ user.display_name || user.username }}</span>
                    <span class="admin-user-cell__secondary">@{{ user.username }}</span>
                  </button>
                </div>

                <div class="admin-user-line" data-label="注册时间">
                  <div class="admin-user-line__value">{{ formatTime(user.created_at) }}</div>
                  <div class="admin-user-line__hint">创建账号时间</div>
                </div>

                <div class="admin-user-line" data-label="状态">
                  <span class="admin-status" :class="`admin-status--${user.status}`">{{ formatUserStatus(user.status) }}</span>
                </div>

                <div class="admin-user-line" data-label="额度">
                  <div class="admin-user-line__value">{{ formatQuota(user.quota) }}</div>
                  <div class="admin-user-line__hint">账户额度</div>
                </div>

                <div class="admin-user-line" data-label="最近保存">
                  <div class="admin-user-line__value">{{ formatRecentSaveTime(user.save_file.updated_at) }}</div>
                  <div class="admin-user-line__hint">{{ user.save_file.exists ? '最近服务端存档时间' : '尚无服务端存档' }}</div>
                </div>

                <div class="admin-user-line" data-label="存档概览">
                  <div class="admin-user-line__value">{{ user.save_file.exists ? user.save_file.file_name : '无文件' }}</div>
                  <div class="admin-user-line__hint">{{ user.save_file.slot_count }}/3 槽位 · {{ user.save_file.exists ? formatFileSize(user.save_file.file_size) : '未生成文件' }}</div>
                </div>

                <div class="admin-user-line admin-user-line--actions" data-label="操作">
                  <div class="flex flex-wrap gap-2 xl:justify-end">
                    <button class="btn !px-2 !py-1" @click="selectUser(user.username)">查看详情</button>
                    <button class="btn !px-2 !py-1" @click="openQuotaEditor(user)">快速改额</button>
                    <button class="btn !px-2 !py-1" @click="viewSave(user.username)">刷新存档</button>
                    <button class="btn !px-2 !py-1" @click="openMailAdmin(user.username)" :disabled="!canManageMail">单发邮件</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs text-muted">
              <div>
                第 {{ filters.page }} / {{ totalPages }} 页
              </div>
              <div class="flex flex-wrap gap-2">
                <button class="btn !px-2 !py-1" :disabled="filters.page <= 1" @click="changePage(filters.page - 1)">上一页</button>
                <button class="btn !px-2 !py-1" :disabled="filters.page >= totalPages" @click="changePage(filters.page + 1)">下一页</button>
              </div>
            </div>
          </div>

          <div v-if="adminSession.permissions.view_audit_logs" class="game-panel space-y-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm text-accent">操作日志</p>
                <button class="btn !px-2 !py-1" @click="loadAuditLogs" :disabled="loadingAuditLogs">
                  <RefreshCw :size="12" />
                  <span>{{ loadingAuditLogs ? '加载中...' : '刷新日志' }}</span>
                </button>
              </div>

              <div v-if="loadingAuditLogs" class="text-xs text-muted">操作日志加载中...</div>
              <div v-else-if="!auditLogs.length" class="text-xs text-muted">暂无日志记录。</div>
              <div v-else class="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                <div v-for="log in auditLogs" :key="log.id" class="admin-record-card text-xs text-muted space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-accent">{{ formatAuditAction(log.action) }}</span>
                    <span>{{ formatTime(log.created_at) }}</span>
                  </div>
                  <div>操作者：{{ log.operator_name }}（{{ formatRoleLabel(log.operator_role) }}）</div>
                  <div>目标用户：{{ log.target_username || '-' }}</div>
                  <div class="break-all">详情：{{ formatAuditDetail(log.detail) }}</div>
                </div>
              </div>
            </div>

          <Transition name="panel-fade">
            <div v-if="detailModalOpen" class="admin-detail-modal-backdrop" @click.self="closeDetailModal">
              <div class="game-panel admin-detail-modal">
                <div class="admin-detail-modal__header">
                  <div>
                    <p class="text-sm text-accent">用户详情</p>
                    <p v-if="selectedUser" class="text-xs text-muted mt-1">{{ selectedUser.username }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button v-if="selectedUser" class="btn !px-2 !py-1" @click="reloadSelectedUser" :disabled="loadingDetail">
                      <RefreshCw :size="12" />
                      <span>{{ loadingDetail ? '加载中...' : '刷新' }}</span>
                    </button>
                    <button class="btn !px-2 !py-1" @click="closeDetailModal">
                      <X :size="12" />
                      <span>关闭</span>
                    </button>
                  </div>
                </div>

                <div class="admin-detail-modal__body">
                  <div v-if="loadingDetail" class="text-xs text-muted">用户详情加载中...</div>
                  <div v-else-if="!selectedUser" class="text-xs text-muted">请先从列表选择一个用户。</div>
                  <template v-else>
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div class="space-y-4">
                        <div class="admin-record-card space-y-3">
                          <p class="text-sm text-accent">基础信息</p>
                          <div class="grid gap-2 text-xs text-muted md:grid-cols-2">
                            <div>用户名：<span class="text-text">{{ selectedUser.username }}</span></div>
                            <div>显示名：<span class="text-text">{{ selectedUser.display_name || '-' }}</span></div>
                            <div>额度：<span class="text-text">{{ formatQuota(selectedUser.quota) }}</span></div>
                            <div>注册时间：<span class="text-text">{{ formatTime(selectedUser.created_at) }}</span></div>
                            <div>最近保存：<span class="text-text">{{ formatRecentSaveTime(selectedUser.save_file.updated_at) }}</span></div>
                            <div>存档文件：<span class="text-text">{{ selectedUser.save_file.exists ? '已存在' : '暂无' }}</span></div>
                            <div>
                              状态：
                              <span class="admin-status" :class="`admin-status--${selectedUser.status}`">{{ formatUserStatus(selectedUser.status) }}</span>
                            </div>
                          </div>
                        </div>

                        <div class="admin-record-card space-y-3">
                          <div class="flex items-center justify-between">
                            <p class="text-sm text-accent">存档文件</p>
                            <span class="text-xs text-muted">{{ selectedUser.save_file.slot_count }}/3 槽位</span>
                          </div>

                          <div class="text-xs text-muted leading-6">
                            <div>文件：{{ selectedUser.save_file.exists ? selectedUser.save_file.file_name : '无文件' }}</div>
                            <div v-if="selectedUser.save_file.exists">大小：{{ formatFileSize(selectedUser.save_file.file_size) }}</div>
                            <div>最近保存时间：{{ formatRecentSaveTime(selectedUser.save_file.updated_at) }}</div>
                          </div>

                          <div class="admin-slot-grid text-xs">
                            <div v-for="slot in selectedUser.save_file.slots" :key="slot.slot" class="admin-slot-card">
                              <div class="text-accent">槽位 {{ slot.slot + 1 }}</div>
                              <div class="text-muted mt-1">{{ slot.exists ? `已占用 · ${slot.raw_length} 字符` : '空' }}</div>
                            </div>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <button class="btn !px-2 !py-1" @click="viewSave(selectedUser.username)">刷新存档信息</button>
                            <button
                              v-if="adminSession.permissions.export_save"
                              class="btn !px-2 !py-1"
                              :disabled="!selectedUser.save_file.exists"
                              @click="handleExportSave"
                            >
                              导出存档
                            </button>
                          </div>
                        </div>

                        <div class="admin-record-card space-y-3">
                          <p class="text-sm text-accent">额度管理</p>
                          <label class="admin-label">
                            <span>额度</span>
                            <input v-model.number="quotaForm" type="number" min="0" class="admin-input" />
                          </label>
                          <div class="flex flex-wrap gap-2">
                            <button class="btn" :disabled="submittingQuota" @click="handleSetQuota">
                              <Coins :size="14" />
                              <span>{{ submittingQuota ? '保存中...' : '保存额度' }}</span>
                            </button>
                            <button class="btn !px-3 !py-2" @click="openMailAdmin(selectedUser.username)" :disabled="!canManageMail">
                              <Mail :size="14" />
                              <span>给该账号单发邮件</span>
                            </button>
                          </div>
                        </div>

                        <div v-if="adminSession.permissions.reset_password" class="admin-record-card space-y-3">
                          <p class="text-sm text-accent">重置密码</p>
                          <label class="admin-label">
                            <span>新密码</span>
                            <input v-model="passwordForm" type="text" minlength="6" class="admin-input" placeholder="至少 6 位" />
                          </label>
                          <button class="btn btn-danger !px-3 !py-2 w-full md:w-auto" :disabled="submittingPassword || passwordForm.length < 6" @click="handleResetPassword">
                            <KeyRound :size="14" />
                            <span>{{ submittingPassword ? '处理中...' : '重置密码' }}</span>
                          </button>
                        </div>

                        <div v-if="adminSession.permissions.update_status || adminSession.permissions.delete_user" class="admin-record-card space-y-3">
                          <p class="text-sm text-accent">状态管理</p>
                          <div class="flex flex-wrap gap-2">
                            <button v-if="adminSession.permissions.update_status" class="btn !px-2 !py-1" :disabled="selectedUser.status === 'active' || submittingStatus" @click="handleSetStatus('active')">恢复正常</button>
                            <button v-if="adminSession.permissions.update_status" class="btn !px-2 !py-1 btn-danger" :disabled="selectedUser.status === 'banned' || selectedUser.status === 'deleted' || submittingStatus" @click="handleSetStatus('banned')">封禁用户</button>
                            <button v-if="adminSession.permissions.delete_user" class="btn !px-2 !py-1 btn-danger" :disabled="selectedUser.status === 'deleted' || submittingStatus" @click="handleDeleteUser">删除用户</button>
                          </div>
                        </div>

                        <div v-if="adminSession.permissions.migrate_save" class="admin-record-card space-y-3">
                          <p class="text-sm text-accent">迁移存档</p>
                          <label class="admin-label">
                            <span>目标用户名</span>
                            <input v-model="migrateForm.target_username" type="text" class="admin-input" placeholder="输入目标账号用户名" />
                          </label>
                          <label class="inline-flex items-center gap-2 text-xs text-muted">
                            <input v-model="migrateForm.overwrite" type="checkbox" />
                            <span>允许覆盖目标已有存档</span>
                          </label>
                          <button class="btn btn-danger !px-3 !py-2 w-full md:w-auto" :disabled="submittingMigrate || !migrateForm.target_username.trim() || !selectedUser.save_file.exists" @click="handleMigrateSave">
                            <FolderOutput :size="14" />
                            <span>{{ submittingMigrate ? '迁移中...' : '迁移存档' }}</span>
                          </button>
                        </div>
                      </div>

                      <div class="space-y-4">
                        <div v-if="adminSession.permissions.view_gameplay_logs" class="admin-record-card space-y-3">
                          <div class="flex items-center justify-between gap-3">
                            <div>
                              <p class="text-sm text-accent">长期游戏日志</p>
                              <p class="text-xs text-muted mt-1">可分别查看该用户不同存档槽位的长期日志。</p>
                            </div>
                            <button class="btn !px-2 !py-1" @click="reloadSelectedUserGameplayLogs" :disabled="loadingGameplayLogs">
                              <RefreshCw :size="12" />
                              <span>{{ loadingGameplayLogs ? '加载中...' : '刷新日志' }}</span>
                            </button>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <button class="btn !px-2 !py-1" :class="{ '!bg-accent !text-bg': selectedGameplaySlot === 'all' }" @click="handleSelectGameplaySlot('all')">全部槽位</button>
                            <button
                              v-for="slot in [0, 1, 2]"
                              :key="slot"
                              class="btn !px-2 !py-1"
                              :class="{ '!bg-accent !text-bg': selectedGameplaySlot === slot }"
                              @click="handleSelectGameplaySlot(slot)"
                            >
                              槽位 {{ slot + 1 }}
                            </button>
                          </div>

                          <div v-if="loadingGameplayLogs" class="text-xs text-muted">游戏日志加载中...</div>
                          <div v-else-if="!gameplayLogs.length" class="text-xs text-muted">当前筛选下没有长期保存的游戏日志。</div>
                          <div v-else class="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                            <div v-for="log in gameplayLogs" :key="log.id" class="admin-log-card">
                              <div class="flex items-center justify-between gap-3 text-[11px] text-muted">
                                <span class="text-accent">{{ log.category || 'system' }}</span>
                                <span>{{ formatTime(log.created_at) }}</span>
                              </div>
                              <div class="text-xs text-text leading-6 break-all mt-1">{{ log.message }}</div>
                              <div class="text-[11px] text-muted mt-1">
                                {{ formatGameplaySlotLabel(log.save_slot) }} · {{ log.day_label ? `${log.day_label} · ` : '' }}{{ log.route_name || '未记录页面' }}
                                <template v-if="log.tags?.length"> · 标签：{{ log.tags.join('、') }}</template>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Capacitor } from '@capacitor/core'
  import { ArrowLeft, Coins, FolderOutput, KeyRound, Mail, RefreshCw, Search, Trash2, Users, X } from 'lucide-vue-next'
  import { showFloat } from '@/composables/useGameLog'
  import { fetchGameplayLogs, type GameplayLogEntry } from '@/utils/adminContentApi'
  import {
    clearAdminSessionToken,
    deleteAdminUser,
    downloadAdminUserSave,
    fetchAdminAuditLogs,
    fetchAdminUserDetail,
    fetchAdminUserSave,
    fetchAdminUsers,
    getAdminSessionToken,
    migrateAdminUserSave,
    resetAdminUserPassword,
    setAdminUserStatus,
    type AdminAuditLogEntry,
    type AdminSessionInfo,
    type UserAdminDetail,
    type UserAdminSummary,
    type UserAdminStatus,
    updateAdminUserQuota,
    verifyAdminSession,
  } from '@/utils/userAdminApi'

  const router = useRouter()

  const adminTokenInput = ref(getAdminSessionToken())
  const savingToken = ref(false)
  const tokenError = ref('')
  const isAuthorized = ref(false)
  const adminSession = ref<AdminSessionInfo | null>(null)

  const filters = ref({
    keyword: '',
    status: 'all',
    page: 1,
    pageSize: 20,
  })

  const users = ref<UserAdminSummary[]>([])
  const totalUsers = ref(0)
  const loadingUsers = ref(false)

  const selectedUsername = ref('')
  const selectedUser = ref<UserAdminDetail | null>(null)
  const loadingDetail = ref(false)

  const submittingQuota = ref(false)
  const submittingPassword = ref(false)
  const submittingStatus = ref(false)
  const submittingMigrate = ref(false)

  const quotaForm = ref(0)
  const passwordForm = ref('')
  const migrateForm = ref({
    target_username: '',
    overwrite: false,
  })

  const auditLogs = ref<AdminAuditLogEntry[]>([])
  const loadingAuditLogs = ref(false)
  const gameplayLogs = ref<GameplayLogEntry[]>([])
  const loadingGameplayLogs = ref(false)
  const detailModalOpen = ref(false)
  const selectedGameplaySlot = ref<'all' | number>('all')

  const hasToken = computed(() => adminTokenInput.value.trim().length > 0)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalUsers.value / Math.max(1, filters.value.pageSize))))
  const canManageMail = computed(() => adminSession.value?.role === 'super_admin')
  const usersWithSaveCount = computed(() => users.value.filter(user => user.save_file.exists).length)

  const formatRecentSaveTime = (timestamp?: number | null) => {
    return timestamp ? formatTime(timestamp) : '未保存'
  }

  type AdminTab = 'mail' | 'content' | 'logs'

  const goBack = () => {
    void router.push('/')
  }

  const openAdminPanel = (tab: AdminTab, username?: string) => {
    if (tab === 'mail') {
      void router.push(
        username
          ? { path: '/admin', query: { mode: 'single', username } }
          : { path: '/admin' }
      )
      return
    }
    void router.push({ path: '/admin', query: { tab } })
  }

  const openMailAdmin = (username?: string) => {
    if (!canManageMail.value) {
      showFloat('邮件功能仅超级管理员可用', 'danger')
      return
    }
    openAdminPanel('mail', username)
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

  const formatQuota = (value?: number | null) => `${Number(value) || 0}`

  const formatUserStatus = (status: UserAdminStatus) => {
    const mapping: Record<UserAdminStatus, string> = {
      active: '正常',
      banned: '已封禁',
      deleted: '已删除',
    }
    return mapping[status] || status
  }

  const formatRoleLabel = (role: string) => {
    return role === 'super_admin' ? '超级管理员' : role === 'admin' ? '普通管理员' : role
  }

  const formatAuditAction = (action: string) => {
    const mapping: Record<string, string> = {
      set_user_quota: '修改额度',
      reset_user_password: '重置密码',
      set_user_status: '修改状态',
      delete_user: '删除用户',
      export_user_save: '导出存档',
      migrate_user_save: '迁移存档',
    }
    return mapping[action] || action
  }

  const formatAuditDetail = (detail: Record<string, unknown>) => {
    const entries = Object.entries(detail || {})
    if (!entries.length) return '-'
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join('；')
  }

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${size} B`
  }

  const resetDetailForms = (user: UserAdminDetail | null) => {
    quotaForm.value = user?.quota || 0
    passwordForm.value = ''
    migrateForm.value = {
      target_username: '',
      overwrite: false,
    }
  }

  const clearAuthorizedState = (message = '') => {
    adminSession.value = null
    isAuthorized.value = false
    tokenError.value = message
    users.value = []
    totalUsers.value = 0
    selectedUsername.value = ''
    selectedUser.value = null
    auditLogs.value = []
    gameplayLogs.value = []
    detailModalOpen.value = false
    selectedGameplaySlot.value = 'all'
    resetDetailForms(null)
  }

  const handleAdminRequestError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback
    const shouldReset = /管理员口令无效|权限不足|管理员信息不完整/.test(message)
    if (shouldReset) {
      clearAdminSessionToken()
      adminTokenInput.value = ''
      clearAuthorizedState(message)
    }
    return message
  }

  const loadAuditLogs = async () => {
    if (!adminSession.value?.permissions.view_audit_logs) {
      auditLogs.value = []
      return
    }
    loadingAuditLogs.value = true
    try {
      const result = await fetchAdminAuditLogs({ page: 1, pageSize: 40 })
      auditLogs.value = result.logs
    } catch (error) {
      showFloat(handleAdminRequestError(error, '读取操作日志失败'), 'danger')
    } finally {
      loadingAuditLogs.value = false
    }
  }

  const loadGameplayLogsForUser = async (username?: string) => {
    if (!username || !adminSession.value?.permissions.view_gameplay_logs) {
      gameplayLogs.value = []
      return
    }
    loadingGameplayLogs.value = true
    try {
      const result = await fetchGameplayLogs({
        username,
        saveSlot: selectedGameplaySlot.value === 'all' ? null : selectedGameplaySlot.value,
        page: 1,
        pageSize: 18,
      })
      gameplayLogs.value = result.logs
    } catch (error) {
      gameplayLogs.value = []
      showFloat(handleAdminRequestError(error, '读取用户游戏日志失败'), 'danger')
    } finally {
      loadingGameplayLogs.value = false
    }
  }

  const loadUserDetail = async (username: string) => {
    if (!username) {
      selectedUser.value = null
      gameplayLogs.value = []
      resetDetailForms(null)
      return
    }
    loadingDetail.value = true
    try {
      const detail = await fetchAdminUserDetail(username)
      selectedUser.value = detail
      selectedUsername.value = detail.username
      resetDetailForms(detail)
      await loadGameplayLogsForUser(detail.username)
    } catch (error) {
      selectedUser.value = null
      gameplayLogs.value = []
      resetDetailForms(null)
      showFloat(handleAdminRequestError(error, '读取用户详情失败'), 'danger')
    } finally {
      loadingDetail.value = false
    }
  }

  const loadUsers = async (keepSelection = true) => {
    loadingUsers.value = true
    tokenError.value = ''
    try {
      const result = await fetchAdminUsers(filters.value)
      users.value = result.users
      totalUsers.value = result.total
      if (!keepSelection || !selectedUsername.value || !users.value.some(item => item.username === selectedUsername.value)) {
        selectedUsername.value = ''
      }
      if (detailModalOpen.value && selectedUsername.value) {
        await loadUserDetail(selectedUsername.value)
      } else {
        if (!detailModalOpen.value) {
          selectedUser.value = null
          gameplayLogs.value = []
          resetDetailForms(null)
        }
      }
    } catch (error) {
      tokenError.value = handleAdminRequestError(error, '获取用户列表失败')
      showFloat(tokenError.value, 'danger')
    } finally {
      loadingUsers.value = false
    }
  }

  const refreshAll = async () => {
    await loadUsers(true)
    await loadAuditLogs()
  }

  const saveAdminTokenAndReload = async () => {
    const token = adminTokenInput.value.trim()
    if (!token) {
      tokenError.value = '请先填写管理员口令'
      return
    }
    savingToken.value = true
    tokenError.value = ''
    try {
      adminSession.value = await verifyAdminSession(token, true)
      isAuthorized.value = true
      showFloat('管理员口令已保存', 'success')
      await refreshAll()
    } catch (error) {
      adminSession.value = null
      isAuthorized.value = false
      tokenError.value = error instanceof Error ? error.message : '管理员验证失败'
      showFloat(tokenError.value, 'danger')
    } finally {
      savingToken.value = false
    }
  }

  const clearAdminTokenValue = () => {
    adminTokenInput.value = ''
    clearAdminSessionToken()
    clearAuthorizedState('')
    showFloat('管理员口令已清空', 'success')
  }

  const applyFilters = async () => {
    filters.value.page = 1
    await loadUsers(false)
  }

  const changePage = async (page: number) => {
    filters.value.page = Math.min(Math.max(1, page), totalPages.value)
    await loadUsers(true)
  }

  const selectUser = async (username: string) => {
    selectedGameplaySlot.value = 'all'
    detailModalOpen.value = true
    await loadUserDetail(username)
  }

  const closeDetailModal = () => {
    detailModalOpen.value = false
  }

  const reloadSelectedUser = async () => {
    if (!selectedUsername.value) return
    await loadUserDetail(selectedUsername.value)
  }

  const reloadSelectedUserGameplayLogs = async () => {
    if (!selectedUser.value) return
    await loadGameplayLogsForUser(selectedUser.value.username)
  }

  const handleSelectGameplaySlot = async (slot: 'all' | number) => {
    selectedGameplaySlot.value = slot
    await reloadSelectedUserGameplayLogs()
  }

  const formatGameplaySlotLabel = (slot?: number | null) => {
    return Number.isInteger(Number(slot)) && Number(slot) >= 0 ? `槽位 ${Number(slot) + 1}` : '未记录槽位'
  }

  const openQuotaEditor = (user: UserAdminSummary) => {
    quotaForm.value = user.quota
    void selectUser(user.username)
  }

  const viewSave = async (username: string) => {
    try {
      const save = await fetchAdminUserSave(username)
      if (selectedUser.value && selectedUser.value.username === username) {
        selectedUser.value = {
          ...selectedUser.value,
          save_file: save,
        }
      } else {
        await loadUserDetail(username)
      }
      showFloat('存档信息已刷新', 'success')
    } catch (error) {
      showFloat(handleAdminRequestError(error, '读取存档信息失败'), 'danger')
    }
  }

  const handleSetQuota = async () => {
    if (!selectedUser.value) return
    submittingQuota.value = true
    try {
      const updated = await updateAdminUserQuota(selectedUser.value.username, quotaForm.value)
      selectedUser.value = { ...updated, save_file: selectedUser.value.save_file }
      const found = users.value.find(item => item.username === updated.username)
      if (found) found.quota = updated.quota
      showFloat('额度已更新', 'success')
      await loadAuditLogs()
    } catch (error) {
      showFloat(handleAdminRequestError(error, '修改额度失败'), 'danger')
    } finally {
      submittingQuota.value = false
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser.value || passwordForm.value.length < 6) return
    const confirmed = typeof window === 'undefined'
      ? true
      : window.prompt(`请输入 RESET 确认重置 ${selectedUser.value.username} 的密码`) === 'RESET'
    if (!confirmed) return
    submittingPassword.value = true
    try {
      await resetAdminUserPassword(selectedUser.value.username, passwordForm.value)
      passwordForm.value = ''
      showFloat('密码已重置', 'success')
      await loadAuditLogs()
    } catch (error) {
      showFloat(handleAdminRequestError(error, '重置密码失败'), 'danger')
    } finally {
      submittingPassword.value = false
    }
  }

  const handleSetStatus = async (status: UserAdminStatus) => {
    if (!selectedUser.value) return
    const message = status === 'banned'
      ? `确认封禁用户 ${selectedUser.value.username} 吗？`
      : `确认恢复用户 ${selectedUser.value.username} 为正常状态吗？`
    if (typeof window !== 'undefined' && !window.confirm(message)) return
    submittingStatus.value = true
    try {
      const updated = await setAdminUserStatus(selectedUser.value.username, status)
      selectedUser.value = { ...updated, save_file: selectedUser.value.save_file }
      await loadUsers(true)
      await loadAuditLogs()
      showFloat(status === 'banned' ? '用户已封禁' : '用户已恢复正常', 'success')
    } catch (error) {
      showFloat(handleAdminRequestError(error, '修改状态失败'), 'danger')
    } finally {
      submittingStatus.value = false
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser.value) return
    const confirmed = typeof window === 'undefined'
      ? true
      : window.prompt(`请输入用户名 ${selectedUser.value.username} 以确认删除`) === selectedUser.value.username
    if (!confirmed) return
    submittingStatus.value = true
    try {
      await deleteAdminUser(selectedUser.value.username)
      showFloat('用户已删除', 'success')
      await refreshAll()
    } catch (error) {
      showFloat(handleAdminRequestError(error, '删除用户失败'), 'danger')
    } finally {
      submittingStatus.value = false
    }
  }

  const handleExportSave = async () => {
    if (!selectedUser.value) return
    try {
      await downloadAdminUserSave(selectedUser.value.username)
      showFloat('存档导出已开始', 'success')
      await loadAuditLogs()
    } catch (error) {
      showFloat(handleAdminRequestError(error, '导出存档失败'), 'danger')
    }
  }

  const handleMigrateSave = async () => {
    if (!selectedUser.value) return
    const targetUsername = migrateForm.value.target_username.trim()
    if (!targetUsername) return
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`确认将 ${selectedUser.value.username} 的存档迁移到 ${targetUsername} 吗？${migrateForm.value.overwrite ? '（将覆盖目标存档）' : ''}`)
    if (!confirmed) return

    submittingMigrate.value = true
    try {
      await migrateAdminUserSave(selectedUser.value.username, {
        target_username: targetUsername,
        overwrite: migrateForm.value.overwrite,
      })
      showFloat('存档迁移完成', 'success')
      migrateForm.value = { target_username: '', overwrite: false }
      await loadUserDetail(selectedUser.value.username)
      await loadUsers(true)
      await loadAuditLogs()
    } catch (error) {
      showFloat(handleAdminRequestError(error, '迁移存档失败'), 'danger')
    } finally {
      submittingMigrate.value = false
    }
  }

  onMounted(async () => {
    if (adminTokenInput.value.trim()) {
      try {
        adminSession.value = await verifyAdminSession(adminTokenInput.value.trim())
        isAuthorized.value = true
        await refreshAll()
      } catch (error) {
        adminSession.value = null
        isAuthorized.value = false
        tokenError.value = error instanceof Error ? error.message : '管理员验证失败'
      }
    }
  })
</script>

<style scoped>
  .admin-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: rgb(var(--color-muted));
  }

  .admin-input,
  .admin-select {
    width: 100%;
    padding: 10px 12px;
    background: rgba(14, 18, 28, 0.82);
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 2px;
    color: rgb(var(--color-text));
    outline: none;
    font-size: 13px;
  }

  .admin-input:focus,
  .admin-select:focus {
    border-color: rgba(200, 164, 92, 0.55);
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

  .admin-top-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  .admin-top-actions :deep(.btn) {
    width: 100%;
  }

  .admin-filter-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .admin-filter-summary__action {
    width: 100%;
  }

  .admin-user-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    color: inherit;
  }

  .admin-user-cell__primary {
    color: rgb(var(--color-text));
    font-size: 13px;
  }

  .admin-user-cell__secondary {
    color: rgb(var(--color-muted));
    font-size: 11px;
    line-height: 1.5;
  }

  .admin-log-card {
    border: 1px solid rgba(200, 164, 92, 0.12);
    border-radius: 2px;
    background: rgba(14, 18, 28, 0.36);
    padding: 10px 12px;
  }

  .admin-user-table-wrap {
    border: 1px solid rgba(200, 164, 92, 0.14);
    border-radius: 2px;
    overflow-x: auto;
    overflow-y: hidden;
    background: rgba(14, 18, 28, 0.16);
  }

  .admin-user-table {
    display: grid;
    grid-template-columns:
      minmax(180px, 1.3fr)
      minmax(144px, 0.95fr)
      minmax(88px, 0.6fr)
      minmax(88px, 0.6fr)
      minmax(150px, 0.95fr)
      minmax(220px, 1.35fr)
      minmax(220px, 1.3fr);
    gap: 12px;
    align-items: center;
    width: 100%;
    min-width: 1180px;
  }

  .admin-user-table--head {
    padding: 10px 14px;
    background: rgba(200, 164, 92, 0.08);
    border-bottom: 1px solid rgba(200, 164, 92, 0.14);
    font-size: 11px;
    color: rgb(var(--color-muted));
  }

  .admin-user-table--row {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(200, 164, 92, 0.08);
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .admin-user-table--row:last-child {
    border-bottom: none;
  }

  .admin-user-table--active {
    background: rgba(200, 164, 92, 0.08);
  }

  .admin-user-line {
    min-width: 0;
  }

  .admin-user-line__value {
    font-size: 13px;
    color: rgb(var(--color-text));
    line-height: 1.6;
    word-break: break-word;
  }

  .admin-user-line__hint {
    margin-top: 4px;
    font-size: 11px;
    color: rgb(var(--color-muted));
    line-height: 1.5;
  }

  .admin-user-line--actions {
    display: flex;
    justify-content: flex-end;
  }

  .admin-detail-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: rgba(6, 8, 15, 0.82);
    backdrop-filter: blur(6px);
  }

  .admin-detail-modal {
    width: min(1400px, calc(100vw - 24px));
    max-height: min(88vh, 960px);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .admin-detail-modal__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .admin-detail-modal__body {
    overflow-y: auto;
    padding-right: 4px;
  }

  @media (max-width: 1535px) {
    .admin-user-table {
      grid-template-columns:
        minmax(170px, 1.2fr)
        minmax(132px, 0.9fr)
        minmax(82px, 0.55fr)
        minmax(82px, 0.55fr)
        minmax(130px, 0.85fr)
        minmax(180px, 1.15fr)
        minmax(200px, 1.15fr);
      gap: 10px;
    }
  }

  @media (max-width: 1279px) {
    .admin-user-table-wrap {
      border: none;
      background: transparent;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: visible;
    }

    .admin-user-table--head {
      display: none;
    }

    .admin-user-table--row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: 0;
      gap: 10px 12px;
      border: 1px solid rgba(200, 164, 92, 0.14);
      background: rgba(26, 26, 26, 0.16);
      padding: 12px;
    }

    .admin-user-line::before {
      content: attr(data-label);
      display: block;
      margin-bottom: 4px;
      font-size: 10px;
      color: rgb(var(--color-muted));
      letter-spacing: 0.02em;
    }

    .admin-user-line--user,
    .admin-user-line--actions {
      grid-column: span 2;
    }

    .admin-user-line--actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 767px) {
    .admin-user-table--row {
      grid-template-columns: minmax(0, 1fr);
    }

    .admin-user-line--user,
    .admin-user-line--actions {
      grid-column: span 1;
    }

    .admin-detail-modal {
      width: calc(100vw - 16px);
      max-height: calc(100vh - 16px);
      padding: 12px;
    }

    .admin-detail-modal__header {
      flex-direction: column;
      align-items: stretch;
    }
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

  .admin-status--active {
    color: #96deac;
    background: rgba(72, 146, 95, 0.14);
    border-color: rgba(72, 146, 95, 0.3);
  }

  .admin-status--banned {
    color: #ffb469;
    background: rgba(207, 113, 34, 0.12);
    border-color: rgba(207, 113, 34, 0.28);
  }

  .admin-status--deleted {
    color: #ff9f9f;
    background: rgba(184, 70, 70, 0.14);
    border-color: rgba(184, 70, 70, 0.3);
  }

  .admin-slot-card {
    border: 1px solid rgba(200, 164, 92, 0.12);
    border-radius: 2px;
    padding: 8px;
    background: rgba(14, 18, 28, 0.42);
  }

  .admin-slot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  @media (min-width: 768px) {
    .admin-top-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .admin-top-actions :deep(.btn) {
      width: auto;
    }

    .admin-filter-summary__action {
      width: auto;
    }

    .admin-slot-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 480px) {
    .admin-top-actions {
      grid-template-columns: minmax(0, 1fr);
    }

    .admin-filter-summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .admin-chip {
      width: 100%;
    }

    .admin-slot-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  :deep(.btn-danger) {
    background: rgba(184, 70, 70, 0.2);
    border-color: rgba(184, 70, 70, 0.35);
    color: #ffb7b7;
  }

  :deep(.btn-danger:hover) {
    background: rgba(184, 70, 70, 0.35);
  }
</style>