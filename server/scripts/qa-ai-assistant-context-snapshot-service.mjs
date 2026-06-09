import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildContextSnapshotText,
  containsSensitiveContextText,
  finalizeContextSnapshotText,
  getContextObject,
  normalizeContextList,
  normalizeContextNumber,
  normalizeContextText,
} = require('../src/taoyuanAi/contextSnapshotService');

assert.equal(getContextObject({ ok: true })?.ok, true, 'plain objects should be accepted');
assert.equal(getContextObject(null), null, 'null should not be a context object');
assert.equal(getContextObject([]), null, 'arrays should not be context objects');

assert.equal(normalizeContextText('  背包   23/24 格  ', 80), '背包 23/24 格');
assert.equal(normalizeContextText({ hidden: 'object' }), '', 'objects should never stringify into context text');
assert.equal(normalizeContextText('abcdef', 3), 'abc...', 'long text should be clipped');
assert.equal(normalizeContextText('apiKey=fixture-secret-not-real'), '', 'api key markers should be filtered');
assert.equal(normalizeContextText('process.env.TAOYUAN_AI_ASSISTANT_API_KEY'), '', 'process env markers should be filtered');
assert.equal(normalizeContextText('server/src/taoyuanAiAssistant.js'), '', 'internal source paths should be filtered');
assert.equal(containsSensitiveContextText('backend_rule_fixture=deny'), true);
assert.equal(containsSensitiveContextText('夏末青菜2块还未收获'), false);

assert.equal(normalizeContextNumber('12.9'), 12);
assert.equal(normalizeContextNumber('12.9', false), 12.9);
assert.equal(normalizeContextNumber('not-a-number'), null);
assert.deepEqual(
  normalizeContextList(['铜矿', '铜矿', 'apiKey=fixture-secret-not-real', '木材', '石材'], 2, 20),
  ['铜矿', '木材'],
  'context list should dedupe, filter sensitive values, and cap item count',
);

const snapshot = {
  contextVersion: 2,
  baseState: {
    currentPageLabel: '任务',
    year: 1,
    seasonLabel: '夏季',
    day: 27,
    weatherLabel: '晴',
    timePeriod: 'evening',
    stamina: 20,
    maxStamina: 120,
    money: 300,
  },
  weeklyPlan: {
    primaryRouteSummary: '先补铜矿再交付阿石委托',
    sourceLabels: ['任务', '任务', 'process.env'],
  },
  inventory: {
    slotUsageLabel: '背包23/24格',
    keyResourceLabels: ['铜矿1', '木材12'],
    shortageLabels: ['阿石矿料委托缺铜矿2', 'backend_rule_fixture=deny'],
    toolLevelLabels: ['铜锄 Lv2'],
    pendingToolUpgradeLabel: '铜锄升级缺铜矿2和现金300文',
  },
  farming: {
    plotStatusLabel: '12块地，3块缺水',
    harvestableLabels: ['青菜2块'],
    waterRiskLabels: ['3块菜地缺水'],
    seasonRiskLabels: ['夏末青菜2块还未收获'],
  },
  animals: {
    buildingLabels: ['鸡舍 Lv1'],
    animalStatusLabel: '2只鸡已喂食',
    productLabels: ['鸡蛋2个'],
    careAlertLabels: ['明早记得收蛋'],
  },
  buildings: {
    farmhouseLabel: '农舍 Lv1',
    greenhouseLabel: '未修复',
    animalBuildingLabels: ['鸡舍 Lv1'],
    villageProjectLabel: '鸡舍升级缺木材10',
    availableProjectLabels: ['温室修复'],
  },
  quests: {
    mainQuestLabel: '认识村民',
    mainQuestObjectiveLabels: ['拜访阿石'],
    activeQuestLabels: ['阿石矿料委托'],
    boardQuestLabels: ['收集木材10'],
    specialOrderLabel: '无',
    limitedTimeQuestLabel: '无',
    claimableLabels: ['主线阶段奖励可领'],
    blockerLabels: ['阿石矿料委托缺铜矿2', 'hiddenDropRateFixture=0.99'],
    shortageLabels: ['铜矿2'],
  },
  lateGame: {
    fishPondLabel: '鱼塘未解锁',
    fishPondAlertLabels: ['无'],
    breedingLabel: '育种未解锁',
    breedingAlertLabels: ['无'],
    museumLabel: '博物馆待捐赠1件',
    museumAlertLabels: ['鱼类图鉴缺1'],
    guildLabel: '公会 Lv1',
    guildAlertLabels: ['今日贡献未领'],
    hanhaiLabel: '瀚海未开启',
    hanhaiAlertLabels: ['无'],
  },
  online: {
    saveSyncLabel: '云存档已同步',
    mailboxLabel: '有2封可领取邮件',
    mailClaimableLabels: ['节日礼物', '节日礼物', 'access_token=secret'],
    hallLabel: '交流大厅暂无邀请',
    festivalRoomLabel: '灯会房间剩30分钟待确认',
    coopOrderLabel: '委托交付待确认',
    coopCompensationLabel: '无补偿',
    cohabitationLabel: '同住待确认',
    societyLabel: '村社暂无提醒',
    onlineAlertLabels: ['灯会房间剩30分钟待确认'],
  },
  currentThemeWeekLabel: '夏末准备',
  currentEventCampaignLabel: '灯会',
  currentLimitedQuestLabel: '夏末收获',
  primaryRouteLabel: '任务推进',
  secondaryRouteLabels: ['采矿', '种植'],
  claimableNodeLabels: ['主线阶段奖励'],
  nextWeekPrepSummary: '准备秋季种子',
  activeFamilyWishTitle: '想吃青菜',
  bondedSpiritName: '小桃',
  highlightedRouteLabels: ['任务', '采矿'],
  previewMailTitles: ['节日礼物', '系统补给'],
  backend_rule_fixture: 'root should be ignored',
};

const text = buildContextSnapshotText(snapshot);
for (const expected of [
  '上下文版本：v2',
  '当前页面：任务',
  '当前日期：第1年 夏季 第27天',
  '当前时段：傍晚',
  '当前体力：20/120',
  '当前金钱：300文',
  '资源缺口：阿石矿料委托缺铜矿2',
  '邮箱可领取：节日礼物',
]) {
  assert.ok(text.includes(expected), `context text should include ${expected}`);
}

for (const hidden of [
  'backend_rule_fixture',
  'hiddenDropRateFixture',
  'access_token',
  'process.env',
  'root should be ignored',
]) {
  assert.equal(text.includes(hidden), false, `context text should not include ${hidden}`);
}

assert.equal(buildContextSnapshotText(null), '', 'null snapshot should produce empty text');
assert.equal(buildContextSnapshotText([]), '', 'array snapshot should produce empty text');

const compactText = buildContextSnapshotText({
  contextVersion: 2,
  highlightedRouteLabels: ['任务', '采矿'],
  previewMailTitles: ['节日礼物', '系统补给'],
});
assert.ok(compactText.includes('推荐路线：任务、采矿'), 'compact context should include highlighted routes');
assert.ok(compactText.includes('邮件节奏：节日礼物、系统补给'), 'compact context should include mail rhythm labels');

const longLines = Array.from({ length: 80 }, (_, index) => `公开字段${index}：${'x'.repeat(80)}`);
const finalized = finalizeContextSnapshotText(longLines);
assert.ok(finalized.includes('上下文已按公开字段白名单截断'), 'long context should include truncation marker');
assert.equal(finalized.includes('apiKey=fixture-secret-not-real'), false, 'finalization should still filter sensitive text');

console.log('qa-ai-assistant-context-snapshot-service passed');
