import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const viewRoot = path.join(repoRoot, 'src', 'views', 'game')
const srcRoot = path.join(repoRoot, 'src')

const viewFiles = [
  'OnlineView.vue',
  path.join('online', 'OnlineManorView.vue'),
  path.join('online', 'OnlineCohabitationView.vue'),
  path.join('online', 'OnlineNeighborView.vue'),
  path.join('online', 'OnlineOrdersView.vue'),
  path.join('online', 'OnlineFestivalView.vue'),
  path.join('online', 'OnlineSocietyView.vue'),
]

const expectedControlClass = {
  input: 'online-input',
  select: 'online-select',
  textarea: 'online-textarea',
}

const files = new Map()
const utilitySources = new Map()
const failures = []
let checkedControls = 0
let checkedScrollBoundaries = 0

const addFailure = (file, message) => {
  failures.push(`${file}: ${message}`)
}

for (const relativePath of viewFiles) {
  const absolutePath = path.join(viewRoot, relativePath)
  files.set(relativePath.replaceAll('\\', '/'), await readFile(absolutePath, 'utf8'))
}

utilitySources.set('utils/onlineProfileApi.ts', await readFile(path.join(srcRoot, 'utils', 'onlineProfileApi.ts'), 'utf8'))
utilitySources.set('utils/cohabitationApi.ts', await readFile(path.join(srcRoot, 'utils', 'cohabitationApi.ts'), 'utf8'))

const getFile = (relativePath) => files.get(relativePath) ?? utilitySources.get(relativePath) ?? ''

const expectContains = (relativePath, needle, message) => {
  if (!getFile(relativePath).includes(needle)) {
    addFailure(relativePath, message)
  }
}

const expectCountAtLeast = (relativePath, pattern, minCount, message) => {
  const source = getFile(relativePath)
  const count = source.match(pattern)?.length ?? 0
  if (count < minCount) {
    addFailure(relativePath, `${message}，当前 ${count}，期望至少 ${minCount}`)
  }
  return count
}

for (const [relativePath, source] of files.entries()) {
  for (const [tagName, expectedClass] of Object.entries(expectedControlClass)) {
    const tagPattern = new RegExp(`<${tagName}\\b(?:"[^"]*"|'[^']*'|[^'">])*>`, 'gis')
    const tags = source.match(tagPattern) ?? []
    for (const tag of tags) {
      const classMatch = tag.match(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i)
      const classValue = classMatch?.[2] ?? ''
      const isHiddenFileInput = tagName === 'input' && /\btype\s*=\s*(["'])file\1/i.test(tag) && /\bhidden\b/.test(classValue)
      if (isHiddenFileInput) continue
      checkedControls += 1
      if (!classValue.includes(expectedClass)) {
        addFailure(relativePath, `${tagName} 控件没有复用 ${expectedClass}`)
      }
    }
  }
}

expectContains('OnlineView.vue', '<OnlineModuleCard', '在线中心首页应继续使用模块卡组件')
expectContains('OnlineView.vue', "routeName: 'online-cohabitation'", '在线中心首页应提供共同庄园入口')

expectContains('online/OnlineManorView.vue', '<OnlineModuleShell', '庄园子页应继续使用在线模块壳')
expectContains('online/OnlineManorView.vue', "activeTab = ref<ManorTabKey>('overview')", '庄园默认页应保持概览')
expectContains('online/OnlineManorView.vue', "activeTab === 'theme'", '庄园主题表单应留在主题标签')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineManorView.vue', /overflow-y-auto/g, 3, '庄园长列表应保留滚动边界')

expectContains('online/OnlineCohabitationView.vue', '<OnlineModuleShell', '共同庄园子页应继续使用在线模块壳')
expectContains('online/OnlineCohabitationView.vue', "activeTab = ref<CohabitationTabKey>('overview')", '共同庄园默认页应保持总览')
expectContains('online/OnlineCohabitationView.vue', "activeTab === 'map'", '共同庄园应提供共同农田地图标签')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-contract-create-submit', '共同庄园总览应保留发起契约入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-separation-preview-submit', '共同庄园总览应保留分居预览入口')
expectContains('online/OnlineCohabitationView.vue', 'shop:seed_radish', '共同基金前端应保留萝卜种子白名单购买入口')
expectContains('online/OnlineCohabitationView.vue', 'shop:seed_rice', '共同基金前端应保留水稻种子白名单购买入口')
expectContains('online/OnlineCohabitationView.vue', 'processing_materials', '共同基金前端应提供中额加工材料预算入口')
expectContains('online/OnlineCohabitationView.vue', 'building_materials', '共同基金前端应提供中额建材预算入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-fund-large-draft-submit', '共同基金前端应提供大额草案创建入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-fund-large-draft-execute', '共同基金前端应提供大额草案执行扣款入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-ledger', '共同庄园建筑页应展示建筑流水')
expectContains('online/OnlineCohabitationView.vue', 'familyBuildingLedgerEntries', '共同庄园建筑页应读回建筑流水列表')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-materials-restore', '共同庄园建筑页应提供材料恢复入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-compensation-replay', '共同庄园建筑页应提供补偿重放收口入口')
expectContains('online/OnlineCohabitationView.vue', 'canReplayFamilyBuildingCompensation', '共同庄园建筑页应按退款和材料恢复状态禁用补偿收口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/materials/restore', '共同庄园建筑 API 应接入材料恢复接口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/compensation/replay', '共同庄园建筑 API 应接入补偿重放收口接口')
expectContains('utils/cohabitationApi.ts', 'construction_ledger', '共同庄园建筑 API 类型应包含建筑流水')
expectContains('utils/cohabitationApi.ts', 'CohabitationFamilyBuildingLedgerEntry', '共同庄园建筑 API 类型应声明建筑流水条目')
expectContains('utils/cohabitationApi.ts', '/fund/large-spend-draft', '共同基金 API 应接入大额草案创建接口')
expectContains('utils/cohabitationApi.ts', 'executeCohabitationFundLargeSpendDraft', '共同基金 API 应接入大额草案执行接口')
expectContains('online/OnlineCohabitationView.vue', 'spend_medium', '共同庄园权限面板应提供中额基金开关')
expectContains('online/OnlineCohabitationView.vue', '个人铜币不合并', '共同庄园入口应显示个人铜币不合并边界')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineCohabitationView.vue', /overflow-y-auto/g, 8, '共同庄园长列表应保留滚动边界')

expectContains('online/OnlineNeighborView.vue', '<OnlineModuleShell', '邻里子页应继续使用在线模块壳')
expectContains('online/OnlineNeighborView.vue', "activeTab = ref<NeighborTabKey>('profile')", '邻里默认页应保持名片')
expectContains('online/OnlineNeighborView.vue', '<details class="game-panel-muted p-3">', '邻里史册、荣誉和纪念内容应默认折叠')
expectContains('online/OnlineNeighborView.vue', '展示档案', '邻里历史类内容应收进展示档案')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineNeighborView.vue', /overflow-y-auto/g, 5, '邻里长列表应保留滚动边界')

expectContains('online/OnlineOrdersView.vue', '<OnlineModuleShell', '委托子页应继续使用在线模块壳')
expectContains('online/OnlineOrdersView.vue', "const defaultTab = tabs[1]!", '在线委托默认页应保持可接列表')
expectContains('online/OnlineOrdersView.vue', "activeTab === 'publish'", '在线委托发布表单应留在发布标签')
expectContains('online/OnlineOrdersView.vue', 'online-orders-settlement-route-select', '在线委托确认交付应保留结算去向选择')
expectContains('online/OnlineOrdersView.vue', 'online-orders-settlement-contract-select', '在线委托共同基金结算应选择共同庄园契约')
expectContains('online/OnlineOrdersView.vue', 'useCohabitationStore', '在线委托共同基金结算应读取共同庄园契约候选')
expectContains('utils/onlineProfileApi.ts', 'reward_route', '在线委托确认交付 API 应支持结算去向参数')
expectContains('utils/onlineProfileApi.ts', 'cohabitation_contract_id', '在线委托确认交付 API 应支持共同庄园契约参数')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineOrdersView.vue', /<OnlineScrollArea/g, 5, '在线委托主要长列表应使用 OnlineScrollArea')

expectContains('online/OnlineFestivalView.vue', '<OnlineModuleShell', '节会子页应继续使用在线模块壳')
expectContains('online/OnlineFestivalView.vue', "return 'world'", '节会默认页应保持世界事件')
expectContains('online/OnlineFestivalView.vue', "activeTab === 'festival-room'", '节会房间表单应留在节会房间标签')
expectContains('online/OnlineFestivalView.vue', "activeTab === 'expedition-room'", '远征表单应留在远征房间标签')
expectContains('online/OnlineFestivalView.vue', '纪念记录', '节会纪念内容应保留独立入口')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineFestivalView.vue', /overflow-y-auto/g, 20, '节会长列表应保留滚动边界')

expectContains('online/OnlineSocietyView.vue', '<OnlineModuleShell', '村社子页应继续使用在线模块壳')
expectContains('online/OnlineSocietyView.vue', "return 'overview'", '村社默认页应保持总览')
expectContains('online/OnlineSocietyView.vue', "activeTab === 'chronicles'", '村社史册应留在史册标签')
expectContains('online/OnlineSocietyView.vue', "activeTab === 'proposals'", '村社提案表单应留在提案标签')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineSocietyView.vue', /overflow-y-auto/g, 12, '村社长列表应保留滚动边界')

if (failures.length > 0) {
  console.error('在线 UI 结构静态检查失败：')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`在线 UI 结构静态检查通过：${checkedControls} 个表单控件复用 online-* 类，${checkedScrollBoundaries} 处滚动边界仍在。`)
