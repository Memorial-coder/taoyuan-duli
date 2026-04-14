# 桃源乡全链路复审报告（当前代码状态版）

## 审查范围与方法

本轮是基于**当前最新代码**做的重新复审，不沿用旧结论默认成立。

覆盖范围：

- 前端主工程：`taoyuan-main`
- 后端独立版服务：`server`
- 全链路关注点：
  - 主菜单 → 登录/注册 → 存档管理 → 进入游戏
  - 本地/服务端存档、导入/导出、邮箱领奖
  - 日结 / 周结 / 主题周 / 活动周 / 活动任务窗口
  - 特殊订单、公会、博物馆、瀚海、鱼塘、育种等晚期系统
  - UI 信息层级、主壳职责、页面密度、维护性与性能风险

本轮方法：

- 主线程代码复核
- 两个 subagent 并行复审（玩法链路 / UI性能）
- 对 subagent 结论回到代码做二次验真
- 运行检查：前端 `type-check`、`lint`

运行结果：

- 前端 `type-check` 通过
- 前端 `lint` 通过

---

## 一句话结论

和上一版相比，这个项目的**活动邮件闭环、活动邮件状态语义、主菜单登录/存档入口、邮件页结构、QA 面板正式环境显示**等点，已经有明显修正；但从“全链路当前状态”看，仍有几类问题没有真正消失：

1. **导入存档校验仍会真实污染当前运行态**。  
2. **邮箱奖励仍然只写服务端档，本地模式下仍会误提示“已发放到当前存档”**。  
3. **主游戏壳、商店页、任务页的首屏解释层仍然压过操作层**。  
4. **晚期系统里，周信号联动很强，但周兑现闭环仍明显弱于信号层**。  

也就是说：

> 项目当前已经从“很多系统半接上”进化到“多数系统能跑且相互联动”，但还没有完全进入“闭环稳定、边界清晰、玩家和 QA 都容易理解”的状态。

---

## 一、确认已修复 / 已明显改善的项目

## 1. 活动邮件已建立真实投递桥，且“已投递 / 已领取”状态已拆分

### 证据

- [useEndDay.ts:984-992](taoyuan-main/src/composables/useEndDay.ts#L984-L992)
- [useGoalStore.ts:1690-1717](taoyuan-main/src/stores/useGoalStore.ts#L1690-L1717)
- [MailView.vue:160-173](taoyuan-main/src/views/game/MailView.vue#L160-L173)
- [MailView.vue:253-279](taoyuan-main/src/views/game/MailView.vue#L253-L279)

### 复核结论

这一项和上一版相比，**已经明显修复**：

- 日结里现在会真实调用系统邮件投递；
- `useGoalStore` 里已经把“dispatch”与“claim”拆成两套状态；
- `MailView` 领取奖励后会同步回写活动状态；
- 刷新邮件时也会同步已领取活动邮件回执。

所以旧报告里“活动邮件只算状态、不真正投递”“已投递和已领取混用”这两项，不应再按原等级继续保留。

---

## 2. 主菜单 → 登录/注册 → 存档方式 的前置链路明显更清楚了

### 证据

- [MainMenu.vue:19-76](taoyuan-main/src/views/MainMenu.vue#L19-L76)
- [MainMenu.vue:79-176](taoyuan-main/src/views/MainMenu.vue#L79-L176)
- [AuthView.vue:11-98](taoyuan-main/src/views/AuthView.vue#L11-L98)
- [SaveManager.vue:7-40](taoyuan-main/src/components/game/SaveManager.vue#L7-L40)
- [SaveManager.vue:41-137](taoyuan-main/src/components/game/SaveManager.vue#L41-L137)

### 复核结论

这一块比上一版成熟很多：

- 主菜单把“账号状态”和“存档方式”明确拆开；
- 登录/注册已变成独立页面；
- SaveManager 会先解释本地 / 服务端差异，再给具体操作。

旧报告里“开始流程认知负担大、认证/存档入口混在一起”的问题，当前已经**明显改善**。

---

## 3. 邮件页的结构化阅读流明显变好了

### 证据

- [MailView.vue:1-59](taoyuan-main/src/views/game/MailView.vue#L1-L59)
- [MailView.vue:61-128](taoyuan-main/src/views/game/MailView.vue#L61-L128)
- [MailView.vue:133-307](taoyuan-main/src/views/game/MailView.vue#L133-L307)

### 复核结论

邮箱页面现在已经是当前项目里相对更成熟的一页：

- 左侧列表、右侧详情清晰；
- 活动摘要、单封领取、一键领取、领取结果都有明确分区；
- 与旧版相比，信息流明显更顺。

不过也要补充一点：**详情区仍没有显式 loading 态**，列表快速切换邮件时虽有 `selectRequestId` 防串，但请求期间用户看不到明确的加载反馈。这不影响它已经明显改善的结论，但仍是后续可继续优化的交互缺口。

这属于**确认改善**项。

---

## 4. QA 治理面板已限制在 DEV 环境显示

### 证据

- [QaGovernancePanel.vue:144-145](taoyuan-main/src/components/game/QaGovernancePanel.vue#L144-L145)

### 复核结论

这意味着旧报告里“QA 治理直接污染正式玩家页面”的判断，当前应当**降级**：

- 组件本身现在已经受 `import.meta.env.DEV` 控制；
- 正式构建不会直接展示这一块。

不过，页面结构里仍然保留了这些组件引用，因此它在开发态的页面密度问题依旧存在，只是不再是正式玩家面的问题。

---

## 二、当前仍然成立的高优先级问题

## P0-1：导入存档的“校验”仍会真实改写当前运行态，失败时可能污染现场

### 证据

- [useSaveStore.ts:1044-1062](taoyuan-main/src/stores/useSaveStore.ts#L1044-L1062)
- [useSaveStore.ts:720-857](taoyuan-main/src/stores/useSaveStore.ts#L720-L857)

### 当前状态判断

**仍成立，且仍是当前最危险的存档链路问题之一。**

### 说明

`importSave()` 现在仍然采用：

1. `buildCurrentSaveData()` 拍当前快照；
2. `applySaveData(data, previousActiveSlot)` 真正把导入档加载进当前运行态；
3. 再 `applySaveData(runtimeSnapshot, previousActiveSlot)` 恢复原现场；
4. 成功后才写入目标槽位。

这说明导入前的“校验”不是纯校验，而是一次真实加载 + 一次真实恢复。

### 风险

- 一旦恢复链路失败，当前会话可能被污染；
- 任何未来新增的 `deserialize()` 副作用，都会放大这个问题；
- 它不是“理论风险”，而是结构上就不安全。

### 结论

这项在当前代码里**没有修掉**，应保留为 P0。

---

## P0-2：邮箱奖励仍然只写服务端存档，本地模式下依然会误导为“已发放到当前存档”

### 证据

- [useMailboxStore.ts:95-100](taoyuan-main/src/stores/useMailboxStore.ts#L95-L100)
- [MailView.vue:253-263](taoyuan-main/src/views/game/MailView.vue#L253-L263)
- [taoyuanMailbox.js:896-939](server/src/taoyuanMailbox.js#L896-L939)

### 当前状态判断

**仍成立。**

### 说明

后端邮箱领奖仍然是：

- 直接改服务端用户存档；
- 再把写回后的服务端槽位保存起来；
- 并不会修改本地模式运行态。

但前端 `syncAfterClaim()` 在 `storageMode !== 'server'` 时仍然直接返回 `true`，`MailView` 仍会提示“奖励已发放到当前桃源乡存档”。

### 风险

- 本地模式玩家领取邮箱奖励后，看到的是成功提示；
- 实际改变的是服务端档，不是当前本地档；
- 会直接形成“我领了，但当前档没变化”的严重认知裂缝。

### 结论

这项在当前代码里**仍未修复**，继续保留为 P0。

---

## P1-1：主游戏壳仍然承担过多全局弹窗与系统入口，职责集中问题没有消失

### 证据

- [GameLayout.vue:28-260](taoyuan-main/src/views/GameLayout.vue#L28-L260)

### 当前状态判断

**仍成立。**

### 说明

`GameLayout.vue` 当前仍然集中挂载：

- 设置
- 存档管理
- 地图菜单
- 季节事件
- 心事件
- 仙灵发现
- 节日小游戏
- 技能专精
- 宠物领养
- 家庭提议
- 晨间事件
- 虚空箱及其二级弹窗

它已经不是单纯的“页面壳”，而是全局 UI 调度中心。

### 风险

- 壳层维护成本继续升高；
- z-order、焦点、状态互斥、回归面都很大；
- 新增一个全局功能时，最容易继续往这里堆。

### 结论

旧问题仍成立，而且当前交互更完整后，**壳层复杂度反而进一步上升**。

---

## P1-2：商店页首屏仍然被多层经济/市场/治理摘要压后，核心购物操作不够靠前

### 证据

- [ShopView.vue:2-5](taoyuan-main/src/views/game/ShopView.vue#L2-L5)
- [ShopView.vue:42-172](taoyuan-main/src/views/game/ShopView.vue#L42-L172)
- [ShopView.vue:173-237](taoyuan-main/src/views/game/ShopView.vue#L173-L237)

### 当前状态判断

**仍成立。**

### 说明

商店页在真正进入“商圈/购买”之前，先出现：

- GuidanceDigestPanel
- QaGovernancePanel（DEV）
- 经济观测看板
- 市场轮换看板
- 多块推荐与风险信息

### 风险

- 首屏信息竞争强；
- 核心操作被压后；
- 移动端更容易出现“先看解释，后做操作”的疲劳感。

### 结论

旧问题没有消失，只是内容比以前更系统化了。

---

## P1-3：任务页首屏同样被引导/活动/村庄建设提示层堆高，真实任务列表不够靠前

### 证据

- [QuestView.vue:8-29](taoyuan-main/src/views/game/QuestView.vue#L8-L29)
- [QuestView.vue:30-104](taoyuan-main/src/views/game/QuestView.vue#L30-L104)
- [QuestView.vue:106-169](taoyuan-main/src/views/game/QuestView.vue#L106-L169)

### 当前状态判断

**仍成立。**

### 说明

任务页在真实任务操作之前，先堆了：

- 引导
- QA 面板（DEV）
- 经营提示
- 活动编排
- 限时任务窗口
- 主题周
- 特殊订单风向
- 村庄建设线路

### 风险

- 页面很像“任务战略面板”而不是“任务操作面板”；
- 首屏可执行性下降；
- 对回流玩家尤其不友好。

### 结论

这项旧问题**仍然存在**。

---

## 三、当前新发现 / 或需要重新强调的问题

## P1-4：TopGoalsPanel 仍然过重，而且展示组件仍在 mount 时触发状态初始化与奖励评估

### 证据

- [TopGoalsPanel.vue:180-241](taoyuan-main/src/components/game/TopGoalsPanel.vue#L180-L241)
- [GameLayout.vue:17-25](taoyuan-main/src/views/GameLayout.vue#L17-L25)

### 当前状态判断

**比上一版更值得强调。**

### 说明

`TopGoalsPanel` 不只是大，还在 `onMounted()` 时调用：

- `goalStore.ensureInitialized()`
- `goalStore.evaluateProgressAndRewards()`

这意味着它不只是展示组件，而是承担了状态初始化与玩法评估副作用。

### 风险

- 视图层和玩法推进时机耦合；
- 性能边界和职责边界都变差；
- 未来一旦布局或挂载方式变化，可能触发意外评估。

### 结论

这应视为**当前新重点问题**，比旧版“只是内容太多”更深一层。

---

## P1-5：晚期系统里“周信号联动”仍强于“周结算兑现”，周循环闭环仍不均衡

### 当前总判断

这一项是本轮全链路复审里最重要的系统性结论之一：

> 玩家现在通常能知道“这周该做什么”，但很多系统仍然不能稳定回答“这周做完以后，下周我具体得到了什么、失去了什么、为什么还要继续”。

### 关键分项

#### A. 鱼塘周赛：结算后没有明显回灌到下一周决策层
- **证据**：
  - [useFishPondStore.ts:545-592](taoyuan-main/src/stores/useFishPondStore.ts#L545-L592)
  - [useEndDay.ts:906-919](taoyuan-main/src/composables/useEndDay.ts#L906-L919)
- **问题**：
  - 周赛结算后主要给 money / tickets；
  - 然后仅刷新下一周赛事；
  - 看不到上周成绩对下周市场、任务池、养护成本或推荐偏置的强回灌。
- **影响**：
  - 周赛更像一次性领奖点，而不是持续周循环核心。

#### B. 公会赛季：周快照更像累计记录，不是真正周增量复盘
- **证据**：
  - [useGuildStore.ts:658-668](taoyuan-main/src/stores/useGuildStore.ts#L658-L668)
- **问题**：
  - `contributionGained`、`goalClaims`、`bossClears` 当前记录更像累计态；
  - 周快照难以准确表达“这一周到底做得怎样”。
- **影响**：
  - 公会赛季周与周之间缺少清晰可比较的经营反馈。

#### C. 周预算：实际反馈面仍然过窄，主要绑定 goal 奖励链
- **证据**：
  - [useGoalStore.ts:462-481](taoyuan-main/src/stores/useGoalStore.ts#L462-L481)
  - [useGoalStore.ts:550-578](taoyuan-main/src/stores/useGoalStore.ts#L550-L578)
  - [useGoalStore.ts:999-1018](taoyuan-main/src/stores/useGoalStore.ts#L999-L1018)
- **问题**：
  - 周预算 active effect 主要在 `grantReward()` 中结算；
  - 鱼塘周赛、公会赛季、博物馆馆务、瀚海循环、市场出货本身并不直接承接这套周预算选择。
- **影响**：
  - 周预算名义上是全局周决策层，但实际仍偏目标系统专用增益器。

#### D. 博物馆：周边界主要是概览日志，独立馆务周结算仍不足
- **证据**：
  - [useMuseumStore.ts:847-915](taoyuan-main/src/stores/useMuseumStore.ts#L847-L915)
  - [useMuseumStore.ts:960-1038](taoyuan-main/src/stores/useMuseumStore.ts#L960-L1038)
- **问题**：
  - 每天有评分/客流/学者委托推进；
  - 但周切换时主要仍是输出概览日志；
  - 真正奖励更多依赖手动领取学者委托。
- **影响**：
  - 更像长期成长副系统，而不是强周循环经营系统。

#### E. 瀚海：即时奖励很多，但周边界更多是重置，不是结构性兑现
- **证据**：
  - [useHanhaiStore.ts:799-918](taoyuan-main/src/stores/useHanhaiStore.ts#L799-L918)
  - [useHanhaiStore.ts:1328-1353](taoyuan-main/src/stores/useHanhaiStore.ts#L1328-L1353)
  - [useHanhaiStore.ts:618-655](taoyuan-main/src/stores/useHanhaiStore.ts#L618-L655)
- **问题**：
  - 遗迹、驻点、赌场、藏宝图主要给即时 cash / items / tickets；
  - 周切换时主要表现为重置次数、刷新首领、推进 tripsCompleted；
  - 周投入结构没有被足够强地转换为下周压力 / 门槛 / 资格。
- **影响**：
  - 内容很多，但周与周之间的取舍压力仍偏弱。

### 结论

这不是“某一个系统没做完”，而是当前晚期系统的共同特征：

- **信号层很强**；
- **兑现层不均衡**；
- **周目标系统是当前少数真正完整的闭环骨架**。

---

## P1-7：日结晨间资源发放仍有多处不检查背包写入结果，满包时可能出现静默掉落与假日志

### 证据

- [useEndDay.ts:1018-1023](taoyuan-main/src/composables/useEndDay.ts#L1018-L1023)
- [useEndDay.ts:1060-1064](taoyuan-main/src/composables/useEndDay.ts#L1060-L1064)
- [useInventoryStore.ts:223-262](taoyuan-main/src/stores/useInventoryStore.ts#L223-L262)

### 当前状态判断

**仍成立。**

### 说明

`useEndDay.ts` 里动物产物、配偶做饭等晨间奖励仍直接调用 `inventoryStore.addItem(...)`。而 `addItem()` 本身是返回 `boolean` 的：

- 满包且临时背包也装不下时，会返回 `false`；
- 但这些调用点没有检查返回值；
- 日志却仍然会提示“动物们产出了…”“配偶做了一份食物…”。

### 风险

- 玩家看到产出日志，但实际背包里没有东西；
- 奖励 silently drop，问题不容易定位；
- 在中后期高产出、满包更常见时，这类问题会被放大。

### 结论

这项应加入当前高优先级问题列表，至少是 P1。

---

## P1-8：周结算邮件发送仍是 fire-and-forget，成功与失败没有进入同一轮状态机闭环

### 证据

- [useEndDay.ts:920-965](taoyuan-main/src/composables/useEndDay.ts#L920-L965)

### 当前状态判断

**新增中高优问题。**

### 说明

`dispatchWeeklySettlementMail()` 当前是：

- 在日结里异步触发；
- 用 `void dispatchWeeklySettlementMail()` fire-and-forget；
- 成功时才 `markWeeklySettlementMailSent()`；
- 失败则只打日志。

这比“误标记已发送”好，但它仍然意味着：

- 周结算主链不等待邮件结果；
- 失败不会在同一轮状态机里被补偿或重试；
- 邮件是否发出与周结算是否完成，仍是松耦合关系。

### 风险

- 玩家可能完成了一轮正式周结算，但邮件层漏发；
- 之后只能靠日志排查，而不是靠正式状态机修复；
- QA 很难把“周结算成功”和“周结算邮件已可靠发出”视作同一个闭环。

### 结论

这不是 P0，但应在当前版报告里补记为新的链路脆弱点。

---

## P1-6：StatusBar 仍在 HUD 挂载时请求远程配置，最常驻 UI 层和网络配置仍有耦合

### 证据

- [StatusBar.vue:103-113](taoyuan-main/src/components/game/StatusBar.vue#L103-L113)
- [StatusBar.vue:157-160](taoyuan-main/src/components/game/StatusBar.vue#L157-L160)

### 当前状态判断

**仍成立。**

### 说明

状态栏仍在 `onMounted()` 里发起 `/api/public-config` 请求读取返回地址。

### 风险

- 常驻 HUD 与远程配置耦合；
- 重挂载时可能重复请求；
- 配置获取位置不够稳定。

### 结论

这项不是灾难性 bug，但作为壳层问题，仍应保留。

---

## P2-1：钱包页开始出现“二次解释层堆叠”，已成为新的信息层级风险点

### 证据

- [WalletView.vue:12-103](taoyuan-main/src/views/game/WalletView.vue#L12-L103)
- [WalletView.vue:105-213](taoyuan-main/src/views/game/WalletView.vue#L105-L213)
- [WalletView.vue:215-280](taoyuan-main/src/views/game/WalletView.vue#L215-L280)

### 说明

钱包页现在连续堆叠了：

- 经济观测
- 引导
- QA 治理（DEV）
- 豪华消费路线
- 周预算
- 资源券 / 凭证
- 额度兑换

### 影响

- 这不是旧报告的主焦点，但在当前版本里，已经发展成新的页面层级风险；
- 它把“策略解释”“资源管理”“兑换操作”堆在了同一长页面里。

---

## P2-3：邮箱页虽然主从结构已改善，但详情区仍缺少显式 loading 反馈

### 证据

- [MailView.vue:240-250](taoyuan-main/src/views/game/MailView.vue#L240-L250)
- [MailView.vue:220-228](taoyuan-main/src/views/game/MailView.vue#L220-L228)

### 说明

当前邮件页在快速点击列表项时：

- 会异步拉详情；
- 有 `selectRequestId` 防止串写；
- 但详情区请求期间没有骨架或 loading 态。

### 影响

- 交互正确性没问题，但用户感知上仍像“点了没反应”或“切换不够稳”；
- 在邮件量增大或网络较慢时，这会比过去更明显。

---

## P2-4：钱包页开始出现“二次解释层堆叠”，已成为新的信息层级风险点

### 证据

- [WalletView.vue:12-103](taoyuan-main/src/views/game/WalletView.vue#L12-L103)
- [WalletView.vue:105-213](taoyuan-main/src/views/game/WalletView.vue#L105-L213)
- [WalletView.vue:215-280](taoyuan-main/src/views/game/WalletView.vue#L215-L280)

### 说明

钱包页现在连续堆叠了：

- 经济观测
- 引导
- QA 治理（DEV）
- 豪华消费路线
- 周预算
- 资源券 / 凭证
- 额度兑换

### 影响

- 这不是旧报告的主焦点，但在当前版本里，已经发展成新的页面层级风险；
- 它把“策略解释”“资源管理”“兑换操作”堆在了同一长页面里。

---

## P2-5：背包页在高容量和高收藏阶段仍有扩展性风险

### 证据

- [InventoryView.vue:121-309](taoyuan-main/src/views/game/InventoryView.vue#L121-L309)
- [InventoryView.vue:313-339](taoyuan-main/src/views/game/InventoryView.vue#L313-L339)

### 说明

装备列表、方案管理、多个独立滚动区仍直接堆在单页组件中；后期 120 格容量和更多装备收藏下，会继续变重。

### 影响

- 扫描成本上升；
- 维护成本高；
- 页面体量还会继续膨胀。

---

## P2-6：主菜单虽然更清楚了，但“未登录警告”和“开始新旅程”仍然存在视觉分离

### 证据

- [MainMenu.vue:42-45](taoyuan-main/src/views/MainMenu.vue#L42-L45)
- [MainMenu.vue:88-109](taoyuan-main/src/views/MainMenu.vue#L88-L109)

### 说明

当前未登录时，会明确提示“未登录直接开始旅程时，存档无法保存”；但这个提醒位于上方账号卡片，而“新的旅程”按钮在下方另一块入口区。

### 影响

- 逻辑解释已经比旧版好很多；
- 但视觉约束仍不够强，首次用户仍可能先点开始，再回头理解账号/存档限制。

---

## 四、当前值得肯定的改进

## 1. 活动邮件链路已经从“半接入”升级到了“真正接线”

### 证据

- [useEndDay.ts:984-992](taoyuan-main/src/composables/useEndDay.ts#L984-L992)
- [useGoalStore.ts:1690-1717](taoyuan-main/src/stores/useGoalStore.ts#L1690-L1717)
- [MailView.vue:160-173](taoyuan-main/src/views/game/MailView.vue#L160-L173)

### 评价

这是当前最明显的结构性进步之一，说明用户前一轮修复是有效的。

---

## 2. 主菜单 / 登录 / 存档管理已经形成更稳定的“进入游戏前心智模型”

### 证据

- [MainMenu.vue:19-76](taoyuan-main/src/views/MainMenu.vue#L19-L76)
- [AuthView.vue:11-98](taoyuan-main/src/views/AuthView.vue#L11-L98)
- [SaveManager.vue:7-40](taoyuan-main/src/components/game/SaveManager.vue#L7-L40)

### 评价

用户现在更容易理解：

- 我是谁（账号）
- 我存到哪（本地 / 服务端）
- 我要怎么继续 / 保存 / 导入

这是全链路体验上很重要的一步提升。

---

## 3. 邮件页已经成为当前最完整的操作-反馈型页面之一

### 证据

- [MailView.vue:1-128](taoyuan-main/src/views/game/MailView.vue#L1-L128)
- [MailView.vue:133-307](taoyuan-main/src/views/game/MailView.vue#L133-L307)

### 评价

它已经具备：

- 列表态
- 详情态
- 奖励态
- 已领取结果
- 活动状态同步

这说明项目不是没有 UI 收敛能力，而是这种收敛还没有推广到更多重页面。

---

## 4. 服务合同仍然是当前少数真正具有“跨周承接器”气质的晚期系统

### 证据

- [useShopStore.ts:385-431](taoyuan-main/src/stores/useShopStore.ts#L385-L431)
- [useShopStore.ts:494-583](taoyuan-main/src/stores/useShopStore.ts#L494-L583)

### 评价

服务合同具备：

- 跨日 / 跨周自动续费
- 持续影响 goal / museum / fishpond 等系统收益
- 让“本周消费”变成“未来多周收益”

这是后续做晚期系统周闭环强化时，最值得继续扩展的模板。

---

## 5. 周目标系统仍然是当前最完整的周循环主骨架

### 证据

- [useGoalStore.ts:454-578](taoyuan-main/src/stores/useGoalStore.ts#L454-L578)
- [useGoalStore.ts:660-730](taoyuan-main/src/stores/useGoalStore.ts#L660-L730)
- [useGoalStore.ts:1092-1245](taoyuan-main/src/stores/useGoalStore.ts#L1092-L1245)

### 评价

它仍然具备：

- 周初预算投入
- 周内目标达成
- 周末奖励与补偿
- 周度快照归档
- 下周建议

这一套依然是全项目晚期周循环里最成熟的骨架。

---

## 五、最终结论（当前代码状态）

如果只看“当前状态”，这个项目已经明显比上一轮更稳，尤其是：

- 活动邮件主链更完整了；
- 账号 / 存档 / 邮件这类用户高频入口更清楚了；
- DEV 治理面板对正式环境的污染下降了。

但从全链路角度，仍有四个核心问题没跨过去：

1. **存档导入仍不安全**；
2. **邮箱奖励与本地/服务端存档边界仍然不一致**；
3. **主壳与核心页面的信息层级仍偏重解释、偏轻操作**；
4. **晚期系统的周信号强于周兑现，很多系统还没形成真正有留存张力的周闭环**。

所以现在最准确的判断不是“还有很多系统没做”，而是：

> **系统大多已经做出来了，但还没全部进入“边界稳定、闭环清晰、玩家与 QA 都容易理解”的完成态。**

---

## 最建议优先继续处理的 5 件事

1. **重做 `importSave()` 的验证方式**，改成离线校验而不是污染运行态。  
2. **修正邮箱奖励在本地模式下的提示与真实落点不一致问题**。  
3. **继续压缩 GameLayout / Shop / Quest / Wallet 的首屏解释层密度**。  
4. **优先为鱼塘、公会、博物馆、瀚海补“周兑现层”**，不要只继续增强周信号。  
5. **以服务合同与周目标系统为模板，给晚期系统补真正的跨周承接设计。**
