// config.js - 系统配置（管理员可修改）
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DB_STORAGE
  ? path.dirname(process.env.DB_STORAGE)
  : path.join(__dirname, '../data');

const CONFIG_FILE = path.join(DATA_DIR, 'sys_config.json');

const DEFAULTS = {
  // 签到配置
  checkin_enabled: true,
  checkin_mode: 'fixed',       // 'fixed' | 'random'
  checkin_quota: 500000,       // 固定签到额度（单位：quota）
  checkin_quota_min: 100000,   // 随机最小
  checkin_quota_max: 1000000,  // 随机最大
  checkin_streak_bonus: true,  // 连签奖励开关（3天+10%，7天+20%）

  // 保底配置
  pity_enabled: true,
  pity_threshold: 10,          // 连续未中N次触发保底
  pity_prob_step: 0.02,        // 每次未中概率加成

  // 换算
  exchange_rate: parseInt(process.env.EXCHANGE_RATE || '500000'),
  taoyuan_exchange_rate_quota_per_money: parseInt(process.env.TAOYUAN_EXCHANGE_RATE || '100'),
  taoyuan_exchange_rate_dollar_per_money: parseFloat(process.env.TAOYUAN_EXCHANGE_RATE_DOLLAR_PER_MONEY || '0.0002'),

  // 桃源乡菜单配置
  taoyuan_return_button_enabled: false,
  taoyuan_return_button_text: '返回首页',
  taoyuan_return_button_url: '/',
  taoyuan_about_button_enabled: true,
  taoyuan_about_button_text: '关于游戏',
  taoyuan_about_dialog_title: '关于桃源乡',
  taoyuan_about_dialog_content: '欢迎来到桃源乡独立版。这是一款以种田、采集、养殖、钓鱼和经营为核心的文字田园模拟游戏。',

  // 桃源乡额度限制（单位：文，0 = 不限）
  taoyuan_daily_import_limit_money: 0,
  taoyuan_daily_export_limit_money: 0,

  // 游戏大厅配置
  gamehall_farm_title: '开心农场',
  gamehall_farm_desc: '种菜、浇花、施肥、收获、卖菜，完整庭院玩法。',
  gamehall_farm_status: 'integrated',
  gamehall_farmhand_title: 'Farmhand',
  gamehall_farmhand_desc: '成熟的经营型农场模拟游戏，侧重经济、种植、交易与长期发展。',
  gamehall_farmhand_status: 'external',
  gamehall_otherworld_title: '异界神农',
  gamehall_otherworld_desc: '已站内集成的中文农场模拟游戏，包含种植、建造、NPC 互动与事件系统。',
  gamehall_otherworld_status: 'integrated',
  gamehall_taoyuan_title: '桃源乡',
  gamehall_taoyuan_desc: '文字田园物语，包含四季经营、钓鱼、社交、矿洞、烹饪与大量养成系统。',
  gamehall_taoyuan_status: 'integrated',
  gamehall_flip_title: '翻牌挑战',
  gamehall_flip_desc: '翻开卡片获得惊喜奖励，考验运气与策略。',
  gamehall_flip_status: 'developing',

  // 首页文案配置
  homepage_title: '🎰 Lucky 抽奖系统',
  homepage_subtitle: '公平、透明、有趣的抽奖平台 · 使用 NewAPI 账号登录参与',
  homepage_primary_button_text: '🎯 参与活动',
  homepage_secondary_button_text: '📊 查看看板',

  // 活动页效果配置
  lottery_target_cursor_enabled: true,
  lottery_target_cursor_spin_duration: 2,
  lottery_target_cursor_hover_duration: 0.2,
  lottery_target_cursor_hide_default_cursor: true,
  lottery_target_cursor_parallax_on: true,

  lottery_border_glow_enabled: true,
  lottery_border_glow_color: '40 95 82',
  lottery_border_glow_radius: 32,
  lottery_border_glow_intensity: 0.9,
  lottery_border_glow_fill_opacity: 0.22,
  lottery_border_glow_palette: '#fbbf24,#fde68a,#f59e0b',

  // 登录页 Particles 配置
  login_particles_enabled: true,
  login_particles_count: 260,
  login_particles_spread: 18,
  login_particles_speed: 0.2,
  login_particles_hover_enabled: true,
  login_particles_hover_factor: 1.1,
  login_particles_alpha_enabled: true,
  login_particles_base_size: 140,
  login_particles_size_randomness: 1.2,
  login_particles_camera_distance: 12,
  login_particles_palette: '#93c5fd,#c4b5fd,#f9a8d4',

  // 顶部导航效果配置
  nav_pill_enabled: true,
  nav_pill_base_color_dark: '#18181b',
  nav_pill_pill_color_dark: '#27272a',
  nav_pill_text_color_dark: '#e5e7eb',
  nav_pill_hover_text_color: '#ffffff',

  nav_card_enabled: true,
  nav_card_base_color_dark: '#18181b',
  nav_card_menu_color_dark: '#e5e7eb',
  nav_card_button_bg_color_dark: '#27272a',
  nav_card_button_text_color_dark: '#e5e7eb',

  // 首页 CountUp
  homepage_countup_enabled: true,
  homepage_countup_duration: 1.05,

  // 抽奖弹窗效果配置
  draw_modal_magnet_enabled: false,
  draw_modal_split_delay: 60,
  draw_modal_scramble_duration: 800,
  draw_modal_amount_duration: 1.2,
  draw_modal_balance_duration: 1,

  // 桃源乡 AI 助手配置
  ai_assistant_enabled: true,
  ai_assistant_mode: 'strict',
  ai_assistant_source_read_enabled: false,
  ai_assistant_source_ingest_enabled: false,
  ai_assistant_name: '桃源小助理',
  ai_assistant_welcome:
    '你好，我是桃源小助理。你可以问我玩法、系统机制、资源获取和攻略建议；如果是严格模式，我不会回答敏感数值、隐藏掉率或后台规则。',
  ai_assistant_api_url: '',
  ai_assistant_api_key: '',
  ai_assistant_model: '',
  ai_assistant_temperature: 0.2,
  ai_assistant_system_prompt:
    '你是桃源乡游戏内 AI 助手。请只依据提供的知识片段回答，优先给出清晰、简洁、面向玩家的解释和建议；如果依据不足，请明确说明无法确认，不要编造。',
  ai_assistant_blocked_topics: '掉率\n爆率\n概率\n风控\n反作弊\n后台\n管理员口令\n密钥\ntoken\n漏洞\n刷资源',
};

function jLoad(file, def) {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  return def;
}
function jSave(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

let _config = { ...DEFAULTS, ...jLoad(CONFIG_FILE, {}) };

function get(key) {
  return key ? _config[key] : { ..._config };
}

function set(updates) {
  _config = { ..._config, ...updates };
  jSave(CONFIG_FILE, _config);
  return _config;
}

function all() {
  return { ..._config };
}

module.exports = { get, set, all, DEFAULTS };
