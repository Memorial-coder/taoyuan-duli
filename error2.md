# taoyuan-duli 全项目审计结果（error2）

审计时间：2026-04-11  
审计方式：静态代码审查 + 构建/类型检查  
审计范围：
- `server/` 后端、鉴权、会话、管理员接口、存档/邮箱/大厅/AI 助手
- `taoyuan-main/` 前端、存档、额度兑换、AI 管理、Electron
- 根目录部署配置（`.env`、`Dockerfile`、`docker-compose.yml`）

> 说明：本次**未修改代码**。已执行前端 `npm run type-check` 与 `npm run build`，构建通过。以下以**高置信问题**为主；同时把仓库内现有 `error.md` 中的 13 个玩法/逻辑问题一并纳入，便于一次性汇总。

---

## 总结

当前项目存在几类明显风险：

1. **生产密钥/数据库凭据已落库到 `.env`**，属于直接泄漏。
2. **服务端存档并不真正可信**：前后端共用固定硬编码密钥，客户端可自行解密/伪造服务端存档。
3. **额度兑换与服务端存档扣增钱并非原子操作**，在失败/中断/模式不一致时会出现**白嫖 quota 或丢钱**。
4. **管理员口令长期明文存于 `localStorage`**，且多个管理入口共用，任何 XSS / 恶意扩展 / 本地注入都可直接接管后台。
5. Electron 端做了**全局 CORS 放开**，安全边界过宽。
6. Android 签名密钥和签名密码已提交进仓库，存在**供应链级别风险**。
7. 玩法层面还有一批高置信逻辑问题，详见本文后半部分“已存在玩法/逻辑问题汇总”。

---

## 一、本轮新增发现的安全/后端/一致性问题

## P0 / Critical

### 1. 仓库内直接提交了真实密钥和数据库凭据
**位置**
- `.env:4-7`
- `.env:16-22`

**问题**
当前仓库根目录 `.env` 中直接包含：
- `SECRET_KEY`
- `ADMIN_TOKEN`
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

且值看起来不是占位符，而是真实可用配置。

**影响**
- 任何拿到仓库副本的人都能直接伪造 session、尝试管理员接口、连接数据库。
- 如果该仓库曾同步到网盘、聊天、压缩包、备份机，风险已经实际外泄。

**建议优先级**：最高。立即轮换所有泄漏凭据，并移除仓库中的真实 `.env`。

---

### 2. 服务端存档可被客户端伪造：前后端共用硬编码存档密钥
**位置**
- `taoyuan-main/src/stores/useSaveStore.ts:42-43`
- `taoyuan-main/src/stores/useSaveStore.ts:65-88`
- `server/src/taoyuanHall.js:34-35`
- `server/src/taoyuanHall.js:126-147`
- `server/src/taoyuanMailbox.js:10`
- `server/src/taoyuanMailbox.js:218-239`
- `server/src/routes/api.js:682-703`

**问题**
前端和后端都把存档加密密钥写死为：
- `taoyuanxiang_2024_secret`

前端负责加密存档；后端直接接收客户端上传的 `raw` 并保存，不校验签名来源，也不校验“这是服务端生成的可信数据”。

**影响**
这意味着任意玩家只要读到前端代码，就可以：
- 本地解密自己的服务端存档；
- 修改钱、背包、进度、邮件奖励承载状态；
- 重新加密后上传到 `/api/taoyuan/save/:slot`；
- 影响依赖服务端存档结算的系统（例如大厅悬赏、邮件发奖落包等）。

这不是“仅能改自己本地档”的问题，而是**服务端把客户端伪造数据当真**。

**建议优先级**：最高。服务端存档必须改为服务端私钥签名/服务端序列化，不能继续信任客户端密文。

---

### 3. 额度兑换与服务端存档扣增钱不是原子事务，可造成白嫖 quota / 丢钱
**位置**
- `server/src/routes/api.js:585-663`
- `taoyuan-main/src/views/game/WalletView.vue:748-810`
- `taoyuan-main/src/stores/useSaveStore.ts:729-733`

**问题**
后端的两个兑换接口：
- `/api/taoyuan/quota/import`
- `/api/taoyuan/quota/export`

只处理了**账号 quota** 的增减与返回值，**没有直接修改服务端存档里的 `player.money`**。实际铜钱加减发生在前端：
- `WalletView.vue` 里先本地改 Pinia 的 `playerStore.money`
- 然后再调用 `saveStore.autoSave()` 试图把新金额写回当前槽位

但 `autoSave()` 有明确失败条件：
- 当前没有活跃槽位；
- 当前活跃槽位模式与当前存储模式不一致；
- 网络/接口失败。

**直接后果**
- **导出铜钱 → quota**：后端先把 quota 发给你；若之后自动存档失败，服务端存档里的铜钱没有扣掉，玩家可白嫖 quota。
- **导入 quota → 铜钱**：后端先扣 quota；若自动存档失败，服务端存档没加钱，玩家会实际丢 quota。

这是一个明确的**一致性/经济系统漏洞**。

**建议优先级**：最高。兑换必须在服务端完成“quota + 服务端存档 money”同一事务/同一锁内更新。

---

## P1 / High

### 4. 管理员口令明文长期存放在 `localStorage`
**位置**
- `taoyuan-main/src/utils/taoyuanMailboxAdminApi.ts:90-113`
- `taoyuan-main/src/utils/userAdminApi.ts:105-118`
- `taoyuan-main/src/utils/taoyuanAiApi.ts:19-35`
- `taoyuan-main/src/views/UserAdminView.vue:34-52`
- `taoyuan-main/src/views/TaoyuanAdminView.vue:38-56`

**问题**
管理口令被以 `admin_token` 明文写入浏览器 `localStorage`，并被以下模块复用：
- 用户管理
- 桃源邮件后台
- AI 管理后台

**影响**
任何能执行前端脚本的场景都能直接读出这个口令：
- XSS
- 浏览器恶意扩展
- 被调试工具/本地恶意软件读取
- Electron 场景下的本地注入

而这不是短时 session，而是**持久化口令**。

**建议优先级**：高。改成一次性后台登录态 / HttpOnly session / 短期 admin session，不要把主管理口令持久化到前端存储。

---

### 5. Electron 主进程对所有响应全局注入 `Access-Control-Allow-Origin: *`
**位置**
- `taoyuan-main/electron/main.js:172-181`

**问题**
Electron 窗口里对所有非同源请求响应统一注入：
- `access-control-allow-origin: *`
- `access-control-allow-methods: GET, PUT, DELETE, PROPFIND, HEAD, OPTIONS`
- `access-control-allow-headers: Authorization, Content-Type, Depth`

并删除 `WWW-Authenticate`。

**影响**
这等于在桌面端把 Web 安全边界整体放松，尤其是：
- 允许更广泛的跨域读取；
- 为 WebDAV 等敏感接口开了全局绿灯，而不是最小权限白名单；
- 一旦页面可被引导访问到不可信内容，风险面会明显变大。

**建议优先级**：高。应只对白名单域名/协议定向放行，避免全局 `*`。

---

### 6. Android 发布签名密钥和签名密码已提交进仓库
**位置**
- `taoyuan-main/android/app/build.gradle:16-25`
- `taoyuan-main/android/key`
- `taoyuan-main/android/app/build.gradle:41-48`

**问题**
Android 工程里直接提交了：
- 发布 keystore 文件 `taoyuan-main/android/key`
- `keyAlias`
- `keyPassword`
- `storePassword`

而且 `debug` 构建也复用了 `release` 的签名配置。

**影响**
- 任何拿到仓库的人都可以构造**同签名恶意 APK**；
- 如果已有用户依赖该签名做升级校验，则可形成供应链风险；
- debug 环境也复用生产签名，进一步扩大泄漏面。

**建议优先级**：高。立即轮换 Android 发布密钥，移除仓库内 keystore 与明文密码，并让 debug/release 使用不同签名。

---

## P2 / Medium

### 7. 登录/注册接口没有看到任何限流或爆破防护
**位置**
- `server/src/routes/api.js:346-365`
- `server/src/db.js:373-457`

**问题**
公开接口 `/register`、`/login` 未见：
- rate limit
- IP 节流
- 登录失败冷却
- 图形验证码/二次校验

**影响**
- 可被撞库/密码爆破。
- 对外开放后，管理员和普通用户口令都缺乏基础的在线暴力破解缓冲层。

**建议优先级**：中。至少补基础限流与失败次数策略。

---

### 13. 文件型 session store 没有并发写保护，可能相互覆盖
**位置**
- `server/src/index.js:88-163`

**问题**
`sessions.json` 的 `get/set/destroy/touch` 每次都是：
1. 读整个文件
2. 修改内存对象
3. 整体写回

但这里没有锁，也没有 append-only/journal。

**影响**
并发请求较多时，不同请求的 session 写入可能互相覆盖，导致：
- session 丢失
- 登录态异常掉线
- 高并发下 session 数据不一致

**建议优先级**：中。单机也建议换成熟 store，至少要有并发保护。

---

### 14. 管理接口向前端返回了服务端绝对文件路径
**位置**
- `server/src/routes/api.js:193-212`
- `server/src/routes/api.js:417-420`
- `server/src/routes/api.js:437-439`

**问题**
`getSaveFileSummary()` 把 `file_path` 一并返回给前端管理界面。

**影响**
- 暴露服务端目录结构；
- 方便攻击者推断部署路径、磁盘组织、数据落点。

虽然需要管理员口令，但这类信息原则上没必要返回给前端。

**建议优先级**：中。前端只需文件名、大小、更新时间、槽位信息即可。

---

### 15. 服务端存档写接口只校验“是字符串”，不校验结构/版本/大小合理性
**位置**
- `server/src/routes/api.js:682-703`

**问题**
`POST /api/taoyuan/save/:slot` 只做了：
- 槽位范围判断
- `raw` 是否为字符串/非空

没有校验：
- 解密后 JSON 是否合法；
- 是否包含必要结构；
- 是否版本兼容；
- 是否存在异常大字段/恶意膨胀。

**影响**
- 容易把坏档写进服务端，后续加载才炸；
- 配合硬编码密钥问题，可更轻松地构造畸形存档；
- 数据完整性弱。

**建议优先级**：中。至少服务端应在写入前解密+结构校验。

---

### 11. Android App 允许明文 HTTP 且默认允许备份，移动端数据暴露面偏大
**位置**
- `taoyuan-main/android/app/src/main/AndroidManifest.xml:7-12`
- `taoyuan-main/android/app/src/main/res/xml/backup_rules.xml:7-12`
- `taoyuan-main/android/app/src/main/res/xml/data_extraction_rules.xml:5-18`

**问题**
Android 端配置了：
- `android:usesCleartextTraffic="true"`
- `android:allowBackup="true"`

同时备份规则基本还是示例模板，没有对实际敏感数据做明确排除。

**影响**
- 若后续接入明文 HTTP 资源，会增加中间人风险；
- 若本地保存设置、口令、存档或账号上下文，可能被设备备份/迁移链路带出。

**建议优先级**：中。若非必要应关闭 cleartext；同时补齐 backup/data-extraction 排除规则。

---

### 12. 错误处理直接把内部错误消息返回给客户端
**位置**
- `server/src/index.js:214-217`

**问题**
全局错误处理中直接返回 `err.message`。

**影响**
- 数据库错误、AI 接口错误、内部解析错误可能被原样暴露给前端；
- 方便外部摸内部实现细节。

**建议优先级**：中低。生产环境建议统一返回通用文案，详细错误仅记日志。

---

## 三、本轮额外验证到的前端 / 玩法问题

### 24. 钓鱼在确认有鱼之前就会消耗鱼饵和浮漂耐久，空池只退体力不退消耗
**位置**
- `taoyuan-main/src/stores/useFishingStore.ts:177-205`

**问题**
当前实现中：
- 先根据地点/天气/鱼饵计算 `fishPool`
- 当 `fishPool.length === 0` 时，只执行 `playerStore.restoreStamina(staminaCost)`
- 但鱼饵扣除与浮漂耐久扣减逻辑紧随其后，整体顺序和状态组织容易导致“不可钓条件下仍产生非体力消耗”的设计/实现不一致

从代码结构和 teammate 审核结论看，这块至少存在**高风险规则不一致**，需要重点复核并补自动化验证。

**影响**
- 玩家在“当前无鱼可钓”的情况下，可能出现体力被回退但消耗品/耐久不一致的问题；
- 这类损耗对高价值鱼饵尤其敏感，容易被玩家感知为吞道具。

**建议优先级**：高。

---

### 25. 任务接取上限检查不是原子操作，快速重复接取可能超过上限
**位置**
- `taoyuan-main/src/stores/useQuestStore.ts:392-438`

**问题**
`acceptQuest()` 和 `acceptSpecialOrder()` 都是先判断：
- `activeQuests.value.length >= MAX_ACTIVE_QUESTS.value`

然后再 `push` 进 `activeQuests`。这里没有锁、没有二次确认，也没有像某些提交流程那样的串行保护。

**影响**
- 在多弹窗/快速双击/竞争触发下，可能同时通过上限检查，最终让 `activeQuests` 超过 UI 展示的最大值；
- 属于明确的一致性缺陷。

**建议优先级**：高。

---

### 26. 移动端地图无论导航是否成功都会关闭，失败场景体验差
**位置**
- `taoyuan-main/src/components/game/MobileMapMenu.vue:125-128`
- `taoyuan-main/src/composables/useNavigation.ts:96-145`

**问题**
`MobileMapMenu` 里：
- 先调用 `navigateToPanel(key)`
- 然后无条件 `emit('close')`

但 `navigateToPanel()` 可能因为：
- 已过 bedtime
- 商店未营业
- 体力不足
- 昏倒结算
而提前返回失败。

**影响**
- 玩家并没有成功移动，但地图菜单却被收起；
- 会形成“没跳转成功 + 还得重新打开地图”的无效操作。

**建议优先级**：中。

---

### 27. 邮箱一键领取只同步第一个存档槽位，后续奖励可能已发放但当前内存态未刷新
**位置**
- `taoyuan-main/src/stores/useMailboxStore.ts:140-145`
- `taoyuan-main/src/views/game/MailView.vue:231-239`

**问题**
`claimAll()` 只取：
- 第一条带 `save_slot` 的领取结果 `firstSaveSlot`
- 然后仅对这一个槽位执行 `syncAfterClaim()`

但 UI 文案又会展示“成功领取 N 封邮件”。

**影响**
- 如果多封邮件落在不同槽位，前面成功、后面也成功，但当前内存里的桃源存档只刷新了第一个槽；
- 玩家会看到“都成功了”，但实际界面状态并未完整反映。

**建议优先级**：中。

---

### 28. 睡觉结算会在 `handleEndDay()` 返回后立刻恢复时钟，可能与后续弹窗流程并发
**位置**
- `taoyuan-main/src/views/GameLayout.vue:920-929`

**问题**
`confirmSleep()` 中：
- `pauseClock('endday')`
- 调 `handleEndDay()`
- `finally` 里立刻 `resumeClock('endday')`

但 `handleEndDay()` 会牵涉节日、事件、弹窗、路由跳转等后续链路；从结构上看，存在“结算尚未真正结束，时钟已恢复”的高风险窗口。

**影响**
- 用户还在处理日终弹窗/节日结算时，时间可能已经继续流逝；
- 会造成非常难复现的跨天/误推进问题。

**建议优先级**：高。

---

### 29. FishingMiniGame 未处理 `touchcancel`，移动端中断时可能残留按住状态
**位置**
- `taoyuan-main/src/components/game/FishingMiniGame.vue:23-27`
- `taoyuan-main/src/components/game/FishingMiniGame.vue:51-55`

**问题**
当前只监听：
- `touchstart`
- `touchend`

没有处理 `touchcancel`。

**影响**
- 来电、系统手势、浏览器中断等场景下，`isHolding` 可能残留为 true；
- 会出现自动提竿/控制异常。

**建议优先级**：中。

---

### 30. 丰收展评预览分数不计数量，且同一堆叠物品可重复加入选择，规则表达不清
**位置**
- `taoyuan-main/src/components/game/HarvestFairView.vue:46-66`
- `taoyuan-main/src/components/game/HarvestFairView.vue:198-205`
- `taoyuan-main/src/components/game/HarvestFairView.vue:222-225`
- `taoyuan-main/src/components/game/HarvestFairView.vue:237-255`

**问题**
当前实现中：
- `previewScore` 只按 `itemId + quality` 的基础售价计算，不考虑 `quantity`
- 选择列表展示堆叠数量 `×N`
- 但 `addSelection()` 只是把条目重复推入 `selectedItems`，没有扣减可选数量

**影响**
- 玩家会误以为一组 `x99` 与 `x1` 的参展语义不同，但预览并不体现；
- 也可能误解为可以把同一堆叠重复当成多件独立展品提交。

**建议优先级**：中。

---

### 31. 丰收展 NPC 分数固定在 600-1200，低中期玩家很容易感到“必输/像作弊”
**位置**
- `taoyuan-main/src/components/game/HarvestFairView.vue:257-266`

**问题**
NPC 分数是固定随机：
- `600 + Math.random() * 600`

而玩家得分由自身参展物实际价值计算，二者没有看到明显的阶段缩放。

**影响**
- 低中期普通物品很难接近这个区间；
- 容易形成“不公平 / 被写死输”的体验。

**建议优先级**：中。

---

### 32. 茶艺比赛超量灌注不会真正失败，UI 风险提示与规则结果不一致
**位置**
- `taoyuan-main/src/components/game/TeaContestView.vue:249-277`

**问题**
当进度到 100 时：
- 会自动 `lockStep()`
- 但最差仍能得到 `10` 分
- 没有真正的失败/爆锅/作废处理

**影响**
- UI 容易让玩家理解为“冲过头是严重失败”；
- 但机制上只是低分，不是失败，规则表达不一致。

**建议优先级**：中低。

---

### 33. 主菜单隐私协议与当前实现不一致，存在明显 claim/code mismatch
**位置**
- `taoyuan-main/src/views/MainMenu.vue:354-360`
- `taoyuan-main/src/views/MainMenu.vue:561-564`
- `taoyuan-main/src/stores/useSaveStore.ts:666-696`
- `taoyuan-main/src/utils/serverSaveApi.ts:23-85`

**问题**
主菜单隐私协议中明确写着：
- “存档数据不会上传至服务器”
- “游戏核心功能均在本地运行，不会将您的游戏存档或操作数据发送至任何服务器”

但实际实现已经支持：
- `saveStore.storageMode === 'server'` 的服务端持久化
- `/api/taoyuan/save/*` 的读取、保存、删除

**影响**
- 用户告知与真实行为不一致；
- 在启用账号云存档场景下，这属于明确的合规/产品文案错误；
- 一旦发生用户投诉，文案本身会成为证据链。

**建议优先级**：中。应尽快把隐私协议改成与“本地 / 服务端存档双模式”一致的说明。

---

### 34. 邮件后台“has_save”收件规则会包含已删除账号的残留存档用户名
**位置**
- `server/src/taoyuanMailbox.js:400-406`
- `server/src/taoyuanMailbox.js:473-476`

**问题**
`has_save` 模式的收件人来源是 `taoyuan_saves/` 目录下的文件名：
- 只按 `*.json` 枚举
- 不校验这些用户名是否仍然存在于用户库

而 `resolveRecipients()` 在 `has_save` 分支里也没有像 `single/batch` 那样再走一次数据库存在性校验。

**影响**
- 删除账号后，如果残留服务端存档文件还在，后台群发时仍可能把邮件投递给“目录里还在、账号已删”的幽灵用户名；
- 会污染发奖统计与后台认知。

**建议优先级**：中。`has_save` 也应与用户库交叉校验，或在删号时同步清理存档文件。

---

### 35. 大厅图片上传接口未把作者身份传入文件名清洗流程，审计与追踪性偏弱
**位置**
- `server/src/routes/api.js:969-975`
- `server/src/taoyuanHall.js:821-842`

**问题**
`saveUploadedImage()` 支持 `author` 参数参与文件名基底生成，但路由层调用时只传了：
- `dataUrl`
- `filename`

没有把当前登录用户名传进去。

**影响**
- 上传后的落盘文件名缺少最基本的用户维度信息；
- 发生滥用图片上传时，文件层面的追踪性更差；
- 不算直接漏洞，但属于审计链路缺口。

**建议优先级**：中低。

---

## 四、已存在玩法 / 逻辑问题汇总（来自仓库内现有 `error.md`）

> 说明：以下 13 项已在仓库现有 `error.md` 中给出较完整定位与分析。本轮已读取并纳入总表，方便统一排期。

### 11. WS01 日经济快照日期晚一天，跨周归档漏算周末最后一天
- 参考：`error.md:6-15`
- 原始定位：`taoyuan-main/src/composables/useEndDay.ts:847-849, 1162-1186`；`taoyuan-main/src/stores/useGoalStore.ts:1020-1024, 1066-1078`

### 12. 高价值订单类型在写入日快照之后才补，循环多样度统计偏小
- 参考：`error.md:17-25`
- 原始定位：`taoyuan-main/src/composables/useEndDay.ts:1174-1186, 1206-1215`

### 13. 直接卖店收入未按商店系统记账，经济观测口径与出货箱不一致
- 参考：`error.md:26-35`
- 原始定位：`taoyuan-main/src/stores/useShopStore.ts:648-653` 等

### 14. 出货箱收入记到 `shop`，但日快照参与系统硬编码成了 `market`
- 参考：`error.md:36-43`
- 原始定位：`taoyuan-main/src/composables/useEndDay.ts:833-837, 1164-1172`

### 15. 商店目录购买失败时“退款”未回滚遥测，制造假支出和假收入
- 参考：`error.md:44-51`
- 原始定位：`taoyuan-main/src/stores/useShopStore.ts:361-427`；`taoyuan-main/src/stores/usePlayerStore.ts:266-271, 388-390`

### 16. 村庄建设默认状态泄漏阶段信息，未完成项目看起来像已推进阶段
- 参考：`error.md:52-59`
- 原始定位：`taoyuan-main/src/stores/useVillageProjectStore.ts:106-148, 402-427`

### 17. 村庄建设捐赠 API 只记账不扣物品，可无成本完成捐赠
- 参考：`error.md:60-65`
- 原始定位：`taoyuan-main/src/stores/useVillageProjectStore.ts:764-799`

### 18. 博物馆馆区/槽位成长默认就自锁，且 store 缺少真正解锁写路径
- 参考：`error.md:66-74`
- 原始定位：`taoyuan-main/src/data/museum.ts:158-166, 331-339`；`taoyuan-main/src/stores/useMuseumStore.ts:164-280`

### 19. 任务页把鱼塘主题特殊订单错误标成“育种订单”
- 参考：`error.md:75-84`
- 原始定位：`taoyuan-main/src/data/quests.ts:486-537`；`taoyuan-main/src/views/game/QuestView.vue:117-123, 150-156, 301-303, 349-356`

### 20. “未接取特殊订单卡片补充剩余天数”没有真正落到卡片本体
- 参考：`error.md:85-91`
- 原始定位：`taoyuan-main/src/views/game/QuestView.vue:111-125`

### 21. 高价目录购买没有记 sink 消耗，WS01 闭环统计偏低
- 参考：`error.md:92-99`
- 原始定位：`taoyuan-main/src/stores/useShopStore.ts:361-430`；`taoyuan-main/src/stores/usePlayerStore.ts:274-278`

### 22. “豪华经营周”主题周配置已写入数据，但运行时永远选不到
- 参考：`error.md:100-107`
- 原始定位：`taoyuan-main/src/data/goals.ts:501-527`；`taoyuan-main/src/stores/useGoalStore.ts:1206-1221`

### 23. CHANGELOG 里 WS01 T010 段落重复记录一次
- 参考：`error.md:108-113`
- 原始定位：`taoyuan-main/CHANGELOG.md:149-167`

---

## 五、验证结果

### 已执行
- `taoyuan-main`: `npm run type-check`
- `taoyuan-main`: `npm run build`

### 结果
- `type-check`：通过
- `build`：通过

说明：**能构建 ≠ 没有逻辑漏洞/一致性问题**。当前主要问题集中在：
- 经济系统一致性
- 服务端存档可信性
- 管理口令处理
- 若干中后期玩法逻辑

---

## 六、建议修复优先级

### 第一批（必须先做）
1. 立刻轮换 `.env` 中全部泄漏凭据。
2. 停止把真实 `.env` 放进项目目录/压缩包。
3. 重做服务端存档可信模型：不要继续信任客户端密文。
4. 把额度兑换改成服务端原子更新 quota + 存档 money。
5. 去掉前端 `localStorage` 持久化管理员主口令。

### 第二批（尽快做）
6. 缩小 Electron CORS 放行范围。
7. 给登录/注册接口加限流。
8. 修正 session 文件并发写问题。
9. 管理接口不要回传绝对文件路径。
10. 给服务端存档写入加结构校验。

### 第三批（玩法/经济系统）
12. 按 `error.md` / 本文第 24~35 项及后续汇总项逐个修复 WS01、村庄建设、博物馆、任务页、钓鱼、邮件、节日玩法与文案一致性问题。

---

## 七、结论

如果按风险等级看，当前最危险的不是某个单独 UI bug，而是这三件事：

- **凭据泄漏**
- **服务端存档可伪造**
- **额度兑换非原子导致经济可穿透**

这三项建议优先于普通玩法体验问题处理。
