import type { AiAssistantContextSnapshot } from '@/types'

const DRAFT_SENSITIVE_PATTERN = /(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌|后台规则|风控|隐藏掉率|server[\\/]+src|process\.env)/i

const normalizeDraftText = (value: unknown, maxLength = 80) => {
  if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return ''
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text || DRAFT_SENSITIVE_PATTERN.test(text)) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const takeDraftList = (value: unknown, maxItems = 2, maxLength = 70) => (
  Array.isArray(value)
    ? value.map(item => normalizeDraftText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : []
)

export const buildAiAssistantLocalDraft = ({
  question,
  routeName,
  contextLabel,
  contextSnapshot,
}: {
  question: string
  routeName?: string
  contextLabel?: string
  contextSnapshot?: AiAssistantContextSnapshot
}) => {
  const normalizedQuestion = normalizeDraftText(question, 90)
  const pageLabel = normalizeDraftText(contextSnapshot?.baseState?.currentPageLabel || contextLabel || routeName || '当前页面', 40)
  const staminaLabel = normalizeDraftText(contextSnapshot?.baseState?.staminaLabel, 30)
  const moneyLabel = normalizeDraftText(contextSnapshot?.baseState?.moneyLabel, 30)
  const shortageLabels = takeDraftList(contextSnapshot?.inventory?.shortageLabels, 2, 70)
  const questBlockers = takeDraftList(contextSnapshot?.quests?.blockerLabels, 2, 70)
  const questClaimables = takeDraftList(contextSnapshot?.quests?.claimableLabels, 2, 70)
  const seasonRisks = takeDraftList(contextSnapshot?.farming?.seasonRiskLabels, 2, 70)
  const mailClaimables = takeDraftList(contextSnapshot?.online?.mailClaimableLabels, 2, 70)
  const onlineAlerts = takeDraftList(contextSnapshot?.online?.onlineAlertLabels, 2, 70)
  const weeklySummary = normalizeDraftText(contextSnapshot?.weeklyPlan?.primaryRouteSummary || contextSnapshot?.primaryRouteLabel, 90)

  const signals = [
    questBlockers.length ? `任务卡点：${questBlockers.join('；')}` : '',
    shortageLabels.length ? `资源缺口：${shortageLabels.join('；')}` : '',
    questClaimables.length ? `可领奖励：${questClaimables.join('；')}` : '',
    seasonRisks.length ? `换季风险：${seasonRisks.join('；')}` : '',
    mailClaimables.length ? `邮箱可领：${mailClaimables.join('；')}` : '',
    onlineAlerts.length ? `在线提醒：${onlineAlerts.join('；')}` : '',
    weeklySummary ? `本周路线：${weeklySummary}` : '',
  ].filter(Boolean).slice(0, 3)

  const actions = signals.length > 0
    ? signals.map(signal => `- 先处理${signal}。`)
    : [
        `- 先确认${pageLabel}当前目标，再决定是否切到任务、背包或商店页。`,
        '- 如果问题和资源或任务有关，优先查看缺口、可领取奖励和限时提醒。',
      ]

  const statusLine = [
    pageLabel ? `页面：${pageLabel}` : '',
    staminaLabel ? `体力：${staminaLabel}` : '',
    moneyLabel ? `金钱：${moneyLabel}` : '',
  ].filter(Boolean).join('；')

  return [
    '**本地草稿（内置知识库）**',
    '远程模型仍在整理，先按当前可见状态给出临时建议。',
    normalizedQuestion ? `问题：${normalizedQuestion}` : '',
    statusLine ? `状态：${statusLine}` : '',
    ...actions,
    '完整回答返回后会补充更完整的依据、步骤和安全轻动作。',
  ].filter(Boolean).join('\n')
}
