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
  'ExpeditionRoomView.vue',
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
utilitySources.set('utils/societyApi.ts', await readFile(path.join(srcRoot, 'utils', 'societyApi.ts'), 'utf8'))
utilitySources.set('utils/cohabitationApi.ts', await readFile(path.join(srcRoot, 'utils', 'cohabitationApi.ts'), 'utf8'))
utilitySources.set('stores/useCohabitationStore.ts', await readFile(path.join(srcRoot, 'stores', 'useCohabitationStore.ts'), 'utf8'))
utilitySources.set('components/game/online/VisualMapBoard.vue', await readFile(path.join(srcRoot, 'components', 'game', 'online', 'VisualMapBoard.vue'), 'utf8'))
utilitySources.set('components/game/online/VisualSceneBoard.vue', await readFile(path.join(srcRoot, 'components', 'game', 'online', 'VisualSceneBoard.vue'), 'utf8'))
utilitySources.set('components/game/online/VisualTrackBoard.vue', await readFile(path.join(srcRoot, 'components', 'game', 'online', 'VisualTrackBoard.vue'), 'utf8'))
utilitySources.set('components/game/online/OnlineVisualRoomShell.vue', await readFile(path.join(srcRoot, 'components', 'game', 'online', 'OnlineVisualRoomShell.vue'), 'utf8'))

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
expectContains('OnlineView.vue', 'online-visual-activity-group', '在线中心首页应提供可视化活动分组')
expectContains('OnlineView.vue', 'online-visual-activity-cavern', '在线中心可视化活动应提供协作矿洞入口')
expectContains('OnlineView.vue', 'online-visual-activity-lantern', '在线中心可视化活动应提供灯会现场入口')
expectContains('OnlineView.vue', 'online-visual-activity-dragon-boat', '在线中心可视化活动应提供龙舟赛道入口')
expectContains('OnlineView.vue', 'online-visual-activity-society-projects', '在线中心可视化活动应提供村社公共建设入口')
expectContains('OnlineView.vue', 'online-visual-activity-relay-orders', '在线中心可视化活动应提供公共订单接力入口')
expectContains('OnlineView.vue', 'online-visual-activity-warehouse', '在线中心可视化活动应提供村社仓廪入口')

expectContains('online/OnlineManorView.vue', '<OnlineModuleShell', '庄园子页应继续使用在线模块壳')
expectContains('online/OnlineManorView.vue', "activeTab = ref<ManorTabKey>('overview')", '庄园默认页应保持概览')
expectContains('online/OnlineManorView.vue', "activeTab === 'theme'", '庄园主题表单应留在主题标签')
expectContains('online/OnlineManorView.vue', 'online-manor-care-room-panel', '庄园照料页应提供协作护理房间入口')
expectContains('online/OnlineManorView.vue', 'online-manor-care-room-action', '庄园照料页应提供协作护理动作入口')
expectContains('online/OnlineManorView.vue', 'online-manor-care-room-records', '庄园照料页应展示协作护理记录')
expectContains('online/OnlineManorView.vue', 'online-manor-care-room-progress-summary', '庄园照料页应展示协作护理分工进度')
expectContains('online/OnlineManorView.vue', 'online-manor-care-room-risk-summary', '庄园照料页应展示协作护理顺序风险回看')
expectContains('online/OnlineManorView.vue', 'online-manor-care-room-record-settlement', '庄园照料页应展示协作护理结算凭证')
expectContains('online/OnlineManorView.vue', 'careRoomSettlementHint', '庄园协作护理房应说明结算门槛与收尾状态')
expectContains('online/OnlineManorView.vue', 'online-manor-care-readable-limits', '庄园照料页应展示每日限制与反刷窗口')
expectContains('online/OnlineManorView.vue', 'online-manor-care-failure-reason', '庄园照料页应读回失败原因')
expectContains('online/OnlineManorView.vue', 'online-manor-care-anti-abuse-summary', '庄园照料页应展示反刷审计摘要')
expectContains('online/OnlineManorView.vue', 'careReadableImpactSummary', '庄园照料规则应读回服务端落账与审计说明')
expectContains('online/OnlineManorView.vue', 'online-manor-steal-readable-limits', '庄园轻采页应展示每日限制与反刷窗口')
expectContains('online/OnlineManorView.vue', 'online-manor-steal-failure-reason', '庄园轻采页应读回失败原因')
expectContains('online/OnlineManorView.vue', 'online-manor-steal-anti-abuse-summary', '庄园轻采页应展示反刷审计摘要')
expectContains('online/OnlineManorView.vue', 'stealReadableImpactSummary', '庄园轻采规则应读回收益上限与白名单说明')
expectContains('online/OnlineManorView.vue', 'online-manor-visitor-activity-summary', '庄园来访页应展示访客行为类型汇总')
expectContains('online/OnlineManorView.vue', 'online-manor-visitor-dispute-summary', '庄园来访页应展示争议回看摘要')
expectContains('online/OnlineManorView.vue', 'visitorActivityKindBadgeClass', '庄园访客行为审计应区分来访 / 照料 / 轻采 / 护理房类型')
expectContains('utils/onlineProfileApi.ts', '/api/taoyuan/online/manor/care-rooms', '庄园 API 应接入协作护理房间创建接口')
expectContains('utils/onlineProfileApi.ts', 'submitManorCareRoomAction', '庄园 API 应导出协作护理动作方法')
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
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-farm-water', '共同农田地图应提供浇水入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-farm-cure-pests', '共同农田地图应提供除虫入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-farm-clear-weeds', '共同农田地图应提供清草入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-farm-plant', '共同农田地图应提供种植入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-farm-fertilize', '共同农田地图应提供基础施肥入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-farm-harvest', '共同农田地图应提供收获入仓入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-animals-panel', '共同庄园地图页应提供共同动物照料面板')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-animal-feed', '共同动物照料面板应提供喂食入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-animal-pet', '共同动物照料面板应提供抚摸入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-shared-animal-collect-product', '共同动物照料面板应提供产物收取入口')
expectContains('online/OnlineCohabitationView.vue', 'feedSelectedSharedAnimal', '共同动物照料面板应调用喂食动作')
expectContains('online/OnlineCohabitationView.vue', 'petSelectedSharedAnimal', '共同动物照料面板应调用抚摸动作')
expectContains('online/OnlineCohabitationView.vue', 'collectSelectedSharedAnimalProduct', '共同动物照料面板应调用产物收取动作')
expectContains('online/OnlineCohabitationView.vue', 'selectedSharedFarmPlot', '共同农田地图应支持点选地块后操作')
expectContains('stores/useCohabitationStore.ts', 'waterCohabitationSharedPlot', '共同庄园 store 应引入共同农田浇水 API')
expectContains('stores/useCohabitationStore.ts', 'careCohabitationSharedPlot', '共同庄园 store 应引入共同农田管护 API')
expectContains('stores/useCohabitationStore.ts', 'careSharedFarmPlot', '共同庄园 store 应导出共同农田管护动作')
expectContains('stores/useCohabitationStore.ts', 'plantCohabitationSharedPlot', '共同庄园 store 应引入共同农田种植 API')
expectContains('stores/useCohabitationStore.ts', 'fertilizeCohabitationSharedPlot', '共同庄园 store 应引入共同农田施肥 API')
expectContains('stores/useCohabitationStore.ts', 'fertilizeSharedFarmPlot', '共同庄园 store 应导出共同农田施肥动作')
expectContains('stores/useCohabitationStore.ts', 'harvestCohabitationSharedPlot', '共同庄园 store 应引入共同农田收获 API')
expectContains('stores/useCohabitationStore.ts', 'harvestSharedFarmPlot', '共同庄园 store 应导出共同农田收获动作')
expectContains('stores/useCohabitationStore.ts', 'fetchCohabitationSharedAnimals', '共同庄园 store 应引入共同动物快照 API')
expectContains('stores/useCohabitationStore.ts', 'feedSharedAnimal', '共同庄园 store 应导出共同动物喂食动作')
expectContains('stores/useCohabitationStore.ts', 'petSharedAnimal', '共同庄园 store 应导出共同动物抚摸动作')
expectContains('stores/useCohabitationStore.ts', 'collectSharedAnimalProduct', '共同庄园 store 应导出共同动物产物收取动作')
expectContains('utils/cohabitationApi.ts', '/shared-map/care', '共同庄园 API 应接入共同农田管护接口')
expectContains('utils/cohabitationApi.ts', '/shared-map/fertilize', '共同庄园 API 应接入共同农田施肥接口')
expectContains('utils/cohabitationApi.ts', '/shared-map/harvest', '共同庄园 API 应接入共同农田收获接口')
expectContains('utils/cohabitationApi.ts', '/shared-animals/feed', '共同庄园 API 应接入共同动物喂食接口')
expectContains('utils/cohabitationApi.ts', '/shared-animals/pet', '共同庄园 API 应接入共同动物抚摸接口')
expectContains('utils/cohabitationApi.ts', '/shared-animals/collect-product', '共同庄园 API 应接入共同动物产物收取接口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-ledger', '共同庄园建筑页应展示建筑流水')
expectContains('online/OnlineCohabitationView.vue', 'familyBuildingLedgerEntries', '共同庄园建筑页应读回建筑流水列表')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-materials-restore', '共同庄园建筑页应提供材料恢复入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-compensation-replay', '共同庄园建筑页应提供补偿重放收口入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-review', '共同庄园建筑页应提供真实拆除复核请求入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-approve', '共同庄园建筑页应提供真实拆除复核批准入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-reject', '共同庄园建筑页应提供真实拆除复核驳回入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-preview-main-state', '共同庄园建筑页应提供真实拆除个人主状态预览入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-verify-main-state-mapping', '共同庄园建筑页应提供真实拆除个人主状态映射证明入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-guard-main-state-mutation', '共同庄园建筑页应提供真实拆除个人主状态变更安全阀入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-execute-main-state-mutation', '共同庄园建筑页应提供真实拆除个人主状态执行阻断入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-bind-main-state-exact-targets', '共同庄园建筑页应提供真实拆除个人主状态精确目标绑定入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-execute-main-state-exact-targets', '共同庄园建筑页应提供真实拆除个人主状态精确执行阻断入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-resolve-main-state-exact-targets', '共同庄园建筑页应提供真实拆除个人主状态精确目标人工解析入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-real-demolition-execute-main-state-exact-mutation', '共同庄园建筑页应提供真实拆除个人主状态精确变更执行入口')
expectContains('online/OnlineCohabitationView.vue', 'online-cohabitation-building-main-state-candidate-snapshot', '共同庄园建筑页应展示个人主状态预览候选快照')
expectContains('online/OnlineCohabitationView.vue', 'formatFamilyBuildingMainStateCandidateSnapshot', '共同庄园建筑页应格式化个人主状态预览候选快照')
expectContains('online/OnlineCohabitationView.vue', 'selectFamilyBuildingMainStateCandidatePathForMapping', '共同庄园建筑页应按候选快照选择个人主状态映射默认路径')
expectContains('online/OnlineCohabitationView.vue', 'ownedCount > placedCount', '共同庄园建筑页应优先把未放置装饰余量映射到 decoration.owned')
expectContains('online/OnlineCohabitationView.vue', '装饰拥有', '共同庄园建筑页候选快照应展示装饰拥有数量')
expectContains('online/OnlineCohabitationView.vue', 'decoration.owned', '共同庄园建筑页应允许个人主状态精确变更执行未放置装饰库存窄 selector')
expectContains('online/OnlineCohabitationView.vue', 'home.caveChoice', '共同庄园建筑页应允许个人主状态精确变更执行山洞用途窄 selector')
expectContains('online/OnlineCohabitationView.vue', 'home.caveUnlocked', '共同庄园建筑页应允许个人主状态精确变更执行山洞开放态窄 selector')
expectContains('online/OnlineCohabitationView.vue', 'home.cellarSlots', '共同庄园建筑页应允许个人主状态精确变更执行酒窖陈酿槽窄 selector')
expectContains('online/OnlineCohabitationView.vue', 'home.greenhouseUnlocked', '共同庄园建筑页应允许个人主状态精确变更执行温室解锁态窄 selector')
expectContains('online/OnlineCohabitationView.vue', 'home.farmhouseLevel', '共同庄园建筑页应允许个人主状态精确变更执行农舍等级窄 selector')
expectContains('online/OnlineCohabitationView.vue', '/^[1-3]$/.test(childKey)', '共同庄园建筑页应把农舍等级精确变更限制为数字等级 selector')
expectContains('online/OnlineCohabitationView.vue', '/^\\d+$/.test(childKey)', '共同庄园建筑页应把酒窖陈酿槽精确变更限制为数字下标 selector')
expectContains('online/OnlineCohabitationView.vue', "childKey === 'true'", '共同庄园建筑页应把布尔主状态精确变更限制为 true selector')
expectContains('online/OnlineCohabitationView.vue', 'canReplayFamilyBuildingCompensation', '共同庄园建筑页应按退款和材料恢复状态禁用补偿收口')
expectContains('online/OnlineCohabitationView.vue', 'canRequestFamilyBuildingRealDemolitionReview', '共同庄园建筑页应按补偿收口和复核状态禁用真实拆除复核请求')
expectContains('online/OnlineCohabitationView.vue', 'canApproveFamilyBuildingRealDemolitionReview', '共同庄园建筑页应按待审和幂等状态禁用真实拆除复核批准')
expectContains('online/OnlineCohabitationView.vue', 'canRejectFamilyBuildingRealDemolitionReview', '共同庄园建筑页应按待审和幂等状态禁用真实拆除复核驳回')
expectContains('online/OnlineCohabitationView.vue', 'canPreviewFamilyBuildingRealDemolitionMainState', '共同庄园建筑页应按执行完成、回执和幂等状态禁用个人主状态预览')
expectContains('online/OnlineCohabitationView.vue', 'canVerifyFamilyBuildingRealDemolitionMainStateMapping', '共同庄园建筑页应按预览清单和幂等状态禁用个人主状态映射证明')
expectContains('online/OnlineCohabitationView.vue', 'canGuardFamilyBuildingRealDemolitionMainStateMutation', '共同庄园建筑页应按映射证明和幂等状态禁用个人主状态变更安全阀')
expectContains('online/OnlineCohabitationView.vue', 'canExecuteFamilyBuildingRealDemolitionMainStateMutation', '共同庄园建筑页应按安全阀和幂等状态禁用个人主状态执行阻断')
expectContains('online/OnlineCohabitationView.vue', 'canBindFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园建筑页应按执行阻断和幂等状态禁用个人主状态精确目标绑定')
expectContains('online/OnlineCohabitationView.vue', 'previewFamilyBuildingRealDemolitionMainState', '共同庄园建筑页应调用个人主状态预览 store 方法')
expectContains('online/OnlineCohabitationView.vue', 'verifyFamilyBuildingRealDemolitionMainStateMapping', '共同庄园建筑页应调用个人主状态映射证明 store 方法')
expectContains('online/OnlineCohabitationView.vue', 'guardFamilyBuildingRealDemolitionMainStateMutation', '共同庄园建筑页应调用个人主状态变更安全阀 store 方法')
expectContains('online/OnlineCohabitationView.vue', 'executeFamilyBuildingRealDemolitionMainStateMutation', '共同庄园建筑页应调用个人主状态执行阻断 store 方法')
expectContains('online/OnlineCohabitationView.vue', 'bindFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园建筑页应调用个人主状态精确目标绑定 store 方法')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_manifest_hash', '共同庄园建筑页应展示个人主状态预览 manifest hash')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_mapping_manifest_hash', '共同庄园建筑页应展示个人主状态映射证明 manifest hash')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_guard_manifest_hash', '共同庄园建筑页应展示个人主状态变更安全阀 manifest hash')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_execution_state', '共同庄园建筑页应展示个人主状态执行阻断状态')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_target_manifest_hash', '共同庄园建筑页应展示个人主状态精确目标 manifest hash')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_execution_state', '共同庄园建筑页应展示个人主状态精确执行阻断状态')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_execute_policy', '共同庄园建筑页应展示个人主状态精确执行阻断策略')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_target_resolution_policy', '共同庄园建筑页应展示个人主状态精确目标人工解析策略')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_mutation_policy', '共同庄园建筑页应展示个人主状态精确变更策略')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_mapping', '共同庄园建筑页应读回真实拆除个人主状态映射暂缓项')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_mutation_guard', '共同庄园建筑页应读回真实拆除个人主状态变更安全阀暂缓项')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_execute', '共同庄园建筑页应读回真实拆除个人主状态执行暂缓项')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_target_required', '共同庄园建筑页应读回真实拆除个人主状态精确目标待绑定暂缓项')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_execute', '共同庄园建筑页应读回真实拆除个人主状态精确执行暂缓项')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_target_manual_resolution', '共同庄园建筑页应读回真实拆除个人主状态精确目标人工解析暂缓项')
expectContains('online/OnlineCohabitationView.vue', 'real_build_demolition_main_state_exact_mutation_adapter_required', '共同庄园建筑页应读回真实拆除个人主状态变更适配器待补暂缓项')
expectContains('utils/cohabitationApi.ts', '/family-buildings/materials/restore', '共同庄园建筑 API 应接入材料恢复接口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/compensation/replay', '共同庄园建筑 API 应接入补偿重放收口接口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/request-review', '共同庄园建筑 API 应接入真实拆除复核请求接口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/approve-review', '共同庄园建筑 API 应接入真实拆除复核批准接口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/reject-review', '共同庄园建筑 API 应接入真实拆除复核驳回接口')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/preview-main-state', '共同庄园建筑 API 应接入真实拆除个人主状态预览接口')
expectContains('utils/cohabitationApi.ts', 'previewCohabitationFamilyBuildingRealDemolitionMainState', '共同庄园建筑 API 应导出个人主状态预览方法')
expectContains('utils/cohabitationApi.ts', 'candidate_snapshot', '共同庄园建筑 API 类型应包含个人主状态预览候选快照')
expectContains('utils/cohabitationApi.ts', 'ownedKeys', '共同庄园建筑 API 类型应包含装饰拥有 key 摘要')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/verify-main-state-mapping', '共同庄园建筑 API 应接入真实拆除个人主状态映射证明接口')
expectContains('utils/cohabitationApi.ts', 'verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping', '共同庄园建筑 API 应导出个人主状态映射证明方法')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/guard-main-state-mutation', '共同庄园建筑 API 应接入真实拆除个人主状态变更安全阀接口')
expectContains('utils/cohabitationApi.ts', 'guardCohabitationFamilyBuildingRealDemolitionMainStateMutation', '共同庄园建筑 API 应导出个人主状态变更安全阀方法')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/execute-main-state-mutation', '共同庄园建筑 API 应接入真实拆除个人主状态执行阻断接口')
expectContains('utils/cohabitationApi.ts', 'executeCohabitationFamilyBuildingRealDemolitionMainStateMutation', '共同庄园建筑 API 应导出个人主状态执行阻断方法')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/bind-main-state-exact-targets', '共同庄园建筑 API 应接入真实拆除个人主状态精确目标绑定接口')
expectContains('utils/cohabitationApi.ts', 'bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园建筑 API 应导出个人主状态精确目标绑定方法')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/execute-main-state-exact-targets', '共同庄园建筑 API 应接入真实拆除个人主状态精确执行阻断接口')
expectContains('utils/cohabitationApi.ts', 'executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园建筑 API 应导出个人主状态精确执行阻断方法')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/resolve-main-state-exact-targets', '共同庄园建筑 API 应接入真实拆除个人主状态精确目标人工解析接口')
expectContains('utils/cohabitationApi.ts', 'resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园建筑 API 应导出个人主状态精确目标人工解析方法')
expectContains('utils/cohabitationApi.ts', '/family-buildings/real-demolition/execute-main-state-exact-mutation', '共同庄园建筑 API 应接入真实拆除个人主状态精确变更接口')
expectContains('utils/cohabitationApi.ts', 'executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutation', '共同庄园建筑 API 应导出个人主状态精确变更方法')
expectContains('stores/useCohabitationStore.ts', 'previewCohabitationFamilyBuildingRealDemolitionMainState', '共同庄园 store 应引入个人主状态预览 API')
expectContains('stores/useCohabitationStore.ts', 'previewFamilyBuildingRealDemolitionMainState', '共同庄园 store 应导出个人主状态预览动作')
expectContains('stores/useCohabitationStore.ts', 'verifyCohabitationFamilyBuildingRealDemolitionMainStateMapping', '共同庄园 store 应引入个人主状态映射证明 API')
expectContains('stores/useCohabitationStore.ts', 'verifyFamilyBuildingRealDemolitionMainStateMapping', '共同庄园 store 应导出个人主状态映射证明动作')
expectContains('stores/useCohabitationStore.ts', 'guardCohabitationFamilyBuildingRealDemolitionMainStateMutation', '共同庄园 store 应引入个人主状态变更安全阀 API')
expectContains('stores/useCohabitationStore.ts', 'guardFamilyBuildingRealDemolitionMainStateMutation', '共同庄园 store 应导出个人主状态变更安全阀动作')
expectContains('stores/useCohabitationStore.ts', 'executeCohabitationFamilyBuildingRealDemolitionMainStateMutation', '共同庄园 store 应引入个人主状态执行阻断 API')
expectContains('stores/useCohabitationStore.ts', 'executeFamilyBuildingRealDemolitionMainStateMutation', '共同庄园 store 应导出个人主状态执行阻断动作')
expectContains('stores/useCohabitationStore.ts', 'bindCohabitationFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园 store 应引入个人主状态精确目标绑定 API')
expectContains('stores/useCohabitationStore.ts', 'bindFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园 store 应导出个人主状态精确目标绑定动作')
expectContains('stores/useCohabitationStore.ts', 'executeCohabitationFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园 store 应引入个人主状态精确执行阻断 API')
expectContains('stores/useCohabitationStore.ts', 'executeFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园 store 应导出个人主状态精确执行阻断动作')
expectContains('stores/useCohabitationStore.ts', 'resolveCohabitationFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园 store 应引入个人主状态精确目标人工解析 API')
expectContains('stores/useCohabitationStore.ts', 'resolveFamilyBuildingRealDemolitionMainStateExactTargets', '共同庄园 store 应导出个人主状态精确目标人工解析动作')
expectContains('stores/useCohabitationStore.ts', 'executeCohabitationFamilyBuildingRealDemolitionMainStateExactMutation', '共同庄园 store 应引入个人主状态精确变更 API')
expectContains('stores/useCohabitationStore.ts', 'executeFamilyBuildingRealDemolitionMainStateExactMutation', '共同庄园 store 应导出个人主状态精确变更动作')
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
expectContains('online/OnlineOrdersView.vue', 'online-orders-relay-settlement-summary', '在线委托接力单应展示服务端分账摘要')
expectContains('utils/onlineProfileApi.ts', 'OnlineCoopRelaySettlementSummary', '在线委托 API 类型应暴露接力单分账摘要')
expectContains('online/OnlineOrdersView.vue', 'useCohabitationStore', '在线委托共同基金结算应读取共同庄园契约候选')
expectContains('utils/onlineProfileApi.ts', 'reward_route', '在线委托确认交付 API 应支持结算去向参数')
expectContains('utils/onlineProfileApi.ts', 'cohabitation_contract_id', '在线委托确认交付 API 应支持共同庄园契约参数')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineOrdersView.vue', /<OnlineScrollArea/g, 5, '在线委托主要长列表应使用 OnlineScrollArea')

expectContains('online/OnlineFestivalView.vue', '<OnlineModuleShell', '节会子页应继续使用在线模块壳')
expectContains('online/OnlineFestivalView.vue', '<OnlineVisualRoomShell', '节会房间应复用统一可视化房间壳')
expectContains('online/OnlineFestivalView.vue', "return 'world'", '节会默认页应保持世界事件')
expectContains('online/OnlineFestivalView.vue', "activeTab === 'festival-room'", '节会房间表单应留在节会房间标签')
expectContains('online/OnlineFestivalView.vue', "activeTab === 'expedition-room'", '远征表单应留在远征房间标签')
expectContains('online/OnlineFestivalView.vue', '纪念记录', '节会纪念内容应保留独立入口')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineFestivalView.vue', /overflow-y-auto/g, 20, '节会长列表应保留滚动边界')

expectContains('ExpeditionRoomView.vue', '<OnlineVisualRoomShell', '远征房间应复用统一可视化房间壳')
expectContains('ExpeditionRoomView.vue', '<VisualMapBoard', '远征房间应保留协作矿洞节点图')
expectContains('ExpeditionRoomView.vue', '<VisualTrackBoard', '远征房间应保留护送轨道图')
expectContains('ExpeditionRoomView.vue', 'expedition-cavern-combo-summary', '远征矿洞应展示全部节点组合收益')
expectContains('ExpeditionRoomView.vue', 'expedition-cavern-withdrawal-summary', '远征矿洞应展示撤离点提前收尾摘要')
expectContains('ExpeditionRoomView.vue', 'expedition-cavern-receipt-combos', '远征矿洞结算凭证应回看组合收益明细')
expectContains('ExpeditionRoomView.vue', 'expedition-cavern-receipt-withdrawal', '远征矿洞结算凭证应回看提前撤离收尾')
expectContains('components/game/online/VisualMapBoard.vue', 'visual-map-readable-feedback', '地图棋盘应展示失败原因与影响范围')
expectContains('components/game/online/VisualMapBoard.vue', 'visual-map-action-result', '地图棋盘应展示每次行动结果')
expectContains('components/game/online/VisualSceneBoard.vue', 'visual-scene-readable-feedback', '场景棋盘应展示失败原因与影响范围')
expectContains('components/game/online/VisualSceneBoard.vue', 'visual-scene-action-result', '场景棋盘应展示每次行动结果')
expectContains('components/game/online/VisualTrackBoard.vue', 'visual-track-readable-feedback', '轨道棋盘应展示失败原因与影响范围')
expectContains('components/game/online/VisualTrackBoard.vue', 'visual-track-action-result', '轨道棋盘应展示每次行动结果')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'data-testid="online-visual-room-shell"', '统一可视化房间壳应提供稳定测试钩子')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'connectionState', '统一可视化房间壳应覆盖断线 / 重连 / 冲突提示')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'online-visual-room-shell-alerts', '统一可视化房间壳应收拢错误、权限不足和服务端冲突提示')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'data-testid="online-visual-room-actions"', '统一可视化房间壳应提供房间级操作插槽')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'aria-label="房间操作"', '统一可视化房间壳操作区应提供可访问分组语义')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'online-visual-room-shell-focus-guide', '统一可视化房间壳应提供键盘与焦点引导')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'aria-live', '统一可视化房间壳应把行动结果和失败原因暴露给辅助技术')
expectContains('components/game/online/OnlineVisualRoomShell.vue', '奖励预览', '统一可视化房间壳应展示奖励预览区域')
expectContains('components/game/online/OnlineVisualRoomShell.vue', 'aria-label', '统一可视化房间壳应提供可访问房间区域标签')
expectContains('ExpeditionRoomView.vue', '<template #actions>', '远征独立房间应把 ready、倒计时、断线和结算操作收进统一房间壳')
expectCountAtLeast('online/OnlineFestivalView.vue', /<template #actions>/g, 1, '在线节会房间应把 ready、倒计时、断线和结算操作收进统一房间壳')

expectContains('online/OnlineSocietyView.vue', '<OnlineModuleShell', '村社子页应继续使用在线模块壳')
expectContains('online/OnlineSocietyView.vue', "return 'overview'", '村社默认页应保持总览')
expectContains('online/OnlineSocietyView.vue', "activeTab === 'chronicles'", '村社史册应留在史册标签')
expectContains('online/OnlineSocietyView.vue', "activeTab === 'proposals'", '村社提案表单应留在提案标签')
expectContains('online/OnlineSocietyView.vue', 'online-society-warehouse-weekly-settlement', '村社仓廪应展示本周结算摘要')
expectContains('online/OnlineSocietyView.vue', 'disaster_response', '村社仓廪应展示灾害应对效果')
expectContains('online/OnlineSocietyView.vue', 'festival_cost_discount', '村社仓廪应展示节会成本下降效果')
expectContains('online/OnlineSocietyView.vue', 'public_task_bonus', '村社仓廪应展示公共任务加成效果')
expectContains('utils/societyApi.ts', 'SocietyWarehouseWeeklySettlementSnapshot', '村社 API 类型应暴露公共仓每周结算')
checkedScrollBoundaries += expectCountAtLeast('online/OnlineSocietyView.vue', /overflow-y-auto/g, 12, '村社长列表应保留滚动边界')

if (failures.length > 0) {
  console.error('在线 UI 结构静态检查失败：')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`在线 UI 结构静态检查通过：${checkedControls} 个表单控件复用 online-* 类，${checkedScrollBoundaries} 处滚动边界仍在。`)
