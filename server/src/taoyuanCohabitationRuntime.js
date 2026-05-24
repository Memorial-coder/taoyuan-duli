const fs = require('fs');
const path = require('path');
const db = require('./db');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const { createError, writeJsonFileAtomic } = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const TAOYUAN_COHABITATION_FILE = path.join(DATA_DIR, 'taoyuan_cohabitation_contracts.json');

const CONTRACT_STORE_VERSION = 1;
const OPEN_CONTRACT_STATUSES = new Set(['pending_acceptance', 'active', 'separation_pending']);
const CONTRACT_STATUSES = new Set(['pending_acceptance', 'active', 'separation_pending', 'closed', 'declined']);
const MEMBER_STATUSES = new Set(['accepted', 'pending', 'declined', 'left']);

const RELATION_TYPE_DEFS = Object.freeze({
  lover_cohabitation: {
    id: 'lover_cohabitation',
    label: '恋人同居',
    title: '同居伴侣',
    min_members: 2,
    max_members: 2,
    permission_template: 'lover',
    romance_only: true,
  },
  marriage_home: {
    id: 'marriage_home',
    label: '婚姻同居',
    title: '配偶家庭',
    min_members: 2,
    max_members: 2,
    permission_template: 'marriage',
    romance_only: true,
  },
  bosom_partner: {
    id: 'bosom_partner',
    label: '知己合住',
    title: '知己搭档',
    min_members: 2,
    max_members: 2,
    permission_template: 'bosom',
    romance_only: false,
  },
  oath_manor: {
    id: 'oath_manor',
    label: '结拜庄园',
    title: '义亲庄园',
    min_members: 2,
    max_members: 4,
    permission_template: 'kinship',
    romance_only: false,
  },
  business_partner: {
    id: 'business_partner',
    label: '合伙庄园',
    title: '合伙人',
    min_members: 2,
    max_members: 4,
    permission_template: 'business',
    romance_only: false,
  },
  seasonal_cofarm: {
    id: 'seasonal_cofarm',
    label: '临时共耕',
    title: '共耕伙伴',
    min_members: 2,
    max_members: 2,
    permission_template: 'temporary',
    romance_only: false,
  },
});

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sanitizeText(value, maxLength = 120) {
  return String(value || '').normalize('NFKC').trim().slice(0, maxLength);
}

function normalizeUsername(value) {
  return sanitizeText(value, 40);
}

function normalizeUsernameKey(value) {
  return normalizeUsername(value).toLocaleLowerCase('zh-CN');
}

function normalizeSaveId(value) {
  const saveId = Number(value);
  return Number.isInteger(saveId) && saveId >= 100000000 && saveId < 1000000000 ? saveId : 0;
}

function normalizeSaveSlot(value) {
  if (value === null || value === undefined || value === '') return null;
  const slot = Number(value);
  return Number.isInteger(slot) && slot >= 0 && slot <= 2 ? slot : null;
}

function normalizeRelationType(value) {
  const id = sanitizeText(value, 60) || 'lover_cohabitation';
  return RELATION_TYPE_DEFS[id] ? id : 'lover_cohabitation';
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureContractStore() {
  fs.mkdirSync(path.dirname(TAOYUAN_COHABITATION_FILE), { recursive: true });
}

function loadContractStore() {
  ensureContractStore();
  try {
    if (!fs.existsSync(TAOYUAN_COHABITATION_FILE)) {
      return { version: CONTRACT_STORE_VERSION, contracts: [] };
    }
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_COHABITATION_FILE, 'utf8'));
    return {
      version: Number(raw?.version) || CONTRACT_STORE_VERSION,
      contracts: Array.isArray(raw?.contracts) ? raw.contracts.map(normalizeContract).filter(Boolean) : [],
    };
  } catch {
    return { version: CONTRACT_STORE_VERSION, contracts: [] };
  }
}

function saveContractStore(store) {
  ensureContractStore();
  writeJsonFileAtomic(TAOYUAN_COHABITATION_FILE, {
    version: CONTRACT_STORE_VERSION,
    contracts: Array.isArray(store?.contracts) ? store.contracts.map(normalizeContract).filter(Boolean) : [],
  });
}

function createDefaultPermissionSet(type) {
  const def = RELATION_TYPE_DEFS[type] || RELATION_TYPE_DEFS.lover_cohabitation;
  const template = def.permission_template;
  const isMarriage = template === 'marriage';
  const isHighTrust = ['marriage', 'lover', 'bosom'].includes(template);
  const isMediumTrust = ['marriage', 'lover', 'bosom', 'kinship', 'business'].includes(template);
  return {
    template,
    farm: {
      water: true,
      cure_pests: true,
      plant: isMediumTrust,
      harvest: isMediumTrust,
      remove_crop: false,
      use_premium_fertilizer: false,
    },
    animal: {
      feed: true,
      pet: true,
      collect_product: isMediumTrust,
      buy_animal: false,
      sell_animal: false,
    },
    storage: {
      deposit: true,
      withdraw_common: isMediumTrust,
      withdraw_high_quality: isMarriage,
      withdraw_rare: false,
      sell_items: false,
    },
    construction: {
      move_common_furniture: isMediumTrust,
      move_memorial_furniture: isMarriage,
      buy_furniture: isHighTrust,
      demolish_building: false,
      expand_manor: false,
    },
    fund: {
      spend_small: isMediumTrust,
      spend_medium: isHighTrust,
      spend_large: false,
      auto_buy_seeds_feed: isHighTrust,
    },
    family: {
      child_daily_care: isHighTrust,
      family_wish_submit: isHighTrust,
      major_family_choice: false,
    },
    confirmations: {
      rare_withdraw_requires_both: true,
      large_fund_spend_requires_both: true,
      demolish_requires_both: true,
      separation_requires_preview: true,
    },
  };
}

function normalizePermissionSet(value, type) {
  const defaults = createDefaultPermissionSet(type);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const mergeGroup = groupName => ({
    ...defaults[groupName],
    ...(value[groupName] && typeof value[groupName] === 'object' && !Array.isArray(value[groupName])
      ? Object.fromEntries(Object.entries(value[groupName]).map(([key, item]) => [key, item === true]))
      : {}),
  });
  return {
    template: sanitizeText(value.template, 40) || defaults.template,
    farm: mergeGroup('farm'),
    animal: mergeGroup('animal'),
    storage: mergeGroup('storage'),
    construction: mergeGroup('construction'),
    fund: mergeGroup('fund'),
    family: mergeGroup('family'),
    confirmations: mergeGroup('confirmations'),
  };
}

function normalizeMember(entry = {}) {
  const username = normalizeUsername(entry.username);
  if (!username) return null;
  const status = MEMBER_STATUSES.has(entry.status) ? entry.status : 'pending';
  return {
    username,
    username_key: normalizeUsernameKey(username),
    display_name: sanitizeText(entry.display_name || username, 60),
    role: sanitizeText(entry.role, 30) || 'partner',
    status,
    save_id: normalizeSaveId(entry.save_id),
    save_slot: normalizeSaveSlot(entry.save_slot),
    invited_at: Number(entry.invited_at) || Number(entry.created_at) || nowSeconds(),
    accepted_at: status === 'accepted' ? Number(entry.accepted_at) || Number(entry.invited_at) || nowSeconds() : 0,
  };
}

function normalizeAuditEntry(entry = {}) {
  return {
    id: sanitizeText(entry.id, 80) || makeId('cohabit_audit'),
    action: sanitizeText(entry.action, 80),
    actor_username: normalizeUsername(entry.actor_username),
    actor_display_name: sanitizeText(entry.actor_display_name || entry.actor_username, 60),
    at: Number(entry.at) || nowSeconds(),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    detail: entry.detail && typeof entry.detail === 'object' && !Array.isArray(entry.detail) ? entry.detail : {},
  };
}

function normalizeSharedFund(value = {}) {
  return {
    balance: Math.max(0, Number(value.balance) || 0),
    ledger: Array.isArray(value.ledger) ? value.ledger.map(entry => ({
      id: sanitizeText(entry?.id, 80) || makeId('shared_fund_ledger'),
      action: sanitizeText(entry?.action, 80),
      actor_username: normalizeUsername(entry?.actor_username),
      amount: Math.max(0, Number(entry?.amount) || 0),
      at: Number(entry?.at) || nowSeconds(),
      memo: sanitizeText(entry?.memo, 160),
    })).slice(-120) : [],
  };
}

function normalizeOriginAssets(value = {}) {
  return {
    plots: Array.isArray(value.plots) ? value.plots : [],
    warehouse_items: Array.isArray(value.warehouse_items) ? value.warehouse_items : [],
    decorations: Array.isArray(value.decorations) ? value.decorations : [],
    fund_contributions: Array.isArray(value.fund_contributions) ? value.fund_contributions : [],
  };
}

function normalizeSeparationPreview(entry = {}) {
  return {
    id: sanitizeText(entry.id, 80) || makeId('separation_preview'),
    contract_id: sanitizeText(entry.contract_id, 80),
    requested_by: normalizeUsername(entry.requested_by),
    state: ['draft', 'confirmed', 'expired'].includes(entry.state) ? entry.state : 'draft',
    created_at: Number(entry.created_at) || nowSeconds(),
    expires_at: Number(entry.expires_at) || (nowSeconds() + 72 * 60 * 60),
    summary: sanitizeText(entry.summary, 300),
    asset_return: entry.asset_return && typeof entry.asset_return === 'object' ? entry.asset_return : {},
    compensation_plan: Array.isArray(entry.compensation_plan) ? entry.compensation_plan : [],
    narrative_hooks: Array.isArray(entry.narrative_hooks) ? entry.narrative_hooks.map(item => sanitizeText(item, 120)).filter(Boolean) : [],
    requires_both_confirm: entry.requires_both_confirm !== false,
  };
}

function normalizeContract(entry = {}) {
  const type = normalizeRelationType(entry.type);
  const status = CONTRACT_STATUSES.has(entry.status) ? entry.status : 'pending_acceptance';
  const members = (Array.isArray(entry.members) ? entry.members : [])
    .map(normalizeMember)
    .filter(Boolean);
  if (members.length < 2) return null;
  const uniqueMembers = [];
  const seen = new Set();
  for (const member of members) {
    if (seen.has(member.username_key)) continue;
    seen.add(member.username_key);
    uniqueMembers.push(member);
  }
  const permissions = {};
  const rawPermissions = entry.permissions && typeof entry.permissions === 'object' ? entry.permissions : {};
  for (const member of uniqueMembers) {
    permissions[member.username_key] = normalizePermissionSet(rawPermissions[member.username_key] || rawPermissions[member.username], type);
  }
  return {
    id: sanitizeText(entry.id, 80) || makeId('cohabitation_contract'),
    type,
    type_label: RELATION_TYPE_DEFS[type].label,
    title: sanitizeText(entry.title, 80) || RELATION_TYPE_DEFS[type].title,
    status,
    members: uniqueMembers,
    shared_manor_id: sanitizeText(entry.shared_manor_id, 80),
    shared_fund: normalizeSharedFund(entry.shared_fund),
    origin_assets: normalizeOriginAssets(entry.origin_assets),
    permissions,
    separation_policy: {
      cooldown_hours: Math.max(24, Number(entry.separation_policy?.cooldown_hours) || 72),
      requires_preview: entry.separation_policy?.requires_preview !== false,
      requires_both_confirm_for_high_value: entry.separation_policy?.requires_both_confirm_for_high_value !== false,
      keep_memorial: entry.separation_policy?.keep_memorial !== false,
    },
    separation_previews: Array.isArray(entry.separation_previews)
      ? entry.separation_previews.map(normalizeSeparationPreview).slice(-10)
      : [],
    created_by: normalizeUsername(entry.created_by),
    created_at: Number(entry.created_at) || nowSeconds(),
    updated_at: Number(entry.updated_at) || Number(entry.created_at) || nowSeconds(),
    activated_at: Number(entry.activated_at) || 0,
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    audit_log: Array.isArray(entry.audit_log) ? entry.audit_log.map(normalizeAuditEntry).slice(-80) : [],
  };
}

function contractBelongsToUser(contract, username) {
  const key = normalizeUsernameKey(username);
  return !!key && contract.members.some(member => member.username_key === key);
}

function buildMembersKey(members) {
  return members.map(member => member.username_key).sort().join('|');
}

function findOpenContract(store, members) {
  const targetKey = buildMembersKey(members);
  return store.contracts.find(contract =>
    OPEN_CONTRACT_STATUSES.has(contract.status)
    && buildMembersKey(contract.members) === targetKey
  ) || null;
}

function appendAudit(contract, action, actor = {}, detail = {}, idempotencyKey = '') {
  contract.audit_log = [
    normalizeAuditEntry({
      action,
      actor_username: actor.username,
      actor_display_name: actor.displayName || actor.display_name || actor.username,
      detail,
      idempotency_key: idempotencyKey,
    }),
    ...(Array.isArray(contract.audit_log) ? contract.audit_log : []),
  ].slice(0, 80);
  contract.updated_at = nowSeconds();
  return contract;
}

function toPublicContract(contract) {
  return {
    ...contract,
    members: contract.members.map(member => ({ ...member })),
    permissions: Object.fromEntries(Object.entries(contract.permissions || {}).map(([key, value]) => [key, normalizePermissionSet(value, contract.type)])),
    audit_log: (contract.audit_log || []).map(entry => ({ ...entry })).slice(0, 20),
  };
}

function buildRelationOptions() {
  return Object.values(RELATION_TYPE_DEFS).map(def => ({
    id: def.id,
    label: def.label,
    title: def.title,
    min_members: def.min_members,
    max_members: def.max_members,
    permission_template: def.permission_template,
    romance_only: def.romance_only,
  }));
}

async function resolveMemberFromUsername(username, role, status, createdAt) {
  const normalized = normalizeUsername(username);
  if (!normalized) throw createError('请先指定同居成员');
  const user = await db.getUser(normalized);
  if (!user) throw createError(`目标玩家不存在：${normalized}`, 404);
  return normalizeMember({
    username: user.username,
    display_name: user.display_name || user.username,
    role,
    status,
    invited_at: createdAt,
    accepted_at: status === 'accepted' ? createdAt : 0,
  });
}

function collectTargetUsernames(payload = {}) {
  const values = [];
  if (Array.isArray(payload.target_usernames)) values.push(...payload.target_usernames);
  if (Array.isArray(payload.member_usernames)) values.push(...payload.member_usernames);
  if (payload.target_username) values.push(payload.target_username);
  if (payload.username) values.push(payload.username);
  return [...new Set(values.map(normalizeUsername).filter(Boolean))];
}

async function listCohabitationContracts(username) {
  const actor = normalizeUsername(username);
  if (!actor) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contracts = store.contracts
    .filter(contract => contractBelongsToUser(contract, actor))
    .sort((left, right) => right.updated_at - left.updated_at)
    .map(toPublicContract);
  return {
    relation_options: buildRelationOptions(),
    contracts,
    summary: {
      total: contracts.length,
      pending: contracts.filter(contract => contract.status === 'pending_acceptance').length,
      active: contracts.filter(contract => contract.status === 'active').length,
      separation_previews: contracts.reduce((sum, contract) => sum + (contract.separation_previews?.length || 0), 0),
    },
  };
}

async function createCohabitationContract(payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const type = normalizeRelationType(payload.type);
  const typeDef = RELATION_TYPE_DEFS[type];
  const idempotencyKey = sanitizeText(payload.idempotency_key, 120);
  const createdAt = nowSeconds();
  const targetUsernames = collectTargetUsernames(payload).filter(username => normalizeUsernameKey(username) !== normalizeUsernameKey(actorUsername));
  const requestedMemberCount = 1 + targetUsernames.length;
  if (requestedMemberCount < typeDef.min_members || requestedMemberCount > typeDef.max_members) {
    throw createError(`${typeDef.label}需要 ${typeDef.min_members}-${typeDef.max_members} 名成员`, 400);
  }

  const creator = await resolveMemberFromUsername(actorUsername, 'owner', 'accepted', createdAt);
  const invitedMembers = [];
  for (const targetUsername of targetUsernames) {
    if (!taoyuanSocialRuntime.isFriendWith(actorUsername, targetUsername)) {
      throw createError('同居契约只能向好友发起', 403);
    }
    invitedMembers.push(await resolveMemberFromUsername(targetUsername, 'partner', 'pending', createdAt));
  }
  const members = [creator, ...invitedMembers];
  const store = loadContractStore();
  if (idempotencyKey) {
    const previous = store.contracts.find(contract =>
      contract.idempotency_key === idempotencyKey
      && contractBelongsToUser(contract, actorUsername)
      && OPEN_CONTRACT_STATUSES.has(contract.status)
    );
    if (previous) return { contract: toPublicContract(previous), idempotent: true };
  }
  const existing = findOpenContract(store, members);
  if (existing) return { contract: toPublicContract(existing), idempotent: true };

  const permissions = {};
  for (const member of members) {
    permissions[member.username_key] = createDefaultPermissionSet(type);
  }
  const contract = normalizeContract({
    id: makeId('cohabitation_contract'),
    type,
    title: sanitizeText(payload.title, 80) || typeDef.title,
    status: 'pending_acceptance',
    members,
    shared_fund: {
      balance: 0,
      ledger: [],
    },
    origin_assets: {
      plots: [],
      warehouse_items: [],
      decorations: [],
      fund_contributions: [],
    },
    permissions,
    created_by: actorUsername,
    created_at: createdAt,
    updated_at: createdAt,
    idempotency_key: idempotencyKey,
  });
  appendAudit(contract, 'contract_created', actor, {
    type,
    member_count: members.length,
    invited_usernames: invitedMembers.map(member => member.username),
  }, idempotencyKey);
  store.contracts = [contract, ...store.contracts].slice(0, 500);
  saveContractStore(store);
  return { contract: toPublicContract(contract), idempotent: false };
}

async function acceptCohabitationContract(contractId, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!OPEN_CONTRACT_STATUSES.has(contract.status)) throw createError('这份契约已经结束', 409);
  const member = contract.members.find(entry => entry.username_key === normalizeUsernameKey(actorUsername));
  if (!member) throw createError('你不在这份契约中', 403);
  if (member.status === 'accepted' && contract.status === 'active') {
    return { contract: toPublicContract(contract), idempotent: true };
  }
  if (member.status !== 'accepted') {
    member.status = 'accepted';
    member.accepted_at = nowSeconds();
    appendAudit(contract, 'contract_accepted', actor, { member_username: member.username });
  }
  if (contract.members.every(entry => entry.status === 'accepted')) {
    contract.status = 'active';
    if (!contract.shared_manor_id) contract.shared_manor_id = makeId('shared_manor');
    if (!contract.activated_at) contract.activated_at = nowSeconds();
    contract.shared_fund.ledger = [
      {
        id: makeId('shared_fund_ledger'),
        action: 'contract_activated',
        actor_username: actorUsername,
        amount: 0,
        at: nowSeconds(),
        memo: '共同基金已建立，个人铜币不合并。',
      },
      ...(contract.shared_fund.ledger || []),
    ].slice(0, 120);
    appendAudit(contract, 'contract_activated', actor, {
      shared_manor_id: contract.shared_manor_id,
      fund_balance: contract.shared_fund.balance,
    });
  }
  saveContractStore(store);
  return { contract: toPublicContract(contract), idempotent: false };
}

async function createSeparationPreview(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (!['active', 'separation_pending'].includes(contract.status)) throw createError('只有已生效契约可以生成分居预览', 409);
  const preview = normalizeSeparationPreview({
    id: makeId('separation_preview'),
    contract_id: contract.id,
    requested_by: actorUsername,
    created_at: nowSeconds(),
    summary: '当前预览只归集契约、权限、共同基金和来源资产占位；真实土地、仓库、装修和家庭剧情拆分会在对应系统接入后补齐。',
    asset_return: {
      plots_by_origin_owner: [],
      warehouse_items_by_origin_owner: [],
      fund_balance: contract.shared_fund.balance,
      fund_return_policy: contract.shared_fund.balance > 0 ? '按注资与经营流水拆分，缺流水时需双方确认。' : '共同基金当前为 0，不涉及返还。',
      personal_money_policy: '个人铜币从未合并，无需拆分。',
    },
    compensation_plan: [],
    narrative_hooks: [
      contract.type === 'marriage_home'
        ? '婚姻分居后续需要家庭剧情、孩子安排和共同基金确认。'
        : contract.type === 'lover_cohabitation'
          ? '恋人分居后续需要告别对话、搬离动画和回忆纪念。'
          : '知己或合伙拆伙后续需要道别记录或未来合作约定。',
    ],
    requires_both_confirm: true,
  });
  contract.separation_previews = [preview, ...(contract.separation_previews || [])].slice(0, 10);
  appendAudit(contract, 'separation_preview_created', actor, {
    preview_id: preview.id,
    reason: sanitizeText(payload.reason, 160),
  });
  saveContractStore(store);
  return { contract: toPublicContract(contract), preview };
}

module.exports = {
  RELATION_TYPE_DEFS,
  listCohabitationContracts,
  createCohabitationContract,
  acceptCohabitationContract,
  createSeparationPreview,
};
