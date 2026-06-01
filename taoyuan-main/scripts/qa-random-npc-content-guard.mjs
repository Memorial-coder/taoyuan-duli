import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProjectSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [randomNpcs, npcTypes, npcView, useNpcStore, familyRelationGraph] = await Promise.all([
  readProjectSource('src/data/randomNpcs.ts'),
  readProjectSource('src/types/npc.ts'),
  readProjectSource('src/views/game/NpcView.vue'),
  readProjectSource('src/stores/useNpcStore.ts'),
  readProjectSource('src/components/game/FamilyRelationGraph.vue')
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

const templateArrayStart = randomNpcs.indexOf('export const RANDOM_NPC_TEMPLATES')
const templateArrayEnd = randomNpcs.indexOf('\n]\n\nexport const RANDOM_NPC_LONG_STAY_STORY_EVENTS', templateArrayStart)
const templateArray = templateArrayStart >= 0 && templateArrayEnd > templateArrayStart
  ? randomNpcs.slice(templateArrayStart, templateArrayEnd)
  : ''
assert(templateArray.length > 0, 'random NPC template array should be parseable')

const templateIds = [...templateArray.matchAll(/^  \{\n    id: '([^']+)',/gm)].map(match => match[1])
assert(templateIds.length >= 8, `random NPC template count should be at least 8, got ${templateIds.length}`)

for (const hook of ['寻亲', '避祸', '学艺', '经商', '报恩', '逃婚', '科考', '游历']) {
  assertIncludes(randomNpcs, `plotHook: '${hook}'`, `missing random NPC plot hook: ${hook}`)
}

for (const kind of ['first_meeting', 'daily', 'gift', 'request', 'misunderstanding', 'festival', 'rain', 'night', 'farewell', 'reunion']) {
  assertIncludes(randomNpcs, `kind: '${kind}'`, `missing random NPC dialogue scene kind: ${kind}`)
}

for (const kind of ['parent', 'sibling', 'mentor', 'distant_relative', 'caravan', 'old_debt', 'family_business', 'sworn_kin', 'old_flame', 'child']) {
  assertIncludes(randomNpcs, `kind: '${kind}'`, `missing random NPC family tie kind: ${kind}`)
}

for (const fragment of [
  'export const RANDOM_NPC_RELATIONSHIP_GROWTH_BEATS',
  "id: 'daily_to_acquaintance'",
  "id: 'acquaintance_to_long_stay'",
  "id: 'daily_to_short_romance'",
  "id: 'long_stay_to_romance'",
  "id: 'daily_to_family'",
  "relationLineKind: 'romance'",
  "relationLineKind: 'family'",
  'requiresMetFamilyTie: true'
]) {
  assertIncludes(randomNpcs, fragment, `missing random NPC natural growth beat fragment: ${fragment}`)
}

for (const id of templateIds) {
  const block = getTemplateBlock(id)
  const dialogueSceneCount = (block.match(/kind: '(first_meeting|daily|gift|request|misunderstanding|festival|rain|night|farewell|reunion)'/g) ?? []).length
  const dialogueChoiceCount = (block.match(/relationshipDirection: '/g) ?? []).length
  const familyTieSection = block.match(/familyTies: \[([\s\S]*?)\n    \],\n    familyCommission:/)?.[1] ?? ''
  const familyTieIds = [...familyTieSection.matchAll(/\{ id: '([^']+)', kind: '([^']+)'/g)].map(match => match[1])
  const commissionTieId = block.match(/familyCommission: \{[\s\S]*?\n      tieId: '([^']+)'/)?.[1]

  assert(dialogueSceneCount >= 3, `${id} should keep at least 3 dialogue scenes, got ${dialogueSceneCount}`)
  assert(dialogueChoiceCount >= 3, `${id} should keep 3 relationship-direction choices, got ${dialogueChoiceCount}`)
  assert(familyTieIds.length >= 3, `${id} should keep at least 3 family ties, got ${familyTieIds.length}`)
  assert(familyTieIds.length <= 4, `${id} should respect the 4 family tie save limit, got ${familyTieIds.length}`)
  assert(!!commissionTieId && familyTieIds.includes(commissionTieId), `${id} family commission should target a local family tie`)
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
  "export type RandomNpcRelationLineKind = 'friend' | 'family' | 'romance' | 'zhiji' | 'sworn' | 'rivalry' | 'severed'",
  "export type RandomNpcRelationshipGrowthBeatKind = 'acquaintance' | 'long_stay' | 'short_romance' | 'romance' | 'family'",
  'export interface RandomNpcRelationshipGrowthBeatDef',
  'export interface RandomNpcRelationshipGrowthPreviewEntry',
  'kind: RandomNpcRelationLineKind',
  'history: RandomNpcRelationLineEvent[]'
]) {
  assertIncludes(npcTypes, fragment, `NPC types should expose bounded random NPC family relation line: ${fragment}`)
}

for (const fragment of [
  'visitor.plotHook',
  'acquaintance.plotHook',
  'resident.plotHook',
  '来村目的',
  '恋爱观',
  '发展路线',
  '对话场景',
  'getRecentRandomNpcDialogueMemories(visitor.dialogueMemories)',
  'getRecentRandomNpcDialogueMemories(acquaintance.dialogueMemories)',
  'getRecentRandomNpcDialogueMemories(resident.dialogueMemories)',
  '见家人与家族评价',
  '核心家族深线',
  '自然成长',
  '日常长出关系线',
  'getRandomNpcVisitorGrowthPreview',
  'getRandomNpcAcquaintanceGrowthPreview',
  'getRandomNpcResidentGrowthPreview',
  'getRecentRandomNpcFamilyReviews(resident)',
  'getRecentRandomNpcFamilySpecialEvents(resident)',
  "family: '家人线'",
  "const randomNpcRelationLineActions: Exclude<RandomNpcRelationLineKind, 'severed'>[] = ['friend', 'family', 'romance', 'zhiji', 'sworn', 'rivalry']",
  '可开启家人线：把见家人、家族委托和核心深线作为本地可回看的长期关系，不写入联机公开关系图。'
]) {
  assertIncludes(npcView, fragment, `NPC page should expose random NPC content entry: ${fragment}`)
}

for (const fragment of [
  'plotHook: template.plotHook',
  'RANDOM_NPC_RELATIONSHIP_GROWTH_BEATS',
  'getRandomNpcRelationshipGrowthPreview',
  'metFamilyTieCount',
  'requiresMetFamilyTie',
  'statusLabel',
  'familyTies: sanitizeRandomNpcFamilyTies(template.familyTies)',
  'RANDOM_NPC_TEMPLATES.length',
  'const RANDOM_NPC_DIALOGUE_MEMORY_LIMIT = 6',
  'const RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT = 8',
  'const RANDOM_NPC_FAMILY_TIE_LIMIT = 4',
  'const RANDOM_NPC_FAMILY_SPECIAL_EVENT_LIMIT = 4',
  "if (kind === 'family') return '家人线'",
  "if (kind === 'family') return { affinity: 75, signal: 'family_impression' as const, signalValue: 8 }",
  "source.kind === 'family' || source.kind === 'romance'",
  "entry.kind === 'family' || entry.kind === 'romance'",
  "if (kind === 'family') return `${name}与你约为家人往来，后续按见家人、家族委托和核心深线记录。`",
  "if (kind === 'family') {",
  "if (familyLine.metTieIds.length <= 0) return { success: false, message: '家人线需要先至少见过一个家族节点。' }",
  'getRandomNpcFamilyLineSpecialEventReward',
  "resident.relationshipLine.kind !== 'family'",
  '家人线加赠',
  'mergeRandomNpcFamilySpecialEventRewardItems',
  'getRandomNpcFamilyLineStageThreeRewardBonus',
  "tie.kind === 'parent'",
  "tie.kind === 'caravan'",
  'hanhai_silk',
  '家人线高阶加赠',
  'getRandomNpcFamilyLineSpecialEventRewardBonus(tie, stage)',
  'const reward = getRandomNpcFamilyLineSpecialEventReward(resident, tie, stage)',
  'inventoryStore.addItemsExact(reward.items)',
  "kind === 'friend' || kind === 'family' || kind === 'zhiji' || kind === 'sworn'",
  'sanitizeRandomNpcDialogueScenes',
  'sanitizeRandomNpcFamilyTies',
  '.slice(0, RANDOM_NPC_FAMILY_TIE_LIMIT)',
  '.slice(-RANDOM_NPC_FAMILY_SPECIAL_EVENT_LIMIT)',
  'sanitizeRandomNpcDialogueMemories(entry.dialogueMemories, RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT)'
]) {
  assertIncludes(useNpcStore, fragment, `NPC store should continue reading template content: ${fragment}`)
}

for (const fragment of [
  'longStaySnapshot',
  "family: '家人线'",
  '见家人进度',
  '核心深线进度',
  '旧档见家人',
  '旧档核心深线',
  '旧档随机 NPC 家族',
  '该节点只保存在单机随机 NPC 存档，不写入联机公开关系图。',
  'formatRandomNpcFamilySpecialProgress'
]) {
  assertIncludes(familyRelationGraph, fragment, `family graph should expose random NPC family recall entry: ${fragment}`)
}

if (errors.length > 0) {
  console.error('[qa-random-npc-content-guard] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-random-npc-content-guard] OK')
