export const AI_DYNAMIC_QUICK_QUESTION_MAX = 3

export const AI_ASSISTANT_DEFAULT_WELCOME_MESSAGE =
  '你好，我是桃源小助理。我可以结合当前页面和玩家可见状态，回答玩法目标、资源来源、任务卡点和下一步建议；回答会标明内置知识库、远程模型或 fallback 来源。严格模式下，我不会提供隐藏掉率、后台规则、密钥或刷资源方法，也不会执行存档修改、奖励发放或资源扣除。可以先点下方快捷问题开始。'

export const AI_ASSISTANT_ROUTE_LABELS = {
  menu: '主菜单',
  hall: '交流大厅',
  farm: '农场',
  animal: '畜棚与宠物',
  home: '家园',
  cottage: '小屋与家庭',
  village: '村庄与 NPC',
  npc: '村庄与 NPC',
  online: '在线事务',
  'online-manor': '在线庄园',
  'online-cohabitation': '在线同住',
  'online-neighbor': '邻里互助',
  'online-orders': '在线订单',
  'online-festival': '在线节会',
  'online-society': '在线社群',
  social: '邻里互助',
  'friend-station': '好友驿站',
  manor: '在线庄园',
  festival: '节会与房间',
  expedition: '节会远征',
  society: '在线社群',
  'expedition-room': '远征房间',
  'village-projects': '村庄建设',
  shop: '商店',
  forage: '采集',
  fishing: '钓鱼',
  mining: '矿洞',
  cooking: '烹饪',
  workshop: '作坊加工',
  processing: '作坊加工',
  upgrade: '工具升级',
  inventory: '背包',
  skills: '技能',
  achievement: '成就',
  glossary: '图鉴',
  wallet: '钱包兑换',
  quest: '任务',
  mail: '邮箱',
  charinfo: '角色信息',
  breeding: '育种',
  museum: '博物馆',
  guild: '公会',
  hanhai: '瀚海',
  'region-map': '区域地图',
  fishpond: '鱼塘',
  decoration: '装修',
} as const

type AiAssistantRouteName = keyof typeof AI_ASSISTANT_ROUTE_LABELS

export const AI_ASSISTANT_FALLBACK_QUICK_QUESTIONS = [
  '当前页面主要目标是什么？',
  '我下一步优先做什么？',
  '当前页面常见卡点怎么处理？',
]

const buildRouteQuickQuestions = (label: string) => [
  `【${label}】主要目标是什么？`,
  `我在【${label}】下一步优先做什么？`,
  `【${label}】常见卡点怎么处理？`,
]

export const AI_ASSISTANT_ROUTE_QUICK_QUESTION_CONFIG = Object.fromEntries(
  Object.entries(AI_ASSISTANT_ROUTE_LABELS).map(([routeName, label]) => [routeName, buildRouteQuickQuestions(label)])
) as Record<AiAssistantRouteName, string[]>

export const getAiAssistantRouteLabel = (routeName = '') => (
  AI_ASSISTANT_ROUTE_LABELS[routeName as AiAssistantRouteName] || ''
)

export const getConfiguredAiQuickQuestions = (routeName = '') => {
  const questions = AI_ASSISTANT_ROUTE_QUICK_QUESTION_CONFIG[routeName as AiAssistantRouteName]
  return questions?.length === AI_DYNAMIC_QUICK_QUESTION_MAX
    ? [...questions]
    : [...AI_ASSISTANT_FALLBACK_QUICK_QUESTIONS]
}

type AiQuickContextList = string[] | undefined

export interface AiDynamicQuickQuestionContext {
  baseState?: {
    stamina?: number
    maxStamina?: number
  }
  inventory?: {
    slotUsageLabel?: string
    shortageLabels?: AiQuickContextList
  }
  farming?: {
    seasonRiskLabels?: AiQuickContextList
  }
  quests?: {
    blockerLabels?: AiQuickContextList
    shortageLabels?: AiQuickContextList
  }
  online?: {
    mailboxLabel?: string
    mailClaimableLabels?: AiQuickContextList
    festivalRoomLabel?: string
    onlineAlertLabels?: AiQuickContextList
  }
}

interface AiDynamicQuickQuestionSignal {
  id: string
  priority: number
  question: string
}

const fallbackQuickQuestions = AI_ASSISTANT_FALLBACK_QUICK_QUESTIONS

const normalizeQuickText = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

const normalizeQuickList = (value: AiQuickContextList) => (
  Array.isArray(value)
    ? value.map(item => normalizeQuickText(item)).filter(Boolean)
    : []
)

const parseRatioLabel = (value = '') => {
  const match = normalizeQuickText(value).match(/(\d+)\s*\/\s*(\d+)/)
  if (!match) return null
  const current = Number.parseInt(match[1] ?? '', 10)
  const total = Number.parseInt(match[2] ?? '', 10)
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null
  return current / total
}

const looksUrgent = (value = '') => /剩|倒计时|快到期|临近|待确认|待处理|可领|待领/.test(value)

const pushSignal = (signals: AiDynamicQuickQuestionSignal[], signal: AiDynamicQuickQuestionSignal) => {
  if (signals.some(item => item.id === signal.id || item.question === signal.question)) return
  signals.push(signal)
}

export const buildDynamicAiQuickQuestions = ({
  contextSnapshot,
  defaultQuestions = fallbackQuickQuestions,
}: {
  contextSnapshot?: AiDynamicQuickQuestionContext | null
  routeName?: string
  defaultQuestions?: string[]
}) => {
  const context = contextSnapshot ?? {}
  const signals: AiDynamicQuickQuestionSignal[] = []

  const slotUsageLabel = normalizeQuickText(context.inventory?.slotUsageLabel)
  const slotRatio = parseRatioLabel(slotUsageLabel)
  if (/已满|满格|背包满/.test(slotUsageLabel) || (slotRatio !== null && slotRatio >= 0.85)) {
    pushSignal(signals, {
      id: 'bag-nearly-full',
      priority: 100,
      question: '背包快满了，先整理还是先交任务？',
    })
  }

  const questShortages = [
    ...normalizeQuickList(context.quests?.blockerLabels),
    ...normalizeQuickList(context.quests?.shortageLabels),
    ...normalizeQuickList(context.inventory?.shortageLabels),
  ]
  if (questShortages.length > 0) {
    pushSignal(signals, {
      id: 'task-shortage',
      priority: 90,
      question: '任务缺口先补什么？',
    })
  }

  const mailClaimables = normalizeQuickList(context.online?.mailClaimableLabels)
  const mailboxLabel = normalizeQuickText(context.online?.mailboxLabel)
  if (mailClaimables.length > 0 || /可领取[1-9]\d*封|可领[1-9]\d*/.test(mailboxLabel)) {
    pushSignal(signals, {
      id: 'mail-claimable',
      priority: 82,
      question: '邮箱有可领内容，先领哪些？',
    })
  }

  const onlineAlerts = [
    ...normalizeQuickList(context.online?.onlineAlertLabels),
    normalizeQuickText(context.online?.festivalRoomLabel),
  ].filter(Boolean)
  if (onlineAlerts.some(looksUrgent)) {
    pushSignal(signals, {
      id: 'event-ending',
      priority: 78,
      question: '活动快结束了，先处理什么？',
    })
  }

  if (normalizeQuickList(context.farming?.seasonRiskLabels).length > 0) {
    pushSignal(signals, {
      id: 'season-risk',
      priority: 72,
      question: '换季前哪些作物要先处理？',
    })
  }

  const stamina = Number(context.baseState?.stamina)
  const maxStamina = Number(context.baseState?.maxStamina)
  if (Number.isFinite(stamina) && Number.isFinite(maxStamina) && maxStamina > 0 && stamina / maxStamina <= 0.3) {
    pushSignal(signals, {
      id: 'stamina-low',
      priority: 60,
      question: '体力不多了，接下来做什么最稳？',
    })
  }

  return [
    ...signals.sort((a, b) => b.priority - a.priority).map(item => item.question),
    ...defaultQuestions.map(item => normalizeQuickText(item)).filter(Boolean),
    ...fallbackQuickQuestions,
  ]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, AI_DYNAMIC_QUICK_QUESTION_MAX)
}
