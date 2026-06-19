const API_KEY_ENV_NAMES = ['TAOYUAN_AI_ASSISTANT_API_KEY', 'AI_ASSISTANT_API_KEY', 'OPENAI_API_KEY'];
const DEFAULT_CONSOLE_CREDIT_MESSAGE =
  '本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186';
const DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE =
  '你好，我是桃源小助理。你可以直接问“现在干啥”“这个去哪弄”“任务为啥卡了”；我会结合当前页面和玩家可见状态给短建议。严格模式下不提供隐藏掉率、后台规则、密钥或刷资源方法，也不改存档、发奖励或扣资源。';
const OFFICIAL_MANAGED_AI_FIELDS = Object.freeze([
  'ai_assistant_name',
  'ai_assistant_welcome',
  'ai_assistant_console_credit',
]);

let configStore = null;
let envSource = process.env;
let runtimeApiKeyOverride = '';
let legacyApiKeyMigrated = false;

function configureAiAssistantConfigService(options = {}) {
  if (options.configStore) configStore = options.configStore;
  if (options.env) envSource = options.env;
  if (options.resetState === true) {
    runtimeApiKeyOverride = '';
    legacyApiKeyMigrated = false;
  }
}

function getConfigValue(name) {
  return configStore && typeof configStore.get === 'function'
    ? configStore.get(name)
    : undefined;
}

function setConfigValues(updates = {}) {
  if (!configStore) return;
  if (typeof configStore.setWithMeta === 'function') {
    configStore.setWithMeta(updates);
  } else if (typeof configStore.set === 'function') {
    configStore.set(updates);
  }
}

function getApiKeyLast4(value = '') {
  const text = String(value || '').trim();
  return text ? text.slice(-4) : '';
}

function maskApiKeyLast4(last4 = '') {
  const normalized = String(last4 || '').trim();
  return normalized ? `****${normalized.slice(-4)}` : '';
}

function readEnvApiKey() {
  const env = envSource || {};
  for (const name of API_KEY_ENV_NAMES) {
    const value = String(env[name] || '').trim();
    if (value) return { value, source: name };
  }
  return { value: '', source: '' };
}

function migrateLegacyStoredApiKey() {
  if (legacyApiKeyMigrated) return { migrated: false, skipped: true };
  legacyApiKeyMigrated = true;

  const legacyKey = String(getConfigValue('ai_assistant_api_key') || '').trim();
  if (!legacyKey) return { migrated: false, skipped: false };

  const envKey = readEnvApiKey();
  if (!envKey.value && !runtimeApiKeyOverride) {
    runtimeApiKeyOverride = legacyKey;
  }

  const updates = {
    ai_assistant_api_key: '',
    ai_assistant_api_key_configured: true,
    ai_assistant_api_key_last4: getApiKeyLast4(legacyKey),
  };
  setConfigValues(updates);
  return { migrated: true, updates };
}

function getEffectiveApiKeySecret() {
  migrateLegacyStoredApiKey();
  const envKey = readEnvApiKey();
  if (envKey.value) return envKey.value;
  return runtimeApiKeyOverride;
}

function getApiKeyStatus() {
  migrateLegacyStoredApiKey();
  const envKey = readEnvApiKey();
  if (envKey.value) {
    const last4 = getApiKeyLast4(envKey.value);
    return { configured: true, last4, masked: maskApiKeyLast4(last4), source: 'env' };
  }
  if (runtimeApiKeyOverride) {
    const last4 = getApiKeyLast4(runtimeApiKeyOverride);
    return { configured: true, last4, masked: maskApiKeyLast4(last4), source: 'runtime' };
  }

  const configured = getConfigValue('ai_assistant_api_key_configured') === true;
  const last4 = getApiKeyLast4(getConfigValue('ai_assistant_api_key_last4'));
  return {
    configured,
    last4: configured ? last4 : '',
    masked: configured ? maskApiKeyLast4(last4) : '',
    source: configured ? 'metadata' : 'none',
  };
}

function applyApiKeyActionToUpdates(updates = {}, options = {}) {
  const nextUpdates = updates;
  const nextApiKey = String(options.nextApiKey || '').trim();
  if (options.clear === true) {
    runtimeApiKeyOverride = '';
    nextUpdates.ai_assistant_api_key_configured = false;
    nextUpdates.ai_assistant_api_key_last4 = '';
  } else if (options.update === true && nextApiKey) {
    runtimeApiKeyOverride = nextApiKey;
    nextUpdates.ai_assistant_api_key_configured = true;
    nextUpdates.ai_assistant_api_key_last4 = getApiKeyLast4(nextApiKey);
  }
  return nextUpdates;
}

function getAiAssistantMode() {
  return getConfigValue('ai_assistant_mode') === 'standard' ? 'standard' : 'strict';
}

function sanitizeTemperature(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.2;
  return Math.max(0, Math.min(1.5, parsed));
}

function buildPublicAiAssistantConfig() {
  migrateLegacyStoredApiKey();
  const enabled = getConfigValue('ai_assistant_enabled') !== false;
  const assistantName = String(getConfigValue('ai_assistant_name') || '桃源小助理').trim() || '桃源小助理';
  const welcomeMessage =
    String(getConfigValue('ai_assistant_welcome') || '').trim() ||
    DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE;
  const consoleCreditMessage =
    String(getConfigValue('ai_assistant_console_credit') || '').trim() || DEFAULT_CONSOLE_CREDIT_MESSAGE;
  const apiUrl = String(getConfigValue('ai_assistant_api_url') || '').trim();
  const model = String(getConfigValue('ai_assistant_model') || '').trim();
  return {
    enabled,
    mode: getAiAssistantMode(),
    assistantName,
    welcomeMessage,
    consoleCreditMessage,
    providerConfigured: !!(apiUrl && model),
  };
}

function buildAdminAiAssistantConfig(options = {}) {
  const apiKeyStatus = getApiKeyStatus();
  const publicConfig = options.publicConfig || buildPublicAiAssistantConfig();
  return {
    ...publicConfig,
    sourceReadEnabled: getConfigValue('ai_assistant_source_read_enabled') === true,
    sourceIngestEnabled: getConfigValue('ai_assistant_source_ingest_enabled') === true,
    sourceIndexStatus: options.sourceIndexStatus,
    nounLexiconStatus: options.nounLexiconStatus,
    modelHealth: options.modelHealth,
    apiUrl: String(getConfigValue('ai_assistant_api_url') || '').trim(),
    apiKeyConfigured: apiKeyStatus.configured,
    apiKeyLast4: apiKeyStatus.last4,
    apiKeyMasked: apiKeyStatus.masked,
    apiKeySource: apiKeyStatus.source,
    model: String(getConfigValue('ai_assistant_model') || '').trim(),
    temperature: sanitizeTemperature(getConfigValue('ai_assistant_temperature')),
    systemPrompt:
      String(getConfigValue('ai_assistant_system_prompt') || '').trim() ||
      '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
    blockedTopics: String(getConfigValue('ai_assistant_blocked_topics') || '').trim(),
    officialManagedStatus: options.managedStatus,
    readonlyManagedFields: Array.isArray(options.readonlyManagedFields)
      ? [...options.readonlyManagedFields]
      : [...OFFICIAL_MANAGED_AI_FIELDS],
  };
}

function buildAdminAiAssistantConfigUpdates(input = {}) {
  return {
    ai_assistant_enabled: input.enabled !== false,
    ai_assistant_mode: input.mode === 'standard' ? 'standard' : 'strict',
    ai_assistant_source_read_enabled: input.sourceReadEnabled === true,
    ai_assistant_source_ingest_enabled: input.sourceIngestEnabled === true,
    ai_assistant_name: String(input.assistantName || '桃源小助理').trim() || '桃源小助理',
    ai_assistant_welcome:
      String(input.welcomeMessage || '').trim() ||
      DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE,
    ai_assistant_console_credit:
      String(input.consoleCreditMessage || '').trim() || DEFAULT_CONSOLE_CREDIT_MESSAGE,
    ai_assistant_api_url: String(input.apiUrl || '').trim(),
    ai_assistant_api_key: '',
    ai_assistant_model: String(input.model || '').trim(),
    ai_assistant_temperature: sanitizeTemperature(input.temperature),
    ai_assistant_system_prompt:
      String(input.systemPrompt || '').trim() ||
      '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答。',
    ai_assistant_blocked_topics: String(input.blockedTopics || '').trim(),
  };
}

function saveAdminAiAssistantConfig(input = {}, options = {}) {
  migrateLegacyStoredApiKey();
  const apiKeyAction = String(input.apiKeyAction || input.api_key_action || '').trim();
  const nextApiKey = String(input.apiKey || input.api_key || '').trim();
  const shouldClearApiKey = input.clearApiKey === true || input.clear_api_key === true || apiKeyAction === 'clear';
  const shouldUpdateApiKey = !shouldClearApiKey && nextApiKey.length > 0;
  const apiUrl = String(input.apiUrl || '').trim();
  const validateModelApiUrl = options.validateModelApiUrl || options.validateApiUrl;
  if (typeof validateModelApiUrl === 'function') {
    validateModelApiUrl(apiUrl);
  }

  const updates = buildAdminAiAssistantConfigUpdates(input);
  if (shouldClearApiKey) {
    applyApiKeyActionToUpdates(updates, { clear: true });
  } else if (shouldUpdateApiKey) {
    applyApiKeyActionToUpdates(updates, { update: true, nextApiKey });
  }

  setConfigValues(updates);
  return {
    updates,
    apiKeyAction: shouldClearApiKey ? 'clear' : shouldUpdateApiKey ? 'update' : 'keep',
    apiKeyChanged: shouldClearApiKey || shouldUpdateApiKey,
  };
}

function resetAiAssistantConfigServiceForTests() {
  runtimeApiKeyOverride = '';
  legacyApiKeyMigrated = false;
  envSource = process.env;
}

module.exports = {
  API_KEY_ENV_NAMES,
  DEFAULT_CONSOLE_CREDIT_MESSAGE,
  DEFAULT_AI_ASSISTANT_WELCOME_MESSAGE,
  OFFICIAL_MANAGED_AI_FIELDS,
  configureAiAssistantConfigService,
  getApiKeyLast4,
  maskApiKeyLast4,
  readEnvApiKey,
  migrateLegacyStoredApiKey,
  getEffectiveApiKeySecret,
  getApiKeyStatus,
  applyApiKeyActionToUpdates,
  getAiAssistantMode,
  sanitizeTemperature,
  buildPublicAiAssistantConfig,
  buildAdminAiAssistantConfig,
  buildAdminAiAssistantConfigUpdates,
  saveAdminAiAssistantConfig,
  resetAiAssistantConfigServiceForTests,
};
