<template>
  <RouterView />
  <AiAssistantWidget />

  <Transition name="panel-fade">
    <div
      v-if="showAndroidUpdateDialog"
      class="game-modal-overlay fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
      @click.self="androidUpdateMode === 'optional' ? dismissOptionalAndroidUpdate() : undefined"
    >
      <div class="game-panel max-h-[88vh] w-full max-w-lg overflow-y-auto">
        <div class="space-y-3">
          <div class="space-y-1 text-center">
            <p class="text-sm text-accent">{{ androidUpdateMode === 'required' ? '安卓版本需要更新' : '发现新版本' }}</p>
            <p class="text-xs text-muted">
              当前版本 {{ currentAndroidVersionName || '未知版本' }} / {{ currentAndroidVersionCode || 0 }}
            </p>
          </div>

          <div class="rounded-xs border border-accent/20 bg-bg/20 px-3 py-2 text-xs leading-6">
            <div>最新版本：{{ androidReleaseConfig.latestVersionName || '未配置' }} / {{ androidReleaseConfig.latestVersionCode || 0 }}</div>
            <div>最低支持版本：{{ androidReleaseConfig.minSupportedVersionCode || 0 }}</div>
          </div>

          <div class="text-xs leading-6" :class="androidUpdateMode === 'required' ? 'text-danger' : 'text-muted'">
            {{
              androidUpdateMode === 'required'
                ? (androidReleaseConfig.forceUpdateMessage || '当前安卓版本过旧，请先更新到最新安装包后再继续游玩。')
                : '检测到有新的测试版 APK，可前往下载更新。'
            }}
          </div>

          <div v-if="androidReleaseConfig.releaseNotes" class="space-y-2">
            <p class="text-xs text-accent">更新说明</p>
            <div class="rounded-xs border border-accent/20 bg-bg/20 px-3 py-2 text-xs text-muted whitespace-pre-wrap leading-6">
              {{ androidReleaseConfig.releaseNotes }}
            </div>
          </div>

          <div
            v-if="androidUpdateMode === 'required' && saveStore.pendingServerSlots.length > 0"
            class="rounded-xs border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning leading-6"
          >
            检测到 {{ saveStore.pendingServerSlots.length }} 个待同步服务端存档。更新前可先尝试同步，避免云端进度缺失。
          </div>

          <div
            v-if="androidUpdateMode === 'required' && localExportSlots.length > 0"
            class="space-y-2"
          >
            <p class="text-xs text-accent">本地存档导出</p>
            <div class="space-y-2">
              <button
                v-for="slot in localExportSlots"
                :key="slot.slot"
                class="btn w-full justify-between text-left"
                @click="exportLocalSave(slot.slot)"
              >
                <span>导出存档 {{ slot.slot + 1 }}</span>
                <span class="text-[11px] text-muted">
                  {{ slot.playerName ?? '未命名' }} · 第{{ slot.year }}年 {{ slot.season ?? '' }} 第{{ slot.day }}天
                </span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-if="androidUpdateMode === 'required' && saveStore.pendingServerSlots.length > 0"
              class="btn"
              :disabled="syncingRequiredUpdateSaves"
              @click="syncRequiredUpdateSaves"
            >
              {{ syncingRequiredUpdateSaves ? '同步中...' : '先同步待上传云档' }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="!androidReleaseConfig.downloadUrl"
              @click="openAndroidUpdateDownload"
            >
              去下载新 APK
            </button>
            <button v-if="androidUpdateMode === 'optional'" class="btn" @click="dismissOptionalAndroidUpdate">
              稍后再说
            </button>
            <button v-if="androidUpdateMode === 'required'" class="btn btn-danger" @click="exitApp">
              退出
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- APK 退出确认弹窗 -->
  <Transition name="panel-fade">
    <div
      v-if="showExitConfirm"
      class="game-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
      @click.self="showExitConfirm = false"
    >
      <div class="game-panel max-w-xs w-full text-center">
        <p class="text-sm text-accent mb-3">确定要退出游戏吗？</p>
        <p class="text-xs text-muted mb-4">未保存的进度将会丢失。</p>
        <div class="flex justify-center space-x-3">
          <button class="btn" @click="showExitConfirm = false">取消</button>
          <button class="btn btn-danger" @click="exitApp">退出</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  /*
   * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
   */
  import { RouterView } from 'vue-router'
  import { useRoute, useRouter } from 'vue-router'
  import AiAssistantWidget from '@/components/game/AiAssistantWidget.vue'
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { Capacitor } from '@capacitor/core'
  import { App as CapApp } from '@capacitor/app'
  import { Browser } from '@capacitor/browser'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { createDefaultAndroidAppReleaseConfig, normalizeAndroidAppReleaseConfig } from '@/utils/androidRelease'
  import { parseJsonSafe } from '@/utils/protectedApi'
  import { showFloat } from '@/composables/useGameLog'

  const route = useRoute()
  const router = useRouter()
  const saveStore = useSaveStore()
  const showExitConfirm = ref(false)
  const androidReleaseConfig = ref(createDefaultAndroidAppReleaseConfig())
  const androidUpdateMode = ref<'hidden' | 'optional' | 'required'>('hidden')
  const currentAndroidVersionName = ref('')
  const currentAndroidVersionCode = ref(0)
  const syncingRequiredUpdateSaves = ref(false)
  const localExportSlots = ref<Awaited<ReturnType<typeof saveStore.getSlots>>>([])
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let backButtonListener: { remove: () => Promise<void> } | null = null

  const ANDROID_UPDATE_DISMISS_KEY_PREFIX = 'taoyuan_android_update_dismissed_'
  const isAndroidNative = Capacitor.getPlatform() === 'android'

  const showAndroidUpdateDialog = computed(() => isAndroidNative && androidUpdateMode.value !== 'hidden' && androidReleaseConfig.value.enabled)

  const buildAndroidUpdateDismissKey = (versionCode: number) => `${ANDROID_UPDATE_DISMISS_KEY_PREFIX}${versionCode}`

  const isOptionalUpdateDismissed = (versionCode: number): boolean => {
    if (!versionCode) return false
    try {
      return localStorage.getItem(buildAndroidUpdateDismissKey(versionCode)) === '1'
    } catch {
      return false
    }
  }

  const dismissOptionalAndroidUpdate = () => {
    if (androidUpdateMode.value !== 'optional') return
    const versionCode = androidReleaseConfig.value.latestVersionCode
    if (versionCode) {
      try {
        localStorage.setItem(buildAndroidUpdateDismissKey(versionCode), '1')
      } catch {
        /* ignore */
      }
    }
    androidUpdateMode.value = 'hidden'
  }

  const syncAppShellLayout = () => {
    if (typeof document === 'undefined') return
    const appRoot = document.getElementById('app')
    if (!appRoot) return
    const isAdminRoute = route.path.startsWith('/admin')
    appRoot.classList.toggle('app-shell--admin', isAdminRoute)
  }

  const exitApp = () => {
    void CapApp.exitApp()
  }

  const handleInAppBackNavigation = (): boolean => {
    const routeName = typeof route.name === 'string' ? route.name : ''
    if (routeName === 'guide-book') {
      if (window.history.length > 1) {
        void router.back()
      } else {
        void router.push({ name: 'guide' })
      }
      return true
    }

    if (routeName === 'guide') {
      if (window.history.length > 1) {
        void router.back()
      } else {
        void router.push({ name: 'menu' })
      }
      return true
    }

    return false
  }

  const refreshLocalExportSlots = async () => {
    if (!isAndroidNative || androidUpdateMode.value !== 'required') {
      localExportSlots.value = []
      return
    }
    localExportSlots.value = (await saveStore.getSlots('local')).filter(slot => slot.exists)
  }

  const applyAndroidReleaseGate = async (configValue: unknown) => {
    const normalizedConfig = normalizeAndroidAppReleaseConfig(configValue)
    androidReleaseConfig.value = normalizedConfig

    if (!isAndroidNative || !normalizedConfig.enabled) {
      androidUpdateMode.value = 'hidden'
      localExportSlots.value = []
      return
    }

    try {
      const appInfo = await CapApp.getInfo()
      currentAndroidVersionName.value = String(appInfo.version || '').trim()
      currentAndroidVersionCode.value = Math.max(0, Number.parseInt(String(appInfo.build || ''), 10) || 0)
    } catch {
      currentAndroidVersionName.value = ''
      currentAndroidVersionCode.value = 0
    }

    if (
      normalizedConfig.minSupportedVersionCode > 0
      && currentAndroidVersionCode.value > 0
      && currentAndroidVersionCode.value < normalizedConfig.minSupportedVersionCode
    ) {
      androidUpdateMode.value = 'required'
      await refreshLocalExportSlots()
      return
    }

    if (
      normalizedConfig.latestVersionCode > 0
      && currentAndroidVersionCode.value > 0
      && currentAndroidVersionCode.value < normalizedConfig.latestVersionCode
      && !isOptionalUpdateDismissed(normalizedConfig.latestVersionCode)
    ) {
      androidUpdateMode.value = 'optional'
      localExportSlots.value = []
      return
    }

    androidUpdateMode.value = 'hidden'
    localExportSlots.value = []
  }

  const refreshAndroidReleaseGate = async () => {
    if (!isAndroidNative) return
    try {
      const response = await fetch('/api/public-config', { credentials: 'include' })
      const data = await parseJsonSafe(response)
      await applyAndroidReleaseGate(data?.android_app)
    } catch {
      if (androidUpdateMode.value === 'required') {
        await refreshLocalExportSlots()
      }
    }
  }

  const syncPendingServerSavesAndRefreshGate = async () => {
    await saveStore.syncPendingServerSaves()
    await refreshAndroidReleaseGate()
  }

  const syncRequiredUpdateSaves = async () => {
    syncingRequiredUpdateSaves.value = true
    try {
      const result = await saveStore.syncPendingServerSaves()
      if (result.syncedSlots.length > 0) {
        showFloat('待同步服务端存档已补传。', 'success')
      } else if (result.failedSlots.length > 0) {
        showFloat(saveStore.lastServerSyncMessage || '服务端存档同步失败，请稍后重试。', 'danger')
      } else {
        showFloat('当前没有待同步的服务端存档。', 'accent')
      }
    } finally {
      syncingRequiredUpdateSaves.value = false
      await refreshAndroidReleaseGate()
    }
  }

  const exportLocalSave = async (slot: number) => {
    if (!(await saveStore.exportSave(slot, 'local'))) {
      showFloat('导出本地存档失败。', 'danger')
      return
    }
    showFloat(`本地存档 ${slot + 1} 已导出。`, 'success')
  }

  const openAndroidUpdateDownload = async () => {
    const downloadUrl = androidReleaseConfig.value.downloadUrl
    if (!downloadUrl) {
      showFloat('当前未配置安卓安装包下载地址。', 'danger')
      return
    }
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: downloadUrl })
      } else if (typeof window !== 'undefined') {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(downloadUrl)
      }
    }
  }

  watch(
    () => route.path,
    () => {
      syncAppShellLayout()
    },
    { immediate: true }
  )

  onMounted(() => {
    if (!import.meta.env.DEV) {
      document.body.classList.add('select-none')
    }

    syncAppShellLayout()
    void syncPendingServerSavesAndRefreshGate()

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState !== 'visible') return
        void syncPendingServerSavesAndRefreshGate()
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }

    if (typeof window !== 'undefined') {
      onlineHandler = () => {
        void syncPendingServerSavesAndRefreshGate()
      }
      window.addEventListener('online', onlineHandler)
    }

    // Capacitor Android 返回键拦截
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('backButton', () => {
        if (showAndroidUpdateDialog.value && androidUpdateMode.value === 'required') {
          return
        }
        if (handleInAppBackNavigation()) return
        if (showExitConfirm.value) {
          showExitConfirm.value = false
        } else {
          showExitConfirm.value = true
        }
      })
        .then(handle => {
          backButtonListener = handle
        })
    }
  })

  onBeforeUnmount(() => {
    if (typeof document !== 'undefined' && visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
    if (typeof window !== 'undefined' && onlineHandler) {
      window.removeEventListener('online', onlineHandler)
      onlineHandler = null
    }
    if (backButtonListener) {
      void backButtonListener.remove()
      backButtonListener = null
    }
    if (typeof document === 'undefined') return
    document.getElementById('app')?.classList.remove('app-shell--admin')
  })
</script>
