<template>
  <RouterView v-slot="{ Component, route: routedRoute }">
    <Transition name="route-fade" mode="out-in">
      <component :is="Component" :key="routedRoute.matched[0]?.path ?? routedRoute.path" />
    </Transition>
  </RouterView>
  <AsyncAppShellGuards v-if="showAppShellGuards" />
  <IdleAiAssistantWidget v-if="showAiAssistantWidget" />
</template>

<script setup lang="ts">
  /*
   * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
   */
  import { RouterView } from 'vue-router'
  import { useRoute } from 'vue-router'
  import { defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'

  const AsyncAppShellGuards = defineAsyncComponent(() => import('@/components/game/AppShellGuards.vue'))
  const IdleAiAssistantWidget = defineAsyncComponent(() => import('@/components/game/AiAssistantWidget.vue'))

  const route = useRoute()
  const showAiAssistantWidget = ref(false)
  const showAppShellGuards = ref(false)
  let aiAssistantIdleHandle: number | null = null
  let aiAssistantTimeoutHandle: number | null = null

  const clearAiAssistantSchedule = () => {
    if (typeof window !== 'undefined') {
      if (aiAssistantIdleHandle !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(aiAssistantIdleHandle)
      }
      if (aiAssistantTimeoutHandle !== null) {
        window.clearTimeout(aiAssistantTimeoutHandle)
      }
    }
    aiAssistantIdleHandle = null
    aiAssistantTimeoutHandle = null
  }

  const mountAiAssistantWhenIdle = () => {
    if (showAiAssistantWidget.value) return
    if (typeof window === 'undefined') {
      showAiAssistantWidget.value = true
      return
    }

    const activateWidget = () => {
      showAiAssistantWidget.value = true
      aiAssistantIdleHandle = null
      aiAssistantTimeoutHandle = null
    }

    if (typeof window.requestIdleCallback === 'function') {
      aiAssistantIdleHandle = window.requestIdleCallback(() => {
        activateWidget()
      }, { timeout: 1500 })
      return
    }

    aiAssistantTimeoutHandle = window.setTimeout(() => {
      activateWidget()
    }, 250)
  }

  const syncAppShellLayout = () => {
    if (typeof document === 'undefined') return
    const appRoot = document.getElementById('app')
    if (!appRoot) return
    const isAdminRoute = route.path.startsWith('/admin')
    appRoot.classList.toggle('app-shell--admin', isAdminRoute)
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

    showAppShellGuards.value = true
    mountAiAssistantWhenIdle()
    syncAppShellLayout()
  })

  onBeforeUnmount(() => {
    clearAiAssistantSchedule()
    if (typeof document === 'undefined') return
    document.getElementById('app')?.classList.remove('app-shell--admin')
  })
</script>
