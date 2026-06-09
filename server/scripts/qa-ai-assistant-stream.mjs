import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(import.meta.dirname, '..');
const assistant = require(path.join(rootDir, 'src', 'taoyuanAiAssistant.js'));
const routeFile = path.join(rootDir, 'src', 'routes', 'api.js');
const packageFile = path.join(rootDir, 'package.json');

const phases = assistant.getAskStreamPhases();
assert.ok(phases.length >= 4, 'stream should expose business phase events');
assert.deepEqual(
  phases.slice(0, 4).map(item => item.phase),
  ['understanding', 'reading_context', 'matching_knowledge', 'organizing'],
  'stream phases should describe understanding, context, knowledge and organization',
);

const answer = '结论：先完成任务缺口。\n'.repeat(18);
const events = assistant.buildAskStreamResultEvents({
  answer,
  sources: ['公开知识库'],
  evidence: [{
    id: 'E1',
    title: '任务公开资料',
    sourceType: 'built-in',
    sourceTypeLabel: '内置知识库',
    moduleType: '',
    moduleLabel: '内置知识库',
    routeHints: ['任务'],
    truncated: false,
  }],
  suggestions: [{
    id: 's1',
    level: 'now',
    levelLabel: '马上做',
    title: '打开任务页',
    reason: '确认缺口',
    benefit: '减少来回切换',
    signals: ['task-progress'],
    signalLabels: ['任务进度'],
    routeName: 'quest',
    routeLabel: '任务',
    action: {
      type: 'open_quest',
      label: '打开任务页',
      target: 'quest',
      value: '',
      items: [],
    },
  }],
  traceSummary: {
    provider: 'local',
    providerLabel: '内置知识库',
    mode: 'strict',
    modeLabel: '严格模式',
    answerSourceLabel: '内置知识库',
    fallback: false,
    guarded: false,
    uncertain: false,
    uncertainPoints: [],
    evidenceCount: 1,
    sourceTypes: ['内置知识库'],
  },
  mode: 'strict',
  provider: 'local',
});

const deltaEvents = events.filter(item => item.event === 'delta');
assert.ok(deltaEvents.length > 2, 'long answers should be split into multiple delta events');
assert.equal(deltaEvents.map(item => item.data.delta).join(''), answer, 'delta events should reconstruct the full answer');
assert.equal(events.at(-2)?.event, 'evidence', 'stream should emit evidence before done');
assert.equal(events.at(-1)?.event, 'done', 'stream should end with done');
assert.equal(events.at(-1)?.data.done, true, 'done event should include done=true');
assert.equal(events.at(-1)?.data.provider, 'local', 'done event should preserve provider');
assert.equal(events.at(-1)?.data.mode, 'strict', 'done event should preserve mode');
assert.equal(events.at(-2)?.data.evidence.length, 1, 'evidence event should include safe public evidence');
assert.equal(events.at(-2)?.data.suggestions.length, 1, 'evidence event should include safe action suggestions');

const routeSource = fs.readFileSync(routeFile, 'utf8');
assert.match(routeSource, /router\.post\('\/taoyuan\/ai\/ask'/, 'original non-stream ask route should remain');
assert.match(routeSource, /router\.post\('\/taoyuan\/ai\/ask-stream'/, 'stream ask route should be registered');
assert.match(routeSource, /Content-Type', 'text\/event-stream; charset=utf-8'/, 'stream route should return SSE content type');
assert.match(routeSource, /writeSseEvent\(res, 'phase'/, 'stream route should write phase events');
assert.match(routeSource, /buildAskStreamResultEvents\(result\)/, 'stream route should write runtime result events');
assert.match(routeSource, /sendAiAskStreamError\(res, error\)/, 'stream route should emit SSE error event after headers are sent');
assert.match(routeSource, /finishPublicAiAskQuota\(rateLimit\)/, 'stream route should release public AI quota');
assert.match(routeSource, /scene: 'ai_question_stream'/, 'stream route should keep moderation audit context distinct');

const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
assert.equal(
  packageJson.scripts['qa:ai-assistant-stream'],
  'node scripts/qa-ai-assistant-stream.mjs',
  'server package should register stream QA',
);

console.log('qa-ai-assistant-stream passed');
