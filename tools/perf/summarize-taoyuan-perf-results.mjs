#!/usr/bin/env node
/* global console, process */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const K6_DIR = path.resolve(process.env.K6_DIR || process.argv[2] || '')
const METRICS_DIR = process.env.METRICS_DIR ? path.resolve(process.env.METRICS_DIR) : ''
const OUT_FILE = path.resolve(process.env.OUT_FILE || path.join(K6_DIR || process.cwd(), 'taoyuan-perf-summary.md'))
const OUT_JSON = path.resolve(process.env.OUT_JSON || path.join(K6_DIR || process.cwd(), 'taoyuan-perf-summary.json'))
const APP_CONTAINER = process.env.APP_CONTAINER || 'taoyuan'
const OPENRESTY_CONTAINER = process.env.OPENRESTY_CONTAINER || 'openresty'

if (!K6_DIR) {
  console.error('Usage: node tools/perf/summarize-taoyuan-perf-results.mjs <k6-output-dir>')
  process.exit(2)
}

const quantile = (values, p) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : 0

const readJson = async file => {
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

const exists = async file => {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

const metricValue = (summary, name, field, fallback = 0) => {
  const metric = summary?.metrics?.[name] || {}
  const value = metric?.values?.[field] ?? metric?.[field]
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

const normalizeMetricName = entry => entry.metric || entry.data?.metric || entry.data?.name || ''
const normalizePointValue = entry => Number(entry.data?.value ?? entry.value)
const normalizePointTags = entry => entry.data?.tags || entry.tags || {}

const parseK6Samples = async file => {
  if (!(await exists(file))) return { endpoints: [], websockets: {} }
  const text = await readFile(file, 'utf8')
  const endpointMap = new Map()
  const ws = {
    connects: 0,
    connectingDurationMs: [],
    sessions: 0,
    messagesSent: 0,
    messagesReceived: 0,
    failures: [],
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '')
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (entry.type && entry.type !== 'Point') continue
    const metric = normalizeMetricName(entry)
    const value = normalizePointValue(entry)
    const tags = normalizePointTags(entry)

    if (metric === 'taoyuan_api_duration') {
      const endpoint = tags.endpoint || `${tags.method || 'GET'} ${tags.path || tags.name || 'unknown'}`
      const status = Number(tags.status || 0)
      const current = endpointMap.get(endpoint) || {
        endpoint,
        count: 0,
        durations: [],
        statuses: {},
        errors4xx: 0,
        errors5xx: 0,
      }
      current.count += 1
      if (Number.isFinite(value)) current.durations.push(value)
      if (status) current.statuses[status] = (current.statuses[status] || 0) + 1
      if (status >= 400 && status < 500) current.errors4xx += 1
      if (status >= 500) current.errors5xx += 1
      endpointMap.set(endpoint, current)
      continue
    }

    if (metric === 'ws_connecting') ws.connects += 1
    if (metric === 'ws_connecting' && Number.isFinite(value)) ws.connectingDurationMs.push(value)
    if (metric === 'ws_session_duration') ws.sessions += 1
    if (metric === 'ws_msgs_sent') ws.messagesSent += 1
    if (metric === 'ws_msgs_received') ws.messagesReceived += 1
    if (metric === 'taoyuan_ws_failed' && Number.isFinite(value)) ws.failures.push(value)
  }

  const endpoints = [...endpointMap.values()]
    .map(item => ({
      endpoint: item.endpoint,
      count: item.count,
      avgMs: round(avg(item.durations)),
      p50Ms: round(quantile(item.durations, 50)),
      p95Ms: round(quantile(item.durations, 95)),
      p99Ms: round(quantile(item.durations, 99)),
      maxMs: round(Math.max(0, ...item.durations)),
      statuses: item.statuses,
      error4xxRate: round(item.count ? item.errors4xx / item.count : 0, 4),
      error5xxRate: round(item.count ? item.errors5xx / item.count : 0, 4),
    }))
    .sort((left, right) => right.p95Ms - left.p95Ms || right.count - left.count)

  return {
    endpoints,
    websockets: {
      connects: ws.connects,
      sessions: ws.sessions,
      avgConnectingMs: round(avg(ws.connectingDurationMs)),
      p95ConnectingMs: round(quantile(ws.connectingDurationMs, 95)),
      messagesSent: ws.messagesSent,
      messagesReceived: ws.messagesReceived,
      failureRate: round(avg(ws.failures), 4),
    },
  }
}

const parseIsoLine = line => {
  const match = /^###\s+([^\s]+)/.exec(String(line || '').replace(/^\uFEFF/, ''))
  if (!match) return null
  const time = Date.parse(match[1])
  return Number.isFinite(time) ? time : null
}

const parseSizeToMiB = value => {
  const match = String(value || '').trim().match(/^([\d.]+)\s*([KMGT]?i?B|[KMGT]?B)?/i)
  if (!match) return 0
  const number = Number(match[1])
  if (!Number.isFinite(number)) return 0
  const unit = (match[2] || 'B').toLowerCase()
  if (unit === 'b') return number / 1024 / 1024
  if (unit === 'kb' || unit === 'kib') return number / 1024
  if (unit === 'mb' || unit === 'mib') return number
  if (unit === 'gb' || unit === 'gib') return number * 1024
  if (unit === 'tb' || unit === 'tib') return number * 1024 * 1024
  return number
}

const splitDockerStatsRow = line => {
  const cols = line.trim().split(/\s{2,}|\t+/).map(item => item.trim()).filter(Boolean)
  if (cols.length >= 6) return cols
  return []
}

const parseDockerStats = async metricsDir => {
  if (!metricsDir) return []
  const file = path.join(metricsDir, 'docker-stats.log')
  if (!(await exists(file))) return []
  const text = await readFile(file, 'utf8')
  const rows = []
  let currentTime = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '')
    const nextTime = parseIsoLine(line)
    if (nextTime) {
      currentTime = nextTime
      continue
    }
    if (!currentTime || !line.trim() || /^CONTAINER|^NAME/i.test(line.trim())) continue
    const cols = splitDockerStatsRow(line)
    if (cols.length < 6) continue
    const [name, cpuRaw, memRaw, netRaw, blockRaw, pidsRaw] = cols
    rows.push({
      time: currentTime,
      name,
      cpuPercent: Number(String(cpuRaw).replace('%', '')) || 0,
      memMiB: parseSizeToMiB(String(memRaw).split('/')[0]),
      netIO: netRaw,
      blockIO: blockRaw,
      pids: Number(pidsRaw) || 0,
    })
  }
  return rows
}

const summarizeRows = rows => ({
  samples: rows.length,
  avgCpuPercent: round(avg(rows.map(row => row.cpuPercent))),
  maxCpuPercent: round(Math.max(0, ...rows.map(row => row.cpuPercent))),
  avgMemMiB: round(avg(rows.map(row => row.memMiB))),
  maxMemMiB: round(Math.max(0, ...rows.map(row => row.memMiB))),
  maxPids: Math.max(0, ...rows.map(row => row.pids)),
})

const countLogSignals = async metricsDir => {
  const result = {
    appErrors: 0,
    appFiveHundreds: 0,
    openrestyErrors: 0,
    openrestyFiveHundreds: 0,
  }
  if (!metricsDir) return result
  const files = [
    ['app-docker-logs.log', 'app'],
    ['openresty-docker-logs.log', 'openresty'],
  ]
  for (const [fileName, kind] of files) {
    const file = path.join(metricsDir, fileName)
    if (!(await exists(file))) continue
    const text = await readFile(file, 'utf8')
    const errors = (text.match(/\b(error|exception|traceback|fatal|unhandled)\b/gi) || []).length
    const fiveHundreds = (text.match(/"\S+\s+[^"]+\s+HTTP\/[^"]+"\s+5\d\d\b/g) || []).length
    if (kind === 'app') {
      result.appErrors = errors
      result.appFiveHundreds = fiveHundreds
    } else {
      result.openrestyErrors = errors
      result.openrestyFiveHundreds = fiveHundreds
    }
  }
  return result
}

const loadStages = async () => {
  const entries = await readdir(K6_DIR, { withFileTypes: true })
  const stageDirs = entries
    .filter(entry => entry.isDirectory() && /^stage-\d+$/.test(entry.name))
    .map(entry => path.join(K6_DIR, entry.name))
    .sort((left, right) => Number(path.basename(left).replace('stage-', '')) - Number(path.basename(right).replace('stage-', '')))

  const dockerRows = await parseDockerStats(METRICS_DIR)
  const stages = []
  for (const stageDir of stageDirs) {
    const stage = await readJson(path.join(stageDir, 'stage.json')) || {}
    const summary = await readJson(path.join(stageDir, 'summary.json')) || {}
    const samples = await parseK6Samples(path.join(stageDir, 'k6-samples.ndjson'))
    const startedAt = Date.parse(stage.started_at || '')
    const finishedAt = Date.parse(stage.finished_at || '')
    const inWindow = Number.isFinite(startedAt) && Number.isFinite(finishedAt)
      ? dockerRows.filter(row => row.time >= startedAt && row.time <= finishedAt)
      : []
    const appRows = inWindow.filter(row => row.name === APP_CONTAINER)
    const proxyRows = inWindow.filter(row => row.name === OPENRESTY_CONTAINER)

    stages.push({
      name: path.basename(stageDir),
      vus: Number(stage.vus || path.basename(stageDir).replace('stage-', '')),
      duration: stage.duration || '',
      status: stage.status || 'unknown',
      startedAt: stage.started_at || '',
      finishedAt: stage.finished_at || '',
      k6: {
        rps: round(metricValue(summary, 'http_reqs', 'rate')),
        requests: round(metricValue(summary, 'http_reqs', 'count'), 0),
        p50Ms: round(metricValue(summary, 'http_req_duration', 'med')),
        p95Ms: round(metricValue(summary, 'http_req_duration', 'p(95)')),
        p99Ms: round(metricValue(summary, 'http_req_duration', 'p(99)')),
        maxMs: round(metricValue(summary, 'http_req_duration', 'max')),
        failedRate: round(metricValue(summary, 'http_req_failed', 'rate'), 4),
        checksRate: round(metricValue(summary, 'checks', 'rate'), 4),
      },
      appContainer: summarizeRows(appRows),
      proxyContainer: summarizeRows(proxyRows),
      endpoints: samples.endpoints,
      websockets: samples.websockets,
    })
  }
  return stages
}

const mergeEndpoints = stages => {
  const map = new Map()
  for (const stage of stages) {
    for (const endpoint of stage.endpoints) {
      const current = map.get(endpoint.endpoint) || {
        endpoint: endpoint.endpoint,
        count: 0,
        weightedAvgMs: 0,
        p95Ms: 0,
        p99Ms: 0,
        maxMs: 0,
        statuses: {},
        error4xx: 0,
        error5xx: 0,
        seenStages: [],
      }
      current.weightedAvgMs += endpoint.avgMs * endpoint.count
      current.count += endpoint.count
      current.p95Ms = Math.max(current.p95Ms, endpoint.p95Ms)
      current.p99Ms = Math.max(current.p99Ms, endpoint.p99Ms)
      current.maxMs = Math.max(current.maxMs, endpoint.maxMs)
      current.error4xx += endpoint.error4xxRate * endpoint.count
      current.error5xx += endpoint.error5xxRate * endpoint.count
      current.seenStages.push(stage.vus)
      for (const [status, count] of Object.entries(endpoint.statuses || {})) {
        current.statuses[status] = (current.statuses[status] || 0) + count
      }
      map.set(endpoint.endpoint, current)
    }
  }
  return [...map.values()]
    .map(item => ({
      endpoint: item.endpoint,
      count: item.count,
      avgMs: round(item.count ? item.weightedAvgMs / item.count : 0),
      worstP95Ms: round(item.p95Ms),
      worstP99Ms: round(item.p99Ms),
      maxMs: round(item.maxMs),
      statuses: item.statuses,
      error4xxRate: round(item.count ? item.error4xx / item.count : 0, 4),
      error5xxRate: round(item.count ? item.error5xx / item.count : 0, 4),
      seenStages: [...new Set(item.seenStages)].sort((a, b) => a - b),
    }))
    .sort((left, right) => right.worstP95Ms - left.worstP95Ms || right.count - left.count)
}

const inferCapacity = stages => {
  const passing = stages.filter(stage =>
    stage.status === 'passed'
    && stage.k6.failedRate < 0.02
    && stage.k6.p99Ms < 3000
    && (stage.appContainer.samples === 0 || stage.appContainer.maxCpuPercent < 90)
  )
  const maxStable = passing.length ? Math.max(...passing.map(stage => stage.vus)) : 0
  const firstBad = stages.find(stage => !passing.some(item => item.vus === stage.vus))
  return {
    maxStable,
    firstBad: firstBad
      ? {
          vus: firstBad.vus,
          failedRate: firstBad.k6.failedRate,
          p99Ms: firstBad.k6.p99Ms,
          appMaxCpuPercent: firstBad.appContainer.maxCpuPercent,
        }
      : null,
  }
}

const render = report => {
  const stageRows = report.stages.map(stage =>
    `| ${stage.vus} | ${stage.status} | ${stage.k6.rps} | ${stage.k6.p50Ms} | ${stage.k6.p95Ms} | ${stage.k6.p99Ms} | ${(stage.k6.failedRate * 100).toFixed(2)}% | ${stage.appContainer.maxCpuPercent || 'n/a'} | ${stage.appContainer.maxMemMiB || 'n/a'} | ${stage.proxyContainer.maxCpuPercent || 'n/a'} | ${stage.websockets.connects} |`
  )
  const apiRows = report.endpoints.slice(0, 80).map(item =>
    `| \`${item.endpoint}\` | ${item.count} | ${item.avgMs} | ${item.worstP95Ms} | ${item.worstP99Ms} | ${item.maxMs} | ${JSON.stringify(item.statuses)} | ${(item.error5xxRate * 100).toFixed(2)}% | ${item.seenStages.join(', ')} |`
  )
  const wsRows = report.stages.map(stage =>
    `| ${stage.vus} | ${stage.websockets.connects} | ${stage.websockets.sessions} | ${stage.websockets.messagesSent} | ${stage.websockets.messagesReceived} | ${(stage.websockets.failureRate * 100).toFixed(2)}% | ${stage.websockets.p95ConnectingMs} |`
  )

  return [
    '# Taoyuan Performance Result Summary',
    '',
    `Generated: ${report.generatedAt}`,
    `K6 dir: \`${report.k6Dir}\``,
    `Metrics dir: \`${report.metricsDir || 'not provided'}\``,
    '',
    '## Capacity Estimate',
    '',
    `- Estimated max stable concurrency: ${report.capacity.maxStable || 'not proven'} VUs`,
    report.capacity.firstBad
      ? `- First failing or risky stage: ${report.capacity.firstBad.vus} VUs (failed rate ${(report.capacity.firstBad.failedRate * 100).toFixed(2)}%, P99 ${report.capacity.firstBad.p99Ms} ms, app max CPU ${report.capacity.firstBad.appMaxCpuPercent || 'n/a'}%)`
      : '- No failing stage detected by the configured thresholds.',
    '',
    '## Stage Summary',
    '',
    '| VUs | Status | RPS | P50 ms | P95 ms | P99 ms | Error rate | App max CPU % | App max Mem MiB | Proxy max CPU % | WS connects |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...stageRows,
    '',
    '## Core API Performance',
    '',
    '| API | Count | Avg ms | Worst P95 ms | Worst P99 ms | Max ms | Statuses | 5xx rate | Seen at VUs |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |',
    ...apiRows,
    '',
    '## WebSocket Summary',
    '',
    '| VUs | Connect points | Sessions | Sent frames | Received frames | Failure rate | P95 connect ms |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...wsRows,
    '',
    '## Log Signals',
    '',
    `- App log error-like terms: ${report.logSignals.appErrors}`,
    `- App log 5xx-like lines: ${report.logSignals.appFiveHundreds}`,
    `- OpenResty log error-like terms: ${report.logSignals.openrestyErrors}`,
    `- OpenResty log 5xx-like lines: ${report.logSignals.openrestyFiveHundreds}`,
    '',
  ].join('\n')
}

const main = async () => {
  const stages = await loadStages()
  const endpoints = mergeEndpoints(stages)
  const logSignals = await countLogSignals(METRICS_DIR)
  const report = {
    generatedAt: new Date().toISOString(),
    k6Dir: K6_DIR,
    metricsDir: METRICS_DIR,
    stages,
    endpoints,
    logSignals,
    capacity: inferCapacity(stages),
  }
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(OUT_FILE, render(report), 'utf8')
  console.log(`Wrote ${OUT_JSON}`)
  console.log(`Wrote ${OUT_FILE}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
