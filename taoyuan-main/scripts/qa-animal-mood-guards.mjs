/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProject = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), 'utf8')

const animalTypesSource = readProject('src', 'types', 'animal.ts')
assert.ok(animalTypesSource.includes('export interface PetState'), 'pet state should stay typed')
assert.ok(animalTypesSource.includes('mood: number'), 'pet state should persist mood')

const animalStoreSource = readProject('src', 'stores', 'useAnimalStore.ts')
for (const needle of [
  'ANIMAL_HAPPY_EXTRA_PRODUCT_CHANCE = 0.1',
  'ANIMAL_ELATED_EXTRA_PRODUCT_CHANCE = 0.2',
  'PET_SPECIAL_FEED_MOOD_GAIN = 30',
  'PET_PREFERRED_FEED_MOOD_GAIN = 10',
  'HORSE_HAPPY_TRAVEL_MULTIPLIER = 0.6',
  'HORSE_ELATED_TRAVEL_MULTIPLIER = 0.55',
  'HORSE_HAPPY_STAMINA_MULTIPLIER = 0.4'
]) {
  assert.ok(animalStoreSource.includes(needle), `animal mood rules should include ${needle}`)
}

assert.ok(animalStoreSource.includes('const clampMood = (value: number, fallback = PET_MOOD_DEFAULT): number'), 'mood clamp should protect legacy saves')
assert.ok(animalStoreSource.includes('const getAnimalMoodProductBonusChance'), 'animal product mood chance helper should exist')
assert.ok(animalStoreSource.includes('const rollPetMoodChance'), 'pet event chance should be mood-aware')
assert.ok(animalStoreSource.includes('horseTravelMultiplier = computed'), 'horse travel multiplier should be exported from animal store')
assert.ok(animalStoreSource.includes('horseStaminaMultiplier = computed'), 'horse stamina multiplier should be exported from animal store')
assert.ok(animalStoreSource.includes('companion.mood = clampMood(companion.mood + PET_PETTING_MOOD_GAIN)'), 'petting should raise pet mood')
assert.ok(animalStoreSource.includes('companion.mood = clampMood(companion.mood + moodGain)'), 'special feeding should raise pet mood')
assert.ok(animalStoreSource.includes('getPetMoodRareFindModifier(companion.mood)'), 'special feed rare finds should read pet mood')
assert.ok(animalStoreSource.includes('rollPetMoodChance(0.12, companion.mood)'), 'gift event should read pet mood')
assert.ok(animalStoreSource.includes('rollPetMoodChance(0.18, companion.mood)'), 'festival event should read pet mood')
assert.ok(animalStoreSource.includes('rollPetMoodChance(0.14, companion.mood)'), 'rumor event should read pet mood')
assert.ok(animalStoreSource.includes('const moodBonusChance = getAnimalMoodProductBonusChance(animal.mood)'), 'animal production should roll a mood bonus')
assert.ok(animalStoreSource.includes("products.push({ itemId: def.productId, quality, quantity: 1 })"), 'mood bonus should add one extra product')
assert.ok(animalStoreSource.includes('mood: Number.isFinite(savedPet.mood) ? clampMood(savedPet.mood) : PET_MOOD_DEFAULT'), 'legacy pet saves should receive default mood')

const gameStoreSource = readProject('src', 'stores', 'useGameStore.ts')
assert.ok(gameStoreSource.includes('const horseMultiplier = animalStore.horseTravelMultiplier'), 'travel time should use horse mood multiplier')
assert.ok(gameStoreSource.includes('animalStore.horseStaminaMultiplier'), 'travel stamina should use horse mood multiplier')

const animalViewSource = readProject('src', 'views', 'game', 'AnimalView.vue')
assert.ok(animalViewSource.includes('getMoodBarColor(companion.mood)'), 'pet card should color mood')
assert.ok(animalViewSource.includes('(companion.mood / 255) * 100'), 'pet card should show mood percentage')
assert.ok(animalViewSource.includes('getMoodText(companion.mood)'), 'pet card should label mood')

console.log('qa-animal-mood-guards passed')
