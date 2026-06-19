/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

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
      // continue trying
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

const readSource = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), 'utf8')
const breedingData = await import(pathToFileURL(path.join(srcRoot, 'data', 'breeding.ts')).href)
const breedingStoreSource = readSource('src', 'stores', 'useBreedingStore.ts')
const breedingViewSource = readSource('src', 'views', 'game', 'BreedingView.vue')
const packageJson = JSON.parse(readSource('package.json'))

const materialMap = materials => Object.fromEntries(materials.map(material => [material.itemId, material.quantity]))
const getSeedBoxUpgrade = level => breedingData.SEED_BOX_UPGRADES.find(upgrade => upgrade.level === level)

assert.equal(breedingData.SEED_BOX_MAX_LEVEL, 25, 'Seed box max level should be 25.')
assert.equal(breedingData.MAX_BREEDING_STATIONS, 10, 'Breeding station max count should be 10.')
assert.equal(breedingData.MAX_BREEDING_BOX, 405, 'Deprecated max breeding box export should reflect the new 405 capacity.')
assert.equal(
  breedingData.BASE_BREEDING_BOX + breedingData.SEED_BOX_MAX_LEVEL * breedingData.SEED_BOX_UPGRADE_INCREMENT,
  405,
  'Seed box capacity formula should resolve to 405 at Lv.25.'
)
assert.equal(
  breedingData.SEED_BOX_UPGRADES.length,
  breedingData.SEED_BOX_MAX_LEVEL,
  'Seed box upgrade table should contain Lv.1 through Lv.25.'
)
assert.deepEqual(
  breedingData.SEED_BOX_UPGRADES.map(upgrade => upgrade.level),
  Array.from({ length: 25 }, (_, index) => index + 1),
  'Seed box upgrade levels should be continuous.'
)

assert.deepEqual(
  breedingData.SEED_BOX_UPGRADES.slice(0, 5).map(upgrade => ({
    level: upgrade.level,
    cost: upgrade.cost,
    materials: materialMap(upgrade.materials)
  })),
  [
    { level: 1, cost: 5000, materials: { wood: 50, copper_bar: 5 } },
    { level: 2, cost: 15000, materials: { iron_bar: 8, pine_resin: 10 } },
    { level: 3, cost: 30000, materials: { gold_bar: 5, cloth: 3, wood: 100 } },
    { level: 4, cost: 50000, materials: { gold_bar: 10, silk_cloth: 5, battery: 3 } },
    { level: 5, cost: 80000, materials: { iridium_bar: 5, dream_silk: 3, moon_herb: 5 } }
  ],
  'Seed box Lv.1-Lv.5 costs should remain unchanged.'
)

assert.equal(getSeedBoxUpgrade(6).cost, 100000, 'Seed box Lv.6 should start the first late-game cost tier.')
assert.equal(getSeedBoxUpgrade(10).cost, 180000, 'Seed box Lv.10 should finish the first late-game cost tier.')
assert.equal(getSeedBoxUpgrade(11).cost, 220000, 'Seed box Lv.11 should start the battery tier.')
assert.equal(getSeedBoxUpgrade(15).cost, 340000, 'Seed box Lv.15 should finish the battery tier.')
assert.equal(getSeedBoxUpgrade(16).cost, 400000, 'Seed box Lv.16 should start the dragon jade tier.')
assert.equal(getSeedBoxUpgrade(20).cost, 600000, 'Seed box Lv.20 should finish the dragon jade tier.')
assert.equal(getSeedBoxUpgrade(21).cost, 700000, 'Seed box Lv.21 should start the prismatic shard tier.')
assert.equal(getSeedBoxUpgrade(25).cost, 1000000, 'Seed box Lv.25 should finish at one million copper.')
assert.deepEqual(materialMap(getSeedBoxUpgrade(25).materials), {
  iridium_bar: 42,
  dream_silk: 28,
  moon_herb: 32,
  battery: 18,
  dragon_jade: 10,
  prismatic_shard: 5
}, 'Seed box Lv.25 should require the final late-game material mix.')

assert.deepEqual(breedingData.getBreedingStationCost(1), breedingData.BREEDING_STATION_COST, 'Station #1 should keep the legacy cost.')
assert.deepEqual(breedingData.getBreedingStationCost(3), breedingData.BREEDING_STATION_COST, 'Station #3 should keep the legacy cost.')
assert.deepEqual(breedingData.getBreedingStationCost(4), {
  money: 150000,
  materials: [
    { itemId: 'wood', quantity: 80 },
    { itemId: 'iron_bar', quantity: 5 },
    { itemId: 'gold_ore', quantity: 8 }
  ]
}, 'Station #4 should use the first expanded cost tier.')
assert.deepEqual(breedingData.getBreedingStationCost(6), {
  money: 220000,
  materials: [
    { itemId: 'wood', quantity: 140 },
    { itemId: 'iron_bar', quantity: 10 },
    { itemId: 'gold_bar', quantity: 3 },
    { itemId: 'battery', quantity: 1 }
  ]
}, 'Station #6 should use the second expanded cost tier.')
assert.deepEqual(breedingData.getBreedingStationCost(8), {
  money: 320000,
  materials: [
    { itemId: 'wood', quantity: 220 },
    { itemId: 'gold_bar', quantity: 8 },
    { itemId: 'iridium_bar', quantity: 2 },
    { itemId: 'battery', quantity: 2 }
  ]
}, 'Station #8 should use the third expanded cost tier.')
assert.deepEqual(breedingData.getBreedingStationCost(10), {
  money: 450000,
  materials: [
    { itemId: 'wood', quantity: 300 },
    { itemId: 'iridium_bar', quantity: 4 },
    { itemId: 'dragon_jade', quantity: 1 },
    { itemId: 'dream_silk', quantity: 1 }
  ]
}, 'Station #10 should use the final cost tier.')
assert.deepEqual(breedingData.getBreedingStationCost(11), breedingData.getBreedingStationCost(10), 'Station cost lookup should clamp above the max.')

const mutableCost = breedingData.getBreedingStationCost(4)
mutableCost.materials[0].quantity = 1
assert.equal(breedingData.getBreedingStationCost(4).materials[0].quantity, 80, 'Station cost lookup should return cloned material entries.')

assert.match(breedingStoreSource, /SEED_BOX_MAX_LEVEL/, 'Breeding store should import and use the seed box max level.')
assert.match(breedingStoreSource, /getCurrentStationCost\s*=\s*\(\)\s*=>\s*getBreedingStationCost\(stationCount\.value \+ 1\)/, 'Breeding store should price stations from the next station number.')
assert.match(breedingStoreSource, /Math\.min\(SEED_BOX_MAX_LEVEL,\s*Math\.max\(0,\s*rawSeedBoxLevel\)\)/, 'Breeding store should clamp deserialized seed box level to Lv.25.')
assert.match(breedingViewSource, /nextStationNumber\s*=\s*computed\(\(\)\s*=>\s*Math\.min\(MAX_BREEDING_STATIONS,\s*breedingStore\.stationCount \+ 1\)\)/, 'Breeding view should show the next station number.')
assert.match(breedingViewSource, /nextStationCost\s*=\s*computed\(\(\)\s*=>\s*getBreedingStationCost\(nextStationNumber\.value\)\)/, 'Breeding view should price the craft modal with dynamic station costs.')
assert.match(breedingViewSource, /nextStationCost\.value\.materials/, 'Breeding view material list should use dynamic station costs.')
assert.match(breedingViewSource, /playerStore\.money >= nextStationCost\.money/, 'Breeding view money preview should use dynamic station costs.')
assert.equal(packageJson.scripts['qa:breeding-capacity-guards'], 'node scripts/qa-breeding-capacity-guards.mjs', 'Package script should expose the breeding capacity guard.')

console.log('qa-breeding-capacity-guards passed: Lv.25 seed box and 10 breeding stations are guarded.')
