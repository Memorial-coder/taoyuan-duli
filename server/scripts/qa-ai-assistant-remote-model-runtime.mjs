import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runtime = require('../src/taoyuanAi/remoteModelRuntime');

const config = {
  ai_assistant_public_remote_daily_budget_units: 3,
  ai_assistant_public_remote_daily_request_limit: 2,
  ai_assistant_model_circuit_window_ms: 60000,
  ai_assistant_model_circuit_open_ms: 5000,
  ai_assistant_model_circuit_failure_threshold: 2,
  ai_assistant_model_circuit_timeout_threshold: 2,
};

runtime.configureRemoteModelRuntime({
  getConfigValue: name => config[name],
});

runtime.resetPublicRemoteModelBudgetForTests();
assert.equal(
  runtime.estimatePublicRemoteModelCostUnits({ question: '12345678', contextLabel: 'abcd' }),
  3,
);

let budget = runtime.consumePublicRemoteModelBudget({ question: '12345678', contextLabel: 'abcd' }, Date.UTC(2026, 5, 7));
assert.equal(budget.ok, true, 'first budget reservation should pass');
assert.equal(budget.usedUnits, 3);

budget = runtime.consumePublicRemoteModelBudget({ question: 'x' }, Date.UTC(2026, 5, 7));
assert.equal(budget.ok, false, 'exceeding daily units should fail');
assert.equal(budget.reason, 'daily_cost_budget');
assert.equal(budget.requestCount, 1, 'failed budget check should not consume request count');

runtime.resetPublicRemoteModelBudgetForTests();
config.ai_assistant_public_remote_daily_budget_units = 100;
config.ai_assistant_public_remote_daily_request_limit = 1;
budget = runtime.consumePublicRemoteModelBudget({ question: 'x' }, Date.UTC(2026, 5, 7));
assert.equal(budget.ok, true);
budget = runtime.consumePublicRemoteModelBudget({ question: 'x' }, Date.UTC(2026, 5, 7));
assert.equal(budget.ok, false, 'exceeding daily request count should fail');
assert.equal(budget.reason, 'daily_request_limit');

runtime.resetRemoteModelCircuitForTests();
let circuit = runtime.getRemoteModelCircuitStatus(1000);
assert.equal(circuit.open, false);
assert.equal(circuit.failureThreshold, 2);

circuit = runtime.recordRemoteModelFailure({ status: 502, message: 'bad upstream' }, 1100);
assert.equal(circuit.open, false, 'first failure should not open circuit');
assert.equal(circuit.consecutiveFailures, 1);

circuit = runtime.recordRemoteModelFailure({ status: 504, message: 'timeout' }, 1200);
assert.equal(circuit.open, true, 'second failure should open circuit');
assert.equal(circuit.timeoutCount, 1);
assert.equal(circuit.retryAfterMs, 5000);
assert.match(circuit.lastError, /^timeout:504:/);

runtime.recordRemoteModelSuccess(1300);
circuit = runtime.getRemoteModelCircuitStatus(1300);
assert.equal(circuit.open, false, 'success should close circuit');
assert.equal(circuit.consecutiveFailures, 0);

console.log('qa-ai-assistant-remote-model-runtime passed');
