/* global console, process */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [packageSource, processingStoreSource, processingViewSource] = await Promise.all([
  readSource('package.json'),
  readSource('src/stores/useProcessingStore.ts'),
  readSource('src/views/game/ProcessingView.vue')
])

const packageJson = JSON.parse(packageSource)
const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

assert(
  packageJson.scripts?.['qa:workshop-auto-collect-feedback'] === 'node scripts/qa-workshop-auto-collect-feedback.mjs',
  'package.json should register qa:workshop-auto-collect-feedback'
)
assert(
  processingStoreSource.includes('export interface ProcessingCollectedOutputEntry'),
  'processing store should use structured collected output entries'
)
assert(
  processingStoreSource.includes('const collected: ProcessingCollectedOutputEntry[] = []'),
  'daily auto collect should aggregate structured output entries, not display names'
)
assert(
  processingStoreSource.includes('formatCollectedOutputSummary(collected)'),
  'daily auto collect log should format concrete item outputs'
)
assert(
  processingStoreSource.includes('collected.push(getSlotOutputEntry(slot, recipe, outputQuality))'),
  'daily auto collect should record resolved output item, quantity, and quality'
)
assert(
  processingStoreSource.includes("collected.push({ itemId: 'dream_silk', quantity: 1, quality: 'normal' })"),
  'dream silk auto bonus should also appear in the concrete output summary'
)
assert(
  !processingStoreSource.includes('const collected: string[] = []'),
  'daily auto collect must not regress to string-only recipe summaries'
)

const autoCollectBlockStart = processingStoreSource.indexOf('const dailyUpdate = () => {')
const autoCollectBlockEnd = processingStoreSource.indexOf('if (readyNames.length > 0)', autoCollectBlockStart)
const autoCollectBlock = autoCollectBlockStart >= 0 && autoCollectBlockEnd > autoCollectBlockStart
  ? processingStoreSource.slice(autoCollectBlockStart, autoCollectBlockEnd)
  : ''
assert(
  autoCollectBlock.includes('addLog(`工坊自动收取了：${summary}。`)'),
  'daily auto collect should keep a player-visible summary log'
)
assert(
  !autoCollectBlock.includes('counts.set(name'),
  'daily auto collect summary should not count completion names'
)

const manualCollectBlockStart = processingViewSource.indexOf('const handleCollect = (slotIndex: number) => {')
const manualCollectBlockEnd = processingViewSource.indexOf('const handleRemoveMachine', manualCollectBlockStart)
const manualCollectBlock = manualCollectBlockStart >= 0 && manualCollectBlockEnd > manualCollectBlockStart
  ? processingViewSource.slice(manualCollectBlockStart, manualCollectBlockEnd)
  : ''
assert(
  manualCollectBlock.includes('背包或虚空成品箱空间不足，无法收取${getSlotOutputName(slot)}'),
  'single-machine manual collect should explain blocked inventory or void output capacity'
)
assert(
  manualCollectBlock.includes("slot.machineType === 'repair_bench'"),
  'single-machine manual collect should keep repair-bench failures distinct from capacity failures'
)

if (errors.length > 0) {
  console.error('qa-workshop-auto-collect-feedback failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-workshop-auto-collect-feedback: ok')
