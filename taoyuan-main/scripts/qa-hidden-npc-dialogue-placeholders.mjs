import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const [hiddenNpcModal, heartEventDialog, discoveryScene, dialoguePlaceholders] = await Promise.all([
  readFile(path.join(projectRoot, 'src/components/game/HiddenNpcModal.vue'), 'utf8'),
  readFile(path.join(projectRoot, 'src/components/game/HeartEventDialog.vue'), 'utf8'),
  readFile(path.join(projectRoot, 'src/components/game/DiscoveryScene.vue'), 'utf8'),
  readFile(path.join(projectRoot, 'src/utils/dialoguePlaceholders.ts'), 'utf8')
])

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const assertIncludes = (source, fragment, message) => assert(source.includes(fragment), message)

assertIncludes(
  dialoguePlaceholders,
  'export const formatDialoguePlaceholders = (text: string, context: DialoguePlaceholderContext = {}): string => {',
  'dialogue placeholder formatting should live in a shared utility'
)
assertIncludes(
  dialoguePlaceholders,
  "text.replace(/\\{player\\}/g, playerName).replace(/\\{title\\}/g, honorific)",
  'shared formatter should replace both player name and honorific placeholders'
)

for (const [name, source] of [
  ['HiddenNpcModal', hiddenNpcModal],
  ['HeartEventDialog', heartEventDialog],
  ['DiscoveryScene', discoveryScene]
]) {
  assertIncludes(
    source,
    "import { usePlayerStore } from '@/stores/usePlayerStore'",
    `${name} should read the active player identity for dialogue placeholders`
  )
  assertIncludes(
    source,
    "import { formatDialoguePlaceholders } from '@/utils/dialoguePlaceholders'",
    `${name} should use the shared dialogue placeholder formatter`
  )
  assertIncludes(
    source,
    'const formatDialogueText = (text: string): string => {',
    `${name} should expose a local formatter bound to current player state`
  )
}

assertIncludes(hiddenNpcModal, 'dialogueText.value = rawDialogue ? formatDialogueText(rawDialogue) : null', 'HiddenNpcModal should format selected dialogue before rendering')
assertIncludes(heartEventDialog, '{{ formatDialogueText(currentScene.text) }}', 'HeartEventDialog should format current scene text before rendering')
assertIncludes(heartEventDialog, 'choiceResponse.value = formatDialogueText(choice.response)', 'HeartEventDialog should format choice responses before rendering')
assertIncludes(discoveryScene, '{{ formatDialogueText(currentScene.text) }}', 'DiscoveryScene should format current scene text before rendering')
assertIncludes(discoveryScene, 'choiceResponse.value = formatDialogueText(choice.response)', 'DiscoveryScene should format choice responses before rendering')

if (errors.length > 0) {
  console.error('[qa-hidden-npc-dialogue-placeholders] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-hidden-npc-dialogue-placeholders] OK')
