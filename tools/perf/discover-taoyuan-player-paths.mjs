#!/usr/bin/env node
/* global console, process, URL, URLSearchParams, Headers */

import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
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
const CREATE_LOCAL_SAVE = readBool(process.env.CREATE_LOCAL_SAVE, true)
const FORCE_LOCAL_SAVE_MODE = readBool(process.env.FORCE_LOCAL_SAVE_MODE, true)
const STEP_SETTLE_MS = readNumber(process.env.STEP_SETTLE_MS, 2500)
const NAVIGATION_TIMEOUT_MS = readNumber(process.env.NAVIGATION_TIMEOUT_MS, 90000)
const USERNAME = String(process.env.TAOYUAN_USERNAME || '').trim()
const PASSWORD = String(process.env.TAOYUAN_PASSWORD || '').trim()
const RAW_ROUTES = String(process.env.ROUTES || '').trim()
const OUT_DIR = path.resolve(
  repoRoot,
  process.env.OUT_DIR || path.join('docs', 'perf', `player-path-discovery-${timestampForPath()}`),
)

const defaultRoutes = [
  ['menu', '/'],
  ['hall', '/hall'],
  ['farm', '/game/farm'],
  ['animal', '/game/animal'],
  ['home', '/game/home'],
  ['village', '/game/village'],
  ['shop', '/game/shop'],
  ['forage', '/game/forage'],
  ['fishing', '/game/fishing'],
  ['mining', '/game/mining'],
  ['cooking', '/game/cooking'],
  ['workshop', '/game/workshop'],
  ['inventory', '/game/inventory'],
  ['wallet', '/game/wallet'],
  ['mail', '/game/mail'],
  ['online-center', '/game/online'],
  ['online-manor', '/game/online/manor'],
  ['online-neighbor', '/game/online/neighbor'],
  ['online-orders', '/game/online/orders'],
  ['online-festival', '/game/online/festival'],
  ['online-society', '/game/online/society'],
  ['online-cohabitation', '/game/online/cohabitation'],
]

const routes = RAW_ROUTES
  ? RAW_ROUTES.split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(route => [routeName(route), ensureRoutePath(route)])
  : defaultRoutes

const events = []
const websockets = []
const consoleErrors = []
const pageErrors = []
const requestFailures = []
const requestStartedAt = new Map()
const stepSummaries = []
let currentStep = 'bootstrap'
let browser = null

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim() || 'https://taoyuanxiang.ymzcc.com'
  const parsed = new URL(value)
  parsed.hash = ''
  parsed.search = ''
  return parsed.toString().replace(/\/+$/, '')
}

function readBool(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase())
}

function readNumber(raw, fallback) {
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function routeName(route) {
  return route
    .replace(/^#?\/?/, '')
    .replace(/^game\//, 'game-')
    .replace(/[/?#=&]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'menu'
}

function ensureRoutePath(route) {
  const trimmed = String(route || '').trim()
  if (!trimmed || trimmed === '#/' || trimmed === '/') return '/'
  return trimmed
    .replace(/^#/, '')
    .replace(/^\/?#/, '')
    .replace(/^([^/])/, '/$1')
}

function buildRouteUrl(routePath) {
  return `${BASE_URL}/#${ensureRoutePath(routePath)}`
}

function sameOriginUrl(rawUrl) {
  try {
    const base = new URL(BASE_URL)
    const url = new URL(rawUrl)
    return url.origin === base.origin
  } catch {
    return false
  }
}

function classifyUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)
    const pathName = url.pathname
    if (pathName.startsWith('/api/')) return 'api'
    if (
      pathName.startsWith('/assets/')
      || pathName.startsWith('/item/')
      || pathName.startsWith('/crop/')
      || pathName.startsWith('/npc/')
      || pathName.startsWith('/asset_fish_boss/')
      || pathName.endsWith('.js')
      || pathName.endsWith('.css')
      || pathName.endsWith('.woff2')
      || pathName.endsWith('.json')
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
    const query = new URLSearchParams(url.search)
    const queryKeys = [...new Set([...query.keys()])].sort()
    return `${method.toUpperCase()} ${normalizedPath}${queryKeys.length ? `?${queryKeys.join('&')}` : ''}`
  } catch {
    return `${method.toUpperCase()} ${rawUrl}`
  }
}

function statusBucket(status) {
  if (!status) return 'none'
  if (status >= 200 && status < 300) return '2xx'
  if (status >= 300 && status < 400) return '3xx'
  if (status >= 400 && status < 500) return '4xx'
  if (status >= 500) return '5xx'
  return String(status)
}

function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

function avg(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sanitizeAccountKey(value) {
  const raw = String(value || '').normalize('NFKC').trim()
  if (!raw) return 'guest'
  if (/^[a-z0-9._-]+$/i.test(raw)) return raw.toLocaleLowerCase('zh-CN')
  return encodeURIComponent(raw.toLocaleLowerCase('zh-CN'))
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: HEADLESS })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('Executable doesn\'t exist') && !message.includes('Invalid file descriptor')) throw error
    console.warn('Bundled Chromium unavailable, falling back to system Chrome.')
    return chromium.launch({ channel: 'chrome', headless: HEADLESS })
  }
}

async function loginIfConfigured(context) {
  if (!USERNAME || !PASSWORD) {
    return { loggedIn: false, username: '', csrfToken: '' }
  }

  const loginResponse = await context.request.post(`${BASE_URL}/api/login`, {
    data: {
      username: USERNAME,
      password: PASSWORD,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const loginBody = await loginResponse.json().catch(() => null)
  if (!loginResponse.ok()) {
    throw new Error(`/api/login returned ${loginResponse.status()}: ${loginBody?.msg || 'login failed'}`)
  }

  const meResponse = await context.request.get(`${BASE_URL}/api/me`)
  const meBody = await meResponse.json().catch(() => null)
  if (!meResponse.ok()) {
    throw new Error(`/api/me after login returned ${meResponse.status()}`)
  }

  return {
    loggedIn: true,
    username: String(meBody?.user?.username || USERNAME),
    csrfToken: String(meBody?.csrf_token || loginBody?.csrf_token || ''),
  }
}

async function installLocalSaveGuard(context, accountKey) {
  if (!FORCE_LOCAL_SAVE_MODE) return
  await context.addInitScript(key => {
    try {
      localStorage.setItem('taoyuanxiang_save_mode_guest', 'local')
      if (key) {
        localStorage.setItem('taoyuanxiang_current_account', key)
        localStorage.setItem(`taoyuanxiang_save_mode_${key}`, 'local')
      }
    } catch {
      /* ignore localStorage failures */
    }
  }, accountKey)
}

function attachRecorders(page) {
  page.on('request', request => {
    requestStartedAt.set(request, Date.now())
  })

  page.on('response', response => {
    const request = response.request()
    const startedAt = requestStartedAt.get(request) || Date.now()
    const url = response.url()
    if (!sameOriginUrl(url)) return
    const headers = response.headers()
    const contentLength = Number(headers['content-length'] || 0)
    events.push({
      step: currentStep,
      kind: classifyUrl(url),
      method: request.method(),
      url,
      endpoint: normalizedEndpoint(request.method(), url),
      resourceType: request.resourceType(),
      status: response.status(),
      statusBucket: statusBucket(response.status()),
      durationMs: Date.now() - startedAt,
      contentLength: Number.isFinite(contentLength) ? contentLength : 0,
      fromServiceWorker: response.fromServiceWorker(),
    })
  })

  page.on('requestfailed', request => {
    if (!sameOriginUrl(request.url())) return
    requestFailures.push({
      step: currentStep,
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown',
    })
  })

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push({
        step: currentStep,
        text: message.text(),
      })
    }
  })

  page.on('pageerror', error => {
    pageErrors.push({
      step: currentStep,
      text: error instanceof Error ? error.message : String(error),
    })
  })

  page.on('websocket', socket => {
    const entry = {
      step: currentStep,
      url: socket.url(),
      openedAt: new Date().toISOString(),
      sent: 0,
      received: 0,
      closed: false,
    }
    websockets.push(entry)
    socket.on('framesent', () => {
      entry.sent += 1
    })
    socket.on('framereceived', () => {
      entry.received += 1
    })
    socket.on('close', () => {
      entry.closed = true
    })
  })
}

async function settlePage(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: NAVIGATION_TIMEOUT_MS }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: Math.max(3000, STEP_SETTLE_MS) }).catch(() => {})
  await wait(STEP_SETTLE_MS)
}

async function clickIfVisible(locator, timeout = 5000) {
  try {
    await locator.waitFor({ state: 'visible', timeout })
    await locator.click()
    return true
  } catch {
    return false
  }
}

async function createLocalSave(page) {
  currentStep = 'create-local-save'
  await page.goto(buildRouteUrl('/'), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await settlePage(page)

  const hasGameLayout = await page.getByTestId('game-layout').count().catch(() => 0)
  if (hasGameLayout > 0) return { created: false, reason: 'already in game layout' }

  const newJourneyClicked = await clickIfVisible(page.getByTestId('new-journey-button'), 15000)
  if (!newJourneyClicked) return { created: false, reason: 'new journey button not found' }

  await clickIfVisible(page.getByTestId('privacy-agree-button'), 5000)
  await page.getByTestId('char-name-input').fill('Perf')
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
  await page.getByTestId('game-layout').waitFor({ timeout: 30000 })
  await settlePage(page)
  return { created: true, reason: 'created local slot through UI' }
}

async function visitRoute(page, label, routePath) {
  const before = events.length
  const beforeWs = websockets.length
  currentStep = label
  const startedAt = Date.now()
  await page.goto(buildRouteUrl(routePath), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await settlePage(page)
  const stepEvents = events.slice(before)
  const apiEvents = stepEvents.filter(event => event.kind === 'api')
  const staticEvents = stepEvents.filter(event => event.kind === 'static')
  const durations = apiEvents.map(event => event.durationMs)
  stepSummaries.push({
    label,
    route: routePath,
    finalUrl: page.url(),
    elapsedMs: Date.now() - startedAt,
    apiRequests: apiEvents.length,
    uniqueApiEndpoints: new Set(apiEvents.map(event => event.endpoint)).size,
    staticRequests: staticEvents.length,
    websocketOpens: websockets.length - beforeWs,
    apiP95Ms: Math.round(percentile(durations, 95)),
    apiMaxMs: Math.round(Math.max(0, ...durations)),
    errorResponses: apiEvents.filter(event => event.status >= 500 || event.status === 0).length,
    clientErrors: apiEvents.filter(event => event.status >= 400 && event.status < 500).length,
  })
}

function groupEndpointStats() {
  const grouped = new Map()
  for (const event of events.filter(item => item.kind === 'api')) {
    const existing = grouped.get(event.endpoint) || {
      endpoint: event.endpoint,
      count: 0,
      statuses: {},
      steps: new Set(),
      durations: [],
    }
    existing.count += 1
    existing.statuses[event.status] = (existing.statuses[event.status] || 0) + 1
    existing.steps.add(event.step)
    existing.durations.push(event.durationMs)
    grouped.set(event.endpoint, existing)
  }
  return [...grouped.values()]
    .map(item => ({
      endpoint: item.endpoint,
      count: item.count,
      statuses: item.statuses,
      steps: [...item.steps].sort(),
      avgMs: Math.round(avg(item.durations)),
      p95Ms: Math.round(percentile(item.durations, 95)),
      maxMs: Math.round(Math.max(0, ...item.durations)),
    }))
    .sort((left, right) => right.count - left.count || right.p95Ms - left.p95Ms)
}

function groupStaticStats() {
  const grouped = new Map()
  for (const event of events.filter(item => item.kind === 'static')) {
    const existing = grouped.get(event.endpoint) || {
      endpoint: event.endpoint,
      count: 0,
      contentLength: 0,
      durations: [],
    }
    existing.count += 1
    existing.contentLength = Math.max(existing.contentLength, event.contentLength || 0)
    existing.durations.push(event.durationMs)
    grouped.set(event.endpoint, existing)
  }
  return [...grouped.values()]
    .map(item => ({
      endpoint: item.endpoint,
      count: item.count,
      maxContentLength: item.contentLength,
      avgMs: Math.round(avg(item.durations)),
      p95Ms: Math.round(percentile(item.durations, 95)),
    }))
    .sort((left, right) => right.maxContentLength - left.maxContentLength)
}

function renderMarkdown(report) {
  const endpointRows = report.apiEndpoints.slice(0, 80).map(item =>
    `| \`${item.endpoint}\` | ${item.count} | ${JSON.stringify(item.statuses)} | ${item.avgMs} | ${item.p95Ms} | ${item.maxMs} | ${item.steps.slice(0, 5).join(', ')} |`
  )
  const staticRows = report.staticResources.slice(0, 30).map(item =>
    `| \`${item.endpoint}\` | ${item.count} | ${formatBytes(item.maxContentLength)} | ${item.avgMs} | ${item.p95Ms} |`
  )
  const stepRows = report.steps.map(item =>
    `| ${item.label} | \`${item.route}\` | ${item.elapsedMs} | ${item.apiRequests} | ${item.uniqueApiEndpoints} | ${item.apiP95Ms} | ${item.apiMaxMs} | ${item.clientErrors} | ${item.errorResponses} | ${item.websocketOpens} |`
  )
  const wsRows = report.websockets.map(item =>
    `| ${item.step} | \`${item.url}\` | ${item.sent} | ${item.received} | ${item.closed ? 'yes' : 'no'} |`
  )

  return [
    '# Taoyuan Player Path Discovery',
    '',
    `Generated: ${report.generatedAt}`,
    `Base URL: \`${report.baseUrl}\``,
    `Logged in: ${report.login.loggedIn ? `yes (${report.login.username})` : 'no'}`,
    `Local save guard: ${report.localSave.forceLocalSaveMode ? 'enabled' : 'disabled'}`,
    `Local save: ${report.localSave.created ? 'created' : 'not created'} (${report.localSave.reason})`,
    '',
    '## Route Coverage',
    '',
    '| Step | Route | Elapsed ms | API requests | Unique APIs | API P95 ms | API max ms | 4xx | 5xx/failed | WS opens |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...stepRows,
    '',
    '## API Endpoints',
    '',
    '| Endpoint | Count | Statuses | Avg ms | P95 ms | Max ms | Seen in steps |',
    '| --- | ---: | --- | ---: | ---: | ---: | --- |',
    ...endpointRows,
    '',
    '## Largest Static Resources',
    '',
    '| Resource | Count | Max size | Avg ms | P95 ms |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...staticRows,
    '',
    '## WebSockets',
    '',
    wsRows.length
      ? '| Step | URL | Frames sent | Frames received | Closed |\n| --- | --- | ---: | ---: | --- |\n' + wsRows.join('\n')
      : 'No WebSocket was opened during this discovery run.',
    '',
    '## Browser Problems',
    '',
    `- Console errors: ${report.consoleErrors.length}`,
    `- Page errors: ${report.pageErrors.length}`,
    `- Request failures: ${report.requestFailures.length}`,
    '',
    '## How To Use This',
    '',
    'Use the endpoint list to tune `tools/perf/taoyuan-k6.js` so the 100-VU run follows real gameplay pages, then compare proxy-path results against direct app-path `/api/health` and server metrics.',
    '',
  ].join('\n')
}

function formatBytes(value) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  browser = await launchBrowser()
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: true,
  })

  const login = await loginIfConfigured(context)
  const accountKey = sanitizeAccountKey(login.username || USERNAME || 'guest')
  await installLocalSaveGuard(context, accountKey)

  const page = await context.newPage()
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)
  page.setDefaultTimeout(30000)
  attachRecorders(page)

  let localSave = {
    created: false,
    reason: CREATE_LOCAL_SAVE ? 'not attempted' : 'disabled',
    forceLocalSaveMode: FORCE_LOCAL_SAVE_MODE,
  }

  if (CREATE_LOCAL_SAVE) {
    localSave = {
      ...(await createLocalSave(page)),
      forceLocalSaveMode: FORCE_LOCAL_SAVE_MODE,
    }
  }

  for (const [label, routePath] of routes) {
    await visitRoute(page, label, routePath)
  }

  await context.close()

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    login,
    localSave,
    routeCount: routes.length,
    requestCount: events.length,
    apiRequestCount: events.filter(item => item.kind === 'api').length,
    staticRequestCount: events.filter(item => item.kind === 'static').length,
    steps: stepSummaries,
    apiEndpoints: groupEndpointStats(),
    staticResources: groupStaticStats(),
    websockets,
    consoleErrors,
    pageErrors,
    requestFailures,
    events,
  }

  const jsonPath = path.join(OUT_DIR, 'player-path-discovery.json')
  const mdPath = path.join(OUT_DIR, 'player-path-discovery.md')
  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(mdPath, renderMarkdown(report), 'utf8')
  console.log(`Saved discovery JSON: ${jsonPath}`)
  console.log(`Saved discovery report: ${mdPath}`)
  console.log(`Routes: ${report.routeCount}, API requests: ${report.apiRequestCount}, unique APIs: ${report.apiEndpoints.length}, WebSockets: ${report.websockets.length}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (browser) await browser.close().catch(() => {})
  })
