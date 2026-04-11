import { createApp, toRaw } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from './App.vue'
import './app.css'
import { initCurrentAccount } from '@/utils/accountStorage'

const bootstrap = async () => {
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
