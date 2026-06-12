<template>
  <div class="announcement-admin grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.2fr)_420px]">
    <div class="game-panel space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-sm text-accent">更新公告</p>
          <p class="mt-1 text-xs text-muted leading-6">
            保存草稿后手动发布，发布或下线时会实时通知在线账号刷新公告队列。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn !px-3 !py-2" :disabled="loading" @click="loadAnnouncements">
            {{ loading ? '刷新中...' : '刷新公告' }}
          </button>
          <button class="btn !px-3 !py-2" @click="createNewAnnouncement">新建公告</button>
        </div>
      </div>

      <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

      <div class="announcement-template-row">
        <button
          v-for="template in templates"
          :key="template.id"
          type="button"
          class="announcement-template"
          :data-testid="`announcement-template-${template.id}`"
          @click="applyTemplate(template)"
        >
          {{ templateLabel(template) }}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>标题</span>
          <input v-model="form.title" maxlength="120" class="admin-input" placeholder="例如：桃源乡 3.0.0 更新公告" />
        </label>
        <label class="admin-label">
          <span>公告版本号</span>
          <input v-model="form.version" maxlength="64" class="admin-input" placeholder="例如：3.0.0，留空表示通用" />
        </label>
      </div>

      <div class="grid gap-3 md:grid-cols-[1fr_120px_140px]">
        <label class="admin-label">
          <span>图片链接</span>
          <input v-model="form.image_url" maxlength="512" class="admin-input" placeholder="/api/taoyuan/hall/uploads/..." />
        </label>
        <label class="admin-label">
          <span>优先级</span>
          <input v-model.number="form.priority" type="number" min="0" max="999" class="admin-input" />
        </label>
        <label class="admin-label">
          <span>模板类型</span>
          <input v-model="form.template_type" maxlength="64" class="admin-input" />
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <input ref="imageInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleImageSelected" />
        <button class="btn !px-3 !py-2" :disabled="uploadingImage" @click="imageInputRef?.click()">
          {{ uploadingImage ? '上传中...' : '上传公告图片' }}
        </button>
        <button v-if="form.image_url" class="btn !px-3 !py-2" @click="form.image_url = ''">移除图片</button>
      </div>

      <label class="admin-label">
        <span>正文 Markdown / 富文本</span>
        <textarea v-model="form.body" rows="10" maxlength="8000" class="admin-textarea" placeholder="支持 Markdown 标题、列表、链接、表格和安全富文本 HTML。" />
      </label>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>定向版本（逗号或换行，留空=全部）</span>
          <textarea v-model="targetVersionsText" rows="3" class="admin-textarea admin-textarea--compact" placeholder="3.0.0, 3.0.1" />
        </label>
        <label class="admin-label">
          <span>定向渠道（逗号或换行，留空=全部）</span>
          <textarea v-model="targetChannelsText" rows="3" class="admin-textarea admin-textarea--compact" placeholder="web, android, ios" />
        </label>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>生效时间</span>
          <input v-model="startAtText" type="datetime-local" class="admin-input" />
        </label>
        <label class="admin-label">
          <span>失效时间</span>
          <input v-model="endAtText" type="datetime-local" class="admin-input" />
        </label>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>CTA 按钮文字</span>
          <input v-model="form.cta_text" maxlength="60" class="admin-input" placeholder="查看详情" />
        </label>
        <label class="admin-label">
          <span>跳转链接</span>
          <input v-model="form.cta_url" maxlength="512" class="admin-input" placeholder="/game/farm 或 https://..." />
        </label>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>关闭按钮</span>
          <input v-model="form.button_texts.close" maxlength="40" class="admin-input" />
        </label>
        <label class="admin-label">
          <span>详情按钮</span>
          <input v-model="form.button_texts.cta" maxlength="40" class="admin-input" />
        </label>
      </div>

      <div class="announcement-reward-panel" data-testid="announcement-reward-config">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm text-accent">公告奖励</p>
            <p class="text-xs text-muted leading-5">玩家点击“知道并领取”后发放；无奖励公告仍显示“知道了”。</p>
          </div>
          <button class="btn !px-3 !py-2" type="button" @click="addReward">添加奖励</button>
        </div>
        <label class="admin-label">
          <span>重复装备补偿铜钱</span>
          <input v-model.number="form.duplicate_compensation_money" type="number" min="0" class="admin-input" placeholder="重复武器/戒指/帽子/鞋子时补偿" />
        </label>
        <div v-if="!form.rewards.length" class="announcement-reward-empty">未配置奖励，公告只做已读提示。</div>
        <div v-else class="announcement-reward-list">
          <div v-for="(reward, index) in form.rewards" :key="`announcement-reward-${index}`" class="announcement-reward-row">
            <select v-model="reward.type" class="admin-input" @change="normalizeRewardRow(reward)">
              <option value="money">铜钱</option>
              <option value="item">物品</option>
              <option value="seed">种子</option>
              <option value="weapon">武器</option>
              <option value="ring">戒指</option>
              <option value="hat">帽子</option>
              <option value="shoe">鞋子</option>
              <option value="decoration">装饰</option>
            </select>
            <input
              v-if="reward.type !== 'money'"
              v-model="reward.id"
              maxlength="80"
              class="admin-input"
              placeholder="奖励 ID，如 wood / seed_peach / wooden_stick"
              @blur="normalizeRewardRow(reward)"
            />
            <input
              v-if="reward.type === 'money'"
              v-model.number="reward.amount"
              type="number"
              min="1"
              class="admin-input"
              placeholder="金额"
              @blur="normalizeRewardRow(reward)"
            />
            <input
              v-else
              v-model.number="reward.quantity"
              type="number"
              min="1"
              class="admin-input"
              placeholder="数量"
              @blur="normalizeRewardRow(reward)"
            />
            <select v-if="reward.type === 'item' || reward.type === 'seed'" v-model="reward.quality" class="admin-input">
              <option value="normal">普通</option>
              <option value="fine">优良</option>
              <option value="excellent">精品</option>
              <option value="supreme">极品</option>
            </select>
            <button class="btn btn-danger !px-3 !py-2" type="button" @click="removeReward(index)">删除</button>
          </div>
        </div>
      </div>

      <div class="announcement-admin-actions">
        <button class="btn !px-3 !py-2" :disabled="saving" @click="saveDraft">
          {{ saving ? '保存中...' : '保存草稿' }}
        </button>
        <button class="btn announcement-primary !px-3 !py-2" :disabled="saving" @click="publishAnnouncement">
          {{ saving ? '处理中...' : '保存并发布' }}
        </button>
        <button
          class="btn btn-danger !px-3 !py-2"
          :disabled="saving || !selectedAnnouncement || selectedAnnouncement.status === 'offline'"
          @click="offlineAnnouncement"
        >
          下线公告
        </button>
        <button
          class="btn btn-danger !px-3 !py-2"
          :disabled="saving || !selectedAnnouncement"
          @click="deleteAnnouncement"
        >
          删除公告
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div class="game-panel space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">实时预览</p>
          <span class="announcement-status" :class="statusClass(selectedAnnouncement?.status || 'draft')">
            {{ statusLabel(selectedAnnouncement?.status || 'draft') }}
          </span>
        </div>
        <div class="announcement-preview" data-testid="announcement-admin-preview">
          <img v-if="form.image_url" :src="form.image_url" :alt="form.title || '公告图片'" class="announcement-preview-image" />
          <h3>{{ form.title || '未命名公告' }}</h3>
          <div class="announcement-preview-body" v-html="previewHtml" />
          <div v-if="form.rewards.length" class="announcement-preview-rewards" data-testid="announcement-reward-preview">
            <span>奖励</span>
            <strong>{{ form.rewards.map(rewardLabel).join(' / ') }}</strong>
          </div>
          <div class="announcement-preview-actions">
            <span>{{ previewCloseButtonLabel }}</span>
            <span v-if="form.cta_url">{{ form.cta_text || form.button_texts.cta || '查看详情' }}</span>
          </div>
        </div>
      </div>

      <div class="game-panel space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">公告列表</p>
          <span class="text-xs text-muted">{{ announcements.length }} 条</span>
        </div>
        <div v-if="!announcements.length" class="text-xs text-muted">暂无公告。</div>
        <div v-else class="announcement-list">
          <button
            v-for="announcement in announcements"
            :key="announcement.id"
            type="button"
            class="announcement-list-item"
            :class="{ 'announcement-list-item--active': announcement.id === selectedAnnouncement?.id }"
            @click="selectAnnouncement(announcement)"
          >
            <span class="announcement-list-title">{{ announcement.title }}</span>
            <span class="announcement-list-meta">
              {{ statusLabel(announcement.status) }} · {{ formatTime(announcement.updated_at || announcement.created_at) }}
              <template v-if="announcement.version"> · v{{ announcement.version }}</template>
              <template v-if="announcement.rewards.length"> · 奖励 {{ announcement.rewards.length }}</template>
            </span>
          </button>
        </div>
      </div>

      <div class="game-panel space-y-3" data-testid="announcement-stats">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-accent">统计</p>
          <button class="btn !px-2 !py-1" :disabled="!selectedAnnouncement || loadingStats" @click="refreshSelectedMeta">
            {{ loadingStats ? '加载中...' : '刷新' }}
          </button>
        </div>
        <div class="announcement-stats-grid">
          <div v-for="item in statItems" :key="item.label" class="announcement-stat">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <div class="game-panel space-y-3">
        <p class="text-sm text-accent">操作日志</p>
        <div v-if="!auditLogs.length" class="text-xs text-muted">暂无操作记录。</div>
        <div v-else class="announcement-audit-list">
          <div v-for="log in auditLogs" :key="`${log.action}:${log.created_at}:${log.id}`" class="announcement-audit-item">
            <div class="text-text">{{ auditActionLabel(log.action) }}</div>
            <div>{{ formatTime(log.created_at) }} · {{ log.operator_name || log.actor_username || '管理员' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { renderRichContent } from '@/utils/safeMarkdown'
  import {
    createAdminAnnouncement,
    deleteAdminAnnouncement,
    fetchAdminAnnouncementAuditLogs,
    fetchAdminAnnouncements,
    fetchAdminAnnouncementStats,
    offlineAdminAnnouncement,
    publishAdminAnnouncement,
    updateAdminAnnouncement,
    uploadAdminContentImage,
  } from '@/utils/adminContentApi'
  import { showFloat } from '@/composables/useGameLog'
  import type {
    AnnouncementReward,
    TaoyuanAnnouncement,
    TaoyuanAnnouncementAuditLog,
    TaoyuanAnnouncementPayload,
    TaoyuanAnnouncementStats,
    TaoyuanAnnouncementTemplate,
  } from '@/types/announcement'

  const props = defineProps<{
    canLoad: boolean
  }>()

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

  const createEmptyForm = (): TaoyuanAnnouncementPayload => ({
    title: '',
    body: '',
    image_url: '',
    version: '',
    target_versions: [],
    target_channels: [],
    start_at: null,
    end_at: null,
    priority: 0,
    cta_text: '',
    cta_url: '',
    button_texts: {
      close: '知道了',
      suppress: '本条不再提示',
      cta: '查看详情',
    },
    template_type: '',
    rewards: [],
    duplicate_compensation_money: 0,
  })

  const announcements = ref<TaoyuanAnnouncement[]>([])
  const templates = ref<TaoyuanAnnouncementTemplate[]>([])
  const selectedAnnouncement = ref<TaoyuanAnnouncement | null>(null)
  const form = ref<TaoyuanAnnouncementPayload>(createEmptyForm())
  const targetVersionsText = ref('')
  const targetChannelsText = ref('')
  const startAtText = ref('')
  const endAtText = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const loadingStats = ref(false)
  const uploadingImage = ref(false)
  const errorMessage = ref('')
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const stats = ref<TaoyuanAnnouncementStats>({
    impression_count: 0,
    close_count: 0,
    suppress_count: 0,
    cta_click_count: 0,
    reward_claim_count: 0,
    read_count: 0,
    exposed_user_count: 0,
    event_count: 0,
  })
  const auditLogs = ref<TaoyuanAnnouncementAuditLog[]>([])
  const previewCloseButtonLabel = computed(() => (
    form.value.rewards.length ? '知道并领取' : (form.value.button_texts.close || '知道了')
  ))

  const parseDelimitedList = (value: string) => [...new Set(
    value
      .split(/[\n,，]/)
      .map(item => item.trim())
      .filter(Boolean)
  )]

  const toDatetimeLocal = (timestamp?: number | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp * 1000)
    const offsetMs = date.getTimezoneOffset() * 60 * 1000
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  const fromDatetimeLocal = (value: string) => {
    if (!value) return null
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null
  }

  const createEmptyReward = (): AnnouncementReward => ({
    type: 'money',
    amount: 100,
  })

  const normalizeRewardDraft = (reward: AnnouncementReward): AnnouncementReward | null => {
    const type = reward.type
    if (type === 'money') {
      const amount = Math.max(1, Math.floor(Number(reward.amount ?? reward.quantity) || 0))
      return amount > 0 ? { type: 'money', amount } : null
    }
    const id = String(reward.id || '').trim()
    if (!id) return null
    const quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1))
    if (type === 'item' || type === 'seed') {
      return { type, id, quantity, quality: String(reward.quality || 'normal') }
    }
    return { type, id, quantity }
  }

  const normalizeRewardRow = (reward: AnnouncementReward) => {
    const normalized = normalizeRewardDraft(reward)
    if (!normalized) {
      if (reward.type === 'money') reward.amount = 100
      else reward.quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1))
      return
    }
    Object.assign(reward, normalized)
    if (reward.type === 'money') {
      delete reward.id
      delete reward.quantity
      delete reward.quality
      return
    }
    delete reward.amount
    if (reward.type !== 'item' && reward.type !== 'seed') delete reward.quality
  }

  const addReward = () => {
    form.value.rewards = [...form.value.rewards, createEmptyReward()]
  }

  const removeReward = (index: number) => {
    form.value.rewards = form.value.rewards.filter((_, rewardIndex) => rewardIndex !== index)
  }

  const rewardLabel = (reward: AnnouncementReward) => {
    if (reward.type === 'money') return `铜钱 x${Math.max(0, Number(reward.amount) || 0)}`
    const count = Math.max(0, Number(reward.quantity) || 0)
    const quality = reward.type === 'item' || reward.type === 'seed' ? `/${reward.quality || 'normal'}` : ''
    return `${reward.type}:${reward.id || '-'} x${count}${quality}`
  }

  const payloadFromForm = (): TaoyuanAnnouncementPayload => ({
    ...form.value,
    target_versions: parseDelimitedList(targetVersionsText.value),
    target_channels: parseDelimitedList(targetChannelsText.value),
    start_at: fromDatetimeLocal(startAtText.value),
    end_at: fromDatetimeLocal(endAtText.value),
    priority: Number(form.value.priority) || 0,
    button_texts: {
      close: form.value.button_texts.close || '知道了',
      suppress: form.value.button_texts.suppress || '本条不再提示',
      cta: form.value.button_texts.cta || '查看详情',
    },
    rewards: form.value.rewards.map(normalizeRewardDraft).filter((item): item is AnnouncementReward => !!item),
    duplicate_compensation_money: Math.max(0, Math.floor(Number(form.value.duplicate_compensation_money) || 0)),
  })

  const applyAnnouncementToForm = (announcement: TaoyuanAnnouncement | null) => {
    if (!announcement) {
      form.value = createEmptyForm()
      targetVersionsText.value = ''
      targetChannelsText.value = ''
      startAtText.value = ''
      endAtText.value = ''
      return
    }
    form.value = {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      image_url: announcement.image_url,
      version: announcement.version,
      target_versions: announcement.target_versions,
      target_channels: announcement.target_channels,
      start_at: announcement.start_at,
      end_at: announcement.end_at,
      priority: announcement.priority,
      cta_text: announcement.cta_text,
      cta_url: announcement.cta_url,
      button_texts: { ...announcement.button_texts },
      template_type: announcement.template_type,
      rewards: announcement.rewards.map(item => ({ ...item })),
      duplicate_compensation_money: announcement.duplicate_compensation_money,
    }
    targetVersionsText.value = announcement.target_versions.join('\n')
    targetChannelsText.value = announcement.target_channels.join('\n')
    startAtText.value = toDatetimeLocal(announcement.start_at)
    endAtText.value = toDatetimeLocal(announcement.end_at)
  }

  const previewHtml = computed(() => renderRichContent(form.value.body || ''))
  const statItems = computed(() => [
    { label: '曝光数', value: stats.value.impression_count },
    { label: '关闭数', value: stats.value.close_count },
    { label: '点击数', value: stats.value.cta_click_count },
    { label: '领奖数', value: stats.value.reward_claim_count },
    { label: '已读人数', value: stats.value.read_count },
    { label: '曝光人数', value: stats.value.exposed_user_count },
  ])

  const statusLabel = (status: string) => {
    if (status === 'published') return '已发布'
    if (status === 'offline') return '已下线'
    return '草稿'
  }

  const statusClass = (status: string) => {
    if (status === 'published') return 'announcement-status--published'
    if (status === 'offline') return 'announcement-status--offline'
    return 'announcement-status--draft'
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

  const templateLabel = (template: TaoyuanAnnouncementTemplate) => {
    const labels: Record<string, string> = {
      version_update: '版本更新',
      maintenance: '停服维护',
      hotfix: '热修复说明',
      event_preview: '活动预告',
      compensation: '补偿说明',
    }
    return labels[template.id] || template.label || template.id
  }

  const auditActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create_taoyuan_announcement: '创建公告',
      update_taoyuan_announcement: '更新公告',
      publish_taoyuan_announcement: '发布公告',
      offline_taoyuan_announcement: '下线公告',
      delete_taoyuan_announcement: '删除公告',
    }
    return labels[action] || action
  }

  const refreshSelectedMeta = async () => {
    if (!selectedAnnouncement.value) {
      stats.value = {
        impression_count: 0,
        close_count: 0,
        suppress_count: 0,
        cta_click_count: 0,
        reward_claim_count: 0,
        read_count: 0,
        exposed_user_count: 0,
        event_count: 0,
      }
      auditLogs.value = []
      return
    }
    loadingStats.value = true
    try {
      const [statsResult, logs] = await Promise.all([
        fetchAdminAnnouncementStats(selectedAnnouncement.value.id),
        fetchAdminAnnouncementAuditLogs(selectedAnnouncement.value.id),
      ])
      stats.value = statsResult.stats
      auditLogs.value = logs
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '公告统计加载失败', 'danger')
    } finally {
      loadingStats.value = false
    }
  }

  const selectAnnouncement = (announcement: TaoyuanAnnouncement) => {
    selectedAnnouncement.value = announcement
    applyAnnouncementToForm(announcement)
    void refreshSelectedMeta()
  }

  const loadAnnouncements = async () => {
    if (!props.canLoad) return
    loading.value = true
    errorMessage.value = ''
    try {
      const result = await fetchAdminAnnouncements()
      announcements.value = result.announcements
      templates.value = result.templates
      const selectedId = selectedAnnouncement.value?.id
      const nextSelected = selectedId
        ? result.announcements.find(item => item.id === selectedId) || null
        : result.announcements[0] || null
      selectedAnnouncement.value = nextSelected
      applyAnnouncementToForm(nextSelected)
      await refreshSelectedMeta()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '公告列表加载失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      loading.value = false
    }
  }

  const createNewAnnouncement = () => {
    selectedAnnouncement.value = null
    applyAnnouncementToForm(null)
    stats.value = {
      impression_count: 0,
      close_count: 0,
      suppress_count: 0,
      cta_click_count: 0,
      reward_claim_count: 0,
      read_count: 0,
      exposed_user_count: 0,
      event_count: 0,
    }
    auditLogs.value = []
  }

  const applyTemplate = (template: TaoyuanAnnouncementTemplate) => {
    form.value.title = template.title || templateLabel(template)
    form.value.body = template.body || ''
    form.value.template_type = template.template_type || template.id
    showFloat(`已套用${templateLabel(template)}模板`, 'success')
  }

  const persistDraft = async () => {
    const payload = payloadFromForm()
    const announcement = selectedAnnouncement.value?.id
      ? await updateAdminAnnouncement(selectedAnnouncement.value.id, payload)
      : await createAdminAnnouncement(payload)
    selectedAnnouncement.value = announcement
    applyAnnouncementToForm(announcement)
    return announcement
  }

  const saveDraft = async () => {
    saving.value = true
    errorMessage.value = ''
    try {
      await persistDraft()
      showFloat('公告草稿已保存', 'success')
      await loadAnnouncements()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存公告失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      saving.value = false
    }
  }

  const publishAnnouncement = async () => {
    saving.value = true
    errorMessage.value = ''
    try {
      const draft = await persistDraft()
      const result = await publishAdminAnnouncement(draft.id)
      selectedAnnouncement.value = result.announcement
      applyAnnouncementToForm(result.announcement)
      showFloat(`公告已发布，已推送 ${result.realtimeEmitted} 个在线连接`, 'success')
      await loadAnnouncements()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发布公告失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      saving.value = false
    }
  }

  const offlineAnnouncement = async () => {
    if (!selectedAnnouncement.value) return
    if (typeof window !== 'undefined' && !window.confirm('确认下线这条公告吗？下线后玩家端将不再展示。')) return
    saving.value = true
    errorMessage.value = ''
    try {
      const result = await offlineAdminAnnouncement(selectedAnnouncement.value.id)
      selectedAnnouncement.value = result.announcement
      applyAnnouncementToForm(result.announcement)
      showFloat(`公告已下线，已推送 ${result.realtimeEmitted} 个在线连接`, 'success')
      await loadAnnouncements()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '下线公告失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      saving.value = false
    }
  }

  const deleteAnnouncement = async () => {
    if (!selectedAnnouncement.value) return
    if (typeof window !== 'undefined' && !window.confirm('确认删除这条公告吗？删除后后台列表、玩家历史和这条公告的统计事件都会被移除，操作日志会保留。')) return
    saving.value = true
    errorMessage.value = ''
    try {
      const result = await deleteAdminAnnouncement(selectedAnnouncement.value.id)
      showFloat(`公告已删除，清理 ${result.deletedEventCount} 条统计事件，已推送 ${result.realtimeEmitted} 个在线连接`, 'success')
      selectedAnnouncement.value = null
      applyAnnouncementToForm(null)
      await loadAnnouncements()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '删除公告失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      saving.value = false
    }
  }

  const handleImageSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    input.value = ''
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      showFloat('仅支持 JPG、PNG、WEBP、GIF 图片', 'danger')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showFloat('单张图片不能超过 5MB', 'danger')
      return
    }
    uploadingImage.value = true
    try {
      const uploaded = await uploadAdminContentImage(file)
      form.value.image_url = uploaded.url
      showFloat('公告图片已上传', 'success')
    } catch (error) {
      showFloat(error instanceof Error ? error.message : '上传公告图片失败', 'danger')
    } finally {
      uploadingImage.value = false
    }
  }

  watch(
    () => props.canLoad,
    value => {
      if (value) void loadAnnouncements()
    },
    { immediate: true }
  )
</script>

<style scoped>
  .announcement-admin :deep(.admin-label) {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.75rem;
    color: rgb(var(--color-muted));
  }

  .admin-input,
  .admin-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(14, 18, 28, 0.82);
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 4px;
    color: rgb(var(--color-text));
    outline: none;
    font-size: 0.8125rem;
  }

  .admin-textarea {
    min-height: 160px;
    resize: vertical;
  }

  .admin-textarea--compact {
    min-height: 78px;
  }

  .announcement-template-row,
  .announcement-admin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .announcement-reward-panel {
    display: grid;
    gap: 10px;
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 6px;
    background: rgba(16, 20, 30, 0.28);
    padding: 12px;
  }

  .announcement-reward-empty {
    color: rgb(var(--color-muted));
    font-size: 0.75rem;
    line-height: 1.6;
  }

  .announcement-reward-list {
    display: grid;
    gap: 8px;
  }

  .announcement-reward-row {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr) 100px 100px auto;
    gap: 8px;
    align-items: center;
  }

  .announcement-template {
    border: 1px solid rgba(200, 164, 92, 0.22);
    border-radius: 999px;
    color: rgb(var(--color-accent));
    font-size: 0.75rem;
    padding: 6px 10px;
    background: rgba(200, 164, 92, 0.08);
  }

  .announcement-primary {
    background: rgba(200, 164, 92, 0.92);
    border-color: rgba(200, 164, 92, 0.92);
    color: rgb(var(--color-bg));
  }

  .announcement-preview {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 6px;
    background: rgba(14, 18, 28, 0.46);
    padding: 12px;
  }

  .announcement-preview h3 {
    color: rgb(var(--color-text));
    font-size: 0.9375rem;
    line-height: 1.45;
    margin-bottom: 10px;
  }

  .announcement-preview-image {
    display: block;
    width: 100%;
    max-height: 220px;
    object-fit: contain;
    margin-bottom: 12px;
    border: 1px solid rgba(200, 164, 92, 0.14);
    border-radius: 4px;
  }

  .announcement-preview-body {
    color: rgb(var(--color-text));
    font-size: 0.75rem;
    line-height: 1.75;
    max-height: 300px;
    overflow-y: auto;
    word-break: break-word;
  }

  .announcement-preview-body :deep(p),
  .announcement-preview-body :deep(ul),
  .announcement-preview-body :deep(ol),
  .announcement-preview-body :deep(h1),
  .announcement-preview-body :deep(h2),
  .announcement-preview-body :deep(h3),
  .announcement-preview-body :deep(table) {
    margin: 0 0 10px;
  }

  .announcement-preview-body :deep(ul),
  .announcement-preview-body :deep(ol) {
    padding-left: 18px;
  }

  .announcement-preview-body :deep(img) {
    max-width: 100%;
    max-height: 220px;
    object-fit: contain;
  }

  .announcement-preview-rewards {
    display: grid;
    gap: 4px;
    margin-top: 10px;
    border: 1px solid rgba(104, 211, 145, 0.22);
    border-radius: 4px;
    background: rgba(104, 211, 145, 0.08);
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
    padding: 8px;
  }

  .announcement-preview-rewards strong {
    color: rgb(var(--color-success));
    font-size: 0.75rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-preview-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 12px;
    font-size: 0.6875rem;
  }

  .announcement-preview-actions span {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 4px;
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 6px;
    text-align: center;
  }

  .announcement-status {
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.6875rem;
    border: 1px solid rgba(200, 164, 92, 0.16);
  }

  .announcement-status--draft {
    color: #c9ced9;
    background: rgba(120, 130, 150, 0.14);
  }

  .announcement-status--published {
    color: #96deac;
    background: rgba(72, 146, 95, 0.14);
  }

  .announcement-status--offline {
    color: #f0a3a3;
    background: rgba(185, 72, 72, 0.14);
  }

  .announcement-list,
  .announcement-audit-list {
    display: grid;
    gap: 8px;
    max-height: 360px;
    overflow-y: auto;
  }

  .announcement-list-item {
    border: 1px solid rgba(200, 164, 92, 0.14);
    border-radius: 6px;
    background: rgba(16, 20, 30, 0.34);
    padding: 10px;
    text-align: left;
  }

  .announcement-list-item--active {
    border-color: rgba(200, 164, 92, 0.5);
    background: rgba(200, 164, 92, 0.12);
  }

  .announcement-list-title {
    display: block;
    color: rgb(var(--color-text));
    font-size: 0.8125rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .announcement-list-meta {
    display: block;
    margin-top: 4px;
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
  }

  .announcement-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .announcement-stat,
  .announcement-audit-item {
    border: 1px solid rgba(200, 164, 92, 0.14);
    border-radius: 6px;
    background: rgba(16, 20, 30, 0.34);
    padding: 10px;
    color: rgb(var(--color-muted));
    font-size: 0.6875rem;
  }

  .announcement-stat strong {
    display: block;
    color: rgb(var(--color-text));
    font-size: 1rem;
    margin-top: 4px;
  }

  @media (max-width: 520px) {
    .announcement-reward-row {
      grid-template-columns: 1fr;
    }

    .announcement-preview-actions,
    .announcement-stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
