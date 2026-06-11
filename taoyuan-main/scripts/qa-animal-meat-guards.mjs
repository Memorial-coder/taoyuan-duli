/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')

const readProject = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), 'utf8')
const readRepo = (...segments) => fs.readFileSync(path.join(repoRoot, ...segments), 'utf8')

const getObjectBlock = (source, id) => {
  const start = source.indexOf(`id: '${id}'`)
  assert.notEqual(start, -1, `missing object id: ${id}`)
  const next = source.indexOf('\n  {', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

const assertBlockIncludes = (source, id, needle, label) => {
  const block = getObjectBlock(source, id)
  assert.ok(block.includes(needle), `${label} should include ${needle}`)
}

const animalStoreSource = readProject('src', 'stores', 'useAnimalStore.ts')
assert.ok(animalStoreSource.includes("const MEAT_ITEM_ID = 'wild_meat'"), 'pasture meat should reuse wild_meat')
assert.ok(animalStoreSource.includes('processAnimalForMeat'), 'animal store should expose processAnimalForMeat')
assert.ok(animalStoreSource.includes("animal.type === 'horse'"), 'horses should be blocked from meat processing')
assert.ok(animalStoreSource.includes('animal.daysOwned < 1'), 'same-day animals should be blocked from meat processing')
assert.ok(animalStoreSource.includes('inventoryStore.addItemExact(MEAT_ITEM_ID'), 'meat should be added before animal removal')
const processAnimalForMeatBlock = animalStoreSource.slice(
  animalStoreSource.indexOf('const processAnimalForMeat'),
  animalStoreSource.indexOf('/** 治疗单只生病的动物')
)
assert.ok(processAnimalForMeatBlock.includes('inventoryStore.addItemExact(MEAT_ITEM_ID'), 'processAnimalForMeat should add meat to inventory')
assert.ok(processAnimalForMeatBlock.includes('animals.value.splice(idx, 1)'), 'processAnimalForMeat should remove the animal after success')
assert.ok(processAnimalForMeatBlock.indexOf('inventoryStore.addItemExact(MEAT_ITEM_ID') < processAnimalForMeatBlock.indexOf('animals.value.splice(idx, 1)'), 'animal should only be removed after meat is added')

const animalViewSource = readProject('src', 'views', 'game', 'AnimalView.vue')
assert.ok(animalViewSource.includes('取肉确认'), 'animal UI should include a meat confirmation dialog')
assert.ok(animalViewSource.includes('该动物会永久离开牧场'), 'meat confirmation should warn about permanent removal')
assert.ok(animalViewSource.includes('confirmProcessAnimalForMeat'), 'animal UI should confirm meat processing')
assert.ok(animalViewSource.includes('ACTION_TIME_COSTS.processAnimalForMeat'), 'meat processing should advance time')

const timeSource = readProject('src', 'data', 'timeConstants.ts')
assert.ok(timeSource.includes('processAnimalForMeat: 1'), 'animal meat processing should cost 1 hour')

const itemsSource = readProject('src', 'data', 'items.ts')
assert.ok(itemsSource.includes("id: 'wild_meat'"), 'wild_meat item should exist')
assert.ok(itemsSource.includes('牧场动物取肉'), 'wild_meat source should mention pasture animal meat')

const recipesSource = readProject('src', 'data', 'recipes.ts')
for (const recipeId of ['spicy_hotpot', 'bamboo_shoot_stir_fry', 'aged_radish_stew', 'hunters_roast', 'battle_stew', 'spiced_lamb']) {
  assertBlockIncludes(recipesSource, recipeId, "itemId: 'wild_meat'", `personal recipe ${recipeId}`)
}

const cohabitationServerSource = readRepo('server', 'src', 'taoyuanCohabitationRuntime.js')
assert.ok(cohabitationServerSource.includes("'wild_meat'"), 'server shared warehouse policy should include wild_meat')
for (const recipeId of ['shared_spicy_hotpot', 'shared_bamboo_shoot_stir_fry', 'shared_aged_radish_stew', 'shared_hunters_roast', 'shared_battle_stew', 'shared_spiced_lamb']) {
  assertBlockIncludes(cohabitationServerSource, recipeId, "item_id: 'wild_meat'", `server shared recipe ${recipeId}`)
}

const cohabitationViewSource = readProject('src', 'views', 'game', 'online', 'OnlineCohabitationView.vue')
assert.ok(cohabitationViewSource.includes("wild_meat: '野兽肉块'"), 'frontend shared workshop item labels should include wild_meat')
for (const recipeId of ['shared_spicy_hotpot', 'shared_bamboo_shoot_stir_fry', 'shared_aged_radish_stew', 'shared_hunters_roast', 'shared_battle_stew', 'shared_spiced_lamb']) {
  assertBlockIncludes(cohabitationViewSource, recipeId, "item_id: 'wild_meat'", `frontend shared recipe ${recipeId}`)
}

console.log('qa-animal-meat-guards passed')
