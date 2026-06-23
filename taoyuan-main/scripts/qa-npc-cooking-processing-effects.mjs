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
const npcFunctionEffectsSource = read('src', 'data', 'npcFunctionEffects.ts')
const npcFunctionsSource = read('src', 'data', 'npcFunctions.ts')
const cookingStoreSource = read('src', 'stores', 'useCookingStore.ts')
const cookingViewSource = read('src', 'views', 'game', 'CookingView.vue')
const processingStoreSource = read('src', 'stores', 'useProcessingStore.ts')
const processingDataSource = read('src', 'data', 'processing.ts')
const shopStoreSource = read('src', 'stores', 'useShopStore.ts')
const homeStoreSource = read('src', 'stores', 'useHomeStore.ts')
const warehouseStoreSource = read('src', 'stores', 'useWarehouseStore.ts')
const cottageViewSource = read('src', 'views', 'game', 'CottageView.vue')
const endDaySource = read('src', 'composables', 'useEndDay.ts')
const festivalRoomStoreSource = read('src', 'stores', 'useFestivalRoomStore.ts')

assert(
  packageJson.scripts?.['qa:npc-cooking-processing-effects'] === 'node scripts/qa-npc-cooking-processing-effects.mjs',
  'package.json should register qa:npc-cooking-processing-effects.'
)

for (const effectType of [
  'cook_success_boost',
  'secret_recipes',
  'daily_tofu',
  'tofu_workshop',
  'festival_tofu_feast',
  'wine_cellar',
  'wine_aging_boost',
  'rare_wine',
  'tea_ceremony',
  'private_tea',
  'herb_preorder',
  'herb_craft_boost',
  'rare_herb_channel'
]) {
  assertIncludes(npcFunctionEffectsSource, effectType, `${effectType} should be classified in the NPC function effect registry.`)
}

assertIncludes(
  cookingStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('secret_recipes')",
  'secret_recipes should unlock real recipes in CookingStore.'
)
assertIncludes(
  cookingStoreSource,
  "const NPC_SECRET_RECIPE_IDS = ['longevity_soup', 'chef_special', 'collectors_banquet']",
  'secret_recipes should add the three promised hidden recipes.'
)
assertIncludes(
  cookingStoreSource,
  "npcStore.getNpcFunctionEffectValue('cook_success_boost') / 100",
  'cook_success_boost should be read by the cooking store.'
)
assertIncludes(
  cookingStoreSource,
  'Math.min(0.5, Math.max(0, npcStore.getNpcFunctionEffectValue',
  'cook_success_boost should be capped in cooking quality rolls.'
)
assertIncludes(
  cookingStoreSource,
  'qualityBoostedByNpc ? getNextQuality(baseQuality) : baseQuality',
  'cook_success_boost should upgrade real cooked-food quality when it procs.'
)
assertIncludes(
  cookingStoreSource,
  '王大婶指导生效',
  'cooking result logs should tell the player when NPC quality guidance procs.'
)
assertIncludes(
  cookingViewSource,
  'cookingStore.getPreviewCookQualityWithNpc(recipe.id)',
  'CookingView should preview possible NPC cooking quality improvement.'
)
assertIncludes(
  cookingViewSource,
  'cookingStore.getNpcCookingQualityHint()',
  'CookingView should explain the NPC cooking quality chance.'
)

assertIncludes(
  processingStoreSource,
  "if (mt === 'tea_maker') return npcStore.getNpcFunctionEffectValue('tea_ceremony') / 100",
  'tea_ceremony should affect real tea-maker quality rolls.'
)
assertIncludes(
  processingStoreSource,
  "const _npcPctSpeedType = machineType === 'loom' ? 'cloth_speed' : machineType === 'herb_grinder' ? 'herb_craft_boost' : machineType === 'wine_workshop' ? 'wine_aging_boost' : ''",
  'herb_craft_boost and wine_aging_boost should affect real processing time.'
)
assertIncludes(
  processingStoreSource,
  "npcStore.getNpcFunctionEffectValue(_npcPctSpeedType) / 100",
  'NPC processing speed effects should be read from the centralized NPC store.'
)
assertIncludes(
  processingDataSource,
  "npcFunctionEffectType: 'tofu_workshop'",
  'tofu_workshop should gate the real tofu press machine.'
)
assertIncludes(
  processingStoreSource,
  "if (def?.npcFunctionEffectType && !npcStore.isNpcFunctionEffectUnlocked(def.npcFunctionEffectType)) return false",
  'NPC-gated processing machines should be blocked in store logic.'
)
assertIncludes(
  processingStoreSource,
  "if (gate?.npcFunctionEffectType && !npcStore.isNpcFunctionEffectUnlocked(gate.npcFunctionEffectType)) return false",
  'NPC-gated recipes should be blocked in store logic.'
)

assertIncludes(
  shopStoreSource,
  "getNpcShopEntry('herb_preorder'",
  'herb_preorder should add a real apothecary shop entry.'
)
assertIncludes(
  shopStoreSource,
  "getNpcShopEntry('rare_herb_channel'",
  'rare_herb_channel should add real rare apothecary shop entries.'
)
assertIncludes(
  shopStoreSource,
  "limitLabel: '药材代购'",
  'herb_preorder shop entry should identify its NPC source.'
)
assertIncludes(
  shopStoreSource,
  "limitLabel: '珍稀渠道'",
  'rare_herb_channel shop entries should identify their NPC source.'
)

assertIncludes(
  homeStoreSource,
  "npcStore.getNpcFunctionEffectValue('wine_aging_boost') / 100",
  'wine_aging_boost should affect real cellar aging days.'
)
assertIncludes(
  homeStoreSource,
  'Math.ceil(CELLAR_AGING_DAYS * (1 - agingBonus))',
  'cellar aging should use the NPC-adjusted effective aging duration.'
)
assertIncludes(
  cottageViewSource,
  'cellarAgingDays',
  'CottageView cellar progress should display the NPC-adjusted aging duration.'
)
assertIncludes(
  warehouseStoreSource,
  "getNpcFunctionEffectValue('wine_cellar')",
  'wine_cellar should affect a real storage/cellar capacity path.'
)

assertIncludes(
  endDaySource,
  "effectType: 'daily_tofu'",
  'daily_tofu should be a real daily reward.'
)
assertIncludes(
  endDaySource,
  "effectType: 'rare_wine'",
  'rare_wine should be a real weekly reward.'
)
assertIncludes(
  endDaySource,
  "effectType: 'private_tea'",
  'private_tea should be a real weekly reward.'
)
assertIncludes(
  endDaySource,
  "npcStore.isNpcFunctionEffectUnlocked('spouse_tea_bonus') && npcStore.getSpouse()",
  'spouse_tea_bonus should require an actual spouse before granting weekly tea.'
)
assertIncludes(
  festivalRoomStoreSource + endDaySource,
  "getNpcFunctionEffectValue('festival_tofu_feast')",
  'festival_tofu_feast should affect real festival rewards or festival-day settlement.'
)

assert(
  !npcFunctionsSource.includes('药铺解锁代购功能，先作为状态标记。'),
  'herb_preorder copy must not say it is only a marker after shop wiring exists.'
)
assert(
  !npcFunctionsSource.includes('解锁 +12 格酒类存储，先建立状态标记。'),
  'wine_cellar copy must not say it is only a marker after storage wiring exists.'
)

console.log('qa:npc-cooking-processing-effects passed')
