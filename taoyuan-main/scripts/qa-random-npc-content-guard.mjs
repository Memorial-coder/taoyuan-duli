import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProjectSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [randomNpcs, npcView, useNpcStore] = await Promise.all([
  readProjectSource('src/data/randomNpcs.ts'),
  readProjectSource('src/views/game/NpcView.vue'),
  readProjectSource('src/stores/useNpcStore.ts')
])

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const assertIncludes = (source, fragment, message) => assert(source.includes(fragment), message)

const getTemplateBlock = id => {
  const start = randomNpcs.indexOf(`    id: '${id}',`)
  if (start < 0) return ''
  const nextTemplate = randomNpcs.indexOf('\n  },\n  {', start)
  const templateArrayEnd = randomNpcs.indexOf('\n  }\n]\n\nexport const RANDOM_NPC_LONG_STAY_STORY_EVENTS', start)
  const end = nextTemplate > start ? nextTemplate : templateArrayEnd
  return end > start ? randomNpcs.slice(start, end) : randomNpcs.slice(start, start + 5000)
}

const templateIds = [...randomNpcs.matchAll(/^  \{\n    id: '([^']+)',/gm)].map(match => match[1])
assert(templateIds.length >= 8, `random NPC template count should be at least 8, got ${templateIds.length}`)

for (const hook of ['寻亲', '避祸', '学艺', '经商', '报恩', '逃婚', '科考', '游历']) {
  assertIncludes(randomNpcs, `plotHook: '${hook}'`, `missing random NPC plot hook: ${hook}`)
}

for (const [id, checks] of Object.entries({
  missing_sister_apothecary: [
    `plotHook: '寻亲'`,
    `kind: 'parent'`,
    `kind: 'sibling'`,
    `kind: 'mentor'`,
    `id: 'sister_clue_tonic'`,
    `kind: 'reunion'`,
    `itemId: 'herb'`
  ],
  runaway_betrothal_tailor: [
    `plotHook: '逃婚'`,
    `kind: 'parent'`,
    `kind: 'sibling'`,
    `kind: 'old_flame'`,
    `kind: 'family_business'`,
    `id: 'brother_hidden_parcel'`,
    `kind: 'night'`,
    `itemId: 'cloth'`
  ],
  wandering_map_painter: [
    `plotHook: '游历'`,
    `kind: 'distant_relative'`,
    `kind: 'caravan'`,
    `kind: 'old_debt'`,
    `id: 'guide_map_case'`,
    `kind: 'festival'`,
    `itemId: 'bamboo'`
  ]
})) {
  const block = getTemplateBlock(id)
  assert(block.length > 0, `missing template block: ${id}`)
  assertIncludes(block, 'villagePurpose:', `${id} should expose village purpose`)
  assertIncludes(block, 'romanceView:', `${id} should expose romance view`)
  assertIncludes(block, 'developmentRoutes:', `${id} should expose development routes`)
  assertIncludes(block, 'dialogueChoices:', `${id} should expose player choices`)
  assertIncludes(block, 'dialogueScenes:', `${id} should expose dialogue scenes`)
  assertIncludes(block, 'familyTies:', `${id} should expose family ties`)
  assertIncludes(block, 'familyCommission:', `${id} should expose family commission`)
  assertIncludes(block, 'smallOrder:', `${id} should expose small order`)
  for (const fragment of checks) {
    assertIncludes(block, fragment, `${id} missing content fragment: ${fragment}`)
  }
}

for (const fragment of [
  'visitor.plotHook',
  'acquaintance.plotHook',
  'resident.plotHook',
  '来村目的',
  '恋爱观',
  '发展路线',
  '对话场景'
]) {
  assertIncludes(npcView, fragment, `NPC page should expose random NPC content entry: ${fragment}`)
}

for (const fragment of [
  'plotHook: template.plotHook',
  'familyTies: sanitizeRandomNpcFamilyTies(template.familyTies)',
  'RANDOM_NPC_TEMPLATES.length'
]) {
  assertIncludes(useNpcStore, fragment, `NPC store should continue reading template content: ${fragment}`)
}

if (errors.length > 0) {
  console.error('[qa-random-npc-content-guard] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-random-npc-content-guard] OK')
