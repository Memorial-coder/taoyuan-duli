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

assertIncludes(npcView, 'const villageProjectCards = computed(() =>', 'village project embed should normalize project card UI state once')
assertIncludes(npcView, 'const villageProjectPanelStats = computed(() => ({', 'village project embed should expose compact top-level stats')
assertIncludes(npcView, 'v-for="project in villageProjectCards"', 'village project embed should render normalized cards')
assertIncludes(npcView, 'xl:grid-cols-2', 'village project embed should use a two-column layout on wide screens')
assertIncludes(npcView, 'villageProjectPanelStats.overdueMaintenance', 'village project embed should surface maintenance exceptions in the summary row')
assertIncludes(npcView, '!project.completed && project.requirementProgresses.length > 0', 'completed village projects should not keep expanded requirement rows')
assertIncludes(npcView, 'v-if="!project.completed" class="border border-accent/10 rounded-xs p-2 mt-2"', 'completed village projects should not keep expanded material cost rows')
assertIncludes(npcView, 'project.maintenanceSummary', 'completed village projects should keep maintenance state available')

assertIncludes(familyRelationGraph, "(event: 'quick-talk-npc', npcId: string): void", 'FamilyRelationGraph should declare quick-talk emit')
assertIncludes(familyRelationGraph, "(event: 'quick-gift-npc', npcId: string): void", 'FamilyRelationGraph should declare quick-gift emit')
assertIncludes(familyRelationGraph, ':data-testid="`family-relation-quick-talk-${selectedNode.selectableNpcId}`"', 'relationship graph quick talk needs stable test id')
assertIncludes(familyRelationGraph, ':data-testid="`family-relation-quick-gift-${selectedNode.selectableNpcId}`"', 'relationship graph quick gift needs stable test id')
assertIncludes(familyRelationGraph, "@click=\"$emit('quick-talk-npc', selectedNode.selectableNpcId)\"", 'relationship graph should emit quick-talk from selected node detail')
assertIncludes(familyRelationGraph, "@click=\"$emit('quick-gift-npc', selectedNode.selectableNpcId)\"", 'relationship graph should emit quick-gift from selected node detail')
assertIncludes(familyRelationGraph, 'const randomNpcBoardSnapshot = computed(() =>', 'relationship graph should defer random NPC board generation behind a computed snapshot')
assertIncludes(familyRelationGraph, 'shouldBuildVisitors.value ? npcStore.getRandomNpcBoard() : npcStore.randomNpcBoard', 'relationship graph should not generate weekly random visitors for the default core view')
assertIncludes(familyRelationGraph, 'if (shouldBuildVisitors.value) {', 'relationship graph should only build visitor/acquaintance nodes after the visitor filter is opened')
assertIncludes(familyRelationGraph, 'if (shouldBuildVillagers.value) {', 'relationship graph should only build the fixed NPC outer ring when the village filter is opened')
assertIncludes(familyRelationGraph, 'layoutConstellation(villagerEntries', 'relationship graph should avoid rendering fixed NPCs as a rigid outer ring')
assertIncludes(familyRelationGraph, 'if (shouldBuildArchives.value) {', 'relationship graph should only build archive nodes when archive/all filters are opened')
assertIncludes(familyRelationGraph, 'if (shouldBuildFamilyBranches.value) {', 'relationship graph should keep family branch nodes out of the default render path')
assertIncludes(familyRelationGraph, 'class="family-graph-map-path"', 'relationship graph should use a lightweight map path instead of dense decorative SVG layers')
assertIncludes(familyRelationGraph, "selectedNodeId.value !== 'player' &&", 'relationship graph should not draw neighbor halos around every node while the center node is selected')
assertIncludes(familyRelationGraph, 'v-if="shouldShowNodeGlyph(node)"', 'relationship graph should hide repeated glyphs in dense outer-ring modes')
assertIncludes(familyRelationGraph, 'const shouldShowNodeGlyph = (node: RelationNode) =>', 'relationship graph should centralize dense glyph visibility rules')
assert(!familyRelationGraph.includes('<pattern id="family-relation-map-grid"'), 'relationship graph should not render the old dense SVG grid pattern')
assert(!familyRelationGraph.includes('family-graph-terrain'), 'relationship graph should not render the old multi-ellipse terrain rings')
assert(!familyRelationGraph.includes("' stroke-bg'"), 'relationship graph selected nodes should not use a dark background stroke ring')
assertIncludes(familyRelationGraph, "const selectedRing = active ? ' stroke-highlight' : ''", 'relationship graph selected nodes should use a light highlight ring')

if (errors.length > 0) {
  console.error('[qa-npc-mobile-interactions] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[qa-npc-mobile-interactions] OK')
