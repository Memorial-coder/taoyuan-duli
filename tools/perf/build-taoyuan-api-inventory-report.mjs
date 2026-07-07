#!/usr/bin/env node
/* global console, process */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = process.cwd()
const apiFile = path.join(repoRoot, 'server/src/routes/api.js')
const srcRoot = path.join(repoRoot, 'taoyuan-main/src')
const evidenceRoot = path.join(repoRoot, '.codex-temp/perf-evidence')
const outDir = path.join(repoRoot, 'docs/perf')
const outMd = path.join(outDir, 'taoyuan-core-api-inventory-2026-07-06.md')
const outJson = path.join(outDir, 'taoyuan-core-api-inventory-2026-07-06.json')

const playerExcludedGroups = new Set(['admin', 'official-control'])

const routeNotes = new Map([
  ['GET /api/me', 'Boot path repeats this request in anonymous discovery; de-duplicate shared account-context fetch.'],
  ['GET /api/public-config', 'Boot path repeats this request across multiple UI entry points; safe candidate for shared promise/cache.'],
  ['GET /api/taoyuan/ai/config', 'Boot path repeats this request; repeated config fetch adds avoidable startup chatter.'],
  ['POST /api/taoyuan/announcements/:id/events', 'High-frequency startup write path; batch or debounce impression events.'],
  ['GET /api/taoyuan/online/social/discover', 'Primary API-only tail-latency bottleneck in production load run.'],
])

const routeGroups = [
  ['account', /^\/(?:health|public-config|register|login|logout|me)\b/],
  ['asset-preferences', /^\/taoyuan\/.*preferences/],
  ['save', /^\/taoyuan\/save(?:\/|$)/],
  ['announcements', /^\/taoyuan\/announcements(?:\/|$)/],
  ['gameplay-log', /^\/taoyuan\/logs\/gameplay(?:\/|$)/],
  ['mail', /^\/taoyuan\/mail(?:\/|$)/],
  ['hall', /^\/taoyuan\/hall(?:\/|$)/],
  ['online-profile', /^\/taoyuan\/online\/profile(?:\/|$)/],
  ['social', /^\/taoyuan\/online\/social(?:\/|$)/],
  ['manor', /^\/taoyuan\/online\/manor(?:\/|$)/],
  ['cohabitation', /^\/taoyuan\/online\/cohabitation(?:\/|$)/],
  ['festival-room', /^\/taoyuan\/online\/festival(?:\/|$)/],
  ['expedition-room', /^\/taoyuan\/online\/expedition(?:\/|$)/],
  ['orders', /^\/taoyuan\/online\/orders(?:\/|$)/],
  ['world-events', /^\/taoyuan\/online\/world-events(?:\/|$)/],
  ['society', /^\/taoyuan\/online\/societies(?:\/|$)/],
  ['chat', /^\/taoyuan\/online\/chat(?:\/|$)/],
  ['exchange-station', /^\/taoyuan\/exchange-station(?:\/|$)/],
  ['quota', /^\/taoyuan\/quota(?:\/|$)/],
  ['ai', /^\/taoyuan\/ai(?:\/|$)/],
  ['admin', /^\/admin(?:\/|$)/],
  ['official-control', /^\/official-control(?:\/|$)/],
]

const classify = route => routeGroups.find(([, matcher]) => matcher.test(route))?.[0] || 'misc'
const authFromTail = tail => /adminAuth|userAdminAuth/.test(tail) ? 'admin' : /loginRequired/.test(tail) ? 'login' : 'public'
const csrfFromTail = tail => /signRequired/.test(tail) ? 'yes' : 'no'
const releaseFromTail = tail => /createOnlineReleaseGuard\('([^']+)'\)/.exec(tail)?.[1] || ''
const round = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : 0

const canonicalPath = input => String(input || '')
  .replace(/\?.*$/, '')
  .replace(/\/:[A-Za-z0-9_]+/g, '/:id')
  .replace(/\/\d+(?=\/|$)/g, '/:id')
  .replace(/\/ann_[a-z0-9_]+(?=\/|$)/gi, '/:id')
  .replace(/[a-f0-9-]{16,}/gi, ':id')

const endpointKey = (method, route) => `${String(method).toUpperCase()} ${canonicalPath(route)}`

const inferParams = (method, route, tail) => {
  const parts = []
  if (/\/:[A-Za-z0-9_]+/.test(route)) parts.push('path')
  if (method === 'GET' || method === 'DELETE') parts.push('query')
  if (['POST', 'PUT', 'PATCH'].includes(method)) parts.push(/upload|multer|multipart/i.test(route + tail) ? 'multipart/body' : 'json/body')
  return parts.length ? parts.join('+') : 'none'
}

const parseRoutes = async () => {
  const text = await readFile(apiFile, 'utf8')
  const routePattern = /router\.(get|post|put|patch|delete)\('([^']+)'\s*,([\s\S]*?)(?=\n\}\);|\nrouter\.|\nmodule\.exports|\n\/\/|$)/g
  const rows = []
  let match
  while ((match = routePattern.exec(text))) {
    const method = match[1].toUpperCase()
    const route = `/api${match[2]}`
    const tail = match[3] || ''
    rows.push({
      group: classify(match[2]),
      method,
      path: route,
      key: endpointKey(method, route),
      auth: authFromTail(tail),
      csrf: csrfFromTail(tail),
      params: inferParams(method, route, tail),
      release_guard: releaseFromTail(tail),
    })
  }
  return rows
}

const readJson = async file => {
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

const loadPerf = async () => {
  const files = [
    ['cold-static', path.join(evidenceRoot, 'taoyuan-k6-run-20260706-1351/app-summary-local.json')],
    ['api-ws', path.join(evidenceRoot, 'taoyuan-k6-run-20260706-1406-api/app-summary-local.json')],
  ]
  const perf = new Map()
  for (const [run, file] of files) {
    const report = await readJson(file)
    for (const endpoint of report?.endpoints || []) {
      const key = endpointKey(endpoint.endpoint.split(/\s+/)[0], endpoint.endpoint.replace(/^\S+\s+/, ''))
      const current = perf.get(key) || {
        runs: new Set(),
        count: 0,
        weightedAvgMs: 0,
        worstP95Ms: 0,
        worstP99Ms: 0,
        maxMs: 0,
        statuses: {},
        error5xxWeighted: 0,
      }
      current.runs.add(run)
      current.count += endpoint.count
      current.weightedAvgMs += endpoint.avgMs * endpoint.count
      current.worstP95Ms = Math.max(current.worstP95Ms, endpoint.worstP95Ms)
      current.worstP99Ms = Math.max(current.worstP99Ms, endpoint.worstP99Ms)
      current.maxMs = Math.max(current.maxMs, endpoint.maxMs)
      current.error5xxWeighted += endpoint.error5xxRate * endpoint.count
      for (const [status, count] of Object.entries(endpoint.statuses || {})) {
        current.statuses[status] = (current.statuses[status] || 0) + count
      }
      perf.set(key, current)
    }
  }
  return new Map([...perf.entries()].map(([key, value]) => [key, {
    runs: [...value.runs].sort(),
    count: value.count,
    avgMs: round(value.count ? value.weightedAvgMs / value.count : 0),
    p95Ms: round(value.worstP95Ms),
    p99Ms: round(value.worstP99Ms),
    maxMs: round(value.maxMs),
    statuses: value.statuses,
    error5xxRate: round(value.count ? value.error5xxWeighted / value.count : 0, 4),
  }]))
}

const findFrontendRefs = async () => {
  const refs = new Map()
  const walk = async dir => {
    let entries = []
    try {
      entries = await import('node:fs/promises').then(fs => fs.readdir(dir, { withFileTypes: true }))
    } catch {
      return
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(file)
        continue
      }
      if (!/\.(ts|js|vue)$/.test(entry.name)) continue
      const text = await readFile(file, 'utf8')
      for (const match of text.matchAll(/\/api\/[A-Za-z0-9_./:${}\-?=&`'()+]+/g)) {
        const literal = match[0]
          .replace(/\$\{[^}]+\}/g, ':id')
          .replace(/encodeURIComponent\([^)]+\)/g, ':id')
          .replace(/[)`'"]+$/g, '')
        const keyPath = canonicalPath(literal)
        const current = refs.get(keyPath) || new Set()
        current.add(path.relative(repoRoot, file).replace(/\\/g, '/'))
        refs.set(keyPath, current)
      }
    }
  }
  await walk(srcRoot)
  return refs
}

const summarizeGroups = rows => {
  const byGroup = new Map()
  for (const row of rows) {
    const item = byGroup.get(row.group) || { group: row.group, routes: 0, tested: 0, slow: 0 }
    item.routes += 1
    if (row.perf) item.tested += 1
    if (row.perf?.p95Ms >= 1000 || row.perf?.p99Ms >= 3000) item.slow += 1
    byGroup.set(row.group, item)
  }
  return [...byGroup.values()].sort((a, b) => a.group.localeCompare(b.group))
}

const buildNotes = row => {
  const notes = []
  const manual = routeNotes.get(row.key)
  if (manual) notes.push(manual)
  if (row.perf?.count >= 100) notes.push('High observed request count in controlled run.')
  if (row.perf?.p99Ms >= 3000) notes.push('P99 exceeds 3s threshold.')
  else if (row.perf?.p95Ms >= 1000) notes.push('P95 exceeds 1s.')
  if (!row.perf && row.frontend_refs.length) notes.push('Frontend-referenced route not directly timed in controlled k6 run.')
  return notes.join(' ')
}

const render = (rows, groups) => {
  const tableRows = rows.map(row => {
    const perf = row.perf
    const refLabel = row.frontend_refs.length ? 'yes' : 'not found'
    return `| ${row.group} | ${row.method} | \`${row.path}\` | ${row.params} | ${row.auth} | ${row.csrf} | ${row.release_guard || '-'} | ${refLabel} | ${perf ? perf.runs.join('+') : '-'} | ${perf ? perf.count : 0} | ${perf ? perf.avgMs : '-'} | ${perf ? perf.p95Ms : '-'} | ${perf ? perf.p99Ms : '-'} | ${perf ? (perf.error5xxRate * 100).toFixed(2) + '%' : '-'} | ${row.notes || '-'} |`
  })
  const groupRows = groups.map(group =>
    `| ${group.group} | ${group.routes} | ${group.tested} | ${group.slow} |`
  )
  return [
    '# Taoyuan Core API Inventory',
    '',
    'Date: 2026-07-06',
    '',
    'This inventory is generated from `server/src/routes/api.js` and merged with the controlled k6 evidence under `.codex-temp/perf-evidence`. Admin and ops-only routes are excluded because the requested test scope is player concurrency.',
    '',
    'Parameter type is inferred from HTTP method and route shape. Performance columns are populated only for endpoints reached by the controlled k6 scenarios; `-` means the route exists but was not directly timed in the production load run.',
    '',
    '## Group Summary',
    '',
    '| Group | Player routes | Timed in k6 | Slow by threshold |',
    '| --- | ---: | ---: | ---: |',
    ...groupRows,
    '',
    '## Route Inventory',
    '',
    '| Group | Method | Path | Params | Auth | CSRF | Release guard | Frontend ref | k6 runs | k6 count | Avg ms | P95 ms | P99 ms | 5xx rate | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...tableRows,
    '',
  ].join('\n')
}

const main = async () => {
  const routes = (await parseRoutes()).filter(row => !playerExcludedGroups.has(row.group))
  const perf = await loadPerf()
  const frontendRefs = await findFrontendRefs()
  const rows = routes
    .map(route => {
      const perfEntry = perf.get(route.key) || perf.get(endpointKey(route.method, route.path.replace(/\/:[A-Za-z0-9_]+/g, '/:id')))
      const frontendKey = canonicalPath(route.path)
      const refSet = frontendRefs.get(frontendKey)
      return {
        ...route,
        perf: perfEntry || null,
        frontend_refs: refSet ? [...refSet].slice(0, 5) : [],
        notes: '',
      }
    })
    .map(row => ({
      ...row,
      notes: buildNotes(row),
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
  const groups = summarizeGroups(rows)
  await mkdir(outDir, { recursive: true })
  await writeFile(outJson, JSON.stringify({ generated_at: new Date().toISOString(), routes: rows, groups }, null, 2), 'utf8')
  await writeFile(outMd, render(rows, groups), 'utf8')
  console.log(`Wrote ${outJson}`)
  console.log(`Wrote ${outMd}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
