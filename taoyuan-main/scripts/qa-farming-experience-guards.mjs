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

const data = await import(pathToFileURL(path.join(srcRoot, 'data', 'index.ts')).href)
const farmingExperience = await import(pathToFileURL(path.join(srcRoot, 'utils', 'farmingExperience.ts')).href)

const { CROPS } = data
const {
  FARM_HARVEST_EXP_MIN,
  FARM_HARVEST_EXP_MAX,
  FARM_HARVEST_QUALITY_EXP_BONUS,
  getCropHarvestExperience,
  getCropHarvestExperienceCycleDays
} = farmingExperience

assert(FARM_HARVEST_EXP_MIN === 8, 'Harvest XP lower bound should stay modest at 8')
assert(FARM_HARVEST_EXP_MAX === 20, 'Harvest XP upper bound should stay modest at 20')
assert(FARM_HARVEST_QUALITY_EXP_BONUS.normal === 0, 'Normal quality should not add bonus XP')
assert(FARM_HARVEST_QUALITY_EXP_BONUS.fine === 1, 'Fine quality should add only 1 XP')
assert(FARM_HARVEST_QUALITY_EXP_BONUS.excellent === 2, 'Excellent quality should add only 2 XP')
assert(FARM_HARVEST_QUALITY_EXP_BONUS.supreme === 3, 'Supreme quality should add only 3 XP')

for (const crop of CROPS) {
  const normal = getCropHarvestExperience(crop, 'normal')
  const fine = getCropHarvestExperience(crop, 'fine')
  const excellent = getCropHarvestExperience(crop, 'excellent')
  const supreme = getCropHarvestExperience(crop, 'supreme')

  assert(normal >= FARM_HARVEST_EXP_MIN, `${crop.id} normal harvest XP is below floor: ${normal}`)
  assert(supreme <= FARM_HARVEST_EXP_MAX, `${crop.id} supreme harvest XP exceeds cap: ${supreme}`)
  assert(fine >= normal, `${crop.id} fine XP should not be below normal`)
  assert(excellent >= fine, `${crop.id} excellent XP should not be below fine`)
  assert(supreme >= excellent, `${crop.id} supreme XP should not be below excellent`)
  assert(supreme - normal <= 3, `${crop.id} quality spread is too large: ${normal} -> ${supreme}`)
}

const shortCrop = CROPS.find(crop => crop.growthDays <= 4)
const midCrop = CROPS.find(crop => crop.growthDays >= 7 && crop.growthDays <= 8)
const longCrop = CROPS.find(crop => crop.growthDays >= 12) ?? CROPS.reduce((best, crop) => (crop.growthDays > best.growthDays ? crop : best), CROPS[0])

assert(!!shortCrop, 'Expected at least one short-cycle crop for XP guard')
assert(!!midCrop, 'Expected at least one mid-cycle crop for XP guard')
assert(!!longCrop, 'Expected at least one long-cycle crop for XP guard')

if (shortCrop && midCrop && longCrop) {
  const shortXp = getCropHarvestExperience(shortCrop, 'normal')
  const midXp = getCropHarvestExperience(midCrop, 'normal')
  const longXp = getCropHarvestExperience(longCrop, 'normal')
  assert(shortXp <= midXp, `Short-cycle crop XP should not exceed mid-cycle XP: ${shortCrop.id}=${shortXp}, ${midCrop.id}=${midXp}`)
  assert(midXp <= longXp, `Mid-cycle crop XP should not exceed long-cycle XP: ${midCrop.id}=${midXp}, ${longCrop.id}=${longXp}`)
  assert(longXp - shortXp <= 8, `Growth duration spread should remain bounded: ${shortCrop.id}=${shortXp}, ${longCrop.id}=${longXp}`)
}

for (const crop of CROPS.filter(crop => crop.regrowth && crop.regrowthDays)) {
  const firstCycle = getCropHarvestExperienceCycleDays(crop, 0)
  const regrowthCycle = getCropHarvestExperienceCycleDays(crop, 1)
  const firstXp = getCropHarvestExperience(crop, 'normal', { harvestCount: 0 })
  const regrowthXp = getCropHarvestExperience(crop, 'normal', { harvestCount: 1 })
  assert(firstCycle === crop.growthDays, `${crop.id} first harvest should use growthDays`)
  assert(regrowthCycle === crop.regrowthDays, `${crop.id} repeat harvest should use regrowthDays`)
  assert(regrowthXp <= firstXp, `${crop.id} repeat harvest XP should not exceed first harvest XP`)
}

const farmHarvestSource = fs.readFileSync(path.join(srcRoot, 'composables', 'useFarmHarvest.ts'), 'utf8')
const farmActionsSource = fs.readFileSync(path.join(srcRoot, 'composables', 'useFarmActions.ts'), 'utf8')

assert(farmHarvestSource.includes("from '@/utils/farmingExperience'"), 'useFarmHarvest should use shared farming experience formula')
assert(farmActionsSource.includes("from '@/utils/farmingExperience'"), 'useFarmActions should use shared farming experience formula')
assert(!farmHarvestSource.includes("addExp('farming', 10)"), 'useFarmHarvest should not hard-code +10 farming XP')
assert(!farmActionsSource.includes("addExp('farming', 10)"), 'useFarmActions should not hard-code +10 farming XP')
assert(farmHarvestSource.includes('experienceGained'), 'FarmHarvestResult should expose the applied harvest XP')

if (errors.length > 0) {
  console.error('Farming experience guard failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Farming experience guard passed.')
