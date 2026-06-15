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
  'qa:potential-ui-structure'
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
  'potential-resource-grid',
  'potential-branch-summary',
  'potential-node-grid',
  'potential-respec-panel',
  'potential-source-grid'
]) {
  assert(potentialViewSource.includes(`data-testid="${testId}"`), `PotentialView missing ${testId}.`)
}

assert(potentialViewSource.includes('refundPotentialBranch'), 'potential page must expose branch respec action.')
assert(potentialViewSource.includes('getPotentialBranchRefundPreview'), 'potential page must preview branch respec refunds.')
assert(potentialViewSource.includes('@media (max-width: 420px)'), 'potential page must keep a mobile-specific layout guard.')
assert(potentialViewSource.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'potential branch tabs must collapse on narrow screens.')
assert(potentialViewSource.includes('grid-template-columns: minmax(0, 1fr)'), 'potential node grid must become single-column on narrow screens.')
assert(potentialViewSource.includes('.potential-action-btn') && potentialViewSource.includes('width: 100%'), 'potential upgrade buttons must have stable width.')

const template = potentialViewSource.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? ''
const visibleTextSurface = template
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\{\{[\s\S]*?\}\}/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')

for (const forbidden of ['effectKey', 'store', 'QA', 'migration', 'guard', 'fallback', '明日之后']) {
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
