import { expect, test, type Page } from '@playwright/test'

const sampleId = 'breeding_specialist'
const regionMapSampleId = 'region_map_showcase'
const regionAncientRoadSampleId = 'region_ancient_road_midgame'

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

async function openHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible()
  await expect(page.getByRole('button', { name: '新的旅程' })).toBeVisible()
}

async function startNewJourney(page: Page, playerName: string) {
  await page.getByTestId('new-journey-button').click()
  await page.getByTestId('privacy-agree-button').click()
  await page.getByTestId('char-name-input').fill(playerName)
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
}

async function loadBuiltInSample(page: Page, id: string) {
  await page.waitForFunction(() => typeof (window as any).__TAOYUAN_SAMPLE_SAVES__?.load === 'function')
  const loaded = await page.evaluate(async targetId => {
    const api = (window as any).__TAOYUAN_SAMPLE_SAVES__
    return api ? await api.load(targetId) : false
  }, id)
  expect(loaded).toBeTruthy()
}

async function waitForExpeditionAction(page: Page) {
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

function buildWorldEventOverview() {
  return {
    ok: true,
    bulletin: '测试节会公告',
    current_season: 'spring',
    current_season_label: '春季',
    current_cycle_key: 'e2e',
    current_event: null,
    events: [],
    world_events: [],
    current_world_events: [],
    public_goal: {
      label: '测试公共目标',
      summary: '用于可视化 smoke',
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

function buildGameplayAction(id: string, label: string) {
  return {
    id,
    label,
    summary: `${label} smoke`,
    unique_per_member: false,
    required_role: '',
    required_role_label: '',
    once_per_round: false,
    pressure_delta: 0,
    pressure_delta_text: '',
    risk_delta: 0,
    risk_delta_text: '',
    resource_delta: {},
    resource_delta_text: '',
    combo_tags: [],
    round_effect: '',
    can_use: true,
    disabled_reason: ''
  }
}

function buildRoomSnapshot(room: {
  id: string
  title: string
  templateId: string
  templateLabel: string
  gameplayId: string
  gameplayLabel: string
  actionId: string
  actionLabel: string
  visualState: Record<string, unknown>
}) {
  return {
    id: room.id,
    title: room.title,
    template_id: room.templateId,
    template_label: room.templateLabel,
    gameplay_template_id: room.gameplayId,
    gameplay: {
      template_id: room.gameplayId,
      template_label: room.gameplayLabel,
      template_kind: 'visual_smoke',
      template_summary: '浏览器级可视化 smoke 房间',
      objective_label: '推进现场',
      progress_value: 1,
      progress_target: 8,
      progress_percent: 12,
      progress_text: '1/8',
      score_label: '协作值',
      score_value: 1,
      phase: 'active',
      phase_label: '进行中',
      last_action_id: '',
      last_action_summary: '',
      last_actor_username: '',
      last_actor_display_name: '',
      is_completed: false,
      completed_at: 0,
      contributions: [],
      available_actions: [buildGameplayAction(room.actionId, room.actionLabel)],
      cavern_state: null,
      festival_state: null
    },
    state: 'running',
    state_label: '进行中',
    state_reason: '',
    opening_ceremony: null,
    host_username: 'tester',
    host_display_name: '测试者',
    joined_member_count: 1,
    member_limit: 4,
    members: [],
    can_invite: false,
    can_join: false,
    can_leave: false,
    can_ready: false,
    can_unready: false,
    can_host_ready_check: false,
    can_host_start_countdown: false,
    can_host_settle: true,
    can_host_close: false,
    can_disconnect: false,
    can_reconnect: false,
    visual_state: room.visualState
  }
}

async function mockOnlineVisualRoom(page: Page, options: {
  domain: 'festival' | 'expedition'
  room: ReturnType<typeof buildRoomSnapshot>
}) {
  await page.unroute('**/api/me').catch(() => {})
  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: { username: 'tester', display_name: '测试者' },
        csrf_token: 'csrf-e2e'
      })
    })
  })

  await page.route('**/api/taoyuan/online/world-events', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildWorldEventOverview()) })
  })

  const festivalOverview = {
    ok: true,
    bulletin: '节会测试',
    templates: [{ id: 'lantern_fair', label: '上元灯会', summary: '', default_member_limit: 4, opening_title: '', recommended_gameplay_template_ids: ['assembly'] }],
    gameplay_templates: [{ id: 'assembly', label: '灯会共建', kind: 'scene', summary: '', objective_label: '', score_label: '', default_target: 8, recommended_room_template_ids: ['lantern_fair'], action_options: [] }],
    my_room: options.domain === 'festival' ? options.room : null,
    invited_rooms: [],
    visible_rooms: [],
    recent_memorials: [],
    recent_receipts: []
  }
  const expeditionOverview = {
    ok: true,
    bulletin: '远征测试',
    templates: [{ id: 'expedition_outpost', label: '协作远征', summary: '', default_member_limit: 4, opening_title: '', recommended_gameplay_template_ids: ['expedition_cavern'] }],
    gameplay_templates: [{ id: 'expedition_cavern', label: '协作矿洞', kind: 'map', summary: '', objective_label: '', score_label: '', default_target: 8, recommended_room_template_ids: ['expedition_outpost'], action_options: [] }],
    my_room: options.domain === 'expedition' ? options.room : null,
    invited_rooms: [],
    visible_rooms: [],
    recent_receipts: []
  }

  await page.route('**/api/taoyuan/online/festival/rooms', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(festivalOverview) })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/action', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: festivalOverview, room: options.room })
    })
  })
  await page.route('**/api/taoyuan/online/expedition/rooms', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(expeditionOverview) })
  })
  await page.route('**/api/taoyuan/online/expedition/rooms/*/action', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: expeditionOverview, room: options.room })
    })
  })
}

function buildSocietyProject() {
  return {
    id: 'bridge',
    label: '村社修桥',
    summary: '修复村口断桥，恢复溪桥通行。',
    status: 'active',
    status_label: '建设中',
    progress: 35,
    target_progress: 100,
    progress_percent: 35,
    remaining_progress: 65,
    completed_at: 0,
    completed_by: '',
    completed_by_display_name: '',
    progress_note: '脚手架正在加固。',
    completion_feedback: '',
    world_feedback: '',
    completion_rewards: [],
    can_contribute: true,
    my_contribution_count: 0,
    contribution_packages: [
      {
        id: 'labor_shift',
        label: '施工行动',
        kind: 'labor',
        summary: '今日来桥边帮忙搬木、扶梁和清理碎石。',
        progress_gain: 8,
        daily_limit: 1,
        weekly_limit: 3,
        costs: []
      }
    ],
    recent_contributions: []
  }
}

function buildLanternWallProject(contributed = false) {
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
      ? [{ id: 'lantern-wall-e2e-contribution', username: 'tester', display_name: '测试者', package_id: 'write_wish', package_label: '写愿望', progress_gain: 10, created_at: 3 }]
      : []
  }
}

function buildLanternWallVisualProject(contributed = false) {
  return {
    id: 'lantern_wall',
    label: '共建花灯墙',
    kind: 'lantern_wall',
    day_tag: 'e2e-day',
    week_tag: 'e2e-week',
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
      { username: 'tester', display_name: '测试者', contribution_value: 10, rank: 1 }
    ] : [],
    history: contributed ? [
      { id: 'lantern-wall-history-wish', summary: '测试者写下一张愿望签。', created_at: 3 }
    ] : [],
    completion_room_template_id: '',
    completion_event_id: ''
  }
}

function buildSocietyOverview(options: { focus?: 'bridge' | 'lantern_wall'; contributed?: boolean } = {}) {
  const focus = options.focus || 'bridge'
  const bridgeProject = buildSocietyProject()
  const lanternWallProject = buildLanternWallProject(Boolean(options.contributed))
  const publicProjects = focus === 'lantern_wall' ? [lanternWallProject, bridgeProject] : [bridgeProject]
  const asyncProjects = focus === 'lantern_wall'
    ? [buildLanternWallVisualProject(Boolean(options.contributed))]
    : [
        {
          id: 'bridge',
          label: '村社修桥',
          kind: 'bridge',
          day_tag: 'e2e-day',
          week_tag: 'e2e-week',
          starts_at: 0,
          ends_at: 0,
          current_stage_id: 'bridge_scaffold',
          stages: [
            {
              id: 'bridge_scaffold',
              label: '搭脚手架',
              state: 'active',
              progress_value: 35,
              progress_target: 100,
              object_ids: ['bridge_piles'],
              contribution_options: [
                {
                  id: 'labor_shift',
                  label: '施工行动',
                  kind: 'labor',
                  available_action_id: 'labor_shift',
                  daily_limit: 1,
                  weekly_limit: 3,
                  resource_cost_preview: {},
                  progress_delta: 8,
                  reward_preview: '贡献 +8'
                }
              ],
              milestones: []
            }
          ],
          contributors: [],
          history: [],
          completion_room_template_id: '',
          completion_event_id: ''
        }
      ]
  const overview = {
    ok: true,
    bulletin: '村社 smoke',
    my_society: {
      id: 'society-e2e',
      name: '清溪灯社',
      summary: '测试公共建设',
      notice: '本周先修桥。',
      emblem: 'plum_seal',
      emblem_label: '梅印',
      theme: 'harvest_union',
      theme_label: '共耕',
      visibility: 'public',
      visibility_label: '公开',
      capacity: 24,
      member_count: 1,
      leader_username: 'tester',
      leader_display_name: '测试者',
      join_requirement_id: 'open',
      join_requirement_label: '开放',
      join_requirement_summary: '公开申请',
      join_requirement_note: '',
      created_at: 0,
      updated_at: 0,
      level: 1,
      level_title: '初建村社',
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
        { username: 'tester', display_name: '测试者', save_id: 1, save_slot: 1, role: 'president', role_label: '社长', joined_at: 0 }
      ],
      activity_log: [],
      active_proposals: [],
      proposal_history: [],
      public_projects: publicProjects,
      visual_state: {
        ...emptyVisualState,
        board_type: 'async',
        board_id: 'society_public_projects',
        selected_visual_id: focus,
        recent_feedback: focus === 'lantern_wall' && options.contributed ? '测试者写下一张愿望签，花灯墙亮了一角。' : '',
        async_projects: asyncProjects
      },
      welfare_unlocks: [],
      exclusive_festival: { id: '', label: '', summary: '', unlocked: false },
      exclusive_decors: [],
      exclusive_tasks: [],
      chronicle: {
        founded_date_label: '今日',
        milestone_count: 0,
        recent_entries: [],
        famous_members: [],
        seasonal_records: []
      },
      public_warehouse: {
        funds: 0,
        items: [],
        logs: [],
        deposit_options: []
      }
    },
    visible_societies: [],
    incoming_invites: [],
    my_pending_requests: [],
    managed_requests: [],
    visibility_options: [{ id: 'public', label: '公开', summary: '' }],
    theme_options: [{ id: 'harvest_union', label: '共耕', summary: '' }],
    emblem_options: [{ id: 'plum_seal', label: '梅印' }],
    capacity_options: [{ value: 24, label: '24 人' }],
    join_requirement_options: [{ id: 'open', label: '开放', summary: '' }],
    role_options: [{ id: 'president', label: '社长' }],
    proposal_kind_options: [{ id: 'governance', label: '治理', summary: '' }],
    public_project_defs: [
      { id: 'bridge', label: '村社修桥', summary: '', target_progress: 100 },
      { id: 'lantern_wall', label: '共建花灯墙', summary: '', target_progress: 100 }
    ],
    public_project_package_options: publicProjects.flatMap(project => project.contribution_packages)
  }
  return overview
}

async function mockOnlineSociety(page: Page, options: { focus?: 'bridge' | 'lantern_wall' } = {}) {
  let contributed = false
  await page.unroute('**/api/me').catch(() => {})
  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: { username: 'tester', display_name: '测试者' },
        csrf_token: 'csrf-e2e'
      })
    })
  })

  await page.route('**/api/taoyuan/online/societies', async route => {
    const overview = buildSocietyOverview({ focus: options.focus, contributed })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) })
  })
  await page.route('**/api/taoyuan/online/societies/public-projects/*/contribute', async route => {
    contributed = true
    const overview = buildSocietyOverview({ focus: options.focus, contributed })
    const project = overview.my_society.public_projects.find(entry => route.request().url().includes(`/public-projects/${entry.id}/`))
      || overview.my_society.public_projects[0]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        project,
        society: overview.my_society,
        overview,
        player_money: 999
      })
    })
  })
}

function buildRelayOrder(accepted = false) {
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
      assignee_username: accepted ? 'tester' : '',
      assignee_display_name: accepted ? '测试者' : '',
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

  return {
    id: 'relay-order-e2e',
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
      recent_feedback: accepted ? '测试者已接下加工干菜这一段。' : '采收段已确认，等待下一位接力。',
      async_projects: [
        {
          id: 'relay_route',
          label: '灯会干菜接力路线',
          kind: 'order_relay',
          day_tag: 'e2e-day',
          week_tag: 'e2e-week',
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
          contributors: accepted ? [
            { username: 'tester', display_name: '测试者', contribution_value: 20, rank: 1 }
          ] : [],
          history: accepted ? [
            { id: 'relay-history-accepted', summary: '测试者接下加工干菜这一段。', created_at: 3 }
          ] : [
            { id: 'relay-history-collect', summary: '已完成采收青菜，路线推进到加工段。', created_at: 2 }
          ],
          completion_room_template_id: '',
          completion_event_id: ''
        }
      ]
    },
    created_at: 1,
    updated_at: accepted ? 3 : 2
  }
}

function buildCoopOrderOverview(accepted = false) {
  return {
    ok: true,
    orders: [buildRelayOrder(accepted)],
    receipts: [],
    compensations: [],
    board_summary: {
      total_orders: 1,
      open_orders: 1,
      relay_orders: 1,
      open_relay_orders: 1
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

async function mockOnlineOrders(page: Page) {
  let accepted = false
  await page.unroute('**/api/me').catch(() => {})
  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: { username: 'tester', display_name: '测试者' },
        csrf_token: 'csrf-e2e'
      })
    })
  })

  await page.route('**/api/taoyuan/online/orders', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildCoopOrderOverview(accepted)) })
  })
  await page.route('**/api/taoyuan/online/orders/*/stages/*/accept', async route => {
    accepted = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, order: buildRelayOrder(true), stage: buildRelayOrder(true).stages[1] })
    })
  })
}

test.describe('web game smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, user: null })
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
  })

  test('can start a new local journey from the main menu', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '测试')

    await expect(page).toHaveURL(/#\/game(?:\/farm)?$/)
    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('status-bar')).toContainText('测试')
    await expect(page.getByTestId('farm-view')).toBeVisible()
  })

  test('can open region map before unlock and see unlock conditions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '小满')
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByText('古驿荒道').first()).toBeVisible()
    await expect(page.getByText('蜃潮泽地').first()).toBeVisible()
    await expect(page.getByText('云岚高地').first()).toBeVisible()
    await expect(page.getByText('村庄建设').first()).toBeVisible()
    await expect(page.getByText('博物馆捐赠').first()).toBeVisible()
    await expect(page.getByText('公会等级').first()).toBeVisible()
  })

  test('can load the built-in breeding sample in dev mode', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, sampleId)
    await page.goto('/#/game/breeding')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('breeding-view')).toBeVisible()
    await expect(page.getByRole('button', { name: '育种台' })).toBeVisible()
    await expect(page.getByRole('button', { name: '图鉴' })).toBeVisible()
  })

  test('online expedition visual map supports cavern node actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '矿洞')

    const room = buildRoomSnapshot({
      id: 'e2e-cavern-room',
      title: '协作矿洞 smoke',
      templateId: 'expedition_outpost',
      templateLabel: '协作远征',
      gameplayId: 'expedition_cavern',
      gameplayLabel: '协作矿洞',
      actionId: 'split_mine',
      actionLabel: '分采矿脉',
      visualState: {
        ...emptyVisualState,
        board_type: 'map',
        board_id: 'cavern_node_map',
        selected_visual_id: 'cavern_crossroad',
        nodes: [
          {
            id: 'cavern_crossroad',
            label: '岔路口',
            kind: 'crossroad',
            x: 32,
            y: 48,
            state: 'active',
            connected_node_ids: ['cavern_ore'],
            event_id: 'crossroad',
            available_action_ids: ['split_mine'],
            owner_username: '',
            claimed_by: '',
            risk_preview: '岔路风险较低',
            reward_preview: '可通往矿脉',
            resource_cost_preview: {},
            resource_reward_preview: {}
          },
          {
            id: 'cavern_ore',
            label: '闪光矿脉',
            kind: 'ore',
            x: 68,
            y: 44,
            state: 'reward',
            connected_node_ids: ['cavern_crossroad'],
            event_id: 'ore',
            available_action_ids: ['split_mine'],
            owner_username: '',
            claimed_by: '',
            risk_preview: '采矿会推高风险',
            reward_preview: '矿石 +2',
            resource_cost_preview: { torch: -1 },
            resource_reward_preview: { ore: 2 }
          }
        ]
      }
    })
    await mockOnlineVisualRoom(page, { domain: 'expedition', room })

    await page.goto('/#/game/online/festival?tab=expedition-room')
    await expect(page.getByTestId('online-expedition-room-my-room')).toBeVisible()
    await expect(page.getByTestId('visual-map-board')).toBeVisible()

    await page.getByTestId('visual-map-node-cavern_ore').click()
    await expect(page.getByTestId('visual-map-node-detail')).toContainText('闪光矿脉')
    await page.getByTestId('visual-map-action-split_mine').click()

    await expect(page.getByTestId('online-expedition-room-gameplay-action-split_mine')).toHaveCount(0)
  })

  test('online festival visual scene supports lantern object actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '灯会')

    const room = buildRoomSnapshot({
      id: 'e2e-lantern-room',
      title: '灯会共建 smoke',
      templateId: 'lantern_fair',
      templateLabel: '上元灯会',
      gameplayId: 'assembly',
      gameplayLabel: '灯会共建',
      actionId: 'lock_piece',
      actionLabel: '锁定灯片',
      visualState: {
        ...emptyVisualState,
        board_type: 'scene',
        board_id: 'lantern_fair_street',
        selected_visual_id: '',
        objects: [
          {
            id: 'lantern_main_lamp',
            label: '主灯',
            kind: 'lantern',
            x: 50,
            y: 40,
            state: 'needs_action',
            available_action_ids: ['lock_piece'],
            progress_value: 2,
            progress_target: 6,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: true,
            cooperation_required_count: 2,
            cooperation_current_count: 1
          }
        ]
      }
    })
    await mockOnlineVisualRoom(page, { domain: 'festival', room })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expect(page.getByTestId('online-festival-room-my-room')).toBeVisible()
    await expect(page.getByTestId('visual-scene-board')).toBeVisible()

    await page.getByTestId('visual-scene-object-lantern_main_lamp').click()
    await expect(page.getByTestId('visual-scene-object-detail')).toContainText('主灯')
    await page.getByTestId('visual-scene-action-lock_piece').click()

    await expect(page.getByTestId('online-festival-room-gameplay-action-lock_piece')).toHaveCount(0)
  })

  test('online festival visual track supports dragon boat cell actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '赛舟')

    const room = buildRoomSnapshot({
      id: 'e2e-dragon-room',
      title: '龙舟赛道 smoke',
      templateId: 'dragon_boat',
      templateLabel: '端午赛舟',
      gameplayId: 'squad_coop',
      gameplayLabel: '龙舟协作',
      actionId: 'sync_oar',
      actionLabel: '合拍划桨',
      visualState: {
        ...emptyVisualState,
        board_type: 'track',
        board_id: 'dragon_boat_river',
        selected_visual_id: 'dragon_cell_1',
        tracks: [
          {
            id: 'dragon_boat_river',
            label: '端午河道',
            kind: 'river',
            length: 3,
            current_round: 0,
            cells: [
              {
                id: 'dragon_cell_0',
                label: '起点',
                index: 0,
                kind: 'normal',
                occupant_team_ids: ['team_dragon'],
                event_id: '',
                effect_ids: [],
                available_action_ids: [],
                risk_preview: '',
                reward_preview: ''
              },
              {
                id: 'dragon_cell_1',
                label: '鼓点窗口',
                index: 1,
                kind: 'boost',
                occupant_team_ids: [],
                event_id: 'drum',
                effect_ids: ['boost'],
                available_action_ids: ['sync_oar'],
                risk_preview: '抢拍会增加压力',
                reward_preview: '推进 +1'
              },
              {
                id: 'dragon_cell_2',
                label: '终点',
                index: 2,
                kind: 'finish',
                occupant_team_ids: [],
                event_id: '',
                effect_ids: [],
                available_action_ids: [],
                risk_preview: '',
                reward_preview: ''
              }
            ],
            teams: [
              {
                team_id: 'team_dragon',
                label: '桃源龙舟',
                marker: '舟',
                position_index: 0,
                state: 'idle',
                last_action_id: ''
              }
            ]
          }
        ]
      }
    })
    await mockOnlineVisualRoom(page, { domain: 'festival', room })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expect(page.getByTestId('online-festival-room-my-room')).toBeVisible()
    await expect(page.getByTestId('visual-track-board')).toBeVisible()

    await page.getByTestId('visual-track-cell-dragon_cell_1').click()
    await expect(page.getByTestId('visual-track-cell-detail')).toContainText('鼓点窗口')
    await page.getByTestId('visual-track-action-sync_oar').click()

    await expect(page.getByTestId('online-festival-room-gameplay-action-sync_oar')).toHaveCount(0)
  })

  test('online society async board supports bridge contribution actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '修桥')
    await mockOnlineSociety(page)

    await page.goto('/#/game/online/society?tab=projects')
    await expect(page.getByTestId('online-society-page')).toBeVisible()
    await expect(page.getByTestId('async-community-board')).toBeVisible()
    await expect(page.getByTestId('async-community-project-detail')).toContainText('搭脚手架')

    await page.getByTestId('online-society-async-contribute-bridge-labor_shift').click()

    await expect(page.getByTestId('online-society-project-contribute-bridge-labor_shift')).toBeVisible()
  })

  test('online society async board supports lantern wall contribution actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '花灯')
    await mockOnlineSociety(page, { focus: 'lantern_wall' })

    await page.goto('/#/game/online/society?tab=projects')
    await expect(page.getByTestId('online-society-page')).toBeVisible()
    await expect(page.getByTestId('async-community-board')).toBeVisible()
    await expect(page.getByTestId('async-community-project-detail')).toContainText('写愿望')

    await page.getByTestId('online-society-async-contribute-lantern_wall-write_wish').click()

    await expect(page.getByTestId('async-community-project-detail')).toContainText('挂花灯')
    await expect(page.getByText('测试者写下一张愿望签，花灯墙亮了一角。')).toBeVisible()
    await expect(page.getByTestId('online-society-project-contribute-lantern_wall-write_wish')).toBeVisible()
  })

  test('online orders async board supports public relay route actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '接力')
    await mockOnlineOrders(page)

    await page.goto('/#/game/online/orders?tab=available')
    await expect(page.getByTestId('online-orders-page')).toBeVisible()
    await page.getByTestId('online-orders-board-filter-relay').click()

    await expect(page.getByTestId('online-orders-available-list')).toBeVisible()
    await expect(page.getByTestId('online-orders-available-entry')).toContainText('灯会干菜接力单')
    await expect(page.getByTestId('online-orders-available-entry')).toContainText('接力单')
    await expect(page.getByTestId('online-orders-available-entry')).toContainText('阶段 1/3 已确认')
    await expect(page.getByTestId('async-community-board')).toBeVisible()
    await expect(page.getByTestId('async-community-project-detail')).toContainText('加工干菜')

    await page.getByTestId('online-society-async-contribute-relay_route-accept_stage:stage_process').click()

    await expect(page.getByTestId('async-community-project-detail')).toContainText('送到灯会')
    await expect(page.getByText('测试者已接下加工干菜这一段。')).toBeVisible()
  })

  test('can load the built-in region map showcase in dev mode', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByText('古驿荒道').first()).toBeVisible()
    await expect(page.getByText('蜃潮泽地').first()).toBeVisible()
    await expect(page.getByText('云岚高地').first()).toBeVisible()
    await expect(page.getByRole('button', { name: '巡行' }).first()).toBeVisible()
    await expect(page.locator('[data-testid^="region-boss-primary-"]').first()).toBeVisible()

    await page.goto('/#/game/shop')
    await expect(page.getByText('古驿荒道承接')).toBeVisible()
    await expect(page.getByRole('button', { name: '去任务板' })).toBeVisible()
    await expect(page.getByRole('button', { name: '去瀚海' })).toBeVisible()

    await page.goto('/#/game/fishpond')
    await expect(page.getByText('蜃潮泽地承接')).toBeVisible()
    await expect(page.getByRole('button', { name: '去博物馆' })).toBeVisible()
    await expect(page.getByRole('button', { name: '去邮箱' })).toBeVisible()

    await page.goto('/#/game/guild')
    await expect(page.getByText('云岚高地承接')).toBeVisible()
    await page.getByRole('button', { name: '去村庄建设' }).click()
    await expect(page).toHaveURL(/#\/game\/village-projects$/)
    await expect(page.getByText('云岚高地承接')).toBeVisible()
    await page.getByRole('button', { name: '去钱袋' }).click()
    await expect(page).toHaveURL(/#\/game\/wallet$/)
    await expect(page.getByText('云岚高地战备')).toBeVisible()
  })

  test('locked region only shows unlock notice instead of full expedition detail', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionAncientRoadSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()

    const forcedLocked = await page.evaluate(() => {
      const api = (window as any).__TAOYUAN_REGION_MAP_DEBUG__
      if (!api || typeof api.setRegionUnlockedForDebug !== 'function') return false
      return api.setRegionUnlockedForDebug('mirage_marsh', false)
    })
    expect(forcedLocked).toBeTruthy()

    const lockedRegionCard = page
      .locator('[data-testid^="region-switch-"]')
      .filter({ hasText: '未解锁' })
      .first()

    await expect(lockedRegionCard).toBeVisible()
    await lockedRegionCard.click()

    await expect(page.getByText('当前区域尚未开放，不会展开路线、首领和事件操作。')).toBeVisible()
    await expect(page.locator('[data-testid^="region-route-primary-"]')).toHaveCount(0)
    await expect(page.locator('[data-testid^="region-boss-primary-"]')).toHaveCount(0)
  })

  test('blocked route click shows a reason instead of silently doing nothing', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()

    const blockedRouteButton = page.locator('[data-testid^="region-route-primary-"][aria-disabled="true"]').first()
    await expect(blockedRouteButton).toBeVisible()
    await blockedRouteButton.click({ force: true })

    await expect(page.getByText('无法出发')).toBeVisible()
    await expect(page.getByText('当前已有一条进行中的远征，请先收束当前远征记录。').first()).toBeVisible()
  })

  test('manual region expedition enters staged mode and can settle with reveal flow', async ({ page }) => {
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()

    const stage = page.getByTestId('region-expedition-stage')
    if (!(await stage.isVisible().catch(() => false))) {
      const started = await page.evaluate(async () => {
        const api = (window as any).__TAOYUAN_REGION_MAP_DEBUG__
        if (!api || typeof api.startFirstManualSession !== 'function') return false
        const result = await api.startFirstManualSession()
        return Boolean(result?.success)
      })
      expect(started).toBeTruthy()
      await expect(stage).toBeVisible()
    }

    const firstChoice = page.locator('[data-testid^="region-expedition-choice-"]').first()
    if (await firstChoice.isVisible().catch(() => false)) {
      await firstChoice.click()
    }

    await expect(page.getByTestId('region-expedition-primary-card')).toBeVisible()
    const nextAction = await waitForExpeditionAction(page)
    if (nextAction === 'choice' || nextAction === 'retreat') {
      await page.getByTestId('region-expedition-retreat').click()
    }

    await expect(page.getByTestId('region-expedition-settle')).toBeVisible()
    await page.getByTestId('region-expedition-settle').click()

    await expect(page.getByTestId('journey-settlement-reveal')).toBeVisible()
    await page.getByTestId('journey-settlement-next').click()
    await expect(page.getByTestId('journey-settlement-stage-reward')).toBeVisible()
  })

  test('settings dialog keeps modal width stable when font size shrinks on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHome(page)
    await startNewJourney(page, '测试')

    const settingsDialog = page.getByTestId('settings-dialog')
    const fontSizeValue = page.getByTestId('settings-font-size-value')
    const fontSizeDecrease = page.getByTestId('settings-font-size-decrease')
    const fontSizeIncrease = page.getByTestId('settings-font-size-increase')
    const settingsOverlay = page.getByTestId('settings-dialog-overlay')

    const openMenu = async () => {
      await page.getByTestId('mobile-hub-button').click()
      await expect(page.getByTestId('mobile-map-menu')).toBeVisible()
    }

    const openSettingsFromMenu = async () => {
      await page.getByTestId('mobile-map-menu-open-settings').click()
      await expect(settingsDialog).toBeVisible()
      await page.getByTestId('settings-tab-display').click()
    }

    const setFontSize = async (target: number) => {
      for (let i = 0; i < 24; i += 1) {
        const current = Number((await fontSizeValue.textContent())?.trim() ?? NaN)
        expect(current).not.toBeNaN()
        if (current === target) return
        await (current > target ? fontSizeDecrease : fontSizeIncrease).click()
      }

      const finalValue = Number((await fontSizeValue.textContent())?.trim() ?? NaN)
      expect(finalValue).toBe(target)
    }

    const closeSettings = async () => {
      await settingsOverlay.click({ position: { x: 8, y: 8 } })
      await expect(settingsDialog).toHaveCount(0)
    }

    const measureBox = async (locator: ReturnType<Page['locator']>) => {
      await expect(locator).toBeVisible()
      const box = await locator.boundingBox()
      expect(box).not.toBeNull()
      return box!
    }

    const measureMenuControls = async () => {
      await openMenu()
      const primaryEntry = page.getByTestId('mobile-map-menu-primary-entry')
      const quickLinkChip = page.locator('[data-testid^="mobile-map-quick-link-"]').first()
      const toolEntry = page.getByTestId('mobile-map-menu-open-settings')
      const farmTile = page.getByTestId('mobile-map-loc-farm')

      const primaryBox = await measureBox(primaryEntry)
      const quickLinkBox = await measureBox(quickLinkChip)
      const toolEntryBox = await measureBox(toolEntry)
      const farmTileBox = await measureBox(farmTile)

      return {
        primaryHeight: primaryBox.height,
        quickLinkWidth: quickLinkBox.width,
        toolEntryHeight: toolEntryBox.height,
        farmTileWidth: farmTileBox.width
      }
    }

    const expectShrunk = (
      previous: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number },
      next: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number }
    ) => {
      expect(next.primaryHeight).toBeLessThan(previous.primaryHeight)
      expect(next.quickLinkWidth).toBeLessThan(previous.quickLinkWidth)
      expect(next.toolEntryHeight).toBeLessThan(previous.toolEntryHeight)
      expect(next.farmTileWidth).toBeLessThan(previous.farmTileWidth)
    }

    const expectGrown = (
      previous: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number },
      next: { primaryHeight: number; quickLinkWidth: number; toolEntryHeight: number; farmTileWidth: number }
    ) => {
      expect(next.primaryHeight).toBeGreaterThan(previous.primaryHeight)
      expect(next.quickLinkWidth).toBeGreaterThan(previous.quickLinkWidth)
      expect(next.toolEntryHeight).toBeGreaterThan(previous.toolEntryHeight)
      expect(next.farmTileWidth).toBeGreaterThan(previous.farmTileWidth)
    }

    await openMenu()
    await openSettingsFromMenu()
    await expect(fontSizeValue).toHaveText('16')

    const baselineWidth = await settingsDialog.evaluate(element => element.getBoundingClientRect().width)
    await setFontSize(8)
    const compactWidth = await settingsDialog.evaluate(element => element.getBoundingClientRect().width)

    expect(compactWidth).toBeGreaterThanOrEqual(baselineWidth - 4)
    expect(compactWidth).toBeGreaterThanOrEqual(316)

    const tabLocators = [
      page.getByTestId('settings-tab-general'),
      page.getByTestId('settings-tab-display'),
      page.getByTestId('settings-tab-notification')
    ]
    for (const tab of tabLocators) {
      await expect(tab).toBeVisible()
    }
    const tabRows = await Promise.all(tabLocators.map(async tab => (await tab.boundingBox())?.y ?? 0))
    expect(Math.max(...tabRows) - Math.min(...tabRows)).toBeLessThanOrEqual(4)

    await expect(page.getByTestId('settings-font-size-card')).toBeVisible()
    await expect(fontSizeValue).toBeVisible()
    await expect(page.getByTestId('settings-theme-dark')).toBeVisible()
    await expect(page.getByTestId('settings-theme-warm')).toBeVisible()
    await expect(page.getByTestId('settings-theme-ink')).toBeVisible()
    await expect(page.getByTestId('settings-theme-parchment')).toBeVisible()
    await expect(page.getByTestId('settings-save-manager-button')).toBeVisible()

    await setFontSize(16)
    await closeSettings()

    const size16 = await measureMenuControls()

    await openSettingsFromMenu()
    await setFontSize(15)
    await closeSettings()
    const size15 = await measureMenuControls()
    expectShrunk(size16, size15)

    await openSettingsFromMenu()
    await setFontSize(14)
    await closeSettings()
    const size14 = await measureMenuControls()
    expectShrunk(size15, size14)

    await openSettingsFromMenu()
    await setFontSize(13)
    await closeSettings()
    const size13 = await measureMenuControls()
    expectShrunk(size14, size13)

    await openSettingsFromMenu()
    await setFontSize(12)
    await closeSettings()
    const size12 = await measureMenuControls()
    expectShrunk(size13, size12)

    await openSettingsFromMenu()
    await setFontSize(17)
    await closeSettings()
    const size17 = await measureMenuControls()
    expectGrown(size16, size17)

    await openSettingsFromMenu()
    await setFontSize(18)
    await closeSettings()
    const size18 = await measureMenuControls()
    expectGrown(size17, size18)
  })

  test('region map mobile layout keeps rail scoped and actions reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHome(page)
    await loadBuiltInSample(page, regionMapSampleId)
    await page.goto('/#/game/region-map')

    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.locator('[data-testid^="region-switch-"]')).toHaveCount(3)
    await expect(page.getByTestId('region-switch-ancient_road')).toBeVisible()
    await expect(page.getByText('先选定这趟要展开查看的区域')).toBeVisible()

    await page.getByTestId('region-switch-ancient_road').click()
    const rail = page.getByTestId('region-map-rail-ancient_road')
    await expect(rail).toBeVisible()

    const railScrollable = await rail.evaluate(element => element.scrollWidth > element.clientWidth)
    expect(railScrollable).toBeTruthy()

    const railScroll = await rail.evaluate(element => {
      const before = element.scrollLeft
      element.scrollLeft = before + 140
      return { before, after: element.scrollLeft }
    })
    expect(railScroll.after).toBeGreaterThanOrEqual(railScroll.before)

    const rootOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(rootOverflow).toBeLessThanOrEqual(4)

    const stage = page.getByTestId('region-expedition-stage')
    if (!(await stage.isVisible().catch(() => false))) {
      const started = await page.evaluate(async () => {
        const api = (window as any).__TAOYUAN_REGION_MAP_DEBUG__
        if (!api || typeof api.startFirstManualSession !== 'function') return false
        const result = await api.startFirstManualSession()
        return Boolean(result?.success)
      })
      expect(started).toBeTruthy()
      await expect(stage).toBeVisible()
    }

    await expect(page.getByTestId('region-expedition-action-dock')).toBeVisible()

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
    await expect(page.getByTestId('journey-settlement-stage-tabs')).toBeVisible()

    if (await page.getByTestId('journey-settlement-next').isVisible().catch(() => false)) {
      await page.getByTestId('journey-settlement-next').click()
    }
    if (await page.getByTestId('journey-settlement-next').isVisible().catch(() => false)) {
      await page.getByTestId('journey-settlement-next').click()
    }

    await expect(page.getByTestId('journey-settlement-stage-aftermath')).toBeVisible()
    await expect(page.getByRole('button', { name: '前往' }).first()).toBeVisible()
  })
})
