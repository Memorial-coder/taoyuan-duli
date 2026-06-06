/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(projectRoot, '..')

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const read = relativePath => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8').replace(/\r\n/g, '\n')

const walkFiles = dir => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.tmp') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

const getReturnObjectBody = source => {
  const marker = '\n  return {\n'
  const start = source.lastIndexOf(marker)
  if (start < 0) return ''
  const bodyStart = start + marker.length
  const end = source.indexOf('\n  }\n})', bodyStart)
  return end >= 0 ? source.slice(bodyStart, end) : ''
}

const regionStorePath = 'taoyuan-main/src/stores/useRegionMapStore.ts'
const regionStore = read(regionStorePath)
const regionStoreReturn = getReturnObjectBody(regionStore)

assert(regionStoreReturn, 'useRegionMapStore 必须能解析 return API')
assert(!/\bcompleteRouteAndGrantRewards\b/.test(regionStoreReturn), 'completeRouteAndGrantRewards 不得继续作为生产 store API 暴露')
assert(!/\bcompleteEventAndGrantRewards\b/.test(regionStoreReturn), 'completeEventAndGrantRewards 不得继续作为生产 store API 暴露')
assert(/\brunBossExpedition\b/.test(regionStoreReturn), 'runBossExpedition 保留给现有 late-game QA 时必须显式可见')
assert(
  /const combatResult = simulateBossExpedition\(regionId, boss\)[\s\S]*?const hpDelta = Math\.max\(0, playerStore\.hp - Math\.max\(0, combatResult\.projectedHp\)\)[\s\S]*?playerStore\.takeDamage\(hpDelta\)/.test(regionStore),
  'runBossExpedition 必须按 simulateBossExpedition.projectedHp 扣减玩家 HP'
)

const textFiles = walkFiles(workspaceRoot)
  .filter(filePath => /\.(ts|vue|mjs|js|md)$/.test(filePath))
  .filter(filePath => !filePath.includes(`${path.sep}node_modules${path.sep}`))
  .filter(filePath => !filePath.includes(`${path.sep}docs${path.sep}assets${path.sep}`))
  .filter(filePath => !filePath.includes(`${path.sep}android${path.sep}app${path.sep}src${path.sep}main${path.sep}assets${path.sep}`))

const relative = filePath => path.relative(workspaceRoot, filePath).replace(/\\/g, '/')
const findRefs = token => textFiles
  .map(filePath => {
    const content = fs.readFileSync(filePath, 'utf8')
    return content.includes(token) ? relative(filePath) : null
  })
  .filter(Boolean)

const runBossRefs = findRefs('runBossExpedition')
const unexpectedRunBossRefs = runBossRefs.filter(filePath => ![
  '0605修复todo.md',
  '0605审查.md',
  'taoyuan-main/src/stores/useRegionMapStore.ts',
  'taoyuan-main/scripts/qa-late-game-samples.mjs',
  'taoyuan-main/scripts/qa-region-helper-guards.mjs'
].includes(filePath))
assert(unexpectedRunBossRefs.length === 0, `runBossExpedition 存在未预期调用：${unexpectedRunBossRefs.join(', ')}`)

const routeHelperRefs = findRefs('completeRouteAndGrantRewards')
const unexpectedRouteHelperRefs = routeHelperRefs.filter(filePath => ![
  '0605修复todo.md',
  '0605审查.md',
  'taoyuan-main/src/stores/useRegionMapStore.ts',
  'taoyuan-main/scripts/qa-region-helper-guards.mjs'
].includes(filePath))
assert(unexpectedRouteHelperRefs.length === 0, `completeRouteAndGrantRewards 存在 store 外调用：${unexpectedRouteHelperRefs.join(', ')}`)

const eventHelperRefs = findRefs('completeEventAndGrantRewards')
const unexpectedEventHelperRefs = eventHelperRefs.filter(filePath => ![
  '0605修复todo.md',
  '0605审查.md',
  'taoyuan-main/src/stores/useRegionMapStore.ts',
  'taoyuan-main/scripts/qa-region-helper-guards.mjs'
].includes(filePath))
assert(unexpectedEventHelperRefs.length === 0, `completeEventAndGrantRewards 存在 store 外调用：${unexpectedEventHelperRefs.join(', ')}`)

const gridRefs = findRefs('generateFloorGrid')
const unexpectedGridRefs = gridRefs.filter(filePath => ![
  '0605修复todo.md',
  '0605审查.md',
  'taoyuan-main/src/data/mine.ts',
  'taoyuan-main/src/stores/useMiningStore.ts',
  'taoyuan-main/scripts/qa-region-helper-guards.mjs'
].includes(filePath))
assert(unexpectedGridRefs.length === 0, `generateFloorGrid 存在矿洞 store 外调用：${unexpectedGridRefs.join(', ')}`)

if (errors.length > 0) {
  console.error('qa-region-helper-guards 失败:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa-region-helper-guards 通过')
}
