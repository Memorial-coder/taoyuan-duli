/* global console, process */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [packageSource, processingViewSource, processingStoreSource, desktopLayoutSmokeSource] = await Promise.all([
  readSource('package.json'),
  readSource('src/views/game/ProcessingView.vue'),
  readSource('src/stores/useProcessingStore.ts'),
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
assertIncludes(processingViewSource, 'firstIdleSlotIndex: number | null', 'processing groups should track the first idle slot for shared recipe selection')
assertIncludes(processingViewSource, 'openGroupProcessingRecipeDetail(group, option)', 'group-level recipe cards should open the detail confirmation modal')
assertIncludes(processingViewSource, 'openProcessingRecipeDetail(group.firstIdleSlotIndex, option)', 'group-level recipe cards should reuse the first idle slot for detail confirmation')
assertIncludes(processingViewSource, 'type MachineGroupBaseViewModel', 'processing groups should keep unfiltered recipe options for cheap availability toggles')
assertIncludes(processingViewSource, 'getAlchemyRequirementTotalCount(recipe, recipe.inputItemId, recipe.inputQuantity, quality)', 'alchemy recipe cards should show total available count for the main requirement')
assertIncludes(processingViewSource, 'getAlchemyRequirementTotalCount(recipe, extra.itemId, extra.quantity, quality)', 'alchemy recipe cards should show total available count for extra requirements')
assertIncludes(processingViewSource, 'formatAlchemyPlanSubstitutionText(alchemyPlan)', 'alchemy recipe cards should reuse one material plan for substitution copy')
assertIncludes(processingViewSource, 'option: RecipeOptionViewModel', 'recipe detail state should cache the clicked recipe option')
assertIncludes(processingViewSource, 'return detail.option', 'recipe detail modal should reuse the clicked recipe option instead of rebuilding alchemy cards')
assertIncludes(processingViewSource, 'interface AsyncRecipeOptionsState', 'processing recipe lists should use async state for chunked group rendering')
assertIncludes(processingViewSource, 'const ASYNC_RECIPE_BATCH_SIZE', 'processing recipe list rendering should be chunked instead of one synchronous pass')
assertIncludes(processingViewSource, 'buildAsyncRecipeOptionsForGroup', 'expanded processing groups should load recipe options through the async builder')
assertIncludes(processingViewSource, 'scheduleAsyncRecipeStep(runStep)', 'async recipe builder should yield between batches')
assertIncludes(processingViewSource, 'recipesLoading: asyncRecipeState.loading', 'processing groups should expose recipe loading state to the template')
assertIncludes(processingViewSource, '正在整理配方...', 'expanded processing groups should show a loading hint while chunked recipes are still building')
assertIncludes(processingViewSource, 'stopAsyncRecipeState(machineType)', 'collapsed processing groups should cancel pending async recipe loading')
assertIncludes(processingViewSource, 'processingStore.getAlchemyDailyLimitSignature()', 'async recipe cache signature should include current alchemy daily-use state')
assertIncludes(processingStoreSource, 'const getAlchemyDailyLimitSignature = () =>', 'processing store should expose a read-only alchemy daily-use signature for recipe cache invalidation')
assertIncludes(processingStoreSource, 'getAlchemyDailyLimitSignature,', 'processing store should return the alchemy daily-use signature helper')
assert(
  !/group\.all(?:Seed)?RecipeOptions\s*=\s*group\.isSeedMaker/.test(processingViewSource),
  'machineGroupsBaseView must not synchronously build full recipe options while grouping machines'
)
assert(
  !processingViewSource.includes('getAlchemyPlanAvailableCount(alchemyPlan'),
  'alchemy material counts must not be capped to the single-run plan consumption'
)
assert(
  !processingViewSource.includes('return buildRecipeOption(recipe, detail.quality)'),
  'recipe detail modal must not rebuild recipe options on open'
)
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
assertIncludes(processingViewSource, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));', 'machine slots should use compact responsive tiles instead of full-width rows')
assertIncludes(processingViewSource, '.processing-machine-slot-card', 'machine slot cards should have compact sizing hooks')
assertIncludes(desktopLayoutSmokeSource, "recipeGridSelector: '.processing-option-grid'", 'desktop layout smoke should inspect workshop recipe grid columns')
assertIncludes(desktopLayoutSmokeSource, 'expectedRecipeGridColumns', 'desktop layout smoke should assert adaptive workshop recipe grid column counts')
assertIncludes(desktopLayoutSmokeSource, "slotListSelector: '.processing-machine-slot-list'", 'desktop layout smoke should inspect workshop machine slot columns')
assertIncludes(desktopLayoutSmokeSource, 'listWidth: slotListMetrics.width', 'desktop layout smoke should assert compact slot columns from actual slot-list width')

if (errors.length > 0) {
  console.error('qa-processing-recipe-detail-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-processing-recipe-detail-guards: ok')
