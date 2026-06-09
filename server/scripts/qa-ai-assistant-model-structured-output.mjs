import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  SAFE_MODEL_ACTION_TYPES,
  extractJsonBlock,
  parseModelStructuredPayload,
  parseModelStructuredOutput,
  normalizeModelAction,
  validateModelStructuredOutput,
} = require('../src/taoyuanAi/modelStructuredOutput');

function assertStatusError(fn, pattern) {
  let error = null;
  try {
    fn();
  } catch (err) {
    error = err;
  }
  assert.ok(error, 'expected validation to throw');
  assert.equal(error.status, 502, 'structured output validation should preserve 502 status');
  assert.match(error.message, pattern);
}

const evidence = [
  { evidence_id: 'E1', path: 'taoyuan-main/docs/guide.html' },
  { evidence_id: 'E2', path: 'taoyuan-main/src/views/game/FarmView.vue' },
];

assert.equal(SAFE_MODEL_ACTION_TYPES.has('copy_checklist'), true, 'safe action whitelist should include copy_checklist');
assert.equal(SAFE_MODEL_ACTION_TYPES.has('grant_reward'), false, 'safe action whitelist must not include reward mutations');

const fencedJson = [
  '模型输出：',
  '```json',
  '{"intent":"guide","answer":"先看任务页","evidenceIds":["E1","E1"],"matchedFiles":["taoyuan-main/docs/guide.html"],"uncertainPoints":[],"actions":[{"type":"copy_checklist","label":"复制清单","checklist":["查看任务","确认材料"]}]}',
  '```',
].join('\n');
assert.equal(extractJsonBlock(fencedJson).startsWith('{'), true, 'extractJsonBlock should unwrap fenced JSON');
assert.equal(parseModelStructuredPayload(fencedJson)?.answer, '先看任务页', 'parseModelStructuredPayload should parse fenced JSON');

const parsed = parseModelStructuredOutput(fencedJson);
assert.deepEqual(parsed.evidence_ids, ['E1'], 'parseModelStructuredOutput should de-duplicate evidence ids');
assert.deepEqual(parsed.uncertain_points, [], 'parseModelStructuredOutput should accept camelCase uncertain points');
assert.equal(parsed.actions[0].type, 'copy_checklist', 'parseModelStructuredOutput should normalize safe actions');

const normalizedAction = normalizeModelAction({
  action: 'open_page',
  title: '打开农场',
  route_name: 'farm',
  text: 'route:farm',
});
assert.deepEqual(
  normalizedAction,
  { type: 'open_page', label: '打开农场', target: 'farm', value: 'route:farm', items: [] },
  'normalizeModelAction should accept action/title/route_name aliases'
);
assert.equal(normalizeModelAction({ type: 'grant_reward', label: '发奖励', target: 'admin' }), null, 'unsafe actions should be rejected');
assert.equal(normalizeModelAction({ type: 'open_page', label: '' }), null, 'actions without label should be rejected');

const validStructured = validateModelStructuredOutput(JSON.stringify({
  intent: 'route_help',
  answer: '可以先打开任务页核对目标。',
  evidence_ids: ['E1', 'E2'],
  matched_files: ['taoyuan-main/docs/guide.html'],
  uncertain_points: [],
  actions: [
    { type: 'open_quest', label: '打开任务', target: 'quest' },
  ],
}), evidence);
assert.equal(validStructured.answer, '可以先打开任务页核对目标。', 'validateModelStructuredOutput should return normalized answer');
assert.deepEqual(validStructured.matched_files, ['taoyuan-main/docs/guide.html'], 'validateModelStructuredOutput should keep allowed matched files');

const validWithoutMatchedFiles = validateModelStructuredOutput(JSON.stringify({
  answer: '没有文件路径也可以回答。',
  evidence_ids: ['E1'],
  uncertain_points: [],
  actions: [],
}), evidence);
assert.deepEqual(validWithoutMatchedFiles.matched_files, [], 'matched_files should remain optional for model responses');

assertStatusError(
  () => validateModelStructuredOutput('not json', evidence),
  /结构化 JSON/
);
assertStatusError(
  () => validateModelStructuredOutput(JSON.stringify({ answer: '缺字段', evidence_ids: [], actions: [] }), evidence),
  /缺少字段：uncertain_points/
);
assertStatusError(
  () => validateModelStructuredOutput(JSON.stringify({ answer: '类型错误', evidence_ids: 'E1', uncertain_points: [], actions: [] }), evidence),
  /字段类型不正确/
);
assertStatusError(
  () => validateModelStructuredOutput(JSON.stringify({ answer: '空依据', evidence_ids: ['E404'], uncertain_points: [], actions: [] }), evidence),
  /本次证据之外/
);
assertStatusError(
  () => validateModelStructuredOutput(JSON.stringify({ answer: '越界文件', evidence_ids: ['E1'], matched_files: ['server/src/config.js'], uncertain_points: [], actions: [] }), evidence),
  /本次证据之外的文件/
);
assertStatusError(
  () => validateModelStructuredOutput(JSON.stringify({ answer: '危险动作', evidence_ids: ['E1'], uncertain_points: [], actions: [{ type: 'grant_reward', label: '发奖励' }] }), evidence),
  /不允许的动作类型/
);

console.log('qa-ai-assistant-model-structured-output passed');
