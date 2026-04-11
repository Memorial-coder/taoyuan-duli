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

## 备注
- 已执行：`npm run type-check`，类型检查通过。
- 本次结论以代码静态审查为主，以上 5 个问题均为高置信逻辑问题。
