import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const panelFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantAdminPanel.vue');
const knowledgePanelFile = path.join(rootDir, 'src', 'components', 'game', 'AiAssistantKnowledgeAdminPanel.vue');
const officialControlPanelFile = path.join(rootDir, 'src', 'components', 'game', 'OfficialControlAdminPanel.vue');
const adminViewFile = path.join(rootDir, 'src', 'views', 'TaoyuanAdminView.vue');
const aiApiFile = path.join(rootDir, 'src', 'utils', 'taoyuanAiApi.ts');
const storeFile = path.join(rootDir, 'src', 'stores', 'useAiAssistantStore.ts');
const packageFile = path.join(rootDir, 'package.json');

const panelSource = fs.readFileSync(panelFile, 'utf8');
const knowledgePanelSource = fs.readFileSync(knowledgePanelFile, 'utf8');
const officialControlPanelSource = fs.readFileSync(officialControlPanelFile, 'utf8');
const adminViewSource = fs.readFileSync(adminViewFile, 'utf8');
const aiApiSource = fs.readFileSync(aiApiFile, 'utf8');
const storeSource = fs.readFileSync(storeFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));

assert.match(panelSource, /data-testid="ai-admin-config-preview"/, 'admin panel should render a save-time public config preview');
assert.match(panelSource, /data-testid="ai-admin-dirty-state"/, 'admin panel should expose dirty state');
assert.match(panelSource, /data-testid="ai-admin-config-diff"/, 'admin panel should expose local config diff');
assert.match(panelSource, /configDiffRows/, 'admin panel should compute local config diff rows');
assert.match(panelSource, /captureAdminConfigBaseline/, 'admin panel should track the loaded config baseline');
assert.match(panelSource, /AiAssistantKnowledgeAdminPanel/, 'admin panel should mount the knowledge admin subpage');
assert.match(panelSource, /data-testid="ai-admin-subnav-knowledge"/, 'admin panel should expose a knowledge subpage tab');
assert.match(panelSource, /ai_panel/, 'knowledge subpage should be addressable from route query');
assert.match(panelSource, /setAiAdminPanelPage\('knowledge'\)/, 'knowledge button should switch to the knowledge subpage');
assert.match(panelSource, /activeAdminPanelPage\.value\s*=\s*page/, 'knowledge page click should switch the active admin subpage immediately');
assert.match(panelSource, /router\.replace\(\{ path: '\/admin', query: nextQuery \}\)/, 'knowledge page click should persist the subpage in the URL query');
assert.match(panelSource, /<AiAssistantKnowledgeAdminPanel v-else \/>/, 'knowledge subpage should render when config subpage is inactive');
assert.match(panelSource, /\(\)\s*=>\s*route\.query\.ai_panel/, 'admin panel should restore the knowledge subpage from URL query');
assert.match(panelSource, /delete nextQuery\.mode[\s\S]*delete nextQuery\.username/, 'knowledge subpage navigation should clear mail preset query params');
assert.match(panelSource, /type="button"[\s\S]*data-testid="ai-admin-subnav-knowledge"/, 'knowledge subnav should be a non-submit button');
assert.match(panelSource, /type="button" @click="openKnowledgeAdminPage"/, 'knowledge page footer action should be a non-submit button');
assert.match(adminViewSource, /if \(tab !== 'mail'\) \{[\s\S]*delete nextQuery\.mode[\s\S]*delete nextQuery\.username[\s\S]*\}/, 'admin top navigation should clear mail preset params outside the mail tab');
assert.match(adminViewSource, /if \(tab !== 'ai'\) \{[\s\S]*delete nextQuery\.ai_panel[\s\S]*\}/, 'admin top navigation should clear stale AI subpage params outside the AI tab');

assert.match(panelSource, /data-testid="ai-admin-char-count-assistant-name"/, 'assistant name should show a character counter');
assert.match(panelSource, /data-testid="ai-admin-char-count-welcome"/, 'welcome message should show a character counter');
assert.doesNotMatch(panelSource, /data-testid="ai-admin-char-count-console-credit"/, 'console credit should stay out of the AI config page');
assert.doesNotMatch(panelSource, /控制台署名文案|ai_assistant_console_credit/, 'cloud-control console credit copy should stay out of the AI config page');
assert.match(panelSource, /data-testid="ai-admin-char-count-system-prompt"/, 'system prompt should show a character counter');
assert.match(panelSource, /data-testid="ai-admin-char-count-blocked-topics"/, 'blocked topics should show a line counter');
assert.match(panelSource, /v-if="!isManagedReadonly\('ai_assistant_name'\)"/, 'official-managed assistant name should not render in AI config when readonly');
assert.match(panelSource, /v-if="!isManagedReadonly\('ai_assistant_welcome'\)"/, 'official-managed welcome should not render in AI config when readonly');

assert.match(panelSource, /data-testid="ai-admin-test-question"/, 'admin panel should include a test question entry');
assert.match(panelSource, /askAiAssistantDebug/, 'test question should use the debug ask endpoint');
assert.match(panelSource, /testQuestionResult\.evidence\.slice\(0,\s*3\)/, 'test question result should show bounded evidence summaries');

assert.doesNotMatch(panelSource, /data-testid="ai-admin-official-preview"/, 'AI assistant page should not render official managed publish preview');
assert.doesNotMatch(panelSource, /fetchOfficialControlPlatformStatus/, 'AI assistant page should not read official control platform status');
assert.doesNotMatch(panelSource, /fetchOfficialControlCurrentConfig/, 'AI assistant page should not read current official control release');
assert.doesNotMatch(panelSource, /loginOfficialControlSecondAuth/, 'AI assistant page should not expose cloud-control second auth');
assert.doesNotMatch(panelSource, /publishOfficialControlConfig/, 'AI assistant page should not publish official managed text');
assert.doesNotMatch(panelSource, /官方托管 AI 文案发布预览|刷新云控|云控二次密码|当前域名不可访问官方云控平台/, 'AI assistant page should hide cloud-control managed copy text');
assert.match(officialControlPanelSource, /fetchOfficialControlCurrentConfig/, 'cloud-control platform should keep current release fetch');
assert.match(officialControlPanelSource, /publishOfficialControlConfig/, 'cloud-control platform should keep official managed publishing');

assert.doesNotMatch(panelSource, /apiKey\s*[:=]\s*testQuestionResult/, 'test result should not render API key values');
assert.doesNotMatch(panelSource, /testQuestionResult\.(?:trace|rawOutput)/, 'test result should avoid showing full debug trace in preview');

assert.match(knowledgePanelSource, /data-testid="ai-knowledge-admin-panel"/, 'knowledge admin panel should render a stable root');
assert.match(knowledgePanelSource, /fetchAiKnowledgeEntries/, 'knowledge admin panel should load knowledge entries');
assert.match(knowledgePanelSource, /createAiKnowledgeEntry/, 'knowledge admin panel should create knowledge entries');
assert.match(knowledgePanelSource, /updateAiKnowledgeEntry/, 'knowledge admin panel should update knowledge entries');
assert.match(knowledgePanelSource, /publishAiKnowledgeEntry/, 'knowledge admin panel should publish knowledge entries');
assert.match(knowledgePanelSource, /deleteAiKnowledgeEntry/, 'knowledge admin panel should delete knowledge entries');
assert.match(knowledgePanelSource, /selectedEntry\?\.readonly/, 'knowledge admin panel should keep built-in entries read-only');

assert.match(aiApiSource, /routeNames:\s*entry\.routeNames/, 'knowledge API should send camelCase routeNames for the server');
assert.match(aiApiSource, /reviewStatus:\s*entry\.reviewStatus/, 'knowledge API should send camelCase reviewStatus for the server');
assert.match(aiApiSource, /sourceRefs:\s*entry\.sourceRefs/, 'knowledge API should send camelCase sourceRefs for the server');
assert.match(aiApiSource, /apiKeyAction/, 'config save API should send explicit apiKeyAction');
assert.match(storeSource, /adminConfig\.value\s*=\s*await saveAiAssistantAdminConfig/, 'admin config save should replace local state with the server response');
assert.match(storeSource, /publicConfig\.value\s*=\s*\{\s*enabled:\s*adminConfig\.value\.enabled/s, 'admin config save should update the public config from the saved server response');
assert.match(storeSource, /showFloat\('AI 助手配置已保存', 'success'\)/, 'admin config save should show success only after API response');

assert.equal(
  packageJson.scripts?.['qa:ai-assistant-admin-preview'],
  'node scripts/qa-ai-assistant-admin-preview.mjs',
  'package.json should register qa:ai-assistant-admin-preview',
);

console.log('qa-ai-assistant-admin-preview passed');
