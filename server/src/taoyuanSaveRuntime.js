const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const TAOYUAN_SAVES_DIR = path.join(DATA_DIR, 'taoyuan_saves');
const TAOYUAN_ACTIVE_SLOT_FILE = path.join(DATA_DIR, 'taoyuan_active_slots.json');
const SAVE_ENCRYPTION_KEY = 'taoyuanxiang_2024_secret';
const CURRENT_SAVE_VERSION = 4;

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
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
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      slots: {
        0: normalizeSlotEntry(raw?.slots?.[0]),
        1: normalizeSlotEntry(raw?.slots?.[1]),
        2: normalizeSlotEntry(raw?.slots?.[2]),
      },
    };
  } catch {
    return { slots: createEmptySlots() };
  }
}

function saveUserSaveSlots(username, data) {
  ensureTaoyuanSavesDir();
  writeJsonFileAtomic(getTaoyuanSavePath(username), data);
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
  return Number.isInteger(Number(slot)) ? Number(slot) : null;
}

function setActiveSaveSlot(username, slot) {
  const normalizedSlot = Number.isInteger(Number(slot)) ? Number(slot) : null;
  const data = loadActiveSlots();
  if (!username) return;
  if (normalizedSlot === null || normalizedSlot < 0 || normalizedSlot > 2) {
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
  return Math.max(Date.now(), Math.floor(Number(currentRevision) || 0) + 1);
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
  return {
    saveVersion: Number.isFinite(saveVersion) ? saveVersion : CURRENT_SAVE_VERSION,
    savedAt,
  };
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

function getActiveSaveContext(username, preferredSlot = null, missingMessage = '当前账号没有可用的桃源乡存档') {
  const saves = loadUserSaveSlots(username);
  let slot = Number.isInteger(Number(preferredSlot)) ? Number(preferredSlot) : null;

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
  return { slot, saves, data, saveContainer };
}

function persistGameplayData(context) {
  const currentRevision = context.saves.slots[context.slot]?.revision ?? 0;
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
  serializeGameplaySaveContainer,
  getActiveSaveContext,
  persistGameplayData,
};
