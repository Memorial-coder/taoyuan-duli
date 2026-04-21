<template>
  <div class="space-y-4">
    <div class="game-panel space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="space-y-1">
          <p class="text-sm text-accent">官方云控平台</p>
          <p class="text-xs text-muted leading-6">
            这里只在官方域名下显示，用来发布官方文案并管理可读取 `taoyuan.ymzcc.com` 配置的实例授权。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="game-chip">版本 {{ status?.currentVersion || '-' }}</span>
          <span class="game-chip">实例 {{ status?.instanceCount || 0 }}</span>
          <span class="game-chip">发布记录 {{ status?.releaseCount || 0 }}</span>
        </div>
      </div>

      <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

      <div class="official-control-banner" :class="`official-control-banner--${status?.secondAuthVerified ? 'active' : 'locked'}`">
        <div class="text-xs leading-6">
          当前状态：{{ status?.secondAuthVerified ? '已通过云控二次验证' : '等待云控二次密码' }}
          <span v-if="status?.profileId"> · {{ status.profileId }}</span>
        </div>
        <div class="text-[11px] text-muted leading-5">
          先通过现有管理员口令，再通过这里的二次密码，才可发布官方配置和管理授权实例。
        </div>
      </div>

      <div v-if="!status?.secondAuthVerified" class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label class="official-control-label">
          <span>云控二次密码</span>
          <input
            v-model="secondPassword"
            type="password"
            class="official-control-input"
            placeholder="输入云控平台二次密码"
            @keydown.enter.prevent="loginSecondAuth"
          />
        </label>
        <button class="btn" :disabled="authenticating || !secondPassword.trim()" @click="loginSecondAuth">
          <span>{{ authenticating ? '验证中...' : '进入云控平台' }}</span>
        </button>
      </div>

      <div v-else class="flex flex-wrap gap-2">
        <button class="btn" :disabled="loadingProtected" @click="refreshProtectedData">
          <span>{{ loadingProtected ? '刷新中...' : '刷新云控数据' }}</span>
        </button>
        <button class="btn" @click="logoutSecondAuth">
          <span>退出云控平台</span>
        </button>
      </div>
    </div>

    <template v-if="status?.secondAuthVerified">
      <div v-if="latestIssuedLicense" class="game-panel space-y-3">
        <div class="space-y-1">
          <p class="text-sm text-accent">新密钥已生成</p>
          <p class="text-xs text-muted leading-6">
            这串实例密钥只会回显一次，请立即保存。实例 ID：{{ latestIssuedLicense.instanceId }}
          </p>
        </div>
        <textarea class="official-control-textarea" rows="3" readonly :value="latestIssuedLicense.licenseKey" />
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div class="game-panel space-y-4">
          <div class="space-y-1">
            <p class="text-sm text-accent">官方文案发布</p>
            <p class="text-xs text-muted leading-6">
              只发布这 5 个官方受控字段。发布后官方站立即生效，其他实例按读取周期同步。
            </p>
          </div>

          <label class="official-control-label">
            <span>控制台署名文案</span>
            <textarea v-model="draftValues.ai_assistant_console_credit" rows="4" class="official-control-textarea" />
          </label>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="official-control-label">
              <span>AI 助手名称</span>
              <input v-model="draftValues.ai_assistant_name" type="text" maxlength="40" class="official-control-input" />
            </label>
            <label class="official-control-label">
              <span>首页关于标题</span>
              <input v-model="draftValues.taoyuan_about_dialog_title" type="text" maxlength="60" class="official-control-input" />
            </label>
          </div>

          <label class="official-control-label">
            <span>AI 欢迎语</span>
            <textarea v-model="draftValues.ai_assistant_welcome" rows="4" class="official-control-textarea" />
          </label>

          <label class="official-control-label">
            <span>首页关于正文</span>
            <textarea v-model="draftValues.taoyuan_about_dialog_content" rows="6" class="official-control-textarea" />
          </label>

          <div class="flex flex-wrap gap-2">
            <button class="btn btn-primary" :disabled="publishing" @click="publishCurrentConfig">
              <span>{{ publishing ? '发布中...' : '发布新版本' }}</span>
            </button>
            <span class="text-[11px] text-muted leading-6" v-if="currentRelease">
              当前生效：v{{ currentRelease.version }} · {{ formatTime(currentRelease.createdAt) }}
            </span>
          </div>
        </div>

        <div class="game-panel space-y-4">
          <div class="space-y-1">
            <p class="text-sm text-accent">发布记录</p>
            <p class="text-xs text-muted leading-6">这里只保留最近的官方发布版本。</p>
          </div>

          <div v-if="!releases.length" class="text-xs text-muted">还没有发布记录。</div>
          <div v-else class="space-y-3 max-h-[56vh] overflow-y-auto pr-1">
            <div v-for="release in releases" :key="release.id" class="official-control-card text-xs text-muted space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-text">v{{ release.version }}</div>
                  <div class="text-[11px] text-muted mt-1">{{ formatTime(release.createdAt) }}</div>
                </div>
                <span class="game-chip">{{ release.operatorName || release.operatorRole || '系统' }}</span>
              </div>
              <div>配置摘要：{{ summarizeRelease(release) }}</div>
              <button class="btn !px-2 !py-1" @click="loadReleaseIntoEditor(release)">载入到编辑器</button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div class="game-panel space-y-4">
          <div class="space-y-1">
            <p class="text-sm text-accent">新增授权实例</p>
            <p class="text-xs text-muted leading-6">
              创建后会回显一次实例密钥。`public_origin` 一行一个，必须填完整 origin。
            </p>
          </div>

          <label class="official-control-label">
            <span>实例名称</span>
            <input v-model="createForm.label" type="text" class="official-control-input" placeholder="例如：主站生产 / 海外节点" />
          </label>

          <label class="official-control-label">
            <span>实例 ID</span>
            <input v-model="createForm.instanceId" type="text" class="official-control-input" placeholder="例如：taoyuan-prod-cn" />
          </label>

          <label class="official-control-label">
            <span>允许的 public_origin</span>
            <textarea
              v-model="createForm.allowedOriginsText"
              rows="5"
              class="official-control-textarea"
              placeholder="https://example.com&#10;https://app.example.com"
            />
          </label>

          <label class="inline-flex items-center gap-2 text-xs text-muted">
            <input v-model="createForm.enabled" type="checkbox" />
            <span>创建后立即启用</span>
          </label>

          <button class="btn btn-primary" :disabled="creatingInstance || !createForm.instanceId.trim()" @click="createInstance">
            <span>{{ creatingInstance ? '创建中...' : '创建授权实例' }}</span>
          </button>
        </div>

        <div class="game-panel space-y-4">
          <div class="space-y-1">
            <p class="text-sm text-accent">实例授权管理</p>
            <p class="text-xs text-muted leading-6">可以启停实例、维护来源白名单，并随时重置实例密钥。</p>
          </div>

          <div v-if="!instances.length" class="text-xs text-muted">还没有授权实例。</div>
          <div v-else class="space-y-3">
            <div v-for="instance in instances" :key="instance.id" class="official-control-card space-y-3">
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div class="space-y-1">
                  <p class="text-sm text-accent">{{ instance.label }}</p>
                  <p class="text-xs text-muted">{{ instance.instanceId }}</p>
                </div>
                <span class="game-chip">{{ instance.enabled ? '已启用' : '已禁用' }}</span>
              </div>

              <label class="official-control-label">
                <span>允许的 public_origin</span>
                <textarea v-model="instanceOriginDrafts[instance.id]" rows="4" class="official-control-textarea" />
              </label>

              <div class="flex flex-wrap gap-2 text-xs text-muted">
                <span>创建：{{ formatTime(instance.createdAt) }}</span>
                <span>更新：{{ formatTime(instance.updatedAt) }}</span>
                <span>上次重置：{{ instance.lastResetAt ? formatTime(instance.lastResetAt) : '-' }}</span>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  class="btn"
                  :disabled="updatingInstanceId === instance.id"
                  @click="saveInstanceOrigins(instance)"
                >
                  <span>{{ updatingInstanceId === instance.id ? '保存中...' : '保存来源白名单' }}</span>
                </button>
                <button
                  class="btn"
                  :disabled="updatingInstanceId === instance.id"
                  @click="toggleInstanceEnabled(instance)"
                >
                  <span>{{ updatingInstanceId === instance.id ? '处理中...' : instance.enabled ? '禁用实例' : '启用实例' }}</span>
                </button>
                <button
                  class="btn btn-danger"
                  :disabled="resettingInstanceId === instance.id"
                  @click="resetInstanceLicense(instance)"
                >
                  <span>{{ resettingInstanceId === instance.id ? '重置中...' : '重置实例密钥' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { showFloat } from '@/composables/useGameLog'
  import {
    createOfficialControlInstance,
    fetchOfficialControlCurrentConfig,
    fetchOfficialControlInstances,
    fetchOfficialControlPlatformStatus,
    loginOfficialControlSecondAuth,
    logoutOfficialControlSecondAuth,
    publishOfficialControlConfig,
    resetOfficialControlInstanceLicense,
    updateOfficialControlInstance,
  } from '@/utils/officialControlApi'
  import type {
    OfficialControlInstanceRecord,
    OfficialControlPlatformStatus,
    OfficialControlReleaseRecord,
    OfficialManagedConfigValues,
  } from '@/types'

  const props = defineProps<{
    canLoad: boolean
  }>()

  const defaultValues = (): OfficialManagedConfigValues => ({
    ai_assistant_console_credit:
      '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186',
    ai_assistant_name: '桃源小助理',
    ai_assistant_welcome:
      '你好，我是桃源小助理。你可以问我玩法、系统机制、资源获取和攻略建议；如果是严格模式，我不会回答敏感数值、隐藏掉率或后台规则。',
    taoyuan_about_dialog_title: '关于桃源乡',
    taoyuan_about_dialog_content: '欢迎来到桃源乡独立版。这是一款以种田、采集、养殖、钓鱼和经营为核心的文字田园模拟游戏。',
  })

  const status = ref<OfficialControlPlatformStatus | null>(null)
  const currentRelease = ref<OfficialControlReleaseRecord | null>(null)
  const releases = ref<OfficialControlReleaseRecord[]>([])
  const instances = ref<OfficialControlInstanceRecord[]>([])
  const draftValues = ref<OfficialManagedConfigValues>(defaultValues())
  const secondPassword = ref('')
  const authenticating = ref(false)
  const publishing = ref(false)
  const loadingProtected = ref(false)
  const creatingInstance = ref(false)
  const updatingInstanceId = ref('')
  const resettingInstanceId = ref('')
  const errorMessage = ref('')
  const latestIssuedLicense = ref<{ instanceId: string; licenseKey: string } | null>(null)
  const createForm = ref({
    label: '',
    instanceId: '',
    allowedOriginsText: '',
    enabled: true,
  })
  const instanceOriginDrafts = ref<Record<string, string>>({})

  const formatTime = (timestamp?: number | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const summarizeRelease = (release: OfficialControlReleaseRecord) => {
    const values = release.values || {}
    const parts = [
      values.ai_assistant_name ? `AI 名称：${values.ai_assistant_name}` : '',
      values.taoyuan_about_dialog_title ? `关于标题：${values.taoyuan_about_dialog_title}` : '',
    ].filter(Boolean)
    return parts.join(' · ') || '已发布官方文案'
  }

  const syncDraftFromRelease = (release: OfficialControlReleaseRecord | null) => {
    draftValues.value = {
      ...defaultValues(),
      ...(release?.values || {}),
    }
  }

  const syncInstanceDrafts = (nextInstances: OfficialControlInstanceRecord[]) => {
    instanceOriginDrafts.value = Object.fromEntries(
      nextInstances.map(item => [item.id, item.allowedOrigins.join('\n')])
    )
  }

  const parseOriginsText = (value: string) => {
    return value
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean)
  }

  const loadStatus = async () => {
    status.value = await fetchOfficialControlPlatformStatus()
  }

  const loadProtectedData = async () => {
    if (!status.value?.secondAuthVerified) return
    loadingProtected.value = true
    errorMessage.value = ''
    try {
      const [configResult, instanceResult] = await Promise.all([
        fetchOfficialControlCurrentConfig(),
        fetchOfficialControlInstances(),
      ])
      currentRelease.value = configResult.current
      releases.value = configResult.releases
      instances.value = instanceResult
      syncDraftFromRelease(configResult.current)
      syncInstanceDrafts(instanceResult)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取官方云控数据失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      loadingProtected.value = false
    }
  }

  const refreshProtectedData = async () => {
    try {
      await loadStatus()
      await loadProtectedData()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '刷新官方云控状态失败'
      showFloat(errorMessage.value, 'danger')
    }
  }

  const loginSecondAuth = async () => {
    if (!secondPassword.value.trim()) return
    authenticating.value = true
    errorMessage.value = ''
    try {
      status.value = await loginOfficialControlSecondAuth(secondPassword.value.trim())
      secondPassword.value = ''
      showFloat('云控二次验证通过', 'success')
      await loadProtectedData()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '云控二次验证失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      authenticating.value = false
    }
  }

  const logoutSecondAuth = async () => {
    try {
      status.value = await logoutOfficialControlSecondAuth()
      currentRelease.value = null
      releases.value = []
      instances.value = []
      latestIssuedLicense.value = null
      syncDraftFromRelease(null)
      showFloat('已退出云控平台', 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '退出云控平台失败'
      showFloat(errorMessage.value, 'danger')
    }
  }

  const publishCurrentConfig = async () => {
    publishing.value = true
    errorMessage.value = ''
    try {
      const result = await publishOfficialControlConfig(draftValues.value)
      currentRelease.value = result.current
      releases.value = result.releases
      syncDraftFromRelease(result.current)
      await loadStatus()
      showFloat(`官方配置已发布为 v${result.current.version}`, 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '发布官方配置失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      publishing.value = false
    }
  }

  const loadReleaseIntoEditor = (release: OfficialControlReleaseRecord) => {
    syncDraftFromRelease(release)
    showFloat(`已载入版本 ${release.version}`, 'success')
  }

  const createInstance = async () => {
    creatingInstance.value = true
    errorMessage.value = ''
    try {
      const result = await createOfficialControlInstance({
        label: createForm.value.label.trim(),
        instanceId: createForm.value.instanceId.trim(),
        allowedOrigins: parseOriginsText(createForm.value.allowedOriginsText),
        enabled: createForm.value.enabled,
      })
      latestIssuedLicense.value = {
        instanceId: result.instance.instanceId,
        licenseKey: result.licenseKey,
      }
      instances.value = [result.instance, ...instances.value]
      syncInstanceDrafts(instances.value)
      createForm.value = {
        label: '',
        instanceId: '',
        allowedOriginsText: '',
        enabled: true,
      }
      await loadStatus()
      showFloat(`实例 ${result.instance.instanceId} 已创建`, 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '创建实例失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      creatingInstance.value = false
    }
  }

  const replaceInstance = (nextInstance: OfficialControlInstanceRecord) => {
    instances.value = instances.value.map(item => (item.id === nextInstance.id ? nextInstance : item))
    syncInstanceDrafts(instances.value)
  }

  const saveInstanceOrigins = async (instance: OfficialControlInstanceRecord) => {
    updatingInstanceId.value = instance.id
    errorMessage.value = ''
    try {
      const nextInstance = await updateOfficialControlInstance(instance.id, {
        allowedOrigins: parseOriginsText(instanceOriginDrafts.value[instance.id] || ''),
      })
      replaceInstance(nextInstance)
      showFloat(`实例 ${nextInstance.instanceId} 的来源白名单已保存`, 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存实例来源白名单失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      updatingInstanceId.value = ''
    }
  }

  const toggleInstanceEnabled = async (instance: OfficialControlInstanceRecord) => {
    updatingInstanceId.value = instance.id
    errorMessage.value = ''
    try {
      const nextInstance = await updateOfficialControlInstance(instance.id, {
        enabled: !instance.enabled,
      })
      replaceInstance(nextInstance)
      showFloat(`${nextInstance.instanceId} 已${nextInstance.enabled ? '启用' : '禁用'}`, 'success')
      await loadStatus()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '更新实例状态失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      updatingInstanceId.value = ''
    }
  }

  const resetInstanceLicense = async (instance: OfficialControlInstanceRecord) => {
    if (typeof window !== 'undefined' && !window.confirm(`确认重置实例 ${instance.instanceId} 的密钥吗？旧密钥会立刻失效。`)) {
      return
    }
    resettingInstanceId.value = instance.id
    errorMessage.value = ''
    try {
      const result = await resetOfficialControlInstanceLicense(instance.id)
      replaceInstance(result.instance)
      latestIssuedLicense.value = {
        instanceId: result.instance.instanceId,
        licenseKey: result.licenseKey,
      }
      showFloat(`实例 ${result.instance.instanceId} 的新密钥已生成`, 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '重置实例密钥失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      resettingInstanceId.value = ''
    }
  }

  onMounted(async () => {
    if (!props.canLoad) return
    try {
      await loadStatus()
      await loadProtectedData()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取官方云控平台失败'
    }
  })
</script>

<style scoped>
  .official-control-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: rgb(var(--color-muted));
  }

  .official-control-input,
  .official-control-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(14, 18, 28, 0.82);
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 2px;
    color: rgb(var(--color-text));
    outline: none;
    font-size: 13px;
    box-sizing: border-box;
  }

  .official-control-input:focus,
  .official-control-textarea:focus {
    border-color: rgba(200, 164, 92, 0.55);
  }

  .official-control-textarea {
    resize: vertical;
    min-height: 96px;
  }

  .official-control-banner,
  .official-control-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
  }

  .official-control-banner--active {
    border-color: rgba(72, 146, 95, 0.3);
    background: rgba(72, 146, 95, 0.12);
  }

  .official-control-banner--locked {
    border-color: rgba(200, 164, 92, 0.18);
    background: rgba(200, 164, 92, 0.08);
  }
</style>
