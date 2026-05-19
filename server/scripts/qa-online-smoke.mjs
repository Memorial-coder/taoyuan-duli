import { spawn } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const { decryptTaoyuanRaw, encryptTaoyuanData } = require('../src/taoyuanSaveRuntime')
const db = require('../src/db')
const dotenv = require('dotenv')
const serverRoot = path.resolve(__dirname, '..')
const smokeTempDir = path.resolve(serverRoot, '.tmp-online-smoke-run')
const smokeStorageFile = path.resolve(smokeTempDir, '.storage.json')
const host = '127.0.0.1'
const preferredPort = Number(process.env.TAOYUAN_ONLINE_SMOKE_PORT || 4013)
const configuredBaseURL = process.env.TAOYUAN_ONLINE_SMOKE_BASE_URL?.trim() || ''

dotenv.config({ path: path.join(serverRoot, '.env') })
dotenv.config({ path: path.join(serverRoot, '..', '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '..', '.env.offical'), override: true })

const canListenOnPort = (targetHost, port) =>
  new Promise(resolve => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ host: targetHost, port }, () => {
      server.close(() => resolve(true))
    })
  })

const findAvailablePort = async (targetHost, startPort, attempts = 20) => {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    if (await canListenOnPort(targetHost, port)) return port
  }
  return startPort
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const isServerReachable = async url => {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

const waitForServer = async (url, timeoutMs = 120_000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(url)) return
    await wait(1000)
  }
  throw new Error(`Timed out waiting for server at ${url}`)
}

const port = configuredBaseURL ? preferredPort : await findAvailablePort(host, preferredPort)
const baseURL = configuredBaseURL || `http://${host}:${port}`

const startServer = () => {
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_STORAGE: smokeStorageFile,
      QA_ONLINE_SMOKE_FORCE_LOCAL: 'true',
      MYSQL_HOST: '',
      MYSQL_USER: '',
      MYSQL_DATABASE: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => process.stdout.write(chunk))
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  return child
}

const checks = []
const createSessionState = () => ({
  cookie: '',
  csrfToken: '',
  username: '',
})

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const fetchJson = async (pathname, init) => {
  const response = await fetch(`${baseURL}${pathname}`, init)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { response, data }
}

const sessionState = createSessionState()
const secondarySessionState = createSessionState()
const tertiarySessionState = createSessionState()
const quaternarySessionState = createSessionState()

const updateCookie = (session, response) => {
  const rawSetCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []
  if (!rawSetCookie.length) return
  const cookieParts = rawSetCookie.map(item => String(item).split(';', 1)[0]).filter(Boolean)
  if (!cookieParts.length) return
  session.cookie = cookieParts.join('; ')
}

const fetchSessionJson = async (session, pathname, init = {}) => {
  const headers = new Headers(init.headers || {})
  if (session.cookie) {
    headers.set('Cookie', session.cookie)
  }
  if (session.csrfToken) {
    headers.set('X-CSRF-Token', session.csrfToken)
  }
  const response = await fetch(`${baseURL}${pathname}`, {
    ...init,
    headers,
  })
  updateCookie(session, response)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { response, data }
}

const fetchAuthedJson = async (pathname, init = {}) => fetchSessionJson(sessionState, pathname, init)
const getInventoryItemQuantity = (decryptedSave, itemId) => (decryptedSave?.inventory?.items || [])
  .filter(entry => entry?.itemId === itemId)
  .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
const getRewardTicketQuantity = (decryptedSave, ticketType) => Math.max(0, Math.floor(Number(decryptedSave?.wallet?.rewardTickets?.[ticketType]) || 0))

const runCheck = async (label, runner) => {
  await runner()
  checks.push(label)
}

const bootstrapSession = async (session, labelPrefix, startingMoney) => {
  const uniqueSeed = Math.random().toString(36).slice(2, 8)
  session.username = `${labelPrefix}_${uniqueSeed}`
  const password = `SmokePass_${uniqueSeed}`
  const { response: registerResponse, data: registerData } = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: session.username,
      password,
      display_name: `${labelPrefix}${uniqueSeed}`,
    }),
  })
  assert(registerResponse.ok, `register returned ${registerResponse.status}: ${registerData?.msg || 'unknown error'}`)
  assert(registerData?.ok === true, 'register did not return ok=true')
  assert(typeof registerData?.csrf_token === 'string' && registerData.csrf_token, 'register did not return csrf_token')
  session.csrfToken = registerData.csrf_token

  const { response: meResponse, data: meData } = await fetchSessionJson(session, '/api/me')
  assert(meResponse.ok, `/api/me after register returned ${meResponse.status}`)
  assert(meData?.ok === true, '/api/me after register did not return ok=true')
  assert(meData?.user?.username === session.username, 'session username does not match registered user')
  assert(typeof meData?.csrf_token === 'string' && meData.csrf_token, '/api/me did not return csrf_token')
  session.csrfToken = meData.csrf_token

  const rawSavePayload = encryptTaoyuanData({
    player: {
      money: startingMoney,
      name: session.username,
    },
    inventory: {
      items: [
        { itemId: 'wood', quantity: 6, quality: 'normal', locked: false },
        { itemId: 'parsnip_seed', quantity: 4, quality: 'normal', locked: false },
        { itemId: 'wintersweet', quantity: 2, quality: 'normal', locked: false },
      ],
      tempItems: [],
      ownedWeapons: [],
      ownedRings: [],
      ownedHats: [],
      ownedShoes: [],
      capacity: 24,
    },
  })

  const { response: saveResponse, data: saveData } = await fetchSessionJson(session, '/api/taoyuan/save/0', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawSavePayload,
      revision: 1,
    }),
  })
  assert(saveResponse.ok, `save write returned ${saveResponse.status}`)
  assert(saveData?.ok === true && saveData?.slot === 0, 'save write payload is incomplete')

  const { response: activeSlotResponse, data: activeSlotData } = await fetchSessionJson(session, '/api/taoyuan/save/active-slot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slot: 0 }),
  })
  assert(activeSlotResponse.ok, `active-slot write returned ${activeSlotResponse.status}`)
  assert(activeSlotData?.ok === true && activeSlotData?.slot === 0, 'active-slot payload is incomplete')
}

const bootstrapAuthOnlySession = async (session, labelPrefix) => {
  const uniqueSeed = Math.random().toString(36).slice(2, 8)
  session.username = `${labelPrefix}_${uniqueSeed}`
  const password = `SmokePass_${uniqueSeed}`
  const { response: registerResponse, data: registerData } = await fetchSessionJson(session, '/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: session.username,
      password,
      display_name: `${labelPrefix}${uniqueSeed}`,
    }),
  })
  assert(registerResponse.ok, `register returned ${registerResponse.status}: ${registerData?.msg || 'unknown error'}`)
  assert(registerData?.ok === true, 'register did not return ok=true')
  assert(typeof registerData?.csrf_token === 'string' && registerData.csrf_token, 'register did not return csrf_token')
  session.csrfToken = registerData.csrf_token

  const { response: meResponse, data: meData } = await fetchSessionJson(session, '/api/me')
  assert(meResponse.ok, `/api/me after register returned ${meResponse.status}`)
  assert(meData?.ok === true, '/api/me after register did not return ok=true')
  assert(meData?.user?.username === session.username, 'session username does not match registered user')
  assert(typeof meData?.csrf_token === 'string' && meData.csrf_token, '/api/me did not return csrf_token')
  session.csrfToken = meData.csrf_token
}

let serverProcess = null
const stopServer = async () => {
  if (!serverProcess || serverProcess.killed) return
  const child = serverProcess
  await new Promise(resolve => {
    child.once('exit', () => resolve())
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
      killer.once('exit', () => resolve())
      killer.once('error', () => {
        try {
          child.kill()
        } catch {}
        resolve()
      })
      return
    }
    try {
      child.kill('SIGTERM')
    } catch {
      resolve()
    }
  })
}

const cleanupSmokeArtifacts = async () => {
  if (configuredBaseURL) return
  try {
    await rm(smokeTempDir, { recursive: true, force: true })
  } catch {}
}

const cleanupSmokeUsers = async () => {
  const usernames = [
    sessionState.username,
    secondarySessionState.username,
    tertiarySessionState.username,
    quaternarySessionState.username,
  ].filter(username => /^smk/i.test(String(username || '').trim()))

  const deletedUsernames = []
  if (!usernames.length) return

  if (configuredBaseURL) {
    const adminToken = String(process.env.ADMIN_TOKEN || '').trim()
    if (!adminToken) return
    for (const username of usernames) {
      try {
        await fetch(`${baseURL}/api/admin/users/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: {
            'X-Admin-Token': adminToken,
          },
        })
        deletedUsernames.push(username)
      } catch {}
    }
    return deletedUsernames
  }

  for (const username of usernames) {
    try {
      await db.setUserStatus(username, 'deleted')
      deletedUsernames.push(username)
    } catch {}
  }
  return deletedUsernames
}

try {
  if (!configuredBaseURL) {
    serverProcess = startServer()
  }
  await waitForServer(`${baseURL}/api/health`)

  await runCheck('GET /api/health', async () => {
    const { response, data } = await fetchJson('/api/health')
    assert(response.ok, 'health endpoint did not return 200')
    assert(data?.ok === true, 'health payload did not return ok=true')
  })

  await runCheck('GET /api/public-config', async () => {
    const { response, data } = await fetchJson('/api/public-config')
    assert(response.ok, 'public-config endpoint did not return 200')
    assert(data?.ok === true, 'public-config payload did not return ok=true')
    assert(data?.officialManagedStatus && typeof data.officialManagedStatus === 'object', 'public-config missing officialManagedStatus')
    assert(Array.isArray(data?.readonlyManagedFields), 'public-config missing readonlyManagedFields array')
  })

  await runCheck('GET /api/taoyuan/ai/config', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/ai/config')
    assert(response.ok, 'AI public config endpoint did not return 200')
    assert(data?.ok === true && data?.config, 'AI public config payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/hall/posts', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/hall/posts?page=1&page_size=1')
    assert(response.ok, 'hall posts endpoint did not return 200')
    assert(data?.ok === true && Array.isArray(data?.posts), 'hall posts payload is incomplete')
  })

  await runCheck('GET /api/me unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/me')
    assert(response.status === 401, `expected 401 from /api/me, received ${response.status}`)
    assert(data?.ok === false, 'unauth /api/me should return ok=false')
  })

  await runCheck('GET /api/taoyuan/save/list unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/save/list')
    assert(response.status === 401, `expected 401 from /api/taoyuan/save/list, received ${response.status}`)
    assert(data?.ok === false, 'unauth save/list should return ok=false')
  })

  await runCheck('GET /api/taoyuan/mail/list unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/mail/list')
    assert(response.status === 401, `expected 401 from /api/taoyuan/mail/list, received ${response.status}`)
    assert(data?.ok === false, 'unauth mail/list should return ok=false')
  })

  await runCheck('POST /api/taoyuan/hall/posts unauth fallback', async () => {
    const { response, data } = await fetchJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'smoke',
        content: 'smoke',
      }),
    })
    assert(response.status === 401, `expected 401 from unauth hall post create, received ${response.status}`)
    assert(data?.ok === false, 'unauth hall post create should return ok=false')
  })

  await runCheck('register + session bootstrap', async () => {
    await bootstrapSession(sessionState, 'smk', 1200)
  })

  await runCheck('GET /api/me login state', async () => {
    const { response, data } = await fetchAuthedJson('/api/me')
    assert(response.ok, `/api/me after register returned ${response.status}`)
    assert(data?.ok === true, '/api/me after register did not return ok=true')
    assert(data?.user?.username === sessionState.username, 'session username does not match registered user')
    assert(typeof data?.csrf_token === 'string' && data.csrf_token, '/api/me did not return csrf_token')
    sessionState.csrfToken = data.csrf_token
  })

  await runCheck('POST /api/taoyuan/save/:slot write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save readback returned ${response.status}`)
    assert(data?.ok === true && data?.slot === 0, 'save write payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/save/active-slot write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/slots')
    assert(response.ok, `save slots returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.slots), 'active-slot verification payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/save/slots read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/slots')
    assert(response.ok, `save slots returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.slots), 'save slots payload is incomplete')
    assert(data.slots.some(item => item?.slot === 0 && typeof item?.raw === 'string' && item.raw), 'slot 0 was not persisted')
  })

  await runCheck('GET /api/taoyuan/online/manor own snapshot', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor')
    assert(response.ok, `own manor snapshot returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.username === sessionState.username, 'own manor snapshot payload is incomplete')
    assert(Array.isArray(data?.snapshot?.theme_week?.template_options) && data.snapshot.theme_week.template_options.length >= 5, 'manor template options are incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor/:username public snapshot', async () => {
    const { response, data } = await fetchJson(`/api/taoyuan/online/manor/${encodeURIComponent(sessionState.username)}`)
    assert(response.ok, `public manor snapshot returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.username === sessionState.username, 'public manor snapshot payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/manor/theme-week write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor/theme-week', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'smoke manor festival',
        season: 'spring',
        week_tag: 'smoke-spring-w1',
        template_id: 'festival',
      }),
    })
    assert(response.ok, `manor theme-week write returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.theme_week?.template_id === 'festival', 'manor theme-week write payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor theme-week readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor')
    assert(response.ok, `theme-week manor readback returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot?.theme_week?.template_id === 'festival', 'theme-week readback did not persist template id')
  })

  let createdPostId = ''
  await runCheck('POST /api/taoyuan/hall/posts write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `smoke hall post ${Date.now()}`,
        content: 'smoke content',
        blocks: [
          { id: 'smoke_block_1', type: 'text', text: 'smoke content' },
        ],
        type: 'discussion',
      }),
    })
    assert(response.ok, `hall post create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.id, 'hall post create payload is incomplete')
    createdPostId = String(data.post.id)
  })

  await runCheck('GET /api/taoyuan/hall/posts/:id read path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}`)
    assert(response.ok, `hall post detail returned ${response.status}`)
    assert(data?.ok === true && data?.post?.id === createdPostId, 'hall post detail payload is incomplete')
  })

  let createdReplyId = ''
  await runCheck('POST /api/taoyuan/hall/posts/:id/replies write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'smoke reply content',
      }),
    })
    assert(response.ok, `hall reply create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.replies?.length, 'hall reply payload is incomplete')
    createdReplyId = String(data.post.replies[data.post.replies.length - 1]?.id || '')
    assert(createdReplyId, 'hall reply id was not created')
  })

  await runCheck('POST /api/taoyuan/mail/system-campaign write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/system-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `smoke mail ${Date.now()}`,
        content: 'smoke mail content',
        template_type: 'activity_notice',
      }),
    })
    assert(response.ok, `system campaign returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.campaign?.id, 'system campaign payload is incomplete')
  })

  const adminToken = String(process.env.ADMIN_TOKEN || '').trim()
  let rewardPostId = ''
  let rewardReplyId = ''
  let manorGuestbookEntryContent = ''
  const playerLetterTitle = `smoke player letter ${Date.now()}`
  const playerLetterContent = '这是一封来自联机 smoke 的玩家书信，用来验证互寄来信链路。'
  const playerGiftPackageTitle = `smoke gift package ${Date.now()}`
  let playerGiftPackageMailId = ''
  const coopOrderDeadlineAt = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60
  const publicCoopOrderTitle = `public coop order ${Date.now()}`
  const friendCoopOrderTitle = `friend coop order ${Date.now()}`
  const neighborCoopOrderTitle = `neighbor coop order ${Date.now()}`
  const relayCoopOrderTitle = `relay coop order ${Date.now()}`
  const expiringCoopOrderTitle = `expiring coop order ${Date.now()}`
  let publicCoopOrderId = ''
  let friendCoopOrderId = ''
  let neighborCoopOrderId = ''
  let relayCoopOrderId = ''
  let relayStageOneId = ''
  let relayStageTwoId = ''
  let expiringCoopOrderId = ''
  let neighborConsignmentListingId = ''
  let neighborConsignmentExpiredListingId = ''
  let festivalStallFoodOfferId = ''
  let festivalStallTicketOfferId = ''
  let exchangeLedgerReportableEntryId = ''
  let originalMarketGovernanceConfig = null
  let weeklyExchangeExpectedWoodCount = null
  let weeklyExchangeExpectedStoneCount = null
  let primaryExpectedMoney = 1200
  let secondaryExpectedMoney = 260
  await runCheck('second session bootstrap', async () => {
    await bootstrapSession(secondarySessionState, 'smk2', 260)
  })

  manorGuestbookEntryContent = `smoke guestbook ${Date.now()}`
  await runCheck('POST /api/taoyuan/online/manor/guestbook write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/guestbook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: sessionState.username,
        kind: 'blessing',
        content: manorGuestbookEntryContent,
      }),
    })
    assert(response.ok, `manor guestbook write returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.id, 'manor guestbook write payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/manor/visit write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: sessionState.username,
        purpose: 'friend_visit',
        summary: 'smoke manor visit',
        feedback: 'smoke manor feedback',
      }),
    })
    assert(response.ok, `manor visit write returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.id, 'manor visit write payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor guestbook/visit readback', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/manor')
    assert(response.ok, `guestbook / visit manor readback returned ${response.status}`)
    assert(data?.ok === true && data?.snapshot, 'guestbook / visit manor readback payload is incomplete')
    assert(data.snapshot.guestbook_entries.some(entry => entry.content === manorGuestbookEntryContent), 'guestbook entry was not persisted to manor snapshot')
    assert(data.snapshot.visit_entries.some(entry => entry.summary === 'smoke manor visit'), 'visit entry was not persisted to manor snapshot')
  })

  await runCheck('POST /api/taoyuan/online/manor/:username/favorite write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/manor/${encodeURIComponent(sessionState.username)}/favorite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: 'smoke manor theme',
      }),
    })
    assert(response.ok, `manor favorite write returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.id, 'manor favorite write payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/manor/favorites/overview read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/manor/favorites/overview')
    assert(response.ok, `manor favorite overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.hot_manors), 'manor favorite overview payload is incomplete')
    assert(data.hot_manors.some(entry => entry?.manor_username === sessionState.username), 'manor hot board did not include the favorited manor')
  })

  await runCheck('POST /api/taoyuan/mail/player-letter write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
        title: playerLetterTitle,
        content: playerLetterContent,
        template_type: 'season_greeting',
      }),
    })
    assert(response.ok, `player-letter write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.title === playerLetterTitle, 'player-letter payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list player-letter read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `player-letter list returned ${response.status}`)
    const playerLetter = data?.mails?.find(entry => entry?.title === playerLetterTitle)
    assert(playerLetter, 'player-letter was not delivered to recipient mailbox list')
    assert(playerLetter?.template_type === 'season_greeting', 'player-letter template type was not preserved')
    assert(playerLetter?.sender_username === sessionState.username, 'player-letter sender username is missing')
  })

  await runCheck('GET /api/taoyuan/mail/sent player-letter outbox path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/sent')
    assert(response.ok, `mail sent returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.mails), 'mail sent payload is incomplete')
    const sentLetter = data.mails.find(entry => entry?.title === playerLetterTitle)
    assert(sentLetter, 'player-letter was not visible in sender outbox')
    assert(sentLetter?.recipient_username === secondarySessionState.username, 'player-letter outbox recipient did not match')
  })

  await runCheck('POST /api/taoyuan/mail/player-gift-package write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-gift-package', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
        title: playerGiftPackageTitle,
        content: '这是一份来自联机 smoke 的礼物包裹。',
        template_type: 'material_package',
        rewards: [
          {
            type: 'item',
            id: 'wood',
            quantity: 2,
            quality: 'normal',
          },
        ],
      }),
    })
    assert(response.ok, `player-gift-package write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.title === playerGiftPackageTitle, 'player-gift-package payload is incomplete')
    playerGiftPackageMailId = String(data?.mail?.id || '')
    assert(playerGiftPackageMailId, 'player-gift-package mail id was not created')
  })

  await runCheck('GET /api/taoyuan/save/:slot player-gift-package sender deduction', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `player-gift-package sender save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'player-gift-package sender save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const woodCount = (decrypted?.inventory?.items || [])
      .filter(entry => entry?.itemId === 'wood')
      .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
    assert(woodCount === 4, `player-gift-package did not deduct sender wood correctly, current wood=${woodCount}`)
  })

  await runCheck('GET /api/taoyuan/mail/list player-gift-package read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `player-gift-package list returned ${response.status}`)
    const playerGiftPackage = data?.mails?.find(entry => entry?.title === playerGiftPackageTitle)
    assert(playerGiftPackage, 'player-gift-package was not delivered to recipient mailbox list')
    assert(playerGiftPackage?.template_type === 'material_package', 'player-gift-package template type was not preserved')
    assert(playerGiftPackage?.sender_username === sessionState.username, 'player-gift-package sender username is missing')
    assert(playerGiftPackage?.has_rewards === true, 'player-gift-package should expose rewards to recipient')
  })

  await runCheck('GET /api/taoyuan/mail/inbox-status player arrival summary', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/inbox-status')
    assert(response.ok, `mail inbox-status returned ${response.status}`)
    assert(data?.ok === true, 'mail inbox-status did not return ok=true')
    assert(Number(data?.unread_count) >= 1, 'mail inbox-status should report unread mails')
    assert(data?.newest_unread?.title === playerGiftPackageTitle, 'mail inbox-status did not point to the newest unread mail')
  })

  await runCheck('POST /api/taoyuan/mail/:id/pin player important mail path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(playerGiftPackageMailId)}/pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinned: true,
      }),
    })
    assert(response.ok, `mail pin returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.is_pinned === true, 'mail pin payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list pinned order path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `pinned mail list returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.mails), 'pinned mail list payload is incomplete')
    assert(data.mails[0]?.id === playerGiftPackageMailId, 'pinned mail was not floated to the top of the mailbox list')
    assert(data.mails[0]?.is_pinned === true, 'pinned mail flag was not preserved in mailbox list')
  })

  await runCheck('POST /api/taoyuan/mail/:id player-gift-package claim path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(playerGiftPackageMailId)}/claim`, {
      method: 'POST',
    })
    assert(response.ok, `player-gift-package claim returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.claimed_at, 'player-gift-package claim payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/receipts player-gift-package receipt path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/receipts?limit=10')
    assert(response.ok, `mail receipts returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.receipts), 'mail receipts payload is incomplete')
    const receipt = data.receipts.find(entry => entry?.delivery_id === playerGiftPackageMailId)
    assert(receipt, 'claimed player-gift-package did not appear in receipt history')
    assert(receipt?.applied_rewards?.some(entry => entry?.id === 'wood'), 'claimed receipt did not preserve applied reward details')
  })

  await runCheck('POST /api/taoyuan/mail/:id/memorial inbox path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(playerGiftPackageMailId)}/memorial`, {
      method: 'POST',
    })
    assert(response.ok, `mail memorial save returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.delivery_id === playerGiftPackageMailId, 'mail memorial save payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/memorial inbox readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial')
    assert(response.ok, `mail memorial list returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'mail memorial list payload is incomplete')
    const memorialEntry = data.entries.find(entry => entry?.delivery_id === playerGiftPackageMailId)
    assert(memorialEntry, 'saved gift-package did not appear in memorial list')
    assert(Array.isArray(memorialEntry?.tags) && memorialEntry.tags.length > 0, 'memorial entry should preserve generated tags')
  })

  await runCheck('GET /api/taoyuan/mail/memorial seasonal filter readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial?tag=%E8%8A%82%E6%B0%94')
    assert(response.ok, `mail memorial seasonal filter returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'mail memorial seasonal filter payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/save/:slot player-gift-package recipient persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `player-gift-package recipient save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'player-gift-package recipient save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const woodCount = (decrypted?.inventory?.items || [])
      .filter(entry => entry?.itemId === 'wood')
      .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
    assert(woodCount === 8, `player-gift-package did not grant recipient wood correctly, current wood=${woodCount}`)
  })

  await runCheck('POST /api/taoyuan/online/orders public write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: publicCoopOrderTitle,
        description: 'smoke public coop order',
        order_type: 'material_help',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'money',
        reward_value: 120,
        reward_label: '铜钱回报',
      }),
    })
    assert(response.ok, `public coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.title === publicCoopOrderTitle, 'public coop order payload is incomplete')
    publicCoopOrderId = String(data?.order?.id || '')
    assert(publicCoopOrderId, 'public coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders public read path', async () => {
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `primary coop order overview returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.orders?.some(entry => entry?.title === publicCoopOrderTitle && entry?.scope === 'public'), 'public coop order missing from primary overview')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `secondary coop order overview returned ${secondaryOverview.response.status}`)
    assert(secondaryOverview.data?.orders?.some(entry => entry?.title === publicCoopOrderTitle && entry?.scope === 'public'), 'public coop order missing from secondary overview')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/accept public path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `public coop order accept returned ${response.status}`)
    assert(data?.ok === true && data?.order?.assignee_username === secondarySessionState.username, 'public coop order accept payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/orders accepted readback', async () => {
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `accepted coop order owner readback returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.orders?.some(entry => entry?.id === publicCoopOrderId && entry?.assignee_username === secondarySessionState.username), 'accepted coop order assignee missing from owner overview')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/cancel-accept public path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/cancel-accept`, {
      method: 'POST',
    })
    assert(response.ok, `public coop order cancel accept returned ${response.status}`)
    assert(data?.ok === true && !data?.order?.assignee_username, 'public coop order cancel accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/accept public second path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `public coop order second accept returned ${response.status}`)
    assert(data?.ok === true && data?.order?.assignee_username === secondarySessionState.username, 'public coop order second accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/deliver path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          {
            item_id: 'wheat',
            quantity: 2,
          },
        ],
        result_note: 'smoke delivery note',
      }),
    })
    assert(response.ok, `coop order deliver returned ${response.status}`)
    assert(data?.ok === true && data?.order?.delivery_status === 'submitted', 'coop order deliver payload is incomplete')
    assert(data?.receipt?.status === 'pending_owner_confirm', 'coop order deliver receipt status is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/deliver duplicate guard path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          {
            item_id: 'wheat',
            quantity: 2,
          },
        ],
        result_note: 'smoke delivery note',
      }),
    })
    assert(response.ok, `coop order duplicate deliver returned ${response.status}`)
    assert(data?.ok === true && data?.duplicate_protected === true, 'coop order duplicate guard did not trigger')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/confirm-delivery path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(publicCoopOrderId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `coop order confirm delivery returned ${response.status}`)
    assert(data?.ok === true && data?.order?.delivery_status === 'confirmed', 'coop order confirm delivery payload is incomplete')
    assert(data?.receipt?.status === 'confirmed', 'coop order confirm receipt payload is incomplete')
    secondaryExpectedMoney += 120
  })

  await runCheck('GET /api/taoyuan/save/:slot coop reward persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `coop reward save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'coop reward save read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === secondaryExpectedMoney, `coop order reward did not persist to second user save, expected money=${secondaryExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  await runCheck('GET /api/taoyuan/online/orders reputation summary readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(response.ok, `coop reputation readback returned ${response.status}`)
    assert(data?.ok === true && data?.reputation_summary?.total > 0, 'coop reputation total did not increase')
    assert(data?.reputation_summary?.completed_count >= 1, 'coop reputation completed count did not increase')
    assert(typeof data?.reputation_summary?.trust_level?.label === 'string' && data.reputation_summary.trust_level.label, 'coop trust level label is missing')
    assert(data?.reputation_summary?.top_helped_targets?.some(entry => entry?.username === sessionState.username), 'coop trust graph did not include the helped owner')
  })

  await runCheck('POST /api/taoyuan/online/orders expiring write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: expiringCoopOrderTitle,
        description: 'smoke expiring coop order',
        order_type: 'npc_request',
        scope: 'public',
        deadline_at: Math.floor(Date.now() / 1000) + 5,
        reward_type: 'money',
        reward_value: 30,
        reward_label: '短时赏金',
      }),
    })
    assert(response.ok, `expiring coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.title === expiringCoopOrderTitle, 'expiring coop order payload is incomplete')
    expiringCoopOrderId = String(data?.order?.id || '')
    assert(expiringCoopOrderId, 'expiring coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders expired readback', async () => {
    await wait(6000)
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `expired coop order readback returned ${primaryOverview.response.status}`)
    assert(primaryOverview.data?.orders?.some(entry => entry?.id === expiringCoopOrderId && entry?.status === 'expired'), 'expiring coop order did not flip to expired')
  })

  let friendRequestId = ''
  await runCheck('POST /api/taoyuan/online/social/friend-requests order scope setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/friend-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
      }),
    })
    assert(response.ok, `friend request for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.id, 'friend request for coop order scope payload is incomplete')
    friendRequestId = String(data.request.id)
  })

  await runCheck('POST /api/taoyuan/online/social/friend-requests/:id/accept order scope setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/social/friend-requests/${encodeURIComponent(friendRequestId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `friend request accept for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.status === 'accepted', 'friend request accept for coop order scope payload is incomplete')
  })

  let friendMemorialMailId = ''
  await runCheck('POST /api/taoyuan/mail/player-letter friend memorial setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
        title: `friend memorial ${Date.now()}`,
        content: '这是一封用于好友纪念册筛选验证的来信。',
        template_type: 'player_letter',
      }),
    })
    assert(response.ok, `friend memorial mail write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.id, 'friend memorial mail payload is incomplete')
    friendMemorialMailId = String(data.mail.id)
  })

  await runCheck('POST /api/taoyuan/mail/:id/memorial friend filter setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(friendMemorialMailId)}/memorial`, {
      method: 'POST',
    })
    assert(response.ok, `friend memorial save returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.relation_scope === 'friend', 'friend memorial relation scope did not resolve to friend')
  })

  await runCheck('GET /api/taoyuan/mail/memorial friend filter readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial?relation_scope=friend')
    assert(response.ok, `friend memorial filter returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'friend memorial filter payload is incomplete')
    assert(data.entries.some(entry => entry?.delivery_id === friendMemorialMailId), 'friend memorial filter did not return the friend memorial mail')
  })

  await runCheck('POST /api/taoyuan/online/profile coop recommendation tag setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visibility: 'public',
        public_intro: 'smoke coop helper',
        manor_name: '协作试验庄',
        public_title: '互助试验员',
        neighborhood_role: '互助成员',
        showcase_theme: '节庆备货',
        selected_tag_ids: ['festival', 'mutual_aid'],
      }),
    })
    assert(response.ok, `coop recommendation profile setup returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.profile?.public_tags), 'coop recommendation profile setup payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders friends write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: friendCoopOrderTitle,
        description: 'smoke friend coop order',
        order_type: 'festival_supply',
        scope: 'friends',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'reputation',
        reward_value: 50,
        reward_label: '互助声望',
      }),
    })
    assert(response.ok, `friend coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.scope === 'friends', 'friend coop order payload is incomplete')
    friendCoopOrderId = String(data?.order?.id || '')
    assert(friendCoopOrderId, 'friend coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders friends visibility', async () => {
    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `friend-scope coop order overview returned ${secondaryOverview.response.status}`)
    const friendOrder = secondaryOverview.data?.orders?.find(entry => entry?.title === friendCoopOrderTitle && entry?.scope === 'friends')
    assert(friendOrder, 'friend-scope coop order missing from viewer overview')
    assert(Number(friendOrder?.priority_score) > 0, 'friend-scope coop order did not receive recommendation priority')
    assert(Array.isArray(friendOrder?.priority_reasons) && friendOrder.priority_reasons.some(reason => String(reason).includes('好友')), 'friend-scope coop order missing friend recommendation reason')
    assert(Array.isArray(friendOrder?.priority_reasons) && friendOrder.priority_reasons.some(reason => String(reason).includes('节庆') || String(reason).includes('互助')), 'friend-scope coop order missing tag recommendation reason')
  })

  let neighborInviteId = ''
  await runCheck('POST /api/taoyuan/online/social/neighbors create order scope setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/neighbors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `smoke-neighbor-${Date.now()}`,
        summary: 'smoke neighbor group',
        notice: 'smoke notice',
        capacity: 12,
      }),
    })
    assert(response.ok, `neighbor create for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.group?.id, 'neighbor create for coop order scope payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/social/neighbors/invite order scope setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/social/neighbors/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
      }),
    })
    assert(response.ok, `neighbor invite for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.id, 'neighbor invite for coop order scope payload is incomplete')
    neighborInviteId = String(data.request.id)
  })

  await runCheck('POST /api/taoyuan/online/social/neighbors/requests/:id/accept order scope setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/social/neighbors/requests/${encodeURIComponent(neighborInviteId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `neighbor invite accept for coop order scope returned ${response.status}`)
    assert(data?.ok === true && data?.request?.status === 'accepted', 'neighbor invite accept for coop order scope payload is incomplete')
  })

  let neighborMemorialMailId = ''
  await runCheck('POST /api/taoyuan/mail/player-letter neighbor memorial setup', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/player-letter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
        title: `neighbor memorial ${Date.now()}`,
        content: '这是一封用于村社纪念册筛选验证的来信。',
        template_type: 'festival_greeting',
      }),
    })
    assert(response.ok, `neighbor memorial mail write returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.id, 'neighbor memorial mail payload is incomplete')
    neighborMemorialMailId = String(data.mail.id)
  })

  await runCheck('POST /api/taoyuan/mail/:id/memorial neighbor filter setup', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/mail/${encodeURIComponent(neighborMemorialMailId)}/memorial`, {
      method: 'POST',
    })
    assert(response.ok, `neighbor memorial save returned ${response.status}`)
    assert(data?.ok === true && data?.entry?.relation_scope === 'neighbor', 'neighbor memorial relation scope did not resolve to neighbor')
  })

  await runCheck('GET /api/taoyuan/mail/memorial neighbor filter readback', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/mail/memorial?relation_scope=neighbor')
    assert(response.ok, `neighbor memorial filter returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.entries), 'neighbor memorial filter payload is incomplete')
    assert(data.entries.some(entry => entry?.delivery_id === neighborMemorialMailId), 'neighbor memorial filter did not return the neighbor memorial mail')
  })

  await runCheck('POST /api/taoyuan/online/orders neighbors write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: neighborCoopOrderTitle,
        description: 'smoke neighbor coop order',
        order_type: 'village_build',
        scope: 'neighbors',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'gift',
        reward_value: 1,
        reward_label: '邻里回礼包',
      }),
    })
    assert(response.ok, `neighbor coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.scope === 'neighbors', 'neighbor coop order payload is incomplete')
    neighborCoopOrderId = String(data?.order?.id || '')
    assert(neighborCoopOrderId, 'neighbor coop order id was not created')
  })

  await runCheck('GET /api/taoyuan/online/orders neighbors visibility', async () => {
    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `neighbor-scope coop order overview returned ${secondaryOverview.response.status}`)
    const neighborOrder = secondaryOverview.data?.orders?.find(entry => entry?.title === neighborCoopOrderTitle && entry?.scope === 'neighbors')
    assert(neighborOrder, 'neighbor-scope coop order missing from viewer overview')
    assert(Array.isArray(neighborOrder?.priority_reasons) && neighborOrder.priority_reasons.some(reason => String(reason).includes('邻里')), 'neighbor-scope coop order missing neighbor recommendation reason')
  })

  await runCheck('GET /api/taoyuan/exchange-station/neighbors/consignments read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments')
    assert(response.ok, `neighbor consignment read returned ${response.status}`)
    assert(data?.ok === true && data?.neighbor_group?.name, 'neighbor consignment overview payload is incomplete')
    assert(Array.isArray(data?.scope_options) && data.scope_options.some(entry => entry?.id === 'friends'), 'neighbor consignment scope options are incomplete')
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wintersweet',
        quantity: 1,
        price_money: 70,
        scope: 'neighbors',
        duration_hours: 72,
      }),
    })
    assert(response.ok, `neighbor consignment write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.listing?.id, 'neighbor consignment write payload is incomplete')
    assert(data?.listing?.scope === 'neighbors', 'neighbor consignment write did not preserve scope')
    neighborConsignmentListingId = String(data.listing.id)
    assert(neighborConsignmentListingId, 'neighbor consignment listing id was not created')
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments/:listingId/purchase write path', async () => {
    const preSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(preSave.response.ok, `neighbor consignment buyer save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'neighbor consignment buyer save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preMoney = Math.floor(Number(preDecrypted?.player?.money) || 0)
    const preWintersweetCount = getInventoryItemQuantity(preDecrypted, 'wintersweet')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(neighborConsignmentListingId)}/purchase`, {
      method: 'POST',
    })
    assert(response.ok, `neighbor consignment purchase returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.listing?.status === 'sold', 'neighbor consignment purchase payload is incomplete')

    const buyerSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(buyerSave.response.ok, `neighbor consignment buyer persistence read returned ${buyerSave.response.status}`)
    assert(buyerSave.data?.ok === true && typeof buyerSave.data?.raw === 'string', 'neighbor consignment buyer persistence payload is incomplete')
    const buyerDecrypted = decryptTaoyuanRaw(buyerSave.data.raw)
    const buyerMoney = Math.floor(Number(buyerDecrypted?.player?.money) || 0)
    const buyerWintersweetCount = getInventoryItemQuantity(buyerDecrypted, 'wintersweet')
    primaryExpectedMoney -= 70
    assert(buyerMoney === preMoney - 70, `neighbor consignment did not deduct buyer money correctly, current money=${buyerMoney}`)
    assert(buyerMoney === primaryExpectedMoney, `neighbor consignment did not persist buyer money correctly, expected money=${primaryExpectedMoney}, current money=${buyerMoney}`)
    assert(buyerWintersweetCount === preWintersweetCount + 1, `neighbor consignment did not grant buyer wintersweet correctly, current wintersweet=${buyerWintersweetCount}`)

    const sellerSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(sellerSave.response.ok, `neighbor consignment seller persistence read returned ${sellerSave.response.status}`)
    assert(sellerSave.data?.ok === true && typeof sellerSave.data?.raw === 'string', 'neighbor consignment seller persistence payload is incomplete')
    const sellerDecrypted = decryptTaoyuanRaw(sellerSave.data.raw)
    const sellerMoney = Math.floor(Number(sellerDecrypted?.player?.money) || 0)
    secondaryExpectedMoney += 70
    assert(sellerMoney === secondaryExpectedMoney, `neighbor consignment did not credit seller money correctly, expected money=${secondaryExpectedMoney}, current money=${sellerMoney}`)
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments cancel path', async () => {
    await wait(2100)
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 40,
        scope: 'friends',
        duration_hours: 72,
      }),
    })
    assert(response.ok, `neighbor consignment cancel setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    const cancelListingId = String(data?.listing?.id || '')
    assert(cancelListingId, 'neighbor consignment cancel setup did not create listing id')

    const cancelResponse = await fetchSessionJson(secondarySessionState, `/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(cancelListingId)}/cancel`, {
      method: 'POST',
    })
    assert(cancelResponse.response.ok, `neighbor consignment cancel returned ${cancelResponse.response.status}`)
    assert(cancelResponse.data?.ok === true && cancelResponse.data?.listing?.status === 'cancelled', 'neighbor consignment cancel payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/exchange-station/neighbors/consignments reclaim expired path', async () => {
    await wait(2100)
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 35,
        scope: 'neighbors',
        duration_hours: 1,
      }),
    })
    assert(response.ok, `neighbor consignment reclaim setup returned ${response.status}: ${data?.msg || 'unknown error'}`)
    neighborConsignmentExpiredListingId = String(data?.listing?.id || '')
    assert(neighborConsignmentExpiredListingId, 'neighbor consignment reclaim setup did not create listing id')

    const consignmentFile = path.join(smokeTempDir, 'taoyuan_neighbor_consignments.json')
    const consignmentData = JSON.parse(await readFile(consignmentFile, 'utf8'))
    consignmentData.listings = consignmentData.listings.map(entry =>
      entry.id === neighborConsignmentExpiredListingId
        ? { ...entry, expires_at: Math.floor(Date.now() / 1000) - 10 }
        : entry
    )
    await writeFile(consignmentFile, JSON.stringify(consignmentData, null, 2), 'utf8')

    const reclaimResponse = await fetchSessionJson(secondarySessionState, `/api/taoyuan/exchange-station/neighbors/consignments/${encodeURIComponent(neighborConsignmentExpiredListingId)}/reclaim`, {
      method: 'POST',
    })
    assert(reclaimResponse.response.ok, `neighbor consignment reclaim returned ${reclaimResponse.response.status}`)
    assert(reclaimResponse.data?.ok === true && reclaimResponse.data?.listing?.status === 'reclaimed', 'neighbor consignment reclaim payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/exchange-station/weekly read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/weekly')
    assert(response.ok, `weekly exchange station read returned ${response.status}`)
    assert(data?.ok === true && data?.station?.week_key, 'weekly exchange station payload is incomplete')
    assert(Array.isArray(data?.station?.categories) && data.station.categories.some(entry => entry?.id === 'festival' && Number(entry.offer_count) >= 1), 'weekly exchange station did not expose festival category offers')
    assert(Array.isArray(data?.station?.categories) && data.station.categories.some(entry => entry?.id === 'neighbor' && Number(entry.offer_count) >= 1), 'weekly exchange station did not expose neighbor category offers')
    assert(data?.station?.festival_theme?.label, 'weekly exchange station did not expose festival theme rotation')
    assert(data?.station?.neighbor_context?.group_name, 'weekly exchange station did not expose neighbor context for neighbor member')
    const targetOffer = data.station.offers?.find(entry => entry?.id === 'wood_for_stone')
    assert(targetOffer, 'weekly exchange station did not expose the wood_for_stone offer')
    assert(targetOffer?.can_exchange === true, 'weekly exchange station offer should be exchangeable for secondary session')
    const neighborOffer = data.station.offers?.find(entry => entry?.category === 'neighbor')
    assert(neighborOffer, 'weekly exchange station did not expose any neighbor-only offer')
  })

  await runCheck('GET /api/taoyuan/exchange-station/festival-stall read path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/festival-stall')
    assert(response.ok, `festival stall read returned ${response.status}`)
    assert(data?.ok === true && data?.stall?.festival_theme?.label, 'festival stall overview payload is incomplete')
    assert(Array.isArray(data?.stall?.offers) && data.stall.offers.some(entry => entry?.booth_category === 'materials'), 'festival stall did not expose any material bundle')
    assert(Array.isArray(data?.stall?.offers) && data.stall.offers.some(entry => entry?.booth_category === 'souvenir'), 'festival stall did not expose any souvenir bundle')
    const foodOffer = data.stall.offers.find(entry => entry?.booth_category === 'food')
    const ticketOffer = data.stall.offers.find(entry => entry?.booth_category === 'tickets')
    assert(foodOffer, 'festival stall did not expose any festival food')
    assert(ticketOffer, 'festival stall did not expose any ticket bundle')
    festivalStallFoodOfferId = String(foodOffer?.id || '')
    festivalStallTicketOfferId = String(ticketOffer?.id || '')
    assert(festivalStallFoodOfferId, 'festival stall food offer id was not created')
    assert(festivalStallTicketOfferId, 'festival stall ticket offer id was not created')
  })

  await runCheck('POST /api/taoyuan/exchange-station/festival-stall/:offerId/purchase food path', async () => {
    const preSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(preSave.response.ok, `festival stall buyer save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'festival stall buyer save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preMoney = Math.floor(Number(preDecrypted?.player?.money) || 0)
    const targetFoodId = 'food_qing_tuan'
    const preFoodCount = getInventoryItemQuantity(preDecrypted, targetFoodId)

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalStallFoodOfferId)}/purchase`, {
      method: 'POST',
    })
    assert(response.ok, `festival stall purchase returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.offer?.id === festivalStallFoodOfferId, 'festival stall food purchase payload is incomplete')

    const buyerSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(buyerSave.response.ok, `festival stall buyer persistence read returned ${buyerSave.response.status}`)
    assert(buyerSave.data?.ok === true && typeof buyerSave.data?.raw === 'string', 'festival stall buyer persistence payload is incomplete')
    const buyerDecrypted = decryptTaoyuanRaw(buyerSave.data.raw)
    const buyerMoney = Math.floor(Number(buyerDecrypted?.player?.money) || 0)
    const buyerFoodCount = getInventoryItemQuantity(buyerDecrypted, targetFoodId)
    primaryExpectedMoney -= data.offer.price_money
    assert(buyerMoney === preMoney - data.offer.price_money, `festival stall did not deduct buyer money correctly, current money=${buyerMoney}`)
    assert(buyerMoney === primaryExpectedMoney, `festival stall did not persist buyer money correctly, expected money=${primaryExpectedMoney}, current money=${buyerMoney}`)
    assert(buyerFoodCount === preFoodCount + 2, `festival stall did not grant festival food correctly, current food=${buyerFoodCount}`)
  })

  await runCheck('POST /api/taoyuan/exchange-station/festival-stall/:offerId/purchase ticket path', async () => {
    const preSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(preSave.response.ok, `festival stall ticket pre-save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'festival stall ticket pre-save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preMoney = Math.floor(Number(preDecrypted?.player?.money) || 0)
    const preCaravanTicketCount = getRewardTicketQuantity(preDecrypted, 'caravan')

    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/festival-stall/${encodeURIComponent(festivalStallTicketOfferId)}/purchase`, {
      method: 'POST',
    })
    assert(response.ok, `festival stall ticket purchase returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.offer?.id === festivalStallTicketOfferId, 'festival stall ticket purchase payload is incomplete')

    const buyerSave = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(buyerSave.response.ok, `festival stall ticket persistence read returned ${buyerSave.response.status}`)
    assert(buyerSave.data?.ok === true && typeof buyerSave.data?.raw === 'string', 'festival stall ticket persistence payload is incomplete')
    const buyerDecrypted = decryptTaoyuanRaw(buyerSave.data.raw)
    const buyerMoney = Math.floor(Number(buyerDecrypted?.player?.money) || 0)
    const buyerCaravanTicketCount = getRewardTicketQuantity(buyerDecrypted, 'caravan')
    primaryExpectedMoney -= data.offer.price_money
    assert(buyerMoney === preMoney - data.offer.price_money, `festival stall ticket bundle did not deduct buyer money correctly, current money=${buyerMoney}`)
    assert(buyerMoney === primaryExpectedMoney, `festival stall ticket bundle did not persist buyer money correctly, expected money=${primaryExpectedMoney}, current money=${buyerMoney}`)
    assert(buyerCaravanTicketCount === preCaravanTicketCount + 1, `festival stall did not grant wallet ticket correctly, current caravan券=${buyerCaravanTicketCount}`)
  })

  await runCheck('POST /api/taoyuan/exchange-station/weekly/:offerId/exchange write path', async () => {
    const preSave = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(preSave.response.ok, `weekly exchange pre-save read returned ${preSave.response.status}`)
    assert(preSave.data?.ok === true && typeof preSave.data?.raw === 'string', 'weekly exchange pre-save payload is incomplete')
    const preDecrypted = decryptTaoyuanRaw(preSave.data.raw)
    const preWoodCount = getInventoryItemQuantity(preDecrypted, 'wood')
    const preStoneCount = getInventoryItemQuantity(preDecrypted, 'stone')
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/weekly/wood_for_stone/exchange', {
      method: 'POST',
    })
    assert(response.ok, `weekly exchange execution returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.offer?.id === 'wood_for_stone', 'weekly exchange execution payload is incomplete')
    assert(Number(data?.offer?.claimed_by_user) === 1, 'weekly exchange execution did not advance personal claim count')
    assert(Array.isArray(data?.record?.rewards) && data.record.rewards.some(entry => entry?.item_id === 'stone'), 'weekly exchange execution record did not preserve reward detail')
    weeklyExchangeExpectedWoodCount = preWoodCount - 4
    weeklyExchangeExpectedStoneCount = preStoneCount + 10
  })

  await runCheck('GET /api/taoyuan/save/:slot weekly exchange persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `weekly exchange save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'weekly exchange save payload is incomplete')
    assert(weeklyExchangeExpectedWoodCount !== null, 'weekly exchange expected wood count was not captured')
    assert(weeklyExchangeExpectedStoneCount !== null, 'weekly exchange expected stone count was not captured')
    const decrypted = decryptTaoyuanRaw(data.raw)
    const woodCount = getInventoryItemQuantity(decrypted, 'wood')
    const stoneCount = getInventoryItemQuantity(decrypted, 'stone')
    assert(woodCount === weeklyExchangeExpectedWoodCount, `weekly exchange did not deduct secondary user wood correctly, expected wood=${weeklyExchangeExpectedWoodCount}, current wood=${woodCount}`)
    assert(stoneCount === weeklyExchangeExpectedStoneCount, `weekly exchange did not grant secondary user stone correctly, expected stone=${weeklyExchangeExpectedStoneCount}, current stone=${stoneCount}`)
  })

  await runCheck('GET /api/taoyuan/exchange-station/ledger read path', async () => {
    const primaryLedger = await fetchAuthedJson('/api/taoyuan/exchange-station/ledger')
    assert(primaryLedger.response.ok, `primary exchange ledger read returned ${primaryLedger.response.status}`)
    assert(primaryLedger.data?.ok === true && primaryLedger.data?.ledger?.summary?.trust_level?.label, 'primary exchange ledger payload is incomplete')
    assert(Array.isArray(primaryLedger.data?.ledger?.entries) && primaryLedger.data.ledger.entries.length >= 2, 'primary exchange ledger did not expose expected entry list')
    assert(primaryLedger.data.ledger.entries.some(entry => entry?.source === 'festival_stall'), 'primary exchange ledger did not include festival stall records')
    assert(primaryLedger.data.ledger.entries.some(entry => entry?.source === 'neighbor_consignment'), 'primary exchange ledger did not include neighbor consignment records')
    const neighborBuyEntry = primaryLedger.data.ledger.entries.find(entry => entry?.source === 'neighbor_consignment' && entry?.event_type === 'consignment_sold' && entry?.viewer_role === 'buyer')
    assert(neighborBuyEntry?.counterparty_username === secondarySessionState.username, 'exchange ledger did not preserve trade counterparty')
    assert(String(neighborBuyEntry?.price_label || '').includes('70'), 'exchange ledger did not preserve consignment price label')
    const reportableEntry = primaryLedger.data.ledger.entries.find(entry => entry?.reportable === true)
    exchangeLedgerReportableEntryId = String(reportableEntry?.id || '')
    assert(exchangeLedgerReportableEntryId, 'exchange ledger did not expose any reportable entry')

    const secondaryLedger = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/ledger')
    assert(secondaryLedger.response.ok, `secondary exchange ledger read returned ${secondaryLedger.response.status}`)
    assert(secondaryLedger.data?.ok === true && secondaryLedger.data?.ledger?.summary?.trust_level?.label, 'secondary exchange ledger payload is incomplete')
    assert(Array.isArray(secondaryLedger.data?.ledger?.entries) && secondaryLedger.data.ledger.entries.length >= 2, 'secondary exchange ledger did not expose expected entry list')
    assert(secondaryLedger.data.ledger.entries.some(entry => entry?.source === 'weekly_exchange_station'), 'secondary exchange ledger did not include weekly exchange records')
    assert(secondaryLedger.data.ledger.entries.some(entry => entry?.source === 'neighbor_consignment'), 'secondary exchange ledger did not include neighbor consignment seller records')
  })

  await runCheck('POST /api/taoyuan/exchange-station/ledger/:entryId/disputes write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/exchange-station/ledger/${encodeURIComponent(exchangeLedgerReportableEntryId)}/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason_code: 'delivery_mismatch',
        note: 'smoke ledger dispute',
      }),
    })
    assert(response.ok, `exchange ledger dispute returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.dispute?.id, 'exchange ledger dispute payload is incomplete')
    assert(data?.dispute?.reason_code === 'delivery_mismatch', 'exchange ledger dispute did not preserve reason code')
    assert(Array.isArray(data?.ledger?.my_disputes) && data.ledger.my_disputes.some(entry => entry?.id === data.dispute.id), 'exchange ledger dispute did not refresh my disputes')
  })

  await runCheck('GET /api/taoyuan/exchange-station/governance read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/exchange-station/governance')
    assert(response.ok, `market governance read returned ${response.status}`)
    assert(data?.ok === true && data?.governance?.price_bands?.consignment?.min_money >= 0, 'market governance payload is incomplete')
    assert(Array.isArray(data?.governance?.sources) && data.governance.sources.some(entry => entry?.id === 'neighbor_consignment'), 'market governance did not expose source toggles')
    assert(data?.governance?.anti_abuse?.daily_trade_action_limit >= 1, 'market governance did not expose anti-abuse config')
  })

  let createdFestivalRoomId = ''
  await runCheck('GET /api/taoyuan/online/festival/rooms read path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(response.ok, `festival room overview returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.templates) && data.templates.length > 0, 'festival room overview payload is incomplete')
    const templateIds = new Set((data?.templates || []).map(item => String(item?.id || '')))
    for (const requiredId of ['yuanri_vigil', 'lantern_fair', 'dragon_boat', 'qixi_stroll', 'mid_autumn_moonwatch', 'laba_cookpot']) {
      assert(templateIds.has(requiredId), `festival room overview missing template ${requiredId}`)
    }
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: 'dragon_boat',
        title: `smoke 节会房间 ${Date.now()}`,
      }),
    })
    assert(response.ok, `festival room create returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.id, 'festival room create payload is incomplete')
    createdFestivalRoomId = String(data.room.id)
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/invite write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_username: secondarySessionState.username,
      }),
    })
    assert(response.ok, `festival room invite returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.invitations?.some(item => item?.target_username === secondarySessionState.username), 'festival room invite payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/join write path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/join`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room join returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === secondarySessionState.username && item?.status === 'joined'), 'festival room join payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/ready-check write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/ready-check`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room ready-check returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'ready_check', 'festival room ready-check payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/ready primary path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room primary ready returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === sessionState.username && item?.status === 'ready'), 'festival room primary ready payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/ready secondary path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/ready`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room secondary ready returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.members?.some(item => item?.username === secondarySessionState.username && item?.status === 'ready'), 'festival room secondary ready payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/start countdown path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/start`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room countdown returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'countdown', 'festival room countdown payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/disconnect path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/disconnect`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room disconnect returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'paused', 'festival room disconnect payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/reconnect path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/reconnect`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': secondarySessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room reconnect returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && ['countdown', 'running'].includes(String(data?.room?.state || '')), 'festival room reconnect payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/online/festival/rooms running readback', async () => {
    await wait(6500)
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/festival/rooms')
    assert(response.ok, `festival room readback returned ${response.status}`)
    assert(data?.ok === true && data?.my_room?.id === createdFestivalRoomId, 'festival room readback payload is incomplete')
    assert(String(data?.my_room?.state || '') === 'running', `festival room did not reach running state, current=${data?.my_room?.state}`)
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/settle path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/settle`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room settle returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'settling', 'festival room settle payload is incomplete')
    assert(Array.isArray(data?.room?.settlement_receipts) && data.room.settlement_receipts.length >= 2, 'festival room settle did not generate per-member receipts')
  })

  await runCheck('POST /api/taoyuan/online/festival/rooms/:roomId/close path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/festival/rooms/${encodeURIComponent(createdFestivalRoomId)}/close`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': sessionState.csrfToken,
      },
    })
    assert(response.ok, `festival room close returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.room?.state === 'closed', 'festival room close payload is incomplete')
  })

  await runCheck('fourth session bootstrap', async () => {
    await bootstrapSession(quaternarySessionState, 'smk4', 180)
  })

  await runCheck('POST /api/taoyuan/online/orders multi-stage write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/online/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: relayCoopOrderTitle,
        description: 'smoke relay coop order',
        order_type: 'village_build',
        scope: 'public',
        deadline_at: coopOrderDeadlineAt,
        reward_type: 'gift',
        reward_value: 2,
        reward_label: '接力礼包',
        stage_definitions: [
          {
            title: '先补齐木材',
            description: '第一段先去补木材',
            preferred_order_type: 'material_help',
            target_item_id: 'wood',
            target_quantity: 2,
          },
          {
            title: '再补石料',
            description: '第二段再去补石料',
            preferred_order_type: 'village_build',
            target_item_id: 'stone',
            target_quantity: 3,
          },
        ],
      }),
    })
    assert(response.ok, `multi-stage coop order write returned ${response.status}`)
    assert(data?.ok === true && data?.order?.collaboration_mode === 'multi_stage', 'multi-stage coop order payload is incomplete')
    assert(Array.isArray(data?.order?.stages) && data.order.stages.length === 2, 'multi-stage coop order did not create 2 stages')
    relayCoopOrderId = String(data?.order?.id || '')
    relayStageOneId = String(data?.order?.stages?.[0]?.id || '')
    relayStageTwoId = String(data?.order?.stages?.[1]?.id || '')
    assert(relayCoopOrderId && relayStageOneId && relayStageTwoId, 'multi-stage coop order ids are incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/accept stage one path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageOneId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage one accept returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.id === relayStageOneId && data?.stage?.assignee_username === secondarySessionState.username, 'multi-stage stage one accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/accept stage two path', async () => {
    const { response, data } = await fetchSessionJson(quaternarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageTwoId)}/accept`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage two accept returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.id === relayStageTwoId && data?.stage?.assignee_username === quaternarySessionState.username, 'multi-stage stage two accept payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/deliver stage one path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageOneId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          { item_id: 'wood', quantity: 2 },
        ],
        result_note: 'stage one delivered',
      }),
    })
    assert(response.ok, `multi-stage stage one deliver returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'submitted', 'multi-stage stage one deliver payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/confirm-delivery stage one path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageOneId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage one confirm returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'confirmed', 'multi-stage stage one confirm payload is incomplete')
    assert(data?.order?.status === 'open', 'multi-stage order should stay open until all stages are confirmed')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/deliver stage two path', async () => {
    const { response, data } = await fetchSessionJson(quaternarySessionState, `/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageTwoId)}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivered_items: [
          { item_id: 'stone', quantity: 3 },
        ],
        result_note: 'stage two delivered',
      }),
    })
    assert(response.ok, `multi-stage stage two deliver returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'submitted', 'multi-stage stage two deliver payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/online/orders/:id/stages/:stageId/confirm-delivery stage two path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/online/orders/${encodeURIComponent(relayCoopOrderId)}/stages/${encodeURIComponent(relayStageTwoId)}/confirm-delivery`, {
      method: 'POST',
    })
    assert(response.ok, `multi-stage stage two confirm returned ${response.status}`)
    assert(data?.ok === true && data?.stage?.delivery_status === 'confirmed', 'multi-stage stage two confirm payload is incomplete')
    assert(data?.order?.status === 'closed', 'multi-stage order should close after all stages are confirmed')
  })

  await runCheck('GET /api/taoyuan/online/orders multi-stage readback', async () => {
    const primaryOverview = await fetchAuthedJson('/api/taoyuan/online/orders')
    assert(primaryOverview.response.ok, `multi-stage owner overview returned ${primaryOverview.response.status}`)
    const relayOrder = primaryOverview.data?.orders?.find(entry => entry?.id === relayCoopOrderId)
    assert(relayOrder && Array.isArray(relayOrder.stages) && relayOrder.stages.length === 2, 'multi-stage order readback is incomplete')
    assert(relayOrder.stages.every(stage => stage.delivery_status === 'confirmed'), 'multi-stage order did not persist confirmed stage states')

    const secondaryOverview = await fetchSessionJson(secondarySessionState, '/api/taoyuan/online/orders')
    assert(secondaryOverview.response.ok, `multi-stage secondary overview returned ${secondaryOverview.response.status}`)
    assert(secondaryOverview.data?.reputation_summary?.top_helped_targets?.some(entry => entry?.username === sessionState.username), 'multi-stage trust graph missing stage one helper relation')

    const quaternaryOverview = await fetchSessionJson(quaternarySessionState, '/api/taoyuan/online/orders')
    assert(quaternaryOverview.response.ok, `multi-stage quaternary overview returned ${quaternaryOverview.response.status}`)
    assert(quaternaryOverview.data?.reputation_summary?.top_helped_targets?.some(entry => entry?.username === sessionState.username), 'multi-stage trust graph missing stage two helper relation')
  })

  await runCheck('POST /api/taoyuan/hall/posts reward help path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `reward help post ${Date.now()}`,
        content: 'need help',
        blocks: [
          { id: 'reward_help_block', type: 'text', text: 'need help' },
        ],
        type: 'help',
        reward_amount: 100,
      }),
    })
    assert(response.ok, `reward help post returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.id, 'reward help post payload is incomplete')
    primaryExpectedMoney -= 100
    rewardPostId = String(data.post.id)
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/replies reward path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(rewardPostId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'reward reply content',
      }),
    })
    assert(response.ok, `reward reply create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.replies?.length, 'reward reply payload is incomplete')
    rewardReplyId = String(data.post.replies[data.post.replies.length - 1]?.id || '')
    assert(rewardReplyId, 'reward reply id was not created')
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/best-reply payout path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(rewardPostId)}/best-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply_id: rewardReplyId,
      }),
    })
    assert(response.ok, `best reply returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.reward_paid_to === secondarySessionState.username, 'best reply payout payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/save/:slot second user payout persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `second user save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'second user save payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    secondaryExpectedMoney += 100
    assert(Number(decrypted?.player?.money) === secondaryExpectedMoney, `best reply payout did not persist to second user save, expected money=${secondaryExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  let refundablePostId = ''
  await runCheck('POST /api/taoyuan/hall/posts refundable help path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `refund help post ${Date.now()}`,
        content: 'refund me later',
        blocks: [
          { id: 'refund_help_block', type: 'text', text: 'refund me later' },
        ],
        type: 'help',
        reward_amount: 80,
      }),
    })
    assert(response.ok, `refundable help post returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.id, 'refundable help post payload is incomplete')
    primaryExpectedMoney -= 80
    refundablePostId = String(data.post.id)
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id refund path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(refundablePostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `hall refund delete returned ${response.status}`)
    assert(data?.ok === true && data?.refunded === true, 'hall refund delete payload is incomplete')
    primaryExpectedMoney += 80
  })

  let rewardMailId = ''
  await runCheck('POST /api/admin/taoyuan/mail/campaigns reward path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for reward mail smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        action: 'send',
        template_type: 'activity_reward',
        title: `smoke reward ${Date.now()}`,
        content: 'smoke reward content',
        recipient_rule: {
          mode: 'single',
          username: sessionState.username,
          target_slot: 0,
        },
        rewards: [
          {
            type: 'money',
            amount: 321,
          },
        ],
        duplicate_compensation_money: 0,
      }),
    })
    assert(response.ok, `admin reward campaign returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.campaign?.id, 'admin reward campaign payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list login state', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/mail/list')
    assert(response.ok, `mail list returned ${response.status}`)
    assert(data?.ok === true, 'mail list did not return ok=true')
    assert(Array.isArray(data?.mails), 'mail list payload is incomplete')
    rewardMailId = String(data.mails.find(item => item?.can_claim === true)?.id || '')
    assert(rewardMailId, 'reward mail was not delivered to mailbox list')
  })

  await runCheck('GET /api/taoyuan/mail/:id detail path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/mail/${encodeURIComponent(rewardMailId)}`)
    assert(response.ok, `mail detail returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.id === rewardMailId, 'mail detail payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/mail/:id/read write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/mail/${encodeURIComponent(rewardMailId)}/read`, {
      method: 'POST',
    })
    assert(response.ok, `mail read returned ${response.status}`)
    assert(data?.ok === true && data?.mail?.read_at, 'mail read payload is incomplete')
  })

  await runCheck('POST /api/taoyuan/mail/:id/claim reward path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/mail/${encodeURIComponent(rewardMailId)}/claim`, {
      method: 'POST',
    })
    assert(response.ok, `mail claim returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.result?.money_added === 321, 'mail claim payload is incomplete')
    primaryExpectedMoney += 321
  })

  await runCheck('GET /api/taoyuan/save/:slot reward persistence', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save slot read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'save slot read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === primaryExpectedMoney, `reward payout / refund chain did not persist to primary save slot, expected money=${primaryExpectedMoney}, current money=${decrypted?.player?.money}`)
  })

  let reportId = ''
  await runCheck('POST /api/taoyuan/hall/posts/:id/report admin path', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'smoke report reason',
      }),
    })
    assert(response.ok, `hall report returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.report?.id, 'hall report payload is incomplete')
    reportId = String(data.report.id)
  })

  await runCheck('GET /api/admin/taoyuan/hall/reports admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for hall admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/hall/reports', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `hall admin reports returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && Array.isArray(data?.reports), 'hall admin reports payload is incomplete')
    assert(data.reports.some(item => item?.id === reportId), 'reported hall item did not reach admin reports')
  })

  await runCheck('POST /api/admin/taoyuan/hall/reports/:id/status admin write path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/admin/taoyuan/hall/reports/${encodeURIComponent(reportId)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        status: 'resolved',
      }),
    })
    assert(response.ok, `hall admin report status returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.report?.status === 'resolved', 'hall admin report status payload is incomplete')
  })

  await runCheck('GET /api/admin/me admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/me', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `admin me returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.isAdmin === true, 'admin me payload is incomplete')
  })

  await runCheck('GET /api/admin/official-control/runtime-status optional path', async () => {
    if (!adminToken) return
    const { response, data } = await fetchAuthedJson('/api/admin/official-control/runtime-status', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    if (response.status === 404) return
    assert(response.ok, `official control runtime status returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.status && Array.isArray(data?.readonlyManagedFields), 'official control runtime status payload is incomplete')
  })

  await runCheck('GET /api/admin/taoyuan/market-governance admin read path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for market governance admin smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/market-governance', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    })
    assert(response.ok, `market governance admin read returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview?.config?.consignment_price_min_money >= 0, 'market governance admin overview payload is incomplete')
    originalMarketGovernanceConfig = data?.overview?.config || null
  })

  await runCheck('POST /api/admin/taoyuan/market-governance admin write path', async () => {
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/market-governance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        neighbor_friends_scope_enabled: false,
        consignment_price_max_money: 90,
        daily_trade_action_limit: 12,
      }),
    })
    assert(response.ok, `market governance admin write returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.overview?.config?.neighbor_friends_scope_enabled === false, 'market governance admin write did not persist scope toggle')
    assert(Number(data?.overview?.config?.consignment_price_max_money) === 90, 'market governance admin write did not persist price band update')

    const publicReadback = await fetchAuthedJson('/api/taoyuan/exchange-station/governance')
    assert(publicReadback.response.ok, `market governance public readback returned ${publicReadback.response.status}`)
    assert(publicReadback.data?.governance?.sources?.some(entry => entry?.id === 'neighbor_friends_scope' && entry?.enabled === false), 'market governance public readback did not reflect scope toggle')
    assert(Number(publicReadback.data?.governance?.price_bands?.consignment?.max_money) === 90, 'market governance public readback did not reflect price band update')
  })

  await runCheck('POST /api/admin/taoyuan/market-governance/sanctions/:username admin write path', async () => {
    const sanctionWrite = await fetchAuthedJson(`/api/admin/taoyuan/market-governance/sanctions/${encodeURIComponent(secondarySessionState.username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        blocked: true,
        reason: 'smoke market sanction',
      }),
    })
    assert(sanctionWrite.response.ok, `market governance sanction write returned ${sanctionWrite.response.status}: ${sanctionWrite.data?.msg || 'unknown error'}`)
    assert(sanctionWrite.data?.ok === true && sanctionWrite.data?.sanction?.blocked === true, 'market governance sanction payload is incomplete')

    const blockedTrade = await fetchSessionJson(secondarySessionState, '/api/taoyuan/exchange-station/neighbors/consignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_id: 'wood',
        quantity: 1,
        price_money: 70,
        scope: 'neighbors',
      }),
    })
    assert(blockedTrade.response.status === 403, `market governance sanction did not block market action, status=${blockedTrade.response.status}`)
    assert(String(blockedTrade.data?.msg || '').includes('smoke market sanction'), 'market governance sanction did not return sanction reason')

    const sanctionReset = await fetchAuthedJson(`/api/admin/taoyuan/market-governance/sanctions/${encodeURIComponent(secondarySessionState.username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        blocked: false,
        reason: '',
      }),
    })
    assert(sanctionReset.response.ok, `market governance sanction reset returned ${sanctionReset.response.status}: ${sanctionReset.data?.msg || 'unknown error'}`)
    assert(sanctionReset.data?.sanction?.blocked === false, 'market governance sanction reset did not clear block')

    if (originalMarketGovernanceConfig) {
      const configReset = await fetchAuthedJson('/api/admin/taoyuan/market-governance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          ...originalMarketGovernanceConfig,
          rare_item_blocklist: Array.isArray(originalMarketGovernanceConfig.rare_item_blocklist)
            ? originalMarketGovernanceConfig.rare_item_blocklist.join(',')
            : originalMarketGovernanceConfig.rare_item_blocklist,
        }),
      })
      assert(configReset.response.ok, `market governance config reset returned ${configReset.response.status}: ${configReset.data?.msg || 'unknown error'}`)
    }
  })

  await runCheck('third session auth-only bootstrap', async () => {
    await bootstrapAuthOnlySession(tertiarySessionState, 'smk3')
  })

  let noSaveRewardPostId = ''
  let noSaveRewardReplyId = ''
  await runCheck('POST /api/taoyuan/hall/posts no-save reward help path', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/hall/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `no save reward post ${Date.now()}`,
        content: 'no save reward post',
        blocks: [
          { id: 'no_save_reward_block', type: 'text', text: 'no save reward post' },
        ],
        type: 'help',
        reward_amount: 70,
      }),
    })
    assert(response.ok, `no-save reward help post returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.post?.id, 'no-save reward help post payload is incomplete')
    noSaveRewardPostId = String(data.post.id)
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/replies no-save path', async () => {
    const { response, data } = await fetchSessionJson(tertiarySessionState, `/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'no save reward reply',
      }),
    })
    assert(response.ok, `no-save reward reply create returned ${response.status}`)
    assert(data?.ok === true && data?.post?.replies?.length, 'no-save reward reply payload is incomplete')
    noSaveRewardReplyId = String(data.post.replies[data.post.replies.length - 1]?.id || '')
    assert(noSaveRewardReplyId, 'no-save reward reply id was not created')
  })

  await runCheck('POST /api/taoyuan/hall/posts/:id/best-reply no-save failure rollback', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}/best-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reply_id: noSaveRewardReplyId,
      }),
    })
    assert(!response.ok, 'best reply should fail when reply author has no server save')
    assert(data?.ok === false, 'best reply failure should return ok=false')

    const detail = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}`)
    assert(detail.response.ok, 'failed payout post detail could not be reloaded')
    assert(detail.data?.post?.reward_status === 'open', `failed payout should keep reward_status=open, current=${detail.data?.post?.reward_status}`)
    assert(!detail.data?.post?.reward_paid_to, 'failed payout should not set reward_paid_to')
    assert(!detail.data?.post?.best_reply_id, 'failed payout should not persist best_reply_id')
  })

  let noSaveRewardMailId = ''
  await runCheck('POST /api/admin/taoyuan/mail/campaigns no-save reward mail path', async () => {
    assert(adminToken, 'ADMIN_TOKEN is required for no-save reward mail smoke')
    const { response, data } = await fetchAuthedJson('/api/admin/taoyuan/mail/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify({
        action: 'send',
        template_type: 'activity_reward',
        title: `no save reward mail ${Date.now()}`,
        content: 'no save reward mail content',
        recipient_rule: {
          mode: 'single',
          username: tertiarySessionState.username,
          target_slot: 0,
        },
        rewards: [
          {
            type: 'money',
            amount: 111,
          },
        ],
        duplicate_compensation_money: 0,
      }),
    })
    assert(response.ok, `no-save reward mail campaign returned ${response.status}: ${data?.msg || 'unknown error'}`)
    assert(data?.ok === true && data?.campaign?.id, 'no-save reward mail campaign payload is incomplete')
  })

  await runCheck('GET /api/taoyuan/mail/list no-save login state', async () => {
    const { response, data } = await fetchSessionJson(tertiarySessionState, '/api/taoyuan/mail/list')
    assert(response.ok, `no-save mail list returned ${response.status}`)
    assert(data?.ok === true && Array.isArray(data?.mails), 'no-save mail list payload is incomplete')
    noSaveRewardMailId = String(data.mails.find(item => item?.can_claim === true)?.id || '')
    assert(noSaveRewardMailId, 'no-save reward mail was not delivered to mailbox list')
  })

  await runCheck('POST /api/taoyuan/mail/:id/claim no-save failure rollback', async () => {
    const { response, data } = await fetchSessionJson(tertiarySessionState, `/api/taoyuan/mail/${encodeURIComponent(noSaveRewardMailId)}/claim`, {
      method: 'POST',
    })
    assert(!response.ok, 'reward mail claim should fail without server save')
    assert(data?.ok === false, 'reward mail failure should return ok=false')

    const detail = await fetchSessionJson(tertiarySessionState, `/api/taoyuan/mail/${encodeURIComponent(noSaveRewardMailId)}`)
    assert(detail.response.ok, 'failed claim mail detail could not be reloaded')
    assert(!detail.data?.mail?.claimed_at, 'failed claim should not set claimed_at')
    assert(!detail.data?.mail?.claim_result, 'failed claim should not persist claim_result')
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id owner cleanup', async () => {
    assert(createdReplyId, 'reply creation did not complete before cleanup')
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(createdPostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `hall post delete returned ${response.status}`)
    assert(data?.ok === true, 'hall post delete payload is incomplete')
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id failed payout cleanup', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(noSaveRewardPostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `failed payout post delete returned ${response.status}`)
    assert(data?.ok === true && data?.refunded === true, 'failed payout cleanup should refund outstanding reward')
  })

  console.log('[qa-online-smoke] OK')
  for (const check of checks) {
    console.log(`- ${check}`)
  }
  process.exitCode = 0
} catch (error) {
  console.error('[qa-online-smoke] FAILED')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await stopServer()
  const deletedUsernames = await cleanupSmokeUsers()
  if (Array.isArray(deletedUsernames) && deletedUsernames.length > 0) {
    console.log(`[qa-online-smoke] cleaned test users: ${deletedUsernames.join(', ')}`)
  }
  await cleanupSmokeArtifacts()
  process.exit(process.exitCode ?? 0)
}
