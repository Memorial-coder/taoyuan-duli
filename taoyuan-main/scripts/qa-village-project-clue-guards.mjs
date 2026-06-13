/* global console, process */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const npcWorldSource = read('src/data/npcWorld.ts')
const villageProjectSource = read('src/data/villageProjects.ts')
const villageProjectStoreSource = read('src/stores/useVillageProjectStore.ts')

const supportShedBlock = villageProjectSource.match(/id:\s*'support_shed'[\s\S]*?requiredClueText:/)?.[0] ?? ''
assert(
  /requiredClueId:\s*'a_shi_support_clue'/.test(supportShedBlock),
  'support_shed must require the a_shi_support_clue village-project clue.'
)

const aShiBenefitBlock = npcWorldSource.match(/id:\s*'a_shi_support_clue'[\s\S]*?type:\s*'clue'[\s\S]*?clueText:/)?.[0] ?? ''
assert(
  /npcId:\s*'a_shi'/.test(aShiBenefitBlock),
  'A Shi bestie clue benefit must grant a_shi_support_clue.'
)
assert(
  !/id:\s*'a_shi_clue'[\s\S]*?npcId:\s*'a_shi'[\s\S]*?type:\s*'clue'/.test(npcWorldSource),
  'A Shi should not grant the obsolete a_shi_clue relationship clue for support_shed.'
)

assert(
  /VILLAGE_PROJECT_CLUE_ALIASES[\s\S]*a_shi_support_clue:\s*\[\s*'a_shi_clue'\s*\]/.test(villageProjectStoreSource),
  'Village project clue checks must keep a_shi_clue as a legacy alias for existing saves.'
)
assert(
  /acceptedClueIds\.has\(clue\.clueId\)/.test(villageProjectStoreSource),
  'Village project clue unlocks must check the required clue and its legacy aliases.'
)

if (errors.length > 0) {
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}

console.log('qa-village-project-clue-guards passed')
