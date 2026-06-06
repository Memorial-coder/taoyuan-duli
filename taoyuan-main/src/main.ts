/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
import { createApp, toRaw } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from './App.vue'
import './app.css'
import { initCurrentAccount } from '@/utils/accountStorage'
import { installApiFetchBridge } from '@/utils/apiClient'

const defaultProjectCreditMessage =
  '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186'
const projectCreditUrlPattern = /(https?:\/\/[^\s，。,！？；;'"）】]+)/u
const CONSOLE_CREDIT_UPDATED_EVENT = 'taoyuan-console-credit-updated'

let projectCreditMessage = defaultProjectCreditMessage
let lastLoggedRouteKey = ''

const markBootstrapStage = (name: string) => {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return
  }

  performance.mark(name)
}

const getProjectConsoleLogger = () => {
  if (typeof globalThis === 'undefined') {
    return null
  }

  const consoleValue = Reflect.get(globalThis, 'console')
  if (!consoleValue || typeof consoleValue !== 'object') {
    return null
  }

  const logValue = Reflect.get(consoleValue as object, 'log')
  return typeof logValue === 'function'
    ? (logValue as (...args: unknown[]) => void).bind(consoleValue)
    : null
}

const getProjectCreditLogArgs = (message: string) => {
  const normalizedMessage = message.trim()
  if (!normalizedMessage) {
    return []
  }

  const urlMatch = normalizedMessage.match(projectCreditUrlPattern)
  if (!urlMatch || typeof urlMatch.index !== 'number') {
    return [normalizedMessage]
  }

  const matchedUrl = urlMatch[0]
  const prefix = normalizedMessage.slice(0, urlMatch.index).trim()
  const suffix = normalizedMessage.slice(urlMatch.index + matchedUrl.length).trim()

  return [prefix, matchedUrl, suffix].filter((segment): segment is string => segment.length > 0)
}

const loadProjectCreditMessage = async () => {
  try {
    const response = await fetch('/api/taoyuan/ai/config', { credentials: 'include' })
    const data = await response.json().catch(() => null)
    const config = data?.ok ? data?.config : null
    const nextMessage = String(config?.consoleCreditMessage || config?.console_credit_message || '').trim()
    if (nextMessage) {
      projectCreditMessage = nextMessage
    }
  } catch {
    projectCreditMessage = defaultProjectCreditMessage
  }
}

const handleProjectCreditMessageUpdated = (event: Event) => {
  if (!(event instanceof CustomEvent)) {
    return
  }

  const nextMessage = String(event.detail?.message || '').trim()
  if (nextMessage) {
    projectCreditMessage = nextMessage
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(CONSOLE_CREDIT_UPDATED_EVENT, handleProjectCreditMessageUpdated)
}

const logProjectCredit = (routeKey: string) => {
  if (!routeKey || routeKey === lastLoggedRouteKey) {
    return
  }

  const log = getProjectConsoleLogger()
  if (!log) {
    return
  }

  lastLoggedRouteKey = routeKey
  const logArgs = getProjectCreditLogArgs(projectCreditMessage)
  if (logArgs.length === 0) {
    return
  }
  log(...logArgs)
}

const cloneInitialPiniaState = (state: unknown) => {
  const seen = new WeakSet<object>()
  const json = JSON.stringify(toRaw(state), (_key, value) => {
    if (value && typeof value === 'object') {
      if (seen.has(value)) return undefined
      seen.add(value)
    }
    return value
  })
  return JSON.parse(json || '{}') as Record<string, unknown>
}

router.afterEach((to) => {
  logProjectCredit(to.fullPath)
})

const bootstrap = async () => {
  markBootstrapStage('bootstrap-start')
  installApiFetchBridge()

  const app = createApp(App)
  const pinia = createPinia()

  // 为 setup store 添加 $reset() 支持（Pinia 默认仅 option store 支持 $reset）
  // 使用 JSON 深拷贝而非 structuredClone，因为后者无法处理 Vue 的 reactive Proxy
  pinia.use(({ store }) => {
    const initialState = cloneInitialPiniaState(store.$state)
    store.$reset = () => {
      store.$patch(($state) => {
        Object.assign($state, cloneInitialPiniaState(initialState))
      })
    }
  })

  app.use(pinia)
  app.use(router)
  markBootstrapStage('before-app-mount')
  app.mount('#app')
  markBootstrapStage('after-app-mount')

  void initCurrentAccount().finally(() => {
    markBootstrapStage('account-context-ready')
  })

  void loadProjectCreditMessage().finally(() => {
    markBootstrapStage('credit-config-ready')
  })

  void router.isReady().then(() => {
    logProjectCredit(router.currentRoute.value.fullPath || '/')
  })
}

void bootstrap()
