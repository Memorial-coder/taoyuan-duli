import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { build } from 'esbuild'

const rootDir = path.resolve(import.meta.dirname, '..')
const markdownFile = path.join(rootDir, 'src', 'utils', 'safeMarkdown.ts')
const appCssFile = path.join(rootDir, 'src', 'app.css')
const packageFile = path.join(rootDir, 'package.json')
const dialogFile = path.join(rootDir, 'src', 'components', 'game', 'AnnouncementDialog.vue')
const historyFile = path.join(rootDir, 'src', 'components', 'game', 'AnnouncementHistoryDialog.vue')
const adminPanelFile = path.join(rootDir, 'src', 'components', 'game', 'AdminAnnouncementPanel.vue')
const mainMenuFile = path.join(rootDir, 'src', 'views', 'MainMenu.vue')
const homepageAboutPanelFile = path.join(rootDir, 'src', 'components', 'game', 'AdminHomepageAboutPanel.vue')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-announcement-markdown-'))
const bundledFile = path.join(tmpDir, 'safeMarkdown.browser.js')

const markdownSource = fs.readFileSync(markdownFile, 'utf8')
const appCssSource = fs.readFileSync(appCssFile, 'utf8')
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
const dialogSource = fs.readFileSync(dialogFile, 'utf8')
const historySource = fs.readFileSync(historyFile, 'utf8')
const adminPanelSource = fs.readFileSync(adminPanelFile, 'utf8')
const mainMenuSource = fs.readFileSync(mainMenuFile, 'utf8')
const homepageAboutPanelSource = fs.readFileSync(homepageAboutPanelFile, 'utf8')

let browser

try {
  assert.match(markdownSource, /from 'marked'/, 'announcement rich markdown should use marked')
  assert.match(markdownSource, /marked\.parse/, 'renderRichContent should parse GitHub-flavored markdown')
  assert.match(markdownSource, /sanitizeHtmlFragmentByMode\(rendered, 'rich'\)/, 'marked output should still be sanitized')
  assert.ok(packageJson.dependencies?.marked, 'marked should be listed as a dependency')
  assert.match(appCssSource, /\.taoyuan-rich-markdown/, 'global rich markdown styles should exist')
  assert.match(dialogSource, /taoyuan-rich-markdown/, 'player popup should use rich markdown styles')
  assert.match(historySource, /taoyuan-rich-markdown/, 'history dialog should use rich markdown styles')
  assert.match(adminPanelSource, /taoyuan-rich-markdown/, 'admin preview should use rich markdown styles')
  assert.match(mainMenuSource, /main-menu-about-markdown taoyuan-rich-markdown/, 'home page about dialog should use rich markdown styles')
  assert.match(homepageAboutPanelSource, /admin-markdown-preview taoyuan-rich-markdown/, 'home page about admin preview should use rich markdown styles')
  assert.match(homepageAboutPanelSource, /任务列表、表格、引用、分割线、代码块、删除线、脚注/, 'home page about admin copy should advertise README-style markdown')

  await build({
    entryPoints: [markdownFile],
    outfile: bundledFile,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'TaoyuanMarkdown',
    logLevel: 'silent',
  })

  browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  })
  await page.addScriptTag({ path: bundledFile })

  const sampleMarkdown = [
    '# 3.1.0 更新公告',
    '',
    '> [!NOTE]',
    '> 这是一个 GitHub README 风格提示。',
    '',
    '- [x] 已领取补偿',
    '- [ ] 进入新区域',
    '',
    '1. 保存存档',
    '2. 点击 **知道并领取**，然后查看 ~~旧入口~~ 新入口。',
    '',
    '奖励会按账号去重发放[^reward]。',
    '',
    '| 功能 | 说明 | 状态 |',
    '| --- | :---: | ---: |',
    '| 实时推送 | 在线玩家立即看到公告 | 已上线 |',
    '| 很长很长很长很长很长很长的字段 | 表格应该横向滚动而不是撑破手机弹窗 | 观察中 |',
    '',
    '---',
    '',
    '```ts',
    "const route = '/game/save'",
    "const unsafe = '<script>alert(1)</script>'",
    '```',
    '',
    '[站内链接](/game/farm) https://example.com/guide',
    '',
    '<details open><summary>展开更多</summary><mark>重点</mark> <kbd>Ctrl</kbd> + <kbd>S</kbd></details>',
    '',
    '[^reward]: 同一账号重复打开公告不会重复发奖。',
    '',
    '<script>alert(1)</script>',
    '<iframe src="https://example.com"></iframe>',
    '<button onclick="alert(1)">bad</button>',
    '<img src="javascript:alert(1)" onerror="alert(1)">',
  ].join('\n')

  const html = await page.evaluate(markdown => window.TaoyuanMarkdown.renderRichContent(markdown), sampleMarkdown)

  assert.match(html, /<h1>3\.1\.0 更新公告<\/h1>/, 'heading should render')
  assert.match(html, /<blockquote>/, 'blockquote should render')
  assert.match(html, /type="checkbox"/, 'task list checkboxes should render')
  assert.match(html, /checked="checked"/, 'checked task list state should be preserved')
  assert.match(html, /<strong>知道并领取<\/strong>/, 'bold text should render')
  assert.match(html, /<del>旧入口<\/del>/, 'strikethrough should render')
  assert.match(html, /class="footnote-ref"/, 'footnote references should render')
  assert.match(html, /class="footnotes"/, 'footnote definitions should render')
  assert.match(html, /同一账号重复打开公告不会重复发奖/, 'footnote content should render')
  assert.match(html, /<table>/, 'markdown table should render')
  assert.match(html, /align="center"/, 'table alignment should be preserved')
  assert.match(html, /<hr>/, 'horizontal rule should render')
  assert.match(html, /<pre><code class="language-ts">/, 'fenced code block language should render')
  assert.match(html, /href="\/game\/farm"/, 'internal links should remain')
  assert.match(html, /href="https:\/\/example\.com\/guide"/, 'autolinks should render')
  assert.match(html, /<details open="open">/, 'safe rich HTML details should render')
  assert.match(html, /<summary>展开更多<\/summary>/, 'safe rich HTML summary should render')
  assert.match(html, /<kbd>Ctrl<\/kbd>/, 'safe rich HTML kbd should render')
  assert.doesNotMatch(html, /<script/i, 'script tags should be removed')
  assert.doesNotMatch(html, /<iframe/i, 'iframe tags should be removed')
  assert.doesNotMatch(html, /<button/i, 'button tags should be removed')
  assert.doesNotMatch(html, /javascript:/i, 'javascript URLs should be removed')
  assert.doesNotMatch(html, /onerror/i, 'event handler attributes should be removed')

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <style>
          :root {
            --color-bg: 26 26 26;
            --color-panel: 43 45 60;
            --color-text: 232 228 217;
            --color-accent-rgb: 200 164 92;
            --color-highlight-rgb: 240 207 131;
            --color-muted-rgb: 156 163 175;
            --font-game: Arial, sans-serif;
          }
          * { box-sizing: border-box; }
          body { margin: 0; background: #111; color: rgb(var(--color-text)); font-family: Arial, sans-serif; }
          .announcement-shell {
            width: 390px;
            padding: 12px;
          }
          .announcement-rich {
            width: 100%;
            max-width: 100%;
            border: 1px solid rgba(200, 164, 92, 0.16);
            border-radius: 6px;
            background: rgb(var(--color-panel));
            color: rgb(var(--color-text));
            font-size: 13px;
            line-height: 1.75;
            padding: 12px;
          }
          ${appCssSource}
        </style>
      </head>
      <body>
        <section class="announcement-shell">
          <article class="announcement-rich taoyuan-rich-markdown">${html}</article>
        </section>
      </body>
    </html>
  `)

  const layout = await page.evaluate(() => {
    const shell = document.querySelector('.announcement-shell')
    const rich = document.querySelector('.announcement-rich')
    const table = document.querySelector('table')
    const pre = document.querySelector('pre')
    return {
      bodyScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      richScrollWidth: rich?.scrollWidth || 0,
      richClientWidth: rich?.clientWidth || 0,
      tableScrollWidth: table?.scrollWidth || 0,
      tableClientWidth: table?.clientWidth || 0,
      preScrollWidth: pre?.scrollWidth || 0,
      preClientWidth: pre?.clientWidth || 0,
      shellWidth: shell?.clientWidth || 0,
    }
  })

  assert.ok(layout.shellWidth <= 390, 'mobile shell should fit viewport')
  assert.ok(layout.bodyScrollWidth <= layout.viewportWidth + 1, 'rich markdown should not create body-level horizontal overflow')
  assert.ok(layout.richScrollWidth <= layout.richClientWidth + 1, 'rich markdown container should not overflow horizontally')
  assert.ok(layout.tableScrollWidth >= layout.tableClientWidth, 'wide tables should stay scrollable inside their own box')
  assert.ok(layout.preScrollWidth >= layout.preClientWidth, 'code blocks should stay contained inside their own box')

  console.log('qa-announcement-markdown-rendering passed')
} finally {
  if (browser) await browser.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}
