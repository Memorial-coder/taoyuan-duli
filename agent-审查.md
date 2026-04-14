# 桃源乡项目综合审查报告（Agent 合并版）

本文为 `codex-审查.md`、`claude-审查.md`、`cline-审查.md` 三份审查结果的合并版。  
审查范围覆盖：`taoyuan-duli/taoyuan-main` 前端主工程，结合 `taoyuan-duli/server` 中邮箱/服务端存档链路做联动判断。  
重点关注：**真实可玩性、稳定性、状态一致性、旧档兼容、活动/主题周/邮件闭环、UI 信息层级、QA 能力、性能与可维护性**。

---

## 整改完成情况（2026-04-13）

以下状态以当前工作树为准，不再沿用文中较早阶段的判断：

### 高优先级项

- `P0-1` 活动编排 / 邮箱闭环：部分完成，仍存在全链路权威风险
  当前活动邮件的投递与领取回写已经接通，但邮箱奖励真实落点仍依赖服务端 `active slot`，与前端当前 `storageMode / activeSlot` 并非单一权威源；本地模式下领取邮件时，UI 仍可能提示“已发放到当前存档”，但真实奖励只写入了服务端槽位。
- `P0-2` 瀚海赌场结算信任前端：部分收口，Texas 仍未真正权威化
  Buckshot 已改为由 store 根据 session 弹仓、先手和玩家操作轨迹复盘结算，不再只信任组件回传输赢布尔值；但 Texas 仍依赖前端提交 `finalChips`，只是补了 session、跨日失效和理论上限校验，因此不能视作完全完成。
- `P0-3` 博物馆学者委托重复领奖：已完成
  当前已拦截 `rewarded` 终态，奖励领取后不可再次接取。
- `P1-4` 村庄建设捐赠伪完成 / 资源绕过：已完成
  当前版本已具备扣物资、失败回滚、里程碑领奖和页面入口，不再是伪完成功能。
- `P1-5` 导入存档只做结构校验：已完成
  当前导入会在写盘前走完整 `applySaveData()` 语义校验并恢复现场，不再只做壳层结构检查。
- `P1-6` `familyWishCompletions` 恒为 0：已完成
  当前已接入 `npcStore.getFamilyWishOverview().state.completedWishIds.length`。
- `P1-7` `useEndDay.ts` 过大且顺序敏感：已降级为长期重构建议
  这仍是结构性维护风险，但不再作为“当前功能未完成”的阻塞项；本轮已优先修补其中实际存在的周赛结算、活动邮件、跨周状态机问题。
- `P1-8` QA 治理污染正式玩家页面：已在当前版本覆盖
  `QaGovernancePanel` 当前只在 `import.meta.env.DEV` 下显示，正式构建不会展示给玩家；仍可作为后续 bundle/信息架构优化项。
- `P1-9` 正式环境可通过导入存档恢复 debug / balance overrides：未完成
  `useSettingsStore.deserialize()` 当前仍会在非 DEV 环境读取并应用 `lateGameFeatureOverrides / lateGameBalanceOverrides`；虽然 UI 设置入口有 DEV 门禁，但构造过的导入档仍可能把调试覆盖带进正式运行态。

### 中低优先级项

- `P2-1` 经济推荐真源分叉：已在当前版本收敛主链
  Wallet / Shop 当前都直接消费 `goalStore.recommendedEconomySinks` 作为主推荐源。
- `P2-2` 家庭 / 仙灵统一总览页：保留为体验增强项
- `P2-3` 路由与信息架构平铺：保留为长期信息架构重构项
- `P2-4` Guidance 覆盖不均：保留为后续 UI / 引导增强项
- `P2-5` 样例档双源认知：保留为 QA 资产治理项
- `P2-6` lint 未通过：已完成
  当前 `npm run lint` 通过。
- `P2-7` 后端缺少最小自动测试：保留为工程化增强项
- `P2-8` ~ `P2-9` 大 store / 上帝模块问题：保留为长期拆分项
- `P2-10` MailView 缺少活动同步反馈：已完成
  当前活动邮件领取后会同步回写活动状态，MailView 主链已闭环。

### 本轮额外完成的稳定性修复

- 育种 / 鱼塘周赛报名脏状态清理
- 新解锁 / 读档后本周周赛自动初始化
- 周赛重复结算日志去重
- 自助系统邮件接口禁止直接下发奖励，周结算补偿改为直接进入本地游戏状态
- `/api/*` 未命中时返回 JSON 404，而不是回落到前端 `index.html`
- Cookie 部署口径支持 `COOKIE_SAME_SITE`，并对 `none + 非 secure` 组合做启动拦截

---

## A. 总体结论

综合三份审查结果，可以明确下结论：**这个大任务没有“全完成”**，但也绝不是只有文档和数据表的伪开发状态。项目已经真实落地了大部分中后期系统：主题周、活动编排、特殊订单、后期经济治理、豪华目录、博物馆、公会、瀚海、家庭/配偶/仙灵、育种、鱼塘、样例档、调试页、结构化日志等，很多逻辑已经接入 `store + view + useEndDay` 主链，具备“中后期可以玩”的骨架。问题在于：当前工程已经进入**复杂系统耦合期**，部分链路虽然“能看见、能展示、甚至有状态字段”，但还没有形成真正可靠的闭环，尤其是**活动邮件运营、村庄建设捐赠、旧档迁移版本治理、调试验证可信度、正式玩家面中的 QA 治理污染**。

如果从“是否真的能玩、是否稳定、是否可维护、是否容易出错”四个角度来判断：当前版本属于**可玩但不够稳、可扩展但已开始难维护、局部功能表面完成而关键闭环未压实**。其中最危险的是真实 bug / 坏档 / 错结算问题：瀚海赌场结算可被前端伪造、博物馆学者委托可重复领奖、活动编排与邮箱系统未真正打通、导入存档只做结构校验不做语义验证、WS02 村庄捐赠计划仍属伪完成功能。再结合实施方案本身，当前也仍有明确未完项：**T017-T020、T039-T040**，即 **WS02 村庄建设终局资金池 2.0** 与 **WS04 市场行情调参与 QA 收口** 并未真正完成。

---

## B. 高优先级问题（P0 / P1）

> 说明：以下为三份报告的交集问题 + 单份报告中证据足够强、应提升为综合报告高优先级的问题。

### 1. 活动编排 / 活动任务窗口 / 邮箱运营层没有形成真正的“投递 → 领取 → 回执 → 去重”闭环
- **风险等级**：P0
- **影响范围**：主题周、活动编排、限时任务窗口、邮件运营、活动奖励可信度、QA 样例回归
- **触发条件**：周切换或换季触发活动编排；玩家进入活动周并尝试从邮箱验证奖励与活动同步
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts`
  - `taoyuan-duli/server/src/taoyuanMailbox.js`
  - `taoyuan-duli/server/src/routes/api.js`
- **问题是什么**：
  - 前端活动层能切活动状态、算 `pendingMailTemplateIds`、管理活动任务窗口；
  - 服务端邮箱也有完整 campaign / claim / claim-all / save sync 能力；
  - 但两者之间**没有被真正打通**。
  - 同时，前端的 `markEventCampaignMailClaimed()` / `markActivityRewardMailClaimed()` 并没有接到真实邮箱领取流程。
- **为什么会发生**：
  - 前端活动 store 与后端邮箱系统各自都有一套“邮件状态”，但没有统一权威回执源；
  - 活动状态算出来了，却没有稳定桥接层去驱动邮箱下发，再把领取结果回写回来。
- **具体后果**：
  - 活动面板看起来在运行，但玩家可能收不到对应邮件；
  - 即使收到邮件，前端活动层也未必知道“已经领过”；
  - 会直接影响主题周、QuestView、MailView、引导摘要、运营态一致性。
- **修复建议**：
  1. 建立 activity-to-mail bridge，把 `pendingMailTemplateIds` 真正转换成服务端投递请求；
  2. 统一 claimed 的语义，明确到底记录 `templateId` 还是 `campaignId`；
  3. 邮件领取成功后，统一回写 `goalStore` / `questStore` 的活动 mail 状态；
  4. 补集成回归：周切换 → 活动激活 → 邮件投递 → 领取 → 重载 → 不重复。

### 2. 瀚海扑克 / 恶魔轮盘结算完全信任前端结果，可被伪造且存在重复结算窗口
- **风险等级**：P0
- **影响范围**：瀚海赌场、后期经济、票券/奖励池、样例档可信度、平衡验证
- **触发条件**：
  - 正常 UI 结算；
  - 控制台直接调用结算函数；
  - 同一局在没有持久结算标记时反复触发 `endTexas` / `endBuckshot`。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/components/game/TexasHoldemGame.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/BuckshotRouletteGame.vue`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts`
- **问题是什么**：
  - `startTexas()` / `startBuckshot()` 扣钱后不保存权威对局 session；
  - `endTexas(finalChips, tierName)` 与 `endBuckshot(won, draw)` 直接按 UI 传入参数结算发奖；
  - 没有“当前局”“本局已结算”“参数是否可信”的校验。
- **为什么会发生**：
  - 赌场小游戏使用了“组件产出结果，store 只负责发奖”的模式。
- **具体后果**：
  - 奖励可被伪造；
  - 后期经济会被快速击穿；
  - QA 和数值验证结果不可信。
- **修复建议**：
  1. 给 Texas / Buckshot 增加 `activeSession`、`settled`、`seed`、`betCost` 等状态；
  2. `end*` 只能结算当前 session，且只能一次；
  3. 核心胜负逻辑应尽量回收到 store，而不是信任组件回传结果。

### 3. 博物馆学者委托在“已完成且已领奖”后仍可重新接取，形成重复领奖漏洞
- **风险等级**：P0
- **影响范围**：博物馆持续经营、钱/声望/物品奖励、NPC 好感、后期收益平衡
- **触发条件**：完成并领取一次学者委托后再次接取，且当前馆内评分/访客热度继续满足自动完成条件
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useMuseumStore.ts`
- **问题是什么**：
  - `acceptScholarCommission()` 拦截了 `isAccepted` 与 `isRewardPending`，但**没有拦截“已领奖”终态**；
  - `claimScholarCommissionReward()` 只写 `rewarded: true`，没有把委托封闭成不可重开状态。
- **为什么会发生**：
  - 学者委托状态机缺少明确的 `rewarded-finalized` 终态，或缺少按周重置的明确边界。
- **具体后果**：
  - 可反复刷钱、刷声望、刷奖励道具与支援 NPC 好感；
  - 博物馆成为无限收益池。
- **修复建议**：
  1. 明确状态机：`available / accepted / completed_unclaimed / rewarded / expired`；
  2. `acceptScholarCommission()` 显式拦截 `rewarded`；
  3. 若设计为周重置，应加入 `weekId` 约束，而非任意重复接取。

### 4. 村庄建设“捐赠计划”属于伪完成功能，且当前实现存在资源绕过 / 刷进度风险
- **风险等级**：P1
- **影响范围**：WS02 村庄建设终局资金池 2.0、经济回收、材料消耗、里程碑奖励可信度
- **触发条件**：
  - 当前玩家尝试体验捐赠计划时发现无入口；
  - 后续若将现有 store API 直接接到页面，会出现不扣资源刷进度风险。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue`
  - `taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue`
  - 实施方案：`T017-T020`
- **问题是什么**：
  - store 中已有 `donateToProject()`、`claimDonationMilestone()`、`donationStates`；
  - 但页面只有“摘要”，缺少真正捐赠和里程碑领取入口；
  - 更关键的是，当前捐赠逻辑被指出**只累加进度，不扣库存/仓库物资，也没有完整事务回滚**。
- **为什么会发生**：
  - WS02 处于“数据与摘要先落地，玩家操作和事务安全未收口”的状态；
  - 与实施方案中未开始的 T017-T020 一致。
- **具体后果**：
  - 现在是伪可玩；
  - 未来一旦直接接线，很可能产生刷进度漏洞。
- **修复建议**：
  1. 把捐赠改成原子流程：校验 `inventory + warehouse` → 扣物 → 更新状态 → 失败回滚；
  2. 里程碑必须定义真实奖励并发放；
  3. 短期做不完就隐藏捐赠摘要，避免误导玩家认为它已完成。

### 5. 导入存档只做“结构可解析”校验，不做语义级加载验证；同时版本迁移治理仍停留在宽松 fallback
- **风险等级**：P1
- **影响范围**：旧档兼容、坏档恢复、样例档可信度、后续 schema 演进
- **触发条件**：导入旧档、脏字段档、结构看似合法但语义不完整的档案
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useBreedingStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useFishPondStore.ts`
  - `taoyuan-duli/taoyuan-main/src/data/goals.ts`
- **问题是什么**：
  - `importSave()` 只校验能否 `parseSaveData + normalizeSaveEnvelope`，不走完整 `applySaveData()` 语义验证；
  - `SAVE_VERSION` 长期停留在较低版本，`migrateSavePayload()` 更多是补默认值，而非严格版本迁移；
  - 育种、鱼塘等复杂结构对脏档/旧档的容错仍不足。
- **为什么会发生**：
  - 当前迁移策略是“SaveStore 顶层补缺 + 各 store 自己 deserialize fallback”，缺少版本化 migration registry。
- **具体后果**：
  - 坏档可能“导入成功但未来加载/跨天爆炸”；
  - 某些旧档字段即使被补齐，也可能跨系统语义错位；
  - 后期越复杂，坏档定位越困难。
- **修复建议**：
  1. `importSave()` 写盘前先做完整语义级加载验证；
  2. 建立按版本分段的迁移器；
  3. 给育种 / 鱼塘复杂结构加 normalize 层，脏数据降级处理而不是直接入运行态；
  4. 提升 `SAVE_VERSION` 并围绕旧样例补迁移回归。

### 6. `familyWishCompletions` 已进入正式目标系统，但运行时永远返回 0，会制造不可完成的正式周目标
- **风险等级**：P1
- **影响范围**：家庭 / 配偶 / 仙灵陪伴循环、主题周目标、票券回流、周任务可信度
- **触发条件**：进入绑定 `familyWishCompletions` 的主题周或相关周目标
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/data/goals.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`
- **问题是什么**：
  - 配置层已把 `familyWishCompletions` 作为正式 Goal metric；
  - 但 `useGoalStore.getMetricValue()` 对该指标直接返回 0。
- **为什么会发生**：
  - 配置先接入，真实状态源没有接上。
- **具体后果**：
  - 玩家会看到永远做不完的正式目标；
  - QA 会误判为平衡或数值问题，实际是死指标。
- **修复建议**：
  - 要么立即接到 `useNpcStore` 的真实完成计数；要么先从周目标配置移除。

### 7. 日结总线 `useEndDay.ts` 过于庞大且高度顺序敏感，已经成为全项目最脆弱的联动中枢
- **风险等级**：P1
- **影响范围**：日结、周结、换季、主题周、活动、家庭、鱼塘、市场、预算、快照、引导摘要
- **触发条件**：新增系统日更逻辑、修改结算顺序、修一个系统时影响另一个系统
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
- **问题是什么**：
  - `useEndDay.ts` 已承担几乎全部核心推进；
  - 不只是代码长，而是**跨系统因果关系强依赖顺序**。
- **为什么会发生**：
  - 项目把“复杂中后期循环编排”收口到了单一 orchestrator，但没有显式阶段边界。
- **具体后果**：
  - 任何新增逻辑都可能造成今天/昨天错结算、活动晚一拍、周预算与周快照先后顺序错误等隐性 bug。
- **修复建议**：
  1. 拆分为 `preAdvance / advanceCalendar / dailyPost / weeklyBoundary / seasonBoundary / uiDigest` 等阶段；
  2. 明确每阶段输入输出；
  3. 为跨周、换季、活动切换建立集成回归。

### 8. QA 与灰度治理能力大量存在于正式玩家页面或 DEV-only 工具里，既污染正式体验，也不足以支撑正式 QA
- **风险等级**：P1
- **影响范围**：UI 信息层级、QA 回归效率、环境边界、交付稳定性
- **触发条件**：
  - 玩家进入 Wallet / Quest / Breeding / Guild / Museum / Hanhai / Npc / Shop；
  - QA 在非 DEV 环境尝试复现中后期问题。
- **涉及文件**：
  - `QaGovernancePanel.vue`
  - 多个 `src/views/game/*.vue`
  - `src/views/dev/LateGameDebugView.vue`
  - `src/router/index.ts`
- **问题是什么**：
  - QA 治理面板系统性进入正式玩法页；
  - 另一方面，真正高效的样例档/切周/调试能力又只在 DEV 可用。
- **为什么会发生**：
  - 治理信息与玩家信息未分层；
  - 调试工具以开发便利为中心，而不是 QA 环境可用性为中心。
- **具体后果**：
  - 正式玩家会看到“灰度、回滚、迁移、回归套件”一类内部术语；
  - QA 在 staging/预发布包里又拿不到好用的后期复现工具。
- **修复建议**：
  1. 将 `QaGovernancePanel` 收回 DEV / QA / admin 条件展示；
  2. 给 QA/staging 提供受控的样例档加载与周切换工具，而不是完全依赖 DEV-only 路由。

---

## C. 中低优先级问题（P2）

### 1. 经济推荐真源已经分叉，Goal / Wallet / Shop 各算一套推荐
- **风险等级**：P2
- **涉及文件**：
  - `useGoalStore.ts`
  - `WalletView.vue`
  - `ShopView.vue`
- **问题**：推荐资金去向与目录推荐在多个层各自打分，口径不完全一致。
- **后果**：同一存档跨页可能出现不同推荐结论。
- **建议**：收敛为单一 store 真源，页面只展示。

### 2. 家庭分工与仙灵祝福虽然已接入多系统，但缺少统一关系总览页 / 总览卡
- **风险等级**：P2
- **涉及文件**：
  - `HomeView.vue`
  - `NpcView.vue`
  - `QuestView.vue`
  - `BreedingView.vue`
- **问题**：家庭心愿、婚后分工、知己项目、仙灵祝福分散在多个页面摘要中。
- **后果**：玩家知道系统存在，但难以快速判断当前关系线状态。
- **建议**：在 NPC / 村庄页增加关系总览卡，统一展示家庭 wish、婚后分工、仙灵祝福。

### 3. 路由和信息架构平铺过重，后期页面虽多但域边界不清
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/router/index.ts`
- **问题**：`/game` 下二十多个子路由平铺，村庄、社交、建设、终局拓展边界散乱。
- **建议**：按经营 / 社交家庭 / 终局拓展 / 系统面板做二级导航分层。

### 4. FishPond / Guild / Hanhai / Npc 等后期页面尚未完全纳入统一 guidance 真源
- **风险等级**：P2
- **涉及文件**：
  - `src/stores/useTutorialStore.ts`
  - `FishPondView.vue`
  - `GuildView.vue`
  - `HanhaiView.vue`
  - `NpcView.vue`
- **问题**：WS11 的 guidance surface 覆盖不均，鱼塘尤其掉队。
- **建议**：补入统一 surface/page id，与 Wallet / Quest / Museum / Breeding 同口径摘要。

### 5. 样例档存在双源认知：`sampleSaves.ts` 才是真运行时，`data-defaults/taoyuan_saves` 更像元信息镜像
- **风险等级**：P2
- **涉及文件**：
  - `src/data/sampleSaves.ts`
  - `data-defaults/taoyuan_saves/*.json`
  - `src/stores/useSaveStore.ts`
- **问题**：QA / 策划容易误判哪份才是实际加载源。
- **建议**：统一来源，或让 defaults 由运行时样例自动生成。

### 6. 静态质量门当前仍有噪音，lint 未完全通过
- **风险等级**：P2
- **涉及文件**：
  - `src/types/guild.ts`
  - `src/views/GameLayout.vue`
  - `src/views/MainMenu.vue`
  - `src/App.vue`
  - `src/components/game/SaveManager.vue`
- **问题**：存在重复定义、空 catch、floating promise 等静态质量问题。
- **建议**：尽快清理 lint 噪音，否则真正问题会被埋没。

### 7. 后端缺少最小自动测试，邮箱 / 服务端存档 / 账号链路只能依赖手测
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/server/package.json`
- **问题**：没有正式 `test` script，服务端关键链路缺少自动回归。
- **建议**：至少补登录、邮箱读取、领取奖励、服务端存档读写测试。

### 8. 核心 store / 编排器 / 页面体量过大，已进入“能跑但很难稳改”的阶段
- **风险等级**：P2
- **涉及文件**：
  - `useQuestStore.ts`
  - `useEndDay.ts`
  - `useGoalStore.ts`
  - `useSaveStore.ts`
  - `useHanhaiStore.ts`
  - `useMuseumStore.ts`
  - `ShopView.vue`
  - `NpcView.vue`
- **建议**：按“状态定义 / 选择器 / 周期结算 / 奖励事务 / 调试接口 / 存档迁移 / 摘要组件”拆分。

### 9. `GoalStore`、`SaveStore`、`VillageProjectStore` 都在向“上帝模块”演化
- **风险等级**：P2
- **涉及文件**：
  - `useGoalStore.ts`
  - `useSaveStore.ts`
  - `useVillageProjectStore.ts`
- **问题**：职责不断外扩，既做状态真源，又做推荐、编排、治理、兼容、摘要聚合。
- **建议**：及早拆域，否则越往后期越难动。

### 10. `MailView` 可领真实邮箱奖励，但当前没有给玩家明确反馈“是否已同步活动运营层”
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue`
- **建议**：在活动邮件领取成功后显示“已同步活动编排状态”的提示，并联动 Quest / Guidance 页更新。

---

## D. 值得肯定的实现

### 1. 大部分后期系统并非只停留在 data/types，已经接入真实循环主链
三份报告都认同这一点：主题周、活动、目录推荐、博物馆、公会、瀚海、育种、鱼塘、家庭/仙灵等系统并不是“配置摆设”，很多已经真实连到了 `useEndDay`、`store` 与页面摘要层。这是项目的最大优点之一。

### 2. `useSaveStore.applySaveData()` 的“先备份、全量 reset、失败回滚”思路是成熟的
- **涉及文件**：`src/stores/useSaveStore.ts`
- 虽然 SaveStore 过大，但其加载事务设计本身是对的，比“半加载半残留”安全得多。

### 3. 样例档 + DEV 调试页的方向正确，且四套样例档覆盖面合理
- **涉及文件**：
  - `src/data/sampleSaves.ts`
  - `src/views/dev/LateGameDebugView.vue`
  - `src/router/index.ts`
- `late_economy_foundation / breeding_specialist / fishpond_operator / endgame_showcase` 的分工清晰，非常适合继续工程化成正式 QA 回归输入。

### 4. 钱袋页、引导摘要、跨系统推荐视图已经开始承担“后期经济治理解释层”职责
- **涉及文件**：
  - `WalletView.vue`
  - `GuidanceDigestPanel.vue`
  - `useTutorialStore.ts`
  - `useMuseumStore.ts`
  - `useGuildStore.ts`
  - `useHanhaiStore.ts`
- 这说明项目不只是堆功能，也在尝试解决“玩家现在该做什么”的问题，方向是对的。

### 5. 后端邮箱系统本身能力是完整的，不是从零开始
- **涉及文件**：
  - `server/src/taoyuanMailbox.js`
  - `server/src/routes/api.js`
- 这非常重要：当前问题不是“根本没有邮箱系统”，而是“活动编排没有接上已经存在的邮箱系统”。这意味着修复空间明确。

### 6. 多个 WS 工作流使用了 baseline audit / tuning config / release checklist 等统一模式
这说明项目已经具备系统化交付意识，而不是纯堆代码。只要边界和闭环再压实，后续维护会更有秩序。

---

## E. 建议的下一轮整改顺序

### 第一优先级：先修真实会坏经济 / 会刷奖励 / 会坏闭环的问题
1. **打通活动编排 × 邮箱系统闭环**：活动投递、领取、回执、去重统一收口。  
2. **修瀚海赌场结算可信度**：引入 session / 一次性结算 / 参数校验。  
3. **修博物馆学者委托状态机**：杜绝“已领奖后可再接”。

### 第二优先级：修 WS02 伪完成功能与存档风险
4. **补村庄建设捐赠计划完整流程**：UI 入口、扣物、里程碑奖励、事务回滚。  
5. **改 `importSave()` 为语义级验证**。  
6. **建立正式版本迁移层**：提升 `SAVE_VERSION`，拆 migration registry。  
7. **补 `familyWishCompletions` 真状态源**，或先移除相关目标配置。

### 第三优先级：修 QA 与玩家面的环境边界
8. **把 QA 治理面板从正式玩家主页面中剥离 / 折叠**。  
9. **给 QA/staging 提供受控的样例档与切周工具**，不再完全依赖 DEV-only。  
10. **修调试页“跳日期”不走真实编排的问题**。

### 第四优先级：统一真源与摘要层
11. **统一活动 / 邮件 / 任务窗口的权威状态源**。  
12. **统一经济推荐真源**：Goal / Wallet / Shop 不再各算一套。  
13. **增加“本周主路线建议”总卡**：聚合主题周、活动、预算、特殊订单、资金去向。  
14. **把鱼塘、公会、瀚海、陪伴页纳入统一 guidance surface**。

### 第五优先级：做结构化拆分与自动化回归
15. **拆 `useEndDay`、`useQuestStore`、`useGoalStore`、`useSaveStore`、`VillageProjectStore`**。  
16. **补前端 store 级回归**：样例档、跨天、跨周、换季、主题周、活动邮件、旧档迁移。  
17. **补后端最小自动测试**：登录、邮箱、领取、服务端存档。  
18. **把四套样例档纳入正式 smoke / E2E 输入**。

---

## 附：关于“是否全部完成”的综合判断

综合 `claude-审查.md` 的实施方案核对、`codex-审查.md` 的可玩性与收口审计、`cline-审查.md` 的状态一致性与奖励漏洞审计，可以给出比较明确的最终判断：

- **大部分中后期系统已真实落地并可进入游玩流程**；
- **但任务并未全完成**；
- 尤其是 **WS02 村庄建设终局资金池 2.0**、**WS04 市场系统调参与 QA 收口**、**WS10 活动邮件运营闭环**，都仍存在明显未完成或半完成状态；
- 同时还有数个“不是实施方案 checklist 上未完成、但现实中会出严重 bug”的高优先级问题（赌场结算、学者委托重复领奖、导档只做结构校验）。

换句话说：**现在最需要的不是继续扩功能面，而是先做一轮“闭环、事务、安全、迁移、QA 能力”的治理修复。**

---

## 第二轮合并修订（同步 codex / claude / cline 最新复审）

> 本节用于吸收三份报告后续新增内容，尤其是 `cline-审查.md` 的第二轮复审补充，以及 `claude-审查.md` 对 WS02 / 活动邮箱 / QA 面板边界的修正判断。

### 一、需要从主结论中更新的事项

#### 1. 部分旧高优先级问题已经从“现存漏洞”转为“已修复或已部分修复”
当前代码状态下，以下问题不应再按最初版本原样保留：

- **学者委托已领奖后可重复接取**：`useMuseumStore.ts` 已在 `acceptScholarCommission()` 中拦截 `commission.state.rewarded`，主漏洞已基本关闭；
- **`importSave()` 只做结构校验**：`useSaveStore.ts` 已经补上一次真实 `applySaveData()` 验证，再恢复运行态，语义级校验已进入主流程；
- **`familyWishCompletions` 死目标**：`useGoalStore.ts` 已改为读取真实家庭心愿完成数，不再永远返回 `0`；
- **村庄捐赠完全伪功能**：`useVillageProjectStore.ts` 已补物资校验、扣物、里程碑奖励，`HomeView.vue` 也已接入最小玩家操作入口。

**综合判断**：这些问题在 `agent-审查.md` 中仍应保留历史记录，但结论要明确改成“已修复 / 已部分修复 / 仍需观察”，不能继续当作完全未处理的问题。

#### 2. 活动邮箱问题已从“完全未接线”演变为“已接线但状态语义混乱”
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
  - `taoyuan-duli/taoyuan-main/src/utils/mailboxApi.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts`
  - `taoyuan-duli/server/src/routes/api.js`
- **最新判断**：
  - 活动系统邮件已经开始真实投递；
  - `MailView.vue` 领取后也会回写活动层状态；
  - 但 `markEventCampaignMailClaimed()` 的语义仍不干净：当前既被“投递成功”调用，又被“玩家领取成功”调用，导致“已投递”和“已领取”被混在同一状态集合里。
- **综合结论**：
  - 该问题仍是高优先级；
  - 但重点应从“补接线”调整为“拆分投递态 / 领取态 / 回执态”。

### 二、仍然成立且需要继续保留的高优先级问题

#### 1. 瀚海赌场仍然不是权威结算，P0 结论继续保留
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/TexasHoldemGame.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/BuckshotRouletteGame.vue`
- **现状修订**：
  - 现在已有 `sessionId`、`activeTexasSession`、`activeBuckshotSession`，说明“无会话直接结算”的问题已缓解；
  - 但 Texas 仍信任前端上传的 `finalChips`，Buckshot 仍信任前端上传的 `won/draw`；
  - 因此问题只是从“完全裸奔”下降为“带票据的客户端裁决”，**并未真正闭环**。

#### 2. 调试页依旧不是完整真实周结链
- **涉及文件**：`taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue`
- **现状修订**：
  - 现在文案已明确提示“覆写日期（不跑完整结算）”；
  - 但能力本身仍不执行完整 `useEndDay` 跨系统编排，所以仍不能作为真实回归依据。

#### 3. QA 面板污染正式玩家页面的问题仍成立
- **涉及文件**：
  - `WalletView.vue`
  - `BreedingView.vue`
  - `FishPondView.vue`
  - `GuildView.vue`
  - `HanhaiView.vue`
  - `MuseumView.vue`
  - `NpcView.vue`
  - `QuestView.vue`
  - `ShopView.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/QaGovernancePanel.vue`
- **最新补充判断**：
  - 组件内部虽有 `import.meta.env.DEV` 显示门禁，但正式页面仍直接依赖该组件；
  - 这意味着“页面不显示”不等于“生产代码不污染”。

### 三、来自 codex / claude 的新增或强化结论

#### 1. WS02 完成度应下调：村庄建设不是“接近收尾”，而是“已接入但仍处于部分完成”
- **来源**：`claude-审查.md` 第二轮修正判断 + `codex-审查.md` 的 WS02 审查
- **综合判断**：
  - 虽然捐赠现在已可操作、已扣物、已能领奖；
  - 但 WS02 不只是“捐赠能点一下”就算完成，它还包括：
    - 跨系统联动闭环；
    - 事务安全与防刷处理；
    - 调参与运营开关；
    - QA、数值验收与上线文档；
  - 因此 `T017-T020` 仍应视作没有真正收口。

#### 2. 市场系统（WS04）仍然没有完成最后两项收口
- **来源**：`claude-审查.md`
- **涉及实施方案任务**：`T039`、`T040`
- **综合判断**：
  - 即便市场与动态通胀逻辑大体落地，调参与 QA / 验收文档仍未真正完成；
  - 因而“任务是否全完成”的答案依然是否定的。

#### 3. 最新一轮编译曾出现大面积类型回归，暴露出结构性风险
- **来源**：`cline-审查.md` 第二轮补充 + type-check 报错记录
- **涉及文件**：
  - `useHanhaiStore.ts`
  - `useMuseumStore.ts`
  - `useVillageProjectStore.ts`
  - `useQuestStore.ts`
  - `useSaveStore.ts`
  - `useTutorialStore.ts`
  - `HanhaiView.vue`
  - `HomeView.vue`
  - `QuestView.vue`
  - `MuseumView.vue`
  - `NpcView.vue`
- **结论**：
  - 虽然后续一度把 `type-check` 跑过，但这批错误已经证明：store 之间的互相引用、隐式 any、宽松边界、computed 缺显式类型并不是“偶发现象”，而是当前工程的结构性风险。

#### 4. 前端 QA 能力已有进展，但后端回归仍严重缺位
- **来源**：`codex-审查.md` + `cline-审查.md` 第二轮补充
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/package.json`
  - `taoyuan-duli/taoyuan-main/scripts/qa-late-game-samples.mjs`
  - `taoyuan-duli/server/package.json`
- **综合判断**：
  - 前端现在已有：`qa:late-game-samples`、`qa:late-game`、`type-check`、`lint` 这类基础命令；
  - 但后端仍没有 `test` script；
  - 活动邮件、服务端存档、账号态这几条关键链路依然缺自动化回归。

### 四、对整改优先级的最新统一调整

结合三份报告的最新结论，`agent-审查.md` 的整改顺序建议更新为：

1. **继续把瀚海赌场保留为最高优先级**，不要因为 session 校验已补就误判为已修复。  
2. **活动邮件问题升级为“状态语义治理”**：投递、可见、领取、回执分层。  
3. **WS02 / WS04 的收口工作继续保留为“任务未完成”证据**，不要被局部接线迷惑。  
4. **把“类型边界与 store 循环依赖治理”前移**，因为最新 type-check 曾暴露出会阻断开发的真实工程风险。  
5. **前端 QA 脚本视为已取得进展**，但后端测试必须提前补齐。  
6. **正式玩家页面中的 QA 面板问题继续保留，不应因为 DEV 门禁存在就判定为已解决。**

---

## 第三轮合并修订（同步 2026-04-13 全链路 subagent 复审）

> 本节用于吸收最新一轮“整个游戏代码全链路复审”的新增判断；若与前文更早阶段结论冲突，以本节与文首“整改完成情况（2026-04-13）”为准。

### 一、需要上调的最新系统性问题

#### 1. 邮箱奖励链路存在“奖励落点”和“当前前端会话”双权威源冲突
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue`
  - `taoyuan-duli/server/src/routes/api.js`
  - `taoyuan-duli/server/src/taoyuanMailbox.js`
  - `taoyuan-duli/server/src/taoyuanHall.js`
- **综合判断**：
  - 前端当前正在玩的档，与服务端邮箱奖励真正写入的档，并不总是同一份；
  - 尤其在 `storageMode !== 'server'` 时，前端会跳过 reload，但 UI 仍可能提示奖励已发放到当前存档；
  - 同时 `GET /taoyuan/save/:slot` 当前还会改写服务端 `active slot`，让“读取哪个槽位”本身影响后续邮件奖励落点。

#### 2. 正式环境的调试边界仍未真正封死
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/MainMenu.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useSettingsStore.ts`
- **综合判断**：
  - 虽然调试页与手动设置 debug override 的 UI 受 DEV 门禁控制；
  - 但正式环境仍可通过“导入带覆盖字段的存档”恢复 `lateGameFeatureOverrides / lateGameBalanceOverrides`；
  - 因而这不是纯开发体验问题，而是正式环境配置污染风险。

### 二、对旧结论的进一步纠偏

#### 1. 瀚海赌场问题要拆成 Texas 与 Buckshot 两条判断
- **综合判断**：
  - Buckshot 已通过 `playerActions + session` 在 store 内复盘输赢，旧版“完全信任布尔值”的结论应撤回；
  - Texas 仍提交 `finalChips` 给 store，旧版“赌场问题未收口”仍成立，但应明确主残留点在 Texas，而不是整个赌场所有游戏一刀切。

#### 2. 活动邮箱问题不应只写成“状态语义混乱”
- **综合判断**：
  - “投递态 / 领取态混用”仍然成立；
  - 但本轮更重要的新证据是：**邮箱奖励最终到账哪个存档** 这件事本身并不稳定，因此该问题已经上升为数据一致性问题，而不只是状态机命名问题。

### 三、验证链路的最新统一判断

1. **样例档真实运行时来源** 仍是 `src/data/sampleSaves.ts`，不是 `data-defaults/taoyuan_saves/*.json`。  
2. **`qa-late-game-samples.mjs`** 仍偏静态字段校验，不覆盖 `applySaveData()` 后的真实页面/跨日/跨周副作用。  
3. **前端 QA 能力已有进展**，但后端邮箱 / 服务端存档 / 账号态依然缺少最小自动测试。  
4. **`LateGameDebugView`** 仍不是完整结算推进器，只能作为开发期日历覆写工具，不能替代真实周结验证。

## 整改进度（2026-04-12，Codex 第一轮）

以下问题已进入“已整改”状态：

- 已整改：`familyWishCompletions` 死目标。
  - `src/stores/useGoalStore.ts` 已改为读取真实家庭心愿完成数，不再固定返回 `0`。

- 已整改：瀚海周快照在跨周时先重置后归档的问题。
  - `src/composables/useEndDay.ts` 已在 `processCycleTick()` 前缓存瀚海周完成数，并在 `archiveWeeklyMetricSnapshot()` 时带入覆盖值。

- 已整改：活动邮件状态键错配与“活动页只显示模板名、不真正投递邮件”的问题。
  - `src/utils/mailboxApi.ts`、`server/src/routes/api.js`、`server/src/taoyuanMailbox.js` 已新增玩家侧系统活动邮件投递接口。
  - `src/composables/useEndDay.ts` 已在活动切换后自动尝试投递活动邮件。
  - `src/stores/useGoalStore.ts` 已统一活动邮件 receipt key 口径。
  - `src/views/game/MailView.vue` 已在领取活动奖励时回写活动层与活动任务窗口层状态。

- 已整改：村庄捐献“只加进度、不扣物资”的高风险漏洞。
  - `src/stores/useVillageProjectStore.ts` 现已先校验并扣除背包/仓库物资，再更新捐献状态，失败会回滚。
  - `src/views/game/HomeView.vue` 已补最小捐赠与里程碑领取入口。

- 已整改：育种与鱼塘旧档反序列化校验不足。
  - `src/stores/useBreedingStore.ts` 已增加种子 genetics normalize。
  - `src/stores/useFishPondStore.ts` 已增加 `pond.breeding` 结构校验。

- 已整改：当前静态质量门阻塞项。
  - `npm --prefix taoyuan-duli/taoyuan-main run type-check` 通过。
  - `npm --prefix taoyuan-duli/taoyuan-main run lint` 通过。
  - `node --check taoyuan-duli/server/src/taoyuanMailbox.js` 通过。
  - `node --check taoyuan-duli/server/src/routes/api.js` 通过。

- 已整改：QA 治理面板污染正式玩家页面。
  - `src/components/game/QaGovernancePanel.vue` 现仅在 `DEV` 环境显示。

- 已整改：鱼塘页完全脱离统一治理首屏体系。
  - `src/views/game/FishPondView.vue` 已接入 QA 治理面板。

- 已整改：学者委托已领奖后仍可再次接取。
  - `src/stores/useMuseumStore.ts` 已阻止 `rewarded` 状态的学者委托再次接取。

- 已部分整改：家庭心愿 / 知己协作主循环伪完成。
  - `src/stores/useNpcStore.ts` 已补最小自动编排：周切换时自动激活家庭心愿、自动注册知己项目、自动推进基础周进度并记录日志。

- 已部分整改：存档版本治理名义化。
  - `src/stores/useSaveStore.ts` 的 `SAVE_VERSION` 已提升到 `3`，`src/data/sampleSaves.ts` 与 `WS12_SAVE_MIGRATION_PROFILES` 也已同步推进到 `3`。

- 已整改：学者委托已领奖后仍可再次接取。
  - `src/stores/useMuseumStore.ts` 已阻止 `rewarded` 状态的学者委托再次接取。

以下问题已在第三轮整改中完成收口：

- 已整改：家庭心愿 / 知己协作主循环已补齐真实奖励、失败重试保护与玩家主动入口，`HomeView` 可直接安排下一条家庭心愿并登记下一条知己协作。
- 已整改：村庄捐献里程碑已补齐真实奖励配置，`claimDonationMilestone()` 现会先发奖再记状态，不再停留在“只记录已领取”的伪闭环。
- 已整改：QA 自动化已补仓内 Node 命令，`npm run qa:late-game-samples` 可直接核查 4 套后期样例档，不再只能依赖 DEV 路由与外部 Python。
- 已整改：经济推荐真源已统一收敛到 `goalStore.recommendedEconomySinks`，且 `fishpond / guild / hanhai / npc` 已补入 `GuidanceDigestPanel`，统一 guidance / governance 覆盖不再只停留在原先的 5 个页面。
