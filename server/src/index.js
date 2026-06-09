/*
 * 本项目由Memorial开发，开源地址：https://github.com/Memorial-coder/taoyuan-duli，如果你觉得这个项目对你有帮助，也欢迎前往仓库点个 Star 支持一下，玩家交流群1094297186
 */
const path = require('path');

if (!process.env.DB_STORAGE) {
  process.env.DB_STORAGE = path.join(__dirname, '../../data/.storage.json');
}
const initialDbStorage = process.env.DB_STORAGE;
const initialPort = process.env.PORT;

require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });
require('dotenv').config({ path: path.join(__dirname, '../../.env.offical'), override: true });
process.env.DB_STORAGE = initialDbStorage;
if (initialPort) {
  process.env.PORT = initialPort;
}

if (String(process.env.QA_ONLINE_SMOKE_FORCE_LOCAL || '').trim().toLowerCase() === 'true') {
  process.env.MYSQL_HOST = '';
  process.env.MYSQL_PORT = '';
  process.env.MYSQL_USER = '';
  process.env.MYSQL_PASSWORD = '';
  process.env.MYSQL_DATABASE = '';
}

const fs = require('fs');
const http = require('http');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const db = require('./db');
const taoyuanHall = require('./taoyuanHall');
const taoyuanImageModeration = require('./taoyuanImageModeration');
const officialManagedConfig = require('./officialManagedConfig');
const taoyuanRealtimeRuntime = require('./taoyuanRealtimeRuntime');

const DATA_DIR = path.dirname(process.env.DB_STORAGE);
const DEFAULTS_DIR = path.join(__dirname, '../../data-defaults');

function shouldSeedEntry(targetPath) {
  if (!fs.existsSync(targetPath)) return true;
  const targetStat = fs.statSync(targetPath);
  if (targetStat.isDirectory()) {
    return fs.readdirSync(targetPath).length === 0;
  }
  return targetStat.size === 0;
}

function copyDefaultEntry(from, to) {
  const fromStat = fs.statSync(from);
  if (fromStat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const child of fs.readdirSync(from)) {
      copyDefaultEntry(path.join(from, child), path.join(to, child));
    }
    return;
  }
  fs.copyFileSync(from, to);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
if (fs.existsSync(DEFAULTS_DIR)) {
  for (const file of fs.readdirSync(DEFAULTS_DIR)) {
    const from = path.join(DEFAULTS_DIR, file);
    const to = path.join(DATA_DIR, file);
    if (shouldSeedEntry(to)) {
      copyDefaultEntry(from, to);
    }
  }
}

const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '4013', 10);
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '').trim().toLowerCase() === 'true';
const COOKIE_SAME_SITE = String(process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();
const SESSION_STORE_FILE = path.join(DATA_DIR, 'sessions.json');
const DEFAULT_ITEM_ICON_DIR = process.platform === 'win32'
  ? path.join(__dirname, '../../taoyuan-main/public/item')
  : '/opt/taoyuan/item';
const CONFIGURED_ITEM_ICON_DIR = process.env.TAOYUAN_ITEM_ICON_DIR
  ? path.resolve(process.env.TAOYUAN_ITEM_ICON_DIR)
  : DEFAULT_ITEM_ICON_DIR;
const LOCAL_ITEM_ICON_DIR = path.join(__dirname, '../../taoyuan-main/public/item');
const DEFAULT_NPC_PORTRAIT_DIR = process.platform === 'win32'
  ? path.join(__dirname, '../../taoyuan-main/public/npc')
  : '/opt/taoyuan/npc';
const CONFIGURED_NPC_PORTRAIT_DIR = process.env.TAOYUAN_NPC_PORTRAIT_DIR
  ? path.resolve(process.env.TAOYUAN_NPC_PORTRAIT_DIR)
  : DEFAULT_NPC_PORTRAIT_DIR;
const LOCAL_NPC_PORTRAIT_DIR = path.join(__dirname, '../../taoyuan-main/public/npc');
const DEFAULT_CROP_ASSET_DIR = process.platform === 'win32'
  ? path.join(__dirname, '../../taoyuan-main/public/crop')
  : '/opt/taoyuan/crop';
const CONFIGURED_CROP_ASSET_DIR = process.env.TAOYUAN_CROP_ASSET_DIR
  ? path.resolve(process.env.TAOYUAN_CROP_ASSET_DIR)
  : DEFAULT_CROP_ASSET_DIR;
const LOCAL_CROP_ASSET_DIR = path.join(__dirname, '../../taoyuan-main/public/crop');
const DEFAULT_FISH_BOSS_ASSET_DIR = process.platform === 'win32'
  ? path.join(__dirname, '../../taoyuan-main/public/asset_fish_boss')
  : '/opt/taoyuan/asset_fish_boss';
const CONFIGURED_FISH_BOSS_ASSET_DIR = process.env.TAOYUAN_FISH_BOSS_ASSET_DIR
  ? path.resolve(process.env.TAOYUAN_FISH_BOSS_ASSET_DIR)
  : DEFAULT_FISH_BOSS_ASSET_DIR;
const LOCAL_FISH_BOSS_ASSET_DIR = path.join(__dirname, '../../taoyuan-main/public/asset_fish_boss');
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:4013',
  'http://localhost:4013',
  'http://127.0.0.1:4014',
  'http://localhost:4014',
  'https://localhost',
  'https://127.0.0.1',
];

function parseAllowedOrigins() {
  const raw = String(process.env.CORS_ALLOWED_ORIGINS || '').trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function validateCriticalEnv() {
  const missing = ['SECRET_KEY', 'ADMIN_TOKEN']
    .filter(key => !String(process.env[key] || '').trim());

  if (missing.length) {
    throw new Error(`缺少必要环境变量：${missing.join(', ')}`);
  }

  const secretKey = String(process.env.SECRET_KEY || '').trim();
  const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
  const superAdminToken = String(process.env.SUPER_ADMIN_TOKEN || '').trim();
  const errors = [];

  if (secretKey.length < 24 || /^请填写/.test(secretKey)) {
    errors.push('SECRET_KEY 不能使用示例值，且长度至少 24 位');
  }

  if (adminToken.length < 12 || /^请填写/.test(adminToken) || adminToken === 'taoyuan_admin') {
    errors.push('ADMIN_TOKEN 不能使用示例值/默认值，且长度至少 12 位');
  }

  if (superAdminToken) {
    if (superAdminToken.length < 12 || /^请填写/.test(superAdminToken) || superAdminToken === 'taoyuan_admin') {
      errors.push('SUPER_ADMIN_TOKEN 不能使用示例值/默认值，且长度至少 12 位');
    }
    if (superAdminToken === adminToken) {
      errors.push('SUPER_ADMIN_TOKEN 不能与 ADMIN_TOKEN 相同');
    }
  }

  if (errors.length) {
    throw new Error(errors.join('；'));
  }

  if (COOKIE_SAME_SITE === 'none' && !COOKIE_SECURE) {
    throw new Error('COOKIE_SAME_SITE=none 时必须同时启用 COOKIE_SECURE=true');
  }

  const mysqlRelatedKeys = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const providedMysqlKeys = mysqlRelatedKeys.filter(key => String(process.env[key] || '').trim());
  if (providedMysqlKeys.length > 0 && !db.MYSQL_ENABLED) {
    throw new Error('检测到不完整的 MYSQL_* 配置；请补齐 MYSQL_HOST、MYSQL_USER、MYSQL_DATABASE，或移除全部 MYSQL_* 配置后再启动');
  }

  const mysqlPortRaw = String(process.env.MYSQL_PORT || '').trim();
  if (mysqlPortRaw) {
    const mysqlPort = parseInt(mysqlPortRaw, 10);
    if (!Number.isInteger(mysqlPort) || mysqlPort <= 0) {
      throw new Error('MYSQL_PORT 必须是正整数');
    }
  }
  const officialControlPlatformEnabled = String(process.env.OFFICIAL_CONTROL_PLATFORM_ENABLED || '').trim().toLowerCase() === 'true';
  const cacheTtl = String(process.env.OFFICIAL_CONTROL_CACHE_TTL_SEC || '').trim();
  if (cacheTtl) {
    const parsedCacheTtl = parseInt(cacheTtl, 10);
    if (!Number.isInteger(parsedCacheTtl) || parsedCacheTtl <= 0) {
      throw new Error('OFFICIAL_CONTROL_CACHE_TTL_SEC 必须是正整数');
    }
  }

  if (officialControlPlatformEnabled) {
    const privateKey = String(process.env.OFFICIAL_CONTROL_PRIVATE_KEY || '').trim();
    const adminPassword = String(process.env.OFFICIAL_CONTROL_ADMIN_PASSWORD || '').trim();
    if (!adminPassword) {
      throw new Error('OFFICIAL_CONTROL_ADMIN_PASSWORD 不能为空');
    }
    if (!privateKey) {
      throw new Error('OFFICIAL_CONTROL_PRIVATE_KEY 不能为空');
    }
  }
}

function loadSessionStoreSnapshot(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function saveSessionStoreSnapshot(filePath, snapshot) {
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
}

function getSessionExpiresAt(sessionData) {
  const expires = sessionData?.cookie?.expires;
  if (!expires) return null;
  const timestamp = new Date(expires).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

class FileSessionStore extends session.Store {
  constructor(filePath) {
    super();
    this.filePath = filePath;
  }

  pruneExpired(snapshot) {
    const now = Date.now();
    let changed = false;
    for (const [sid, sessionData] of Object.entries(snapshot)) {
      const expiresAt = getSessionExpiresAt(sessionData);
      if (expiresAt && expiresAt <= now) {
        delete snapshot[sid];
        changed = true;
      }
    }
    if (changed) saveSessionStoreSnapshot(this.filePath, snapshot);
    return snapshot;
  }

  get(sid, callback) {
    try {
      const snapshot = this.pruneExpired(loadSessionStoreSnapshot(this.filePath));
      callback(null, snapshot[sid] || null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const snapshot = this.pruneExpired(loadSessionStoreSnapshot(this.filePath));
      snapshot[sid] = sessionData;
      saveSessionStoreSnapshot(this.filePath, snapshot);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid, callback) {
    try {
      const snapshot = loadSessionStoreSnapshot(this.filePath);
      delete snapshot[sid];
      saveSessionStoreSnapshot(this.filePath, snapshot);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid, sessionData, callback) {
    this.set(sid, sessionData, callback);
  }
}

const allowedOrigins = new Set(parseAllowedOrigins());
const sessionStore = new FileSessionStore(SESSION_STORE_FILE);
const resolvedCookieSameSite = ['lax', 'strict', 'none'].includes(COOKIE_SAME_SITE)
  ? COOKIE_SAME_SITE
  : (COOKIE_SECURE ? 'none' : 'lax');

function createHallUploadVisibilityGuard() {
  return (req, res, next) => {
    const storedName = path.basename(String(req.path || req.url || ''));
    if (!storedName || !taoyuanImageModeration.isUploadedImageVisibleByStoredName(storedName)) {
      res.status(404).send('Not found');
      return;
    }
    next();
  };
}

app.set('trust proxy', true);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.has(origin));
  },
  credentials: true,
}));
app.use(morgan('combined'));
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use('/taoyuan/hall/uploads', createHallUploadVisibilityGuard(), express.static(taoyuanHall.HALL_UPLOADS_DIR, {
  etag: false,
  lastModified: false,
  maxAge: '7d',
  fallthrough: false,
  setHeaders(res, filePath) {
    if (!taoyuanImageModeration.isUploadedImageVisibleByStoredName(path.basename(filePath))) {
      res.statusCode = 404;
    }
  },
}));
const itemIconDir = fs.existsSync(CONFIGURED_ITEM_ICON_DIR) ? CONFIGURED_ITEM_ICON_DIR : LOCAL_ITEM_ICON_DIR;
if (fs.existsSync(itemIconDir)) {
  app.use('/item', express.static(itemIconDir, {
    index: false,
    maxAge: '365d',
    immutable: true,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'item-icon-manifest.json') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  console.log(`Item icons mounted at /item: ${itemIconDir}`);
}
const npcPortraitDir = fs.existsSync(CONFIGURED_NPC_PORTRAIT_DIR) ? CONFIGURED_NPC_PORTRAIT_DIR : LOCAL_NPC_PORTRAIT_DIR;
if (fs.existsSync(npcPortraitDir)) {
  app.use('/npc', express.static(npcPortraitDir, {
    index: false,
    maxAge: '365d',
    immutable: true,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'npc-portrait-manifest.json') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  console.log(`NPC portraits mounted at /npc: ${npcPortraitDir}`);
}
const cropAssetDir = fs.existsSync(CONFIGURED_CROP_ASSET_DIR) ? CONFIGURED_CROP_ASSET_DIR : LOCAL_CROP_ASSET_DIR;
if (fs.existsSync(cropAssetDir)) {
  app.use('/crop', express.static(cropAssetDir, {
    index: false,
    maxAge: '365d',
    immutable: true,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'crop-asset-manifest.json' || path.basename(filePath) === 'crop-asset-qa-report.json') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  console.log(`Crop assets mounted at /crop: ${cropAssetDir}`);
}
const fishBossAssetDir = fs.existsSync(CONFIGURED_FISH_BOSS_ASSET_DIR) ? CONFIGURED_FISH_BOSS_ASSET_DIR : LOCAL_FISH_BOSS_ASSET_DIR;
if (fs.existsSync(fishBossAssetDir)) {
  app.use('/asset_fish_boss', express.static(fishBossAssetDir, {
    index: false,
    maxAge: '365d',
    immutable: true,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'fish-boss-asset-manifest.json' || path.basename(filePath) === 'fish-boss-asset-qa-report.json') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  console.log(`Fish boss assets mounted at /asset_fish_boss: ${fishBossAssetDir}`);
}
app.use(session({
  name: 'taoyuan.sid',
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: resolvedCookieSameSite,
    secure: COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use('/api', apiRoutes);
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, msg: '接口不存在' });
});

const distPath = path.join(__dirname, '../../taoyuan-main/docs');
if (fs.existsSync(distPath)) {
  const indexHtmlPath = path.join(distPath, 'index.html');
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '365d',
    immutable: true,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));
  app.use(express.static(distPath, {
    index: false,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'taoyuan-entry.css') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    },
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(indexHtmlPath);
  });
  console.log(`✅ 桃源乡独立版前端已挂载: ${distPath}`);
} else {
  console.log('⚠️ 未找到 taoyuan-main/docs，仅提供 API 服务');
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ ok: false, msg: err.message || '服务器内部错误' });
});

taoyuanRealtimeRuntime.attachRealtimeServer(server, {
  sessionStore,
  sessionSecret: process.env.SECRET_KEY || '',
  cookieName: 'taoyuan.sid',
});

async function startServer() {
  try {
    validateCriticalEnv();

    if (db.MYSQL_ENABLED) {
      await db.ensureMysqlReady();
      console.log('✅ MySQL 用户库已连接');
    } else {
      console.log('⚠️ 未启用 MySQL，账号将继续使用本地 users.json');
    }
    await officialManagedConfig.start();
  } catch (error) {
    console.error('❌ MySQL 初始化失败：', error.message || error);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🏮 桃源乡独立版启动于 http://127.0.0.1:${PORT}`);
  });
}

void startServer();
