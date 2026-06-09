import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  configureAiAssistantAnswerComposer,
  normalizeTemplateItems,
  composePlayerTemplateAnswer,
  getTemplateStrictModeCautions,
  composeClarificationAnswer,
  composeNoMatchAnswer,
  formatStructuredKnowledgeRecords,
  getResourceSourceTypeLabel,
  formatResourceLookupRecord,
  pickFastResourceSourceRecord,
  shouldUseResourceLookupAnswer,
  buildStructuredUnlockStatus,
  buildResourceRecommendedRoute,
  composeStructuredKnowledgeAnswer,
  shouldUseTaskDiagnosisAnswer,
  formatTaskDiagnosisCheckLine,
  composeTaskDiagnosisAnswer,
  shouldUseLocalDiagnostics,
  composeLocalDiagnosticsAnswer,
  composeSourceAnswer,
  composeGenericKnowledgeAnswer,
  buildLocalAnswerIntro,
  shouldPreferDirectKnowledgeMatch,
  shouldUseGeneralStructuredAnswer,
  composeLocalAnswerFromMatches,
  sanitizePublicSummaryText,
  appendRemoteModelFallbackNotice,
  getPublicSourceTypeLabel,
  getPublicModuleLabel,
  buildPublicEvidenceSummary,
  buildAiAssistantTraceSummary,
  getAskStreamPhases,
  splitAskStreamAnswer,
  buildAskStreamResultEvents,
} = require('../src/taoyuanAi/answerComposer');

configureAiAssistantAnswerComposer({
  routeLabels: {
    farm: '农场',
    quest: '任务',
    mining: '矿洞',
    cooking: '烹饪',
    workshop: '作坊加工',
  },
  sourceModuleLabels: {
    view: '页面视图',
    utils: '工具逻辑',
  },
  isUnsafePublicSummaryText: text => /server[\\/]+src|密钥|secret/i.test(String(text || '')),
});

assert.deepEqual(
  normalizeTemplateItems(['  第一步  ', '第一步', '', null, '第二步\n换行', '第三步', '第四步'], 3),
  ['第一步', '第二步 换行', '第三步'],
  'template items should normalize whitespace, de-duplicate and cap length'
);

const templateAnswer = composePlayerTemplateAnswer({
  intro: '你当前大概率在【任务】相关场景。',
  legacyLead: '关于“卡住了”，我先按公开资料回答。',
  conclusion: '',
  reasons: [' 命中公开资料 ', '命中公开资料', '关联页面：任务'],
  steps: ['步骤 1', '步骤 2', '步骤 3', '步骤 4', '步骤 5', '步骤 6 应截断'],
  cautions: ['注意公开资料边界。'],
  evidence: ['依据 A', '依据 A', '依据 B'],
  related: ['相关 A', '相关 B', '相关 C', '相关 D 应截断'],
});
assert.ok(templateAnswer.includes('结论：我暂时无法确认，需要更具体的问题或页面线索。'));
assert.ok(templateAnswer.includes('原因：\n1. 命中公开资料\n2. 关联页面：任务'));
assert.ok(templateAnswer.includes('步骤：\n1. 步骤 1\n2. 步骤 2\n3. 步骤 3\n4. 步骤 4\n5. 步骤 5'));
assert.ok(!templateAnswer.includes('步骤 6 应截断'), 'template steps should keep at most 5 items');
assert.ok(templateAnswer.includes('依据：\n1. 依据 A\n2. 依据 B'), 'template evidence should de-duplicate');
assert.ok(!templateAnswer.includes('相关 D 应截断'), 'template related section should keep at most 3 items');

assert.deepEqual(getTemplateStrictModeCautions('standard'), []);
assert.deepEqual(getTemplateStrictModeCautions('strict'), [
  '当前是严格模式：只使用玩家可见的公开资料或公开状态摘要，不提供隐藏数值、不公开规则或敏感信息。',
]);

const clarificationAnswer = composeClarificationAnswer({
  question: '怎么弄？',
  intro: '你当前大概率在【任务】相关场景。',
  routeName: 'mining',
  queryPlan: {
    routeHints: ['quest', 'farm', 'quest'],
    clarification: { options: ['查物品来源', '查任务缺口', '查系统玩法', '多余选项'] },
  },
});
assert.ok(clarificationAnswer.includes('关于“怎么弄？”，我还没识别出明确的物品、任务、NPC、地点或系统。'));
assert.ok(clarificationAnswer.includes('步骤：\n1. 查物品来源\n2. 查任务缺口\n3. 查系统玩法\n4. 也可以先打开这些相关页面再追问：矿洞、任务。'));
assert.ok(clarificationAnswer.includes('依据：\n1. 本地槽位抽取未命中明确对象。'));

const noMatchAnswer = composeNoMatchAnswer({
  question: '不存在的东西去哪找？',
  intro: '',
  routeName: '',
  queryPlan: {},
  mode: 'strict',
});
assert.ok(noMatchAnswer.includes('当前公开知识库没有找到足够匹配的条目。'));
assert.ok(noMatchAnswer.includes('也可以问“当前页面主要做什么”来获取页面级建议。'));
assert.ok(noMatchAnswer.includes('当前是严格模式：只使用玩家可见的公开资料或公开状态摘要，不提供隐藏数值、不公开规则或敏感信息。'));

assert.deepEqual(
  formatStructuredKnowledgeRecords([
    { label: '万物铺', detail: '基础种子', quantity: 2, conditions: ['春季', '解锁商店'] },
  ]),
  ['万物铺，基础种子，数量：2，条件：春季、解锁商店'],
);
assert.equal(getResourceSourceTypeLabel('shop'), '购买');
assert.equal(getResourceSourceTypeLabel('unknown-type'), 'unknown-type');
assert.equal(formatResourceLookupRecord({ type: 'mining', label: '矿洞', detail: '浅层' }), '【采矿】矿洞，浅层');

const resourceEntry = {
  title: '铜矿',
  kind: 'mineral',
  summary: '用于工具升级。',
  unlock: '进入矿洞后可采集。',
  routeHints: ['mining', 'workshop'],
  sources: [
    { type: 'drop', label: '宝箱', detail: '低概率获得' },
    { type: 'mining', label: '矿洞', detail: '浅层矿石' },
    { type: 'shop', label: '铁匠铺', detail: '偶尔出售' },
  ],
  uses: [{ type: 'upgrade', label: '工具升级', detail: '升级铜制工具' }],
};

assert.equal(pickFastResourceSourceRecord(resourceEntry).type, 'shop', 'resource source priority should prefer purchase before mining');
assert.equal(shouldUseResourceLookupAnswer(resourceEntry, { questionTypes: ['resource-source'] }, '铜矿从哪来？'), true);
assert.equal(shouldUseResourceLookupAnswer({ ...resourceEntry, kind: 'npc' }, { questionTypes: ['resource-source'] }, '铜矿从哪来？'), false);
assert.equal(
  buildStructuredUnlockStatus(resourceEntry, {
    baseState: { currentRouteName: 'mining', currentPageLabel: 'server/src/config.js' },
  }),
  '当前是否已解锁：当前问题来自【矿洞】相关入口，我只能确认它与该资源路线相关；实际资源、商品、建筑或配方是否已满足，以页面可见状态为准。公开条件：进入矿洞后可采集。',
  'unsafe current page labels should fall back to public route labels'
);
assert.equal(
  buildResourceRecommendedRoute({ title: '未知材料', routeHints: ['cooking'] }),
  '先查看烹饪，目前资料不足以给出更快路线。'
);

const resourceAnswer = composeStructuredKnowledgeAnswer({
  question: '铜矿怎么获得？当前是否解锁？',
  contextLabel: '矿洞',
  mode: 'strict',
  queryPlan: { routeName: 'mining', questionTypes: ['resource-source'] },
  contextSnapshot: { baseState: { currentRouteName: 'mining', currentPageLabel: '矿洞' } },
  matches: [
    { sourceType: 'structured-knowledge', structuredEntry: resourceEntry },
    {
      sourceType: 'structured-knowledge',
      title: '补充资料',
      structuredEntry: { title: '铁匠铺', summary: '偶尔出售矿石。' },
    },
  ],
});
assert.ok(resourceAnswer.includes('结论：资源反查：铜矿。用于工具升级。'));
assert.ok(resourceAnswer.includes('来源： 1. 【掉落】宝箱，低概率获得'));
assert.ok(resourceAnswer.includes('最快路线：【购买】铁匠铺，偶尔出售'));
assert.ok(resourceAnswer.includes('当前是否已解锁：当前问题来自【矿洞】相关入口'));
assert.ok(resourceAnswer.includes('结构化公开资料回答：铜矿'));
assert.ok(resourceAnswer.includes('相关：\n1. 铁匠铺：偶尔出售矿石。'));

const systemAnswer = composeStructuredKnowledgeAnswer({
  question: '鱼塘怎么玩？',
  contextLabel: '鱼塘',
  mode: 'standard',
  queryPlan: { questionTypes: ['system-mechanic'], intents: ['explain_system'] },
  matches: [
    {
      sourceType: 'structured-knowledge',
      structuredEntry: {
        title: '鱼塘系统',
        kind: 'system',
        summary: '用于养鱼和产出鱼塘材料。',
        routeHints: ['fishpond'],
        sources: [{ type: 'system', label: '鱼塘入口', detail: '家园侧边入口' }],
        uses: [{ type: 'system', label: '投喂', detail: '维持产出' }],
        relations: ['鱼饲料', '水质改良剂', '鱼苗'],
      },
    },
  ],
});
assert.ok(systemAnswer.includes('结论：用于养鱼和产出鱼塘材料。'));
assert.ok(systemAnswer.includes('使用/推进：投喂，维持产出'));
assert.ok(systemAnswer.includes('关联对象可作为后续追问线索：鱼饲料、水质改良剂、鱼苗。'));

const taskDiagnosis = {
  available: true,
  summary: '任务缺少铜矿和交付确认。',
  targetTask: { title: '阿石矿料委托', source: '当前公开任务摘要' },
  checks: [
    { kind: 'accepted', label: '接取状态', statusLabel: '已满足', detail: '已接取任务。' },
    { kind: 'objective', label: '目标', statusLabel: '已满足', detail: '交付铜矿3个。' },
    { kind: 'inventory', label: '库存', statusLabel: '阻塞', detail: '还缺铜矿2个。', nextStep: '先补齐铜矿。' },
    { kind: 'delivery', label: '交付对象/地点', statusLabel: '未确认', detail: '需要回任务页确认。' },
  ],
  blockedChecks: [
    { kind: 'inventory', label: '库存', detail: '还缺铜矿2个。' },
  ],
  routeSteps: ['去矿洞或铁匠铺补齐铜矿。', '回任务页确认交付对象。'],
};
const taskQueryPlan = {
  questionTypes: ['task-diagnosis'],
  intents: ['diagnose_task'],
  slots: { tasks: [{ label: '阿石矿料委托' }] },
};
const taskDiagnostics = { available: true, taskDiagnosis, suggestions: [] };
assert.equal(shouldUseTaskDiagnosisAnswer('阿石矿料委托任务卡住了，缺什么？', taskQueryPlan, taskDiagnostics), true);
assert.equal(shouldUseTaskDiagnosisAnswer('阿石矿料委托任务卡住了，缺什么？', { ...taskQueryPlan, answerMode: 'code' }, taskDiagnostics), false);
assert.equal(
  formatTaskDiagnosisCheckLine(taskDiagnosis, 'inventory'),
  '库存：阻塞。还缺铜矿2个。 下一步：先补齐铜矿。'
);
assert.equal(
  formatTaskDiagnosisCheckLine(taskDiagnosis, 'time'),
  '时间：当前公开摘要未给出，我不会臆造。'
);

const taskAnswer = composeTaskDiagnosisAnswer({
  question: '阿石矿料委托任务卡住了，缺什么？',
  intro: '你当前大概率在【任务】相关场景。',
  taskDiagnosis,
  mode: 'strict',
});
assert.ok(taskAnswer.includes('结论：「阿石矿料委托」当前主要卡在：库存。'));
assert.ok(taskAnswer.includes('任务条件逐项核对： 接取状态：已满足。已接取任务。'));
assert.ok(taskAnswer.includes('库存：阻塞。还缺铜矿2个。 下一步：先补齐铜矿。'));
assert.ok(taskAnswer.includes('下一步路线： 1. 去矿洞或铁匠铺补齐铜矿。 2. 回任务页确认交付对象。'));
assert.ok(taskAnswer.includes('这是只读诊断：我不会自动交任务、消耗背包物品、发奖励或改存档。'));

const localDiagnostics = {
  available: true,
  summary: '今天优先处理任务和体力。',
  signals: [{ id: 'task' }, { id: 'stamina' }],
  suggestions: [
    {
      title: '任务阻塞：铜矿',
      score: 92,
      reasons: ['任务阻塞', '收益高'],
      recommendation: '先补齐铜矿再交付。',
      routeLabel: '任务',
    },
    {
      title: '体力偏低',
      score: 70,
      reasons: ['体力风险'],
      recommendation: '先吃恢复道具。',
      routeLabel: '',
    },
  ],
};
assert.equal(shouldUseLocalDiagnostics('我今天该做什么？', { questionTypes: ['today-planning'] }, localDiagnostics), true);
assert.equal(shouldUseLocalDiagnostics('我今天该做什么？', { sourcePreference: 'strong' }, localDiagnostics), false);
const localAnswer = composeLocalDiagnosticsAnswer({
  question: '我今天该做什么？',
  intro: '',
  diagnostics: localDiagnostics,
  mode: 'standard',
  queryPlan: { questionTypes: ['today-planning'] },
});
assert.ok(localAnswer.includes('结论：优先处理「任务阻塞：铜矿」（评分 92）。'));
assert.ok(localAnswer.includes('任务阻塞：铜矿：评分 92；原因：任务阻塞；收益高'));
assert.ok(localAnswer.includes('建议：先补齐铜矿再交付。；建议查看：任务'));
assert.ok(localAnswer.includes('本地诊断：今天优先处理任务和体力。'));

const localTaskAnswer = composeLocalDiagnosticsAnswer({
  question: '阿石矿料委托任务卡住了，缺什么？',
  intro: '',
  diagnostics: { ...localDiagnostics, taskDiagnosis },
  mode: 'strict',
  queryPlan: taskQueryPlan,
});
assert.ok(localTaskAnswer.includes('我先按当前公开任务摘要做任务诊断。'));
assert.ok(!localTaskAnswer.includes('优先处理「任务阻塞：铜矿」'), 'task diagnosis should take priority over generic diagnostics');

const sourceAnswer = composeSourceAnswer({
  question: '作物图片在哪里实现？',
  intro: '你当前大概率在【农场】相关场景。',
  mode: 'strict',
  matches: [
    {
      sourceType: 'source-directory',
      title: '模块目录：农场图片',
      content: '包含作物图片组件和偏好设置。',
    },
    {
      sourceType: 'source-fullfile',
      path: 'taoyuan-main/src/components/game/CropImage.vue',
      originTitle: 'CropImage 组件',
      symbol: 'renderCropImage',
      lineNumber: 42,
      content: '根据作物 ID 和图片偏好渲染图片。',
    },
    {
      sourceType: 'source-index',
      title: '作物图片偏好',
      content: '偏好存储在 useCropImagePreferences。',
    },
  ],
});
assert.ok(sourceAnswer.includes('关于“作物图片在哪里实现？”，我优先按命中的源码文件回答。'));
assert.ok(sourceAnswer.includes('模块目录：农场图片\n\n包含作物图片组件和偏好设置。'));
assert.ok(sourceAnswer.includes('命中文件 1：taoyuan-main/src/components/game/CropImage.vue'));
assert.ok(sourceAnswer.includes('命中依据：CropImage 组件'));
assert.ok(sourceAnswer.includes('关联符号：renderCropImage（第 42 行附近）'));
assert.ok(sourceAnswer.includes('补充线索：\n1. 作物图片偏好：偏好存储在 useCropImagePreferences。'));
assert.ok(sourceAnswer.includes('当前是严格模式：涉及隐藏数值、掉率、风控、后台规则或敏感实现的内容不会提供。'));

const sourceFallbackAnswer = composeSourceAnswer({
  question: '源码线索是什么？',
  mode: 'standard',
  matches: [
    {
      sourceType: 'source-index',
      title: '检索命中',
      content: '最相关的公开索引摘要。',
    },
  ],
});
assert.ok(sourceFallbackAnswer.includes('最相关证据：\n\n最相关的公开索引摘要。'));
assert.ok(!sourceFallbackAnswer.includes('当前是严格模式'), 'standard source answers should not add strict caution');

const genericAnswer = composeGenericKnowledgeAnswer({
  question: '桃子怎么种？',
  intro: '',
  mode: 'strict',
  matches: [
    {
      title: '桃子种植',
      content: '春季播种，成熟前每天浇水。',
      routeHints: ['farm', 'quest'],
    },
    {
      title: '浇水提示',
      content: '缺水会暂停生长。',
    },
  ],
});
assert.ok(genericAnswer.includes('关于“桃子怎么种？”，根据当前可用的桃源乡资料：'));
assert.ok(genericAnswer.includes('结论：春季播种，成熟前每天浇水。'));
assert.ok(genericAnswer.includes('命中公开资料：桃子种植'));
assert.ok(genericAnswer.includes('关联页面：农场、任务。'));
assert.ok(genericAnswer.includes('浇水提示：缺水会暂停生长。'));
assert.ok(genericAnswer.includes('依据：\n1. 桃子种植\n2. 浇水提示'));
assert.ok(genericAnswer.includes('当前是严格模式：只使用玩家可见的公开资料或公开状态摘要，不提供隐藏数值、不公开规则或敏感信息。'));

assert.equal(buildLocalAnswerIntro({ routeName: 'farm' }), '你当前大概率在【农场】相关场景。');
assert.equal(buildLocalAnswerIntro({ contextLabel: '矿洞', routeName: 'farm' }), '你当前大概率在【矿洞】相关场景。');
assert.equal(
  shouldPreferDirectKnowledgeMatch(
    [{ sourceType: 'manual', score: 30 }],
    [{ sourceType: 'structured-knowledge', score: 20 }]
  ),
  true,
  'manual knowledge with equal-or-higher score should stay ahead of structured fallback'
);
assert.equal(
  shouldPreferDirectKnowledgeMatch(
    [{ sourceType: 'manual', score: 5 }],
    [{ sourceType: 'structured-knowledge', score: 20 }]
  ),
  false,
);
assert.equal(shouldUseGeneralStructuredAnswer('铜矿怎么获得？', {}), true);
assert.equal(shouldUseGeneralStructuredAnswer('随便聊聊', {}), false);

const localStructuredAnswer = composeLocalAnswerFromMatches({
  question: '铜矿怎么获得？',
  contextLabel: '矿洞',
  mode: 'strict',
  queryPlan: {
    questionTypes: ['resource-source'],
    slots: { items: [{ label: '铜矿' }] },
  },
  contextSnapshot: { baseState: { currentRouteName: 'mining', currentPageLabel: '矿洞' } },
  matches: [
    {
      sourceType: 'structured-knowledge',
      score: 80,
      structuredEntry: resourceEntry,
    },
  ],
});
assert.ok(localStructuredAnswer.includes('关于“铜矿怎么获得？”，我先按结构化公开资料回答：铜矿。'));
assert.ok(localStructuredAnswer.includes('资源反查：铜矿'));

const localDirectAnswer = composeLocalAnswerFromMatches({
  question: '铜矿',
  routeName: 'mining',
  mode: 'standard',
  queryPlan: {},
  matches: [
    {
      sourceType: 'manual',
      title: '铜矿公开手册',
      content: '优先展示管理知识库中更精确的公开条目。',
      score: 120,
      routeHints: ['mining'],
    },
    {
      sourceType: 'structured-knowledge',
      score: 40,
      structuredEntry: resourceEntry,
    },
  ],
});
assert.ok(localDirectAnswer.includes('你当前大概率在【矿洞】相关场景。'));
assert.ok(localDirectAnswer.includes('命中公开资料：铜矿公开手册'));
assert.ok(!localDirectAnswer.includes('结构化公开资料回答'), 'high-score direct knowledge should not be replaced by structured answer');

const localCodeAnswer = composeLocalAnswerFromMatches({
  question: '作物图片源码在哪里？',
  mode: 'standard',
  queryPlan: { answerMode: 'code' },
  matches: [
    {
      sourceType: 'source-index',
      title: '源码索引',
      content: 'CropImage.vue 包含作物图片渲染。',
    },
  ],
});
assert.ok(localCodeAnswer.includes('我优先按命中的源码文件回答。'));
assert.ok(localCodeAnswer.includes('最相关证据：\n\nCropImage.vue 包含作物图片渲染。'));

const localClarificationAnswer = composeLocalAnswerFromMatches({
  question: '怎么弄？',
  routeName: 'quest',
  mode: 'strict',
  queryPlan: { clarification: { required: true, options: ['查来源', '查任务', '查页面'] } },
  matches: [],
});
assert.ok(localClarificationAnswer.includes('我还没识别出明确的物品、任务、NPC、地点或系统。'));
assert.ok(!localClarificationAnswer.includes('暂时无法从当前整理的公开游戏资料中确认答案'), 'clarification should happen before no-match fallback');

assert.equal(sanitizePublicSummaryText('  可以公开的摘要  '), '可以公开的摘要');
assert.equal(sanitizePublicSummaryText('server/src/config.js', '安全摘要'), '安全摘要');
assert.equal(sanitizePublicSummaryText('', 'fallback'), 'fallback');
assert.equal(
  sanitizePublicSummaryText('A'.repeat(150)).length,
  120,
  'public summary should be capped at 120 chars'
);

assert.equal(
  appendRemoteModelFallbackNotice('本地答案', '（模型响应失败）'),
  '本地答案\n\n（提示：远程模型暂不可用，本次使用内置知识库回答。原因：模型响应失败。）',
  'fallback notice should sanitize parentheses in reason'
);
assert.equal(
  appendRemoteModelFallbackNotice('', 'server/src/config.js'),
  '（提示：远程模型暂不可用，本次使用内置知识库回答。）',
  'unsafe fallback reason should be hidden'
);

assert.equal(getPublicSourceTypeLabel('manual'), '管理知识库');
assert.equal(getPublicSourceTypeLabel('unknown'), '知识资料');
assert.equal(getPublicModuleLabel({ sourceType: 'source-auto', moduleType: 'view' }), '知识库整理');
assert.equal(getPublicModuleLabel({ sourceType: 'source-index', moduleType: 'view' }), '页面视图');
assert.equal(getPublicModuleLabel({ sourceType: 'manual', moduleType: 'utils' }), '管理知识库');

const evidenceSummary = buildPublicEvidenceSummary([
  {
    id: 'hit_1',
    title: '任务来源',
    sourceType: 'manual',
    routeHints: ['quest', 'quest', 'farm'],
    moduleType: 'view',
    truncated: true,
  },
  {
    title: 'server/src/config.js',
    originTitle: '安全替代',
    sourceType: 'source-index',
    routeNames: ['mining'],
    moduleType: 'utils',
  },
  { title: '第三条', kind: 'source-symbol' },
  { title: '第四条', sourceType: 'built-in' },
  { title: '第五条应截断', sourceType: 'manual' },
]);
assert.equal(evidenceSummary.length, 4, 'public evidence summary should keep at most 4 items');
assert.deepEqual(evidenceSummary[0], {
  id: 'hit_1',
  title: '任务来源',
  sourceType: 'manual',
  sourceTypeLabel: '管理知识库',
  moduleType: 'view',
  moduleLabel: '管理知识库',
  routeHints: ['任务', '农场'],
  truncated: true,
});
assert.equal(evidenceSummary[1].title, '知识资料', 'unsafe evidence title should fall back');
assert.equal(evidenceSummary[1].moduleLabel, '工具逻辑');
assert.equal(evidenceSummary[2].id, 'E3');

const traceSummary = buildAiAssistantTraceSummary({
  provider: 'model',
  mode: 'standard',
  evidence: evidenceSummary,
  modelTrace: {
    structured: {
      uncertain_points: ['需要更多材料', 'secret token', '可公开不确定点', '第四条截断'],
    },
  },
});
assert.equal(traceSummary.provider, 'model');
assert.equal(traceSummary.providerLabel, '远程模型');
assert.equal(traceSummary.modeLabel, '标准模式');
assert.equal(traceSummary.uncertain, true);
assert.deepEqual(traceSummary.uncertainPoints, ['需要更多材料', '可公开不确定点', '第四条截断']);
assert.equal(traceSummary.evidenceCount, 4);
assert.ok(traceSummary.sourceTypes.includes('管理知识库'));

const guardedTraceSummary = buildAiAssistantTraceSummary({
  provider: 'unknown',
  mode: 'strict',
  evidence: evidenceSummary,
  modelTrace: { structured: { uncertain_points: ['不应展示'] } },
  outputGuard: { blocked: true },
});
assert.equal(guardedTraceSummary.provider, 'local', 'unknown providers should fall back to local');
assert.equal(guardedTraceSummary.uncertain, false, 'guarded traces should suppress uncertain points');
assert.deepEqual(guardedTraceSummary.uncertainPoints, []);

const phases = getAskStreamPhases();
assert.equal(phases.length, 4);
phases[0].phase = 'mutated';
assert.equal(getAskStreamPhases()[0].phase, 'understanding', 'stream phases should be cloned');

assert.deepEqual(splitAskStreamAnswer('abcdef', 2), ['ab', 'cd', 'ef']);
assert.deepEqual(splitAskStreamAnswer('', 2), []);

const streamEvents = buildAskStreamResultEvents({
  answer: 'A'.repeat(205),
  evidence: evidenceSummary.slice(0, 1),
  sources: ['任务来源'],
  suggestions: [{ label: '打开任务', type: 'open_quest' }],
  mode: 'standard',
  provider: 'fallback',
});
assert.equal(streamEvents.filter(event => event.event === 'delta').length, 3);
assert.equal(streamEvents[0].data.delta.length, 96);
assert.equal(streamEvents.at(-2).event, 'evidence');
assert.equal(streamEvents.at(-2).data.provider, 'fallback');
assert.equal(streamEvents.at(-1).event, 'done');
assert.equal(streamEvents.at(-1).data.done, true);
assert.equal(streamEvents.at(-1).data.traceSummary.fallback, true);

console.log('qa-ai-assistant-answer-composer passed');
