export type OnlineVisualFeatureFlagKey =
  | 'visual_state'
  | 'expedition_cavern'
  | 'lantern_fair'
  | 'dragon_boat'
  | 'manor_care'
  | 'manor_steal'

export type OnlineVisualFeatureFlagCategory = 'global' | 'room' | 'manor'

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
    fallbackLabel: '关闭后保留旧按钮面板、房间日志和文本结算入口。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-visual-state',
    activeRoomClosePolicy: '已创建活动房间继续走统一房间状态机、倒计时、结算凭证和管理重放；只降级可视化棋盘。',
    missingConfigFallback: '缺失配置时按关闭处理，保留旧入口、房间日志和只读回看。',
  },
  {
    key: 'expedition_cavern',
    label: '协作矿洞节点图',
    category: 'room',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制协作矿洞节点地图、撤离点、组合收益和路线回看入口。',
    fallbackLabel: '关闭后远征页保留旧行动按钮、风险资源摘要和回合日志。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-expedition-cavern',
    activeRoomClosePolicy: '已创建矿洞房继续允许旧按钮行动、撤离收尾和服务端统一结算凭证；组合收益只读回看不丢失。',
    missingConfigFallback: '缺失配置时隐藏节点地图，回退到旧行动按钮、风险资源摘要和回合日志。',
  },
  {
    key: 'lantern_fair',
    label: '灯会共建现场',
    category: 'room',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制灯会主灯、灯谜、人群、留影点和好友回看现场入口。',
    fallbackLabel: '关闭后在线节会页保留贡献按钮、压力摘要、留影凭证和纪念册读回。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-lantern-fair',
    activeRoomClosePolicy: '已创建灯会房继续保留贡献按钮、压力收口、留影记录和服务端纪念凭证。',
    missingConfigFallback: '缺失配置时隐藏现场热区，回退到贡献按钮、压力摘要和纪念册回看。',
  },
  {
    key: 'dragon_boat',
    label: '龙舟轨道竞速',
    category: 'room',
    enabledByDefault: true,
    requires: ['visual_state'],
    summary: '控制龙舟多队轨道、名次榜、冲线状态和赛道回放。',
    fallbackLabel: '关闭后保留节会房行动按钮、赛舟分文本、名次凭证和纪念记录。',
    fallbackRouteName: 'online-festival',
    fallbackTestId: 'online-visual-feature-flag-dragon-boat',
    activeRoomClosePolicy: '已创建龙舟房继续保留划桨 / 稳舵 / 击鼓 / 冲刺旧按钮和服务端名次结算。',
    missingConfigFallback: '缺失配置时隐藏赛道轨道，回退到赛舟分、行动按钮、名次凭证和纪念记录。',
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
    activeRoomClosePolicy: '已进入好友庄园时继续走服务端照料次数、审计、访客记录和健康度反馈；只降级场景热区。',
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
    activeRoomClosePolicy: '已打开轻采入口时继续由服务端轻采权限、日上限、主人保留比例和争议凭证收口。',
    missingConfigFallback: '缺失配置时隐藏轻采热区，回退到主人开关、剩余上限、访客记录和只读争议回看。',
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
