export type AiAssistantPendingStageId =
  | 'understanding'
  | 'reading_context'
  | 'matching_knowledge'
  | 'retrieving'
  | 'organizing'
  | 'model_slow'
  | 'fallback_ready'
  | 'local_slow'
  | 'local_fallback'

export interface AiAssistantPendingStage {
  id: AiAssistantPendingStageId
  minMs: number
  label: string
  detail: string
}

export interface AiAssistantPendingStageOptions {
  providerConfigured?: boolean
}

export const AI_ASSISTANT_PENDING_STAGE_SEQUENCE: AiAssistantPendingStage[] = [
  {
    id: 'understanding',
    minMs: 0,
    label: '正在理解问题',
    detail: '识别资源、任务、页面和风险信号。',
  },
  {
    id: 'reading_context',
    minMs: 1200,
    label: '正在读取当前页面和任务状态',
    detail: '只使用玩家可见的只读摘要。',
  },
  {
    id: 'matching_knowledge',
    minMs: 2400,
    label: '正在匹配知识库',
    detail: '查找本地规则、结构化知识和来源依据。',
  },
  {
    id: 'retrieving',
    minMs: 3000,
    label: '正在检索相关资料',
    detail: '问题较复杂，继续收集可用依据。',
  },
  {
    id: 'organizing',
    minMs: 5200,
    label: '正在整理建议',
    detail: '把命中内容整理成结论、步骤和安全轻动作。',
  },
  {
    id: 'model_slow',
    minMs: 8000,
    label: '远程模型响应较慢',
    detail: '准备在超时后使用内置知识库 fallback。',
  },
  {
    id: 'fallback_ready',
    minMs: 12000,
    label: '正在准备 fallback',
    detail: '若远程模型超时，将自动切换到内置知识库 fallback 回答。',
  },
]

const LOCAL_SLOW_STAGE: AiAssistantPendingStage = {
  id: 'local_slow',
  minMs: 8000,
  label: '内置知识库仍在整理',
  detail: '正在收束可执行建议，不会读取源码或后台规则。',
}

const LOCAL_FALLBACK_STAGE: AiAssistantPendingStage = {
  id: 'local_fallback',
  minMs: 12000,
  label: '正在收束本地回答',
  detail: '继续使用内置知识库整理答案和安全轻动作。',
}

export const getAiAssistantPendingStage = (
  elapsedMs: number,
  options: AiAssistantPendingStageOptions = {},
): AiAssistantPendingStage => {
  const safeElapsedMs = Math.max(0, Math.floor(Number(elapsedMs) || 0))
  const providerConfigured = options.providerConfigured === true
  if (!providerConfigured && safeElapsedMs >= LOCAL_FALLBACK_STAGE.minMs) return LOCAL_FALLBACK_STAGE
  if (!providerConfigured && safeElapsedMs >= LOCAL_SLOW_STAGE.minMs) return LOCAL_SLOW_STAGE
  let selectedStage = AI_ASSISTANT_PENDING_STAGE_SEQUENCE[0]!
  for (const stage of AI_ASSISTANT_PENDING_STAGE_SEQUENCE) {
    if (safeElapsedMs >= stage.minMs) selectedStage = stage
  }
  return selectedStage
}
