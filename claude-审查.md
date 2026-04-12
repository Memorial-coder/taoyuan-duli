# 桃源乡系统性审查报告

## 先给结论：对照实施方案，这个任务**没有全完成**

我已对照 [后期经济治理与中后期循环扩展AI实施方案-2026-04-10.md](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md) 逐项核查：

- 方案总任务数：**120**
- 标记“已完成”：**114**
- 标记“未开始”：**6**

当前明确仍是“未开始”的任务有：

1. **T017** 村庄建设终局资金池 2.0 - 跨系统联动闭环  
   位置：[实施方案:392-400](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md#L392-L400)
2. **T018** 村庄建设终局资金池 2.0 - 事务安全与防刷处理  
   位置：[实施方案:403-411](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md#L403-L411)
3. **T019** 村庄建设终局资金池 2.0 - 调参与运营开关  
   位置：[实施方案:414-422](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md#L414-L422)
4. **T020** 村庄建设终局资金池 2.0 - QA、数值验收与上线文档  
   位置：[实施方案:425-433](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md#L425-L433)
5. **T039** 市场行情与动态通胀抑制 - 调参与运营开关  
   位置：[实施方案:652-660](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md#L652-L660)
6. **T040** 市场行情与动态通胀抑制 - QA、数值验收与上线文档  
   位置：[实施方案:663-671](taoyuan-duli/taoyuan-main/%E5%90%8E%E6%9C%9F%E7%BB%8F%E6%B5%8E%E6%B2%BB%E7%90%86%E4%B8%8E%E4%B8%AD%E5%90%8E%E6%9C%9F%E5%BE%AA%E7%8E%AF%E6%89%A9%E5%B1%95AI%E5%AE%9E%E6%96%BD%E6%96%B9%E6%A1%88-2026-04-10.md#L663-L671)

这 6 项里，前 4 项集中在 **WS02 村庄建设终局资金池 2.0**，后 2 项集中在 **WS04 市场行情与动态通胀抑制**。也就是说：

- **大部分后期系统扩展已经做了**；
- 但**“村庄建设后四项收口”**和**“市场系统后两项收口”**还没完成；
- 尤其是 **事务安全 / 防刷 / 运营开关 / QA 验收** 这几类，恰好是最不能只看“页面能打开”就算完工的部分。

此外，结合代码现状，本次核查还发现一个更重要的问题：

- 虽然实施方案里 **WS10 / WS11 / WS12** 多项已标记完成，且 `CHANGELOG.md` 也记录了大量完成项；
- 但其中至少有一条关键链路——**活动编排 / 活动任务窗口 / 邮箱运营层**——从代码上看仍然没有真正形成“投递、领取、回执、去重”的闭环，因此属于**文档已收口，但实现仍有半接入风险**。

所以，**如果你的问题是“这个大任务是否已经全部完成”——答案是否定的：没有全完成。**

## A. 总体结论

这个项目已经明显超过了“单一农场模拟”的规模，后期系统铺得很广：主题周、活动编排、限时任务窗口、家庭/配偶/仙灵、博物馆、公会、瀚海、育种、鱼塘、豪华消费目录、周预算与票券体系已经形成了一个较完整的中后期经营框架。优点是：大部分系统并非只停留在 data/type 层，很多确实已经接入了 store、日结/周结和 UI；同时存档加载也做了较多兼容与回滚保护，说明作者已经意识到“中后期坏档/错结算”风险。问题也同样明显：核心结算入口过于集中在 [useEndDay.ts](taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts)，跨系统状态依赖极强；活动邮件这一条关键运营链路仍然停在“状态计算出来了，但没有真正投递/确认回执”的半接入状态；部分中后期系统 UI 虽然已有页面，但入口层级和引导仍然不统一，玩家容易知道“有系统”但不知道“这周为什么要做”。综合判断：**项目已具备可玩的中后期骨架，但仍处在“功能多、链路长、局部伪完成、对结算顺序高度敏感”的阶段**。如果继续扩展而不先压实关键结算链路和活动/存档一致性，后续很容易出现周切换错结算、运营层失联、联动只剩文案不剩结果的问题。

---

## B. 高优先级问题（P0 / P1）

### 1. 活动编排 / 活动任务窗口只做了状态切换，没有真正形成“邮件投递-已领取回执”闭环
- **风险等级**：P0
- **影响范围**：主题周、活动编排、邮件运营层、限时任务窗口、QA 验证链路
- **触发条件**：周切换/换季触发活动编排，或玩家进入活动周后尝试从邮箱验证奖励与活动同步
- **涉及文件**：
  - [useEndDay.ts:884-905](taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts#L884-L905)
  - [useGoalStore.ts:1379-1424](taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1379-L1424)
  - [useQuestStore.ts:2322-2378](taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts#L2322-L2378)
  - [useGoalStore.ts:1355-1367](taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1355-L1367)
  - [useQuestStore.ts:2299-2311](taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts#L2299-L2311)
  - [MailView.vue:1-127](taoyuan-duli/taoyuan-main/src/views/game/MailView.vue#L1-L127)
  - [useMailboxStore.ts:130-145](taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts#L130-L145)
- **为什么会发生**：
  - 日结时确实会调用 `goalStore.processEventOperationsTick()` 和 `questStore.processActivityQuestWindowTick()`，活动状态会切换。
  - 但 `processEventOperationsTick()` 返回的 `pendingMailTemplateIds` 仅在 store 内计算，当前代码中没有看到任何消费方去真正创建/投递邮件。
  - `markEventCampaignMailClaimed()` 与 `markActivityRewardMailClaimed()` 已实现，但全项目没有看到邮件领取成功后把这些回执写回对应 store 的接线。
  - 邮箱页面展示的是服务端邮件列表，但前端活动 store 与服务端邮箱之间缺少明确同步桥。
- **具体后果**：
  - 主题周 / 活动“看起来已启动”，但玩家可能收不到对应奖励邮件。
  - 反过来，就算服务端有邮件，前端活动状态也可能不知道“已领过”，从而导致运营状态与邮箱状态脱节。
  - QA 很难验证“活动切换 → 邮件生成 → 领取 → 状态去重”这条核心链路。
- **修复建议**：
  1. 在活动 tick 后增加明确的邮件下发层，统一处理 `pendingMailTemplateIds` 到服务端邮箱的投递。
  2. 邮件领取成功后，按模板 ID 或 campaign ID 回写 `markEventCampaignMailClaimed()` / `markActivityRewardMailClaimed()`。
  3. 建立单一“活动投递回执”来源，避免前端一套 claimed、服务端邮箱一套 claimed。
  4. 追加集成测试：周切换 -> 活动激活 -> 邮件投递 -> 领取 -> reload -> 不重复领取。

### 2. 日结总线过于庞大，跨系统联动全压在一个顺序敏感函数上，任何新增逻辑都可能破坏旧流程
- **风险等级**：P1
- **影响范围**：日结、周结、换季、家庭/仙灵/活动/商店/公会/博物馆/瀚海联动
- **触发条件**：增加新系统日更逻辑、调整结算顺序、修一个系统时牵动另一个系统
- **涉及文件**：
  - [useEndDay.ts:520-1590](taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts#L520-L1590)
- **为什么会发生**：
  - `useEndDay.ts` 已经承担了几乎全部核心推进：主线进度、目标结算、日期推进、活动编排、限时任务、动物、雇工、配偶、知己、婚礼、孕期、鱼塘、周订单、市场、预算、经济快照、引导 digest、QA 标记、节日、成就、食谱等。
  - 这不是单纯“代码长”，而是**跨系统因果关系强依赖顺序**：例如先 `evaluateProgressAndRewards()` 再 `nextDay()`，再跑活动 tick，再跑鱼塘与市场 tick，再归档周快照。
- **具体后果**：
  - 任何一个后续改动都可能产生“今天奖励按昨天结算/活动晚一天/周预算先重置再归档/家庭 wish 晚一拍”的隐性 bug。
  - 现有逻辑难以为某一系统做局部回归测试，QA 只能端到端撞流程。
- **修复建议**：
  1. 把日结拆成明确阶段：`preAdvance`、`advanceCalendar`、`postAdvanceDaily`、`weeklyBoundary`、`seasonBoundary`、`uiDigest`。
  2. 为每阶段定义输入输出快照，至少在注释或类型层写清依赖关系。
  3. 对周切换与换季逻辑建立集成测试用例，不要只靠人工样例档点流程。

### 3. 存档迁移集中在 SaveStore 顶层补缺，版本迁移仍偏“字段补默认值”，对跨系统语义迁移约束不够
- **风险等级**：P1
- **影响范围**：旧档兼容、后续版本演进、系统间联动字段
- **触发条件**：加载老档、样例档、缺字段档，或未来继续升级复杂玩法结构
- **涉及文件**：
  - [useSaveStore.ts:121-398](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L121-L398)
  - [useSaveStore.ts:591-795](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L591-L795)
  - [useGoalStore.ts:1084-1159](taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1084-L1159)
  - [useNpcStore.ts:1683-1846](taoyuan-duli/taoyuan-main/src/stores/useNpcStore.ts#L1683-L1846)
  - [useShopStore.ts:2317-2359](taoyuan-duli/taoyuan-main/src/stores/useShopStore.ts#L2317-L2359)
- **为什么会发生**：
  - `migrateSavePayload()` 负责给 wallet/goal/museum/guild/hanhai/tutorial 等补块，方向是对的。
  - 但目前迁移更多是“有没有字段，没有就补”，较少体现“旧含义如何映射成新含义”。
  - 真正复杂的语义迁移分散在各 store 的 `deserialize()` 里，比如 NPC 好感倍率迁移、旧孕期字段映射，这使得迁移逻辑散落多处，难以总览验证。
- **具体后果**：
  - 某些新系统字段即使补上默认值，也可能与旧档已有周次、主题周、活动、预算状态语义不匹配。
  - 以后版本继续升级时，很容易出现“SaveStore 以为迁完了，store 内又按另一套逻辑理解”的隐性错档。
- **修复建议**：
  1. 建立按版本号分段的迁移器，而不是只在一个函数里堆字段补全。
  2. 将“字段补默认值”和“语义迁移”分层：前者在 SaveStore，后者在每个 store 的 migration adapter。
  3. 用 4 份内置样例档再增加“旧版本最小存档”回归样本，验证迁移前后关键状态摘要。

### 4. 活动/主题周/限时任务/推荐路线已经多处接入，但“玩家当前该做什么”仍然依赖分散阅读多个面板
- **风险等级**：P1
- **影响范围**：中后期可理解性、回流玩家、测试效率
- **触发条件**：中后期载档、跨周后首次进入、想理解本周重点时
- **涉及文件**：
  - [TopGoalsPanel.vue:1-220](taoyuan-duli/taoyuan-main/src/components/game/TopGoalsPanel.vue#L1-L220)
  - [QuestView.vue:8-64](taoyuan-duli/taoyuan-main/src/views/game/QuestView.vue#L8-L64)
  - [WalletView.vue:12-211](taoyuan-duli/taoyuan-main/src/views/game/WalletView.vue#L12-L211)
  - [BreedingView.vue:230-259](taoyuan-duli/taoyuan-main/src/views/game/BreedingView.vue#L230-L259)
  - [MuseumView.vue:12-89](taoyuan-duli/taoyuan-main/src/views/game/MuseumView.vue#L12-L89)
  - [GuildView.vue:15-93](taoyuan-duli/taoyuan-main/src/views/game/GuildView.vue#L15-L93)
  - [HanhaiView.vue:38-146](taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue#L38-L146)
- **为什么会发生**：
  - 每个系统都在努力展示“本系统如何被主题周影响”，这是好事。
  - 但顶层只给了目标面板和各自页面摘要，没有一个真正的“本周主路线聚合卡片”。
  - 玩家需要同时看顶部目标、任务页、钱袋页、对应系统页，才能拼出完整行动链。
- **具体后果**：
  - 功能虽然已接入，但玩家仍容易迷失，不知道本周到底优先做育种、鱼塘、博物馆还是目录投入。
  - QA 在验证跨系统联动时也要来回切页，效率低。
- **修复建议**：
  1. 在 `TopGoalsPanel` 增加一块“本周主路线建议”，聚合 3 条跨系统行动建议。
  2. 建议直接引用现有 `tutorialStore.uiGuidanceOverview.crossSystemOverview.weeklyDecisionLoop`，不要再造一套逻辑。
  3. 将活动、主题周、预算、推荐资金去向、特殊订单四类信号统一折叠成一屏可读摘要。

### 5. 后期样例档与调试入口只在 DEV 可见，能帮开发，却不足以支撑正式 QA 流程
- **风险等级**：P1
- **影响范围**：QA、回归、后期流程复现、旧档验证
- **触发条件**：非 DEV 环境验证 late-game、活动周、周结、旧档迁移
- **涉及文件**：
  - [router/index.ts:10-18](taoyuan-duli/taoyuan-main/src/router/index.ts#L10-L18)
  - [MainMenu.vue:93](taoyuan-duli/taoyuan-main/src/views/MainMenu.vue#L93)
  - [LateGameDebugView.vue:1-258](taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue#L1-L258)
  - [useSaveStore.ts:938-949](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L938-L949)
  - [sampleSaves.ts:137-453](taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts#L137-L453)
- **为什么会发生**：
  - 内置样例档、推进下周、切主题周、注入票券等能力做得很全。
  - 但路由、按钮、全局对象暴露都被 `import.meta.env.DEV` 限制。
- **具体后果**：
  - 开发调试很好用，但测试包/预发包里 QA 无法复现中后期复杂状态。
  - 活动/周切换/旧档验证会过度依赖本地开发环境，而不是实际交付环境。
- **修复建议**：
  1. 保留 DEV 专属调试 UI，但增加受控 QA 开关（例如管理员权限/本地签名包/专用 query 参数）。
  2. 至少提供“导入内置样例档 + 推进一天/一周”的 QA 模式，不暴露全部调试能力。
  3. 把 4 个样例档纳入自动化回归脚本输入，而不仅是手工调试面板。

### 6. 后端没有测试脚本，邮箱/存档/账户链路缺少最基础自动验证
- **风险等级**：P1
- **影响范围**：服务端邮箱、账号、服务端存档、联机运营能力
- **触发条件**：改动后端路由、数据库、邮箱逻辑、会话逻辑
- **涉及文件**：
  - [server/package.json:1-20](taoyuan-duli/server/package.json#L1-L20)
- **为什么会发生**：
  - 前端 build 能跑通，但后端连 `test` script 都没有。
  - 这意味着邮箱领取、服务端存档、账号态这几条最脆弱的链路很可能只能靠手测。
- **具体后果**：
  - 任何后端改动都容易把邮件/存档打坏而不自知。
  - 前端活动编排即使补全，也没有可靠的服务端回归防线。
- **修复建议**：
  1. 至少补一个最小测试层：登录、拉取邮箱、领取奖励、服务端存档读写。
  2. 把这些测试放进 `npm test` 或 `npm run check:server`，避免“根本没地方跑”。

---

## C. 中低优先级问题（P2）

### 1. SaveStore 对所有 store 直接强依赖，正在成为新的“上帝模块”
- **风险等级**：P2
- **涉及文件**： [useSaveStore.ts:520-580](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L520-L580), [useSaveStore.ts:596-624](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L596-L624)
- **问题**：SaveStore 直接 import 和调度几乎全部 store，未来每加一个系统都要继续扩展这里。
- **后果**：维护成本高，容易漏接新系统；也增加循环依赖风险。
- **建议**：抽出统一的 save registry，让每个 store 自注册 serialize/deserialize。

### 2. 家庭/陪伴系统大量能力主要停留在 Home/Quest/Breeding 等局部展示，缺少独立的关系总览页
- **风险等级**：P2
- **涉及文件**： [HomeView.vue:70-111](taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue#L70-L111), [QuestView.vue:45-54](taoyuan-duli/taoyuan-main/src/views/game/QuestView.vue#L45-L54), [BreedingView.vue:252-259](taoyuan-duli/taoyuan-main/src/views/game/BreedingView.vue#L252-L259)
- **问题**：家庭心愿、婚后分工、知己项目、仙灵加成都在接入，但入口分散。
- **后果**：玩家知道“系统存在”，但无法快速理解当前关系线状态。
- **建议**：增加一个关系总览子面板，至少在村庄/NPC 页可总览家庭 wish、婚后分工、仙灵祝福。

### 3. 鱼塘图鉴页的信息密度高，但经营信号较弱，和周赛/订单/推荐链的联动展示不够
- **风险等级**：P2
- **涉及文件**： [FishPondView.vue:199-255](taoyuan-duli/taoyuan-main/src/views/game/FishPondView.vue#L199-L255)
- **问题**：鱼塘页面主要在讲基础养殖/图鉴完成度，没有像育种页那样明确承接“本周为什么养这个”。
- **后果**：鱼塘虽可玩，但后期运营感偏弱。
- **建议**：补一个“订单/主题周/周赛偏好”摘要卡，与育种页的经营提醒保持一致。

### 4. 公会/瀚海/博物馆页面都已有“经营联动”摘要，但表现形式不一致
- **风险等级**：P2
- **涉及文件**：
  - [GuildView.vue:55-79](taoyuan-duli/taoyuan-main/src/views/game/GuildView.vue#L55-L79)
  - [MuseumView.vue:72-89](taoyuan-duli/taoyuan-main/src/views/game/MuseumView.vue#L72-L89)
  - [HanhaiView.vue:81-146](taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue#L81-L146)
- **问题**：都在做跨系统摘要，但字段、层级、重点不统一。
- **后果**：用户学习成本上升，也不利于后续统一迭代 UI。
- **建议**：抽象成统一的“系统联动摘要卡”组件。

### 5. 一些经济治理与 QA 治理内容更像“开发治理可观测性”，玩家可见信息偏多
- **风险等级**：P2
- **涉及文件**： [LateGameDebugView.vue:130-258](taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue#L130-L258), [useSaveStore.ts:460-518](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L460-L518)
- **问题**：QA baseline、governance、regression suite、gray release 等概念已经进入业务 store。
- **后果**：对开发有帮助，但继续扩散容易污染正式逻辑边界。
- **建议**：将治理态调试快照限制在 debug/qa adapter，业务 store 只保留必要的运行数据。

### 6. 后期系统页面普遍较大，存在继续膨胀成超大组件的趋势
- **风险等级**：P2
- **涉及文件**： [QuestView.vue](taoyuan-duli/taoyuan-main/src/views/game/QuestView.vue), [BreedingView.vue](taoyuan-duli/taoyuan-main/src/views/game/BreedingView.vue), [GuildView.vue](taoyuan-duli/taoyuan-main/src/views/game/GuildView.vue), [MuseumView.vue](taoyuan-duli/taoyuan-main/src/views/game/MuseumView.vue)
- **问题**：单页承载的数据和交互越来越多。
- **后果**：以后再加一个主题周/活动/推荐字段，页面修改代价会越来越高。
- **建议**：从“摘要卡 / 列表区 / 详情弹窗 / 操作条”四层拆子组件，不要继续把新需求堆进单文件。

### 7. 服务器启动逻辑对安全配置较认真，但运行期能力仍偏单体文件存储，扩展前要注意并发与恢复
- **风险等级**：P2
- **涉及文件**： [server/src/index.js:109-183](taoyuan-duli/server/src/index.js#L109-L183)
- **问题**：session 使用文件存储，适合当前单机部署，但并发、崩溃恢复和多实例扩展都有限。
- **建议**：如果后面要把邮箱/服务端存档作为正式运营能力，最好提前规划持久化与并发模型。

---

## D. 值得肯定的实现

### 1. 存档加载的“先备份、失败回滚”意识是对的
- [useSaveStore.ts:631-795](taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts#L631-L795)
- 这不是简单的 deserialize，而是先拍当前快照、全量 reset、失败后回滚旧态，能显著降低坏档把当前会话也污染掉的风险。

### 2. NPC 旧档迁移写得相对细致
- [useNpcStore.ts:1683-1846](taoyuan-duli/taoyuan-main/src/stores/useNpcStore.ts#L1683-L1846)
- 包括旧好感倍率、旧孕期字段、child id 推导、家庭/知己结构补全，说明不是只补表面字段，而是考虑了旧语义。

### 3. Quest 特殊订单有防重入和局部回滚，说明作者确实在处理“重复提交/部分失败”问题
- [useQuestStore.ts:1322-1560](taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts#L1322-L1560)
- 提交锁、鱼塘/背包快照回滚、特殊订单结算回执都比一般小游戏项目更扎实。

### 4. 钱袋页与引导系统已经开始承担“后期经济治理解释层”职责
- [WalletView.vue:12-211](taoyuan-duli/taoyuan-main/src/views/game/WalletView.vue#L12-L211)
- [useTutorialStore.ts:95-277](taoyuan-duli/taoyuan-main/src/stores/useTutorialStore.ts#L95-L277)
- 这部分并不是只给数字，而是在尝试告诉玩家风险、推荐资金去向、预算与目录的关系，方向非常对。

### 5. 主题周、活动、目录推荐、博物馆、公会、瀚海之间已经形成一定联动，不是纯数据摆设
- [QuestView.vue:10-55](taoyuan-duli/taoyuan-main/src/views/game/QuestView.vue#L10-L55)
- [BreedingView.vue:230-259](taoyuan-duli/taoyuan-main/src/views/game/BreedingView.vue#L230-L259)
- [MuseumView.vue:72-89](taoyuan-duli/taoyuan-main/src/views/game/MuseumView.vue#L72-L89)
- [GuildView.vue:55-79](taoyuan-duli/taoyuan-main/src/views/game/GuildView.vue#L55-L79)
- [HanhaiView.vue:81-146](taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue#L81-L146)
- 这一点值得肯定：很多项目会把“联动”写进 changelog 或 data，这里至少已经有 UI 摘要和 store 侧承接。

### 6. 内置后期样例档做得有针对性
- [sampleSaves.ts:137-453](taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts#L137-L453)
- `late_economy_foundation`、`breeding_specialist`、`fishpond_operator`、`endgame_showcase` 的覆盖面是合理的，说明项目对后期验证有明确意识。

---

## E. 建议的下一轮整改顺序

1. **先补活动邮件闭环**
   - 打通 `processEventOperationsTick / processActivityQuestWindowTick -> 邮件投递 -> 领取回执 -> claimed 状态更新`。
   - 这是当前最像“表面完整、实际未闭环”的后期系统。

2. **把日结主流程拆阶段并补回归测试**
   - 尤其是：日结、周切换、换季、活动切换、特殊订单周刷新、周预算重置、周快照归档。

3. **建立正式的存档版本迁移层**
   - 不再只靠 `migrateSavePayload()` 补默认字段；把复杂语义迁移做成版本化模块。

4. **给 QA 提供非 DEV 的受控后期验证入口**
   - 至少支持样例档导入、推进一天/一周、切换主题周的 QA 模式。

5. **统一“本周该做什么”的顶层摘要**
   - 用现有引导数据源，把主题周、活动、预算、特殊订单、推荐资金去向合成一张总卡。

6. **开始拆大组件 / 大 store 的展示层**
   - 优先拆 Quest、Breeding、Museum、Guild、Wallet 的摘要组件，避免后续维护成本继续陡增。

7. **补后端最小自动测试**
   - 登录、邮箱、领取、服务端存档、会话保持，先把运营与坏档高风险链路守住。

---


---

## 第二轮补充审查（更全面复核后新增）

下面这部分是我在第一次报告基础上，继续对 **WS02 村庄建设、WS04 市场系统、服务端邮箱/存档链路、QA 治理可见层** 做第二轮复核后补充进去的内容。重点不是重复前文，而是把第一次还没展开的风险补齐。

### F. 第二轮新增高优先级问题

#### 7. 村庄建设“捐赠计划”已经有数据结构和 store，但前端没有真正可执行入口，属于伪完成功能
- **风险等级**：P1
- **影响范围**：WS02 村庄建设终局资金池、捐赠型项目、跨系统建设闭环、玩家认知
- **触发条件**：玩家试图推进捐赠计划或领取捐赠里程碑
- **涉及文件**：
  - [useVillageProjectStore.ts:798-865](taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts#L798-L865)
  - [HomeView.vue:7-67](taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue#L7-L67)
  - [NpcView.vue:150-235](taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue#L150-L235)
- **为什么会发生**：
  - store 侧已经有 `donateToProject()`、`claimDonationMilestone()`、`donationStates`、`donationSummaries`。
  - 但当前页面层能看到的只有“捐赠计划数量/推进摘要”，没有看到真正的捐赠操作入口，也没有看到领取捐赠里程碑的 UI 接线。
  - `grep` 结果也表明这些 action 没有被页面直接消费。
- **具体后果**：
  - 数据上“有捐赠系统”，玩家流程上“没有可玩入口”。
  - 实施方案中 WS02 的“捐赠型项目”很可能已在文档里算完成，但玩家端仍然不能完整体验。
- **修复建议**：
  1. 在 [NpcView.vue](taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue) 或独立村庄建设面板中增加捐赠物资投放与里程碑领取入口。
  2. 页面直接消费 `donationSummaries`，明确显示可捐物、进度、可领里程碑。
  3. 在报告中将其标记为“伪完成功能”，直到 UI 与流程真正闭环。

#### 8. 村庄建设“捐赠记录”没有看到物资扣除与事务回滚，存在记录增长但库存不变的高风险
- **风险等级**：P1
- **影响范围**：村庄建设、材料经济、后期消耗池、坏档/刷资源风险
- **触发条件**：调用捐赠计划投放逻辑
- **涉及文件**：
  - [useVillageProjectStore.ts:798-833](taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts#L798-L833)
- **为什么会发生**：
  - `donateToProject()` 直接更新 `donationStates.totalAmount` 与 `donatedItems`，但当前代码片段中没有看到对背包/仓库物资的扣除，也没有像 `completeProject()` 那样做 inventory/warehouse snapshot + rollback。
  - 这和实施方案中 T018“事务安全与防刷处理”未开始完全对应。
- **具体后果**：
  - 一旦后面页面接线直接调用该 action，极可能出现“记录已捐赠、实际材料没扣”的刷进度漏洞。
  - 或者后续开发者误以为该路径已安全，直接放出 UI 后引入经济漏洞。
- **修复建议**：
  1. 参照 [useVillageProjectStore.ts:940-964](taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts#L940-L964) 的建设事务写法，把捐赠改成原子流程：校验 -> 备份 -> 扣物 -> 记状态 -> 失败回滚。
  2. 增加去重与重复点击保护。
  3. 在 QA 用例中加入“背包不足 / 仓库不足 / 重复点击 / 跨天切换中的捐赠提交”场景。

#### 9. QA 治理面板已经大规模进入正式游戏页面，开发治理信息对玩家暴露过深，正式逻辑被测试概念污染
- **风险等级**：P1
- **影响范围**：UI 信息层级、正式体验、模块边界、可维护性
- **触发条件**：玩家打开钱袋、任务、育种、公会、博物馆、瀚海、NPC 等页面
- **涉及文件**：
  - [WalletView.vue:57-58](taoyuan-duli/taoyuan-main/src/views/game/WalletView.vue#L57-L58)
  - [QuestView.vue:9-11](taoyuan-duli/taoyuan-main/src/views/game/QuestView.vue#L9-L11)
  - [BreedingView.vue:23-24](taoyuan-duli/taoyuan-main/src/views/game/BreedingView.vue#L23-L24)
  - [GuildView.vue:15-16](taoyuan-duli/taoyuan-main/src/views/game/GuildView.vue#L15-L16)
  - [MuseumView.vue:11-12](taoyuan-duli/taoyuan-main/src/views/game/MuseumView.vue#L11-L12)
  - [HanhaiView.vue:12-13](taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue#L12-L13)
  - [NpcView.vue:28](taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue#L28-L28)
  - [QaGovernancePanel.vue:1-227](taoyuan-duli/taoyuan-main/src/components/game/QaGovernancePanel.vue#L1-L227)
- **为什么会发生**：
  - `QaGovernancePanel` 不是 DEV-only，它被正式页面大面积引入。
  - 面板内容直接向玩家展示“灰度通道、回滚/热修、迁移方案、发布闸门、回归套件”等开发治理概念。
- **具体后果**：
  - UI 信息层级被开发/运维语义挤占，普通玩家很难判断哪些是“我该做什么”，哪些只是“研发治理信息”。
  - 正式逻辑和测试治理配置进一步耦合，后续越改越难切分环境边界。
- **修复建议**：
  1. 将 `QaGovernancePanel` 限制为 DEV / QA 模式，或至少加显式开关。
  2. 正式玩家页面保留“经营建议”，移除“灰度/回滚/迁移”类治理语义。
  3. 若必须保留，至少折叠进管理员/测试专属入口，而不是默认展示。

#### 10. 服务端邮箱系统其实已经具备完整投递与领取能力，但前端活动编排没有接到它，形成“前后端各自完整、整体不连通”的割裂架构
- **风险等级**：P1
- **影响范围**：活动编排、邮箱运营、奖励领取、前后端一致性
- **触发条件**：活动周切换、管理员创建 campaign、玩家领取活动邮件
- **涉及文件**：
  - [server/src/routes/api.js:854-909](taoyuan-duli/server/src/routes/api.js#L854-L909)
  - [server/src/taoyuanMailbox.js:606-646](taoyuan-duli/server/src/taoyuanMailbox.js#L606-L646)
  - [server/src/taoyuanMailbox.js:942-1025](taoyuan-duli/server/src/taoyuanMailbox.js#L942-L1025)
  - [useEndDay.ts:884-905](taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts#L884-L905)
  - [useGoalStore.ts:1379-1424](taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts#L1379-L1424)
- **为什么会发生**：
  - 第二轮复核确认：服务端 `taoyuanMailbox` 的能力其实不弱，已经有 campaign、scheduled dispatch、claim、claim-all、clear-claimed、save slot reward apply、duplicate compensation 等完整能力。
  - 问题不在“后端没有邮件系统”，而在“前端活动状态没有把待发送模板真正投喂给后端 mailbox campaign”。
- **具体后果**：
  - 审查层面要更准确地说：这不是“邮箱系统未实现”，而是**活动编排与邮箱系统没有真正打通**。
  - 这会造成开发者误判问题归属，修错方向。
- **修复建议**：
  1. 在前端/后端之间新增明确的 activity-to-mail campaign bridge。
  2. 把 `pendingMailTemplateIds` 变成真正的投递请求，而不只是前端状态结果。
  3. 邮件领取后同步回写前端活动 claimed 状态。

### G. 第二轮新增中低优先级问题

#### 8. 村庄建设维护功能有 UI，但捐赠功能只有摘要没有操作，功能层级不对称
- **风险等级**：P2
- **涉及文件**：
  - [NpcView.vue:185-220](taoyuan-duli/taoyuan-main/src/views/game/NpcView.vue#L185-L220)
  - [HomeView.vue:52-67](taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue#L52-L67)
- **问题**：维护是“可操作”的，捐赠只是“被展示”。
- **后果**：玩家会误以为村庄建设的后期运营只有维护，没有捐赠推进。
- **建议**：把维护和捐赠做成同层级可交互模块。

#### 9. 商店与市场页信息量已经非常高，再叠加 QA 面板后，正式玩家容易被信息淹没
- **风险等级**：P2
- **涉及文件**： [ShopView.vue:1-171](taoyuan-duli/taoyuan-main/src/views/game/ShopView.vue#L1-L171)
- **问题**：经济观测、市场轮换、目录运营、周更惊喜、活动承接、合同摘要都在一个大页里，再加 QA 面板更重。
- **后果**：虽然“信息完整”，但可读性开始下降。
- **建议**：将“正式玩家经营信息”和“研发治理信息”拆层；商店页优先展示与当前店铺/当前周最相关的两层摘要。

#### 10. 村庄建设 store 已经开始跨接过多系统，存在成为第二个结算型上帝模块的趋势
- **风险等级**：P2
- **涉及文件**： [useVillageProjectStore.ts:36-48](taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts#L36-L48)
- **问题**：VillageProjectStore 直接依赖 achievement、breeding、guild、goal、hanhai、inventory、museum、npc、player、quest、shop、warehouse。
- **后果**：随着 WS02 收口继续推进，它很容易演变成另一个 SaveStore / EndDay 级别的高耦合中心。
- **建议**：尽早把“需求判定”“项目运营”“联动效果分发”拆层。

### H. 第二轮修正后的判断

#### 1. 关于“活动邮箱层”的判断要更精确
第一次报告里我把它概括成“半接入”，这个方向没错，但现在可以更精确地说：

- **后端邮箱系统本身已实现且能力完整**；
- **问题在于前端活动编排没有真正驱动后端投递**；
- 因此它是**前后端闭环未完成**，不是单边缺功能。

#### 2. 关于“WS02 村庄建设终局资金池 2.0”的完成度判断要下调
第二轮复核后，我认为 WS02 不是简单的“文档里 4 项未开始”，而是存在更实质的问题：

- 捐赠计划目前更像**数据与摘要已落地**；
- 但玩家可操作流程和事务安全没有闭环；
- 所以 WS02 在真实可玩性上应视作**部分完成，而非接近收尾**。

#### 3. 关于“正式玩家信息层级”的风险要上调
第一次报告把 QA 治理暴露问题列为 P2。第二轮看完 `QaGovernancePanel` 的实际接入面后，我认为这更接近 **P1 边缘问题**：

- 因为它不是单页里一两个 debug 字样；
- 而是已经系统性进入多个核心页面，足以影响正式体验与模块边界。

### I. 第二轮建议的整改补充顺序

在原有整改顺序前面，再插入两步：

1. **先修 WS02 村庄建设的伪完成功能**
   - 把捐赠计划入口、扣物、里程碑领奖、事务回滚补全。
2. **把 QA 治理面板从正式玩家面板中剥离或折叠**
   - 先恢复正式信息层级，再谈继续扩展 UI 引导。
3. **再做活动编排 × 邮箱后端的真正闭环**
   - 把前后端链路打通，而不是继续只补摘要文案。
4. **最后再补 WS02/WS04 的调参与 QA 文档收口**
   - 否则会出现“文档先写完，流程后补不上”的继续偏差。

- 前端 `npm run build` **通过**。
- 后端 `npm test` **无法执行**，因为 [server/package.json](taoyuan-duli/server/package.json#L1-L20) 根本没有 `test` script。
- 4 个内置后期样例档均已存在：
  - [sampleSaves.ts:140](taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts#L140)
  - [sampleSaves.ts:242](taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts#L242)
  - [sampleSaves.ts:299](taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts#L299)
  - [sampleSaves.ts:352](taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts#L352)

如果要继续下一轮，我建议直接按下面顺序做专项复核：
1. 活动邮件闭环；
2. 周切换/主题周/订单结算脚本化回归；
3. 旧档迁移专项；
4. 顶层路线引导聚合。