import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(projectRoot, '..')

const readProjectSource = relativePath => readFile(path.join(projectRoot, relativePath), 'utf8')
const readWorkspaceSource = relativePath => readFile(path.join(workspaceRoot, relativePath), 'utf8')

const [
  randomNpcs,
  useNpcStore,
  npcTypes,
  npcView,
  familyRelationGraph,
  itemEncyclopedia,
  onlineProfileApi
] = await Promise.all([
  readProjectSource('src/data/randomNpcs.ts'),
  readProjectSource('src/stores/useNpcStore.ts'),
  readProjectSource('src/types/npc.ts'),
  readProjectSource('src/views/game/NpcView.vue'),
  readProjectSource('src/components/game/FamilyRelationGraph.vue'),
  readProjectSource('src/data/itemEncyclopedia.ts'),
  readProjectSource('src/utils/onlineProfileApi.ts')
])

const errors = []

const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const assertIncludes = (source, fragment, message) => {
  assert(source.includes(fragment), message)
}

const assertMatches = (source, pattern, message) => {
  assert(pattern.test(source), message)
}

const getBetween = (source, startAnchor, endAnchor) => {
  const start = source.indexOf(startAnchor)
  if (start < 0) return ''
  const end = endAnchor ? source.indexOf(endAnchor, start + startAnchor.length) : -1
  return source.slice(start, end > start ? end : start + 3000)
}

const getBlock = (source, anchor, length = 2600) => {
  const start = source.indexOf(anchor)
  return start >= 0 ? source.slice(start, start + length) : ''
}

const assertBlockIncludes = (source, anchor, fragment, message, length = 2600) => {
  const block = getBlock(source, anchor, length)
  assert(block.length > 0, `缺少代码块：${anchor}`)
  assert(block.includes(fragment), message)
}

const assertLimitAtMost = (source, key, maxValue, message) => {
  const match = source.match(new RegExp(`${key}:\\s*(\\d+)`))
  assert(!!match, `RANDOM_NPC_VISITOR_CONFIG 缺少 ${key}`)
  if (match) {
    const value = Number(match[1])
    assert(value > 0 && value <= maxValue, `${message}，当前 ${value}，上限 ${maxValue}`)
  }
}

const assertConstLimitAtMost = (source, key, maxValue, message) => {
  const match = source.match(new RegExp(`const\\s+${key}\\s*=\\s*(\\d+)`))
  assert(!!match, `useNpcStore 缺少 ${key}`)
  if (match) {
    const value = Number(match[1])
    assert(value > 0 && value <= maxValue, `${message}，当前 ${value}，上限 ${maxValue}`)
  }
}

for (const [key, maxValue, label] of [
  ['maxActiveVisitors', 2, '活跃短访人数不能放大'],
  ['maxRecentSummaries', 8, '旧日摘要数量不能放大'],
  ['maxLockedArchives', 3, '锁定旧档数量不能放大'],
  ['maxAcquaintances', 12, '熟人册数量不能放大'],
  ['maxLongStayResidents', 3, '长住随机 NPC 数量不能放大'],
  ['maxWeeklyReunionVisitors', 1, '每周自然重逢人数不能放大'],
  ['weeklyReunionCooldownDays', 7, '每周重逢冷却不能缩短到无限刷出'],
  ['acquaintanceColdArchiveDays', 28, '熟人冷归档天数必须保留'],
  ['longStayColdArchiveDays', 56, '长住冷归档天数必须保留'],
  ['longStayDeepArchiveDays', 112, '深关系长住归档天数必须保留']
]) {
  assertLimitAtMost(randomNpcs, key, maxValue, label)
}

for (const [key, maxValue, label] of [
  ['RANDOM_NPC_DIALOGUE_MEMORY_LIMIT', 6, '短访 / 熟人对话记忆上限不能放大'],
  ['RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT', 8, '长住对话记忆上限不能放大'],
  ['RANDOM_NPC_RELATION_LINE_HISTORY_LIMIT', 6, '关系线历史上限不能放大'],
  ['RANDOM_NPC_FAMILY_TIE_LIMIT', 4, '家族节点上限不能放大'],
  ['RANDOM_NPC_FAMILY_REVIEW_LIMIT', 4, '家族评价 / 家业历史上限不能放大'],
  ['RANDOM_NPC_FAMILY_SPECIAL_EVENT_LIMIT', 4, '家族深线历史上限不能放大'],
  ['RANDOM_NPC_SHORT_ROMANCE_HISTORY_LIMIT', 4, '短线暧昧历史上限不能放大'],
  ['CHILD_TRAINING_FAMILY_INFLUENCE_LIMIT', 4, '孩子家族影响历史上限不能放大'],
  ['CHILD_TRAINING_FAMILY_EVENT_LIMIT', 4, '孩子家族事件历史上限不能放大'],
  ['CHILD_TRAINING_FAMILY_EVENT_CHAIN_STAGE_LIMIT', 3, '孩子家族事件阶段上限不能放大']
]) {
  assertConstLimitAtMost(useNpcStore, key, maxValue, label)
}

for (const field of [
  'activeVisitors: RandomNpcVisitorState[]',
  'acquaintanceIds: string[]',
  'acquaintances: RandomNpcAcquaintanceEntry[]',
  'longStayResidents: RandomNpcLongStayEntry[]',
  'recentSummaries: RandomNpcArchiveSummary[]'
]) {
  assertIncludes(npcTypes, field, `RandomNpcBoardState 缺少 ${field}`)
}

for (const field of [
  'locked?: boolean',
  'dialogueMemories?: RandomNpcDialogueMemoryEntry[]',
  'shortRomance?: RandomNpcShortRomanceState',
  'archivedTier?: RandomNpcVisitTier',
  'longStaySnapshot?: RandomNpcLongStayArchiveSnapshot'
]) {
  assertIncludes(npcTypes, field, `RandomNpcArchiveSummary 缺少 ${field}`)
}

const longStaySnapshotType = getBetween(
  npcTypes,
  'export interface RandomNpcLongStayArchiveSnapshot',
  'export interface RandomNpcBoardState'
)
for (const field of [
  'completedStoryEventIds: string[]',
  'familyTies: RandomNpcFamilyTieDef[]',
  'familyLine: RandomNpcFamilyLineState',
  'relationshipLine: RandomNpcRelationLineState'
]) {
  assertIncludes(longStaySnapshotType, field, `长住旧档快照缺少 ${field}`)
}
for (const forbidden of ['dialogueMemories', 'keyEvents', 'activeVisitors', 'acquaintances', 'recentSummaries']) {
  assert(!longStaySnapshotType.includes(forbidden), `长住旧档快照不应保存完整 ${forbidden}`)
}

assertIncludes(useNpcStore, '): RandomNpcDialogueMemoryEntry[] => [...memories, memory].slice(-limit)', '对话记忆追加必须使用传入上限裁剪')
assertBlockIncludes(useNpcStore, 'const sanitizeRandomNpcDialogueMemories', '.slice(-limit)', '对话记忆读档必须按上限裁剪')
assertBlockIncludes(useNpcStore, 'const sanitizeRandomNpcDialogueScenes', '.slice(0, 4)', '对话场景读档必须裁剪到 4 条')
assertBlockIncludes(useNpcStore, 'const sanitizeRandomNpcFamilyTies', '.slice(0, RANDOM_NPC_FAMILY_TIE_LIMIT)', '家族节点读档必须按上限裁剪')
assertBlockIncludes(useNpcStore, 'const sanitizeRandomNpcFamilyLineState', '.slice(-RANDOM_NPC_FAMILY_REVIEW_LIMIT)', '家族评价 / 家业历史读档必须按上限裁剪', 4200)
assertBlockIncludes(useNpcStore, 'const sanitizeRandomNpcFamilyLineState', '.slice(-RANDOM_NPC_FAMILY_SPECIAL_EVENT_LIMIT)', '家族深线历史读档必须按上限裁剪', 4200)
assertIncludes(npcTypes, 'export type RandomNpcFamilyReviewType', '家族评价类型必须结构化，避免触发器写入散落字符串')
for (const reviewType of ["'relationship'", "'commitment'", "'home'", "'festival'", "'reunion'"]) {
  assertIncludes(npcTypes, reviewType, `家族评价类型缺少 ${reviewType} 触发记录`)
}
assertBlockIncludes(useNpcStore, 'const appendRandomNpcFamilyTriggerReview', 'appendRandomNpcFamilyReview', '家庭线触发器必须复用限长家族评价追加逻辑')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayResidentFromArchive', "type: 'reunion'", '长住旧档召回必须写入家庭线接续触发器', 5200)
assertBlockIncludes(useNpcStore, 'const startRandomNpcRelationLine', "type: 'relationship'", '开启长住关系线必须触发家庭线记录', 5200)
assertBlockIncludes(useNpcStore, 'const engageRandomNpcRelationLine', "type: 'commitment'", '随机 NPC 订婚必须触发家庭线记录', 5200)
assertBlockIncludes(useNpcStore, 'const marryRandomNpcRelationLine', "type: 'commitment'", '随机 NPC 成婚必须触发家庭线记录', 5200)
assertBlockIncludes(useNpcStore, 'const recordRandomNpcMarriedLife', "type: 'home'", '婚后日常必须触发家庭线记录', 5200)
assertBlockIncludes(useNpcStore, 'const progressRandomNpcFestivalCompanion', "type: 'festival'", '长住节会同行必须触发家庭线记录', 5200)
assertIncludes(useNpcStore, '.slice(0, RANDOM_NPC_FAMILY_TIE_LIMIT)', '已见家人 ID 必须按家族节点上限裁剪')
assertIncludes(useNpcStore, '.slice(-RANDOM_NPC_RELATION_LINE_HISTORY_LIMIT)', '关系线读档必须按历史上限裁剪')
assertIncludes(useNpcStore, '): RandomNpcRelationLineState[\'history\'] => [...line.history, event].slice(-RANDOM_NPC_RELATION_LINE_HISTORY_LIMIT)', '关系线追加必须按历史上限裁剪')
assertBlockIncludes(useNpcStore, 'const sanitizeRandomNpcShortRomanceState', '.slice(-RANDOM_NPC_SHORT_ROMANCE_HISTORY_LIMIT)', '短线暧昧读档必须按历史上限裁剪')
assertIncludes(useNpcStore, '): RandomNpcShortRomanceState[\'history\'] => [...line.history, event].slice(-RANDOM_NPC_SHORT_ROMANCE_HISTORY_LIMIT)', '短线暧昧追加必须按历史上限裁剪')
assertBlockIncludes(useNpcStore, 'const sanitizeChildTrainingInfluenceHistory', '.slice(-CHILD_TRAINING_FAMILY_INFLUENCE_LIMIT)', '孩子家族影响读档必须按上限裁剪')
assertBlockIncludes(useNpcStore, 'const sanitizeChildTrainingFamilyEventHistory', '.slice(-CHILD_TRAINING_FAMILY_EVENT_LIMIT)', '孩子家族事件读档必须按上限裁剪')

assertBlockIncludes(useNpcStore, 'const trimRandomNpcArchives', 'entries.findIndex(entry => entry.visitorId === archive.visitorId) === index', '旧日摘要裁剪前必须按 visitorId 去重')
assertBlockIncludes(useNpcStore, 'const trimRandomNpcArchives', '.slice(0, RANDOM_NPC_VISITOR_CONFIG.maxLockedArchives)', '旧日摘要必须限制锁定条数')
assertBlockIncludes(useNpcStore, 'const trimRandomNpcArchives', 'RANDOM_NPC_VISITOR_CONFIG.maxRecentSummaries - lockedArchives.length', '旧日摘要必须限制总条数并给锁定条预留')
assertBlockIncludes(useNpcStore, 'const trimRandomNpcAcquaintances', 'RANDOM_NPC_VISITOR_CONFIG.maxAcquaintances', '熟人册必须按 maxAcquaintances 裁剪')
assertBlockIncludes(useNpcStore, 'const trimRandomNpcLongStayResidents', 'RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents', '长住名册必须按 maxLongStayResidents 裁剪')

assertMatches(useNpcStore, /activeVisitors:[\s\S]*?\.slice\(0,\s*RANDOM_NPC_VISITOR_CONFIG\.maxActiveVisitors\)[\s\S]*?keyEvents:[\s\S]*?\.slice\(-6\)/, '读档必须限制活跃短访数量与关键事件长度')
assertMatches(useNpcStore, /acquaintanceIds:[\s\S]*?\.slice\(0,\s*RANDOM_NPC_VISITOR_CONFIG\.maxActiveVisitors\)/, '读档 acquaintanceIds 必须跟随活跃短访上限')
assertMatches(useNpcStore, /acquaintances:\s*trimRandomNpcAcquaintances\(/, '读档熟人册必须通过 trimRandomNpcAcquaintances')
assertMatches(useNpcStore, /longStayResidents:\s*trimRandomNpcLongStayResidents\(/, '读档长住名册必须通过 trimRandomNpcLongStayResidents')
assertMatches(useNpcStore, /recentSummaries:\s*trimRandomNpcArchives\(/, '读档旧日摘要必须通过 trimRandomNpcArchives')
assertMatches(useNpcStore, /longStayResidents:[\s\S]*?keyEvents:[\s\S]*?\.slice\(-8\)[\s\S]*?dialogueMemories:\s*sanitizeRandomNpcDialogueMemories\(entry\.dialogueMemories,\s*RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT\)/, '长住读档必须限制关键事件与对话记忆')
assertMatches(useNpcStore, /recentSummaries:[\s\S]*?keyEvents:[\s\S]*?\.slice\(-3\)[\s\S]*?dialogueMemories:\s*sanitizeRandomNpcDialogueMemories\(entry\.dialogueMemories,\s*3\)/, '旧日摘要读档必须只保留轻量关键事件与 3 条对话记忆')

assertBlockIncludes(useNpcStore, 'const createRandomNpcWeeklyReunionVisitors', 'Math.min(RANDOM_NPC_VISITOR_CONFIG.maxWeeklyReunionVisitors, RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)', '每周自然重逢必须同时受重逢人数和活跃短访上限约束')
assertBlockIncludes(useNpcStore, 'const createRandomNpcWeeklyReunionVisitors', 'if (visitors.length >= maxCount) break', '每周自然重逢必须达到上限即停止')
assertBlockIncludes(useNpcStore, 'const getRandomNpcWeeklyReunionArchiveCandidates', 'RANDOM_NPC_VISITOR_CONFIG.weeklyReunionCooldownDays', '旧档自然重逢必须检查冷却天数')
assertBlockIncludes(useNpcStore, 'const getRandomNpcWeeklyReunionAcquaintanceCandidates', 'RANDOM_NPC_VISITOR_CONFIG.weeklyReunionCooldownDays', '熟人自然重逢必须检查冷却天数')

assertBlockIncludes(useNpcStore, 'const getRandomNpcLongStayArchiveKind', 'RANDOM_NPC_VISITOR_CONFIG.longStayColdArchiveDays', '长住冷归档必须保留低活跃天数门槛')
assertBlockIncludes(useNpcStore, 'const getRandomNpcLongStayArchiveKind', 'relationshipLine.commitmentStatus === \'none\'', '长住冷归档不能归档已订婚 / 已婚关系')
assertBlockIncludes(useNpcStore, 'const getRandomNpcLongStayArchiveKind', 'familyLine.familyBusinessStage === 0', '长住冷归档不能归档已推进家业线')
assertBlockIncludes(useNpcStore, 'const getRandomNpcLongStayArchiveKind', 'RANDOM_NPC_VISITOR_CONFIG.longStayDeepArchiveDays', '深关系长住归档必须有更长低活跃门槛')
assertBlockIncludes(useNpcStore, 'const getRandomNpcLongStayArchiveKind', 'hasRandomNpcLockedArchiveCapacity(plannedLockedArchives)', '深关系长住归档必须预留锁定旧档名额')
assertBlockIncludes(useNpcStore, 'const archiveStaleRandomNpcAcquaintances', 'RANDOM_NPC_VISITOR_CONFIG.acquaintanceColdArchiveDays', '熟人冷归档必须保留低活跃天数门槛')
assertBlockIncludes(useNpcStore, 'const archiveStaleRandomNpcAcquaintances', 'shortRomance.status !== \'invited\'', '熟人冷归档不能归档进行中的短线暧昧邀约')

assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'completedStoryEventIds: resident.completedStoryEventIds.slice(-6)', '长住旧档快照必须裁剪完成事件 ID')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'familyTies: sanitizeRandomNpcFamilyTies', '长住旧档快照必须清洗家族节点')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'familyLine: sanitizeRandomNpcFamilyLineState', '长住旧档快照必须清洗家族线')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'relationshipLine: sanitizeRandomNpcRelationLineState', '长住旧档快照必须清洗关系线')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', 'dialogueMemories:', '长住冷归档必须生成轻量摘要对话记忆')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', '].slice(-3)', '长住冷归档摘要必须裁剪关键事件 / 对话记忆到 3 条')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', 'locked: isDeepRelationshipArchive', '深关系长住归档必须自动锁定旧档摘要')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', 'longStaySnapshot: createRandomNpcLongStayArchiveSnapshot(resident)', '长住冷归档必须写入轻量长住快照')
assertBlockIncludes(useNpcStore, 'const archiveStaleRandomNpcLongStayResidents', 'plannedLockedArchives += 1', '批量深关系长住归档必须计入锁定名额规划')
assertBlockIncludes(useNpcStore, 'const canProgressRandomNpcFestivalCompanion', 'getCurrentFestivalRecallEventName()', '长住节会同行必须读取今日节会门槛')
assertBlockIncludes(useNpcStore, 'const canProgressRandomNpcFestivalCompanion', 'resident.lastStoryDayTag === dayTag', '长住节会同行必须复用长住当日事件限制')
assertBlockIncludes(useNpcStore, 'const progressRandomNpcFestivalCompanion', 'lastStoryDayTag: dayTag', '长住节会同行成功后必须写入当日事件标记', 5200)
assertBlockIncludes(useNpcStore, 'const progressRandomNpcFestivalCompanion', 'RANDOM_NPC_LONG_STAY_DIALOGUE_MEMORY_LIMIT', '长住节会同行必须复用长住对话记忆上限', 5200)
assertBlockIncludes(useNpcStore, 'const progressRandomNpcFestivalCompanion', 'keyEvents: [...entry.keyEvents, eventLine].slice(-8)', '长住节会同行关键事件必须限长', 5200)

assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'if (!archive) return', '旧档召回必须校验摘要存在')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)', '旧档召回必须阻止重复活跃短访')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.acquaintances.some(entry => entry.visitorId === visitorId)', '旧档召回必须阻止重复熟人')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.longStayResidents.some(entry => entry.sourceVisitorId === visitorId)', '旧档召回必须阻止重复长住')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.longStayResidents.length >= RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents', '长住旧档召回必须检查长住名额')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors.length >= RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors', '短访旧档召回必须检查活跃短访名额', 4200)
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors = [visitor, ...randomNpcBoard.value.activeVisitors].slice(0, RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)', '短访旧档召回写入后仍必须裁剪活跃短访名额', 4200)
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.recentSummaries = trimRandomNpcArchives', '旧档召回后必须重新裁剪旧日摘要', 4200)
assertIncludes(useNpcStore, "const RANDOM_NPC_OLD_LETTER_RECALL_ITEM_ID = 'paper'", '旧信召回必须消耗纸张而不是新建无限信件存档')
assertBlockIncludes(useNpcStore, 'const consumeRandomNpcArchiveRecallCost', 'inventoryStore.removeItemAnywhere(RANDOM_NPC_OLD_LETTER_RECALL_ITEM_ID, RANDOM_NPC_OLD_LETTER_RECALL_ITEM_QUANTITY)', '旧信召回必须扣除背包纸张')
assertIncludes(useNpcStore, "recallRandomNpcArchive(visitorId, 'old_letter')", '旧信召回必须走同一套旧档召回容量与去重逻辑')
assertIncludes(useNpcStore, "const RANDOM_NPC_OLD_KEEPSAKE_RECALL_ITEM_ID = 'silk_ribbon'", '旧物召回必须消耗已有丝帕物品而不是新建无限信物存档')
assertBlockIncludes(useNpcStore, 'const consumeRandomNpcArchiveRecallCost', 'inventoryStore.removeItemAnywhere(RANDOM_NPC_OLD_KEEPSAKE_RECALL_ITEM_ID, RANDOM_NPC_OLD_KEEPSAKE_RECALL_ITEM_QUANTITY)', '旧物召回必须扣除背包丝帕')
assertIncludes(useNpcStore, "recallRandomNpcArchive(visitorId, 'old_keepsake')", '旧物召回必须走同一套旧档召回容量与去重逻辑')
assertIncludes(useNpcStore, "recallRandomNpcArchive(visitorId, 'festival_reunion')", '节会重逢召回必须走同一套旧档召回容量与去重逻辑')
assertBlockIncludes(useNpcStore, 'const validateRandomNpcArchiveRecallTrigger', "trigger !== 'festival_reunion'", '节会重逢召回守卫必须只限制节会触发器')
assertBlockIncludes(useNpcStore, 'const getCurrentFestivalRecallEventName', 'getTodayEvent(gameStore.season, gameStore.day, buildSeasonEventResolutionContext())', '节会重逢召回必须读取今日节会')
assertBlockIncludes(useNpcStore, 'const validateRandomNpcArchiveRecallTrigger', 'getCurrentFestivalRecallEventName()', '节会重逢召回守卫必须通过今日节会 helper 校验')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'validateRandomNpcArchiveRecallTrigger(trigger)', '旧档召回入口必须先校验节会重逢触发条件')

assertIncludes(npcView, '熟人 {{ randomNpcBoard.acquaintances.length }}/{{ randomNpcMaxAcquaintances }} · 旧档 {{ randomNpcBoard.recentSummaries.length }}/{{ randomNpcMaxRecentSummaries }} · 锁定 {{ randomNpcLockedArchiveCount }}/{{ randomNpcMaxLockedArchives }}', 'NPC 页必须展示熟人 / 旧档 / 锁定上限')
assertIncludes(npcView, '长住 {{ randomNpcBoard.longStayResidents.length }}/{{ randomNpcMaxLongStayResidents }}', 'NPC 页必须展示长住名额上限')
assertIncludes(npcView, '最多 {{ randomNpcMaxRecentSummaries }} 条，锁定 {{ randomNpcMaxLockedArchives }} 条', 'NPC 页旧档列表必须展示旧档 / 锁定上限')
assertBlockIncludes(npcView, 'const canRecallRandomNpcArchive', 'randomNpcBoard.value.longStayResidents.length < RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents', 'NPC 页长住旧档召回按钮必须读取长住名额上限')
assertBlockIncludes(npcView, 'const canRecallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors.length < RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors', 'NPC 页短访旧档召回按钮必须读取活跃短访上限')
assertIncludes(npcView, 'random-npc-archive-old-letter', 'NPC 页旧档摘要必须提供旧信召回入口')
assertIncludes(npcView, 'random-npc-archive-old-keepsake', 'NPC 页旧档摘要必须提供旧物召回入口')
assertIncludes(npcView, 'random-npc-archive-festival-reunion', 'NPC 页旧档摘要必须提供节会重逢召回入口')
assertIncludes(npcView, 'random-npc-festival-companion', 'NPC 页长住卡片必须提供节会同行入口')
assertIncludes(npcView, '今日节会同行', 'NPC 页必须展示长住节会同行说明')
assertIncludes(npcView, '旧档接续', 'NPC 页必须能读回旧档接续家庭线触发记录')
assertIncludes(npcView, '旧信消耗 {{ randomNpcOldLetterItemName }}×{{ randomNpcOldLetterCostQuantity }}；旧物消耗 {{ randomNpcOldKeepsakeItemName }}×{{ randomNpcOldKeepsakeCostQuantity }}', 'NPC 页必须展示旧信和旧物召回消耗')
assertIncludes(npcView, '节会重逢需今日有节会', 'NPC 页必须展示节会重逢召回条件')
assertIncludes(itemEncyclopedia, '随机 NPC 旧信召回：NPC 页旧日来客摘要可消耗纸张寄旧信', '百科必须能读回纸张的随机 NPC 旧信召回用途')
assertIncludes(itemEncyclopedia, "'旧信召回'", '百科搜索必须能搜到旧信召回')
assertIncludes(itemEncyclopedia, '随机 NPC 旧物召回：NPC 页旧日来客摘要可消耗丝帕托付旧物', '百科必须能读回丝帕的随机 NPC 旧物召回用途')
assertIncludes(itemEncyclopedia, "'旧物召回'", '百科搜索必须能搜到旧物召回')

assertIncludes(familyRelationGraph, 'randomNpcBoard.value.recentSummaries.filter', '家族关系图必须能展示旧日随机 NPC 摘要')
assertIncludes(familyRelationGraph, 'const snapshot = entry.longStaySnapshot', '家族关系图必须读取旧日长住轻量快照')
assertIncludes(familyRelationGraph, 'entry.dialogueMemories?.slice(-1)[0]', '家族关系图只能读回旧档最近一条对话记忆')
assertIncludes(familyRelationGraph, 'snapshot ? formatRandomNpcFamilySpecialHistory(snapshot.familyLine).replace', '家族关系图必须通过轻量快照读回旧档家族深线')

assert(!/randomNpcBoard|RandomNpc|randomNpc|longStayResidents|recentSummaries|dialogueMemories|shortRomance|longStaySnapshot/.test(onlineProfileApi), 'onlineProfileApi 不能包含随机 NPC 私密字段')
assertIncludes(useNpcStore, 'randomNpcBoard: randomNpcBoard.value', '随机 NPC 数据应只序列化进本地 NPC 存档')

assertIncludes(npcTypes, 'export interface RandomNpcRelationshipMilestoneAuditEntry', 'random NPC relationship milestones must expose structured audit entries')
for (const field of [
  'action: RandomNpcRelationshipMilestoneAuditAction',
  "source: 'local_npc_save'",
  'targetRef: string',
  'idempotencyKey: string',
  "privacyScope: 'local_save_only'",
  'relationshipMilestoneAudit: RandomNpcRelationshipMilestoneAuditEntry[]'
]) {
  assertIncludes(npcTypes, field, `random NPC relationship audit missing ${field}`)
}
assertIncludes(useNpcStore, 'const RANDOM_NPC_RELATIONSHIP_MILESTONE_AUDIT_LIMIT = 24', 'random NPC relationship audit must have a fixed 24-entry cap')
assertIncludes(useNpcStore, '.slice(-RANDOM_NPC_RELATIONSHIP_MILESTONE_AUDIT_LIMIT)', 'random NPC relationship audit must be capped on sanitize / append')
assertBlockIncludes(useNpcStore, 'const appendRandomNpcRelationshipMilestoneAudit', 'item.idempotencyKey === entry.idempotencyKey', 'random NPC relationship audit must dedupe by idempotency key')
assertBlockIncludes(useNpcStore, 'const recordRandomNpcRelationshipMilestoneAudit', "privacyScope: 'local_save_only'", 'random NPC relationship audit must stay local-save only')
assertIncludes(useNpcStore, 'relationshipMilestoneAudit: sanitizeRandomNpcRelationshipMilestoneAudit(raw.relationshipMilestoneAudit)', 'random NPC relationship audit must be sanitized on load')
for (const action of [
  'acquaintance_added',
  'long_stay_promoted',
  'long_stay_story_progressed',
  'family_tie_met',
  'family_special_event_progressed',
  'family_commission_fulfilled',
  'relation_line_started',
  'relation_line_severed',
  'relation_line_engaged',
  'relation_line_married',
  'married_life_recorded',
  'family_business_progressed',
  'child_family_influence_applied',
  'child_family_event_progressed'
]) {
  assertIncludes(useNpcStore, `action: '${action}'`, `random NPC relationship audit missing action ${action}`)
}
assertIncludes(npcView, 'random-npc-relationship-audit', 'NPC page must read back random NPC relationship audit panel')
assertIncludes(npcView, 'recentRelationshipMilestoneAuditEntries', 'NPC page must only show recent relationship audit rows')
assertIncludes(npcView, 'getRandomNpcRelationshipAuditSummary(entry)', 'NPC page relationship audit must expose player-readable summaries')
assertIncludes(npcView, 'saveStore.isBuiltInSampleRuntime', 'NPC page relationship audit technical rows must be limited to built-in sample runtime')
assertIncludes(npcView, 'random-npc-relationship-audit-technical-detail', 'NPC page relationship audit must keep technical evidence in folded details')
assertIncludes(npcView, 'entry.idempotencyKey', 'NPC page relationship audit technical detail must read back idempotency key')

assertIncludes(npcTypes, 'export interface RandomNpcGenerationAnomalyEntry', 'random NPC generation anomaly audit must expose structured entries')
for (const field of [
  'action: RandomNpcGenerationAnomalyAction',
  "source: 'local_npc_save'",
  'visitorIds: string[]',
  'templateIds: string[]',
  'observedCount: number',
  'limit: number',
  'idempotencyKey: string',
  "privacyScope: 'local_save_only'",
  'generationAnomalyAudit: RandomNpcGenerationAnomalyEntry[]'
]) {
  assertIncludes(npcTypes, field, `random NPC generation anomaly audit missing ${field}`)
}
assertIncludes(useNpcStore, 'const RANDOM_NPC_GENERATION_ANOMALY_AUDIT_LIMIT = 12', 'random NPC generation anomaly audit must have a fixed 12-entry cap')
assertIncludes(useNpcStore, 'sanitizeRandomNpcGenerationAnomalyAudit', 'random NPC generation anomaly audit must sanitize loaded rows')
assertIncludes(useNpcStore, '.slice(-RANDOM_NPC_GENERATION_ANOMALY_AUDIT_LIMIT)', 'random NPC generation anomaly audit must be capped on sanitize / append')
assertBlockIncludes(useNpcStore, 'const appendRandomNpcGenerationAnomalyAudit', 'item.idempotencyKey === entry.idempotencyKey', 'random NPC generation anomaly audit must dedupe by idempotency key')
assertBlockIncludes(useNpcStore, 'const buildRandomNpcGenerationAnomalyEntry', "privacyScope: 'local_save_only'", 'random NPC generation anomaly audit must stay local-save only')
assertIncludes(useNpcStore, 'generationAnomalyAudit: sanitizeRandomNpcGenerationAnomalyAudit', 'random NPC generation anomaly audit must be sanitized on load')
assertIncludes(useNpcStore, "action: 'active_visitor_overflow'", 'random NPC save load must audit active visitor overflow')
assertIncludes(useNpcStore, "action: 'duplicate_visitor_id'", 'random NPC save load must audit duplicate visitor ids')
assertIncludes(useNpcStore, "action: 'invalid_template_reference'", 'random NPC save load must audit invalid template references')
assertIncludes(useNpcStore, "action: 'weekly_generation_overflow'", 'random NPC weekly generation must audit generation overflow')
assertIncludes(npcView, 'random-npc-generation-anomaly-audit', 'NPC page must read back random NPC generation anomaly audit panel')
assertIncludes(npcView, 'recentGenerationAnomalyAuditEntries', 'NPC page must only show recent generation anomaly audit rows')
assertIncludes(npcView, 'getRandomNpcGenerationAnomalySummary(entry)', 'NPC page generation anomaly audit must expose player-readable summaries')
assertIncludes(npcView, 'random-npc-generation-anomaly-technical-detail', 'NPC page generation anomaly audit must keep technical evidence in folded details')

const collectFiles = async (root, extensions) => {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, extensions))
    } else if (extensions.some(extension => entry.name.endsWith(extension))) {
      files.push(absolutePath)
    }
  }
  return files
}

const publicSurfaceFiles = [
  path.join(projectRoot, 'src/utils/onlineProfileApi.ts'),
  path.join(projectRoot, 'src/utils/societyApi.ts'),
  path.join(projectRoot, 'src/utils/cohabitationApi.ts'),
  path.join(projectRoot, 'src/stores/useSocietyStore.ts'),
  path.join(projectRoot, 'src/stores/useCohabitationStore.ts'),
  path.join(projectRoot, 'src/stores/useCoopOrderStore.ts'),
  path.join(projectRoot, 'src/stores/useManorStore.ts'),
  ...await collectFiles(path.join(projectRoot, 'src/views/game/online'), ['.vue', '.ts']),
  ...await collectFiles(path.join(workspaceRoot, 'server/src'), ['.js', '.mjs', '.ts'])
]

const privateRandomNpcTokens = [
  'randomNpcBoard',
  'RandomNpc',
  'randomNpc',
  'longStayResidents',
  'recentSummaries',
  'dialogueMemories',
  'shortRomance',
  'longStaySnapshot',
  'relationshipLine',
  'familyLine'
]

for (const absolutePath of publicSurfaceFiles) {
  const source = await readFile(absolutePath, 'utf8')
  const relativePath = path.relative(workspaceRoot, absolutePath).replaceAll('\\', '/')
  for (const token of privateRandomNpcTokens) {
    assert(!source.includes(token), `${relativePath} 不能包含随机 NPC 私密字段 ${token}`)
  }
}

const saveStore = await readProjectSource('src/stores/useSaveStore.ts')
assertIncludes(saveStore, 'const SAVE_VERSION = 6', 'save migration version must advance for random NPC board preservation')
assertBlockIncludes(saveStore, 'if (next.npc && typeof next.npc === \'object\')', '...next.npc', 'save migration must preserve unknown/local NPC substates')
assertBlockIncludes(saveStore, 'if (next.npc && typeof next.npc === \'object\')', 'randomNpcBoard: next.npc.randomNpcBoard ?? undefined', 'save migration must not drop randomNpcBoard before NPC deserialize')
assertIncludes(saveStore, 'const npcStore = useNpcStore()', '保存系统必须继续通过本地 npcStore 处理 NPC 存档')
assertIncludes(saveStore, 'npc: npcStore.serialize()', '保存系统必须把随机 NPC 留在单机 npc 存档')

try {
  const serverRoutes = await readWorkspaceSource('server/src/routes/api.js')
  assert(!/randomNpcBoard|RandomNpc|randomNpc|longStaySnapshot|dialogueMemories/.test(serverRoutes), '服务端公开路由不能出现随机 NPC 私密存档字段')
} catch {
  errors.push('无法读取 server/src/routes/api.js，不能确认联机公开路由隐私边界')
}

if (errors.length > 0) {
  console.error('[qa-random-npc-save-guard] FAILED')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('[qa-random-npc-save-guard] OK')
