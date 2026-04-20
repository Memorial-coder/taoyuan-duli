<template>
  <RouterView />
  <AiAssistantWidget />
  <!-- APK 退出确认弹窗 -->
  <Transition name="panel-fade">
    <div
      v-if="showExitConfirm"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
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
  import { ref, onBeforeUnmount, onMounted, watch } from 'vue'
  import { Capacitor } from '@capacitor/core'
  import { App as CapApp } from '@capacitor/app'
  import { useSaveStore } from '@/stores/useSaveStore'

  const route = useRoute()
  const router = useRouter()
  const saveStore = useSaveStore()
  const showExitConfirm = ref(false)
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let backButtonListener: { remove: () => Promise<void> } | null = null

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
    void saveStore.syncPendingServerSaves()

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState !== 'visible') return
        void saveStore.syncPendingServerSaves()
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }

    if (typeof window !== 'undefined') {
      onlineHandler = () => {
        void saveStore.syncPendingServerSaves()
      }
      window.addEventListener('online', onlineHandler)
    }

    // Capacitor Android 返回键拦截
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('backButton', () => {
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
