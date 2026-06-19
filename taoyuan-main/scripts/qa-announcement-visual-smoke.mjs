/* global console, fetch, process, setTimeout */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'

const frontendRoot = path.resolve(import.meta.dirname, '..')
const projectRoot = path.resolve(frontendRoot, '..')
const serverRoot = path.join(projectRoot, 'server')
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taoyuan-announcement-visual-'))
const outputDir = path.join(frontendRoot, 'output', 'playwright')
const processes = []

function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function findPort(start) {
  for (let port = start; port < start + 80; port += 1) {
    if (await canListen(port)) return port
  }
  throw new Error(`no available port from ${start}`)
}

async function waitForHttp(url, timeoutMs = 90_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Retry until the server is ready or the timeout expires.
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function stopProcessTree(child) {
  if (!child || child.killed) return Promise.resolve()
  return new Promise(resolve => {
    child.once('exit', () => resolve())
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      killer.once('exit', () => resolve())
      killer.once('error', () => {
        try {
          child.kill()
        } catch {
          // The child may already be gone after taskkill fails.
        }
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

async function writeAnnouncementStore() {
  const now = Math.floor(Date.now() / 1000)
  await fs.writeFile(
    path.join(tempDir, 'taoyuan_announcements.json'),
    JSON.stringify({
      announcements: [
        {
          id: 'ann_visual_001',
          title: '桃源乡 3.0.0 更新公告',
          body: '## 本次更新\n- 新增更新公告弹窗\n- 支持 Markdown / 富文本预览\n- 移动端按钮会自动换行',
          image_url: '',
          version: '3.0.0',
          target_versions: ['3.0.0'],
          target_channels: ['web'],
          start_at: now - 60,
          end_at: now + 3600,
          priority: 20,
          status: 'published',
          cta_text: '查看详情',
          cta_url: '/game/farm',
          button_texts: {
            close: '知道了',
            suppress: '本条不再提示',
            cta: '查看详情',
          },
          template_type: 'version_update',
          is_pinned: true,
          rewards: [{ type: 'money', amount: 120 }],
          duplicate_compensation_money: 0,
          created_at: now - 120,
          updated_at: now - 120,
          published_at: now - 120,
          offline_at: null,
          operator_name: 'qa',
          operator_role: 'admin',
        },
        {
          id: 'ann_visual_002',
          title: 'QA secondary announcement',
          body: '## More news\n- This announcement should be collapsed by default.\n- Players can expand it manually.',
          image_url: '',
          version: '3.0.0',
          target_versions: ['3.0.0'],
          target_channels: ['web'],
          start_at: now - 60,
          end_at: now + 3600,
          priority: 10,
          status: 'published',
          cta_text: 'Details',
          cta_url: '/game/farm',
          button_texts: {
            close: 'OK',
            suppress: 'Do not show again',
            cta: 'Details',
          },
          template_type: 'hotfix',
          is_pinned: false,
          rewards: [],
          duplicate_compensation_money: 0,
          created_at: now - 180,
          updated_at: now - 180,
          published_at: now - 180,
          offline_at: null,
          operator_name: 'qa',
          operator_role: 'admin',
        },
      ],
      events: [],
    }, null, 2),
    'utf8',
  )
}

function spawnLogged(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.output = ''
  child.stdout.on('data', chunk => { child.output += String(chunk) })
  child.stderr.on('data', chunk => { child.output += String(chunk) })
  processes.push(child)
  return child
}

function createChildEnv(overrides = {}) {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!key || key.startsWith('=') || value === undefined) continue
    env[key] = value
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (!key || key.startsWith('=') || value === undefined) continue
    env[key] = String(value)
  }
  return env
}

async function startServers(serverPort, frontendPort) {
  await writeAnnouncementStore()
  spawnLogged(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: createChildEnv({
      PORT: String(serverPort),
      DB_STORAGE: path.join(tempDir, 'users.json'),
      QA_ONLINE_SMOKE_FORCE_LOCAL: 'true',
      MYSQL_HOST: '',
      MYSQL_USER: '',
      MYSQL_DATABASE: '',
      SECRET_KEY: 'qa_announcement_visual_secret',
    }),
  })
  await waitForHttp(`http://127.0.0.1:${serverPort}/api/health`)

  spawnLogged(process.execPath, [
    path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    String(frontendPort),
    '--strictPort',
  ], {
    cwd: frontendRoot,
    env: createChildEnv(),
  })
  await waitForHttp(`http://127.0.0.1:${frontendPort}/`)
  return frontendPort
}

async function selectLocalStorageMode(page) {
  await page.getByRole('button', { name: '本地存储' }).first().click()
}

async function gotoWithRetry(page, url, label, attempts = 3) {
  const errors = []
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await waitForHttp(url, 30_000)
      await page.goto('about:blank', { waitUntil: 'load', timeout: 10_000 }).catch(() => {})
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      return
    } catch (error) {
      errors.push(`attempt ${attempt}/${attempts}: ${error.message || error}`)
      if (attempt < attempts) await page.waitForTimeout(1_500 * attempt)
    }
  }
  throw new Error(`${label} failed to open ${url}\n${errors.join('\n')}`)
}

async function verifyPopup(page, viewport, name, frontendPort) {
  await gotoWithRetry(page, `http://127.0.0.1:${frontendPort}/`, `${name} popup root`)
  await page.getByTestId('new-journey-button').waitFor({ state: 'visible', timeout: 60_000 })
  await selectLocalStorageMode(page)
  await page.getByTestId('new-journey-button').click()
  await page.getByTestId('privacy-agree-button').click()
  await page.getByTestId('char-name-input').fill('阿桃')
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
  await page.getByTestId('announcement-dialog').waitFor({ state: 'visible', timeout: 25_000 })

  const panelBox = await page.locator('.announcement-panel').boundingBox()
  assert(panelBox, `${name} announcement panel should render`)
  assert(panelBox.width <= viewport.width + 1, `${name} panel should fit viewport width`)
  assert(panelBox.height <= viewport.height + 1, `${name} panel should fit viewport height`)

  const popupItems = page.getByTestId('announcement-popup-item')
  assert.equal(await popupItems.count(), 2, `${name} should render one batched popup with two announcement items`)
  await assert.match(
    await popupItems.first().getAttribute('class'),
    /announcement-item--pinned/,
    `${name} first popup announcement should be highlighted as pinned`,
  )
  assert.equal(await popupItems.first().locator('.announcement-chip--pinned').innerText(), '置顶', `${name} first popup announcement should show pinned chip`)
  const expandedStates = await page.locator('.announcement-summary').evaluateAll(nodes => (
    nodes.map(node => node.getAttribute('aria-expanded'))
  ))
  assert.deepEqual(expandedStates, ['true', 'false'], `${name} should expand only the first popup announcement by default`)
  await popupItems.nth(1).locator('.announcement-summary').click()
  assert.equal(await popupItems.nth(1).locator('.announcement-summary').getAttribute('aria-expanded'), 'true', `${name} second popup announcement should be expandable`)

  const buttons = await page.locator('.announcement-actions button').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect()
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
  }))
  assert.equal(buttons.length, 2, `${name} should render two persistent announcement action buttons`)
  await assert.match(
    await page.locator('.announcement-actions button').first().innerText(),
    /知道了/,
    `${name} local reward popup should use acknowledgement primary button text`,
  )
  for (const button of buttons) {
    assert(button.width > 20 && button.height > 20, `${name} button should have stable size`)
    assert(button.left >= -1 && button.right <= viewport.width + 1, `${name} button should stay inside viewport`)
  }
  for (let i = 0; i < buttons.length; i += 1) {
    for (let j = i + 1; j < buttons.length; j += 1) {
      const a = buttons[i]
      const b = buttons[j]
      const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      assert(overlapX * overlapY < 1, `${name} buttons should not overlap`)
    }
  }
  await page.screenshot({ path: path.join(outputDir, `announcement-popup-${name}.png`), fullPage: false })
}

async function verifyHistory(page, viewport, name, frontendPort) {
  await gotoWithRetry(page, `http://127.0.0.1:${frontendPort}/`, `${name} history root`)
  await page.getByTestId('main-menu-announcements').waitFor({ state: 'visible', timeout: 60_000 })
  await page.getByTestId('main-menu-announcements').click()
  await page.getByTestId('announcement-history-dialog').waitFor({ state: 'visible', timeout: 25_000 })
  await page.getByTestId('announcement-history-item').first().waitFor({ state: 'visible', timeout: 25_000 })
  const firstHistoryItem = page.getByTestId('announcement-history-item').first()
  await assert.match(
    await firstHistoryItem.getAttribute('class'),
    /announcement-history-item--pinned/,
    `${name} first history announcement should be highlighted as pinned`,
  )
  assert.equal(await firstHistoryItem.locator('.announcement-chip--pinned').innerText(), '置顶', `${name} first history announcement should show pinned chip`)
  const box = await page.locator('.announcement-history').boundingBox()
  assert(box, `${name} history panel should render`)
  assert(box.width <= viewport.width + 1, `${name} history panel should fit viewport width`)
  assert(box.height <= viewport.height + 1, `${name} history panel should fit viewport height`)
  await page.screenshot({ path: path.join(outputDir, `announcement-history-${name}.png`), fullPage: false })
}

async function verifyOrdinaryPopup(page, name, frontendPort) {
  const now = Math.floor(Date.now() / 1000)
  await page.route('**/api/taoyuan/announcements/active?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        announcements: [{
          id: `ann_ordinary_${name}`,
          title: '普通补偿说明',
          body: '## 补偿说明\n- 这条普通公告不要求保存并更新。',
          image_url: '',
          version: '3.0.0',
          target_versions: ['3.0.0'],
          target_channels: ['web'],
          start_at: now - 60,
          end_at: now + 3600,
          priority: 5,
          status: 'published',
          cta_text: '',
          cta_url: '',
          button_texts: {
            close: '知道了',
            suppress: '本条不再提示',
            cta: '查看详情',
          },
          template_type: 'compensation',
          show_save_update_button: false,
          rewards: [],
          duplicate_compensation_money: 0,
          created_at: now - 120,
          updated_at: now - 120,
          published_at: now - 120,
        }],
      }),
    })
  })

  await gotoWithRetry(page, `http://127.0.0.1:${frontendPort}/`, `${name} ordinary popup root`)
  await page.getByTestId('new-journey-button').waitFor({ state: 'visible', timeout: 60_000 })
  await selectLocalStorageMode(page)
  await page.getByTestId('new-journey-button').click()
  await page.getByTestId('privacy-agree-button').click()
  await page.getByTestId('char-name-input').fill('阿桃')
  await page.getByTestId('char-create-next-button').click()
  await page.getByTestId('farm-option-standard').click()
  await page.getByTestId('confirm-start-journey-button').click()
  await page.getByTestId('announcement-dialog').waitFor({ state: 'visible', timeout: 25_000 })

  const buttons = await page.locator('.announcement-actions button').evaluateAll(nodes => nodes.map(node => node.textContent?.trim() || ''))
  assert.deepEqual(buttons, ['知道了'], `${name} ordinary popup should only render acknowledgement button`)
  assert.equal(await page.locator('.announcement-button-update').count(), 0, `${name} ordinary popup should not render save-update button`)
}

async function launchBrowser() {
  const errors = []
  for (const options of [
    { headless: true },
    { channel: 'msedge', headless: true },
    { channel: 'chrome', headless: true },
  ]) {
    try {
      return await chromium.launch(options)
    } catch (error) {
      errors.push(`${options.channel || 'bundled chromium'}: ${error.message || error}`)
    }
  }
  throw new Error(`Unable to launch a Playwright browser:\n${errors.join('\n')}`)
}

async function runBrowserChecks(frontendPort) {
  await fs.mkdir(outputDir, { recursive: true })
  const browser = await launchBrowser()
  try {
    for (const [name, viewport] of [
      ['desktop', { width: 1366, height: 768 }],
      ['mobile-390', { width: 390, height: 844 }],
    ]) {
      const popupContext = await browser.newContext({ viewport })
      const popupPage = await popupContext.newPage()
      await verifyPopup(popupPage, viewport, name, frontendPort)
      await popupContext.close()

      const historyContext = await browser.newContext({ viewport })
      const historyPage = await historyContext.newPage()
      await verifyHistory(historyPage, viewport, name, frontendPort)
      await historyContext.close()

      const ordinaryContext = await browser.newContext({ viewport })
      const ordinaryPage = await ordinaryContext.newPage()
      await verifyOrdinaryPopup(ordinaryPage, name, frontendPort)
      await ordinaryContext.close()
    }
  } finally {
    await browser.close()
  }
}

try {
  if (!(await canListen(4013))) {
    throw new Error('Port 4013 is required by vite.config.ts proxy and is already in use')
  }
  const serverPort = 4013
  const frontendPort = await startServers(serverPort, await findPort(4183))
  await runBrowserChecks(frontendPort)
  console.log('qa-announcement-visual-smoke passed')
} catch (error) {
  console.error('[qa-announcement-visual-smoke] FAILED')
  for (const child of processes) {
    if (child.output) console.error(child.output.slice(-4000))
  }
  throw error
} finally {
  await Promise.all(processes.map(stopProcessTree))
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
}
