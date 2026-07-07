#!/usr/bin/env node
/* global console, process, URL, PerformanceObserver, requestAnimationFrame, performance, document, window */

import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const frontendRoot = path.resolve(repoRoot, 'taoyuan-main')
const requireFromFrontend = createRequire(path.join(frontendRoot, 'package.json'))
const { chromium } = requireFromFrontend('@playwright/test')

const BASE_URL = normalizeBaseUrl(process.env.BASE_URL || 'https://taoyuanxiang.ymzcc.com')
const HEADLESS = readBool(process.env.HEADLESS, true)
const CONCURRENCY = Math.max(1, Math.floor(readNumber(process.env.PLAYTEST_CONCURRENCY, 1)))
const STAGE_LABEL = String(process.env.PLAYTEST_STAGE_LABEL || `${CONCURRENCY} browser users`).trim()
const ACTION_SETTLE_MS = readNumber(process.env.ACTION_SETTLE_MS, 450)
const ROUTE_SETTLE_MS = readNumber(process.env.ROUTE_SETTLE_MS, 1500)
const NAVIGATION_TIMEOUT_MS = readNumber(process.env.NAVIGATION_TIMEOUT_MS, 90000)
const MAX_CLICKS_PER_STEP = Math.max(0, Math.floor(readNumber(process.env.MAX_CLICKS_PER_STEP, 8)))
const CLEAR_CACHE = readBool(process.env.CLEAR_BROWSER_CACHE, true)
const OUT_DIR = path.resolve(
  repoRoot,
  process.env.OUT_DIR || path.join('docs', 'perf', `taoyuan-heavy-playtest-${timestampForPath()}`),
)
const K6_SUMMARY_JSON = process.env.K6_SUMMARY_JSON ? path.resolve(process.env.K6_SUMMARY_JSON) : ''
const SERVER_METRICS_DIR = process.env.SERVER_METRICS_DIR ? path.resolve(process.env.SERVER_METRICS_DIR) : ''
const CHROMIUM_HOST_RESOLVER_RULES = String(process.env.CHROMIUM_HOST_RESOLVER_RULES || '').trim()

const assetProbePaths = [
  '/item/item-icon-manifest.json',
  '/crop/crop-asset-manifest.json',
  '/npc/npc-portrait-manifest.json',
  '/asset_fish_boss/fish-boss-asset-manifest.json',
]

const groupPlans = {
  A: [
    {
      label: 'farm-cultivation',
      title: '种地/开垦/收获',
      route: '/game/farm',
      actionTexts: ['背包', '开垦', '翻地', '清理', '播种', '浇水', '施肥', '收获', '保存'],
      scroll: true,
    },
    {
      label: 'shop-buy-sell',
      title: '商店购买与出售',
      route: '/game/shop',
      actionTexts: ['种子', '材料', '食材', '工具', '购买', '出售', '确认', '背包'],
      scroll: true,
    },
    {
      label: 'inventory-after-farm',
      title: '背包栏加载',
      route: '/game/inventory',
      actionTexts: ['全部', '种子', '材料', '食物', '作物', '矿石', '排序', '出售', '使用'],
      scroll: true,
    },
  ],
  B: [
    {
      label: 'workshop-processing',
      title: '制造/加工',
      route: '/game/workshop',
      actionTexts: ['配方', '搜索', '材料', '制作', '加工', '队列', '领取', '保存'],
      scroll: true,
    },
    {
      label: 'cooking',
      title: '烹饪',
      route: '/game/cooking',
      actionTexts: ['菜谱', '分类', '搜索', '详情', '食材', '制作', '背包', '保存'],
      scroll: true,
    },
    {
      label: 'inventory-after-craft',
      title: '背包栏加载',
      route: '/game/inventory',
      actionTexts: ['全部', '材料', '食物', '搜索', '排序', '详情', '使用'],
      scroll: true,
    },
  ],
  C: [
    {
      label: 'mining',
      title: '矿洞/采矿',
      route: '/game/mining',
      actionTexts: ['矿洞', '进入', '挖矿', '拾取', '下一层', '临时背包', '结算', '保存'],
      scroll: true,
    },
    {
      label: 'quarry',
      title: '采石场',
      route: '/game/quarry',
      actionTexts: ['采石', '挖掘', '拾取', '加工', '结算', '保存'],
      scroll: true,
    },
    {
      label: 'inventory-after-mining',
      title: '背包栏加载',
      route: '/game/inventory',
      actionTexts: ['全部', '矿石', '材料', '搜索', '排序', '出售'],
      scroll: true,
    },
  ],
  D: [
    {
      label: 'glossary-assets-cold',
      title: '百科/数字资产冷缓存',
      route: '/game/glossary',
      actionTexts: ['物品', 'NPC', '作物', '鱼', '搜索', '详情'],
      scroll: true,
      assetProbe: 'reload',
    },
    {
      label: 'museum-assets',
      title: '图鉴/博物馆资源',
      route: '/game/museum',
      actionTexts: ['物品', '作物', '鱼类', '详情', '捐赠'],
      scroll: true,
      assetProbe: 'default',
    },
    {
      label: 'online-mail-social',
      title: '在线/邮箱/庄园/社交',
      route: '/game/mail',
      actionTexts: ['收件箱', '详情', '已读', '返回'],
      scroll: true,
    },
    {
      label: 'online-manor-social',
      title: '在线/庄园/社交',
      route: '/game/online/manor',
      actionTexts: ['个人资料', '发现', '好友', '关系', '收藏', '热门', '访问'],
      scroll: true,
    },
  ],
  E: [
    { label: 'mixed-farm', title: '混合跳转-农田', route: '/game/farm', actionTexts: ['背包', '播种', '浇水', '收获'], scroll: true },
    { label: 'mixed-inventory', title: '混合跳转-背包', route: '/game/inventory', actionTexts: ['全部', '种子', '材料', '搜索', '排序'], scroll: true },
    { label: 'mixed-shop', title: '混合跳转-商店', route: '/game/shop', actionTexts: ['购买', '出售', '材料', '食材'], scroll: true },
    { label: 'mixed-workshop', title: '混合跳转-制造', route: '/game/workshop', actionTexts: ['配方', '制作', '队列'], scroll: true },
    { label: 'mixed-cooking', title: '混合跳转-烹饪', route: '/game/cooking', actionTexts: ['菜谱', '制作', '食材'], scroll: true },
    { label: 'mixed-mining', title: '混合跳转-矿洞', route: '/game/mining', actionTexts: ['进入', '挖矿', '结算'], scroll: true },
    { label: 'mixed-glossary', title: '混合跳转-百科', route: '/game/glossary', actionTexts: ['物品', 'NPC', '作物', '搜索'], scroll: true, assetProbe: 'default' },
    { label: 'mixed-online', title: '混合跳转-在线', route: '/game/online', actionTexts: ['资料', '发现', '好友', '庄园'], scroll: true },
  ],
}

function normalizeBaseUrl(raw) {
  const parsed = new URL(String(raw || '').trim() || 'https://taoyuanxiang.ymzcc.com')
  parsed.hash = ''
  parsed.search = ''
  return parsed.toString().replace(/\/+$/, '')
}

function readBool(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase())
}

function readNumber(raw, fallback) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function readUsers() {
  const rawJson = process.env.USERS_JSON
    || (process.env.USERS_JSON_FILE ? await readFile(path.resolve(process.env.USERS_JSON_FILE), 'utf8') : '')
  if (rawJson.trim()) {
    const parsed = JSON.parse(rawJson)
    if (!Array.isArray(parsed)) throw new Error('USERS_JSON must be an array')
    return parsed
      .map(entry => ({
        username: String(entry?.username || '').trim(),
        password: String(entry?.password || '').trim(),
      }))
      .filter(entry => entry.username && entry.password)
  }

  const sharedPassword = String(process.env.TAOYUAN_TEST_PASSWORD || '').trim()
  if (!sharedPassword) return []
  return Array.from({ length: 100 }, (_, index) => {
    const username = `test${String(index + 1).padStart(4, '0')}`
    return { username, password: sharedPassword }
  })
}

function groupForUserIndex(index) {
  if (index < 20) return 'A'
  if (index < 40) return 'B'
  if (index < 60) return 'C'
  if (index < 80) return 'D'
  return 'E'
}

function selectStageUsers(users, count) {
  if (count >= users.length) {
    return users.map((user, userIndex) => ({ user, userIndex }))
  }
  const selected = []
  const groupSize = Math.ceil(users.length / 5)
  let offset = 0
  while (selected.length < count && offset < groupSize) {
    for (let group = 0; group < 5 && selected.length < count; group += 1) {
      const userIndex = group * groupSize + offset
      if (userIndex < users.length && users[userIndex]) {
        selected.push({ user: users[userIndex], userIndex })
      }
    }
    offset += 1
  }
  return selected
}

function routeUrl(routePath) {
  return `${BASE_URL}/#${routePath.startsWith('/') ? routePath : `/${routePath}`}`
}

function sameOriginUrl(rawUrl) {
  try {
    return new URL(rawUrl).origin === new URL(BASE_URL).origin
  } catch {
    return false
  }
}

function classifyUrl(rawUrl) {
  try {
    const pathname = new URL(rawUrl).pathname
    if (pathname.startsWith('/api/')) return 'api'
    if (
      pathname.startsWith('/assets/')
      || pathname.startsWith('/item/')
      || pathname.startsWith('/crop/')
      || pathname.startsWith('/npc/')
      || pathname.startsWith('/asset_fish_boss/')
      || pathname.endsWith('.js')
      || pathname.endsWith('.css')
      || pathname.endsWith('.json')
      || pathname.endsWith('.woff2')
    ) return 'static'
    return 'document'
  } catch {
    return 'unknown'
  }
}

function normalizedEndpoint(method, rawUrl) {
  try {
    const url = new URL(rawUrl)
    const normalizedPath = url.pathname
      .replace(/\/\d+(?=\/|$)/g, '/:id')
      .replace(/\/ann_[a-z0-9_]+(?=\/|$)/gi, '/:id')
      .replace(/\/[a-f0-9-]{16,}(?=\/|$)/gi, '/:id')
    return `${String(method || 'GET').toUpperCase()} ${normalizedPath}`
  } catch {
    return `${String(method || 'GET').toUpperCase()} ${rawUrl}`
  }
}

function percentile(values, p) {
  const valid = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b)
  if (!valid.length) return 0
  const index = Math.min(valid.length - 1, Math.ceil((p / 100) * valid.length) - 1)
  return valid[index]
}

function avg(values) {
  const valid = values.filter(value => Number.isFinite(value))
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0
}

function round(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : 0
}

function formatMs(value) {
  return `${round(value, 0)}ms`
}

function formatMb(value) {
  return `${round(value, 2)} MB`
}

function formatBytes(value) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = Number(value) || 0
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${round(size, unit === 0 ? 0 : 2)} ${units[unit]}`
}

function installProbeScript() {
  const state = {
    startedAt: performance.now(),
    longTasks: [],
    frameDeltas: [],
    clickLatencies: [],
  }

  const trim = (items, limit) => {
    while (items.length > limit) items.shift()
  }

  window.__taoyuanPerfProbe = {
    reset() {
      state.startedAt = performance.now()
      state.longTasks = []
      state.frameDeltas = []
      state.clickLatencies = []
      try {
        performance.clearResourceTimings()
      } catch {
        /* noop */
      }
    },
    snapshot() {
      const now = performance.now()
      const fpsValues = state.frameDeltas
        .filter(delta => delta > 0)
        .map(delta => 1000 / delta)
        .filter(value => Number.isFinite(value) && value > 0 && value <= 240)
      const resources = performance.getEntriesByType('resource')
        .map(entry => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize || 0,
          encodedBodySize: entry.encodedBodySize || 0,
          initiatorType: entry.initiatorType,
        }))
      const largestResource = resources
        .slice()
        .sort((left, right) => (right.duration || 0) - (left.duration || 0))[0] || null
      return {
        elapsedMs: now - state.startedAt,
        longTasks: state.longTasks.slice(),
        longTaskCount: state.longTasks.length,
        maxLongTaskMs: Math.max(0, ...state.longTasks.map(entry => entry.duration || 0)),
        fpsMin: fpsValues.length ? Math.min(...fpsValues) : 0,
        fpsAvg: fpsValues.length ? fpsValues.reduce((sum, value) => sum + value, 0) / fpsValues.length : 0,
        clickLatencies: state.clickLatencies.slice(),
        jsHeapUsedMb: performance.memory?.usedJSHeapSize ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0,
        resourceCount: resources.length,
        largestResourceMs: largestResource?.duration || 0,
        largestResourceName: largestResource?.name || '',
        resources,
      }
    },
  }

  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        state.longTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
          name: entry.name,
        })
      }
      trim(state.longTasks, 1000)
    }).observe({ type: 'longtask', buffered: true })
  } catch {
    /* unsupported */
  }

  let lastFrameAt = performance.now()
  const sampleFrame = now => {
    const delta = now - lastFrameAt
    if (delta > 0 && delta < 5000) state.frameDeltas.push(delta)
    trim(state.frameDeltas, 3000)
    lastFrameAt = now
    requestAnimationFrame(sampleFrame)
  }
  requestAnimationFrame(sampleFrame)

  document.addEventListener('click', () => {
    const startedAt = performance.now()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        state.clickLatencies.push(performance.now() - startedAt)
        trim(state.clickLatencies, 1000)
      })
    })
  }, true)
}

async function launchBrowser() {
  const launchOptions = {
    headless: HEADLESS,
    ...(CHROMIUM_HOST_RESOLVER_RULES
      ? { args: [`--host-resolver-rules=${CHROMIUM_HOST_RESOLVER_RULES}`] }
      : {}),
  }

  try {
    return await chromium.launch(launchOptions)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('Executable doesn\'t exist') && !message.includes('Invalid file descriptor')) throw error
    return chromium.launch({ channel: 'chrome', ...launchOptions })
  }
}

function attachRecorders(page, session) {
  page.on('request', request => {
    session.requestStartedAt.set(request, Date.now())
  })

  page.on('response', response => {
    const request = response.request()
    const startedAt = session.requestStartedAt.get(request) || Date.now()
    const url = response.url()
    if (!sameOriginUrl(url)) return
    const headers = response.headers()
    session.events.push({
      worker: session.workerId,
      username: session.username,
      group: session.group,
      step: session.currentStep,
      kind: classifyUrl(url),
      method: request.method(),
      url,
      endpoint: normalizedEndpoint(request.method(), url),
      resourceType: request.resourceType(),
      status: response.status(),
      durationMs: Date.now() - startedAt,
      contentLength: Number(headers['content-length'] || 0) || 0,
      cacheControl: headers['cache-control'] || '',
      contentEncoding: headers['content-encoding'] || '',
      fromServiceWorker: response.fromServiceWorker(),
    })
  })

  page.on('requestfailed', request => {
    if (!sameOriginUrl(request.url())) return
    session.requestFailures.push({
      worker: session.workerId,
      username: session.username,
      group: session.group,
      step: session.currentStep,
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown',
    })
  })

  page.on('console', message => {
    if (message.type() === 'error') {
      session.consoleErrors.push({
        worker: session.workerId,
        username: session.username,
        group: session.group,
        step: session.currentStep,
        text: message.text(),
      })
    }
  })

  page.on('pageerror', error => {
    session.pageErrors.push({
      worker: session.workerId,
      username: session.username,
      group: session.group,
      step: session.currentStep,
      text: error instanceof Error ? error.message : String(error),
    })
  })

  page.on('websocket', socket => {
    const entry = {
      worker: session.workerId,
      username: session.username,
      group: session.group,
      step: session.currentStep,
      url: socket.url(),
      openedAt: new Date().toISOString(),
      sent: 0,
      received: 0,
      closed: false,
    }
    session.websockets.push(entry)
    socket.on('framesent', () => { entry.sent += 1 })
    socket.on('framereceived', () => { entry.received += 1 })
    socket.on('close', () => { entry.closed = true })
  })
}

function recordSyntheticApi(session, step, method, endpoint, status, durationMs) {
  session.events.push({
    worker: session.workerId,
    username: session.username,
    group: session.group,
    step,
    kind: 'api',
    method,
    url: `${BASE_URL}${endpoint}`,
    endpoint: normalizedEndpoint(method, `${BASE_URL}${endpoint}`),
    resourceType: 'fetch',
    status,
    durationMs,
    contentLength: 0,
    cacheControl: '',
    contentEncoding: '',
    fromServiceWorker: false,
  })
}

async function requestAndRecord(session, context, method, endpoint, options = {}) {
  const startedAt = Date.now()
  const response = method === 'POST'
    ? await context.request.post(`${BASE_URL}${endpoint}`, options)
    : await context.request.get(`${BASE_URL}${endpoint}`, options)
  recordSyntheticApi(session, 'login-and-load-save', method, endpoint, response.status(), Date.now() - startedAt)
  return response
}

async function loginAndLoadSave(session, context, user) {
  session.currentStep = 'login-and-load-save'
  const login = await requestAndRecord(session, context, 'POST', '/api/login', {
    data: { username: user.username, password: user.password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!login.ok()) throw new Error(`${user.username} login failed: ${login.status()}`)

  const me = await requestAndRecord(session, context, 'GET', '/api/me')
  if (!me.ok()) throw new Error(`${user.username} /api/me failed: ${me.status()}`)

  await requestAndRecord(session, context, 'GET', '/api/taoyuan/save/slots').catch(() => null)
  await requestAndRecord(session, context, 'GET', '/api/taoyuan/save/0').catch(() => null)
}

async function settlePage(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: NAVIGATION_TIMEOUT_MS }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: Math.max(3000, ROUTE_SETTLE_MS) }).catch(() => {})
  await wait(ROUTE_SETTLE_MS)
}

async function resetProbe(page) {
  await page.evaluate(() => window.__taoyuanPerfProbe?.reset?.()).catch(() => {})
}

async function probeSnapshot(page) {
  return await page.evaluate(() => window.__taoyuanPerfProbe?.snapshot?.() || null).catch(() => null)
}

async function clickByText(page, session, text) {
  const startedAt = Date.now()
  const pattern = new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const locators = [
    page.getByRole('button', { name: pattern }).first(),
    page.locator('button').filter({ hasText: pattern }).first(),
    page.getByText(pattern).first(),
  ]
  for (const locator of locators) {
    try {
      await locator.waitFor({ state: 'visible', timeout: 900 })
      await locator.click({ timeout: 1500 })
      await wait(ACTION_SETTLE_MS)
      session.operations.push({
        worker: session.workerId,
        username: session.username,
        group: session.group,
        step: session.currentStep,
        action: text,
        ok: true,
        durationMs: Date.now() - startedAt,
      })
      return true
    } catch {
      /* try next locator */
    }
  }
  session.operations.push({
    worker: session.workerId,
    username: session.username,
    group: session.group,
    step: session.currentStep,
    action: text,
    ok: false,
    durationMs: Date.now() - startedAt,
  })
  return false
}

async function scrollStress(page, session) {
  const startedAt = Date.now()
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.wheel(0, 900)
    await wait(120)
  }
  for (let index = 0; index < 2; index += 1) {
    await page.mouse.wheel(0, -700)
    await wait(120)
  }
  session.operations.push({
    worker: session.workerId,
    username: session.username,
    group: session.group,
    step: session.currentStep,
    action: 'scroll-stress',
    ok: true,
    durationMs: Date.now() - startedAt,
  })
}

async function runAssetProbe(page, session, cacheMode) {
  const startedAt = Date.now()
  const results = await page.evaluate(async ({ paths, cache }) => {
    const output = []
    for (const item of paths) {
      const started = performance.now()
      try {
        const response = await fetch(item, { cache })
        const buffer = await response.arrayBuffer()
        output.push({
          path: item,
          status: response.status,
          bytes: buffer.byteLength,
          durationMs: performance.now() - started,
          cacheControl: response.headers.get('cache-control') || '',
          contentEncoding: response.headers.get('content-encoding') || '',
        })
      } catch (error) {
        output.push({
          path: item,
          status: 0,
          bytes: 0,
          durationMs: performance.now() - started,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return output
  }, {
    paths: assetProbePaths,
    cache: cacheMode === 'reload' ? 'reload' : 'default',
  })
  for (const result of results) {
    session.assetProbes.push({
      worker: session.workerId,
      username: session.username,
      group: session.group,
      step: session.currentStep,
      cacheMode,
      ...result,
    })
  }
  session.operations.push({
    worker: session.workerId,
    username: session.username,
    group: session.group,
    step: session.currentStep,
    action: `asset-probe:${cacheMode}`,
    ok: results.every(item => item.status >= 200 && item.status < 400),
    durationMs: Date.now() - startedAt,
  })
}

async function runStep(page, session, step) {
  session.currentStep = `${session.group}:${step.label}`
  await resetProbe(page)
  const beforeEventCount = session.events.length
  const beforeWsCount = session.websockets.length
  const startedAt = Date.now()

  await page.goto(routeUrl(step.route), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await settlePage(page)
  const routeReadyMs = Date.now() - startedAt

  if (step.scroll) await scrollStress(page, session)
  let clicks = 0
  for (const text of step.actionTexts || []) {
    if (clicks >= MAX_CLICKS_PER_STEP) break
    await clickByText(page, session, text)
    clicks += 1
  }
  if (step.assetProbe) {
    await runAssetProbe(page, session, step.assetProbe)
  }

  const probe = await probeSnapshot(page)
  const stepEvents = session.events.slice(beforeEventCount)
  const apiEvents = stepEvents.filter(event => event.kind === 'api')
  const staticEvents = stepEvents.filter(event => event.kind === 'static')
  const failedResponses = stepEvents.filter(event => event.status >= 500 || event.status === 0)
  const clientErrors = stepEvents.filter(event => event.status >= 400 && event.status < 500)
  const clickLatencies = probe?.clickLatencies || []

  session.steps.push({
    worker: session.workerId,
    username: session.username,
    group: session.group,
    label: step.label,
    title: step.title,
    route: step.route,
    routeReadyMs,
    totalStepMs: Date.now() - startedAt,
    apiRequests: apiEvents.length,
    staticRequests: staticEvents.length,
    apiP95Ms: percentile(apiEvents.map(event => event.durationMs), 95),
    apiP99Ms: percentile(apiEvents.map(event => event.durationMs), 99),
    apiMaxMs: Math.max(0, ...apiEvents.map(event => event.durationMs)),
    failedResponses: failedResponses.length,
    clientErrors: clientErrors.length,
    websocketOpens: session.websockets.length - beforeWsCount,
    longTaskCount: probe?.longTaskCount || 0,
    maxLongTaskMs: probe?.maxLongTaskMs || 0,
    fpsMin: probe?.fpsMin || 0,
    fpsAvg: probe?.fpsAvg || 0,
    jsHeapUsedMb: probe?.jsHeapUsedMb || 0,
    resourceCount: probe?.resourceCount || 0,
    largestResourceMs: probe?.largestResourceMs || 0,
    largestResourceName: probe?.largestResourceName || '',
    clickLatencyP95Ms: percentile(clickLatencies, 95),
    clickLatencyMaxMs: Math.max(0, ...clickLatencies),
  })
}

async function runWorker(browser, user, workerId, userIndex) {
  const group = groupForUserIndex(userIndex)
  const session = {
    workerId,
    username: user.username,
    group,
    currentStep: 'bootstrap',
    requestStartedAt: new Map(),
    events: [],
    requestFailures: [],
    consoleErrors: [],
    pageErrors: [],
    websockets: [],
    steps: [],
    operations: [],
    assetProbes: [],
  }

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  })
  await context.addInitScript(installProbeScript)
  if (CLEAR_CACHE) await context.clearCookies().catch(() => {})
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)
  attachRecorders(page, session)

  try {
    await loginAndLoadSave(session, context, user)
    for (const step of groupPlans[group]) {
      await runStep(page, session, step)
    }
  } catch (error) {
    session.pageErrors.push({
      worker: session.workerId,
      username: session.username,
      group: session.group,
      step: session.currentStep,
      text: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await context.close().catch(() => {})
  }

  return session
}

function groupEndpointStats(events, kind = 'api') {
  const map = new Map()
  for (const event of events.filter(item => item.kind === kind)) {
    const current = map.get(event.endpoint) || {
      endpoint: event.endpoint,
      count: 0,
      statuses: {},
      durations: [],
      steps: new Set(),
      contentLength: 0,
      contentEncodings: new Set(),
      cacheControls: new Set(),
    }
    current.count += 1
    current.statuses[event.status] = (current.statuses[event.status] || 0) + 1
    current.durations.push(event.durationMs)
    current.steps.add(event.step)
    current.contentLength = Math.max(current.contentLength, event.contentLength || 0)
    if (event.contentEncoding) current.contentEncodings.add(event.contentEncoding)
    if (event.cacheControl) current.cacheControls.add(event.cacheControl)
    map.set(event.endpoint, current)
  }
  return [...map.values()].map(item => ({
    endpoint: item.endpoint,
    count: item.count,
    statuses: item.statuses,
    avgMs: round(avg(item.durations)),
    p95Ms: round(percentile(item.durations, 95)),
    p99Ms: round(percentile(item.durations, 99)),
    maxMs: round(Math.max(0, ...item.durations)),
    steps: [...item.steps].sort(),
    contentLength: item.contentLength,
    contentEncodings: [...item.contentEncodings].sort(),
    cacheControls: [...item.cacheControls].sort(),
    error5xxRate: round(item.count ? Object.entries(item.statuses)
      .filter(([status]) => Number(status) >= 500)
      .reduce((sum, [, count]) => sum + count, 0) / item.count : 0, 4),
  }))
}

function loadExternalSummary(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function categoryMatch(step, patterns) {
  const text = `${step.label} ${step.title} ${step.route}`.toLowerCase()
  return patterns.some(pattern => text.includes(pattern))
}

function summarizeCategory(steps, patterns) {
  const matched = steps.filter(step => categoryMatch(step, patterns))
  if (!matched.length) return '未覆盖到该类步骤。'
  const worstReady = matched.slice().sort((a, b) => b.routeReadyMs - a.routeReadyMs)[0]
  const worstLongTask = matched.slice().sort((a, b) => b.maxLongTaskMs - a.maxLongTaskMs)[0]
  const worstFps = matched.filter(item => item.fpsMin > 0).slice().sort((a, b) => a.fpsMin - b.fpsMin)[0]
  return [
    `最慢页面：${worstReady.title} / ${worstReady.username}，可交互约 ${formatMs(worstReady.routeReadyMs)}。`,
    `最大 long task：${worstLongTask.title}，${formatMs(worstLongTask.maxLongTaskMs)}。`,
    worstFps ? `最低 FPS：${worstFps.title}，${round(worstFps.fpsMin, 1)}。` : 'FPS 样本不足。',
  ].join(' ')
}

function inferCapacity(steps, apiEndpoints, requestFailures, pageErrors) {
  const routeP95 = percentile(steps.map(step => step.routeReadyMs), 95)
  const apiP99 = percentile(apiEndpoints.map(endpoint => endpoint.p99Ms), 99)
  const has5xx = apiEndpoints.some(endpoint => endpoint.error5xxRate > 0)
  const severeLongTask = Math.max(0, ...steps.map(step => step.maxLongTaskMs)) > 300
  const fpsBad = steps.some(step => step.fpsMin > 0 && step.fpsMin < 30)
  const passed = !has5xx && requestFailures.length === 0 && pageErrors.length === 0 && routeP95 < 1500 && apiP99 < 3000 && !fpsBad
  return {
    passed,
    routeP95,
    apiP99,
    has5xx,
    severeLongTask,
    fpsBad,
  }
}

function renderReport(report) {
  const steps = report.steps
  const apiEndpoints = report.apiEndpoints
  const topPages = steps.slice().sort((a, b) =>
    b.routeReadyMs - a.routeReadyMs || b.maxLongTaskMs - a.maxLongTaskMs
  ).slice(0, 10)
  const topOperations = report.operations.slice().sort((a, b) => b.durationMs - a.durationMs).slice(0, 10)
  const topApi = apiEndpoints.slice().sort((a, b) => b.p95Ms - a.p95Ms || b.count - a.count).slice(0, 10)
  const topLongTasks = steps.slice().sort((a, b) => b.maxLongTaskMs - a.maxLongTaskMs).slice(0, 10)
  const topAssets = report.staticResources.slice().sort((a, b) =>
    b.p95Ms - a.p95Ms || b.contentLength - a.contentLength
  ).slice(0, 12)
  const topAssetProbes = report.assetProbes.slice().sort((a, b) => b.durationMs - a.durationMs).slice(0, 12)

  const capacityText = report.capacity.passed
    ? `${report.concurrency} 并发在本轮 Playwright 重度游玩脚本下通过基础阈值`
    : `本轮 ${report.concurrency} 并发未证明稳定`
  const firstBad = steps.find(step =>
    step.routeReadyMs > 1500 ||
    step.clickLatencyP95Ms > 300 ||
    step.maxLongTaskMs > 300 ||
    (step.fpsMin > 0 && step.fpsMin < 30) ||
    step.failedResponses > 0
  )

  const rows = {
    pages: topPages.map(item =>
      `| ${item.title} | ${item.username} | ${item.group} | \`${item.route}\` | ${formatMs(item.routeReadyMs)} | ${formatMs(item.maxLongTaskMs)} | ${round(item.fpsMin, 1)} | ${formatMb(item.jsHeapUsedMb)} |`
    ),
    operations: topOperations.map(item =>
      `| ${item.action} | ${item.username} | ${item.group} | ${item.step} | ${item.ok ? 'yes' : 'no'} | ${formatMs(item.durationMs)} |`
    ),
    api: topApi.map(item =>
      `| \`${item.endpoint}\` | ${item.count} | ${JSON.stringify(item.statuses)} | ${formatMs(item.avgMs)} | ${formatMs(item.p95Ms)} | ${formatMs(item.p99Ms)} | ${formatMs(item.maxMs)} |`
    ),
    longTasks: topLongTasks.map(item =>
      `| ${item.title} | ${item.username} | ${item.group} | \`${item.route}\` | ${item.longTaskCount} | ${formatMs(item.maxLongTaskMs)} | ${formatMs(item.clickLatencyP95Ms)} | ${round(item.fpsMin, 1)} |`
    ),
    assets: topAssets.map(item =>
      `| \`${item.endpoint}\` | ${item.count} | ${formatBytes(item.contentLength)} | ${item.contentEncodings.join(', ') || '-'} | ${formatMs(item.p95Ms)} | ${item.cacheControls[0] || '-'} |`
    ),
    assetProbes: topAssetProbes.map(item =>
      `| \`${item.path}\` | ${item.step} | ${item.cacheMode} | ${item.status} | ${formatBytes(item.bytes)} | ${formatMs(item.durationMs)} | ${item.contentEncoding || '-'} |`
    ),
  }

  return [
    '# 桃源乡重度游玩卡顿测试报告',
    '',
    `1. 测试时间：${report.generatedAt}`,
    `2. 版本 / 镜像 / 前端 build hash：${report.version.image || '未提供'} / ${report.version.frontendBuild || '由当前部署决定'}`,
    `3. 最大稳定并发人数：${capacityText}`,
    `4. 首个明显卡顿阶段：${firstBad ? `${firstBad.title} / ${firstBad.username} / ${firstBad.group}` : '本轮未触发明显卡顿阈值'}`,
    '',
    '## 5. 最卡页面 Top 10',
    '',
    '| 页面 | 账号 | 分组 | 路由 | 可交互耗时 | 最大 long task | 最低 FPS | JS heap |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |',
    ...(rows.pages.length ? rows.pages : ['| - | - | - | - | - | - | - | - |']),
    '',
    '## 6. 最卡操作 Top 10',
    '',
    '| 操作 | 账号 | 分组 | 步骤 | 命中 | 耗时 |',
    '| --- | --- | --- | --- | --- | ---: |',
    ...(rows.operations.length ? rows.operations : ['| - | - | - | - | - | - |']),
    '',
    '## 7. 最慢 API Top 10',
    '',
    '| API | Count | Statuses | Avg | P95 | P99 | Max |',
    '| --- | ---: | --- | ---: | ---: | ---: | ---: |',
    ...(rows.api.length ? rows.api : ['| - | - | - | - | - | - | - |']),
    '',
    '## 8. 最大 Long Task Top 10',
    '',
    '| 页面 | 账号 | 分组 | 路由 | Long task 数 | 最大 long task | 点击 P95 | 最低 FPS |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |',
    ...(rows.longTasks.length ? rows.longTasks : ['| - | - | - | - | - | - | - | - |']),
    '',
    '## 9. 背包加载问题',
    '',
    summarizeCategory(steps, ['inventory', '背包']),
    '',
    '## 10. 百科数字资产加载问题',
    '',
    summarizeCategory(steps, ['glossary', 'museum', '百科', '图鉴']),
    '',
    '| 资源 | 步骤 | 缓存模式 | 状态 | 大小 | 耗时 | 编码 |',
    '| --- | --- | --- | ---: | ---: | ---: | --- |',
    ...(rows.assetProbes.length ? rows.assetProbes : ['| - | - | - | - | - | - | - |']),
    '',
    '### 静态资源响应 Top',
    '',
    '| 资源 | Count | Max size | Encoding | P95 | Cache-Control |',
    '| --- | ---: | ---: | --- | ---: | --- |',
    ...(rows.assets.length ? rows.assets : ['| - | - | - | - | - | - |']),
    '',
    '## 11. 农田/开垦/购买/收获瓶颈',
    '',
    summarizeCategory(steps, ['farm', 'shop', 'cultivation', 'buy', 'sell', '农田', '商店']),
    '',
    '## 12. 制造/加工/烹饪瓶颈',
    '',
    summarizeCategory(steps, ['workshop', 'processing', 'cooking', '制造', '加工', '烹饪']),
    '',
    '## 13. 矿洞/采矿/结算瓶颈',
    '',
    summarizeCategory(steps, ['mining', 'quarry', '矿洞', '采矿', '采石']),
    '',
    '## 14. 在线/邮箱/庄园/社交瓶颈',
    '',
    summarizeCategory(steps, ['online', 'mail', 'manor', 'social', '邮箱', '庄园', '社交']),
    '',
    '## 15. CPU/内存/网络/日志证据',
    '',
    `- Playwright 浏览器并发：${report.concurrency}`,
    `- 请求失败：${report.requestFailures.length}`,
    `- 控制台错误：${report.consoleErrors.length}`,
    `- 页面错误：${report.pageErrors.length}`,
    `- WebSocket：打开 ${report.websockets.length} 个，关闭 ${report.websockets.filter(item => item.closed).length} 个`,
    `- k6 汇总：${report.external.k6SummaryJson ? `已关联 ${report.external.k6SummaryJson}` : '未提供'}`,
    `- 服务端采集：${report.external.serverMetricsDir || '未提供'}`,
    '',
    '## 16. 结论',
    '',
    [
      report.capacity.has5xx ? '后端出现 5xx/失败响应。' : '本轮未观察到后端 5xx。',
      report.capacity.routeP95 > 1500 ? `页面可交互 P95 ${formatMs(report.capacity.routeP95)}，存在前端/资源加载卡顿。` : `页面可交互 P95 ${formatMs(report.capacity.routeP95)}。`,
      report.capacity.severeLongTask ? '存在超过 300ms 的严重主线程 long task。' : '未观察到超过 300ms 的严重 long task。',
      report.capacity.fpsBad ? '存在 FPS 低于 30 的严重体感卡顿。' : '未观察到 FPS 低于 30 的持续样本。',
    ].join(' '),
    '',
    '## 17. 下一轮优化优先级',
    '',
    '1. 优先处理 Top 页面和 Top long task 中重复出现的路由。',
    '2. 若百科/图鉴资源仍慢，继续拆 manifest、图片懒加载并检查 CDN/OpenResty 缓存命中。',
    '3. 若背包或农田操作 long task 高，优先做虚拟滚动、分类索引缓存和局部状态更新。',
    '4. 若 k6 同步显示 API P99 超阈值，继续拆文件型存储热点并考虑多 worker/独立 API 服务。',
    '',
  ].join('\n')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const users = await readUsers()
  if (!users.length) {
    throw new Error('No users provided. Set USERS_JSON_FILE, USERS_JSON, or TAOYUAN_TEST_PASSWORD.')
  }
  const selectedUsers = selectStageUsers(users, CONCURRENCY)
  const browser = await launchBrowser()
  let sessions = []
  try {
    sessions = await Promise.all(selectedUsers.map(({ user, userIndex }, index) => runWorker(browser, user, index + 1, userIndex)))
  } finally {
    await browser.close().catch(() => {})
  }

  const events = sessions.flatMap(session => session.events)
  const steps = sessions.flatMap(session => session.steps)
  const operations = sessions.flatMap(session => session.operations)
  const requestFailures = sessions.flatMap(session => session.requestFailures)
  const consoleErrors = sessions.flatMap(session => session.consoleErrors)
  const pageErrors = sessions.flatMap(session => session.pageErrors)
  const websockets = sessions.flatMap(session => session.websockets)
  const assetProbes = sessions.flatMap(session => session.assetProbes)
  const apiEndpoints = groupEndpointStats(events, 'api')
  const staticResources = groupEndpointStats(events, 'static')
  const capacity = inferCapacity(steps, apiEndpoints, requestFailures, pageErrors)
  const k6Summary = loadExternalSummary(K6_SUMMARY_JSON)

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    stageLabel: STAGE_LABEL,
    concurrency: selectedUsers.length,
    selectedUsers: selectedUsers.map(({ user, userIndex }) => ({
      username: user.username,
      userIndex,
      group: groupForUserIndex(userIndex),
    })),
    version: {
      image: process.env.IMAGE_TAG || '',
      frontendBuild: process.env.FRONTEND_BUILD_HASH || '',
    },
    config: {
      headless: HEADLESS,
      clearCache: CLEAR_CACHE,
      actionSettleMs: ACTION_SETTLE_MS,
      routeSettleMs: ROUTE_SETTLE_MS,
      maxClicksPerStep: MAX_CLICKS_PER_STEP,
    },
    steps,
    operations,
    events,
    apiEndpoints,
    staticResources,
    requestFailures,
    consoleErrors,
    pageErrors,
    websockets,
    assetProbes,
    capacity,
    external: {
      k6SummaryJson: K6_SUMMARY_JSON,
      k6Summary,
      serverMetricsDir: SERVER_METRICS_DIR,
    },
  }

  const jsonPath = path.join(OUT_DIR, 'taoyuan-heavy-playtest-report.json')
  const mdPath = path.join(OUT_DIR, 'taoyuan-heavy-playtest-report.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(mdPath, renderReport(report), 'utf8')
  console.log(`Saved heavy playtest JSON: ${jsonPath}`)
  console.log(`Saved heavy playtest report: ${mdPath}`)
  console.log(`Users: ${selectedUsers.length}, steps: ${steps.length}, API endpoints: ${apiEndpoints.length}, page errors: ${pageErrors.length}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
