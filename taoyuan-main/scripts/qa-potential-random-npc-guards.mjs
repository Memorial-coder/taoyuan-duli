/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const filePath = fileURLToPath(url)
      const source = fs.readFileSync(filePath, 'utf8')
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.Preserve,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
        fileName: filePath
      })
      return { format: 'module', source: transpiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  }
})

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const readSource = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const packageJson = JSON.parse(readSource('package.json'))
const potentialTypesSource = readSource('src/types/potential.ts')
const potentialDataSource = readSource('src/data/potential.ts')
const potentialStoreSource = readSource('src/stores/usePotentialStore.ts')
const npcStoreSource = readSource('src/stores/useNpcStore.ts')
const potentialViewSource = readSource('src/views/game/PotentialView.vue')

const { POTENTIAL_NODE_DEFS } = await import(pathToFileURL(path.join(srcRoot, 'data/potential.ts')).href)
const nodeById = new Map(POTENTIAL_NODE_DEFS.map(node => [node.id, node]))
const randomConditions = nodeId =>
  (nodeById.get(nodeId)?.unlockConditions ?? []).filter(condition => condition.kind === 'randomNpcMilestone')
const hasRandomCondition = (nodeId, milestone, value) =>
  randomConditions(nodeId).some(condition => condition.milestone === milestone && condition.value === value)

assert(
  packageJson.scripts?.['qa:potential-random-npc-guards'] === 'node scripts/qa-potential-random-npc-guards.mjs',
  'package.json should register qa:potential-random-npc-guards.'
)

for (const key of [
  'PotentialRandomNpcMilestoneKey',
  'PotentialRandomNpcMilestoneProgress',
  'randomNpcMilestone',
  'random_acquaintance',
  'random_small_order',
  'random_long_stay',
  'random_family_tie',
  'random_family_commission',
  'random_relationship_line'
]) {
  assert(potentialTypesSource.includes(key), `potential types must include ${key}.`)
}

assert(npcStoreSource.includes('RANDOM_NPC_POTENTIAL_MILESTONE_META'), 'NPC store must define player-facing random NPC milestone metadata.')
assert(npcStoreSource.includes('getRandomNpcPotentialMilestoneProgress'), 'NPC store must expose random NPC potential milestone progress.')
assert(npcStoreSource.includes('countRandomNpcSmallOrderCompletions'), 'NPC milestone progress must count random NPC small orders.')
assert(npcStoreSource.includes('knownNpcIds'), 'random acquaintance progress must dedupe acquaintances and long-stay residents.')
assert(npcStoreSource.includes('relationshipMilestoneAudit'), 'NPC milestone progress must be able to read relationship milestone audit facts.')

assert(potentialStoreSource.includes("import { useNpcStore } from './useNpcStore'"), 'potential store must read NPC milestone progress.')
assert(potentialStoreSource.includes("condition.kind === 'randomNpcMilestone'"), 'potential store must evaluate random NPC unlock conditions.')
assert(POTENTIAL_NODE_DEFS.every(node => node.firstVersionConnected), 'potential formal release must keep all random-NPC gated nodes open.')
assert(!potentialDataSource.includes('firstVersionConnected: false'), 'potential data must not keep planned-node locks.')
assert(potentialStoreSource.includes('getUnlockConditionDisplay'), 'potential store must format unlock condition progress.')
assert(potentialStoreSource.includes('当前 ${current}/${randomNpcProgress.target}'), 'random NPC unlock reason must show current progress.')

assert(randomConditions('body_vital_root').length === 0, 'base HP node must stay free of random NPC gates.')
assert(hasRandomCondition('body_stamina_channel', 'random_acquaintance', 1), 'stamina node should only need one random acquaintance.')
assert(hasRandomCondition('body_safe_fall', 'random_small_order', 1), 'later body survivability node should lightly use one random visitor order.')
assert(hasRandomCondition('harmony_quest_bias', 'random_small_order', 1), 'first harmony node should be tied to random visitor orders.')
assert(hasRandomCondition('harmony_festival_supply', 'random_long_stay', 1), 'festival harmony node should require one random long-stay NPC.')
assert(hasRandomCondition('harmony_gift_hint', 'random_family_tie', 1), 'gift hint node should use random family ties.')
assert(hasRandomCondition('harmony_society_order', 'random_family_commission', 1), 'society order node should use random family commissions.')
assert(hasRandomCondition('harmony_visitor_chance', 'random_relationship_line', 1), 'visitor chance node should use random relationship lines.')
assert(hasRandomCondition('harmony_visitor_chance', 'random_long_stay_story', 1), 'visitor chance node should use long-stay story progress.')

assert(potentialViewSource.includes("nextStep.action === 'randomNpc'"), 'potential page must show a random NPC action when blocked by a random NPC gate.')
assert(potentialViewSource.includes('goToRandomNpcPanel') && potentialViewSource.includes("navigateToPanel('village')"), 'random NPC action must navigate to village.')
assert(potentialViewSource.includes('Users'), 'random NPC action should use the village/people icon.')
assert(!potentialViewSource.includes('明日之后'), 'potential page must not expose external game terminology.')

if (errors.length > 0) {
  console.error(`qa-potential-random-npc-guards failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('qa-potential-random-npc-guards passed')
