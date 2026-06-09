const {
  OUTPUT_SECRET_PATTERNS,
  OUTPUT_INTERNAL_PATH_PATTERNS,
} = require('./safetyGuard');

const AI_CONTEXT_MAX_LINES = 64;
const AI_CONTEXT_MAX_TEXT_LENGTH = 3600;

const AI_CONTEXT_TIME_PERIOD_LABELS = Object.freeze({
  morning: '上午',
  afternoon: '下午',
  evening: '傍晚',
  night: '夜晚',
  late_night: '深夜',
});

const AI_CONTEXT_SENSITIVE_TEXT_PATTERNS = [
  ...OUTPUT_SECRET_PATTERNS,
  ...OUTPUT_INTERNAL_PATH_PATTERNS,
  /(?:api[_ -]?key|apikey|access[_ -]?token|refresh[_ -]?token|secret|密钥|令牌)/i,
  /(?:后台规则|后台配置|风控|隐藏掉率|完整源码|源码文件|process\.env)/i,
  /(?:adminCompensationAuditId|internalReceiptIdempotencyKey|hiddenRiskRule|hiddenDropRateFixture|backend_rule_fixture)/i,
];

function getContextObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function containsSensitiveContextText(value = '') {
  const text = String(value || '');
  if (!text) return false;
  return AI_CONTEXT_SENSITIVE_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

function normalizeContextText(value, maxLength = 80) {
  if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return '';
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (containsSensitiveContextText(text)) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeContextNumber(value, integer = true) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return integer ? Math.floor(numberValue) : numberValue;
}

function normalizeContextList(value, maxItems = 4, maxLength = 60) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => normalizeContextText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function pushContextLine(lines, label, value, maxLength = 80) {
  const text = normalizeContextText(value, maxLength);
  if (text) lines.push(`${label}：${text}`);
}

function pushContextList(lines, label, value, maxItems = 4, maxLength = 60) {
  const items = normalizeContextList(value, maxItems, maxLength);
  if (items.length > 0) lines.push(`${label}：${items.join('、')}`);
}

function finalizeContextSnapshotText(lines = []) {
  const safeLines = [];
  let usedLength = 0;
  for (const line of lines) {
    const text = normalizeContextText(line, 240);
    if (!text) continue;
    const projectedLength = usedLength + text.length + (safeLines.length > 0 ? 3 : 0);
    if (safeLines.length >= AI_CONTEXT_MAX_LINES || projectedLength > AI_CONTEXT_MAX_TEXT_LENGTH) {
      safeLines.push('上下文已按公开字段白名单截断');
      break;
    }
    safeLines.push(text);
    usedLength = projectedLength;
  }
  return safeLines.join(' / ');
}

function buildContextSnapshotText(snapshot = null) {
  const context = getContextObject(snapshot);
  if (!context) return '';
  const lines = [];
  const contextVersion = normalizeContextNumber(context.contextVersion ?? context.version);
  const baseState = getContextObject(context.baseState) || getContextObject(context.base);
  const weeklyPlan = getContextObject(context.weeklyPlan);
  const inventory = getContextObject(context.inventory);
  const farming = getContextObject(context.farming);
  const animals = getContextObject(context.animals);
  const buildings = getContextObject(context.buildings);
  const quests = getContextObject(context.quests);
  const lateGame = getContextObject(context.lateGame);
  const online = getContextObject(context.online);

  if (contextVersion) lines.push(`上下文版本：v${contextVersion}`);
  if (baseState) {
    const year = normalizeContextNumber(baseState.year);
    const day = normalizeContextNumber(baseState.day);
    const seasonLabel = normalizeContextText(baseState.seasonLabel || baseState.season, 40);
    const dateLabel = normalizeContextText(baseState.dateLabel, 80)
      || (year && day && seasonLabel ? `第${year}年 ${seasonLabel} 第${day}天` : '');
    const timePeriod = normalizeContextText(baseState.timePeriod, 40);
    const timePeriodLabel = normalizeContextText(baseState.timePeriodLabel, 40)
      || (timePeriod ? AI_CONTEXT_TIME_PERIOD_LABELS[timePeriod] || '' : '');
    const timeLabel = [normalizeContextText(baseState.timeLabel, 40), timePeriodLabel].filter(Boolean).join(' ');
    const stamina = normalizeContextNumber(baseState.stamina);
    const maxStamina = normalizeContextNumber(baseState.maxStamina);
    const staminaLabel = normalizeContextText(baseState.staminaLabel, 40)
      || (stamina !== null && maxStamina !== null ? `${stamina}/${maxStamina}` : '');
    const money = normalizeContextNumber(baseState.money);
    const moneyLabel = normalizeContextText(baseState.moneyLabel, 40)
      || (money !== null ? `${money}文` : '');

    pushContextLine(lines, '当前页面', baseState.currentPageLabel || baseState.currentRouteName, 80);
    pushContextLine(lines, '当前日期', dateLabel, 80);
    pushContextLine(lines, '当前天气', baseState.weatherLabel || baseState.weather, 40);
    pushContextLine(lines, '当前时段', timeLabel, 80);
    pushContextLine(lines, '当前体力', staminaLabel, 40);
    pushContextLine(lines, '当前金钱', moneyLabel, 40);
  }
  if (weeklyPlan) {
    pushContextLine(lines, '本周路线摘要', weeklyPlan.primaryRouteSummary, 160);
    pushContextList(lines, '本周计划来源', weeklyPlan.sourceLabels, 4, 60);
  }
  if (inventory) {
    pushContextLine(lines, '背包摘要', inventory.slotUsageLabel, 100);
    pushContextList(lines, '关键资源', inventory.keyResourceLabels, 5, 60);
    pushContextList(lines, '资源缺口', inventory.shortageLabels, 5, 80);
    pushContextList(lines, '工具等级', inventory.toolLevelLabels, 7, 40);
    pushContextLine(lines, '工具升级', inventory.pendingToolUpgradeLabel, 80);
  }
  if (farming) {
    pushContextLine(lines, '农田摘要', farming.plotStatusLabel, 120);
    pushContextList(lines, '可收获', farming.harvestableLabels, 4, 60);
    pushContextList(lines, '缺水提醒', farming.waterRiskLabels, 4, 60);
    pushContextList(lines, '换季风险', farming.seasonRiskLabels, 4, 80);
    pushContextLine(lines, '温室摘要', farming.greenhouseLabel, 80);
  }
  if (animals) {
    pushContextList(lines, '动物建筑', animals.buildingLabels, 4, 50);
    pushContextLine(lines, '动物摘要', animals.animalStatusLabel, 100);
    pushContextList(lines, '动物产出', animals.productLabels, 4, 80);
    pushContextList(lines, '照料提醒', animals.careAlertLabels, 4, 80);
  }
  if (buildings) {
    pushContextLine(lines, '农舍等级', buildings.farmhouseLabel, 80);
    pushContextLine(lines, '建筑温室', buildings.greenhouseLabel, 80);
    pushContextList(lines, '建筑等级', buildings.animalBuildingLabels, 4, 50);
    pushContextLine(lines, '村庄工程', buildings.villageProjectLabel, 100);
    pushContextList(lines, '可推进工程', buildings.availableProjectLabels, 4, 60);
  }
  if (quests) {
    pushContextLine(lines, '主线任务', quests.mainQuestLabel, 100);
    pushContextList(lines, '主线目标', quests.mainQuestObjectiveLabels, 4, 90);
    pushContextList(lines, '当前任务', quests.activeQuestLabels, 4, 90);
    pushContextList(lines, '告示板任务', quests.boardQuestLabels, 3, 90);
    pushContextLine(lines, '特殊订单', quests.specialOrderLabel, 100);
    pushContextLine(lines, '限时任务摘要', quests.limitedTimeQuestLabel, 100);
    pushContextList(lines, '可领奖励', quests.claimableLabels, 5, 80);
    pushContextList(lines, '阻塞条件', quests.blockerLabels, 5, 90);
    pushContextList(lines, '任务缺口', quests.shortageLabels, 5, 80);
  }
  if (lateGame) {
    pushContextLine(lines, '鱼塘摘要', lateGame.fishPondLabel, 120);
    pushContextList(lines, '鱼塘提醒', lateGame.fishPondAlertLabels, 4, 80);
    pushContextLine(lines, '育种摘要', lateGame.breedingLabel, 120);
    pushContextList(lines, '育种提醒', lateGame.breedingAlertLabels, 4, 80);
    pushContextLine(lines, '博物馆摘要', lateGame.museumLabel, 120);
    pushContextList(lines, '博物馆提醒', lateGame.museumAlertLabels, 4, 80);
    pushContextLine(lines, '公会摘要', lateGame.guildLabel, 120);
    pushContextList(lines, '公会提醒', lateGame.guildAlertLabels, 4, 80);
    pushContextLine(lines, '瀚海摘要', lateGame.hanhaiLabel, 120);
    pushContextList(lines, '瀚海提醒', lateGame.hanhaiAlertLabels, 4, 80);
  }
  if (online) {
    pushContextLine(lines, '云存档摘要', online.saveSyncLabel, 120);
    pushContextLine(lines, '邮箱摘要', online.mailboxLabel, 100);
    pushContextList(lines, '邮箱可领取', online.mailClaimableLabels, 4, 70);
    pushContextLine(lines, '交流大厅提示', online.hallLabel, 120);
    pushContextLine(lines, '节会房间', online.festivalRoomLabel, 120);
    pushContextLine(lines, '委托交付', online.coopOrderLabel, 120);
    pushContextLine(lines, '委托补偿', online.coopCompensationLabel, 100);
    pushContextLine(lines, '同住摘要', online.cohabitationLabel, 120);
    pushContextLine(lines, '村社摘要', online.societyLabel, 120);
    pushContextList(lines, '在线提醒', online.onlineAlertLabels, 5, 80);
  }
  pushContextLine(lines, '本周主题', context.currentThemeWeekLabel);
  pushContextLine(lines, '当前活动', context.currentEventCampaignLabel);
  pushContextLine(lines, '限时任务', context.currentLimitedQuestLabel);
  pushContextLine(lines, '本周主线', context.primaryRouteLabel);
  pushContextList(lines, '辅助路线', context.secondaryRouteLabels, 3, 60);
  pushContextList(lines, '可领奖点', context.claimableNodeLabels, 4, 80);
  pushContextLine(lines, '下周准备', context.nextWeekPrepSummary, 180);
  pushContextLine(lines, '家庭焦点', context.activeFamilyWishTitle);
  pushContextLine(lines, '仙缘焦点', context.bondedSpiritName);
  pushContextList(lines, '推荐路线', context.highlightedRouteLabels, 4, 60);
  pushContextList(lines, '邮件节奏', context.previewMailTitles, 4, 60);
  return finalizeContextSnapshotText(lines);
}

module.exports = {
  buildContextSnapshotText,
  containsSensitiveContextText,
  finalizeContextSnapshotText,
  getContextObject,
  normalizeContextList,
  normalizeContextNumber,
  normalizeContextText,
};
