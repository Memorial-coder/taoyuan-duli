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
const fishingStoreSource = read('src', 'stores', 'useFishingStore.ts')
const fishingViewSource = read('src', 'views', 'game', 'FishingView.vue')
const fishPondStoreSource = read('src', 'stores', 'useFishPondStore.ts')
const fishPondViewSource = read('src', 'views', 'game', 'FishPondView.vue')

assert(
  packageJson.scripts?.['qa:npc-fishing-pond-effects'] === 'node scripts/qa-npc-fishing-pond-effects.mjs',
  'package.json should register qa:npc-fishing-pond-effects.'
)

for (const effectType of [
  'fish_odds_display',
  'tackle_maintain',
  'spouse_fishing_boost',
  'fishing_easy',
  'secret_fishing_style',
  'deep_water_spot'
]) {
  assertIncludes(npcFunctionEffectsSource, effectType, `${effectType} should be classified in the NPC function effect registry.`)
}

assertIncludes(
  fishingStoreSource,
  "const isDeepWaterSpotUnlocked = computed(() => npcStore.isNpcFunctionEffectUnlocked('deep_water_spot'))",
  'deep_water_spot should be exposed as a fishing-store unlock.'
)
assertIncludes(
  fishingStoreSource,
  "const DEEP_WATER_LOCATIONS = new Set<FishingLocation>(['waterfall', 'swamp'])",
  'deep_water_spot should own the real waterfall and swamp location set.'
)
assertIncludes(
  fishingStoreSource,
  'const isFishingLocationUnlocked = (loc: FishingLocation): boolean =>',
  'fishing store should centralize location unlock checks.'
)
assertIncludes(
  fishingStoreSource,
  'if (!isFishingLocationUnlocked(loc)) return false',
  'setLocation should reject locked deep-water locations.'
)
assertIncludes(
  fishingStoreSource,
  'isFishingLocationUnlocked(fishingLocation.value)',
  'availableFish should be empty for a locked current deep-water location.'
)
assertIncludes(
  fishingStoreSource,
  'if (!isFishingLocationUnlocked(loc)) return []',
  'bait-adjusted fish pool should also reject locked deep-water locations.'
)
assertIncludes(
  fishingStoreSource,
  'deepWaterAvailableFish',
  'fishing store should expose real deep-water candidate count for UI feedback.'
)
assertIncludes(
  fishingStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('deep_water_spot') && ['waterfall', 'swamp'].includes",
  'deep_water_spot should still affect bounded deep-water fish weights after unlocking.'
)

assertIncludes(
  fishingStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('fish_odds_display')",
  'fish_odds_display should gate the odds preview.'
)
assertIncludes(
  fishingStoreSource,
  'difficultyBaseWeight[fish.difficulty] * getNpcFishWeightMultiplier(fish)',
  'fish_odds_display should preview NPC-adjusted catch weights.'
)
assertIncludes(
  fishingStoreSource,
  "npcStore.isNpcFunctionEffectUnlocked('tackle_maintain') || Math.random() >= 0.3",
  'tackle_maintain should affect real tackle durability consumption.'
)
assertIncludes(
  fishingStoreSource,
  "npcStore.getNpcFunctionEffectValue('fishing_easy') / 100",
  'fishing_easy should read its NPC effect value.'
)
assertIncludes(
  fishingStoreSource,
  'Math.min(0.4, Math.max(0, npcStore.getNpcFunctionEffectValue',
  'fishing_easy should keep a hard cap instead of stacking into trivial catches.'
)
assertIncludes(
  fishingStoreSource,
  "npcStore.getNpcFunctionEffectValue('secret_fishing_style')",
  'secret_fishing_style should affect fish weights.'
)
assertIncludes(
  fishingStoreSource,
  "npcStore.getNpcFunctionEffectValue('spouse_fishing_boost')",
  'spouse_fishing_boost should affect hard or legendary fish weights.'
)

assertIncludes(
  fishingViewSource,
  'v-for="loc in fishingStore.fishingLocationOptions"',
  'FishingView should render lock-aware location options.'
)
assertIncludes(
  fishingViewSource,
  'getFishingLocationClass(loc)',
  'FishingView should visually distinguish locked deep-water locations.'
)
assertIncludes(
  fishingViewSource,
  '需要先解锁李渔的「深水线索」',
  'FishingView should tell the player why a deep-water location is locked.'
)
assertIncludes(
  fishingViewSource,
  'fishingStore.deepWaterAvailableFish.length',
  'FishingView should show unlocked deep-water candidate count.'
)

assertIncludes(
  fishPondStoreSource,
  'const deepWaterPondHints = computed(() =>',
  'fish pond store should expose deep-water sample hints.'
)
assertIncludes(
  fishPondStoreSource,
  "new Set(['rainbow_trout', 'mud_loach', 'giant_salamander', 'yellow_eel'])",
  'deep-water fish pond hints should target pondable deep-water species.'
)
assertIncludes(
  fishPondViewSource,
  'fishingStore.isDeepWaterSpotUnlocked && fishPondStore.deepWaterPondHints.length > 0',
  'FishPondView should only show NPC deep-water sample cards after the NPC unlock.'
)
assertIncludes(
  fishPondViewSource,
  '李渔深水样本',
  'FishPondView should surface the NPC fishing-to-pond linkage.'
)
assertIncludes(
  fishPondViewSource,
  "navigateToPanel('fishing')",
  'FishPondView should route unlocked players back to fishing when no deep-water samples are in the pond.'
)

assertIncludes(
  npcFunctionsSource,
  '解锁瀑布与沼泽深水钓点',
  'deep_water_spot NPC copy should describe the now-wired location unlock.'
)
assert(
  !npcFunctionsSource.includes('后续接入钓点列表'),
  'deep_water_spot NPC copy must not claim future wiring after the feature is connected.'
)

console.log('qa:npc-fishing-pond-effects passed')
