import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const markdownFile = path.join(rootDir, 'src', 'utils', 'safeMarkdown.ts');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const appCssFile = path.join(rootDir, 'src', 'app.css');
const packageFile = path.join(rootDir, 'package.json');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taoyuan-ai-markdown-'));
const bundledFile = path.join(tmpDir, 'safeMarkdown.mjs');
const screenshotFile = path.join(os.tmpdir(), 'taoyuan-ai-assistant-markdown-mobile.png');

const markdownSource = fs.readFileSync(markdownFile, 'utf8');
const widgetSource = fs.readFileSync(widgetFile, 'utf8');
const appCssSource = fs.readFileSync(appCssFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

let browser;

try {
  await build({
    entryPoints: [markdownFile],
    outfile: bundledFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });

  const { renderSafeMarkdown } = await import(pathToFileURL(bundledFile).href);
  const sampleMarkdown = [
    '# 今日计划',
    '结论：先核对 `taoyuan-main/src/utils/safeMarkdown.ts`，再确认长路径 `server/src/taoyuanAiAssistant.js` 不会撑破气泡。',
    '',
    '| 资源 | 推荐地点 | 注意事项 |',
    '| --- | :---: | ---: |',
    '| 铜矿石与很长很长的说明文字 | 矿洞 1-20 层 | 背包不足时先回家整理，避免把任务缺口和来源依据挤在一行里 |',
    '| 木材 | 农场边缘和村庄采集路线 | 换季前保留一组备用 |',
    '',
    '> 换季前先确认任务、库存和邮箱提示；公开问答不读取源码，也不会自动写入知识库。',
    '',
    '---',
    '',
    '```ts',
    "const path = 'server/src/taoyuanAiAssistant.js'",
    "const escaped = '<script>alert(1)</script>'",
    '```',
    '',
    '[危险链接](javascript:alert(1))',
    '![危险图片](data:text/html,<svg onload=alert(1)>)',
  ].join('\n');

  const html = renderSafeMarkdown(sampleMarkdown);
  assert.match(html, /<h1>今日计划<\/h1>/, 'safe markdown should render headings');
  assert.match(html, /class="ai-md-table-scroll"/, 'safe markdown should wrap tables in a scroll container');
  assert.match(html, /<table>/, 'safe markdown should render markdown tables');
  assert.match(html, /<blockquote>/, 'safe markdown should render blockquotes');
  assert.match(html, /<hr \/>/, 'safe markdown should render horizontal rules');
  assert.match(html, /class="ai-md-code-block"/, 'safe markdown should wrap code fences');
  assert.match(html, /data-ai-copy-code="1"/, 'code fences should expose a generated copy button');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, 'code fences should escape script-looking text');
  assert.doesNotMatch(html, /<script/i, 'safe markdown should not emit script tags');
  assert.doesNotMatch(html, /href="javascript/i, 'safe markdown should not emit javascript links');
  assert.doesNotMatch(html, /src="data:/i, 'safe markdown should not emit data image URLs');

  const trickyLinkHtml = renderSafeMarkdown('[bad](java\nscript:alert(1)) [ok](https://example.com/guide)');
  assert.doesNotMatch(trickyLinkHtml, /href="java/i, 'control-character javascript URLs should be rejected');
  assert.match(trickyLinkHtml, /href="https:\/\/example\.com\/guide"/, 'https URLs should remain linkable');

  const inlineCodeHtml = renderSafeMarkdown('`[link](https://example.com)` and `**bold**`');
  assert.match(inlineCodeHtml, /<code>\[link\]\(https:\/\/example\.com\)<\/code>/, 'inline code should not become a link');
  assert.match(inlineCodeHtml, /<code>\*\*bold\*\*<\/code>/, 'inline code should not parse emphasis');
  assert.doesNotMatch(inlineCodeHtml, /<code><a/i, 'inline code should not contain generated anchors');

  const rawButtonHtml = renderSafeMarkdown('<button onclick="alert(1)">x</button>');
  assert.doesNotMatch(rawButtonHtml, /<button/i, 'raw button HTML should not be emitted');
  assert.match(markdownSource, /name\.startsWith\('on'\)/, 'HTML sanitizer should drop event attributes');
  assert.match(markdownSource, /DROP_HTML_TAGS[\s\S]*'button'/, 'HTML sanitizer should drop raw button tags');
  assert.match(markdownSource, /hasUnsafeUrlCharacter/, 'URL sanitizer should reject control-character URL tricks');
  assert.match(markdownSource, /TABLE_SEPARATOR_CELL_RE/, 'markdown renderer should parse table separators explicitly');

  assert.match(widgetSource, /@click="handleMarkdownClick"/, 'widget should delegate generated markdown copy clicks');
  assert.match(widgetSource, /copyDebugTrace/, 'admin debug trace should have a copy path');
  assert.match(widgetSource, /\.ai-msg__markdown\s*:deep\(\.ai-md-table-scroll\)[\s\S]*overflow-x:\s*auto/, 'markdown tables should scroll horizontally');
  assert.match(widgetSource, /\.ai-msg__markdown\s*:deep\(pre\)[\s\S]*white-space:\s*pre-wrap/, 'markdown code blocks should wrap long paths');
  assert.match(widgetSource, /\.ai-msg__markdown\s*:deep\(img\)[\s\S]*max-width:\s*100%/, 'markdown images should be constrained');
  assert.match(widgetSource, /\.ai-msg__markdown\s*:deep\(hr\)/, 'markdown horizontal rules should be styled');
  assert.match(appCssSource, /--ai-assistant-markdown-border:/, 'global CSS should define markdown border token');
  assert.match(appCssSource, /--ai-assistant-markdown-soft-bg:/, 'global CSS should define markdown soft background token');
  assert.equal(
    packageJson.scripts?.['qa:ai-assistant-markdown-safety'],
    'node scripts/qa-ai-assistant-markdown-safety.mjs',
    'package.json should register qa:ai-assistant-markdown-safety',
  );

  const styleMatch = widgetSource.match(/<style scoped>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch?.[1], 'widget should keep scoped styles for markdown rendering');
  const widgetCss = styleMatch[1].replace(/:deep\(([^()]+)\)/g, '$1');

  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <style>
          :root {
            --color-panel: 31 28 23;
            --color-text: 238 230 208;
            --color-accent: #f8d17a;
            --spacing-3: 12px;
            --ai-assistant-touch-target: 44px;
            --ai-assistant-mobile-edge: 8px;
            --ai-assistant-markdown-border: rgba(200, 164, 92, 0.18);
            --ai-assistant-markdown-soft-bg: rgba(255, 255, 255, 0.04);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #111;
            color: rgb(var(--color-text));
            font-family: Arial, sans-serif;
          }
          .ai-panel {
            width: 390px;
            min-height: 100vh;
            padding: 12px;
            background: rgb(var(--color-panel));
          }
          ${widgetCss}
        </style>
      </head>
      <body>
        <section class="ai-panel">
          <div class="ai-panel__messages">
            <div class="ai-msg ai-msg--assistant">
              <div class="ai-msg__bubble">
                <div class="ai-msg__markdown">${html}</div>
              </div>
            </div>
          </div>
        </section>
      </body>
    </html>
  `);

  const overflow = await page.evaluate(() => {
    const bubble = document.querySelector('.ai-msg__bubble');
    const markdown = document.querySelector('.ai-msg__markdown');
    const tableScroll = document.querySelector('.ai-md-table-scroll');
    const codeBlock = document.querySelector('.ai-md-code-block');
    if (!bubble || !markdown || !tableScroll || !codeBlock) {
      throw new Error('missing rendered markdown sample nodes');
    }

    return {
      bubbleClientWidth: bubble.clientWidth,
      bubbleScrollWidth: bubble.scrollWidth,
      markdownClientWidth: markdown.clientWidth,
      markdownScrollWidth: markdown.scrollWidth,
      tableClientWidth: tableScroll.clientWidth,
      tableScrollWidth: tableScroll.scrollWidth,
      codeClientWidth: codeBlock.clientWidth,
      codeScrollWidth: codeBlock.scrollWidth,
    };
  });

  assert.ok(
    overflow.bubbleScrollWidth <= overflow.bubbleClientWidth + 1,
    `mobile bubble should not overflow: ${JSON.stringify(overflow)}`,
  );
  assert.ok(
    overflow.markdownScrollWidth <= overflow.markdownClientWidth + 1,
    `mobile markdown root should not overflow: ${JSON.stringify(overflow)}`,
  );
  assert.ok(
    overflow.codeScrollWidth <= overflow.codeClientWidth + 1,
    `mobile code wrapper should not overflow: ${JSON.stringify(overflow)}`,
  );
  assert.ok(
    overflow.tableScrollWidth > overflow.tableClientWidth,
    `wide markdown table should scroll inside its wrapper: ${JSON.stringify(overflow)}`,
  );

  await page.screenshot({ path: screenshotFile, fullPage: true });
  console.log(`qa-ai-assistant-markdown-safety passed; mobile screenshot: ${screenshotFile}`);
} finally {
  if (browser) await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
