/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')

const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const farmTypes = read('taoyuan-main/src/types/farm.ts')
const farmStore = read('taoyuan-main/src/stores/useFarmStore.ts')
const shopView = read('taoyuan-main/src/views/game/ShopView.vue')
const cohabitationRuntime = read('server/src/taoyuanCohabitationRuntime.js')
const farmMaps = read('taoyuan-main/src/data/farmMaps.ts')

assert(
  /export type FarmSize = 4 \| 6 \| 8 \| 10 \| 12 \| 16/.test(farmTypes),
  'FarmSize should include the standard-farm-only 16x16 size.'
)

assert(
  /const STANDARD_FARM_SIZES: FarmSize\[\] = \[4, 6, 8, 10, 12, 16\]/.test(farmStore) &&
    /const NON_STANDARD_FARM_SIZES: FarmSize\[\] = \[4, 6, 8, 10, 12\]/.test(farmStore) &&
    /const sizes = getFarmSizeChain\(gameStore\.farmMapType\)/.test(farmStore) &&
    /if \(currentIndex < 0\) return null/.test(farmStore),
  'Farm expansion chain should cap non-standard farms at 12x12 and let standard farms reach 16x16.'
)

assert(
  /8:\s*\{[\s\S]*?newSize:\s*10,[\s\S]*?price:\s*20000,[\s\S]*?requiredForagingLevel:\s*12,[\s\S]*?requiredConstructionTickets:\s*3,[\s\S]*?\{\s*itemId:\s*'wood',\s*quantity:\s*600\s*\},[\s\S]*?\{\s*itemId:\s*'stone',\s*quantity:\s*400\s*\}[\s\S]*?\}/.test(shopView),
  '8x8 to 10x10 should cost 20000, require foraging Lv.12, and consume construction materials.'
)

assert(
  /10:\s*\{[\s\S]*?newSize:\s*12,[\s\S]*?price:\s*50000,[\s\S]*?requiredForagingLevel:\s*16,[\s\S]*?requiredConstructionTickets:\s*6,[\s\S]*?\{\s*itemId:\s*'wood',\s*quantity:\s*1000\s*\},[\s\S]*?\{\s*itemId:\s*'stone',\s*quantity:\s*800\s*\}[\s\S]*?\}/.test(shopView),
  '10x10 to 12x12 should cost 50000, require foraging Lv.16, and consume larger construction materials.'
)

assert(
  /12:\s*\{[\s\S]*?newSize:\s*16,[\s\S]*?price:\s*120000,[\s\S]*?requiredForagingLevel:\s*20,[\s\S]*?requiredConstructionTickets:\s*12,[\s\S]*?\{\s*itemId:\s*'wood',\s*quantity:\s*2400\s*\},[\s\S]*?\{\s*itemId:\s*'stone',\s*quantity:\s*1800\s*\}[\s\S]*?\}/.test(shopView) &&
    /farmStore\.farmSize >= 12 && gameStore\.farmMapType !== 'standard'\) return null/.test(shopView),
  '12x12 to 16x16 should be a standard-farm-only late-game expansion.'
)

assert(
  farmMaps.includes('可扩至16×16'),
  'Standard farm selection copy should disclose the 16x16 ceiling.'
)

assert(
  (farmMaps.match(/可扩至12×12/g) ?? []).length >= 5,
  'Non-standard farm selection copy should disclose the 12x12 ceiling.'
)

assert(
  /const normalizeFarmSizeForMap = \(size: FarmSize, farmMapType: FarmMapType\): FarmSize =>/.test(farmStore) &&
    /const sourceFarmSize = normalizeSupportedFarmSize\(\(data as any\)\.farmSize, rawPlots\.length\)/.test(farmStore) &&
    /const loadedFarmSize = normalizeFarmSizeForMap\(sourceFarmSize, useGameStore\(\)\.farmMapType\)/.test(farmStore) &&
    /plots\.value = resizePlotsForFarmSize\(rawPlots, sourceFarmSize, loadedFarmSize\)/.test(farmStore) &&
    /sprinklers\.value = normalizeSprinklersForFarmSize\(\(data as any\)\.sprinklers \?\? \[\], sourceFarmSize, loadedFarmSize\)/.test(farmStore),
  'Farm deserialize should normalize legacy saves by farm type and resize plots/sprinklers.'
)

assert(
  shopView.includes("import { useSkillStore } from '@/stores/useSkillStore'") &&
    shopView.includes("skillStore.getSkill('foraging').level"),
  'Shop farm expansion should read the current foraging level.'
)

assert(
  shopView.includes("import { useWalletStore } from '@/stores/useWalletStore'") &&
    shopView.includes("import { getCombinedItemCount, removeCombinedItems } from '@/composables/useCombinedInventory'") &&
    shopView.includes("walletStore.canAffordRewardTickets('construction'") &&
    shopView.includes("walletStore.spendRewardTickets('construction'") &&
    shopView.includes('removeCombinedItems(info.materials ?? [])'),
  'Shop farm expansion should require and consume construction tickets plus combined inventory materials.'
)

assert(
  shopView.includes('farmExpandRequirementLabel') &&
    shopView.includes('farmExpandRequirementLines') &&
    shopView.includes('canBuyFarmExpansion') &&
    shopView.includes('hasFarmExpandSkillRequirement.value') &&
    shopView.includes('hasFarmExpandTicketRequirement.value') &&
    shopView.includes('hasFarmExpandMaterialRequirement.value'),
  'Shop farm expansion should show and enforce foraging, ticket, and material requirements.'
)

assert(
  /const supportedFarmSizes = \[4, 6, 8, 10, 12, 16\];/.test(cohabitationRuntime) &&
    /supportedFarmSizes\.includes\(size\)/.test(cohabitationRuntime) &&
    /supportedFarmSizes\.includes\(inferred\)/.test(cohabitationRuntime),
  'Cohabitation farm-size normalization should accept 10x10, 12x12, and 16x16 saves.'
)

if (errors.length > 0) {
  console.error('Farm expansion guard failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Farm expansion guard passed.')
