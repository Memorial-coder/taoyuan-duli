import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')
const errors = []

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

const breedingViewSource = fs.readFileSync(path.join(srcRoot, 'views', 'game', 'BreedingView.vue'), 'utf8')
const breedingStoreSource = fs.readFileSync(path.join(srcRoot, 'stores', 'useBreedingStore.ts'), 'utf8')
const breedingTypesSource = fs.readFileSync(path.join(srcRoot, 'types', 'breeding.ts'), 'utf8')
const breedingData = await import(pathToFileURL(path.join(srcRoot, 'data', 'breeding.ts')).href)

assert(
  breedingData.findPossibleHybrid('cabbage', 'ancient_fruit') === null,
  'cabbage + ancient_fruit should remain a no-recipe cross for this guard.'
)
assert(
  breedingViewSource.includes('if (a.cropId !== b.cropId && !hybrid) return null'),
  'Offspring preview must not show averaged stats for different-crop no-recipe crosses.'
)
assert(
  breedingViewSource.includes("type: 'no_recipe' as const") &&
    breedingViewSource.includes('parentNames') &&
    breedingViewSource.includes('failedPenalty'),
  'No-recipe hint must expose parent names and the failure penalty.'
)
assert(
  breedingViewSource.includes('按失败杂交处理') &&
    breedingViewSource.includes('随机返还') &&
    breedingViewSource.includes('单项属性'),
  'No-recipe hint must explain the actual failure outcome.'
)
assert(
  breedingViewSource.includes('失败时会随机返还一颗亲本副本'),
  'Known-recipe stat failures must also disclose the same failure outcome.'
)
assert(
  breedingTypesSource.includes('export interface BreedingFailureProgressEntry') &&
    breedingTypesSource.includes('breakthroughProgress') &&
    breedingTypesSource.includes('breakthroughReady'),
  'Breeding types must expose target-specific failure breakthrough progress.'
)
assert(
  breedingStoreSource.includes('failureProgressByHybridId') &&
    breedingStoreSource.includes('recordFailureProgress') &&
    breedingStoreSource.includes('clearFailureProgress(hybrid.id)'),
  'Breeding store must persist, accumulate, and consume failure breakthrough progress.'
)
assert(
  breedingStoreSource.includes('breakthroughApplied') &&
    breedingStoreSource.includes('effectiveAvgSweetness') &&
    breedingStoreSource.includes('effectiveAvgYield'),
  'Breakthrough-ready crosses must use accumulated progress to satisfy gate thresholds.'
)
assert(
  breedingViewSource.includes('突破进度') &&
    breedingViewSource.includes('本次可用失败积累补足门槛') &&
    breedingViewSource.includes('breedingStore.hybridAvailabilityMap'),
  'Breeding UI must make failure breakthrough progress visible in planning and cross preview.'
)

if (errors.length > 0) {
  console.error('Breeding preview guard QA failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Breeding preview guard QA passed: no-recipe crosses no longer show averaged offspring stats.')
