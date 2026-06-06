import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const readText = path => readFileSync(resolve(rootDir, path), 'utf8')

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const regionStore = readText('src/stores/useRegionMapStore.ts')
const regionView = readText('src/views/game/RegionMapView.vue')

const extractFunctionBody = (source, functionName) => {
  const marker = `const ${functionName} =`
  const start = source.indexOf(marker)
  assert(start >= 0, `找不到函数 ${functionName}`)
  const nextFunction = source.indexOf('\n  const ', start + marker.length)
  assert(nextFunction > start, `无法截取函数 ${functionName}`)
  return source.slice(start, nextFunction)
}

const timedStoreFunctions = [
  'advanceActiveExpedition',
  'campActiveExpedition',
  'resolveCampAction'
]

for (const functionName of timedStoreFunctions) {
  const body = extractFunctionBody(regionStore, functionName)
  assert(
    body.includes('const timeResult = gameStore.advanceTime('),
    `${functionName} 必须保留 advanceTime() 的返回值`
  )
  assert(
    /return\s*\{[\s\S]*timeResult[\s\S]*\}/.test(body),
    `${functionName} 必须把 timeResult 返回给页面层处理晕厥跨日`
  )
}

assert(
  regionView.includes("import { handleEndDay } from '@/composables/useEndDay'"),
  'RegionMapView 必须导入 handleEndDay()'
)
assert(
  /const handleRegionActionEndDay = \(result: \{ timeResult\?: RegionActionTimeResult \}\) => \{[\s\S]*result\.timeResult\?\.passedOut[\s\S]*handleEndDay\(\)/.test(regionView),
  'RegionMapView 必须通过 timeResult.passedOut 统一触发 handleEndDay()'
)

const viewHandlers = [
  'handleAdvanceExpedition',
  'handleCampExpedition',
  'handleResolveCampAction'
]

for (const handlerName of viewHandlers) {
  const body = extractFunctionBody(regionView, handlerName)
  assert(
    body.includes('handleRegionActionEndDay(result)'),
    `${handlerName} 必须在动作后检查晕厥跨日`
  )
}

assert(
  !regionStore.includes("import { handleEndDay } from '@/composables/useEndDay'"),
  'useRegionMapStore 不应直接依赖 useEndDay，跨日处理应留在页面层'
)
