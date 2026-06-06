/* global process, console */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const read = path => readFileSync(join(root, path), 'utf8')

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const countMatches = (source, pattern) => Array.from(source.matchAll(pattern)).length

const texas = read('src/components/game/TexasHoldemGame.vue')
const buckshot = read('src/components/game/BuckshotRouletteGame.vue')
const hanhaiView = read('src/views/game/HanhaiView.vue')
const hanhaiStore = read('src/stores/useHanhaiStore.ts')

assert(/onMounted,\s*onUnmounted,\s*nextTick/.test(texas), 'TexasHoldemGame.vue must import onUnmounted.')
assert(/const timers = new Set<ReturnType<typeof setTimeout>>\(\)/.test(texas), 'TexasHoldemGame.vue must own timeout handles.')
assert(/let disposed = false/.test(texas), 'TexasHoldemGame.vue must track disposed state.')
assert(/const schedule = \(callback: \(\) => void, delay: number\)/.test(texas), 'TexasHoldemGame.vue must route delays through schedule().')
assert(/if \(!disposed\) callback\(\)/.test(texas), 'TexasHoldemGame.vue schedule callback must guard disposed state.')
assert(/onUnmounted\(\(\) => \{[\s\S]*for \(const timer of timers\) clearTimeout\(timer\)[\s\S]*timers\.clear\(\)[\s\S]*\}\)/.test(texas), 'TexasHoldemGame.vue must clear timers on unmount.')
assert(countMatches(texas, /setTimeout\(/g) === 1, 'TexasHoldemGame.vue should only call setTimeout inside schedule().')
assert(!/setTimeout\(\(\) => dealerTurn\(\)|setTimeout\(\(\) => advanceStreet\(\)|setTimeout\(\(\) => endHand\(|setTimeout\(\(\) => startNextHand\(/.test(texas), 'TexasHoldemGame.vue has a bare gameplay timeout.')

assert(/nextTick,\s*onMounted,\s*onUnmounted/.test(buckshot), 'BuckshotRouletteGame.vue must import onUnmounted.')
assert(/const timers = new Set<ReturnType<typeof setTimeout>>\(\)/.test(buckshot), 'BuckshotRouletteGame.vue must own timeout handles.')
assert(/const delayResolvers = new Set<\(active: boolean\) => void>\(\)/.test(buckshot), 'BuckshotRouletteGame.vue must resolve pending delays on unmount.')
assert(/const delay = \(ms: number\) => new Promise<boolean>/.test(buckshot), 'BuckshotRouletteGame.vue delay() must report whether component is still mounted.')
assert(/if \(!\(await delay\(800\)\)\) return/.test(buckshot), 'BuckshotRouletteGame.vue must guard 800ms awaits.')
assert(/if \(!\(await delay\(600\)\)\) return/.test(buckshot), 'BuckshotRouletteGame.vue must guard dealer self-shot await.')
assert(/if \(!\(await delay\(400\)\)\) return/.test(buckshot), 'BuckshotRouletteGame.vue must guard player blank self-shot await.')
assert(/if \(disposed\) return/.test(buckshot), 'BuckshotRouletteGame.vue must stop after nextTick when disposed.')
assert(/for \(const resolve of delayResolvers\) resolve\(false\)/.test(buckshot), 'BuckshotRouletteGame.vue must release pending delay promises on unmount.')
assert(countMatches(buckshot, /setTimeout\(/g) === 2, 'BuckshotRouletteGame.vue should only call setTimeout inside schedule() and delay().')
assert(!/setTimeout\(\(\) => \{\s*(playerHit|dealerHit)\.value = false/.test(buckshot), 'BuckshotRouletteGame.vue has a bare hit animation timeout.')

assert(/const animationTimers = new Set<ReturnType<typeof setTimeout>>\(\)/.test(hanhaiView), 'HanhaiView.vue must own animation timeout handles.')
assert(/const scheduleAnimation = \(callback: \(\) => void, delay: number\)/.test(hanhaiView), 'HanhaiView.vue must route animation delays through scheduleAnimation().')
assert(/if \(!disposed\) callback\(\)/.test(hanhaiView), 'HanhaiView.vue scheduleAnimation callback must guard disposed state.')
assert(/onUnmounted\(\(\) => \{[\s\S]*for \(const timer of animationTimers\) clearTimeout\(timer\)[\s\S]*animationTimers\.clear\(\)[\s\S]*endHanhaiBgm\(\)/.test(hanhaiView), 'HanhaiView.vue must clear animation timers on unmount.')
assert(countMatches(hanhaiView, /setTimeout\(/g) === 1, 'HanhaiView.vue should only call setTimeout inside scheduleAnimation().')
assert(!/setTimeout\(tick|setTimeout\(\(\) => \{\s*(roulettePhase|dicePhase|cupPhase|cricketPhase|cardPhase)\.value = 'done'/.test(hanhaiView), 'HanhaiView.vue has a bare casino animation timeout.')

assert(/const normalizeActiveTexasSessionForLoad/.test(hanhaiStore), 'useHanhaiStore.ts must normalize active Texas sessions on load.')
assert(/const normalizeActiveBuckshotSessionForLoad/.test(hanhaiStore), 'useHanhaiStore.ts must normalize active Buckshot sessions on load.')
assert(/session\.settled \|\| session\.startedAtDayTag !== getCurrentDayTag\(\)/.test(hanhaiStore), 'useHanhaiStore.ts must drop settled or cross-day active sessions on load.')
assert(/activeTexasSession\.value = normalizeActiveTexasSessionForLoad\(data\?\.activeTexasSession\)/.test(hanhaiStore), 'deserialize() must use normalized Texas active session.')
assert(/activeBuckshotSession\.value = normalizeActiveBuckshotSessionForLoad\(data\?\.activeBuckshotSession\)/.test(hanhaiStore), 'deserialize() must use normalized Buckshot active session.')

const currentDayTag = '1-spring-7'
const validHand = {
  playerHole: [{ suit: 'heart', rank: 'A' }, { suit: 'club', rank: 'K' }],
  dealerHole: [{ suit: 'spade', rank: 'Q' }, { suit: 'diamond', rank: 'J' }],
  community: [
    { suit: 'heart', rank: '2' },
    { suit: 'club', rank: '3' },
    { suit: 'spade', rank: '4' },
    { suit: 'diamond', rank: '5' },
    { suit: 'heart', rank: '6' }
  ]
}

const modelCloneTexas = value => {
  if (!value || typeof value.sessionId !== 'string' || !value.sessionId || !Array.isArray(value.hands)) return null
  if (!['beginner', 'normal', 'expert'].includes(value.tierId)) return null
  const hands = value.hands.filter(hand =>
    Array.isArray(hand?.playerHole)
    && hand.playerHole.length >= 2
    && Array.isArray(hand?.dealerHole)
    && hand.dealerHole.length >= 2
    && Array.isArray(hand?.community)
    && hand.community.length >= 5
  )
  if (hands.length <= 0) return null
  return { ...value, hands, settled: !!value.settled }
}

const modelCloneBuckshot = value => {
  if (!value || typeof value.sessionId !== 'string' || !value.sessionId || !Array.isArray(value.shells)) return null
  const shells = value.shells.filter(shell => shell === 'live' || shell === 'blank')
  if (shells.length <= 0) return null
  return { ...value, shells, settled: !!value.settled }
}

const modelNormalizeForLoad = (session, clone) => {
  const cloned = clone(session)
  if (!cloned || cloned.settled || cloned.startedAtDayTag !== currentDayTag) return null
  return cloned
}

assert(modelNormalizeForLoad({
  sessionId: 'texas_same_day',
  tierId: 'normal',
  tierName: '普通桌',
  entryFee: 100,
  startedAtDayTag: currentDayTag,
  reserveMoney: 300,
  hands: [validHand],
  settled: false
}, modelCloneTexas)?.sessionId === 'texas_same_day', 'same-day unsettled Texas session should survive load normalization.')

assert(modelNormalizeForLoad({
  sessionId: 'texas_cross_day',
  tierId: 'normal',
  tierName: '普通桌',
  entryFee: 100,
  startedAtDayTag: '1-spring-6',
  reserveMoney: 300,
  hands: [validHand],
  settled: false
}, modelCloneTexas) === null, 'cross-day Texas session should be dropped on load.')

assert(modelNormalizeForLoad({
  sessionId: 'buckshot_settled',
  startedAtDayTag: currentDayTag,
  shells: ['live', 'blank'],
  playerFirst: true,
  settled: true
}, modelCloneBuckshot) === null, 'settled Buckshot session should be dropped on load.')

assert(modelNormalizeForLoad({
  sessionId: 'buckshot_invalid_shells',
  startedAtDayTag: currentDayTag,
  shells: ['spent', 'unknown'],
  playerFirst: false,
  settled: false
}, modelCloneBuckshot) === null, 'Buckshot session with no valid shells should be dropped on load.')

console.log('qa-hanhai-session-timer-guards: ok')
