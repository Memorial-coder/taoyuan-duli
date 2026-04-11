import { ref, computed } from 'vue'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { parseSaveData } from '@/stores/useSaveStore'
import {
  buildScopedSingleKey,
  buildScopedStorageKey,
  getCurrentAccountKey,
  migrateLegacyScopedSlots,
  migrateLegacySingleValue
} from '@/utils/accountStorage'

const LEGACY_STORAGE_KEY = 'taoyuanxiang_webdav'
const LEGACY_SAVE_KEY_PREFIX = 'taoyuanxiang_save_'
const MAX_SLOTS = 3

const getStorageKey = (): string => {
  const scoped = buildScopedSingleKey(`${LEGACY_STORAGE_KEY}_`)
  migrateLegacySingleValue(LEGACY_STORAGE_KEY, scoped)
  return scoped
}

const getSaveKeyPrefix = (): string => buildScopedStorageKey(LEGACY_SAVE_KEY_PREFIX)

const getSaveKey = (slot: number): string => {
  const scopedPrefix = getSaveKeyPrefix()
  migrateLegacyScopedSlots(LEGACY_SAVE_KEY_PREFIX, scopedPrefix, MAX_SLOTS)
  return `${scopedPrefix}${slot}`
}

export interface WebdavConfig {
  enabled: boolean
  serverUrl: string
  path: string
  username: string
  password: string
}

const defaultConfig = (): WebdavConfig => ({
  enabled: false,
  serverUrl: '',
  path: '',
  username: '',
  password: ''
})

const loadConfig = (): WebdavConfig => {
  try {
    const raw = localStorage.getItem(getStorageKey())
    if (raw) return { ...defaultConfig(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return defaultConfig()
}

/** 持久化配置 */
const config = ref<WebdavConfig>(loadConfig())
const testStatus = ref<'idle' | 'testing' | 'success' | 'failed'>('idle')
const testError = ref('')
const traceLogs = ref<string[]>([])
const TRACE_LOG_LIMIT = 80

/** 检测是否在 Electron 环境中 */
const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')

/** 当前时间（HH:mm:ss） */
const nowLabel = (): string => {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** WebDAV 调试日志（用于安卓环境排查，避免依赖 console） */
const pushTrace = (msg: string) => {
  traceLogs.value.push(`[${nowLabel()}] ${msg}`)
  if (traceLogs.value.length > TRACE_LOG_LIMIT) {
    traceLogs.value.splice(0, traceLogs.value.length - TRACE_LOG_LIMIT)
  }
}

const clearTrace = () => {
  traceLogs.value = []
}

const formatUrlForLog = (url: string): string => {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
  }
}

const extractErrorMessage = (e: unknown): string => {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const message = (e as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
    try {
      return JSON.stringify(e)
    } catch {
      return String(e)
    }
  }
  return String(e)
}

const normalizeUserError = (msg: string): string => {
  // 安卓原生 HttpURLConnection 在部分失败分支只返回 URL 文本，可读性很差
  if (/^https?:\/\//i.test(msg.trim())) {
    return '请求失败（服务器拒绝或路径不存在）'
  }
  return msg
}

/** 平台自适应 HTTP 请求：原生平台走 CapacitorHttp，dev 走 Vite 代理，Electron/生产 web 直连 */
const webdavFetch = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; data: string }> => {
  const logUrl = formatUrlForLog(url)
  pushTrace(`请求 ${method} ${logUrl}`)
  try {
    // 原生平台（Capacitor Android/iOS）：CapacitorHttp 绕过 CORS
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.request({ url, method, headers, data: body })
      pushTrace(`响应 ${method} ${res.status}`)
      return { status: res.status, data: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) }
    }
    // Dev 环境（非 Electron）：走 Vite 代理中间件绕过 CORS
    if (import.meta.env.DEV && !isElectron) {
      const res = await fetch('/__webdav', {
        method,
        headers: { ...headers, 'x-webdav-url': url },
        body
      })
      pushTrace(`响应 ${method} ${res.status}`)
      return { status: res.status, data: await res.text() }
    }
    // Electron（主进程已注入 CORS 头）/ 生产 web（同源部署）：直连
    // credentials: 'omit' 防止浏览器弹出原生认证对话框（认证由 Authorization 头自行处理）
    const res = await fetch(url, { method, headers, body, credentials: 'omit' })
    pushTrace(`响应 ${method} ${res.status}`)
    return { status: res.status, data: await res.text() }
  } catch (e: unknown) {
    const msg = extractErrorMessage(e)
    pushTrace(`异常 ${method} ${msg}`)
    throw e
  }
}

/** 根据 serverUrl 域名返回针对性的路径提示 */
const getPathHint = (serverUrl: string): string => {
  try {
    const host = new URL(serverUrl).hostname.toLowerCase()
    if (host.includes('jianguoyun')) return '坚果云请在「存储路径」中填写已有的文件夹名，如"我的坚果云"。'
    if (host.includes('nextcloud') || serverUrl.includes('/remote.php/dav')) return 'Nextcloud 请在「存储路径」中填写目标文件夹名。'
    if (host.includes('owncloud') || serverUrl.includes('/remote.php/webdav')) return 'ownCloud 请在「存储路径」中填写目标文件夹名。'
  } catch {
    /* ignore */
  }
  return '请在「存储路径」中填写一个已存在的文件夹名。'
}

export const useWebdav = () => {
  const webdavConfig = config
  const webdavTestStatus = testStatus
  const webdavTestError = testError

  const webdavReady = computed(() => config.value.enabled && testStatus.value === 'success')

  const saveConfig = () => {
    localStorage.setItem(getStorageKey(), JSON.stringify(config.value))
  }

  /** 确保 URL 末尾带 / */
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim().replace(/\/+$/, '')
    return trimmed ? trimmed + '/' : ''
  }

  /** 拼接 serverUrl + path 得到完整目录 URL（对路径段做 percent-encode 以支持中文） */
  const fullDirUrl = (): string => {
    const base = normalizeUrl(config.value.serverUrl)
    const sub = config.value.path.trim().replace(/^\/+|\/+$/g, '')
    if (!sub) return base
    const encoded = sub
      .split('/')
      .map(s => encodeURIComponent(s))
      .join('/')
    return base + encoded + '/'
  }

  /** 生成 Basic Auth header */
  const authHeaders = (): Record<string, string> => ({
    Authorization: 'Basic ' + btoa(config.value.username + ':' + config.value.password)
  })

  /** 远程文件路径 */
  const remoteFilePath = (slot: number): string => fullDirUrl() + `taoyuan_save_${getCurrentAccountKey()}_${slot}.tyx`

  /** 根据状态码设置测试错误提示 */
  const setTestErrorByStatus = (status: number, phase?: string) => {
    const prefix = phase ? `${phase}：` : ''
    if (status === 401 || status === 403) {
      testError.value = prefix + '认证失败，请检查用户名和密码'
    } else if (status === 404 || status === 409) {
      testError.value = prefix + '路径不存在。' + getPathHint(config.value.serverUrl)
    } else if (status === 405 || status === 501) {
      testError.value = prefix + '服务器不支持当前 WebDAV 操作'
    } else {
      testError.value = prefix + `服务器返回 ${status}`
    }
    pushTrace(`测试失败 ${prefix}${status}`)
  }

  /** 原生平台连接探测：尝试 PUT 临时文件并在成功后 DELETE */
  const probeNativeWritable = async (dirUrl: string): Promise<{ status: number; error: string }> => {
    // 避免使用点前缀隐藏文件名，一些 WebDAV 服务会拒绝该类文件
    const probeUrl = dirUrl + `taoyuan_probe_${Date.now()}.tyx`
    pushTrace('原生探测：尝试 PUT 临时文件')
    try {
      const putRes = await webdavFetch(
        probeUrl,
        'PUT',
        {
          ...authHeaders(),
          'Content-Type': 'application/octet-stream'
        },
        'probe'
      )
      if (putRes.status >= 200 && putRes.status < 300) {
        try {
          pushTrace('原生探测：PUT 成功，尝试 DELETE 临时文件')
          await webdavFetch(probeUrl, 'DELETE', authHeaders())
        } catch {
          /* 忽略清理失败，避免影响测试结果 */
          pushTrace('原生探测：DELETE 清理失败（忽略）')
        }
      }
      return { status: putRes.status, error: '' }
    } catch (e: unknown) {
      const msg = normalizeUserError(extractErrorMessage(e))
      pushTrace(`原生探测异常：${msg}`)
      return { status: 0, error: msg }
    }
  }

  /** 测试连接：Web/Electron 优先 PROPFIND；原生平台先 HEAD，失败后 fallback 到 PUT+DELETE 探测 */
  const testConnection = async (): Promise<boolean> => {
    clearTrace()
    testStatus.value = 'testing'
    testError.value = ''
    pushTrace(`开始测试连接（platform=${Capacitor.getPlatform()}）`)
    try {
      const base = normalizeUrl(config.value.serverUrl)
      if (!base) {
        testStatus.value = 'failed'
        testError.value = '服务器地址为空'
        pushTrace('失败：服务器地址为空')
        return false
      }
      const url = fullDirUrl()
      const isNative = Capacitor.isNativePlatform()
      pushTrace(`目标目录 ${formatUrlForLog(url)}`)

      if (!isNative) {
        pushTrace('策略：PROPFIND 检测目录')
        const res = await webdavFetch(url, 'PROPFIND', { ...authHeaders(), Depth: '0' })
        // 大多数 WebDAV 返回 207，部分实现可能返回 200
        if (res.status === 207 || res.status === 200) {
          testStatus.value = 'success'
          pushTrace('测试成功')
          return true
        }
        testStatus.value = 'failed'
        setTestErrorByStatus(res.status, 'PROPFIND')
        return false
      }

      // 原生平台跳过 HEAD：Android 上 HEAD 失败时常只抛 URL 文本异常，无法稳定拿到状态码
      pushTrace('策略：PUT 探测目录可写性（安卓跳过 HEAD）')
      const probe = await probeNativeWritable(url)
      if (probe.status >= 200 && probe.status < 300) {
        testStatus.value = 'success'
        pushTrace('测试成功（PUT 探测）')
        return true
      }

      if (probe.status > 0) {
        testStatus.value = 'failed'
        setTestErrorByStatus(probe.status, 'PUT')
        return false
      }

      testStatus.value = 'failed'
      testError.value = probe.error || '连接失败（PUT 探测异常）'
      pushTrace(testError.value)
      return false
    } catch (e: unknown) {
      testStatus.value = 'failed'
      const msg = normalizeUserError(extractErrorMessage(e))
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
        testError.value = '网络错误，请检查地址是否正确'
      } else {
        testError.value = msg || '连接失败'
      }
      pushTrace(`异常失败：${testError.value}`)
      return false
    }
  }

  /** 确保远程目录存在（MKCOL），已存在时 405/409 属正常情况 */
  const ensureDirectory = async (): Promise<void> => {
    // CapacitorHttp 基于 HttpURLConnection，不支持 MKCOL
    if (Capacitor.isNativePlatform()) {
      pushTrace('跳过 MKCOL：原生平台不支持')
      return
    }
    const url = fullDirUrl()
    if (!url) return
    try {
      pushTrace('尝试 MKCOL 创建目录')
      await webdavFetch(url, 'MKCOL', authHeaders())
    } catch {
      /* 忽略：目录创建失败不阻塞上传流程 */
      pushTrace('MKCOL 失败（忽略）')
    }
  }

  /** 上传存档到 WebDAV */
  const uploadSave = async (slot: number): Promise<{ success: boolean; message: string }> => {
    pushTrace(`上传开始 slot=${slot}`)
    const raw = localStorage.getItem(getSaveKey(slot))
    if (!raw) return { success: false, message: '本地存档不存在。' }
    try {
      let res = await webdavFetch(
        remoteFilePath(slot),
        'PUT',
        {
          ...authHeaders(),
          'Content-Type': 'application/octet-stream'
        },
        raw
      )
      // 404 通常是远程目录不存在，Web/Electron 端尝试 MKCOL 创建后重试
      if (res.status === 404 && !Capacitor.isNativePlatform()) {
        await ensureDirectory()
        res = await webdavFetch(
          remoteFilePath(slot),
          'PUT',
          {
            ...authHeaders(),
            'Content-Type': 'application/octet-stream'
          },
          raw
        )
      }
      if (res.status >= 200 && res.status < 300) {
        pushTrace(`上传成功 slot=${slot}`)
        return { success: true, message: `存档 ${slot + 1} 已上传到云端。` }
      }
      if (Capacitor.isNativePlatform() && (res.status === 404 || res.status === 409)) {
        return {
          success: false,
          message: '上传路径无效。Android 端不支持自动建目录，请先在网盘创建该文件夹。' + getPathHint(config.value.serverUrl)
        }
      }
      if (res.status === 404) {
        return { success: false, message: '上传路径无效。' + getPathHint(config.value.serverUrl) }
      }
      pushTrace(`上传失败 slot=${slot} status=${res.status}`)
      return { success: false, message: `上传失败（${res.status}）。` }
    } catch (e: unknown) {
      const msg = normalizeUserError(extractErrorMessage(e))
      pushTrace(`上传异常 slot=${slot} ${msg}`)
      return { success: false, message: `上传失败：${msg}` }
    }
  }

  /** 从 WebDAV 下载存档 */
  const downloadSave = async (slot: number): Promise<{ success: boolean; message: string }> => {
    pushTrace(`下载开始 slot=${slot}`)
    try {
      const res = await webdavFetch(remoteFilePath(slot), 'GET', authHeaders())
      if (res.status === 404) {
        return { success: false, message: `云端不存在存档 ${slot + 1}。` }
      }
      if (res.status < 200 || res.status >= 300) {
        return { success: false, message: `下载失败（${res.status}）。` }
      }
      if (!parseSaveData(res.data)) {
        return { success: false, message: '云端存档数据无效或已损坏。' }
      }
      localStorage.setItem(getSaveKey(slot), res.data)
      pushTrace(`下载成功 slot=${slot}`)
      return { success: true, message: `存档 ${slot + 1} 已从云端下载。` }
    } catch (e: unknown) {
      const msg = normalizeUserError(extractErrorMessage(e))
      pushTrace(`下载异常 slot=${slot} ${msg}`)
      return { success: false, message: `下载失败：${msg}` }
    }
  }

  /** 列出远程存档是否存在 */
  const listRemoteSaves = async (): Promise<{ slot: number; exists: boolean }[]> => {
    pushTrace('开始列出远程存档')
    const results: { slot: number; exists: boolean }[] = []
    const isNative = Capacitor.isNativePlatform()
    for (let i = 0; i < MAX_SLOTS; i++) {
      try {
        // 一些 WebDAV 服务对 HEAD 支持不完整，原生平台改用 GET 判断文件存在
        const method = isNative ? 'GET' : 'HEAD'
        const res = await webdavFetch(remoteFilePath(i), method, authHeaders())
        pushTrace(`远程槽位 slot=${i} status=${res.status}`)
        results.push({ slot: i, exists: res.status >= 200 && res.status < 300 })
      } catch {
        pushTrace(`远程槽位 slot=${i} 请求异常`)
        results.push({ slot: i, exists: false })
      }
    }
    return results
  }

  return {
    webdavConfig,
    webdavTestStatus,
    webdavTestError,
    webdavTraceLogs: traceLogs,
    webdavReady,
    saveConfig,
    clearTrace,
    testConnection,
    uploadSave,
    downloadSave,
    listRemoteSaves
  }
}
