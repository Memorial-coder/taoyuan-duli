function summarizeTaskDiagnosisTargetTask(targetTask = null) {
  if (!targetTask || typeof targetTask !== 'object') return null;
  return {
    id: targetTask.id,
    title: targetTask.title,
    acceptedStatus: targetTask.acceptedStatus,
    source: targetTask.source,
    labels: Array.isArray(targetTask.labels) ? targetTask.labels : [],
  };
}

function summarizeTaskDiagnosisForTrace(taskDiagnosis = {}) {
  return {
    available: taskDiagnosis?.available === true,
    summary: taskDiagnosis?.summary || '',
    targetTask: summarizeTaskDiagnosisTargetTask(taskDiagnosis?.targetTask || null),
    checks: (taskDiagnosis?.checks || []).map(item => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      status: item.status,
      statusLabel: item.statusLabel,
      detail: item.detail,
      nextStep: item.nextStep,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      source: item.source,
      itemName: item.itemName || '',
      quantityText: item.quantityText || '',
    })),
    blockedChecks: (taskDiagnosis?.blockedChecks || []).map(item => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      status: item.status,
      detail: item.detail,
      nextStep: item.nextStep,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      source: item.source,
    })),
    routeSteps: taskDiagnosis?.routeSteps || [],
  };
}

function summarizeLocalDiagnosticsForTrace(diagnostics = {}) {
  return {
    available: diagnostics?.available === true,
    summary: diagnostics?.summary || '',
    taskDiagnosis: summarizeTaskDiagnosisForTrace(diagnostics?.taskDiagnosis || {}),
    signals: (diagnostics?.signals || []).map(item => ({
      id: item.id,
      category: item.category,
      categoryLabel: item.categoryLabel,
      title: item.title,
      detail: item.detail,
      recommendation: item.recommendation,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      score: item.score,
      reasons: item.reasons || [],
      dimensions: item.dimensions || {},
      source: item.source || '',
    })),
    suggestions: (diagnostics?.suggestions || []).map(item => ({
      id: item.id,
      category: item.category,
      categoryLabel: item.categoryLabel,
      title: item.title,
      recommendation: item.recommendation,
      routeName: item.routeName,
      routeLabel: item.routeLabel,
      score: item.score,
      reasons: item.reasons || [],
      dimensions: item.dimensions || {},
    })),
  };
}

module.exports = {
  summarizeTaskDiagnosisTargetTask,
  summarizeTaskDiagnosisForTrace,
  summarizeLocalDiagnosticsForTrace,
};
