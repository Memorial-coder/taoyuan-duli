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
const decorationStoreSource = read('src', 'stores', 'useDecorationStore.ts')
const decorationViewSource = read('src', 'views', 'game', 'DecorationView.vue')
const cottageViewSource = read('src', 'views', 'game', 'CottageView.vue')
const npcStoreSource = read('src', 'stores', 'useNpcStore.ts')
const shopStoreSource = read('src', 'stores', 'useShopStore.ts')
const shopCatalogSource = read('src', 'data', 'shopCatalog.ts')
const decorationsSource = read('src', 'data', 'decorations.ts')
const processingDataSource = read('src', 'data', 'processing.ts')
const processingStoreSource = read('src', 'stores', 'useProcessingStore.ts')
const endDaySource = read('src', 'composables', 'useEndDay.ts')
const festivalRoomStoreSource = read('src', 'stores', 'useFestivalRoomStore.ts')
const festivalViewSource = read('src', 'views', 'game', 'online', 'OnlineFestivalView.vue')
const socialStoreSource = read('src', 'stores', 'useSocialStore.ts')
const onlineNeighborViewSource = read('src', 'views', 'game', 'online', 'OnlineNeighborView.vue')
const socialViewSource = read('src', 'views', 'game', 'SocialView.vue')

assert(
  packageJson.scripts?.['qa:decoration-linkage-effects'] === 'node scripts/qa-decoration-linkage-effects.mjs',
  'package.json should register qa:decoration-linkage-effects.'
)

for (const effectType of [
  'farmhouse_portrait',
  'scenic_paintings',
  'calligraphy',
  'letter_writing',
  'festival_music',
  'special_perform',
  'custom_furniture'
]) {
  assertIncludes(npcFunctionEffectsSource, effectType, `${effectType} should be classified in the NPC function effect registry.`)
  assertIncludes(npcFunctionsSource, `effectType: '${effectType}'`, `${effectType} should have an NPC unlock definition.`)
}

assertIncludes(
  decorationStoreSource,
  "npcStore.getNpcFunctionEffectValue('farmhouse_portrait')",
  'farmhouse_portrait should be read by the decoration store.'
)
assertIncludes(
  decorationStoreSource,
  'return total + npcFarmhousePortraitBeautyBonus.value',
  'farmhouse_portrait should affect real beautyScore.'
)
assertIncludes(
  npcStoreSource,
  'decorationStore.beautyScore >= 100 ? 250 : 0',
  'decoration beautyScore should still affect real NPC friendship caps.'
)
assertIncludes(
  shopStoreSource,
  'const decorationDiscount = useDecorationStore().shopDiscountBonus / 100',
  'decoration beautyScore should still affect real shop discounts.'
)

assertIncludes(
  decorationStoreSource,
  "npcStore.getNpcFunctionEffectValue('scenic_paintings')",
  'scenic_paintings should be read by the decoration store.'
)
assertIncludes(
  decorationStoreSource,
  '(beautyScore.value >= 50 ? 1 : 0) + npcScenicPaintingsDailyFriendshipBonus.value',
  'scenic_paintings should affect the bounded daily friendship bonus.'
)
assertIncludes(
  npcStoreSource,
  'const beautyBonus = decorationStore.dailyFriendshipBonus',
  'daily decoration friendship bonus should be consumed by NPC daily reset.'
)
assertIncludes(
  npcStoreSource,
  'state.friendship = Math.min(cap, state.friendship + beautyBonus)',
  'daily decoration friendship bonus should respect NPC caps.'
)

assertIncludes(
  decorationStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('custom_furniture')",
  'custom_furniture should be read by the decoration store.'
)
assertIncludes(
  decorationStoreSource,
  'def.purchaseMode === \'catalog\'',
  'custom_furniture should interact with catalog-limited decorations.'
)
assertIncludes(
  decorationsSource,
  "purchaseMode: 'catalog'",
  'decorations data should include catalog-limited furniture.'
)
assertIncludes(
  shopCatalogSource,
  "effect: { type: 'unlock_decoration' }",
  'shop catalog should also unlock decoration furniture.'
)
assertIncludes(
  shopStoreSource,
  'unlockCatalogDecoration',
  'shop catalog decoration purchases should grant and place real decorations.'
)

assertIncludes(
  processingDataSource,
  "gate: { npcFunctionEffectType: 'calligraphy' }",
  'calligraphy should gate a real hidden processing recipe.'
)
assertIncludes(
  processingDataSource,
  "id: 'grind_calligraphy_ink'",
  'calligraphy should expose the hidden calligraphy-ink recipe.'
)
assertIncludes(
  processingStoreSource,
  "if (gate?.npcFunctionEffectType && !npcStore.isNpcFunctionEffectUnlocked(gate.npcFunctionEffectType)) return false",
  'processing store should enforce NPC-gated hidden recipes.'
)

assertIncludes(
  socialStoreSource,
  "useNpcStore().isNpcFunctionEffectUnlocked('letter_writing')",
  'letter_writing should be read by the social store.'
)
assertIncludes(
  socialStoreSource,
  'npcLetterWritingInviteCapacityBonus',
  'letter_writing should expose a concrete invite-capacity bonus.'
)
assertIncludes(
  socialStoreSource,
  'capacity: effectiveNeighborCapacityDraft.value',
  'letter_writing should affect the real neighbor creation payload.'
)
assertIncludes(
  onlineNeighborViewSource,
  'online-neighbor-letter-writing-bonus',
  'online neighbor creation UI should show the letter-writing source.'
)
assertIncludes(
  socialViewSource,
  'social-neighbor-letter-writing-bonus',
  'legacy social neighbor creation UI should show the letter-writing source.'
)

assertIncludes(
  endDaySource,
  "npcStore.getNpcFunctionEffectValue('festival_music') / 100",
  'festival_music should affect real festival friendship rewards.'
)
assertIncludes(
  endDaySource,
  "npcStore.isNpcFunctionEffectUnlocked('special_perform')",
  'special_perform should affect real festival-day friendship settlement.'
)
assertIncludes(
  festivalRoomStoreSource,
  "npcStore.getNpcFunctionEffectValue('festival_music') / 100",
  'online festival room store should surface festival_music.'
)
assertIncludes(
  festivalRoomStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('special_perform')",
  'online festival room store should surface special_perform.'
)
assertIncludes(
  festivalRoomStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('letter_writing')",
  'online festival room store should surface letter_writing as a social invite effect.'
)
assertIncludes(
  festivalViewSource,
  'online-festival-room-npc-bonus-summary',
  'online festival room page should show NPC bonus summary.'
)

assertIncludes(
  decorationViewSource,
  'decoration-npc-effect-summary',
  'decoration UI should show NPC decoration effect source summaries.'
)
assertIncludes(
  decorationViewSource,
  '需赵木匠「定制家具」或商店目录',
  'catalog furniture lock copy should name the NPC unlock source.'
)

assertIncludes(
  decorationsSource,
  'DECORATION_DEMAND_BIAS_RULES',
  'decorations data should define bounded demand-bias rules.'
)
for (const ruleId of ['courtyard_guest_table', 'waterside_leisure', 'archive_showcase']) {
  assertIncludes(decorationsSource, `id: '${ruleId}'`, `missing decoration demand-bias rule: ${ruleId}`)
}
for (const guardrailSnippet of ['只改变每周家庭心愿候选排序', '每周最多一个家庭心愿', '未解锁心愿和无伴侣心愿不会被强行生成']) {
  assertIncludes(decorationsSource, guardrailSnippet, `decoration demand-bias guardrail missing: ${guardrailSnippet}`)
}
assertIncludes(
  decorationStoreSource,
  'decorationDemandBiasOverview',
  'decoration store should expose demand-bias overview.'
)
assertIncludes(
  decorationStoreSource,
  'activeDecorationDemandBiases',
  'decoration store should expose active demand-bias rules.'
)
assertIncludes(
  decorationStoreSource,
  'getFamilyWishDecorationBiasWeight',
  'decoration store should expose family-wish bias weight.'
)
assertIncludes(
  npcStoreSource,
  'getSortedEligibleFamilyWishDefs',
  'NPC store should sort family wishes through a shared eligible-wish helper.'
)
assertIncludes(
  npcStoreSource,
  'decorationStore.getFamilyWishDecorationBiasWeight(left.id)',
  'Family wish ordering should consume decoration demand-bias weight.'
)
assertIncludes(
  npcStoreSource,
  'getFamilyWishDecorationBias',
  'NPC store should expose family-wish decoration bias details.'
)
assertIncludes(
  decorationViewSource,
  'data-testid="decoration-demand-bias-panel"',
  'decoration UI should show demand-bias panel.'
)
assertIncludes(
  decorationViewSource,
  'data-testid="decoration-demand-bias-row"',
  'decoration UI should show demand-bias rows.'
)
assertIncludes(
  cottageViewSource,
  'data-testid="cottage-family-wish-decoration-bias"',
  'Cottage active family wish should show decoration bias source.'
)
assertIncludes(
  cottageViewSource,
  'data-testid="cottage-family-wish-next-decoration-bias"',
  'Cottage next family wish preview should show decoration bias source.'
)

for (const forbiddenCopy of [
  '后续接入农舍装饰效果',
  '放置 3 处画作装饰，每处 +3% 好感获取',
  '节庆邀请 NPC +1 人',
  '节庆表演成功率 +20%',
  '解锁独特装饰品配方。'
]) {
  assert(!npcFunctionsSource.includes(forbiddenCopy), `NPC function copy should not keep obsolete text: ${forbiddenCopy}`)
}

console.log('qa:decoration-linkage-effects passed')
