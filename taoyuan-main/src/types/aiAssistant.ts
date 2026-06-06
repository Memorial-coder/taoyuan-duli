export type AiAssistantMode = 'strict' | 'standard'
export type AiAssistantProvider = 'local' | 'model' | 'fallback' | 'guard'
export type AiAssistantRole = 'assistant' | 'user'
export type AiKnowledgeAccess = 'public' | 'standard'
export type AiKnowledgeReviewStatus = 'draft' | 'published' | 'archived'
export type AiKnowledgeSourceType = 'manual' | 'source' | 'source-auto' | 'built-in'
export type AiAssistantStructuredActionType =
  | 'navigate'
  | 'open_page'
  | 'open_mail'
  | 'open_activity'
  | 'open_quest'
  | 'copy_checklist'
  | 'expand_page'
  | 'mark_goal'

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

export interface AiAssistantStructuredAction {
  type: AiAssistantStructuredActionType | string
  label: string
  target: string
  value: string
  items: string[]
}

export type AiAssistantSuggestionLevel = 'now' | 'today' | 'week'
export type AiAssistantSuggestionSignal =
  | 'cash-flow'
  | 'task-progress'
  | 'season-risk'
  | 'stamina-use'
  | 'resource-shortage'
  | 'growth-unlock'
  | 'online-deadline'

export interface AiAssistantActionSuggestion {
  id: string
  level: AiAssistantSuggestionLevel | string
  levelLabel: string
  title: string
  reason: string
  benefit: string
  signals: Array<AiAssistantSuggestionSignal | string>
  signalLabels: string[]
  routeName: string
  routeLabel: string
  action: AiAssistantStructuredAction
}

export interface AiAssistantThreeStepSuggestionsTrace {
  available: boolean
  routeName: string
  routeLabel: string
  summary: string
  suggestions: AiAssistantActionSuggestion[]
}

export interface AiAssistantOutputGuardTrace {
  blocked: boolean
  reasons: string[]
  originalProvider?: string
}

export interface AiAssistantEvidenceSummaryItem {
  id: string
  title: string
  sourceType: string
  sourceTypeLabel: string
  moduleType: string
  moduleLabel: string
  routeHints: string[]
  truncated: boolean
}

export interface AiAssistantTraceSummary {
  provider: AiAssistantProvider
  providerLabel: string
  mode: AiAssistantMode
  modeLabel: string
  answerSourceLabel: string
  fallback: boolean
  guarded: boolean
  uncertain: boolean
  uncertainPoints: string[]
  evidenceCount: number
  sourceTypes: string[]
}

export type AiAssistantAnswerBlockKind =
  | 'summary'
  | 'steps'
  | 'notice'
  | 'risk'
  | 'sources'
  | 'fallback'
  | 'uncertainty'

export interface AiAssistantAnswerBlock {
  id: string
  kind: AiAssistantAnswerBlockKind
  title: string
  content: string
  copyable: boolean
}

export interface AiAssistantLocalDiagnosticDimensions {
  urgency: number
  benefit: number
  unlockValue: number
  risk: number
  staminaCost: number
  moneyPressure: number
  taskValue: number
}

export interface AiAssistantLocalDiagnosticSignal {
  id: string
  category: string
  categoryLabel: string
  title: string
  detail?: string
  recommendation: string
  routeName: string
  routeLabel: string
  score: number
  reasons: string[]
  dimensions: AiAssistantLocalDiagnosticDimensions
  source?: string
}

export interface AiAssistantLocalDiagnosticsTrace {
  available: boolean
  summary: string
  signals: AiAssistantLocalDiagnosticSignal[]
  suggestions: AiAssistantLocalDiagnosticSignal[]
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
  diagnostics?: AiAssistantLocalDiagnosticsTrace
  suggestions?: AiAssistantThreeStepSuggestionsTrace
  model: {
    used: boolean
    rawOutput: string
    structured: {
      intent: string
      answer: string
      evidence_ids: string[]
      matched_files: string[]
      uncertain_points: string[]
      actions: AiAssistantStructuredAction[]
    } | null
    error: string
    blocked?: boolean
  }
  outputGuard?: AiAssistantOutputGuardTrace
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
  apiKeyConfigured: boolean
  apiKeyLast4: string
  apiKeyMasked: string
  apiKeySource: string
  apiKeyClearRequested: boolean
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
  evidence: AiAssistantEvidenceSummaryItem[]
  suggestions: AiAssistantActionSuggestion[]
  traceSummary?: AiAssistantTraceSummary
  mode: AiAssistantMode
  provider: AiAssistantProvider
  trace?: AiAssistantDebugTrace
}

export type AiAssistantStreamEventName = 'phase' | 'delta' | 'evidence' | 'done' | 'error'

export interface AiAssistantStreamEvent {
  event: AiAssistantStreamEventName | string
  phase?: string
  label?: string
  detail?: string
  delta?: string
  evidence?: AiAssistantEvidenceSummaryItem[]
  sources?: string[]
  suggestions?: AiAssistantActionSuggestion[]
  traceSummary?: AiAssistantTraceSummary
  mode?: AiAssistantMode
  provider?: AiAssistantProvider
  answer?: string
  done?: boolean
  error?: string
}

export interface AiAssistantBaseContextState {
  currentRouteName?: string
  currentPageLabel?: string
  year?: number
  season?: string
  seasonLabel?: string
  day?: number
  dateLabel?: string
  weather?: string
  weatherLabel?: string
  hour?: number
  timeLabel?: string
  timePeriod?: string
  timePeriodLabel?: string
  stamina?: number
  maxStamina?: number
  staminaLabel?: string
  money?: number
  moneyLabel?: string
}

export interface AiAssistantWeeklyPlanContextV2 {
  planId?: string
  weekId?: string
  primaryRouteLabel?: string
  primaryRouteSummary?: string
  secondaryRouteLabels?: string[]
  secondaryRouteSummaries?: string[]
  claimableNodeLabels?: string[]
  nextWeekPrepSummary?: string
  sourceLabels?: string[]
}

export interface AiAssistantInventoryContext {
  slotUsageLabel?: string
  keyResourceLabels?: string[]
  shortageLabels?: string[]
  toolLevelLabels?: string[]
  pendingToolUpgradeLabel?: string
}

export interface AiAssistantFarmingContext {
  plotStatusLabel?: string
  harvestableLabels?: string[]
  waterRiskLabels?: string[]
  seasonRiskLabels?: string[]
  greenhouseLabel?: string
}

export interface AiAssistantAnimalContext {
  buildingLabels?: string[]
  animalStatusLabel?: string
  productLabels?: string[]
  careAlertLabels?: string[]
}

export interface AiAssistantBuildingContext {
  farmhouseLabel?: string
  greenhouseLabel?: string
  animalBuildingLabels?: string[]
  villageProjectLabel?: string
  availableProjectLabels?: string[]
}

export interface AiAssistantQuestContext {
  mainQuestLabel?: string
  mainQuestObjectiveLabels?: string[]
  activeQuestLabels?: string[]
  boardQuestLabels?: string[]
  specialOrderLabel?: string
  limitedTimeQuestLabel?: string
  claimableLabels?: string[]
  blockerLabels?: string[]
  shortageLabels?: string[]
}

export interface AiAssistantLateGameContext {
  fishPondLabel?: string
  fishPondAlertLabels?: string[]
  breedingLabel?: string
  breedingAlertLabels?: string[]
  museumLabel?: string
  museumAlertLabels?: string[]
  guildLabel?: string
  guildAlertLabels?: string[]
  hanhaiLabel?: string
  hanhaiAlertLabels?: string[]
}

export interface AiAssistantOnlineContext {
  saveSyncLabel?: string
  mailboxLabel?: string
  mailClaimableLabels?: string[]
  hallLabel?: string
  festivalRoomLabel?: string
  coopOrderLabel?: string
  coopCompensationLabel?: string
  cohabitationLabel?: string
  societyLabel?: string
  onlineAlertLabels?: string[]
}

export interface AiAssistantContextSnapshot {
  contextVersion?: number
  version?: number
  baseState?: AiAssistantBaseContextState
  weeklyPlan?: AiAssistantWeeklyPlanContextV2
  inventory?: AiAssistantInventoryContext
  farming?: AiAssistantFarmingContext
  animals?: AiAssistantAnimalContext
  buildings?: AiAssistantBuildingContext
  quests?: AiAssistantQuestContext
  lateGame?: AiAssistantLateGameContext
  online?: AiAssistantOnlineContext
  weeklyPlanId?: string
  currentThemeWeekId?: string
  currentThemeWeekLabel?: string
  currentEventCampaignId?: string
  currentEventCampaignLabel?: string
  currentLimitedQuestCampaignId?: string
  currentLimitedQuestLabel?: string
  primaryRouteLabel?: string
  secondaryRouteLabels?: string[]
  claimableNodeLabels?: string[]
  nextWeekPrepSummary?: string
  activeFamilyWishId?: string
  activeFamilyWishTitle?: string
  bondedSpiritId?: string
  bondedSpiritName?: string
  highlightedRouteLabels?: string[]
  previewMailTitles?: string[]
}

export interface AiAssistantMessage {
  id: string
  role: AiAssistantRole
  content: string
  createdAt: number
  sources?: string[]
  evidence?: AiAssistantEvidenceSummaryItem[]
  suggestions?: AiAssistantActionSuggestion[]
  traceSummary?: AiAssistantTraceSummary
  mode?: AiAssistantMode
  provider?: AiAssistantProvider
  trace?: AiAssistantDebugTrace
  pending?: boolean
  pendingStartedAt?: number
  streaming?: boolean
  streamPhase?: string
  streamPhaseLabel?: string
  streamPhaseDetail?: string
  localDraft?: boolean
  draftForPendingId?: string
  retryQuestion?: string
  cancelled?: boolean
  error?: boolean
  richStatic?: boolean
}
