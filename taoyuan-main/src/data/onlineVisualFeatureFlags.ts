export type OnlineVisualFeatureFlagKey =
  | 'visual_state'
  | 'expedition_cavern'
  | 'lantern_fair'
  | 'dragon_boat'
  | 'manor_care'
  | 'manor_steal'
  | 'crop_alchemy'
  | 'crop_cooking'
  | 'crop_processing'
  | 'pet_feeding'
  | 'random_npc'
  | 'romance_system'
  | 'family_system'
  | 'child_system'
  | 'cohabitation_duo'
  | 'shared_warehouse'
  | 'shared_fund'
  | 'separation_simulation'

export type OnlineVisualFeatureFlagCategory =
  | 'global'
  | 'room'
  | 'manor'
  | 'crop'
  | 'animal'
  | 'npc'
  | 'cohabitation'

export interface OnlineVisualFeatureFlagConfig {
  key: OnlineVisualFeatureFlagKey
  label: string
  category: OnlineVisualFeatureFlagCategory
  enabledByDefault: boolean
  requires?: OnlineVisualFeatureFlagKey[]
  summary: string
  fallbackLabel: string
  fallbackRouteName: string
  fallbackTestId: string
  activeRoomClosePolicy: string
  missingConfigFallback: string
}

export type OnlineVisualFeatureFlagState = Record<OnlineVisualFeatureFlagKey, boolean>

export const ONLINE_VISUAL_FEATURE_FLAGS: OnlineVisualFeatureFlagConfig[] = [
  {
    key: 'visual_state',
    label: '可视化房间总开关',
    category: 'global',
    enabledByDefault: true,
    summary: '控制地图、场景、轨道和异步现场是否作为首选入口展示。',
    fallbackLabel: '关闭后保留备用操作面板、房间日志和文本结算入口。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-visual-state',
    activeRoomClosePolicy: '已创建活动房间继续交给服务端统一房间状态机保留倒计时、结算记录和管理回看；可视化棋盘暂停时仍可继续。',
    missingConfigFallback: '缺失配置时按关闭处理，保留备用入口、房间日志和只读回看。',
  },
  {
    key: 'expedition_cavern',
    label: '协作矿洞节点图',
    category: 'room',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制协作矿洞节点地图、撤离点、组合收益和路线回看入口。',
    fallbackLabel: '关闭后远征页保留备用行动按钮、风险资源摘要和回合日志。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-expedition-cavern',
    activeRoomClosePolicy: '已创建矿洞房继续由服务端统一房间状态机保留备用操作、撤离收尾和系统结算记录；组合收益只读回看不丢失。',
    missingConfigFallback: '缺失配置时隐藏节点地图，回退到备用行动按钮、风险资源摘要和回合日志。',
  },
  {
    key: 'lantern_fair',
    label: '灯会共建现场',
    category: 'room',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制灯会主灯、灯谜、人群、留影点和好友回看现场入口。',
    fallbackLabel: '关闭后在线节会页保留贡献按钮、压力摘要、留影记录和纪念册读回。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-lantern-fair',
    activeRoomClosePolicy: '已创建灯会房继续由服务端统一房间状态机保留贡献按钮、压力收口、留影记录和系统纪念记录。',
    missingConfigFallback: '缺失配置时隐藏现场热区，回退到贡献按钮、压力摘要和纪念册回看。',
  },
  {
    key: 'dragon_boat',
    label: '龙舟轨道竞速',
    category: 'room',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制龙舟多队轨道、名次榜、冲线状态和赛道回放。',
    fallbackLabel: '关闭后保留节会房行动按钮、赛舟分文本、名次记录和纪念记录。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-dragon-boat',
    activeRoomClosePolicy: '已创建龙舟房继续由服务端统一房间状态机保留划桨 / 稳舵 / 击鼓 / 冲刺备用操作和系统名次结算。',
    missingConfigFallback: '缺失配置时隐藏赛道轨道，回退到赛舟分、行动按钮、名次记录和纪念记录。',
  },
  {
    key: 'manor_care',
    label: '好友庄园照料',
    category: 'manor',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制好友庄园田地、果树、畜棚等可照料对象的场景化入口。',
    fallbackLabel: '关闭后庄园页保留照料列表、每日次数、主人访客记录和健康度反馈。',
    fallbackRouteName: 'online-manor',
    fallbackTestId: 'online-visual-feature-flag-manor-care',
    activeRoomClosePolicy: '已进入好友庄园时继续保留系统照料次数、访客记录和健康度反馈；场景热区暂停时仍可回看。',
    missingConfigFallback: '缺失配置时隐藏庄园场景热区，回退到照料列表、次数和访客记录。',
  },
  {
    key: 'manor_steal',
    label: '有限制偷菜',
    category: 'manor',
    enabledByDefault: true,
    summary: '控制轻采 / 偷菜热区、剩余次数、主人保护和争议记录入口。',
    fallbackLabel: '关闭后庄园页保留主人开关、访客记录、剩余上限和只读争议回看。',
    fallbackRouteName: 'online-manor',
    fallbackTestId: 'online-visual-feature-flag-manor-steal',
    activeRoomClosePolicy: '已打开轻采入口时继续由系统轻采权限、日上限、主人保留比例和争议记录收口。',
    missingConfigFallback: '缺失配置时隐藏轻采热区，回退到主人开关、剩余上限、访客记录和只读争议回看。',
  },
  {
    key: 'crop_alchemy',
    label: '作物炼丹',
    category: 'crop',
    enabledByDefault: true,
    summary: '控制作物进入丹炉、丹方权重、火候分支和成丹 / 偏丹 / 废丹 / 奇丹结果。',
    fallbackLabel: '关闭后保留作物出售、送礼、任务提交和已有丹药只读回看，不再开启新的作物丹方。',
    fallbackRouteName: 'inventory',
    fallbackTestId: 'online-visual-feature-flag-crop-alchemy',
    activeRoomClosePolicy: '已生成的丹药、当日短效和炼丹流水继续按本地存档或共同工坊记录读回；新炼丹入口柔和提示暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，只保留作物基础用途、已有丹药效果回看和炼丹流水只读记录。',
  },
  {
    key: 'crop_cooking',
    label: '作物料理',
    category: 'crop',
    enabledByDefault: true,
    summary: '控制作物料理、料理剧情触发、温和 buff 和共同灶台白名单扩展。',
    fallbackLabel: '关闭后保留基础灶台料理、已获得料理效果、送礼话题和料理记录回看。',
    fallbackRouteName: 'cooking',
    fallbackTestId: 'online-visual-feature-flag-crop-cooking',
    activeRoomClosePolicy: '已吃下的料理 buff、NPC 料理线索和共同灶台记录继续按本地存档读回；新剧情触发与新配方入口停止推进。',
    missingConfigFallback: '缺失配置时按关闭处理，灶台回退基础配方与历史料理记录，不生成新的作物料理剧情线索。',
  },
  {
    key: 'crop_processing',
    label: '作物加工',
    category: 'crop',
    enabledByDefault: true,
    summary: '控制作物加工、精加工材料、协作升品和加工产物入仓。',
    fallbackLabel: '关闭后保留基础工坊加工、既有加工产物、订单提交和仓库流水回看。',
    fallbackRouteName: 'workshop',
    fallbackTestId: 'online-visual-feature-flag-crop-processing',
    activeRoomClosePolicy: '已完成的加工产物、订单阶段和共同仓库加工记录继续按记录明细与重复提交保护收口；新深加工配方显示暂停提示。',
    missingConfigFallback: '缺失配置时按关闭处理，工坊只展示基础加工入口、既有订单用途和只读流水。',
  },
  {
    key: 'pet_feeding',
    label: '宠物喂食',
    category: 'animal',
    enabledByDefault: true,
    summary: '控制宠物特殊喂食、差异化反馈、共同宠物照料用品和最近反馈读回。',
    fallbackLabel: '关闭后保留动物页基础喂食 / 抚摸、宠物基础状态、已有反馈和照料记录。',
    fallbackRouteName: 'animal',
    fallbackTestId: 'online-visual-feature-flag-pet-feeding',
    activeRoomClosePolicy: '已写入的宠物反馈、共同宠物照料记录和补偿审计继续只读展示；新的特殊喂食入口柔和暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，回退到基础动物照料和宠物状态回看，不生成新特殊反馈。',
  },
  {
    key: 'random_npc',
    label: '随机 NPC',
    category: 'npc',
    enabledByDefault: true,
    summary: '控制随机来访、熟人册、长住名册、历史来客召回和随机 NPC 文游事件。',
    fallbackLabel: '关闭后保留固定 NPC 村民页、往日来客摘要、熟人 / 长住只读回看和容量提示。',
    fallbackRouteName: 'village',
    fallbackTestId: 'online-visual-feature-flag-random-npc',
    activeRoomClosePolicy: '已生成的短访、熟人、长住和历史记录继续保存在本地存档并按上限裁剪；新随机来访和召回入口停止生成。',
    missingConfigFallback: '缺失配置时按关闭处理，不生成新随机 NPC，只读保留本地历史记录、固定 NPC 和容量守卫提示。',
  },
  {
    key: 'romance_system',
    label: '恋爱系统',
    category: 'npc',
    enabledByDefault: true,
    summary: '控制短线暧昧、正式恋爱、婚约 / 成婚推进、知己互斥和关系里程碑。',
    fallbackLabel: '关闭后保留已有关系称谓、心事件 / 关系历史只读回看和既有村民互动。',
    fallbackRouteName: 'village',
    fallbackTestId: 'online-visual-feature-flag-romance-system',
    activeRoomClosePolicy: '已存在恋爱、婚约、婚姻或知己状态继续由本地存档读回，允许断缘 / 分居等收尾记录，不再推进新亲密阶段。',
    missingConfigFallback: '缺失配置时按关闭处理，隐藏新表白、婚约和亲密推进入口，仅保留既有关系状态与历史回看。',
  },
  {
    key: 'family_system',
    label: '家族系统',
    category: 'npc',
    enabledByDefault: true,
    summary: '控制家族节点、见家人、家族委托、家业线、家人线和关系图家族读回。',
    fallbackLabel: '关闭后保留关系图只读节点、已有家族评价 / 委托历史和本地隐私边界提示。',
    fallbackRouteName: 'village',
    fallbackTestId: 'online-visual-feature-flag-family-system',
    activeRoomClosePolicy: '已写入的家族节点、深线历史和家业记录继续按本地存档上限读回；新见家人、家族委托和高阶家族奖励暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，关系图只读展示既有家族摘要，不公开或生成新的家族线。',
  },
  {
    key: 'child_system',
    label: '孩子系统',
    category: 'npc',
    enabledByDefault: true,
    summary: '控制孩子成长、兴趣训练、家族影响、孩子事件和关系图孩子节点。',
    fallbackLabel: '关闭后保留已有孩子状态、成长记录、兴趣历史和家庭关系图只读回看。',
    fallbackRouteName: 'village',
    fallbackTestId: 'online-visual-feature-flag-child-system',
    activeRoomClosePolicy: '已存在孩子、训练兴趣和家族影响记录继续按本地存档读回；新孩子事件、奖励和兴趣推进柔和暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，隐藏新孩子事件入口，只保留现有孩子资料和历史记录。',
  },
  {
    key: 'cohabitation_duo',
    label: '双人同居',
    category: 'cohabitation',
    enabledByDefault: true,
    summary: '控制同居契约创建 / 接受、共同庄园入口、成员状态和个人资产边界说明。',
    fallbackLabel: '关闭后保留契约列表、成员状态、个人资产边界、分居入口和只读审计。',
    fallbackRouteName: 'online-cohabitation',
    fallbackTestId: 'online-visual-feature-flag-cohabitation-duo',
    activeRoomClosePolicy: '已激活共同庄园继续保留契约状态、共同地图只读摘要、成员确认记录、共同基金 / 共同仓库审计和个人资产边界；新邀请与接受入口暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，不创建新同居契约，只读保留已有契约、审计和安全退出提示。',
  },
  {
    key: 'shared_warehouse',
    label: '共同仓库',
    category: 'cohabitation',
    enabledByDefault: true,
    requires: ['cohabitation_duo'],
    summary: '控制共同仓库放入、取出、卖出、高价值草案、补偿审计和流水读回。',
    fallbackLabel: '关闭后保留仓库库存、流水、冻结草案、补偿审计和分居返还只读回看。',
    fallbackRouteName: 'online-cohabitation',
    fallbackTestId: 'online-visual-feature-flag-shared-warehouse',
    activeRoomClosePolicy: '已存在共同仓库继续由系统记录、冻结、补偿复核和重复提交保护收尾；新放入 / 出仓 / 卖出入口柔和暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，阻断新的仓库写操作，只读展示库存、流水、冻结和待补偿证据。',
  },
  {
    key: 'shared_fund',
    label: '共同基金',
    category: 'cohabitation',
    enabledByDefault: true,
    requires: ['cohabitation_duo'],
    summary: '控制共同基金注资、支出、商店购买、大额草案、退款回执和资金审计。',
    fallbackLabel: '关闭后保留余额、基金流水、未收口回执、退款记录和分居返还只读回看。',
    fallbackRouteName: 'online-cohabitation',
    fallbackTestId: 'online-visual-feature-flag-shared-fund',
    activeRoomClosePolicy: '已存在共同基金继续由系统余额、资金记录、未回执阻断和退款 / 返还重复提交保护收尾；新注资和新支出暂停。',
    missingConfigFallback: '缺失配置时按关闭处理，阻断新的基金写操作，只读展示余额、草案、回执和待返还证据。',
  },
  {
    key: 'separation_simulation',
    label: '分居演算',
    category: 'cohabitation',
    enabledByDefault: true,
    requires: ['cohabitation_duo'],
    summary: '控制分居预览、双方确认、资产返还、个人剧情记录和演出读回。',
    fallbackLabel: '关闭后保留已有分居预览、确认记录、资产清单、剧情记录和人工复核提示。',
    fallbackRouteName: 'online-cohabitation',
    fallbackTestId: 'online-visual-feature-flag-separation-simulation',
    activeRoomClosePolicy: '已生成的分居预览继续只读展示稳定校验码、确认状态、共同仓库 / 基金返还和个人资产边界；新演算显示人工复核提示。',
    missingConfigFallback: '缺失配置时按关闭处理，不启动新分居演算，只保留既有预览、复核和人工复核出口。',
  },
]

export const normalizeOnlineVisualFeatureFlagState = (
  state: Partial<Record<OnlineVisualFeatureFlagKey, boolean>> | null | undefined,
): OnlineVisualFeatureFlagState =>
  ONLINE_VISUAL_FEATURE_FLAGS.reduce((normalized, flag) => {
    normalized[flag.key] = Object.prototype.hasOwnProperty.call(state ?? {}, flag.key)
      ? state?.[flag.key] === true
      : false
    return normalized
  }, {} as OnlineVisualFeatureFlagState)

export const createOnlineVisualFeatureFlagState = (
  overrides: Partial<Record<OnlineVisualFeatureFlagKey, boolean>> = {},
): OnlineVisualFeatureFlagState =>
  ONLINE_VISUAL_FEATURE_FLAGS.reduce((state, flag) => {
    state[flag.key] = overrides[flag.key] ?? flag.enabledByDefault
    return state
  }, {} as OnlineVisualFeatureFlagState)

export const isOnlineVisualFeatureEnabled = (
  state: Partial<Record<OnlineVisualFeatureFlagKey, boolean>>,
  key: OnlineVisualFeatureFlagKey,
) => {
  const flag = ONLINE_VISUAL_FEATURE_FLAGS.find(item => item.key === key)
  if (!flag) return false
  if (state[key] !== true) return false
  return (flag.requires ?? []).every(requiredKey => state[requiredKey] === true)
}

export const ONLINE_VISUAL_SCENE_FEATURE_FLAG_KEYS: Partial<Record<string, OnlineVisualFeatureFlagKey>> = {
  expedition_cavern: 'expedition_cavern',
  lantern_fair: 'lantern_fair',
  dragon_boat: 'dragon_boat',
  manor_care: 'manor_care',
  manor_steal: 'manor_steal',
}

export const getOnlineVisualFeatureFlagConfig = (key: OnlineVisualFeatureFlagKey) =>
  ONLINE_VISUAL_FEATURE_FLAGS.find(flag => flag.key === key) ?? null

export const getOnlineVisualFeatureFlagKeyForSceneSpec = (sceneSpecId: string | undefined) =>
  sceneSpecId ? ONLINE_VISUAL_SCENE_FEATURE_FLAG_KEYS[sceneSpecId] : undefined

export const getOnlineVisualFeatureFallback = (key: OnlineVisualFeatureFlagKey) =>
  ONLINE_VISUAL_FEATURE_FLAGS.find(flag => flag.key === key)?.fallbackLabel ?? ''
