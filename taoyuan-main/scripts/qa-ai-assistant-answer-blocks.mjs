import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const rootDir = path.resolve(import.meta.dirname, '..');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const typesFile = path.join(rootDir, 'src', 'types', 'aiAssistant.ts');
const appCssFile = path.join(rootDir, 'src', 'app.css');
const packageFile = path.join(rootDir, 'package.json');
const screenshotFile = path.join(os.tmpdir(), 'taoyuan-ai-assistant-answer-blocks-mobile.png');

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
const typesSource = fs.readFileSync(typesFile, 'utf8');
const appCssSource = fs.readFileSync(appCssFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

assert.match(typesSource, /export type AiAssistantAnswerBlockKind/, 'types should define answer block kind');
assert.match(typesSource, /export interface AiAssistantAnswerBlock/, 'types should define answer block interface');
assert.match(typesSource, /\|\s*'summary'/, 'answer blocks should include summary kind');
assert.match(typesSource, /\|\s*'steps'/, 'answer blocks should include steps kind');
assert.match(typesSource, /\|\s*'risk'/, 'answer blocks should include risk kind');
assert.match(typesSource, /\|\s*'fallback'/, 'answer blocks should include fallback kind');
assert.match(typesSource, /\|\s*'uncertainty'/, 'answer blocks should include uncertainty kind');
assert.match(typesSource, /\|\s*'sources'/, 'answer blocks should include sources kind');

assert.match(widgetSource, /data-testid="ai-answer-blocks"/, 'widget should render answer block container');
assert.match(widgetSource, /`ai-answer-block-\$\{block\.kind\}`/, 'widget should expose per-kind answer block test ids');
assert.match(widgetSource, /data-testid="ai-answer-long-details"/, 'widget should fold long answers');
assert.match(widgetSource, /data-testid="ai-copy-answer-block"/, 'widget should expose answer block copy controls');
assert.match(widgetSource, /copyAnswerBlock/, 'widget should implement answer block copy');
assert.match(widgetSource, /ANSWER_LONG_CHAR_LIMIT/, 'widget should define a long answer character threshold');
assert.match(widgetSource, /ANSWER_LONG_LINE_LIMIT/, 'widget should define a long answer line threshold');
assert.match(widgetSource, /extractLabeledSection/, 'widget should parse labelled answer sections');
assert.match(widgetSource, /getRiskAnswerSummary/, 'widget should build risk or strict-mode notice content');
assert.match(widgetSource, /getPublicSourceLabel/, 'widget should sanitize public source labels');
assert.match(widgetSource, /sensitiveSourcePathRe/, 'widget should avoid exposing source-like paths to normal players');
assert.match(widgetSource, /message\.provider !== 'model' && message\.traceSummary\?\.evidenceCount === 0/, 'model answers should not render empty local-source blocks');
assert.match(widgetSource, /store\.isAdmin && message\.trace/, 'full debug trace should stay admin-only');
assert.doesNotMatch(widgetSource, /item\.path/, 'player-facing evidence rendering should not read raw evidence path');

assert.match(widgetSource, /\.ai-answer-block--summary/, 'summary block should have a distinct style');
assert.match(widgetSource, /\.ai-answer-block--steps/, 'steps block should have a distinct style');
assert.match(widgetSource, /\.ai-answer-block--risk/, 'risk block should have a distinct style');
assert.match(widgetSource, /\.ai-answer-block--fallback/, 'fallback block should have a distinct style');
assert.match(widgetSource, /\.ai-answer-block--uncertainty/, 'uncertainty block should have a distinct style');
assert.match(widgetSource, /\.ai-answer-block--sources/, 'sources block should have a distinct style');
assert.match(widgetSource, /\.ai-msg__full-answer summary/, 'long answer details summary should be styled');
assert.match(appCssSource, /--ai-assistant-info-border:/, 'global CSS should define assistant info border token');
assert.match(appCssSource, /--ai-assistant-risk-border:/, 'global CSS should define assistant risk border token');
assert.match(appCssSource, /--ai-assistant-warn-border:/, 'global CSS should define assistant warning border token');
assert.equal(
  packageJson.scripts?.['qa:ai-assistant-answer-blocks'],
  'node scripts/qa-ai-assistant-answer-blocks.mjs',
  'package.json should register qa:ai-assistant-answer-blocks',
);

const styleMatch = widgetSource.match(/<style scoped>([\s\S]*?)<\/style>/);
assert.ok(styleMatch?.[1], 'widget should keep scoped styles for answer blocks');
const widgetCss = styleMatch[1].replace(/:deep\(([^()]+)\)/g, '$1');

const fiveSampleBlocks = [
  ['summary', '结论', '今天先完成任务缺口，再处理库存和换季准备。'],
  ['steps', '关键步骤', '1. 打开任务页确认缺口。\n2. 整理库存。\n3. 标记今日目标。'],
  ['risk', '风险与注意', '严格模式下不会读取源码、后台规则或密钥，也不会修改存档。'],
  ['fallback', 'fallback 提示', '远程模型不可用或结果未通过校验时，当前回答已降级为本地知识库兜底。'],
  ['uncertainty', '不确定性', '- 当前资料不足以确认活动倒计时。\n- 请以页面实时状态为准。'],
  ['sources', '来源依据', '- 内置知识库 / 任务 / 已截断\n- 已校验资料 / 内置规则'],
];

let browser;
try {
  try {
    browser = await chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !message.includes('Executable doesn\'t exist') &&
      !message.includes('Invalid file descriptor to ICU data received')
    ) {
      throw error;
    }
    console.warn('qa-ai-assistant-answer-blocks: bundled Chromium unavailable, falling back to system Chrome');
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });

  const blockHtml = fiveSampleBlocks.map(([kind, title, content]) => `
    <section class="ai-answer-block ai-answer-block--${kind}" data-testid="ai-answer-block-${kind}">
      <div class="ai-answer-block__header">
        <span class="ai-answer-block__title">${title}</span>
        <button type="button" class="ai-answer-block__copy" data-testid="ai-copy-answer-block">复制</button>
      </div>
      <div class="ai-answer-block__body ai-msg__markdown"><p>${content.replace(/\n/g, '<br>')}</p></div>
    </section>
  `).join('');

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
            --ai-assistant-info-border: rgba(120, 190, 255, 0.28);
            --ai-assistant-risk-border: rgba(255, 137, 137, 0.38);
            --ai-assistant-warn-border: rgba(248, 209, 122, 0.42);
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
                <div class="ai-msg__answer ai-msg__answer--long">
                  <div class="ai-msg__answer-blocks" data-testid="ai-answer-blocks">${blockHtml}</div>
                  <details class="ai-msg__full-answer" data-testid="ai-answer-long-details">
                    <summary><span>展开完整回答</span><span>860 字 / 14 行</span></summary>
                    <div class="ai-msg__markdown" data-testid="ai-answer-full-markdown">
                      <p>这里是完整长回答。server/src/taoyuanAiAssistant.js 只应在管理员 trace 中出现，不应在玩家来源块里出现。</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </section>
      </body>
    </html>
  `);

  for (const [kind] of fiveSampleBlocks) {
    await page.getByTestId(`ai-answer-block-${kind}`).waitFor({ state: 'visible' });
  }
  assert.equal(await page.getByTestId('ai-copy-answer-block').count(), fiveSampleBlocks.length, 'every sample block should expose copy control');
  assert.equal(await page.getByTestId('ai-answer-long-details').count(), 1, 'long answer details should render once');

  const blockText = await page.getByTestId('ai-answer-blocks').innerText();
  assert.doesNotMatch(blockText, /server\/src|taoyuan-main\/src|\.vue|\.ts/, 'player-facing blocks should not expose raw source paths');

  const overflow = await page.evaluate(() => {
    const bubble = document.querySelector('.ai-msg__bubble');
    const blocks = document.querySelector('.ai-msg__answer-blocks');
    const details = document.querySelector('.ai-msg__full-answer');
    if (!bubble || !blocks || !details) throw new Error('missing answer block layout nodes');
    return {
      bubbleClientWidth: bubble.clientWidth,
      bubbleScrollWidth: bubble.scrollWidth,
      blocksClientWidth: blocks.clientWidth,
      blocksScrollWidth: blocks.scrollWidth,
      detailsClientWidth: details.clientWidth,
      detailsScrollWidth: details.scrollWidth,
    };
  });

  assert.ok(overflow.bubbleScrollWidth <= overflow.bubbleClientWidth + 1, `answer bubble should not overflow: ${JSON.stringify(overflow)}`);
  assert.ok(overflow.blocksScrollWidth <= overflow.blocksClientWidth + 1, `answer blocks should not overflow: ${JSON.stringify(overflow)}`);
  assert.ok(overflow.detailsScrollWidth <= overflow.detailsClientWidth + 1, `long answer details should not overflow: ${JSON.stringify(overflow)}`);

  await page.screenshot({ path: screenshotFile, fullPage: true });
  console.log(`qa-ai-assistant-answer-blocks passed; mobile screenshot: ${screenshotFile}`);
} finally {
  if (browser) await browser.close();
}
