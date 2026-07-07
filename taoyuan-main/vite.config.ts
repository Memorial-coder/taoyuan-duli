import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'node:url'
import legacy from '@vitejs/plugin-legacy'

const configDirname = dirname(fileURLToPath(import.meta.url))

const matchesSourceModule = (normalizedId: string, paths: string[]) =>
  paths.some(path => normalizedId.endsWith(path))

const createManualChunkName = (id: string) => {
  const normalizedId = id.replace(/\\/g, '/')

  if (
    normalizedId.includes('/node_modules/vue/')
    || normalizedId.includes('/node_modules/vue-router/')
    || normalizedId.includes('/node_modules/pinia/')
  ) {
    return 'vendor-core'
  }

  if (normalizedId.includes('/node_modules/@capacitor/')) {
    return 'vendor-capacitor'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/utils/accountStorage.ts',
    '/src/utils/apiClient.ts'
  ])) {
    return 'runtime-account'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/composables/useAudio.ts'
  ])) {
    return 'runtime-audio'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/timeConstants.ts'
  ])) {
    return 'data-time'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/stores/useGameStore.ts',
    '/src/stores/gameStoreAccess.ts'
  ])) {
    return 'store-game-core'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/stores/useInventoryStore.ts',
    '/src/utils/inventoryCapacity.ts',
    '/src/utils/inventoryUseRules.ts',
    '/src/utils/durability.ts',
    '/src/composables/useDurability.ts'
  ])) {
    return 'store-inventory'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/stores/useSettingsStore.ts',
    '/src/data/systemFlags.ts',
    '/src/data/themes.ts',
    '/src/data/keyboardShortcuts.ts',
    '/src/data/balance/lateGameBalance.ts'
  ])) {
    return 'store-settings'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/items.ts'
  ])) {
    return 'data-items'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/cropUseProfiles.ts',
    '/src/data/petFeeds.ts'
  ])) {
    return 'data-crop-use'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/itemLinkage.ts',
    '/src/data/processedItemGroups.ts'
  ])) {
    return 'data-item-linkage'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/weapons.ts',
    '/src/data/rings.ts',
    '/src/data/hats.ts',
    '/src/data/shoes.ts',
    '/src/data/trinkets.ts',
    '/src/data/equipmentSets.ts',
    '/src/data/equipmentAccessories.ts',
    '/src/data/toolEnchantments.ts',
    '/src/data/equipmentEnchantments.ts',
    '/src/data/forgeAffixes.ts'
  ])) {
    return 'data-equipment'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/mine.ts',
    '/src/data/quarry.ts'
  ])) {
    return 'data-mining'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/animals.ts',
    '/src/data/bookseller.ts',
    '/src/data/hiddenNpcs.ts',
    '/src/data/mysteryBoxes.ts',
    '/src/data/npcs.ts',
    '/src/data/potential.ts',
    '/src/data/prizeTickets.ts',
    '/src/data/rewardTickets.ts',
    '/src/data/villageProjects.ts',
    '/src/data/wallet.ts',
    '/src/data/weeklyBudgets.ts'
  ])) {
    return 'data-world'
  }

  if (matchesSourceModule(normalizedId, [
    '/src/data/glossary.ts',
    '/src/data/itemEncyclopedia.ts'
  ])) {
    return 'data-glossary'
  }

  return undefined
}

/** Dev-only：WebDAV 反向代理，绕过浏览器 CORS */
const webdavProxy = (): Plugin => ({
  name: 'webdav-proxy',
  configureServer(server) {
    server.middlewares.use('/__webdav', async (req, res) => {
      const targetUrl = req.headers['x-webdav-url'] as string | undefined
      if (!targetUrl) {
        res.statusCode = 400
        res.end('Missing x-webdav-url header')
        return
      }
      try {
        const url = new URL(targetUrl)
        const mod = url.protocol === 'https:' ? await import('node:https') : await import('node:http')
        const fwdHeaders: Record<string, string> = {}
        for (const [k, v] of Object.entries(req.headers)) {
          if (['x-webdav-url', 'host', 'origin', 'referer', 'connection'].includes(k)) continue
          if (typeof v === 'string') fwdHeaders[k] = v
        }
        fwdHeaders.host = url.host
        const proxyReq = mod.request(url, { method: req.method, headers: fwdHeaders }, (proxyRes) => {
          // 剥离 WWW-Authenticate 防止浏览器弹出原生认证对话框
          const respHeaders = { ...proxyRes.headers }
          delete respHeaders['www-authenticate']
          res.writeHead(proxyRes.statusCode!, respHeaders)
          proxyRes.pipe(res)
        })
        proxyReq.on('error', () => {
          res.statusCode = 502
          res.end('Proxy error')
        })
        req.pipe(proxyReq)
      } catch {
        res.statusCode = 500
        res.end('Internal proxy error')
      }
    })
  }
})

export default defineConfig({
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4013',
        changeOrigin: true,
        ws: true
      }
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4013',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return createManualChunkName(id)
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none'
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          comments: false
        }
      }
    }),
    legacy({
      targets: ['Chrome >= 51', 'Android >= 7'],
      modernPolyfills: true
    }),
    webdavProxy()
  ],
  resolve: {
    alias: {
      '@': resolve(configDirname, 'src')
    }
  }
})
