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
const routerSource = readSource('src/router/index.ts')
const mobileMenuSource = readSource('src/components/game/MobileMapMenu.vue')
const potentialViewSource = readSource('src/views/game/PotentialView.vue')
const charInfoSource = readSource('src/views/game/CharInfoView.vue')
const skillViewSource = readSource('src/views/game/SkillView.vue')
const guideViewSource = readSource('src/views/GuideView.vue')
const sampleSavesSource = readSource('src/data/sampleSaves.ts')

for (const scriptName of [
  'qa:potential-save-guards',
  'qa:potential-effect-guards',
  'qa:potential-resource-guards',
  'qa:potential-ui-structure',
  'qa:potential-random-npc-guards'
]) {
  assert(
    packageJson.scripts?.[scriptName] === `node scripts/${scriptName.replace('qa:', 'qa-')}.mjs`,
    `package.json should register ${scriptName}`
  )
}

assert(routerSource.includes("path: 'potential'") && routerSource.includes('PotentialView.vue'), 'router must expose the potential page.')
assert(mobileMenuSource.includes("'potential'"), 'mobile map menu must include potential in the personal group.')
assert(skillViewSource.includes("navigateToPanel('potential')"), 'skill page must link to potential.')
assert(charInfoSource.includes('data-testid="charinfo-potential-summary"'), 'character info page must show a potential summary.')
assert(charInfoSource.includes('goToPotential') && charInfoSource.includes("navigateToPanel('potential')"), 'character info potential summary must navigate to potential.')
assert(guideViewSource.includes('goPotential') && guideViewSource.includes("{ name: 'potential' }"), 'guide page must link to potential.')
assert(sampleSavesSource.includes("recommendedRouteName: 'potential'"), 'late-game sample must be able to open on potential.')

for (const testId of [
  'potential-view',
  'potential-overview-section',
  'potential-resource-grid',
  'potential-unlock-result',
  'potential-upgrade-dialog',
  'potential-current-section',
  'potential-branch-summary',
  'potential-next-step',
  'potential-node-grid',
  'potential-respec-panel',
  'potential-source-section',
  'potential-source-grid',
  'potential-source-progress'
]) {
  assert(potentialViewSource.includes(`data-testid="${testId}"`), `PotentialView missing ${testId}.`)
}

assert(potentialViewSource.includes('refundPotentialBranch'), 'potential page must expose branch respec action.')
assert(potentialViewSource.includes('getPotentialBranchRefundPreview'), 'potential page must preview branch respec refunds.')
assert(potentialViewSource.includes('lastUnlockResult'), 'potential page must show an upgrade result panel after successful comprehension.')
assert(potentialViewSource.includes('effectChangeDisplay'), 'potential upgrade feedback must describe the concrete effect delta.')
assert(potentialViewSource.includes('pendingUpgradeNodeId') && potentialViewSource.includes('upgradePreview'), 'potential page must stage upgrade preview state before spending resources.')
assert(potentialViewSource.includes('openUpgradePreview') && potentialViewSource.includes('confirmUpgrade'), 'potential page must preview and confirm potential upgrades separately.')
assert(potentialViewSource.includes('下一级预览') && potentialViewSource.includes('确认参悟'), 'potential upgrade dialog must show the next-rank preview and confirmation action.')
assert(potentialViewSource.includes('potential-section-panel') && potentialViewSource.includes('potential-section-header') && potentialViewSource.includes('potential-section-title'), 'potential page must use shallow section panels for visual grouping.')
assert(
  /data-testid="potential-overview-section"[\s\S]*data-testid="potential-resource-grid"[\s\S]*role="tablist"/.test(potentialViewSource),
  'potential overview section must group resources with branch entry tabs.'
)
assert(
  /data-testid="potential-current-section"[\s\S]*data-testid="potential-branch-summary"[\s\S]*data-testid="potential-next-step"[\s\S]*data-testid="potential-node-grid"/.test(potentialViewSource),
  'potential current section must group branch summary, next step, and node cards.'
)
assert(
  /data-testid="potential-source-section"[\s\S]*data-testid="potential-source-grid"/.test(potentialViewSource),
  'potential source section must frame source progress rows.'
)
assert(potentialViewSource.includes('potential-respec-content'), 'potential respec panel must keep its action content inside a shallow framed row.')
assert(/<Transition name="potential-upgrade-pop">[\s\S]*data-testid="potential-upgrade-dialog"/.test(potentialViewSource), 'potential upgrade dialog must use a transition animation.')
assert(
  potentialViewSource.includes('.potential-upgrade-pop-enter-active') && potentialViewSource.includes('@media (prefers-reduced-motion: reduce)'),
  'potential upgrade dialog transition must include reduced-motion handling.'
)
assert(potentialViewSource.includes('getPotentialSourceProgress'), 'potential source rows must show current period progress.')
assert(potentialViewSource.includes('potential-status-badge'), 'potential nodes must expose clear state badges.')
assert(potentialViewSource.includes('potential-node-ready') && !potentialViewSource.includes('potential-node-planned'), 'potential nodes must distinguish ready states without showing planned-state styling.')
assert(potentialViewSource.includes("nextStep.action === 'randomNpc'") && potentialViewSource.includes("navigateToPanel('village')"), 'potential page must route random NPC gates to the village panel.')
assert(!potentialViewSource.includes('暂未开放') && !potentialViewSource.includes('首版') && !potentialViewSource.includes('规划中'), 'potential page must not expose first-version or planned-state copy.')
assert(potentialViewSource.includes('@media (max-width: 420px)'), 'potential page must keep a mobile-specific layout guard.')
assert(potentialViewSource.includes('.potential-section-panel') && potentialViewSource.includes('padding: 0.625rem'), 'potential section panels must tighten spacing on narrow screens.')
assert(potentialViewSource.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'potential branch tabs must collapse on narrow screens.')
assert(potentialViewSource.includes('grid-template-columns: minmax(0, 1fr)'), 'potential node grid must become single-column on narrow screens.')
assert(potentialViewSource.includes('.potential-action-btn') && potentialViewSource.includes('width: 100%'), 'potential upgrade buttons must have stable width.')
assert(potentialViewSource.includes('.potential-upgrade-dialog') && potentialViewSource.includes('max-height: min(38rem, 88dvh)'), 'potential upgrade dialog must keep a fixed shell with internal scrolling.')

const template = potentialViewSource.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? ''
const visibleTextSurface = template
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\{\{[\s\S]*?\}\}/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')

for (const forbidden of ['effectKey', 'store', 'QA', 'migration', 'guard', 'fallback', '首版', '规划中', '明日之后']) {
  assert(!visibleTextSurface.toLowerCase().includes(forbidden.toLowerCase()), `potential page visible copy must not expose internal word: ${forbidden}`)
}

for (const source of [potentialViewSource, charInfoSource, skillViewSource, guideViewSource]) {
  assert(!source.includes('明日之后'), 'player-facing potential UI must not copy external game terminology.')
}

if (errors.length > 0) {
  console.error(`qa-potential-ui-structure failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-potential-ui-structure passed')
