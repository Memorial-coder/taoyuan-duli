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
  },
]

export const createOnlineVisualFeatureFlagState = (
  overrides: Partial<Record<OnlineVisualFeatureFlagKey, boolean>> = {},
): OnlineVisualFeatureFlagState =>
  ONLINE_VISUAL_FEATURE_FLAGS.reduce((state, flag) => {
    state[flag.key] = overrides[flag.key] ?? flag.enabledByDefault
    return state
  }, {} as OnlineVisualFeatureFlagState)

export const isOnlineVisualFeatureEnabled = (
  state: OnlineVisualFeatureFlagState,
  key: OnlineVisualFeatureFlagKey,
) => {
  const flag = ONLINE_VISUAL_FEATURE_FLAGS.find(item => item.key === key)
  if (!flag) return false
  if (!state[key]) return false
  return (flag.requires ?? []).every(requiredKey => state[requiredKey])
}

export const getOnlineVisualFeatureFallback = (key: OnlineVisualFeatureFlagKey) =>
  ONLINE_VISUAL_FEATURE_FLAGS.find(flag => flag.key === key)?.fallbackLabel ?? ''
