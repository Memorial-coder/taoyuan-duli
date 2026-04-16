/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
import { createApp, toRaw } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from './App.vue'
import './app.css'
import { initCurrentAccount } from '@/utils/accountStorage'

const logProjectCredit = () => {
  if (typeof window === 'undefined') {
    return
  }

  const scopedWindow = window as typeof window & {
    __taoyuanProjectCreditLogged__?: boolean
  }

  if (scopedWindow.__taoyuanProjectCreditLogged__) {
    return
  }

  scopedWindow.__taoyuanProjectCreditLogged__ = true
  console.log(
    '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186'
  )
}

const bootstrap = async () => {
  logProjectCredit()
  await initCurrentAccount()

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
}

void bootstrap()
