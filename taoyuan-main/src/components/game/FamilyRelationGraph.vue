<template>
  <section class="border border-accent/20 rounded-xs p-2 mb-3 bg-bg/10" data-testid="family-relation-graph">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div>
        <p class="text-xs text-accent">家族关系图谱</p>
        <p class="text-[10px] text-muted mt-0.5">单机关系网回看：家庭、宠物、长住来客和村中固定关系都保留在本地存档。</p>
      </div>
      <span class="text-[10px] text-muted whitespace-nowrap">节点 {{ graphNodes.length }} · 关系 {{ graphLinks.length }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)] gap-2">
      <div class="border border-accent/10 rounded-xs p-2 bg-accent/5 overflow-x-auto">
        <svg class="min-w-[520px] w-full h-[360px]" viewBox="0 0 100 76" role="img" aria-label="家族关系图" data-testid="family-relation-graph-svg">
          <line
            v-for="link in graphLinks"
            :key="`${link.from}-${link.to}-${link.label}`"
            :x1="nodeById.get(link.from)?.x ?? 50"
            :y1="nodeById.get(link.from)?.y ?? 38"
            :x2="nodeById.get(link.to)?.x ?? 50"
            :y2="nodeById.get(link.to)?.y ?? 38"
            :class="link.className"
            stroke-width="0.45"
            stroke-linecap="round"
          />
          <text
            v-for="link in graphLinks"
            :key="`label-${link.from}-${link.to}-${link.label}`"
            :x="((nodeById.get(link.from)?.x ?? 50) + (nodeById.get(link.to)?.x ?? 50)) / 2"
            :y="((nodeById.get(link.from)?.y ?? 38) + (nodeById.get(link.to)?.y ?? 38)) / 2 - 0.9"
            text-anchor="middle"
            class="fill-muted text-[2.1px] pointer-events-none"
          >
            {{ link.label }}
          </text>
          <g
            v-for="node in graphNodes"
            :key="node.id"
            class="cursor-pointer outline-none"
            tabindex="0"
            role="button"
            :aria-label="`${node.name}，${node.relationLabel}`"
            :data-testid="`family-relation-node-${node.id}`"
            @click="selectNode(node.id)"
            @keydown.enter.prevent="selectNode(node.id)"
            @keydown.space.prevent="selectNode(node.id)"
          >
            <circle
              :cx="node.x"
              :cy="node.y"
              :r="selectedNodeId === node.id ? 4.8 : 4.1"
              :class="node.circleClass"
              stroke-width="0.55"
            />
            <text
              :x="node.x"
              :y="node.y + 0.55"
              text-anchor="middle"
              dominant-baseline="middle"
              class="fill-bg text-[3px] font-bold pointer-events-none"
            >
              {{ node.shortLabel }}
            </text>
            <text
              :x="node.x"
              :y="node.y + 7.2"
              text-anchor="middle"
              class="fill-current text-[2.6px] pointer-events-none"
              :class="node.textClass"
            >
              {{ node.name }}
            </text>
          </g>
        </svg>
      </div>

      <div class="border border-accent/10 rounded-xs p-2 bg-bg/10 min-h-[220px]" data-testid="family-relation-detail">
        <template v-if="selectedNode">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs text-accent truncate">{{ selectedNode.name }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ selectedNode.relationLabel }} · {{ selectedNode.groupLabel }}</p>
            </div>
            <Button
              v-if="selectedNode.selectableNpcId"
              class="shrink-0 justify-center !px-2 !py-1"
              @click="$emit('selectNpc', selectedNode.selectableNpcId)"
            >
              查看人物
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-1 mt-2 text-[10px]">
            <div class="border border-accent/10 rounded-xs px-1.5 py-1">
              <span class="text-muted/60">关系值</span>
              <p class="text-accent mt-0.5">{{ selectedNode.metricLabel }}</p>
            </div>
            <div class="border border-accent/10 rounded-xs px-1.5 py-1">
              <span class="text-muted/60">状态</span>
              <p class="text-muted mt-0.5">{{ selectedNode.statusLabel }}</p>
            </div>
          </div>
          <div v-if="selectedNode.detailLines.length > 0" class="mt-2 space-y-1">
            <p
              v-for="line in selectedNode.detailLines"
              :key="`${selectedNode.id}-${line}`"
              class="text-[10px] text-muted leading-4"
            >
              {{ line }}
            </p>
          </div>
          <div v-if="selectedNode.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="tag in selectedNode.tags"
              :key="`${selectedNode.id}-${tag}`"
              class="text-[10px] border border-accent/15 text-accent rounded-xs px-1 py-0.5"
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
  import Button from '@/components/game/Button.vue'
  import { NPCS, getHeartEventById, getItemById } from '@/data'
  import { getHiddenNpcById } from '@/data/hiddenNpcs'
  import { useAnimalStore } from '@/stores/useAnimalStore'
  import { useHiddenNpcStore } from '@/stores/useHiddenNpcStore'
  import { useNpcStore } from '@/stores/useNpcStore'
  import { usePlayerStore } from '@/stores/usePlayerStore'
  import type { ChildTrainingFocus, RandomNpcArchiveSummary, RandomNpcFamilyLineState, RandomNpcFamilySpecialEventEntry, RandomNpcFamilyTieDef, RandomNpcFamilyTieKind, RandomNpcLongStayEntry, RandomNpcRelationshipTag } from '@/types'

  defineEmits<{
    (event: 'selectNpc', npcId: string): void
  }>()

  type RelationNodeGroup = 'self' | 'family' | 'pet' | 'visitor' | 'acquaintance' | 'resident' | 'archive' | 'villager' | 'spirit' | 'kin'

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
  const randomNpcBoard = computed(() => npcStore.getRandomNpcBoard())

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
    romance: '恋爱线',
    zhiji: '知己',
    sworn: '结拜',
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
    const selectedRing = active ? ' stroke-bg' : ''
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
  const formatRandomNpcFamilySpecialEvent = (event: RandomNpcFamilySpecialEventEntry): string =>
    `${event.dayTag} · ${event.title} ${event.stage}/3：${event.summary}`
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

    const longStaySourceIds = new Set(randomNpcBoard.value.longStayResidents.map(entry => entry.sourceVisitorId))
    const acquaintanceIds = new Set(randomNpcBoard.value.acquaintances.map(entry => entry.visitorId))
    const activeVisitorIds = new Set(randomNpcBoard.value.activeVisitors.map(entry => entry.id))

    layoutRing(
      randomNpcBoard.value.activeVisitors.filter(entry => !longStaySourceIds.has(entry.id) && !acquaintanceIds.has(entry.id)),
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
      randomNpcBoard.value.acquaintances.filter(entry => !longStaySourceIds.has(entry.visitorId)),
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

    layoutRing(randomNpcBoard.value.longStayResidents, 34, 24, -35).forEach(({ entry, x, y }) => {
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
    })

    layoutRing(
      randomNpcBoard.value.recentSummaries.filter(entry =>
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

      if (!snapshot) return
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

    const villagerEntries = NPCS.filter(npc => !closeNpcIds.has(npc.id)).map(npc => ({
      npc,
      state: npcStore.getNpcState(npc.id)
    }))
    layoutRing(villagerEntries, 44, 32, -92).forEach(({ entry, x, y }) => {
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
          entry.triggeredHeartEvents.length > 0 ? `结缘记忆：${entry.triggeredHeartEvents.slice(-2).join('、')}` : '尚无已归档结缘记忆。',
          `偏好供奉：${def.resonantOfferings.map(itemId => getItemById(itemId)?.name ?? itemId).slice(0, 3).join('、')}`
        ],
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
              : node.relationLabel === '竞争者'
                ? 'rival'
                : node.relationLabel === '暧昧'
                  ? 'ambiguous'
              : node.group === 'family' || node.group === 'pet'
                ? 'family'
                : node.group
        )
      }))
  )

  const selectedNode = computed(() => nodeById.value.get(selectedNodeId.value) ?? graphNodes.value[0] ?? null)

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId
  }

  watch(graphNodes, nodes => {
    if (!nodes.some(node => node.id === selectedNodeId.value)) {
      selectedNodeId.value = 'player'
    }
  })
</script>
