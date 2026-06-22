<template>
  <section class="family-graph-shell border border-accent/20 rounded-xs p-2 mb-3 bg-bg/10" data-testid="family-relation-graph">
    <div class="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <MapIcon :size="14" class="text-accent" />
          <p class="text-xs text-accent">家族关系图谱</p>
        </div>
        <p class="text-[0.625rem] text-muted mt-0.5 leading-4">单机关系网回看：家庭、宠物、长住来客和村中固定关系都保留在本地存档。</p>
      </div>
      <div class="flex flex-wrap items-center gap-1 text-[0.625rem] text-muted">
        <span class="border border-accent/10 rounded-xs px-1.5 py-0.5">显示 {{ visibleGraphNodes.length }}/{{ totalRelationNodeCount }}</span>
        <span class="border border-accent/10 rounded-xs px-1.5 py-0.5">关系 {{ visibleGraphLinks.length }}</span>
      </div>
    </div>

    <div class="mt-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex flex-wrap gap-1" role="group" aria-label="关系图谱筛选">
        <button
          v-for="filter in relationFilters"
          :key="filter.id"
          type="button"
          class="family-graph-control inline-flex items-center gap-1 rounded-xs border px-2 py-1 text-[0.625rem]"
          :class="relationFilterClass(filter.id)"
          :aria-pressed="activeFilter === filter.id"
          :data-testid="`family-relation-filter-${filter.id}`"
          @click="setRelationFilter(filter.id)"
        >
          <component :is="filter.icon" :size="11" />
          <span>{{ filter.label }}</span>
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-1 text-[0.625rem] text-muted">
        <label class="family-graph-toggle">
          <input v-model="showWeakRelations" type="checkbox" class="sr-only">
          <span :class="showWeakRelations ? 'border-accent/60 bg-accent/15 text-accent' : 'border-accent/10 bg-bg/20'">弱关系</span>
        </label>
        <label class="family-graph-toggle">
          <input v-model="showFamilyBranches" type="checkbox" class="sr-only">
          <span :class="showFamilyBranches ? 'border-success/60 bg-success/10 text-success' : 'border-accent/10 bg-bg/20'">家族旁支</span>
        </label>
        <label class="family-graph-toggle">
          <input v-model="showArchivedRelations" type="checkbox" class="sr-only">
          <span :class="showArchivedRelations ? 'border-muted/70 bg-muted/10 text-muted' : 'border-accent/10 bg-bg/20'">旧档</span>
        </label>
        <button
          type="button"
          class="family-graph-control inline-flex items-center gap-1 rounded-xs border border-accent/10 bg-bg/20 px-2 py-1 hover:border-accent/40 hover:text-accent"
          :class="focusMode ? 'border-water/50 bg-water/10 text-water' : ''"
          :aria-pressed="focusMode"
          data-testid="family-relation-focus-toggle"
          @click="focusMode = !focusMode"
        >
          <Focus :size="11" />
          <span>焦点</span>
        </button>
        <button
          type="button"
          class="family-graph-control inline-flex items-center gap-1 rounded-xs border border-accent/10 bg-bg/20 px-2 py-1 hover:border-accent/40 hover:text-accent"
          data-testid="family-relation-reset"
          @click="resetGraphView"
        >
          <RotateCcw :size="11" />
          <span>重置</span>
        </button>
      </div>
    </div>

    <div class="mt-2 grid grid-cols-1 lg:grid-cols-[minmax(0,1.42fr)_minmax(260px,0.58fr)] gap-2">
      <div class="family-graph-map relative border border-accent/15 rounded-xs p-2 overflow-x-auto">
        <svg class="w-full min-w-[320px] sm:min-w-[640px] h-[360px] sm:h-[440px]" viewBox="0 0 100 78" role="img" aria-label="家族关系图" data-testid="family-relation-graph-svg">
          <rect x="1" y="1" width="98" height="76" rx="1.2" class="family-graph-map-wash" />
          <path d="M 8 39 C 22 27, 34 20, 50 20 C 66 20, 80 28, 92 39 C 79 51, 65 58, 50 58 C 35 58, 21 51, 8 39 Z" class="family-graph-map-path" />
          <path d="M 18 39 C 27 32, 39 28, 50 28 C 61 28, 73 32, 82 39 C 73 46, 61 50, 50 50 C 39 50, 27 46, 18 39 Z" class="family-graph-map-path family-graph-map-path-soft" />

          <line
            v-for="link in visibleGraphLinks"
            :key="`${link.from}-${link.to}-${link.label}`"
            :x1="nodeById.get(link.from)?.x ?? 50"
            :y1="nodeById.get(link.from)?.y ?? 39"
            :x2="nodeById.get(link.to)?.x ?? 50"
            :y2="nodeById.get(link.to)?.y ?? 39"
            :class="[link.className, linkVisualClass(link)]"
            :stroke-width="isSelectedLink(link) ? 0.72 : 0.34"
            stroke-linecap="round"
          />
          <text
            v-for="link in visibleGraphLinkLabels"
            :key="`label-${link.from}-${link.to}-${link.label}`"
            :x="((nodeById.get(link.from)?.x ?? 50) + (nodeById.get(link.to)?.x ?? 50)) / 2"
            :y="((nodeById.get(link.from)?.y ?? 39) + (nodeById.get(link.to)?.y ?? 39)) / 2 - 1.1"
            text-anchor="middle"
            class="fill-muted text-[0.145rem] pointer-events-none"
          >
            {{ link.label }}
          </text>
          <g
            v-for="node in visibleGraphNodes"
            :key="node.id"
            class="family-graph-node cursor-pointer outline-none"
            :class="nodeVisualClass(node)"
            tabindex="0"
            role="button"
            :aria-label="`${node.name}，${node.relationLabel}`"
            :data-testid="`family-relation-node-${node.id}`"
            @click="selectNode(node.id)"
            @keydown.enter.prevent="selectNode(node.id)"
            @keydown.space.prevent="selectNode(node.id)"
          >
            <circle
              v-if="isSelectedNode(node)"
              :cx="node.x"
              :cy="node.y"
              :r="nodeRadius(node) + 1.6"
              class="family-graph-selected-halo"
              stroke-width="0.24"
            />
            <circle
              v-else-if="isLinkedToSelected(node)"
              :cx="node.x"
              :cy="node.y"
              :r="nodeRadius(node) + 0.9"
              class="family-graph-linked-halo"
              stroke-width="0.2"
            />
            <circle
              :cx="node.x"
              :cy="node.y"
              :r="nodeRadius(node)"
              :class="node.circleClass"
              :stroke-width="isSelectedNode(node) ? 0.55 : 0.36"
            />
            <text
              v-if="shouldShowNodeGlyph(node)"
              :x="node.x"
              :y="node.y + 0.55"
              text-anchor="middle"
              dominant-baseline="middle"
              class="fill-bg text-[0.18rem] font-bold pointer-events-none"
            >
              {{ node.shortLabel }}
            </text>
            <text
              v-if="shouldShowNodeName(node)"
              :x="node.x"
              :y="node.y + nodeLabelOffset(node)"
              text-anchor="middle"
              class="fill-current text-[0.16rem] pointer-events-none"
              :class="node.textClass"
            >
              {{ node.name }}
            </text>
          </g>
        </svg>
        <div v-if="visibleGraphNodes.length <= 1" class="absolute inset-x-4 bottom-4 border border-accent/10 bg-panel/70 px-3 py-2 text-[0.625rem] text-muted">
          当前筛选下没有更多关系节点。
        </div>
      </div>

      <div class="family-graph-detail border border-accent/15 rounded-xs p-2 bg-bg/20 min-h-[260px]" data-testid="family-relation-detail">
        <template v-if="selectedNode">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-[0.625rem] text-muted">{{ selectedNode.groupLabel }}</p>
              <p class="text-sm text-accent truncate mt-0.5">{{ selectedNode.name }}</p>
              <p class="text-[0.625rem] text-muted mt-0.5">{{ selectedNode.relationLabel }}</p>
            </div>
            <span class="shrink-0 rounded-xs border border-accent/15 px-1.5 py-0.5 text-[0.625rem]" :class="selectedNode.textClass">
              {{ selectedNode.shortLabel }}
            </span>
          </div>

          <div v-if="selectedNode.selectableNpcId" class="mt-2 flex flex-wrap gap-1">
            <Button
              class="justify-center !px-2 !py-1"
              @click="$emit('selectNpc', selectedNode.selectableNpcId)"
            >
              查看人物
            </Button>
            <Button
              class="justify-center !px-2 !py-1"
              :icon="MessageCircle"
              :icon-size="10"
              :data-testid="`family-relation-quick-talk-${selectedNode.selectableNpcId}`"
              @click="$emit('quick-talk-npc', selectedNode.selectableNpcId)"
            >
              聊天
            </Button>
            <Button
              class="justify-center !px-2 !py-1"
              :icon="Gift"
              :icon-size="10"
              :data-testid="`family-relation-quick-gift-${selectedNode.selectableNpcId}`"
              @click="$emit('quick-gift-npc', selectedNode.selectableNpcId)"
            >
              送礼
            </Button>
          </div>

          <div class="grid grid-cols-2 gap-1 mt-2 text-[0.625rem]">
            <div class="family-graph-stat">
              <span class="text-muted/60">关系值</span>
              <p class="text-accent mt-0.5 leading-4">{{ selectedNode.metricLabel }}</p>
            </div>
            <div class="family-graph-stat">
              <span class="text-muted/60">状态</span>
              <p class="text-muted mt-0.5 leading-4">{{ selectedNode.statusLabel }}</p>
            </div>
          </div>

          <div v-if="selectedPrimaryLines.length > 0" class="mt-2 border border-accent/10 rounded-xs bg-bg/20 p-2">
            <p class="text-[0.625rem] text-accent">关系记录</p>
            <div class="mt-1 space-y-1">
              <p
                v-for="line in selectedPrimaryLines"
                :key="`${selectedNode.id}-primary-${line}`"
                class="text-[0.625rem] text-muted leading-4"
              >
                {{ line }}
              </p>
            </div>
          </div>

          <div v-if="selectedNode.offeringItemIds?.length" class="mt-2 border border-accent/10 rounded-xs bg-bg/20 p-2">
            <p class="text-[0.625rem] text-accent">偏好供奉</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="itemId in selectedNode.offeringItemIds"
                :key="`${selectedNode.id}-offering-${itemId}`"
                class="inline-flex min-w-0 items-center gap-1 border border-accent/10 bg-bg/30 px-1.5 py-0.5 text-[0.625rem] text-muted"
              >
                <ItemIcon :item="getItemById(itemId)" size="xs" :show-badge="false" />
                <span class="truncate">{{ getRelationItemLabel(itemId) }}</span>
              </span>
            </div>
          </div>

          <div v-if="selectedMoreLines.length > 0" class="mt-2 space-y-1">
            <p
              v-for="line in selectedMoreLines"
              :key="`${selectedNode.id}-more-${line}`"
              class="text-[0.625rem] text-muted/80 leading-4"
            >
              {{ line }}
            </p>
          </div>

          <div v-if="selectedNode.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="tag in selectedNode.tags"
              :key="`${selectedNode.id}-${tag}`"
              class="text-[0.625rem] border border-accent/15 text-accent rounded-xs px-1 py-0.5"
            >
              {{ tag }}
            </span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Archive as ArchiveIcon, Eye, Focus, Gift, Map as MapIcon, MessageCircle, RotateCcw, SlidersHorizontal, Users } from 'lucide-vue-next'
  import Button from '@/components/game/Button.vue'
  import ItemIcon from '@/components/game/ItemIcon.vue'
  import { NPCS, getHeartEventById, getItemById } from '@/data'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import type { ChildTrainingFocus, RandomNpcArchiveSummary, RandomNpcFamilyLineState, RandomNpcFamilySpecialEventEntry, RandomNpcFamilyTieDef, RandomNpcFamilyTieKind, RandomNpcLongStayEntry, RandomNpcRelationshipTag } from '@/types'

  defineEmits<{
    (event: 'selectNpc', npcId: string): void
    (event: 'quick-talk-npc', npcId: string): void
    (event: 'quick-gift-npc', npcId: string): void
  }>()

  type RelationNodeGroup = 'self' | 'family' | 'pet' | 'visitor' | 'acquaintance' | 'resident' | 'archive' | 'villager' | 'spirit' | 'kin'
  type RelationFilterId = 'core' | 'visitors' | 'villagers' | 'archives' | 'all'

  interface RelationNode {
    id: string
    name: string
    shortLabel: string
    group: RelationNodeGroup
    groupLabel: string
    relationLabel: string
    metricLabel: string
    statusLabel: string
    detailLines: string[]
    offeringItemIds?: string[]
    tags: string[]
    x: number
    y: number
    circleClass: string
    textClass: string
    anchorNodeId?: string
    selectableNpcId?: string
  }

  interface RelationLink {
    from: string
    to: string
    label: string
    className: string
  }

  const npcStore = useNpcStore()
  const animalStore = useAnimalStore()
  const hiddenNpcStore = useHiddenNpcStore()
  const playerStore = usePlayerStore()
  const selectedNodeId = ref('player')
  const activeFilter = ref<RelationFilterId>('core')
  const focusMode = ref(false)
  const showWeakRelations = ref(false)
  const showFamilyBranches = ref(false)
  const showArchivedRelations = ref(false)

  const relationFilters = [
    { id: 'core', label: '核心', icon: Eye },
    { id: 'visitors', label: '来客', icon: Users },
    { id: 'villagers', label: '村中', icon: SlidersHorizontal },
    { id: 'archives', label: '旧档', icon: ArchiveIcon },
    { id: 'all', label: '全图', icon: MapIcon }
  ] as const

  const tagLabels: Record<RandomNpcRelationshipTag, string> = {
    passing: '萍水相逢',
    acquaintance: '熟人',
    friend: '朋友',
    ambiguous: '暧昧',
    old_contact: '旧识',
    rival: '竞争者'
  }

  const randomNpcRelationLineLabels = {
    friend: '只做朋友',
    family: '家人线',
    romance: '恋爱线',
    zhiji: '知己',
    sworn: '结拜',
    rivalry: '宿怨',
    severed: '已断缘'
  } as const

  const routeLabels = {
    friendship: '邻里常驻',
    business: '商学暂住',
    caregiving: '照料驻村',
    craft: '手艺驻村'
  } as const

  const petTypeLabels = {
    cat: '猫',
    dog: '狗',
    spirit: '灵宠'
  } as const

  const familyTieLabels: Record<RandomNpcFamilyTieKind, string> = {
    parent: '父母',
    sibling: '兄弟姐妹',
    distant_relative: '远亲',
    mentor: '师门',
    caravan: '商队',
    old_debt: '旧债',
    family_business: '家业',
    sworn_kin: '义亲',
    old_flame: '前缘',
    child: '孩子'
  }

  const familyTieAttitudeLabels = {
    supportive: '支持',
    testing: '考验',
    distant: '疏远',
    burdened: '牵挂'
  } as const

  const childStageLabels = {
    baby: '婴儿',
    toddler: '幼儿',
    child: '孩童',
    teen: '少年'
  } as const

  const childTrainingFocusLabels: Record<ChildTrainingFocus, string> = {
    farm: '农事',
    craft: '手作',
    social: '人情',
    spirit: '灵性'
  }

  const relationLinkClass = (kind: string) => {
    if (kind === 'spouse') return 'stroke-danger/80'
    if (kind === 'zhiji') return 'stroke-accent/80'
    if (kind === 'rival') return 'stroke-danger/60'
    if (kind === 'ambiguous') return 'stroke-warning/80'
    if (kind === 'family') return 'stroke-success/80'
    if (kind === 'acquaintance') return 'stroke-success/60'
    if (kind === 'visitor') return 'stroke-accent/50'
    if (kind === 'resident') return 'stroke-warning/70'
    if (kind === 'archive') return 'stroke-muted/45'
    if (kind === 'spirit') return 'stroke-water/70'
    if (kind === 'kin') return 'stroke-success/70'
    return 'stroke-muted/35'
  }

  const nodeClassByGroup = (group: RelationNodeGroup, active = false) => {
    const selectedRing = active ? ' stroke-highlight' : ''
    if (group === 'self') return `fill-accent stroke-accent${selectedRing}`
    if (group === 'family') return `fill-danger stroke-danger${selectedRing}`
    if (group === 'pet') return `fill-success stroke-success${selectedRing}`
    if (group === 'resident') return `fill-warning stroke-warning${selectedRing}`
    if (group === 'acquaintance') return `fill-success stroke-success${selectedRing}`
    if (group === 'visitor') return `fill-accent stroke-accent${selectedRing}`
    if (group === 'archive') return `fill-muted stroke-muted${selectedRing}`
    if (group === 'spirit') return `fill-water stroke-water${selectedRing}`
    if (group === 'kin') return `fill-success stroke-success${selectedRing}`
    return `fill-muted stroke-muted${selectedRing}`
  }

  const textClassByGroup = (group: RelationNodeGroup) => {
    if (group === 'self') return 'text-accent'
    if (group === 'family') return 'text-danger'
    if (group === 'pet') return 'text-success'
    if (group === 'resident') return 'text-warning'
    if (group === 'acquaintance') return 'text-success'
    if (group === 'visitor') return 'text-accent'
    if (group === 'archive') return 'text-muted'
    if (group === 'spirit') return 'text-water'
    if (group === 'kin') return 'text-success'
    return 'text-muted'
  }

  const isWeakGroup = (group: RelationNodeGroup) =>
    group === 'visitor' || group === 'acquaintance' || group === 'villager'

  const isArchiveKinNode = (node: RelationNode) => node.group === 'kin' && node.anchorNodeId?.startsWith('archive:')

  const shouldBuildVisitors = computed(() =>
    activeFilter.value === 'visitors' ||
    activeFilter.value === 'all' ||
    showWeakRelations.value
  )

  const shouldBuildVillagers = computed(() =>
    activeFilter.value === 'villagers' ||
    activeFilter.value === 'all' ||
    showWeakRelations.value
  )

  const shouldBuildFamilyBranches = computed(() =>
    activeFilter.value === 'all' ||
    showFamilyBranches.value
  )

  const shouldBuildArchives = computed(() =>
    activeFilter.value === 'archives' ||
    activeFilter.value === 'all' ||
    showArchivedRelations.value
  )

  const randomNpcBoardSnapshot = computed(() =>
    shouldBuildVisitors.value ? npcStore.getRandomNpcBoard() : npcStore.randomNpcBoard
  )

  const totalRelationNodeCount = computed(() => {
    const board = randomNpcBoardSnapshot.value
    const closeNpcIds = new Set<string>()
    const spouse = npcStore.getSpouse()
    const zhiji = npcStore.getZhiji()
    if (spouse) closeNpcIds.add(spouse.npcId)
    if (zhiji) closeNpcIds.add(zhiji.npcId)
    npcStore.npcStates
      .filter(state => state.dating)
      .forEach(state => closeNpcIds.add(state.npcId))

    const activeVisitorIds = new Set(board.activeVisitors.map(entry => entry.id))
    const acquaintanceIds = new Set(board.acquaintances.map(entry => entry.visitorId))
    const longStaySourceIds = new Set(board.longStayResidents.map(entry => entry.sourceVisitorId))
    const visibleActiveVisitorCount = board.activeVisitors.filter(entry => !longStaySourceIds.has(entry.id) && !acquaintanceIds.has(entry.id)).length
    const visibleAcquaintanceCount = board.acquaintances.filter(entry => !longStaySourceIds.has(entry.visitorId)).length
    const archiveCount = board.recentSummaries.filter(entry =>
      !activeVisitorIds.has(entry.visitorId) &&
      !acquaintanceIds.has(entry.visitorId) &&
      !longStaySourceIds.has(entry.visitorId)
    ).length
    const residentKinCount = board.longStayResidents.reduce((sum, entry) => sum + entry.familyTies.length, 0)
    const archiveKinCount = board.recentSummaries.reduce((sum, entry) => sum + (entry.longStaySnapshot?.familyTies.length ?? 0), 0)

    return 1 +
      closeNpcIds.size +
      npcStore.children.length +
      animalStore.pets.length +
      board.longStayResidents.length +
      hiddenNpcStore.hiddenNpcStates.filter(state => state.bonded || state.courting).length +
      visibleActiveVisitorCount +
      visibleAcquaintanceCount +
      archiveCount +
      residentKinCount +
      archiveKinCount +
      NPCS.filter(npc => !closeNpcIds.has(npc.id) && npcStore.getNpcState(npc.id)).length
  })

  const relationFilterClass = (filterId: RelationFilterId) =>
    activeFilter.value === filterId
      ? 'border-accent/60 bg-accent/15 text-accent shadow-[0_0_14px_rgb(var(--color-accent-rgb)/0.12)]'
      : 'border-accent/10 bg-bg/20 text-muted hover:border-accent/40 hover:text-accent'

  const setRelationFilter = (filterId: RelationFilterId) => {
    activeFilter.value = filterId
    if (filterId === 'all') {
      showWeakRelations.value = true
      showFamilyBranches.value = true
      showArchivedRelations.value = true
    } else if (filterId === 'archives') {
      showArchivedRelations.value = true
    }
  }

  const resetGraphView = () => {
    activeFilter.value = 'core'
    focusMode.value = false
    showWeakRelations.value = false
    showFamilyBranches.value = false
    showArchivedRelations.value = false
    selectedNodeId.value = 'player'
  }

  const layoutRing = <T,>(entries: T[], radiusX: number, radiusY: number, startAngle = -90) =>
    entries.map((entry, index) => {
      const angle = ((startAngle + (360 / Math.max(1, entries.length)) * index) * Math.PI) / 180
      return {
        entry,
        x: 50 + Math.cos(angle) * radiusX,
        y: 38 + Math.sin(angle) * radiusY
      }
    })

  const clampGraphCoord = (value: number, min = 5, max = 95) => Math.max(min, Math.min(max, value))

  const layoutConstellation = <T,>(entries: T[], radiusX: number, radiusY: number, startAngle = -90) =>
    entries.map((entry, index) => {
      const angle = ((startAngle + index * 137.508) * Math.PI) / 180
      const radiusRatio = 0.44 + 0.56 * Math.sqrt((index + 1) / Math.max(1, entries.length))
      return {
        entry,
        x: clampGraphCoord(50 + Math.cos(angle) * radiusX * radiusRatio, 7, 93),
        y: clampGraphCoord(38 + Math.sin(angle) * radiusY * radiusRatio, 7, 69)
      }
    })

  const layoutAroundNode = <T,>(entries: T[], centerX: number, centerY: number, radiusX: number, radiusY: number, startAngle = 190) =>
    entries.map((entry, index) => {
      const angle = ((startAngle + (360 / Math.max(1, entries.length)) * index) * Math.PI) / 180
      return {
        entry,
        x: clampGraphCoord(centerX + Math.cos(angle) * radiusX),
        y: clampGraphCoord(centerY + Math.sin(angle) * radiusY, 5, 71)
      }
    })

  const getRandomNpcFamilyTieKindLabel = (kind: RandomNpcFamilyTieKind): string => familyTieLabels[kind]
  const getRandomNpcFamilyTieAttitudeLabel = (attitude: RandomNpcFamilyTieDef['attitude']): string =>
    familyTieAttitudeLabels[attitude]
  const getRandomNpcFamilySpecialStage = (familyLine: RandomNpcFamilyLineState, tieId: string): 0 | 1 | 2 | 3 =>
    familyLine.specialTieEventStages?.[tieId] ?? 0
  const getRecentRandomNpcFamilySpecialEvents = (familyLine: RandomNpcFamilyLineState): RandomNpcFamilySpecialEventEntry[] =>
    [...(familyLine.specialTieEventHistory ?? [])].slice(-3).reverse()
  const getLatestRandomNpcFamilySpecialEvent = (
    familyLine: RandomNpcFamilyLineState,
    tieId: string
  ): RandomNpcFamilySpecialEventEntry | undefined =>
    [...(familyLine.specialTieEventHistory ?? [])].reverse().find(event => event.tieId === tieId)
  const formatRandomNpcFamilySpecialProgress = (
    familyLine: RandomNpcFamilyLineState,
    familyTies: RandomNpcFamilyTieDef[]
  ): string =>
    familyTies
      .map(tie => `${tie.relation}${getRandomNpcFamilySpecialStage(familyLine, tie.id)}/3`)
      .join('、')
  const formatRandomNpcFamilySpecialEvent = (event: RandomNpcFamilySpecialEventEntry): string => {
    const rewardSummary = event.rewardSummary ? `（${event.rewardSummary}）` : ''
    return `${event.dayTag} · ${event.title} ${event.stage}/3：${event.summary}${rewardSummary}`
  }
  const formatRandomNpcFamilySpecialHistory = (familyLine: RandomNpcFamilyLineState): string => {
    const recentEvents = getRecentRandomNpcFamilySpecialEvents(familyLine)
    return recentEvents.length > 0
      ? `最近核心深线：${recentEvents.map(formatRandomNpcFamilySpecialEvent).join('；')}`
      : '最近核心深线：尚未推进。'
  }
  const getRandomNpcResidentRelationLabel = (resident: RandomNpcLongStayEntry): string => {
    if (resident.relationshipLine.commitmentStatus === 'married') return '配偶'
    if (resident.relationshipLine.commitmentStatus === 'engaged') return '婚约'
    if (resident.relationshipLine.stage > 0) return randomNpcRelationLineLabels[resident.relationshipLine.kind]
    return tagLabels[resident.relationshipTag]
  }
  const getRandomNpcArchiveRelationLabel = (archive: RandomNpcArchiveSummary): string => {
    const line = archive.longStaySnapshot?.relationshipLine
    if (archive.archivedTier === 'long_stay' && line) {
      if (line.commitmentStatus === 'married') return '旧日配偶'
      if (line.commitmentStatus === 'engaged') return '旧日婚约'
      if (line.stage > 0) return `旧日${randomNpcRelationLineLabels[line.kind]}`
      return '旧日长住'
    }
    return `旧日${tagLabels[archive.relationshipTag]}`
  }
  const getRandomNpcFamilyBusinessStatus = (resident: RandomNpcLongStayEntry): string => {
    if (resident.familyLine.familyBusinessStage > 0) return `婚后家业 ${resident.familyLine.familyBusinessStage}/3`
    if (resident.relationshipLine.commitmentStatus === 'married') return '婚后家业待立约'
    return `阶段 ${resident.relationshipEventStage}/3`
  }
  const getRandomNpcArchiveStatus = (archive: RandomNpcArchiveSummary): string => {
    const snapshot = archive.longStaySnapshot
    if (archive.archivedTier === 'long_stay' && snapshot) {
      if (snapshot.familyLine.familyBusinessStage > 0) return `旧档家业 ${snapshot.familyLine.familyBusinessStage}/3`
      if (snapshot.relationshipLine.commitmentStatus === 'married') return '旧档婚后关系'
      return `旧档长住阶段 ${snapshot.relationshipEventStage}/3`
    }
    return archive.locked ? '已锁定旧档' : '可召回旧档'
  }

  const describeFixedNpcRelation = (npcId: string) => {
    const state = npcStore.getNpcState(npcId)
    if (!state) return '村邻'
    if (state.married) return '配偶'
    if (state.zhiji) return '知己'
    if (state.dating) return '恋人'
    return npcStore.getRelationshipStageText(npcId)
  }

  const formatItemNames = (itemIds: string[]) =>
    itemIds.map(itemId => getItemById(itemId)?.name ?? itemId).slice(0, 3).join('、') || '尚未记录'
  const getRelationItemLabel = (itemId: string) => getItemById(itemId)?.name ?? itemId

  const makeFamilyWishDetailLines = () => {
    const overview = npcStore.getFamilyWishOverview()
    const activeWish = overview.defs.find(def => def.id === overview.state.activeWishId) ?? null
    return [
      activeWish
        ? `家庭心愿：${activeWish.title}（${overview.state.progress}/${Math.max(1, overview.state.targetValue)}）。`
        : '家庭心愿：当前没有进行中的心愿。',
      overview.state.completedWishIds.length > 0
        ? `已完成心愿：${overview.state.completedWishIds.length} 个。`
        : ''
    ].filter(Boolean)
  }

  const makeFixedNpcDetailLines = (npcId: string) => {
    const state = npcStore.getNpcState(npcId)
    const triggered = (state?.triggeredHeartEvents ?? [])
      .map(id => getHeartEventById(id)?.title ?? id)
      .slice(-2)
    const clues = npcStore.getRelationshipCluesForNpc(npcId).slice(0, 2).map(clue => clue.text)
    return [
      state ? `最近对话：${state.talkedToday ? '今日已交谈' : '今日未交谈'}；送礼：${state.giftedToday ? '今日已送礼' : '今日未送礼'}。` : '',
      triggered.length > 0 ? `关系事件：${triggered.join('、')}` : '',
      clues.length > 0 ? `送礼偏好：${clues.join('；')}` : '',
      state && state.completedFamilyWishIds.length > 0 ? `家庭心愿：已共同完成 ${state.completedFamilyWishIds.length} 个。` : ''
    ].filter(Boolean)
  }

  const graphNodes = computed<RelationNode[]>(() => {
    const board = randomNpcBoardSnapshot.value
    const nodes: RelationNode[] = [
      {
        id: 'player',
        name: playerStore.playerName || '我',
        shortLabel: '我',
        group: 'self',
        groupLabel: '核心',
        relationLabel: '玩家',
        metricLabel: `${playerStore.money} 文`,
        statusLabel: '单机存档中心',
        detailLines: [
          '所有关系节点只读汇总当前本地存档，不公开到联机侧。',
          ...makeFamilyWishDetailLines()
        ],
        tags: ['中心节点', playerStore.honorific],
        x: 50,
        y: 38,
        circleClass: nodeClassByGroup('self', selectedNodeId.value === 'player'),
        textClass: textClassByGroup('self')
      }
    ]

    const spouse = npcStore.getSpouse()
    const zhiji = npcStore.getZhiji()
    const closeNpcIds = new Set<string>()
    if (spouse) closeNpcIds.add(spouse.npcId)
    if (zhiji) closeNpcIds.add(zhiji.npcId)
    npcStore.npcStates
      .filter(state => state.dating)
      .forEach(state => closeNpcIds.add(state.npcId))

    const closeFamilyEntries = [
      ...[...closeNpcIds].map(npcId => ({ kind: 'npc' as const, npcId })),
      ...npcStore.children.map(child => ({ kind: 'child' as const, child })),
      ...animalStore.pets.map(companion => ({ kind: 'pet' as const, companion }))
    ]

    layoutRing(closeFamilyEntries, 22, 16, -110).forEach(({ entry, x, y }) => {
      if (entry.kind === 'npc') {
        const def = NPCS.find(npc => npc.id === entry.npcId)
        const state = npcStore.getNpcState(entry.npcId)
        if (!def || !state) return
        const relation = describeFixedNpcRelation(entry.npcId)
        nodes.push({
          id: `fixed:${entry.npcId}`,
          name: def.name,
          shortLabel: relation.slice(0, 1),
          group: 'family',
          groupLabel: '亲密关系',
          relationLabel: relation,
          metricLabel: `${state.friendship} 好感`,
          statusLabel: state.married ? '已进入家庭线' : state.zhiji ? '知己协作中' : '恋爱推进中',
          detailLines: makeFixedNpcDetailLines(entry.npcId),
          tags: [def.role, def.personality],
          x,
          y,
          circleClass: nodeClassByGroup('family', selectedNodeId.value === `fixed:${entry.npcId}`),
          textClass: textClassByGroup('family'),
          selectableNpcId: entry.npcId
        })
      } else if (entry.kind === 'child') {
        const childFocus = entry.child.trainingState.focus
        const latestInfluence = entry.child.trainingState.familyInfluenceHistory[entry.child.trainingState.familyInfluenceHistory.length - 1]
        const latestFamilyEvent = entry.child.trainingState.familyEventHistory?.[entry.child.trainingState.familyEventHistory.length - 1]
        nodes.push({
          id: `child:${entry.child.id}`,
          name: entry.child.name,
          shortLabel: '子',
          group: 'family',
          groupLabel: '家庭成员',
          relationLabel: '孩子',
          metricLabel: `${entry.child.friendship} 亲密`,
          statusLabel: childStageLabels[entry.child.stage],
          detailLines: [
            `成长方向：${childFocus ? childTrainingFocusLabels[childFocus] : '未定'}；课程 ${entry.child.trainingState.lessonsThisWeek}/周。`,
            entry.child.trainingState.familyInfluenceSource
              ? `家族影响：${entry.child.trainingState.familyInfluenceSource}引导${childFocus ? childTrainingFocusLabels[childFocus] : '兴趣'}。`
              : '',
            latestFamilyEvent
              ? `兴趣事件：${latestFamilyEvent.dayTag} · ${latestFamilyEvent.title} ${latestFamilyEvent.stage}/3。`
              : '',
            latestInfluence ? `最近记录：${latestInfluence.dayTag} · ${latestInfluence.summary}` : ''
          ].filter(Boolean),
          tags: [entry.child.origin === 'adoption' ? '领养' : '出生', entry.child.birthQuality],
          x,
          y,
          circleClass: nodeClassByGroup('family', selectedNodeId.value === `child:${entry.child.id}`),
          textClass: textClassByGroup('family')
        })
      } else {
        nodes.push({
          id: `pet:${entry.companion.id}`,
          name: entry.companion.name,
          shortLabel: '宠',
          group: 'pet',
          groupLabel: '宠物',
          relationLabel: petTypeLabels[entry.companion.type],
          metricLabel: `${entry.companion.friendship} 好感`,
          statusLabel: entry.companion.specialFedToday ? '今日已特别喂食' : '今日可照料',
          detailLines: [
            entry.companion.specialFeedType
              ? `最近口味：${entry.companion.specialFeedType}，连续 ${entry.companion.specialFeedStreak} 次。`
              : '尚无特别喂食记录。'
          ],
          tags: [entry.companion.wasPetted ? '今日已抚摸' : '可抚摸'],
          x,
          y,
          circleClass: nodeClassByGroup('pet', selectedNodeId.value === `pet:${entry.companion.id}`),
          textClass: textClassByGroup('pet')
        })
      }
    })

    const longStaySourceIds = new Set(board.longStayResidents.map(entry => entry.sourceVisitorId))
    const acquaintanceIds = new Set(board.acquaintances.map(entry => entry.visitorId))
    const activeVisitorIds = new Set(board.activeVisitors.map(entry => entry.id))

    if (shouldBuildVisitors.value) {
      layoutRing(
        board.activeVisitors.filter(entry => !longStaySourceIds.has(entry.id) && !acquaintanceIds.has(entry.id)),
        28,
        20,
        32
      ).forEach(({ entry, x, y }) => {
        nodes.push({
          id: `visitor:${entry.id}`,
          name: entry.name,
          shortLabel: '访',
          group: 'visitor',
          groupLabel: '本周来访',
          relationLabel: tagLabels[entry.relationshipTag],
          metricLabel: `${entry.affinity} 好感`,
          statusLabel: entry.talkedToday ? '今日已聊过' : '今日可对话',
          detailLines: [
            `来历：${entry.origin}`,
            `烦恼：${entry.currentTrouble}`,
            `偏好：${formatItemNames(entry.preferences.loved)}。`
          ],
          tags: [entry.occupation, entry.plotHook, entry.familySeed],
          x,
          y,
          circleClass: nodeClassByGroup('visitor', selectedNodeId.value === `visitor:${entry.id}`),
          textClass: textClassByGroup('visitor')
        })
      })

      layoutRing(
        board.acquaintances.filter(entry => !longStaySourceIds.has(entry.visitorId)),
        37,
        25,
        18
      ).forEach(({ entry, x, y }) => {
        nodes.push({
          id: `acquaintance:${entry.visitorId}`,
          name: entry.name,
          shortLabel: '熟',
          group: 'acquaintance',
          groupLabel: '随机 NPC 熟人',
          relationLabel: tagLabels[entry.relationshipTag],
          metricLabel: `${entry.affinity} 好感`,
          statusLabel: `已聊 ${entry.conversationCount} 次`,
          detailLines: [
            `初见：${entry.firstMetDayTag || entry.firstMetWeekId}；最近：${entry.lastSeenDayTag || '未记录'}。`,
            `家庭线索：${entry.familySeed}`,
            `偏好：${formatItemNames(entry.preferences.loved.length > 0 ? entry.preferences.loved : entry.preferences.liked)}。`,
            `最近事件：${entry.keyEvents.slice(-1)[0] ?? '暂无关键事件。'}`
          ],
          tags: [entry.occupation, entry.plotHook, entry.smallOrder.title],
          x,
          y,
          circleClass: nodeClassByGroup('acquaintance', selectedNodeId.value === `acquaintance:${entry.visitorId}`),
          textClass: textClassByGroup('acquaintance')
        })
      })
    }

    layoutRing(board.longStayResidents, 34, 24, -35).forEach(({ entry, x, y }) => {
      const relationLabel = getRandomNpcResidentRelationLabel(entry)
      const latestBusinessEntry = entry.familyLine.familyBusinessHistory[entry.familyLine.familyBusinessHistory.length - 1]
      nodes.push({
        id: `resident:${entry.residentId}`,
        name: entry.name,
        shortLabel: entry.relationshipLine.commitmentStatus === 'married' ? '伴' : '住',
        group: 'resident',
        groupLabel: '长住随机 NPC',
        relationLabel,
        metricLabel: `${entry.affinity} 好感`,
        statusLabel: getRandomNpcFamilyBusinessStatus(entry),
        detailLines: [
          `驻村理由：${entry.residenceReason}`,
          `关系线：${entry.relationshipLine.note}`,
          entry.relationshipLine.commitmentStatus === 'married'
            ? `婚后日常：${entry.relationshipLine.homeLifeNote}`
            : '',
          entry.familyLine.familyBusinessStage > 0
            ? `婚后家业：${entry.familyLine.familyBusinessNote}`
            : entry.relationshipLine.commitmentStatus === 'married'
              ? '婚后家业：已成婚，可在 NPC 页推进家业立约。'
              : '',
          latestBusinessEntry?.rewardSummary ? `家业收益：${latestBusinessEntry.rewardSummary}` : '',
          entry.familyTies.length > 0 ? `家族节点：${entry.familyTies.map(tie => `${getRandomNpcFamilyTieKindLabel(tie.kind)}-${tie.relation}`).join('、')}` : '家族节点：尚未记录。',
          entry.familyTies.length > 0 ? `见家人进度：${entry.familyTies.map(tie => `${tie.relation}${entry.familyLine.familyMeetingStages?.[tie.id] ?? (entry.familyLine.metTieIds.includes(tie.id) ? 1 : 0)}/3`).join('、')}` : '',
          entry.familyTies.length > 0 ? `核心深线进度：${formatRandomNpcFamilySpecialProgress(entry.familyLine, entry.familyTies)}` : '',
          formatRandomNpcFamilySpecialHistory(entry.familyLine),
          `家族评价：${entry.familyLine.reputation}/100；${entry.familyLine.lastReview}`,
          `最近事件：${entry.keyEvents.slice(-1)[0] ?? '暂无关键事件。'}`,
          `路线：${routeLabels[entry.route]}；小订单：${entry.smallOrder.title}。`,
          `偏好：${formatItemNames(entry.preferences.loved.length > 0 ? entry.preferences.loved : entry.preferences.liked)}。`
        ].filter(Boolean),
        tags: [
          entry.occupation,
          entry.plotHook,
          entry.route,
          entry.relationshipLine.commitmentStatus === 'married' ? '婚后关系' : '',
          entry.familyLine.familyBusinessStage > 0 ? `家业${entry.familyLine.familyBusinessStage}/3` : ''
        ].filter(Boolean),
        x,
        y,
        circleClass: nodeClassByGroup('resident', selectedNodeId.value === `resident:${entry.residentId}`),
        textClass: textClassByGroup('resident')
      })

      if (shouldBuildFamilyBranches.value) {
        layoutAroundNode(entry.familyTies, x, y, 8.5, 6.5, 205).forEach(({ entry: tie, x: tieX, y: tieY }) => {
          const tieId = `kin:${entry.residentId}:${tie.id}`
          const latestSpecialEvent = getLatestRandomNpcFamilySpecialEvent(entry.familyLine, tie.id)
          const specialStage = getRandomNpcFamilySpecialStage(entry.familyLine, tie.id)
          nodes.push({
            id: tieId,
            name: tie.name,
            shortLabel: getRandomNpcFamilyTieKindLabel(tie.kind).slice(0, 1),
            group: 'kin',
            groupLabel: '随机 NPC 家族',
            relationLabel: tie.relation,
            metricLabel: getRandomNpcFamilyTieKindLabel(tie.kind),
            statusLabel: getRandomNpcFamilyTieAttitudeLabel(tie.attitude),
            detailLines: [
              `${entry.name}的${tie.relation}：${tie.summary}`,
              tie.kind === 'family_business' && entry.familyLine.familyBusinessStage > 0
                ? `婚后家业：${entry.familyLine.familyBusinessNote}`
                : '',
              tie.kind === 'family_business' && latestBusinessEntry?.rewardSummary
                ? `最近收益：${latestBusinessEntry.rewardSummary}`
                : '',
              `核心深线：${specialStage}/3`,
              latestSpecialEvent ? `最近深线：${formatRandomNpcFamilySpecialEvent(latestSpecialEvent)}` : '最近深线：尚未推进。',
              '该节点只保存在单机随机 NPC 存档，不写入联机公开关系图。'
            ].filter(Boolean),
            tags: [getRandomNpcFamilyTieKindLabel(tie.kind), tie.attitude],
            x: tieX,
            y: tieY,
            circleClass: nodeClassByGroup('kin', selectedNodeId.value === tieId),
            textClass: textClassByGroup('kin'),
            anchorNodeId: `resident:${entry.residentId}`
          })
        })
      }
    })

    if (shouldBuildArchives.value) {
      layoutRing(
        board.recentSummaries.filter(entry =>
          !activeVisitorIds.has(entry.visitorId) &&
          !acquaintanceIds.has(entry.visitorId) &&
          !longStaySourceIds.has(entry.visitorId)
        ),
        41,
        28,
        142
      ).forEach(({ entry, x, y }) => {
        const snapshot = entry.longStaySnapshot
        const latestMemory = entry.dialogueMemories?.slice(-1)[0]
        const latestBusinessEntry = snapshot?.familyLine.familyBusinessHistory[snapshot.familyLine.familyBusinessHistory.length - 1]
        const relationLabel = getRandomNpcArchiveRelationLabel(entry)
        nodes.push({
          id: `archive:${entry.visitorId}`,
          name: entry.name,
          shortLabel: entry.archivedTier === 'long_stay' ? '旧' : '档',
          group: 'archive',
          groupLabel: entry.archivedTier === 'long_stay' ? '旧日长住归档' : '旧日来客归档',
          relationLabel,
          metricLabel: `${entry.affinity} 好感`,
          statusLabel: getRandomNpcArchiveStatus(entry),
          detailLines: [
            `最近见面：${entry.lastSeenDayTag || '未记录'}；${entry.summary}`,
            entry.locked ? '该旧档已锁定，摘要会优先保留。' : '该旧档受近期摘要上限控制，可在 NPC 页召回。',
            entry.smallOrderCompleted ? '小订单：已完成。' : '小订单：未完成或未记录。',
            latestMemory ? `最近记忆：${latestMemory.dayTag} · ${latestMemory.summary}` : '',
            snapshot
              ? `旧日驻村：${routeLabels[snapshot.route]}；${snapshot.residenceReason}`
              : '',
            snapshot
              ? `旧日关系线：${snapshot.relationshipLine.note}`
              : '',
            snapshot?.relationshipLine.homeLifeNote
              ? `婚后日常：${snapshot.relationshipLine.homeLifeNote}`
              : '',
            snapshot && snapshot.familyLine.familyBusinessStage > 0
              ? `旧档家业：${snapshot.familyLine.familyBusinessNote}`
              : '',
            latestBusinessEntry?.rewardSummary ? `旧档收益：${latestBusinessEntry.rewardSummary}` : '',
            snapshot
              ? `旧档家族评价：${snapshot.familyLine.reputation}/100；${snapshot.familyLine.lastReview}`
              : '',
            snapshot && snapshot.familyTies.length > 0
              ? `旧档见家人：${snapshot.familyTies.map(tie => `${tie.relation}${snapshot.familyLine.familyMeetingStages?.[tie.id] ?? (snapshot.familyLine.metTieIds.includes(tie.id) ? 1 : 0)}/3`).join('、')}`
              : '',
            snapshot && snapshot.familyTies.length > 0
              ? `旧档核心深线：${formatRandomNpcFamilySpecialProgress(snapshot.familyLine, snapshot.familyTies)}`
              : '',
            snapshot ? formatRandomNpcFamilySpecialHistory(snapshot.familyLine).replace('最近核心深线', '旧档最近深线') : '',
            `关键记录：${entry.keyEvents.slice(-1)[0] ?? '暂无关键事件。'}`
          ].filter(Boolean),
          tags: [
            entry.occupation,
            entry.archivedTier === 'long_stay' ? '长住快照' : '短访摘要',
            entry.locked ? '锁定' : '',
            snapshot?.relationshipLine.commitmentStatus === 'married' ? '旧日婚后' : '',
            snapshot && snapshot.familyLine.familyBusinessStage > 0 ? `旧档家业${snapshot.familyLine.familyBusinessStage}/3` : ''
          ].filter(Boolean),
          x,
          y,
          circleClass: nodeClassByGroup('archive', selectedNodeId.value === `archive:${entry.visitorId}`),
          textClass: textClassByGroup('archive')
        })

        if (!snapshot || !shouldBuildFamilyBranches.value) return
        layoutAroundNode(snapshot.familyTies, x, y, 7.5, 6, 25).forEach(({ entry: tie, x: tieX, y: tieY }) => {
          const tieId = `archive-kin:${entry.visitorId}:${tie.id}`
          const latestSpecialEvent = getLatestRandomNpcFamilySpecialEvent(snapshot.familyLine, tie.id)
          const specialStage = getRandomNpcFamilySpecialStage(snapshot.familyLine, tie.id)
          nodes.push({
            id: tieId,
            name: tie.name,
            shortLabel: getRandomNpcFamilyTieKindLabel(tie.kind).slice(0, 1),
            group: 'kin',
            groupLabel: '旧档随机 NPC 家族',
            relationLabel: tie.relation,
            metricLabel: getRandomNpcFamilyTieKindLabel(tie.kind),
            statusLabel: getRandomNpcFamilyTieAttitudeLabel(tie.attitude),
            detailLines: [
              `${entry.name}旧档中的${tie.relation}：${tie.summary}`,
              tie.kind === 'family_business' && snapshot.familyLine.familyBusinessStage > 0
                ? `旧档家业：${snapshot.familyLine.familyBusinessNote}`
                : '',
              `旧档核心深线：${specialStage}/3`,
              latestSpecialEvent ? `旧档最近深线：${formatRandomNpcFamilySpecialEvent(latestSpecialEvent)}` : '旧档最近深线：尚未推进。',
              '该节点来自旧日长住快照；召回后会恢复到长住名册并继续只保存在单机存档。'
            ].filter(Boolean),
            tags: [getRandomNpcFamilyTieKindLabel(tie.kind), tie.attitude, '旧档快照'],
            x: tieX,
            y: tieY,
            circleClass: nodeClassByGroup('kin', selectedNodeId.value === tieId),
            textClass: textClassByGroup('kin'),
            anchorNodeId: `archive:${entry.visitorId}`
          })
        })
      })
    }

    if (shouldBuildVillagers.value) {
      const villagerEntries = NPCS.filter(npc => !closeNpcIds.has(npc.id)).map(npc => ({
        npc,
        state: npcStore.getNpcState(npc.id)
      }))
      layoutConstellation(villagerEntries, 43, 31, -92).forEach(({ entry, x, y }) => {
        if (!entry.state) return
        nodes.push({
          id: `fixed:${entry.npc.id}`,
          name: entry.npc.name,
          shortLabel: '邻',
          group: 'villager',
          groupLabel: '固定 NPC',
          relationLabel: describeFixedNpcRelation(entry.npc.id),
          metricLabel: `${entry.state.friendship} 好感`,
          statusLabel: npcStore.getRelationshipStageDescription(entry.npc.id),
          detailLines: makeFixedNpcDetailLines(entry.npc.id),
          tags: [entry.npc.role, entry.npc.personality],
          x,
          y,
          circleClass: nodeClassByGroup('villager', selectedNodeId.value === `fixed:${entry.npc.id}`),
          textClass: textClassByGroup('villager'),
          selectableNpcId: entry.npc.id
        })
      })
    }

    const spiritEntries = hiddenNpcStore.hiddenNpcStates.filter(state => state.bonded || state.courting)
    layoutRing(spiritEntries, 13, 30, 90).forEach(({ entry, x, y }) => {
      const def = getHiddenNpcById(entry.npcId)
      if (!def) return
      nodes.push({
        id: `spirit:${entry.npcId}`,
        name: def.name,
        shortLabel: '灵',
        group: 'spirit',
        groupLabel: '仙灵',
        relationLabel: entry.bonded ? '结缘' : '求缘',
        metricLabel: `${entry.affinity} 缘分`,
        statusLabel: `灵契 ${entry.bondTier}`,
        detailLines: [
          entry.triggeredHeartEvents.length > 0 ? `结缘记忆：${entry.triggeredHeartEvents.slice(-2).join('、')}` : '尚无已归档结缘记忆。'
        ],
        offeringItemIds: def.resonantOfferings.slice(0, 3),
        tags: [def.title, def.personality],
        x,
        y,
        circleClass: nodeClassByGroup('spirit', selectedNodeId.value === `spirit:${entry.npcId}`),
        textClass: textClassByGroup('spirit')
      })
    })

    return nodes
  })

  const nodeById = computed(() => new Map(graphNodes.value.map(node => [node.id, node])))

  const isCoreNode = (node: RelationNode) =>
    node.group === 'self' ||
    node.group === 'family' ||
    node.group === 'pet' ||
    node.group === 'resident' ||
    node.group === 'spirit' ||
    node.relationLabel === '配偶' ||
    node.relationLabel === '知己' ||
    node.relationLabel === '恋人'

  const nodePassesFilter = (node: RelationNode) => {
    if (node.group === 'self') return true
    if (node.group === 'kin') {
      if (isArchiveKinNode(node)) return activeFilter.value === 'archives' || activeFilter.value === 'all' || (showArchivedRelations.value && showFamilyBranches.value)
      return showFamilyBranches.value || activeFilter.value === 'all'
    }
    if (node.group === 'archive') return showArchivedRelations.value || activeFilter.value === 'archives' || activeFilter.value === 'all'
    if (node.group === 'visitor' || node.group === 'acquaintance') return showWeakRelations.value || activeFilter.value === 'visitors' || activeFilter.value === 'all'
    if (node.group === 'villager') return showWeakRelations.value || activeFilter.value === 'villagers' || activeFilter.value === 'all'
    if (activeFilter.value === 'visitors') return node.group === 'resident'
    if (activeFilter.value === 'villagers') return node.group === 'family' || node.group === 'spirit'
    if (activeFilter.value === 'archives') return false
    return isCoreNode(node)
  }

  const selectedNeighborIds = computed(() => {
    const ids = new Set<string>(['player', selectedNodeId.value])
    const selectedNode = nodeById.value.get(selectedNodeId.value)
    if (selectedNode?.anchorNodeId) ids.add(selectedNode.anchorNodeId)
    graphNodes.value.forEach(node => {
      if (node.anchorNodeId === selectedNodeId.value) ids.add(node.id)
      if (node.id === selectedNode?.anchorNodeId) ids.add(node.id)
    })
    return ids
  })

  const visibleGraphNodes = computed(() => {
    const candidates = graphNodes.value.filter(node => nodePassesFilter(node))
    if (!focusMode.value || selectedNodeId.value === 'player') return candidates
    const focused = candidates.filter(node => selectedNeighborIds.value.has(node.id))
    return focused.length > 1 ? focused : candidates
  })

  const visibleNodeIds = computed(() => new Set(visibleGraphNodes.value.map(node => node.id)))

  const graphLinks = computed<RelationLink[]>(() =>
    graphNodes.value
      .filter(node => node.id !== 'player')
      .map(node => ({
        from: node.anchorNodeId ?? 'player',
        to: node.id,
        label: node.relationLabel,
        className: relationLinkClass(
          node.relationLabel === '配偶'
            ? 'spouse'
            : node.relationLabel === '知己'
              ? 'zhiji'
              : node.relationLabel === '竞争者' || node.relationLabel === '宿怨' || node.relationLabel === '旧日宿怨'
                ? 'rival'
                : node.relationLabel === '暧昧'
                  ? 'ambiguous'
              : node.group === 'family' || node.group === 'pet'
                ? 'family'
                : node.group
        )
      }))
  )

  const visibleGraphLinks = computed(() =>
    graphLinks.value.filter(link => visibleNodeIds.value.has(link.from) && visibleNodeIds.value.has(link.to))
  )

  const isSelectedNode = (node: RelationNode) => node.id === selectedNodeId.value

  const isSelectedLink = (link: RelationLink) => link.from === selectedNodeId.value || link.to === selectedNodeId.value

  const isLinkedToSelected = (node: RelationNode) =>
    selectedNodeId.value !== 'player' &&
    node.id !== selectedNodeId.value &&
    visibleGraphLinks.value.some(link =>
      (link.from === selectedNodeId.value && link.to === node.id) ||
      (link.to === selectedNodeId.value && link.from === node.id)
    )

  const linkVisualClass = (link: RelationLink) => {
    if (isSelectedLink(link)) return 'opacity-95'
    if (focusMode.value && selectedNodeId.value !== 'player') return 'opacity-25'
    if (link.from !== 'player') return 'opacity-45'
    return 'opacity-25'
  }

  const nodeVisualClass = (node: RelationNode) => {
    if (isSelectedNode(node)) return 'family-graph-node-selected'
    if (focusMode.value && selectedNodeId.value !== 'player' && !selectedNeighborIds.value.has(node.id)) return 'opacity-25'
    if (isWeakGroup(node.group) && activeFilter.value === 'core') return 'opacity-60'
    return ''
  }

  const nodeRadius = (node: RelationNode) => {
    if (isSelectedNode(node)) return node.group === 'self' ? 5.6 : 4.9
    if (node.group === 'self') return 5
    if (node.group === 'kin' || node.group === 'villager' || node.group === 'archive') return 2.85
    if (isWeakGroup(node.group)) return 3.15
    return 4.2
  }

  const nodeLabelOffset = (node: RelationNode) => {
    if (node.group === 'kin' || node.group === 'archive' || node.group === 'villager') return 6.2
    return 7.1
  }

  const shouldShowNodeGlyph = (node: RelationNode) =>
    isSelectedNode(node) ||
    visibleGraphNodes.value.length <= 24 ||
    (node.group !== 'kin' && node.group !== 'archive' && node.group !== 'villager')

  const shouldShowNodeName = (node: RelationNode) => {
    if (isSelectedNode(node) || node.group === 'self') return true
    if (node.group === 'family' || node.group === 'resident' || node.group === 'spirit') return true
    if (selectedNodeId.value !== 'player' && isLinkedToSelected(node)) return true
    if (activeFilter.value === 'visitors' && (node.group === 'visitor' || node.group === 'acquaintance')) return visibleGraphNodes.value.length <= 16
    if (activeFilter.value === 'archives' && node.group === 'archive') return true
    if (activeFilter.value === 'villagers' && node.group === 'villager') return visibleGraphNodes.value.length <= 18
    return false
  }

  const visibleGraphLinkLabels = computed(() =>
    selectedNodeId.value === 'player'
      ? []
      : visibleGraphLinks.value.filter(link => isSelectedLink(link))
  )

  const selectedNode = computed(() => nodeById.value.get(selectedNodeId.value) ?? graphNodes.value[0] ?? null)

  const selectedPrimaryLines = computed(() => selectedNode.value?.detailLines.slice(0, 3) ?? [])
  const selectedMoreLines = computed(() => selectedNode.value?.detailLines.slice(3, 7) ?? [])

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId
  }

  watch(visibleGraphNodes, nodes => {
    if (!nodes.some(node => node.id === selectedNodeId.value)) {
      selectedNodeId.value = 'player'
    }
  })
</script>

<style scoped>
  .family-graph-shell {
    background:
      linear-gradient(135deg, rgb(var(--color-panel) / 0.46), rgb(var(--color-bg) / 0.42)),
      rgb(var(--color-panel) / 0.18);
  }

  .family-graph-map {
    background:
      linear-gradient(180deg, rgb(var(--color-panel) / 0.38), rgb(var(--color-panel) / 0.24)),
      rgb(var(--color-bg) / 0.12);
  }

  .family-graph-map-wash {
    fill: rgb(var(--color-panel) / 0.18);
    stroke: rgb(var(--color-accent-rgb) / 0.11);
    stroke-width: 0.14;
  }

  .family-graph-map-path {
    fill: none;
    stroke: rgb(var(--color-accent-rgb) / 0.16);
    stroke-width: 0.16;
  }

  .family-graph-map-path-soft {
    fill: none;
    stroke: rgb(var(--color-water-rgb) / 0.13);
    stroke-width: 0.13;
  }

  .family-graph-selected-halo {
    fill: rgb(var(--color-highlight-rgb) / 0.13);
    stroke: rgb(var(--color-highlight-rgb) / 0.24);
  }

  .family-graph-linked-halo {
    fill: rgb(var(--color-water-rgb) / 0.09);
    stroke: rgb(var(--color-water-rgb) / 0.16);
  }

  .family-graph-control,
  .family-graph-toggle span {
    transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;
  }

  .family-graph-toggle {
    cursor: pointer;
  }

  .family-graph-toggle span {
    display: inline-flex;
    min-height: 1.55rem;
    align-items: center;
    border-width: 1px;
    padding: 0.25rem 0.5rem;
  }

  .family-graph-stat {
    border: 1px solid rgb(var(--color-accent-rgb) / 0.10);
    background: rgb(var(--color-bg) / 0.18);
    padding: 0.35rem 0.45rem;
  }

  .family-graph-detail {
    background:
      linear-gradient(180deg, rgb(var(--color-panel) / 0.30), rgb(var(--color-bg) / 0.34)),
      rgb(var(--color-bg) / 0.18);
  }

  .family-graph-node {
    transition: opacity 0.16s ease;
  }

  .family-graph-node-selected {
    filter: none;
  }
</style>
