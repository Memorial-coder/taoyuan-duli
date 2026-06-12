import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const readSource = relativePath => readFileSync(resolve(root, relativePath), 'utf8')

const fishPondData = readSource('src/data/fishPond.ts')
const fishPondStore = readSource('src/stores/useFishPondStore.ts')
const fishPondView = readSource('src/views/game/FishPondView.vue')

const extractPondableBlock = fishId => {
  const match = fishPondData.match(new RegExp(`\\{[\\s\\S]*?fishId: '${fishId}'[\\s\\S]*?\\n  \\}`))
  assert.ok(match, `${fishId} should be present in PONDABLE_FISH`)
  return match[0]
}

const assertLegendaryPondResident = ({ fishId, productItemId, minPondLevel, maxProductionRate }) => {
  const block = extractPondableBlock(fishId)
  assert.match(block, new RegExp(`minPondLevel: ${minPondLevel}`), `${fishId} should require a late pond level`)
  assert.match(block, /allowBreeding: false/, `${fishId} should not be breedable`)
  assert.match(block, /productionWeightBonusMultiplier: 0/, `${fishId} should not gain rare-product rate from weight genes`)
  assert.match(block, /productionSkillBonusMultiplier: 0/, `${fishId} should not gain rare-product rate from mastery bonuses`)
  assert.match(block, new RegExp(`maxProductionRate: ${maxProductionRate}`), `${fishId} should cap rare-product rate`)
  assert.match(block, new RegExp(`productItemId: '${productItemId}'`), `${fishId} should produce only its protected byproduct`)
  assert.doesNotMatch(block, new RegExp(`productItemId: '${fishId}'`), `${fishId} must not copy itself as pond output`)
}

assertLegendaryPondResident({
  fishId: 'golden_turtle',
  productItemId: 'dragon_jade',
  minPondLevel: 5,
  maxProductionRate: 0.025
})

assertLegendaryPondResident({
  fishId: 'giant_salamander',
  productItemId: 'luminous_algae',
  minPondLevel: 4,
  maxProductionRate: 0.03
})

assert.match(fishPondStore, /if \(def\.minPondLevel && pond\.value\.level < def\.minPondLevel\) return 0/, 'addFish should enforce minimum pond level')
assert.match(fishPondStore, /if \(def\?\.allowBreeding === false\) return false/, 'startBreeding should reject non-breedable pond residents')
assert.match(fishPondStore, /if \(def\?\.allowBreeding === false\) return null/, 'save normalization should drop non-breedable breeding pairs')
assert.match(fishPondStore, /def\.productionWeightBonusMultiplier \?\? 1/, 'daily production should support per-fish weight bonus scaling')
assert.match(fishPondStore, /def\.productionSkillBonusMultiplier \?\? 1/, 'daily production should support per-fish skill bonus scaling')
assert.match(fishPondStore, /def\.maxProductionRate \?\? 1/, 'daily production should cap protected rare byproducts')

assert.match(fishPondView, /def\.minPondLevel && fishPondStore\.pond\.level < def\.minPondLevel/, 'stocking UI should hide fish above the current pond level')
assert.match(fishPondView, /detailFishCanBreed/, 'detail modal should hide breeding for protected legendary fish')
assert.match(fishPondView, /只能驻塘展示，不能繁殖/, 'breeding failure feedback should explain protected legendary fish')
