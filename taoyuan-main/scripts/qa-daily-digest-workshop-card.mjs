/* global console, process */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [packageSource, recordCenterSource, endDaySource, processingStoreSource] = await Promise.all([
  readSource('package.json'),
  readSource('src/types/recordCenter.ts'),
  readSource('src/composables/useEndDay.ts'),
  readSource('src/stores/useProcessingStore.ts')
])

const packageJson = JSON.parse(packageSource)
const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

assert(
  packageJson.scripts?.['qa:daily-digest-workshop-card'] === 'node scripts/qa-daily-digest-workshop-card.mjs',
  'package.json should register qa:daily-digest-workshop-card'
)
assert(
  recordCenterSource.includes("| 'workshop_processing'"),
  'DailyDigestSectionId should include workshop_processing'
)
assert(
  endDaySource.includes("sectionId: 'workshop_processing'"),
  'useEndDay should create a workshop_processing digest section'
)
assert(
  endDaySource.includes("title: '工坊与加工'"),
  'workshop digest card should use the player-facing title 工坊与加工'
)
assert(
  /const collectDigestLinesWithoutLimit = \([\s\S]*Array\.from\(new Set\(digestMessages\.filter/.test(endDaySource),
  'useEndDay should provide an uncapped digest collector for prioritized cards'
)
assert(
  /const workshopPrimaryLines = collectDigestLinesWithoutLimit\([\s\S]*'工坊自动收取了'[\s\S]*'加工完成'[\s\S]*\)/.test(endDaySource),
  'workshop digest should collect normal auto-collect and ready-to-collect lines before bonus lines'
)
assert(
  /const workshopBonusLines = collectDigestLinesWithoutLimit\([\s\S]*'自动收取时发现隐藏加工配方'[\s\S]*'发现隐藏加工配方'[\s\S]*'种子制造机额外产出'[\s\S]*'工坊手记触发'[\s\S]*'工坊精研触发'[\s\S]*\)/.test(endDaySource),
  'workshop digest should collect discovery, seed bonus, refund, and double-output lines as secondary details'
)
assert(
  /const workshopHighlights = uniqueLines\(\[[\s\S]*\.\.\.workshopPrimaryLines[\s\S]*\.\.\.workshopBonusLines[\s\S]*\]\)/.test(endDaySource),
  'workshop digest should prioritize normal output lines before bonus lines so the main output is not swallowed'
)
assert(
  /if \(workshopHighlights\.length > 0\) \{[\s\S]*pushDigestSection\(\{[\s\S]*priority: 23[\s\S]*\}\)/.test(endDaySource),
  'workshop digest card should only render when workshop logs exist and should sit after farm production'
)
assert(
  !/const workshopHighlights = collectDigestLines\([\s\S]*'工坊自动收取了'[\s\S]*\)/.test(endDaySource),
  'workshop digest must not use the capped collector directly, or bonus lines can hide normal output'
)
assert(
  processingStoreSource.includes('工坊自动收取了') || processingStoreSource.includes('宸ュ潑鑷姩鏀跺彇'),
  'processing daily update should still emit the auto-collect log consumed by the digest card'
)
assert(
  processingStoreSource.includes('加工完成') || processingStoreSource.includes('鍔犲伐瀹屾垚'),
  'processing daily update should still emit the ready-to-collect log consumed by the digest card'
)

if (errors.length > 0) {
  console.error('qa-daily-digest-workshop-card failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-daily-digest-workshop-card: ok')
