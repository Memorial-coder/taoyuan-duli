/* global console */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const read = relativePath => readFileSync(path.join(projectRoot, relativePath), 'utf8')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const collectTopLevelObjects = (source, arrayName) => {
  const arrayStart = source.indexOf(`const ${arrayName}`)
  assert(arrayStart >= 0, `${arrayName} must exist.`)
  const assignmentStart = source.indexOf('=', arrayStart)
  assert(assignmentStart >= 0, `${arrayName} must have an assignment.`)
  const bracketStart = source.indexOf('[', assignmentStart)
  assert(bracketStart >= 0, `${arrayName} must be an array.`)
  const blocks = []
  let depth = 0
  let objectStart = -1
  for (let index = bracketStart + 1; index < source.length; index++) {
    const char = source[index]
    if (char === '{') {
      if (depth === 0) objectStart = index
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0 && objectStart >= 0) {
        blocks.push(source.slice(objectStart, index + 1))
        objectStart = -1
      }
    } else if (char === ']' && depth === 0) {
      break
    }
  }
  return blocks
}

const extractStringField = (source, field) => source.match(new RegExp(`${field}:\\s*'([^']+)'`))?.[1] ?? ''
const extractNumberField = (source, field) => {
  const value = source.match(new RegExp(`${field}:\\s*(\\d+)`))?.[1]
  return value ? Number(value) : null
}

const storeSource = read('src/stores/useSecretNoteStore.ts')
const noteSource = read('src/data/secretNotes.ts')
const npcWorldSource = read('src/data/npcWorld.ts')
const timeSource = read('src/data/timeConstants.ts')
const npcStoreSource = read('src/stores/useNpcStore.ts')
const achievementViewSource = read('src/views/game/AchievementView.vue')

const secretNoteBlocks = collectTopLevelObjects(noteSource, 'SECRET_NOTES')
const secretNotes = secretNoteBlocks.map(block => ({
  id: extractNumberField(block, 'id'),
  type: extractStringField(block, 'type'),
  category: extractStringField(block, 'category'),
  title: extractStringField(block, 'title'),
  hasVerification: /verification:\s*{/.test(block),
  usable: /usable:\s*true/.test(block)
}))
const secretNoteGiftLinkBlocks = collectTopLevelObjects(npcWorldSource, 'SECRET_NOTE_GIFT_CLUE_LINKS')
const secretNoteGiftLinks = secretNoteGiftLinkBlocks.map(block => ({
  noteId: extractNumberField(block, 'noteId'),
  npcId: extractStringField(block, 'npcId'),
  clueId: extractStringField(block, 'clueId')
}))
const giftClueTemplateBlocks = collectTopLevelObjects(npcWorldSource, 'NPC_GIFT_CLUE_TEMPLATES')

assert(
  /TAB_TO_LOCATION_GROUP/.test(storeSource),
  'Secret note verification must use the shared navigation panel -> location-group map.'
)
assert(
  /getRequiredPanelLocationGroup/.test(storeSource),
  'Secret note verification must normalize requiredPanel before checking currentLocationGroup.'
)
assert(
  !/currentLocationGroup\s*!==\s*verification\.requiredPanel/.test(storeSource),
  'Secret note verification must not compare currentLocationGroup directly with requiredPanel.'
)

const requiredPanels = [...noteSource.matchAll(/requiredPanel:\s*'([^']+)'/g)].map(match => match[1])
assert(requiredPanels.length > 0, 'Secret note data must contain requiredPanel verification cases.')

const mappedPanels = new Set(
  [...timeSource.matchAll(/^\s*'?([a-zA-Z0-9_-]+)'?:\s*'(farm|village_area|nature|mine|hanhai|frontier)'/gm)]
    .map(match => match[1])
)

for (const panel of new Set(requiredPanels)) {
  assert(mappedPanels.has(panel), `requiredPanel "${panel}" must exist in TAB_TO_LOCATION_GROUP.`)
}

for (const panel of ['forage', 'fishing', 'mining', 'village']) {
  assert(requiredPanels.includes(panel), `Secret note QA should keep coverage for "${panel}" verification.`)
}

assert(
  /resolveCollectedLead/.test(storeSource),
  'Secret note store must expose an external resolver for gameplay-verified leads.'
)
assert(
  /type SecretNoteVerificationStatus = 'untracked' \| 'tracked' \| 'ready' \| 'resolved' \| 'recorded'/.test(storeSource),
  'Secret note status must distinguish read-only recorded notes from pending verification.'
)
assert(
  /hasExternalGiftResolution/.test(storeSource) && /: 'recorded'/.test(storeSource),
  'Read-only collected notes must show recorded instead of tracked.'
)
assert(
  /recorded:\s*'已记录'/.test(achievementViewSource),
  'Achievement note status labels must render recorded notes as 已记录.'
)
assert(
  /SECRET_NOTE_GIFT_CLUE_LINKS/.test(achievementViewSource) && /externalGiftSecretNoteIds/.test(achievementViewSource),
  'Achievement secret-note progress must count externally verified gift notes.'
)
assert(
  /syncResolvedGiftLeads/.test(storeSource) && /syncResolvedGiftLeads\(\)/.test(storeSource),
  'Secret note store must backfill resolved gift leads after save deserialization.'
)
assert(
  /const tryCollectNote[\s\S]*syncResolvedGiftLeads\(\)[\s\S]*发现了秘密笔记/.test(storeSource),
  'Secret note collection must immediately backfill gift leads that were verified earlier in the same session.'
)
assert(
  /const SECRET_NOTE_GIFT_CLUE_LINKS = \[/.test(npcWorldSource),
  'Secret note gift clue links must live in shared data.'
)

const giftNotes = secretNotes.filter(note => note.type === 'npc' || note.category === 'gift')
assert(giftNotes.length > 0, 'Secret note QA should find gift notes.')
for (const note of giftNotes) {
  assert(
    secretNoteGiftLinks.some(link => link.noteId === note.id),
    `Gift secret note #${note.id} (${note.title}) must be linked to a relationship gift clue.`
  )
}
for (const link of secretNoteGiftLinks) {
  const matchingTemplate = giftClueTemplateBlocks.find(block =>
    new RegExp(`npcId:\\s*'${link.npcId}'`).test(block) &&
    new RegExp(`clueId:\\s*'${link.clueId}'`).test(block)
  )
  assert(matchingTemplate, `Secret note gift link ${link.clueId} must have a matching gift clue template.`)
  assert(/itemId:\s*'[^']+'/.test(matchingTemplate) && /preference:\s*'(loved|liked|hated)'/.test(matchingTemplate), `Gift clue template ${link.clueId} must define itemId and preference.`)
}

assert(
  /noteId:\s*7,\s*npcId:\s*'sun_tiejiang',\s*clueId:\s*'sun_tiejiang_note_copper'/.test(npcWorldSource),
  'Secret note #7 must stay linked to Sun Tiejiang copper ore gift clue.'
)
assert(
  /resolveSecretNoteGiftLead/.test(npcStoreSource),
  'NPC gift flow must resolve collected secret-note gift leads after matching gifts.'
)
assert(
  /candidate\.itemId === itemId/.test(npcStoreSource) && /candidate\.preference === preference/.test(npcStoreSource),
  'Secret-note gift resolution must match both item id and verified preference.'
)
assert(
  /secretNoteStore\.resolveCollectedLead\(entry\.noteId/.test(npcStoreSource),
  'Secret-note gift resolution must mark the collected note as resolved.'
)
assert(
  /resolveSecretNoteGiftLead\(npcId,\s*itemId,\s*verifiedGiftPreference\)/.test(npcStoreSource),
  'giveGift must invoke secret-note gift resolution with the verified gift preference.'
)

console.log('qa-secret-note-verification-guards: ok')
