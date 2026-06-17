/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProject = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), 'utf8')

const animalStoreSource = readProject('src', 'stores', 'useAnimalStore.ts')
const animalViewSource = readProject('src', 'views', 'game', 'AnimalView.vue')
const endDaySource = readProject('src', 'composables', 'useEndDay.ts')
const farmingExperienceSource = readProject('src', 'utils', 'farmingExperience.ts')

const grazeBlock = animalStoreSource.slice(
  animalStoreSource.indexOf('const grazeAnimals ='),
  animalStoreSource.indexOf('/** 饥饿致死天数上限 */')
)
assert.ok(animalStoreSource.includes('const isAnimalReadyForGrazingProduct'), 'grazing should have an explicit production readiness helper')
assert.ok(animalStoreSource.includes('const effectiveDays = getEffectiveAnimalProduceDays(def, animal.fedWith)'), 'grazing should use the same effective production cycle as daily production')
assert.ok(animalStoreSource.includes('animal.daysSinceProduct + 1 >= effectiveDays'), 'grazing should only pull forward products that would mature at end of day')
assert.ok(grazeBlock.includes('isAnimalReadyForGrazingProduct(animal, def)'), 'grazing should not grant products before the animal cycle matures')
assert.ok(!grazeBlock.includes('animal.fedWith = null'), 'grazing should not erase special feed effects before production checks')
assert.ok(grazeBlock.includes('animal.pastureProducedToday = true'), 'grazing products should mark the animal as already produced today')
assert.ok(grazeBlock.includes('animal.daysSinceProduct = 0'), 'grazing products should reset the production timer')

const dailyBlock = animalStoreSource.slice(
  animalStoreSource.indexOf('const dailyUpdate ='),
  animalStoreSource.indexOf('/** 出售动物')
)
assert.ok(dailyBlock.includes('if (!animal.pastureProducedToday)'), 'daily update should skip production timer growth after grazing harvest')
assert.ok(dailyBlock.includes('animal.daysSinceProduct++'), 'daily update should still advance ungrazed animal production timers')
assert.ok(dailyBlock.includes('getEffectiveAnimalProduceDays(def, animal.fedWith)'), 'daily update should share the effective production cycle helper')
assert.ok(dailyBlock.includes('buildAnimalProductGrantFromDef(def, quality, productQty)'), 'daily base production should include animal product experience metadata')
assert.ok(dailyBlock.includes('experience: 0'), 'rare rabbit foot side drops should not grant cycle-based animal product experience')

assert.ok(animalStoreSource.includes('type AnimalProductGrant = { animalType: AnimalType; itemId: string; quality: Quality; quantity: number; experience: number }'), 'animal product grants should carry experience metadata')
assert.ok(animalStoreSource.includes('experience: getAnimalProductExperience(def, quality, quantity)'), 'animal product grants should derive experience from the shared formula')
assert.ok(farmingExperienceSource.includes('export const getAnimalProductExperience'), 'animal product experience formula should live with farming experience helpers')
assert.ok(farmingExperienceSource.includes('ANIMAL_PRODUCT_EXP_MIN = 3'), 'animal product XP should keep a modest lower bound')
assert.ok(farmingExperienceSource.includes('ANIMAL_PRODUCT_EXP_MAX = 12'), 'animal product XP should keep a bounded per-product cap')

assert.ok(animalViewSource.includes("skillStore.addExp('farming', experienceGained)"), 'manual grazing harvest should award farming experience')
assert.ok(animalViewSource.includes('result.products?.reduce((sum, product) => sum + product.experience, 0)'), 'manual grazing should sum product experience from grants')
assert.ok(endDaySource.includes("skillStore.addExp('farming', animalProductExperience)"), 'daily animal harvest should award farming experience')
assert.ok(endDaySource.includes('animalResult.products.reduce((sum, product) => sum + product.experience, 0)'), 'daily animal harvest should sum product experience from grants')
assert.ok(endDaySource.includes('(+${animalProductExperience}农耕经验)'), 'daily animal harvest log should show gained farming experience')

console.log('qa-animal-production-guards passed')
