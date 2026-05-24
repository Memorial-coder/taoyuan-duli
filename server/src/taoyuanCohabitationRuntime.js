const fs = require('fs');
const path = require('path');
const db = require('./db');
const taoyuanSocialRuntime = require('./taoyuanSocialRuntime');
const {
  createError,
  decryptTaoyuanRaw,
  findSaveIdentityById,
  getActiveSaveContext,
  getActiveSaveSlot,
  loadUserSaveSlots,
  normalizeGameplaySaveContainer,
  persistGameplayData,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');
const TAOYUAN_COHABITATION_FILE = path.join(DATA_DIR, 'taoyuan_cohabitation_contracts.json');

const CONTRACT_STORE_VERSION = 1;
const OPEN_CONTRACT_STATUSES = new Set(['pending_acceptance', 'active', 'separation_pending']);
const CONTRACT_STATUSES = new Set(['pending_acceptance', 'active', 'separation_pending', 'closed', 'declined']);
const MEMBER_STATUSES = new Set(['accepted', 'pending', 'declined', 'left']);
const FUND_LEDGER_LIMIT = 160;
const FUND_ORIGIN_LIMIT = 160;
const FUND_MAX_CONTRIBUTION_AMOUNT = 999999;
const WAREHOUSE_LEDGER_LIMIT = 160;
const WAREHOUSE_ORIGIN_LIMIT = 160;
const WAREHOUSE_MAX_DEPOSIT_QUANTITY = 99;
const WAREHOUSE_QUALITIES = new Set(['normal', 'fine', 'excellent', 'supreme']);
const PERMISSION_GROUPS = Object.freeze(['farm', 'animal', 'storage', 'construction', 'fund', 'family', 'confirmations']);

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
  const mergeGroup = groupName => {
    const group = { ...defaults[groupName] };
    const rawGroup = value[groupName] && typeof value[groupName] === 'object' && !Array.isArray(value[groupName])
      ? value[groupName]
      : {};
    for (const key of Object.keys(defaults[groupName])) {
      if (Object.prototype.hasOwnProperty.call(rawGroup, key)) group[key] = rawGroup[key] === true;
    }
    return group;
  };
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

function enforcePermissionSafetyRails(permissionSet, type) {
  const normalized = normalizePermissionSet(permissionSet, type);
  normalized.confirmations.rare_withdraw_requires_both = true;
  normalized.confirmations.large_fund_spend_requires_both = true;
  normalized.confirmations.demolish_requires_both = true;
  normalized.confirmations.separation_requires_preview = true;
  return normalized;
}

function normalizePermissionPatch(value = {}, type) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError('请提交有效的权限变更');
  }
  const defaults = createDefaultPermissionSet(type);
  const patch = {};
  let changedFieldCount = 0;
  for (const groupName of PERMISSION_GROUPS) {
    const rawGroup = value[groupName] && typeof value[groupName] === 'object' && !Array.isArray(value[groupName])
      ? value[groupName]
      : null;
    if (!rawGroup) continue;
    const groupPatch = {};
    for (const key of Object.keys(defaults[groupName])) {
      if (!Object.prototype.hasOwnProperty.call(rawGroup, key)) continue;
      groupPatch[key] = rawGroup[key] === true;
      changedFieldCount += 1;
    }
    if (Object.keys(groupPatch).length > 0) patch[groupName] = groupPatch;
  }
  if (changedFieldCount <= 0) throw createError('没有可更新的权限字段');
  return { patch, changed_field_count: changedFieldCount };
}

function applyPermissionPatch(currentPermissions, patch = {}, type) {
  const next = normalizePermissionSet(currentPermissions, type);
  for (const groupName of PERMISSION_GROUPS) {
    if (!patch[groupName]) continue;
    next[groupName] = {
      ...next[groupName],
      ...patch[groupName],
    };
  }
  return enforcePermissionSafetyRails(next, type);
}

function diffPermissionSets(before = {}, after = {}, type) {
  const defaults = createDefaultPermissionSet(type);
  const previous = normalizePermissionSet(before, type);
  const next = normalizePermissionSet(after, type);
  const changes = [];
  for (const groupName of PERMISSION_GROUPS) {
    for (const key of Object.keys(defaults[groupName])) {
      if (previous[groupName][key] === next[groupName][key]) continue;
      changes.push({
        group: groupName,
        key,
        before: previous[groupName][key] === true,
        after: next[groupName][key] === true,
      });
    }
  }
  return changes;
}

function getPlayerMoney(saveData = {}) {
  if (!saveData.player || typeof saveData.player !== 'object') saveData.player = {};
  return Math.max(0, Math.floor(Number(saveData.player.money) || 0));
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

function normalizeFundLedgerEntry(entry = {}) {
  return {
    id: sanitizeText(entry?.id, 80) || makeId('shared_fund_ledger'),
    action: sanitizeText(entry?.action, 80) || 'contribution',
    actor_username: normalizeUsername(entry?.actor_username),
    actor_display_name: sanitizeText(entry?.actor_display_name || entry?.actor_username, 60),
    amount: Math.max(0, Math.floor(Number(entry?.amount) || 0)),
    at: Number(entry?.at) || nowSeconds(),
    memo: sanitizeText(entry?.memo, 160),
    purpose: sanitizeText(entry?.purpose, 80) || 'shared_fund',
    source_owner_id: sanitizeText(entry?.source_owner_id, 100),
    source_owner_username: normalizeUsername(entry?.source_owner_username || entry?.actor_username),
    source_owner_display_name: sanitizeText(entry?.source_owner_display_name || entry?.source_owner_username || entry?.actor_username, 60),
    source_owner_key: normalizeUsernameKey(entry?.source_owner_key || entry?.source_owner_username || entry?.actor_username),
    source_save_id: normalizeSaveId(entry?.source_save_id),
    source_save_slot: normalizeSaveSlot(entry?.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry?.source_save_revision) || 0)),
    idempotency_key: sanitizeText(entry?.idempotency_key, 120),
    reversible: entry?.reversible !== false,
    compensation_hint: sanitizeText(entry?.compensation_hint, 180),
    status: ['committed', 'compensated', 'reverted'].includes(entry?.status) ? entry.status : 'committed',
  };
}

function normalizeSharedFund(value = {}) {
  return {
    balance: Math.max(0, Math.floor(Number(value.balance) || 0)),
    ledger: Array.isArray(value.ledger)
      ? value.ledger.map(normalizeFundLedgerEntry).filter(Boolean).slice(0, FUND_LEDGER_LIMIT)
      : [],
  };
}

function normalizeQuality(value) {
  const quality = String(value || 'normal').trim().toLowerCase();
  return WAREHOUSE_QUALITIES.has(quality) ? quality : 'normal';
}

function normalizePositiveInt(value, fallback = 0) {
  const normalized = Math.floor(Number(value) || 0);
  return normalized > 0 ? normalized : fallback;
}

function normalizeWarehouseItemId(value) {
  const itemId = sanitizeText(value, 80);
  return /^[a-z0-9_:-]{1,80}$/i.test(itemId) ? itemId : '';
}

function isProtectedWarehouseItemId(itemId) {
  const normalized = String(itemId || '').toLowerCase();
  if (!normalized) return true;
  return [
    'quest',
    'unique',
    'bound',
    'memorial',
    'token',
    'ticket',
    'permit',
    'deed',
    'contract',
    'receipt',
    'certificate',
    'rare',
    'legend',
    'ancient',
    'luminous',
    'wind_etched',
    'family',
    'child',
  ].some(fragment => normalized.includes(fragment))
    || normalized.startsWith('key_')
    || normalized.endsWith('_key')
    || normalized.endsWith('_core');
}

function normalizeWarehouseItem(entry = {}) {
  const itemId = normalizeWarehouseItemId(entry.item_id ?? entry.itemId);
  const quantity = normalizePositiveInt(entry.quantity, 0);
  if (!itemId || quantity <= 0) return null;
  const quality = normalizeQuality(entry.quality);
  const sourceOwnerKeys = Array.isArray(entry.source_owner_keys)
    ? [...new Set(entry.source_owner_keys.map(normalizeUsernameKey).filter(Boolean))]
    : [];
  return {
    id: sanitizeText(entry.id, 100) || `${itemId}:${quality}`,
    item_id: itemId,
    quality,
    quantity,
    first_deposit_at: Number(entry.first_deposit_at) || Number(entry.last_deposit_at) || nowSeconds(),
    last_deposit_at: Number(entry.last_deposit_at) || Number(entry.first_deposit_at) || nowSeconds(),
    source_owner_keys: sourceOwnerKeys,
  };
}

function normalizeWarehouseLedgerEntry(entry = {}) {
  const itemId = normalizeWarehouseItemId(entry.item_id ?? entry.itemId);
  const quantity = normalizePositiveInt(entry.quantity, 0);
  if (!itemId || quantity <= 0) return null;
  const action = ['deposit', 'withdraw', 'sell', 'compensate', 'revert'].includes(entry.action) ? entry.action : 'deposit';
  const actorUsername = normalizeUsername(entry.actor_username);
  const sourceOwnerUsername = normalizeUsername(entry.source_owner_username || actorUsername);
  const sourceSlots = Array.isArray(entry.source_slots)
    ? entry.source_slots.map(slot => ({
        index: Math.max(0, Math.floor(Number(slot?.index) || 0)),
        quantity: normalizePositiveInt(slot?.quantity, 0),
      })).filter(slot => slot.quantity > 0).slice(0, 8)
    : [];
  return {
    id: sanitizeText(entry.id, 100) || makeId('shared_warehouse_ledger'),
    action,
    item_id: itemId,
    quality: normalizeQuality(entry.quality),
    quantity,
    actor_username: actorUsername,
    actor_display_name: sanitizeText(entry.actor_display_name || actorUsername, 60),
    source_owner_id: sanitizeText(entry.source_owner_id, 100),
    source_owner_username: sourceOwnerUsername,
    source_owner_display_name: sanitizeText(entry.source_owner_display_name || sourceOwnerUsername, 60),
    source_owner_key: normalizeUsernameKey(entry.source_owner_key || sourceOwnerUsername),
    source_save_id: normalizeSaveId(entry.source_save_id),
    source_save_slot: normalizeSaveSlot(entry.source_save_slot),
    source_save_revision: Math.max(0, Math.floor(Number(entry.source_save_revision) || 0)),
    source_inventory: sanitizeText(entry.source_inventory, 40) || 'inventory.items',
    source_slots: sourceSlots,
    at: Number(entry.at) || nowSeconds(),
    idempotency_key: sanitizeText(entry.idempotency_key, 120),
    reversible: entry.reversible !== false,
    compensation_hint: sanitizeText(entry.compensation_hint, 180),
    status: ['committed', 'compensated', 'reverted'].includes(entry.status) ? entry.status : 'committed',
  };
}

function buildWarehouseItemsFromLedger(ledger = []) {
  const aggregate = new Map();
  for (const entry of ledger.slice().reverse()) {
    const normalized = normalizeWarehouseLedgerEntry(entry);
    if (!normalized || normalized.status !== 'committed') continue;
    const key = `${normalized.item_id}:${normalized.quality}`;
    const current = aggregate.get(key) || {
      id: key,
      item_id: normalized.item_id,
      quality: normalized.quality,
      quantity: 0,
      first_deposit_at: normalized.at,
      last_deposit_at: normalized.at,
      source_owner_keys: [],
    };
    const delta = normalized.action === 'deposit' || normalized.action === 'compensate'
      ? normalized.quantity
      : -normalized.quantity;
    current.quantity = Math.max(0, current.quantity + delta);
    current.first_deposit_at = Math.min(current.first_deposit_at || normalized.at, normalized.at);
    current.last_deposit_at = Math.max(current.last_deposit_at || normalized.at, normalized.at);
    if (normalized.source_owner_key && !current.source_owner_keys.includes(normalized.source_owner_key)) {
      current.source_owner_keys.push(normalized.source_owner_key);
    }
    aggregate.set(key, current);
  }
  return [...aggregate.values()]
    .map(normalizeWarehouseItem)
    .filter(Boolean)
    .filter(item => item.quantity > 0)
    .slice(0, WAREHOUSE_ORIGIN_LIMIT);
}

function normalizeSharedWarehouse(value = {}) {
  const ledger = Array.isArray(value.ledger)
    ? value.ledger.map(normalizeWarehouseLedgerEntry).filter(Boolean).slice(0, WAREHOUSE_LEDGER_LIMIT)
    : [];
  return {
    items: buildWarehouseItemsFromLedger(ledger),
    ledger,
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

function normalizeFarmSize(value, plotCount = 0) {
  const size = Number(value);
  if ([4, 6, 8].includes(size)) return size;
  const inferred = Math.sqrt(Number(plotCount) || 0);
  if ([4, 6, 8].includes(inferred)) return inferred;
  return 4;
}

function normalizePlotId(value, fallback) {
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : fallback;
}

function normalizePlotState(value) {
  const state = String(value || '').trim();
  if (['wasteland', 'tilled', 'planted', 'growing', 'harvestable'].includes(state)) return state;
  return 'wasteland';
}

function summarizeFarmPlot(plot = {}) {
  const cropId = sanitizeText(plot.cropId ?? plot.crop_id, 80);
  const fertilizer = sanitizeText(plot.fertilizer, 80);
  const giantCropGroup = plot.giantCropGroup ?? plot.giant_crop_group;
  return {
    state: normalizePlotState(plot.state),
    crop_id: cropId || null,
    growth_days: Math.max(0, Math.floor(Number(plot.growthDays ?? plot.growth_days) || 0)),
    watered: plot.watered === true,
    unwatered_days: Math.max(0, Math.floor(Number(plot.unwateredDays ?? plot.unwatered_days) || 0)),
    fertilizer: fertilizer || null,
    harvest_count: Math.max(0, Math.floor(Number(plot.harvestCount ?? plot.harvest_count) || 0)),
    giant_crop_group: giantCropGroup === null || giantCropGroup === undefined || giantCropGroup === ''
      ? null
      : Math.max(0, Math.floor(Number(giantCropGroup) || 0)),
    infested: plot.infested === true,
    infested_days: Math.max(0, Math.floor(Number(plot.infestedDays ?? plot.infested_days) || 0)),
    weedy: plot.weedy === true,
    weedy_days: Math.max(0, Math.floor(Number(plot.weedyDays ?? plot.weedy_days) || 0)),
  };
}

function countPlotStates(plots = []) {
  return plots.reduce((summary, plot) => {
    const state = plot?.plot_state?.state || 'wasteland';
    summary.total += 1;
    if (state !== 'wasteland') summary.active += 1;
    if (state === 'harvestable') summary.harvestable += 1;
    if (['planted', 'growing'].includes(state) && plot?.plot_state?.watered !== true) summary.waterable += 1;
    return summary;
  }, {
    total: 0,
    active: 0,
    harvestable: 0,
    waterable: 0,
  });
}

function getContainerIdentity(saveContainer = {}) {
  return saveContainer?.gameplayData?.onlineIdentity
    || saveContainer?.gameplayData?.saveIdentity
    || saveContainer?.root?.meta?.onlineIdentity
    || saveContainer?.root?.meta?.saveIdentity
    || null;
}

function resolveMemberIdentity(member = {}) {
  const memberSaveId = normalizeSaveId(member.save_id);
  if (!memberSaveId) return null;
  try {
    const identity = findSaveIdentityById(memberSaveId);
    if (!identity) return null;
    if (normalizeUsernameKey(identity.account_username) !== member.username_key) return null;
    return identity;
  } catch {
    return null;
  }
}

function resolveMemberSaveSlot(member = {}, saves = {}, identity = null) {
  const preferredSlot = normalizeSaveSlot(member.save_slot ?? identity?.save_slot);
  if (preferredSlot !== null && saves?.slots?.[preferredSlot]?.raw) return preferredSlot;
  const activeSlot = getActiveSaveSlot(member.username);
  if (activeSlot !== null && saves?.slots?.[activeSlot]?.raw) return activeSlot;
  const fallbackSlot = [0, 1, 2].find(slot => typeof saves?.slots?.[slot]?.raw === 'string' && saves.slots[slot].raw);
  return fallbackSlot === undefined ? null : fallbackSlot;
}

function readMemberFarmSnapshot(member = {}) {
  const identity = resolveMemberIdentity(member);
  try {
    const saves = loadUserSaveSlots(member.username);
    const slot = resolveMemberSaveSlot(member, saves, identity);
    if (slot === null) {
      return {
        available: false,
        unavailable_reason: '成员没有可读取的服务端存档',
        member,
        save_slot: null,
        save_revision: 0,
        save_id: normalizeSaveId(member.save_id || identity?.save_id),
        farm_size: 0,
        plots: [],
      };
    }
    const entry = saves.slots[slot];
    const decrypted = decryptTaoyuanRaw(entry.raw);
    const saveContainer = normalizeGameplaySaveContainer(decrypted);
    const gameplay = saveContainer?.gameplayData;
    const farm = gameplay?.farm && typeof gameplay.farm === 'object' ? gameplay.farm : null;
    if (!farm) {
      return {
        available: false,
        unavailable_reason: '成员存档缺少农田数据',
        member,
        save_slot: slot,
        save_revision: Number(entry.revision) || 0,
        save_id: normalizeSaveId(member.save_id || identity?.save_id),
        farm_size: 0,
        plots: [],
      };
    }
    const onlineIdentity = getContainerIdentity(saveContainer);
    const plots = Array.isArray(farm.plots) ? farm.plots : [];
    const saveId = normalizeSaveId(member.save_id || identity?.save_id || onlineIdentity?.save_id || onlineIdentity?.saveId);
    return {
      available: true,
      unavailable_reason: '',
      member,
      save_slot: slot,
      save_revision: Number(entry.revision) || 0,
      save_id: saveId,
      farm_size: normalizeFarmSize(farm.farmSize ?? farm.farm_size, plots.length),
      plots,
      greenhouse_plot_count: Array.isArray(farm.greenhousePlots) ? farm.greenhousePlots.length : 0,
      fruit_tree_count: Array.isArray(farm.fruitTrees) ? farm.fruitTrees.length : 0,
    };
  } catch {
    return {
      available: false,
      unavailable_reason: '成员存档读取失败',
      member,
      save_slot: null,
      save_revision: 0,
      save_id: normalizeSaveId(member.save_id || identity?.save_id),
      farm_size: 0,
      plots: [],
    };
  }
}

function getPlotPermissionMode(contract = {}, ownerKey = '') {
  const acceptedMembers = (contract.members || []).filter(member => member.status === 'accepted');
  const sharedOperators = acceptedMembers.filter(member => {
    if (member.username_key === ownerKey) return true;
    const farmPermissions = contract.permissions?.[member.username_key]?.farm || {};
    return farmPermissions.water === true || farmPermissions.plant === true || farmPermissions.harvest === true;
  });
  return sharedOperators.length > 1 ? 'shared' : 'owner_only';
}

function buildSharedFarmPlots(contract, farmSnapshots) {
  const plots = [];
  const regions = [];
  let columnOffset = 0;
  let maxRows = 0;

  for (const farmSnapshot of farmSnapshots) {
    const member = farmSnapshot.member;
    const width = farmSnapshot.available ? farmSnapshot.farm_size : 0;
    const height = farmSnapshot.available ? farmSnapshot.farm_size : 0;
    const originOwnerId = farmSnapshot.save_id
      ? `save:${farmSnapshot.save_id}`
      : `account:${member.username_key}`;
    const region = {
      member_username: member.username,
      member_display_name: member.display_name,
      origin_owner_id: originOwnerId,
      origin_save_id: farmSnapshot.save_id,
      x: columnOffset,
      y: 0,
      width,
      height,
      available: farmSnapshot.available,
      unavailable_reason: farmSnapshot.unavailable_reason,
    };
    regions.push(region);
    if (farmSnapshot.available) {
      const permissionMode = getPlotPermissionMode(contract, member.username_key);
      farmSnapshot.plots.forEach((plot, index) => {
        const sourcePlotId = normalizePlotId(plot?.id ?? plot?.plotId ?? plot?.plot_id, index);
        const localColumn = sourcePlotId % farmSnapshot.farm_size;
        const localRow = Math.floor(sourcePlotId / farmSnapshot.farm_size);
        plots.push({
          id: `${member.username_key}:field:${sourcePlotId}`,
          source_area: 'field',
          source_plot_id: sourcePlotId,
          origin_owner_id: originOwnerId,
          origin_save_id: farmSnapshot.save_id,
          origin_owner_username: member.username,
          origin_owner_display_name: member.display_name,
          origin_owner_key: member.username_key,
          current_steward_username: member.username,
          current_steward_display_name: member.display_name,
          permission_mode: permissionMode,
          x: columnOffset + localColumn,
          y: localRow,
          row: localRow,
          col: columnOffset + localColumn,
          local_row: localRow,
          local_col: localColumn,
          plot_state: summarizeFarmPlot(plot),
          readonly: true,
        });
      });
    }
    columnOffset += width;
    maxRows = Math.max(maxRows, height);
  }

  return {
    plots,
    regions,
    columns: columnOffset,
    rows: maxRows,
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
    shared_warehouse: normalizeSharedWarehouse(entry.shared_warehouse),
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
    shared_fund: normalizeSharedFund(contract.shared_fund),
    shared_warehouse: normalizeSharedWarehouse(contract.shared_warehouse),
    permissions: Object.fromEntries(Object.entries(contract.permissions || {}).map(([key, value]) => [key, normalizePermissionSet(value, contract.type)])),
    audit_log: (contract.audit_log || []).map(entry => ({ ...entry })).slice(0, 20),
  };
}

function getContractMember(contract, username) {
  const key = normalizeUsernameKey(username);
  return (contract.members || []).find(member => member.username_key === key) || null;
}

function assertActiveContractForActor(contract, actorUsername, actionLabel) {
  if (!contract) throw createError('同居契约不存在', 404);
  const member = getContractMember(contract, actorUsername);
  if (!member) throw createError('你不在这份契约中', 403);
  if (contract.status !== 'active') throw createError(`只有已生效契约可以${actionLabel}`, 409);
  if (member.status !== 'accepted') throw createError('只有已接受契约的成员可以操作共同庄园', 403);
  return member;
}

function canManageCohabitationPermissions(member = {}) {
  return member.status === 'accepted' && member.role === 'owner';
}

function buildPermissionSnapshot(contract, actorUsername = '') {
  const actorMember = getContractMember(contract, actorUsername);
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    editable_by_actor: canManageCohabitationPermissions(actorMember),
    idempotency_required: true,
    safety_rails: {
      rare_withdraw_requires_both: true,
      large_fund_spend_requires_both: true,
      demolish_requires_both: true,
      separation_requires_preview: true,
      confirmations_readonly: true,
    },
    groups: PERMISSION_GROUPS.map(group => ({
      id: group,
      keys: Object.keys(createDefaultPermissionSet(contract.type)[group] || {}),
    })),
    members: (contract.members || []).map(member => ({
      username: member.username,
      username_key: member.username_key,
      display_name: member.display_name,
      role: member.role,
      status: member.status,
      can_manage_permissions: canManageCohabitationPermissions(member),
      permissions: enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type),
    })),
    recent_permission_audits: (contract.audit_log || [])
      .filter(entry => entry.action === 'permissions_updated')
      .slice(0, 10),
  };
}

function buildSharedWarehouseSnapshot(contract, actorUsername = '') {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const actorKey = normalizeUsernameKey(actorUsername);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[actorKey], contract.type);
  const totalQuantity = warehouse.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    items: warehouse.items,
    ledger: warehouse.ledger.slice(0, 50),
    summary: {
      item_count: warehouse.items.length,
      total_quantity: totalQuantity,
      ledger_count: warehouse.ledger.length,
      personal_money_merged: false,
      deposit_enabled: contract.status === 'active' && actorPermissions.storage.deposit === true,
      withdraw_enabled: false,
      sell_enabled: false,
      idempotency_required: true,
      protected_qualities: ['fine', 'excellent', 'supreme'],
      protected_operations: ['withdraw_common', 'withdraw_high_quality', 'withdraw_rare', 'sell_items'],
      compensation_policy: '第一版只记录放入来源流水；误操作可先按 ledger 与 origin_assets 手工追溯，自动返还待后续接入。',
    },
    permissions: {
      can_deposit: actorPermissions.storage.deposit === true,
      can_withdraw_common: actorPermissions.storage.withdraw_common === true,
      can_withdraw_high_quality: actorPermissions.storage.withdraw_high_quality === true,
      can_withdraw_rare: actorPermissions.storage.withdraw_rare === true,
      can_sell_items: actorPermissions.storage.sell_items === true,
    },
  };
}

function buildSharedFundSnapshot(contract, actorUsername = '') {
  const fund = normalizeSharedFund(contract.shared_fund);
  const actorKey = normalizeUsernameKey(actorUsername);
  const actorPermissions = normalizePermissionSet(contract.permissions?.[actorKey], contract.type);
  return {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    balance: fund.balance,
    ledger: fund.ledger.slice(0, 50),
    summary: {
      balance: fund.balance,
      ledger_count: fund.ledger.length,
      personal_money_merged: false,
      contribution_enabled: contract.status === 'active',
      spend_enabled: false,
      idempotency_required: true,
      large_spend_requires_both: actorPermissions.confirmations.large_fund_spend_requires_both === true,
      compensation_policy: '第一版只支持成员自愿注资并记录来源流水；误操作可先按 ledger 与 origin_assets 手工追溯，自动返还和消费确认待后续接入。',
    },
    permissions: {
      can_spend_small: actorPermissions.fund.spend_small === true,
      can_spend_medium: actorPermissions.fund.spend_medium === true,
      can_spend_large: actorPermissions.fund.spend_large === true,
      can_auto_buy_seeds_feed: actorPermissions.fund.auto_buy_seeds_feed === true,
    },
  };
}

function ensureInventoryState(saveData) {
  if (!saveData.inventory || typeof saveData.inventory !== 'object') saveData.inventory = {};
  if (!Array.isArray(saveData.inventory.items)) saveData.inventory.items = [];
  if (!Array.isArray(saveData.inventory.tempItems)) saveData.inventory.tempItems = [];
}

function hasProtectedInventoryFlag(slot = {}) {
  if (slot.locked === true || slot.bound === true || slot.bind === true || slot.unique === true) return true;
  if (slot.questItem === true || slot.quest_item === true || slot.taskItem === true || slot.task_item === true) return true;
  const rarity = sanitizeText(slot.rarity, 40).toLowerCase();
  if (['rare', 'epic', 'legendary', 'unique'].includes(rarity)) return true;
  const category = sanitizeText(slot.category || slot.type, 40).toLowerCase();
  return category.includes('quest') || category.includes('key') || category.includes('memorial');
}

function countDepositableMainInventoryItem(saveData, itemId, quality) {
  ensureInventoryState(saveData);
  return saveData.inventory.items
    .filter(slot => normalizeWarehouseItemId(slot?.itemId ?? slot?.item_id) === itemId)
    .filter(slot => normalizeQuality(slot?.quality) === quality)
    .filter(slot => !hasProtectedInventoryFlag(slot))
    .reduce((sum, slot) => sum + normalizePositiveInt(slot.quantity, 0), 0);
}

function deductDepositableMainInventoryItem(saveData, itemId, quantity, quality) {
  ensureInventoryState(saveData);
  const available = countDepositableMainInventoryItem(saveData, itemId, quality);
  if (available < quantity) {
    return {
      ok: false,
      reason: '个人背包中可放入的普通物品数量不足，已锁定、稀有或临时背包物品不会被扣除',
      available,
      source_slots: [],
    };
  }

  let remaining = quantity;
  const sourceSlots = [];
  for (let index = 0; index < saveData.inventory.items.length && remaining > 0; index += 1) {
    const slot = saveData.inventory.items[index];
    if (normalizeWarehouseItemId(slot?.itemId ?? slot?.item_id) !== itemId) continue;
    if (normalizeQuality(slot?.quality) !== quality) continue;
    if (hasProtectedInventoryFlag(slot)) continue;
    const slotQuantity = normalizePositiveInt(slot.quantity, 0);
    const take = Math.min(remaining, slotQuantity);
    if (take <= 0) continue;
    slot.quantity = slotQuantity - take;
    remaining -= take;
    sourceSlots.push({ index, quantity: take });
  }
  saveData.inventory.items = saveData.inventory.items.filter(slot => normalizePositiveInt(slot.quantity, 0) > 0);
  return {
    ok: remaining <= 0,
    available,
    source_slots: sourceSlots,
  };
}

function assignGameplayDataToContext(context, data) {
  context.data = data;
  if (context.saveContainer && typeof context.saveContainer === 'object') {
    context.saveContainer.gameplayData = data;
    if (context.saveContainer.wrapped && context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root.data = data;
    } else if (context.saveContainer.root && typeof context.saveContainer.root === 'object') {
      context.saveContainer.root = data;
    }
  }
}

function normalizeWarehouseDepositPayload(payload = {}) {
  const itemId = normalizeWarehouseItemId(payload.item_id ?? payload.itemId);
  const rawQuantity = Math.floor(Number(payload.quantity) || 0);
  const requestedQuality = String(payload.quality || 'normal').trim().toLowerCase();
  if (!itemId) throw createError('请指定有效的入仓物品');
  if (rawQuantity <= 0) throw createError('入仓数量必须大于 0');
  if (rawQuantity > WAREHOUSE_MAX_DEPOSIT_QUANTITY) throw createError(`单次入仓数量不能超过 ${WAREHOUSE_MAX_DEPOSIT_QUANTITY}`);
  if (!WAREHOUSE_QUALITIES.has(requestedQuality)) throw createError('入仓物品品质参数无效');
  if (requestedQuality !== 'normal') throw createError('共同仓库第一版只允许放入普通品质物品', 403);
  if (isProtectedWarehouseItemId(itemId)) throw createError('该物品疑似关键、稀有或绑定物品，暂不允许放入共同仓库', 403);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同仓库放入需要 idempotency_key，以防断线或重试时重复扣物');
  return {
    item_id: itemId,
    quantity: rawQuantity,
    quality: requestedQuality,
    idempotency_key: idempotencyKey,
    save_slot: normalizeSaveSlot(payload.save_slot),
  };
}

function normalizeFundContributionPayload(payload = {}) {
  const amount = Math.floor(Number(payload.amount) || 0);
  if (amount <= 0) throw createError('共同基金注资金额必须大于 0');
  if (amount > FUND_MAX_CONTRIBUTION_AMOUNT) throw createError(`单次共同基金注资不能超过 ${FUND_MAX_CONTRIBUTION_AMOUNT}`);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('共同基金注资需要 idempotency_key，以防断线或重试时重复扣铜币');
  return {
    amount,
    idempotency_key: idempotencyKey,
    purpose: sanitizeText(payload.purpose, 80) || 'shared_fund',
    memo: sanitizeText(payload.memo, 160),
    save_slot: normalizeSaveSlot(payload.save_slot),
  };
}

function buildWarehouseOriginAsset(entry) {
  return {
    ledger_id: entry.id,
    item_id: entry.item_id,
    quantity: entry.quantity,
    quality: entry.quality,
    origin_owner_id: entry.source_owner_id,
    origin_owner_username: entry.source_owner_username,
    origin_owner_key: entry.source_owner_key,
    source_save_id: entry.source_save_id,
    source_save_slot: entry.source_save_slot,
    source_inventory: entry.source_inventory,
    deposited_at: entry.at,
    idempotency_key: entry.idempotency_key,
  };
}

function buildFundOriginAsset(entry) {
  return {
    ledger_id: entry.id,
    amount: entry.amount,
    origin_owner_id: entry.source_owner_id,
    origin_owner_username: entry.source_owner_username,
    origin_owner_key: entry.source_owner_key,
    source_save_id: entry.source_save_id,
    source_save_slot: entry.source_save_slot,
    purpose: entry.purpose,
    contributed_at: entry.at,
    idempotency_key: entry.idempotency_key,
  };
}

function buildWarehouseReturnPreview(contract = {}) {
  const warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const groups = new Map();
  for (const entry of warehouse.ledger) {
    if (entry.status !== 'committed' || !['deposit', 'compensate'].includes(entry.action)) continue;
    const key = `${entry.source_owner_id || entry.source_owner_key}:${entry.item_id}:${entry.quality}`;
    const current = groups.get(key) || {
      origin_owner_id: entry.source_owner_id,
      origin_owner_username: entry.source_owner_username,
      origin_owner_key: entry.source_owner_key,
      item_id: entry.item_id,
      quality: entry.quality,
      quantity: 0,
      ledger_ids: [],
    };
    current.quantity += entry.quantity;
    current.ledger_ids.push(entry.id);
    groups.set(key, current);
  }
  return [...groups.values()].filter(entry => entry.quantity > 0).slice(0, 80);
}

function buildFundReturnPreview(contract = {}) {
  const fund = normalizeSharedFund(contract.shared_fund);
  const groups = new Map();
  for (const entry of fund.ledger) {
    if (entry.status !== 'committed' || entry.action !== 'contribution' || entry.amount <= 0) continue;
    const key = entry.source_owner_id || entry.source_owner_key || entry.source_owner_username;
    if (!key) continue;
    const current = groups.get(key) || {
      origin_owner_id: entry.source_owner_id,
      origin_owner_username: entry.source_owner_username,
      origin_owner_key: entry.source_owner_key,
      amount: 0,
      ledger_ids: [],
    };
    current.amount += entry.amount;
    current.ledger_ids.push(entry.id);
    groups.set(key, current);
  }
  return [...groups.values()].filter(entry => entry.amount > 0).slice(0, 80);
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

async function getCohabitationSharedMap(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  if (!contract) throw createError('同居契约不存在', 404);
  if (!contractBelongsToUser(contract, actorUsername)) throw createError('你不在这份契约中', 403);
  if (contract.status !== 'active') throw createError('只有已生效契约可以查看共同农田地图', 409);

  const farmSnapshots = contract.members.map(readMemberFarmSnapshot);
  const layout = buildSharedFarmPlots(contract, farmSnapshots);
  const stateCounts = countPlotStates(layout.plots);
  const sharedMap = {
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: contract.status,
    readonly: true,
    writes_enabled: false,
    generated_at: nowSeconds(),
    revision: Math.max(contract.updated_at || 0, ...farmSnapshots.map(snapshot => Number(snapshot.save_revision) || 0)),
    layout: {
      columns: layout.columns,
      rows: layout.rows,
      regions: layout.regions,
      arrangement: 'side_by_side',
    },
    members: farmSnapshots.map(snapshot => ({
      username: snapshot.member.username,
      username_key: snapshot.member.username_key,
      display_name: snapshot.member.display_name,
      role: snapshot.member.role,
      status: snapshot.member.status,
      available: snapshot.available,
      unavailable_reason: snapshot.unavailable_reason,
      save_slot: snapshot.save_slot,
      save_revision: snapshot.save_revision,
      save_id: snapshot.save_id,
      farm_size: snapshot.farm_size,
      field_plot_count: Array.isArray(snapshot.plots) ? snapshot.plots.length : 0,
      greenhouse_plot_count: snapshot.greenhouse_plot_count || 0,
      fruit_tree_count: snapshot.fruit_tree_count || 0,
    })),
    plots: layout.plots,
    summary: {
      member_count: contract.members.length,
      available_member_count: farmSnapshots.filter(snapshot => snapshot.available).length,
      total_plots: stateCounts.total,
      active_plots: stateCounts.active,
      harvestable_plots: stateCounts.harvestable,
      waterable_plots: stateCounts.waterable,
      origin_owner_count: new Set(layout.plots.map(plot => plot.origin_owner_id)).size,
      personal_money_merged: false,
      shared_fund_balance: contract.shared_fund.balance,
      included_sources: ['farm.plots'],
      deferred_sources: ['farm.greenhousePlots', 'farm.fruitTrees', 'animal', 'warehouse', 'decoration'],
    },
  };

  return {
    contract: toPublicContract(contract),
    shared_map: sharedMap,
  };
}

async function getCohabitationWarehouse(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看共同仓库');
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
  };
}

async function getCohabitationFund(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看共同基金');
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
  };
}

async function getCohabitationPermissions(contractId, actor = {}) {
  const actorUsername = normalizeUsername(typeof actor === 'string' ? actor : actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  assertActiveContractForActor(contract, actorUsername, '查看同居权限');
  for (const member of contract.members || []) {
    contract.permissions[member.username_key] = enforcePermissionSafetyRails(contract.permissions?.[member.username_key], contract.type);
  }
  return {
    contract: toPublicContract(contract),
    permissions_panel: buildPermissionSnapshot(contract, actorUsername),
  };
}

async function depositCohabitationWarehouseItem(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const deposit = normalizeWarehouseDepositPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '向共同仓库放入物品');
  const actorPermissions = normalizePermissionSet(contract.permissions?.[member.username_key], contract.type);
  if (actorPermissions.storage.deposit !== true) throw createError('你没有向共同仓库放入物品的权限', 403);

  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  const previousEntry = contract.shared_warehouse.ledger.find(entry =>
    entry.idempotency_key && entry.idempotency_key === deposit.idempotency_key && entry.action === 'deposit'
  );
  if (previousEntry) {
    return {
      contract: toPublicContract(contract),
      warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
      ledger_entry: previousEntry,
      idempotent: true,
    };
  }

  const context = getActiveSaveContext(
    actorUsername,
    deposit.save_slot,
    '当前账号没有可用的桃源乡服务端存档，暂时无法向共同仓库放入物品'
  );
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  const beforeMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  const deduction = deductDepositableMainInventoryItem(projectedData, deposit.item_id, deposit.quantity, deposit.quality);
  if (!deduction.ok) throw createError(deduction.reason);
  const afterMoney = Math.max(0, Math.floor(Number(projectedData?.player?.money) || 0));
  if (afterMoney !== beforeMoney) throw createError('共同仓库放入不会处理个人铜币，已中止本次操作', 500);

  assignGameplayDataToContext(context, projectedData);
  const saveRevision = persistGameplayData(context);
  const sourceSaveId = normalizeSaveId(context.identity?.save_id);
  const sourceSaveSlot = normalizeSaveSlot(context.slot);
  const sourceOwnerId = sourceSaveId ? `save:${sourceSaveId}` : `account:${member.username_key}`;
  if (sourceSaveId) member.save_id = sourceSaveId;
  if (sourceSaveSlot !== null) member.save_slot = sourceSaveSlot;

  const ledgerEntry = normalizeWarehouseLedgerEntry({
    id: makeId('shared_warehouse_ledger'),
    action: 'deposit',
    item_id: deposit.item_id,
    quantity: deposit.quantity,
    quality: deposit.quality,
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    source_owner_id: sourceOwnerId,
    source_owner_username: member.username,
    source_owner_display_name: member.display_name || member.username,
    source_owner_key: member.username_key,
    source_save_id: sourceSaveId,
    source_save_slot: sourceSaveSlot,
    source_save_revision: saveRevision,
    source_inventory: 'inventory.items',
    source_slots: deduction.source_slots,
    at: nowSeconds(),
    idempotency_key: deposit.idempotency_key,
    reversible: true,
    compensation_hint: '第一版仅支持放入与追溯；若误放入，需要后续取出 / 返还流程或人工按 ledger 补偿。',
    status: 'committed',
  });
  contract.shared_warehouse.ledger = [ledgerEntry, ...contract.shared_warehouse.ledger].slice(0, WAREHOUSE_LEDGER_LIMIT);
  contract.shared_warehouse = normalizeSharedWarehouse(contract.shared_warehouse);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.warehouse_items = [
    buildWarehouseOriginAsset(ledgerEntry),
    ...contract.origin_assets.warehouse_items,
  ].slice(0, WAREHOUSE_ORIGIN_LIMIT);
  appendAudit(contract, 'warehouse_deposited', actor, {
    ledger_id: ledgerEntry.id,
    item_id: ledgerEntry.item_id,
    quantity: ledgerEntry.quantity,
    quality: ledgerEntry.quality,
    source_owner_id: ledgerEntry.source_owner_id,
    source_save_id: ledgerEntry.source_save_id,
    source_save_slot: ledgerEntry.source_save_slot,
    source_inventory: ledgerEntry.source_inventory,
    save_revision: saveRevision,
    reversible: ledgerEntry.reversible,
    withdraw_enabled: false,
    sell_enabled: false,
  }, deposit.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    warehouse: buildSharedWarehouseSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntry,
    idempotent: false,
    personal_inventory: {
      item_id: deposit.item_id,
      quality: deposit.quality,
      remaining_quantity: countDepositableMainInventoryItem(projectedData, deposit.item_id, deposit.quality),
      personal_money_merged: false,
    },
  };
}

async function updateCohabitationPermissions(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const idempotencyKey = sanitizeText(payload.idempotency_key || payload.operation_id || payload.request_id, 120);
  if (!idempotencyKey) throw createError('同居权限变更需要 idempotency_key，以防断线或重试时重复写入审计');
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const actorMember = assertActiveContractForActor(contract, actorUsername, '调整同居权限');
  if (!canManageCohabitationPermissions(actorMember)) throw createError('只有契约发起者可以调整同居权限第一版', 403);

  const previousAudit = (contract.audit_log || []).find(entry =>
    entry.action === 'permissions_updated' && entry.idempotency_key === idempotencyKey
  );
  if (previousAudit) {
    return {
      contract: toPublicContract(contract),
      permissions_panel: buildPermissionSnapshot(contract, actorUsername),
      idempotent: true,
      audit_entry: previousAudit,
    };
  }

  const targetUsername = normalizeUsername(payload.target_username || payload.member_username || payload.username);
  const targetMember = getContractMember(contract, targetUsername);
  if (!targetMember) throw createError('要调整权限的成员不在这份契约中', 404);
  if (targetMember.status !== 'accepted') throw createError('只能调整已接受契约成员的权限', 409);

  const { patch } = normalizePermissionPatch(payload.permissions || payload.patch, contract.type);
  const beforePermissions = enforcePermissionSafetyRails(contract.permissions?.[targetMember.username_key], contract.type);
  const nextPermissions = applyPermissionPatch(beforePermissions, patch, contract.type);
  const changes = diffPermissionSets(beforePermissions, nextPermissions, contract.type);
  if (changes.length <= 0) throw createError('权限变更没有产生实际变化');

  contract.permissions[targetMember.username_key] = nextPermissions;
  appendAudit(contract, 'permissions_updated', actor, {
    target_username: targetMember.username,
    target_display_name: targetMember.display_name,
    changed_fields: changes,
    changed_field_count: changes.length,
    confirmations_locked: true,
    note: sanitizeText(payload.note || payload.memo, 160),
  }, idempotencyKey);
  saveContractStore(store);
  const auditEntry = contract.audit_log.find(entry => entry.idempotency_key === idempotencyKey && entry.action === 'permissions_updated');
  return {
    contract: toPublicContract(contract),
    permissions_panel: buildPermissionSnapshot(contract, actorUsername),
    changed_fields: changes,
    idempotent: false,
    audit_entry: auditEntry,
  };
}

async function contributeCohabitationFund(contractId, payload = {}, actor = {}) {
  const actorUsername = normalizeUsername(actor.username);
  if (!actorUsername) throw createError('请先登录', 401);
  const contribution = normalizeFundContributionPayload(payload);
  const store = loadContractStore();
  const contract = store.contracts.find(entry => entry.id === sanitizeText(contractId, 80));
  const member = assertActiveContractForActor(contract, actorUsername, '向共同基金注资');

  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  const previousEntry = contract.shared_fund.ledger.find(entry =>
    entry.idempotency_key && entry.idempotency_key === contribution.idempotency_key && entry.action === 'contribution'
  );
  if (previousEntry) {
    return {
      contract: toPublicContract(contract),
      fund: buildSharedFundSnapshot(contract, actorUsername),
      ledger_entry: previousEntry,
      idempotent: true,
      personal_money: {
        personal_money_merged: false,
      },
    };
  }

  const context = getActiveSaveContext(
    actorUsername,
    contribution.save_slot,
    '当前账号没有可用的桃源乡服务端存档，暂时无法向共同基金注资'
  );
  context.username = actorUsername;
  const projectedData = JSON.parse(JSON.stringify(context.data));
  const beforeMoney = getPlayerMoney(projectedData);
  if (beforeMoney < contribution.amount) throw createError('个人铜币不足，暂时无法向共同基金注资');
  projectedData.player.money = beforeMoney - contribution.amount;
  const afterMoney = getPlayerMoney(projectedData);
  if (afterMoney !== beforeMoney - contribution.amount) throw createError('个人铜币扣减校验失败，已中止本次共同基金注资', 500);

  assignGameplayDataToContext(context, projectedData);
  const saveRevision = persistGameplayData(context);
  const sourceSaveId = normalizeSaveId(context.identity?.save_id);
  const sourceSaveSlot = normalizeSaveSlot(context.slot);
  const sourceOwnerId = sourceSaveId ? `save:${sourceSaveId}` : `account:${member.username_key}`;
  if (sourceSaveId) member.save_id = sourceSaveId;
  if (sourceSaveSlot !== null) member.save_slot = sourceSaveSlot;

  const ledgerEntry = normalizeFundLedgerEntry({
    id: makeId('shared_fund_ledger'),
    action: 'contribution',
    actor_username: actorUsername,
    actor_display_name: actor.displayName || actor.display_name || actorUsername,
    amount: contribution.amount,
    at: nowSeconds(),
    memo: contribution.memo,
    purpose: contribution.purpose,
    source_owner_id: sourceOwnerId,
    source_owner_username: member.username,
    source_owner_display_name: member.display_name || member.username,
    source_owner_key: member.username_key,
    source_save_id: sourceSaveId,
    source_save_slot: sourceSaveSlot,
    source_save_revision: saveRevision,
    idempotency_key: contribution.idempotency_key,
    reversible: true,
    compensation_hint: '第一版仅支持注资与追溯；若误注资，需要后续返还流程或人工按 ledger 补偿。',
    status: 'committed',
  });
  contract.shared_fund.balance = Math.max(0, Math.floor(Number(contract.shared_fund.balance) || 0)) + contribution.amount;
  contract.shared_fund.ledger = [ledgerEntry, ...contract.shared_fund.ledger].slice(0, FUND_LEDGER_LIMIT);
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  contract.origin_assets = normalizeOriginAssets(contract.origin_assets);
  contract.origin_assets.fund_contributions = [
    buildFundOriginAsset(ledgerEntry),
    ...contract.origin_assets.fund_contributions,
  ].slice(0, FUND_ORIGIN_LIMIT);
  appendAudit(contract, 'fund_contributed', actor, {
    ledger_id: ledgerEntry.id,
    amount: ledgerEntry.amount,
    purpose: ledgerEntry.purpose,
    source_owner_id: ledgerEntry.source_owner_id,
    source_save_id: ledgerEntry.source_save_id,
    source_save_slot: ledgerEntry.source_save_slot,
    save_revision: saveRevision,
    reversible: ledgerEntry.reversible,
    spend_enabled: false,
    remaining_money: afterMoney,
  }, contribution.idempotency_key);
  saveContractStore(store);

  return {
    contract: toPublicContract(contract),
    fund: buildSharedFundSnapshot(contract, actorUsername),
    ledger_entry: ledgerEntry,
    idempotent: false,
    personal_money: {
      remaining_money: afterMoney,
      deducted_amount: contribution.amount,
      personal_money_merged: false,
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
    shared_warehouse: {
      items: [],
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
    ].slice(0, FUND_LEDGER_LIMIT);
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
  contract.shared_fund = normalizeSharedFund(contract.shared_fund);
  const preview = normalizeSeparationPreview({
    id: makeId('separation_preview'),
    contract_id: contract.id,
    requested_by: actorUsername,
    created_at: nowSeconds(),
    summary: '当前预览只归集契约、权限、共同基金和来源资产占位；真实土地、仓库、装修和家庭剧情拆分会在对应系统接入后补齐。',
    asset_return: {
      plots_by_origin_owner: [],
      warehouse_items_by_origin_owner: buildWarehouseReturnPreview(contract),
      fund_contributions_by_origin_owner: buildFundReturnPreview(contract),
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
  getCohabitationSharedMap,
  getCohabitationWarehouse,
  getCohabitationFund,
  getCohabitationPermissions,
  depositCohabitationWarehouseItem,
  contributeCohabitationFund,
  updateCohabitationPermissions,
  createCohabitationContract,
  acceptCohabitationContract,
  createSeparationPreview,
};
