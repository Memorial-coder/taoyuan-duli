<template>
  <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
    <div class="game-panel space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm text-accent">安卓发布配置</p>
          <p class="text-xs text-muted mt-1">用于测试版 APK 的版本检查与下载提示。旧客户端会忽略这些新增字段，不影响现有游戏兼容。</p>
        </div>
        <button class="btn !px-3 !py-2" @click="loadConfig" :disabled="loading">
          {{ loading ? '加载中...' : '刷新配置' }}
        </button>
      </div>

      <div v-if="errorMessage" class="text-xs text-danger leading-6">{{ errorMessage }}</div>

      <label class="inline-flex items-center gap-2 text-xs text-muted">
        <input v-model="form.enabled" type="checkbox" />
        <span>启用安卓版本检查</span>
      </label>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="admin-label">
          <span>最新版本名</span>
          <input v-model="form.latestVersionName" type="text" maxlength="40" class="admin-input" placeholder="例如 2.4.1" />
        </label>

        <label class="admin-label">
          <span>最新版本号</span>
          <input v-model.number="form.latestVersionCode" type="number" min="0" class="admin-input" placeholder="例如 20401" />
        </label>

        <label class="admin-label">
          <span>最低支持版本号</span>
          <input v-model.number="form.minSupportedVersionCode" type="number" min="0" class="admin-input" placeholder="低于该版本将进入升级限制" />
        </label>

        <label class="admin-label">
          <span>APK 下载地址</span>
          <input v-model="form.downloadUrl" type="url" class="admin-input" placeholder="https://example.com/taoyuan.apk" />
        </label>
      </div>

      <label class="admin-label">
        <span>更新说明</span>
        <textarea v-model="form.releaseNotes" rows="6" class="admin-textarea" placeholder="填写本次安卓包更新内容，支持多行文本。" />
      </label>

      <label class="admin-label">
        <span>强制升级提示</span>
        <textarea
          v-model="form.forceUpdateMessage"
          rows="4"
          class="admin-textarea"
          placeholder="当版本过低时展示给玩家的提示文案。"
        />
      </label>

      <div class="admin-tip-card text-xs leading-6">
        <div>当前策略：低于最低支持版本时，会阻止继续进入正常游戏流程，但仍允许同步待上传云档与导出本地存档。</div>
        <div class="text-muted">建议保持最新版本号大于等于最低支持版本号，并提供可直接下载 APK 的 HTTPS 链接。</div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="btn btn-primary !px-3 !py-2" @click="saveConfig" :disabled="saving || loading">
          {{ saving ? '保存中...' : '保存发布配置' }}
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div class="game-panel space-y-4">
        <div>
          <p class="text-sm text-accent">当前生效预览</p>
          <p class="text-xs text-muted mt-1">App 启动时会读取这里的值，与客户端版本号进行比较。</p>
        </div>

        <div class="admin-record-card text-xs text-muted space-y-2">
          <div><span class="text-text">启用状态：</span>{{ form.enabled ? '已启用' : '未启用' }}</div>
          <div><span class="text-text">最新版本：</span>{{ form.latestVersionName || '未填写' }} / {{ normalizedLatestVersionCode }}</div>
          <div><span class="text-text">最低支持版本：</span>{{ normalizedMinSupportedVersionCode }}</div>
          <div><span class="text-text">下载地址：</span>{{ form.downloadUrl || '未填写' }}</div>
          <div><span class="text-text">更新说明：</span>{{ form.releaseNotes || '未填写' }}</div>
          <div><span class="text-text">强更提示：</span>{{ form.forceUpdateMessage || '未填写' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { showFloat } from '@/composables/useGameLog'
  import {
    fetchAdminAndroidReleaseConfig,
    saveAdminAndroidReleaseConfig,
  } from '@/utils/adminContentApi'
  import { createDefaultAndroidAppReleaseConfig } from '@/utils/androidRelease'
  import type { AndroidAppReleaseConfig } from '@/types/androidRelease'

  const props = defineProps<{
    canLoad: boolean
  }>()

  const form = ref<AndroidAppReleaseConfig>(createDefaultAndroidAppReleaseConfig())
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')

  const normalizedLatestVersionCode = computed(() => Math.max(0, Number(form.value.latestVersionCode) || 0))
  const normalizedMinSupportedVersionCode = computed(() => Math.max(0, Number(form.value.minSupportedVersionCode) || 0))

  const loadConfig = async () => {
    if (!props.canLoad) return
    loading.value = true
    errorMessage.value = ''
    try {
      const result = await fetchAdminAndroidReleaseConfig()
      form.value = { ...result.config }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '读取安卓发布配置失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      loading.value = false
    }
  }

  const saveConfig = async () => {
    if (!props.canLoad) return

    const nextConfig: AndroidAppReleaseConfig = {
      enabled: form.value.enabled === true,
      latestVersionName: String(form.value.latestVersionName || '').trim(),
      latestVersionCode: normalizedLatestVersionCode.value,
      minSupportedVersionCode: normalizedMinSupportedVersionCode.value,
      downloadUrl: String(form.value.downloadUrl || '').trim(),
      releaseNotes: String(form.value.releaseNotes || '').trim(),
      forceUpdateMessage: String(form.value.forceUpdateMessage || '').trim(),
    }

    if (nextConfig.minSupportedVersionCode > nextConfig.latestVersionCode && nextConfig.latestVersionCode > 0) {
      showFloat('最低支持版本号不能高于最新版本号。', 'danger')
      return
    }

    saving.value = true
    errorMessage.value = ''
    try {
      const result = await saveAdminAndroidReleaseConfig(nextConfig)
      form.value = { ...result.config }
      showFloat('安卓发布配置已保存。', 'success')
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '保存安卓发布配置失败'
      showFloat(errorMessage.value, 'danger')
    } finally {
      saving.value = false
    }
  }

  watch(
    () => props.canLoad,
    value => {
      if (value) {
        void loadConfig()
      }
    },
    { immediate: true },
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

  .admin-input,
  .admin-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(14, 18, 28, 0.82);
    border: 1px solid rgba(200, 164, 92, 0.24);
    border-radius: 2px;
    color: rgb(var(--color-text));
    outline: none;
    font-size: 13px;
  }

  .admin-textarea {
    resize: vertical;
    min-height: 120px;
  }

  .admin-record-card {
    border: 1px solid rgba(200, 164, 92, 0.16);
    border-radius: 2px;
    background: rgba(26, 26, 26, 0.16);
    padding: 12px;
  }

  .admin-tip-card {
    border: 1px solid rgba(200, 164, 92, 0.18);
    border-radius: 2px;
    background: rgba(200, 164, 92, 0.08);
    padding: 10px 12px;
  }

  :deep(.btn-primary) {
    background: rgba(200, 164, 92, 0.92);
    color: rgb(var(--color-bg));
    border-color: rgba(200, 164, 92, 0.92);
  }
</style>
