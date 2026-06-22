import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findAvailablePort, isPlaywrightEnvironmentError, isTcpServerReachable, stopWindowsViteProcessesForPort, waitForTcpServer } from './port-utils.mjs'
import { chromium, expect } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(repoRoot, '..')
const outputDir = path.resolve(workspaceRoot, 'docs', 'ui-smoke-2026-04-26')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_E2E_PORT || 4175)
const configuredBaseURL = process.env.TAOYUAN_BASE_URL?.trim() || ''
const port = configuredBaseURL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = configuredBaseURL || `http://${host}:${port}`
const shouldStartDevServer = process.env.TAOYUAN_SKIP_DEV_SERVER !== '1' && !configuredBaseURL
const readTimeoutMs = (name, fallback) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 0 ? value : fallback
}
const devServerSettleMs = readTimeoutMs('TAOYUAN_DEV_SERVER_SETTLE_MS', 30_000)
const homeNavigationTimeoutMs = readTimeoutMs('TAOYUAN_MOBILE_SMOKE_NAV_TIMEOUT_MS', 30_000)
const homeReadyTimeoutMs = readTimeoutMs('TAOYUAN_MOBILE_SMOKE_HOME_READY_TIMEOUT_MS', 30_000)
const routeFetchTimeoutMs = readTimeoutMs('TAOYUAN_MOBILE_SMOKE_ROUTE_FETCH_TIMEOUT_MS', 5_000)
const scenarioFilter = process.env.TAOYUAN_MOBILE_SMOKE_ONLY?.trim() || ''
const sampleFallbackScenarios = new Set([
  'online-festival-room',
  'online-expedition-room',
  'online-orders',
  'cottage-cohabitation-entry',
  'farm-cohabitation-switch',
  'online-society-projects'
])
const sampleId = 'region_map_showcase'

const consoleErrors = []
const pageErrors = []
const requestFailures = []
const screenshots = []
const pageChecks = []

function assertShippingBoxSourceGuards() {
  const source = readFileSync(path.join(repoRoot, 'src', 'views', 'game', 'FarmView.vue'), 'utf8')
  const required = [
    ['data-testid="shipping-box-modal"', '出货箱弹窗必须有稳定测试选择器'],
    ['data-testid="shipping-box-entry"', '出货箱入口必须有稳定测试选择器'],
    ['h-[88dvh]', '移动端出货箱弹窗高度必须固定，避免列表增减时跳动'],
    ['max-h-[88dvh]', '移动端出货箱必须接近全屏高度'],
    ['md:h-[82dvh]', '桌面端出货箱弹窗高度必须固定，避免列表增减时跳动'],
    ['md:max-h-[82dvh]', '桌面端出货箱必须限制在视口内'],
    ['md:max-w-4xl', '桌面端出货箱必须使用宽弹窗'],
    ['data-testid="shipping-box-search"', '出货箱必须保留搜索入口'],
    ['data-testid="shipping-box-category"', '出货箱必须保留分类筛选入口'],
    ['data-testid="shipping-box-sort"', '出货箱必须保留排序入口'],
    ['data-testid="shipping-box-add-one"', '出货箱必须保留放入1按钮'],
    ['data-testid="shipping-box-add-five"', '出货箱必须保留批量放入按钮'],
    ['data-testid="shipping-box-add-all"', '出货箱必须保留全部放入按钮']
  ]
  const missing = required.filter(([needle]) => !source.includes(needle)).map(([, message]) => message)
  if (missing.length > 0) throw new Error(`shipping box mobile source guards failed: ${missing.join('; ')}`)
}

const buildMockProfile = ({
  username,
  displayName,
  recentActivity = '最近在行旅图整理远征补给',
  primaryRouteLabel = '古驿荒道巡行'
}) => ({
  username,
  display_name: displayName,
  player_name: displayName,
  honorific: '旅人',
  manor_name: `${displayName}的庄园`,
  season_progress: '秋 2 年',
  primary_route_label: primaryRouteLabel,
  recent_activity: recentActivity,
  public_title: '远征协作者',
  neighborhood_role: '邻里成员',
  showcase_theme: '秋日行旅',
  public_intro: '用于移动端好友驿站 smoke 的公开名片。',
  avatar_image_url: '',
  avatar_image_alt: '',
  visibility: 'public',
  active_quest_count: 2,
  public_tags: [],
  selected_tag_ids: [],
  available_tag_options: [],
  player_chronicle: null,
  award_showcase: {
    honors: [],
    commemoratives: [],
    titles: [],
    achievement_cards: [],
    summary: {
      honor_count: 0,
      commemorative_count: 0,
      title_count: 0,
      achievement_count: 0
    }
  },
  updated_at: 1_769_011_200_000,
  last_active_at: 1_769_011_200_000
})

const mockSocialProfiles = {
  willow: buildMockProfile({
    username: 'willow',
    displayName: '柳桥织娘',
    recentActivity: '刚把古驿荒道的补给单整理完',
    primaryRouteLabel: '古驿荒道协作'
  }),
  reed: buildMockProfile({
    username: 'reed',
    displayName: '芦湾药师',
    recentActivity: '正在蜃潮泽地记录异草样本',
    primaryRouteLabel: '蜃潮泽地采样'
  }),
  cloud: buildMockProfile({
    username: 'cloud',
    displayName: '云岭巡手',
    recentActivity: '发来一条高地巡行申请',
    primaryRouteLabel: '云岚高地巡路'
  }),
  river: buildMockProfile({
    username: 'river',
    displayName: '溪口木匠',
    recentActivity: '等待协作确认',
    primaryRouteLabel: '村社木料协作'
  }),
  blocked: buildMockProfile({
    username: 'blocked',
    displayName: '灰名单旅人',
    recentActivity: '已被当前存档拉黑',
    primaryRouteLabel: '暂不互动'
  }),
  searched: buildMockProfile({
    username: 'orchard',
    displayName: '远山果匠',
    recentActivity: '今日开放果林庄园参观',
    primaryRouteLabel: '庄园来访'
  })
}

const mockRelationshipOverview = {
  ok: true,
  incoming_requests: [
    {
      request_id: 'request-cloud',
      created_at: 1_769_011_200_000,
      from_save_id: 345678901,
      to_save_id: 123456789,
      from_save_slot: 0,
      to_save_slot: 1,
      profile: mockSocialProfiles.cloud
    }
  ],
  outgoing_requests: [
    {
      request_id: 'request-river',
      created_at: 1_769_007_600_000,
      from_save_id: 123456789,
      to_save_id: 456789012,
      from_save_slot: 1,
      to_save_slot: 0,
      profile: mockSocialProfiles.river
    }
  ],
  friends: [
    {
      friendship_id: 'friend-willow',
      created_at: 1_768_838_400_000,
      friends_since: 1_768_838_400_000,
      last_interaction_at: 1_769_011_200_000,
      own_save_id: 123456789,
      own_save_slot: 1,
      friend_save_id: 234567890,
      friend_save_slot: 0,
      profile: mockSocialProfiles.willow
    },
    {
      friendship_id: 'friend-reed',
      created_at: 1_768_752_000_000,
      friends_since: 1_768_752_000_000,
      last_interaction_at: 1_768_924_800_000,
      own_save_id: 123456789,
      own_save_slot: 1,
      friend_save_id: 234567891,
      friend_save_slot: 2,
      profile: mockSocialProfiles.reed
    }
  ],
  blocked_users: [
    {
      block_id: 'block-grey',
      created_at: 1_768_665_600_000,
      own_save_id: 123456789,
      own_save_slot: 1,
      blocker_save_id: 123456789,
      blocker_save_slot: 1,
      blocked_save_id: 567890123,
      blocked_save_slot: 0,
      profile: mockSocialProfiles.blocked
    }
  ]
}

const onlineCenterModuleKeys = ['manor', 'neighbor', 'orders', 'festival', 'society']

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function fulfillFromNodeFetch(route) {
  const request = route.request()
  if (request.method() !== 'GET') {
    await route.continue()
    return
  }
  const controller = new AbortController()
  const timeout = routeFetchTimeoutMs > 0
    ? setTimeout(() => controller.abort(), routeFetchTimeoutMs)
    : null
  try {
    const response = await fetch(request.url(), {
      signal: routeFetchTimeoutMs > 0 ? controller.signal : undefined,
      headers: {
        accept: request.headers().accept || '*/*'
      }
    })
    const headers = {}
    for (const [key, value] of response.headers.entries()) {
      if (['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) continue
      headers[key] = value
    }
    await route.fulfill({
      status: response.status,
      headers,
      body: Buffer.from(await response.arrayBuffer())
    })
  } catch {
    await route.continue()
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function startDevServer() {
  let markReady
  let markFailed
  let readySettled = false
  const ready = new Promise((resolve, reject) => {
    markReady = () => {
      if (readySettled) return
      readySettled = true
      resolve()
    }
    markFailed = error => {
      if (readySettled) return
      readySettled = true
      reject(error)
    }
  })
  const viteCliPath = path.resolve(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteCliPath, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  child.stdout.on('data', chunk => {
    process.stdout.write(chunk)
    const text = String(chunk)
    if (/ready in|Local:/i.test(text)) markReady()
  })
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk)
    const text = String(chunk)
    if (/ready in|Local:/i.test(text)) markReady()
  })
  child.once('exit', code => {
    if (!readySettled) markFailed(new Error(`Dev server exited before ready, code=${code ?? 'unknown'}`))
  })

  return { child, ready }
}

async function waitForStartedDevServer(server) {
  if (!server) {
    await waitForTcpServer(baseURL)
    return
  }
  await Promise.race([
    server.ready,
    wait(120_000).then(() => {
      throw new Error(`Timed out waiting for dev server stdout readiness at ${baseURL}`)
    })
  ])
  await wait(devServerSettleMs)
}

function stopProcessTree(child) {
  if (!child || !child.pid) return
  if (process.platform === 'win32') {
    if (!child.killed) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    }
    stopWindowsViteProcessesForPort(port)
    return
  }
  child.kill('SIGTERM')
}

const emptyVisualState = {
  board_type: 'scene',
  board_id: 'empty',
  revision: 1,
  selected_visual_id: '',
  nodes: [],
  objects: [],
  tracks: [],
  async_projects: [],
  highlights: [],
  recent_feedback: ''
}

function buildMobileSmokeLanternWallProject(contributed = false) {
  return {
    id: 'lantern_wall',
    label: '共建花灯墙',
    summary: '写愿望、挂花灯，把村口旧墙点成节日纪念。',
    status: 'active',
    status_label: '建设中',
    progress: contributed ? 28 : 18,
    target_progress: 100,
    progress_percent: contributed ? 28 : 18,
    remaining_progress: contributed ? 72 : 82,
    completed_at: 0,
    completed_by: '',
    completed_by_display_name: '',
    progress_note: contributed ? '新愿望签已经挂上墙。' : '愿望签区等待社员补上第一批心愿。',
    completion_feedback: '',
    world_feedback: '',
    completion_rewards: [],
    can_contribute: true,
    my_contribution_count: contributed ? 1 : 0,
    contribution_packages: [
      {
        id: 'write_wish',
        label: '写愿望',
        kind: 'blessing',
        summary: '写一张愿望签，点亮花灯墙的第一段祝福。',
        progress_gain: 10,
        daily_limit: 1,
        weekly_limit: 3,
        costs: []
      }
    ],
    recent_contributions: contributed
      ? [{ id: 'mobile-smoke-lantern-wall-contribution', username: 'mobile_smoke_owner', display_name: '移动端烟测号', package_id: 'write_wish', package_label: '写愿望', progress_gain: 10, created_at: 3 }]
      : []
  }
}

function buildMobileSmokeLanternWallVisualProject(contributed = false) {
  return {
    id: 'lantern_wall',
    label: '共建花灯墙',
    kind: 'lantern_wall',
    day_tag: 'mobile-smoke-day',
    week_tag: 'mobile-smoke-week',
    starts_at: 0,
    ends_at: 0,
    current_stage_id: contributed ? 'lantern_wall_hang' : 'lantern_wall_wish',
    stages: [
      {
        id: 'lantern_wall_wish',
        label: '写愿望',
        state: contributed ? 'complete' : 'active',
        progress_value: contributed ? 100 : 18,
        progress_target: 100,
        object_ids: ['lantern_wall_wish_tags', 'lantern_wall_friend_messages'],
        contribution_options: contributed ? [] : [
          {
            id: 'write_wish',
            label: '写愿望',
            kind: 'blessing',
            available_action_id: 'write_wish',
            daily_limit: 1,
            weekly_limit: 3,
            resource_cost_preview: {},
            progress_delta: 10,
            reward_preview: '公共祝福 +10'
          }
        ],
        milestones: [{ id: 'wish_seed', label: '第一批愿望', progress_required: 30, reached: contributed }]
      },
      {
        id: 'lantern_wall_hang',
        label: '挂花灯',
        state: contributed ? 'active' : 'pending',
        progress_value: contributed ? 28 : 0,
        progress_target: 100,
        object_ids: ['lantern_wall_hanging'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'lantern_wall_repair',
        label: '修灯赠灯',
        state: 'pending',
        progress_value: 0,
        progress_target: 100,
        object_ids: ['lantern_wall_repair', 'lantern_wall_gift'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'lantern_wall_memorial',
        label: '祝福成墙',
        state: 'pending',
        progress_value: 0,
        progress_target: 100,
        object_ids: ['lantern_wall_memorial', 'lantern_wall_archive'],
        contribution_options: [],
        milestones: []
      }
    ],
    contributors: contributed ? [
      { username: 'mobile_smoke_owner', display_name: '移动端烟测号', contribution_value: 10, rank: 1 }
    ] : [],
    history: contributed ? [
      { id: 'mobile-smoke-lantern-wall-history', summary: '移动端烟测号写下一张愿望签。', created_at: 3 }
    ] : [],
    completion_room_template_id: '',
    completion_event_id: ''
  }
}

function buildMobileSmokeBridgeProject(contributed = false) {
  return {
    id: 'bridge',
    label: '修复溪桥',
    summary: '把雨季冲坏的溪桥修好，让村社往来恢复通行。',
    status: 'active',
    status_label: '建设中',
    progress: contributed ? 42 : 30,
    target_progress: 100,
    progress_percent: contributed ? 42 : 30,
    remaining_progress: contributed ? 58 : 70,
    completed_at: 0,
    completed_by: '',
    completed_by_display_name: '',
    progress_note: contributed ? '施工班刚补上一段桥面。' : '脚手架已经搭好，桥面等待施工行动。',
    completion_feedback: '',
    world_feedback: '',
    completion_rewards: [],
    can_contribute: true,
    my_contribution_count: contributed ? 1 : 0,
    contribution_packages: [
      {
        id: 'labor_shift',
        label: '施工行动',
        kind: 'labor',
        summary: '安排一段修桥工班，不消耗大宗材料。',
        progress_gain: 12,
        daily_limit: 1,
        weekly_limit: 3,
        costs: []
      }
    ],
    recent_contributions: contributed
      ? [{ id: 'mobile-smoke-bridge-contribution', username: 'mobile_smoke_owner', display_name: '移动端烟测号', package_id: 'labor_shift', package_label: '施工行动', progress_gain: 12, created_at: 4 }]
      : []
  }
}

function buildMobileSmokeBridgeVisualProject(contributed = false) {
  return {
    id: 'bridge',
    label: '修复溪桥',
    kind: 'village_bridge',
    day_tag: 'mobile-smoke-day',
    week_tag: 'mobile-smoke-week',
    starts_at: 0,
    ends_at: 0,
    current_stage_id: contributed ? 'bridge_deck' : 'bridge_scaffold',
    stages: [
      {
        id: 'bridge_scaffold',
        label: '搭脚手架',
        state: contributed ? 'complete' : 'active',
        progress_value: contributed ? 100 : 30,
        progress_target: 100,
        object_ids: ['bridge_scaffold', 'bridge_tools'],
        contribution_options: contributed ? [] : [
          {
            id: 'labor_shift',
            label: '施工行动',
            kind: 'labor',
            available_action_id: 'labor_shift',
            daily_limit: 1,
            weekly_limit: 3,
            resource_cost_preview: {},
            progress_delta: 12,
            reward_preview: '公共工程 +12'
          }
        ],
        milestones: [{ id: 'scaffold_ready', label: '脚手架就绪', progress_required: 35, reached: contributed }]
      },
      {
        id: 'bridge_deck',
        label: '铺桥面',
        state: contributed ? 'active' : 'pending',
        progress_value: contributed ? 42 : 0,
        progress_target: 100,
        object_ids: ['bridge_deck', 'bridge_planks'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'bridge_rail',
        label: '修栏杆',
        state: 'pending',
        progress_value: 0,
        progress_target: 100,
        object_ids: ['bridge_rail'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'bridge_open',
        label: '挂灯通行',
        state: 'pending',
        progress_value: 0,
        progress_target: 100,
        object_ids: ['bridge_lanterns', 'bridge_memorial'],
        contribution_options: [],
        milestones: []
      }
    ],
    contributors: contributed ? [
      { username: 'mobile_smoke_owner', display_name: '移动端烟测号', contribution_value: 12, rank: 1 }
    ] : [],
    history: contributed ? [
      { id: 'mobile-smoke-bridge-history', summary: '移动端烟测号补上一段修桥工班。', created_at: 4 }
    ] : [],
    completion_room_template_id: '',
    completion_event_id: ''
  }
}

function buildMobileSmokeFestivalSquareProject(contributed = false) {
  return {
    id: 'festival_square',
    label: '节庆筹备',
    summary: '把空广场一步步备成节会现场，先完成备料、搭场、彩排和开幕布置。',
    status: 'active',
    status_label: '建设中',
    progress: contributed ? 50 : 20,
    target_progress: 100,
    progress_percent: contributed ? 50 : 20,
    remaining_progress: contributed ? 50 : 80,
    completed_at: 0,
    completed_by: '',
    completed_by_display_name: '',
    progress_note: contributed ? '布景板已经搭起，广场有了节会轮廓。' : '空广场正在备料，等待社员搭出第一批布景。',
    completion_feedback: '',
    world_feedback: '',
    completion_rewards: [],
    completion_room_launch: {
      id: 'festival-square-room-launch',
      source_project_id: 'festival_square',
      source_event_id: '',
      template_id: 'lantern_fair',
      gameplay_template_id: 'festival_square_opening',
      title: '清溪节社节庆广场',
      label: '节庆广场开幕',
      summary: '用当前公共工程模板创建节会房间',
      status: 'available'
    },
    can_contribute: true,
    my_contribution_count: contributed ? 1 : 0,
    contribution_packages: [
      {
        id: 'festival_scenery',
        label: '布景搭设',
        kind: 'scenery',
        summary: '搭出戏台、布景板和临时围挡。',
        progress_gain: 30,
        daily_limit: 1,
        weekly_limit: 3,
        costs: []
      }
    ],
    recent_contributions: contributed
      ? [{ id: 'mobile-smoke-festival-square-contribution', username: 'mobile_smoke_owner', display_name: '移动端烟测号', package_id: 'festival_scenery', package_label: '布景搭设', progress_gain: 30, created_at: 5 }]
      : []
  }
}

function buildMobileSmokeFestivalSquareVisualProject(contributed = false) {
  return {
    id: 'festival_square',
    label: '节庆筹备',
    kind: 'festival_square',
    day_tag: 'mobile-smoke-day',
    week_tag: '节庆筹备周目标',
    starts_at: 0,
    ends_at: 0,
    current_stage_id: contributed ? 'festival_square_build' : 'festival_square_prepare',
    stages: [
      {
        id: 'festival_square_prepare',
        label: '备料',
        state: contributed ? 'complete' : 'active',
        progress_value: contributed ? 100 : 20,
        progress_target: 100,
        object_ids: ['festival_empty_square', 'festival_materials'],
        contribution_options: contributed ? [] : [
          {
            id: 'festival_scenery',
            label: '布景搭设',
            kind: 'scenery',
            available_action_id: 'festival_scenery',
            daily_limit: 1,
            weekly_limit: 3,
            resource_cost_preview: {},
            progress_delta: 30,
            reward_preview: '节庆广场 +30'
          }
        ],
        milestones: [{ id: 'festival_square_prepare_ready', label: '备料齐整', progress_required: 25, reached: contributed }]
      },
      {
        id: 'festival_square_build',
        label: '搭场',
        state: contributed ? 'active' : 'pending',
        progress_value: contributed ? 50 : 0,
        progress_target: 100,
        object_ids: ['festival_stage', 'festival_lantern_gate', 'festival_scene_panels'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'festival_square_rehearsal',
        label: '彩排',
        state: 'pending',
        progress_value: 0,
        progress_target: 100,
        object_ids: ['festival_program_board', 'festival_riddle_board'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'festival_square_opening',
        label: '开幕',
        state: 'pending',
        progress_value: 0,
        progress_target: 100,
        object_ids: ['festival_crowd', 'festival_photo_spot'],
        contribution_options: [],
        milestones: []
      }
    ],
    contributors: contributed ? [
      { username: 'mobile_smoke_owner', display_name: '移动端烟测号', contribution_value: 30, rank: 1 }
    ] : [],
    history: contributed ? [
      { id: 'mobile-smoke-festival-square-history', summary: '移动端烟测号搭起第一批节庆布景。', created_at: 5 }
    ] : [],
    completion_room_template_id: 'lantern_fair',
    completion_event_id: ''
  }
}

function buildMobileSmokePublicWarehouse(deposited = false, consumed = false) {
  const categories = [
    { id: 'grain', label: '粮食', count: deposited ? 1 : 0, points: deposited ? 10 : 0 },
    { id: 'herb', label: '药草', count: 0, points: 0 },
    { id: 'wood', label: '木材', count: 0, points: 0 },
    { id: 'cloth', label: '布料', count: 0, points: 0 },
    { id: 'fish', label: '鱼获', count: 0, points: 0 }
  ]

  return {
    funds: 120,
    items: deposited && !consumed ? [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }] : [],
    logs: deposited ? [
      {
        id: 'warehouse-mobile-rice-log',
        username: 'mobile_smoke_owner',
        display_name: '移动端烟测号',
        action: 'deposit',
        deposit_id: 'grain_rice',
        deposit_label: '稻米入仓',
        category_id: 'grain',
        category_label: '粮食',
        weekly_points: 10,
        context_id: 'warehouse-mobile',
        idempotency_key: 'warehouse-mobile-rice',
        entries: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }],
        created_at: 5
      }
    ].concat(consumed ? [
      {
        id: 'warehouse-mobile-cookpot-log',
        username: 'mobile_smoke_owner',
        display_name: '移动端烟测号',
        action: 'consume',
        deposit_id: 'laba_cookpot_base',
        deposit_label: '腊八共灶底料',
        category_id: 'grain',
        category_label: '粮食',
        weekly_points: 0,
        context_id: 'warehouse-mobile',
        idempotency_key: 'warehouse-mobile-cookpot',
        entries: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }],
        created_at: 6
      }
    ] : []) : [],
    deposit_options: [
      {
        id: 'grain_rice',
        label: '稻米入仓',
        summary: '把本周富余稻米交入村社仓廪，优先补粮食格。',
        category_id: 'grain',
        category_label: '粮食',
        weekly_points: 10,
        costs: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }]
      },
      {
        id: 'herb_mugwort',
        label: '艾草入仓',
        summary: '补入常备药草，周结算时提高灾后恢复余量。',
        category_id: 'herb',
        category_label: '药草',
        weekly_points: 8,
        costs: [{ item_id: 'mugwort', quantity: 2, label: '艾草 x2' }]
      },
      {
        id: 'wood_bundle',
        label: '木材入仓',
        summary: '补足修桥、修灯和临时棚架需要的木材。',
        category_id: 'wood',
        category_label: '木材',
        weekly_points: 8,
        costs: [{ item_id: 'wood', quantity: 3, label: '木材 x3' }]
      },
      {
        id: 'cloth_roll',
        label: '布料入仓',
        summary: '补入遮雨布和节会灯幔，服务公共活动消耗。',
        category_id: 'cloth',
        category_label: '布料',
        weekly_points: 8,
        costs: [{ item_id: 'cloth', quantity: 2, label: '布料 x2' }]
      },
      {
        id: 'fish_basket',
        label: '鱼获入仓',
        summary: '补入可快分的鱼获，供公共任务和救急餐使用。',
        category_id: 'fish',
        category_label: '鱼获',
        weekly_points: 8,
        costs: [{ item_id: 'fish', quantity: 2, label: '鱼获 x2' }]
      }
    ],
    consume_options: deposited && !consumed ? [
      {
        id: 'laba_cookpot_base',
        label: '腊八共灶底料',
        summary: '从公共仓取稻米开灶，只扣公共仓，不发个人奖励。',
        category_id: 'grain',
        category_label: '粮食',
        weekly_points: 0,
        costs: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }],
        asset_boundary: '只扣公共仓，不扣个人背包或个人铜钱。'
      }
    ] : [],
    weekly_settlement: {
      window_started_at: 0,
      window_ends_at: 7,
      status: deposited ? 'collecting' : 'empty',
      status_label: deposited ? '收集中' : '待入仓',
      total_points: deposited ? 10 : 0,
      contributor_count: deposited ? 1 : 0,
      covered_category_count: deposited ? 1 : 0,
      categories,
      effects: {
        disaster_response: {
          active: deposited,
          level: deposited ? 1 : 0,
          label: '灾害应对',
          summary: deposited ? '灾害应对预备 +1' : '等待粮食、药草等基础物资。'
        },
        festival_cost_discount: {
          active: false,
          percent: 0,
          label: '节会成本下降',
          summary: '五类物资齐备后降低公共节会成本。'
        },
        public_task_bonus: {
          active: false,
          level: 0,
          label: '公共任务加成',
          summary: '周结算达标后提升公共任务起步效率。'
        }
      }
    }
  }
}

function buildMobileSmokeSocietyOverview(contributed = false, projectKind = 'lantern_wall', warehouseState = {}) {
  const isBridge = projectKind === 'bridge'
  const isFestivalSquare = projectKind === 'festival_square'
  const isWarehouse = projectKind === 'warehouse'
  const publicProject = isBridge
    ? buildMobileSmokeBridgeProject(contributed)
    : isFestivalSquare
      ? buildMobileSmokeFestivalSquareProject(contributed)
      : buildMobileSmokeLanternWallProject(contributed)
  const visualProject = isBridge
    ? buildMobileSmokeBridgeVisualProject(contributed)
    : isFestivalSquare
      ? buildMobileSmokeFestivalSquareVisualProject(contributed)
      : buildMobileSmokeLanternWallVisualProject(contributed)
  return {
      ok: true,
    bulletin: '移动端村社 smoke',
    my_society: {
      id: 'mobile-smoke-society',
      name: isWarehouse ? '清溪仓社' : isBridge ? '清溪桥社' : isFestivalSquare ? '清溪节社' : '清溪灯社',
      summary: isWarehouse ? '移动端仓廪测试村社' : '移动端公共建设测试村社',
      notice: isWarehouse ? '本周先补齐村社仓廪。' : isBridge ? '本周先把溪桥修通。' : isFestivalSquare ? '本周把广场搭成节会现场。' : '本周先点亮花灯墙。',
      emblem: isBridge ? 'bridge_badge' : 'lantern_medallion',
      emblem_label: isBridge ? '桥章' : '灯章',
      theme: isBridge ? 'public_works' : 'festival_hosts',
      theme_label: isBridge ? '公共营造' : '节会主办',
      visibility: 'public',
      visibility_label: '公开',
      capacity: 24,
      member_count: 1,
      leader_username: 'mobile_smoke_owner',
      leader_display_name: '移动端烟测号',
      join_requirement_id: 'open',
      join_requirement_label: '来者皆可',
      join_requirement_summary: '公开申请',
      join_requirement_note: '',
      created_at: 0,
      updated_at: 0,
      level: 1,
      level_title: '初立社',
      welfare_xp: 20,
      welfare_total_xp: 20,
      welfare_xp_to_next_level: 80,
      my_role: 'president',
      my_role_label: '社长',
      can_apply: false,
      can_invite: false,
      can_review_requests: false,
      can_manage_roles: false,
      can_manage_notice: false,
      can_create_proposal: false,
      can_close_proposal: false,
      members: [
        { username: 'mobile_smoke_owner', display_name: '移动端烟测号', save_id: 123456789, save_slot: 1, role: 'president', role_label: '社长', joined_at: 0 }
      ],
      activity_log: [],
      active_proposals: [],
      proposal_history: [],
      public_projects: [publicProject],
      visual_state: {
        ...emptyVisualState,
        board_type: 'async',
        board_id: 'society_public_projects',
        selected_visual_id: publicProject.id,
        recent_feedback: contributed
          ? (isBridge
              ? '移动端烟测号补上一段修桥工班，桥面推进了一截。'
              : isFestivalSquare
                ? '移动端烟测号搭起第一批节庆布景，广场开始像节会现场。'
                : '移动端烟测号写下一张愿望签，花灯墙亮了一角。')
          : '',
        async_projects: [visualProject]
      },
      welfare_unlocks: [],
      exclusive_festival: { id: '', label: '', summary: '', unlocked: false },
      exclusive_decors: [],
      exclusive_tasks: [],
      chronicle: {
        founded_date_label: '今日',
        annual_summary: '移动端 smoke 村社史册。',
        role_history: [],
        public_projects: [],
        festival_participations: [],
        top_contributors: [],
        timeline: []
      },
      public_warehouse: isWarehouse ? buildMobileSmokePublicWarehouse(
        Boolean(warehouseState.deposited),
        Boolean(warehouseState.consumed)
      ) : {
        funds: 0,
        items: [],
        logs: [],
        deposit_options: [],
        consume_options: [],
        weekly_settlement: {
          total_points: 0,
          contributor_count: 0,
          covered_category_count: 0,
          categories: [],
          category_progress: [],
          effects: {
            disaster_response: { id: 'disaster_response', label: '灾害应对', summary: '暂无', active: false },
            festival_cost_discount: { id: 'festival_cost_discount', label: '节会成本下降', summary: '暂无', active: false },
            public_task_bonus: { id: 'public_task_bonus', label: '公共任务加成', summary: '暂无', active: false }
          },
          recent_logs: []
        }
      }
    },
    visible_societies: [],
    incoming_invites: [],
    my_pending_requests: [],
    managed_requests: [],
    visibility_options: [{ id: 'public', label: '公开', summary: '' }],
    theme_options: [{ id: 'festival_hosts', label: '节会主办', summary: '' }],
    emblem_options: [{ id: 'lantern_medallion', label: '灯章' }],
    capacity_options: [{ value: 24, label: '24 人' }],
    join_requirement_options: [{ id: 'open', label: '来者皆可', summary: '' }],
    role_options: [{ id: 'president', label: '社长' }],
    proposal_kind_options: [{ id: 'governance', label: '治理', summary: '' }],
    public_project_defs: [{ id: publicProject.id, label: publicProject.label, summary: '', target_progress: 100 }],
    public_project_package_options: publicProject.contribution_packages
  }
}

function buildMobileSmokeSocietyCreateOverview(created = false, payload = {}) {
  const overview = buildMobileSmokeSocietyOverview(false, 'lantern_wall')
  const publicSociety = {
    ...overview.my_society,
    id: 'mobile-smoke-public-society',
    name: '溪畔春社',
    summary: '面向春耕和节会互助的公开村社。',
    notice: '先熟悉公开名片，再申请加入。',
    member_count: 5,
    leader_username: 'spring_host',
    leader_display_name: '春社管事',
    my_role: '',
    my_role_label: '',
    can_apply: true,
    can_invite: false,
    can_review_requests: false,
    can_manage_roles: false,
    can_manage_notice: false,
    can_create_proposal: false,
    can_close_proposal: false,
    members: [],
    public_projects: [],
    visual_state: emptyVisualState,
  }
  const options = {
    visibility: overview.visibility_options.find(entry => entry.id === payload.visibility) || overview.visibility_options[0],
    theme: overview.theme_options.find(entry => entry.id === payload.theme) || overview.theme_options[0],
    emblem: overview.emblem_options.find(entry => entry.id === payload.emblem) || overview.emblem_options[0],
    capacity: overview.capacity_options.find(entry => entry.value === payload.capacity) || overview.capacity_options[0],
    join: overview.join_requirement_options.find(entry => entry.id === payload.join_requirement_id) || overview.join_requirement_options[0],
  }
  const createdSociety = {
    ...overview.my_society,
    id: 'mobile-smoke-created-society',
    name: payload.name || '移动端烟测村社',
    summary: payload.summary || '',
    notice: payload.notice || '',
    emblem: options.emblem?.id || 'lantern_medallion',
    emblem_label: options.emblem?.label || '灯章',
    theme: options.theme?.id || 'festival_hosts',
    theme_label: options.theme?.label || '节会主办',
    visibility: options.visibility?.id || 'public',
    visibility_label: options.visibility?.label || '公开',
    capacity: options.capacity?.value || 24,
    join_requirement_id: options.join?.id || 'open',
    join_requirement_label: options.join?.label || '来者皆可',
    join_requirement_summary: options.join?.summary || '公开申请',
    join_requirement_note: payload.join_requirement_note || '',
  }
  return {
    ...overview,
    bulletin: '移动端村社创建 smoke',
    my_society: created ? createdSociety : null,
    visible_societies: created ? [createdSociety, publicSociety] : [publicSociety],
    public_project_defs: [],
    public_project_package_options: [],
  }
}

function buildMobileSmokeSocietyProposal(overrides = {}) {
  const status = overrides.status || 'open'
  return {
    id: overrides.id || 'prop-mobile-schedule',
    title: overrides.title || '本周节会排班',
    summary: overrides.summary || '确认本周灯会值守和公共建设接力安排。',
    kind: overrides.kind || 'festival',
    kind_label: overrides.kindLabel || '节会',
    status,
    status_label: status === 'closed' ? '已归档' : '投票中',
    created_by: 'mobile_smoke_owner',
    created_by_display_name: '移动端烟测号',
    created_at: 5,
    updated_at: status === 'closed' ? 8 : 5,
    closed_at: status === 'closed' ? 8 : 0,
    vote_counts: overrides.voteCounts || { support: 3, reject: 1, abstain: 0 },
    total_vote_count: overrides.totalVoteCount || 4,
    my_vote_choice: overrides.myVoteChoice || 'support',
    can_vote: status === 'open',
    can_close: status === 'open',
    result_choice: status === 'closed' ? 'support' : 'pending',
    result_label: status === 'closed' ? '赞成通过' : '投票中',
    resolution_note: overrides.resolutionNote || '',
    choice_options: [
      { id: 'support', label: '赞成' },
      { id: 'reject', label: '反对' },
      { id: 'abstain', label: '暂缓' }
    ],
    votes: []
  }
}

function buildMobileSmokeSocietyManagementOverview(options = {}) {
  const overview = buildMobileSmokeSocietyOverview(false, 'lantern_wall')
  const requestHandled = Boolean(options.requestHandled)
  const invitedRecipient = options.invitedRecipient || ''
  const proposalCreated = Boolean(options.proposalCreated)
  const proposalArchived = Boolean(options.proposalArchived)
  const proposalArchiveNote = options.proposalArchiveNote || ''
  const createdProposalPayload = options.createdProposalPayload || {}
  const activeProposals = [
    ...(proposalArchived ? [] : [buildMobileSmokeSocietyProposal()]),
    ...(proposalCreated
      ? [buildMobileSmokeSocietyProposal({
          id: 'prop-mobile-created',
          title: createdProposalPayload.title || '移动端提案弹窗',
          summary: createdProposalPayload.summary || '移动端创建提案说明。',
          kind: createdProposalPayload.kind || 'governance',
          kindLabel: createdProposalPayload.kind === 'festival' ? '节会' : '治理',
          voteCounts: { support: 0, reject: 0, abstain: 0 },
          totalVoteCount: 0,
          myVoteChoice: ''
        })]
      : [])
  ]
  const proposalHistory = proposalArchived
    ? [buildMobileSmokeSocietyProposal({
        status: 'closed',
        resolutionNote: proposalArchiveNote || '按多数票执行，本周先试运行。'
      })]
    : []
  const applicant = {
    username: 'society_applicant',
    display_name: '申请人',
    save_id: 987654321,
    save_slot: 0,
    role: 'member',
    role_label: '成员',
    joined_at: 7,
  }
  const existingMember = {
    username: 'existing_member',
    display_name: '已在村社的成员',
    save_id: 222333444,
    save_slot: 1,
    role: 'member',
    role_label: '成员',
    joined_at: 2,
  }
  const request = {
    id: 'req-mobile-apply',
    society_id: overview.my_society.id,
    society_name: overview.my_society.name,
    username: applicant.username,
    display_name: applicant.display_name,
    target_save_id: applicant.save_id,
    target_save_slot: applicant.save_slot,
    invited_by: '',
    invited_by_display_name: '',
    type: 'apply',
    type_label: '加入申请',
    status: 'pending',
    created_at: 5,
    updated_at: 5,
  }
  const inviteRequest = invitedRecipient
    ? {
        id: 'req-mobile-invite',
        society_id: overview.my_society.id,
        society_name: overview.my_society.name,
        username: invitedRecipient,
        display_name: invitedRecipient,
        target_save_id: 0,
        target_save_slot: null,
        invited_by: 'mobile_smoke_owner',
        invited_by_display_name: '移动端烟测号',
        type: 'invite',
        type_label: '成员邀请',
        status: 'pending',
        created_at: 6,
        updated_at: 6,
      }
    : null

  return {
    ...overview,
    bulletin: '移动端村社管理 smoke',
    my_society: {
      ...overview.my_society,
      can_invite: true,
      can_review_requests: true,
      can_manage_roles: true,
      can_manage_notice: true,
      can_create_proposal: true,
      can_close_proposal: true,
      members: requestHandled
        ? [...overview.my_society.members, existingMember, applicant]
        : [...overview.my_society.members, existingMember],
      active_proposals: activeProposals,
      proposal_history: proposalHistory,
    },
    managed_requests: requestHandled ? [] : [request],
    incoming_invites: [],
    my_pending_requests: [],
    role_options: [
      { id: 'president', label: '社长' },
      { id: 'steward', label: '管事' },
      { id: 'member', label: '成员' },
    ],
    proposal_kind_options: [
      { id: 'governance', label: '治理', summary: '' },
      { id: 'festival', label: '节会', summary: '' },
    ],
    visible_societies: [],
    ...(inviteRequest ? { latest_invite_request: inviteRequest } : {}),
  }
}

function buildMobileSmokeRelayOrder(accepted = false) {
  const stages = [
    {
      id: 'stage_collect',
      title: '采收青菜',
      description: '先从田里备齐新鲜青菜。',
      preferred_order_type: 'material_help',
      target_item_id: 'cabbage',
      target_quantity: 6,
      reward_value: 80,
      reward_label: '铜钱',
      assignee_username: 'helper_done',
      assignee_display_name: '已完成的帮手',
      accepted_at: 1,
      canceled_at: 0,
      active_receipt_id: 'receipt-stage-collect',
      delivery_status: 'confirmed',
      delivery_note: '青菜已备齐。',
      delivered_items: [{ item_id: 'cabbage', quantity: 6 }],
      compensation_id: '',
      confirmed_at: 2,
      sequence: 1,
      updated_at: 2
    },
    {
      id: 'stage_process',
      title: '加工干菜',
      description: '把青菜晒成能远送的干菜。',
      preferred_order_type: 'festival_supply',
      target_item_id: 'dried_cabbage',
      target_quantity: 3,
      reward_value: 90,
      reward_label: '铜钱',
      assignee_username: accepted ? 'mobile_smoke_owner' : '',
      assignee_display_name: accepted ? '移动端烟测号' : '',
      accepted_at: accepted ? 3 : 0,
      canceled_at: 0,
      active_receipt_id: '',
      delivery_status: 'none',
      delivery_note: '',
      delivered_items: [],
      compensation_id: '',
      confirmed_at: 0,
      sequence: 2,
      updated_at: accepted ? 3 : 2
    },
    {
      id: 'stage_deliver',
      title: '送到灯会',
      description: '最后把干菜交给灯会备菜摊。',
      preferred_order_type: 'village_build',
      target_item_id: 'festival_crate',
      target_quantity: 1,
      reward_value: 90,
      reward_label: '铜钱',
      assignee_username: '',
      assignee_display_name: '',
      accepted_at: 0,
      canceled_at: 0,
      active_receipt_id: '',
      delivery_status: 'none',
      delivery_note: '',
      delivered_items: [],
      compensation_id: '',
      confirmed_at: 0,
      sequence: 3,
      updated_at: 2
    }
  ]

  const storyChapters = [
    {
      id: 'story-stage-collect',
      stage_id: 'stage_collect',
      sequence: 1,
      title: '采收青菜',
      role_label: '采集',
      state: 'confirmed',
      actor_display_name: '已完成的帮手',
      target_label: '青菜 6',
      summary: '第一段青菜已备齐。',
      detail: '青菜已交到接力篮中。',
      settlement_summary: '已确认 80 铜钱',
      receipt_id: 'receipt-stage-collect',
      happened_at: 2,
      next_hint: '等待加工干菜。'
    },
    {
      id: 'story-stage-process',
      stage_id: 'stage_process',
      sequence: 2,
      title: '加工干菜',
      role_label: '加工',
      state: accepted ? 'accepted' : 'pending',
      actor_display_name: accepted ? '移动端烟测号' : '',
      target_label: '干菜 3',
      summary: accepted ? '移动端烟测号接下加工段。' : '加工段等待接力。',
      detail: accepted ? '干菜正在晒制。' : '需要下一位玩家接下加工。',
      settlement_summary: accepted ? '待交付 90 铜钱' : '未接单',
      receipt_id: '',
      happened_at: accepted ? 3 : 0,
      next_hint: accepted ? '加工完成后提交交付。' : '点击路线按钮接下加工段。'
    },
    {
      id: 'story-stage-deliver',
      stage_id: 'stage_deliver',
      sequence: 3,
      title: '送到灯会',
      role_label: '交付',
      state: 'pending',
      actor_display_name: '',
      target_label: '灯会备菜摊',
      summary: '最后一段等待前置完成。',
      detail: '送达后由发布者确认。',
      settlement_summary: '待分配 90 铜钱',
      receipt_id: '',
      happened_at: 0,
      next_hint: '加工段完成后开放。'
    }
  ]

  return {
    id: 'relay-order-mobile-smoke',
    owner_username: 'publisher',
    owner_display_name: '灯会摊主',
    title: '灯会干菜接力单',
    description: '采收、加工、交付分段推进，适合多人异步接力。',
    order_type: 'festival_supply',
    collaboration_mode: 'multi_stage',
    scope: 'public',
    target_save_id: 0,
    target_save_slot: null,
    target_username: '',
    target_display_name: '',
    deadline_at: 1893427200,
    reward_type: 'money',
    reward_value: 260,
    reward_label: '铜钱回报',
    status: 'open',
    assignee_username: '',
    assignee_display_name: '',
    accepted_at: 0,
    canceled_at: 0,
    active_receipt_id: '',
    delivery_status: 'none',
    delivery_note: '',
    delivered_items: [],
    settlement_confirmed_at: 0,
    compensation_id: '',
    priority_score: 12,
    priority_reasons: ['接力路线可视化', '节庆备货'],
    stages,
    visual_state: {
      ...emptyVisualState,
      board_type: 'async',
      board_id: 'coop_order_relay_route',
      selected_visual_id: 'relay_route',
      recent_feedback: accepted ? '移动端烟测号已接下加工干菜这一段。' : '采收段已确认，等待下一位接力。',
      async_projects: [
        {
          id: 'relay_route',
          label: '灯会干菜接力路线',
          kind: 'order_relay',
          day_tag: 'mobile-smoke-day',
          week_tag: 'mobile-smoke-week',
          starts_at: 0,
          ends_at: 1893427200,
          current_stage_id: accepted ? 'stage_deliver' : 'stage_process',
          stages: [
            {
              id: 'stage_collect',
              label: '采收青菜',
              state: 'complete',
              progress_value: 100,
              progress_target: 100,
              object_ids: ['order_confirmed_stage_collect'],
              contribution_options: [],
              milestones: [{ id: 'collect_done', label: '青菜已备齐', progress_required: 100, reached: true }]
            },
            {
              id: 'stage_process',
              label: '加工干菜',
              state: accepted ? 'pending' : 'active',
              progress_value: accepted ? 20 : 0,
              progress_target: 100,
              object_ids: ['order_waiting_stage_process', 'order_task_drying'],
              contribution_options: accepted ? [] : [
                {
                  id: 'accept_stage:stage_process',
                  label: '接加工段',
                  kind: 'relay_accept',
                  available_action_id: 'accept_stage',
                  daily_limit: 1,
                  weekly_limit: 3,
                  resource_cost_preview: {},
                  progress_delta: 20,
                  reward_preview: '接下加工段'
                }
              ],
              milestones: []
            },
            {
              id: 'stage_deliver',
              label: '送到灯会',
              state: accepted ? 'active' : 'pending',
              progress_value: 0,
              progress_target: 100,
              object_ids: ['order_waiting_stage_deliver'],
              contribution_options: [],
              milestones: []
            }
          ],
          contributors: accepted
            ? [{ username: 'mobile_smoke_owner', display_name: '移动端烟测号', contribution_value: 20, rank: 1 }]
            : [],
          history: accepted
            ? [{ id: 'relay-history-accepted', summary: '移动端烟测号接下加工干菜这一段。', created_at: 3 }]
            : [{ id: 'relay-history-collect', summary: '已完成采收青菜，路线推进到加工段。', created_at: 2 }],
          completion_room_template_id: '',
          completion_event_id: ''
        }
      ],
      story_flow: {
        id: 'relay-order-mobile-smoke-flow',
        title: '灯会干菜订单流转',
        summary: '采收、加工、交付三段接力会保留角色、状态和凭证摘要。',
        current_chapter_id: accepted ? 'story-stage-process' : 'story-stage-process',
        chapters: storyChapters,
        timeline: accepted
          ? [{ id: 'story-timeline-accepted', type: 'contribution', summary: '移动端烟测号接下加工干菜这一段。', created_at: 3 }]
          : [{ id: 'story-timeline-collect', type: 'stage_complete', summary: '采收青菜已确认，订单流转到加工段。', created_at: 2 }]
      },
      highlights: [],
      recent_feedback: accepted ? '移动端烟测号已接下加工干菜这一段。' : '采收段已确认，等待下一位接力。'
    },
    relay_settlement_summary: {
      reward_type: 'money',
      pool_reward_value: 260,
      confirmed_reward_value: 80,
      pending_reward_value: 180,
      compensation_pending_reward_value: 0,
      status: 'settling',
      shares: [
        { stage_id: 'stage_collect', stage_title: '采收青菜', sequence: 1, share_percent: 31, reward_value: 80, reward_label: '铜钱', assignee_username: 'helper_done', assignee_display_name: '已完成的帮手', delivery_status: 'confirmed', settlement_status: 'confirmed', settlement_receipt_id: 'receipt-stage-collect', reward_route: 'personal', cohabitation_contract_id: '', shared_fund_ledger_id: '', confirmed_at: 2 },
        { stage_id: 'stage_process', stage_title: '加工干菜', sequence: 2, share_percent: 35, reward_value: 90, reward_label: '铜钱', assignee_username: accepted ? 'mobile_smoke_owner' : '', assignee_display_name: accepted ? '移动端烟测号' : '', delivery_status: 'none', settlement_status: accepted ? 'pending' : 'pending', settlement_receipt_id: '', reward_route: accepted ? 'shared_fund' : 'personal', cohabitation_contract_id: accepted ? 'contract-mobile-family' : '', shared_fund_ledger_id: '', confirmed_at: 0 },
        { stage_id: 'stage_deliver', stage_title: '送到灯会', sequence: 3, share_percent: 34, reward_value: 90, reward_label: '铜钱', assignee_username: '', assignee_display_name: '', delivery_status: 'none', settlement_status: 'pending', settlement_receipt_id: '', reward_route: 'personal', cohabitation_contract_id: '', shared_fund_ledger_id: '', confirmed_at: 0 }
      ]
    },
    created_at: 1,
    updated_at: accepted ? 3 : 2
  }
}

function buildMobileSmokePublishedOrder(title = '移动端烟测求助单') {
  return {
    id: 'mobile-smoke-published-order',
    owner_username: 'mobile_smoke_owner',
    owner_display_name: '移动端烟测号',
    title,
    description: '移动端向导发布的求助单。',
    order_type: 'material_help',
    collaboration_mode: 'single',
    scope: 'public',
    target_save_id: 0,
    target_save_slot: null,
    target_username: '',
    target_display_name: '',
    deadline_at: 1893427200,
    reward_type: 'money',
    reward_value: 180,
    reward_label: '铜钱回报',
    status: 'open',
    assignee_username: '',
    assignee_display_name: '',
    accepted_at: 0,
    canceled_at: 0,
    active_receipt_id: '',
    delivery_status: 'none',
    delivery_note: '',
    delivered_items: [],
    settlement_confirmed_at: 0,
    compensation_id: '',
    priority_score: 0,
    priority_reasons: [],
    stages: [],
    visual_state: emptyVisualState,
    relay_settlement_summary: null,
    created_at: 4,
    updated_at: 4
  }
}

function buildMobileSmokeAcceptedOrder(delivered = false) {
  return {
    id: 'mobile-smoke-accepted-order',
    owner_username: 'mobile_smoke_publisher',
    owner_display_name: '移动端委托主',
    title: '移动端待交付求助单',
    description: '用于验证交付前的确认弹窗。',
    order_type: 'material_help',
    collaboration_mode: 'single',
    scope: 'public',
    target_save_id: 0,
    target_save_slot: null,
    target_username: '',
    target_display_name: '',
    deadline_at: 1893427200,
    reward_type: 'money',
    reward_value: 120,
    reward_label: '铜钱回报',
    status: 'open',
    assignee_username: 'mobile_smoke_owner',
    assignee_display_name: '移动端烟测号',
    accepted_at: 3,
    canceled_at: 0,
    active_receipt_id: delivered ? 'mobile-smoke-delivery-receipt' : '',
    delivery_status: delivered ? 'submitted' : 'none',
    delivery_note: delivered ? '交付确认弹窗烟测说明。' : '',
    delivered_items: delivered ? [{ item_id: 'smoke_wheat', quantity: 2 }] : [],
    settlement_confirmed_at: 0,
    compensation_id: '',
    priority_score: 0,
    priority_reasons: [],
    stages: [],
    visual_state: emptyVisualState,
    relay_settlement_summary: null,
    created_at: 3,
    updated_at: delivered ? 5 : 3
  }
}

function buildMobileSmokeCoopOrderOverview(accepted = false, publishedTitle = '', acceptedOrderDelivered = false) {
  const orders = [buildMobileSmokeRelayOrder(accepted), buildMobileSmokeAcceptedOrder(acceptedOrderDelivered)]
  if (publishedTitle) {
    orders.unshift(buildMobileSmokePublishedOrder(publishedTitle))
  }
  return {
    ok: true,
    orders,
    receipts: [],
    compensations: [],
    board_summary: {
      total_orders: orders.length,
      open_orders: orders.filter(order => order.status === 'open').length,
      relay_orders: 1,
      open_relay_orders: 1
    },
    society_order_board: {
      public_orders: 1,
      open_public_orders: 1,
      public_relay_orders: 1,
      open_public_relay_orders: 1,
      reward_pool_value: 260,
      confirmed_reward_value: 80,
      pending_reward_value: 180,
      compensation_pending_reward_value: 0,
      compensation_count: 0,
      settlement_status_counts: { planned: 0, settling: 1, settled: 0, compensation_pending: 0 },
      recent_receipts: [
        {
          receipt_id: 'receipt-stage-collect',
          order_id: 'relay-order-mobile-smoke',
          order_title: '灯会干菜接力单',
          stage_id: 'stage_collect',
          stage_title: '采收青菜',
          assignee_display_name: '已完成的帮手',
          reward_type: 'money',
          reward_value: 80,
          reward_label: '铜钱',
          reward_route: 'personal',
          status: 'confirmed',
          relay_story_chapter_id: 'story-stage-collect',
          relay_story_chapter_title: '采收青菜',
          relay_story_summary: '第一段青菜已备齐。',
          relay_story_detail: '青菜已交到接力篮中。',
          relay_story_settlement_summary: '已确认 80 铜钱',
          confirmed_at: 2,
          updated_at: 2
        }
      ]
    },
    reputation_summary: {
      total: 0,
      by_order_type: {},
      completed_count: 0,
      updated_at: 0,
      trust_level: { id: 'new', label: '初识互助' },
      specialty_ranks: [],
      top_helped_targets: [],
      top_helpers: []
    },
    order_type_options: ['material_help', 'festival_supply', 'village_build'],
    scope_options: ['public', 'friends', 'neighbors'],
    reward_type_options: ['money', 'reputation', 'gift']
  }
}

function buildMobileSmokeWorldEventOverview() {
  return {
    ok: true,
    bulletin: '移动端节会 smoke',
    current_season: 'spring',
    current_season_label: '春季',
    current_cycle_key: 'mobile-smoke',
    current_event: null,
    events: [],
    world_events: [],
    current_world_events: [],
    public_goal: {
      label: '节会移动端目标',
      summary: '用于移动端房间向导 smoke 的公共目标。',
      progress_value: 0,
      target_progress: 100,
      progress_percent: 0,
      progress_text: '0/100',
      phase_reward_label: '',
      milestones: [],
      division_awards: []
    },
    recent_annals: [],
    recent_chronicles: [],
    total_contribution_points: 0,
    my_records: [],
    seasonal_badges: []
  }
}

function buildMobileSmokeFestivalGameplay() {
  return {
    template_id: 'assembly',
    template_label: '灯会共建',
    template_kind: 'scene',
    template_summary: '共同布置灯会现场。',
    objective_label: '布置现场',
    progress_value: 5,
    progress_target: 8,
    progress_percent: 62,
    progress_text: '5/8',
    score_label: '热闹值',
    score_value: 5,
    phase: 'active',
    phase_label: '进行中',
    last_action_id: '',
    last_action_summary: '移动端 smoke 房间等待房主处理。',
    last_actor_username: '',
    last_actor_display_name: '',
    is_completed: false,
    completed_at: 0,
    contributions: [],
    festival_state: null,
    available_actions: []
  }
}

function buildMobileSmokeFestivalRoomSnapshot() {
  return {
    id: 'mobile-smoke-festival-room',
    title: '移动端节会房',
    template_id: 'lantern_fair',
    template_label: '上元灯会',
    template_summary: '灯会共建和愿望签协作。',
    gameplay_template_id: 'assembly',
    host_username: 'mobile_smoke_owner',
    host_display_name: '移动端烟测号',
    state: 'running',
    state_label: '进行中',
    state_reason: '',
    member_limit: 4,
    countdown_seconds: 30,
    reconnect_window_seconds: 180,
    created_at: 1,
    updated_at: 2,
    ready_check_started_at: 0,
    countdown_started_at: 0,
    countdown_ends_at: 0,
    running_started_at: 2,
    settled_at: 0,
    closed_at: 0,
    aborted_at: 0,
    settlement_version: 0,
    members: [
      {
        username: 'mobile_smoke_owner',
        display_name: '移动端烟测号',
        role: 'host',
        status: 'active',
        status_label: '房主进行中',
        invited_at: 0,
        joined_at: 1,
        ready_at: 2,
        disconnected_at: 0,
        reconnected_at: 0,
        left_at: 0,
        active_receipt_id: ''
      },
      {
        username: 'mobile_smoke_friend',
        display_name: '协作好友',
        role: 'member',
        status: 'active',
        status_label: '参与中',
        invited_at: 1,
        joined_at: 1,
        ready_at: 2,
        disconnected_at: 0,
        reconnected_at: 0,
        left_at: 0,
        active_receipt_id: ''
      }
    ],
    invitations: [],
    recent_events: [],
    action_log: [],
    settlement_receipts: [],
    visual_state: emptyVisualState,
    gameplay: buildMobileSmokeFestivalGameplay(),
    opening_ceremony: null,
    joined_member_count: 2,
    ready_member_count: 2,
    my_member_status: 'active',
    invitation_id: '',
    can_join: false,
    can_leave: false,
    can_ready: false,
    can_unready: false,
    can_disconnect: false,
    can_reconnect: false,
    can_host_ready_check: false,
    can_host_start_countdown: false,
    can_host_settle: true,
    can_host_close: true
  }
}

function buildMobileSmokeFestivalInviteActionResponse(targetUsername = 'mobile_smoke_guest') {
  const room = buildMobileSmokeFestivalRoomSnapshot()
  const targetDisplayName = targetUsername === 'lantern_guest'
    ? '灯会新友'
    : targetUsername === 'wish_helper'
      ? '愿望协作员'
      : targetUsername
  room.members = [
    ...room.members,
    {
      username: targetUsername,
      display_name: targetDisplayName,
      role: 'member',
      status: 'invited',
      status_label: '已邀请',
      invited_at: 3,
      joined_at: 0,
      ready_at: 0,
      disconnected_at: 0,
      reconnected_at: 0,
      left_at: 0,
      active_receipt_id: ''
    }
  ]
  room.invitations = [{
    id: `mobile-smoke-invite-${targetUsername}`,
    room_id: room.id,
    target_username: targetUsername,
    target_display_name: targetDisplayName,
    status: 'pending',
    status_label: '待处理',
    invited_at: 3,
    responded_at: 0
  }]
  return {
    ok: true,
    room,
    overview: {
      ...buildMobileSmokeFestivalRoomOverview('host-running'),
      my_room: room
    },
    msg: '邀请已发送，等待对方加入。'
  }
}

function buildMobileSmokeFestivalRoomOverview(roomState = 'empty') {
  const myRoom = roomState === 'host-running' ? buildMobileSmokeFestivalRoomSnapshot() : null
  return {
    ok: true,
    bulletin: '移动端节会房 smoke',
    templates: [
      {
        id: 'dragon_boat',
        label: '端午赛舟',
        summary: '2 人演练，4-8 人扩展多队竞速。',
        default_member_limit: 4,
        min_member_limit: 2,
        max_member_limit: 8,
        opening_title: '',
        recommended_gameplay_template_ids: ['squad_coop']
      },
      {
        id: 'lantern_fair',
        label: '上元灯会',
        summary: '灯会共建和愿望签协作。',
        default_member_limit: 4,
        min_member_limit: 2,
        max_member_limit: 4,
        opening_title: '',
        recommended_gameplay_template_ids: ['assembly']
      }
    ],
    gameplay_templates: [
      {
        id: 'squad_coop',
        label: '龙舟协作',
        kind: 'track',
        summary: '一起推进赛舟进度。',
        objective_label: '推进现场',
        score_label: '协作值',
        default_target: 8,
        recommended_room_template_ids: ['dragon_boat'],
        action_options: []
      },
      {
        id: 'assembly',
        label: '灯会共建',
        kind: 'scene',
        summary: '共同布置灯会现场。',
        objective_label: '布置现场',
        score_label: '热闹值',
        default_target: 8,
        recommended_room_template_ids: ['lantern_fair'],
        action_options: []
      }
    ],
    my_room: myRoom,
    invited_rooms: [],
    visible_rooms: [],
    recent_memorials: [],
    recent_receipts: []
  }
}

const mobileSmokeCohabitationContractId = 'mobile-smoke-cohabitation-contract'

function buildMobileSmokeCohabitationMember({
  username,
  displayName,
  role = 'member',
  manorRole = 'farm_steward',
  manorRoleLabel = '农务',
  seatIndex = 1,
  festivalRole = 'lantern_helper'
}) {
  return {
    username,
    username_key: username,
    display_name: displayName,
    role,
    status: 'accepted',
    manor_role: manorRole,
    manor_role_label: manorRoleLabel,
    save_id: seatIndex === 1 ? 123456789 : 234567890,
    save_slot: seatIndex - 1,
    accepted_at: 1_769_011_200_000,
    last_active_at: 1_769_011_200_000,
    last_action: '正在准备家族节会席位',
    seat_id: `seat-${seatIndex}`,
    seat_index: seatIndex,
    seat_label: seatIndex === 1 ? '主灯席' : '协作席',
    festival_role: festivalRole,
    seat_summary: seatIndex === 1 ? '负责确认结算与共同基金入账。' : '负责供品复核与灯会协作。',
    seat_state: 'ready',
    seat_permissions: {
      can_prepare_supplies_preview: true,
      can_open_festival_room: true,
      can_settle_rewards: true
    }
  }
}

const mobileSmokeCohabitationMembers = [
  buildMobileSmokeCohabitationMember({
    username: 'mobile_smoke_owner',
    displayName: '移动端烟测号',
    role: 'owner',
    manorRole: 'family_head',
    manorRoleLabel: '家主',
    seatIndex: 1,
    festivalRole: 'host'
  }),
  buildMobileSmokeCohabitationMember({
    username: 'mobile_smoke_partner',
    displayName: '节会协作者',
    manorRole: 'storage_keeper',
    manorRoleLabel: '管仓',
    seatIndex: 2,
    festivalRole: 'supply_keeper'
  })
]

function buildMobileSmokeCohabitationContract() {
  return {
    id: mobileSmokeCohabitationContractId,
    type: 'oath_manor',
    type_label: '家族共同庄园',
    title: '移动端家族节会庄园',
    status: 'active',
    shared_manor_id: 'mobile-smoke-shared-manor',
    members: mobileSmokeCohabitationMembers,
    shared_fund: {
      balance: 1680,
      ledger: []
    },
    shared_warehouse: {
      items: [],
      ledger: []
    },
    audit_log: [],
    separation_previews: [],
    shared_map: null,
    created_at: 1_768_579_200_000,
    updated_at: 1_769_011_200_000,
    activated_at: 1_768_579_200_000
  }
}

function buildMobileSmokeCohabitationOverview() {
  return {
    ok: true,
    relation_options: [
      {
        id: 'oath_manor',
        label: '家族共同庄园',
        title: '家族共同庄园',
        min_members: 2,
        max_members: 4,
        romance_only: false
      }
    ],
    contracts: [buildMobileSmokeCohabitationContract()],
    summary: {
      total: 1,
      pending: 0,
      active: 1,
      separation_previews: 0
    }
  }
}

function buildMobileSmokeCohabitationFamilyFestivalPanel() {
  return {
    contract_id: mobileSmokeCohabitationContractId,
    shared_manor_id: 'mobile-smoke-shared-manor',
    type: 'oath_manor',
    type_label: '家族共同庄园',
    status: 'active',
    readonly: false,
    write_enabled: true,
    writes_enabled: true,
    festival_seats_enabled: true,
    seat_reservation_enabled: true,
    festival_room_binding_enabled: true,
    generated_at: 1_769_011_200_000,
    revision: 3,
    summary: {
      member_count: 2,
      max_members: 4,
      preview_seat_count: 2,
      available_template_count: 1,
      festival_room_create_enabled: true,
      festival_room_invite_enabled: true,
      settlement_enabled: true,
      reward_enabled: true,
      reputation_award_enabled: true,
      shared_fund_spend_enabled: false,
      shared_warehouse_consume_enabled: true,
      festival_ticket_spend_enabled: false,
      personal_money_merged: false,
      personal_inventory_merged: false,
      disabled_reason: ''
    },
    actor: mobileSmokeCohabitationMembers[0],
    members: mobileSmokeCohabitationMembers,
    candidate_templates: [
      {
        id: 'lantern_family_fair',
        label: '家族上元灯会',
        visual_type: 'lantern_scene',
        member_limit: 4,
        family_compatible: true,
        available: true,
        binding_enabled: true,
        room_create_enabled: true,
        reward_enabled: true,
        unlock_source: 'family_oath',
        recommended_roles: ['family_head', 'storage_keeper'],
        summary: '适合家族成员共同锁席、开房、供品和奖励结算。',
        disabled_reason: ''
      }
    ],
    reservations: {},
    ledger: [],
    active_template_id: 'lantern_family_fair',
    active_room_id: 'mobile-smoke-family-festival-room',
    last_settlement_id: 'mobile-smoke-family-festival-settlement',
    visual_state_preview: {
      board_type: 'scene',
      board_id: 'family-festival-mobile-smoke',
      revision: 3,
      selected_visual_id: 'lantern_family_fair',
      recent_feedback: '家族节会席位已经预排完成，等待结算确认。',
      scene: null,
      scene_objects: [
        {
          id: 'main-lantern-table',
          label: '主灯席',
          kind: 'seat',
          state: 'ready',
          x: 36,
          y: 42,
          linked_template_ids: ['lantern_family_fair'],
          linked_role_ids: ['family_head'],
          seat_count: 1,
          available_action_ids: ['settle_rewards']
        },
        {
          id: 'supply-table',
          label: '供品案',
          kind: 'supplies',
          state: 'ready',
          x: 68,
          y: 54,
          linked_template_ids: ['lantern_family_fair'],
          linked_role_ids: ['storage_keeper'],
          seat_count: 1,
          available_action_ids: ['consume_supplies']
        }
      ],
      seats: mobileSmokeCohabitationMembers.map(member => ({
        seat_id: member.seat_id,
        seat_index: member.seat_index,
        seat_label: member.seat_label,
        username: member.username,
        display_name: member.display_name,
        manor_role: member.manor_role,
        manor_role_label: member.manor_role_label,
        festival_role: member.festival_role,
        state: member.seat_state
      }))
    },
    governance: {
      server_authoritative: true,
      seat_reservation_requires_idempotency: true,
      disconnect_recovery_required: true
    },
    settlement: {
      festival_receipt_required: true,
      reward_to_shared_fund_enabled: true,
      compensation_replay_required: true
    },
    recommended_flow: ['reserve', 'create-room', 'consume-supplies', 'settle-rewards'],
    deferred_operations: ['offline_replay', 'compensation_replay']
  }
}

function buildMobileSmokeCohabitationDetailResponse(pathname = '') {
  const response = {
    ok: true,
    contract: buildMobileSmokeCohabitationContract()
  }
  if (pathname.endsWith('/family-festival-seats') || pathname.includes('/family-festival-seats/')) {
    response.family_festival_seats_panel = buildMobileSmokeCohabitationFamilyFestivalPanel()
  }
  if (pathname.endsWith('/fund') || pathname.includes('/family-festival-seats/settle')) {
    response.fund = {
      contract_id: mobileSmokeCohabitationContractId,
      shared_manor_id: 'mobile-smoke-shared-manor',
      balance: 1680,
      ledger: [],
      summary: {
        balance: 1680,
        ledger_count: 0,
        medium_spend_enabled: false,
        large_spend_enabled: false
      },
      permissions: {}
    }
  }
  if (pathname.endsWith('/warehouse') || pathname.includes('/family-festival-seats/consume-supplies')) {
    response.warehouse = {
      contract_id: mobileSmokeCohabitationContractId,
      shared_manor_id: 'mobile-smoke-shared-manor',
      items: [],
      ledger: [],
      summary: {
        item_count: 0,
        ledger_count: 0,
        high_value_withdrawal_confirmation_enabled: false
      },
      permissions: {}
    }
  }
  return response
}

function buildMobileSmokeExpeditionGameplay() {
  return {
    template_id: 'expedition_cavern',
    template_label: '协作矿洞',
    template_kind: 'map',
    template_summary: '一起探索矿洞路线。',
    objective_label: '探索进度',
    progress_value: 3,
    progress_target: 8,
    progress_percent: 38,
    progress_text: '3/8',
    score_label: '补给值',
    score_value: 3,
    phase: 'active',
    phase_label: '进行中',
    last_action_id: '',
    last_action_summary: '移动端远征队伍已进入矿洞路线。',
    last_actor_username: 'mobile_smoke_owner',
    last_actor_display_name: '移动端烟测号',
    is_completed: false,
    completed_at: 0,
    contributions: [],
    available_actions: [],
    cavern_state: null,
    festival_state: null
  }
}

function buildMobileSmokeExpeditionRoomSnapshot() {
  return {
    id: 'mobile-smoke-expedition-room',
    title: '移动端远征大厅',
    template_id: 'expedition_outpost',
    template_label: '协作远征',
    template_summary: '组队出发前的移动端占位数据。',
    gameplay_template_id: 'expedition_cavern',
    host_username: 'mobile_smoke_owner',
    host_display_name: '移动端烟测号',
    state: 'running',
    state_label: '进行中',
    state_reason: '',
    member_limit: 4,
    countdown_seconds: 0,
    reconnect_window_seconds: 180,
    created_at: 1,
    updated_at: 2,
    ready_check_started_at: 0,
    countdown_started_at: 0,
    countdown_ends_at: 0,
    running_started_at: 2,
    settled_at: 0,
    closed_at: 0,
    aborted_at: 0,
    settlement_version: 0,
    members: [
      {
        username: 'mobile_smoke_owner',
        display_name: '移动端烟测号',
        role: 'host',
        status: 'active',
        status_label: '房主进行中',
        invited_at: 0,
        joined_at: 1,
        ready_at: 2,
        disconnected_at: 0,
        reconnected_at: 0,
        left_at: 0,
        active_receipt_id: ''
      },
      {
        username: 'mobile_smoke_friend',
        display_name: '协作好友',
        role: 'member',
        status: 'active',
        status_label: '参与中',
        invited_at: 1,
        joined_at: 1,
        ready_at: 2,
        disconnected_at: 0,
        reconnected_at: 0,
        left_at: 0,
        active_receipt_id: ''
      }
    ],
    invitations: [],
    recent_events: [],
    action_log: [],
    settlement_receipts: [],
    visual_state: {
      ...emptyVisualState,
      board_type: 'map',
      board_id: 'mobile-smoke-cavern-map',
      revision: 2,
      recent_feedback: '队伍已经确认远征路线。'
    },
    gameplay: buildMobileSmokeExpeditionGameplay(),
    joined_member_count: 2,
    ready_member_count: 2,
    my_member_status: 'active',
    invitation_id: '',
    can_join: false,
    can_leave: false,
    can_ready: false,
    can_unready: false,
    can_disconnect: false,
    can_reconnect: false,
    can_host_ready_check: false,
    can_host_start_countdown: false,
    can_host_settle: true,
    can_host_close: true
  }
}

function buildMobileSmokeExpeditionInviteActionResponse(targetUsername = 'mobile_smoke_guest') {
  const room = buildMobileSmokeExpeditionRoomSnapshot()
  const targetDisplayName = targetUsername === 'cavern_guest'
    ? '矿洞新友'
    : targetUsername === 'route_helper'
      ? '路线协作者'
      : targetUsername
  room.members = [
    ...room.members,
    {
      username: targetUsername,
      display_name: targetDisplayName,
      role: 'member',
      status: 'invited',
      status_label: '已邀请',
      invited_at: 3,
      joined_at: 0,
      ready_at: 0,
      disconnected_at: 0,
      reconnected_at: 0,
      left_at: 0,
      active_receipt_id: ''
    }
  ]
  room.invitations = [{
    id: `mobile-smoke-expedition-invite-${targetUsername}`,
    room_id: room.id,
    target_username: targetUsername,
    target_display_name: targetDisplayName,
    status: 'pending',
    status_label: '待处理',
    invited_at: 3,
    responded_at: 0
  }]
  return {
    ok: true,
    room,
    overview: {
      ...buildMobileSmokeExpeditionRoomOverview('host-running'),
      my_room: room
    },
    msg: '邀请已发送，等待对方加入。'
  }
}

function buildMobileSmokeExpeditionRoomOverview(roomState = 'empty') {
  const myRoom = roomState === 'host-running' ? buildMobileSmokeExpeditionRoomSnapshot() : null
  return {
    ok: true,
    bulletin: '移动端远征房 smoke',
    templates: [
      {
        id: 'expedition_outpost',
        label: '协作远征',
        summary: '组队出发前的移动端占位数据。',
        default_member_limit: 4,
        min_member_limit: 2,
        max_member_limit: 4,
        opening_title: '',
        recommended_gameplay_template_ids: ['expedition_cavern']
      }
    ],
    gameplay_templates: [
      {
        id: 'expedition_cavern',
        label: '协作矿洞',
        kind: 'map',
        summary: '一起探索矿洞路线。',
        objective_label: '探索进度',
        score_label: '补给值',
        default_target: 8,
        recommended_room_template_ids: ['expedition_outpost'],
        action_options: []
      }
    ],
    my_room: myRoom,
    invited_rooms: [],
    visible_rooms: [],
    recent_receipts: []
  }
}

const mobileSmokeCareRoomActions = {
  room_irrigate: {
    role_id: 'irrigation',
    role_label: '灌溉手',
    object_id: 'manor_field',
    object_label: '田地',
    expected_order: 1,
    health_delta: 15,
    risk_delta: 8,
    summary: '先稳住田区水分，为后续护理留出安全窗口。'
  },
  room_feed: {
    role_id: 'feeding',
    role_label: '喂食手',
    object_id: 'manor_animal_shed',
    object_label: '畜棚',
    expected_order: 2,
    health_delta: 14,
    risk_delta: 7,
    summary: '补足动物饲喂，降低护理窗口内的躁动风险。'
  },
  room_pest_control: {
    role_id: 'pest_control',
    role_label: '除虫手',
    object_id: 'manor_field',
    object_label: '田地',
    expected_order: 3,
    health_delta: 10,
    risk_delta: 9,
    summary: '集中处理虫害，把田区风险压到可控范围。'
  },
  room_tidy: {
    role_id: 'tidy',
    role_label: '收拾手',
    object_id: 'manor_fruit_grove',
    object_label: '果树',
    expected_order: 4,
    health_delta: 9,
    risk_delta: 6,
    summary: '收拾掉落物与边角产物，完成护理收尾。'
  }
}

function buildMobileSmokeCareRoomAction(actionId, actualOrder) {
  const action = mobileSmokeCareRoomActions[actionId] || mobileSmokeCareRoomActions.room_irrigate
  const actor = actionId === 'room_feed'
    ? { username: 'mobile_smoke_friend', display_name: '协作好友' }
    : { username: 'mobile_smoke_owner', display_name: '移动端烟测号' }
  return {
    id: `mobile-smoke-${actionId}`,
    action_id: actionId,
    action_label: actionId === 'room_irrigate' ? '协作灌溉' : actionId === 'room_feed' ? '协作喂食' : actionId,
    role_id: action.role_id,
    role_label: action.role_label,
    object_id: action.object_id,
    object_label: action.object_label,
    actor_username: actor.username,
    actor_display_name: actor.display_name,
    expected_order: action.expected_order,
    actual_order: actualOrder,
    order_risk: action.expected_order !== actualOrder,
    role_matched: true,
    risk_delta: action.expected_order !== actualOrder ? action.risk_delta : 0,
    health_delta: action.health_delta,
    idempotency_key: `mobile-smoke-care-room:${actionId}`,
    summary: `${actor.display_name} 完成「${actionId === 'room_irrigate' ? '协作灌溉' : '协作喂食'}」：${action.summary}`,
    created_at: 3 + actualOrder
  }
}

function buildMobileSmokeCareRoom(actionIds = [], completed = false) {
  const actions = actionIds.map((actionId, index) => buildMobileSmokeCareRoomAction(actionId, index + 1))
  const remainingActionIds = ['room_irrigate', 'room_feed', 'room_pest_control', 'room_tidy']
    .filter(actionId => !actionIds.includes(actionId))
  const healthScore = actions.reduce((sum, action) => sum + action.health_delta, 0)
  const riskScore = actions.reduce((sum, action) => sum + action.risk_delta, 0)
  return {
    id: 'mobile-smoke-care-room',
    target_username: 'orchard_owner',
    target_save_id: 987654321,
    target_save_slot: 0,
    creator_username: 'mobile_smoke_owner',
    creator_display_name: '移动端烟测号',
    member_limit: 2,
    day_tag: 'mobile-smoke-day',
    idempotency_key: 'mobile-smoke-care-room-create',
    status: completed ? 'completed' : 'in_progress',
    window_started_at: 1,
    window_ends_at: 1893427200,
    participants: [
      { username: 'mobile_smoke_owner', display_name: '移动端烟测号', role_id: 'irrigation', role_label: '灌溉手', joined_at: 1 },
      { username: 'mobile_smoke_friend', display_name: '协作好友', role_id: 'feeding', role_label: '喂食手', joined_at: 2 }
    ],
    actions,
    risk_score: riskScore,
    health_score: completed ? Math.max(0, 70 + healthScore - riskScore) : healthScore,
    health_delta: completed ? healthScore - riskScore : 0,
    settlement_receipt_id: completed ? 'mobile-smoke-care-room-settlement' : '',
    settled_by: completed ? 'mobile_smoke_owner' : '',
    settled_at: completed ? 6 : 0,
    summary: completed
      ? '护理房间已结算：健康度提升，协作窗口和分工记录已写入凭证。'
      : actions.length > 0
        ? actions[actions.length - 1].summary
        : '护理房间已建立，等待成员分工处理。',
    created_at: 1,
    updated_at: completed ? 6 : 3 + actions.length,
    viewer_is_member: true,
    remaining_seconds: completed ? 0 : 1800,
    available_action_ids: completed ? [] : remainingActionIds.slice(0, actions.length >= 1 ? 1 : 2),
    can_join: false,
    can_act: !completed && actions.length < 4,
    can_settle: !completed && actions.length >= 2
  }
}

function buildMobileSmokeManorSnapshot(careRoomStep = 'empty', manorMode = 'care-room', lightHarvested = false) {
  const ownerIdentityMode = manorMode === 'owner-identity'
  const limitedStealMode = manorMode === 'limited-steal'
  const activeRoom = careRoomStep === 'empty' ? null : buildMobileSmokeCareRoom(
    careRoomStep === 'created'
      ? []
      : careRoomStep === 'irrigated'
        ? ['room_irrigate']
        : ['room_irrigate', 'room_feed'],
    false
  )
  const completedRoom = careRoomStep === 'settled' ? buildMobileSmokeCareRoom(['room_irrigate', 'room_feed'], true) : null
  const activeRooms = activeRoom ? [activeRoom] : []
  const recentRecords = completedRoom ? [completedRoom] : []
  const actionLabels = {
    room_irrigate: '协作灌溉',
    room_feed: '协作喂食',
    room_pest_control: '协作除虫',
    room_tidy: '协作收拾'
  }
  const ownerGuestbookEntries = ownerIdentityMode ? [{
    id: 'mobile-smoke-owner-guestbook-1',
    target_username: 'mobile_smoke_owner',
    target_save_id: 1,
    target_save_slot: null,
    author_username: 'visitor_green',
    author_display_name: '青禾访客',
    kind: 'blessing',
    content: '果林护理得很周到，春日看起来更亮了。',
    reply_text: '',
    reply_author_display_name: '',
    pinned: false,
    created_at: 3,
    updated_at: 3
  }] : []
  const ownerCareEntries = ownerIdentityMode ? [{
    id: 'mobile-smoke-owner-care-1',
    target_username: 'mobile_smoke_owner',
    target_save_id: 1,
    target_save_slot: null,
    visitor_username: 'visitor_green',
    visitor_display_name: '青禾访客',
    action_id: 'water_field',
    action_label: '帮忙浇水',
    object_id: 'manor_field',
    object_label: '田地',
    day_tag: 'mobile-smoke-day',
    idempotency_key: 'mobile-smoke-owner-care',
    owner_benefit: '作物获得今日灌溉保护',
    visitor_reward: '友情点 +1',
    summary: '青禾访客帮田地浇了水。',
    created_at: 4
  }] : []
  const stealEntries = limitedStealMode && lightHarvested ? [{
    id: 'mobile-smoke-steal-entry',
    target_username: 'orchard_owner',
    target_save_id: 1,
    target_save_slot: null,
    visitor_username: 'mobile_smoke_owner',
    visitor_display_name: '移动端烟测号',
    action_id: 'light_harvest',
    action_label: '轻采果实',
    object_id: 'mobile_smoke_apple_tree',
    object_label: '雨后苹果树',
    target_id: 'mobile_smoke_apple_tree',
    target_label: '雨后苹果树',
    item_id: 'apple',
    item_label: '普通苹果',
    quantity: 1,
    use_tags: ['food', 'order', 'festival'],
    use_summary: '可用于料理、订单与节会备料。',
    day_tag: 'mobile-smoke-day',
    idempotency_key: 'mobile-smoke-steal',
    owner_compensation: '主人保留 100% 库存并收到轻采凭证',
    visitor_reward: '普通苹果 x1',
    visitor_reward_quantity: 1,
    reward_daily_cap: 2,
    owner_reserved_ratio: 1,
    settlement_receipt_id: 'mobile-smoke-steal-receipt',
    note: '轻采后给主人留了感谢。',
    summary: '移动端烟测号轻采了雨后苹果树，主人库存保持完整。',
    created_at: 5
  }] : []
  const visitorActivityEntries = [
    ...ownerCareEntries.map(entry => ({
      id: 'mobile-smoke-owner-activity-care',
      source_id: entry.id,
      kind: 'care',
      kind_label: '好友照料',
      visitor_username: entry.visitor_username,
      visitor_display_name: entry.visitor_display_name,
      object_label: entry.object_label,
      action_label: entry.action_label,
      title: '好友帮忙照料田地',
      summary: entry.summary,
      audit_note: '照料记录可用于主人回看最近护理。',
      created_at: entry.created_at
    })),
    ...stealEntries.map(entry => ({
      id: 'mobile-smoke-visitor-activity-steal',
      source_id: entry.id,
      kind: 'steal',
      kind_label: '轻采记录',
      visitor_username: entry.visitor_username,
      visitor_display_name: entry.visitor_display_name,
      object_label: entry.object_label,
      action_label: entry.action_label,
      title: '访客轻采普通果实',
      summary: entry.summary,
      audit_note: '轻采凭证已写入，可用于主人补偿和争议回看。',
      created_at: entry.created_at
    }))
  ]
  return {
    username: ownerIdentityMode ? 'mobile_smoke_owner' : 'orchard_owner',
    display_name: ownerIdentityMode ? '移动端烟测号' : '远山果匠',
    visibility: 'public',
    viewer_is_owner: ownerIdentityMode,
    manor_name: ownerIdentityMode ? '移动端烟测庄园' : '远山果园',
    avatar_image_url: '',
    avatar_image_alt: '',
    cover_image_url: '',
    cover_image_alt: '',
    public_title: ownerIdentityMode ? '春日庄园主人' : '果林庄园主',
    showcase_theme: '雨后果林护理日',
    season_progress: '春 2 年',
    current_focus: '协作护理田地和畜棚',
    weekly_goal: '完成一次 2 人护理房',
    visual_summary: '田地、畜棚和果树开放护理',
    placed_decoration_count: 0,
    public_tags: [],
    guestbook_entries: ownerGuestbookEntries,
    visit_entries: [],
    visitor_activity_entries: visitorActivityEntries,
    guide_points: [],
    guide_routes: [],
    today_visit_summary: ownerIdentityMode ? '今日 1 次留言，1 次照料' : '今日 1 次护理协作',
    is_favorited_by_viewer: false,
    is_followed_by_viewer: false,
    access_policy: {
      visit_mode: 'public',
      care_mode: 'public',
      steal_mode: limitedStealMode ? 'mutual' : 'closed',
      updated_at: 1,
      options: [
        { id: 'public', label: '公开' },
        { id: 'friends', label: '好友' },
        { id: 'mutual', label: '互关' },
        { id: 'closed', label: '关闭' }
      ]
    },
    relation_context: {
      viewer_is_owner: ownerIdentityMode,
      viewer_is_friend: true,
      viewer_is_mutual: true,
      viewer_follows_owner: true,
      owner_follows_viewer: true,
      mutual_follow: true,
      can_visit: true,
      can_care: true,
      can_steal: limitedStealMode
    },
    visual_state: {
      ...emptyVisualState,
      board_type: 'scene',
      board_id: 'manor_care_scene',
      selected_visual_id: 'manor_field',
      recent_feedback: lightHarvested
        ? '移动端烟测号轻采了雨后苹果树，主人库存保持完整。'
        : careRoomStep === 'settled'
          ? '协作护理房已结算，健康度凭证已写入。'
          : '',
      objects: [
        {
          id: 'manor_field',
          label: '田地',
          kind: 'field',
          x: 24,
          y: 58,
          state: 'needs_action',
          available_action_ids: ['water_field', 'cure_pests'],
          progress_value: 1,
          progress_target: 3,
          handled_by: '',
          handled_at: 0,
          requires_cooperation: true,
          cooperation_required_count: 2,
          cooperation_current_count: activeRoom ? activeRoom.participants.length : 0
        },
        {
          id: 'manor_animal_shed',
          label: '畜棚',
          kind: 'animal_shed',
          x: 67,
          y: 53,
          state: 'needs_action',
          available_action_ids: ['feed_animals'],
          progress_value: 0,
          progress_target: 2,
          handled_by: '',
          handled_at: 0,
          requires_cooperation: true,
          cooperation_required_count: 2,
          cooperation_current_count: activeRoom ? activeRoom.participants.length : 0
        },
        ...(limitedStealMode ? [{
          id: 'mobile_smoke_apple_tree',
          label: '雨后苹果树',
          kind: 'fruit_tree',
          x: 78,
          y: 36,
          state: lightHarvested ? 'complete' : 'needs_action',
          available_action_ids: lightHarvested ? [] : ['light_harvest'],
          progress_value: lightHarvested ? 1 : 0,
          progress_target: 1,
          handled_by: lightHarvested ? 'mobile_smoke_owner' : '',
          handled_at: lightHarvested ? 5 : 0,
          requires_cooperation: false,
          cooperation_required_count: 1,
          cooperation_current_count: lightHarvested ? 1 : 0
        }] : [])
      ]
    },
    care_state: {
      day_tag: 'mobile-smoke-day',
      action_labels: { water_field: '帮忙浇水', cure_pests: '帮忙除虫', feed_animals: '帮忙喂食' },
      scene_action_labels: { water_field: '帮忙浇水', cure_pests: '帮忙除虫', feed_animals: '帮忙喂食' },
      action_effects: {
        water_field: { owner_benefit: '作物获得今日灌溉保护', visitor_reward: '友情点 +1' },
        feed_animals: { owner_benefit: '动物获得今日饱食保护', visitor_reward: '伴手草料 +1' }
      },
      limits: { visitor_daily_limit: 4, manor_daily_limit: 12 },
      visitor_daily_count: 0,
      manor_daily_count: 0,
      remaining_care_count: 4,
      manor_remaining_care_count: 12,
      can_care: true,
      audit: {
        visitor_limit_enforced: true,
        manor_limit_enforced: true,
        object_limit_enforced: true,
        whitelist_enforced: true,
        recent_window_seconds: 600,
        recent_window_count: 0,
        risk_flags: [],
        daily_visitor_counts: [],
        dispute_log_available: true,
        reward_cap_summary: '照料奖励由服务端凭证控制。',
        settlement_summary: '照料不直接改主人库存。'
      },
      care_denied_reason: ''
    },
    steal_state: {
      day_tag: 'mobile-smoke-day',
      action_labels: limitedStealMode ? { light_harvest: '轻采果实' } : {},
      action_effects: limitedStealMode ? {
        light_harvest: { owner_compensation: '主人保留 100% 库存并收到轻采凭证', visitor_reward: '普通苹果 x1' }
      } : {},
      limits: { visitor_daily_limit: 2, manor_daily_limit: 6, object_daily_limit: 1 },
      visitor_daily_count: lightHarvested ? 1 : 0,
      manor_daily_count: lightHarvested ? 1 : 0,
      remaining_steal_count: limitedStealMode ? (lightHarvested ? 1 : 2) : 0,
      manor_remaining_steal_count: limitedStealMode ? (lightHarvested ? 5 : 6) : 0,
      can_steal: limitedStealMode,
      steal_denied_reason: limitedStealMode ? '' : '轻采已关闭。',
      audit: {
        visitor_limit_enforced: true,
        manor_limit_enforced: true,
        object_limit_enforced: true,
        whitelist_enforced: true,
        recent_window_seconds: 600,
        recent_window_count: lightHarvested ? 1 : 0,
        risk_flags: [],
        daily_visitor_counts: limitedStealMode ? [{
          visitor_username: 'mobile_smoke_owner',
          visitor_display_name: '移动端烟测号',
          count: lightHarvested ? 1 : 0,
          limit: 2
        }] : [],
        dispute_log_available: true,
        owner_reserved_percent: 100,
        visitor_reward_quantity_cap: 1,
        reward_cap_summary: limitedStealMode ? '轻采由凭证记录，普通果实单次最多 1 件。' : '轻采当前关闭。',
        settlement_summary: '主人库存保留 100%。'
      },
      whitelist_summary: limitedStealMode ? '只允许普通成熟果实和边角产物，稀有物与活动核心物排除。' : '轻采关闭',
      target_use_hints: limitedStealMode ? {
        mobile_smoke_apple_tree: {
          item_id: 'apple',
          label: '普通苹果',
          use_tags: ['food', 'order', 'festival'],
          use_summary: '可用于料理、订单与节会备料。'
        }
      } : {}
    },
    care_entries: ownerCareEntries,
    steal_entries: stealEntries,
    care_room_state: {
      viewer_username: 'mobile_smoke_owner',
      day_tag: 'mobile-smoke-day',
      limits: { min_members: 2, max_members: 4, window_seconds: 1800 },
      action_labels: actionLabels,
      role_labels: {
        irrigation: '灌溉手',
        feeding: '喂食手',
        pest_control: '除虫手',
        tidy: '收拾手'
      },
      action_effects: mobileSmokeCareRoomActions,
      can_create_room: careRoomStep === 'empty',
      create_denied_reason: careRoomStep === 'empty' ? '' : '已有进行中的护理房间。',
      active_rooms: activeRooms,
      recent_records: recentRecords,
      record_summary: careRoomStep === 'settled' ? '最近 1 条护理房结算记录。' : '护理房可创建、分工和结算。'
    },
    care_room_records: recentRecords,
    theme_week: {
      season: 'spring',
      week_tag: 'mobile-smoke-week',
      active_theme: '雨后果林护理日',
      active_theme_source: 'showcase',
      score: 12,
      recommendations: [],
      official_pick: null,
      seasonal_options: ['春耕小院'],
      template_id: 'showcase',
      cover_image_url: '',
      cover_image_alt: '',
      template_options: [{ id: 'showcase', label: '展示类布局', summary: '突出当前主题。' }]
    }
  }
}

async function createPage(browser, viewport, options = {}) {
  const mockSocial = Boolean(options.mockSocial)
  const mockSociety = Boolean(options.mockSociety)
  const mockSocietyProject = options.mockSocietyProject || 'lantern_wall'
  const mockSocietyMode = options.mockSocietyMode || 'member'
  const mockOrders = Boolean(options.mockOrders)
  const mockManor = Boolean(options.mockManor)
  const mockManorMode = options.mockManorMode || 'care-room'
  const mockFestivalRoom = Boolean(options.mockFestivalRoom)
  const mockFestivalRoomState = options.mockFestivalRoomState || 'empty'
  const mockExpeditionRoom = Boolean(options.mockExpeditionRoom)
  const mockExpeditionRoomState = options.mockExpeditionRoomState || 'empty'
  const mockCohabitation = Boolean(options.mockCohabitation)
  const context = await browser.newContext({
    viewport,
    locale: 'zh-CN',
    reducedMotion: 'reduce'
  })
  if (mockSociety || mockOrders || mockManor || mockFestivalRoom || mockExpeditionRoom || mockCohabitation) {
    await context.addInitScript(() => {
      window.localStorage.setItem('taoyuanxiang_current_account', 'mobile_smoke_owner')
    })
  }
  const page = await context.newPage()
  await page.route(new RegExp(`^${escapeRegExp(baseURL)}(?:/|/index\\.html)?(?:\\?.*)?$`), fulfillFromNodeFetch)

  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSocial || mockSociety || mockOrders || mockManor || mockFestivalRoom || mockExpeditionRoom || mockCohabitation
        ? {
            ok: true,
            user: {
              username: 'mobile_smoke_owner',
              display_name: '移动端烟测号'
            },
            csrf_token: 'mobile-smoke-csrf'
          }
        : { ok: false, user: null })
    })
  })

  await page.route('**/api/public-config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    })
  })

  await page.route('**/api/taoyuan/ai/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    })
  })

  await page.route('**/api/taoyuan/announcements/**', async route => {
    const requestUrl = route.request().url()
    const isAnnouncementList = requestUrl.includes('/active') || requestUrl.includes('/history')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isAnnouncementList ? { ok: true, announcements: [] } : { ok: true })
    })
  })

  await page.route('**/api/taoyuan/logs/gameplay/batch', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    })
  })

  await page.route('**/api/taoyuan/mail/list', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, mails: [], unread_count: 0 })
    })
  })

  await page.route('**/api/taoyuan/mail/inbox-status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        unread_count: 0,
        pinned_count: 0,
        important_count: 0,
        newest_unread: null,
        newest_important: null
      })
    })
  })

  if (mockFestivalRoom || mockExpeditionRoom) {
    await page.route('**/api/taoyuan/online/world-events', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeWorldEventOverview())
      })
    })

  }

  if (mockFestivalRoom) {
    await page.route('**/api/taoyuan/online/festival/rooms', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeFestivalRoomOverview(mockFestivalRoomState))
      })
    })

    await page.route('**/api/taoyuan/online/festival/rooms/*/invite', async route => {
      const payload = route.request().postDataJSON()
      const targetUsername = typeof payload?.target_username === 'string' && payload.target_username.trim()
        ? payload.target_username.trim()
        : 'mobile_smoke_guest'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeFestivalInviteActionResponse(targetUsername))
      })
    })

    await page.route('**/api/taoyuan/online/expedition/rooms', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeExpeditionRoomOverview())
      })
    })
  }

  if (mockExpeditionRoom) {
    await page.route('**/api/taoyuan/online/expedition/rooms', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeExpeditionRoomOverview(mockExpeditionRoomState))
      })
    })

    await page.route('**/api/taoyuan/online/expedition/rooms/*/invite', async route => {
      const payload = route.request().postDataJSON()
      const targetUsername = typeof payload?.target_username === 'string' && payload.target_username.trim()
        ? payload.target_username.trim()
        : 'mobile_smoke_guest'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeExpeditionInviteActionResponse(targetUsername))
      })
    })
  }

  if (mockCohabitation) {
    await page.route('**/api/taoyuan/online/cohabitation/contracts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeCohabitationOverview())
      })
    })

    await page.route(/\/api\/taoyuan\/online\/cohabitation\/contracts\/[^/]+(?:\/.*)?$/, async route => {
      const requestUrl = new URL(route.request().url())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeCohabitationDetailResponse(requestUrl.pathname))
      })
    })
  }

  if (mockSocial) {
    await page.route('**/api/taoyuan/online/social/relationships', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRelationshipOverview)
      })
    })

    await page.route(/\/api\/taoyuan\/online\/social\/player-search(?:\?|$)/, async route => {
      const requestUrl = new URL(route.request().url())
      const saveId = Number(requestUrl.searchParams.get('save_id') ?? 0)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          save_identity: {
            save_id: saveId || 987654321,
            account_username: 'orchard',
            save_slot: 2,
            nickname_snapshot: '远山果匠',
            created_at: 1_768_579_200_000,
            updated_at: 1_769_011_200_000
          },
          profile: mockSocialProfiles.searched
        })
      })
    })
  }

  if (mockSociety) {
    let societyContributed = false
    let societyCreated = false
    let createdSocietyPayload = {}
    let societyInviteRecipient = ''
    let societyRequestHandled = false
    let societyProposalCreated = false
    let societyProposalPayload = {}
    let societyProposalArchived = false
    let societyProposalArchiveNote = ''
    let societyWarehouseDeposited = false
    let societyWarehouseConsumed = false
    const buildManagementOverview = () => buildMobileSmokeSocietyManagementOverview({
      invitedRecipient: societyInviteRecipient,
      requestHandled: societyRequestHandled,
      proposalCreated: societyProposalCreated,
      createdProposalPayload: societyProposalPayload,
      proposalArchived: societyProposalArchived,
      proposalArchiveNote: societyProposalArchiveNote
    })
    await page.route('**/api/taoyuan/online/societies', async route => {
      if (mockSocietyMode === 'create' && route.request().method() === 'POST') {
        createdSocietyPayload = route.request().postDataJSON()
        societyCreated = true
        const overview = buildMobileSmokeSocietyCreateOverview(societyCreated, createdSocietyPayload)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, society: overview.my_society, overview })
        })
        return
      }
      const body = mockSocietyMode === 'create'
        ? buildMobileSmokeSocietyCreateOverview(societyCreated, createdSocietyPayload)
        : mockSocietyMode === 'management'
          ? buildManagementOverview()
        : buildMobileSmokeSocietyOverview(societyContributed, mockSocietyProject, {
            deposited: societyWarehouseDeposited,
            consumed: societyWarehouseConsumed
          })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      })
    })
    await page.route('**/api/taoyuan/online/societies/invite', async route => {
      const payload = route.request().postDataJSON()
      societyInviteRecipient = payload.target_username || String(payload.target_save_id || '')
      const overview = buildManagementOverview()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, request: overview.latest_invite_request, overview })
      })
    })
    await page.route('**/api/taoyuan/online/societies/proposals', async route => {
      societyProposalPayload = route.request().postDataJSON()
      societyProposalCreated = true
      const overview = buildManagementOverview()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, proposal: overview.my_society.active_proposals.find(entry => entry.id === 'prop-mobile-created'), overview })
      })
    })
    await page.route('**/api/taoyuan/online/societies/proposals/*/close', async route => {
      const payload = route.request().postDataJSON()
      societyProposalArchived = true
      societyProposalArchiveNote = payload.resolution_note || ''
      const overview = buildManagementOverview()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, proposal: overview.my_society.proposal_history[0], overview })
      })
    })
    await page.route('**/api/taoyuan/online/societies/requests/*/accept', async route => {
      societyRequestHandled = true
      const overview = buildManagementOverview()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, request: { id: 'req-mobile-apply', status: 'accepted' }, overview })
      })
    })
    await page.route('**/api/taoyuan/online/societies/requests/*/reject', async route => {
      societyRequestHandled = true
      const overview = buildManagementOverview()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, request: { id: 'req-mobile-apply', status: 'rejected' }, overview })
      })
    })
    await page.route('**/api/taoyuan/online/societies/public-projects/*/contribute', async route => {
      societyContributed = true
      const overview = buildMobileSmokeSocietyOverview(societyContributed, mockSocietyProject, {
        deposited: societyWarehouseDeposited,
        consumed: societyWarehouseConsumed
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          project: overview.my_society.public_projects[0],
          society: overview.my_society,
          overview,
          player_money: 999
        })
      })
    })
    await page.route('**/api/taoyuan/online/societies/public-warehouse/deposit', async route => {
      societyWarehouseDeposited = true
      const overview = buildMobileSmokeSocietyOverview(societyContributed, mockSocietyProject, {
        deposited: societyWarehouseDeposited,
        consumed: societyWarehouseConsumed
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warehouse: overview.my_society.public_warehouse,
          society: overview.my_society,
          overview,
          player_money: 999
        })
      })
    })
    await page.route('**/api/taoyuan/online/societies/public-warehouse/consume', async route => {
      societyWarehouseConsumed = true
      const overview = buildMobileSmokeSocietyOverview(societyContributed, mockSocietyProject, {
        deposited: societyWarehouseDeposited,
        consumed: societyWarehouseConsumed
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warehouse: overview.my_society.public_warehouse,
          society: overview.my_society,
          overview,
          player_money: 999
        })
      })
    })
  }

  if (mockOrders) {
    let orderAccepted = false
    let publishedOrderTitle = ''
    let acceptedOrderDelivered = false
    await page.route('**/api/taoyuan/online/orders', async route => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON()
        publishedOrderTitle = typeof payload?.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : '移动端烟测求助单'
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, order: buildMobileSmokePublishedOrder(publishedOrderTitle) })
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeCoopOrderOverview(orderAccepted, publishedOrderTitle, acceptedOrderDelivered))
      })
    })
    await page.route('**/api/taoyuan/online/orders/mobile-smoke-accepted-order/deliver', async route => {
      acceptedOrderDelivered = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, order: buildMobileSmokeAcceptedOrder(true) })
      })
    })
    await page.route('**/api/taoyuan/online/orders/*/stages/*/accept', async route => {
      orderAccepted = true
      const order = buildMobileSmokeRelayOrder(true)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, order, stage: order.stages[1] })
      })
    })
  }

  if (mockManor) {
    let careRoomStep = 'empty'
    let lightHarvested = false
    await page.route('**/api/taoyuan/online/manor/favorites/overview', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, favorites: [], same_theme_favorites: [], hot_manors: [] })
      })
    })
    await page.route('**/api/taoyuan/online/manor', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, snapshot: buildMobileSmokeManorSnapshot(careRoomStep, mockManorMode, lightHarvested) })
      })
    })
    await page.route('**/api/taoyuan/online/manor/steal', async route => {
      lightHarvested = true
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep, mockManorMode, lightHarvested)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, entry: snapshot.steal_entries[0], snapshot, idempotent: false })
      })
    })
    await page.route('**/api/taoyuan/online/manor/care-rooms', async route => {
      careRoomStep = 'created'
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep, mockManorMode, lightHarvested)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, room: snapshot.care_room_state.active_rooms[0], snapshot, idempotent: false })
      })
    })
    await page.route('**/api/taoyuan/online/manor/care-rooms/*/action', async route => {
      const body = route.request().postDataJSON()
      careRoomStep = body?.action_id === 'room_feed' ? 'fed' : 'irrigated'
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep, mockManorMode, lightHarvested)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          action: snapshot.care_room_state.active_rooms[0]?.actions.at(-1),
          room: snapshot.care_room_state.active_rooms[0],
          snapshot,
          idempotent: false
        })
      })
    })
    await page.route('**/api/taoyuan/online/manor/care-rooms/*/settle', async route => {
      careRoomStep = 'settled'
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep, mockManorMode, lightHarvested)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, room: snapshot.care_room_records[0], snapshot, idempotent: false })
      })
    })
  }

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })
  page.on('requestfailed', request => {
    requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown failure'}`)
  })

  return { context, page }
}

async function openHome(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(baseURL, { waitUntil: 'commit', timeout: homeNavigationTimeoutMs })
      break
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForTimeout(500)
    }
  }
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible({ timeout: homeReadyTimeoutMs })
  await expect(page.getByRole('button', { name: '新的旅程' })).toBeVisible({ timeout: homeReadyTimeoutMs })
}

async function loadBuiltInSample(page, id) {
  const sampleApiReady = await page.waitForFunction(() => typeof window.__TAOYUAN_SAMPLE_SAVES__?.load === 'function', null, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false)
  if (!sampleApiReady) {
    if (!sampleFallbackScenarios.has(scenarioFilter)) {
      throw new Error('Built-in sample save API is unavailable; run against the dev server for full mobile smoke coverage.')
    }
    await startSmokeJourney(page)
    return
  }
  const loaded = await page.evaluate(async targetId => {
    const api = window.__TAOYUAN_SAMPLE_SAVES__
    return api ? await api.load(targetId) : false
  }, id)
  if (!loaded) throw new Error(`Unable to load sample save ${id}`)
}

async function startSmokeJourney(page) {
  if (await page.getByTestId('game-layout').isVisible().catch(() => false)) return
  await page.getByTestId('new-journey-button').click()
  await page.getByTestId('privacy-agree-button').click()
  await page.getByTestId('char-name-input').fill('移动端烟测')
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 15_000 })
}

async function openSamplePage(page, hash) {
  await openHome(page)
  await loadBuiltInSample(page, sampleId)
  await page.goto(`${baseURL}${hash}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('game-layout')).toBeVisible()
}

async function clearTransientOverlays(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('.qmsg, .qmsg-item-wrapper, .qmsg-content, [class*="qmsg-"]')
      .forEach(node => node.remove())
  })
}

async function captureScenario({
  browser,
  label,
  hash,
  viewport,
  primarySelector,
  mockSocial = false,
  mockSociety = false,
  mockSocietyProject = 'lantern_wall',
  mockSocietyMode = 'member',
  mockOrders = false,
  mockManor = false,
  mockManorMode = 'care-room',
  mockFestivalRoom = false,
  mockFestivalRoomState = 'empty',
  mockExpeditionRoom = false,
  mockExpeditionRoomState = 'empty',
  mockCohabitation = false,
  prepare,
  assertPage
}) {
  if (scenarioFilter && !label.includes(scenarioFilter)) return
  const { context, page } = await createPage(browser, viewport, { mockSocial, mockSociety, mockSocietyProject, mockSocietyMode, mockOrders, mockManor, mockManorMode, mockFestivalRoom, mockFestivalRoomState, mockExpeditionRoom, mockExpeditionRoomState, mockCohabitation })
  try {
    await openSamplePage(page, hash)
    if (prepare) {
      await prepare(page)
    }
    await clearTransientOverlays(page)

    const primary = page.locator(primarySelector)
    await expect(primary.first()).toBeVisible()
    const primaryBox = await primary.first().boundingBox()
    if (assertPage) {
      await assertPage(page, viewport)
    }
    const screenshotPath = path.resolve(outputDir, `${label}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    screenshots.push(screenshotPath)

    const pageMetrics = await page.evaluate(() => {
      const preview = document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 280)
      return {
        title: document.title,
        hash: window.location.hash,
        bodyScrollWidth: document.body.scrollWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 4,
        textPreview: preview
      }
    })

    pageChecks.push({
      label,
      hash: pageMetrics.hash,
      title: pageMetrics.title,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      bodyScrollWidth: pageMetrics.bodyScrollWidth,
      docScrollWidth: pageMetrics.docScrollWidth,
      horizontalOverflow: pageMetrics.horizontalOverflow,
      primaryActionVisibleInViewport: Boolean(primaryBox && primaryBox.y < viewport.height),
      primaryActionTop: primaryBox ? Number(primaryBox.y.toFixed(1)) : null,
      textPreview: pageMetrics.textPreview
    })
  } finally {
    await context.close()
  }
}

async function assertGameBottomRevealGesture(page) {
  const metrics = await page.evaluate(async () => {
    const waitForFrames = () => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
    const viewport = document.querySelector('.game-layout-content')
    if (!viewport) return { missingViewport: true }

    const previousScrollTop = viewport.scrollTop
    const readRevealPocket = () => Number.parseFloat(
      getComputedStyle(viewport).getPropertyValue('--game-bottom-reveal-pocket')
    ) || 0
    const isVisible = element => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
    }
    const getControlIssues = () => Array.from(document.querySelectorAll('.mobile-hub-btn, .game-floating-btn, .ai-fab'))
      .filter(isVisible)
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.getAttribute('data-testid') || element.className || element.tagName,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        }
      })
      .filter(rect => (
        rect.left < -1
        || rect.right > window.innerWidth + 1
        || rect.top < -1
        || rect.bottom > window.innerHeight + 1
      ))
      .map(rect => `${rect.label}:${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`)

    const makeTouch = clientY => {
      const touchInit = {
        identifier: 1,
        target: viewport,
        clientX: Math.round(window.innerWidth / 2),
        clientY,
        screenX: Math.round(window.innerWidth / 2),
        screenY: clientY,
        pageX: Math.round(window.innerWidth / 2),
        pageY: clientY,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1
      }
      return typeof Touch === 'function' ? new Touch(touchInit) : touchInit
    }
    const dispatchTouch = (type, clientY) => {
      const touch = makeTouch(clientY)
      const activeTouches = type === 'touchend' || type === 'touchcancel' ? [] : [touch]
      viewport.dispatchEvent(new TouchEvent(type, {
        touches: activeTouches,
        targetTouches: activeTouches,
        changedTouches: [touch],
        bubbles: true,
        cancelable: true
      }))
    }

    const revealPocketBeforeGesture = readRevealPocket()
    const restMaxScrollTop = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight - revealPocketBeforeGesture
    )
    viewport.scrollTop = restMaxScrollTop
    await waitForFrames()
    const bottomBefore = Math.abs(viewport.scrollTop - restMaxScrollTop)
    const actualMaxScrollTop = viewport.scrollHeight - viewport.clientHeight
    const startY = Math.min(window.innerHeight - 96, 680)
    const moveY = Math.max(32, startY - 120)

    dispatchTouch('touchstart', startY)
    await waitForFrames()

    const revealPocket = readRevealPocket()
    const scrollIntoPocketTarget = Math.min(
      actualMaxScrollTop,
      restMaxScrollTop + Math.min(120, Math.max(72, revealPocket - 12))
    )
    viewport.scrollTop = scrollIntoPocketTarget
    await waitForFrames()

    const revealScrollIntoPocket = viewport.scrollTop - restMaxScrollTop
    const controlIssuesDuringReveal = getControlIssues()
    const horizontalOverflowDuringReveal = document.documentElement.scrollWidth > window.innerWidth + 4

    dispatchTouch('touchend', moveY)
    await wait(380)
    await waitForFrames()

    const reboundPocket = readRevealPocket()
    const reboundClassStillActive = viewport.classList.contains('game-layout-content--rebounding')
    const revealClassStillActive = viewport.classList.contains('game-layout-content--revealing')
    const reboundDistanceFromRest = Math.abs(viewport.scrollTop - restMaxScrollTop)
    viewport.scrollTop = previousScrollTop

    return {
      missingViewport: false,
      scrollable: viewport.scrollHeight - revealPocketBeforeGesture > viewport.clientHeight + 8,
      bottomBefore,
      restMaxScrollTop,
      actualMaxScrollTop,
      revealPocket,
      revealScrollIntoPocket,
      controlIssuesDuringReveal,
      horizontalOverflowDuringReveal,
      reboundPocket,
      reboundClassStillActive,
      revealClassStillActive,
      reboundDistanceFromRest
    }
  })

  expect(metrics.missingViewport).toBeFalsy()
  expect(metrics.scrollable).toBeTruthy()
  expect(metrics.bottomBefore).toBeLessThanOrEqual(4)
  expect(metrics.revealPocket).toBeGreaterThan(96)
  expect(metrics.revealScrollIntoPocket).toBeGreaterThan(48)
  expect(metrics.controlIssuesDuringReveal).toEqual([])
  expect(metrics.horizontalOverflowDuringReveal).toBeFalsy()
  expect(metrics.reboundPocket).toBeGreaterThan(96)
  expect(metrics.reboundClassStillActive).toBeFalsy()
  expect(metrics.revealClassStillActive).toBeFalsy()
  expect(metrics.reboundDistanceFromRest).toBeLessThanOrEqual(4)
}

async function assertShopTradeDefault(page) {
  await expect(page.getByTestId('shop-tab-trade')).toBeVisible()
  await expect(page.getByTestId('shop-tab-trade')).toContainText('买卖')

  const reachability = await page.evaluate(() => {
    const visibleInViewport = element => {
      if (!element) return false
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0
        && rect.height > 0
        && rect.top < window.innerHeight
        && rect.bottom > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
    }

    const shopEntry = Array.from(document.querySelectorAll('[data-testid^="shop-entry-"]'))
      .find(element => visibleInViewport(element))
    const primaryCta = document.querySelector('[data-testid="shop-primary-action-card"] button')
    const primaryCtaText = primaryCta?.textContent?.trim() || ''

    return {
      hasVisibleShopEntry: Boolean(shopEntry),
      hasVisibleWanwuCta: visibleInViewport(primaryCta) && /万物铺|推荐货架|继续逛这家|切回买入货架/.test(primaryCtaText),
      primaryCtaText
    }
  })

  expect(reachability.hasVisibleShopEntry || reachability.hasVisibleWanwuCta).toBeTruthy()
}

async function ensureManualExpedition(page) {
  const stage = page.getByTestId('region-expedition-stage')
  if (await stage.isVisible().catch(() => false)) return
  const started = await page.evaluate(async () => {
    const api = window.__TAOYUAN_REGION_MAP_DEBUG__
    if (!api || typeof api.startFirstManualSession !== 'function') return false
    const result = await api.startFirstManualSession()
    return Boolean(result?.success)
  })
  if (!started) throw new Error('Unable to start manual expedition session')
  await expect(stage).toBeVisible()
}

async function waitForExpeditionAction(page) {
  const retreatButton = page.getByTestId('region-expedition-retreat')
  const settleButton = page.getByTestId('region-expedition-settle')
  const choiceButton = page.locator('[data-testid^="region-expedition-choice-"]').first()
  const encounterButton = page.locator('[data-testid^="region-expedition-encounter-"]').first()
  const campButton = page.locator('[data-testid^="region-expedition-camp-"]').first()

  for (let i = 0; i < 12; i += 1) {
    if (await settleButton.isVisible().catch(() => false)) return 'settle'
    if (await retreatButton.isVisible().catch(() => false)) return 'retreat'
    if (await encounterButton.isVisible().catch(() => false)) {
      await encounterButton.click()
      await page.waitForTimeout(250)
      continue
    }
    if (await campButton.isVisible().catch(() => false)) {
      await campButton.click()
      await page.waitForTimeout(250)
      continue
    }
    if (await choiceButton.isVisible().catch(() => false)) return 'choice'
    await page.waitForTimeout(250)
  }

  throw new Error('No expedition action became available in time')
}

async function driveSettlementToAftermath(page) {
  await ensureManualExpedition(page)

  const firstChoice = page.locator('[data-testid^="region-expedition-choice-"]').first()
  if (await firstChoice.isVisible().catch(() => false)) {
    await firstChoice.click()
  }

  const nextAction = await waitForExpeditionAction(page)
  if (nextAction === 'choice' || nextAction === 'retreat') {
    await page.getByTestId('region-expedition-retreat').click()
  }

  await expect(page.getByTestId('region-expedition-settle')).toBeVisible()
  await page.getByTestId('region-expedition-settle').click()
  await expect(page.getByTestId('journey-settlement-reveal')).toBeVisible()

  for (let i = 0; i < 2; i += 1) {
    const nextButton = page.getByTestId('journey-settlement-next')
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click()
    }
  }

  await expect(page.getByTestId('journey-settlement-stage-aftermath')).toBeVisible()
}

async function prepareRegionSocialFriendPanel(page) {
  await page.goto(`${baseURL}/#/game/friend-station`)
  const panel = page.getByTestId('region-social-friend-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('好友驿站')).toBeVisible()
  await expect(panel.getByText('存档身份：')).toBeVisible()
  await expect(panel.getByText('123456789')).toBeVisible()
  await expect(panel.getByText('好友列表')).toBeVisible()
  await expect(panel.getByText('最近互动')).toBeVisible()
  await expect(panel.getByText('已拉黑').first()).toBeVisible()
  await expect(panel.getByText('柳桥织娘').first()).toBeVisible()
  await expect(panel.getByText('云岭巡手').first()).toBeVisible()
  await expect(panel.getByText('灰名单旅人').first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '进入庄园' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '照料' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '写信' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '送礼' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '邀请进房' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '协作' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '共同庄园' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '删除' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '拉黑' }).first()).toBeVisible()

  await panel.getByPlaceholder('9 位数字 ID').fill('987654321')
  await panel.getByTitle('搜索存档 ID').click()
  await expect(panel.getByText('远山果匠')).toBeVisible()
  await expect(panel.getByRole('button', { name: '申请' })).toBeVisible()

  const metrics = await panel.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const interactiveControls = Array.from(element.querySelectorAll('button, input'))
    const clippedControls = interactiveControls.filter(control => {
      const box = control.getBoundingClientRect()
      return box.left < -1 || box.right > window.innerWidth + 1 || box.width < 30 || box.height < 30
    }).map(control => control.textContent?.trim() || control.getAttribute('title') || control.getAttribute('placeholder') || control.tagName)
    return {
      panelLeft: rect.left,
      panelRight: rect.right,
      viewportWidth: window.innerWidth,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls
    }
  })

  expect(metrics.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(metrics.panelRight).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  expect(metrics.docOverflow).toBeLessThanOrEqual(4)
  expect(metrics.clippedControls).toEqual([])
}

async function prepareOnlineCenterMobile(page) {
  await expect(page.getByTestId('online-center')).toBeVisible()
  await expect(page.getByTestId('online-center-hero-actions')).toBeVisible()
  await expect(page.getByTestId('online-center-status-summary')).toBeVisible()
  await expect(page.getByTestId('online-center-hero-action-list')).toBeVisible()
  await expect(page.locator('[data-testid^="online-center-hero-action-"]').filter({ hasText: /创建活动房间|处理邀请|继续|村社待办|接力委托/ }).first()).toBeVisible()
  await expect(page.getByTestId('online-sticky-action-bar')).toBeVisible()
  await expect(page.getByTestId('online-sticky-primary-action')).toBeVisible()
  await expect(page.getByRole('heading', { name: '在线中心' })).toBeVisible()
  await expect(page.getByRole('button', { name: '刷新摘要' })).toBeVisible()
  await expect(page.getByRole('link', { name: '交流大厅' })).toBeVisible()

  for (const moduleKey of onlineCenterModuleKeys) {
    await expect(page.getByTestId(`online-module-${moduleKey}-quick-link`)).toBeVisible()
    await expect(page.getByTestId(`online-module-${moduleKey}-link`)).toBeVisible()
  }

  const layoutIssues = await page.evaluate(() => {
    const viewportHeight = window.innerHeight
    const heroActions = Array.from(document.querySelectorAll('[data-testid^="online-center-hero-action-"]'))
      .filter(element => element.getAttribute('data-testid') !== 'online-center-hero-action-list')
    const firstHeroActionTop = heroActions[0]?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
    const stickyPrimaryBox = document.querySelector('[data-testid="online-sticky-primary-action"]')?.getBoundingClientRect()
    const clippedModules = Array.from(document.querySelectorAll('[data-testid^="online-module-"]'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          testId: element.getAttribute('data-testid') || '',
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.testId)
    return {
      clippedModules,
      heroActionCount: heroActions.length,
      firstHeroActionInViewport: firstHeroActionTop < viewportHeight,
      stickyPrimaryInViewport: Boolean(stickyPrimaryBox && stickyPrimaryBox.top < viewportHeight && stickyPrimaryBox.bottom <= viewportHeight + 1),
    }
  })

  expect(layoutIssues.clippedModules).toEqual([])
  expect(layoutIssues.heroActionCount).toBeGreaterThan(0)
  expect(layoutIssues.heroActionCount).toBeLessThanOrEqual(3)
  expect(layoutIssues.firstHeroActionInViewport).toBe(true)
  expect(layoutIssues.stickyPrimaryInViewport).toBe(true)
}

async function prepareCottageCohabitationEntryMobile(page) {
  const entry = page.getByTestId('cottage-cohabitation-family-entry')
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('同居 / 家庭 / 共同庄园')
  await expect(entry).toContainText('个人铜币与个人背包仍保持独立')
  await entry.getByRole('button', { name: '进入' }).click()
  await expect(page).toHaveURL(/\/#\/game\/online\/cohabitation/)
  await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
}

async function prepareFarmCohabitationSwitchMobile(page) {
  const switchEntry = page.getByTestId('farm-cohabitation-switch')
  await expect(switchEntry).toBeVisible()
  await expect(switchEntry).toContainText('共同庄园切换')
  await expect(switchEntry).toContainText('个人田庄批量操作继续保留在本页')
  const sharedMapButton = switchEntry.getByRole('button', { name: '查看共同农田' })
  await sharedMapButton.click()
  await page.waitForTimeout(100)
  if (!/#\/game\/online\/cohabitation\?tab=map/.test(page.url())) {
    await sharedMapButton.evaluate(element => element.click())
  }
  await expect(page).toHaveURL(/\/#\/game\/online\/cohabitation\?tab=map/)
  await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
  await expect(page.getByTestId('online-module-tab-map')).toHaveAttribute('aria-selected', 'true')
}

async function ensureOnlineFestivalRoomTab(page) {
  await expect(page.getByTestId('online-festival-page')).toBeVisible()
  const festivalRoomTab = page.getByTestId('online-module-tab-festival-room')
  await expect(festivalRoomTab).toBeVisible()
  if (await festivalRoomTab.getAttribute('aria-selected') !== 'true') {
    await festivalRoomTab.click()
  }
}

async function prepareOnlineFestivalRoomWizardMobile(page) {
  await ensureOnlineFestivalRoomTab(page)

  const createTrigger = page.getByTestId('online-room-create-trigger')
  await expect(createTrigger).toBeVisible()
  await createTrigger.click()

  await expect(page.getByTestId('online-bottom-sheet')).toBeVisible()
  await expect(page.getByTestId('online-bottom-sheet-title')).toBeVisible()
  await expect(page.getByTestId('online-bottom-sheet-close')).toBeVisible()
  await expect(page.getByTestId('online-room-wizard')).toBeVisible()
  await expect(page.getByTestId('online-room-wizard-step-gameplay')).toBeVisible()
  await expect(page.getByTestId('online-room-wizard-next')).toBeVisible()

  const layoutIssues = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="online-bottom-sheet"]')
    const panel = overlay?.querySelector('.online-bottom-sheet__panel')
    const footer = overlay?.querySelector('.online-bottom-sheet__footer')
    const closeButton = document.querySelector('[data-testid="online-bottom-sheet-close"]')
    const nextButton = document.querySelector('[data-testid="online-room-wizard-next"]')
    const visibleControls = Array.from(overlay?.querySelectorAll('button, input, select, textarea') ?? [])
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    const clippedControls = visibleControls
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
    const panelRect = panel?.getBoundingClientRect()
    const footerRect = footer?.getBoundingClientRect()
    const closeRect = closeButton?.getBoundingClientRect()
    const nextRect = nextButton?.getBoundingClientRect()

    return {
      bodyOverflow: document.body.style.overflow,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls,
      panelLeft: panelRect?.left ?? Number.NaN,
      panelRight: panelRect?.right ?? Number.NaN,
      panelTop: panelRect?.top ?? Number.NaN,
      panelBottom: panelRect?.bottom ?? Number.NaN,
      footerBottom: footerRect?.bottom ?? Number.NaN,
      closeTop: closeRect?.top ?? Number.NaN,
      closeRight: closeRect?.right ?? Number.NaN,
      closeWidth: closeRect?.width ?? 0,
      closeHeight: closeRect?.height ?? 0,
      nextTop: nextRect?.top ?? Number.NaN,
      nextBottom: nextRect?.bottom ?? Number.NaN,
      nextHeight: nextRect?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(layoutIssues.bodyOverflow).toBe('hidden')
  expect(layoutIssues.docOverflow).toBeLessThanOrEqual(4)
  expect(layoutIssues.clippedControls).toEqual([])
  expect(layoutIssues.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.panelTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.footerBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.closeTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.closeRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.closeWidth).toBeGreaterThanOrEqual(36)
  expect(layoutIssues.closeHeight).toBeGreaterThanOrEqual(32)
  expect(layoutIssues.nextTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.nextBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.nextHeight).toBeGreaterThanOrEqual(32)

  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-bottom-sheet')).toHaveCount(0)
  await createTrigger.click()
  await expect(page.getByTestId('online-bottom-sheet')).toBeVisible()
  await expect(page.getByTestId('online-room-wizard-next')).toBeVisible()
}

async function assertFestivalRoomLobbyMobileLayout(page) {
  const layoutIssues = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="online-bottom-sheet"]')
    const panel = overlay?.querySelector('.online-bottom-sheet__panel')
    const footer = overlay?.querySelector('.online-bottom-sheet__footer')
    const closeButton = document.querySelector('[data-testid="online-bottom-sheet-close"]')
    const primaryAction = document.querySelector('[data-testid="online-room-primary-action"]')
    const memberList = document.querySelector('[data-testid="online-room-member-list"]')
    const visibleControls = Array.from(overlay?.querySelectorAll('button, input, select, textarea') ?? [])
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    const clippedControls = visibleControls
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
    const panelRect = panel?.getBoundingClientRect()
    const footerRect = footer?.getBoundingClientRect()
    const closeRect = closeButton?.getBoundingClientRect()
    const primaryRect = primaryAction?.getBoundingClientRect()
    const memberListRect = memberList?.getBoundingClientRect()

    return {
      bodyOverflow: document.body.style.overflow,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls,
      panelLeft: panelRect?.left ?? Number.NaN,
      panelRight: panelRect?.right ?? Number.NaN,
      panelTop: panelRect?.top ?? Number.NaN,
      panelBottom: panelRect?.bottom ?? Number.NaN,
      footerBottom: footerRect?.bottom ?? Number.NaN,
      closeTop: closeRect?.top ?? Number.NaN,
      closeRight: closeRect?.right ?? Number.NaN,
      closeWidth: closeRect?.width ?? 0,
      closeHeight: closeRect?.height ?? 0,
      primaryTop: primaryRect?.top ?? Number.NaN,
      primaryBottom: primaryRect?.bottom ?? Number.NaN,
      primaryHeight: primaryRect?.height ?? 0,
      memberListTop: memberListRect?.top ?? Number.NaN,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(layoutIssues.bodyOverflow).toBe('hidden')
  expect(layoutIssues.docOverflow).toBeLessThanOrEqual(4)
  expect(layoutIssues.clippedControls).toEqual([])
  expect(layoutIssues.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.panelTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.footerBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.closeTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.closeRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.closeWidth).toBeGreaterThanOrEqual(36)
  expect(layoutIssues.closeHeight).toBeGreaterThanOrEqual(32)
  expect(layoutIssues.primaryTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.primaryBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.primaryHeight).toBeGreaterThanOrEqual(44)
  expect(layoutIssues.memberListTop).toBeLessThan(layoutIssues.viewportHeight)
}

async function prepareOnlineFestivalRoomLobbyMobile(page) {
  await ensureOnlineFestivalRoomTab(page)
  await expect(page.getByTestId('online-festival-room-my-room')).toBeVisible()
  await expect(page.getByTestId('online-visual-room-title')).toContainText('移动端节会房')
  await expect(page.getByText('进行中').first()).toBeVisible()

  const lobbyTrigger = page.getByTestId('online-festival-room-lobby-trigger')
  await expect(lobbyTrigger).toBeVisible()
  await lobbyTrigger.click()

  await expect(page.getByTestId('online-bottom-sheet')).toBeVisible()
  await expect(page.getByTestId('online-room-lobby')).toBeVisible()
  await expect(page.getByTestId('online-room-member-list')).toContainText('移动端烟测号')
  await expect(page.getByTestId('online-room-member-list')).toContainText('协作好友')
  await expect(page.getByTestId('online-room-primary-action')).toBeVisible()
  await expect(page.getByTestId('online-room-primary-action')).toContainText('进入玩法')
  await expect(page.getByTestId('online-room-action-cancel-room')).toBeVisible()

  await assertFestivalRoomLobbyMobileLayout(page)
}

async function prepareOnlineFestivalRoomInvitePanelMobile(page) {
  await ensureOnlineFestivalRoomTab(page)
  await expect(page.getByTestId('online-festival-room-my-room')).toBeVisible()
  await expect(page.getByTestId('online-visual-room-title')).toContainText('移动端节会房')

  const inviteTrigger = page.getByTestId('online-festival-room-invite-trigger')
  await expect(inviteTrigger).toBeVisible()
  await inviteTrigger.click()

  await expect(page.getByTestId('online-bottom-sheet')).toBeVisible()
  await expect(page.getByTestId('online-invite-panel')).toBeVisible()
  await expect(page.getByTestId('online-invite-existing-list')).toContainText('移动端烟测号')
  await expect(page.getByTestId('online-invite-existing-list')).toContainText('协作好友')

  const inviteInput = page.getByTestId('online-invite-input')
  await expect(inviteInput).toBeFocused()
  await inviteInput.fill('lantern_guest，wish_helper 协作好友')
  await expect(page.getByTestId('online-invite-draft-list')).toContainText('lantern_guest')
  await expect(page.getByTestId('online-invite-draft-list')).toContainText('wish_helper')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('待发送')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('已在房间')
  await expect(page.getByTestId('online-invite-submit')).toContainText('发送邀请 2')

  const beforeSubmitLayout = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="online-bottom-sheet"]')
    const panel = overlay?.querySelector('.online-bottom-sheet__panel')
    const footer = overlay?.querySelector('.online-bottom-sheet__footer')
    const submitButton = document.querySelector('[data-testid="online-invite-submit"]')
    const input = document.querySelector('[data-testid="online-invite-input"]')
    const resultList = document.querySelector('[data-testid="online-invite-result-list"]')
    const visibleControls = Array.from(overlay?.querySelectorAll('button, input, select, textarea') ?? [])
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    const clippedControls = visibleControls
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
    const panelRect = panel?.getBoundingClientRect()
    const footerRect = footer?.getBoundingClientRect()
    const submitRect = submitButton?.getBoundingClientRect()
    const inputRect = input?.getBoundingClientRect()
    const resultRect = resultList?.getBoundingClientRect()

    return {
      bodyOverflow: document.body.style.overflow,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls,
      panelLeft: panelRect?.left ?? Number.NaN,
      panelRight: panelRect?.right ?? Number.NaN,
      panelTop: panelRect?.top ?? Number.NaN,
      panelBottom: panelRect?.bottom ?? Number.NaN,
      footerBottom: footerRect?.bottom ?? Number.NaN,
      submitBottom: submitRect?.bottom ?? Number.NaN,
      submitHeight: submitRect?.height ?? 0,
      inputTop: inputRect?.top ?? Number.NaN,
      resultTop: resultRect?.top ?? Number.NaN,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(beforeSubmitLayout.bodyOverflow).toBe('hidden')
  expect(beforeSubmitLayout.docOverflow).toBeLessThanOrEqual(4)
  expect(beforeSubmitLayout.clippedControls).toEqual([])
  expect(beforeSubmitLayout.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(beforeSubmitLayout.panelRight).toBeLessThanOrEqual(beforeSubmitLayout.viewportWidth + 1)
  expect(beforeSubmitLayout.panelTop).toBeGreaterThanOrEqual(-1)
  expect(beforeSubmitLayout.panelBottom).toBeLessThanOrEqual(beforeSubmitLayout.viewportHeight + 1)
  expect(beforeSubmitLayout.footerBottom).toBeLessThanOrEqual(beforeSubmitLayout.viewportHeight + 1)
  expect(beforeSubmitLayout.submitBottom).toBeLessThanOrEqual(beforeSubmitLayout.viewportHeight + 1)
  expect(beforeSubmitLayout.submitHeight).toBeGreaterThanOrEqual(44)
  expect(beforeSubmitLayout.inputTop).toBeLessThan(beforeSubmitLayout.viewportHeight)
  expect(beforeSubmitLayout.resultTop).toBeLessThan(beforeSubmitLayout.viewportHeight)

  await page.getByTestId('online-invite-submit').click()
  await expect(page.getByTestId('online-invite-result-list')).toContainText('lantern_guest')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('wish_helper')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('已邀请')
}

async function prepareOnlineFestivalRoomSettleConfirmMobile(page) {
  await ensureOnlineFestivalRoomTab(page)
  await expect(page.getByTestId('online-festival-room-my-room')).toBeVisible()

  await page.getByTestId('online-technical-details-toggle').filter({ hasText: '备用房间操作' }).click()
  await expect(page.getByTestId('online-festival-room-lobby-backup-actions')).toBeVisible()
  await expect(page.getByTestId('online-festival-room-settle-submit')).toBeVisible()
  await page.getByTestId('online-festival-room-settle-submit').click()

  await expect(page.getByTestId('online-room-settle-confirm')).toHaveCount(1)
  await expect(page.getByTestId('online-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('节会房间')
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('移动端节会房')
  await expect(page.getByTestId('online-confirm-asset-list')).toBeVisible()
  await expect(page.getByTestId('online-confirm-recovery-hint')).toContainText('可刷新后再次尝试')
  await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeVisible()
  await expect(page.getByTestId('online-confirm-action-dialog-cancel')).toBeVisible()

  const layoutIssues = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="online-action-dialog"]')
    const panel = overlay?.querySelector('[role="dialog"]')
    const confirmButton = document.querySelector('[data-testid="online-confirm-action-dialog-confirm"]')
    const cancelButton = document.querySelector('[data-testid="online-confirm-action-dialog-cancel"]')
    const impactList = document.querySelector('[data-testid="online-confirm-impact-list"]')
    const visibleControls = Array.from(overlay?.querySelectorAll('button, input, select, textarea') ?? [])
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    const clippedControls = visibleControls
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
    const panelRect = panel?.getBoundingClientRect()
    const confirmRect = confirmButton?.getBoundingClientRect()
    const cancelRect = cancelButton?.getBoundingClientRect()
    const impactRect = impactList?.getBoundingClientRect()

    return {
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls,
      panelLeft: panelRect?.left ?? Number.NaN,
      panelRight: panelRect?.right ?? Number.NaN,
      panelTop: panelRect?.top ?? Number.NaN,
      panelBottom: panelRect?.bottom ?? Number.NaN,
      impactTop: impactRect?.top ?? Number.NaN,
      confirmBottom: confirmRect?.bottom ?? Number.NaN,
      confirmHeight: confirmRect?.height ?? 0,
      cancelHeight: cancelRect?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(layoutIssues.docOverflow).toBeLessThanOrEqual(4)
  expect(layoutIssues.clippedControls).toEqual([])
  expect(layoutIssues.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.panelTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.impactTop).toBeLessThan(layoutIssues.viewportHeight)
  expect(layoutIssues.confirmBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.confirmHeight).toBeGreaterThanOrEqual(32)
  expect(layoutIssues.cancelHeight).toBeGreaterThanOrEqual(32)
}

async function assertConfirmActionDialogMobileLayout(page) {
  const layoutIssues = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="online-action-dialog"]')
    const panel = overlay?.querySelector('[role="dialog"]')
    const confirmButton = document.querySelector('[data-testid="online-confirm-action-dialog-confirm"]')
    const cancelButton = document.querySelector('[data-testid="online-confirm-action-dialog-cancel"]')
    const impactList = document.querySelector('[data-testid="online-confirm-impact-list"]')
    const visibleControls = Array.from(overlay?.querySelectorAll('button, input, select, textarea') ?? [])
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    const clippedControls = visibleControls
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
    const panelRect = panel?.getBoundingClientRect()
    const confirmRect = confirmButton?.getBoundingClientRect()
    const cancelRect = cancelButton?.getBoundingClientRect()
    const impactRect = impactList?.getBoundingClientRect()

    return {
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls,
      panelLeft: panelRect?.left ?? Number.NaN,
      panelRight: panelRect?.right ?? Number.NaN,
      panelTop: panelRect?.top ?? Number.NaN,
      panelBottom: panelRect?.bottom ?? Number.NaN,
      impactTop: impactRect?.top ?? Number.NaN,
      confirmBottom: confirmRect?.bottom ?? Number.NaN,
      confirmHeight: confirmRect?.height ?? 0,
      cancelHeight: cancelRect?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(layoutIssues.docOverflow).toBeLessThanOrEqual(4)
  expect(layoutIssues.clippedControls).toEqual([])
  expect(layoutIssues.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.panelTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.impactTop).toBeLessThan(layoutIssues.viewportHeight)
  expect(layoutIssues.confirmBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.confirmHeight).toBeGreaterThanOrEqual(32)
  expect(layoutIssues.cancelHeight).toBeGreaterThanOrEqual(32)
}

async function prepareExpeditionRoomMainFlowMobile(page) {
  await expect(page.getByTestId('expedition-room-page')).toBeVisible()
  await expect(page.getByText('联机远征大厅')).toBeVisible()
  await expect(page.getByTestId('online-expedition-room-create-trigger')).toBeVisible()
  await expect(page.getByTestId('online-visual-room-title')).toContainText('移动端远征大厅')
  await expect(page.getByText('最近结算', { exact: true })).toBeVisible()

  await page.getByTestId('online-expedition-room-create-trigger').click()
  await expect(page.getByTestId('online-room-wizard')).toBeVisible()
  await expect(page.getByTestId('online-room-wizard-step-gameplay')).toBeVisible()
  await expect(page.getByTestId('online-bottom-sheet')).toBeVisible()
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-room-wizard')).toHaveCount(0)

  await page.getByTestId('online-expedition-room-lobby-trigger').click()
  await expect(page.getByTestId('online-room-lobby')).toBeVisible()
  await expect(page.getByTestId('online-room-member-list')).toContainText('移动端烟测号')
  await expect(page.getByTestId('online-room-member-list')).toContainText('协作好友')
  await expect(page.getByTestId('online-room-primary-action')).toBeVisible()
  await assertFestivalRoomLobbyMobileLayout(page)
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-room-lobby')).toHaveCount(0)

  await page.getByTestId('online-expedition-room-invite-trigger').click()
  await expect(page.getByTestId('online-invite-panel')).toBeVisible()
  await expect(page.getByTestId('online-invite-existing-list')).toContainText('移动端烟测号')
  await expect(page.getByTestId('online-invite-existing-list')).toContainText('协作好友')
  await page.getByTestId('online-invite-input').fill('cavern_guest 协作好友')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('cavern_guest')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('已在房间')
  await expect(page.getByTestId('online-invite-submit')).toContainText('发送邀请 1')
  await page.getByTestId('online-invite-submit').click()
  await expect(page.getByTestId('online-invite-result-cavern_guest')).toContainText('已邀请')
  await page.getByRole('button', { name: '稍后邀请' }).click()
  await expect(page.getByTestId('online-invite-panel')).toHaveCount(0)

  await page.getByTestId('online-technical-details-toggle').filter({ hasText: '备用房间操作' }).click()
  await expect(page.getByTestId('expedition-room-lobby-backup-actions')).toBeVisible()
  await page.getByTestId('expedition-room-settle-submit').click()
  await expect(page.getByTestId('expedition-room-settle-confirm')).toHaveCount(1)
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('移动端远征大厅')
  await expect(page.getByTestId('online-confirm-asset-list')).toBeVisible()
  await assertConfirmActionDialogMobileLayout(page)
  await page.getByTestId('online-confirm-action-dialog-cancel').click()
  await expect(page.getByTestId('expedition-room-settle-confirm')).toHaveCount(0)

  await page.getByTestId('expedition-room-close-submit').click()
  await expect(page.getByTestId('expedition-room-close-confirm')).toHaveCount(1)
  await expect(page.getByTestId('online-confirm-irreversible')).toBeVisible()
  await expect(page.getByTestId('online-confirm-required-text')).toBeVisible()
  await expect(page.getByTestId('online-confirm-disabled-reason')).toContainText('确认文字未填写')
  await assertConfirmActionDialogMobileLayout(page)

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="expedition-room-page"]')
    if (!root) return ['expedition-room-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function ensureOnlineCohabitationFestivalSeatsTab(page) {
  await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
  const festivalSeatsTab = page.getByTestId('online-module-tab-festivalSeats')
  await expect(festivalSeatsTab).toBeVisible()
  if (await festivalSeatsTab.getAttribute('aria-selected') !== 'true') {
    await festivalSeatsTab.click()
  }
}

async function prepareOnlineCohabitationFamilyFestivalConfirmMobile(page) {
  await ensureOnlineCohabitationFestivalSeatsTab(page)

  const familyFestivalPanel = page.getByTestId('online-cohabitation-family-festival-panel')
  await expect(familyFestivalPanel).toBeVisible()
  await expect(familyFestivalPanel).toContainText('家族上元灯会')
  await expect(familyFestivalPanel).toContainText('移动端烟测号')
  await expect(familyFestivalPanel).toContainText('节会协作者')

  const settleTrigger = page.getByTestId('online-cohabitation-family-festival-settle-confirm-trigger')
  await expect(settleTrigger).toBeVisible()
  await expect(settleTrigger).toBeEnabled()
  await settleTrigger.scrollIntoViewIfNeeded()
  await settleTrigger.click()

  await expect(page.getByTestId('online-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认结算家族节会奖励')
  await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('移动端家族节会庄园')
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('家族上元灯会')
  await expect(page.getByTestId('online-confirm-asset-list')).toContainText('共同基金')
  await expect(page.getByTestId('online-confirm-asset-list')).toContainText('家族声望')
  await expect(page.getByTestId('online-confirm-irreversible')).toBeVisible()
  await expect(page.getByTestId('online-confirm-recovery-hint')).toContainText('补偿重放')
  await expect(page.getByTestId('online-confirm-required-text')).toBeVisible()
  await expect(page.getByTestId('online-confirm-disabled-reason')).toContainText('确认文字未填写')
  await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeDisabled()
  await expect(page.getByTestId('online-confirm-action-dialog-cancel')).toBeVisible()

  const layoutIssues = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="online-action-dialog"]')
    const panel = overlay?.querySelector('[role="dialog"]')
    const confirmButton = document.querySelector('[data-testid="online-confirm-action-dialog-confirm"]')
    const cancelButton = document.querySelector('[data-testid="online-confirm-action-dialog-cancel"]')
    const requiredTextInput = document.querySelector('[data-testid="online-confirm-required-text"]')
    const impactList = document.querySelector('[data-testid="online-confirm-impact-list"]')
    const assetList = document.querySelector('[data-testid="online-confirm-asset-list"]')
    const visibleControls = Array.from(overlay?.querySelectorAll('button, input, select, textarea') ?? [])
      .filter(element => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
    const clippedControls = visibleControls
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
      .filter(entry => entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1)
      .map(entry => entry.label)
    const panelRect = panel?.getBoundingClientRect()
    const confirmRect = confirmButton?.getBoundingClientRect()
    const cancelRect = cancelButton?.getBoundingClientRect()
    const requiredTextRect = requiredTextInput?.getBoundingClientRect()
    const impactRect = impactList?.getBoundingClientRect()
    const assetRect = assetList?.getBoundingClientRect()

    return {
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      clippedControls,
      panelLeft: panelRect?.left ?? Number.NaN,
      panelRight: panelRect?.right ?? Number.NaN,
      panelTop: panelRect?.top ?? Number.NaN,
      panelBottom: panelRect?.bottom ?? Number.NaN,
      impactTop: impactRect?.top ?? Number.NaN,
      assetTop: assetRect?.top ?? Number.NaN,
      requiredTextBottom: requiredTextRect?.bottom ?? Number.NaN,
      confirmBottom: confirmRect?.bottom ?? Number.NaN,
      confirmHeight: confirmRect?.height ?? 0,
      cancelHeight: cancelRect?.height ?? 0,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  })

  expect(layoutIssues.docOverflow).toBeLessThanOrEqual(4)
  expect(layoutIssues.clippedControls).toEqual([])
  expect(layoutIssues.panelLeft).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelRight).toBeLessThanOrEqual(layoutIssues.viewportWidth + 1)
  expect(layoutIssues.panelTop).toBeGreaterThanOrEqual(-1)
  expect(layoutIssues.panelBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.impactTop).toBeLessThan(layoutIssues.viewportHeight)
  expect(layoutIssues.assetTop).toBeLessThan(layoutIssues.viewportHeight)
  expect(layoutIssues.requiredTextBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.confirmBottom).toBeLessThanOrEqual(layoutIssues.viewportHeight + 1)
  expect(layoutIssues.confirmHeight).toBeGreaterThanOrEqual(32)
  expect(layoutIssues.cancelHeight).toBeGreaterThanOrEqual(32)
}

async function prepareOnlineOrdersMobile(page) {
  const ordersTab = key => page.getByTestId(`online-module-tab-${key}`)

  await expect(page.getByTestId('online-orders-page')).toBeVisible()
  await expect(ordersTab('publish')).toBeVisible()
  await expect(ordersTab('available')).toBeVisible()
  await expect(ordersTab('receipts')).toBeVisible()

  await ordersTab('available').click()
  await expect(page.getByTestId('online-orders-board-filter-relay')).toBeVisible()
  await page.getByTestId('online-orders-board-filter-relay').click()
  await expect(page.getByTestId('online-orders-available-list')).toBeVisible()
  const relayEntry = page.getByTestId('online-orders-available-entry').filter({ hasText: '灯会干菜接力单' }).first()
  await expect(relayEntry).toBeVisible()
  await expect(relayEntry).toContainText('接力单')
  await expect(relayEntry).toContainText('剩余')
  await relayEntry.getByTestId('online-orders-available-detail-trigger').click()
  const orderDetailSheet = page.getByTestId('online-orders-detail-sheet')
  await expect(orderDetailSheet).toBeVisible()
  await expect(orderDetailSheet).toContainText('阶段 1/3 已确认')
  await expect(orderDetailSheet.getByTestId('async-community-board')).toBeVisible()
  await expect(orderDetailSheet.getByTestId('async-community-project-detail')).toContainText('加工干菜')
  await expect(orderDetailSheet.getByTestId('async-community-project-readback')).toContainText('0 人 · 1 条历史')
  await expect(orderDetailSheet.getByTestId('online-orders-story-flow')).toBeVisible()
  await expect(orderDetailSheet.getByTestId('online-orders-story-flow-chapters')).toContainText('采收青菜')
  await expect(orderDetailSheet.getByTestId('online-orders-relay-settlement-summary')).toContainText('分账池')
  await expect(orderDetailSheet.getByTestId('online-orders-relay-settlement-summary')).toContainText('已落账 80 / 待结 180')
  await page.getByTestId('online-orders-society-board-receipts').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('online-orders-society-board-receipts')).toContainText('已完成的帮手 · 赏金 80 · 个人铜钱')
  await page.getByTestId('online-society-async-contribute-relay_route-accept_stage:stage_process').click()
  await expect(page.getByTestId('online-orders-detail-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认接下这一段')
  await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('灯会干菜接力单')
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('阶段 2 · 加工干菜')
  await expect(page.getByTestId('online-confirm-asset-list')).toContainText('进入“我的接单”')
  await expect(page.getByTestId('online-confirm-recovery-hint')).toContainText('接单失败时不会占用这张单')
  await page.getByTestId('online-confirm-action-dialog-confirm').click()
  await expect(page.getByTestId('online-orders-action-confirm')).toHaveCount(0)
  await relayEntry.getByTestId('online-orders-available-detail-trigger').click()
  const updatedOrderDetailSheet = page.getByTestId('online-orders-detail-sheet')
  await expect(updatedOrderDetailSheet).toBeVisible()
  await expect(updatedOrderDetailSheet.getByTestId('async-community-project-detail')).toContainText('送到灯会')
  await expect(updatedOrderDetailSheet.getByTestId('async-community-project-readback')).toContainText('1 人 · 1 条历史')
  await expect(updatedOrderDetailSheet.getByTestId('online-orders-relay-settlement-summary')).toContainText('加工干菜：35% / 90 · 共同基金')
  await expect(updatedOrderDetailSheet).toContainText('移动端烟测号已接下加工干菜这一段。')
  await page.getByTestId('online-bottom-sheet-close').click()

  await ordersTab('receipts').click()
  await expect(page.getByText('还没有结算凭证')).toBeVisible()
  await ordersTab('accepted').click()
  const acceptedEntry = page.getByTestId('online-orders-accepted-entry').filter({ hasText: '移动端待交付求助单' }).first()
  await expect(acceptedEntry).toBeVisible()
  await acceptedEntry.getByTestId('online-orders-delivery-item-input').fill('smoke_wheat')
  await acceptedEntry.getByTestId('online-orders-delivery-quantity-input').fill('2')
  await acceptedEntry.getByTestId('online-orders-delivery-note-input').fill('交付确认弹窗烟测说明。')
  await acceptedEntry.getByTestId('online-orders-delivery-submit').click()
  await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-action-dialog')).toContainText('移动端待交付求助单')
  await expect(page.getByTestId('online-confirm-action-dialog')).toContainText('smoke_wheat ×2')
  await page.getByTestId('online-confirm-action-dialog-confirm').click()
  await expect(page.getByTestId('online-orders-action-confirm')).toHaveCount(0)
  await expect(acceptedEntry).toContainText('待确认')
  await expect(ordersTab('publish')).toBeVisible()
  await ordersTab('publish').click()
  await expect(page.getByTestId('online-orders-publish-summary')).toBeVisible()
  await expect(page.getByTestId('online-orders-publish-wizard-trigger')).toBeVisible()
  await page.getByTestId('online-orders-publish-wizard-trigger').click()
  await expect(page.getByTestId('online-order-wizard')).toBeVisible()
  await expect(page.getByTestId('online-order-wizard-step-type')).toBeVisible()
  await page.getByTestId('online-order-wizard-next').click()
  await expect(page.getByTestId('online-order-wizard-step-need')).toBeVisible()
  await page.getByTestId('online-orders-publish-title-input').fill('移动端烟测求助单')
  await page.getByTestId('online-orders-publish-description-input').fill('用发布向导提交一张移动端烟测求助单。')
  await page.getByTestId('online-order-wizard-next').click()
  await expect(page.getByTestId('online-order-wizard-step-mode')).toBeVisible()
  await page.getByTestId('online-order-wizard-next').click()
  await expect(page.getByTestId('online-order-wizard-step-reward')).toBeVisible()
  await page.getByTestId('online-orders-publish-reward-value-input').fill('180')
  await page.getByTestId('online-order-wizard-next').click()
  await expect(page.getByTestId('online-order-wizard-step-review')).toBeVisible()
  await page.getByTestId('online-orders-publish-submit').click()
  await expect(ordersTab('mine')).toBeVisible()
  await expect(page.getByTestId('online-orders-mine-entry')).toContainText('移动端烟测求助单')

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-orders-page"]')
    if (!root) return ['online-orders-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
        label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs, .online-order-story-flow__chapters')),
      }
    })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyProjectsMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByText('清溪灯社').first()).toBeVisible()
  await expect(page.getByTestId('online-module-tab-projects')).toBeVisible()
  await page.getByTestId('online-module-tab-projects').click()

  await expect(page.getByTestId('async-community-board')).toBeVisible()
  await expect(page.getByTestId('async-community-project-compact-detail')).toContainText('写愿望')
  await expect(page.getByTestId('async-community-site-objects')).toContainText('好友留言')
  await expect(page.getByText('纪念墙')).toBeVisible()
  await expect(page.getByText('愿望册')).toBeVisible()
  await expect(page.getByTestId('online-society-async-contribute-lantern_wall-write_wish')).toBeVisible()
  await page.getByTestId('online-society-async-contribute-lantern_wall-write_wish').click()
  await expect(page.getByTestId('async-community-project-compact-detail')).toContainText('挂花灯')
  await expect(page.getByText('移动端烟测号写下一张愿望签，花灯墙亮了一角。')).toBeVisible()
  await page.getByTestId('async-community-project-detail-trigger').click()
  await expect(page.getByTestId('online-society-project-detail-sheet')).toBeVisible()
  await expect(page.getByTestId('online-society-project-stage-list')).toContainText('挂花灯')
  const asyncCommunityProjectReadback = '[data-testid="async-community-project-readback"]'
  const projectReadbackSummary = await page.evaluate(readbackSelector => {
    const directReadback = document.querySelector(readbackSelector)?.textContent || ''
    if (directReadback) return directReadback
    const contributors = document.querySelector('[data-testid="online-society-project-contributors"]')?.textContent || ''
    const history = document.querySelector('[data-testid="online-society-project-history"]')?.textContent || ''
    return contributors.includes('移动端烟测号') && history.includes('移动端烟测号写下一张愿望签。')
      ? '1 人 · 1 条历史'
      : ''
  }, asyncCommunityProjectReadback)
  expect(projectReadbackSummary).toContain('1 人 · 1 条历史')
  await expect(page.getByTestId('online-society-project-recent-contributions')).toContainText('移动端烟测号 提交了 写愿望（+10）')
  await expect(page.getByTestId('online-society-project-history')).toContainText('移动端烟测号写下一张愿望签。')
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-society-project-detail-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-society-project-contribute-lantern_wall-write_wish')).toBeVisible()

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyCreateMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByTestId('online-society-create-summary')).toBeVisible()
  await expect(page.getByTestId('online-society-create-trigger')).toBeVisible()
  await expect(page.getByText('溪畔春社')).toBeVisible()
  await expect(page.getByTestId('online-society-create-name-input')).toHaveCount(0)

  await page.getByTestId('online-society-create-trigger').click()
  await expect(page.getByTestId('online-society-create-dialog')).toBeVisible()
  await expect(page.getByTestId('online-society-create-step-basic')).toBeVisible()
  await page.getByTestId('online-society-create-name-input').fill('移动端烟测村社')
  await page.getByTestId('online-society-create-summary-input').fill('一起照看节会、公共建设和互助委托。')
  await page.getByTestId('online-society-create-notice-input').fill('本周先招募两位稳定成员。')
  await page.getByTestId('online-society-create-next').click()

  await expect(page.getByTestId('online-society-create-step-style')).toBeVisible()
  await expect(page.getByTestId('online-society-create-emblem-select')).toBeVisible()
  await expect(page.getByTestId('online-society-create-theme-select')).toBeVisible()
  await page.getByTestId('online-society-create-next').click()

  await expect(page.getByTestId('online-society-create-step-access')).toBeVisible()
  await expect(page.getByTestId('online-society-create-visibility-select')).toBeVisible()
  await expect(page.getByTestId('online-society-create-capacity-select')).toBeVisible()
  await page.getByTestId('online-society-create-next').click()

  await expect(page.getByTestId('online-society-create-step-join')).toBeVisible()
  await expect(page.getByTestId('online-society-create-join-requirement-select')).toBeVisible()
  await page.getByTestId('online-society-create-join-note-input').fill('希望先有公开名片和稳定经营节奏。')
  await page.getByTestId('online-society-create-next').click()

  await expect(page.getByTestId('online-society-create-step-review')).toBeVisible()
  await expect(page.getByTestId('online-society-create-step-review')).toContainText('移动端烟测村社')
  await page.getByTestId('online-society-create-submit').click()
  await expect(page.getByTestId('online-society-create-dialog')).toHaveCount(0)
  await expect(page.getByText('移动端烟测村社').first()).toBeVisible()
  await expect(page.getByTestId('online-society-create-summary')).toHaveCount(0)

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyRequestsMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByText('清溪灯社').first()).toBeVisible()
  await page.getByTestId('online-module-tab-members').click()
  await expect(page.getByTestId('online-society-admin-actions')).toBeVisible()
  await expect(page.getByTestId('online-society-member-actions')).toHaveCount(0)

  await page.getByTestId('online-society-invite-panel-trigger').click()
  await expect(page.getByTestId('online-invite-panel')).toBeVisible()
  await page.getByTestId('online-invite-input').fill('new_helper\nexisting_member')
  await page.getByTestId('online-invite-submit').click()
  await expect(page.getByTestId('online-invite-result-list')).toContainText('new_helper')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('邀请已发送')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('existing_member')
  await expect(page.getByTestId('online-invite-result-list')).toContainText('已经在村社')
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-invite-panel')).toHaveCount(0)

  await expect(page.getByTestId('online-society-managed-request-entry')).toContainText('申请人')
  await page.getByTestId('online-society-managed-request-detail-req-mobile-apply').click()
  await expect(page.getByTestId('online-society-request-detail-sheet')).toBeVisible()
  await expect(page.getByTestId('online-society-request-detail-sheet')).toContainText('加入申请')
  await expect(page.getByTestId('online-society-request-detail-sheet')).toContainText('987654321')
  await page.getByTestId('online-society-managed-request-accept-req-mobile-apply').click()
  await expect(page.getByTestId('online-society-request-detail-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-society-managed-request-entry')).toHaveCount(0)
  await expect(page.getByTestId('online-society-member-entry').filter({ hasText: '申请人' }).first()).toBeVisible()

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyProposalsMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByText('清溪灯社').first()).toBeVisible()
  await page.getByTestId('online-module-tab-proposals').click()
  await expect(page.getByTestId('online-society-proposal-list')).toBeVisible()
  await expect(page.getByTestId('online-society-proposal-action-panel')).toBeVisible()
  await expect(page.getByTestId('online-society-proposal-title-input')).toHaveCount(0)

  await page.getByTestId('online-society-proposal-create-trigger').click()
  await expect(page.getByTestId('online-society-proposal-dialog')).toBeVisible()
  await page.getByTestId('online-society-proposal-title-input').fill('移动端提案弹窗')
  await page.getByTestId('online-society-proposal-kind-select').selectOption('festival')
  await page.getByTestId('online-society-proposal-summary-input').fill('移动端发起提案应在弹窗内完成。')
  await page.getByTestId('online-society-proposal-submit').click()
  await expect(page.getByTestId('online-society-proposal-dialog')).toHaveCount(0)
  await expect(page.getByTestId('online-society-proposal-list')).toContainText('移动端提案弹窗')

  await page.getByTestId('online-society-proposal-close-trigger-prop-mobile-schedule').click()
  await expect(page.getByTestId('online-society-proposal-close-dialog')).toBeVisible()
  await expect(page.getByTestId('online-society-proposal-close-impact-list')).toContainText('本周节会排班')
  await expect(page.getByTestId('online-society-proposal-close-impact-list')).toContainText('赞成 3 / 反对 1 / 暂缓 0')
  await page.getByTestId('online-society-proposal-close-note-input').fill('按多数票执行，本周先试运行。')
  await page.getByTestId('online-society-proposal-close-confirm').click()
  await expect(page.getByTestId('online-society-proposal-close-dialog')).toHaveCount(0)
  await expect(page.getByTestId('online-society-proposal-archive-note-prop-mobile-schedule')).toBeVisible()
  await page.getByTestId('online-society-proposal-archive-note-prop-mobile-schedule').locator('summary').click()
  await expect(page.getByTestId('online-society-proposal-archive-note-prop-mobile-schedule')).toContainText('按多数票执行')

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyBridgeMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByText('清溪桥社').first()).toBeVisible()
  await expect(page.getByTestId('online-module-tab-projects')).toBeVisible()
  await page.getByTestId('online-module-tab-projects').click()

  await expect(page.getByTestId('async-community-board')).toBeVisible()
  await expect(page.getByTestId('async-community-project-compact-detail')).toContainText('搭脚手架')
  await expect(page.getByTestId('online-society-async-contribute-bridge-labor_shift')).toBeVisible()
  await page.getByTestId('online-society-async-contribute-bridge-labor_shift').click()
  await expect(page.getByTestId('async-community-project-compact-detail')).toContainText('铺桥面')
  await expect(page.getByText('移动端烟测号补上一段修桥工班，桥面推进了一截。')).toBeVisible()
  await page.getByTestId('online-society-project-detail-trigger-bridge').click()
  await expect(page.getByTestId('online-society-project-detail-sheet')).toBeVisible()
  await expect(page.getByTestId('online-society-project-stage-list')).toContainText('铺桥面')
  await expect(page.getByTestId('online-society-project-recent-contributions')).toContainText('施工行动')
  await expect(page.getByTestId('online-society-project-contributors')).toContainText('移动端烟测号')
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-society-project-detail-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-society-project-contribute-bridge-labor_shift')).toBeVisible()

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyFestivalSquareMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByText('清溪节社').first()).toBeVisible()
  await expect(page.getByTestId('online-module-tab-projects')).toBeVisible()
  await page.getByTestId('online-module-tab-projects').click()

  await expect(page.getByTestId('async-community-board')).toBeVisible()
  await expect(page.getByTestId('async-community-project-compact-detail')).toContainText('备料')
  await expect(page.getByTestId('online-society-async-contribute-festival_square-festival_scenery')).toBeVisible()
  await page.getByTestId('online-society-async-contribute-festival_square-festival_scenery').click()
  await expect(page.getByTestId('async-community-project-compact-detail')).toContainText('搭场')
  await expect(page.getByText('移动端烟测号搭起第一批节庆布景，广场开始像节会现场。')).toBeVisible()
  await page.getByTestId('async-community-project-detail-trigger').click()
  await expect(page.getByTestId('online-society-project-detail-sheet')).toBeVisible()
  await expect(page.getByTestId('online-society-project-stage-list')).toContainText('搭场')
  await expect(page.getByTestId('online-society-project-recent-contributions')).toContainText('布景搭设')
  await expect(page.getByTestId('online-society-project-history')).toContainText('移动端烟测号搭起第一批节庆布景')
  await expect(page.getByTestId('online-society-project-detail-room-launch')).toContainText('节庆广场开幕')
  await expect(page.getByTestId('online-society-project-detail-room-launch')).toContainText('创建房间')
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-society-project-detail-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-society-project-contribute-festival_square-festival_scenery')).toBeVisible()

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineSocietyWarehouseMobile(page) {
  await expect(page.getByTestId('online-society-page')).toBeVisible()
  await expect(page.getByText('清溪仓社').first()).toBeVisible()
  await expect(page.getByTestId('online-module-tab-storage')).toBeVisible()
  await page.getByTestId('online-module-tab-storage').click()

  await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('待入仓')
  await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('0/5 类齐备')
  await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('节会成本下降')
  await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('公共任务加成')
  await expect(page.getByTestId('online-society-warehouse-deposit-herb_mugwort')).toBeVisible()
  await expect(page.getByTestId('online-society-warehouse-deposit-wood_bundle')).toBeVisible()
  await expect(page.getByTestId('online-society-warehouse-deposit-cloth_roll')).toBeVisible()
  await expect(page.getByTestId('online-society-warehouse-deposit-fish_basket')).toBeVisible()

  await page.getByTestId('online-society-warehouse-deposit-grain_rice').click()

  await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('收集中')
  await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('1/5 类齐备')
  await expect(page.getByTestId('online-society-page')).toContainText('移动端烟测号 补入了 稻米入仓')
  await expect(page.getByTestId('online-society-warehouse-consume-panel')).toContainText('公共消耗')
  await expect(page.getByTestId('online-society-warehouse-consume-panel')).toContainText('只扣公共仓')

  await page.getByTestId('online-society-warehouse-consume-laba_cookpot_base').click()

  await expect(page.getByTestId('online-society-warehouse-consume-confirm')).toHaveCount(1)
  await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('腊八共灶底料')
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('只扣公共仓')
  await expect(page.getByTestId('online-confirm-asset-list')).toContainText('稻米 x2')
  await expect(page.getByTestId('online-confirm-asset-list')).toContainText('不扣个人背包')
  await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeDisabled()
  await page.getByTestId('online-confirm-required-text').fill('确认公共消耗')
  await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeEnabled()
  await page.getByTestId('online-confirm-action-dialog-confirm').click()

  await expect(page.getByTestId('online-confirm-action-dialog')).toHaveCount(0)
  await expect(page.getByTestId('online-society-page')).toContainText('移动端烟测号 消耗了 腊八共灶底料')
  await expect(page.getByTestId('online-society-page')).toContainText('只扣公共仓')

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-society-page"]')
    if (!root) return ['online-society-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .async-community-board__project-tabs')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineManorCareRoomMobile(page) {
  await expect(page.getByTestId('online-manor-page')).toBeVisible()
  await expect(page.getByTestId('online-module-tab-care')).toBeVisible()
  await page.getByTestId('online-module-tab-care').click()

  await expect(page.getByTestId('visual-scene-board')).toBeVisible()
  await expect(page.getByTestId('visual-scene-hotzone-stage')).toBeVisible()
  await expect(page.getByTestId('visual-scene-object-list')).toBeVisible()
  await expect(page.getByTestId('visual-scene-list-object-manor_field')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-readable-limits')).toContainText('访客今日照料')
  await expect(page.getByTestId('online-manor-care-room-panel')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-room-create-dialog-trigger')).toBeVisible()
  await page.getByTestId('online-manor-care-room-create-dialog-trigger').click()
  await expect(page.getByTestId('online-manor-care-room-create-dialog')).toBeVisible()
  await expect(page.getByTestId('online-action-dialog')).toBeVisible()
  await page.getByTestId('online-manor-care-room-create').click()

  await expect(page.getByTestId('online-manor-care-room-list')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-room-entry')).toContainText('护理中')
  await expect(page.getByTestId('online-manor-care-room-entry')).toContainText('移动端烟测号')
  await expect(page.getByTestId('online-manor-care-room-detail-sheet')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-room-progress-summary')).toContainText('成员 2/2')
  await page.getByTestId('online-manor-care-room-action').first().click()

  await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作灌溉')
  await expect(page.getByTestId('online-manor-care-room-detail-sheet').getByTestId('online-manor-care-room-risk-summary')).toContainText('累计风险')
  await page.getByTestId('online-manor-care-room-action').first().click()
  await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作喂食')
  await expect(page.getByTestId('online-manor-care-room-settle')).toBeVisible()
  await page.getByTestId('online-manor-care-room-settle').click()
  await expect(page.getByTestId('online-manor-care-room-settle-confirm')).toHaveCount(1)
  await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-confirm-impact-list')).toContainText('分工进度')
  await expect(page.getByTestId('online-confirm-asset-list')).toContainText('健康收口')
  await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeDisabled()
  await page.getByTestId('online-confirm-required-text').fill('确认结算护理')
  await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeEnabled()
  await page.getByTestId('online-confirm-action-dialog-confirm').click()

  await expect(page.getByTestId('online-manor-care-room-settle-confirm')).toHaveCount(0)
  await expect(page.getByTestId('online-manor-care-room-detail-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-manor-care-room-records')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-room-record')).toContainText('护理房间已结算')
  await expect(page.getByTestId('online-manor-care-room-record-settlement')).toContainText('mobile-smoke-care-room-settlement')
  await expect(page.getByTestId('online-manor-care-room-record-actions')).toContainText('协作灌溉')
  await expect(page.getByTestId('online-manor-care-room-record-actions')).toContainText('协作喂食')

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-manor-page"]')
    if (!root) return ['online-manor-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .visual-scene-board__stage')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])

  const smallSceneTargets = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="visual-scene-board"]')
    if (!root) return ['visual-scene-board']
    return Array.from(document.querySelectorAll([
      'button[data-testid^="visual-scene-object-"]',
      'button[data-testid^="visual-scene-list-object-"]',
      'button[data-testid="visual-scene-detail-sheet-trigger"]',
      'button[data-testid^="visual-scene-action-"]'
    ].join(',')))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.getAttribute('data-testid') || element.textContent?.trim() || element.tagName,
          width: rect.width,
          height: rect.height,
        }
      })
      .filter(entry => entry.width < 44 || entry.height < 44)
      .map(entry => entry.label)
  })

  expect(smallSceneTargets).toEqual([])
}

async function prepareOnlineManorOwnerIdentityMobile(page) {
  await expect(page.getByTestId('online-manor-page')).toBeVisible()
  await expect(page.getByTestId('online-manor-owner-primary-actions')).toBeVisible()
  await expect(page.getByTestId('online-manor-owner-primary-actions')).toContainText('管理展示')
  await expect(page.getByTestId('online-manor-owner-primary-actions')).toContainText('查看留言')
  await expect(page.getByTestId('online-manor-owner-primary-actions')).toContainText('处理照料')
  await expect(page.getByTestId('online-manor-visitor-primary-actions')).toHaveCount(0)
  await expect(page.getByTestId('online-manor-overview-latest-summary')).toContainText('最新留言')
  await expect(page.getByTestId('online-manor-overview-latest-summary')).toContainText('最新照料')

  await page.getByTestId('online-manor-owner-primary-manage-theme').click()
  await expect(page.getByTestId('online-action-dialog')).toBeVisible()
  await expect(page.getByTestId('online-manor-theme-label-input')).toBeVisible()
  await page.getByTestId('online-action-dialog-cancel').click()
  await page.getByTestId('online-module-tab-overview').click()
  await page.getByTestId('online-manor-owner-primary-guestbook').click()
  await expect(page.getByTestId('online-manor-guestbook-list')).toContainText('青禾访客')
  await page.getByTestId('online-module-tab-theme').click()
  await page.getByTestId('online-manor-cover-upload-dialog-trigger').click()
  await expect(page.getByTestId('online-manor-cover-upload-dialog')).toBeVisible()
  await expect(page.getByTestId('online-manor-cover-alt-input')).toBeVisible()

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-manor-page"]')
    if (!root) return ['online-manor-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .visual-scene-board__stage')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function prepareOnlineManorLimitedStealMobile(page) {
  await expect(page.getByTestId('online-manor-page')).toBeVisible()
  await expect(page.getByTestId('online-manor-hero')).toBeVisible()
  await expect(page.getByTestId('online-manor-quick-actions')).toBeVisible()
  await expect(page.getByTestId('online-manor-visitor-primary-actions')).toBeVisible()
  await expect(page.getByTestId('online-manor-visitor-primary-actions').locator('button')).toHaveCount(4)
  await expect(page.getByTestId('online-manor-visitor-primary-visit')).toBeVisible()
  await expect(page.getByTestId('online-manor-visitor-primary-actions')).toContainText('留言')
  await expect(page.getByTestId('online-manor-visitor-primary-actions')).toContainText('照料')
  await expect(page.getByTestId('online-manor-visitor-primary-actions')).toContainText('轻采')
  await expect(page.getByTestId('online-manor-visit-card')).toBeVisible()
  await expect(page.getByTestId('online-manor-activity-feed')).toBeVisible()
  await expect(page.getByTestId('online-manor-owner-primary-actions')).toHaveCount(0)
  await expect(page.getByTestId('online-manor-visitor-action-status')).toContainText('轻采：可轻采')

  await page.getByTestId('online-manor-visitor-primary-guestbook').click()
  await expect(page.getByTestId('online-manor-guestbook-dialog')).toBeVisible()
  await expect(page.getByTestId('online-manor-guestbook-input')).toBeVisible()
  await page.getByTestId('online-action-dialog-cancel').click()
  await page.getByTestId('online-module-tab-overview').click()
  await page.getByTestId('online-manor-visitor-primary-care').click()
  await expect(page.getByTestId('visual-scene-board')).toBeVisible()
  await expect(page.getByTestId('visual-scene-detail-sheet-trigger')).toBeVisible()
  await page.getByTestId('online-module-tab-overview').click()
  await page.getByTestId('online-manor-visitor-primary-steal').click()
  await expect(page.getByTestId('visual-scene-board')).toBeVisible()
  await expect(page.getByTestId('online-manor-steal-readable-limits')).toContainText('0/2')
  await expect(page.getByTestId('visual-scene-detail-sheet-trigger')).toBeVisible()

  await page.getByTestId('visual-scene-object-mobile_smoke_apple_tree').click()
  await expect(page.getByTestId('online-bottom-sheet')).toBeVisible()
  await expect(page.getByTestId('visual-scene-object-detail')).toContainText('雨后苹果树')
  await page.getByTestId('visual-scene-action-light_harvest').click()
  await expect(page.getByTestId('visual-scene-action-result')).toContainText('移动端烟测号轻采了雨后苹果树')
  await page.getByTestId('online-bottom-sheet-close').click()
  await expect(page.getByTestId('online-bottom-sheet')).toHaveCount(0)
  await expect(page.getByTestId('online-manor-steal-readable-limits')).toContainText('1/2')
  await expect(page.getByTestId('online-manor-steal-anti-abuse-summary')).toContainText('移动端烟测号 1/2')
  await expect(page.getByTestId('online-manor-steal-log')).toContainText('移动端烟测号 · 轻采果实')
  await page.getByTestId('online-manor-steal-detail-trigger').first().click()
  const stealDetailSheet = page.getByTestId('online-manor-steal-detail-sheet')
  await expect(stealDetailSheet).toBeVisible()
  await stealDetailSheet.getByTestId('online-technical-details-toggle').click()
  await expect(stealDetailSheet.getByTestId('online-manor-steal-receipt-guard')).toContainText('mobile-smoke-steal-receipt')
  await expect(stealDetailSheet.getByTestId('online-manor-steal-receipt-guard')).toContainText('主人保留 100%')
  await expect(stealDetailSheet.getByTestId('online-manor-steal-use-summary')).toContainText('料理、订单与节会备料')

  const clippedControls = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="online-manor-page"]')
    if (!root) return ['online-manor-page']
    return Array.from(root.querySelectorAll('button, input, select, textarea'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.textContent?.trim() || element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto, .visual-scene-board__stage')),
        }
      })
      .filter(entry => !entry.inHorizontalScroller && (
        entry.left < -1 || entry.right > window.innerWidth + 1 || entry.width > window.innerWidth + 1
      ))
      .map(entry => entry.label)
  })

  expect(clippedControls).toEqual([])
}

async function main() {
  try {
    const probeBrowser = await chromium.launch()
    await probeBrowser.close()
  } catch (error) {
    if (isPlaywrightEnvironmentError(error)) {
      console.log('[qa-mobile-ui-smoke] Skipped: current environment cannot launch Playwright Chromium (spawn EPERM).')
      return
    }
    throw error
  }

  assertShippingBoxSourceGuards()
  await mkdir(outputDir, { recursive: true })
  const shouldLaunchServer = shouldStartDevServer && !(await isTcpServerReachable(baseURL))
  const server = shouldLaunchServer ? startDevServer() : null
  const stopServer = () => {
    stopProcessTree(server?.child)
  }

  try {
    await waitForStartedDevServer(server)
    const browser = await chromium.launch()
    try {
      await captureScenario({
        browser,
        label: '01-shop-mobile-390x844',
        hash: '/#/game/shop',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="shop-primary-action-card"]',
        assertPage: assertShopTradeDefault
      })
      await captureScenario({
        browser,
        label: '02-quest-mobile-390x844',
        hash: '/#/game/quest',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="quest-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '03-region-map-mobile-390x844',
        hash: '/#/game/region-map',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="region-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '04-shop-mobile-360x780',
        hash: '/#/game/shop',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="shop-primary-action-card"]',
        assertPage: assertShopTradeDefault
      })
      await captureScenario({
        browser,
        label: '05-quest-mobile-360x780',
        hash: '/#/game/quest',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="quest-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '06-region-map-mobile-360x780',
        hash: '/#/game/region-map',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="region-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '07-shop-mobile-430x932',
        hash: '/#/game/shop',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="shop-primary-action-card"]',
        assertPage: assertShopTradeDefault
      })
      await captureScenario({
        browser,
        label: '08-quest-mobile-430x932',
        hash: '/#/game/quest',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="quest-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '09-region-map-mobile-430x932',
        hash: '/#/game/region-map',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="region-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '10-region-map-expedition-mobile-390x844',
        hash: '/#/game/region-map',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="region-expedition-stage"]',
        prepare: ensureManualExpedition
      })
      await captureScenario({
        browser,
        label: '11-region-map-aftermath-mobile-390x844',
        hash: '/#/game/region-map',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="journey-settlement-stage-aftermath"]',
        prepare: driveSettlementToAftermath
      })
      await captureScenario({
        browser,
        label: '12-mobile-map-menu-390x844',
        hash: '/#/game/shop',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="mobile-map-menu"]',
        prepare: async page => {
          await expect(page.getByTestId('top-goals-compact-card')).toHaveCount(0)
          await page.getByTestId('mobile-hub-button').click()
          await expect(page.getByTestId('mobile-map-menu')).toBeVisible()
          await expect(page.getByTestId('mobile-map-menu-primary-entry')).toBeVisible()
          const personalArea = page.getByTestId('mobile-map-personal-area')
          await expect(personalArea).toBeVisible()
          await expect(personalArea.getByTestId('mobile-map-loc-wallet')).toBeVisible()
          await expect(personalArea.getByTestId('mobile-map-loc-goals')).toBeVisible()
          await expect(personalArea.getByTestId('mobile-map-loc-mail')).toBeVisible()

          const personalOrder = await personalArea.evaluate(area =>
            Array.from(area.querySelectorAll('[data-testid^="mobile-map-loc-"]'))
              .map(element => element.getAttribute('data-testid'))
          )
          const walletIndex = personalOrder.indexOf('mobile-map-loc-wallet')
          const goalsIndex = personalOrder.indexOf('mobile-map-loc-goals')
          const mailIndex = personalOrder.indexOf('mobile-map-loc-mail')
          expect(walletIndex).toBeGreaterThanOrEqual(0)
          expect(goalsIndex).toBe(walletIndex + 1)
          expect(mailIndex).toBe(goalsIndex + 1)

          await personalArea.getByTestId('mobile-map-loc-goals').click()
          await expect(page.getByTestId('mobile-map-menu')).toHaveCount(0)
          await expect(page).toHaveURL(/\/game\/goals/)
          await expect(page.getByTestId('goals-page')).toBeVisible()
          await expect(page.getByTestId('goals-summary')).toBeVisible()
          await expect(page.getByTestId('goals-tab-daily')).toBeVisible()
          await expect(page.getByTestId('goals-list')).toBeVisible()
          await page.getByTestId('mobile-hub-button').click()
          await expect(page.getByTestId('mobile-map-menu')).toBeVisible()
        }
      })
      await captureScenario({
        browser,
        label: '13-wallet-mobile-390x844',
        hash: '/#/game/wallet',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="wallet-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '14-guild-mobile-390x844',
        hash: '/#/game/guild',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="guild-primary-action-card"]',
        assertPage: assertGameBottomRevealGesture
      })
      await captureScenario({
        browser,
        label: '15-fishpond-mobile-390x844',
        hash: '/#/game/fishpond',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="fishpond-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '16-wallet-mobile-360x780',
        hash: '/#/game/wallet',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="wallet-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '17-guild-mobile-360x780',
        hash: '/#/game/guild',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="guild-primary-action-card"]',
        assertPage: assertGameBottomRevealGesture
      })
      await captureScenario({
        browser,
        label: '18-fishpond-mobile-360x780',
        hash: '/#/game/fishpond',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="fishpond-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '19-wallet-mobile-430x932',
        hash: '/#/game/wallet',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="wallet-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '20-guild-mobile-430x932',
        hash: '/#/game/guild',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="guild-primary-action-card"]',
        assertPage: assertGameBottomRevealGesture
      })
      await captureScenario({
        browser,
        label: '21-fishpond-mobile-430x932',
        hash: '/#/game/fishpond',
        viewport: { width: 430, height: 932 },
        primarySelector: '[data-testid="fishpond-primary-action-card"]'
      })
      await captureScenario({
        browser,
        label: '22-region-social-friend-panel-mobile-390x844',
        hash: '/#/game/friend-station',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="region-social-friend-panel"]',
        mockSocial: true,
        prepare: prepareRegionSocialFriendPanel
      })
      await captureScenario({
        browser,
        label: '23-region-social-friend-panel-mobile-360x780',
        hash: '/#/game/friend-station',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="region-social-friend-panel"]',
        mockSocial: true,
        prepare: prepareRegionSocialFriendPanel
      })
      await captureScenario({
        browser,
        label: '24-online-center-mobile-390x844',
        hash: '/#/game/online',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-center-hero-actions"]',
        prepare: prepareOnlineCenterMobile
      })
      await captureScenario({
        browser,
        label: '25-online-festival-room-wizard-mobile-390x844',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-bottom-sheet"]',
        mockFestivalRoom: true,
        prepare: prepareOnlineFestivalRoomWizardMobile
      })
      await captureScenario({
        browser,
        label: '26-online-festival-room-lobby-mobile-390x844',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-bottom-sheet"]',
        mockFestivalRoom: true,
        mockFestivalRoomState: 'host-running',
        prepare: prepareOnlineFestivalRoomLobbyMobile
      })
      await captureScenario({
        browser,
        label: '36-online-festival-room-invite-panel-mobile-390x844',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-bottom-sheet"]',
        mockFestivalRoom: true,
        mockFestivalRoomState: 'host-running',
        prepare: prepareOnlineFestivalRoomInvitePanelMobile
      })
      await captureScenario({
        browser,
        label: '27-online-festival-room-settle-confirm-mobile-390x844',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-confirm-action-dialog"]',
        mockFestivalRoom: true,
        mockFestivalRoomState: 'host-running',
        prepare: prepareOnlineFestivalRoomSettleConfirmMobile
      })
      await captureScenario({
        browser,
        label: '38-online-cohabitation-family-festival-confirm-mobile-390x844',
        hash: '/#/game/online/cohabitation?tab=festivalSeats',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-confirm-action-dialog"]',
        mockCohabitation: true,
        prepare: prepareOnlineCohabitationFamilyFestivalConfirmMobile
      })
      await captureScenario({
        browser,
        label: '25-online-orders-mobile-390x844',
        hash: '/#/game/online/orders',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-orders-page"]',
        mockOrders: true,
        prepare: prepareOnlineOrdersMobile
      })
      await captureScenario({
        browser,
        label: '26-online-center-mobile-360x780',
        hash: '/#/game/online',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-center-hero-actions"]',
        prepare: prepareOnlineCenterMobile
      })
      await captureScenario({
        browser,
        label: '27-online-festival-room-wizard-mobile-360x780',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-bottom-sheet"]',
        mockFestivalRoom: true,
        prepare: prepareOnlineFestivalRoomWizardMobile
      })
      await captureScenario({
        browser,
        label: '28-online-festival-room-lobby-mobile-360x780',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-bottom-sheet"]',
        mockFestivalRoom: true,
        mockFestivalRoomState: 'host-running',
        prepare: prepareOnlineFestivalRoomLobbyMobile
      })
      await captureScenario({
        browser,
        label: '37-online-festival-room-invite-panel-mobile-360x780',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-bottom-sheet"]',
        mockFestivalRoom: true,
        mockFestivalRoomState: 'host-running',
        prepare: prepareOnlineFestivalRoomInvitePanelMobile
      })
      await captureScenario({
        browser,
        label: '29-online-festival-room-settle-confirm-mobile-360x780',
        hash: '/#/game/online/festival?tab=festival-room',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-confirm-action-dialog"]',
        mockFestivalRoom: true,
        mockFestivalRoomState: 'host-running',
        prepare: prepareOnlineFestivalRoomSettleConfirmMobile
      })
      await captureScenario({
        browser,
        label: '39-online-cohabitation-family-festival-confirm-mobile-360x780',
        hash: '/#/game/online/cohabitation?tab=festivalSeats',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-confirm-action-dialog"]',
        mockCohabitation: true,
        prepare: prepareOnlineCohabitationFamilyFestivalConfirmMobile
      })
      await captureScenario({
        browser,
        label: '40-cottage-cohabitation-entry-mobile-390x844',
        hash: '/#/game/cottage',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-cohabitation-page"]',
        mockCohabitation: true,
        prepare: prepareCottageCohabitationEntryMobile
      })
      await captureScenario({
        browser,
        label: '41-cottage-cohabitation-entry-mobile-360x780',
        hash: '/#/game/cottage',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-cohabitation-page"]',
        mockCohabitation: true,
        prepare: prepareCottageCohabitationEntryMobile
      })
      await captureScenario({
        browser,
        label: '42-farm-cohabitation-switch-mobile-390x844',
        hash: '/#/game/farm',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-cohabitation-page"]',
        mockCohabitation: true,
        prepare: prepareFarmCohabitationSwitchMobile,
        assertPage: assertGameBottomRevealGesture
      })
      await captureScenario({
        browser,
        label: '43-farm-cohabitation-switch-mobile-360x780',
        hash: '/#/game/farm',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-cohabitation-page"]',
        mockCohabitation: true,
        prepare: prepareFarmCohabitationSwitchMobile,
        assertPage: assertGameBottomRevealGesture
      })
      await captureScenario({
        browser,
        label: '46-online-expedition-room-main-mobile-390x844',
        hash: '/#/game/expedition-room',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="expedition-room-page"]',
        mockExpeditionRoom: true,
        mockExpeditionRoomState: 'host-running',
        prepare: prepareExpeditionRoomMainFlowMobile
      })
      await captureScenario({
        browser,
        label: '47-online-expedition-room-main-mobile-360x780',
        hash: '/#/game/expedition-room',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="expedition-room-page"]',
        mockExpeditionRoom: true,
        mockExpeditionRoomState: 'host-running',
        prepare: prepareExpeditionRoomMainFlowMobile
      })
      await captureScenario({
        browser,
        label: '27-online-orders-mobile-360x780',
        hash: '/#/game/online/orders',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-orders-page"]',
        mockOrders: true,
        prepare: prepareOnlineOrdersMobile
      })
      await captureScenario({
        browser,
        label: '28-online-society-projects-mobile-390x844',
        hash: '/#/game/online/society?tab=projects',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        prepare: prepareOnlineSocietyProjectsMobile
      })
      await captureScenario({
        browser,
        label: '29-online-society-projects-mobile-360x780',
        hash: '/#/game/online/society?tab=projects',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        prepare: prepareOnlineSocietyProjectsMobile
      })
      await captureScenario({
        browser,
        label: '30-online-society-bridge-mobile-390x844',
        hash: '/#/game/online/society?tab=projects',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyProject: 'bridge',
        prepare: prepareOnlineSocietyBridgeMobile
      })
      await captureScenario({
        browser,
        label: '31-online-society-bridge-mobile-360x780',
        hash: '/#/game/online/society?tab=projects',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyProject: 'bridge',
        prepare: prepareOnlineSocietyBridgeMobile
      })
      await captureScenario({
        browser,
        label: '32-online-society-festival-square-mobile-390x844',
        hash: '/#/game/online/society?tab=projects',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyProject: 'festival_square',
        prepare: prepareOnlineSocietyFestivalSquareMobile
      })
      await captureScenario({
        browser,
        label: '33-online-society-festival-square-mobile-360x780',
        hash: '/#/game/online/society?tab=projects',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyProject: 'festival_square',
        prepare: prepareOnlineSocietyFestivalSquareMobile
      })
      await captureScenario({
        browser,
        label: '38-online-society-warehouse-mobile-390x844',
        hash: '/#/game/online/society?tab=storage',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyProject: 'warehouse',
        prepare: prepareOnlineSocietyWarehouseMobile
      })
      await captureScenario({
        browser,
        label: '39-online-society-warehouse-mobile-360x780',
        hash: '/#/game/online/society?tab=storage',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyProject: 'warehouse',
        prepare: prepareOnlineSocietyWarehouseMobile
      })
      await captureScenario({
        browser,
        label: '40-online-society-create-mobile-390x844',
        hash: '/#/game/online/society',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyMode: 'create',
        prepare: prepareOnlineSocietyCreateMobile
      })
      await captureScenario({
        browser,
        label: '41-online-society-create-mobile-360x780',
        hash: '/#/game/online/society',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyMode: 'create',
        prepare: prepareOnlineSocietyCreateMobile
      })
      await captureScenario({
        browser,
        label: '42-online-society-requests-mobile-390x844',
        hash: '/#/game/online/society?tab=members',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyMode: 'management',
        prepare: prepareOnlineSocietyRequestsMobile
      })
      await captureScenario({
        browser,
        label: '43-online-society-requests-mobile-360x780',
        hash: '/#/game/online/society?tab=members',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyMode: 'management',
        prepare: prepareOnlineSocietyRequestsMobile
      })
      await captureScenario({
        browser,
        label: '44-online-society-proposals-mobile-390x844',
        hash: '/#/game/online/society?tab=proposals',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyMode: 'management',
        prepare: prepareOnlineSocietyProposalsMobile
      })
      await captureScenario({
        browser,
        label: '45-online-society-proposals-mobile-360x780',
        hash: '/#/game/online/society?tab=proposals',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-society-page"]',
        mockSociety: true,
        mockSocietyMode: 'management',
        prepare: prepareOnlineSocietyProposalsMobile
      })
      await captureScenario({
        browser,
        label: '36-online-manor-limited-steal-mobile-390x844',
        hash: '/#/game/online/manor',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        mockManorMode: 'limited-steal',
        prepare: prepareOnlineManorLimitedStealMobile
      })
      await captureScenario({
        browser,
        label: '37-online-manor-limited-steal-mobile-360x780',
        hash: '/#/game/online/manor',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        mockManorMode: 'limited-steal',
        prepare: prepareOnlineManorLimitedStealMobile
      })
      await captureScenario({
        browser,
        label: '46-online-manor-owner-identity-mobile-390x844',
        hash: '/#/game/online/manor',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        mockManorMode: 'owner-identity',
        prepare: prepareOnlineManorOwnerIdentityMobile
      })
      await captureScenario({
        browser,
        label: '47-online-manor-owner-identity-mobile-360x780',
        hash: '/#/game/online/manor',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        mockManorMode: 'owner-identity',
        prepare: prepareOnlineManorOwnerIdentityMobile
      })
      await captureScenario({
        browser,
        label: '34-online-manor-care-room-mobile-390x844',
        hash: '/#/game/online/manor',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        prepare: prepareOnlineManorCareRoomMobile
      })
      await captureScenario({
        browser,
        label: '35-online-manor-care-room-mobile-360x780',
        hash: '/#/game/online/manor',
        viewport: { width: 360, height: 780 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        prepare: prepareOnlineManorCareRoomMobile
      })
    } finally {
      await browser.close()
    }

    const summaryPath = path.resolve(outputDir, 'summary.json')
    const summary = {
      generatedAt: new Date().toISOString(),
      screenshots,
      pageChecks,
      consoleErrors: [...new Set(consoleErrors)],
      pageErrors: [...new Set(pageErrors)],
      requestFailures: [...new Set(requestFailures)],
      notes: [
        '使用 region_map_showcase 样例档生成 390x844 / 360x780 / 430x932 三档移动端截图。',
        '首屏判定以当前页主操作卡或当前场景主面板进入视口为准。',
        '好友驿站场景使用 mock 登录态与好友关系数据，覆盖存档 ID 搜索、申请入口、好友条目、送礼 / 邀请进房互动入口、最近互动、拉黑列表和移动端横向溢出断言。',
        '在线中心与在线委托场景覆盖 390x844 与 360x780 视口下的模块卡可见性、二级导航切换、表单字段、公共订单接力路线按钮点击、故事流转图和主要按钮布局。',
        '在线节会房场景使用 mock 登录态与房间模板数据，覆盖 390x844 与 360x780 视口下创建向导底部抽屉、运行中准备大厅主行动、邀请面板批量发送、结算确认弹窗、footer 主按钮、关闭按钮、背景滚动锁定和横向溢出断言。',
        '共同庄园家族节会场景使用 mock 登录态与节会席位数据，覆盖 390x844 与 360x780 视口下结算确认弹窗、影响对象、资产变化、恢复提示、确认文字门槛和横向溢出断言。',
        '在线村社场景使用 mock 登录态与村社公共建设数据，覆盖花灯墙写愿望、修桥施工行动、节庆筹备布景搭设、贡献后阶段反馈和移动端横向溢出断言。',
        '在线庄园场景使用 mock 登录态与护理房 / 身份 / 轻采数据，覆盖主人主行动、访客留言 / 照料 / 轻采入口、2 人护理房创建、灌溉 / 喂食分工点击、结算凭证回看和移动端横向溢出断言。'
      ]
    }
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8')
    console.log(`Saved mobile UI smoke summary to ${summaryPath}`)
  } finally {
    stopServer()
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
