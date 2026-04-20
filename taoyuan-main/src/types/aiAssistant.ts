export type AiAssistantMode = 'strict' | 'standard'
export type AiAssistantProvider = 'local' | 'model' | 'fallback' | 'guard'
export type AiAssistantRole = 'assistant' | 'user'
export type AiKnowledgeAccess = 'public' | 'standard'
export type AiKnowledgeReviewStatus = 'draft' | 'published' | 'archived'
export type AiKnowledgeSourceType = 'manual' | 'source' | 'source-auto' | 'built-in'

import type { OfficialManagedConfigKey, OfficialManagedConfigStatus } from './officialManaged'

export interface AiSourceIndexStatus {
  version: number
  builtAt: number
  fileCount: number
  entryCount: number
  symbolCount?: number
  ready: boolean
}

export interface AiNounLexiconStatus {
  version: number
  builtAt: number
  fileCount: number
  entryCount: number
  ready: boolean
}

export interface AiAssistantEvidenceItem {
  evidence_id: string
  type: string
  title: string
  path: string
  symbol?: string
  startLine?: number
  endLine?: number
  score: number
  content: string
  contentMode?: string
  originTitle?: string
  originSourceType?: string
  truncated?: boolean
  originalLength?: number
}

export interface AiAssistantTraceCandidate {
  id: string
  title: string
  sourceType: string
  score: number
  responseScore: number
  path: string
  symbol?: string
  symbolKind?: string
  lineNumber?: number
  startLine?: number
  endLine?: number
  sourceRefs: string[]
  routeHints: string[]
  preview: string
  contentMode?: string
  originTitle?: string
  originSourceType?: string
  truncated?: boolean
}

export interface AiAssistantDebugTrace {
  question: string
  routeName?: string
  contextLabel?: string
  mode: AiAssistantMode
  provider: AiAssistantProvider | string
  queryPlan: {
    primaryIntent: string
    intents: string[]
    questionCategory: string
    explicitTargets: string[]
    quotedTerms: string[]
    conceptTerms: string[]
    identifierTargets: string[]
    sourceTerms: string[]
    moduleHints: string[]
    routeHints: string[]
    nounLexiconMatches?: Array<{
      term: string
      normalized: string
      weight: number
      routeHints: string[]
    }>
    preferredModuleTypes: string[]
    preferredPathPrefixes: string[]
    needsSourceSearch: boolean
    needsKnowledgeSearch: boolean
    needsCallGraph: boolean
    answerMode: string
    sourcePreference: string
  }
  sourceSearch: {
    enabled: boolean
    executed: boolean
    ingestEnabled: boolean
  }
  candidates: {
    knowledgeMatches: AiAssistantTraceCandidate[]
    sourceDirectoryHits: AiAssistantTraceCandidate[]
    sourceSymbolHits: AiAssistantTraceCandidate[]
    sourceIndexHits: AiAssistantTraceCandidate[]
    sourceContextHits: AiAssistantTraceCandidate[]
    finalMatches: AiAssistantTraceCandidate[]
  }
  evidence: AiAssistantEvidenceItem[]
  model: {
    used: boolean
    rawOutput: string
    structured: {
      intent: string
      answer: string
      evidence_ids: string[]
      matched_files: string[]
      uncertain_points: string[]
    } | null
    error: string
    blocked?: boolean
  }
  timings: Record<string, number>
  finalAnswer: string
}

export interface AiAssistantPublicConfig {
  enabled: boolean
  mode: AiAssistantMode
  assistantName: string
  welcomeMessage: string
  consoleCreditMessage: string
  providerConfigured: boolean
}

export interface AiAssistantAdminConfig extends AiAssistantPublicConfig {
  sourceReadEnabled: boolean
  sourceIngestEnabled: boolean
  sourceIndexStatus?: AiSourceIndexStatus
  nounLexiconStatus?: AiNounLexiconStatus
  apiUrl: string
  apiKey: string
  model: string
  temperature: number
  systemPrompt: string
  blockedTopics: string
  officialManagedStatus?: OfficialManagedConfigStatus
  readonlyManagedFields: OfficialManagedConfigKey[]
}

export interface AiKnowledgeEntry {
  id: string
  title: string
  routeNames: string[]
  keywords: string[]
  content: string
  access: AiKnowledgeAccess
  enabled: boolean
  readonly?: boolean
  sourceType: AiKnowledgeSourceType | string
  sourceRefs: string[]
  reviewStatus: AiKnowledgeReviewStatus
  createdAt: number
  updatedAt: number
  metadata?: Record<string, unknown>
}

export interface AiSourceSnippet {
  path: string
  snippet: string
  summary: string
  score: number
}

export interface AiSourceDraftResult {
  snippets: AiSourceSnippet[]
  draft: AiKnowledgeEntry | null
}

export interface AiAssistantAskResult {
  answer: string
  sources: string[]
  mode: AiAssistantMode
  provider: AiAssistantProvider
  trace?: AiAssistantDebugTrace
}

export interface AiAssistantMessage {
  id: string
  role: AiAssistantRole
  content: string
  createdAt: number
  sources?: string[]
  pending?: boolean
  error?: boolean
}
