import type {
  AiAssistantAdminConfig,
  AiAssistantAskResult,
  AiAssistantContextSnapshot,
  AiNounLexiconStatus,
  AiAssistantPublicConfig,
  AiKnowledgeEntry,
  OfficialManagedConfigKey,
  OfficialManagedConfigStatus,
  AiSourceIndexStatus,
  AiSourceDraftResult,
  AiSourceSnippet,
} from '@/types'

const defaultConsoleCreditMessage =
  '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186'

export const CONSOLE_CREDIT_UPDATED_EVENT = 'taoyuan-console-credit-updated'

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

const getAdminToken = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('admin_token') || ''
}

export const verifyAiAssistantAdminAccess = async (): Promise<boolean> => {
  const token = getAdminToken()
  if (!token) return false

  const res = await fetch('/api/admin/me', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': token,
    },
  })
  const data = await parseJsonSafe(res)
  return !!(res.ok && data?.ok && (data?.role === 'super_admin' || data?.permissions?.view_audit_logs === true))
}

const mapPublicConfig = (data: any): AiAssistantPublicConfig => ({
  enabled: data?.enabled !== false,
  mode: data?.mode === 'standard' ? 'standard' : 'strict',
  assistantName: String(data?.assistantName || data?.assistant_name || '桃源小助理'),
  welcomeMessage: String(data?.welcomeMessage || data?.welcome_message || '你好，我是桃源小助理。'),
  consoleCreditMessage: String(data?.consoleCreditMessage || data?.console_credit_message || defaultConsoleCreditMessage),
  providerConfigured: data?.providerConfigured === true || data?.provider_configured === true,
})

const mapOfficialManagedStatus = (data: any): OfficialManagedConfigStatus | undefined => {
  const source = String(data?.source || '').trim()
  if (!['official_live', 'official_cached', 'local_default'].includes(source)) return undefined
  return {
    enabled: data?.enabled === true,
    configured: data?.configured === true,
    source: source as OfficialManagedConfigStatus['source'],
    profileId: String(data?.profileId || data?.profile_id || ''),
    version: String(data?.version || ''),
    issuedAt: Number(data?.issuedAt || data?.issued_at) || 0,
    expiresAt: Number(data?.expiresAt || data?.expires_at) || 0,
    lastFetchedAt: Number(data?.lastFetchedAt || data?.last_fetched_at) || 0,
    lastVerifiedAt: Number(data?.lastVerifiedAt || data?.last_verified_at) || 0,
    lastError: String(data?.lastError || data?.last_error || ''),
    managedKeys: Array.isArray(data?.managedKeys)
      ? data.managedKeys.map((item: unknown) => String(item) as OfficialManagedConfigKey)
      : Array.isArray(data?.managed_keys)
        ? data.managed_keys.map((item: unknown) => String(item) as OfficialManagedConfigKey)
        : [],
  }
}

const mapAdminConfig = (data: any): AiAssistantAdminConfig => ({
  ...mapPublicConfig(data),
  sourceReadEnabled: data?.sourceReadEnabled === true || data?.source_read_enabled === true,
  sourceIngestEnabled: data?.sourceIngestEnabled === true || data?.source_ingest_enabled === true,
  sourceIndexStatus: data?.sourceIndexStatus || data?.source_index_status
    ? {
        version: Number(data?.sourceIndexStatus?.version ?? data?.source_index_status?.version) || 0,
        builtAt: Number(data?.sourceIndexStatus?.builtAt ?? data?.source_index_status?.built_at ?? data?.source_index_status?.builtAt) || 0,
        fileCount: Number(data?.sourceIndexStatus?.fileCount ?? data?.source_index_status?.file_count ?? data?.source_index_status?.fileCount) || 0,
        entryCount: Number(data?.sourceIndexStatus?.entryCount ?? data?.source_index_status?.entry_count ?? data?.source_index_status?.entryCount) || 0,
        symbolCount: Number(data?.sourceIndexStatus?.symbolCount ?? data?.source_index_status?.symbol_count ?? data?.source_index_status?.symbolCount) || 0,
        ready: data?.sourceIndexStatus?.ready === true || data?.source_index_status?.ready === true,
      }
    : undefined,
  nounLexiconStatus: data?.nounLexiconStatus || data?.noun_lexicon_status
    ? {
        version: Number(data?.nounLexiconStatus?.version ?? data?.noun_lexicon_status?.version) || 0,
        builtAt: Number(data?.nounLexiconStatus?.builtAt ?? data?.noun_lexicon_status?.built_at ?? data?.noun_lexicon_status?.builtAt) || 0,
        fileCount: Number(data?.nounLexiconStatus?.fileCount ?? data?.noun_lexicon_status?.file_count ?? data?.noun_lexicon_status?.fileCount) || 0,
        entryCount: Number(data?.nounLexiconStatus?.entryCount ?? data?.noun_lexicon_status?.entry_count ?? data?.noun_lexicon_status?.entryCount) || 0,
        ready: data?.nounLexiconStatus?.ready === true || data?.noun_lexicon_status?.ready === true,
      }
    : undefined,
  apiUrl: String(data?.apiUrl || data?.api_url || ''),
  apiKey: String(data?.apiKey || data?.api_key || ''),
  model: String(data?.model || ''),
  temperature: Number.isFinite(Number(data?.temperature)) ? Number(data?.temperature) : 0.2,
  systemPrompt: String(data?.systemPrompt || data?.system_prompt || ''),
  blockedTopics: String(data?.blockedTopics || data?.blocked_topics || ''),
  officialManagedStatus: mapOfficialManagedStatus(data?.officialManagedStatus || data?.official_managed_status),
  readonlyManagedFields: Array.isArray(data?.readonlyManagedFields)
    ? data.readonlyManagedFields.map((item: unknown) => String(item) as OfficialManagedConfigKey)
    : Array.isArray(data?.readonly_managed_fields)
      ? data.readonly_managed_fields.map((item: unknown) => String(item) as OfficialManagedConfigKey)
      : [],
})

const mapKnowledgeEntry = (data: any): AiKnowledgeEntry => ({
  id: String(data?.id || ''),
  title: String(data?.title || ''),
  routeNames: Array.isArray(data?.routeNames)
    ? data.routeNames.map((item: unknown) => String(item))
    : Array.isArray(data?.route_names)
      ? data.route_names.map((item: unknown) => String(item))
      : [],
  keywords: Array.isArray(data?.keywords) ? data.keywords.map((item: unknown) => String(item)) : [],
  content: String(data?.content || ''),
  access: data?.access === 'standard' ? 'standard' : 'public',
  enabled: data?.enabled !== false,
  readonly: data?.readonly === true,
  sourceType: String(data?.sourceType || data?.source_type || 'manual'),
  sourceRefs: Array.isArray(data?.sourceRefs)
    ? data.sourceRefs.map((item: unknown) => String(item))
    : Array.isArray(data?.source_refs)
      ? data.source_refs.map((item: unknown) => String(item))
      : [],
  reviewStatus: ['draft', 'published', 'archived'].includes(String(data?.reviewStatus || data?.review_status))
    ? String(data?.reviewStatus || data?.review_status) as AiKnowledgeEntry['reviewStatus']
    : 'draft',
  createdAt: Number(data?.createdAt || data?.created_at) || 0,
  updatedAt: Number(data?.updatedAt || data?.updated_at) || 0,
  metadata: data?.metadata && typeof data.metadata === 'object' ? data.metadata : undefined,
})

const mapSourceSnippet = (data: any): AiSourceSnippet => ({
  path: String(data?.path || ''),
  snippet: String(data?.snippet || ''),
  summary: String(data?.summary || ''),
  score: Number(data?.score) || 0,
})

const mapSourceIndexStatus = (data: any): AiSourceIndexStatus => ({
  version: Number(data?.version) || 0,
  builtAt: Number(data?.builtAt || data?.built_at) || 0,
  fileCount: Number(data?.fileCount || data?.file_count) || 0,
  entryCount: Number(data?.entryCount || data?.entry_count) || 0,
  symbolCount: Number(data?.symbolCount || data?.symbol_count) || 0,
  ready: data?.ready === true,
})

const mapNounLexiconStatus = (data: any): AiNounLexiconStatus => ({
  version: Number(data?.version) || 0,
  builtAt: Number(data?.builtAt || data?.built_at) || 0,
  fileCount: Number(data?.fileCount || data?.file_count) || 0,
  entryCount: Number(data?.entryCount || data?.entry_count) || 0,
  ready: data?.ready === true,
})

export const fetchAiAssistantConfig = async (): Promise<AiAssistantPublicConfig> => {
  let res: Response
  try {
    res = await fetch('/api/taoyuan/ai/config', { credentials: 'include' })
  } catch {
    throw new Error('AI 助手连接失败，请检查网络后再试')
  }
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.config) {
    throw new Error(data?.msg || '获取 AI 助手配置失败')
  }
  return mapPublicConfig(data.config)
}

export const askAiAssistant = async (payload: {
  question: string
  routeName?: string
  contextLabel?: string
  contextSnapshot?: AiAssistantContextSnapshot
}): Promise<AiAssistantAskResult> => {
  let res: Response
  try {
    res = await fetch('/api/taoyuan/ai/ask', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: payload.question,
        route_name: payload.routeName,
        context_label: payload.contextLabel,
        context_snapshot: payload.contextSnapshot,
      }),
    })
  } catch {
    throw new Error('AI 助手连接失败，请检查网络后再试')
  }
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || 'AI 助手暂时不可用')
  }
  return {
    answer: String(data.answer || ''),
    sources: Array.isArray(data.sources) ? data.sources.map((item: unknown) => String(item)) : [],
    mode: data.mode === 'standard' ? 'standard' : 'strict',
    provider: data.provider || 'local',
    trace: data.trace,
  }
}

export const askAiAssistantDebug = async (payload: {
  question: string
  routeName?: string
  contextLabel?: string
  contextSnapshot?: AiAssistantContextSnapshot
}): Promise<AiAssistantAskResult> => {
  const res = await fetch('/api/admin/taoyuan/ai/ask-debug', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify({
      question: payload.question,
      route_name: payload.routeName,
      context_label: payload.contextLabel,
      context_snapshot: payload.contextSnapshot,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || 'AI 调试问答失败')
  }
  return {
    answer: String(data.answer || ''),
    sources: Array.isArray(data.sources) ? data.sources.map((item: unknown) => String(item)) : [],
    mode: data.mode === 'standard' ? 'standard' : 'strict',
    provider: data.provider || 'local',
    trace: data.trace,
  }
}

export const fetchAiAssistantAdminConfig = async (): Promise<AiAssistantAdminConfig> => {
  const token = getAdminToken()
  if (!token) throw new Error('请先以管理员身份登录后台')

  const res = await fetch('/api/admin/taoyuan/ai/config', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': token,
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.config) {
    throw new Error(data?.msg || '获取 AI 管理配置失败')
  }
  return mapAdminConfig(data.config)
}

export const saveAiAssistantAdminConfig = async (config: AiAssistantAdminConfig): Promise<AiAssistantAdminConfig> => {
  const token = getAdminToken()
  if (!token) throw new Error('请先以管理员身份登录后台')

  const res = await fetch('/api/admin/taoyuan/ai/config', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
    body: JSON.stringify({
      enabled: config.enabled,
      mode: config.mode,
      sourceReadEnabled: config.sourceReadEnabled,
      sourceIngestEnabled: config.sourceIngestEnabled,
      assistantName: config.assistantName,
      welcomeMessage: config.welcomeMessage,
      consoleCreditMessage: config.consoleCreditMessage,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature,
      systemPrompt: config.systemPrompt,
      blockedTopics: config.blockedTopics,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.config) {
    throw new Error(data?.msg || '保存 AI 管理配置失败')
  }
  const savedConfig = mapAdminConfig(data.config)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CONSOLE_CREDIT_UPDATED_EVENT, {
        detail: {
          message: savedConfig.consoleCreditMessage,
        },
      })
    )
  }
  return savedConfig
}

export const fetchAiSourceIndexStatus = async (): Promise<AiSourceIndexStatus> => {
  const res = await fetch('/api/admin/taoyuan/ai/source-index', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '获取源码索引状态失败')
  }
  return mapSourceIndexStatus(data.status)
}

export const rebuildAiSourceIndex = async (): Promise<AiSourceIndexStatus> => {
  const res = await fetch('/api/admin/taoyuan/ai/source-index/rebuild', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '重建源码索引失败')
  }
  return mapSourceIndexStatus(data.status)
}

export const fetchAiNounLexiconStatus = async (): Promise<AiNounLexiconStatus> => {
  const res = await fetch('/api/admin/taoyuan/ai/noun-lexicon', {
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '获取名词词典状态失败')
  }
  return mapNounLexiconStatus(data.status)
}

export const rebuildAiNounLexicon = async (): Promise<AiNounLexiconStatus> => {
  const res = await fetch('/api/admin/taoyuan/ai/noun-lexicon/rebuild', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.status) {
    throw new Error(data?.msg || '重建名词词典失败')
  }
  return mapNounLexiconStatus(data.status)
}

const getAdminHeaders = () => {
  const token = getAdminToken()
  if (!token) throw new Error('请先以管理员身份登录后台')
  return {
    'Content-Type': 'application/json',
    'X-Admin-Token': token,
  }
}

export const fetchAiKnowledgeEntries = async (params: {
  keyword?: string
  reviewStatus?: string
  sourceType?: string
} = {}): Promise<AiKnowledgeEntry[]> => {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.reviewStatus) query.set('review_status', params.reviewStatus)
  if (params.sourceType) query.set('source_type', params.sourceType)

  const res = await fetch(`/api/admin/taoyuan/ai/knowledge${query.toString() ? `?${query.toString()}` : ''}`, {
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '获取知识库列表失败')
  }
  return Array.isArray(data.entries) ? data.entries.map(mapKnowledgeEntry) : []
}

export const createAiKnowledgeEntry = async (entry: Partial<AiKnowledgeEntry>): Promise<AiKnowledgeEntry> => {
  const res = await fetch('/api/admin/taoyuan/ai/knowledge', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify({
      title: entry.title,
      route_names: entry.routeNames,
      keywords: entry.keywords,
      content: entry.content,
      access: entry.access,
      enabled: entry.enabled,
      source_type: entry.sourceType,
      source_refs: entry.sourceRefs,
      review_status: entry.reviewStatus,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.entry) {
    throw new Error(data?.msg || '创建知识条目失败')
  }
  return mapKnowledgeEntry(data.entry)
}

export const updateAiKnowledgeEntry = async (id: string, entry: Partial<AiKnowledgeEntry>): Promise<AiKnowledgeEntry> => {
  const res = await fetch(`/api/admin/taoyuan/ai/knowledge/${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify({
      title: entry.title,
      route_names: entry.routeNames,
      keywords: entry.keywords,
      content: entry.content,
      access: entry.access,
      enabled: entry.enabled,
      source_type: entry.sourceType,
      source_refs: entry.sourceRefs,
      review_status: entry.reviewStatus,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.entry) {
    throw new Error(data?.msg || '更新知识条目失败')
  }
  return mapKnowledgeEntry(data.entry)
}

export const deleteAiKnowledgeEntry = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/taoyuan/ai/knowledge/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '删除知识条目失败')
  }
}

export const publishAiKnowledgeEntry = async (id: string): Promise<AiKnowledgeEntry> => {
  const res = await fetch(`/api/admin/taoyuan/ai/knowledge/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Admin-Token': getAdminToken(),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok || !data?.entry) {
    throw new Error(data?.msg || '发布知识条目失败')
  }
  return mapKnowledgeEntry(data.entry)
}

export const generateAiKnowledgeSourceDraft = async (payload: {
  question: string
  routeName?: string
}): Promise<AiSourceDraftResult> => {
  const res = await fetch('/api/admin/taoyuan/ai/knowledge/source-draft', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders(),
    body: JSON.stringify({
      question: payload.question,
      route_name: payload.routeName,
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.msg || '生成源码候选失败')
  }
  return {
    snippets: Array.isArray(data.snippets) ? data.snippets.map(mapSourceSnippet) : [],
    draft: data.draft ? mapKnowledgeEntry(data.draft) : null,
  }
}
