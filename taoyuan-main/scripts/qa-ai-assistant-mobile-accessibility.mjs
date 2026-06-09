import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const widgetFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantWidget.vue');
const appCssFile = path.join(rootDir, 'src', 'app.css');
const packageFile = path.join(rootDir, 'package.json');

const widgetSource = fs.readFileSync(widgetFile, 'utf8');
const appCssSource = fs.readFileSync(appCssFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

assert.match(widgetSource, /ref="fabButton"/, 'FAB should keep a ref for focus restoration');
assert.match(widgetSource, /aria-label="打开桃源小助理面板"|:aria-label="store\.isOpen \? '关闭桃源小助理面板' : '打开桃源小助理面板'"/, 'FAB should expose an accessible label');
assert.match(widgetSource, /:aria-expanded="store\.isOpen"/, 'FAB should expose expanded state');
assert.match(widgetSource, /aria-controls="ai-assistant-panel"/, 'FAB should point to the assistant panel');

assert.match(widgetSource, /id="ai-assistant-panel"/, 'assistant panel should have a stable id');
assert.match(widgetSource, /role="dialog"/, 'assistant panel should use dialog semantics');
assert.match(widgetSource, /aria-labelledby="ai-assistant-title"/, 'assistant panel should have labelledby');
assert.match(widgetSource, /aria-describedby="ai-assistant-subtitle"/, 'assistant panel should have describedby');
assert.match(widgetSource, /tabindex="-1"/, 'assistant panel should be programmatically focusable');
assert.match(widgetSource, /@keydown\.esc\.stop\.prevent="handlePanelEscape"/, 'assistant panel should close on Escape');

assert.match(widgetSource, /role="log"/, 'message viewport should use log semantics');
assert.match(widgetSource, /aria-live="polite"/, 'message viewport should politely announce additions');
assert.match(widgetSource, /aria-label="AI 助手对话记录"/, 'message viewport should have an accessible label');
assert.match(widgetSource, /aria-label="向桃源小助理提问"/, 'textarea should have an accessible label');
assert.match(widgetSource, /aria-label="关闭桃源小助理面板"/, 'close button should have an accessible label');

assert.match(widgetSource, /<details ref="headerMenu" class="ai-panel__more">/, 'header secondary actions should be inside a more menu');
assert.match(widgetSource, /role="menu"/, 'more menu should expose menu semantics');
assert.match(widgetSource, /role="menuitem"/, 'more menu actions should expose menuitem semantics');
assert.match(widgetSource, /handleResetConversation/, 'clear conversation should be routed through the more menu handler');

assert.match(widgetSource, /fabButton\.value\?\.focus\(\{ preventScroll: true \}\)/, 'closing should restore focus to the FAB');
assert.match(widgetSource, /panelElement\.value\?\.focus\(\{ preventScroll: true \}\)/, 'opening should move focus into the panel');
assert.match(widgetSource, /const handlePanelEscape = \(\) => \{[\s\S]*handleClosePanel\(\)/, 'Escape handler should close through the shared close path');

assert.match(widgetSource, /\.ai-panel\s*\{[\s\S]*overflow-y:\s*auto/, 'panel should support vertical overflow scrolling');
assert.match(widgetSource, /overscroll-behavior:\s*contain/, 'panel scroll should be contained');
assert.match(widgetSource, /100dvh/, 'mobile panel sizing should use dynamic viewport height for soft keyboard changes');
assert.match(widgetSource, /safe-area-inset-bottom/, 'panel/input should account for bottom safe area');
assert.match(widgetSource, /safe-area-inset-top/, 'mobile panel should account for top safe area');

assert.match(widgetSource, /\.ai-panel__quick\s*\{[\s\S]*flex-wrap:\s*nowrap/, 'quick questions should not wrap into more than two visual lines');
assert.match(widgetSource, /\.ai-panel__quick\s*\{[\s\S]*overflow-x:\s*auto/, 'quick questions should scroll horizontally on small screens');
assert.match(widgetSource, /-webkit-line-clamp:\s*2/, 'quick question text should clamp to two lines');
assert.match(widgetSource, /class="ai-quick-btn__text"/, 'quick question text should use a clamp wrapper');

assert.match(widgetSource, /\.ai-panel__send\s*\{[\s\S]*min-height:\s*var\(--ai-assistant-touch-target/, 'mobile send button should meet touch target height');
assert.match(appCssSource, /--ai-assistant-touch-target:\s*44px/, 'global CSS should define assistant touch target size');
assert.match(appCssSource, /--ai-assistant-mobile-edge:\s*8px/, 'global CSS should define assistant mobile edge spacing');

assert.equal(
  packageJson.scripts?.['qa:ai-assistant-mobile-accessibility'],
  'node scripts/qa-ai-assistant-mobile-accessibility.mjs',
  'package.json should register qa:ai-assistant-mobile-accessibility',
);

console.log('qa-ai-assistant-mobile-accessibility passed');
