/* global console, process */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [processingStoreSource, processingViewSource, changelogSource] = await Promise.all([
  readSource('src/stores/useProcessingStore.ts'),
  readSource('src/views/game/ProcessingView.vue'),
  readSource('CHANGELOG.md')
])

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const upgradeStart = processingStoreSource.indexOf('const WORKSHOP_UPGRADES = [')
const upgradeEnd = processingStoreSource.indexOf('export const WORKSHOP_MAX_LEVEL')
const upgradeBlock = upgradeStart >= 0 && upgradeEnd > upgradeStart
  ? processingStoreSource.slice(upgradeStart, upgradeEnd)
  : ''
const levels = [...upgradeBlock.matchAll(/level:\s*(\d+)/g)].map(match => Number(match[1]))
const levelLines = upgradeBlock
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.startsWith('{ level:'))
const levelEntries = levelLines.map(line => ({
  level: Number((line.match(/level:\s*(\d+)/)?.[1]) ?? NaN),
  line
}))

assert(levels.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', `workshop levels should extend to Lv.15, got ${levels.join(',')}`)
assert(levelEntries.filter(entry => entry.level >= 7).every(entry => entry.line.includes("itemId: 'bronze_bar'")), 'workshop Lv.7+ upgrades should consume bronze_bar')
assert(levelEntries.filter(entry => entry.level >= 9).every(entry => entry.line.includes("itemId: 'mythril_bar'")), 'workshop Lv.9+ upgrades should consume mythril_bar')
assert(processingStoreSource.includes('const maxMachines = computed(() => 15 + workshopLevel.value * 5)'), 'workshop max machine formula should remain linear')
assert(/WORKSHOP_MAX_LEVEL\s*=\s*WORKSHOP_UPGRADES\[WORKSHOP_UPGRADES\.length - 1\]!?\.(level)/.test(processingStoreSource), 'workshop max level should be derived from upgrades')
assert(processingStoreSource.includes("const workshopSpeedBonus = computed(() => getWorkshopSpeedBonus(workshopLevel.value))"), 'workshop speed milestone should be exposed')
assert(processingStoreSource.includes("const workshopDoubleOutputChance = computed(() => getWorkshopDoubleOutputChance(workshopLevel.value))"), 'workshop double-output milestone should be exposed')
assert(processingStoreSource.includes('tryWorkshopDoubleOutput(slot, recipe, outputQuality)'), 'double output should apply to collection paths')
assert((processingStoreSource.match(/tryWorkshopDoubleOutput\(slot, recipe, outputQuality\)/g) ?? []).length >= 3, 'double output should cover manual, auto, and void-restart collection')
assert(processingStoreSource.includes('workshopLevel.value = next'), 'workshop upgrade should still advance the stored level')
assert(processingStoreSource.includes('milestoneText'), 'upgrade log should mention milestone unlocks')
assert(processingViewSource.includes('WORKSHOP_MAX_LEVEL'), 'processing view should show the workshop cap')
assert(processingViewSource.includes('WORKSHOP_MILESTONES'), 'processing view should render milestone list')
assert(processingViewSource.includes('isWorkshopMaxLevel'), 'processing view should show full-level state')
assert(processingViewSource.includes('processingStore.workshopSpeedBonus'), 'processing view should show speed bonus')
assert(processingViewSource.includes('processingStore.workshopDoubleOutputChance'), 'processing view should show double-output chance')
assert(processingViewSource.includes('workshopMilestones'), 'processing view should show the milestone panel')
assert(changelogSource.includes('Lv.15'), 'changelog should mention the new workshop cap')
assert(changelogSource.includes('90'), 'changelog should mention the new 90-machine cap')

if (errors.length > 0) {
  console.error('qa-workshop-extension-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`qa-workshop-extension-guards: ok (${levels.length} levels)`)
