import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
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
  })

  await runCheck('GET /api/taoyuan/save/:slot coop reward persistence', async () => {
    const { response, data } = await fetchSessionJson(secondarySessionState, '/api/taoyuan/save/0')
    assert(response.ok, `coop reward save read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'coop reward save read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === 380, `coop order reward did not persist to second user save, current money=${decrypted?.player?.money}`)
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
    assert(Number(decrypted?.player?.money) === 480, `best reply payout did not persist to second user save, current money=${decrypted?.player?.money}`)
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
    refundablePostId = String(data.post.id)
  })

  await runCheck('DELETE /api/taoyuan/hall/posts/:id refund path', async () => {
    const { response, data } = await fetchAuthedJson(`/api/taoyuan/hall/posts/${encodeURIComponent(refundablePostId)}`, {
      method: 'DELETE',
    })
    assert(response.ok, `hall refund delete returned ${response.status}`)
    assert(data?.ok === true && data?.refunded === true, 'hall refund delete payload is incomplete')
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
  })

  await runCheck('GET /api/taoyuan/save/:slot reward persistence', async () => {
    const { response, data } = await fetchAuthedJson('/api/taoyuan/save/0')
    assert(response.ok, `save slot read returned ${response.status}`)
    assert(data?.ok === true && typeof data?.raw === 'string', 'save slot read payload is incomplete')
    const decrypted = decryptTaoyuanRaw(data.raw)
    assert(Number(decrypted?.player?.money) === 1421, `reward payout / refund chain did not persist to primary save slot, current money=${decrypted?.player?.money}`)
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
