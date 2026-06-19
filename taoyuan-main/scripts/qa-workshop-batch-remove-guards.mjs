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

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const assertIncludes = (source, fragment, message) => {
  assert(source.includes(fragment), message)
}

const getBlock = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  return start >= 0 && end > start ? source.slice(start, end) : ''
}

const packageJson = JSON.parse(packageSource)

assert(
  packageJson.scripts?.['qa:workshop-batch-remove-guards'] === 'node scripts/qa-workshop-batch-remove-guards.mjs',
  'package.json should register qa:workshop-batch-remove-guards'
)

assertIncludes(processingStoreSource, 'export interface ProcessingMachineRemovalPreview', 'store should expose a typed removal preview')
assertIncludes(processingStoreSource, 'export interface ProcessingMachineRemovalResult', 'store should expose a typed removal result')
assertIncludes(processingStoreSource, 'const previewMachineRemovalBySlotIndices =', 'store should build a slot-index removal preview')
assertIncludes(processingStoreSource, 'warehouseSnapshot = warehouseStore.serialize()', 'removal preview/execution should snapshot warehouse state')
assertIncludes(processingStoreSource, 'warehouseStore.deserialize(warehouseSnapshot)', 'removal preview/execution should restore warehouse state')
assertIncludes(processingStoreSource, 'const inventorySnapshot = inventoryStore.serialize()', 'batch removal should snapshot inventory state before execution')
assertIncludes(processingStoreSource, 'const machineSnapshot = machines.value.map(cloneProcessingSlot)', 'batch removal should snapshot machine state before execution')
assertIncludes(processingStoreSource, 'preview.canRemove = preview.total > 0 && canRefundItems(preview.refundEntries)', 'batch removal should preflight backpack refunds atomically')
assertIncludes(processingStoreSource, 'preview.voidOutputEntries.push', 'batch removal preview should account for void output chest receipts')
assertIncludes(processingStoreSource, 'const previewRemoveMachinesByType = (machineType: MachineType): ProcessingMachineRemovalPreview =>', 'store should expose type-level removal preview')
assertIncludes(processingStoreSource, 'const removeMachinesByType = (machineType: MachineType): ProcessingMachineRemovalResult =>', 'store should expose type-level batch removal')
assertIncludes(processingStoreSource, 'return removeMachinesBySlotIndices([slotIndex]).removed === 1', 'single-machine removal should reuse the shared batch executor')
assertIncludes(processingStoreSource, 'previewRemoveMachinesByType,', 'Pinia return should expose previewRemoveMachinesByType')
assertIncludes(processingStoreSource, 'removeMachinesByType,', 'Pinia return should expose removeMachinesByType')

const removeMachinesByTypeBlock = getBlock(
  processingStoreSource,
  'const removeMachinesByType = (machineType: MachineType): ProcessingMachineRemovalResult =>',
  '/** 拆除机器'
)
assert(removeMachinesByTypeBlock && !removeMachinesByTypeBlock.includes('removeMachine('), 'batch removal should not be implemented as a loop over single removeMachine()')

assertIncludes(processingViewSource, 'processing-batch-remove-${group.machineType}', 'group toolbar should expose a batch remove button per machine type')
assertIncludes(processingViewSource, '@click.stop="openBatchRemoveModal(group.machineType)"', 'batch remove button should open a preview modal')
assertIncludes(processingViewSource, 'data-testid="processing-batch-remove-modal"', 'batch remove modal should have a stable test id')
assertIncludes(processingViewSource, 'data-testid="processing-batch-remove-summary"', 'batch remove modal should summarize target state counts')
assertIncludes(processingViewSource, 'data-testid="processing-batch-remove-refunds"', 'batch remove modal should list backpack refunds')
assertIncludes(processingViewSource, 'data-testid="processing-batch-remove-void-outputs"', 'batch remove modal should show void output chest receipts')
assertIncludes(processingViewSource, 'data-testid="processing-batch-remove-confirm"', 'batch remove modal should expose a confirm button')
assertIncludes(processingViewSource, 'ProcessingMachineRemovalPreview', 'processing view should type the removal preview')
assertIncludes(processingViewSource, 'processingStore.previewRemoveMachinesByType(machineType)', 'processing view should preview batch removal before confirmation')
assertIncludes(processingViewSource, 'processingStore.removeMachinesByType(modal.machineType)', 'processing view should execute store-level batch removal')
assertIncludes(processingViewSource, 'batchRemoveRefundLines', 'processing view should aggregate refund rows')
assertIncludes(processingViewSource, 'batchRemoveVoidOutputLines', 'processing view should aggregate void output rows')
assertIncludes(processingViewSource, '背包空间不足，无法完整退回拆除材料与产物。', 'batch remove modal should explain blocked capacity')

if (errors.length > 0) {
  console.error('qa-workshop-batch-remove-guards failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-workshop-batch-remove-guards: ok')
