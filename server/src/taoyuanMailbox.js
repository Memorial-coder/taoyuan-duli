const fs = require('fs');
const path = require('path');
const db = require('./db');
const {
  createError,
  ensureTaoyuanSavesDir,
  getActiveSaveContext,
  persistGameplayData,
  TAOYUAN_SAVES_DIR,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE ? path.dirname(process.env.DB_STORAGE) : path.join(__dirname, '../data');
const TAOYUAN_MAILBOX_FILE = path.join(DATA_DIR, 'taoyuan_mailbox.json');
const ITEM_MAX_STACK = 999;
const TEMP_BAG_CAPACITY = 10;
const MAX_TITLE_LENGTH = 60;
const MAX_CONTENT_LENGTH = 5000;

const VALID_TEMPLATE_TYPES = new Set([
  'compensation',
  'activity_reward',
  'maintenance_notice',
  'activity_notice',
  'activity_midweek',
  'activity_preview',
  'weekly_recap',
  'player_letter',
  'season_greeting',
  'festival_greeting',
  'blessing_card',
  'short_note',
  'photo_letter',
  'material_package',
  'seed_package',
  'fish_fry_package',
  'decoration_package',
  'souvenir_package'
]);
const VALID_RECIPIENT_MODES = new Set(['all', 'single', 'batch', 'keyword', 'has_save']);
const VALID_REWARD_TYPES = new Set(['money', 'item', 'seed', 'weapon', 'ring', 'hat', 'shoe', 'decoration']);

const GUILD_SEASON_MAILBOX_CONFIG = Object.freeze({
  enabled: true,
  template_type: 'activity_reward',
  default_expire_days: 7,
  weekly_settlement_lead_hours: 12,
  allow_fallback_compensation: true,
  presets: [
    {
      id: 'guild_ranked_hunt_weekly_settlement',
      phase: 'p1_ranked_hunt',
      title: '公会竞猎周结算',
      summary: '用于荣誉竞猎期的周快照奖励、补给摘要与阶段提醒。',
    },
    {
      id: 'guild_world_milestone_closure',
      phase: 'p2_world_milestone',
      title: '公会共建里程碑结算',
      summary: '用于世界里程碑期的赛季收尾、共建奖励与补偿切换。',
    },
  ],
});

let _mailboxLockTail = Promise.resolve();

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function clampPositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function toUnixSeconds(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 9999999999 ? Math.floor(value / 1000) : Math.floor(value);
  }
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function normalizeQuality(value) {
  return ['normal', 'fine', 'excellent', 'supreme'].includes(String(value)) ? String(value) : 'normal';
}

function normalizeTargetSlot(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized >= 0 && normalized <= 2 ? normalized : null;
}

function summarizeText(value, maxLength = 80) {
  const text = sanitizeText(value, maxLength * 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function defaultMailboxData() {
  return {
    campaigns: [],
    deliveries: [],
    claim_logs: [],
  };
}

function normalizeClaimResult(result) {
  if (!result || typeof result !== 'object') return null;
  return {
    save_slot: Number.isInteger(Number(result.save_slot)) ? Number(result.save_slot) : null,
    money_added: clampPositiveInt(result.money_added, 0),
    duplicate_compensation_money: clampPositiveInt(result.duplicate_compensation_money, 0),
    applied_rewards: Array.isArray(result.applied_rewards) ? result.applied_rewards.map(item => ({ ...item })) : [],
    skipped_rewards: Array.isArray(result.skipped_rewards) ? result.skipped_rewards.map(item => ({ ...item })) : [],
  };
}

function normalizeDelivery(delivery) {
  if (!delivery || typeof delivery !== 'object') return null;
  return {
    id: String(delivery.id || makeId('mail_delivery')),
    campaign_id: String(delivery.campaign_id || ''),
    username: String(delivery.username || ''),
    recipient_display_name: sanitizeText(delivery.recipient_display_name || delivery.username || '', 60),
    sender_username: String(delivery.sender_username || ''),
    sender_display_name: sanitizeText(delivery.sender_display_name || delivery.sender_username || '', 60),
    photo_url: sanitizeText(delivery.photo_url || '', 300),
    photo_alt: sanitizeText(delivery.photo_alt || '', 80),
    title: sanitizeText(delivery.title, MAX_TITLE_LENGTH),
    content: sanitizeText(delivery.content, MAX_CONTENT_LENGTH),
    template_type: VALID_TEMPLATE_TYPES.has(String(delivery.template_type)) ? String(delivery.template_type) : null,
    rewards: Array.isArray(delivery.rewards) ? delivery.rewards.map(item => ({ ...item })) : [],
    target_slot: normalizeTargetSlot(delivery.target_slot),
    duplicate_compensation_money: clampPositiveInt(delivery.duplicate_compensation_money, 0),
    created_at: Number(delivery.created_at) || Math.floor(Date.now() / 1000),
    sent_at: Number(delivery.sent_at) || Math.floor(Date.now() / 1000),
    expires_at: toUnixSeconds(delivery.expires_at),
    read_at: toUnixSeconds(delivery.read_at),
    claimed_at: toUnixSeconds(delivery.claimed_at),
    deleted_at: toUnixSeconds(delivery.deleted_at),
    claim_result: normalizeClaimResult(delivery.claim_result),
  };
}

function normalizeCampaign(campaign) {
  if (!campaign || typeof campaign !== 'object') return null;
  return {
    id: String(campaign.id || makeId('mail_campaign')),
    title: sanitizeText(campaign.title, MAX_TITLE_LENGTH),
    content: sanitizeText(campaign.content, MAX_CONTENT_LENGTH),
    template_type: VALID_TEMPLATE_TYPES.has(String(campaign.template_type)) ? String(campaign.template_type) : null,
    status: ['draft', 'scheduled', 'sent', 'cancelled'].includes(String(campaign.status)) ? String(campaign.status) : 'draft',
    recipient_rule: campaign.recipient_rule && typeof campaign.recipient_rule === 'object' ? { ...campaign.recipient_rule } : {},
    rewards: Array.isArray(campaign.rewards) ? campaign.rewards.map(item => ({ ...item })) : [],
    duplicate_compensation_money: clampPositiveInt(campaign.duplicate_compensation_money, 0),
    expires_at: toUnixSeconds(campaign.expires_at),
    scheduled_at: toUnixSeconds(campaign.scheduled_at),
    created_at: Number(campaign.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(campaign.updated_at) || Math.floor(Date.now() / 1000),
    sent_at: toUnixSeconds(campaign.sent_at),
    created_by: String(campaign.created_by || ''),
    created_by_display_name: sanitizeText(campaign.created_by_display_name || campaign.created_by || '', 60),
    recipient_count_preview: clampPositiveInt(campaign.recipient_count_preview, 0),
    sent_count: clampPositiveInt(campaign.sent_count, 0),
  };
}

function normalizeClaimLog(log) {
  if (!log || typeof log !== 'object') return null;
  return {
    id: String(log.id || makeId('mail_claim')),
    delivery_id: String(log.delivery_id || ''),
    campaign_id: String(log.campaign_id || ''),
    username: String(log.username || ''),
    claimed_at: Number(log.claimed_at) || Math.floor(Date.now() / 1000),
    result: normalizeClaimResult(log.result),
  };
}

function loadMailboxData() {
  try {
    if (!fs.existsSync(TAOYUAN_MAILBOX_FILE)) return defaultMailboxData();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_MAILBOX_FILE, 'utf8'));
    return {
      campaigns: Array.isArray(raw?.campaigns) ? raw.campaigns.map(normalizeCampaign).filter(Boolean) : [],
      deliveries: Array.isArray(raw?.deliveries) ? raw.deliveries.map(normalizeDelivery).filter(Boolean) : [],
      claim_logs: Array.isArray(raw?.claim_logs) ? raw.claim_logs.map(normalizeClaimLog).filter(Boolean) : [],
    };
  } catch {
    return defaultMailboxData();
  }
}

function getGuildSeasonMailboxConfig() {
  return {
    ...GUILD_SEASON_MAILBOX_CONFIG,
    presets: GUILD_SEASON_MAILBOX_CONFIG.presets.map(item => ({ ...item })),
  };
}

function saveMailboxData(data) {
  ensureDir(TAOYUAN_MAILBOX_FILE);
  writeJsonFileAtomic(TAOYUAN_MAILBOX_FILE, data);
}

async function withMailboxLock(fn) {
  let resolve;
  const prev = _mailboxLockTail;
  _mailboxLockTail = new Promise(r => {
    resolve = r;
  });
  await prev;
  try {
    return await fn();
  } finally {
    resolve();
  }
}

async function runDbQuery(sql, params = []) {
  const pool = db.getPool();
  return pool.execute(sql, params);
}

async function fetchUserProfilesByKeyword(keyword) {
  const cleanKeyword = sanitizeText(keyword, 50);
  if (!cleanKeyword) return [];
  const like = `%${cleanKeyword}%`;
  const [rows] = await runDbQuery(
    'SELECT username, display_name FROM users WHERE deleted_at IS NULL AND (username LIKE ? OR display_name LIKE ?) ORDER BY username ASC LIMIT 500',
    [like, like]
  );
  return rows.map(row => ({
    username: String(row.username || ''),
    displayName: sanitizeText(row.display_name || row.username || '', 60) || String(row.username || ''),
  }));
}

async function fetchAllUserProfiles() {
  const [rows] = await runDbQuery(
    'SELECT username, display_name FROM users WHERE deleted_at IS NULL ORDER BY username ASC',
    []
  );
  return rows.map(row => ({
    username: String(row.username || ''),
    displayName: sanitizeText(row.display_name || row.username || '', 60) || String(row.username || ''),
  }));
}

async function fetchProfilesByUsernames(usernames) {
  const unique = Array.from(new Set((usernames || []).map(item => String(item || '').trim()).filter(Boolean)));
  if (!unique.length) return [];
  const placeholders = unique.map(() => '?').join(', ');
  const [rows] = await runDbQuery(
    `SELECT username, display_name FROM users WHERE deleted_at IS NULL AND username IN (${placeholders})`,
    unique
  );
  const profileMap = new Map(
    rows.map(row => {
      const username = String(row.username || '');
      return [
        username.toLocaleLowerCase('zh-CN'),
        {
          username,
          displayName: sanitizeText(row.display_name || row.username || '', 60) || username,
        },
      ];
    })
  );

  return unique
    .map(username => profileMap.get(String(username).toLocaleLowerCase('zh-CN')))
    .filter(Boolean);
}

function listSavedUsernames() {
  ensureTaoyuanSavesDir();
  return fs.readdirSync(TAOYUAN_SAVES_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => name.slice(0, -5))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function normalizeRecipientRule(rawRule) {
  const mode = VALID_RECIPIENT_MODES.has(String(rawRule?.mode)) ? String(rawRule.mode) : 'single';
  const usernames = Array.isArray(rawRule?.usernames)
    ? rawRule.usernames.map(item => String(item || '').trim()).filter(Boolean)
    : String(rawRule?.usernames_text || '')
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  const targets = Array.isArray(rawRule?.targets)
    ? rawRule.targets
      .map(item => ({
        username: sanitizeText(item?.username, 60),
        target_slot: normalizeTargetSlot(item?.target_slot),
      }))
      .filter(item => item.username)
    : [];
  return {
    mode,
    username: sanitizeText(rawRule?.username, 60),
    usernames,
    keyword: sanitizeText(rawRule?.keyword, 50),
    target_slot: normalizeTargetSlot(rawRule?.target_slot),
    targets,
  };
}

function normalizeReward(rawReward) {
  const type = VALID_REWARD_TYPES.has(String(rawReward?.type)) ? String(rawReward.type) : null;
  if (!type) return null;
  if (type === 'money') {
    const amount = clampPositiveInt(rawReward?.amount ?? rawReward?.quantity, 0);
    if (!amount) return null;
    return { type: 'money', amount };
  }

  const id = sanitizeText(rawReward?.id, 80);
  const quantity = clampPositiveInt(rawReward?.quantity, 1);
  if (!id) return null;

  if (type === 'item' || type === 'seed') {
    return {
      type,
      id,
      quantity,
      quality: normalizeQuality(rawReward?.quality),
    };
  }

  return {
    type,
    id,
    quantity,
  };
}

async function resolveRecipients(rule) {
  const normalizedRule = normalizeRecipientRule(rule);
  let profiles = [];

  if (normalizedRule.mode === 'all') {
    profiles = await fetchAllUserProfiles();
  } else if (normalizedRule.mode === 'keyword') {
    if (!normalizedRule.keyword) throw createError('按关键词发放时必须填写用户名关键词');
    profiles = await fetchUserProfilesByKeyword(normalizedRule.keyword);
  } else if (normalizedRule.mode === 'has_save') {
    const usernames = listSavedUsernames();
    profiles = usernames.map(username => ({ username, displayName: username }));
  } else if (normalizedRule.mode === 'batch') {
    const targetInputs = normalizedRule.targets.length
      ? normalizedRule.targets
      : normalizedRule.usernames.map(username => ({ username, target_slot: null }));
    if (!targetInputs.length) throw createError('批量发放时至少要选择一个收件目标');
    const profileList = await fetchProfilesByUsernames(targetInputs.map(item => item.username));
    const profileMap = new Map(profileList.map(item => [String(item.username || '').toLocaleLowerCase('zh-CN'), item]));
    const matchedKeys = new Set(profileList.map(item => String(item.username || '').toLocaleLowerCase('zh-CN')));
    const missing = targetInputs.filter(item => !matchedKeys.has(String(item.username || '').toLocaleLowerCase('zh-CN')));
    if (missing.length) {
      throw createError(`以下用户名不存在：${missing.map(item => item.username).join('、')}`);
    }
    profiles = targetInputs.map(item => {
      const profile = profileMap.get(String(item.username || '').toLocaleLowerCase('zh-CN'));
      return {
        username: profile.username,
        displayName: profile.displayName,
        targetSlot: item.target_slot,
      };
    });
  } else {
    if (!normalizedRule.username) throw createError('请选择或填写收件用户名');
    profiles = await fetchProfilesByUsernames([normalizedRule.username]);
    if (!profiles.length) {
      throw createError('收件账号不存在，请检查用户名是否填写正确');
    }
    profiles = profiles.map(item => ({
      ...item,
      targetSlot: normalizedRule.target_slot,
    }));
  }

  const seen = new Set();
  const savedUsernames = new Set(listSavedUsernames());
  const deduped = [];

  for (const profile of profiles) {
    const username = String(profile.username || '').trim();
    const targetSlot = normalizeTargetSlot(profile.targetSlot);
    const dedupeKey = `${username}#${targetSlot === null ? 'account' : targetSlot}`;
    if (!username || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push({
      username,
      displayName: sanitizeText(profile.displayName || username, 60) || username,
      hasSave: savedUsernames.has(username),
      targetSlot,
    });
  }

  return deduped;
}

function normalizeCampaignPayload(rawPayload, action) {
  const title = sanitizeText(rawPayload?.title, MAX_TITLE_LENGTH);
  const content = sanitizeText(rawPayload?.content, MAX_CONTENT_LENGTH);
  const rewards = Array.isArray(rawPayload?.rewards) ? rawPayload.rewards.map(normalizeReward).filter(Boolean) : [];
  const duplicateCompensationMoney = clampPositiveInt(rawPayload?.duplicate_compensation_money, 0);
  const templateType = VALID_TEMPLATE_TYPES.has(String(rawPayload?.template_type)) ? String(rawPayload.template_type) : null;
  const expiresAt = rawPayload?.expire_mode === 'datetime' ? toUnixSeconds(rawPayload?.expires_at) : null;
  const scheduledAt = action === 'schedule' ? toUnixSeconds(rawPayload?.scheduled_at) : null;

  if (title.length < 2) throw createError('邮件标题至少需要 2 个字');
  if (!content && !rewards.length) throw createError('邮件内容和奖励不能同时为空');
  if (rawPayload?.expire_mode === 'datetime' && !expiresAt) throw createError('请填写有效的过期时间');
  if (action === 'schedule' && !scheduledAt) throw createError('定时发送必须填写发送时间');

  return {
    title,
    content,
    template_type: templateType,
    recipient_rule: normalizeRecipientRule(rawPayload?.recipient_rule || rawPayload),
    rewards,
    duplicate_compensation_money: duplicateCompensationMoney,
    expires_at: expiresAt,
    scheduled_at: scheduledAt,
  };
}

function createDeliveryFromCampaign(campaign, recipient, now) {
  return {
    id: makeId('mail_delivery'),
    campaign_id: campaign.id,
    username: recipient.username,
    recipient_display_name: recipient.displayName,
    title: campaign.title,
    content: campaign.content,
    template_type: campaign.template_type,
    rewards: campaign.rewards.map(item => ({ ...item })),
    target_slot: normalizeTargetSlot(recipient.targetSlot),
    duplicate_compensation_money: campaign.duplicate_compensation_money,
    created_at: now,
    sent_at: now,
    expires_at: campaign.expires_at,
    read_at: null,
    claimed_at: null,
    deleted_at: null,
    claim_result: null,
  };
}

async function dispatchCampaignIntoData(data, campaign) {
  const now = Math.floor(Date.now() / 1000);
  const recipients = await resolveRecipients(campaign.recipient_rule);
  if (!recipients.length) {
    throw createError('没有匹配到任何收件人');
  }

  const existingDeliveryCount = data.deliveries.filter(item => item.campaign_id === campaign.id).length;
  if (existingDeliveryCount > 0) {
    throw createError('该邮件已经发放，不能重复发送');
  }

  const deliveries = recipients.map(recipient => createDeliveryFromCampaign(campaign, recipient, now));
  data.deliveries.push(...deliveries);
  campaign.status = 'sent';
  campaign.sent_at = now;
  campaign.updated_at = now;
  campaign.sent_count = deliveries.length;
  campaign.recipient_count_preview = deliveries.length;
  return deliveries.length;
}

async function processPendingCampaignsInternal(data) {
  const dueCampaigns = data.campaigns
    .filter(item => item.status === 'scheduled' && item.scheduled_at && item.scheduled_at <= Math.floor(Date.now() / 1000))
    .sort((a, b) => (a.scheduled_at || 0) - (b.scheduled_at || 0));

  if (!dueCampaigns.length) return false;

  let changed = false;
  for (const campaign of dueCampaigns) {
    await dispatchCampaignIntoData(data, campaign);
    changed = true;
  }
  return changed;
}

async function processPendingCampaigns() {
  return withMailboxLock(async () => {
    const data = loadMailboxData();
    const changed = await processPendingCampaignsInternal(data);
    if (changed) saveMailboxData(data);
    return changed;
  });
}

function isExpired(delivery, now = Math.floor(Date.now() / 1000)) {
  return !delivery.claimed_at && !!delivery.expires_at && delivery.expires_at <= now;
}

function buildUserMailSummary(delivery) {
  const now = Math.floor(Date.now() / 1000);
  const hasRewards = Array.isArray(delivery.rewards) && delivery.rewards.length > 0;
  const expired = isExpired(delivery, now);
  const canClaim = hasRewards && !delivery.claimed_at && !expired;

  return {
    id: delivery.id,
    campaign_id: delivery.campaign_id,
    title: delivery.title,
    preview: summarizeText(delivery.content, 80),
    template_type: delivery.template_type,
    sender_username: String(delivery.sender_username || ''),
    sender_display_name: sanitizeText(delivery.sender_display_name || '', 60),
    photo_url: sanitizeText(delivery.photo_url || '', 300),
    photo_alt: sanitizeText(delivery.photo_alt || '', 80),
    target_slot: normalizeTargetSlot(delivery.target_slot),
    has_rewards: hasRewards,
    reward_count: delivery.rewards.length,
    sent_at: delivery.sent_at,
    expires_at: delivery.expires_at,
    read_at: delivery.read_at,
    claimed_at: delivery.claimed_at,
    unread: !delivery.read_at,
    can_claim: canClaim,
    is_claimed: !!delivery.claimed_at,
    is_expired: expired,
    read_status: delivery.read_at ? 'read' : 'unread',
    claim_status: hasRewards ? (delivery.claimed_at ? 'claimed' : (expired ? 'expired' : 'claimable')) : 'notice',
  };
}

function buildUserMailDetail(delivery) {
  return {
    ...buildUserMailSummary(delivery),
    content: delivery.content,
    rewards: delivery.rewards.map(item => ({ ...item })),
    duplicate_compensation_money: delivery.duplicate_compensation_money,
    claim_result: normalizeClaimResult(delivery.claim_result),
    sender_username: String(delivery.sender_username || ''),
    sender_display_name: sanitizeText(delivery.sender_display_name || '', 60),
    photo_url: sanitizeText(delivery.photo_url || '', 300),
    photo_alt: sanitizeText(delivery.photo_alt || '', 80),
  };
}

const PLAYER_LETTER_TEMPLATE_PRESETS = Object.freeze([
  {
    id: 'spring_letter',
    template_type: 'season_greeting',
    label: '春信',
    title: '春信已至',
    content: '见字如晤。\n\n春水初生，田畴渐暖。近来庄上可还安稳？若你正忙着整地播种，愿这封春信替我先把问候送到。\n\n盼你回信，也盼你这一季有好收成。',
  },
  {
    id: 'summer_letter',
    template_type: 'season_greeting',
    label: '夏帖',
    title: '夏帖相问',
    content: '见字如晤。\n\n盛夏事多，鱼塘、作坊和节庆筹备想来都不轻松。若你这阵子正忙，便把这封信当作一盏晚风，提醒你也记得歇一歇。\n\n得闲时回我一声近况就好。',
  },
  {
    id: 'autumn_letter',
    template_type: 'season_greeting',
    label: '秋笺',
    title: '秋笺问收成',
    content: '见字如晤。\n\n近来秋意渐深，不知你庄上这一轮收成可还顺手？若有哪样稀奇见闻，也请一并写来，让我隔着纸页也能同你共赏。\n\n愿这一季仓满、心安。',
  },
  {
    id: 'winter_letter',
    template_type: 'season_greeting',
    label: '冬书',
    title: '冬书安问',
    content: '见字如晤。\n\n冬夜渐长，正适合慢慢写信。近来庄上若有围炉闲话、雪夜灯火，便也写给我听。愿你这一季藏得住辛劳，也留得住暖意。\n\n盼安。',
  },
  {
    id: 'solar_blessing',
    template_type: 'blessing_card',
    label: '节气明信片',
    title: '节气问安',
    content: '给你寄来一张节气明信片。\n\n愿你顺着这一程时令，把田事、鱼事和心事都安排得恰到好处。等你有空，也写一张回来。',
  },
  {
    id: 'visit_thanks',
    template_type: 'player_letter',
    label: '来访感谢信',
    title: '多谢你来庄上一趟',
    content: '今日承你来访，庄上因此热闹了许多。\n\n你留下的话、建议和心意，我都已经仔细看过了。特意写这封信谢你，也盼你下回再来。',
  },
  {
    id: 'mentor_note',
    template_type: 'player_letter',
    label: '师徒赠言',
    title: '留一段赠言给你',
    content: '写下这封信，是想把一些已经走过的弯路和心得先交给你。\n\n往后若你遇到难处，也不必急着一个人扛着。只要你愿意来信，我们总还能一起把事情慢慢理顺。',
  },
]);

function getPlayerLetterTemplatePresets() {
  return PLAYER_LETTER_TEMPLATE_PRESETS.map(item => ({ ...item }));
}

function normalizePlayerLetterTemplateType(value) {
  const normalized = String(value || '').trim();
  return ['player_letter', 'season_greeting', 'festival_greeting', 'blessing_card', 'short_note', 'photo_letter'].includes(normalized)
    ? normalized
    : 'player_letter';
}

async function sendPlayerLetter(payload = {}, actor = {}) {
  return withMailboxLock(async () => {
    const senderUsername = String(actor?.username || '').trim();
    if (!senderUsername) throw createError('请先登录后再发信', 401);
    const targetUsername = sanitizeText(payload?.target_username, 60);
    if (!targetUsername) throw createError('请先填写收件人用户名');
    if (targetUsername === senderUsername) throw createError('不能给自己发信');
    const targetUsers = await fetchProfilesByUsernames([targetUsername]);
    const recipient = targetUsers[0];
    if (!recipient) throw createError('收件账号不存在，请检查用户名是否填写正确');

    const title = sanitizeText(payload?.title, MAX_TITLE_LENGTH);
    const content = sanitizeText(payload?.content, MAX_CONTENT_LENGTH);
    const photoUrl = sanitizeText(payload?.photo_url, 300);
    const photoAlt = sanitizeText(payload?.photo_alt, 80);
    if (title.length < 2) throw createError('信件标题至少需要 2 个字');
    if (content.length < 4) throw createError('信件正文至少需要 4 个字');

    const templateType = normalizePlayerLetterTemplateType(payload?.template_type);
    const sentAt = Math.floor(Date.now() / 1000);
    const delivery = normalizeDelivery({
      id: makeId('mail_delivery'),
      campaign_id: '',
      username: recipient.username,
      recipient_display_name: recipient.displayName,
      sender_username: senderUsername,
      sender_display_name: sanitizeText(actor?.displayName || senderUsername, 60),
      photo_url: photoUrl,
      photo_alt: photoAlt,
      title,
      content,
      template_type: templateType,
      rewards: [],
      target_slot: null,
      duplicate_compensation_money: 0,
      created_at: sentAt,
      sent_at: sentAt,
      expires_at: null,
      read_at: null,
      claimed_at: null,
      deleted_at: null,
      claim_result: null,
    });

    const data = loadMailboxData();
    data.deliveries.unshift(delivery);
    saveMailboxData(data);
    return buildUserMailDetail(delivery);
  });
}

function normalizePlayerGiftPackageTemplateType(value) {
  const normalized = String(value || '').trim();
  return ['material_package', 'seed_package', 'fish_fry_package', 'decoration_package', 'souvenir_package'].includes(normalized)
    ? normalized
    : 'material_package';
}

function removeStackableItemFromSlots(slots, itemId, quantity, quality) {
  let remaining = Math.max(0, Math.floor(Number(quantity) || 0));
  for (let index = slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const slot = slots[index];
    if (!slot || slot.itemId !== itemId) continue;
    if (quality && normalizeQuality(slot.quality) !== quality) continue;
    const take = Math.min(remaining, clampPositiveInt(slot.quantity, 0));
    slot.quantity = clampPositiveInt(slot.quantity, 0) - take;
    remaining -= take;
    if (slot.quantity <= 0) {
      slots.splice(index, 1);
    }
  }
  return remaining <= 0;
}

function removeStackableItemAnywhere(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData);
  const normalizedItemId = sanitizeText(itemId, 80);
  const safeQuantity = clampPositiveInt(quantity, 0);
  if (!normalizedItemId || safeQuantity <= 0) return false;
  const total = [...saveData.inventory.items, ...saveData.inventory.tempItems]
    .filter(slot => slot.itemId === normalizedItemId && (!quality || normalizeQuality(slot.quality) === quality))
    .reduce((sum, slot) => sum + clampPositiveInt(slot.quantity, 0), 0);
  if (total < safeQuantity) return false;

  let remaining = safeQuantity;
  const qualityOrder = quality ? [quality] : ['normal', 'fine', 'excellent', 'supreme'];
  for (const currentQuality of qualityOrder) {
    if (remaining <= 0) break;
    const tempCount = saveData.inventory.tempItems
      .filter(slot => slot.itemId === normalizedItemId && normalizeQuality(slot.quality) === currentQuality)
      .reduce((sum, slot) => sum + clampPositiveInt(slot.quantity, 0), 0);
    const takeFromTemp = Math.min(remaining, tempCount);
    if (takeFromTemp > 0) {
      removeStackableItemFromSlots(saveData.inventory.tempItems, normalizedItemId, takeFromTemp, currentQuality);
      remaining -= takeFromTemp;
    }

    const mainCount = saveData.inventory.items
      .filter(slot => slot.itemId === normalizedItemId && normalizeQuality(slot.quality) === currentQuality)
      .reduce((sum, slot) => sum + clampPositiveInt(slot.quantity, 0), 0);
    const takeFromMain = Math.min(remaining, mainCount);
    if (takeFromMain > 0) {
      removeStackableItemFromSlots(saveData.inventory.items, normalizedItemId, takeFromMain, currentQuality);
      remaining -= takeFromMain;
    }
  }
  return remaining <= 0;
}

function removeDecorationOwned(saveData, decorationId, quantity) {
  ensureDecorationState(saveData);
  const normalizedId = sanitizeText(decorationId, 80);
  const safeQuantity = clampPositiveInt(quantity, 0);
  if (!normalizedId || safeQuantity <= 0) return false;
  const ownedCount = clampPositiveInt(saveData.decoration.owned[normalizedId], 0);
  if (ownedCount < safeQuantity) return false;
  const nextCount = ownedCount - safeQuantity;
  if (nextCount > 0) saveData.decoration.owned[normalizedId] = nextCount;
  else delete saveData.decoration.owned[normalizedId];
  if (clampPositiveInt(saveData.decoration.placed[normalizedId], 0) > clampPositiveInt(saveData.decoration.owned[normalizedId], 0)) {
    saveData.decoration.placed[normalizedId] = clampPositiveInt(saveData.decoration.owned[normalizedId], 0);
  }
  return true;
}

function deductGiftPackageRewards(saveData, rewards = []) {
  ensureInventoryState(saveData);
  ensureDecorationState(saveData);
  for (const reward of rewards) {
    if (reward.type === 'item' || reward.type === 'seed') {
      const success = removeStackableItemAnywhere(saveData, reward.id, reward.quantity, normalizeQuality(reward.quality));
      if (!success) return false;
      continue;
    }
    if (reward.type === 'decoration') {
      const success = removeDecorationOwned(saveData, reward.id, reward.quantity);
      if (!success) return false;
      continue;
    }
    return false;
  }
  return true;
}

async function sendPlayerGiftPackage(payload = {}, actor = {}) {
  return withMailboxLock(async () => {
    const senderUsername = String(actor?.username || '').trim();
    if (!senderUsername) throw createError('请先登录后再寄送礼物', 401);
    const targetUsername = sanitizeText(payload?.target_username, 60);
    if (!targetUsername) throw createError('请先填写收件人用户名');
    if (targetUsername === senderUsername) throw createError('不能给自己寄礼物包裹');
    const targetUsers = await fetchProfilesByUsernames([targetUsername]);
    const recipient = targetUsers[0];
    if (!recipient) throw createError('收件账号不存在，请检查用户名是否填写正确');

    const title = sanitizeText(payload?.title, MAX_TITLE_LENGTH);
    const content = sanitizeText(payload?.content, MAX_CONTENT_LENGTH);
    if (title.length < 2) throw createError('包裹标题至少需要 2 个字');

    const rewards = Array.isArray(payload?.rewards) ? payload.rewards.map(normalizeReward).filter(Boolean) : [];
    if (!rewards.length) throw createError('礼物包裹至少要放入一项礼物');
    if (!rewards.every(reward => ['item', 'seed', 'decoration'].includes(String(reward.type)))) {
      throw createError('当前礼物包裹只支持寄送物品、种子和装饰物');
    }

    const senderContext = getActiveSaveContext(senderUsername, null, '当前账号没有可用的桃源乡存档，暂时无法寄送礼物包裹');
    senderContext.username = senderUsername;
    const nextSaveData = JSON.parse(JSON.stringify(senderContext.data || {}));
    if (!deductGiftPackageRewards(nextSaveData, rewards)) {
      throw createError('寄件物资不足，无法装出这份礼物包裹');
    }

    const sentAt = Math.floor(Date.now() / 1000);
    const templateType = normalizePlayerGiftPackageTemplateType(payload?.template_type);
    const delivery = normalizeDelivery({
      id: makeId('mail_delivery'),
      campaign_id: '',
      username: recipient.username,
      recipient_display_name: recipient.displayName,
      sender_username: senderUsername,
      sender_display_name: sanitizeText(actor?.displayName || senderUsername, 60),
      title,
      content,
      template_type: templateType,
      rewards,
      target_slot: null,
      duplicate_compensation_money: 0,
      created_at: sentAt,
      sent_at: sentAt,
      expires_at: null,
      read_at: null,
      claimed_at: null,
      deleted_at: null,
      claim_result: null,
    });

    const data = loadMailboxData();
    data.deliveries.unshift(delivery);
    saveMailboxData(data);

    senderContext.data = nextSaveData;
    if (senderContext.saveContainer && typeof senderContext.saveContainer === 'object') {
      senderContext.saveContainer.gameplayData = nextSaveData;
    }
    try {
      persistGameplayData(senderContext);
    } catch (error) {
      data.deliveries = data.deliveries.filter(item => item.id !== delivery.id);
      saveMailboxData(data);
      throw createError(`寄送礼物包裹失败：${sanitizeText(error?.message, 120) || '未知错误'}`);
    }

    return buildUserMailDetail(delivery);
  });
}

function listUserMails(username) {
  const data = loadMailboxData();
  const deliveries = data.deliveries
    .filter(item => item.username === String(username) && !item.deleted_at)
    .sort((a, b) => (b.sent_at || 0) - (a.sent_at || 0));
  const mails = deliveries.map(buildUserMailSummary);
  return {
    mails,
    unread_count: mails.filter(item => item.unread).length,
  };
}

function getUserMail(username, deliveryId) {
  const data = loadMailboxData();
  const delivery = data.deliveries.find(item => item.id === String(deliveryId) && item.username === String(username) && !item.deleted_at);
  if (!delivery) return null;
  return buildUserMailDetail(delivery);
}

async function markUserMailRead(username, deliveryId) {
  return withMailboxLock(async () => {
    const data = loadMailboxData();
    const delivery = data.deliveries.find(item => item.id === String(deliveryId) && item.username === String(username) && !item.deleted_at);
    if (!delivery) throw createError('邮件不存在', 404);
    if (!delivery.read_at) {
      delivery.read_at = Math.floor(Date.now() / 1000);
      saveMailboxData(data);
    }
    return buildUserMailDetail(delivery);
  });
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {};
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = [];
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = [];
  if (!Array.isArray(saveData.inventory.ownedWeapons)) saveData.inventory.ownedWeapons = [];
  if (!Array.isArray(saveData.inventory.ownedRings)) saveData.inventory.ownedRings = [];
  if (!Array.isArray(saveData.inventory.ownedHats)) saveData.inventory.ownedHats = [];
  if (!Array.isArray(saveData.inventory.ownedShoes)) saveData.inventory.ownedShoes = [];
  if (!Number.isInteger(Number(saveData.inventory.capacity))) saveData.inventory.capacity = 24;
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {};
  if (!Number.isFinite(Number(saveData.player.money))) saveData.player.money = 0;
}

function normalizeCountMap(value) {
  return Object.fromEntries(
    Object.entries(value ?? {})
      .map(([id, count]) => [String(id || '').trim(), clampPositiveInt(count, 0)])
      .filter(([id, count]) => id && count > 0)
  );
}

function ensureDecorationState(saveData) {
  if (!saveData.decoration || typeof saveData.decoration !== 'object') saveData.decoration = {};
  saveData.decoration.owned = normalizeCountMap(saveData.decoration.owned);
  saveData.decoration.placed = normalizeCountMap(saveData.decoration.placed);
}

function cloneInventorySlots(source) {
  return (source || []).map(slot => ({
    itemId: String(slot.itemId || ''),
    quality: normalizeQuality(slot.quality),
    quantity: clampPositiveInt(slot.quantity, 0),
    locked: !!slot.locked,
  })).filter(slot => slot.itemId && slot.quantity > 0);
}

function simulateAddToSlots(mainSlots, mainCapacity, tempSlots, tempCapacity, entries) {
  const fillExistingStacks = (slots, itemId, quality, remaining) => {
    for (const slot of slots) {
      if (remaining <= 0) break;
      if (slot.itemId === itemId && slot.quality === quality && slot.quantity < ITEM_MAX_STACK) {
        const canAdd = Math.min(remaining, ITEM_MAX_STACK - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
      }
    }
    return remaining;
  };

  const createNewStacks = (slots, slotCapacity, itemId, quality, remaining) => {
    while (remaining > 0 && slots.length < slotCapacity) {
      const batch = Math.min(remaining, ITEM_MAX_STACK);
      slots.push({ itemId, quality, quantity: batch, locked: false });
      remaining -= batch;
    }
    return remaining;
  };

  for (const entry of entries) {
    let remaining = entry.quantity;
    remaining = fillExistingStacks(mainSlots, entry.itemId, entry.quality, remaining);
    remaining = createNewStacks(mainSlots, mainCapacity, entry.itemId, entry.quality, remaining);
    if (remaining > 0) {
      remaining = fillExistingStacks(tempSlots, entry.itemId, entry.quality, remaining);
      remaining = createNewStacks(tempSlots, tempCapacity, entry.itemId, entry.quality, remaining);
    }
    if (remaining > 0) return false;
  }
  return true;
}

function addStackableItemToInventory(saveData, itemId, quantity, quality = 'normal') {
  const items = saveData.inventory.items;
  const tempItems = saveData.inventory.tempItems;
  const capacity = clampPositiveInt(saveData.inventory.capacity, 24);
  let remaining = quantity;

  for (const slot of items) {
    if (remaining <= 0) break;
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === quality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity));
      slot.quantity = Number(slot.quantity) + canAdd;
      remaining -= canAdd;
    }
  }

  while (remaining > 0 && items.length < capacity) {
    const batch = Math.min(remaining, ITEM_MAX_STACK);
    items.push({ itemId, quantity: batch, quality, locked: false });
    remaining -= batch;
  }

  for (const slot of tempItems) {
    if (remaining <= 0) break;
    if (slot.itemId === itemId && normalizeQuality(slot.quality) === quality && Number(slot.quantity) < ITEM_MAX_STACK) {
      const canAdd = Math.min(remaining, ITEM_MAX_STACK - Number(slot.quantity));
      slot.quantity = Number(slot.quantity) + canAdd;
      remaining -= canAdd;
    }
  }

  while (remaining > 0 && tempItems.length < TEMP_BAG_CAPACITY) {
    const batch = Math.min(remaining, ITEM_MAX_STACK);
    tempItems.push({ itemId, quantity: batch, quality, locked: false });
    remaining -= batch;
  }

  return remaining <= 0;
}

function canFitStackableRewards(saveData, rewards) {
  const stackableEntries = rewards
    .filter(item => item.type === 'item' || item.type === 'seed')
    .map(item => ({
      itemId: item.id,
      quantity: item.quantity,
      quality: normalizeQuality(item.quality),
    }));

  if (!stackableEntries.length) return true;

  return simulateAddToSlots(
    cloneInventorySlots(saveData.inventory.items),
    clampPositiveInt(saveData.inventory.capacity, 24),
    cloneInventorySlots(saveData.inventory.tempItems),
    TEMP_BAG_CAPACITY,
    stackableEntries
  );
}

function hasOwnedEquipment(collection, defId) {
  return collection.some(item => String(item.defId || '') === defId);
}

function applyEquipmentReward(saveData, reward, duplicateCompensationMoney, result) {
  let collection;
  let createItem;

  if (reward.type === 'weapon') {
    collection = saveData.inventory.ownedWeapons;
    createItem = () => ({ defId: reward.id, enchantmentId: null });
  } else if (reward.type === 'ring') {
    collection = saveData.inventory.ownedRings;
    createItem = () => ({ defId: reward.id });
  } else if (reward.type === 'hat') {
    collection = saveData.inventory.ownedHats;
    createItem = () => ({ defId: reward.id });
  } else {
    collection = saveData.inventory.ownedShoes;
    createItem = () => ({ defId: reward.id });
  }

  for (let index = 0; index < reward.quantity; index += 1) {
    if (hasOwnedEquipment(collection, reward.id)) {
      if (duplicateCompensationMoney > 0) {
        saveData.player.money = Math.max(0, Math.floor(Number(saveData.player.money) || 0) + duplicateCompensationMoney);
        result.duplicate_compensation_money += duplicateCompensationMoney;
        result.money_added += duplicateCompensationMoney;
        result.applied_rewards.push({
          type: 'money',
          amount: duplicateCompensationMoney,
          source: 'duplicate_compensation',
          target_reward_type: reward.type,
          target_reward_id: reward.id,
        });
      } else {
        result.skipped_rewards.push({
          type: reward.type,
          id: reward.id,
          quantity: 1,
          reason: 'duplicate_without_compensation',
        });
      }
      continue;
    }
    collection.push(createItem());
    result.applied_rewards.push({
      type: reward.type,
      id: reward.id,
      quantity: 1,
    });
  }
}

function applyDecorationReward(saveData, reward, result) {
  ensureDecorationState(saveData);
  const decorationId = sanitizeText(reward.id, 80);
  const quantity = clampPositiveInt(reward.quantity, 0);
  if (!decorationId || quantity <= 0) return;
  saveData.decoration.owned[decorationId] = clampPositiveInt(saveData.decoration.owned[decorationId], 0) + quantity;
  result.applied_rewards.push({
    type: 'decoration',
    id: decorationId,
    quantity,
  });
}

function applyRewardsToSave(username, delivery) {
  const context = getActiveSaveContext(username, delivery.target_slot, '当前账号没有可用的桃源乡存档，暂时无法领取邮件奖励');
  context.username = username;
  ensureInventoryState(context.data);
  ensureDecorationState(context.data);

  if (!canFitStackableRewards(context.data, delivery.rewards)) {
    throw createError('背包空间不足，请先整理背包后再领取');
  }

  const result = {
    save_slot: context.slot,
    money_added: 0,
    duplicate_compensation_money: 0,
    applied_rewards: [],
    skipped_rewards: [],
  };

  for (const reward of delivery.rewards) {
    if (reward.type === 'money') {
      context.data.player.money = Math.max(0, Math.floor(Number(context.data.player.money) || 0) + reward.amount);
      result.money_added += reward.amount;
      result.applied_rewards.push({ type: 'money', amount: reward.amount });
      continue;
    }

    if (reward.type === 'item' || reward.type === 'seed') {
      const applied = addStackableItemToInventory(context.data, reward.id, reward.quantity, normalizeQuality(reward.quality));
      if (!applied) {
        throw createError('背包空间不足，请先整理背包后再领取');
      }
      result.applied_rewards.push({
        type: reward.type,
        id: reward.id,
        quantity: reward.quantity,
        quality: normalizeQuality(reward.quality),
      });
      continue;
    }

    if (reward.type === 'decoration') {
      applyDecorationReward(context.data, reward, result);
      continue;
    }

    applyEquipmentReward(context.data, reward, delivery.duplicate_compensation_money, result);
  }

  persistGameplayData(context);
  return result;
}

async function claimUserMail(username, deliveryId) {
  return withMailboxLock(async () => {
    const data = loadMailboxData();
    await processPendingCampaignsInternal(data);

    const delivery = data.deliveries.find(item => item.id === String(deliveryId) && item.username === String(username) && !item.deleted_at);
    if (!delivery) throw createError('邮件不存在', 404);
    if (delivery.claimed_at) throw createError('这封邮件已经领取过了');
    if (!delivery.rewards.length) throw createError('这封邮件没有可领取奖励');
    if (isExpired(delivery)) throw createError('这封邮件已经过期，奖励无法领取');

    const result = applyRewardsToSave(username, delivery);
    const now = Math.floor(Date.now() / 1000);
    delivery.read_at = delivery.read_at || now;
    delivery.claimed_at = now;
    delivery.claim_result = result;
    data.claim_logs.unshift({
      id: makeId('mail_claim'),
      delivery_id: delivery.id,
      campaign_id: delivery.campaign_id,
      username: String(username),
      claimed_at: now,
      result,
    });
    saveMailboxData(data);
    return {
      mail: buildUserMailDetail(delivery),
      result,
    };
  });
}

async function claimAllUserMails(username) {
  return withMailboxLock(async () => {
    const data = loadMailboxData();
    await processPendingCampaignsInternal(data);
    const pending = data.deliveries
      .filter(item => item.username === String(username) && !item.deleted_at && item.rewards.length > 0 && !item.claimed_at)
      .sort((a, b) => (a.sent_at || 0) - (b.sent_at || 0));

    const claimed = [];
    const failed = [];
    let changed = false;

    for (const delivery of pending) {
      if (isExpired(delivery)) {
        failed.push({ id: delivery.id, title: delivery.title, reason: '邮件已过期' });
        continue;
      }
      try {
        const result = applyRewardsToSave(username, delivery);
        const now = Math.floor(Date.now() / 1000);
        delivery.read_at = delivery.read_at || now;
        delivery.claimed_at = now;
        delivery.claim_result = result;
        data.claim_logs.unshift({
          id: makeId('mail_claim'),
          delivery_id: delivery.id,
          campaign_id: delivery.campaign_id,
          username: String(username),
          claimed_at: now,
          result,
        });
        claimed.push({
          id: delivery.id,
          title: delivery.title,
          result,
        });
        changed = true;
      } catch (error) {
        failed.push({
          id: delivery.id,
          title: delivery.title,
          reason: error.message || '领取失败',
        });
      }
    }

    if (changed) saveMailboxData(data);
    return {
      claimed,
      failed,
    };
  });
}

async function clearClaimedUserMails(username) {
  return withMailboxLock(async () => {
    const data = loadMailboxData();
    const now = Math.floor(Date.now() / 1000);
    let count = 0;
    for (const delivery of data.deliveries) {
      if (delivery.username === String(username) && !delivery.deleted_at && delivery.claimed_at) {
        delivery.deleted_at = now;
        count += 1;
      }
    }
    if (count > 0) saveMailboxData(data);
    return { count };
  });
}

function buildCampaignSummary(campaign, deliveries) {
  const related = deliveries.filter(item => item.campaign_id === campaign.id);
  const now = Math.floor(Date.now() / 1000);
  const claimedCount = related.filter(item => !!item.claimed_at).length;
  const readCount = related.filter(item => !!item.read_at).length;
  const unreadCount = related.filter(item => !item.read_at).length;
  const expiredCount = related.filter(item => isExpired(item, now)).length;
  return {
    ...campaign,
    delivery_count: related.length,
    claimed_count: claimedCount,
    read_count: readCount,
    unread_count: unreadCount,
    expired_count: expiredCount,
    pending_claim_count: related.filter(item => item.rewards.length > 0 && !item.claimed_at && !isExpired(item, now)).length,
  };
}

function listAdminCampaigns() {
  const data = loadMailboxData();
  return data.campaigns
    .map(campaign => buildCampaignSummary(campaign, data.deliveries))
    .sort((a, b) => Math.max(b.sent_at || 0, b.updated_at || 0) - Math.max(a.sent_at || 0, a.updated_at || 0));
}

function getAdminCampaignDetail(campaignId) {
  const data = loadMailboxData();
  const campaign = data.campaigns.find(item => item.id === String(campaignId));
  if (!campaign) return null;
  const deliveries = data.deliveries
    .filter(item => item.campaign_id === campaign.id)
    .sort((a, b) => (a.sent_at || 0) - (b.sent_at || 0))
    .map(item => ({
      ...buildUserMailDetail(item),
      username: item.username,
      recipient_display_name: item.recipient_display_name,
    }));
  const claimLogs = data.claim_logs
    .filter(item => item.campaign_id === campaign.id)
    .sort((a, b) => (b.claimed_at || 0) - (a.claimed_at || 0));
  return {
    campaign: buildCampaignSummary(campaign, data.deliveries),
    deliveries,
    claim_logs: claimLogs,
  };
}

async function saveAdminCampaign(payload, actor, action) {
  return withMailboxLock(async () => {
    const data = loadMailboxData();
    await processPendingCampaignsInternal(data);

    const normalizedPayload = normalizeCampaignPayload(payload, action);
    const recipientProfiles = await resolveRecipients(normalizedPayload.recipient_rule);
    const existingId = sanitizeText(payload?.id, 80);
    const existing = existingId ? data.campaigns.find(item => item.id === existingId) : null;
    const now = Math.floor(Date.now() / 1000);

    if ((action === 'send' || action === 'schedule') && recipientProfiles.length === 0) {
      throw createError('没有匹配到任何收件人');
    }
    if (action === 'schedule' && normalizedPayload.scheduled_at <= now) {
      throw createError('定时发送时间必须晚于当前时间');
    }
    if (normalizedPayload.expires_at && action === 'schedule' && normalizedPayload.expires_at <= normalizedPayload.scheduled_at) {
      throw createError('过期时间必须晚于定时发送时间');
    }
    if (normalizedPayload.expires_at && action === 'send' && normalizedPayload.expires_at <= now) {
      throw createError('过期时间必须晚于当前时间');
    }
    if (existing && existing.status === 'sent') {
      throw createError('已发送邮件不支持再次修改');
    }

    const campaign = existing || {
      id: existingId || makeId('mail_campaign'),
      created_at: now,
      created_by: String(actor?.username || ''),
      created_by_display_name: sanitizeText(actor?.displayName || actor?.username || '', 60),
      sent_at: null,
      sent_count: 0,
    };

    campaign.title = normalizedPayload.title;
    campaign.content = normalizedPayload.content;
    campaign.template_type = normalizedPayload.template_type;
    campaign.recipient_rule = normalizedPayload.recipient_rule;
    campaign.rewards = normalizedPayload.rewards;
    campaign.duplicate_compensation_money = normalizedPayload.duplicate_compensation_money;
    campaign.expires_at = normalizedPayload.expires_at;
    campaign.scheduled_at = normalizedPayload.scheduled_at;
    campaign.updated_at = now;
    campaign.recipient_count_preview = recipientProfiles.length;

    if (action === 'draft') {
      campaign.status = 'draft';
      campaign.scheduled_at = null;
    } else if (action === 'schedule') {
      campaign.status = 'scheduled';
    } else {
      campaign.status = 'draft';
    }

    if (!existing) {
      data.campaigns.unshift(campaign);
    }

    if (action === 'send') {
      await dispatchCampaignIntoData(data, campaign);
    }

    saveMailboxData(data);
    return buildCampaignSummary(campaign, data.deliveries);
  });
}

async function saveSystemCampaignForUser(payload, actor, username) {
  const safeUsername = String(username || '').trim();
  if (!safeUsername) {
    throw createError('缺少有效收件人');
  }
  if (Array.isArray(payload?.rewards) && payload.rewards.length > 0) {
    throw createError('自助系统邮件不允许直接下发奖励');
  }
  if (clampPositiveInt(payload?.duplicate_compensation_money, 0) > 0) {
    throw createError('自助系统邮件不允许设置重复补偿金');
  }
  const campaignId = sanitizeText(payload?.id, 80);
  const existing = campaignId ? getAdminCampaignDetail(campaignId) : null;
  if (existing?.campaign?.status === 'sent') {
    return existing.campaign;
  }
  return saveAdminCampaign(
    {
      ...payload,
      id: campaignId,
      action: 'send',
      recipient_rule: {
        mode: 'single',
        username: safeUsername
      },
      rewards: []
    },
    actor,
    'send'
  );
}

module.exports = {
  processPendingCampaigns,
  listUserMails,
  getUserMail,
  markUserMailRead,
  claimUserMail,
  claimAllUserMails,
  clearClaimedUserMails,
  saveAdminCampaign,
  saveSystemCampaignForUser,
  sendPlayerLetter,
  sendPlayerGiftPackage,
  getPlayerLetterTemplatePresets,
  getGuildSeasonMailboxConfig,
  listAdminCampaigns,
  getAdminCampaignDetail,
};
