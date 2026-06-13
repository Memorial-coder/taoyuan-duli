/* global console, process */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [packageSource, processingViewSource, desktopLayoutSmokeSource] = await Promise.all([
  readSource('package.json'),
  readSource('src/views/game/ProcessingView.vue'),
  readSource('scripts/qa-desktop-layout-smoke.mjs')
])

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const assertIncludes = (source, fragment, message) => {
  assert(source.includes(fragment), message)
}

const packageJson = JSON.parse(packageSource)

assert(
  packageJson.scripts?.['qa:processing-recipe-detail-guards'] === 'node scripts/qa-processing-recipe-detail-guards.mjs',
  'package.json should register qa:processing-recipe-detail-guards'
)

assertIncludes(processingViewSource, 'const processingRecipeDetail = ref<ProcessingRecipeDetailState | null>(null)', 'single-machine recipe detail state should exist')
assertIncludes(processingViewSource, 'openProcessingRecipeDetail(originalIndex, option)', 'recipe summary cards should open the detail confirmation modal')
assertIncludes(processingViewSource, 'data-testid="processing-recipe-detail-modal"', 'single-machine recipe detail modal should have a test id')
assertIncludes(processingViewSource, 'data-testid="processing-recipe-detail-materials"', 'single-machine recipe detail should expose material rows')
assertIncludes(processingViewSource, 'data-testid="processing-recipe-detail-start"', 'single-machine recipe detail should have an explicit start button')
assertIncludes(processingViewSource, 'processing-option-card--unavailable', 'unavailable recipe cards should be visually disabled while remaining inspectable')
assertIncludes(processingViewSource, ':aria-disabled="option.disabled ? \'true\' : \'false\'"', 'unavailable recipe cards should expose aria-disabled')
assertIncludes(processingViewSource, 'handleStartProcessing(detail.slotIndex, detail.recipeId, detail.quality)', 'detail confirmation should reuse the existing processing start path')
assertIncludes(processingViewSource, 'data-testid="processing-batch-recipe-materials"', 'batch processing modal should show scaled material requirements')
assertIncludes(processingViewSource, 'batchRecipeMaterialLines', 'batch processing modal should compute scaled material rows')

assert(
  !/@click="handleStartProcessing\(originalIndex, option\.recipeId(?:, option\.quality)?\)"/.test(processingViewSource),
  'single-machine recipe cards must not start processing directly'
)

assertIncludes(processingViewSource, 'grid-template-columns: repeat(5, minmax(0, 1fr));', 'two-column desktop workshop layout should show five recipe cards per row')
assertIncludes(processingViewSource, 'grid-template-columns: repeat(3, minmax(0, 1fr));', 'single/three-column workshop layouts should show three recipe cards per row')
assertIncludes(processingViewSource, ":global(html[data-desktop-layout-mode='adaptive'] #app:not(.app-shell--admin) .processing-option-grid)", 'scoped CSS should wrap the full adaptive recipe-grid selector in :global')
assert(
  !processingViewSource.includes(".processing-machine-slot-list) {\n      grid-template-columns: repeat(auto-fit"),
  'same-machine slots should not auto-fit into a second inner column'
)
assertIncludes(desktopLayoutSmokeSource, "recipeGridSelector: '.processing-option-grid'", 'desktop layout smoke should inspect workshop recipe grid columns')
assertIncludes(desktopLayoutSmokeSource, 'expectedRecipeGridColumns', 'desktop layout smoke should assert adaptive workshop recipe grid column counts')
assertIncludes(desktopLayoutSmokeSource, "slotListSelector: '.processing-machine-slot-list'", 'desktop layout smoke should assert same-machine slots stay in one column')

if (errors.length > 0) {
  console.error('qa-processing-recipe-detail-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-processing-recipe-detail-guards: ok')
