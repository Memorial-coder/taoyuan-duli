import { expect, test, type Page, type Route } from '@playwright/test'

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
  await expect(page.getByRole('heading', { name: '桃源乡' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '新的旅程' })).toBeVisible({ timeout: 15_000 })
}

async function startNewJourney(page: Page, playerName: string) {
  await page.getByTestId('new-journey-button').click()
  await page.getByTestId('privacy-agree-button').click()
  await page.getByTestId('char-name-input').fill(playerName)
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 15_000 })
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

async function openTechnicalDetailsForTestId(page: Page, testId: string) {
  const target = page.getByTestId(testId)
  if (await target.isVisible().catch(() => false)) return
  const details = target.locator('xpath=ancestor::details[1]')
  await details.getByTestId('online-technical-details-toggle').click()
  await expect(target).toBeVisible()
}

async function expectOnlineFestivalRoomLoaded(page: Page, title: string) {
  await expect(page.getByTestId('online-festival-room-status-panel')).toContainText(title)
  const legacyRoom = page.getByTestId('online-festival-room-my-room')
  if (await legacyRoom.isVisible().catch(() => false)) return
  await expect(page.getByTestId('online-festival-room-lobby-trigger')).toBeVisible()
}

async function expectOnlineExpeditionRoomLoaded(page: Page, title: string) {
  await expect(page.getByTestId('online-expedition-room-status-panel')).toContainText(title)
  const legacyRoom = page.getByTestId('online-expedition-room-my-room')
  if (await legacyRoom.isVisible().catch(() => false)) return
  await expect(page.getByTestId('online-expedition-room-status-panel')).toContainText('已载入')
}

async function openCohabitationTab(page: Page, tabKey: string) {
  const target = page.getByTestId(`online-module-tab-${tabKey}`)
  if (!(await target.isVisible().catch(() => false))) {
    const groupedMore = page.getByTestId('online-cohabitation-more-tab-groups')
    const isOpen = await groupedMore.evaluate(node => (node as HTMLDetailsElement).open).catch(() => false)
    if (!isOpen) await groupedMore.locator('summary').click()
  }
  await expect(target).toBeVisible()
  await target.click()
}

async function openCohabitationOverviewDetails(page: Page) {
  const details = page.getByTestId('online-cohabitation-overview-details')
  const isOpen = await details.evaluate(node => (node as HTMLDetailsElement).open).catch(() => false)
  if (!isOpen) await details.locator('summary').click()
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
      cavern_state: null as Record<string, unknown> | null,
      festival_state: null as Record<string, unknown> | null
    },
    state: 'running',
    state_label: '进行中',
    state_reason: '',
    opening_ceremony: null,
    host_username: 'tester',
    host_display_name: '测试者',
    joined_member_count: 1,
    member_limit: 4,
    countdown_seconds: 0,
    ready_member_count: 0,
    my_member_status: 'joined',
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
    visual_state: room.visualState,
    settlement_receipts: [] as unknown[]
  }
}

async function mockOnlineVisualRoom(page: Page, options: {
  domain: 'festival' | 'expedition'
  room: ReturnType<typeof buildRoomSnapshot>
  startWithoutRoom?: boolean
  inviteFailures?: Record<string, { msg: string; once?: boolean }>
  onAction?: (room: ReturnType<typeof buildRoomSnapshot>, actionId: string) => {
    room: ReturnType<typeof buildRoomSnapshot>
    recentReceipts?: unknown[]
  }
  onSettle?: (room: ReturnType<typeof buildRoomSnapshot>) => {
    room: ReturnType<typeof buildRoomSnapshot>
    recentReceipts?: unknown[]
  }
}) {
  let currentRoom = options.room
  let hasActiveRoom = !options.startWithoutRoom
  let currentFestivalRecentReceipts: unknown[] = []
  let currentExpeditionRecentReceipts: unknown[] = []
  const inviteAttempts = new Map<string, number>()
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

  const festivalTemplates = [
    { id: 'dragon_boat', label: '端午赛舟', summary: '2 人演练，4-8 人扩展多队竞速。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 8, opening_title: '', recommended_gameplay_template_ids: ['squad_coop'] },
    { id: 'lantern_fair', label: '上元灯会', summary: '灯会共建，适合先创建房间再邀请成员。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 4, opening_title: '', recommended_gameplay_template_ids: ['assembly'] }
  ]
  const festivalGameplayTemplates = [
    { id: 'squad_coop', label: '龙舟协作', kind: 'track', summary: '协作推进龙舟赛道。', objective_label: '', score_label: '', default_target: 8, recommended_room_template_ids: ['dragon_boat'], action_options: [] },
    { id: 'assembly', label: '灯会共建', kind: 'scene', summary: '协作布置灯会现场。', objective_label: '', score_label: '', default_target: 8, recommended_room_template_ids: ['lantern_fair'], action_options: [] }
  ]
  const expeditionTemplates = [
    { id: 'expedition_outpost', label: '协作远征', summary: '协作矿洞远征，房主创建后可邀请成员准备出发。', default_member_limit: 4, min_member_limit: 2, max_member_limit: 4, opening_title: '', recommended_gameplay_template_ids: ['expedition_cavern'] }
  ]
  const expeditionGameplayTemplates = [
    { id: 'expedition_cavern', label: '协作矿洞', kind: 'map', summary: '按路线节点推进，控制风险并可提前撤离。', objective_label: '路线进度', score_label: '协作值', default_target: 8, recommended_room_template_ids: ['expedition_outpost'], action_options: [] }
  ]
  const buildFestivalOverview = () => ({
    ok: true,
    bulletin: '节会测试',
    templates: festivalTemplates,
    gameplay_templates: festivalGameplayTemplates,
    my_room: options.domain === 'festival' && hasActiveRoom ? currentRoom : null,
    invited_rooms: [],
    visible_rooms: [],
    recent_memorials: [],
    recent_receipts: currentFestivalRecentReceipts
  })
  const buildExpeditionOverview = () => ({
    ok: true,
    bulletin: '远征测试',
    templates: expeditionTemplates,
    gameplay_templates: expeditionGameplayTemplates,
    my_room: options.domain === 'expedition' && hasActiveRoom ? currentRoom : null,
    invited_rooms: [],
    visible_rooms: [],
    recent_receipts: currentExpeditionRecentReceipts
  })

  await page.route('**/api/taoyuan/online/festival/rooms', async route => {
    if (route.request().method() === 'POST') {
      let payload: { template_id?: string; gameplay_template_id?: string; title?: string; member_limit?: number } = {}
      try {
        payload = route.request().postDataJSON() as typeof payload
      } catch {
        payload = {}
      }
      const template = festivalTemplates.find(item => item.id === payload.template_id) ?? festivalTemplates[0]!
      const gameplay = festivalGameplayTemplates.find(item => item.id === payload.gameplay_template_id)
        ?? festivalGameplayTemplates.find(item => template.recommended_gameplay_template_ids.includes(item.id))
        ?? festivalGameplayTemplates[0]!
      const memberLimit = Math.max(2, Math.floor(Number(payload.member_limit || template.default_member_limit || 4)))
      const createdRoom = buildRoomSnapshot({
        id: 'e2e-created-festival-room',
        title: String(payload.title || `${template.label}房间`),
        templateId: template.id,
        templateLabel: template.label,
        gameplayId: gameplay.id,
        gameplayLabel: gameplay.label,
        actionId: 'lock_piece',
        actionLabel: '锁定灯片',
        visualState: emptyVisualState
      })
      currentRoom = {
        ...createdRoom,
        state: 'created',
        state_label: '已创建',
        state_reason: '房间已创建，可以邀请成员或开始准备。',
        joined_member_count: 1,
        member_limit: memberLimit,
        ready_member_count: 0,
        can_invite: true,
        can_host_ready_check: true,
        can_host_settle: false,
        can_host_close: true,
        gameplay: {
          ...createdRoom.gameplay,
          phase: 'created',
          phase_label: '等待准备',
          available_actions: []
        },
        members: [{
          username: 'tester',
          display_name: '测试者',
          role: 'host',
          status: 'joined',
          status_label: '房主',
          invited_at: 0,
          joined_at: 1760000100,
          ready_at: 0,
          disconnected_at: 0,
          reconnected_at: 0,
          left_at: 0,
          active_receipt_id: ''
        }] as typeof createdRoom.members
      }
      hasActiveRoom = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildFestivalOverview()) })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/action', async route => {
    let payload: { action_id?: string } = {}
    try {
      payload = route.request().postDataJSON() as { action_id?: string }
    } catch {
      payload = {}
    }
    const actionId = String(payload.action_id || '')
    const actionResult = options.onAction?.(currentRoom, actionId)
    if (actionResult) {
      currentRoom = actionResult.room
      currentFestivalRecentReceipts = actionResult.recentReceipts ?? currentFestivalRecentReceipts
    } else if (actionId) {
      currentRoom = {
        ...currentRoom,
        gameplay: {
          ...currentRoom.gameplay,
          available_actions: currentRoom.gameplay.available_actions.filter(action => action.id !== actionId)
        }
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
    })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/settle', async route => {
    const settleResult = options.onSettle?.(currentRoom)
    if (settleResult) {
      currentRoom = settleResult.room
      currentFestivalRecentReceipts = settleResult.recentReceipts ?? currentFestivalRecentReceipts
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
    })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/ready-check', async route => {
    const readyMembers = (currentRoom.members as Array<Record<string, unknown>>).map(member => {
      if (String(member.status || '') === 'invited') return member
      return {
        ...member,
        status: 'ready',
        status_label: member.username === currentRoom.host_username ? '房主已准备' : '已准备',
        ready_at: Number(member.ready_at || 0) || 1760000200
      }
    })
    currentRoom = {
      ...currentRoom,
      state: 'ready_check',
      state_label: '准备确认',
      state_reason: '房主已开始准备，请成员确认状态。',
      opening_ceremony: null,
      ready_member_count: readyMembers.filter(member => String(member.status || '') === 'ready').length,
      members: readyMembers as typeof currentRoom.members,
      can_invite: true,
      can_ready: false,
      can_unready: false,
      can_host_ready_check: false,
      can_host_start_countdown: true,
      can_host_settle: false,
      can_host_close: true,
      gameplay: {
        ...currentRoom.gameplay,
        phase: 'ready_check',
        phase_label: '准备确认',
        last_action_summary: '房主已开始准备，请成员确认状态。'
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
    })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/start', async route => {
    const lockedMembers = (currentRoom.members as Array<Record<string, unknown>>).map(member => ({
      ...member,
      status: 'countdown_locked',
      status_label: member.username === currentRoom.host_username ? '房主已锁定' : '倒计时锁定',
      ready_at: Number(member.ready_at || 0) || 1760000200
    }))
    currentRoom = {
      ...currentRoom,
      state: 'countdown',
      state_label: '倒计时',
      state_reason: '开场倒计时已启动。',
      opening_ceremony: {
        stage: 'countdown',
        title: '开场倒计时',
        subtitle: '房主已发起倒计时，成员即将进入玩法。',
        lines: ['确认成员状态', '锁定节会房间', '准备进入玩法'],
        countdown_remaining_seconds: currentRoom.countdown_seconds || 30
      },
      ready_member_count: lockedMembers.length,
      members: lockedMembers as typeof currentRoom.members,
      can_invite: false,
      can_ready: false,
      can_unready: false,
      can_host_ready_check: false,
      can_host_start_countdown: false,
      can_host_settle: false,
      can_host_close: true,
      gameplay: {
        ...currentRoom.gameplay,
        phase: 'countdown',
        phase_label: '开场倒计时',
        last_action_summary: '开场倒计时已启动。'
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
    })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/close', async route => {
    currentRoom = {
      ...currentRoom,
      state: 'closed',
      state_label: '已关闭',
      state_reason: '房主已关闭本轮房间。',
      can_invite: false,
      can_leave: false,
      can_ready: false,
      can_unready: false,
      can_host_ready_check: false,
      can_host_start_countdown: false,
      can_host_settle: false,
      can_host_close: false,
      can_disconnect: false,
      can_reconnect: false
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
    })
  })
  await page.route('**/api/taoyuan/online/festival/rooms/*/invite', async route => {
    let payload: { target_username?: string } = {}
    try {
      payload = route.request().postDataJSON() as { target_username?: string }
    } catch {
      payload = {}
    }
    const targetUsername = String(payload.target_username || '').trim()
    const normalizedTarget = targetUsername.toLowerCase()
    const nextAttempt = (inviteAttempts.get(normalizedTarget) || 0) + 1
    inviteAttempts.set(normalizedTarget, nextAttempt)
    const configuredFailure = options.inviteFailures?.[normalizedTarget]
    if (configuredFailure && (!configuredFailure.once || nextAttempt === 1)) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, msg: configuredFailure.msg })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildFestivalOverview(), room: currentRoom })
    })
  })
  await page.route('**/api/taoyuan/online/expedition/rooms', async route => {
    if (route.request().method() === 'POST') {
      let payload: { template_id?: string; gameplay_template_id?: string; title?: string; member_limit?: number } = {}
      try {
        payload = route.request().postDataJSON() as typeof payload
      } catch {
        payload = {}
      }
      const template = expeditionTemplates.find(item => item.id === payload.template_id) ?? expeditionTemplates[0]!
      const gameplay = expeditionGameplayTemplates.find(item => item.id === payload.gameplay_template_id)
        ?? expeditionGameplayTemplates.find(item => template.recommended_gameplay_template_ids.includes(item.id))
        ?? expeditionGameplayTemplates[0]!
      const memberLimit = Math.max(2, Math.floor(Number(payload.member_limit || template.default_member_limit || 4)))
      const createdRoom = buildRoomSnapshot({
        id: 'e2e-created-expedition-room',
        title: String(payload.title || `${template.label}队伍`),
        templateId: template.id,
        templateLabel: template.label,
        gameplayId: gameplay.id,
        gameplayLabel: gameplay.label,
        actionId: 'split_mine',
        actionLabel: '分采矿脉',
        visualState: {
          ...emptyVisualState,
          board_type: 'map',
          board_id: 'cavern_node_map'
        }
      })
      currentRoom = {
        ...createdRoom,
        state: 'created',
        state_label: '已创建',
        state_reason: '远征队伍已创建，可以邀请成员或开始准备。',
        joined_member_count: 1,
        member_limit: memberLimit,
        ready_member_count: 0,
        can_invite: true,
        can_host_ready_check: true,
        can_host_settle: false,
        can_host_close: true,
        gameplay: {
          ...createdRoom.gameplay,
          phase: 'created',
          phase_label: '等待准备',
          available_actions: []
        },
        members: [{
          username: 'tester',
          display_name: '测试者',
          role: 'host',
          status: 'joined',
          status_label: '房主',
          invited_at: 0,
          joined_at: 1760000100,
          ready_at: 0,
          disconnected_at: 0,
          reconnected_at: 0,
          left_at: 0,
          active_receipt_id: ''
        }] as typeof createdRoom.members
      }
      hasActiveRoom = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, overview: buildExpeditionOverview(), room: currentRoom })
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildExpeditionOverview()) })
  })
  const isExpeditionActionUrl = (url: string) => /\/api\/taoyuan\/online\/expedition\/rooms\/[^/?]+\/action(?:\?.*)?$/.test(url)
  const isExpeditionSettleUrl = (url: string) => /\/api\/taoyuan\/online\/expedition\/rooms\/[^/?]+\/settle(?:\?.*)?$/.test(url)
  const isExpeditionInviteUrl = (url: string) => /\/api\/taoyuan\/online\/expedition\/rooms\/[^/?]+\/invite(?:\?.*)?$/.test(url)
  const fulfillExpeditionAction = async (route: Route) => {
    let payload: { action_id?: string } = {}
    try {
      payload = route.request().postDataJSON() as { action_id?: string }
    } catch {
      payload = {}
    }
    const actionResult = options.onAction?.(currentRoom, String(payload.action_id || ''))
    if (actionResult) {
      currentRoom = actionResult.room
      currentExpeditionRecentReceipts = actionResult.recentReceipts ?? currentExpeditionRecentReceipts
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildExpeditionOverview(), room: currentRoom })
    })
  }
  const fulfillExpeditionSettle = async (route: Route) => {
    const settleResult = options.onSettle?.(currentRoom)
    if (settleResult) {
      currentRoom = settleResult.room
      currentExpeditionRecentReceipts = settleResult.recentReceipts ?? currentExpeditionRecentReceipts
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildExpeditionOverview(), room: currentRoom })
    })
  }
  const fulfillExpeditionInvite = async (route: Route) => {
    let payload: { target_username?: string } = {}
    try {
      payload = route.request().postDataJSON() as { target_username?: string }
    } catch {
      payload = {}
    }
    const targetUsername = String(payload.target_username || '').trim()
    const normalizedTarget = targetUsername.toLowerCase()
    const nextAttempt = (inviteAttempts.get(normalizedTarget) || 0) + 1
    inviteAttempts.set(normalizedTarget, nextAttempt)
    const configuredFailure = options.inviteFailures?.[normalizedTarget]
    if (configuredFailure && (!configuredFailure.once || nextAttempt === 1)) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, msg: configuredFailure.msg })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, overview: buildExpeditionOverview(), room: currentRoom })
    })
  }
  await page.route(isExpeditionActionUrl, fulfillExpeditionAction)
  await page.route(isExpeditionSettleUrl, fulfillExpeditionSettle)
  await page.route(isExpeditionInviteUrl, fulfillExpeditionInvite)
}

function buildFestivalFriendMemorialOverview() {
  const memoryRecords = [
    {
      type: 'main_lantern',
      label: '点亮主灯',
      actor_username: 'friend_lantern',
      actor_display_name: '灯会好友',
      action_id: 'lock_piece',
      action_label: '锁定灯片',
      object_id: 'lantern_main_lantern',
      object_label: '主灯',
      round_number: 1,
      summary: '主灯在第一轮稳定亮起。'
    },
    {
      type: 'riddle',
      label: '解开灯谜',
      actor_username: 'friend_riddle',
      actor_display_name: '灯谜手',
      action_id: 'buzz_correct',
      action_label: '抢答灯谜',
      object_id: 'lantern_riddle_rack',
      object_label: '灯谜架',
      round_number: 2,
      summary: '灯谜架完成三道题签。'
    },
    {
      type: 'order',
      label: '维持秩序',
      actor_username: 'friend_order',
      actor_display_name: '巡场人',
      action_id: 'steady_rudder',
      action_label: '稳住人群',
      object_id: 'lantern_crowd',
      object_label: '人群秩序',
      round_number: 3,
      summary: '人群退到灯绳外侧。'
    },
    {
      type: 'photo',
      label: '留影收口',
      actor_username: 'friend_photo',
      actor_display_name: '合影人',
      action_id: 'lock_pose',
      action_label: '锁定合影',
      object_id: 'lantern_photo_spot',
      object_label: '留影点',
      round_number: 4,
      summary: '留影点收进好友合照。'
    }
  ]
  return {
    ok: true,
    target_username: 'friend_lantern',
    target_display_name: '灯会好友',
    viewer_username: 'tester',
    is_self: false,
    is_friend: true,
    friend_replay_summary: {
      memorial_count: 1,
      memory_record_total_count: 4,
      signed_memory_record_count: 4,
      memory_record_types: ['main_lantern', 'riddle', 'order', 'photo'],
      memory_record_counts: { main_lantern: 1, riddle: 1, order: 1, photo: 1 },
      has_photo_line: true,
      summary: '可回看 1 条纪念，4/4 条灯会记忆已署名。'
    },
    memorials: [
      {
        memorial_id: 'festival_memorial:friend_lantern:e2e',
        label: '上元灯会纪念',
        room_id: 'friend-lantern-room',
        template_id: 'lantern_fair',
        template_label: '上元灯会',
        gameplay_template_id: 'assembly',
        gameplay_template_label: '灯会共建',
        awarded_at: 1,
        reward_summary: '只读好友纪念，不发奖励。',
        reward_money: 0,
        reward_ticket_quantity: 0,
        decoration_label: '',
        title_label: '',
        squadmate_display_names: ['测试者', '灯谜手', '巡场人'],
        squadmate_friend_display_names: ['测试者'],
        photo_moment_label: '上元灯会合影',
        photo_line: '灯会好友 与 测试者、灯谜手、巡场人 在 上元灯会 留下了一张灯会共建留影。',
        photo_taken: true,
        memory_records: memoryRecords,
        memory_record_summary: {
          total_count: 4,
          signed_count: 4,
          pending_count: 0,
          memory_record_counts: { main_lantern: 1, riddle: 1, order: 1, photo: 1 },
          record_types: ['main_lantern', 'riddle', 'order', 'photo'],
          signed_record_types: ['main_lantern', 'riddle', 'order', 'photo'],
          pending_record_types: [],
          signed_actor_display_names: ['灯会好友', '灯谜手', '巡场人', '合影人'],
          summary: '灯会记忆 4/4 条已署名'
        }
      }
    ]
  }
}

async function mockFestivalFriendMemorials(page: Page) {
  await page.route('**/api/taoyuan/online/festival/memorials/*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildFestivalFriendMemorialOverview())
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

function buildFestivalSquareProject(contributed = false) {
  const completionRoomLaunch = contributed
    ? {
        template_id: 'lantern_fair',
        gameplay_template_id: 'assembly',
        title: '节庆广场开幕',
        label: '上元灯会房间',
        summary: '用共建广场开启正式灯会房间'
      }
    : null

  return {
    id: 'festival_square',
    label: '节庆筹备',
    summary: '把空广场搭成可开幕的节会现场。',
    status: contributed ? 'completed' : 'active',
    status_label: contributed ? '已开幕' : '建设中',
    progress: contributed ? 100 : 35,
    target_progress: 100,
    progress_percent: contributed ? 100 : 35,
    remaining_progress: contributed ? 0 : 65,
    completed_at: contributed ? 8 : 0,
    completed_by: contributed ? 'tester' : '',
    completed_by_display_name: contributed ? '测试者' : '',
    progress_note: contributed ? '节庆广场已开幕，可创建正式灯会房间。' : '备料桌等着第一批节庆布景。',
    completion_feedback: contributed ? '节庆广场开幕，灯会房间入口已开放。' : '',
    world_feedback: contributed ? '广场灯门亮起，社员可以开上元灯会房间。' : '',
    completion_room_launch: completionRoomLaunch,
    completion_rewards: contributed
      ? [{ id: 'festival_square_memorial', label: '开幕留影纪念', summary: '公共史册记录广场开幕，不发个人资产。' }]
      : [],
    can_contribute: !contributed,
    my_contribution_count: contributed ? 1 : 0,
    contribution_packages: contributed ? [] : [
      {
        id: 'festival_scenery',
        label: '布景搭设',
        kind: 'scenery',
        summary: '搭起第一批节庆布景，让空广场变成节会现场。',
        progress_gain: 65,
        daily_limit: 1,
        weekly_limit: 3,
        costs: []
      }
    ],
    recent_contributions: contributed
      ? [{ id: 'festival-square-e2e-contribution', username: 'tester', display_name: '测试者', package_id: 'festival_scenery', package_label: '布景搭设', progress_gain: 65, created_at: 7 }]
      : []
  }
}

function buildFestivalSquareVisualProject(contributed = false) {
  return {
    id: 'festival_square',
    label: '节庆筹备',
    kind: 'festival_square',
    day_tag: 'e2e-day',
    week_tag: 'e2e-week',
    starts_at: 0,
    ends_at: 0,
    current_stage_id: contributed ? 'festival_square_opening' : 'festival_square_prepare',
    stages: [
      {
        id: 'festival_square_prepare',
        label: '备料',
        state: contributed ? 'complete' : 'active',
        progress_value: contributed ? 100 : 35,
        progress_target: 100,
        object_ids: ['festival_square_empty', 'festival_square_supply_table'],
        contribution_options: contributed ? [] : [
          {
            id: 'festival_scenery',
            label: '布景搭设',
            kind: 'scenery',
            available_action_id: 'festival_scenery',
            daily_limit: 1,
            weekly_limit: 3,
            resource_cost_preview: {},
            progress_delta: 65,
            reward_preview: '公共布景 +65'
          }
        ],
        milestones: [{ id: 'festival_square_first_scene', label: '第一批布景', progress_required: 60, reached: contributed }]
      },
      {
        id: 'festival_square_build',
        label: '搭场',
        state: contributed ? 'complete' : 'pending',
        progress_value: contributed ? 100 : 0,
        progress_target: 100,
        object_ids: ['festival_square_stage', 'festival_square_lantern_gate'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'festival_square_rehearsal',
        label: '彩排',
        state: contributed ? 'complete' : 'pending',
        progress_value: contributed ? 100 : 0,
        progress_target: 100,
        object_ids: ['festival_square_riddle_tags', 'festival_square_program'],
        contribution_options: [],
        milestones: []
      },
      {
        id: 'festival_square_opening',
        label: '开幕',
        state: contributed ? 'complete' : 'pending',
        progress_value: contributed ? 100 : 0,
        progress_target: 100,
        object_ids: ['festival_square_crowd', 'festival_square_photo_spot'],
        contribution_options: [],
        milestones: []
      }
    ],
    contributors: contributed ? [
      { username: 'tester', display_name: '测试者', contribution_value: 65, rank: 1 }
    ] : [],
    history: contributed ? [
      { id: 'festival-square-history-open', summary: '测试者搭起第一批节庆布景，广场准备开幕。', created_at: 7 }
    ] : [],
    completion_room_template_id: contributed ? 'lantern_fair' : '',
    completion_event_id: contributed ? 'festival-square-opened' : '',
    completion_room_launch: contributed
      ? {
          template_id: 'lantern_fair',
          gameplay_template_id: 'assembly',
          title: '节庆广场开幕',
          label: '上元灯会房间',
          summary: '用共建广场开启正式灯会房间'
        }
      : null
  }
}

function buildPublicWarehouse(deposited = false, consumed = false) {
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
        id: 'warehouse-e2e-rice-log',
        username: 'tester',
        display_name: '测试者',
        action: 'deposit',
        deposit_id: 'grain_rice',
        deposit_label: '稻米入仓',
        category_id: 'grain',
        category_label: '粮食',
        weekly_points: 10,
        context_id: 'warehouse-e2e',
        idempotency_key: 'warehouse-e2e-rice',
        entries: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }],
        created_at: 5
      }
    ].concat(consumed ? [
      {
        id: 'warehouse-e2e-cookpot-log',
        username: 'tester',
        display_name: '测试者',
        action: 'consume',
        deposit_id: 'laba_cookpot_base',
        deposit_label: '腊八共灶底料',
        category_id: 'grain',
        category_label: '粮食',
        weekly_points: 0,
        context_id: 'warehouse-e2e',
        idempotency_key: 'warehouse-e2e-cookpot',
        entries: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }],
        created_at: 6
      }
    ] : []) : [],
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
    },
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
        costs: [{ item_id: 'rice', quantity: 2, label: '稻米 x2' }]
      }
    ] : []
  }
}

function buildSocietyOverview(options: { focus?: 'bridge' | 'lantern_wall' | 'festival_square' | 'warehouse'; contributed?: boolean; warehouseDeposited?: boolean; warehouseConsumed?: boolean } = {}) {
  const focus = options.focus || 'bridge'
  const bridgeProject = buildSocietyProject()
  const lanternWallProject = buildLanternWallProject(Boolean(options.contributed))
  const festivalSquareProject = buildFestivalSquareProject(Boolean(options.contributed))
  const publicProjects = focus === 'lantern_wall'
    ? [lanternWallProject, bridgeProject]
    : focus === 'festival_square'
      ? [festivalSquareProject, bridgeProject]
      : [bridgeProject]
  const asyncProjects = focus === 'lantern_wall'
    ? [buildLanternWallVisualProject(Boolean(options.contributed))]
    : focus === 'festival_square'
      ? [buildFestivalSquareVisualProject(Boolean(options.contributed))]
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
      name: focus === 'warehouse' ? '清溪仓社' : focus === 'festival_square' ? '清溪节社' : '清溪灯社',
      summary: '测试公共建设',
      notice: focus === 'warehouse' ? '本周先补齐村社仓廪。' : focus === 'festival_square' ? '本周先把广场搭成节会现场。' : '本周先修桥。',
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
        recent_feedback: focus === 'lantern_wall' && options.contributed
          ? '测试者写下一张愿望签，花灯墙亮了一角。'
          : focus === 'festival_square' && options.contributed
            ? '测试者搭起第一批节庆布景，广场开始像节会现场。'
            : '',
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
      public_warehouse: buildPublicWarehouse(Boolean(options.warehouseDeposited), Boolean(options.warehouseConsumed))
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
      { id: 'lantern_wall', label: '共建花灯墙', summary: '', target_progress: 100 },
      { id: 'festival_square', label: '节庆筹备', summary: '', target_progress: 100 }
    ],
    public_project_package_options: publicProjects.flatMap(project => project.contribution_packages)
  }
  return overview
}

async function mockOnlineSociety(page: Page, options: { focus?: 'bridge' | 'lantern_wall' | 'festival_square' | 'warehouse' } = {}) {
  let contributed = false
  let warehouseDeposited = false
  let warehouseConsumed = false
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
    const overview = buildSocietyOverview({ focus: options.focus, contributed, warehouseDeposited, warehouseConsumed })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) })
  })
  await page.route('**/api/taoyuan/online/societies/public-projects/*/contribute', async route => {
    contributed = true
    const overview = buildSocietyOverview({ focus: options.focus, contributed, warehouseDeposited, warehouseConsumed })
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
  await page.route('**/api/taoyuan/online/societies/public-warehouse/deposit', async route => {
    warehouseDeposited = true
    const overview = buildSocietyOverview({ focus: options.focus, contributed, warehouseDeposited, warehouseConsumed })
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
    warehouseConsumed = true
    const overview = buildSocietyOverview({ focus: options.focus, contributed, warehouseDeposited, warehouseConsumed })
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

function buildCohabitationContract() {
  return {
    id: 'cohab-e2e',
    type: 'business_partner',
    type_label: '合伙庄园',
    title: '权限 smoke 庄园',
    status: 'active',
    shared_manor_id: 'shared-manor-e2e',
    members: [
      {
        username: 'tester',
        username_key: 'tester',
        display_name: '测试者',
        role: 'owner',
        status: 'accepted',
        manor_role: 'family_head',
        save_id: 1,
        save_slot: 1,
        accepted_at: 1
      },
      {
        username: 'helper',
        username_key: 'helper',
        display_name: '帮手',
        role: 'member',
        status: 'accepted',
        manor_role: 'storage_keeper',
        save_id: 2,
        save_slot: 1,
        accepted_at: 1
      }
    ],
    shared_fund: { balance: 300, ledger: [] },
    shared_warehouse: { items: [], ledger: [] },
    audit_log: [],
    separation_previews: [],
    created_at: 1,
    updated_at: 1,
    activated_at: 1
  }
}

function buildCohabitationPermissionsPanel(depositEnabled: boolean, audits: any[] = []) {
  const groups = [
    { id: 'storage', keys: ['deposit', 'withdraw_common', 'sell_items'] },
    { id: 'fund', keys: ['spend_small', 'spend_medium', 'auto_buy_seeds_feed'] }
  ]
  const basePermissions = {
    storage: { deposit: true, withdraw_common: true, sell_items: true },
    fund: { spend_small: true, spend_medium: true, auto_buy_seeds_feed: true }
  }
  return {
    contract_id: 'cohab-e2e',
    shared_manor_id: 'shared-manor-e2e',
    status: 'active',
    editable_by_actor: true,
    idempotency_required: true,
    safety_rails: {
      rare_withdraw_requires_both: true,
      large_fund_spend_requires_both: true,
      demolish_requires_both: true,
      separation_requires_preview: true
    },
    groups,
    members: [
      {
        username: 'tester',
        username_key: 'tester',
        display_name: '测试者',
        role: 'owner',
        status: 'accepted',
        manor_role: 'family_head',
        can_manage_permissions: true,
        permissions: basePermissions
      },
      {
        username: 'helper',
        username_key: 'helper',
        display_name: '帮手',
        role: 'member',
        status: 'accepted',
        manor_role: 'storage_keeper',
        can_manage_permissions: false,
        permissions: {
          storage: { deposit: depositEnabled, withdraw_common: true, sell_items: false },
          fund: { spend_small: true, spend_medium: false, auto_buy_seeds_feed: true }
        }
      }
    ],
    recent_permission_audits: audits
  }
}

async function mockOnlineCohabitation(page: Page) {
  const contract = buildCohabitationContract()
  let helperDepositEnabled = false
  let permissionAudits: any[] = []
  const sharedAuditLog = [{
    id: 'audit-shared-log-technical-e2e',
    action: 'offline_queue_merged',
    actor_username: 'tester',
    actor_display_name: '测试者',
    detail: {
      offline_conflict_resolution: {
        committed_count: 1,
        idempotent_count: 1,
        rejected_count: 0,
        ledger_count: 2,
        client_queue_stale: false
      },
      result_ledger_ids: ['ledger-shared-log-a', 'ledger-shared-log-b'],
      receipt_id: 'receipt-shared-log-e2e',
      receipt_hash: 'hash-shared-log-e2e',
      client_queue_revision: 3,
      server_queue_revision: 4,
      idempotency_key: 'idempotency-shared-log-e2e'
    },
    idempotency_key: 'audit-shared-log-idempotency-e2e',
    at: 3
  }]
  let sharedPetCareCount = 0
  let sharedPetLastCareItemId = ''
  const sharedPetCareItems: Record<string, {
    label: string
    effect: string
    friendshipGain: number
    moodGain: number
    riskLevel?: string
    requiresConfirmation?: boolean
    confirmationPhrase?: string
  }> = {
    vitality_feed: { label: '活力饲料', effect: '活力照料', friendshipGain: 3, moodGain: 8, riskLevel: 'standard' },
    premium_feed: { label: '精饲料', effect: '亲密照料', friendshipGain: 6, moodGain: 12, riskLevel: 'standard' },
    nourishing_feed: { label: '滋补饲料', effect: '滋养照料', friendshipGain: 4, moodGain: 10, riskLevel: 'standard' },
    lotus_heart_cat_treat: {
      label: '莲心桂花糕',
      effect: '高阶灵宠点心',
      friendshipGain: 10,
      moodGain: 16,
      riskLevel: 'high_value_pet_treat',
      requiresConfirmation: true,
      confirmationPhrase: '确认消耗共同宠物高阶点心'
    },
  }
  const sharedWarehouseStock: Record<string, number> = {
    vitality_feed: 3,
    premium_feed: 2,
    nourishing_feed: 1,
    lotus_heart_cat_treat: 1
  }
  const sharedPetId = 'shared-pet-e2e'
  const buildFundDraft = (overrides: Record<string, any>) => ({
    id: 'fund-draft-e2e',
    contract_id: contract.id,
    state: 'pending_confirmation',
    requested_by: 'tester',
    requested_by_key: 'tester',
    amount: 1500,
    purpose: 'family_building',
    purpose_label: '家族建筑',
    spend_category: 'building',
    target_ref: 'family_building:family_hall:build',
    memo: '',
    balance_snapshot: 5000,
    projected_balance_after: 3500,
    current_balance_snapshot: 5000,
    projected_current_balance_after: 3500,
    balance_sufficient: true,
    required_member_usernames: ['tester', 'helper'],
    confirmed_member_usernames: ['helper'],
    pending_member_usernames: ['tester'],
    confirmation_events: [],
    confirmation_state: {
      required_member_usernames: ['tester', 'helper'],
      confirmed_member_usernames: ['helper'],
      pending_member_usernames: ['tester'],
      requester_auto_confirmed: false,
      requires_all_members: true,
      all_members_confirmed: false,
      ready_for_execution_request: false,
      last_confirmed_by: 'helper',
      last_confirmed_at: 1,
      can_execute_now: false,
      execution_enabled: true,
      policy: 'all_members'
    },
    created_at: 1,
    expires_at: 9999999999,
    ready_at: 0,
    confirmed_at: 0,
    executed_at: 0,
    executed_by: '',
    last_confirmed_by: 'helper',
    last_confirmed_at: 1,
    idempotency_key: 'fund-draft-e2e',
    confirmation_required: true,
    confirmation_status: 'pending',
    execution_enabled: true,
    final_spend_ledger_id: '',
    final_building_ledger_id: '',
    high_risk_receipt_id: '',
    high_risk_receipt_status: '',
    high_risk_receipt_outcome: '',
    high_risk_receipt_ref: '',
    high_risk_receipt_memo: '',
    high_risk_receipt_idempotency_key: '',
    high_risk_receipt_at: 0,
    high_risk_receipt_by: '',
    high_risk_receipt_by_display_name: '',
    high_risk_refund_ledger_id: '',
    compensation_policy: 'audit',
    deferred_operations: [],
    ...overrides
  })
  const fundLargeSpendDrafts = [
    buildFundDraft({ id: 'fund-draft-confirm-e2e' }),
    buildFundDraft({
      id: 'fund-draft-execute-e2e',
      state: 'ready_to_execute',
      confirmation_status: 'confirmed',
      confirmed_member_usernames: ['tester', 'helper'],
      pending_member_usernames: [],
      confirmation_state: {
        required_member_usernames: ['tester', 'helper'],
        confirmed_member_usernames: ['tester', 'helper'],
        pending_member_usernames: [],
        requester_auto_confirmed: true,
        requires_all_members: true,
        all_members_confirmed: true,
        ready_for_execution_request: true,
        last_confirmed_by: 'tester',
        last_confirmed_at: 2,
        can_execute_now: true,
        execution_enabled: true,
        policy: 'all_members'
      },
      amount: 1600,
      projected_current_balance_after: 3400
    }),
    buildFundDraft({
      id: 'fund-draft-receipt-e2e',
      state: 'executed',
      confirmation_status: 'confirmed',
      amount: 1800,
      purpose: 'rare_item_purchase',
      purpose_label: '稀有物采购',
      spend_category: 'purchase',
      target_ref: 'rare_item:lotus_seed_rare',
      final_spend_ledger_id: 'fund-ledger-high-risk-e2e',
      high_risk_receipt_status: 'pending',
      high_risk_receipt_ref: 'delivery:rare_item:lotus_seed_rare:receipt',
      executed_at: 3
    })
  ]
  const buildFund = () => ({
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: 'active',
    balance: 5000,
    ledger: [],
    large_spend_drafts: fundLargeSpendDrafts,
    summary: {
      balance: 5000,
      ledger_count: 0,
      personal_money_merged: false,
      contribution_enabled: true,
      spend_enabled: true,
      medium_spend_enabled: true,
      large_spend_draft_enabled: true,
      large_spend_execution_enabled: true,
      medium_spend_max_amount: 1200,
      idempotency_required: true,
      large_spend_requires_both: true,
      compensation_policy: 'audit',
      allowed_large_spend_purposes: [
        { id: 'family_building', label: '家族建筑', category: 'building', max_amount: 5000, confirmation_required: true },
        { id: 'rare_item_purchase', label: '稀有物采购', category: 'purchase', max_amount: 5000, confirmation_required: true }
      ]
    },
    permissions: { can_spend_large: true, can_spend_medium: true }
  })
  const buildWarehouseDraft = (overrides: Record<string, any>) => ({
    id: 'warehouse-draft-e2e',
    state: 'pending_confirmation',
    item_id: 'lotus_heart_cat_treat',
    quantity: 1,
    quality: 'rare',
    risk_level: 'rare',
    requester_username: 'tester',
    requester_display_name: '测试者',
    requester_username_key: 'tester',
    required_member_usernames: ['tester', 'helper'],
    confirmation_events: [],
    confirmation_state: {
      required_member_usernames: ['tester', 'helper'],
      confirmed_member_usernames: ['helper'],
      pending_member_usernames: ['tester'],
      all_members_confirmed: false,
      last_confirmed_by: 'helper',
      last_confirmed_at: 1
    },
    frozen_quantity: 1,
    frozen_at: 1,
    freeze_release_available: true,
    freeze_policy: 'both_members',
    compensation_hint: '按仓库流水补偿',
    rollback_plan: '撤销冻结会释放共同仓库库存',
    warehouse_ledger_ids: [],
    created_at: 1,
    executed_at: 0,
    rolled_back_at: 0,
    ...overrides
  })
  const warehouseHighValueDrafts = [
    buildWarehouseDraft({ id: 'warehouse-draft-confirm-e2e' }),
    buildWarehouseDraft({
      id: 'warehouse-draft-execute-e2e',
      state: 'ready_to_execute',
      confirmation_state: {
        required_member_usernames: ['tester', 'helper'],
        confirmed_member_usernames: ['tester', 'helper'],
        pending_member_usernames: [],
        all_members_confirmed: true,
        last_confirmed_by: 'tester',
        last_confirmed_at: 2
      }
    })
  ]

  const buildSharedWarehouse = () => ({
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: 'active',
    items: Object.entries(sharedWarehouseStock)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({
          item_id: itemId,
          quantity,
          quality: 'common',
          label: sharedPetCareItems[itemId]?.label || itemId,
          source_owner_username: 'tester',
          source_owner_display_name: '测试者'
        })),
    ledger: sharedPetCareCount > 0
      ? [{
          id: 'warehouse-ledger-shared-pet-care-e2e',
          action: 'consume_for_shared_pet_care',
          item_id: sharedPetLastCareItemId || 'vitality_feed',
          quantity: 1,
          quality: 'common',
          actor_username: 'tester',
          actor_display_name: '测试者',
          source_owner_username: 'tester',
          source_owner_display_name: '测试者',
          source_save_id: 1,
          source_save_slot: 1,
          idempotency_key: 'shared-pet-care-e2e',
          status: 'committed',
          created_at: 2
        }]
      : [],
    high_value_withdrawal_drafts: warehouseHighValueDrafts,
    summary: {
      item_count: Object.values(sharedWarehouseStock).filter(quantity => quantity > 0).length,
      total_quantity: Object.values(sharedWarehouseStock).reduce((sum, quantity) => sum + quantity, 0),
      frozen_quantity: warehouseHighValueDrafts.length,
      ledger_count: sharedPetCareCount > 0 ? 1 : 0,
      personal_money_merged: false,
      deposit_enabled: true,
      withdraw_enabled: true,
      high_value_withdrawal_confirmation_enabled: true,
      high_value_withdrawal_draft_count: warehouseHighValueDrafts.length,
      active_high_value_withdrawal_draft_count: warehouseHighValueDrafts.length,
      sell_enabled: true,
      idempotency_required: true,
      compensation_policy: 'audit'
    },
    permissions: {
      can_create_high_value_withdrawal_draft: true,
      can_withdraw_high_quality: true,
      can_withdraw_rare: true,
      can_withdraw_common: true,
      can_sell_items: true,
      can_deposit: true
    }
  })

  const buildFamilyFestivalSeatsPanel = () => ({
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    type: contract.type,
    type_label: contract.type_label,
    status: 'active',
    readonly: false,
    write_enabled: true,
    writes_enabled: true,
    festival_seats_enabled: true,
    seat_reservation_enabled: true,
    festival_room_binding_enabled: true,
    generated_at: 1,
    revision: 1,
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
    actor: null,
    members: contract.members.map((member, index) => ({
      ...member,
      username_key: member.username,
      manor_role_label: index === 0 ? '家主' : '仓管',
      seat_id: `festival-seat-${index + 1}`,
      seat_index: index,
      seat_label: index === 0 ? '主灯席' : '供品席',
      festival_role: index === 0 ? 'host' : 'support',
      seat_summary: index === 0 ? '负责开场与结算' : '负责供品与协作',
      seat_state: 'ready',
      seat_permissions: {
        can_prepare_supplies_preview: true,
        can_open_festival_room: true
      }
    })),
    candidate_templates: [{
      id: 'lantern_family_e2e',
      label: '家族上元灯会',
      visual_type: 'scene',
      member_limit: 4,
      family_compatible: true,
      available: true,
      binding_enabled: true,
      room_create_enabled: true,
      reward_enabled: true,
      unlock_source: 'e2e',
      recommended_roles: ['host', 'support'],
      summary: '席位预填节会模板',
      disabled_reason: ''
    }],
    reservations: {},
    ledger: [],
    active_template_id: 'lantern_family_e2e',
    active_room_id: '',
    last_settlement_id: '',
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
    visual_state_preview: {
      board_type: 'scene',
      board_id: 'family-festival-e2e',
      revision: 1,
      selected_visual_id: 'lantern_family_e2e',
      recent_feedback: '家族节会席位已预排，可确认后执行。',
      scene: null,
      scene_objects: [
        {
          id: 'festival-stage-e2e',
          label: '灯会主台',
          kind: 'stage',
          state: 'ready',
          x: 50,
          y: 42,
          linked_template_ids: ['lantern_family_e2e'],
          linked_role_ids: ['host'],
          seat_count: 2,
          available_action_ids: ['reserve_family_festival_seat', 'create_festival_room_from_family_seats']
        }
      ],
      seats: []
    },
    deferred_operations: []
  })

  const buildSharedPet = () => {
    const careItem = sharedPetCareItems[sharedPetLastCareItemId || 'vitality_feed'] ?? sharedPetCareItems.vitality_feed
    return {
      id: sharedPetId,
      shared_pet_id: sharedPetId,
      source_pet_id: 'pet:qa-cat-1',
      type: 'cat',
      name: '狸花灵猫',
      origin_owner_id: 'save-1',
      origin_save_id: 1,
      origin_owner_username: 'tester',
      origin_owner_display_name: '测试者',
      origin_owner_key: 'tester',
      source_save_slot: 1,
      source_save_revision: 1,
      current_caregiver_username: sharedPetCareCount > 0 ? 'tester' : '',
      current_caregiver_display_name: sharedPetCareCount > 0 ? '测试者' : '',
      permission_mode: 'shared_care',
      split_rule: 'return_to_origin_owner',
      permission_restriction: 'shared_warehouse_feed_only',
      readonly: false,
      pet_state: {
        type: 'cat',
        name: '狸花灵猫',
        friendship: sharedPetCareCount > 0 ? 20 + careItem.friendshipGain : 20,
        mood: sharedPetCareCount > 0 ? 30 + careItem.moodGain + 2 : 30,
        care_count: sharedPetCareCount,
        last_care_item_id: sharedPetCareCount > 0 ? sharedPetLastCareItemId : '',
        last_care_item_label: sharedPetCareCount > 0 ? careItem.label : '',
        last_care_item_effect: sharedPetCareCount > 0 ? careItem.effect : '',
        last_cared_at: sharedPetCareCount > 0 ? 2 : 0,
        last_caregiver_username: sharedPetCareCount > 0 ? 'tester' : '',
        cooperation_mood_bonus: sharedPetCareCount > 0 ? 2 : 0,
        last_cooperation_bonus_action: sharedPetCareCount > 0 ? 'shared_pet_care' : '',
        last_cooperation_bonus_members: sharedPetCareCount > 0 ? ['测试者', '帮手'] : []
      }
    }
  }

  const buildSharedPets = () => ({
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: 'active',
    readonly: false,
    writes_enabled: true,
    persisted: true,
    persistence_policy: 'contract_shared_pet_state',
    persisted_at: 1,
    generated_at: 1 + sharedPetCareCount,
    revision: 1 + sharedPetCareCount,
    pets: [buildSharedPet()],
    summary: {
      pet_count: 1,
      cared_count: sharedPetCareCount,
      pet_care_write_enabled: true,
      shared_warehouse_pet_care_consume_enabled: true,
      supported_care_item_ids: ['vitality_feed', 'premium_feed', 'nourishing_feed', 'lotus_heart_cat_treat'],
      personal_save_changed: false,
      included_sources: ['tester:slot:1'],
      deferred_writes: []
    }
  })

  const buildSharedAnimals = () => ({
    contract_id: contract.id,
    shared_manor_id: contract.shared_manor_id,
    status: 'active',
    readonly: false,
    writes_enabled: true,
    generated_at: 1,
    revision: 1,
    animals: [],
    summary: {
      animal_count: 0,
      product_ready_count: 0,
      animal_feed_write_enabled: true,
      animal_pet_write_enabled: true,
      animal_product_collect_enabled: true,
      shared_warehouse_product_deposit_enabled: true,
      personal_save_changed: false,
      deferred_writes: []
    }
  })

  const overview = () => ({
    ok: true,
    relation_options: [
      { id: 'business_partner', label: '合伙庄园', title: '合伙庄园', min_members: 2, max_members: 4, romance_only: false }
    ],
    contracts: [contract],
    summary: { total: 1, pending: 0, active: 1, separation_previews: 0 }
  })
  const permissionsResponse = () => ({
    ok: true,
    contract,
    permissions_panel: buildCohabitationPermissionsPanel(helperDepositEnabled, permissionAudits)
  })
  const emptyDetail = (extra: Record<string, unknown>) => ({ ok: true, contract, ...extra })

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

  await page.route('**/api/taoyuan/online/cohabitation/contracts', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview()) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/shared-map', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({
        shared_map: {
          contract_id: contract.id,
          shared_manor_id: contract.shared_manor_id,
          status: 'active',
          readonly: true,
          writes_enabled: false,
          generated_at: 1,
          revision: 1,
          layout: { columns: 0, rows: 0, regions: [], arrangement: 'mock', strategy: 'mock', stitch_axis: 'x', summary: {} },
          members: [],
          plots: [],
          summary: {
            member_count: 2,
            available_member_count: 2,
            total_plots: 0,
            active_plots: 0,
            harvestable_plots: 0,
            waterable_plots: 0,
            origin_owner_count: 2,
            layout_region_count: 0,
            multi_member_layout: true,
            max_members: 4,
            personal_money_merged: false,
            origin_trace_enabled: true,
            shared_fund_balance: 300,
            deferred_writes: []
          }
        }
      }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/shared-animals', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({ shared_animals: buildSharedAnimals() }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/shared-pets', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({ shared_pets: buildSharedPets() }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/shared-pets/care', async route => {
    const payload = route.request().postDataJSON() as {
      care_item_id?: string
      confirmed_high_value_care?: boolean
      risk_acknowledged?: boolean
      confirmation_text?: string
      rollback_plan_acknowledged?: boolean
      compensation_plan_acknowledged?: boolean
    } | null
    const careItemId = payload?.care_item_id && sharedPetCareItems[payload.care_item_id]
      ? payload.care_item_id
      : 'vitality_feed'
    const careItem = sharedPetCareItems[careItemId]
    if (careItem.requiresConfirmation) {
      expect(payload?.confirmed_high_value_care).toBe(true)
      expect(payload?.risk_acknowledged).toBe(true)
      expect(payload?.confirmation_text).toBe(careItem.confirmationPhrase)
      expect(payload?.rollback_plan_acknowledged).toBe(true)
      expect(payload?.compensation_plan_acknowledged).toBe(true)
    }
    const beforePet = buildSharedPet()
    sharedPetLastCareItemId = careItemId
    sharedPetCareCount = Math.max(sharedPetCareCount, 1)
    sharedWarehouseStock[careItemId] = Math.max(0, (sharedWarehouseStock[careItemId] ?? 0) - 1)
    const pet = buildSharedPet()
    const warehouse = buildSharedWarehouse()
    const ledgerEntry = {
      id: 'shared-pet-ledger-e2e',
      action: 'care',
      pet_id: sharedPetId,
      shared_pet_id: sharedPetId,
      source_pet_id: 'pet:qa-cat-1',
      actor_username: 'tester',
      actor_display_name: '测试者',
      care_item_id: careItemId,
      care_item_label: careItem.label,
      care_item_effect: careItem.effect,
      care_item_profile: {
        item_id: careItemId,
        label: careItem.label,
        care_effect: careItem.effect,
        friendship_gain: careItem.friendshipGain,
        mood_gain: careItem.moodGain,
        risk_level: careItem.riskLevel,
        requires_confirmation: careItem.requiresConfirmation === true,
        confirmation_phrase: careItem.confirmationPhrase || ''
      },
      friendship_gain: careItem.friendshipGain,
      mood_gain: careItem.moodGain,
      risk_level: careItem.riskLevel || 'standard',
      confirmation_required: careItem.requiresConfirmation === true,
      confirmed_high_value_care: careItem.requiresConfirmation === true,
      risk_acknowledged: careItem.requiresConfirmation === true,
      confirmation_text: careItem.requiresConfirmation ? careItem.confirmationPhrase : '',
      rollback_plan_acknowledged: careItem.requiresConfirmation === true,
      compensation_plan_acknowledged: careItem.requiresConfirmation === true,
      warehouse_ledger_ids: ['warehouse-ledger-shared-pet-care-e2e'],
      shared_warehouse_changed: true,
      origin_owner_id: 'save-1',
      origin_owner_username: 'tester',
      origin_owner_display_name: '测试者',
      origin_save_id: 1,
      source_save_slot: 1,
      before_pet_state: beforePet.pet_state,
      after_pet_state: pet.pet_state,
      idempotency_key: 'shared-pet-care-e2e',
      status: 'committed',
      at: 2
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({
        shared_pets: buildSharedPets(),
        warehouse,
        pet,
        ledger_entry: ledgerEntry,
        warehouse_ledger_entries: warehouse.ledger,
        idempotent: false,
        already_cared: false,
        pet_action: {
          action: 'care',
          pet_id: sharedPetId,
          care_item_id: careItemId,
          care_item_label: careItem.label,
          care_item_effect: careItem.effect,
          care_item_profile: {
            item_id: careItemId,
            label: careItem.label,
            care_effect: careItem.effect,
            friendship_gain: careItem.friendshipGain,
            mood_gain: careItem.moodGain,
            risk_level: careItem.riskLevel,
            requires_confirmation: careItem.requiresConfirmation === true,
            confirmation_phrase: careItem.confirmationPhrase || ''
          },
          friendship_gain: careItem.friendshipGain,
          mood_gain: careItem.moodGain,
          risk_level: careItem.riskLevel || 'standard',
          confirmation_required: careItem.requiresConfirmation === true,
          confirmed_high_value_care: careItem.requiresConfirmation === true,
          risk_acknowledged: careItem.requiresConfirmation === true,
          confirmation_text: careItem.requiresConfirmation ? careItem.confirmationPhrase : '',
          rollback_plan_acknowledged: careItem.requiresConfirmation === true,
          compensation_plan_acknowledged: careItem.requiresConfirmation === true,
          before_pet_state: beforePet.pet_state,
          after_pet_state: pet.pet_state,
          personal_save_changed: false,
          shared_warehouse_changed: true,
          shared_fund_changed: false,
          simultaneous_online_bonus: {
            applied: true,
            bonus_value: 2,
            members: ['测试者', '帮手']
          }
        }
      }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/warehouse', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ warehouse: buildSharedWarehouse() })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/warehouse/high-value-withdrawal-drafts', async route => {
    const payload = route.request().postDataJSON() as { item_id?: string; quantity?: number; quality?: string } | null
    expect(payload?.item_id).toBe('lotus_heart_cat_treat')
    expect(payload?.quantity).toBe(1)
    const draft = buildWarehouseDraft({
      id: 'warehouse-draft-created-e2e',
      item_id: payload?.item_id || 'lotus_heart_cat_treat',
      quality: payload?.quality || 'rare'
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ warehouse: buildSharedWarehouse(), draft })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/warehouse/high-value-withdrawal-drafts/warehouse-draft-confirm-e2e/confirm', async route => {
    const payload = route.request().postDataJSON() as { confirmation_text?: string; freeze_acknowledged?: boolean; rollback_plan_acknowledged?: boolean } | null
    expect(payload?.confirmation_text).toBe('确认高价值取出冻结与回滚方案')
    expect(payload?.freeze_acknowledged).toBe(true)
    expect(payload?.rollback_plan_acknowledged).toBe(true)
    const draft = buildWarehouseDraft({
      id: 'warehouse-draft-confirm-e2e',
      state: 'ready_to_execute',
      confirmation_state: {
        required_member_usernames: ['tester', 'helper'],
        confirmed_member_usernames: ['tester', 'helper'],
        pending_member_usernames: [],
        all_members_confirmed: true,
        last_confirmed_by: 'tester',
        last_confirmed_at: 4
      }
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ warehouse: buildSharedWarehouse(), draft })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/warehouse/high-value-withdrawal-drafts/warehouse-draft-execute-e2e/execute', async route => {
    const payload = route.request().postDataJSON() as { expected_state?: string; reason?: string } | null
    expect(payload?.expected_state).toBe('ready_to_execute')
    expect(payload?.reason).toContain('高价值取出')
    const draft = buildWarehouseDraft({
      id: 'warehouse-draft-execute-e2e',
      state: 'executed',
      executed_at: 5,
      confirmation_state: {
        required_member_usernames: ['tester', 'helper'],
        confirmed_member_usernames: ['tester', 'helper'],
        pending_member_usernames: [],
        all_members_confirmed: true,
        last_confirmed_by: 'tester',
        last_confirmed_at: 2
      }
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ warehouse: buildSharedWarehouse(), draft, personal_inventory: { total_quantity: 1 } })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/fund', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ fund: buildFund() })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/fund/large-spend-draft', async route => {
    const payload = route.request().postDataJSON() as { amount?: number; purpose?: string; target_ref?: string } | null
    expect(payload?.amount).toBeGreaterThanOrEqual(1201)
    expect(payload?.purpose).toBeTruthy()
    expect(payload?.target_ref).toBeTruthy()
    const draft = buildFundDraft({
      id: 'fund-draft-created-e2e',
      amount: payload?.amount || 1500,
      purpose: payload?.purpose || 'family_building',
      target_ref: payload?.target_ref || 'family_building:family_hall:build'
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ fund: buildFund(), draft, idempotent: false })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/fund/large-spend-drafts/fund-draft-confirm-e2e/confirm', async route => {
    const payload = route.request().postDataJSON() as { memo?: string } | null
    expect(payload?.memo).toContain('共同基金大额草案')
    const draft = buildFundDraft({
      id: 'fund-draft-confirm-e2e',
      state: 'ready_to_execute',
      confirmation_status: 'confirmed',
      confirmed_member_usernames: ['tester', 'helper'],
      pending_member_usernames: [],
      confirmation_state: {
        required_member_usernames: ['tester', 'helper'],
        confirmed_member_usernames: ['tester', 'helper'],
        pending_member_usernames: [],
        requester_auto_confirmed: true,
        requires_all_members: true,
        all_members_confirmed: true,
        ready_for_execution_request: true,
        last_confirmed_by: 'tester',
        last_confirmed_at: 4,
        can_execute_now: true,
        execution_enabled: true,
        policy: 'all_members'
      }
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ fund: buildFund(), draft })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/fund/large-spend-drafts/fund-draft-execute-e2e/execute', async route => {
    const payload = route.request().postDataJSON() as { memo?: string } | null
    expect(payload?.memo).toContain('执行共同基金大额草案扣款')
    const draft = buildFundDraft({
      id: 'fund-draft-execute-e2e',
      state: 'executed',
      confirmation_status: 'confirmed',
      final_spend_ledger_id: 'fund-ledger-executed-e2e',
      amount: 1600,
      executed_at: 5
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ fund: { ...buildFund(), balance: 3400 }, draft })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/fund/large-spend-drafts/fund-draft-receipt-e2e/high-risk-receipt', async route => {
    const payload = route.request().postDataJSON() as { outcome?: string; receipt_ref?: string } | null
    expect(payload?.outcome).toBe('delivered')
    expect(payload?.receipt_ref).toContain('delivery:')
    const draft = buildFundDraft({
      id: 'fund-draft-receipt-e2e',
      state: 'executed',
      purpose: 'rare_item_purchase',
      purpose_label: '稀有物采购',
      final_spend_ledger_id: 'fund-ledger-high-risk-e2e',
      high_risk_receipt_status: 'delivered',
      high_risk_receipt_outcome: 'delivered',
      high_risk_receipt_ref: payload?.receipt_ref || 'delivery:rare_item:lotus_seed_rare:receipt'
    })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ fund: buildFund(), draft, shared_fund: { balance_after: 5000, refund_amount: 0 } })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/permissions', async route => {
    if (route.request().method() === 'POST') {
      helperDepositEnabled = true
      permissionAudits = [{
        id: 'permission-audit-e2e',
        action: 'permissions_updated',
        actor_username: 'tester',
        actor_display_name: '测试者',
        detail: { target_username: 'helper', target_display_name: '帮手', changed_field_count: 1 },
        idempotency_key: 'permission-e2e',
        at: 2
      }]
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(permissionsResponse()) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/roles', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ role_panel: { contract_id: contract.id, shared_manor_id: contract.shared_manor_id, type: contract.type, type_label: contract.type_label, status: 'active', role_management_enabled: true, editable_by_actor: true, idempotency_required: true, max_members: 4, member_count: 2, role_options: [], constraints: {}, members: [], recent_role_audits: [], deferred_operations: [] } })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/offline-status', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ offline_status: { contract_id: contract.id, shared_manor_id: contract.shared_manor_id, status: 'active', summary: { server_authoritative: true, member_online_required: false, offline_member_blocks_operations: false, independent_operations_enabled: true, personal_money_merged: false, shared_log_available: true, auto_offline_income_enabled: false, conflict_policy: 'server' }, members: [], actor_capabilities: {}, recent_shared_log: sharedAuditLog, deferred_operations: [] } })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/family-festival-seats', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyDetail({ family_festival_seats_panel: buildFamilyFestivalSeatsPanel() })) })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/family-festival-seats/reserve', async route => {
    const payload = route.request().postDataJSON() as { template_id?: string; seat_usernames?: string[]; memo?: string } | null
    expect(payload?.template_id).toBe('lantern_family_e2e')
    expect(payload?.seat_usernames).toEqual(['tester', 'helper'])
    expect(payload?.memo).toContain('锁定家族节会席位')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({
        family_festival_seats_panel: buildFamilyFestivalSeatsPanel(),
        ledger_entry: { id: 'family-festival-reserve-e2e', seat_count: 2 },
        idempotent: false
      }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/family-festival-seats/create-room', async route => {
    const payload = route.request().postDataJSON() as { template_id?: string; title?: string; memo?: string } | null
    expect(payload?.template_id).toBe('lantern_family_e2e')
    expect(payload?.title).toContain('家族上元灯会')
    expect(payload?.memo).toContain('创建家族节会房间')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({
        family_festival_seats_panel: buildFamilyFestivalSeatsPanel(),
        room_id: 'festival-room-family-e2e',
        idempotent: false
      }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/family-festival-seats/consume-supplies', async route => {
    const payload = route.request().postDataJSON() as { template_id?: string; memo?: string } | null
    expect(payload?.template_id).toBe('lantern_family_e2e')
    expect(payload?.memo).toContain('消耗家族节会供品')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({
        family_festival_seats_panel: buildFamilyFestivalSeatsPanel(),
        warehouse_ledger_entries: [{ id: 'family-festival-supplies-e2e' }],
        idempotent: false
      }))
    })
  })
  await page.route('**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/family-festival-seats/settle', async route => {
    const payload = route.request().postDataJSON() as { template_id?: string; amount?: number; points?: number; memo?: string } | null
    expect(payload?.template_id).toBe('lantern_family_e2e')
    expect(payload?.amount).toBe(120)
    expect(payload?.points).toBe(10)
    expect(payload?.memo).toContain('结算家族节会奖励')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyDetail({
        family_festival_seats_panel: buildFamilyFestivalSeatsPanel(),
        fund_ledger_entry: { id: 'family-festival-settle-e2e', amount: 120 },
        reputation_entry: { id: 'family-festival-reputation-e2e', points: 10 },
        idempotent: false
      }))
    })
  })
  const readonlyPanelRoutes = [
    ['family-orders', 'family_orders_panel'],
    ['family-reputation', 'family_reputation_panel'],
    ['family-buildings', 'family_buildings_panel'],
    ['family-relations', 'family_relations_panel'],
    ['family-visibility', 'family_visibility_panel']
  ]
  for (const [path, key] of readonlyPanelRoutes) {
    await page.route(`**/api/taoyuan/online/cohabitation/contracts/cohab-e2e/${path}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyDetail({
          [key]: {
            contract_id: contract.id,
            shared_manor_id: contract.shared_manor_id,
            type: contract.type,
            type_label: contract.type_label,
            status: 'active',
            readonly: true,
            write_enabled: false,
            writes_enabled: false,
            generated_at: 1,
            revision: 1,
            summary: { member_count: 2, max_members: 4, disabled_reason: 'smoke' },
            actor: null,
            members: [],
            deferred_operations: []
          }
        }))
      })
    })
  }
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
    relay_settlement_summary: {
      split_mode: 'stage_pool_weighted',
      status: accepted ? 'settling' : 'planned',
      reward_type: 'money',
      pool_reward_value: 260,
      allocated_reward_value: 260,
      confirmed_reward_value: 80,
      pending_reward_value: 180,
      compensation_pending_reward_value: 0,
      reward_label: '铜钱',
      shares: [
        {
          stage_id: 'stage_collect',
          stage_title: '采收青菜',
          sequence: 1,
          assignee_username: 'helper_done',
          assignee_display_name: '已完成的帮手',
          share_percent: 31,
          reward_value: 80,
          reward_label: '铜钱',
          delivery_status: 'confirmed',
          settlement_status: 'confirmed',
          settlement_receipt_id: 'receipt-stage-collect',
          reward_route: 'personal',
          cohabitation_contract_id: '',
          shared_fund_ledger_id: '',
          confirmed_at: 2
        },
        {
          stage_id: 'stage_process',
          stage_title: '加工干菜',
          sequence: 2,
          assignee_username: accepted ? 'tester' : '',
          assignee_display_name: accepted ? '测试者' : '',
          share_percent: 35,
          reward_value: 90,
          reward_label: '铜钱',
          delivery_status: 'none',
          settlement_status: accepted ? 'pending_owner_confirm' : 'pending',
          settlement_receipt_id: '',
          reward_route: accepted ? 'shared_fund' : 'personal',
          cohabitation_contract_id: accepted ? 'cohab-e2e-family' : '',
          shared_fund_ledger_id: '',
          confirmed_at: 0
        },
        {
          stage_id: 'stage_deliver',
          stage_title: '送到灯会',
          sequence: 3,
          assignee_username: '',
          assignee_display_name: '',
          share_percent: 35,
          reward_value: 90,
          reward_label: '铜钱',
          delivery_status: 'none',
          settlement_status: 'pending',
          settlement_receipt_id: '',
          reward_route: 'personal',
          cohabitation_contract_id: '',
          shared_fund_ledger_id: '',
          confirmed_at: 0
        }
      ]
    },
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
      settlement_status_counts: {
        planned: accepted ? 0 : 1,
        settling: accepted ? 1 : 0,
        settled: 0,
        compensation_pending: 0
      },
      recent_receipts: [
        {
          receipt_id: 'receipt-stage-collect',
          order_id: 'relay-order-e2e',
          order_title: '灯会干菜接力单',
          stage_id: 'stage_collect',
          stage_title: '采收青菜',
          assignee_display_name: '已完成的帮手',
          reward_type: 'money',
          reward_value: 80,
          reward_label: '铜钱',
          reward_route: 'personal',
          status: 'confirmed',
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

function buildManorInteractionAudit(kind: 'care' | 'steal', used = false) {
  const visitorLimit = kind === 'care' ? 4 : 2
  const rewardLabel = kind === 'care'
    ? '照料伴手礼每日封顶，重复提交只读回原凭证。'
    : '普通轻采单次最多 1 件，重复提交只读回原凭证。'
  const settlementLabel = kind === 'care'
    ? '照料收益由服务端写入主人日志和访客伴手礼凭证。'
    : '轻采由服务端写入 settlement_receipt_id，主人库存保留 100%。'
  return {
    visitor_limit_enforced: true,
    manor_limit_enforced: true,
    object_limit_enforced: true,
    whitelist_enforced: kind === 'steal',
    reward_cap_summary: rewardLabel,
    settlement_summary: settlementLabel,
    owner_reserved_percent: kind === 'steal' ? 100 : undefined,
    visitor_reward_quantity_cap: kind === 'steal' ? 1 : undefined,
    recent_window_seconds: 600,
    recent_window_count: used ? 1 : 0,
    daily_visitor_counts: [{
      visitor_username: 'tester',
      visitor_display_name: '测试者',
      count: used ? 1 : 0,
      limit: visitorLimit,
    }],
    risk_flags: [],
    dispute_log_available: true,
  }
}

const manorCareRoomActionDefs = {
  room_irrigate: {
    label: '协作灌溉',
    role_id: 'irrigation',
    role_label: '灌溉手',
    object_id: 'friend_plot_1',
    object_label: '春菜田',
    health_delta: 8,
    summary: '稳住田区水分，为后续护理留出安全窗口。'
  },
  room_feed: {
    label: '协作喂食',
    role_id: 'feeding',
    role_label: '喂食手',
    object_id: 'friend_coop_1',
    object_label: '鸡舍',
    health_delta: 7,
    summary: '补足鸡舍饲喂，降低护理窗口内的躁动风险。'
  },
  room_pest_control: {
    label: '协作除虫',
    role_id: 'pest_control',
    role_label: '除虫手',
    object_id: 'friend_plot_1',
    object_label: '春菜田',
    health_delta: 6,
    summary: '清掉叶背害虫，护理健康度继续提升。'
  },
  room_tidy: {
    label: '协作收拾',
    role_id: 'tidy',
    role_label: '收拾手',
    object_id: 'friend_coop_1',
    object_label: '鸡舍',
    health_delta: 5,
    summary: '收拾掉落物与边角产物，完成护理收尾。'
  }
}

const manorCareRoomActionOrder = Object.keys(manorCareRoomActionDefs)

function buildFriendManorCareRoom(actionIds: string[] = [], completed = false) {
  const actions = actionIds.map((actionId, index) => {
    const action = manorCareRoomActionDefs[actionId as keyof typeof manorCareRoomActionDefs] || manorCareRoomActionDefs.room_irrigate
    const actor = index % 2 === 0
      ? { username: 'tester', display_name: '测试者' }
      : { username: 'friend_helper', display_name: '协作好友' }
    return {
      id: `care-room-action-${actionId}`,
      action_id: actionId,
      action_label: action.label,
      role_id: action.role_id,
      role_label: action.role_label,
      object_id: action.object_id,
      object_label: action.object_label,
      actor_username: actor.username,
      actor_display_name: actor.display_name,
      expected_order: index + 1,
      actual_order: index + 1,
      order_risk: false,
      role_matched: true,
      risk_delta: 0,
      health_delta: action.health_delta,
      idempotency_key: `care-room-e2e:${actionId}`,
      summary: `${actor.display_name} 完成「${action.label}」：${action.summary}`,
      created_at: 5 + index
    }
  })
  const healthScore = actions.reduce((sum, action) => sum + action.health_delta, 0)
  return {
    id: 'care-room-e2e-1',
    target_username: 'friend_owner',
    target_save_id: 1,
    target_save_slot: null,
    creator_username: 'tester',
    creator_display_name: '测试者',
    member_limit: 2,
    day_tag: '2026-05-25',
    idempotency_key: 'care-room-e2e-create',
    status: completed ? 'completed' : 'in_progress',
    window_started_at: 1,
    window_ends_at: 1760000600,
    participants: [
      { username: 'tester', display_name: '测试者', role_id: 'irrigation', role_label: '灌溉手', joined_at: 1 },
      { username: 'friend_helper', display_name: '协作好友', role_id: 'feeding', role_label: '喂食手', joined_at: 2 }
    ],
    actions,
    risk_score: 0,
    health_score: healthScore,
    health_delta: completed ? healthScore : 0,
    settlement_receipt_id: completed ? 'care-room-e2e-settlement-1' : '',
    settled_by: completed ? '测试者' : '',
    settled_at: completed ? 10 : 0,
    summary: completed
      ? '护理房间已结算：灌溉、喂食、除虫、收拾四项完成，健康度提升 26。'
      : actions.length > 0
        ? actions[actions.length - 1].summary
        : '护理房间已建立，等待成员完成灌溉、喂食、除虫、收拾。',
    created_at: 1,
    updated_at: completed ? 10 : 5 + actions.length,
    viewer_is_member: true,
    remaining_seconds: completed ? 0 : 560,
    available_action_ids: completed ? [] : manorCareRoomActionOrder.filter(actionId => !actionIds.includes(actionId)),
    can_join: false,
    can_act: !completed,
    can_settle: !completed && actionIds.length >= manorCareRoomActionOrder.length
  }
}

function buildFriendManorSnapshot(cared = false, stolen = false, careRoomActionIds: string[] = [], careRoomSettled = false, careRoomCreated = false) {
  const activeCareRoom = careRoomCreated || careRoomActionIds.length > 0 || careRoomSettled
    ? buildFriendManorCareRoom(careRoomActionIds, careRoomSettled)
    : null
  const recentCareRoomRecords = careRoomSettled && activeCareRoom ? [activeCareRoom] : []
  const objects = [
    {
      id: 'friend_plot_1',
      label: '春菜田',
      kind: 'field',
      x: 36,
      y: 48,
      state: cared ? 'busy' : 'needs_action',
      available_action_ids: cared ? [] : ['water_plot'],
      progress_value: cared ? 2 : 1,
      progress_target: 3,
      handled_by: cared ? '测试者' : '',
      handled_at: cared ? 3 : 0,
      requires_cooperation: false,
      cooperation_required_count: 1,
      cooperation_current_count: cared ? 1 : 0
    },
    {
      id: 'friend_coop_1',
      label: '鸡舍',
      kind: 'animal_shed',
      x: 65,
      y: 52,
      state: 'idle',
      available_action_ids: ['feed_animal'],
      progress_value: 0,
      progress_target: 2,
      handled_by: '',
      handled_at: 0,
      requires_cooperation: false,
      cooperation_required_count: 1,
      cooperation_current_count: 0
    },
    {
      id: 'friend_tidy_corner_1',
      label: '收拾角',
      kind: 'storage',
      x: 72,
      y: 34,
      state: careRoomSettled ? 'busy' : 'needs_action',
      available_action_ids: [],
      progress_value: careRoomSettled ? 4 : careRoomActionIds.length,
      progress_target: 4,
      handled_by: careRoomSettled ? '测试者、协作好友' : '',
      handled_at: careRoomSettled ? 10 : 0,
      requires_cooperation: true,
      cooperation_required_count: 2,
      cooperation_current_count: activeCareRoom ? activeCareRoom.participants.length : 0
    },
    {
      id: 'friend_apple_tree_1',
      label: '秋苹果树',
      kind: 'fruit_tree',
      x: 52,
      y: 35,
      state: stolen ? 'busy' : 'needs_action',
      available_action_ids: stolen ? [] : ['light_harvest'],
      progress_value: stolen ? 1 : 0,
      progress_target: 1,
      handled_by: stolen ? '测试者' : '',
      handled_at: stolen ? 4 : 0,
      requires_cooperation: false,
      cooperation_required_count: 1,
      cooperation_current_count: stolen ? 1 : 0
    }
  ]
  return {
    username: 'friend_owner',
    display_name: '好友庄园主',
    visibility: 'public',
    viewer_is_owner: false,
    manor_name: '春畦小院',
    avatar_image_url: '',
    avatar_image_alt: '',
    cover_image_url: '',
    cover_image_alt: '',
    public_title: '欢迎顺手照料',
    showcase_theme: '春日互助',
    season_progress: '春季第 3 日',
    current_focus: '春菜田护理',
    weekly_goal: '保持作物健康',
    visual_summary: '好友庄园照料 smoke',
    placed_decoration_count: 2,
    public_tags: [{ id: 'care', label: '可照料', source: 'auto' }],
    guestbook_entries: [],
    visit_entries: [],
    guide_points: [],
    guide_routes: [],
    today_visit_summary: '今日等待好友照料',
    is_favorited_by_viewer: false,
    is_followed_by_viewer: false,
    access_policy: {
      visit_mode: 'public',
      care_mode: 'friends',
      steal_mode: 'mutual',
      updated_at: 3,
      options: [
        { id: 'public', label: '公开' },
        { id: 'friends', label: '好友' },
        { id: 'mutual', label: '互关好友' },
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
      can_steal: true
    },
    visual_state: {
      ...emptyVisualState,
      board_type: 'scene',
      board_id: 'friend_manor_care',
      revision: stolen ? 3 : cared ? 2 : 1,
      selected_visual_id: stolen ? 'friend_apple_tree_1' : 'friend_plot_1',
      objects,
      recent_feedback: stolen ? '测试者轻采了秋苹果树，主人库存保持完整。' : cared ? '测试者帮春菜田浇了水。' : ''
    },
    care_state: {
      day_tag: '2026-05-25',
      action_labels: { water_plot: '帮忙浇水', feed_animal: '帮忙喂食' },
      scene_action_labels: { water_plot: '帮忙浇水', feed_animal: '帮忙喂食' },
      action_effects: {
        water_plot: { owner_benefit: '作物健康保护', visitor_reward: '友情点 +1' },
        feed_animal: { owner_benefit: '动物心情保护', visitor_reward: '友情点 +1' }
      },
      limits: { visitor_daily_limit: 4, manor_daily_limit: 12 },
      visitor_daily_count: cared ? 1 : 0,
      manor_daily_count: cared ? 1 : 0,
      remaining_care_count: cared ? 3 : 4,
      manor_remaining_care_count: cared ? 11 : 12,
      can_care: true,
      audit: buildManorInteractionAudit('care', cared),
      care_denied_reason: ''
    },
    steal_state: {
      day_tag: '2026-05-25',
      action_labels: { light_harvest: '轻采果实' },
      action_effects: {
        light_harvest: { owner_compensation: '主人保留 100% 库存并收到轻采凭证', visitor_reward: '普通苹果 x1' }
      },
      limits: { visitor_daily_limit: 2, manor_daily_limit: 6, object_daily_limit: 1 },
      visitor_daily_count: stolen ? 1 : 0,
      manor_daily_count: stolen ? 1 : 0,
      remaining_steal_count: stolen ? 1 : 2,
      manor_remaining_steal_count: stolen ? 5 : 6,
      can_steal: true,
      steal_denied_reason: '',
      audit: buildManorInteractionAudit('steal', stolen),
      whitelist_summary: '只允许普通成熟果实、普通作物和边角产物，关键物、稀有物、唯一物和活动核心物排除。',
      target_use_hints: {
        friend_apple_tree_1: {
          item_id: 'apple',
          label: '普通苹果',
          use_tags: ['food', 'order', 'festival'],
          use_summary: '可用于料理、订单与节会备料。'
        }
      }
    },
    care_entries: cared ? [{
      id: 'care-entry-1',
      target_username: 'friend_owner',
      target_save_id: 1,
      target_save_slot: null,
      visitor_username: 'tester',
      visitor_display_name: '测试者',
      action_id: 'water_plot',
      action_label: '帮忙浇水',
      object_id: 'friend_plot_1',
      object_label: '春菜田',
      day_tag: '2026-05-25',
      idempotency_key: 'care-e2e-1',
      owner_benefit: '作物健康保护',
      visitor_reward: '友情点 +1',
      summary: '测试者帮春菜田浇了水。',
      created_at: 3
    }] : [],
    steal_entries: stolen ? [{
      id: 'steal-entry-1',
      target_username: 'friend_owner',
      target_save_id: 1,
      target_save_slot: null,
      visitor_username: 'tester',
      visitor_display_name: '测试者',
      action_id: 'light_harvest',
      action_label: '轻采果实',
      object_id: 'friend_apple_tree_1',
      object_label: '秋苹果树',
      target_id: 'friend_apple_tree_1',
      target_label: '秋苹果树',
      item_id: 'apple',
      item_label: '普通苹果',
      quantity: 1,
      use_tags: ['food', 'order', 'festival'],
      use_summary: '可用于料理、订单与节会备料。',
      day_tag: '2026-05-25',
      idempotency_key: 'steal-e2e-1',
      owner_compensation: '主人保留 100% 库存并收到轻采凭证',
      visitor_reward: '普通苹果 x1',
      visitor_reward_quantity: 1,
      reward_daily_cap: 2,
      owner_reserved_ratio: 1,
      settlement_receipt_id: 'receipt-steal-e2e-1',
      note: '轻采后给主人留了感谢。',
      summary: '测试者轻采了秋苹果树，主人库存保持完整。',
      created_at: 4
    }] : [],
    care_room_state: {
      day_tag: '2026-05-25',
      action_labels: Object.fromEntries(Object.entries(manorCareRoomActionDefs).map(([id, action]) => [id, action.label])),
      action_effects: Object.fromEntries(Object.entries(manorCareRoomActionDefs).map(([id, action]) => [id, {
        role_id: action.role_id,
        role_label: action.role_label,
        object_id: action.object_id,
        object_label: action.object_label,
        health_delta: action.health_delta,
        risk_delta: 0,
        summary: action.summary
      }])),
      limits: {
        room_daily_limit: 2,
        member_daily_limit: 2,
        window_seconds: 600,
        min_member_count: 2,
        max_member_count: 4,
        min_action_count_to_settle: 4
      },
      can_create_room: !activeCareRoom,
      create_denied_reason: activeCareRoom ? '已有进行中的护理房间。' : '',
      active_rooms: activeCareRoom && !careRoomSettled ? [activeCareRoom] : [],
      recent_records: recentCareRoomRecords,
      record_summary: careRoomSettled ? '最近 1 条护理房结算记录。' : '护理房可创建、分工和结算。'
    },
    care_room_records: recentCareRoomRecords,
    theme_week: {
      season: 'spring',
      week_tag: '2026-W22',
      active_theme: '春日互助',
      active_theme_source: 'owner',
      score: 80,
      recommendations: [],
      official_pick: null,
      seasonal_options: [],
      template_id: 'showcase',
      cover_image_url: '',
      cover_image_alt: '',
      template_options: [{ id: 'showcase', label: '展示', summary: '展示庄园' }]
    }
  }
}

async function mockOnlineManorCare(page: Page) {
  let cared = false
  let stolen = false
  let careRoomActionIds: string[] = []
  let careRoomSettled = false
  let careRoomCreated = false
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
  await page.route('**/api/taoyuan/online/manor/favorites/overview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, favorites: [], same_theme_favorites: [], hot_manors: [] })
    })
  })
  await page.route('**/api/taoyuan/online/manor/friend_owner', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot: buildFriendManorSnapshot(cared, stolen, careRoomActionIds, careRoomSettled, careRoomCreated) })
    })
  })
  await page.route('**/api/taoyuan/online/manor/care', async route => {
    cared = true
    const snapshot = buildFriendManorSnapshot(true, stolen, careRoomActionIds, careRoomSettled, careRoomCreated)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        entry: snapshot.care_entries[0],
        snapshot,
        idempotent: false
      })
    })
  })
  await page.route('**/api/taoyuan/online/manor/steal', async route => {
    stolen = true
    const snapshot = buildFriendManorSnapshot(cared, true, careRoomActionIds, careRoomSettled, careRoomCreated)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        entry: snapshot.steal_entries[0],
        snapshot,
        idempotent: false
      })
    })
  })
  await page.route('**/api/taoyuan/online/manor/care-rooms', async route => {
    careRoomActionIds = []
    careRoomSettled = false
    careRoomCreated = true
    const snapshot = buildFriendManorSnapshot(cared, stolen, careRoomActionIds, careRoomSettled, careRoomCreated)
    const room = buildFriendManorCareRoom(careRoomActionIds, false)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, room, snapshot, idempotent: false })
    })
  })
  await page.route('**/api/taoyuan/online/manor/care-rooms/*/action', async route => {
    const payload = route.request().postDataJSON() as { action_id?: string }
    const actionId = String(payload.action_id || '')
    if (manorCareRoomActionOrder.includes(actionId) && !careRoomActionIds.includes(actionId)) {
      careRoomActionIds = [...careRoomActionIds, actionId]
    }
    careRoomCreated = true
    const snapshot = buildFriendManorSnapshot(cared, stolen, careRoomActionIds, careRoomSettled, careRoomCreated)
    const room = buildFriendManorCareRoom(careRoomActionIds, false)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, action: room.actions[room.actions.length - 1], room, snapshot, idempotent: false })
    })
  })
  await page.route('**/api/taoyuan/online/manor/care-rooms/*/settle', async route => {
    careRoomSettled = true
    careRoomCreated = true
    const snapshot = buildFriendManorSnapshot(cared, stolen, careRoomActionIds, careRoomSettled, careRoomCreated)
    const room = buildFriendManorCareRoom(careRoomActionIds, true)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, room, snapshot, idempotent: false })
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

  test('online center visual activity entries navigate to real activity pages', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '入口')

    const entries = [
      {
        testId: 'online-visual-activity-cavern',
        pageTestId: 'online-festival-page',
        url: /#\/game\/online\/festival\?tab=expedition-room/,
        text: '在线节会',
      },
      {
        testId: 'online-visual-activity-lantern',
        pageTestId: 'online-festival-page',
        url: /#\/game\/online\/festival\?tab=festival-room/,
        text: '在线节会',
      },
      {
        testId: 'online-visual-activity-dragon-boat',
        pageTestId: 'online-festival-page',
        url: /#\/game\/online\/festival\?tab=festival-room/,
        text: '在线节会',
      },
      {
        testId: 'online-visual-activity-society-projects',
        pageTestId: 'online-society-page',
        url: /#\/game\/online\/society\?tab=projects/,
        text: '在线村社',
      },
      {
        testId: 'online-visual-activity-relay-orders',
        pageTestId: 'online-orders-page',
        url: /#\/game\/online\/orders\?tab=available/,
        text: '在线委托',
      },
      {
        testId: 'online-visual-activity-warehouse',
        pageTestId: 'online-society-page',
        url: /#\/game\/online\/society\?tab=storage/,
        text: '在线村社',
      },
    ]

    for (const entry of entries) {
      await page.goto('/#/game/online')
      await expect(page.getByTestId('online-center')).toBeVisible()
      await expect(page.getByTestId('online-visual-activity-group')).toBeVisible()
      await expect(page.getByTestId(entry.testId)).toBeVisible()
      await page.getByTestId(entry.testId).click()
      await expect(page).toHaveURL(entry.url)
      await expect(page.getByTestId(entry.pageTestId)).toBeVisible()
      await expect(page.getByText(entry.text).first()).toBeVisible()
    }
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

    const cavernComboRecord = {
      combo_id: 'route_then_mine',
      label: '路线采脉',
      action_ids: ['chalk_route', 'split_mine'],
      node_ids: ['cavern_crossroad', 'cavern_ore'],
      summary: '路标先定，矿脉分采更稳，额外回收补给。',
      score_delta: 2,
      risk_delta: -1,
      resource_delta: { torch: 1 },
      resource_delta_text: '补给 +1'
    }
    const buildCavernRouteReplay = () => ({
      kind: 'expedition_cavern',
      title: '矿洞探索记录',
      route_nodes: [
        { id: 'cavern_crossroad', label: '岔路口', kind: 'crossroad', state: 'resolved', summary: '路线已标记。' },
        { id: 'cavern_ore', label: '闪光矿脉', kind: 'ore', state: 'resolved', summary: '矿脉已分采。' },
        { id: 'cavern_exit', label: '撤离点', kind: 'exit', state: 'resolved', summary: '提前撤离收口。' }
      ],
      highlight_nodes: [
        { node_id: 'cavern_ore', label: '闪光矿脉', summary: '采脉与路标形成组合收益。' }
      ],
      risk_peak: { value: 3, round_number: 2, action_label: '确认撤离', actor_display_name: '测试者', summary: '撤离前确认风险峰值 3' },
      summary: '路线 岔路口 -> 闪光矿脉 -> 撤离点；组合收益已记录，提前撤离收口。',
      member_contributions: [
        { username: 'tester', display_name: '测试者', role_label: '领队', action_count: 3 }
      ],
      memory_records: [],
      combo_records: [cavernComboRecord],
      withdrawal_state: 'confirmed',
      withdrawal_summary: '提前撤离已确认，并结算 1 个节点组合收益。',
      withdrawal_locked_combo_ids: ['route_then_mine'],
      withdrawal_locked_combo_count: 1,
      withdrawal_actor_username: 'tester',
      withdrawal_actor_display_name: '测试者',
      withdrawal_at: 1760000000
    })

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
          },
          {
            id: 'cavern_exit',
            label: '撤离点',
            kind: 'exit',
            x: 88,
            y: 54,
            state: 'exit',
            connected_node_ids: ['cavern_ore'],
            event_id: 'exit',
            available_action_ids: ['confirm_withdrawal'],
            owner_username: '',
            claimed_by: '',
            risk_preview: '可提前收尾',
            reward_preview: '保住组合收益并进入结算',
            resource_cost_preview: {},
            resource_reward_preview: {}
          }
        ]
      }
    })
    room.gameplay.available_actions.push(buildGameplayAction('confirm_withdrawal', '确认撤离'))
    room.gameplay.cavern_state = {
      round_text: '第 2 回合',
      current_event: {
        id: 'ore',
        summary: '路标已经稳定，矿脉可收口。',
        risk_hint: '继续深入会推高风险。',
        resource_hint: '组合收益会保留在结算回看。'
      },
      risk_text: '3/8',
      combo_records: [cavernComboRecord],
      withdrawal_state: '',
      withdrawal_summary: '',
      withdrawal_locked_combo_ids: [],
      withdrawal_locked_combo_count: 0,
      withdrawal_actor_username: '',
      withdrawal_actor_display_name: '',
      withdrawal_at: 0,
      team_resources: [
        { id: 'torch', label: '灯火', value: 3, max_value: 5 },
        { id: 'rope', label: '绳索', value: 2, max_value: 4 }
      ],
      role_assignments: [
        { username: 'tester', display_name: '测试者', role_id: 'lead', role_label: '领队' }
      ],
      my_role: { role_id: 'lead', role_label: '领队', role_summary: '负责确认撤离点与收尾。' },
      round_log: [
        { id: 'combo-log-1', round_number: 2, action_id: 'node_combo', action_label: '节点组合收益', role_label: '领队', summary: '路线采脉形成组合收益。' }
      ],
      recent_feedback: '路线采脉形成组合收益。'
    }
    await mockOnlineVisualRoom(page, {
      domain: 'expedition',
      room,
      onAction: (currentRoom, actionId) => {
        if (actionId !== 'confirm_withdrawal') return { room: currentRoom }
        const cavernState = {
          ...(currentRoom.gameplay.cavern_state as Record<string, unknown>),
          withdrawal_state: 'confirmed',
          withdrawal_summary: '提前撤离已确认，并结算 1 个节点组合收益。',
          withdrawal_locked_combo_ids: ['route_then_mine'],
          withdrawal_locked_combo_count: 1,
          withdrawal_actor_username: 'tester',
          withdrawal_actor_display_name: '测试者',
          withdrawal_at: 1760000000,
          recent_feedback: '测试者在撤离点提前收尾，组合收益已锁定。'
        }
        const updatedRoom = {
          ...currentRoom,
          state_label: '已完成',
          gameplay: {
            ...currentRoom.gameplay,
            phase: 'completed',
            phase_label: '已完成',
            last_action_id: 'confirm_withdrawal',
            last_action_summary: '测试者在撤离点提前收尾，组合收益已锁定。',
            cavern_state: cavernState,
          },
          visual_state: {
          ...currentRoom.visual_state,
          revision: 2,
          selected_visual_id: 'cavern_exit',
          recent_feedback: '测试者在撤离点提前收尾，组合收益已锁定。',
          nodes: ((currentRoom.visual_state.nodes || []) as Array<Record<string, unknown>>).map(node =>
            node.id === 'cavern_exit'
              ? { ...node, label: '撤离点已锁定', state: 'resolved', available_action_ids: [] }
              : node
          )
          }
        }
        return { room: updatedRoom }
      },
      onSettle: (currentRoom) => {
        const receipt = {
          id: 'receipt-cavern-e2e-1',
          room_id: currentRoom.id,
          room_title: currentRoom.title,
          template_label: currentRoom.template_label,
          target_username: 'tester',
          target_display_name: '测试者',
          target_slot: 0,
          status_label: '已结算',
          reward_payload: { money: 120, reward_tickets: 1, items: [{ item_id: 'ore', quantity: 2 }] },
          summary: '矿洞探索记录已生成，包含组合收益与提前撤离。',
          route_replay: buildCavernRouteReplay(),
          created_at: 1760000001
        }
        return { room: { ...currentRoom, settlement_receipts: [receipt] }, recentReceipts: [receipt] }
      }
    })

    await page.goto('/#/game/online/festival?tab=expedition-room')
    await expectOnlineExpeditionRoomLoaded(page, '协作矿洞 smoke')
    await expect(page.getByTestId('visual-map-board')).toBeVisible()
    await expect(page.getByText('路线采脉：路标先定').first()).toBeVisible()

    await page.getByTestId('visual-map-node-cavern_ore').click()
    await expect(page.getByTestId('visual-map-readable-feedback')).toContainText('影响范围：风险：采矿会推高风险')
    await expect(page.getByTestId('visual-map-readable-feedback')).toContainText('收益：矿石 +2')
    await expect(page.getByTestId('visual-map-readable-feedback')).toContainText('产出 ore x2')

    await page.getByTestId('visual-map-node-cavern_exit').click()
    await expect(page.getByTestId('visual-map-node-detail')).toContainText('撤离点')
    await expect(page.getByTestId('visual-map-action-confirm_withdrawal')).toBeEnabled()
    const withdrawalResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/taoyuan/online/expedition/rooms/')
      && response.url().includes('/action')
      && response.status() === 200
    )
    await page.getByTestId('visual-map-action-confirm_withdrawal').click()
    const withdrawalResponse = await withdrawalResponsePromise
    expect(withdrawalResponse.request().postData() || '').toContain('confirm_withdrawal')
    const withdrawalData = await withdrawalResponse.json()
    expect(String(withdrawalData?.room?.gameplay?.last_action_id || '')).toBe('confirm_withdrawal')

    await expect(page.getByTestId('visual-map-action-result')).toContainText('提前收尾')
    await expect(page.getByText('提前撤离已确认，并结算 1 个节点组合收益。').first()).toBeVisible()
    await expect(page.getByText('确认人：测试者').first()).toBeVisible()
    await expect(page.getByTestId('online-expedition-room-gameplay-action-split_mine')).toHaveCount(0)
    await expect(page.getByTestId('online-expedition-room-settle-submit')).toBeVisible()
    await page.getByTestId('online-expedition-room-shell-settle-submit').click()

    await expect(page.getByText('组合收益：路线采脉').first()).toBeVisible()
    await expect(page.getByText('提前收尾：提前撤离已确认').first()).toBeVisible()
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('结算 / 回看凭证')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('组合收益 1 条')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('提前撤离 · 提前撤离已确认')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('风险峰值：第 2 回合 · 测试者 · 确认撤离 · 撤离前确认风险峰值 3')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('奖励已记录：120 铜钱、1 张奖券、ore x2')
  })

  test('online festival room wizard creates host room', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '创建')

    const seedRoom = buildRoomSnapshot({
      id: 'e2e-festival-create-seed',
      title: '节会创建 seed',
      templateId: 'lantern_fair',
      templateLabel: '上元灯会',
      gameplayId: 'assembly',
      gameplayLabel: '灯会共建',
      actionId: 'lock_piece',
      actionLabel: '锁定灯片',
      visualState: emptyVisualState
    })

    await mockOnlineVisualRoom(page, { domain: 'festival', room: seedRoom, startWithoutRoom: true })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expect(page.getByTestId('online-festival-room-create-entry')).toBeVisible()
    await expect(page.getByTestId('online-festival-room-status-panel')).toContainText('空闲中')
    await page.getByTestId('online-room-create-trigger').click()
    await expect(page.getByTestId('online-room-wizard')).toBeVisible()

    await page.getByTestId('online-room-wizard-template-lantern_fair').click()
    await page.getByTestId('online-room-wizard-next').click()
    await page.getByTestId('online-room-wizard-title-input').fill('节会创建 smoke')
    await page.getByTestId('online-room-wizard-member-limit-4').click()
    await page.getByTestId('online-room-wizard-next').click()
    await page.getByTestId('online-room-wizard-invite-input').fill('create_friend wish_helper')
    await page.getByTestId('online-room-wizard-invite-add').click()
    await expect(page.getByTestId('online-room-wizard-invite-list')).toContainText('create_friend')
    await expect(page.getByTestId('online-room-wizard-invite-list')).toContainText('wish_helper')
    await page.getByTestId('online-room-wizard-next').click()
    await expect(page.getByTestId('online-room-wizard-review-summary')).toContainText('节会创建 smoke')
    await expect(page.getByTestId('online-room-wizard-review-summary')).toContainText('邀请 2 人')

    const createResponsePromise = page.waitForResponse(response =>
      response.url().endsWith('/api/taoyuan/online/festival/rooms')
      && response.request().method() === 'POST'
      && response.status() === 200
    )
    await page.getByTestId('online-room-wizard-submit').click()
    const createResponse = await createResponsePromise
    const createPayload = createResponse.request().postData() || ''
    expect(createPayload).toContain('lantern_fair')
    expect(createPayload).toContain('assembly')
    expect(createPayload).toContain('节会创建 smoke')

    await expect(page.getByTestId('online-room-wizard')).toHaveCount(0)
    await expectOnlineFestivalRoomLoaded(page, '节会创建 smoke')
    await expect(page.getByTestId('online-festival-room-status-panel')).toContainText('已创建')
    await expect(page.getByTestId('online-festival-room-status-panel')).toContainText('等待准备')
    await expect(page.getByTestId('online-festival-room-lobby-trigger')).toBeVisible()
    await expect(page.getByTestId('online-festival-room-invite-trigger')).toBeVisible()
  })

  test('online expedition room wizard creates host room', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '远征')

    const seedRoom = buildRoomSnapshot({
      id: 'e2e-expedition-create-seed',
      title: '远征创建 seed',
      templateId: 'expedition_outpost',
      templateLabel: '协作远征',
      gameplayId: 'expedition_cavern',
      gameplayLabel: '协作矿洞',
      actionId: 'split_mine',
      actionLabel: '分采矿脉',
      visualState: emptyVisualState
    })

    await mockOnlineVisualRoom(page, { domain: 'expedition', room: seedRoom, startWithoutRoom: true })

    await page.goto('/#/game/online/festival?tab=expedition-room')
    await expect(page.getByTestId('online-expedition-room-create-entry')).toBeVisible()
    await expect(page.getByTestId('online-expedition-room-status-panel')).toContainText('空闲中')
    await page.getByTestId('online-expedition-room-create-trigger').click()
    await expect(page.getByTestId('online-room-wizard')).toBeVisible()

    await page.getByTestId('online-room-wizard-template-expedition_outpost').click()
    await page.getByTestId('online-room-wizard-next').click()
    await page.getByTestId('online-room-wizard-title-input').fill('远征创建 smoke')
    await page.getByTestId('online-room-wizard-member-limit-4').click()
    await page.getByTestId('online-room-wizard-next').click()
    await page.getByTestId('online-room-wizard-invite-input').fill('cavern_friend route_helper')
    await page.getByTestId('online-room-wizard-invite-add').click()
    await expect(page.getByTestId('online-room-wizard-invite-list')).toContainText('cavern_friend')
    await expect(page.getByTestId('online-room-wizard-invite-list')).toContainText('route_helper')
    await page.getByTestId('online-room-wizard-next').click()
    await expect(page.getByTestId('online-room-wizard-review-summary')).toContainText('远征创建 smoke')
    await expect(page.getByTestId('online-room-wizard-review-summary')).toContainText('邀请 2 人')
    await expect(page.getByTestId('online-room-wizard-expedition-rules')).toContainText('撤离规则')

    const createResponsePromise = page.waitForResponse(response =>
      response.url().endsWith('/api/taoyuan/online/expedition/rooms')
      && response.request().method() === 'POST'
      && response.status() === 200
    )
    await page.getByTestId('online-room-wizard-submit').click()
    const createResponse = await createResponsePromise
    const createPayload = createResponse.request().postData() || ''
    expect(createPayload).toContain('expedition_outpost')
    expect(createPayload).toContain('expedition_cavern')
    expect(createPayload).toContain('远征创建 smoke')

    await expect(page.getByTestId('online-room-wizard')).toHaveCount(0)
    await expectOnlineExpeditionRoomLoaded(page, '远征创建 smoke')
    await expect(page.getByTestId('online-expedition-room-status-panel')).toContainText('已创建')
    await expect(page.getByTestId('online-expedition-room-status-panel')).toContainText('等待准备')
    await expect(page.getByTestId('online-expedition-room-invite-trigger')).toBeVisible()
    await expect(page.getByTestId('online-expedition-room-ready-check-submit')).toBeVisible()
  })

  test('online festival room invite panel handles success failure and retry', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '邀请')

    const room = buildRoomSnapshot({
      id: 'e2e-festival-invite-room',
      title: '节会邀请 smoke',
      templateId: 'lantern_fair',
      templateLabel: '上元灯会',
      gameplayId: 'assembly',
      gameplayLabel: '灯会共建',
      actionId: 'lock_piece',
      actionLabel: '锁定灯片',
      visualState: emptyVisualState
    })
    room.state = 'created'
    room.state_label = '已创建'
    room.can_host_settle = false
    room.can_host_ready_check = true
    room.members = [{
      username: 'tester',
      display_name: '测试者',
      role: 'host',
      status: 'joined',
      status_label: '房主',
      invited_at: 0,
      joined_at: 1,
      ready_at: 0,
      disconnected_at: 0,
      reconnected_at: 0,
      left_at: 0,
      active_receipt_id: ''
    }] as any

    await mockOnlineVisualRoom(page, {
      domain: 'festival',
      room,
      inviteFailures: {
        retry_friend: { msg: '服务端状态冲突', once: true }
      }
    })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expectOnlineFestivalRoomLoaded(page, '节会邀请 smoke')
    await page.getByTestId('online-festival-room-invite-trigger').click()
    await expect(page.getByTestId('online-invite-panel')).toBeVisible()

    await page.getByTestId('online-invite-input').fill('tester friend_ok retry_friend')
    await expect(page.getByTestId('online-invite-result-tester')).toContainText('已在房间')
    await expect(page.getByTestId('online-invite-submit')).toContainText('发送邀请 2')
    await page.getByTestId('online-invite-submit').click()

    await expect(page.getByTestId('online-invite-result-friend_ok')).toContainText('已邀请')
    const retryRow = page.getByTestId('online-invite-result-retry_friend')
    await expect(retryRow).toContainText('邀请失败')
    await expect(retryRow).toContainText('房间信息有更新，请刷新后继续。')
    await retryRow.getByTestId('online-invite-retry').click()
    await expect(retryRow).toContainText('已邀请')
  })

  test('online festival room lobby starts ready check and countdown', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '倒计时')

    const room = buildRoomSnapshot({
      id: 'e2e-festival-countdown-room',
      title: '节会倒计时 smoke',
      templateId: 'lantern_fair',
      templateLabel: '上元灯会',
      gameplayId: 'assembly',
      gameplayLabel: '灯会共建',
      actionId: 'lock_piece',
      actionLabel: '锁定灯片',
      visualState: emptyVisualState
    })
    room.state = 'created'
    room.state_label = '已创建'
    room.joined_member_count = 2
    room.member_limit = 4
    room.countdown_seconds = 30
    room.ready_member_count = 0
    room.can_invite = true
    room.can_host_ready_check = true
    room.can_host_settle = false
    room.can_host_close = true
    room.members = [
      {
        username: 'tester',
        display_name: '测试者',
        role: 'host',
        status: 'joined',
        status_label: '房主',
        invited_at: 0,
        joined_at: 1,
        ready_at: 0,
        disconnected_at: 0,
        reconnected_at: 0,
        left_at: 0,
        active_receipt_id: ''
      },
      {
        username: 'countdown_friend',
        display_name: '协作成员',
        role: 'member',
        status: 'joined',
        status_label: '未准备',
        invited_at: 0,
        joined_at: 1,
        ready_at: 0,
        disconnected_at: 0,
        reconnected_at: 0,
        left_at: 0,
        active_receipt_id: ''
      }
    ] as any

    await mockOnlineVisualRoom(page, { domain: 'festival', room })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expectOnlineFestivalRoomLoaded(page, '节会倒计时 smoke')
    await page.getByTestId('online-festival-room-lobby-trigger').click()
    await expect(page.getByTestId('online-room-lobby')).toBeVisible()
    await expect(page.getByTestId('online-room-member-list')).toContainText('协作成员')
    await expect(page.getByTestId('online-room-primary-action')).toContainText('邀请玩家')

    const readyCheckResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/taoyuan/online/festival/rooms/')
      && response.url().includes('/ready-check')
      && response.status() === 200
    )
    await page.getByTestId('online-room-action-start-ready-check').click()
    const readyCheckResponse = await readyCheckResponsePromise
    expect(readyCheckResponse.url()).toContain('/ready-check')
    await expect(page.getByTestId('online-room-lobby')).toContainText('准备确认')
    await expect(page.getByTestId('online-room-member-list')).toContainText('已准备')
    await expect(page.getByTestId('online-room-primary-action')).toContainText('开始倒计时')

    const countdownResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/taoyuan/online/festival/rooms/')
      && response.url().includes('/start')
      && response.status() === 200
    )
    await page.getByTestId('online-room-primary-action').click()
    const countdownResponse = await countdownResponsePromise
    expect(countdownResponse.url()).toContain('/start')
    await expect(page.getByTestId('online-room-lobby')).toContainText('倒计时')
    await expect(page.getByTestId('online-room-member-list')).toContainText('倒计时锁定')
    await expect(page.getByTestId('online-room-primary-action')).toContainText('查看倒计时')
    await expect(page.getByTestId('online-visual-room-countdown')).toContainText('倒计时 30 秒')
  })

  test('online festival room close confirm requires text escape focus and submits', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '关闭')

    const room = buildRoomSnapshot({
      id: 'e2e-festival-close-room',
      title: '节会关闭 smoke',
      templateId: 'lantern_fair',
      templateLabel: '上元灯会',
      gameplayId: 'assembly',
      gameplayLabel: '灯会共建',
      actionId: 'lock_piece',
      actionLabel: '锁定灯片',
      visualState: emptyVisualState
    })
    room.can_host_settle = false
    room.can_host_close = true
    room.members = [{
      username: 'tester',
      display_name: '测试者',
      role: 'host',
      status: 'active',
      status_label: '进行中',
      invited_at: 0,
      joined_at: 1,
      ready_at: 2,
      disconnected_at: 0,
      reconnected_at: 0,
      left_at: 0,
      active_receipt_id: ''
    }] as any

    await mockOnlineVisualRoom(page, { domain: 'festival', room })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expectOnlineFestivalRoomLoaded(page, '节会关闭 smoke')
    await openTechnicalDetailsForTestId(page, 'online-festival-room-close-submit')

    const closeButton = page.getByTestId('online-festival-room-close-submit')
    await closeButton.click()
    await expect(page.getByTestId('online-room-close-confirm')).toHaveCount(1)
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
    await expect(page.getByTestId('online-confirm-impact-list')).toContainText('节会关闭 smoke')
    await expect(page.getByTestId('online-confirm-irreversible')).toBeVisible()
    await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeDisabled()
    await expect(page.getByTestId('online-confirm-disabled-reason')).toContainText('确认文字未填写')

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('online-room-close-confirm')).toHaveCount(0)
    await expect(closeButton).toBeFocused()

    await closeButton.click()
    await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeDisabled()
    await page.getByTestId('online-confirm-required-text').fill('确认关闭房间')
    await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeEnabled()
    const closeResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/taoyuan/online/festival/rooms/')
      && response.url().includes('/close')
      && response.status() === 200
    )
    await page.getByTestId('online-confirm-action-dialog-confirm').click()
    const closeResponse = await closeResponsePromise
    expect(closeResponse.url()).toContain('/close')
    await expect(page.getByTestId('online-room-close-confirm')).toHaveCount(0)
    await expect(page.getByText('房主已关闭本轮房间。').first()).toBeVisible()
  })

  test('online festival visual scene supports lantern object actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '灯会')

    const buildLanternRouteReplay = () => ({
      kind: 'lantern_fair',
      title: '\u706f\u4f1a\u7559\u5f71\u8bb0\u5f55',
      summary: '\u4e3b\u706f\u3001\u706f\u8c1c\u3001\u79e9\u5e8f\u548c\u7559\u5f71\u6536\u53e3\u90fd\u5df2\u5199\u5165\u706f\u4f1a\u7eaa\u5ff5\u3002',
      route_nodes: [
        { id: 'lantern_main_lamp', label: '\u4e3b\u706f', kind: 'lantern', state: 'resolved', order: 1 },
        { id: 'lantern_riddle_rack', label: '\u706f\u8c1c\u67b6', kind: 'riddle', state: 'resolved', order: 2 },
        { id: 'lantern_blocked_queue', label: '\u5206\u7ca5\u961f\u4f0d', kind: 'queue', state: 'resolved', order: 3 },
        { id: 'lantern_photo_spot', label: '\u7559\u5f71\u70b9', kind: 'photo', state: 'resolved', order: 4 }
      ],
      highlight_nodes: [
        { node_id: 'lantern_photo_spot', label: '\u7559\u5f71\u70b9', summary: '\u5408\u5f71\u4eba\u5b8c\u6210\u7559\u5f71\u6536\u53e3\u3002', type: 'memory' }
      ],
      risk_peak: { value: 4, round_number: 3, action_label: '\u7ef4\u6301\u79e9\u5e8f', actor_display_name: '\u5de1\u573a\u4eba', summary: '\u538b\u529b\u5cf0\u503c 4' },
      member_contributions: [
        { username: 'tester', display_name: '\u6d4b\u8bd5\u8005', role_label: '\u706f\u4f1a\u4e3b\u7406', progress_value: 6, score_value: 8, action_count: 4, summary: '\u5b8c\u6210\u4e3b\u706f\u548c\u7559\u5f71\u8bb0\u5f55\u3002' }
      ],
      race_result: { mode: '', rank: 0, rank_label: '', team_count: 0, title_label: '', popularity_bonus: 0, popularity_label: '', reached_finish: false },
      race_rankings: [],
      memory_records: [
        { type: 'main_lantern', label: '\u70b9\u4eae\u4e3b\u706f', actor_username: 'tester', actor_display_name: '\u6d4b\u8bd5\u8005', action_id: 'lock_piece', action_label: '\u9501\u5b9a\u706f\u7247', object_id: 'lantern_main_lamp', object_label: '\u4e3b\u706f', round_number: 1, summary: '\u4e3b\u706f\u7a33\u5b9a\u4eae\u8d77\u3002' },
        { type: 'riddle', label: '\u89e3\u5f00\u706f\u8c1c', actor_username: 'riddle_helper', actor_display_name: '\u706f\u8c1c\u624b', action_id: 'solve_riddle', action_label: '\u89e3\u5f00\u706f\u8c1c', object_id: 'lantern_riddle_rack', object_label: '\u706f\u8c1c\u67b6', round_number: 2, summary: '\u706f\u8c1c\u67b6\u5b8c\u6210\u4e09\u9053\u9898\u7b7e\u3002' },
        { type: 'order', label: '\u7ef4\u6301\u79e9\u5e8f', actor_username: 'order_keeper', actor_display_name: '\u5de1\u573a\u4eba', action_id: 'clear_queue', action_label: '\u7ef4\u6301\u79e9\u5e8f', object_id: 'lantern_blocked_queue', object_label: '\u5206\u7ca5\u961f\u4f0d', round_number: 3, summary: '\u961f\u4f0d\u91cd\u65b0\u6392\u597d\u3002' },
        { type: 'photo', label: '\u7559\u5f71\u6536\u53e3', actor_username: 'photo_helper', actor_display_name: '\u5408\u5f71\u4eba', action_id: 'lock_pose', action_label: '\u5b9a\u683c\u7559\u5f71', object_id: 'lantern_photo_spot', object_label: '\u7559\u5f71\u70b9', round_number: 4, summary: '\u5408\u5f71\u59ff\u52bf\u5df2\u9501\u5b9a\u3002' }
      ]
    })

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
          },
          {
            id: 'lantern_blocked_queue',
            label: '分粥队伍',
            kind: 'queue',
            x: 76,
            y: 62,
            state: 'blocked',
            available_action_ids: [],
            progress_value: 0,
            progress_target: 1,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: false,
            cooperation_required_count: 0,
            cooperation_current_count: 0
          }
        ]
      }
    })
    await mockOnlineVisualRoom(page, {
      domain: 'festival',
      room,
      onSettle: (currentRoom) => {
        const receipt = {
          id: 'receipt-lantern-shell-e2e-1',
          room_id: currentRoom.id,
          room_title: currentRoom.title,
          template_label: currentRoom.template_label,
          target_username: 'tester',
          target_display_name: '\u6d4b\u8bd5\u8005',
          target_slot: 0,
          status: 'persisted',
          status_label: '\u5df2\u7ed3\u7b97',
          reward_payload: { money: 80, reward_tickets: 1, items: [] },
          summary: '\u706f\u4f1a\u7559\u5f71\u8bb0\u5f55\u5df2\u751f\u6210\uff0c\u56db\u7c7b\u7eaa\u5ff5\u53ef\u56de\u770b\u3002',
          route_replay: buildLanternRouteReplay(),
          created_at: 1760000100
        }
        currentRoom.state = 'settled'
        currentRoom.state_label = '\u5df2\u7ed3\u7b97'
        currentRoom.gameplay.phase = 'completed'
        currentRoom.gameplay.phase_label = '\u5df2\u5b8c\u6210'
        currentRoom.settlement_receipts = [receipt]
        return { room: currentRoom, recentReceipts: [receipt] }
      }
    })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expectOnlineFestivalRoomLoaded(page, '灯会共建 smoke')
    await expect(page.getByTestId('visual-scene-board')).toBeVisible()

    await page.getByTestId('visual-scene-object-lantern_blocked_queue').click()
    await expect(page.getByTestId('visual-scene-readable-feedback')).toContainText('失败原因：物件当前受阻')
    await expect(page.getByTestId('visual-scene-readable-feedback')).toContainText('需要先处理前置物件或等待权限恢复')

    await page.getByTestId('visual-scene-object-lantern_main_lamp').click()
    await expect(page.getByTestId('visual-scene-object-detail')).toContainText('主灯')
    await page.getByTestId('visual-scene-action-lock_piece').click()

    await expect(page.getByTestId('online-festival-room-gameplay-action-lock_piece')).toHaveCount(0)
    await openTechnicalDetailsForTestId(page, 'online-festival-room-settle-submit')
    await page.getByTestId('online-festival-room-settle-submit').click()
    await expect(page.getByTestId('online-room-settle-confirm')).toHaveCount(1)
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
    await expect(page.getByTestId('online-confirm-impact-list')).toContainText('灯会共建 smoke')
    await page.getByTestId('online-confirm-action-dialog-confirm').click()
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u706f\u4f1a\u7eaa\u5ff5')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u70b9\u4eae\u4e3b\u706f\uff1a\u6d4b\u8bd5\u8005')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u89e3\u5f00\u706f\u8c1c\uff1a\u706f\u8c1c\u624b')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u7ef4\u6301\u79e9\u5e8f\uff1a\u5de1\u573a\u4eba')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u7559\u5f71\u6536\u53e3\uff1a\u5408\u5f71\u4eba')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u538b\u529b\u5cf0\u503c')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u5956\u52b1\u5df2\u8bb0\u5f55\uff1a80 \u94dc\u94b1\u30011 \u5f20\u5956\u5238')
  })

  test('online festival visual scene supports laba cookpot object actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '腊八')

    const room = buildRoomSnapshot({
      id: 'e2e-laba-cookpot-room',
      title: '腊八共灶 smoke',
      templateId: 'laba_cookpot',
      templateLabel: '腊八共灶',
      gameplayId: 'squad_coop',
      gameplayLabel: '小队协作',
      actionId: 'steady_rudder',
      actionLabel: '补稳节奏',
      visualState: {
        ...emptyVisualState,
        board_type: 'scene',
        board_id: 'laba_cookpot_courtyard',
        selected_visual_id: '',
        recent_feedback: '腊八共灶现场待补稳火候。',
        objects: [
          {
            id: 'laba_cookpot_big_pot',
            label: '腊八大锅',
            kind: 'cookpot',
            x: 48,
            y: 42,
            state: 'active',
            available_action_ids: [],
            progress_value: 3,
            progress_target: 8,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: true,
            cooperation_required_count: 2,
            cooperation_current_count: 1
          },
          {
            id: 'laba_cookpot_stove',
            label: '灶台火候',
            kind: 'stove',
            x: 34,
            y: 61,
            state: 'overheated',
            available_action_ids: ['steady_rudder'],
            progress_value: 2,
            progress_target: 6,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: false,
            cooperation_required_count: 0,
            cooperation_current_count: 0
          },
          {
            id: 'laba_cookpot_rice_tub',
            label: '米桶',
            kind: 'ingredient',
            x: 17,
            y: 66,
            state: 'active',
            available_action_ids: [],
            progress_value: 1,
            progress_target: 4,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: false,
            cooperation_required_count: 0,
            cooperation_current_count: 0
          },
          {
            id: 'laba_cookpot_ingredient_basket',
            label: '配料篮',
            kind: 'ingredient',
            x: 68,
            y: 66,
            state: 'active',
            available_action_ids: [],
            progress_value: 1,
            progress_target: 4,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: false,
            cooperation_required_count: 0,
            cooperation_current_count: 0
          },
          {
            id: 'laba_cookpot_serving_queue',
            label: '分粥队伍',
            kind: 'queue',
            x: 79,
            y: 43,
            state: 'active',
            available_action_ids: [],
            progress_value: 2,
            progress_target: 5,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: true,
            cooperation_required_count: 2,
            cooperation_current_count: 1
          },
          {
            id: 'laba_cookpot_aroma_table',
            label: '留香案',
            kind: 'memory',
            x: 53,
            y: 24,
            state: 'active',
            available_action_ids: [],
            progress_value: 0,
            progress_target: 3,
            handled_by: '',
            handled_at: 0,
            requires_cooperation: false,
            cooperation_required_count: 0,
            cooperation_current_count: 0
          }
        ]
      }
    })
    await mockOnlineVisualRoom(page, {
      domain: 'festival',
      room,
      onAction: (currentRoom, actionId) => {
        if (actionId !== 'steady_rudder') return { room: currentRoom }
        const visualState = currentRoom.visual_state as Record<string, unknown>
        const objects = (visualState.objects as Array<Record<string, unknown>>).map(object => {
          if (object.id !== 'laba_cookpot_stove') return object
          return {
            ...object,
            state: 'active',
            available_action_ids: [],
            progress_value: 4,
            handled_by: '测试者',
            handled_at: 1760000000
          }
        })
        return {
          room: {
            ...currentRoom,
            gameplay: {
              ...currentRoom.gameplay,
              last_action_id: 'steady_rudder',
              last_action_summary: '测试者把灶台火候稳住，分粥队伍没有被挤乱。',
              last_actor_username: 'tester',
              last_actor_display_name: '测试者',
              available_actions: []
            },
            visual_state: {
              ...visualState,
              objects,
              selected_visual_id: 'laba_cookpot_stove',
              recent_feedback: '测试者把灶台火候稳住，分粥队伍没有被挤乱。',
              revision: Number(visualState.revision || 1) + 1
            }
          }
        }
      }
    })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expectOnlineFestivalRoomLoaded(page, '腊八共灶 smoke')
    await expect(page.getByTestId('visual-scene-board')).toBeVisible()
    await expect(page.getByText('腊八大锅').first()).toBeVisible()
    await expect(page.getByText('灶台火候').first()).toBeVisible()
    await expect(page.getByText('米桶').first()).toBeVisible()
    await expect(page.getByText('配料篮').first()).toBeVisible()
    await expect(page.getByText('分粥队伍').first()).toBeVisible()
    await expect(page.getByText('留香案').first()).toBeVisible()

    await page.getByTestId('visual-scene-object-laba_cookpot_stove').click()
    await expect(page.getByTestId('visual-scene-object-detail')).toContainText('灶台火候')
    await expect(page.getByTestId('visual-scene-readable-feedback')).toContainText('过热会提高现场压力')
    await page.getByTestId('visual-scene-action-steady_rudder').click()

    await expect(page.getByTestId('visual-scene-action-result')).toContainText('测试者把灶台火候稳住，分粥队伍没有被挤乱。')
    await expect(page.getByTestId('visual-scene-object-detail')).toContainText('测试者')
    await expect(page.getByTestId('online-festival-room-gameplay-action-steady_rudder')).toHaveCount(0)
  })

  test('online festival memorials can load friend lantern photo replay', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '灯会好友')

    const room = buildRoomSnapshot({
      id: 'e2e-lantern-memorial-room',
      title: '灯会好友回看 smoke',
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
        selected_visual_id: ''
      }
    })
    await mockOnlineVisualRoom(page, { domain: 'festival', room })
    await mockFestivalFriendMemorials(page)

    await page.goto('/#/game/online/festival?tab=memorials')
    await expect(page.getByTestId('online-festival-page')).toBeVisible()
    await page.getByTestId('online-festival-friend-memorial-username-input').fill('friend_lantern')
    await page.getByTestId('online-festival-friend-memorial-submit').click()

    await expect(page.getByTestId('online-festival-friend-memorial-overview')).toContainText('灯会好友')
    await expect(page.getByTestId('online-festival-friend-replay-summary')).toContainText('4/4')
    await expect(page.getByTestId('online-festival-friend-memory-summary')).toContainText('灯会记忆 4/4 条已署名')
    await expect(page.getByTestId('online-festival-friend-photo-line')).toContainText('纪念留影')
    await expect(page.getByTestId('online-festival-friend-lantern-memory-record-main_lantern')).toContainText('点亮主灯：灯会好友')
    await expect(page.getByTestId('online-festival-friend-lantern-memory-record-riddle')).toContainText('解开灯谜：灯谜手')
    await expect(page.getByTestId('online-festival-friend-lantern-memory-record-order')).toContainText('维持秩序：巡场人')
    await expect(page.getByTestId('online-festival-friend-lantern-memory-record-photo')).toContainText('留影收口：合影人')
  })

  test('online manor visual scene supports friend care actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '照料')
    await mockOnlineManorCare(page)

    await page.goto('/#/game/online/manor?target_username=friend_owner')
    await expect(page.getByTestId('online-manor-page')).toBeVisible()
    await page.getByRole('button', { name: '照料' }).click()
    await expect(page.getByTestId('visual-scene-board')).toBeVisible()

    await page.getByTestId('visual-scene-object-friend_plot_1').click()
    await expect(page.getByTestId('visual-scene-object-detail')).toContainText('春菜田')
    await page.getByTestId('visual-scene-action-water_plot').click()

    await expect(page.getByText('测试者帮春菜田浇了水。')).toBeVisible()
    await expect(page.getByTestId('online-manor-care-log')).toContainText('帮忙浇水')
  })

  test('online manor visual scene supports limited steal actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '轻采')
    await mockOnlineManorCare(page)

    await page.goto('/#/game/online/manor?target_username=friend_owner')
    await expect(page.getByTestId('online-manor-page')).toBeVisible()
    await page.getByRole('button', { name: '照料' }).click()
    await expect(page.getByTestId('visual-scene-board')).toBeVisible()
    await expect(page.getByTestId('online-manor-steal-readable-limits')).toContainText('0/2')

    await page.getByTestId('visual-scene-object-friend_apple_tree_1').click()
    await expect(page.getByTestId('visual-scene-object-detail')).toContainText('秋苹果树')
    await page.getByTestId('visual-scene-action-light_harvest').click()

    await expect(page.getByTestId('visual-scene-action-result')).toContainText('测试者轻采了秋苹果树，主人库存保持完整。')
    await expect(page.getByTestId('online-manor-steal-readable-limits')).toContainText('1/2')
    await expect(page.getByTestId('online-manor-steal-anti-abuse-summary')).toContainText('近窗 1 次')
    await expect(page.getByTestId('online-manor-steal-log')).toContainText('测试者 · 轻采果实')
    await expect(page.getByTestId('online-manor-steal-receipt-guard')).toContainText('receipt-steal-e2e-1')
    await expect(page.getByTestId('online-manor-steal-receipt-guard')).toContainText('主人保留 100%')
    await expect(page.getByTestId('online-manor-steal-use-summary')).toContainText('料理、订单与节会备料')
  })

  test('online manor care room supports full cooperation settlement', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '护理')
    await mockOnlineManorCare(page)

    await page.goto('/#/game/online/manor?target_username=friend_owner')
    await expect(page.getByTestId('online-manor-page')).toBeVisible()
    await page.getByRole('button', { name: '照料' }).click()
    await expect(page.getByTestId('online-manor-care-room-panel')).toBeVisible()
    await page.getByTestId('online-manor-care-room-create').first().click()

    await expect(page.getByTestId('online-manor-care-room-entry')).toContainText('护理中')
    await expect(page.getByTestId('online-manor-care-room-progress-summary')).toContainText('0/4 项')
    await expect(page.getByTestId('online-manor-care-room-progress-summary')).toContainText('成员 2/2')

    await page.getByRole('button', { name: '协作灌溉' }).click()
    await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作灌溉')
    await page.getByRole('button', { name: '协作喂食' }).click()
    await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作喂食')
    await page.getByRole('button', { name: '协作除虫' }).click()
    await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作除虫')
    await page.getByRole('button', { name: '协作收拾' }).click()

    await expect(page.getByTestId('online-manor-care-room-action-ledger')).toContainText('协作收拾')
    await expect(page.getByTestId('online-manor-care-room-progress-summary')).toContainText('4/4 项')
    await expect(page.getByTestId('online-manor-care-room-progress-summary')).toContainText('健康 26')
    await expect(page.getByTestId('online-manor-care-room-settle')).toBeVisible()
    await page.getByTestId('online-manor-care-room-settle').click()

    await expect(page.getByTestId('online-manor-care-room-records')).toBeVisible()
    await expect(page.getByTestId('online-manor-care-room-record')).toContainText('健康度 26')
    await expect(page.getByTestId('online-manor-care-room-record')).toContainText('灌溉、喂食、除虫、收拾四项完成')
    await expect(page.getByTestId('online-manor-care-room-record-settlement')).toContainText('care-room-e2e-settlement-1')
    await expect(page.getByTestId('online-manor-care-room-record-actions')).toContainText('协作灌溉')
    await expect(page.getByTestId('online-manor-care-room-record-actions')).toContainText('协作喂食')
    await expect(page.getByTestId('online-manor-care-room-record-actions')).toContainText('协作除虫')
    await expect(page.getByTestId('online-manor-care-room-record-actions')).toContainText('协作收拾')
  })

  test('processing workshop can start an alchemy furnace recipe', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '炼丹')

    await page.goto('/#/game/processing')
    await expect(page.getByTestId('processing-view')).toBeVisible()
    await page.waitForFunction(() => typeof (window as any).__TAOYUAN_PROCESSING_DEBUG__?.prepareAlchemySmoke === 'function')

    const prepared = await page.evaluate(() => (window as any).__TAOYUAN_PROCESSING_DEBUG__.prepareAlchemySmoke())
    expect(prepared).toBeTruthy()

    await expect(page.getByTestId('processing-machine-group-alchemy_furnace')).toBeVisible()
    await page.getByTestId('processing-recipe-alchemy_stone_root_guard_pill').click()

    await expect(page.getByTestId('processing-slot-running-alchemy_stone_root_guard_pill')).toContainText('石根护脉丸')
    await expect(page.getByTestId('processing-slot-running-alchemy_stone_root_guard_pill')).toContainText('0/2天')
  })

  test('animal page can feed a pet special food', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '喂宠')

    await page.goto('/#/game/animal')
    await expect(page.getByTestId('animal-view')).toBeVisible()
    await page.waitForFunction(() => typeof (window as any).__TAOYUAN_PET_DEBUG__?.prepareSpecialFeedSmoke === 'function')

    const prepared = await page.evaluate(() => (window as any).__TAOYUAN_PET_DEBUG__.prepareSpecialFeedSmoke()) as { petId: string; feedId: string } | null
    expect(prepared).toBeTruthy()

    const petId = prepared!.petId
    await expect(page.getByTestId(`pet-card-${petId}`)).toContainText('阿黄')
    await expect(page.getByTestId(`pet-special-feed-status-${petId}`)).toContainText('今日未加餐')

    await page.getByTestId(`pet-special-feed-${petId}-${prepared!.feedId}`).click()

    await expect(page.getByTestId(`pet-special-feed-status-${petId}`)).toContainText('今日：稻米')
    await expect(page.getByTestId(`pet-special-feed-status-${petId}`)).toContainText('饱腹')
  })

  test('npc page can talk with a random visitor', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '来客')

    await page.goto('/#/game/npc')
    await expect(page.getByTestId('npc-view')).toBeVisible()
    await page.waitForFunction(() => typeof (window as any).__TAOYUAN_RANDOM_NPC_DEBUG__?.prepareDialogueSmoke === 'function')

    const prepared = await page.evaluate(() => (window as any).__TAOYUAN_RANDOM_NPC_DEBUG__.prepareDialogueSmoke()) as {
      visitorId: string
      visitorName: string
      choiceId: string
      expectedResponse: string
    } | null
    expect(prepared).toBeTruthy()

    await expect(page.getByTestId(`random-npc-visitor-${prepared!.visitorId}`)).toContainText(prepared!.visitorName)
    await page.getByTestId(`random-npc-choice-${prepared!.visitorId}-${prepared!.choiceId}`).click()

    await expect(page.getByTestId(`random-npc-last-event-${prepared!.visitorId}`)).toContainText(prepared!.expectedResponse)
    await expect(page.getByTestId(`random-npc-choice-${prepared!.visitorId}-${prepared!.choiceId}`)).toBeDisabled()
  })

  test('npc family relation graph supports node selection', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '图谱')

    await page.goto('/#/game/npc')
    await expect(page.getByTestId('npc-view')).toBeVisible()
    await expect(page.getByTestId('family-relation-graph')).toBeVisible()
    await page.waitForFunction(() => typeof (window as any).__TAOYUAN_RANDOM_NPC_DEBUG__?.prepareDialogueSmoke === 'function')

    const prepared = await page.evaluate(() => (window as any).__TAOYUAN_RANDOM_NPC_DEBUG__.prepareDialogueSmoke()) as {
      visitorId: string
      visitorName: string
    } | null
    expect(prepared).toBeTruthy()

    await page.getByTestId(`family-relation-node-visitor:${prepared!.visitorId}`).click()

    await expect(page.getByTestId('family-relation-detail')).toContainText(prepared!.visitorName)
    await expect(page.getByTestId('family-relation-detail')).toContainText('本周来访')
  })

  test('online cohabitation permissions support low-risk toggle actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '权限')
    await mockOnlineCohabitation(page)

    await page.goto('/#/game/online/cohabitation')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()

    await openCohabitationTab(page, 'permissions')
    const helperDeposit = page.getByTestId('online-cohabitation-permission-helper-storage-deposit')
    await expect(helperDeposit).toContainText('仓库放入')
    await expect(helperDeposit).toContainText('关闭')

    await helperDeposit.click()

    await expect(helperDeposit).toContainText('开启')
    await expect(page.getByText('帮手 的「仓库放入」已开启')).toBeVisible()
  })

  test('online cohabitation shared audit details keep technical fields folded', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '共同日志')
    await mockOnlineCohabitation(page)

    await page.goto('/#/game/online/cohabitation')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
    await openCohabitationTab(page, 'offline')

    const auditSummary = page.getByTestId('online-cohabitation-shared-audit-detail').first()
    await expect(auditSummary).toContainText('离线队列合并')
    await expect(auditSummary).toContainText('重复提交保护')
    await expect(auditSummary).not.toContainText('ledger')
    await expect(auditSummary).not.toContainText('receipt')
    await expect(auditSummary).not.toContainText('hash')
    await expect(auditSummary).not.toContainText('idempotency')
    await expect(auditSummary).not.toContainText('revision')

    const technicalDetail = page.getByTestId('online-cohabitation-shared-audit-technical-detail').first()
    await expect(technicalDetail).toBeHidden()
    await page.getByTestId('online-technical-details-toggle').first().click()
    await expect(technicalDetail).toBeVisible()
    await expect(technicalDetail).toContainText('offline_queue_merged')
    await expect(technicalDetail).toContainText('audit-shared-log-technical-e2e')
    await expect(technicalDetail).toContainText('result_ledger_ids')
    await expect(technicalDetail).toContainText('receipt-shared-log-e2e')
    await expect(technicalDetail).toContainText('hash-shared-log-e2e')
    await expect(technicalDetail).toContainText('idempotency-shared-log-e2e')
    await expect(technicalDetail).toContainText('client_queue_revision')
    await expect(technicalDetail).toContainText('server_queue_revision')
  })

  test('online cohabitation keeps legacy tab query aliases grouped', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '分组')
    await mockOnlineCohabitation(page)

    await page.goto('/#/game/online/cohabitation?tab=festival')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-tab-groups')).toBeVisible()
    await expect(page.getByTestId('online-module-tab-festivalSeats')).toHaveAttribute('aria-selected', 'true')

    await page.goto('/#/game/online/cohabitation?tab=public')
    await expect(page.getByTestId('online-module-tab-visibility')).toBeVisible()
    await expect(page.getByTestId('online-module-tab-visibility')).toHaveAttribute('aria-selected', 'true')

    await page.goto('/#/game/online/cohabitation?tab=separation')
    await expect(page.getByTestId('online-module-tab-offline')).toBeVisible()
    await expect(page.getByTestId('online-module-tab-offline')).toHaveAttribute('aria-selected', 'true')
  })

  test('online cohabitation overview keeps first screen to four main cards', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '总览')
    await mockOnlineCohabitation(page)

    await page.goto('/#/game/online/cohabitation')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
    const mainCards = page.getByTestId('online-cohabitation-overview-main-cards').locator('article')
    await expect(mainCards).toHaveCount(4)
    await expect(page.getByTestId('online-cohabitation-overview-contract-card')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-overview-fund-card')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-overview-warehouse-card')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-overview-risk-card')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-overview-details')).not.toHaveAttribute('open', '')
  })

  test('online cohabitation family festival actions require confirm dialog', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '家族节会')
    await mockOnlineCohabitation(page)

    const confirmPhrase = '确认家族节会'
    const assertFamilyFestivalConfirm = async (triggerTestId: string, title: string, assetText: string) => {
      await page.getByTestId(triggerTestId).click()
      await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
      await expect(page.getByTestId('online-action-dialog-title')).toContainText(title)
      await expect(page.getByTestId('online-confirm-impact-list')).toContainText('失败原因')
      await expect(page.getByTestId('online-confirm-impact-list')).toContainText('家族上元灯会')
      await expect(page.getByTestId('online-confirm-asset-list')).toContainText(assetText)
      await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeDisabled()
    }

    await page.goto('/#/game/online/cohabitation?tab=festival')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
    await expect(page.getByTestId('online-module-tab-festivalSeats')).toHaveAttribute('aria-selected', 'true')

    await assertFamilyFestivalConfirm(
      'online-cohabitation-family-festival-reserve-confirm-trigger',
      '确认锁定家族节会席位',
      '锁定当前成员节会席位'
    )
    await page.getByTestId('online-confirm-required-text').fill(confirmPhrase)
    await expect(page.getByTestId('online-confirm-action-dialog-confirm')).toBeEnabled()
    await page.getByTestId('online-confirm-action-dialog-confirm').click()
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeHidden()
    await expect(page.getByText('已锁定节会席位 2 个')).toBeVisible()

    await assertFamilyFestivalConfirm(
      'online-cohabitation-family-festival-room-confirm-trigger',
      '确认创建家族节会房间',
      '预填创建'
    )
    await page.getByTestId('online-confirm-action-dialog-cancel').click()
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeHidden()

    await assertFamilyFestivalConfirm(
      'online-cohabitation-family-festival-supplies-confirm-trigger',
      '确认消耗节会供品',
      '按当前模板消耗节会供品'
    )
    await page.getByTestId('online-confirm-action-dialog-cancel').click()
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeHidden()

    await assertFamilyFestivalConfirm(
      'online-cohabitation-family-festival-settle-confirm-trigger',
      '确认结算家族节会奖励',
      '奖励入账 120 文'
    )
    await page.getByTestId('online-confirm-action-dialog-cancel').click()
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeHidden()
  })

  test('online cohabitation fund and warehouse high risk actions require confirm dialog', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '高风险')
    await mockOnlineCohabitation(page)

    const confirmRiskDialog = async (phrase: string) => {
      const dialog = page.getByTestId('online-confirm-action-dialog')
      const confirmButton = page.getByTestId('online-confirm-action-dialog-confirm')
      await expect(dialog).toBeVisible()
      await expect(confirmButton).toBeDisabled()
      await page.getByTestId('online-confirm-required-text').fill(phrase)
      await expect(confirmButton).toBeEnabled()
      await confirmButton.click()
      await expect(dialog).toBeHidden()
    }

    await page.goto('/#/game/online/cohabitation')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()

    await openCohabitationTab(page, 'fund')
    await page.getByTestId('online-cohabitation-fund-large-draft-submit').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认创建大额基金草案')
    await expect(page.getByTestId('online-confirm-impact-list')).toContainText('家族建筑')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('共同基金')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('个人铜币')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('共同仓库')
    await confirmRiskDialog('确认消耗共同资产')
    await expect(page.getByText('已创建 家族建筑 草案，等待成员确认')).toBeVisible()

    await page.getByTestId('online-cohabitation-fund-large-draft-confirm-fund-draft-confirm-e2e').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认这笔共同基金草案')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('确认阶段不扣款')
    await confirmRiskDialog('确认消耗共同资产')
    await expect(page.getByText('草案已完成确认，可执行扣款')).toBeVisible()

    await page.getByTestId('online-cohabitation-fund-large-draft-execute-fund-draft-execute-e2e').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认执行共同基金扣款')
    await expect(page.getByTestId('online-confirm-irreversible')).toBeVisible()
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('预计余额')
    await confirmRiskDialog('确认消耗共同资产')
    await expect(page.getByText('已扣款 1600 文，基金余额 3400 文')).toBeVisible()

    await page.getByTestId('online-cohabitation-fund-large-draft-receipt-fund-draft-receipt-e2e').click()
    await expect(page.getByTestId('online-cohabitation-fund-high-risk-receipt-form')).toBeVisible()
    await page.getByTestId('online-cohabitation-fund-high-risk-receipt-submit').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认记录高风险回执')
    await expect(page.getByTestId('online-confirm-impact-list')).toContainText('交付')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('既有扣款')
    await confirmRiskDialog('确认消耗共同资产')
    await expect(page.getByText('已记录交付回执，高风险草案收口')).toBeVisible()

    await openCohabitationTab(page, 'warehouse')
    await page.getByTestId('online-cohabitation-warehouse-high-value-draft-lotus_heart_cat_treat').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认申请高价值取用')
    await expect(page.getByTestId('online-confirm-impact-list')).toContainText('目标用途')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('个人背包')
    await confirmRiskDialog('确认取用共同资产')
    await expect(page.getByText('已冻结 莲心桂花糕 x1，等待成员确认')).toBeVisible()

    await page.getByTestId('online-cohabitation-warehouse-high-value-confirm-warehouse-draft-confirm-e2e').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认高价值取用草案')
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('确认阶段不放入个人背包')
    await confirmRiskDialog('确认取用共同资产')
    await expect(page.getByText('双方已确认，草案可执行')).toBeVisible()

    await page.getByTestId('online-cohabitation-warehouse-high-value-execute-warehouse-draft-execute-e2e').click()
    await expect(page.getByTestId('online-action-dialog-title')).toContainText('确认执行高价值取用')
    await expect(page.getByTestId('online-confirm-irreversible')).toBeVisible()
    await expect(page.getByTestId('online-confirm-asset-list')).toContainText('取出到操作者个人背包')
    await confirmRiskDialog('确认取用共同资产')
    await expect(page.getByText('已执行高价值取出，个人背包现有 1 个')).toBeVisible()
  })

  test('online cohabitation shared pet care uses shared warehouse feed', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '宠物')
    await mockOnlineCohabitation(page)

    await page.goto('/#/game/online/cohabitation')
    await expect(page.getByTestId('online-cohabitation-page')).toBeVisible()
    await openCohabitationOverviewDetails(page)
    await expect(page.getByTestId('online-cohabitation-shared-pets-panel')).toBeVisible()

    const sharedPet = page.getByTestId('online-cohabitation-shared-pet-shared-pet-e2e')
    await expect(sharedPet).toContainText('狸花灵猫')
    await expect(sharedPet).toContainText('照料 0 次')
    await sharedPet.click()

    await expect(page.getByTestId('online-cohabitation-shared-pet-coop-bonus')).toContainText('暂无')
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-item-select')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-item-stock')).toContainText('活力饲料 · 活力照料 · 共同仓库 3 个')
    await page.getByTestId('online-cohabitation-shared-pet-care-item-select').selectOption('premium_feed')
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-item-stock')).toContainText('精饲料 · 亲密照料 · 共同仓库 2 个')
    await page.getByTestId('online-cohabitation-shared-pet-care').click()

    await expect(page.getByText('共同宠物已照料，共同仓库精饲料已扣料，并触发同时在线心情 +2')).toBeVisible()
    await expect(page.getByText('用品：精饲料 · 好感 26 · 心情 44')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-item-stock')).toContainText('精饲料 · 亲密照料 · 共同仓库 1 个')
    await expect(page.getByTestId('online-cohabitation-shared-pet-coop-bonus')).toContainText('心情 +2 · 测试者 / 帮手')
    await page.getByTestId('online-cohabitation-shared-pet-care-item-select').selectOption('lotus_heart_cat_treat')
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-item-stock')).toContainText('莲心桂花糕 · 高阶灵宠点心 · 共同仓库 1 个')
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-risk-panel')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-risk-label')).toContainText('high_value_pet_treat')
    await expect(page.getByTestId('online-cohabitation-shared-pet-care')).toBeDisabled()
    await page.getByTestId('online-cohabitation-shared-pet-care-risk-confirm').check()
    await page.getByTestId('online-cohabitation-shared-pet-care-risk-text').fill('确认消耗共同宠物高阶点心')
    await expect(page.getByTestId('online-cohabitation-shared-pet-care')).toBeEnabled()
    await page.getByTestId('online-cohabitation-shared-pet-care').click()
    await expect(page.getByText('共同宠物已照料，共同仓库莲心桂花糕已扣料，并触发同时在线心情 +2')).toBeVisible()
    await expect(page.getByTestId('online-cohabitation-shared-pet-care-item-stock')).toContainText('莲心桂花糕 · 高阶灵宠点心 · 共同仓库 0 个')
    await expect(sharedPet).toContainText('照料 1 次')
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
            length: 4,
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
                occupant_team_ids: ['team_east'],
                event_id: 'drum',
                effect_ids: ['boost'],
                available_action_ids: ['sync_oar'],
                risk_preview: '抢拍会增加压力',
                reward_preview: '推进 +1'
              },
              {
                id: 'dragon_cell_2',
                label: '回浪',
                index: 2,
                kind: 'risk',
                occupant_team_ids: ['team_west'],
                event_id: 'wave',
                effect_ids: ['blocked'],
                available_action_ids: [],
                risk_preview: '回浪会拖慢节奏',
                reward_preview: ''
              },
              {
                id: 'dragon_cell_3',
                label: '终点',
                index: 3,
                kind: 'finish',
                occupant_team_ids: ['team_north'],
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
              },
              {
                team_id: 'team_east',
                label: '东岸龙舟',
                marker: '东',
                position_index: 1,
                state: 'boosted',
                last_action_id: 'drum_call'
              },
              {
                team_id: 'team_west',
                label: '西湾龙舟',
                marker: '西',
                position_index: 2,
                state: 'blocked',
                last_action_id: 'steady_rudder'
              },
              {
                team_id: 'team_north',
                label: '北渡龙舟',
                marker: '北',
                position_index: 3,
                state: 'finished',
                last_action_id: 'finish_sprint'
              }
            ]
          }
        ]
      }
    })
    await mockOnlineVisualRoom(page, {
      domain: 'festival',
      room,
      onSettle: (currentRoom) => {
        const receipt = {
          id: 'receipt-dragon-shell-e2e-1',
          room_id: currentRoom.id,
          room_title: currentRoom.title,
          template_label: currentRoom.template_label,
          target_username: 'tester',
          target_display_name: '\u6d4b\u8bd5\u8005',
          target_slot: 0,
          status: 'persisted',
          status_label: '\u5df2\u7ed3\u7b97',
          reward_payload: { money: 100, reward_tickets: 2, items: [] },
          summary: '\u7aef\u5348\u8d5b\u821f\u6210\u7ee9\u5355\u5df2\u751f\u6210\uff0c\u591a\u961f\u540d\u6b21\u53ef\u56de\u770b\u3002',
          route_replay: {
            kind: 'dragon_boat',
            title: '\u7aef\u5348\u8d5b\u821f\u6210\u7ee9\u5355',
            summary: '\u56db\u8239\u6269\u5c55\u5b8c\u6210\uff0c\u524d\u56db\u961f\u540d\u6b21\u5199\u5165\u8d5b\u9053\u699c\u3002',
            route_nodes: [
              { id: 'dragon_cell_0', label: '\u8d77\u70b9', kind: 'normal', state: 'resolved', order: 1 },
              { id: 'dragon_cell_1', label: '\u9f13\u70b9\u7a97\u53e3', kind: 'boost', state: 'resolved', order: 2 },
              { id: 'dragon_cell_2', label: '\u56de\u6d6a', kind: 'risk', state: 'resolved', order: 3 },
              { id: 'dragon_cell_3', label: '\u7ec8\u70b9', kind: 'finish', state: 'resolved', order: 4 }
            ],
            highlight_nodes: [
              { node_id: 'dragon_cell_1', label: '\u9f13\u70b9\u7a97\u53e3', summary: '\u6843\u6e90\u9f99\u821f\u62a2\u5230\u9f13\u70b9\u7a97\u53e3\u3002', type: 'boost' }
            ],
            risk_peak: { value: 5, round_number: 2, action_label: '\u5408\u62cd\u5212\u6868', actor_display_name: '\u6d4b\u8bd5\u8005', summary: '\u538b\u529b\u5cf0\u503c 5' },
            member_contributions: [
              { username: 'tester', display_name: '\u6d4b\u8bd5\u8005', role_label: '\u9f13\u624b', progress_value: 4, score_value: 9, action_count: 2, summary: '\u9f13\u70b9\u7a97\u53e3\u5408\u62cd\u3002' }
            ],
            race_result: { mode: 'multi_team', rank: 4, rank_label: '\u7b2c 4 \u540d', team_count: 4, title_label: '\u540c\u821f\u6025\u5148\u950b', popularity_bonus: 12, popularity_label: '\u8282\u4f1a\u4eba\u6c14 +12', reached_finish: false },
            race_rankings: [
              { team_id: 'team_north', label: '\u5317\u6e21\u9f99\u821f', rank: 1, rank_label: '\u7b2c 1 \u540d', position_index: 3, score_value: 12, finished: true, summary: '\u5df2\u51b2\u7ebf' },
              { team_id: 'team_west', label: '\u897f\u6e7e\u9f99\u821f', rank: 2, rank_label: '\u7b2c 2 \u540d', position_index: 2, score_value: 8, finished: false, summary: '\u4ecd\u5728\u8d5b\u9053\u4e2d' },
              { team_id: 'team_east', label: '\u4e1c\u5cb8\u9f99\u821f', rank: 3, rank_label: '\u7b2c 3 \u540d', position_index: 1, score_value: 6, finished: false, summary: '\u4ecd\u5728\u8d5b\u9053\u4e2d' },
              { team_id: 'team_dragon', label: '\u6843\u6e90\u9f99\u821f', rank: 4, rank_label: '\u7b2c 4 \u540d', position_index: 0, score_value: 4, finished: false, summary: '\u4ecd\u5728\u8d5b\u9053\u4e2d' }
            ],
            memory_records: []
          },
          created_at: 1760000200
        }
        currentRoom.state = 'settled'
        currentRoom.state_label = '\u5df2\u7ed3\u7b97'
        currentRoom.gameplay.phase = 'completed'
        currentRoom.gameplay.phase_label = '\u5df2\u5b8c\u6210'
        currentRoom.settlement_receipts = [receipt]
        return { room: currentRoom, recentReceipts: [receipt] }
      }
    })

    await page.goto('/#/game/online/festival?tab=festival-room')
    await expectOnlineFestivalRoomLoaded(page, '龙舟赛道 smoke')
    await openTechnicalDetailsForTestId(page, 'online-festival-room-member-limit-group')
    await expect(page.getByTestId('online-festival-room-member-limit-group')).toContainText('2 人')
    await expect(page.getByTestId('online-festival-room-member-limit-group')).toContainText('4 人')
    await expect(page.getByTestId('online-festival-room-member-limit-group')).toContainText('6 人')
    await expect(page.getByTestId('online-festival-room-member-limit-group')).toContainText('8 人')
    await expect(page.getByTestId('online-festival-room-member-limit-8')).toBeVisible()
    await page.getByTestId('online-festival-room-member-limit-2').click()
    await expect(page.getByTestId('online-festival-room-member-limit-2')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('visual-track-board')).toBeVisible()

    await page.getByTestId('visual-track-cell-dragon_cell_2').click()
    await expect(page.getByTestId('visual-track-readable-feedback')).toContainText('失败原因：当前赛道格没有可用行动')
    await expect(page.getByTestId('visual-track-readable-feedback')).toContainText('影响范围：风险：回浪会拖慢节奏')
    await expect(page.getByTestId('visual-track-readable-feedback')).toContainText('影响队伍：西湾龙舟')

    await page.getByTestId('visual-track-cell-dragon_cell_1').click()
    await expect(page.getByTestId('visual-track-cell-detail')).toContainText('鼓点窗口')
    await expect(page.getByTestId('visual-track-readable-feedback')).toContainText('影响队伍：东岸龙舟')
    await expect(page.getByTestId('visual-track-team-standings')).toBeVisible()
    await expect(page.getByTestId('visual-track-team-row-team_north')).toContainText('第 1 名')
    await expect(page.getByTestId('visual-track-team-row-team_north')).toContainText('完赛')
    await expect(page.getByTestId('visual-track-team-row-team_west')).toContainText('第 2 名')
    await expect(page.getByTestId('visual-track-team-row-team_east')).toContainText('第 3 名')
    await expect(page.getByTestId('visual-track-team-row-team_dragon')).toContainText('第 4 名')
    await page.getByTestId('visual-track-action-sync_oar').click()

    await expect(page.getByTestId('online-festival-room-gameplay-action-sync_oar')).toHaveCount(0)
    await openTechnicalDetailsForTestId(page, 'online-festival-room-settle-submit')
    await page.getByTestId('online-festival-room-settle-submit').click()
    await expect(page.getByTestId('online-room-settle-confirm')).toHaveCount(1)
    await expect(page.getByTestId('online-confirm-action-dialog')).toBeVisible()
    await expect(page.getByTestId('online-confirm-impact-list')).toContainText('龙舟赛道 smoke')
    await page.getByTestId('online-confirm-action-dialog-confirm').click()
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u7ade\u901f\u89c4\u6a21\uff1a\u56db\u8239\u6269\u5c55')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u9f99\u821f\u6210\u7ee9\uff1a\u7b2c 4 \u540d')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u8d5b\u9053\u540d\u6b21\uff1a\u7b2c 1 \u540d \u5317\u6e21\u9f99\u821f')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u8d5b\u821f\u5206 12')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u538b\u529b\u5cf0\u503c')
    await expect(page.getByTestId('online-visual-room-settlement-replay')).toContainText('\u5956\u52b1\u5df2\u8bb0\u5f55\uff1a100 \u94dc\u94b1\u30012 \u5f20\u5956\u5238')
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
    await expect(page.getByTestId('async-community-board')).toContainText('好友留言')
    await expect(page.getByTestId('async-community-board')).toContainText('修灯赠灯')
    await expect(page.getByTestId('async-community-board')).toContainText('祝福成墙')
    await expect(page.getByTestId('async-community-board')).toContainText('纪念墙')
    await expect(page.getByTestId('async-community-board')).toContainText('愿望册')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('愿望签')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('好友留言')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('共建类型')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('花灯墙')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('阶段收口')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('当前回看')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('写愿望 · 进行中')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('贡献记录')
    await expect(page.getByTestId('async-community-project-detail')).toContainText('写愿望')

    await page.getByTestId('online-society-async-contribute-lantern_wall-write_wish').click()

    await expect(page.getByTestId('async-community-project-detail')).toContainText('挂花灯')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('灯线')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('挂花灯 · 进行中')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('1 人 · 1 条历史')
    await expect(page.getByText('测试者写下一张愿望签，花灯墙亮了一角。')).toBeVisible()
    await expect(page.getByTestId('online-society-project-contribute-lantern_wall-write_wish')).toBeVisible()
    await expect(page.getByTestId('online-society-page')).toContainText('新愿望签已经挂上墙。')
    await expect(page.getByTestId('online-society-page')).toContainText('测试者 提交了 写愿望（+10）')
    await expect(page.getByTestId('async-community-board')).toContainText('测试者写下一张愿望签。')
  })

  test('online society festival square contribution unlocks festival room launch', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '节庆筹备')
    await mockOnlineSociety(page, { focus: 'festival_square' })

    await page.goto('/#/game/online/society?tab=projects')
    await expect(page.getByTestId('online-society-page')).toBeVisible()
    await expect(page.getByText('清溪节社').first()).toBeVisible()
    await expect(page.getByTestId('async-community-board')).toContainText('节庆筹备')
    await expect(page.getByTestId('async-community-board')).toContainText('备料')
    await expect(page.getByTestId('async-community-board')).toContainText('搭场')
    await expect(page.getByTestId('async-community-board')).toContainText('开幕')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('空场')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('备料桌')
    await expect(page.getByTestId('async-community-project-detail')).toContainText('备料')

    await page.getByTestId('online-society-async-contribute-festival_square-festival_scenery').click()

    await expect(page.getByTestId('async-community-project-detail')).toContainText('开幕')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('人气')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('留影')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('开幕 · 已完成')
    await expect(page.getByText('测试者搭起第一批节庆布景，广场开始像节会现场。')).toBeVisible()
    await expect(page.getByTestId('async-community-completion-room-link')).toContainText('上元灯会房间')
    await expect(page.getByTestId('async-community-completion-room-link')).toContainText('用共建广场开启正式灯会房间')
    await expect(page.getByTestId('online-society-completion-room-launch')).toContainText('创建房间')

    await page.getByTestId('async-community-completion-room-link').click()

    await expect(page).toHaveURL(/#\/game\/online\/festival\?/)
    expect(page.url()).toContain('tab=festival-room')
    expect(page.url()).toContain('template=lantern_fair')
    expect(page.url()).toContain('gameplay=assembly')
  })

  test('online society warehouse supports public deposit actions', async ({ page }) => {
    await openHome(page)
    await startNewJourney(page, '仓廪')
    await mockOnlineSociety(page, { focus: 'warehouse' })

    await page.goto('/#/game/online/society?tab=storage')
    await expect(page.getByTestId('online-society-page')).toBeVisible()
    await expect(page.getByText('清溪仓社').first()).toBeVisible()
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('待入仓')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('0/5 类齐备')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('粮食')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('药草')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('木材')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('布料')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('鱼获')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('节会成本下降')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('公共任务加成')
    await expect(page.getByTestId('online-society-warehouse-deposit-herb_mugwort')).toBeVisible()
    await expect(page.getByTestId('online-society-warehouse-deposit-wood_bundle')).toBeVisible()
    await expect(page.getByTestId('online-society-warehouse-deposit-cloth_roll')).toBeVisible()
    await expect(page.getByTestId('online-society-warehouse-deposit-fish_basket')).toBeVisible()

    await page.getByTestId('online-society-warehouse-deposit-grain_rice').click()

    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('收集中')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('10 分')
    await expect(page.getByTestId('online-society-warehouse-weekly-settlement')).toContainText('1/5 类齐备')
    await expect(page.getByTestId('online-society-page')).toContainText('稻米 x2')
    await expect(page.getByTestId('online-society-page')).toContainText('测试者 补入了 稻米入仓')
    await expect(page.getByTestId('online-society-page')).toContainText('灾害应对预备 +1')
    await expect(page.getByTestId('online-society-warehouse-consume-panel')).toContainText('公共消耗')
    await expect(page.getByTestId('online-society-warehouse-consume-panel')).toContainText('只扣公共仓')
    await expect(page.getByTestId('online-society-warehouse-consume-laba_cookpot_base')).toBeVisible()

    await page.getByTestId('online-society-warehouse-consume-laba_cookpot_base').click()

    await expect(page.getByTestId('online-society-page')).toContainText('测试者 消耗了 腊八共灶底料')
    await expect(page.getByTestId('online-society-page')).toContainText('只扣公共仓')
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
    await expect(page.getByTestId('async-community-project-readback')).toContainText('共建类型')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('公共订单接力')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('阶段收口')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('1/3 阶段')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('当前回看')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('加工干菜 · 进行中')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('贡献记录')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('0 人 · 1 条历史')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('待接')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('任务')
    await expect(page.getByTestId('online-orders-relay-settlement-summary').first()).toContainText('分账池：赏金 260 · 待分账')
    await expect(page.getByTestId('online-orders-relay-settlement-summary').first()).toContainText('已落账 80 / 待结 180')
    await expect(page.getByTestId('online-orders-relay-settlement-summary').first()).toContainText('采收青菜：31% / 80 · 个人铜钱')
    await expect(page.getByTestId('online-orders-society-board')).toContainText('公开订单')
    await expect(page.getByTestId('online-orders-society-board')).toContainText('1 张')
    await expect(page.getByTestId('online-orders-society-board-settlement')).toContainText('分账池 260 · 已落账 80 · 待结 180 · 补偿中 0')
    await expect(page.getByTestId('online-orders-society-board-receipts')).toContainText('灯会干菜接力单 · 采收青菜')
    await expect(page.getByTestId('online-orders-society-board-receipts')).toContainText('已完成的帮手 · 赏金 80 · 个人铜钱')

    await page.getByTestId('online-society-async-contribute-relay_route-accept_stage:stage_process').click()

    await expect(page.getByTestId('async-community-project-detail')).toContainText('送到灯会')
    await expect(page.getByTestId('async-community-site-objects')).toContainText('待接')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('送到灯会 · 进行中')
    await expect(page.getByTestId('async-community-project-readback')).toContainText('1 人 · 1 条历史')
    await expect(page.getByText('测试者已接下加工干菜这一段。')).toBeVisible()
    await expect(page.getByTestId('online-orders-relay-settlement-summary').first()).toContainText('分账池：赏金 260 · 分账进行中')
    await expect(page.getByTestId('online-orders-relay-settlement-summary').first()).toContainText('加工干菜：35% / 90 · 共同基金')
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
