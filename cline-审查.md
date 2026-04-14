# 桃源乡项目系统性审查报告（Cline）

审查对象：`taoyuan-duli/taoyuan-main`（前端）为主，结合 `taoyuan-duli/server` 的邮箱/样例档接线做联动审查。  
审查方式：以代码静态审计为主，重点复核中后期样例档接线、周循环编排、活动/主题周/邮件/家庭/仙灵/育种/鱼塘/博物馆/公会/瀚海/商店目录/后期经济治理的真实链路。  
结论重点放在“是否真的能玩、是否稳定、是否可维护、是否容易出错”，不以格式化或命名问题为主。

---

## A. 总体结论

这个版本的《桃源乡》已经明显不是“只写了数据表”的半成品：中后期经济治理、目录商店、主题周、活动编排、育种、博物馆、公会、瀚海、家庭/仙灵等系统大多已经真实接入到 `store + data + view + useEndDay` 主链，且 `src/composables/useEndDay.ts`、`src/stores/useGoalStore.ts`、`src/stores/useQuestStore.ts`、`src/stores/useShopStore.ts` 等之间确实形成了中后期循环框架。从玩法实现密度看，项目已经具备“中后期可玩”的基础，不属于文档吹得很满、代码只有壳子的状态。

但同样明确的是：当前代码库已经进入“复杂度陡增期”。最危险的问题不在样式层，而在**结算可信度、存档一致性、活动/邮件闭环、跨系统状态源重复、调试/治理信息侵入正式玩家面**。其中有数个 P0/P1 问题会直接导致**可伪造奖励、重复领奖、导入坏档延迟爆炸、活动邮件状态与前端运营态脱钩**。如果现在继续在此架构上快速加系统，而不先做一轮治理，后续会越来越难测、越来越难保档、也越来越难稳定迭代。

---

## B. 高优先级问题（P0 / P1）

### 1. 瀚海扑克 / 恶魔轮盘结算完全信任前端结果，可被伪造且存在重复结算窗口
- **风险等级**：P0
- **影响范围**：瀚海赌场、后期经济、票券/奖励池、QA 存档可信度
- **触发条件**：
  - 正常 UI 结算时，组件把结果直接回传 store；
  - 或通过控制台/调试手段直接调用结算函数；
  - 或在没有“本局已结算标记”的情况下重复触发 end 方法。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/components/game/TexasHoldemGame.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/BuckshotRouletteGame.vue`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts:1116-1172, 1174-1231`
- **问题说明**：
  - `TexasHoldemGame.vue` 直接 `emit('complete', playerStack, tier.name)`；`BuckshotRouletteGame.vue` 直接 `emit('complete', won, draw)`。
  - `useHanhaiStore.ts` 中：
    - `startTexas()` 只负责扣入场费并发牌，**不保存本局 session / seed / 局状态**；
    - `endTexas(finalChips, tierName)` 直接按传入参数决定输赢与发奖；
    - `startBuckshot()` 只负责扣钱并返回初始血量/子弹；
    - `endBuckshot(won, draw)` 直接按布尔值发奖。
  - `endTexas` / `endBuckshot` 的防重仅是瞬时锁 `casino_texas_end` / `casino_buckshot_end`，没有“这一局已结算”的持久状态，也没有校验结算参数是否来自当前局。
- **为什么会发生**：
  - 赌场小游戏采用了“UI 组件完成对局 → 把结果直接上报给 store 结算”的模式，store 没有把局内状态当作权威状态保存。
  - 这让 store 只像“奖励发放器”，而不是“裁判 + 结算中心”。
- **具体后果**：
  - 任何能调用 store 的路径都可直接制造奖励；
  - 可绕过正常对局难度，快速注水后期经济；
  - 会污染 QA 样例档与调试档，使后期平衡验证失真。
- **修复建议**：
  1. 为 Texas / Buckshot 增加 `activeSession` 状态，至少保存：`sessionId`、`startDayTag`、`tierId`、`seed`、`betCost`、`settled`、必要的局内快照；
  2. `endTexas` / `endBuckshot` 只能消费当前 `activeSession`，并在成功结算后立即 `settled=true` 或清空 session；
  3. 最低限度也要校验：未 `start` 不能 `end`、同一 session 不能重复结算、`tierName/finalChips` 不能由 UI 任意注入；
  4. 更理想的方式是把决定胜负的核心逻辑移回 store，仅让组件负责展示过程。

### 2. 博物馆学者委托在“已完成且已领奖”后还能重新接取，形成重复领奖漏洞
- **风险等级**：P0
- **影响范围**：博物馆、目标声望、物品奖励、NPC 好感、后期持续经营闭环
- **触发条件**：完成任意学者委托并领奖后，再次点击接取；若当前馆内评分/访客热度依旧满足条件，下次 `processOperationalTick` 会再次自动完成并允许再次领奖。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useMuseumStore.ts:836-905, 907-946, 948-1025`
- **问题说明**：
  - `acceptScholarCommission()` 只拦截：`isAccepted`、`isRewardPending`、`unlocked`。
  - 但对“已完成且已领奖”的状态没有硬拦截。代码里当 `commission.state.expired` 时还会重置 `completed/rewarded`，而正常已领奖状态也会被再次写入：
    - `acceptedDayTag = 当前日期`
    - `completed = false`
    - `rewarded = false`
  - `claimScholarCommissionReward()` 结算后只做 `setScholarCommissionState(commissionId, { rewarded: true })`，并未把该委托永久封闭或改成不可再接取态。
- **为什么会发生**：
  - 委托状态机缺少“已完成已领取后不可重开”这一终态；
  - `acceptScholarCommission` 以“当前是否在进行/待领奖”为判断，而不是以“该委托本周/本档是否已完成”为判断。
- **具体后果**：
  - 可反复刷钱、刷声望、刷奖励道具、刷支援 NPC 好感；
  - 博物馆成为可无限刷的收益池，破坏中后期经济治理。
- **修复建议**：
  1. 为学者委托增加明确状态机：`available / accepted / completed_unclaimed / rewarded / expired`；
  2. `acceptScholarCommission()` 必须显式拦截 `rewarded`；
  3. 若设计上允许“每周重开”，则需要增加 `lastAcceptedWeekId` / `lastRewardedWeekId` 并按周刷新，而不是任意重接；
  4. 补一个回归用例：完成→领奖→再接取，必须失败。

### 3. 活动运营层的“邮件已领取”状态没有接到真实邮箱领取流程，活动邮件防重闭环不成立
- **风险等级**：P1
- **影响范围**：主题周/活动编排、邮件运营、任务窗口、引导摘要、活动奖励一致性
- **触发条件**：玩家在邮箱页领取活动邮件，前端活动状态不会同步调用活动系统的 mail-claimed 标记。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`（`markEventCampaignMailClaimed`、`pendingMailTemplateIds`）
  - `taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts`（`markActivityRewardMailClaimed`、`claimedRewardMailIds`）
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue:232-259`
  - `taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts`
- **问题说明**：
  - `useGoalStore` 有 `markEventCampaignMailClaimed(campaignId)`，并在运营概览里根据 `claimedMailCampaignIds` 计算 `pendingMailTemplateIds`；
  - `useQuestStore` 也有 `markActivityRewardMailClaimed(mailId)`；
  - 但代码搜索结果显示，这两个方法**没有被任何视图或邮箱领取链调用**；
  - `MailView.vue` 领取邮件时仅调用 `mailboxStore.claimMail()` / `claimAll()`，没有把领取结果回写给活动系统状态机。
- **为什么会发生**：
  - 活动编排层和真实邮箱系统分别实现了“邮件是否已领”的状态，但没有统一权威来源；
  - 导致前端运营态中的“待领邮件”其实只是“本地推导态”，不是实际邮箱状态。
- **具体后果**：
  - Quest / Mail / Goal 三处对活动状态的理解可能不一致；
  - 玩家已经领过邮件，但活动面板仍可能显示“待领”；
  - QA 在验证“活动 → 邮件 → 奖励 → 任务窗口收束”时无法得到可信闭环。
- **修复建议**：
  1. 明确“邮箱实际领取结果”是唯一权威来源，领取成功后统一回写 `goalStore` / `questStore`；
  2. 为活动邮件建立稳定映射：邮件 ID → campaignId / templateId；
  3. `claimMail` / `claimAll` 成功后，应批量调用 `markEventCampaignMailClaimed` 与 `markActivityRewardMailClaimed`；
  4. 补一条联调回归：领取活动邮件后，QuestView、MailView、GuidanceDigest、TopGoals 同步变化。

### 4. 导入存档只做“结构可解析”校验，不做语义级加载验证，坏档会被直接写入槽位
- **风险等级**：P1
- **影响范围**：旧档兼容、导档稳定性、坏档恢复、QA 存档交换
- **触发条件**：导入一个能解密、能 `normalizeSaveEnvelope()`，但语义上无法正确反序列化或跨系统字段不一致的档案。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts:702-907, 1025-1053`
- **问题说明**：
  - `applySaveData()` 已经做了很重的回滚式加载：先全量备份→全量 `$reset()`→逐 store `deserialize()`→失败则回滚；
  - 但 `importSave()` 并没有调用 `applySaveData()` 进行语义级验证，只做：
    - `parseSaveData(fileContent)`
    - `normalizeSaveEnvelope(data)`
    - 通过后直接 `setRawByMode(slot, fileContent)`。
  - 这意味着“导入成功”不等于“能正常加载并正常跑周循环”。
- **为什么会发生**：
  - 导入流程只验证文件格式，不验证业务一致性；
  - 把真正的错误暴露时点推迟到了未来某次加载/跨天/跨周。
- **具体后果**：
  - 用户会得到一个“已导入成功但其实已埋雷”的槽位；
  - 坏档排查成本大，且更容易误以为是随机性 bug；
  - 旧档迁移问题会被延迟触发，难以复现。
- **修复建议**：
  1. `importSave()` 在写槽前应先把内容走一遍临时 `applySaveData()` 验证；
  2. 若担心污染当前会话，可在独立临时上下文/临时备份内完成验证再写盘；
  3. 导入完成后最好立即做一次“结构 + 关键 store + 周循环编排前置检查”；
  4. 导入失败应返回明确的“存档结构有效，但业务状态非法”错误信息。

### 5. 调试页“应用日期并刷新主题周”没有走真实日结/周结编排，容易制造假阳性验证
- **风险等级**：P1
- **影响范围**：QA、样例档验证、主题周/活动/任务窗口/周快照联调可信度
- **触发条件**：在 DEV 调试页使用“应用日期并刷新主题周”来验证跨日/跨周/主题周切换。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue:444-464`
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
- **问题说明**：
  - `applyCalendarDebug()` 直接改 `gameStore.year/season/day/hour`，然后只调用：
    - `goalStore.refreshDailyGoals(false)`
    - `goalStore.refreshSeasonGoals(false)`
    - `goalStore.refreshWeeklyGoals(false)`
    - `goalStore.refreshThemeWeek(true)`
    - `goalStore.evaluateProgressAndRewards()`
  - 但真实日结主链在 `useEndDay.ts` 中，还会驱动：
    - `goalStore.processEventOperationsTick(...)`
    - `questStore.processActivityQuestWindowTick(...)`
    - `museumStore.processOperationalTick(...)`
    - `guildStore` / `hanhaiStore` / `shopStore` / `villageProjectStore` 等 weekly/seasonal tick。
- **为什么会发生**：
  - 调试页为便捷而直接改时间，但没有同步复用完整事务编排器。
- **具体后果**：
  - 调试结果会出现“主题周看起来切了，但活动任务窗口/邮件/博物馆/瀚海没真更新”；
  - QA 很容易误判“切周没问题”，实际正式流程仍有状态不一致。
- **修复建议**：
  1. 把“时间跳转”与“真实编排”解耦成统一调度接口；
  2. 调试页若允许直接跳日，至少要补跑相应的 daily/weekly/seasonal tick；
  3. UI 上明确提示：当前操作只是“日历覆写”还是“完整结算推进”；
  4. 样例档验证应优先使用 `advanceToNextWeek()` / 连续 `handleEndDay()`。

### 6. `useSaveStore` 已成为跨系统巨型中枢，迁移/反序列化责任分散，未来极易出现漏字段与状态源分叉
- **风险等级**：P1
- **影响范围**：所有存档、旧档兼容、新系统接入成本、回滚复杂度
- **触发条件**：新增字段/新增系统/调整周期字段/改动旧档迁移策略时。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts` 全文件，尤其 `migrateSavePayload()` 与 `applySaveData()`
- **问题说明**：
  - `useSaveStore.ts` 同时负责：加解密、槽位管理、导入导出、样例档加载、旧档迁移、全局序列化/反序列化、QA 治理态；
  - `migrateSavePayload()` 内部手写大量 fallback；
  - 同时每个 store 又在自己的 `deserialize()` 中做二次 normalize；
  - 例如 `tutorial.guidanceDigestState`、`goal.currentThemeWeekState`、`quest.activityQuestWindowState`、`museum.scholarCommissionStates` 等都属于跨系统强关联状态，但迁移/容错逻辑分散在不同层。
- **为什么会发生**：
  - 项目演化过程中采用“save store 兜底 + 各 store 自治”的双层迁移模式，但没有统一 schema contract。
- **具体后果**：
  - 新增复杂系统后极易忘记在 save 层与 store 层同时补齐；
  - 旧档迁移时可能出现“字段存在但含义不对”“数据能读但跨系统不一致”；
  - 一旦出错，定位成本极高。
- **修复建议**：
  1. 建立按 store 拆分的 migration registry，而不是继续把大部分迁移堆在 `useSaveStore`；
  2. 约束每个 store 输出明确的 `saveVersion + normalize + migrate`；
  3. 把“权威状态”和“派生缓存态”从存档中剥离，减少迁移面；
  4. 为旧档升级建立最小回归矩阵：核心档、后期档、活动中档、跨周档、跨季档。

---

## C. 中低优先级问题（P2）

### 1. 家庭分工分配存在越权入口，`assignHouseholdRole` 没有复用可用性校验
- **风险等级**：P2
- **触发条件**：只要能调用 `assignHouseholdRole(npcId, roleId)`，即使该 NPC 未婚/非知己、当前内容层级未解锁，也可能被直接写入分工。
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useNpcStore.ts:860-898`
- **问题说明**：
  - `getAvailableHouseholdRoles()` 已经写了合法性条件：`!state.married && !state.zhiji` 不可分配，且受 `relationshipContentTier` 限制；
  - 但 `assignHouseholdRole()` 内部没有再做同等校验，只检查 `state` 与 `roleDef` 存在。
- **后果**：
  - UI 若未来误接线、调试接口误暴露、控制台调用，都能造出不应出现的家庭分工态。
- **修复建议**：
  - `assignHouseholdRole()` 内部必须强校验 `npcId` / `roleId` 是否属于当前可用集合，不要依赖 UI 自觉。

### 2. 仙灵祝福激活存在越权风险，`activateSpiritBlessing` 没验证 blessing 是否在当前可用列表内
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHiddenNpcStore.ts:586-620`
- **问题说明**：
  - `getAvailableSpiritBlessings()` 已经根据 `WS09_HIDDEN_NPC_BLESSING_ASSIGNMENTS` 与 `bondTier` 计算可用祝福；
  - 但 `activateSpiritBlessing()` 只判断 `state`、`blessing` 是否存在，然后直接 `state.activeBlessingId = blessingId`，并顺便把它塞进 `unlockedBlessingIds`。
- **后果**：
  - 任意祝福都可能被越权激活，破坏家庭/钓鱼/育种/商店等多个系统的推荐与加成判断。
- **修复建议**：
  - 激活前必须校验 `blessingId` 属于 `getAvailableSpiritBlessings(npcId)` 的结果集。

### 3. `guidanceDigestState` 被持久化成存档权威态，属于高耦合的派生缓存态污染
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts:211-250`
  - `taoyuan-duli/taoyuan-main/src/stores/useTutorialStore.ts`
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
- **问题说明**：
  - `guidanceDigestState` 本质是从 `goalStore`、`questStore`、`shopStore`、`breedingStore`、`museumStore` 推导出的摘要/路线缓存；
  - 但当前它被完整写入存档，并在日结链里被拿来参与对比。
- **后果**：
  - 未来只要引导规则调整、路线模板变更，就会产生大量旧档缓存兼容问题；
  - 更容易出现“玩法状态没问题，但摘要卡显示错了”。
- **修复建议**：
  - 只持久化极少数玩家交互痕迹（已读/已关闭/已采纳），不要持久化大面积派生摘要。

### 4. 路由与页面信息架构开始失控，`/game` 下 20+ 子路由平铺，域边界不清
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/router/index.ts:20-50`
- **问题说明**：
  - `village` 实际指向 `NpcView.vue`，但村庄建设摘要又散在其他页面；
  - 后期系统页面越来越多，但没有域首页/二级导航分层。
- **后果**：
  - 玩家认知负担越来越高；
  - 后续功能再加时更容易出现“有功能但入口埋太深”。
- **修复建议**：
  - 按“经营 / 社交家庭 / 终局拓展 / 系统面板”重做一级导航与二级导航。

### 5. QA 治理面板与引导面板大量进入正式玩法页，产品语义被内部治理信息污染
- **风险等级**：P2
- **涉及文件**：
  - `src/views/game/WalletView.vue`
  - `src/views/game/QuestView.vue`
  - `src/views/game/BreedingView.vue`
  - `src/views/game/MuseumView.vue`
  - `src/views/game/HanhaiView.vue`
  - `src/views/game/GuildView.vue`
  - `src/views/game/NpcView.vue`
  - `src/views/game/ShopView.vue`
- **问题说明**：
  - `QaGovernancePanel` 与 `GuidanceDigestPanel` 被挂入多个正式页面；
  - 对内部联调很方便，但“治理”“灰度”“回滚”这类术语不应长期占用正式玩家信息层级。
- **后果**：
  - 页面噪音增加，真正操作区被下压；
  - 玩家会接触到内部 QA 语义。
- **修复建议**：
  - QA 面板只在 DEV / GM / admin 条件下可见；
  - 玩家态保留“摘要卡”，但移除内部治理措辞。

### 6. 样例档存在“双源假象”：`data-defaults/taoyuan_saves` 不是前端真实载入源
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts`
  - `taoyuan-duli/data-defaults/taoyuan_saves/*.json`
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts:1039-1053`
- **问题说明**：
  - 前端真实样例载入走的是 `src/data/sampleSaves.ts` 内置 envelope；
  - `data-defaults/taoyuan_saves` 更像元信息/说明用目录，并不参与前端主载入链。
- **后果**：
  - QA/策划很容易误以为改 JSON 文件就能影响调试样例；
  - 文档与运行时行为不完全一致。
- **修复建议**：
  - 统一样例档来源；要么前端直接读同一份 JSON，要么明确文档写明“defaults 仅供展示，运行时以 TS 常量为准”。

### 7. 缺少工程级自动化测试基线，中后期复杂回归几乎全靠手工
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/tests`、`src/__tests__` 均不存在
  - 代码搜索无有效 `vitest` / `playwright` / `cypress` 项目内测试用例
- **问题说明**：
  - 当前代码规模下，周循环、活动切换、旧档迁移、邮件领取、家庭/仙灵联动都需要自动回归；
  - 但仓库里没有成体系的前端自动化测试目录。
- **后果**：
  - 每次改一个 store，都可能在另一个晚期系统上埋雷；
  - QA 成本将持续上升。
- **修复建议**：
  - 至少补三层：
    1. store 级纯逻辑单测；
    2. 样例档回归脚本；
    3. 关键 UI 流程 E2E（读档、跨周、领邮件、活动切换）。

### 8. 多个核心 store/编排器体量过大，已经进入“能跑但很难改”的阶段
- **风险等级**：P2
- **涉及文件**：
  - `src/stores/useQuestStore.ts`（约 2400+ 行）
  - `src/composables/useEndDay.ts`（约 1700+ 行）
  - `src/stores/useGoalStore.ts`（约 1400+ 行）
  - `src/stores/useHanhaiStore.ts`（约 1300+ 行）
  - `src/stores/useMuseumStore.ts`（约 1100+ 行）
  - `src/stores/useSaveStore.ts`（约 1000+ 行）
- **问题说明**：
  - 这些文件不只是大，而且都在承担多个子域职责；
  - 修改一个点容易影响整条链路。
- **修复建议**：
  - 按“状态定义 / 选择器 / 周期结算 / 奖励结算 / 调试接口 / 存档迁移”拆分模块。

### 9. `GoalStore` 同时承担目标、主题周、活动编排、周预算、指标归档、UI 引导源，多职责混杂
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`
- **问题说明**：
  - 目标系统原本应是“玩家目标/奖励”；
  - 现在同时兼任主题周、活动邮件运营、周预算计划、周指标归档、推荐资金去向、引导源聚合。
- **后果**：
  - 任何一个周运营逻辑改动，都可能把目标/奖励/引导一并牵动。
- **修复建议**：
  - 长期应拆成 `goal`, `themeWeek`, `eventOps`, `weeklyMetrics` 四个子域。

### 10. `MailView` 能领取真实邮箱奖励，但当前页并不展示“该奖励是否已同步到活动运营层”的反馈
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue:232-259`
- **问题说明**：
  - 当前 UI 只有“奖励已发放到当前桃源乡存档/刷新失败”的反馈；
  - 没有活动编排层同步状态提示。
- **后果**：
  - 玩家与 QA 都难以确认活动奖励链是否完整收束。
- **修复建议**：
  - 在活动邮件领取成功后增加“已同步活动编排状态”的明确提示，并联动 Quest / Guidance 页面更新。

---

## D. 值得肯定的实现

### 1. 中后期系统并非“只在 data/types 里存在”，多数已经真实接入主循环
这一点很关键。相比很多“策划文档型实现”，本项目的后期系统大多已进入真实编排链：
- `useEndDay.ts` 会驱动跨系统结算；
- `useGoalStore.ts` 有主题周、周指标归档、经济观察；
- `useQuestStore.ts` 有活动窗口/特殊订单；
- `useShopStore.ts` 有目录推荐、市场路由；
- `useMuseumStore.ts` / `useGuildStore.ts` / `useHanhaiStore.ts` 都有跨系统推荐与周刷新逻辑。  
这说明项目的“中后期扩展”已经过了纸面阶段。

### 2. `applySaveData()` 的整体回滚思路是对的
- **涉及文件**：`src/stores/useSaveStore.ts:702-907`
- 优点：
  - 加载前先做关键块校验；
  - 先备份现态；
  - 全量 `$reset()` 后再依序反序列化；
  - 失败则整体回滚。  
这比“边读边改、读到哪算哪”的方式稳健很多，是目前存档系统里比较成熟的一段设计。

### 3. 样例档与 DEV 调试页的接线思路是正确的
- **涉及文件**：
  - `src/data/sampleSaves.ts`
  - `src/stores/useSaveStore.ts:1039-1053`
  - `src/views/dev/LateGameDebugView.vue`
  - `src/router/index.ts:11-19`
- 优点：
  - DEV 路由通过 `import.meta.env.DEV` 隔离；
  - 样例档有明确标签和场景；
  - 可以快速载入后期场景，适合做晚期联调。
- 问题在于“验证深度还不够”，不是方向错。

### 4. 博物馆 / 公会 / 瀚海都已经开始做跨系统推荐视图
这些系统不再是孤立页，而是会输出 `recommendedActions`、`themeWeekFocus`、`questBoardBiasProfile` 等摘要。  
从产品设计上看，这非常适合解决中后期“玩家不知道下一步做什么”的问题，方向值得保留。

### 5. 经济治理层已经具备观测、推荐、分层思维，不只是简单涨价/扣费
- **涉及文件**：`usePlayerStore.ts`、`useGoalStore.ts`、`useShopStore.ts`、`WalletView.vue`
- 优点：
  - 有财富分层；
  - 有推荐资金去向；
  - 有周快照和风险报告；
  - 有多系统 sink 思维。  
这说明后期经济治理不是“单纯塞几个高价商品”，而是已经形成一套较完整的治理模型。

### 6. DEV 调试入口没有直接裸奔到正式环境
- **涉及文件**：`src/router/index.ts:11-19`
- `/dev/late-game` 只在 DEV 注入，这是非常必要的底线，说明团队对调试入口暴露问题是有意识的。

---

## E. 建议的下一轮整改顺序

### 第一优先级：先堵住会坏经济 / 会重复领奖 / 会伪造结算的问题
1. **修瀚海赌场结算可信度**：为 Texas / Buckshot 建 session 与一次性结算校验。  
2. **修博物馆学者委托状态机**：杜绝“已领奖后可再接”。  
3. **补活动邮件真实闭环**：邮箱领取成功后同步 `goalStore` / `questStore` 的活动 mail 状态。

### 第二优先级：修存档与调试链，确保 QA 能真实验证
4. **改 `importSave()`**：导入前做语义级 `applySaveData()` 验证。  
5. **改调试页时间跳转**：补跑真实 daily/weekly/seasonal tick，不再只改日历。  
6. **统一样例档来源**：消除 `sampleSaves.ts` 与 `data-defaults/taoyuan_saves` 的双源认知。

### 第三优先级：修越权入口与状态源分叉
7. **给 `assignHouseholdRole()` / `activateSpiritBlessing()` 加 store 内部强校验**。  
8. **压缩派生缓存进存档的范围**：尤其是 `guidanceDigestState`。  
9. **统一活动/邮件/任务窗口的权威状态源**。

### 第四优先级：结构化重构，降低继续扩展的风险
10. **拆 `useGoalStore`**：目标、主题周、活动运营、周指标归档拆域。  
11. **拆 `useSaveStore`**：改成分 store migration registry。  
12. **拆 `useEndDay` / `useQuestStore`**：把跨系统事务编排与具体玩法逻辑解耦。

### 第五优先级：补自动化回归底座
13. **先做 store 级回归**：
   - 样例档载入；
   - 跨天；
   - 跨周；
   - 主题周切换；
   - 活动邮件领取；
   - 旧档迁移。  
14. **再做关键 E2E**：
   - `late_economy_foundation`：跨周 + 经济快照；
   - `breeding_specialist`：育种 × 特殊订单 × 主题周；
   - `fishpond_operator`：鱼塘 × 订单 × 周切换；
   - `endgame_showcase`：家庭 / 仙灵 / 博物馆 / 公会 / 瀚海 联动。

---

## 附：本次特别判定的“伪完成功能 / 接线不完整”

1. **活动邮件已领取防重**：有状态字段、有 store 方法，但没有接到真实邮箱领取链，属于**接线不完整**。  
2. **调试页日期跳转验证**：有入口、有 UI，但不走完整事务编排，属于**验证能力看似完整、实际不完整**。  
3. **`data-defaults/taoyuan_saves` 样例档**：对前端运行时不是实际载入源，属于**文档/元信息存在，但不是真实执行入口**。

---

## 建议立即建立的回归清单

1. 读取 `late_economy_foundation` 后连续跨 8 天，验证：主题周、周快照、推荐资金去向、商店目录推荐同步变化。  
2. 读取 `breeding_specialist` 后切周，验证：特殊订单、活动窗口、育种推荐、家庭/仙灵加成摘要是否同步。  
3. 读取 `fishpond_operator` 后切周，验证：鱼塘订单、周赛代理值、Quest 收集量是否一致。  
4. 读取 `endgame_showcase` 后验证：博物馆、公会、瀚海、家庭、仙灵是否全部有入口、有摘要、有可执行动作。  
5. 导入旧档 / 裁剪字段档 / 脏字段档，验证：导入是否被拦截、加载是否回滚、是否出现半加载状态。

---

## 第二轮复审补充（基于当前代码状态）

> 本节用于覆盖第一次审查之后的代码变化。结论分为三类：**已修复/已过时**、**仍然成立**、**新增问题**。

### 一、已修复或需要下调严重度的旧结论

#### 1. 博物馆“学者委托已领奖后可重复接取”主漏洞已基本修复
- **涉及文件**：`taoyuan-duli/taoyuan-main/src/stores/useMuseumStore.ts`
- 当前 `acceptScholarCommission()` 已显式拦截 `commission.state.rewarded`，旧报告中“已领奖后可再次接取并反复刷奖励”的 P0 结论，按当前代码已不再成立。
- **修订建议**：
  - 将该问题从“现存 P0”改为“已修复项”；
  - 仍保留后续观察点：若未来要支持跨周重开，应补 `weekId` 或更清晰的状态机边界，防止旧问题以新形态回归。

#### 2. `importSave()` 已不再只是结构校验，语义级验证已补上
- **涉及文件**：`taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts`
- 当前 `importSave()` 已先对导入内容执行一次 `applySaveData()` 验证，再恢复当前运行态，然后才真正写槽位。
- 旧报告中“导档只做 parse/normalize，坏档会直接写入槽位”的表述，已经**不完全成立**。
- **修订建议**：
  - 改为“已补语义级验证，但仍复用真实运行态做验证/恢复，尚未做到完全隔离的沙箱校验”。

#### 3. `familyWishCompletions` 死目标问题已修复
- **涉及文件**：`taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`
- 当前该指标已经接入 `npcStore.getFamilyWishOverview().state.completedWishIds.length`，不再永远返回 0。
- 旧报告中“正式周目标不可完成”的结论应从现存问题中移除，改列为已修复项。

#### 4. 村庄捐赠计划已从“只有摘要”升级为“可操作功能”
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useVillageProjectStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/HomeView.vue`
- 当前已经具备：
  - 物资校验；
  - 背包/仓库扣物；
  - 里程碑奖励发放；
  - Home 页快捷捐赠与领取入口。
- **修订建议**：
  - 旧报告中“WS02 村庄捐赠属于纯伪完成功能”的结论应下调；
  - 但 WS02 仍未达到完全收口，见新增问题。

### 二、仍然成立的旧结论

#### 1. 瀚海赌场结算仍不是权威服务端/权威 store 裁决，P0 仍成立
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/TexasHoldemGame.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/BuckshotRouletteGame.vue`
- 当前虽然新增了 `sessionId`、`activeTexasSession`、`activeBuckshotSession`，也增加了重复结算与无会话校验；
- 但 `endTexas(finalChips, tierName, sessionId)` 仍然**信任前端上传的最终筹码**，`endBuckshot(won, draw, sessionId)` 仍然**信任前端上传的胜负布尔值**。
- **结论**：问题从“完全裸奔”下降为“带会话票据的客户端裁决”，但并未真正闭环，仍应保留为高优先级问题。

#### 2. 调试页“应用日期并刷新主题周”依然不走真实完整结算链
- **涉及文件**：`taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue`
- 当前已经把按钮文案修正为“覆写日期（不跑完整结算）”，误导性下降；
- 但能力本身仍然只是改日历字段 + refresh goals/theme week，不会执行完整 `useEndDay` 周期编排。
- **结论**：这条问题仍成立，但优先级更偏向 QA 可信度与调试语义，而不是玩家态 bug。

#### 3. QA 治理面板仍然系统性进入正式玩家页面
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/game/WalletView.vue`
  - `BreedingView.vue`
  - `FishPondView.vue`
  - `GuildView.vue`
  - `HanhaiView.vue`
  - `MuseumView.vue`
  - `NpcView.vue`
  - `QuestView.vue`
  - `ShopView.vue`
  - `taoyuan-duli/taoyuan-main/src/components/game/QaGovernancePanel.vue`
- 组件内部虽用 `import.meta.env.DEV` 控制显示，但正式页面依然直接依赖该组件与治理文案。
- **结论**：正式玩家页面的信息层级污染问题仍成立，且在打包层面也没有真正剥离。

### 三、新增或需要更精确表达的问题

#### 1. 活动邮件链路已从“未接线”变成“部分闭环，但状态语义混乱”
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
  - `taoyuan-duli/taoyuan-main/src/utils/mailboxApi.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useGoalStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useQuestStore.ts`
  - `taoyuan-duli/server/src/routes/api.js`
- **现状**：
  - `useEndDay.ts` 已经会调用 `createSystemMailboxCampaign()` 投递活动系统邮件；
  - `MailView.vue` 在领取后也会回写 `markEventCampaignMailClaimed()` 与 `markActivityRewardMailClaimed()`。
- **问题**：
  - `markEventCampaignMailClaimed()` 这个名字语义是“已领取”，但在 `useEndDay.ts` 中**邮件创建成功时就被调用**；
  - 到 `MailView.vue` 真正领取时又再次调用一次，导致“已投递”和“已领取”状态混在同一个集合里；
  - 同时 `createSystemMailboxCampaign()` 依赖当前账号登录态，guest / 单机本地流程推进周切换时仍可能无法形成真实邮箱闭环。
- **修复建议**：
  1. 将“已投递”与“已领取”拆成两个状态源；
  2. 为 guest / 单机模式增加本地待同步邮件或本地邮件落盘能力；
  3. `event mail` 与 `activity reward mail` 的真实来源、模板、回执口径需要继续统一。

#### 2. 前端 QA 脚本能力明显增强，但后端测试仍缺位
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/package.json`
  - `taoyuan-duli/taoyuan-main/scripts/qa-late-game-samples.mjs`
  - `taoyuan-duli/server/package.json`
- **现状**：
  - 前端已新增：`qa:late-game-samples`、`qa:late-game`；
  - 4 套样例档已有基础脚本校验；
  - 当前前端 `type-check` / `lint` / `qa:late-game-samples` 可作为基础回归入口。
- **问题**：
  - 后端 `server/package.json` 仍没有 `test`；
  - 邮箱、服务端存档、账号态、活动邮件投递回执依然缺少自动化回归。
- **修复建议**：
  - 将“前端 QA 能力增强”写入肯定项；
  - 同时保留“后端测试缺位”作为仍需整改的问题。

#### 3. 最新分支一度出现明显的类型回归，说明跨 store 互相引用和 `any` 扩散仍是结构性风险
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts`
  - `useMuseumStore.ts`
  - `useVillageProjectStore.ts`
  - `useQuestStore.ts`
  - `useSaveStore.ts`
  - `useTutorialStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
  - `HomeView.vue`
  - `QuestView.vue`
  - `MuseumView.vue`
  - `NpcView.vue`
- **现象**：
  - 在本轮修改过程中，曾出现大量 TS7022 / TS7024 / TS7006 / TS7053 / TS2339 类错误；
  - 报错集中暴露了：store 互相递归引用、computed 推导缺少显式类型、页面层对跨 store 数据过度信任、`any` / 隐式 any 扩散。
- **结论**：
  - 即便后续已把当前 `type-check` 跑通，这一轮报错仍应写入审查补充中，作为“结构性风险证据”；
  - 说明项目现在不是“没有问题”，而是“靠宽松边界和局部修补暂时过了编译”。

### 四、建议同步修订的整改顺序

在原整改顺序上，建议做以下更新：

1. **保留瀚海赌场为第一优先级**，不要因为 sessionId 已补就误判为已收口。  
2. **活动邮件链路从“补接线”升级为“拆状态语义”**：投递、可见、领取、回执四层分别治理。  
3. **将前端 QA 脚本纳入“已取得进展”**，但把后端测试补齐提前到更靠前的位置。  
4. **把“类型边界与 store 循环依赖治理”前移**，因为最新一轮编译错误已经证明这不是纯维护性问题，而是会阻断开发的真实工程风险。

---

## 第三轮全链路复审（2026-04-13，基于 subagent 与当前工作树）

> 本节以本轮 `subagent` 全链路复审为准；若与前文“第二轮复审补充”有冲突，优先采用本节结论。

### 一、本轮总判断

当前版本已经不是“中后期系统没有落地”的状态，反而是**大量中后期功能真实接线后，开始暴露权威源、环境边界和验证链路问题**。本轮最需要上调的不是玩法壳层，而是两类全链路风险：

1. **邮箱奖励实际落点与前端当前存档会话并不总一致**；
2. **正式环境仍可能通过导入存档把调试/平衡覆盖带入运行态**。

这两类问题都不是简单的“UI 文案不严谨”，而是会直接影响玩家真实数据、QA 判定与线上稳定性的系统性问题。

### 二、需要从旧结论中继续纠偏的事项

#### 1. “瀚海赌场完全信任前端结果”需要拆分判断，不能一概而论
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts:1209-1311, 1313-1411`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
- **最新判断**：
  - **Texas** 仍然信任前端回传的 `finalChips`，只是增加了 `sessionId`、跨日失效、理论上限校验；
  - **Buckshot** 已不再直接信任 `won/draw` 布尔值，而是改为根据 `session.shells + playerActions` 在 store 内复盘 `resolveBuckshotOutcome()`；
  - 因此旧结论里“Texas / Buckshot 都完全信任前端”的说法已经不准确。
- **修订建议**：
  - 将问题改写为：**赌场可信度问题仍成立，但核心残留点已经收缩到 Texas 与少数客户端裁决路径，不应再把 Buckshot 按旧口径计入同级漏洞**。

#### 2. 活动邮件问题已不只是“状态语义混乱”，还包含“奖励落点权威源冲突”
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts:95-100, 131-146`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue:253-280`
  - `taoyuan-duli/server/src/routes/api.js`
  - `taoyuan-duli/server/src/taoyuanMailbox.js:212-225`
  - `taoyuan-duli/server/src/taoyuanHall.js:85-108, 221-249`
- **最新判断**：
  - 现在不仅有“活动层 mail claimed 语义不干净”的问题；
  - 还存在**前端当前存档模式 / 当前活跃槽位**与**服务端邮箱奖励实际写入槽位**不完全一致的问题。
- **结论**：
  - 活动邮件问题应从“P1 状态语义”上调为**包含 P0 数据权威风险的全链路问题**。

### 三、本轮新增或上调的高优先级问题

#### 1. 邮箱奖励的真实落点与前端当前会话存在双重权威源冲突，P0
- **风险等级**：P0
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts:95-100, 131-146`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue:253-280`
  - `taoyuan-duli/server/src/routes/api.js`（`/taoyuan/save/:slot`、`/taoyuan/mail/:id/claim`、`/taoyuan/mail/claim-all`）
  - `taoyuan-duli/server/src/taoyuanMailbox.js:212-225`
  - `taoyuan-duli/server/src/taoyuanHall.js:85-108, 221-249`
- **关键链路**：
  - `MailView.claimCurrentMail / claimAllRewards`
  - → `useMailboxStore.claimMail / claimAll`
  - → 服务端 `/api/taoyuan/mail/:id/claim` / `/claim-all`
  - → `taoyuanMailbox.applyRewardsToSave()`
  - → `getActiveSaveContext()` / `taoyuan_active_slots.json`
  - → 写回服务端槽位
- **问题说明**：
  1. `useMailboxStore.syncAfterClaim()` 中，若 `saveStore.storageMode !== 'server'`，直接返回 `true`，不会真正把服务端奖励重新载入到当前前端运行态；
  2. 但 `MailView.vue` 仍会提示“奖励已发放到当前桃源乡存档”；
  3. 服务端邮箱奖励写入依赖 `taoyuan_active_slots.json`，而前端另有 `useSaveStore.activeSlot / activeSlotMode`，两边并非同一权威源；
  4. 更严重的是，`GET /taoyuan/save/:slot` 作为读取接口，当前还会调用 `taoyuanHall.setActiveSaveSlot(req.session.username, slot)`，导致“读取哪个槽位”本身会改变服务端后续奖励写入目标。
- **具体后果**：
  - 玩家在本地存档模式领取邮件，UI 可能显示成功，但真实奖励只写入了服务端槽位；
  - QA 读取一个服务端槽位做排查，可能无意中改变后续邮件奖励投放目标；
  - “当前正在玩的档”与“邮箱奖励真正到账的档”可能不是同一份。
- **修复建议**：
  1. 明确邮箱奖励只允许在 `server` 存档模式下领取，或在 `local` 模式下明确提示“奖励仅到账服务端槽位”；
  2. 将“当前活跃槽位”统一成单一权威源，不要前后端各记一套；
  3. `GET /taoyuan/save/:slot` 不应产生副作用，不应在读取时改写 active slot；
  4. 邮件 claim 返回值应同时带回**实际写入的槽位**与**当前前端已同步状态**，避免 UI 误报。

#### 2. 正式环境仍可通过导入存档带入调试 / 平衡覆盖，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/MainMenu.vue`
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useSettingsStore.ts:159-180`
- **关键链路**：
  - 正式环境主菜单常驻“导入存档”入口
  - → `useSaveStore.importSave()` / `loadFromSlot()`
  - → `applySaveData()`
  - → `useSettingsStore.deserialize()`
  - → 恢复 `lateGameFeatureOverrides / lateGameBalanceOverrides`
- **问题说明**：
  - `setFeatureOverride()`、`setLateGameBalanceOverrides()` 虽然受 `import.meta.env.DEV` 限制；
  - 但 `deserialize()` 本身没有 DEV 过滤，导入存档时仍会把覆盖值恢复进运行态；
  - 这意味着正式环境并不是“无法使用调试覆盖”，而是“不能在 UI 上直接设置，但可以通过存档载入生效”。
- **具体后果**：
  - 构造过的存档可把 feature flag override / balance override 带入正式运行态；
  - QA 或玩家很难分辨当前运行结果到底是正式配置还是被导入档污染后的配置。
- **修复建议**：
  1. `useSettingsStore.deserialize()` 在非 DEV 环境下应主动清空 `lateGameFeatureOverrides / lateGameBalanceOverrides`；
  2. 存档导入时应标记“包含调试覆盖字段”的警告，必要时直接拒绝正式环境导入；
  3. 这类覆盖字段应考虑彻底从正式玩家可导入的存档模型中剥离。

#### 3. Texas 仍然不是权威结算，Buckshot 已收口但赌场问题未完全关闭，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts:1209-1311`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
- **问题说明**：
  - `startTexas()` 已记录 `activeTexasSession`；
  - `endTexas(finalChips, tierName, sessionId)` 也做了 session 校验与理论上限校验；
  - 但**最终筹码值仍由 UI 提交**，store 只是在一个较宽的上限内接受该结果；
  - 与之相比，Buckshot 已经通过 `resolveBuckshotOutcome()` 根据操作轨迹在 store 内部重算输赢。
- **修复建议**：
  1. Texas 也应收回到 store 内部裁决，至少让最终筹码演进可由 session + 行为轨迹复盘；
  2. 后续审查中不应继续把 Buckshot 与 Texas 按相同风险口径合并叙述。

#### 4. 最新类型回归证明 store 循环依赖 / 宽松边界仍是结构性风险，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useHanhaiStore.ts`
  - `useMuseumStore.ts`
  - `useVillageProjectStore.ts`
  - `useQuestStore.ts`
  - `useSaveStore.ts`
  - `useTutorialStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/HanhaiView.vue`
  - `HomeView.vue`
  - `QuestView.vue`
- **问题说明**：
  - 本轮分支曾出现大面积 TS7022 / TS7024 / TS7006 / TS7053 / TS2339；
  - 即便后续又把 `type-check` 过了，这也说明当前工程存在“稍微改一个 store，另一串 store / view 就一起失去类型稳定”的结构性问题。
- **结论**：
  - 这不是单纯的维护性建议，而是已经影响迭代效率与回归稳定性的真实工程风险。

### 四、验证链路与 QA 盲区

#### 1. 样例档真实加载源仍是 `sampleSaves.ts`，不是 `data-defaults/taoyuan_saves`
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts:1069-1087`
  - `taoyuan-duli/data-defaults/taoyuan_saves/*.json`
- **结论**：
  - `data-defaults` 目录目前更像说明/镜像资产，不是前端真实样例档载入源；
  - 这条旧结论继续成立。

#### 2. `qa-late-game-samples.mjs` 仍偏静态校验，不验证真实日结 / 周结链
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/scripts/qa-late-game-samples.mjs`
  - `taoyuan-duli/taoyuan-main/src/views/dev/LateGameDebugView.vue`
  - `taoyuan-duli/taoyuan-main/src/composables/useEndDay.ts`
- **结论**：
  - 当前脚本主要核查样例档字段与结构，不覆盖 `applySaveData()` 之后的页面可见性、`handleEndDay()` 的真实跨周 / 跨季副作用；
  - 调试页 `applyCalendarDebug()` 也仍明确是“覆写日期（不跑完整结算）”。

#### 3. 前端 QA 能力有进展，但后端自动化仍明显缺位
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/package.json`
  - `taoyuan-duli/taoyuan-main/scripts/qa-late-game-samples.mjs`
  - `taoyuan-duli/server/package.json`
- **结论**：
  - 前端已有 `qa:late-game-samples / qa:late-game / type-check / lint`；
  - 但后端邮箱、服务端存档、账号态仍没有正式 `test` script，这条问题继续成立。

### 五、本轮建议的优先级更新

1. **先修邮箱奖励与 active slot 双权威问题**，这是当前最容易造成“玩家说奖励领了但档没变”的 P0。  
2. **正式环境禁止导入档恢复 debug / balance overrides**，这是明确的环境边界缺口。  
3. **Texas 单独收口为权威结算**，同时把 Buckshot 从旧版“同级漏洞”中剥离。  
4. **把类型边界治理前移**，否则后续每轮修复都可能再次触发跨 store 类型雪崩。  
5. **继续保留样例档 / 调试页 / 后端测试的 QA 收口任务**，因为这些问题会持续影响你判断“到底是玩法 bug，还是验证方式错了”。



---

## 六、第四轮穷尽式逐文件审查（2026-04-14，基于 subagent 全量分片）

> 说明：这一轮不是抽样，也不是只看重点链路，而是把 `taoyuan-duli/taoyuan-main/src`、`taoyuan-duli/server/src`、`taoyuan-duli/tools`、`taoyuan-duli/taoyuan-main/android/app/src/main/java` 按目录分片后做逐文件阅读，再汇总结果。  
> 本轮总覆盖代码文件约 **220 个**（前端 `src` 210、后端 `server/src` 7、工具 1、Android Java 2）。  
> 对分片结果中出现冲突的条目，我按当前仓库代码做了统一口径复核；例如“setup store 缺少 `$reset`”这一项，因 `src/main.ts` 已在启动期为 setup store 注入统一 `$reset`，**不再视为当前有效 bug**。

### 6.1 穷尽式逐文件审查后的总体判断

这一轮全量阅读后，项目的结论比前几轮更清晰：它确实已经进入“完整产品代码库”阶段，而不是若干主链 + 一堆空壳目录；但也正因为**几乎所有玩法、运营、存档、调试、管理、服务端桥接都已经铺开**，代码库开始出现另一类风险——不是“没实现”，而是**边界处的真实权威缺口、数据表失真、样例档漂移、配置与实现脱节、全局工具侵入正式玩家态**。

换句话说：当前版本最值得担心的，已经不再只是几个主链功能点，而是“全库范围内的小型不一致”累积后，最终会在某个跨天、导档、领奖、兑换或配置切换时爆炸。这类问题只有做逐文件穷尽式审查才会暴露出来。

### 6.2 本轮新增/升级的重要问题（按风险排序）

#### 1. 服务端额度导出链路疑似完全信任客户端申报金额，没有服务端真实扣款校验，P0
- **风险等级**：P0
- **涉及文件**：
  - `taoyuan-duli/server/src/routes/api.js`
- **触发条件**：用户调用额度导出/兑换相关接口，仅提交一个 `money` 数值。
- **问题说明**：
  - 本轮后端逐文件审查发现，额度导出链路的服务端校验重点放在账号额度与日上限，而不是“这笔导出的桃源货币是否真的从对应服务端存档中扣除”；
  - 这会形成典型的**服务端真实资产与兑换额度系统脱钩**风险。
- **影响**：
  - 若前端/请求层被篡改，可直接制造额度增长；
  - 会污染真钱/额度/铜钱三者间的经济权威边界。
- **建议**：
  1. 导出必须由服务端直接读取并扣减当前 active save 的真实金钱，而不是相信客户端提交金额；
  2. 额度变动与存档扣款必须同事务/同锁处理；
  3. 为导出链路补最小自动化测试。

#### 2. 邮件领奖仍是“先改服务端存档，再改邮箱记录”的跨文件非原子流程，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/server/src/taoyuanMailbox.js`
  - `taoyuan-duli/server/src/routes/api.js`
- **触发条件**：领取邮件或一键领取时，如果写存档成功、写邮箱记录失败，或中途进程异常。
- **问题说明**：
  - `applyRewardsToSave()` 会先把奖励写进服务端存档；
  - 后续才把 `claimed_at / claim_result / claim_logs` 持久化到邮箱文件。
- **影响**：
  - 可能出现“奖励已到账，但邮箱仍显示未领取”或重复领取窗口；
  - crash/restart 后难以判断到底该补偿还是回滚。
- **建议**：
  1. 邮件发奖与领取落档至少做同锁内事务顺序控制；
  2. 引入幂等 claim token / 预提交标记；
  3. 异常恢复时优先以 claim log 为唯一回执源。

#### 3. `useMailboxStore` 领取后仍通过整槽 `loadFromSlot()` 做同步，存在覆盖未保存当前会话的风险，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useMailboxStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useSaveStore.ts`
  - `taoyuan-duli/taoyuan-main/src/views/game/MailView.vue`
- **触发条件**：当前运行中是服务端槽位，但本地运行态尚有未保存变更时去领邮件。
- **问题说明**：
  - 本轮已修复“语义误报”和 `GET /save/:slot` 副作用；
  - 但当前同步策略仍是：邮件领取成功后，直接重新加载对应服务端槽位。若当前运行态尚有未保存内容，就会被服务端旧档 + 邮件奖励覆盖。
- **影响**：
  - 玩家可能感觉“领完邮件后某些刚操作的状态回退了”；
  - 会让邮箱链路继续成为服务端/前端存档竞争点。
- **建议**：
  1. 理想方案是做增量 merge，而不是整槽 reload；
  2. 次优方案是在 claim 前强制保存当前同槽服务端会话，再请求奖励写入；
  3. UI 应明确提示“本次同步会以服务端槽位为准”。

#### 4. 管理员口令仍在前端持久化使用，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/TaoyuanAdminView.vue`
  - `taoyuan-duli/taoyuan-main/src/views/UserAdminView.vue`
  - `taoyuan-duli/taoyuan-main/src/utils/taoyuanAiApi.ts`
  - `taoyuan-duli/taoyuan-main/src/utils/taoyuanMailboxAdminApi.ts`
  - `taoyuan-duli/taoyuan-main/src/utils/userAdminApi.ts`
- **触发条件**：共享设备、浏览器插件、XSS、开发者工具读取本地存储。
- **问题说明**：
  - 本轮视图/工具逐文件审查确认：管理员相关页面与 API 封装依旧依赖前端存储的 admin token / super admin token；
  - 这不是普通“记住登录状态”，而是高权限口令长期暴露在前端可读介质中。
- **影响**：
  - 一旦泄露，可直接触发用户管理、导出/迁移存档、全服邮件、AI 配置等高危操作。
- **建议**：
  1. 改为后端签发短时效 HttpOnly 管理会话；
  2. 前端不再持久化原始管理员口令；
  3. 至少给高危操作加二次确认与审计扩展字段。

#### 5. `useGameLog.ts` 默认允许 HTML 渲染，存在全局 XSS 注入面，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/composables/useGameLog.ts`
- **触发条件**：日志文本、浮字文本、异常消息或服务端返回消息中混入 HTML。
- **问题说明**：
  - 本轮工具/组合逻辑逐文件审查指出：Qmsg 配置启用了 HTML 渲染；
  - 而 `addLog/showFloat` 的调用来源很多，包括异常消息、服务器提示、运营文案等。
- **影响**：
  - 会把单点文案污染升级成全局前端 XSS 面。
- **建议**：
  1. 默认禁用 HTML；
  2. 必须展示富文本时做白名单转义；
  3. 所有服务端 msg 当作纯文本处理。

#### 6. 样例档 `sampleSaves.ts` 与真实类型已经发生 schema 漂移，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/data/sampleSaves.ts`
  - `taoyuan-duli/taoyuan-main/src/types/fishPond.ts`
- **触发条件**：加载内置样例档、以样例档作为 QA/回归基线。
- **问题说明**：
  - 本轮 data/types 穷尽审查发现，样例档中的鱼塘 genetics 字段名与 `FishGenetics` 类型已不一致；
  - 同时样例里还存在若干可疑物品 ID，说明它已经不是完全可信的“真实运行档镜像”。
- **影响**：
  - QA 脚本虽然通过，但可能只是“宽松容错下的通过”；
  - 样例档会误导功能验证与旧档兼容判断。
- **建议**：
  1. 让样例档直接复用真实存档 envelope 类型；
  2. 对样例档做 schema 校验脚本，而不是只做字段存在性校验；
  3. 把 `data-defaults` 与 `sampleSaves.ts` 的职责进一步统一或明确分离。

#### 7. `items.ts / crops.ts / forage.ts` 存在同 ID 资源冲突，P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/data/items.ts`
  - `taoyuan-duli/taoyuan-main/src/data/crops.ts`
  - `taoyuan-duli/taoyuan-main/src/data/forage.ts`
- **触发条件**：通过统一 `getItemById` / 图鉴 / 背包 / 来源展示解析相关资源时。
- **问题说明**：
  - 本轮 data 全读发现至少存在 `mulberry` 这类跨表同 ID 冲突；
  - 这类冲突不是立刻崩溃型 bug，但会让展示、掉落来源、图鉴归类和奖励解释出现静默串表。
- **影响**：
  - 玩家看到的物品名/来源/分类可能错乱；
  - 会污染任务、图鉴和加工链的可解释性。
- **建议**：
  1. 统一建立跨表 ID 命名约束；
  2. 为 crop / forage / item 做带前缀命名或独立解析域；
  3. 补一个全数据表重复 ID 检查脚本。

#### 8. `villageProjects.ts` 中存在疑似无效 itemId（如 `paper`、`bait`），P1
- **风险等级**：P1
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/data/villageProjects.ts`
- **触发条件**：捐赠计划、里程碑奖励或建设条件真正消费这些条目时。
- **问题说明**：
  - 穷尽式数据审查发现，部分项目配置引用的物品 ID 不像真实物品表中的正式定义，尤其 `bait` 更像分类名而非具体物品。
- **影响**：
  - 可能出现捐赠无法完成、奖励发不出、UI 显示原始 ID 的问题。
- **建议**：
  1. 全量核对 `villageProjects.ts` 对物品表的引用；
  2. 把“配置引用校验”加入 CI/QA 脚本。

#### 9. `useAchievementStore` 与 `useCookingStore` 暴露出真实业务 bug，不只是架构建议，P1/P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/stores/useAchievementStore.ts`
  - `taoyuan-duli/taoyuan-main/src/stores/useCookingStore.ts`
- **问题说明**：
  - `useAchievementStore`：完美度技能归一化口径与真实上限不一致；`submitToBundle` 可超额吞物；
  - `useCookingStore`：`cook()` 内部未强校验技能门槛；`eat()` 先删物再校验 recipe。
- **影响**：
  - 一个是进度/成就失真与玩家资产损失；
  - 一个是可绕过技能门槛或因脏档/缺表吞掉食物。
- **建议**：
  - 这两组问题应作为独立修复项排进后续整改列表，而不是只记为“代码味道”。

#### 10. `MainMenu.vue` / 公共配置返回链接缺少可信域校验，P2
- **风险等级**：P2
- **涉及文件**：
  - `taoyuan-duli/taoyuan-main/src/views/MainMenu.vue`
  - `taoyuan-duli/server/src/routes/api.js`
  - `taoyuan-duli/server/src/config.js`
- **触发条件**：后台把 `taoyuan_return_button_url` 配成恶意外链。
- **影响**：
  - 玩家会被前端直接引导到未校验 URL；
  - 属于运营配置型跳转风险。
- **建议**：
  1. 前后端都做 allowlist / same-origin 校验；
  2. 配置层明确只允许站内路径或白名单域名。

#### 11. 视图层存在多处超大单文件，维护风险已从“建议”升级为“稳定性隐患”，P2/P3
- **涉及文件**：
  - `src/views/game/ShopView.vue`（约 2300+ 行）
  - `src/views/game/FarmView.vue`（约 2200+ 行）
  - `src/views/HallView.vue`（约 1500+ 行）
  - `src/views/game/NpcView.vue`、`BreedingView.vue`、`MiningView.vue`、`ProcessingView.vue`
- **问题说明**：
  - 穷尽式覆盖校验顺带统计了 views/components 行数，已经出现多个超大型页面；
  - 这类页面并不是“风格不优雅”这么简单，而是任何小改动都更容易引入 watch/computed/局部状态串扰。
- **建议**：
  - 后续审查不要只盯 store，视图层也需要进入拆分计划；
  - 先从 `ShopView/FarmView/HallView` 三个最大页面拆分。

### 6.3 本轮穷尽审查中的“撤回/降级”结论

以下条目在分片审查中曾被单独提出，但经全局口径复核后不再作为当前有效 bug：

- **“多个 setup store 缺少 `$reset`”**：撤回。`src/main.ts` 已在启动期为 setup store 注入统一 `$reset`，所以这不是当前工作树的真实运行时阻塞。  
- **“Buckshot 仍完全信任前端布尔值”**：撤回。当前主残留点已集中在 Texas。  
- **“QA 治理面板污染正式玩家页”**：当前正式构建已被 `DEV` 条件收口，不再作为现阶段的玩家态阻塞项，但仍可保留为信息架构优化建议。

### 6.4 本轮穷尽式逐文件审查覆盖清单（代码文件）

#### 前端入口 / 路由
- `taoyuan-duli/taoyuan-main/src/App.vue`
- `taoyuan-duli/taoyuan-main/src/env.d.ts`
- `taoyuan-duli/taoyuan-main/src/main.ts`
- `taoyuan-duli/taoyuan-main/src/router/index.ts`

#### composables
- `src/composables/useAudio.ts`
- `src/composables/useCombinedInventory.ts`
- `src/composables/useDialogs.ts`
- `src/composables/useEndDay.ts`
- `src/composables/useFarmActions.ts`
- `src/composables/useFarmHarvest.ts`
- `src/composables/useGameClock.ts`
- `src/composables/useGameLog.ts`
- `src/composables/useHiddenNpcActions.ts`
- `src/composables/useHiddenNpcDiscovery.ts`
- `src/composables/useNavigation.ts`
- `src/composables/useResetGame.ts`
- `src/composables/useWebdav.ts`

#### utils
- `src/utils/accountStorage.ts`
- `src/utils/mailboxApi.ts`
- `src/utils/quotaExchangeApi.ts`
- `src/utils/safeMarkdown.ts`
- `src/utils/serverSaveApi.ts`
- `src/utils/taoyuanAiApi.ts`
- `src/utils/taoyuanHallApi.ts`
- `src/utils/taoyuanMailboxAdminApi.ts`
- `src/utils/taoyuanRewardCatalog.ts`
- `src/utils/userAdminApi.ts`
- `src/utils/weekCycle.ts`

#### stores
- `src/stores/useAchievementStore.ts`
- `src/stores/useAiAssistantStore.ts`
- `src/stores/useAnimalStore.ts`
- `src/stores/useBreedingStore.ts`
- `src/stores/useCookingStore.ts`
- `src/stores/useDecorationStore.ts`
- `src/stores/useFarmStore.ts`
- `src/stores/useFishingStore.ts`
- `src/stores/useFishPondStore.ts`
- `src/stores/useGameStore.ts`
- `src/stores/useGoalStore.ts`
- `src/stores/useGuildStore.ts`
- `src/stores/useHanhaiStore.ts`
- `src/stores/useHiddenNpcStore.ts`
- `src/stores/useHomeStore.ts`
- `src/stores/useInventoryStore.ts`
- `src/stores/useMailboxStore.ts`
- `src/stores/useMiningStore.ts`
- `src/stores/useMuseumStore.ts`
- `src/stores/useNpcStore.ts`
- `src/stores/usePlayerStore.ts`
- `src/stores/useProcessingStore.ts`
- `src/stores/useQuestStore.ts`
- `src/stores/useSaveStore.ts`
- `src/stores/useSecretNoteStore.ts`
- `src/stores/useSettingsStore.ts`
- `src/stores/useShopStore.ts`
- `src/stores/useSkillStore.ts`
- `src/stores/useTutorialStore.ts`
- `src/stores/useVillageProjectStore.ts`
- `src/stores/useWalletStore.ts`
- `src/stores/useWarehouseStore.ts`

#### data
- `src/data/achievements.ts`
- `src/data/animals.ts`
- `src/data/balance/lateGameBalance.ts`
- `src/data/breeding.ts`
- `src/data/breedingContests.ts`
- `src/data/buildings.ts`
- `src/data/collectionRegistry.ts`
- `src/data/crops.ts`
- `src/data/decorations.ts`
- `src/data/equipmentSets.ts`
- `src/data/events.ts`
- `src/data/farmEvents.ts`
- `src/data/farmMaps.ts`
- `src/data/fish.ts`
- `src/data/fishPond.ts`
- `src/data/fishPondContests.ts`
- `src/data/forage.ts`
- `src/data/fruitTrees.ts`
- `src/data/glossary.ts`
- `src/data/goals.ts`
- `src/data/guild.ts`
- `src/data/hanhai.ts`
- `src/data/hats.ts`
- `src/data/heartEvents.ts`
- `src/data/hiddenNpcHeartEvents.ts`
- `src/data/hiddenNpcs.ts`
- `src/data/index.ts`
- `src/data/items.ts`
- `src/data/market.ts`
- `src/data/mine.ts`
- `src/data/museum.ts`
- `src/data/npcs.ts`
- `src/data/npcTips.ts`
- `src/data/npcWorld.ts`
- `src/data/pondBreeds.ts`
- `src/data/processing.ts`
- `src/data/quests.ts`
- `src/data/recipes.ts`
- `src/data/rewardTickets.ts`
- `src/data/rings.ts`
- `src/data/sampleSaves.ts`
- `src/data/secretNotes.ts`
- `src/data/shoes.ts`
- `src/data/shopCatalog.ts`
- `src/data/shops.ts`
- `src/data/storyQuests.ts`
- `src/data/systemFlags.ts`
- `src/data/themes.ts`
- `src/data/timeConstants.ts`
- `src/data/travelingMerchant.ts`
- `src/data/tutorials.ts`
- `src/data/upgrades.ts`
- `src/data/villageProjects.ts`
- `src/data/wallet.ts`
- `src/data/weapons.ts`
- `src/data/weeklyBudgets.ts`
- `src/data/wildTrees.ts`

#### types
- `src/types/achievement.ts`
- `src/types/aiAssistant.ts`
- `src/types/analytics.ts`
- `src/types/animal.ts`
- `src/types/breeding.ts`
- `src/types/economy.ts`
- `src/types/equipment.ts`
- `src/types/farm.ts`
- `src/types/fishPond.ts`
- `src/types/game.ts`
- `src/types/goal.ts`
- `src/types/guild.ts`
- `src/types/hall.ts`
- `src/types/hanhai.ts`
- `src/types/hiddenNpc.ts`
- `src/types/index.ts`
- `src/types/item.ts`
- `src/types/log.ts`
- `src/types/mine.ts`
- `src/types/museum.ts`
- `src/types/npc.ts`
- `src/types/processing.ts`
- `src/types/quest.ts`
- `src/types/ring.ts`
- `src/types/secretNote.ts`
- `src/types/shopCatalog.ts`
- `src/types/skill.ts`
- `src/types/tutorial.ts`
- `src/types/villageProject.ts`
- `src/types/wallet.ts`

#### views
- `src/views/AuthView.vue`
- `src/views/GameLayout.vue`
- `src/views/HallView.vue`
- `src/views/MainMenu.vue`
- `src/views/TaoyuanAdminView.vue`
- `src/views/UserAdminView.vue`
- `src/views/dev/LateGameDebugView.vue`
- `src/views/game/AchievementView.vue`
- `src/views/game/AnimalView.vue`
- `src/views/game/BreedingView.vue`
- `src/views/game/CharInfoView.vue`
- `src/views/game/CookingView.vue`
- `src/views/game/CottageView.vue`
- `src/views/game/DecorationView.vue`
- `src/views/game/FarmView.vue`
- `src/views/game/FishingView.vue`
- `src/views/game/FishPondView.vue`
- `src/views/game/ForageView.vue`
- `src/views/game/GuildView.vue`
- `src/views/game/HanhaiView.vue`
- `src/views/game/HomeView.vue`
- `src/views/game/InventoryView.vue`
- `src/views/game/MailView.vue`
- `src/views/game/MiningView.vue`
- `src/views/game/MuseumView.vue`
- `src/views/game/NpcView.vue`
- `src/views/game/ProcessingView.vue`
- `src/views/game/QuestView.vue`
- `src/views/game/ShopView.vue`
- `src/views/game/SkillView.vue`
- `src/views/game/ToolUpgradeView.vue`
- `src/views/game/VillageView.vue`
- `src/views/game/WalletView.vue`

#### components
- `src/components/game/AiAssistantWidget.vue`
- `src/components/game/BuckshotRouletteGame.vue`
- `src/components/game/Button.vue`
- `src/components/game/DiscoveryScene.vue`
- `src/components/game/Divider.vue`
- `src/components/game/DragonBoatView.vue`
- `src/components/game/DumplingMakingView.vue`
- `src/components/game/EventDialog.vue`
- `src/components/game/FireworkShowView.vue`
- `src/components/game/FishingContestView.vue`
- `src/components/game/FishingMiniGame.vue`
- `src/components/game/GlossaryTab.vue`
- `src/components/game/GuidanceDigestPanel.vue`
- `src/components/game/HarvestFairView.vue`
- `src/components/game/HeartEventDialog.vue`
- `src/components/game/HiddenNpcModal.vue`
- `src/components/game/ItemCollectionTab.vue`
- `src/components/game/KiteFlyingView.vue`
- `src/components/game/LanternRiddleView.vue`
- `src/components/game/MobileMapMenu.vue`
- `src/components/game/PerkSelectDialog.vue`
- `src/components/game/PotThrowingView.vue`
- `src/components/game/QaGovernancePanel.vue`
- `src/components/game/SaveManager.vue`
- `src/components/game/SettingsDialog.vue`
- `src/components/game/StatusBar.vue`
- `src/components/game/TeaContestView.vue`
- `src/components/game/TexasHoldemGame.vue`
- `src/components/game/TopGoalsPanel.vue`

#### server / tools / Android 平台侧
- `taoyuan-duli/server/src/config.js`
- `taoyuan-duli/server/src/db.js`
- `taoyuan-duli/server/src/index.js`
- `taoyuan-duli/server/src/taoyuanAiAssistant.js`
- `taoyuan-duli/server/src/taoyuanHall.js`
- `taoyuan-duli/server/src/taoyuanMailbox.js`
- `taoyuan-duli/server/src/routes/api.js`
- `taoyuan-duli/tools/generate_late_game_plan.py`
- `taoyuan-duli/taoyuan-main/android/app/src/main/java/com/games/wenzi/taoyuan/MainActivity.java`
- `taoyuan-duli/taoyuan-main/android/app/src/main/java/com/games/wenzi/taoyuan/SaveMigrator.java`

### 6.5 本轮建议的后续动作顺序

1. **先处理真实权威边界问题**：额度导出、邮件领奖原子性、邮箱整槽同步。  
2. **再处理配置/数据表失真**：`sampleSaves.ts`、`villageProjects.ts`、跨表同 ID。  
3. **随后清理全局安全面**：管理员 token 持久化、日志 HTML 渲染、外链白名单。  
4. **最后推进可维护性重构**：超大页面拆分、data/types 去重、样例档 schema 校验脚本化。

---

## 七、2026-04-14 晚间整改进展

本轮根据第四轮穷尽式审查，已完成以下可确定落地的修复：

1. **额度兑换与当前服务端会话一致性**
   - `server/src/taoyuanHall.js`、`server/src/routes/api.js` 已把额度导入/导出绑定到当前 active save；服务端会先校验存在可用服务端存档，再真实增减桃源货币。
   - `src/views/game/WalletView.vue` 已限制为“当前已载入的服务端存档”才允许兑换，避免本地模式或未载入服务端槽位时继续走在线额度链路。

2. **全局日志安全面**
   - `src/composables/useGameLog.ts` 已关闭 Qmsg HTML 渲染，`resetLogs()` 也会同步清空 `logHistory`，对应“日志 XSS / 新档残留旧日志”问题已收口。

3. **确定性业务 bug**
   - `src/stores/useAchievementStore.ts` 已修复祠堂提交超额吞物，并把完美度技能占比改回按 20 级上限归一化。
   - `src/stores/useCookingStore.ts` 已补齐 `cook()` 内部技能门槛校验，并把 `eat()` 调整为先验 recipe 再删物。

4. **配置与样例档失真**
   - `src/data/items.ts` 已补正式 `paper` 物品定义；`src/data/villageProjects.ts` 中的奖励鱼饵已改为真实 itemId `standard_bait`。
   - `src/data/sampleSaves.ts` 已修正鱼塘 genetics 字段，`scripts/qa-late-game-samples.mjs` 已新增 fish genetics schema 与样例 itemId 合法性校验。

5. **主菜单返回链接安全**
   - `src/views/MainMenu.vue` 与 `/api/public-config` 已加站内链接校验；不安全链接会回退为 `/`，不再直接信任配置外链。

### 7.1 本轮后仍未完全收口的项

以下问题仍建议保留在后续轮次：

- **邮箱领奖原子性与整槽 reload 同步**：虽然前几轮已修 active slot 副作用与提示语义，但“服务端发奖 + 邮箱状态写回”仍非原子；前端领取后仍通过整槽 reload 热同步。
- **管理员 token 前端持久化**：高权限口令仍未完全改造成 HttpOnly 会话。
- **超大 View / Store 拆分**：属于中期可维护性治理项，本轮未展开结构重构。




