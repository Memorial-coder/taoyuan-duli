# 最近两天 changelog 功能审查结果

审查范围：`taoyuan-main/CHANGELOG.md` 顶部最近两天（2026-04-10 / 2026-04-11）对应功能，重点看 CORE-001~009、TYX-ECON-010、WS01/02/06/07/08。

## 发现的问题

### 1. WS01 日经济快照的日期晚了一天，导致跨周周快照漏算周末最后一天
- 位置：`taoyuan-main/src/composables/useEndDay.ts:847-849`、`taoyuan-main/src/composables/useEndDay.ts:1162-1186`
- 位置：`taoyuan-main/src/stores/useGoalStore.ts:1020-1024`、`taoyuan-main/src/stores/useGoalStore.ts:1066-1078`
- 问题：`handleEndDay()` 先 `nextDay()`，再用**新一天**生成 `economyDayTag` 并写入 `appendEconomySnapshot()`；但这条快照统计的其实是**刚结束的旧一天**的收入/支出。
- 结果：
  1. 每条日经济快照的 `dayTag` 都会整体 +1 天；
  2. 跨周时，`archiveWeeklyMetricSnapshot(previousWeekInfo, economyDayTag)` 会把刚写入的那条快照用 `snapshot.dayTag !== generatedAtDayTag` 过滤掉；
  3. 周快照会漏掉上一周最后一天的数据，导致 `totalIncome` / `totalExpense` / `netIncome` / `sinkSpend` 偏小。
- 影响：与 changelog 中“每次跨天写入经济日快照”“周切换自动生成风险报告/周快照”的描述不一致，WS01 指标和 CORE-005 周归档都会失真。

### 2. 高价值订单类型在写入日快照之后才补充，循环多样度统计少算
- 位置：`taoyuan-main/src/composables/useEndDay.ts:1174-1186`
- 位置：`taoyuan-main/src/composables/useEndDay.ts:1206-1215`
- 问题：`appendEconomySnapshot()` 写入 `highValueOrderTypes: highValueOrderTypes.size` 时，集合里还没有加入：
  - 当前主题周的 `preferredQuestThemeTag`
  - 当前特殊订单 `questStore.specialOrder.themeTag`
  - 进行中的特殊订单/主题订单
- 结果：日快照中的 `highValueOrderTypes` 经常偏小甚至为 0，`usePlayerStore.ts:317-326` 的 `getLoopDiversityScore()` 会基于错误数据计算循环多样度。
- 影响：与 changelog 中“主题周偏好、特殊订单与进行中的高价值订单会参与循环多样度统计”的描述不一致。

### 3. 直接卖店收入没有按商店系统记账，经济观测口径与出货箱不一致
- 位置：`taoyuan-main/src/stores/useShopStore.ts:648-653`
- 位置：`taoyuan-main/src/composables/useEndDay.ts:825-830`
- 位置：`taoyuan-main/src/stores/usePlayerStore.ts:388-390`
- 问题：
  - 出货箱结算收入使用 `playerStore.earnMoney(shippingIncome, { system: 'shop' })`；
  - 但直接卖店 `sellItem()` 调用的是 `playerStore.earnMoney(totalPrice)`，会落到默认的 `system` 桶。
- 结果：最近新增的 WS01 收入分系统统计里，直接卖店收入不会进入 `shop` 口径，`dominantIncomeShare`、分系统收入占比、风险报告都可能失真。
- 影响：虽然 TYX-ECON-010 已把直接卖店接入 `shippingHistory`，但经济观测链路仍与出货箱口径不一致。

### 4. 出货箱收入虽然记到 `shop`，但日快照参与系统却硬编码成了 `market`
- 位置：`taoyuan-main/src/composables/useEndDay.ts:833-837`
- 位置：`taoyuan-main/src/composables/useEndDay.ts:1164-1172`
- 位置：`taoyuan-main/src/stores/usePlayerStore.ts:317-326`
- 问题：出货箱结算时使用的是 `playerStore.earnMoney(shippingIncome, { system: 'shop' })`，但构造 `participatingSystems` 时却额外写入了 `shippingIncome > 0 ? 'market' : ''`。
- 结果：日快照里会把出货箱收入同时表现为 `shop` 收入口径、`market` 参与系统，`getLoopDiversityScore()` 会因此把并不存在的系统参与也算进去。
- 影响：与 changelog 中“出货箱收入按 `shop` 系统记账”的描述不一致，WS01 的循环多样度和系统参与统计会失真。

### 5. 商店目录购买失败的“自动退款”没有回滚经济遥测，反而制造一笔假支出和假收入
- 位置：`taoyuan-main/src/stores/useShopStore.ts:361-367`
- 位置：`taoyuan-main/src/stores/useShopStore.ts:421-427`
- 位置：`taoyuan-main/src/stores/usePlayerStore.ts:266-271`、`taoyuan-main/src/stores/usePlayerStore.ts:388-390`
- 问题：目录购买先调用 `playerStore.spendMoney(totalCost, 'shop')` 记一笔支出；若后续发货失败，再用 `playerStore.earnMoney(totalCost, { countAsEarned: false, system: 'shop' })` 返还金钱。
- 结果：玩家余额会恢复，但经济遥测不会回滚，而是留下同额的 `shop` 支出和 `shop` 收入；这会污染 WS01 的收入/支出、净流入、主收入占比和风险报告。
- 影响：与 changelog 中“失败时回滚并自动退款，避免经济遥测与玩家资产不一致”的描述相反，当前实现会把一次失败购买记录成真实经济行为。

### 6. 村庄建设默认状态会泄漏阶段信息，未完成项目看起来像已处于某个阶段
- 位置：`taoyuan-main/src/stores/useVillageProjectStore.ts:106-113`
- 位置：`taoyuan-main/src/stores/useVillageProjectStore.ts:141-148`
- 位置：`taoyuan-main/src/stores/useVillageProjectStore.ts:402-427`
- 问题：`getProjectDefaultState()` 在 `completed=false` 的默认状态下，仍把 `completedStageIndex` 和 `stageGroupId` 设为项目自身的阶段配置；旧档/新档未建成项目也会带着阶段完成字段进入规范化结果。
- 结果：读取项目摘要时，未完成项目可能表现为“已经处于第 1/2 阶段”，污染阶段统计、分组视图和后续判断逻辑。
- 影响：WS02 的阶段化建设底座会把未建设项目误表示为已推进阶段，和 changelog 中“统一输出阶段 / tier / 联动概览”的可信度不符。

### 7. 村庄建设捐赠 API 只记账不扣物品，玩家可以无成本完成捐赠
- 位置：`taoyuan-main/src/stores/useVillageProjectStore.ts:764-799`
- 问题：`donateToProject()` 只校验捐赠计划是否存在、项目是否解锁、物品是否在接受列表中，然后直接累加 `totalAmount` / `donatedItems`；没有检查背包/仓库库存，也没有移除对应物品。
- 结果：只要传入合法 `itemId` 和数量，就能凭空完成捐赠进度，导致捐赠系统与真实资产完全脱钩。
- 影响：这是明确的数据完整性问题，会直接破坏 WS02 的建设捐赠、里程碑和后续平衡。

### 8. 博物馆馆区/槽位成长默认就会自锁，且当前 store 没有解锁写路径
- 位置：`taoyuan-main/src/data/museum.ts:158-166`
- 位置：`taoyuan-main/src/data/museum.ts:331-339`
- 位置：`taoyuan-main/src/stores/useMuseumStore.ts:164-183`
- 位置：`taoyuan-main/src/stores/useMuseumStore.ts:261-280`
- 问题：除 `entry_gallery` 外，大多数馆区默认等级都是 0；而槽位解锁、馆区升级、学者委托又要求对应馆区达到 1 级。同时 `useMuseumStore` 目前只有读侧 getter 和序列化入口，没有馆区升级、槽位指派、主题激活等写侧 API。
- 结果：大量馆区/槽位/委托虽然定义了条件，但在现有实现中没有可达成路径，默认会卡死在“可读但不可推进”的状态。
- 影响：WS06 T053 的“Store 状态与 API 扩展”已部分落地，但核心经营推进链路并未真正可用，现状更接近只完成了读模型与存档形状。

### 9. 任务页会把鱼塘主题特殊订单错误标成“育种订单”
- 位置：`taoyuan-main/src/data/quests.ts:486-537`
- 位置：`taoyuan-main/src/views/game/QuestView.vue:117-123`
- 位置：`taoyuan-main/src/views/game/QuestView.vue:150-156`
- 位置：`taoyuan-main/src/views/game/QuestView.vue:301-303`
- 位置：`taoyuan-main/src/views/game/QuestView.vue:349-356`
- 问题：数据里已经存在 `themeTag: 'fishpond'` 的特殊订单，但任务页未接取卡片只要有 `themeTag` 就一律显示“育种订单”；进入进行中列表和详情后，又只在 `themeTag === 'breeding'` 时才显示该标签。
- 结果：鱼塘主题特殊订单会在未接取时被错误标成育种订单，接取后又失去对应主题标签，前后语义不一致。
- 影响：这与 changelog 中“订单展示语义收口”的目标相反，会直接误导玩家对订单主题的理解。

### 10. “未接取特殊订单卡片补充剩余天数”没有按 changelog 所写落到卡片本体
- 位置：`taoyuan-main/src/views/game/QuestView.vue:111-125`
- 位置：`taoyuan-main/CHANGELOG.md:304-306`
- 问题：changelog 写的是“未接取特殊订单卡片现补充剩余天数显示”，但任务页里真正的“特殊订单”卡片本体仍只显示描述、标签、需求提示和铜钱奖励，没有展示 `daysRemaining`。
- 结果：页面顶部“经营提示”区域虽然会显示一次剩余天数（`taoyuan-main/src/views/game/QuestView.vue:18-23`），但特殊订单卡片本身并没有兑现 changelog 对该卡片的描述。
- 影响：这是明确的 claim/code mismatch，说明该条 changelog 至少没有完整落在所描述的 UI 位置。

### 11. 高价目录购买没有记 sink 消耗，WS01 的 sink 闭环统计会系统性偏低
- 位置：`taoyuan-main/src/stores/useShopStore.ts:361-430`
- 位置：`taoyuan-main/src/stores/usePlayerStore.ts:274-278`
- 位置：`taoyuan-main/src/stores/useVillageProjectStore.ts:855`
- 问题：WS01 的观测体系依赖 `recordSinkSpend()` 统计高价消耗，但高价目录购买路径只调用了 `playerStore.spendMoney(totalCost, 'shop')`，没有任何 sink 记账；全局仅能看到村庄维护等少数路径会调用 `recordSinkSpend()`。
- 结果：玩家已经发生的高价目录消费不会进入 `sinkSpend`，`sinkSatisfaction`、推荐资金去向、风险观测都会系统性低估真实消耗。
- 影响：这和 changelog 中“观测 → 推荐 → 消费”的闭环描述不一致，WS01/Shop/Wallet 的核心指标链条并未真正闭合。

### 12. “豪华经营周”主题周配置已写入数据，但运行时永远选不到
- 位置：`taoyuan-main/src/data/goals.ts:501-523`
- 位置：`taoyuan-main/src/data/goals.ts:526-527`
- 位置：`taoyuan-main/src/stores/useGoalStore.ts:1206-1221`
- 问题：`late_sink_rotation`（豪华经营周）虽然已经定义为秋季主题周，但 `getThemeWeekBySeason()` 只是 `find(theme => theme.season === season)`，只会返回该季节第一条定义。
- 结果：如果秋季前面已有别的主题周定义，`late_sink_rotation` 会被永久遮蔽，changelog 中宣称新增的“豪华经营周”实际上不会出现在运行时。
- 影响：这是直接的 claim/code mismatch，会连带影响主题周提示、目标推荐、商店推荐和高价 sink 引导链路。

### 13. CHANGELOG 里 WS01 T010 整段重复记录了一次
- 位置：`taoyuan-main/CHANGELOG.md:149-167`
- 问题：`WS01 经济观测与通胀治理底座（T010）` 整段内容在 changelog 中重复出现，标题和条目内容完全重复。
- 结果：审阅记录时会误以为存在两次不同交付，或者误判最近进度量。
- 影响：虽然不是运行时 bug，但这是 changelog 本身的重复/误导信息，和本次“核对 changelog 是否准确”任务直接相关。

## 备注
- 已执行：`npm run type-check`，类型检查通过。
- 本次结论以代码静态审查为主，以上 13 个问题均为高置信逻辑问题。
