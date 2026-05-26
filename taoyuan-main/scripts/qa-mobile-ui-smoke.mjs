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

async function createPage(browser, viewport, options = {}) {
  const mockSocial = Boolean(options.mockSocial)
  const mockSociety = Boolean(options.mockSociety)
  const context = await browser.newContext({
    viewport,
    locale: 'zh-CN',
    reducedMotion: 'reduce'
  })
  if (mockSociety) {
    await context.addInitScript(() => {
      window.localStorage.setItem('taoyuanxiang_current_account', 'mobile_smoke_owner')
    })
  }
  const page = await context.newPage()

  await page.route('**/api/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSocial || mockSociety
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
  prepare
}) {
  const { context, page } = await createPage(browser, viewport, { mockSocial, mockSociety })
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
          inHorizontalScroller: Boolean(element.closest('.overflow-x-auto')),
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
        '在线中心与在线委托场景覆盖 390x844 与 360x780 视口下的模块卡可见性、二级导航切换、表单字段和主要按钮布局。',
        '在线村社场景使用 mock 登录态与村社公共建设数据，覆盖花灯墙贡献按钮点击、贡献后阶段反馈和移动端横向溢出断言。'
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
