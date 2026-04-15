const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const db = require('../db');
const cfg = require('../config');
const taoyuanHall = require('../taoyuanHall');
const taoyuanMailbox = require('../taoyuanMailbox');
const taoyuanAiAssistant = require('../taoyuanAiAssistant');

const router = express.Router();

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../../../data');

const TAOYUAN_SAVES_DIR = path.join(DATA_DIR, 'taoyuan_saves');
const TAOYUAN_EXCHANGE_LIMITS_FILE = path.join(DATA_DIR, 'taoyuan_exchange_limits.json');

function ensureTaoyuanSavesDir() {
  fs.mkdirSync(TAOYUAN_SAVES_DIR, { recursive: true });
}

function getTaoyuanSavePath(username) {
  return path.join(TAOYUAN_SAVES_DIR, `${String(username)}.json`);
}

function loadTaoyuanUserSaves(username) {
  const defaults = { slots: { 0: null, 1: null, 2: null } };
  try {
    const file = getTaoyuanSavePath(username);
    if (!fs.existsSync(file)) return { ...defaults };
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      slots: {
        0: typeof raw?.slots?.[0] === 'string' ? raw.slots[0] : null,
        1: typeof raw?.slots?.[1] === 'string' ? raw.slots[1] : null,
        2: typeof raw?.slots?.[2] === 'string' ? raw.slots[2] : null,
      },
    };
  } catch {
    return { ...defaults };
  }
}

function saveTaoyuanUserSaves(username, data) {
  ensureTaoyuanSavesDir();
  fs.writeFileSync(getTaoyuanSavePath(username), JSON.stringify(data, null, 2), 'utf8');
}

function todayBJ() {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function normalizeUsername(username) {
  return String(username || '').normalize('NFKC').trim();
}

function normalizeUsernameKey(username) {
  return normalizeUsername(username).toLocaleLowerCase('zh-CN');
}

function getAdminContext(req) {
  const token = String(req.headers['x-admin-token'] || '').trim();
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  const superAdminToken = String(process.env.SUPER_ADMIN_TOKEN || '').trim();

  if (!token) return null;

  if (superAdminToken && token === superAdminToken) {
    return {
      role: 'super_admin',
      role_label: '超级管理员',
      operator_name: '超级管理员',
    };
  }

  if (token === adminToken) {
    return {
      role: superAdminToken ? 'admin' : 'super_admin',
      role_label: superAdminToken ? '普通管理员' : '超级管理员',
      operator_name: superAdminToken ? '普通管理员' : '超级管理员',
    };
  }

  return null;
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function destroySession(req) {
  return new Promise(resolve => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy(() => resolve());
  });
}

async function establishUserSession(req, user) {
  await regenerateSession(req);
  req.session.username = user.username;
  req.session.display_name = user.display_name;
  req.session.csrf_token = crypto.randomBytes(24).toString('hex');
}

function buildAdminPermissions(role) {
  const isSuperAdmin = role === 'super_admin';
  return {
    view_users: true,
    edit_quota: true,
    view_save: true,
    export_save: isSuperAdmin,
    migrate_save: isSuperAdmin,
    reset_password: isSuperAdmin,
    update_status: isSuperAdmin,
    delete_user: isSuperAdmin,
    view_audit_logs: isSuperAdmin,
    manage_content: true,
    view_content_logs: true,
    view_gameplay_logs: true,
  };
}

function adminAuth(req, res, next) {
  const admin = getAdminContext(req);
  if (!admin || admin.role !== 'super_admin') {
    return res.status(403).json({ ok: false, msg: '无权限' });
  }
  req.admin = admin;
  next();
}

function userAdminAuth(req, res, next) {
  const admin = getAdminContext(req);
  if (!admin) {
    return res.status(403).json({ ok: false, msg: '无权限' });
  }
  req.admin = admin;
  next();
}

function loginRequired(req, res, next) {
  void (async () => {
    if (!req.session || !req.session.username) {
      res.status(401).json({ ok: false, msg: '请先登录账号' });
      return;
    }

    const accessState = await db.getUserAccessState(req.session.username);
    if (!accessState || accessState === 'deleted') {
      await destroySession(req);
      res.status(401).json({ ok: false, msg: '账号不存在或已失效，请重新登录' });
      return;
    }

    if (accessState === 'banned') {
      await destroySession(req);
      res.status(403).json({ ok: false, msg: '账号已被封禁' });
      return;
    }

    next();
  })().catch(next);
}

function signRequired(req, res, next) {
  const token = req.headers['x-csrf-token'] || '';
  const sessionToken = req.session && req.session.csrf_token;
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ ok: false, msg: '请求验证失败，请刷新页面后重试' });
  }
  next();
}

function decodeRouteUsername(raw) {
  try {
    return decodeURIComponent(String(raw || ''));
  } catch {
    return String(raw || '');
  }
}

function getSaveFileSummary(username) {
  const safeUsername = String(username || '');
  const filePath = getTaoyuanSavePath(safeUsername);
  const exists = fs.existsSync(filePath);
  const stats = exists ? fs.statSync(filePath) : null;
  const saveData = exists ? loadTaoyuanUserSaves(safeUsername) : { slots: { 0: null, 1: null, 2: null } };
  const slots = [0, 1, 2].map(slot => ({
    slot,
    exists: !!saveData.slots?.[slot],
    raw_length: typeof saveData.slots?.[slot] === 'string' ? saveData.slots[slot].length : 0,
  }));
  return {
    exists,
    file_name: `${safeUsername}.json`,
    file_path: filePath,
    file_size: stats ? stats.size : 0,
    updated_at: stats ? Math.floor(stats.mtimeMs / 1000) : null,
    slot_count: slots.filter(item => item.exists).length,
    slots,
  };
}

function parsePositiveInt(value, fallback) {
  const normalized = parseInt(value, 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function parseJsonTextSafe(value, fallback = {}) {
  try {
    return JSON.parse(String(value || '{}'));
  } catch {
    return fallback;
  }
}

async function appendAdminAuditLog(req, action, targetUsername, detail) {
  return db.recordAdminAuditLog({
    operator_role: req.admin?.role || '',
    operator_name: req.admin?.operator_name || '',
    action,
    target_username: targetUsername || '',
    detail,
  });
}

async function appendContentRevisionLog(req, action, payload, options = {}) {
  return db.recordContentRevision({
    content_key: options.contentKey || 'homepage_about',
    title: payload?.aboutDialogTitle || payload?.title || '',
    summary: options.summary || '',
    action,
    published: options.published === true,
    operator_role: req.admin?.role || '',
    operator_name: req.admin?.operator_name || '',
    payload,
  });
}

function normalizeHomepageAboutPayload(raw = {}) {
  return {
    aboutButtonEnabled: raw.aboutButtonEnabled !== false,
    aboutButtonText: String(raw.aboutButtonText || '关于游戏').trim() || '关于游戏',
    aboutDialogTitle: String(raw.aboutDialogTitle || '关于桃源乡').trim() || '关于桃源乡',
    aboutDialogContent: String(raw.aboutDialogContent || '').replace(/\r\n/g, '\n').trim(),
  };
}

function getHomepageAboutContent() {
  const current = cfg.all();
  return normalizeHomepageAboutPayload({
    aboutButtonEnabled: current.taoyuan_about_button_enabled,
    aboutButtonText: current.taoyuan_about_button_text,
    aboutDialogTitle: current.taoyuan_about_dialog_title,
    aboutDialogContent: current.taoyuan_about_dialog_content,
  });
}

function publishHomepageAboutContent(content) {
  const normalized = normalizeHomepageAboutPayload(content);
  cfg.set({
    taoyuan_about_button_enabled: normalized.aboutButtonEnabled,
    taoyuan_about_button_text: normalized.aboutButtonText,
    taoyuan_about_dialog_title: normalized.aboutDialogTitle,
    taoyuan_about_dialog_content: normalized.aboutDialogContent,
  });
  return normalized;
}

router.use('/taoyuan/hall/uploads', express.static(taoyuanHall.HALL_UPLOADS_DIR, {
  etag: false,
  lastModified: false,
  maxAge: '7d',
  fallthrough: false,
}));

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'taoyuan-duli', now: Date.now() });
});

function getTaoyuanDollarPerMoney() {
  const direct = parseFloat(cfg.get('taoyuan_exchange_rate_dollar_per_money'));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const quotaPerMoney = parseInt(cfg.get('taoyuan_exchange_rate_quota_per_money'), 10);
  const exchangeRate = parseInt(cfg.get('exchange_rate'), 10) || db.EXCHANGE_RATE;
  if (Number.isFinite(quotaPerMoney) && quotaPerMoney > 0 && exchangeRate > 0) {
    return quotaPerMoney / exchangeRate;
  }
  return 0.0002;
}

function taoyuanExchangeLimitsLoad() {
  try {
    if (fs.existsSync(TAOYUAN_EXCHANGE_LIMITS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(TAOYUAN_EXCHANGE_LIMITS_FILE, 'utf8'));
      if (raw && typeof raw === 'object') return raw;
    }
  } catch {}
  return {};
}

function taoyuanExchangeLimitsSave(data) {
  fs.mkdirSync(path.dirname(TAOYUAN_EXCHANGE_LIMITS_FILE), { recursive: true });
  fs.writeFileSync(TAOYUAN_EXCHANGE_LIMITS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getTaoyuanDailyLimitMoney(type) {
  const key = type === 'import'
    ? 'taoyuan_daily_import_limit_money'
    : 'taoyuan_daily_export_limit_money';
  return Math.max(0, parseInt(cfg.get(key), 10) || 0);
}

function sanitizeTaoyuanReturnButtonUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '/';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}

function getTaoyuanTodayUsage(username) {
  const all = taoyuanExchangeLimitsLoad();
  const today = todayBJ();
  const dayData = all[today] && typeof all[today] === 'object' ? all[today] : {};
  const userData = dayData[username] && typeof dayData[username] === 'object' ? dayData[username] : {};
  return {
    today,
    import_money: parseInt(userData.import_money, 10) || 0,
    export_money: parseInt(userData.export_money, 10) || 0,
  };
}

function updateTaoyuanTodayUsage(username, deltas = {}) {
  const all = taoyuanExchangeLimitsLoad();
  const today = todayBJ();
  if (!all[today] || typeof all[today] !== 'object') all[today] = {};
  const current = all[today][username] && typeof all[today][username] === 'object'
    ? all[today][username]
    : { import_money: 0, export_money: 0 };
  current.import_money = Math.max(0, (parseInt(current.import_money, 10) || 0) + (parseInt(deltas.importDelta, 10) || 0));
  current.export_money = Math.max(0, (parseInt(current.export_money, 10) || 0) + (parseInt(deltas.exportDelta, 10) || 0));
  all[today][username] = current;
  taoyuanExchangeLimitsSave(all);
  return { today, import_money: current.import_money, export_money: current.export_money };
}

let taoyuanExchangeLock = Promise.resolve();
async function withTaoyuanExchangeLock(fn) {
  let resolve;
  const prev = taoyuanExchangeLock;
  taoyuanExchangeLock = new Promise(r => { resolve = r; });
  await prev;
  try {
    return await fn();
  } finally {
    resolve();
  }
}

function getPublicConfigPayload(req) {
  const c = cfg.all();
  const username = req.session && req.session.username;
  const taoyuanTodayUsage = username
    ? getTaoyuanTodayUsage(username)
    : { import_money: 0, export_money: 0 };
  return {
    ok: true,
    exchange_rate: c.exchange_rate,
    taoyuan_exchange_rate_quota_per_money: c.taoyuan_exchange_rate_quota_per_money,
    taoyuan_exchange_rate_dollar_per_money: getTaoyuanDollarPerMoney(),
    taoyuan_daily_import_limit_money: Math.max(0, parseInt(c.taoyuan_daily_import_limit_money, 10) || 0),
    taoyuan_daily_export_limit_money: Math.max(0, parseInt(c.taoyuan_daily_export_limit_money, 10) || 0),
    taoyuan_today_imported_money: taoyuanTodayUsage.import_money,
    taoyuan_today_exported_money: taoyuanTodayUsage.export_money,
    taoyuan_return_button_enabled: c.taoyuan_return_button_enabled,
    taoyuan_return_button_text: c.taoyuan_return_button_text,
    taoyuan_return_button_url: sanitizeTaoyuanReturnButtonUrl(c.taoyuan_return_button_url),
    taoyuan_about_button_enabled: c.taoyuan_about_button_enabled,
    taoyuan_about_button_text: c.taoyuan_about_button_text,
    taoyuan_about_dialog_title: c.taoyuan_about_dialog_title,
    taoyuan_about_dialog_content: c.taoyuan_about_dialog_content,
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const result = await db.registerUser(req.body?.username, req.body?.password, req.body?.display_name);
    if (!result.ok) return res.status(400).json(result);

    await establishUserSession(req, result.user);
    res.json({ ok: true, msg: '注册成功', user: result.user, csrf_token: req.session.csrf_token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await db.verifyUser(req.body?.username, req.body?.password);
    if (!result.ok) return res.status(400).json(result);

    await establishUserSession(req, result.user);
    res.json({ ok: true, msg: '登录成功', user: result.user, csrf_token: req.session.csrf_token });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res) => {
  await destroySession(req);
  res.json({ ok: true });
});

router.get('/me', loginRequired, async (req, res) => {
  const quota = await db.getQuota(req.session.username);
  const er = cfg.get('exchange_rate') || db.EXCHANGE_RATE;
  if (!req.session.csrf_token) req.session.csrf_token = crypto.randomBytes(24).toString('hex');
  res.json({
    ok: true,
    csrf_token: req.session.csrf_token,
    user: {
      username: req.session.username,
      display_name: req.session.display_name || req.session.username,
      quota,
      dollars: quota != null ? parseFloat((quota / er).toFixed(4)) : 0,
    },
  });
});

router.get('/public-config', (req, res) => {
  res.json(getPublicConfigPayload(req));
});

router.get('/admin/me', userAdminAuth, (req, res) => {
  res.json({
    ok: true,
    isAdmin: true,
    role: req.admin.role,
    role_label: req.admin.role_label,
    permissions: buildAdminPermissions(req.admin.role),
  });
});

router.get('/admin/users', userAdminAuth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.page_size, 20);
    const result = await db.listUsersAdmin({
      keyword: req.query.keyword,
      status: req.query.status,
      page,
      pageSize,
    });

    const users = result.users.map(user => ({
      ...user,
      save_file: getSaveFileSummary(user.username),
    }));

    res.json({ ok: true, ...result, users });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取用户列表失败' });
  }
});

router.get('/admin/users/:username', userAdminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const user = await db.getUserAdmin(username);
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在' });

    res.json({
      ok: true,
      user: {
        ...user,
        save_file: getSaveFileSummary(username),
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取用户详情失败' });
  }
});

router.post('/admin/users/:username/quota', userAdminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const quota = Math.max(0, Math.round(Number(req.body?.quota) || 0));
    const user = await db.setUserQuota(username, quota);
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在' });

    await appendAdminAuditLog(req, 'set_user_quota', username, { quota });
    res.json({ ok: true, user });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '修改额度失败' });
  }
});

router.post('/admin/users/:username/reset-password', adminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const newPassword = String(req.body?.new_password || '');
    const result = await db.resetUserPassword(username, newPassword);
    if (!result.ok) return res.status(400).json(result);

    await appendAdminAuditLog(req, 'reset_user_password', username, { password_length: newPassword.length });
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '重置密码失败' });
  }
});

router.post('/admin/users/:username/status', adminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!['active', 'banned', 'deleted'].includes(status)) {
      return res.status(400).json({ ok: false, msg: '无效的用户状态' });
    }

    const user = await db.setUserStatus(username, status);
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在或状态不可修改' });

    await appendAdminAuditLog(req, 'set_user_status', username, { status });
    res.json({ ok: true, user });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '修改用户状态失败' });
  }
});

router.delete('/admin/users/:username', adminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const user = await db.setUserStatus(username, 'deleted');
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在或已删除' });

    await appendAdminAuditLog(req, 'delete_user', username, { status: 'deleted' });
    res.json({ ok: true, user });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '删除用户失败' });
  }
});

router.get('/admin/users/:username/save', userAdminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const user = await db.getUserAdmin(username);
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在' });

    res.json({ ok: true, save: getSaveFileSummary(username) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取存档信息失败' });
  }
});

router.get('/admin/users/:username/save/export', adminAuth, async (req, res) => {
  try {
    const username = decodeRouteUsername(req.params.username);
    const user = await db.getUserAdmin(username);
    if (!user) return res.status(404).json({ ok: false, msg: '用户不存在' });

    const filePath = getTaoyuanSavePath(username);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, msg: '该用户没有存档文件' });
    }

    await appendAdminAuditLog(req, 'export_user_save', username, { file_name: `${username}.json` });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${username}.json`)}`);
    res.send(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '导出存档失败' });
  }
});

router.post('/admin/users/:username/save/migrate', adminAuth, async (req, res) => {
  try {
    const sourceUsername = decodeRouteUsername(req.params.username);
    const targetUsername = normalizeUsername(req.body?.target_username);
    const overwrite = req.body?.overwrite === true;

    if (!targetUsername) return res.status(400).json({ ok: false, msg: '请填写目标用户名' });
    if (normalizeUsernameKey(sourceUsername) === normalizeUsernameKey(targetUsername)) {
      return res.status(400).json({ ok: false, msg: '源账号与目标账号不能相同' });
    }

    const sourceUser = await db.getUserAdmin(sourceUsername);
    const targetUser = await db.getUserAdmin(targetUsername);
    if (!sourceUser) return res.status(404).json({ ok: false, msg: '源用户不存在' });
    if (!targetUser) return res.status(404).json({ ok: false, msg: '目标用户不存在' });

    const sourcePath = getTaoyuanSavePath(sourceUsername);
    const targetPath = getTaoyuanSavePath(targetUsername);
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ ok: false, msg: '源用户没有存档文件' });
    }
    if (!overwrite && fs.existsSync(targetPath)) {
      return res.status(400).json({ ok: false, msg: '目标用户已存在存档文件，请确认覆盖' });
    }

    ensureTaoyuanSavesDir();
    fs.copyFileSync(sourcePath, targetPath);
    await appendAdminAuditLog(req, 'migrate_user_save', sourceUsername, {
      target_username: targetUsername,
      overwrite,
    });
    res.json({ ok: true, source: sourceUsername, target: targetUsername, save: getSaveFileSummary(targetUsername) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '迁移存档失败' });
  }
});

router.get('/admin/audit-logs', adminAuth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.page_size, 20);
    const result = await db.listAdminAuditLogs({ page, pageSize });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取操作日志失败' });
  }
});

router.get('/admin/content/homepage-about', userAdminAuth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.page_size, 20);
    const revisions = await db.listContentRevisions({
      contentKey: 'homepage_about',
      page,
      pageSize,
    });
    res.json({
      ok: true,
      content: getHomepageAboutContent(),
      revisions,
    });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取首页关于内容失败' });
  }
});

router.post('/admin/content/homepage-about', userAdminAuth, async (req, res) => {
  try {
    const action = String(req.body?.action || 'publish').trim().toLowerCase();
    if (!['draft', 'publish'].includes(action)) {
      return res.status(400).json({ ok: false, msg: '无效的内容操作' });
    }
    const payload = normalizeHomepageAboutPayload(req.body || {});
    const summary = String(req.body?.summary || '').trim().slice(0, 120);
    const published = action === 'publish';

    if (published) {
      publishHomepageAboutContent(payload);
      await appendAdminAuditLog(req, 'publish_homepage_about', '', {
        about_button_enabled: payload.aboutButtonEnabled,
        about_button_text: payload.aboutButtonText,
        about_dialog_title: payload.aboutDialogTitle,
      });
    }

    const revision = await appendContentRevisionLog(req, action, payload, {
      contentKey: 'homepage_about',
      summary,
      published,
    });

    res.json({
      ok: true,
      action,
      content: published ? getHomepageAboutContent() : payload,
      revision,
    });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '保存首页关于内容失败' });
  }
});

router.post('/admin/content/homepage-about/restore/:revisionId', userAdminAuth, async (req, res) => {
  try {
    const revision = await db.getContentRevision(req.params.revisionId);
    if (!revision || revision.content_key !== 'homepage_about') {
      return res.status(404).json({ ok: false, msg: '内容版本不存在' });
    }
    const payload = normalizeHomepageAboutPayload(revision.payload || {});
    const content = publishHomepageAboutContent(payload);
    const nextRevision = await appendContentRevisionLog(req, 'restore', content, {
      contentKey: 'homepage_about',
      summary: `恢复自版本 ${revision.id}`,
      published: true,
    });
    await appendAdminAuditLog(req, 'restore_homepage_about', '', {
      revision_id: revision.id,
      about_dialog_title: content.aboutDialogTitle,
    });
    res.json({ ok: true, content, revision: nextRevision, restored_from: revision.id });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '恢复首页关于内容失败' });
  }
});

router.get('/admin/content/revisions', userAdminAuth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.page_size, 20);
    const contentKey = String(req.query.content_key || '').trim();
    const result = await db.listContentRevisions({ contentKey, page, pageSize });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取内容版本日志失败' });
  }
});

router.post('/admin/content/upload-image', userAdminAuth, async (req, res) => {
  try {
    const uploaded = await taoyuanHall.saveUploadedImage({
      dataUrl: req.body?.data_url,
      filename: req.body?.filename,
      author: req.admin?.operator_name || '',
    });
    await appendAdminAuditLog(req, 'upload_content_image', '', {
      file_url: uploaded.url,
      alt: uploaded.alt,
    });
    res.json({ ok: true, ...uploaded });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '上传内容图片失败' });
  }
});

router.get('/admin/gameplay-logs', userAdminAuth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.page_size, 50);
    const username = normalizeUsername(req.query.username);
    const category = String(req.query.category || '').trim();
    const keyword = String(req.query.keyword || '').trim();
    const result = await db.listGameplayEventLogs({ page, pageSize, username, category, keyword });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取游戏日志失败' });
  }
});

router.post('/taoyuan/logs/gameplay/batch', async (req, res) => {
  try {
    const rawLogs = Array.isArray(req.body?.logs) ? req.body.logs.slice(0, 100) : [];
    if (rawLogs.length === 0) return res.json({ ok: true, count: 0 });
    const usernameFromSession = normalizeUsername(req.session?.username || '');
    const saved = [];
    for (const item of rawLogs) {
      const message = String(item?.message || '').trim();
      if (!message) continue;
      const normalizedUsername = usernameFromSession || (String(item?.username || '') === 'guest' ? 'guest' : '');
      saved.push(await db.recordGameplayEventLog({
        username: normalizedUsername,
        day_label: String(item?.day_label || '').slice(0, 64),
        category: String(item?.category || 'system').slice(0, 32),
        message: message.slice(0, 512),
        route_name: String(item?.route_name || '').slice(0, 128),
        tags: Array.isArray(item?.tags) ? item.tags.slice(0, 16) : [],
        meta: item?.meta && typeof item.meta === 'object' ? item.meta : {},
      }));
    }
    res.json({ ok: true, count: saved.length });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '写入游戏日志失败' });
  }
});

router.post('/taoyuan/quota/import', loginRequired, signRequired, async (req, res) => {
  return withTaoyuanExchangeLock(async () => {
    const username = req.session.username;
    const money = parseInt(req.body?.money, 10);
    const dollarPerMoney = getTaoyuanDollarPerMoney();
    const er = cfg.get('exchange_rate') || db.EXCHANGE_RATE;
    const dailyImportLimit = getTaoyuanDailyLimitMoney('import');
    const dailyExportLimit = getTaoyuanDailyLimitMoney('export');

    if (!Number.isInteger(money) || money <= 0) {
      return res.status(400).json({ ok: false, msg: '请输入有效的铜钱数量' });
    }

    let saveContext;
    try {
      saveContext = taoyuanHall.updateActiveSaveMoney(username, 0);
    } catch (error) {
      return res.status(error.status || 400).json({ ok: false, msg: error.message || '当前没有可用于兑换的服务端存档' });
    }

    const usageBefore = getTaoyuanTodayUsage(username);
    if (dailyImportLimit > 0 && (usageBefore.import_money + money) > dailyImportLimit) {
      return res.status(400).json({ ok: false, msg: '今日转入已达上限', today_imported_money: usageBefore.import_money });
    }

    const quotaCost = Math.round(money * dollarPerMoney * er);
    const consumed = await db.consumeQuota(username, quotaCost);
    if (!consumed) return res.status(400).json({ ok: false, msg: '账户额度不足' });

    let saveUpdate;
    try {
      saveUpdate = taoyuanHall.updateActiveSaveMoney(username, money);
    } catch (error) {
      await db.addQuota(username, quotaCost);
      return res.status(error.status || 500).json({ ok: false, msg: error.message || '服务端存档入账失败，额度已回退' });
    }

    const usageAfter = updateTaoyuanTodayUsage(username, { importDelta: money });
    const newQuota = await db.getQuota(username);
    res.json({
      ok: true,
      money_received: money,
      save_slot: saveUpdate.slot,
      taoyuan_money: saveUpdate.money,
      quota_spent: quotaCost,
      exchange_rate_quota_per_money: Math.round(dollarPerMoney * er),
      exchange_rate_dollar_per_money: dollarPerMoney,
      quota: newQuota,
      dollars: newQuota != null ? parseFloat((newQuota / er).toFixed(4)) : 0,
      taoyuan_daily_import_limit_money: dailyImportLimit,
      taoyuan_daily_export_limit_money: dailyExportLimit,
      today_imported_money: usageAfter.import_money,
      today_exported_money: usageAfter.export_money,
      active_save_slot: saveContext.slot,
    });
  });
});

router.post('/taoyuan/quota/export', loginRequired, signRequired, async (req, res) => {
  return withTaoyuanExchangeLock(async () => {
    const username = req.session.username;
    const money = parseInt(req.body?.money, 10);
    const dollarPerMoney = getTaoyuanDollarPerMoney();
    const er = cfg.get('exchange_rate') || db.EXCHANGE_RATE;
    const dailyImportLimit = getTaoyuanDailyLimitMoney('import');
    const dailyExportLimit = getTaoyuanDailyLimitMoney('export');

    if (!Number.isInteger(money) || money <= 0) {
      return res.status(400).json({ ok: false, msg: '请输入有效的铜钱数量' });
    }

    try {
      taoyuanHall.updateActiveSaveMoney(username, 0);
    } catch (error) {
      return res.status(error.status || 400).json({ ok: false, msg: error.message || '当前没有可用于兑换的服务端存档' });
    }

    const usageBefore = getTaoyuanTodayUsage(username);
    if (dailyExportLimit > 0 && (usageBefore.export_money + money) > dailyExportLimit) {
      return res.status(400).json({ ok: false, msg: '今日提现已达上限', today_exported_money: usageBefore.export_money });
    }

    let saveUpdate;
    try {
      saveUpdate = taoyuanHall.updateActiveSaveMoney(username, -money);
    } catch (error) {
      return res.status(error.status || 400).json({ ok: false, msg: error.message || '桃源货币不足，无法完成提现' });
    }

    const quotaGain = Math.round(money * dollarPerMoney * er);
    const added = await db.addQuota(username, quotaGain);
    if (!added) {
      try {
        taoyuanHall.updateActiveSaveMoney(username, money);
      } catch {}
      return res.status(500).json({ ok: false, msg: '发放账户额度失败' });
    }

    const usageAfter = updateTaoyuanTodayUsage(username, { exportDelta: money });
    const newQuota = await db.getQuota(username);
    res.json({
      ok: true,
      money_spent: money,
      save_slot: saveUpdate.slot,
      taoyuan_money: saveUpdate.money,
      quota_gained: quotaGain,
      exchange_rate_quota_per_money: Math.round(dollarPerMoney * er),
      exchange_rate_dollar_per_money: dollarPerMoney,
      quota: newQuota,
      dollars: newQuota != null ? parseFloat((newQuota / er).toFixed(4)) : 0,
      taoyuan_daily_import_limit_money: dailyImportLimit,
      taoyuan_daily_export_limit_money: dailyExportLimit,
      today_imported_money: usageAfter.import_money,
      today_exported_money: usageAfter.export_money,
    });
  });
});

router.get('/taoyuan/save/slots', loginRequired, (req, res) => {
  const data = loadTaoyuanUserSaves(req.session.username);
  res.json({ ok: true, slots: [0, 1, 2].map(slot => ({ slot, raw: data.slots[slot] || null })) });
});

router.get('/taoyuan/save/:slot', loginRequired, (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
    return res.status(400).json({ ok: false, msg: '无效的存档槽位' });
  }
  const data = loadTaoyuanUserSaves(req.session.username);
  const raw = data.slots[slot] || null;
  if (!raw) return res.status(404).json({ ok: false, msg: '服务端存档不存在' });
  res.json({ ok: true, slot, raw });
});

router.post('/taoyuan/save/active-slot', loginRequired, signRequired, (req, res) => {
  const slot = parseInt(req.body?.slot, 10);
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
    return res.status(400).json({ ok: false, msg: '无效的存档槽位' });
  }
  const data = loadTaoyuanUserSaves(req.session.username);
  const raw = data.slots[slot] || null;
  if (!raw) return res.status(404).json({ ok: false, msg: '服务端存档不存在' });
  taoyuanHall.setActiveSaveSlot(req.session.username, slot);
  res.json({ ok: true, slot });
});

router.post('/taoyuan/save/:slot', loginRequired, signRequired, (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  const raw = typeof req.body?.raw === 'string' ? req.body.raw : '';
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
    return res.status(400).json({ ok: false, msg: '无效的存档槽位' });
  }
  if (!raw) return res.status(400).json({ ok: false, msg: '缺少存档数据' });
  const data = loadTaoyuanUserSaves(req.session.username);
  data.slots[slot] = raw;
  saveTaoyuanUserSaves(req.session.username, data);
  taoyuanHall.setActiveSaveSlot(req.session.username, slot);
  res.json({ ok: true, slot });
});

router.delete('/taoyuan/save/:slot', loginRequired, signRequired, (req, res) => {
  const slot = parseInt(req.params.slot, 10);
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
    return res.status(400).json({ ok: false, msg: '无效的存档槽位' });
  }
  const data = loadTaoyuanUserSaves(req.session.username);
  data.slots[slot] = null;
  saveTaoyuanUserSaves(req.session.username, data);
  taoyuanHall.clearActiveSaveSlotIfMatches(req.session.username, slot);
  res.json({ ok: true, slot });
});

router.get('/taoyuan/ai/config', (req, res) => {
  res.json({ ok: true, config: taoyuanAiAssistant.getPublicConfig() });
});

router.post('/taoyuan/ai/ask', async (req, res) => {
  try {
    const result = await taoyuanAiAssistant.ask(req.body?.question, {
      routeName: req.body?.route_name,
      contextLabel: req.body?.context_label,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || 'AI 助手暂时不可用' });
  }
});

router.post('/admin/taoyuan/ai/ask-debug', adminAuth, async (req, res) => {
  try {
    const result = await taoyuanAiAssistant.askDebug(req.body?.question, {
      routeName: req.body?.route_name,
      contextLabel: req.body?.context_label,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || 'AI 调试问答失败' });
  }
});

router.get('/admin/taoyuan/ai/config', adminAuth, (req, res) => {
  res.json({ ok: true, config: taoyuanAiAssistant.getAdminConfig() });
});

router.post('/admin/taoyuan/ai/config', adminAuth, (req, res) => {
  try {
    const config = taoyuanAiAssistant.setAdminConfig({
      enabled: req.body?.enabled,
      mode: req.body?.mode,
      sourceReadEnabled: req.body?.sourceReadEnabled,
      sourceIngestEnabled: req.body?.sourceIngestEnabled,
      assistantName: req.body?.assistantName,
      welcomeMessage: req.body?.welcomeMessage,
      apiUrl: req.body?.apiUrl,
      apiKey: req.body?.apiKey,
      model: req.body?.model,
      temperature: req.body?.temperature,
      systemPrompt: req.body?.systemPrompt,
      blockedTopics: req.body?.blockedTopics,
    });
    res.json({ ok: true, config });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '保存 AI 配置失败' });
  }
});

router.get('/admin/taoyuan/ai/source-index', adminAuth, (req, res) => {
  try {
    res.json({ ok: true, status: taoyuanAiAssistant.getSourceIndexStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message || '获取源码索引状态失败' });
  }
});

router.post('/admin/taoyuan/ai/source-index/rebuild', adminAuth, (req, res) => {
  try {
    res.json({ ok: true, status: taoyuanAiAssistant.rebuildSourceIndex() });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message || '重建源码索引失败' });
  }
});

router.get('/admin/taoyuan/ai/noun-lexicon', adminAuth, (req, res) => {
  try {
    res.json({ ok: true, status: taoyuanAiAssistant.getNounLexiconStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message || '获取名词词典状态失败' });
  }
});

router.post('/admin/taoyuan/ai/noun-lexicon/rebuild', adminAuth, (req, res) => {
  try {
    res.json({ ok: true, status: taoyuanAiAssistant.rebuildNounLexicon() });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message || '重建名词词典失败' });
  }
});

router.get('/admin/taoyuan/ai/knowledge', adminAuth, (req, res) => {
  try {
    const sourceType = String(req.query.source_type || '').trim();
    const entries = taoyuanAiAssistant.listKnowledgeEntries().filter(entry => !sourceType || String(entry.sourceType || entry.source_type || '') === sourceType);
    res.json({ ok: true, entries });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message || '获取 AI 知识库失败' });
  }
});

router.post('/admin/taoyuan/ai/knowledge', adminAuth, (req, res) => {
  try {
    const entry = taoyuanAiAssistant.createKnowledgeEntry(req.body || {});
    res.json({ ok: true, entry });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '创建知识条目失败' });
  }
});

router.put('/admin/taoyuan/ai/knowledge/:id', adminAuth, (req, res) => {
  try {
    const entry = taoyuanAiAssistant.updateKnowledgeEntry(req.params.id, req.body || {});
    res.json({ ok: true, entry });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '更新知识条目失败' });
  }
});

router.delete('/admin/taoyuan/ai/knowledge/:id', adminAuth, (req, res) => {
  try {
    const entry = taoyuanAiAssistant.deleteKnowledgeEntry(req.params.id);
    res.json({ ok: true, entry });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '删除知识条目失败' });
  }
});

router.post('/admin/taoyuan/ai/knowledge/source-draft', adminAuth, (req, res) => {
  try {
    const question = req.body?.question;
    const routeName = req.body?.route_name;
    const snippets = taoyuanAiAssistant.searchSourceContext(question, routeName);
    const draft = taoyuanAiAssistant.draftKnowledgeFromSource(question, routeName, snippets);
    res.json({ ok: true, snippets, draft });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '生成知识草稿失败' });
  }
});

router.post('/admin/taoyuan/ai/knowledge/:id/publish', adminAuth, (req, res) => {
  try {
    const entry = taoyuanAiAssistant.publishKnowledgeEntry(req.params.id);
    res.json({ ok: true, entry });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '发布知识条目失败' });
  }
});

router.get('/taoyuan/mail/list', loginRequired, async (req, res) => {
  try {
    await taoyuanMailbox.processPendingCampaigns();
    res.json({ ok: true, ...taoyuanMailbox.listUserMails(req.session.username) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取邮箱列表失败' });
  }
});

router.get('/taoyuan/mail/:id', loginRequired, async (req, res) => {
  try {
    await taoyuanMailbox.processPendingCampaigns();
    const mail = taoyuanMailbox.getUserMail(req.session.username, req.params.id);
    if (!mail) return res.status(404).json({ ok: false, msg: '邮件不存在' });
    res.json({ ok: true, mail });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取邮件详情失败' });
  }
});

router.get('/admin/taoyuan/mail/presets/guild-season', adminAuth, (req, res) => {
  try {
    res.json({ ok: true, config: taoyuanMailbox.getGuildSeasonMailboxConfig() });
  } catch (error) {
    res.status(error?.status || 500).json({ ok: false, msg: error?.message || '获取公会赛季邮件预设失败' });
  }
});

router.post('/taoyuan/mail/:id/read', loginRequired, signRequired, async (req, res) => {
  try {
    const mail = await taoyuanMailbox.markUserMailRead(req.session.username, req.params.id);
    res.json({ ok: true, mail });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '标记已读失败' });
  }
});

router.post('/taoyuan/mail/:id/claim', loginRequired, signRequired, async (req, res) => {
  try {
    const result = await taoyuanMailbox.claimUserMail(req.session.username, req.params.id);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '领取邮件奖励失败' });
  }
});

router.post('/taoyuan/mail/claim-all', loginRequired, signRequired, async (req, res) => {
  try {
    const result = await taoyuanMailbox.claimAllUserMails(req.session.username);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '一键领取失败' });
  }
});

router.post('/taoyuan/mail/clear-claimed', loginRequired, signRequired, async (req, res) => {
  try {
    const result = await taoyuanMailbox.clearClaimedUserMails(req.session.username);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '清理已领取邮件失败' });
  }
});

router.post('/taoyuan/mail/system-campaign', loginRequired, signRequired, async (req, res) => {
  try {
    const campaign = await taoyuanMailbox.saveSystemCampaignForUser(
      req.body,
      {
        username: req.session.username,
        displayName: req.session.display_name || req.session.username,
      },
      req.session.username,
    );
    res.json({ ok: true, campaign });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '创建系统邮件失败' });
  }
});

router.get('/admin/taoyuan/mail/campaigns', adminAuth, async (req, res) => {
  try {
    await taoyuanMailbox.processPendingCampaigns();
    res.json({ ok: true, campaigns: taoyuanMailbox.listAdminCampaigns() });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取邮件记录失败' });
  }
});

router.get('/admin/taoyuan/mail/campaigns/:id', adminAuth, async (req, res) => {
  try {
    await taoyuanMailbox.processPendingCampaigns();
    const detail = taoyuanMailbox.getAdminCampaignDetail(req.params.id);
    if (!detail) return res.status(404).json({ ok: false, msg: '邮件记录不存在' });
    res.json({ ok: true, ...detail });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取邮件详情失败' });
  }
});

router.post('/admin/taoyuan/mail/campaigns', adminAuth, async (req, res) => {
  try {
    const action = ['draft', 'schedule', 'send'].includes(String(req.body?.action)) ? String(req.body.action) : 'draft';
    const campaign = await taoyuanMailbox.saveAdminCampaign(
      req.body,
      { username: req.admin?.operator_name || 'admin', displayName: req.admin?.role_label || '管理员' },
      action,
    );
    res.json({ ok: true, campaign });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '保存邮件失败' });
  }
});

router.get('/taoyuan/hall/posts', (req, res) => {
  try {
    const result = taoyuanHall.listPosts({
      category: req.query.category,
      sort: req.query.sort,
      mine: req.query.mine,
      viewerUsername: req.session?.username || '',
      keyword: req.query.keyword,
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.page_size, 10) || 20,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取帖子列表失败' });
  }
});

router.get('/taoyuan/hall/posts/:id', (req, res) => {
  try {
    const post = taoyuanHall.getPost(req.params.id, req.session?.username || '');
    if (!post) return res.status(404).json({ ok: false, msg: '帖子不存在' });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取帖子详情失败' });
  }
});

router.post('/taoyuan/hall/upload-image', loginRequired, signRequired, async (req, res) => {
  try {
    const uploaded = await taoyuanHall.saveUploadedImage({
      dataUrl: req.body?.data_url,
      filename: req.body?.filename,
    });
    res.json({ ok: true, ...uploaded });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '上传图片失败' });
  }
});

router.post('/taoyuan/hall/posts', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.createPost({
      title: req.body?.title,
      content: req.body?.content,
      blocks: req.body?.blocks,
      type: req.body?.type,
      rewardAmount: req.body?.reward_amount,
      author: req.session.username,
      authorDisplayName: req.session.display_name || req.session.username,
    });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '发帖失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/replies', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.addReply({
      postId: req.params.id,
      content: req.body?.content,
      replyToId: req.body?.reply_to_id,
      author: req.session.username,
      authorDisplayName: req.session.display_name || req.session.username,
    });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '回复失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/report', loginRequired, signRequired, async (req, res) => {
  try {
    const report = await taoyuanHall.createReport({
      type: 'post',
      postId: req.params.id,
      reason: req.body?.reason,
      reporter: req.session.username,
      reporterDisplayName: req.session.display_name || req.session.username,
    });
    res.json({ ok: true, report });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '举报帖子失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/replies/:replyId/report', loginRequired, signRequired, async (req, res) => {
  try {
    const report = await taoyuanHall.createReport({
      type: 'reply',
      postId: req.params.id,
      replyId: req.params.replyId,
      reason: req.body?.reason,
      reporter: req.session.username,
      reporterDisplayName: req.session.display_name || req.session.username,
    });
    res.json({ ok: true, report });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '举报回复失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/solve', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.setSolved({ postId: req.params.id, actor: req.session.username, solved: req.body?.solved !== false });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '更新求助状态失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/best-reply', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.selectBestReply({ postId: req.params.id, replyId: req.body?.reply_id, actor: req.session.username });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '设置最佳回复失败' });
  }
});

router.delete('/taoyuan/hall/posts/:id', loginRequired, signRequired, async (req, res) => {
  try {
    const result = await taoyuanHall.deletePost({ postId: req.params.id, actor: req.session.username });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '删除帖子失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/like', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.togglePostLike({ postId: req.params.id, username: req.session.username, action: 'like' });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '点赞失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/dislike', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.togglePostLike({ postId: req.params.id, username: req.session.username, action: 'dislike' });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '点踩失败' });
  }
});

router.post('/taoyuan/hall/posts/:id/replies/:replyId/like', loginRequired, signRequired, async (req, res) => {
  try {
    const post = await taoyuanHall.toggleReplyLike({ postId: req.params.id, replyId: req.params.replyId, username: req.session.username });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '回复点赞失败' });
  }
});

router.get('/admin/taoyuan/hall/reports', adminAuth, (req, res) => {
  try {
    res.json({ ok: true, reports: taoyuanHall.listReports() });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '获取举报列表失败' });
  }
});

router.post('/admin/taoyuan/hall/reports/:id/status', adminAuth, async (req, res) => {
  try {
    const report = await taoyuanHall.setReportStatus({ reportId: req.params.id, status: req.body?.status });
    res.json({ ok: true, report });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '更新举报状态失败' });
  }
});

router.post('/admin/taoyuan/hall/posts/:id/hide', adminAuth, async (req, res) => {
  try {
    const result = await taoyuanHall.hidePost({ postId: req.params.id, hidden: req.body?.hidden, reason: req.body?.reason });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '隐藏帖子失败' });
  }
});

router.delete('/admin/taoyuan/hall/posts/:id/replies/:replyId', adminAuth, async (req, res) => {
  try {
    const post = await taoyuanHall.deleteReplyByAdmin({ postId: req.params.id, replyId: req.params.replyId });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '删除回复失败' });
  }
});

router.post('/admin/taoyuan/hall/posts/:id/pin', adminAuth, async (req, res) => {
  try {
    const post = await taoyuanHall.setPinned({ postId: req.params.id, pinned: req.body?.pinned });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '置顶帖子失败' });
  }
});

router.post('/admin/taoyuan/hall/posts/:id/feature', adminAuth, async (req, res) => {
  try {
    const post = await taoyuanHall.setFeatured({ postId: req.params.id, featured: req.body?.featured });
    res.json({ ok: true, post });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, msg: error.message || '加精帖子失败' });
  }
});

module.exports = router;
