# 桃源乡系统性审查

## A. 总体结论
项目已经完成了 120 项中后期主线扩展，整体呈现出“配置驱动 + store 聚合 + 页面摘要”的成熟方向，尤其在主题周、活动层、后期经济治理、引导摘要、治理面板、样例档与结构化日志方面，已经具备继续扩展的工程底子。但从“是否真的能玩、是否稳定、是否可维护、是否容易出错”四个维度看，当前仍存在几类明显短板：一是若干后期链路属于“表面完成、实际未闭环”，典型如活动邮箱运营、村庄捐献、家庭心愿周目标与灰度治理；二是旧档兼容仍依赖大量宽松 fallback，而不是严谨的版本迁移；三是 QA 自动化和部分页面信息层级仍不够工程化，导致真实回归成本高。  
本轮审查覆盖了 `taoyuan-main/src` 与 `server/src` 的核心后期系统，完成了 `npm run type-check` 与 `npm run lint` 检查；其中 `type-check` 通过，但 `lint` 当前失败。已确认本地 `5173` 开发服可访问、样例档与 `LateGameDebugView` 入口存在；但仓库内现有 Playwright 动态审查脚本依赖 Python，当前环境缺少 `python/py`，无法直接执行，这本身也是一条 QA 能力问题。

## B. 高优先级问题（P0 / P1）
未发现我能高置信确认的 `P0`。以下是本轮最需要优先修复的 `P1` 问题。

### 1. 村庄捐献链路既不可玩，又存在资源绕过风险
- 风险等级：`P1`
- 影响范围：村庄建设后期循环、经济回收、维护/捐献规划、里程碑奖励可信度
- 触发条件：调用捐献计划相关 store API，或后续把该 API 接到页面时
- 涉及文件：
[useVillageProjectStore.ts#L798](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts#L798)  
[useVillageProjectStore.ts#L835](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts#L835)  
[HomeView.vue#L31](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue#L31)  
[HomeView.vue#L61](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue#L61)  
[NpcView.vue#L1093](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue#L1093)
- 为什么会发生：`donateToProject()` 只累加 `totalAmount` 和 `donatedItems`，既不校验玩家是否真的持有对应物资，也不从背包/仓库扣除；`claimDonationMilestone()` 只记录 `claimedMilestoneIds` 和日志，没有任何实际奖励发放。同时，页面层只展示“捐赠计划”摘要，视图里实际只接了 `completeProject()` 和 `payProjectMaintenance()`，没有捐献与里程碑领取入口，导致这条玩法既是“伪完成”，又一旦接线就会形成直接刷进度漏洞。
- 修复建议：把捐献操作改成和建设完成类似的事务链路：先校验 `inventory + warehouse`，再扣物资，再写状态，再发奖励；里程碑必须定义并发放真实 reward；如果短期不准备做完，页面侧应隐藏“捐赠计划”并去掉可误解的展示。

### 2. 活动邮箱运营层没有真正落地，且“已领”状态口径错配
- 风险等级：`P1`
- 影响范围：主题周 + 活动编排 + 邮箱运营层、活动回流、邮件领奖、运营链路可信度
- 触发条件：进入带 `mailboxTemplateIds` 的活动周，或未来补接邮件投递时
- 涉及文件：
[useGoalStore.ts#L1355](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1355)  
[useGoalStore.ts#L1379](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1379)  
[QuestView.vue#L21](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/QuestView.vue#L21)  
[MailView.vue#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/MailView.vue#L1)  
[useMailboxStore.ts#L95](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts#L95)
- 为什么会发生：活动编排 tick 只计算 `pendingMailTemplateIds`，但 `useEndDay` 没有把这些模板投递到邮箱；任务页目前只是显示“结算模板”名称，邮箱页只展示 `mailboxStore.mails` 中已经存在的服务端邮件。更严重的是，`markEventCampaignMailClaimed()` 写入的是 `campaignId`，而 `processEventOperationsTick()` 过滤待处理邮件时比对的是 `templateId`，即使后续补接邮件投递，这个状态字段也会“永远对不上”。
- 修复建议：建立活动模板到邮箱投递的明确桥接层；统一 `claimedMailCampaignIds` 的语义，明确到底存 `templateId` 还是 `campaignId`；补上从邮件领取回执反写活动状态的闭环；没有真正投递前，不要在任务页把模板名展示成已落地功能。

### 3. 同一主题周允许挂多个活动，但运行态只会激活第一个
- 风险等级：`P1`
- 影响范围：WS10 活动编排、限时任务窗口、活动节奏与主题周承接
- 触发条件：同一个主题周被配置多个 campaign 时
- 涉及文件：
[goals.ts#L786](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/goals.ts#L786)  
[useGoalStore.ts#L1225](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1225)  
[useGoalStore.ts#L1397](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1397)  
[useQuestStore.ts#L2309](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts#L2309)
- 为什么会发生：配置层允许一个主题周挂多个 `linkedThemeWeekIds`，但 `currentEventCampaign` 与 `processEventOperationsTick()` 都使用 `find(...)`，只取第一个匹配项；`QuestStore` 的活动窗口也只承接单一 `activeEventCampaignId`。结果是后续 campaign 在配置上存在、在运行时却不可达，属于典型“data 配了，但业务层只支持 1 个”的伪多活动实现。
- 修复建议：要么在配置层显式限制“一周只能有一个活动”，并对重复配置做启动期校验；要么把运行态改为支持活动队列/优先级，而不是 `find(...)`。

### 4. `familyWishCompletions` 已被接入周目标，但运行层永远返回 0
- 风险等级：`P1`
- 影响范围：家庭/配偶/仙灵陪伴循环、主题周目标、票券回流、长期目标可信度
- 触发条件：进入绑定 `familyWishCompletions` 的主题周，如 `late_sink_rotation`、`winter_pond_maintenance`
- 涉及文件：
[goals.ts#L1861](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/goals.ts#L1861)  
[goals.ts#L1984](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/goals.ts#L1984)  
[goals.ts#L2056](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/goals.ts#L2056)  
[useGoalStore.ts#L543](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L543)
- 为什么会发生：配置侧已经把 `familyWishCompletions` 做成正式 `GoalMetricKey` 并生成周目标，但 `useGoalStore.getMetricValue()` 对这个指标直接 `return 0`，没有接任何真实状态源。最终结果就是系统会发放不可完成的正式目标，玩家和 QA 都会看到“永远完成不了”的后期周任务。
- 修复建议：要么立即把 `familyWishCompletions` 接到 `useNpcStore` 的真实完成计数；要么在接线前彻底从 `THEME_WEEK_CROSS_GOAL_METRICS` 和周目标预设中移除。

### 5. 育种与鱼塘的旧档/脏档反序列化校验不足，会在读档或跨天时直接炸链路
- 风险等级：`P1`
- 影响范围：后期样例档、旧档兼容、跨天稳定性、整档回滚
- 触发条件：旧档中 `breedingBox[*].genetics` 缺字段，或 `pond.breeding` 结构不完整
- 涉及文件：
[useBreedingStore.ts#L773](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useBreedingStore.ts#L773)  
[breeding.ts#L209](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/breeding.ts#L209)  
[useFishPondStore.ts#L531](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useFishPondStore.ts#L531)  
[useEndDay.ts#L993](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts#L993)  
[useSaveStore.ts#L702](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L702)
- 为什么会发生：`useBreedingStore.deserialize()` 直接信任 `s.genetics` 并在缺少 `label` 时立刻调用 `makeSeedLabel()`；`useFishPondStore.deserialize()` 直接把 `data.pond.breeding` 原样塞回运行态，`dailyUpdate()` 次日就会继续消费这些字段。结果不是“显示异常”，而是整条读档/日结流程可能抛错，并触发整档回滚。
- 修复建议：为育种种子与鱼塘 breeding state 增加结构化 `normalize` 层；异常条目要降级丢弃或回填默认值，而不是把未校验对象直接放进运行态。

### 6. 存档版本治理名义化：`SAVE_VERSION` 与迁移 profile 不能真正区分代际
- 风险等级：`P1`
- 影响范围：旧档兼容、灰度迁移、版本治理、QA 证据链
- 触发条件：读取任何跨度较大的旧档，或未来继续扩 schema 时
- 涉及文件：
[useSaveStore.ts#L55](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L55)  
[useSaveStore.ts#L125](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L125)  
[goals.ts#L1122](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/goals.ts#L1122)
- 为什么会发生：全项目经历了大量 schema 扩张，但 `SAVE_VERSION` 仍停在 `2`；`migrateSavePayload(payload, _saveVersion)` 甚至没有真正使用版本号做分支迁移；WS12 新增的 migration profile 目标版本也仍是 `2`。这意味着版本治理在名义上存在，实际上无法表达“这份档来自哪一代结构”，很多兼容只是靠默认值兜底，无法精确验证和回归。
- 修复建议：按结构波次提升 `SAVE_VERSION`，为关键版本差异实现显式迁移步骤；为样例档和旧档回放补版本化测试，而不是只依赖 `deserialize` fallback。

### 7. QA/灰度治理面板提供了“切到稳定/灰度、记录发布闸门”的真实操作外观，但几乎不影响真实运行逻辑
- 风险等级：`P1`
- 影响范围：WS12 灰度治理、运营认知、发布决策可信度
- 触发条件：在治理面板上执行灰度切换或发布闸门记录
- 涉及文件：
[QaGovernancePanel.vue#L68](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/components/game/QaGovernancePanel.vue#L68)  
[QaGovernancePanel.vue#L221](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/components/game/QaGovernancePanel.vue#L221)  
[usePlayerStore.ts#L542](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/usePlayerStore.ts#L542)  
[useEndDay.ts#L1465](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts#L1465)
- 为什么会发生：当前 `activeGrayReleaseChannel` 和“release gate completed”主要只改变 `qaGovernanceRuntimeState`、页面文案和治理日志，没有接入任何真实 feature flag 解析、服务端发布通道、路由守卫或玩法行为分支。这会让运营或 QA 误以为自己切了 canary/stable，但实际上核心玩法并没有被灰度。
- 修复建议：要么把灰度/发布闸门接到真实 feature flag 选择逻辑和后端发布通道；要么把面板交互降级为纯调试态，并明确标注“仅记录状态，不改变玩法行为”。

### 8. 自动化审查链不是项目内可执行能力，当前环境无法直接跑动态脚本
- 风险等级：`P1`
- 影响范围：跨周、跨季、旧档兼容、样例档复现与上线前回归效率
- 触发条件：在新机器、CI 或非开发者环境尝试复现现有审查流程时
- 涉及文件：
[package.json](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/package.json)  
[router/index.ts#L11](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/router/index.ts#L11)  
[playwright_dynamic_audit.py](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/playwright_dynamic_audit.py)  
[playwright_system_batch1.py](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/playwright_system_batch1.py)  
[playwright_system_batch2.py](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/playwright_system_batch2.py)  
[playwright_system_batch3.py](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/playwright_system_batch3.py)
- 为什么会发生：动态审查脚本是 Python 文件，仓库本身没有项目内 e2e 命令，也没有声明 `playwright` 依赖；脚本还依赖 `/#/dev/late-game` 与 `__TAOYUAN_LATE_GAME_DEBUG__`。本次审查中本机虽然有 `5173` 开发服，但 `python/py` 均不在 PATH，导致现成脚本无法直接运行。这说明当前自动化回归能力并不是“项目自带能力”，而是“开发者本机习惯”。
- 修复建议：把样例档加载、跨周推进和关键后期 smoke 改造成项目内正式命令；至少做到“装依赖后可一键跑”，而不是依赖外部 Python 和 DEV-only 路由。

## C. 中低优先级问题（P2）

### 1. 经济推荐真源已经分叉，钱包 / 商店 / 目标层各算一套
- 风险等级：`P2`
- 影响范围：玩家对“现在该花钱做什么”的理解、QA 基线一致性
- 触发条件：同一存档分别打开 Wallet、Shop、TopGoals/Goal 相关面板
- 涉及文件：
[useGoalStore.ts#L1200](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1200)  
[WalletView.vue#L562](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/WalletView.vue#L562)  
[ShopView.vue#L1490](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/ShopView.vue#L1490)
- 为什么会发生：`GoalStore` 已经有 `recommendedEconomySinks`，但 `WalletView` 和 `ShopView` 又各自重新扫描 `ECONOMY_SINK_CONTENT_DEFS` 做二次打分，条件并不一致，导致推荐资金去向可能跨页冲突。
- 修复建议：回收成单一 store 真源，页面只做展示映射。

### 2. guidance / governance 首屏体系仍然覆盖不均，鱼塘与部分终局页掉队
- 风险等级：`P2`
- 影响范围：玩家可理解性、QA 首屏观察效率
- 触发条件：进入 FishPond / Guild / Hanhai / Npc 等后期页面
- 涉及文件：
[tutorial.ts#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/types/tutorial.ts#L1)  
[FishPondView.vue#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/FishPondView.vue#L1)  
[GuildView.vue#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/GuildView.vue#L1)  
[HanhaiView.vue#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue#L1)  
[NpcView.vue#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue#L1)
- 为什么会发生：WS11 的 `GuidanceSurfaceId` 只覆盖 `wallet/quest/breeding/museum/shop/mail/top_goals`；鱼塘没有进入统一摘要系统，Guild/Hanhai/Npc 只补了 QA 治理，不在统一 guidance 真源里。
- 修复建议：把鱼塘、公会、瀚海、陪伴页补进统一 surface/page id，并沿用同口径摘要。

### 3. 静态质量门当前是红的，lint 不能通过
- 风险等级：`P2`
- 影响范围：持续集成、重构安全感、团队协作
- 触发条件：执行 `npm run lint`
- 涉及文件：
[guild.ts#L76](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/types/guild.ts#L76)  
[guild.ts#L109](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/types/guild.ts#L109)  
[GameLayout.vue#L558](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/GameLayout.vue#L558)  
[MainMenu.vue#L516](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/MainMenu.vue#L516)  
[App.vue#L36](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/App.vue#L36)  
[SaveManager.vue#L296](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/components/game/SaveManager.vue#L296)
- 为什么会发生：`GuildSeasonOverview` / `GuildGoalSummary` 在 `guild.ts` 中重复定义；`GameLayout` 和 `MainMenu` 有空 `catch`；`App.vue`、`SaveManager.vue` 还有浮动 promise 警告。
- 修复建议：尽快把 lint 清零，否则后续真正的静态问题会被这些噪音淹没。

### 4. 若干核心模块已经进入“能跑但很难稳改”的体量区间
- 风险等级：`P2`
- 影响范围：后期改动回归半径、定位问题成本、性能剖析难度
- 触发条件：继续往后期系统加新规则、改日结、改商店或改村民页
- 涉及文件：
[useQuestStore.ts#L1322](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts#L1322)  
[useEndDay.ts#L505](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts#L505)  
[ShopView.vue](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/ShopView.vue)  
[NpcView.vue](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue)  
[useSaveStore.ts](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts)
- 为什么会发生：`useQuestStore` 超过 2200 行、`useEndDay` 超过 1500 行、`ShopView` 超过 2300 行、`NpcView` 超过 1300 行，且 `useSaveStore` 仍承担全局 reset / load / import/export / QA cross-system 聚合职责。
- 修复建议：按领域拆分日结 orchestrator、商店子面板、村民卡片视图模型，以及 Save governance 聚合层。

### 5. QA 样例档存在双份元信息来源，容易误判哪份才是实际加载源
- 风险等级：`P2`
- 影响范围：QA 认知、文档同步、样例档维护
- 触发条件：维护样例档或对照 `data-defaults` 与运行态时
- 涉及文件：
[sampleSaves.ts](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts)  
[useSaveStore.ts#L1049](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L1049)  
[manifest.json](/D:/taoyuan-latest/taoyuan-duli/data-defaults/taoyuan_saves/manifest.json)  
[endgame_showcase.json](/D:/taoyuan-latest/taoyuan-duli/data-defaults/taoyuan_saves/endgame_showcase.json)
- 为什么会发生：真正能被游戏直接加载的是 TS 里的内置 `envelope`，`data-defaults/taoyuan_saves/*.json` 更像说明性镜像，不是运行时真源。
- 修复建议：把外部 manifest 从内置定义自动生成，或者统一只保留一套来源。

### 6. `LateGameDebugView` 和样例档工具链设计不错，但只在 DEV 有效，正式 QA 仍然偏弱
- 风险等级：`P2`
- 影响范围：真实测试效率、非开发者复现能力
- 触发条件：在非 DEV 环境、预发布包或新机器上复现中后期问题时
- 涉及文件：
[router/index.ts#L11](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/router/index.ts#L11)  
[LateGameDebugView.vue#L1](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue#L1)  
[README.md#L210](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/README.md#L210)
- 为什么会发生：调试页和全局 `__TAOYUAN_LATE_GAME_DEBUG__` 只在 DEV 路由下存在，导致测试入口强依赖开发态。
- 修复建议：为 QA/staging 提供受控但可用的样例档加载与周切换工具，而不是完全依赖 DEV。

## D. 值得肯定的实现
- [useSaveStore.ts#L580](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L580) 的整档加载事务思路是对的：先备份当前会话，再全量 reset / deserialize，失败后回滚整套 store。这个模式虽然重，但比“半加载半残留”安全得多。
- [GuidanceDigestPanel.vue](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/components/game/GuidanceDigestPanel.vue) 与 [QaGovernancePanel.vue](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/components/game/QaGovernancePanel.vue) 体现了项目已经开始形成统一的后期 UI 语言：先摘要，再路线，再状态反馈，方向是对的。
- [sampleSaves.ts](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts) + [LateGameDebugView.vue](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue) 的样例档与调试入口设计很有价值，`late_economy_foundation / breeding_specialist / fishpond_operator / endgame_showcase` 这四套样例分工清晰，适合继续工程化。
- [useMailboxStore.ts](/D:/taoyuan-latest/taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts) 与 `server/src/taoyuanMailbox.js` 的奖励读取/重复补偿模型思路是成熟的，尤其“duplicate compensation”口径，为后续真正把活动邮件链接上提供了不错的底座。
- 多个 WS 工作流沿用“baseline audit / tuning config / QA cases / release checklist / compensation plan”同构模式，这对长期维护非常好，说明项目已经有系统化交付意识，而不是纯堆功能。

## E. 建议的下一轮整改顺序
1. 先修村庄捐献链路：补物资扣除、补奖励发放、补 UI 入口；如果短期做不完，就先从页面和文案里隐藏它。
2. 再修活动邮箱运营闭环：建立真实投递桥、统一模板/活动 ID 口径，并把邮件领取状态接回活动层。
3. 立即处理 `familyWishCompletions` 死目标，以及育种/鱼塘旧档校验缺口，避免继续制造“不可完成目标”和“读档炸链路”。
4. 补真正的版本迁移体系：提升 `SAVE_VERSION`，让 `migrateSavePayload()` 真正使用版本号，并围绕样例档做版本化兼容测试。
5. 把 QA 自动化收敛成项目内正式命令，摆脱 Python + DEV-only 路由的个人环境依赖。
6. 统一经济推荐真源，并把鱼塘、公会、瀚海、陪伴页纳入统一 guidance / governance 首屏体系。
7. 在逻辑正确性问题收敛后，再拆 `useEndDay`、`useQuestStore`、`ShopView`、`NpcView`、`useSaveStore` 这些过大的热点模块。
