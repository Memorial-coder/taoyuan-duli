# Codex 全链路审查报告（2026-04-13）

> 审查范围：当前工作树（含未提交改动与未跟踪文件）  
> 审查方式：主线程静态复核 + 本地命令校验 + 3 个 subagent 并行审查  
> 审查重点：运行时稳定性、部署链路、QA 覆盖、交付完整性

## A. 本轮基线

以下结果已在 `2026-04-13` 当前工作树实测确认：

- 前端 `npm run type-check` 通过
- 前端 `npm run lint` 通过
- 前端 `npm run qa:late-game-samples` 通过
- 前端 `npm run build` 通过
- 服务端 `node --check` 已覆盖：
  - `server/src/index.js`
  - `server/src/routes/api.js`
  - `server/src/taoyuanMailbox.js`
  - `server/src/taoyuanHall.js`
  - `server/src/taoyuanAiAssistant.js`
- 当前环境 `python` / `py` 不可用，因此仓库内 Python Playwright 动态脚本仍无法直接执行
- `git status --short` 显示工作树为脏状态，且存在未跟踪文件 `?? taoyuan-main/src/views/game/VillageView.vue`

## B. 总体结论

当前版本已经明显比旧报告对应阶段更稳定：

- 前端静态门恢复为全绿，构建也通过
- 之前报告中关于育种/鱼塘周赛报名清理、周赛初始化、`/api` fallback、Cookie 默认策略等问题，大部分已经修复
- 本轮通过前端主循环与存档/周结算链路审查，没有再发现新的高置信前端运行时 `P0/P1`

但从“整个游戏可交付、可部署、可持续回归”的角度看，当前仍有 5 个值得优先收敛的问题：

1. Docker 部署默认会把运行数据写到挂载卷外，用户数据与会话无法持久化。
2. 定时邮件只要进入“半发送”脏状态，就可能把整个邮箱接口链路打成 500。
3. 当前样例档 QA 只校验原始 JSON 形状，不走真实读档与页面链路，也不能覆盖 `WS09/WS10` 的关系线/活动层状态。
4. 前端当前存档版本是 `3`，但服务端邮箱/大厅在缺省回填时仍写死为 `2`。
5. 生产路由已经引用 `VillageView.vue`，但该文件仍未纳入版本控制，clean checkout 存在交付风险。

本轮未发现高置信 `P0`。

## C. 当前高优先级问题

### 1. Docker 默认配置会把运行数据写到挂载卷外，导致用户数据和会话不持久

- 风险等级：`P1`
- 涉及文件：
  - `.env:14`
  - `docker-compose.yml:6-11`
  - `server/src/index.js:3-8`
  - `server/src/index.js:18-19`
  - `taoyuan-main/src/utils/serverSaveApi.ts:24-87`
- 证据：
  - `.env` 当前写死 `DB_STORAGE=d:/taoyuan - 副本/taoyuan-duli/data/.storage.json`
  - `docker-compose.yml` 直接把 `.env` 注入容器，同时只挂载 `./data:/app/data`
  - `server/src/index.js` 启动时直接以 `DB_STORAGE` 推导 `DATA_DIR`
- 为什么会出问题：
  - 容器里会沿用 Windows 路径风格的 `DB_STORAGE`
  - 服务端所有会话、邮箱、知识库、桃源存档都跟着 `DATA_DIR` 走
  - 结果是运行数据不会落到 `/app/data` 这个挂载卷中
- 影响：
  - Docker 场景下登录态、邮箱、云存档和会话数据都可能在重启后丢失
  - 前端 `/api/taoyuan/save/*` 这条链路命中了“看似可用、实际不落盘”的假持久化
- 触发方式：
  - 使用仓库当前 `.env` 直接 `docker compose up`
  - 或任何未显式把 `DB_STORAGE` 改为容器内路径的部署

### 2. 定时邮件一旦进入“半发送”脏状态，会连带打挂整个邮箱接口

- 风险等级：`P1`
- 涉及文件：
  - `server/src/taoyuanMailbox.js:606-625`
  - `server/src/taoyuanMailbox.js:628-649`
  - `server/src/routes/api.js:852-900`
  - `taoyuan-main/src/utils/mailboxApi.ts:18-57`
- 证据：
  - `dispatchCampaignIntoData()` 发现同一 campaign 已存在投递记录时直接 `throw`
  - `processPendingCampaignsInternal()` 会在每次邮箱请求前处理所有到期 campaign
  - `/taoyuan/mail/list`、`/taoyuan/mail/:id` 等接口都先调用 `processPendingCampaigns()`
- 为什么会出问题：
  - 只要某个 scheduled campaign 的 `status` 没被正确收束，但 `deliveries` 已经存在
  - 下次任意邮箱请求都会再次尝试投递并直接抛错
- 影响：
  - 邮箱列表、详情、领取、一键领取都可能统一变成 HTTP 500
  - 这是“一个脏 campaign 毒化全邮箱系统”的放大故障
- 触发方式：
  - 手工编辑 campaign JSON 造成半发送状态
  - 上一次发送过程中数据被部分写入，但 `status` 仍保留 `scheduled`

## D. 中优先级问题

### 1. 当前样例档 QA 只校验原始对象形状，无法验证真实读档和页面链路

- 风险等级：`P2`
- 涉及文件：
  - `taoyuan-main/scripts/qa-late-game-samples.mjs:1-75`
  - `taoyuan-main/src/data/sampleSaves.ts:138-489`
  - `taoyuan-main/src/views/dev/LateGameDebugView.vue:40-70`
  - `taoyuan-main/src/stores/useSaveStore.ts:1079-1082`
- 证据：
  - `qa-late-game-samples.mjs` 直接 `import { BUILT_IN_SAMPLE_SAVES }`，只检查字段形状与基础值
  - 调试页实际载入路径是 `LateGameDebugView -> loadSample() -> useSaveStore.loadBuiltInSampleSave() -> applySaveData(...)`
  - 4 套样例显式覆盖的是经济、育种、鱼塘、村庄、博物馆、瀚海等状态；并未为 `WS09/WS10` 准备专门的关系线/活动层富样例
- 为什么会出问题：
  - 当前 QA 命令不会真实触发 Pinia store 反序列化
  - 也不会检查载入样例后页面入口是否真的可见、当前活动/限时窗口是否可用
- 影响：
  - 样例档 schema 正常并不等于真实读档链路正常
  - `WS09/WS10` 这类更依赖运行时状态装配的功能，仍然可能在“样例 QA 通过”的情况下漏出回归
- 备注：
  - 这不是当前运行时 bug 的直接证据，但它会持续降低回归审查的可信度

### 2. 服务端对存档容器 meta 的默认版本仍停留在 `2`

- 风险等级：`P2`
- 涉及文件：
  - `taoyuan-main/src/stores/useSaveStore.ts:55`
  - `taoyuan-main/src/data/sampleSaves.ts:9`
  - `server/src/taoyuanMailbox.js:271-279`
  - `server/src/taoyuanHall.js:150-157`
- 证据：
  - 前端当前 `SAVE_VERSION = 3`
  - 样例档也按 `saveVersion = 3` 写出
  - 但服务端邮箱/大厅在缺少显式 `saveVersion` 时仍回填为 `2`
- 为什么会出问题：
  - 这不会立刻炸掉已有带版本号的存档
  - 但会让服务端生成/改写的容器 meta 与前端当前口径脱节
- 影响：
  - 存档迁移治理和问题排查会出现“前后端版本语义不同步”
  - 后续若再做 `SAVE_VERSION=4` 升级，这种分裂会更难收口

### 3. `VillageView.vue` 已进入正式路由，但文件仍未纳入版本控制

- 风险等级：`P2`
- 涉及文件：
  - `taoyuan-main/src/router/index.ts:30`
  - `taoyuan-main/src/views/game/HomeView.vue:17`
  - `taoyuan-main/src/views/game/NpcView.vue:145`
  - `taoyuan-main/src/views/game/VillageView.vue`
  - `git status --short` 当前输出
- 证据：
  - 正式路由已新增 `name: 'village-projects'`
  - `HomeView` 与 `NpcView` 都已经有“建设总览”入口跳转到该页面
  - 但当前工作树里该文件仍显示为 `?? taoyuan-main/src/views/game/VillageView.vue`
- 为什么会出问题：
  - 本机构建会把它打进去，因为文件确实在磁盘上
  - 但 clean checkout 或他人分支只要漏掉这个文件，构建就会直接失败
- 影响：
  - 这是典型的“本地能跑、交付不完整”问题
  - 对 CI、交接和后续 cherry-pick 都有直接风险

## E. 已失效 / 已修复的旧结论

以下问题在当前代码中已不再成立，不应继续沿用到新报告：

### 1. 育种 / 鱼塘周赛报名对象不会清理

- 当前状态：已修复
- 证据：
  - `useBreedingStore.ts:502-524`
  - `useBreedingStore.ts:723-729`
  - `useBreedingStore.ts:1147-1180`
  - `useFishPondStore.ts:522-540`
  - `useFishPondStore.ts:237-261`
  - `useFishPondStore.ts:999-1075`
- 说明：
  - 当前已存在 `pruneContestRegistrations()` 与 `syncContestStateToCurrentWeek()`
  - 移除对象、建造/解锁、读档都会同步裁剪无效报名

### 2. 周赛只在跨周时初始化，读档或中途解锁会整周不出现

- 当前状态：已修复
- 证据：
  - `useBreedingStore.ts:752-756`
  - `useBreedingStore.ts:1175-1179`
  - `useFishPondStore.ts:165-167`
  - `useFishPondStore.ts:1071-1074`

### 3. `/api/*` 未命中会被 SPA fallback 吞掉

- 当前状态：已修复
- 证据：
  - `server/src/index.js:228-231`
- 说明：
  - 现在已经在静态页 fallback 前增加了 `/api` 专属 404 JSON 返回

### 4. “跨域 Cookie 口径”与服务端默认 SameSite 策略不一致

- 当前状态：已基本修复
- 证据：
  - `server/src/index.js:57-58`
  - `server/src/index.js:194-196`
  - `README.md:39-41`
- 说明：
  - 当前 README 已明确 `COOKIE_SAME_SITE` 可配
  - 服务端默认逻辑也会在 `COOKIE_SECURE=true` 时自动切到 `none`

### 5. 前端静态质量门为红

- 当前状态：已失效
- 说明：
  - 本轮 `type-check / lint / build / qa:late-game-samples` 全部通过

## F. 本轮覆盖与未覆盖

### 已覆盖

- 前端
  - `npm run type-check`
  - `npm run lint`
  - `npm run qa:late-game-samples`
  - `npm run build`
- 服务端
  - `node --check src/index.js`
  - `node --check src/routes/api.js`
  - `node --check src/taoyuanMailbox.js`
  - `node --check src/taoyuanHall.js`
  - `node --check src/taoyuanAiAssistant.js`
- 审查方式
  - 3 个 subagent 分别覆盖前端主循环、存档/调试/周结算链路、后端/部署链路

### 未覆盖

- 未执行浏览器级动态回放
  - 原因：当前环境没有 `python/py`，现有 Playwright 脚本是 Python 版本
- 未执行 Docker 实机部署验证
  - 本轮只做了配置与代码链路审查
- 未执行 clean checkout 构建
  - 当前工作树存在未跟踪页面文件，无法把“本机构建通过”直接等同于“版本库完整构建通过”

## G. 建议整改顺序

1. 先修 Docker 数据目录口径，确保容器场景下所有运行数据都落进 `/app/data`。
2. 再修邮箱调度的幂等/恢复策略，避免单个脏 campaign 毒化整个邮箱接口。
3. 把样例档 QA 升级为“真实读档 + 页面可见性 + 关键状态断言”，至少补一个非 Python 的项目内可执行回归入口。
4. 统一服务端与前端的存档版本默认值口径。
5. 立即把 `VillageView.vue` 纳入版本控制，并在 clean checkout 上重跑构建和 QA。
