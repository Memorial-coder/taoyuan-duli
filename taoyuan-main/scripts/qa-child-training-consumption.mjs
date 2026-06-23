/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const getObjectBlock = (source, marker) => {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const end = source.indexOf('\n  },', start)
  return end > start ? source.slice(start, end) : source.slice(start)
}

const getBetween = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  if (start < 0) return ''
  const end = source.indexOf(endMarker, start + startMarker.length)
  return end > start ? source.slice(start, end) : source.slice(start)
}

const typesSource = read('src/types/npc.ts')
assert(typesSource.includes('export interface ChildTrainingItemRequirement'), 'ChildTrainingItemRequirement type is missing')
assert(typesSource.includes('sourceGroupId?: ProcessedItemGroupId'), 'Child training requirements should preserve processed/source group ids')

const npcDataSource = read('src/data/npcs.ts')
const trainingConfigBlock = getBetween(npcDataSource, 'export const CHILD_TRAINING_REQUIREMENTS', 'export const WS09_QA_CASES')
for (const focus of ['spirit', 'social', 'farm', 'craft']) {
  assert(trainingConfigBlock.includes(`${focus}: [`), `CHILD_TRAINING_REQUIREMENTS missing ${focus} focus`)
}
for (const itemId of ['paper', 'food_rice_ball', 'adventurer_ration', 'fish_feed', 'seed_cabbage', 'cloth', 'wood']) {
  assert(trainingConfigBlock.includes(`itemId: '${itemId}'`), `child training requirements missing ${itemId}`)
}
assert(trainingConfigBlock.includes("sourceGroupId: 'refined_material'"), 'study training should keep refined material source group')
assert(trainingConfigBlock.includes("sourceGroupId: 'fish_processed'"), 'nature training should keep fish processed source group')
assert(trainingConfigBlock.includes("sourceGroupId: 'textile'"), 'craft training should keep textile source group')

const itemsSource = read('src/data/items.ts')
const recipesSource = read('src/data/recipes.ts')
const processingSource = read('src/data/processing.ts')
for (const itemId of ['paper', 'food_rice_ball', 'adventurer_ration', 'fish_feed', 'seed_cabbage', 'cloth', 'wood']) {
  assert(
    itemsSource.includes(`id: '${itemId}'`) ||
      recipesSource.includes(`id: '${itemId.replace(/^food_/, '')}'`) ||
      processingSource.includes(`outputItemId: '${itemId}'`),
    `child training references missing item ${itemId}`
  )
}

const npcStoreSource = read('src/stores/useNpcStore.ts')
for (const marker of [
  'getChildTrainingCourseLabel',
  'getChildTrainingFocusForChild',
  'normalizeChildTrainingItemRequirements',
  'getChildTrainingRequirementStatus',
  'getChildTrainingBlockReason',
  'consumeChildTrainingRequirements'
]) {
  assert(npcStoreSource.includes(marker), `useNpcStore missing ${marker}`)
}
assert(npcStoreSource.includes('CHILD_TRAINING_REQUIREMENTS[focus]'), 'child training should read shared data config')
assert(npcStoreSource.includes('getTotalItemCountAtLeast'), 'child training UI status must support min quality inventory counts')
assert(npcStoreSource.includes('getTotalItemCount(requirement.itemId)'), 'child training UI status must count combined inventory')
assert(npcStoreSource.includes('removeItemAnywhereAtLeast'), 'child training consumption must support min quality')
assert(npcStoreSource.includes('removeItemAnywhere(requirement.itemId'), 'child training must remove real inventory items')

const interactBlock = getBetween(npcStoreSource, 'const interactWithChild', 'const hasDailyTip')
assert(interactBlock.includes('const blockReason = getChildTrainingBlockReason(childId)'), 'interactWithChild must check training block reason first')
assert(interactBlock.includes('if (blockReason) return { success: false'), 'blocked child training must return failure instead of mutating state')
assert(interactBlock.includes('const inventorySnapshot = inventoryStore.serialize()'), 'interactWithChild must snapshot inventory before consuming')
assert(interactBlock.includes('consumeChildTrainingRequirements(child)'), 'interactWithChild must consume configured requirements')
assert(interactBlock.includes('inventoryStore.deserialize(inventorySnapshot)'), 'interactWithChild must roll back inventory on failure')
assert(
  interactBlock.indexOf('consumeChildTrainingRequirements(child)') >= 0 &&
    interactBlock.indexOf('child.interactedToday = true') >= 0 &&
    interactBlock.indexOf('consumeChildTrainingRequirements(child)') < interactBlock.indexOf('child.interactedToday = true'),
  'child training must consume resources before marking interactedToday'
)
assert(
  interactBlock.indexOf('consumeChildTrainingRequirements(child)') >= 0 &&
    interactBlock.indexOf('lessonsThisWeek') >= 0 &&
    interactBlock.indexOf('consumeChildTrainingRequirements(child)') < interactBlock.indexOf('lessonsThisWeek'),
  'weekly training count must only increase after material consumption'
)
assert(interactBlock.includes('focus,'), 'successful child training should persist active focus')
assert(interactBlock.includes('`training:${focus}`'), 'successful child training should write a lightweight milestone')

const cottageSource = read('src/views/game/CottageView.vue')
for (const marker of [
  'data-testid="cottage-child-training-requirements"',
  'data-testid="cottage-child-training-requirement-row"',
  'data-testid="cottage-child-training-block-reason"',
  'getChildTrainingRequirementRows',
  'getChildTrainingBlockReason',
  'getChildTrainingCourseLabel',
  ':disabled="!!getChildTrainingBlockReason(child.id)"',
  'child.trainingState.lessonsThisWeek',
  'row.sourceHint'
]) {
  assert(cottageSource.includes(marker), `CottageView missing child training UI hook: ${marker}`)
}
assert(cottageSource.includes('if (result.success && result.item)'), 'CottageView should only grant child found item on successful training')

const linkageTypesSource = read('src/types/itemLinkage.ts')
assert(linkageTypesSource.includes("| 'childTraining'"), 'LinkageSystemId must include childTraining')

const itemLinkageSource = read('src/data/itemLinkage.ts')
for (const itemId of ['paper', 'food_rice_ball', 'adventurer_ration', 'fish_feed', 'seed_cabbage', 'cloth', 'wood']) {
  const block = getObjectBlock(itemLinkageSource, `itemId: '${itemId}'`)
  assert(block.includes("'childTraining'"), `${itemId} linkage must include childTraining`)
  assert(block.includes('repeatableSinks'), `${itemId} linkage must declare repeatable sinks`)
}
for (const labelMarker of [
  "childTraining: '孩子训练'",
  "childTraining: '训练'",
  "childTraining: 'cottage'",
  "{ system: 'childTraining', label: '孩子训练'"
]) {
  assert(itemLinkageSource.includes(labelMarker), `itemLinkage missing childTraining label/panel/usage marker: ${labelMarker}`)
}

const demandPoolSource = read('src/data/linkageDemandPools.ts')
for (const marker of [
  "id: 'paper_child_study_training'",
  "id: 'food_rice_ball_child_body_training'",
  "id: 'adventurer_ration_child_body_training'",
  "id: 'fish_feed_child_nature_training'",
  "id: 'seed_cabbage_child_nature_training'",
  "id: 'cloth_child_craft_training'",
  "id: 'wood_child_craft_training'"
]) {
  const block = getObjectBlock(demandPoolSource, marker)
  assert(block.includes("systems: ['childTraining']"), `linkage demand pool missing childTraining system for ${marker}`)
  assert(block.includes("'child_training'"), `linkage demand pool missing child_training tag for ${marker}`)
}

const packageSource = read('package.json')
assert(packageSource.includes('"qa:child-training-consumption": "node scripts/qa-child-training-consumption.mjs"'), 'package.json missing qa:child-training-consumption script')

if (errors.length > 0) {
  console.error('qa-child-training-consumption failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-child-training-consumption passed (4 focuses, atomic item consumption, Cottage UI, linkage pool).')
