import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const harvestFairFile = path.join(rootDir, 'src', 'components', 'game', 'HarvestFairView.vue');
const source = fs.readFileSync(harvestFairFile, 'utf8');

assert.match(
  source,
  /const selectedItemCounts = computed<SelectedItemCount\[\]>/,
  'HarvestFairView should aggregate selected exhibits by item and quality',
);

assert.match(
  source,
  /quantity:\s*item\.quantity\s*-\s*getSelectedQuantity\(item\.itemId,\s*item\.quality\)/s,
  'selectable exhibit quantity should subtract already selected copies',
);

assert.match(
  source,
  /getInventoryQuantity\(item\.itemId,\s*item\.quality\)\s*<=\s*getSelectedQuantity\(item\.itemId,\s*item\.quality\)/s,
  'addSelection should not allow selecting more copies than the bag owns',
);

assert.match(
  source,
  /const canSubmit = computed\(\(\) => selectedItems\.value\.length > 0 && selectedItemsAvailable\.value\)/,
  'submit button should require selected exhibits to still exist in the bag',
);

assert.match(
  source,
  /:disabled="!canSubmit"/,
  'submit button should be disabled when selected exhibits are unavailable',
);

assert.match(
  source,
  /inventoryStore\.removeItem\(item\.itemId,\s*item\.quantity,\s*item\.quality\)/,
  'submitting the harvest fair should consume selected exhibits by quality',
);

assert.ok(
  source.indexOf('if (!canSubmit.value)') > -1 && source.indexOf('if (!canSubmit.value)') < source.indexOf('sfxJudging()'),
  'Harvest fair should validate inventory before judging starts',
);

console.log('qa-harvest-fair-inventory-consumption passed');
