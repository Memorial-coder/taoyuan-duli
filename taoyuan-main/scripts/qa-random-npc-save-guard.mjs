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
  ['longStayColdArchiveDays', 56, '长住冷归档天数必须保留']
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

assertBlockIncludes(useNpcStore, 'const canArchiveRandomNpcLongStayResident', 'RANDOM_NPC_VISITOR_CONFIG.longStayColdArchiveDays', '长住冷归档必须保留低活跃天数门槛')
assertBlockIncludes(useNpcStore, 'const canArchiveRandomNpcLongStayResident', 'relationshipLine.commitmentStatus === \'none\'', '长住冷归档不能归档已订婚 / 已婚关系')
assertBlockIncludes(useNpcStore, 'const canArchiveRandomNpcLongStayResident', 'familyLine.familyBusinessStage === 0', '长住冷归档不能归档已推进家业线')
assertBlockIncludes(useNpcStore, 'const archiveStaleRandomNpcAcquaintances', 'RANDOM_NPC_VISITOR_CONFIG.acquaintanceColdArchiveDays', '熟人冷归档必须保留低活跃天数门槛')
assertBlockIncludes(useNpcStore, 'const archiveStaleRandomNpcAcquaintances', 'shortRomance.status !== \'invited\'', '熟人冷归档不能归档进行中的短线暧昧邀约')

assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'completedStoryEventIds: resident.completedStoryEventIds.slice(-6)', '长住旧档快照必须裁剪完成事件 ID')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'familyTies: sanitizeRandomNpcFamilyTies', '长住旧档快照必须清洗家族节点')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'familyLine: sanitizeRandomNpcFamilyLineState', '长住旧档快照必须清洗家族线')
assertBlockIncludes(useNpcStore, 'const createRandomNpcLongStayArchiveSnapshot', 'relationshipLine: sanitizeRandomNpcRelationLineState', '长住旧档快照必须清洗关系线')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', 'dialogueMemories:', '长住冷归档必须生成轻量摘要对话记忆')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', '].slice(-3)', '长住冷归档摘要必须裁剪关键事件 / 对话记忆到 3 条')
assertBlockIncludes(useNpcStore, 'const summarizeRandomNpcLongStayResident', 'longStaySnapshot: createRandomNpcLongStayArchiveSnapshot(resident)', '长住冷归档必须写入轻量长住快照')

assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'if (!archive) return', '旧档召回必须校验摘要存在')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors.find(entry => entry.id === visitorId)', '旧档召回必须阻止重复活跃短访')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.acquaintances.some(entry => entry.visitorId === visitorId)', '旧档召回必须阻止重复熟人')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.longStayResidents.some(entry => entry.sourceVisitorId === visitorId)', '旧档召回必须阻止重复长住')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.longStayResidents.length >= RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents', '长住旧档召回必须检查长住名额')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors.length >= RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors', '短访旧档召回必须检查活跃短访名额')
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors = [visitor, ...randomNpcBoard.value.activeVisitors].slice(0, RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors)', '短访旧档召回写入后仍必须裁剪活跃短访名额', 4200)
assertBlockIncludes(useNpcStore, 'const recallRandomNpcArchive', 'randomNpcBoard.value.recentSummaries = trimRandomNpcArchives', '旧档召回后必须重新裁剪旧日摘要', 4200)
assertIncludes(useNpcStore, "const RANDOM_NPC_OLD_LETTER_RECALL_ITEM_ID = 'paper'", '旧信召回必须消耗纸张而不是新建无限信件存档')
assertBlockIncludes(useNpcStore, 'const consumeRandomNpcArchiveRecallCost', 'inventoryStore.removeItemAnywhere(RANDOM_NPC_OLD_LETTER_RECALL_ITEM_ID, RANDOM_NPC_OLD_LETTER_RECALL_ITEM_QUANTITY)', '旧信召回必须扣除背包纸张')
assertIncludes(useNpcStore, "recallRandomNpcArchive(visitorId, 'old_letter')", '旧信召回必须走同一套旧档召回容量与去重逻辑')

assertIncludes(npcView, '熟人 {{ randomNpcBoard.acquaintances.length }}/{{ randomNpcMaxAcquaintances }} · 旧档 {{ randomNpcBoard.recentSummaries.length }}/{{ randomNpcMaxRecentSummaries }} · 锁定 {{ randomNpcLockedArchiveCount }}/{{ randomNpcMaxLockedArchives }}', 'NPC 页必须展示熟人 / 旧档 / 锁定上限')
assertIncludes(npcView, '长住 {{ randomNpcBoard.longStayResidents.length }}/{{ randomNpcMaxLongStayResidents }}', 'NPC 页必须展示长住名额上限')
assertIncludes(npcView, '最多 {{ randomNpcMaxRecentSummaries }} 条，锁定 {{ randomNpcMaxLockedArchives }} 条', 'NPC 页旧档列表必须展示旧档 / 锁定上限')
assertBlockIncludes(npcView, 'const canRecallRandomNpcArchive', 'randomNpcBoard.value.longStayResidents.length < RANDOM_NPC_VISITOR_CONFIG.maxLongStayResidents', 'NPC 页长住旧档召回按钮必须读取长住名额上限')
assertBlockIncludes(npcView, 'const canRecallRandomNpcArchive', 'randomNpcBoard.value.activeVisitors.length < RANDOM_NPC_VISITOR_CONFIG.maxActiveVisitors', 'NPC 页短访旧档召回按钮必须读取活跃短访上限')
assertIncludes(npcView, 'random-npc-archive-old-letter', 'NPC 页旧档摘要必须提供旧信召回入口')
assertIncludes(npcView, '旧信召回消耗 {{ randomNpcOldLetterItemName }}×{{ randomNpcOldLetterCostQuantity }}', 'NPC 页必须展示旧信召回消耗')
assertIncludes(itemEncyclopedia, '随机 NPC 旧信召回：NPC 页旧日来客摘要可消耗纸张寄旧信', '百科必须能读回纸张的随机 NPC 旧信召回用途')
assertIncludes(itemEncyclopedia, "'旧信召回'", '百科搜索必须能搜到旧信召回')

assertIncludes(familyRelationGraph, 'randomNpcBoard.value.recentSummaries.filter', '家族关系图必须能展示旧日随机 NPC 摘要')
assertIncludes(familyRelationGraph, 'const snapshot = entry.longStaySnapshot', '家族关系图必须读取旧日长住轻量快照')
assertIncludes(familyRelationGraph, 'entry.dialogueMemories?.slice(-1)[0]', '家族关系图只能读回旧档最近一条对话记忆')
assertIncludes(familyRelationGraph, 'snapshot ? formatRandomNpcFamilySpecialHistory(snapshot.familyLine).replace', '家族关系图必须通过轻量快照读回旧档家族深线')

assert(!/randomNpcBoard|RandomNpc|randomNpc|longStayResidents|recentSummaries|dialogueMemories|shortRomance|longStaySnapshot/.test(onlineProfileApi), 'onlineProfileApi 不能包含随机 NPC 私密字段')
assertIncludes(useNpcStore, 'randomNpcBoard: randomNpcBoard.value', '随机 NPC 数据应只序列化进本地 NPC 存档')

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
