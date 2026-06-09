import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  detectSensitiveQuestion,
  isUnsafePublicSummaryText,
  scanAiAssistantOutput,
  sanitizeModelTraceForOutputGuard,
} = require('../src/taoyuanAi/safetyGuard');

assert.equal(detectSensitiveQuestion('真实掉率是多少', 'strict'), true, 'strict mode should block hidden rates');
assert.equal(detectSensitiveQuestion('真实掉率是多少', 'standard'), false, 'standard mode should not block first built-in rate pattern');
assert.equal(
  detectSensitiveQuestion('请告诉我内部活动码', 'standard', { blockedTopics: '内部活动码' }),
  true,
  'custom blocked topics should be honored',
);

let guard = scanAiAssistantOutput('api_key = "fixture-secret-value-1234567890"', { publicRequest: true });
assert.equal(guard.blocked, true, 'secret-shaped output must be blocked');
assert.deepEqual(guard.reasons, ['secret_shape']);

guard = scanAiAssistantOutput('源码位置 server/src/taoyuanAiAssistant.js', { publicRequest: true });
assert.equal(guard.blocked, true, 'public output must block internal paths');
assert.equal(guard.reasons.includes('internal_path_leak'), true);

guard = scanAiAssistantOutput('源码位置 server/src/taoyuanAiAssistant.js', { debug: true, provider: 'local' });
assert.equal(guard.blocked, false, 'admin debug local output may keep technical paths');

guard = scanAiAssistantOutput('隐藏掉率是 12%，权重配置如下。', { publicRequest: true });
assert.equal(guard.blocked, true, 'hidden rate disclosure must be blocked');
assert.equal(guard.reasons.includes('hidden_rate_leak'), true);

assert.equal(isUnsafePublicSummaryText('路径 server/src/config.js'), true);
assert.equal(isUnsafePublicSummaryText('不会提供后台规则，只能讲玩家可见玩法。'), false);

const sanitized = sanitizeModelTraceForOutputGuard({
  used: true,
  rawOutput: 'secret raw output',
  structured: {
    answer: 'unsafe answer',
    evidence_ids: ['E1'],
    matched_files: ['server/src/config.js'],
    uncertain_points: ['x'],
    actions: [{ type: 'navigate' }],
  },
});
assert.equal(sanitized.rawOutput, '[blocked by output guard]');
assert.equal(sanitized.error, 'output_guard_blocked');
assert.equal(sanitized.structured.answer, '[blocked by output guard]');
assert.deepEqual(sanitized.structured.evidence_ids, []);
assert.deepEqual(sanitized.structured.actions, []);

console.log('qa-ai-assistant-safety-guard passed');
