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
import { CONSOLE_CREDIT_UPDATED_EVENT, fetchAiAssistantConfig } from '@/utils/taoyuanAiApi'

const defaultProjectCreditMessage =
  '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186'
const projectCreditUrlPattern = /(https?:\/\/[^\s，。,！？；;'"）】]+)/u

let projectCreditMessage = defaultProjectCreditMessage
let lastLoggedRouteKey = ''

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
    const config = await fetchAiAssistantConfig()
    const nextMessage = String(config.consoleCreditMessage || '').trim()
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

router.afterEach((to) => {
  logProjectCredit(to.fullPath)
})

const bootstrap = async () => {
  installApiFetchBridge()
  await Promise.all([initCurrentAccount(), loadProjectCreditMessage()])

  const app = createApp(App)
  const pinia = createPinia()

  // 为 setup store 添加 $reset() 支持（Pinia 默认仅 option store 支持 $reset）
  // 使用 JSON 深拷贝而非 structuredClone，因为后者无法处理 Vue 的 reactive Proxy
  pinia.use(({ store }) => {
    const initialState = JSON.parse(JSON.stringify(toRaw(store.$state)))
    store.$reset = () => {
      store.$patch(($state) => {
        Object.assign($state, JSON.parse(JSON.stringify(initialState)))
      })
    }
  })

  app.use(pinia)
  app.use(router)
  app.mount('#app')

  void router.isReady().then(() => {
    logProjectCredit(router.currentRoute.value.fullPath || '/')
  })
}

void bootstrap()
