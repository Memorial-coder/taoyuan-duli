import fs from 'fs';
import path from 'path';
import { ITEMS } from './src/data/items';

const validIds = new Set(ITEMS.map(i => i.id));
console.log('Valid items count:', validIds.size);

function walkSync(dir: string, filelist: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, filelist);
    } else {
      if (filepath.endsWith('.ts') || filepath.endsWith('.vue')) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const srcDir = path.resolve('./src');
const files = walkSync(srcDir);
const regex = /['"]([a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)+)['"]/g;
const exceptions = new Set([
  'machineType', 'processingDays', 'farmSize', 'maxChests', 'chest_1', 'chest_2', 'item_id', 'item_name', 'price',
  'quantity', 'name', 'type', 'id', 'category', 'description', 'seedId', 'fruitId', 'saplingId', 'staminaRestore',
  'healthRestore', 'sellPrice', 'effectType', 'ringId', 'hatId', 'shoeId', 'weaponId', 'itemId', 'cropId',
  'machine_type', 'recipe_id', 'slot_index', 'craftMoney', 'shopPrice', 'recipeMoney'
]);

const possibleOrphans = new Map<string, Set<string>>();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const str = match[1];
    if (validIds.has(str)) continue;
    if (exceptions.has(str)) continue;
    if (!str.includes('_')) continue;
    
    // Ignore typical non-item snake_cases
    if (str.startsWith('bg_') || str.startsWith('text_') || str.startsWith('icon_') || str.includes('font_')) continue;
    if (str.startsWith('flex_') || str.startsWith('grid_') || str.startsWith('border_')) continue;
    
    if (!possibleOrphans.has(str)) possibleOrphans.set(str, new Set());
    possibleOrphans.get(str)!.add(path.relative(srcDir, file));
  }
}

// Filter to only strings that look like they MIGHT be items (e.g., used in shops, processing, etc.)
for (const [id, locs] of possibleOrphans.entries()) {
  const locArray = Array.from(locs);
  const isTarget = locArray.some(l => l.includes('shop') || l.includes('Catalog') || l.includes('processing') || l.includes('Item') || l.includes('items') || l.includes('breeding') || l.includes('store'));
  if (isTarget) {
     console.log(`[ORPHAN?] ${id} found in:`, locArray.join(', '));
  }
}
