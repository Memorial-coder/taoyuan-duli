/* global process, console */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const gameLayout = read('src/views/GameLayout.vue')
const mainMenu = read('src/views/MainMenu.vue')
const router = read('src/router/index.ts')

assert(/data-testid="game-deeplink-restore"/.test(gameLayout), 'GameLayout.vue must render a recovery state for direct /game links.')
assert(/const deepLinkRecoveryInProgress = ref\(!gameStore\.isGameStarted\)/.test(gameLayout), 'GameLayout.vue must track deep-link recovery before a game has started.')
assert(!/if \(!gameStore\.isGameStarted\) \{\s*void router\.replace\('\/'\)\s*\}/.test(gameLayout), 'GameLayout.vue must not immediately redirect direct /game links to menu.')
assert(/const resolveDeepLinkRecoverySlot = async \(\) =>/.test(gameLayout), 'GameLayout.vue must resolve a recovery slot.')
assert(/saveStore\.activeSlot >= 0 && saveStore\.activeSlotMode === saveStore\.storageMode/.test(gameLayout), 'Deep-link recovery must prefer the active slot when it still matches the current storage mode.')
assert(/const slots = await saveStore\.getSlots\(\)/.test(gameLayout), 'Deep-link recovery must inspect available slots when there is no active runtime slot.')
assert(/filter\(slot => slot\.exists && !slot\.readBlocked\)/.test(gameLayout), 'Deep-link recovery must ignore missing or read-blocked slots.')
assert(/getSavedAtTimestamp\(right\) - getSavedAtTimestamp\(left\) \|\| left\.slot - right\.slot/.test(gameLayout), 'Deep-link recovery must pick the newest readable slot with deterministic tie-break.')
assert(/await saveStore\.loadFromSlot\(recoverySlot\)/.test(gameLayout), 'Deep-link recovery must load the selected slot before rendering the game.')
assert(/redirect: requestedFullPath/.test(gameLayout), 'Failed deep-link recovery must preserve the requested /game path for menu recovery.')
assert(/onMounted\(async \(\) => \{\s*if \(!\(await recoverGameDeepLink\(\)\)\) return\s*startGameLayoutRuntime\(\)\s*\}\)/.test(gameLayout), 'GameLayout runtime must start only after recovery succeeds.')

assert(/import \{ useRoute, useRouter \} from 'vue-router'/.test(mainMenu), 'MainMenu.vue must read redirect query state as well as navigate.')
assert(/const pendingRedirectRoute = computed\(\(\) => resolveSafeGameRedirectRoute\(route\.query\.redirect\)\)/.test(mainMenu), 'MainMenu.vue must normalize a preserved /game redirect query.')
assert(/!target\.startsWith\('\/'\) \|\| target\.startsWith\('\/\/'\)/.test(mainMenu), 'MainMenu.vue must reject external redirect targets.')
assert(/normalized === '\/game' \|\| normalized\.startsWith\('\/game\/'\)/.test(mainMenu), 'MainMenu.vue must only accept in-game redirect targets.')
assert(/pendingPostLoadRoute\.value = options\.route \?\? pendingRedirectRoute\.value/.test(mainMenu), 'Loading a save from a deeplink fallback must continue to the preserved game route.')
assert(/router\.push\(pendingRedirectRoute\.value \|\| '\/game'\)/.test(mainMenu), 'Starting a new game from a deeplink fallback must continue to the preserved game route.')

assert(/path: 'farm', name: 'farm'/.test(router), 'Router must keep /game/farm as a valid deep link.')
assert(/redirect: '\/game\/farm'/.test(router), 'Router must keep /game redirecting to farm.')

const sampleSlots = [
  { slot: 0, exists: true, readBlocked: false, savedAt: '2026-06-05T12:00:00.000Z' },
  { slot: 1, exists: true, readBlocked: true, savedAt: '2026-06-06T12:00:00.000Z' },
  { slot: 2, exists: true, readBlocked: false, savedAt: '2026-06-06T08:00:00.000Z' }
]
const newestReadable = sampleSlots
  .filter(slot => slot.exists && !slot.readBlocked)
  .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt) || left.slot - right.slot)[0]
assert(newestReadable?.slot === 2, 'Recovery slot model must choose the newest readable slot and skip blocked saves.')

console.log('qa-game-deeplink-restore-guards: ok')
