import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const configService = require('../src/taoyuanAi/configService');

function createMemoryConfig(initial = {}) {
  const data = { ...initial };
  const writes = [];
  return {
    data,
    writes,
    get(name) {
      return data[name];
    },
    setWithMeta(updates) {
      writes.push({ ...updates });
      Object.assign(data, updates);
    },
  };
}

const env = {};
let store = createMemoryConfig({
  ai_assistant_api_key: 'fixture-legacy-key-not-real-1234',
});
configService.configureAiAssistantConfigService({ configStore: store, env, resetState: true });

let migration = configService.migrateLegacyStoredApiKey();
assert.equal(migration.migrated, true, 'legacy key should migrate once');
assert.equal(store.data.ai_assistant_api_key, '', 'legacy key should be cleared from config');
assert.equal(store.data.ai_assistant_api_key_configured, true);
assert.equal(store.data.ai_assistant_api_key_last4, '1234');
assert.equal(store.writes.length, 1, 'migration should write metadata once');
assert.equal(configService.getApiKeyStatus().source, 'runtime', 'legacy key should remain available in runtime memory');
assert.equal(configService.getApiKeyStatus().masked, '****1234');
assert.equal(configService.getEffectiveApiKeySecret(), 'fixture-legacy-key-not-real-1234');

migration = configService.migrateLegacyStoredApiKey();
assert.equal(migration.migrated, false, 'legacy key migration should be idempotent');
assert.equal(store.writes.length, 1);

env.AI_ASSISTANT_API_KEY = 'fixture-env-key-not-real-5555';
let status = configService.getApiKeyStatus();
assert.equal(status.configured, true);
assert.equal(status.source, 'env');
assert.equal(status.last4, '5555');
assert.equal(status.masked, '****5555');
assert.equal(configService.getEffectiveApiKeySecret(), 'fixture-env-key-not-real-5555');

delete env.AI_ASSISTANT_API_KEY;
const updates = { ai_assistant_api_key: '' };
configService.applyApiKeyActionToUpdates(updates, {
  update: true,
  nextApiKey: 'fixture-runtime-key-not-real-9876',
});
assert.equal(updates.ai_assistant_api_key_configured, true);
assert.equal(updates.ai_assistant_api_key_last4, '9876');
assert.equal(configService.getApiKeyStatus().source, 'runtime');
assert.equal(configService.getApiKeyStatus().masked, '****9876');

configService.applyApiKeyActionToUpdates(updates, { clear: true });
assert.equal(updates.ai_assistant_api_key_configured, false);
assert.equal(updates.ai_assistant_api_key_last4, '');
store.data.ai_assistant_api_key_configured = false;
store.data.ai_assistant_api_key_last4 = '';
status = configService.getApiKeyStatus();
assert.equal(status.configured, false);
assert.equal(status.source, 'none');

store = createMemoryConfig({
  ai_assistant_api_key: '',
  ai_assistant_api_key_configured: true,
  ai_assistant_api_key_last4: '2468',
});
configService.configureAiAssistantConfigService({ configStore: store, env: {}, resetState: true });
status = configService.getApiKeyStatus();
assert.equal(status.source, 'metadata');
assert.equal(status.masked, '****2468');
assert.equal(configService.getEffectiveApiKeySecret(), '', 'metadata-only state must not expose a secret');

store = createMemoryConfig({
  ai_assistant_enabled: false,
  ai_assistant_mode: 'standard',
  ai_assistant_source_read_enabled: true,
  ai_assistant_source_ingest_enabled: false,
  ai_assistant_name: '配置保存测试助手',
  ai_assistant_welcome: '配置保存测试欢迎语',
  ai_assistant_console_credit: '配置保存测试署名',
  ai_assistant_api_url: 'https://model.example.test/v1',
  ai_assistant_model: 'model-save-test',
  ai_assistant_temperature: 0.9,
  ai_assistant_system_prompt: '只依据公开知识回答。',
  ai_assistant_blocked_topics: '隐藏掉率',
  ai_assistant_api_key: '',
  ai_assistant_api_key_configured: true,
  ai_assistant_api_key_last4: '2468',
});
configService.configureAiAssistantConfigService({ configStore: store, env: {}, resetState: true });

const publicConfig = configService.buildPublicAiAssistantConfig();
assert.equal(publicConfig.enabled, false, 'public config should reflect the saved enabled flag');
assert.equal(publicConfig.mode, 'standard', 'public config should reflect the saved answer mode');
assert.equal(publicConfig.assistantName, '配置保存测试助手');
assert.equal(publicConfig.welcomeMessage, '配置保存测试欢迎语');
assert.equal(publicConfig.consoleCreditMessage, '配置保存测试署名');
assert.equal(publicConfig.providerConfigured, true, 'public config should expose provider readiness from apiUrl and model');

const adminConfig = configService.buildAdminAiAssistantConfig({
  sourceIndexStatus: { ready: true, entryCount: 3 },
  nounLexiconStatus: { ready: true, entryCount: 2 },
  modelHealth: { open: false },
  managedStatus: { source: 'local_default' },
  readonlyManagedFields: ['ai_assistant_name'],
});
assert.equal(adminConfig.enabled, false, 'admin config should reuse public config state');
assert.equal(adminConfig.sourceReadEnabled, true);
assert.equal(adminConfig.sourceIngestEnabled, false);
assert.equal(adminConfig.apiUrl, 'https://model.example.test/v1');
assert.equal(adminConfig.model, 'model-save-test');
assert.equal(adminConfig.temperature, 0.9);
assert.equal(adminConfig.systemPrompt, '只依据公开知识回答。');
assert.equal(adminConfig.blockedTopics, '隐藏掉率');
assert.equal(adminConfig.apiKeyConfigured, true);
assert.equal(adminConfig.apiKeyMasked, '****2468');
assert.deepEqual(adminConfig.sourceIndexStatus, { ready: true, entryCount: 3 });
assert.deepEqual(adminConfig.readonlyManagedFields, ['ai_assistant_name']);

const updatesFromSave = configService.buildAdminAiAssistantConfigUpdates({
  enabled: true,
  mode: 'strict',
  sourceReadEnabled: false,
  sourceIngestEnabled: true,
  assistantName: '保存后助手',
  welcomeMessage: '保存后欢迎',
  consoleCreditMessage: '保存后署名',
  apiUrl: ' https://api.example.test/v1 ',
  model: ' saved-model ',
  temperature: '9',
  systemPrompt: '',
  blockedTopics: '后台规则',
});
assert.equal(updatesFromSave.ai_assistant_enabled, true);
assert.equal(updatesFromSave.ai_assistant_mode, 'strict');
assert.equal(updatesFromSave.ai_assistant_source_read_enabled, false);
assert.equal(updatesFromSave.ai_assistant_source_ingest_enabled, true);
assert.equal(updatesFromSave.ai_assistant_name, '保存后助手');
assert.equal(updatesFromSave.ai_assistant_welcome, '保存后欢迎');
assert.equal(updatesFromSave.ai_assistant_console_credit, '保存后署名');
assert.equal(updatesFromSave.ai_assistant_api_url, 'https://api.example.test/v1');
assert.equal(updatesFromSave.ai_assistant_model, 'saved-model');
assert.equal(updatesFromSave.ai_assistant_temperature, 1.5, 'save updates should clamp temperature to the safe max');
assert.equal(updatesFromSave.ai_assistant_api_key, '', 'save updates should never persist a complete API key');
assert.match(updatesFromSave.ai_assistant_system_prompt, /只依据提供的知识片段回答/, 'empty system prompt should fall back to safe default');
assert.equal(updatesFromSave.ai_assistant_blocked_topics, '后台规则');

let validatedApiUrl = '';
const saved = configService.saveAdminAiAssistantConfig({
  enabled: true,
  mode: 'standard',
  sourceReadEnabled: true,
  sourceIngestEnabled: true,
  assistantName: '持久化助手',
  welcomeMessage: '持久化欢迎',
  consoleCreditMessage: '持久化署名',
  apiUrl: 'https://persist.example.test/v1',
  apiKey: 'fixture-save-runtime-key-not-real-7777',
  model: 'persist-model',
  temperature: 0.7,
  systemPrompt: '持久化系统提示',
  blockedTopics: '后台规则',
}, {
  validateModelApiUrl(apiUrl) {
    validatedApiUrl = apiUrl;
  },
});
assert.equal(validatedApiUrl, 'https://persist.example.test/v1', 'save should validate the normalized model API URL before writing');
assert.equal(saved.apiKeyAction, 'update');
assert.equal(saved.apiKeyChanged, true);
assert.equal(saved.updates.ai_assistant_api_key, '', 'save should never persist a complete API key');
assert.equal(saved.updates.ai_assistant_api_key_configured, true);
assert.equal(saved.updates.ai_assistant_api_key_last4, '7777');
assert.equal(store.data.ai_assistant_api_url, 'https://persist.example.test/v1');
assert.equal(store.data.ai_assistant_model, 'persist-model');
assert.equal(configService.getApiKeyStatus().source, 'runtime');
assert.equal(configService.getApiKeyStatus().masked, '****7777');
assert.equal(JSON.stringify(store.writes).includes('fixture-save-runtime-key-not-real-7777'), false, 'config writes must not contain the full API key');

const cleared = configService.saveAdminAiAssistantConfig({
  enabled: true,
  mode: 'strict',
  apiUrl: '',
  apiKeyAction: 'clear',
  model: '',
}, {
  validateModelApiUrl(apiUrl) {
    assert.equal(apiUrl, '', 'clear save should still validate the current URL value');
  },
});
assert.equal(cleared.apiKeyAction, 'clear');
assert.equal(cleared.updates.ai_assistant_api_key_configured, false);
assert.equal(cleared.updates.ai_assistant_api_key_last4, '');
assert.equal(configService.getApiKeyStatus().source, 'none');

configService.resetAiAssistantConfigServiceForTests();
console.log('qa-ai-assistant-config-service passed');
