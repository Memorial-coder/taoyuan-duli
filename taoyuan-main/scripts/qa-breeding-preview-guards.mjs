/* global console, process */
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
const npcFunctionEffectsSource = fs.readFileSync(path.join(srcRoot, 'data', 'npcFunctionEffects.ts'), 'utf8')
const breedingData = await import(pathToFileURL(path.join(srcRoot, 'data', 'breeding.ts')).href)
const cropsData = await import(pathToFileURL(path.join(srcRoot, 'data', 'crops.ts')).href)

const tierCounts = [100, 50, 50, 50, 25, 25, 25, 25, 25, 27]
let tierOffset = 0
const highTierHybridRows = []
for (let tier = 1; tier <= tierCounts.length; tier += 1) {
  for (let index = 0; index < tierCounts[tier - 1]; index += 1) {
    const hybrid = breedingData.HYBRID_DEFS[tierOffset + index]
    if (hybrid && tier >= 8) highTierHybridRows.push({ tier, hybrid })
  }
  tierOffset += tierCounts[tier - 1]
}
const highTierCropRows = highTierHybridRows.map(row => ({
  tier: row.tier,
  hybridId: row.hybrid.id,
  crop: cropsData.getCropById(row.hybrid.resultCropId)
}))
const winterAdaptiveHighTierRows = highTierCropRows.filter(row => row.crop?.season.includes('winter'))
const winterAdaptiveTiers = new Set(winterAdaptiveHighTierRows.map(row => row.tier))
const highTierCropIds = new Set(highTierCropRows.map(row => row.crop?.id).filter(Boolean))
const explicitWinterAdaptiveCropIds = cropsData.HIGH_TIER_BREEDING_WINTER_ADAPTIVE_CROP_IDS ?? []

assert(
  breedingData.findPossibleHybrid('cabbage', 'ancient_fruit') === null,
  'cabbage + ancient_fruit should remain a no-recipe cross for this guard.'
)
assert(
  Array.isArray(explicitWinterAdaptiveCropIds) &&
    explicitWinterAdaptiveCropIds.length >= 30 &&
    explicitWinterAdaptiveCropIds.every(cropId => cropsData.getCropById(cropId) && highTierCropIds.has(cropId)),
  'High-tier breeding winter adaptation must stay explicit and cover a meaningful subset of T8+ crops.'
)
assert(
  winterAdaptiveHighTierRows.length >= 30 && winterAdaptiveHighTierRows.length < highTierCropRows.length,
  'T8+ breeding crops should include a meaningful winter-adaptive subset without making every ultimate crop winter-safe.'
)
assert(
  [8, 9, 10].every(tier => winterAdaptiveTiers.has(tier)),
  'Winter-adaptive high-tier breeding crops must span T8, T9, and T10.'
)
assert(
  highTierCropRows.every(row => row.crop),
  'Every T8+ hybrid result crop must resolve to a crop definition.'
)
assert(
  breedingTypesSource.includes("'crop'") &&
    breedingTypesSource.includes("export type SeedSortKey = 'default' | 'crop'"),
  'Breeding seed sort type must include the crop grouping option.'
)
assert(
  breedingViewSource.includes("{ value: 'crop', label: '同种' }"),
  'Breeding seed sort buttons must expose a same-crop grouping option.'
)
assert(
  breedingStoreSource.includes("case 'crop':") &&
    breedingStoreSource.includes('compareByCrop') &&
    breedingStoreSource.includes('a.genetics.cropId.localeCompare(b.genetics.cropId)') &&
    breedingStoreSource.includes('b.genetics.generation - a.genetics.generation'),
  'Breeding store must sort visible seeds by crop, then generation, then total stats.'
)
assert(
  breedingViewSource.includes('const displayedBreedingSeeds = computed(() => breedingStore.visibleBreedingBox)') &&
    breedingViewSource.includes('v-for="seed in displayedBreedingSeeds"'),
  'Breeding station selection must keep using the visible seed box list so crop grouping applies there too.'
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
  breedingStoreSource.includes('const FAILURE_BREAKTHROUGH_REQUIRED = 180') &&
    breedingStoreSource.includes('const FAILURE_PROGRESS_MIN_GAIN = 5') &&
    breedingStoreSource.includes('const FAILURE_PROGRESS_MAX_GAIN = 24') &&
    breedingStoreSource.includes('const FAILURE_PROGRESS_CLOSE_GAP_WINDOW = 24') &&
    breedingStoreSource.includes('const FAILURE_PROGRESS_BASE_GAIN = 5') &&
    breedingStoreSource.includes('const FAILURE_PROGRESS_MAX_GENERATION_BONUS = 4') &&
    breedingStoreSource.includes('const FAILURE_PROGRESS_RESEARCH_BONUS = 2'),
  'Breeding breakthrough pity must stay slower than the original 100-point fast guarantee.'
)
assert(
  breedingStoreSource.includes('FAILURE_BREAKTHROUGH_REQUIRED,') &&
    breedingStoreSource.includes('Math.round(Number(entry.required) || FAILURE_BREAKTHROUGH_REQUIRED)'),
  'Old breeding failure progress saves must normalize up to the current breakthrough threshold.'
)
assert(
  breedingViewSource.includes('突破进度') &&
    breedingViewSource.includes('本次可用失败积累补足门槛') &&
    breedingViewSource.includes('breedingStore.hybridAvailabilityMap'),
  'Breeding UI must make failure breakthrough progress visible in planning and cross preview.'
)
assert(
  npcFunctionEffectsSource.includes('breeding_boost'),
  'breeding_boost should be registered in the NPC function effect registry.'
)
assert(
  breedingStoreSource.includes("const npcBreedingBoost = npcStore.getNpcFunctionEffectValue('breeding_boost')") &&
    breedingStoreSource.includes('Math.max(1, BREEDING_DAYS - highGenReduction - Math.floor(npcBreedingBoost / 15))'),
  'Breeding start should apply breeding_boost to real station duration while keeping a one-day floor.'
)
assert(
  breedingStoreSource.includes('useGoalStore().recordWeeklyActivityCounter(\'breeding_started\', 1)'),
  'NPC breeding duration boosts should stay on the normal breeding-start path instead of creating a separate bypass.'
)

if (errors.length > 0) {
  console.error('Breeding preview guard QA failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Breeding preview guard QA passed: cross previews and high-tier winter adaptation are covered.')
