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

const supportShedBlock = villageProjectSource.match(/id:\s*'support_shed'[\s\S]*?fundingPhase:/)?.[0] ?? ''
assert(
  /requiredClueId:\s*'a_shi_support_clue'/.test(supportShedBlock),
  'support_shed must require the a_shi_support_clue village-project clue.'
)
assert(
  /requiredClueText:\s*'[^']*挚友[^']*矿料支架委托[^']*'/.test(supportShedBlock),
  'support_shed locked hint must explain A Shi bestie and mine-support commission sources.'
)

const greenhouseBlock = villageProjectSource.match(/id:\s*'festival_greenhouse'[\s\S]*?fundingPhase:/)?.[0] ?? ''
assert(
  /requiredClueId:\s*'liu_niang_greenhouse_clue'/.test(greenhouseBlock),
  'festival_greenhouse must require the liu_niang_greenhouse_clue village-project clue.'
)
assert(
  /requiredClueText:\s*'[^']*好友[^']*夏秋公告板[^']*桂花[^']*'/.test(greenhouseBlock),
  'festival_greenhouse locked hint must explain Liu Niang friendship and summer/autumn flower commission sources.'
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
  /VILLAGE_PROJECT_CLUE_ALIASES[\s\S]*liu_niang_greenhouse_clue:\s*\[\s*'liu_niang_clue'\s*\]/.test(villageProjectStoreSource),
  'Village project clue checks must accept liu_niang_clue as a greenhouse alias for friendship-unlocked old greenhouse clues.'
)
assert(
  /acceptedClueIds\.has\(clue\.clueId\)/.test(villageProjectStoreSource),
  'Village project clue unlocks must check the required clue and its legacy aliases.'
)

const relationshipOnlyHintExpectations = [
  ['caravan_station', '红豆', '好友'],
  ['village_school', '素素', '挚友'],
  ['hot_spring', '林老', '挚友'],
  ['village_school_ii', '雪芹', '挚友'],
  ['caravan_station_ii', '云飞', '挚友']
]

for (const [projectId, npcName, stageLabel] of relationshipOnlyHintExpectations) {
  const block = villageProjectSource.match(new RegExp(`id:\\s*'${projectId}'[\\s\\S]*?fundingPhase:`))?.[0] ?? ''
  assert(
    new RegExp(`requiredClueText:\\s*'[^']*${npcName}[^']*${stageLabel}[^']*'`).test(block),
    `${projectId} locked hint must name the ${npcName} ${stageLabel} relationship gate.`
  )
}

if (errors.length > 0) {
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}

console.log('qa-village-project-clue-guards passed')
