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
