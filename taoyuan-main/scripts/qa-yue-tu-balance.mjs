/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const near = (actual, expected) => Math.abs(actual - expected) < 1e-9
const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const hiddenNpcTypeSource = readSource('src/types/hiddenNpc.ts')
const hiddenNpcsSource = readSource('src/data/hiddenNpcs.ts')
const playerStoreSource = readSource('src/stores/usePlayerStore.ts')
const hiddenNpcStoreSource = readSource('src/stores/useHiddenNpcStore.ts')
const endDaySource = readSource('src/composables/useEndDay.ts')
const forageViewSource = readSource('src/views/game/ForageView.vue')
const cookingStoreSource = readSource('src/stores/useCookingStore.ts')
const inventoryViewSource = readSource('src/views/game/InventoryView.vue')
const hiddenNpcModalSource = readSource('src/components/game/HiddenNpcModal.vue')

const yueTuBlock = hiddenNpcsSource.match(/id: 'yue_tu'[\s\S]*?manifestationDay:/)?.[0] ?? ''

assert(hiddenNpcTypeSource.includes("type: 'moon_rest'"), 'BondBonusType must include moon_rest.')
assert(hiddenNpcTypeSource.includes('staminaRestore: number'), 'moon_rest must declare staminaRestore.')
assert(hiddenNpcTypeSource.includes('maxStaminaBonus: number'), 'moon_rest must declare maxStaminaBonus.')
assert(hiddenNpcTypeSource.includes('moonHerbChanceBonus: number'), 'moon_rest must declare moonHerbChanceBonus.')

assert(yueTuBlock.includes("type: 'moon_rest'"), 'Yue Tu bond bonus must use moon_rest.')
assert(yueTuBlock.includes('staminaRestore: 30'), 'Yue Tu moon_rest must restore 30 stamina.')
assert(yueTuBlock.includes('maxStaminaBonus: 30'), 'Yue Tu moon_rest must grant +30 temporary max stamina.')
assert(yueTuBlock.includes('moonHerbChanceBonus: 0.05'), 'Yue Tu moon_rest must grant +5% moon herb chance.')
assert(!yueTuBlock.includes("type: 'stamina_restore'"), 'Yue Tu must no longer use stamina_restore.')
assert(yueTuBlock.includes("description: '料理恢复、茶饮与丹药效果+50%'"), 'Yue Tu medicine primer copy must mention cooking, tea, and elixirs.')
assert(yueTuBlock.includes("description: '采集概率获得月草，夜间更高'"), 'Yue Tu moonlight copy must mention higher night chance.')
assert(yueTuBlock.includes("passive: { type: 'luck', value: 15 }"), 'Yue Tu moonlight passive display value must be 15.')

assert(playerStoreSource.includes('temporarySpiritMaxStaminaBonus'), 'Player store must track temporary spirit max stamina.')
assert(playerStoreSource.includes('setTemporarySpiritMaxStaminaBonus'), 'Player store must expose temporary spirit max stamina setter.')
assert(hiddenNpcStoreSource.includes("case 'moon_rest'"), 'Hidden NPC daily bonus must handle moon_rest.')
assert(hiddenNpcStoreSource.includes('setTemporarySpiritMaxStaminaBonus(b.maxStaminaBonus)'), 'moon_rest must set temporary max stamina before restore.')
assert(hiddenNpcStoreSource.includes('restoreStamina(b.staminaRestore)'), 'moon_rest must restore stamina.')
assert(endDaySource.includes('setTemporarySpiritMaxStaminaBonus(0)'), 'End day must clear old spirit stamina reserve before daily reset.')
assert(endDaySource.indexOf('setTemporarySpiritMaxStaminaBonus(0)') < endDaySource.indexOf('playerStore.dailyReset(recoveryMode, bedHour)'), 'Old spirit reserve must be cleared before sleeping recovery.')

assert(forageViewSource.includes('const MOON_HERB_BASE_CHANCE = 0.15'), 'Moon herb base chance must be 15%.')
assert(forageViewSource.includes('const MOON_HERB_MOONLIT_CHANCE = 0.25'), 'Moon herb moonlit chance must be 25%.')
assert(forageViewSource.includes("getBondBonusByType('moon_rest')"), 'Foraging must read moon_rest chance bonus.')
assert(forageViewSource.includes('moonHerbChanceBonus'), 'Foraging must add moon_rest moon herb chance bonus.')
assert(forageViewSource.includes('gameStore.hour >= 20 && gameStore.hour < 24'), 'Moonlit window must cover 20:00-24:00.')
assert(forageViewSource.includes('gameStore.day === 14'), 'Moonlit window must cover day 14.')

assert(cookingStoreSource.includes('const YUE_TU_MEDICINE_EFFECT_MULTIPLIER = 1.5'), 'Medicine primer multiplier must be 1.5.')
assert(cookingStoreSource.includes('applyMoonRabbitAlchemyEffectBonus'), 'Cooking store must centralize Yue Tu alchemy scaling.')
assert(cookingStoreSource.includes('1 + (value - 1) * multiplier'), 'Gift/festival multipliers must only scale the increment above 1.')
assert(cookingStoreSource.includes('staminaRestore: amplifyFlatInteger(effect.staminaRestore, multiplier)'), 'Alchemy stamina restore must be scaled.')
assert(cookingStoreSource.includes('miningStaminaReduction: amplifyFlatNumber(effect.miningStaminaReduction, multiplier)'), 'Alchemy mining stamina reduction must be scaled.')
assert(cookingStoreSource.includes('journeyStaminaReduction: amplifyFlatNumber(effect.journeyStaminaReduction, multiplier)'), 'Alchemy journey stamina reduction must be scaled.')
assert(cookingStoreSource.includes('actionSpeedBonus: amplifyFlatNumber(effect.actionSpeedBonus, multiplier)'), 'Alchemy action speed must be scaled.')
assert(cookingStoreSource.includes('defenseReduction: amplifyFlatNumber(effect.defenseReduction, multiplier)'), 'Alchemy defense reduction must be scaled.')
assert(cookingStoreSource.includes('dialogueAffinityBonus: amplifyFlatInteger(effect.dialogueAffinityBonus, multiplier)'), 'Alchemy dialogue flat bonus must be scaled.')
assert(cookingStoreSource.includes('petCalmFriendshipBonus: amplifyFlatInteger(effect.petCalmFriendshipBonus, multiplier)'), 'Alchemy pet flat bonus must be scaled.')

assert(inventoryViewSource.includes('MOON_RABBIT_TEA_MEDICINE_ITEM_IDS'), 'Inventory recovery must define Yue Tu tea/medicine item set.')
for (const itemId of [
  'green_tea_drink',
  'guest_green_tea',
  'chrysanthemum_tea',
  'processed_osmanthus_tea',
  'ginseng_tea',
  'herbal_tea_blend',
  'fine_herbal_tea_blend',
  'spirit_herbal_tea_blend',
  'celestial_herbal_tea_blend',
  'tavern_herbal_brew'
]) {
  assert(inventoryViewSource.includes(`'${itemId}'`), `Inventory Yue Tu tea/medicine set must include ${itemId}.`)
}
assert(inventoryViewSource.includes("hiddenNpcStore.isAbilityActive('yue_tu_2')"), 'Inventory recovery must check Yue Tu medicine primer.')
assert(inventoryViewSource.includes('getInventoryRecoveryMultiplier(itemId)'), 'Inventory recovery multiplier must be item-aware.')

assert(hiddenNpcModalSource.includes("case 'moon_rest'"), 'Hidden NPC modal must describe moon_rest.')
assert(hiddenNpcModalSource.includes('月露体力储备'), 'Hidden NPC modal copy must mention moon dew stamina reserve.')

const moonHerbChanceModel = ({ active, day, hour, bonded }) => {
  if (!active) return 0
  const base = day === 14 || (hour >= 20 && hour < 24) ? 0.25 : 0.15
  return Math.min(1, base + (bonded ? 0.05 : 0))
}
assert(near(moonHerbChanceModel({ active: true, day: 3, hour: 12, bonded: false }), 0.15), 'Model: normal moon herb chance must be 15%.')
assert(near(moonHerbChanceModel({ active: true, day: 3, hour: 20, bonded: false }), 0.25), 'Model: night moon herb chance must be 25%.')
assert(near(moonHerbChanceModel({ active: true, day: 14, hour: 8, bonded: true }), 0.3), 'Model: bonded day 14 moon herb chance must be 30%.')

const amplifyMultiplierModel = (value, multiplier) => 1 + (value - 1) * multiplier
assert(near(amplifyMultiplierModel(1.08, 1.5), 1.12), 'Model: x1.08 gift/festival multiplier must become x1.12, not x1.62.')
assert(Math.floor(15 * 1.5) === 22, 'Model: flat integer elixir bonuses must be floored after 1.5x scaling.')

if (errors.length > 0) {
  console.error('qa:yue-tu-balance failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('qa:yue-tu-balance passed.')
}
