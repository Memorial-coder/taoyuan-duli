import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const readProjectSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')

const [npcView, familyRelationGraph, packageJsonSource] = await Promise.all([
  readProjectSource('src/views/game/NpcView.vue'),
  readProjectSource('src/components/game/FamilyRelationGraph.vue'),
  readProjectSource('package.json')
])

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}
const assertIncludes = (source, fragment, message) => assert(source.includes(fragment), message)
const assertBefore = (source, first, second, message) => {
  const firstIndex = source.indexOf(first)
  const secondIndex = source.indexOf(second)
  assert(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message)
}

assertIncludes(packageJsonSource, '"qa:npc-mobile-interactions": "node scripts/qa-npc-mobile-interactions.mjs"', 'package.json should register qa:npc-mobile-interactions')

assertBefore(npcView, 'data-testid="npc-quick-grid"', '<GuidanceDigestPanel surface-id="npc"', 'fixed NPC quick grid should appear before guidance panels')
assertBefore(npcView, 'data-testid="npc-quick-grid"', '<FamilyRelationGraph', 'fixed NPC quick grid should appear before the relationship graph')
assertIncludes(npcView, 'grid grid-cols-2 md:grid-cols-3', 'quick grid should use two mobile columns and denser desktop columns')
assertIncludes(npcView, ':data-testid="`npc-quick-card-${npc.id}`"', 'quick cards need stable test ids')
assertIncludes(npcView, ':data-testid="`npc-quick-talk-${npc.id}`"', 'quick talk buttons need stable test ids')
assertIncludes(npcView, ':data-testid="`npc-quick-gift-${npc.id}`"', 'quick gift buttons need stable test ids')
assertIncludes(npcView, ':disabled="!canQuickGiftWithNpc(npc.id)"', 'quick gift buttons should disable when gift is unavailable')
assertIncludes(npcView, '@click.stop="handleQuickTalkNpc(npc.id)"', 'quick talk button should stop card click propagation')
assertIncludes(npcView, '@click.stop="handleQuickGiftNpc(npc.id)"', 'quick gift button should stop card click propagation')

assertIncludes(npcView, "type NpcDetailTabId = 'interact' | 'gift' | 'relationship' | 'schedule'", 'NPC detail tab type should expose the intended tab ids')
assertBefore(npcView, "{ id: 'interact', label: '互动'", "{ id: 'gift', label: '送礼'", 'detail tabs should put interaction before gift')
assertBefore(npcView, "{ id: 'gift', label: '送礼'", "{ id: 'relationship', label: '关系'", 'detail tabs should put gift before relationship')
assertBefore(npcView, "{ id: 'relationship', label: '关系'", "{ id: 'schedule', label: '行程'", 'detail tabs should put schedule last')
assertIncludes(npcView, 'data-testid="npc-detail-tabbar"', 'NPC detail modal should expose mobile tabbar')
assertIncludes(npcView, 'md:hidden" data-testid="npc-detail-tabbar"', 'NPC detail tabbar should be mobile-only')
assertIncludes(npcView, ':data-testid="`npc-detail-tab-${tab.id}`"', 'NPC detail tabs need stable test ids')
assertIncludes(npcView, "const npcDetailSectionClass = (tab: NpcDetailTabId): string => (selectedNpcDetailTab.value === tab ? 'block' : 'hidden md:block')", 'non-active detail sections should be hidden only on mobile')
assertBefore(npcView, 'data-testid="npc-detail-section-interact"', 'data-testid="npc-detail-section-gift"', 'interaction section should render before gift section')
assertBefore(npcView, 'data-testid="npc-detail-section-gift"', 'data-testid="npc-detail-section-relationship"', 'gift section should render before relationship section')
assertBefore(npcView, 'data-testid="npc-detail-section-relationship"', 'data-testid="npc-detail-section-schedule"', 'schedule section should render last')

assertIncludes(npcView, "const openNpcPanel = (npcId: string, tab: NpcDetailTabId = 'interact')", 'NPC panel opening helper should accept a target tab')
assertIncludes(npcView, "return canInteractWithNpc(npcId) && !state?.giftedToday && (state?.giftsThisWeek ?? 0) < 2", 'quick gift should respect daily and weekly gift limits')
assertIncludes(npcView, 'if (!canQuickGiftWithNpc(npcId)) return', 'quick gift handler should guard against unavailable gift state')
assertIncludes(npcView, "openNpcPanel(npcId, 'gift')", 'quick gift should open the gift tab without gifting immediately')
assertIncludes(npcView, 'performTalkWithNpc(npcId)', 'quick talk should reuse the shared talk helper')
assertIncludes(npcView, 'const handleTalk = () => {', 'modal talk button should keep its existing handler entrypoint')

assertIncludes(npcView, '@quick-talk-npc="handleQuickTalkNpc"', 'NpcView should listen for graph quick-talk events')
assertIncludes(npcView, '@quick-gift-npc="handleQuickGiftNpc"', 'NpcView should listen for graph quick-gift events')
assertIncludes(familyRelationGraph, "(event: 'quick-talk-npc', npcId: string): void", 'FamilyRelationGraph should declare quick-talk emit')
assertIncludes(familyRelationGraph, "(event: 'quick-gift-npc', npcId: string): void", 'FamilyRelationGraph should declare quick-gift emit')
assertIncludes(familyRelationGraph, ':data-testid="`family-relation-quick-talk-${selectedNode.selectableNpcId}`"', 'relationship graph quick talk needs stable test id')
assertIncludes(familyRelationGraph, ':data-testid="`family-relation-quick-gift-${selectedNode.selectableNpcId}`"', 'relationship graph quick gift needs stable test id')
assertIncludes(familyRelationGraph, "@click=\"$emit('quick-talk-npc', selectedNode.selectableNpcId)\"", 'relationship graph should emit quick-talk from selected node detail')
assertIncludes(familyRelationGraph, "@click=\"$emit('quick-gift-npc', selectedNode.selectableNpcId)\"", 'relationship graph should emit quick-gift from selected node detail')

if (errors.length > 0) {
  console.error('[qa-npc-mobile-interactions] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-npc-mobile-interactions] OK')
