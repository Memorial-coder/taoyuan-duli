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
globalThis.localStorage = localStorageStub
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
      if (!resolved) throw new Error(`Unable to resolve module: ${specifier}`)
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

const createPlot = id => ({
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
})

const createFarmPayload = overrides => ({
  farmSize: 4,
  plots: Array.from({ length: 16 }, (_, id) => createPlot(id)),
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

const createFarmStore = (payload = createFarmPayload()) => {
  setActivePinia(createPinia())
  const farmStore = useFarmStore()
  farmStore.deserialize(payload)
  return farmStore
}

const forceHarvestable = (plot, cropId, harvestCount = 0) => {
  plot.cropId = cropId
  plot.state = 'harvestable'
  plot.growthDays = 99
  plot.harvestCount = harvestCount
}

const withRandomSequence = (values, fn) => {
  const originalRandom = Math.random
  let index = 0
  Math.random = () => values[Math.min(index++, values.length - 1)] ?? 0
  try {
    return fn()
  } finally {
    Math.random = originalRandom
  }
}

let farmStore = createFarmStore()
assert(farmStore.tillPlot(0), 'field plot should be tillable')
assert(farmStore.plantCrop(0, 'cabbage'), 'field plot should accept a normal crop')
assert(farmStore.applyFertilizer(0, 'quality_fertilizer'), 'field plot should accept fertilizer')
forceHarvestable(farmStore.plots[0], 'cabbage')
const fieldHarvest = farmStore.harvestPlot(0)
assert(fieldHarvest.cropId === 'cabbage', 'field harvest should return the crop id')
assert(farmStore.plots[0].state === 'tilled', 'field harvest should return the plot to tilled')
assert(farmStore.plots[0].cropId === null, 'field harvest should clear the crop')
assert(farmStore.plots[0].fertilizer === 'quality_fertilizer', 'field harvest should retain fertilizer in tilled soil')

farmStore = createFarmStore()
assert(farmStore.tillPlot(1), 'field regrowth plot should be tillable')
assert(farmStore.plantCrop(1, 'tea'), 'field regrowth plot should accept tea')
assert(farmStore.applyFertilizer(1, 'speed_gro'), 'field regrowth plot should accept speed gro')
forceHarvestable(farmStore.plots[1], 'tea', 2)
farmStore.harvestPlot(1)
assert(farmStore.plots[1].state === 'tilled', 'field final regrowth harvest should return the plot to tilled')
assert(farmStore.plots[1].fertilizer === 'speed_gro', 'field final regrowth harvest should retain fertilizer')

farmStore = createFarmStore()
assert(farmStore.tillPlot(2), 'pest-loss plot should be tillable')
assert(farmStore.plantCrop(2, 'cabbage'), 'pest-loss plot should accept a crop')
assert(farmStore.applyFertilizer(2, 'quality_fertilizer'), 'pest-loss plot should accept fertilizer')
farmStore.plots[2].infested = true
farmStore.plots[2].infestedDays = 2
farmStore.dailyUpdate(false)
assert(farmStore.plots[2].state === 'tilled', 'pest death should return the plot to tilled')
assert(farmStore.plots[2].fertilizer === 'quality_fertilizer', 'pest death should retain fertilizer')

farmStore = createFarmStore()
assert(farmStore.tillPlot(3), 'unwatered-loss plot should be tillable')
assert(farmStore.plantCrop(3, 'cabbage'), 'unwatered-loss plot should accept a crop')
assert(farmStore.applyFertilizer(3, 'retaining_soil'), 'unwatered-loss plot should accept fertilizer')
farmStore.plots[3].unwateredDays = 1.5
farmStore.dailyUpdate(false)
assert(farmStore.plots[3].state === 'tilled', 'unwatered death should return the plot to tilled')
assert(farmStore.plots[3].fertilizer === 'retaining_soil', 'unwatered death should retain fertilizer')

farmStore = createFarmStore()
assert(farmStore.tillPlot(4), 'lightning-loss plot should be tillable')
assert(farmStore.plantCrop(4, 'cabbage'), 'lightning-loss plot should accept a crop')
assert(farmStore.applyFertilizer(4, 'speed_gro'), 'lightning-loss plot should accept fertilizer')
withRandomSequence([0, 0], () => farmStore.lightningStrike())
assert(farmStore.plots[4].state === 'tilled', 'lightning strike should return the plot to tilled')
assert(farmStore.plots[4].fertilizer === 'speed_gro', 'lightning strike should retain fertilizer')

farmStore = createFarmStore()
assert(farmStore.tillPlot(5), 'crow-loss plot should be tillable')
assert(farmStore.plantCrop(5, 'cabbage'), 'crow-loss plot should accept a crop')
assert(farmStore.applyFertilizer(5, 'quality_fertilizer'), 'crow-loss plot should accept fertilizer')
withRandomSequence([0, 0], () => farmStore.crowAttack())
assert(farmStore.plots[5].state === 'tilled', 'crow attack should return the plot to tilled')
assert(farmStore.plots[5].fertilizer === 'quality_fertilizer', 'crow attack should retain fertilizer')

farmStore = createFarmStore()
assert(farmStore.tillPlot(6), 'season reclamation plot should be tillable')
assert(farmStore.applyFertilizer(6, 'quality_fertilizer'), 'season reclamation plot should accept fertilizer')
withRandomSequence([0], () => farmStore.onSeasonChange('spring'))
assert(farmStore.plots[6].state === 'wasteland', 'season reclamation should return old empty tilled plots to wasteland')
assert(farmStore.plots[6].fertilizer === null, 'season reclamation should clear fertilizer only when soil returns to wasteland')

farmStore = createFarmStore()
const giantPlotIds = [0, 1, 2, 4, 5, 6, 8, 9, 10]
for (const plotId of giantPlotIds) {
  const plot = farmStore.plots[plotId]
  plot.state = 'harvestable'
  plot.cropId = 'cabbage'
  plot.growthDays = 99
  plot.fertilizer = 'basic_fertilizer'
  plot.giantCropGroup = 7
}
const giantHarvest = farmStore.harvestGiantCrop(0)
assert(giantHarvest?.cropId === 'cabbage', 'giant crop harvest should return the crop id')
assert(
  giantPlotIds.every(plotId => farmStore.plots[plotId].state === 'tilled' && farmStore.plots[plotId].fertilizer === 'basic_fertilizer'),
  'giant crop harvest should retain fertilizer on every returned tilled plot'
)

farmStore = createFarmStore()
farmStore.initGreenhouse()
assert(farmStore.greenhousePlantCrop(0, 'cabbage'), 'greenhouse plot should accept a normal crop')
assert(farmStore.applyGreenhouseFertilizer(0, 'quality_retaining_soil'), 'greenhouse plot should accept fertilizer')
forceHarvestable(farmStore.greenhousePlots[0], 'cabbage')
const greenhouseHarvest = farmStore.greenhouseHarvestPlot(0)
assert(greenhouseHarvest === 'cabbage', 'greenhouse harvest should return the crop id')
assert(farmStore.greenhousePlots[0].state === 'tilled', 'greenhouse harvest should return the plot to tilled')
assert(farmStore.greenhousePlots[0].fertilizer === 'quality_retaining_soil', 'greenhouse harvest should retain fertilizer')

farmStore = createFarmStore()
farmStore.initGreenhouse()
assert(farmStore.greenhousePlantCrop(1, 'tea'), 'greenhouse regrowth plot should accept tea')
assert(farmStore.applyGreenhouseFertilizer(1, 'speed_gro'), 'greenhouse regrowth plot should accept speed gro')
forceHarvestable(farmStore.greenhousePlots[1], 'tea', 2)
farmStore.greenhouseHarvestPlot(1)
assert(farmStore.greenhousePlots[1].state === 'tilled', 'greenhouse final regrowth harvest should return the plot to tilled')
assert(farmStore.greenhousePlots[1].fertilizer === 'speed_gro', 'greenhouse final regrowth harvest should retain fertilizer')

if (errors.length > 0) {
  console.error('qa:fertilizer-retention failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa:fertilizer-retention passed')
