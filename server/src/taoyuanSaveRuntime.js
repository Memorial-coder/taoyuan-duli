const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_SAVES_DIR = path.join(DATA_DIR, 'taoyuan_saves');
const TAOYUAN_ACTIVE_SLOT_FILE = path.join(DATA_DIR, 'taoyuan_active_slots.json');
const TAOYUAN_SAVE_IDENTITIES_FILE = path.join(DATA_DIR, 'taoyuan_save_identities.json');
const SAVE_ENCRYPTION_KEY = 'taoyuanxiang_2024_secret';
const CURRENT_SAVE_VERSION = 4;
const SAVE_ID_MIN = 100000000;
const SAVE_ID_MAX_EXCLUSIVE = 1000000000;
const SAVE_FIELD_ANOMALY_AUDIT_LIMIT = 20;
const SAVE_PLAYER_MONEY_LIMIT = 999999999;
const SAVE_INVENTORY_QUANTITY_LIMIT = 999999;
const SAVE_FARM_PLOT_LIMIT = 400;
const SAVE_FARM_GROWTH_DAY_LIMIT = 9999;
const POTENTIAL_RESOURCE_IDS = ['potential_insight', 'spirit_breath', 'artisan_notes', 'mountain_jade'];
const POTENTIAL_NODE_MAX_RANK = {
  body_vital_root: 3,
  body_stamina_channel: 3,
  body_safe_fall: 3,
  body_short_rest: 3,
  body_low_hp_sense: 1,
  craft_processing_flow: 3,
  craft_tool_rhythm: 3,
  craft_alchemy_patience: 3,
  craft_storage_order: 3,
  craft_workshop_hint: 1,
  trail_hazard_reading: 3,
  trail_mine_entry_hint: 1,
  trail_forage_window: 3,
  trail_expedition_reserve: 3,
  trail_region_marker: 1,
  harmony_quest_bias: 1,
  harmony_festival_supply: 3,
  harmony_gift_hint: 3,
  harmony_society_order: 3,
  harmony_visitor_chance: 1,
};

function createError(message, status = 400, code = '') {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function ensureTaoyuanSavesDir() {
  fs.mkdirSync(TAOYUAN_SAVES_DIR, { recursive: true });
}

function ensureActiveSlotDir() {
  fs.mkdirSync(path.dirname(TAOYUAN_ACTIVE_SLOT_FILE), { recursive: true });
}

function getTaoyuanSavePath(username) {
  return path.join(TAOYUAN_SAVES_DIR, `${String(username)}.json`);
}

function normalizeSlotEntry(entry) {
  if (typeof entry === 'string' && entry) return { raw: entry, revision: 0 };
  if (!entry || typeof entry !== 'object' || typeof entry.raw !== 'string' || !entry.raw) return null;
  return {
    raw: entry.raw,
    revision: Number.isFinite(Number(entry.revision)) ? Math.floor(Number(entry.revision)) : 0,
  };
}

function createEmptySlots() {
  return { 0: null, 1: null, 2: null };
}

function createCorruptedSaveStoreError(filePath) {
  return createError(
    `桃源乡服务端存档文件已损坏，已阻止读取或覆盖：${path.basename(filePath)}`,
    500,
    'TAOYUAN_SAVE_STORE_CORRUPTED'
  );
}

function readJsonFileStrict(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw createCorruptedSaveStoreError(filePath);
  }
}

function writeJsonFileAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
    throw error;
  }
}

function loadUserSaveSlots(username) {
  ensureTaoyuanSavesDir();
  const file = getTaoyuanSavePath(username);
  if (!fs.existsSync(file)) return { slots: createEmptySlots() };
  const raw = readJsonFileStrict(file);
  return {
    slots: {
      0: normalizeSlotEntry(raw?.slots?.[0]),
      1: normalizeSlotEntry(raw?.slots?.[1]),
      2: normalizeSlotEntry(raw?.slots?.[2]),
    },
  };
}

function saveUserSaveSlots(username, data) {
  ensureTaoyuanSavesDir();
  const file = getTaoyuanSavePath(username);
  if (fs.existsSync(file)) readJsonFileStrict(file);
  writeJsonFileAtomic(file, data);
}

function deleteUserSaveData(username) {
  ensureTaoyuanSavesDir();
  const safeUsername = String(username || '');
  const filePath = getTaoyuanSavePath(safeUsername);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}

  const activeSlots = loadActiveSlots();
  if (Object.prototype.hasOwnProperty.call(activeSlots, safeUsername)) {
    delete activeSlots[safeUsername];
    saveActiveSlots(activeSlots);
  }
  removeSaveIdentitiesForUser(safeUsername);
}

function normalizeSaveSlot(slot) {
  if (slot === null || slot === undefined || slot === '') return null;
  const normalized = Number(slot);
  return Number.isInteger(normalized) && normalized >= 0 && normalized <= 2 ? normalized : null;
}

function normalizeIdentityText(value, maxLength = 40) {
  return String(value || '').normalize('NFKC').trim().slice(0, maxLength);
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeSaveId(value) {
  const saveId = Number(value);
  return Number.isInteger(saveId) && saveId >= SAVE_ID_MIN && saveId < SAVE_ID_MAX_EXCLUSIVE ? saveId : 0;
}

function buildSaveIdentityKey(username, slot) {
  const accountUsername = normalizeIdentityText(username, 80);
  const saveSlot = normalizeSaveSlot(slot);
  if (!accountUsername || saveSlot === null) return '';
  return JSON.stringify([accountUsername, saveSlot]);
}

function createEmptySaveIdentityStore() {
  return { identities: {} };
}

function normalizeSaveIdentityRecord(entry, fallbackUsername = '', fallbackSlot = null) {
  const saveId = normalizeSaveId(entry?.save_id);
  const accountUsername = normalizeIdentityText(entry?.account_username || fallbackUsername, 80);
  const saveSlot = normalizeSaveSlot(entry?.save_slot ?? fallbackSlot);
  if (!saveId || !accountUsername || saveSlot === null) return null;
  const createdAt = Math.max(0, Math.floor(Number(entry?.created_at) || nowSeconds()));
  const updatedAt = Math.max(createdAt, Math.floor(Number(entry?.updated_at) || createdAt));
  return {
    save_id: saveId,
    account_username: accountUsername,
    save_slot: saveSlot,
    nickname_snapshot: normalizeIdentityText(entry?.nickname_snapshot || accountUsername, 40),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function normalizeEmbeddedSaveIdentity(entry) {
  return normalizeSaveIdentityRecord({
    save_id: entry?.save_id ?? entry?.saveId,
    account_username: entry?.account_username ?? entry?.accountUsername,
    save_slot: entry?.save_slot ?? entry?.saveSlot,
    nickname_snapshot: entry?.nickname_snapshot ?? entry?.nicknameSnapshot,
    created_at: entry?.created_at ?? entry?.createdAt,
    updated_at: entry?.updated_at ?? entry?.updatedAt,
  });
}

function loadSaveIdentityStore() {
  try {
    if (!fs.existsSync(TAOYUAN_SAVE_IDENTITIES_FILE)) return createEmptySaveIdentityStore();
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_SAVE_IDENTITIES_FILE, 'utf8'));
    const identities = {};
    for (const [key, value] of Object.entries(raw?.identities || {})) {
      const parsedKey = (() => {
        try {
          const tuple = JSON.parse(key);
          return Array.isArray(tuple) ? tuple : [];
        } catch {
          return [];
        }
      })();
      const record = normalizeSaveIdentityRecord(value, parsedKey[0], parsedKey[1]);
      if (record) identities[buildSaveIdentityKey(record.account_username, record.save_slot)] = record;
    }
    return { identities };
  } catch {
    return createEmptySaveIdentityStore();
  }
}

function saveSaveIdentityStore(store) {
  writeJsonFileAtomic(TAOYUAN_SAVE_IDENTITIES_FILE, {
    identities: store?.identities && typeof store.identities === 'object' ? store.identities : {},
  });
}

function collectIssuedSaveIds(store, exceptKey = '') {
  const issued = new Set();
  for (const [key, value] of Object.entries(store?.identities || {})) {
    if (key === exceptKey) continue;
    const saveId = normalizeSaveId(value?.save_id);
    if (saveId) issued.add(saveId);
  }
  return issued;
}

function allocateSaveId(store, key) {
  const issued = collectIssuedSaveIds(store, key);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = crypto.randomInt(SAVE_ID_MIN, SAVE_ID_MAX_EXCLUSIVE);
    if (!issued.has(candidate)) return candidate;
  }
  for (let candidate = SAVE_ID_MIN; candidate < SAVE_ID_MAX_EXCLUSIVE; candidate += 1) {
    if (!issued.has(candidate)) return candidate;
  }
  throw createError('可用存档数字 ID 已耗尽', 500);
}

function getSaveNicknameSnapshot(container, username) {
  const player = container?.gameplayData?.player || {};
  return normalizeIdentityText(player.playerName || player.name || player.displayName || username, 40) || '未命名玩家';
}

function ensureSaveIdentityRecord(username, slot, nicknameSnapshot = '') {
  const accountUsername = normalizeIdentityText(username, 80);
  const saveSlot = normalizeSaveSlot(slot);
  if (!accountUsername || saveSlot === null) return null;

  const key = buildSaveIdentityKey(accountUsername, saveSlot);
  const store = loadSaveIdentityStore();
  const current = normalizeSaveIdentityRecord(store.identities[key], accountUsername, saveSlot);
  const issuedByOthers = collectIssuedSaveIds(store, key);
  const snapshot = normalizeIdentityText(nicknameSnapshot || accountUsername, 40);
  const now = nowSeconds();
  let changed = false;
  let record = current;

  if (!record || issuedByOthers.has(record.save_id)) {
    record = {
      save_id: allocateSaveId(store, key),
      account_username: accountUsername,
      save_slot: saveSlot,
      nickname_snapshot: snapshot,
      created_at: now,
      updated_at: now,
    };
    changed = true;
  }

  if (record.nickname_snapshot !== snapshot) {
    record = { ...record, nickname_snapshot: snapshot, updated_at: now };
    changed = true;
  }
  if (record.account_username !== accountUsername || record.save_slot !== saveSlot) {
    record = { ...record, account_username: accountUsername, save_slot: saveSlot, updated_at: now };
    changed = true;
  }

  if (changed) {
    store.identities[key] = record;
    saveSaveIdentityStore(store);
  }
  return record;
}

function getSaveSlotIdentity(username, slot) {
  const key = buildSaveIdentityKey(username, slot);
  if (!key) return null;
  const store = loadSaveIdentityStore();
  return normalizeSaveIdentityRecord(store.identities[key]);
}

function findSaveIdentityById(saveId) {
  const normalizedSaveId = normalizeSaveId(saveId);
  if (!normalizedSaveId) return null;
  const store = loadSaveIdentityStore();
  for (const value of Object.values(store.identities || {})) {
    const record = normalizeSaveIdentityRecord(value);
    if (record?.save_id === normalizedSaveId) return record;
  }
  return null;
}

function listSaveIdentities() {
  const store = loadSaveIdentityStore();
  return Object.values(store.identities || {})
    .map(value => normalizeSaveIdentityRecord(value))
    .filter(Boolean)
    .sort((left, right) => Number(right.updated_at) - Number(left.updated_at));
}

function removeSaveSlotIdentity(username, slot) {
  const key = buildSaveIdentityKey(username, slot);
  if (!key) return false;
  const store = loadSaveIdentityStore();
  if (!Object.prototype.hasOwnProperty.call(store.identities, key)) return false;
  delete store.identities[key];
  saveSaveIdentityStore(store);
  return true;
}

function removeSaveIdentitiesForUser(username) {
  const accountUsername = normalizeIdentityText(username, 80);
  if (!accountUsername) return false;
  const store = loadSaveIdentityStore();
  let changed = false;
  for (const [key, value] of Object.entries(store.identities || {})) {
    const record = normalizeSaveIdentityRecord(value);
    if (record?.account_username === accountUsername) {
      delete store.identities[key];
      changed = true;
    }
  }
  if (changed) saveSaveIdentityStore(store);
  return changed;
}

function loadActiveSlots() {
  try {
    if (!fs.existsSync(TAOYUAN_ACTIVE_SLOT_FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(TAOYUAN_ACTIVE_SLOT_FILE, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function saveActiveSlots(data) {
  ensureActiveSlotDir();
  writeJsonFileAtomic(TAOYUAN_ACTIVE_SLOT_FILE, data);
}

function getActiveSaveSlot(username) {
  const slot = loadActiveSlots()[String(username)];
  return normalizeSaveSlot(slot);
}

function setActiveSaveSlot(username, slot) {
  const normalizedSlot = normalizeSaveSlot(slot);
  const data = loadActiveSlots();
  if (!username) return;
  if (normalizedSlot === null) {
    delete data[String(username)];
  } else {
    data[String(username)] = normalizedSlot;
  }
  saveActiveSlots(data);
}

function clearActiveSaveSlotIfMatches(username, slot) {
  const data = loadActiveSlots();
  if (data[String(username)] === Number(slot)) {
    delete data[String(username)];
    saveActiveSlots(data);
  }
}

function nextSlotRevision(currentRevision = 0) {
  return Math.max(0, Math.floor(Number(currentRevision) || 0)) + 1;
}

function evpBytesToKey(passwordBuffer, saltBuffer, keyLen, ivLen) {
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < keyLen + ivLen) {
    const hash = crypto.createHash('md5');
    hash.update(block);
    hash.update(passwordBuffer);
    hash.update(saltBuffer);
    block = hash.digest();
    derived = Buffer.concat([derived, block]);
  }
  return {
    key: derived.slice(0, keyLen),
    iv: derived.slice(keyLen, keyLen + ivLen),
  };
}

function decryptTaoyuanRaw(raw) {
  try {
    const input = Buffer.from(String(raw || ''), 'base64');
    if (input.length < 16 || input.slice(0, 8).toString('utf8') !== 'Salted__') return null;
    const salt = input.slice(8, 16);
    const payload = input.slice(16);
    const { key, iv } = evpBytesToKey(Buffer.from(SAVE_ENCRYPTION_KEY, 'utf8'), salt, 32, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

function encryptTaoyuanData(data) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(Buffer.from(SAVE_ENCRYPTION_KEY, 'utf8'), salt, 32, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString('base64');
}

function buildSaveMeta(metaLike = {}, savedAtFallback) {
  const savedAt = typeof metaLike?.savedAt === 'string' && metaLike.savedAt
    ? metaLike.savedAt
    : (savedAtFallback || new Date().toISOString());
  const saveVersion = Number(metaLike?.saveVersion);
  const meta = {
    saveVersion: Number.isFinite(saveVersion) ? saveVersion : CURRENT_SAVE_VERSION,
    savedAt,
  };
  const onlineIdentity = normalizeEmbeddedSaveIdentity(metaLike?.onlineIdentity || metaLike?.saveIdentity);
  if (onlineIdentity) meta.onlineIdentity = onlineIdentity;
  return meta;
}

function normalizeGameplaySaveContainer(rawData) {
  if (!rawData || typeof rawData !== 'object') return null;

  if (rawData.data && typeof rawData.data === 'object') {
    const savedAt = typeof rawData.savedAt === 'string' && rawData.savedAt
      ? rawData.savedAt
      : (rawData.meta?.savedAt || new Date().toISOString());
    return {
      wrapped: true,
      root: {
        ...rawData,
        meta: buildSaveMeta(rawData.meta || {}, savedAt),
        savedAt,
      },
      gameplayData: rawData.data,
    };
  }

  return {
    wrapped: false,
    root: rawData,
    gameplayData: rawData,
  };
}

function summarizeSaveFieldValue(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 80);
  if (value === null) return null;
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') return 'object';
  return typeof value;
}

function createSaveFieldAnomaly(action, fieldPath, observedValue, limit, normalizedValue = null) {
  return {
    id: `${action}:${fieldPath}`,
    action,
    field_path: fieldPath,
    observed_value: summarizeSaveFieldValue(observedValue),
    normalized_value: summarizeSaveFieldValue(normalizedValue),
    limit,
    severity: 'blocked',
    detected_at: new Date().toISOString(),
    required_operation: 'repair_save_fields_before_write',
  };
}

function detectGameplaySaveFieldAnomalies(gameplayData = {}) {
  const anomalies = [];
  const push = (action, fieldPath, observedValue, limit, normalizedValue = null) => {
    if (anomalies.length < SAVE_FIELD_ANOMALY_AUDIT_LIMIT) {
      anomalies.push(createSaveFieldAnomaly(action, fieldPath, observedValue, limit, normalizedValue));
    }
  };
  const isFiniteInteger = value => Number.isInteger(Number(value)) && Number.isFinite(Number(value));
  const assertIntegerRange = (fieldPath, value, min, max) => {
    if (value === undefined || value === null || value === '') return;
    const number = Number(value);
    if (!Number.isFinite(number) || !Number.isInteger(number) || number < min || number > max) {
      push('numeric_field_out_of_range', fieldPath, value, `${min}..${max}`, Math.min(max, Math.max(min, Math.floor(Number.isFinite(number) ? number : min))));
    }
  };
  const assertNumberRange = (fieldPath, value, min, max) => {
    if (value === undefined || value === null || value === '') return;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      push('numeric_field_out_of_range', fieldPath, value, `${min}..${max}`, Math.min(max, Math.max(min, Number.isFinite(number) ? number : min)));
    }
  };

  if (!gameplayData || typeof gameplayData !== 'object') return anomalies;
  if (gameplayData.player && typeof gameplayData.player === 'object') {
    assertIntegerRange('player.money', gameplayData.player.money, 0, SAVE_PLAYER_MONEY_LIMIT);
  }
  if (gameplayData.game && typeof gameplayData.game === 'object') {
    assertIntegerRange('game.year', gameplayData.game.year, 1, 99);
    assertIntegerRange('game.day', gameplayData.game.day, 1, 28);
    if (gameplayData.game.season !== undefined && !['spring', 'summer', 'autumn', 'fall', 'winter'].includes(String(gameplayData.game.season))) {
      push('illegal_enum_state', 'game.season', gameplayData.game.season, 'spring|summer|autumn|winter', 'spring');
    }
  }
  const inspectInventoryList = (fieldPath, value) => {
    if (value === undefined || value === null) return;
    if (!Array.isArray(value)) {
      push('illegal_collection_state', fieldPath, value, 'array', []);
      return;
    }
    value.slice(0, 120).forEach((slot, index) => {
      if (!slot || typeof slot !== 'object') {
        push('illegal_inventory_slot', `${fieldPath}[${index}]`, slot, 'object', null);
        return;
      }
      const itemId = slot.itemId ?? slot.item_id;
      if (itemId !== undefined && typeof itemId !== 'string') {
        push('illegal_inventory_item_id', `${fieldPath}[${index}].itemId`, itemId, 'string', String(itemId || ''));
      }
      assertIntegerRange(`${fieldPath}[${index}].quantity`, slot.quantity, 0, SAVE_INVENTORY_QUANTITY_LIMIT);
    });
  };
  if (gameplayData.inventory && typeof gameplayData.inventory === 'object') {
    inspectInventoryList('inventory.items', gameplayData.inventory.items);
    inspectInventoryList('inventory.tempItems', gameplayData.inventory.tempItems);
  }
  if (gameplayData.farm && typeof gameplayData.farm === 'object') {
    const plots = gameplayData.farm.plots;
    if (plots !== undefined) {
      if (!Array.isArray(plots)) {
        push('illegal_collection_state', 'farm.plots', plots, 'array', []);
      } else {
        if (plots.length > SAVE_FARM_PLOT_LIMIT) push('collection_overflow', 'farm.plots', plots.length, SAVE_FARM_PLOT_LIMIT, SAVE_FARM_PLOT_LIMIT);
        const validPlotStates = new Set(['wasteland', 'tilled', 'planted', 'growing', 'harvestable', 'withered', 'empty', 'locked']);
        plots.slice(0, SAVE_FARM_PLOT_LIMIT).forEach((plot, index) => {
          if (!plot || typeof plot !== 'object') {
            push('illegal_farm_plot', `farm.plots[${index}]`, plot, 'object', null);
            return;
          }
          if (plot.state !== undefined && !validPlotStates.has(String(plot.state))) {
            push('illegal_enum_state', `farm.plots[${index}].state`, plot.state, [...validPlotStates].join('|'), 'wasteland');
          }
          assertNumberRange(`farm.plots[${index}].growthDays`, plot.growthDays, 0, SAVE_FARM_GROWTH_DAY_LIMIT);
        });
      }
    }
  }
  if (gameplayData.potential !== undefined) {
    if (!gameplayData.potential || typeof gameplayData.potential !== 'object') {
      push('illegal_collection_state', 'potential', gameplayData.potential, 'object', {});
    } else {
      if (gameplayData.potential.resources !== undefined) {
        if (!gameplayData.potential.resources || typeof gameplayData.potential.resources !== 'object' || Array.isArray(gameplayData.potential.resources)) {
          push('illegal_collection_state', 'potential.resources', gameplayData.potential.resources, 'object', {});
        } else {
          for (const resourceId of POTENTIAL_RESOURCE_IDS) {
            assertIntegerRange(`potential.resources.${resourceId}`, gameplayData.potential.resources[resourceId], 0, 9999);
          }
        }
      }
      if (gameplayData.potential.nodeRanks !== undefined) {
        if (!gameplayData.potential.nodeRanks || typeof gameplayData.potential.nodeRanks !== 'object' || Array.isArray(gameplayData.potential.nodeRanks)) {
          push('illegal_collection_state', 'potential.nodeRanks', gameplayData.potential.nodeRanks, 'object', {});
        } else {
          for (const [nodeId, maxRank] of Object.entries(POTENTIAL_NODE_MAX_RANK)) {
            assertIntegerRange(`potential.nodeRanks.${nodeId}`, gameplayData.potential.nodeRanks[nodeId], 0, maxRank);
          }
        }
      }
    }
  }
  return anomalies;
}

function createSaveFieldAnomalyError(anomalies, phase = 'save_write', extraDetails = {}) {
  const error = createError('save field anomaly detected; repair out-of-range or illegal fields before writing this save', 422, 'TAOYUAN_SAVE_FIELD_ANOMALY');
  error.details = {
    phase,
    anomaly_count: anomalies.length,
    anomalies,
    required_operation: 'repair_save_fields_before_write',
    ...extraDetails,
  };
  return error;
}

function parseSaveFieldPath(fieldPath = '') {
  const segments = [];
  for (const part of String(fieldPath || '').split('.')) {
    if (!part) return [];
    const pattern = /([^\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = pattern.exec(part)) !== null) {
      if (match[1]) {
        segments.push(match[1]);
      } else if (match[2] !== undefined) {
        segments.push(Number(match[2]));
      }
    }
  }
  return segments;
}

function cloneRepairValue(value) {
  if (!value || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function setSaveFieldValue(root, fieldPath, value) {
  const segments = parseSaveFieldPath(fieldPath);
  if (!root || typeof root !== 'object' || segments.length <= 0) return false;
  let target = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!target || typeof target !== 'object') return false;
    target = target[segment];
  }
  if (!target || typeof target !== 'object') return false;
  target[segments[segments.length - 1]] = cloneRepairValue(value);
  return true;
}

function applyGameplaySaveFieldRepairs(saveContainer, phase = 'save_write') {
  const gameplayData = saveContainer?.gameplayData;
  const anomalies = detectGameplaySaveFieldAnomalies(gameplayData);
  if (anomalies.length <= 0) {
    return { repaired: false, anomaly_count: 0, repaired_count: 0, anomalies: [] };
  }
  if (!gameplayData || typeof gameplayData !== 'object') {
    throw createSaveFieldAnomalyError(anomalies, phase, {
      repair_attempted: true,
      repaired_count: 0,
    });
  }

  let repairedCount = 0;
  for (const anomaly of anomalies) {
    if (anomaly.action === 'collection_overflow' && anomaly.field_path === 'farm.plots' && Array.isArray(gameplayData.farm?.plots)) {
      const limit = Number(anomaly.normalized_value);
      if (Number.isInteger(limit) && limit >= 0) {
        gameplayData.farm.plots = gameplayData.farm.plots.slice(0, limit);
        repairedCount += 1;
      }
      continue;
    }
    if (setSaveFieldValue(gameplayData, anomaly.field_path, anomaly.normalized_value)) {
      repairedCount += 1;
    }
  }

  const remaining = detectGameplaySaveFieldAnomalies(gameplayData);
  if (remaining.length > 0) {
    throw createSaveFieldAnomalyError(remaining, phase, {
      repair_attempted: true,
      repaired_count: repairedCount,
      original_anomaly_count: anomalies.length,
    });
  }

  return {
    repaired: true,
    anomaly_count: anomalies.length,
    repaired_count: repairedCount,
    anomalies,
  };
}

function assertGameplaySaveFieldIntegrity(saveContainer, phase = 'save_write') {
  const anomalies = detectGameplaySaveFieldAnomalies(saveContainer?.gameplayData);
  if (anomalies.length <= 0) return;
  throw createSaveFieldAnomalyError(anomalies, phase);
}

function createInvalidSaveRawError(reason) {
  const error = createError('云存档数据无效，已保留远端旧档', 422, 'TAOYUAN_SAVE_RAW_INVALID');
  error.details = {
    reason,
    required_operation: 'resubmit_valid_save_raw',
  };
  return error;
}

function serializeGameplaySaveContainer(container) {
  const savedAt = new Date().toISOString();
  if (container?.wrapped) {
    container.root.meta = buildSaveMeta(container.root.meta || {}, savedAt);
    container.root.meta.savedAt = savedAt;
    container.root.savedAt = savedAt;
    container.root.data = container.gameplayData;
    return container.root;
  }
  return container?.gameplayData || container?.root || null;
}

function applySaveIdentityToContainer(container, identity) {
  const normalized = normalizeSaveIdentityRecord(identity);
  if (!container || !normalized) return false;

  if (container.wrapped) {
    const nextMeta = buildSaveMeta(container.root?.meta || {}, container.root?.savedAt);
    const current = normalizeEmbeddedSaveIdentity(nextMeta.onlineIdentity);
    const changed = !current || current.save_id !== normalized.save_id || current.account_username !== normalized.account_username || current.save_slot !== normalized.save_slot || current.nickname_snapshot !== normalized.nickname_snapshot;
    container.root.meta = {
      ...nextMeta,
      onlineIdentity: normalized,
    };
    return changed;
  }

  if (!container.gameplayData || typeof container.gameplayData !== 'object') return false;
  const current = normalizeEmbeddedSaveIdentity(container.gameplayData.onlineIdentity);
  const changed = !current || current.save_id !== normalized.save_id || current.account_username !== normalized.account_username || current.save_slot !== normalized.save_slot || current.nickname_snapshot !== normalized.nickname_snapshot;
  container.gameplayData.onlineIdentity = normalized;
  return changed;
}

function ensureSaveIdentityForSlot(username, slot, entry) {
  const normalizedSlot = normalizeSaveSlot(slot);
  if (normalizedSlot === null || !entry?.raw) {
    return { entry, identity: null, changed: false };
  }

  const decrypted = decryptTaoyuanRaw(entry.raw);
  const saveContainer = normalizeGameplaySaveContainer(decrypted);
  if (!saveContainer?.gameplayData?.player) {
    return { entry, identity: null, changed: false };
  }

  const identity = ensureSaveIdentityRecord(username, normalizedSlot, getSaveNicknameSnapshot(saveContainer, username));
  const changed = applySaveIdentityToContainer(saveContainer, identity);
  if (!changed) return { entry, identity, changed: false };

  return {
    entry: {
      raw: encryptTaoyuanData(serializeGameplaySaveContainer(saveContainer)),
      revision: nextSlotRevision(entry.revision ?? 0),
    },
    identity,
    changed: true,
  };
}

function ensureSaveIdentitiesForSlots(username, saves) {
  const next = {
    slots: {
      0: normalizeSlotEntry(saves?.slots?.[0]),
      1: normalizeSlotEntry(saves?.slots?.[1]),
      2: normalizeSlotEntry(saves?.slots?.[2]),
    },
  };
  let changed = false;
  for (const slot of [0, 1, 2]) {
    const result = ensureSaveIdentityForSlot(username, slot, next.slots[slot]);
    if (result.changed) {
      next.slots[slot] = result.entry;
      changed = true;
    }
  }
  if (changed) saveUserSaveSlots(username, next);
  return { saves: next, changed };
}

function prepareSlotEntryForSave(username, slot, raw, revision = 0, options = {}) {
  const normalizedSlot = normalizeSaveSlot(slot);
  if (normalizedSlot === null) throw createError('无效的存档槽位');

  const decrypted = decryptTaoyuanRaw(raw);
  if (!decrypted) {
    throw createInvalidSaveRawError('decrypt_or_parse_failed');
  }
  const saveContainer = normalizeGameplaySaveContainer(decrypted);
  if (!saveContainer?.gameplayData?.player) {
    throw createInvalidSaveRawError('missing_gameplay_player');
  }
  const fieldRepair = options.repairFieldAnomalies === true
    ? applyGameplaySaveFieldRepairs(saveContainer, 'prepare_slot_entry_for_save')
    : null;
  assertGameplaySaveFieldIntegrity(saveContainer, 'prepare_slot_entry_for_save');

  const identity = ensureSaveIdentityRecord(username, normalizedSlot, getSaveNicknameSnapshot(saveContainer, username));
  const changed = applySaveIdentityToContainer(saveContainer, identity);
  return {
    raw: changed || fieldRepair?.repaired ? encryptTaoyuanData(serializeGameplaySaveContainer(saveContainer)) : raw,
    revision,
    identity,
    changed: changed || fieldRepair?.repaired === true,
    fieldRepair,
  };
}

function getActiveSaveContext(username, preferredSlot = null, missingMessage = '当前账号没有可用的桃源乡存档') {
  const saves = loadUserSaveSlots(username);
  let slot = normalizeSaveSlot(preferredSlot);

  if (slot !== null) {
    const preferredRaw = saves.slots[slot]?.raw;
    if (!preferredRaw) {
      throw createError(`${missingMessage}，指定的服务端存档槽位 ${slot + 1} 不存在或为空`);
    }
  } else {
    slot = getActiveSaveSlot(username);
  }

  if (slot === null) {
    const fallbackSlot = [0, 1, 2].find(index => typeof saves.slots[index]?.raw === 'string' && saves.slots[index]?.raw);
    if (fallbackSlot === undefined) {
      throw createError(missingMessage);
    }
    slot = fallbackSlot;
  }

  const raw = saves.slots[slot]?.raw;
  if (!raw) throw createError(missingMessage);
  const decrypted = decryptTaoyuanRaw(raw);
  const saveContainer = normalizeGameplaySaveContainer(decrypted);
  const data = saveContainer?.gameplayData;
  if (!data?.player) {
    throw createError('桃源乡存档解析失败，无法继续当前在线操作');
  }
  const identity = ensureSaveIdentityRecord(username, slot, getSaveNicknameSnapshot(saveContainer, username));
  if (applySaveIdentityToContainer(saveContainer, identity)) {
    const currentRevision = saves.slots[slot]?.revision ?? 0;
    saves.slots[slot] = {
      raw: encryptTaoyuanData(serializeGameplaySaveContainer(saveContainer)),
      revision: nextSlotRevision(currentRevision),
    };
    saveUserSaveSlots(username, saves);
  }
  return { slot, saves, data, saveContainer, identity };
}

function persistGameplayData(context) {
  const currentRevision = context.saves.slots[context.slot]?.revision ?? 0;
  const identity = ensureSaveIdentityRecord(context.username, context.slot, getSaveNicknameSnapshot(context.saveContainer, context.username));
  applySaveIdentityToContainer(context.saveContainer, identity);
  context.saves.slots[context.slot] = {
    raw: encryptTaoyuanData(serializeGameplaySaveContainer(context.saveContainer)),
    revision: nextSlotRevision(currentRevision),
  };
  saveUserSaveSlots(context.username, context.saves);
  return context.saves.slots[context.slot].revision;
}

module.exports = {
  CURRENT_SAVE_VERSION,
  TAOYUAN_SAVES_DIR,
  TAOYUAN_ACTIVE_SLOT_FILE,
  TAOYUAN_SAVE_IDENTITIES_FILE,
  createError,
  ensureTaoyuanSavesDir,
  getTaoyuanSavePath,
  normalizeSlotEntry,
  createEmptySlots,
  writeJsonFileAtomic,
  loadUserSaveSlots,
  saveUserSaveSlots,
  deleteUserSaveData,
  loadActiveSlots,
  saveActiveSlots,
  getActiveSaveSlot,
  setActiveSaveSlot,
  clearActiveSaveSlotIfMatches,
  nextSlotRevision,
  decryptTaoyuanRaw,
  encryptTaoyuanData,
  buildSaveMeta,
  normalizeGameplaySaveContainer,
  detectGameplaySaveFieldAnomalies,
  applyGameplaySaveFieldRepairs,
  serializeGameplaySaveContainer,
  ensureSaveIdentityForSlot,
  ensureSaveIdentitiesForSlots,
  prepareSlotEntryForSave,
  getSaveSlotIdentity,
  findSaveIdentityById,
  listSaveIdentities,
  removeSaveSlotIdentity,
  getActiveSaveContext,
  persistGameplayData,
};
