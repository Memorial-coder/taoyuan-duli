const fs = require('fs');
const path = require('path');
const {
  createError,
  writeJsonFileAtomic,
} = require('./taoyuanSaveRuntime');
const { moderateText } = require('./taoyuanTextModeration');
const { recordContentModerationRiskSignal } = require('./taoyuanContentModerationAudit');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const STORE_FILE = path.join(DATA_DIR, 'taoyuan_image_moderation.json');
const MAX_REPORT_REASON_LENGTH = 200;
const MULTI_REPORT_AUTO_HIDE_THRESHOLD = 3;

const IMAGE_UPLOAD_RULES = Object.freeze({
  hall_post: {
    id: 'hall_post',
    label: '大厅插图',
    max_bytes: 4 * 1024 * 1024,
  },
  mail_photo: {
    id: 'mail_photo',
    label: '书信附图',
    max_bytes: 3 * 1024 * 1024,
  },
  profile_avatar: {
    id: 'profile_avatar',
    label: '名片头像',
    max_bytes: 2 * 1024 * 1024,
  },
  manor_cover: {
    id: 'manor_cover',
    label: '庄园主图',
    max_bytes: 4 * 1024 * 1024,
  },
  admin_content: {
    id: 'admin_content',
    label: '后台内容配图',
    max_bytes: 5 * 1024 * 1024,
  },
});

let _imageModerationLockTail = Promise.resolve();

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function normalizeImageHash(value) {
  return sanitizeText(value, 128).toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 128);
}

function normalizeUsage(value) {
  const normalized = sanitizeText(value, 40).toLowerCase();
  return IMAGE_UPLOAD_RULES[normalized]?.id || 'hall_post';
}

function getUploadRule(usage) {
  return IMAGE_UPLOAD_RULES[normalizeUsage(usage)] || IMAGE_UPLOAD_RULES.hall_post;
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
}

function normalizeAsset(entry) {
  return {
    id: sanitizeText(entry?.id, 80) || makeId('image_asset'),
    url: sanitizeText(entry?.url, 500),
    stored_name: sanitizeText(entry?.stored_name, 160),
    filename: sanitizeText(entry?.filename, 160),
    alt: sanitizeText(entry?.alt, 120) || '图片',
    mime: sanitizeText(entry?.mime, 40).toLowerCase(),
    size_bytes: Math.max(0, Math.floor(Number(entry?.size_bytes) || 0)),
    sha256: normalizeImageHash(entry?.sha256),
    usage: normalizeUsage(entry?.usage),
    uploader_username: sanitizeText(entry?.uploader_username, 60),
    uploader_display_name: sanitizeText(entry?.uploader_display_name, 60) || sanitizeText(entry?.uploader_username, 60) || '匿名',
    status: String(entry?.status || '').trim().toLowerCase() === 'hidden' ? 'hidden' : 'active',
    hidden_reason: sanitizeText(entry?.hidden_reason, 120),
    report_count: Math.max(0, Math.floor(Number(entry?.report_count) || 0)),
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function normalizeImageReport(entry) {
  const status = String(entry?.status || '').trim().toLowerCase();
  return {
    id: sanitizeText(entry?.id, 80) || makeId('image_report'),
    image_url: sanitizeText(entry?.image_url, 500),
    stored_name: sanitizeText(entry?.stored_name, 160),
    post_id: sanitizeText(entry?.post_id, 80),
    block_id: sanitizeText(entry?.block_id, 80),
    reason: sanitizeText(entry?.reason, MAX_REPORT_REASON_LENGTH),
    reporter: sanitizeText(entry?.reporter, 60),
    reporter_display_name: sanitizeText(entry?.reporter_display_name, 60) || sanitizeText(entry?.reporter, 60) || '匿名',
    target_username: sanitizeText(entry?.target_username, 60),
    target_display_name: sanitizeText(entry?.target_display_name, 60) || sanitizeText(entry?.target_username, 60) || '匿名',
    usage: normalizeUsage(entry?.usage),
    status: ['pending', 'dismissed', 'resolved'].includes(status) ? status : 'pending',
    auto_action: sanitizeText(entry?.auto_action, 80),
    auto_action_at: Number(entry?.auto_action_at) || null,
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    resolved_at: Number(entry?.resolved_at) || null,
  };
}

function normalizeBlacklistEntry(entry) {
  return {
    username: sanitizeText(entry?.username, 60),
    display_name: sanitizeText(entry?.display_name, 60) || sanitizeText(entry?.username, 60) || '匿名',
    reason: sanitizeText(entry?.reason, 120),
    created_by: sanitizeText(entry?.created_by, 60),
    created_at: Number(entry?.created_at) || Math.floor(Date.now() / 1000),
    updated_at: Number(entry?.updated_at) || Number(entry?.created_at) || Math.floor(Date.now() / 1000),
  };
}

function loadStore() {
  ensureStoreDir();
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return { assets: [], image_reports: [], blacklist: [] };
    }
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    return raw && typeof raw === 'object'
      ? {
          assets: Array.isArray(raw.assets) ? raw.assets.map(normalizeAsset).filter(entry => entry.url) : [],
          image_reports: Array.isArray(raw.image_reports) ? raw.image_reports.map(normalizeImageReport).filter(entry => entry.image_url) : [],
          blacklist: Array.isArray(raw.blacklist) ? raw.blacklist.map(normalizeBlacklistEntry).filter(entry => entry.username) : [],
        }
      : { assets: [], image_reports: [], blacklist: [] };
  } catch {
    return { assets: [], image_reports: [], blacklist: [] };
  }
}

function saveStore(store) {
  ensureStoreDir();
  writeJsonFileAtomic(STORE_FILE, {
    assets: Array.isArray(store?.assets) ? store.assets.map(normalizeAsset) : [],
    image_reports: Array.isArray(store?.image_reports) ? store.image_reports.map(normalizeImageReport) : [],
    blacklist: Array.isArray(store?.blacklist) ? store.blacklist.map(normalizeBlacklistEntry) : [],
  });
}

async function withImageModerationLock(fn) {
  let resolve;
  const prev = _imageModerationLockTail;
  _imageModerationLockTail = new Promise(r => { resolve = r; });
  await prev;
  try {
    return await fn();
  } finally {
    resolve();
  }
}

function getImageBlacklistEntry(username) {
  const normalizedUsername = sanitizeText(username, 60);
  if (!normalizedUsername) return null;
  const store = loadStore();
  return store.blacklist
    .map(normalizeBlacklistEntry)
    .find(entry => entry.username === normalizedUsername) || null;
}

function assertImageUploadAllowed(username) {
  const blacklistEntry = getImageBlacklistEntry(username);
  if (!blacklistEntry) return;
  throw createError(blacklistEntry.reason || '当前账号已被限制上传图片，请联系管理员处理', 403);
}

function getPendingImageReportsForUrl(store, imageUrl) {
  return (Array.isArray(store.image_reports) ? store.image_reports : [])
    .map(normalizeImageReport)
    .filter(report => report.image_url === imageUrl && report.status === 'pending' && report.reporter);
}

function countDistinctReporters(reports) {
  return new Set((Array.isArray(reports) ? reports : []).map(report => report.reporter).filter(Boolean)).size;
}

function buildMultiReportRiskScore(reporterCount) {
  return Math.min(100, 45 + Math.max(0, Math.floor(Number(reporterCount) || 0)) * 10);
}

function applyImageMultiReportAutoHide(store, imageUrl) {
  const pendingReports = getPendingImageReportsForUrl(store, imageUrl);
  const reporterCount = countDistinctReporters(pendingReports);
  if (reporterCount < MULTI_REPORT_AUTO_HIDE_THRESHOLD) return null;
  const assetIndex = store.assets.map(normalizeAsset).findIndex(entry => entry.url === imageUrl);
  if (assetIndex < 0) return null;
  const asset = normalizeAsset(store.assets[assetIndex]);
  if (asset.status === 'hidden') return null;
  const now = Math.floor(Date.now() / 1000);
  const nextAsset = normalizeAsset({
    ...asset,
    status: 'hidden',
    hidden_reason: '多人举报自动临时隐藏，等待管理员复核',
    report_count: Math.max(asset.report_count, pendingReports.length),
    updated_at: now,
  });
  store.assets[assetIndex] = nextAsset;
  recordContentModerationRiskSignal({
    signal_type: 'multi_report_auto_hide',
    username: nextAsset.uploader_username,
    target_type: 'image_asset',
    target_id: nextAsset.id || nextAsset.stored_name || nextAsset.sha256.slice(0, 16),
    content_type: 'image_asset',
    content_id: nextAsset.id || nextAsset.stored_name || '',
    scene: 'image_report',
    reason_code: 'multi_report_threshold',
    outcome: 'auto_temporarily_hidden',
    report_count: pendingReports.length,
    reporter_count: reporterCount,
    report_ids: pendingReports.map(report => report.id),
    image_hash_prefix: nextAsset.sha256 ? nextAsset.sha256.slice(0, 16) : '',
    risk_score: buildMultiReportRiskScore(reporterCount),
    created_at: now,
    updated_at: now,
  });
  return { action: 'auto_hide_image_asset', reporter_count: reporterCount, asset: nextAsset };
}

function findDisposedImageAssetByHash(store, sha256, currentUrl = '') {
  const normalizedHash = normalizeImageHash(sha256);
  if (!normalizedHash) return null;
  return (Array.isArray(store.assets) ? store.assets : [])
    .map(normalizeAsset)
    .find(asset => (
      asset.sha256 === normalizedHash
      && asset.status === 'hidden'
      && (!currentUrl || asset.url !== currentUrl)
    )) || null;
}

function rejectDisposedImageHashReuse({ store, sha256, uploaderUsername, url, storedName }) {
  const disposedAsset = findDisposedImageAssetByHash(store, sha256, url);
  if (!disposedAsset) return;
  const now = Math.floor(Date.now() / 1000);
  recordContentModerationRiskSignal({
    signal_type: 'duplicate_image_hash_reuse',
    username: uploaderUsername,
    target_type: 'image_hash',
    target_id: disposedAsset.sha256.slice(0, 16),
    content_type: 'image_asset',
    content_id: disposedAsset.id || disposedAsset.stored_name || '',
    scene: 'image_hash_reuse',
    reason_code: 'disposed_image_hash_reuse',
    outcome: 'upload_rejected',
    report_count: disposedAsset.report_count,
    image_hash_prefix: disposedAsset.sha256.slice(0, 16),
    risk_score: 85,
    created_at: now,
    updated_at: now,
  });
  throw createError(
    '该图片与已处置图片记录匹配，已拒绝上传并进入复核队列',
    409,
    'IMAGE_HASH_PREVIOUSLY_DISPOSED',
  );
}

async function registerUploadedImage(payload = {}) {
  const uploaderUsername = sanitizeText(payload.uploader_username, 60);
  if (uploaderUsername) {
    assertImageUploadAllowed(uploaderUsername);
  }
  const usage = normalizeUsage(payload.usage);
  const rule = getUploadRule(usage);
  const sizeBytes = Math.max(0, Math.floor(Number(payload.size_bytes) || 0));
  if (sizeBytes <= 0) throw createError('图片内容为空');
  if (sizeBytes > rule.max_bytes) {
    throw createError(`${rule.label}不能超过 ${Math.floor(rule.max_bytes / 1024 / 1024)}MB`);
  }
  const url = sanitizeText(payload.url, 500);
  if (!url) throw createError('图片地址无效');
  const storedName = sanitizeText(payload.stored_name, 160);
  const sha256 = normalizeImageHash(payload.sha256);
  const now = Math.floor(Date.now() / 1000);
  return withImageModerationLock(async () => {
    const store = loadStore();
    rejectDisposedImageHashReuse({
      store,
      sha256,
      uploaderUsername,
      url,
      storedName,
    });
    const existingIndex = store.assets
      .map(normalizeAsset)
      .findIndex(entry => entry.url === url);
    const nextAsset = normalizeAsset({
      ...(existingIndex >= 0 ? store.assets[existingIndex] : {}),
      url,
      stored_name: storedName,
      filename: payload.filename,
      alt: payload.alt,
      mime: payload.mime,
      size_bytes: sizeBytes,
      sha256,
      usage,
      uploader_username: uploaderUsername,
      uploader_display_name: payload.uploader_display_name,
      updated_at: now,
      created_at: existingIndex >= 0 ? store.assets[existingIndex]?.created_at : now,
    });
    if (existingIndex >= 0) {
      store.assets[existingIndex] = nextAsset;
    } else {
      store.assets.unshift(nextAsset);
    }
    saveStore(store);
    return nextAsset;
  });
}

function getUploadedImageAssetByUrl(imageUrl) {
  const targetUrl = sanitizeText(imageUrl, 500);
  if (!targetUrl) return null;
  const store = loadStore();
  return store.assets
    .map(normalizeAsset)
    .find(entry => entry.url === targetUrl) || null;
}

function getUploadedImageAssetByStoredName(storedName) {
  const normalizedStoredName = sanitizeText(storedName, 160);
  if (!normalizedStoredName) return null;
  const store = loadStore();
  return store.assets
    .map(normalizeAsset)
    .find(entry => entry.stored_name === normalizedStoredName) || null;
}

function isUploadedImageVisibleByStoredName(storedName) {
  const asset = getUploadedImageAssetByStoredName(storedName);
  if (!asset) return true;
  return asset.status !== 'hidden';
}

function getUploadedImagePublicState(imageUrl) {
  const asset = getUploadedImageAssetByUrl(imageUrl);
  if (!asset || asset.status !== 'hidden') {
    return {
      visible: true,
      hidden_reason: '',
      usage: asset?.usage || '',
      report_count: asset?.report_count || 0,
    };
  }
  return {
    visible: false,
    hidden_reason: asset.hidden_reason || '这张图片已被管理员隐藏',
    usage: asset.usage,
    report_count: asset.report_count,
  };
}

function ensureUsableUploadedImageUrl(imageUrl, allowedUsages = []) {
  const asset = getUploadedImageAssetByUrl(imageUrl);
  if (!asset) throw createError('请先通过图片上传入口添加图片');
  if (asset.status === 'hidden') throw createError(asset.hidden_reason || '这张图片当前不可用，请重新上传');
  const normalizedAllowedUsages = Array.isArray(allowedUsages)
    ? allowedUsages.map(normalizeUsage)
    : [];
  if (normalizedAllowedUsages.length > 0 && !normalizedAllowedUsages.includes(asset.usage)) {
    throw createError('这张图片不能用于当前场景，请重新上传');
  }
  return asset;
}

async function createImageReport(payload = {}) {
  const imageUrl = sanitizeText(payload.image_url, 500);
  const cleanReason = moderateText(payload.reason, {
    label: '图片举报原因',
    minLength: 2,
    maxLength: MAX_REPORT_REASON_LENGTH,
    maxLineBreaks: 8,
    field: 'reason',
    scene: payload.auditContext?.scene || 'image_report',
    auditContext: {
      ...(payload.auditContext && typeof payload.auditContext === 'object' ? payload.auditContext : {}),
      field: 'reason',
      username: payload.reporter,
      content_type: 'image_report',
      content_id: imageUrl,
    },
  });
  if (!imageUrl) throw createError('缺少图片地址');
  const reporter = sanitizeText(payload.reporter, 60);
  const asset = getUploadedImageAssetByUrl(imageUrl);
  if (!asset) throw createError('图片不存在', 404);
  return withImageModerationLock(async () => {
    const store = loadStore();
    const existing = store.image_reports
      .map(normalizeImageReport)
      .find(entry => entry.image_url === imageUrl && entry.reporter === reporter && entry.status === 'pending');
    if (existing) {
      return existing;
    }
    const report = normalizeImageReport({
      id: makeId('image_report'),
      image_url: imageUrl,
      stored_name: asset.stored_name,
      post_id: payload.post_id,
      block_id: payload.block_id,
      reason: cleanReason,
      reporter,
      reporter_display_name: payload.reporter_display_name,
      target_username: asset.uploader_username,
      target_display_name: asset.uploader_display_name,
      usage: asset.usage,
      status: 'pending',
      created_at: Math.floor(Date.now() / 1000),
      resolved_at: null,
    });
    store.image_reports.unshift(report);
    store.assets = store.assets.map(entry => {
      const normalized = normalizeAsset(entry);
      if (normalized.url !== imageUrl) return normalized;
      return normalizeAsset({
        ...normalized,
        report_count: normalized.report_count + 1,
        updated_at: Math.floor(Date.now() / 1000),
      });
    });
    const autoAction = applyImageMultiReportAutoHide(store, imageUrl);
    if (autoAction) {
      report.auto_action = autoAction.action;
      report.auto_action_at = Math.floor(Date.now() / 1000);
      store.image_reports = store.image_reports.map(entry => {
        const normalized = normalizeImageReport(entry);
        return normalized.id === report.id ? report : normalized;
      });
    }
    saveStore(store);
    return report;
  });
}

function listImageReports() {
  const store = loadStore();
  return store.image_reports
    .map(normalizeImageReport)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0));
}

function listImageAssets() {
  const store = loadStore();
  return store.assets
    .map(normalizeAsset)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0));
}

async function setImageReportStatus({ reportId, status }) {
  return withImageModerationLock(async () => {
    const store = loadStore();
    const report = store.image_reports
      .map(normalizeImageReport)
      .find(entry => entry.id === sanitizeText(reportId, 80));
    if (!report) throw createError('图片举报记录不存在', 404);
    report.status = status === 'resolved' ? 'resolved' : 'dismissed';
    report.resolved_at = Math.floor(Date.now() / 1000);
    store.image_reports = store.image_reports.map(entry => {
      const normalized = normalizeImageReport(entry);
      return normalized.id === report.id ? report : normalized;
    });
    saveStore(store);
    return report;
  });
}

async function hideImageFromReport(reportId, reason = '') {
  return withImageModerationLock(async () => {
    const store = loadStore();
    const normalizedReportId = sanitizeText(reportId, 80);
    const report = store.image_reports
      .map(normalizeImageReport)
      .find(entry => entry.id === normalizedReportId);
    if (!report) throw createError('图片举报记录不存在', 404);
    const asset = store.assets
      .map(normalizeAsset)
      .find(entry => entry.url === report.image_url);
    if (!asset) throw createError('目标图片不存在', 404);
    const now = Math.floor(Date.now() / 1000);
    const hiddenReason = sanitizeText(reason, 120) || report.reason || '管理员隐藏';
    asset.status = 'hidden';
    asset.hidden_reason = hiddenReason;
    asset.updated_at = now;
    report.status = 'resolved';
    report.resolved_at = now;
    store.assets = store.assets.map(entry => {
      const normalized = normalizeAsset(entry);
      return normalized.url === asset.url ? asset : normalized;
    });
    store.image_reports = store.image_reports.map(entry => {
      const normalized = normalizeImageReport(entry);
      return normalized.id === report.id ? report : normalized;
    });
    saveStore(store);
    return {
      report,
      asset,
    };
  });
}

async function setImageAssetVisibility({ imageUrl, hidden = true, reason = '' }) {
  const normalizedUrl = sanitizeText(imageUrl, 500);
  if (!normalizedUrl) throw createError('缺少图片地址');
  return withImageModerationLock(async () => {
    const store = loadStore();
    const asset = store.assets
      .map(normalizeAsset)
      .find(entry => entry.url === normalizedUrl);
    if (!asset) throw createError('目标图片不存在', 404);
    const now = Math.floor(Date.now() / 1000);
    asset.status = hidden === true ? 'hidden' : 'active';
    asset.hidden_reason = hidden === true ? (sanitizeText(reason, 120) || '管理员隐藏') : '';
    asset.updated_at = now;
    store.assets = store.assets.map(entry => {
      const normalized = normalizeAsset(entry);
      return normalized.url === asset.url ? asset : normalized;
    });
    saveStore(store);
    return asset;
  });
}

function listImageBlacklist() {
  const store = loadStore();
  return store.blacklist
    .map(normalizeBlacklistEntry)
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));
}

async function setImageBlacklist(username, blocked, options = {}) {
  const normalizedUsername = sanitizeText(username, 60);
  if (!normalizedUsername) throw createError('缺少目标用户名');
  return withImageModerationLock(async () => {
    const store = loadStore();
    const currentEntries = store.blacklist.map(normalizeBlacklistEntry);
    const existing = currentEntries.find(entry => entry.username === normalizedUsername) || null;
    if (blocked !== false) {
      const nextEntry = normalizeBlacklistEntry({
        ...(existing || {}),
        username: normalizedUsername,
        display_name: options.display_name || existing?.display_name || normalizedUsername,
        reason: options.reason || existing?.reason || '管理员已限制该账号上传图片',
        created_by: options.created_by || existing?.created_by || '',
        created_at: existing?.created_at || Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      });
      const nextBlacklist = currentEntries.filter(entry => entry.username !== normalizedUsername);
      nextBlacklist.unshift(nextEntry);
      store.blacklist = nextBlacklist;
      saveStore(store);
      return nextEntry;
    }
    store.blacklist = currentEntries.filter(entry => entry.username !== normalizedUsername);
    saveStore(store);
    return null;
  });
}

module.exports = {
  getUploadRule,
  assertImageUploadAllowed,
  registerUploadedImage,
  getUploadedImageAssetByUrl,
  getUploadedImageAssetByStoredName,
  isUploadedImageVisibleByStoredName,
  getUploadedImagePublicState,
  ensureUsableUploadedImageUrl,
  createImageReport,
  listImageAssets,
  listImageReports,
  setImageReportStatus,
  hideImageFromReport,
  setImageAssetVisibility,
  listImageBlacklist,
  setImageBlacklist,
};
