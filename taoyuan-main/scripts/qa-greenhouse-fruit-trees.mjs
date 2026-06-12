/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'
import { createPinia, setActivePinia } from 'pinia'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

const errors = []

const noop = () => {}
const localStorageStub = {
  getItem: () => null,
  setItem: noop,
  removeItem: noop
}

globalThis.self = globalThis
globalThis.HTMLElement = class HTMLElement {}
globalThis.location = { host: '', pathname: '/', search: '', hash: '', href: 'http://127.0.0.1/' }
globalThis.history = { state: null, replaceState: noop, pushState: noop }
globalThis.window = {
  addEventListener: noop,
  removeEventListener: noop,
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  setInterval: globalThis.setInterval.bind(globalThis),
  clearInterval: globalThis.clearInterval.bind(globalThis),
  localStorage: localStorageStub,
  location: globalThis.location,
  history: globalThis.history
}
globalThis.document = {
  hidden: false,
  visibilityState: 'visible',
  addEventListener: noop,
  removeEventListener: noop,
  body: { appendChild: noop, removeChild: noop },
  documentElement: { style: { fontSize: '', setProperty: noop } },
  createElement: () => ({
    style: {},
    classList: { add: noop, remove: noop },
    appendChild: noop,
    removeChild: noop,
    setAttribute: noop,
    addEventListener: noop,
    removeEventListener: noop
  }),
  querySelector: () => null
}

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const tryResolveFile = candidate => {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.js`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.js')
  ]
  for (const item of variants) {
    try {
      if (fs.statSync(item).isFile()) return item
    } catch {
      // keep trying
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = tryResolveFile(path.join(srcRoot, specifier.slice(2)))
      if (!resolved) throw new Error(`无法解析模块：${specifier}`)
      return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL)
      const resolved = tryResolveFile(path.resolve(path.dirname(parentPath), specifier))
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const { useFarmStore } = await import(pathToFileURL(path.join(srcRoot, 'stores', 'useFarmStore.ts')).href)
const { GREENHOUSE_FRUIT_TREE_SLOT_COUNT } = await import(pathToFileURL(path.join(srcRoot, 'data', 'fruitTrees.ts')).href)

const farmViewSource = fs.readFileSync(path.join(srcRoot, 'views', 'game', 'FarmView.vue'), 'utf8')
const greenhouseModalIndex = farmViewSource.indexOf('v-if="showGreenhouseModal"')
const chopFruitTreeModalIndex = farmViewSource.indexOf('<!-- 砍伐果树确认弹窗 -->')
const scriptSetupIndex = farmViewSource.indexOf('<script setup')

assert(greenhouseModalIndex >= 0, '农场页应保留温室弹窗。')
assert(chopFruitTreeModalIndex > greenhouseModalIndex, '砍伐果树确认弹窗应挂在温室弹窗之后，避免温室内点击果树后被页签或弹窗层级挡住。')
assert(chopFruitTreeModalIndex < scriptSetupIndex, '砍伐果树确认弹窗应位于 template 内。')
assert(
  farmViewSource.slice(chopFruitTreeModalIndex, scriptSetupIndex).includes('z-[60]'),
  '砍伐果树确认弹窗层级应高于温室弹窗的 z-50。'
)

const createPlots = () =>
  Array.from({ length: 16 }, (_, id) => ({
    id,
    state: 'wasteland',
    cropId: null,
    growthDays: 0,
    watered: false,
    unwateredDays: 0,
    fertilizer: null,
    harvestCount: 0,
    giantCropGroup: null,
    seedGenetics: null,
    infested: false,
    infestedDays: 0,
    weedy: false,
    weedyDays: 0
  }))

const createFarmPayload = overrides => ({
  farmSize: 4,
  plots: createPlots(),
  sprinklers: [],
  fruitTrees: [],
  greenhouseFruitTrees: [],
  greenhousePlots: [],
  greenhouseLevel: 0,
  wildTrees: [],
  nextFruitTreeId: 0,
  nextWildTreeId: 0,
  lightningRods: 0,
  scarecrows: 0,
  giantCropCounter: 0,
  ...overrides
})

const createFarmStore = payload => {
  setActivePinia(createPinia())
  const farmStore = useFarmStore()
  farmStore.deserialize(payload)
  return farmStore
}

const hasFruit = (result, fruitId) => result.fruits.some(fruit => fruit.fruitId === fruitId)

const legacyPayload = createFarmPayload()
delete legacyPayload.greenhouseFruitTrees
let farmStore = createFarmStore(legacyPayload)
assert(Array.isArray(farmStore.greenhouseFruitTrees), '旧档缺少 greenhouseFruitTrees 时应回填为空数组。')
assert(farmStore.greenhouseFruitTrees.length === 0, '旧档 greenhouseFruitTrees 默认应为空。')

assert(GREENHOUSE_FRUIT_TREE_SLOT_COUNT === 8, '温室果树位默认应为 8 个。')
assert(farmStore.plantGreenhouseFruitTree(0, 'lychee_tree'), '空温室果树位应允许种植。')
assert(!farmStore.plantGreenhouseFruitTree(0, 'peach_tree'), '已占用温室果树位不应允许重复种植。')
assert(!farmStore.plantGreenhouseFruitTree(GREENHOUSE_FRUIT_TREE_SLOT_COUNT, 'peach_tree'), '越界温室果树位不应允许种植。')
assert(farmStore.greenhouseFruitTrees[0]?.slotId === 0, '温室果树应记录所在 slotId。')

farmStore = createFarmStore(
  createFarmPayload({
    greenhouseFruitTrees: [{ id: 10, slotId: 0, type: 'lychee_tree', growthDays: 28, mature: true, yearAge: 0, todayFruit: false }],
    nextFruitTreeId: 11
  })
)
const lockedGreenhouseResult = farmStore.dailyFruitTreeUpdate('winter', { includeGreenhouse: false })
assert(lockedGreenhouseResult.fruits.length === 0, '温室未纳入日结时，温室果树不应产果。')
assert(farmStore.greenhouseFruitTrees[0]?.todayFruit === false, '温室未纳入日结时，不应标记今日结果。')

farmStore = createFarmStore(
  createFarmPayload({
    fruitTrees: [{ id: 1, type: 'peach_tree', growthDays: 28, mature: true, yearAge: 0, todayFruit: false }],
    greenhouseFruitTrees: [{ id: 2, slotId: 0, type: 'lychee_tree', growthDays: 28, mature: true, yearAge: 0, todayFruit: false }],
    nextFruitTreeId: 3
  })
)
const winterOpenResult = farmStore.dailyFruitTreeUpdate('winter', { includeGreenhouse: true })
assert(!hasFruit(winterOpenResult, 'tree_peach'), '室外桃树冬季不应产果。')
assert(hasFruit(winterOpenResult, 'tree_lychee'), '温室荔枝树冬季也应全年产果。')
assert(farmStore.fruitTrees[0]?.todayFruit === false, '室外非当季果树不应标记今日结果。')
assert(farmStore.greenhouseFruitTrees[0]?.todayFruit === true, '温室成熟果树产果后应标记今日结果。')

farmStore = createFarmStore(
  createFarmPayload({
    fruitTrees: [{ id: 1, type: 'peach_tree', growthDays: 28, mature: true, yearAge: 0, todayFruit: false }],
    greenhouseFruitTrees: [{ id: 2, slotId: 0, type: 'lychee_tree', growthDays: 28, mature: true, yearAge: 0, todayFruit: false }],
    nextFruitTreeId: 3
  })
)
const springOpenResult = farmStore.dailyFruitTreeUpdate('spring', { includeGreenhouse: true })
assert(hasFruit(springOpenResult, 'tree_peach'), '室外桃树春季仍应正常产果。')
assert(hasFruit(springOpenResult, 'tree_lychee'), '温室荔枝树春季也应产果。')

farmStore = createFarmStore(
  createFarmPayload({
    greenhouseFruitTrees: [{ id: 20, slotId: 1, type: 'lychee_tree', growthDays: 27, mature: false, yearAge: 0, todayFruit: false }],
    nextFruitTreeId: 21
  })
)
const matureResult = farmStore.dailyFruitTreeUpdate('winter', { includeGreenhouse: true })
assert(farmStore.greenhouseFruitTrees[0]?.mature === true, '温室果树日结达到 28 天时应成熟。')
assert(hasFruit(matureResult, 'tree_lychee'), '温室果树成熟当日应按现有果树规则产果。')

if (errors.length > 0) {
  console.error('qa:greenhouse-fruit-trees failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa:greenhouse-fruit-trees passed')
