/* global console */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProject = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), 'utf8')

const endDaySource = readProject('src', 'composables', 'useEndDay.ts')

const animalDailyUpdateIndex = endDaySource.indexOf('const animalResult = animalStore.dailyUpdate()')
const fishPondDailyUpdateIndex = endDaySource.indexOf('const pondResult = fishPondStore.dailyUpdate()')
const helperFeedIndex = endDaySource.indexOf("const helperFeedResult = npcStore.processDailyHelpers(['feed'])")
const helperMorningIndex = endDaySource.indexOf('const helperMorningTasks:')
const crabPotHarvestIndex = endDaySource.indexOf('// 蟹笼收获')
const preAnimalDailyUpdateSection = endDaySource.slice(0, animalDailyUpdateIndex)

assert.ok(animalDailyUpdateIndex > -1, 'end-day flow should keep animal daily update')
assert.ok(fishPondDailyUpdateIndex > -1, 'end-day flow should keep fish pond daily update')
assert.ok(helperFeedIndex > -1, 'end-day flow should process feed helpers')
assert.ok(helperMorningIndex > -1, 'end-day flow should process morning helper tasks')
assert.ok(crabPotHarvestIndex > -1, 'end-day flow should keep crab pot harvest marker')
assert.ok(
  helperFeedIndex > animalDailyUpdateIndex,
  'feed helpers should run after animal daily update so today stays marked as fed'
)
assert.ok(
  helperFeedIndex > fishPondDailyUpdateIndex,
  'feed helpers should run after fish pond daily update so today stays marked as fed'
)
assert.ok(
  helperFeedIndex < crabPotHarvestIndex,
  'feed helpers should run in the new-day care block before later gathering settlements'
)
assert.equal(
  (endDaySource.match(/processDailyHelpers\(\['feed'\]\)/g) ?? []).length,
  1,
  'feed helper settlement should happen once per sleep cycle'
)
assert.ok(
  !preAnimalDailyUpdateSection.includes('animalStore.feedAll()'),
  'NPC/spouse/zhiji feed bonuses should not mark animals fed before daily update resets them'
)
assert.ok(
  endDaySource.includes('let zhijiMorningAnimalFeedLog: string | null = null'),
  'zhiji animal feed bonus should be deferred into the morning feed window'
)
assert.ok(
  endDaySource.includes('if (zhijiMorningAnimalFeedLog)'),
  'deferred zhiji animal feed bonus should be applied after animal daily update'
)

console.log('qa-helper-feed-guards passed')
