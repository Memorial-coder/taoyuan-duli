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
const packageJson = JSON.parse(readSource('package.json'))
const miningViewSource = readSource('src/views/game/MiningView.vue')

assert(
  packageJson.scripts?.['qa:mining-hud-structure'] === 'node scripts/qa-mining-hud-structure.mjs',
  'package.json must register qa:mining-hud-structure.'
)

assert(miningViewSource.includes('data-testid="mining-explore-status-strip"'), 'explore dialog must render a mining HUD strip.')
assert(miningViewSource.includes('data-testid="mining-combat-status-strip"'), 'combat dialog must render a mining HUD strip.')
assert((miningViewSource.match(/class="mining-status-strip"/g) ?? []).length === 2, 'both mining dialogs must use the shared HUD strip class.')

for (const testId of ['mining-status-time', 'mining-status-stamina', 'mining-status-hp']) {
  assert((miningViewSource.match(new RegExp(`data-testid="${testId}"`, 'g')) ?? []).length === 2, `both mining dialogs must render ${testId}.`)
}

for (const snippet of [
  '{{ gameStore.timeDisplay }}',
  '{{ playerStore.stamina }}/{{ playerStore.maxStamina }}',
  '{{ playerStore.hp }}/{{ playerStore.getMaxHp() }}'
]) {
  assert(miningViewSource.includes(snippet), `mining HUD must display ${snippet}.`)
}

assert(/import \{[\s\S]*\bClock\b[\s\S]*\bHeart\b[\s\S]*\} from 'lucide-vue-next'/.test(miningViewSource), 'mining HUD must import Clock and Heart icons.')
assert(miningViewSource.includes('const miningHudTimeClass = computed'), 'mining HUD must classify time danger state.')
assert(miningViewSource.includes('const miningHudStaminaClass = computed'), 'mining HUD must classify stamina danger state.')
assert(miningViewSource.includes('const miningHudHpClass = computed'), 'mining HUD must classify HP danger state.')
assert(miningViewSource.includes('gameStore.isLateNight'), 'time HUD must react to late-night state.')
assert(miningViewSource.includes('playerStore.staminaPercent'), 'stamina HUD must react to stamina percentage.')
assert(miningViewSource.includes('playerStore.getHpPercent()'), 'HP HUD must react to HP percentage.')

assert(miningViewSource.includes('data-testid="mining-elevator-panel"'), 'mining elevator modal must expose a stable panel test id.')
assert(
  /data-testid="mining-elevator-panel"[\s\S]*class="[^"]*max-h-\[82dvh\][^"]*\boverflow-y-auto\b[^"]*\boverscroll-contain\b/.test(miningViewSource),
  'mining elevator modal must cap panel height and contain long-list scrolling.'
)
assert(miningViewSource.includes('data-testid="mining-skull-elevator-floor-list"'), 'skull cavern floor shortcuts must expose a stable list test id.')
assert(
  /data-testid="mining-skull-elevator-floor-list"[\s\S]*class="[^"]*\bmax-h-48\b[^"]*\boverflow-y-auto\b/.test(miningViewSource),
  'skull cavern floor shortcuts must scroll internally when many safe points are unlocked.'
)

assert(miningViewSource.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'mining HUD must remain a stable three-column strip.')
assert(
  miningViewSource.includes('container-type: inline-size'),
  'mining HUD strip must use inline-size container queries so compact dialogs trigger the narrow fallback.'
)
assert(
  miningViewSource.includes('@container (max-width: 340px)'),
  'mining HUD must hide labels when the strip itself is narrow enough to compress time.'
)
assert(miningViewSource.includes('.mining-status-item > svg'), 'mining HUD icons must not shrink before labels collapse.')
assert(miningViewSource.includes('env(safe-area-inset-top, 0px)'), 'mining dialog overlay must respect mobile safe-area top inset.')
assert(miningViewSource.includes('rgb(var(--color-accent-rgb) / 0.18)'), 'mining HUD translucent accent border must use the RGB token.')
assert(miningViewSource.includes('rgb(var(--color-muted-rgb))'), 'mining HUD label color must use the RGB token.')
assert(!miningViewSource.includes('rgb(var(--color-accent) /'), 'mining HUD must not use the hex accent token inside rgb().')
assert(!miningViewSource.includes('rgb(var(--color-muted))'), 'mining HUD must not use the hex muted token inside rgb().')

if (errors.length > 0) {
  console.error(`qa-mining-hud-structure failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-mining-hud-structure passed')
