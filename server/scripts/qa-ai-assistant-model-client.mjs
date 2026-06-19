import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildChatCompletionsUrl,
  extractModelText,
  safeJson,
  buildSemanticPrepassPrompt,
  buildModelUserPrompt,
  buildModelRequestBody,
  callRemoteSemanticPrepass,
  callRemoteModel,
} = require('../src/taoyuanAi/modelClient');

function validateUrl(apiUrl) {
  return { url: new URL(apiUrl) };
}

function assertStatusError(error, status, pattern) {
  assert.ok(error, 'expected an error');
  assert.equal(error.status, status);
  assert.match(error.message, pattern);
}

const evidence = [
  {
    evidence_id: 'E1',
    type: 'manual',
    title: '任务页说明',
    path: 'docs/guide.md',
    content: '任务页会展示当前目标。',
  },
];

assert.equal(
  buildChatCompletionsUrl('https://model.example/v1', { validateModelApiUrl: validateUrl }),
  'https://model.example/v1/chat/completions',
  'base API URL should append chat completions path'
);
assert.equal(
  buildChatCompletionsUrl('https://model.example/', { validateModelApiUrl: validateUrl }),
  'https://model.example/v1/chat/completions',
  'root New API URL should default to the OpenAI-compatible v1 path'
);
assert.equal(
  buildChatCompletionsUrl('https://model.example/v1/chat/completions/', { validateModelApiUrl: validateUrl }),
  'https://model.example/v1/chat/completions',
  'chat completions URL should not double append'
);
assert.equal(buildChatCompletionsUrl('', { validateModelApiUrl: validateUrl }), '', 'empty API URL should stay empty');

assert.equal(extractModelText({ choices: [{ message: { content: '  hi  ' } }] }), 'hi');
assert.equal(
  extractModelText({ choices: [{ message: { content: [{ text: '你' }, '好'] } }] }),
  '你好',
  'OpenAI-compatible array content should be flattened'
);
assert.equal(extractModelText({ output_text: '  direct  ' }), 'direct');
assert.equal(extractModelText({ content: [{ text: 'A' }, { text: 'B' }] }), 'AB');

const parsedSafeJson = await safeJson({ json: async () => ({ ok: true }) });
assert.equal(parsedSafeJson?.ok, true);
assert.equal(await safeJson({ json: async () => { throw new Error('bad json'); } }), null);

const prompt = buildModelUserPrompt({
  question: '任务卡住了怎么办？',
  contextLabel: '任务页',
  mode: 'strict',
  queryPlan: { intents: ['task_help'], routeHints: ['quest'], needsCallGraph: true },
  evidence,
});
assert.match(prompt, /回答模式：严格模式/);
assert.match(prompt, /任务卡住了怎么办/);
assert.match(prompt, /"evidence_id": "E1"/);
assert.match(prompt, /actions 只允许安全轻动作/);
assert.match(prompt, /先把玩家的口语问题归纳成真实意图/, 'prompt should normalize colloquial player wording before answering');
assert.match(prompt, /第一句必须是直接结论/, 'prompt should force a direct first sentence');
assert.match(prompt, /最多 260 字/, 'prompt should cap answer verbosity');
assert.match(prompt, /结论 \/ 为什么 \/ 下一步 \/ 注意/, 'prompt should prefer dense answer sections');
assert.match(prompt, /不要写“证据片段\/evidence\/评分\/诊断报告\/本地检索\/知识库命中”/, 'prompt should keep internal workflow words out of player-facing answer');
assert.match(prompt, /至少引用一个具体信号/, 'prompt should use visible page or state signals when available');

const semanticPrompt = buildSemanticPrepassPrompt({
  question: '我现在咋整，铜矿缺一个',
  contextLabel: '农场 / 背包缺铜矿 1 个',
  routeName: 'farm',
  queryPlan: { intents: ['gameplay_qa'], questionTypes: [] },
});
assert.match(semanticPrompt, /只负责把.*解析成检索意图/, 'semantic prepass should only parse intent');
assert.match(semanticPrompt, /不能编造物品、任务、NPC 是否存在/, 'semantic prepass should not invent facts');
assert.match(semanticPrompt, /normalized_question/, 'semantic prepass should request structured JSON');

const requestBody = buildModelRequestBody({
  adminConfig: { model: 'qa-model', temperature: 0.2 },
  systemPrompt: 'system',
  userPrompt: 'user',
});
assert.deepEqual(requestBody.messages, [
  { role: 'system', content: 'system' },
  { role: 'user', content: 'user' },
]);

let capturedRequest = null;
const successResult = await callRemoteModel({
  question: '任务卡住了怎么办？',
  contextLabel: '任务页',
  mode: 'standard',
  snippets: [{ title: '任务页说明' }],
  queryPlan: { intents: ['task_help'], routeHints: ['quest'] },
}, {
  adminConfig: {
    apiUrl: 'https://model.example/v1',
    model: 'qa-model',
    temperature: 0.3,
    systemPrompt: '',
  },
  apiKey: 'qa-model-token',
  validateModelApiUrl: validateUrl,
  buildEvidencePayload: () => evidence,
  fetchImpl: async (url, init) => {
    capturedRequest = { url, init };
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'task_help',
              answer: '先打开任务页核对目标。',
              evidence_ids: ['E1'],
              matched_files: ['docs/guide.md'],
              uncertain_points: [],
              actions: [{ type: 'open_quest', label: '打开任务', target: 'quest' }],
            }),
          },
        }],
      }),
    };
  },
});
assert.equal(successResult.answer, '先打开任务页核对目标。');
assert.equal(capturedRequest.url, 'https://model.example/v1/chat/completions');
assert.equal(capturedRequest.init.method, 'POST');
assert.equal(capturedRequest.init.headers.Authorization, 'Bearer qa-model-token');
assert.equal(capturedRequest.init.headers['Content-Type'], 'application/json');
const capturedBody = JSON.parse(capturedRequest.init.body);
assert.equal(capturedBody.model, 'qa-model');
assert.equal(capturedBody.temperature, 0.3);
assert.match(capturedBody.messages[0].content, /桃源乡游戏内 AI 助手/);
assert.match(capturedBody.messages[1].content, /回答模式：标准模式/);

let capturedSemanticRequest = null;
const semanticResult = await callRemoteSemanticPrepass({
  question: '铜矿缺一个去哪弄',
  contextLabel: '矿洞',
  routeName: 'mining',
  queryPlan: { intents: ['gameplay_qa'], questionTypes: [] },
}, {
  adminConfig: {
    apiUrl: 'https://model.example/v1',
    model: 'qa-model',
    temperature: 0.9,
  },
  validateModelApiUrl: validateUrl,
  fetchImpl: async (url, init) => {
    capturedSemanticRequest = { url, init };
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          normalized_question: '铜矿还缺一个，去哪里获取最快？',
          intents: ['resource_source', 'plan_today'],
          question_types: ['resource_source'],
          route_hints: ['矿洞'],
          source_terms: ['铜矿'],
          slots: { items: ['铜矿'], quantities: ['1个'] },
          rewrite_queries: ['铜矿 来源'],
          clarification: { required: false, question: '', options: [] },
          confidence: 0.87,
        }),
      }),
    };
  },
});
assert.equal(capturedSemanticRequest.url, 'https://model.example/v1/chat/completions');
const capturedSemanticBody = JSON.parse(capturedSemanticRequest.init.body);
assert.equal(capturedSemanticBody.temperature, 0, 'semantic prepass should force deterministic temperature');
assert.match(capturedSemanticBody.messages[0].content, /语义解析器/);
assert.equal(semanticResult.structured.normalizedQuestion, '铜矿还缺一个，去哪里获取最快？');
assert.deepEqual(semanticResult.structured.slots.items, ['铜矿']);
assert.equal(semanticResult.structured.confidence, 0.87);

let noAuthRequest = null;
await callRemoteModel({ question: 'Q', contextLabel: '', mode: 'strict', snippets: [], queryPlan: null }, {
  adminConfig: { apiUrl: 'https://model.example/v1', model: 'qa-model', temperature: 0 },
  apiKey: '',
  validateModelApiUrl: validateUrl,
  buildEvidencePayload: () => [],
  fetchImpl: async (url, init) => {
    noAuthRequest = { url, init };
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          answer: '无依据时说明不确定。',
          evidence_ids: [],
          matched_files: [],
          uncertain_points: ['资料不足'],
          actions: [],
        }),
      }),
    };
  },
});
assert.equal(Object.hasOwn(noAuthRequest.init.headers, 'Authorization'), false, 'empty API key should not send Authorization');

let error = null;
try {
  await callRemoteModel({}, {
    adminConfig: { apiUrl: '', model: '' },
    validateModelApiUrl: validateUrl,
  });
} catch (err) {
  error = err;
}
assertStatusError(error, 400, /未配置可用/);

error = null;
try {
  await callRemoteModel({ question: 'Q', snippets: [] }, {
    adminConfig: { apiUrl: 'https://model.example/v1', model: 'qa-model' },
    validateModelApiUrl: validateUrl,
    buildEvidencePayload: () => [],
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ error: { message: 'upstream rejected' } }),
    }),
  });
} catch (err) {
  error = err;
}
assertStatusError(error, 502, /upstream rejected/);

error = null;
try {
  await callRemoteModel({ question: 'Q', snippets: [] }, {
    adminConfig: { apiUrl: 'https://model.example/v1', model: 'qa-model' },
    validateModelApiUrl: validateUrl,
    buildEvidencePayload: () => [],
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    }),
  });
} catch (err) {
  error = err;
}
assertStatusError(error, 502, /未返回有效内容/);

error = null;
try {
  await callRemoteModel({ question: 'Q', snippets: [] }, {
    adminConfig: { apiUrl: 'https://model.example/v1', model: 'qa-model' },
    validateModelApiUrl: validateUrl,
    buildEvidencePayload: () => evidence,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          answer: '引用越界 evidence。',
          evidence_ids: ['E404'],
          matched_files: [],
          uncertain_points: [],
          actions: [],
        }),
      }),
    }),
  });
} catch (err) {
  error = err;
}
assertStatusError(error, 502, /本次证据之外/);

error = null;
try {
  await callRemoteModel({ question: 'Q', snippets: [] }, {
    adminConfig: { apiUrl: 'https://model.example/v1', model: 'qa-model' },
    validateModelApiUrl: validateUrl,
    buildEvidencePayload: () => [],
    fetchImpl: async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      throw abortError;
    },
  });
} catch (err) {
  error = err;
}
assertStatusError(error, 504, /响应超时/);

console.log('qa-ai-assistant-model-client passed');
