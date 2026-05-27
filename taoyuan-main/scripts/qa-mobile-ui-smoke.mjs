import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findAvailablePort, isPlaywrightEnvironmentError } from './port-utils.mjs'
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
const sampleId = 'region_map_showcase'

const consoleErrors = []
const pageErrors = []
const requestFailures = []
const screenshots = []
const pageChecks = []

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

async function isServerReachable(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(url)) return
    await wait(1000)
  }
  throw new Error(`Timed out waiting for dev server at ${url}`)
}

function startDevServer() {
  const child = process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run dev -- --host ${host} --port ${port} --strictPort`], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      })
    : spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      })

  child.stdout.on('data', chunk => {
    process.stdout.write(chunk)
  })
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk)
  })

  return child
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

function buildMobileSmokeSocietyOverview(contributed = false) {
  const lanternWallProject = buildMobileSmokeLanternWallProject(contributed)
  return {
    ok: true,
    bulletin: '移动端村社 smoke',
    my_society: {
      id: 'mobile-smoke-society',
      name: '清溪灯社',
      summary: '移动端公共建设测试村社',
      notice: '本周先点亮花灯墙。',
      emblem: 'lantern_medallion',
      emblem_label: '灯章',
      theme: 'festival_hosts',
      theme_label: '节会主办',
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
      public_projects: [lanternWallProject],
      visual_state: {
        ...emptyVisualState,
        board_type: 'async',
        board_id: 'society_public_projects',
        selected_visual_id: 'lantern_wall',
        recent_feedback: contributed ? '移动端烟测号写下一张愿望签，花灯墙亮了一角。' : '',
        async_projects: [buildMobileSmokeLanternWallVisualProject(contributed)]
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
      public_warehouse: {
        funds: 0,
        items: [],
        logs: [],
        deposit_options: [],
        weekly_settlement: {
          total_points: 0,
          contributor_count: 0,
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
    public_project_defs: [{ id: 'lantern_wall', label: '共建花灯墙', summary: '', target_progress: 100 }],
    public_project_package_options: lanternWallProject.contribution_packages
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
        { stage_id: 'stage_collect', stage_title: '采收青菜', sequence: 1, share_percent: 31, reward_value: 80, settlement_route: 'personal', receipt_id: 'receipt-stage-collect', status: 'confirmed' },
        { stage_id: 'stage_process', stage_title: '加工干菜', sequence: 2, share_percent: 35, reward_value: 90, settlement_route: 'personal', receipt_id: '', status: accepted ? 'pending' : 'planned' },
        { stage_id: 'stage_deliver', stage_title: '送到灯会', sequence: 3, share_percent: 34, reward_value: 90, settlement_route: 'personal', receipt_id: '', status: 'planned' }
      ]
    },
    created_at: 1,
    updated_at: accepted ? 3 : 2
  }
}

function buildMobileSmokeCoopOrderOverview(accepted = false) {
  return {
    ok: true,
    orders: [buildMobileSmokeRelayOrder(accepted)],
    receipts: [],
    compensations: [],
    board_summary: {
      total_orders: 1,
      open_orders: 1,
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
      recent_receipts: []
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

function buildMobileSmokeManorSnapshot(careRoomStep = 'empty') {
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
  return {
    username: 'orchard_owner',
    display_name: '远山果匠',
    visibility: 'public',
    viewer_is_owner: false,
    manor_name: '远山果园',
    avatar_image_url: '',
    avatar_image_alt: '',
    cover_image_url: '',
    cover_image_alt: '',
    public_title: '果林庄园主',
    showcase_theme: '雨后果林护理日',
    season_progress: '春 2 年',
    current_focus: '协作护理田地和畜棚',
    weekly_goal: '完成一次 2 人护理房',
    visual_summary: '田地、畜棚和果树开放护理',
    placed_decoration_count: 0,
    public_tags: [],
    guestbook_entries: [],
    visit_entries: [],
    visitor_activity_entries: [],
    guide_points: [],
    guide_routes: [],
    today_visit_summary: '今日 1 次护理协作',
    is_favorited_by_viewer: false,
    is_followed_by_viewer: false,
    access_policy: {
      visit_mode: 'public',
      care_mode: 'public',
      steal_mode: 'closed',
      updated_at: 1,
      options: [
        { id: 'public', label: '公开' },
        { id: 'friends', label: '好友' },
        { id: 'mutual', label: '互关' },
        { id: 'closed', label: '关闭' }
      ]
    },
    relation_context: {
      viewer_is_owner: false,
      viewer_is_friend: true,
      viewer_is_mutual: true,
      viewer_follows_owner: true,
      owner_follows_viewer: true,
      mutual_follow: true,
      can_visit: true,
      can_care: true,
      can_steal: false
    },
    visual_state: {
      ...emptyVisualState,
      board_type: 'scene',
      board_id: 'manor_care_scene',
      selected_visual_id: 'manor_field',
      recent_feedback: careRoomStep === 'settled' ? '协作护理房已结算，健康度凭证已写入。' : '',
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
        }
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
      action_labels: {},
      action_effects: {},
      limits: { visitor_daily_limit: 2, manor_daily_limit: 6, object_daily_limit: 1 },
      visitor_daily_count: 0,
      manor_daily_count: 0,
      remaining_steal_count: 0,
      manor_remaining_steal_count: 0,
      can_steal: false,
      steal_denied_reason: '轻采已关闭。',
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
        owner_reserved_percent: 100,
        visitor_reward_quantity_cap: 1,
        reward_cap_summary: '轻采当前关闭。',
        settlement_summary: '主人库存保留 100%。'
      },
      whitelist_summary: '轻采关闭',
      target_use_hints: {}
    },
    care_entries: [],
    steal_entries: [],
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
  const mockOrders = Boolean(options.mockOrders)
  const mockManor = Boolean(options.mockManor)
  const context = await browser.newContext({
    viewport,
    locale: 'zh-CN',
    reducedMotion: 'reduce'
  })
  if (mockSociety || mockOrders || mockManor) {
    await context.addInitScript(() => {
      window.localStorage.setItem('taoyuanxiang_current_account', 'mobile_smoke_owner')
    })
  }
  const page = await context.newPage()

  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSocial || mockSociety || mockOrders || mockManor
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
    await page.route('**/api/taoyuan/online/societies', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeSocietyOverview(societyContributed))
      })
    })
    await page.route('**/api/taoyuan/online/societies/public-projects/*/contribute', async route => {
      societyContributed = true
      const overview = buildMobileSmokeSocietyOverview(societyContributed)
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
  }

  if (mockOrders) {
    let orderAccepted = false
    await page.route('**/api/taoyuan/online/orders', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMobileSmokeCoopOrderOverview(orderAccepted))
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
        body: JSON.stringify({ ok: true, snapshot: buildMobileSmokeManorSnapshot(careRoomStep) })
      })
    })
    await page.route('**/api/taoyuan/online/manor/care-rooms', async route => {
      careRoomStep = 'created'
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, room: snapshot.care_room_state.active_rooms[0], snapshot, idempotent: false })
      })
    })
    await page.route('**/api/taoyuan/online/manor/care-rooms/*/action', async route => {
      const body = route.request().postDataJSON()
      careRoomStep = body?.action_id === 'room_feed' ? 'fed' : 'irrigated'
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep)
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
      const snapshot = buildMobileSmokeManorSnapshot(careRoomStep)
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
  await page.goto(baseURL)
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible()
  await expect(page.getByRole('button', { name: '新的旅程' })).toBeVisible()
}

async function loadBuiltInSample(page, id) {
  await page.waitForFunction(() => typeof window.__TAOYUAN_SAMPLE_SAVES__?.load === 'function')
  const loaded = await page.evaluate(async targetId => {
    const api = window.__TAOYUAN_SAMPLE_SAVES__
    return api ? await api.load(targetId) : false
  }, id)
  if (!loaded) throw new Error(`Unable to load sample save ${id}`)
}

async function openSamplePage(page, hash) {
  await openHome(page)
  await loadBuiltInSample(page, sampleId)
  await page.goto(`${baseURL}${hash}`)
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
  mockOrders = false,
  mockManor = false,
  prepare
}) {
  const { context, page } = await createPage(browser, viewport, { mockSocial, mockSociety, mockOrders, mockManor })
  try {
    await openSamplePage(page, hash)
    if (prepare) {
      await prepare(page)
    }
    await clearTransientOverlays(page)

    const primary = page.locator(primarySelector)
    await expect(primary.first()).toBeVisible()
    const primaryBox = await primary.first().boundingBox()
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
  await expect(panel.getByRole('button', { name: '庄园' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '写信' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '送礼' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '邀请进房' }).first()).toBeVisible()
  await expect(panel.getByRole('button', { name: '协作' }).first()).toBeVisible()
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
  await expect(page.getByRole('heading', { name: '在线中心' })).toBeVisible()
  await expect(page.getByRole('button', { name: '刷新摘要' })).toBeVisible()
  await expect(page.getByRole('link', { name: '交流大厅' })).toBeVisible()

  for (const moduleKey of onlineCenterModuleKeys) {
    await expect(page.getByTestId(`online-module-${moduleKey}-quick-link`)).toBeVisible()
    await expect(page.getByTestId(`online-module-${moduleKey}-link`)).toBeVisible()
  }

  const layoutIssues = await page.evaluate(() => {
    const viewportHeight = window.innerHeight
    const firstCardLink = document.querySelector('[data-testid="online-module-manor-link"]')
    const firstCardTop = firstCardLink?.closest('article')?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
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
    const quickLinksBelowFirstCard = Array.from(document.querySelectorAll('[data-testid$="-quick-link"]'))
      .map(element => {
        const rect = element.getBoundingClientRect()
        return {
          testId: element.getAttribute('data-testid') || '',
          top: rect.top,
          bottom: rect.bottom,
        }
      })
      .filter(entry => entry.top > firstCardTop || entry.bottom > viewportHeight)
      .map(entry => entry.testId)
    return { clippedModules, quickLinksBelowFirstCard }
  })

  expect(layoutIssues.clippedModules).toEqual([])
  expect(layoutIssues.quickLinksBelowFirstCard).toEqual([])
}

async function prepareOnlineOrdersMobile(page) {
  await expect(page.getByTestId('online-orders-page')).toBeVisible()
  await expect(page.getByRole('button', { name: /^发布$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^可接$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^凭证与补偿$/ })).toBeVisible()

  await page.getByRole('button', { name: /^可接$/ }).click()
  await expect(page.getByTestId('online-orders-board-filter-relay')).toBeVisible()
  await page.getByTestId('online-orders-board-filter-relay').click()
  await expect(page.getByTestId('online-orders-available-list')).toBeVisible()
  await expect(page.getByTestId('online-orders-available-entry')).toContainText('灯会干菜接力单')
  await expect(page.getByTestId('online-orders-available-entry')).toContainText('接力单')
  await expect(page.getByTestId('online-orders-available-entry')).toContainText('阶段 1/3 已确认')
  await expect(page.getByTestId('async-community-board')).toBeVisible()
  await expect(page.getByTestId('async-community-project-detail')).toContainText('加工干菜')
  await expect(page.getByTestId('online-orders-story-flow')).toBeVisible()
  await expect(page.getByTestId('online-orders-story-flow-chapters')).toContainText('采收青菜')
  await expect(page.getByTestId('online-orders-relay-settlement-summary')).toContainText('分账池')
  await page.getByTestId('online-society-async-contribute-relay_route-accept_stage:stage_process').click()
  await expect(page.getByTestId('async-community-project-detail')).toContainText('送到灯会')
  await expect(page.getByText('移动端烟测号已接下加工干菜这一段。')).toBeVisible()

  await page.getByRole('button', { name: /^凭证与补偿$/ }).click()
  await expect(page.getByText('当前没有结算凭证。')).toBeVisible()
  await expect(page.getByRole('button', { name: /^发布$/ })).toBeVisible()
  await page.getByRole('button', { name: /^发布$/ }).click()
  await expect(page.getByPlaceholder('例如：缺一批冬菜备节')).toBeVisible()
  await expect(page.getByPlaceholder('写清楚当前缺什么、希望别人怎么帮、为什么这单值得接。')).toBeVisible()

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
  await expect(page.getByTestId('async-community-project-detail')).toContainText('写愿望')
  await expect(page.getByTestId('online-society-async-contribute-lantern_wall-write_wish')).toBeVisible()
  await page.getByTestId('online-society-async-contribute-lantern_wall-write_wish').click()
  await expect(page.getByTestId('async-community-project-detail')).toContainText('挂花灯')
  await expect(page.getByText('移动端烟测号写下一张愿望签，花灯墙亮了一角。')).toBeVisible()
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

async function prepareOnlineManorCareRoomMobile(page) {
  await expect(page.getByTestId('online-manor-page')).toBeVisible()
  await expect(page.getByTestId('online-module-tab-care')).toBeVisible()
  await page.getByTestId('online-module-tab-care').click()

  await expect(page.getByTestId('visual-scene-board')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-readable-limits')).toContainText('访客今日照料')
  await expect(page.getByTestId('online-manor-care-room-panel')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-room-create').first()).toBeVisible()
  await page.getByTestId('online-manor-care-room-create').first().click()

  await expect(page.getByTestId('online-manor-care-room-list')).toBeVisible()
  await expect(page.getByTestId('online-manor-care-room-entry')).toContainText('护理中')
  await expect(page.getByTestId('online-manor-care-room-entry')).toContainText('移动端烟测号')
  await expect(page.getByTestId('online-manor-care-room-progress-summary')).toContainText('成员 2/2')
  await page.getByTestId('online-manor-care-room-action').first().click()

  await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作灌溉')
  await expect(page.getByTestId('online-manor-care-room-risk-summary')).toContainText('累计风险')
  await page.getByTestId('online-manor-care-room-action').first().click()
  await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作喂食')
  await expect(page.getByTestId('online-manor-care-room-settle')).toBeVisible()
  await page.getByTestId('online-manor-care-room-settle').click()

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

  await mkdir(outputDir, { recursive: true })
  const shouldLaunchServer = shouldStartDevServer && !(await isServerReachable(baseURL))
  const server = shouldLaunchServer ? startDevServer() : null
  const stopServer = () => {
    if (server && !server.killed) {
      server.kill('SIGTERM')
    }
  }

  try {
    await waitForServer(baseURL)
    const browser = await chromium.launch()
    try {
      await captureScenario({
        browser,
        label: '01-shop-mobile-390x844',
        hash: '/#/game/shop',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="shop-primary-action-card"]'
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
        primarySelector: '[data-testid="shop-primary-action-card"]'
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
        primarySelector: '[data-testid="shop-primary-action-card"]'
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
          await page.getByTestId('mobile-hub-button').click()
          await expect(page.getByTestId('mobile-map-menu')).toBeVisible()
          await expect(page.getByTestId('mobile-map-menu-primary-entry')).toBeVisible()
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
        primarySelector: '[data-testid="guild-primary-action-card"]'
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
        primarySelector: '[data-testid="guild-primary-action-card"]'
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
        primarySelector: '[data-testid="guild-primary-action-card"]'
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
        primarySelector: '[data-testid="online-center"]',
        prepare: prepareOnlineCenterMobile
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
        primarySelector: '[data-testid="online-center"]',
        prepare: prepareOnlineCenterMobile
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
        label: '30-online-manor-care-room-mobile-390x844',
        hash: '/#/game/online/manor',
        viewport: { width: 390, height: 844 },
        primarySelector: '[data-testid="online-manor-page"]',
        mockManor: true,
        prepare: prepareOnlineManorCareRoomMobile
      })
      await captureScenario({
        browser,
        label: '31-online-manor-care-room-mobile-360x780',
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
        '在线村社场景使用 mock 登录态与村社公共建设数据，覆盖花灯墙贡献按钮点击、贡献后阶段反馈和移动端横向溢出断言。',
        '在线庄园场景使用 mock 登录态与护理房数据，覆盖 2 人护理房创建、灌溉 / 喂食分工点击、结算凭证回看和移动端横向溢出断言。'
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
