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
const animalTypeSource = readProject('src', 'types', 'animal.ts')
const animalViewSource = readProject('src', 'views', 'game', 'AnimalView.vue')
const endDaySource = readProject('src', 'composables', 'useEndDay.ts')
const farmingExperienceSource = readProject('src', 'utils', 'farmingExperience.ts')

// Independent timer architecture: grazing and daily production each have their own cycle

// Type definition: Animal should have two independent timers, no pastureProducedToday
assert.ok(animalTypeSource.includes('daysSinceAutoProduct: number'), 'Animal type should have daysSinceAutoProduct')
assert.ok(animalTypeSource.includes('daysSinceGrazingProduct: number'), 'Animal type should have daysSinceGrazingProduct')
assert.ok(!animalTypeSource.includes('pastureProducedToday'), 'Animal type should no longer have pastureProducedToday')

// Store: grazing uses grazing timer
assert.ok(animalStoreSource.includes('return animal.daysSinceGrazingProduct + 1 >= effectiveDays'), 'grazing readiness should use daysSinceGrazingProduct')
assert.ok(animalStoreSource.includes('animal.daysSinceGrazingProduct = 0'), 'grazing products should reset the grazing timer')

// Store: daily update uses auto timer, always increments
assert.ok(animalStoreSource.includes('animal.daysSinceAutoProduct++'), 'daily update should always advance the auto production timer')
assert.ok(animalStoreSource.includes('animal.daysSinceAutoProduct >= effectiveDays'), 'daily production should check daysSinceAutoProduct')
assert.ok(animalStoreSource.includes('animal.daysSinceAutoProduct = 0'), 'daily production should reset the auto production timer')

// Store: both paths use effective cycle helper and build grants with experience
assert.ok(animalStoreSource.includes('getEffectiveAnimalProduceDays(def, animal.fedWith)'), 'daily update should use the effective production cycle helper')
assert.ok(animalStoreSource.includes('buildAnimalProductGrantFromDef(def, quality, productQty)'), 'daily base production should build product grants with experience')
assert.ok(animalStoreSource.includes('experience: 0'), 'rare rabbit foot side drops should not grant cycle-based animal product experience')

// Animal product experience formula
assert.ok(animalStoreSource.includes('type AnimalProductGrant = { animalType: AnimalType; itemId: string; quality: Quality; quantity: number; experience: number }'), 'animal product grants should carry experience metadata')
assert.ok(animalStoreSource.includes('experience: getAnimalProductExperience(def, quality, quantity)'), 'animal product grants should derive experience from the shared formula')
assert.ok(farmingExperienceSource.includes('export const getAnimalProductExperience'), 'animal product experience formula should live with farming experience helpers')
assert.ok(farmingExperienceSource.includes('ANIMAL_PRODUCT_EXP_MIN = 3'), 'animal product XP should keep a modest lower bound')
assert.ok(farmingExperienceSource.includes('ANIMAL_PRODUCT_EXP_MAX = 12'), 'animal product XP should keep a bounded per-product cap')

// Grazing and daily production both award farming experience
assert.ok(animalViewSource.includes("skillStore.addExp('farming', experienceGained)"), 'manual grazing harvest should award farming experience')
assert.ok(animalViewSource.includes('result.products?.reduce((sum, product) => sum + product.experience, 0)'), 'manual grazing should sum product experience from grants')
assert.ok(endDaySource.includes("skillStore.addExp('farming', animalProductExperience)"), 'daily animal harvest should award farming experience')
assert.ok(endDaySource.includes('animalResult.products.reduce((sum, product) => sum + product.experience, 0)'), 'daily animal harvest should sum product experience from grants')

// Save migration: normalizeAnimalSave should handle legacy daysSinceProduct
assert.ok(animalStoreSource.includes('daysSinceAutoProduct: Number.isFinite(animal?.daysSinceAutoProduct)'), 'normalizeAnimalSave should read daysSinceAutoProduct with legacy fallback')
assert.ok(animalStoreSource.includes('daysSinceGrazingProduct: Number.isFinite(animal?.daysSinceGrazingProduct)'), 'normalizeAnimalSave should read daysSinceGrazingProduct with legacy fallback')

console.log('qa-animal-production-guards passed')
