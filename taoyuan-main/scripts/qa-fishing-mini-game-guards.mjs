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

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const typesSource = readSource('src/types/skill.ts')
const fishingStoreSource = readSource('src/stores/useFishingStore.ts')
const fishingMiniGameSource = readSource('src/components/game/FishingMiniGame.vue')
const fishingViewSource = readSource('src/views/game/FishingView.vue')
const processingDataSource = readSource('src/data/processing.ts')

assert(typesSource.includes('lineBreakChances: number'), 'MiniGameParams must carry line-break chances.')
assert(typesSource.includes('struggleChance: number'), 'MiniGameParams must carry struggle event chance.')
assert(typesSource.includes('struggleSuccessChance: number'), 'MiniGameParams must carry struggle success chance.')
assert(typesSource.includes("failureReason?: 'line_broken' | 'timeout'"), 'MiniGameResult must report poor-failure reason.')
assert(typesSource.includes('lineBreaksPrevented: number'), 'MiniGameResult must report saved line breaks.')
assert(typesSource.includes('struggleSuccessCount: number'), 'MiniGameResult must report stabilized struggles.')

assert(fishingStoreSource.includes('const FISHING_STRUGGLE_CHANCE_BY_DIFFICULTY'), 'Fishing store must define difficulty-based struggle frequency.')
assert(fishingStoreSource.includes('const FISHING_LINE_BREAK_RECOVERY_SCORE = 18'), 'Line-break protection must recover to a controlled progress value.')
assert(fishingStoreSource.includes("fishingSkill.perk5 === 'trapper' ? 0.15 : 0"), 'Trapper perk must improve struggle success chance.')
assert(fishingStoreSource.includes('activeBaitDef.value.struggleBonus * baitEffectMultiplier'), 'Bait struggle bonus must be amplified by bait-route perks.')
assert(fishingStoreSource.includes('lineBreakChances += activeTackleDef.value.extraBreakChance'), 'Trap bobber extra break chance must become actual line-break protection.')
assert(fishingStoreSource.includes('struggleSuccessChance += activeTackleDef.value.struggleBonus'), 'Cork bobber must improve real struggle success chance.')
assert(fishingStoreSource.includes("context.failureReason === 'line_broken'"), 'Line-break failure must produce a distinct catch message.')

assert(fishingMiniGameSource.includes('const LINE_BREAK_MIN_PEAK_SCORE = 25'), 'Line breaks should only start after meaningful catch progress.')
assert(fishingMiniGameSource.includes('const remainingLineBreakChances = ref'), 'Fishing minigame must track remaining line-break protection.')
assert(fishingMiniGameSource.includes('const maybeTriggerStruggle ='), 'Fishing minigame must run a real struggle event check.')
assert(fishingMiniGameSource.includes('remainingLineBreakChances.value--'), 'Line-break protection must consume a remaining chance.')
assert(fishingMiniGameSource.includes("endGame('poor', 'line_broken')"), 'Unprotected line break must end as line_broken poor result.')
assert(fishingMiniGameSource.includes('struggleSuccessCount++'), 'Successful struggles must be counted.')
assert(fishingMiniGameSource.includes('props.struggleScoreLoss'), 'Failed struggles must directly reduce catch progress.')
assert(fishingMiniGameSource.includes('断线 {{ remainingLineBreakChances }}/{{ totalLineBreakChances }}'), 'Fishing minigame must show remaining line-break protection.')
assert(fishingMiniGameSource.includes('挣扎 {{ struggleSuccessPercent }}%'), 'Fishing minigame must show struggle success chance.')

assert(fishingViewSource.includes('搏鱼过程：'), 'Fishing view must log line-break and struggle events after the minigame.')
assert(fishingViewSource.includes('completeFishing(result.rating, { failureReason: result.failureReason })'), 'Fishing completion must pass failure reason to settlement.')

assert(processingDataSource.includes('脱钩时进度流失减半，断线时自动续线1次。'), 'Trap bobber copy must describe the actual line-break mechanic.')
assert(processingDataSource.includes('钩区更宽，挣扎成功率+25%。'), 'Cork bobber copy must describe the real hook and struggle effects.')
assert(!processingDataSource.includes("description: '断线时获得1次额外机会。'"), 'Old vague trap bobber copy must not return.')

if (errors.length > 0) {
  console.error('Fishing minigame guard failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Fishing minigame guard passed.')
