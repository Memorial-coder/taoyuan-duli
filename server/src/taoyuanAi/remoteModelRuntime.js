let getConfigValue = () => undefined;
let publicRemoteModelBudgetState = { dayKey: '', usedUnits: 0, requestCount: 0 };
let remoteModelCircuitState = {
  openedUntil: 0,
  consecutiveFailures: 0,
  lastError: '',
  lastErrorAt: 0,
  events: [],
};

function configureRemoteModelRuntime(options = {}) {
  if (typeof options.getConfigValue === 'function') {
    getConfigValue = options.getConfigValue;
  }
}

function parsePositiveIntegerConfig(name, fallback) {
  const value = Number.parseInt(getConfigValue(name), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getPublicRemoteModelBudgetConfig() {
  return {
    dailyBudgetUnits: parsePositiveIntegerConfig('ai_assistant_public_remote_daily_budget_units', 200000),
    dailyRequestLimit: parsePositiveIntegerConfig('ai_assistant_public_remote_daily_request_limit', 200),
  };
}

function getPublicRemoteModelBudgetDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function normalizePublicRemoteModelBudgetState(now = Date.now()) {
  const dayKey = getPublicRemoteModelBudgetDayKey(now);
  if (publicRemoteModelBudgetState.dayKey !== dayKey) {
    publicRemoteModelBudgetState = { dayKey, usedUnits: 0, requestCount: 0 };
  }
  return publicRemoteModelBudgetState;
}

function estimatePublicRemoteModelCostUnits({ question = '', contextLabel = '', snippets = [] } = {}) {
  const evidenceLength = Array.isArray(snippets)
    ? snippets.reduce((sum, item) => {
        return sum
          + String(item?.title || '').length
          + String(item?.content || '').length
          + String(item?.path || '').length;
      }, 0)
    : 0;
  const totalLength = String(question || '').length + String(contextLabel || '').length + evidenceLength;
  return Math.max(1, Math.ceil(totalLength / 4));
}

function consumePublicRemoteModelBudget(payload = {}, now = Date.now()) {
  const config = getPublicRemoteModelBudgetConfig();
  const state = normalizePublicRemoteModelBudgetState(now);
  const estimatedUnits = estimatePublicRemoteModelCostUnits(payload);

  if (state.requestCount >= config.dailyRequestLimit) {
    return {
      ok: false,
      reason: 'daily_request_limit',
      estimatedUnits,
      usedUnits: state.usedUnits,
      dailyBudgetUnits: config.dailyBudgetUnits,
      requestCount: state.requestCount,
      dailyRequestLimit: config.dailyRequestLimit,
    };
  }

  if (state.usedUnits + estimatedUnits > config.dailyBudgetUnits) {
    return {
      ok: false,
      reason: 'daily_cost_budget',
      estimatedUnits,
      usedUnits: state.usedUnits,
      dailyBudgetUnits: config.dailyBudgetUnits,
      requestCount: state.requestCount,
      dailyRequestLimit: config.dailyRequestLimit,
    };
  }

  state.usedUnits += estimatedUnits;
  state.requestCount += 1;
  return {
    ok: true,
    reason: '',
    estimatedUnits,
    usedUnits: state.usedUnits,
    dailyBudgetUnits: config.dailyBudgetUnits,
    requestCount: state.requestCount,
    dailyRequestLimit: config.dailyRequestLimit,
  };
}

function resetPublicRemoteModelBudgetForTests() {
  publicRemoteModelBudgetState = { dayKey: '', usedUnits: 0, requestCount: 0 };
}

function getRemoteModelCircuitConfig() {
  return {
    windowMs: parsePositiveIntegerConfig('ai_assistant_model_circuit_window_ms', 300000),
    openMs: parsePositiveIntegerConfig('ai_assistant_model_circuit_open_ms', 120000),
    failureThreshold: parsePositiveIntegerConfig('ai_assistant_model_circuit_failure_threshold', 3),
    timeoutThreshold: parsePositiveIntegerConfig('ai_assistant_model_circuit_timeout_threshold', 2),
  };
}

function summarizeRemoteModelError(error = {}) {
  const status = Number(error?.status) || 0;
  const message = String(error?.message || '远程模型调用失败').trim().slice(0, 160);
  const type = error?.name === 'AbortError' || status === 504 || /超时|timeout/i.test(message)
    ? 'timeout'
    : 'failure';
  return { type, status, message };
}

function pruneRemoteModelCircuitEvents(now = Date.now(), config = getRemoteModelCircuitConfig()) {
  remoteModelCircuitState.events = remoteModelCircuitState.events
    .filter(event => now - event.at < config.windowMs)
    .slice(-50);
  return remoteModelCircuitState.events;
}

function getRemoteModelCircuitStatus(now = Date.now()) {
  const config = getRemoteModelCircuitConfig();
  const events = pruneRemoteModelCircuitEvents(now, config);
  const failureCount = events.length;
  const timeoutCount = events.filter(event => event.type === 'timeout').length;
  const openedUntil = Math.max(0, Number(remoteModelCircuitState.openedUntil) || 0);
  const open = openedUntil > now;
  return {
    state: open ? 'open' : 'closed',
    open,
    openedUntil: open ? openedUntil : 0,
    retryAfterMs: open ? Math.max(1, openedUntil - now) : 0,
    consecutiveFailures: Math.max(0, Number(remoteModelCircuitState.consecutiveFailures) || 0),
    windowMs: config.windowMs,
    failureCount,
    timeoutCount,
    failureThreshold: config.failureThreshold,
    timeoutThreshold: config.timeoutThreshold,
    lastError: remoteModelCircuitState.lastError,
    lastErrorAt: remoteModelCircuitState.lastErrorAt || 0,
  };
}

function recordRemoteModelSuccess(now = Date.now()) {
  remoteModelCircuitState.consecutiveFailures = 0;
  remoteModelCircuitState.openedUntil = 0;
  pruneRemoteModelCircuitEvents(now);
}

function recordRemoteModelFailure(error = {}, now = Date.now()) {
  const config = getRemoteModelCircuitConfig();
  const summary = summarizeRemoteModelError(error);
  remoteModelCircuitState.consecutiveFailures += 1;
  remoteModelCircuitState.lastError = `${summary.type}:${summary.status || 'unknown'}:${summary.message}`;
  remoteModelCircuitState.lastErrorAt = now;
  remoteModelCircuitState.events.push({ at: now, type: summary.type, status: summary.status });

  const events = pruneRemoteModelCircuitEvents(now, config);
  const timeoutCount = events.filter(event => event.type === 'timeout').length;
  if (
    remoteModelCircuitState.consecutiveFailures >= config.failureThreshold
    || timeoutCount >= config.timeoutThreshold
  ) {
    remoteModelCircuitState.openedUntil = now + config.openMs;
  }

  return getRemoteModelCircuitStatus(now);
}

function resetRemoteModelCircuitForTests() {
  remoteModelCircuitState = {
    openedUntil: 0,
    consecutiveFailures: 0,
    lastError: '',
    lastErrorAt: 0,
    events: [],
  };
}

module.exports = {
  configureRemoteModelRuntime,
  getPublicRemoteModelBudgetConfig,
  getPublicRemoteModelBudgetDayKey,
  normalizePublicRemoteModelBudgetState,
  estimatePublicRemoteModelCostUnits,
  consumePublicRemoteModelBudget,
  resetPublicRemoteModelBudgetForTests,
  getRemoteModelCircuitConfig,
  summarizeRemoteModelError,
  getRemoteModelCircuitStatus,
  recordRemoteModelSuccess,
  recordRemoteModelFailure,
  resetRemoteModelCircuitForTests,
};
