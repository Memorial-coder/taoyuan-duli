/* global console, process */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-gameplay-log-'))
const gameplayLogFile = path.join(tmpRoot, 'taoyuan_gameplay_event_logs.json')

process.env.DB_STORAGE = path.join(tmpRoot, 'users.json')
process.env.QA_ONLINE_SMOKE_FORCE_LOCAL = 'true'
process.env.GAMEPLAY_EVENT_LOG_MAX_TOTAL = '80'
process.env.GAMEPLAY_EVENT_LOG_MAX_PER_USER_SLOT = '30'
process.env.GAMEPLAY_EVENT_LOG_RETENTION_DAYS = '30'

let gameplayWrites = 0
const originalWriteFileSync = fs.writeFileSync
fs.writeFileSync = function patchedWriteFileSync(filePath, ...args) {
  if (String(filePath).includes('taoyuan_gameplay_event_logs.json')) gameplayWrites += 1
  return originalWriteFileSync.call(this, filePath, ...args)
}

const require = createRequire(import.meta.url)
const db = require('../src/db.js')

const readGameplayLogs = () => {
  try {
    return JSON.parse(fs.readFileSync(gameplayLogFile, 'utf8')).logs || []
  } catch {
    return []
  }
}

const makeEntry = (index, overrides = {}) => ({
  username: overrides.username ?? `player_${index % 4}`,
  day_label: `春${index}日`,
  category: 'system',
  message: `玩法日志 ${index}`,
  route_name: '/game/mining',
  tags: [],
  meta: { save_slot: overrides.saveSlot ?? index % 2 },
  created_at: overrides.createdAt,
})

try {
  gameplayWrites = 0
  await db.recordGameplayEventLogsBatch(Array.from({ length: 100 }, (_, index) => makeEntry(index)))
  let logs = readGameplayLogs()
  assert(gameplayWrites === 1, 'JSON fallback 下 100 条 batch 必须只写回一次')
  assert(logs.length === 80, 'JSON fallback 必须按总量上限裁剪')

  fs.rmSync(gameplayLogFile, { force: true })
  gameplayWrites = 0
  await db.recordGameplayEventLogsBatch(Array.from({ length: 100 }, (_, index) => makeEntry(index, {
    username: 'same_player',
    saveSlot: 1,
  })))
  logs = readGameplayLogs()
  assert(logs.length === 30, 'JSON fallback 必须按用户 + 存档槽上限裁剪')
  assert(gameplayWrites === 1, '用户槽位裁剪也应保持单次写回')

  fs.rmSync(gameplayLogFile, { force: true })
  const oldTimestamp = Math.floor(Date.now() / 1000) - 40 * 86400
  await db.recordGameplayEventLogsBatch(Array.from({ length: 12 }, (_, index) => makeEntry(index, {
    username: 'expired_player',
    saveSlot: 0,
    createdAt: oldTimestamp,
  })))
  logs = readGameplayLogs()
  assert(logs.length === 0, 'JSON fallback 必须按 TTL 丢弃过期玩法日志')

  const routeSource = fs.readFileSync(path.join(serverRoot, 'src', 'routes', 'api.js'), 'utf8')
  assert(/recordGameplayEventLogsBatch\(normalizedLogs\)/.test(routeSource), 'batch 路由必须调用批量写入入口')
} finally {
  fs.writeFileSync = originalWriteFileSync
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

if (errors.length > 0) {
  console.error('qa-gameplay-log-retention 失败:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa-gameplay-log-retention 通过')
}
