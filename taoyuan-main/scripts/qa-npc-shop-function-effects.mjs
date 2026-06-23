/* global console */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const assertIncludes = (source, needle, message) => {
  assert(source.includes(needle), message)
}

const packageJson = JSON.parse(read('package.json'))
const shopStoreSource = read('src', 'stores', 'useShopStore.ts')
const shopViewSource = read('src', 'views', 'game', 'ShopView.vue')
const questStoreSource = read('src', 'stores', 'useQuestStore.ts')
const npcFunctionsSource = read('src', 'data', 'npcFunctions.ts')
const npcFunctionEffectsSource = read('src', 'data', 'npcFunctionEffects.ts')

assert(
  packageJson.scripts?.['qa:npc-shop-function-effects'] === 'node scripts/qa-npc-shop-function-effects.mjs',
  'package.json should register qa:npc-shop-function-effects.'
)

for (const effectType of [
  'shop_discount_bonus',
  'rare_commission',
  'bulk_buy',
  'rare_shop_stock',
  'caravan_preorder',
  'proxy_buy'
]) {
  assertIncludes(npcFunctionsSource, `effectType: '${effectType}'`, `${effectType} should exist in NPC function unlock data.`)
  assertIncludes(npcFunctionEffectsSource, effectType, `${effectType} should be classified in NPC function effect registry.`)
}

assertIncludes(
  shopStoreSource,
  "npcStore.getNpcFunctionEffectValue('shop_discount_bonus') / 100",
  'Shop discount should read shop_discount_bonus through the NPC effect helper.'
)
assertIncludes(
  shopStoreSource,
  'return 1 - (1 - walletDiscount) * (1 - ringDiscount) * (1 - blessingDiscount) * (1 - spiritDiscount) * (1 - relationshipDiscount) * (1 - decorationDiscount) * (1 - npcFunctionDiscount)',
  'NPC shop discount should affect the real discount formula used for purchase prices.'
)
assertIncludes(
  shopStoreSource,
  'npcFunctionDiscount: npcStore.getNpcFunctionEffectValue(\'shop_discount_bonus\') / 100',
  'Shop discount breakdown should expose NPC function discount.'
)

assertIncludes(
  shopStoreSource,
  "const npcBulkBuyUnlocked = computed(() => npcStore.isNpcFunctionEffectUnlocked('bulk_buy'))",
  'Bulk buy should be gated by the bulk_buy NPC effect.'
)
assertIncludes(
  shopViewSource,
  "shopStore.currentShopId === 'wanwupu' && !shopStore.npcBulkBuyUnlocked",
  'Wanwu shop quantity modal should block bulk buy until bulk_buy is unlocked.'
)
assertIncludes(
  shopViewSource,
  "const allowBatchBuy = shopStore.currentShopId !== 'wanwupu' || shopStore.npcBulkBuyUnlocked",
  'Wanwu shop direct quantity selection should keep the bulk_buy gate.'
)

assertIncludes(
  shopStoreSource,
  "getNpcShopEntry('proxy_buy'",
  'Proxy buy should add NPC shop entries through shared NPC shop entry helper.'
)
assertIncludes(
  shopStoreSource,
  "getNpcShopEntry('rare_shop_stock'",
  'Rare shop stock should add NPC shop entries through shared NPC shop entry helper.'
)
assertIncludes(
  shopStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('caravan_preorder')",
  'Caravan preorder should be gated by the caravan_preorder NPC effect.'
)
assertIncludes(
  shopStoreSource,
  'NPC_CARAVAN_PREORDER_STOCK.filter(entry => !existingIds.has(entry.itemId))',
  'Caravan preorder should avoid duplicating existing traveling merchant stock.'
)

assertIncludes(
  shopStoreSource,
  "const npcRareCommissionCategory = computed(() => getNpcRareCommissionCategory())",
  'Rare commission should expose a stable weekly category for other systems.'
)
assertIncludes(
  shopStoreSource,
  "if (!npcStore.isNpcFunctionEffectUnlocked('rare_commission')) return null",
  'Rare commission weekly category should require the rare_commission NPC effect.'
)
assertIncludes(
  shopStoreSource,
  "id: 'npc_rare_commission'",
  'Rare commission should affect real sell price breakdown.'
)
assertIncludes(
  shopStoreSource,
  'bonus *= NPC_RARE_COMMISSION_MULTIPLIER',
  'Rare commission should affect real sell price bonus, not only UI copy.'
)

assertIncludes(
  questStoreSource,
  'const rareCommissionCategory = shopStore.npcRareCommissionCategory as QuestMarketCategory | null',
  'Quest store should read the same weekly rare commission category as shop store.'
)
assertIncludes(
  questStoreSource,
  '...(rareCommissionCategory ? [rareCommissionCategory] : []),',
  'Rare commission category should feed special-order preferred market categories.'
)
assertIncludes(
  questStoreSource,
  'NPC功能：何掌柜稀有委托会提高${rareCommissionCategoryLabel}类特殊订单权重',
  'Special order hints should explain the NPC rare commission source.'
)
assertIncludes(
  questStoreSource,
  'preferredMarketCategories: marketQuestBias.preferredMarketCategories',
  'Special order generation should pass preferred market categories into the data generator.'
)
assertIncludes(
  questStoreSource,
  'const coolingTags = getCoolingSpecialOrderTags(refreshContext?.absoluteWeek)',
  'Special orders should keep existing cooldown tags before rare commission weighting.'
)
assertIncludes(
  questStoreSource,
  'rememberSpecialOrderRotation(order',
  'Special orders should keep anti-repeat history after rare commission weighting.'
)

console.log('qa:npc-shop-function-effects passed')
