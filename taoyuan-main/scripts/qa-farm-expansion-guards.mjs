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

assert(
  /export type FarmSize = 4 \| 6 \| 8 \| 10 \| 12/.test(farmTypes),
  'FarmSize should include 10x10 and 12x12.'
)

assert(
  /const sizes: FarmSize\[\] = \[4, 6, 8, 10, 12\]/.test(farmStore),
  'Farm expansion chain should advance through 10x10 and 12x12.'
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
  /const supportedFarmSizes = \[4, 6, 8, 10, 12\];/.test(cohabitationRuntime) &&
    /supportedFarmSizes\.includes\(size\)/.test(cohabitationRuntime) &&
    /supportedFarmSizes\.includes\(inferred\)/.test(cohabitationRuntime),
  'Cohabitation farm-size normalization should accept 10x10 and 12x12 saves.'
)

if (errors.length > 0) {
  console.error('Farm expansion guard failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Farm expansion guard passed.')
